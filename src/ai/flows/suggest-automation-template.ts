
'use server';
/**
 * @fileOverview AI Flow for generating automated loyalty rule messages.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AutomationTemplateInputSchema = z.object({
  businessName: z.string(),
  ruleType: z.string().describe('The type of trigger: birthday, anniversary, special_event, high_value_bill, points_milestone, first_purchase, member_conversion, etc.'),
  threshold: z.number().optional().describe('The value threshold (if any) like 5000 rupees or 1000 points.'),
  offerDetails: z.string().optional().describe('Details of the reward or coupon attached to this rule.'),
});

export type AutomationTemplateInput = z.infer<typeof AutomationTemplateInputSchema>;

const AutomationTemplateOutputSchema = z.object({
  template: z.string().describe('The generated message template with placeholders.'),
  reasoning: z.string().describe('Explanation of why this template works in Hinglish.'),
});

export type AutomationTemplateOutput = z.infer<typeof AutomationTemplateOutputSchema>;

export async function suggestAutomationTemplate(input: AutomationTemplateInput): Promise<AutomationTemplateOutput> {
  return suggestAutomationTemplateFlow(input);
}

const templatePrompt = ai.definePrompt({
  name: 'suggestAutomationTemplatePrompt',
  input: { schema: AutomationTemplateInputSchema },
  output: { schema: AutomationTemplateOutputSchema },
  prompt: `You are a "Loyalty Retention Expert" for an Indian business. 
    Generate a high-engagement WhatsApp message template for an automated rule in {{{businessName}}}.
    
    **RULE TYPE:** {{{ruleType}}}
    {{#if threshold}}**THRESHOLD:** {{{threshold}}}{{/if}}
    {{#if offerDetails}}**OFFER:** {{{offerDetails}}}{{/if}}
    
    **INSTRUCTIONS:**
    1. The message must be friendly, concise, and use "Hinglish" naturally.
    2. Context Awareness:
       - 🎂 for birthday
       - 💍 for anniversary
       - 🎁 for first purchase
       - 💎 for high value
       - 🏆 for conversion/membership
    3. MANDATORY: You must use at least these placeholders: {{name}}, {{track_url}}.
    4. Optional placeholders: {{points}}, {{coupon_code}}, {{business_name}}.
    5. Ensure the tone matches a professional yet warm business relationship.
    
    Return valid JSON only.`,
});

const suggestAutomationTemplateFlow = ai.defineFlow(
  {
    name: 'suggestAutomationTemplateFlow',
    inputSchema: AutomationTemplateInputSchema,
    outputSchema: AutomationTemplateOutputSchema,
  },
  async (input) => {
    const { output } = await templatePrompt(input);
    return output!;
  }
);
