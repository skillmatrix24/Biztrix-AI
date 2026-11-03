
"use client";

import { useState, useMemo } from "react";
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  Filter, 
  Loader2, 
  History, 
  ArrowLeft,
  SmartphoneNfc,
  BadgeCheck,
  Calendar,
  Globe,
  Tag,
  Briefcase,
  Layers,
  Info,
  Smartphone,
  Check
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

const WARRANTY_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'ACTIVE': { label: 'Active Coverage', color: 'text-green-600', bg: 'bg-green-50' },
  'EXPIRING_SOON': { label: 'Expiring Soon', color: 'text-orange-600', bg: 'bg-orange-50' },
  'EXPIRED': { label: 'Expired Node', color: 'text-red-600', bg: 'bg-red-50' },
  'CLAIM_OPEN': { label: 'Open Claim', color: 'text-blue-600', bg: 'bg-blue-50' },
};

export default function SolarWarrantiesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const warrantiesQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarWarranties'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: warrantiesData, isLoading: isWarrantiesLoading } = useCollection<any>(warrantiesQuery);
  const warranties = warrantiesData || [];

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);
  const currencySymbol = getCurrencySymbol(business?.currency);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredWarranties = useMemo(() => {
    return (warranties || []).filter((w: any) => 
      w.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.warrantyNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [warranties, searchTerm]);

  if (isProfileLoading) return <div className="flex items-center justify-center py-20 opacity-40"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20 text-left px-2 sm:px-0">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-14 w-14 rounded-2xl bg-green-50 flex items-center justify-center shrink-0 border border-green-100 shadow-inner">
            <ShieldCheck className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Warranty Ledger</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Post-Installation Support Registry</p>
          </div>
        </div>
        <Button asChild variant="outline" className="h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl border-primary/20 text-primary bg-white shadow-sm hover:bg-primary/5">
          <Link href="/solar/installations"><History className="mr-2 h-4 w-4" /> Installation Hub</Link>
        </Button>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
        <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="flex items-center gap-3 w-full md:w-auto">
             <Select value={statusFilter} onValueChange={setStatusFilter}>
               <SelectTrigger className="h-11 w-full md:w-48 rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-primary text-left">
                 <Filter className="h-3.5 w-3.5 mr-2 opacity-40" />
                 <SelectValue placeholder="All Coverage" />
               </SelectTrigger>
               <SelectContent className="rounded-xl border-none shadow-2xl">
                 <SelectItem value="all" className="text-[10px] font-bold uppercase">All Nodes</SelectItem>
                 {Object.keys(WARRANTY_STATUS_CONFIG).map(s => <SelectItem key={s} value={s} className="text-[10px] font-bold uppercase">{WARRANTY_STATUS_CONFIG[s].label}</SelectItem>)}
               </SelectContent>
             </Select>
           </div>
           <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input placeholder="Search customer or warranty ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 pl-10 rounded-xl bg-white border-none shadow-inner text-xs font-bold w-full" />
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-muted/10 border-b">
                <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Warranty Node</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Client Identity</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Status</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Expiry Node</TableHead>
                <TableHead className="text-right pr-8 h-12 w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isWarrantiesLoading ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary opacity-20" /></TableCell></TableRow>
              ) : filteredWarranties.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center opacity-30 italic text-sm">No warranties in registry.</TableCell></TableRow>
              ) : (
                filteredWarranties.map((w: any) => {
                  const s = WARRANTY_STATUS_CONFIG[w.status] || WARRANTY_STATUS_CONFIG['ACTIVE'];
                  return (
                    <TableRow key={w.id} className="group hover:bg-muted/5 transition-colors border-b cursor-pointer text-left" onClick={() => router.push(`/solar/warranties/${w.id}`)}>
                      <TableCell className="pl-8 py-5 text-left">
                        <div className="flex items-center gap-4 text-left">
                          <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center font-black text-green-600 text-xs shadow-inner uppercase shrink-0">W</div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{w.warrantyNumber}</p>
                            <p className="text-[9px] font-mono text-primary/60 uppercase tracking-widest mt-1">Ref: {w.solarInstallationId?.slice(-6).toUpperCase()}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                         <p className="text-xs font-bold text-slate-700">{w.customerName}</p>
                         <p className="text-[8px] font-black uppercase opacity-40">Portal Access Active</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[8px] font-black uppercase h-5 px-3 border-none shadow-sm", s.bg, s.color)}>{s.label}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                         <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-slate-900 uppercase">{w.endDate}</span>
                            <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">Validity Cap</span>
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
