import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FUNNEL_STAGES,
  MODULE_CATALOG,
  FRAGMENTED_TOOL_OPTIONS,
  calculateFunnelBundleEstimate,
} from './funnel-data';

test('FUNNEL_STAGES covers all 5 sequential revenue stages with connected modules', () => {
  assert.equal(FUNNEL_STAGES.length, 5);
  const steps = FUNNEL_STAGES.map((s) => s.step);
  assert.deepEqual(steps, ['01', '02', '03', '04', '05']);

  for (const stage of FUNNEL_STAGES) {
    assert.ok(stage.modules.length >= 3, `Stage ${stage.id} should connect at least 3 modules`);
    assert.ok(stage.flowSteps.length >= 3, `Stage ${stage.id} should have 3 flow steps`);
    for (const mod of stage.modules) {
      assert.ok(mod.route.startsWith('/'), `Module route ${mod.route} must be an internal path`);
    }
  }
});

test('MODULE_CATALOG represents every core, growth, operations, and industry vertical suite', () => {
  const ids = new Set(MODULE_CATALOG.map((m) => m.id));
  const expectedIds = [
    'core_billing_inventory',
    'suite_growth',
    'suite_loyalty',
    'feat_store',
    'suite_intelligence',
    'suite_backoffice',
    'suite_support',
    'feat_branding',
    'suite_solar',
    'suite_property',
  ];

  for (const id of expectedIds) {
    assert.ok(ids.has(id), `Expected module ${id} to be present in funnel catalog`);
  }
});

test('calculateFunnelBundleEstimate accurately computes monthly and annual savings', () => {
  assert.deepEqual(calculateFunnelBundleEstimate([]), {
    separateMonthly: 0,
    biztrixMonthly: 0,
    monthlySavings: 0,
    annualSavings: 0,
  });

  const allIds = FRAGMENTED_TOOL_OPTIONS.map((t) => t.id);
  const fullEstimate = calculateFunnelBundleEstimate(allIds);
  // 1200 + 2500 + 1800 + 2000 + 3000 + 1500 = 12000
  // 0 + 999 + 799 + 899 + 1499 + 699 = 4895
  assert.equal(fullEstimate.separateMonthly, 12000);
  assert.equal(fullEstimate.biztrixMonthly, 4895);
  assert.equal(fullEstimate.monthlySavings, 7105);
  assert.equal(fullEstimate.annualSavings, 7105 * 12);
});
