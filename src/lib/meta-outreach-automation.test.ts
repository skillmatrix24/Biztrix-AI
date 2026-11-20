import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PLATFORM_META_CONFIG,
  RECOMMENDED_META_TEMPLATES,
  normalizePlatformMetaConfig,
  sanitizeMetaTemplateName,
  extractMetaTemplatePlaceholderCount,
  sanitizeMetaParamValue,
  buildMetaTemplateBodyComponents,
  getAutoDispatchCandidates,
} from "./meta-outreach-automation";

test("RECOMMENDED_META_TEMPLATES covers all 4 lifecycle stages with valid placeholder counts and examples", () => {
  assert.equal(RECOMMENDED_META_TEMPLATES.length, 4);
  for (const tpl of RECOMMENDED_META_TEMPLATES) {
    assert.equal(tpl.name, sanitizeMetaTemplateName(tpl.name));
    const count = extractMetaTemplatePlaceholderCount(tpl.bodyText);
    assert.equal(count, tpl.bodyParamKeys.length, `Mismatch for ${tpl.name}`);
    assert.equal(count, tpl.exampleValues.length, `Example mismatch for ${tpl.name}`);
  }
});

test("sanitizeMetaTemplateName enforces lowercase snake_case compliance", () => {
  assert.equal(sanitizeMetaTemplateName("  Trial Expiry Alert! 2026 "), "trial_expiry_alert_2026");
  assert.equal(sanitizeMetaTemplateName("Biztrix---Grace__Notice"), "biztrix_grace_notice");
  assert.equal(sanitizeMetaTemplateName("hello_world"), "hello_world");
});

test("extractMetaTemplatePlaceholderCount detects positional variables from template objects and strings", () => {
  assert.equal(extractMetaTemplatePlaceholderCount("Hello {{1}}, your {{2}} expired {{3}} days ago."), 3);
  assert.equal(extractMetaTemplatePlaceholderCount("Hello {{1}}, reminder for {{1}}."), 1);
  assert.equal(extractMetaTemplatePlaceholderCount("Static message with no vars."), 0);
  assert.equal(
    extractMetaTemplatePlaceholderCount({
      name: "demo",
      status: "APPROVED",
      category: "UTILITY",
      language: "en_US",
      components: [
        { type: "HEADER", text: "Alert" },
        { type: "BODY", text: "Hi {{1}}, renew {{2}} at {{3}}." },
      ],
    }),
    3
  );
});

test("buildMetaTemplateBodyComponents sanitizes newlines/tabs and supports custom values", () => {
  const { components, resolvedValues } = buildMetaTemplateBodyComponents(
    {
      bodyParamKeys: ["ownerName", "businessName", "daysStale", "custom"],
      customValues: { "3": "  Flat\n20%   Off\tNow  " },
    },
    {
      ownerName: "Amit\nVerma",
      businessName: "Verma   Mart",
      daysStale: 18,
      renewUrl: "https://biztrix.in/pricing",
      supportPhone: "+91 98765 43210",
    }
  );

  assert.deepEqual(resolvedValues, ["Amit Verma", "Verma Mart", "18", "Flat 20% Off Now"]);
  assert.equal(components.length, 1);
  assert.equal(components[0].type, "body");
  assert.equal(components[0].parameters.length, 4);
  assert.equal(sanitizeMetaParamValue("   \n\t "), "-");
});

test("getAutoDispatchCandidates filters non-Pro stale tenants, enforces cooldown, and builds payloads", () => {
  const now = Date.now();
  const daysAgo = (d: number) => new Date(now - d * 86400 * 1000).toISOString();
  const daysAhead = (d: number) => new Date(now + d * 86400 * 1000).toISOString();

  const config = normalizePlatformMetaConfig({
    ...DEFAULT_PLATFORM_META_CONFIG,
    cooldownDays: 7,
    supportPhone: "+91 99999 88888",
  });

  const businesses = [
    // Eligible grace (5 days expired, valid phone)
    { id: "b1", name: "Alpha Store", ownerName: "Asha", phone: "9876543210", status: "trial", trialEndsAt: daysAgo(5) },
    // Skipped: active Pro
    { id: "b2", name: "Beta Pro", phone: "9876543211", status: "pro", trialEndsAt: daysAgo(90) },
    // Skipped: on cooldown (notified 2 days ago)
    { id: "b3", name: "Gamma Shop", phone: "9876543212", status: "trial", trialEndsAt: daysAgo(20), lastNotifiedAt: daysAgo(2) },
    // Skipped: no phone
    { id: "b4", name: "Delta Co", phone: "", status: "trial", trialEndsAt: daysAgo(65) },
    // Eligible purge_warning (62 days expired, last notified 10 days ago -> cooldown passed)
    { id: "b5", name: "Epsilon Corp", ownerName: "Esha", phone: "09123456789", status: "trial", trialEndsAt: daysAgo(62), lastNotifiedAt: daysAgo(10) },
    // Skipped: healthy trial (10 days left)
    { id: "b6", name: "Zeta Fresh", phone: "9876543215", status: "trial", trialEndsAt: daysAhead(10) },
  ];

  const result = getAutoDispatchCandidates(businesses, config, { origin: "https://app.biztrix.in" });

  assert.equal(result.eligible.length, 2);
  assert.equal(result.skippedCooldown, 1);
  assert.equal(result.skippedNoPhone, 1);
  assert.equal(result.skippedStageDisabled, 0);

  const b1 = result.eligible.find((c) => c.businessId === "b1");
  assert.ok(b1);
  assert.equal(b1.stage, "grace");
  assert.equal(b1.phone, "919876543210");
  assert.equal(b1.templateName, "biztrix_grace_extension");
  assert.equal(b1.components[0].parameters[0].text, "Asha");

  const b5 = result.eligible.find((c) => c.businessId === "b5");
  assert.ok(b5);
  assert.equal(b5.stage, "purge_warning");
  assert.equal(b5.phone, "919123456789");
  assert.equal(b5.templateName, "biztrix_final_purge_notice");
});
