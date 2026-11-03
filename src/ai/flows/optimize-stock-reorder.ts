'use server';
/**
 * @fileOverview An AI agent that analyzes historical sales and inventory data to suggest optimal reorder quantities and timings for products.
 *
 * - optimizeStockReorder - A function that handles the stock reorder optimization process.
 * - OptimizeStockReorderInput - The input type for the optimizeStockReorder function.
 * - OptimizeStockReorderOutput - The return type for the optimizeStockReorder function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProductDataSchema = z.object({
  productId: z.string().describe('Unique identifier for the product.'),
  productName: z.string().describe('Name of the product.'),
  currentStock: z.number().int().min(0).describe('Current quantity of the product in stock.'),
  costPerUnit: z.number().min(0).describe('Cost to purchase one unit of the product.'),
  sellingPricePerUnit: z.number().min(0).describe('Selling price of one unit of the product.'),
  leadTimeDays: z.number().int().min(0).describe('Number of days it takes to receive a new order.'),
  minStockThreshold: z
    .number()
    .int()
    .min(0)
    .describe('Minimum stock level before a reorder is considered.'),
});
export type ProductData = z.infer<typeof ProductDataSchema>;

const SalesEntrySchema = z.object({
  productId: z.string().describe('Unique identifier for the product sold.'),
  date: z.string().datetime().describe('Date and time of the sale in ISO format.'),
  quantitySold: z.number().int().min(1).describe('Quantity of the product sold.'),
});
export type SalesEntry = z.infer<typeof SalesEntrySchema>;

const OptimizeStockReorderInputSchema = z.object({
  products: z.array(ProductDataSchema).describe('List of all products with their current details.'),
  historicalSales: z
    .array(SalesEntrySchema)
    .describe('Historical sales data for all products over a period.'),
  analysisPeriodDays: z
    .number()
    .int()
    .min(1)
    .describe('Number of past days to consider for sales analysis.'),
});
export type OptimizeStockReorderInput = z.infer<typeof OptimizeStockReorderInputSchema>;

const ReorderSuggestionSchema = z.object({
  productId: z.string().describe('Unique identifier of the product.'),
  productName: z.string().describe('Name of the product.'),
  suggestedReorderQuantity: z.number().int().min(0).describe('Optimal quantity to reorder for the product.'),
  suggestedReorderTiming: z
    .string()
    .describe('Suggested timing for the reorder (e.g., "immediately", "in 5 days", "when stock drops below X").'),
  rationale: z
    .string()
    .describe(
      'Explanation for the suggested reorder quantity and timing, considering sales trends, lead times, and current stock.'
    ),
});

const OptimizeStockReorderOutputSchema = z.object({
  reorderSuggestions: z.array(ReorderSuggestionSchema).describe('List of reorder suggestions for each product.'),
  overallSummary: z
    .string()
    .describe('An overall summary of the reorder strategy and key findings.'),
});
export type OptimizeStockReorderOutput = z.infer<typeof OptimizeStockReorderOutputSchema>;

export async function optimizeStockReorder(
  input: OptimizeStockReorderInput
): Promise<OptimizeStockReorderOutput> {
  return optimizeStockReorderFlow(input);
}

const optimizeStockReorderPrompt = ai.definePrompt({
  name: 'optimizeStockReorderPrompt',
  input: {schema: OptimizeStockReorderInputSchema},
  output: {schema: OptimizeStockReorderOutputSchema},
  prompt: `You are an expert supply chain and inventory management consultant. Your task is to analyze product data and historical sales to suggest optimal reorder quantities and timings for each product.

Consider the following data to provide your recommendations:

Products:
{{#each products}}
  - Product ID: {{{productId}}}, Name: {{{productName}}}, Current Stock: {{{currentStock}}}, Cost: {{{costPerUnit}}}, Selling Price: {{{sellingPricePerUnit}}}, Lead Time: {{{leadTimeDays}}} days, Min Stock Threshold: {{{minStockThreshold}}}
{{/each}}

Historical Sales for the last {{{analysisPeriodDays}}} days:
{{#each historicalSales}}
  - Product ID: {{{productId}}}, Date: {{{date}}}, Quantity Sold: {{{quantitySold}}}
{{/each}}

Based on this information, provide optimal reorder suggestions for each product to minimize stockouts and reduce inventory holding costs. For each suggestion, provide a clear rationale.
`,
});

const optimizeStockReorderFlow = ai.defineFlow(
  {
    name: 'optimizeStockReorderFlow',
    inputSchema: OptimizeStockReorderInputSchema,
    outputSchema: OptimizeStockReorderOutputSchema,
  },
  async input => {
    const {output} = await optimizeStockReorderPrompt(input);
    return output!;
  }
);
