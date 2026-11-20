/**
 * @fileOverview Loyalty & Rewards Engine.
 * Provides standardized points calculation, tier qualification, digital card numbering,
 * coupon discount validation, and wallet redemption logic.
 */

export interface LoyaltyTierDefinition {
  id: string;
  name: string;
  minSpend: number;
  pointsMultiplier: number;
  cashbackPercent: number;
  color?: string;
  status: string;
  benefits?: string[];
  linkedCouponIds?: string[];
  gstRate?: number;
}

export interface LoyaltyCouponDefinition {
  id?: string;
  code: string;
  type: 'percentage' | 'fixed' | 'bogo' | 'wallet';
  value: number;
  minOrder?: number;
  maxDiscount?: number;
  status: 'active' | 'inactive' | 'expired';
  expiryDate?: string;
  usageLimit?: number;
  usedCount?: number;
}

/**
 * Calculates reward points earned from a purchase bill.
 * Standard default: 1 point earned per ₹100 spent, multiplied by Tier Multiplier.
 */
export function calculateEarnedLoyaltyPoints(
  billAmount: number,
  pointsMultiplier = 1,
  spendPerPoint = 100
): number {
  if (billAmount <= 0 || spendPerPoint <= 0) return 0;
  const basePoints = Math.floor(billAmount / spendPerPoint);
  const multiplier = Math.max(0.1, pointsMultiplier);
  return Math.floor(basePoints * multiplier);
}

/**
 * Calculates discount value from redeemed points.
 * Standard default: 1 point = ₹1, or custom pointValue.
 * Also enforces optional maxRedeemPercent cap (e.g. max 50% of bill amount).
 */
export function calculatePointsRedemption(
  pointsToRedeem: number,
  availablePoints: number,
  billAmount: number,
  pointValue = 1,
  maxBillDiscountPercent = 50
): {
  pointsRedeemed: number;
  discountAmount: number;
  remainingPoints: number;
  error?: string;
} {
  if (pointsToRedeem <= 0 || availablePoints <= 0 || billAmount <= 0) {
    return { pointsRedeemed: 0, discountAmount: 0, remainingPoints: availablePoints };
  }

  // Cap points to available points
  const pointsEligible = Math.min(pointsToRedeem, availablePoints);
  const rawDiscount = pointsEligible * pointValue;

  // Cap discount to max allowed percentage of bill
  const maxDiscountAllowed = (billAmount * maxBillDiscountPercent) / 100;
  const finalDiscount = Math.min(rawDiscount, maxDiscountAllowed);

  // Recalculate actual points used based on final discount
  const actualPointsUsed = Math.ceil(finalDiscount / pointValue);

  return {
    pointsRedeemed: actualPointsUsed,
    discountAmount: Math.round(finalDiscount * 100) / 100,
    remainingPoints: Math.max(0, availablePoints - actualPointsUsed),
  };
}

/**
 * Determines the eligible loyalty tier based on cumulative customer spending.
 */
export function determineEligibleTier(
  cumulativeSpend: number,
  tiers: LoyaltyTierDefinition[]
): LoyaltyTierDefinition | null {
  if (!Array.isArray(tiers) || tiers.length === 0) return null;

  const activeTiers = tiers
    .filter((t) => t.status === 'active')
    .sort((a, b) => b.minSpend - a.minSpend);

  const matched = activeTiers.find((t) => cumulativeSpend >= t.minSpend);
  return matched || activeTiers[activeTiers.length - 1] || null;
}

/**
 * Generates standard formatted digital membership card number.
 * e.g. "BIZ-GOLD-2026-0042"
 */
export function generateLoyaltyCardNumber(
  prefix = 'BIZ',
  tierName = 'STD',
  year: number = new Date().getFullYear(),
  sequence = 1
): string {
  const cleanPrefix = (prefix || 'BIZ').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanTier = (tierName || 'STD').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const seqPadded = String(Math.max(1, sequence)).padStart(4, '0');
  return `${cleanPrefix}-${cleanTier}-${year}-${seqPadded}`;
}

/**
 * Computes membership expiry string based on tier validity plan.
 */
export function calculateMembershipExpiryDate(
  planType: 'YEARLY' | 'LIFETIME' | 'CUSTOM_MONTHS' | string,
  startDate: Date = new Date(),
  customMonths = 12
): string {
  const normalized = String(planType || '').toUpperCase();
  if (normalized.includes('LIFETIME')) {
    return 'LIFETIME';
  }

  const expiry = new Date(startDate);
  if (normalized.includes('YEARLY')) {
    expiry.setFullYear(expiry.getFullYear() + 1);
  } else {
    expiry.setMonth(expiry.getMonth() + (Number(customMonths) || 12));
  }

  return expiry.toISOString();
}

/**
 * Validates coupon application against bill amount, usage limit, and expiry.
 */
export function validateLoyaltyCoupon(
  coupon: LoyaltyCouponDefinition,
  billAmount: number,
  now: Date = new Date()
): {
  isValid: boolean;
  discountAmount: number;
  reason?: string;
} {
  if (!coupon) {
    return { isValid: false, discountAmount: 0, reason: 'Coupon not found.' };
  }
  if (coupon.status !== 'active') {
    return { isValid: false, discountAmount: 0, reason: 'This coupon is not active.' };
  }
  if (coupon.expiryDate) {
    const exp = new Date(coupon.expiryDate);
    if (!isNaN(exp.getTime()) && now > exp) {
      return { isValid: false, discountAmount: 0, reason: 'This coupon has expired.' };
    }
  }
  if (typeof coupon.usageLimit === 'number' && typeof coupon.usedCount === 'number') {
    if (coupon.usedCount >= coupon.usageLimit) {
      return { isValid: false, discountAmount: 0, reason: 'Coupon usage limit has been reached.' };
    }
  }
  if (typeof coupon.minOrder === 'number' && billAmount < coupon.minOrder) {
    return {
      isValid: false,
      discountAmount: 0,
      reason: `Minimum order of ₹${coupon.minOrder} required (current: ₹${billAmount}).`,
    };
  }

  let discount = 0;
  if (coupon.type === 'percentage') {
    const rawDiscount = (billAmount * Number(coupon.value || 0)) / 100;
    discount = typeof coupon.maxDiscount === 'number' && coupon.maxDiscount > 0
      ? Math.min(rawDiscount, coupon.maxDiscount)
      : rawDiscount;
  } else if (coupon.type === 'fixed' || coupon.type === 'wallet') {
    discount = Math.min(billAmount, Number(coupon.value || 0));
  }

  return {
    isValid: true,
    discountAmount: Math.round(discount * 100) / 100,
  };
}
