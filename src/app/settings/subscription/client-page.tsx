"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Briefcase,
  Building,
  CheckCircle2,
  ExternalLink,
  Facebook,
  FileSpreadsheet,
  Gem,
  Handshake,
  Headset,
  History,
  Layers,
  Lightbulb,
  ListTodo,
  MessageCircle,
  Palette,
  Power,
  Receipt,
  ScanLine,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  SmartphoneNfc,
  Sun,
  Ticket,
  Users2,
  Wallet,
  Zap,
} from "lucide-react";
import { collection, doc, limit, query, where } from "firebase/firestore";
import {
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
  useUser,
  updateDocumentNonBlocking,
} from "@/firebase";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import type { MarketplaceItem } from "@/app/marketplace/data";
import {
  calculateMarketplacePrice,
  calculateSubscriptionSummary,
  CORE_OS_CAPABILITIES,
  getItemWorkspaceLink,
  MARKETPLACE_META,
  resolveBusinessPlanState,
  type MarketplaceBillingCycle,
} from "@/lib/marketplace-catalog";
import { useMarketplaceCatalog } from "@/hooks/use-marketplace-catalog";

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
  Sun,
  Receipt,
  FileSpreadsheet,
};

function ModuleIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] || Bot;
  return <Icon className={className} />;
}

export default function SubscriptionPage() {
  const firestore = useFirestore();
  const { user } = useUser();

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

  const paymentsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "system", "logs", "payments"),
            where("businessId", "==", businessId),
            limit(10)
          )
        : null,
    [firestore, businessId]
  );
  const { data: paymentLogs } = useCollection<any>(paymentsQuery);

  const { limits, bundles, individuals } = useMarketplaceCatalog();

  const [billingCycle, setBillingCycle] = useState<MarketplaceBillingCycle>("monthly");
  const [confirmTurnOffItem, setConfirmTurnOffItem] = useState<MarketplaceItem | null>(null);

  const activeAddonIds: string[] = useMemo(
    () => (Array.isArray(business?.activeAddonIds) ? business.activeAddonIds : []),
    [business]
  );

  const currencySymbol = getCurrencySymbol(business?.currency || "INR");
  const planState = useMemo(
    () => resolveBusinessPlanState(business, new Date(), limits.trialDurationDays),
    [business, limits.trialDurationDays]
  );
  const summary = useMemo(
    () =>
      calculateSubscriptionSummary(
        activeAddonIds,
        billingCycle,
        bundles,
        individuals,
        limits.annualDiscountPercent
      ),
    [activeAddonIds, billingCycle, bundles, individuals, limits.annualDiscountPercent]
  );

  const directActiveItems = useMemo(
    () => [...summary.activeSuites, ...summary.activeIndividuals],
    [summary.activeSuites, summary.activeIndividuals]
  );

  const suggestedSuites = useMemo(
    () => bundles.filter((b) => !activeAddonIds.includes(b.id)).slice(0, 3),
    [bundles, activeAddonIds]
  );

  const userRole = (userProfile?.role || "").toLowerCase();
  const isAdmin = useMemo(() => {
    return Boolean(
      (user?.uid && business?.ownerId === user.uid) ||
      userRole === "owner" ||
      userRole === "admin"
    );
  }, [userRole, user?.uid, business?.ownerId]);

  const handleToggleAddon = (item: MarketplaceItem, enable: boolean) => {
    if (!isSignedIn || !businessRef) {
      toast({
        title: "Sign in required",
        description: "Sign in to your business account to update active modules.",
      });
      return;
    }

    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Administrator Permission Required",
        description: "Only workspace owners and administrators can manage active modules.",
      });
      return;
    }

    if (!enable) {
      setConfirmTurnOffItem(item);
      return;
    }

    if (activeAddonIds.includes(item.id)) return;

    updateDocumentNonBlocking(businessRef, {
      activeAddonIds: [...activeAddonIds, item.id],
      updatedAt: new Date().toISOString(),
    });

    toast({
      title: `${item.name} Activated`,
      description: "Unlocked in your sidebar immediately.",
    });
  };

  const confirmDisable = (item: MarketplaceItem) => {
    if (!businessRef) return;
    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Administrator Permission Required",
        description: "Only workspace owners and administrators can turn off modules.",
      });
      return;
    }
    updateDocumentNonBlocking(businessRef, {
      activeAddonIds: activeAddonIds.filter((id) => id !== item.id),
      updatedAt: new Date().toISOString(),
    });
    setConfirmTurnOffItem(null);
    toast({
      title: `${item.name} Turned Off`,
      description: "Removed from your active plan. Saved records remain safe.",
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 text-left">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to OS Settings
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Gem className="h-6 w-6 text-primary shrink-0" />
            Plan & Active Modules
          </h1>
          <p className="text-sm text-slate-600">
            View your current Biztrix OS status, active suites & add-ons, and Core OS entitlements.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            asChild
            variant="outline"
            className="h-10 rounded-xl border-slate-200 text-xs font-semibold"
          >
            <Link href="/pricing">Compare All Plans</Link>
          </Button>
          <Button asChild className="h-10 rounded-xl text-xs font-semibold">
            <Link href="/marketplace">
              <ShoppingBasket className="mr-1.5 h-4 w-4" />
              Browse Marketplace
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Current Plan & Active Modules */}
        <div className="lg:col-span-8 space-y-6">
          {/* Plan Summary Card */}
          <section className="rounded-2xl bg-slate-900 text-white p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-300">
                  {business?.name || "Your Workspace"} · {planState.statusLabel}
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold">{planState.planTitle}</h2>
                {planState.trialEndLabel && (
                  <p className="text-xs text-slate-300">
                    Trial period ends on {planState.trialEndLabel}
                  </p>
                )}
              </div>

              <div className="text-left sm:text-right shrink-0">
                <div className="text-3xl sm:text-4xl font-bold tabular-nums">
                  {currencySymbol}
                  {summary.billableEffectiveMonthly.toLocaleString()}
                  <span className="text-sm font-normal text-slate-300">/mo</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 tabular-nums">
                  {billingCycle === "yearly"
                    ? `Billed ${currencySymbol}${summary.billableYearlyTotal.toLocaleString()}/year (${limits.annualDiscountPercent}% off)`
                    : `${directActiveItems.length} paid ${directActiveItems.length === 1 ? "module" : "modules"} active`}
                </p>
              </div>
            </div>

            {/* Monthly / Annual Estimate Toggle */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-300">Estimate cadence:</span>
                <div className="inline-flex items-center rounded-lg bg-white/10 p-1">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("monthly")}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-md transition-colors",
                      billingCycle === "monthly" ? "bg-white text-slate-900" : "text-slate-200"
                    )}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle("yearly")}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-md transition-colors",
                      billingCycle === "yearly" ? "bg-white text-slate-900" : "text-slate-200"
                    )}
                  >
                    Annual (-{limits.annualDiscountPercent}%)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  asChild
                  size="sm"
                  className="h-9 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-semibold"
                >
                  <Link href="/marketplace">
                    Add or Remove Modules
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Redundant Add-on Notice */}
          {summary.redundantAddonIds.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900 space-y-1">
                <p className="font-semibold">Duplicate module detected on your plan</p>
                <p className="text-xs leading-relaxed">
                  One or more individual add-ons are already included inside an active All-in-One
                  Suite. You can turn off the duplicate standalone add-on below without losing access.
                </p>
              </div>
            </div>
          )}

          {/* Active Paid Suites & Add-ons */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Active Paid Suites & Add-ons ({directActiveItems.length})
              </h3>
              <Link href="/marketplace" className="text-xs font-semibold text-primary hover:underline">
                Open Full Marketplace →
              </Link>
            </div>

            {isBusinessLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Loading your active modules...
              </div>
            ) : directActiveItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-3">
                <p className="text-base font-semibold text-slate-900">
                  No paid suites or add-ons active yet
                </p>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  You are running {limits.corePlanName} for free (up to {limits.maxMonthlyInvoices} invoices/mo & {limits.maxProducts} SKUs). Start a {limits.trialDurationDays}-day trial on Store & Funnel
                  Builder, Growth Suite, Loyalty, or any add-on from the Marketplace.
                </p>
                <Button asChild className="rounded-xl text-xs font-semibold">
                  <Link href="/marketplace">Explore All Suites & Add-ons</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {directActiveItems.map((item) => {
                  const pricing = calculateMarketplacePrice(
                    item.price,
                    billingCycle,
                    item.annualDiscountPercent ?? limits.annualDiscountPercent
                  );
                  const workspace = getItemWorkspaceLink(item.id);
                  const meta = MARKETPLACE_META[item.id];
                  const isRedundant = summary.redundantAddonIds.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                          <ModuleIcon name={item.icon} className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                            <span className="text-xs text-emerald-700 font-medium">· Active</span>
                            {isRedundant && (
                              <span className="text-xs text-amber-700 font-medium">
                                · Already covered by Suite
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-1">
                            {meta?.bestFor || item.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        <div className="text-left sm:text-right">
                          <p className="text-sm font-bold text-slate-900 tabular-nums">
                            {currencySymbol}
                            {pricing.effectiveMonthly.toLocaleString()}/mo
                          </p>
                          <p className="text-[11px] text-slate-500">{item.category}</p>
                        </div>

                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-9 rounded-xl text-xs font-semibold border-slate-200"
                        >
                          <Link href={workspace.href}>
                            Open
                            <ExternalLink className="ml-1.5 h-3 w-3" />
                          </Link>
                        </Button>

                        <Switch
                          checked={true}
                          aria-label={`Turn off ${item.name}`}
                          onCheckedChange={(checked) => handleToggleAddon(item, checked)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add-ons Included Automatically Via Active Suites */}
            {summary.unlockedViaSuite.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <p className="text-xs font-semibold text-slate-600">
                  Included at ₹0 Extra via Your Active Suites ({summary.unlockedViaSuite.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {summary.unlockedViaSuite.map(({ item, suiteName }) => {
                    const workspace = getItemWorkspaceLink(item.id);
                    return (
                      <Link
                        key={item.id}
                        href={workspace.href}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5 hover:border-primary/30 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-emerald-700 truncate">
                            Included in {suiteName}
                          </p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Included Core OS Capabilities */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Included Free in Your Core Business OS
                </h3>
                <p className="text-xs text-slate-600">
                  Built-in modules always enabled on your workspace.
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-700">₹0 / forever</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CORE_OS_CAPABILITIES.map((cap) => (
                <Link
                  key={cap.id}
                  href={cap.href}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 hover:border-slate-300 transition-colors flex items-start gap-2.5"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900">{cap.name}</p>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{cap.summary}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Quick Add & Billing History */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick-Enable Popular Suites */}
          {suggestedSuites.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Available Suites to Unlock</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Try any suite free for {limits.trialDurationDays} days directly from here.
                </p>
              </div>

              <div className="space-y-3">
                {suggestedSuites.map((suite) => {
                  const price = calculateMarketplacePrice(
                    suite.price,
                    billingCycle,
                    suite.annualDiscountPercent ?? limits.annualDiscountPercent
                  );
                  return (
                    <div
                      key={suite.id}
                      className="rounded-xl border border-slate-200/80 p-3.5 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {suite.name}
                          </p>
                          <p className="text-xs text-slate-500 line-clamp-2">{suite.description}</p>
                        </div>
                        <span className="text-xs font-bold text-slate-900 tabular-nums shrink-0">
                          {currencySymbol}
                          {price.effectiveMonthly.toLocaleString()}/mo
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleToggleAddon(suite, true)}
                          className="flex-1 h-8 rounded-lg text-xs font-semibold"
                        >
                          Start {suite.trialDays ?? limits.trialDurationDays}-Day Trial
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-lg text-xs font-semibold"
                        >
                          <Link href={`/marketplace/features/${suite.id}`}>Details</Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Security & Policy Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Subscription Flexibility
            </h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Turn off any add-on anytime — your saved records remain intact.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Instant sidebar unlock across desktop & mobile navigation.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Annual billing saves {limits.annualDiscountPercent}% on all suites and individual add-ons.</span>
              </li>
            </ul>
          </section>

          {/* Real Billing / Payment Logs */}
          <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-slate-900">Payment History</h3>
            </div>
            <div className="p-6">
              {paymentLogs && paymentLogs.length > 0 ? (
                <div className="divide-y divide-slate-100 -my-2">
                  {paymentLogs.map((log: any) => (
                    <div key={log.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {log.moduleName || log.planName || "Module Subscription"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {log.createdAt
                            ? new Date(log.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "Recorded"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-slate-900 tabular-nums">
                          {currencySymbol}
                          {Number(log.amount || 0).toLocaleString()}
                        </p>
                        <span className="text-[11px] font-medium text-emerald-700">
                          {log.status || "Paid"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 leading-relaxed">
                  No paid subscription receipts yet. Receipts will appear here automatically once a
                  paid module charge is processed.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Confirm Turn Off Dialog */}
      <Dialog
        open={Boolean(confirmTurnOffItem)}
        onOpenChange={(open) => !open && setConfirmTurnOffItem(null)}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          {confirmTurnOffItem && (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Turn off {confirmTurnOffItem.name}?
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-600 pt-1">
                  Your saved records stay safe, and you can turn this module back on anytime from
                  Marketplace or this Plan page.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmTurnOffItem(null)}
                  className="rounded-xl"
                >
                  Keep Active
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => confirmDisable(confirmTurnOffItem)}
                  className="rounded-xl"
                >
                  <Power className="mr-1.5 h-3.5 w-3.5" />
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