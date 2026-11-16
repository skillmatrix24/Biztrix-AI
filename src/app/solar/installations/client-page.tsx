"use client";

import { useState, useMemo } from "react";
import {
  Briefcase,
  Plus,
  Search,
  Clock,
  Loader2,
  Activity,
  ShieldCheck,
  Calendar,
  BadgeCheck,
  Zap,
  Users,
  Sparkles,
  ChevronRight,
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
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";

const INSTALLATION_STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: any }
> = {
  READY_TO_SCHEDULE: {
    label: "Ready",
    className: "bg-sky-50 text-sky-700 border-sky-200",
    icon: Clock,
  },
  SCHEDULED: {
    label: "Scheduled",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: Calendar,
  },
  TEAM_ASSIGNED: {
    label: "Team Ready",
    className: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Users,
  },
  MATERIAL_READY: {
    label: "Inventory Staged",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Zap,
  },
  IN_PROGRESS: {
    label: "Installing",
    className: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Activity,
  },
  QUALITY_CHECK: {
    label: "QA Testing",
    className: "bg-pink-50 text-pink-700 border-pink-200",
    icon: ShieldCheck,
  },
  COMMISSIONING: {
    label: "Commissioning",
    className: "bg-cyan-50 text-cyan-700 border-cyan-200",
    icon: Sparkles,
  },
  HANDED_OVER: {
    label: "Handed Over",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: BadgeCheck,
  },
  ON_HOLD: {
    label: "On Hold",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: Clock,
  },
};

export default function SolarInstallationsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const installationsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "solarInstallations"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: installationsData, isLoading: isInstallationsLoading } =
    useCollection<any>(installationsQuery);
  const installations = installationsData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredInstallations = useMemo(() => {
    const sLower = searchTerm.trim().toLowerCase();
    return (installations || []).filter((i) => {
      const matchesSearch =
        !sLower ||
        i.customerName?.toLowerCase().includes(sLower) ||
        i.installationNumber?.toLowerCase().includes(sLower);
      const matchesStatus = statusFilter === "all" || i.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [installations, searchTerm, statusFilter]);

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
        breadcrumb="Solar EPC • Field Operations"
        title="Installations Registry"
        description="Coordinate site schedules, team assignments, material allocation, and project handovers."
        icon={Briefcase}
        actions={
          <Button asChild className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold">
            <Link href="/solar/quotations">
              <Plus className="mr-2 h-4 w-4" /> Start from Proposal
            </Link>
          </Button>
        }
      />

      <SectionCard
        title="Field Execution Pipeline"
        description="Filter by execution stage or search by customer and installation number."
        headerRight={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                aria-label="Filter installations by stage"
                className="h-10 w-full sm:w-44 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium"
              >
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all" className="text-sm">
                  All Sites
                </SelectItem>
                {Object.keys(INSTALLATION_STATUS_CONFIG).map((s) => (
                  <SelectItem key={s} value={s} className="text-sm">
                    {INSTALLATION_STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                aria-label="Search installation site or ID"
                placeholder="Search site or ID..."
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
                  Installation Site
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">
                  Capacity
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Status
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Team Lead
                </TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-600 h-11">
                  Start Schedule
                </TableHead>
                <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-20">
                  Open
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isInstallationsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-44 text-center">
                    <Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : filteredInstallations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-6">
                    <EmptyStatePanel
                      icon={Briefcase}
                      title="No installation sites found"
                      description="Convert an accepted proposal into an installation schedule to track field execution."
                      action={
                        <Button asChild variant="outline" className="rounded-xl border-slate-200">
                          <Link href="/solar/quotations">Open Proposals</Link>
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredInstallations.map((i: any) => {
                  const s =
                    INSTALLATION_STATUS_CONFIG[i.status] ||
                    INSTALLATION_STATUS_CONFIG.READY_TO_SCHEDULE;
                  const Icon = s.icon;
                  return (
                    <TableRow
                      key={i.id}
                      className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0"
                    >
                      <TableCell className="pl-6 py-4">
                        <Link
                          href={`/solar/installations/${i.id}`}
                          className="flex items-center gap-3 text-left group"
                        >
                          <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-semibold text-slate-700 text-xs shrink-0">
                            I
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 group-hover:underline truncate">
                              {i.customerName}
                            </p>
                            <p className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                              {i.installationNumber}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                            {i.capacityKw} kW
                          </span>
                          <span className="text-xs text-slate-500">{i.systemType}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn("text-xs font-medium h-6 px-2.5 gap-1.5", s.className)}
                        >
                          <Icon className="h-3 w-3" /> {s.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-semibold">
                            {(i.assignedTeamNames?.[0] || i.supervisorName || "U").charAt(0)}
                          </div>
                          <span className="text-xs font-medium text-slate-700 truncate max-w-[110px]">
                            {i.assignedTeamNames?.[0] || i.supervisorName || "Unassigned"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs text-slate-700">
                        {i.scheduledStartDate
                          ? format(new Date(i.scheduledStartDate), "dd MMM yyyy")
                          : "--"}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          asChild
                          variant="outline"
                          size="icon"
                          aria-label={`Open installation ${i.installationNumber}`}
                          className="h-8 w-8 rounded-lg border-slate-200 text-slate-700"
                        >
                          <Link href={`/solar/installations/${i.id}`}>
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
