import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeWhatsAppPhone,
  matchKeywordTrigger,
  calculateCampaignMetrics,
  validateMetaTemplate,
  calculateCouponDiscount,
} from './growth-engine';

test('Growth Engine: WhatsApp Phone Normalization', () => {
  // 10-digit Indian numbers prepend '91'
  assert.equal(normalizeWhatsAppPhone('9876543210'), '919876543210');
  assert.equal(normalizeWhatsAppPhone(' 98765 43210 '), '919876543210');
  assert.equal(normalizeWhatsAppPhone('+91-98765-43210'), '919876543210');
  assert.equal(normalizeWhatsAppPhone('09876543210'), '919876543210');

  // International numbers
  assert.equal(normalizeWhatsAppPhone('+1 (555) 234-5678'), '15552345678');
  assert.equal(normalizeWhatsAppPhone('971501234567'), '971501234567');

  // Empty or invalid input
  assert.equal(normalizeWhatsAppPhone(''), '');
  assert.equal(normalizeWhatsAppPhone('abc'), '');
});

test('Growth Engine: Inbound Keyword Matching', () => {
  const keywords = 'price, rate, catalog, offer, discount';

  // Exact match
  assert.equal(matchKeywordTrigger('price', keywords, 'exact'), true);
  assert.equal(matchKeywordTrigger('PRICE', keywords, 'exact'), true);
  assert.equal(matchKeywordTrigger('what is the price', keywords, 'exact'), false);

  // Contains match
  assert.equal(matchKeywordTrigger('What is the price of this product?', keywords, 'contains'), true);
  assert.equal(matchKeywordTrigger('Bhai discount milega kya?', keywords, 'contains'), true);
  assert.equal(matchKeywordTrigger('Hello good morning', keywords, 'contains'), false);

  // Multiple whitespace and punctuation handling
  const multiKeywords = ' hi , hello , namaste ';
  assert.equal(matchKeywordTrigger('Namaste sir', multiKeywords, 'contains'), true);
  assert.equal(matchKeywordTrigger('hello', multiKeywords, 'exact'), true);
});

test('Growth Engine: Campaign Metrics Calculation', () => {
  const campaigns = [
    { id: 'c1', title: 'Diwali Mega Sale', recipientCount: 500, deliveredCount: 480, status: 'sent' },
    { id: 'c2', title: 'Weekend Flash Offer', recipientCount: 300, deliveredCount: 290, status: 'delivered' },
    { id: 'c3', title: 'Draft Campaign', recipientCount: 200, status: 'draft' },
  ];

  const metrics = calculateCampaignMetrics(campaigns);
  assert.equal(metrics.totalCampaigns, 3);
  assert.equal(metrics.totalRecipients, 1000);
  assert.equal(metrics.totalDelivered, 770);
  assert.equal(metrics.deliveryRate, 67); // 2 out of 3 = 67%

  // Empty list
  const emptyMetrics = calculateCampaignMetrics([]);
  assert.equal(emptyMetrics.totalCampaigns, 0);
  assert.equal(emptyMetrics.deliveryRate, 0);
});

test('Growth Engine: Meta Template Validation', () => {
  // Valid template
  const valid = validateMetaTemplate({
    name: 'festive_discount_2026',
    category: 'MARKETING',
    bodyText: 'Namaste {{1}}, enjoy {{2}}% off on all products! Visit: {{3}}',
    exampleValues: ['Ramesh', '20', 'https://biztrix.in'],
  });
  assert.equal(valid.isValid, true);
  assert.equal(valid.errors.length, 0);

  // Invalid: uppercase in name
  const invalidName = validateMetaTemplate({
    name: 'FestiveDiscount',
    category: 'MARKETING',
    bodyText: 'Hello customer',
  });
  assert.equal(invalidName.isValid, false);
  assert.ok(invalidName.errors.some((e) => e.includes('lowercase alphanumeric with underscores')));

  // Invalid: missing variable sample values
  const missingSamples = validateMetaTemplate({
    name: 'order_update',
    category: 'UTILITY',
    bodyText: 'Hello {{1}}, order {{2}} has been shipped! Tracking: {{3}}',
    exampleValues: ['Ramesh'], // Only 1 value provided for 3 placeholders
  });
  assert.equal(missingSamples.isValid, false);
  assert.ok(missingSamples.errors.some((e) => e.includes('only 1 sample value(s) provided')));
});

test('Growth Engine: Promotional Coupon Calculations', () => {
  // Percentage coupon with max cap
  const pctCoupon = {
    type: 'percentage' as const,
    value: 20, // 20%
    minOrder: 1000,
    maxDiscount: 300, // Capped at ₹300
    isActive: true,
  };

  // Order below minOrder
  const belowMin = calculateCouponDiscount(pctCoupon, 800);
  assert.equal(belowMin.eligible, false);
  assert.equal(belowMin.discountAmount, 0);

  // Order within range: 20% of 1200 = 240 (below cap)
  const normal = calculateCouponDiscount(pctCoupon, 1200);
  assert.equal(normal.eligible, true);
  assert.equal(normal.discountAmount, 240);
  assert.equal(normal.finalAmount, 960);

  // Order with cap hit: 20% of 2000 = 400 -> capped at 300
  const capped = calculateCouponDiscount(pctCoupon, 2000);
  assert.equal(capped.eligible, true);
  assert.equal(capped.discountAmount, 300);
  assert.equal(capped.finalAmount, 1700);

  // Flat amount coupon
  const flatCoupon = {
    type: 'fixed' as const,
    value: 150,
    minOrder: 500,
    isActive: true,
  };

  const flatResult = calculateCouponDiscount(flatCoupon, 600);
  assert.equal(flatResult.eligible, true);
  assert.equal(flatResult.discountAmount, 150);
  assert.equal(flatResult.finalAmount, 450);

  // Inactive coupon
  const inactiveResult = calculateCouponDiscount({ ...flatCoupon, isActive: false }, 600);
  assert.equal(inactiveResult.eligible, false);
});
