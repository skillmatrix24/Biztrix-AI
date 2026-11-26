import { ModuleDetail, MarketplaceItem } from "../types";

export const enterpriseItem: MarketplaceItem = {
  id: "suite_enterprise",
  name: "Biztrix All-in-One Enterprise OS",
  description: "Complete unconstrained access: unlock all 11 business suites, e-commerce funnels, solar EPC, real estate, support desk & AI advisor in one master plan.",
  price: "2999",
  icon: "Sparkles",
  isPopular: true,
  category: "Bundles",
  isTrialAvailable: true,
  inclusions: "All 11 Suites Unlocked, All 16+ Add-ons, Unlimited Users & Multi-Branch, Priority Processing, Highest Annual Discount",
  sortOrder: 0,
};

export const enterpriseDetail: ModuleDetail = {
  id: "suite_enterprise",
  title: "Biztrix All-in-One Enterprise OS",
  logicTitle: "Master Business Operating System",
  description: "The ultimate enterprise subscription that eliminates all modular boundaries. Gain instant, unconstrained access to every capability across E-Commerce, Solar EPC, Real Estate, HR & Payroll, GST Accounting, WhatsApp Automation, and AI Advisory.",
  sections: [
    {
      title: "Omnichannel Commerce & Funnels",
      icon: "ShoppingBag",
      desc: "Full access to 23-section online storefront, visual editor, high-speed sales funnels, and customer loyalty pass portal.",
    },
    {
      title: "Workforce, Attendance & Payroll",
      icon: "Users2",
      desc: "Card & List view staff directory, daily attendance matrix, multi-assign task manager, and payment approvals.",
    },
    {
      title: "Statutory Tax & Financial P&L",
      icon: "FileSpreadsheet",
      desc: "Live GSP E-Way bill API, GSTR-1/3B filing reports, double-entry ledger, and AI purchase bill OCR.",
    },
    {
      title: "Industry Verticals & Solar EPC",
      icon: "Sun",
      desc: "End-to-end solar lifecycle (Surveys, 3D Design, BOQ, Installations, Plant Monitor, Warranties, AMC) and real estate catalog.",
    },
  ],
  features: [
    "Unlocks Every Single Business Suite & Individual Add-on in Biztrix OS",
    "Unlimited Multi-Branch Locations, Staff Members & Client Portals",
    "Dedicated High-Priority Compute Queue with Fast API Response Times",
    "White-Label Custom Branding with Custom Logo & Favicon Sync",
    "Comprehensive Anti-Fraud Security Hardening Across All Ledger Modules",
    "Priority Phone & WhatsApp Support Channel with Dedicated Account Lead",
  ],
  rules: [
    "Master Entitlement: Activates every sidebar menu group without requiring individual add-on purchases.",
    "Data Sovereignty: Dedicated tenant isolation with automated Firestore backup snapshots.",
  ],
  backend: "Global orchestration node bridging CRM, POS, Supply Chain, and Accounting collections.",
};
