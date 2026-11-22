"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Filter,
  Layers,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Users,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { MorningBriefOutput } from "@/ai/flows/morning-brief-flow";
import {
  buildExecutiveReportCsv,
  computeExecutiveReport,
  parseReportDate,
  resolveReportActionHref,
  type ReportDateRange,
  type ReportExportMode,
  type ReportLedgerTab,
  type ReportModuleKey,
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
  dailyPulse?: {
    totalStaff: number;
    presentToday: number;
    halfDayToday: number;
    accruedWageToday: number;
    cashPaidToday: number;
  } | null;
  onUnpinDailyPulse?: () => void;
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
  dailyPulse = null,
  onUnpinDailyPulse,
}: AllInOneReportDashboardProps) {
  const [dateRange, setDateRange] = useState<ReportDateRange>("month");
  const [selectedModule, setSelectedModule] = useState<ReportModuleKey>("all");
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
          selectedModuleFilter: selectedModule,
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
      selectedModule,
      dateRange,
      currencySymbol,
      customBounds,
    ]
  );

  // Available visible ledger tabs based on active modules and selectedModule filter
  const visibleLedgerTabs = useMemo(() => {
    const tabs: Array<{ id: ReportLedgerTab; label: string; count: number }> = [];

    const canShowTx =
      selectedModule === "all" ||
      selectedModule === "cashbook" ||
      selectedModule === "billing";
    if (canShowTx && report.activeModules.hasCashbook) {
      tabs.push({
        id: "transactions",
        label: `Transactions (${report.filteredTransactions.length})`,
        count: report.filteredTransactions.length,
      });
    }

    const canShowInv =
      selectedModule === "all" || selectedModule === "inventory";
    if (canShowInv && report.activeModules.hasInventory) {
      tabs.push({
        id: "inventory",
        label: `Inventory (${report.inventoryRows.length})`,
        count: report.inventoryRows.length,
      });
    }

    const canShowBal =
      selectedModule === "all" || selectedModule === "balances";
    if (canShowBal && report.activeModules.hasBalances) {
      tabs.push({
        id: "balances",
        label: `Udhaar & Payables (${report.balanceRows.length})`,
        count: report.balanceRows.length,
      });
    }

    const canShowCrm =
      selectedModule === "all" || selectedModule === "crm";
    if (canShowCrm && report.activeModules.hasCrm) {
      tabs.push({
        id: "crm",
        label: `Leads & Quotes (${report.crmRows.length})`,
        count: report.crmRows.length,
      });
    }

    const canShowOps =
      selectedModule === "all" || selectedModule === "operations";
    if (canShowOps && report.activeModules.hasOperations) {
      tabs.push({
        id: "operations",
        label: `Tasks & Tickets (${report.operationsRows.length})`,
        count: report.operationsRows.length,
      });
    }

    const canShowSolar =
      (selectedModule === "all" || selectedModule === "solar") &&
      report.activeModules.hasSolar;
    if (canShowSolar) {
      tabs.push({
        id: "solar",
        label: `Solar Sites (${report.solarRows.length})`,
        count: report.solarRows.length,
      });
    }

    const canShowProp =
      (selectedModule === "all" || selectedModule === "property") &&
      report.activeModules.hasProperty;
    if (canShowProp) {
      tabs.push({
        id: "property",
        label: `Property Portfolio (${report.propertyRows.length})`,
        count: report.propertyRows.length,
      });
    }

    return tabs;
  }, [
    selectedModule,
    report.activeModules,
    report.filteredTransactions.length,
    report.inventoryRows.length,
    report.balanceRows.length,
    report.crmRows.length,
    report.operationsRows.length,
    report.solarRows.length,
    report.propertyRows.length,
  ]);

  // Ensure activeLedgerTab safely auto-resets if current tab is hidden by module filter
  useEffect(() => {
    if (visibleLedgerTabs.length > 0) {
      const isCurrentTabVisible = visibleLedgerTabs.some(
        (t) => t.id === activeLedgerTab
      );
      if (!isCurrentTabVisible) {
        setActiveLedgerTab(visibleLedgerTabs[0].id);
      }
    }
  }, [visibleLedgerTabs, activeLedgerTab]);

  const currentTabName = useMemo(() => {
    switch (activeLedgerTab) {
      case "transactions":
        return "Transactions";
      case "inventory":
        return "Inventory Valuation";
      case "balances":
        return "Udhaar & Payables";
      case "crm":
        return "CRM & Quotes";
      case "operations":
        return "Tasks & Tickets";
      case "solar":
        return "Solar Sites & Leads";
      case "property":
        return "Property Portfolio";
      default:
        return "Current Table";
    }
  }, [activeLedgerTab]);

  const handleExportCsv = (mode: ReportExportMode = "consolidated") => {
    const activeBounds = dateRange === "custom" ? customBounds : undefined;
    const csv = buildExecutiveReportCsv(
      report,
      businessName,
      currencySymbol,
      activeBounds,
      mode,
      activeLedgerTab
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    const baseName = (businessName || "biztrix").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const suffix =
      dateRange === "custom"
        ? `${customStartDate || "start"}_to_${customEndDate || "end"}`
        : dateRange;

    let filename = "";
    if (mode === "current_tab") {
      filename = `${baseName}-${activeLedgerTab}-${suffix}.csv`;
    } else if (mode === "summary") {
      filename = `${baseName}-executive-summary-${suffix}.csv`;
    } else {
      const modSuffix = selectedModule !== "all" ? `_${selectedModule}` : "";
      filename = `${baseName}-consolidated-report${modSuffix}-${suffix}.csv`;
    }

    link.download = filename;
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

  const filteredSolarRows = useMemo(() => {
    if (!queryText) return report.solarRows;
    return report.solarRows.filter((s) =>
      `${s.title} ${s.type} ${s.status} ${s.details}`.toLowerCase().includes(queryText)
    );
  }, [report.solarRows, queryText]);

  const filteredPropertyRows = useMemo(() => {
    if (!queryText) return report.propertyRows;
    return report.propertyRows.filter((p) =>
      `${p.title} ${p.type} ${p.status} ${p.details}`.toLowerCase().includes(queryText)
    );
  }, [report.propertyRows, queryText]);

  // Compute active KPI Cards dynamically based on active modules & selectedModule filter
  const visibleKpiCards = useMemo(() => {
    const cards: Array<{
      id: string;
      title: string;
      primary: string;
      primaryClass?: string;
      secondary: string;
      secondaryClass?: string;
    }> = [];

    if (selectedModule === "all") {
      if (report.activeModules.hasBilling) {
        cards.push({
          id: "sales",
          title: "Gross Sales",
          primary: `${currencySymbol}${report.grossSales.toLocaleString("en-IN")}`,
          secondary: `${report.salesTxnCount} sales · ${report.ordersCount} orders`,
        });
      }
      if (report.activeModules.hasCashbook) {
        cards.push({
          id: "outflow",
          title: "Total Outflow",
          primary: `${currencySymbol}${report.totalOutflow.toLocaleString("en-IN")}`,
          secondary: `Inflow: ${currencySymbol}${report.totalInflow.toLocaleString("en-IN")}`,
        });
        cards.push({
          id: "net_cashflow",
          title: "Net Cashflow",
          primary: `${report.netCashflow < 0 ? "-" : ""}${currencySymbol}${Math.abs(report.netCashflow).toLocaleString("en-IN")}`,
          primaryClass: report.netCashflow >= 0 ? "text-emerald-700" : "text-red-700",
          secondary: `Net margin: ${report.profitMarginPct}%`,
        });
      }
      if (report.activeModules.hasBalances) {
        cards.push({
          id: "udhaar",
          title: "Receivables (Udhaar)",
          primary: `${currencySymbol}${report.totalUdhaar.toLocaleString("en-IN")}`,
          primaryClass: report.totalUdhaar > 0 ? "text-red-700" : "text-slate-900",
          secondary: `${report.udhaarCustomerCount} pending accounts`,
        });
        cards.push({
          id: "payables",
          title: "Vendor Payables",
          primary: `${currencySymbol}${report.totalPayable.toLocaleString("en-IN")}`,
          secondary: `${report.payableVendorCount} unpaid suppliers`,
        });
      }
      if (report.activeModules.hasInventory) {
        cards.push({
          id: "inventory",
          title: "Stock Cost Value",
          primary: `${currencySymbol}${Math.round(report.inventoryCostValue).toLocaleString("en-IN")}`,
          secondary: `${report.lowStockItems.length} low · ${report.activeSkuCount} SKUs`,
          secondaryClass: report.lowStockItems.length > 0 ? "text-amber-700 font-semibold" : undefined,
        });
      }
      if (report.activeModules.hasSolar) {
        cards.push({
          id: "solar_pipeline",
          title: "Solar Pipeline & Sites",
          primary: `${report.solarInstallationsCount} Sites`,
          secondary: `${report.solarInquiriesCount} Leads · ${currencySymbol}${report.solarQuotesValue.toLocaleString("en-IN")}`,
        });
      }
      if (report.activeModules.hasProperty) {
        cards.push({
          id: "property_portfolio",
          title: "Property Portfolio",
          primary: `${report.propertiesCount} Units`,
          secondary: `${report.realEstateLeadsCount} Buyers active`,
        });
      }
      return cards;
    }

    if (selectedModule === "billing") {
      cards.push({
        id: "billing_sales",
        title: "Gross Sales Revenue",
        primary: `${currencySymbol}${report.grossSales.toLocaleString("en-IN")}`,
        secondary: `Total across ${report.salesTxnCount} sales`,
      });
      cards.push({
        id: "billing_orders",
        title: "Store Orders Count",
        primary: `${report.ordersCount} Orders`,
        secondary: `Fulfilled in selected period`,
      });
      cards.push({
        id: "billing_aov",
        title: "Average Order Value",
        primary: `${currencySymbol}${report.avgOrderValue.toLocaleString("en-IN")}`,
        secondary: `Based on store order grand totals`,
      });
      cards.push({
        id: "billing_inflow",
        title: "Cashbook Recorded Sales",
        primary: `${currencySymbol}${report.totalInflow.toLocaleString("en-IN")}`,
        secondary: `${report.salesTxnCount} POS & invoice entries`,
      });
      return cards;
    }

    if (selectedModule === "cashbook") {
      cards.push({
        id: "cb_inflow",
        title: "Total Inflow (Receipts)",
        primary: `${currencySymbol}${report.totalInflow.toLocaleString("en-IN")}`,
        primaryClass: "text-emerald-700",
        secondary: `From customer & sales collections`,
      });
      cards.push({
        id: "cb_outflow",
        title: "Total Outflow (Expenses)",
        primary: `${currencySymbol}${report.totalOutflow.toLocaleString("en-IN")}`,
        primaryClass: "text-red-700",
        secondary: `Salaries, vendors & bills paid`,
      });
      cards.push({
        id: "cb_net",
        title: "Net Surplus / Deficit",
        primary: `${report.netCashflow < 0 ? "-" : ""}${currencySymbol}${Math.abs(report.netCashflow).toLocaleString("en-IN")}`,
        primaryClass: report.netCashflow >= 0 ? "text-emerald-700" : "text-red-700",
        secondary: `Net cashflow for period`,
      });
      cards.push({
        id: "cb_margin",
        title: "Operating Cash Margin",
        primary: `${report.profitMarginPct}%`,
        secondary: `${report.filteredTransactions.length} total entries analyzed`,
      });
      return cards;
    }

    if (selectedModule === "inventory") {
      cards.push({
        id: "inv_cost",
        title: "Stock Cost Valuation",
        primary: `${currencySymbol}${Math.round(report.inventoryCostValue).toLocaleString("en-IN")}`,
        secondary: `Based on purchase cost / base price`,
      });
      cards.push({
        id: "inv_retail",
        title: "Stock Retail Valuation",
        primary: `${currencySymbol}${Math.round(report.inventoryRetailValue).toLocaleString("en-IN")}`,
        secondary: `Potential retail revenue at MRP`,
      });
      cards.push({
        id: "inv_skus",
        title: "Active Products (SKUs)",
        primary: `${report.activeSkuCount} SKUs`,
        secondary: `${report.outOfStockCount} currently zero stock`,
        secondaryClass: report.outOfStockCount > 0 ? "text-red-700 font-semibold" : undefined,
      });
      cards.push({
        id: "inv_low",
        title: "Low Stock Reorder Due",
        primary: `${report.lowStockItems.length} Products`,
        primaryClass: report.lowStockItems.length > 0 ? "text-amber-700" : "text-emerald-700",
        secondary: `Below minimum threshold limit`,
      });
      return cards;
    }

    if (selectedModule === "balances") {
      cards.push({
        id: "bal_udhaar",
        title: "Customer Udhaar Dues",
        primary: `${currencySymbol}${report.totalUdhaar.toLocaleString("en-IN")}`,
        primaryClass: report.totalUdhaar > 0 ? "text-red-700" : "text-slate-900",
        secondary: `Pending recovery across ledger`,
      });
      cards.push({
        id: "bal_cust_count",
        title: "Pending Customer Accounts",
        primary: `${report.udhaarCustomerCount} Accounts`,
        secondary: `Out of ${report.totalCustomersCount} registered customers`,
      });
      cards.push({
        id: "bal_payable",
        title: "Vendor Payables Due",
        primary: `${currencySymbol}${report.totalPayable.toLocaleString("en-IN")}`,
        primaryClass: report.totalPayable > 0 ? "text-amber-700" : "text-slate-900",
        secondary: `Supplier bills pending clearance`,
      });
      cards.push({
        id: "bal_vend_count",
        title: "Unpaid Supplier Accounts",
        primary: `${report.payableVendorCount} Vendors`,
        secondary: `Requires payment release`,
      });
      return cards;
    }

    if (selectedModule === "crm") {
      cards.push({
        id: "crm_quotes_val",
        title: "Open Quotations Value",
        primary: `${currencySymbol}${report.openQuotesValue.toLocaleString("en-IN")}`,
        secondary: `Awaiting customer confirmation`,
      });
      cards.push({
        id: "crm_quotes_count",
        title: "Open Quotations Count",
        primary: `${report.openQuotesCount} Quotes`,
        secondary: `Draft, sent, or pending status`,
      });
      cards.push({
        id: "crm_leads",
        title: "Pipeline Leads in Period",
        primary: `${report.totalLeadsCount} Leads`,
        secondary: `${report.convertedLeadsCount} converted into deals`,
      });
      cards.push({
        id: "crm_hot",
        title: "High-Intent Hot Leads",
        primary: `${report.hotLeadsCount} Hot Leads`,
        primaryClass: report.hotLeadsCount > 0 ? "text-amber-700" : "text-slate-900",
        secondary: `Intent score ≥ 80% priority`,
      });
      return cards;
    }

    if (selectedModule === "operations") {
      cards.push({
        id: "ops_queue",
        title: "Total Open Queue",
        primary: `${report.openTasksCount + report.openComplaintsCount} Items`,
        primaryClass: report.openComplaintsCount > 0 ? "text-amber-700" : "text-slate-900",
        secondary: `Tasks + support tickets awaiting resolution`,
      });
      cards.push({
        id: "ops_tasks",
        title: "Pending Staff Tasks",
        primary: `${report.openTasksCount} Tasks`,
        secondary: `Assigned on shop & office board`,
      });
      cards.push({
        id: "ops_tickets",
        title: "Open Support Tickets",
        primary: `${report.openComplaintsCount} Tickets`,
        primaryClass: report.openComplaintsCount > 0 ? "text-red-700" : "text-emerald-700",
        secondary: `Customer issues within SLA`,
      });
      cards.push({
        id: "ops_members",
        title: "Active Loyalty Passes",
        primary: `${report.activeMembershipsCount} Members`,
        secondary: `Registered membership cards`,
      });
      return cards;
    }

    if (selectedModule === "solar") {
      cards.push({
        id: "solar_sites",
        title: "Active Field Sites",
        primary: `${report.solarInstallationsCount} Sites`,
        secondary: `Installations & handover queue`,
      });
      cards.push({
        id: "solar_inqs",
        title: "Rooftop Solar Inquiries",
        primary: `${report.solarInquiriesCount} Leads`,
        secondary: `Active residential & C&I inquiries`,
      });
      cards.push({
        id: "solar_quotes_val",
        title: "Solar Quotations Value",
        primary: `${currencySymbol}${report.solarQuotesValue.toLocaleString("en-IN")}`,
        secondary: `${report.solarQuotesCount} solar system proposals`,
      });
      cards.push({
        id: "solar_cash",
        title: "Operating Net Cashflow",
        primary: `${report.netCashflow < 0 ? "-" : ""}${currencySymbol}${Math.abs(report.netCashflow).toLocaleString("en-IN")}`,
        primaryClass: report.netCashflow >= 0 ? "text-emerald-700" : "text-red-700",
        secondary: `Net margin: ${report.profitMarginPct}%`,
      });
      return cards;
    }

    if (selectedModule === "property") {
      cards.push({
        id: "prop_units",
        title: "Listed Property Assets",
        primary: `${report.propertiesCount} Units`,
        secondary: `Plots, flats & commercial inventory`,
      });
      cards.push({
        id: "prop_buyers",
        title: "Active Property Buyers",
        primary: `${report.realEstateLeadsCount} Buyers`,
        secondary: `Scheduled visits & inquiries`,
      });
      cards.push({
        id: "prop_status",
        title: "Catalog Status",
        primary: "Active",
        primaryClass: "text-emerald-700",
        secondary: "Live shareable property portals",
      });
      cards.push({
        id: "prop_cash",
        title: "Net Cashflow",
        primary: `${report.netCashflow < 0 ? "-" : ""}${currencySymbol}${Math.abs(report.netCashflow).toLocaleString("en-IN")}`,
        primaryClass: report.netCashflow >= 0 ? "text-emerald-700" : "text-red-700",
        secondary: `Net margin: ${report.profitMarginPct}%`,
      });
      return cards;
    }

    return cards;
  }, [selectedModule, report, currencySymbol]);

  // Dynamic grid column class based on number of visible cards
  const gridColsClass = useMemo(() => {
    const count = visibleKpiCards.length;
    if (count <= 2) return "grid-cols-1 sm:grid-cols-2";
    if (count === 3) return "grid-cols-1 sm:grid-cols-3";
    if (count === 4) return "grid-cols-2 md:grid-cols-4";
    if (count === 5) return "grid-cols-2 md:grid-cols-3 xl:grid-cols-5";
    if (count === 6) return "grid-cols-2 md:grid-cols-3 xl:grid-cols-6";
    if (count === 7) return "grid-cols-2 md:grid-cols-4 xl:grid-cols-7";
    return "grid-cols-2 md:grid-cols-4 xl:grid-cols-8";
  }, [visibleKpiCards.length]);

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
            {selectedModule !== "all" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 text-xs font-semibold border border-sky-200 ml-1">
                Module: {report.availableModuleOptions.find((o) => o.id === selectedModule)?.label}
                <button
                  type="button"
                  onClick={() => setSelectedModule("all")}
                  className="text-sky-600 hover:text-sky-900 ml-0.5 font-bold"
                  aria-label="Clear module filter"
                >
                  ×
                </button>
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            All-in-One Business Report
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          {/* INTERACTIVE MODULE SELECTOR DROPDOWN */}
          <div className="w-full sm:w-52 shrink-0">
            <Select
              value={selectedModule}
              onValueChange={(val) => setSelectedModule(val as ReportModuleKey)}
            >
              <SelectTrigger
                aria-label="Filter report by active module"
                className="h-10 rounded-xl border border-slate-300 bg-white text-xs font-semibold shadow-xs hover:border-slate-400 focus:ring-1 focus:ring-slate-900"
              >
                <Filter className="mr-2 h-3.5 w-3.5 text-slate-600 shrink-0" />
                <SelectValue placeholder="All Active Modules" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-slate-300 shadow-md">
                {report.availableModuleOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id} className="text-xs font-medium">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* DATE RANGE SELECTOR */}
          <div className="w-full sm:w-40 shrink-0">
            <Select
              value={dateRange}
              onValueChange={(val) => setDateRange(val as ReportDateRange)}
            >
              <SelectTrigger
                aria-label="Report period filter"
                className="h-10 rounded-xl border border-slate-300 bg-white text-xs font-semibold shadow-xs hover:border-slate-400 focus:ring-1 focus:ring-slate-900"
              >
                <Calendar className="mr-2 h-3.5 w-3.5 text-slate-600 shrink-0" />
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-slate-300 shadow-md">
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id} className="text-xs font-medium">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-400 whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
                title="Choose CSV export format"
              >
                <Download className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                <span>Export CSV</span>
                <ChevronDown className="h-3 w-3 text-slate-400 shrink-0 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 rounded-xl border border-slate-300 shadow-lg p-1.5 bg-white">
              <DropdownMenuItem
                onClick={() => handleExportCsv("current_tab")}
                className="cursor-pointer rounded-lg text-xs font-medium py-2.5 px-3 flex flex-col items-start gap-1 hover:bg-slate-100 focus:bg-slate-100"
              >
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
                  <span>Current Table ({currentTabName})</span>
                </div>
                <span className="text-[11px] text-slate-500 font-normal pl-6">
                  Single clean table with dedicated columns for Excel
                </span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleExportCsv("summary")}
                className="cursor-pointer rounded-lg text-xs font-medium py-2.5 px-3 flex flex-col items-start gap-1 hover:bg-slate-100 focus:bg-slate-100"
              >
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <BarChart3 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Executive KPI Summary</span>
                </div>
                <span className="text-[11px] text-slate-500 font-normal pl-6">
                  Management overview of KPIs &amp; department health
                </span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleExportCsv("consolidated")}
                className="cursor-pointer rounded-lg text-xs font-medium py-2.5 px-3 flex flex-col items-start gap-1 hover:bg-slate-100 focus:bg-slate-100"
              >
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Layers className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Full Consolidated Report</span>
                </div>
                <span className="text-[11px] text-slate-500 font-normal pl-6">
                  All active modules with formatted section headers
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            className="h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-400 whitespace-nowrap shrink-0 hidden sm:inline-flex"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print
          </Button>

          {isBriefDismissed && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onDismissBrief(false)}
              className="h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-primary shadow-xs hover:border-slate-400 whitespace-nowrap shrink-0"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              AI Summary
            </Button>
          )}

          <Button
            asChild
            className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs whitespace-nowrap shrink-0"
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
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-300 bg-white px-4 py-3 print:hidden shadow-xs"
        >
          <div className="flex flex-wrap items-center gap-3 text-xs w-full sm:w-auto">
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 w-full sm:w-auto">
              <Calendar className="h-4 w-4 text-primary" />
              Custom Range
            </span>
            <label className="flex items-center gap-2 text-slate-600 flex-1 sm:flex-initial min-w-[140px]">
              <span className="shrink-0 font-medium">From</span>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                aria-label="Report start date"
                className="h-10 w-full sm:w-40 rounded-xl border border-slate-300 bg-white px-3 text-xs font-mono tabular-nums text-slate-900 shadow-xs hover:border-slate-400 focus-visible:ring-1 focus-visible:ring-slate-900"
              />
            </label>
            <label className="flex items-center gap-2 text-slate-600 flex-1 sm:flex-initial min-w-[140px]">
              <span className="shrink-0 font-medium">To</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                aria-label="Report end date"
                className="h-10 w-full sm:w-40 rounded-xl border border-slate-300 bg-white px-3 text-xs font-mono tabular-nums text-slate-900 shadow-xs hover:border-slate-400 focus-visible:ring-1 focus-visible:ring-slate-900"
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

      {/* PINNED DAILY TEAM PULSE WIDGET */}
      {dailyPulse && (
        <section
          aria-label="Daily team pulse"
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3.5 sm:px-5 print:hidden shadow-xs"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                <Users className="h-4 w-4 text-primary" />
                Daily Team Pulse
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="font-mono tabular-nums font-semibold text-slate-800">
                {dailyPulse.presentToday}/{dailyPulse.totalStaff} Present
                {dailyPulse.halfDayToday > 0 ? ` (${dailyPulse.halfDayToday} Half-day)` : ""}
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>
                Wage Accrued:{" "}
                <strong className="font-mono tabular-nums text-slate-900">
                  {currencySymbol}
                  {dailyPulse.accruedWageToday.toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })}
                </strong>
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>
                Cash Paid Today:{" "}
                <strong className="font-mono tabular-nums text-emerald-700">
                  {currencySymbol}
                  {dailyPulse.cashPaidToday.toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-400 whitespace-nowrap"
              >
                <Link href="/staff">
                  Mark Attendance <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
              {onUnpinDailyPulse && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onUnpinDailyPulse}
                  className="h-9 px-2 text-slate-400 hover:text-slate-700"
                  aria-label="Unpin Daily Pulse widget"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* AI STRATEGY SUMMARY BANNER */}
      {!isBriefDismissed && (
        <section
          aria-label="AI Executive morning brief"
          className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5 text-white shadow-xs"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center shrink-0 mt-0.5 text-sky-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold tracking-tight text-white">
                    Biztrix Morning Brief
                  </h2>
                  <span className="text-[11px] font-mono tabular-nums text-slate-400">
                    {format(new Date(), "dd MMMM yyyy")}
                  </span>
                  {brief?.confidenceScore && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-semibold">
                      {brief.confidenceScore}% confidence
                    </span>
                  )}
                </div>
                {isBriefLoading ? (
                  <div className="w-full max-w-[16rem] space-y-1.5 py-1">
                    <Progress value={60} className="h-1 bg-slate-800" />
                    <p className="text-xs text-slate-300">Compiling cross-module intelligence...</p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      {brief?.summary ||
                        "Click 'Generate Daily Brief' to compile an AI strategy summary covering cashbook, low stock alerts, and high-intent leads."}
                    </p>
                    {!brief && (
                      <button
                        type="button"
                        onClick={onRefreshBrief}
                        disabled={isBriefLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shrink-0 shadow-xs transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Generate Daily Brief
                      </button>
                    )}
                  </div>
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

      {/* DYNAMIC CONSOLIDATED & MODULE-SPECIFIC KPI STRIP */}
      <section aria-label="Key active module figures">
        <div
          className={cn(
            "grid gap-px rounded-2xl border border-slate-300 bg-slate-300 overflow-hidden shadow-xs",
            gridColsClass
          )}
        >
          {visibleKpiCards.map((card) => (
            <div key={card.id} className="bg-white p-3.5 sm:p-4 space-y-1 min-w-0">
              <p className="text-xs text-slate-500 truncate">{card.title}</p>
              <p
                className={cn(
                  "font-mono tabular-nums text-base sm:text-xl font-bold break-words",
                  card.primaryClass || "text-slate-900"
                )}
              >
                {card.primary}
              </p>
              <p
                className={cn(
                  "text-[11px] font-mono tabular-nums truncate",
                  card.secondaryClass || "text-slate-500"
                )}
              >
                {card.secondary}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ANALYTICS CHARTS & CATEGORY BREAKDOWN (7 / 5 SPLIT) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* CASHFLOW & REVENUE CHART */}
        <section className="xl:col-span-7 rounded-2xl border border-slate-300 bg-white p-4 sm:p-5 flex flex-col justify-between gap-4 min-w-0 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {selectedModule === "inventory"
                  ? "Inventory Movements & Cash Flow"
                  : selectedModule === "solar"
                    ? "Solar EPC Cashflow Trend"
                    : "Revenue vs Expense Cashflow"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily inflow and outflow distribution for selected period
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-300 shadow-xs print:hidden">
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
        <section className="xl:col-span-5 rounded-2xl border border-slate-300 bg-white p-4 sm:p-5 flex flex-col justify-between gap-4 min-w-0 shadow-xs">
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

      {/* ACTIVE DEPARTMENTS CONSOLIDATED MATRIX */}
      <section className="rounded-2xl border border-slate-300 bg-white overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-300 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {selectedModule === "all"
                ? "Active Departments Consolidated Summary"
                : `${report.availableModuleOptions.find((m) => m.id === selectedModule)?.label || "Module"} Summary`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedModule === "all"
                ? "Health and operational metrics for your active modules"
                : `Focused operational breakdown for ${report.availableModuleOptions.find((m) => m.id === selectedModule)?.label}`}
            </p>
          </div>
          <span className="font-mono tabular-nums text-xs text-slate-500 shrink-0">
            {report.departmentRows.length} {report.departmentRows.length === 1 ? "department" : "departments"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50/80 text-xs font-semibold text-slate-600">
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
      <section className="rounded-2xl border border-slate-300 bg-white overflow-hidden shadow-xs">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-300 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Mobile dropdown for ledger drilldown view */}
          <div className="sm:hidden w-full print:hidden">
            <Select
              value={activeLedgerTab}
              onValueChange={(val) => setActiveLedgerTab(val as typeof activeLedgerTab)}
            >
              <SelectTrigger
                aria-label="Select ledger view"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white text-xs font-semibold shadow-xs"
              >
                <SelectValue placeholder="Select Ledger View" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-slate-300 shadow-md">
                {visibleLedgerTabs.map((tab) => (
                  <SelectItem key={tab.id} value={tab.id} className="text-xs font-medium">
                    {tab.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop/Tablet tab buttons (Strictly filtered to active modules) */}
          <div
            role="tablist"
            aria-label="Detailed ledger report views"
            className="hidden sm:flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 max-w-full overflow-x-auto scrollbar-hide w-fit print:hidden"
          >
            {visibleLedgerTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeLedgerTab === tab.id}
                onClick={() => setActiveLedgerTab(tab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 font-mono tabular-nums",
                  activeLedgerTab === tab.id
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full xl:w-auto print:hidden">
            <div className="relative flex-1 xl:w-64">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                placeholder="Filter current table..."
                aria-label="Filter report table"
                className="h-10 pl-9 text-xs rounded-xl border border-slate-300 bg-white shadow-xs focus-visible:ring-1 focus-visible:ring-slate-900"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleExportCsv("current_tab")}
              className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-400 whitespace-nowrap shrink-0 hidden sm:inline-flex items-center gap-1.5"
              title={`Export ${currentTabName} table to Excel CSV`}
            >
              <Download className="h-3.5 w-3.5 text-slate-600 shrink-0" />
              <span>Export Table</span>
            </Button>
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

          {activeLedgerTab === "solar" && (
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-5">Project / Lead</th>
                  <th className="py-2.5 px-4">Record Type</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Details</th>
                  <th className="py-2.5 px-5 text-right print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSolarRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-5 text-center text-xs text-slate-500">
                      No solar installations or inquiries found in this period.{" "}
                      <Link href="/solar/operations" className="font-semibold text-primary hover:underline">
                        Open Solar OS →
                      </Link>
                    </td>
                  </tr>
                ) : (
                  filteredSolarRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-5 font-medium text-slate-900">{row.title}</td>
                      <td className="py-2.5 px-4 text-slate-600">{row.type}</td>
                      <td className="py-2.5 px-4 capitalize font-semibold text-slate-700">{row.status}</td>
                      <td className="py-2.5 px-4 text-slate-600">{row.details}</td>
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

          {activeLedgerTab === "property" && (
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-5">Property / Buyer</th>
                  <th className="py-2.5 px-4">Record Type</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Details</th>
                  <th className="py-2.5 px-5 text-right print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPropertyRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-5 text-center text-xs text-slate-500">
                      No property listings or buyer inquiries found.{" "}
                      <Link href="/properties" className="font-semibold text-primary hover:underline">
                        Open Real Estate Catalog →
                      </Link>
                    </td>
                  </tr>
                ) : (
                  filteredPropertyRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-5 font-medium text-slate-900">{row.title}</td>
                      <td className="py-2.5 px-4 text-slate-600">{row.type}</td>
                      <td className="py-2.5 px-4 capitalize font-semibold text-slate-700">{row.status}</td>
                      <td className="py-2.5 px-4 text-slate-600">{row.details}</td>
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
