
"use client";

import { use, useState, useMemo } from "react";
import { 
  FileSpreadsheet, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  User, 
  Zap, 
  ShieldCheck, 
  Bot, 
  Loader2, 
  History, 
  Printer, 
  Download, 
  Share2, 
  SmartphoneNfc, 
  ChevronRight, 
  Info, 
  BadgeCheck, 
  Sparkles, 
  Target, 
  Settings2, 
  Calculator, 
  Building2, 
  Tag, 
  Scale, 
  FileText, 
  Smartphone,
  Phone,
  Mail,
  MapPin,
  Landmark,
  X,
  Briefcase,
  Receipt,
  Sun,
  LayoutList,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { doc, serverTimestamp, collection, query, where, getDocs, limit } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { sendWhatsAppTemplate } from "@/app/actions/whatsapp-actions";

const STATUS_CONFIG: any = {
  'draft': { label: 'Draft', color: 'text-slate-500', bg: 'bg-slate-100' },
  'sent': { label: 'Active Proposal', color: 'text-blue-600', bg: 'bg-blue-50' },
  'converted': { label: 'Accepted', color: 'text-green-600', bg: 'bg-green-50' },
  'rejected': { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-50' },
  'expired': { label: 'Expired', color: 'text-red-600', bg: 'bg-red-50' },
};

export default function SolarQuotationDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const quoteRef = useMemoFirebase(() => 
    businessId && id ? doc(firestore, 'businesses', businessId, 'quotations', id) : null
  , [firestore, businessId, id]);
  const { data: quote, isLoading: isQuoteLoading } = useDoc<any>(quoteRef);

  const designRef = useMemoFirebase(() => 
    businessId && quote?.solarSystemDesignId ? doc(firestore, 'businesses', businessId, 'solarSystemDesigns', quote.solarSystemDesignId) : null
  , [firestore, businessId, quote?.solarSystemDesignId]);
  const { data: design } = useDoc<any>(designRef);

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const activeAddonIds = useMemo(() => business?.activeAddonIds || [], [business]);
  const isWhatsappEntitled = activeAddonIds.includes('feat_whatsapp') || activeAddonIds.includes('suite_growth');

  const [isQuoting, setIsQuoting] = useState(false);

  const handleUpdateStatus = (status: string) => {
    if (!quoteRef) return;
    updateDocumentNonBlocking(quoteRef, { status, updatedAt: serverTimestamp() });
    toast({ title: "Quotation Status Updated" });
  };

  const handleWhatsAppShare = async () => {
    if (!quote || !business || !businessId) return;

    if (!isWhatsappEntitled) {
      toast({
        title: "WhatsApp Add-on Required",
        description: "Automated messaging requires the Growth Suite or WhatsApp module.",
        action: (
          <Button variant="outline" size="sm" asChild>
            <Link href="/marketplace">Upgrade</Link>
          </Button>
        )
      });
      return;
    }

    const waConfig = business?.whatsappApiConfig;
    if (!waConfig?.isVerified) {
       toast({ 
         variant: "destructive", 
         title: "API Unlinked", 
         description: "Please verify your Meta API connection in Settings." 
       });
       return;
    }

    setIsQuoting(true);
    try {
      // Use existing POS template as an entitled baseline for commercial dispatches
      const templateName = waConfig.posTemplateName || "hello_world";
      const targetPhone = "91" + quote.customerPhone.replace(/\D/g, '').slice(-10);
      
      const components = [{
        type: "body",
        parameters: [
          { type: "text", text: quote.customerName },
          { type: "text", text: quote.quotationId },
          { type: "text", text: `${currencySymbol}${quote.totals?.finalPayout?.toLocaleString()}` },
          { type: "text", text: "SOLAR PROPOSAL" },
          { type: "text", text: "N/A" },
          { type: "text", text: `${currencySymbol}${quote.totals?.finalPayout?.toLocaleString()}` },
          { type: "text", text: `${window.location.origin}/projects/track/${businessId}/${quote.solarInquiryId}` }
        ]
      }];

      const res = await sendWhatsAppTemplate(
        businessId,
        { phoneId: waConfig.phoneId, accessToken: waConfig.accessToken },
        targetPhone,
        templateName,
        waConfig.posLanguageCode || 'en_IN',
        components
      );

      if (res.success) toast({ title: "Proposal Dispatched" });
      else toast({ variant: "destructive", title: "Meta Rejection", description: res.error });
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Dispatch Failed" });
    } finally {
      setIsQuoting(false);
    }
  };

  if (isQuoteLoading) return <div className="min-h-screen flex items-center justify-center opacity-40"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;
  if (!quote) return <div className="p-20 text-center"><p className="font-bold">Proposal not found.</p><Button asChild variant="outline" className="mt-4"><Link href="/solar/quotations">Back to Hub</Link></Button></div>;

  const currencySymbol = getCurrencySymbol(business?.currency);
  const sInfo = STATUS_CONFIG[quote.status] || STATUS_CONFIG['draft'];
  const isAccepted = quote.status === 'converted';

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 text-left px-2 sm:px-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4 text-left flex-1 min-w-0">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0"><Link href="/solar/quotations"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="text-left">
             <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary h-5 px-3 mb-1.5 tracking-widest">OFFER NODE: {quote.quotationId}</Badge>
             <h1 className="text-2xl md:text-4xl font-black text-slate-900 leading-none uppercase">{quote.customerName}</h1>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {isAccepted && (
            <Button asChild className="flex-1 md:flex-none h-11 px-6 rounded-xl bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] tracking-widest shadow-xl">
               <Link href={`/solar/installations/new?quoteId=${id}`}><Briefcase className="mr-2 h-4 w-4" /> Initiate Installation</Link>
            </Button>
          )}
          <Button onClick={() => window.print()} variant="outline" className="flex-1 md:flex-none h-11 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-sm bg-white"><Printer className="h-4 w-4 mr-2" /> Print PDF</Button>
          <Select value={quote.status} onValueChange={handleUpdateStatus}>
             <SelectTrigger className={cn("flex-1 md:flex-none h-11 rounded-xl font-black uppercase text-[10px] tracking-widest w-full md:w-48", sInfo.bg, sInfo.color)}>
                <SelectValue />
             </SelectTrigger>
             <SelectContent className="rounded-xl border-none shadow-2xl">
                {Object.keys(STATUS_CONFIG).map(s => <SelectItem key={s} value={s} className="text-[10px] font-black uppercase">{STATUS_CONFIG[s].label}</SelectItem>)}
             </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-8 space-y-12">
          {/* COMMERCIAL QUOTE BODY */}
          <Card className="border-none shadow-2xl bg-white rounded-[3rem] overflow-hidden border print:shadow-none">
            <CardHeader className="p-10 sm:p-14 bg-slate-900 text-white relative text-left shrink-0">
               <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12"><Receipt className="h-64 w-64" /></div>
               <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-10">
                  <div className="space-y-6 flex-1 text-left">
                    <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                       {business?.logoUrl ? <img src={business.logoUrl} className="h-full w-full object-contain p-1" /> : <Sun className="h-8 w-8 text-accent" />}
                    </div>
                    <div>
                       <h3 className="text-2xl font-black uppercase tracking-tight">{business?.name || "Solar Hub"}</h3>
                       <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">GST: {business?.gstin || 'UNREGISTERED'}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right space-y-2">
                     <p className="text-[10px] font-black text-accent uppercase tracking-widest">Grand Total Node</p>
                     <p className="text-4xl sm:text-6xl font-black tracking-tighter">{currencySymbol}{quote.totals?.finalPayout?.toLocaleString()}</p>
                     <Badge className="bg-green-500 text-white border-none text-[8px] font-black px-3 h-5 uppercase">Commercial Verified</Badge>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-8 sm:p-14 space-y-16 text-left">
               {/* CLIENT & PROJECT IDENTITY */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 text-left">
                  <div className="space-y-4">
                     <p className="text-[10px] font-black uppercase text-primary tracking-widest border-b border-primary/10 pb-2">Client Identity</p>
                     <div className="text-left">
                        <h4 className="text-lg font-black text-slate-900 uppercase leading-none mb-2">{quote.customerName}</h4>
                        <p className="text-xs font-bold text-slate-500 flex items-center gap-2 mb-1"><Phone className="h-3 w-3" /> {quote.customerPhone}</p>
                        <p className="text-[10px] font-medium text-slate-400 uppercase leading-relaxed max-w-xs">{quote.customerAddress || 'Address in Registry'}</p>
                     </div>
                  </div>
                  <div className="space-y-4 text-left sm:text-right">
                     <p className="text-[10px] font-black uppercase text-primary tracking-widest border-b border-primary/10 pb-2 sm:text-right">Technical Summary</p>
                     <div className="space-y-1">
                        <p className="text-sm font-black text-slate-900 uppercase">System: {design?.capacityKw || '--'} kW {design?.systemType}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Phase: {design?.phaseType || '--'}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Design ID: {design?.id?.slice(-6).toUpperCase() || 'MANUAL'}</p>
                     </div>
                  </div>
               </div>

               {/* LINE ITEMS TABLE */}
               <section className="space-y-6 text-left">
                  <div className="flex items-center gap-3 px-1 text-left">
                     <LayoutList className="h-5 w-5 text-primary" />
                     <h4 className="text-xs font-black uppercase tracking-widest text-primary">Bill of Materials & Services</h4>
                  </div>
                  <div className="border rounded-[2rem] overflow-hidden shadow-sm">
                    <Table>
                       <TableHeader><TableRow className="bg-muted/30"><TableHead className="pl-8 text-[10px] font-black uppercase h-12">Particulars</TableHead><TableHead className="text-center text-[10px] font-black uppercase h-12">Qty</TableHead><TableHead className="text-right text-[10px] font-black uppercase h-12">Rate</TableHead><TableHead className="text-right pr-8 text-[10px] font-black uppercase h-12">Subtotal</TableHead></TableRow></TableHeader>
                       <TableBody>
                         {(quote.items || []).map((item: any, i: number) => (
                           <TableRow key={i} className="border-b last:border-0 hover:bg-muted/5 transition-colors group">
                              <TableCell className="pl-8 py-5">
                                 <div className="text-left">
                                   <p className="text-xs font-black text-slate-900 uppercase">{item.name}</p>
                                   <p className="text-[8px] font-bold text-primary/60 uppercase mt-0.5">{item.gstRate}% GST Node</p>
                                 </div>
                              </TableCell>
                              <TableCell className="text-center font-black text-xs text-primary">{item.quantity} {item.unit || 'pcs'}</TableCell>
                              <TableCell className="text-right font-bold text-xs text-slate-600">{currencySymbol}{parseFloat(item.price || 0).toLocaleString()}</TableCell>
                              <TableCell className="text-right font-black text-sm text-slate-900 pr-8">
                                {currencySymbol}{(item.quantity * item.price).toLocaleString()}
                              </TableCell>
                           </TableRow>
                         ))}
                       </TableBody>
                    </Table>
                  </div>
               </section>

               {/* TOTALS RECONCILIATION */}
               <div className="flex flex-col md:flex-row justify-between items-start gap-12 pt-6">
                  <div className="flex-1 space-y-6 text-left">
                     <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/20 space-y-4">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-primary leading-none">Terms & Validity Protocol</h5>
                        <div className="space-y-3">
                           <div className="flex items-center gap-3"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /><span className="text-[9px] font-bold uppercase text-slate-600">Validity: 15 Days from generation</span></div>
                           <div className="flex items-center gap-3"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /><span className="text-[9px] font-bold uppercase text-slate-600">50% Advance with Order Node</span></div>
                           <div className="flex items-center gap-3"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /><span className="text-[9px] font-bold uppercase text-slate-600">Inventory reserved only on booking</span></div>
                        </div>
                     </div>
                  </div>
                  
                  <div className="w-full md:w-80 space-y-4 text-left">
                     <div className="flex justify-between items-center px-4"><span className="text-[10px] font-black text-slate-400 uppercase">Gross Subtotal</span><span className="text-sm font-black text-slate-900">₹{(quote.totals?.grossSubtotal - quote.totals?.taxTotal).toLocaleString()}</span></div>
                     <div className="flex justify-between items-center px-4"><span className="text-[10px] font-black text-slate-400 uppercase">Tax Node (GST)</span><span className="text-sm font-black text-primary">+₹{quote.totals?.taxTotal.toLocaleString()}</span></div>
                     <Separator className="opacity-40" />
                     <div className="p-6 bg-slate-900 rounded-[2rem] flex flex-col items-center justify-center gap-2 shadow-xl">
                        <p className="text-[9px] font-black text-accent uppercase tracking-[0.3em] leading-none">Final Net Payable</p>
                        <p className="text-4xl font-black text-white">{currencySymbol}{quote.totals?.finalPayout?.toLocaleString()}</p>
                     </div>
                  </div>
               </div>

               <div className="pt-20 flex justify-between items-end border-t border-dashed px-10">
                  <div className="text-center space-y-2 w-48"><div className="h-0.5 w-full bg-slate-200" /><p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Customer Signature</p></div>
                  <div className="text-center space-y-2 w-48"><div className="h-0.5 w-full bg-slate-900" /><p className="text-[8px] font-black uppercase text-slate-900 tracking-widest">Authorized Specialist</p></div>
               </div>
            </CardContent>
            <CardFooter className="bg-muted/10 p-6 flex justify-center border-t">
               <p className="text-[9px] font-black uppercase tracking-0.4em text-slate-300">Verified Secure Document • Biztrix AI OS</p>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8 text-left">
           <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
              <CardHeader className="bg-primary/5 border-b py-6 px-8 text-left"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><History className="h-4 w-4" /> Node Context</CardTitle></CardHeader>
              <CardContent className="p-8 space-y-8 text-left">
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Blueprint Source</p>
                       <Button asChild variant="link" className="h-auto p-0 font-black text-primary text-[10px] uppercase hover:no-underline"><Link href={`/solar/designs/${quote.solarSystemDesignId}`}>View Technical Design <ArrowRight className="ml-1.5 h-3 w-3" /></Link></Button>
                    </div>
                    <Separator />
                    <div className="space-y-1">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inquiry Context</p>
                       <Button asChild variant="link" className="h-auto p-0 font-black text-primary text-[10px] uppercase hover:no-underline"><Link href={`/solar/inquiries/${quote.solarInquiryId}`}>Lead Pipeline Registry <ArrowRight className="ml-1.5 h-3 w-3" /></Link></Button>
                    </div>
                 </div>
              </CardContent>
           </Card>

           <div className={cn("p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl text-left", isWhatsappEntitled ? "bg-slate-900 text-white" : "bg-white border-2 border-dashed border-muted-foreground/20")}>
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:scale-110 transition-transform"><SmartphoneNfc className="h-40 w-40" /></div>
              <div className="relative z-10 space-y-6">
                 <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center border shadow-inner", isWhatsappEntitled ? "bg-white/10 border-white/20" : "bg-primary/10 border-primary/20")}>
                   <SmartphoneNfc className={cn("h-6 w-6", isWhatsappEntitled ? "text-accent" : "text-primary")} />
                 </div>
                 <h4 className={cn("text-xl font-bold uppercase tracking-tight leading-none", isWhatsappEntitled ? "text-white" : "text-slate-900")}>Share Proposal</h4>
                 
                 {isWhatsappEntitled ? (
                   <>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium italic text-left">"Use the official WhatsApp dispatch node to send a professional PDF summary to the client instantly."</p>
                    <Button onClick={handleWhatsAppShare} disabled={isQuoting} className="w-full h-14 bg-accent text-primary font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all">
                      {isQuoting ? <Loader2 className="animate-spin h-4 w-4" /> : "Launch WhatsApp Dispatch"}
                    </Button>
                   </>
                 ) : (
                   <div className="space-y-6">
                      <p className="text-xs text-muted-foreground font-medium italic">"Automated WhatsApp updates are available in the Growth Suite."</p>
                      <Button asChild variant="outline" className="w-full h-12 rounded-xl text-[9px] font-black uppercase border-primary/20 text-primary">
                        <Link href="/marketplace">Enable WhatsApp Add-on <ChevronRight className="ml-1 h-3 w-3" /></Link>
                      </Button>
                   </div>
                 )}
              </div>
           </div>

           {!isAccepted && (
              <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left p-8 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm"><Info className="h-4 w-4" /></div>
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Acceptance Protocol</p>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium leading-relaxed italic text-left">"Proposal accept hone par status ko **'Converted'** mark karein. Isse automated Installation Node create karne ka option active ho jayega."</p>
              </Card>
           )}
        </div>
      </div>
    </div>
  );
}
