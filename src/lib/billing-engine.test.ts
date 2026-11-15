import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PAYMENT_MODES,
  buildSplitBillItemsForBucket,
  calculateBillingTotals,
  computeEqualSplitShares,
  filterBillingCustomers,
  filterCatalogProducts,
  findBestCouponOffer,
  formatSplitPaymentSummary,
  getItemAllocationStatus,
  resolvePaymentModesFromSettings,
  sumSplitPayments,
} from './billing-engine';

test('calculateBillingTotals handles exclusive & inclusive GST, discounts, coupons, and due amount', () => {
  const exclusive = calculateBillingTotals({
    items: [
      { id: '1', productId: 'p1', name: 'Solar Cable', quantity: 2, price: 1000, gstRate: 18, stock: 10, itemDiscount: 10 },
    ],
    appliedCoupons: [{ id: 'c1', code: 'SAVE100', type: 'fixed', value: 100 }],
    manualDiscount: 24,
    advanceAmount: 100,
    paidAmount: '1500',
    isInterState: false,
    gstMode: 'exclusive',
  });

  assert.equal(exclusive.itemTotal, 1800);
  assert.equal(exclusive.cgst, 162);
  assert.equal(exclusive.sgst, 162);
  assert.equal(exclusive.grossSubtotal, 2124);
  assert.equal(exclusive.finalPayout, 1900);
  assert.equal(exclusive.dueAmount, 400);
  assert.equal(exclusive.changeReturn, 0);
  assert.equal(exclusive.paymentStatus, 'PARTIALLY_PAID');

  const inclusive = calculateBillingTotals({
    items: [
      { id: '2', productId: 'p2', name: 'Inverter', quantity: 1, price: 11800, gstRate: 18, stock: 5, itemDiscount: 0 },
    ],
    appliedCoupons: [],
    paidAmount: '12000',
    isInterState: true,
    gstMode: 'inclusive',
  });

  assert.equal(inclusive.itemTotal, 10000);
  assert.equal(inclusive.igst, 1800);
  assert.equal(inclusive.finalPayout, 11800);
  assert.equal(inclusive.changeReturn, 200);
  assert.equal(inclusive.paymentStatus, 'PAID');
});

test('calculateBillingTotals accurately sums Split Payment modes and computes partial udhaar', () => {
  const splitTotals = calculateBillingTotals({
    items: [
      { id: '1', productId: 'p1', name: 'Battery', quantity: 1, price: 2500, gstRate: 0, stock: 5, itemDiscount: 0 },
    ],
    appliedCoupons: [],
    isSplitPayment: true,
    splitPayments: [
      { id: 's1', mode: 'Cash', amount: '1000' },
      { id: 's2', mode: 'UPI', amount: '1200' },
    ],
    isInterState: false,
    gstMode: 'inclusive',
  });

  assert.equal(splitTotals.finalPayout, 2500);
  assert.equal(splitTotals.collected, 2200);
  assert.equal(splitTotals.dueAmount, 300);
  assert.equal(splitTotals.paymentStatus, 'PARTIALLY_PAID');
  assert.equal(sumSplitPayments([{ id: 's1', mode: 'Cash', amount: '1000' }, { id: 's2', mode: 'UPI', amount: '1200' }]), 2200);
  assert.equal(
    formatSplitPaymentSummary([{ mode: 'Cash', amount: 1000 }, { mode: 'UPI', amount: 1200 }], '₹'),
    'Cash: ₹1,000 · UPI: ₹1,200'
  );
});

test('computeEqualSplitShares and item-wise bill splitting preserve exact totals', () => {
  const shares = computeEqualSplitShares(1000, 3);
  assert.deepEqual(shares, [334, 333, 333]);
  assert.equal(shares.reduce((a, b) => a + b, 0), 1000);

  const items = [
    { id: 'i1', productId: 'p1', name: 'Item A', quantity: 3, price: 100, gstRate: 0, stock: 10, itemDiscount: 0 },
    { id: 'i2', productId: 'p2', name: 'Item B', quantity: 2, price: 250, gstRate: 0, stock: 10, itemDiscount: 0 },
  ];
  const allocations = {
    i1: [2, 1],
    i2: [0, 2],
  };

  assert.equal(getItemAllocationStatus(3, allocations.i1).isComplete, true);
  assert.equal(getItemAllocationStatus(3, [1, 1]).remaining, 1);

  const bill1Items = buildSplitBillItemsForBucket(items, allocations, 0);
  const bill2Items = buildSplitBillItemsForBucket(items, allocations, 1);

  assert.equal(bill1Items.length, 1);
  assert.equal(bill1Items[0].quantity, 2);
  assert.equal(bill2Items.length, 2);
  assert.equal(bill2Items[1].quantity, 2);
});

test('calculateBillingTotals supports Reward Sync zero-tax manual override', () => {
  const syncTotals = calculateBillingTotals({
    items: [],
    manualAmount: '2500',
    isRewardSyncMode: true,
    appliedCoupons: [{ id: 'c1', code: 'VIP10', type: 'percentage', value: 10, maxDiscount: 200 }],
    isInterState: false,
  });

  assert.equal(syncTotals.grossSubtotal, 2500);
  assert.equal(syncTotals.taxTotal, 0);
  assert.equal(syncTotals.couponApplied, 200);
  assert.equal(syncTotals.finalPayout, 2300);
});

test('findBestCouponOffer selects highest savings eligible coupon or closest unlock hint', () => {
  const coupons = [
    { id: '1', code: 'FLAT100', type: 'fixed', value: 100, minOrder: 500, status: 'active', perUserLimit: 1 },
    { id: '2', code: 'MEGA20', type: 'percentage', value: 20, maxDiscount: 400, minOrder: 1000, status: 'active', perUserLimit: 1 },
    { id: '3', code: 'BIG500', type: 'fixed', value: 500, minOrder: 2500, status: 'active', perUserLimit: 1 },
  ];

  const best = findBestCouponOffer(coupons, [], 1500, []);
  assert.equal(best?.type, 'best');
  assert.equal(best?.coupon.code, 'MEGA20');
  assert.equal(best?.estimatedSavings, 300);

  const near = findBestCouponOffer([coupons[2]], [], 2200, []);
  assert.equal(near?.type, 'near');
  assert.equal(near?.coupon.code, 'BIG500');
  assert.equal(near?.amountNeeded, 300);
});

test('filterCatalogProducts and filterBillingCustomers exclude archived entries and match SKU/phone', () => {
  const products = [
    { id: 'p1', name: 'Solar Panel 540W', sku: 'SP-540', category: 'Panels', isArchived: false },
    { id: 'p2', name: 'Old Wire', sku: 'OW-1', category: 'Cables', isArchived: true },
  ];
  assert.equal(filterCatalogProducts(products, 'sp-540').length, 1);
  assert.equal(filterCatalogProducts(products, '', 'Cables').length, 0);

  const customers = [
    { id: 'c1', name: 'Aarav', phone: '9876543210', isArchived: false },
    { id: 'c2', name: 'Vikram', phone: '9123456789', isArchived: false },
  ];
  const memberships = [{ id: 'm1', customerId: 'c1', status: 'active' }];
  assert.equal(filterBillingCustomers(customers, memberships, '9876', true).length, 1);
  assert.equal(filterBillingCustomers(customers, memberships, 'Vikram', true).length, 0);
  assert.equal(filterBillingCustomers(customers, memberships, 'Vikram', false).length, 1);
});

test('resolvePaymentModesFromSettings normalizes OS Settings modes and falls back safely', () => {
  assert.deepEqual(resolvePaymentModesFromSettings(undefined), [...DEFAULT_PAYMENT_MODES]);
  assert.deepEqual(resolvePaymentModesFromSettings([]), [...DEFAULT_PAYMENT_MODES]);
  assert.deepEqual(resolvePaymentModesFromSettings(['  ', '']), [...DEFAULT_PAYMENT_MODES]);
  assert.deepEqual(
    resolvePaymentModesFromSettings([' PhonePe ', 'NEFT', 'phonepe', 'Cash']),
    ['PhonePe', 'NEFT', 'Cash']
  );
});
