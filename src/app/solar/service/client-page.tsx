
"use client";

import { useState, useMemo } from "react";
import { 
  Wrench, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Filter, 
  Loader2, 
  Activity, 
  User, 
  Calendar,
  SmartphoneNfc,
  ShieldAlert,
  Zap,
  ArrowLeft,
  LayoutList,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, addDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, doc, where, serverTimestamp } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

const SERVICE_STATUSES: Record<string, { label: string; color: string; bg: string }> = {
  'OPEN': { label: 'Raised', color: 'text-blue-600', bg: 'bg-blue-50' },
  'SCHEDULED': { label: 'Scheduled', color: 'text-purple-600', bg: 'bg-purple-50' },
  'IN_PROGRESS': { label: 'Field Fix', color: 'text-orange-600', bg: 'bg-orange-50' },
  'RESOLVED': { label: 'Resolved', color: 'text-green-600', bg: 'bg-green-50' },
  'CLOSED': { label: 'Closed Node', color: 'text-slate-500', bg: 'bg-slate-100' },
};

export default function SolarServiceRegistryPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const serviceQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarServiceRequests'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: serviceRequestsData, isLoading: isServiceLoading } = useCollection<any>(serviceQuery);
  const serviceRequests = serviceRequestsData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredRequests = useMemo(() => {
    return (serviceRequests || []).filter((s: any) => {
      const matchesSearch = s.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           s.id?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [serviceRequests, searchTerm, statusFilter]);

  if (isProfileLoading) return <div className="flex items-center justify-center py-20 opacity-40"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20 text-left px-2 sm:px-0">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 shadow-inner">
            <Wrench className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Service Desk</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Ticketing & Field Resolution Hub</p>
          </div>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
          <Link href="/solar/service/new"><Plus className="mr-2 h-4 w-4" /> Raise Ticket</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border border-border/50 text-left">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Open Tickets</p>
          <div className="text-2xl font-black text-slate-900">{serviceRequests.filter(s => s.status !== 'CLOSED' && s.status !== 'RESOLVED').length} Nodes</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-green-500 text-left">
          <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Success Resolution</p>
          <div className="text-2xl font-black text-green-700">{serviceRequests.filter(s => s.status === 'RESOLVED').length} Fixed</div>
        </Card>
        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6 text-left">
          <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">Average SLA</p>
          <div className="text-2xl font-black text-white">24h 12m</div>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
        <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-full md:w-44 rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-primary text-left">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-2xl">
                <SelectItem value="all">Full Lifecycle</SelectItem>
                {Object.keys(SERVICE_STATUSES).map(s => <SelectItem key={s} value={s}>{SERVICE_STATUSES[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input 
              placeholder="Search customer, ID..." 
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
                <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Ticket Node</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Service Category</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Status</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Technician</TableHead>
                <TableHead className="text-right pr-8 h-12 w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isServiceLoading ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary opacity-20" /></TableCell></TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center opacity-30 italic text-sm">No service tickets logged.</TableCell></TableRow>
              ) : (
                filteredRequests.map((s: any) => {
                  const info = SERVICE_STATUSES[s.status] || SERVICE_STATUSES['OPEN'];
                  return (
                    <TableRow key={s.id} className="group hover:bg-muted/5 transition-colors border-b cursor-pointer text-left" onClick={() => router.push(`/solar/service/${s.id}`)}>
                      <TableCell className="pl-8 py-5 text-left">
                        <div className="flex items-center gap-4 text-left">
                          <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-xs shadow-inner uppercase shrink-0">T</div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{s.customerName}</p>
                            <p className="text-[9px] font-mono text-primary/60 uppercase tracking-widest mt-1">ID: {s.id.slice(-8).toUpperCase()}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 border-primary/20 text-primary">{s.category?.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[8px] font-black uppercase h-5 px-3 border-none shadow-sm", info.bg, info.color)}>{info.label}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                           <div className="h-7 w-7 rounded-lg bg-primary/5 flex items-center justify-center text-primary text-[10px] font-black border">{(s.assignedName || 'U').charAt(0)}</div>
                           <span className="text-[10px] font-bold text-slate-600 uppercase truncate max-w-[80px]">{s.assignedName || 'Unassigned'}</span>
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
