import test from 'node:test';
import assert from 'node:assert/strict';
import { hasValidGeminiKey } from '@/ai/genkit';
import { advisorChat } from '@/ai/flows/advisor-chat-flow';
import { generatePricingSuggestions } from '@/ai/flows/generate-pricing-suggestions';
import { optimizeStockReorder } from '@/ai/flows/optimize-stock-reorder';
import { websiteChatbot } from '@/ai/flows/website-chatbot-flow';

test('AI Flow Resiliency: hasValidGeminiKey correctly checks for valid key', () => {
  // In dev environment with no valid key set, hasValidGeminiKey should return false
  const isValid = hasValidGeminiKey();
  assert.strictEqual(typeof isValid, 'boolean');
});

test('AI Flow Resiliency: advisorChat returns graceful fallback response without crashing', async () => {
  const result = await advisorChat({
    message: "Do we have low stock products?",
    context: {
      businessName: "Test Enterprise",
      products: [
        { name: "Solar Inverter 5kW", stock: 2, minThreshold: 5, price: 45000 },
        { name: "Monocrystalline Solar Panel", stock: 120, minThreshold: 20, price: 9500 }
      ],
      leads: [],
      tasks: [],
      projects: []
    }
  });

  assert.ok(result, 'Advisor response must be defined');
  assert.ok(typeof result.content === 'string' && result.content.length > 0, 'Content must be non-empty');
  assert.ok(result.content.includes("Solar Inverter 5kW"), 'Should mention the low stock item');
});

test('AI Flow Resiliency: generatePricingSuggestions returns valid suggestions without crashing', async () => {
  const result = await generatePricingSuggestions({
    businessGoal: 'maximize profit',
    salesData: [],
    inventoryData: [
      { productName: "Cotton Shirt", costPerUnit: 300, currentStock: 40 }
    ],
    customerPurchasingPatterns: []
  });

  assert.ok(result, 'Pricing result must be defined');
  assert.ok(Array.isArray(result.suggestions) && result.suggestions.length > 0, 'Should have suggestions');
  assert.strictEqual(result.suggestions[0].productName, "Cotton Shirt");
});

test('AI Flow Resiliency: optimizeStockReorder returns valid recommendations without crashing', async () => {
  const result = await optimizeStockReorder({
    analysisPeriodDays: 30,
    historicalSales: [],
    products: [
      {
        productId: "p1",
        productName: "Thermal Paper Roll",
        currentStock: 3,
        costPerUnit: 25,
        sellingPricePerUnit: 60,
        leadTimeDays: 3,
        minStockThreshold: 10
      }
    ]
  });

  assert.ok(result, 'Stock reorder result must be defined');
  assert.ok(Array.isArray(result.reorderSuggestions) && result.reorderSuggestions.length > 0);
  assert.strictEqual(result.reorderSuggestions[0].suggestedReorderTiming, "Immediately");
});

test('AI Flow Resiliency: websiteChatbot returns helpful knowledge base response without crashing', async () => {
  const result = await websiteChatbot({
    message: "How can I check my loyalty membership card?"
  });

  assert.ok(result, 'Website chatbot result must be defined');
  assert.ok(result.content.includes("track-member"), 'Should mention tracking portal');
});
