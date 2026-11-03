
"use client";

import { use, useState, useMemo, useEffect, Suspense } from "react";
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Settings2, 
  CheckCircle2, 
  Info,
  ShieldCheck,
  Plus,
  Trash2,
  Calculator,
  LayoutList,
  Package,
  ArrowRightLeft,
  ChevronRight,
  Database,
  Lock,
  AlertTriangle
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
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc, serverTimestamp, query, where, getDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function NewSolarDesignContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get('surveyId');

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const surveyRef = useMemoFirebase(() => 
    businessId && surveyId ? doc(firestore, 'businesses', businessId, 'solarSurveys', surveyId) : null
  , [firestore, businessId, surveyId]);
  const { data: survey, isLoading: isSurveyLoading } = useDoc<any>(surveyRef);

  const productsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'products') : null
  , [firestore, businessId]);
  const { data: products = [] } = useCollection<any>(productsQuery);

  const [formData, setFormData] = useState<any>({
    capacityKw: "",
    systemType: "On-grid",
    phaseType: "Single Phase",
    hasBattery: false,
    components: [] as any[],
    notes: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (survey) {
      setFormData((prev: any) => ({
        ...prev,
        capacityKw: survey.electrical?.proposedCapacity || "",
        phaseType: survey.electrical?.phaseType || "Single Phase",
      }));
    }
  }, [survey]);

  const addComponent = (product: any) => {
    setFormData((prev: any) => ({
      ...prev,
      components: [...prev.components, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unit: product.unit || 'pcs',
        price: product.price || 0,
        gstRate: product.gstRate || 0,
        category: product.category || 'Components',
        specs: product.sku || ''
      }]
    }));
    toast({ title: "Item Added", description: `${product.name} linked to BOM.` });
  };

  const removeComponent = (idx: number) => {
    setFormData((prev: any) => ({
      ...prev,
      components: prev.components.filter((_: any, i: number) => i !== idx)
    }));
  };

  const updateComponent = (idx: number, key: string, value: any) => {
    setFormData((prev: any) => {
      const updated = [...prev.components];
      updated[idx] = { ...updated[idx], [key]: value };
      return { ...prev, components: updated };
    });
  };

  const calculatedDcCapacity = useMemo(() => {
    return (formData.components || [])
      .filter((c: any) => c.productName?.toLowerCase().includes('panel') || c.category === 'Panels')
      .reduce((sum: number, c: any) => {
        const wattageMatch = c.productName?.match(/(\d+)W/i);
        const wattage = wattageMatch ? parseInt(wattageMatch[1]) : 540;
        return sum + (wattage * c.quantity) / 1000;
      }, 0);
  }, [formData.components]);

  const handleSubmit = async () => {
    if (!businessId || !survey || isSubmitting) return;
    
    // Workflow Guard: Only approved surveys can proceed
    if (survey.status !== 'APPROVED') {
      toast({ variant: "destructive", title: "Workflow Error", description: "Technical audit must be APPROVED before design." });
      return;
    }

    setIsSubmitting(true);
    try {
      const designRef = collection(firestore, 'businesses', businessId, 'solarSystemDesigns');
      const docRef = await addDocumentNonBlocking(designRef, {
        ...formData,
        businessId,
        solarInquiryId: survey.inquiryId,
        solarSurveyId: survey.id,
        customerId: survey.customerId,
        customerName: survey.customerName,
        calculatedDcKw: calculatedDcCapacity,
        status: 'DRAFT',
        version: 1,
        createdBy: user?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast({ title: "Design Node Created", description: "Technical blueprint locked." });
      router.push(`/solar/designs/${docRef?.id}`);
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Error", description: "Failed to establish design node." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSurveyLoading) return <div className="min-h-screen flex items-center justify-center opacity-40"><Loader2 className="animate-spin text-primary h-10 w-10 opacity-20" /></div>;

  if (!survey || survey.status !== 'APPROVED') {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-6 px-4">
         <div className="h-16 w-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner"><Lock className="h-8 w-8" /></div>
         <h2 className="text-xl font-black uppercase text-slate-900">Workflow Blocked</h2>
         <p className="text-muted-foreground text-sm font-medium leading-relaxed">Engineering requires an <strong>APPROVED</strong> Site Survey node to proceed. Please approve the audit first.</p>
         <Button asChild variant="outline" className="rounded-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest"><Link href={`/solar/surveys/${surveyId}`}>Open Survey Hub</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 text-left px-2 sm:px-4">
      <div className="flex items-center gap-4 text-left">
        <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0"><Link href={`/solar/surveys/${surveyId}`}><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div className="text-left">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">System Designer</h1>
          <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1.5 opacity-60">Engineering Node for {survey?.customerName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border">
            <CardHeader className="bg-primary/5 border-b py-8 px-10">
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg"><Settings2 className="h-6 w-6" /></div>
                  <div className="text-left">
                     <CardTitle className="text-lg font-black uppercase tracking-tight text-primary">Technical Configuration</CardTitle>
                     <p className="text-[9px] font-bold text-primary/60 uppercase">Phase & Protocol Specs</p>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-8 sm:p-10 space-y-10 text-left">
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Target Capacity (kW)</Label>
                     <Input type="number" value={formData.capacityKw} onChange={(e) => setFormData({...formData, capacityKw: e.target.value})} className="h-12 rounded-xl font-black text-lg bg-muted/20 border-none shadow-inner" />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">System Architecture</Label>
                     <Select value={formData.systemType} onValueChange={(v) => setFormData({...formData, systemType: v})}>
                        <SelectTrigger className="h-12 rounded-xl font-bold uppercase text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                           <SelectItem value="On-grid" className="text-[10px] font-bold uppercase">On-grid Net Meta</SelectItem>
                           <SelectItem value="Off-grid" className="text-[10px] font-bold uppercase">Off-grid Storage</SelectItem>
                           <SelectItem value="Hybrid" className="text-[10px] font-bold uppercase text-primary">Hybrid Protocol</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Phase Node</Label>
                     <Select value={formData.phaseType} onValueChange={(v) => setFormData({...formData, phaseType: v})}>
                        <SelectTrigger className="h-12 rounded-xl font-bold uppercase text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                           <SelectItem value="Single Phase" className="text-[10px] font-bold uppercase">Single Phase</SelectItem>
                           <SelectItem value="Three Phase" className="text-[10px] font-bold uppercase">Three Phase</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
               </div>

               <Separator />

               <div className="space-y-6 text-left">
                  <div className="flex items-center justify-between px-1">
                     <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-primary" />
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-primary">Bill of Materials (BOM)</h4>
                     </div>
                     <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[8px] font-black px-2 h-5 uppercase">{formData.components?.length || 0} Nodes Selected</Badge>
                  </div>

                  <div className="space-y-4">
                     {(!formData.components || formData.components.length === 0) ? (
                       <div className="p-16 text-center border-2 border-dashed rounded-[2rem] opacity-30 italic text-sm font-black uppercase">No components linked to design.</div>
                     ) : (
                       <div className="space-y-3">
                          {formData.components.map((c: any, i: number) => (
                            <div key={i} className="p-4 bg-muted/10 rounded-2xl border border-transparent hover:border-primary/20 transition-all flex flex-col sm:flex-row items-center gap-4 group">
                               <div className="flex-1 min-w-0 text-left">
                                  <p className="text-sm font-black text-slate-900 uppercase truncate">{c.productName}</p>
                                  <p className="text-[8px] font-bold text-primary/60 uppercase">{c.category} • {c.specs}</p>
                               </div>
                               <div className="flex items-center gap-4 w-full sm:w-auto">
                                  <div className="flex items-center gap-2">
                                     <Input type="number" value={c.quantity} onChange={(e) => updateComponent(i, 'quantity', parseInt(e.target.value) || 1)} className="h-9 w-20 text-center font-black rounded-xl bg-white border-none shadow-sm" />
                                     <span className="text-[10px] font-black uppercase text-slate-400">{c.unit}</span>
                                  </div>
                                  <Separator orientation="vertical" className="h-6 hidden sm:block" />
                                  <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive/40 hover:text-destructive" onClick={() => removeComponent(i)}><Trash2 className="h-4 w-4" /></Button>
                               </div>
                            </div>
                          ))}
                       </div>
                     )}
                  </div>

                  <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-border/50">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-3 block text-left">Link Component from Inventory</Label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input placeholder="Search catalog for Panels, Inverters..." className="h-14 pl-12 rounded-2xl bg-white border-none shadow-md font-bold" />
                      <div className="absolute top-full left-0 right-0 z-50 bg-white border rounded-[1.5rem] mt-2 shadow-2xl overflow-hidden max-h-[300px]">
                         <ScrollArea className="h-full">
                            {(products || []).filter(p => p.isActive).map(p => (
                               <div key={p.id} className="p-4 hover:bg-primary/5 cursor-pointer flex justify-between items-center border-b last:border-0 text-left" onClick={() => addComponent(p)}>
                                  <div className="text-left">
                                     <p className="text-sm font-bold text-slate-900 uppercase">{p.name}</p>
                                     <p className="text-[8px] font-black text-muted-foreground uppercase">{p.sku} • Stock: {p.stock}</p>
                                  </div>
                                  <Plus className="h-4 w-4 text-primary opacity-30" />
                               </div>
                            ))}
                         </ScrollArea>
                      </div>
                    </div>
                  </div>
               </div>

               <Separator />

               <div className="space-y-4 text-left">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Engineering Observations</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Notes on cabling, structure height or shading bypass..." className="min-h-[140px] rounded-[2rem] bg-muted/20 border-none p-6 text-sm font-medium" />
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8 sticky top-24 text-left">
           <Card className="border-none shadow-2xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden p-8 space-y-8 border border-white/5 text-left">
              <div className="flex items-center gap-4 text-left">
                 <div className="h-14 w-14 rounded-[1.5rem] bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><Calculator className="h-8 w-8 text-accent" /></div>
                 <div className="text-left">
                    <h3 className="text-xl font-bold uppercase tracking-tight">Logic Node</h3>
                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Automatic Capacity Matrix</p>
                 </div>
              </div>
              <div className="space-y-6">
                 <div className="p-5 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-between shadow-inner group">
                    <div className="text-left">
                       <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Total Panel DC</p>
                       <p className="text-3xl font-black text-accent">{calculatedDcCapacity.toFixed(2)} <span className="text-[10px] text-white/40">kWp</span></p>
                    </div>
                    <ArrowRightLeft className="h-8 w-8 text-white/10 -rotate-90" />
                 </div>
                 <div className="p-5 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-between shadow-inner opacity-60">
                    <div className="text-left">
                       <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Inverter Limit</p>
                       <p className="text-3xl font-black">{formData.capacityKw || '0'} <span className="text-[10px] text-white/40">kW</span></p>
                    </div>
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                 </div>
              </div>
              <Separator className="bg-white/10" />
              <div className="space-y-4 text-left">
                 <div className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-green-400" /><span className="text-[9px] font-black uppercase text-slate-300">Tenant Isolated Logic</span></div>
                 <div className="flex items-center gap-3"><BadgeCheck className="h-4 w-4 text-green-400" /><span className="text-[9px] font-black uppercase text-slate-300">No Inventory Reduction</span></div>
              </div>
              <Button onClick={handleSubmit} disabled={isSubmitting || !formData.capacityKw} className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Deploy Design Node"}
              </Button>
           </Card>
        </div>
      </div>
    </div>
  );
}

export default function NewSolarDesignPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin h-10 w-10 text-primary opacity-20" /></div>}>
      <NewSolarDesignContent />
    </Suspense>
  );
}
