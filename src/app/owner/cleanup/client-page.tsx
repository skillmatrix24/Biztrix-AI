"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Trash2,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Clock,
  Layers,
  ArrowRight,
  Database,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Lock,
  Eye,
  RotateCcw,
  History,
  Info,
  Check,
  X,
  FileSpreadsheet,
  MessageSquare,
  Send,
  Mail,
  ExternalLink,
  Copy,
  BellRing,
  Share2,
  Sparkles,
  Smartphone,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import {
  filterTenantsForCleanup,
  KNOWN_BUSINESS_SUBCOLLECTIONS,
  computeTenantInactivityDays,
} from "@/lib/cleanup-audit";
import {
  inspectBusinessSubcollectionsClient,
  purgeBusinessCompletelyClient,
  batchPurgeStaleTenantsClient,
  extendBusinessTrialClient,
  updateGlobalRetentionPolicyClient,
  recordTenantNotificationSentClient,
} from "@/lib/cleanup-client";
import {
  LIFECYCLE_NOTIFICATION_TEMPLATES,
  cleanWhatsAppPhone,
  renderNotificationText,
  buildWhatsAppDirectUrl,
  buildMailtoUrl,
  isNotificationOnCooldown,
  resolveRecommendedNotificationStage,
  NotificationTemplate,
  NotificationStage,
} from "@/lib/cleanup-notifications";
import {
  normalizePlatformMetaConfig,
  buildMetaTemplateBodyComponents,
  MetaTemplateRecord,
} from "@/lib/meta-outreach-automation";
import { sendWhatsAppTemplate, listWhatsAppTemplates } from "@/app/actions/whatsapp-actions";
import { MetaTemplateAutomationManager } from "@/components/owner/meta-template-automation-manager";

export default function OwnerCleanupClientPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const isPlatformOwner =
    user?.email?.toLowerCase() === "skillmatrix24@gmail.com" ||
    user?.email?.toLowerCase() === "gw7infra@gmail.com" ||
    user?.uid === "sEM5J1HuMCW8RbBTbvnJ5EwaDYA2" ||
    user?.uid === "jA4htunMjSVcMBpRuzfSx8yooHC2";

  // Tab & Search/Filter state
  const [activeTab, setActiveTab] = useState<string>("tenants");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectingBiz, setInspectingBiz] = useState<any>(null);
  const [inspectCounts, setInspectCounts] = useState<Record<string, number> | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [bizToPurge, setBizToPurge] = useState<any>(null);
  const [purgeConfirmInput, setPurgeConfirmInput] = useState("");
  const [isPurging, setIsPurging] = useState(false);

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [isBatchPurging, setIsBatchPurging] = useState(false);

  // Notification states
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [bizToNotify, setBizToNotify] = useState<any>(null);
  const [notifyChannel, setNotifyChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("grace_whatsapp");
  const [notifyPhone, setNotifyPhone] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySubject, setNotifySubject] = useState("");
  const [notifyMessageText, setNotifyMessageText] = useState("");
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [selectedMetaTemplateName, setSelectedMetaTemplateName] = useState<string>("");
  const [selectedMetaTemplateLang, setSelectedMetaTemplateLang] = useState<string>("en_US");
  const [syncedMetaTemplates, setSyncedMetaTemplates] = useState<MetaTemplateRecord[]>([]);

  // Firestore Queries
  const businessesQuery = useMemoFirebase(() => {
    if (!isPlatformOwner) return null;
    return collection(firestore, "businesses");
  }, [firestore, isPlatformOwner]);
  const { data: rawBusinesses, isLoading: bizLoading } =
    useCollection<any>(businessesQuery);

  const logsQuery = useMemoFirebase(() => {
    if (!isPlatformOwner) return null;
    return query(
      collection(firestore, "system", "logs", "cleanup"),
      orderBy("timestamp", "desc"),
      limit(25)
    );
  }, [firestore, isPlatformOwner]);
  const { data: cleanupLogs } = useCollection<any>(logsQuery);

  const notificationLogsQuery = useMemoFirebase(() => {
    if (!isPlatformOwner) return null;
    return query(
      collection(firestore, "system", "logs", "cleanup_notifications"),
      orderBy("timestamp", "desc"),
      limit(30)
    );
  }, [firestore, isPlatformOwner]);
  const { data: notificationLogs } = useCollection<any>(notificationLogsQuery);

  const policyDocRef = useMemoFirebase(() => {
    if (!isPlatformOwner) return null;
    return doc(firestore, "system", "config", "retention", "policy");
  }, [firestore, isPlatformOwner]);
  const { data: retentionPolicy } = useDoc<any>(policyDocRef);

  const metaOutreachDocRef = useMemoFirebase(() => {
    if (!isPlatformOwner) return null;
    return doc(firestore, "system", "private", "integrations", "meta_whatsapp");
  }, [firestore, isPlatformOwner]);
  const { data: savedMetaOutreachDoc } = useDoc<any>(metaOutreachDocRef);

  const platformMetaConfig = useMemo(
    () => normalizePlatformMetaConfig(savedMetaOutreachDoc),
    [savedMetaOutreachDoc]
  );

  // Auto-sync live Meta WABA templates once when verified credentials exist
  const metaWabaId = platformMetaConfig.wabaId;
  const metaAccessToken = platformMetaConfig.accessToken;
  const metaIsVerified = platformMetaConfig.isVerified;
  useEffect(() => {
    if (!isPlatformOwner || !metaIsVerified || !metaWabaId || !metaAccessToken) return;
    let cancelled = false;
    listWhatsAppTemplates({ wabaId: metaWabaId, accessToken: metaAccessToken })
      .then((res) => {
        if (!cancelled && res.success && Array.isArray(res.templates)) {
          setSyncedMetaTemplates(res.templates);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isPlatformOwner, metaIsVerified, metaWabaId, metaAccessToken]);

  // Filtered and categorized businesses
  const categorizedTenants = useMemo(() => {
    return filterTenantsForCleanup(rawBusinesses || [], statusFilter, searchTerm);
  }, [rawBusinesses, statusFilter, searchTerm]);

  // Overall KPI counts
  const kpiStats = useMemo(() => {
    const list = rawBusinesses || [];
    let proCount = 0;
    let healthyTrialCount = 0;
    let graceCount = 0;
    let warningCount = 0;
    let staleCount = 0;

    for (const biz of list) {
      const status = String(biz.status || "").toLowerCase();
      if (status === "pro" || status === "active") {
        proCount++;
        continue;
      }
      const allCategorized = filterTenantsForCleanup([biz], "all", "");
      const cat = allCategorized[0]?.lifecycle.category;
      if (cat === "healthy_trial") healthyTrialCount++;
      else if (cat === "grace_period") graceCount++;
      else if (cat === "warning") warningCount++;
      else if (cat === "stale_purge") staleCount++;
    }

    return {
      total: list.length,
      proCount,
      healthyTrialCount,
      graceCount,
      warningCount,
      staleCount,
    };
  }, [rawBusinesses]);

  // Inspect Subcollections Handler
  const handleInspect = async (biz: any) => {
    setInspectingBiz(biz);
    setInspectCounts(null);
    setInspectModalOpen(true);
    setIsInspecting(true);

    const res = await inspectBusinessSubcollectionsClient(firestore, biz.id);
    setIsInspecting(false);
    if (res.success && res.counts) {
      setInspectCounts(res.counts);
    } else {
      toast({
        variant: "destructive",
        title: "Inspection Failed",
        description: res.error || "Could not read subcollection counts.",
      });
    }
  };

  // Single Purge Handler
  const handleOpenPurge = (biz: any) => {
    setBizToPurge(biz);
    setPurgeConfirmInput("");
    setPurgeModalOpen(true);
  };

  const handleExecutePurge = async () => {
    if (!bizToPurge) return;
    setIsPurging(true);

    const res = await purgeBusinessCompletelyClient(firestore, {
      businessId: bizToPurge.id,
      callerEmail: user?.email || undefined,
      reason: `Manual single purge from DB Cleanup page by ${user?.email}`,
    });

    setIsPurging(false);
    setPurgeModalOpen(false);

    if (res.success) {
      toast({
        title: "Business Purged Successfully",
        description: `"${res.name}" and ${res.totalDeletedDocs} documents permanently deleted.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Purge Failed",
        description: res.error || "Failed to purge business.",
      });
    }
  };

  // Batch Purge Handler
  const handleBatchPurge = async () => {
    setIsBatchPurging(true);
    const res = await batchPurgeStaleTenantsClient(firestore, {
      minDaysExpired: 60,
      callerEmail: user?.email || undefined,
    });
    setIsBatchPurging(false);
    setBatchModalOpen(false);

    if (res.success) {
      toast({
        title: "Batch Purge Complete",
        description: res.message,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Batch Purge Failed",
        description: res.error || "Batch operation failed.",
      });
    }
  };

  // Extend Trial Handler
  const handleExtendTrial = async (biz: any) => {
    const res = await extendBusinessTrialClient(firestore, {
      businessId: biz.id,
      additionalDays: 15,
      callerEmail: user?.email || undefined,
    });
    if (res.success) {
      toast({
        title: "Trial Extended",
        description: res.message,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: res.error || "Could not extend trial.",
      });
    }
  };

  // Retention Policy Handler
  const handleToggleRetentionPolicy = async (immediateHardDelete: boolean) => {
    const res = await updateGlobalRetentionPolicyClient(firestore, {
      immediateHardDelete,
      callerEmail: user?.email || undefined,
    });
    if (res.success) {
      toast({
        title: "Policy Updated",
        description: res.message,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: res.error,
      });
    }
  };

  // Helper to re-render template text for a tenant
  const getRenderedNotification = (tpl: NotificationTemplate, biz: any) => {
    const phone = biz?.phone || biz?.ownerPhone || biz?.contactPhone || "";
    const email = biz?.ownerEmail || biz?.email || biz?.contactEmail || "";
    const ownerName = biz?.ownerName || biz?.contactName || biz?.name || "Business Owner";
    const daysStale = computeTenantInactivityDays(biz);

    const origin = typeof window !== "undefined" ? window.location.origin : "https://biztrix.in";
    const vars = {
      businessName: biz?.name || biz?.id || "Your Business",
      ownerName,
      daysStale: daysStale > 0 ? daysStale : 1,
      renewUrl: `${origin}/pricing`,
      supportPhone: "+91 98765 43210",
    };

    return {
      body: renderNotificationText(tpl.body, vars),
      subject: tpl.subject ? renderNotificationText(tpl.subject, vars) : "",
      phone,
      email,
    };
  };

  // Open Notify Modal
  const handleOpenNotify = (biz: any) => {
    setBizToNotify(biz);
    const daysStale = computeTenantInactivityDays(biz);
    const stage = resolveRecommendedNotificationStage(biz.status, daysStale);

    // Default to WhatsApp template matching stage
    const defaultTemplate =
      LIFECYCLE_NOTIFICATION_TEMPLATES.find(
        (t) => t.stage === stage && t.channel === "whatsapp"
      ) || LIFECYCLE_NOTIFICATION_TEMPLATES[0];

    setSelectedTemplateId(defaultTemplate.id);
    setNotifyChannel("whatsapp");

    // Auto-select mapped Meta Cloud API template for this stage
    const stageMeta = platformMetaConfig.stageMappings[stage];
    setSelectedMetaTemplateName(stageMeta?.templateName || "hello_world");
    setSelectedMetaTemplateLang(stageMeta?.languageCode || "en_US");

    const rendered = getRenderedNotification(defaultTemplate, biz);
    setNotifyPhone(rendered.phone);
    setNotifyEmail(rendered.email);
    setNotifyMessageText(rendered.body);
    setNotifySubject(rendered.subject);
    setCopiedNotification(false);
    setNotifyModalOpen(true);
  };

  // Switch selected template
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tpl = LIFECYCLE_NOTIFICATION_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl || !bizToNotify) return;

    setNotifyChannel(tpl.channel);
    const rendered = getRenderedNotification(tpl, bizToNotify);
    setNotifyMessageText(rendered.body);
    setNotifySubject(rendered.subject);
  };

  // Switch between WhatsApp and Email channels
  const handleSwitchChannel = (channel: "whatsapp" | "email") => {
    setNotifyChannel(channel);
    if (!bizToNotify) return;

    const daysStale = computeTenantInactivityDays(bizToNotify);
    const stage = resolveRecommendedNotificationStage(bizToNotify.status, daysStale);

    const tpl =
      LIFECYCLE_NOTIFICATION_TEMPLATES.find(
        (t) => t.stage === stage && t.channel === channel
      ) ||
      LIFECYCLE_NOTIFICATION_TEMPLATES.find((t) => t.channel === channel) ||
      LIFECYCLE_NOTIFICATION_TEMPLATES[0];

    setSelectedTemplateId(tpl.id);
    const rendered = getRenderedNotification(tpl, bizToNotify);
    setNotifyMessageText(rendered.body);
    setNotifySubject(rendered.subject);
  };

  // Send WhatsApp via 1-Click wa.me deep link
  const handleSendWhatsAppDirect = async () => {
    if (!bizToNotify) return;
    const cleanPhone = cleanWhatsAppPhone(notifyPhone);
    if (!cleanPhone) {
      toast({
        variant: "destructive",
        title: "Phone Number Required",
        description: "Please enter a valid 10-digit mobile number for WhatsApp outreach.",
      });
      return;
    }

    setIsSendingNotification(true);
    await recordTenantNotificationSentClient(firestore, {
      businessId: bizToNotify.id,
      businessName: bizToNotify.name || bizToNotify.id,
      channel: "whatsapp_direct",
      stage: selectedTemplateId.split("_")[0] || "outreach",
      recipientPhone: cleanPhone,
      messageText: notifyMessageText,
      callerEmail: user?.email || undefined,
    });

    setIsSendingNotification(false);
    setNotifyModalOpen(false);

    const waUrl = buildWhatsAppDirectUrl(cleanPhone, notifyMessageText);
    try {
      if (typeof window !== "undefined") {
        const opened = window.open(waUrl, "_blank", "noopener,noreferrer");
        if (!opened) {
          toast({
            title: "Popup Blocked",
            description: "Browser blocked opening WhatsApp tab. You can click 'Copy Text' or open WhatsApp Web directly.",
          });
        }
      }
    } catch (e) {
      console.warn("Could not open window:", e);
    }

    toast({
      title: "WhatsApp Dispatched",
      description: `Opening WhatsApp chat for ${bizToNotify.name}. Outreach recorded in audit log.`,
    });
  };

  // Send WhatsApp via Platform Master Meta Cloud API (with mapped template & dynamic params)
  const handleSendWhatsAppMeta = async () => {
    if (!bizToNotify) return;
    const cleanPhone = cleanWhatsAppPhone(notifyPhone);
    if (!cleanPhone) {
      toast({
        variant: "destructive",
        title: "Phone Number Required",
        description: "Please enter a valid recipient phone number.",
      });
      return;
    }

    if (!platformMetaConfig.phoneId || !platformMetaConfig.accessToken) {
      toast({
        variant: "destructive",
        title: "Platform Meta API Not Configured",
        description:
          "Open the 'Meta API Templates & Auto-Send' tab to connect your Platform Phone ID, WABA ID, and System Token — or use 1-Click WhatsApp (wa.me).",
      });
      return;
    }

    const daysStale = computeTenantInactivityDays(bizToNotify);
    const stage: NotificationStage = resolveRecommendedNotificationStage(
      bizToNotify.status,
      daysStale
    );
    const stageMapping = platformMetaConfig.stageMappings[stage];
    const tplName = (selectedMetaTemplateName || stageMapping?.templateName || "hello_world").trim();
    const tplLang = selectedMetaTemplateLang || stageMapping?.languageCode || "en_US";

    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://biztrix.in";
    const ownerName =
      bizToNotify?.ownerName ||
      bizToNotify?.contactName ||
      bizToNotify?.name ||
      "Business Owner";

    const { components, resolvedValues } = buildMetaTemplateBodyComponents(
      tplName === "hello_world"
        ? { bodyParamKeys: [] }
        : stageMapping || { bodyParamKeys: [] },
      {
        ownerName,
        businessName: bizToNotify?.name || bizToNotify?.id || "Your Business",
        daysStale: daysStale > 0 ? daysStale : 1,
        renewUrl: `${origin}/pricing`,
        supportPhone: platformMetaConfig.supportPhone || "+91 98765 43210",
      }
    );

    setIsSendingNotification(true);
    try {
      const res = await sendWhatsAppTemplate(
        {
          phoneId: platformMetaConfig.phoneId,
          accessToken: platformMetaConfig.accessToken,
        },
        cleanPhone,
        tplName,
        tplLang,
        components
      );

      if (res.success) {
        await recordTenantNotificationSentClient(firestore, {
          businessId: bizToNotify.id,
          businessName: bizToNotify.name || bizToNotify.id,
          channel: "whatsapp_meta",
          stage,
          templateName: tplName,
          recipientPhone: cleanPhone,
          messageText:
            resolvedValues.length > 0
              ? `[Meta Template: ${tplName}] Params: ${resolvedValues.join(" | ")}`
              : `[Meta Template: ${tplName}]`,
          callerEmail: user?.email || undefined,
        });

        setNotifyModalOpen(false);
        toast({
          title: "Meta WhatsApp Sent",
          description: `Template "${tplName}" delivered via Meta Cloud API to +${cleanPhone}.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Meta API Rejected",
          description:
            res.error ||
            "Verify template approval status in Meta API Templates tab, or use 1-Click WhatsApp.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "API Error",
        description: err?.message || "Failed to dispatch via Meta API.",
      });
    } finally {
      setIsSendingNotification(false);
    }
  };

  // Send Email via 1-Click Mailto Draft
  const handleSendEmailDirect = async () => {
    if (!bizToNotify) return;
    const cleanEmail = String(notifyEmail || "").trim();
    if (!cleanEmail) {
      toast({
        variant: "destructive",
        title: "Email Address Required",
        description: "Please enter a valid recipient email address.",
      });
      return;
    }

    setIsSendingNotification(true);
    await recordTenantNotificationSentClient(firestore, {
      businessId: bizToNotify.id,
      businessName: bizToNotify.name || bizToNotify.id,
      channel: "email_direct",
      stage: selectedTemplateId.split("_")[0] || "outreach",
      recipientEmail: cleanEmail,
      subject: notifySubject,
      messageText: notifyMessageText,
      callerEmail: user?.email || undefined,
    });

    setIsSendingNotification(false);
    setNotifyModalOpen(false);

    const mailto = buildMailtoUrl(cleanEmail, notifySubject, notifyMessageText);
    if (typeof window !== "undefined") {
      window.location.href = mailto;
    }

    toast({
      title: "Email Client Opened",
      description: `Draft created for ${cleanEmail}. Outreach recorded in audit log.`,
    });
  };

  // Copy notification text to clipboard
  const handleCopyNotification = () => {
    const full =
      notifyChannel === "email"
        ? `Subject: ${notifySubject}\n\n${notifyMessageText}`
        : notifyMessageText;
    navigator.clipboard.writeText(full);
    setCopiedNotification(true);
    toast({ title: "Copied to Clipboard", description: "Message text copied successfully." });
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Access Guard
  if (!isPlatformOwner) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-8 space-y-4">
          <ShieldAlert className="h-12 w-12 text-rose-600 mx-auto" />
          <h2 className="text-xl font-bold text-rose-950">
            Platform Owner Access Required
          </h2>
          <p className="text-xs text-rose-800 max-w-md mx-auto leading-relaxed">
            Database Housekeeping & Lifecycle Management is restricted exclusively to authorized platform owners.
          </p>
          <Button asChild className="h-10 rounded-xl bg-slate-900 text-white text-xs">
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        title="Database Cleanup & Lifecycle Manager"
        description="Safely prune stale trial businesses, purge orphaned subcollections, sweep soft-deleted records, and enforce real-time deletion policy."
        breadcrumb="Platform Master / DB Cleanup"
        backHref="/owner"
        backLabel="Back to Overview"
        icon={Database}
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              onClick={() => {
                setIsRefreshing(true);
                setTimeout(() => setIsRefreshing(false), 500);
                toast({ title: "Refreshed", description: "Database status re-scanned." });
              }}
              className="h-10 px-3.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold bg-white"
            >
              <RefreshCcw className={`mr-1.5 h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Re-scan Database
            </Button>
            {kpiStats.staleCount > 0 && (
              <Button
                type="button"
                onClick={() => setBatchModalOpen(true)}
                className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Purge Stale Trials ({kpiStats.staleCount})
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <KpiStatCard
          label="Total Businesses"
          value={kpiStats.total}
          subtext="Registered tenant instances"
          Icon={Building2}
        />
        <KpiStatCard
          label="Stale for Purge"
          value={kpiStats.staleCount}
          subtext="Expired >45 days ago"
          tone={kpiStats.staleCount > 0 ? "danger" : "default"}
          Icon={Trash2}
        />
        <KpiStatCard
          label="Warning Phase"
          value={kpiStats.warningCount}
          subtext="Expired 15-45 days ago"
          tone={kpiStats.warningCount > 0 ? "warning" : "default"}
          Icon={Clock}
        />
        <KpiStatCard
          label="Grace Period"
          value={kpiStats.graceCount}
          subtext="Expired <15d (Keep for renewal)"
          tone="default"
          Icon={Calendar}
        />
        <KpiStatCard
          label="Active Pro (Protected)"
          value={kpiStats.proCount}
          subtext="Paid licenses (Never purged)"
          tone="positive"
          Icon={ShieldCheck}
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-slate-100 border border-slate-200 h-auto p-1 rounded-xl flex overflow-x-auto scrollbar-hide justify-start gap-1">
          <TabsTrigger
            value="tenants"
            className="text-xs font-semibold px-4 py-2 gap-1.5 rounded-lg whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <Building2 className="h-3.5 w-3.5" /> Tenant Lifecycle & Purge
          </TabsTrigger>
          <TabsTrigger
            value="meta_automation"
            className="text-xs font-semibold px-4 py-2 gap-1.5 rounded-lg whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <Zap className="h-3.5 w-3.5 text-emerald-600" />
            Meta API Templates & Auto-Send
            <span
              className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                platformMetaConfig.isVerified
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {platformMetaConfig.isVerified ? `${syncedMetaTemplates.length} Synced` : "Setup"}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="text-xs font-semibold px-4 py-2 gap-1.5 rounded-lg whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <BellRing className="h-3.5 w-3.5 text-blue-600" /> Outreach History & Copy
          </TabsTrigger>
          <TabsTrigger
            value="policy"
            className="text-xs font-semibold px-4 py-2 gap-1.5 rounded-lg whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Frontend Deletion Policy
          </TabsTrigger>
          <TabsTrigger
            value="subcollections"
            className="text-xs font-semibold px-4 py-2 gap-1.5 rounded-lg whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <Layers className="h-3.5 w-3.5" /> Subcollections ({KNOWN_BUSINESS_SUBCOLLECTIONS.length})
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className="text-xs font-semibold px-4 py-2 gap-1.5 rounded-lg whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <History className="h-3.5 w-3.5" /> Purge Logs
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: TENANT LIFECYCLE & PURGE */}
        <TabsContent value="tenants" className="space-y-4 outline-none">
          <SectionCard
            title="Tenant Lifecycle Registry"
            description="Inspect subcollection counts, extend trials, or permanently purge inactive demo businesses."
            bodyClassName="p-0"
          >
            {/* Toolbar: Search and Filter Chips */}
            <div className="p-3.5 sm:p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by business name, ID, or owner email..."
                  className="pl-8 h-9 rounded-lg bg-white border-slate-200 text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                {[
                  { id: "all", label: "All Businesses" },
                  { id: "stale_purge", label: "Stale (>45d)" },
                  { id: "warning", label: "Warning (15-45d)" },
                  { id: "grace_period", label: "Grace (0-14d)" },
                  { id: "healthy_trial", label: "Active Trial" },
                  { id: "pro", label: "Pro" },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setStatusFilter(chip.id)}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
                      statusFilter === chip.id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tenants Table */}
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-3 px-4 sm:px-6">Business Instance</th>
                    <th className="py-3 px-4">Owner Info</th>
                    <th className="py-3 px-3 text-center">Lifecycle Status</th>
                    <th className="py-3 px-3 text-center">Days Stale</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Management Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {bizLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        Scanning businesses from Firestore...
                      </td>
                    </tr>
                  ) : categorizedTenants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No businesses match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    categorizedTenants.map((biz) => {
                      const { lifecycle } = biz;
                      return (
                        <tr
                          key={biz.id}
                          className="hover:bg-slate-50/70 transition-colors group"
                        >
                          <td className="py-3.5 px-4 sm:px-6">
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-900">{biz.name || "Unnamed Business"}</p>
                              <p className="font-mono text-[10px] text-slate-400">{biz.id}</p>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <p className="font-medium text-slate-800">{biz.ownerEmail || biz.email || "No email"}</p>
                              {biz.phone && (
                                <p className="font-mono text-[10px] text-slate-500">{biz.phone}</p>
                              )}
                              {biz.lastNotifiedAt && (
                                <div className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 w-fit mt-1 font-mono">
                                  <BellRing className="h-2.5 w-2.5" />
                                  <span>
                                    Notified {Math.max(0, Math.floor((Date.now() - new Date(biz.lastNotifiedAt).getTime()) / (86400 * 1000)))}d ago
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[11px] font-semibold px-2 py-0.5 border ${lifecycle.badgeClass}`}
                            >
                              {lifecycle.label}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono tabular-nums">
                            {lifecycle.daysExpired > 0 ? (
                              <span className="font-bold text-rose-600">+{lifecycle.daysExpired}d</span>
                            ) : lifecycle.daysExpired === -9999 ? (
                              <span className="text-slate-400">N/A</span>
                            ) : (
                              <span className="text-emerald-600">{Math.abs(lifecycle.daysExpired)}d left</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 sm:px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Notify Outreach Button */}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenNotify(biz)}
                                className={`h-8 px-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                                  biz.lastNotifiedAt
                                    ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                                    : "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                                }`}
                                title="Send WhatsApp or Email re-engagement alert"
                              >
                                <MessageSquare className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                                {biz.lastNotifiedAt ? "Re-notify" : "Notify"}
                              </Button>

                              {/* Inspect Button */}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleInspect(biz)}
                                className="h-8 px-2.5 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 text-xs"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1 text-slate-500" />
                                Inspect
                              </Button>

                              {/* Extend Trial */}
                              {lifecycle.category !== "pro" && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleExtendTrial(biz)}
                                  className="h-8 px-2 rounded-lg border-slate-200 text-blue-700 hover:bg-blue-50 text-xs"
                                  title="Extend trial by +15 days"
                                >
                                  +15d
                                </Button>
                              )}

                              {/* Purge Button */}
                              {lifecycle.category !== "pro" ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenPurge(biz)}
                                  className="h-8 px-2.5 rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 text-xs"
                                  title="Permanently purge business and all subcollections"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                                  Purge
                                </Button>
                              ) : (
                                <span className="inline-flex items-center text-[11px] text-emerald-700 font-medium px-2 py-1 bg-emerald-50 rounded-md">
                                  <Lock className="h-3 w-3 mr-1" /> Protected
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>

        {/* TAB 2: FRONTEND DELETION RETENTION POLICY */}
        <TabsContent value="policy" className="space-y-6 outline-none">
          <SectionCard
            title="Global Frontend Deletion Behavior"
            description="Choose how Biztrix handles deletions when staff or merchants click 'Delete' in Billing, Inventory, Customers, or Leads."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Option A: Immediate Hard Delete */}
              <div
                onClick={() => handleToggleRetentionPolicy(true)}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  retentionPolicy?.immediateHardDelete !== false
                    ? "border-emerald-600 bg-emerald-50/50 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        Immediate Permanent Hard Delete (Recommended)
                      </span>
                      {retentionPolicy?.immediateHardDelete !== false && (
                        <Badge className="bg-emerald-600 text-white text-[10px]">Active</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Jab bhi koi user frontend se koi product, customer, lead ya record delete karega, Firestore se turant <code>deleteDoc</code> chala kar document permanently delete kar diya jayega. Database me koi orphan data nahi bachega.
                    </p>
                  </div>
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    retentionPolicy?.immediateHardDelete !== false
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-300"
                  }`}>
                    {retentionPolicy?.immediateHardDelete !== false && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </div>
              </div>

              {/* Option B: Soft Delete with 30-Day Auto Purge */}
              <div
                onClick={() => handleToggleRetentionPolicy(false)}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  retentionPolicy?.immediateHardDelete === false
                    ? "border-indigo-600 bg-indigo-50/50 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        Soft Delete (Archive / Recycle Bin)
                      </span>
                      {retentionPolicy?.immediateHardDelete === false && (
                        <Badge className="bg-indigo-600 text-white text-[10px]">Active</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Frontend se delete karne par document <code>isDeleted: true</code> mark hota hai. Ye 30 din tak Firestore me bacha rehta hai jisse galti se delete hua record restore kiya ja sake. 30 din baad cleanup page se use permanently purge kiya ja sakta hai.
                    </p>
                  </div>
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    retentionPolicy?.immediateHardDelete === false
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-300"
                  }`}>
                    {retentionPolicy?.immediateHardDelete === false && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* TAB 3: TRACKED SUBCOLLECTIONS */}
        <TabsContent value="subcollections" className="space-y-4 outline-none">
          <SectionCard
            title="Subcollections Tracked in Deep Recursive Clean"
            description="Jab aap kisi business ko purge karte hain, toh Biztrix in sabhi 38 subcollections ke documents ko batch me scan aur wipe karta hai."
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2">
              {KNOWN_BUSINESS_SUBCOLLECTIONS.map((sub, idx) => (
                <div
                  key={sub}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2 text-xs font-mono text-slate-800"
                >
                  <span className="h-5 w-5 rounded-md bg-white border border-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span className="truncate">{sub}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* TAB 4: AUDIT HISTORY */}
        <TabsContent value="logs" className="space-y-4 outline-none">
          <SectionCard
            title="Database Cleanup Audit Trail"
            description="Har purge aur cleanup action ka permanent server audit log yahan maintain hota hai."
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-3 px-4 sm:px-6">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Business Target</th>
                    <th className="py-3 px-4 text-center">Docs Purged</th>
                    <th className="py-3 px-4 sm:px-6">Triggered By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {!cleanupLogs || cleanupLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No purge actions recorded yet. All operations will log here automatically.
                      </td>
                    </tr>
                  ) : (
                    cleanupLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 sm:px-6 font-mono text-slate-500">
                          {log.timestamp?.toDate
                            ? log.timestamp.toDate().toLocaleString()
                            : "Recent"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {log.action}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          {log.businessName} ({log.businessId})
                        </td>
                        <td className="py-3 px-4 text-center font-bold font-mono text-rose-600">
                          {log.deletedDocsCount}
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-slate-600">
                          {log.triggeredBy}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>

        {/* TAB 5: RE-ENGAGEMENT & NOTIFICATIONS HUB */}
        <TabsContent value="notifications" className="space-y-6 outline-none">
          {/* Quick Engine Telemetry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Active Templates</span>
                <Sparkles className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{LIFECYCLE_NOTIFICATION_TEMPLATES.length}</p>
              <p className="text-[11px] text-slate-500">4 WhatsApp & 4 Email lifecycle flows</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">1-Click WhatsApp</span>
                <MessageSquare className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-emerald-700 flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="h-4 w-4" /> Ready (wa.me)
              </p>
              <p className="text-[11px] text-slate-500">Instant browser launch, zero Meta fees</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Meta Cloud API</span>
                <Send className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-sm font-bold text-blue-700 flex items-center gap-1.5 mt-1">
                <ShieldCheck className="h-4 w-4" /> Integrated
              </p>
              <p className="text-[11px] text-slate-500">Background automated dispatch</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Anti-Spam Cooldown</span>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">7 Days</p>
              <p className="text-[11px] text-slate-500">Prevents repetitive messaging to tenants</p>
            </div>
          </div>

          {/* Pre-configured Templates Catalog */}
          <SectionCard
            title="Pre-configured Lifecycle Templates Catalog"
            description="Personalized copy mapped to each tenant stage with automatic variable replacement for Business Name, Expiry Days, and Direct Reactivation links."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LIFECYCLE_NOTIFICATION_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {tpl.channel === "whatsapp" ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold text-[10px]">
                            <MessageSquare className="h-3 w-3 mr-1" /> WhatsApp
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300 font-semibold text-[10px]">
                            <Mail className="h-3 w-3 mr-1" /> Email
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] uppercase font-mono tracking-wider">
                          {tpl.stage.replace("_", " ")}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const text = tpl.subject ? `Subject: ${tpl.subject}\n\n${tpl.body}` : tpl.body;
                          navigator.clipboard.writeText(text);
                          toast({ title: "Template Copied", description: `${tpl.title} copied to clipboard.` });
                        }}
                        className="h-7 px-2 text-[11px] text-slate-600 hover:text-slate-900"
                      >
                        <Copy className="h-3 w-3 mr-1" /> Copy
                      </Button>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900">{tpl.title}</h4>
                    <p className="text-[11px] text-slate-500">{tpl.description}</p>
                    {tpl.subject && (
                      <p className="text-xs font-medium text-slate-700 bg-white p-2 rounded-lg border border-slate-200 font-mono">
                        <span className="text-slate-400 font-normal">Subject: </span>
                        {tpl.subject}
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                    {tpl.body}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Outreach History Audit Log */}
          <SectionCard
            title="Outreach Dispatch History"
            description="Live log of all notifications sent to stale and expiring tenants (/system/logs/cleanup_notifications)."
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-3 px-4 sm:px-6">Timestamp</th>
                    <th className="py-3 px-4">Business Target</th>
                    <th className="py-3 px-3 text-center">Channel</th>
                    <th className="py-3 px-3 text-center">Stage</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Message Excerpt</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Sent By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {!notificationLogs || notificationLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No notifications sent yet. Use the &quot;Notify&quot; button in the Tenant Registry to send alerts.
                      </td>
                    </tr>
                  ) : (
                    notificationLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 sm:px-6 font-mono text-slate-500 whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : "Recent"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {log.businessName || log.businessId}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {String(log.channel || "").includes("whatsapp") ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                              WhatsApp
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300 text-[10px]">
                              Email
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-[11px] font-mono capitalize text-slate-600">{log.stage}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-800">
                          {log.recipientPhone || log.recipientEmail || "N/A"}
                        </td>
                        <td className="py-3 px-4 text-slate-600 truncate max-w-xs" title={log.messageExcerpt}>
                          {log.messageExcerpt}
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-right text-slate-500 font-mono text-[11px]">
                          {log.sentBy}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>

        {/* TAB 6: META API TEMPLATES & AUTOMATED OUTREACH MANAGER */}
        <TabsContent value="meta_automation" className="space-y-6 outline-none">
          <MetaTemplateAutomationManager
            firestore={firestore}
            callerEmail={user?.email || undefined}
            rawBusinesses={rawBusinesses || []}
            savedConfigDoc={savedMetaOutreachDoc}
            syncedTemplates={syncedMetaTemplates}
            onSyncedTemplatesChange={setSyncedMetaTemplates}
          />
        </TabsContent>
      </Tabs>

      {/* INSPECTION MODAL */}
      <Dialog open={inspectModalOpen} onOpenChange={setInspectModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Live Subcollection Inspection
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Document counts inside &quot;{inspectingBiz?.name}&quot; ({inspectingBiz?.id})
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {isInspecting ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Scanning subcollections from Firestore...
              </div>
            ) : inspectCounts ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(inspectCounts).map(([sub, count]) => (
                  <div
                    key={sub}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                  >
                    <span className="font-mono text-slate-700 capitalize">{sub}</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {count} docs
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No data found.</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInspectModalOpen(false)}
              className="h-9 rounded-xl border-slate-200 text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM SINGLE PURGE MODAL */}
      <Dialog open={purgeModalOpen} onOpenChange={setPurgeModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white p-6">
          <DialogHeader>
            <div className="h-12 w-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-2">
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              Permanently Purge Business?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 leading-relaxed">
              This will permanently delete <strong>{bizToPurge?.name}</strong> and all associated Firestore subcollections (products, orders, cashbook, invoices, team members). This action <strong>cannot be undone</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <p className="text-xs text-slate-700 font-medium">
              Type <span className="font-mono font-bold text-rose-600">DELETE</span> to confirm:
            </p>
            <Input
              value={purgeConfirmInput}
              onChange={(e) => setPurgeConfirmInput(e.target.value)}
              placeholder="Type DELETE..."
              className="h-10 rounded-xl border-slate-300 text-sm font-mono"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPurgeModalOpen(false)}
              disabled={isPurging}
              className="h-10 rounded-xl border-slate-200 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={purgeConfirmInput.trim().toUpperCase() !== "DELETE" || isPurging}
              onClick={handleExecutePurge}
              className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              {isPurging ? "Purging Subcollections..." : "Confirm Permanent Purge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM BATCH PURGE MODAL */}
      <Dialog open={batchModalOpen} onOpenChange={setBatchModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white p-6">
          <DialogHeader>
            <div className="h-12 w-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-2">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              Batch Purge Stale Trials ({kpiStats.staleCount} Businesses)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 leading-relaxed">
              All trial businesses expired for more than <strong>60 days</strong> will be permanently wiped out along with their subcollections. Active Pro and recently expired businesses will remain safe and untouched.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() => setBatchModalOpen(false)}
              disabled={isBatchPurging}
              className="h-10 rounded-xl border-slate-200 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isBatchPurging}
              onClick={handleBatchPurge}
              className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              {isBatchPurging ? "Purging Inactive Tenants..." : "Execute Batch Purge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SEND LIFECYCLE NOTIFICATION MODAL */}
      <Dialog open={notifyModalOpen} onOpenChange={setNotifyModalOpen}>
        <DialogContent className="max-w-2xl rounded-2xl bg-white p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                {notifyChannel === "whatsapp" ? (
                  <MessageSquare className="h-5 w-5" />
                ) : (
                  <Mail className="h-5 w-5" />
                )}
              </div>
              <div className="text-left">
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Send Re-engagement Outreach</span>
                  <Badge variant="outline" className="text-xs font-mono font-normal">
                    {bizToNotify?.name || bizToNotify?.id}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Deliver personalized re-engagement alert via WhatsApp or Email.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Cooldown Warning Banner if notified recently */}
          {bizToNotify && isNotificationOnCooldown(bizToNotify.lastNotifiedAt, 7).onCooldown && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Recently Notified Notice</p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  This tenant was already notified {isNotificationOnCooldown(bizToNotify.lastNotifiedAt, 7).daysAgo} days ago via {bizToNotify.lastNotifiedChannel || "outreach"}. You can still proceed if urgent.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4 pt-2">
            {/* Channel Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Delivery Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSwitchChannel("whatsapp")}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    notifyChannel === "whatsapp"
                      ? "border-emerald-500 bg-emerald-50/80 text-emerald-950 shadow-xs ring-1 ring-emerald-400"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  <span>WhatsApp (1-Click & Meta API)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchChannel("email")}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    notifyChannel === "email"
                      ? "border-blue-500 bg-blue-50/80 text-blue-950 shadow-xs ring-1 ring-blue-400"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span>Email (1-Click Mailto & HTML)</span>
                </button>
              </div>
            </div>

            {/* Meta API Template Selector Box (when WhatsApp channel selected) */}
            {notifyChannel === "whatsapp" && (
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-blue-600" />
                    Meta Cloud API Template (Automated Send)
                  </span>
                  {platformMetaConfig.isVerified ? (
                    <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px]">
                      Meta Connected ({platformMetaConfig.verifiedDisplayPhone || platformMetaConfig.phoneId})
                    </Badge>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setNotifyModalOpen(false);
                        setActiveTab("meta_automation");
                      }}
                      className="text-[11px] font-semibold text-blue-700 underline hover:text-blue-900"
                    >
                      Setup Meta API & Templates →
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    {syncedMetaTemplates.length > 0 ? (
                      <select
                        value={selectedMetaTemplateName}
                        onChange={(e) => {
                          const name = e.target.value;
                          setSelectedMetaTemplateName(name);
                          const matched = syncedMetaTemplates.find((t) => t.name === name);
                          if (matched?.language) setSelectedMetaTemplateLang(matched.language);
                        }}
                        className="w-full h-9 px-2.5 rounded-lg border border-blue-200 bg-white text-xs font-mono text-slate-800"
                      >
                        {!syncedMetaTemplates.some((t) => t.name === selectedMetaTemplateName) &&
                          selectedMetaTemplateName && (
                            <option value={selectedMetaTemplateName}>
                              {selectedMetaTemplateName} (Mapped)
                            </option>
                          )}
                        {syncedMetaTemplates
                          .filter((t) => String(t.status || "").toUpperCase() === "APPROVED")
                          .map((t) => (
                            <option key={`${t.name}_${t.language}`} value={t.name}>
                              {t.name} ({t.language})
                            </option>
                          ))}
                      </select>
                    ) : (
                      <Input
                        value={selectedMetaTemplateName}
                        onChange={(e) => setSelectedMetaTemplateName(e.target.value)}
                        placeholder="Meta template name (e.g. biztrix_grace_extension)"
                        className="h-9 rounded-lg border-blue-200 bg-white font-mono text-xs"
                      />
                    )}
                  </div>
                  <div>
                    <Input
                      value={selectedMetaTemplateLang}
                      onChange={(e) => setSelectedMetaTemplateLang(e.target.value)}
                      placeholder="en_US"
                      className="h-9 rounded-lg border-blue-200 bg-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Template Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                {notifyChannel === "whatsapp"
                  ? "1-Click WhatsApp (wa.me) Message Template"
                  : "Lifecycle Email Template"}
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                {LIFECYCLE_NOTIFICATION_TEMPLATES.filter((t) => t.channel === notifyChannel).map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    [{tpl.stage.toUpperCase()}] {tpl.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Recipient Coordinates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Recipient Phone (WhatsApp)
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={notifyPhone}
                    onChange={(e) => setNotifyPhone(e.target.value)}
                    placeholder="10-digit mobile number..."
                    className="pl-8 h-9 rounded-xl border-slate-300 text-xs font-mono"
                  />
                </div>
                {notifyPhone && (
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    Formatted: +{cleanWhatsAppPhone(notifyPhone) || "Invalid"}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Recipient Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder="merchant@example.com..."
                    className="pl-8 h-9 rounded-xl border-slate-300 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Email Subject Line (if Email channel) */}
            {notifyChannel === "email" && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Email Subject
                </label>
                <Input
                  value={notifySubject}
                  onChange={(e) => setNotifySubject(e.target.value)}
                  placeholder="Subject line..."
                  className="h-9 rounded-xl border-slate-300 text-xs font-medium"
                />
              </div>
            )}

            {/* Message Body */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Message Content (Editable)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {notifyMessageText.length} chars
                </span>
              </div>
              <textarea
                value={notifyMessageText}
                onChange={(e) => setNotifyMessageText(e.target.value)}
                rows={8}
                className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 font-mono leading-relaxed bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t border-slate-100 flex-wrap sm:flex-nowrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyNotification}
              className="h-10 rounded-xl border-slate-200 text-xs"
            >
              {copiedNotification ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy Text
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNotifyModalOpen(false)}
              className="h-10 rounded-xl border-slate-200 text-xs ml-auto"
            >
              Cancel
            </Button>

            {notifyChannel === "whatsapp" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSendingNotification || !notifyPhone}
                  onClick={handleSendWhatsAppMeta}
                  className="h-10 px-3.5 rounded-xl border-blue-300 bg-blue-50/60 text-blue-800 hover:bg-blue-100 text-xs font-semibold"
                  title="Deliver via Meta Cloud API using system token"
                >
                  <Send className="h-3.5 w-3.5 mr-1 text-blue-600" />
                  Send via Meta API
                </Button>
                <Button
                  type="button"
                  disabled={isSendingNotification || !notifyPhone}
                  onClick={handleSendWhatsAppDirect}
                  className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1" />
                  Open in WhatsApp (wa.me)
                </Button>
              </>
            ) : (
              <Button
                type="button"
                disabled={isSendingNotification || !notifyEmail}
                onClick={handleSendEmailDirect}
                className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
              >
                <Mail className="h-3.5 w-3.5 mr-1" />
                Open Email Client (Mailto)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
