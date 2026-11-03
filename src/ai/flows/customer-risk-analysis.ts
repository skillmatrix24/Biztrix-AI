'use server';
/**
 * @fileOverview AI Flow for analyzing customer payment risk and behavior.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RiskAnalysisInputSchema = z.object({
  customerName: z.string(),
  creditBalance: z.number(),
  creditLimit: z.number(),
  lastInteraction: z.string().optional(),
  history: z.array(z.object({
    date: z.string(),
    type: z.string(),
    amount: z.number(),
  })).optional(),
});

export type RiskAnalysisInput = z.infer<typeof RiskAnalysisInputSchema>;

const RiskAnalysisOutputSchema = z.object({
  score: z.number().describe('A score from 0-100 where 100 is perfectly safe.'),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  summary: z.string().describe('A brief explanation of the risk assessment in Hinglish.'),
  recommendation: z.string().describe('Actionable advice for the business owner.'),
});

export type RiskAnalysisOutput = z.infer<typeof RiskAnalysisOutputSchema>;

export async function analyzeCustomerRisk(input: RiskAnalysisInput): Promise<RiskAnalysisOutput> {
  return analyzeCustomerRiskFlow(input);
}

const riskPrompt = ai.definePrompt({
  name: 'analyzeCustomerRiskPrompt',
  input: { schema: RiskAnalysisInputSchema },
  output: { schema: RiskAnalysisOutputSchema },
  prompt: `You are an expert financial risk analyst for an Indian small business.
    Analyze the following customer data:
    
    Customer: {{{customerName}}}
    Current Outstanding: ₹{{{creditBalance}}}
    Credit Limit: ₹{{{creditLimit}}}
    Last Interaction: {{{lastInteraction}}}
    
    Transaction History Snippet:
    {{#each history}}
    - {{{date}}}: {{{type}}} of ₹{{{amount}}}
    {{/each}}

    Determine:
    1. A reliability score (0-100).
    2. Risk level (low to critical).
    3. A conversational summary in Hinglish about their payment pattern.
    4. A recommendation (e.g., "Allow more credit", "Stop further billing", "Send firm reminder").

    If the balance is very high compared to the limit, mark risk as high.
    If they haven't paid in a long time, mark risk as high.`,
});

const analyzeCustomerRiskFlow = ai.defineFlow(
  {
    name: 'analyzeCustomerRiskFlow',
    inputSchema: RiskAnalysisInputSchema,
    outputSchema: RiskAnalysisOutputSchema,
  },
  async (input) => {
    const { output } = await riskPrompt(input);
    return output!;
  }
);
