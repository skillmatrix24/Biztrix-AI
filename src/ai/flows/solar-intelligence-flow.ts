
'use server';
/**
 * @fileOverview Solar Intelligence AI Agent.
 * Analyzes solar operational metrics to provide strategic growth insights.
 * 
 * - solarIntelligence - Main wrapper function.
 * - SolarIntelligenceInput - Schema for aggregated solar data.
 * - SolarIntelligenceOutput - Structured business insights.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SolarIntelligenceInputSchema = z.object({
  businessName: z.string().optional(),
  metrics: z.object({
    inquiries: z.object({ total: z.number(), new: z.number(), qualified: z.number(), lost: z.number() }),
    surveys: z.object({ total: z.number(), pending: z.number(), approved: z.number() }),
    designs: z.object({ total: z.number(), approved: z.number() }),
    quotes: z.object({ total: z.number(), accepted: z.number(), pendingValue: z.number(), acceptedValue: z.number() }),
    installations: z.object({ total: z.number(), active: z.number(), completed: z.number(), totalKw: z.number() }),
    commissions: z.object({ pending: z.number(), paid: z.number() }),
    warranties: z.object({ active: z.number(), claims: z.number() })
  }),
});

export type SolarIntelligenceInput = z.infer<typeof SolarIntelligenceInputSchema>;

const InsightCategorySchema = z.object({
  insight: z.string().describe('The core observation in Hinglish.'),
  support: z.string().describe('The specific numbers supporting this insight.'),
  recommendation: z.string().describe('Actionable advice for the admin.'),
  confidence: z.enum(['low', 'medium', 'high']),
});

const SolarIntelligenceOutputSchema = z.object({
  summary: z.string().describe('A 1-sentence management summary in Hinglish.'),
  categories: z.object({
    sales: InsightCategorySchema,
    operations: InsightCategorySchema,
    financials: InsightCategorySchema,
    service: InsightCategorySchema,
  }),
});

export type SolarIntelligenceOutput = z.infer<typeof SolarIntelligenceOutputSchema>;

export async function solarIntelligence(input: SolarIntelligenceInput): Promise<SolarIntelligenceOutput> {
  return solarIntelligenceFlow(input);
}

const solarIntelligencePrompt = ai.definePrompt({
  name: 'solarIntelligencePrompt',
  input: { schema: SolarIntelligenceInputSchema },
  output: { schema: SolarIntelligenceOutputSchema },
  prompt: `You are the "Solar Strategy Advisor" for {{{businessName}}}. 
Analyze the provided operational data nodes and provide high-level strategic insights.

**DATA NODES:**
- INQUIRIES: {{{metrics.inquiries.total}}} Total, {{{metrics.inquiries.new}}} New, {{{metrics.inquiries.qualified}}} Qualified
- SURVEYS: {{{metrics.surveys.total}}} Total, {{{metrics.surveys.pending}}} Pending
- QUOTES: {{{metrics.quotes.total}}} Total, {{{metrics.quotes.accepted}}} Accepted. Accepted Order Value: ₹{{{metrics.quotes.acceptedValue}}}
- INSTALLATIONS: {{{metrics.installations.active}}} Active, {{{metrics.installations.totalKw}}} kWp Deployed
- SERVICE: {{{metrics.warranties.active}}} Active Warranties, {{{metrics.warranties.claims}}} Open Claims

**FINANCIAL PROTOCOL:**
- Distinguish between "Accepted Order Value" (Quotes) and "Collected Amount".
- If Accepted Value > Collected, refer to it as a "Potential Collection Gap" or "Pending Milestone".
- DO NOT use the word "Leakage" for normal outstanding payments. Use it only for technical drop-offs.
- Label Installed Capacity as kWp (Peak Capacity), not Energy Yield.

**INSTRUCTIONS:**
1. Focus on conversion and collection gaps.
2. Tone: Professional, Expert, and Motivational. Use natural "Hinglish".
3. Accuracy: Cite actual numbers. Use "Observation" or "Potential Risk" for suspected issues.
4. Recommendations: Suggest operational changes (e.g. "Follow up on collection gap of ₹X").

**STRICT RULE:** You are an advisor. You cannot change any data. Output must be structured JSON.`,
});

const solarIntelligenceFlow = ai.defineFlow(
  {
    name: 'solarIntelligenceFlow',
    inputSchema: SolarIntelligenceInputSchema,
    outputSchema: SolarIntelligenceOutputSchema,
  },
  async (input) => {
    const { output } = await solarIntelligencePrompt(input);
    return output!;
  }
);
