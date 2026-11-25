import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SIDEBAR_ARCHITECTURE_RULES,
  SIDEBAR_BLUEPRINT_GROUPS,
  filterBlueprintGroups,
  getBlueprintSummaryStats,
} from './platform-blueprint';

test('SIDEBAR_BLUEPRINT_GROUPS covers all 11 sidebar groups with complete metadata per page', () => {
  assert.equal(SIDEBAR_BLUEPRINT_GROUPS.length, 11);

  const seenIds = new Set<string>();
  let totalItems = 0;

  for (const group of SIDEBAR_BLUEPRINT_GROUPS) {
    assert.ok(group.groupLabel.length > 0);
    assert.ok(group.items.length > 0, `Group ${group.id} should have items`);

    for (const item of group.items) {
      assert.equal(seenIds.has(item.id), false, `Duplicate blueprint item id: ${item.id}`);
      seenIds.add(item.id);
      totalItems++;

      assert.ok(item.href.startsWith('/'), `Invalid href for ${item.id}: ${item.href}`);
      assert.ok(item.pageFile.startsWith('src/app/'), `Invalid pageFile for ${item.id}`);
      assert.equal(fs.existsSync(item.pageFile), true, `Missing pageFile on disk: ${item.pageFile}`);
      assert.ok(item.howItWorks.trim().length > 20, `Missing workflow summary for ${item.id}`);
      assert.ok(item.pageSections.length >= 2, `Missing pageSections for ${item.id}`);
      assert.ok(item.connectedPages.length >= 1, `Missing connectedPages for ${item.id}`);
      assert.ok(item.frontendStack.length >= 1, `Missing frontendStack for ${item.id}`);
    }
  }

  assert.equal(totalItems, 66);
});

test('SIDEBAR_BLUEPRINT_GROUPS matches SidebarNav hrefs and includes Store Builder 16-section & relay architecture', () => {
  const sidebarSrc = fs.readFileSync('src/components/layout/sidebar-nav.tsx', 'utf8');
  const sidebarHrefs = [...sidebarSrc.matchAll(/href:\s*["'`]([^"'`]+)["'`]/g)]
    .map((m) => m[1])
    .filter((href) => !href.includes('${'));

  const blueprintHrefs = new Set(
    SIDEBAR_BLUEPRINT_GROUPS.flatMap((g) => g.items.map((item) => item.href))
  );

  for (const href of sidebarHrefs) {
    assert.equal(
      blueprintHrefs.has(href),
      true,
      `SidebarNav route missing from SIDEBAR_BLUEPRINT_GROUPS: ${href}`
    );
  }

  assert.ok(SIDEBAR_ARCHITECTURE_RULES.length >= 5);
  assert.ok(SIDEBAR_ARCHITECTURE_RULES.some((r) => r.id === 'financial_integrity_gate'));
  assert.ok(SIDEBAR_ARCHITECTURE_RULES.some((r) => r.id === 'team_invite_wage_sync'));
  assert.ok(SIDEBAR_ARCHITECTURE_RULES.some((r) => r.id === 'pillar2_customer_privacy_gate'));
  assert.ok(SIDEBAR_ARCHITECTURE_RULES.some((r) => r.id === 'pillar3_api_tenant_defense_gate'));
  assert.ok(SIDEBAR_ARCHITECTURE_RULES.some((r) => r.id === 'pillar4_cyber_defense_gate'));

  const storeBuilder = SIDEBAR_BLUEPRINT_GROUPS.find((g) => g.id === 'store_builder');
  assert.ok(storeBuilder);
  const manager = storeBuilder.items.find((i) => i.id === 'storefront-manager');
  assert.ok(manager);
  assert.ok(manager.frontendStack.some((f) => f.includes('add-section-dialog.tsx')));
  assert.ok(manager.backendStack.firestoreCollections.includes('businesses/{businessId}/storefront_leads'));
  const landingBuilder = storeBuilder.items.find((i) => i.id === 'landing-page-builder');
  assert.ok(landingBuilder);
  assert.equal(landingBuilder.href, '/website/funnels');
  assert.equal(
    sidebarHrefs.includes('/owner/marketplace'),
    false,
    'Duplicate /owner/marketplace menu should be consolidated into /owner/limits'
  );
  const platformMaster = SIDEBAR_BLUEPRINT_GROUPS.find((g) => g.id === 'platform_master');
  assert.ok(platformMaster);
  const plansAndLimits = platformMaster.items.find((i) => i.id === 'owner-limits');
  assert.ok(plansAndLimits);
  assert.equal(plansAndLimits.label, 'Plans & Limits');
  assert.ok(plansAndLimits.backendStack.firestoreCollections.includes('system/config/marketplace/{moduleId}'));
});

test('getBlueprintSummaryStats and filterBlueprintGroups accurately compute stats and search across backend/frontend', () => {
  const stats = getBlueprintSummaryStats(SIDEBAR_BLUEPRINT_GROUPS);
  assert.equal(stats.totalGroups, 11);
  assert.equal(stats.totalPages, 66);
  assert.ok(stats.uniqueCollections >= 25);
  assert.ok(stats.uniqueApiRoutes >= 6);
  assert.ok(stats.uniqueServerActions >= 5);

  const ewayMatches = filterBlueprintGroups(SIDEBAR_BLUEPRINT_GROUPS, 'all', '/api/eway-bill/generate');
  assert.equal(ewayMatches.length, 1);
  assert.deepEqual(
    ewayMatches[0].items.map((i) => i.id),
    ['billing', 'invoices']
  );

  const leadMatches = filterBlueprintGroups(SIDEBAR_BLUEPRINT_GROUPS, 'all', 'storefront_leads');
  assert.equal(leadMatches.length, 1);
  assert.equal(leadMatches[0].id, 'store_builder');

  const solarGroupOnly = filterBlueprintGroups(SIDEBAR_BLUEPRINT_GROUPS, 'solar_management', '');
  assert.equal(solarGroupOnly.length, 1);
  assert.equal(solarGroupOnly[0].items.length, 16);
});
