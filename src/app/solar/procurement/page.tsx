
"use client";

import { useState, useMemo } from "react";
import { 
  ShoppingBasket, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Filter, 
  Loader2, 
  SmartphoneNfc, 
  History, 
  Package, 
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Tag,
  Briefcase,
  BadgeCheck,
  XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

const REQ_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  'DRAFT': { label: 'Draft', color: 'text-slate-500', bg: 'bg-slate-100', icon: Clock },
  'APPROVED': { label: 'Approved', color: 'text-blue-600', bg: 'bg-blue-50', icon: CheckCircle2 },
  'ORDERED': { label: 'Ordered', color: 'text-orange-600', bg: 'bg-orange-50', icon: Zap },
  'PARTIALLY_RECEIVED': { label: 'Partial', color: 'text-purple-600', bg: 'bg-purple-50', icon: Package },
  'RECEIVED': { label: 'Fulfilled', color: 'text-green-600', bg: 'bg-green-50', icon: BadgeCheck },
  'CANCELLED': { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
};

export default function SolarProcurementPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const requisitionsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarPurchaseRequisitions'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: requisitionsData, isLoading: isReqLoading } = useCollection<any>(requisitionsQuery);
  const requisitions = requisitionsData || [];

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredReqs = useMemo(() => {
    return (requisitions || []).filter((r: any) => 
      r.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase())
    ).filter((r: any) => statusFilter === 'all' || r.status === statusFilter);
  }, [requisitions, searchTerm, statusFilter]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const stats = useMemo(() => {
    const list = requisitions || [];
    const pending = list.filter(r => r.status === 'APPROVED' || r.status === 'ORDERED' || r.status === 'PARTIALLY_RECEIVED').length;
    const fulfilled = list.filter(r => r.status === 'RECEIVED').length;
    const totalCommitted = list
      .filter(r => r.status !== 'CANCELLED' && r.status !== 'DRAFT')
      .reduce((sum, r) => sum + (parseFloat(r.totalEstimatedCost) || 0), 0);
    
    return { pending, fulfilled, totalCommitted };
  }, [requisitions]);

  if (isProfileLoading) return <div className="flex items-center justify-center py-20 opacity-40 text-left"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20 text-left px-2 sm:px-0">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
            <ShoppingBasket className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Procurement Hub</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Supply Chain & Material Planning</p>
          </div>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
          <Link href="/solar/procurement/new"><Plus className="mr-2 h-4 w-4" /> New Requisition</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border border-border/50 text-left">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Active Pipeline</p>
          <div className="text-2xl font-black text-slate-900">{stats.pending} Pending</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-green-500 border-border/50 text-left">
          <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Fulfilled Nodes</p>
          <div className="text-2xl font-black text-green-700">{stats.fulfilled} Completed</div>
        </Card>
        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6 text-left">
          <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">Committed Value</p>
          <div className="text-2xl font-black text-white">{currencySymbol}{stats.totalCommitted.toLocaleString()}</div>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2.5rem] border">
        <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-full md:w-44 rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-primary">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Full Lifecycle</SelectItem>
                {Object.keys(REQ_STATUS_CONFIG).map(s => <SelectItem key={s} value={s}>{REQ_STATUS_CONFIG[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input 
              placeholder="Search vendor or client..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="h-11 pl-10 rounded-xl bg-white border-none shadow-inner text-xs font-bold w-full" 
            />
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-muted/10 border-b">
                <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Requisition Node</TableHead>
                <TableHead className="text-[10px) font-black uppercase h-12">Target Project</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Supplier</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Status</TableHead>
                <TableHead className="text-right pr-8 h-12 w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isReqLoading ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary opacity-20" /></TableCell></TableRow>
              ) : filteredReqs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center opacity-30 italic text-sm">No procurement nodes found.</TableCell></TableRow>
              ) : (
                filteredReqs.map((req: any) => {
                  const s = REQ_STATUS_CONFIG[req.status] || REQ_STATUS_CONFIG['DRAFT'];
                  return (
                    <TableRow key={req.id} className="group hover:bg-muted/5 transition-colors border-b cursor-pointer text-left" onClick={() => router.push(`/solar/procurement/${req.id}`)}>
                      <TableCell className="pl-8 py-5 text-left">
                        <div className="flex items-center gap-4 text-left">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-xs shadow-inner uppercase shrink-0">R</div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">ID: {req.id.slice(-8).toUpperCase()}</p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Created {req.createdAt?.toDate ? format(req.createdAt.toDate(), 'dd MMM') : 'Recently'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                         <p className="text-xs font-bold text-slate-700 uppercase">{req.customerName}</p>
                         <p className="text-[8px] font-black uppercase opacity-40">Valuation: {currencySymbol}{parseFloat(req.totalEstimatedCost || 0).toLocaleString()}</p>
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-2">
                            <Tag className="h-3 w-3 text-primary opacity-30" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase">{req.vendorName || "Unassigned"}</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[8px] font-black uppercase h-5 px-3 border-none shadow-sm gap-1.5", s.bg, s.color)}>
                           <s.icon className="h-3 w-3" /> {s.label}
                        </Badge>
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
