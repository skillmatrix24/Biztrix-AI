import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExecutiveReportCsv,
  computeExecutiveReport,
  isDateInReportRange,
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
      solarInquiries: [{ id: 'si1' }],
      solarInstallations: [{ id: 'sn1' }],
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

  const csv = buildExecutiveReportCsv(report, 'Biztrix Store', '₹');
  assert.ok(csv.includes('Biztrix Store'));
  assert.ok(csv.includes('Billing & Store Orders'));
  assert.ok(csv.includes('POS Bill #1'));
});
