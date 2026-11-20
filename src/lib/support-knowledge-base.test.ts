import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUPPORT_KNOWLEDGE_BASE,
  searchSupportKnowledge,
  searchAllCommonIssues,
  formatCustomerScript,
  getSupportGroups,
} from './support-knowledge-base';

test('Support Knowledge Base: contains core business modules', () => {
  assert.ok(SUPPORT_KNOWLEDGE_BASE.length >= 8, 'Knowledge base should contain at least 8 major modules');
  const ids = SUPPORT_KNOWLEDGE_BASE.map(g => g.id);
  assert.ok(ids.includes('billing_pos'), 'Must contain billing POS');
  assert.ok(ids.includes('invoices_b2b'), 'Must contain invoices');
  assert.ok(ids.includes('inventory_management'), 'Must contain inventory');
  assert.ok(ids.includes('attendance_payroll'), 'Must contain attendance');
  assert.ok(ids.includes('online_storefront'), 'Must contain online storefront');
  assert.ok(ids.includes('whatsapp_automation_hub'), 'Must contain whatsapp automation');
  assert.ok(ids.includes('complaints_support_desk'), 'Must contain complaints support desk');
});

test('Support Knowledge Base: all guides have customer journeys and SOPs', () => {
  for (const guide of SUPPORT_KNOWLEDGE_BASE) {
    assert.ok(guide.title.length > 0, `Guide ${guide.id} must have a title`);
    assert.ok(guide.route.startsWith('/'), `Route for ${guide.id} must be valid absolute path`);
    assert.ok(guide.customerJourney.length >= 3, `Guide ${guide.id} must have at least 3 customer journey steps`);
    assert.ok(guide.commonIssues.length >= 1, `Guide ${guide.id} must have at least 1 common issue SOP`);

    for (const issue of guide.commonIssues) {
      assert.ok(issue.agentSteps.length >= 2, `Issue ${issue.id} must have at least 2 agent resolution steps`);
      assert.ok(issue.customerScript.length > 10, `Issue ${issue.id} must have canned customer script`);
      assert.ok(issue.tags.length >= 2, `Issue ${issue.id} must have search tags`);
    }
  }
});

test('Support Knowledge Base: searchSupportKnowledge searches by query and group', () => {
  // Search thermal printer
  const printerResults = searchSupportKnowledge('printer');
  assert.ok(printerResults.length >= 1, 'Should find printer related guides');
  assert.ok(printerResults.some(g => g.id === 'billing_pos'), 'Billing POS should match printer query');

  // Search GST
  const gstResults = searchSupportKnowledge('GST');
  assert.ok(gstResults.some(g => g.id === 'invoices_b2b'), 'Invoices should match GST query');

  // Group filter
  const salesGroup = searchSupportKnowledge('', 'Sales & Billing');
  assert.ok(salesGroup.length >= 2, 'Should filter by Sales & Billing group');
  for (const g of salesGroup) {
    assert.equal(g.group, 'Sales & Billing');
  }
});

test('Support Knowledge Base: searchAllCommonIssues flattens and searches issues directly', () => {
  const blankIssues = searchAllCommonIssues('blank');
  assert.ok(blankIssues.length >= 1, 'Should find issues matching blank');
  assert.equal(blankIssues[0].issue.id, 'pos_printer_blank');
  assert.equal(blankIssues[0].guideRoute, '/billing');

  const metaIssues = searchAllCommonIssues('token');
  assert.ok(metaIssues.some(i => i.issue.id === 'wa_token_expired_190'));
});

test('Support Knowledge Base: formatCustomerScript substitutes placeholders correctly', () => {
  const tpl = 'Hello {customer_name}! Your ticket #{ticket_id} is tracked here: {tracking_url}';
  const formatted = formatCustomerScript(tpl, {
    customerName: 'Rahul Sharma',
    ticketId: 'TKT-9981',
    trackingUrl: 'https://biztrix.in/track/123',
  });

  assert.equal(
    formatted,
    'Hello Rahul Sharma! Your ticket #TKT-9981 is tracked here: https://biztrix.in/track/123'
  );

  // Fallback to Sir/Madam if name not given
  const fallback = formatCustomerScript('Namaste {customer_name}', {});
  assert.equal(fallback, 'Namaste Sir/Madam');
});

test('Support Knowledge Base: getSupportGroups returns unique groups', () => {
  const groups = getSupportGroups();
  assert.ok(groups.includes('Sales & Billing'));
  assert.ok(groups.includes('Operations & Stock'));
  assert.ok(groups.includes('Customer Care'));
  assert.equal(new Set(groups).size, groups.length, 'Groups should be unique');
});
