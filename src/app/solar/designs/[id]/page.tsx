
"use client";

import { use, useState, useMemo } from "react";
import { 
  ArrowLeft, 
  Settings2, 
  CheckCircle2, 
  Clock, 
  User, 
  Bot, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  Loader2, 
  ChevronRight, 
  Target, 
  Briefcase, 
  Activity, 
  Calculator, 
  FileSpreadsheet, 
  History, 
  Tag, 
  Package, 
  Download, 
  Edit2, 
  Trash2, 
  Check, 
  ArrowRight,
  Info,
  BadgeCheck,
  SmartphoneNfc,
  Printer
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, useCollection } from "@/firebase";
import { doc, serverTimestamp, collection, query, where, getDoc } from "firebase/firestore";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

const DESIGN_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  'DRAFT': { label: 'Draft Mode', color: 'text-slate-500', bg: 'bg-slate-50', icon: Clock },
  'IN_REVIEW': { label: 'Tech Review', color: 'text-orange-600', bg: 'bg-orange-50', icon: Activity },
  'APPROVED': { label: 'Approved', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
  'REVISION_REQUIRED': { label: 'Revision', color: 'text-red-600', bg: 'bg-red-50', icon: History },
  'ARCHIVED': { label: 'Archived', color: 'text-slate-400', bg: 'bg-slate-100', icon: Zap },
};

export default function SolarDesignDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const designRef = useMemoFirebase(() => 
    businessId && id ? doc(firestore, 'businesses', businessId, 'solarSystemDesigns', id) : null
  , [firestore, businessId, id]);
  const { data: design, isLoading: isDesignLoading } = useDoc<any>(designRef);

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const [isQuoting, setIsQuoting] = useState(false);

  const handleUpdateStatus = (status: string) => {
    if (!designRef) return;
    updateDocumentNonBlocking(designRef, { status, updatedAt: serverTimestamp() });
    toast({ title: "Node Status Updated" });
  };

  const handleGenerateQuotation = async () => {
    if (!businessId || !design || isQuoting) return;
    setIsQuoting(true);
    try {
      const quotesRef = collection(firestore, 'businesses', businessId, 'quotations');
      const quoteId = `SOLAR-Q-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const items = (design.components || []).map((c: any) => ({
        productId: c.productId,
        name: c.productName,
        quantity: c.quantity,
        price: c.price,
        gstRate: c.gstRate || 0,
        unit: c.unit || 'pcs'
      }));

      const subtotal = items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
      const taxTotal = items.reduce((sum: number, i: any) => sum + (i.price * i.quantity * (i.gstRate / 100)), 0);
      
      const newQuoteData = {
        id: quoteId,
        quotationId: quoteId,
        businessId,
        customerId: design.customerId,
        customerName: design.customerName,
        solarInquiryId: design.solarInquiryId,
        solarSurveyId: design.solarSurveyId,
        solarSystemDesignId: design.id,
        items,
        totals: {
          grossSubtotal: subtotal + taxTotal,
          taxTotal: taxTotal,
          finalPayout: Math.round(subtotal + taxTotal),
        },
        status: 'sent',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDocumentNonBlocking(quotesRef, newQuoteData);
      toast({ title: "Quotation Synchronized", description: `Node ${quoteId} established.` });
      router.push(`/solar/quotations`);
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Sync Failed" });
    } finally {
      setIsQuoting(false);
    }
  };

  if (isDesignLoading || isProfileLoading) return <div className="min-h-screen flex items-center justify-center opacity-40"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;
  if (!design) return <div className="p-20 text-center"><p className="font-bold">Design node not found.</p><Button asChild variant="outline" className="mt-4"><Link href="/solar/designs">Back to Registry</Link></Button></div>;

  const sInfo = DESIGN_STATUS_CONFIG[design.status] || DESIGN_STATUS_CONFIG['DRAFT'];
  const currencySymbol = getCurrencySymbol(business?.currency);
  const isApproved = design.status === 'APPROVED';

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 text-left px-2 sm:px-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-left flex-1 min-w-0">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0"><Link href="/solar/designs"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="text-left min-w-0 flex-1">
             <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary h-5 px-3 mb-1.5 tracking-widest">BLUEPRINT NODE: {id.slice(-8).toUpperCase()}</Badge>
             <h1 className="text-2xl md:text-4xl font-black text-slate-900 leading-none uppercase truncate">{design.customerName}</h1>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={design.status} onValueChange={handleUpdateStatus}>
             <SelectTrigger className={cn("h-11 rounded-xl font-black uppercase text-[10px] tracking-widest w-full md:w-48", sInfo.bg, sInfo.color)}>
                <SelectValue />
             </SelectTrigger>
             <SelectContent className="rounded-xl border-none shadow-2xl">
                {Object.keys(DESIGN_STATUS_CONFIG).map(s => <SelectItem key={s} value={s} className="text-[10px] font-black uppercase">{DESIGN_STATUS_CONFIG[s].label}</SelectItem>)}
             </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start text-left">
        <div className="lg:col-span-8 space-y-12">
          {/* TECHNICAL MANIFEST */}
          <Card className="border-none shadow-xl bg-white rounded-[3rem] overflow-hidden border">
            <CardHeader className="bg-slate-900 py-10 px-10 text-white relative text-left">
               <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12"><Settings2 className="h-48 w-48" /></div>
               <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                  <div className="space-y-6 flex-1 text-left">
                    <div className="flex items-center gap-4">
                       <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner shrink-0"><Bot className="h-7 w-7 text-accent" /></div>
                       <div className="text-left">
                          <h3 className="text-xl font-black uppercase tracking-tight">System Specification Manifest</h3>
                          <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Design Authority v3.5 • Rev {design.version}</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                       <div className="p-6 bg-white/5 rounded-2xl border border-white/10 text-left">
                          <p className="text-[9px] font-black uppercase text-slate-400 mb-1.5">Capacity Node</p>
                          <p className="text-3xl font-black text-white">{design.capacityKw} <span className="text-xs text-white/40">kW</span></p>
                          <Badge variant="outline" className="mt-3 bg-white/10 text-accent border-none font-black text-[7px] h-4 uppercase">{design.systemType}</Badge>
                       </div>
                       <div className="p-6 bg-white/5 rounded-2xl border border-white/10 text-left">
                          <p className="text-[9px] font-black uppercase text-slate-400 mb-1.5">Electrical Grid</p>
                          <p className="text-xl font-black text-white uppercase">{design.phaseType}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase mt-2">Design Date: {design.createdAt?.toDate ? format(design.createdAt.toDate(), 'dd MMM yyyy') : '--'}</p>
                       </div>
                    </div>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-8 sm:p-12 space-y-16 text-left">
               {/* BILL OF MATERIALS */}
               <section className="space-y-8">
                  <div className="flex items-center gap-3 px-1 text-left">
                     <Package className="h-5 w-5 text-primary" />
                     <h4 className="text-xs font-black uppercase tracking-widest text-primary">Technical Bill of Materials (BOM)</h4>
                  </div>
                  <div className="border rounded-[2rem] overflow-hidden shadow-sm">
                    <Table>
                       <TableHeader><TableRow className="bg-muted/30"><TableHead className="pl-6 text-[10px] font-black uppercase h-10">Component</TableHead><TableHead className="text-center text-[10px] font-black uppercase h-10">Qty</TableHead><TableHead className="text-center text-[10px] font-black uppercase h-10">Unit</TableHead><TableHead className="text-right pr-6 text-[10px] font-black uppercase h-10">Tech Specs</TableHead></TableRow></TableHeader>
                       <TableBody>
                         {(design.components || []).map((c: any, i: number) => (
                           <TableRow key={i} className="border-b last:border-0 hover:bg-muted/5 transition-colors">
                              <TableCell className="pl-6 py-4"><span className="text-xs font-bold text-slate-900 uppercase">{c.productName}</span></TableCell>
                              <TableCell className="text-center font-black text-xs text-primary">{c.quantity}</TableCell>
                              <TableCell className="text-center text-[10px] font-bold text-slate-500 uppercase">{c.unit}</TableCell>
                              <TableCell className="text-right pr-6"><Badge variant="outline" className="text-[7px] font-mono h-4 border-muted-foreground/20 text-muted-foreground uppercase">{c.specs || 'Std Node'}</Badge></TableCell>
                           </TableRow>
                         ))}
                       </TableBody>
                    </Table>
                  </div>
               </section>

               <Separator className="opacity-40" />

               <section className="space-y-8 text-left">
                  <div className="flex items-center gap-3 px-1 text-left">
                     <Calculator className="h-5 w-5 text-primary" />
                     <h4 className="text-xs font-black uppercase tracking-widest text-primary">Engineering Validation</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                     <div className="p-8 bg-slate-50 rounded-[2.5rem] border-none shadow-inner flex flex-col justify-center gap-1 text-left">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Calculated DC Capacity</p>
                        <p className="text-3xl font-black text-slate-900">{design.calculatedDcKw?.toFixed(2) || '0.00'} <span className="text-xs opacity-30">kWp</span></p>
                     </div>
                     <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 flex flex-col justify-center gap-1 text-left">
                        <p className="text-[9px] font-black uppercase text-primary/60 tracking-[0.2em]">Inverter Sizing Node</p>
                        <p className="text-3xl font-black text-primary">{design.capacityKw} <span className="text-xs opacity-30">kW</span></p>
                     </div>
                  </div>
               </section>

               {design.notes && (
                 <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1"><FileText className="h-4 w-4" /> Designer's Technical Remarks</h4>
                    <div className="p-8 bg-muted/20 rounded-[2rem] shadow-inner border-none italic text-sm font-medium text-slate-600 leading-relaxed text-left">
                       "{design.notes}"
                    </div>
                 </section>
               )}
            </CardContent>
            <CardFooter className="bg-muted/10 p-10 border-t flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="flex items-center gap-4 text-left">
                  <ShieldCheck className="h-10 w-10 text-green-600 opacity-40 shrink-0" />
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-900 uppercase leading-none">Integrity Verified Node</p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Technical baseline established v3.5</p>
                  </div>
               </div>
               <div className="flex gap-3 w-full md:w-auto">
                 <Button variant="outline" className="flex-1 md:flex-none h-12 rounded-xl font-black uppercase text-[10px] tracking-widest" onClick={() => window.print()}>Technical Print</Button>
                 {design.status !== 'APPROVED' && (
                    <Button onClick={() => handleUpdateStatus('APPROVED')} className="flex-1 md:flex-none h-12 bg-green-600 hover:bg-green-700 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl text-white">Approve Design</Button>
                 )}
                 {isApproved && (
                    <Button onClick={handleGenerateQuotation} disabled={isQuoting} className="flex-1 md:flex-none h-12 bg-primary rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl text-white">
                      {isQuoting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                      Generate Solar Proposal
                    </Button>
                 )}
               </div>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8 text-left">
           <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
              <CardHeader className="bg-primary/5 border-b py-6 px-8 text-left"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><History className="h-4 w-4" /> Lifecycle Registry</CardTitle></CardHeader>
              <CardContent className="p-8 space-y-8 text-left">
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Survey Baseline</p>
                       <Button asChild variant="link" className="h-auto p-0 font-black text-primary text-[10px] uppercase hover:no-underline"><Link href={`/solar/surveys/${design.solarSurveyId}`}>View Technical Audit <ArrowRight className="ml-1.5 h-3 w-3" /></Link></Button>
                    </div>
                    <Separator />
                    <div className="space-y-1">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Project Lead</p>
                       <Button asChild variant="link" className="h-auto p-0 font-black text-primary text-[10px] uppercase hover:no-underline"><Link href={`/solar/inquiries/${design.solarInquiryId}`}>Inquiry Detail Hub <ArrowRight className="ml-1.5 h-3 w-3" /></Link></Button>
                    </div>
                 </div>
              </CardContent>
           </Card>

           <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:scale-110 transition-transform"><SmartphoneNfc className="h-40 w-40" /></div>
              <div className="relative z-10 space-y-6">
                 <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><Sparkles className="h-6 w-6 text-accent" /></div>
                 <h4 className="text-xl font-bold uppercase tracking-tight text-white leading-none">Proposal Node</h4>
                 <p className="text-xs text-slate-400 leading-relaxed font-medium italic text-left">"Once approved, this engineering baseline will automatically populate the commercial quotation items."</p>
                 <Separator className="bg-white/10" />
                 <div className="flex items-center gap-3 text-left"><BadgeCheck className="h-4 w-4 text-accent" /><span className="text-[9px] font-black uppercase text-slate-300">Engineering Node Locked</span></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
