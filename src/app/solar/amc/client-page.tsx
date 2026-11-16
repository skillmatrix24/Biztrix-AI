"use client";

import { useState, useMemo } from "react";
import {
  ShieldAlert,
  Plus,
  Search,
  ChevronRight,
  Loader2,
  ShieldCheck,
  Clock,
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
import { format, differenceInDays, parseISO } from "date-fns";

const AMC_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Active Coverage",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  EXPIRING: {
    label: "Expiring Soon",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  EXPIRED: {
    label: "Expired",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  RENEWAL_PENDING: {
    label: "Pending Renewal",
    className: "bg-sky-50 text-sky-700 border-sky-200",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export default function SolarAmcRegistryPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const amcQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "solarAmcContracts"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: contractsData, isLoading: isAmcLoading } =
    useCollection<any>(amcQuery);
  const contracts = contractsData || [];

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredContracts = useMemo(() => {
    const sLower = searchTerm.trim().toLowerCase();
    return (contracts || []).filter((c: any) => {
      const matchesSearch =
        !sLower ||
        c.customerName?.toLowerCase().includes(sLower) ||
        c.contractNumber?.toLowerCase().includes(sLower);
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchTerm, statusFilter]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const stats = useMemo(() => {
    const list = contracts || [];
    const active = list.filter((c) => c.status === "ACTIVE").length;
    const expiring = list.filter((c) => {
      if (c.status !== "ACTIVE" || !c.endDate) return false;
      const diff = differenceInDays(parseISO(c.endDate), new Date());
      return diff >= 0 && diff < 30;
    }).length;
    const annualValue = list
      .filter((c) => c.status === "ACTIVE")
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    return { active, expiring, annualValue };
  }, [contracts]);

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
        breadcrumb="Solar EPC • Maintenance"
        title="AMC Contracts"
        description="Manage annual maintenance agreements, inspection visits, and upcoming renewals."
        icon={ShieldAlert}
        actions={
          <Button asChild className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold">
            <Link href="/solar/amc/new">
              <Plus className="mr-2 h-4 w-4" /> New Contract
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiStatCard
          label="Active Contracts"
          value={`${stats.active} Active`}
          subtext="Ongoing maintenance agreements"
          icon={ShieldCheck}
          tone="positive"
        />
        <KpiStatCard
          label="Upcoming Renewals"
          value={`${stats.expiring} Expiring`}
          subtext="Within the next 30 days"
          icon={Clock}
          tone="warning"
        />
        <KpiStatCard
          label="Annual Contract Value"
          value={`${currencySymbol}${stats.annualValue.toLocaleString()}`}
          subtext="Recurring AMC portfolio value"
          icon={Wallet}
          tone="dark"
        />
      </div>

      <SectionCard
        title="Maintenance Contracts"
        description="Search by customer or contract reference number."
        headerRight={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                aria-label="Filter AMC contracts by status"
                className="h-10 w-full sm:w-44 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium"
              >
                <SelectValue placeholder="All Contracts" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all">Full Registry</SelectItem>
                {Object.keys(AMC_STATUS_CONFIG).map((s) => (
                  <SelectItem key={s} value={s}>
                    {AMC_STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                aria-label="Search AMC contracts by customer or number"
                placeholder="Search customer or contract..."
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
                  Contract
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">
                  Customer & Value
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Status
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  End Date
                </TableHead>
                <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-20">
                  Open
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAmcLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-44 text-center">
                    <Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : filteredContracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-6">
                    <EmptyStatePanel
                      icon={ShieldAlert}
                      title="No AMC contracts found"
                      description="Create an annual maintenance contract for a handed-over solar installation."
                      action={
                        <Button asChild variant="outline" className="rounded-xl border-slate-200">
                          <Link href="/solar/amc/new">Create AMC Contract</Link>
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredContracts.map((c: any) => {
                  const info =
                    AMC_STATUS_CONFIG[c.status] || AMC_STATUS_CONFIG.ACTIVE;
                  return (
                    <TableRow
                      key={c.id}
                      className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0"
                    >
                      <TableCell className="pl-6 py-4">
                        <Link
                          href={`/solar/amc/${c.id}`}
                          className="flex items-center gap-3 text-left group"
                        >
                          <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-semibold text-slate-700 text-xs shrink-0">
                            A
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold font-mono tabular-nums text-slate-900 group-hover:underline truncate">
                              {c.contractNumber}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {c.planName || "Standard Plan"}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-slate-900">
                          {c.customerName}
                        </p>
                        <p className="text-xs font-mono tabular-nums text-slate-500">
                          {currencySymbol}
                          {parseFloat(c.amount || 0).toLocaleString()} / yr
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn("text-xs font-medium h-6 px-2.5", info.className)}
                        >
                          {info.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums text-xs text-slate-700">
                        {c.endDate ? format(parseISO(c.endDate), "dd MMM yyyy") : "--"}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          asChild
                          variant="outline"
                          size="icon"
                          aria-label={`Open contract ${c.contractNumber}`}
                          className="h-8 w-8 rounded-lg border-slate-200 text-slate-700"
                        >
                          <Link href={`/solar/amc/${c.id}`}>
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
