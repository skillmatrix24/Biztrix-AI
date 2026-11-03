'use server';
/**
 * @fileOverview AI Flow for suggesting marketplace modules to business owners.
 * Analyzes current active modules and business context to provide upsell strategies.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const UpsellInputSchema = z.object({
  businessName: z.string(),
  activeModules: z.array(z.string()).describe('List of currently active module names.'),
  availableModules: z.array(z.object({
    name: z.string(),
    description: z.string(),
    price: z.string()
  })).describe('List of modules the user has NOT bought yet.')
});

export type UpsellInput = z.infer<typeof UpsellInputSchema>;

const UpsellOutputSchema = z.object({
  suggestions: z.array(z.object({
    moduleName: z.string().describe('The name of the recommended module.'),
    reasoning: z.string().describe('Why this is a good fit for this specific user in Hinglish.'),
    potentialImpact: z.string().describe('The business growth benefit.'),
    strategy: z.string().describe('Short sales pitch for the platform owner.')
  })).describe('Top 2-3 upsell recommendations.'),
});

export type UpsellOutput = z.infer<typeof UpsellOutputSchema>;

export async function suggestUpsellModules(input: UpsellInput): Promise<UpsellOutput> {
  return suggestUpsellModulesFlow(input);
}

const upsellPrompt = ai.definePrompt({
  name: 'suggestUpsellModulesPrompt',
  input: { schema: UpsellInputSchema },
  output: { schema: UpsellOutputSchema },
  prompt: `You are a SaaS Growth Consultant for "Biztrix AI". 
    Analyze this customer's current setup:
    
    Business: {{{businessName}}}
    Currently Using: {{#each activeModules}}{{{this}}}, {{/each}}
    
    Not Yet Using:
    {{#each availableModules}}
    - {{{name}}}: {{{description}}} (Price: ₹{{{price}}})
    {{/each}}

    Your Task:
    1. Identify the 2 most valuable modules they are missing.
    2. Provide a "Reasoning" in Hinglish explaining why they need it based on what they already use.
    3. Suggest a "Sales Strategy" for the platform owner to pitch this.

    Tone: Expert, strategic, and concise.`,
});

const suggestUpsellModulesFlow = ai.defineFlow(
  {
    name: 'suggestUpsellModulesFlow',
    inputSchema: UpsellInputSchema,
    outputSchema: UpsellOutputSchema,
  },
  async (input) => {
    const { output } = await upsellPrompt(input);
    return output!;
  }
);
