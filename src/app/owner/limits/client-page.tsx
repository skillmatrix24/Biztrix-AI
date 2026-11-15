"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Bot,
  Briefcase,
  Building,
  CheckCircle2,
  Coins,
  DatabaseZap,
  Edit2,
  ExternalLink,
  Facebook,
  FileSpreadsheet,
  FileText,
  Gem,
  Handshake,
  HardDrive,
  Headset,
  Info,
  Layers,
  Lightbulb,
  ListTodo,
  Loader2,
  MessageCircle,
  Package,
  Palette,
  Percent,
  Plus,
  Receipt,
  Save,
  ScanLine,
  Search,
  ShieldCheck,
  ShoppingBag,
  SmartphoneNfc,
  Sparkles,
  Sun,
  Target,
  Ticket,
  Trash2,
  Truck,
  Users,
  Users2,
  Wallet,
  BookOpenText,
  Zap,
} from "lucide-react";
import { doc } from "firebase/firestore";
import {
  deleteDocumentNonBlocking,
  setDocumentNonBlocking,
  useFirestore,
  useUser,
} from "@/firebase";
import { useMarketplaceCatalog } from "@/hooks/use-marketplace-catalog";
import { bundles as staticBundles, individuals as staticIndividuals } from "@/app/marketplace/data";
import type { MarketplaceItem } from "@/app/marketplace/data/types";
import {
  buildPlanComparisonRows,
  calculateMarketplacePrice,
  CORE_COMMAND_MENUS,
  DEFAULT_SYSTEM_LIMITS,
  normalizeSystemLimits,
  type CoreMenuAccessMode,
  type CoreMenuId,
  type SystemLimitsConfig,
} from "@/lib/marketplace-catalog";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type LimitsTab = "quotas" | "suites" | "addons" | "preview";

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Lightbulb,
  SmartphoneNfc,
  Wallet,
  Briefcase,
  Users2,
  ListTodo,
  Zap,
  ShoppingBag,
  Facebook,
  ScanLine,
  Bot,
  Layers,
  Gem,
  Handshake,
  Building,
  MessageCircle,
  Palette,
  Ticket,
  Headset,
  Sun,
  Receipt,
  FileSpreadsheet,
};

const MODULE_CATEGORIES = [
  "Bundles",
  "Store Builder",
  "AI",
  "Ops",
  "Operations",
  "Engagement",
  "Connectivity",
  "Branding",
  "Real Estate",
  "Support",
  "Energy",
];

const STATIC_IDS = new Set([...staticBundles, ...staticIndividuals].map((i) => i.id));

interface ModuleFormState {
  id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  icon: string;
  isTrialAvailable: boolean;
  trialDays: string;
  annualDiscountPercent: string;
  isActive: boolean;
  isPopular: boolean;
  inclusions: string;
  usageLimit: string;
}

function createEmptyModuleForm(globalLimits: SystemLimitsConfig): ModuleFormState {
  return {
    id: `feat_${Date.now()}`,
    name: "",
    description: "",
    price: "499",
    category: "Ops",
    icon: "Bot",
    isTrialAvailable: true,
    trialDays: String(globalLimits.trialDurationDays),
    annualDiscountPercent: String(globalLimits.annualDiscountPercent),
    isActive: true,
    isPopular: false,
    inclusions: "",
    usageLimit: "",
  };
}

function parseLimitsTab(raw?: string): LimitsTab {
  if (raw === "suites" || raw === "addons" || raw === "preview" || raw === "quotas") {
    return raw;
  }
  return "quotas";
}

export default function PlatformLimitsPage({ initialTab }: { initialTab?: string }) {
  const firestore = useFirestore();
  const { user } = useUser();

  const isPlatformOwner = user?.email?.toLowerCase() === "skillmatrix24@gmail.com";

  const { limits, bundles, individuals, allItems, remoteDocs, isLoading } = useMarketplaceCatalog({
    includeInactive: true,
  });

  const [activeTab, setActiveTab] = useState<LimitsTab>(() => parseLimitsTab(initialTab));
  const [formData, setFormData] = useState<SystemLimitsConfig>(DEFAULT_SYSTEM_LIMITS);
  const [isSavingQuotas, setIsSavingQuotas] = useState(false);

  const selectTab = (nextTab: LimitsTab) => {
    setActiveTab(nextTab);
    if (typeof window !== "undefined") {
      const nextUrl = nextTab === "quotas" ? "/owner/limits" : `/owner/limits?tab=${nextTab}`;
      window.history.replaceState(null, "", nextUrl);
    }
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(parseLimitsTab(initialTab));
    }
  }, [initialTab]);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [moduleForm, setModuleForm] = useState<ModuleFormState>(() =>
    createEmptyModuleForm(DEFAULT_SYSTEM_LIMITS)
  );
  const [isSavingModule, setIsSavingModule] = useState(false);

  useEffect(() => {
    setFormData(limits);
  }, [limits]);

  const draftLimits = useMemo(() => normalizeSystemLimits(formData), [formData]);

  const previewComparisonRows = useMemo(
    () => buildPlanComparisonRows(draftLimits, allItems),
    [draftLimits, allItems]
  );

  const syncedDocIds = useMemo(
    () => new Set((remoteDocs || []).map((d: any) => d.id)),
    [remoteDocs]
  );

  const activeSuitesCount = useMemo(
    () => bundles.filter((b) => b.isActive !== false).length,
    [bundles]
  );
  const activeAddonsCount = useMemo(
    () => individuals.filter((i) => i.isActive !== false).length,
    [individuals]
  );

  const filteredSuites = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return bundles;
    return bundles.filter((item) =>
      [item.name, item.description, item.inclusions, item.usageLimit || ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [bundles, searchTerm]);

  const filteredIndividuals = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return individuals.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return [item.name, item.category, item.description, item.inclusions, item.usageLimit || ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [individuals, searchTerm, categoryFilter]);

  const updateNumericField = (key: keyof SystemLimitsConfig, rawValue: string) => {
    const parsed = rawValue === "" ? 0 : parseInt(rawValue, 10);
    setFormData((prev) => ({
      ...prev,
      [key]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const updateCoreMenuMode = (menuId: CoreMenuId, nextMode: CoreMenuAccessMode) => {
    setFormData((prev) => ({
      ...prev,
      coreMenuAccess: {
        ...prev.coreMenuAccess,
        [menuId]: nextMode,
      },
    }));
  };

  const openLinkedAddonEditor = (addonId: string) => {
    const target = allItems.find((i) => i.id === addonId);
    if (target) {
      openModuleEditor(target);
    } else {
      selectTab("addons");
    }
  };

  const handleSaveQuotas = () => {
    if (!isPlatformOwner || !firestore) return;
    setIsSavingQuotas(true);

    const payload = normalizeSystemLimits({
      ...formData,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.uid || "owner",
    });

    const limitsRef = doc(firestore, "system", "config", "limits", "default");
    setDocumentNonBlocking(limitsRef, payload, { merge: true });

    setTimeout(() => {
      setIsSavingQuotas(false);
      toast({
        title: "System Limits & Command Center Rules Saved",
        description: "Menu access modes, Core quotas, trial duration, annual discount, and Pro ceilings are now live.",
      });
    }, 350);
  };

  const handleResetDefaults = () => {
    setFormData(DEFAULT_SYSTEM_LIMITS);
    toast({
      title: "Fields Reset Locally",
      description: "Standard defaults restored in editor. Click Save Limit Rules to publish.",
    });
  };

  const handleSyncCatalogToFirestore = () => {
    if (!isPlatformOwner || !firestore) return;
    const defaults = [...staticBundles, ...staticIndividuals];
    let createdCount = 0;

    defaults.forEach((item) => {
      if (!syncedDocIds.has(item.id)) {
        createdCount += 1;
        const docRef = doc(firestore, "system", "config", "marketplace", item.id);
        setDocumentNonBlocking(
          docRef,
          {
            ...item,
            isActive: item.isActive ?? true,
            annualDiscountPercent: draftLimits.annualDiscountPercent,
            trialDays: draftLimits.trialDurationDays,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    });

    toast({
      title:
        createdCount > 0
          ? `Synced ${createdCount} Missing Modules`
          : `All ${defaults.length} Catalog Modules Already Synced`,
      description:
        createdCount > 0
          ? "All static suites and add-ons now have live Firestore override documents."
          : "Every default suite and add-on is already present in Firestore.",
    });
  };

  const handleToggleModuleActive = (item: MarketplaceItem, nextActive: boolean) => {
    if (!isPlatformOwner || !firestore) return;
    const docRef = doc(firestore, "system", "config", "marketplace", item.id);
    setDocumentNonBlocking(
      docRef,
      {
        ...item,
        isActive: nextActive,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    toast({
      title: `${item.name} ${nextActive ? "Enabled" : "Paused"}`,
      description: nextActive
        ? "Visible on Marketplace, Pricing, and Subscription."
        : "Hidden from public Marketplace & Pricing listings.",
    });
  };

  const openModuleEditor = (item: MarketplaceItem) => {
    setIsCreatingNew(false);
    setModuleForm({
      id: item.id,
      name: item.name,
      description: item.description,
      price: String(item.price || "0"),
      category: item.category || "Ops",
      icon: item.icon || "Bot",
      isTrialAvailable: Boolean(item.isTrialAvailable),
      trialDays: String(item.trialDays ?? draftLimits.trialDurationDays),
      annualDiscountPercent: String(
        item.annualDiscountPercent ?? draftLimits.annualDiscountPercent
      ),
      isActive: item.isActive !== false,
      isPopular: Boolean(item.isPopular),
      inclusions: item.inclusions || "",
      usageLimit: item.usageLimit || "",
    });
    setEditorOpen(true);
  };

  const openCreateCustomModule = () => {
    setIsCreatingNew(true);
    setModuleForm(createEmptyModuleForm(draftLimits));
    setEditorOpen(true);
  };

  const handleSaveModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPlatformOwner || !firestore) return;
    const trimmedId = moduleForm.id.trim();
    const trimmedName = moduleForm.name.trim();
    if (!trimmedId || !trimmedName) {
      toast({
        variant: "destructive",
        title: "Missing Details",
        description: "Module ID and Display Name are required.",
      });
      return;
    }

    setIsSavingModule(true);
    const parsedPrice = Math.max(0, parseInt(moduleForm.price || "0", 10) || 0);
    const parsedTrialDays = Math.min(
      365,
      Math.max(0, parseInt(moduleForm.trialDays || String(draftLimits.trialDurationDays), 10) || 0)
    );
    const parsedDiscount = Math.min(
      90,
      Math.max(
        0,
        parseInt(
          moduleForm.annualDiscountPercent || String(draftLimits.annualDiscountPercent),
          10
        ) || 0
      )
    );

    const docRef = doc(firestore, "system", "config", "marketplace", trimmedId);
    setDocumentNonBlocking(
      docRef,
      {
        id: trimmedId,
        name: trimmedName,
        description: moduleForm.description.trim(),
        price: String(parsedPrice),
        category: moduleForm.category,
        icon: moduleForm.icon,
        isTrialAvailable: moduleForm.isTrialAvailable,
        trialDays: parsedTrialDays,
        annualDiscountPercent: parsedDiscount,
        isActive: moduleForm.isActive,
        isPopular: moduleForm.isPopular,
        inclusions: moduleForm.inclusions.trim(),
        usageLimit: moduleForm.usageLimit.trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid || "owner",
      },
      { merge: true }
    );

    setTimeout(() => {
      setIsSavingModule(false);
      setEditorOpen(false);
      toast({
        title: isCreatingNew ? "Custom Module Created" : `${trimmedName} Updated`,
        description: "Live price, features, and limits updated on Marketplace & Pricing.",
      });
    }, 300);
  };

  const handleDeleteCustomModule = (item: MarketplaceItem) => {
    if (!isPlatformOwner || !firestore || STATIC_IDS.has(item.id)) return;
    deleteDocumentNonBlocking(doc(firestore, "system", "config", "marketplace", item.id));
    toast({
      title: `${item.name} Removed`,
      description: "Custom marketplace module deleted from Firestore.",
    });
  };

  if (!isPlatformOwner) {
    return (
      <div className="max-w-xl mx-auto my-16 rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-4">
        <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-slate-900">Owner Authorization Required</h1>
          <p className="text-sm text-slate-600">
            System Usage Limits & Plan Controls can only be managed by the verified Platform Owner account.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button asChild variant="outline" className="rounded-xl text-xs font-semibold">
            <Link href="/marketplace">Open Marketplace</Link>
          </Button>
          <Button asChild className="rounded-xl text-xs font-semibold">
            <Link href="/login">Sign In as Owner</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading && !formData.updatedAt && remoteDocs.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 text-left">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                System Usage Limits & Plan Controls
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                Manage Free Core quotas, trial duration, annual discount, and live prices & features for all Marketplace plans.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleResetDefaults}
            className="h-10 rounded-xl border-slate-200 text-xs font-semibold"
          >
            <DatabaseZap className="mr-1.5 h-3.5 w-3.5" />
            Reset Fields
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSyncCatalogToFirestore}
            className="h-10 rounded-xl border-slate-200 text-xs font-semibold whitespace-nowrap shrink-0"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Sync All {staticBundles.length + staticIndividuals.length} Modules
          </Button>
          <Button
            type="button"
            onClick={handleSaveQuotas}
            disabled={isSavingQuotas}
            className="h-10 px-5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0"
          >
            {isSavingQuotas ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save Limit Rules
          </Button>
        </div>
      </div>

      {/* Executive Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1">
          <p className="text-xs font-medium text-slate-500">Core Free Quotas</p>
          <p className="text-xl font-bold text-slate-900 tabular-nums">
            {draftLimits.maxMonthlyInvoices} Inv · {draftLimits.maxMonthlyQuotations} Quotes
          </p>
          <p className="text-xs text-slate-600 tabular-nums">
            {draftLimits.maxProducts} SKUs · {draftLimits.maxMonthlyEwayBills} EWB · {draftLimits.maxMonthlyGstExports} GST exports
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1">
          <p className="text-xs font-medium text-slate-500">Trial & Annual Billing</p>
          <p className="text-xl font-bold text-slate-900 tabular-nums">
            {draftLimits.trialDurationDays} Days · {draftLimits.annualDiscountPercent}% Off
          </p>
          <p className="text-xs text-slate-600">
            Applied automatically across Marketplace & Pricing
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1">
          <p className="text-xs font-medium text-slate-500">All-in-One Business Suites</p>
          <p className="text-xl font-bold text-slate-900 tabular-nums">
            {activeSuitesCount} Active{" "}
            <span className="text-sm font-normal text-slate-500">/ {bundles.length} total</span>
          </p>
          <p className="text-xs text-slate-600">Growth, Loyalty, Solar, Property, AI & Back Office</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1">
          <p className="text-xs font-medium text-slate-500">Individual Add-ons</p>
          <p className="text-xl font-bold text-slate-900 tabular-nums">
            {activeAddonsCount} Active{" "}
            <span className="text-sm font-normal text-slate-500">/ {individuals.length} total</span>
          </p>
          <p className="text-xs text-slate-600">Includes POS Billing Pro, Live E-Way & GST, Store & OCR</p>
        </div>
      </div>

      {/* Tab Navigation + Quick External Links */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3">
        <div
          role="tablist"
          aria-label="System limits sections"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0"
        >
          {(
            [
              { id: "quotas", label: "Core & Paid Quotas" },
              { id: "suites", label: `Business Suites (${bundles.length})` },
              { id: "addons", label: `Individual Add-ons (${individuals.length})` },
              { id: "preview", label: "Plan Comparison Preview" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => selectTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border",
                activeTab === tab.id
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold shrink-0">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1 text-slate-600 hover:text-primary"
          >
            View Marketplace <ExternalLink className="h-3 w-3" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 text-slate-600 hover:text-primary"
          >
            View Pricing <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* TAB 1: CORE & PAID QUOTAS */}
      {activeTab === "quotas" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            {/* Command Center Menu Access Control */}
            <Card className="rounded-2xl border border-slate-200 bg-white shadow-none overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-6 py-5">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Command Center & Core Menu Governance
                </CardTitle>
                <p className="text-xs text-slate-600">
                  Control whether each Command Center menu (and Fixed Expenses) is Free with Quota, Trial Only, requires its Paid Marketplace Module, or is Hidden from tenant sidebars.
                </p>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                      <TableHead className="pl-6 py-3 text-xs font-semibold text-slate-700">
                        Menu & Route
                      </TableHead>
                      <TableHead className="py-3 text-xs font-semibold text-slate-700">
                        Access Rule
                      </TableHead>
                      <TableHead className="py-3 text-xs font-semibold text-slate-700">
                        Free Quota Cap
                      </TableHead>
                      <TableHead className="pr-6 py-3 text-right text-xs font-semibold text-slate-700">
                        Linked Marketplace Module
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {CORE_COMMAND_MENUS.map((menu) => {
                      const currentMode = formData.coreMenuAccess?.[menu.id] || "free";
                      const quotaValue = Number(formData[menu.quotaKey] ?? 0);
                      const isQuotaEditable =
                        currentMode === "free" || currentMode === "trial_only";

                      return (
                        <TableRow key={menu.id} className="border-slate-100">
                          <TableCell className="pl-6 py-3.5">
                            <div className="font-semibold text-xs sm:text-sm text-slate-900">
                              {menu.label}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {menu.section} · <span className="font-mono">{menu.href}</span>
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5">
                            <Select
                              value={currentMode}
                              onValueChange={(val) =>
                                updateCoreMenuMode(menu.id, val as CoreMenuAccessMode)
                              }
                            >
                              <SelectTrigger
                                aria-label={`Access mode for ${menu.label}`}
                                className="h-9 w-[176px] rounded-lg border-slate-200 text-xs font-semibold"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="free">Free Core + Quota</SelectItem>
                                <SelectItem value="trial_only">Trial Period Only</SelectItem>
                                <SelectItem value="paid_addon">Paid Module Required</SelectItem>
                                <SelectItem value="hidden">Hidden from Sidebar</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell className="py-3.5">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={0}
                                aria-label={`Free quota for ${menu.label}`}
                                disabled={!isQuotaEditable}
                                value={Number.isFinite(quotaValue) ? quotaValue : 0}
                                onChange={(e) => updateNumericField(menu.quotaKey, e.target.value)}
                                className="h-9 w-24 rounded-lg border-slate-200 font-bold text-xs tabular-nums"
                              />
                              <span className="text-[11px] text-slate-500 whitespace-nowrap">
                                {menu.quotaUnit}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="pr-6 py-3.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openLinkedAddonEditor(menu.addonId)}
                              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 whitespace-nowrap"
                            >
                              <span>{menu.addonLabel}</span>
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <CardFooter className="border-t border-slate-100 bg-slate-50/50 px-6 py-3.5 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dashboard (<span className="font-mono">/dashboard</span>) stays enabled on all plans. Switching any menu above to <strong className="text-slate-900">Paid Module Required</strong> locks it in tenant sidebars until its linked Marketplace module or parent suite is activated.
                </p>
              </CardFooter>
            </Card>

            {/* Core Free-Tier Quotas */}
            <Card className="rounded-2xl border border-slate-200 bg-white shadow-none overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-6 py-5">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Free Core OS Quota Ceilings (All 12 Core Limits)
                </CardTitle>
                <p className="text-xs text-slate-600">
                  Enforced live across POS Billing, Quotations, Invoices & E-Way, GST Reports, Inventory, Leads, Customers, Vendors, Daily Entries, and Fixed Expenses.
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <LimitNumberField
                    icon={Receipt}
                    label="Monthly POS Invoices"
                    hint="Billing (/billing)"
                    value={formData.maxMonthlyInvoices}
                    onChange={(v) => updateNumericField("maxMonthlyInvoices", v)}
                  />
                  <LimitNumberField
                    icon={FileSpreadsheet}
                    label="Monthly Quotations"
                    hint="Quotations (/quotations)"
                    value={formData.maxMonthlyQuotations}
                    onChange={(v) => updateNumericField("maxMonthlyQuotations", v)}
                  />
                  <LimitNumberField
                    icon={FileText}
                    label="Monthly E-Way Bills (Free)"
                    hint="Invoices & E-Way (/invoices)"
                    value={formData.maxMonthlyEwayBills}
                    onChange={(v) => updateNumericField("maxMonthlyEwayBills", v)}
                  />
                  <LimitNumberField
                    icon={Percent}
                    label="Monthly GSTR-1/3B Exports"
                    hint="GST & GSTR-1 (/accounting/gst)"
                    value={formData.maxMonthlyGstExports}
                    onChange={(v) => updateNumericField("maxMonthlyGstExports", v)}
                  />
                  <LimitNumberField
                    icon={Package}
                    label="Master Inventory SKUs"
                    hint="Inventory (/inventory)"
                    value={formData.maxProducts}
                    onChange={(v) => updateNumericField("maxProducts", v)}
                  />
                  <LimitNumberField
                    icon={Target}
                    label="Active CRM Leads"
                    hint="CRM & Leads (/leads)"
                    value={formData.maxActiveLeads}
                    onChange={(v) => updateNumericField("maxActiveLeads", v)}
                  />
                  <LimitNumberField
                    icon={Users}
                    label="Customer Profiles"
                    hint="Customers (/customers)"
                    value={formData.maxCustomers}
                    onChange={(v) => updateNumericField("maxCustomers", v)}
                  />
                  <LimitNumberField
                    icon={Truck}
                    label="Vendor Profiles"
                    hint="Vendors (/vendors)"
                    value={formData.maxVendors}
                    onChange={(v) => updateNumericField("maxVendors", v)}
                  />
                  <LimitNumberField
                    icon={BookOpenText}
                    label="Monthly Cashbook Entries"
                    hint="Daily Entries (/daily-entries)"
                    value={formData.maxMonthlyEntries}
                    onChange={(v) => updateNumericField("maxMonthlyEntries", v)}
                  />
                  <LimitNumberField
                    icon={Coins}
                    label="Recurring Fixed Overheads"
                    hint="Fixed Expenses (/fixed-expenses)"
                    value={formData.maxFixedExpenses}
                    onChange={(v) => updateNumericField("maxFixedExpenses", v)}
                  />
                  <LimitNumberField
                    icon={ShoppingBag}
                    label="Free Preview Sales Funnels"
                    hint="Draft funnel cap before Store add-on"
                    value={formData.maxFunnels}
                    onChange={(v) => updateNumericField("maxFunnels", v)}
                  />
                  <LimitNumberField
                    icon={Users2}
                    label="Core Team / Staff Seats"
                    hint="Default: 3 seats"
                    value={formData.maxStaffMembers}
                    onChange={(v) => updateNumericField("maxStaffMembers", v)}
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  Setting any quota to <strong className="text-slate-900">0</strong> blocks new creation for Free Tier workspaces. Set <strong className="text-slate-900">999999</strong> for unlimited access.
                </p>
              </CardFooter>
            </Card>

            {/* Paid Module Ceilings & Global Billing Rules */}
            <Card className="rounded-2xl border border-slate-200 bg-white shadow-none overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-6 py-5">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Percent className="h-4 w-4 text-primary" />
                  Global Trial, Annual Discount & Pro Module Ceilings
                </CardTitle>
                <p className="text-xs text-slate-600">
                  Controls pricing discounts and high-volume ceilings across Live E-Way GSP, Store & Funnel Builder, AI Advisor, Bill Scanner, WhatsApp, Loyalty, Solar, and Property suites.
                </p>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <LimitNumberField
                    icon={Zap}
                    label="Global Free Trial Duration (Days)"
                    hint="Shown on Marketplace, Pricing & Subscription"
                    value={formData.trialDurationDays}
                    onChange={(v) => updateNumericField("trialDurationDays", v)}
                  />
                  <LimitNumberField
                    icon={Percent}
                    label="Annual Billing Discount (%)"
                    hint="0–90% off monthly price on yearly switch"
                    value={formData.annualDiscountPercent}
                    onChange={(v) => updateNumericField("annualDiscountPercent", v)}
                  />
                  <LimitNumberField
                    icon={FileSpreadsheet}
                    label="Live GSP E-Way Bills / Month (Pro)"
                    hint="Live E-Way & GST Pro / Back Office"
                    value={formData.maxProMonthlyEwayBills}
                    onChange={(v) => updateNumericField("maxProMonthlyEwayBills", v)}
                  />
                  <LimitNumberField
                    icon={ShoppingBag}
                    label="Max Active Funnels (Store Builder Pro)"
                    hint="Applies to Store & Funnel Builder"
                    value={formData.maxProFunnels}
                    onChange={(v) => updateNumericField("maxProFunnels", v)}
                  />
                  <LimitNumberField
                    icon={Lightbulb}
                    label="AI Advisor Queries / Month"
                    hint="Intelligence Suite / AI Advisor Pro"
                    value={formData.maxMonthlyAiQueries}
                    onChange={(v) => updateNumericField("maxMonthlyAiQueries", v)}
                  />
                  <LimitNumberField
                    icon={ScanLine}
                    label="AI Bill OCR Scans / Month"
                    hint="Intelligence Suite / AI Bill Scanner"
                    value={formData.maxMonthlyBillScans}
                    onChange={(v) => updateNumericField("maxMonthlyBillScans", v)}
                  />
                  <LimitNumberField
                    icon={SmartphoneNfc}
                    label="WhatsApp Broadcasts / Day"
                    hint="Growth Suite / WhatsApp Automation"
                    value={formData.maxDailyWhatsAppBroadcasts}
                    onChange={(v) => updateNumericField("maxDailyWhatsAppBroadcasts", v)}
                  />
                  <LimitNumberField
                    icon={Ticket}
                    label="Active Loyalty Members (Cap)"
                    hint="Loyalty & Rewards Suite"
                    value={formData.maxLoyaltyMembers}
                    onChange={(v) => updateNumericField("maxLoyaltyMembers", v)}
                  />
                  <LimitNumberField
                    icon={Sun}
                    label="Solar EPC Plants / Projects"
                    hint="Solar Management Suite"
                    value={formData.maxSolarProjects}
                    onChange={(v) => updateNumericField("maxSolarProjects", v)}
                  />
                  <LimitNumberField
                    icon={Building}
                    label="Property Catalog Listings"
                    hint="Property Pro / Asset Catalog"
                    value={formData.maxPropertyListings}
                    onChange={(v) => updateNumericField("maxPropertyListings", v)}
                  />
                  <LimitNumberField
                    icon={HardDrive}
                    label="Workspace Media Storage (MB)"
                    hint="Product & funnel asset storage cap"
                    value={formData.maxStorageMb}
                    onChange={(v) => updateNumericField("maxStorageMb", v)}
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="core-plan-name" className="text-xs font-semibold text-slate-700">
                      Core Plan Display Name
                    </Label>
                    <Input
                      id="core-plan-name"
                      value={formData.corePlanName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, corePlanName: e.target.value }))
                      }
                      className="h-10 rounded-xl border-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="core-plan-tagline" className="text-xs font-semibold text-slate-700">
                      Core Plan Summary Tagline
                    </Label>
                    <Input
                      id="core-plan-tagline"
                      value={formData.corePlanTagline}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, corePlanTagline: e.target.value }))
                      }
                      className="h-10 rounded-xl border-slate-200"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Rail Summary */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl bg-slate-900 text-white p-6 space-y-5">
              <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold">Live Rules Architecture</h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Changes saved here write directly to <span className="font-semibold text-white">system/config/limits/default</span> and synchronize immediately across your entire platform.
                </p>
              </div>
              <ul className="space-y-3 pt-2 border-t border-white/10 text-xs text-slate-200">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Command Center Governance controls visibility & paid locks for all 10 Core menus in Sidebar & Mobile Nav.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>All 10 operational workspaces enforce Free Core quotas (POS, Quotes, E-Way, GST, Inventory, Leads, Customers, Vendors, Cashbook & Fixed Expenses).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Activating the linked Marketplace Add-on (e.g. POS Billing Pro or Live E-Way & GST Pro) unlocks unlimited quota automatically.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Quick Plan Shortcuts</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Switch tabs above to update any individual module price, feature list, visibility, or custom quota limit.
              </p>
              <div className="grid grid-cols-1 gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => selectTab("suites")}
                  className="justify-between h-10 rounded-xl border-slate-200 text-xs font-semibold"
                >
                  <span>Manage {bundles.length} Business Suites</span>
                  <span className="text-slate-500 tabular-nums">{bundles.length}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => selectTab("addons")}
                  className="justify-between h-10 rounded-xl border-slate-200 text-xs font-semibold"
                >
                  <span>Manage {individuals.length} Individual Add-ons</span>
                  <span className="text-slate-500 tabular-nums">{individuals.length}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => selectTab("preview")}
                  className="justify-between h-10 rounded-xl border-slate-200 text-xs font-semibold"
                >
                  <span>Preview Public Comparison Table</span>
                  <span className="text-slate-500 tabular-nums">{previewComparisonRows.length}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2 & TAB 3: SUITES / ADD-ONS PLAN & PRICE MANAGER */}
      {(activeTab === "suites" || activeTab === "addons") && (
        <section className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  activeTab === "suites"
                    ? "Search bundles or included tools..."
                    : "Search add-ons (Store, WhatsApp, Payroll...)"
                }
                className="h-10 rounded-xl border-slate-200 bg-white pl-10 text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeTab === "addons" && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-10 w-[180px] rounded-xl border-slate-200 bg-white text-xs font-semibold">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Categories</SelectItem>
                    {MODULE_CATEGORIES.filter((c) => c !== "Bundles").map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button
                type="button"
                onClick={openCreateCustomModule}
                className="h-10 rounded-xl px-4 text-xs font-semibold"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Custom Module
              </Button>
            </div>
          </div>

          {/* Modules Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="pl-6 py-3.5 text-xs font-semibold text-slate-700">
                      Plan / Module
                    </TableHead>
                    <TableHead className="py-3.5 text-xs font-semibold text-slate-700">
                      Features & Quota Rule
                    </TableHead>
                    <TableHead className="py-3.5 text-xs font-semibold text-slate-700">
                      Monthly / Annual Price
                    </TableHead>
                    <TableHead className="py-3.5 text-xs font-semibold text-slate-700">
                      Trial
                    </TableHead>
                    <TableHead className="py-3.5 text-xs font-semibold text-slate-700">
                      Visible
                    </TableHead>
                    <TableHead className="pr-6 py-3.5 text-right text-xs font-semibold text-slate-700">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(activeTab === "suites" ? filteredSuites : filteredIndividuals).map((item) => {
                    const IconComp = MODULE_ICONS[item.icon] || Bot;
                    const discount =
                      typeof item.annualDiscountPercent === "number"
                        ? item.annualDiscountPercent
                        : draftLimits.annualDiscountPercent;
                    const pricing = calculateMarketplacePrice(item.price, "yearly", discount);
                    const isCustom = !STATIC_IDS.has(item.id);
                    const isSynced = syncedDocIds.has(item.id);

                    return (
                      <TableRow
                        key={item.id}
                        className={cn(
                          "border-slate-100",
                          item.isActive === false && "bg-slate-50/70 opacity-60"
                        )}
                      >
                        <TableCell className="pl-6 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                              <IconComp className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-900">
                                  {item.name}
                                </span>
                                {item.isPopular && (
                                  <span className="text-[11px] font-semibold text-primary">
                                    · Popular
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">
                                {item.category} · <span className="font-mono">{item.id}</span>
                                {!isSynced && " · Default"}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-4 align-top max-w-sm">
                          <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                            {item.inclusions || item.description}
                          </p>
                          {item.usageLimit && (
                            <p className="text-[11px] font-semibold text-primary mt-1">
                              Limit: {item.usageLimit}
                            </p>
                          )}
                        </TableCell>

                        <TableCell className="py-4 align-top whitespace-nowrap">
                          <div className="text-sm font-bold text-slate-900 tabular-nums">
                            ₹{pricing.monthlyOriginal.toLocaleString()}/mo
                          </div>
                          <div className="text-xs text-emerald-700 tabular-nums">
                            ₹{pricing.effectiveMonthly.toLocaleString()}/mo annual (-{pricing.discountPercent}%)
                          </div>
                        </TableCell>

                        <TableCell className="py-4 align-top whitespace-nowrap text-xs text-slate-700 tabular-nums">
                          {item.isTrialAvailable
                            ? `${item.trialDays ?? draftLimits.trialDurationDays} days free`
                            : "Paid only"}
                        </TableCell>

                        <TableCell className="py-4 align-top">
                          <Switch
                            checked={item.isActive !== false}
                            aria-label={`Toggle visibility for ${item.name}`}
                            onCheckedChange={(checked) => handleToggleModuleActive(item, checked)}
                          />
                        </TableCell>

                        <TableCell className="pr-6 py-4 align-top text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openModuleEditor(item)}
                              className="h-8 rounded-lg border-slate-200 text-xs font-semibold"
                            >
                              <Edit2 className="mr-1.5 h-3 w-3" />
                              Edit Plan
                            </Button>
                            {isCustom && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label={`Delete ${item.name}`}
                                onClick={() => handleDeleteCustomModule(item)}
                                className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: LIVE PLAN COMPARISON MATRIX PREVIEW */}
      {activeTab === "preview" && (
        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Live Free Core OS vs Marketplace Suites Matrix
              </h2>
              <p className="text-xs text-slate-600">
                Real-time preview using your configured Free quotas ({draftLimits.maxMonthlyInvoices} invoices, {draftLimits.maxProducts} SKUs, {draftLimits.trialDurationDays}-day trial) and module prices.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-semibold">
              <Link href="/pricing">
                Open Live Pricing Page <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="pl-6 py-3.5 text-xs font-semibold text-slate-700">
                    Capability Area
                  </TableHead>
                  <TableHead className="py-3.5 text-xs font-semibold text-slate-700">
                    {draftLimits.corePlanName} (Free)
                  </TableHead>
                  <TableHead className="pr-6 py-3.5 text-xs font-semibold text-primary">
                    With Marketplace Add-ons
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewComparisonRows.map((row) => (
                  <TableRow key={row.feature} className="border-slate-100">
                    <TableCell className="pl-6 py-4 text-sm font-medium text-slate-900">
                      {row.feature}
                    </TableCell>
                    <TableCell className="py-4 text-sm text-slate-600">{row.free}</TableCell>
                    <TableCell className="pr-6 py-4 text-sm font-medium text-slate-900">
                      {row.paid}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* Module Price, Feature & Quota Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-xl rounded-2xl p-0 overflow-hidden">
          <form onSubmit={handleSaveModule}>
            <DialogHeader className="p-6 bg-slate-900 text-white text-left">
              <DialogTitle className="text-lg font-bold">
                {isCreatingNew ? "Create Marketplace Module" : `Configure ${moduleForm.name}`}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300">
                Updates monthly/annual pricing, trial period, feature bullets, and usage limits across Marketplace and Pricing immediately.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-4 max-h-[68vh] overflow-y-auto text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mod-id" className="text-xs font-semibold text-slate-700">
                    Module ID
                  </Label>
                  <Input
                    id="mod-id"
                    value={moduleForm.id}
                    disabled={!isCreatingNew}
                    onChange={(e) => setModuleForm((p) => ({ ...p, id: e.target.value }))}
                    className="h-10 rounded-xl font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mod-name" className="text-xs font-semibold text-slate-700">
                    Display Name
                  </Label>
                  <Input
                    id="mod-name"
                    value={moduleForm.name}
                    onChange={(e) => setModuleForm((p) => ({ ...p, name: e.target.value }))}
                    className="h-10 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mod-price" className="text-xs font-semibold text-slate-700">
                    Monthly Price (₹)
                  </Label>
                  <Input
                    id="mod-price"
                    type="number"
                    min={0}
                    value={moduleForm.price}
                    onChange={(e) => setModuleForm((p) => ({ ...p, price: e.target.value }))}
                    className="h-10 rounded-xl font-bold tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mod-discount" className="text-xs font-semibold text-slate-700">
                    Annual Discount (%)
                  </Label>
                  <Input
                    id="mod-discount"
                    type="number"
                    min={0}
                    max={90}
                    value={moduleForm.annualDiscountPercent}
                    onChange={(e) =>
                      setModuleForm((p) => ({ ...p, annualDiscountPercent: e.target.value }))
                    }
                    className="h-10 rounded-xl tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mod-trial-days" className="text-xs font-semibold text-slate-700">
                    Trial Days
                  </Label>
                  <Input
                    id="mod-trial-days"
                    type="number"
                    min={0}
                    max={365}
                    value={moduleForm.trialDays}
                    onChange={(e) => setModuleForm((p) => ({ ...p, trialDays: e.target.value }))}
                    className="h-10 rounded-xl tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Category</Label>
                  <Select
                    value={moduleForm.category}
                    onValueChange={(v) => setModuleForm((p) => ({ ...p, category: v }))}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {MODULE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Icon</Label>
                  <Select
                    value={moduleForm.icon}
                    onValueChange={(v) => setModuleForm((p) => ({ ...p, icon: v }))}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {Object.keys(MODULE_ICONS).map((iconName) => (
                        <SelectItem key={iconName} value={iconName}>
                          {iconName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mod-limit" className="text-xs font-semibold text-slate-700">
                  Module Quota / Usage Limit Note
                </Label>
                <Input
                  id="mod-limit"
                  value={moduleForm.usageLimit}
                  onChange={(e) => setModuleForm((p) => ({ ...p, usageLimit: e.target.value }))}
                  placeholder="e.g. Up to 25 Active Funnels · Custom Domain Included"
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mod-desc" className="text-xs font-semibold text-slate-700">
                  Short Summary Description
                </Label>
                <Textarea
                  id="mod-desc"
                  value={moduleForm.description}
                  onChange={(e) => setModuleForm((p) => ({ ...p, description: e.target.value }))}
                  className="h-20 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mod-inclusions" className="text-xs font-semibold text-slate-700">
                  Included Features (Comma-separated)
                </Label>
                <Textarea
                  id="mod-inclusions"
                  value={moduleForm.inclusions}
                  onChange={(e) => setModuleForm((p) => ({ ...p, inclusions: e.target.value }))}
                  placeholder="23-Section Storefront, Sales Funnel Builder, Order Bump, Custom Domain DNS"
                  className="h-20 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5">
                  <Label htmlFor="sw-active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Visible / Active
                  </Label>
                  <Switch
                    id="sw-active"
                    checked={moduleForm.isActive}
                    onCheckedChange={(v) => setModuleForm((p) => ({ ...p, isActive: v }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5">
                  <Label htmlFor="sw-trial" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Allow Free Trial
                  </Label>
                  <Switch
                    id="sw-trial"
                    checked={moduleForm.isTrialAvailable}
                    onCheckedChange={(v) => setModuleForm((p) => ({ ...p, isTrialAvailable: v }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5">
                  <Label htmlFor="sw-popular" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Popular Highlight
                  </Label>
                  <Switch
                    id="sw-popular"
                    checked={moduleForm.isPopular}
                    onCheckedChange={(v) => setModuleForm((p) => ({ ...p, isPopular: v }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 border-t border-slate-100 bg-slate-50/70 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditorOpen(false)}
                className="rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingModule} className="rounded-xl text-xs font-semibold">
                {isSavingModule && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save Plan Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LimitNumberField({
  icon: Icon,
  label,
  hint,
  value,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{label}</span>
        </Label>
        <span className="text-[11px] text-slate-500">{hint}</span>
      </div>
      <Input
        type="number"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border-slate-200 bg-slate-50/50 font-bold text-base text-slate-900 tabular-nums"
      />
    </div>
  );
}
