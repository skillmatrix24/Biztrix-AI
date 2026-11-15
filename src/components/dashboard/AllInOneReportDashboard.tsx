"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bot,
  Calendar,
  CheckCircle2,
  Download,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { MorningBriefOutput } from "@/ai/flows/morning-brief-flow";
import {
  buildExecutiveReportCsv,
  computeExecutiveReport,
  parseReportDate,
  resolveReportActionHref,
  type ReportDateRange,
  type ReportLedgerTab,
} from "@/lib/dashboard-report";
import { format, subDays } from "date-fns";

export interface AllInOneReportDashboardProps {
  businessName: string;
  userName: string;
  currencySymbol: string;
  businessStatus?: string;
  activeAddonIds: string[];
  cashbook: any[];
  orders: any[];
  products: any[];
  customers: any[];
  vendors: any[];
  leads: any[];
  quotations: any[];
  tasks: any[];
  complaints: any[];
  memberships: any[];
  solarInquiries?: any[];
  solarInstallations?: any[];
  properties?: any[];
  realEstateLeads?: any[];
  brief: MorningBriefOutput | null;
  isBriefLoading: boolean;
  isBriefDismissed: boolean;
  onRefreshBrief: () => void;
  onDismissBrief: (dismissed: boolean) => void;
}

const DATE_RANGE_OPTIONS: Array<{ id: ReportDateRange; label: string }> = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "month", label: "This Month" },
  { id: "all", label: "All Time" },
  { id: "custom", label: "Custom" },
];

export function AllInOneReportDashboard({
  businessName,
  userName,
  currencySymbol,
  businessStatus,
  activeAddonIds,
  cashbook,
  orders,
  products,
  customers,
  vendors,
  leads,
  quotations,
  tasks,
  complaints,
  memberships,
  solarInquiries = [],
  solarInstallations = [],
  properties = [],
  realEstateLeads = [],
  brief,
  isBriefLoading,
  isBriefDismissed,
  onRefreshBrief,
  onDismissBrief,
}: AllInOneReportDashboardProps) {
  const [dateRange, setDateRange] = useState<ReportDateRange>("month");
  const [customStartDate, setCustomStartDate] = useState<string>(() =>
    format(subDays(new Date(), 6), "yyyy-MM-dd")
  );
  const [customEndDate, setCustomEndDate] = useState<string>(() =>
    format(new Date(), "yyyy-MM-dd")
  );
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [activeLedgerTab, setActiveLedgerTab] = useState<ReportLedgerTab>("transactions");
  const [ledgerSearch, setLedgerSearch] = useState("");

  const customBounds = useMemo(
    () => ({ startDate: customStartDate, endDate: customEndDate }),
    [customStartDate, customEndDate]
  );

  const report = useMemo(
    () =>
      computeExecutiveReport(
        {
          cashbook,
          orders,
          products,
          customers,
          vendors,
          leads,
          quotations,
          tasks,
          complaints,
          memberships,
          solarInquiries,
          solarInstallations,
          properties,
          realEstateLeads,
          activeAddonIds,
          businessStatus,
        },
        dateRange,
        currencySymbol,
        new Date(),
        dateRange === "custom" ? customBounds : undefined
      ),
    [
      cashbook,
      orders,
      products,
      customers,
      vendors,
      leads,
      quotations,
      tasks,
      complaints,
      memberships,
      solarInquiries,
      solarInstallations,
      properties,
      realEstateLeads,
      activeAddonIds,
      businessStatus,
      dateRange,
      currencySymbol,
      customBounds,
    ]
  );

  const handleExportCsv = () => {
    const activeBounds = dateRange === "custom" ? customBounds : undefined;
    const csv = buildExecutiveReportCsv(report, businessName, currencySymbol, activeBounds);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const suffix =
      dateRange === "custom"
        ? `${customStartDate || "start"}_to_${customEndDate || "end"}`
        : dateRange;
    link.download = `${(businessName || "biztrix").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-report-${suffix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const queryText = ledgerSearch.trim().toLowerCase();

  const filteredTxRows = useMemo(() => {
    const base = report.filteredTransactions.slice(0, 40);
    if (!queryText) return base;
    return base.filter((t) =>
      `${t.particulars || ""} ${t.note || ""} ${t.category || ""}`.toLowerCase().includes(queryText)
    );
  }, [report.filteredTransactions, queryText]);

  const filteredInventoryRows = useMemo(() => {
    if (!queryText) return report.inventoryRows;
    return report.inventoryRows.filter((p) =>
      `${p.name || ""} ${p.sku || ""} ${p.category || ""}`.toLowerCase().includes(queryText)
    );
  }, [report.inventoryRows, queryText]);

  const filteredBalanceRows = useMemo(() => {
    if (!queryText) return report.balanceRows;
    return report.balanceRows.filter((b) =>
      `${b.name} ${b.phone} ${b.role}`.toLowerCase().includes(queryText)
    );
  }, [report.balanceRows, queryText]);

  const filteredCrmRows = useMemo(() => {
    if (!queryText) return report.crmRows;
    return report.crmRows.filter((r) =>
      `${r.title} ${r.kind} ${r.stage}`.toLowerCase().includes(queryText)
    );
  }, [report.crmRows, queryText]);

  const filteredOperationsRows = useMemo(() => {
    if (!queryText) return report.operationsRows;
    return report.operationsRows.filter((r) =>
      `${r.subject} ${r.owner} ${r.kind} ${r.status}`.toLowerCase().includes(queryText)
    );
  }, [report.operationsRows, queryText]);

  return (
    <div className="space-y-6 pb-20 md:pb-10 text-left font-body">
      {/* EXECUTIVE REPORT HEADER & CONTROLS */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between border-b border-slate-200 pb-5">
        <div className="space-y-1 text-left">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-primary">Executive Reports</span>
            <span aria-hidden="true">/</span>
            <span>All-in-One Ledger</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-slate-700">{businessName}</span>
            {userName && (
              <>
                <span aria-hidden="true">·</span>
                <span>{userName}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            All-in-One Business Report
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <div
            role="tablist"
            aria-label="Report period"
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200"
          >
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={dateRange === opt.id}
                onClick={() => setDateRange(opt.id)}
                className={cn(
                  "px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0",
                  dateRange === opt.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleExportCsv}
            className="h-9 px-3 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            className="h-9 px-3 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 hidden sm:inline-flex"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print
          </Button>

          {isBriefDismissed && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onDismissBrief(false)}
              className="h-9 px-3 rounded-lg border-slate-200 bg-white text-xs font-semibold text-primary whitespace-nowrap shrink-0"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              AI Summary
            </Button>
          )}

          <Button
            asChild
            className="h-9 px-3.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold whitespace-nowrap shrink-0"
          >
            <Link href="/billing">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Sale
            </Link>
          </Button>
        </div>
      </div>

      {dateRange === "custom" && (
        <div
          aria-label="Custom report date bounds"
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 print:hidden"
        >
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Custom Range
            </span>
            <label className="flex items-center gap-2 text-slate-600">
              <span>From</span>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                aria-label="Report start date"
                className="h-8 w-36 rounded-md border-slate-200 bg-slate-50 px-2.5 text-xs font-mono tabular-nums text-slate-900"
              />
            </label>
            <label className="flex items-center gap-2 text-slate-600">
              <span>To</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                aria-label="Report end date"
                className="h-8 w-36 rounded-md border-slate-200 bg-slate-50 px-2.5 text-xs font-mono tabular-nums text-slate-900"
              />
            </label>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 font-mono tabular-nums">
            <span>{report.filteredTransactions.length} transactions matched</span>
            <button
              type="button"
              onClick={() => {
                const todayStr = format(new Date(), "yyyy-MM-dd");
                setCustomStartDate(format(subDays(new Date(), 6), "yyyy-MM-dd"));
                setCustomEndDate(todayStr);
              }}
              className="font-sans font-semibold text-primary hover:underline"
            >
              Reset 7D
            </button>
          </div>
        </div>
      )}

      {/* COMPACT EXECUTIVE AI BRIEF BAR */}
      {!isBriefDismissed && (
        <section
          aria-label="Executive AI summary"
          className="rounded-xl border border-slate-900 bg-slate-900 text-white px-4 py-3.5 sm:px-5"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-sky-300">
                    {brief?.greeting || "AI Executive Summary"}
                  </span>
                  {brief?.statusNode && (
                    <>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span
                        className={cn(
                          "font-semibold",
                          brief.statusNode === "critical"
                            ? "text-red-400"
                            : brief.statusNode === "attention-needed"
                              ? "text-amber-300"
                              : "text-emerald-400"
                        )}
                      >
                        {brief.statusNode === "critical"
                          ? "Critical Attention"
                          : brief.statusNode === "attention-needed"
                            ? "Action Needed"
                            : "Operations Nominal"}
                      </span>
                    </>
                  )}
                </div>
                {isBriefLoading ? (
                  <div className="w-64 space-y-1.5 py-1">
                    <Progress value={60} className="h-1 bg-slate-800" />
                    <p className="text-xs text-slate-300">Compiling cross-module intelligence...</p>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {brief?.summary ||
                      "Generate a Gemini summary covering cashbook, low stock alerts, and high-intent leads."}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
              {brief?.priorityActions?.slice(0, 2).map((act, idx) => (
                <Link
                  key={idx}
                  href={resolveReportActionHref(act.type)}
                  className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-sky-300 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1"
                >
                  <span className="max-w-[160px] truncate">{act.label}</span>
                  <ArrowRight className="h-3 w-3 shrink-0" />
                </Link>
              ))}
              <button
                type="button"
                onClick={onRefreshBrief}
                disabled={isBriefLoading}
                aria-label="Refresh AI summary"
                className="h-8 w-8 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isBriefLoading && "animate-spin")} />
              </button>
              <button
                type="button"
                onClick={() => onDismissBrief(true)}
                aria-label="Dismiss AI summary"
                className="h-8 w-8 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 6-METRIC CONSOLIDATED FINANCIAL & INVENTORY STRIP */}
      <section aria-label="Key financial and inventory figures">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 rounded-xl border border-slate-200 bg-white divide-y md:divide-y-0 md:divide-x divide-slate-200 overflow-hidden">
          <div className="p-4 space-y-1">
            <p className="text-xs text-slate-500">Gross Sales</p>
            <p className="font-mono tabular-nums text-xl font-bold text-slate-900">
              {currencySymbol}
              {report.grossSales.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] font-mono tabular-nums text-slate-500">
              {report.salesTxnCount} sales · {report.ordersCount} orders
            </p>
          </div>

          <div className="p-4 space-y-1">
            <p className="text-xs text-slate-500">Total Outflow</p>
            <p className="font-mono tabular-nums text-xl font-bold text-slate-900">
              {currencySymbol}
              {report.totalOutflow.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] font-mono tabular-nums text-slate-500">
              Total inflow: {currencySymbol}
              {report.totalInflow.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="p-4 space-y-1">
            <p className="text-xs text-slate-500">Net Cashflow</p>
            <p
              className={cn(
                "font-mono tabular-nums text-xl font-bold",
                report.netCashflow >= 0 ? "text-emerald-700" : "text-red-700"
              )}
            >
              {report.netCashflow < 0 ? "-" : ""}
              {currencySymbol}
              {Math.abs(report.netCashflow).toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] font-mono tabular-nums text-slate-500">
              Net margin: {report.profitMarginPct}%
            </p>
          </div>

          <div className="p-4 space-y-1">
            <p className="text-xs text-slate-500">Receivables (Udhaar)</p>
            <p
              className={cn(
                "font-mono tabular-nums text-xl font-bold",
                report.totalUdhaar > 0 ? "text-red-700" : "text-slate-900"
              )}
            >
              {currencySymbol}
              {report.totalUdhaar.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] font-mono tabular-nums text-slate-500">
              {report.udhaarCustomerCount} pending accounts
            </p>
          </div>

          <div className="p-4 space-y-1">
            <p className="text-xs text-slate-500">Vendor Payables</p>
            <p className="font-mono tabular-nums text-xl font-bold text-slate-900">
              {currencySymbol}
              {report.totalPayable.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] font-mono tabular-nums text-slate-500">
              {report.payableVendorCount} unpaid suppliers
            </p>
          </div>

          <div className="p-4 space-y-1">
            <p className="text-xs text-slate-500">Stock Cost Value</p>
            <p className="font-mono tabular-nums text-xl font-bold text-slate-900">
              {currencySymbol}
              {Math.round(report.inventoryCostValue).toLocaleString("en-IN")}
            </p>
            <p
              className={cn(
                "text-[11px] font-mono tabular-nums",
                report.lowStockItems.length > 0 ? "text-amber-700 font-semibold" : "text-slate-500"
              )}
            >
              {report.lowStockItems.length} low · {report.activeSkuCount} SKUs
            </p>
          </div>
        </div>
      </section>

      {/* ANALYTICS CHARTS & CATEGORY BREAKDOWN (7 / 5 SPLIT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* CASHFLOW CHART */}
        <section className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Revenue vs Expense Cashflow
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily inflow and outflow distribution for selected period
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 print:hidden">
              <button
                type="button"
                onClick={() => setChartType("area")}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-semibold inline-flex items-center gap-1",
                  chartType === "area" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                )}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Trend
              </button>
              <button
                type="button"
                onClick={() => setChartType("bar")}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-semibold inline-flex items-center gap-1",
                  chartType === "bar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                )}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Bars
              </button>
            </div>
          </div>

          <div className="h-[250px] w-full">
            {report.cashflowChart.length === 0 ? (
              <div className="h-full rounded-lg border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-2.5">
                <p className="text-sm font-semibold text-slate-800">
                  No cashbook entries recorded in this range
                </p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Switch the period above or log a sale/expense in Daily Entries to populate this report.
                </p>
                <Button asChild size="sm" variant="outline" className="h-8 text-xs bg-white">
                  <Link href="/daily-entries">Log First Entry</Link>
                </Button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "area" ? (
                  <AreaChart data={report.cashflowChart}>
                    <defs>
                      <linearGradient id="rptIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="rptOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} tick={{ fill: "#64748b" }} />
                    <YAxis hide />
                    <RechartsTooltip
                      formatter={(val: any, name: string) => [
                        `${currencySymbol}${Number(val || 0).toLocaleString("en-IN")}`,
                        name === "inflow" ? "Inflow" : "Outflow",
                      ]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                        fontFamily: "var(--font-mono, monospace)",
                      }}
                    />
                    <Area type="monotone" dataKey="inflow" stroke="hsl(var(--primary))" fill="url(#rptIn)" strokeWidth={2.5} />
                    <Area type="monotone" dataKey="outflow" stroke="#dc2626" fill="url(#rptOut)" strokeWidth={2} />
                  </AreaChart>
                ) : (
                  <BarChart data={report.cashflowChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} tick={{ fill: "#64748b" }} />
                    <YAxis hide />
                    <RechartsTooltip
                      formatter={(val: any, name: string) => [
                        `${currencySymbol}${Number(val || 0).toLocaleString("en-IN")}`,
                        name === "inflow" ? "Inflow" : "Outflow",
                      ]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                        fontFamily: "var(--font-mono, monospace)",
                      }}
                    />
                    <Bar dataKey="inflow" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="outflow" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* CATEGORY BREAKDOWN TABLE */}
        <section className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Category Volume Breakdown</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cashbook inflow and outflow distribution by ledger head
            </p>
          </div>

          {report.categoryBreakdown.length === 0 ? (
            <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-xs text-slate-500">No category entries in selected period.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {report.categoryBreakdown.slice(0, 6).map((cat) => (
                <div key={cat.category} className="py-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-semibold text-slate-800 truncate">
                      {cat.category}{" "}
                      <span className="text-slate-400 font-normal">({cat.count})</span>
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900 shrink-0">
                      {currencySymbol}
                      {cat.totalVolume.toLocaleString("en-IN")} · {cat.sharePct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        cat.inflow >= cat.outflow ? "bg-primary" : "bg-red-600"
                      )}
                      style={{ width: `${Math.min(100, Math.max(4, cat.sharePct))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Accounting Ledger</span>
            <Link href="/accounting" className="font-semibold text-primary hover:underline">
              Open P&amp;L Statement →
            </Link>
          </div>
        </section>
      </div>

      {/* ALL-DEPARTMENTS EXECUTIVE SUMMARY MATRIX */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              All-Departments Consolidated Summary
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Single-screen report across Sales, Cashbook, Inventory, CRM, Customers, Vendors &amp; Support
            </p>
          </div>
          <span className="font-mono tabular-nums text-xs text-slate-500 shrink-0">
            {report.departmentRows.length} departments
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-5">Department</th>
                <th className="py-2.5 px-4">Primary Metric</th>
                <th className="py-2.5 px-4 text-right">Value</th>
                <th className="py-2.5 px-4">Operational Split</th>
                <th className="py-2.5 px-4">Health Status</th>
                <th className="py-2.5 px-5 text-right print:hidden">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.departmentRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-5 font-semibold text-slate-900 whitespace-nowrap">
                    {row.department}
                  </td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {row.primaryLabel}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                    {row.primaryValue}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap text-xs">
                    {row.secondaryLabel}: <span className="text-slate-800">{row.secondaryValue}</span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-semibold",
                        row.statusTone === "critical"
                          ? "text-red-700"
                          : row.statusTone === "warning"
                            ? "text-amber-700"
                            : "text-emerald-700"
                      )}
                    >
                      {row.statusTone === "nominal" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      )}
                      {row.statusText}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right whitespace-nowrap print:hidden">
                    <Link
                      href={row.href}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* MULTI-MODULE DETAILED LEDGER DRILL-DOWN */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div
            role="tablist"
            aria-label="Detailed ledger report views"
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit print:hidden"
          >
            {(
              [
                { id: "transactions", label: `Transactions (${report.filteredTransactions.length})` },
                { id: "inventory", label: `Inventory (${report.inventoryRows.length})` },
                { id: "balances", label: `Udhaar & Vendors (${report.balanceRows.length})` },
                { id: "crm", label: `Leads & Quotes (${report.crmRows.length})` },
                { id: "operations", label: `Tasks & Tickets (${report.operationsRows.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeLedgerTab === tab.id}
                onClick={() => setActiveLedgerTab(tab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 font-mono tabular-nums",
                  activeLedgerTab === tab.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-64 print:hidden">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
              placeholder="Filter current table..."
              aria-label="Filter report table"
              className="h-9 pl-8 text-xs rounded-lg border-slate-200 bg-slate-50/70"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeLedgerTab === "transactions" && (
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-5">Date</th>
                  <th className="py-2.5 px-4">Particulars</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTxRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-5 text-center text-xs text-slate-500">
                      No transactions match your filter in this period.{" "}
                      <Link href="/daily-entries" className="font-semibold text-primary hover:underline">
                        Open Daily Cashbook →
                      </Link>
                    </td>
                  </tr>
                ) : (
                  filteredTxRows.map((tx, idx) => {
                    const d = parseReportDate(tx.date || tx.createdAt);
                    const isCredit = tx.type === "credit";
                    return (
                      <tr key={tx.id || idx} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-5 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                          {d ? format(d, "dd MMM yyyy") : "-"}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900 max-w-xs truncate">
                          {tx.particulars || tx.note || "Cashbook Entry"}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                          {tx.category || "General"}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap text-xs font-semibold">
                          <span className={isCredit ? "text-emerald-700" : "text-red-700"}>
                            {isCredit ? "Credit (+)" : "Debit (-)"}
                          </span>
                        </td>
                        <td
                          className={cn(
                            "py-2.5 px-5 text-right font-mono tabular-nums font-bold whitespace-nowrap",
                            isCredit ? "text-emerald-700" : "text-red-700"
                          )}
                        >
                          {isCredit ? "+" : "-"}
                          {currencySymbol}
                          {Number(tx.amount || 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeLedgerTab === "inventory" && (
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-5">SKU</th>
                  <th className="py-2.5 px-4">Product Name</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-right">Stock / Min</th>
                  <th className="py-2.5 px-5 text-right">Cost Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventoryRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-5 text-center text-xs text-slate-500">
                      No inventory items found.{" "}
                      <Link href="/inventory" className="font-semibold text-primary hover:underline">
                        Open Inventory →
                      </Link>
                    </td>
                  </tr>
                ) : (
                  filteredInventoryRows.map((p) => {
                    const stock = Number(p.stock || 0);
                    const min = Number(p.minThreshold || 0);
                    const isLow = stock <= min;
                    const value = stock * Number(p.cost || p.price || 0);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-5 font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap">
                          {p.sku || "-"}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{p.name}</td>
                        <td className="py-2.5 px-4 text-slate-600">{p.category || "General"}</td>
                        <td
                          className={cn(
                            "py-2.5 px-4 text-right font-mono tabular-nums font-semibold whitespace-nowrap",
                            stock <= 0 ? "text-red-700" : isLow ? "text-amber-700" : "text-slate-900"
                          )}
                        >
                          {stock} / {min} {p.unit || "pcs"}
                        </td>
                        <td className="py-2.5 px-5 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                          {currencySymbol}
                          {Math.round(value).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeLedgerTab === "balances" && (
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-5">Account Name</th>
                  <th className="py-2.5 px-4">Phone</th>
                  <th className="py-2.5 px-4">Ledger Type</th>
                  <th className="py-2.5 px-4 text-right">Pending Balance</th>
                  <th className="py-2.5 px-5 text-right print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBalanceRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-5 text-center text-xs text-slate-500">
                      Zero pending customer udhaar or vendor payables.
                    </td>
                  </tr>
                ) : (
                  filteredBalanceRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-5 font-medium text-slate-900">{row.name}</td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-xs text-slate-600">
                        {row.phone}
                      </td>
                      <td
                        className={cn(
                          "py-2.5 px-4 text-xs font-semibold whitespace-nowrap",
                          row.role === "Customer Udhaar" ? "text-red-700" : "text-amber-700"
                        )}
                      >
                        {row.role}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                        {currencySymbol}
                        {row.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 px-5 text-right print:hidden">
                        <Link href={row.href} className="text-xs font-semibold text-primary hover:underline">
                          Settle →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeLedgerTab === "crm" && (
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-5">Lead / Customer</th>
                  <th className="py-2.5 px-4">Record Type</th>
                  <th className="py-2.5 px-4">Stage</th>
                  <th className="py-2.5 px-4 text-right">Intent / Value</th>
                  <th className="py-2.5 px-5 text-right print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCrmRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-5 text-center text-xs text-slate-500">
                      No leads or quotations found.{" "}
                      <Link href="/leads" className="font-semibold text-primary hover:underline">
                        Open CRM →
                      </Link>
                    </td>
                  </tr>
                ) : (
                  filteredCrmRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-5 font-medium text-slate-900">{row.title}</td>
                      <td className="py-2.5 px-4 text-slate-600">{row.kind}</td>
                      <td className="py-2.5 px-4 capitalize text-slate-700">{row.stage}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {row.metric}
                      </td>
                      <td className="py-2.5 px-5 text-right print:hidden">
                        <Link href={row.href} className="text-xs font-semibold text-primary hover:underline">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeLedgerTab === "operations" && (
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-5">Subject / Task</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Assignee / Customer</th>
                  <th className="py-2.5 px-4">Priority</th>
                  <th className="py-2.5 px-5 text-right print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOperationsRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-5 text-center text-xs text-slate-500">
                      All tasks and support tickets are cleared.
                    </td>
                  </tr>
                ) : (
                  filteredOperationsRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-5 font-medium text-slate-900">{row.subject}</td>
                      <td className="py-2.5 px-4 text-slate-600">{row.kind}</td>
                      <td className="py-2.5 px-4 text-slate-700">{row.owner}</td>
                      <td className="py-2.5 px-4 capitalize font-semibold text-slate-700">
                        {row.priority}
                      </td>
                      <td className="py-2.5 px-5 text-right print:hidden">
                        <Link href={row.href} className="text-xs font-semibold text-primary hover:underline">
                          Open →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
