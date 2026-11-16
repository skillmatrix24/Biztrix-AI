"use client";

import { useMemo, useState, useRef } from "react";
import {
  ShieldCheck,
  Users,
  Building2,
  CreditCard,
  Loader2,
  CheckCircle2,
  Activity,
  UserCog,
  Sparkles,
  Bot,
  ArrowRight,
  RefreshCcw,
  DatabaseZap,
  Upload,
  X,
  Palette,
  Info,
  Lock,
  History,
  SmartphoneNfc,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  PageHeader,
  KpiStatCard,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import Link from "next/link";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  updateDocumentNonBlocking,
  setDocumentNonBlocking,
  useDoc,
} from "@/firebase";
import {
  collection,
  doc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { cn } from "@/lib/utils";
import { suggestUpsellModules } from "@/ai/flows/suggest-upsell-modules";
import {
  runCredentialMigration,
  MigrationReport,
} from "@/app/actions/p0-migration";
import { toast } from "@/hooks/use-toast";
import { useMarketplaceCatalog } from "@/hooks/use-marketplace-catalog";

export default function OwnerOverviewPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const isPlatformOwner =
    user?.email?.toLowerCase() === "skillmatrix24@gmail.com";

  const globalBrandingRef = useMemoFirebase(
    () => doc(firestore, "system", "config", "branding", "main"),
    [firestore]
  );
  const { data: globalBranding } = useDoc<any>(globalBrandingRef);

  const businessesQuery = useMemoFirebase(() => {
    if (!isPlatformOwner) return null;
    return collection(firestore, "businesses");
  }, [firestore, isPlatformOwner]);
  const { data: businesses, isLoading: bizLoading } =
    useCollection<any>(businessesQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!isPlatformOwner) return null;
    return collection(firestore, "users");
  }, [firestore, isPlatformOwner]);
  const { data: allUsers } = useCollection<any>(usersQuery);

  const { allItems: catalogItems } = useMarketplaceCatalog({
    includeInactive: true,
  });
  const features = useMemo(
    () => catalogItems.filter((m) => m.isActive !== false),
    [catalogItems]
  );

  const gatewaysQuery = useMemoFirebase(() => {
    if (!isPlatformOwner) return null;
    return collection(firestore, "system", "config", "gateways");
  }, [firestore, isPlatformOwner]);
  const { data: gateways } = useCollection<any>(gatewaysQuery);

  const logsQuery = useMemoFirebase(() => {
    if (!isPlatformOwner) return null;
    return query(
      collection(firestore, "system", "logs", "payments"),
      orderBy("timestamp", "desc"),
      limit(15)
    );
  }, [firestore, isPlatformOwner]);
  const { data: auditLogs, isLoading: logsLoading } =
    useCollection<any>(logsQuery);

  const [isBatchScanning, setIsBatchScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationReport, setMigrationReport] =
    useState<MigrationReport | null>(null);

  const stats = useMemo(() => {
    return {
      totalUsers: allUsers?.length || 0,
      totalBusinesses: businesses?.length || 0,
      activeModules: features?.length || 0,
      activeGateways: gateways?.filter((g: any) => g.isActive).length || 0,
    };
  }, [businesses, allUsers, features, gateways]);

  const upsellLeads = useMemo(() => {
    if (!businesses) return [];
    return businesses
      .filter(
        (b: any) =>
          b.aiUpsellInsight && b.aiUpsellInsight.suggestions?.length > 0
      )
      .slice(0, 4);
  }, [businesses]);

  const handleGlobalIdentityUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: "logoUrl" | "faviconUrl"
  ) => {
    if (!isPlatformOwner || !globalBrandingRef) return;
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Identity assets must be under 500KB.",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentNonBlocking(
          globalBrandingRef,
          { [key]: reader.result as string, updatedAt: serverTimestamp() },
          { merge: true }
        );
        toast({ title: "Platform Identity Updated" });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeGlobalIdentity = (key: "logoUrl" | "faviconUrl") => {
    if (!globalBrandingRef) return;
    setDocumentNonBlocking(globalBrandingRef, { [key]: "" }, { merge: true });
    toast({ title: "Global Identity Reset" });
  };

  const runGlobalAnalysis = async () => {
    if (!businesses || businesses.length === 0 || !features) return;

    setIsBatchScanning(true);
    setScanProgress(0);
    let completed = 0;

    try {
      for (const biz of businesses) {
        const activeIds = biz.activeAddonIds || [];
        const available = features.filter(
          (m: any) => !activeIds.includes(m.id) && m.isActive !== false
        );
        const activeNames = features
          .filter((m: any) => activeIds.includes(m.id))
          .map((m: any) => m.name);

        const result = await suggestUpsellModules({
          businessName: biz.name,
          activeModules:
            activeNames.length > 0 ? activeNames : ["Free Core OS"],
          availableModules: available.map((m: any) => ({
            name: m.name,
            description: m.description,
            price: m.price,
          })),
        });

        const bizRef = doc(firestore, "businesses", biz.id);
        updateDocumentNonBlocking(bizRef, {
          aiUpsellInsight: result,
          lastAiAnalysisAt: serverTimestamp(),
        });

        completed++;
        setScanProgress(Math.round((completed / businesses.length) * 100));
      }
      toast({ title: "Platform Scan Complete" });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Scan Failed" });
    } finally {
      setIsBatchScanning(false);
    }
  };

  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      const result = await runCredentialMigration();
      setMigrationReport(result);
      if (result.success) {
        toast({
          title: "Migration Complete",
          description: "All secrets mirrored to isolated private configs.",
        });
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Migration Failed" });
    } finally {
      setIsMigrating(false);
    }
  };

  if (!isPlatformOwner) {
    return (
      <div className="max-w-lg mx-auto py-16">
        <EmptyStatePanel
          icon={ShieldCheck}
          title="Restricted Access"
          description="Only authorized platform administrators can view the Owner Console."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 text-left max-w-6xl mx-auto">
      <PageHeader
        title="Platform Overview"
        description="Monitor tenant workspaces, run platform AI scans, and manage security policies."
        breadcrumb="Owner Console"
        icon={ShieldCheck}
        actions={
          <>
            <Button
              variant="outline"
              disabled={isBatchScanning || bizLoading}
              onClick={runGlobalAnalysis}
              className="h-10 px-4 rounded-xl border-slate-200 text-xs font-semibold text-slate-700"
            >
              {isBatchScanning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <DatabaseZap className="mr-2 h-4 w-4" />
              )}
              {isBatchScanning ? `Scanning (${scanProgress}%)` : "Run AI Scan"}
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-10 px-4 rounded-xl border-slate-200 text-xs font-semibold text-slate-700"
            >
              <Link href="/owner/users">
                <UserCog className="mr-2 h-4 w-4" /> Users
              </Link>
            </Button>
            <Button
              asChild
              className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white"
            >
              <Link href="/owner/limits?tab=suites">
                <Activity className="mr-2 h-4 w-4" /> Plans & Limits
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiStatCard
          label="Active Workspaces"
          value={stats.totalBusinesses}
          subtext="Tenant businesses"
          icon={Building2}
        />
        <KpiStatCard
          label="Registered Profiles"
          value={stats.totalUsers}
          subtext="Across all roles"
          icon={Users}
        />
        <KpiStatCard
          label="Marketplace Modules"
          value={stats.activeModules}
          subtext="Published add-ons"
          icon={Sparkles}
        />
        <KpiStatCard
          label="Active Gateways"
          value={stats.activeGateways}
          subtext="Global billing rails"
          icon={CreditCard}
          tone="dark"
        />
      </div>

      <SectionCard
        title="Security Remediation"
        description="Mirror sensitive tokens from public tenant documents into isolated privateConfig subcollections."
        headerRight={
          <span className="inline-flex items-center rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700">
            P0 Security Hardening
          </span>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8 space-y-4">
            <div className="flex items-center gap-2.5">
              <Lock className="h-4 w-4 text-slate-700" />
              <h4 className="text-base font-bold text-slate-900">
                Credential Migration Protocol
              </h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Non-destructive copy operation that isolates WhatsApp API secrets
              and payment gateway keys into strictly protected{" "}
              <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs text-slate-800">
                privateConfig
              </code>{" "}
              documents.
            </p>
            {migrationReport && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p className="text-xs font-semibold text-slate-600">
                    WhatsApp Credentials
                  </p>
                  <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                    {migrationReport.whatsapp.migrated}{" "}
                    <span className="text-xs font-normal text-slate-500">
                      synced
                    </span>
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p className="text-xs font-semibold text-slate-600">
                    Gateway Secrets
                  </p>
                  <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                    {migrationReport.payments.migrated}{" "}
                    <span className="text-xs font-normal text-slate-500">
                      synced
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="md:col-span-4">
            <Button
              onClick={handleMigration}
              disabled={isMigrating}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl"
            >
              {isMigrating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCcw className="h-4 w-4 mr-2" />
              )}
              Run Migration
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="System Audit Trail"
        description="Recent webhook & dispatch proof logs recorded across the platform."
        headerRight={
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <History className="h-3.5 w-3.5" /> Latest 15 events
          </span>
        }
      >
        <div className="overflow-x-auto -mx-6 -my-5">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="pl-6 text-xs font-semibold text-slate-700 h-11">
                  Event & Timestamp
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-700 h-11">
                  Recipient Context
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-700 h-11 text-center">
                  Status
                </TableHead>
                <TableHead className="text-right pr-6 text-xs font-semibold text-slate-700 h-11">
                  Payload
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-36 text-center">
                    <Loader2 className="animate-spin h-5 w-5 mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : !auditLogs || auditLogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-36 text-center text-sm text-slate-500"
                  >
                    No system logs recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                auditLogs.map((log: any) => (
                  <TableRow
                    key={log.id}
                    className="border-b border-slate-200 last:border-0 hover:bg-slate-50/70"
                  >
                    <TableCell className="pl-6 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-900">
                          {log.event?.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                          {new Date(log.timestamp).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          <SmartphoneNfc className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {log.payload?.customerName || "System Event"}
                          </p>
                          <p className="text-xs font-mono tabular-nums text-slate-500">
                            {log.payload?.targetPhone || "N/A"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
                          log.event?.includes("SUCCESS")
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        )}
                      >
                        {log.event?.includes("SUCCESS")
                          ? "Dispatched"
                          : "Rejected"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs font-semibold text-slate-700 gap-1"
                          >
                            View Payload <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[580px] rounded-2xl border border-slate-200 p-0 overflow-hidden text-left">
                          <DialogHeader className="p-6 bg-slate-900 text-white">
                            <DialogTitle className="text-lg font-bold">
                              Audit Log Payload
                            </DialogTitle>
                          </DialogHeader>
                          <div className="p-6">
                            <ScrollArea className="h-[360px] rounded-xl bg-slate-50 border border-slate-200 p-4 font-mono text-xs text-slate-700">
                              <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                            </ScrollArea>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <SectionCard
            title="Platform Global Branding"
            description="Default platform logo and browser favicon shown when tenant assets are unset."
            headerRight={<Palette className="h-4 w-4 text-slate-400" />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">
                    Global Logo
                  </Label>
                  {globalBranding?.logoUrl && (
                    <button
                      type="button"
                      onClick={() => removeGlobalIdentity("logoUrl")}
                      className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Reset
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className={cn(
                    "w-full h-32 rounded-xl border border-dashed flex flex-col items-center justify-center gap-2 transition-colors",
                    globalBranding?.logoUrl
                      ? "border-slate-300 bg-slate-50 p-3"
                      : "border-slate-300 bg-slate-50 hover:bg-slate-100"
                  )}
                >
                  {globalBranding?.logoUrl ? (
                    <img
                      src={globalBranding.logoUrl}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-contain"
                      alt="Global Logo"
                    />
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-slate-500" />
                      <span className="text-xs font-medium text-slate-600">
                        Upload Platform Logo
                      </span>
                    </>
                  )}
                </button>
                <input
                  type="file"
                  ref={logoInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleGlobalIdentityUpload(e, "logoUrl")}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">
                    Global Favicon
                  </Label>
                  {globalBranding?.faviconUrl && (
                    <button
                      type="button"
                      onClick={() => removeGlobalIdentity("faviconUrl")}
                      className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Reset
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => faviconInputRef.current?.click()}
                  className={cn(
                    "w-full h-32 rounded-xl border border-dashed flex flex-col items-center justify-center gap-2 transition-colors",
                    globalBranding?.faviconUrl
                      ? "border-slate-300 bg-slate-50 p-6"
                      : "border-slate-300 bg-slate-50 hover:bg-slate-100"
                  )}
                >
                  {globalBranding?.faviconUrl ? (
                    <img
                      src={globalBranding.faviconUrl}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-contain"
                      alt="Global Favicon"
                    />
                  ) : (
                    <>
                      <Zap className="h-5 w-5 text-slate-500" />
                      <span className="text-xs font-medium text-slate-600">
                        Upload Favicon
                      </span>
                    </>
                  )}
                </button>
                <input
                  type="file"
                  ref={faviconInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleGlobalIdentityUpload(e, "faviconUrl")}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Cross-Tenant Upsell Intelligence"
            description="Recommended marketplace modules surfaced from recent platform AI scans."
            headerRight={<Bot className="h-4 w-4 text-slate-400" />}
          >
            {upsellLeads.length === 0 ? (
              <EmptyStatePanel
                icon={Bot}
                title="No AI scan insights yet"
                description="Click Run AI Scan above to generate module recommendations across workspaces."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upsellLeads.map((biz: any) => (
                  <div
                    key={biz.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {biz.name}
                      </p>
                      <span className="text-xs font-medium text-emerald-700 shrink-0">
                        Synced
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {(biz.aiUpsellInsight?.suggestions || [])
                        .slice(0, 2)
                        .map((s: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex gap-2.5 items-start text-left"
                          >
                            <div className="h-6 w-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                              <Sparkles className="h-3.5 w-3.5" />
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {s.moduleName}
                              </p>
                              <p className="text-xs text-slate-600 line-clamp-2">
                                {s.reasoning}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 space-y-5">
            <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold">Encrypted Payouts</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Gateway credentials are stored encrypted in isolated server
                storage so tenant secrets remain protected.
              </p>
            </div>
            <div className="border-t border-white/10 pt-4 space-y-3">
              <div className="flex items-center gap-3 text-xs font-medium text-slate-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>PCI DSS Compliant Checkout</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-slate-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Direct Merchant Settlement</span>
              </div>
            </div>
          </div>

          <SectionCard
            title="Platform Controls"
            headerRight={<Info className="h-4 w-4 text-slate-400" />}
          >
            <p className="text-xs text-slate-600 leading-relaxed">
              As platform owner, you can adjust workspace statuses, override
              quotas, and provision marketplace modules from the Users and Plans
              pages.
            </p>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
