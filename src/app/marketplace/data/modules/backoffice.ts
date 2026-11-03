
import { ModuleDetail, MarketplaceItem } from "../types";

export const backofficeItem: MarketplaceItem = { 
  id: 'suite_backoffice', 
  name: 'Back Office Pro', 
  description: 'Accounting, Staff Payroll & Project Scaling.', 
  price: '1299', 
  icon: 'Briefcase', 
  category: 'Bundles',
  isTrialAvailable: true,
  inclusions: "Salary Slips, P&L Radar, Projects, Team Dashboard"
};

export const backofficeDetail: ModuleDetail = {
  id: 'suite_backoffice',
  title: "Back Office & Force Pro",
  logicTitle: "Workforce & Financial Logic Hub",
  description: "Advanced accounting, project management and payroll automation.",
  features: [
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
