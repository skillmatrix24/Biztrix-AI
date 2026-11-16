"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Zap,
  Plus,
  Clock,
  SmartphoneNfc,
  Sparkles,
  ShieldCheck,
  Loader2,
  Target,
  Bot,
  Trash2,
  LayoutList,
  Heart,
  Star,
  UserPlus,
  Gift,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, SectionCard } from "@/components/ui/editorial";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
  updateDocumentNonBlocking,
  setDocumentNonBlocking,
} from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { suggestAutomationSequence } from "@/ai/flows/suggest-automation-sequence";
import { listWhatsAppTemplates } from "@/app/actions/whatsapp-actions";

const AUTOMATION_TYPES = [
  { id: "first_purchase", label: "First Purchase Welcome", icon: UserPlus, desc: "Onboarding sequence for brand new customers" },
  { id: "member_conversion", label: "Member Conversion", icon: Gift, desc: "Targeted offers for non-members to join loyalty" },
  { id: "birthday", label: "Birthday Surprise", icon: Sparkles, desc: "Engagement sequence on customer birth date" },
  { id: "anniversary", label: "Anniversary Special", icon: Heart, desc: "Reward sequence for marriage or partnership dates" },
  { id: "special_event", label: "Custom Special Day", icon: Star, desc: "Triggers for manually added family events" },
  { id: "high_value_bill", label: "High Value Reward", icon: Zap, desc: "Instantly reward big spenders", hasThreshold: true },
  { id: "points_milestone", label: "Point Milestone", icon: Target, desc: "Alert on reaching point targets", hasThreshold: true },
  { id: "expiry", label: "Membership Expiry", icon: Clock, desc: "Sequence leading up to & after plan ends" },
  { id: "inactive", label: "Inactive Retention", icon: ShieldCheck, desc: "Win-back sequence for long-term absence" },
];

const VARIABLE_HELPERS = [
  { id: "{{name}}", label: "Customer Name" },
  { id: "{{points}}", label: "Reward Points" },
  { id: "{{wallet}}", label: "Cashback Balance" },
  { id: "{{track_url}}", label: "Digital Card Link" },
  { id: "{{coupon_code}}", label: "Reward Code" },
  { id: "{{card_number}}", label: "Membership ID" },
  { id: "{{business_name}}", label: "Store Name" },
];

export default function LoyaltyAutomationPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const automationQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "loyaltyAutomation"),
            orderBy("type", "asc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: automationsData, isLoading } = useCollection<any>(automationQuery);
  const automations = automationsData || [];

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const [isAiLoading, setIsAiLoading] = useState<Record<string, boolean>>({});
  const [metaTemplates, setTemplates] = useState<any[]>([]);

  const isWhatsappActive = useMemo(() => {
    return (
      business?.activeAddonIds?.includes("feat_whatsapp") ||
      business?.activeAddonIds?.includes("suite_growth") ||
      business?.status === "pro"
    );
  }, [business]);

  useEffect(() => {
    const waConfig = business?.whatsappApiConfig;
    if (waConfig?.isVerified && waConfig?.wabaId && businessId) {
      listWhatsAppTemplates(businessId, { wabaId: waConfig.wabaId })
        .then((res) => setTemplates(res.templates || []))
        .catch((error) => {
          console.error(error);
        });
    }
  }, [business?.whatsappApiConfig, businessId]);

  const handleToggle = (id: string, current: boolean) => {
    if (!businessId) return;
    const docRef = doc(firestore, "businesses", businessId, "loyaltyAutomation", id);
    updateDocumentNonBlocking(docRef, { isEnabled: !current, updatedAt: serverTimestamp() });
    toast({ title: current ? "Rule Deactivated" : "Rule Activated" });
  };

  const handleUpdateRule = (id: string, field: string, value: any) => {
    if (!businessId) return;
    const docRef = doc(firestore, "businesses", businessId, "loyaltyAutomation", id);
    updateDocumentNonBlocking(docRef, { [field]: value, updatedAt: serverTimestamp() });
  };

  const handleAddStage = (typeId: string) => {
    if (!businessId) return;
    const rule = automations.find((a: any) => a.id === typeId);
    const stages = rule?.stages || [];
    const newStage = {
      id: `st_${Date.now()}`,
      days: 0,
      template: "Namaste {{name}}!",
      isMetaTemplate: false,
      metaTemplateName: "",
      parameters: ["{{name}}", "{{track_url}}"],
    };
    handleUpdateRule(typeId, "stages", [...stages, newStage]);
  };

  const removeStage = (typeId: string, stageId: string) => {
    const rule = automations.find((a: any) => a.id === typeId);
    const updated = (rule?.stages || []).filter((s: any) => s.id !== stageId);
    handleUpdateRule(typeId, "stages", updated);
  };

  const updateStage = (typeId: string, stageId: string, field: string, value: any) => {
    const rule = automations.find((a: any) => a.id === typeId);
    const updated = (rule?.stages || []).map((s: any) =>
      s.id === stageId ? { ...s, [field]: value } : s
    );
    handleUpdateRule(typeId, "stages", updated);
  };

  const handleAiSequence = async (typeId: string) => {
    if (!businessId) return;
    setIsAiLoading((prev) => ({ ...prev, [typeId]: true }));
    try {
      const result = await suggestAutomationSequence({
        businessName: business?.name || "Biztrix Store",
        ruleType: typeId,
      });
      const newStages = result.stages.map((s) => ({
        id: `st_${Math.random().toString(36).substr(2, 9)}`,
        days: s.days,
        template: s.template,
        isMetaTemplate: false,
        metaTemplateName: "",
        parameters: ["{{name}}", "{{track_url}}"],
      }));
      handleUpdateRule(typeId, "stages", newStages);
      toast({ title: "AI Sequence Ready" });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "AI Error" });
    } finally {
      setIsAiLoading((prev) => ({ ...prev, [typeId]: false }));
    }
  };

  const initializeRule = (typeId: string) => {
    if (!businessId) return;
    const docRef = doc(firestore, "businesses", businessId, "loyaltyAutomation", typeId);
    const defaults = {
      id: typeId,
      type: typeId,
      isEnabled: false,
      thresholdValue: 0,
      whatsappNotify: false,
      stages: [
        {
          id: "st_init",
          days: 0,
          template: "Namaste {{name}}!",
          isMetaTemplate: false,
          parameters: ["{{name}}"],
        },
      ],
      createdAt: serverTimestamp(),
    };
    setDocumentNonBlocking(docRef, defaults, { merge: true });
    toast({ title: "Sequence Initialized" });
  };

  if (isLoading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-left">
      <PageHeader
        title="Automation Roadmap"
        description="Configure multi-step retention sequences and Meta Cloud API template mappings."
        breadcrumb="Loyalty / Automation"
        backHref="/loyalty"
        backLabel="Back to Loyalty"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          {AUTOMATION_TYPES.map((type) => {
            const rule = automations.find((a: any) => a.id === type.id);
            const Icon = type.icon;
            const stages = rule?.stages || [];

            return (
              <SectionCard
                key={type.id}
                className={cn(!rule && "bg-slate-50/50")}
                bodyClassName={rule && rule.isEnabled ? "p-5 sm:p-6 space-y-6" : "p-0"}
                headerRight={
                  <div className="flex items-center gap-3">
                    {rule?.isEnabled && (
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium px-2.5 py-0.5 rounded-md">
                        Active
                      </Badge>
                    )}
                    {rule ? (
                      <Switch
                        aria-label={`Toggle ${type.label}`}
                        checked={!!rule.isEnabled}
                        onCheckedChange={() => handleToggle(rule.id, rule.isEnabled)}
                      />
                    ) : (
                      <Button
                        type="button"
                        onClick={() => initializeRule(type.id)}
                        variant="outline"
                        size="sm"
                        className="h-9 px-4 rounded-xl text-xs font-medium"
                      >
                        Initialize Rule
                      </Button>
                    )}
                  </div>
                }
                title={type.label}
                description={type.desc}
              >
                {rule && rule.isEnabled ? (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-slate-700">
                        <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <LayoutList className="h-3.5 w-3.5 text-slate-500" />
                          Sequence Timeline ({stages.length}{" "}
                          {stages.length === 1 ? "step" : "steps"})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isAiLoading[type.id]}
                          onClick={() => handleAiSequence(type.id)}
                          className="h-8 rounded-lg text-xs font-medium gap-1.5"
                        >
                          {isAiLoading[type.id] ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Bot className="h-3.5 w-3.5" />
                          )}
                          AI Suggest
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleAddStage(type.id)}
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg text-xs font-medium"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add Step
                        </Button>
                      </div>
                    </div>

                    <div className="relative space-y-5 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                      {stages.map((stage: any, sIdx: number) => (
                        <div key={stage.id} className="relative pl-11">
                          <div className="absolute left-0 top-1 h-9 w-9 rounded-full border-2 border-white bg-slate-900 text-white flex items-center justify-center z-10 font-mono text-xs font-semibold tabular-nums">
                            {sIdx + 1}
                          </div>
                          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4 text-left">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex flex-wrap items-center gap-4">
                                <div className="space-y-1">
                                  <Label
                                    htmlFor={`offset-${stage.id}`}
                                    className="text-xs font-medium text-slate-600"
                                  >
                                    Offset Days
                                  </Label>
                                  <Input
                                    id={`offset-${stage.id}`}
                                    type="number"
                                    value={stage.days}
                                    onChange={(e) =>
                                      updateStage(
                                        rule.id,
                                        stage.id,
                                        "days",
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="h-9 w-24 rounded-lg bg-white font-mono text-sm font-semibold text-center tabular-nums"
                                  />
                                </div>
                                <div className="flex items-center gap-2.5 bg-white px-3 py-2 rounded-lg border border-slate-200">
                                  <Label
                                    htmlFor={`meta-mode-${stage.id}`}
                                    className="text-xs font-medium text-slate-700 cursor-pointer"
                                  >
                                    Meta Template Mode
                                  </Label>
                                  <Switch
                                    id={`meta-mode-${stage.id}`}
                                    checked={!!stage.isMetaTemplate}
                                    onCheckedChange={(v) =>
                                      updateStage(rule.id, stage.id, "isMetaTemplate", v)
                                    }
                                  />
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Remove step ${sIdx + 1} from ${type.label}`}
                                className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                onClick={() => removeStage(rule.id, stage.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            {stage.isMetaTemplate ? (
                              <div className="space-y-4 p-4 bg-white rounded-xl border border-slate-200">
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-semibold text-slate-700">
                                    Select Approved Template
                                  </Label>
                                  <Select
                                    value={stage.metaTemplateName || ""}
                                    onValueChange={(v) =>
                                      updateStage(rule.id, stage.id, "metaTemplateName", v)
                                    }
                                  >
                                    <SelectTrigger className="h-10 rounded-lg bg-white text-sm">
                                      <SelectValue placeholder="Select Meta template..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                      {metaTemplates.length === 0 ? (
                                        <SelectItem value="none" disabled>
                                          No templates synced
                                        </SelectItem>
                                      ) : (
                                        metaTemplates.map((t) => (
                                          <SelectItem
                                            key={t.name}
                                            value={t.name}
                                            className="text-xs font-medium"
                                          >
                                            {t.name}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold text-slate-700">
                                      Parameter Mapping
                                    </Label>
                                    <span className="text-xs font-mono text-slate-500">
                                      {"Map {{1}}, {{2}}..."}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 gap-2">
                                    {(stage.parameters || ["{{name}}", "{{track_url}}"]).map(
                                      (p: string, pIdx: number) => (
                                        <div
                                          key={pIdx}
                                          className="flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200"
                                        >
                                          <div className="h-6 px-2 rounded bg-slate-900 text-white flex items-center justify-center font-mono text-xs font-semibold shrink-0 tabular-nums">
                                            P{pIdx + 1}
                                          </div>
                                          <Select
                                            value={p}
                                            onValueChange={(v) => {
                                              const updated = [
                                                ...(stage.parameters || [
                                                  "{{name}}",
                                                  "{{track_url}}",
                                                ]),
                                              ];
                                              updated[pIdx] = v;
                                              updateStage(
                                                rule.id,
                                                stage.id,
                                                "parameters",
                                                updated
                                              );
                                            }}
                                          >
                                            <SelectTrigger className="h-8 border-none bg-transparent text-xs font-medium shadow-none">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                              {VARIABLE_HELPERS.map((vh) => (
                                                <SelectItem
                                                  key={vh.id}
                                                  value={vh.id}
                                                  className="text-xs"
                                                >
                                                  {vh.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <Label className="text-xs font-semibold text-slate-700">
                                    Free-Form Session Message
                                  </Label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {VARIABLE_HELPERS.map((v) => (
                                      <button
                                        key={v.id}
                                        type="button"
                                        aria-label={`Insert ${v.label} placeholder`}
                                        onClick={() =>
                                          updateStage(
                                            rule.id,
                                            stage.id,
                                            "template",
                                            (stage.template || "") + " " + v.id
                                          )
                                        }
                                        className="text-xs font-mono bg-white text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md hover:bg-slate-900 hover:text-white transition-colors"
                                      >
                                        {v.id}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <Textarea
                                  value={stage.template || ""}
                                  onChange={(e) =>
                                    updateStage(rule.id, stage.id, "template", e.target.value)
                                  }
                                  className="min-h-[96px] rounded-lg bg-white border-slate-200 p-3 text-sm"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border gap-4",
                        isWhatsappActive
                          ? "bg-emerald-50/70 border-emerald-200"
                          : "bg-slate-50 border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-3 text-left">
                        <div
                          className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0",
                            isWhatsappActive ? "bg-emerald-600" : "bg-slate-400"
                          )}
                        >
                          <SmartphoneNfc className="h-5 w-5" />
                        </div>
                        <div>
                          <Label
                            htmlFor={`wa-dispatch-${rule.id}`}
                            className="text-sm font-semibold text-slate-900 cursor-pointer"
                          >
                            WhatsApp Dispatch Switch
                          </Label>
                          <p className="text-xs text-slate-600">
                            {isWhatsappActive
                              ? "Live syncing with Meta Cloud API"
                              : "WhatsApp add-on activation pending"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-slate-700">
                          {rule.whatsappNotify ? "Enabled" : "Muted"}
                        </span>
                        <Switch
                          id={`wa-dispatch-${rule.id}`}
                          checked={!!rule.whatsappNotify}
                          onCheckedChange={(v) =>
                            handleUpdateRule(rule.id, "whatsappNotify", v)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </SectionCard>
            );
          })}
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl bg-slate-900 text-white border border-slate-800 p-6 space-y-6 sticky top-24 text-left">
            <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold tracking-tight text-white">
                Template Mapping Logic
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Meta Cloud API requires pre-approved templates for outbound notifications.{" "}
                <span className="font-semibold text-white">Biztrix Mapping</span> automatically
                binds live customer records to positional parameters.
              </p>
            </div>
            <Separator className="bg-white/15" />
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/15">
                  <BadgeCheck className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Compliance Guardrail</p>
                  <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                    Always select approved green templates to maintain a high WhatsApp quality
                    rating.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/15">
                  <SmartphoneNfc className="h-4 w-4 text-sky-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Fail-Safe Hold</p>
                  <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                    If a template loses approval status, outbound dispatches pause automatically
                    until updated.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
