"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  Loader2,
  History,
  BadgeCheck,
  ArrowRight,
  Globe,
  Lock,
  Wrench,
  Activity,
  Info,
  ShieldAlert,
  Bot,
  Sparkles,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PageHeader,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  useCollection,
  updateDocumentNonBlocking,
} from "@/firebase";
import {
  doc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";

const PLANT_STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: any }
> = {
  ACTIVE: {
    label: "Operational",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  SERVICE: {
    label: "Under Service",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Wrench,
  },
  INACTIVE: {
    label: "System Offline",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    icon: Clock,
  },
  DECOMMISSIONED: {
    label: "Decommissioned",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    icon: History,
  },
};

export default function SolarPlantDetailPage(props: {
  params: { id: string };
}) {
  const { id } = props.params;
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const plantRef = useMemoFirebase(
    () =>
      businessId && id
        ? doc(firestore, "businesses", businessId, "solarPlants", id)
        : null,
    [firestore, businessId, id]
  );
  const { data: plant, isLoading: isPlantLoading } = useDoc<any>(plantRef);

  const [activeTab, setActiveTab] = useState("overview");

  const serviceQuery = useMemoFirebase(
    () =>
      businessId && plant?.installationId
        ? query(
            collection(
              firestore,
              "businesses",
              businessId,
              "solarServiceRequests"
            ),
            where("installationId", "==", plant.installationId),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId, plant?.installationId]
  );
  const { data: serviceHistory = [] } = useCollection<any>(serviceQuery);

  const handleUpdateStatus = (status: string) => {
    if (!plantRef) return;
    updateDocumentNonBlocking(plantRef, {
      status,
      updatedAt: serverTimestamp(),
    });
    toast({ title: "Plant Status Updated" });
  };

  if (isPlantLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-600 h-8 w-8" />
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="max-w-xl mx-auto py-16">
        <EmptyStatePanel
          icon={ShieldCheck}
          title="Solar Plant Not Found"
          description="This plant record may have been removed or belongs to another workspace."
          action={
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/solar/plants">Back to Registry</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const sInfo = PLANT_STATUS_CONFIG[plant.status] || PLANT_STATUS_CONFIG.ACTIVE;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 text-left">
      <PageHeader
        backHref="/solar/plants"
        backLabel="Back to Plant Registry"
        breadcrumb={`Asset Reference: ${plant.plantReference}`}
        title={plant.customerName}
        actions={
          <Select value={plant.status} onValueChange={handleUpdateStatus}>
            <SelectTrigger
              aria-label="Update plant operational status"
              className={cn(
                "h-10 rounded-xl font-semibold text-sm w-full md:w-48 border",
                sInfo.badgeClass
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {Object.keys(PLANT_STATUS_CONFIG).map((s) => (
                <SelectItem key={s} value={s} className="text-sm font-medium">
                  {PLANT_STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="bg-slate-900 p-6 sm:p-8 text-white text-left space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
                  <Zap className="h-6 w-6 text-amber-400" />
                </div>
                <div className="text-left">
                  <h2 className="text-2xl font-bold font-mono tabular-nums leading-tight">
                    {plant.installedCapacityKwp} kWp Installed
                  </h2>
                  <p className="text-slate-300 text-xs mt-1">
                    {plant.systemType}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-left">
                  <p className="text-xs text-slate-400 mb-1">Plant Reference</p>
                  <p className="text-lg font-bold font-mono tabular-nums text-white">
                    {plant.plantReference}
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-left">
                  <p className="text-xs text-slate-400 mb-1">
                    Activation Date
                  </p>
                  <p className="text-lg font-bold font-mono tabular-nums text-white">
                    {plant.handoverDate || plant.commissioningDate || "--"}
                  </p>
                </div>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <div className="px-6 border-b border-slate-200 bg-slate-50/70">
                <TabsList className="bg-transparent h-12 p-0 gap-6 border-none overflow-x-auto flex">
                  <TabsTrigger
                    value="overview"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none h-12 text-xs font-semibold px-0"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="equipment"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none h-12 text-xs font-semibold px-0"
                  >
                    Equipment
                  </TabsTrigger>
                  <TabsTrigger
                    value="monitoring"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none h-12 text-xs font-semibold px-0"
                  >
                    Monitoring
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6 text-left min-h-[340px]">
                <TabsContent value="overview" className="m-0 space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                        <Info className="h-4 w-4" /> Technical Profile
                      </h3>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="text-left">
                          <p className="text-xs text-slate-500">
                            Architecture
                          </p>
                          <p className="text-sm font-semibold text-slate-900 mt-0.5">
                            {plant.systemType}
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="text-xs text-slate-500">
                            Source Record
                          </p>
                          <Button
                            asChild
                            variant="link"
                            className="h-auto p-0 font-semibold text-primary text-xs mt-0.5"
                          >
                            <Link
                              href={`/solar/installations/${plant.installationId}`}
                            >
                              View Installation Record
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <h3 className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" /> Warranty Coverage
                      </h3>
                      <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-3">
                        <div className="text-left">
                          <p className="text-xs text-emerald-700 mb-1">
                            Coverage Status
                          </p>
                          <Badge
                            variant="outline"
                            className="bg-emerald-600 text-white border-emerald-600 text-xs font-semibold px-2.5 py-0.5 rounded-lg"
                          >
                            Verified Active
                          </Badge>
                        </div>
                        <Button
                          asChild
                          variant="outline"
                          className="w-full h-9 rounded-xl bg-white border-emerald-200 text-emerald-700 text-xs font-semibold"
                        >
                          <Link href="/solar/warranties">
                            Open Warranty Hub
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-slate-200" />

                  <section className="space-y-4 text-left">
                    <div className="flex items-center gap-2 text-left">
                      <History className="h-4 w-4 text-slate-700" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Service Lifecycle Feed
                      </h3>
                    </div>
                    {serviceHistory.length === 0 ? (
                      <EmptyStatePanel
                        icon={Wrench}
                        title="No service interventions logged"
                        description="Maintenance visits and service requests linked to this plant will appear here."
                      />
                    ) : (
                      <div className="space-y-3">
                        {serviceHistory.map((s: any) => (
                          <div
                            key={s.id}
                            className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                          >
                            <div className="text-left">
                              <p className="text-sm font-semibold text-slate-900 capitalize">
                                {s.category?.replace(/_/g, " ").toLowerCase()}
                              </p>
                              <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                                {s.createdAt?.toDate
                                  ? format(s.createdAt.toDate(), "dd MMM yyyy")
                                  : "--"}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-xs font-medium border-slate-200 text-slate-700"
                            >
                              {s.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </TabsContent>

                <TabsContent value="equipment" className="m-0">
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 border-b border-slate-200">
                          <TableHead className="pl-5 text-xs font-semibold text-slate-600 h-11">
                            Component
                          </TableHead>
                          <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                            Qty
                          </TableHead>
                          <TableHead className="text-right pr-5 text-xs font-semibold text-slate-600 h-11">
                            Serial Number
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(plant.equipment || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="p-6 text-center text-xs text-slate-500">
                              No equipment items registered for this plant.
                            </TableCell>
                          </TableRow>
                        ) : (
                          (plant.equipment || []).map((e: any, i: number) => (
                            <TableRow
                              key={i}
                              className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0"
                            >
                              <TableCell className="pl-5 py-4">
                                <div className="text-left">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {e.productName}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className="mt-1 bg-slate-50 text-slate-600 border-slate-200 text-xs font-medium"
                                  >
                                    {e.category}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-mono tabular-nums font-semibold text-sm text-slate-800">
                                {e.quantity}
                              </TableCell>
                              <TableCell className="text-right pr-5">
                                <span className="text-xs font-mono tabular-nums text-slate-600">
                                  {e.serialNumber || "STD-UNIT"}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="monitoring" className="m-0">
                  <div className="max-w-md mx-auto text-center space-y-6 py-6">
                    <div className="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
                      <Activity className="h-6 w-6" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-bold text-slate-900">
                        Monitoring Readiness
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Plant asset identity is active. Live inverter telemetry
                        is currently disconnected.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-left">
                        <div>
                          <p className="text-xs text-slate-500">
                            Inverter Data Port
                          </p>
                          <p className="text-sm font-semibold text-slate-900 mt-0.5">
                            Not Connected
                          </p>
                        </div>
                        <Lock className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-left">
                        <div>
                          <p className="text-xs text-slate-500">
                            Generation Feed
                          </p>
                          <p className="text-sm font-semibold text-slate-900 mt-0.5">
                            Unavailable
                          </p>
                        </div>
                        <ShieldAlert className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 text-left">
          <SectionCard
            title="Customer Sharing"
            headerRight={<Globe className="h-4 w-4 text-slate-500" />}
            bodyClassName="space-y-4"
          >
            <p className="text-sm text-slate-600 leading-relaxed">
              Customers can monitor their solar plant status and documents from
              the <strong>Customer Portal</strong>.
            </p>
            <Button
              asChild
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl"
            >
              <Link href={`/portal/solar?bId=${businessId}`}>
                Open Client Portal <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </SectionCard>

          <div className="p-6 bg-slate-900 text-white rounded-2xl space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-base font-bold text-white">
                Asset Summary
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Plant <span className="font-mono">{plant.plantReference}</span> is
              registered with mapped equipment serials and warranty coverage.
            </p>
            <Separator className="bg-white/15" />
            <div className="flex items-center gap-2 text-xs text-emerald-300">
              <BadgeCheck className="h-4 w-4 shrink-0" />
              <span>Workspace Records Isolated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
