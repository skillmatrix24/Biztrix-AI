import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExecutiveReportCsv,
  computeExecutiveReport,
  isDateInReportRange,
  resolveActiveReportModules,
} from './dashboard-report';

test('isDateInReportRange accurately filters today, yesterday, 7d, 30d, month, custom, and all ranges', () => {
  const now = new Date('2026-11-14T10:00:00Z');
  assert.equal(isDateInReportRange('2026-11-14', 'today', now), true);
  assert.equal(isDateInReportRange('2026-11-13', 'today', now), false);
  assert.equal(isDateInReportRange('2026-11-13', 'yesterday', now), true);
  assert.equal(isDateInReportRange('2026-11-14', 'yesterday', now), false);
  assert.equal(isDateInReportRange('2026-11-09', '7d', now), true);
  assert.equal(isDateInReportRange('2026-11-01', '7d', now), false);
  assert.equal(isDateInReportRange('2026-11-01', 'month', now), true);
  assert.equal(isDateInReportRange('2026-10-01', 'all', now), true);

  // Custom range (inclusive & handles swapped bounds safely)
  assert.equal(
    isDateInReportRange('2026-11-05', 'custom', now, {
      startDate: '2026-11-01',
      endDate: '2026-11-10',
    }),
    true
  );
  assert.equal(
    isDateInReportRange('2026-11-12', 'custom', now, {
      startDate: '2026-11-01',
      endDate: '2026-11-10',
    }),
    false
  );
  assert.equal(
    isDateInReportRange('2026-11-05', 'custom', now, {
      startDate: '2026-11-10',
      endDate: '2026-11-01',
    }),
    true
  );
});

test('computeExecutiveReport aggregates all departments, margins, valuations, and balances accurately', () => {
  const now = new Date('2026-11-14T10:00:00Z');
  const report = computeExecutiveReport(
    {
      activeAddonIds: ['suite_solar'],
      businessStatus: 'trial',
      cashbook: [
        { id: 't1', date: '2026-11-14', category: 'Sales', type: 'credit', amount: 10000, particulars: 'POS Bill #1' },
        { id: 't2', date: '2026-11-12', category: 'Salary', type: 'debit', amount: 2500, particulars: 'Staff payout' },
        { id: 't3', date: '2026-09-01', category: 'Sales', type: 'credit', amount: 50000, particulars: 'Old bill' },
      ],
      orders: [{ id: 'o1', createdAt: '2026-11-13', grandTotal: 4000 }],
      products: [
        { id: 'p1', sku: 'SKU-1', name: 'Inverter', stock: 3, minThreshold: 5, cost: 2000, price: 2500 },
        { id: 'p2', sku: 'SKU-2', name: 'Cable', stock: 0, minThreshold: 10, cost: 100, price: 150 },
        { id: 'p3', sku: 'SKU-3', name: 'Archived', stock: 10, minThreshold: 1, cost: 500, isArchived: true },
      ],
      customers: [
        { id: 'c1', name: 'Ramesh', phone: '9876543210', creditBalance: 4500 },
        { id: 'c2', name: 'Suresh', phone: '9876543211', creditBalance: 0 },
      ],
      vendors: [{ id: 'v1', name: 'Solarix Dist', phone: '9999999999', pendingBalance: 3200 }],
      leads: [
        { id: 'l1', name: 'Amit', createdAt: '2026-11-14', status: 'new', intentScore: 90 },
        { id: 'l2', name: 'Neha', createdAt: '2026-11-10', status: 'converted', intentScore: 85 },
      ],
      quotations: [{ id: 'q1', customerName: 'Amit', status: 'sent', grandTotal: 15000 }],
      tasks: [{ id: 'tk1', title: 'Dispatch order', status: 'pending', priority: 'high' }],
      complaints: [{ id: 'cp1', subject: 'Delayed delivery', status: 'open', priority: 'high' }],
      memberships: [{ id: 'm1', status: 'active' }],
      solarInquiries: [{ id: 'si1', name: 'Solar Lead 1', sanctionedLoad: 5 }],
      solarInstallations: [{ id: 'sn1', projectName: 'Rooftop 5kW', capacityKw: 5, city: 'Jaipur' }],
    },
    'month',
    '₹',
    now
  );

  // Month range excludes September bill
  assert.equal(report.grossSales, 10000);
  assert.equal(report.totalOutflow, 2500);
  assert.equal(report.netCashflow, 7500);
  assert.equal(report.profitMarginPct, 75);
  assert.equal(report.ordersCount, 1);
  assert.equal(report.avgOrderValue, 4000);

  // Balance & stock assertions
  assert.equal(report.totalUdhaar, 4500);
  assert.equal(report.totalPayable, 3200);
  assert.equal(report.inventoryCostValue, 6000); // 3 * 2000 + 0 * 100
  assert.equal(report.lowStockItems.length, 2);
  assert.equal(report.outOfStockCount, 1);

  // Solar conditional row included
  assert.equal(report.departmentRows.some((r) => r.id === 'solar'), true);
  assert.equal(report.balanceRows.length, 2);
  assert.equal(report.operationsRows.length, 2);
  assert.equal(report.solarRows.length, 2);

  const csv = buildExecutiveReportCsv(report, 'Biztrix Store', '₹');
  assert.ok(csv.includes('Biztrix Store'));
  assert.ok(csv.includes('Billing & Store Orders'));
  assert.ok(csv.includes('POS Bill #1'));
});

test('resolveActiveReportModules strictly gates vertical suites when not subscribed', () => {
  // Retail merchant with no addons
  const retailRes = resolveActiveReportModules([], 'free');
  assert.equal(retailRes.hasSolar, false);
  assert.equal(retailRes.hasProperty, false);
  assert.equal(retailRes.availableModules.some((m) => m.id === 'solar'), false);
  assert.equal(retailRes.availableModules.some((m) => m.id === 'property'), false);

  // Solar contractor
  const solarRes = resolveActiveReportModules(['suite_solar'], 'trial');
  assert.equal(solarRes.hasSolar, true);
  assert.equal(solarRes.hasProperty, false);
  assert.equal(solarRes.availableModules.some((m) => m.id === 'solar'), true);

  // Pro merchant has all modules
  const proRes = resolveActiveReportModules([], 'pro');
  assert.equal(proRes.hasSolar, true);
  assert.equal(proRes.hasProperty, true);
});

test('computeExecutiveReport isolates selectedModuleFilter on demand for focused views and CSV export', () => {
  const sampleInput = {
    activeAddonIds: ['suite_solar'],
    businessStatus: 'trial',
    cashbook: [
      { id: 't1', date: '2026-11-14', category: 'Sales', type: 'credit', amount: 8000, particulars: 'Store Sale' },
      { id: 't2', date: '2026-11-14', category: 'Expense', type: 'debit', amount: 3000, particulars: 'Packaging' },
    ],
    products: [
      { id: 'p1', sku: 'SKU-INV-1', name: 'Solar Panel 540W', stock: 12, cost: 8000, price: 10500 },
    ],
    solarInstallations: [
      { id: 'site_101', projectName: 'Green Villa 10kW', status: 'in_progress', capacityKw: 10, city: 'Delhi' },
    ],
    solarInquiries: [
      { id: 'inq_101', name: 'Rajesh Sharma', status: 'survey_scheduled', sanctionedLoad: 7, phone: '9876543210' },
    ],
  };

  // Test Inventory isolation
  const invReport = computeExecutiveReport(
    { ...sampleInput, selectedModuleFilter: 'inventory' },
    'month',
    '₹'
  );
  assert.equal(invReport.selectedModule, 'inventory');
  assert.equal(invReport.departmentRows.length, 1);
  assert.equal(invReport.departmentRows[0].id, 'inventory');

  const invCsv = buildExecutiveReportCsv(invReport, 'Apex Solar EPC', '₹');
  assert.ok(invCsv.includes('Master Inventory'));
  assert.ok(invCsv.includes('INVENTORY VALUATION'));
  assert.ok(invCsv.includes('Solar Panel 540W'));
  // Should not contain cashbook transactions in inventory-only CSV
  assert.equal(invCsv.includes('Store Sale'), false);

  // Test Solar isolation
  const solarReport = computeExecutiveReport(
    { ...sampleInput, selectedModuleFilter: 'solar' },
    'month',
    '₹'
  );
  assert.equal(solarReport.selectedModule, 'solar');
  assert.equal(solarReport.departmentRows.length, 1);
  assert.equal(solarReport.departmentRows[0].id, 'solar');
  assert.equal(solarReport.solarRows.length, 2);

  const solarCsv = buildExecutiveReportCsv(solarReport, 'Apex Solar EPC', '₹');
  assert.ok(solarCsv.includes('Solar Business OS'));
  assert.ok(solarCsv.includes('SOLAR SITES & PIPELINE'));
  assert.ok(solarCsv.includes('Green Villa 10kW'));
  assert.ok(solarCsv.includes('Rajesh Sharma'));
});

test('buildCurrentTabCsv and buildExecutiveSummaryCsv produce clean, unshifted single-table exports', () => {
  const sampleInput = {
    activeAddonIds: ['suite_solar'],
    businessStatus: 'trial',
    cashbook: [
      { id: 't1', date: '2026-11-14', category: 'Sales', type: 'credit', amount: 8000, particulars: 'Store Sale' },
      { id: 't2', date: '2026-11-14', category: 'Expense', type: 'debit', amount: 3000, particulars: 'Packaging' },
    ],
    products: [
      { id: 'p1', sku: 'SKU-INV-1', name: 'Solar Panel 540W', stock: 12, cost: 8000, price: 10500 },
      { id: 'p2', sku: 'SKU-INV-2', name: 'Inverter 5kW', stock: 0, cost: 45000, price: 52000 },
    ],
    customers: [
      { id: 'c1', name: 'Khoman Ram', phone: '09907471591', creditBalance: 5797 },
      { id: 'c2', name: 'Skill Matrix', phone: '9300911588', creditBalance: 283 },
    ],
    vendors: [
      { id: 'v1', name: 'Solar Dist Co', phone: '9888888888', pendingBalance: 12000 },
    ],
    solarInstallations: [
      { id: 'site_101', projectName: 'Green Villa 10kW', status: 'in_progress', capacityKw: 10, city: 'Delhi' },
    ],
    solarInquiries: [
      { id: 'inq_101', name: 'Rajesh Sharma', status: 'survey_scheduled', sanctionedLoad: 7, phone: '9876543210' },
    ],
  };

  const report = computeExecutiveReport(sampleInput, 'month', '₹');

  // 1. Inventory single-table test
  const invTabCsv = buildExecutiveReportCsv(report, 'Apex Solar', '₹', undefined, 'current_tab', 'inventory');
  const invLines = invTabCsv.split('\n').filter(Boolean);
  const invHeader = invLines[0].split(',');
  assert.equal(invHeader[0], 'SKU');
  assert.equal(invHeader[1], 'Product Name');
  assert.equal(invHeader[7], 'Total Cost Valuation (₹)');
  assert.equal(invHeader[8], 'Stock Status');
  // Check row 1 (low stock / out-of-stock prioritized)
  const invRow1 = invLines[1].split(',');
  assert.equal(invRow1.length, invHeader.length); // EXACT MATCH
  assert.equal(invRow1[0], 'SKU-INV-2');
  assert.equal(invRow1[1], 'Inverter 5kW');
  assert.equal(invRow1[3], '0'); // stock
  assert.equal(invRow1[7], '0'); // 0 * 45000

  // Check row 2
  const invRow2 = invLines[2].split(',');
  assert.equal(invRow2[0], 'SKU-INV-1');
  assert.equal(invRow2[3], '12');
  assert.equal(invRow2[7], '96000');

  // 2. Balances single-table test
  const balTabCsv = buildExecutiveReportCsv(report, 'Apex Solar', '₹', undefined, 'current_tab', 'balances');
  const balLines = balTabCsv.split('\n').filter(Boolean);
  const balHeader = balLines[0].split(',');
  assert.equal(balHeader[0], 'Account Name');
  assert.equal(balHeader[1], 'Phone Number');
  assert.equal(balHeader[2], 'Party Type');
  assert.equal(balHeader[3], 'Pending Balance (₹)');
  const balRow1 = balLines[1].split(',');
  assert.equal(balRow1.length, balHeader.length);
  assert.equal(balRow1[0], 'Solar Dist Co'); // Sorted by amount descending: 12000 > 5797 > 283
  assert.equal(balRow1[1], '9888888888');
  assert.equal(balRow1[2], 'Vendor Payable');
  assert.equal(balRow1[3], '12000');

  // 3. Executive Summary test
  const sumCsv = buildExecutiveReportCsv(report, 'Apex Solar', '₹', undefined, 'summary');
  assert.ok(sumCsv.includes('Executive Business Health & KPI Summary'));
  assert.ok(sumCsv.includes('Customer Udhaar Dues'));
  assert.ok(sumCsv.includes('Solar Panel 540W') === false); // Summary has KPIs, not raw SKU table

  // 4. Consolidated CSV column alignment test (ensuring no shifted headers!)
  const fullCsv = buildExecutiveReportCsv(report, 'Apex Solar', '₹', undefined, 'consolidated');
  assert.ok(fullCsv.includes('# SECTION: INVENTORY VALUATION'));
  // Find lines after INVENTORY VALUATION
  const fullLines = fullCsv.split('\n');
  const invSecIdx = fullLines.findIndex((l) => l.includes('# SECTION: INVENTORY VALUATION'));
  assert.ok(invSecIdx !== -1);
  const fullInvHeader = fullLines[invSecIdx + 1].split(',');
  assert.equal(fullInvHeader[0], 'SKU');
  assert.equal(fullInvHeader[1], 'Product Name');
  const fullInvRow1 = fullLines[invSecIdx + 2].split(',');
  assert.equal(fullInvRow1.length, fullInvHeader.length);
  assert.equal(fullInvRow1[0], 'SKU-INV-2');
  assert.equal(fullInvRow1[1], 'Inverter 5kW');
});
