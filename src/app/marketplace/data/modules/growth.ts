
import { ModuleDetail, MarketplaceItem } from "../types";

export const growthItem: MarketplaceItem = { 
  id: 'suite_growth', 
  name: 'Growth Suite', 
  description: 'WhatsApp Automation, Marketing Tools & CRM Pulse.', 
  price: '999', 
  icon: 'Zap', 
  isPopular: true, 
  category: 'Bundles',
  isTrialAvailable: true,
  inclusions: "WhatsApp API, ROI Tracking, AI Lead Scoring, Sequences"
};

export const growthDetail: ModuleDetail = {
  id: 'suite_growth',
  title: "Growth & Automation Suite",
  logicTitle: "Meta Cloud API Marketing Node",
  description: "Automated WhatsApp sequences and ROI-driven marketing controls.",
  features: [
    "Official Meta Cloud API v21.0 Integration",
    "3-Step Nurturing Sequences (Day 1, 3, 7)",
    "Lead Intent Scoring based on visit patterns",
    "Interactive Button Templates for higher CTR",
    "Marketing ROI Analytics mapped to sales ledger"
  ],
  rules: [
    "Spam Guard: Automated 5-second staggering between messages.",
    "Opt-in Logic: Messages are only dispatched to verified consent nodes.",
    "Approved Templates: All outbound comms must use verified Meta Blueprints."
  ],
  backend: "Real-time Webhook listener for message ticks (Sent, Delivered, Read)."
};
