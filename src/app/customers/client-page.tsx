"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone,
  MessageSquare,
  MapPin, 
  Loader2, 
  Plus, 
  Trash2, 
  Edit2, 
  BadgeCheck,
  SmartphoneNfc,
  Check,
  History,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowRight,
  Bot,
  Zap,
  Gem,
  Star,
  BrainCircuit,
  Calendar,
  Mail,
  User,
  Heart,
  Smartphone,
  Globe,
  Tag,
  Building,
  CreditCard,
  PlusCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Receipt,
  ShieldAlert,
  Save,
  Hash,
  Gift,
  ShoppingBag,
  DollarSign,
  Filter,
  ArrowUpDown,
  SlidersHorizontal,
  Archive,
  RotateCcw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Download,
  Upload,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Customer } from "@/lib/mock-db";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol, normalizePhoneNumber } from "@/lib/utils";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useUser, 
  useDoc,
  commitBatchNonBlocking
} from "@/firebase";
import { collection, doc, query, limit, orderBy, writeBatch, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { format } from "date-fns";
import { analyzeLoyalty, LoyaltyIntelligenceOutput } from "@/ai/flows/loyalty-intelligence-flow";
import { CustomerImportDialog } from "./components/CustomerImportDialog";
import {
  exportCustomersToExcel,
  exportCustomersToCsv,
  CustomerImportRow,
} from "@/lib/customer-import-export";
import { 
  saveCustomer, 
  updateCustomerNotes, 
  deleteCustomer, 
  fetchCustomerDetailsAndOrders
} from "@/app/actions/customer-actions";
import { useMarketplaceCatalog } from "@/hooks/use-marketplace-catalog";
import { evaluateCoreQuota } from "@/lib/marketplace-catalog";
import { CoreQuotaBanner } from "@/components/quota-upgrade-banner";
import { isStaffAdminRole, resolveEffectivePermission } from "@/lib/staff-payroll";
import { PageHeader, KpiStatCard, SectionCard } from "@/components/ui/editorial";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Chandigarh"
];

const CUSTOMER_TYPES = ["Regular", "VIP", "Wholesale", "Risky", "B2B"];

export function normalizeOrderAmount(ord: any): number {
  if (!ord) return 0;
  if (typeof ord.finalAmount === "number" && ord.finalAmount > 0) return ord.finalAmount;
  if (typeof ord.amountInRupees === "number" && ord.amountInRupees > 0) return ord.amountInRupees;

  const raw = typeof ord.amount === "number" ? ord.amount : parseFloat(String(ord.amount || 0));
  if (isNaN(raw) || raw <= 0) return 0;

  // Razorpay membership or gateway orders where amount was recorded in paise
  const isPaiseOrder = 
    Boolean(ord.tierId) || 
    ord.unit === "paise" || 
    (typeof ord.id === "string" && ord.id.startsWith("order_")) ||
    (typeof ord.razorpayOrderId === "string" && ord.razorpayOrderId === ord.id) ||
    Boolean(ord.amountInPaise && Math.abs(ord.amountInPaise - raw) < 0.01);

  if (isPaiseOrder) {
    return raw / 100;
  }

  // Fallback for online payments recorded in paise without item breakdown
  if (ord.razorpayPaymentId && raw > 1000 && !Array.isArray(ord.items) && !ord.subtotal) {
    return raw / 100;
  }

  return raw;
}

export default function CustomersPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);

  const businessId = userProfile?.businessId;
  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const { limits } = useMarketplaceCatalog();
  const currencySymbol = getCurrencySymbol(business?.currency);

  // Safe bounded collection read for Customers (limit 200)
  const customersQuery = useMemoFirebase(() => 
    businessId ? query(
      collection(firestore, 'businesses', businessId, 'customers'),
      limit(200)
    ) : null, 
    [firestore, businessId]
  );
  const { data: rawCustomers, isLoading: isCustomersLoading } = useCollection<Customer>(customersQuery);
  const customerList = useMemo(() => (Array.isArray(rawCustomers) ? rawCustomers : []), [rawCustomers]);

  const customerQuota = useMemo(
    () => evaluateCoreQuota("customers", customerList.length, { limits, business }),
    [customerList.length, limits, business]
  );

  // Safe bounded collection read for Orders to compute live customer statistics (limit 250)
  const ordersQuery = useMemoFirebase(() => 
    businessId ? query(
      collection(firestore, 'businesses', businessId, 'orders'),
      limit(250)
    ) : null,
    [firestore, businessId]
  );
  const { data: rawOrders } = useCollection<any>(ordersQuery);
  const ordersList = useMemo(() => (Array.isArray(rawOrders) ? rawOrders : []), [rawOrders]);

  // Map orders by customerId and normalized phone for fast metrics lookups
  const ordersByCustomer = useMemo(() => {
    const map = new Map<string, { totalOrders: number; paidOrders: number; totalSpent: number; lastOrderDate: string | null }>();

    ordersList.forEach(ord => {
      const cId = ord.customerId;
      const phone = ord.customerData?.phone;
      const cleanPhone = phone ? normalizePhoneNumber(phone) : null;
      const status = ord.status || 'created';
      const amt = normalizeOrderAmount(ord);
      const dateStr = ord.createdAt?.toDate ? ord.createdAt.toDate().toISOString() : ord.createdAt;

      // Check if order counts as paid revenue
      const isPaid = ['paid', 'processing', 'shipped', 'delivered'].includes(status);

      const updateKey = (key: string) => {
        const existing = map.get(key) || { totalOrders: 0, paidOrders: 0, totalSpent: 0, lastOrderDate: null };
        existing.totalOrders += 1;
        if (isPaid) {
          existing.paidOrders += 1;
          existing.totalSpent += amt;
        }
        if (!existing.lastOrderDate || (dateStr && new Date(dateStr) > new Date(existing.lastOrderDate))) {
          existing.lastOrderDate = dateStr;
        }
        map.set(key, existing);
      };

      if (cId) updateKey(cId);
      if (cleanPhone) updateKey(`phone_${cleanPhone}`);
    });

    return map;
  }, [ordersList]);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("all");
  const [spendingFilter, setSpendingFilter] = useState("all"); // 'all' | 'spenders' | 'high' (>= 5000)
  const [ordersFilter, setOrdersFilter] = useState("all"); // 'all' | 'repeat' (>=2) | 'one_time' (1) | 'no_orders' (0)
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'archived'
  const [sortBy, setSortBy] = useState("recent"); // 'recent' | 'name' | 'orders_high' | 'spending_high'
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  // OS Role Manager Permission Check ("Customer & Vendor Directories" module)
  const userRole = (userProfile?.role || "staff").trim().toLowerCase();
  const isPlatformOwner = user?.email?.toLowerCase() === "skillmatrix24@gmail.com" || user?.email?.toLowerCase() === "gw7infra@gmail.com";
  const isBusinessOwner = Boolean(business?.ownerId && business.ownerId === user?.uid);
  const isStaffAdmin = isStaffAdminRole(userProfile?.role, user?.email);

  const canEditCustomers = useMemo(() => {
    if (isPlatformOwner || isBusinessOwner || isStaffAdmin) return true;
    return resolveEffectivePermission(
      business?.rbacMatrix,
      "Customer & Vendor Directories",
      userRole
    );
  }, [isPlatformOwner, isBusinessOwner, isStaffAdmin, business?.rbacMatrix, userRole]);

  // Drawer & Modal States
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);
  
  // Detailed Customer Profile Drawer Data
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [customerStats, setCustomerStats] = useState<any>(null);
  const [isLoadingProfileDetails, setIsLoadingProfileDetails] = useState(false);
  const [customerNotes, setCustomerNotes] = useState("");
  const [isSavingNotes, startNotesTransition] = useTransition();

  // AI Loyalty Intelligence
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<LoyaltyIntelligenceOutput | null>(null);

  // Add/Edit Form State
  const [activeFormTab, setActiveFormTab] = useState("basic");
  const [isSubmittingForm, startFormTransition] = useTransition();
  const [customerFormData, setCustomerFormData] = useState<any>({
    name: "",
    phone: "",
    email: "",
    businessName: "",
    customerType: "Regular",
    address: "",
    state: "Maharashtra",
    gstin: "",
    openingBalance: 0,
    dob: "",
    gender: "Prefer not to say",
    whatsappNumber: "",
    language: "English",
    communicationMode: "WhatsApp",
    notes: "",
    loyaltyTier: "Standard",
    rewardPoints: 0,
    walletBalance: 0
  });

  // Calculate Customer Metrics helper for a customer item
  const getCustomerMetrics = (c: Customer) => {
    const cleanPhone = c.phone ? normalizePhoneNumber(c.phone) : null;
    const byId = ordersByCustomer.get(c.id);
    const byPhone = cleanPhone ? ordersByCustomer.get(`phone_${cleanPhone}`) : null;

    const totalOrders = Math.max(byId?.totalOrders || 0, byPhone?.totalOrders || 0);
    const paidOrders = Math.max(byId?.paidOrders || 0, byPhone?.paidOrders || 0);
    const totalSpent = Math.max(byId?.totalSpent || 0, byPhone?.totalSpent || 0);
    const lastOrderDate = byId?.lastOrderDate || byPhone?.lastOrderDate || c.lastOrderDate || null;

    return { totalOrders, paidOrders, totalSpent, lastOrderDate };
  };

  // Filter & Search Logic
  const filteredCustomers = useMemo(() => {
    return customerList
      .filter(c => {
        const name = (c.name || "").toLowerCase();
        const phone = (c.phone || "").toLowerCase();
        const email = (c.email || "").toLowerCase();
        const bName = (c.businessName || "").toLowerCase();
        const term = searchTerm.toLowerCase().trim();

        // Search term
        if (term) {
          const matches = name.includes(term) || phone.includes(term) || email.includes(term) || bName.includes(term);
          if (!matches) return false;
        }

        // Classification filter
        if (classificationFilter !== "all" && c.customerType !== classificationFilter) {
          return false;
        }

        // Status filter (Active vs Archived)
        const isArchived = Boolean(c.isArchived);
        if (statusFilter === "active" && isArchived) return false;
        if (statusFilter === "archived" && !isArchived) return false;

        const metrics = getCustomerMetrics(c);

        // Spending filter
        if (spendingFilter === "spenders" && metrics.totalSpent <= 0) return false;
        if (spendingFilter === "high" && metrics.totalSpent < 5000) return false;

        // Orders count filter
        if (ordersFilter === "repeat" && metrics.totalOrders < 2) return false;
        if (ordersFilter === "one_time" && metrics.totalOrders !== 1) return false;
        if (ordersFilter === "no_orders" && metrics.totalOrders > 0) return false;

        return true;
      })
      .sort((a, b) => {
        const metricsA = getCustomerMetrics(a);
        const metricsB = getCustomerMetrics(b);

        if (sortBy === "name") {
          return (a.name || "").localeCompare(b.name || "");
        } else if (sortBy === "orders_high") {
          return metricsB.totalOrders - metricsA.totalOrders;
        } else if (sortBy === "spending_high") {
          return metricsB.totalSpent - metricsA.totalSpent;
        } else {
          // Default: recent orders or created date
          const dateA = metricsA.lastOrderDate ? new Date(metricsA.lastOrderDate).getTime() : 0;
          const dateB = metricsB.lastOrderDate ? new Date(metricsB.lastOrderDate).getTime() : 0;
          if (dateB !== dateA) return dateB - dateA;
          return (b.id || "").localeCompare(a.id || "");
        }
      });
  }, [customerList, searchTerm, classificationFilter, spendingFilter, ordersFilter, statusFilter, sortBy, ordersByCustomer]);

  // Overall Statistics Banner
  const registryStats = useMemo(() => {
    const totalCustomers = customerList.length;
    const activeCustomers = customerList.filter(c => !c.isArchived).length;
    let totalRevenueFromCustomers = 0;
    let customersWithOrders = 0;

    customerList.forEach(c => {
      const m = getCustomerMetrics(c);
      totalRevenueFromCustomers += m.totalSpent;
      if (m.totalOrders > 0) customersWithOrders++;
    });

    return { totalCustomers, activeCustomers, totalRevenueFromCustomers, customersWithOrders };
  }, [customerList, ordersByCustomer]);

  // Bounded Pagination Slice
  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  // Open Detailed Customer Slide-over Drawer
  const handleOpenDetail = async (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerNotes(c.notes || "");
    setAiResult(null);
    setIsDrawerOpen(true);
    setIsLoadingProfileDetails(true);

    if (!businessId || !user?.uid) return;

    try {
      const idToken = await user.getIdToken();
      const res = await fetchCustomerDetailsAndOrders({
        userId: user.uid,
        businessId,
        customerId: c.id,
        idToken
      });

      if (res.success) {
        setCustomerOrders(res.orders || []);
        setCustomerStats(res.stats || null);
        if (res.customer?.notes !== undefined) {
          setCustomerNotes(res.customer.notes || "");
        }
      }
    } finally {
      setIsLoadingProfileDetails(false);
    }
  };

  // AI Loyalty Analysis
  const handleAiAnalysis = async () => {
    if (!selectedCustomer) return;
    setIsAiLoading(true);
    try {
      const metrics = customerStats || getCustomerMetrics(selectedCustomer);
      const result = await analyzeLoyalty({
        customerName: selectedCustomer.name,
        stats: {
          totalSpent: metrics.totalPaidAmount || metrics.totalSpent || 5000,
          visitCount: metrics.totalOrders || 5,
          lastVisitDaysAgo: metrics.lastOrderDate ? Math.max(1, Math.round((Date.now() - new Date(metrics.lastOrderDate).getTime()) / (1000 * 3600 * 24))) : 10,
          rewardPoints: selectedCustomer.rewardPoints || 0,
          walletBalance: selectedCustomer.walletBalance || 0,
          isMember: Boolean(selectedCustomer.loyaltyTier),
          membershipTier: selectedCustomer.loyaltyTier || "Standard"
        }
      });
      setAiResult(result);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "AI Analysis Failed", description: "Could not generate behavioral summary." });
    } finally {
      setIsAiLoading(false);
    }
  };

  // Save / Update Internal Merchant Notes
  const handleSaveNotes = () => {
    if (!businessId || !selectedCustomer || !user?.uid) return;
    startNotesTransition(async () => {
      const idToken = await user.getIdToken();
      const res = await updateCustomerNotes({
        userId: user.uid,
        businessId,
        customerId: selectedCustomer.id,
        notes: customerNotes,
        idToken
      });

      if (res.success) {
        toast({ title: "Notes Saved", description: res.message });
      } else {
        toast({ variant: "destructive", title: "Failed to Save Notes", description: res.error });
      }
    });
  };

  // Save Customer (Create or Edit) via Server Action
  const handleSaveCustomer = () => {
    if (!businessId || !user?.uid) return;
    if (!canEditCustomers) {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "Aapke operational role ko Customer Directory edit karne ki permission nahi hai. OS Role Manager (Settings > Roles) me permission configure karein.",
      });
      return;
    }
    if (!customerFormData.id && customerQuota.isReached) {
      toast({
        variant: "destructive",
        title: "Customer Quota Reached",
        description: `Your plan allows up to ${customerQuota.limit} customer profiles. Activate ${customerQuota.menu.addonLabel} in Marketplace for unlimited profiles.`,
      });
      return;
    }
    if (!customerFormData.name.trim() || !customerFormData.phone.trim()) {
      toast({ variant: "destructive", title: "Form Incomplete", description: "Customer name and mobile phone number are required." });
      return;
    }

    startFormTransition(async () => {
      const idToken = await user.getIdToken();
      const res = await saveCustomer({
        userId: user.uid,
        businessId,
        idToken,
        id: customerFormData.id, // if editing
        name: customerFormData.name.trim(),
        phone: customerFormData.phone.trim(),
        email: customerFormData.email.trim(),
        businessName: customerFormData.businessName.trim(),
        customerType: customerFormData.customerType,
        address: customerFormData.address.trim(),
        state: customerFormData.state,
        gstin: customerFormData.gstin.trim(),
        openingBalance: parseFloat(String(customerFormData.openingBalance)) || 0,
        dob: customerFormData.dob || "",
        gender: customerFormData.gender || "Prefer not to say",
        whatsappNumber: customerFormData.whatsappNumber || customerFormData.phone,
        language: customerFormData.language || "English",
        communicationMode: customerFormData.communicationMode || "WhatsApp",
        loyaltyTier: customerFormData.loyaltyTier || "Standard",
        rewardPoints: parseInt(String(customerFormData.rewardPoints), 10) || 0,
        walletBalance: parseFloat(String(customerFormData.walletBalance)) || 0,
        notes: customerFormData.notes || ""
      });

      if (res.success) {
        toast({ title: "Customer Saved", description: res.message });
        setIsAddCustomerOpen(false);
        resetForm();
      } else {
        toast({ variant: "destructive", title: "Operation Failed", description: res.error });
      }
    });
  };

  const resetForm = () => {
    setCustomerFormData({
      name: "", 
      phone: "", 
      email: "", 
      businessName: "", 
      customerType: "Regular", 
      address: "", 
      state: business?.defaultState || business?.state || "Maharashtra", 
      gstin: "", 
      openingBalance: 0,
      dob: "", 
      gender: "Prefer not to say", 
      whatsappNumber: "", 
      language: "English", 
      communicationMode: "WhatsApp",
      notes: "",
      loyaltyTier: "Standard", 
      rewardPoints: 0, 
      walletBalance: 0
    });
    setActiveFormTab("basic");
  };

  const handleOpenEdit = (e: React.MouseEvent, c: any) => {
    e.stopPropagation();
    if (!canEditCustomers) {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "Aapke role ko Customer Directory edit karne ki permission nahi hai. OS Role Manager (Settings > Roles) me permission check karein.",
      });
      return;
    }
    setCustomerFormData({
      id: c.id,
      name: c.name || "",
      phone: c.phone || "",
      email: c.email || "",
      businessName: c.businessName || "",
      customerType: c.customerType || "Regular",
      address: c.address || "",
      state: c.state || business?.defaultState || "Maharashtra",
      gstin: c.gstin || "",
      openingBalance: Number(c.creditBalance ?? c.openingBalance ?? 0),
      dob: c.dob || "",
      gender: c.gender || "Prefer not to say",
      whatsappNumber: c.whatsappNumber || c.phone || "",
      language: c.language || "English",
      communicationMode: c.communicationMode || "WhatsApp",
      notes: c.notes || "",
      loyaltyTier: c.loyaltyTier || "Standard",
      rewardPoints: Number(c.rewardPoints || 0),
      walletBalance: Number(c.walletBalance || 0)
    });
    setActiveFormTab("basic");
    setIsAddCustomerOpen(true);
  };

  const openDeleteConfirm = (e: React.MouseEvent, c: any) => {
    e.stopPropagation();
    setCustomerToDelete(c);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = () => {
    if (!businessId || !customerToDelete || !user?.uid) return;
    startFormTransition(async () => {
      const idToken = await user.getIdToken();
      const res = await deleteCustomer({
        userId: user.uid,
        businessId,
        customerId: customerToDelete.id,
        idToken
      });

      if (res.success) {
        toast({ title: "Customer Processed", description: res.message });
        setIsDeleteAlertOpen(false);
        setCustomerToDelete(null);
        setIsDrawerOpen(false);
      } else {
        toast({ variant: "destructive", title: "Deletion Failed", description: res.error });
      }
    });
  };

  const remainingCustomerQuota = useMemo(() => {
    if (customerQuota.limit === null || customerQuota.limit === undefined) return null;
    return Math.max(0, customerQuota.limit - customerList.length);
  }, [customerQuota.limit, customerList.length]);

  const handleExportExcel = () => {
    const targetList = filteredCustomers.length > 0 ? filteredCustomers : customerList;
    if (targetList.length === 0) {
      toast({ title: "No Customers to Export", description: "Your customer directory is currently empty." });
      return;
    }
    exportCustomersToExcel({
      customers: targetList,
      ordersByCustomer,
      businessName: business?.name || "Biztrix",
      currencySymbol,
    });
    toast({
      title: "Excel File Exported",
      description: `Exported ${targetList.length} customer records to .xlsx file.`,
    });
  };

  const handleExportCsv = () => {
    const targetList = filteredCustomers.length > 0 ? filteredCustomers : customerList;
    if (targetList.length === 0) {
      toast({ title: "No Customers to Export", description: "Your customer directory is currently empty." });
      return;
    }
    exportCustomersToCsv({
      customers: targetList,
      ordersByCustomer,
      businessName: business?.name || "Biztrix",
      currencySymbol,
    });
    toast({
      title: "CSV File Exported",
      description: `Exported ${targetList.length} customer records to .csv file.`,
    });
  };

  const handleBatchImportCustomers = async (rows: CustomerImportRow[], updateExisting: boolean) => {
    if (!businessId || !user?.uid || rows.length === 0) return;

    let batch = writeBatch(firestore);
    let ops = 0;
    let importedCount = 0;
    let updatedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const cleanPhone = row.normalizedPhone || normalizePhoneNumber(row.phone);
      const customerId = row.existingCustomerId || `c_${cleanPhone}`;

      const docRef = doc(firestore, "businesses", businessId, "customers", customerId);

      const payload: Record<string, any> = {
        id: customerId,
        tenantId: businessId,
        businessId: businessId,
        name: row.name,
        phone: row.phone,
        normalizedPhone: cleanPhone,
        email: row.email || "",
        businessName: row.businessName || "",
        customerType: row.customerType || "Regular",
        address: row.address || "",
        state: row.state || business?.defaultState || business?.state || "Maharashtra",
        gstin: row.gstin || "",
        notes: row.notes || "",
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      };

      if (row.openingBalance !== undefined && row.openingBalance !== 0) {
        payload.creditBalance = row.openingBalance;
      }

      if (!row.isExisting) {
        payload.createdAt = serverTimestamp();
        payload.loyaltyTier = "Standard";
        payload.rewardPoints = 0;
        payload.walletBalance = 0;
        importedCount++;
      } else {
        updatedCount++;
      }

      batch.set(docRef, payload, { merge: true });
      ops++;

      if (ops >= 350) {
        await commitBatchNonBlocking(batch);
        batch = writeBatch(firestore);
        ops = 0;
      }
    }

    if (ops > 0) {
      await commitBatchNonBlocking(batch);
    }

    toast({
      title: "Customers Imported Successfully",
      description: `Imported ${importedCount} new customer profile${importedCount === 1 ? "" : "s"}${updatedCount > 0 ? ` and updated ${updatedCount} existing record${updatedCount === 1 ? "" : "s"}` : ""}.`,
    });
  };

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    );
  }

  const repeatPurchaseRate = registryStats.customersWithOrders > 0
    ? `${Math.round((customerList.filter(c => getCustomerMetrics(c).totalOrders >= 2).length / registryStats.customersWithOrders) * 100)}%`
    : "0%";

  return (
    <div className="space-y-6 pb-10 text-left">
      <CoreQuotaBanner quota={customerQuota} />

      <PageHeader
        title="Customer Registry"
        description="Profiles, order histories, and unified customer identity."
        breadcrumb="CRM & Accounts"
        icon={Users}
        actions={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* EXPORT DROPDOWN (EXCEL & CSV) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-400 hover:bg-slate-50 transition-colors"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5 text-slate-600" />
                  <span>Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl border border-slate-300 bg-white shadow-md p-1">
                <DropdownMenuItem
                  onClick={handleExportExcel}
                  className="text-xs font-medium cursor-pointer rounded-lg py-2.5 px-3 focus:bg-slate-100"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                  <span>Export to Excel (.xlsx)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportCsv}
                  className="text-xs font-medium cursor-pointer rounded-lg py-2.5 px-3 focus:bg-slate-100"
                >
                  <FileText className="mr-2 h-4 w-4 text-blue-600" />
                  <span>Export to CSV (.csv)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* IMPORT BUTTON (EXCEL & CSV) */}
            <Button
              type="button"
              variant="outline"
              disabled={!canEditCustomers}
              title={!canEditCustomers ? "Restricted by OS Role Manager (Settings > Roles)" : "Import customer list from spreadsheet"}
              onClick={() => setIsImportDialogOpen(true)}
              className="h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5 text-slate-600" />
              <span>Import Excel / CSV</span>
            </Button>

            {/* REGISTER CUSTOMER DIALOG */}
            <Dialog open={isAddCustomerOpen} onOpenChange={(o) => { setIsAddCustomerOpen(o); if(!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button 
                  disabled={!canEditCustomers || customerQuota.isReached} 
                  title={!canEditCustomers ? "Restricted by OS Role Manager (Settings > Roles)" : customerQuota.isReached ? "Customer Quota Reached" : undefined}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 h-10 px-5 font-semibold text-xs rounded-xl text-white shadow-xs disabled:opacity-50"
                >
                  <UserPlus className="mr-1.5 h-4 w-4" /> Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[680px] p-0 overflow-hidden rounded-2xl border border-slate-300 w-[95vw] sm:w-full bg-white shadow-xl">
              <DialogHeader className="p-6 bg-slate-900 text-white text-left">
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
                    {customerFormData.id ? <Edit2 className="h-5 w-5 text-white" /> : <UserPlus className="h-5 w-5 text-white" />}
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-white">
                      {customerFormData.id ? "Edit Customer Profile" : "Register Customer"}
                    </DialogTitle>
                    <DialogDescription className="text-slate-300 text-xs mt-0.5">
                      Authoritative directory with phone-based deduplication
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <Tabs value={activeFormTab} onValueChange={setActiveFormTab} className="w-full">
                <div className="px-6 py-2.5 border-b border-slate-300 bg-slate-50/80">
                  <TabsList className="grid grid-cols-4 w-full h-10 rounded-xl bg-slate-100 p-1 border border-slate-200">
                    <TabsTrigger value="basic" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">Identity</TabsTrigger>
                    <TabsTrigger value="billing" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">Address & GST</TabsTrigger>
                    <TabsTrigger value="financial" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">Financial & Loyalty</TabsTrigger>
                    <TabsTrigger value="notes" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">Notes</TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="max-h-[60vh]">
                  <div className="p-6 text-left">
                    {/* TAB 1: BASIC IDENTITY */}
                    <TabsContent value="basic" className="m-0 space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Customer Name *</Label>
                        <Input 
                          value={customerFormData.name} 
                          onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })} 
                          placeholder="e.g. Rahul Sharma" 
                          className="h-10 rounded-xl text-sm border-slate-300 shadow-xs focus-visible:ring-slate-900"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Mobile Phone *</Label>
                          <Input 
                            value={customerFormData.phone} 
                            onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })} 
                            placeholder="e.g. 9876543210" 
                            className="h-10 rounded-xl font-mono tabular-nums text-sm border-slate-300 shadow-xs focus-visible:ring-slate-900"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">WhatsApp Number</Label>
                          <Input 
                            value={customerFormData.whatsappNumber} 
                            onChange={(e) => setCustomerFormData({ ...customerFormData, whatsappNumber: e.target.value })} 
                            placeholder="e.g. 9876543210 (if different)" 
                            className="h-10 rounded-xl font-mono tabular-nums text-sm border-slate-300 shadow-xs focus-visible:ring-slate-900"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Email Address</Label>
                          <Input 
                            type="email" 
                            value={customerFormData.email} 
                            onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })} 
                            placeholder="customer@example.com" 
                            className="h-10 rounded-xl text-sm border-slate-300 shadow-xs focus-visible:ring-slate-900"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Company / Business Name</Label>
                          <Input 
                            value={customerFormData.businessName} 
                            onChange={(e) => setCustomerFormData({ ...customerFormData, businessName: e.target.value })} 
                            placeholder="Optional enterprise name" 
                            className="h-10 rounded-xl text-sm border-slate-300 shadow-xs focus-visible:ring-slate-900"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Classification</Label>
                          <Select 
                            value={customerFormData.customerType} 
                            onValueChange={(val: any) => setCustomerFormData({ ...customerFormData, customerType: val })}
                          >
                            <SelectTrigger className="h-10 rounded-xl bg-white border-slate-300 shadow-xs text-xs font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-300 shadow-md">
                              {CUSTOMER_TYPES.map(t => (
                                <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Date of Birth</Label>
                          <Input 
                            type="date"
                            value={customerFormData.dob} 
                            onChange={(e) => setCustomerFormData({ ...customerFormData, dob: e.target.value })} 
                            className="h-10 rounded-xl text-xs font-mono border-slate-300 shadow-xs focus-visible:ring-slate-900"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Gender</Label>
                          <Select 
                            value={customerFormData.gender} 
                            onValueChange={(val: any) => setCustomerFormData({ ...customerFormData, gender: val })}
                          >
                            <SelectTrigger className="h-10 rounded-xl bg-white border-slate-300 shadow-xs text-xs font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-300 shadow-md">
                              <SelectItem value="Prefer not to say" className="text-xs">Prefer not to say</SelectItem>
                              <SelectItem value="Male" className="text-xs">Male</SelectItem>
                              <SelectItem value="Female" className="text-xs">Female</SelectItem>
                              <SelectItem value="Other" className="text-xs">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </TabsContent>

                    {/* TAB 2: ADDRESS & GST */}
                    <TabsContent value="billing" className="m-0 space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Delivery / Billing Address</Label>
                        <Textarea 
                          value={customerFormData.address} 
                          onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })} 
                          placeholder="Complete street address, shop/flat number, landmark, locality, pincode..." 
                          className="min-h-[90px] rounded-xl border-slate-300 shadow-xs text-xs leading-relaxed focus-visible:ring-slate-900"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">State</Label>
                          <Select 
                            value={customerFormData.state} 
                            onValueChange={(val) => setCustomerFormData({ ...customerFormData, state: val })}
                          >
                            <SelectTrigger className="h-10 rounded-xl bg-white border-slate-300 shadow-xs text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-300 shadow-md max-h-60">
                              {INDIAN_STATES.map(st => (
                                <SelectItem key={st} value={st} className="text-xs">{st}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">GSTIN Number</Label>
                          <Input 
                            value={customerFormData.gstin} 
                            onChange={(e) => setCustomerFormData({ ...customerFormData, gstin: e.target.value.toUpperCase() })} 
                            placeholder="e.g. 27AABCU9603R1ZN" 
                            className="h-10 rounded-xl font-mono text-xs uppercase border-slate-300 shadow-xs focus-visible:ring-slate-900"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    {/* TAB 3: FINANCIAL & LOYALTY */}
                    <TabsContent value="financial" className="m-0 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">
                            Outstanding Credit Balance / Udhaar ({currencySymbol})
                          </Label>
                          <Input 
                            type="number"
                            step="0.01"
                            value={customerFormData.openingBalance} 
                            onChange={(e) => setCustomerFormData({ ...customerFormData, openingBalance: e.target.value })} 
                            placeholder="0.00" 
                            className="h-10 rounded-xl font-mono tabular-nums text-sm border-slate-300 shadow-xs focus-visible:ring-slate-900"
                          />
                          <p className="text-[11px] text-slate-500">
                            Positive amount indicates customer pending dues (Udhaar).
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Loyalty Membership Tier</Label>
                          <Select 
                            value={customerFormData.loyaltyTier} 
                            onValueChange={(val) => setCustomerFormData({ ...customerFormData, loyaltyTier: val })}
                          >
                            <SelectTrigger className="h-10 rounded-xl bg-white border-slate-300 shadow-xs text-xs font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-300 shadow-md">
                              <SelectItem value="Standard" className="text-xs font-medium">Standard</SelectItem>
                              <SelectItem value="Bronze" className="text-xs font-medium">Bronze</SelectItem>
                              <SelectItem value="Silver" className="text-xs font-medium">Silver</SelectItem>
                              <SelectItem value="Gold" className="text-xs font-medium">Gold</SelectItem>
                              <SelectItem value="Platinum" className="text-xs font-medium">Platinum</SelectItem>
                              <SelectItem value="VIP" className="text-xs font-medium">VIP Exclusive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Reward Points</Label>
                          <Input 
                            type="number"
                            step="1"
                            value={customerFormData.rewardPoints} 
                            onChange={(e) => setCustomerFormData({ ...customerFormData, rewardPoints: e.target.value })} 
                            placeholder="0" 
                            className="h-10 rounded-xl font-mono tabular-nums text-sm border-slate-300 shadow-xs focus-visible:ring-slate-900"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Store Wallet Balance ({currencySymbol})</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            value={customerFormData.walletBalance} 
                            onChange={(e) => setCustomerFormData({ ...customerFormData, walletBalance: e.target.value })} 
                            placeholder="0.00" 
                            className="h-10 rounded-xl font-mono tabular-nums text-sm border-slate-300 shadow-xs focus-visible:ring-slate-900"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Communication Mode</Label>
                          <Select 
                            value={customerFormData.communicationMode} 
                            onValueChange={(val) => setCustomerFormData({ ...customerFormData, communicationMode: val })}
                          >
                            <SelectTrigger className="h-10 rounded-xl bg-white border-slate-300 shadow-xs text-xs font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-300 shadow-md">
                              <SelectItem value="WhatsApp" className="text-xs">WhatsApp</SelectItem>
                              <SelectItem value="SMS" className="text-xs">SMS</SelectItem>
                              <SelectItem value="Email" className="text-xs">Email</SelectItem>
                              <SelectItem value="Phone Call" className="text-xs">Phone Call</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Preferred Language</Label>
                          <Select 
                            value={customerFormData.language} 
                            onValueChange={(val) => setCustomerFormData({ ...customerFormData, language: val })}
                          >
                            <SelectTrigger className="h-10 rounded-xl bg-white border-slate-300 shadow-xs text-xs font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-300 shadow-md">
                              <SelectItem value="English" className="text-xs">English</SelectItem>
                              <SelectItem value="Hindi" className="text-xs">Hindi</SelectItem>
                              <SelectItem value="Marathi" className="text-xs">Marathi</SelectItem>
                              <SelectItem value="Gujarati" className="text-xs">Gujarati</SelectItem>
                              <SelectItem value="Bengali" className="text-xs">Bengali</SelectItem>
                              <SelectItem value="Tamil" className="text-xs">Tamil</SelectItem>
                              <SelectItem value="Telugu" className="text-xs">Telugu</SelectItem>
                              <SelectItem value="Kannada" className="text-xs">Kannada</SelectItem>
                              <SelectItem value="Other" className="text-xs">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </TabsContent>

                    {/* TAB 4: INTERNAL NOTES */}
                    <TabsContent value="notes" className="m-0 space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Internal Merchant Notes</Label>
                        <Textarea 
                          value={customerFormData.notes} 
                          onChange={(e) => setCustomerFormData({ ...customerFormData, notes: e.target.value })} 
                          placeholder="Private notes about customer preferences, VIP requirements, special terms, credit agreements..." 
                          className="min-h-[130px] rounded-xl border-slate-300 shadow-xs text-xs leading-relaxed focus-visible:ring-slate-900"
                        />
                        <p className="text-xs text-slate-500">
                          Private to your team and never exposed on the storefront or to the customer.
                        </p>
                      </div>
                    </TabsContent>
                  </div>
                </ScrollArea>
              </Tabs>

              <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200">
                <Button 
                  onClick={handleSaveCustomer} 
                  disabled={isSubmittingForm}
                  className="w-full h-11 bg-primary font-semibold text-xs rounded-xl text-white"
                >
                  {isSubmittingForm ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  {customerFormData.id ? "Save Customer Profile" : "Register New Customer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
      />

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiStatCard
          label="Total Registered"
          value={registryStats.totalCustomers}
          subtext={`${registryStats.activeCustomers} active in directory`}
          icon={Users}
        />
        <KpiStatCard
          label="Purchasing Customers"
          value={registryStats.customersWithOrders}
          subtext="Placed at least 1 order"
          tone="positive"
          icon={ShoppingBag}
        />
        <KpiStatCard
          label="Repeat Purchase Rate"
          value={repeatPurchaseRate}
          subtext="Customers with 2+ orders"
          icon={History}
        />
        <KpiStatCard
          label="Customer Paid Revenue"
          value={`${currencySymbol}${registryStats.totalRevenueFromCustomers.toLocaleString()}`}
          subtext="Verified settled payments"
          tone="dark"
          icon={CreditCard}
        />
      </div>

      {/* Main Customers Table Card */}
      <SectionCard bodyClassName="p-0">
        {/* Filters Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-300 bg-slate-50/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Search */}
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search name, phone, email, business..."
                className="h-10 pl-10 text-xs sm:text-sm bg-white border-slate-300 shadow-xs rounded-xl w-full focus-visible:ring-1 focus-visible:ring-slate-900"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>

            {/* Classification Filter */}
            <div className="lg:col-span-2">
              <Select value={classificationFilter} onValueChange={(v) => { setClassificationFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-10 w-full rounded-xl bg-white border-slate-300 shadow-xs text-xs font-medium text-slate-700">
                  <SelectValue placeholder="Classification" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-300 shadow-md">
                  <SelectItem value="all" className="text-xs font-medium">All types</SelectItem>
                  {CUSTOMER_TYPES.map(t => (
                    <SelectItem key={t} value={t} className="text-xs font-medium">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Spending Filter */}
            <div className="lg:col-span-2">
              <Select value={spendingFilter} onValueChange={(v) => { setSpendingFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-10 w-full rounded-xl bg-white border-slate-300 shadow-xs text-xs font-medium text-slate-700">
                  <SelectValue placeholder="Spending" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-300 shadow-md">
                  <SelectItem value="all" className="text-xs font-medium">All spending</SelectItem>
                  <SelectItem value="spenders" className="text-xs font-medium text-emerald-700">With purchases</SelectItem>
                  <SelectItem value="high" className="text-xs font-medium text-slate-900">High spenders ({currencySymbol}5K+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Orders Count Filter */}
            <div className="lg:col-span-2">
              <Select value={ordersFilter} onValueChange={(v) => { setOrdersFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-10 w-full rounded-xl bg-white border-slate-300 shadow-xs text-xs font-medium text-slate-700">
                  <SelectValue placeholder="Orders" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-300 shadow-md">
                  <SelectItem value="all" className="text-xs font-medium">All order counts</SelectItem>
                  <SelectItem value="repeat" className="text-xs font-medium text-indigo-700">Repeat buyers (2+)</SelectItem>
                  <SelectItem value="one_time" className="text-xs font-medium">One-time (1)</SelectItem>
                  <SelectItem value="no_orders" className="text-xs font-medium text-slate-500">No orders (0)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Filter */}
            <div className="lg:col-span-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 w-full rounded-xl bg-white border-slate-300 shadow-xs text-xs font-medium text-slate-700">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-300 shadow-md">
                  <SelectItem value="recent" className="text-xs font-medium">Recent activity</SelectItem>
                  <SelectItem value="name" className="text-xs font-medium">Name (A–Z)</SelectItem>
                  <SelectItem value="orders_high" className="text-xs font-medium">Orders (High to low)</SelectItem>
                  <SelectItem value="spending_high" className="text-xs font-medium">Spending (High to low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-slate-50/80 border-b border-slate-200 hover:bg-slate-50/80">
                <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">Customer</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">Contact</TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">Classification</TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">Orders</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-600 h-11">Total spending</TableHead>
                <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isCustomersLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-44 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
                    <span className="text-xs font-medium text-slate-500">
                      Loading customer directory...
                    </span>
                  </TableCell>
                </TableRow>
              ) : paginatedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-44 text-center text-slate-500 text-sm">
                    No customers found matching your filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((customer) => {
                  const metrics = getCustomerMetrics(customer);
                  const isArchived = Boolean(customer.isArchived);

                  return (
                    <TableRow
                      key={customer.id}
                      className={cn(
                        "hover:bg-slate-50/80 cursor-pointer group transition-colors border-b border-slate-100",
                        isArchived && "opacity-60 bg-slate-50/50"
                      )}
                      onClick={() => handleOpenDetail(customer)}
                    >
                      {/* Name & ID */}
                      <TableCell className="pl-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold text-sm shrink-0">
                            {customer.name?.charAt(0).toUpperCase() || "C"}
                          </div>
                          <div className="flex flex-col text-left min-w-0">
                            <span className="font-semibold text-slate-900 text-sm group-hover:text-slate-950 transition-colors truncate">
                              {customer.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                              {customer.businessName && (
                                <span className="truncate max-w-[160px]">
                                  {customer.businessName} •
                                </span>
                              )}
                              <span className="font-mono tabular-nums text-[11px] text-slate-400">
                                #{customer.id.slice(-8).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Contact */}
                      <TableCell className="text-left">
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-mono tabular-nums font-medium text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
                            <Phone className="h-3 w-3 text-slate-400" /> {customer.phone}
                          </span>
                          {customer.email && (
                            <span className="text-xs text-slate-500 flex items-center gap-1 truncate max-w-[200px] mt-0.5">
                              <Mail className="h-3 w-3 text-slate-400 shrink-0" /> {customer.email}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Classification Badge */}
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border",
                            customer.customerType === 'VIP' ? "bg-amber-50 text-amber-800 border-amber-200" :
                            customer.customerType === 'Wholesale' ? "bg-indigo-50 text-indigo-800 border-indigo-200" :
                            customer.customerType === 'B2B' ? "bg-purple-50 text-purple-800 border-purple-200" :
                            "bg-slate-100 text-slate-700 border-slate-200"
                          )}
                        >
                          {customer.customerType || 'Regular'}
                        </span>
                      </TableCell>

                      {/* Orders Count */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className={cn("text-xs font-semibold tabular-nums", metrics.totalOrders > 0 ? "text-slate-900" : "text-slate-400")}>
                            {metrics.totalOrders} {metrics.totalOrders === 1 ? 'order' : 'orders'}
                          </span>
                          {metrics.lastOrderDate && (
                            <span className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                              {format(new Date(metrics.lastOrderDate), 'dd MMM yyyy')}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Total Spending */}
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className={cn("font-mono tabular-nums font-semibold text-sm", metrics.totalSpent > 0 ? "text-emerald-700" : "text-slate-500")}>
                            {currencySymbol}{metrics.totalSpent.toLocaleString("en-IN", { minimumFractionDigits: metrics.totalSpent % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}
                          </span>
                          {metrics.paidOrders > 0 && (
                            <span className="text-[11px] text-slate-500 tabular-nums">
                              {metrics.paidOrders} settled
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!canEditCustomers}
                            className="h-8 w-8 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            title={canEditCustomers ? "Edit Customer" : "Restricted by OS Role Manager (Settings > Roles)"}
                            aria-label={`Edit customer ${customer.name}`}
                            onClick={(e) => handleOpenEdit(e, customer)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!canEditCustomers}
                            className="h-8 w-8 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            title={canEditCustomers ? "Delete / Archive Customer" : "Restricted by OS Role Manager (Settings > Roles)"}
                            aria-label={`Remove customer ${customer.name}`}
                            onClick={(e) => openDeleteConfirm(e, customer)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Bounded Pagination Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-slate-500 font-medium tabular-nums">
            Showing <span className="font-semibold text-slate-900">{filteredCustomers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">{Math.min(currentPage * pageSize, filteredCustomers.length)}</span> of{" "}
            <span className="font-semibold text-slate-900">{filteredCustomers.length}</span> customers
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-xs font-medium border-slate-200 bg-white"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
            </Button>
            <span className="text-xs font-mono tabular-nums font-medium text-slate-600 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-xs font-medium border-slate-200 bg-white"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            >
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* CUSTOMER DETAIL PROFILE SLIDE-OVER SHEET */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col border-l border-slate-200 overflow-y-auto bg-slate-50 text-left">
          {selectedCustomer && (
            <>
              {/* Header */}
              <div className="p-6 bg-slate-900 text-white shrink-0 relative text-left">
                <div className="flex items-center justify-between pb-3">
                  <span className="inline-flex items-center rounded-md bg-white/10 text-slate-200 border border-white/15 font-mono tabular-nums text-[11px] font-medium px-2.5 py-0.5">
                    ID: {selectedCustomer.id}
                  </span>
                  <SheetClose asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Close customer profile"
                      className="h-8 w-8 text-white/70 hover:text-white rounded-lg"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </SheetClose>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-xl bg-white/10 border border-white/15 overflow-hidden shrink-0 flex items-center justify-center text-white font-bold text-xl">
                    {selectedCustomer.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-white tracking-tight truncate">
                      {selectedCustomer.name}
                    </h3>
                    <p className="text-xs text-emerald-400 font-mono tabular-nums font-medium mt-0.5 flex items-center gap-1.5">
                      <Phone className="h-3 w-3" /> {selectedCustomer.phone}
                    </p>
                    <div className="flex items-center gap-2 pt-2 flex-wrap">
                      <span className="inline-flex items-center rounded-md bg-white/10 text-white border border-white/15 px-2 py-0.5 text-xs font-medium">
                        {selectedCustomer.customerType || 'Regular'}
                      </span>
                      {selectedCustomer.businessName && (
                        <span className="inline-flex items-center rounded-md bg-white/5 text-slate-300 border border-white/10 px-2 py-0.5 text-xs">
                          {selectedCustomer.businessName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct Action Links */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-8 bg-white/10 hover:bg-white/20 border-white/15 text-white text-xs font-medium rounded-lg"
                  >
                    <a
                      href={`https://wa.me/${selectedCustomer.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <SmartphoneNfc className="h-3.5 w-3.5 mr-1.5 text-emerald-400" /> WhatsApp
                    </a>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-8 bg-white/10 hover:bg-white/20 border-white/15 text-white text-xs font-medium rounded-lg"
                  >
                    <a href={`tel:${selectedCustomer.phone}`}>
                      <Phone className="h-3.5 w-3.5 mr-1.5" /> Call
                    </a>
                  </Button>
                  {selectedCustomer.email && (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-8 bg-white/10 hover:bg-white/20 border-white/15 text-white text-xs font-medium rounded-lg"
                    >
                      <a href={`mailto:${selectedCustomer.email}`}>
                        <Mail className="h-3.5 w-3.5 mr-1.5" /> Email
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* Drawer Tabs */}
              <Tabs defaultValue="orders" className="flex-1 flex flex-col">
                <div className="px-6 border-b border-slate-200 bg-white overflow-x-auto">
                  <TabsList className="bg-transparent h-11 gap-6 p-0 border-none flex">
                    <TabsTrigger value="orders" className="data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:bg-transparent rounded-none h-11 text-xs font-semibold text-slate-500 px-0">
                      <ShoppingBag className="h-3.5 w-3.5 mr-1.5" /> Order history
                    </TabsTrigger>
                    <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:bg-transparent rounded-none h-11 text-xs font-semibold text-slate-500 px-0">
                      <User className="h-3.5 w-3.5 mr-1.5" /> Identity & address
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:bg-transparent rounded-none h-11 text-xs font-semibold text-slate-500 px-0">
                      <Save className="h-3.5 w-3.5 mr-1.5" /> Internal notes
                    </TabsTrigger>
                    <TabsTrigger value="intelligence" onClick={handleAiAnalysis} className="data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:bg-transparent rounded-none h-11 text-xs font-semibold text-slate-500 px-0">
                      <BrainCircuit className="h-3.5 w-3.5 mr-1.5" /> AI loyalty
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-6 space-y-5 flex-1 overflow-y-auto scrollbar-hide text-left">
                  {/* Order History Tab */}
                  <TabsContent value="orders" className="m-0 space-y-5">
                    {/* Customer Statistics Card */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <KpiStatCard
                        label="Total Orders"
                        value={customerStats?.totalOrders || customerOrders.length}
                        subtext={`${customerStats?.paidOrders || 0} paid & settled`}
                      />
                      <KpiStatCard
                        label="Paid Revenue"
                        value={`${currencySymbol}${(customerStats?.totalPaidAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: (customerStats?.totalPaidAmount || 0) % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}`}
                        subtext="Excludes unverified"
                        tone="positive"
                      />
                      <KpiStatCard
                        label="Avg Order Value"
                        value={`${currencySymbol}${(customerStats?.averageOrderValue || 0).toLocaleString("en-IN", { minimumFractionDigits: (customerStats?.averageOrderValue || 0) % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}`}
                        subtext="Per paid order"
                        className="col-span-2 sm:col-span-1"
                      />
                    </div>

                    {/* Orders List */}
                    <SectionCard
                      title="Chronological transactions"
                      headerRight={
                        <Link
                          href="/website/orders"
                          className="text-xs font-medium text-slate-700 hover:text-slate-900 hover:underline flex items-center gap-1"
                        >
                          Full orders ledger <ExternalLink className="h-3 w-3" />
                        </Link>
                      }
                    >
                      {isLoadingProfileDetails ? (
                        <div className="py-8 text-center">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
                          <p className="text-xs font-medium text-slate-500 mt-2">Loading transactions...</p>
                        </div>
                      ) : customerOrders.length === 0 ? (
                        <p className="text-xs text-slate-500 py-4 text-center">
                          No order records found for this customer.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {customerOrders.map((ord) => {
                            const dateStr = ord.createdAt?.toDate ? ord.createdAt.toDate() : new Date(ord.createdAt || Date.now());
                            const orderAmt = normalizeOrderAmount(ord);
                            return (
                              <div key={ord.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono tabular-nums font-semibold text-slate-900 truncate">{ord.id}</span>
                                    <span
                                      className={cn(
                                        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border capitalize",
                                        ord.status === 'paid' ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                                        ord.status === 'processing' ? "bg-amber-50 text-amber-800 border-amber-200" :
                                        ord.status === 'delivered' ? "bg-teal-50 text-teal-800 border-teal-200" :
                                        ord.status === 'payment_captured_unsettled' || ord.status === 'cancelled' ? "bg-rose-50 text-rose-800 border-rose-200" :
                                        "bg-slate-100 text-slate-700 border-slate-200"
                                      )}
                                    >
                                      {ord.status}
                                    </span>
                                  </div>
                                  <span className="font-mono tabular-nums font-semibold text-slate-900 text-sm shrink-0">
                                    {currencySymbol}{orderAmt.toLocaleString("en-IN", { minimumFractionDigits: orderAmt % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
                                  <span>{format(dateStr, 'dd MMM yyyy, hh:mm a')}</span>
                                  <span>{ord.items?.length || 0} items</span>
                                </div>

                                {ord.items && ord.items.length > 0 && (
                                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                                    <p className="text-xs text-slate-600 truncate">
                                      {ord.items.map((it: any) => `${it.quantity}x ${it.name}`).join(", ")}
                                    </p>
                                    <Link
                                      href="/website/orders"
                                      className="text-xs font-medium text-slate-700 hover:text-slate-900 hover:underline shrink-0"
                                    >
                                      View order →
                                    </Link>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </SectionCard>
                  </TabsContent>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="m-0 space-y-5">
                    <SectionCard title="Identity & billing profile">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-xs font-medium text-slate-500">Mobile phone</span>
                          <p className="font-mono tabular-nums font-semibold text-slate-900 mt-1">{selectedCustomer.phone}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-xs font-medium text-slate-500">Email address</span>
                          <p className="font-semibold text-slate-900 mt-1 truncate">{selectedCustomer.email || "Not provided"}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-xs font-medium text-slate-500">GSTIN</span>
                          <p className="font-mono tabular-nums font-semibold text-slate-900 mt-1">{selectedCustomer.gstin || "Unregistered"}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-xs font-medium text-slate-500">State</span>
                          <p className="font-semibold text-slate-900 mt-1">{selectedCustomer.state || "Maharashtra"}</p>
                        </div>
                        <div className="sm:col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-xs font-medium text-slate-500">Delivery / postal address</span>
                          <p className="font-medium text-slate-800 mt-1 leading-relaxed">
                            {selectedCustomer.address || "No delivery address on file"}
                          </p>
                        </div>
                      </div>
                    </SectionCard>
                  </TabsContent>

                  {/* Internal Notes Tab */}
                  <TabsContent value="notes" className="m-0 space-y-4">
                    <SectionCard title="Merchant internal notes" description="Private notes are strictly visible to business staff only.">
                      <div className="space-y-4">
                        <Textarea
                          value={customerNotes}
                          onChange={(e) => setCustomerNotes(e.target.value)}
                          placeholder="Add private operational notes about this customer (e.g. preferred delivery days, payment terms, special pricing)..."
                          className="min-h-[140px] rounded-xl text-sm leading-relaxed p-3.5 bg-slate-50 border-slate-200"
                        />

                        <div className="flex justify-end">
                          <Button
                            onClick={handleSaveNotes}
                            disabled={isSavingNotes}
                            className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
                          >
                            {isSavingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                            Save notes
                          </Button>
                        </div>
                      </div>
                    </SectionCard>
                  </TabsContent>

                  {/* AI Loyalty Intelligence Tab */}
                  <TabsContent value="intelligence" className="m-0 space-y-5">
                    {isAiLoading ? (
                      <div className="p-12 text-center rounded-2xl border border-slate-200 bg-white">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-500 mx-auto mb-3" />
                        <p className="text-xs font-medium text-slate-500">
                          Analyzing customer transaction frequency...
                        </p>
                      </div>
                    ) : aiResult ? (
                      <SectionCard
                        title="Behavioral retention index"
                        description="Automated engagement recommendations"
                      >
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                              <span className="text-xs font-medium text-slate-500">Loyalty score</span>
                              <p className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1">{aiResult.scores?.loyalty || 85}/100</p>
                            </div>
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                              <span className="text-xs font-medium text-slate-500">Churn risk</span>
                              <p className="text-xl font-bold font-mono tabular-nums text-amber-700 mt-1">{aiResult.scores?.churnRisk || 15}%</p>
                            </div>
                          </div>

                          {aiResult.insight && (
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                              <span className="text-xs font-semibold text-slate-600">Behavioral insight</span>
                              <p className="font-medium text-slate-800 mt-1 leading-relaxed">{aiResult.insight}</p>
                            </div>
                          )}

                          {aiResult.recommendation?.action && (
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                              <span className="text-xs font-semibold text-slate-600">Recommended action</span>
                              <p className="font-medium text-slate-800 mt-1 leading-relaxed">{aiResult.recommendation.action}</p>
                            </div>
                          )}
                        </div>
                      </SectionCard>
                    ) : (
                      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
                          <Bot className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">Generate AI retention profile</p>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Analyzes purchase frequency, average basket size, and recommended touchpoints.
                          </p>
                        </div>
                        <Button
                          onClick={handleAiAnalysis}
                          className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
                        >
                          <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Run AI assessment
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* DELETE / ARCHIVE ALERT */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-2xl border border-slate-200 bg-white p-6 text-left">
          <AlertDialogHeader>
            <div className="h-11 w-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-2">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold tracking-tight text-slate-900">
              Remove customer: {customerToDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed">
              If this customer has historical orders, their profile will be safely archived to protect all invoice and accounting records. If no historical orders exist, the record will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-4 flex gap-3">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="flex-1 h-10 rounded-xl font-medium text-xs border-slate-200">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={confirmDelete}
                disabled={isSubmittingForm}
                className="flex-1 h-10 rounded-xl font-semibold bg-rose-600 hover:bg-rose-700 text-white border-none text-xs"
              >
                {isSubmittingForm ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
                Confirm
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* EXCEL & CSV BATCH IMPORT DIALOG */}
      <CustomerImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        existingCustomers={customerList}
        remainingQuota={remainingCustomerQuota}
        onConfirmImport={handleBatchImportCustomers}
      />
    </div>
  );
}
