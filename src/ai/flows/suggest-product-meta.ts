
'use server';
/**
 * @fileOverview AI flow for suggesting HSN Code, GST Rate, and Category based on product name.
 *
 * - suggestProductMeta - A function that analyzes product name and returns meta data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestProductMetaInputSchema = z.object({
  productName: z.string().describe('The name of the product to analyze.'),
});
export type SuggestProductMetaInput = z.infer<typeof SuggestProductMetaInputSchema>;

const SuggestProductMetaOutputSchema = z.object({
  hsnCode: z.string().describe('The suggested HSN code for this product.'),
  gstRate: z.number().describe('The suggested GST percentage (0, 5, 12, 18, 28).'),
  category: z.string().describe('The broad business category for this product.'),
  description: z.string().describe('A professional marketing description for the product.'),
});
export type SuggestProductMetaOutput = z.infer<typeof SuggestProductMetaOutputSchema>;

export async function suggestProductMeta(input: SuggestProductMetaInput): Promise<SuggestProductMetaOutput> {
  return suggestProductMetaFlow(input);
}

const suggestProductMetaFlow = ai.defineFlow(
  {
    name: 'suggestProductMetaFlow',
    inputSchema: SuggestProductMetaInputSchema,
    outputSchema: SuggestProductMetaOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      prompt: `You are an expert Indian GST and Retail specialist.
      Analyze the product name: "${input.productName}"
      
      Suggest:
      1. A likely HSN code.
      2. The correct GST percentage slab (must be one of 0, 5, 12, 18, 28).
      3. A broad category (e.g., Electronics, Grocery, Apparel).
      4. A professional 2-sentence marketing description.
      
      Return as valid JSON.`,
      output: { schema: SuggestProductMetaOutputSchema }
    });
    return output!;
  }
);
