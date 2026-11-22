'use server';
/**
 * @fileOverview Biztrix AI Advisor Chat Flow.
 * Handles conversational business intelligence by grounding LLM responses in real-time Firestore data.
 */

import { ai, hasValidGeminiKey } from '@/ai/genkit';
import { z } from 'genkit';
import { searchPlatformKnowledge } from '@/lib/knowledge-search';

const AdvisorChatInputSchema = z.object({
  message: z.string().describe('The user\'s question or message.'),
  context: z.object({
    products: z.array(z.any()).optional().describe('Current inventory data.'),
    leads: z.array(z.any()).optional().describe('Current CRM/Leads data.'),
    tasks: z.array(z.any()).optional().describe('Active tasks data.'),
    projects: z.array(z.any()).optional().describe('Current projects data.'),
    businessName: z.string().optional(),
  }),
  history: z.array(z.object({
    role: z.enum(['user', 'ai']),
    content: z.string(),
  })).optional().describe('Previous chat messages for context.'),
});

export type AdvisorChatInput = z.infer<typeof AdvisorChatInputSchema>;

const AdvisorChatOutputSchema = z.object({
  content: z.string().describe('The AI\'s conversational response in Hinglish.'),
  data: z.object({
    metric: z.string().optional(),
    label: z.string().optional(),
    change: z.string().optional(),
  }).optional(),
  actions: z.array(z.object({
    label: z.string().describe('Button label text.'),
    type: z.string().default('navigate').describe('Action type.'),
    route: z.string().optional().describe('Direct application route to navigate to.'),
    payload: z.any().optional(),
  })).optional(),
});

export type AdvisorChatOutput = z.infer<typeof AdvisorChatOutputSchema>;

function generateAdvisorFallback(input: AdvisorChatInput): AdvisorChatOutput {
  const msg = (input.message || "").toLowerCase();
  const businessName = input.context?.businessName || "Biztrix Store";
  const products = Array.isArray(input.context?.products) ? input.context.products : [];
  const leads = Array.isArray(input.context?.leads) ? input.context.leads : [];
  const tasks = Array.isArray(input.context?.tasks) ? input.context.tasks : [];
  const projects = Array.isArray(input.context?.projects) ? input.context.projects : [];

  // 1. Check if the query is asking about live business data (stock levels, leads, tasks)
  const isLiveBizDataQuery = 
    msg.includes("khatam") ||
    msg.includes("kaunsa") ||
    msg.includes("kaun si") ||
    msg.includes("mera") ||
    msg.includes("meri") ||
    msg.includes("hamara") ||
    msg.includes("hamare") ||
    msg.includes("pending") ||
    msg.includes("urgent") ||
    msg.includes("kitna") ||
    msg.includes("kitne") ||
    msg.includes("status");

  // 2. Check if user is asking how to use, configure, or troubleshoot any Biztrix website feature
  const platformMatch = searchPlatformKnowledge(input.message);
  const isFeatureQuery = 
    msg.includes("kaise") || 
    msg.includes("how") || 
    msg.includes("kaha") || 
    msg.includes("where") || 
    msg.includes("setting") || 
    msg.includes("setup") || 
    msg.includes("problem") || 
    msg.includes("error") || 
    msg.includes("printer") || 
    msg.includes("barcode") || 
    msg.includes("bill") || 
    msg.includes("pos") || 
    msg.includes("role") || 
    msg.includes("attendance") || 
    msg.includes("payroll") || 
    msg.includes("qr") || 
    msg.includes("loyalty") || 
    msg.includes("solar") || 
    msg.includes("property") || 
    msg.includes("domain") || 
    msg.includes("sop") ||
    msg.includes("guide");

  if (platformMatch.matched && platformMatch.score >= 8 && isFeatureQuery) {
    return {
      content: platformMatch.answerHinglish,
      data: platformMatch.guide ? {
        label: platformMatch.guide.title,
        metric: platformMatch.guide.route,
        change: platformMatch.guide.group,
      } : undefined,
      actions: platformMatch.actions.map(act => ({
        label: act.label,
        type: 'navigate',
        route: act.route,
        payload: { route: act.route }
      }))
    };
  }

  // 2. Business Data Intent: Stock & Inventory
  if (msg.includes("stock") || msg.includes("inventory") || msg.includes("maal") || msg.includes("product") || msg.includes("reorder")) {
    const lowStock = products.filter(p => (Number(p.stock) || 0) <= (Number(p.minThreshold) || 10));
    if (lowStock.length > 0) {
      const names = lowStock.slice(0, 4).map(p => `${p.name} (${p.stock} units bachi hain)`).join(", ");
      return {
        content: `Aapke catalog me ${lowStock.length} items low stock threshold par hain: ${names}. Out-of-stock hone se bachne ke liye naya vendor order place karein.`,
        data: { label: "Low Stock Items", metric: `${lowStock.length} products`, change: "Alert" },
        actions: [
          { label: "Open Inventory", type: "navigate", route: "/inventory", payload: { route: "/inventory" } },
          { label: "Purchase Bills", type: "navigate", route: "/inventory", payload: { route: "/inventory" } }
        ]
      };
    }
    return {
      content: `Aapke catalog me ${products.length} products listed hain aur filhal sabhi ka stock level threshold se upar hai.`,
      data: { label: "Catalog Count", metric: `${products.length} items`, change: "Healthy" },
      actions: [
        { label: "Open Inventory", type: "navigate", route: "/inventory", payload: { route: "/inventory" } }
      ]
    };
  }

  // 3. Business Data Intent: Leads & CRM
  if (msg.includes("lead") || msg.includes("crm") || msg.includes("customer") || msg.includes("grahak") || msg.includes("inquiry")) {
    const hotLeads = leads.filter(l => (Number(l.intentScore) || 0) >= 80);
    if (hotLeads.length > 0) {
      const names = hotLeads.slice(0, 3).map(l => l.name).join(", ");
      return {
        content: `Aapke CRM me ${hotLeads.length} hot leads hain: ${names}. Unhe follow-up call karein ya WhatsApp automated sequence trigger karein.`,
        data: { label: "High Intent Leads", metric: `${hotLeads.length} leads`, change: "+Hot" },
        actions: [
          { label: "Customer Registry", type: "navigate", route: "/customers", payload: { route: "/customers" } },
          { label: "WhatsApp Automation", type: "navigate", route: "/whatsapp-automation", payload: { route: "/whatsapp-automation" } }
        ]
      };
    }
    return {
      content: `Aapke paas ${leads.length} leads registered hain. New prospect acquisition ke liye WhatsApp campaigns use karein.`,
      data: { label: "Total Leads", metric: `${leads.length} records`, change: "Active" },
      actions: [
        { label: "Customer Registry", type: "navigate", route: "/customers", payload: { route: "/customers" } }
      ]
    };
  }

  // 4. Business Data Intent: Tasks & Projects
  if (msg.includes("task") || msg.includes("kaam") || msg.includes("project") || msg.includes("pending")) {
    const pendingTasks = tasks.filter(t => t.status !== "completed");
    const urgent = pendingTasks.filter(t => t.priority === "urgent" || t.priority === "high");
    if (urgent.length > 0) {
      const sample = urgent.slice(0, 3).map(t => `${t.title} (${t.assignedName || "Team"})`).join(", ");
      return {
        content: `Aapke paas ${urgent.length} urgent tasks pending hain: ${sample}. Inhe priority par complete karwayein.`,
        data: { label: "Urgent Tasks", metric: `${urgent.length} pending`, change: "Priority" },
        actions: [
          { label: "View Task Board", type: "navigate", route: "/notes", payload: { route: "/notes" } },
          { label: "Staff & Attendance", type: "navigate", route: "/staff", payload: { route: "/staff" } }
        ]
      };
    }
    return {
      content: `Aapke total ${tasks.length} tasks aur ${projects.length} ongoing projects active hain.`,
      data: { label: "Tasks In Progress", metric: `${pendingTasks.length} pending`, change: "Normal" },
      actions: [
        { label: "View Task Board", type: "navigate", route: "/notes", payload: { route: "/notes" } }
      ]
    };
  }

  // 5. If matched any platform knowledge even loosely, deliver the guide
  if (platformMatch.matched) {
    return {
      content: platformMatch.answerHinglish,
      data: platformMatch.guide ? {
        label: platformMatch.guide.title,
        metric: platformMatch.guide.route,
        change: platformMatch.guide.group,
      } : undefined,
      actions: platformMatch.actions.map(act => ({
        label: act.label,
        type: 'navigate',
        route: act.route,
        payload: { route: act.route }
      }))
    };
  }

  return {
    content: `Namaste! Mai aapka Biztrix Strategy Advisor hoon. Business "${businessName}" ka live data connected hai.\n\nAap mujhse kisi bhi platform feature ka step-by-step SOP (e.g. thermal printer, GST bill, loyalty points, payroll, solar proposals) ya live business data (stock, hot leads, pending tasks) ke bare me pooch sakte hain.`,
    data: { label: "Advisor Status", metric: "Active", change: "Ready" },
    actions: [
      { label: "Billing POS", type: "navigate", route: "/billing", payload: { route: "/billing" } },
      { label: "Customer Registry", type: "navigate", route: "/customers", payload: { route: "/customers" } },
      { label: "OS Settings", type: "navigate", route: "/settings", payload: { route: "/settings" } }
    ]
  };
}

export async function advisorChat(input: AdvisorChatInput): Promise<AdvisorChatOutput> {
  try {
    if (!hasValidGeminiKey()) {
      return generateAdvisorFallback(input);
    }
    const { output } = await advisorChatPrompt(input);
    if (!output || !output.content) {
      return generateAdvisorFallback(input);
    }
    return output;
  } catch (err: any) {
    console.warn("[advisorChat] Gemini Genkit call failed, falling back to local business heuristic:", err?.message || err);
    return generateAdvisorFallback(input);
  }
}

const advisorChatPrompt = ai.definePrompt({
  name: 'advisorChatPrompt',
  input: { schema: AdvisorChatInputSchema },
  output: { schema: AdvisorChatOutputSchema },
  prompt: `You are the "Biztrix AI Advisor", a highly intelligent and dynamic business consultant for an Indian entrepreneur. 
Your goal is to provide specific, data-backed advice using the real-time business data provided below, OR provide detailed, step-by-step SOPs and navigation links if the user asks how to use, configure, or troubleshoot any feature on the website.

**CRITICAL RULE:** DO NOT use a fixed template for every answer. Analyze the user's specific question first:
- If user asks about **Website / Platform Features / SOPs** (e.g. Thermal printer, GST bill, barcode scanner, loyalty QR, staff roles, daily cashbook, solar EPC):
  Provide exact, step-by-step SOP instructions, identify the relevant controls, and return actionable navigation buttons with 'route' (e.g. { label: "Open Settings", route: "/settings", type: "navigate" }).
- If user asks about **Live Business Data** (stock, leads, tasks, projects):
  Ground your answer directly in the numbers and names from the live data below.

---
**AUTHORITATIVE PLATFORM BLUEPRINT & ROUTES:**
- Billing POS: \`/billing\` (A4/thermal bills, split payments, barcode, tax)
- Daily Cashbook: \`/daily-entries\` (income/expense entries, dual ledger)
- Customers & Udhaar: \`/customers\` (customer ledger, credit balance, loyalty tier)
- Vendors & Purchases: \`/vendors\` (supplier bills, payables)
- Staff & Payroll: \`/staff\`, \`/staff/payroll\` (attendance, salary slips)
- Inventory & Stock: \`/inventory\` (products, threshold alerts, purchase OCR)
- WhatsApp Automation: \`/whatsapp-automation\` (broadcasts, auto-followups)
- Solar EPC Vertical: \`/solar\` (site surveys, PV sizing, rooftop proposals)
- Real Estate Vertical: \`/real-estate\` (property inventory, developer leads)
- Digital Loyalty Pass: \`/loyalty/track-member\` (member QR, cashback wallet)
- OS Settings & RBAC: \`/settings\`, \`/settings/roles\` (printers, gateways, roles)

---
**LIVE BUSINESS DATA:**
- Business Name: {{{context.businessName}}}

{{#if context.products}}
- Current Inventory: {{#each context.products}} Product: {{{name}}}, Stock: {{{stock}}}, Price: ₹{{{price}}}, Min Threshold: {{{minThreshold}}} | {{/each}}
{{/if}}

{{#if context.leads}}
- CRM Leads: {{#each context.leads}} Name: {{{name}}}, Score: {{{intentScore}}}%, Source: {{{source}}}, Status: {{{status}}} | {{/each}}
{{/if}}

{{#if context.tasks}}
- Active Tasks: {{#each context.tasks}} Task: {{{title}}}, Status: {{{status}}}, Priority: {{{priority}}}, Assigned To: {{{assignedName}}} | {{/each}}
{{/if}}

{{#if context.projects}}
- Current Projects: {{#each context.projects}} Project: {{{title}}}, Status: {{{status}}}, Client: {{{clientName}}} | {{/each}}
{{/if}}
---

**TONE & LANGUAGE:**
- Professional, friendly, and expert. Use natural Hinglish.
- Always include helpful navigation actions with 'route' when recommending a page.

**Response Structure (Return JSON):**
- 'content': The main advice or SOP in Hinglish.
- 'data': (Optional) A key metric or route mentioned.
- 'actions': (Optional) Array of navigation buttons with { label, route, type: 'navigate' }.`,
});

const advisorChatFlow = ai.defineFlow(
  {
    name: 'advisorChatFlow',
    inputSchema: AdvisorChatInputSchema,
    outputSchema: AdvisorChatOutputSchema,
  },
  async (input) => {
    const { output } = await advisorChatPrompt(input);
    return output!;
  }
);