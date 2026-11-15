
"use client";

import { useState, useMemo } from "react";
import { 
  ShieldAlert, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Filter, 
  Loader2, 
  ShieldCheck, 
  SmartphoneNfc, 
  Calendar, 
  Receipt,
  ArrowLeft,
  LayoutList,
  Target,
  ArrowRight,
  Shield,
  Zap,
  Gem
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy, doc as firestoreDoc, where, serverTimestamp } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, differenceInDays, parseISO } from "date-fns";

const AMC_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'ACTIVE': { label: 'Active Coverage', color: 'text-green-600', bg: 'bg-green-50' },
  'EXPIRING': { label: 'Expiring Soon', color: 'text-orange-600', bg: 'bg-orange-50' },
  'EXPIRED': { label: 'Expired Node', color: 'text-red-600', bg: 'bg-red-50' },
  'RENEWAL_PENDING': { label: 'Pending Renewal', color: 'text-blue-600', bg: 'bg-blue-50' },
  'CANCELLED': { label: 'Cancelled', color: 'text-slate-500', bg: 'bg-slate-100' },
};

export default function SolarAmcRegistryPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const amcQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarAmcContracts'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: contractsData, isLoading: isAmcLoading } = useCollection<any>(amcQuery);
  const contracts = contractsData || [];

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredContracts = useMemo(() => {
    return (contracts || []).filter((c: any) => {
      const matchesSearch = c.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           c.contractNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchTerm, statusFilter]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const stats = useMemo(() => {
    const list = contracts || [];
    const active = list.filter(c => c.status === 'ACTIVE').length;
    const expiring = list.filter(c => {
       if (c.status !== 'ACTIVE') return false;
       const diff = differenceInDays(parseISO(c.endDate), new Date());
       return diff > 0 && diff < 30;
    }).length;
    const mtdRev = list.filter(c => c.status === 'ACTIVE').reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    return { active, expiring, mtdRev };
  }, [contracts]);

  if (isProfileLoading) return <div className="flex items-center justify-center py-20 opacity-40"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20 text-left px-2 sm:px-0">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-14 w-14 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0 border border-orange-100 shadow-inner">
            <ShieldAlert className="h-8 w-8 text-orange-600" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">AMC Hub</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Maintenance Contract Lifecycle</p>
          </div>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
          <Link href="/solar/amc/new"><Plus className="mr-2 h-4 w-4" /> New Contract</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border border-border/50 text-left">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Active Roadmap</p>
          <div className="text-2xl font-black text-slate-900">{stats.active} Contracts</div>
          <p className="text-[8px] font-bold uppercase text-green-600 mt-2">Verified Revenue Nodes</p>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-orange-500 text-left">
          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Renewal Pulse</p>
          <div className="text-2xl font-black text-orange-700">{stats.expiring} Expiring</div>
          <p className="text-[8px] font-bold uppercase text-muted-foreground mt-2">Next 30 Days</p>
        </Card>
        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6 text-left">
          <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">Annual Value</p>
          <div className="text-2xl font-black text-white">{currencySymbol}{stats.mtdRev.toLocaleString()}</div>
          <Badge variant="outline" className="mt-2 bg-white/10 text-accent border-none text-[8px] font-black h-4 uppercase">Contractual Node</Badge>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border text-left">
        <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-full md:w-44 rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-primary text-left">
                <SelectValue placeholder="All Contracts" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-2xl">
                <SelectItem value="all" className="text-[10px] font-bold uppercase">Full Registry</SelectItem>
                {Object.keys(AMC_STATUS_CONFIG).map(s => <SelectItem key={s} value={s} className="text-[10px] font-bold uppercase">{AMC_STATUS_CONFIG[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input 
              placeholder="Search customer, number..." 
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
                <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Contract Node</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Client Identity</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Status</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Period Window</TableHead>
                <TableHead className="text-right pr-8 h-12 w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAmcLoading ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary opacity-20" /></TableCell></TableRow>
              ) : filteredContracts.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center opacity-30 italic text-sm">No maintenance contracts found.</TableCell></TableRow>
              ) : (
                filteredContracts.map((c: any) => {
                  const info = AMC_STATUS_CONFIG[c.status] || AMC_STATUS_CONFIG['ACTIVE'];
                  return (
                    <TableRow key={c.id} className="group hover:bg-muted/5 transition-colors border-b cursor-pointer text-left" onClick={() => router.push(`/solar/amc/${c.id}`)}>
                      <TableCell className="pl-8 py-5 text-left">
                        <div className="flex items-center gap-4 text-left">
                          <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center font-black text-orange-600 text-xs shadow-inner uppercase shrink-0">A</div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{c.contractNumber}</p>
                            <p className="text-[9px] font-bold text-primary uppercase tracking-widest mt-1">{c.planName || 'Standard Node'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                         <p className="text-xs font-bold text-slate-700">{c.customerName}</p>
                         <p className="text-[8px] font-black uppercase opacity-40">Value: {currencySymbol}{parseFloat(c.amount || 0).toLocaleString()}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[8px] font-black uppercase h-5 px-3 border-none shadow-sm", info.bg, info.color)}>{info.label}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                         <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-slate-900 uppercase">{format(parseISO(c.endDate), 'dd MMM yyyy')}</span>
                            <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">Expiry Cap</span>
                         </div>
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
