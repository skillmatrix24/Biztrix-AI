"use client";

import { useState, useMemo, useTransition } from "react";
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  ChevronRight, 
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  SmartphoneNfc,
  Receipt,
  User,
  Package,
  ArrowUpRight,
  MoreVertical,
  Trash2,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Zap,
  RotateCcw,
  XCircle,
  Truck,
  Check,
  Copy,
  ChevronLeft,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  DollarSign,
  Eye,
  SlidersHorizontal,
  ArrowUpDown,
  History,
  Info,
  CreditCard
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetClose
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc, where, limit } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { refundUnsettledOrder, settleUnsettledOrder } from "@/app/actions/payment-actions";
import { updateOrderStatus, cancelMerchantOrder } from "@/app/actions/order-actions";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  'created': { label: 'Unpaid', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', icon: Clock },
  'paid': { label: 'Paid & Settled', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 },
  'processing': { label: 'Processing', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: Package },
  'shipped': { label: 'Shipped', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', icon: Truck },
  'delivered': { label: 'Delivered', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200', icon: CheckCircle2 },
  'payment_captured_unsettled': { label: 'Stalled: No Stock', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', icon: AlertCircle },
  'refund_pending': { label: 'Refund Pending', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: RefreshCcw },
  'refunded': { label: 'Refunded', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', icon: XCircle },
  'cancelled': { label: 'Cancelled', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', icon: XCircle },
};

export default function StorefrontOrdersPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  // Safe bounded query (limit 150) to prevent unbounded memory reads
  const ordersQuery = useMemoFirebase(() => 
    businessId ? query(
      collection(firestore, 'businesses', businessId, 'orders'), 
      where('source', '==', 'storefront'), 
      orderBy('createdAt', 'desc'),
      limit(150)
    ) : null
  , [firestore, businessId]);
  const { data: rawOrders, isLoading: isOrdersLoading } = useCollection<any>(ordersQuery);
  const orders = useMemo(() => (Array.isArray(rawOrders) ? rawOrders : []), [rawOrders]);

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  // Detail Modal / Sheet State
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Dialog State for Ship / Cancel / Refund
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [carrierInput, setCarrierInput] = useState("");
  const [trackingInput, setTrackingInput] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [isPendingAction, startTransition] = useTransition();

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find((o: any) => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // Comprehensive Filtering & Sorting Logic
  const filteredOrders = useMemo(() => {
    return orders
      .filter((o: any) => {
        // Search Filter
        const term = searchTerm.toLowerCase().trim();
        const matchesSearch = !term || 
          (o.id || "").toLowerCase().includes(term) ||
          (o.customerData?.name || "").toLowerCase().includes(term) ||
          (o.customerData?.phone || "").toLowerCase().includes(term) ||
          (o.customerData?.email || "").toLowerCase().includes(term) ||
          (Array.isArray(o.items) && o.items.some((i: any) => (i.name || "").toLowerCase().includes(term) || (i.sku || "").toLowerCase().includes(term)));

        // Status Filter
        const matchesStatus = statusFilter === "all" || o.status === statusFilter;

        // Payment Status Filter
        let matchesPayment = true;
        if (paymentFilter === "paid") {
          matchesPayment = o.status === "paid" || o.status === "processing" || o.status === "shipped" || o.status === "delivered";
        } else if (paymentFilter === "unpaid") {
          matchesPayment = o.status === "created";
        } else if (paymentFilter === "stalled") {
          matchesPayment = o.status === "payment_captured_unsettled";
        } else if (paymentFilter === "refunded") {
          matchesPayment = o.status === "refunded" || o.status === "refund_pending";
        }

        // Date Filter
        let matchesDate = true;
        if (dateFilter !== "all" && o.createdAt) {
          const orderDate = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
          const now = new Date();
          if (dateFilter === "today") {
            matchesDate = orderDate.toDateString() === now.toDateString();
          } else if (dateFilter === "7days") {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = orderDate >= sevenDaysAgo;
          } else if (dateFilter === "30days") {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = orderDate >= thirtyDaysAgo;
          }
        }

        return matchesSearch && matchesStatus && matchesPayment && matchesDate;
      })
      .sort((a: any, b: any) => {
        if (sortBy === "oldest") {
          const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return timeA - timeB;
        } else if (sortBy === "amount_high") {
          return (b.amount || 0) - (a.amount || 0);
        } else if (sortBy === "amount_low") {
          return (a.amount || 0) - (b.amount || 0);
        } else {
          // Default: newest first
          const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return timeB - timeA;
        }
      });
  }, [orders, searchTerm, statusFilter, paymentFilter, dateFilter, sortBy]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Overall Registry Metrics
  const stats = useMemo(() => {
    const stalled = orders.filter((o: any) => o.status === 'payment_captured_unsettled').length;
    const paidOrders = orders.filter((o: any) => ['paid', 'processing', 'shipped', 'delivered'].includes(o.status));
    const totalVolume = paidOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.amount) || 0), 0);
    const activeProcessing = orders.filter((o: any) => o.status === 'processing' || o.status === 'shipped').length;
    return { stalled, paidCount: paidOrders.length, totalVolume, activeProcessing };
  }, [orders]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  // Status Update Handlers
  const handleTransitionStatus = async (newStatus: string, options?: { note?: string; trackingNumber?: string; courierName?: string }) => {
    if (!user?.uid || !businessId || !selectedOrder) return;
    setIsProcessing(selectedOrder.id);

    try {
      const idToken = await user.getIdToken();
      const res = await updateOrderStatus({
        userId: user.uid,
        businessId,
        orderId: selectedOrder.id,
        newStatus,
        note: options?.note,
        trackingNumber: options?.trackingNumber,
        courierName: options?.courierName,
        idToken
      });

      if (res.success) {
        toast({ title: "Status Updated", description: res.message || `Order moved to ${newStatus}.` });
      } else {
        toast({ variant: "destructive", title: "Update Failed", description: res.error });
      }
    } finally {
      setIsProcessing(null);
    }
  };

  const handleManualSettle = async (orderId: string) => {
    if (!user?.uid || !businessId) return;
    setIsProcessing(orderId);
    try {
      const res = await settleUnsettledOrder(user.uid, businessId, orderId);
      if (res.success) {
        toast({ title: "Settlement Restored", description: "Inventory deducted and order confirmed as paid." });
      } else {
        toast({ variant: "destructive", title: "Settlement Failed", description: res.error });
      }
    } finally {
      setIsProcessing(null);
    }
  };

  const executeShipOrder = () => {
    if (!selectedOrder) return;
    startTransition(async () => {
      await handleTransitionStatus("shipped", {
        trackingNumber: trackingInput.trim() || undefined,
        courierName: carrierInput.trim() || undefined,
        note: actionReason.trim() || undefined,
      });
      setShipDialogOpen(false);
      setCarrierInput("");
      setTrackingInput("");
      setActionReason("");
    });
  };

  const executeCancelOrder = () => {
    if (!selectedOrder || !user?.uid || !businessId) return;
    startTransition(async () => {
      setIsProcessing(selectedOrder.id);
      try {
        const idToken = await user.getIdToken();
        const res = await cancelMerchantOrder({
          userId: user.uid,
          businessId,
          orderId: selectedOrder.id,
          reason: actionReason.trim() || "Cancelled by merchant",
          idToken
        });
        if (res.success) {
          toast({ title: "Order Cancelled", description: res.message });
          setCancelDialogOpen(false);
          setActionReason("");
        } else {
          toast({ variant: "destructive", title: "Cancellation Failed", description: res.error });
        }
      } finally {
        setIsProcessing(null);
      }
    });
  };

  const executeRefundOrder = () => {
    if (!selectedOrder || !user?.uid || !businessId) return;
    startTransition(async () => {
      setIsProcessing(selectedOrder.id);
      try {
        const res = await refundUnsettledOrder(
          user.uid, 
          businessId, 
          selectedOrder.id, 
          actionReason.trim() || "Customer requested refund"
        );
        if (res.success) {
          toast({ title: "Refund Dispatched", description: `Razorpay refund node ${res.refundId} active.` });
          setRefundDialogOpen(false);
          setActionReason("");
        } else {
          toast({ variant: "destructive", title: "Refund Failed", description: res.error });
        }
      } finally {
        setIsProcessing(null);
      }
    });
  };

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center py-20 opacity-40">
        <Loader2 className="animate-spin text-primary h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 text-left">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
            <ShoppingBag className="h-8 w-8 text-primary" />
          </div>
          <div className="text-left">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Store Orders</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">
              Fulfillment, Settlement & Order Lifecycle
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border border-border/50 text-left">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Storefront Orders</p>
          <div className="text-2xl font-black text-slate-900">{orders.length} Orders</div>
          <p className="text-[10px] text-muted-foreground font-semibold mt-1">Live customer registry</p>
        </Card>

        <Card className={cn(
          "border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 text-left transition-all", 
          stats.stalled > 0 ? "border-l-rose-500 bg-rose-50/50" : "border-l-emerald-500"
        )}>
          <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", stats.stalled > 0 ? "text-rose-600 font-bold" : "text-muted-foreground")}>
            Needs Attention
          </p>
          <div className={cn("text-2xl font-black", stats.stalled > 0 ? "text-rose-700" : "text-slate-900")}>
            {stats.stalled} Stalled
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold mt-1">
            {stats.stalled > 0 ? "Stock shortage recovery required" : "All orders healthy & clear"}
          </p>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-indigo-500 text-left">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">In Fulfillment</p>
          <div className="text-2xl font-black text-indigo-900">{stats.activeProcessing} Active</div>
          <p className="text-[10px] text-muted-foreground font-semibold mt-1">Processing or in transit</p>
        </Card>

        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6 text-left relative overflow-hidden group">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Settled Revenue</p>
          <div className="text-2xl font-black text-white">{currencySymbol}{stats.totalVolume.toLocaleString()}</div>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">{stats.paidCount} successfully paid</p>
        </Card>
      </div>

      {/* Main Order Registry Table Card */}
      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border text-left">
        {/* Filters & Control Bar */}
        <div className="p-5 border-b bg-muted/20 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Search */}
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
              <Input 
                placeholder="Search order ID, customer, phone, item..." 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                className="h-11 pl-10 rounded-xl bg-white border-none shadow-inner text-xs font-bold w-full" 
              />
            </div>

            {/* Status Filter */}
            <div className="lg:col-span-2">
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="h-11 w-full rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-primary">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-[10px] font-bold uppercase">All Statuses</SelectItem>
                  <SelectItem value="paid" className="text-[10px] font-bold uppercase">Paid & Settled</SelectItem>
                  <SelectItem value="processing" className="text-[10px] font-bold uppercase">Processing</SelectItem>
                  <SelectItem value="shipped" className="text-[10px] font-bold uppercase">Shipped</SelectItem>
                  <SelectItem value="delivered" className="text-[10px] font-bold uppercase">Delivered</SelectItem>
                  <SelectItem value="payment_captured_unsettled" className="text-[10px] font-bold uppercase text-rose-600">Stalled: No Stock</SelectItem>
                  <SelectItem value="created" className="text-[10px] font-bold uppercase">Unpaid</SelectItem>
                  <SelectItem value="refunded" className="text-[10px] font-bold uppercase">Refunded</SelectItem>
                  <SelectItem value="cancelled" className="text-[10px] font-bold uppercase">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Filter */}
            <div className="lg:col-span-2">
              <Select value={paymentFilter} onValueChange={(val) => { setPaymentFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="h-11 w-full rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-slate-700">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-[10px] font-bold uppercase">All Payments</SelectItem>
                  <SelectItem value="paid" className="text-[10px] font-bold uppercase">Paid (Captured)</SelectItem>
                  <SelectItem value="unpaid" className="text-[10px] font-bold uppercase">Unpaid</SelectItem>
                  <SelectItem value="stalled" className="text-[10px] font-bold uppercase">Stalled Settlement</SelectItem>
                  <SelectItem value="refunded" className="text-[10px] font-bold uppercase">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Filter */}
            <div className="lg:col-span-2">
              <Select value={dateFilter} onValueChange={(val) => { setDateFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="h-11 w-full rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-slate-700">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-[10px] font-bold uppercase">All Time</SelectItem>
                  <SelectItem value="today" className="text-[10px] font-bold uppercase">Today</SelectItem>
                  <SelectItem value="7days" className="text-[10px] font-bold uppercase">Last 7 Days</SelectItem>
                  <SelectItem value="30days" className="text-[10px] font-bold uppercase">Last 30 Days</SelectItem>
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
                  <SelectItem value="newest" className="text-[10px] font-bold uppercase">Newest First</SelectItem>
                  <SelectItem value="oldest" className="text-[10px] font-bold uppercase">Oldest First</SelectItem>
                  <SelectItem value="amount_high" className="text-[10px] font-bold uppercase">Amount: High-Low</SelectItem>
                  <SelectItem value="amount_low" className="text-[10px] font-bold uppercase">Amount: Low-High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-[1050px]">
            <TableHeader>
              <TableRow className="bg-muted/10 border-b">
                <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Order / Timestamp</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Customer Details</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Catalog Items</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Order Status</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Payment Status</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase h-12">Total Amount</TableHead>
                <TableHead className="text-right pr-8 h-12 w-48 text-[10px] font-black uppercase">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isOrdersLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <Loader2 className="animate-spin h-8 w-8 mx-auto text-primary opacity-30" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-3">Loading Merchant Ledger...</p>
                  </TableCell>
                </TableRow>
              ) : paginatedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center opacity-40 italic text-sm">
                    No orders match your filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrders.map((o: any) => {
                  const s = STATUS_CONFIG[o.status] || STATUS_CONFIG['created'];
                  const Icon = s.icon;
                  const isLoad = isProcessing === o.id;

                  // Payment badge logic
                  const isPaid = ['paid', 'processing', 'shipped', 'delivered'].includes(o.status);
                  const isStalled = o.status === 'payment_captured_unsettled';
                  const isRefunded = o.status === 'refunded' || o.status === 'refund_pending';

                  const orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : (o.createdAt ? new Date(o.createdAt) : null);
                  const itemCount = Array.isArray(o.items) ? o.items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0) : 0;

                  return (
                    <TableRow 
                      key={o.id} 
                      className="group hover:bg-muted/5 transition-colors border-b cursor-pointer"
                      onClick={() => setSelectedOrderId(o.id)}
                    >
                      {/* Order Node & Timestamp */}
                      <TableCell className="pl-8 py-4 text-left">
                        <div className="flex items-center gap-3 text-left">
                          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs shadow-inner uppercase shrink-0 border", s.bg, s.color, s.border)}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight group-hover:text-primary transition-colors">
                              {o.id}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3 opacity-60" />
                              {orderDate ? format(orderDate, 'dd MMM yyyy, hh:mm a') : 'Recently'}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Customer Details */}
                      <TableCell className="text-left">
                        <p className="text-xs font-bold text-slate-800">{o.customerData?.name || 'Storefront Client'}</p>
                        <p className="text-[10px] font-black text-muted-foreground font-mono mt-0.5">{o.customerData?.phone || 'No phone'}</p>
                      </TableCell>

                      {/* Items */}
                      <TableCell className="text-center font-bold text-xs text-slate-700">
                        <span className="font-black text-primary">{itemCount}</span> items 
                        <span className="text-[10px] text-muted-foreground ml-1">({(o.items || []).length} SKUs)</span>
                      </TableCell>

                      {/* Order Status */}
                      <TableCell className="text-center">
                        <Badge className={cn("text-[9px] font-black uppercase h-6 px-3 border shadow-sm", s.bg, s.color, s.border)}>
                          {s.label}
                        </Badge>
                      </TableCell>

                      {/* Payment Status */}
                      <TableCell className="text-center">
                        {isStalled ? (
                          <Badge className="text-[8px] font-black uppercase bg-rose-100 text-rose-800 border-rose-300">
                            Captured (Stalled)
                          </Badge>
                        ) : isRefunded ? (
                          <Badge className="text-[8px] font-black uppercase bg-slate-100 text-slate-700 border-slate-300">
                            Refunded
                          </Badge>
                        ) : isPaid ? (
                          <Badge className="text-[8px] font-black uppercase bg-emerald-100 text-emerald-800 border-emerald-300">
                            Paid & Settled
                          </Badge>
                        ) : (
                          <Badge className="text-[8px] font-black uppercase bg-slate-100 text-slate-600 border-slate-200">
                            Unpaid
                          </Badge>
                        )}
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="text-right font-black text-sm text-slate-900">
                        {currencySymbol}{parseFloat(o.amount || 0).toLocaleString()}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-8" onClick={(e) => e.stopPropagation()}>
                        {isStalled ? (
                          <div className="flex justify-end gap-2">
                            <Button 
                              onClick={() => { setSelectedOrderId(o.id); setRefundDialogOpen(true); }} 
                              disabled={isLoad} 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-[9px] font-black uppercase text-rose-600 border-rose-200 bg-white hover:bg-rose-50"
                            >
                              Refund
                            </Button>
                            <Button 
                              onClick={() => handleManualSettle(o.id)} 
                              disabled={isLoad} 
                              size="sm" 
                              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase rounded-lg shadow-sm"
                            >
                              {isLoad ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                              Retry
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-[10px] font-black uppercase text-primary hover:bg-primary/5 rounded-lg"
                            onClick={() => setSelectedOrderId(o.id)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> View Details
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination & Safe Bounded Loading Footer */}
        <div className="p-4 border-t bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-muted-foreground font-semibold text-[11px]">
            Showing <span className="font-bold text-slate-900">{filteredOrders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-bold text-slate-900">{Math.min(currentPage * pageSize, filteredOrders.length)}</span> of{" "}
            <span className="font-bold text-slate-900">{filteredOrders.length}</span> orders
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-xs font-bold"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 2. ORDER DETAIL SLIDE-OVER SHEET (Comprehensive Merchant Experience)       */}
      {/* ========================================================================= */}
      <Sheet open={Boolean(selectedOrderId)} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <SheetContent className="sm:max-w-2xl w-full p-0 overflow-y-auto bg-slate-50 text-left border-l shadow-2xl">
          {selectedOrder && (() => {
            const currentStatusCfg = STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG['created'];
            const StatusIcon = currentStatusCfg.icon;
            const orderDate = selectedOrder.createdAt?.toDate ? selectedOrder.createdAt.toDate() : (selectedOrder.createdAt ? new Date(selectedOrder.createdAt) : null);
            const isStalled = selectedOrder.status === 'payment_captured_unsettled';
            const isPaid = ['paid', 'processing', 'shipped', 'delivered'].includes(selectedOrder.status);
            const isTerminal = ['delivered', 'cancelled', 'refunded'].includes(selectedOrder.status);

            const timeline = Array.isArray(selectedOrder.statusHistory) ? selectedOrder.statusHistory : [];

            return (
              <div className="space-y-6 pb-20">
                {/* Drawer Header */}
                <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md p-6 border-b flex items-start justify-between">
                  <div className="space-y-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order Node</span>
                      <Badge className={cn("text-[9px] font-black uppercase border h-5 px-2.5", currentStatusCfg.bg, currentStatusCfg.color, currentStatusCfg.border)}>
                        {currentStatusCfg.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-slate-900 uppercase font-mono tracking-tight">
                        {selectedOrder.id}
                      </h3>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 rounded-lg" 
                        onClick={() => copyToClipboard(selectedOrder.id, "Order ID")}
                      >
                        {copiedKey === "Order ID" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                      </Button>
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground">
                      Created on {orderDate ? format(orderDate, 'dd MMMM yyyy, hh:mm:ss a') : 'Recently'}
                    </p>
                  </div>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </SheetClose>
                </div>

                <div className="px-6 space-y-6 text-left">
                  {/* Stalled Settlement Alert */}
                  {isStalled && (
                    <div className="p-5 bg-rose-50 rounded-2xl border border-rose-200 space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-rose-600" />
                        <h4 className="text-xs font-black uppercase text-rose-900 tracking-tight">
                          Settlement Stalled: Stockout Detected
                        </h4>
                      </div>
                      <p className="text-xs text-rose-800 font-medium leading-relaxed">
                        Payment was captured by Razorpay, but inventory deduction could not be completed because stock was exhausted. Please replenish inventory and retry settlement, or issue a refund.
                      </p>
                      <div className="flex gap-3 pt-2">
                        <Button 
                          onClick={() => handleManualSettle(selectedOrder.id)} 
                          disabled={Boolean(isProcessing)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] h-9 rounded-xl shadow-md"
                        >
                          {isProcessing === selectedOrder.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />}
                          Retry Inventory Settlement
                        </Button>
                        <Button 
                          onClick={() => setRefundDialogOpen(true)}
                          disabled={Boolean(isProcessing)}
                          variant="outline"
                          className="border-rose-300 text-rose-700 hover:bg-rose-100 font-black uppercase text-[10px] h-9 rounded-xl"
                        >
                          Refund Customer
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Status Progression Quick Actions */}
                  <Card className="border-none shadow-sm bg-white rounded-2xl p-5 border text-left space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order Lifecycle Actions</p>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Current: {currentStatusCfg.label}</span>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {selectedOrder.status === 'paid' && (
                        <Button 
                          onClick={() => handleTransitionStatus('processing')}
                          disabled={Boolean(isProcessing)}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-black uppercase text-[10px] h-9 rounded-xl shadow-sm"
                        >
                          <Package className="h-3.5 w-3.5 mr-1.5" /> Start Processing
                        </Button>
                      )}

                      {(selectedOrder.status === 'paid' || selectedOrder.status === 'processing') && (
                        <Button 
                          onClick={() => setShipDialogOpen(true)}
                          disabled={Boolean(isProcessing)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] h-9 rounded-xl shadow-sm"
                        >
                          <Truck className="h-3.5 w-3.5 mr-1.5" /> Mark Shipped
                        </Button>
                      )}

                      {selectedOrder.status === 'shipped' && (
                        <Button 
                          onClick={() => handleTransitionStatus('delivered')}
                          disabled={Boolean(isProcessing)}
                          className="bg-teal-600 hover:bg-teal-700 text-white font-black uppercase text-[10px] h-9 rounded-xl shadow-sm"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Confirm Delivered
                        </Button>
                      )}

                      {/* Cancel Button */}
                      {!isTerminal && selectedOrder.status !== 'payment_captured_unsettled' && (
                        <Button 
                          onClick={() => setCancelDialogOpen(true)}
                          disabled={Boolean(isProcessing)}
                          variant="outline"
                          className="border-rose-200 text-rose-600 hover:bg-rose-50 font-black uppercase text-[10px] h-9 rounded-xl"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1.5" /> Cancel Order
                        </Button>
                      )}

                      {/* Refund Button for Settled / Delivered */}
                      {(isPaid && selectedOrder.status !== 'refunded') && (
                        <Button 
                          onClick={() => setRefundDialogOpen(true)}
                          disabled={Boolean(isProcessing)}
                          variant="outline"
                          className="border-slate-300 text-slate-700 hover:bg-slate-100 font-black uppercase text-[10px] h-9 rounded-xl"
                        >
                          Issue Refund
                        </Button>
                      )}
                    </div>
                  </Card>

                  {/* Customer & Shipping Node */}
                  <Card className="border-none shadow-sm bg-white rounded-2xl p-5 border text-left space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" /> Customer & Delivery Details
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Customer Name</span>
                        <p className="text-sm font-black text-slate-900">{selectedOrder.customerData?.name || 'Walk-in Customer'}</p>
                        {selectedOrder.customerId && (
                          <p className="text-[10px] font-mono text-muted-foreground">ID: {selectedOrder.customerId}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Contact Phone</span>
                        <p className="text-sm font-black font-mono text-slate-900">{selectedOrder.customerData?.phone || 'No phone'}</p>
                        {selectedOrder.customerData?.phone && (
                          <div className="flex gap-2 pt-1">
                            <a 
                              href={`https://wa.me/${selectedOrder.customerData.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${selectedOrder.customerData.name || ''}, regarding your order #${selectedOrder.id}:`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded hover:bg-emerald-100 inline-flex items-center gap-1"
                            >
                              WhatsApp Customer
                            </a>
                            <a 
                              href={`tel:${selectedOrder.customerData.phone}`}
                              className="text-[9px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded hover:bg-slate-200 inline-flex items-center gap-1"
                            >
                              Call
                            </a>
                          </div>
                        )}
                      </div>

                      {selectedOrder.customerData?.email && (
                        <div className="space-y-1 sm:col-span-2">
                          <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Email</span>
                          <p className="text-xs font-bold text-slate-800">{selectedOrder.customerData.email}</p>
                        </div>
                      )}

                      <div className="space-y-1 sm:col-span-2">
                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-primary" /> Delivery Address
                        </span>
                        <p className="text-xs font-semibold text-slate-700 bg-slate-50 p-3 rounded-xl border leading-relaxed">
                          {selectedOrder.customerData?.address || "No delivery address supplied (Walk-in or In-store Pickup)."}
                        </p>
                      </div>

                      {/* Shipment Tracking Info */}
                      {(selectedOrder.trackingNumber || selectedOrder.courierName) && (
                        <div className="space-y-1 sm:col-span-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                          <span className="text-[9px] font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1">
                            <Truck className="h-3 w-3" /> Shipment Tracking Info
                          </span>
                          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                            <div>
                              <span className="text-[10px] text-muted-foreground font-semibold">Courier / Carrier:</span>
                              <p className="font-bold text-slate-800">{selectedOrder.courierName || 'Standard Delivery'}</p>
                            </div>
                            <div>
                              <span className="text-[10px] text-muted-foreground font-semibold">Tracking Number:</span>
                              <p className="font-mono font-bold text-slate-800">{selectedOrder.trackingNumber || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Order Items Table */}
                  <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden border text-left">
                    <div className="p-4 px-5 border-b bg-muted/10 flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-primary" /> Purchased Items
                      </p>
                      <span className="text-[10px] font-black text-primary uppercase">
                        {(selectedOrder.items || []).length} SKUs
                      </span>
                    </div>

                    <div className="p-4 space-y-3">
                      {(selectedOrder.items || []).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0 text-xs">
                          <div className="space-y-0.5 text-left min-w-0 pr-4">
                            <p className="font-black text-slate-900 truncate">{item.name}</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              {item.sku && <span className="font-mono bg-muted/30 px-1.5 py-0.5 rounded">SKU: {item.sku}</span>}
                              <span>Qty: {item.quantity}</span>
                              <span>× {currencySymbol}{parseFloat(item.price || 0).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="text-right font-black text-sm text-slate-900 shrink-0">
                            {currencySymbol}{(parseFloat(item.price || 0) * (item.quantity || 1)).toLocaleString()}
                          </div>
                        </div>
                      ))}

                      {/* Total Breakdown */}
                      <div className="pt-3 border-t space-y-1.5 text-xs">
                        <div className="flex justify-between text-muted-foreground font-semibold">
                          <span>Subtotal</span>
                          <span>{currencySymbol}{parseFloat(selectedOrder.amount || 0).toLocaleString()}</span>
                        </div>
                        {selectedOrder.discountAmount && (
                          <div className="flex justify-between text-emerald-600 font-semibold">
                            <span>Discount</span>
                            <span>-{currencySymbol}{parseFloat(selectedOrder.discountAmount).toLocaleString()}</span>
                          </div>
                        )}
                        {selectedOrder.taxAmount && (
                          <div className="flex justify-between text-muted-foreground font-semibold">
                            <span>Tax (GST)</span>
                            <span>{currencySymbol}{parseFloat(selectedOrder.taxAmount).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-black text-base text-slate-900 pt-2 border-t">
                          <span>Grand Total</span>
                          <span className="text-primary">{currencySymbol}{parseFloat(selectedOrder.amount || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Payment & Gateway Ledger Node */}
                  <Card className="border-none shadow-sm bg-white rounded-2xl p-5 border text-left space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-primary" /> Payment & Settlement Registry
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border space-y-1">
                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Gateway Provider</span>
                        <p className="font-black text-slate-900">Razorpay</p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border space-y-1">
                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Settlement Status</span>
                        <p className={cn("font-black uppercase text-[11px]", selectedOrder.settlementStatus === 'success' ? "text-emerald-700" : selectedOrder.settlementStatus === 'failed' ? "text-rose-700" : "text-slate-600")}>
                          {selectedOrder.settlementStatus || "Pending"}
                        </p>
                      </div>

                      {selectedOrder.razorpayPaymentId && (
                        <div className="p-3 bg-slate-50 rounded-xl border space-y-1 sm:col-span-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Razorpay Payment ID</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5" 
                              onClick={() => copyToClipboard(selectedOrder.razorpayPaymentId, "Payment ID")}
                            >
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                          <p className="font-mono text-xs font-bold text-slate-800 break-all">
                            {selectedOrder.razorpayPaymentId}
                          </p>
                        </div>
                      )}

                      {selectedOrder.razorpayOrderId && (
                        <div className="p-3 bg-slate-50 rounded-xl border space-y-1 sm:col-span-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Razorpay Order ID</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5" 
                              onClick={() => copyToClipboard(selectedOrder.razorpayOrderId, "Razorpay Order ID")}
                            >
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                          <p className="font-mono text-xs font-bold text-slate-800 break-all">
                            {selectedOrder.razorpayOrderId}
                          </p>
                        </div>
                      )}

                      {/* Refund Metadata */}
                      {selectedOrder.refundId && (
                        <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 sm:col-span-2 space-y-1.5">
                          <span className="text-[9px] font-black uppercase text-purple-700 tracking-wider">Refund Details</span>
                          <p className="font-mono text-xs font-bold text-purple-900">ID: {selectedOrder.refundId}</p>
                          {selectedOrder.recoveryReason && (
                            <p className="text-[11px] text-purple-800">Reason: {selectedOrder.recoveryReason}</p>
                          )}
                          {selectedOrder.refundedAt && (
                            <p className="text-[10px] text-purple-600 font-mono">
                              Refunded on {selectedOrder.refundedAt?.toDate ? format(selectedOrder.refundedAt.toDate(), 'dd MMM yyyy, hh:mm a') : 'Recently'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Order History Timeline */}
                  <Card className="border-none shadow-sm bg-white rounded-2xl p-5 border text-left space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5 text-primary" /> Order Timeline & Audit Trail
                    </p>

                    <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {/* Creation Event */}
                      <div className="relative text-xs">
                        <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full bg-primary border-2 border-white shadow-sm" />
                        <p className="font-black text-slate-900 uppercase text-[11px]">Order Created</p>
                        <p className="text-[10px] text-muted-foreground">
                          {orderDate ? format(orderDate, 'dd MMM yyyy, hh:mm a') : 'Recently'} via Storefront
                        </p>
                      </div>

                      {/* Paid Event */}
                      {isPaid && (
                        <div className="relative text-xs">
                          <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                          <p className="font-black text-emerald-800 uppercase text-[11px]">Payment Captured & Settled</p>
                          <p className="text-[10px] text-muted-foreground">
                            Verified via Razorpay ({selectedOrder.razorpayPaymentId || 'Recorded'})
                          </p>
                        </div>
                      )}

                      {/* Status History Array */}
                      {timeline.map((entry: any, i: number) => {
                        const entryDate = entry.changedAt ? new Date(entry.changedAt) : null;
                        return (
                          <div key={i} className="relative text-xs">
                            <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full bg-slate-400 border-2 border-white shadow-sm" />
                            <p className="font-black text-slate-900 uppercase text-[11px]">
                              Status: {entry.status}
                            </p>
                            {entry.note && (
                              <p className="text-[11px] text-slate-700 font-medium italic mt-0.5">&ldquo;{entry.note}&rdquo;</p>
                            )}
                            {entry.trackingNumber && (
                              <p className="text-[10px] font-mono text-indigo-700">Tracking: {entry.trackingNumber} ({entry.courierName || 'Carrier'})</p>
                            )}
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              {entryDate ? format(entryDate, 'dd MMM yyyy, hh:mm a') : 'Recorded'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Ship Order Dialog */}
      <Dialog open={shipDialogOpen} onOpenChange={setShipDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white text-left">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase text-slate-900">Mark Order as Shipped</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add courier carrier and tracking number to update the customer fulfillment record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-left">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Courier / Carrier Name</Label>
              <Input 
                placeholder="e.g. BlueDart, Delhivery, DTDC, FedEx" 
                value={carrierInput}
                onChange={(e) => setCarrierInput(e.target.value)}
                className="h-10 rounded-xl font-bold text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Tracking Number / AWB</Label>
              <Input 
                placeholder="e.g. BLU123456789" 
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                className="h-10 rounded-xl font-mono font-bold text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Fulfillment Note (Optional)</Label>
              <Textarea 
                placeholder="Dispatched via express road logistics..." 
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="rounded-xl text-xs"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShipDialogOpen(false)} className="rounded-xl font-black uppercase text-[10px]">
              Cancel
            </Button>
            <Button 
              onClick={executeShipOrder} 
              disabled={isPendingAction}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] rounded-xl shadow-md"
            >
              {isPendingAction ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Truck className="h-4 w-4 mr-1" />}
              Confirm Dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white text-left">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase text-rose-700">Cancel Order</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedOrder?.status === 'paid' || selectedOrder?.status === 'processing'
                ? "This order is paid. Cancelling will automatically refund the customer's payment via Razorpay and restore inventory stock."
                : "Are you sure you want to cancel this order?"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-left">
            <Label className="text-[10px] font-black uppercase text-muted-foreground">Cancellation Reason</Label>
            <Textarea 
              placeholder="e.g. Customer requested cancellation before dispatch..." 
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="rounded-xl text-xs"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} className="rounded-xl font-black uppercase text-[10px]">
              Back
            </Button>
            <Button 
              onClick={executeCancelOrder} 
              disabled={isPendingAction}
              className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[10px] rounded-xl shadow-md"
            >
              {isPendingAction ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Order Confirmation Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white text-left">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase text-slate-900">Issue Customer Refund</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Executes a secure Razorpay refund for this order using the hardened gateway idempotency key.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-left">
            <Label className="text-[10px] font-black uppercase text-muted-foreground">Refund Reason</Label>
            <Textarea 
              placeholder="e.g. Stock unavailable or return processed..." 
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="rounded-xl text-xs"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)} className="rounded-xl font-black uppercase text-[10px]">
              Cancel
            </Button>
            <Button 
              onClick={executeRefundOrder} 
              disabled={isPendingAction}
              className="bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] rounded-xl shadow-md"
            >
              {isPendingAction ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCcw className="h-4 w-4 mr-1" />}
              Dispatch Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
