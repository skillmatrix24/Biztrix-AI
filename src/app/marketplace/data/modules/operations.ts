import { ModuleDetail, MarketplaceItem } from "../types";

export const operationsItem: MarketplaceItem = {
  id: "suite_operations",
  name: "Team Operations & HR Payroll Suite",
  description: "Multi-View Staff Attendance & Payroll Matrix, Multi-Assign Task Manager, Payment Approvals Queue & Custom Roles.",
  price: "999",
  icon: "Users2",
  isPopular: true,
  category: "Bundles",
  isTrialAvailable: true,
  inclusions: "Card & List View Directory, Daily Attendance Matrix, Overtime Math, Salary Slips, Multi-Assign Kanban, Advance Approvals",
  sortOrder: 2,
};

export const operationsDetail: ModuleDetail = {
  id: "suite_operations",
  title: "Team Operations & HR Payroll Suite",
  logicTitle: "Workforce Orchestration & Wage Engine",
  description: "Comprehensive team governance: manage field & shop staff with cards/list view, log daily attendance with OT/allowance math, assign tasks to multiple specialists, and approve payouts with cashbook sync.",
  sections: [
    {
      title: "Staff & Payroll Hub",
      icon: "Users2",
      desc: "Switch between Card View and List View across Team Directory and Monthly Settlement Ledgers with digital salary slip exports.",
    },
    {
      title: "Daily Attendance Matrix",
      icon: "CalendarCheck",
      desc: "Interactive status buttons (Present, Half Day, Absent), overtime hours tracking, daily allowance, and instant cash advances.",
    },
    {
      title: "Multi-Assign Task Manager",
      icon: "ListTodo",
      desc: "Kanban board & list view, assign tasks to multiple specialists, attach AI-generated SOP steps, and track completion.",
    },
    {
      title: "Payment Approvals Queue",
      icon: "Handshake",
      desc: "Multi-level approval workflow for staff salary advances, travel claims, and vendor disbursements with automatic cashbook sync.",
    },
  ],
  features: [
    "Directory & Payroll Ledger with Instant Card View and List View Toggle",
    "Daily Attendance Matrix with Wage, Overtime & Allowance Math",
    "Multi-Specialist Task Assignment for Collaborative Shop Workflows",
    "Staff Salary Slip Generator with Deductions, Advances & PDF Share",
    "Payment Approvals Workflow with Auto-Posting to Daily Cashbook",
    "Self-Service Staff Portal with Role-Based Access Controls (RBAC)",
  ],
  rules: [
    "Wage Accuracy: Daily rates compute based on configured shift hours and OT multipliers.",
    "Lockout Defense: Administrative permissions cannot be completely removed from workspace owners.",
    "Cashbook Harmony: Approved payout disbursements post immutably to the financial ledger.",
  ],
  backend: "Real-time attendance transaction aggregation and double-entry payment verification.",
};
