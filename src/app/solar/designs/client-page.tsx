
"use client";

import { useState, useMemo } from "react";
import { 
  Settings2, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Filter,
  Loader2,
  Activity,
  Zap,
  ArrowLeft,
  LayoutList,
  FileSpreadsheet,
  Settings2 as EngineeringIcon
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
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

const DESIGN_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'DRAFT': { label: 'Draft Node', color: 'text-slate-500', bg: 'bg-slate-50' },
  'IN_REVIEW': { label: 'Technical Review', color: 'text-orange-600', bg: 'bg-orange-50' },
  'APPROVED': { label: 'Approved Design', color: 'text-green-600', bg: 'bg-green-50' },
  'REVISION_REQUIRED': { label: 'Revision Needed', color: 'text-red-600', bg: 'bg-red-50' },
};

export default function SolarDesignsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const designsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarSystemDesigns'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: designsData, isLoading: isDesignsLoading } = useCollection<any>(designsQuery);
  const designs = designsData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredDesigns = useMemo(() => {
    return (designs || []).filter(d => {
      const matchesSearch = d.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           d.id?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [designs, searchTerm, statusFilter]);

  if (isProfileLoading) return <div className="flex items-center justify-center py-20 opacity-40"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20 text-left">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20 shadow-inner">
            <EngineeringIcon className="h-7 w-7 text-orange-600" />
          </div>
          <div className="text-left">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Engineering Registry</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">System Design Manifests</p>
          </div>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
          <Link href="/solar/surveys"><Plus className="mr-2 h-4 w-4" /> Design from Survey</Link>
        </Button>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
        <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-full md:w-44 rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-primary">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-[10px] font-bold uppercase">All Designs</SelectItem>
                {Object.keys(DESIGN_STATUS_CONFIG).map(s => <SelectItem key={s} value={s} className="text-[10px] font-bold uppercase">{DESIGN_STATUS_CONFIG[s].label}</SelectItem>)}
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
                <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Design Node</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">System Capacity</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Last Update</TableHead>
                <TableHead className="text-right pr-8 h-12 w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isDesignsLoading ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary opacity-20" /></TableCell></TableRow>
              ) : filteredDesigns.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center opacity-30 italic text-sm">No technical designs found.</TableCell></TableRow>
              ) : (
                filteredDesigns.map((d: any) => {
                  const s = DESIGN_STATUS_CONFIG[d.status] || DESIGN_STATUS_CONFIG['DRAFT'];
                  return (
                    <TableRow key={d.id} className="group hover:bg-muted/5 transition-colors border-b cursor-pointer" onClick={() => router.push(`/solar/designs/${d.id}`)}>
                      <TableCell className="pl-8 py-5 text-left">
                        <div className="flex items-center gap-4 text-left">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-xs shadow-inner uppercase shrink-0">D</div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{d.customerName}</p>
                            <p className="text-[9px] font-mono text-primary/60 uppercase tracking-widest mt-1">ID: {d.id.slice(-8).toUpperCase()}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-black text-slate-900">{d.capacityKw} kW Node</span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 mt-0.5">{d.systemType}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[8px] font-black uppercase h-5 px-2 border-none shadow-sm", s.bg, s.color)}>{s.label}</Badge>
                      </TableCell>
                      <TableCell>
                         <span className="text-[10px] font-bold text-slate-500 uppercase">{d.updatedAt?.toDate ? format(d.updatedAt.toDate(), 'dd MMM, HH:mm') : 'Recently'}</span>
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
