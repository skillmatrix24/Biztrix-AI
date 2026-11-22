/**
 * High-Speed Knowledge Search Engine & SOP Matcher for Biztrix AI
 * Connects SUPPORT_KNOWLEDGE_BASE and PLATFORM_BLUEPRINT with conversational AI flows.
 */

import { 
  SUPPORT_KNOWLEDGE_BASE, 
  SupportPageGuide, 
  SupportIssueSOP 
} from "@/lib/support-knowledge-base";

export interface KnowledgeAction {
  label: string;
  route: string;
  type: "navigate" | "action";
}

export interface PlatformKnowledgeMatch {
  matched: boolean;
  score: number;
  guide?: SupportPageGuide;
  issue?: SupportIssueSOP;
  answerHinglish: string;
  stepByStepSOP: string[];
  controls: Array<{ label: string; actionDescription: string }>;
  actions: KnowledgeAction[];
}

/**
 * Normalizes text for matching by removing punctuation and splitting into tokens
 */
function tokenize(text: string): string[] {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 2);
}

/**
 * Searches the platform knowledge base using weighted scoring across:
 * - Module title & route
 * - Keywords & aliases (e.g., 'kacha bill', 'thermal receipt', 'gstr1', 'udhaar')
 * - Customer journeys & controls
 * - Specific troubleshooting symptoms & root causes
 */
export function searchPlatformKnowledge(queryText: string): PlatformKnowledgeMatch {
  const cleanQuery = String(queryText || "").trim().toLowerCase();
  if (!cleanQuery) {
    return {
      matched: false,
      score: 0,
      answerHinglish: "Biztrix OS ke kisi bhi feature ya module ke bare me pooch sakte hain.",
      stepByStepSOP: [],
      controls: [],
      actions: [
        { label: "Open Billing POS", route: "/billing", type: "navigate" },
        { label: "View Customer Hub", route: "/customers", type: "navigate" },
        { label: "OS Settings", route: "/settings", type: "navigate" },
      ]
    };
  }

  const queryTokens = tokenize(cleanQuery);

  // 1. Explicit Workflow vs Troubleshooting Intent Detection
  const isWorkflowQuery = 
    cleanQuery.includes("kaise kaam") ||
    cleanQuery.includes("kaise kam") ||
    cleanQuery.includes("kaise chalega") ||
    cleanQuery.includes("kaise chalta") ||
    cleanQuery.includes("how it works") ||
    cleanQuery.includes("how does") ||
    cleanQuery.includes("kya hai") ||
    cleanQuery.includes("kya hota") ||
    cleanQuery.includes("what is") ||
    cleanQuery.includes("kaise use") ||
    cleanQuery.includes("kaise karein") ||
    cleanQuery.includes("overview") ||
    cleanQuery.includes("process") ||
    cleanQuery.includes("features") ||
    cleanQuery.includes("jankari") ||
    cleanQuery.includes("samjhaiye") ||
    cleanQuery.includes("bataiye") ||
    cleanQuery.includes("batayein") ||
    cleanQuery.includes("guide");

  const isTroubleshootingQuery = 
    cleanQuery.includes("problem") ||
    cleanQuery.includes("error") ||
    cleanQuery.includes("dikkat") ||
    cleanQuery.includes("samasya") ||
    cleanQuery.includes("nahi ho raha") ||
    cleanQuery.includes("nahi chal") ||
    cleanQuery.includes("fail") ||
    cleanQuery.includes("cut") ||
    cleanQuery.includes("blank") ||
    cleanQuery.includes("kharab") ||
    cleanQuery.includes("issue") ||
    cleanQuery.includes("mismatch") ||
    cleanQuery.includes("not working") ||
    cleanQuery.includes("denied") ||
    cleanQuery.includes("galat") ||
    cleanQuery.includes("missing") ||
    cleanQuery.includes("stuck") ||
    cleanQuery.includes("slow");

  let bestGuideScore = 0;
  let bestGuide: SupportPageGuide | undefined;

  // 2. Score modules based on title, routes, keywords, and controls
  for (const guide of SUPPORT_KNOWLEDGE_BASE) {
    let guideScore = 0;

    // Exact or partial title match (high weight)
    if (guide.title.toLowerCase().includes(cleanQuery)) guideScore += 30;
    if (cleanQuery.includes(guide.title.toLowerCase())) guideScore += 30;

    // Route match
    if (cleanQuery.includes(guide.route.replace("/", ""))) guideScore += 25;

    // Keyword match
    for (const kw of guide.searchKeywords) {
      const kwLower = kw.toLowerCase();
      if (cleanQuery.includes(kwLower)) guideScore += 18;
      for (const t of queryTokens) {
        if (kwLower === t) guideScore += 8;
        else if (kwLower.includes(t)) guideScore += 4;
      }
    }

    // Controls match
    for (const ctrl of guide.keyFrontendControls) {
      const cLabel = ctrl.label.toLowerCase();
      if (cleanQuery.includes(cLabel)) guideScore += 14;
      for (const t of queryTokens) {
        if (cLabel.includes(t)) guideScore += 4;
      }
    }

    if (guideScore > bestGuideScore) {
      bestGuideScore = guideScore;
      bestGuide = guide;
    }
  }

  // Threshold check
  if (!bestGuide || bestGuideScore < 8) {
    return {
      matched: false,
      score: bestGuideScore,
      answerHinglish: "Biztrix OS me Billing POS, GST Invoicing, Loyalty Rewards, WhatsApp Automation, Inventory, Staff Attendance & Payroll, Solar EPC aur Real Estate modules available hain. Kripya apna sawal aur vistaar se batayein.",
      stepByStepSOP: [
        "Store billing ke liye /billing POS par jayein.",
        "Customers aur Udhaar ledger ke liye /customers open karein.",
        "Storefront aur Online Orders ke liye /website manage karein.",
        "General preferences aur hardware printers ke liye /settings open karein."
      ],
      controls: [],
      actions: [
        { label: "Go to Billing POS", route: "/billing", type: "navigate" },
        { label: "Customer Registry", route: "/customers", type: "navigate" },
        { label: "OS Settings", route: "/settings", type: "navigate" }
      ]
    };
  }

  // 3. Problem/Issue match (ONLY if NOT a workflow/how-it-works inquiry)
  let bestIssue: SupportIssueSOP | undefined;
  if (!isWorkflowQuery && bestGuide) {
    let topIssueScore = 0;
    const genericStopwords = ["solar", "epc", "pos", "bill", "billing", "system", "management", "customer", "staff", "inventory", "store", "dukaan", "kaise", "karna", "hona", "karein"];
    const problemTokens = queryTokens.filter(t => !genericStopwords.includes(t));

    for (const issue of bestGuide.commonIssues) {
      let issueScore = 0;
      const sEng = issue.symptom.toLowerCase();
      const sHin = issue.symptomHindi.toLowerCase();

      // Direct phrase match in symptom
      if (cleanQuery.includes(sEng) || cleanQuery.includes(sHin)) issueScore += 50;

      for (const t of problemTokens) {
        if (sEng.includes(t) || sHin.includes(t)) issueScore += 14;
        if (issue.tags.some(tag => tag.toLowerCase().includes(t))) issueScore += 12;
        if (issue.rootCause.toLowerCase().includes(t)) issueScore += 6;
      }

      if (isTroubleshootingQuery && issueScore > 0) {
        issueScore += 25;
      }

      if (issueScore > topIssueScore && issueScore >= 20) {
        topIssueScore = issueScore;
        bestIssue = issue;
      }
    }
  }

  // 4. Construct structured SOP steps
  let sopSteps: string[] = [];
  if (bestIssue && bestIssue.agentSteps.length > 0) {
    sopSteps = [...bestIssue.agentSteps];
  } else if (bestGuide.customerJourney && bestGuide.customerJourney.length > 0) {
    sopSteps = [...bestGuide.customerJourney];
  }

  // 5. Construct actions
  const actions: KnowledgeAction[] = [
    { label: `Open ${bestGuide.title}`, route: bestGuide.route, type: "navigate" }
  ];

  if (bestIssue?.settingsPath && bestIssue.settingsPath !== bestGuide.route) {
    actions.push({ label: "Open Settings", route: bestIssue.settingsPath, type: "navigate" });
  }

  if (bestGuide.relatedPages) {
    for (const rel of bestGuide.relatedPages.slice(0, 2)) {
      actions.push({ label: rel.label, route: rel.route, type: "navigate" });
    }
  }

  // 6. Build clean Hinglish explanation
  let answerHinglish = "";
  if (bestIssue) {
    answerHinglish = `### ⚠️ ${bestGuide.title} - Problem Resolution SOP\n\n` +
      `**Page Route:** \`${bestGuide.route}\`\n\n` +
      `**Samasya (Issue):** ${bestIssue.symptomHindi || bestIssue.symptom}\n\n` +
      `**Kaaran (Root Cause):** ${bestIssue.rootCause}\n\n` +
      `**Samadhan ke Steps (Step-by-Step SOP):**\n` +
      sopSteps.map((st, i) => `${i + 1}. ${st}`).join("\n") +
      `\n\n*Aap direct niche diye gaye button se '${bestGuide.title}' open karke verify kar sakte hain.*`;
  } else {
    answerHinglish = `### 📘 ${bestGuide.title} (${bestGuide.group})\n\n` +
      `**Page Route:** \`${bestGuide.route}\`\n\n` +
      `**Yeh Module Kya Karta Hai:**\n${bestGuide.summaryHindi || bestGuide.summary}\n\n` +
      `**Kaise Kaam Karta Hai (Step-by-Step Workflow):**\n` +
      sopSteps.map((st, i) => `${i + 1}. ${st}`).join("\n") +
      (bestGuide.keyFrontendControls.length > 0
        ? `\n\n**Mukhya Buttons & Controls:**\n` +
          bestGuide.keyFrontendControls.map(c => `• **${c.label}**: ${c.actionDescription}`).join("\n")
        : "") +
      `\n\n*Aap direct '${bestGuide.title}' page par jane ke liye niche diye gaye button par click karein.*`;
  }

  return {
    matched: true,
    score: bestGuideScore,
    guide: bestGuide,
    issue: bestIssue,
    answerHinglish,
    stepByStepSOP: sopSteps,
    controls: bestGuide.keyFrontendControls || [],
    actions: actions.slice(0, 3)
  };
}

/**
 * Returns a condensed platform overview markdown string for embedding inside LLM system prompts
 */
export function getPlatformKnowledgePromptSummary(): string {
  const lines: string[] = [
    "=== BIZTRIX OS COMPREHENSIVE PLATFORM KNOWLEDGE BASE ===",
    "You have authoritative knowledge about every module, route, and SOP:",
  ];

  for (const g of SUPPORT_KNOWLEDGE_BASE) {
    lines.push(
      `\n[Module: ${g.title} | Route: ${g.route} | Category: ${g.group}]`,
      `Summary: ${g.summary}`,
      `SOP Workflow: ${g.customerJourney.slice(0, 3).join(" -> ")}`,
      `Key Controls: ${g.keyFrontendControls.slice(0, 3).map(c => `${c.label} (${c.actionDescription})`).join(", ")}`
    );

    if (g.commonIssues.length > 0) {
      lines.push(
        `Common Troubleshooting: ${g.commonIssues.slice(0, 2).map(iss => `${iss.symptom}: ${iss.agentSteps.join(", ")}`).join(" | ")}`
      );
    }
  }

  lines.push("\nAlways provide accurate step-by-step instructions and cite exact route paths (e.g. /billing, /settings, /customers).");
  return lines.join("\n");
}
