
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
  BoxSelect,
  XCircle,
  ShoppingBasket,
  Truck,
  LayoutList,
  FileText
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, runTransaction } from "@/firebase";
import { doc, serverTimestamp, collection } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

const REQ_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  'DRAFT': { label: 'Draft', color: 'text-slate-500', bg: 'bg-slate-50', icon: Clock },
  'APPROVED': { label: 'Approved', color: 'text-blue-600', bg: 'bg-blue-50', icon: CheckCircle2 },
  'ORDERED': { label: 'Ordered', color: 'text-orange-600', bg: 'bg-orange-50', icon: Zap },
  'PARTIALLY_RECEIVED': { label: 'Partial Receipt', color: 'text-purple-600', bg: 'bg-purple-50', icon: Package },
  'RECEIVED': { label: 'Fulfilled', color: 'text-green-600', bg: 'bg-green-50', icon: BadgeCheck },
  'CANCELLED': { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
};

export default function SolarProcurementDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  const reqRef = useMemoFirebase(() => 
    businessId && id ? doc(firestore, 'businesses', businessId, 'solarPurchaseRequisitions', id) : null
  , [firestore, businessId, id]);
  const { data: req, isLoading: isReqLoading } = useDoc<any>(reqRef);

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const [isReceiving, setIsReceiving] = useState(false);

  const handleUpdateStatus = (status: string) => {
    if (!reqRef || !isAdmin) return;
    updateDocumentNonBlocking(reqRef, { status, updatedAt: serverTimestamp() });
    toast({ title: "Node Status Updated", description: `Requisition is now ${status}.` });
  };

  // HARDENED GOODS RECEIVING TRANSACTION (PHASE 15 CORE)
  const handleReceiveGoods = async () => {
    if (!businessId || !req || isReceiving || !reqRef) return;
    
    // Safety Guard
    if (req.status === 'RECEIVED') {
      toast({ variant: "destructive", title: "Already Fulfilled" });
      return;
    }

    setIsReceiving(true);
    try {
      await runTransaction(firestore, async (transaction) => {
        const freshReqSnap = await transaction.get(reqRef);
        if (!freshReqSnap.exists()) throw new Error("REQUISITION_NOT_FOUND");
        const freshReq = freshReqSnap.data();

        // 1. Batch Update Stock for every item in BOM
        for (const item of freshReq.items) {
          const productRef = doc(firestore, 'businesses', businessId, 'products', item.productId);
          const productSnap = await transaction.get(productRef);
          
          if (!productSnap.exists()) continue;
          const pData = productSnap.data();
          const newStock = (pData.stock || 0) + (item.planned || 0);

          transaction.update(productRef, { 
            stock: newStock,
            lastPurchasePrice: item.unitCost,
            updatedAt: serverTimestamp() 
          });
        }

        // 2. Finalize Requisition State
        transaction.update(reqRef, { 
          status: 'RECEIVED', 
          receivedAt: serverTimestamp(),
          updatedAt: serverTimestamp() 
        });

        // 3. Record Commercial Node in Cashbook
        const cbRef = doc(collection(firestore, 'businesses', businessId, 'cashbook'));
        transaction.set(cbRef, {
            businessId,
            type: 'debit',
            amount: freshReq.totalEstimatedCost,
            particulars: `Goods Received: ${freshReq.vendorName} (Req: ${id.slice(-6).toUpperCase()})`,
            category: 'Purchase',
            entryBy: userProfile?.name || 'Admin',
            date: new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp()
        });
      });

      toast({ title: "Inventory Synced", description: "Stock nodes increased and ledger updated." });
    } catch (e: any) {
    console.error(e);
      toast({ variant: "destructive", title: "Handshake Failed", description: e.message });
    } finally {
      setIsReceiving(false);
    }
  };

  if (isReqLoading) return <div className="min-h-screen flex items-center justify-center opacity-40 text-left"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;
  if (!req) return <div className="p-20 text-center"><p className="font-bold">Requisition node not found.</p><Button asChild variant="outline" className="mt-4"><Link href="/solar/procurement">Back to Registry</Link></Button></div>;

  const sInfo = REQ_STATUS_CONFIG[req.status] || REQ_STATUS_CONFIG['DRAFT'];
  const currencySymbol = getCurrencySymbol(business?.currency);
  const isFulfilled = req.status === 'RECEIVED';

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-32 text-left px-2 sm:px-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4 text-left flex-1 min-w-0">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm border shrink-0"><Link href="/solar/procurement"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="text-left flex-1 min-w-0">
             <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary h-5 px-3 mb-1.5 tracking-widest">REQUISITION NODE: {id.slice(-8).toUpperCase()}</Badge>
             <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase truncate">Supply Chain Node</h1>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {req.status === 'ORDERED' && isAdmin && (
            <Button onClick={handleReceiveGoods} disabled={isReceiving} className="flex-1 md:flex-none h-11 px-8 rounded-xl bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] tracking-widest shadow-xl">
               {isReceiving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />} Record Goods Receipt
            </Button>
          )}
          <Select value={req.status} onValueChange={handleUpdateStatus} disabled={!isAdmin || isFulfilled}>
             <SelectTrigger className={cn("flex-1 md:flex-none h-11 rounded-xl font-black uppercase text-[10px] tracking-widest w-full md:w-48 shadow-lg", sInfo.bg, sInfo.color)}>
                <SelectValue />
             </SelectTrigger>
             <SelectContent className="rounded-xl border-none shadow-2xl">
                {Object.keys(REQ_STATUS_CONFIG).map(s => <SelectItem key={s} value={s} className="text-[10px] font-black uppercase">{REQ_STATUS_CONFIG[s].label}</SelectItem>)}
             </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-8 space-y-12">
          {/* PROCUREMENT BODY */}
          <Card className="border-none shadow-xl bg-white rounded-[3rem] overflow-hidden border">
            <CardHeader className="bg-slate-900 py-10 px-10 text-white relative text-left shrink-0">
               <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12"><ShoppingBasket className="h-64 w-64" /></div>
               <div className="relative z-10 flex flex-col md:flex-row justify-between items-start sm:items-center gap-10">
                  <div className="space-y-6 flex-1 text-left">
                    <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner shrink-0">
                       <Truck className="h-8 w-8 text-accent" />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black uppercase tracking-tight">{req.vendorName || "Spot Purchase"}</h3>
                       <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Node Type: Supply Source</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right space-y-2">
                     <p className="text-[10px] font-black text-accent uppercase tracking-widest">Total Transaction Value</p>
                     <p className="text-4xl sm:text-5xl font-black tracking-tighter">{currencySymbol}{parseFloat(req.totalEstimatedCost || 0).toLocaleString()}</p>
                     <Badge className={cn("border-none text-[8px] font-black px-3 h-5 uppercase shadow-sm", req.status === 'RECEIVED' ? 'bg-green-500 text-white' : 'bg-white/10 text-accent')}>{req.status}</Badge>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-8 sm:p-12 space-y-12 text-left">
               <section className="space-y-6 text-left">
                  <div className="flex items-center gap-3 px-1 text-left">
                     <LayoutList className="h-5 w-5 text-primary" />
                     <h4 className="text-xs font-black uppercase tracking-widest text-primary">Bill of Materials - Order Node</h4>
                  </div>
                  <div className="border rounded-[2rem] overflow-hidden shadow-sm">
                    <Table>
                       <TableHeader><TableRow className="bg-muted/30"><TableHead className="pl-8 text-[10px] font-black uppercase h-12">Component</TableHead><TableHead className="text-center text-[10px] font-black uppercase h-12">Qty</TableHead><TableHead className="text-right pr-8 text-[10px] font-black uppercase h-12">Rate</TableHead></TableRow></TableHeader>
                       <TableBody>
                         {(req.items || []).map((item: any, i: number) => (
                           <TableRow key={i} className="border-b last:border-0 hover:bg-muted/5 transition-colors group">
                              <TableCell className="pl-8 py-5">
                                 <div className="text-left">
                                   <p className="text-xs font-black text-slate-900 uppercase">{item.productName}</p>
                                   <p className="text-[8px] font-bold text-primary/60 uppercase mt-0.5">Asset ID: {item.productId?.slice(-6).toUpperCase()}</p>
                                 </div>
                              </TableCell>
                              <TableCell className="text-center font-black text-xs text-primary">{item.planned} Units</TableCell>
                              <TableCell className="text-right font-black text-sm text-slate-900 pr-8">{currencySymbol}{parseFloat(item.unitCost || 0).toLocaleString()}</TableCell>
                           </TableRow>
                         ))}
                       </TableBody>
                    </Table>
                  </div>
               </section>

               {req.notes && (
                 <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1"><FileText className="h-4 w-4" /> Operational Remark</h4>
                    <div className="p-8 bg-muted/20 rounded-[2rem] shadow-inner border-none italic text-sm font-medium text-slate-600 leading-relaxed text-left">
                       "{req.notes}"
                    </div>
                 </section>
               )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8 text-left">
           <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
              <CardHeader className="bg-primary/5 border-b py-6 px-8 text-left"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><History className="h-4 w-4" /> Execution Chain</CardTitle></CardHeader>
              <CardContent className="p-8 space-y-8 text-left">
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Demand Source (Project)</p>
                       <Button asChild variant="link" className="h-auto p-0 font-black text-primary text-[10px] uppercase hover:no-underline"><Link href={`/solar/installations/${req.installationId}`}>View Site Node <ArrowRight className="ml-1.5 h-3 w-3" /></Link></Button>
                    </div>
                    <Separator />
                    <div className="space-y-1">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Supply Partner</p>
                       <p className="text-sm font-bold text-slate-700 uppercase">{req.vendorName || "Manual Sourcing"}</p>
                    </div>
                 </div>
              </CardContent>
           </Card>

           <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] relative overflow-hidden group shadow-2xl text-left">
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:scale-110 transition-transform"><SmartphoneNfc className="h-40 w-40" /></div>
              <div className="relative z-10 space-y-6 text-left">
                 <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><BadgeCheck className="h-6 w-6 text-accent" /></div>
                 <h4 className="text-xl font-bold uppercase tracking-tight text-white leading-none">Integrity Verified</h4>
                 <p className="text-xs text-slate-400 leading-relaxed font-medium italic text-left">"Goods Receipt node triggers an atomic transaction. Stock levels and Cashbook ledger are updated in a single operation v3.5."</p>
                 <Separator className="bg-white/10" />
                 <div className="flex items-center gap-3 text-left"><ShieldCheck className="h-4 w-4 text-green-400" /><span className="text-[9px] font-black uppercase text-slate-300">Hardened Stock Protocol</span></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
