import test from "node:test";
import assert from "node:assert/strict";
import { addDays, subDays } from "date-fns";
import {
  categorizeTenantLifecycle,
  computeTenantInactivityDays,
  filterTenantsForCleanup,
  KNOWN_BUSINESS_SUBCOLLECTIONS,
} from "./cleanup-audit";

test("KNOWN_BUSINESS_SUBCOLLECTIONS includes all core and vertical business subcollections", () => {
  assert.ok(KNOWN_BUSINESS_SUBCOLLECTIONS.length >= 35);
  assert.ok(KNOWN_BUSINESS_SUBCOLLECTIONS.includes("products"));
  assert.ok(KNOWN_BUSINESS_SUBCOLLECTIONS.includes("orders"));
  assert.ok(KNOWN_BUSINESS_SUBCOLLECTIONS.includes("cashbook"));
  assert.ok(KNOWN_BUSINESS_SUBCOLLECTIONS.includes("solar_plants"));
  assert.ok(KNOWN_BUSINESS_SUBCOLLECTIONS.includes("loyalty_members"));
  assert.ok(KNOWN_BUSINESS_SUBCOLLECTIONS.includes("realestate_properties"));
});

test("categorizeTenantLifecycle correctly attributes Pro, healthy trial, grace period, warning, and stale purge", () => {
  const now = new Date("2026-11-19T12:00:00Z");

  // 1. Pro
  const proBiz = { id: "b1", status: "pro" };
  const proInfo = categorizeTenantLifecycle(proBiz, now);
  assert.equal(proInfo.category, "pro");
  assert.equal(proInfo.isProtected, true);
  assert.equal(proInfo.isPurgeRecommended, false);

  // 2. Active Trial (5 days left)
  const trialBiz = {
    id: "b2",
    status: "trial",
    trialEndDate: addDays(now, 5).toISOString(),
  };
  const trialInfo = categorizeTenantLifecycle(trialBiz, now);
  assert.equal(trialInfo.category, "healthy_trial");
  assert.equal(trialInfo.isProtected, true);
  assert.ok(trialInfo.daysExpired < 0);

  // 3. Grace Period (expired 7 days ago)
  const graceBiz = {
    id: "b3",
    status: "trial",
    trialEndDate: subDays(now, 7).toISOString(),
  };
  const graceInfo = categorizeTenantLifecycle(graceBiz, now);
  assert.equal(graceInfo.category, "grace_period");
  assert.equal(graceInfo.isPurgeRecommended, false);
  assert.equal(graceInfo.daysExpired, 7);

  // 4. Warning (expired 30 days ago)
  const warnBiz = {
    id: "b4",
    status: "trial",
    trialEndDate: subDays(now, 30).toISOString(),
  };
  const warnInfo = categorizeTenantLifecycle(warnBiz, now);
  assert.equal(warnInfo.category, "warning");
  assert.equal(warnInfo.isPurgeRecommended, false);
  assert.equal(warnInfo.daysExpired, 30);

  // 5. Stale / Safe to Purge (expired 75 days ago)
  const staleBiz = {
    id: "b5",
    status: "trial",
    trialEndDate: subDays(now, 75).toISOString(),
  };
  const staleInfo = categorizeTenantLifecycle(staleBiz, now);
  assert.equal(staleInfo.category, "stale_purge");
  assert.equal(staleInfo.isPurgeRecommended, true);
  assert.equal(staleInfo.isProtected, false);
  assert.equal(staleInfo.daysExpired, 75);
});

test("filterTenantsForCleanup filters by category and search term accurately", () => {
  const now = new Date("2026-11-19T12:00:00Z");
  const list = [
    { id: "b_pro", name: "Apex Retailers", status: "pro" },
    {
      id: "b_trial",
      name: "Sunrise Solar",
      status: "trial",
      trialEndDate: addDays(now, 3).toISOString(),
    },
    {
      id: "b_stale1",
      name: "Old Demo Store",
      status: "trial",
      trialEndDate: subDays(now, 80).toISOString(),
    },
    {
      id: "b_stale2",
      name: "Abandoned Cafe",
      status: "trial",
      trialEndDate: subDays(now, 120).toISOString(),
    },
  ];

  // Filter category
  const staleOnly = filterTenantsForCleanup(list, "stale_purge", "", now);
  assert.equal(staleOnly.length, 2);
  assert.equal(staleOnly[0].id, "b_stale2"); // Sorted by most days expired descending

  // Search query
  const searchResult = filterTenantsForCleanup(list, "all", "solar", now);
  assert.equal(searchResult.length, 1);
  assert.equal(searchResult[0].id, "b_trial");
});
