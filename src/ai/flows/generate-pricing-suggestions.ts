'use server';
/**
 * @fileOverview A Genkit flow for generating personalized pricing suggestions.
 *
 * - generatePricingSuggestions - A function that leverages AI to analyze past sales performance and customer purchasing patterns, and provide personalized suggestions for adjusting product prices.
 * - GeneratePricingSuggestionsInput - The input type for the generatePricingSuggestions function.
 * - GeneratePricingSuggestionsOutput - The return type for the generatePricingSuggestions function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SalesRecordSchema = z.object({
  productName: z.string().describe('The name of the product sold.'),
  quantitySold: z.number().int().positive().describe('The quantity of the product sold.'),
  pricePerUnit: z.number().positive().describe('The price per unit at which the product was sold.'),
  saleDate: z.string().describe('The date of the sale (YYYY-MM-DD).'),
  customerSegment: z.string().optional().describe('The customer segment, e.g., "B2C", "Wholesale".'),
});

const InventoryRecordSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  costPerUnit: z.number().positive().describe('The cost of acquiring or producing one unit of the product.'),
  currentStock: z.number().int().min(0).describe('The current number of units in stock.'),
  lastRestocked: z.string().optional().describe('The date the product was last restocked (YYYY-MM-DD).'),
});

const CustomerPatternSchema = z.object({
  customerSegment: z.string().describe('The customer segment, e.g., "B2C", "Wholesale".'),
  averagePurchaseValue: z.number().positive().describe('The average value of purchases by this segment.'),
  purchaseFrequency: z.string().describe('How often customers in this segment typically purchase, e.g., "monthly", "quarterly".'),
  priceSensitivity: z.string().optional().describe('An assessment of this segment\'s price sensitivity, e.g., "high", "medium", "low".'),
});


const GeneratePricingSuggestionsInputSchema = z.object({
  salesData: z.array(SalesRecordSchema).describe('Historical sales records for various products.'),
  inventoryData: z.array(InventoryRecordSchema).describe('Current inventory and cost data for products.'),
  customerPurchasingPatterns: z.array(CustomerPatternSchema).describe('Aggregated patterns of customer purchasing behavior.'),
  businessGoal: z.enum(['maximize profit', 'increase sales volume', 'clear old stock']).describe('The primary business objective for price adjustments.'),
});
export type GeneratePricingSuggestionsInput = z.infer<typeof GeneratePricingSuggestionsInputSchema>;

const PricingSuggestionSchema = z.object({
  productName: z.string().describe('The name of the product for which the suggestion is made.'),
  currentPrice: z.number().positive().describe('The current selling price of the product.'),
  suggestedPrice: z.number().positive().describe('The AI-suggested new selling price for the product.'),
  reasoning: z.string().describe('A detailed explanation for the suggested price adjustment, considering sales, costs, and customer patterns.'),
  expectedImpact: z.string().describe('The anticipated impact of the suggested price on the business goal (e.g., "Expected to increase profit by 5%", "Anticipated to boost sales volume by 10%").'),
});

const GeneratePricingSuggestionsOutputSchema = z.object({
  suggestions: z.array(PricingSuggestionSchema).describe('A list of personalized pricing suggestions for products.'),
});
export type GeneratePricingSuggestionsOutput = z.infer<typeof GeneratePricingSuggestionsOutputSchema>;

export async function generatePricingSuggestions(input: GeneratePricingSuggestionsInput): Promise<GeneratePricingSuggestionsOutput> {
  return generatePricingSuggestionsFlow(input);
}

const generatePricingSuggestionsPrompt = ai.definePrompt({
  name: 'generatePricingSuggestionsPrompt',
  input: { schema: GeneratePricingSuggestionsInputSchema },
  output: { schema: GeneratePricingSuggestionsOutputSchema },
  prompt: `You are an expert business analyst specializing in pricing strategies. Your task is to analyze historical sales data, current inventory costs, and customer purchasing patterns to provide personalized pricing suggestions that align with the specified business goal.

Analyze the following data:

**Historical Sales Data:**
{{#each salesData}}
- Product: {{{productName}}}, Qty Sold: {{{quantitySold}}}, Price: {{{pricePerUnit}}}, Date: {{{saleDate}}}, Segment: {{{customerSegment}}}
{{/each}}

**Current Inventory Data:**
{{#each inventoryData}}
- Product: {{{productName}}}, Cost: {{{costPerUnit}}}, Stock: {{{currentStock}}}, Last Restocked: {{{lastRestocked}}}
{{/each}}

**Customer Purchasing Patterns:**
{{#each customerPurchasingPatterns}}
- Segment: {{{customerSegment}}}, Avg Value: {{{averagePurchaseValue}}}, Frequency: {{{purchaseFrequency}}}, Sensitivity: {{{priceSensitivity}}}
{{/each}}

**Business Goal:** {{{businessGoal}}}

Based on this information, provide specific pricing suggestions for products to achieve the "{{{businessGoal}}}" goal. For each suggestion, include the product name, its current price, the suggested new price, a detailed reasoning for your suggestion, and the expected impact on the business goal.

Ensure your output is a JSON object matching the GeneratePricingSuggestionsOutputSchema.`,
});

const generatePricingSuggestionsFlow = ai.defineFlow(
  {
    name: 'generatePricingSuggestionsFlow',
    inputSchema: GeneratePricingSuggestionsInputSchema,
    outputSchema: GeneratePricingSuggestionsOutputSchema,
  },
  async (input) => {
    const { output } = await generatePricingSuggestionsPrompt(input);
    return output!;
  }
);
