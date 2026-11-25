"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Briefcase,
  Building,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Facebook,
  FileSpreadsheet,
  Gem,
  Handshake,
  Headset,
  Layers,
  Lightbulb,
  ListTodo,
  MessageCircle,
  Palette,
  Power,
  Receipt,
  ScanLine,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  SmartphoneNfc,
  Star,
  Sun,
  Target,
  Ticket,
  Users2,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { doc } from "firebase/firestore";
import {
  useDoc,
  useFirestore,
  useMemoFirebase,
  useUser,
  updateDocumentNonBlocking,
  setDocumentNonBlocking,
} from "@/firebase";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import {
  calculateMarketplacePrice,
  filterMarketplaceItems,
  getItemWorkspaceLink,
  MARKETPLACE_FILTER_OPTIONS,
  MARKETPLACE_META,
  resolveModuleActivationStatus,
  type MarketplaceBillingCycle,
  type MarketplaceCategoryFilter,
} from "@/lib/marketplace-catalog";
import { useMarketplaceCatalog } from "@/hooks/use-marketplace-catalog";
import type { MarketplaceItem } from "./data";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
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
  Star,
  Target,
  Sun,
  Receipt,
  FileSpreadsheet,
};

function ModuleIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] || Bot;
  return <Icon className={className} />;
}

export default function MarketplacePage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const isSignedIn = Boolean(user && !user.isAnonymous);

  const userProfileRef = useMemoFirebase(
    () => (user?.uid && !user.isAnonymous ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid, user?.isAnonymous]
  );
  const { data: userProfile } = useDoc<any>(userProfileRef);

  const businessId = userProfile?.businessId;
  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business, isLoading: isBusinessLoading } = useDoc<any>(businessRef);

  const {
    limits,
    bundles,
    individuals,
    allItems,
    comparisonRows,
  } = useMarketplaceCatalog();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MarketplaceCategoryFilter>("all");
  const [billingCycle, setBillingCycle] = useState<MarketplaceBillingCycle>("monthly");
  const [activeOnly, setActiveOnly] = useState(false);

  const [quickViewItem, setQuickViewItem] = useState<MarketplaceItem | null>(null);
  const [confirmDeactivateItem, setConfirmDeactivateItem] = useState<MarketplaceItem | null>(null);
  const [purchaseModalItem, setPurchaseModalItem] = useState<{
    item: MarketplaceItem;
    mode: "trial" | "pro";
  } | null>(null);
  const [purchaseCycle, setPurchaseCycle] = useState<MarketplaceBillingCycle>("monthly");

  const userRole = (userProfile?.role || "").toLowerCase();
  const isAdmin = useMemo(() => {
    return Boolean(
      (user?.uid && business?.ownerId === user.uid) ||
      userRole === "owner" ||
      userRole === "admin"
    );
  }, [userRole, user?.uid, business?.ownerId]);

  const activeAddonIds: string[] = useMemo(
    () => (Array.isArray(business?.activeAddonIds) ? business.activeAddonIds : []),
    [business]
  );

  const currencySymbol = useMemo(
    () => getCurrencySymbol(business?.currency || "INR"),
    [business?.currency]
  );

  const filteredBundles = useMemo(
    () =>
      filterMarketplaceItems(bundles, {
        searchTerm,
        categoryFilter,
        activeOnly,
        activeAddonIds,
        bundles,
      }),
      [bundles, searchTerm, categoryFilter, activeOnly, activeAddonIds]
  );

  const filteredIndividuals = useMemo(
    () =>
      filterMarketplaceItems(individuals, {
        searchTerm,
        categoryFilter,
        activeOnly,
        activeAddonIds,
        bundles,
      }),
      [individuals, bundles, searchTerm, categoryFilter, activeOnly, activeAddonIds]
  );

  const activeItemsList = useMemo(
    () => allItems.filter((item) => activeAddonIds.includes(item.id)),
    [allItems, activeAddonIds]
  );

  const handleOpenPurchase = (item: MarketplaceItem, mode: "trial" | "pro" = "trial") => {
    if (!isSignedIn) {
      toast({
        title: "Sign in required",
        description: "Please sign in to your business account to enable modules.",
      });
      return;
    }
    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Administrator Permission Required",
        description: "Only workspace owners and administrators can activate or modify business modules.",
      });
      return;
    }
    setPurchaseCycle(billingCycle);
    setPurchaseModalItem({ item, mode });
  };

  const executeActivation = (
    item: MarketplaceItem,
    mode: "trial" | "pro",
    cycle: MarketplaceBillingCycle
  ) => {
    if (!businessRef || !businessId || !user) return;
    if (activeAddonIds.includes(item.id)) {
      setPurchaseModalItem(null);
      return;
    }

    const updatedIds = [...activeAddonIds, item.id];
    updateDocumentNonBlocking(businessRef, {
      activeAddonIds: updatedIds,
      updatedAt: new Date().toISOString(),
    });

    // Record subscription log in Firestore for audit & billing tracking
    const subLogRef = doc(firestore, "businesses", businessId, "subscriptions", item.id);
    setDocumentNonBlocking(
      subLogRef,
      {
        id: item.id,
        moduleId: item.id,
        moduleName: item.name,
        businessId,
        businessName: business?.name || "Workspace",
        category: item.category,
        price: item.price,
        billingCycle: cycle,
        mode: mode === "trial" ? "trial" : "active",
        status: "active",
        activatedAt: new Date().toISOString(),
        activatedByUid: user.uid,
        activatedByEmail: user.email || "",
      },
      { merge: true }
    );

    setPurchaseModalItem(null);
    setQuickViewItem(null);

    toast({
      title: mode === "pro" ? `${item.name} Activated` : `14-Day Free Trial: ${item.name}`,
      description: `Added to ${business?.name || "your workspace"} sidebar (${cycle} billing).`,
    });
  };

  const handleDeactivate = (item: MarketplaceItem) => {
    if (!isSignedIn || !businessRef) return;
    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Administrator Permission Required",
        description: "Only workspace owners and administrators can turn off business modules.",
      });
      return;
    }

    const updatedIds = activeAddonIds.filter((id) => id !== item.id);
    updateDocumentNonBlocking(businessRef, {
      activeAddonIds: updatedIds,
      updatedAt: new Date().toISOString(),
    });

    if (businessId) {
      const subLogRef = doc(firestore, "businesses", businessId, "subscriptions", item.id);
      setDocumentNonBlocking(
        subLogRef,
        {
          status: "disabled",
          disabledAt: new Date().toISOString(),
          disabledByUid: user?.uid,
        },
        { merge: true }
      );
    }

    setConfirmDeactivateItem(null);
    setQuickViewItem(null);
    toast({
      title: `${item.name} Disabled`,
      description: "This module has been removed from your active add-ons.",
    });
  };

  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setActiveOnly(false);
  };

  const quickViewStatus = quickViewItem
    ? resolveModuleActivationStatus(quickViewItem.id, activeAddonIds, bundles)
    : null;
  const quickViewPricing = quickViewItem
    ? calculateMarketplacePrice(
        quickViewItem.price,
        billingCycle,
        quickViewItem.annualDiscountPercent ?? limits.annualDiscountPercent
      )
    : null;
  const quickViewMeta = quickViewItem ? MARKETPLACE_META[quickViewItem.id] : null;

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900">
      {/* Clean 3-Zone Top Bar for public/logged-out visitors */}
      {!isSignedIn && (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
            >
              Biztrix AI
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
              <Link href="/" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
                Home
              </Link>
              <Link
                href="/marketplace"
                className="text-slate-900 font-semibold whitespace-nowrap shrink-0"
              >
                Marketplace
              </Link>
              <Link
                href="/pricing"
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
              >
                Pricing
              </Link>
            </nav>
            <div className="flex items-center gap-3 shrink-0">
              <Button asChild size="sm" className="rounded-lg font-semibold whitespace-nowrap shrink-0">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </header>
      )}

      <div
        className={cn(
          "mx-auto max-w-7xl space-y-8 pb-20 text-left",
          !isSignedIn ? "px-4 pt-8 sm:px-6 lg:px-8" : ""
        )}
      >
        {/* Clear Workspace Header + Billing Cadence Selector */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-semibold text-primary">
                Biztrix App Directory · Modular Business Tools
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
                App & Module Marketplace
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Start with core billing & inventory for free, and turn on only the add-ons your business needs. Every paid module includes a {limits.trialDurationDays}-day free trial.
              </p>
            </div>

            {/* Explicit Segmented Billing Cycle Control */}
            <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
              <span className="text-xs font-medium text-slate-500">Billing Preference</span>
              <div
                role="group"
                aria-label="Billing cycle"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1"
              >
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={cn(
                    "px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0",
                    billingCycle === "monthly"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("yearly")}
                  className={cn(
                    "px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5",
                    billingCycle === "yearly"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <span>Annual</span>
                  <span className="text-emerald-700 font-bold">Save {limits.annualDiscountPercent}%</span>
                </button>
              </div>
            </div>
          </div>

          {/* Active Workspace Strip */}
          {isSignedIn && (
            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <ShoppingBasket className="h-4 w-4 text-primary shrink-0" />
                {isBusinessLoading ? (
                  <span>Loading your active modules...</span>
                ) : activeItemsList.length > 0 ? (
                  <span>
                    <strong className="font-semibold text-slate-900 tabular-nums">
                      {activeItemsList.length}
                    </strong>{" "}
                    {activeItemsList.length === 1 ? "module" : "modules"} active on{" "}
                    <strong className="font-semibold text-slate-900">
                      {business?.name || "your account"}
                    </strong>
                  </span>
                ) : (
                  <span>
                    You are on the <strong className="font-semibold text-slate-900">Free Core Plan</strong> — activate any trial below to unlock extra tools.
                  </span>
                )}
              </div>

              {activeItemsList.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {activeItemsList.slice(0, 3).map((item) => {
                    const link = getItemWorkspaceLink(item.id);
                    return (
                      <Button
                        key={item.id}
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-xs font-medium border-slate-200 hover:border-primary/40 whitespace-nowrap"
                      >
                        <Link href={link.href}>
                          {link.label}
                          <ArrowRight className="ml-1.5 h-3 w-3" />
                        </Link>
                      </Button>
                    );
                  })}
                  <Button
                    type="button"
                    variant={activeOnly ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveOnly((prev) => !prev)}
                    className="h-8 rounded-lg text-xs font-semibold whitespace-nowrap"
                  >
                    {activeOnly ? "Showing Active Only" : "Filter Active"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Search & Category Filter Toolbar */}
        <section aria-label="Filter modules" className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by tool or need (e.g. WhatsApp, GST, Store, Solar)..."
                aria-label="Search marketplace modules"
                className="h-11 rounded-xl border-slate-200 bg-white pl-10 pr-9 text-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              {MARKETPLACE_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCategoryFilter(opt.id)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border",
                    categoryFilter === opt.id
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Empty State if search/filters match nothing */}
        {filteredBundles.length === 0 && filteredIndividuals.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3">
            <p className="text-base font-semibold text-slate-900">No matching modules found</p>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Try clearing your search query or switching back to All Modules.
            </p>
            <Button type="button" variant="outline" onClick={resetFilters} className="rounded-xl">
              Reset All Filters
            </Button>
          </div>
        )}

        {/* 1. All-in-One Business Suites (Bundles) */}
        {filteredBundles.length > 0 && (
          <section className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  All-in-One Business Suites
                </h2>
                <p className="text-sm text-slate-600">
                  Bundled toolkits that combine multiple apps at a lower monthly price.
                </p>
              </div>
              <span className="text-xs font-medium text-slate-500 tabular-nums">
                {filteredBundles.length} {filteredBundles.length === 1 ? "suite" : "suites"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBundles.map((bundle) => {
                const status = resolveModuleActivationStatus(bundle.id, activeAddonIds, bundles);
                const pricing = calculateMarketplacePrice(
                  bundle.price,
                  billingCycle,
                  bundle.annualDiscountPercent ?? limits.annualDiscountPercent
                );
                const meta = MARKETPLACE_META[bundle.id];
                const workspace = getItemWorkspaceLink(bundle.id);
                const trialDays = bundle.trialDays ?? limits.trialDurationDays;
                const inclusionList = bundle.inclusions
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                const displayPoints = inclusionList.length > 0 ? inclusionList : meta?.highlights || [];

                return (
                  <article
                    key={bundle.id}
                    className={cn(
                      "flex flex-col justify-between rounded-2xl border bg-white p-6 transition-colors",
                      status.isAvailable
                        ? "border-emerald-300 ring-1 ring-emerald-200"
                        : bundle.isPopular
                          ? "border-primary/40 ring-1 ring-primary/15"
                          : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="space-y-4">
                      {/* Header Row: Icon + Unboxed Status Text */}
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={cn(
                            "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
                            status.isAvailable
                              ? "bg-emerald-50 text-emerald-700"
                              : bundle.isPopular
                                ? "bg-primary text-white"
                                : "bg-slate-100 text-slate-800"
                          )}
                        >
                          <ModuleIcon name={bundle.icon} className="h-5 w-5" />
                        </div>

                        <div className="text-right text-xs font-medium leading-tight">
                          {status.isAvailable ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Active on Plan
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              {bundle.isPopular && (
                                <>
                                  <span className="font-semibold text-primary">Popular</span>
                                  <span aria-hidden="true">·</span>
                                </>
                              )}
                              {bundle.isTrialAvailable && <span>{trialDays}-Day Free Trial</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Title & Plain Audience Explanation */}
                      <div className="space-y-1.5">
                        <h3 className="text-lg font-bold text-slate-900">{bundle.name}</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {bundle.description || meta?.bestFor}
                        </p>
                      </div>

                      {/* Price Display with Tabular Figures */}
                      <div className="pt-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-slate-900 tabular-nums">
                            {currencySymbol}
                            {pricing.effectiveMonthly.toLocaleString()}
                          </span>
                          <span className="text-xs font-medium text-slate-500">/ month</span>
                          {billingCycle === "yearly" && (
                            <span className="text-xs text-slate-400 line-through tabular-nums">
                              {currencySymbol}
                              {pricing.monthlyOriginal.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {billingCycle === "yearly" && (
                          <p className="text-xs text-emerald-700 font-medium mt-0.5 tabular-nums">
                            Billed {currencySymbol}
                            {pricing.yearlyTotal.toLocaleString()}/year · You save {currencySymbol}
                            {pricing.yearlySavings.toLocaleString()}
                          </p>
                        )}
                        {bundle.usageLimit && (
                          <p className="text-xs font-medium text-primary mt-1">{bundle.usageLimit}</p>
                        )}
                      </div>

                      {/* Included Tools List */}
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <p className="text-xs font-semibold text-slate-500">What&apos;s included</p>
                        <ul className="space-y-1.5">
                          {displayPoints.slice(0, 4).map((point, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-xs text-slate-700 leading-snug"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Clear Action Footer */}
                    <div className="mt-6 pt-4 border-t border-slate-100 space-y-2.5">
                      {status.isAvailable ? (
                        <div className="flex items-center gap-2">
                          <Button asChild className="flex-1 h-10 rounded-xl font-semibold text-xs">
                            <Link href={workspace.href}>
                              {workspace.label}
                              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title={`Turn off ${bundle.name}`}
                            aria-label={`Turn off ${bundle.name}`}
                            onClick={() => setConfirmDeactivateItem(bundle)}
                            className="h-10 w-10 rounded-xl border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 shrink-0"
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={() =>
                              handleOpenPurchase(bundle, bundle.isTrialAvailable ? "trial" : "pro")
                            }
                            className="flex-1 h-10 rounded-xl font-semibold text-xs"
                          >
                            {bundle.isTrialAvailable ? `Start ${trialDays}-Day Free Trial` : "Activate Suite"}
                          </Button>
                        </div>
                      )}

                      <Link
                        href={`/marketplace/features/${bundle.id}`}
                        className="flex items-center justify-between px-1 py-1 text-xs font-medium text-slate-600 hover:text-primary transition-colors"
                      >
                        <span>Explore full features & rules</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* 2. Individual Apps & Add-ons */}
        {filteredIndividuals.length > 0 && (
          <section className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Individual Apps & Add-ons
                </h2>
                <p className="text-sm text-slate-600">
                  Need only one specific feature? Pick individual apps without buying a full suite.
                </p>
              </div>
              <span className="text-xs font-medium text-slate-500 tabular-nums">
                {filteredIndividuals.length} {filteredIndividuals.length === 1 ? "app" : "apps"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredIndividuals.map((item) => {
                const status = resolveModuleActivationStatus(item.id, activeAddonIds, bundles);
                const pricing = calculateMarketplacePrice(
                  item.price,
                  billingCycle,
                  item.annualDiscountPercent ?? limits.annualDiscountPercent
                );
                const meta = MARKETPLACE_META[item.id];
                const workspace = getItemWorkspaceLink(item.id);
                const trialDays = item.trialDays ?? limits.trialDurationDays;

                return (
                  <article
                    key={item.id}
                    className={cn(
                      "flex flex-col justify-between rounded-2xl border bg-white p-5 transition-colors",
                      status.isAvailable
                        ? "border-emerald-300 ring-1 ring-emerald-200"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                              status.isAvailable
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-700"
                            )}
                          >
                            <ModuleIcon name={item.icon} className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-slate-900 truncate">
                              {item.name}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {item.category}
                              {status.includedViaSuiteName && (
                                <>
                                  {" · "}
                                  <span className="text-emerald-700 font-medium">
                                    Included in {status.includedViaSuiteName}
                                  </span>
                                </>
                              )}
                              {!status.includedViaSuiteName && status.isDirectlyActive && (
                                <>
                                  {" · "}
                                  <span className="text-emerald-700 font-medium">Active</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-base font-bold text-slate-900 tabular-nums">
                            {currencySymbol}
                            {pricing.effectiveMonthly.toLocaleString()}
                            <span className="text-xs font-normal text-slate-500">/mo</span>
                          </div>
                          {billingCycle === "yearly" && (
                            <div className="text-[11px] text-slate-400 line-through tabular-nums">
                              {currencySymbol}
                              {pricing.monthlyOriginal.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                        {item.description || meta?.bestFor}
                      </p>
                      {item.usageLimit && (
                        <p className="text-xs font-medium text-primary">{item.usageLimit}</p>
                      )}
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setQuickViewItem(item)}
                        className="text-xs font-semibold text-slate-600 hover:text-primary transition-colors py-1.5"
                      >
                        View capabilities
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        {status.isAvailable ? (
                          <>
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-9 rounded-xl text-xs font-semibold border-slate-200"
                            >
                              <Link href={workspace.href}>
                                Open
                                <ExternalLink className="ml-1.5 h-3 w-3" />
                              </Link>
                            </Button>
                            {status.isDirectlyActive && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                title={`Turn off ${item.name}`}
                                aria-label={`Turn off ${item.name}`}
                                onClick={() => setConfirmDeactivateItem(item)}
                                className="h-9 w-9 rounded-xl text-slate-400 hover:text-rose-600"
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              handleOpenPurchase(item, item.isTrialAvailable ? "trial" : "pro")
                            }
                            className="h-9 rounded-xl px-4 text-xs font-semibold"
                          >
                            {item.isTrialAvailable ? `Try ${trialDays} Days Free` : "Activate"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. Clear Plan Comparison Table */}
        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Free Core Plan vs Paid Add-ons
              </h2>
              <p className="text-sm text-slate-600">
                See what comes built-in forever versus what unlocks with marketplace modules.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600 shrink-0">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Cancel or switch anytime
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="pl-6 py-3.5 text-xs font-semibold text-slate-700">
                    Business Capability
                  </TableHead>
                  <TableHead className="py-3.5 text-xs font-semibold text-slate-700">
                    Free Core Plan
                  </TableHead>
                  <TableHead className="pr-6 py-3.5 text-xs font-semibold text-primary">
                    With Marketplace Add-ons
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonRows.map((row) => (
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

          <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-6">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> No setup fee
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Instant sidebar unlock
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Keep your data if you switch
              </span>
            </div>
            {isSignedIn && (
              <Link
                href="/settings/subscription"
                className="font-semibold text-primary hover:underline"
              >
                Manage billing & active plan →
              </Link>
            )}
          </div>
        </section>
      </div>

      {/* Quick-View Dialog for Individual Apps */}
      <Dialog open={Boolean(quickViewItem)} onOpenChange={(open) => !open && setQuickViewItem(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          {quickViewItem && quickViewPricing && quickViewStatus && (
            <>
              <DialogHeader className="text-left space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ModuleIcon name={quickViewItem.icon} className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-slate-900">
                      {quickViewItem.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      {quickViewItem.category} · {currencySymbol}
                      {quickViewPricing.effectiveMonthly.toLocaleString()}/month
                      {billingCycle === "yearly" ? " (billed annually)" : ""}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2 text-left">
                <p className="text-sm text-slate-700 leading-relaxed">
                  {quickViewMeta?.bestFor || quickViewItem.description}
                </p>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
                  <p className="text-xs font-semibold text-slate-600">Key features included</p>
                  <ul className="space-y-2">
                    {(quickViewItem.inclusions
                      ? quickViewItem.inclusions
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      : quickViewMeta?.highlights || [quickViewItem.description]
                    ).map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-800">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  {quickViewItem.usageLimit && (
                    <p className="text-xs font-semibold text-primary pt-1">
                      Quota: {quickViewItem.usageLimit}
                    </p>
                  )}
                </div>

                {quickViewStatus.includedViaSuiteName && (
                  <p className="text-xs font-medium text-emerald-700">
                    Already included via your active {quickViewStatus.includedViaSuiteName} bundle — no extra charge required.
                  </p>
                )}
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                {quickViewStatus.isDirectlyActive ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmDeactivateItem(quickViewItem)}
                    className="rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    Turn Off Module
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setQuickViewItem(null)}
                    className="rounded-xl"
                  >
                    Close
                  </Button>
                  {quickViewStatus.isAvailable ? (
                    <Button asChild className="rounded-xl">
                      <Link href={getItemWorkspaceLink(quickViewItem.id).href}>
                        {getItemWorkspaceLink(quickViewItem.id).label}
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => {
                        handleOpenPurchase(
                          quickViewItem,
                          quickViewItem.isTrialAvailable ? "trial" : "pro"
                        );
                      }}
                      className="rounded-xl"
                    >
                      {quickViewItem.isTrialAvailable
                        ? `Start ${quickViewItem.trialDays ?? limits.trialDurationDays}-Day Trial`
                        : "Activate Now"}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Module Purchase & Activation Confirmation Dialog */}
      <Dialog
        open={Boolean(purchaseModalItem)}
        onOpenChange={(open) => !open && setPurchaseModalItem(null)}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white border border-slate-200">
          {purchaseModalItem && (() => {
            const item = purchaseModalItem.item;
            const mode = purchaseModalItem.mode;
            const pricing = calculateMarketplacePrice(
              item.price,
              purchaseCycle,
              item.annualDiscountPercent ?? limits.annualDiscountPercent
            );
            const isTrial = mode === "trial" && item.isTrialAvailable;

            return (
              <>
                <DialogHeader className="text-left space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <ModuleIcon name={item.icon} className="h-5 w-5" />
                    </div>
                    <div>
                      <DialogTitle className="text-base font-bold text-slate-900">
                        {isTrial ? `Start Free Trial: ${item.name}` : `Activate ${item.name}`}
                      </DialogTitle>
                      <p className="text-xs text-slate-500">
                        Workspace: <span className="font-semibold text-slate-800">{business?.name || "Workspace"}</span>
                      </p>
                    </div>
                  </div>
                  <DialogDescription className="text-xs text-slate-600 leading-relaxed">
                    {item.description}
                  </DialogDescription>
                </DialogHeader>

                <div className="my-4 space-y-4 pt-2">
                  {/* Billing cycle toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Billing Preference</p>
                      <p className="text-[11px] text-slate-500">
                        {purchaseCycle === "yearly" ? `Save ${limits.annualDiscountPercent}% annually` : "Standard monthly billing"}
                      </p>
                    </div>
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                      <button
                        type="button"
                        onClick={() => setPurchaseCycle("monthly")}
                        className={cn(
                          "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                          purchaseCycle === "monthly"
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setPurchaseCycle("yearly")}
                        className={cn(
                          "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                          purchaseCycle === "yearly"
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        Yearly
                      </button>
                    </div>
                  </div>

                  {/* Pricing breakdown */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-600">Plan Rate:</span>
                      <div className="text-right">
                        <span className="text-lg font-bold text-slate-900">
                          ₹{pricing.effectiveMonthly.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500">/mo</span>
                      </div>
                    </div>
                    {purchaseCycle === "yearly" && (
                      <p className="text-[11px] text-emerald-700 font-medium text-right">
                        Billed ₹{pricing.yearlyTotal.toLocaleString()}/yr · Save ₹{pricing.yearlySavings.toLocaleString()}
                      </p>
                    )}
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                      <span className="text-slate-500">Charge Today:</span>
                      <span className="font-bold text-emerald-700">
                        {isTrial ? "₹0.00 (14 Days Free)" : `₹${pricing.effectiveMonthly.toLocaleString()} (Added to Plan)`}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 bg-slate-100/70 p-3 rounded-lg leading-relaxed">
                    {isTrial
                      ? `You will get instant full access for ${item.trialDays ?? limits.trialDurationDays} days. Features unlock in your workspace navigation immediately.`
                      : `This module will be immediately active for all team members in ${business?.name || "your workspace"}. You can manage or disable anytime.`}
                  </div>
                </div>

                <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPurchaseModalItem(null)}
                    className="rounded-xl text-xs font-medium"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => executeActivation(item, mode, purchaseCycle)}
                    className="rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white flex-1"
                  >
                    {isTrial ? "Confirm & Start Free Trial" : "Confirm & Activate"}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Safe Confirmation Dialog before turning off an active module */}
      <Dialog
        open={Boolean(confirmDeactivateItem)}
        onOpenChange={(open) => !open && setConfirmDeactivateItem(null)}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          {confirmDeactivateItem && (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Turn off {confirmDeactivateItem.name}?
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-600 pt-1">
                  Your saved records stay safe, and you can re-enable this module anytime from the Marketplace.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmDeactivateItem(null)}
                  className="rounded-xl"
                >
                  Keep Active
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDeactivate(confirmDeactivateItem)}
                  className="rounded-xl"
                >
                  Confirm Turn Off
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
