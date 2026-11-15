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
  Receipt,
  ScanLine,
  ShieldCheck,
  ShoppingBag,
  SmartphoneNfc,
  Sun,
  Ticket,
  Users2,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  calculateMarketplacePrice,
  CORE_OS_CAPABILITIES,
  filterMarketplaceItems,
  MARKETPLACE_FILTER_OPTIONS,
  MARKETPLACE_META,
  type MarketplaceBillingCycle,
  type MarketplaceCategoryFilter,
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

export default function PricingPage() {
  const { limits, bundles, individuals, allItems, comparisonRows } = useMarketplaceCatalog();
  const [billingCycle, setBillingCycle] = useState<MarketplaceBillingCycle>("monthly");
  const [categoryFilter, setCategoryFilter] = useState<MarketplaceCategoryFilter>("all");
  const [salesModalOpen, setSalesModalOpen] = useState(false);
  const [salesPhone, setSalesPhone] = useState("");
  const [salesBusiness, setSalesBusiness] = useState("");

  const storeAddon = useMemo(
    () => allItems.find((i) => i.id === "feat_store"),
    [allItems]
  );

  const filteredSuites = useMemo(
    () =>
      filterMarketplaceItems(bundles, {
        searchTerm: "",
        categoryFilter,
        activeOnly: false,
        activeAddonIds: [],
        bundles,
      }),
    [bundles, categoryFilter]
  );

  const filteredIndividuals = useMemo(
    () =>
      filterMarketplaceItems(individuals, {
        searchTerm: "",
        categoryFilter,
        activeOnly: false,
        activeAddonIds: [],
        bundles,
      }),
    [individuals, bundles, categoryFilter]
  );

  const handleRequestDemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!salesPhone.trim()) {
      toast({
        title: "Contact number required",
        description: "Please enter a phone or WhatsApp number so our team can reach you.",
      });
      return;
    }
    setSalesModalOpen(false);
    setSalesPhone("");
    setSalesBusiness("");
    toast({
      title: "Consultation Requested",
      description: "Our onboarding team will contact you shortly for a walkthrough.",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 font-body">
      {/* 3-Zone Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Biztrix AI
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link
              href="/"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Overview
            </Link>
            <Link
              href="/marketplace"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Marketplace
            </Link>
            <Link
              href="/pricing"
              className="text-slate-900 font-semibold whitespace-nowrap shrink-0"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </Link>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              asChild
              size="sm"
              className="rounded-lg font-semibold whitespace-nowrap shrink-0"
            >
              <Link href="/signup">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-16">
        {/* 1. Hero */}
        <section className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 text-center space-y-6">
          <p className="text-xs font-semibold text-primary">
            Modular Pricing · Free Core OS + Pay-Per-Suite Add-ons
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 max-w-3xl mx-auto text-balance">
            Start with Core Billing & GST Free. Add Suites Only When You Need Them.
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Every account includes POS billing, Live E-Way Bills, GSTR-1/3B exports, quotations,
            inventory, CRM leads, and daily cashbook. Unlock Online Storefronts, Sales Funnels,
            WhatsApp Automation, Loyalty, AI Advisor, Solar EPC, or Back Office anytime.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button asChild size="lg" className="h-12 px-8 rounded-xl font-semibold">
              <Link href="/signup">
                Start {limits.trialDurationDays}-Day Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 px-8 rounded-xl font-semibold border-slate-200"
            >
              <Link href="/marketplace">Browse Marketplace</Link>
            </Button>
          </div>
        </section>

        {/* 2. Core OS Plan (Always Included) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-5 rounded-2xl bg-slate-900 text-white p-8 flex flex-col justify-between space-y-8">
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-300">Included For Every Business</p>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold">{limits.corePlanName}</h2>
                <div className="text-right shrink-0">
                  <span className="text-4xl font-bold tabular-nums">₹0</span>
                  <span className="text-xs text-slate-300 block">
                    {limits.trialDurationDays}-day full trial
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {limits.corePlanTagline} — no credit card required to launch your workspace.
              </p>

              <ul className="space-y-3 pt-4 border-t border-white/10 text-sm text-slate-200">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Up to {limits.maxMonthlyInvoices.toLocaleString()} invoices/mo, {limits.maxProducts.toLocaleString()} products & {limits.maxActiveLeads.toLocaleString()} CRM leads free
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Live GSP E-Way Bill generation, Part-B & Credit Notes</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>GSTR-1 (B2B, B2CL, B2CS, CDNR, HSN) JSON & CSV exports</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Smooth transition to Free Core mode after trial</span>
                </li>
              </ul>
            </div>

            <Button
              asChild
              size="lg"
              className="w-full h-12 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-semibold"
            >
              <Link href="/signup">
                Launch Your Business OS
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                8 Built-in Core Capabilities Included Free
              </h3>
              <p className="text-sm text-slate-600">
                Everything your counter and back desk needs before adding optional paid suites.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {CORE_OS_CAPABILITIES.map((cap) => (
                <div
                  key={cap.id}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-900 leading-snug">
                      {cap.name}
                    </h4>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{cap.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Suites & Modular Add-ons (Synced with Marketplace) */}
        <section className="space-y-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-semibold text-primary">
                All {bundles.length} Business Suites & {individuals.length} Individual Add-ons
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Pick a Bundle Suite or Activate Single Tools
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Switch any module on or off anytime. Save {limits.annualDiscountPercent}% across every suite and add-on with
                annual billing.
              </p>
            </div>

            {/* Monthly / Annual Switch */}
            <div
              role="group"
              aria-label="Billing cycle"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 self-start lg:self-auto shrink-0"
            >
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={cn(
                  "px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0",
                  billingCycle === "monthly"
                    ? "bg-slate-900 text-white"
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
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <span>Annual</span>
                <span
                  className={cn(
                    "font-bold",
                    billingCycle === "yearly" ? "text-emerald-300" : "text-emerald-700"
                  )}
                >
                  Save {limits.annualDiscountPercent}%
                </span>
              </button>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
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

          {/* All-in-One Business Suites */}
          {filteredSuites.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">All-in-One Business Suites</h3>
                <span className="text-xs font-medium text-slate-500 tabular-nums">
                  {filteredSuites.length} {filteredSuites.length === 1 ? "suite" : "suites"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSuites.map((suite) => {
                  const pricing = calculateMarketplacePrice(
                    suite.price,
                    billingCycle,
                    suite.annualDiscountPercent ?? limits.annualDiscountPercent
                  );
                  const meta = MARKETPLACE_META[suite.id];
                  const inclusionPoints = suite.inclusions
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  const highlights = inclusionPoints.length > 0 ? inclusionPoints : meta?.highlights || [];
                  const trialDays = suite.trialDays ?? limits.trialDurationDays;

                  return (
                    <article
                      key={suite.id}
                      className={cn(
                        "rounded-2xl border bg-white p-6 flex flex-col justify-between transition-colors",
                        suite.isPopular
                          ? "border-primary/40 ring-1 ring-primary/15"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className={cn(
                              "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
                              suite.isPopular ? "bg-primary text-white" : "bg-slate-100 text-slate-800"
                            )}
                          >
                            <ModuleIcon name={suite.icon} className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-medium text-slate-500">
                            {suite.isPopular ? "Popular · " : ""}
                            {suite.isTrialAvailable ? `${trialDays}-Day Free Trial` : "Direct Activation"}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <h4 className="text-lg font-bold text-slate-900">{suite.name}</h4>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {suite.description || meta?.bestFor}
                          </p>
                        </div>

                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-slate-900 tabular-nums">
                              ₹{pricing.effectiveMonthly.toLocaleString()}
                            </span>
                            <span className="text-xs text-slate-500">/ month</span>
                            {billingCycle === "yearly" && (
                              <span className="text-xs text-slate-400 line-through tabular-nums">
                                ₹{pricing.monthlyOriginal.toLocaleString()}
                              </span>
                            )}
                          </div>
                          {billingCycle === "yearly" && (
                            <p className="text-xs text-emerald-700 font-medium mt-0.5 tabular-nums">
                              Billed ₹{pricing.yearlyTotal.toLocaleString()}/year · Save ₹
                              {pricing.yearlySavings.toLocaleString()}
                            </p>
                          )}
                          {suite.usageLimit && (
                            <p className="text-xs font-medium text-primary mt-1">{suite.usageLimit}</p>
                          )}
                        </div>

                        <ul className="space-y-2 pt-3 border-t border-slate-100">
                          {highlights.slice(0, 4).map((point, idx) => (
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

                      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                        <Button asChild className="flex-1 h-10 rounded-xl text-xs font-semibold">
                          <Link href={`/marketplace/features/${suite.id}`}>
                            Explore Suite
                            <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          className="h-10 rounded-xl text-xs font-semibold border-slate-200"
                        >
                          <Link href="/signup">Try Free</Link>
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* Individual Modular Apps */}
          {filteredIndividuals.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Individual Modular Add-ons
                  </h3>
                  <p className="text-sm text-slate-600">
                    Start with Store & Funnel Builder, AI Bill Scanner, Custom Branding, or Payroll
                    individually without buying a full suite.
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-500 tabular-nums">
                  {filteredIndividuals.length} {filteredIndividuals.length === 1 ? "add-on" : "add-ons"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredIndividuals.map((item) => {
                  const pricing = calculateMarketplacePrice(
                    item.price,
                    billingCycle,
                    item.annualDiscountPercent ?? limits.annualDiscountPercent
                  );
                  const meta = MARKETPLACE_META[item.id];
                  const highlights = item.inclusions.split(",").map((s) => s.trim()).filter(Boolean);

                  return (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between hover:border-slate-300 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                              <ModuleIcon name={item.icon} className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-base font-bold text-slate-900 truncate">
                                {item.name}
                              </h4>
                              <p className="text-xs text-slate-500">{item.category}</p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-base font-bold text-slate-900 tabular-nums">
                              ₹{pricing.effectiveMonthly.toLocaleString()}
                              <span className="text-xs font-normal text-slate-500">/mo</span>
                            </div>
                            {billingCycle === "yearly" && (
                              <div className="text-[11px] text-slate-400 line-through tabular-nums">
                                ₹{pricing.monthlyOriginal.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-slate-600 leading-relaxed">
                          {item.description || meta?.bestFor}
                        </p>

                        {item.usageLimit && (
                          <p className="text-xs font-medium text-primary">{item.usageLimit}</p>
                        )}

                        <p className="text-xs text-slate-500 leading-relaxed">
                          {highlights.slice(0, 3).join(" · ")}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <Link
                          href={`/marketplace/features/${item.id}`}
                          className="text-xs font-semibold text-slate-700 hover:text-primary transition-colors"
                        >
                          View capabilities →
                        </Link>
                        <Link
                          href="/marketplace"
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Activate in OS
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* 4. Feature Comparison Matrix */}
        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Free Core OS vs Marketplace Suites
              </h2>
              <p className="text-sm text-slate-600">
                Exact limits and capabilities included in Core OS compared to optional paid modules.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 shrink-0">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              No lock-in · Cancel or switch modules anytime
            </span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="pl-6 py-3.5 text-xs font-semibold text-slate-700">
                    Capability Area
                  </TableHead>
                  <TableHead className="py-3.5 text-xs font-semibold text-slate-700">
                    Free Core OS
                  </TableHead>
                  <TableHead className="pr-6 py-3.5 text-xs font-semibold text-primary">
                    With Marketplace Suites / Add-ons
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
        </section>

        {/* 5. FAQ */}
        <section className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Frequently Asked Questions</h2>
            <p className="text-sm text-slate-600">
              Clear answers about trials, modular add-ons, and billing.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-slate-100">
                <AccordionTrigger className="text-left font-semibold text-slate-900">
                  What stays free after my {limits.trialDurationDays}-day trial ends?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-slate-600 leading-relaxed">
                  Your {limits.corePlanName} (POS billing up to {limits.maxMonthlyInvoices.toLocaleString()} invoices/month,{" "}
                  {limits.maxProducts.toLocaleString()} products, {limits.maxActiveLeads.toLocaleString()} CRM leads,
                  customers, vendors, and daily cashbook) remains accessible. Only paid Pro Suites or
                  individual add-ons require an active subscription after trial expiration.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2" className="border-slate-100">
                <AccordionTrigger className="text-left font-semibold text-slate-900">
                  Is Landing Page & Sales Funnel Builder included inside Store Builder?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-slate-600 leading-relaxed">
                  Yes. Activating {storeAddon?.name || "Store & Funnel Builder"} (₹
                  {storeAddon?.price || "799"}/month) unlocks both your 23-section online storefront
                  and up to {limits.maxProFunnels} distraction-free Sales Funnels with Order Bump,
                  COD/Razorpay express checkout, custom domain DNS, and Meta Pixel / GA4 tracking.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3" className="border-slate-100">
                <AccordionTrigger className="text-left font-semibold text-slate-900">
                  What if I buy an individual add-on and later upgrade to an All-in-One Suite?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-slate-600 leading-relaxed">
                  Your Billing & Plan page automatically flags any standalone add-on already covered by
                  an active suite so you can switch off the duplicate add-on in one click.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4" className="border-none">
                <AccordionTrigger className="text-left font-semibold text-slate-900">
                  Are Live E-Way Bill and GSTR-1 / GSTR-3B exports part of Core OS?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-slate-600 leading-relaxed">
                  Yes. GST invoice billing, Udhaar recovery reminders, Credit Notes, Live GSP E-Way
                  Bill generation, and GSTR-1 / GSTR-3B JSON & CSV downloads are built directly into
                  Core OS.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* 6. Final CTA */}
        <section className="rounded-2xl bg-slate-900 text-white p-8 sm:p-12 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-bold text-balance">
            Ready to Run Billing, Storefront & Operations in One Place?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
            Start your {limits.trialDurationDays}-day free trial in seconds or schedule a 15-minute walkthrough with our team.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 px-8 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-semibold"
            >
              <Link href="/signup">Start Your Free Trial</Link>
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() => setSalesModalOpen(true)}
              className="h-12 px-8 rounded-xl border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white font-semibold"
            >
              Request Guided Demo
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span className="font-semibold text-slate-900">Biztrix AI</span>
          <span>© {new Date().getFullYear()} Biztrix AI. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-slate-900">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-slate-900">
              Privacy
            </Link>
            <Link href="/marketplace" className="hover:text-slate-900">
              Marketplace
            </Link>
          </div>
        </div>
      </footer>

      {/* Guided Demo / Sales Consultation Dialog */}
      <Dialog open={salesModalOpen} onOpenChange={setSalesModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleRequestDemo} className="space-y-4">
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg font-bold text-slate-900">
                Request a Guided Walkthrough
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                Share your contact number and business name to get help choosing the right suites.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-left">
              <div className="space-y-1.5">
                <Label htmlFor="sales-phone" className="text-xs font-semibold text-slate-700">
                  Phone / WhatsApp Number
                </Label>
                <Input
                  id="sales-phone"
                  value={salesPhone}
                  onChange={(e) => setSalesPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sales-business" className="text-xs font-semibold text-slate-700">
                  Business Name & Industry (Optional)
                </Label>
                <Input
                  id="sales-business"
                  value={salesBusiness}
                  onChange={(e) => setSalesBusiness(e.target.value)}
                  placeholder="e.g. Retail Electronics, Solar EPC, Real Estate"
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSalesModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl">
                Send Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
