"use client";

import { useMemo } from "react";
import {
  Sun,
  Zap,
  ArrowRight,
  Bot,
  Sparkles,
  Loader2,
  Activity,
  Plus,
  BadgeCheck,
  Briefcase,
  ChevronRight,
  Wrench,
  ShieldAlert,
  LineChart,
  BarChart3,
  ShieldQuestion,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { collection, doc, query, orderBy } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";

export default function SolarDashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const inquiriesQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "solarInquiries"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: inquiries = [] } = useCollection<any>(inquiriesQuery);

  const installationsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(
              firestore,
              "businesses",
              businessId,
              "solarInstallations"
            ),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: installations = [] } = useCollection<any>(installationsQuery);

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
  const { data: warranties = [] } = useCollection<any>(warrantiesQuery);

  const serviceQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(
              firestore,
              "businesses",
              businessId,
              "solarServiceRequests"
            ),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: serviceRequests = [] } = useCollection<any>(serviceQuery);

  const amcQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(
              firestore,
              "businesses",
              businessId,
              "solarAmcContracts"
            ),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: amcContracts = [] } = useCollection<any>(amcQuery);

  const stats = useMemo(() => {
    const newInq = (inquiries || []).filter(
      (i: any) => i.status === "NEW"
    ).length;

    const activeInstalls = (installations || []).filter(
      (i: any) => !["COMPLETED", "HANDED_OVER", "CANCELLED"].includes(i.status)
    ).length;

    const openServices = (serviceRequests || []).filter(
      (s: any) => s.status !== "RESOLVED" && s.status !== "CLOSED"
    ).length;
    const activeAmc = (amcContracts || []).filter(
      (a: any) => a.status === "ACTIVE"
    ).length;

    return {
      newInq,
      activeInstalls,
      openServices,
      activeAmc,
    };
  }, [inquiries, installations, serviceRequests, amcContracts]);

  if (isProfileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="h-7 w-7 animate-spin text-primary mb-3" />
        <p className="text-xs font-semibold">Loading Solar Operations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 text-left">
      <PageHeader
        icon={Sun}
        title="Solar Operations"
        description="Manage inquiries, field installations, service desks, and AMC contracts."
        actions={
          <>
            <Button
              asChild
              variant="outline"
              className="h-10 px-4 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs bg-white"
            >
              <Link href="/solar/reports">
                <BarChart3 className="mr-2 h-4 w-4 text-primary" /> Reports
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-10 px-4 rounded-xl border-slate-200 text-orange-700 font-semibold text-xs bg-white"
            >
              <Link href="/solar/analytics">
                <LineChart className="mr-2 h-4 w-4" /> BI Analytics
              </Link>
            </Button>
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 h-10 px-5 font-semibold text-xs rounded-xl text-white"
            >
              <Link href="/solar/inquiries/new">
                <Plus className="mr-2 h-4 w-4" /> New Inquiry
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <KpiStatCard
          label="New Inquiries"
          value={stats.newInq}
          icon={Zap}
          tone="default"
          subtext="Incoming lead pipeline"
        />
        <KpiStatCard
          label="Active Installations"
          value={stats.activeInstalls}
          icon={Briefcase}
          tone="warning"
          subtext="Field deployments in progress"
        />
        <KpiStatCard
          label="Open Service Tickets"
          value={stats.openServices}
          icon={Wrench}
          subtext="Technician dispatches pending"
        />
        <KpiStatCard
          label="Active AMC Contracts"
          value={stats.activeAmc}
          icon={ShieldAlert}
          tone="dark"
          subtext="Recurring maintenance plans"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden text-left shadow-none hover:border-slate-300 transition-colors flex flex-col">
              <CardHeader className="bg-slate-50/70 p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-primary">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs font-semibold border-slate-200 text-primary h-6 px-2.5 bg-white"
                  >
                    Service
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-1.5 flex-1">
                <h4 className="text-base font-bold text-slate-900">
                  After-Sales Support
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Manage fault tickets, warranty claims, and technician
                  dispatches.
                </p>
              </CardContent>
              <CardFooter className="p-4 border-t border-slate-100 bg-slate-50/40">
                <Button
                  asChild
                  variant="ghost"
                  className="w-full h-9 rounded-xl text-xs font-semibold text-primary hover:bg-white"
                >
                  <Link href="/solar/service">
                    Open Service Desk <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden text-left shadow-none hover:border-slate-300 transition-colors flex flex-col">
              <CardHeader className="bg-slate-50/70 p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs font-semibold border-amber-200 text-amber-700 h-6 px-2.5 bg-amber-50"
                  >
                    Maintenance
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-1.5 flex-1">
                <h4 className="text-base font-bold text-slate-900">
                  AMC &amp; Maintenance
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Contract registry, renewal tracking, and preventive visit
                  scheduling.
                </p>
              </CardContent>
              <CardFooter className="p-4 border-t border-slate-100 bg-slate-50/40">
                <Button
                  asChild
                  variant="ghost"
                  className="w-full h-9 rounded-xl text-xs font-semibold text-amber-700 hover:bg-white"
                >
                  <Link href="/solar/amc">
                    Manage Contracts <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </section>

          <SectionCard
            title="Recent Installations"
            description="Latest active solar installation sites and warranty tracking."
            headerRight={
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-xs font-semibold border-slate-200"
              >
                <Link href="/solar/installations">View All</Link>
              </Button>
            }
            bodyClassName="p-0"
          >
            {installations.length === 0 ? (
              <div className="p-6">
                <EmptyStatePanel
                  icon={Activity}
                  title="No Operational Activity Yet"
                  description="Installations will appear here as quotes are converted to active field jobs."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow className="bg-slate-50/70">
                      <TableHead className="pl-6 text-xs font-semibold h-11">
                        Customer
                      </TableHead>
                      <TableHead className="text-center text-xs font-semibold h-11">
                        Stage
                      </TableHead>
                      <TableHead className="text-center text-xs font-semibold h-11">
                        Warranty
                      </TableHead>
                      <TableHead className="text-right pr-6 h-11 w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installations.slice(0, 5).map((inst: any) => {
                      const hasWarranty = warranties.some(
                        (w) => w.solarInstallationId === inst.id
                      );
                      return (
                        <TableRow
                          key={inst.id}
                          className="group hover:bg-slate-50/70 transition-colors border-b border-slate-100 cursor-pointer"
                          onClick={() =>
                            router.push(`/solar/installations/${inst.id}`)
                          }
                        >
                          <TableCell className="pl-6 py-4">
                            <div className="flex items-center gap-3.5 text-left">
                              <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center font-bold text-amber-700 text-xs shrink-0">
                                {inst.customerName?.charAt(0) || "I"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">
                                  {inst.customerName}
                                </p>
                                <p className="text-xs font-mono text-slate-500 mt-0.5 tabular-nums">
                                  {inst.installationNumber}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className="text-xs font-medium h-6 px-2.5 bg-slate-50 border-slate-200 text-slate-700"
                            >
                              {inst.status?.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {hasWarranty ? (
                              <BadgeCheck className="h-5 w-5 text-emerald-600 mx-auto" />
                            ) : (
                              <ShieldAlert className="h-5 w-5 text-slate-300 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              aria-label={`Inspect ${inst.customerName}`}
                              className="h-8 w-8 text-slate-400 group-hover:text-primary"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link href={`/solar/installations/${inst.id}`}>
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="lg:col-span-4 space-y-6 text-left">
          <Card className="border border-slate-800 bg-slate-900 text-white rounded-2xl overflow-hidden text-left shadow-none">
            <CardHeader className="p-6 pb-4">
              <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                <Sparkles className="h-5 w-5 text-amber-400" />
              </div>
              <CardTitle className="text-base font-bold mt-3 text-white">
                AI Strategy Center
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-5 text-left">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Active Retention</span>
                  <span className="font-semibold text-amber-400 font-mono tabular-nums">
                    {stats.activeAmc} Contracts
                  </span>
                </div>
                <Progress value={85} className="h-1.5 bg-white/10" />
              </div>
              <Separator className="bg-white/10" />
              <p className="text-xs text-slate-300 leading-relaxed">
                Technical service tickets average 24h resolution. Consider
                expanding AMC coverage for older commissioned plants.
              </p>
              <Button
                asChild
                className="w-full h-11 bg-white text-slate-900 hover:bg-slate-100 font-semibold text-xs rounded-xl"
              >
                <Link href="/solar/ai-insights">
                  Open Strategy Center{" "}
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <SectionCard
            title="Reconciliation"
            headerRight={<ShieldQuestion className="h-4 w-4 text-primary" />}
          >
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Detect orphaned installations or payment mismatches in the
                technical registry.
              </p>
              <Button
                asChild
                variant="outline"
                className="w-full h-10 rounded-xl text-xs font-semibold border-slate-200 text-primary"
              >
                <Link href="/solar/reconciliation">
                  Run Audit Check <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
