
"use client";

import { useState, useMemo } from "react";
import { 
  Handshake, 
  Plus, 
  Search, 
  ChevronRight, 
  Filter, 
  Loader2, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  History, 
  BadgeCheck, 
  SmartphoneNfc, 
  ArrowLeft,
  Settings2,
  Trash2,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp, where } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

const COMMISSION_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'CALCULATED': { label: 'Calculated', color: 'text-blue-600', bg: 'bg-blue-50' },
  'PENDING_APPROVAL': { label: 'Awaiting Approval', color: 'text-orange-600', bg: 'bg-orange-50' },
  'APPROVED': { label: 'Approved', color: 'text-green-600', bg: 'bg-green-50' },
  'PAYABLE': { label: 'Marked Payable', color: 'text-purple-600', bg: 'bg-purple-50' },
  'PAID': { label: 'Settled', color: 'text-slate-500', bg: 'bg-slate-100' },
  'REJECTED': { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-50' },
};

export default function SolarCommissionsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const commissionsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarDealerCommissions'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: commissionsData, isLoading: isCommissionsLoading } = useCollection<any>(commissionsQuery);
  const commissions = commissionsData || [];

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredCommissions = useMemo(() => {
    return (commissions || []).filter((c: any) => 
      c.dealerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [commissions, searchTerm]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const stats = useMemo(() => {
    const list = commissions || [];
    const pending = list.filter(c => c.status !== 'PAID').length;
    const totalDues = list.filter(c => c.status !== 'PAID').reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    const paidToday = list.filter(c => c.status === 'PAID' && c.paidAt).length;
    return { pending, totalDues, paidToday };
  }, [commissions]);

  if (isProfileLoading) return <div className="flex items-center justify-center py-20 opacity-40"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20 text-left px-2 sm:px-0">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-14 w-14 rounded-2xl bg-purple-50 flex items-center justify-center shrink-0 border border-purple-100 shadow-inner">
            <Handshake className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Commission Hub</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Partner Settlement Registry</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border border-border/50 text-left">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Awaiting Settlement</p>
          <div className="text-2xl font-black text-slate-900">{stats.pending} Records</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-red-500 text-left">
          <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Total Payout Node</p>
          <div className="text-2xl font-black text-red-700">{currencySymbol}{stats.totalDues.toLocaleString()}</div>
        </Card>
        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6 text-left">
          <div className="flex items-center justify-between opacity-40 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-accent">Node Health</span>
            <BadgeCheck className="h-4 w-4 text-accent" />
          </div>
          <div className="text-2xl font-black text-white">98% Verified</div>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2.5rem] border">
        <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input placeholder="Search dealer or customer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 pl-10 rounded-xl bg-white border-none shadow-inner text-xs font-bold w-full" />
          </div>
          <Badge variant="outline" className="text-[8px] font-black h-6 border-primary/20 text-primary uppercase">{(commissions || []).length} Logs Found</Badge>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-muted/10 border-b">
                <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Dealer Node</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Related Customer</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Status</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase h-12">Commission Amount</TableHead>
                <TableHead className="text-right pr-8 h-12 w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isCommissionsLoading ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary opacity-20" /></TableCell></TableRow>
              ) : filteredCommissions.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center opacity-30 italic text-sm">No commissions logged.</TableCell></TableRow>
              ) : (
                filteredCommissions.map((c: any) => {
                  const s = COMMISSION_STATUS_CONFIG[c.status] || COMMISSION_STATUS_CONFIG['CALCULATED'];
                  return (
                    <TableRow key={c.id} className="group hover:bg-muted/5 transition-colors border-b cursor-pointer" onClick={() => router.push(`/solar/commissions/${c.id}`)}>
                      <TableCell className="pl-8 py-5 text-left">
                        <div className="flex items-center gap-4 text-left">
                          <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center font-black text-purple-600 text-xs shadow-inner uppercase shrink-0">D</div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{c.dealerName}</p>
                            <p className="text-[9px] font-mono text-primary/60 uppercase tracking-widest mt-1">Ref: {c.solarQuotationId}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                         <p className="text-xs font-bold text-slate-700">{c.customerName}</p>
                         <p className="text-[8px] font-black uppercase opacity-40">{c.createdAt?.toDate ? format(c.createdAt.toDate(), 'dd MMM yyyy') : 'Recently'}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[8px] font-black uppercase h-5 px-3 border-none shadow-sm", s.bg, s.color)}>{s.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-black text-sm text-primary">
                        {currencySymbol}{parseFloat(c.amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <ChevronRight className="h-4 w-4 text-primary opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
