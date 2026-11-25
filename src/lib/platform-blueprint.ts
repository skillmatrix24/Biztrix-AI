export interface BlueprintConnection {
  label: string;
  href: string;
  relation: string;
}

export interface BlueprintMenuItem {
  id: string;
  label: string;
  href: string;
  pageFile: string;
  entitlement: string;
  howItWorks: string;
  pageSections: string[];
  connectedPages: BlueprintConnection[];
  frontendStack: string[];
  backendStack: {
    firestoreCollections: string[];
    apiRoutes: string[];
    serverActions: string[];
    aiAndExternal: string[];
  };
}

export interface BlueprintSidebarGroup {
  id: string;
  groupLabel: string;
  accessScope: string;
  entitlementKey: string;
  summary: string;
  items: BlueprintMenuItem[];
}

export interface BlueprintSummaryStats {
  totalGroups: number;
  totalPages: number;
  uniqueCollections: number;
  uniqueApiRoutes: number;
  uniqueServerActions: number;
}

export interface BlueprintAccessRule {
  id: string;
  title: string;
  trigger: string;
  behavior: string;
  sourceFile: string;
}

export const SIDEBAR_ARCHITECTURE_RULES: BlueprintAccessRule[] = [
  {
    id: 'owner_gate',
    title: 'Platform Master Gate',
    trigger: 'user.email === "skillmatrix24@gmail.com" && role !== "agent"',
    behavior: 'Sirf Platform Owner ko top-level "Platform Master" group (6 master pages including Platform Blueprint) render hota hai.',
    sourceFile: 'src/components/layout/sidebar-nav.tsx',
  },
  {
    id: 'entitlement_gating',
    title: 'Suite & Add-on Entitlements',
    trigger: 'business.activeAddonIds includes suiteId || addonId',
    behavior: 'Har optional module tabhi Sidebar aur Mobile BottomNav me unlock hota hai jab uska suiteId (e.g. suite_solar) ya addonId (e.g. feat_store) activeAddonIds me ho.',
    sourceFile: 'src/components/layout/sidebar-nav.tsx',
  },
  {
    id: 'trial_expiry_lock',
    title: 'Trial Expiry Lockout',
    trigger: 'business.status === "trial" && trialEndDate < now',
    behavior: 'Expired trial par active module links EXPIRED badge dikhate hain aur click karne par /settings/subscription par redirect karte hain.',
    sourceFile: 'src/components/layout/sidebar-nav.tsx',
  },
  {
    id: 'agent_isolation',
    title: 'Real Estate Agent Isolation',
    trigger: 'userProfile.role === "agent"',
    behavior: 'Agent login par Platform Master, Solar, Engagement, Loyalty, Growth, Intelligence, Back Office, Store Builder aur Marketplace hide hote hain; sirf Dashboard, Real Estate items aur My Profile (/profile) dikhte hain.',
    sourceFile: 'src/components/layout/sidebar-nav.tsx',
  },
  {
    id: 'mobile_bottom_nav',
    title: 'Mobile BottomNav & Custom Layout Sync',
    trigger: 'business.mobileLayout[userRole] + customNavLinks',
    behavior: 'Mobile par max 5 primary tabs (ya 4 + More drawer + optional Center FAB) role-wise render hote hain aur same suiteId/addonId locks respect karte hain.',
    sourceFile: 'src/components/layout/bottom-nav.tsx',
  },
  {
    id: 'financial_integrity_gate',
    title: 'Pillar 1: Financial & Statutory Anti-Pilferage Gate',
    trigger: 'Firestore Security Rules: /businesses/{id}/invoices, creditNotes, cashbook, fixedExpenses, products',
    behavior: 'GST Tax Invoices immutable statutory record hain: client deletion strictly blocked (allow delete: if isPlatformOwner()), edits restricted to dispatch/E-Way and admin cancellation. Reversals mandatory via Credit Notes. Cashbook P&L read restricted to isBusinessAdmin; POS counter staff can write entries but cannot edit/delete past cash transactions. Product deletion restricted to admin.',
    sourceFile: 'firestore.rules',
  },
  {
    id: 'team_invite_wage_sync',
    title: 'Team Directory Invite & Wage Sync Matrix',
    trigger: 'User login via invite link / Google Auth + /team deduplication',
    behavior: 'Invited staff member login par unka assigned dailyRate (default ₹500/d), shiftHours, aur role active Firebase Auth UID par seamlessly bind hota hai. emailMap deduplication engine unke purane pending invitation row ko active account ke sath merge karta hai aur duplicate documents ko delete karta hai.',
    sourceFile: 'src/app/team/client-page.tsx & src/app/login/client-page.tsx',
  },
  {
    id: 'marketplace_admin_entitlement',
    title: 'Marketplace Module Activation & Quota Control',
    trigger: 'userRole === "admin" || userRole === "owner" || isPlatformOwner',
    behavior: 'Tenant add-on ya suite activation sirf verified admin/owner trigger kar sakte hain with 2-step confirmation modal. Global Users me Platform Owner ko kisi bhi business ke modules ko activate/deactivate karne ka master toggle milta hai with automatic fallback business lookup.',
    sourceFile: 'src/app/marketplace/client-page.tsx & src/app/owner/users/client-page.tsx',
  },
  {
    id: 'pillar2_customer_privacy_gate',
    title: 'Pillar 2: Customer Data Privacy & Anti-Leakage Gate',
    trigger: 'Firestore Security Rules: customers, leads, storefront_leads, vendors, realEstateLeads, campaigns, orders',
    behavior: 'Customer directory, CRM leads, storefront leads, real estate leads, aur orders ka deletion strictly admin-only hai (staff delete nahi kar sakte, debtor records tamper-proof hain). Vendors ka wholesale margin & bank details update/delete locked to admin. WhatsApp campaigns blast control admin-only hai taki brand account ban aur bulk spamming na ho sake.',
    sourceFile: 'firestore.rules',
  },
  {
    id: 'pillar3_api_tenant_defense_gate',
    title: 'Pillar 3: Multi-Tenant Isolation & Cyber Attack Defense',
    trigger: 'next.config.ts security headers, firestore.rules privateConfig lock, API rate limiting & server secrets',
    behavior: 'Har business ka data dusre tenant se strictly isolated hai via isBusinessMember verification. Private credentials (payment gateway secrets, GSP client secrets, Meta tokens) client reads ke liye permanently blocked hain (allow read, write: if false;). Public API routes (chatbot, contact form) par IP rate limiting aur input truncation active hai, aur next.config.ts me X-Content-Type-Options, Referrer-Policy, va X-XSS-Protection headers cyber attacks ko block karte hain.',
    sourceFile: 'next.config.ts & firestore.rules',
  },
  {
    id: 'pillar4_cyber_defense_gate',
    title: 'Pillar 4: Cyber Attacks & Hacking Defense (System Hardening)',
    trigger: 'HMAC timing-safe webhooks, CSV formula sanitization, NoSQL parameterization, role escalation lock',
    behavior: 'Cyber attack vectors 100% hardened: (1) Razorpay & Meta webhooks timing-safe HMAC-SHA256 crypto signatures verify karte hain. (2) CSV exports spreadsheet formula injection (=,+,-,@) ko auto-neutralize karte hain. (3) User role escalation rules me strictly locked hai (members cannot self-promote to admin/owner). (4) IP-based rate limiting (10 req/2 min) AI chatbot ko bot scraping aur credit drainage se bachata hai. (5) System audit logs (/system/logs) tamper-proof aur platform-owner only hain.',
    sourceFile: 'src/app/api/webhook/* & src/lib/staff-payroll.ts & firestore.rules',
  },
];

export const SIDEBAR_BLUEPRINT_GROUPS: BlueprintSidebarGroup[] = [
  {
    id: 'platform_master',
    groupLabel: 'Platform Master',
    accessScope: 'Platform Owner Only (skillmatrix24@gmail.com)',
    entitlementKey: 'platform_owner',
    summary:
      'Super-admin control plane jo sabhi tenant businesses, global limits, marketplace modules, gateways, aur platform blueprint ko manage karta hai.',
    items: [
      {
        id: 'owner-overview',
        label: 'Overview',
        href: '/owner',
        pageFile: 'src/app/owner/page.tsx',
        entitlement: 'Platform Owner Only',
        howItWorks:
          'Platform-wide revenue, active tenant businesses, total users, global branding, aur recent payment logs ka central command view dikhata hai.',
        pageSections: [
          'KPI Summary Cards (Total Tenants, Active Pro, Users, Payment Telemetry)',
          'Global Branding Config Editor (logoUrl, faviconUrl)',
          'Tenants Status Table with Trial/Active/Pro quick actions',
          'Recent Platform Payments Log (system/logs/payments)',
        ],
        connectedPages: [
          { label: 'Global Users', href: '/owner/users', relation: 'Tenant status & user role inspection' },
          { label: 'Plans & Limits', href: '/owner/limits', relation: 'Unified quotas, suites, add-ons & pricing control' },
          { label: 'Gateways', href: '/owner/gateways', relation: 'Platform payment provider keys' },
        ],
        frontendStack: ['src/app/owner/page.tsx', 'src/app/owner/client-page.tsx', 'useCollection / useDoc hooks', 'SidebarNav globalBranding sync'],
        backendStack: {
          firestoreCollections: [
            'businesses',
            'users',
            'system/config/branding/main',
            'system/config/marketplace',
            'system/config/gateways',
            'system/logs/payments',
          ],
          apiRoutes: [],
          serverActions: ['src/app/actions/p0-migration.ts'],
          aiAndExternal: ['Firebase Auth Email Guard', 'src/ai/flows/suggest-upsell-modules.ts (Gemini)'],
        },
      },
      {
        id: 'owner-blueprint',
        label: 'Platform Blueprint',
        href: '/owner/blueprint',
        pageFile: 'src/app/owner/blueprint/page.tsx',
        entitlement: 'Platform Owner Only',
        howItWorks:
          'Pure platform ko Sidebar menu order aur access rules ke hisaab se map karta hai: har page ka workflow, UI content sections, connected pages, Frontend stack, aur Backend Firestore/API architecture ek jagah dikhata hai.',
        pageSections: [
          'Architecture KPI Strip (Sidebar Groups, Total Pages, Firestore Nodes, API/Actions)',
          'Sidebar Gating & Role Navigation Rules Matrix (Owner Gate, Entitlements, Trial Lock, Agent Isolation, Mobile BottomNav)',
          'Sidebar Group Filter Tabs & Global Architecture Search',
          'Per-Page Expandable Content-Wise Spec Cards (Workflow, UI Sections, Connections, Frontend & Backend) + JSON Export',
        ],
        connectedPages: [
          { label: 'Sidebar Navigation', href: '/dashboard', relation: 'Mirrors exact SidebarNav group order & activeAddonIds rules' },
          { label: 'Overview', href: '/owner', relation: 'Platform master command hub' },
          { label: 'Storefront Manager', href: '/website', relation: 'Documents 16-section Store Builder & /shop architecture' },
        ],
        frontendStack: [
          'src/app/owner/blueprint/page.tsx',
          'src/app/owner/blueprint/client-page.tsx',
          'src/lib/platform-blueprint.ts',
          'src/components/layout/sidebar-nav.tsx',
          'src/components/layout/bottom-nav.tsx',
        ],
        backendStack: {
          firestoreCollections: ['users/{uid} (role/email verification)'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: ['Static Verified Codebase Manifest (platform-blueprint.ts)'],
        },
      },
      {
        id: 'owner-limits',
        label: 'Plans & Limits',
        href: '/owner/limits',
        pageFile: 'src/app/owner/limits/page.tsx',
        entitlement: 'Platform Owner Only',
        howItWorks:
          'Unified master control center (replaces legacy `/owner/marketplace` via auto-redirect) jahan se Platform Owner Free Core OS quotas, global trial duration, annual discount %, Pro module ceilings, aur sabhi 7 Business Suites + 14+ Individual Add-ons ke prices, features, custom modules, aur visibility live manage karta hai.',
        pageSections: [
          'Core Free & Pro Module Quota Ceilings (Invoices, SKUs, Leads, Funnels, AI, WhatsApp)',
          'All-in-One Business Suites Price, Trial & Feature Manager (?tab=suites)',
          'Individual Add-ons Price, Quota, Custom Module & Visibility Manager (?tab=addons)',
          'Live Free Core vs Marketplace Comparison Matrix Preview (?tab=preview)',
        ],
        connectedPages: [
          { label: 'Marketplace', href: '/marketplace', relation: 'Syncs live prices, features, trials & visibility' },
          { label: 'Pricing', href: '/pricing', relation: 'Syncs Core OS limits, annual discount & comparison matrix' },
          { label: 'Subscription Settings', href: '/settings/subscription', relation: 'Applies trial days & active billing estimates' },
          { label: 'Global Users', href: '/owner/users', relation: 'Per-tenant status & activeAddonIds override checks' },
        ],
        frontendStack: [
          'src/app/owner/limits/page.tsx',
          'src/app/owner/limits/client-page.tsx',
          'src/app/owner/marketplace/page.tsx (redirect -> /owner/limits?tab=suites)',
          'src/hooks/use-marketplace-catalog.ts',
          'src/lib/marketplace-catalog.ts',
        ],
        backendStack: {
          firestoreCollections: [
            'system/config/limits/default',
            'system/config/marketplace/{moduleId}',
          ],
          apiRoutes: ['/api/public/catalog'],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'owner-gateways',
        label: 'Gateways',
        href: '/owner/gateways',
        pageFile: 'src/app/owner/gateways/page.tsx',
        entitlement: 'Platform Owner Only',
        howItWorks:
          'SaaS platform ke subscription/addon checkout ke liye global payment gateway configurations manage karta hai.',
        pageSections: [
          'Configured Gateways List',
          'Add / Edit Gateway Form (Razorpay / Stripe / Custom)',
          'Active Status Toggle',
        ],
        connectedPages: [
          { label: 'Marketplace', href: '/marketplace', relation: 'Powers tenant module checkout' },
          { label: 'Subscription Settings', href: '/settings/subscription', relation: 'Powers plan upgrades' },
        ],
        frontendStack: ['src/app/owner/gateways/page.tsx'],
        backendStack: {
          firestoreCollections: ['system/config/gateways/{gatewayId}'],
          apiRoutes: ['/api/payments/create-order', '/api/payments/verify'],
          serverActions: [],
          aiAndExternal: ['Razorpay SDK'],
        },
      },
      {
        id: 'owner-users',
        label: 'Global Users',
        href: '/owner/users',
        pageFile: 'src/app/owner/users/page.tsx',
        entitlement: 'Platform Owner Only',
        howItWorks:
          'Platform par registered sabhi businesses aur users ko inspect karta hai; owner/admin leadership matrix dikhata hai jisse tenant owners, team members aur managers alag pehchane jayein. Owner yahan se tenant plans upgrade, activeAddonIds activate/deactivate, ya account status control kar sakta hai with auto-fallback business lookup for missing business mappings.',
        pageSections: [
          'Tenant Businesses Directory & Search',
          'Owner & Admin Leadership Matrix (Distinct Owner vs Staff distinction)',
          'Users Role & Business Mapping Table with Direct Tenant Jump',
          'Addon Entitlement & Subscription Override Modal (Activate/Deactivate Modules)',
        ],
        connectedPages: [
          { label: 'Overview', href: '/owner', relation: 'Master tenant telemetry' },
          { label: 'Plans & Limits', href: '/owner/limits', relation: 'Assigns activeAddonIds from unified module catalog' },
        ],
        frontendStack: ['src/app/owner/users/page.tsx'],
        backendStack: {
          firestoreCollections: ['users', 'businesses'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'owner-cleanup',
        label: 'Database Cleanup',
        href: '/owner/cleanup',
        pageFile: 'src/app/owner/cleanup/page.tsx',
        entitlement: 'Platform Owner Only',
        howItWorks:
          'Stale trial businesses ko prune, subcollections ko recursively purge, soft-deleted records sweep, frontend retention policy manage karta hai, aur Days Stale ke hisaab se 1-Click WhatsApp (wa.me) / Meta API / Email re-engagement alerts deliver karta hai.',
        pageSections: [
          'Tenant Lifecycle Table with Days Stale & Status Badges',
          'Meta API Templates & Auto-Send Manager (Credentials, Live WABA Sync, Submit/Delete Templates, Stage-to-Template Variable Mapping & Batch Runner)',
          'Per-Tenant Re-engagement Alert Modal (1-Click wa.me, Meta API Mapped Template & Email)',
          'Live Subcollection Document Inspector Dialog',
          'Recursive Business Purge Modal with DELETE Type-to-Confirm Guard',
          'Batch Purge Stale Trials (>60d) Action',
          'Global Frontend Deletion Behavior Toggle (Hard vs Soft Delete)',
          'Outreach History & Copy Catalog (/system/logs/cleanup, /system/logs/cleanup_notifications)',
        ],
        connectedPages: [
          { label: 'Overview', href: '/owner', relation: 'Platform owner central command view' },
          { label: 'Global Users', href: '/owner/users', relation: 'Global tenant and user inspection' },
          { label: 'WhatsApp Automation', href: '/whatsapp-automation', relation: 'Meta Cloud API message configuration' },
        ],
        frontendStack: [
          'src/app/owner/cleanup/page.tsx',
          'src/app/owner/cleanup/client-page.tsx',
          'src/components/owner/meta-template-automation-manager.tsx',
          'src/lib/meta-outreach-automation.ts',
          'src/lib/cleanup-client.ts',
          'src/lib/cleanup-notifications.ts',
          'src/lib/cleanup-audit.ts',
        ],
        backendStack: {
          firestoreCollections: [
            'businesses',
            'users',
            'system/private/integrations/meta_whatsapp',
            'system/logs/cleanup',
            'system/logs/cleanup_notifications',
            'system/config/retention/policy',
          ],
          apiRoutes: [],
          serverActions: ['src/app/actions/whatsapp-actions.ts'],
          aiAndExternal: ['Client Firebase SDK batch operations with isPlatformOwner RBAC', 'Meta Graph API v21.0 (WABA Templates & Dispatch)'],
        },
      },
    ],
  },
  {
    id: 'command_center',
    groupLabel: 'Command Center',
    accessScope: 'Core OS Modules (All Businesses)',
    entitlementKey: 'core',
    summary:
      'Har business ke rozmarra POS billing, GST invoices & E-Way Bills, GSTR filings, inventory, quotations, leads, customers, aur vendors ka core operational backbone.',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/dashboard',
        pageFile: 'src/app/dashboard/page.tsx',
        entitlement: 'Core (Free)',
        howItWorks:
          'Selected date range (Today, 7d, 30d, Month, Custom) ke hisaab se Sales, Expenses, Profit, Udhaar/Receivables, Stock Valuation, Pending Tasks, aur Solar/Real-Estate telemetry ko aggregate karke Executive Summary + CSV/PDF export deta hai.',
        pageSections: [
          'Date Range Selector & Executive Report Export (PDF / CSV)',
          'Revenue, Expenses, Net Cashflow & Udhaar Receivable KPI Cards',
          'Sales vs Expense Trend Charts & Category Breakdown',
          'Low Stock Alerts, Pending Orders (/dashboard/orders) & Active Tasks Feed',
        ],
        connectedPages: [
          { label: 'Billing (POS)', href: '/billing', relation: 'Reads live POS cashbook & sales totals' },
          { label: 'Invoices & E-Way', href: '/invoices', relation: 'Reflects receivable & invoice dues' },
          { label: 'Inventory', href: '/inventory', relation: 'Surfaces low stock & inventory valuation' },
          { label: 'Daily Entries', href: '/daily-entries', relation: 'Aggregates daily income/expense cashbook logs' },
        ],
        frontendStack: [
          'src/app/dashboard/page.tsx',
          'src/app/dashboard/client-page.tsx',
          'src/app/dashboard/orders/page.tsx',
          'src/lib/dashboard-report.ts',
          'Recharts',
          'jspdf',
        ],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/cashbook',
            'businesses/{businessId}/products',
            'businesses/{businessId}/customers',
            'businesses/{businessId}/vendors',
            'businesses/{businessId}/orders',
            'businesses/{businessId}/leads',
            'businesses/{businessId}/tasks',
            'businesses/{businessId}/quotations',
            'businesses/{businessId}/complaints',
          ],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: ['src/ai/flows/morning-brief-flow.ts (Gemini Executive Brief)'],
        },
      },
      {
        id: 'daily-entries',
        label: 'Daily Entries',
        href: '/daily-entries',
        pageFile: 'src/app/daily-entries/page.tsx',
        entitlement: 'Core (Free)',
        howItWorks:
          'Daily cash-in (Sales/Other Income) aur cash-out (Purchases/Expenses/Vendor Payments) entries record karta hai, inventory/vendor balance sync karta hai, aur bulk entry ke liye Batch Entry par route karta hai.',
        pageSections: [
          'Quick Credit / Debit Cashbook Entry Form',
          'Category, Vendor & Payment Mode Mapping Controls',
          'Filterable Daily Ledger Table with Edit/Delete & Running Totals',
          'Batch Entry Shortcut (/batch-entry)',
        ],
        connectedPages: [
          { label: 'Accounting Pro', href: '/accounting', relation: 'Feeds cashbook ledger for P&L and reconciliation' },
          { label: 'Vendors', href: '/vendors', relation: 'Updates vendor payable balances on purchase/payment' },
          { label: 'GST & GSTR-1', href: '/accounting/gst', relation: 'Contributes taxable cashbook records to GST summary' },
        ],
        frontendStack: ['src/app/daily-entries/page.tsx', 'src/app/batch-entry/page.tsx'],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/cashbook',
            'businesses/{businessId}/products',
            'businesses/{businessId}/vendors',
          ],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'billing',
        label: 'Billing (POS)',
        href: '/billing',
        pageFile: 'src/app/billing/page.tsx',
        pageSections: [
          'Status Header (Standard POS / Quotation / Reward Sync Mode switcher)',
          'Identity Section (Customer search, Quick Add Customer, State/GSTIN auto-detect)',
          'Billing Cart Table (Product search, HSN, Qty, Price override, Item discount, GST %)',
          'Reward Cards Section (Loyalty tier wallet, Coupon auto-best suggestion & overrides)',
          'Reconciliation Panel (OS Settings Payment Mode Dropdown, Split Payment, ₹50k E-Way Alert & Part-B Form, Preview/Save/Split Bill)',
          'Modals: PreviewDialog, SuccessDialog, SplitBillDialog, EWayBillModal, WhatsAppShareModal, A4 & Thermal Print Templates',
        ],
        entitlement: 'Core (Free)',
        howItWorks:
          'Full GST-compliant POS counter: customer aur items add karne par CGST/SGST (intra-state) ya IGST (inter-state) calculate hota hai; OS Settings se fetched Payment Mode Dropdown ya Multi-Mode Split Payment, Split Bill (Equal / Item-wise multiple invoices), loyalty redemption, ₹50,000+ bills par automatic E-Way Bill Part-B alert, aur atomic Firestore transaction me invoice + stock deduction + cashbook + customer udhaar save hota hai.',
        connectedPages: [
          { label: 'Invoices & E-Way', href: '/invoices', relation: 'Saves every generated POS/Split invoice for recovery, returns & E-Way actions' },
          { label: 'Quotations', href: '/quotations', relation: 'Loads approved quotes via /billing?quoteId=...' },
          { label: 'OS Settings (Payments)', href: '/settings?tab=payments', relation: 'Fetches dynamic Payment Mode dropdown list' },
          { label: 'Inventory & Customers', href: '/inventory', relation: 'Deducts product stock & updates customer udhaar/loyalty points' },
        ],
        frontendStack: [
          'src/app/billing/page.tsx',
          'ReconciliationPanel.tsx / BillingCartTable.tsx / SplitBillDialog.tsx / EWayBillModal.tsx',
          'InvoicePrintTemplate.tsx / ThermalPrintTemplate.tsx',
          'src/lib/billing-engine.ts / src/lib/eway-bill.ts',
        ],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/invoices',
            'businesses/{businessId}/products',
            'businesses/{businessId}/customers',
            'businesses/{businessId}/cashbook',
            'businesses/{businessId}/quotations',
            'businesses/{businessId}/memberships',
            'businesses/{businessId}/coupons',
            'businesses/{businessId}/loyaltyActivity',
          ],
          apiRoutes: ['/api/eway-bill/generate'],
          serverActions: ['src/app/actions/whatsapp-actions.ts'],
          aiAndExternal: ['NIC / GSP E-Way Bill REST API', 'Meta WhatsApp Cloud API', 'UPI Deep Link'],
        },
      },
      {
        id: 'invoices',
        label: 'Invoices & E-Way',
        href: '/invoices',
        pageFile: 'src/app/invoices/page.tsx',
        entitlement: 'Core (Free)',
        howItWorks:
          'Sabhi saved POS aur Split invoices ko track karta hai with Pillar 1 Financial Security: Tax Invoices immutable statutory records hain (zero client deletion: allow delete strictly platform owner only, edits restricted to dispatch/E-Way and admin cancellation). Reversals ke liye Credit Notes / Sales Return (stock restock ke saath) generate hota hai. Unpaid udhaar recovery, WhatsApp + UPI QR reminders, NIC JSON export, aur Live GSP API se E-Way Bill generation support karta hai.',
        pageSections: [
          'Invoice KPIs (Total Billed, Collected, Pending Udhaar, E-Way Pending)',
          'Pillar 1 Security Banner (Statutory Zero-Deletion & Immutable Tax Records)',
          'Status/Search Filters & Invoice Registry Table',
          'Udhaar Recovery Payment Modal (Partial/Full settlement + Cashbook sync)',
          'Credit Note / Sales Return Dialog (Stock restock + GST reversal)',
          'E-Way Bill Action Panel (Live Generate, Part-B Vehicle Update, Cancel EWB, NIC JSON Export, GSP Config Modal)',
          'WhatsApp Share Modal with UPI Payment Link & A4 Invoice Print',
        ],
        connectedPages: [
          { label: 'Billing (POS)', href: '/billing', relation: 'Receives newly generated POS & Split invoices' },
          { label: 'GST & GSTR-1', href: '/accounting/gst', relation: 'Supplies tax invoices & credit notes for GSTR-1 / GSTR-3B' },
          { label: 'OS Settings (Tax & GST)', href: '/settings?tab=tax', relation: 'Reads GSP API credentials & setup config' },
        ],
        frontendStack: [
          'src/app/invoices/page.tsx',
          'WhatsAppShareModal.tsx / EWayGspConfigPanel.tsx',
          'src/lib/invoice-recovery.ts / src/lib/eway-bill.ts / src/lib/gst-reports.ts',
        ],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/invoices (Pillar 1: Immutable tax records, zero client delete)',
            'businesses/{businessId}/creditNotes (Pillar 1: Statutory GST reversals)',
            'businesses/{businessId}/cashbook (Pillar 1: Admin-only P&L, POS write-only)',
            'businesses/{businessId}/customers',
            'businesses/{businessId}/products (Pillar 1: Admin-only delete)',
          ],
          apiRoutes: ['/api/eway-bill/generate', '/api/eway-bill/action', '/api/eway-bill/config'],
          serverActions: [],
          aiAndExternal: ['NIC GSP Live EWB API (MasterGST / ClearTax / NIC Direct)', 'UPI Pay Intent', 'WhatsApp Web/Cloud Share'],
        },
      },
      {
        id: 'accounting-gst',
        label: 'GST & GSTR-1',
        href: '/accounting/gst',
        pageFile: 'src/app/accounting/gst/page.tsx',
        entitlement: 'Core (Free)',
        howItWorks:
          'Monthly, Quarterly, ya Custom period ke sabhi invoices, credit notes, aur cashbook purchase ITC ko scan karke GSTR-1 sections (B2B, B2CL, B2CS, CDNR, HSN Summary) aur GSTR-3B Net Tax Payable (Output Tax - Input ITC) calculate karta hai, aur official GSTN-format JSON + CSV export deta hai.',
        pageSections: [
          'Period Selector (Monthly / Quarterly / Custom Date Range)',
          'GSTR-3B Summary Cards (Output CGST/SGST/IGST, Input ITC, Net Payable)',
          'Tabbed Registers: B2B, B2CL (>₹2.5L Inter-State), B2CS, Credit Notes (CDNR), HSN Summary',
          'GSTR-1 JSON Export & CSV Download Actions',
        ],
        connectedPages: [
          { label: 'Invoices & E-Way', href: '/invoices', relation: 'Pulls outward B2B/B2C invoices & credit notes' },
          { label: 'Accounting Pro', href: '/accounting', relation: 'Links GST liability with overall business accounting' },
          { label: 'OS Settings', href: '/settings?tab=tax', relation: 'Reads Business GSTIN, State & Tax preferences' },
        ],
        frontendStack: ['src/app/accounting/gst/page.tsx', 'src/lib/gst-reports.ts', 'src/lib/gst-logic.ts'],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/invoices',
            'businesses/{businessId}/creditNotes',
            'businesses/{businessId}/cashbook',
          ],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: ['GSTN GSTR-1 JSON Schema Generator'],
        },
      },
      {
        id: 'quotations',
        label: 'Quotations',
        href: '/quotations',
        pageFile: 'src/app/quotations/page.tsx',
        entitlement: 'Core (Free)',
        howItWorks:
          'Customers ke liye GST-wise price estimates/quotations create, preview, aur track karta hai; ek click par kisi bhi approved quotation ko `/billing?quoteId=...` me invoice me convert karta hai.',
        pageSections: [
          'Quotation KPI Cards & Status Filters (Draft, Sent, Approved, Converted)',
          'Create Quotation Form with Product & Customer Picker',
          'Convert-to-Bill Action & Printable Estimate Preview',
        ],
        connectedPages: [
          { label: 'Billing (POS)', href: '/billing', relation: '1-click quotation to POS invoice conversion' },
          { label: 'Solar Quotations', href: '/solar/quotations', relation: 'Shares quotations collection for technical quotes' },
        ],
        frontendStack: ['src/app/quotations/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/quotations', 'businesses/{businessId}/customers', 'businesses/{businessId}/products'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'inventory',
        label: 'Inventory',
        href: '/inventory',
        pageFile: 'src/app/inventory/page.tsx',
        entitlement: 'Core (Free)',
        howItWorks:
          'Complete product catalog, SKU, Barcode, HSN Code, Purchase/Selling Price, GST slab, Low-Stock threshold, Vendor mapping, aur Storefront visibility (`showOnWebsite`) manage karta hai; barcode scanner (`/inventory/scanner`) aur AI product meta suggestions bhi support karta hai.',
        pageSections: [
          'Stock Valuation & Low Stock Alert Cards',
          'Product Search, Category Filter & Barcode Scanner Link (/inventory/scanner)',
          'Add/Edit Product Dialog (Pricing, HSN, GST%, Stock, Online Storefront Toggle)',
          'AI Auto-Fill Product Meta & Bulk Stock Adjustment',
        ],
        connectedPages: [
          { label: 'Billing (POS)', href: '/billing', relation: 'Supplies catalog items & deducts stock on invoice save' },
          { label: 'Storefront Manager', href: '/website', relation: 'Publishes showOnWebsite products to public /shop/[slug]' },
          { label: 'AI Advisor', href: '/ai-insights', relation: 'Feeds stock levels for reorder prediction' },
        ],
        frontendStack: ['src/app/inventory/page.tsx', 'src/app/inventory/scanner/page.tsx', 'src/app/inventory/scanner/client-page.tsx', 'src/lib/inventory-logic.ts'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/products', 'businesses/{businessId}/vendors'],
          apiRoutes: [],
          serverActions: ['src/app/actions/product-actions.ts'],
          aiAndExternal: ['src/ai/flows/suggest-product-meta.ts (Gemini)', 'src/ai/flows/scan-bill-flow.ts (Gemini Bill Scanner)'],
        },
      },
      {
        id: 'leads',
        label: 'CRM & Leads',
        href: '/leads',
        pageFile: 'src/app/leads/page.tsx',
        entitlement: 'Core (Free)',
        howItWorks:
          'Incoming sales inquiries aur pipeline stages (New, Contacted, Qualified, Proposal, Won, Lost) ko track karta hai with Pillar 2 Anti-Leakage Protection: Leads ka deletion strictly Admin/Owner only hai taki rogue staff ya rival agents customer inquiries delete ya wipe na kar sakein. Won leads directly Customer registry me promote hoti hain.',
        pageSections: [
          'Pipeline Stage Counters & Search/Source Filters',
          'Pillar 2 Lead Anti-Poaching & Deletion Lock',
          'Lead Capture Form (Name, Phone, Source, Estimated Value, Follow-up Date)',
          'Stage Transition Controls & Convert-to-Customer Action',
        ],
        connectedPages: [
          { label: 'Customers', href: '/customers', relation: 'Converts qualified/won leads into permanent customer records' },
          { label: 'Solar Inquiries', href: '/solar/inquiries', relation: 'Bridges general CRM leads to solar site surveys' },
          { label: 'AI Advisor', href: '/ai-insights', relation: 'Analyzes pipeline velocity' },
        ],
        frontendStack: ['src/app/leads/page.tsx'],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/leads (Pillar 2: Admin-only delete, anti-poaching)',
            'businesses/{businessId}/customers',
          ],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'customers',
        label: 'Customers',
        href: '/customers',
        pageFile: 'src/app/customers/page.tsx',
        entitlement: 'Core (Free)',
        howItWorks:
          'Sabhi retail/B2B customers ka unified directory maintain karta hai with Pillar 2 Anti-Theft Protection: Customer profiles aur unka udhaar khata (`dueBalance`) deletion permanently locked to Admin/Owner only hai (staff cannot delete debtor ledgers). GSTIN, State, Address, Phone, Total Spent, Online Orders, aur AI Loyalty Risk insights provide karta hai.',
        pageSections: [
          'Customer Directory & Udhaar Filter Views',
          'Pillar 2 Debtor & Customer Tamper Protection Lock',
          'Add/Edit Customer Modal (GSTIN, State, Pincode, Phone, Email)',
          'Customer Profile Drawer (Purchase History, Udhaar Balance, Store Orders, Loyalty Status)',
          'AI Loyalty & Churn Analysis Trigger',
        ],
        connectedPages: [
          { label: 'Billing (POS)', href: '/billing', relation: 'Provides buyer GSTIN/state/address & updates dueBalance' },
          { label: 'Invoices & E-Way', href: '/invoices', relation: 'Shows customer udhaar recovery & return credit notes' },
          { label: 'Loyalty Members', href: '/loyalty/members', relation: 'Links customerId to loyalty memberships' },
        ],
        frontendStack: ['src/app/customers/page.tsx'],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/customers (Pillar 2: Zero staff delete, debtor ledger tamper-proof)',
            'businesses/{businessId}/orders (Pillar 2: Admin-only delete)',
          ],
          apiRoutes: [],
          serverActions: ['src/app/actions/customer-actions.ts'],
          aiAndExternal: ['src/ai/flows/loyalty-intelligence-flow.ts (Gemini)'],
        },
      },
      {
        id: 'vendors',
        label: 'Vendors',
        href: '/vendors',
        pageFile: 'src/app/vendors/page.tsx',
        entitlement: 'Core (Free)',
        howItWorks:
          'Suppliers aur manufacturers ka payable ledger track karta hai with Pillar 2 Supplier Privacy: Counter staff product create karte waqt vendor name pick kar sakte hain, lekin vendor bank accounts, purchase margins, aur profile edit/delete strictly Business Admin/Owner ke liye locked hai.',
        pageSections: [
          'Total Vendors & Outstanding Payables Summary',
          'Pillar 2 Wholesale Margin & Bank Details Protection',
          'Vendor Directory with Quick Payment & Ledger Link (/vendors/[vendorId])',
          'Add Vendor Form (GSTIN, Phone, Category, Opening Balance)',
        ],
        connectedPages: [
          { label: 'Daily Entries', href: '/daily-entries', relation: 'Records vendor purchase & payout entries in cashbook' },
          { label: 'Inventory', href: '/inventory', relation: 'Links products to preferred suppliers' },
          { label: 'Procurement Hub', href: '/solar/procurement', relation: 'Assigns vendors to solar purchase requisitions' },
        ],
        frontendStack: ['src/app/vendors/page.tsx', 'src/app/vendors/[vendorId]/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/vendors', 'businesses/{businessId}/cashbook'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'team-directory',
        label: 'Team Directory',
        href: '/team',
        pageFile: 'src/app/team/page.tsx',
        entitlement: 'Core (Free)',
        howItWorks:
          'Organization team members, phone/email directory, direct WhatsApp onboarding invites, re-invite links, member status, CSV export/import, aur wage syncing ko manage karta hai. Invited members login karne par unka ₹500/d daily rate aur shift hours automatically authenticated UID par link hote hain aur emailMap deduplication engine duplicate rows ko background me merge aur prune karta hai.',
        pageSections: [
          'Team Directory KPI Metrics (Total Members, Active Logins, Pending Invites, Defined Roles)',
          'Member Directory Table with Status Filter (All / Active / Pending) & Search',
          'Wage Sync & Auto-Deduplication Engine (₹500/d default rate & shift hours binding)',
          'Direct WhatsApp Invite & Re-Invite Share Sheet with Pre-filled Welcome Message',
          'Team Member CSV Export & Safe CSV Import Dialog with Header Auto-mapping',
          'Quick Bridge to OS Settings Roles & RBAC Matrix (/settings?tab=roles)',
        ],
        connectedPages: [
          { label: 'OS Settings (Roles & RBAC)', href: '/settings?tab=roles', relation: 'Configures role-based access control matrix & permissions' },
          { label: 'Staff & Payroll', href: '/staff', relation: 'Bridges team member profiles to attendance and payroll calculation' },
          { label: 'CRM & Leads', href: '/leads', relation: 'Enables assigning leads and follow-ups to verified team members' },
        ],
        frontendStack: ['src/app/team/page.tsx', 'src/app/team/client-page.tsx', 'src/app/settings/components/TeamImportDialog.tsx'],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/team',
            'businesses/{businessId}/users',
            'businesses/{businessId}/invites',
            'invites',
            'users',
          ],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: ['WhatsApp Web Direct Invite Links'],
        },
      },
    ],
  },
  {
    id: 'solar_management',
    groupLabel: 'Solar Management',
    accessScope: 'Vertical Suite (`suite_solar`)',
    entitlementKey: 'suite_solar',
    summary:
      'End-to-end Solar EPC operating system: Lead/Inquiry -> Site Survey -> System Design & BOM -> Solar Quotation -> Installation -> Procurement -> Commissions -> Warranty -> Service & AMC -> Client Portal.',
    items: [
      {
        id: 'solar-operations',
        label: 'Control Hub',
        href: '/solar/operations',
        pageFile: 'src/app/solar/operations/page.tsx',
        entitlement: 'suite_solar',
        howItWorks:
          'Pure Solar EPC lifecycle ka live command center: active inquiries, pending installations, due AMC visits, open service tickets, inventory stock alerts, aur cashflow ko ek dashboard par consolidate karta hai.',
        pageSections: [
          'Solar EPC Lifecycle KPI Grid',
          'Pipeline Bottleneck Alerts & Notifications',
          'Quick Navigation Tiles to Surveys, Designs, Installations & Service',
        ],
        connectedPages: [
          { label: 'Solar Analytics', href: '/solar/analytics', relation: 'Deep funnel metrics' },
          { label: 'Solar AI Insights', href: '/solar/ai-insights', relation: 'AI risk & margin recommendations' },
        ],
        frontendStack: ['src/app/solar/operations/page.tsx', 'src/app/solar/page.tsx'],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/solarInquiries',
            'businesses/{businessId}/solarInstallations',
            'businesses/{businessId}/solarServiceRequests',
            'businesses/{businessId}/solarAmcContracts',
            'businesses/{businessId}/quotations',
            'businesses/{businessId}/cashbook',
            'businesses/{businessId}/products',
            'businesses/{businessId}/notifications',
          ],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'solar-plants',
        label: 'Plants Registry',
        href: '/solar/plants',
        pageFile: 'src/app/solar/plants/page.tsx',
        entitlement: 'suite_solar',
        howItWorks:
          'Commissioned solar plants (kWp capacity, inverter/panel serial numbers, handover date, monitoring status) ka permanent asset register manage karta hai (`/solar/plants/[id]`).',
        pageSections: [
          'Total Installed Capacity (kWp) & Plant Status Summary',
          'Commissioned Plants Registry Table',
          'Plant Equipment Serial & Monitoring Detail View (/solar/plants/[id])',
        ],
        connectedPages: [
          { label: 'Field Installations', href: '/solar/installations', relation: 'Creates plant records automatically on handover' },
          { label: 'Solar Customer Portal', href: '/portal/solar', relation: 'Exposes plant assets to customer portal' },
        ],
        frontendStack: ['src/app/solar/plants/page.tsx', 'src/app/solar/plants/[id]/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/solarPlants'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'solar-inquiries',
        label: 'Inquiries',
        href: '/solar/inquiries',
        pageFile: 'src/app/solar/inquiries/page.tsx',
        entitlement: 'suite_solar',
        howItWorks:
          'Solar leads ki roof area, monthly electricity bill, required kW capacity, aur connection type capture karta hai (`/solar/inquiries/new` & `[id]`) aur site survey assign karta hai.',
        pageSections: [
          'Solar Inquiry List with Capacity & Status Filters',
          'New Solar Inquiry Wizard (/solar/inquiries/new)',
          'Inquiry Detail Workspace (/solar/inquiries/[id]) linking Survey & Design',
        ],
        connectedPages: [
          { label: 'Site Surveys', href: '/solar/surveys', relation: 'Triggers technical roof audit for the inquiry' },
          { label: 'Customers & CRM', href: '/customers', relation: 'Links inquiry to unified customer directory' },
        ],
        frontendStack: ['src/app/solar/inquiries/page.tsx', 'new/page.tsx', '[id]/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/solarInquiries', 'businesses/{businessId}/customers', 'businesses/{businessId}/leads'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'solar-surveys',
        label: 'Site Surveys',
        href: '/solar/surveys',
        pageFile: 'src/app/solar/surveys/page.tsx',
        entitlement: 'suite_solar',
        howItWorks:
          'Field engineer ke liye rooftop structure, shading, azimuth/orientation, electrical earthing/meter phase, aur site photos record karta hai.',
        pageSections: [
          'Scheduled & Completed Site Surveys Table',
          'Technical Survey Form (Electrical, Rooftop, Orientation, Media)',
          'Direct Promote-to-Design Action',
        ],
        connectedPages: [
          { label: 'Inquiries', href: '/solar/inquiries', relation: 'Created from approved solar inquiries' },
          { label: 'System Designs', href: '/solar/designs', relation: 'Feeds roof & electrical specs to BOM design' },
        ],
        frontendStack: ['src/app/solar/surveys/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/solarSurveys', 'businesses/{businessId}/solarInquiries'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'solar-designs',
        label: 'System Designs',
        href: '/solar/designs',
        pageFile: 'src/app/solar/designs/page.tsx',
        entitlement: 'suite_solar',
        howItWorks:
          'Inventory products se panels, inverters, aur BOS components map karke exact DC/AC kW capacity aur technical Bill of Materials (BOM) design karta hai (`/solar/designs/new` & `[id]`).',
        pageSections: [
          'System Designs & Capacity Registry',
          'BOM Component Builder (/solar/designs/new) linked to Inventory SKUs',
          'Design Approval & Generate Solar Quotation Action',
        ],
        connectedPages: [
          { label: 'Site Surveys', href: '/solar/surveys', relation: 'Imports roof measurements from survey' },
          { label: 'Solar Quotations', href: '/solar/quotations', relation: 'Converts BOM directly into customer quotation' },
        ],
        frontendStack: ['src/app/solar/designs/page.tsx', 'new/page.tsx', '[id]/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/solarSystemDesigns', 'businesses/{businessId}/solarSurveys', 'businesses/{businessId}/products'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'solar-quotations',
        label: 'Solar Quotations',
        href: '/solar/quotations',
        pageFile: 'src/app/solar/quotations/page.tsx',
        entitlement: 'suite_solar',
        howItWorks:
          'System design ke BOM se subsidy/non-subsidy solar proposal generate karta hai, WhatsApp se share karta hai, aur accept hone par Field Installation launch karta hai.',
        pageSections: [
          'Solar Proposals Pipeline List',
          'Proposal Detail & Printable PDF / WhatsApp Share (/solar/quotations/[id])',
          'Start Field Installation Trigger',
        ],
        connectedPages: [
          { label: 'System Designs', href: '/solar/designs', relation: 'Pulls technical BOM & DC kW specs' },
          { label: 'Field Installations', href: '/solar/installations', relation: 'Spawns execution job on customer acceptance' },
        ],
        frontendStack: ['src/app/solar/quotations/page.tsx', '[id]/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/quotations', 'businesses/{businessId}/solarSystemDesigns'],
          apiRoutes: [],
          serverActions: ['src/app/actions/whatsapp-actions.ts'],
          aiAndExternal: ['Meta WhatsApp Cloud API'],
        },
      },
      {
        id: 'solar-installations',
        label: 'Field Installations',
        href: '/solar/installations',
        pageFile: 'src/app/solar/installations/page.tsx',
        entitlement: 'suite_solar',
        howItWorks:
          'On-site installation milestones track karta hai, Firestore `runTransaction` se atomic material issue karta hai (inventory deduct), handover PDF generate karta hai, aur commissioning par Warranty + Plant Registry create karta hai.',
        pageSections: [
          'Installation Progress & Team Assignment Board',
          'Atomic Material Issue Panel (Inventory stock transaction)',
          'Commissioning, Warranty Auto-Creation & Plant Handover Certificate',
        ],
        connectedPages: [
          { label: 'Plants Registry', href: '/solar/plants', relation: 'Registers active solarPlant upon commissioning' },
          { label: 'Warranty Ledger', href: '/solar/warranties', relation: 'Creates panel/inverter warranties on handover' },
          { label: 'Procurement Hub', href: '/solar/procurement', relation: 'Requests missing BOM hardware' },
        ],
        frontendStack: ['src/app/solar/installations/page.tsx', 'new/page.tsx', '[id]/page.tsx'],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/solarInstallations',
            'businesses/{businessId}/products',
            'businesses/{businessId}/solarPlants',
            'businesses/{businessId}/solarWarranties',
            'businesses/{businessId}/solarDocuments',
            'businesses/{businessId}/projects',
            'businesses/{businessId}/tasks',
            'businesses/{businessId}/cashbook',
          ],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: ['Firestore Atomic runTransaction', 'jspdf / html2canvas'],
        },
      },
      {
        id: 'solar-procurement',
        label: 'Procurement Hub',
        href: '/solar/procurement',
        pageFile: 'src/app/solar/procurement/page.tsx',
        entitlement: 'suite_solar',
        howItWorks:
          'Installations ke liye material purchase requisitions (DRAFT -> APPROVED -> ORDERED -> RECEIVED) manage karta hai; goods receive par inventory stock aur cashbook expense update karta hai.',
        pageSections: [
          'Purchase Requisition Queue & Status Filters',
          'Create Requisition Form (/solar/procurement/new) with Vendor Mapping',
          'Receive Material & Stock-In Reconciliation (/solar/procurement/[id])',
        ],
        connectedPages: [
          { label: 'Field Installations', href: '/solar/installations', relation: 'Fulfills material requirements for active sites' },
          { label: 'Vendors & Inventory', href: '/vendors', relation: 'Syncs vendor orders & stock additions' },
        ],
        frontendStack: ['src/app/solar/procurement/page.tsx', 'new/page.tsx', '[id]/page.tsx'],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/solarPurchaseRequisitions',
            'businesses/{businessId}/vendors',
            'businesses/{businessId}/products',
            'businesses/{businessId}/cashbook',
          ],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'solar-commissions',
        label: 'Partner Commissions',
        href: '/solar/commissions',
        pageFile: 'src/app/solar/commissions/page.tsx',
        entitlement: 'suite_solar',
        howItWorks:
          'Channel partners / dealers ke percentage, fixed, ya per-kW commissions calculate, approve, aur cashbook payout ke saath settle karta hai.',
        pageSections: [
          'Payable vs Paid Commission Totals',
          'Dealer Commission Ledger Table',
          'Approve & Settle Payout Action (/solar/commissions/[id])',
        ],
        connectedPages: [
          { label: 'Solar Quotations', href: '/solar/quotations', relation: 'Links commission to closed solar quotation' },
          { label: 'Accounting Pro', href: '/accounting', relation: 'Posts payout debit to cashbook' },
        ],
        frontendStack: ['src/app/solar/commissions/page.tsx', '[id]/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/solarDealerCommissions', 'businesses/{businessId}/cashbook'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'solar-warranties',
        label: 'Warranty Ledger',
        href: '/solar/warranties',
        pageFile: 'src/app/solar/warranties/page.tsx',
        entitlement: 'suite_solar',
        howItWorks:
          'Installed panels aur inverters ki start/end warranty dates track karta hai (`ACTIVE`, `EXPIRING_SOON`, `EXPIRED`) aur renewal/service workflows se connect karta hai.',
        pageSections: [
          'Warranty Status Filters & Expiry Radar',
          'Warranty Registry Table & Detail Card (/solar/warranties/[id])',
        ],
        connectedPages: [
          { label: 'Field Installations', href: '/solar/installations', relation: 'Auto-generated during installation handover' },
          { label: 'Service Tickets', href: '/solar/service', relation: 'Validates warranty coverage during repair claims' },
        ],
        frontendStack: ['src/app/solar/warranties/page.tsx', '[id]/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/solarWarranties'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'solar-service',
        label: 'Service Tickets',
        href: '/solar/service',
        pageFile: 'src/app/solar/service/page.tsx',
        entitlement: 'suite_solar',
        howItWorks:
          'Post-installation faults, cleaning, ya inverter alerts ke field service tickets schedule aur resolve karta hai; customer portal (`/portal/solar/service/new`) se aane wali requests bhi yahin land hoti hain.',
        pageSections: [
          'Open / Scheduled / Resolved Service Queue',
          'New Ticket Assignment Form (/solar/service/new)',
          'Ticket Resolution Log (/solar/service/[id])',
        ],
        connectedPages: [
          { label: 'Warranty & AMC', href: '/solar/amc', relation: 'Checks AMC/warranty coverage for ticket' },
          { label: 'Solar Customer Portal', href: '/portal/solar', relation: 'Receives customer self-service complaints' },
        ],
        frontendStack: ['src/app/solar/service/page.tsx', 'new/page.tsx', '[id]/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/solarServiceRequests', 'businesses/{businessId}/solarInstallations'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'solar-amc',
        label: 'AMC Contracts',
        href: '/solar/amc',
        pageFile: 'src/app/solar/amc/page.tsx',
        entitlement: 'suite_solar',
        howItWorks:
          'Annual Maintenance Contracts (contract period, visit frequency, renewal status) create aur monitor karta hai.',
        pageSections: [
          'Active & Expiring AMC Contracts List',
          'Create AMC Contract Form (/solar/amc/new)',
        ],
        connectedPages: [
          { label: 'Service Tickets', href: '/solar/service', relation: 'Links scheduled preventive maintenance visits' },
          { label: 'Plants Registry', href: '/solar/plants', relation: 'Covers commissioned solar plant assets' },
        ],
        frontendStack: ['src/app/solar/amc/page.tsx', 'new/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/solarAmcContracts', 'businesses/{businessId}/solarInstallations'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'solar-documents',
        label: 'Document Hub',
        href: '/solar/documents',
        pageFile: 'src/app/solar/documents/page.tsx',
        entitlement: 'suite_solar',
        howItWorks:
          'Net-metering forms, DISCOM approvals, handover certificates, aur warranty documents ko centralized vault me store aur filter karta hai.',
        pageSections: [
          'Document Category Filter & Search',
          'Installation-Linked Vault Registry',
        ],
        connectedPages: [
          { label: 'Field Installations', href: '/solar/installations', relation: 'Stores auto-generated handover & warranty docs' },
          { label: 'Solar Customer Portal', href: '/portal/solar', relation: 'Shares verified customer copies' },
        ],
        frontendStack: ['src/app/solar/documents/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/solarDocuments'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'solar-reports',
        label: 'Reports',
        href: '/solar/reports',
        pageFile: 'src/app/solar/reports/page.tsx',
        entitlement: 'suite_solar',
        howItWorks:
          'Solar EPC sales, installation margins, commission payouts, aur reconciliation (`/solar/reconciliation`) ki structured financial reports banata hai.',
        pageSections: [
          'EPC Margin & Cash Collected Report Cards',
          'Installation-Wise Financial Reconciliation Table',
          'CSV / Report Export Controls',
        ],
        connectedPages: [
          { label: 'Control Hub', href: '/solar/operations', relation: 'Drills down from high-level KPIs' },
          { label: 'BI Analytics', href: '/solar/analytics', relation: 'Visual chart companion' },
        ],
        frontendStack: ['src/app/solar/reports/page.tsx', 'src/app/solar/reconciliation/page.tsx'],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/solarInstallations',
            'businesses/{businessId}/solarInquiries',
            'businesses/{businessId}/quotations',
            'businesses/{businessId}/solarDealerCommissions',
            'businesses/{businessId}/cashbook',
            'businesses/{businessId}/products',
          ],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'solar-analytics',
        label: 'BI Analytics',
        href: '/solar/analytics',
        pageFile: 'src/app/solar/analytics/page.tsx',
        entitlement: 'suite_solar',
        howItWorks:
          'Inquiry -> Survey -> Design -> Quotation -> Installation funnel conversion rates aur kW velocity ke interactive BI charts dikhata hai.',
        pageSections: [
          'Solar Conversion Funnel Charts',
          'Monthly kWp Capacity & Revenue Velocity Graphs',
        ],
        connectedPages: [
          { label: 'AI Insights', href: '/solar/ai-insights', relation: 'Hands metrics to Gemini Solar Intelligence' },
        ],
        frontendStack: ['src/app/solar/analytics/page.tsx', 'Recharts'],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/solarInquiries',
            'businesses/{businessId}/solarSurveys',
            'businesses/{businessId}/solarSystemDesigns',
            'businesses/{businessId}/quotations',
            'businesses/{businessId}/solarInstallations',
            'businesses/{businessId}/cashbook',
          ],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'solar-ai-insights',
        label: 'AI Insights',
        href: '/solar/ai-insights',
        pageFile: 'src/app/solar/ai-insights/page.tsx',
        entitlement: 'suite_solar',
        howItWorks:
          'Live solar inquiries, designs, quotations, installations, commissions, aur warranties data ko `solar-intelligence-flow` (Gemini) par bhejkar bottleneck, pricing, aur SLA insights generate karta hai.',
        pageSections: [
          'Run Solar Intelligence Audit CTA',
          'AI Bottleneck & Margin Opportunity Cards',
          'Actionable EPC Recommendations List',
        ],
        connectedPages: [
          { label: 'Control Hub', href: '/solar/operations', relation: 'Surfaces action targets back to operations' },
        ],
        frontendStack: ['src/app/solar/ai-insights/page.tsx'],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/solarInquiries',
            'businesses/{businessId}/solarSurveys',
            'businesses/{businessId}/solarSystemDesigns',
            'businesses/{businessId}/quotations',
            'businesses/{businessId}/solarInstallations',
            'businesses/{businessId}/solarDealerCommissions',
            'businesses/{businessId}/solarWarranties',
          ],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: ['src/ai/flows/solar-intelligence-flow.ts (Genkit + Gemini)'],
        },
      },
    ],
  },
  {
    id: 'engagement',
    groupLabel: 'Engagement',
    accessScope: 'Feedback (`feat_feedback`) & Support (`suite_support`)',
    entitlementKey: 'feat_feedback / suite_support',
    summary:
      'Customer satisfaction scores aur public QR feedback forms + post-sale support ticket tracking.',
    items: [
      {
        id: 'feedback',
        label: 'Customer Feedback',
        href: '/feedback',
        pageFile: 'src/app/feedback/page.tsx',
        entitlement: 'feat_feedback',
        howItWorks:
          'Shareable public feedback form (`/feedback/form/[businessId]`) aur tracking link (`/feedback/track/[businessId]/[feedbackId]`) configure karta hai aur ratings/reviews manage karta hai.',
        pageSections: [
          'Feedback Form Builder & Public QR Link',
          'Customer Ratings Summary & Reviews Stream',
          'Notification Triggers on Low Rating Submission',
        ],
        connectedPages: [
          { label: 'Public Feedback Form', href: '/feedback', relation: 'Public routes: /feedback/form/[businessId] & /feedback/track/...' },
        ],
        frontendStack: ['src/app/feedback/page.tsx', 'form/[businessId]/page.tsx', 'track/[businessId]/[feedbackId]/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/feedback', 'businesses/{businessId}/feedbackConfig', 'businesses/{businessId}/notifications'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'complaints',
        label: 'Support Desk',
        href: '/complaints',
        pageFile: 'src/app/complaints/page.tsx',
        entitlement: 'suite_support',
        howItWorks:
          'Customer complaints aur support tickets ko SLA status ke saath manage karta hai; public ticket submission (`/complaints/form/[businessId]`) aur WhatsApp updates (`/complaints/[ticketId]`) support karta hai.',
        pageSections: [
          'Open / In-Progress / Resolved Tickets Board',
          'Public Intake & Customer Ticket Tracking URLs',
          'Ticket Detail & WhatsApp Response Controls (/complaints/[ticketId])',
        ],
        connectedPages: [
          { label: 'Customers', href: '/customers', relation: 'Links tickets to customer profiles' },
          { label: 'WhatsApp Automation', href: '/whatsapp-automation', relation: 'Sends ticket status updates via WhatsApp' },
        ],
        frontendStack: ['src/app/complaints/page.tsx', '[ticketId]/page.tsx', 'form/[businessId]/page.tsx', 'track/[businessId]/[ticketId]/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/complaints', 'businesses/{businessId}/customers', 'businesses/{businessId}/notifications'],
          apiRoutes: [],
          serverActions: ['src/app/actions/whatsapp-actions.ts'],
          aiAndExternal: ['Meta WhatsApp Cloud API'],
        },
      },
      {
        id: 'support_hub',
        label: 'Customer Care Hub',
        href: '/support',
        pageFile: 'src/app/support/page.tsx',
        entitlement: 'suite_support',
        howItWorks:
          'Non-public internal portal: Sirf authenticated Support Team members, managers, aur platform owners ke liye page-wise interactive frontend guide, troubleshooting SOPs, live ticket queue, aur customer 360 lookup provide karta hai.',
        pageSections: [
          'Page-by-Page Frontend System Flow & SOPs',
          'Problem Finder & Instant Canned Solutions',
          'Live Ticket Queue & 1-Click SOP Resolution',
          'Customer 360° Phone/Email Lookup & WhatsApp Launcher',
        ],
        connectedPages: [
          { label: 'Support Desk', href: '/complaints', relation: 'Live ticket escalation and tracking' },
          { label: 'Billing POS', href: '/billing', relation: 'Hardware & printer troubleshooting SOPs' },
          { label: 'Invoices Ledger', href: '/invoices', relation: 'GST tax & E-way bill resolution SOPs' },
          { label: 'WhatsApp Automation', href: '/whatsapp-automation', relation: 'Meta API token & template SOPs' },
        ],
        frontendStack: ['src/app/support/page.tsx', 'src/app/support/client-page.tsx', 'src/lib/support-knowledge-base.ts'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/complaints', 'businesses/{businessId}/customers'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: ['Support Knowledge Base Engine'],
        },
      },
    ],
  },
  {
    id: 'loyalty_rewards',
    groupLabel: 'Loyalty & Rewards',
    accessScope: 'Loyalty Suite (`suite_loyalty`)',
    entitlementKey: 'suite_loyalty',
    summary:
      'Membership tiers, digital loyalty cards, QR verification, universal coupons/vouchers, referral rewards, aur automated retention campaigns.',
    items: [
      {
        id: 'loyalty-command',
        label: 'Loyalty Command',
        href: '/loyalty',
        pageFile: 'src/app/loyalty/page.tsx',
        entitlement: 'suite_loyalty',
        howItWorks:
          'Loyalty program config (`loyaltyConfig/main`, `loyaltyJoinConfig/main`), external referrers (`references`), active members summary, aur recent reward activity ko control karta hai.',
        pageSections: [
          'Loyalty Program Config & Public Join Link (/loyalty/join/[businessId])',
          'External Reference / Gift Partner Registry',
          'Recent Points & Redemption Activity Feed',
        ],
        connectedPages: [
          { label: 'Billing (POS)', href: '/billing', relation: 'Powers Reward Sync mode & wallet redemptions at checkout' },
          { label: 'Member Registry', href: '/loyalty/members', relation: 'Manages enrolled customer cards' },
        ],
        frontendStack: ['src/app/loyalty/page.tsx', 'join/[businessId]/page.tsx'],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/loyaltyConfig/main',
            'businesses/{businessId}/loyaltyJoinConfig/main',
            'businesses/{businessId}/references',
            'businesses/{businessId}/memberships',
            'businesses/{businessId}/loyaltyActivity',
            'businesses/{businessId}/customers',
          ],
          apiRoutes: ['/api/payments/create-order', '/api/payments/verify'],
          serverActions: ['src/app/actions/whatsapp-actions.ts', 'src/app/actions/p0-migration.ts'],
          aiAndExternal: ['Razorpay (Paid Tier Enrollment)', 'Meta WhatsApp Cloud API'],
        },
      },
      {
        id: 'loyalty-track-member',
        label: 'Track Member',
        href: '/loyalty/track-member',
        pageFile: 'src/app/loyalty/track-member/[businessId]/page.tsx',
        entitlement: 'suite_loyalty',
        howItWorks:
          'Phone number, Member ID, ya QR scan se kisi bhi customer ki membership validity, tier benefits, aur wallet balance ko instant verify karta hai.',
        pageSections: [
          'Member ID / Phone / QR Lookup Input',
          'Live Digital Membership Card & Wallet Balance Display',
        ],
        connectedPages: [
          { label: 'Member Registry', href: '/loyalty/members', relation: 'Queries enrolled memberships' },
          { label: 'Billing (POS)', href: '/billing', relation: 'Verifies member eligibility before applying tier discounts' },
        ],
        frontendStack: ['src/app/loyalty/track-member/[businessId]/page.tsx', 'track-member/page.tsx', 'verify/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/memberships', 'businesses/{businessId}/customers', 'businesses/{businessId}/loyaltyConfig/main'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'loyalty-coupons',
        label: 'Offer Hub',
        href: '/loyalty/coupons',
        pageFile: 'src/app/loyalty/coupons/page.tsx',
        entitlement: 'suite_loyalty',
        howItWorks:
          'Percentage, Fixed, BOGO, aur Wallet discount coupons create karta hai (minOrder, maxDiscount, usageLimit, perUserLimit rules ke saath) jo POS billing par auto-apply/suggest hote hain.',
        pageSections: [
          'Active & Expired Coupons Grid',
          'Create Coupon Dialog (Code, Discount Type, Min Order, Usage Limits)',
        ],
        connectedPages: [
          { label: 'Billing (POS)', href: '/billing', relation: 'Auto-recommends best savings coupon via findBestCouponOffer' },
          { label: 'Analytics & ROI', href: '/marketing', relation: 'Tracks coupon redemption performance' },
        ],
        frontendStack: ['src/app/loyalty/coupons/page.tsx', 'src/lib/billing-engine.ts'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/coupons'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'loyalty-members',
        label: 'Member Registry',
        href: '/loyalty/members',
        pageFile: 'src/app/loyalty/members/page.tsx',
        entitlement: 'suite_loyalty',
        howItWorks:
          'Naye loyalty members enroll karta hai (Razorpay payment support ke saath), tiers assign/edit karta hai, aur digital member pass + WhatsApp confirmation bhejta hai.',
        pageSections: [
          'Enrolled Members Directory & Tier Filters',
          'Enroll Member Form (Customer, Tier, Reference Partner, Payment Mode)',
          'Digital Card View (/loyalty/track/[businessId]/[memberId])',
        ],
        connectedPages: [
          { label: 'Manage Tiers', href: '/loyalty/tiers', relation: 'Loads tier pricing, validity & wallet perks' },
          { label: 'Customers', href: '/customers', relation: 'Links membership to customerId' },
        ],
        frontendStack: ['src/app/loyalty/members/page.tsx', 'track/[businessId]/[memberId]/page.tsx'],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/memberships',
            'businesses/{businessId}/loyaltyTiers',
            'businesses/{businessId}/customers',
            'businesses/{businessId}/references',
            'businesses/{businessId}/cashbook',
          ],
          apiRoutes: ['/api/payments/create-order', '/api/payments/verify'],
          serverActions: ['src/app/actions/whatsapp-actions.ts'],
          aiAndExternal: ['Razorpay', 'Meta WhatsApp Cloud API'],
        },
      },
      {
        id: 'loyalty-tiers',
        label: 'Manage Tiers',
        href: '/loyalty/tiers',
        pageFile: 'src/app/loyalty/tiers/page.tsx',
        entitlement: 'suite_loyalty',
        howItWorks:
          'Silver/Gold/VIP jaise membership tiers define karta hai — enrollment fee, validity days, cashback %, aur tier-linked coupons configure karta hai.',
        pageSections: [
          'Tier Cards Grid with Benefits Breakdown',
          'Create / Edit Tier Modal',
        ],
        connectedPages: [
          { label: 'Member Registry', href: '/loyalty/members', relation: 'Applies tier rules to enrolled members' },
          { label: 'Offer Hub', href: '/loyalty/coupons', relation: 'Associates exclusive tier coupons' },
        ],
        frontendStack: ['src/app/loyalty/tiers/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/loyaltyTiers', 'businesses/{businessId}/coupons'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'loyalty-automation',
        label: 'Automation Rules',
        href: '/loyalty/automation',
        pageFile: 'src/app/loyalty/automation/page.tsx',
        entitlement: 'suite_loyalty',
        howItWorks:
          'Birthday, Anniversary, Expiry Reminder, aur Win-back jaise loyalty triggers ke liye WhatsApp template automation configure karta hai.',
        pageSections: [
          'Event Trigger Toggles & Timing Rules',
          'Template Mapping & Test Dispatch Controls',
        ],
        connectedPages: [
          { label: 'Template Hub', href: '/settings/whatsapp-templates', relation: 'Uses approved Meta WhatsApp templates' },
          { label: 'Campaign Center', href: '/loyalty/campaigns', relation: 'Coordinates scheduled retention outreach' },
        ],
        frontendStack: ['src/app/loyalty/automation/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/loyaltyAutomation'],
          apiRoutes: [],
          serverActions: ['src/app/actions/whatsapp-actions.ts'],
          aiAndExternal: ['Meta WhatsApp Cloud API'],
        },
      },
      {
        id: 'loyalty-campaigns',
        label: 'Campaign Center',
        href: '/loyalty/campaigns',
        pageFile: 'src/app/loyalty/campaigns/page.tsx',
        entitlement: 'suite_loyalty',
        howItWorks:
          'AI (`suggest-loyalty-campaign-flow`) ki madad se segmented customer offers aur WhatsApp broadcast campaigns plan aur launch karta hai.',
        pageSections: [
          'Campaign Composer with Coupon Attachment',
          'AI Campaign Suggestion Card & Launch Log',
        ],
        connectedPages: [
          { label: 'Offer Hub', href: '/loyalty/coupons', relation: 'Attaches promo codes to campaigns' },
          { label: 'Analytics & ROI', href: '/marketing', relation: 'Measures campaign redemptions' },
        ],
        frontendStack: ['src/app/loyalty/campaigns/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/campaigns', 'businesses/{businessId}/coupons', 'businesses/{businessId}/customers'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: ['src/ai/flows/suggest-loyalty-campaign-flow.ts (Gemini)'],
        },
      },
    ],
  },
  {
    id: 'real_estate',
    groupLabel: 'Real Estate',
    accessScope: 'Real Estate Suite (`suite_property` / `feat_realestate_catalog`)',
    entitlementKey: 'suite_property',
    summary:
      'Property inventory catalog, site-visit buyer leads, aur real-estate agent commission/reward tracking.',
    items: [
      {
        id: 'properties-catalog',
        label: 'Property Catalog',
        href: '/properties',
        pageFile: 'src/app/properties/page.tsx',
        entitlement: 'suite_property / feat_realestate_catalog',
        howItWorks:
          'Residential/Commercial plots, flats, aur projects ka catalog (price, area, location, availability status) manage karta hai (`/properties/new` & `[id]`).',
        pageSections: [
          'Available / Booked / Sold Property KPI Cards',
          'Filterable Property Listings Grid',
          'Add Property Form (/properties/new)',
        ],
        connectedPages: [
          { label: 'Real Estate Customers', href: '/properties/leads', relation: 'Matches interested buyers to listed properties' },
          { label: 'Agent Performance', href: '/properties/rewards', relation: 'Tracks closed unit sales by agent' },
        ],
        frontendStack: ['src/app/properties/page.tsx', 'new/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/properties'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'properties-leads',
        label: 'Real Estate Customers',
        href: '/properties/leads',
        pageFile: 'src/app/properties/leads/page.tsx',
        entitlement: 'suite_property',
        howItWorks:
          'Property buyers ki budget, preferred location, site visit status, aur assigned broker/agent ko track karta hai (`/properties/leads/new`). Role-filtered agents apni assigned leads hi dekhte hain.',
        pageSections: [
          'Buyer Pipeline Table & Budget Filters',
          'New Buyer Inquiry Form (/properties/leads/new)',
        ],
        connectedPages: [
          { label: 'Property Catalog', href: '/properties', relation: 'Links inquiry to specific unit/project' },
          { label: 'Agent Performance', href: '/properties/rewards', relation: 'Calculates agent incentives when deal closes' },
        ],
        frontendStack: ['src/app/properties/leads/page.tsx', 'leads/new/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/realEstateLeads'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'properties-rewards',
        label: 'Agent Performance',
        href: '/properties/rewards',
        pageFile: 'src/app/properties/rewards/page.tsx',
        entitlement: 'suite_property',
        howItWorks:
          'Real estate agents ke closed deals, revenue volume, aur earned brokerage/commission rewards ko leaderboard format me calculate karta hai.',
        pageSections: [
          'Agent Leaderboard & Conversion KPI Cards',
          'Won Deal Commission Breakdown Table',
        ],
        connectedPages: [
          { label: 'Real Estate Customers', href: '/properties/leads', relation: 'Aggregates Won leads per agent' },
        ],
        frontendStack: ['src/app/properties/rewards/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/realEstateLeads', 'businesses/{businessId}/properties'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
    ],
  },
  {
    id: 'growth_engine',
    groupLabel: 'Growth Engine',
    accessScope: 'WhatsApp & Marketing Suite (`suite_growth` / `feat_whatsapp`)',
    entitlementKey: 'suite_growth',
    summary:
      'Official Meta WhatsApp Cloud API inbox, contact audiences, webhook automation flows, bulk template campaigns, aur ROI analytics.',
    items: [
      {
        id: 'wa-chat',
        label: 'Chat Hub',
        href: '/whatsapp-automation/chat',
        pageFile: 'src/app/whatsapp-automation/chat/page.tsx',
        entitlement: 'suite_growth',
        howItWorks:
          'Two-way WhatsApp inbox jahan inbound customer messages (`/api/webhook/whatsapp` se saved) real-time dikhte hain aur team text ya approved templates reply kar sakti hai.',
        pageSections: [
          'Conversation Thread List with Unread Badges',
          'Live Message Window (Inbound / Outbound Status)',
          'Quick Reply & Approved Template Dispatch Composer',
        ],
        connectedPages: [
          { label: 'API Configuration', href: '/whatsapp-automation/config', relation: 'Requires verified Meta Phone ID & Access Token' },
          { label: 'Contact Hub', href: '/whatsapp-automation/contacts', relation: 'Resolves customer names & tags' },
        ],
        frontendStack: ['src/app/whatsapp-automation/chat/page.tsx'],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/chats',
            'businesses/{businessId}/chats/{chatId}/messages',
            'businesses/{businessId}/customers',
          ],
          apiRoutes: ['/api/webhook/whatsapp'],
          serverActions: ['src/app/actions/whatsapp-actions.ts'],
          aiAndExternal: ['Meta WhatsApp Cloud API'],
        },
      },
      {
        id: 'wa-contacts',
        label: 'Contact Hub',
        href: '/whatsapp-automation/contacts',
        pageFile: 'src/app/whatsapp-automation/contacts/page.tsx',
        entitlement: 'suite_growth',
        howItWorks:
          'CRM customers, loyalty members, aur imported phone lists ko `globalContacts` + `contactGroups` me organize karta hai broadcast targeting ke liye.',
        pageSections: [
          'Audience Contacts Table & Group Segregator',
          'CSV / Manual Contact Import & Group Tagging',
        ],
        connectedPages: [
          { label: 'Campaigns', href: '/whatsapp-automation/campaigns', relation: 'Supplies segmented contactGroups for bulk broadcast' },
          { label: 'Customers', href: '/customers', relation: 'Syncs CRM phone records' },
        ],
        frontendStack: ['src/app/whatsapp-automation/contacts/page.tsx'],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/globalContacts',
            'businesses/{businessId}/customers',
            'businesses/{businessId}/memberships',
          ],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'wa-config',
        label: 'API Configuration',
        href: '/whatsapp-automation/config',
        pageFile: 'src/app/whatsapp-automation/config/page.tsx',
        entitlement: 'suite_growth',
        howItWorks:
          'Meta Phone Number ID, WABA ID, System User Access Token (`privateConfig/whatsapp`), aur Webhook Verify Token configure karta hai + live template sync test karta hai.',
        pageSections: [
          'Meta Cloud API Credentials Form (Write-only Token)',
          'Webhook Callback URL & Verify Token Copy Card (/api/webhook/whatsapp)',
          'Sync Approved Templates & Connection Health Test',
        ],
        connectedPages: [
          { label: 'Template Hub', href: '/settings/whatsapp-templates', relation: 'Syncs Meta approved message templates' },
          { label: 'WhatsApp Flows', href: '/whatsapp-automation', relation: 'Enables keyword bot & trigger automation' },
        ],
        frontendStack: ['src/app/whatsapp-automation/config/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}', 'businesses/{businessId}/privateConfig/whatsapp'],
          apiRoutes: ['/api/webhook/whatsapp'],
          serverActions: ['src/app/actions/whatsapp-actions.ts'],
          aiAndExternal: ['Meta Graph API (v19+/v20)'],
        },
      },
      {
        id: 'wa-campaigns',
        label: 'Campaigns',
        href: '/whatsapp-automation/campaigns',
        pageFile: 'src/app/whatsapp-automation/campaigns/page.tsx',
        entitlement: 'suite_growth',
        howItWorks:
          'Selected `contactGroups` par approved Meta WhatsApp templates batch-dispatch karta hai aur delivery counts log karta hai.',
        pageSections: [
          'Campaign Builder (Target Audience Group, Template, Variables)',
          'Broadcast Execution & Delivery History Table',
        ],
        connectedPages: [
          { label: 'Contact Hub', href: '/whatsapp-automation/contacts', relation: 'Selects audience contact groups' },
          { label: 'Template Hub', href: '/settings/whatsapp-templates', relation: 'Selects verified Meta templates' },
        ],
        frontendStack: ['src/app/whatsapp-automation/campaigns/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/campaigns', 'businesses/{businessId}/contactGroups', 'businesses/{businessId}/globalContacts'],
          apiRoutes: [],
          serverActions: ['src/app/actions/whatsapp-actions.ts'],
          aiAndExternal: ['Meta WhatsApp Cloud API'],
        },
      },
      {
        id: 'wa-flows',
        label: 'WhatsApp Flows',
        href: '/whatsapp-automation',
        pageFile: 'src/app/whatsapp-automation/page.tsx',
        entitlement: 'suite_growth / feat_whatsapp',
        howItWorks:
          'Inbound keyword auto-responder rules (`whatsappKeywords`), multi-step follow-up sequences (`whatsappFollowups`), aur event triggers (`whatsappTriggers`) configure karta hai + AI sequence generator deta hai.',
        pageSections: [
          'Keyword Bot Rules Table (Exact/Contains Match -> Reply/Template)',
          'Follow-up Sequence Builder & Trigger Event Toggles',
          'AI Sequence & Template Suggestion Assistant',
        ],
        connectedPages: [
          { label: 'Chat Hub', href: '/whatsapp-automation/chat', relation: 'Inbound webhook checks keyword rules before logging chat' },
        ],
        frontendStack: ['src/app/whatsapp-automation/page.tsx'],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/whatsappKeywords',
            'businesses/{businessId}/whatsappFollowups',
            'businesses/{businessId}/whatsappTriggers',
          ],
          apiRoutes: ['/api/webhook/whatsapp'],
          serverActions: [],
          aiAndExternal: [
            'src/ai/flows/suggest-automation-sequence.ts (Gemini)',
            'src/ai/flows/suggest-automation-template.ts (Gemini)',
          ],
        },
      },
      {
        id: 'wa-templates',
        label: 'Template Hub',
        href: '/settings/whatsapp-templates',
        pageFile: 'src/app/settings/whatsapp-templates/page.tsx',
        entitlement: 'suite_growth',
        howItWorks:
          'Meta Business Manager ke approved WhatsApp templates fetch, preview, aur billing/campaign workflows ke liye map karta hai.',
        pageSections: [
          'Sync From Meta Cloud API Action',
          'Approved Templates Preview List (Header, Body Variables, Quick Reply Buttons)',
        ],
        connectedPages: [
          { label: 'Campaigns & Billing', href: '/whatsapp-automation/campaigns', relation: 'Provides template names & language codes' },
        ],
        frontendStack: ['src/app/settings/whatsapp-templates/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}'],
          apiRoutes: [],
          serverActions: ['src/app/actions/whatsapp-actions.ts'],
          aiAndExternal: ['Meta Graph Templates API'],
        },
      },
      {
        id: 'marketing-roi',
        label: 'Analytics & ROI',
        href: '/marketing',
        pageFile: 'src/app/marketing/page.tsx',
        entitlement: 'suite_growth',
        howItWorks:
          'Active coupons, loyalty redemptions, aur promotional outreach se generate hui sales conversion aur ROI metrics track karta hai.',
        pageSections: [
          'Campaign Conversion & Coupon Redemption KPI Cards',
          'Redemption Velocity & ROI Chart Breakdown',
        ],
        connectedPages: [
          { label: 'Offer Hub', href: '/loyalty/coupons', relation: 'Reads coupon usage stats' },
          { label: 'Campaigns', href: '/whatsapp-automation/campaigns', relation: 'Correlates outreach with redemptions' },
        ],
        frontendStack: ['src/app/marketing/page.tsx', 'Recharts'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/coupons', 'businesses/{businessId}/loyaltyActivity'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
    ],
  },
  {
    id: 'intelligence',
    groupLabel: 'Intelligence',
    accessScope: 'AI Suite (`suite_intelligence` / `feat_intelligence`)',
    entitlementKey: 'suite_intelligence',
    summary:
      'Live business data (inventory, sales, leads, risk) par grounded conversational AI advisor aur pricing/reorder copilots.',
    items: [
      {
        id: 'ai-advisor',
        label: 'AI Advisor',
        href: '/ai-insights',
        pageFile: 'src/app/ai-insights/page.tsx',
        entitlement: 'suite_intelligence / feat_intelligence',
        howItWorks:
          'Tenant ke live products, leads, aur team context ko Gemini AI Genkit flows ke through analyze karke Hinglish chat advice, predictive stock reorder alerts, aur dynamic pricing suggestions deta hai.',
        pageSections: [
          'Conversational Hinglish Business Advisor Chat',
          'Predictive Stock Reorder Recommendations Card',
          'Smart Margin & Pricing Suggestions Panel',
        ],
        connectedPages: [
          { label: 'Inventory', href: '/inventory', relation: 'Reads live SKU stock & prices for reorder suggestions' },
          { label: 'CRM & Leads', href: '/leads', relation: 'Evaluates lead pipeline health' },
        ],
        frontendStack: ['src/app/ai-insights/page.tsx', 'src/components/layout/global-chatbot.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/products', 'businesses/{businessId}/leads', 'users'],
          apiRoutes: ['/api/chatbot'],
          serverActions: [],
          aiAndExternal: [
            'src/ai/flows/advisor-chat-flow.ts',
            'src/ai/flows/website-chatbot-flow.ts',
            'src/ai/flows/optimize-stock-reorder.ts',
            'src/ai/flows/generate-pricing-suggestions.ts',
            'Gemini API (process.env.GEMINI_API_KEY)',
          ],
        },
      },
    ],
  },
  {
    id: 'back_office',
    groupLabel: 'Back Office',
    accessScope: 'Finance, Projects, Staff & Tasks (`suite_backoffice` + Core Expenses)',
    entitlementKey: 'suite_backoffice',
    summary:
      'Complete back-office operations: double-entry cashbook/P&L accounting, recurring fixed expenses, payment approvals, project profitability, payroll & attendance, aur SOP task manager.',
    items: [
      {
        id: 'accounting-pro',
        label: 'Accounting Pro',
        href: '/accounting',
        pageFile: 'src/app/accounting/page.tsx',
        entitlement: 'suite_backoffice / feat_accounting',
        howItWorks:
          'Sabhi `cashbook` credit/debit entries ko category, payment mode, aur period ke hisaab se reconcile karke Gross Profit, Operating Expenses, Cash-in-Hand vs Bank Balance, aur downloadable accounting reports banata hai.',
        pageSections: [
          'Profit & Loss + Cash/Bank Summary Cards',
          'Category Spending Heatmap & Filterable General Ledger',
          'Direct Shortcut to GST & GSTR-1 (/accounting/gst)',
        ],
        connectedPages: [
          { label: 'GST & GSTR-1', href: '/accounting/gst', relation: 'Extends financial ledger into GSTN tax returns' },
          { label: 'Daily Entries', href: '/daily-entries', relation: 'Sources all manual & POS cashbook entries' },
          { label: 'Fixed Expenses', href: '/fixed-expenses', relation: 'Includes rent/EMI/salary outflows' },
        ],
        frontendStack: ['src/app/accounting/page.tsx', 'Recharts'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/cashbook'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'fixed-expenses',
        label: 'Fixed Expenses',
        href: '/fixed-expenses',
        pageFile: 'src/app/fixed-expenses/page.tsx',
        entitlement: 'Core (Free)',
        howItWorks:
          'Monthly recurring overhead costs (Rent, Electricity, Internet, EMIs, Subscriptions) ko log aur track karta hai aur 1 click me monthly cashbook debit post karta hai.',
        pageSections: [
          'Monthly Recurring Commitments Summary',
          'Add Fixed Expense Template & One-Click Pay to Cashbook',
        ],
        connectedPages: [
          { label: 'Accounting Pro', href: '/accounting', relation: 'Posts recurring expense entries into cashbook' },
        ],
        frontendStack: ['src/app/fixed-expenses/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/cashbook'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'payment-requests',
        label: 'Payment Requests',
        href: '/payment-requests',
        pageFile: 'src/app/payment-requests/page.tsx',
        entitlement: 'feat_payments',
        howItWorks:
          'Staff reimbursements, vendor advance requests, aur site expense approvals manage karta hai; admin approve karne par request `cashbook` + `attendance`/vendor settlement me post ho jati hai.',
        pageSections: [
          'Pending / Approved / Settled Requests Queue',
          'New Payment Request Form (Staff / Vendor / Amount / Reason)',
          'Admin Approve & Post-to-Cashbook Action',
        ],
        connectedPages: [
          { label: 'My Staff Portal', href: '/my-staff-portal', relation: 'Receives payout requests submitted by staff' },
          { label: 'Accounting Pro & Vendors', href: '/accounting', relation: 'Posts settled payouts to cashbook & vendor ledger' },
        ],
        frontendStack: ['src/app/payment-requests/page.tsx'],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/paymentRequests',
            'businesses/{businessId}/cashbook',
            'businesses/{businessId}/vendors',
            'businesses/{businessId}/attendance',
            'businesses/{businessId}/notifications',
          ],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'projects',
        label: 'Projects',
        href: '/projects',
        pageFile: 'src/app/projects/page.tsx',
        entitlement: 'suite_backoffice / feat_projects',
        howItWorks:
          'Client projects, milestones, project-linked tasks, aur live P&L radar (`/projects/[projectId]`) track karta hai; client ke liye shareable public progress tracking link (`/projects/track/[businessId]/[projectId]`) aur milestone billing shortcut (`/billing?projectId=...`) deta hai.',
        pageSections: [
          'Active Projects Grid with Budget vs Actual Cost Bars',
          'Project Workspace (/projects/[projectId]) — Milestones, Tasks & Cashbook Expenses',
          'Public Client Tracking Link & Milestone-to-POS Billing CTA',
        ],
        connectedPages: [
          { label: 'Billing (POS)', href: '/billing', relation: 'Creates milestone invoices via /billing?projectId=...&milestoneId=...' },
          { label: 'Task Manager', href: '/notes', relation: 'Syncs project tasks to team task board' },
        ],
        frontendStack: ['src/app/projects/page.tsx', '[projectId]/page.tsx', '[projectId]/client-page.tsx', 'track/[businessId]/[projectId]/page.tsx'],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/projects',
            'businesses/{businessId}/tasks',
            'businesses/{businessId}/cashbook',
            'businesses/{businessId}/customers',
            'businesses/{businessId}/notifications',
          ],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: ['src/ai/flows/suggest-project-tasks.ts (Gemini)'],
        },
      },
      {
        id: 'staff-payroll',
        label: 'Staff & Payroll',
        href: '/staff',
        pageFile: 'src/app/staff/page.tsx',
        entitlement: 'suite_backoffice / feat_staff',
        howItWorks:
          'Team attendance check-in/out, overtime, allowances, salary slip generation (`/staff/[staffId]`), aur self-service public/staff portal (`/staff/track/[businessId]/[staffId]` & `/my-staff-portal`) manage karta hai.',
        pageSections: [
          'Staff Directory & Daily Attendance Matrix',
          'Salary Calculation & Digital Payslip Generator (/staff/[staffId])',
          'Team Directory Link (/team)',
        ],
        connectedPages: [
          { label: 'Team Directory', href: '/team', relation: 'Manages team members, invites & WhatsApp links' },
          { label: 'OS Settings (Roles & RBAC)', href: '/settings?tab=roles', relation: 'Configures role-based access control matrix' },
          { label: 'Payment Requests', href: '/payment-requests', relation: 'Links staff advances & reimbursements' },
        ],
        frontendStack: ['src/app/staff/page.tsx', '[staffId]/page.tsx', 'track/[businessId]/[staffId]/page.tsx', 'src/app/my-staff-portal/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/attendance', 'businesses/{businessId}/tasks', 'users'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: [],
        },
      },
      {
        id: 'task-manager',
        label: 'Task Manager',
        href: '/notes',
        pageFile: 'src/app/notes/page.tsx',
        entitlement: 'suite_backoffice',
        howItWorks:
          'Team operational tasks, deadlines, priority tags, aur Genkit AI SOP checklist decomposition (`/notes/[taskId]`) handle karta hai.',
        pageSections: [
          'Kanban / List Task Board with Assignee & Status Filters',
          'AI SOP Step Generator for Complex Tasks',
          'Task Detail & Sub-Checklist Execution (/notes/[taskId])',
        ],
        connectedPages: [
          { label: 'Projects & Staff', href: '/projects', relation: 'Syncs project tasks and assignee notifications' },
        ],
        frontendStack: ['src/app/notes/page.tsx', '[taskId]/page.tsx'],
        backendStack: {
          firestoreCollections: ['businesses/{businessId}/tasks', 'businesses/{businessId}/projects', 'businesses/{businessId}/notifications'],
          apiRoutes: [],
          serverActions: [],
          aiAndExternal: ['src/ai/flows/suggest-task-steps.ts (Gemini)'],
        },
      },
    ],
  },
  {
    id: 'store_builder',
    groupLabel: 'Store Builder',
    accessScope: 'Online Storefront (`feat_store`)',
    entitlementKey: 'feat_store',
    summary:
      'Modular 23-section e-commerce storefront & sales funnel builder (/shop, /funnel, custom domain & "+ Add Section" library), theme & font studio, Visual Editor, VIP lead capture, live order fulfillment & refunds, aur funnel analytics.',
    items: [
      {
        id: 'storefront-manager',
        label: 'Storefront Manager',
        href: '/website',
        pageFile: 'src/app/website/page.tsx',
        entitlement: 'feat_store',
        howItWorks:
          '5-tab Storefront Command Center (Overview, Design & Theme, Catalog Control, SEO & Social, Core Config): Brand Colors/Surfaces/5 Font Pairs, 16-section "+ Add Section" Library Picker (+ 7 funnel conversion blocks in Landing Page Builder), Live Mobile/Desktop StoreSimulator, Visual Store Editor (/website/editor/[pageId]), Custom Domain DNS CNAME verification (/website/domains), Coupons & Shipping Threshold, aur public /shop storefront publish karta hai.',
        pageSections: [
          'Overview Tab: Live URL Preview (/shop), Funnel & Merchandising Diagnostics, Store Integrity Audit & Recent Orders',
          'Design & Theme Tab: Logo/Favicon Canvas Upload, Theme Surfaces, 5 Font Pairs, Hero/Button/Grid Styles, Announcement Bar & Footer',
          'Section & Layout Controls: Modular "+ Add Section" Library Picker, Reorder/Edit/Toggle/Delete-Guard & Live Mobile/Desktop StoreSimulator',
          'Catalog Control (showOnWebsite & onlinePrice), SEO & Social Preview (Meta Pixel, GA4, Schema.org JSON-LD) & Core Config (COD, WhatsApp, Shipping, Policies, Coupons)',
          'Live Public Storefront (/shop): 16 Responsive Sections, Category Showcase Filter, 1-Click Coupon Apply, YouTube Reel & Google Maps Store Pickup, FAQ Accordion, VIP Lead Form & Bag Drawer',
        ],
        connectedPages: [
          { label: 'Landing Page Builder', href: '/website/funnels', relation: 'Reuses storefront theme, coupons, shipping & catalog in dedicated /funnel sales campaigns' },
          { label: 'Store Orders', href: '/website/orders', relation: 'Tracks Razorpay, COD & WhatsApp orders from public /shop checkout' },
          { label: 'Visitor Insights', href: '/website/visitors', relation: 'Displays storefront & funnel conversion analytics' },
          { label: 'Inventory', href: '/inventory', relation: 'Syncs showOnWebsite products, stock & onlinePrice' },
          { label: 'Customers', href: '/customers', relation: 'Receives VIP Deal Alert opt-in leads & online buyers via syncStorefrontRelays' },
          { label: 'Offer Hub', href: '/loyalty/coupons', relation: 'Shares promotional coupon concepts & live storefront offer strip' },
        ],
        frontendStack: [
          'src/app/website/page.tsx / src/app/website/client-page.tsx',
          'src/app/website/domains/page.tsx / src/app/website/editor/[pageId]/editor-client.tsx',
          'src/components/website/add-section-dialog.tsx / section-edit-dialog.tsx / store-simulator.tsx',
          'src/app/shop/page.tsx / src/app/shop/shop-client.tsx',
          'src/lib/storefront-engine.ts / src/lib/storefront-seo.ts / src/app/sitemap.ts / src/app/robots.ts',
        ],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/websites',
            'businesses/{businessId}/products',
            'businesses/{businessId}/orders',
            'businesses/{businessId}/storefront_events',
            'businesses/{businessId}/storefront_leads',
            'businesses/{businessId}/customers',
            'businesses/{businessId}/notifications',
          ],
          apiRoutes: ['/api/payments/create-order', '/api/payments/verify'],
          serverActions: ['src/app/actions/website-actions.ts', 'src/app/actions/storefront-actions.ts'],
          aiAndExternal: [
            'Dynamic Sitemap & Schema.org JSON-LD',
            'DNS CNAME Verification (node:dns)',
            'YouTube Nocookie Embed & Google Maps Directions',
            'Meta Pixel & GA4 Telemetry',
          ],
        },
      },
      {
        id: 'landing-page-builder',
        label: 'Landing Page Builder',
        href: '/website/funnels',
        pageFile: 'src/app/website/funnels/page.tsx',
        entitlement: 'feat_store',
        howItWorks:
          'Distraction-free high-converting Sales Funnels (/funnel?slug=...&fSlug=...) create karta hai jo Storefront Manager ke theme, brand logo, coupons, shipping config, Razorpay/COD/WhatsApp checkout aur all 23 blocks (16 storefront + 7 conversion funnel sections: Problem/Solution, Us vs Others, 3-Step Process, Value Stack, 1-Click Package Tiers, Risk-Free Guarantee Seal, Inline Express Checkout + Order Bump) ko reuse karta hai.',
        pageSections: [
          '3 Pre-Built Sales Funnel Templates (Product Launch, Combo & COD, Lead Magnet & Consultation)',
          'Funnel Configuration Workspace (Goal, Target Product, Default Promo Coupon, Sticky Bottom CTA, Inherit/Override Theme & SEO)',
          'Visual Section & Layout Builder reusing AddSectionDialog, SectionEditDialog, StoreSimulator & Visual Editor (/website/editor/funnel_*)',
          'Live Public Funnel Route (/funnel): Express COD/Razorpay/WhatsApp Checkout with 1-Click Order Bump & Tier Auto-Fill',
        ],
        connectedPages: [
          { label: 'Storefront Manager', href: '/website', relation: 'Inherits store theme, logo, coupons, shipping rules & pixels' },
          { label: 'Store Orders', href: '/website/orders', relation: 'Tags every funnel checkout with funnelId & funnelSlug badges' },
          { label: 'Visitor Insights', href: '/website/visitors', relation: 'Tracks per-funnel views, checkouts, orders, leads & conversion %' },
          { label: 'Inventory', href: '/inventory', relation: 'Connects target product & Order Bump SKU stock/pricing' },
        ],
        frontendStack: [
          'src/app/website/funnels/page.tsx / src/app/website/funnels/client-page.tsx',
          'src/app/funnel/page.tsx / src/app/funnel/funnel-client.tsx',
          'src/app/website/editor/[pageId]/editor-client.tsx',
          'src/components/website/add-section-dialog.tsx / section-edit-dialog.tsx / store-simulator.tsx',
          'src/lib/storefront-engine.ts',
        ],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/websites',
            'businesses/{businessId}/products',
            'businesses/{businessId}/orders',
            'businesses/{businessId}/storefront_events',
            'businesses/{businessId}/storefront_leads',
            'businesses/{businessId}/notifications',
          ],
          apiRoutes: ['/api/payments/create-order', '/api/payments/verify'],
          serverActions: ['src/app/actions/website-actions.ts', 'src/app/actions/storefront-actions.ts'],
          aiAndExternal: [
            'Razorpay Inline Express Checkout',
            'Meta Pixel & GA4 Event Attribution',
            'WhatsApp Direct Order Relay',
          ],
        },
      },
      {
        id: 'store-orders',
        label: 'Store Orders',
        href: '/website/orders',
        pageFile: 'src/app/website/orders/page.tsx',
        entitlement: 'feat_store',
        howItWorks:
          'Public /shop storefront aur /funnel sales pages se aane wale Razorpay, COD aur WhatsApp orders ko state-machine validated transitions (paid -> processing -> shipped -> delivered) ke saath fulfill karta hai; mount par syncStorefrontRelays se relay orders/leads promote karta hai, funnelId/funnelSlug attribution badge dikhata hai, aur Razorpay refunds + unsettled stock settlement execute karta hai.',
        pageSections: [
          'Order Pipeline Filter Tabs (Paid, Processing, Shipped, Delivered, Unsettled, Refunded)',
          'Order Detail Sheet with Funnel Source Attribution, Line Items, Coupon Savings & Shipping Address',
          'Tracking / Courier Update & State-Machine Status Transitions',
          'Razorpay Refund & Manual Stock Settlement Recovery Actions',
        ],
        connectedPages: [
          { label: 'Storefront Manager', href: '/website', relation: 'Receives orders placed on /shop checkout' },
          { label: 'Landing Page Builder', href: '/website/funnels', relation: 'Attributes orders converted via /funnel campaigns' },
          { label: 'Visitor Insights', href: '/website/visitors', relation: 'Measures checkout completion vs funnel visits' },
          { label: 'Customers', href: '/customers', relation: 'Syncs online buyer profiles & order history' },
        ],
        frontendStack: ['src/app/website/orders/page.tsx', 'src/app/website/orders/client-page.tsx', 'src/lib/storefront-engine.ts'],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/orders',
            'businesses/{businessId}/products',
            'businesses/{businessId}/payments',
            'businesses/{businessId}/notifications',
          ],
          apiRoutes: ['/api/payments/create-order', '/api/payments/verify', '/api/webhook/razorpay'],
          serverActions: [
            'src/app/actions/order-actions.ts',
            'src/app/actions/payment-actions.ts',
            'src/app/actions/website-actions.ts',
          ],
          aiAndExternal: ['Razorpay Payment & Refund API'],
        },
      },
      {
        id: 'visitor-insights',
        label: 'Visitor Insights',
        href: '/website/visitors',
        pageFile: 'src/app/website/visitors/page.tsx',
        entitlement: 'feat_store',
        howItWorks:
          'Public /shop storefront aur /funnel sales pages par page views, product views, add-to-cart, begin-checkout aur purchase events (storefront_events) ko syncStorefrontRelays ke baad date range ke hisaab se visualize karta hai aur session intent score + per-funnel conversion analytics + GA4/Meta Pixel status dikhata hai.',
        pageSections: [
          'Traffic, Product Views, Add-to-Bag & Checkout Conversion Funnel KPIs',
          'Per-Funnel Sales Funnel Performance Table (Visits, Checkouts, Orders, Leads, Revenue, Conv %)',
          'Session Explorer with Mobile/Desktop Device & High-Intent Score',
          'Top Viewed Products & Conversion Drop-off Charts + GA4/Pixel Diagnostics',
        ],
        connectedPages: [
          { label: 'Storefront Manager', href: '/website', relation: 'Tracks events & Meta Pixel / GA4 config from /shop storefront' },
          { label: 'Landing Page Builder', href: '/website/funnels', relation: 'Measures per-funnel conversion metrics & lead opt-ins' },
          { label: 'Store Orders', href: '/website/orders', relation: 'Correlates checkout starts with settled storefront orders' },
        ],
        frontendStack: [
          'src/app/website/visitors/page.tsx',
          'src/app/website/visitors/client-page.tsx',
          'src/lib/storefront-engine.ts',
          'src/lib/storefront-tracking.ts',
          'Recharts',
        ],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}/storefront_events',
            'businesses/{businessId}/storefront_leads',
            'businesses/{businessId}/orders',
            'businesses/{businessId}/products',
            'businesses/{businessId}/websites',
            'businesses/{businessId}/notifications',
          ],
          apiRoutes: [],
          serverActions: ['src/app/actions/website-actions.ts', 'src/app/actions/storefront-actions.ts'],
          aiAndExternal: ['Google Analytics 4 (GA4)', 'Meta Pixel'],
        },
      },
    ],
  },
  {
    id: 'platform_footer',
    groupLabel: 'Marketplace & OS Settings',
    accessScope: 'Sidebar Footer & Add-on Discovery',
    entitlementKey: 'core',
    summary:
      'Sidebar ke bottom section ke do global utility pages: Marketplace (modules activate/upgrade karne ke liye) aur OS Settings (business configuration hub).',
    items: [
      {
        id: 'marketplace',
        label: 'Marketplace',
        href: '/marketplace',
        pageFile: 'src/app/marketplace/page.tsx',
        entitlement: 'Core (All Non-Agent Users)',
        howItWorks:
          'Sabhi optional vertical suites aur add-ons ko showcase karta hai (`/marketplace/features/[moduleId]`); business admin ya owner yahin se modules preview, 14-day free trial unlock, aur purchase confirm kar sakte hain with a 2-step confirmation modal jisse Sidebar me corresponding navigation groups instant unlock hote hain.',
        pageSections: [
          'Featured Suites & Add-ons Catalog Grid',
          'Feature Detail Preview (/marketplace/features/[moduleId])',
          'Admin Purchase & Free Trial Confirmation Modal (Secured against unauthorized staff clicks)',
          'Razorpay / Gateway Checkout & Module Activation Controls',
        ],
        connectedPages: [
          { label: 'Plans & Limits', href: '/owner/limits', relation: 'Reads live quotas, prices & catalog configured by Platform Master' },
          { label: 'Subscription Settings', href: '/settings/subscription', relation: 'Syncs activeAddonIds & plan status' },
        ],
        frontendStack: ['src/app/marketplace/page.tsx', 'features/[moduleId]/page.tsx'],
        backendStack: {
          firestoreCollections: [
            'system/config/marketplace',
            'businesses/{businessId}',
            'businesses/{businessId}/subscriptions (Pillar 1: Audit logs of module changes)',
          ],
          apiRoutes: ['/api/payments/create-order', '/api/payments/verify'],
          serverActions: [],
          aiAndExternal: ['Razorpay'],
        },
      },
      {
        id: 'os-settings',
        label: 'OS Settings',
        href: '/settings',
        pageFile: 'src/app/settings/page.tsx',
        entitlement: 'Core (Admin & Staff Profile)',
        howItWorks:
          '8-tab system configuration hub: General Profile, Master Data, Tax & GST (+ Live E-Way Bill GSP API Integration & Setup Guide), Payments (POS Payment Modes + Gateways `/settings/gateways`), Team Users, Mobile UI, Banner, aur Hardware Printer setup.',
        pageSections: [
          'GeneralTab (Business Name, Currency, Address, Pincode)',
          'MasterDataTab (Categories, Units & Defaults)',
          'TaxGstTab (GSTIN, State, Composition, Tax Slabs, HSN Registry & EWayGspConfigPanel + Admin Guide)',
          'PaymentsTab (Dynamic POS Payment Modes Dropdown source + Gateways Link)',
          'UsersTab (Staff Roles & Invites), MobileUiTab, BannerTab, HardwareTab (A4/Thermal)',
        ],
        connectedPages: [
          { label: 'Billing (POS)', href: '/billing', relation: 'Feeds paymentModes dropdown, GSTIN, state, currency & print defaults' },
          { label: 'Invoices & E-Way', href: '/invoices', relation: 'Supplies GSP API credentials & UPI details' },
          { label: 'Staff & Payroll', href: '/staff', relation: 'Shares business team accounts from UsersTab' },
        ],
        frontendStack: [
          'src/app/settings/page.tsx',
          'GeneralTab / MasterDataTab / TaxGstTab / PaymentsTab / UsersTab / HardwareTab / MobileUiTab / BannerTab',
          'src/components/eway/EWayGspConfigPanel.tsx',
        ],
        backendStack: {
          firestoreCollections: [
            'businesses/{businessId}',
            'businesses/{businessId}/paymentGatewayConfigs',
            'businesses/{businessId}/privateConfig/eway',
            'businesses/{businessId}/privateConfig/gateways',
            'users',
          ],
          apiRoutes: ['/api/eway-bill/config', '/api/webhook/razorpay'],
          serverActions: ['src/app/actions/p0-migration.ts'],
          aiAndExternal: ['NIC GSP Auth Handshake', 'Razorpay / Stripe Gateway Config'],
        },
      },
    ],
  },
];

export function filterBlueprintGroups(
  groups: BlueprintSidebarGroup[],
  selectedGroupId = 'all',
  searchTerm = ''
): BlueprintSidebarGroup[] {
  const q = searchTerm.trim().toLowerCase();

  return groups
    .filter((group) => selectedGroupId === 'all' || group.id === selectedGroupId)
    .map((group) => {
      if (!q) return group;
      const groupMatches =
        group.groupLabel.toLowerCase().includes(q) ||
        group.summary.toLowerCase().includes(q) ||
        group.entitlementKey.toLowerCase().includes(q);

      if (groupMatches) return group;

      const filteredItems = group.items.filter((item) => {
        const haystack = [
          item.label,
          item.href,
          item.pageFile,
          item.entitlement,
          item.howItWorks,
          ...item.pageSections,
          ...item.connectedPages.map((c) => `${c.label} ${c.href} ${c.relation}`),
          ...item.frontendStack,
          ...item.backendStack.firestoreCollections,
          ...item.backendStack.apiRoutes,
          ...item.backendStack.serverActions,
          ...item.backendStack.aiAndExternal,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });

      return { ...group, items: filteredItems };
    })
    .filter((group) => group.items.length > 0);
}

export function getBlueprintSummaryStats(groups: BlueprintSidebarGroup[]): BlueprintSummaryStats {
  const collections = new Set<string>();
  const apiRoutes = new Set<string>();
  const serverActions = new Set<string>();
  let totalPages = 0;

  for (const group of groups) {
    totalPages += group.items.length;
    for (const item of group.items) {
      item.backendStack.firestoreCollections.forEach((c) => collections.add(c));
      item.backendStack.apiRoutes.forEach((r) => apiRoutes.add(r));
      item.backendStack.serverActions.forEach((a) => serverActions.add(a));
    }
  }

  return {
    totalGroups: groups.length,
    totalPages,
    uniqueCollections: collections.size,
    uniqueApiRoutes: apiRoutes.size,
    uniqueServerActions: serverActions.size,
  };
}
