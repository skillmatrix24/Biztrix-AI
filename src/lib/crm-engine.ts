import {
  type Customer,
  type Lead,
  type LeadActivity,
  type LeadActivityType,
  type LeadPriority,
  type LeadSource,
  type LeadStatus,
} from "./mock-db";
import { normalizePhoneNumber } from "./utils";

export interface CrmStageDefinition {
  id: LeadStatus;
  label: string;
  shortLabel: string;
  probability: number;
  isClosed: boolean;
  dotClass: string;
  toneTextClass: string;
}

export const CRM_STAGES: CrmStageDefinition[] = [
  {
    id: "new",
    label: "New Leads",
    shortLabel: "New",
    probability: 0.15,
    isClosed: false,
    dotClass: "bg-sky-600",
    toneTextClass: "text-sky-700",
  },
  {
    id: "contacted",
    label: "Contacted",
    shortLabel: "Contacted",
    probability: 0.3,
    isClosed: false,
    dotClass: "bg-amber-600",
    toneTextClass: "text-amber-700",
  },
  {
    id: "interested",
    label: "Interested",
    shortLabel: "Interested",
    probability: 0.55,
    isClosed: false,
    dotClass: "bg-indigo-600",
    toneTextClass: "text-indigo-700",
  },
  {
    id: "negotiation",
    label: "Negotiation",
    shortLabel: "Negotiation",
    probability: 0.8,
    isClosed: false,
    dotClass: "bg-violet-600",
    toneTextClass: "text-violet-700",
  },
  {
    id: "converted",
    label: "Converted",
    shortLabel: "Converted",
    probability: 1,
    isClosed: true,
    dotClass: "bg-emerald-600",
    toneTextClass: "text-emerald-700",
  },
  {
    id: "lost",
    label: "Lost",
    shortLabel: "Lost",
    probability: 0,
    isClosed: true,
    dotClass: "bg-rose-600",
    toneTextClass: "text-rose-700",
  },
];

export const CRM_SOURCES: LeadSource[] = [
  "Walk-in",
  "WhatsApp",
  "Website",
  "Funnel",
  "Facebook",
  "Instagram",
  "Google",
  "Referral",
  "Other",
];

export const CRM_PRIORITIES: LeadPriority[] = ["Hot", "Warm", "Cold"];

export const CRM_LOST_REASONS: string[] = [
  "Price / Budget Mismatch",
  "Bought from Competitor",
  "Unresponsive / No Answer",
  "Requirement Postponed",
  "Product Out of Stock",
  "Invalid / Spam Inquiry",
  "Other",
];

export type FollowUpUrgency = "overdue" | "today" | "upcoming" | "unscheduled" | "closed";

export type LeadSortOption = "newest" | "intent_desc" | "value_desc" | "followup_asc";

export interface LeadFilterState {
  search: string;
  stage: "all" | "open" | LeadStatus;
  source: "all" | LeadSource;
  priority: "all" | LeadPriority;
  assignee: "all" | "mine" | "unassigned" | string;
  followUp: "all" | "due_or_overdue" | "overdue" | "today" | "upcoming" | "unscheduled";
  sortBy: LeadSortOption;
  currentUserId?: string;
}

export interface StageSummaryMetric {
  id: LeadStatus;
  label: string;
  count: number;
  worth: number;
}

export interface CrmPipelineStats {
  totalLeads: number;
  activeLeadsCount: number;
  openPipelineWorth: number;
  weightedForecastWorth: number;
  convertedCount: number;
  convertedWorth: number;
  lostCount: number;
  winRatePercent: number;
  hotLeadsCount: number;
  overdueFollowUpsCount: number;
  todayFollowUpsCount: number;
  dueOrOverdueCount: number;
  unscheduledOpenCount: number;
  stageBreakdown: Record<LeadStatus, StageSummaryMetric>;
}

export function getTodayLocalYmd(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToYmd(baseYmd: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(baseYmd.trim());
  const baseDate = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0)
    : new Date();
  baseDate.setDate(baseDate.getDate() + days);
  return getTodayLocalYmd(baseDate);
}

export function diffCalendarDaysYmd(targetYmd: string, referenceYmd: string): number {
  const parse = (ymd: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
    if (!m) return null;
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  };
  const a = parse(targetYmd);
  const b = parse(referenceYmd);
  if (a === null || b === null) return 0;
  return Math.round((a - b) / 86_400_000);
}

export function isLeadOpenInPipeline(status?: LeadStatus | string | null): boolean {
  const normalized = (status || "new").toLowerCase();
  return normalized !== "converted" && normalized !== "lost";
}

export function getNextPipelineStage(status?: LeadStatus | string | null): LeadStatus | null {
  switch (status || "new") {
    case "new":
      return "contacted";
    case "contacted":
      return "interested";
    case "interested":
      return "negotiation";
    default:
      return null;
  }
}

export function normalizeLeadPriority(priority?: string | null, intentScore?: number): LeadPriority {
  if (priority === "Hot" || priority === "Warm" || priority === "Cold") {
    return priority;
  }
  const score = Number(intentScore || 0);
  if (score >= 75) return "Hot";
  if (score > 0 && score < 40) return "Cold";
  return "Warm";
}

/**
 * Deterministically computes a 0-100 lead intent score based on stage,
 * priority, deal value, source quality, product interest, and follow-up discipline.
 */
export function calculateLeadIntentScore(
  lead: Partial<Lead>,
  todayYmd: string = getTodayLocalYmd()
): number {
  const status = (lead.status || "new") as LeadStatus;
  if (status === "converted") return 100;
  if (status === "lost") return 10;

  const stageBase: Record<LeadStatus, number> = {
    new: 35,
    contacted: 48,
    interested: 65,
    negotiation: 80,
    converted: 100,
    lost: 10,
  };

  let score = stageBase[status] ?? 35;

  if (lead.priority === "Hot") score += 14;
  else if (lead.priority === "Warm") score += 4;
  else if (lead.priority === "Cold") score -= 10;

  const sourceBonus: Record<string, number> = {
    Referral: 8,
    WhatsApp: 6,
    "Walk-in": 6,
    Funnel: 6,
    Website: 5,
    Google: 5,
    Instagram: 3,
    Facebook: 3,
    Other: 2,
  };
  score += sourceBonus[lead.source || "Walk-in"] ?? 2;

  const budget = Number(lead.budget || 0);
  if (budget > 0) score += 6;
  if (budget >= 25_000) score += 4;

  if (lead.email && lead.email.trim().includes("@")) score += 3;
  if ((lead.companyName && lead.companyName.trim()) || (lead.gstin && lead.gstin.trim())) {
    score += 3;
  }

  const hasProductInterest =
    (Array.isArray(lead.viewedProducts) && lead.viewedProducts.length > 0) ||
    (Array.isArray(lead.interestedProductIds) && lead.interestedProductIds.length > 0) ||
    Boolean(lead.interest && lead.interest.trim());
  if (hasProductInterest) score += 5;

  const activityCount = Array.isArray(lead.activities) ? lead.activities.length : 0;
  if (activityCount >= 3) score += 5;
  else if (activityCount >= 1) score += 2;

  if (lead.followUpDate && /^\d{4}-\d{2}-\d{2}$/.test(lead.followUpDate)) {
    const deltaDays = diffCalendarDaysYmd(lead.followUpDate, todayYmd);
    if (deltaDays >= 0) {
      score += 3;
    } else if (deltaDays <= -4) {
      score -= 8;
    } else {
      score -= 3;
    }
  }

  return Math.max(5, Math.min(99, Math.round(score)));
}

export function resolveEffectiveIntentScore(
  lead: Partial<Lead>,
  todayYmd: string = getTodayLocalYmd()
): number {
  const status = (lead.status || "new") as LeadStatus;
  if (status === "converted") return 100;
  if (status === "lost") return 10;
  const stored = Number(lead.intentScore);
  // Legacy leads all defaulted to hardcoded 50; compute real contextual score for them
  if (!Number.isFinite(stored) || stored <= 0 || stored === 50) {
    return calculateLeadIntentScore(lead, todayYmd);
  }
  return Math.max(5, Math.min(99, Math.round(stored)));
}

export function classifyFollowUpUrgency(
  lead: Partial<Lead>,
  todayYmd: string = getTodayLocalYmd()
): FollowUpUrgency {
  if (!isLeadOpenInPipeline(lead.status)) {
    return "closed";
  }
  const dateStr = (lead.followUpDate || "").trim();
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return "unscheduled";
  }
  if (dateStr < todayYmd) return "overdue";
  if (dateStr === todayYmd) return "today";
  return "upcoming";
}

export function computeCrmPipelineStats(
  leads: Lead[],
  todayYmd: string = getTodayLocalYmd()
): CrmPipelineStats {
  const stageBreakdown = CRM_STAGES.reduce(
    (acc, st) => {
      acc[st.id] = { id: st.id, label: st.label, count: 0, worth: 0 };
      return acc;
    },
    {} as Record<LeadStatus, StageSummaryMetric>
  );

  let activeLeadsCount = 0;
  let openPipelineWorth = 0;
  let weightedForecastWorth = 0;
  let convertedCount = 0;
  let convertedWorth = 0;
  let lostCount = 0;
  let hotLeadsCount = 0;
  let overdueFollowUpsCount = 0;
  let todayFollowUpsCount = 0;
  let unscheduledOpenCount = 0;

  for (const lead of leads) {
    const status: LeadStatus = CRM_STAGES.some((s) => s.id === lead.status)
      ? lead.status
      : "new";
    const stageDef = CRM_STAGES.find((s) => s.id === status)!;
    const worth = Math.max(0, Number(lead.budget) || 0);

    stageBreakdown[status].count += 1;
    stageBreakdown[status].worth += worth;

    if (status === "converted") {
      convertedCount += 1;
      convertedWorth += worth;
      continue;
    }

    if (status === "lost") {
      lostCount += 1;
      continue;
    }

    activeLeadsCount += 1;
    openPipelineWorth += worth;
    weightedForecastWorth += Math.round(worth * stageDef.probability);

    const effectiveScore = resolveEffectiveIntentScore(lead, todayYmd);
    if (lead.priority === "Hot" || effectiveScore >= 75) {
      hotLeadsCount += 1;
    }

    const urgency = classifyFollowUpUrgency(lead, todayYmd);
    if (urgency === "overdue") overdueFollowUpsCount += 1;
    else if (urgency === "today") todayFollowUpsCount += 1;
    else if (urgency === "unscheduled") unscheduledOpenCount += 1;
  }

  const closedCount = convertedCount + lostCount;
  const winRatePercent =
    closedCount > 0
      ? Math.round((convertedCount / closedCount) * 100)
      : leads.length > 0
        ? Math.round((convertedCount / leads.length) * 100)
        : 0;

  return {
    totalLeads: leads.length,
    activeLeadsCount,
    openPipelineWorth,
    weightedForecastWorth,
    convertedCount,
    convertedWorth,
    lostCount,
    winRatePercent,
    hotLeadsCount,
    overdueFollowUpsCount,
    todayFollowUpsCount,
    dueOrOverdueCount: overdueFollowUpsCount + todayFollowUpsCount,
    unscheduledOpenCount,
    stageBreakdown,
  };
}

export interface DuplicatePhoneCheckResult {
  normalizedPhone: string;
  existingLead: Lead | null;
  existingCustomer: Customer | null;
}

export function findDuplicatePhoneMatch(
  rawPhone: string,
  leads: Lead[],
  customers: Customer[],
  excludeLeadId?: string
): DuplicatePhoneCheckResult {
  const normalizedPhone = normalizePhoneNumber(rawPhone);
  if (normalizedPhone.length < 10) {
    return { normalizedPhone, existingLead: null, existingCustomer: null };
  }

  const existingLead =
    leads.find(
      (l) =>
        l.id !== excludeLeadId &&
        normalizePhoneNumber(l.phone || l.normalizedPhone || "") === normalizedPhone
    ) || null;

  const existingCustomer =
    customers.find(
      (c) =>
        !c.isArchived &&
        normalizePhoneNumber(c.phone || c.normalizedPhone || "") === normalizedPhone
    ) || null;

  return { normalizedPhone, existingLead, existingCustomer };
}

function getSortableTimestamp(lead: Lead): string {
  if (typeof lead.createdAt === "string" && lead.createdAt) {
    return lead.createdAt;
  }
  return "";
}

export function filterAndSortLeads(
  leads: Lead[],
  filters: LeadFilterState,
  todayYmd: string = getTodayLocalYmd()
): Lead[] {
  const q = filters.search.trim().toLowerCase();
  const qDigits = filters.search.replace(/\D/g, "");

  const filtered = leads.filter((lead) => {
    const status = (lead.status || "new") as LeadStatus;

    if (filters.stage === "open") {
      if (!isLeadOpenInPipeline(status)) return false;
    } else if (filters.stage !== "all" && status !== filters.stage) {
      return false;
    }

    if (filters.source !== "all" && lead.source !== filters.source) {
      return false;
    }

    if (filters.priority !== "all") {
      const resolvedPriority = normalizeLeadPriority(
        lead.priority,
        resolveEffectiveIntentScore(lead, todayYmd)
      );
      if (resolvedPriority !== filters.priority) return false;
    }

    if (filters.assignee === "mine") {
      if (!filters.currentUserId || lead.assignedTo !== filters.currentUserId) {
        return false;
      }
    } else if (filters.assignee === "unassigned") {
      if (lead.assignedTo && lead.assignedTo.trim() !== "") return false;
    } else if (filters.assignee !== "all") {
      if (lead.assignedTo !== filters.assignee) return false;
    }

    if (filters.followUp !== "all") {
      const urgency = classifyFollowUpUrgency(lead, todayYmd);
      if (filters.followUp === "due_or_overdue") {
        if (urgency !== "overdue" && urgency !== "today") return false;
      } else if (urgency !== filters.followUp) {
        return false;
      }
    }

    if (q) {
      const haystacks = [
        lead.name,
        lead.phone,
        lead.email,
        lead.companyName,
        lead.gstin,
        lead.location,
        lead.interest,
        lead.notes,
        lead.assignedName,
        ...(Array.isArray(lead.viewedProducts) ? lead.viewedProducts : []),
      ]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase());

      const textMatch = haystacks.some((h) => h.includes(q));
      const phoneDigitsMatch =
        qDigits.length >= 3 && (lead.phone || "").replace(/\D/g, "").includes(qDigits);

      if (!textMatch && !phoneDigitsMatch) return false;
    }

    return true;
  });

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    if (filters.sortBy === "intent_desc") {
      return (
        resolveEffectiveIntentScore(b, todayYmd) - resolveEffectiveIntentScore(a, todayYmd)
      );
    }
    if (filters.sortBy === "value_desc") {
      return (Number(b.budget) || 0) - (Number(a.budget) || 0);
    }
    if (filters.sortBy === "followup_asc") {
      const aDate = a.followUpDate && isLeadOpenInPipeline(a.status) ? a.followUpDate : "9999-99-99";
      const bDate = b.followUpDate && isLeadOpenInPipeline(b.status) ? b.followUpDate : "9999-99-99";
      if (aDate !== bDate) return aDate.localeCompare(bDate);
      return resolveEffectiveIntentScore(b, todayYmd) - resolveEffectiveIntentScore(a, todayYmd);
    }
    // newest
    return getSortableTimestamp(b).localeCompare(getSortableTimestamp(a));
  });

  return sorted;
}

export function createLeadActivityEntry(
  type: LeadActivityType,
  description: string,
  actorName?: string,
  metadata?: Record<string, any>
): LeadActivity {
  const now = new Date();
  const formatted = `${getTodayLocalYmd(now)} ${now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })}`;
  return {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    description: description.trim(),
    timestamp: formatted,
    ...(actorName ? { actorName } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

export function prependLeadActivity(
  existing: LeadActivity[] | undefined,
  entry: LeadActivity,
  maxEntries: number = 50
): LeadActivity[] {
  const base = Array.isArray(existing) ? existing : [];
  return [entry, ...base].slice(0, maxEntries);
}

export function sanitizeSpreadsheetCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const trimmedStart = raw.trimStart();
  const safe =
    trimmedStart.startsWith("=") ||
    trimmedStart.startsWith("+") ||
    trimmedStart.startsWith("-") ||
    trimmedStart.startsWith("@")
      ? `'${raw}`
      : raw;

  if (safe.includes(",") || safe.includes('"') || safe.includes("\n") || safe.includes("\r")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function exportLeadsToCsv(leads: Lead[], todayYmd: string = getTodayLocalYmd()): string {
  const headers = [
    "Name",
    "Phone",
    "Email",
    "Company",
    "GSTIN",
    "Source",
    "Stage",
    "Priority",
    "IntentScore",
    "DealValue",
    "Interest",
    "Location",
    "AssignedTo",
    "FollowUpDate",
    "FollowUpTime",
    "CreatedAt",
    "LostReason",
    "Notes",
  ];

  const lines = [headers.join(",")];

  for (const lead of leads) {
    const score = resolveEffectiveIntentScore(lead, todayYmd);
    const priority = normalizeLeadPriority(lead.priority, score);
    const interestSummary =
      lead.interest ||
      (Array.isArray(lead.viewedProducts) ? lead.viewedProducts.join("; ") : "");

    const row = [
      lead.name || "",
      lead.phone || "",
      lead.email || "",
      lead.companyName || "",
      lead.gstin || "",
      lead.source || "Walk-in",
      lead.status || "new",
      priority,
      score,
      Number(lead.budget || 0),
      interestSummary,
      lead.location || "",
      lead.assignedName || "",
      lead.followUpDate || "",
      lead.followUpTime || "",
      lead.createdAt || "",
      lead.lostReason || "",
      lead.notes || "",
    ].map(sanitizeSpreadsheetCell);

    lines.push(row.join(","));
  }

  return lines.join("\n");
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

export interface ParsedCsvLeadDraft {
  name: string;
  phone: string;
  normalizedPhone: string;
  email?: string;
  companyName?: string;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  budget: number;
  interest?: string;
  location?: string;
  followUpDate?: string;
  notes?: string;
}

export interface CsvLeadParseResult {
  validRows: ParsedCsvLeadDraft[];
  skippedRows: Array<{ rowNumber: number; reason: string; rawName?: string }>;
}

export function buildSampleLeadsCsvTemplate(): string {
  return [
    "Name,Phone,Email,Company,Source,Stage,Priority,DealValue,Interest,Location,FollowUpDate,Notes",
    "Rajesh Verma,9876543210,rajesh@vermaenterprises.in,Verma Enterprises,WhatsApp,new,Hot,45000,Solar Inverter 5kW,Jaipur,2026-11-20,Requested bulk dealer quotation",
    "Neha Kulkarni,9820112233,neha@studio.in,,Website,interested,Warm,18500,Ergonomic Desk Setup,Pune,2026-11-21,Prefers afternoon call",
  ].join("\n");
}

export function parseLeadsCsvImport(
  csvText: string,
  existingLeads: Lead[] = []
): CsvLeadParseResult {
  const rawLines = csvText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  if (rawLines.length < 2) {
    return {
      validRows: [],
      skippedRows: [{ rowNumber: 1, reason: "CSV must include a header row and at least 1 data row" }],
    };
  }

  const headerCells = splitCsvLine(rawLines[0]).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, "")
  );

  const findCol = (aliases: string[]) =>
    headerCells.findIndex((h) => aliases.includes(h));

  const idxName = findCol(["name", "clientname", "customername", "fullname", "leadname"]);
  const idxPhone = findCol(["phone", "mobile", "contact", "phonenumber", "mobilenumber", "whatsapp"]);
  const idxEmail = findCol(["email", "emailaddress"]);
  const idxCompany = findCol(["company", "companyname", "business", "businessname", "firm"]);
  const idxSource = findCol(["source", "leadsource", "channel"]);
  const idxStage = findCol(["stage", "status", "leadstatus"]);
  const idxPriority = findCol(["priority", "temperature"]);
  const idxBudget = findCol(["dealvalue", "budget", "value", "amount", "expectedvalue"]);
  const idxInterest = findCol(["interest", "product", "products", "requirement"]);
  const idxLocation = findCol(["location", "city", "area", "address"]);
  const idxFollowUp = findCol(["followupdate", "followup", "nextfollowup"]);
  const idxNotes = findCol(["notes", "note", "remarks", "comment", "description"]);

  if (idxName === -1 || idxPhone === -1) {
    return {
      validRows: [],
      skippedRows: [
        {
          rowNumber: 1,
          reason: "Header row must contain 'Name' and 'Phone' columns",
        },
      ],
    };
  }

  const existingPhones = new Set(
    existingLeads
      .map((l) => normalizePhoneNumber(l.phone || l.normalizedPhone || ""))
      .filter((p) => p.length >= 10)
  );
  const seenInBatch = new Set<string>();

  const validRows: ParsedCsvLeadDraft[] = [];
  const skippedRows: Array<{ rowNumber: number; reason: string; rawName?: string }> = [];

  for (let i = 1; i < rawLines.length; i += 1) {
    const rowNumber = i + 1;
    const cols = splitCsvLine(rawLines[i]);
    const name = (cols[idxName] || "").trim().slice(0, 120);
    const rawPhone = (cols[idxPhone] || "").trim();
    const digits = rawPhone.replace(/\D/g, "");
    const normalizedPhone = normalizePhoneNumber(rawPhone);

    if (!name) {
      skippedRows.push({ rowNumber, reason: "Missing client name" });
      continue;
    }
    if (digits.length < 7) {
      skippedRows.push({ rowNumber, reason: "Invalid phone number", rawName: name });
      continue;
    }
    if (normalizedPhone.length >= 10) {
      if (existingPhones.has(normalizedPhone)) {
        skippedRows.push({
          rowNumber,
          reason: `Duplicate phone (${normalizedPhone}) already in pipeline`,
          rawName: name,
        });
        continue;
      }
      if (seenInBatch.has(normalizedPhone)) {
        skippedRows.push({
          rowNumber,
          reason: `Duplicate phone (${normalizedPhone}) repeated in CSV`,
          rawName: name,
        });
        continue;
      }
      seenInBatch.add(normalizedPhone);
    }

    const rawSource = idxSource >= 0 ? (cols[idxSource] || "").trim() : "";
    const matchedSource =
      CRM_SOURCES.find((s) => s.toLowerCase() === rawSource.toLowerCase()) || "Walk-in";

    const rawStage = idxStage >= 0 ? (cols[idxStage] || "").trim().toLowerCase() : "";
    const matchedStage =
      CRM_STAGES.find((s) => s.id === rawStage || s.shortLabel.toLowerCase() === rawStage)?.id ||
      "new";

    const rawPriority = idxPriority >= 0 ? (cols[idxPriority] || "").trim().toLowerCase() : "";
    const matchedPriority: LeadPriority =
      rawPriority === "hot" ? "Hot" : rawPriority === "cold" ? "Cold" : "Warm";

    const rawBudget = idxBudget >= 0 ? (cols[idxBudget] || "").replace(/[^0-9.]/g, "") : "";
    const budget = Math.max(0, Math.round(Number(rawBudget) || 0));

    const rawFollowUp = idxFollowUp >= 0 ? (cols[idxFollowUp] || "").trim() : "";
    const followUpDate = /^\d{4}-\d{2}-\d{2}$/.test(rawFollowUp) ? rawFollowUp : undefined;

    validRows.push({
      name,
      phone: rawPhone,
      normalizedPhone,
      email: idxEmail >= 0 && cols[idxEmail] ? cols[idxEmail].trim() : undefined,
      companyName: idxCompany >= 0 && cols[idxCompany] ? cols[idxCompany].trim() : undefined,
      source: matchedSource,
      status: matchedStage,
      priority: matchedPriority,
      budget,
      interest: idxInterest >= 0 && cols[idxInterest] ? cols[idxInterest].trim() : undefined,
      location: idxLocation >= 0 && cols[idxLocation] ? cols[idxLocation].trim() : undefined,
      followUpDate,
      notes: idxNotes >= 0 && cols[idxNotes] ? cols[idxNotes].trim() : undefined,
    });
  }

  return { validRows, skippedRows };
}

// --- PHASE 2: CROSS-MODULE CONNECTIVITY HELPERS ---

export interface StorefrontLeadRelayInput {
  id: string;
  name?: string;
  contact?: string;
  contactType?: "phone" | "email" | string;
  phone?: string;
  email?: string;
  source?: string;
  sourceSectionId?: string;
  funnelId?: string;
  funnelSlug?: string;
  subscribedAtIso?: string;
}

export function resolveCrmLeadIdForStorefrontLead(payload: StorefrontLeadRelayInput): string {
  const rawPhone = payload.phone || (payload.contactType === "phone" ? payload.contact : "") || "";
  const normalized = normalizePhoneNumber(rawPhone);
  if (normalized.length >= 10) {
    return `crm_sf_${normalized}`;
  }
  const cleanId = String(payload.id || Date.now()).replace(/[^a-zA-Z0-9_-]/g, "");
  return `crm_sf_${cleanId}`;
}

export function buildCrmLeadFromStorefrontPayload(
  payload: StorefrontLeadRelayInput,
  businessId: string,
  todayYmd: string = getTodayLocalYmd()
): Lead {
  const crmId = resolveCrmLeadIdForStorefrontLead(payload);
  const rawPhone =
    payload.phone || (payload.contactType === "phone" ? payload.contact || "" : "");
  const normalizedPhone = normalizePhoneNumber(rawPhone);
  const email =
    payload.email || (payload.contactType === "email" ? payload.contact || "" : "");
  const isFunnel = Boolean(payload.funnelId || payload.source === "funnel_lead_capture");
  const source: LeadSource = isFunnel ? "Funnel" : "Website";
  const createdDate =
    payload.subscribedAtIso && /^\d{4}-\d{2}-\d{2}/.test(payload.subscribedAtIso)
      ? payload.subscribedAtIso.slice(0, 10)
      : todayYmd;

  const interestLabel = payload.funnelSlug
    ? `Sales Funnel (${payload.funnelSlug})`
    : "Online Storefront VIP / Deal Inquiry";

  const draft: Lead = {
    id: crmId,
    tenantId: businessId,
    name: (payload.name || "Storefront Visitor").trim(),
    phone: rawPhone || email || "Online Inquiry",
    normalizedPhone: normalizedPhone || undefined,
    email: email || undefined,
    source,
    status: "new",
    priority: "Warm",
    interest: interestLabel,
    ...(payload.funnelSlug ? { funnelSlug: payload.funnelSlug } : {}),
    createdAt: createdDate,
    activities: [
      {
        id: `act_sf_${crmId}`,
        type: "form",
        description: isFunnel
          ? `Captured from Sales Funnel${payload.funnelSlug ? ` /${payload.funnelSlug}` : ""}`
          : "Captured from Public Storefront VIP Deal Alert form",
        timestamp: createdDate,
      },
    ],
  };

  draft.intentScore = calculateLeadIntentScore(draft, todayYmd);
  return draft;
}

export function getLeadFollowUpTaskId(leadId: string): string {
  return `task_lead_${leadId}`;
}

export function buildFollowUpTaskPayload(params: {
  lead: Partial<Lead> & { id: string; name: string };
  businessId: string;
  actorName?: string;
}) {
  const { lead, businessId, actorName = "CRM" } = params;
  const taskId = getLeadFollowUpTaskId(lead.id);
  const priority =
    lead.priority === "Hot" ? "high" : lead.priority === "Cold" ? "low" : "medium";
  const interestPart = lead.interest
    ? ` · Requirement: ${lead.interest}`
    : Array.isArray(lead.viewedProducts) && lead.viewedProducts.length > 0
      ? ` · Items: ${lead.viewedProducts.join(", ")}`
      : "";

  return {
    id: taskId,
    businessId,
    tenantId: businessId,
    leadId: lead.id,
    leadName: lead.name,
    title: `CRM Follow-up: ${lead.name}`,
    description: `Call / WhatsApp ${lead.phone || ""}${
      lead.followUpTime ? ` at ${lead.followUpTime}` : ""
    }${interestPart}${lead.notes ? ` — ${lead.notes}` : ""}`.trim(),
    assignedTo: lead.assignedTo || "",
    assignedName: lead.assignedName || "Unassigned",
    dueDate: lead.followUpDate || "",
    dueTime: lead.followUpTime || "",
    priority: priority as "high" | "medium" | "low",
    status: "pending" as const,
    category: "CRM Follow-up",
    remindWhatsApp: true,
    repeat: "none" as const,
    timeSpent: 0,
    logs: [
      {
        action: `Synced from Sales CRM (${lead.followUpDate || "scheduled"})`,
        by: actorName,
        time: new Date().toISOString(),
      },
    ],
  };
}

export function buildBillingHrefForLead(
  lead: Pick<Lead, "id" | "convertedCustomerId" | "budget">,
  mode: "quotation" | "sale"
): string {
  const params = new URLSearchParams();
  if (mode === "quotation") {
    params.set("mode", "quotation");
  }
  params.set("leadId", lead.id);
  if (lead.convertedCustomerId) {
    params.set("customerId", lead.convertedCustomerId);
  }
  return `/billing?${params.toString()}`;
}

export interface WhatsAppLeadTemplate {
  id: string;
  label: string;
  message: string;
}

export function buildWhatsAppLeadTemplates(
  lead: Partial<Lead> & { name: string },
  businessName?: string,
  currencySymbol: string = "₹"
): WhatsAppLeadTemplate[] {
  const brand = businessName?.trim() || "our team";
  const firstName = (lead.name || "there").trim().split(/\s+/)[0];
  const itemContext =
    lead.interest ||
    (Array.isArray(lead.viewedProducts) && lead.viewedProducts.length > 0
      ? lead.viewedProducts.join(", ")
      : "your inquiry");
  const dealText =
    Number(lead.budget || 0) > 0
      ? ` (${currencySymbol}${Number(lead.budget).toLocaleString("en-IN")})`
      : "";

  return [
    {
      id: "intro",
      label: "First Intro",
      message: `Hi ${firstName}, greetings from ${brand}! Thank you for reaching out regarding ${itemContext}. Please let us know a convenient time for a quick call or share any specific requirements.`,
    },
    {
      id: "quote_followup",
      label: "Quote Follow-up",
      message: `Hi ${firstName}, following up from ${brand} on the estimate shared for ${itemContext}${dealText}. Let us know if you would like any quantity or configuration adjustments so we can finalize it for you.`,
    },
    {
      id: "reminder",
      label: "Callback Reminder",
      message: `Hi ${firstName}, quick check-in from ${brand} regarding ${itemContext}. Should we connect today${
        lead.followUpTime ? ` around ${lead.followUpTime}` : ""
      } to take this forward?`,
    },
    {
      id: "closing",
      label: "Closing Offer",
      message: `Hi ${firstName}, we have reserved priority stock/slot for ${itemContext} at ${brand}. Confirm whenever ready and we will generate your GST invoice right away!`,
    },
  ];
}
