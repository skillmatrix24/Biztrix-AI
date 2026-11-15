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
  CheckCircle2
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
  useDoc
} from "@/firebase";
import { collection, doc, query, limit, orderBy } from "firebase/firestore";
import Link from "next/link";
import { format } from "date-fns";
import { analyzeLoyalty, LoyaltyIntelligenceOutput } from "@/ai/flows/loyalty-intelligence-flow";
import { 
  saveCustomer, 
  updateCustomerNotes, 
  deleteCustomer, 
  fetchCustomerDetailsAndOrders
} from "@/app/actions/customer-actions";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Chandigarh"
];

const CUSTOMER_TYPES = ["Regular", "VIP", "Wholesale", "Risky", "B2B"];

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
      const amt = parseFloat(ord.amount) || 0;
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

  // Drawer & Modal States
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
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
        openingBalance: customerFormData.openingBalance,
        dob: customerFormData.dob,
        gender: customerFormData.gender,
        whatsappNumber: customerFormData.whatsappNumber || customerFormData.phone,
        notes: customerFormData.notes
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
      openingBalance: c.creditBalance || 0,
      dob: c.dob || "",
      gender: c.gender || "Prefer not to say",
      whatsappNumber: c.whatsappNumber || c.phone || "",
      notes: c.notes || "",
      loyaltyTier: c.loyaltyTier || "Standard",
      rewardPoints: c.rewardPoints || 0,
      walletBalance: c.walletBalance || 0
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

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-10 text-left">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 shadow-inner">
            <Users className="h-7 w-7 md:h-8 md:w-8 text-primary" />
          </div>
          <div className="text-left">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">
              Customer Registry
            </h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1.5 opacity-60">
              Profiles, Order Histories & Unified Identity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isAddCustomerOpen} onOpenChange={(o) => { setIsAddCustomerOpen(o); if(!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-xl h-11 px-6 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
                <UserPlus className="mr-1.5 h-4 w-4" /> Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl w-[95vw] sm:w-full">
              <DialogHeader className="p-6 sm:p-8 bg-primary text-white text-left">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0 shadow-inner">
                    {customerFormData.id ? <Edit2 className="h-6 w-6 text-white" /> : <UserPlus className="h-6 w-6 text-white" />}
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black uppercase">
                      {customerFormData.id ? "Edit Customer Profile" : "Register Customer"}
                    </DialogTitle>
                    <DialogDescription className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-1">
                      Authoritative Directory • Deterministic Phone Deduplication
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <Tabs value={activeFormTab} onValueChange={setActiveFormTab} className="w-full">
                <div className="px-6 sm:px-8 border-b bg-muted/10">
                  <TabsList className="bg-transparent h-12 p-0 gap-6 border-none overflow-x-auto scrollbar-hide flex">
                    <TabsTrigger value="basic" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 text-[10px] font-black uppercase tracking-widest px-0">
                      Basic Identity
                    </TabsTrigger>
                    <TabsTrigger value="billing" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 text-[10px] font-black uppercase tracking-widest px-0">
                      Address & GST
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 text-[10px] font-black uppercase tracking-widest px-0">
                      Internal Notes
                    </TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="max-h-[60vh]">
                  <div className="p-6 sm:p-8 text-left">
                    <TabsContent value="basic" className="m-0 space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase ml-1 opacity-70">Customer Name *</Label>
                        <Input 
                          value={customerFormData.name} 
                          onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })} 
                          placeholder="e.g. Rahul Sharma" 
                          className="h-11 rounded-xl text-sm font-bold bg-muted/20 border-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase ml-1 opacity-70">Mobile Phone *</Label>
                          <Input 
                            value={customerFormData.phone} 
                            onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })} 
                            placeholder="e.g. 9876543210" 
                            className="h-11 rounded-xl font-mono text-sm font-bold bg-muted/20 border-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase ml-1 opacity-60">Email Address</Label>
                          <Input 
                            type="email" 
                            value={customerFormData.email} 
                            onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })} 
                            placeholder="customer@example.com" 
                            className="h-11 rounded-xl text-sm bg-muted/20 border-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase ml-1 opacity-60">Classification</Label>
                          <Select 
                            value={customerFormData.customerType} 
                            onValueChange={(val: any) => setCustomerFormData({ ...customerFormData, customerType: val })}
                          >
                            <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none text-xs font-bold uppercase">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {CUSTOMER_TYPES.map(t => (
                                <SelectItem key={t} value={t} className="text-xs font-bold uppercase">{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase ml-1 opacity-60">Company / Business Name</Label>
                          <Input 
                            value={customerFormData.businessName} 
                            onChange={(e) => setCustomerFormData({ ...customerFormData, businessName: e.target.value })} 
                            placeholder="Optional enterprise name" 
                            className="h-11 rounded-xl text-sm bg-muted/20 border-none"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="billing" className="m-0 space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase ml-1 opacity-60">Delivery / Billing Address</Label>
                        <Textarea 
                          value={customerFormData.address} 
                          onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })} 
                          placeholder="Complete street address, building, locality, pincode..." 
                          className="min-h-[80px] rounded-xl bg-muted/20 border-none text-xs leading-relaxed"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase ml-1 opacity-60">State</Label>
                          <Select 
                            value={customerFormData.state} 
                            onValueChange={(val) => setCustomerFormData({ ...customerFormData, state: val })}
                          >
                            <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none text-xs font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {INDIAN_STATES.map(st => (
                                <SelectItem key={st} value={st} className="text-xs">{st}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase ml-1 opacity-60">GSTIN</Label>
                          <Input 
                            value={customerFormData.gstin} 
                            onChange={(e) => setCustomerFormData({ ...customerFormData, gstin: e.target.value.toUpperCase() })} 
                            placeholder="e.g. 27AABCU9603R1ZN" 
                            className="h-11 rounded-xl font-mono text-xs font-bold uppercase bg-muted/20 border-none"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="notes" className="m-0 space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase ml-1 opacity-60">Internal Merchant Notes</Label>
                        <Textarea 
                          value={customerFormData.notes} 
                          onChange={(e) => setCustomerFormData({ ...customerFormData, notes: e.target.value })} 
                          placeholder="Private notes about customer preferences, VIP requirements, special terms..." 
                          className="min-h-[100px] rounded-xl bg-muted/20 border-none text-xs leading-relaxed"
                        />
                        <p className="text-[9px] text-muted-foreground ml-1">
                          Private to your team. Never exposed to customers on the storefront.
                        </p>
                      </div>
                    </TabsContent>
                  </div>
                </ScrollArea>
              </Tabs>

              <DialogFooter className="p-6 bg-muted/10 border-t">
                <Button 
                  onClick={handleSaveCustomer} 
                  disabled={isSubmittingForm}
                  className="w-full h-12 bg-primary font-black uppercase text-xs tracking-wider rounded-xl shadow-xl text-white"
                >
                  {isSubmittingForm ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  {customerFormData.id ? "Save Customer Profile" : "Register New Customer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border border-border/50 text-left">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Registered</p>
          <div className="text-2xl font-black text-slate-900">{registryStats.totalCustomers} Customers</div>
          <p className="text-[10px] text-muted-foreground font-semibold mt-1">
            <span className="text-primary font-bold">{registryStats.activeCustomers}</span> active in directory
          </p>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-emerald-500 text-left">
          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Purchasing Customers</p>
          <div className="text-2xl font-black text-emerald-900">{registryStats.customersWithOrders} Buyers</div>
          <p className="text-[10px] text-muted-foreground font-semibold mt-1">Placed at least 1 order</p>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-indigo-500 text-left">
          <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-1">Repeat Purchase Rate</p>
          <div className="text-2xl font-black text-indigo-900">
            {registryStats.customersWithOrders > 0
              ? `${Math.round((customerList.filter(c => getCustomerMetrics(c).totalOrders >= 2).length / registryStats.customersWithOrders) * 100)}%`
              : "0%"}
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold mt-1">Customers with 2+ orders</p>
        </Card>

        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6 text-left">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Customer Paid Revenue</p>
          <div className="text-2xl font-black text-white">{currencySymbol}{registryStats.totalRevenueFromCustomers.toLocaleString()}</div>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">Verified settled payments</p>
        </Card>
      </div>

      {/* Main Customers Table Card */}
      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border text-left">
        {/* Filters Bar */}
        <div className="p-5 border-b bg-muted/20 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Search */}
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
              <Input 
                placeholder="Search name, phone, email, enterprise..." 
                className="h-11 pl-10 text-xs bg-white border-none shadow-inner rounded-xl w-full font-bold" 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              />
            </div>

            {/* Classification Filter */}
            <div className="lg:col-span-2">
              <Select value={classificationFilter} onValueChange={(v) => { setClassificationFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-11 w-full rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-slate-700">
                  <SelectValue placeholder="Classification" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-[10px] font-bold uppercase">All Types</SelectItem>
                  {CUSTOMER_TYPES.map(t => (
                    <SelectItem key={t} value={t} className="text-[10px] font-bold uppercase">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Spending Filter */}
            <div className="lg:col-span-2">
              <Select value={spendingFilter} onValueChange={(v) => { setSpendingFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-11 w-full rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-slate-700">
                  <SelectValue placeholder="Spending" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-[10px] font-bold uppercase">All Spending</SelectItem>
                  <SelectItem value="spenders" className="text-[10px] font-bold uppercase text-emerald-700">With Purchases</SelectItem>
                  <SelectItem value="high" className="text-[10px] font-bold uppercase text-primary">High Spenders ({currencySymbol}5K+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Orders Count Filter */}
            <div className="lg:col-span-2">
              <Select value={ordersFilter} onValueChange={(v) => { setOrdersFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-11 w-full rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-slate-700">
                  <SelectValue placeholder="Orders" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-[10px] font-bold uppercase">All Order Counts</SelectItem>
                  <SelectItem value="repeat" className="text-[10px] font-bold uppercase text-indigo-700">Repeat Buyers (2+)</SelectItem>
                  <SelectItem value="one_time" className="text-[10px] font-bold uppercase">One-time (1)</SelectItem>
                  <SelectItem value="no_orders" className="text-[10px] font-bold uppercase text-muted-foreground">No Orders (0)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Filter */}
            <div className="lg:col-span-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-11 w-full rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-slate-700">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="recent" className="text-[10px] font-bold uppercase">Recent Activity</SelectItem>
                  <SelectItem value="name" className="text-[10px] font-bold uppercase">Name (A-Z)</SelectItem>
                  <SelectItem value="orders_high" className="text-[10px] font-bold uppercase">Orders (High to Low)</SelectItem>
                  <SelectItem value="spending_high" className="text-[10px] font-bold uppercase">Spending (High to Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-[1050px]">
            <TableHeader>
              <TableRow className="bg-muted/10 border-b">
                <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Customer Identity</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Contact Details</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Classification</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Orders</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase h-12">Total Spending</TableHead>
                <TableHead className="text-right pr-8 text-[10px] font-black uppercase h-12 w-48">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isCustomersLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-44 text-center">
                    <Loader2 className="h-7 w-7 animate-spin mx-auto mb-2 text-primary opacity-30" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Loading Customer Registry...
                    </span>
                  </TableCell>
                </TableRow>
              ) : paginatedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-44 text-center opacity-40 italic text-sm">
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
                        "hover:bg-muted/5 cursor-pointer group transition-colors border-b",
                        isArchived && "opacity-60 bg-slate-50/50"
                      )} 
                      onClick={() => handleOpenDetail(customer)}
                    >
                      {/* Name & ID */}
                      <TableCell className="pl-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm shrink-0 border border-primary/20 shadow-inner">
                            {customer.name?.charAt(0).toUpperCase() || "C"}
                          </div>
                          <div className="flex flex-col text-left min-w-0">
                            <span className="font-black text-slate-900 text-sm group-hover:text-primary transition-colors truncate uppercase tracking-tight">
                              {customer.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {customer.businessName && (
                                <span className="text-[9px] text-muted-foreground font-semibold truncate max-w-[140px]">
                                  {customer.businessName} •
                                </span>
                              )}
                              <span className="text-[9px] text-muted-foreground font-mono">
                                ID: {customer.id.slice(-8).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Contact */}
                      <TableCell className="text-left">
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-mono font-bold text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
                            <Phone className="h-3 w-3 text-muted-foreground" /> {customer.phone}
                          </span>
                          {customer.email && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 truncate max-w-[180px] mt-0.5">
                              <Mail className="h-2.5 w-2.5" /> {customer.email}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Classification Badge */}
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[8px] font-black uppercase px-2 h-5 border-none shadow-sm",
                            customer.customerType === 'VIP' ? "bg-amber-100 text-amber-800" :
                            customer.customerType === 'Wholesale' ? "bg-indigo-100 text-indigo-800" :
                            customer.customerType === 'B2B' ? "bg-purple-100 text-purple-800" :
                            "bg-slate-100 text-slate-700"
                          )}
                        >
                          {customer.customerType || 'Regular'}
                        </Badge>
                      </TableCell>

                      {/* Orders Count */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className={cn("text-xs font-black", metrics.totalOrders > 0 ? "text-slate-900" : "text-muted-foreground opacity-50")}>
                            {metrics.totalOrders} {metrics.totalOrders === 1 ? 'order' : 'orders'}
                          </span>
                          {metrics.lastOrderDate && (
                            <span className="text-[9px] text-muted-foreground font-mono mt-0.5">
                              {format(new Date(metrics.lastOrderDate), 'dd MMM yyyy')}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Total Spending */}
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className={cn("font-black text-sm", metrics.totalSpent > 0 ? "text-emerald-700" : "text-slate-500")}>
                            {currencySymbol}{metrics.totalSpent.toLocaleString()}
                          </span>
                          {metrics.paidOrders > 0 && (
                            <span className="text-[9px] text-muted-foreground font-semibold">
                              {metrics.paidOrders} settled
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-8" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg text-primary hover:bg-primary/5" 
                            title="Edit Customer"
                            onClick={(e) => handleOpenEdit(e, customer)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-50" 
                            title="Delete / Archive Customer"
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
        <div className="p-4 border-t bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-muted-foreground font-semibold text-[11px]">
            Showing <span className="font-bold text-slate-900">{filteredCustomers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-bold text-slate-900">{Math.min(currentPage * pageSize, filteredCustomers.length)}</span> of{" "}
            <span className="font-bold text-slate-900">{filteredCustomers.length}</span> customers
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-xs font-bold"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="text-[11px] font-mono font-bold px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-xs font-bold"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* CUSTOMER DETAIL PROFILE SLIDE-OVER SHEET */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col border-none shadow-2xl overflow-y-auto bg-slate-50 text-left">
          {selectedCustomer && (
            <>
              {/* Header */}
              <div className="p-6 bg-slate-900 text-white shrink-0 relative text-left">
                <div className="flex items-center justify-between pb-3">
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20 uppercase text-[9px] font-black px-2.5 py-0.5 rounded-full">
                    CUSTOMER ID: {selectedCustomer.id}
                  </Badge>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white rounded-full">
                      <X className="h-5 w-5" />
                    </Button>
                  </SheetClose>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/20 overflow-hidden shrink-0 flex items-center justify-center text-white font-black text-2xl">
                    {selectedCustomer.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight truncate">
                      {selectedCustomer.name}
                    </h3>
                    <p className="text-xs text-emerald-400 font-mono font-bold mt-0.5 flex items-center gap-1.5">
                      <Phone className="h-3 w-3" /> {selectedCustomer.phone}
                    </p>
                    <div className="flex items-center gap-2 pt-2 flex-wrap">
                      <Badge className="bg-white/10 text-white border-white/20 text-[8px] font-black uppercase">
                        {selectedCustomer.customerType || 'Regular'}
                      </Badge>
                      {selectedCustomer.businessName && (
                        <Badge variant="outline" className="bg-white/5 text-slate-300 border-white/10 text-[8px] font-bold">
                          {selectedCustomer.businessName}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct Action Chips */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 bg-white/10 hover:bg-white/20 border-white/20 text-white text-[10px] font-black uppercase rounded-xl"
                    onClick={() => window.open(`https://wa.me/${selectedCustomer.phone.replace(/\D/g, '')}`, '_blank')}
                  >
                    <SmartphoneNfc className="h-3 w-3 mr-1 text-emerald-400" /> WhatsApp
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 bg-white/10 hover:bg-white/20 border-white/20 text-white text-[10px] font-black uppercase rounded-xl"
                    onClick={() => window.open(`tel:${selectedCustomer.phone}`, '_self')}
                  >
                    <Phone className="h-3 w-3 mr-1" /> Call
                  </Button>
                  {selectedCustomer.email && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 bg-white/10 hover:bg-white/20 border-white/20 text-white text-[10px] font-black uppercase rounded-xl"
                      onClick={() => window.open(`mailto:${selectedCustomer.email}`, '_self')}
                    >
                      <Mail className="h-3 w-3 mr-1" /> Email
                    </Button>
                  )}
                </div>
              </div>

              {/* Drawer Tabs */}
              <Tabs defaultValue="orders" className="flex-1 flex flex-col">
                <div className="px-6 border-b bg-white">
                  <TabsList className="bg-transparent h-12 gap-6 p-0 border-none flex">
                    <TabsTrigger value="orders" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-12 text-[10px] font-black uppercase tracking-widest px-0">
                      <ShoppingBag className="h-3.5 w-3.5 mr-1.5" /> Order History
                    </TabsTrigger>
                    <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-12 text-[10px] font-black uppercase tracking-widest px-0">
                      <User className="h-3.5 w-3.5 mr-1.5" /> Identity & Address
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-12 text-[10px] font-black uppercase tracking-widest px-0">
                      <Save className="h-3.5 w-3.5 mr-1.5" /> Internal Notes
                    </TabsTrigger>
                    <TabsTrigger value="intelligence" onClick={handleAiAnalysis} className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-12 text-[10px] font-black uppercase tracking-widest px-0">
                      <BrainCircuit className="h-3.5 w-3.5 mr-1.5" /> AI Loyalty
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto scrollbar-hide text-left">
                  {/* Order History Tab */}
                  <TabsContent value="orders" className="m-0 space-y-6">
                    {/* Customer Statistics Card */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-4 bg-white rounded-2xl border shadow-sm space-y-1">
                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Total Orders</span>
                        <p className="text-xl font-black text-slate-900">{customerStats?.totalOrders || customerOrders.length}</p>
                        <p className="text-[9px] text-muted-foreground">{customerStats?.paidOrders || 0} paid & settled</p>
                      </div>

                      <div className="p-4 bg-white rounded-2xl border shadow-sm space-y-1">
                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Total Paid Revenue</span>
                        <p className="text-xl font-black text-emerald-700">{currencySymbol}{(customerStats?.totalPaidAmount || 0).toLocaleString()}</p>
                        <p className="text-[9px] text-muted-foreground">Excludes unverified</p>
                      </div>

                      <div className="p-4 bg-white rounded-2xl border shadow-sm space-y-1 col-span-2 sm:col-span-1">
                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Avg Order Value</span>
                        <p className="text-xl font-black text-primary">{currencySymbol}{(customerStats?.averageOrderValue || 0).toLocaleString()}</p>
                        <p className="text-[9px] text-muted-foreground">Per paid transaction</p>
                      </div>
                    </div>

                    {/* Orders List */}
                    <Card className="border-none shadow-sm bg-white rounded-2xl p-5 border space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-1.5">
                          <History className="h-3.5 w-3.5 text-primary" /> Chronological Transactions
                        </p>
                        <Link 
                          href="/website/orders" 
                          className="text-[10px] font-black text-primary uppercase hover:underline flex items-center gap-1"
                        >
                          Full Orders Ledger <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>

                      {isLoadingProfileDetails ? (
                        <div className="py-8 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary opacity-40" />
                          <p className="text-[10px] font-bold text-muted-foreground mt-2">Loading transactions...</p>
                        </div>
                      ) : customerOrders.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-4 text-center">
                          No order records found for this customer.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {customerOrders.map((ord) => {
                            const dateStr = ord.createdAt?.toDate ? ord.createdAt.toDate() : new Date(ord.createdAt || Date.now());
                            return (
                              <div key={ord.id} className="p-4 rounded-xl bg-slate-50 border text-xs space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-slate-900">{ord.id}</span>
                                    <Badge 
                                      className={cn(
                                        "text-[8px] font-black uppercase px-1.5 py-0 h-4",
                                        ord.status === 'paid' ? "bg-emerald-100 text-emerald-800" :
                                        ord.status === 'processing' ? "bg-amber-100 text-amber-800" :
                                        ord.status === 'delivered' ? "bg-teal-100 text-teal-800" :
                                        ord.status === 'payment_captured_unsettled' ? "bg-rose-100 text-rose-800" :
                                        ord.status === 'cancelled' ? "bg-rose-100 text-rose-800" :
                                        "bg-slate-200 text-slate-700"
                                      )}
                                    >
                                      {ord.status}
                                    </Badge>
                                  </div>
                                  <span className="font-black text-slate-900 text-sm">
                                    {currencySymbol}{(parseFloat(ord.amount) || 0).toLocaleString()}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                  <span>{format(dateStr, 'dd MMM yyyy, hh:mm a')}</span>
                                  <span>{ord.items?.length || 0} items</span>
                                </div>

                                {ord.items && ord.items.length > 0 && (
                                  <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between">
                                    <p className="text-[10px] text-slate-600 truncate max-w-[280px]">
                                      {ord.items.map((it: any) => `${it.quantity}x ${it.name}`).join(", ")}
                                    </p>
                                    <Link 
                                      href="/website/orders" 
                                      className="text-[9px] font-black text-primary hover:underline shrink-0 ml-2"
                                    >
                                      View Order →
                                    </Link>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  </TabsContent>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="m-0 space-y-6">
                    <Card className="border-none shadow-sm bg-white rounded-2xl p-5 border space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Identity & Billing Profile
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="p-3 bg-slate-50 rounded-xl border">
                          <span className="text-[9px] font-black uppercase text-muted-foreground">Mobile Phone</span>
                          <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedCustomer.phone}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border">
                          <span className="text-[9px] font-black uppercase text-muted-foreground">Email Address</span>
                          <p className="font-bold text-slate-800 mt-0.5 truncate">{selectedCustomer.email || "Not provided"}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border">
                          <span className="text-[9px] font-black uppercase text-muted-foreground">GSTIN ID</span>
                          <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedCustomer.gstin || "Unregistered"}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border">
                          <span className="text-[9px] font-black uppercase text-muted-foreground">State Registry</span>
                          <p className="font-bold text-slate-800 mt-0.5">{selectedCustomer.state || "Maharashtra"}</p>
                        </div>
                        <div className="sm:col-span-2 p-3 bg-slate-50 rounded-xl border">
                          <span className="text-[9px] font-black uppercase text-muted-foreground">Delivery / Postal Address</span>
                          <p className="font-medium text-slate-800 mt-0.5 leading-relaxed">
                            {selectedCustomer.address || "No delivery address on file"}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </TabsContent>

                  {/* Internal Notes Tab */}
                  <TabsContent value="notes" className="m-0 space-y-4">
                    <Card className="border-none shadow-sm bg-white rounded-2xl p-5 border space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-1.5">
                        <Save className="h-3.5 w-3.5 text-primary" /> Merchant Internal Notes
                      </p>

                      <Textarea 
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                        placeholder="Add private operational notes about this customer (e.g. preferred delivery days, payment guarantees, special discounts)..."
                        className="min-h-[140px] rounded-xl text-xs leading-relaxed p-3.5 bg-slate-50"
                      />

                      <div className="flex justify-between items-center pt-2">
                        <p className="text-[9px] text-muted-foreground">
                          Private notes are strictly visible to business staff only.
                        </p>
                        <Button 
                          onClick={handleSaveNotes} 
                          disabled={isSavingNotes}
                          className="h-9 px-4 bg-primary text-white text-[10px] font-black uppercase rounded-xl shadow-md"
                        >
                          {isSavingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                          Save Notes
                        </Button>
                      </div>
                    </Card>
                  </TabsContent>

                  {/* AI Loyalty Intelligence Tab */}
                  <TabsContent value="intelligence" className="m-0 space-y-6">
                    {isAiLoading ? (
                      <div className="p-16 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          AI analyzing customer transaction frequency...
                        </p>
                      </div>
                    ) : aiResult ? (
                      <div className="space-y-6">
                        <Card className="border-none bg-primary/5 rounded-2xl p-6 border border-primary/20 space-y-4">
                          <div className="flex items-center gap-3">
                            <Bot className="h-6 w-6 text-primary" />
                            <div>
                              <p className="text-[10px] font-black uppercase text-primary">Behavioral Retention Index</p>
                              <p className="text-xs text-muted-foreground font-semibold">Automated engagement recommendations</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="p-3 bg-white rounded-xl border">
                              <span className="text-[9px] font-black uppercase text-muted-foreground">Loyalty Score</span>
                              <p className="text-lg font-black text-emerald-700 mt-0.5">{aiResult.scores?.loyalty || 85}/100</p>
                            </div>
                            <div className="p-3 bg-white rounded-xl border">
                              <span className="text-[9px] font-black uppercase text-muted-foreground">Churn Risk</span>
                              <p className="text-lg font-black text-amber-700 mt-0.5">{aiResult.scores?.churnRisk || 15}%</p>
                            </div>
                          </div>

                          {aiResult.insight && (
                            <div className="p-3 bg-white rounded-xl border text-xs">
                              <span className="text-[9px] font-black uppercase text-primary">Behavioral Insight</span>
                              <p className="font-semibold text-slate-800 mt-0.5">{aiResult.insight}</p>
                            </div>
                          )}

                          {aiResult.recommendation?.action && (
                            <div className="p-3 bg-white rounded-xl border text-xs">
                              <span className="text-[9px] font-black uppercase text-primary">Recommended Action</span>
                              <p className="font-semibold text-slate-800 mt-0.5">{aiResult.recommendation.action}</p>
                            </div>
                          )}
                        </Card>
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-white rounded-2xl border">
                        <Bot className="h-8 w-8 text-primary mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-bold text-slate-800">Generate AI Retention Profile</p>
                        <p className="text-[10px] text-muted-foreground mt-1 mb-4">
                          Analyzes purchase frequency, average basket size, and recommended touchpoints.
                        </p>
                        <Button 
                          onClick={handleAiAnalysis} 
                          className="h-9 px-4 bg-primary text-white text-[10px] font-black uppercase rounded-xl shadow-md"
                        >
                          <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Run AI Assessment
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
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8 text-left">
          <AlertDialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-2">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900">
              Remove Customer: {customerToDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              If this customer has historical orders, their profile will be safely archived to protect all invoice and accounting records. If no historical orders exist, the record will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-4 flex gap-3">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold uppercase text-[10px]">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button 
                onClick={confirmDelete} 
                disabled={isSubmittingForm}
                className="flex-1 h-11 rounded-xl font-black uppercase bg-destructive hover:bg-destructive/90 text-white border-none shadow-lg text-[10px]"
              >
                {isSubmittingForm ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Confirm
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
