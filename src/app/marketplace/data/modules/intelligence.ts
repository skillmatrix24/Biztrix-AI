
import { ModuleDetail, MarketplaceItem } from "../types";

export const intelligenceItem: MarketplaceItem = { 
  id: 'suite_intelligence', 
  name: 'Intelligence Suite', 
  description: 'AI Advisor, AI Bill Scanner & Smart Operations.', 
  price: '1499', 
  icon: 'Bot', 
  isPopular: false, 
  category: 'Bundles',
  isTrialAvailable: true,
  inclusions: "Gemini Advisor, OCR Scanner, Reorder Math, Risk AI"
};

export const intelligenceDetail: ModuleDetail = {
  id: 'suite_intelligence',
  title: "Intelligence & AI Suite",
  logicTitle: "Cognitive Operations Engine",
  description: "AI-powered business advisor and document processing nodes.",
  features: [
    "Gemini Pro 1.5 Grounded Business Advisor",
    "Vision AI Bill Scanner (Photo to Inventory)",
    "Predictive Stock Reorder Math",
    "Customer Payment Risk Analysis",
    "Dynamic Task SOP Generator"
  ],
  rules: [
    "Context Aware: AI only scans authorized data nodes (Inventory/Leads).",
    "Data Grounding: Responses are based on real-time Firestore snapshots.",
    "Privacy Isolation: LLM context is strictly tenant-isolated."
  ],
  backend: "Genkit Flow architecture with Handlebars templating for data-rich prompts."
};
