import {
  endOfDay,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  subDays,
} from 'date-fns';

export type ReportDateRange =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | 'month'
  | 'all'
  | 'custom';

export interface CustomDateBounds {
  startDate?: string;
  endDate?: string;
}

export type ReportLedgerTab =
  | 'transactions'
  | 'inventory'
  | 'balances'
  | 'crm'
  | 'operations'
  | 'solar'
  | 'property';

export type ReportModuleKey =
  | 'all'
  | 'billing'
  | 'cashbook'
  | 'inventory'
  | 'balances'
  | 'crm'
  | 'operations'
  | 'solar'
  | 'property';

export interface ActiveModulesResolution {
  isPro: boolean;
  hasBilling: boolean;
  hasCashbook: boolean;
  hasInventory: boolean;
  hasBalances: boolean;
  hasCustomers: boolean;
  hasVendors: boolean;
  hasCrm: boolean;
  hasOperations: boolean;
  hasSolar: boolean;
  hasProperty: boolean;
  availableModules: Array<{ id: ReportModuleKey; label: string }>;
}

export interface ExecutiveReportInput {
  cashbook?: any[];
  orders?: any[];
  products?: any[];
  customers?: any[];
  vendors?: any[];
  leads?: any[];
  quotations?: any[];
  tasks?: any[];
  complaints?: any[];
  memberships?: any[];
  solarInquiries?: any[];
  solarInstallations?: any[];
  properties?: any[];
  realEstateLeads?: any[];
  activeAddonIds?: string[];
  businessStatus?: string;
  selectedModuleFilter?: ReportModuleKey;
  enabledModules?: ReportModuleKey[];
}

export interface CashflowSeriesPoint {
  name: string;
  dateKey: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface CategoryBreakdownRow {
  category: string;
  inflow: number;
  outflow: number;
  totalVolume: number;
  sharePct: number;
  count: number;
}

export interface DepartmentSummaryRow {
  id: string;
  department: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
  statusText: string;
  statusTone: 'nominal' | 'warning' | 'critical';
  href: string;
}

export interface ExecutiveReportOutput {
  range: ReportDateRange;
  selectedModule: ReportModuleKey;
  activeModules: {
    isPro: boolean;
    hasBilling: boolean;
    hasCashbook: boolean;
    hasInventory: boolean;
    hasBalances: boolean;
    hasCustomers: boolean;
    hasVendors: boolean;
    hasCrm: boolean;
    hasOperations: boolean;
    hasSolar: boolean;
    hasProperty: boolean;
  };
  availableModuleOptions: Array<{ id: ReportModuleKey; label: string }>;
  grossSales: number;
  salesTxnCount: number;
  totalInflow: number;
  totalOutflow: number;
  netCashflow: number;
  profitMarginPct: number;
  ordersCount: number;
  ordersRevenue: number;
  avgOrderValue: number;
  totalUdhaar: number;
  udhaarCustomerCount: number;
  totalPayable: number;
  payableVendorCount: number;
  activeSkuCount: number;
  inventoryCostValue: number;
  inventoryRetailValue: number;
  lowStockItems: any[];
  outOfStockCount: number;
  totalLeadsCount: number;
  hotLeadsCount: number;
  convertedLeadsCount: number;
  openQuotesCount: number;
  openQuotesValue: number;
  totalCustomersCount: number;
  activeMembershipsCount: number;
  openTasksCount: number;
  openComplaintsCount: number;
  solarInquiriesCount: number;
  solarInstallationsCount: number;
  solarQuotesCount: number;
  solarQuotesValue: number;
  propertiesCount: number;
  realEstateLeadsCount: number;
  cashflowChart: CashflowSeriesPoint[];
  categoryBreakdown: CategoryBreakdownRow[];
  departmentRows: DepartmentSummaryRow[];
  filteredTransactions: any[];
  inventoryRows: any[];
  balanceRows: Array<{
    id: string;
    name: string;
    phone: string;
    role: 'Customer Udhaar' | 'Vendor Payable';
    amount: number;
    href: string;
  }>;
  crmRows: Array<{
    id: string;
    title: string;
    kind: 'Lead' | 'Quotation';
    stage: string;
    metric: string;
    href: string;
  }>;
  operationsRows: Array<{
    id: string;
    subject: string;
    kind: 'Task' | 'Support Ticket';
    owner: string;
    priority: string;
    status: string;
    href: string;
  }>;
  solarRows: Array<{
    id: string;
    title: string;
    type: 'Site' | 'Inquiry';
    status: string;
    details: string;
    href: string;
  }>;
  propertyRows: Array<{
    id: string;
    title: string;
    type: 'Property' | 'Inquiry';
    status: string;
    details: string;
    href: string;
  }>;
}

export function parseReportDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object' && value !== null && typeof (value as any).toDate === 'function') {
    const d = (value as any).toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  return null;
}

export function isDateInReportRange(
  value: unknown,
  range: ReportDateRange,
  now: Date = new Date(),
  customBounds?: CustomDateBounds
): boolean {
  if (range === 'all') return true;
  const parsed = parseReportDate(value);
  if (!parsed) return false;

  if (range === 'today') return isSameDay(parsed, now);
  if (range === 'yesterday') return isSameDay(parsed, subDays(now, 1));
  if (range === 'month') return isSameMonth(parsed, now);

  if (range === 'custom') {
    const startRaw = customBounds?.startDate ? parseReportDate(customBounds.startDate) : null;
    const endRaw = customBounds?.endDate ? parseReportDate(customBounds.endDate) : null;
    if (!startRaw && !endRaw) return true;

    let minDate = startRaw ? startOfDay(startRaw) : null;
    let maxDate = endRaw ? endOfDay(endRaw) : null;

    if (minDate && maxDate && isAfter(minDate, maxDate)) {
      const swappedMin = startOfDay(endRaw!);
      const swappedMax = endOfDay(startRaw!);
      minDate = swappedMin;
      maxDate = swappedMax;
    }

    if (minDate && isBefore(parsed, minDate)) return false;
    if (maxDate && isAfter(parsed, maxDate)) return false;
    return true;
  }

  const days = range === '7d' ? 6 : 29;
  const cutoff = startOfDay(subDays(now, days));
  return isAfter(parsed, cutoff) || isSameDay(parsed, cutoff);
}

function toNum(val: unknown): number {
  const n = Number.parseFloat(String(val ?? 0));
  return Number.isFinite(n) ? n : 0;
}

export function resolveActiveReportModules(
  activeAddonIds: string[] = [],
  businessStatus?: string,
  enabledModulesOverride?: ReportModuleKey[]
): ActiveModulesResolution {
  const isPro = (businessStatus || '').toLowerCase() === 'pro';
  const addons = new Set(activeAddonIds || []);

  if (enabledModulesOverride && enabledModulesOverride.length > 0) {
    const set = new Set(enabledModulesOverride);
    const hasBilling = set.has('billing');
    const hasCashbook = set.has('cashbook');
    const hasInventory = set.has('inventory');
    const hasBalances = set.has('balances');
    const hasCrm = set.has('crm');
    const hasOperations = set.has('operations');
    const hasSolar = set.has('solar');
    const hasProperty = set.has('property');

    const availableModules: Array<{ id: ReportModuleKey; label: string }> = [
      { id: 'all', label: 'All Active Modules' },
    ];
    if (hasBilling) availableModules.push({ id: 'billing', label: 'Billing & Store Orders' });
    if (hasCashbook) availableModules.push({ id: 'cashbook', label: 'Cashbook & Expenses' });
    if (hasInventory) availableModules.push({ id: 'inventory', label: 'Master Inventory' });
    if (hasBalances) availableModules.push({ id: 'balances', label: 'Udhaar & Payables' });
    if (hasCrm) availableModules.push({ id: 'crm', label: 'CRM & Quotations' });
    if (hasOperations) availableModules.push({ id: 'operations', label: 'Tasks & Support SLA' });
    if (hasSolar) availableModules.push({ id: 'solar', label: 'Solar Business OS' });
    if (hasProperty) availableModules.push({ id: 'property', label: 'Property Pro Suite' });

    return {
      isPro,
      hasBilling,
      hasCashbook,
      hasInventory,
      hasBalances,
      hasCustomers: hasBalances,
      hasVendors: hasBalances,
      hasCrm,
      hasOperations,
      hasSolar,
      hasProperty,
      availableModules,
    };
  }

  const hasSolar =
    isPro ||
    addons.has('suite_solar') ||
    activeAddonIds.some((id) => id.startsWith('feat_solar'));

  const hasProperty =
    isPro ||
    addons.has('suite_property') ||
    addons.has('feat_re_catalog') ||
    addons.has('feat_realestate_catalog');

  // Core business features are active by default for standard merchants on Free/Trial/Active/Pro
  // If a vertical suite is active alone without core restriction, core features remain active.
  const hasCashbook = true;
  const hasBilling = true;
  const hasInventory = true;
  const hasCustomers = true;
  const hasVendors = true;
  const hasBalances = true;
  const hasCrm = true;
  const hasOperations = true;

  const availableModules: Array<{ id: ReportModuleKey; label: string }> = [
    { id: 'all', label: 'All Active Modules' },
    { id: 'billing', label: 'Billing & Store Orders' },
    { id: 'cashbook', label: 'Cashbook & Expenses' },
    { id: 'inventory', label: 'Master Inventory' },
    { id: 'balances', label: 'Udhaar & Payables' },
    { id: 'crm', label: 'CRM & Quotations' },
    { id: 'operations', label: 'Tasks & Support SLA' },
  ];

  if (hasSolar) {
    availableModules.push({ id: 'solar', label: 'Solar Business OS' });
  }

  if (hasProperty) {
    availableModules.push({ id: 'property', label: 'Property Pro Suite' });
  }

  return {
    isPro,
    hasBilling,
    hasCashbook,
    hasInventory,
    hasBalances,
    hasCustomers,
    hasVendors,
    hasCrm,
    hasOperations,
    hasSolar,
    hasProperty,
    availableModules,
  };
}

export function computeExecutiveReport(
  input: ExecutiveReportInput,
  range: ReportDateRange = 'month',
  currencySymbol = '₹',
  now: Date = new Date(),
  customBounds?: CustomDateBounds
): ExecutiveReportOutput {
  const selectedModule: ReportModuleKey = input.selectedModuleFilter || 'all';
  const activeAddonIds = input.activeAddonIds || [];
  const businessStatus = input.businessStatus;

  const activeModules = resolveActiveReportModules(
    activeAddonIds,
    businessStatus,
    input.enabledModules
  );

  const cashbookAll = input.cashbook || [];
  const ordersAll = input.orders || [];
  const products = (input.products || []).filter((p) => !p?.isArchived);
  const customers = (input.customers || []).filter((c) => !c?.isArchived);
  const vendors = input.vendors || [];
  const leadsAll = input.leads || [];
  const quotationsAll = input.quotations || [];
  const tasksAll = input.tasks || [];
  const complaintsAll = input.complaints || [];
  const membershipsAll = input.memberships || [];
  const solarInquiriesAll = input.solarInquiries || [];
  const solarInstallationsAll = input.solarInstallations || [];
  const propertiesAll = input.properties || [];
  const realEstateLeadsAll = input.realEstateLeads || [];

  const filteredTransactions = cashbookAll
    .filter((entry) => isDateInReportRange(entry?.date || entry?.createdAt, range, now, customBounds))
    .sort((a, b) => {
      const da = parseReportDate(a?.date || a?.createdAt)?.getTime() || 0;
      const db = parseReportDate(b?.date || b?.createdAt)?.getTime() || 0;
      return db - da;
    });

  const filteredOrders = ordersAll.filter((o) =>
    isDateInReportRange(o?.createdAt || o?.date, range, now, customBounds)
  );
  const filteredLeads = leadsAll.filter((l) =>
    isDateInReportRange(l?.createdAt || l?.date, range, now, customBounds)
  );

  let totalInflow = 0;
  let totalOutflow = 0;
  let grossSales = 0;
  let salesTxnCount = 0;

  const dailyMap: Record<
    string,
    { timestamp: number; name: string; dateKey: string; inflow: number; outflow: number }
  > = {};
  const categoryMap: Record<string, { inflow: number; outflow: number; count: number }> = {};

  for (const entry of filteredTransactions) {
    const amt = Math.max(0, toNum(entry?.amount));
    const isCredit = entry?.type === 'credit';
    const cat = String(entry?.category || (isCredit ? 'Sales' : 'Expense')).trim() || 'General';

    if (isCredit) {
      totalInflow += amt;
      if (cat.toLowerCase() === 'sales' || cat.toLowerCase() === 'sale') {
        grossSales += amt;
        salesTxnCount += 1;
      }
    } else {
      totalOutflow += amt;
    }

    if (!categoryMap[cat]) {
      categoryMap[cat] = { inflow: 0, outflow: 0, count: 0 };
    }
    categoryMap[cat].count += 1;
    if (isCredit) categoryMap[cat].inflow += amt;
    else categoryMap[cat].outflow += amt;

    const d = parseReportDate(entry?.date || entry?.createdAt);
    if (d) {
      const dateKey = format(d, 'yyyy-MM-dd');
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          timestamp: d.getTime(),
          name: format(d, 'dd MMM'),
          dateKey,
          inflow: 0,
          outflow: 0,
        };
      }
      if (isCredit) dailyMap[dateKey].inflow += amt;
      else dailyMap[dateKey].outflow += amt;
    }
  }

  // Fallback: if no explicit 'Sales' category credit entries exist, use totalInflow as gross revenue
  if (grossSales === 0 && totalInflow > 0) {
    grossSales = totalInflow;
    salesTxnCount = filteredTransactions.filter((t) => t?.type === 'credit').length;
  }

  const netCashflow = totalInflow - totalOutflow;
  const profitMarginPct =
    totalInflow > 0 ? Math.round((netCashflow / totalInflow) * 1000) / 10 : 0;

  const ordersRevenue = filteredOrders.reduce(
    (sum, o) => sum + Math.max(0, toNum(o?.grandTotal ?? o?.total ?? o?.amount)),
    0
  );
  const avgOrderValue =
    filteredOrders.length > 0 ? Math.round(ordersRevenue / filteredOrders.length) : 0;

  const totalUdhaar = customers.reduce((sum, c) => sum + Math.max(0, toNum(c?.creditBalance)), 0);
  const udhaarCustomers = customers.filter((c) => toNum(c?.creditBalance) > 0);
  const totalPayable = vendors.reduce((sum, v) => sum + Math.max(0, toNum(v?.pendingBalance)), 0);
  const payableVendors = vendors.filter((v) => toNum(v?.pendingBalance) > 0);

  let inventoryCostValue = 0;
  let inventoryRetailValue = 0;
  const lowStockItems: any[] = [];
  let outOfStockCount = 0;

  for (const p of products) {
    const stock = Math.max(0, toNum(p?.stock));
    const cost = Math.max(0, toNum(p?.cost || p?.price));
    const price = Math.max(0, toNum(p?.price));
    inventoryCostValue += stock * cost;
    inventoryRetailValue += stock * price;

    if (stock <= 0) outOfStockCount += 1;
    if (p?.minThreshold !== undefined && stock <= toNum(p.minThreshold)) {
      lowStockItems.push(p);
    }
  }

  const hotLeadsCount = filteredLeads.filter((l) => toNum(l?.intentScore) >= 80).length;
  const convertedLeadsCount = filteredLeads.filter(
    (l) => String(l?.status || '').toLowerCase() === 'converted'
  ).length;
  const openQuotes = quotationsAll.filter((q) =>
    ['draft', 'sent', 'pending'].includes(String(q?.status || 'pending').toLowerCase())
  );
  const openQuotesValue = openQuotes.reduce(
    (sum, q) => sum + Math.max(0, toNum(q?.grandTotal ?? q?.total ?? q?.amount)),
    0
  );

  const activeMembershipsCount = membershipsAll.filter(
    (m) => String(m?.status || 'active').toLowerCase() === 'active'
  ).length;
  const openTasks = tasksAll.filter(
    (t) => String(t?.status || '').toLowerCase() !== 'completed'
  );
  const openComplaints = complaintsAll.filter(
    (c) => !['resolved', 'closed'].includes(String(c?.status || '').toLowerCase())
  );

  // Solar specifics
  const solarQuotes = quotationsAll.filter((q) =>
    String(q?.type || q?.quotationType || '').toLowerCase().includes('solar')
  );
  const solarQuotesValue = solarQuotes.reduce(
    (sum, q) => sum + Math.max(0, toNum(q?.grandTotal ?? q?.total ?? q?.amount)),
    0
  );

  const cashflowChart: CashflowSeriesPoint[] = Object.values(dailyMap)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(({ name, dateKey, inflow, outflow }) => ({
      name,
      dateKey,
      inflow,
      outflow,
      net: inflow - outflow,
    }));

  const totalCategoryVolume = Object.values(categoryMap).reduce(
    (sum, c) => sum + c.inflow + c.outflow,
    0
  );
  const categoryBreakdown: CategoryBreakdownRow[] = Object.entries(categoryMap)
    .map(([category, vals]) => {
      const vol = vals.inflow + vals.outflow;
      return {
        category,
        inflow: vals.inflow,
        outflow: vals.outflow,
        totalVolume: vol,
        sharePct: totalCategoryVolume > 0 ? Math.round((vol / totalCategoryVolume) * 1000) / 10 : 0,
        count: vals.count,
      };
    })
    .sort((a, b) => b.totalVolume - a.totalVolume);

  // Raw candidate department rows
  const allCandidateDepartments: DepartmentSummaryRow[] = [
    {
      id: 'billing',
      department: 'Billing & Store Orders',
      primaryLabel: 'Sales Revenue',
      primaryValue: `${currencySymbol}${grossSales.toLocaleString('en-IN')}`,
      secondaryLabel: 'Store Orders / AOV',
      secondaryValue: `${filteredOrders.length} orders · ${currencySymbol}${avgOrderValue.toLocaleString('en-IN')}`,
      statusText: salesTxnCount > 0 || filteredOrders.length > 0 ? 'Active' : 'No Sales Yet',
      statusTone: salesTxnCount > 0 || filteredOrders.length > 0 ? 'nominal' : 'warning',
      href: '/billing',
    },
    {
      id: 'cashbook',
      department: 'Cashbook & Expenses',
      primaryLabel: 'Net Cash Position',
      primaryValue: `${netCashflow >= 0 ? '' : '-'}${currencySymbol}${Math.abs(netCashflow).toLocaleString('en-IN')}`,
      secondaryLabel: 'Outflow / Margin',
      secondaryValue: `${currencySymbol}${totalOutflow.toLocaleString('en-IN')} · ${profitMarginPct}%`,
      statusText: netCashflow >= 0 ? 'Surplus' : 'Deficit',
      statusTone: netCashflow >= 0 ? 'nominal' : 'critical',
      href: '/daily-entries',
    },
    {
      id: 'inventory',
      department: 'Master Inventory',
      primaryLabel: 'Stock Valuation',
      primaryValue: `${currencySymbol}${Math.round(inventoryCostValue).toLocaleString('en-IN')}`,
      secondaryLabel: 'SKUs / Low Stock',
      secondaryValue: `${products.length} SKUs · ${lowStockItems.length} low`,
      statusText:
        outOfStockCount > 0
          ? `${outOfStockCount} Out of Stock`
          : lowStockItems.length > 0
            ? `${lowStockItems.length} Reorder Due`
            : 'Healthy',
      statusTone:
        outOfStockCount > 0 ? 'critical' : lowStockItems.length > 0 ? 'warning' : 'nominal',
      href: '/inventory',
    },
    {
      id: 'crm',
      department: 'CRM & Quotations',
      primaryLabel: 'Open Quotes Value',
      primaryValue: `${currencySymbol}${openQuotesValue.toLocaleString('en-IN')}`,
      secondaryLabel: 'Leads / Hot / Quotes',
      secondaryValue: `${filteredLeads.length} leads · ${hotLeadsCount} hot · ${openQuotes.length} quotes`,
      statusText: hotLeadsCount > 0 ? `${hotLeadsCount} Hot Leads` : 'Steady Pipeline',
      statusTone: hotLeadsCount > 0 ? 'warning' : 'nominal',
      href: '/leads',
    },
    {
      id: 'customers',
      department: 'Customers & Loyalty',
      primaryLabel: 'Pending Udhaar',
      primaryValue: `${currencySymbol}${totalUdhaar.toLocaleString('en-IN')}`,
      secondaryLabel: 'Customers / Members',
      secondaryValue: `${customers.length} total · ${activeMembershipsCount} members`,
      statusText: totalUdhaar > 0 ? `${udhaarCustomers.length} Due` : 'All Settled',
      statusTone: totalUdhaar > 25000 ? 'critical' : totalUdhaar > 0 ? 'warning' : 'nominal',
      href: '/customers',
    },
    {
      id: 'vendors',
      department: 'Vendors & Purchases',
      primaryLabel: 'Vendor Payables',
      primaryValue: `${currencySymbol}${totalPayable.toLocaleString('en-IN')}`,
      secondaryLabel: 'Supplier Accounts',
      secondaryValue: `${vendors.length} vendors · ${payableVendors.length} unpaid`,
      statusText: totalPayable > 0 ? 'Settlement Due' : 'Cleared',
      statusTone: totalPayable > 0 ? 'warning' : 'nominal',
      href: '/vendors',
    },
    {
      id: 'operations',
      department: 'Tasks & Support SLA',
      primaryLabel: 'Open Queue',
      primaryValue: `${openTasks.length + openComplaints.length} items`,
      secondaryLabel: 'Tasks / Support Tickets',
      secondaryValue: `${openTasks.length} tasks · ${openComplaints.length} tickets`,
      statusText: openComplaints.length > 0 ? `${openComplaints.length} Tickets Open` : 'Clear',
      statusTone: openComplaints.length > 0 ? 'warning' : 'nominal',
      href: openComplaints.length > 0 ? '/complaints' : '/notes',
    },
  ];

  if (activeModules.hasSolar) {
    allCandidateDepartments.push({
      id: 'solar',
      department: 'Solar Business OS',
      primaryLabel: 'Active Installations',
      primaryValue: `${solarInstallationsAll.length} sites`,
      secondaryLabel: 'Solar Inquiries',
      secondaryValue: `${solarInquiriesAll.length} pipeline leads`,
      statusText: solarInstallationsAll.length > 0 ? 'In Execution' : 'Pipeline Open',
      statusTone: 'nominal',
      href: '/solar/operations',
    });
  }

  if (activeModules.hasProperty) {
    allCandidateDepartments.push({
      id: 'property',
      department: 'Property Pro Suite',
      primaryLabel: 'Listed Assets',
      primaryValue: `${propertiesAll.length} units`,
      secondaryLabel: 'Property Inquiries',
      secondaryValue: `${realEstateLeadsAll.length} active buyers`,
      statusText: propertiesAll.length > 0 ? 'Catalog Live' : 'Ready',
      statusTone: 'nominal',
      href: '/properties',
    });
  }

  // Filter department rows strictly by active modules and selectedModuleFilter
  const departmentRows = allCandidateDepartments.filter((dept) => {
    // First, verify module is active
    if (dept.id === 'billing' && !activeModules.hasBilling) return false;
    if (dept.id === 'cashbook' && !activeModules.hasCashbook) return false;
    if (dept.id === 'inventory' && !activeModules.hasInventory) return false;
    if (dept.id === 'crm' && !activeModules.hasCrm) return false;
    if (dept.id === 'customers' && !activeModules.hasCustomers) return false;
    if (dept.id === 'vendors' && !activeModules.hasVendors) return false;
    if (dept.id === 'operations' && !activeModules.hasOperations) return false;
    if (dept.id === 'solar' && !activeModules.hasSolar) return false;
    if (dept.id === 'property' && !activeModules.hasProperty) return false;

    // Second, if selectedModuleFilter is set to a specific module, filter to that scope
    if (selectedModule === 'all') return true;
    if (selectedModule === 'balances') {
      return dept.id === 'customers' || dept.id === 'vendors';
    }
    return dept.id === selectedModule;
  });

  const inventoryRows = [...products]
    .sort((a, b) => {
      const ratioA = toNum(a?.stock) - toNum(a?.minThreshold);
      const ratioB = toNum(b?.stock) - toNum(b?.minThreshold);
      return ratioA - ratioB;
    })
    .slice(0, 30);

  const balanceRows = [
    ...udhaarCustomers.map((c) => ({
      id: `cust_${c.id}`,
      name: c.name || 'Customer',
      phone: c.phone || '-',
      role: 'Customer Udhaar' as const,
      amount: toNum(c.creditBalance),
      href: '/customers',
    })),
    ...payableVendors.map((v) => ({
      id: `vend_${v.id}`,
      name: v.name || 'Vendor',
      phone: v.phone || '-',
      role: 'Vendor Payable' as const,
      amount: toNum(v.pendingBalance),
      href: '/vendors',
    })),
  ].sort((a, b) => b.amount - a.amount);

  const crmRows = [
    ...leadsAll.slice(0, 20).map((l) => ({
      id: `lead_${l.id}`,
      title: l.name || 'Lead',
      kind: 'Lead' as const,
      stage: String(l.status || 'new'),
      metric: `${toNum(l.intentScore)}% intent`,
      href: '/leads',
    })),
    ...quotationsAll.slice(0, 20).map((q) => ({
      id: `quote_${q.id}`,
      title: q.customerName || q.quoteNumber || 'Quotation',
      kind: 'Quotation' as const,
      stage: String(q.status || 'sent'),
      metric: `${currencySymbol}${toNum(q.grandTotal ?? q.total ?? q.amount).toLocaleString('en-IN')}`,
      href: '/quotations',
    })),
  ];

  const operationsRows = [
    ...openTasks.map((t) => ({
      id: `task_${t.id}`,
      subject: t.title || 'Untitled Task',
      kind: 'Task' as const,
      owner: t.assignedName || 'Team',
      priority: String(t.priority || 'normal'),
      status: String(t.status || 'pending'),
      href: '/notes',
    })),
    ...openComplaints.map((c) => ({
      id: `tkt_${c.id}`,
      subject: c.subject || c.title || 'Support Ticket',
      kind: 'Support Ticket' as const,
      owner: c.customerName || c.phone || 'Customer',
      priority: String(c.priority || 'medium'),
      status: String(c.status || 'open'),
      href: '/complaints',
    })),
  ];

  const solarRows = [
    ...solarInstallationsAll.map((s) => ({
      id: `solar_inst_${s.id}`,
      title: s.projectName || s.customerName || `Site #${String(s.id).slice(0, 6)}`,
      type: 'Site' as const,
      status: String(s.status || 'in_progress'),
      details: `${s.capacityKw ? `${s.capacityKw} kW · ` : ''}${s.city || 'On-site'}`,
      href: '/solar/installations',
    })),
    ...solarInquiriesAll.map((q) => ({
      id: `solar_inq_${q.id}`,
      title: q.name || q.customerName || 'Solar Inquiry',
      type: 'Inquiry' as const,
      status: String(q.stage || q.status || 'lead'),
      details: `${q.sanctionedLoad ? `${q.sanctionedLoad} kW Load · ` : ''}${q.phone || '-'}`,
      href: '/solar/inquiries',
    })),
  ];

  const propertyRows = [
    ...propertiesAll.map((p) => ({
      id: `prop_${p.id}`,
      title: p.title || p.name || 'Property Unit',
      type: 'Property' as const,
      status: String(p.status || 'available'),
      details: `${p.type || 'Unit'} · ${currencySymbol}${toNum(p.price).toLocaleString('en-IN')}`,
      href: '/properties',
    })),
    ...realEstateLeadsAll.map((r) => ({
      id: `re_lead_${r.id}`,
      title: r.name || 'Property Buyer',
      type: 'Inquiry' as const,
      status: String(r.status || 'new'),
      details: `${r.budget ? `Budget: ${currencySymbol}${toNum(r.budget).toLocaleString('en-IN')}` : r.phone || '-'}`,
      href: '/properties/leads',
    })),
  ];

  return {
    range,
    selectedModule,
    activeModules,
    availableModuleOptions: activeModules.availableModules,
    grossSales,
    salesTxnCount,
    totalInflow,
    totalOutflow,
    netCashflow,
    profitMarginPct,
    ordersCount: filteredOrders.length,
    ordersRevenue,
    avgOrderValue,
    totalUdhaar,
    udhaarCustomerCount: udhaarCustomers.length,
    totalPayable,
    payableVendorCount: payableVendors.length,
    activeSkuCount: products.length,
    inventoryCostValue,
    inventoryRetailValue,
    lowStockItems,
    outOfStockCount,
    totalLeadsCount: filteredLeads.length,
    hotLeadsCount,
    convertedLeadsCount,
    openQuotesCount: openQuotes.length,
    openQuotesValue,
    totalCustomersCount: customers.length,
    activeMembershipsCount,
    openTasksCount: openTasks.length,
    openComplaintsCount: openComplaints.length,
    solarInquiriesCount: solarInquiriesAll.length,
    solarInstallationsCount: solarInstallationsAll.length,
    solarQuotesCount: solarQuotes.length,
    solarQuotesValue,
    propertiesCount: propertiesAll.length,
    realEstateLeadsCount: realEstateLeadsAll.length,
    cashflowChart,
    categoryBreakdown,
    departmentRows,
    filteredTransactions,
    inventoryRows,
    balanceRows,
    crmRows,
    operationsRows,
    solarRows,
    propertyRows,
  };
}

function csvEscape(value: unknown): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export type ReportExportMode = 'consolidated' | 'summary' | 'current_tab';

export function buildCurrentTabCsv(
  report: ExecutiveReportOutput,
  activeTab: ReportLedgerTab,
  businessName: string,
  currencySymbol = '₹',
  customBounds?: CustomDateBounds
): string {
  const periodLabel =
    report.range === 'custom'
      ? `${customBounds?.startDate || '...'} to ${customBounds?.endDate || '...'}`
      : report.range;

  const lines: string[] = [];

  if (activeTab === 'transactions') {
    lines.push(['Transaction ID', 'Date', 'Particulars', 'Category', 'Type', `Credit Amount (${currencySymbol})`, `Debit Amount (${currencySymbol})`, `Net Amount (${currencySymbol})`].map(csvEscape).join(','));
    for (const tx of report.filteredTransactions) {
      const d = parseReportDate(tx?.date || tx?.createdAt);
      const isCredit = tx.type === 'credit';
      const amt = toNum(tx.amount);
      lines.push(
        [
          tx.id || '',
          d ? format(d, 'yyyy-MM-dd') : '',
          tx.particulars || tx.note || 'Cashbook Entry',
          tx.category || 'General',
          isCredit ? 'Credit' : 'Debit',
          isCredit ? amt : '',
          !isCredit ? amt : '',
          isCredit ? amt : -amt,
        ].map(csvEscape).join(',')
      );
    }
    return lines.join('\n');
  }

  if (activeTab === 'inventory') {
    lines.push(['SKU', 'Product Name', 'Category', 'Current Stock', 'Unit', `Unit Cost (${currencySymbol})`, `Unit Retail Price (${currencySymbol})`, `Total Cost Valuation (${currencySymbol})`, 'Stock Status'].map(csvEscape).join(','));
    for (const p of report.inventoryRows) {
      const stock = toNum(p?.stock);
      const cost = toNum(p?.cost || p?.price);
      const price = toNum(p?.price);
      const min = toNum(p?.minThreshold);
      const isLow = stock <= min;
      const status = stock <= 0 ? 'Out of Stock' : isLow ? 'Low Stock' : 'Healthy';
      lines.push(
        [
          p.sku || '',
          p.name || '',
          p.category || 'General',
          stock,
          p.unit || 'pcs',
          cost,
          price,
          Math.round(stock * cost),
          status,
        ].map(csvEscape).join(',')
      );
    }
    return lines.join('\n');
  }

  if (activeTab === 'balances') {
    lines.push(['Account Name', 'Phone Number', 'Party Type', `Pending Balance (${currencySymbol})`, 'Status'].map(csvEscape).join(','));
    for (const b of report.balanceRows) {
      lines.push(
        [
          b.name,
          b.phone,
          b.role,
          b.amount,
          b.amount > 0 ? (b.role === 'Customer Udhaar' ? 'Pending Collection' : 'Pending Settlement') : 'Cleared',
        ].map(csvEscape).join(',')
      );
    }
    return lines.join('\n');
  }

  if (activeTab === 'crm') {
    lines.push(['Record Title', 'Record Type', 'Pipeline Stage', 'Intent Score / Amount', 'Action Route'].map(csvEscape).join(','));
    for (const r of report.crmRows) {
      lines.push(
        [
          r.title,
          r.kind,
          r.stage,
          r.metric,
          r.href,
        ].map(csvEscape).join(',')
      );
    }
    return lines.join('\n');
  }

  if (activeTab === 'operations') {
    lines.push(['Subject / Task', 'Record Type', 'Assignee / Customer', 'Priority', 'Status', 'Action Route'].map(csvEscape).join(','));
    for (const op of report.operationsRows) {
      lines.push(
        [
          op.subject,
          op.kind,
          op.owner,
          op.priority,
          op.status,
          op.href,
        ].map(csvEscape).join(',')
      );
    }
    return lines.join('\n');
  }

  if (activeTab === 'solar') {
    lines.push(['Project / Contact Name', 'Record Type', 'Stage / Status', 'System Capacity / Sanctioned Load', 'Location / Phone', 'Action Route'].map(csvEscape).join(','));
    for (const s of report.solarRows) {
      lines.push(
        [
          s.title,
          s.type,
          s.status,
          s.details,
          s.details,
          s.href,
        ].map(csvEscape).join(',')
      );
    }
    return lines.join('\n');
  }

  if (activeTab === 'property') {
    lines.push(['Asset / Buyer Title', 'Record Type', 'Listing / Lead Stage', 'Property Type / Budget', 'Price / Contact', 'Action Route'].map(csvEscape).join(','));
    for (const pr of report.propertyRows) {
      lines.push(
        [
          pr.title,
          pr.type,
          pr.status,
          pr.details,
          pr.details,
          pr.href,
        ].map(csvEscape).join(',')
      );
    }
    return lines.join('\n');
  }

  return lines.join('\n');
}

export function buildExecutiveSummaryCsv(
  report: ExecutiveReportOutput,
  businessName: string,
  currencySymbol = '₹',
  customBounds?: CustomDateBounds
): string {
  const periodLabel =
    report.range === 'custom'
      ? `${customBounds?.startDate || '...'} to ${customBounds?.endDate || '...'}`
      : report.range;

  const moduleMeta = report.availableModuleOptions.find((m) => m.id === report.selectedModule);
  const moduleLabel = moduleMeta ? moduleMeta.label : 'All Active Modules';

  const lines: string[] = [];
  lines.push(['REPORT', 'Executive Business Health & KPI Summary', 'Generated', format(new Date(), 'yyyy-MM-dd HH:mm')].map(csvEscape).join(','));
  lines.push(['Business', businessName, 'Period', periodLabel, 'Scope', moduleLabel].map(csvEscape).join(','));
  lines.push('');

  // 1. Executive KPIs table
  lines.push(['# SECTION: EXECUTIVE FINANCIAL & OPERATIONAL KPIS'].map(csvEscape).join(','));
  lines.push(['Category', 'Metric Name', 'Raw Value', `Formatted Value (${currencySymbol})`, 'Operational Context', 'Status'].map(csvEscape).join(','));

  lines.push(['Revenue', 'Gross Sales Revenue', report.grossSales, `${currencySymbol}${report.grossSales.toLocaleString('en-IN')}`, `${report.salesTxnCount} sales · ${report.ordersCount} store orders`, report.grossSales > 0 ? 'Active' : 'No Sales Yet'].map(csvEscape).join(','));
  lines.push(['Cashflow', 'Total Inflow (Receipts)', report.totalInflow, `${currencySymbol}${report.totalInflow.toLocaleString('en-IN')}`, 'Cashbook credit collections', 'Surplus'].map(csvEscape).join(','));
  lines.push(['Cashflow', 'Total Outflow (Expenses)', report.totalOutflow, `${currencySymbol}${report.totalOutflow.toLocaleString('en-IN')}`, 'Operating payouts & vendor bills', 'Recorded'].map(csvEscape).join(','));
  lines.push(['Cashflow', 'Net Cash Surplus / Deficit', report.netCashflow, `${report.netCashflow < 0 ? '-' : ''}${currencySymbol}${Math.abs(report.netCashflow).toLocaleString('en-IN')}`, `Operating cash margin: ${report.profitMarginPct}%`, report.netCashflow >= 0 ? 'Surplus' : 'Deficit'].map(csvEscape).join(','));
  lines.push(['Receivables', 'Customer Udhaar Dues', report.totalUdhaar, `${currencySymbol}${report.totalUdhaar.toLocaleString('en-IN')}`, `${report.udhaarCustomerCount} pending customer accounts`, report.totalUdhaar > 0 ? 'Pending Collection' : 'All Settled'].map(csvEscape).join(','));
  lines.push(['Payables', 'Vendor Payables Due', report.totalPayable, `${currencySymbol}${report.totalPayable.toLocaleString('en-IN')}`, `${report.payableVendorCount} unpaid supplier accounts`, report.totalPayable > 0 ? 'Settlement Due' : 'Cleared'].map(csvEscape).join(','));
  lines.push(['Inventory', 'Stock Cost Valuation', Math.round(report.inventoryCostValue), `${currencySymbol}${Math.round(report.inventoryCostValue).toLocaleString('en-IN')}`, `${report.activeSkuCount} SKUs · ${report.lowStockItems.length} low stock`, report.outOfStockCount > 0 ? `${report.outOfStockCount} Out of Stock` : 'Healthy'].map(csvEscape).join(','));
  lines.push(['CRM', 'Open Quotations Value', report.openQuotesValue, `${currencySymbol}${report.openQuotesValue.toLocaleString('en-IN')}`, `${report.openQuotesCount} quotes · ${report.totalLeadsCount} leads`, 'Pipeline Open'].map(csvEscape).join(','));
  lines.push(['Operations', 'Open Queue Items', report.openTasksCount + report.openComplaintsCount, `${report.openTasksCount + report.openComplaintsCount} items`, `${report.openTasksCount} tasks · ${report.openComplaintsCount} tickets`, report.openComplaintsCount > 0 ? 'Tickets Open' : 'Clear'].map(csvEscape).join(','));

  if (report.activeModules.hasSolar) {
    lines.push(['Solar', 'Active Installations', report.solarInstallationsCount, `${report.solarInstallationsCount} sites`, `${report.solarInquiriesCount} pipeline leads · ${currencySymbol}${report.solarQuotesValue.toLocaleString('en-IN')} quotes`, report.solarInstallationsCount > 0 ? 'In Execution' : 'Pipeline Open'].map(csvEscape).join(','));
  }
  if (report.activeModules.hasProperty) {
    lines.push(['Property', 'Listed Portfolio Assets', report.propertiesCount, `${report.propertiesCount} units`, `${report.realEstateLeadsCount} active buyer inquiries`, 'Catalog Live'].map(csvEscape).join(','));
  }
  lines.push('');

  // 2. Department Breakdown
  lines.push(['# SECTION: DEPARTMENT HEALTH MATRIX'].map(csvEscape).join(','));
  lines.push(['Department', 'Primary Metric Name', 'Primary Value', 'Secondary Metric Name', 'Secondary Value', 'Health Status'].map(csvEscape).join(','));
  for (const row of report.departmentRows) {
    lines.push(
      [
        row.department,
        row.primaryLabel,
        row.primaryValue,
        row.secondaryLabel,
        row.secondaryValue,
        row.statusText,
      ].map(csvEscape).join(',')
    );
  }

  return lines.join('\n');
}

export function buildExecutiveReportCsv(
  report: ExecutiveReportOutput,
  businessName: string,
  currencySymbol = '₹',
  customBounds?: CustomDateBounds,
  exportMode: ReportExportMode = 'consolidated',
  activeTab?: ReportLedgerTab
): string {
  if (exportMode === 'current_tab' && activeTab) {
    return buildCurrentTabCsv(report, activeTab, businessName, currencySymbol, customBounds);
  }
  if (exportMode === 'summary') {
    return buildExecutiveSummaryCsv(report, businessName, currencySymbol, customBounds);
  }

  const periodLabel =
    report.range === 'custom'
      ? `${customBounds?.startDate || '...'} to ${customBounds?.endDate || '...'}`
      : report.range;

  const moduleMeta = report.availableModuleOptions.find((m) => m.id === report.selectedModule);
  const moduleLabel = moduleMeta ? moduleMeta.label : 'All Active Modules';

  const lines: string[] = [];
  lines.push(['# ALL-IN-ONE BUSINESS EXECUTIVE REPORT'].map(csvEscape).join(','));
  lines.push(['Business', businessName, 'Period', periodLabel, 'Scope', moduleLabel, 'Exported On', format(new Date(), 'yyyy-MM-dd HH:mm')].map(csvEscape).join(','));
  lines.push('');

  // 1. Department Summary Section
  lines.push(['# SECTION: DEPARTMENT SUMMARY'].map(csvEscape).join(','));
  lines.push(['Department', 'Primary Metric', 'Primary Value', 'Secondary Metric', 'Secondary Value', 'Status'].map(csvEscape).join(','));
  for (const row of report.departmentRows) {
    lines.push(
      [
        row.department,
        row.primaryLabel,
        row.primaryValue,
        row.secondaryLabel,
        row.secondaryValue,
        row.statusText,
      ].map(csvEscape).join(',')
    );
  }
  lines.push('');

  // 2. Transactions Section
  const showTransactions = ['all', 'cashbook', 'billing'].includes(report.selectedModule);
  if (showTransactions && report.filteredTransactions.length > 0) {
    lines.push(['# SECTION: TRANSACTIONS'].map(csvEscape).join(','));
    lines.push(['Transaction ID', 'Date', 'Particulars', 'Category', 'Type', `Amount (${currencySymbol})`].map(csvEscape).join(','));
    for (const tx of report.filteredTransactions) {
      const d = parseReportDate(tx?.date || tx?.createdAt);
      lines.push(
        [
          tx.id || '',
          d ? format(d, 'yyyy-MM-dd') : '',
          tx.particulars || tx.note || 'Cashbook Entry',
          tx.category || 'General',
          tx.type || '',
          toNum(tx.amount),
        ].map(csvEscape).join(',')
      );
    }
    lines.push('');
  }

  // 3. Inventory Section
  const showInventory = ['all', 'inventory'].includes(report.selectedModule);
  if (showInventory && report.inventoryRows.length > 0) {
    lines.push(['# SECTION: INVENTORY VALUATION'].map(csvEscape).join(','));
    lines.push(['SKU', 'Product Name', 'Category', 'Stock Quantity', 'Unit', `Cost Valuation (${currencySymbol})`].map(csvEscape).join(','));
    for (const p of report.inventoryRows) {
      const stock = toNum(p?.stock);
      const cost = toNum(p?.cost || p?.price);
      lines.push(
        [
          p.sku || '',
          p.name || '',
          p.category || 'General',
          stock,
          p.unit || 'pcs',
          Math.round(stock * cost),
        ].map(csvEscape).join(',')
      );
    }
    lines.push('');
  }

  // 4. Balances Section
  const showBalances = ['all', 'balances'].includes(report.selectedModule);
  if (showBalances && report.balanceRows.length > 0) {
    lines.push(['# SECTION: BALANCES LEDGER'].map(csvEscape).join(','));
    lines.push(['Account Name', 'Phone Number', 'Ledger Type', `Pending Amount (${currencySymbol})`].map(csvEscape).join(','));
    for (const b of report.balanceRows) {
      lines.push(
        [
          b.name,
          b.phone,
          b.role,
          b.amount,
        ].map(csvEscape).join(',')
      );
    }
    lines.push('');
  }

  // 5. Solar Section
  const showSolar = ['all', 'solar'].includes(report.selectedModule) && report.activeModules.hasSolar;
  if (showSolar && report.solarRows.length > 0) {
    lines.push(['# SECTION: SOLAR SITES & PIPELINE'].map(csvEscape).join(','));
    lines.push(['Record Title', 'Record Type', 'Status', 'Details'].map(csvEscape).join(','));
    for (const s of report.solarRows) {
      lines.push([s.title, s.type, s.status, s.details].map(csvEscape).join(','));
    }
    lines.push('');
  }

  // 6. Property Section
  const showProperty = ['all', 'property'].includes(report.selectedModule) && report.activeModules.hasProperty;
  if (showProperty && report.propertyRows.length > 0) {
    lines.push(['# SECTION: PROPERTY PORTFOLIO'].map(csvEscape).join(','));
    lines.push(['Asset Title', 'Record Type', 'Status', 'Details'].map(csvEscape).join(','));
    for (const pr of report.propertyRows) {
      lines.push([pr.title, pr.type, pr.status, pr.details].map(csvEscape).join(','));
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function resolveReportActionHref(actionType: string): string {
  const normalized = (actionType || '').toLowerCase();
  if (normalized.includes('task') || normalized.includes('note')) return '/notes';
  if (normalized.includes('lead') || normalized.includes('crm')) return '/leads';
  if (normalized.includes('inv') || normalized.includes('stock')) return '/inventory';
  if (normalized.includes('pay') || normalized.includes('udhaar') || normalized.includes('customer')) return '/customers';
  if (normalized.includes('quote')) return '/quotations';
  if (normalized.includes('bill') || normalized.includes('sale')) return '/billing';
  if (normalized.includes('solar')) return '/solar/operations';
  if (normalized.includes('prop')) return '/properties';
  return '/ai-insights';
}
