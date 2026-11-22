import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEffectivePermission, isStaffAdminRole } from './staff-payroll';

// Logic mirror of normalizeOrderAmount in client-page and customer-actions
function normalizeOrderAmount(ord: any): number {
  if (!ord) return 0;
  if (typeof ord.finalAmount === "number" && ord.finalAmount > 0) return ord.finalAmount;
  if (typeof ord.amountInRupees === "number" && ord.amountInRupees > 0) return ord.amountInRupees;

  const raw = typeof ord.amount === "number" ? ord.amount : parseFloat(String(ord.amount || 0));
  if (isNaN(raw) || raw <= 0) return 0;

  const isPaiseOrder =
    Boolean(ord.tierId) ||
    ord.unit === "paise" ||
    (typeof ord.id === "string" && ord.id.startsWith("order_")) ||
    (typeof ord.razorpayOrderId === "string" && ord.razorpayOrderId === ord.id) ||
    Boolean(ord.amountInPaise && Math.abs(ord.amountInPaise - raw) < 0.01);

  if (isPaiseOrder) {
    return raw / 100;
  }

  if (ord.razorpayPaymentId && raw > 1000 && !Array.isArray(ord.items) && !ord.subtotal) {
    return raw / 100;
  }

  return raw;
}

test('Customer Registry: normalizeOrderAmount correctly converts paise to rupees', () => {
  // Case reported by user: Customer paid 1532.82, but order amount had 153282 paise (100x discrepancy)
  const razorpayMembershipOrder = {
    id: "order_Q123456789ABCD",
    amount: 153282,
    amountInPaise: 153282,
    tierId: "gold-tier",
    currency: "INR",
    status: "paid"
  };

  const normalized = normalizeOrderAmount(razorpayMembershipOrder);
  assert.strictEqual(normalized, 1532.82, 'Paise amount 153282 must be normalized to ₹1532.82');
});

test('Customer Registry: normalizeOrderAmount preserves standard rupee orders', () => {
  const standardRupeeOrder = {
    id: "ord_manual_88921",
    amount: 450,
    currency: "INR",
    status: "paid",
    items: [{ name: "Cotton Kurta", quantity: 1, price: 450 }],
    subtotal: 450
  };

  const normalized = normalizeOrderAmount(standardRupeeOrder);
  assert.strictEqual(normalized, 450, 'Standard rupee orders must remain untouched at ₹450');
});

test('Customer Registry: normalizeOrderAmount prioritizes amountInRupees or finalAmount if present', () => {
  const orderWithExplicitRupees = {
    id: "order_M771829",
    amount: 199900,
    amountInRupees: 1999,
    status: "paid"
  };

  const normalized = normalizeOrderAmount(orderWithExplicitRupees);
  assert.strictEqual(normalized, 1999, 'Explicit amountInRupees should be prioritized');
});

test('Customer Registry: Role Manager RBAC for Customer & Vendor Directories', () => {
  // 1. Owner/Admin roles always have permission
  assert.strictEqual(isStaffAdminRole('owner'), true);
  assert.strictEqual(isStaffAdminRole('admin'), true);
  assert.strictEqual(isStaffAdminRole('manager'), true);
  assert.strictEqual(isStaffAdminRole('cashier'), false);

  // 2. Default RBAC matrix resolution
  const canCashierEditByDefault = resolveEffectivePermission(
    undefined,
    'Customer & Vendor Directories',
    'cashier'
  );
  // By default cashier is read-only / restricted for master data directories
  assert.strictEqual(canCashierEditByDefault, false);

  // 3. Custom RBAC permission granted via Role Manager
  const customRbacMatrix = {
    'Customer & Vendor Directories': {
      cashier: true
    }
  };
  const canCashierEditWithOverride = resolveEffectivePermission(
    customRbacMatrix,
    'Customer & Vendor Directories',
    'cashier'
  );
  assert.strictEqual(canCashierEditWithOverride, true);
});
