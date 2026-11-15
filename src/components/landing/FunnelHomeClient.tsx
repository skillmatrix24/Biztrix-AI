"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Building2,
  Check,
  ChevronRight,
  Layers,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase/provider";
import { cn } from "@/lib/utils";
import heroBusinessImg from "@/assets/images/hero_business_command_1794654942961.jpg";
import verticalSolarImg from "@/assets/images/vertical_solar_os_1794654941735.jpg";
import verticalPropertyImg from "@/assets/images/vertical_property_pro_1794654943910.jpg";
import {
  FUNNEL_STAGES,
  MODULE_CATALOG,
  FRAGMENTED_TOOL_OPTIONS,
  calculateFunnelBundleEstimate,
  type FunnelStageId,
  type ModuleCategory,
} from "./funnel-data";

const INDUSTRY_PRESETS: Record<string, { label: string; toolIds: string[] }> = {
  retail: {
    label: "Retail & D2C",
    toolIds: ["billing_inv", "whatsapp_crm", "storefront", "loyalty"],
  },
  solar: {
    label: "Solar EPC",
    toolIds: ["billing_inv", "whatsapp_crm", "ops_ai", "support"],
  },
  realestate: {
    label: "Real Estate",
    toolIds: ["billing_inv", "whatsapp_crm", "ops_ai"],
  },
  services: {
    label: "Services & Agency",
    toolIds: ["billing_inv", "whatsapp_crm", "loyalty", "ops_ai", "support"],
  },
};

export function FunnelHomeClient() {
  const { user } = useUser();
  const isLoggedIn = Boolean(user && !user.isAnonymous);

  const [activeStageId, setActiveStageId] = useState<FunnelStageId>("attract");
  const [moduleFilter, setModuleFilter] = useState<ModuleCategory>("all");
  const [selectedPreset, setSelectedPreset] = useState<string>("retail");
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>(
    INDUSTRY_PRESETS.retail.toolIds
  );

  const activeStage = useMemo(
    () => FUNNEL_STAGES.find((s) => s.id === activeStageId) || FUNNEL_STAGES[0],
    [activeStageId]
  );

  const filteredModules = useMemo(() => {
    if (moduleFilter === "all") return MODULE_CATALOG;
    return MODULE_CATALOG.filter((m) => m.category === moduleFilter);
  }, [moduleFilter]);

  const estimate = useMemo(
    () => calculateFunnelBundleEstimate(selectedToolIds),
    [selectedToolIds]
  );

  const handlePresetSelect = (presetKey: string) => {
    setSelectedPreset(presetKey);
    const preset = INDUSTRY_PRESETS[presetKey];
    if (preset) {
      setSelectedToolIds(preset.toolIds);
    }
  };

  const toggleTool = (id: string) => {
    setSelectedToolIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-body selection:bg-primary/15">
      {/* TOP BAR CONTRACT: 3 clean zones separated by gap-8 */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <span className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4" />
            </span>
            <span>Biztrix AI</span>
          </Link>

          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
          >
            <a
              href="#funnel"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Funnel
            </a>
            <a
              href="#modules"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Modules
            </a>
            <a
              href="#industries"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Industries
            </a>
            <a
              href="#estimator"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Savings
            </a>
          </nav>

          <div className="flex items-center gap-4 shrink-0">
            {!isLoggedIn && (
              <Link
                href="/login"
                className="hidden sm:inline-block text-sm font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap shrink-0"
              >
                Login
              </Link>
            )}
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 text-white rounded-lg px-4 py-2 h-10 text-sm font-semibold whitespace-nowrap shrink-0 shadow-sm"
            >
              <Link href={isLoggedIn ? "/dashboard" : "/signup"}>
                {isLoggedIn ? "Open Dashboard" : "Start Free Trial"}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* STAGE 0: HERO PROPOSITION + SINGLE VISUAL ANCHOR */}
        <section className="border-b border-slate-200 bg-slate-50/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-12 lg:pt-20 lg:pb-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center space-y-6 text-left">
                <p className="text-xs font-semibold tracking-wide text-primary">
                  Unified Business Operating System · GST, Inventory, CRM & AI
                </p>

                <h1 className="text-[clamp(2.25rem,4vw,3.5rem)] font-extrabold tracking-tight text-slate-900 leading-[1.1] text-balance">
                  One connected funnel from first lead to repeat buyer.
                </h1>

                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                  Alag-alag billing, WhatsApp, store, loyalty aur staff apps chalana band karein.
                  Biztrix AI har module ko ek real-time business funnel me jodta hai.
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
                  <Button
                    asChild
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-white rounded-lg h-12 px-6 text-sm font-semibold whitespace-nowrap shrink-0 shadow-sm"
                  >
                    <Link href={isLoggedIn ? "/dashboard" : "/signup"}>
                      {isLoggedIn ? "Go to Control Center" : "Start 14-Day Free Trial"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>

                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center h-12 px-4 text-sm font-semibold text-slate-700 hover:text-primary transition-colors whitespace-nowrap shrink-0"
                  >
                    Compare All Modules
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 pt-1">
                  <span>14-day full access</span>
                  <span aria-hidden="true">·</span>
                  <span>No credit card required</span>
                  <span aria-hidden="true">·</span>
                  <span>WhatsApp & Razorpay ready</span>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="relative h-full min-h-[280px] sm:min-h-[360px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
                  <Image
                    src={heroBusinessImg}
                    alt="Business owner managing leads, billing, and storefront analytics on Biztrix AI"
                    fill
                    priority
                    referrerPolicy="no-referrer"
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </div>
            </div>

            {/* FULL-WIDTH 4-COLUMN FUNNEL SUMMARY STRIP */}
            <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-6 text-left">
              <div>
                <p className="font-mono tabular-nums text-2xl font-bold text-slate-900">05</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">Revenue Funnel Stages</p>
                <p className="text-xs text-slate-500 mt-0.5">Lead capture to AI retention</p>
              </div>
              <div>
                <p className="font-mono tabular-nums text-2xl font-bold text-slate-900">07</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">Specialized Pro Suites</p>
                <p className="text-xs text-slate-500 mt-0.5">Growth, Loyalty, Solar & Property</p>
              </div>
              <div>
                <p className="font-mono tabular-nums text-2xl font-bold text-slate-900">14+</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">Plug-and-Play Add-ons</p>
                <p className="text-xs text-slate-500 mt-0.5">Activate only what you need</p>
              </div>
              <div>
                <p className="font-mono tabular-nums text-2xl font-bold text-slate-900">₹0</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">Setup or Lock-in Fee</p>
                <p className="text-xs text-slate-500 mt-0.5">Instant workspace provisioning</p>
              </div>
            </div>
          </div>
        </section>

        {/* STAGE 1: INTERACTIVE 5-STEP BUSINESS FUNNEL */}
        <section id="funnel" className="py-20 lg:py-24 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="max-w-2xl space-y-3 text-left">
              <p className="text-xs font-semibold text-primary">End-to-End Revenue Funnel</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
                Dekhein kaise har Biztrix module agle step ko automatically chalata hai
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Har stage par click karke dekhein kaunse modules kaam karte hain aur data bina manual entry ke kaise aage badhta hai.
              </p>
            </div>

            {/* Interactive Funnel Stage Selector */}
            <div
              role="tablist"
              aria-label="Business funnel stages"
              className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl w-full lg:w-fit"
            >
              {FUNNEL_STAGES.map((stage) => {
                const isActive = stage.id === activeStageId;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveStageId(stage.id)}
                    className={cn(
                      "px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 flex items-center gap-2 min-h-[40px]",
                      isActive
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <span className="font-mono tabular-nums text-primary">{stage.step}</span>
                    <span>{stage.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Funnel Stage Detail Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-6 sm:p-10">
              <div className="lg:col-span-7 space-y-6 text-left">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono tabular-nums font-semibold text-primary">
                      Stage {activeStage.step}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{activeStage.outcome}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight text-balance">
                    {activeStage.headline}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    {activeStage.description}
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-500">
                    Automated Flow in Stage {activeStage.step}
                  </p>
                  <ol className="space-y-2.5">
                    {activeStage.flowSteps.map((flow, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                        <span className="font-mono tabular-nums text-xs font-bold text-primary mt-0.5 shrink-0">
                          0{idx + 1}.
                        </span>
                        <span>{flow}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <Button
                    asChild
                    className="bg-primary hover:bg-primary/90 text-white rounded-lg px-5 h-11 text-sm font-semibold whitespace-nowrap shrink-0"
                  >
                    <Link href={isLoggedIn ? activeStage.modules[0].route : "/signup"}>
                      {isLoggedIn ? `Open ${activeStage.modules[0].name}` : "Activate This Stage Free"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <span className="text-xs text-slate-500">
                    {activeStage.metricLabel}:{" "}
                    <strong className="text-slate-800 font-semibold">{activeStage.metricValue}</strong>
                  </span>
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col justify-start gap-3">
                <p className="text-xs font-semibold text-slate-500 text-left">
                  Connected Modules in This Stage
                </p>
                <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                  {activeStage.modules.map((mod) => (
                    <Link
                      key={mod.name}
                      href={isLoggedIn ? mod.route : "/signup"}
                      className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="min-w-0 text-left">
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors">
                          {mod.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{mod.role}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-primary shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STAGE 2: COMPLETE MODULE & SUITE EXPLORER */}
        <section id="modules" className="py-20 lg:py-24 bg-slate-50/60 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-2xl space-y-3 text-left">
                <p className="text-xs font-semibold text-primary">Modular Marketplace Architecture</p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
                  Core OS se lekar Specialized Industry Suites tak sabhi modules
                </h2>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Apne business stage ke hisab se filter karein. Har module Core Billing aur Inventory ledger se real-time sync rehta hai.
                </p>
              </div>

              <div
                role="tablist"
                aria-label="Filter modules by category"
                className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-full lg:w-fit"
              >
                {[
                  { id: "all", label: "All Modules" },
                  { id: "core", label: "Core OS" },
                  { id: "growth", label: "Growth & Loyalty" },
                  { id: "operations", label: "AI & Operations" },
                  { id: "verticals", label: "Industry Suites" },
                ].map((tab) => {
                  const active = moduleFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setModuleFilter(tab.id as ModuleCategory)}
                      className={cn(
                        "px-3.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[36px]",
                        active
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredModules.map((item, idx) => (
                <article
                  key={item.id}
                  className={cn(
                    "flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 text-left transition-shadow hover:shadow-md",
                    moduleFilter === "all" && idx === 0 && "md:col-span-2 lg:col-span-2 bg-slate-900 text-white border-slate-900"
                  )}
                >
                  <div className="space-y-3">
                    <div
                      className={cn(
                        "flex items-center justify-between gap-2 text-xs",
                        moduleFilter === "all" && idx === 0 ? "text-slate-300" : "text-slate-500"
                      )}
                    >
                      <span>{item.kind}</span>
                      <span className="font-mono tabular-nums font-semibold">
                        {item.priceLabel}
                      </span>
                    </div>

                    <h3
                      className={cn(
                        "text-lg font-bold tracking-tight",
                        moduleFilter === "all" && idx === 0 ? "text-white text-xl" : "text-slate-900"
                      )}
                    >
                      {item.name}
                    </h3>

                    <p
                      className={cn(
                        "text-sm leading-relaxed",
                        moduleFilter === "all" && idx === 0 ? "text-slate-300 max-w-2xl" : "text-slate-600"
                      )}
                    >
                      {item.summary}
                    </p>
                  </div>

                  <div
                    className={cn(
                      "pt-5 mt-6 border-t flex items-center justify-between gap-4 text-xs",
                      moduleFilter === "all" && idx === 0
                        ? "border-slate-800 text-slate-300"
                        : "border-slate-100 text-slate-500"
                    )}
                  >
                    <span className="truncate">{item.highlights}</span>
                    <Link
                      href="/pricing"
                      className={cn(
                        "font-semibold whitespace-nowrap shrink-0 inline-flex items-center hover:underline",
                        moduleFilter === "all" && idx === 0 ? "text-sky-300" : "text-primary"
                      )}
                    >
                      Details <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* STAGE 3: NICHE INDUSTRY ARCHITECTURES (SOLAR & REAL ESTATE) */}
        <section id="industries" className="py-20 lg:py-24 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-2xl space-y-3 text-left">
              <p className="text-xs font-semibold text-primary">Vertical Business Architectures</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
                Solar EPC aur Real Estate ke liye dedicated end-to-end funnels
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Generic ERP tools field workflows samajh nahi paate. Biztrix me dono sectors ke liye custom engineering aur asset pipelines built-in hain.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Solar Business OS */}
              <article className="rounded-2xl border border-slate-200 overflow-hidden bg-white flex flex-col">
                <div className="relative aspect-[16/10] w-full bg-slate-100">
                  <Image
                    src={verticalSolarImg}
                    alt="Rooftop commercial solar panel installation managed with Solar Business OS"
                    fill
                    referrerPolicy="no-referrer"
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
                <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6 text-left">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Sun className="h-3.5 w-3.5 text-primary" />
                      <span>Solar Business OS</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">₹1,999/mo</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">
                      Inquiry se Handover & AMC Monitoring tak poora Solar Pipeline
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Site surveys, technical system design, BOM quotations, purchase requisitions, atomic inventory issue, warranty certificates aur customer service portal ek saath.
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs font-medium text-slate-700">
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Site Survey & System Design</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>BOM Quotes & Stock Issue</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>AMC & Warranty Registry</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Public Customer Solar Portal</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      href={isLoggedIn ? "/solar/operations" : "/signup"}
                      className="text-sm font-semibold text-primary hover:underline inline-flex items-center"
                    >
                      Launch Solar OS <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                    <span className="text-xs text-slate-500">9 specialized modules</span>
                  </div>
                </div>
              </article>

              {/* Property Pro Suite */}
              <article className="rounded-2xl border border-slate-200 overflow-hidden bg-white flex flex-col">
                <div className="relative aspect-[16/10] w-full bg-slate-100">
                  <Image
                    src={verticalPropertyImg}
                    alt="Modern residential and commercial property portfolio managed with Property Pro Suite"
                    fill
                    referrerPolicy="no-referrer"
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
                <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6 text-left">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      <span>Property Pro Suite</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">₹1,499/mo</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">
                      Technical Asset Catalog, Site Visits aur Agent Performance Matrix
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Plots, Khet aur Commercial buildings ke 20+ technical fields, map locations, site-visit scheduling, lead ownership aur agent commissions track karein.
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs font-medium text-slate-700">
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Facing, Soil & Road Fields</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Site-Visit Scheduling Log</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Agent Commission Matrix</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Public Property Catalog URL</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      href={isLoggedIn ? "/properties" : "/signup"}
                      className="text-sm font-semibold text-primary hover:underline inline-flex items-center"
                    >
                      Explore Property Pro <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                    <span className="text-xs text-slate-500">Map & Portal ready</span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* STAGE 4: INTERACTIVE TOOL CONSOLIDATION & SAVINGS ESTIMATOR */}
        <section id="estimator" className="py-20 lg:py-24 bg-slate-50/70 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-7 space-y-6 text-left">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-primary">Consolidation Estimator</p>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
                    Apna current software stack check karein aur monthly savings dekhein
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Apna business type chunein ya neeche tools select karein jo aap abhi alag-alag vendors se use kar rahe hain.
                  </p>
                </div>

                {/* Preset Track Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-lg w-fit">
                  {Object.entries(INDUSTRY_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handlePresetSelect(key)}
                      className={cn(
                        "px-3.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[36px]",
                        selectedPreset === key
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Tool Checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FRAGMENTED_TOOL_OPTIONS.map((tool) => {
                    const checked = selectedToolIds.includes(tool.id);
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => toggleTool(tool.id)}
                        aria-pressed={checked}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-xl border text-left transition-colors min-h-[72px]",
                          checked
                            ? "border-primary bg-white shadow-sm"
                            : "border-slate-200 bg-white/60 hover:bg-white"
                        )}
                      >
                        <span
                          className={cn(
                            "h-5 w-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                            checked
                              ? "bg-primary border-primary text-white"
                              : "border-slate-300 bg-white"
                          )}
                        >
                          {checked && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-900">
                            {tool.label}
                          </span>
                          <span className="block text-xs text-slate-500 mt-1">
                            {tool.biztrixModule} ·{" "}
                            <span className="font-mono tabular-nums">
                              {tool.biztrixPrice === 0 ? "Included" : `₹${tool.biztrixPrice}/mo`}
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Live Savings Output Card */}
              <div className="lg:col-span-5 rounded-2xl border border-slate-900 bg-slate-900 text-white p-6 sm:p-8 space-y-6 text-left shadow-sm">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-sky-300">Estimated Monthly Comparison</p>
                  <h3 className="text-xl font-bold tracking-tight">
                    Fragmented Tools vs Biztrix Modular Stack
                  </h3>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-800 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Typical separate SaaS tools</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-200">
                      ₹{estimate.separateMonthly.toLocaleString("en-IN")}/mo
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Selected Biztrix modules</span>
                    <span className="font-mono tabular-nums font-semibold text-white">
                      ₹{estimate.biztrixMonthly.toLocaleString("en-IN")}/mo
                    </span>
                  </div>
                </div>

                <div className="pt-5 border-t border-slate-800 space-y-1">
                  <p className="text-xs text-slate-400">Estimated Monthly Savings</p>
                  <p className="font-mono tabular-nums text-3xl sm:text-4xl font-extrabold text-sky-300">
                    ₹{estimate.monthlySavings.toLocaleString("en-IN")}
                    <span className="text-sm font-normal text-slate-400"> / month</span>
                  </p>
                  <p className="text-xs text-slate-300 font-mono tabular-nums">
                    Approx. ₹{estimate.annualSavings.toLocaleString("en-IN")} saved per year
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <Button
                    asChild
                    size="lg"
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold whitespace-nowrap shrink-0"
                  >
                    <Link href={isLoggedIn ? "/marketplace" : "/signup"}>
                      {isLoggedIn ? "Customize in Marketplace" : "Lock 14-Day Free Trial"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <p className="text-xs text-slate-400 text-center">
                    All Core OS tools included during trial · Cancel or adjust modules anytime
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STAGE 5: FINAL FUNNEL CONVERSION GATE */}
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <p className="text-xs font-semibold text-primary">Ready in Under 2 Minutes</p>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 text-balance">
              Apna unified business OS aaj hi launch karein
            </h2>
            <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Billing, inventory, online store, WhatsApp automation, loyalty cards aur AI advisor ek saath — bina kisi setup fee ke.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Button
                asChild
                size="lg"
                className="bg-primary hover:bg-primary/90 text-white rounded-lg h-12 px-8 text-sm font-semibold whitespace-nowrap shrink-0"
              >
                <Link href={isLoggedIn ? "/dashboard" : "/signup"}>
                  {isLoggedIn ? "Go to Dashboard" : "Create Free Workspace"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center h-12 px-5 text-sm font-semibold text-slate-700 hover:text-primary transition-colors whitespace-nowrap shrink-0"
              >
                View Full Pricing & FAQ
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* QUIET FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-50/70 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10">
            <div className="space-y-3 max-w-xs text-left">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
                <Layers className="h-4 w-4 text-primary" />
                <span>Biztrix AI</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Multi-tenant Business Operating System for Billing, Inventory, WhatsApp Growth, Loyalty, Solar EPC, and Property Management.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 text-left text-xs">
              <div className="space-y-2.5">
                <p className="font-semibold text-slate-900">Funnel</p>
                <ul className="space-y-2 text-slate-600">
                  <li>
                    <a href="#funnel" className="hover:text-slate-900">
                      5-Stage Flow
                    </a>
                  </li>
                  <li>
                    <a href="#modules" className="hover:text-slate-900">
                      All Modules
                    </a>
                  </li>
                  <li>
                    <a href="#estimator" className="hover:text-slate-900">
                      Savings Estimator
                    </a>
                  </li>
                </ul>
              </div>

              <div className="space-y-2.5">
                <p className="font-semibold text-slate-900">Platform</p>
                <ul className="space-y-2 text-slate-600">
                  <li>
                    <Link href="/pricing" className="hover:text-slate-900">
                      Pricing & Bundles
                    </Link>
                  </li>
                  <li>
                    <Link href="/shop" className="hover:text-slate-900">
                      Storefront Demo
                    </Link>
                  </li>
                  <li>
                    <Link href="/signup" className="hover:text-slate-900">
                      14-Day Free Trial
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="space-y-2.5">
                <p className="font-semibold text-slate-900">Access</p>
                <ul className="space-y-2 text-slate-600">
                  <li>
                    <Link href="/login" className="hover:text-slate-900">
                      Merchant Login
                    </Link>
                  </li>
                  <li>
                    <Link href="/forgot-password" className="hover:text-slate-900">
                      Reset Password
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Biztrix AI Solutions. All rights reserved.</p>
            <p>GST Billing · Multi-Tenant Security · Custom Domain Storefronts</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
