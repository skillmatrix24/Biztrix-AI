
"use client";

import { useState, useMemo } from "react";
import { 
  FileSpreadsheet, 
  Search, 
  Plus, 
  ArrowRight, 
  ArrowUpRight, 
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
  Info
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KpiStatCard, PageHeader, SectionCard } from "@/components/ui/editorial";
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
import { collection, query, orderBy, doc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useMarketplaceCatalog } from "@/hooks/use-marketplace-catalog";
import { evaluateCoreQuota, isCreatedInCurrentMonth } from "@/lib/marketplace-catalog";
import { CoreQuotaBanner } from "@/components/quota-upgrade-banner";

const STATUS_CONFIG: any = {
  'draft': { label: 'Draft', color: 'text-slate-600', bg: 'bg-slate-100' },
  'sent': { label: 'Sent', color: 'text-sky-700', bg: 'bg-sky-50' },
  'converted': { label: 'Converted', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  'expired': { label: 'Expired', color: 'text-rose-700', bg: 'bg-rose-50' },
};

export default function QuotationRegistryPage() {
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

  const { limits } = useMarketplaceCatalog();
  const quotesQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'quotations'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: quotations, isLoading: isQuotesLoading } = useCollection<any>(quotesQuery);

  const monthlyQuotesCount = useMemo(
    () => (quotations || []).filter((q: any) => isCreatedInCurrentMonth(q.createdAt)).length,
    [quotations]
  );

  const quoteQuota = useMemo(
    () => evaluateCoreQuota("quotations", monthlyQuotesCount, { limits, business }),
    [monthlyQuotesCount, limits, business]
  );

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
    const converted = list.filter(q => q.status === 'converted').length;
    const pipelineWorth = list
      .filter(q => q.status !== 'converted')
      .reduce((sum, q) => sum + (q.totals?.finalPayout || 0), 0);
    
    return { active, converted, pipelineWorth };
  }, [quotations]);

  const handleDelete = (id: string) => {
    if (!businessId) return;
    deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'quotations', id));
    toast({ title: "Quotation Removed", variant: "destructive" });
  };

  if (isProfileLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 pb-20 text-left">
      <CoreQuotaBanner quota={quoteQuota} />

      <PageHeader
        breadcrumb="Command Center / Quotations"
        title="Quotation Hub"
        description="Prepare sales offers and convert approved estimates directly into POS invoices."
        icon={FileSpreadsheet}
        actions={
          quoteQuota.isReached ? (
            <Button asChild className="bg-slate-900 hover:bg-slate-800 h-10 px-5 text-xs font-semibold rounded-xl text-white">
              <Link href={`/marketplace/features/${quoteQuota.menu.addonId}`}>Unlock Unlimited Quotes</Link>
            </Button>
          ) : (
            <Button asChild className="h-10 px-5 text-xs font-semibold rounded-xl">
              <Link href="/billing"><Plus className="mr-1.5 h-4 w-4" /> New Quote</Link>
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiStatCard label="Active Offers" value={`${stats.active} Pending`} icon={Clock} />
        <KpiStatCard label="Converted" value={`${stats.converted} Invoiced`} tone="positive" icon={CheckCircle2} />
        <KpiStatCard
          label="Pipeline Worth"
          value={`${currencySymbol}${stats.pipelineWorth.toLocaleString("en-IN")}`}
          tone="dark"
          icon={FileSpreadsheet}
        />
      </div>

      <SectionCard
        title="Quotation Registry"
        description={`${(quotations || []).length} total quotations recorded`}
        bodyClassName="p-0"
        headerRight={
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search customer or quote ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 rounded-xl bg-slate-50 border-slate-200 text-xs w-full"
            />
          </div>
        }
      >
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Quotation ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Estimated Value</TableHead>
                <TableHead className="text-right pr-6 w-48">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isQuotesLoading ? (
                <TableRow><TableCell colSpan={5} className="h-48 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary opacity-40" /></TableCell></TableRow>
              ) : filteredQuotes.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-36 text-center text-sm text-slate-500">No quotations in registry yet.</TableCell></TableRow>
              ) : (
                filteredQuotes.map((q) => {
                  const s = STATUS_CONFIG[q.status || 'draft'];
                  return (
                    <TableRow key={q.id}>
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">Q</div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate font-mono">{q.quotationId}</p>
                            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                              Created: {q.createdAt?.toDate ? format(q.createdAt.toDate(), 'dd MMM yyyy') : 'Recently'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-semibold text-slate-900">{q.customerName}</p>
                        <p className="text-xs text-slate-500 font-mono">ID · {q.customerId?.slice(-6) || '—'}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn("inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold", s.bg, s.color)}>
                          {s.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-bold text-sm text-slate-900">
                        {currencySymbol}{Number(q.totals?.finalPayout || 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs">
                            <Link href={`/billing?quoteId=${q.id}`}><RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Convert</Link>
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Delete quotation" className="h-8 w-8 rounded-lg text-slate-400 hover:text-destructive" onClick={() => handleDelete(q.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <div className="p-5 bg-white rounded-2xl border border-slate-200 flex items-start gap-3.5">
        <Info className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
        <div className="space-y-1 text-left">
          <p className="text-xs font-semibold text-slate-900">How Quotations Work</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            Quotations are non-accounting estimates. Inventory stock and Cashbook ledgers update only when a quote is converted into a finalized POS invoice.
          </p>
        </div>
      </div>
    </div>
  );
}
