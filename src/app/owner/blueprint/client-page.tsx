"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Database,
  Download,
  GitBranch,
  Layers,
  LayoutTemplate,
  Lock,
  Search,
  Server,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/firebase";
import { cn } from "@/lib/utils";
import {
  SIDEBAR_ARCHITECTURE_RULES,
  SIDEBAR_BLUEPRINT_GROUPS,
  filterBlueprintGroups,
  getBlueprintSummaryStats,
  type BlueprintMenuItem,
} from "@/lib/platform-blueprint";

export default function PlatformBlueprintPage() {
  const { user } = useUser();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    const commandCenter = SIDEBAR_BLUEPRINT_GROUPS.find((g) => g.id === "command_center");
    commandCenter?.items.forEach((item) => {
      initial[item.id] = true;
    });
    return initial;
  });

  const isPlatformOwner = user?.email?.toLowerCase() === "skillmatrix24@gmail.com";

  const stats = useMemo(() => getBlueprintSummaryStats(SIDEBAR_BLUEPRINT_GROUPS), []);

  const filteredGroups = useMemo(
    () => filterBlueprintGroups(SIDEBAR_BLUEPRINT_GROUPS, selectedGroupId, searchTerm),
    [selectedGroupId, searchTerm]
  );

  const visibleItemIds = useMemo(
    () => filteredGroups.flatMap((g) => g.items.map((item) => item.id)),
    [filteredGroups]
  );

  const isFiltering = selectedGroupId !== "all" || searchTerm.trim().length > 0;

  const isItemExpanded = (item: BlueprintMenuItem) => {
    if (expandedIds[item.id] !== undefined) return expandedIds[item.id];
    return isFiltering;
  };

  const toggleItem = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !(prev[id] ?? isFiltering) }));
  };

  const setAllVisibleExpanded = (expanded: boolean) => {
    const next: Record<string, boolean> = { ...expandedIds };
    visibleItemIds.forEach((id) => {
      next[id] = expanded;
    });
    setExpandedIds(next);
  };

  const [showRulesMatrix, setShowRulesMatrix] = useState(true);

  const handleExportBlueprintJson = () => {
    if (typeof window === "undefined") return;
    const payload = {
      exportedAt: new Date().toISOString(),
      summaryStats: stats,
      sidebarArchitectureRules: SIDEBAR_ARCHITECTURE_RULES,
      groups: SIDEBAR_BLUEPRINT_GROUPS,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "biztrix-sidebar-platform-blueprint.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!isPlatformOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <ShieldCheck className="h-12 w-12 mb-4 text-slate-400" />
        <p className="text-sm font-semibold text-slate-900">
          Authorized Platform Master Access Only
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Sign in with the platform owner account to inspect the full Sidebar Architecture Blueprint.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 pb-20 space-y-6 text-left">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Platform Blueprint — Sidebar Architecture
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Har Sidebar group aur menu page ka content-wise workflow, cross-module connections,
              Frontend stack, aur Backend Firestore/API mapping.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAllVisibleExpanded(true)}
            className="h-9 px-3 rounded-lg border-slate-200 text-xs font-semibold text-slate-700"
          >
            Expand Visible ({visibleItemIds.length})
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAllVisibleExpanded(false)}
            className="h-9 px-3 rounded-lg border-slate-200 text-xs font-semibold text-slate-700"
          >
            Collapse Visible
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleExportBlueprintJson}
            className="h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Sidebar Groups</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {stats.totalGroups}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Mapped Pages</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {stats.totalPages}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Firestore Nodes</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {stats.uniqueCollections}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">REST API Routes</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {stats.uniqueApiRoutes}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 col-span-2 sm:col-span-1">
          <p className="text-xs font-medium text-slate-500">Server Actions</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {stats.uniqueServerActions}
          </p>
        </div>
      </div>

      {/* SIDEBAR GATING & ROLE NAVIGATION RULES */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 bg-slate-50/70 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Lock className="h-4 w-4 text-primary shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Sidebar Gating &amp; Role Navigation Rules ({SIDEBAR_ARCHITECTURE_RULES.length})
              </h2>
              <p className="text-xs text-slate-500">
                Desktop SidebarNav aur Mobile BottomNav kaise groups/items ko dynamically lock ya isolate karte hain
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={showRulesMatrix}
            onClick={() => setShowRulesMatrix((prev) => !prev)}
            className="h-8 px-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 self-start sm:self-auto"
          >
            {showRulesMatrix ? "Hide Rules" : "Show Rules"}
            {showRulesMatrix ? (
              <ChevronUp className="ml-1 h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="ml-1 h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {showRulesMatrix && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {SIDEBAR_ARCHITECTURE_RULES.map((rule) => (
              <div
                key={rule.id}
                className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    {rule.id === "mobile_bottom_nav" ? (
                      <Smartphone className="h-3.5 w-3.5 text-primary shrink-0" />
                    ) : (
                      <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                    {rule.title}
                  </h3>
                </div>
                <p className="text-[11px] font-mono text-primary break-words">{rule.trigger}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{rule.behavior}</p>
                <p className="text-[11px] font-mono text-slate-400">{rule.sourceFile}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SEARCH + SIDEBAR GROUP FILTER */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            aria-label="Search sidebar blueprint"
            placeholder="Search page, /route, Firestore collection (e.g. invoices, cashbook), API (/api/eway-bill/generate), ya connected module..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 pl-10 rounded-xl bg-white border-slate-200 text-xs sm:text-sm"
          />
        </div>

        <div
          role="tablist"
          aria-label="Filter by Sidebar Group"
          className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedGroupId === "all"}
            onClick={() => setSelectedGroupId("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              selectedGroupId === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            All Sidebar Groups ({stats.totalPages})
          </button>

          {SIDEBAR_BLUEPRINT_GROUPS.map((group) => (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={selectedGroupId === group.id}
              onClick={() => setSelectedGroupId(group.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                selectedGroupId === group.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {group.groupLabel}{" "}
              <span className="font-mono tabular-nums text-slate-400">({group.items.length})</span>
            </button>
          ))}
        </div>
      </div>

      {/* BLUEPRINT GROUPS */}
      {filteredGroups.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm font-semibold text-slate-900">
            Koi matching sidebar module ya route nahi mila
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Search query clear karein ya dusra Sidebar group select karein.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredGroups.map((group, groupIndex) => (
            <section key={group.id} className="space-y-3">
              {/* Group Header */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-1">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    <span className="font-mono tabular-nums mr-1.5">
                      {String(groupIndex + 1).padStart(2, "0")}.
                    </span>
                    {group.accessScope} · {group.items.length} menu{" "}
                    {group.items.length === 1 ? "item" : "items"}
                  </p>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5">{group.groupLabel}</h2>
                  <p className="text-xs text-slate-600 mt-0.5">{group.summary}</p>
                </div>
                <span className="text-xs font-mono text-slate-500 shrink-0">
                  Gate: {group.entitlementKey}
                </span>
              </div>

              {/* Group Menu Items */}
              <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-200 overflow-hidden">
                {group.items.map((item) => {
                  const open = isItemExpanded(item);
                  return (
                    <div key={item.id} className="p-4 sm:p-5">
                      {/* Row Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <h3 className="text-sm font-bold text-slate-900">{item.label}</h3>
                            <span className="text-xs font-mono text-primary font-semibold">
                              {item.href}
                            </span>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="text-xs text-slate-500">{item.entitlement}</span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{item.howItWorks}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            href={item.href}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                          >
                            Open
                            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                          </Link>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-expanded={open}
                            onClick={() => toggleItem(item.id)}
                            className="h-8 px-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                          >
                            {open ? "Hide Details" : "Full Stack"}
                            {open ? (
                              <ChevronUp className="ml-1 h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="ml-1 h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded 4-Quadrant Content-Wise Spec */}
                      {open && (
                        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* 1. Page Content & Sections */}
                          <div className="rounded-xl bg-slate-50/80 p-3.5 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                              <LayoutTemplate className="h-3.5 w-3.5 text-primary" />
                              Page Content &amp; UI Sections
                            </div>
                            <ul className="space-y-1 text-xs text-slate-600 list-disc pl-4">
                              {item.pageSections.map((sec, idx) => (
                                <li key={idx}>{sec}</li>
                              ))}
                            </ul>
                          </div>

                          {/* 2. Connected Modules */}
                          <div className="rounded-xl bg-slate-50/70 border border-slate-200/80 p-3.5 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                              <GitBranch className="h-3.5 w-3.5 text-primary" />
                              Kisse Connected Hai (Cross-Module Links)
                            </div>
                            <ul className="space-y-1.5 text-xs text-slate-600">
                              {item.connectedPages.map((conn, idx) => (
                                <li key={idx} className="leading-relaxed">
                                  <Link
                                    href={conn.href}
                                    className="font-semibold text-primary hover:underline mr-1.5"
                                  >
                                    {conn.label} ({conn.href})
                                  </Link>
                                  <span className="text-slate-500">— {conn.relation}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* 3. Frontend Architecture */}
                          <div className="rounded-xl bg-slate-50/70 border border-slate-200/80 p-3.5 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                              <Server className="h-3.5 w-3.5 text-primary" />
                              Frontend Architecture
                            </div>
                            <p className="text-[11px] font-mono text-slate-500">
                              Entry: {item.pageFile}
                            </p>
                            <ul className="space-y-1 text-xs font-mono text-slate-700 list-disc pl-4">
                              {item.frontendStack.map((fe, idx) => (
                                <li key={idx}>{fe}</li>
                              ))}
                            </ul>
                          </div>

                          {/* 4. Backend & Database */}
                          <div className="rounded-xl bg-slate-50/70 border border-slate-200/80 p-3.5 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                              <Database className="h-3.5 w-3.5 text-primary" />
                              Backend, Firestore &amp; APIs
                            </div>
                            <div className="space-y-1.5 text-xs">
                              <div>
                                <span className="font-semibold text-slate-800">Firestore: </span>
                                <span className="font-mono text-slate-600">
                                  {item.backendStack.firestoreCollections.length > 0
                                    ? item.backendStack.firestoreCollections.join(", ")
                                    : "Static / Auth Session"}
                                </span>
                              </div>
                              {item.backendStack.apiRoutes.length > 0 && (
                                <div>
                                  <span className="font-semibold text-slate-800">API Routes: </span>
                                  <span className="font-mono text-slate-600">
                                    {item.backendStack.apiRoutes.join(", ")}
                                  </span>
                                </div>
                              )}
                              {item.backendStack.serverActions.length > 0 && (
                                <div>
                                  <span className="font-semibold text-slate-800">
                                    Server Actions:{" "}
                                  </span>
                                  <span className="font-mono text-slate-600">
                                    {item.backendStack.serverActions.join(", ")}
                                  </span>
                                </div>
                              )}
                              {item.backendStack.aiAndExternal.length > 0 && (
                                <div>
                                  <span className="font-semibold text-slate-800">
                                    AI / External:{" "}
                                  </span>
                                  <span className="font-mono text-slate-600">
                                    {item.backendStack.aiAndExternal.join(", ")}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
