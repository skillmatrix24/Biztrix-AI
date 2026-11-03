
"use client";

import { use, useState, useMemo } from "react";
import { 
  Handshake, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Zap, 
  Loader2, 
  History, 
  DollarSign, 
  Calculator, 
  BadgeCheck, 
  Settings2, 
  FileText, 
  ArrowRight,
  TrendingUp,
  XCircle,
  Receipt,
  SmartphoneNfc
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { doc, serverTimestamp, collection } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";

const COMMISSION_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'CALCULATED': { label: 'Calculated', color: 'text-blue-600', bg: 'bg-blue-50' },
  'PENDING_APPROVAL': { label: 'Reviewing', color: 'text-orange-600', bg: 'bg-orange-50' },
  'APPROVED': { label: 'Approved', color: 'text-green-600', bg: 'bg-green-50' },
  'PAYABLE': { label: 'Ready to Pay', color: 'text-purple-600', bg: 'bg-purple-50' },
  'PAID': { label: 'Settled', color: 'text-slate-500', bg: 'bg-slate-100' },
  'REJECTED': { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-50' },
};

export default function CommissionDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const commRef = useMemoFirebase(() => businessId && id ? doc(firestore, 'businesses', businessId, 'solarDealerCommissions', id) : null, [firestore, businessId, id]);
  const { data: commission, isLoading: isCommLoading } = useDoc<any>(commRef);

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpdateStatus = (status: string) => {
    if (!commRef) return;
    updateDocumentNonBlocking(commRef, { status, updatedAt: serverTimestamp() });
    toast({ title: "Node Updated", description: `Status changed to ${status}.` });
  };

  const handleRecordPayout = async () => {
    if (!businessId || !commission || isProcessing) return;
    
    // Safety guard to prevent double-payout
    if (commission.status === 'PAID') {
      toast({ variant: "destructive", title: "Already Settled", description: "This commission node has been closed." });
      return;
    }

    setIsProcessing(true);
    try {
      const cashbookRef = collection(firestore, 'businesses', businessId, 'cashbook');
      
      // 1. Record in Cashbook (as internal payout)
      await addDocumentNonBlocking(cashbookRef, {
        businessId,
        type: 'debit',
        amount: parseFloat(commission.amount),
        particulars: `Dealer Payout: ${commission.dealerName} (Ref: ${commission.solarQuotationId})`,
        category: 'Other',
        entryBy: userProfile?.name || 'Admin',
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });

      // 2. Update Status to PAID
      updateDocumentNonBlocking(commRef!, { 
        status: 'PAID', 
        paidAt: new Date().toISOString(), 
        updatedAt: serverTimestamp() 
      });

      toast({ title: "Payout Dispatched", description: "Ledger updated successfully." });
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Payout Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isCommLoading) return <div className="min-h-screen flex items-center justify-center opacity-40"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;
  if (!commission) return <div className="p-20 text-center space-y-4">No record found.</div>;

  const currencySymbol = getCurrencySymbol(business?.currency);
  const sInfo = COMMISSION_STATUS_CONFIG[commission.status] || COMMISSION_STATUS_CONFIG['CALCULATED'];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 text-left px-2 sm:px-4">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm border border-border/50 shrink-0"><Link href="/solar/commissions"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div className="text-left">
           <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary h-5 px-3 mb-1.5 tracking-widest">COMMISSION NODE: {id.slice(-8).toUpperCase()}</Badge>
           <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">{commission.dealerName}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-8 space-y-8">
           <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border">
              <CardHeader className="bg-primary/5 border-b py-8 px-10 text-left">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center text-primary shadow-lg"><Calculator className="h-7 w-7" /></div>
                       <div className="text-left">
                          <CardTitle className="text-lg font-black uppercase text-primary">Calculation Audit</CardTitle>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Rule: {commission.commissionType} Mode</p>
                       </div>
                    </div>
                    <Badge className={cn("border-none text-[8px] font-black h-5 px-3 uppercase", sInfo.bg, sInfo.color)}>{sInfo.label}</Badge>
                 </div>
              </CardHeader>
              <CardContent className="p-8 sm:p-12 space-y-10 text-left">
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1 text-left">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Applied Amount</p>
                       <p className="text-4xl font-black text-slate-900">{currencySymbol}{parseFloat(commission.amount).toLocaleString()}</p>
                    </div>
                    <div className="text-right space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Payout Node</p>
                       <p className="text-xl font-bold text-slate-500 uppercase">{commission.commissionBase?.replace(/_/g, ' ')}</p>
                    </div>
                 </div>

                 <Separator className="opacity-40" />

                 <div className="space-y-6 text-left">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><History className="h-4 w-4" /> Timeline Audit</h4>
                    <div className="relative pl-5 before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-0.5 before:bg-muted/40 text-left">
                       <div className="relative flex flex-col gap-1 mb-6 text-left">
                          <div className={cn("absolute -left-[20px] h-3 w-3 rounded-full border-2 border-white z-10 bg-primary")} />
                          <p className="text-[10px] font-black text-slate-900 uppercase">Node Initialized</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">{commission.createdAt?.toDate ? format(commission.createdAt.toDate(), 'dd MMM yyyy, HH:mm') : '--'}</p>
                       </div>
                       {commission.paidAt && (
                         <div className="relative flex flex-col gap-1 text-left">
                            <div className="absolute -left-[20px] h-3 w-3 rounded-full border-2 border-white z-10 bg-green-500" />
                            <p className="text-[10px] font-black text-slate-900 uppercase">Settlement Processed</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">{format(new Date(commission.paidAt), 'dd MMM yyyy, HH:mm')}</p>
                         </div>
                       )}
                    </div>
                 </div>
              </CardContent>
              <CardFooter className="bg-muted/10 p-10 border-t flex flex-wrap gap-3">
                 {commission.status === 'PAYABLE' && (
                   <Button onClick={handleRecordPayout} disabled={isProcessing} className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">
                      {isProcessing ? <Loader2 className="animate-spin h-5 w-5 mr-3" /> : <SmartphoneNfc className="h-5 w-5 mr-3" />}
                      Dispatch Payment Node
                   </Button>
                 )}
                 {commission.status === 'CALCULATED' && (
                   <Button onClick={() => handleUpdateStatus('PENDING_APPROVAL')} className="flex-1 h-14 bg-primary text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">
                      Submit for Approval
                   </Button>
                 )}
                 {commission.status === 'PENDING_APPROVAL' && (
                   <div className="flex gap-3 w-full">
                      <Button onClick={() => handleUpdateStatus('REJECTED')} variant="outline" className="flex-1 h-14 rounded-2xl border-red-200 text-red-600 font-black uppercase text-xs">Reject Node</Button>
                      <Button onClick={() => handleUpdateStatus('APPROVED')} className="flex-1 h-14 bg-green-600 text-white font-black uppercase text-xs rounded-2xl">Approve Dues</Button>
                   </div>
                 )}
                 {commission.status === 'APPROVED' && (
                   <Button onClick={() => handleUpdateStatus('PAYABLE')} className="flex-1 h-14 bg-purple-600 text-white font-black uppercase text-xs rounded-2xl">Mark as Payable</Button>
                 )}
              </CardFooter>
           </Card>
        </div>

        <div className="md:col-span-4 space-y-8 text-left">
           <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
              <CardHeader className="bg-muted/30 border-b py-5 px-6"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Context Trace</CardTitle></CardHeader>
              <CardContent className="p-8 space-y-6 text-left">
                 <div className="space-y-4">
                    <div className="space-y-1 text-left">
                       <p className="text-[8px] font-black text-slate-400 uppercase">Commercial Source</p>
                       <Button asChild variant="link" className="h-auto p-0 font-bold text-primary text-[10px] uppercase hover:no-underline"><Link href={`/solar/quotations/${commission.solarQuotationId}`}>View Quotation <ArrowRight className="ml-1 h-2.5 w-2.5" /></Link></Button>
                    </div>
                    <Separator />
                    <div className="space-y-1 text-left">
                       <p className="text-[8px] font-black text-slate-400 uppercase">Client Node</p>
                       <p className="text-sm font-bold text-slate-700 uppercase">{commission.customerName}</p>
                    </div>
                 </div>
              </CardContent>
           </Card>

           <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 flex items-start gap-4 shadow-inner text-left">
              <ShieldCheck className="h-5 w-5 text-primary opacity-40 shrink-0 mt-0.5" />
              <p className="text-[10px] text-primary/70 leading-relaxed font-medium italic uppercase tracking-tighter text-left">
                "Commission records are non-destructive. Every status change is logged for transparent partner reporting."
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
