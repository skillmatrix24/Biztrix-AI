
import { ModuleDetail, MarketplaceItem } from "../types";

export const solarItem: MarketplaceItem = { 
  id: 'suite_solar', 
  name: 'Solar Business OS', 
  description: 'Complete Solar lifecycle from Inquiry to Asset Monitoring Readiness.', 
  price: '1999', 
  icon: 'Sun', 
  category: 'Bundles',
  isTrialAvailable: true,
  inclusions: "Technical BOM, Atomic Inventory Issue, Handover Certificates, Asset Registry"
};

export const solarDetail: ModuleDetail = {
  id: 'suite_solar',
  title: "Solar Business Management Suite",
  logicTitle: "Authoritative Solar Node v3.5",
  description: "Enterprise-grade solar lifecycle orchestration. Manage technical design, procurement, field execution, and post-handover assets with 100% data integrity.",
  sections: [
    {
      title: "Sales Hub",
      icon: "Target",
      desc: "Track inquiries, follow-ups, and customer linkage. Distinguish between 'Accepted Order Value' and 'Collected Amount' for sateek financial reconciliation."
    },
    {
      title: "Engineering Hub",
      icon: "EngineeringIcon",
      desc: "Automated Site Surveys and Technical Designs. Link panels, inverters, and BOS directly to BOM-based quotations with precise tax node calculation."
    },
    {
      title: "Supply Chain",
      icon: "ShoppingBasket",
      desc: "Real-time shortage detection against live inventory. Purchase requisitions linked to existing vendors with atomic goods-receipt stock increment."
    },
    {
      title: "Field Execution",
      icon: "Briefcase",
      desc: "Task-based installation roadmap, team assignment, and material staging. Hardened material issue transaction ensures zero negative stock."
    },
    {
      title: "Asset Registry",
      icon: "Globe",
      desc: "Persistent 'Solar Plant' record after handover. Tracks equipment serials, warranty nodes, and maintenance contracts with monitoring readiness foundation."
    },
    {
      title: "Customer Portals",
      icon: "SearchCode",
      desc: "White-labelled tracking portal for clients. Secure access to technical specs, handover certificates, and warranty status mapped to verified mobile IDs."
    }
  ],
  features: [
    "Technical BOM Mapping to Quotation Node",
    "Atomic Inventory Transaction Protocol (runTransaction)",
    "Financial Accuracy Logic: Accepted Value vs Collection Gap",
    "Automated Handover Certificate (PDF) Generation",
    "Technical Site Survey & Audit Registry",
    "Warranty & AMC Lifecycle Management",
    "Material Shortage Detection Logic",
    "Tenant-Isolated Solar Document Hub"
  ],
  rules: [
    "Financial Integrity: 'Collected Amount' must derive from authoritative Cashbook credit entries only.",
    "Inventory Safety: All material issue/receipt actions MUST use the hardened atomic transaction handshake.",
    "Tenant Isolation: Every Solar record is strictly scoped by 'businessId' with server-side validation.",
    "Monitoring Readiness: Telemetry fields are labeled 'Not Available' until an authoritative sensor node is added.",
    "BOM Consistency: Quotation values must derive from the approved Technical Design blueprint."
  ],
  backend: "Multi-node Firestore architecture with transactional stock updates and cross-collection aggregation for real-time operational pulses."
};
