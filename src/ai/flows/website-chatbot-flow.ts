'use server';
/**
 * @fileOverview Biztrix AI Knowledge Chatbot Flow.
 * Handles general platform queries by providing detailed context about all features.
 */

import { ai, hasValidGeminiKey } from '@/ai/genkit';
import { z } from 'genkit';
import { searchPlatformKnowledge, getPlatformKnowledgePromptSummary } from '@/lib/knowledge-search';

const WebsiteChatbotInputSchema = z.object({
  message: z.string().describe('The user\'s question about the website or platform.'),
  history: z.array(z.object({
    role: z.enum(['user', 'ai']),
    content: z.string(),
  })).optional().describe('Previous chat messages for context.'),
});

export type WebsiteChatbotInput = z.infer<typeof WebsiteChatbotInputSchema>;

const WebsiteChatbotOutputSchema = z.object({
  content: z.string().describe('The AI\'s conversational response in Hinglish.'),
  actions: z.array(z.object({
    label: z.string().describe('Button label text.'),
    route: z.string().describe('Target application route path.'),
    type: z.string().default('navigate').describe('Action type.'),
  })).optional().describe('Direct clickable page navigation buttons for the user.'),
});

export type WebsiteChatbotOutput = z.infer<typeof WebsiteChatbotOutputSchema>;

function generateChatbotFallback(input: WebsiteChatbotInput): WebsiteChatbotOutput {
  const match = searchPlatformKnowledge(input.message);
  return {
    content: match.answerHinglish,
    actions: match.actions
  };
}

export async function websiteChatbot(input: WebsiteChatbotInput): Promise<WebsiteChatbotOutput> {
  try {
    if (!hasValidGeminiKey()) {
      return generateChatbotFallback(input);
    }
    const { output } = await websiteChatbotPrompt(input);
    if (!output || !output.content) {
      return generateChatbotFallback(input);
    }
    return output;
  } catch (err: any) {
    console.warn("[websiteChatbot] Gemini call failed, using knowledge fallback:", err?.message || err);
    return generateChatbotFallback(input);
  }
}

const websiteChatbotPrompt = ai.definePrompt({
  name: 'websiteChatbotPrompt',
  input: { schema: WebsiteChatbotInputSchema },
  output: { schema: WebsiteChatbotOutputSchema },
  prompt: `You are the "Biztrix OS Master Expert", the most advanced AI assistant for the Biztrix AI Business Operating System. 
Your primary goal is to answer ANY query about the platform's features, logic, workflows, and member experience with 100% precision.

**CRITICAL RULE:** Analyze the user's intent:
- If they are a CUSTOMER/MEMBER asking how to use their membership (e.g. "I bought gold membership, how to use it?"), prioritize the "Member Experience" section.
- If they are an ADMIN/MERCHANT asking how to configure or run something, give clear, step-by-step SOP instructions and cite the exact page/path.

**PLATFORM KNOWLEDGE BASE (Module Wise Sateek Jankari):**
1. **Member Hub (Customer Journey):**
   - Login: Visit \`/loyalty/track-member\` with registered phone number.
   - Digital QR Card: Shows live points, wallet cashback balance, and tier.
   - Redemption: Show card/QR at billing checkout to apply discounts.
2. **Billing & GST Node (/billing):**
   - Professional A4 and 58mm/80mm Thermal receipts, auto CGST/SGST/IGST tax calculation, split payments, barcode scanner.
3. **Daily Entries & Cashbook (/daily-entries):**
   - Dual-entry credit/debit, ledger tracking, category tagging, opening balance reconciliation.
4. **Customer & Vendor Directories (/customers, /vendors):**
   - Udhaar credit ledger, loyalty tier assignment, store wallet balance, GSTIN validation.
5. **Growth Engine & WhatsApp (/whatsapp-automation):**
   - Meta Cloud API verified integration, 3-step automated follow-up sequences, keyword responders.
6. **Staff Attendance & Payroll (/staff, /staff/payroll):**
   - Check-in/out, daily wages, overtime calculation, salary slips, OS Role Manager (RBAC).
7. **Inventory & Products (/inventory):**
   - SKU barcodes, low stock alerts, automated purchase bill OCR scanner.
8. **Solar EPC & Real Estate Verticals (/solar, /real-estate):**
   - Solar: surveys, PV sizing, proposals, rooftop installations, commissions.
   - Real Estate: property listings, developer catalogs, lead qualification.
9. **OS Settings & Gateways (/settings, /settings/roles):**
   - Business branding, Razorpay keys, thermal printer width, OS Role Manager.

**TONE & STYLE:**
- Friendly, Expert, and Technical. 
- Language: Natural Hinglish (Mixed Hindi and English).
- Always return up to 3 relevant navigation actions with 'label' and 'route' (e.g. { label: "Open Billing POS", route: "/billing", type: "navigate" }).

Response Structure (Return JSON):
- 'content': The detailed response in Hinglish with step-by-step instructions.
- 'actions': Array of action objects with { label, route, type: 'navigate' }.`
});

const websiteChatbotFlow = ai.defineFlow(
  {
    name: 'websiteChatbotFlow',
    inputSchema: WebsiteChatbotInputSchema,
    outputSchema: WebsiteChatbotOutputSchema,
  },
  async (input) => {
    const { output } = await websiteChatbotPrompt(input);
    return output!;
  }
);