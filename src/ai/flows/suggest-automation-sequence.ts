
'use server';
/**
 * @fileOverview AI Flow for generating multi-step loyalty engagement sequences.
 * 
 * - suggestAutomationSequence - Generates a 3-step WhatsApp sequence based on business context and trigger type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SequenceTemplateInputSchema = z.object({
  businessName: z.string(),
  ruleType: z.string().describe('The type of trigger: birthday, anniversary, special_event, expiry, inactive, first_purchase, member_conversion, etc.'),
  offerDetails: z.string().optional().describe('Details of the reward or coupon attached.'),
});

export type SequenceTemplateInput = z.infer<typeof SequenceTemplateInputSchema>;

const SequenceTemplateOutputSchema = z.object({
  stages: z.array(z.object({
    days: z.number().describe('Day relative to event (e.g. 7 for 7 days before, -2 for 2 days after, 0 for same day)'),
    template: z.string().describe('Message content with placeholders like {{name}}, {{track_url}}'),
    label: z.string().describe('Engaging stage name (e.g. Welcome, Early Bird, Final Call)')
  })).describe('A 3-step sequence of messages.')
});

export type SequenceTemplateOutput = z.infer<typeof SequenceTemplateOutputSchema>;

export async function suggestAutomationSequence(input: SequenceTemplateInput): Promise<SequenceTemplateOutput> {
  return suggestAutomationSequenceFlow(input);
}

const sequencePrompt = ai.definePrompt({
  name: 'suggestAutomationSequencePrompt',
  input: { schema: SequenceTemplateInputSchema },
  output: { schema: SequenceTemplateOutputSchema },
  prompt: `You are a "CRM Retention Specialist" for an Indian business. 
    Generate a 3-step WhatsApp sequence for the rule: {{{ruleType}}} in business "{{{businessName}}}".
    
    **OFFER:** {{{offerDetails}}}
    
    **INSTRUCTIONS BY TYPE:**
    - If first_purchase: Warm welcome for a new customer. Focus on gratitude and brand intro.
    - If member_conversion: Target non-members. Highlight benefits like points and exclusive cards. Use urgency for 'joining bonus'.
    - If Anniversary: Use romantic/celebratory tone (💍, ❤️).
    - If Special Event: Use festive/excitement tone (🎉, ✨).
    - If Birthday: Use party tone (🎂, 🎈).
    - If High Value: Use premium/exclusive tone (🚀, 💎).
    
    **SEQUENCE LOGIC:**
    1. Create a logical progression:
       - Step 1: Nurture/Alert (Warm, informative).
       - Step 2: Core Offer/Reminder (Direct, value-driven).
       - Step 3: Scarcity/Final Call (Urgency, "miss you" or "last chance").
    
    **TONE & LANGUAGE:**
    - Friendly "Hinglish" naturally mixed. Professional yet warm.
    - Use relevant emojis.
    - Placeholders: {{name}}, {{track_url}} are MANDATORY. Optional: {{points}}, {{coupon_code}}, {{business_name}}.
    
    Return 3 stages as a JSON array matching the output schema.`,
});

const suggestAutomationSequenceFlow = ai.defineFlow(
  {
    name: 'suggestAutomationSequenceFlow',
    inputSchema: SequenceTemplateInputSchema,
    outputSchema: SequenceTemplateOutputSchema,
  },
  async (input) => {
    const { output } = await sequencePrompt(input);
    return output!;
  }
);
