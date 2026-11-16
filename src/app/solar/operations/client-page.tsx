"use client";

import { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard,
  Target,
  Briefcase,
  Package,
  Wrench,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Bot,
  DollarSign,
  Loader2,
  Activity,
  LineChart,
  Sparkles,
  Bell,
  SearchCode,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  useCollection,
} from "@/firebase";
import { collection, doc, query, where, orderBy, limit } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { runSolarConditionScanner } from "@/firebase/solar-notifications";

const INSTALL_STATUS_GROUPS: Record<string, string[]> = {
  Staging: ["READY_TO_SCHEDULE", "SCHEDULED", "TEAM_ASSIGNED", "MATERIAL_READY"],
  Active: ["IN_PROGRESS", "QUALITY_CHECK", "COMMISSIONING"],
  Closed: ["COMPLETED", "HANDED_OVER"],
};

export default function SolarOperationsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;
  const isAdmin =
    userProfile?.role === "admin" || userProfile?.role === "manager";

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const inqQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(firestore, "businesses", businessId, "solarInquiries")
        : null,
    [firestore, businessId]
  );
  const { data: inquiriesData } = useCollection<any>(inqQuery);
  const inquiries = inquiriesData || [];

  const installsQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(firestore, "businesses", businessId, "solarInstallations")
        : null,
    [firestore, businessId]
  );
  const { data: installationsData } = useCollection<any>(installsQuery);
  const installations = installationsData || [];

  const serviceQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(
            firestore,
            "businesses",
            businessId,
            "solarServiceRequests"
          )
        : null,
    [firestore, businessId]
  );
  const { data: servicesData } = useCollection<any>(serviceQuery);
  const services = servicesData || [];

  const amcQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(firestore, "businesses", businessId, "solarAmcContracts")
        : null,
    [firestore, businessId]
  );
  const { data: amcListData } = useCollection<any>(amcQuery);
  const amcList = amcListData || [];

  const productsQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(firestore, "businesses", businessId, "products")
        : null,
    [firestore, businessId]
  );
  const { data: productsData } = useCollection<any>(productsQuery);
  const products = productsData || [];

  const quotesQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "quotations"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: allQuotesData } = useCollection<any>(quotesQuery);
  const allQuotes = allQuotesData || [];
  const solarQuotes = useMemo(
    () => (allQuotes || []).filter((q: any) => q.solarSystemDesignId),
    [allQuotes]
  );

  const cashbookQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "cashbook"),
            where("category", "==", "Sales")
          )
        : null,
    [firestore, businessId]
  );
  const { data: transactionsData } = useCollection<any>(cashbookQuery);
  const transactions = transactionsData || [];

  const notifQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "notifications"),
            where("type", "==", "solar_alert"),
            orderBy("createdAt", "desc"),
            limit(10)
          )
        : null,
    [firestore, businessId]
  );
  const { data: solarAlertsData } = useCollection<any>(notifQuery);
  const solarAlerts = solarAlertsData || [];

  const [activeTab, setActiveTab] = useState("overview");
  const currencySymbol = getCurrencySymbol(business?.currency);

  useEffect(() => {
    if (businessId && isAdmin && user?.uid) {
      runSolarConditionScanner(firestore, businessId, user.uid);
    }
  }, [businessId, isAdmin, user?.uid, firestore]);

  const opsStats = useMemo(() => {
    const fresh = (inquiries || []).filter((i) => i.status === "NEW").length;
    const workingInstalls = (installations || []).filter(
      (i) => i.status !== "HANDED_OVER" && i.status !== "CANCELLED"
    ).length;
    const openService = (services || []).filter(
      (s) => s.status !== "RESOLVED" && s.status !== "CLOSED"
    ).length;
    const activeAmc = (amcList || []).filter(
      (a) => a.status === "ACTIVE"
    ).length;

    const totalKw = (installations || [])
      .filter((i) => i.status === "HANDED_OVER")
      .reduce((sum, i) => sum + (parseFloat(i.capacityKw) || 0), 0);
    const acceptedValue = (solarQuotes || [])
      .filter((q) => q.status === "converted")
      .reduce((sum, q) => sum + (q.totals?.finalPayout || 0), 0);
    const totalCollected = (transactions || []).reduce(
      (sum, t) => sum + (parseFloat(t.amount) || 0),
      0
    );
    const collectionGap = acceptedValue - totalCollected;

    return {
      fresh,
      workingInstalls,
      openService,
      activeAmc,
      totalKw,
      acceptedValue,
      totalCollected,
      collectionGap,
    };
  }, [inquiries, installations, services, amcList, solarQuotes, transactions]);

  const materialReadiness = useMemo(() => {
    const active = (installations || []).filter(
      (i) => i.status !== "HANDED_OVER" && i.status !== "CANCELLED"
    );
    return active.map((inst) => {
      const materials = inst.materials || [];
      const shortages = materials.filter((m: any) => {
        const product = products?.find((p) => p.id === m.productId);
        const remaining = (m.required || 0) - (m.issued || 0);
        return (product?.stock || 0) < remaining;
      });

      return {
        id: inst.id,
        name: inst.customerName,
        number: inst.installationNumber,
        status: inst.status,
        shortageCount: shortages.length,
        isReady: shortages.length === 0,
      };
    });
  }, [installations, products]);

  const shortfallCount = materialReadiness.filter((m) => !m.isReady).length;

  if (isProfileLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-600 h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 text-left">
      <PageHeader
        icon={LayoutDashboard}
        title="Solar Operations"
        description="Live operational radar, field installations, and material readiness"
        actions={
          <>
            <Button
              asChild
              variant="outline"
              className="h-10 px-4 rounded-xl border-slate-200 text-slate-800 font-semibold text-sm bg-white"
            >
              <Link href="/solar/analytics">
                <LineChart className="mr-2 h-4 w-4 text-slate-600" /> BI
                Analytics
              </Link>
            </Button>
            <Button
              asChild
              className="bg-slate-900 hover:bg-slate-800 h-10 px-5 font-semibold text-sm rounded-xl text-white"
            >
              <Link href="/solar/ai-insights">
                <Sparkles className="mr-2 h-4 w-4" /> Intelligence
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiStatCard
          label="Active Sites"
          value={`${opsStats.workingInstalls} Units`}
          icon={Activity}
        />
        <KpiStatCard
          label="Installed Capacity"
          value={`${opsStats.totalKw} kWp`}
          icon={BadgeCheck}
          tone="warning"
        />
        <KpiStatCard
          label="Open Service Tickets"
          value={`${opsStats.openService} Tickets`}
          icon={Wrench}
          tone="positive"
        />
        <KpiStatCard
          label="Collection Gap"
          value={`${currencySymbol}${Math.max(0, opsStats.collectionGap).toLocaleString()}`}
          icon={DollarSign}
          tone={opsStats.collectionGap > 0 ? "danger" : "positive"}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border border-slate-200 h-auto p-1.5 rounded-2xl mb-6 flex overflow-x-auto gap-1">
          <TabsTrigger
            value="overview"
            className="flex-1 text-xs font-semibold px-4 py-2.5 rounded-xl gap-2 whitespace-nowrap data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            <Target className="h-4 w-4" /> Attention Required
          </TabsTrigger>
          <TabsTrigger
            value="installations"
            className="flex-1 text-xs font-semibold px-4 py-2.5 rounded-xl gap-2 whitespace-nowrap data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            <Briefcase className="h-4 w-4" /> Field Execution
          </TabsTrigger>
          <TabsTrigger
            value="materials"
            className="flex-1 text-xs font-semibold px-4 py-2.5 rounded-xl gap-2 whitespace-nowrap data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            <Package className="h-4 w-4" /> Material Readiness
          </TabsTrigger>
          <TabsTrigger
            value="pipeline"
            className="flex-1 text-xs font-semibold px-4 py-2.5 rounded-xl gap-2 whitespace-nowrap data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            <SearchCode className="h-4 w-4" /> Sales Pipeline
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger
              value="financials"
              className="flex-1 text-xs font-semibold px-4 py-2.5 rounded-xl gap-2 whitespace-nowrap data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              <DollarSign className="h-4 w-4" /> Financials
            </TabsTrigger>
          )}
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <TabsContent value="overview" className="m-0 space-y-6">
              <SectionCard
                title="Critical Operations Radar"
                description="Priority alerts and inventory shortages needing attention"
                headerRight={
                  <Badge
                    variant="outline"
                    className="bg-slate-900 text-white border-slate-900 text-xs font-semibold px-2.5 py-0.5 rounded-lg"
                  >
                    Real-time
                  </Badge>
                }
                bodyClassName="p-0"
              >
                {solarAlerts.length === 0 && shortfallCount === 0 ? (
                  <div className="p-6">
                    <EmptyStatePanel
                      icon={CheckCircle2}
                      title="All operations clear"
                      description="No urgent field alerts or component shortages detected across active projects."
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {(solarAlerts || []).map((alert) => {
                      const targetHref =
                        alert.entityType === "SOLAR_INSTALLATION"
                          ? `/solar/installations/${alert.entityId}`
                          : alert.entityType === "SOLAR_INQUIRY"
                            ? `/solar/inquiries/${alert.entityId}`
                            : "/solar/operations";
                      return (
                        <div
                          key={alert.id}
                          className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors gap-4"
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div
                              className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                                alert.severity === "URGENT"
                                  ? "bg-rose-50 text-rose-600 border-rose-200"
                                  : "bg-amber-50 text-amber-600 border-amber-200"
                              )}
                            >
                              <Bell className="h-4 w-4" />
                            </div>
                            <div className="text-left min-w-0">
                              <p className="text-sm font-semibold text-slate-900 leading-tight">
                                {alert.title}
                              </p>
                              <p className="text-xs text-slate-600 mt-1">
                                {alert.message}
                              </p>
                              <p className="text-xs text-slate-400 font-mono tabular-nums mt-1">
                                {alert.createdAt?.toDate
                                  ? format(
                                      alert.createdAt.toDate(),
                                      "dd MMM, HH:mm"
                                    )
                                  : "Recently"}
                              </p>
                            </div>
                          </div>
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl text-slate-600 shrink-0"
                          >
                            <Link
                              href={targetHref}
                              aria-label={`Open ${alert.title}`}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      );
                    })}
                    {materialReadiness
                      .filter((m) => !m.isReady)
                      .map((m) => (
                        <Link
                          key={m.id}
                          href={`/solar/installations/${m.id}`}
                          className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors gap-4"
                        >
                          <div className="flex items-center gap-3.5 text-left min-w-0">
                            <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                              <Package className="h-4 w-4" />
                            </div>
                            <div className="text-left min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {m.name}
                              </p>
                              <p className="text-xs font-medium text-rose-700 mt-0.5 tabular-nums">
                                Material Shortage: {m.shortageCount} components
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                        </Link>
                      ))}
                  </div>
                )}
              </SectionCard>
            </TabsContent>

            <TabsContent value="installations" className="m-0 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {Object.entries(INSTALL_STATUS_GROUPS).map(
                  ([groupName, statuses]) => {
                    const groupItems = (installations || []).filter((i) =>
                      statuses.includes(i.status)
                    );
                    return (
                      <SectionCard
                        key={groupName}
                        title={`${groupName} Stage`}
                        headerRight={
                          <Badge
                            variant="outline"
                            className="text-xs font-mono tabular-nums border-slate-200 text-slate-600"
                          >
                            {groupItems.length}
                          </Badge>
                        }
                        bodyClassName="p-0"
                      >
                        {groupItems.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500">
                            No projects in {groupName.toLowerCase()} stage.
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {groupItems.map((i) => (
                              <Link
                                key={i.id}
                                href={`/solar/installations/${i.id}`}
                                className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors gap-3"
                              >
                                <div className="text-left min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 truncate">
                                    {i.customerName}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-0.5 capitalize">
                                    {i.status.replace(/_/g, " ").toLowerCase()}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-xs font-mono tabular-nums border-slate-200 text-slate-700 shrink-0"
                                >
                                  {i.capacityKw} kW
                                </Badge>
                              </Link>
                            ))}
                          </div>
                        )}
                      </SectionCard>
                    );
                  }
                )}
              </div>
            </TabsContent>

            <TabsContent value="materials" className="m-0 space-y-6">
              <SectionCard bodyClassName="p-0">
                <div className="overflow-x-auto text-left">
                  <Table className="min-w-[680px]">
                    <TableHeader>
                      <TableRow className="bg-slate-50 border-b border-slate-200">
                        <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">
                          Field Installation
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 h-11">
                          Status
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                          Inventory Readiness
                        </TableHead>
                        <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11">
                          Open
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materialReadiness.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="p-6">
                            <EmptyStatePanel
                              icon={Package}
                              title="No active installations"
                              description="Active site material requirements will appear here once installations are scheduled."
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        materialReadiness.map((m) => (
                          <TableRow
                            key={m.id}
                            className="hover:bg-slate-50/70 border-b border-slate-100"
                          >
                            <TableCell className="pl-6 py-4">
                              <div className="text-left">
                                <p className="text-sm font-semibold text-slate-900">
                                  {m.name}
                                </p>
                                <p className="text-xs text-slate-500 font-mono tabular-nums">
                                  {m.number}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="text-xs font-medium border-slate-200 text-slate-700"
                              >
                                {m.status?.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs font-semibold px-2.5 py-0.5 rounded-lg border",
                                  m.isReady
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border-rose-200"
                                )}
                              >
                                {m.isReady
                                  ? "Ready to Dispatch"
                                  : `Short: ${m.shortageCount} items`}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Button
                                asChild
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl text-slate-600"
                              >
                                <Link
                                  href={`/solar/installations/${m.id}`}
                                  aria-label={`Open installation ${m.name}`}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </SectionCard>
            </TabsContent>

            <TabsContent value="pipeline" className="m-0 space-y-6">
              <SectionCard
                title="Sales Pipeline Overview"
                description="Current lead and quotation activity synced from CRM"
                headerRight={
                  <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <Link href="/solar/inquiries">View All Inquiries</Link>
                  </Button>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs text-slate-500">New Inquiries</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                      {opsStats.fresh}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs text-slate-500">Total Solar Quotes</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                      {solarQuotes.length}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs text-slate-500">Active AMC Contracts</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                      {opsStats.activeAmc}
                    </p>
                  </div>
                </div>
              </SectionCard>
            </TabsContent>

            <TabsContent value="financials" className="m-0 space-y-6">
              <SectionCard
                title="Collection Summary"
                description="Accepted order value compared against recorded sales receipts"
              >
                <div className="space-y-4 text-left">
                  <div className="flex flex-wrap justify-between items-end gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <p className="text-xs text-slate-500">Accepted Value</p>
                      <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                        {currencySymbol}
                        {opsStats.acceptedValue.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Collected Amount</p>
                      <p className="text-xl font-bold font-mono tabular-nums text-emerald-700">
                        {currencySymbol}
                        {opsStats.totalCollected.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-semibold text-slate-700">
                      Remaining Collection Gap
                    </span>
                    <span
                      className={cn(
                        "text-base font-bold font-mono tabular-nums",
                        opsStats.collectionGap > 0
                          ? "text-rose-700"
                          : "text-emerald-700"
                      )}
                    >
                      {currencySymbol}
                      {Math.max(0, opsStats.collectionGap).toLocaleString()}
                    </span>
                  </div>
                </div>
              </SectionCard>
            </TabsContent>
          </div>

          <div className="lg:col-span-4 space-y-6 text-left">
            <div className="rounded-2xl bg-slate-900 text-white p-6 space-y-5 text-left">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Operational Scope
                </h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                This dashboard provides a live operational view of field
                progress and collections. Accrued revenue recognition schedules
                are maintained separately in accounting.
              </p>
              <div className="flex items-center gap-2.5 text-xs font-medium text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Tenant-Scoped Data Isolation Active</span>
              </div>
            </div>

            <SectionCard
              title="Operations Note"
              headerRight={<Bot className="h-4 w-4 text-slate-500" />}
              bodyClassName="space-y-4"
            >
              <p className="text-xs text-slate-600 leading-relaxed">
                {shortfallCount > 0
                  ? `${shortfallCount} active installation site${shortfallCount === 1 ? " has" : "s have"} component stock shortages. Review material readiness before scheduling field dispatch.`
                  : "All active installation sites have sufficient stock allocated for scheduled dispatch."}
              </p>
              <Button
                asChild
                variant="outline"
                className="w-full h-10 rounded-xl text-xs font-semibold border-slate-200 text-slate-900 bg-white"
              >
                <Link href="/solar/ai-insights">
                  Open Strategy Center{" "}
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </SectionCard>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3 text-left">
              <AlertCircle className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Workspace operations are isolated per business account and synced
                in real time.
              </p>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
