"use client";

import { useState, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  ChevronRight,
  Loader2,
  History,
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
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import Link from "next/link";

const WARRANTY_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Active Coverage",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  EXPIRING_SOON: {
    label: "Expiring Soon",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  EXPIRED: {
    label: "Expired",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  CLAIM_OPEN: {
    label: "Open Claim",
    className: "bg-sky-50 text-sky-700 border-sky-200",
  },
};

export default function SolarWarrantiesPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const warrantiesQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "solarWarranties"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: warrantiesData, isLoading: isWarrantiesLoading } =
    useCollection<any>(warrantiesQuery);
  const warranties = warrantiesData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredWarranties = useMemo(() => {
    const sLower = searchTerm.trim().toLowerCase();
    return (warranties || []).filter((w: any) => {
      const matchesSearch =
        !sLower ||
        w.customerName?.toLowerCase().includes(sLower) ||
        w.warrantyNumber?.toLowerCase().includes(sLower);
      const matchesStatus = statusFilter === "all" || w.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [warranties, searchTerm, statusFilter]);

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
        breadcrumb="Solar EPC • After-Sales"
        title="Warranty Ledger"
        description="Track active component coverage, expiry schedules, and warranty claims."
        icon={ShieldCheck}
        actions={
          <Button
            asChild
            variant="outline"
            className="h-10 rounded-xl border-slate-200 bg-white font-medium"
          >
            <Link href="/solar/installations">
              <History className="mr-2 h-4 w-4" /> Installations Registry
            </Link>
          </Button>
        }
      />

      <SectionCard
        title="Registered Warranties"
        description="Filter by coverage status or search by customer or warranty number."
        headerRight={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                aria-label="Filter warranties by status"
                className="h-10 w-full sm:w-48 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium"
              >
                <SelectValue placeholder="All Coverage" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all">All Warranties</SelectItem>
                {Object.keys(WARRANTY_STATUS_CONFIG).map((s) => (
                  <SelectItem key={s} value={s}>
                    {WARRANTY_STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                aria-label="Search warranties by customer or warranty number"
                placeholder="Search customer or warranty ID..."
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
                  Warranty Number
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">
                  Customer
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Status
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Coverage Expiry
                </TableHead>
                <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-20">
                  Open
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isWarrantiesLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-44 text-center">
                    <Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : filteredWarranties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-6">
                    <EmptyStatePanel
                      icon={ShieldCheck}
                      title="No warranties registered"
                      description="Activate a warranty from a handed-over installation to track coverage here."
                      action={
                        <Button asChild variant="outline" className="rounded-xl border-slate-200">
                          <Link href="/solar/installations">View Installations</Link>
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredWarranties.map((w: any) => {
                  const s =
                    WARRANTY_STATUS_CONFIG[w.status] ||
                    WARRANTY_STATUS_CONFIG.ACTIVE;
                  return (
                    <TableRow
                      key={w.id}
                      className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0"
                    >
                      <TableCell className="pl-6 py-4">
                        <Link
                          href={`/solar/warranties/${w.id}`}
                          className="flex items-center gap-3 text-left group"
                        >
                          <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-semibold text-slate-700 text-xs shrink-0">
                            W
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold font-mono tabular-nums text-slate-900 group-hover:underline truncate">
                              {w.warrantyNumber}
                            </p>
                            <p className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                              Site: {w.solarInstallationId?.slice(-6).toUpperCase() || "--"}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-slate-900">
                          {w.customerName}
                        </p>
                        <p className="text-xs text-slate-500">Customer portal active</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn("text-xs font-medium h-6 px-2.5", s.className)}
                        >
                          {s.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums text-xs font-medium text-slate-700">
                        {w.endDate || "--"}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          asChild
                          variant="outline"
                          size="icon"
                          aria-label={`Open warranty ${w.warrantyNumber}`}
                          className="h-8 w-8 rounded-lg border-slate-200 text-slate-700"
                        >
                          <Link href={`/solar/warranties/${w.id}`}>
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
