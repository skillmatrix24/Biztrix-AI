
"use client";

import { useState, useMemo } from "react";
import { 
  Briefcase, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  Filter, 
  Loader2, 
  Activity, 
  User, 
  ShieldCheck, 
  Calendar, 
  LayoutList, 
  Target, 
  ArrowRight, 
  BadgeCheck, 
  Zap, 
  Globe, 
  Users,
  Sparkles
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
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

const INSTALLATION_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  'READY_TO_SCHEDULE': { label: 'Ready', color: 'text-blue-500', bg: 'bg-blue-50', icon: Clock },
  'SCHEDULED': { label: 'Scheduled', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Calendar },
  'TEAM_ASSIGNED': { label: 'Team Ready', color: 'text-purple-600', bg: 'bg-purple-50', icon: Users },
  'MATERIAL_READY': { label: 'Inventory Staged', color: 'text-orange-600', bg: 'bg-orange-50', icon: Zap },
  'IN_PROGRESS': { label: 'Installing', color: 'text-orange-700', bg: 'bg-orange-100/50', icon: Activity },
  'QUALITY_CHECK': { label: 'QA Testing', color: 'text-pink-600', bg: 'bg-pink-50', icon: ShieldCheck },
  'COMMISSIONING': { label: 'Commissioning', color: 'text-cyan-600', bg: 'bg-cyan-50', icon: Sparkles },
  'HANDED_OVER': { label: 'Handed Over', color: 'text-green-600', bg: 'bg-green-50', icon: BadgeCheck },
  'ON_HOLD': { label: 'On Hold', color: 'text-slate-500', bg: 'bg-slate-100', icon: Clock },
};

export default function SolarInstallationsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const installationsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarInstallations'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: installationsData, isLoading: isInstallationsLoading } = useCollection<any>(installationsQuery);
  const installations = installationsData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredInstallations = useMemo(() => {
    return (installations || []).filter(i => {
      const matchesSearch = i.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           i.installationNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || i.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [installations, searchTerm, statusFilter]);

  if (isProfileLoading) return <div className="flex items-center justify-center py-20 opacity-40"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20 text-left px-2 sm:px-0">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20 shadow-inner">
            <Briefcase className="h-7 w-7 md:h-8 md:w-8 text-orange-600" />
          </div>
          <div className="text-left">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Execution Hub</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Field Operations Registry</p>
          </div>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
          <Link href="/solar/quotations"><Plus className="mr-2 h-4 w-4" /> Start from Proposal</Link>
        </Button>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
        <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-full md:w-44 rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-primary">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-2xl">
                <SelectItem value="all" className="text-[10px] font-bold uppercase">All Sites</SelectItem>
                {Object.keys(INSTALLATION_STATUS_CONFIG).map(s => <SelectItem key={s} value={s} className="text-[10px] font-bold uppercase">{INSTALLATION_STATUS_CONFIG[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input 
              placeholder="Search site or ID..." 
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
                <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Site Node</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Capacity</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Status</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Team Lead</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12 text-right pr-8">Schedule</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isInstallationsLoading ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary opacity-20" /></TableCell></TableRow>
              ) : filteredInstallations.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center opacity-30 italic text-sm font-black uppercase">No active installation nodes.</TableCell></TableRow>
              ) : (
                filteredInstallations.map((i: any) => {
                  const s = INSTALLATION_STATUS_CONFIG[i.status] || INSTALLATION_STATUS_CONFIG['READY_TO_SCHEDULE'];
                  const Icon = s.icon;
                  return (
                    <TableRow key={i.id} className="group hover:bg-muted/5 transition-colors border-b cursor-pointer text-left" onClick={() => router.push(`/solar/installations/${i.id}`)}>
                      <TableCell className="pl-8 py-5 text-left">
                        <div className="flex items-center gap-4 text-left">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-xs shadow-inner uppercase shrink-0">I</div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{i.customerName}</p>
                            <p className="text-[9px] font-mono text-primary/60 uppercase tracking-widest mt-1">REF: {i.installationNumber}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col text-left">
                            <span className="text-xs font-black text-slate-900">{i.capacityKw} kW Node</span>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 mt-0.5">{i.systemType}</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[8px] font-black uppercase h-5 px-3 border-none shadow-sm gap-1.5", s.bg, s.color)}>
                           <Icon className="h-3 w-3" /> {s.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                           <div className="h-7 w-7 rounded-lg bg-primary/5 flex items-center justify-center text-primary text-[10px] font-black border">{(i.assignedTeamNames?.[0] || 'U').charAt(0)}</div>
                           <span className="text-[10px] font-bold text-slate-600 uppercase truncate max-w-[80px]">{i.assignedTeamNames?.[0] || 'Unassigned'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                         <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-900">{i.scheduledStartDate ? format(new Date(i.scheduledStartDate), 'dd MMM yyyy') : '--'}</span>
                            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">Est. Completion</span>
                         </div>
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
