'use server';
/**
 * @fileOverview AI Flow for generating targeted WhatsApp Loyalty Campaigns.
 * Updated to support deep member data nodes like card numbers and event dates.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CampaignSuggestionInputSchema = z.object({
  businessName: z.string(),
  segment: z.string().describe('Target audience segment (e.g. Inactive, Premium, Birthday Month).'),
  goal: z.string().describe('Campaign objective (e.g. Increase visits, promote sale).'),
  availableOffer: z.string().optional().describe('Details of the coupon or reward being offered.'),
});

export type CampaignSuggestionInput = z.infer<typeof CampaignSuggestionInputSchema>;

const CampaignSuggestionOutputSchema = z.object({
  campaignTitle: z.string(),
  whatsappMessage: z.string().describe('Personalized WhatsApp copy with mandatory placeholders. Supported: {{name}}, {{card_number}}, {{points}}, {{wallet}}, {{event_date}}, {{track_url}}.'),
  suggestedTiming: z.string(),
  reasoning: z.string().describe('Why this copy works for this segment in Hinglish.'),
});

export type CampaignSuggestionOutput = z.infer<typeof CampaignSuggestionOutputSchema>;

export async function suggestCampaign(input: CampaignSuggestionInput): Promise<CampaignSuggestionOutput> {
  return suggestLoyaltyCampaignFlow(input);
}

const campaignPrompt = ai.definePrompt({
  name: 'suggestLoyaltyCampaignPrompt',
  input: { schema: CampaignSuggestionInputSchema },
  output: { schema: CampaignSuggestionOutputSchema },
  prompt: `You are a "WhatsApp Growth Architect" for the Biztrix AI OS.
    Generate a high-conversion bulk campaign for {{{businessName}}}.
    
    **CONTEXT:**
    - Segment: {{{segment}}}
    - Goal: {{{goal}}}
    - Offer: {{{availableOffer}}}
    
    **DATA NODE CAPABILITIES (MANDATORY):**
    You MUST use at least 2-3 of these placeholders for high personalization:
    - {{name}} : Customer's Full Name
    - {{card_number}} : Their Unique Membership ID
    - {{points}} : Current Reward Point Balance
    - {{wallet}} : Cashback Wallet Balance
    - {{event_date}} : Upcoming Birthday or Anniversary Date (if relevant to segment)
    - {{track_url}} : Their Personal Digital Card Link
    
    **INSTRUCTIONS:**
    1. The message must be friendly, professional, and use "Hinglish" naturally.
    2. Use emojis to make it visual and attractive for an Indian audience.
    3. Ensure the tone matches the segment (e.g., Premium should feel exclusive, Inactive should feel like a "Miss You" note).
    4. Provide reasoning in Hinglish explaining the conversion logic.
    
    Return valid JSON only.`,
});

const suggestLoyaltyCampaignFlow = ai.defineFlow(
  {
    name: 'suggestLoyaltyCampaignFlow',
    inputSchema: CampaignSuggestionInputSchema,
    outputSchema: CampaignSuggestionOutputSchema,
  },
  async (input) => {
    const { output } = await campaignPrompt(input);
    return output!;
  }
);
