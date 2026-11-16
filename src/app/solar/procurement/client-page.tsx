"use client";

import { useState, useMemo } from "react";
import {
  ShoppingBasket,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Package,
  Zap,
  Tag,
  BadgeCheck,
  XCircle,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  PageHeader,
  KpiStatCard,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";

const REQ_STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: any }
> = {
  DRAFT: {
    label: "Draft",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    className: "bg-sky-50 text-sky-700 border-sky-200",
    icon: CheckCircle2,
  },
  ORDERED: {
    label: "Ordered",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Zap,
  },
  PARTIALLY_RECEIVED: {
    label: "Partial Receipt",
    className: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Package,
  },
  RECEIVED: {
    label: "Fulfilled",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: BadgeCheck,
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-rose-50 text-rose-700 border-rose-200",
    icon: XCircle,
  },
};

export default function SolarProcurementPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const requisitionsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "solarPurchaseRequisitions"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: requisitionsData, isLoading: isReqLoading } =
    useCollection<any>(requisitionsQuery);
  const requisitions = requisitionsData || [];

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredReqs = useMemo(() => {
    const sLower = searchTerm.trim().toLowerCase();
    return (requisitions || [])
      .filter(
        (r: any) =>
          !sLower ||
          r.customerName?.toLowerCase().includes(sLower) ||
          r.vendorName?.toLowerCase().includes(sLower) ||
          r.id.toLowerCase().includes(sLower)
      )
      .filter((r: any) => statusFilter === "all" || r.status === statusFilter);
  }, [requisitions, searchTerm, statusFilter]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const stats = useMemo(() => {
    const list = requisitions || [];
    const pending = list.filter(
      (r) =>
        r.status === "APPROVED" ||
        r.status === "ORDERED" ||
        r.status === "PARTIALLY_RECEIVED"
    ).length;
    const fulfilled = list.filter((r) => r.status === "RECEIVED").length;
    const totalCommitted = list
      .filter((r) => r.status !== "CANCELLED" && r.status !== "DRAFT")
      .reduce((sum, r) => sum + (parseFloat(r.totalEstimatedCost) || 0), 0);

    return { pending, fulfilled, totalCommitted };
  }, [requisitions]);

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
        breadcrumb="Solar EPC • Supply Chain"
        title="Procurement Hub"
        description="Plan installation material shortages, vendor purchase orders, and stock receipts."
        icon={ShoppingBasket}
        actions={
          <Button asChild className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold">
            <Link href="/solar/procurement/new">
              <Plus className="mr-2 h-4 w-4" /> New Requisition
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiStatCard
          label="Active Pipeline"
          value={`${stats.pending} Pending`}
          subtext="Approved or ordered requisitions"
          icon={Clock}
        />
        <KpiStatCard
          label="Fulfilled Orders"
          value={`${stats.fulfilled} Received`}
          subtext="Synced to inventory stock"
          icon={BadgeCheck}
          tone="positive"
        />
        <KpiStatCard
          label="Committed Spend"
          value={`${currencySymbol}${stats.totalCommitted.toLocaleString()}`}
          subtext="Non-draft procurement value"
          icon={Wallet}
          tone="dark"
        />
      </div>

      <SectionCard
        title="Purchase Requisitions"
        description="Track requisition approvals and supplier fulfillment."
        headerRight={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                aria-label="Filter requisitions by status"
                className="h-10 w-full sm:w-44 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium"
              >
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all">Full Lifecycle</SelectItem>
                {Object.keys(REQ_STATUS_CONFIG).map((s) => (
                  <SelectItem key={s} value={s}>
                    {REQ_STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                aria-label="Search requisitions by vendor or client"
                placeholder="Search vendor or client..."
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
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">
                  Requisition ID
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">
                  Target Project
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">
                  Supplier
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Status
                </TableHead>
                <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-20">
                  Open
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isReqLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-44 text-center">
                    <Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : filteredReqs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-6">
                    <EmptyStatePanel
                      icon={ShoppingBasket}
                      title="No purchase requisitions found"
                      description="Create a requisition from an installation BOM to order missing solar components."
                      action={
                        <Button asChild variant="outline" className="rounded-xl border-slate-200">
                          <Link href="/solar/procurement/new">Create Requisition</Link>
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredReqs.map((req: any) => {
                  const s = REQ_STATUS_CONFIG[req.status] || REQ_STATUS_CONFIG.DRAFT;
                  const StatusIcon = s.icon;
                  return (
                    <TableRow
                      key={req.id}
                      className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0"
                    >
                      <TableCell className="pl-6 py-4">
                        <Link
                          href={`/solar/procurement/${req.id}`}
                          className="flex items-center gap-3 text-left group"
                        >
                          <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-semibold text-slate-700 text-xs shrink-0">
                            R
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold font-mono tabular-nums text-slate-900 group-hover:underline truncate">
                              REQ-{req.id.slice(-8).toUpperCase()}
                            </p>
                            <p className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                              {req.createdAt?.toDate
                                ? format(req.createdAt.toDate(), "dd MMM yyyy")
                                : "Recently"}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-slate-900">{req.customerName}</p>
                        <p className="text-xs font-mono tabular-nums text-slate-500">
                          Est. Cost: {currencySymbol}
                          {parseFloat(req.totalEstimatedCost || 0).toLocaleString()}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Tag className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-xs font-medium">
                            {req.vendorName || "Unassigned"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn("text-xs font-medium h-6 px-2.5 gap-1.5", s.className)}
                        >
                          <StatusIcon className="h-3 w-3" /> {s.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          asChild
                          variant="outline"
                          size="icon"
                          aria-label={`Open requisition ${req.id}`}
                          className="h-8 w-8 rounded-lg border-slate-200 text-slate-700"
                        >
                          <Link href={`/solar/procurement/${req.id}`}>
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
