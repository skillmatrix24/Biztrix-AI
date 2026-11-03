'use server';
/**
 * @fileOverview Biztrix AI Morning Brief Flow.
 * Generates a strategic start-of-day summary based on all active business modules.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MorningBriefInputSchema = z.object({
  businessName: z.string().optional(),
  userName: z.string().optional(),
  activeAddonIds: z.array(z.string()).describe('List of currently active module IDs.'),
  context: z.object({
    tasks: z.array(z.any()).optional().describe('Today\'s high priority tasks.'),
    lowStockItems: z.array(z.any()).optional().describe('Items below threshold.'),
    hotLeads: z.array(z.any()).optional().describe('Leads with intent score > 80.'),
    pendingPayments: z.number().optional().describe('Total outstanding udhaar from customers.'),
    ongoingProjects: z.array(z.any()).optional().describe('Active projects and their progress.'),
  }),
});

export type MorningBriefInput = z.infer<typeof MorningBriefInputSchema>;

const MorningBriefOutputSchema = z.object({
  greeting: z.string().describe('Time-aware greeting in Hinglish.'),
  summary: z.string().describe('Conversational business summary.'),
  priorityActions: z.array(z.object({
    label: z.string(),
    type: z.string(),
    impact: z.enum(['high', 'medium', 'low']),
  })).describe('Top 3 actions for today.'),
  statusNode: z.enum(['optimal', 'attention-needed', 'critical']),
});

export type MorningBriefOutput = z.infer<typeof MorningBriefOutputSchema>;

function getGreetingByTime(name: string): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return `Suprabhat ${name}!`;
    if (hour >= 12 && hour < 16) return `Namaste ${name}! Aaj ka business update ready hai.`;
    return `Shubh Sandhya ${name}! Aaj ka business update ready hai.`;
}

export async function getMorningBrief(input: MorningBriefInput): Promise<MorningBriefOutput> {
  const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 16 ? 'afternoon' : 'evening';
  return morningBriefFlow({ ...input, context: { ...input.context, timeOfDay } });
}

export async function getMorningBriefLegacy(input: MorningBriefInput): Promise<MorningBriefOutput> {
  return morningBriefFlow(input);
}

const morningBriefPrompt = ai.definePrompt({
  name: 'morningBriefPrompt',
  input: { schema: MorningBriefInputSchema.extend({ context: MorningBriefInputSchema.shape.context.extend({ timeOfDay: z.string().optional() }) }) },
  output: { schema: MorningBriefOutputSchema },
  prompt: `You are the "Biztrix Strategy Advisor". Your goal is to give {{{userName}}} a sateek (precise) brief for their business "{{{businessName}}}".

**GREETING PROTOCOL:**
Use time-aware Hinglish greeting based on {{{context.timeOfDay}}}:
- morning: Suprabhat!
- afternoon: Namaste!
- evening: Shubh Sandhya!

**LOGIC PROTOCOL:**
Only comment on areas where data is provided and relevant modules are active in 'activeAddonIds'.

**CURRENT DATA NODES:**
{{#if context.tasks}}
- URGENT TASKS: {{#each context.tasks}}{{{title}}} (Assignee: {{{assignedName}}}) | {{/each}}
{{/if}}

{{#if context.lowStockItems}}
- CRITICAL STOCK: {{#each context.lowStockItems}}{{{name}}} (Stock: {{{stock}}} {{{unit}}}) | {{/each}}
{{/if}}

{{#if context.hotLeads}}
- HOT LEADS: {{#each context.hotLeads}}{{{name}}} (Score: {{{intentScore}}}%) | {{/each}}
{{/if}}

{{#if context.pendingPayments}}
- PENDING COLLECTIONS: ₹{{{context.pendingPayments}}}
{{/if}}

{{#if context.ongoingProjects}}
- PROJECTS: {{#each context.ongoingProjects}}{{{title}}} (Progress: {{{progress}}}%) | {{/each}}
{{/if}}

**INSTRUCTIONS:**
1. Write in friendly, professional Hinglish.
2. If stock is low, warn about potential sales loss.
3. If hot leads exist, emphasize conversion today.
4. If payments are high, suggest a collection drive.
5. Provide 3 specific actions with 'high', 'medium', or 'low' impact.
6. Set statusNode to 'critical' if stockouts or high payment risks are detected.

Return valid JSON matching the MorningBriefOutputSchema.`,
});

const morningBriefFlow = ai.defineFlow(
  {
    name: 'morningBriefFlow',
    inputSchema: MorningBriefInputSchema.extend({ context: MorningBriefInputSchema.shape.context.extend({ timeOfDay: z.string().optional() }) }),
    outputSchema: MorningBriefOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await morningBriefPrompt(input);
      if (output) return output;
    } catch (error) {
      console.error('Morning brief AI prompt failed, falling back to context:', error);
    }

    const taskCount = input.context.tasks?.length || 0;
    const lowStockCount = input.context.lowStockItems?.length || 0;
    const hotLeadsCount = input.context.hotLeads?.length || 0;
    const pendingUdhaar = input.context.pendingPayments || 0;

    const isCritical = lowStockCount > 0 || pendingUdhaar > 50000;
    const isAttention = taskCount > 0 || hotLeadsCount > 0;

    return {
      greeting: getGreetingByTime(input.userName || 'Ji'),
      summary: `${input.businessName || 'Business'} operational status: ${taskCount} urgent tasks, ${lowStockCount} items low on stock, aur ${hotLeadsCount} hot leads active hain.${pendingUdhaar > 0 ? ` Pending udhaar: ₹${pendingUdhaar.toLocaleString('en-IN')}.` : ''}`,
      priorityActions: [
        {
          label: taskCount > 0 ? `Complete ${taskCount} critical tasks today` : 'Review pending team workflows',
          type: 'tasks',
          impact: 'high' as const,
        },
        {
          label: hotLeadsCount > 0 ? `Follow up with ${hotLeadsCount} high-intent leads` : 'Analyze conversion funnel',
          type: 'leads',
          impact: 'high' as const,
        },
        {
          label: lowStockCount > 0 ? `Reorder ${lowStockCount} low stock items` : 'Audit inventory levels',
          type: 'inventory',
          impact: 'medium' as const,
        },
      ],
      statusNode: isCritical ? ('critical' as const) : isAttention ? ('attention-needed' as const) : ('optimal' as const),
    };
  }
);
