"use client";

import { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Search,
  Plus,
  Trash2,
  ChevronRight,
  Settings2,
  Loader2,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageHeader,
  KpiStatCard,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import { cn, getCurrencySymbol } from "@/lib/utils";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
  deleteDocumentNonBlocking,
} from "@/firebase";
import { collection, query, orderBy, doc, where } from "firebase/firestore";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  sent: {
    label: "Active Quote",
    className: "bg-sky-50 text-sky-700 border-sky-200",
  },
  converted: {
    label: "Accepted",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  rejected: {
    label: "Rejected",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  expired: {
    label: "Expired",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

export default function SolarQuotationRegistryPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  // Fetch only Solar Quotations
  const quotesQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "quotations"),
            where("solarSystemDesignId", ">", ""),
            orderBy("solarSystemDesignId"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: quotations = [], isLoading: isQuotesLoading } = useCollection<any>(quotesQuery);

  const [searchTerm, setSearchTerm] = useState("");

  const filteredQuotes = useMemo(() => {
    const qLower = searchTerm.trim().toLowerCase();
    return (quotations || []).filter(
      (q: any) =>
        !qLower ||
        q.customerName?.toLowerCase().includes(qLower) ||
        q.quotationId?.toLowerCase().includes(qLower)
    );
  }, [quotations, searchTerm]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const stats = useMemo(() => {
    const list = quotations || [];
    const active = list.filter((q) => q.status === "sent").length;
    const accepted = list.filter((q) => q.status === "converted").length;
    const pipelineWorth = list
      .filter((q) => q.status !== "converted")
      .reduce((sum, q) => sum + (q.totals?.finalPayout || 0), 0);

    return { active, accepted, pipelineWorth };
  }, [quotations]);

  const handleDelete = (id: string) => {
    if (!businessId) return;
    deleteDocumentNonBlocking(doc(firestore, "businesses", businessId, "quotations", id));
    toast({ title: "Quotation removed", variant: "destructive" });
  };

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-slate-400 h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-left">
      <PageHeader
        breadcrumb="Solar EPC • Commercial"
        title="Proposal Registry"
        description="Track commercial solar proposals linked to approved system designs."
        icon={FileSpreadsheet}
        actions={
          <Button asChild className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold">
            <Link href="/solar/designs">
              <Plus className="mr-2 h-4 w-4" /> New Proposal
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiStatCard
          label="Active Offers"
          value={`${stats.active} Pending`}
          subtext="Proposals sent to clients"
          icon={Clock}
        />
        <KpiStatCard
          label="Accepted Proposals"
          value={`${stats.accepted} Accepted`}
          subtext="Ready for installation scheduling"
          icon={CheckCircle2}
          tone="positive"
        />
        <KpiStatCard
          label="Open Pipeline Value"
          value={`${currencySymbol}${stats.pipelineWorth.toLocaleString()}`}
          subtext="Unconverted quotation volume"
          icon={TrendingUp}
          tone="dark"
        />
      </div>

      <SectionCard
        title="Solar Proposals"
        description="Search by customer name or quotation reference."
        headerRight={
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                aria-label="Search proposals by customer or quotation ID"
                placeholder="Search customer or quote ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 pl-9 rounded-xl bg-slate-50 border-slate-200 text-sm"
              />
            </div>
            <Badge
              variant="outline"
              className="border-slate-200 bg-slate-50 text-slate-700 font-mono tabular-nums text-xs h-7 px-2.5"
            >
              {(quotations || []).length} Logged
            </Badge>
          </div>
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">
                  Quotation ID
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">
                  Customer
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Status
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">
                  Design Link
                </TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-600 h-11">
                  Final Value
                </TableHead>
                <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-32">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isQuotesLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : filteredQuotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-6">
                    <EmptyStatePanel
                      icon={FileSpreadsheet}
                      title="No solar proposals found"
                      description="Generate a commercial quotation from an approved system design to see it here."
                      action={
                        <Button asChild variant="outline" className="rounded-xl border-slate-200">
                          <Link href="/solar/designs">Browse System Designs</Link>
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuotes.map((q: any) => {
                  const s = STATUS_CONFIG[q.status || "draft"] || STATUS_CONFIG.draft;
                  return (
                    <TableRow
                      key={q.id}
                      className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0"
                    >
                      <TableCell className="pl-6 py-4">
                        <Link
                          href={`/solar/quotations/${q.id}`}
                          className="flex items-center gap-3 text-left group"
                        >
                          <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-semibold text-slate-700 text-xs shrink-0">
                            Q
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold font-mono tabular-nums text-slate-900 group-hover:underline truncate">
                              {q.quotationId}
                            </p>
                            <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                              {q.createdAt?.toDate
                                ? format(q.createdAt.toDate(), "dd MMM yyyy")
                                : "Recently"}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-slate-900">
                          {q.customerName}
                        </p>
                        <p className="text-xs text-slate-500 font-mono tabular-nums">
                          Client ID: {(q.customerId || "").slice(-6).toUpperCase() || "--"}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn("text-xs font-medium h-6 px-2.5", s.className)}
                        >
                          {s.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Settings2 className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-xs font-medium">Blueprint Linked</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold font-mono tabular-nums text-sm text-slate-900">
                        {currencySymbol}
                        {(q.totals?.finalPayout || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end items-center gap-1.5">
                          <Button
                            asChild
                            variant="outline"
                            size="icon"
                            aria-label={`Open proposal ${q.quotationId}`}
                            className="h-8 w-8 rounded-lg border-slate-200 text-slate-700"
                          >
                            <Link href={`/solar/quotations/${q.id}`}>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete proposal ${q.quotationId}`}
                            className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => handleDelete(q.id)}
                          >
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
    </div>
  );
}
