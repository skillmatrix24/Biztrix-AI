'use server';
/**
 * @fileOverview AI Flow for Analyzing Loyalty Behavior & Customer Churn.
 * Generates scores and segments based on customer transaction and membership data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LoyaltyIntelligenceInputSchema = z.object({
  customerName: z.string(),
  stats: z.object({
    totalSpent: z.number().describe('Lifetime spend of the customer.'),
    visitCount: z.number().describe('Total number of invoices generated.'),
    lastVisitDaysAgo: z.number().describe('Days since last transaction.'),
    rewardPoints: z.number().describe('Current reward points balance.'),
    walletBalance: z.number().describe('Current cashback wallet balance.'),
    isMember: z.boolean().describe('Whether the customer has an active membership.'),
    membershipTier: z.string().optional().describe('Silver, Gold, or Platinum.'),
  }),
  history: z.array(z.object({
    date: z.string(),
    type: z.string(),
    amount: z.number().optional(),
  })).optional().describe('Brief history of recent loyalty activities.'),
});

export type LoyaltyIntelligenceInput = z.infer<typeof LoyaltyIntelligenceInputSchema>;

const LoyaltyIntelligenceOutputSchema = z.object({
  segment: z.enum(['high-value', 'loyal', 'at-risk', 'inactive', 'new-prospect', 'coupon-hunter']),
  scores: z.object({
    loyalty: z.number().min(0).max(100),
    churnRisk: z.number().min(0).max(100),
    engagement: z.number().min(0).max(100),
  }),
  insight: z.string().describe('A brief behavioral insight in Hinglish.'),
  recommendation: z.object({
    action: z.string(),
    couponType: z.string().optional(),
    discountSuggested: z.string().optional(),
    timing: z.string().optional(),
  }),
});

export type LoyaltyIntelligenceOutput = z.infer<typeof LoyaltyIntelligenceOutputSchema>;

export async function analyzeLoyalty(input: LoyaltyIntelligenceInput): Promise<LoyaltyIntelligenceOutput> {
  return loyaltyIntelligenceFlow(input);
}

const loyaltyPrompt = ai.definePrompt({
  name: 'loyaltyIntelligencePrompt',
  input: { schema: LoyaltyIntelligenceInputSchema },
  output: { schema: LoyaltyIntelligenceOutputSchema },
  prompt: `You are a high-level "Retail Growth Scientist" for a SaaS business.
    Analyze the following loyalty node for customer: {{{customerName}}}.
    
    **DATA NODE:**
    - Lifetime Spend: ₹{{{stats.totalSpent}}}
    - Visit Count: {{{stats.visitCount}}}
    - Last Active: {{{stats.lastVisitDaysAgo}}} days ago
    - Membership: {{#if stats.isMember}}Active ({{{stats.membershipTier}}}){{else}}Inactive{{/if}}
    - Rewards: {{{stats.rewardPoints}}} Points | ₹{{{stats.walletBalance}}} Wallet
    
    **TASK:**
    1. Determine the customer segment based on behavior (Spend vs Frequency).
    2. Calculate Scores (0-100):
       - Loyalty: Based on visits and membership.
       - Churn Risk: Higher if 'lastVisitDaysAgo' is large (>30 days).
       - Engagement: Based on reward point usage and wallet activity.
    3. Write a sharp behavioral insight in natural "Hinglish".
    4. Suggest a targeted retention or growth action.
    
    Return valid JSON matching the schema.`,
});

const loyaltyIntelligenceFlow = ai.defineFlow(
  {
    name: 'loyaltyIntelligenceFlow',
    inputSchema: LoyaltyIntelligenceInputSchema,
    outputSchema: LoyaltyIntelligenceOutputSchema,
  },
  async (input) => {
    const { output } = await loyaltyPrompt(input);
    return output!;
  }
);
