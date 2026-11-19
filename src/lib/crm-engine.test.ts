import test from "node:test";
import assert from "node:assert/strict";
import {
  addDaysToYmd,
  buildBillingHrefForLead,
  buildCrmLeadFromStorefrontPayload,
  buildFollowUpTaskPayload,
  buildWhatsAppLeadTemplates,
  calculateLeadIntentScore,
  classifyFollowUpUrgency,
  computeCrmPipelineStats,
  exportLeadsToCsv,
  filterAndSortLeads,
  findDuplicatePhoneMatch,
  getLeadFollowUpTaskId,
  getNextPipelineStage,
  isLeadOpenInPipeline,
  parseLeadsCsvImport,
  prependLeadActivity,
  createLeadActivityEntry,
} from "./crm-engine";
import { type Customer, type Lead } from "./mock-db";

const SAMPLE_LEADS: Lead[] = [
  {
    id: "l_open_hot",
    tenantId: "biz_1",
    name: "Aarav Mehta",
    phone: "+91 98765 43210",
    email: "aarav@mehta.in",
    companyName: "Mehta Solar",
    source: "Referral",
    status: "negotiation",
    priority: "Hot",
    budget: 80000,
    interest: "5kW Hybrid Inverter",
    followUpDate: "2026-11-18",
    assignedTo: "staff_1",
    assignedName: "Riya",
    createdAt: "2026-11-15",
  },
  {
    id: "l_overdue",
    tenantId: "biz_1",
    name: "Karan Malhotra",
    phone: "9811122233",
    source: "WhatsApp",
    status: "contacted",
    priority: "Warm",
    budget: 20000,
    followUpDate: "2026-11-12",
    createdAt: "2026-11-10",
  },
  {
    id: "l_won",
    tenantId: "biz_1",
    name: "Sneha Joshi",
    phone: "9900112233",
    source: "Website",
    status: "converted",
    budget: 50000,
    createdAt: "2026-11-05",
  },
  {
    id: "l_lost",
    tenantId: "biz_1",
    name: "Deepak Rao",
    phone: "9765432109",
    source: "Facebook",
    status: "lost",
    budget: 15000,
    lostReason: "Price / Budget Mismatch",
    createdAt: "2026-11-02",
  },
];

test("isLeadOpenInPipeline excludes converted and lost leads from active quota", () => {
  assert.equal(isLeadOpenInPipeline("new"), true);
  assert.equal(isLeadOpenInPipeline("negotiation"), true);
  assert.equal(isLeadOpenInPipeline("converted"), false);
  assert.equal(isLeadOpenInPipeline("lost"), false);
  assert.equal(getNextPipelineStage("new"), "contacted");
  assert.equal(getNextPipelineStage("negotiation"), null);
});

test("calculateLeadIntentScore rewards high-stage hot deals and penalizes stale overdue leads", () => {
  const hotScore = calculateLeadIntentScore(SAMPLE_LEADS[0], "2026-11-18");
  const overdueScore = calculateLeadIntentScore(SAMPLE_LEADS[1], "2026-11-18");
  assert.ok(hotScore >= 85, `expected hot negotiation lead >= 85, got ${hotScore}`);
  assert.ok(overdueScore < hotScore);
  assert.equal(calculateLeadIntentScore(SAMPLE_LEADS[2], "2026-11-18"), 100);
  assert.equal(calculateLeadIntentScore(SAMPLE_LEADS[3], "2026-11-18"), 10);
});

test("computeCrmPipelineStats counts only open leads toward activeLeadsCount and computes win rate", () => {
  const stats = computeCrmPipelineStats(SAMPLE_LEADS, "2026-11-18");
  assert.equal(stats.totalLeads, 4);
  assert.equal(stats.activeLeadsCount, 2);
  assert.equal(stats.openPipelineWorth, 100000);
  // 80000 * 0.8 + 20000 * 0.3 = 64000 + 6000 = 70000
  assert.equal(stats.weightedForecastWorth, 70000);
  assert.equal(stats.convertedCount, 1);
  assert.equal(stats.lostCount, 1);
  assert.equal(stats.winRatePercent, 50);
  assert.equal(stats.hotLeadsCount, 1);
  assert.equal(stats.overdueFollowUpsCount, 1);
  assert.equal(stats.todayFollowUpsCount, 1);
  assert.equal(stats.dueOrOverdueCount, 2);
});

test("classifyFollowUpUrgency & addDaysToYmd handle calendar dates deterministically", () => {
  assert.equal(classifyFollowUpUrgency(SAMPLE_LEADS[0], "2026-11-18"), "today");
  assert.equal(classifyFollowUpUrgency(SAMPLE_LEADS[1], "2026-11-18"), "overdue");
  assert.equal(classifyFollowUpUrgency(SAMPLE_LEADS[2], "2026-11-18"), "closed");
  assert.equal(addDaysToYmd("2026-11-29", 3), "2026-12-02");
});

test("findDuplicatePhoneMatch matches 10-digit normalized phone across leads and customers", () => {
  const customers: Customer[] = [
    {
      id: "c_9900112233",
      tenantId: "biz_1",
      name: "Sneha Joshi",
      phone: "9900112233",
      email: "",
      address: "",
      state: "Maharashtra",
      creditBalance: 0,
      createdAt: "2026-11-05",
    },
  ];

  const dup = findDuplicatePhoneMatch("098765-43210", SAMPLE_LEADS, customers);
  assert.equal(dup.normalizedPhone, "9876543210");
  assert.equal(dup.existingLead?.id, "l_open_hot");
  assert.equal(dup.existingCustomer, null);

  // Excluding self when editing should not self-flag
  const selfEdit = findDuplicatePhoneMatch("9876543210", SAMPLE_LEADS, customers, "l_open_hot");
  assert.equal(selfEdit.existingLead, null);

  const custMatch = findDuplicatePhoneMatch("+91 99001 12233", SAMPLE_LEADS, customers, "l_won");
  assert.equal(custMatch.existingCustomer?.id, "c_9900112233");
});

test("filterAndSortLeads filters by assignee, follow-up urgency, search, and sorts by value", () => {
  const dueList = filterAndSortLeads(
    SAMPLE_LEADS,
    {
      search: "",
      stage: "open",
      source: "all",
      priority: "all",
      assignee: "all",
      followUp: "due_or_overdue",
      sortBy: "value_desc",
    },
    "2026-11-18"
  );
  assert.equal(dueList.length, 2);
  assert.equal(dueList[0].id, "l_open_hot");
  assert.equal(dueList[1].id, "l_overdue");

  const mineOnly = filterAndSortLeads(
    SAMPLE_LEADS,
    {
      search: "inverter",
      stage: "all",
      source: "all",
      priority: "all",
      assignee: "mine",
      followUp: "all",
      sortBy: "newest",
      currentUserId: "staff_1",
    },
    "2026-11-18"
  );
  assert.equal(mineOnly.length, 1);
  assert.equal(mineOnly[0].id, "l_open_hot");
});

test("CSV export neutralizes formula injection and CSV import deduplicates cleanly", () => {
  const riskyLead: Lead = {
    id: "l_formula",
    tenantId: "biz_1",
    name: "=CMD|' /C calc'!A0",
    phone: "9123456789",
    source: "Walk-in",
    status: "new",
    notes: "Line 1, with comma",
    createdAt: "2026-11-18",
  };
  const csv = exportLeadsToCsv([riskyLead], "2026-11-18");
  assert.ok(csv.includes("'=CMD|"));
  assert.ok(csv.includes('"Line 1, with comma"'));

  const importCsv = [
    "Name,Phone,Source,Stage,Priority,DealValue,FollowUpDate,Notes",
    "Priya Nair,9845012345,Instagram,interested,Hot,32000,2026-11-22,Wants showroom demo",
    "Duplicate Aarav,9876543210,WhatsApp,new,Warm,10000,,Already exists",
    ",9999999999,Walk-in,new,Warm,0,,Missing name",
  ].join("\n");

  const parsed = parseLeadsCsvImport(importCsv, SAMPLE_LEADS);
  assert.equal(parsed.validRows.length, 1);
  assert.equal(parsed.validRows[0].name, "Priya Nair");
  assert.equal(parsed.validRows[0].source, "Instagram");
  assert.equal(parsed.validRows[0].budget, 32000);
  assert.equal(parsed.skippedRows.length, 2);

  const act = createLeadActivityEntry("note", "Called client and shared brochure", "Admin");
  const timeline = prependLeadActivity([], act);
  assert.equal(timeline.length, 1);
  assert.equal(timeline[0].actorName, "Admin");
});

test("Phase 2: storefront/funnel lead promotion, follow-up task payload, billing href & WhatsApp templates", () => {
  const crmLead = buildCrmLeadFromStorefrontPayload(
    {
      id: "sf_101",
      name: "Meera Kapoor",
      phone: "9812345678",
      contactType: "phone",
      source: "funnel_lead_capture",
      funnelId: "fn_diwali",
      funnelSlug: "diwali-solar-sale",
      subscribedAtIso: "2026-11-18T10:30:00.000Z",
    },
    "biz_1",
    "2026-11-18"
  );
  assert.equal(crmLead.id, "crm_sf_9812345678");
  assert.equal(crmLead.source, "Funnel");
  assert.equal(crmLead.funnelSlug, "diwali-solar-sale");
  assert.ok((crmLead.intentScore || 0) >= 40);

  const taskPayload = buildFollowUpTaskPayload({
    lead: SAMPLE_LEADS[0],
    businessId: "biz_1",
    actorName: "Riya",
  });
  assert.equal(taskPayload.id, getLeadFollowUpTaskId("l_open_hot"));
  assert.equal(taskPayload.leadId, "l_open_hot");
  assert.equal(taskPayload.priority, "high");
  assert.equal(taskPayload.dueDate, "2026-11-18");

  assert.equal(
    buildBillingHrefForLead({ id: "l_open_hot", convertedCustomerId: "c_9876543210" }, "quotation"),
    "/billing?mode=quotation&leadId=l_open_hot&customerId=c_9876543210"
  );
  assert.equal(
    buildBillingHrefForLead({ id: "l_open_hot" }, "sale"),
    "/billing?leadId=l_open_hot"
  );

  const templates = buildWhatsAppLeadTemplates(SAMPLE_LEADS[0], "Mehta Tech", "₹");
  assert.equal(templates.length, 4);
  assert.ok(templates[0].message.includes("Aarav"));
  assert.ok(templates[1].message.includes("80,000"));
});

