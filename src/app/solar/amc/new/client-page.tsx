"use client";

import { useState, useMemo, Suspense } from "react";
import { 
  ShieldAlert, 
  Plus, 
  ArrowLeft, 
  Save, 
  Loader2, 
  Search, 
  ShieldCheck, 
  SmartphoneNfc, 
  FileSpreadsheet, 
  Building2, 
  ChevronRight, 
  Zap, 
  Target, 
  Calendar,
  Gem,
  Info,
  BadgeCheck,
  Smartphone,
  CheckCircle2,
  RefreshCcw
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
import { collection, doc, serverTimestamp, query, orderBy, where, getDocs, limit } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { addYears, parseISO, format } from "date-fns";

const AMC_PLANS = [
  { id: 'silver', label: 'Silver (Cleaning Only)', price: '2500', visits: 2 },
  { id: 'gold', label: 'Gold (Quarterly Visit)', price: '5000', visits: 4 },
  { id: 'platinum', label: 'Platinum (Full Coverage)', price: '9000', visits: 6 },
];

function NewSolarAmcContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const installationsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarInstallations'), where('status', '==', 'HANDED_OVER')) : null
  , [firestore, businessId]);
  const { data: activeInstalls = [] } = useCollection<any>(installationsQuery);

  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    installationId: "",
    planId: "gold",
    startDate: new Date().toISOString().split('T')[0],
    amount: "5000",
    frequency: "QUARTERLY",
    billingReference: "",
    notes: ""
  });

  const selectedInstall = useMemo(() => 
    (activeInstalls || []).find((inst: any) => inst.id === formData.installationId)
  , [activeInstalls, formData.installationId]);

  const filteredInstalls = useMemo(() => {
    if (!searchTerm) return (activeInstalls || []).slice(0, 5);
    return (activeInstalls || []).filter((i: any) => 
      i.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.installationNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
  }, [activeInstalls, searchTerm]);

  const handleCreate = async () => {
    if (!businessId || !formData.installationId || !selectedInstall) {
      toast({ variant: "destructive", title: "Site Missing", description: "Select a handed-over site first." });
      return;
    }

    setIsSubmitting(true);
    try {
      const amcRef = collection(firestore, 'businesses', businessId, 'solarAmcContracts');
      const contractNum = `AMC-${Math.floor(100000 + Math.random() * 900000)}`;
      const startDate = new Date(formData.startDate);
      const endDate = addYears(startDate, 1);

      const docRef = await addDocumentNonBlocking(amcRef, {
        ...formData,
        contractNumber: contractNum,
        businessId,
        customerId: selectedInstall.customerId,
        customerName: selectedInstall.customerName,
        customerPhone: selectedInstall.customerPhone,
        endDate: endDate.toISOString().split('T')[0],
        status: 'ACTIVE',
        planName: AMC_PLANS.find(p => p.id === formData.planId)?.label || 'Custom',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast({ title: "AMC Established", description: `Contract ${contractNum} is now active.` });
      router.push(`/solar/amc`);
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Deployment Failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isProfileLoading) return <div className="min-h-screen flex items-center justify-center opacity-40"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 text-left px-2 sm:px-4">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0"><Link href="/solar/amc"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div className="text-left">
           <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Deploy Maintenance Contract</h1>
           <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1.5 opacity-60">AMC Node Initialization</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
           <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border">
              <CardHeader className="bg-primary/5 border-b py-8 px-10">
                 <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shrink-0"><ShieldCheck className="h-6 w-6" /></div>
                    <div className="text-left">
                       <CardTitle className="text-lg font-black uppercase text-primary leading-none">Contract Registry</CardTitle>
                       <p className="text-[9px] font-bold text-primary/60 uppercase mt-2">Associate with a completed site</p>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-10 space-y-8 text-left">
                 <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Find Handed-over Installation *</Label>
                    <div className="relative">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 opacity-40" />
                       <Input 
                         placeholder="Search client or install number..." 
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="h-14 pl-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"
                       />
                       {searchTerm && (
                         <div className="absolute top-full left-0 right-0 z-50 bg-white border rounded-[1.5rem] mt-2 shadow-2xl overflow-hidden">
                            {(filteredInstalls || []).map(inst => (
                              <div 
                                key={inst.id} 
                                onClick={() => { setFormData({...formData, installationId: inst.id}); setSearchTerm(""); }}
                                className="p-4 hover:bg-primary/5 cursor-pointer flex justify-between items-center border-b last:border-0 text-left"
                              >
                                 <div className="text-left"><p className="text-sm font-bold text-slate-900 uppercase">{inst.customerName}</p><p className="text-[9px] font-black text-muted-foreground uppercase">{inst.installationNumber}</p></div>
                                 <CheckCircle2 className="h-4 w-4 text-green-600 opacity-30" />
                              </div>
                            ))}
                         </div>
                       )}
                    </div>
                 </div>

                 {selectedInstall && (
                   <div className="p-6 bg-green-50 rounded-3xl border-2 border-dashed border-green-200 flex items-center justify-between animate-in zoom-in-95">
                      <div className="flex items-center gap-4 text-left">
                         <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-green-600 shadow-xl">{selectedInstall.customerName?.charAt(0)}</div>
                         <div className="text-left"><p className="text-lg font-black text-slate-900 uppercase">{selectedInstall.customerName}</p><p className="text-[9px] font-bold text-muted-foreground uppercase">Linked Node: {selectedInstall.installationNumber}</p></div>
                      </div>
                      <BadgeCheck className="h-6 w-6 text-green-600" />
                   </div>
                 )}

                 <Separator />

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
                    <div className="space-y-2 text-left">
                       <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Select Service Plan</Label>
                       <Select value={formData.planId} onValueChange={(v) => {
                         const plan = AMC_PLANS.find(p => p.id === v);
                         setFormData({...formData, planId: v, amount: plan?.price || "0"});
                       }}>
                          <SelectTrigger className="h-12 rounded-xl bg-white border-muted font-bold text-xs uppercase"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">{AMC_PLANS.map(p => <SelectItem key={p.id} value={p.id} className="text-[10px] font-bold uppercase">{p.label}</SelectItem>)}</SelectContent>
                       </Select>
                    </div>
                    <div className="space-y-2 text-left">
                       <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Visit Frequency</Label>
                       <Select value={formData.frequency} onValueChange={(v) => setFormData({...formData, frequency: v})}>
                          <SelectTrigger className="h-12 rounded-xl bg-white border-muted font-bold text-xs uppercase"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl"><SelectItem value="QUARTERLY">Quarterly (4/yr)</SelectItem><SelectItem value="HALF_YEARLY">Half-Yearly (2/yr)</SelectItem><SelectItem value="MONTHLY">Monthly (12/yr)</SelectItem></SelectContent>
                       </Select>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
                    <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Contract Value (Annual)</Label><Input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="h-12 rounded-xl font-black text-lg bg-primary/5 text-primary border-none shadow-inner" /></div>
                    <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Start Date</Label><Input type="date" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} className="h-12 rounded-xl bg-muted/10 border-none font-bold" /></div>
                 </div>

                 <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Internal Scope Node</Label>
                    <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Coverage details, exclusions or special client requests..." className="min-h-[120px] rounded-[2rem] bg-muted/10 border-none shadow-inner p-6 text-sm font-medium" />
                 </div>
              </CardContent>
           </Card>
        </div>

        <div className="lg:col-span-4 space-y-8 sticky top-24 text-left">
           <Card className="border-none shadow-2xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden p-8 space-y-8 border border-white/5 text-left">
              <div className="flex items-center gap-4 text-left">
                 <div className="h-14 w-14 rounded-[1.5rem] bg-white/10 flex items-center justify-center border border-white/20 shadow-inner shrink-0"><Zap className="h-8 w-8 text-accent" /></div>
                 <div className="text-left">
                    <h3 className="text-xl font-bold uppercase tracking-tight">Contract Logic</h3>
                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Tenant Scoped v3.5</p>
                 </div>
              </div>
              <div className="space-y-6">
                 <div className="p-5 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between shadow-inner">
                    <div className="text-left">
                       <p className="text-[9px] font-black uppercase text-slate-400">Next Renewal Node</p>
                       <p className="text-2xl font-black text-accent">{format(addYears(parseISO(formData.startDate), 1), 'dd MMM yyyy')}</p>
                    </div>
                    <RefreshCcw className="h-6 w-6 text-white/20" />
                 </div>
                 <div className="p-5 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between shadow-inner">
                    <div className="text-left">
                       <p className="text-[9px] font-black uppercase text-slate-400">Billed Amount</p>
                       <p className="text-2xl font-black text-white">₹{parseFloat(formData.amount || '0').toLocaleString()}</p>
                    </div>
                    <Badge variant="outline" className="bg-white/10 border-none text-[8px] font-black text-accent h-5 uppercase">Commercial Locked</Badge>
                 </div>
              </div>
              <Separator className="bg-white/10" />
              <Button onClick={handleCreate} disabled={isSubmitting || !formData.installationId} className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Authorize AMC Node"}
              </Button>
           </Card>
        </div>
      </div>
    </div>
  );
}

export default function NewSolarAmcPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary opacity-20" /></div>}>
      <NewSolarAmcContent />
    </Suspense>
  );
}