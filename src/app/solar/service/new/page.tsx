"use client";

import { useState, useMemo, Suspense } from "react";
import { 
  Wrench, 
  ArrowLeft, 
  Save, 
  Loader2, 
  Search, 
  User, 
  Zap, 
  SmartphoneNfc, 
  ShieldCheck, 
  ClipboardCheck, 
  ChevronRight, 
  Info,
  Clock,
  Target,
  FileText,
  Gem,
  Plus,
  BadgeCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection, addDocumentNonBlocking } from "@/firebase";
import { collection, doc, serverTimestamp, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { id: 'GENERAL_SERVICE', label: 'General Service' },
  { id: 'SYSTEM_FAULT', label: 'System Fault' },
  { id: 'PANEL_ISSUE', label: 'Panel Issue' },
  { id: 'INVERTER_ISSUE', label: 'Inverter Issue' },
  { id: 'BATTERY_ISSUE', label: 'Battery Issue' },
  { id: 'AMC_SERVICE', label: 'AMC Scheduled Visit' },
  { id: 'WARRANTY_CLAIM', label: 'Warranty Claim' },
];

function NewSolarServiceContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const installationsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarInstallations'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: installations = [] } = useCollection<any>(installationsQuery);

  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    installationId: "",
    category: "GENERAL_SERVICE",
    description: "",
    requestSource: "Portal",
    priority: "medium",
    scheduledAt: ""
  });

  const selectedInstallation = useMemo(() => 
    (installations || []).find((inst: any) => inst.id === formData.installationId)
  , [installations, formData.installationId]);

  const filteredInstallations = useMemo(() => {
    if (!searchTerm) return (installations || []).slice(0, 5);
    return (installations || []).filter((i: any) => 
      i.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.installationNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
  }, [installations, searchTerm]);

  const handleCreate = async () => {
    if (!businessId || !formData.installationId || !selectedInstallation) {
      toast({ variant: "destructive", title: "Missing Data", description: "Please select an active installation node." });
      return;
    }

    setIsSubmitting(true);
    try {
      const serviceRef = collection(firestore, 'businesses', businessId, 'solarServiceRequests');
      
      const docRef = await addDocumentNonBlocking(serviceRef, {
        ...formData,
        businessId,
        customerId: selectedInstallation.customerId,
        customerName: selectedInstallation.customerName,
        customerPhone: selectedInstallation.customerPhone,
        warrantyId: selectedInstallation.activeWarrantyId || null,
        status: 'OPEN',
        assignedTo: "",
        assignedName: "Unassigned",
        materialsUsed: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast({ title: "Ticket Registered", description: "Support node established successfully." });
      router.push(`/solar/service/${docRef?.id}`);
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Error", description: "Failed to dispatch request node." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isProfileLoading) return <div className="min-h-screen flex items-center justify-center opacity-40"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 text-left px-2 sm:px-4">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0"><Link href="/solar/service"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div className="text-left">
           <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Open Service Ticket</h1>
           <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1.5 opacity-60">Technical Support Node Initialization</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
           <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border">
              <CardHeader className="bg-primary/5 border-b py-8 px-10">
                 <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg"><Wrench className="h-6 w-6" /></div>
                    <div className="text-left">
                       <CardTitle className="text-lg font-black uppercase text-primary">Inquiry Linkage</CardTitle>
                       <p className="text-[9px] font-bold text-primary/60 uppercase">Link ticket to active field node</p>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-8 sm:p-10 space-y-8 text-left">
                 <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Search Installation Registry *</Label>
                    <div className="relative">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 opacity-40" />
                       <Input 
                         placeholder="Find Customer or Install Number..." 
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="h-14 pl-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"
                       />
                       {searchTerm && (
                         <div className="absolute top-full left-0 right-0 z-50 bg-white border rounded-[1.5rem] mt-2 shadow-2xl overflow-hidden">
                            {(filteredInstallations || []).map(inst => (
                              <div 
                                key={inst.id} 
                                onClick={() => { setFormData({...formData, installationId: inst.id}); setSearchTerm(""); }}
                                className="p-4 hover:bg-primary/5 cursor-pointer flex justify-between items-center border-b last:border-0 text-left"
                              >
                                 <div className="text-left"><p className="text-sm font-bold text-slate-900 uppercase">{inst.customerName}</p><p className="text-[9px] font-black text-muted-foreground uppercase">{inst.installationNumber}</p></div>
                                 <ChevronRight className="h-4 w-4 text-primary opacity-30" />
                              </div>
                            ))}
                         </div>
                       )}
                    </div>
                 </div>

                 {selectedInstallation && (
                   <div className="p-6 bg-primary/5 rounded-3xl border-2 border-dashed border-primary/20 flex items-center justify-between animate-in zoom-in-95 text-left">
                      <div className="flex items-center gap-4">
                         <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black shadow-xl">{selectedInstallation.customerName?.charAt(0)}</div>
                         <div className="text-left"><p className="text-lg font-black text-slate-900 uppercase">{selectedInstallation.customerName}</p><p className="text-[10px] font-bold text-muted-foreground uppercase">{selectedInstallation.installationNumber}</p></div>
                      </div>
                      <ShieldCheck className="h-6 w-6 text-primary opacity-40" />
                   </div>
                 )}

                 <Separator />

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
                    <div className="space-y-2 text-left">
                       <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Service Category</Label>
                       <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                          <SelectTrigger className="h-12 rounded-xl bg-white border-muted font-bold text-xs uppercase"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">{CATEGORIES.map(cat => <SelectItem key={cat.id} value={cat.id} className="text-xs font-bold uppercase">{cat.label}</SelectItem>)}</SelectContent>
                       </Select>
                    </div>
                    <div className="space-y-2 text-left">
                       <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Priority Node</Label>
                       <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                          <SelectTrigger className="h-12 rounded-xl bg-white border-muted font-bold text-xs uppercase"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl"><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high" className="text-red-600 font-bold">Urgent</SelectItem></SelectContent>
                       </Select>
                    </div>
                 </div>

                 <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Issue Context / Observation *</Label>
                    <Textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Describe the fault node or service requirement..." className="min-h-[140px] rounded-[2rem] bg-muted/20 border-none shadow-inner p-6 text-sm font-medium" />
                 </div>
              </CardContent>
              <CardFooter className="p-10 bg-muted/10 border-t flex justify-end">
                 <Button onClick={handleCreate} disabled={isSubmitting || !formData.installationId} className="w-full sm:w-auto h-16 px-14 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all text-white">
                    {isSubmitting ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <Plus className="mr-3 h-5 w-5" />}
                    Deploy Service Node
                 </Button>
              </CardFooter>
           </Card>
        </div>

        <div className="lg:col-span-4 space-y-8 text-left">
           <Card className="border-none shadow-md bg-slate-900 text-white rounded-[2.5rem] p-8 space-y-6 text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><Zap className="h-40 w-40" /></div>
              <div className="relative z-10 space-y-6">
                 <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20"><Info className="h-6 w-6 text-accent" /></div>
                 <h4 className="text-xl font-bold uppercase tracking-tight leading-none">Service Protocol</h4>
                 <p className="text-xs text-slate-400 leading-relaxed font-medium italic">"Once a ticket is raised, it can be linked to an active warranty node to automate parts claim processing."</p>
                 <Separator className="bg-white/10" />
                 <div className="space-y-4">
                    <div className="flex items-center gap-3"><BadgeCheck className="h-4 w-4 text-green-400" /><span className="text-[9px] font-black uppercase text-slate-300">Identity Isolated Registry</span></div>
                    <div className="flex items-center gap-3"><BadgeCheck className="h-4 w-4 text-green-400" /><span className="text-[9px] font-black uppercase text-slate-300">Hardened Inventory Sync</span></div>
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}

export default function NewSolarServicePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary opacity-20" /></div>}>
      <NewSolarServiceContent />
    </Suspense>
  );
}