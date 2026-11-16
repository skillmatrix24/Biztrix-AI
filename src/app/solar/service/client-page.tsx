"use client";

import { useState, useMemo } from "react";
import {
  Wrench,
  Plus,
  Search,
  ChevronRight,
  Loader2,
  Clock,
  CheckCircle2,
  Ticket,
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
import { collection, query, orderBy, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import Link from "next/link";

const SERVICE_STATUSES: Record<string, { label: string; className: string }> = {
  OPEN: { label: "Raised", className: "bg-sky-50 text-sky-700 border-sky-200" },
  TRIAGED: { label: "Triaged", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  SCHEDULED: {
    label: "Scheduled",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  RESOLVED: {
    label: "Resolved",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  CLOSED: {
    label: "Closed",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export default function SolarServiceRegistryPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const serviceQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "solarServiceRequests"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: serviceRequestsData, isLoading: isServiceLoading } =
    useCollection<any>(serviceQuery);
  const serviceRequests = serviceRequestsData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredRequests = useMemo(() => {
    const sLower = searchTerm.trim().toLowerCase();
    return (serviceRequests || []).filter((s: any) => {
      const matchesSearch =
        !sLower ||
        s.customerName?.toLowerCase().includes(sLower) ||
        s.id?.toLowerCase().includes(sLower);
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [serviceRequests, searchTerm, statusFilter]);

  const openCount = useMemo(
    () =>
      serviceRequests.filter((s) => s.status !== "CLOSED" && s.status !== "RESOLVED")
        .length,
    [serviceRequests]
  );
  const resolvedCount = useMemo(
    () =>
      serviceRequests.filter((s) => s.status === "RESOLVED" || s.status === "CLOSED")
        .length,
    [serviceRequests]
  );

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
        title="Service Desk"
        description="Log customer maintenance tickets, schedule technicians, and track warranty repairs."
        icon={Wrench}
        actions={
          <Button asChild className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold">
            <Link href="/solar/service/new">
              <Plus className="mr-2 h-4 w-4" /> Raise Ticket
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiStatCard
          label="Open Tickets"
          value={`${openCount} Active`}
          subtext="Awaiting triage or technician visit"
          icon={Ticket}
        />
        <KpiStatCard
          label="Resolved Tickets"
          value={`${resolvedCount} Fixed`}
          subtext="Completed and closed requests"
          icon={CheckCircle2}
          tone="positive"
        />
        <KpiStatCard
          label="Total Tickets Logged"
          value={`${serviceRequests.length} Tickets`}
          subtext="All-time support history"
          icon={Clock}
          tone="dark"
        />
      </div>

      <SectionCard
        title="Support Tickets"
        description="Filter by ticket status or search by customer or ticket ID."
        headerRight={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                aria-label="Filter tickets by status"
                className="h-10 w-full sm:w-44 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium"
              >
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all">Full Lifecycle</SelectItem>
                {Object.keys(SERVICE_STATUSES).map((s) => (
                  <SelectItem key={s} value={s}>
                    {SERVICE_STATUSES[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                aria-label="Search tickets by customer or ID"
                placeholder="Search customer or ticket ID..."
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
                  Ticket
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">
                  Service Category
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Status
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Technician
                </TableHead>
                <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-20">
                  Open
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isServiceLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-44 text-center">
                    <Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-6">
                    <EmptyStatePanel
                      icon={Wrench}
                      title="No service tickets found"
                      description="Raise a support ticket for an installed solar system to schedule a field technician."
                      action={
                        <Button asChild variant="outline" className="rounded-xl border-slate-200">
                          <Link href="/solar/service/new">Raise Ticket</Link>
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((s: any) => {
                  const info = SERVICE_STATUSES[s.status] || SERVICE_STATUSES.OPEN;
                  return (
                    <TableRow
                      key={s.id}
                      className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0"
                    >
                      <TableCell className="pl-6 py-4">
                        <Link
                          href={`/solar/service/${s.id}`}
                          className="flex items-center gap-3 text-left group"
                        >
                          <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-semibold text-slate-700 text-xs shrink-0">
                            T
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 group-hover:underline truncate">
                              {s.customerName}
                            </p>
                            <p className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                              TCK-{s.id.slice(-8).toUpperCase()}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-xs font-medium border-slate-200 text-slate-700 bg-slate-50"
                        >
                          {s.category?.replace(/_/g, " ") || "General"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn("text-xs font-medium h-6 px-2.5", info.className)}
                        >
                          {info.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-semibold">
                            {(s.assignedName || "U").charAt(0)}
                          </div>
                          <span className="text-xs font-medium text-slate-700 truncate max-w-[110px]">
                            {s.assignedName || "Unassigned"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          asChild
                          variant="outline"
                          size="icon"
                          aria-label={`Open ticket ${s.id}`}
                          className="h-8 w-8 rounded-lg border-slate-200 text-slate-700"
                        >
                          <Link href={`/solar/service/${s.id}`}>
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
