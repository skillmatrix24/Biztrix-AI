
import { ModuleDetail, MarketplaceItem } from "../types";

export const supportItem: MarketplaceItem = { 
  id: 'suite_support', 
  name: 'Customer Support Pro', 
  description: 'Tickets, Team Assignment & CSAT Analytics.', 
  price: '699', 
  icon: 'Headset', 
  category: 'Bundles', 
  isTrialAvailable: true, 
  inclusions: "Support Tickets, Tracking Portals, SLA Alerts" 
};

export const supportDetail: ModuleDetail = {
  id: 'suite_support',
  title: "Customer Support Pro",
  logicTitle: "Service Resolution Node",
  description: "Ticketing system and automated satisfaction tracking.",
  features: [
    "Unified Multi-channel Ticketing",
    "SLA Based Escalation Alerts",
    "Team Assignment & Collaborative Resolution",
    "Customer Progress Tracking Portals",
    "CSAT & Feedback Analytics"
  ],
  rules: [
    "Auto-Escalation: Tickets move to 'Urgent' if no action in 24 hours.",
    "Privacy Guard: Only assigned members see complaint evidence.",
    "Verification: Customer identity confirmed via phone OTP."
  ],
  backend: "Timeline log triggers for every status change and internal note."
};
