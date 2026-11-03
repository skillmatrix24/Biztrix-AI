
"use client";

import { useState, useMemo } from "react";
import { 
  Sun, 
  Search, 
  ChevronRight, 
  Filter, 
  Loader2, 
  SmartphoneNfc, 
  History, 
  BadgeCheck, 
  ArrowLeft,
  Settings2,
  Trash2,
  Zap,
  Globe,
  MapPin,
  Users,
  ShieldCheck,
  Building2,
  Target
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
import { collection, query, orderBy, doc, where } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

const PLANT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'ACTIVE': { label: 'Operational', color: 'text-green-600', bg: 'bg-green-50' },
  'SERVICE': { label: 'Maintenance', color: 'text-orange-600', bg: 'bg-orange-50' },
  'INACTIVE': { label: 'Offline', color: 'text-slate-500', bg: 'bg-slate-100' },
  'DECOMMISSIONED': { label: 'Decommissioned', color: 'text-red-600', bg: 'bg-red-50' },
};

export default function SolarPlantsRegistryPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const plantsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarPlants'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: plantsData, isLoading: isPlantsLoading } = useCollection<any>(plantsQuery);
  const plants = plantsData || [];

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredPlants = useMemo(() => {
    return plants.filter((p: any) => 
      p.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.plantReference?.toLowerCase().includes(searchTerm.toLowerCase())
    ).filter((p: any) => statusFilter === 'all' || p.status === statusFilter);
  }, [plants, searchTerm, statusFilter]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  if (isProfileLoading) return <div className="flex items-center justify-center py-20 opacity-40"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20 text-left px-2 sm:px-0">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
            <Globe className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Plant Asset Registry</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Authoritative Installed Base</p>
          </div>
        </div>
        <Button asChild variant="outline" className="h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl border-primary/20 text-primary bg-white shadow-sm">
          <Link href="/solar/installations"><History className="mr-2 h-4 w-4" /> Installation History</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border border-border/50 text-left">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Solar Plants</p>
          <div className="text-2xl font-black text-slate-900">{plants.length} Units</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-green-500 text-left">
          <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Active Generation</p>
          <div className="text-2xl font-black text-green-700">{plants.filter(p => p.status === 'ACTIVE').length} Operational</div>
        </Card>
        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6 text-left">
          <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">Monitoring Nodes</p>
          <div className="text-2xl font-black text-white">{plants.filter(p => p.monitoringStatus === 'READY').length} Connected</div>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
        <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-full md:w-44 rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-primary text-left">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-2xl">
                <SelectItem value="all" className="text-[10px] font-bold uppercase">Full Registry</SelectItem>
                {Object.keys(PLANT_STATUS_CONFIG).map(s => <SelectItem key={s} value={s} className="text-[10px] font-bold uppercase">{PLANT_STATUS_CONFIG[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input 
              placeholder="Search customer, reference..." 
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
                <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Asset Node</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">System Spec</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Status</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Monitoring</TableHead>
                <TableHead className="text-right pr-8 h-12 w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPlantsLoading ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary opacity-20" /></TableCell></TableRow>
              ) : filteredPlants.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center opacity-30 italic text-sm font-black uppercase tracking-widest">No solar plants found in registry.</TableCell></TableRow>
              ) : (
                filteredPlants.map((p: any) => {
                  const info = PLANT_STATUS_CONFIG[p.status] || PLANT_STATUS_CONFIG['ACTIVE'];
                  return (
                    <TableRow key={p.id} className="group hover:bg-muted/5 transition-colors border-b cursor-pointer text-left" onClick={() => router.push(`/solar/plants/${p.id}`)}>
                      <TableCell className="pl-8 py-5 text-left">
                        <div className="flex items-center gap-4 text-left">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-xs shadow-inner uppercase shrink-0">P</div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{p.customerName}</p>
                            <p className="text-[9px] font-mono text-primary/60 uppercase tracking-widest mt-1">{p.plantReference}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col text-left">
                            <span className="text-xs font-black text-slate-900">{p.installedCapacityKwp} kWp Node</span>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 mt-0.5">{p.systemType}</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[8px] font-black uppercase h-5 px-3 border-none shadow-sm", info.bg, info.color)}>{info.label}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                         <Badge variant="outline" className={cn("text-[7px] font-black uppercase h-4 border-dashed", p.monitoringStatus === 'READY' ? 'text-green-600 border-green-200' : 'text-slate-400 border-slate-200')}>
                            {p.monitoringStatus?.replace(/_/g, ' ') || 'NOT CONNECTED'}
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
