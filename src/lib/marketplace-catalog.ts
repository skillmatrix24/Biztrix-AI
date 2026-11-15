import type { MarketplaceItem } from "@/app/marketplace/data/types";

export type MarketplaceBillingCycle = "monthly" | "yearly";

export type MarketplaceCategoryFilter =
  | "all"
  | "store_sales"
  | "ai_automation"
  | "finance_ops"
  | "crm_support"
  | "industry";

export interface MarketplaceMeta {
  /** Workspace route to open directly once enabled */
  workspaceHref: string;
  /** Short human-friendly label for where this opens */
  workspaceLabel: string;
  /** Plain-English summary of who this module is built for */
  bestFor: string;
  /** Which category filter group this item belongs to */
  filterGroup: Exclude<MarketplaceCategoryFilter, "all">;
  /** Parent bundle IDs that already include this individual add-on */
  includedInSuites?: string[];
  /** Individual capability highlights for quick-view inspection */
  highlights: string[];
}

export const MARKETPLACE_FILTER_OPTIONS: Array<{
  id: MarketplaceCategoryFilter;
  label: string;
}> = [
  { id: "all", label: "All Modules" },
  { id: "store_sales", label: "Storefront & Sales" },
  { id: "ai_automation", label: "AI & Automation" },
  { id: "finance_ops", label: "Finance & Ops" },
  { id: "crm_support", label: "CRM & Support" },
  { id: "industry", label: "Industry Suites" },
];

export const MARKETPLACE_META: Record<string, MarketplaceMeta> = {
  // Bundles / Suites
  suite_growth: {
    workspaceHref: "/whatsapp-automation",
    workspaceLabel: "Open Growth Hub",
    bestFor: "Businesses wanting automated WhatsApp follow-ups and campaign ROI tracking",
    filterGroup: "ai_automation",
    highlights: [
      "Official Meta Cloud API WhatsApp automation flows",
      "Multi-day customer follow-up sequences & templates",
      "Marketing ROI tracking linked to actual invoices",
      "Campaign analytics and lead scoring",
    ],
  },
  suite_loyalty: {
    workspaceHref: "/loyalty",
    workspaceLabel: "Open Loyalty Hub",
    bestFor: "Retail & service brands increasing repeat visits with points and cashback",
    filterGroup: "crm_support",
    highlights: [
      "Digital membership cards & QR check-in portal",
      "Cashback wallet and points-to-cash redemption",
      "Stackable vs exclusive coupon rules",
      "Automated birthday & inactivity WhatsApp nudges",
    ],
  },
  suite_property: {
    workspaceHref: "/properties",
    workspaceLabel: "Open Real Estate",
    bestFor: "Property developers, brokers, and agencies managing plots and site visits",
    filterGroup: "industry",
    highlights: [
      "Detailed property inventory with maps & plot specs",
      "Lead site-visit scheduling and follow-up log",
      "Agent commission & performance leaderboard",
      "Shareable public property listing pages",
    ],
  },
  suite_intelligence: {
    workspaceHref: "/ai-insights",
    workspaceLabel: "Open AI Advisor",
    bestFor: "Owners automating supplier bill entry and tracking profit & reorder trends",
    filterGroup: "ai_automation",
    highlights: [
      "AI Business Advisor trained on your live sales & stock",
      "Photo-to-inventory OCR purchase bill scanner",
      "Smart stock reorder calculations",
      "Customer payment risk indicators",
    ],
  },
  suite_backoffice: {
    workspaceHref: "/accounting",
    workspaceLabel: "Open Back Office",
    bestFor: "Growing teams managing GST accounting, staff payroll, projects, and tasks",
    filterGroup: "finance_ops",
    highlights: [
      "Full P&L ledger, GST reconciliation & accounting",
      "Staff attendance & digital salary slip generation",
      "Project budgets, milestones & profitability radar",
      "Daily task tracker for shop & office teams",
    ],
  },
  suite_support: {
    workspaceHref: "/complaints",
    workspaceLabel: "Open Support Desk",
    bestFor: "Teams resolving customer complaints with SLA alerts and status tracking",
    filterGroup: "crm_support",
    highlights: [
      "Unified support ticket inbox with team assignment",
      "24-hour escalation alerts so nothing slips",
      "Public ticket tracking link for customers",
      "CSAT rating tracking after resolution",
    ],
  },
  suite_solar: {
    workspaceHref: "/solar/operations",
    workspaceLabel: "Open Solar OS",
    bestFor: "Solar EPC companies handling site surveys, BOM quotes, installations & AMCs",
    filterGroup: "industry",
    highlights: [
      "Site surveys, system sizing & BOM-linked quotations",
      "Atomic warehouse material issue for field teams",
      "Installation checklists & handover certificates",
      "Post-installation plant warranty & AMC tracking",
    ],
  },

  // Individual Add-ons
  feat_store: {
    workspaceHref: "/website",
    workspaceLabel: "Open Store Builder",
    bestFor: "Merchants selling online via a storefront + high-converting sales funnels",
    filterGroup: "store_sales",
    highlights: [
      "23-section storefront builder & live mobile simulator",
      "Dedicated distraction-free Sales Funnel / Landing Page builder",
      "Online order manager, promo codes & COD/Razorpay checkout",
      "Visitor funnel analytics & pixel tracking",
    ],
  },
  feat_branding: {
    workspaceHref: "/settings",
    workspaceLabel: "Customize Branding",
    bestFor: "Businesses putting their own logo, favicon & brand identity across portals",
    filterGroup: "store_sales",
    highlights: [
      "Upload custom business logo across dashboard & portals",
      "Custom browser tab icon (favicon)",
      "White-label branding on customer links",
    ],
  },
  feat_whatsapp: {
    workspaceHref: "/whatsapp-automation",
    workspaceLabel: "Open WhatsApp",
    bestFor: "Teams automating WhatsApp alerts, order updates & follow-ups",
    filterGroup: "ai_automation",
    includedInSuites: ["suite_growth"],
    highlights: [
      "Connect official WhatsApp Business API",
      "Automated order & inquiry follow-ups",
      "Pre-approved Meta template syncing",
    ],
  },
  feat_meta: {
    workspaceHref: "/whatsapp-automation/campaigns",
    workspaceLabel: "Open Campaigns",
    bestFor: "Businesses capturing Facebook Lead Ads & Instagram inquiries directly",
    filterGroup: "ai_automation",
    includedInSuites: ["suite_growth"],
    highlights: [
      "Sync Facebook Lead Ads directly into Leads CRM",
      "Connect Instagram DM & WhatsApp ad attribution",
    ],
  },
  feat_marketing_roi: {
    workspaceHref: "/marketing",
    workspaceLabel: "Open Marketing ROI",
    bestFor: "Store & sales teams measuring coupon & ad campaign returns",
    filterGroup: "store_sales",
    includedInSuites: ["suite_growth"],
    highlights: [
      "Smart discount coupons & bundle promos",
      "Revenue attribution per campaign",
    ],
  },
  feat_intelligence: {
    workspaceHref: "/ai-insights",
    workspaceLabel: "Open AI Advisor",
    bestFor: "Founders asking quick financial & inventory questions from live data",
    filterGroup: "ai_automation",
    includedInSuites: ["suite_intelligence"],
    highlights: [
      "Instant Q&A over sales, cashflow & inventory",
      "Actionable weekly growth recommendations",
    ],
  },
  feat_scan: {
    workspaceHref: "/inventory",
    workspaceLabel: "Open Inventory",
    bestFor: "Shops uploading supplier purchase bills to update stock automatically",
    filterGroup: "ai_automation",
    includedInSuites: ["suite_intelligence"],
    highlights: [
      "Scan supplier invoices via camera/photo",
      "Auto-extract line items, GST & stock quantities",
    ],
  },
  feat_accounting: {
    workspaceHref: "/accounting",
    workspaceLabel: "Open Accounting",
    bestFor: "Businesses tracking full Profit & Loss, ledgers, and GST reports",
    filterGroup: "finance_ops",
    includedInSuites: ["suite_backoffice"],
    highlights: [
      "Real-time P&L, balance breakdown & ledger sync",
      "GST reconciliation & tax-ready exports",
    ],
  },
  feat_payments: {
    workspaceHref: "/payment-requests",
    workspaceLabel: "Open Approvals",
    bestFor: "Teams needing multi-step approval before releasing vendor payouts",
    filterGroup: "finance_ops",
    includedInSuites: ["suite_backoffice"],
    highlights: [
      "Staff payout request & manager approval flow",
      "Automatic cashbook entry on payout release",
    ],
  },
  feat_projects: {
    workspaceHref: "/projects",
    workspaceLabel: "Open Projects",
    bestFor: "Agencies & contractors tracking client milestones and project margins",
    filterGroup: "finance_ops",
    includedInSuites: ["suite_backoffice"],
    highlights: [
      "Milestone tracking & client progress portals",
      "Project-wise cost vs revenue tracking",
    ],
  },
  feat_staff: {
    workspaceHref: "/staff",
    workspaceLabel: "Open Staff & Payroll",
    bestFor: "Businesses managing staff attendance, shifts, and monthly salary slips",
    filterGroup: "finance_ops",
    includedInSuites: ["suite_backoffice"],
    highlights: [
      "Attendance logs & shift tracking",
      "Automated monthly salary & overtime calculation",
    ],
  },
  feat_tasks: {
    workspaceHref: "/notes",
    workspaceLabel: "Open Tasks",
    bestFor: "Owners assigning daily shop chores, follow-ups, and recurring checklists",
    filterGroup: "finance_ops",
    includedInSuites: ["suite_backoffice"],
    highlights: [
      "Daily task board with assignees & due dates",
      "Recurring operational checklists",
    ],
  },
  feat_feedback: {
    workspaceHref: "/feedback",
    workspaceLabel: "Open Feedback",
    bestFor: "Service & retail brands collecting post-purchase ratings and reviews",
    filterGroup: "crm_support",
    highlights: [
      "Shareable public customer feedback form",
      "CSAT rating dashboard & response inbox",
    ],
  },
  feat_billing_pro: {
    workspaceHref: "/billing",
    workspaceLabel: "Open POS Billing",
    bestFor: "High-volume shops & traders needing unlimited POS bills, quotes, party ledgers & cashbook",
    filterGroup: "finance_ops",
    includedInSuites: ["suite_backoffice"],
    highlights: [
      "Unlimited monthly GST POS invoices & split-bill settlements",
      "Unlimited quotations with 1-click POS invoice conversion",
      "Unlimited customer & vendor ledger profiles",
      "Unlimited daily cashbook & recurring fixed expense tracking",
    ],
  },
  feat_eway_gst: {
    workspaceHref: "/accounting/gst",
    workspaceLabel: "Open GST & E-Way",
    bestFor: "GST-registered businesses generating live GSP E-Way Bills & monthly GSTR-1/3B filings",
    filterGroup: "finance_ops",
    includedInSuites: ["suite_backoffice"],
    highlights: [
      "Live GSP E-Way Bill API generation & bulk NIC JSON export",
      "Part-B vehicle updates, validity tracking & cancellation",
      "Sales return credit notes (CDNR) & udhaar recovery links",
      "Unlimited GSTR-1 & GSTR-3B GSTN JSON and CA CSV exports",
    ],
  },
  feat_re_catalog: {
    workspaceHref: "/properties",
    workspaceLabel: "Open Property Catalog",
    bestFor: "Real estate brokers showcasing plot/building listings with maps",
    filterGroup: "industry",
    includedInSuites: ["suite_property"],
    highlights: [
      "Structured plot/flat catalog with dimensions & facing",
      "Interactive map pins & shareable brochures",
    ],
  },
};

export interface CalculatedPrice {
  monthlyOriginal: number;
  effectiveMonthly: number;
  yearlyTotal: number;
  yearlySavings: number;
  discountPercent: number;
}

export function calculateMarketplacePrice(
  rawPrice: string | number,
  billingCycle: MarketplaceBillingCycle,
  annualDiscountPercent: number = 30
): CalculatedPrice {
  const parsed = typeof rawPrice === "number" ? rawPrice : parseInt(String(rawPrice || "0"), 10);
  const monthlyOriginal = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  const clampedDiscount = Number.isFinite(annualDiscountPercent)
    ? Math.min(90, Math.max(0, annualDiscountPercent))
    : 30;
  const multiplier = (100 - clampedDiscount) / 100;
  const effectiveMonthly =
    billingCycle === "yearly" ? Math.floor(monthlyOriginal * multiplier) : monthlyOriginal;
  const yearlyTotal = effectiveMonthly * 12;
  const yearlySavings = Math.max(0, monthlyOriginal * 12 - yearlyTotal);

  return {
    monthlyOriginal,
    effectiveMonthly,
    yearlyTotal,
    yearlySavings,
    discountPercent: clampedDiscount,
  };
}

export interface ModuleActivationStatus {
  isDirectlyActive: boolean;
  includedViaSuiteId: string | null;
  includedViaSuiteName: string | null;
  isAvailable: boolean;
}

export function resolveModuleActivationStatus(
  itemId: string,
  activeAddonIds: string[],
  bundleList: Array<{ id: string; name: string }>
): ModuleActivationStatus {
  const isDirectlyActive = activeAddonIds.includes(itemId);
  const meta = MARKETPLACE_META[itemId];
  const parentSuites = meta?.includedInSuites || [];
  const matchingSuiteId = parentSuites.find((sid) => activeAddonIds.includes(sid)) || null;
  const matchingSuiteName = matchingSuiteId
    ? bundleList.find((b) => b.id === matchingSuiteId)?.name || matchingSuiteId
    : null;

  return {
    isDirectlyActive,
    includedViaSuiteId: matchingSuiteId,
    includedViaSuiteName: matchingSuiteName,
    isAvailable: isDirectlyActive || Boolean(matchingSuiteId),
  };
}

export function filterMarketplaceItems(
  items: MarketplaceItem[],
  options: {
    searchTerm: string;
    categoryFilter: MarketplaceCategoryFilter;
    activeOnly: boolean;
    activeAddonIds: string[];
    bundles: Array<{ id: string; name: string }>;
  }
): MarketplaceItem[] {
  const q = options.searchTerm.trim().toLowerCase();

  return items.filter((item) => {
    const meta = MARKETPLACE_META[item.id];
    const status = resolveModuleActivationStatus(item.id, options.activeAddonIds, options.bundles);

    if (options.activeOnly && !status.isAvailable) {
      return false;
    }

    if (options.categoryFilter !== "all") {
      const group = meta?.filterGroup;
      if (group !== options.categoryFilter) {
        return false;
      }
    }

    if (!q) return true;

    const haystack = [
      item.name,
      item.description,
      item.inclusions,
      item.category,
      meta?.bestFor || "",
      ...(meta?.highlights || []),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

export function getItemWorkspaceLink(itemId: string): {
  href: string;
  label: string;
} {
  const meta = MARKETPLACE_META[itemId];
  return {
    href: meta?.workspaceHref || "/dashboard",
    label: meta?.workspaceLabel || "Open Workspace",
  };
}

export interface CoreCapability {
  id: string;
  name: string;
  summary: string;
  href: string;
}

export const CORE_OS_CAPABILITIES: CoreCapability[] = [
  {
    id: "core-billing",
    name: "POS Billing, Split Bill & Multi-Mode Payments",
    summary: "GST-compliant thermal/A4 invoicing with CGST/SGST/IGST, split bill & multi-mode settlement.",
    href: "/billing",
  },
  {
    id: "core-eway",
    name: "Invoices, Udhaar Recovery & Live E-Way Bill",
    summary: "Credit notes, sales returns, UPI QR reminders, NIC JSON export & live GSP E-Way Bill generation.",
    href: "/invoices",
  },
  {
    id: "core-gst",
    name: "GSTR-1 & GSTR-3B Tax Filing Reports",
    summary: "Auto-classified B2B, B2CL, B2CS, CDNR & HSN summary tables with GSTN JSON & CSV download.",
    href: "/accounting/gst",
  },
  {
    id: "core-quotes",
    name: "Quotations & 1-Click Invoice Convert",
    summary: "Send itemized GST estimates and convert approved quotes straight into POS bills.",
    href: "/quotations",
  },
  {
    id: "core-inventory",
    name: "Master Inventory & Barcode Scanner",
    summary: "Real-time SKU stock ledger, HSN codes, low-stock alerts & camera barcode scanning.",
    href: "/inventory",
  },
  {
    id: "core-crm",
    name: "CRM Lead Pipeline & Follow-Ups",
    summary: "Capture inquiries, score intent, log follow-up reminders & convert won leads.",
    href: "/leads",
  },
  {
    id: "core-customers",
    name: "Customer & Vendor Ledgers",
    summary: "GSTIN directory, udhaar balances, vendor purchase payables & batch entry tools.",
    href: "/customers",
  },
  {
    id: "core-cashbook",
    name: "Daily Cash Book & Fixed Expenses",
    summary: "Track cash/UPI/bank cashflow, bulk batch entries & monthly recurring overheads.",
    href: "/daily-entries",
  },
];

export const PLAN_COMPARISON_ROWS = [
  {
    feature: "GST POS Billing, Split Bill & Quotations",
    free: "Included (up to 50 invoices/month)",
    paid: "Unlimited POS, Split Bills & 1-click Quote conversion",
  },
  {
    feature: "Live E-Way Bill (GSP), Credit Notes & GSTR-1/3B",
    free: "Included in Core OS",
    paid: "Unlimited GSTN JSON/CSV exports & Live EWB sync",
  },
  {
    feature: "Online Storefront & Sales Funnel Builder",
    free: "Not included",
    paid: "23-Section Storefront + Landing Page Funnels + Order Bump (Store & Funnel Builder)",
  },
  {
    feature: "WhatsApp Cloud API, Meta Ads & ROI",
    free: "Manual share links only",
    paid: "Automated 3-step WhatsApp drips, Lead Ads & ROI (Growth Suite)",
  },
  {
    feature: "Loyalty Cards, Cashback Wallet & Coupons",
    free: "Basic customer list",
    paid: "Hybrid stacking coupons, OTP member portal & tiers (Loyalty Suite)",
  },
  {
    feature: "AI Business Advisor & Photo Bill OCR",
    free: "Not included",
    paid: "Hinglish AI Advisor + photo-to-stock OCR scanner (Intelligence Suite)",
  },
  {
    feature: "Accounting P&L, Payroll, Approvals & Projects",
    free: "Daily entries & fixed expenses",
    paid: "Full P&L, digital salary slips, payout approvals & tasks (Back Office Pro)",
  },
  {
    feature: "Support Desk, Feedback & Industry OS",
    free: "Basic tracking",
    paid: "SLA Ticketing, CSAT Forms, Solar EPC (16 tools) & Property Pro",
  },
];

export interface BusinessPlanState {
  statusKey: "active" | "trial" | "expired" | "free";
  planTitle: string;
  statusLabel: string;
  trialDaysRemaining: number | null;
  trialEndLabel: string | null;
}

export function resolveBusinessPlanState(
  business: { status?: string; trialEndDate?: any } | null | undefined,
  now: Date = new Date(),
  trialDurationDays: number = 14
): BusinessPlanState {
  const rawStatus = (business?.status || "").toLowerCase();

  let parsedEnd: Date | null = null;
  if (business?.trialEndDate) {
    if (typeof business.trialEndDate?.toDate === "function") {
      parsedEnd = business.trialEndDate.toDate();
    } else if (typeof business.trialEndDate === "string") {
      const candidate = new Date(business.trialEndDate);
      if (!Number.isNaN(candidate.getTime())) {
        parsedEnd = candidate;
      }
    }
  }

  const trialEndLabel = parsedEnd
    ? parsedEnd.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  const daysRemaining = parsedEnd
    ? Math.ceil((parsedEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (rawStatus === "pro" || rawStatus === "active") {
    return {
      statusKey: "active",
      planTitle: rawStatus === "pro" ? "Biztrix Pro Workspace" : "Active Modular Plan",
      statusLabel: "Active",
      trialDaysRemaining: null,
      trialEndLabel,
    };
  }

  if (rawStatus === "trial") {
    if (daysRemaining !== null && daysRemaining < 0) {
      return {
        statusKey: "expired",
        planTitle: `${trialDurationDays}-Day Trial Ended`,
        statusLabel: "Trial Expired",
        trialDaysRemaining: 0,
        trialEndLabel,
      };
    }
    return {
      statusKey: "trial",
      planTitle: `${trialDurationDays}-Day Free Trial`,
      statusLabel:
        daysRemaining !== null
          ? `Trial · ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`
          : "Trial Active",
      trialDaysRemaining: daysRemaining,
      trialEndLabel,
    };
  }

  return {
    statusKey: "free",
    planTitle: "Free Core OS Plan",
    statusLabel: "Core Free",
    trialDaysRemaining: null,
    trialEndLabel,
  };
}

export interface SubscriptionSummary {
  activeSuites: MarketplaceItem[];
  activeIndividuals: MarketplaceItem[];
  unlockedViaSuite: Array<{ item: MarketplaceItem; suiteName: string }>;
  billableMonthlyTotal: number;
  billableEffectiveMonthly: number;
  billableYearlyTotal: number;
  annualSavings: number;
  redundantAddonIds: string[];
}

export function calculateSubscriptionSummary(
  activeAddonIds: string[],
  billingCycle: MarketplaceBillingCycle,
  bundles: MarketplaceItem[],
  individuals: MarketplaceItem[],
  globalDiscountPercent: number = 30
): SubscriptionSummary {
  const activeSuites = bundles.filter((b) => activeAddonIds.includes(b.id));
  const activeIndividuals = individuals.filter((ind) => activeAddonIds.includes(ind.id));

  const unlockedViaSuite: Array<{ item: MarketplaceItem; suiteName: string }> = [];
  const redundantAddonIds: string[] = [];

  for (const ind of individuals) {
    const status = resolveModuleActivationStatus(ind.id, activeAddonIds, bundles);
    if (status.includedViaSuiteName && !status.isDirectlyActive) {
      unlockedViaSuite.push({ item: ind, suiteName: status.includedViaSuiteName });
    }
    if (status.includedViaSuiteName && status.isDirectlyActive) {
      redundantAddonIds.push(ind.id);
    }
  }

  const billedItems = [...activeSuites, ...activeIndividuals];
  let billableMonthlyTotal = 0;
  let billableEffectiveMonthly = 0;
  let billableYearlyTotal = 0;

  for (const item of billedItems) {
    const discount =
      typeof item.annualDiscountPercent === "number"
        ? item.annualDiscountPercent
        : globalDiscountPercent;
    const price = calculateMarketplacePrice(item.price, billingCycle, discount);
    billableMonthlyTotal += price.monthlyOriginal;
    billableEffectiveMonthly += price.effectiveMonthly;
    billableYearlyTotal += price.yearlyTotal;
  }

  const annualSavings = Math.max(0, billableMonthlyTotal * 12 - billableYearlyTotal);

  return {
    activeSuites,
    activeIndividuals,
    unlockedViaSuite,
    billableMonthlyTotal,
    billableEffectiveMonthly,
    billableYearlyTotal,
    annualSavings,
    redundantAddonIds,
  };
}

export function buildIndividualModuleDetail(item: MarketplaceItem) {
  const meta = MARKETPLACE_META[item.id];
  const inclusionsList = item.inclusions
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    id: item.id,
    title: item.name,
    logicTitle: `${item.category} Add-on Module`,
    description: meta?.bestFor ? `${meta.bestFor}. ${item.description}` : item.description,
    features: inclusionsList.length > 0 ? inclusionsList : meta?.highlights || [],
    rules: [
      `Instant Activation: Enables ${item.name} directly in your sidebar without data migration.`,
      item.usageLimit
        ? `Configured Quota: ${item.usageLimit}.`
        : meta?.includedInSuites?.length
          ? `Bundle Compatible: Also included at no extra charge if you activate its parent All-in-One Suite.`
          : `Standalone Pricing: Pay only for this capability with zero mandatory bundle lock-in.`,
      "Safe Turn-Off: Your business records remain preserved if you disable this add-on anytime.",
    ],
    backend: `Tenant-isolated Firestore collections with automatic sidebar & role entitlement sync (${item.id}).`,
  };
}

export type CoreMenuId =
  | "daily_entries"
  | "billing"
  | "invoices"
  | "gst"
  | "quotations"
  | "inventory"
  | "leads"
  | "customers"
  | "vendors"
  | "fixed_expenses";

export type CoreMenuAccessMode = "free" | "trial_only" | "paid_addon" | "hidden";

export type CoreQuotaKey =
  | "maxMonthlyEntries"
  | "maxMonthlyInvoices"
  | "maxMonthlyEwayBills"
  | "maxMonthlyGstExports"
  | "maxMonthlyQuotations"
  | "maxProducts"
  | "maxActiveLeads"
  | "maxCustomers"
  | "maxVendors"
  | "maxFixedExpenses";

export interface CoreCommandMenuDefinition {
  id: CoreMenuId;
  label: string;
  section: "Command Center" | "Back Office";
  href: string;
  quotaKey: CoreQuotaKey;
  quotaUnit: string;
  addonId: string;
  addonLabel: string;
  suiteId: string;
  suiteLabel: string;
}

export const CORE_COMMAND_MENUS: CoreCommandMenuDefinition[] = [
  {
    id: "daily_entries",
    label: "Daily Entries",
    section: "Command Center",
    href: "/daily-entries",
    quotaKey: "maxMonthlyEntries",
    quotaUnit: "entries/mo",
    addonId: "feat_billing_pro",
    addonLabel: "POS Billing, Quotes & Ledger Pro",
    suiteId: "suite_backoffice",
    suiteLabel: "Back Office Pro",
  },
  {
    id: "billing",
    label: "Billing (POS)",
    section: "Command Center",
    href: "/billing",
    quotaKey: "maxMonthlyInvoices",
    quotaUnit: "invoices/mo",
    addonId: "feat_billing_pro",
    addonLabel: "POS Billing, Quotes & Ledger Pro",
    suiteId: "suite_backoffice",
    suiteLabel: "Back Office Pro",
  },
  {
    id: "invoices",
    label: "Invoices & E-Way",
    section: "Command Center",
    href: "/invoices",
    quotaKey: "maxMonthlyEwayBills",
    quotaUnit: "E-Way bills/mo",
    addonId: "feat_eway_gst",
    addonLabel: "Live E-Way Bill & GST Filing Pro",
    suiteId: "suite_backoffice",
    suiteLabel: "Back Office Pro",
  },
  {
    id: "gst",
    label: "GST & GSTR-1",
    section: "Command Center",
    href: "/accounting/gst",
    quotaKey: "maxMonthlyGstExports",
    quotaUnit: "GST exports/mo",
    addonId: "feat_eway_gst",
    addonLabel: "Live E-Way Bill & GST Filing Pro",
    suiteId: "suite_backoffice",
    suiteLabel: "Back Office Pro",
  },
  {
    id: "quotations",
    label: "Quotations",
    section: "Command Center",
    href: "/quotations",
    quotaKey: "maxMonthlyQuotations",
    quotaUnit: "quotes/mo",
    addonId: "feat_billing_pro",
    addonLabel: "POS Billing, Quotes & Ledger Pro",
    suiteId: "suite_backoffice",
    suiteLabel: "Back Office Pro",
  },
  {
    id: "inventory",
    label: "Inventory",
    section: "Command Center",
    href: "/inventory",
    quotaKey: "maxProducts",
    quotaUnit: "SKUs",
    addonId: "feat_scan",
    addonLabel: "AI Bill Scanner",
    suiteId: "suite_intelligence",
    suiteLabel: "Intelligence Suite",
  },
  {
    id: "leads",
    label: "CRM & Leads",
    section: "Command Center",
    href: "/leads",
    quotaKey: "maxActiveLeads",
    quotaUnit: "active leads",
    addonId: "feat_whatsapp",
    addonLabel: "WhatsApp Automation",
    suiteId: "suite_growth",
    suiteLabel: "Growth Suite",
  },
  {
    id: "customers",
    label: "Customers",
    section: "Command Center",
    href: "/customers",
    quotaKey: "maxCustomers",
    quotaUnit: "customers",
    addonId: "feat_billing_pro",
    addonLabel: "POS Billing, Quotes & Ledger Pro",
    suiteId: "suite_backoffice",
    suiteLabel: "Back Office Pro",
  },
  {
    id: "vendors",
    label: "Vendors",
    section: "Command Center",
    href: "/vendors",
    quotaKey: "maxVendors",
    quotaUnit: "vendors",
    addonId: "feat_billing_pro",
    addonLabel: "POS Billing, Quotes & Ledger Pro",
    suiteId: "suite_backoffice",
    suiteLabel: "Back Office Pro",
  },
  {
    id: "fixed_expenses",
    label: "Fixed Expenses",
    section: "Back Office",
    href: "/fixed-expenses",
    quotaKey: "maxFixedExpenses",
    quotaUnit: "recurring items",
    addonId: "feat_billing_pro",
    addonLabel: "POS Billing, Quotes & Ledger Pro",
    suiteId: "suite_backoffice",
    suiteLabel: "Back Office Pro",
  },
];

export const DEFAULT_CORE_MENU_ACCESS: Record<CoreMenuId, CoreMenuAccessMode> = {
  daily_entries: "free",
  billing: "free",
  invoices: "free",
  gst: "free",
  quotations: "free",
  inventory: "free",
  leads: "free",
  customers: "free",
  vendors: "free",
  fixed_expenses: "free",
};

export interface SystemLimitsConfig {
  // Core Free-Tier Quotas (All Command Center + Fixed Expenses + Preview Funnel & Seats)
  maxMonthlyInvoices: number;
  maxMonthlyQuotations: number;
  maxMonthlyEwayBills: number;
  maxMonthlyGstExports: number;
  maxProducts: number;
  maxActiveLeads: number;
  maxCustomers: number;
  maxVendors: number;
  maxMonthlyEntries: number;
  maxFixedExpenses: number;
  maxFunnels: number;
  maxStaffMembers: number;

  // Global Trial & Billing Rules
  trialDurationDays: number;
  annualDiscountPercent: number;

  // Paid / Pro Module Resource Ceilings
  maxProFunnels: number;
  maxProMonthlyEwayBills: number;
  maxMonthlyAiQueries: number;
  maxMonthlyBillScans: number;
  maxDailyWhatsAppBroadcasts: number;
  maxLoyaltyMembers: number;
  maxSolarProjects: number;
  maxPropertyListings: number;
  maxStorageMb: number;

  // Command Center Menu Access Governance
  coreMenuAccess: Record<CoreMenuId, CoreMenuAccessMode>;

  // Core OS Presentation
  corePlanName: string;
  corePlanTagline: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_SYSTEM_LIMITS: SystemLimitsConfig = {
  maxMonthlyInvoices: 50,
  maxMonthlyQuotations: 30,
  maxMonthlyEwayBills: 10,
  maxMonthlyGstExports: 5,
  maxProducts: 30,
  maxActiveLeads: 20,
  maxCustomers: 50,
  maxVendors: 10,
  maxMonthlyEntries: 100,
  maxFixedExpenses: 10,
  maxFunnels: 1,
  maxStaffMembers: 3,
  trialDurationDays: 14,
  annualDiscountPercent: 30,
  maxProFunnels: 25,
  maxProMonthlyEwayBills: 1000,
  maxMonthlyAiQueries: 500,
  maxMonthlyBillScans: 200,
  maxDailyWhatsAppBroadcasts: 1000,
  maxLoyaltyMembers: 5000,
  maxSolarProjects: 250,
  maxPropertyListings: 500,
  maxStorageMb: 2048,
  coreMenuAccess: { ...DEFAULT_CORE_MENU_ACCESS },
  corePlanName: "Core Business OS",
  corePlanTagline: "POS Billing, Live E-Way Bill, GSTR-1/3B, Quotations, Inventory & Cashbook",
};

function sanitizeLimitNumber(value: unknown, fallback: number, min = 0, max = 9_999_999): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(num)));
}

const VALID_MENU_MODES = new Set<CoreMenuAccessMode>([
  "free",
  "trial_only",
  "paid_addon",
  "hidden",
]);

function normalizeCoreMenuAccess(
  raw?: Partial<Record<CoreMenuId, CoreMenuAccessMode>> | null
): Record<CoreMenuId, CoreMenuAccessMode> {
  const result: Record<CoreMenuId, CoreMenuAccessMode> = { ...DEFAULT_CORE_MENU_ACCESS };
  if (!raw || typeof raw !== "object") return result;

  for (const menu of CORE_COMMAND_MENUS) {
    const candidate = raw[menu.id];
    if (candidate && VALID_MENU_MODES.has(candidate)) {
      result[menu.id] = candidate;
    }
  }
  return result;
}

export function normalizeSystemLimits(
  raw?: Partial<SystemLimitsConfig> | null
): SystemLimitsConfig {
  const source = raw || {};
  return {
    maxMonthlyInvoices: sanitizeLimitNumber(
      source.maxMonthlyInvoices,
      DEFAULT_SYSTEM_LIMITS.maxMonthlyInvoices
    ),
    maxMonthlyQuotations: sanitizeLimitNumber(
      source.maxMonthlyQuotations,
      DEFAULT_SYSTEM_LIMITS.maxMonthlyQuotations
    ),
    maxMonthlyEwayBills: sanitizeLimitNumber(
      source.maxMonthlyEwayBills,
      DEFAULT_SYSTEM_LIMITS.maxMonthlyEwayBills
    ),
    maxMonthlyGstExports: sanitizeLimitNumber(
      source.maxMonthlyGstExports,
      DEFAULT_SYSTEM_LIMITS.maxMonthlyGstExports
    ),
    maxProducts: sanitizeLimitNumber(source.maxProducts, DEFAULT_SYSTEM_LIMITS.maxProducts),
    maxActiveLeads: sanitizeLimitNumber(
      source.maxActiveLeads,
      DEFAULT_SYSTEM_LIMITS.maxActiveLeads
    ),
    maxCustomers: sanitizeLimitNumber(source.maxCustomers, DEFAULT_SYSTEM_LIMITS.maxCustomers),
    maxVendors: sanitizeLimitNumber(source.maxVendors, DEFAULT_SYSTEM_LIMITS.maxVendors),
    maxMonthlyEntries: sanitizeLimitNumber(
      source.maxMonthlyEntries,
      DEFAULT_SYSTEM_LIMITS.maxMonthlyEntries
    ),
    maxFixedExpenses: sanitizeLimitNumber(
      source.maxFixedExpenses,
      DEFAULT_SYSTEM_LIMITS.maxFixedExpenses
    ),
    maxFunnels: sanitizeLimitNumber(source.maxFunnels, DEFAULT_SYSTEM_LIMITS.maxFunnels),
    maxStaffMembers: sanitizeLimitNumber(
      source.maxStaffMembers,
      DEFAULT_SYSTEM_LIMITS.maxStaffMembers
    ),
    trialDurationDays: sanitizeLimitNumber(
      source.trialDurationDays,
      DEFAULT_SYSTEM_LIMITS.trialDurationDays,
      0,
      365
    ),
    annualDiscountPercent: sanitizeLimitNumber(
      source.annualDiscountPercent,
      DEFAULT_SYSTEM_LIMITS.annualDiscountPercent,
      0,
      90
    ),
    maxProFunnels: sanitizeLimitNumber(
      source.maxProFunnels,
      DEFAULT_SYSTEM_LIMITS.maxProFunnels
    ),
    maxProMonthlyEwayBills: sanitizeLimitNumber(
      source.maxProMonthlyEwayBills,
      DEFAULT_SYSTEM_LIMITS.maxProMonthlyEwayBills
    ),
    maxMonthlyAiQueries: sanitizeLimitNumber(
      source.maxMonthlyAiQueries,
      DEFAULT_SYSTEM_LIMITS.maxMonthlyAiQueries
    ),
    maxMonthlyBillScans: sanitizeLimitNumber(
      source.maxMonthlyBillScans,
      DEFAULT_SYSTEM_LIMITS.maxMonthlyBillScans
    ),
    maxDailyWhatsAppBroadcasts: sanitizeLimitNumber(
      source.maxDailyWhatsAppBroadcasts,
      DEFAULT_SYSTEM_LIMITS.maxDailyWhatsAppBroadcasts
    ),
    maxLoyaltyMembers: sanitizeLimitNumber(
      source.maxLoyaltyMembers,
      DEFAULT_SYSTEM_LIMITS.maxLoyaltyMembers
    ),
    maxSolarProjects: sanitizeLimitNumber(
      source.maxSolarProjects,
      DEFAULT_SYSTEM_LIMITS.maxSolarProjects
    ),
    maxPropertyListings: sanitizeLimitNumber(
      source.maxPropertyListings,
      DEFAULT_SYSTEM_LIMITS.maxPropertyListings
    ),
    maxStorageMb: sanitizeLimitNumber(source.maxStorageMb, DEFAULT_SYSTEM_LIMITS.maxStorageMb),
    coreMenuAccess: normalizeCoreMenuAccess(source.coreMenuAccess),
    corePlanName:
      typeof source.corePlanName === "string" && source.corePlanName.trim()
        ? source.corePlanName.trim()
        : DEFAULT_SYSTEM_LIMITS.corePlanName,
    corePlanTagline:
      typeof source.corePlanTagline === "string" && source.corePlanTagline.trim()
        ? source.corePlanTagline.trim()
        : DEFAULT_SYSTEM_LIMITS.corePlanTagline,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
    updatedBy: typeof source.updatedBy === "string" ? source.updatedBy : undefined,
  };
}

export function isCreatedInCurrentMonth(rawDate: any, now: Date = new Date()): boolean {
  if (!rawDate) return false;
  let parsed: Date | null = null;

  if (rawDate instanceof Date) {
    parsed = rawDate;
  } else if (typeof rawDate?.toDate === "function") {
    parsed = rawDate.toDate();
  } else if (typeof rawDate?.seconds === "number") {
    parsed = new Date(rawDate.seconds * 1000);
  } else if (typeof rawDate === "string") {
    const trimmed = rawDate.trim();
    const dmyMatch = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(trimmed);
    if (dmyMatch) {
      parsed = new Date(
        Number(dmyMatch[3]),
        Number(dmyMatch[2]) - 1,
        Number(dmyMatch[1])
      );
    } else {
      const candidate = new Date(trimmed);
      if (!Number.isNaN(candidate.getTime())) {
        parsed = candidate;
      }
    }
  }

  if (!parsed || Number.isNaN(parsed.getTime())) return false;
  return (
    parsed.getFullYear() === now.getFullYear() && parsed.getMonth() === now.getMonth()
  );
}

function isBusinessTrialExpired(
  business: { status?: string; trialEndDate?: any } | null | undefined,
  now: Date = new Date()
): boolean {
  if (!business) return false;
  const status = (business.status || "").toLowerCase();
  if (status === "active" || status === "pro") return false;
  if (status !== "trial" || !business.trialEndDate) return false;

  let endDate: Date | null = null;
  if (typeof business.trialEndDate?.toDate === "function") {
    endDate = business.trialEndDate.toDate();
  } else if (typeof business.trialEndDate === "string") {
    const candidate = new Date(business.trialEndDate);
    if (!Number.isNaN(candidate.getTime())) {
      endDate = candidate;
    }
  }
  if (!endDate) return false;
  const diffMs = endDate.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) < 0;
}

export function resolveCoreMenuState(
  hrefOrId: string,
  options: {
    limits?: SystemLimitsConfig | null;
    business?: { status?: string; activeAddonIds?: string[]; trialEndDate?: any } | null;
    now?: Date;
  } = {}
): "active" | "expired" | "locked" | "hidden" {
  const now = options.now || new Date();
  const expired = isBusinessTrialExpired(options.business, now);
  const menu = CORE_COMMAND_MENUS.find((m) => m.href === hrefOrId || m.id === hrefOrId);
  if (!menu) {
    return expired ? "expired" : "active";
  }

  const limits = options.limits || DEFAULT_SYSTEM_LIMITS;
  const mode: CoreMenuAccessMode = limits.coreMenuAccess?.[menu.id] || "free";

  if (mode === "hidden") {
    return "hidden";
  }

  const status = (options.business?.status || "").toLowerCase();
  const activeAddons = options.business?.activeAddonIds || [];
  const hasModuleEntitlement =
    status === "pro" ||
    activeAddons.includes(menu.addonId) ||
    activeAddons.includes(menu.suiteId);

  if (mode === "paid_addon") {
    if (hasModuleEntitlement) {
      return expired ? "expired" : "active";
    }
    return "locked";
  }

  if (mode === "trial_only") {
    if (hasModuleEntitlement || status === "active") {
      return "active";
    }
    if (status === "trial") {
      return expired ? "expired" : "active";
    }
    return "locked";
  }

  return expired ? "expired" : "active";
}

export interface CoreQuotaEvaluation {
  menu: CoreCommandMenuDefinition;
  mode: CoreMenuAccessMode;
  isUnlocked: boolean;
  isLockedByMode: boolean;
  isReached: boolean;
  limit: number;
  proLimit: number | null;
  current: number;
  remaining: number;
}

export function evaluateCoreQuota(
  menuId: CoreMenuId,
  currentUsage: number,
  options: {
    limits?: SystemLimitsConfig | null;
    business?: { status?: string; activeAddonIds?: string[]; trialEndDate?: any } | null;
    now?: Date;
  } = {}
): CoreQuotaEvaluation {
  const menu =
    CORE_COMMAND_MENUS.find((m) => m.id === menuId) || CORE_COMMAND_MENUS[0];
  const limits = options.limits || DEFAULT_SYSTEM_LIMITS;
  const mode: CoreMenuAccessMode = limits.coreMenuAccess?.[menu.id] || "free";
  const status = (options.business?.status || "").toLowerCase();
  const activeAddons = options.business?.activeAddonIds || [];
  const expired = isBusinessTrialExpired(options.business, options.now);

  const hasModuleEntitlement =
    status === "pro" ||
    activeAddons.includes(menu.addonId) ||
    activeAddons.includes(menu.suiteId);

  const bypassesFreeQuota = hasModuleEntitlement || status === "active";
  const proLimit =
    menu.id === "invoices" ? limits.maxProMonthlyEwayBills : null;

  if (mode === "hidden") {
    return {
      menu,
      mode,
      isUnlocked: false,
      isLockedByMode: true,
      isReached: true,
      limit: 0,
      proLimit,
      current: currentUsage,
      remaining: 0,
    };
  }

  if (mode === "paid_addon" && !hasModuleEntitlement) {
    return {
      menu,
      mode,
      isUnlocked: false,
      isLockedByMode: true,
      isReached: true,
      limit: 0,
      proLimit,
      current: currentUsage,
      remaining: 0,
    };
  }

  if (mode === "trial_only" && !bypassesFreeQuota && (status !== "trial" || expired)) {
    return {
      menu,
      mode,
      isUnlocked: false,
      isLockedByMode: true,
      isReached: true,
      limit: 0,
      proLimit,
      current: currentUsage,
      remaining: 0,
    };
  }

  if (bypassesFreeQuota) {
    const hitProCap =
      proLimit !== null && proLimit < 999999 && currentUsage >= proLimit;
    return {
      menu,
      mode,
      isUnlocked: true,
      isLockedByMode: false,
      isReached: hitProCap,
      limit: proLimit ?? 999999,
      proLimit,
      current: currentUsage,
      remaining:
        proLimit !== null ? Math.max(0, proLimit - currentUsage) : 999999,
    };
  }

  const rawLimit = Number(limits[menu.quotaKey] ?? 0);
  const isUnlimited = rawLimit >= 999999;
  const isReached = !isUnlimited && currentUsage >= rawLimit;

  return {
    menu,
    mode,
    isUnlocked: false,
    isLockedByMode: false,
    isReached,
    limit: rawLimit,
    proLimit,
    current: currentUsage,
    remaining: isUnlimited ? 999999 : Math.max(0, rawLimit - currentUsage),
  };
}

export function mergeMarketplaceCatalog(
  staticBundles: MarketplaceItem[],
  staticIndividuals: MarketplaceItem[],
  remoteDocs: Array<Partial<MarketplaceItem> & { id: string }> = [],
  options: {
    limits?: SystemLimitsConfig;
    includeInactive?: boolean;
  } = {}
): {
  bundles: MarketplaceItem[];
  individuals: MarketplaceItem[];
  allItems: MarketplaceItem[];
} {
  const limits = options.limits || DEFAULT_SYSTEM_LIMITS;
  const includeInactive = Boolean(options.includeInactive);

  const remoteMap = new Map<string, Partial<MarketplaceItem> & { id: string }>();
  for (const docItem of remoteDocs || []) {
    if (docItem?.id) {
      remoteMap.set(docItem.id, docItem);
    }
  }

  const mergeOne = (base: MarketplaceItem): MarketplaceItem => {
    const override = remoteMap.get(base.id);
    const merged: MarketplaceItem = {
      ...base,
      ...(override || {}),
      id: base.id,
      price:
        override?.price !== undefined && override?.price !== null
          ? String(override.price)
          : base.price,
      isActive: override?.isActive !== undefined ? Boolean(override.isActive) : base.isActive ?? true,
      isTrialAvailable:
        override?.isTrialAvailable !== undefined
          ? Boolean(override.isTrialAvailable)
          : base.isTrialAvailable,
      annualDiscountPercent:
        typeof override?.annualDiscountPercent === "number"
          ? override.annualDiscountPercent
          : limits.annualDiscountPercent,
      trialDays:
        typeof override?.trialDays === "number" ? override.trialDays : limits.trialDurationDays,
    };
    return merged;
  };

  const mergedBundles = staticBundles.map(mergeOne);
  const mergedIndividuals = staticIndividuals.map(mergeOne);

  const knownIds = new Set([...staticBundles, ...staticIndividuals].map((i) => i.id));
  const customRemote = (remoteDocs || []).filter(
    (d) => d?.id && !knownIds.has(d.id) && Boolean(d.name)
  );

  for (const custom of customRemote) {
    const item: MarketplaceItem = {
      id: custom.id,
      name: custom.name || custom.id,
      description: custom.description || "",
      price: custom.price !== undefined ? String(custom.price) : "499",
      icon: custom.icon || "Bot",
      category: custom.category || "Ops",
      isPopular: Boolean(custom.isPopular),
      isTrialAvailable: custom.isTrialAvailable !== undefined ? Boolean(custom.isTrialAvailable) : true,
      inclusions: custom.inclusions || "",
      isActive: custom.isActive !== undefined ? Boolean(custom.isActive) : true,
      usageLimit: custom.usageLimit,
      annualDiscountPercent:
        typeof custom.annualDiscountPercent === "number"
          ? custom.annualDiscountPercent
          : limits.annualDiscountPercent,
      trialDays: typeof custom.trialDays === "number" ? custom.trialDays : limits.trialDurationDays,
      sortOrder: typeof custom.sortOrder === "number" ? custom.sortOrder : undefined,
    };

    if (item.category === "Bundles" || item.id.startsWith("suite_")) {
      mergedBundles.push(item);
    } else {
      mergedIndividuals.push(item);
    }
  }

  const filterActive = (list: MarketplaceItem[]) =>
    includeInactive ? list : list.filter((item) => item.isActive !== false);

  const activeBundles = filterActive(mergedBundles);
  const activeIndividuals = filterActive(mergedIndividuals);

  return {
    bundles: activeBundles,
    individuals: activeIndividuals,
    allItems: [...activeBundles, ...activeIndividuals],
  };
}

export function buildPlanComparisonRows(
  limits: SystemLimitsConfig,
  allItems: MarketplaceItem[] = []
) {
  const findItem = (id: string) => allItems.find((i) => i.id === id);
  const store = findItem("feat_store");
  const billingPro = findItem("feat_billing_pro");
  const ewayGst = findItem("feat_eway_gst");
  const growth = findItem("suite_growth");
  const loyalty = findItem("suite_loyalty");
  const intelligence = findItem("suite_intelligence");
  const backoffice = findItem("suite_backoffice");

  const billingMode = limits.coreMenuAccess?.billing || "free";
  const ewayMode = limits.coreMenuAccess?.invoices || "free";
  const gstMode = limits.coreMenuAccess?.gst || "free";

  const invLabel =
    billingMode === "paid_addon"
      ? "Paid add-on required"
      : billingMode === "hidden"
        ? "Disabled by platform rule"
        : limits.maxMonthlyInvoices >= 999999
          ? "Unlimited invoices & quotes/month"
          : `Included (${limits.maxMonthlyInvoices.toLocaleString()} invoices · ${limits.maxMonthlyQuotations.toLocaleString()} quotes/month)`;

  const billingPaidLabel = billingPro
    ? `Unlimited POS, Split Bills & Quotes (${billingPro.name} · ₹${billingPro.price}/mo)`
    : "Unlimited POS, Split Bills & 1-click Quote conversion";

  const ewayFreeLabel =
    ewayMode === "paid_addon" && gstMode === "paid_addon"
      ? "Requires Live E-Way Bill & GST Filing Pro"
      : `Up to ${limits.maxMonthlyEwayBills} E-Way bills · ${limits.maxMonthlyGstExports} GST exports/month`;

  const ewayPaidLabel = ewayGst
    ? `Up to ${limits.maxProMonthlyEwayBills.toLocaleString()} Live GSP E-Way bills/mo & unlimited GSTR-1/3B (${ewayGst.name} · ₹${ewayGst.price}/mo)`
    : `Up to ${limits.maxProMonthlyEwayBills.toLocaleString()} Live GSP E-Way bills/mo & unlimited GSTR-1/3B`;

  const storeLabel = store
    ? `23-Section Storefront + ${limits.maxProFunnels} Sales Funnels & Order Bump (${store.name} · ₹${store.price}/mo)`
    : `23-Section Storefront + ${limits.maxProFunnels} Sales Funnels & Order Bump`;

  const growthLabel = growth
    ? `Up to ${limits.maxDailyWhatsAppBroadcasts.toLocaleString()} daily messages, Lead Ads & ROI (${growth.name} · ₹${growth.price}/mo)`
    : `Up to ${limits.maxDailyWhatsAppBroadcasts.toLocaleString()} daily messages, Lead Ads & ROI`;

  const loyaltyLabel = loyalty
    ? `Up to ${limits.maxLoyaltyMembers.toLocaleString()} members, Cashback & Stacking Coupons (${loyalty.name} · ₹${loyalty.price}/mo)`
    : `Up to ${limits.maxLoyaltyMembers.toLocaleString()} members, Cashback & Stacking Coupons`;

  const aiLabel = intelligence
    ? `${limits.maxMonthlyAiQueries.toLocaleString()} AI queries + ${limits.maxMonthlyBillScans.toLocaleString()} OCR scans/mo (${intelligence.name} · ₹${intelligence.price}/mo)`
    : `${limits.maxMonthlyAiQueries.toLocaleString()} AI queries + ${limits.maxMonthlyBillScans.toLocaleString()} OCR scans/mo`;

  const backofficeLabel = backoffice
    ? `Full P&L, Payroll, Approvals & Tasks (${backoffice.name} · ₹${backoffice.price}/mo)`
    : "Full P&L, Payroll, Approvals & Tasks";

  return [
    {
      feature: "GST POS Billing, Split Bill & Quotations",
      free: invLabel,
      paid: billingPaidLabel,
    },
    {
      feature: "Inventory, Customers, Vendors & CRM Leads",
      free: `${limits.maxProducts} SKUs · ${limits.maxActiveLeads} leads · ${limits.maxCustomers} customers · ${limits.maxVendors} vendors`,
      paid: "Unlimited SKUs, CRM stages, customers & vendor ledgers",
    },
    {
      feature: "Live E-Way Bill (GSP), Credit Notes & GSTR-1/3B",
      free: ewayFreeLabel,
      paid: ewayPaidLabel,
    },
    {
      feature: "Online Storefront & Sales Funnel Builder",
      free: limits.maxFunnels > 0 ? `${limits.maxFunnels} draft preview funnel` : "Not included",
      paid: storeLabel,
    },
    {
      feature: "WhatsApp Cloud API, Meta Ads & ROI",
      free: "Manual share links only",
      paid: growthLabel,
    },
    {
      feature: "Loyalty Cards, Cashback Wallet & Coupons",
      free: "Basic customer list",
      paid: loyaltyLabel,
    },
    {
      feature: "AI Business Advisor & Photo Bill OCR",
      free: "Not included",
      paid: aiLabel,
    },
    {
      feature: "Accounting P&L, Payroll, Approvals & Projects",
      free: `Cashbook (${limits.maxMonthlyEntries}/mo) & ${limits.maxFixedExpenses} fixed overheads`,
      paid: backofficeLabel,
    },
    {
      feature: "Support Desk, Feedback & Industry OS",
      free: "Basic tracking",
      paid: `SLA Ticketing, Solar EPC (${limits.maxSolarProjects} plants) & Property Pro (${limits.maxPropertyListings} listings)`,
    },
  ];
}

