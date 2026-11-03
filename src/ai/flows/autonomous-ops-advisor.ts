'use server';
/**
 * @fileOverview Autonomous Operations Advisor Flow with Learning Capabilities.
 * Scans business health and adapts based on past user engagement (Accept/Reject).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const OpsAdvisorInputSchema = z.object({
  businessName: z.string(),
  inventory: z.array(z.object({
    name: z.string(),
    stock: z.number(),
    minThreshold: z.number(),
    price: z.number(),
    lastSaleDays: z.number().optional(),
  })),
  leads: z.array(z.object({
    name: z.string(),
    phone: z.string().optional(),
    intentScore: z.number(),
    status: z.string(),
  })),
  accounting: z.object({
    dailyInflow: z.number(),
    dailyOutflow: z.number(),
    pendingPayments: z.number(),
  }),
  activeAddons: z.array(z.string()),
  availableModules: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    price: z.string()
  })).optional(),
  userEngagement: z.record(z.object({
    accepted: z.number(),
    rejected: z.number()
  })).optional().describe('Past interaction stats per category to help AI learn user preferences.')
});

export type OpsAdvisorInput = z.infer<typeof OpsAdvisorInputSchema>;

const OpsAdvisorOutputSchema = z.object({
  status: z.enum(['stable', 'action-needed', 'growth-opportunity']),
  suggestions: z.array(z.object({
    id: z.string(),
    type: z.enum(['inventory', 'marketing', 'upsell', 'payment']),
    priority: z.enum(['high', 'medium', 'low']),
    title: z.string(),
    reasoning: z.string(),
    actionLabel: z.string(),
    actionType: z.string(),
    payload: z.any().optional(),
  })),
  summary: z.string(),
});

export type OpsAdvisorOutput = z.infer<typeof OpsAdvisorOutputSchema>;

export async function getOpsAdvice(input: OpsAdvisorInput): Promise<OpsAdvisorOutput> {
  return opsAdvisorFlow(input);
}

const opsPrompt = ai.definePrompt({
  name: 'opsAdvisorPrompt',
  input: { schema: OpsAdvisorInputSchema },
  output: { schema: OpsAdvisorOutputSchema },
  prompt: `You are the "Intelligent COO Assistant" for {{{businessName}}}. 
    
    **LEARNING PROTOCOL:**
    Review past user engagement:
    {{#each userEngagement}}
    - Category: {{{@key}}} (Accepted: {{{accepted}}}, Rejected: {{{rejected}}})
    {{/each}}
    
    *Instructions based on engagement*:
    - If a category has high REJECTIONS, reduce its frequency and lower its priority.
    - If a category has high ACCEPTANCE, look for more opportunities in that area.
    - Adapt your tone: If the user accepts technical suggestions, be precise. If they prefer sales growth, be more motivational in Hinglish.

    **BUSINESS CONTEXT:**
    - Inventory: {{#each inventory}}{{{name}}} (Stock: {{{stock}}}, Min: {{{minThreshold}}}), {{/each}}
    - Pipeline: {{#each leads}}{{{name}}} (Score: {{{intentScore}}}%, Status: {{{status}}}), {{/each}}
    - Accounting: Inflow ₹{{{accounting.dailyInflow}}}, Pending ₹{{{accounting.pendingPayments}}}
    - Active Modules: {{#each activeAddons}}{{{this}}}, {{/each}}
    
    **TASK:**
    1. Suggest up to 3 high-impact actions.
    2. Assign Priority:
       - HIGH: Cash flow risks or stockouts.
       - MEDIUM: Growth opportunities.
       - LOW: Housekeeping or long-term upsells.
    3. Return valid JSON only.`,
});

const opsAdvisorFlow = ai.defineFlow(
  {
    name: 'opsAdvisorFlow',
    inputSchema: OpsAdvisorInputSchema,
    outputSchema: OpsAdvisorOutputSchema,
  },
  async (input) => {
    const { output } = await opsPrompt(input);
    return output!;
  }
);
