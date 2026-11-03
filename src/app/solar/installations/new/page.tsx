
"use client";

import { use, useState, useMemo, useEffect, Suspense } from "react";
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  CheckCircle2, 
  Info,
  ShieldCheck,
  Briefcase,
  Calendar,
  Users,
  Target,
  FileSpreadsheet,
  Settings2,
  ChevronRight,
  Zap,
  Globe
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFirestore, useUser, useDoc, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc, serverTimestamp, query, where, getDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function NewInstallationContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quoteId');

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const quoteRef = useMemoFirebase(() => 
    businessId && quoteId ? doc(firestore, 'businesses', businessId, 'quotations', quoteId) : null
  , [firestore, businessId, quoteId]);
  const { data: quote, isLoading: isQuoteLoading } = useDoc<any>(quoteRef);

  const designRef = useMemoFirebase(() => 
    businessId && quote?.solarSystemDesignId ? doc(firestore, 'businesses', businessId, 'solarSystemDesigns', quote.solarSystemDesignId) : null
  , [firestore, businessId, quote?.solarSystemDesignId]);
  const { data: design } = useDoc<any>(designRef);

  const teamQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null
  , [firestore, businessId]);
  const { data: teamMembers = [] } = useCollection<any>(teamQuery);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    scheduledStartDate: new Date().toISOString().split('T')[0],
    scheduledEndDate: "",
    supervisorId: "",
    teamIds: [] as string[],
    siteNotes: ""
  });

  const isEligible = useMemo(() => {
    return quote?.status === 'converted';
  }, [quote]);

  const handleLaunch = async () => {
    if (!businessId || !quote || isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      const installationsRef = collection(firestore, 'businesses', businessId, 'solarInstallations');
      const projectsRef = collection(firestore, 'businesses', businessId, 'projects');
      const installNum = `INST-${Math.floor(100000 + Math.random() * 900000)}`;

      // 1. Create Baseline Project Node for Task Tracking
      const projectDocRef = await addDocumentNonBlocking(projectsRef, {
        title: `Installation: ${quote.customerName}`,
        description: `Field execution for ${design?.capacityKw}kW ${design?.systemType} system.`,
        status: 'in-progress',
        deadline: formData.scheduledEndDate || formData.scheduledStartDate,
        clientId: quote.customerId,
        clientName: quote.customerName,
        clientType: 'customer',
        team: [formData.supervisorId, ...formData.teamIds].filter(Boolean),
        businessId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Map BOM to Allocation Node
      const materials = (design?.components || []).map((c: any) => ({
        ...c,
        required: c.quantity,
        allocated: 0,
        issued: 0,
        consumed: 0,
        returned: 0
      }));

      // 3. Create Solar Installation Node
      const installDocRef = await addDocumentNonBlocking(installationsRef, {
        ...formData,
        installationNumber: installNum,
        projectId: projectDocRef?.id || null,
        solarQuotationId: quoteId,
        solarSystemDesignId: quote.solarSystemDesignId,
        solarInquiryId: quote.solarInquiryId,
        solarSurveyId: quote.solarSurveyId,
        customerId: quote.customerId,
        customerName: quote.customerName,
        capacityKw: design?.capacityKw || 0,
        systemType: design?.systemType || 'On-grid',
        materials,
        status: 'READY_TO_SCHEDULE',
        progress: 0,
        businessId,
        assignedTeamNames: teamMembers.filter(m => formData.teamIds.includes(m.id)).map(m => m.name),
        supervisorName: teamMembers.find(m => m.id === formData.supervisorId)?.name || 'Unassigned',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 4. Initialize Core Roadmap Tasks
      if (projectDocRef) {
         const tasksRef = collection(firestore, 'businesses', businessId, 'tasks');
         const coreTasks = [
            { title: "Structure Fixing & Alignment", section: "Execution", priority: "high" },
            { title: "Panel Mounting & Inter-connection", section: "Execution", priority: "high" },
            { title: "Inverter & Protection System Mounting", section: "Execution", priority: "medium" },
            { title: "AC/DC Cabling & Earthing Node", section: "Execution", priority: "medium" },
         ];

         for (const t of coreTasks) {
            await addDocumentNonBlocking(tasksRef, {
                ...t,
                status: 'pending',
                projectId: projectDocRef.id,
                projectName: `Installation: ${quote.customerName}`,
                assignedTo: formData.supervisorId || "",
                assignedName: teamMembers.find(m => m.id === formData.supervisorId)?.name || "Unassigned",
                businessId,
                createdAt: serverTimestamp()
            });
         }
      }

      toast({ title: "Execution Hub Ready", description: `Installation ${installNum} initialized.` });
      router.push(`/solar/installations/${installDocRef?.id}`);
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Deployment Error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isProfileLoading || isQuoteLoading) return <div className="min-h-screen flex items-center justify-center opacity-40"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  if (!isEligible) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="h-16 w-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100 shadow-inner">
          <Lock className="h-8 w-8" />
        </div>
        <div className="space-y-2">
           <h2 className="text-2xl font-black text-slate-900 uppercase">Workflow Blocked</h2>
           <p className="text-muted-foreground text-sm max-w-sm mx-auto font-medium">Installation can only be initialized from an <strong>ACCEPTED</strong> quotation node.</p>
        </div>
        <Button asChild variant="outline" className="rounded-xl"><Link href="/solar/quotations">Back to Hub</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 text-left px-2 sm:px-4">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0"><Link href={`/solar/quotations/${quoteId}`}><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div className="text-left">
           <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Initiate Execution</h1>
           <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1.5 opacity-60">Deploying Site Node for {quote.customerName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
           <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border">
              <CardHeader className="bg-primary/5 border-b py-8 px-10">
                 <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg"><Briefcase className="h-6 w-6" /></div>
                    <div><CardTitle className="text-lg font-black uppercase text-primary leading-none">Field Ops Configuration</CardTitle><p className="text-[9px] font-bold text-primary/60 uppercase tracking-widest mt-1.5">Scheduling & Team Allocation</p></div>
                 </div>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Planned Start Node</Label>
                       <Input type="date" value={formData.scheduledStartDate} onChange={(e) => setFormData({...formData, scheduledStartDate: e.target.value})} className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Est. Completion Target</Label>
                       <Input type="date" value={formData.scheduledEndDate} onChange={(e) => setFormData({...formData, scheduledEndDate: e.target.value})} className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner" />
                    </div>
                 </div>

                 <Separator />

                 <div className="space-y-6 text-left">
                    <div className="flex items-center gap-3 px-1">
                       <Users className="h-4 w-4 text-primary" />
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Team Assignment Hub</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Site Supervisor / PM</Label>
                          <Select value={formData.supervisorId} onValueChange={(v) => setFormData({...formData, supervisorId: v})}>
                             <SelectTrigger className="h-12 rounded-xl bg-white border-muted font-bold text-xs uppercase"><SelectValue placeholder="Pick Manager" /></SelectTrigger>
                             <SelectContent className="rounded-xl">
                                {teamMembers.map((m: any) => <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>)}
                             </SelectContent>
                          </Select>
                       </div>
                    </div>
                    <div className="space-y-3">
                       <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Selected Field Technicians</Label>
                       <div className="flex flex-wrap gap-2">
                          {teamMembers.filter(m => (m.role || '').toLowerCase().includes('staff') || (m.role || '').toLowerCase().includes('agent')).map(m => (
                             <Badge key={m.id} onClick={() => setFormData(prev => ({...prev, teamIds: prev.teamIds.includes(m.id) ? prev.teamIds.filter(id => id !== m.id) : [...prev.teamIds, m.id]}))} className={cn("h-10 px-4 rounded-xl cursor-pointer transition-all border-2 text-[9px] font-bold uppercase", formData.teamIds.includes(m.id) ? "bg-primary text-white border-primary" : "bg-white border-border/50 text-slate-500 hover:border-primary/20")}>
                                {m.name}
                             </Badge>
                          ))}
                       </div>
                    </div>
                 </div>

                 <Separator />

                 <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Site Instructions (Field Logic)</Label>
                    <Textarea value={formData.siteNotes} onChange={(e) => setFormData({...formData, siteNotes: e.target.value})} placeholder="Structural warnings, height constraints or access notes..." className="min-h-[120px] rounded-[2rem] bg-muted/20 border-none shadow-inner p-6 text-sm font-medium" />
                 </div>
              </CardContent>
              <CardFooter className="p-8 bg-muted/10 border-t"><Button onClick={handleLaunch} disabled={isSubmitting || !formData.supervisorId} className="w-full h-16 bg-primary font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl">Deploy Site Node</Button></CardFooter>
           </Card>
        </div>

        <div className="lg:col-span-4 space-y-8 sticky top-24 text-left">
           <Card className="border-none shadow-2xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden p-8 space-y-8 border border-white/5">
              <div className="flex items-center gap-4">
                 <div className="h-14 w-14 rounded-[1.5rem] bg-white/10 flex items-center justify-center border border-white/20 shadow-inner shrink-0"><Zap className="h-7 w-7 text-accent" /></div>
                 <div className="text-left"><h3 className="text-xl font-bold uppercase tracking-tight">Logic Node</h3><p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Automatic Resource Sync</p></div>
              </div>
              <div className="space-y-6">
                 <div className="p-5 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between shadow-inner group">
                    <div className="text-left">
                       <p className="text-[9px] font-black uppercase text-slate-400">Total BOM Items</p>
                       <p className="text-2xl font-black text-accent">{design?.components?.length || 0}</p>
                    </div>
                    <Plus className="h-6 w-6 text-white/20 group-hover:rotate-90 transition-transform" />
                 </div>
                 <div className="p-5 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between shadow-inner">
                    <div className="text-left">
                       <p className="text-[9px] font-black uppercase text-slate-400">Project Value</p>
                       <p className="text-xl font-black text-white">₹{quote.totals?.finalPayout?.toLocaleString()}</p>
                    </div>
                    <Badge variant="outline" className="bg-white/10 border-none text-[8px] font-black text-accent h-5 uppercase">Commercial Locked</Badge>
                 </div>
              </div>
              <Separator className="bg-white/10" />
              <div className="space-y-4 text-left">
                 <div className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-green-400" /><span className="text-[9px] font-black uppercase text-slate-300">Tenant Scoped Isolation</span></div>
                 <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-green-400" /><span className="text-[9px] font-black uppercase text-slate-300">Project & Tasks Linked</span></div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}

export default function NewSolarInstallationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary opacity-20" /></div>}>
      <NewInstallationContent />
    </Suspense>
  );
}
