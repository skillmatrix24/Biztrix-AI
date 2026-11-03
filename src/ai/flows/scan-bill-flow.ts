
'use server';
/**
 * @fileOverview AI flow for extracting structured data from purchase bills/invoices.
 * Uses Gemini Vision to parse images and return JSON.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ScanBillInputSchema = z.object({
  photoDataUri: z.string().describe("A photo of a bill, as a data URI. Format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ScanBillInput = z.infer<typeof ScanBillInputSchema>;

const BillItemSchema = z.object({
  name: z.string().describe("Name of the product."),
  qty: z.number().describe("Quantity purchased."),
  price: z.number().describe("Unit price before tax."),
  total: z.number().describe("Line total."),
  unit: z.string().describe("Unit of measurement, e.g. pcs, kg."),
});

const ScanBillOutputSchema = z.object({
  vendorName: z.string().describe("Name of the supplier."),
  date: z.string().describe("Bill date in YYYY-MM-DD format."),
  totalAmount: z.number().describe("Final total amount on the bill."),
  items: z.array(BillItemSchema).describe("List of individual products extracted."),
  confidence: z.enum(['high', 'low']).describe("AI's confidence in the extraction."),
});
export type ScanBillOutput = z.infer<typeof ScanBillOutputSchema>;

export async function scanBill(input: ScanBillInput): Promise<ScanBillOutput> {
  return scanBillFlow(input);
}

const scanBillPrompt = ai.definePrompt({
  name: 'scanBillPrompt',
  input: { schema: ScanBillInputSchema },
  output: { schema: ScanBillOutputSchema },
  prompt: `You are an elite accounting OCR agent. Your task is to extract data from this purchase bill image.
    
    Look for:
    1. Vendor/Supplier Name at the top.
    2. Bill Date.
    3. Final Total Amount at the bottom.
    4. Table of items with names, quantities, and prices.

    Bill Image: {{media url=photoDataUri}}
    
    Ensure the output is valid JSON matching the schema. If any data is unclear, set confidence to 'low'.`,
});

const scanBillFlow = ai.defineFlow(
  {
    name: 'scanBillFlow',
    inputSchema: ScanBillInputSchema,
    outputSchema: ScanBillOutputSchema,
  },
  async (input) => {
    const { output } = await scanBillPrompt(input);
    return output!;
  }
);
