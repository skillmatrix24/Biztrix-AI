"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Loader2,
  MessageSquare,
  Play,
  Plus,
  RefreshCcw,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Wand2,
  X,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "@/components/ui/editorial";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Firestore } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { NotificationStage, cleanWhatsAppPhone } from "@/lib/cleanup-notifications";
import {
  PlatformMetaOutreachConfig,
  MetaTemplateRecord,
  MetaOutreachVariableKey,
  META_VARIABLE_OPTIONS,
  RECOMMENDED_META_TEMPLATES,
  RecommendedMetaTemplateBlueprint,
  normalizePlatformMetaConfig,
  sanitizeMetaTemplateName,
  extractMetaTemplatePlaceholderCount,
  buildMetaTemplateBodyComponents,
  getAutoDispatchCandidates,
} from "@/lib/meta-outreach-automation";
import {
  savePlatformMetaOutreachConfigClient,
  recordTenantNotificationSentClient,
} from "@/lib/cleanup-client";
import {
  verifyPlatformWhatsAppConnection,
  listWhatsAppTemplates,
  createPlatformWhatsAppTemplate,
  deletePlatformWhatsAppTemplate,
  sendWhatsAppTemplate,
} from "@/app/actions/whatsapp-actions";

const STAGE_META: Array<{
  stage: NotificationStage;
  title: string;
  triggerRule: string;
  badgeClass: string;
}> = [
  {
    stage: "pre_expiry",
    title: "Stage 1: Pre-Expiry Alert",
    triggerRule: "0–2 days before trial ends",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
  },
  {
    stage: "grace",
    title: "Stage 2: Grace Period Reminder",
    triggerRule: "1–14 days after expiry",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    stage: "warning",
    title: "Stage 3: Stale Win-Back",
    triggerRule: "15–49 days inactive",
    badgeClass: "bg-orange-50 text-orange-800 border-orange-200",
  },
  {
    stage: "purge_warning",
    title: "Stage 4: Final Purge Notice",
    triggerRule: "50+ days expired (Pre-Purge)",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
  },
];

const LANGUAGES = [
  { code: "en_US", label: "English (US)" },
  { code: "en_IN", label: "English (India)" },
  { code: "hi", label: "Hindi (hi)" },
  { code: "mr", label: "Marathi (mr)" },
];

interface MetaTemplateAutomationManagerProps {
  firestore: Firestore;
  callerEmail?: string;
  rawBusinesses: any[];
  savedConfigDoc: any;
  syncedTemplates: MetaTemplateRecord[];
  onSyncedTemplatesChange: (templates: MetaTemplateRecord[]) => void;
}

export function MetaTemplateAutomationManager({
  firestore,
  callerEmail,
  rawBusinesses,
  savedConfigDoc,
  syncedTemplates,
  onSyncedTemplatesChange,
}: MetaTemplateAutomationManagerProps) {
  const [config, setConfig] = useState<PlatformMetaOutreachConfig>(() =>
    normalizePlatformMetaConfig(savedConfigDoc)
  );
  const [showToken, setShowToken] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSyncingTemplates, setIsSyncingTemplates] = useState(false);
  const [templateStatusFilter, setTemplateStatusFilter] = useState<string>("ALL");
  const [deletingTemplateName, setDeletingTemplateName] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(null);

  // Create Template Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTplName, setNewTplName] = useState("");
  const [newTplCategory, setNewTplCategory] = useState<"UTILITY" | "MARKETING">("UTILITY");
  const [newTplLanguage, setNewTplLanguage] = useState("en_US");
  const [newTplBody, setNewTplBody] = useState("");
  const [newTplExamples, setNewTplExamples] = useState<string[]>(["Rajesh Sharma", "Sharma Traders", "10", "https://biztrix.in/pricing"]);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

  // Batch Auto-Dispatch State
  const [selectedBatchStages, setSelectedBatchStages] = useState<NotificationStage[]>([
    "grace",
    "warning",
    "purge_warning",
  ]);
  const [bypassCooldown, setBypassCooldown] = useState(false);
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgressText, setBatchProgressText] = useState("");
  const [batchResultSummary, setBatchResultSummary] = useState<{
    sent: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // Test Single Template State
  const [testStage, setTestStage] = useState<NotificationStage>("grace");
  const [testPhone, setTestPhone] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Sync local state when Firestore config doc loads or updates
  const savedConfigKey = savedConfigDoc?.updatedAt || savedConfigDoc?.phoneId || "";
  useEffect(() => {
    if (savedConfigDoc) {
      setConfig(normalizePlatformMetaConfig(savedConfigDoc));
    }
  }, [savedConfigKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const approvedTemplates = useMemo(
    () => syncedTemplates.filter((t) => String(t.status || "").toUpperCase() === "APPROVED"),
    [syncedTemplates]
  );

  const filteredTemplates = useMemo(() => {
    if (templateStatusFilter === "ALL") return syncedTemplates;
    return syncedTemplates.filter(
      (t) => String(t.status || "").toUpperCase() === templateStatusFilter
    );
  }, [syncedTemplates, templateStatusFilter]);

  const detectedNewTplParamCount = useMemo(
    () => extractMetaTemplatePlaceholderCount(newTplBody),
    [newTplBody]
  );

  // Eligible batch candidates preview
  const dispatchPreview = useMemo(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://biztrix.in";
    return getAutoDispatchCandidates(rawBusinesses, config, {
      origin,
      stagesFilter: selectedBatchStages,
      bypassCooldown,
    });
  }, [rawBusinesses, config, selectedBatchStages, bypassCooldown]);

  const handleSaveConfig = async (overrideConfig?: PlatformMetaOutreachConfig) => {
    const payload = overrideConfig || config;
    setIsSavingConfig(true);
    const res = await savePlatformMetaOutreachConfigClient(firestore, payload, callerEmail);
    setIsSavingConfig(false);

    if (res.success) {
      toast({
        title: "Meta Automation Settings Saved",
        description: "Credentials, stage mappings, and variable bindings saved securely.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: res.error || "Could not persist Meta configuration.",
      });
    }
  };

  const handleVerifyAndSync = async () => {
    if (!config.phoneId.trim() || !config.wabaId.trim() || !config.accessToken.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Meta Credentials",
        description: "Enter Phone Number ID, WABA ID, and System User Access Token first.",
      });
      return;
    }

    setIsVerifying(true);
    const res = await verifyPlatformWhatsAppConnection({
      phoneId: config.phoneId,
      wabaId: config.wabaId,
      accessToken: config.accessToken,
    });
    setIsVerifying(false);

    if (res.success) {
      const nextConfig: PlatformMetaOutreachConfig = {
        ...config,
        isVerified: true,
        verifiedName: res.verifiedName || "",
        verifiedDisplayPhone: res.displayPhoneNumber || "",
      };
      setConfig(nextConfig);
      onSyncedTemplatesChange(res.templates || []);
      await savePlatformMetaOutreachConfigClient(firestore, nextConfig, callerEmail);
      toast({
        title: "Meta Cloud API Connected",
        description: `Verified "${res.verifiedName}" (${res.displayPhoneNumber || config.phoneId}) and synced ${(res.templates || []).length} templates.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Meta Verification Failed",
        description: res.error || "Check your Phone Number ID, WABA ID, and Token permissions.",
      });
    }
  };

  const handleSyncTemplatesOnly = async () => {
    if (!config.wabaId.trim() || !config.accessToken.trim()) {
      toast({
        variant: "destructive",
        title: "WABA Credentials Required",
        description: "Save your WABA ID and Access Token above to sync templates.",
      });
      return;
    }
    setIsSyncingTemplates(true);
    const res = await listWhatsAppTemplates({
      wabaId: config.wabaId,
      accessToken: config.accessToken,
    });
    setIsSyncingTemplates(false);

    if (res.success) {
      onSyncedTemplatesChange(res.templates || []);
      toast({
        title: "Meta Templates Synced",
        description: `Loaded ${(res.templates || []).length} templates from your Meta WABA.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: res.error || "Unable to fetch templates from Meta.",
      });
    }
  };

  const handleOpenCreateModal = (preset?: RecommendedMetaTemplateBlueprint) => {
    if (preset) {
      setNewTplName(preset.name);
      setNewTplCategory(preset.category);
      setNewTplLanguage(preset.language);
      setNewTplBody(preset.bodyText);
      setNewTplExamples([...preset.exampleValues]);
    } else {
      setNewTplName("");
      setNewTplCategory("UTILITY");
      setNewTplLanguage("en_US");
      setNewTplBody(
        "Namaste {{1}}, reminder for your business {{2}} regarding account activity ({{3}} days). Visit {{4}} to continue."
      );
      setNewTplExamples(["Rajesh Sharma", "Sharma Traders", "15", "https://biztrix.in/pricing"]);
    }
    setCreateModalOpen(true);
  };

  const handleSubmitNewTemplate = async () => {
    const cleanName = sanitizeMetaTemplateName(newTplName);
    if (!cleanName || cleanName.length < 3) {
      toast({
        variant: "destructive",
        title: "Invalid Template Name",
        description: "Use lowercase letters, numbers, and underscores (min 3 chars).",
      });
      return;
    }
    if (!newTplBody.trim()) {
      toast({
        variant: "destructive",
        title: "Body Required",
        description: "Please enter template message body text.",
      });
      return;
    }
    if (!config.wabaId.trim() || !config.accessToken.trim()) {
      toast({
        variant: "destructive",
        title: "Connect Meta API First",
        description: "Enter and save your WABA ID and Access Token before submitting templates.",
      });
      return;
    }

    const bodyComponent: any = {
      type: "BODY",
      text: newTplBody.trim(),
    };
    if (detectedNewTplParamCount > 0) {
      const sampleRow = Array.from({ length: detectedNewTplParamCount }).map(
        (_, i) => (newTplExamples[i] || `Sample${i + 1}`).trim()
      );
      bodyComponent.example = {
        body_text: [sampleRow],
      };
    }

    setIsCreatingTemplate(true);
    const res = await createPlatformWhatsAppTemplate(
      { wabaId: config.wabaId, accessToken: config.accessToken },
      {
        name: cleanName,
        category: newTplCategory,
        language: newTplLanguage,
        components: [bodyComponent],
      }
    );
    setIsCreatingTemplate(false);

    if (res.success) {
      setCreateModalOpen(false);
      toast({
        title: "Submitted to Meta for Approval",
        description: `Template "${cleanName}" created on Meta WABA. Syncing status...`,
      });
      await handleSyncTemplatesOnly();
    } else {
      toast({
        variant: "destructive",
        title: "Meta Submission Rejected",
        description: res.error || "Meta rejected this template format.",
      });
    }
  };

  const handleDeleteTemplate = async (templateName: string) => {
    setDeletingTemplateName(templateName);
    const res = await deletePlatformWhatsAppTemplate(
      { wabaId: config.wabaId, accessToken: config.accessToken },
      templateName
    );
    setDeletingTemplateName(null);
    setConfirmDeleteName(null);

    if (res.success) {
      onSyncedTemplatesChange(syncedTemplates.filter((t) => t.name !== templateName));
      toast({
        title: "Template Deleted",
        description: `"${templateName}" removed from Meta WABA.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: res.error || "Could not delete template from Meta.",
      });
    }
  };

  const updateStageMapping = (
    stage: NotificationStage,
    patch: Partial<PlatformMetaOutreachConfig["stageMappings"][NotificationStage]>
  ) => {
    setConfig((prev) => ({
      ...prev,
      stageMappings: {
        ...prev.stageMappings,
        [stage]: {
          ...prev.stageMappings[stage],
          ...patch,
        },
      },
    }));
  };

  const handlePickSyncedTemplateForStage = (stage: NotificationStage, tplName: string) => {
    const matched = syncedTemplates.find((t) => t.name === tplName);
    const current = config.stageMappings[stage];
    const nextPatch: Partial<typeof current> = { templateName: tplName };

    if (matched) {
      nextPatch.languageCode = matched.language || current.languageCode;
      const neededCount = extractMetaTemplatePlaceholderCount(matched);
      const defaultOrder: MetaOutreachVariableKey[] = [
        "ownerName",
        "businessName",
        "daysStale",
        "renewUrl",
        "supportPhone",
      ];
      nextPatch.bodyParamKeys = Array.from({ length: neededCount }).map(
        (_, i) => current.bodyParamKeys[i] || defaultOrder[i] || "custom"
      );
    }

    updateStageMapping(stage, nextPatch);
  };

  const handleSendTestStageTemplate = async () => {
    const cleanPhone = cleanWhatsAppPhone(testPhone);
    if (!cleanPhone || cleanPhone.length < 10) {
      toast({
        variant: "destructive",
        title: "Invalid Test Phone",
        description: "Enter a 10-digit WhatsApp number to send a live test.",
      });
      return;
    }
    if (!config.phoneId || !config.accessToken) {
      toast({
        variant: "destructive",
        title: "Meta Credentials Missing",
        description: "Connect your Platform Phone Number ID and Access Token first.",
      });
      return;
    }

    const mapping = config.stageMappings[testStage];
    if (!mapping?.templateName?.trim()) {
      toast({
        variant: "destructive",
        title: "No Template Mapped",
        description: `Select or enter a Meta template name for ${testStage} first.`,
      });
      return;
    }

    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://biztrix.in";
    const { components } = buildMetaTemplateBodyComponents(mapping, {
      ownerName: "Test Owner",
      businessName: "Demo Business OS",
      daysStale: 15,
      renewUrl: `${origin}/pricing`,
      supportPhone: config.supportPhone || "+91 98765 43210",
    });

    setIsSendingTest(true);
    const res = await sendWhatsAppTemplate(
      { phoneId: config.phoneId, accessToken: config.accessToken },
      cleanPhone,
      mapping.templateName.trim(),
      mapping.languageCode || "en_US",
      components
    );
    setIsSendingTest(false);

    if (res.success) {
      toast({
        title: "Test Template Delivered",
        description: `Sent "${mapping.templateName}" (${mapping.languageCode}) to +${cleanPhone}.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Meta Test Failed",
        description: res.error || "Check template approval status and parameter count.",
      });
    }
  };

  const handleRunAutomatedBatchDispatch = async () => {
    if (!config.phoneId || !config.accessToken) {
      toast({
        variant: "destructive",
        title: "Meta API Not Connected",
        description: "Save and verify Platform Meta Cloud API credentials before running batch dispatch.",
      });
      return;
    }

    const candidates = dispatchPreview.eligible;
    if (candidates.length === 0) {
      setBatchConfirmOpen(false);
      return;
    }

    setIsBatchRunning(true);
    setBatchResultSummary(null);
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      setBatchProgressText(`Sending ${i + 1} / ${candidates.length}: ${c.businessName} (${c.templateName})...`);

      const res = await sendWhatsAppTemplate(
        { phoneId: config.phoneId, accessToken: config.accessToken },
        c.phone,
        c.templateName,
        c.languageCode,
        c.components
      );

      if (res.success) {
        sent++;
        await recordTenantNotificationSentClient(firestore, {
          businessId: c.businessId,
          businessName: c.businessName,
          channel: "whatsapp_meta",
          stage: c.stage,
          templateName: c.templateName,
          recipientPhone: c.phone,
          messageText: `[Meta Template: ${c.templateName}] Params: ${c.resolvedValues.join(" | ")}`,
          callerEmail,
        });
      } else {
        failed++;
        errors.push(`${c.businessName}: ${res.error || "Rejected"}`);
      }
    }

    setIsBatchRunning(false);
    setBatchProgressText("");
    setBatchConfirmOpen(false);
    setBatchResultSummary({ sent, failed, errors });

    toast({
      title: "Automated Meta Outreach Finished",
      description: `Delivered to ${sent} tenants${failed > 0 ? `, ${failed} failed` : ""}.`,
      variant: failed > 0 && sent === 0 ? "destructive" : "default",
    });
  };

  const toggleBatchStage = (stage: NotificationStage) => {
    setSelectedBatchStages((prev) =>
      prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]
    );
  };

  const insertPlaceholderIntoNewBody = (num: number) => {
    setNewTplBody((prev) => `${prev}${prev.endsWith(" ") || !prev ? "" : " "}{{${num}}}`);
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: PLATFORM META CLOUD API CREDENTIALS */}
      <SectionCard
        title="Platform Master Meta Cloud API Credentials"
        description="Connect your official Biztrix Meta WhatsApp Business Account (stored securely in Platform Owner private config) to sync, create, and automate template messages."
        headerRight={
          <div className="flex items-center gap-2">
            {config.isVerified ? (
              <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {config.verifiedName || "Verified"}{" "}
                {config.verifiedDisplayPhone ? `(${config.verifiedDisplayPhone})` : ""}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-xs font-semibold">
                Not Verified Yet
              </Badge>
            )}
            <Button asChild variant="outline" size="sm" className="h-8 rounded-lg border-slate-200 text-xs">
              <a
                href="https://business.facebook.com/wa/manage/message-templates/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Meta Manager <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-slate-500" /> Phone Number ID
              </label>
              <Input
                value={config.phoneId}
                onChange={(e) => setConfig({ ...config, phoneId: e.target.value })}
                placeholder="e.g. 42819201938172"
                className="h-9 rounded-xl border-slate-300 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-slate-500" /> WABA ID (Business Account ID)
              </label>
              <Input
                value={config.wabaId}
                onChange={(e) => setConfig({ ...config, wabaId: e.target.value })}
                placeholder="e.g. 10829384719283"
                className="h-9 rounded-xl border-slate-300 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-slate-500" /> System User Access Token
              </label>
              <div className="relative">
                <Input
                  type={showToken ? "text" : "password"}
                  value={config.accessToken}
                  onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                  placeholder="EAAG..."
                  className="h-9 pr-9 rounded-xl border-slate-300 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  title={showToken ? "Hide token" : "Show token"}
                >
                  {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Platform Support Number (for {"{{supportPhone}}"})
              </label>
              <Input
                value={config.supportPhone}
                onChange={(e) => setConfig({ ...config, supportPhone: e.target.value })}
                placeholder="+91 98765 43210"
                className="h-9 rounded-xl border-slate-300 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Anti-Spam Cooldown Window (Days)
              </label>
              <Input
                type="number"
                min={1}
                max={90}
                value={config.cooldownDays}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    cooldownDays: Math.max(1, Math.min(90, Number(e.target.value) || 7)),
                  })
                }
                className="h-9 rounded-xl border-slate-300 font-mono text-xs"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSavingConfig}
                onClick={() => handleSaveConfig()}
                className="h-9 flex-1 rounded-xl border-slate-300 text-xs font-semibold"
              >
                {isSavingConfig ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                )}
                Save Config
              </Button>
              <Button
                type="button"
                disabled={isVerifying}
                onClick={handleVerifyAndSync}
                className="h-9 flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                {isVerifying ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                )}
                Verify & Sync
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* SECTION 2: LIVE META WABA TEMPLATE MANAGER */}
      <SectionCard
        title="Meta API Template Manager (Live WABA Templates)"
        description="Sync approved templates from Meta, submit new lifecycle templates directly to Meta for approval, or remove obsolete templates."
        headerRight={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSyncingTemplates}
              onClick={handleSyncTemplatesOnly}
              className="h-8 rounded-lg border-slate-200 text-xs font-semibold"
            >
              <RefreshCcw className={`h-3.5 w-3.5 mr-1.5 ${isSyncingTemplates ? "animate-spin" : ""}`} />
              Sync from Meta ({syncedTemplates.length})
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleOpenCreateModal()}
              className="h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create Meta Template
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* 1-Click Recommended Lifecycle Blueprints to Submit to Meta */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Wand2 className="h-3.5 w-3.5 text-emerald-600" />
                Quick-Submit Recommended Biztrix Lifecycle Templates to Meta
              </div>
              <span className="text-[11px] text-slate-500">
                Pre-formatted with Meta-compliant {"{{1}}..{{4}}"} variables & sample examples
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {RECOMMENDED_META_TEMPLATES.map((preset) => {
                const existsOnMeta = syncedTemplates.find((t) => t.name === preset.name);
                return (
                  <div
                    key={preset.name}
                    className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[11px] font-bold text-slate-900 truncate">
                          {preset.name}
                        </span>
                        {existsOnMeta ? (
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 ${
                              existsOnMeta.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {existsOnMeta.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-slate-500">
                            {preset.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug">{preset.description}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenCreateModal(preset)}
                      className="h-7 w-full rounded-md text-[11px] font-semibold border-slate-200 hover:bg-slate-100"
                    >
                      {existsOnMeta ? "Clone / View Format" : "Load & Submit to Meta"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filter pills for synced templates */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {["ALL", "APPROVED", "PENDING", "REJECTED"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setTemplateStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  templateStatusFilter === st
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {st} (
                {st === "ALL"
                  ? syncedTemplates.length
                  : syncedTemplates.filter((t) => String(t.status || "").toUpperCase() === st).length}
                )
              </button>
            ))}
          </div>

          {/* Synced Meta Templates Table */}
          {filteredTemplates.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
              <MessageSquare className="h-7 w-7 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">
                {syncedTemplates.length === 0
                  ? "No Meta Templates Synced Yet"
                  : `No templates with status "${templateStatusFilter}"`}
              </p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Enter your Platform WABA ID & System User Token above and click{" "}
                <strong>Verify & Sync</strong> to load your Meta-approved templates, or submit a new
                template directly from here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3.5">Template Name</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Category / Lang</th>
                    <th className="py-2.5 px-3 text-center">Vars</th>
                    <th className="py-2.5 px-3">Body Preview</th>
                    <th className="py-2.5 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTemplates.map((tpl) => {
                    const bodyComp = tpl.components?.find(
                      (c) => String(c.type || "").toUpperCase() === "BODY"
                    );
                    const varCount = extractMetaTemplatePlaceholderCount(tpl);
                    const statusUpper = String(tpl.status || "").toUpperCase();
                    const statusClass =
                      statusUpper === "APPROVED"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : statusUpper === "PENDING"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-rose-50 text-rose-800 border-rose-200";

                    return (
                      <tr key={`${tpl.name}_${tpl.language}`} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                          {tpl.name}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant="outline" className={`text-[10px] font-semibold ${statusClass}`}>
                            {statusUpper}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-[11px] font-mono text-slate-600">
                            {tpl.category} · {tpl.language}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-700">
                          {varCount > 0 ? `{{1}}..{{${varCount}}}` : "None"}
                        </td>
                        <td
                          className="py-3 px-3 text-[11px] text-slate-600 max-w-md truncate"
                          title={bodyComp?.text || ""}
                        >
                          {bodyComp?.text || "—"}
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          {confirmDeleteName === tpl.name ? (
                            <div className="inline-flex items-center gap-1">
                              <Button
                                type="button"
                                size="sm"
                                disabled={deletingTemplateName === tpl.name}
                                onClick={() => handleDeleteTemplate(tpl.name)}
                                className="h-7 px-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[10px]"
                              >
                                {deletingTemplateName === tpl.name ? "Deleting..." : "Confirm"}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmDeleteName(null)}
                                className="h-7 px-2 rounded-md text-[10px]"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmDeleteName(tpl.name)}
                              className="h-7 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-[11px]"
                              title="Delete template from Meta WABA"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SectionCard>

      {/* SECTION 3: LIFECYCLE STAGE-TO-META-TEMPLATE AUTOMATION MAPPING */}
      <SectionCard
        title="Automated Lifecycle Stage → Meta Template Mapping"
        description="Map each Days-Stale lifecycle stage to an approved Meta WhatsApp template and bind {{1}}, {{2}}, {{3}}, {{4}} placeholders automatically to tenant fields."
        headerRight={
          <Button
            type="button"
            size="sm"
            disabled={isSavingConfig}
            onClick={() => handleSaveConfig()}
            className="h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
          >
            {isSavingConfig ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            Save Automation Rules
          </Button>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {STAGE_META.map(({ stage, title, triggerRule, badgeClass }) => {
            const mapping = config.stageMappings[stage];
            return (
              <div
                key={stage}
                className={`p-4 rounded-xl border transition-colors space-y-3.5 ${
                  mapping.enabled
                    ? "border-slate-200 bg-white"
                    : "border-slate-200/70 bg-slate-50/70 opacity-80"
                }`}
              >
                {/* Stage Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{title}</h4>
                      <Badge variant="outline" className={`text-[10px] font-semibold ${badgeClass}`}>
                        {triggerRule}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-500">
                      {mapping.enabled ? "Active" : "Paused"}
                    </span>
                    <Switch
                      checked={mapping.enabled}
                      onCheckedChange={(checked) => updateStageMapping(stage, { enabled: checked })}
                    />
                  </div>
                </div>

                {/* Template Name & Language */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Meta Template Name
                    </label>
                    {approvedTemplates.length > 0 ? (
                      <select
                        value={mapping.templateName}
                        onChange={(e) => handlePickSyncedTemplateForStage(stage, e.target.value)}
                        className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-800"
                      >
                        <option value={mapping.templateName}>
                          {mapping.templateName} (Current)
                        </option>
                        {approvedTemplates
                          .filter((t) => t.name !== mapping.templateName)
                          .map((t) => (
                            <option key={`${t.name}_${t.language}`} value={t.name}>
                              {t.name} ({t.language})
                            </option>
                          ))}
                      </select>
                    ) : (
                      <Input
                        value={mapping.templateName}
                        onChange={(e) =>
                          updateStageMapping(stage, {
                            templateName: sanitizeMetaTemplateName(e.target.value),
                          })
                        }
                        placeholder="e.g. biztrix_grace_extension"
                        className="h-9 rounded-lg border-slate-300 font-mono text-xs"
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">Language</label>
                    <select
                      value={mapping.languageCode}
                      onChange={(e) => updateStageMapping(stage, { languageCode: e.target.value })}
                      className="w-full h-9 px-2 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-800"
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Body Parameter Bindings {{1}}, {{2}}, ... */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600">
                      Template Body Variables ({mapping.bodyParamKeys.length})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateStageMapping(stage, {
                          bodyParamKeys: [...mapping.bodyParamKeys, "ownerName"],
                        })
                      }
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
                    >
                      <Plus className="h-3 w-3" /> Add Variable
                    </button>
                  </div>

                  {mapping.bodyParamKeys.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">
                      No dynamic parameters (static template body).
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {mapping.bodyParamKeys.map((paramKey, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 shrink-0">
                            {`{{${idx + 1}}}`}
                          </span>
                          <select
                            value={paramKey}
                            onChange={(e) => {
                              const next = [...mapping.bodyParamKeys];
                              next[idx] = e.target.value as MetaOutreachVariableKey;
                              updateStageMapping(stage, { bodyParamKeys: next });
                            }}
                            className="flex-1 h-8 px-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
                          >
                            {META_VARIABLE_OPTIONS.map((opt) => (
                              <option key={opt.key} value={opt.key}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          {paramKey === "custom" && (
                            <Input
                              value={mapping.customValues?.[String(idx)] || ""}
                              onChange={(e) =>
                                updateStageMapping(stage, {
                                  customValues: {
                                    ...(mapping.customValues || {}),
                                    [String(idx)]: e.target.value,
                                  },
                                })
                              }
                              placeholder="Fixed text..."
                              className="w-32 h-8 rounded-lg border-slate-300 text-xs"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const next = mapping.bodyParamKeys.filter((_, i) => i !== idx);
                              updateStageMapping(stage, { bodyParamKeys: next });
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title="Remove variable"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* SECTION 4: AUTOMATED BATCH META API RUNNER + LIVE TEST CONSOLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Batch Auto-Dispatch Runner */}
        <div className="lg:col-span-8">
          <SectionCard
            title="Automated Batch Meta API Outreach Runner"
            description="Automatically match all stale & expiring tenants to their stage template, skip recently notified accounts (cooldown), and dispatch via Meta Cloud API."
          >
            <div className="space-y-4">
              {/* Stage Selector Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                {STAGE_META.map((s) => {
                  const active = selectedBatchStages.includes(s.stage);
                  return (
                    <button
                      key={s.stage}
                      type="button"
                      onClick={() => toggleBatchStage(s.stage)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        active
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {s.title.split(":")[1]?.trim() || s.title}
                    </button>
                  );
                })}
              </div>

              {/* Eligibility Breakdown Strip */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <p className="text-[11px] font-semibold text-emerald-800">Eligible to Send Now</p>
                  <p className="text-2xl font-bold text-emerald-950 font-mono">
                    {dispatchPreview.eligible.length}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                  <p className="text-[11px] font-semibold text-amber-800">
                    Skipped (Cooldown {config.cooldownDays}d)
                  </p>
                  <p className="text-2xl font-bold text-amber-950 font-mono">
                    {dispatchPreview.skippedCooldown}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[11px] font-semibold text-slate-600">Skipped (No Phone)</p>
                  <p className="text-2xl font-bold text-slate-900 font-mono">
                    {dispatchPreview.skippedNoPhone}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <Switch checked={bypassCooldown} onCheckedChange={setBypassCooldown} />
                  <span>Override {config.cooldownDays}-day cooldown (urgent re-send)</span>
                </label>

                <Button
                  type="button"
                  disabled={
                    isBatchRunning ||
                    dispatchPreview.eligible.length === 0 ||
                    !config.phoneId ||
                    !config.accessToken
                  }
                  onClick={() => setBatchConfirmOpen(true)}
                  className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                >
                  <Zap className="h-3.5 w-3.5 mr-1.5" />
                  Run Auto-Outreach ({dispatchPreview.eligible.length} Tenants)
                </Button>
              </div>

              {(!config.phoneId || !config.accessToken) && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                  Connect and verify your Platform Meta Phone Number ID & Access Token above to enable automated batch dispatch.
                </p>
              )}

              {batchResultSummary && (
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
                  <p className="font-bold text-slate-900">
                    Last Run Summary: {batchResultSummary.sent} Delivered · {batchResultSummary.failed} Failed
                  </p>
                  {batchResultSummary.errors.length > 0 && (
                    <ul className="text-[11px] text-rose-700 list-disc pl-4 space-y-0.5 max-h-24 overflow-y-auto">
                      {batchResultSummary.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Live Single Test Console */}
        <div className="lg:col-span-4">
          <SectionCard
            title="Test Mapped Template"
            description="Send a live sample Meta template to your own WhatsApp number before batch running."
          >
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">Stage Mapping to Test</label>
                <select
                  value={testStage}
                  onChange={(e) => setTestStage(e.target.value as NotificationStage)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
                >
                  {STAGE_META.map((s) => (
                    <option key={s.stage} value={s.stage}>
                      {s.title} ({config.stageMappings[s.stage]?.templateName || "unset"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">Test WhatsApp Phone</label>
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="9876543210"
                  className="h-9 rounded-lg border-slate-300 font-mono text-xs"
                />
              </div>

              <Button
                type="button"
                disabled={isSendingTest || !testPhone || !config.phoneId || !config.accessToken}
                onClick={handleSendTestStageTemplate}
                className="w-full h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                {isSendingTest ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                )}
                Send Live Test via Meta API
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* CREATE NEW META TEMPLATE MODAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl bg-white p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              Create & Submit Meta WhatsApp Template
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Submits directly to your connected Meta WABA for automated review (usually approved in 1–5 minutes).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 1-Click Preset Loader */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Presets:</span>
              {RECOMMENDED_META_TEMPLATES.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleOpenCreateModal(p)}
                  className="px-2 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[10px] font-mono font-semibold text-slate-700"
                >
                  {p.stage}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1 space-y-1">
                <label className="text-xs font-semibold text-slate-700">Template Name</label>
                <Input
                  value={newTplName}
                  onChange={(e) => setNewTplName(sanitizeMetaTemplateName(e.target.value))}
                  placeholder="biztrix_grace_alert"
                  className="h-9 rounded-lg border-slate-300 font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Category</label>
                <select
                  value={newTplCategory}
                  onChange={(e) => setNewTplCategory(e.target.value as "UTILITY" | "MARKETING")}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
                >
                  <option value="UTILITY">UTILITY (Account/Billing Alerts)</option>
                  <option value="MARKETING">MARKETING (Offers/Win-Back)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Language</label>
                <select
                  value={newTplLanguage}
                  onChange={(e) => setNewTplLanguage(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-800"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label} ({l.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Template Body Text (Use {"{{1}}"}, {"{{2}}"} for variables)
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => insertPlaceholderIntoNewBody(num)}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-mono font-bold text-slate-700"
                    >
                      +{`{{${num}}}`}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={newTplBody}
                onChange={(e) => setNewTplBody(e.target.value)}
                rows={4}
                placeholder="Namaste {{1}}, your trial for {{2}} expired {{3}} days ago..."
                className="w-full p-3 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 leading-relaxed"
              />
            </div>

            {detectedNewTplParamCount > 0 && (
              <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[11px] font-semibold text-slate-700">
                  Sample Example Values (Required by Meta Reviewer)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Array.from({ length: detectedNewTplParamCount }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">
                        {`{{${idx + 1}}}`}
                      </span>
                      <Input
                        value={newTplExamples[idx] || ""}
                        onChange={(e) => {
                          const next = [...newTplExamples];
                          next[idx] = e.target.value;
                          setNewTplExamples(next);
                        }}
                        placeholder={`Example for {{${idx + 1}}}`}
                        className="h-8 rounded-lg border-slate-300 text-xs bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              className="h-9 rounded-xl border-slate-200 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isCreatingTemplate || !newTplName || !newTplBody.trim()}
              onClick={handleSubmitNewTemplate}
              className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              {isCreatingTemplate ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Submitting to Meta...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-1.5" /> Submit to Meta for Approval
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM AUTOMATED BATCH DISPATCH MODAL */}
      <Dialog open={batchConfirmOpen} onOpenChange={setBatchConfirmOpen}>
        <DialogContent className="max-w-lg rounded-2xl bg-white p-6">
          <DialogHeader>
            <div className="h-11 w-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-2">
              <Play className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              Confirm Automated Meta API Outreach ({dispatchPreview.eligible.length} Tenants)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 leading-relaxed">
              Each eligible stale tenant below will automatically receive their stage-mapped approved Meta WhatsApp template with personalized variables.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
            {dispatchPreview.eligible.slice(0, 50).map((c) => (
              <div key={c.businessId} className="p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{c.businessName}</p>
                  <p className="font-mono text-[10px] text-slate-500">
                    +{c.phone} · {c.daysStale}d stale
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 shrink-0">
                  {c.templateName}
                </Badge>
              </div>
            ))}
          </div>

          {isBatchRunning && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
              <span className="font-medium truncate">{batchProgressText}</span>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isBatchRunning}
              onClick={() => setBatchConfirmOpen(false)}
              className="h-9 rounded-xl border-slate-200 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isBatchRunning}
              onClick={handleRunAutomatedBatchDispatch}
              className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              {isBatchRunning ? "Dispatching..." : `Send to ${dispatchPreview.eligible.length} Tenants`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
