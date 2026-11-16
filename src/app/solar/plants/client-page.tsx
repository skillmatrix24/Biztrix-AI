"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ChevronRight,
  Loader2,
  History,
  Globe,
  CheckCircle2,
  Activity,
  Sun,
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
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
} from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import Link from "next/link";

const PLANT_STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  ACTIVE: {
    label: "Operational",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  SERVICE: {
    label: "Maintenance",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  INACTIVE: {
    label: "Offline",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
  },
  DECOMMISSIONED: {
    label: "Decommissioned",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

export default function SolarPlantsRegistryPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const plantsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "solarPlants"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: plantsData, isLoading: isPlantsLoading } =
    useCollection<any>(plantsQuery);
  const plants = plantsData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredPlants = useMemo(() => {
    return plants
      .filter(
        (p: any) =>
          p.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.plantReference?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter((p: any) => statusFilter === "all" || p.status === statusFilter);
  }, [plants, searchTerm, statusFilter]);

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-slate-600 h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 text-left">
      <PageHeader
        icon={Globe}
        title="Plant Asset Registry"
        description="Commissioned solar sites, installed capacities, and inverter telemetry status"
        actions={
          <Button
            asChild
            variant="outline"
            className="h-10 px-4 font-semibold text-sm rounded-xl border-slate-200 text-slate-900 bg-white"
          >
            <Link href="/solar/installations">
              <History className="mr-2 h-4 w-4 text-slate-600" /> Installation
              History
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <KpiStatCard
          label="Total Solar Plants"
          value={`${plants.length} Units`}
          icon={Sun}
        />
        <KpiStatCard
          label="Active Generation"
          value={`${plants.filter((p) => p.status === "ACTIVE").length} Operational`}
          icon={CheckCircle2}
          tone="positive"
        />
        <KpiStatCard
          label="Monitoring Connected"
          value={`${plants.filter((p) => p.monitoringStatus === "READY").length} Connected`}
          icon={Activity}
          tone="dark"
        />
      </div>

      <SectionCard bodyClassName="p-0">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                aria-label="Filter plants by status"
                className="h-11 w-full md:w-48 rounded-xl bg-white border-slate-200 text-sm font-medium text-slate-800"
              >
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-sm font-medium">
                  All Plants
                </SelectItem>
                {Object.keys(PLANT_STATUS_CONFIG).map((s) => (
                  <SelectItem key={s} value={s} className="text-sm font-medium">
                    {PLANT_STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              aria-label="Search plants by customer or reference"
              placeholder="Search customer, reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 pl-10 rounded-xl bg-white border-slate-200 text-sm w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[780px]">
            <TableHeader>
              <TableRow className="bg-slate-50/70 border-b border-slate-200">
                <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">
                  Plant Asset
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">
                  System Spec
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Status
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Monitoring
                </TableHead>
                <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-16">
                  Open
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPlantsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-500" />
                  </TableCell>
                </TableRow>
              ) : filteredPlants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-6">
                    <EmptyStatePanel
                      icon={Sun}
                      title="No solar plants found"
                      description="Commissioned projects will automatically appear in the plant asset registry."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlants.map((p: any) => {
                  const info =
                    PLANT_STATUS_CONFIG[p.status] || PLANT_STATUS_CONFIG.ACTIVE;
                  return (
                    <TableRow
                      key={p.id}
                      className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 text-left"
                    >
                      <TableCell className="pl-6 py-4 text-left">
                        <Link
                          href={`/solar/plants/${p.id}`}
                          className="flex items-center gap-3.5 text-left group"
                        >
                          <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm shrink-0">
                            {p.customerName?.charAt(0) || "P"}
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors truncate">
                              {p.customerName}
                            </p>
                            <p className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                              {p.plantReference}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                            {p.installedCapacityKwp} kWp
                          </span>
                          <span className="text-xs text-slate-500 mt-0.5">
                            {p.systemType}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-semibold px-2.5 py-0.5 rounded-lg border",
                            info.badgeClass
                          )}
                        >
                          {info.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium px-2.5 py-0.5 rounded-lg border",
                            p.monitoringStatus === "READY"
                              ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                              : "text-slate-500 border-slate-200 bg-slate-50"
                          )}
                        >
                          {p.monitoringStatus === "READY"
                            ? "Connected"
                            : "Not Connected"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-slate-700"
                        >
                          <Link
                            href={`/solar/plants/${p.id}`}
                            aria-label={`Open plant ${p.customerName}`}
                          >
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
