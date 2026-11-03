
export type Tenant = {
  id: string;
  name: string;
  gstin: string;
  address: string;
  state: string;
};

export type Product = {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  barcode: string;
  hsnCode: string;
  price: number; // Tax exclusive unit price (Offline/POS)
  onlinePrice?: number; // Online store price
  cost: number;
  stock: number;
  minThreshold: number;
  gstRate: number; // e.g., 5, 12, 18, 28
  isActive: boolean;
  unit?: string;
  categoryId?: string;
  description?: string;
  images?: string[];
  showOnWebsite?: boolean;
  vendorId?: string;
  vendorName?: string;
  batchNumber?: string;
  expiryDate?: string;
  videoUrl?: string;
  category?: string;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  discountPercent?: number;
  discountAmount?: number;
  isArchived?: boolean;
  archivedAt?: string;
  createdAt?: any;
  updatedAt?: any;
};

export type Customer = {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  state: string;
  creditBalance: number;
  city?: string;
  dob?: string;
  anniversaryDate?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  alternatePhone?: string;
  whatsappNumber?: string;
  language?: string;
  communicationMode?: 'WhatsApp' | 'SMS' | 'Email';
  lastInteraction?: string;
  openingBalance?: number;
  creditLimit?: number;
  paymentTerms?: string;
  customerType?: 'Regular' | 'VIP' | 'Wholesale' | 'Risky' | 'B2B';
  gstin?: string;
  businessName?: string;
  companyCategory?: string;
  contactPerson?: string;
  designation?: string;
  whatsappEnabled?: boolean;
  pincode?: string;
  notes?: string;
  
  // Loyalty & Membership
  membershipStatus?: 'active' | 'expired' | 'none';
  membershipPlan?: string;
  membershipExpiry?: string;
  loyaltyTier?: string;
  rewardPoints?: number;
  walletBalance?: number;
  referralCode?: string;
  referredBy?: string;
  tags?: string[];
  isVip?: boolean;

  // Preferences
  favoriteCategory?: string;
  preferredVisitTime?: string;
  specialNotes?: string;

  // Campaign Consent
  whatsappOptIn?: boolean;
  smsOptIn?: boolean;
  emailOptIn?: boolean;
  birthdayCampaign?: boolean;
  anniversaryCampaign?: boolean;

  // AI & Analytics (System Managed)
  clv?: number;
  visitFrequency?: number;
  lastVisitDate?: string;
  lastPurchaseDate?: string;
  churnRiskScore?: number;
  engagementScore?: number;
  
  // Dynamic Fields
  customFields?: Record<string, any>;
  isArchived?: boolean;
  lastOrderDate?: string;
  normalizedPhone?: string;
  createdAt: string;
  updatedAt?: any;
};

export type LeadStatus = 'new' | 'contacted' | 'interested' | 'negotiation' | 'converted' | 'lost';
export type LeadSource = 'WhatsApp' | 'Facebook' | 'Website' | 'Walk-in' | 'Referral';

export type LeadActivity = {
  id: string;
  type: 'visit' | 'click' | 'message' | 'form';
  description: string;
  timestamp: string;
  metadata?: any;
};

export type Lead = {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email?: string;
  source: LeadSource;
  status: LeadStatus;
  notes?: string;
  followUpDate?: string;
  followUpTime?: string;
  createdAt: string;
  activities?: LeadActivity[];
  intentScore?: number;
  viewedProducts?: string[];
  interest?: string;
  priority?: any;
  budget?: number;
  location?: string;
  assignedTo?: string;
};

export type Vendor = {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  city?: string;
  state: string;
  totalPurchase: number;
  paidAmount: number;
  pendingBalance: number;
  status: 'Active' | 'Inactive' | 'Pending';
  lastPurchaseDate?: string;
  notes?: string;
};

export type StaffRole = 'Sales' | 'Delivery' | 'Accountant' | 'Manager' | 'Other';
export type AttendanceStatus = 'present' | 'absent' | 'half-day';

export type StaffMember = {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  role: StaffRole;
  dailyRate: number;
  joinDate: string;
  status: 'Active' | 'Inactive';
};

export type AttendanceRecord = {
  id: string;
  staffId: string;
  date: string;
  status: AttendanceStatus;
};

export type Coupon = {
  id: string;
  code: string;
  type: 'percentage' | 'flat';
  value: number;
  minOrder: number;
  expiry: string;
  status: 'active' | 'expired';
  usageCount: number;
};

export type Offer = {
  id: string;
  title: string;
  description: string;
  type: 'combo' | 'bundle' | 'category' | 'time';
  status: 'active' | 'inactive';
};

export type InvoiceItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  lineTotal: number;
};

export type Invoice = {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  discount: number;
  grandTotal: number;
  type: 'sales' | 'purchase';
  date: string;
  dueDate: string;
  status: 'paid' | 'unpaid' | 'overdue';
  paymentMode: string;
};

export type Payment = {
  id: string;
  tenantId: string;
  partyId: string; // Customer or Vendor ID
  amount: number;
  mode: string;
  date: string;
  note?: string;
  type: 'in' | 'out'; // in for customer payment, out for vendor payment
};

export type LedgerEntry = {
  id: string;
  date: string;
  type: 'Sale' | 'Purchase' | 'Payment';
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

export type AccountingTransaction = {
  id: string;
  tenantId: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  source: string;
  mode: string;
  notes?: string;
};

export type DailySummary = {
  sales: number;
  purchases: number;
  expenses: number;
  income: number;
  net: number;
  modes: {
    cash: number;
    upi: number;
    bank: number;
  };
};

export type TaskStatus = 'pending' | 'in-progress' | 'completed';
export type TaskPriority = 'high' | 'medium' | 'low';

export type Task = {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  assignedTo?: string; // Staff ID
  assignedName?: string;
  dueDate: string;
  dueTime: string;
  priority: TaskPriority;
  status: TaskStatus;
  remindWhatsApp: boolean;
  repeat: 'none' | 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  projectId?: string; // Linked to a project
};

export type ProjectStatus = 'planning' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled';

export type Project = {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  status: ProjectStatus;
  deadline: string;
  clientId?: string; // Link to Customer or Lead ID
  clientName?: string;
  clientType: 'lead' | 'customer';
  team: string[]; // Array of Staff IDs
  createdAt: string;
};

export type AddonFeature = {
  id: string;
  name: string;
  description: string;
  price: string;
  period: string;
  icon: string;
  category: 'Intelligence' | 'Operations' | 'Store Builder' | 'Connectivity' | 'Bundles';
  isTrialAvailable: boolean;
  isActive: boolean;
  isPopular?: boolean;
};

export type FixedExpense = {
  id: string;
  tenantId: string;
  name: string;
  amount: number;
  category: 'Rent' | 'Electricity' | 'Internet' | 'Salary' | 'Subscription' | 'Insurance' | 'EMI' | 'Other';
  frequency: 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  startDate: string;
  nextDueDate: string;
  status: 'Active' | 'Paused';
  notes?: string;
};

export type LoyaltyAutomation = {
  id: string;
  type: 'birthday' | 'expiry' | 'renewal' | 'inactive' | 'first_purchase';
  isEnabled: boolean;
  triggerDays: number;
  couponId?: string;
  rewardPoints?: number;
  whatsappNotify: boolean;
};

export type Campaign = {
  id: string;
  title: string;
  segment: 'all' | 'premium' | 'inactive' | 'expiring';
  message: string;
  couponId?: string;
  status: 'scheduled' | 'sent' | 'failed';
  recipientCount: number;
  createdAt: string;
  scheduledAt?: string;
};

// Initial Mock Data
export const MOCK_TENANT_ID = 'tenant_123';

export const mockTenant: Tenant = {
  id: MOCK_TENANT_ID,
  name: 'Biztrix Global Store',
  gstin: '27AAAAA0000A1Z5',
  address: '123, Tech Plaza, Mumbai, Maharashtra',
  state: 'Maharashtra'
};

export let products: Product[] = [
  { id: 'p1', tenantId: MOCK_TENANT_ID, name: 'Wireless Mouse', sku: 'WM-001', barcode: '123456789', hsnCode: '8471', price: 1016.95, onlinePrice: 1100, cost: 800, stock: 45, minThreshold: 10, gstRate: 18, isActive: true, unit: 'pcs', showOnWebsite: true },
  { id: 'p2', tenantId: MOCK_TENANT_ID, name: 'Mechanical Keyboard', sku: 'MK-99', barcode: '987654321', hsnCode: '8471', price: 3813.56, onlinePrice: 4000, cost: 3200, stock: 12, minThreshold: 5, gstRate: 18, isActive: true, unit: 'pcs', showOnWebsite: true },
  { id: 'p3', tenantId: MOCK_TENANT_ID, name: 'USB-C Hub', sku: 'UH-05', barcode: '55667788', hsnCode: '8517', price: 1875.00, onlinePrice: 1950, cost: 1400, stock: 4, minThreshold: 10, gstRate: 12, isActive: true, unit: 'pcs', showOnWebsite: true },
  { id: 'p4', tenantId: MOCK_TENANT_ID, name: 'Monitor Stand', sku: 'MS-20', barcode: '11223344', hsnCode: '9403', price: 1339.29, onlinePrice: 1500, cost: 900, stock: 25, minThreshold: 5, gstRate: 12, isActive: true, unit: 'pcs', showOnWebsite: false },
];

export let leads: Lead[] = [
  { 
    id: 'l1', 
    tenantId: MOCK_TENANT_ID, 
    name: 'Sanjay Gupta', 
    phone: '9820012345', 
    source: 'Facebook', 
    status: 'new', 
    createdAt: '2024-03-20', 
    notes: 'Auto-captured from Facebook Ad "Gaming Gear Promo".',
    intentScore: 82,
    activities: [
      { id: 'a1', type: 'form', description: 'Submitted Facebook Lead Form', timestamp: '2024-03-20 10:30 AM' },
      { id: 'a2', type: 'visit', description: 'Visited Website from Ad', timestamp: '2024-03-20 10:35 AM' }
    ]
  },
  { 
    id: 'l2', 
    tenantId: MOCK_TENANT_ID, 
    name: 'Anita Rao', 
    phone: '9123456780', 
    source: 'Website', 
    status: 'interested', 
    createdAt: '2024-03-18', 
    intentScore: 95,
    activities: [
      { id: 'a3', type: 'visit', description: 'Viewed Wireless Mouse 4 times', timestamp: '2024-03-18 02:00 PM' },
      { id: 'a4', type: 'click', description: 'Clicked "Order on WhatsApp"', timestamp: '2024-03-18 02:15 PM' }
    ]
  },
  { id: 'l3', tenantId: MOCK_TENANT_ID, name: 'Vikram Singh', phone: '9988776600', source: 'WhatsApp', status: 'contacted', createdAt: '2024-03-15', notes: 'Inquired about bulk pricing via WhatsApp.' },
  { id: 'l4', tenantId: MOCK_TENANT_ID, name: 'Rohan Mehra', phone: '9876543211', source: 'Referral', status: 'negotiation', createdAt: '2024-03-10', notes: 'Price match requested for keyboard.' },
];

export let customers: Customer[] = [
  { id: 'c1', tenantId: MOCK_TENANT_ID, name: 'Amit Sharma', phone: '9876543210', email: 'amit@example.com', address: 'Bandra West, Mumbai', state: 'Maharashtra', creditBalance: 1200, city: 'Mumbai', lastInteraction: '2024-03-15', customerType: 'Regular', whatsappEnabled: true, createdAt: '2024-01-01' },
  { id: 'c2', tenantId: MOCK_TENANT_ID, name: 'Priya Patel', phone: '9123456789', email: 'priya@example.com', address: 'Navi Mumbai', state: 'Maharashtra', creditBalance: 0, city: 'Navi Mumbai', lastInteraction: '2024-03-18', customerType: 'VIP', whatsappEnabled: true, createdAt: '2024-01-05' },
  { id: 'c3', tenantId: MOCK_TENANT_ID, name: 'Rahul Varma', phone: '9988776655', email: 'rahul@example.com', address: 'Indiranagar, Bangalore', state: 'Karnataka', creditBalance: 5500, city: 'Bangalore', lastInteraction: '2024-03-10', customerType: 'Risky', whatsappEnabled: false, createdAt: '2024-01-10' },
];

export let vendors: Vendor[] = [
  { id: 'v1', tenantId: MOCK_TENANT_ID, name: 'Tech Solutions Hub', phone: '9876500001', email: 'sales@techhub.com', gstin: '27BBBBB1111B1Z1', address: 'Lamington Road', city: 'Mumbai', state: 'Maharashtra', totalPurchase: 150000, paidAmount: 120000, pendingBalance: 30000, status: 'Active', lastPurchaseDate: '2024-03-20' },
  { id: 'v2', tenantId: MOCK_TENANT_ID, name: 'Elite Electronics', phone: '9123400002', email: 'accounts@elite.com', gstin: '27CCCCC2222C2Z2', address: 'Electronic City', city: 'Bangalore', state: 'Karnataka', totalPurchase: 85000, paidAmount: 85000, pendingBalance: 0, status: 'Active', lastPurchaseDate: '2024-03-18' },
  { id: 'v3', tenantId: MOCK_TENANT_ID, name: 'Global Importers', phone: '9988700003', email: 'import@global.com', gstin: '27DDDDD3333D3Z3', address: 'Bandra', city: 'Mumbai', state: 'Maharashtra', totalPurchase: 250000, paidAmount: 150000, pendingBalance: 100000, status: 'Active', lastPurchaseDate: '2024-03-10' },
];

export let staffMembers: StaffMember[] = [
  { id: 's1', tenantId: MOCK_TENANT_ID, name: 'Karan Singh', phone: '9800011122', role: 'Sales', dailyRate: 500, joinDate: '2024-01-10', status: 'Active' },
  { id: 's2', tenantId: MOCK_TENANT_ID, name: 'Arjun Verma', phone: '9800011133', role: 'Delivery', dailyRate: 400, joinDate: '2024-02-15', status: 'Active' },
  { id: 's3', tenantId: MOCK_TENANT_ID, name: 'Neha Patil', phone: '9800011144', role: 'Accountant', dailyRate: 800, joinDate: '2023-11-01', status: 'Active' },
];

export let attendanceRecords: AttendanceRecord[] = [
  { id: 'at1', staffId: 's1', date: new Date().toISOString().split('T')[0], status: 'present' },
  { id: 'at2', staffId: 's2', date: new Date().toISOString().split('T')[0], status: 'half-day' },
  { id: 'at3', staffId: 's3', date: new Date().toISOString().split('T')[0], status: 'present' },
];

export let projects: Project[] = [
  { id: 'pr1', tenantId: MOCK_TENANT_ID, title: 'Wholesale Setup - Bandra Office', description: 'Complete tech infrastructure setup for new regional office.', status: 'in-progress', deadline: '2024-04-15', clientName: 'Amit Sharma', clientType: 'customer', clientId: 'c1', team: ['s1', 's3'], createdAt: '2024-03-10' },
  { id: 'pr2', tenantId: MOCK_TENANT_ID, title: 'Marketing Campaign - Summer Sale', description: 'Digital marketing and local flyer distribution.', status: 'planning', deadline: '2024-05-01', clientName: 'Anita Rao', clientType: 'lead', clientId: 'l2', team: ['s1'], createdAt: '2024-03-22' },
];

export let tasks: Task[] = [
  { id: 't1', tenantId: MOCK_TENANT_ID, title: 'Call Rahul for Udhar Collection', description: 'Pending for 15 days.', assignedTo: 's1', assignedName: 'Karan Singh', dueDate: new Date().toISOString().split('T')[0], dueTime: '10:00', priority: 'high', status: 'pending', remindWhatsApp: true, repeat: 'none', createdAt: '2024-03-20' },
  { id: 't2', tenantId: MOCK_TENANT_ID, title: 'Verify GST Invoices', assignedTo: 's3', assignedName: 'Neha Patil', dueDate: new Date().toISOString().split('T')[0], dueTime: '14:30', priority: 'medium', status: 'in-progress', remindWhatsApp: false, repeat: 'weekly', createdAt: '2024-03-21' },
  { id: 't3', tenantId: MOCK_TENANT_ID, title: 'Reorder Wireless Mouse', assignedTo: 's1', assignedName: 'Karan Singh', dueDate: '2024-03-26', dueTime: '11:00', priority: 'high', status: 'pending', remindWhatsApp: true, repeat: 'none', createdAt: '2024-03-22' },
  { id: 't4', tenantId: MOCK_TENANT_ID, title: 'Deliver Routers to Bandra', assignedTo: 's2', assignedName: 'Arjun Verma', dueDate: '2024-03-25', dueTime: '12:00', priority: 'medium', status: 'pending', remindWhatsApp: true, repeat: 'none', createdAt: '2024-03-24', projectId: 'pr1' },
  { id: 't5', tenantId: MOCK_TENANT_ID, title: 'Initial Site Survey', assignedTo: 's1', assignedName: 'Karan Singh', dueDate: '2024-03-12', dueTime: '15:00', priority: 'medium', status: 'completed', remindWhatsApp: false, repeat: 'none', createdAt: '2024-03-10', projectId: 'pr1' },
];

export let fixedExpenses: FixedExpense[] = [
  { id: 'fe1', tenantId: MOCK_TENANT_ID, name: 'Shop Rent', amount: 25000, category: 'Rent', frequency: 'Monthly', startDate: '2024-01-01', nextDueDate: '2024-04-01', status: 'Active' },
  { id: 'fe2', tenantId: MOCK_TENANT_ID, name: 'High-speed Fiber', amount: 1200, category: 'Internet', frequency: 'Monthly', startDate: '2024-01-05', nextDueDate: '2024-04-05', status: 'Active' },
  { id: 'fe3', tenantId: MOCK_TENANT_ID, name: 'Biztrix SaaS Pro', amount: 1299, category: 'Subscription', frequency: 'Monthly', startDate: '2024-01-12', nextDueDate: '2024-04-12', status: 'Active' },
];

export let coupons: Coupon[] = [
  { id: 'cp1', code: 'WELCOME10', type: 'percentage', value: 10, minOrder: 500, expiry: '2024-12-31', status: 'active', usageCount: 45 },
  { id: 'cp2', code: 'FESTIVE500', type: 'flat', value: 500, minOrder: 5000, expiry: '2024-04-15', status: 'active', usageCount: 12 },
];

export let offers: Offer[] = [
  { id: 'of1', title: 'Mouse & Pad Combo', description: 'Get 5% off when you buy a Wireless Mouse and a Mouse Pad together.', type: 'combo', status: 'active' },
  { id: 'of2', title: 'Weekend Flash Sale', description: 'Flat 15% off on all peripherals.', type: 'time', status: 'inactive' },
];

export let invoices: Invoice[] = [
  {
    id: 'BM-2024-001',
    tenantId: MOCK_TENANT_ID,
    customerId: 'c1',
    customerName: 'Amit Sharma',
    items: [{ productId: 'p1', productName: 'Wireless Mouse', quantity: 1, unitPrice: 1016.95, gstRate: 18, lineTotal: 1200 }],
    subtotal: 1016.95,
    taxTotal: 183.05,
    cgst: 91.53,
    sgst: 91.53,
    igst: 0,
    discount: 0,
    grandTotal: 1200,
    type: 'sales',
    date: new Date().toISOString(),
    dueDate: new Date().toISOString(),
    status: 'paid',
    paymentMode: 'UPI'
  }
];

export let payments: Payment[] = [];

export let purchases: Invoice[] = [];

export let accountingTransactions: AccountingTransaction[] = [];

export const addonFeatures: AddonFeature[] = [
  // BUNDLES (Revenue Structure)
  { id: 'suite_growth', name: 'Growth Suite', description: 'WhatsApp Automation, Marketing Tools & Customer Engagement.', price: '999', period: 'mo', icon: 'Zap', category: 'Bundles', isTrialAvailable: true, isActive: false, isPopular: true },
  { id: 'suite_intelligence', name: 'Intelligence Suite', description: 'AI Advisor, AI Bill Scanner & Smart Insights.', price: '1499', period: 'mo', icon: 'Bot', category: 'Bundles', isTrialAvailable: true, isActive: false },
  { id: 'suite_backoffice', name: 'Back Office Pro', description: 'Accounting, Staff Management, Project & Task Suite.', price: '1299', period: 'mo', icon: 'Briefcase', category: 'Bundles', isTrialAvailable: true, isActive: false },
  
  // INDIVIDUAL ADD-ONS (Upsell Engine)
  { id: 'feat_whatsapp', name: 'WhatsApp Automation', description: 'Automated follow-ups & official API sequences.', price: '499', period: 'mo', icon: 'SmartphoneNfc', category: 'Intelligence', isTrialAvailable: true, isActive: false },
  { id: 'feat_intelligence', name: 'AI Advisor Pro', description: 'Deep business analytics and growth math.', price: '399', period: 'mo', icon: 'Lightbulb', category: 'Intelligence', isTrialAvailable: true, isActive: false },
  { id: 'feat_projects', name: 'Project Suite', description: 'Manage milestones & scaling controls.', price: '399', period: 'mo', icon: 'Layers', category: 'Operations', isTrialAvailable: true, isActive: false },
  { id: 'feat_accounting', name: 'Accounting Pro', description: 'Complete P&L & financial reconciliation.', price: '599', period: 'mo', icon: 'Wallet', category: 'Operations', isTrialAvailable: true, isActive: false },
  { id: 'feat_payments', name: 'Payment Approvals', description: 'Multi-level payment request & approval workflow.', price: '349', period: 'mo', icon: 'Handshake', category: 'Operations', isTrialAvailable: true, isActive: false },
  { id: 'feat_staff', name: 'Staff Management', description: 'Payroll & biometric tracking.', price: '299', period: 'mo', icon: 'Users2', category: 'Operations', isTrialAvailable: true, isActive: false },
  { id: 'feat_store', name: 'Store Builder', description: 'Full online storefront with custom domain.', price: '799', period: 'mo', icon: 'ShoppingBag', category: 'Store Builder', isTrialAvailable: true, isActive: false },
];

/**
 * Mutation helper for subscription updates.
 */
export const updateAddonActivity = (id: string, isActive: boolean) => {
  const feature = addonFeatures.find(f => f.id === id);
  if (feature) {
    feature.isActive = isActive;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('biztrix-subscription-update'));
    }
  }
};

/**
 * Helper to generate business prefix for invoices
 */
const generateBusinessPrefix = (businessName: string): string => {
  const words = businessName.trim().split(/\s+/);
  if (words.length > 1) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return businessName.substring(0, 2).toUpperCase();
};

/**
 * CORE BUSINESS LOGIC: Invoice Processing
 */
export type CreateInvoiceInput = {
  customerId: string;
  items: { productId: string; quantity: number; price: number; gstRate: number }[];
  discount: number;
  paymentReceived: number;
  paymentMode: string;
  isInterState: boolean;
};

export const processNewInvoice = (input: CreateInvoiceInput) => {
  // Gracefully handle dynamic customers from Firestore
  const customer = customers.find(c => c.id === input.customerId) || { name: 'Customer', state: mockTenant.state, id: input.customerId, creditBalance: 0 };
  
  let subtotal = 0;
  let taxTotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  const invoiceItems: InvoiceItem[] = input.items.map(item => {
    const product = products.find(p => p.id === item.productId) || { name: 'Item', stock: 999 };
    
    const lineAmount = item.price * item.quantity;
    const gstData = calculateGST(lineAmount, item.gstRate, input.isInterState);

    subtotal += lineAmount;
    taxTotal += gstData.gstAmount;
    cgst += gstData.cgst;
    sgst += gstData.sgst;
    igst += gstData.igst;

    return {
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      unitPrice: item.price,
      gstRate: item.gstRate,
      lineTotal: gstData.lineTotal
    };
  });

  const grandTotal = subtotal + taxTotal - input.discount;
  
  // NEW SERIAL-BASED INVOICE ID GENERATION
  const prefix = generateBusinessPrefix(mockTenant.name);
  const tenantSalesInvoices = invoices.filter(inv => inv.tenantId === MOCK_TENANT_ID && inv.type === 'sales');
  const nextSerial = tenantSalesInvoices.length + 1;
  const invoiceId = `${prefix}-${String(nextSerial).padStart(4, '0')}`;

  const newInvoice: Invoice = {
    id: invoiceId,
    tenantId: MOCK_TENANT_ID,
    customerId: input.customerId,
    customerName: customer.name,
    items: invoiceItems,
    subtotal,
    taxTotal,
    cgst,
    sgst,
    igst,
    discount: input.discount,
    grandTotal,
    type: 'sales',
    date: new Date().toISOString(),
    dueDate: new Date().toISOString(),
    status: input.paymentReceived >= grandTotal ? 'paid' : 'unpaid',
    paymentMode: input.paymentMode
  };

  invoices.push(newInvoice);

  return { invoiceId, grandTotal, status: newInvoice.status };
};

/**
 * Indian GST Calculation Logic
 * Supports both Forward (Exclusive) and Backward (Inclusive) modes.
 */
export const calculateGST = (amount: number, gstRate: number, isInterState: boolean, mode: 'inclusive' | 'exclusive' = 'exclusive') => {
  let baseAmount, gstAmount;
  
  if (mode === 'inclusive') {
    // Reverse calculation: Total / (1 + Rate%)
    baseAmount = amount / (1 + (gstRate / 100));
    gstAmount = amount - baseAmount;
  } else {
    // Forward calculation: Base * Rate%
    baseAmount = amount;
    gstAmount = amount * (gstRate / 100);
  }

  const lineTotal = baseAmount + gstAmount;

  if (isInterState) {
    return {
      baseAmount: Number(baseAmount.toFixed(2)),
      gstAmount: Number(gstAmount.toFixed(2)),
      igst: Number(gstAmount.toFixed(2)),
      cgst: 0,
      sgst: 0,
      lineTotal: Number(lineTotal.toFixed(2)),
    };
  } else {
    const split = gstAmount / 2;
    return {
      baseAmount: Number(baseAmount.toFixed(2)),
      gstAmount: Number(gstAmount.toFixed(2)),
      igst: 0,
      cgst: Number(split.toFixed(2)),
      sgst: Number(split.toFixed(2)),
      lineTotal: Number(lineTotal.toFixed(2)),
    };
  }
};

export const getDashboardStats = () => {
  const today = new Date().toISOString().split('T')[0];
  const todaySales = invoices
    .filter(inv => inv.type === 'sales' && inv.date.startsWith(today))
    .reduce((sum, inv) => sum + inv.grandTotal, 0);
  
  const totalSales = invoices
    .filter(inv => inv.type === 'sales')
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  const lowStockCount = products.filter(p => p.stock <= p.minThreshold).length;
  const totalCredit = customers.reduce((sum, c) => sum + c.creditBalance, 0);

  return { todaySales, totalSales, lowStockCount, totalCredit };
};

export const getPeriodSummary = (startDateStr: string, endDateString?: string): DailySummary => {
  const start = new Date(startDateStr).setHours(0,0,0,0);
  const end = endDateString ? new Date(endDateString).setHours(23,59,59,999) : new Date(startDateStr).setHours(23,59,59,999);

  const isWithin = (dateStr: string) => {
    const t = new Date(dateStr).getTime();
    return t >= start && t <= end;
  };

  const currentInvoices = invoices.filter(inv => inv.type === 'sales' && isWithin(inv.date));
  const sales = currentInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);

  // Simplified mode breakdown
  const modes = { cash: 0, upi: 0, bank: 0 };
  currentInvoices.forEach(inv => {
    const m = inv.paymentMode?.toLowerCase();
    if (m === 'cash') modes.cash += inv.grandTotal;
    else if (m === 'upi') modes.upi += inv.grandTotal;
    else modes.bank += inv.grandTotal;
  });

  return {
    sales,
    purchases: 0,
    expenses: 0,
    income: 0,
    net: sales,
    modes
  };
};

export const getDailySummary = (dateString: string): DailySummary => {
  return getPeriodSummary(dateString);
};

export const getLedger = (partyId: string, tenantId: string): LedgerEntry[] => {
  const entries: any[] = [];

  invoices
    .filter(inv => inv.customerId === partyId && inv.tenantId === tenantId)
    .forEach(inv => {
      entries.push({
        id: inv.id,
        date: inv.date,
        type: 'Sale',
        description: `Invoice ${inv.id}`,
        debit: inv.grandTotal,
        credit: 0
      });
    });

  payments
    .filter(pay => pay.partyId === partyId && pay.tenantId === tenantId)
    .forEach(pay => {
      entries.push({
        id: pay.id,
        date: pay.date,
        type: 'Payment',
        description: `Payment via ${pay.mode.toUpperCase()}`,
        debit: 0,
        credit: pay.amount
      });
    });

  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let currentBalance = 0;
  const ledger: LedgerEntry[] = entries.map(entry => {
    currentBalance = currentBalance + entry.debit - entry.credit;
    return { ...entry, balance: currentBalance };
  });

  return ledger.reverse();
};
