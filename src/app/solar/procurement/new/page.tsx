
"use client";

import { useState, useMemo, Suspense } from "react";
import { 
  Plus, 
  ArrowLeft, 
  Save, 
  Loader2, 
  Search, 
  ShieldCheck, 
  Zap, 
  Package, 
  Calculator, 
  Target, 
  TrendingUp, 
  ChevronRight,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Briefcase
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
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection, addDocumentNonBlocking } from "@/firebase";
import { collection, doc, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function NewSolarProcurementContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const installId = searchParams.get('installId');

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const installsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarInstallations'), where('status', '!=', 'HANDED_OVER')) : null
  , [firestore, businessId]);
  const { data: activeInstalls = [] } = useCollection<any>(installsQuery);

  const vendorsQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'vendors') : null, [firestore, businessId]);
  const { data: vendors = [] } = useCollection<any>(vendorsQuery);

  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    installationId: installId || "",
    vendorId: "none",
    priority: "medium" as any,
    notes: "",
    items: [] as any[]
  });

  const selectedInstall = useMemo(() => 
    (activeInstalls || []).find((inst: any) => inst.id === formData.installationId)
  , [activeInstalls, formData.installationId]);

  // PLANNING LOGIC: Detect Shortages from Installation BOM
  const plannedItems = useMemo(() => {
    if (!selectedInstall) return [];
    return (selectedInstall.materials || []).map((m: any) => {
        const remaining = (m.required || 0) - (m.issued || 0);
        return {
            productId: m.productId,
            productName: m.productName,
            required: m.required,
            issued: m.issued || 0,
            shortage: Math.max(0, remaining),
            planned: Math.max(0, remaining),
            unitCost: m.unitCostAtIssue || 0
        };
    }).filter((m:any) => m.shortage > 0);
  }, [selectedInstall]);

  useEffect(() => {
    if (plannedItems.length > 0) {
      setFormData(prev => ({ ...prev, items: plannedItems }));
    }
  }, [plannedItems]);

  const filteredInstalls = useMemo(() => {
    if (!searchTerm) return (activeInstalls || []).slice(0, 5);
    return (activeInstalls || []).filter((i: any) => 
      i.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.installationNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
  }, [activeInstalls, searchTerm]);

  const handleLaunchRequisition = async () => {
    if (!businessId || !formData.installationId || !selectedInstall) return;

    setIsSubmitting(true);
    try {
      const reqRef = collection(firestore, 'businesses', businessId, 'solarPurchaseRequisitions');
      const selectedVendor = vendors.find(v => v.id === formData.vendorId);
      
      const totalCost = formData.items.reduce((sum, i) => sum + (i.planned * i.unitCost), 0);

      const docRef = await addDocumentNonBlocking(reqRef, {
        ...formData,
        businessId,
        customerName: selectedInstall.customerName,
        installationNumber: selectedInstall.installationNumber,
        vendorName: selectedVendor?.name || "Direct Node",
        status: 'DRAFT',
        totalEstimatedCost: totalCost,
        requestedBy: userProfile?.name || 'Admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast({ title: "Requisition Drafted", description: "Node initialized for approval." });
      router.push(`/solar/procurement/${docRef?.id}`);
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Deployment Error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currencySymbol = getCurrencySymbol(business?.currency);

  if (isProfileLoading) return <div className="min-h-screen flex items-center justify-center opacity-40 text-left"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 text-left px-2 sm:px-4">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm border border-border/50 shrink-0"><Link href="/solar/procurement"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div className="text-left">
           <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Purchase Planner</h1>
           <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1.5 opacity-60">Demand & Supply Node Sync</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-8 space-y-10">
           <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border">
              <CardHeader className="bg-primary/5 border-b py-8 px-10">
                 <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shrink-0"><Target className="h-6 w-6" /></div>
                    <div className="text-left">
                       <CardTitle className="text-lg font-black uppercase text-primary">Requirement Analysis</CardTitle>
                       <p className="text-[9px] font-bold text-primary/60 uppercase">Detect shortages from active installations</p>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-8 sm:p-10 space-y-10 text-left">
                 <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">1. Identify Target Installation *</Label>
                    <div className="relative">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 opacity-40" />
                       <Input 
                         placeholder="Search customer name or INST-ID..." 
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
                                 <div className="text-left"><p className="text-sm font-bold text-slate-900 uppercase">{inst.customerName}</p><p className="text-[9px] font-black text-muted-foreground uppercase">{inst.installationNumber} • {inst.status}</p></div>
                                 <ChevronRight className="h-4 w-4 text-primary opacity-30" />
                              </div>
                            ))}
                         </div>
                       )}
                    </div>
                 </div>

                 {selectedInstall && (
                   <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/20 flex flex-col gap-6 animate-in zoom-in-95 text-left">
                      <div className="flex items-center justify-between text-left">
                         <div className="flex items-center gap-4 text-left">
                            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm"><Briefcase className="h-5 w-5" /></div>
                            <div className="text-left"><p className="text-sm font-black text-slate-900 uppercase">{selectedInstall.customerName}</p><p className="text-[9px] font-bold text-muted-foreground uppercase">Project Active</p></div>
                         </div>
                         <Badge className="bg-primary text-white text-[8px] font-black h-5 uppercase px-2">{selectedInstall.capacityKw} kWp</Badge>
                      </div>
                      
                      <div className="space-y-4">
                         <p className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Detected Node Shortages</p>
                         <div className="space-y-2">
                            {plannedItems.length === 0 ? (
                               <div className="p-4 bg-green-50 rounded-xl border border-green-100 flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="text-[10px] font-black uppercase text-green-700">Material Ready: No Purchase Required</span></div>
                            ) : plannedItems.map((item, i) => (
                               <div key={i} className="p-4 bg-white rounded-xl border flex items-center justify-between shadow-sm">
                                  <div className="text-left">
                                     <p className="text-[11px] font-black text-slate-900 uppercase">{item.productName}</p>
                                     <p className="text-[8px] font-bold text-muted-foreground uppercase">Shortage: {item.shortage} units</p>
                                  </div>
                                  <Badge variant="outline" className="text-[8px] font-black uppercase h-5 px-1.5 border-orange-200 text-orange-600 bg-orange-50">Demand Active</Badge>
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>
                 )}

                 <Separator />

                 <div className="space-y-6 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">2. Payout & Source Protocol</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
                       <div className="space-y-2 text-left">
                          <Label className="text-[9px] font-bold uppercase opacity-60">Primary Vendor Node</Label>
                          <Select value={formData.vendorId} onValueChange={(v) => setFormData({...formData, vendorId: v})}>
                             <SelectTrigger className="h-12 rounded-xl bg-muted/10 border-none shadow-sm font-bold text-xs uppercase"><SelectValue placeholder="Pick Supplier" /></SelectTrigger>
                             <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="none" className="text-[10px] font-bold uppercase">Manual / Spot Purchase</SelectItem>
                                {vendors.map((v: any) => <SelectItem key={v.id} value={v.id} className="text-[10px] font-bold uppercase">{v.name}</SelectItem>)}
                             </SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-2 text-left">
                          <Label className="text-[9px] font-bold uppercase opacity-60">Priority Level</Label>
                          <Select value={formData.priority} onValueChange={(v: any) => setFormData({...formData, priority: v})}>
                             <SelectTrigger className="h-12 rounded-xl bg-white border-muted font-bold text-xs uppercase"><SelectValue /></SelectTrigger>
                             <SelectContent className="rounded-xl">
                                <SelectItem value="low">Routine</SelectItem>
                                <SelectItem value="medium">Normal</SelectItem>
                                <SelectItem value="high" className="text-orange-600 font-bold">High Focus</SelectItem>
                                <SelectItem value="urgent" className="text-red-600 font-black">Urgent Node</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>
                    </div>
                    <div className="space-y-2 text-left">
                       <Label className="text-[9px] font-bold uppercase opacity-60">Procurement Note</Label>
                       <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Reason for specific vendor or pricing negotiation notes..." className="min-h-[100px] rounded-2xl bg-muted/10 border-none p-4 text-xs font-medium" />
                    </div>
                 </div>
              </CardContent>
           </Card>
        </div>

        <div className="lg:col-span-4 space-y-8 sticky top-24 text-left">
           <Card className="border-none shadow-2xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden p-8 space-y-8 border border-white/5 text-left">
              <div className="flex items-center gap-4 text-left">
                 <div className="h-14 w-14 rounded-[1.5rem] bg-white/10 flex items-center justify-center border border-white/20 shadow-inner shrink-0"><Calculator className="h-8 w-8 text-accent" /></div>
                 <div className="text-left">
                    <h3 className="text-xl font-bold uppercase tracking-tight">Summary node</h3>
                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Commercial Logic Loop</p>
                 </div>
              </div>
              <div className="space-y-6">
                 <div className="p-5 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between shadow-inner">
                    <div className="text-left">
                       <p className="text-[9px] font-black uppercase text-slate-400">Unique SKUs</p>
                       <p className="text-2xl font-black text-accent">{formData.items.length}</p>
                    </div>
                    <Package className="h-6 w-6 text-white/20" />
                 </div>
                 <div className="p-5 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between shadow-inner">
                    <div className="text-left">
                       <p className="text-[9px] font-black uppercase text-slate-400">Estimated Cost</p>
                       <p className="text-2xl font-black text-white">{currencySymbol}{formData.items.reduce((sum, i) => sum + (i.planned * i.unitCost), 0).toLocaleString()}</p>
                    </div>
                    <Badge variant="outline" className="bg-white/10 border-none text-[8px] font-black text-accent h-5 uppercase">Est. Base</Badge>
                 </div>
              </div>
              <Separator className="bg-white/10" />
              <div className="space-y-4 text-left">
                 <div className="flex items-center gap-3 text-left"><ShieldCheck className="h-4 w-4 text-green-400" /><span className="text-[9px] font-black uppercase text-slate-300">Hardened Registry Sync</span></div>
                 <div className="flex items-center gap-3 text-left"><CheckCircle2 className="h-4 w-4 text-green-400" /><span className="text-[9px] font-black uppercase text-slate-300">Atomic Stock Handshake</span></div>
              </div>
              <Button onClick={handleLaunchRequisition} disabled={isSubmitting || !formData.installationId} className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Deploy Requisition Node"}
              </Button>
           </Card>
        </div>
      </div>
    </div>
  );
}

export default function NewSolarProcurementPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center opacity-40 text-left"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>}>
      <NewSolarProcurementContent />
    </Suspense>
  );
}
