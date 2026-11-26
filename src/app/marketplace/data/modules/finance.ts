import { ModuleDetail, MarketplaceItem } from "../types";

export const financeItem: MarketplaceItem = {
  id: "suite_finance",
  name: "Finance, Tax & GST Compliance Bundle",
  description: "Double-entry Accounting Pro P&L, Live GSP E-Way Bill API, GSTR-1/3B Reconciliation, AI Purchase Bill OCR & Vendor Ledgers.",
  price: "1099",
  icon: "FileSpreadsheet",
  category: "Bundles",
  isTrialAvailable: true,
  inclusions: "Live P&L Ledger, GSP E-Way Bill API, Part-B Vehicle Updates, GSTR-1/3B JSON/CSV, AI Bill OCR, Tamper-Proof Cashbook",
  sortOrder: 3,
};

export const financeDetail: ModuleDetail = {
  id: "suite_finance",
  title: "Finance, Tax & GST Compliance Bundle",
  logicTitle: "Fiscal Security & Statutory Compliance Engine",
  description: "A complete compliance defense system for traders, manufacturers & contractors: generate NIC E-Way bills directly via GSP API, reconcile GSTR-1 and GSTR-3B filings, lock cashbook entries against tampering, and scan purchase bills with AI OCR.",
  sections: [
    {
      title: "Audited Accounting & P&L",
      icon: "Wallet",
      desc: "Consolidated cashflow, expense category heatmaps, cash vs bank balance tracking, and immutable ledger history.",
    },
    {
      title: "Live E-Way Bill & Tax API",
      icon: "FileSpreadsheet",
      desc: "Direct NIC GSP API generation, Part-B vehicle updates, distance auto-calculation, and sales return credit notes (CDNR).",
    },
    {
      title: "Statutory GST Filing Exports",
      icon: "Receipt",
      desc: "One-click GSTR-1 B2B/B2C JSON export and GSTR-3B summary reports matching official GST portal formats.",
    },
    {
      title: "AI Purchase Bill Scanner",
      icon: "ScanLine",
      desc: "Photo OCR automatically extracts supplier GSTIN, invoice date, HSN codes, and line items into warehouse stock.",
    },
  ],
  features: [
    "Comprehensive P&L Statement with Expense Heatmaps & Trend Analytics",
    "Live NIC Government E-Way Bill Generation & Cancellation via GSP",
    "Official GSTR-1 JSON & GSTR-3B Excel/CSV Statutory Filing Reports",
    "Photo-to-Inventory OCR Purchase Bill Scanner with Tax Reconciliation",
    "Double-Entry Cashbook with Fraud & Tampering Prevention Locks",
    "Running Vendor & Customer Ledgers with 1-Click WhatsApp Statements",
  ],
  rules: [
    "Tax Parity: Tax calculations strictly follow statutory Indian GST rounding standards.",
    "Ledger Lock: Closed accounting periods cannot be modified without audit approval.",
    "HSN Integrity: Validated HSN/SAC codes are enforced on all outbound invoices.",
  ],
  backend: "High-integrity Firestore transaction pipelines with cryptographic audit hash logging.",
};
