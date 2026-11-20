import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEarnedLoyaltyPoints,
  calculatePointsRedemption,
  determineEligibleTier,
  generateLoyaltyCardNumber,
  calculateMembershipExpiryDate,
  validateLoyaltyCoupon,
  LoyaltyTierDefinition,
} from './loyalty-rewards';

test('calculateEarnedLoyaltyPoints computes points with tier multipliers', () => {
  // ₹2,500 bill, standard 1 pt per ₹100 = 25 pts (1x multiplier)
  assert.equal(calculateEarnedLoyaltyPoints(2500, 1), 25);

  // ₹2,500 bill, Gold tier (1.2x multiplier) = 25 * 1.2 = 30 pts
  assert.equal(calculateEarnedLoyaltyPoints(2500, 1.2), 30);

  // ₹5,000 bill, Platinum tier (1.5x multiplier) = 50 * 1.5 = 75 pts
  assert.equal(calculateEarnedLoyaltyPoints(5000, 1.5), 75);

  // ₹50 bill (below ₹100 earn threshold)
  assert.equal(calculateEarnedLoyaltyPoints(50, 1), 0);

  // 0 / negative bill
  assert.equal(calculateEarnedLoyaltyPoints(0, 1), 0);
  assert.equal(calculateEarnedLoyaltyPoints(-500, 1), 0);
});

test('calculatePointsRedemption handles caps and remaining points accurately', () => {
  // Bill: ₹1,000, wants to redeem 300 pts, has 500 pts. 50% cap = ₹500 max.
  // 300 pts = ₹300 discount. Remaining = 200 pts.
  const res1 = calculatePointsRedemption(300, 500, 1000);
  assert.equal(res1.pointsRedeemed, 300);
  assert.equal(res1.discountAmount, 300);
  assert.equal(res1.remainingPoints, 200);

  // Bill: ₹400, wants to redeem 300 pts. Max 50% cap = ₹200.
  // Actual points used = 200. Remaining = 500 - 200 = 300.
  const res2 = calculatePointsRedemption(300, 500, 400);
  assert.equal(res2.pointsRedeemed, 200);
  assert.equal(res2.discountAmount, 200);
  assert.equal(res2.remainingPoints, 300);

  // Edge cases: 0 points or 0 bill
  const res3 = calculatePointsRedemption(0, 100, 500);
  assert.equal(res3.discountAmount, 0);
});

test('determineEligibleTier evaluates spend brackets correctly', () => {
  const tiers: LoyaltyTierDefinition[] = [
    { id: 'silver', name: 'Silver', minSpend: 0, pointsMultiplier: 1, cashbackPercent: 0, status: 'active' },
    { id: 'gold', name: 'Gold', minSpend: 5000, pointsMultiplier: 1.2, cashbackPercent: 1, status: 'active' },
    { id: 'platinum', name: 'Platinum', minSpend: 15000, pointsMultiplier: 1.5, cashbackPercent: 2, status: 'active' },
    { id: 'vip', name: 'VIP', minSpend: 50000, pointsMultiplier: 2, cashbackPercent: 5, status: 'active' },
  ];

  // Spend ₹1,200 -> Silver
  assert.equal(determineEligibleTier(1200, tiers)?.name, 'Silver');

  // Spend ₹7,500 -> Gold
  assert.equal(determineEligibleTier(7500, tiers)?.name, 'Gold');

  // Spend ₹25,000 -> Platinum
  assert.equal(determineEligibleTier(25000, tiers)?.name, 'Platinum');

  // Spend ₹80,000 -> VIP
  assert.equal(determineEligibleTier(80000, tiers)?.name, 'VIP');
});

test('generateLoyaltyCardNumber generates sequential format', () => {
  const card = generateLoyaltyCardNumber('BIZ', 'GOLD', 2026, 42);
  assert.equal(card, 'BIZ-GOLD-2026-0042');

  const cardDefault = generateLoyaltyCardNumber();
  assert.ok(cardDefault.startsWith('BIZ-STD-'));
});

test('calculateMembershipExpiryDate supports Lifetime and Yearly plans', () => {
  // Lifetime
  assert.equal(calculateMembershipExpiryDate('LIFETIME'), 'LIFETIME');

  // Yearly
  const start = new Date('2026-01-15T00:00:00.000Z');
  const expiry = calculateMembershipExpiryDate('YEARLY', start);
  assert.ok(expiry.includes('2027-01-15'));
});

test('validateLoyaltyCoupon checks status, expiry, minOrder, and discount calculation', () => {
  const coupon = {
    code: 'FESTIVE20',
    type: 'percentage' as const,
    value: 20,
    minOrder: 1000,
    maxDiscount: 300,
    status: 'active' as const,
    expiryDate: '2026-12-31T23:59:59.000Z',
  };

  // Eligible order: ₹1,200 -> 20% = ₹240 (below cap of 300)
  const valid = validateLoyaltyCoupon(coupon, 1200, new Date('2026-11-20'));
  assert.equal(valid.isValid, true);
  assert.equal(valid.discountAmount, 240);

  // Eligible order exceeding cap: ₹2,000 -> 20% = ₹400 -> capped at ₹300
  const capped = validateLoyaltyCoupon(coupon, 2000, new Date('2026-11-20'));
  assert.equal(capped.isValid, true);
  assert.equal(capped.discountAmount, 300);

  // Below minOrder: ₹800
  const under = validateLoyaltyCoupon(coupon, 800, new Date('2026-11-20'));
  assert.equal(under.isValid, false);
  assert.ok(under.reason?.includes('Minimum order'));

  // Expired coupon
  const expired = validateLoyaltyCoupon(coupon, 1500, new Date('2027-01-01'));
  assert.equal(expired.isValid, false);
  assert.ok(expired.reason?.includes('expired'));
});
