"use client";

import { useState, useMemo } from "react";
import {
  Handshake,
  Search,
  ChevronRight,
  Loader2,
  Clock,
  BadgeCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PageHeader,
  KpiStatCard,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, doc, query, orderBy } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";

const COMMISSION_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  CALCULATED: {
    label: "Calculated",
    className: "bg-sky-50 text-sky-700 border-sky-200",
  },
  PENDING_APPROVAL: {
    label: "Awaiting Approval",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  PAYABLE: {
    label: "Marked Payable",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  PAID: {
    label: "Settled",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

export default function SolarCommissionsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const commissionsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "solarDealerCommissions"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: commissionsData, isLoading: isCommissionsLoading } =
    useCollection<any>(commissionsQuery);
  const commissions = commissionsData || [];

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredCommissions = useMemo(() => {
    const sLower = searchTerm.trim().toLowerCase();
    return (commissions || []).filter((c: any) => {
      const matchesSearch =
        !sLower ||
        c.dealerName?.toLowerCase().includes(sLower) ||
        c.customerName?.toLowerCase().includes(sLower);
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [commissions, searchTerm, statusFilter]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const stats = useMemo(() => {
    const list = commissions || [];
    const pending = list.filter((c) => c.status !== "PAID" && c.status !== "REJECTED").length;
    const totalDues = list
      .filter((c) => c.status !== "PAID" && c.status !== "REJECTED")
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    const settledCount = list.filter((c) => c.status === "PAID").length;
    return { pending, totalDues, settledCount };
  }, [commissions]);

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
        breadcrumb="Solar EPC • Partners"
        title="Commission Registry"
        description="Approve dealer commissions and settle partner payouts against project proposals."
        icon={Handshake}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiStatCard
          label="Awaiting Settlement"
          value={`${stats.pending} Records`}
          subtext="Pending approval or payout"
          icon={Clock}
        />
        <KpiStatCard
          label="Total Outstanding Payout"
          value={`${currencySymbol}${stats.totalDues.toLocaleString()}`}
          subtext="Open partner commission liability"
          icon={Wallet}
          tone="warning"
        />
        <KpiStatCard
          label="Settled Records"
          value={`${stats.settledCount} Paid`}
          subtext="Posted to cashbook ledger"
          icon={BadgeCheck}
          tone="dark"
        />
      </div>

      <SectionCard
        title="Partner Commission Ledger"
        description="Search by dealer or customer name, or filter by settlement status."
        headerRight={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                aria-label="Filter commissions by status"
                className="h-10 w-full sm:w-44 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium"
              >
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all">All Records</SelectItem>
                {Object.keys(COMMISSION_STATUS_CONFIG).map((s) => (
                  <SelectItem key={s} value={s}>
                    {COMMISSION_STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                aria-label="Search commissions by dealer or customer"
                placeholder="Search dealer or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 pl-9 rounded-xl bg-slate-50 border-slate-200 text-sm"
              />
            </div>
          </div>
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <Table className="min-w-[880px]">
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">
                  Dealer / Partner
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">
                  Related Customer
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Status
                </TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-600 h-11">
                  Commission Amount
                </TableHead>
                <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-20">
                  Open
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isCommissionsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-44 text-center">
                    <Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : filteredCommissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-6">
                    <EmptyStatePanel
                      icon={Handshake}
                      title="No commission records found"
                      description="Dealer commissions created from solar proposals will appear here."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredCommissions.map((c: any) => {
                  const s =
                    COMMISSION_STATUS_CONFIG[c.status] ||
                    COMMISSION_STATUS_CONFIG.CALCULATED;
                  return (
                    <TableRow
                      key={c.id}
                      className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0"
                    >
                      <TableCell className="pl-6 py-4">
                        <Link
                          href={`/solar/commissions/${c.id}`}
                          className="flex items-center gap-3 text-left group"
                        >
                          <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-semibold text-slate-700 text-xs shrink-0">
                            D
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 group-hover:underline truncate">
                              {c.dealerName}
                            </p>
                            <p className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                              Ref: {c.solarQuotationId}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-slate-900">
                          {c.customerName}
                        </p>
                        <p className="text-xs font-mono tabular-nums text-slate-500">
                          {c.createdAt?.toDate
                            ? format(c.createdAt.toDate(), "dd MMM yyyy")
                            : "Recently"}
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
                      <TableCell className="text-right font-semibold font-mono tabular-nums text-sm text-slate-900">
                        {currencySymbol}
                        {parseFloat(c.amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          asChild
                          variant="outline"
                          size="icon"
                          aria-label={`Open commission for ${c.dealerName}`}
                          className="h-8 w-8 rounded-lg border-slate-200 text-slate-700"
                        >
                          <Link href={`/solar/commissions/${c.id}`}>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
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
