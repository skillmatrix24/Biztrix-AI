
import { MarketplaceItem } from "../types";

export const individualItems: MarketplaceItem[] = [
  { 
    id: 'feat_accounting', 
    name: 'Accounting Pro', 
    description: 'Complete P&L, cash vs bank tracking, GSTR reconciliation & financial ledger.', 
    price: '599', 
    icon: 'Wallet', 
    category: 'Ops', 
    isTrialAvailable: true, 
    inclusions: "Live P&L Statement, Cash & Bank Reconciliation, Category Expense Heatmap, Ledger Export" 
  },
  { 
    id: 'feat_branding', 
    name: 'Custom Branding Pro', 
    description: 'Unlock Business Logo & Favicon upload to personalize your OS and public portals.', 
    price: '299', 
    icon: 'Palette', 
    category: 'Branding', 
    isTrialAvailable: true, 
    inclusions: "Custom Business Logo, Browser Favicon Sync, Sidebar Branding, Public Portal Customization" 
  },
  { 
    id: 'feat_feedback', 
    name: 'Customer Feedback System', 
    description: 'Dynamic CSAT forms, shareable rating links & response analytics center.', 
    price: '299', 
    icon: 'MessageCircle', 
    category: 'Engagement', 
    isTrialAvailable: true, 
    inclusions: "Public Feedback Forms, CSAT Rating Scorecards, Response Inbox, Customer Satisfaction Trends" 
  },
  { 
    id: 'feat_intelligence', 
    name: 'AI Advisor Pro', 
    description: 'Gemini-powered Hinglish business Q&A, margin pricing & predictive reorder math.', 
    price: '399', 
    icon: 'Lightbulb', 
    category: 'AI', 
    isTrialAvailable: true, 
    inclusions: "Conversational Hinglish AI Advisor, Stock Reorder Math, Dynamic Pricing Tips, Payment Risk Signals" 
  },
  { 
    id: 'feat_marketing_roi', 
    name: 'Marketing & ROI', 
    description: 'Smart discount coupons, bundle offers & revenue attribution per campaign.', 
    price: '299', 
    icon: 'Zap', 
    category: 'Engagement', 
    isTrialAvailable: true, 
    inclusions: "Coupon & Offer Analytics, Campaign Conversion Tracking, Redemption Velocity Charts, ROI Breakdown" 
  },
  { 
    id: 'feat_meta', 
    name: 'Meta Business', 
    description: 'Sync Facebook Lead Ads & Instagram inquiries directly into your CRM & campaigns.', 
    price: '499', 
    icon: 'Facebook', 
    category: 'Connectivity', 
    isTrialAvailable: true, 
    inclusions: "Facebook Lead Ads Sync, Instagram DM Capture, Ad Source Attribution, Instant CRM Lead Routing" 
  },
  { 
    id: 'feat_tasks', 
    name: 'Task Manager', 
    description: 'Kanban & list workflow, AI SOP step generator & recurring shop checklists.', 
    price: '199', 
    icon: 'ListTodo', 
    category: 'Ops', 
    isTrialAvailable: true, 
    inclusions: "Kanban & List Task Board, AI SOP Checklist Generator, Staff Assignments & Due Alerts, Recurring Tasks" 
  },
  { 
    id: 'feat_payments', 
    name: 'Payment Approvals', 
    description: 'Staff payout & vendor advance approval workflow with automatic cashbook sync.', 
    price: '349', 
    icon: 'Handshake', 
    category: 'Ops', 
    isTrialAvailable: true, 
    inclusions: "Multi-Level Payout Queue, Staff & Vendor Advance Requests, Cashbook Auto-Posting, Audit Trail" 
  },
  { 
    id: 'feat_projects', 
    name: 'Project Suite', 
    description: 'Track client milestones, public progress portals, project P&L & milestone billing.', 
    price: '399', 
    icon: 'Layers', 
    category: 'Ops', 
    isTrialAvailable: true, 
    inclusions: "Milestone & Budget Radar, 1-Click Milestone-to-POS Billing, Public Client Tracker, Project Expense Sync" 
  },
  { 
    id: 'feat_re_catalog', 
    name: 'Asset Catalog', 
    description: 'Technical property listings with plot specs, map coordinates & shareable pages.', 
    price: '499', 
    icon: 'Building', 
    category: 'Real Estate', 
    isTrialAvailable: true, 
    inclusions: "Plot & Building Specs (Facing/Road/Area), Interactive Map Pins, Availability Filters, Shareable Listings" 
  },
  { 
    id: 'feat_scan', 
    name: 'AI Bill Scanner', 
    description: 'Scan supplier purchase bills via photo OCR to update GST & stock automatically.', 
    price: '299', 
    icon: 'ScanLine', 
    category: 'AI', 
    isTrialAvailable: true, 
    inclusions: "Photo-to-Inventory OCR, Auto Line-Item & GST Extraction, Supplier Bill Sync, Instant Stock Restock" 
  },
  { 
    id: 'feat_staff', 
    name: 'Staff Management', 
    description: 'Attendance tracking, overtime math, digital salary slips & self-service staff portal.', 
    price: '299', 
    icon: 'Users2', 
    category: 'Ops', 
    isTrialAvailable: true, 
    inclusions: "Daily Attendance Matrix, Overtime & Allowance Math, Digital Salary Slips, Staff Self-Service Portal" 
  },
  { 
    id: 'feat_store', 
    name: 'Store & Funnel Builder', 
    description: 'Online storefront, Visual Editor, Landing Page Sales Funnels, Custom Domain & COD/Razorpay.', 
    price: '799', 
    icon: 'ShoppingBag', 
    category: 'Store Builder', 
    isTrialAvailable: true, 
    inclusions: "23-Section Storefront + Visual Editor, Sales Funnel & Landing Page Builder, Order Bump & Express Checkout, Custom Domain DNS, Meta Pixel & GA4" 
  },
  { 
    id: 'feat_billing_pro', 
    name: 'POS Billing, Quotes & Ledger Pro', 
    description: 'Unlimited GST POS invoices, split bills, quotations, customer/vendor ledgers, cashbook & fixed overheads.', 
    price: '349', 
    icon: 'Receipt', 
    category: 'Ops', 
    isTrialAvailable: true, 
    inclusions: "Unlimited Monthly POS Invoices, Split Bill & Multi-Mode Settlement, Unlimited Quotations & 1-Click Convert, Unlimited Customer & Vendor Ledgers, Unlimited Cashbook & Fixed Expenses" 
  },
  { 
    id: 'feat_eway_gst', 
    name: 'Live E-Way Bill & GST Filing Pro', 
    description: 'Live GSP E-Way Bill API generation, Part-B updates, credit notes & unlimited GSTR-1 / GSTR-3B JSON & CSV filing exports.', 
    price: '399', 
    icon: 'FileSpreadsheet', 
    category: 'Ops', 
    isTrialAvailable: true, 
    inclusions: "Live GSP E-Way Bill API & Bulk NIC JSON, Part-B Vehicle Update & Cancellation, Sales Return Credit Notes (CDNR), Unlimited GSTR-1 & GSTR-3B JSON/CSV Exports" 
  },
  { 
    id: 'feat_whatsapp', 
    name: 'WhatsApp Automation', 
    description: 'Official Meta Cloud API keyword bots, 3-step follow-ups & invoice reminders.', 
    price: '499', 
    icon: 'SmartphoneNfc', 
    category: 'Connectivity', 
    isTrialAvailable: true, 
    inclusions: "Official Meta Cloud API, Keyword Auto-Responders, Day 1/3/7 Follow-Up Drips, Approved Template Sync" 
  },
];
