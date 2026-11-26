import test from "node:test";
import assert from "node:assert/strict";
import { bundles, individuals } from "../app/marketplace/data";
import {
  buildIndividualModuleDetail,
  buildPlanComparisonRows,
  calculateMarketplacePrice,
  calculateSubscriptionSummary,
  CORE_COMMAND_MENUS,
  CORE_OS_CAPABILITIES,
  DEFAULT_SYSTEM_LIMITS,
  evaluateCoreQuota,
  filterMarketplaceItems,
  getItemWorkspaceLink,
  isCreatedInCurrentMonth,
  MARKETPLACE_META,
  mergeMarketplaceCatalog,
  normalizeSystemLimits,
  PLAN_COMPARISON_ROWS,
  resolveBusinessPlanState,
  resolveCoreMenuState,
  resolveModuleActivationStatus,
} from "./marketplace-catalog";

test("Every marketplace bundle and individual add-on has metadata, non-generic inclusions, and valid workspace route", () => {
  assert.equal(bundles.length, 11);
  assert.equal(individuals.length, 16);
  for (const item of [...bundles, ...individuals]) {
    assert.ok(MARKETPLACE_META[item.id], `Missing metadata for ${item.id}`);
    assert.notEqual(
      item.inclusions.trim(),
      "Standard Module Access",
      `Generic placeholder inclusions left on ${item.id}`
    );
    const link = getItemWorkspaceLink(item.id);
    assert.ok(link.href.startsWith("/"), `Invalid workspace href for ${item.id}`);
    assert.ok(link.label.length > 0, `Missing workspace label for ${item.id}`);
  }
});

test("Core OS capabilities cover E-Way Bill, GSTR-1/3B, POS Split Bill, and Quotations", () => {
  assert.ok(CORE_OS_CAPABILITIES.length >= 8);
  const combined = CORE_OS_CAPABILITIES.map((c) => `${c.name} ${c.summary}`).join(" ").toLowerCase();
  assert.ok(combined.includes("e-way"));
  assert.ok(combined.includes("gstr-1"));
  assert.ok(combined.includes("quotation"));
  assert.ok(PLAN_COMPARISON_ROWS.length >= 8);
});

test("calculateMarketplacePrice calculates monthly and discounted annual totals accurately", () => {
  const monthly = calculateMarketplacePrice("999", "monthly");
  assert.equal(monthly.monthlyOriginal, 999);
  assert.equal(monthly.effectiveMonthly, 999);
  assert.equal(monthly.yearlyTotal, 11988);
  assert.equal(monthly.yearlySavings, 0);

  const yearly = calculateMarketplacePrice("999", "yearly");
  assert.equal(yearly.monthlyOriginal, 999);
  assert.equal(yearly.effectiveMonthly, 699);
  assert.equal(yearly.yearlyTotal, 8388);
  assert.equal(yearly.yearlySavings, 3600);
  assert.equal(yearly.discountPercent, 30);

  const customDiscount = calculateMarketplacePrice("1000", "yearly", 20);
  assert.equal(customDiscount.effectiveMonthly, 800);
  assert.equal(customDiscount.yearlyTotal, 9600);
  assert.equal(customDiscount.yearlySavings, 2400);
  assert.equal(customDiscount.discountPercent, 20);
});

test("resolveModuleActivationStatus detects direct activation and parent bundle inclusion", () => {
  const statusViaSuite = resolveModuleActivationStatus(
    "feat_accounting",
    ["suite_backoffice"],
    bundles
  );
  assert.equal(statusViaSuite.isDirectlyActive, false);
  assert.equal(statusViaSuite.includedViaSuiteId, "suite_backoffice");
  assert.equal(statusViaSuite.includedViaSuiteName, "Back Office Pro");
  assert.equal(statusViaSuite.isAvailable, true);

  const statusDirect = resolveModuleActivationStatus("feat_store", ["feat_store"], bundles);
  assert.equal(statusDirect.isDirectlyActive, true);
  assert.equal(statusDirect.includedViaSuiteId, null);
  assert.equal(statusDirect.isAvailable, true);

  const statusLocked = resolveModuleActivationStatus("feat_store", ["suite_growth"], bundles);
  assert.equal(statusLocked.isAvailable, false);
});

test("filterMarketplaceItems searches across names/highlights, filters by category and activeOnly", () => {
  const whatsappMatches = filterMarketplaceItems([...bundles, ...individuals], {
    searchTerm: "whatsapp",
    categoryFilter: "all",
    activeOnly: false,
    activeAddonIds: [],
    bundles,
  });
  assert.ok(whatsappMatches.some((i) => i.id === "feat_whatsapp"));
  assert.ok(whatsappMatches.some((i) => i.id === "suite_growth"));

  const storeMatches = filterMarketplaceItems(individuals, {
    searchTerm: "",
    categoryFilter: "store_sales",
    activeOnly: false,
    activeAddonIds: [],
    bundles,
  });
  assert.ok(storeMatches.some((i) => i.id === "feat_store"));
  assert.ok(storeMatches.some((i) => i.id === "feat_branding"));
  assert.equal(storeMatches.some((i) => i.id === "feat_accounting"), false);

  const activeOnlyMatches = filterMarketplaceItems(individuals, {
    searchTerm: "",
    categoryFilter: "all",
    activeOnly: true,
    activeAddonIds: ["suite_backoffice"],
    bundles,
  });
  assert.ok(activeOnlyMatches.some((i) => i.id === "feat_accounting"));
  assert.ok(activeOnlyMatches.some((i) => i.id === "feat_staff"));
  assert.equal(activeOnlyMatches.some((i) => i.id === "feat_store"), false);
});

test("calculateSubscriptionSummary aggregates suite/addon totals and respects global annual discount", () => {
  const summary = calculateSubscriptionSummary(
    ["suite_backoffice", "feat_accounting", "feat_store"],
    "monthly",
    bundles,
    individuals
  );
  assert.equal(summary.activeSuites.length, 1);
  assert.equal(summary.activeIndividuals.length, 2);
  assert.deepEqual(summary.redundantAddonIds, ["feat_accounting"]);
  assert.equal(summary.billableMonthlyTotal, 1299 + 599 + 799);
  assert.ok(summary.unlockedViaSuite.some((u) => u.item.id === "feat_staff"));

  const yearly25 = calculateSubscriptionSummary(
    ["feat_store"],
    "yearly",
    bundles,
    individuals,
    25
  );
  assert.equal(yearly25.billableEffectiveMonthly, Math.floor(799 * 0.75));
});

test("resolveBusinessPlanState handles trial, expired, active, core free states & configurable trial days", () => {
  const now = new Date("2026-05-10T00:00:00.000Z");

  const activeTrial = resolveBusinessPlanState(
    { status: "trial", trialEndDate: "2026-05-15T00:00:00.000Z" },
    now,
    21
  );
  assert.equal(activeTrial.statusKey, "trial");
  assert.equal(activeTrial.planTitle, "21-Day Free Trial");
  assert.equal(activeTrial.trialDaysRemaining, 5);

  const expiredTrial = resolveBusinessPlanState(
    { status: "trial", trialEndDate: "2026-05-01T00:00:00.000Z" },
    now
  );
  assert.equal(expiredTrial.statusKey, "expired");
  assert.equal(expiredTrial.trialDaysRemaining, 0);

  const proPlan = resolveBusinessPlanState({ status: "pro" }, now);
  assert.equal(proPlan.statusKey, "active");

  const freePlan = resolveBusinessPlanState(null, now);
  assert.equal(freePlan.statusKey, "free");
});

test("buildIndividualModuleDetail builds structured detail view for Store & Funnel Builder", () => {
  const store = individuals.find((i) => i.id === "feat_store");
  assert.ok(store);
  const detail = buildIndividualModuleDetail(store);
  assert.equal(detail.id, "feat_store");
  assert.ok(detail.features.some((f) => f.toLowerCase().includes("funnel")));
  assert.equal(detail.rules.length, 3);
});

test("normalizeSystemLimits sanitizes bounds and falls back cleanly on missing fields", () => {
  const normalized = normalizeSystemLimits({
    maxMonthlyInvoices: -10,
    maxProducts: 75,
    annualDiscountPercent: 120,
    trialDurationDays: 21,
    corePlanName: "  Starter Core  ",
  });
  assert.equal(normalized.maxMonthlyInvoices, 0);
  assert.equal(normalized.maxProducts, 75);
  assert.equal(normalized.annualDiscountPercent, 90);
  assert.equal(normalized.trialDurationDays, 21);
  assert.equal(normalized.corePlanName, "Starter Core");
  assert.equal(normalized.maxProFunnels, DEFAULT_SYSTEM_LIMITS.maxProFunnels);
});

test("mergeMarketplaceCatalog applies Firestore overrides, filters inactive items, and includes custom modules", () => {
  const customLimits = normalizeSystemLimits({
    annualDiscountPercent: 25,
    trialDurationDays: 21,
    maxMonthlyInvoices: 100,
    maxProFunnels: 40,
  });

  const remoteDocs = [
    {
      id: "feat_store",
      price: "999",
      usageLimit: "Up to 40 active funnels",
      isPopular: true,
    },
    {
      id: "feat_feedback",
      isActive: false,
    },
    {
      id: "feat_custom_pos",
      name: "Kiosk Billing Add-on",
      description: "Self-checkout kiosk mode",
      price: "449",
      category: "Ops",
      isTrialAvailable: true,
      inclusions: "Touchscreen Kiosk, QR Pay",
      isActive: true,
    },
  ];

  const publicCatalog = mergeMarketplaceCatalog(bundles, individuals, remoteDocs, {
    limits: customLimits,
    includeInactive: false,
  });
  const storeUpdated = publicCatalog.individuals.find((i) => i.id === "feat_store");
  assert.equal(storeUpdated?.price, "999");
  assert.equal(storeUpdated?.usageLimit, "Up to 40 active funnels");
  assert.equal(storeUpdated?.annualDiscountPercent, 25);
  assert.equal(storeUpdated?.trialDays, 21);
  assert.equal(publicCatalog.individuals.some((i) => i.id === "feat_feedback"), false);
  assert.ok(publicCatalog.individuals.some((i) => i.id === "feat_custom_pos"));

  const ownerCatalog = mergeMarketplaceCatalog(bundles, individuals, remoteDocs, {
    limits: customLimits,
    includeInactive: true,
  });
  assert.ok(ownerCatalog.individuals.some((i) => i.id === "feat_feedback"));

  const rows = buildPlanComparisonRows(customLimits, publicCatalog.allItems);
  const storeRow = rows.find((r) => r.feature.includes("Storefront"));
  const billingRow = rows.find((r) => r.feature.includes("POS Billing"));
  const ewayRow = rows.find((r) => r.feature.includes("Live E-Way Bill"));
  assert.ok(storeRow?.paid.includes("999"));
  assert.ok(storeRow?.paid.includes("40 Sales Funnels"));
  assert.ok(billingRow?.free.includes("100 invoices"));
  assert.ok(billingRow?.paid.includes("POS Billing, Quotes & Ledger Pro"));
  assert.ok(ewayRow?.paid.includes("Live E-Way Bill & GST Filing Pro"));
});

test("Command Center governance: CORE_COMMAND_MENUS, resolveCoreMenuState, and evaluateCoreQuota enforce modes and ceilings", () => {
  assert.equal(CORE_COMMAND_MENUS.length, 10);

  const customLimits = normalizeSystemLimits({
    maxMonthlyQuotations: 15,
    maxMonthlyEwayBills: 8,
    maxMonthlyGstExports: 4,
    maxFixedExpenses: 6,
    maxProMonthlyEwayBills: 500,
    maxLoyaltyMembers: 8000,
    maxSolarProjects: 300,
    maxPropertyListings: 750,
    coreMenuAccess: {
      quotations: "paid_addon",
      gst: "trial_only",
      fixed_expenses: "hidden",
    } as any,
  });

  assert.equal(customLimits.maxMonthlyQuotations, 15);
  assert.equal(customLimits.maxMonthlyEwayBills, 8);
  assert.equal(customLimits.maxMonthlyGstExports, 4);
  assert.equal(customLimits.maxFixedExpenses, 6);
  assert.equal(customLimits.maxProMonthlyEwayBills, 500);
  assert.equal(customLimits.maxLoyaltyMembers, 8000);
  assert.equal(customLimits.maxSolarProjects, 300);
  assert.equal(customLimits.maxPropertyListings, 750);
  assert.equal(customLimits.coreMenuAccess.billing, "free");
  assert.equal(customLimits.coreMenuAccess.quotations, "paid_addon");
  assert.equal(customLimits.coreMenuAccess.gst, "trial_only");
  assert.equal(customLimits.coreMenuAccess.fixed_expenses, "hidden");

  const now = new Date("2026-05-15T10:00:00.000Z");

  // Paid add-on mode locks free business, unlocks when feat_billing_pro or suite_backoffice is active
  assert.equal(
    resolveCoreMenuState("/quotations", {
      limits: customLimits,
      business: { status: "free", activeAddonIds: [] },
      now,
    }),
    "locked"
  );
  assert.equal(
    resolveCoreMenuState("/quotations", {
      limits: customLimits,
      business: { status: "free", activeAddonIds: ["feat_billing_pro"] },
      now,
    }),
    "active"
  );

  // Hidden mode hides even for pro unless owner changes mode
  assert.equal(
    resolveCoreMenuState("/fixed-expenses", {
      limits: customLimits,
      business: { status: "pro" },
      now,
    }),
    "hidden"
  );

  // Trial-only mode allows active trial, locks free user
  assert.equal(
    resolveCoreMenuState("/accounting/gst", {
      limits: customLimits,
      business: { status: "trial", trialEndDate: "2026-05-25T00:00:00.000Z" },
      now,
    }),
    "active"
  );
  assert.equal(
    resolveCoreMenuState("/accounting/gst", {
      limits: customLimits,
      business: { status: "free" },
      now,
    }),
    "locked"
  );

  // Quota evaluation for Free vs Pro E-Way Bill ceiling
  const freeEwbQuota = evaluateCoreQuota("invoices", 8, {
    limits: customLimits,
    business: { status: "free", activeAddonIds: [] },
    now,
  });
  assert.equal(freeEwbQuota.isReached, true);
  assert.equal(freeEwbQuota.limit, 8);

  const proEwbUnder = evaluateCoreQuota("invoices", 120, {
    limits: customLimits,
    business: { status: "free", activeAddonIds: ["feat_eway_gst"] },
    now,
  });
  assert.equal(proEwbUnder.isUnlocked, true);
  assert.equal(proEwbUnder.isReached, false);
  assert.equal(proEwbUnder.limit, 500);

  const proEwbCapped = evaluateCoreQuota("invoices", 500, {
    limits: customLimits,
    business: { status: "free", activeAddonIds: ["feat_eway_gst"] },
    now,
  });
  assert.equal(proEwbCapped.isUnlocked, true);
  assert.equal(proEwbCapped.isReached, true);

  assert.equal(isCreatedInCurrentMonth("2026-05-02", now), true);
  assert.equal(isCreatedInCurrentMonth("2026-04-30", now), false);
});

