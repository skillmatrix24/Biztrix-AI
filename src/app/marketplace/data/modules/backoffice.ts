
import { ModuleDetail, MarketplaceItem } from "../types";

export const backofficeItem: MarketplaceItem = { 
  id: 'suite_backoffice', 
  name: 'Back Office Pro', 
  description: 'Accounting, Unlimited POS, Live E-Way/GST, Staff Payroll & Project Scaling.', 
  price: '1299', 
  icon: 'Briefcase', 
  category: 'Bundles',
  isTrialAvailable: true,
  inclusions: "Unlimited POS & Quotes, Live E-Way & GSTR-1/3B, Salary Slips, P&L Radar, Projects, Team Dashboard"
};

export const backofficeDetail: ModuleDetail = {
  id: 'suite_backoffice',
  title: "Back Office & Force Pro",
  logicTitle: "Workforce & Financial Logic Hub",
  description: "Complete commercial operations bundle: Unlimited POS Billing & Quotations, Live GSP E-Way Bill & GSTR-1/3B Exports, Accounting P&L, Payroll & Projects.",
  features: [
    "Unlimited POS Billing, Quotations, Ledgers & Daily Cashbook",
    "Live GSP E-Way Bill API & Unlimited GSTR-1 / GSTR-3B Exports",
    "Digital Salary Slip Engine with OT & Allowances",
    "Project Financial Radar (Profitability tracking)",
    "Biometric Attendance Sync with Mobile Geofencing",
    "Running Vendor Ledgers & trade payable logic",
    "Staff Personal Portal for earnings tracking"
  ],
  rules: [
    "Atomic Payroll: Salary calculated based on daily rates and shift hours.",
    "Project Isolation: Financials are tracked per project ID.",
    "Secure Payouts: Multi-level approval flow for fund requests."
  ],
  backend: "Complex cross-collection aggregation for real-time P&L reporting."
};
