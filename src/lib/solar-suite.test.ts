import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDcCapacityFromBOM,
  computeDcAcRatio,
  calculateEstimatedSolarYield,
  calculateSolarQuotationTotals,
  getInstallationProgress,
  validateInquiryForSurvey,
  validateSurveyForDesign,
  validateDesignForQuotation,
  validateQuotationForInstallation,
} from './solar-suite';

test('calculateDcCapacityFromBOM accurately parses panel wattage and quantities', () => {
  const bom = [
    { productName: 'Mono PERC Solar Panel 540W', category: 'Panels', quantity: 10 },
    { productName: 'Solar Inverter 5kW', category: 'Inverters', quantity: 1 },
    { productName: '450W Poly Crystalline Module', category: 'Panels', quantity: 4 },
  ];

  // 10 * 540W = 5400W = 5.4 kW
  // 4 * 450W = 1800W = 1.8 kW
  // Total = 7.2 kWp
  const capacity = calculateDcCapacityFromBOM(bom);
  assert.equal(capacity, 7.2);
});

test('calculateDcCapacityFromBOM returns 0 on empty or non-panel items', () => {
  assert.equal(calculateDcCapacityFromBOM([]), 0);
  assert.equal(
    calculateDcCapacityFromBOM([
      { productName: 'ACDB 4 Pole Box', category: 'Accessories', quantity: 2 },
    ]),
    0
  );
});

test('computeDcAcRatio evaluates loading factors correctly', () => {
  // 6 kWp DC with 5 kW AC inverter -> 1.20 ratio (Optimal)
  const optimal = computeDcAcRatio(6, 5);
  assert.equal(optimal.ratio, 1.2);
  assert.equal(optimal.status, 'optimal');

  // 4 kWp DC with 5 kW AC inverter -> 0.80 ratio (Undersized)
  const undersized = computeDcAcRatio(4, 5);
  assert.equal(undersized.ratio, 0.8);
  assert.equal(undersized.status, 'undersized');

  // 8 kWp DC with 5 kW AC inverter -> 1.60 ratio (Oversized)
  const oversized = computeDcAcRatio(8, 5);
  assert.equal(oversized.ratio, 1.6);
  assert.equal(oversized.status, 'oversized');

  // Zero / negative inputs
  const invalid = computeDcAcRatio(0, 5);
  assert.equal(invalid.status, 'invalid');
});

test('calculateEstimatedSolarYield generates standard energy generation metrics', () => {
  // 5 kWp system * 4.5 sun hours * 0.78 PR = 17.55 units/day -> rounded to 17.6
  const yieldEst = calculateEstimatedSolarYield(5);
  assert.equal(yieldEst.dailyYieldUnits, 17.6);
  assert.ok(yieldEst.monthlyYieldUnits > 500);
  assert.ok(yieldEst.annualYieldUnits > 6000);
  assert.ok(yieldEst.annualCo2OffsetKg > 5000);

  // 0 kWp
  const zero = calculateEstimatedSolarYield(0);
  assert.equal(zero.dailyYieldUnits, 0);
});

test('calculateSolarQuotationTotals handles tax, gross, and discount accurately', () => {
  const items = [
    { price: 15000, quantity: 10, gstRate: 12 }, // 150,000 + 18,000 tax = 168,000
    { price: 40000, quantity: 1, gstRate: 18 },  // 40,000 + 7,200 tax = 47,200
  ];
  // Subtotal: 190,000, Tax: 25,200, Gross: 215,200
  const totals = calculateSolarQuotationTotals(items, 5200);

  assert.equal(totals.subtotal, 190000);
  assert.equal(totals.taxTotal, 25200);
  assert.equal(totals.grossTotal, 215200);
  assert.equal(totals.discount, 5200);
  assert.equal(totals.finalPayout, 210000);
});

test('getInstallationProgress maps all field milestones monotonically', () => {
  assert.equal(getInstallationProgress('READY_TO_SCHEDULE'), 10);
  assert.equal(getInstallationProgress('SCHEDULED'), 25);
  assert.equal(getInstallationProgress('TEAM_ASSIGNED'), 40);
  assert.equal(getInstallationProgress('MATERIAL_READY'), 55);
  assert.equal(getInstallationProgress('IN_PROGRESS'), 70);
  assert.equal(getInstallationProgress('QUALITY_CHECK'), 85);
  assert.equal(getInstallationProgress('COMMISSIONING'), 95);
  assert.equal(getInstallationProgress('HANDED_OVER'), 100);
  assert.equal(getInstallationProgress('UNKNOWN'), 0);
});

test('Workflow validators protect sequential solar stages', () => {
  // 1. Inquiry validation
  assert.equal(validateInquiryForSurvey(null).canProceed, false);
  assert.equal(validateInquiryForSurvey({ customerName: 'Raj' }).canProceed, false);
  assert.equal(validateInquiryForSurvey({ customerName: 'Raj', customerPhone: '9876543210' }).canProceed, true);

  // 2. Survey validation
  assert.equal(validateSurveyForDesign(null).canProceed, false);
  assert.equal(validateSurveyForDesign({ status: 'SCHEDULED' }).canProceed, false);
  assert.equal(validateSurveyForDesign({ status: 'APPROVED' }).canProceed, true);

  // 3. Design validation
  assert.equal(validateDesignForQuotation(null).canProceed, false);
  assert.equal(validateDesignForQuotation({ components: [] }).canProceed, false);
  assert.equal(
    validateDesignForQuotation({ components: [{ productName: 'Solar Panel 540W', quantity: 6 }] }).canProceed,
    true
  );

  // 4. Quotation validation
  assert.equal(validateQuotationForInstallation(null).canProceed, false);
  assert.equal(validateQuotationForInstallation({ status: 'sent' }).canProceed, false);
  assert.equal(validateQuotationForInstallation({ status: 'converted' }).canProceed, true);
});
