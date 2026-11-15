export type FunnelStageId = 'attract' | 'convert' | 'fulfill' | 'retain' | 'decide';

export interface FunnelStage {
  id: FunnelStageId;
  step: string;
  label: string;
  headline: string;
  outcome: string;
  description: string;
  modules: Array<{
    name: string;
    role: string;
    route: string;
  }>;
  flowSteps: string[];
  metricLabel: string;
  metricValue: string;
}

export const FUNNEL_STAGES: FunnelStage[] = [
  {
    id: 'attract',
    step: '01',
    label: 'Attract & Capture',
    headline: 'Har inquiry aur storefront visit ko seedhe CRM me capture karein',
    outcome: 'Zero missed leads across Storefront, Meta Ads, and WhatsApp',
    description:
      'Apne custom-domain online store, Meta Lead Ads, aur QR portals se aane wale har customer ko ek central pipeline me score karein aur automated WhatsApp nurture shuru karein.',
    modules: [
      { name: 'Store Builder', role: 'Custom-domain online catalog & checkout', route: '/website' },
      { name: 'CRM & Leads', role: 'Intent scoring & pipeline stages', route: '/leads' },
      { name: 'WhatsApp Automation', role: 'Official Meta API 3-step drip flows', route: '/whatsapp-automation' },
      { name: 'Meta Business Sync', role: 'Facebook Ads & Instagram DM lead capture', route: '/marketplace' },
    ],
    flowSteps: [
      'Customer visits store or clicks Meta ad',
      'Lead auto-logged with 10-digit phone identity',
      'Day 1-3-7 WhatsApp follow-up triggers automatically',
    ],
    metricLabel: 'Capture Coverage',
    metricValue: 'Store + Meta + WhatsApp',
  },
  {
    id: 'convert',
    step: '02',
    label: 'Quote & Convert',
    headline: 'Fast GST billing, quotations aur verified online payments',
    outcome: 'Instant HSN/GST invoices & Razorpay settlement without double entry',
    description:
      'Lead ready hote hi BOM ya itemized quotation bhejein, POS ya online storefront se GST invoice generate karein, aur Razorpay webhook verification ke saath payment settle karein.',
    modules: [
      { name: 'Smart Billing & POS', role: 'Thermal invoices with CGST/SGST split', route: '/billing' },
      { name: 'Quotations Engine', role: '1-click quote to invoice conversion', route: '/quotations' },
      { name: 'Payment Approvals', role: 'Multi-level payment request & settlement', route: '/payment-requests' },
      { name: 'Marketing & Coupons', role: 'Promo codes, bundles & campaign ROI', route: '/marketing' },
    ],
    flowSteps: [
      'Send GST quotation or storefront checkout link',
      'Razorpay / UPI payment verified server-side',
      'Invoice issued and order queued for fulfillment',
    ],
    metricLabel: 'Tax & Checkout',
    metricValue: 'GST + Razorpay Ready',
  },
  {
    id: 'fulfill',
    step: '03',
    label: 'Fulfill & Operate',
    headline: 'Stock, purchase bills, staff aur daily cashbook ek jagah control karein',
    outcome: 'Atomic inventory deduction and vendor ledger reconciliation',
    description:
      'Bill bante hi stock auto-deduct hota hai. AI Bill Scanner se purchase invoice scan karke inventory update karein, aur staff tasks, attendance aur project milestones track karein.',
    modules: [
      { name: 'Master Inventory', role: 'SKU stock, safety alerts & history audit', route: '/inventory' },
      { name: 'AI Bill Scanner', role: 'OCR photo-to-stock & vendor purchase sync', route: '/marketplace' },
      { name: 'Daily Cash Book & Vendors', role: 'Credit/debit entries & vendor payables', route: '/daily-entries' },
      { name: 'Staff & Project Suite', role: 'Biometric payroll, tasks & milestones', route: '/staff' },
    ],
    flowSteps: [
      'Purchase bill scanned into Master Inventory',
      'Order deducts stock with audit log entry',
      'Field team tasks & milestones tracked live',
    ],
    metricLabel: 'Stock Integrity',
    metricValue: 'Non-Negative Audit Ledger',
  },
  {
    id: 'retain',
    step: '04',
    label: 'Retain & Reward',
    headline: 'One-time buyers ko loyal repeat members me badlein',
    outcome: 'OTP-verified membership wallets, support desk & CSAT loop',
    description:
      'Customers ko digital loyalty card aur cashback wallet dein, live OTP portal se points track karne dein, aur har complaint ya feedback ticket ko SLA alerts ke saath resolve karein.',
    modules: [
      { name: 'Loyalty & Membership', role: 'Tier multipliers, cards & cashback wallet', route: '/loyalty' },
      { name: 'Customer Registry', role: 'Unified 10-digit history & notes', route: '/customers' },
      { name: 'Customer Support Pro', role: 'Support tickets, timeline & SLA alerts', route: '/complaints' },
      { name: 'Feedback System', role: 'Public CSAT forms & reply tracker', route: '/feedback' },
    ],
    flowSteps: [
      'Customer earns tier points or cashback on bill',
      'Tracks digital card & rewards via mobile OTP',
      'Support tickets & feedback sync to customer profile',
    ],
    metricLabel: 'Retention Loop',
    metricValue: 'Digital Card + Support SLA',
  },
  {
    id: 'decide',
    step: '05',
    label: 'Decide with AI',
    headline: 'Roz subah Gemini AI brief aur real-time P&L clarity paayein',
    outcome: 'Hinglish morning action brief, reorder math & risk radar',
    description:
      'Har din shuru karne se pehle AI Advisor se hot leads, low-stock SKUs aur payment risk ki precise summary lein — aur Accounting Pro me P&L aur fixed expenses reconcile karein.',
    modules: [
      { name: 'AI Advisor Pro', role: 'Gemini-powered Hinglish morning brief', route: '/ai-insights' },
      { name: 'Accounting Pro', role: 'P&L, fixed expenses & financial radar', route: '/fixed-expenses' },
      { name: 'Custom Branding Pro', role: 'White-label logo, favicon & portals', route: '/settings' },
      { name: 'Command Dashboard', role: 'Customizable daily pulse & KPI cards', route: '/dashboard' },
    ],
    flowSteps: [
      'AI scans yesterday revenue, stock & overdue leads',
      'Flags top priorities & reorder quantities',
      'Owner executes decisions in 1 click',
    ],
    metricLabel: 'Decision Cadence',
    metricValue: 'Daily Morning Brief',
  },
];

export type ModuleCategory = 'all' | 'core' | 'growth' | 'operations' | 'verticals';

export interface CatalogItem {
  id: string;
  name: string;
  category: Exclude<ModuleCategory, 'all'>;
  kind: 'Core OS' | 'Pro Suite' | 'Add-on';
  priceLabel: string;
  summary: string;
  highlights: string;
}

export const MODULE_CATALOG: CatalogItem[] = [
  {
    id: 'core_billing_inventory',
    name: 'Core Business OS',
    category: 'core',
    kind: 'Core OS',
    priceLabel: 'Included in Base',
    summary: 'Smart GST Billing & POS, Master Inventory with audit history, Quotations, CRM Leads, Customers, Vendors, and Daily Cash Book.',
    highlights: 'Billing · Inventory · Leads · Cash Book',
  },
  {
    id: 'suite_growth',
    name: 'Growth & Automation Suite',
    category: 'growth',
    kind: 'Pro Suite',
    priceLabel: '₹999/mo',
    summary: 'Official Meta Cloud API WhatsApp sequences, Instagram/Facebook lead capture, Marketing ROI analytics, and intent scoring.',
    highlights: 'WhatsApp API · Meta Ads · Campaign ROI',
  },
  {
    id: 'suite_loyalty',
    name: 'Loyalty & Membership Suite',
    category: 'growth',
    kind: 'Pro Suite',
    priceLabel: '₹899/mo',
    summary: 'Digital membership cards, cashback wallets, OTP member tracking portal, referral tracking, and coupon bundles.',
    highlights: 'Digital Cards · Cashback · OTP Portal',
  },
  {
    id: 'feat_store',
    name: 'Online Store Builder',
    category: 'growth',
    kind: 'Add-on',
    priceLabel: '₹799/mo',
    summary: 'Publish your inventory as an SEO-ready online storefront with custom domain DNS verification and Razorpay checkout.',
    highlights: 'Custom Domain · SEO · Razorpay Orders',
  },
  {
    id: 'suite_intelligence',
    name: 'Intelligence & AI Suite',
    category: 'operations',
    kind: 'Pro Suite',
    priceLabel: '₹1,499/mo',
    summary: 'Gemini AI Advisor in Hinglish, Vision AI Bill Scanner (OCR to stock), predictive reorder math, and customer risk analysis.',
    highlights: 'Morning Brief · OCR Scanner · Reorder AI',
  },
  {
    id: 'suite_backoffice',
    name: 'Back Office Pro Suite',
    category: 'operations',
    kind: 'Pro Suite',
    priceLabel: '₹999/mo',
    summary: 'Accounting Pro P&L, staff payroll & biometric logs, project milestones, multi-level payment approvals, and Task SOPs.',
    highlights: 'Accounting · Payroll · Projects · Tasks',
  },
  {
    id: 'suite_support',
    name: 'Customer Support Pro',
    category: 'operations',
    kind: 'Pro Suite',
    priceLabel: '₹699/mo',
    summary: 'Multi-channel complaint ticketing, staff assignment, 24h SLA alerts, live customer tracking portal, and CSAT feedback forms.',
    highlights: 'Ticketing · Public Tracker · Feedback',
  },
  {
    id: 'feat_branding',
    name: 'Custom Branding & Add-ons',
    category: 'operations',
    kind: 'Add-on',
    priceLabel: 'From ₹199/mo',
    summary: 'Pick individual nodes anytime: Task Manager (₹199), Custom Branding (₹299), AI Scanner (₹299), Staff Payroll (₹299), Payment Approvals (₹349).',
    highlights: '14 Modular Add-ons · Pay Only What You Use',
  },
  {
    id: 'suite_solar',
    name: 'Solar Business OS',
    category: 'verticals',
    kind: 'Pro Suite',
    priceLabel: '₹1,999/mo',
    summary: 'Complete solar EPC lifecycle: inquiries, site surveys, technical designs, BOM quotes, atomic inventory issue, handover & AMC/warranty portal.',
    highlights: 'Site Survey · BOM · Installations · AMC',
  },
  {
    id: 'suite_property',
    name: 'Property Pro Suite',
    category: 'verticals',
    kind: 'Pro Suite',
    priceLabel: '₹1,499/mo',
    summary: 'Technical property catalog (plot, khet, commercial facing/road/soil fields), site-visit scheduling, agent commission matrix, and public portals.',
    highlights: 'Asset Catalog · Site Visits · Agent Matrix',
  },
];

export interface FragmentedToolOption {
  id: string;
  label: string;
  separateCost: number;
  biztrixPrice: number;
  biztrixModule: string;
}

export const FRAGMENTED_TOOL_OPTIONS: FragmentedToolOption[] = [
  {
    id: 'billing_inv',
    label: 'GST Billing, Inventory & Cash Book',
    separateCost: 1200,
    biztrixPrice: 0,
    biztrixModule: 'Core Business OS (Included)',
  },
  {
    id: 'whatsapp_crm',
    label: 'WhatsApp Marketing & Lead CRM',
    separateCost: 2500,
    biztrixPrice: 999,
    biztrixModule: 'Growth Suite',
  },
  {
    id: 'storefront',
    label: 'Online Storefront & Custom Domain',
    separateCost: 1800,
    biztrixPrice: 799,
    biztrixModule: 'Store Builder',
  },
  {
    id: 'loyalty',
    label: 'Loyalty Cards & Cashback Software',
    separateCost: 2000,
    biztrixPrice: 899,
    biztrixModule: 'Loyalty Suite',
  },
  {
    id: 'ops_ai',
    label: 'Staff Payroll, Accounting & AI Scanner',
    separateCost: 3000,
    biztrixPrice: 1499,
    biztrixModule: 'Intelligence / Back Office',
  },
  {
    id: 'support',
    label: 'Support Ticketing & Feedback Portal',
    separateCost: 1500,
    biztrixPrice: 699,
    biztrixModule: 'Customer Support Pro',
  },
];

export function calculateFunnelBundleEstimate(selectedIds: string[]): {
  separateMonthly: number;
  biztrixMonthly: number;
  monthlySavings: number;
  annualSavings: number;
} {
  const selected = FRAGMENTED_TOOL_OPTIONS.filter((opt) => selectedIds.includes(opt.id));
  const separateMonthly = selected.reduce((sum, item) => sum + item.separateCost, 0);
  const biztrixMonthly = selected.reduce((sum, item) => sum + item.biztrixPrice, 0);
  const monthlySavings = Math.max(0, separateMonthly - biztrixMonthly);
  return {
    separateMonthly,
    biztrixMonthly,
    monthlySavings,
    annualSavings: monthlySavings * 12,
  };
}
