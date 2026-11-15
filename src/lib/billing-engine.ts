import { calculateGST } from './mock-db';

export interface BillingLineItem {
  id: string;
  productId: string;
  name: string;
  hsnCode?: string;
  quantity: number;
  price: number;
  gstRate: number;
  stock: number;
  itemDiscount: number;
  originalPrice?: number;
  rateChangeReason?: string;
}

export interface SplitPaymentEntry {
  id: string;
  mode: string;
  amount: string;
  note?: string;
}

export interface BillingTotalsInput {
  items: BillingLineItem[];
  manualAmount?: string | number;
  manualGstRate?: string | number;
  exemptAmount?: string | number;
  advanceAmount?: string | number;
  manualDiscount?: number;
  appliedCoupons: any[];
  paidAmount?: string | number;
  isSplitPayment?: boolean;
  splitPayments?: SplitPaymentEntry[];
  isInterState: boolean;
  gstMode?: 'inclusive' | 'exclusive';
  isRewardSyncMode?: boolean;
  discountPriority?: 'percentage_first' | 'flat_first' | string;
  couponOverrides?: Record<string, number>;
}

export interface BillingTotalsOutput {
  itemTotal: number;
  taxTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  grossSubtotal: number;
  exemptApplied: number;
  advanceApplied: number;
  manualDiscountApplied: number;
  couponApplied: number;
  finalPayout: number;
  collected: number;
  changeReturn: number;
  dueAmount: number;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  qty: number;
  isOverridden: boolean;
  isInterState: boolean;
}

export interface BestCouponOffer {
  type: 'best' | 'near';
  coupon: any;
  estimatedSavings?: number;
  amountNeeded?: number;
}

export const DEFAULT_PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Bank Transfer'] as const;

export function resolvePaymentModesFromSettings(rawModes?: unknown): string[] {
  if (!Array.isArray(rawModes)) {
    return [...DEFAULT_PAYMENT_MODES];
  }

  const seen = new Set<string>();
  const resolved: string[] = [];

  for (const entry of rawModes) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    resolved.push(trimmed);
  }

  return resolved.length > 0 ? resolved : [...DEFAULT_PAYMENT_MODES];
}

function parseSafeNum(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function sumSplitPayments(entries: SplitPaymentEntry[] = []): number {
  return entries.reduce((sum, entry) => sum + Math.max(0, parseSafeNum(entry.amount, 0)), 0);
}

export function formatSplitPaymentSummary(
  entries: Array<{ mode: string; amount: number | string }>,
  currencySymbol = '₹'
): string {
  const valid = entries
    .map((e) => ({ mode: e.mode, amt: Math.max(0, parseSafeNum(e.amount, 0)) }))
    .filter((e) => e.amt > 0);
  if (valid.length === 0) return '';
  return valid
    .map((e) => `${e.mode}: ${currencySymbol}${e.amt.toLocaleString('en-IN')}`)
    .join(' · ');
}

export function computeEqualSplitShares(totalAmount: number, partCount: number): number[] {
  const count = Math.max(2, Math.min(10, Math.floor(partCount)));
  const cleanTotal = Math.max(0, Math.round(totalAmount));
  const baseShare = Math.floor(cleanTotal / count);
  const remainder = cleanTotal - baseShare * count;
  return Array.from({ length: count }, (_, idx) => baseShare + (idx < remainder ? 1 : 0));
}

export interface ItemAllocationCheck {
  totalAllocated: number;
  remaining: number;
  isComplete: boolean;
}

export function getItemAllocationStatus(
  itemQty: number,
  allocationsForItem: number[]
): ItemAllocationCheck {
  const totalAllocated = allocationsForItem.reduce(
    (sum, q) => sum + Math.max(0, Math.floor(Number(q) || 0)),
    0
  );
  const remaining = itemQty - totalAllocated;
  return {
    totalAllocated,
    remaining,
    isComplete: remaining === 0,
  };
}

export function buildSplitBillItemsForBucket(
  items: BillingLineItem[],
  allocationsByItemId: Record<string, number[]>,
  bucketIndex: number
): BillingLineItem[] {
  const bucketItems: BillingLineItem[] = [];
  for (const item of items) {
    const qty = Math.max(0, Math.floor(allocationsByItemId[item.id]?.[bucketIndex] || 0));
    if (qty > 0) {
      bucketItems.push({
        ...item,
        id: `${item.id}_s${bucketIndex}`,
        quantity: qty,
      });
    }
  }
  return bucketItems;
}

export function calculateBillingTotals(input: BillingTotalsInput): BillingTotalsOutput {
  const {
    items,
    manualAmount = '',
    manualGstRate = '18',
    exemptAmount = '',
    advanceAmount = '',
    manualDiscount = 0,
    appliedCoupons = [],
    paidAmount = '',
    isSplitPayment = false,
    splitPayments = [],
    isInterState,
    gstMode = 'exclusive',
    isRewardSyncMode = false,
    discountPriority = 'percentage_first',
    couponOverrides = {},
  } = input;

  let itemTotal = 0;
  let taxTotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let qtyCount = 0;

  for (const item of items) {
    const discountedPrice = item.price * (1 - (item.itemDiscount || 0) / 100);
    const lineAmount = discountedPrice * item.quantity;
    const gstData = calculateGST(lineAmount, item.gstRate || 0, isInterState, gstMode);
    itemTotal += gstData.baseAmount;
    taxTotal += gstData.gstAmount;
    cgst += gstData.cgst;
    sgst += gstData.sgst;
    igst += gstData.igst;
    qtyCount += item.quantity;
  }

  const parsedManual = parseSafeNum(manualAmount, NaN);
  const hasManualOverride = !Number.isNaN(parsedManual) && String(manualAmount).trim() !== '';

  const grossSubtotal =
    isRewardSyncMode && hasManualOverride ? Math.max(0, parsedManual) : itemTotal + taxTotal;
  let workingTotal = hasManualOverride ? Math.max(0, parsedManual) : grossSubtotal;
  const isOverridden = hasManualOverride;

  if (isOverridden) {
    if (isRewardSyncMode) {
      taxTotal = 0;
      cgst = 0;
      sgst = 0;
      igst = 0;
      itemTotal = workingTotal;
    } else {
      const overrideTax = calculateGST(
        workingTotal,
        Math.max(0, parseSafeNum(manualGstRate, 0)),
        isInterState,
        gstMode
      );
      taxTotal = overrideTax.gstAmount;
      cgst = overrideTax.cgst;
      sgst = overrideTax.sgst;
      igst = overrideTax.igst;
      itemTotal = overrideTax.baseAmount;
      workingTotal = overrideTax.lineTotal;
    }
  }

  const exempt = Math.min(workingTotal, Math.max(0, parseSafeNum(exemptAmount, 0)));
  workingTotal -= exempt;

  const manualDisc = Math.min(workingTotal, Math.max(0, manualDiscount || 0));
  workingTotal -= manualDisc;

  const percentageCoupons = appliedCoupons.filter((c) => c.type === 'percentage');
  const flatCoupons = appliedCoupons.filter(
    (c) => c.type === 'fixed' || c.type === 'bogo' || c.type === 'wallet'
  );

  const applyPercentage = (currentVal: number) =>
    percentageCoupons.reduce((sum, c) => {
      if (couponOverrides[c.code] !== undefined) {
        return sum + Math.max(0, couponOverrides[c.code]);
      }
      const maxCap = c.maxDiscount ? Number(c.maxDiscount) : Infinity;
      const val = Math.min(currentVal * (Number(c.value || 0) / 100), maxCap);
      return sum + Math.max(0, val);
    }, 0);

  const applyFlat = () =>
    flatCoupons.reduce((sum, c) => {
      if (couponOverrides[c.code] !== undefined) {
        return sum + Math.max(0, couponOverrides[c.code]);
      }
      return sum + (c.type === 'bogo' || c.type === 'wallet' ? 0 : Math.max(0, Number(c.value || 0)));
    }, 0);

  let couponDisc = 0;
  if (discountPriority === 'percentage_first') {
    couponDisc += applyPercentage(workingTotal);
    couponDisc += applyFlat();
  } else {
    const fDisc = applyFlat();
    couponDisc += fDisc;
    couponDisc += applyPercentage(Math.max(0, workingTotal - fDisc));
  }

  couponDisc = Math.min(workingTotal, couponDisc);
  workingTotal -= couponDisc;

  const adv = Math.min(workingTotal, Math.max(0, parseSafeNum(advanceAmount, 0)));
  workingTotal -= adv;

  const finalPayout = Math.max(0, Math.round(workingTotal));
  const collected = isSplitPayment
    ? sumSplitPayments(splitPayments)
    : Math.max(0, parseSafeNum(paidAmount, 0));
  const changeReturn = collected > finalPayout ? collected - finalPayout : 0;
  const dueAmount = collected < finalPayout ? finalPayout - collected : 0;

  let paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' = 'UNPAID';
  if (collected > 0) {
    paymentStatus = collected >= finalPayout ? 'PAID' : 'PARTIALLY_PAID';
  }

  return {
    itemTotal: Number(itemTotal.toFixed(2)),
    taxTotal: Number(taxTotal.toFixed(2)),
    cgst: Number(cgst.toFixed(2)),
    sgst: Number(sgst.toFixed(2)),
    igst: Number(igst.toFixed(2)),
    grossSubtotal: Number(grossSubtotal.toFixed(2)),
    exemptApplied: Number(exempt.toFixed(2)),
    advanceApplied: Number(adv.toFixed(2)),
    manualDiscountApplied: Number(manualDisc.toFixed(2)),
    couponApplied: Number(couponDisc.toFixed(2)),
    finalPayout,
    collected,
    changeReturn,
    dueAmount,
    paymentStatus,
    qty: qtyCount,
    isOverridden,
    isInterState,
  };
}

export function findBestCouponOffer(
  memberCoupons: any[],
  activities: any[],
  grossSubtotal: number,
  appliedCoupons: any[] = []
): BestCouponOffer | null {
  if (!memberCoupons || memberCoupons.length === 0 || grossSubtotal <= 0) return null;

  let bestEligible: { coupon: any; savings: number } | null = null;
  let closestNear: { coupon: any; needed: number } | null = null;

  for (const coupon of memberCoupons) {
    if (coupon.status && coupon.status !== 'active') continue;
    if (coupon.usageLimit > 0 && (coupon.usageCount || 0) >= coupon.usageLimit) continue;

    const userRedemptions = (activities || []).filter(
      (a) => a.type === 'coupon_redeem' && (a.couponCode === coupon.code || a.couponId === coupon.id)
    ).length;
    if (userRedemptions >= (coupon.perUserLimit || 1)) continue;

    const minOrder = Number(coupon.minOrder || 0);
    if (grossSubtotal >= minOrder) {
      let savings = 0;
      if (coupon.type === 'percentage') {
        savings = Math.min(
          grossSubtotal * (Number(coupon.value || 0) / 100),
          coupon.maxDiscount ? Number(coupon.maxDiscount) : Infinity
        );
      } else if (coupon.type === 'fixed') {
        savings = Math.min(grossSubtotal, Number(coupon.value || 0));
      }
      if (savings > 0 && (!bestEligible || savings > bestEligible.savings)) {
        bestEligible = { coupon, savings: Math.round(savings) };
      }
    } else {
      const needed = Math.ceil(minOrder - grossSubtotal);
      if (needed > 0 && (!closestNear || needed < closestNear.needed)) {
        closestNear = { coupon, needed };
      }
    }
  }

  if (bestEligible) {
    const alreadyApplied = appliedCoupons.some(
      (c) => c.id === bestEligible!.coupon.id || c.code === bestEligible!.coupon.code
    );
    if (!alreadyApplied) {
      return {
        type: 'best',
        coupon: bestEligible.coupon,
        estimatedSavings: bestEligible.savings,
      };
    }
  }

  if (closestNear && closestNear.needed <= Math.max(500, grossSubtotal * 0.5)) {
    return {
      type: 'near',
      coupon: closestNear.coupon,
      amountNeeded: closestNear.needed,
    };
  }

  return null;
}

export function filterCatalogProducts(
  products: any[],
  search: string,
  category = 'ALL'
): any[] {
  const q = search.trim().toLowerCase();
  return (products || []).filter((p) => {
    if (p?.isArchived) return false;
    if (category !== 'ALL' && (p?.category || 'General') !== category) return false;
    if (!q) return true;
    const haystack = `${p?.name || ''} ${p?.sku || ''} ${p?.barcode || ''} ${p?.hsnCode || ''}`.toLowerCase();
    return haystack.includes(q);
  });
}

export function filterBillingCustomers(
  customers: any[],
  memberships: any[],
  search: string,
  isRewardSyncMode: boolean
): any[] {
  const q = search.trim().toLowerCase();
  return (customers || []).filter((c) => {
    if (c?.isArchived) return false;
    if (isRewardSyncMode) {
      const isMember = (memberships || []).some(
        (m) => m.customerId === c.id && m.status === 'active'
      );
      if (!isMember) return false;
    }
    if (!q) return true;
    const haystack = `${c?.name || ''} ${c?.phone || ''} ${c?.gstin || ''}`.toLowerCase();
    return haystack.includes(q);
  });
}
