'use server';
/**
 * @fileOverview Biztrix AI Advisor Chat Flow.
 * Handles conversational business intelligence by grounding LLM responses in real-time Firestore data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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
    label: z.string(),
    type: z.string(),
    payload: z.any().optional(),
  })).optional(),
});

export type AdvisorChatOutput = z.infer<typeof AdvisorChatOutputSchema>;

export async function advisorChat(input: AdvisorChatInput): Promise<AdvisorChatOutput> {
  return advisorChatFlow(input);
}

const advisorChatPrompt = ai.definePrompt({
  name: 'advisorChatPrompt',
  input: { schema: AdvisorChatInputSchema },
  output: { schema: AdvisorChatOutputSchema },
  prompt: `You are the "Biztrix AI Advisor", a highly intelligent and dynamic business consultant for an Indian entrepreneur. 
Your goal is to provide specific, data-backed advice using the real-time business data provided below.

**CRITICAL RULE:** DO NOT use a fixed template for every answer. Analyze the user's specific question first and answer accordingly. 

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

**INSTRUCTIONS FOR DYNAMIC RESPONSES:**

1. **Identify the Intent:**
   - If user asks about **Tasks/Projects**: Provide a summary of ongoing work. Identify "Urgent" or "High" priority tasks that are not done. Mention agents by name.
   - If user asks about **Inventory**: Focus on specific product names below threshold.
   - If user asks about **Leads**: Identify "Hot Leads" (Intent Score > 80%).
   - If data for the requested area is missing (e.g. they ask for project summary but context.projects is empty), politely ask them to add that data in the respective module first.

2. **Grounding in Data:**
   - Mention specific names from the lists (e.g. "Sanjay ka kaam pending hai" or "Plot 12 project on-hold hai").
   - Use numbers: "Aapke paas {{{context.tasks.length}}} active tasks hain."

3. **Tone & Language:**
   - Professional, friendly, and expert. Use "Hinglish" naturally.

**Response Structure (Return JSON):**
- 'content': The main advice in Hinglish.
- 'data': (Optional) A key metric mentioned in the chat.
- 'actions': (Optional) Buttons for the user to click.`,
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