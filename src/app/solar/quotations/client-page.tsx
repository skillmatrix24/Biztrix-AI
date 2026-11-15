
"use client";

import { useState, useMemo } from "react";
import { 
  FileSpreadsheet, 
  Search, 
  Plus, 
  ArrowRight, 
  History, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  Clock, 
  RefreshCcw, 
  Loader2,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  SmartphoneNfc,
  Info,
  ArrowLeft,
  Settings2
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
import { cn, getCurrencySymbol } from "@/lib/utils";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, doc, where } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const STATUS_CONFIG: any = {
  'draft': { label: 'Draft', color: 'text-slate-500', bg: 'bg-slate-100' },
  'sent': { label: 'Active Quote', color: 'text-blue-600', bg: 'bg-blue-50' },
  'converted': { label: 'Accepted', color: 'text-green-600', bg: 'bg-green-50' },
  'rejected': { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-50' },
  'expired': { label: 'Expired', color: 'text-red-600', bg: 'bg-red-50' },
};

export default function SolarQuotationRegistryPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  // Fetch only Solar Quotations
  const quotesQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'quotations'), where('solarSystemDesignId', '>', ''), orderBy('solarSystemDesignId'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: quotations = [], isLoading: isQuotesLoading } = useCollection<any>(quotesQuery);

  const [searchTerm, setSearchTerm] = useState("");

  const filteredQuotes = useMemo(() => {
    return (quotations || []).filter((q: any) => 
      q.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.quotationId?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [quotations, searchTerm]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const stats = useMemo(() => {
    const list = quotations || [];
    const active = list.filter(q => q.status === 'sent').length;
    const accepted = list.filter(q => q.status === 'converted').length;
    const pipelineWorth = list
      .filter(q => q.status !== 'converted')
      .reduce((sum, q) => sum + (q.totals?.finalPayout || 0), 0);
    
    return { active, accepted, pipelineWorth };
  }, [quotations]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!businessId) return;
    deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'quotations', id));
    toast({ title: "Quotation Removed", variant: "destructive" });
  };

  if (isProfileLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20 text-left px-2 sm:px-0">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 shadow-inner">
            <FileSpreadsheet className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 leading-none uppercase">Proposal Hub</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Solar Commercial Registry</p>
          </div>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
          <Link href="/solar/designs"><Plus className="mr-2 h-4 w-4" /> New Proposal</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border border-border/50">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Active Offers</p>
          <div className="text-2xl font-black text-slate-900">{stats.active} Pending</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-green-500 border-border/50">
          <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Accepted Hub</p>
          <div className="text-2xl font-black text-green-700">{stats.accepted} Success</div>
        </Card>
        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6">
          <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">Pipeline Volume</p>
          <div className="text-2xl font-black text-white">{currencySymbol}{stats.pipelineWorth.toLocaleString()}</div>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2.5rem] border">
        <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input placeholder="Search customer or quote ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 pl-10 rounded-xl bg-white border-none shadow-inner text-xs font-bold w-full" />
          </div>
          <Badge variant="outline" className="text-[8px] font-black h-6 border-primary/20 text-primary uppercase">{(quotations || []).length} Proposals Logged</Badge>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-muted/10">
                <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Quotation ID</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Customer Identity</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Design Link</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase h-12">Final Value</TableHead>
                <TableHead className="text-right pr-8 h-12 w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isQuotesLoading ? (
                <TableRow><TableCell colSpan={6} className="h-60 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary opacity-20" /></TableCell></TableRow>
              ) : filteredQuotes.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-40 text-center opacity-30 italic text-sm uppercase">No solar proposals in registry.</TableCell></TableRow>
              ) : (
                filteredQuotes.map((q) => {
                  const s = STATUS_CONFIG[q.status || 'draft'];
                  return (
                    <TableRow key={q.id} className="group hover:bg-muted/5 transition-colors border-b cursor-pointer" onClick={() => router.push(`/solar/quotations/${q.id}`)}>
                      <TableCell className="pl-8 py-5">
                         <div className="flex items-center gap-4 text-left">
                            <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center font-black text-indigo-600 text-xs shadow-inner shrink-0">Q</div>
                            <div className="min-w-0 text-left">
                               <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{q.quotationId}</p>
                               <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">{q.createdAt?.toDate ? format(q.createdAt.toDate(), 'dd MMM yyyy') : 'Recently'}</p>
                            </div>
                         </div>
                      </TableCell>
                      <TableCell>
                         <p className="text-xs font-bold text-slate-700">{q.customerName}</p>
                         <p className="text-[8px] font-black uppercase opacity-40">Client ID: {q.customerId.slice(-6).toUpperCase()}</p>
                      </TableCell>
                      <TableCell className="text-center">
                         <Badge className={cn("text-[8px] font-black uppercase h-5 px-3 border-none shadow-sm", s.bg, s.color)}>{s.label}</Badge>
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-1.5">
                            <Settings2 className="h-3 w-3 text-primary opacity-40" />
                            <span className="text-[10px] font-bold text-primary uppercase">Blueprint Locked</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-sm text-primary">
                        {currencySymbol}{q.totals?.finalPayout?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                         <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-primary"><ChevronRight className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive" onClick={(e) => handleDelete(q.id, e)}><Trash2 className="h-4 w-4" /></Button>
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
