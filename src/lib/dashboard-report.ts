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
  | 'operations';

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

export function computeExecutiveReport(
  input: ExecutiveReportInput,
  range: ReportDateRange = 'month',
  currencySymbol = '₹',
  now: Date = new Date(),
  customBounds?: CustomDateBounds
): ExecutiveReportOutput {
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
  const activeAddonIds = input.activeAddonIds || [];
  const isPro = (input.businessStatus || '').toLowerCase() === 'pro';

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

  const departmentRows: DepartmentSummaryRow[] = [
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

  if (isPro || activeAddonIds.includes('suite_solar')) {
    const solarInqs = input.solarInquiries || [];
    const solarInstalls = input.solarInstallations || [];
    departmentRows.push({
      id: 'solar',
      department: 'Solar Business OS',
      primaryLabel: 'Active Installations',
      primaryValue: `${solarInstalls.length} sites`,
      secondaryLabel: 'Solar Inquiries',
      secondaryValue: `${solarInqs.length} pipeline leads`,
      statusText: solarInstalls.length > 0 ? 'In Execution' : 'Pipeline Open',
      statusTone: 'nominal',
      href: '/solar/operations',
    });
  }

  if (
    isPro ||
    activeAddonIds.includes('suite_property') ||
    activeAddonIds.includes('feat_realestate_catalog')
  ) {
    const props = input.properties || [];
    const reLeads = input.realEstateLeads || [];
    departmentRows.push({
      id: 'property',
      department: 'Property Pro Suite',
      primaryLabel: 'Listed Assets',
      primaryValue: `${props.length} units`,
      secondaryLabel: 'Property Inquiries',
      secondaryValue: `${reLeads.length} active buyers`,
      statusText: props.length > 0 ? 'Catalog Live' : 'Ready',
      statusTone: 'nominal',
      href: '/properties',
    });
  }

  const inventoryRows = [...products]
    .sort((a, b) => {
      const ratioA = toNum(a?.stock) - toNum(a?.minThreshold);
      const ratioB = toNum(b?.stock) - toNum(b?.minThreshold);
      return ratioA - ratioB;
    })
    .slice(0, 25);

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
    ...leadsAll.slice(0, 15).map((l) => ({
      id: `lead_${l.id}`,
      title: l.name || 'Lead',
      kind: 'Lead' as const,
      stage: String(l.status || 'new'),
      metric: `${toNum(l.intentScore)}% intent`,
      href: '/leads',
    })),
    ...quotationsAll.slice(0, 15).map((q) => ({
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

  return {
    range,
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
    cashflowChart,
    categoryBreakdown,
    departmentRows,
    filteredTransactions,
    inventoryRows,
    balanceRows,
    crmRows,
    operationsRows,
  };
}

function csvEscape(value: unknown): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildExecutiveReportCsv(
  report: ExecutiveReportOutput,
  businessName: string,
  currencySymbol = '₹',
  customBounds?: CustomDateBounds
): string {
  const periodLabel =
    report.range === 'custom'
      ? `${customBounds?.startDate || '...'} to ${customBounds?.endDate || '...'}`
      : report.range;
  const lines: string[] = [];
  lines.push(['Business', businessName, 'Period', periodLabel].map(csvEscape).join(','));
  lines.push('');
  lines.push(['EXECUTIVE SUMMARY', 'Primary Metric', 'Secondary Metric', 'Status'].map(csvEscape).join(','));
  for (const row of report.departmentRows) {
    lines.push(
      [row.department, `${row.primaryLabel}: ${row.primaryValue}`, `${row.secondaryLabel}: ${row.secondaryValue}`, row.statusText]
        .map(csvEscape)
        .join(',')
    );
  }
  lines.push('');
  lines.push(['TRANSACTIONS', 'Date', 'Particulars', 'Category', 'Type', `Amount (${currencySymbol})`].map(csvEscape).join(','));
  for (const tx of report.filteredTransactions) {
    const d = parseReportDate(tx?.date || tx?.createdAt);
    lines.push(
      [
        tx.id || '',
        d ? format(d, 'yyyy-MM-dd') : '',
        tx.particulars || tx.note || '',
        tx.category || '',
        tx.type || '',
        toNum(tx.amount),
      ]
        .map(csvEscape)
        .join(',')
    );
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
  return '/ai-insights';
}
