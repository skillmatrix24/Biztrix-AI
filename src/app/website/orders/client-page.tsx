"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import {
  ShoppingBag,
  Search,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Package,
  Loader2,
  RefreshCcw,
  RotateCcw,
  XCircle,
  Truck,
  Check,
  Copy,
  ChevronLeft,
  Calendar,
  MapPin,
  Eye,
  History,
  CreditCard,
  Banknote,
  MessageCircle,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, doc, where, limit } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { refundOrder, settleUnsettledOrder } from "@/app/actions/payment-actions";
import { updateOrderStatus, cancelMerchantOrder } from "@/app/actions/order-actions";
import { syncStorefrontRelays } from "@/app/actions/website-actions";
import { determineRefundRestockEligibility } from "@/lib/storefront-engine";
import {
  PageHeader,
  KpiStatCard,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: any }
> = {
  created: {
    label: "Unpaid",
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-200",
    icon: Clock,
  },
  paid: {
    label: "Paid & Settled",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  processing: {
    label: "Processing",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: Package,
  },
  shipped: {
    label: "Shipped",
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    icon: Truck,
  },
  delivered: {
    label: "Delivered",
    color: "text-teal-700",
    bg: "bg-teal-50",
    border: "border-teal-200",
    icon: CheckCircle2,
  },
  payment_captured_unsettled: {
    label: "Stalled: No Stock",
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    icon: AlertCircle,
  },
  refund_pending: {
    label: "Refund Pending",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    icon: RefreshCcw,
  },
  refunded: {
    label: "Refunded",
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-200",
    icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    icon: XCircle,
  },
};

export default function StorefrontOrdersPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const ordersQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "orders"),
            where("source", "==", "storefront"),
            limit(150)
          )
        : null,
    [firestore, businessId]
  );
  const { data: rawOrders, isLoading: isOrdersLoading } = useCollection<any>(ordersQuery);
  const orders = useMemo(() => (Array.isArray(rawOrders) ? rawOrders : []), [rawOrders]);

  useEffect(() => {
    if (!businessId || !user?.uid) return;
    let active = true;
    user
      .getIdToken()
      .then((idToken) => {
        if (!active) return;
        syncStorefrontRelays({ businessId, idToken }).catch(() => {});
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [businessId, user]);

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [pageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [restockOnRefund, setRestockOnRefund] = useState(true);
  const [carrierInput, setCarrierInput] = useState("");
  const [trackingInput, setTrackingInput] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [isPendingAction, startTransition] = useTransition();

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find((o: any) => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o: any) => {
        const term = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !term ||
          (o.id || "").toLowerCase().includes(term) ||
          (o.customerData?.name || "").toLowerCase().includes(term) ||
          (o.customerData?.phone || "").toLowerCase().includes(term) ||
          (o.customerData?.email || "").toLowerCase().includes(term) ||
          (o.funnelSlug || "").toLowerCase().includes(term) ||
          (o.funnelId || "").toLowerCase().includes(term) ||
          (Array.isArray(o.items) &&
            o.items.some(
              (i: any) =>
                (i.name || "").toLowerCase().includes(term) ||
                (i.sku || "").toLowerCase().includes(term)
            ));

        const matchesStatus = statusFilter === "all" || o.status === statusFilter;

        let matchesPayment = true;
        if (paymentFilter === "paid") {
          matchesPayment =
            o.status === "paid" ||
            o.status === "processing" ||
            o.status === "shipped" ||
            o.status === "delivered";
        } else if (paymentFilter === "unpaid") {
          matchesPayment = o.status === "created";
        } else if (paymentFilter === "stalled") {
          matchesPayment = o.status === "payment_captured_unsettled";
        } else if (paymentFilter === "refunded") {
          matchesPayment = o.status === "refunded" || o.status === "refund_pending";
        }

        let matchesDate = true;
        if (dateFilter !== "all" && o.createdAt) {
          const orderDate = o.createdAt.toDate
            ? o.createdAt.toDate()
            : new Date(o.createdAt);
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
          const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return timeB - timeA;
        }
      });
  }, [orders, searchTerm, statusFilter, paymentFilter, dateFilter, sortBy]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const stats = useMemo(() => {
    const stalled = orders.filter(
      (o: any) => o.status === "payment_captured_unsettled"
    ).length;
    const paidOrders = orders.filter((o: any) =>
      ["paid", "processing", "shipped", "delivered"].includes(o.status)
    );
    const totalVolume = paidOrders.reduce(
      (sum: number, o: any) => sum + (parseFloat(o.amount) || 0),
      0
    );
    const activeProcessing = orders.filter(
      (o: any) => o.status === "processing" || o.status === "shipped"
    ).length;
    return { stalled, paidCount: paidOrders.length, totalVolume, activeProcessing };
  }, [orders]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  };

  const handleTransitionStatus = async (
    newStatus: string,
    options?: { note?: string; trackingNumber?: string; courierName?: string }
  ) => {
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
        idToken,
      });

      if (res.success) {
        toast({
          title: "Status Updated",
          description: res.message || `Order moved to ${newStatus}.`,
        });
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
      const idToken = await user.getIdToken();
      const res = await settleUnsettledOrder(user.uid, businessId, orderId, idToken);
      if (res.success) {
        toast({
          title: "Settlement Restored",
          description: "Inventory deducted and order confirmed as paid.",
        });
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
          idToken,
        });
        if (res.success) {
          toast({ title: "Order Cancelled", description: res.message });
          setCancelDialogOpen(false);
          setActionReason("");
        } else {
          toast({
            variant: "destructive",
            title: "Cancellation Failed",
            description: res.error,
          });
        }
      } finally {
        setIsProcessing(null);
      }
    });
  };

  const openRefundModalForOrder = (order: any) => {
    const eligibility = determineRefundRestockEligibility({
      orderStatus: order?.status || "",
    });
    setRestockOnRefund(eligibility.wasStockDeducted);
    setSelectedOrderId(order.id);
    setRefundDialogOpen(true);
  };

  const executeRefundOrder = () => {
    if (!selectedOrder || !user?.uid || !businessId) return;
    startTransition(async () => {
      setIsProcessing(selectedOrder.id);
      try {
        const idToken = await user.getIdToken();
        const res = await refundOrder(
          user.uid,
          businessId,
          selectedOrder.id,
          actionReason.trim() || "Customer requested refund",
          restockOnRefund,
          idToken
        );
        if (res.success) {
          toast({
            title: "Refund Completed",
            description: `Refund reference ${res.refundId} recorded and ledger updated.`,
          });
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
      <div className="flex items-center justify-center py-20 opacity-50">
        <Loader2 className="animate-spin text-slate-700 h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-left">
      <PageHeader
        breadcrumb="Store Builder · Orders"
        title="Storefront Orders"
        description="Manage customer fulfillment, payment settlement, shipments, and refunds."
        backHref="/website"
        backLabel="Back to Storefront Manager"
        icon={ShoppingBag}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiStatCard
          label="Storefront Orders"
          value={orders.length}
          subtext="Live customer registry"
          icon={ShoppingBag}
        />
        <KpiStatCard
          label="Needs Attention"
          value={stats.stalled}
          subtext={
            stats.stalled > 0 ? "Stock shortage recovery required" : "All orders healthy"
          }
          icon={AlertCircle}
          tone={stats.stalled > 0 ? "danger" : "positive"}
        />
        <KpiStatCard
          label="In Fulfillment"
          value={stats.activeProcessing}
          subtext="Processing or in transit"
          icon={Truck}
        />
        <KpiStatCard
          label="Settled Revenue"
          value={`${currencySymbol}${stats.totalVolume.toLocaleString()}`}
          subtext={`${stats.paidCount} successfully paid`}
          icon={TrendingUp}
          tone="dark"
        />
      </div>

      <SectionCard
        title="Order Registry"
        description="Search or filter orders and click any row to inspect fulfillment details."
        bodyClassName="p-0"
      >
        <div className="p-4 border-b border-slate-200 bg-slate-50/70">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search order ID, customer, phone, item..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 pl-9 rounded-xl border-slate-200 bg-white text-xs"
              />
            </div>

            <div className="lg:col-span-2">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-xs font-medium">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid & Settled</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="payment_captured_unsettled" className="text-rose-600">
                    Stalled: No Stock
                  </SelectItem>
                  <SelectItem value="created">Unpaid</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2">
              <Select
                value={paymentFilter}
                onValueChange={(val) => {
                  setPaymentFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-xs font-medium">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="paid">Paid (Captured)</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="stalled">Stalled Settlement</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2">
              <Select
                value={dateFilter}
                onValueChange={(val) => {
                  setDateFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-xs font-medium">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-xs font-medium">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="amount_high">Amount: High-Low</SelectItem>
                  <SelectItem value="amount_low">Amount: Low-High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-slate-50/80 border-b border-slate-200">
                <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">
                  Order / Timestamp
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">
                  Customer Details
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Items
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Order Status
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Payment
                </TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-600 h-11">
                  Total Amount
                </TableHead>
                <TableHead className="text-right pr-6 h-11 w-44 text-xs font-semibold text-slate-600">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isOrdersLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <Loader2 className="animate-spin h-7 w-7 mx-auto text-slate-500" />
                    <p className="text-xs text-slate-500 mt-3">Loading storefront ledger...</p>
                  </TableCell>
                </TableRow>
              ) : paginatedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-6">
                    <EmptyStatePanel
                      icon={ShoppingBag}
                      title="No orders match your filter criteria"
                      description="Clear filters or share your storefront link with customers to start taking orders."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrders.map((o: any) => {
                  const s = STATUS_CONFIG[o.status] || STATUS_CONFIG.created;
                  const Icon = s.icon;
                  const isLoad = isProcessing === o.id;

                  const isPaid = ["paid", "processing", "shipped", "delivered"].includes(
                    o.status
                  );
                  const isStalled = o.status === "payment_captured_unsettled";
                  const isRefunded =
                    o.status === "refunded" || o.status === "refund_pending";

                  const orderDate = o.createdAt?.toDate
                    ? o.createdAt.toDate()
                    : o.createdAt
                      ? new Date(o.createdAt)
                      : null;
                  const itemCount = Array.isArray(o.items)
                    ? o.items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0)
                    : 0;

                  return (
                    <TableRow
                      key={o.id}
                      className="group hover:bg-slate-50/70 transition-colors border-b border-slate-100 cursor-pointer"
                      onClick={() => setSelectedOrderId(o.id)}
                    >
                      <TableCell className="pl-6 py-4 text-left">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border",
                              s.bg,
                              s.color,
                              s.border
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-mono font-semibold text-slate-900 truncate">
                              {o.id}
                            </p>
                            <p className="text-xs text-slate-500 font-mono tabular-nums flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              {orderDate
                                ? format(orderDate, "dd MMM yyyy, hh:mm a")
                                : "Recently"}
                            </p>
                            {(o.funnelSlug || o.funnelId) && (
                              <Badge
                                variant="outline"
                                className="mt-1 text-[11px] bg-indigo-50 text-indigo-700 border-indigo-200 px-1.5 py-0 h-5 gap-1"
                              >
                                <Sparkles className="h-2.5 w-2.5" />{" "}
                                {o.funnelSlug || o.funnelId}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-left">
                        <p className="text-sm font-medium text-slate-900">
                          {o.customerData?.name || "Storefront Client"}
                        </p>
                        <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                          {o.customerData?.phone || "No phone"}
                        </p>
                      </TableCell>

                      <TableCell className="text-center text-xs text-slate-700 font-mono tabular-nums">
                        <span className="font-semibold text-slate-900">{itemCount}</span> items
                        <span className="text-slate-400 ml-1">
                          ({(o.items || []).length} SKUs)
                        </span>
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn("text-[11px] font-semibold px-2.5 py-0.5", s.bg, s.color, s.border)}
                        >
                          {s.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          {isStalled ? (
                            <Badge
                              variant="outline"
                              className="text-[11px] bg-rose-50 text-rose-700 border-rose-200"
                            >
                              Captured (Stalled)
                            </Badge>
                          ) : isRefunded ? (
                            <Badge
                              variant="outline"
                              className="text-[11px] bg-slate-100 text-slate-700 border-slate-200"
                            >
                              Refunded
                            </Badge>
                          ) : o.settlementStatus === "success" || o.status === "paid" ? (
                            <Badge
                              variant="outline"
                              className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200"
                            >
                              Paid & Settled
                            </Badge>
                          ) : isPaid ? (
                            <Badge
                              variant="outline"
                              className="text-[11px] bg-amber-50 text-amber-700 border-amber-200"
                            >
                              Pay on Delivery
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[11px] bg-slate-100 text-slate-600 border-slate-200"
                            >
                              Unpaid
                            </Badge>
                          )}
                          <span className="text-[11px] text-slate-500">
                            {o.paymentMethod === "COD"
                              ? "COD"
                              : o.paymentMethod === "WHATSAPP"
                                ? "WhatsApp"
                                : "Online"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-mono tabular-nums font-semibold text-sm text-slate-900">
                        {currencySymbol}
                        {parseFloat(o.amount || 0).toLocaleString()}
                      </TableCell>

                      <TableCell
                        className="text-right pr-6"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isStalled ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              onClick={() => openRefundModalForOrder(o)}
                              disabled={isLoad}
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs font-semibold text-rose-600 border-rose-200 bg-white hover:bg-rose-50 rounded-lg"
                            >
                              Refund
                            </Button>
                            <Button
                              type="button"
                              onClick={() => handleManualSettle(o.id)}
                              disabled={isLoad}
                              size="sm"
                              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                            >
                              {isLoad ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              )}
                              Retry
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
                            onClick={() => setSelectedOrderId(o.id)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" /> View Details
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

        <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-slate-600 font-mono tabular-nums">
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {filteredOrders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(currentPage * pageSize, filteredOrders.length)}
            </span>{" "}
            of <span className="font-semibold text-slate-900">{filteredOrders.length}</span>{" "}
            orders
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-xs font-semibold"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="text-xs font-mono tabular-nums font-semibold px-2 text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-xs font-semibold"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </SectionCard>

      <Sheet
        open={Boolean(selectedOrderId)}
        onOpenChange={(open) => !open && setSelectedOrderId(null)}
      >
        <SheetContent className="sm:max-w-2xl w-full p-0 overflow-y-auto bg-slate-50 text-left border-l border-slate-200">
          {selectedOrder &&
            (() => {
              const currentStatusCfg =
                STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.created;
              const orderDate = selectedOrder.createdAt?.toDate
                ? selectedOrder.createdAt.toDate()
                : selectedOrder.createdAt
                  ? new Date(selectedOrder.createdAt)
                  : null;
              const isStalled = selectedOrder.status === "payment_captured_unsettled";
              const isPaid = ["paid", "processing", "shipped", "delivered"].includes(
                selectedOrder.status
              );
              const isTerminal = ["delivered", "cancelled", "refunded"].includes(
                selectedOrder.status
              );

              const timeline = Array.isArray(selectedOrder.statusHistory)
                ? selectedOrder.statusHistory
                : [];

              return (
                <div className="space-y-5 pb-16">
                  <div className="sticky top-0 z-20 bg-slate-900 text-white p-6 flex items-start justify-between gap-4">
                    <div className="space-y-1.5 text-left min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-slate-300">
                          Storefront Order
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] font-semibold h-5 px-2",
                            currentStatusCfg.bg,
                            currentStatusCfg.color,
                            currentStatusCfg.border
                          )}
                        >
                          {currentStatusCfg.label}
                        </Badge>
                        {(selectedOrder.funnelSlug || selectedOrder.funnelId) && (
                          <Badge
                            variant="outline"
                            className="text-[11px] bg-white/10 text-white border-white/20 h-5 px-2 gap-1"
                          >
                            <Sparkles className="h-3 w-3" />{" "}
                            {selectedOrder.funnelSlug || selectedOrder.funnelId}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white font-mono truncate">
                          {selectedOrder.id}
                        </h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Copy Order ID"
                          className="h-7 w-7 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
                          onClick={() => copyToClipboard(selectedOrder.id, "Order ID")}
                        >
                          {copiedKey === "Order ID" ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-slate-300 font-mono tabular-nums">
                        Created{" "}
                        {orderDate
                          ? format(orderDate, "dd MMMM yyyy, hh:mm:ss a")
                          : "Recently"}
                      </p>
                    </div>
                    <SheetClose asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Close order details"
                        className="h-8 w-8 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
                      >
                        <XCircle className="h-5 w-5" />
                      </Button>
                    </SheetClose>
                  </div>

                  <div className="px-6 space-y-5 text-left">
                    {isStalled && (
                      <div className="p-5 bg-rose-50 rounded-2xl border border-rose-200 space-y-3">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-rose-600" />
                          <h4 className="text-sm font-bold text-rose-900">
                            Settlement Stalled: Stockout Detected
                          </h4>
                        </div>
                        <p className="text-xs text-rose-800 leading-relaxed">
                          Payment was captured by Razorpay, but inventory deduction could not be
                          completed because stock was exhausted. Replenish inventory and retry
                          settlement, or issue a refund.
                        </p>
                        <div className="flex gap-2.5 pt-1">
                          <Button
                            type="button"
                            onClick={() => handleManualSettle(selectedOrder.id)}
                            disabled={Boolean(isProcessing)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 rounded-xl"
                          >
                            {isProcessing === selectedOrder.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <RotateCcw className="h-4 w-4 mr-1" />
                            )}
                            Retry Settlement
                          </Button>
                          <Button
                            type="button"
                            onClick={() => openRefundModalForOrder(selectedOrder)}
                            disabled={Boolean(isProcessing)}
                            variant="outline"
                            className="border-rose-300 text-rose-700 hover:bg-rose-100 font-semibold text-xs h-9 rounded-xl"
                          >
                            Refund Customer
                          </Button>
                        </div>
                      </div>
                    )}

                    <SectionCard
                      title="Order Lifecycle Actions"
                      headerRight={
                        <span className="text-xs font-semibold text-slate-600">
                          Current: {currentStatusCfg.label}
                        </span>
                      }
                    >
                      <div className="flex flex-wrap gap-2.5">
                        {selectedOrder.status === "created" && (
                          <>
                            <Button
                              type="button"
                              onClick={() =>
                                handleTransitionStatus("processing", {
                                  note: "Order confirmed & inventory reserved by merchant",
                                })
                              }
                              disabled={Boolean(isProcessing)}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-9 rounded-xl"
                            >
                              <Package className="h-3.5 w-3.5 mr-1.5" /> Confirm Order (Reserve
                              Stock)
                            </Button>
                            <Button
                              type="button"
                              onClick={() =>
                                handleTransitionStatus("paid", {
                                  note: "Payment received & settled by merchant",
                                })
                              }
                              disabled={Boolean(isProcessing)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 rounded-xl"
                            >
                              <Banknote className="h-3.5 w-3.5 mr-1.5" /> Mark Paid & Settled
                            </Button>
                          </>
                        )}

                        {selectedOrder.status === "paid" && (
                          <Button
                            type="button"
                            onClick={() => handleTransitionStatus("processing")}
                            disabled={Boolean(isProcessing)}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-9 rounded-xl"
                          >
                            <Package className="h-3.5 w-3.5 mr-1.5" /> Start Processing
                          </Button>
                        )}

                        {selectedOrder.status === "processing" &&
                          selectedOrder.settlementStatus !== "success" &&
                          !selectedOrder.razorpayPaymentId && (
                            <Button
                              type="button"
                              onClick={() =>
                                handleTransitionStatus("paid", {
                                  note: "Offline COD/UPI payment collected",
                                })
                              }
                              disabled={Boolean(isProcessing)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 rounded-xl"
                            >
                              <Banknote className="h-3.5 w-3.5 mr-1.5" /> Mark Cash/UPI
                              Collected
                            </Button>
                          )}

                        {(selectedOrder.status === "paid" ||
                          selectedOrder.status === "processing") && (
                          <Button
                            type="button"
                            onClick={() => setShipDialogOpen(true)}
                            disabled={Boolean(isProcessing)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 rounded-xl"
                          >
                            <Truck className="h-3.5 w-3.5 mr-1.5" /> Mark Shipped
                          </Button>
                        )}

                        {selectedOrder.status === "shipped" && (
                          <Button
                            type="button"
                            onClick={() => handleTransitionStatus("delivered")}
                            disabled={Boolean(isProcessing)}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-9 rounded-xl"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Confirm Delivered
                          </Button>
                        )}

                        {!isTerminal &&
                          selectedOrder.status !== "payment_captured_unsettled" && (
                            <Button
                              type="button"
                              onClick={() => setCancelDialogOpen(true)}
                              disabled={Boolean(isProcessing)}
                              variant="outline"
                              className="border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs h-9 rounded-xl"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1.5" /> Cancel Order
                            </Button>
                          )}

                        {isPaid && selectedOrder.status !== "refunded" && (
                          <Button
                            type="button"
                            onClick={() => openRefundModalForOrder(selectedOrder)}
                            disabled={Boolean(isProcessing)}
                            variant="outline"
                            className="border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs h-9 rounded-xl"
                          >
                            Issue Refund
                          </Button>
                        )}
                      </div>
                    </SectionCard>

                    <SectionCard
                      title="Customer & Delivery Details"
                      headerRight={<User className="h-4 w-4 text-slate-400" />}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-xs text-slate-500">Customer Name</span>
                          <p className="text-sm font-semibold text-slate-900">
                            {selectedOrder.customerData?.name || "Walk-in Customer"}
                          </p>
                          {selectedOrder.customerId && (
                            <p className="text-xs font-mono text-slate-500">
                              ID: {selectedOrder.customerId}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <span className="text-xs text-slate-500">Contact Phone</span>
                          <p className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                            {selectedOrder.customerData?.phone || "No phone"}
                          </p>
                          {selectedOrder.customerData?.phone && (
                            <div className="flex gap-2 pt-1">
                              <a
                                href={`https://wa.me/${selectedOrder.customerData.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${selectedOrder.customerData.name || ""}, regarding your order #${selectedOrder.id}:`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg hover:bg-emerald-100"
                              >
                                WhatsApp Customer
                              </a>
                              <a
                                href={`tel:${selectedOrder.customerData.phone}`}
                                className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg hover:bg-slate-200"
                              >
                                Call
                              </a>
                            </div>
                          )}
                        </div>

                        {selectedOrder.customerData?.email && (
                          <div className="space-y-1 sm:col-span-2">
                            <span className="text-xs text-slate-500">Email</span>
                            <p className="text-sm font-medium text-slate-800">
                              {selectedOrder.customerData.email}
                            </p>
                          </div>
                        )}

                        <div className="space-y-1 sm:col-span-2">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" /> Delivery Address
                          </span>
                          <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                            {selectedOrder.customerData?.address ||
                              "No delivery address supplied (Walk-in or In-store Pickup)."}
                          </p>
                        </div>

                        {(selectedOrder.trackingNumber || selectedOrder.courierName) && (
                          <div className="space-y-2 sm:col-span-2 bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-200">
                            <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                              <Truck className="h-3.5 w-3.5" /> Shipment Tracking Info
                            </span>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-slate-500">Courier / Carrier:</span>
                                <p className="font-semibold text-slate-900">
                                  {selectedOrder.courierName || "Standard Delivery"}
                                </p>
                              </div>
                              <div>
                                <span className="text-slate-500">Tracking Number:</span>
                                <p className="font-mono font-semibold text-slate-900">
                                  {selectedOrder.trackingNumber || "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </SectionCard>

                    <SectionCard
                      title="Purchased Items"
                      headerRight={
                        <span className="text-xs font-mono font-semibold text-slate-600">
                          {(selectedOrder.items || []).length} SKUs
                        </span>
                      }
                    >
                      <div className="space-y-3">
                        {(selectedOrder.items || []).map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-xs"
                          >
                            <div className="space-y-1 min-w-0 pr-4">
                              <p className="font-semibold text-sm text-slate-900 truncate">
                                {item.name}
                              </p>
                              <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-500">
                                {item.sku && (
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                                    SKU: {item.sku}
                                  </span>
                                )}
                                <span>Qty: {item.quantity}</span>
                                <span>
                                  × {currencySymbol}
                                  {parseFloat(item.price || 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <div className="text-right font-mono tabular-nums font-semibold text-sm text-slate-900 shrink-0">
                              {currencySymbol}
                              {(
                                parseFloat(item.price || 0) * (item.quantity || 1)
                              ).toLocaleString()}
                            </div>
                          </div>
                        ))}

                        <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
                          <div className="flex justify-between text-slate-600">
                            <span>Subtotal</span>
                            <span className="font-mono tabular-nums">
                              {currencySymbol}
                              {parseFloat(selectedOrder.amount || 0).toLocaleString()}
                            </span>
                          </div>
                          {selectedOrder.discountAmount && (
                            <div className="flex justify-between text-emerald-700 font-medium">
                              <span>Discount</span>
                              <span className="font-mono tabular-nums">
                                -{currencySymbol}
                                {parseFloat(selectedOrder.discountAmount).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {selectedOrder.taxAmount && (
                            <div className="flex justify-between text-slate-600">
                              <span>Tax (GST)</span>
                              <span className="font-mono tabular-nums">
                                {currencySymbol}
                                {parseFloat(selectedOrder.taxAmount).toLocaleString()}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-base text-slate-900 pt-2 border-t border-slate-200">
                            <span>Grand Total</span>
                            <span className="font-mono tabular-nums">
                              {currencySymbol}
                              {parseFloat(selectedOrder.amount || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard
                      title="Payment & Settlement Registry"
                      headerRight={<CreditCard className="h-4 w-4 text-slate-400" />}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                          <span className="text-slate-500">Payment Channel</span>
                          <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                            {selectedOrder.paymentMethod === "COD" ? (
                              <>
                                <Banknote className="h-3.5 w-3.5 text-amber-600" /> Cash on
                                Delivery
                              </>
                            ) : selectedOrder.paymentMethod === "WHATSAPP" ? (
                              <>
                                <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />{" "}
                                WhatsApp Order
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-3.5 w-3.5 text-slate-700" /> Razorpay
                                Gateway
                              </>
                            )}
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                          <span className="text-slate-500">Settlement Status</span>
                          <p
                            className={cn(
                              "font-semibold capitalize text-xs",
                              selectedOrder.settlementStatus === "success"
                                ? "text-emerald-700"
                                : selectedOrder.settlementStatus === "failed"
                                  ? "text-rose-700"
                                  : "text-slate-700"
                            )}
                          >
                            {selectedOrder.settlementStatus || "Pending"}
                          </p>
                        </div>

                        {selectedOrder.razorpayPaymentId && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 sm:col-span-2">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">Razorpay Payment ID</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Copy Payment ID"
                                className="h-6 w-6"
                                onClick={() =>
                                  copyToClipboard(
                                    selectedOrder.razorpayPaymentId,
                                    "Payment ID"
                                  )
                                }
                              >
                                <Copy className="h-3.5 w-3.5 text-slate-500" />
                              </Button>
                            </div>
                            <p className="font-mono text-xs font-semibold text-slate-800 break-all">
                              {selectedOrder.razorpayPaymentId}
                            </p>
                          </div>
                        )}

                        {selectedOrder.razorpayOrderId && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 sm:col-span-2">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">Razorpay Order ID</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Copy Razorpay Order ID"
                                className="h-6 w-6"
                                onClick={() =>
                                  copyToClipboard(
                                    selectedOrder.razorpayOrderId,
                                    "Razorpay Order ID"
                                  )
                                }
                              >
                                <Copy className="h-3.5 w-3.5 text-slate-500" />
                              </Button>
                            </div>
                            <p className="font-mono text-xs font-semibold text-slate-800 break-all">
                              {selectedOrder.razorpayOrderId}
                            </p>
                          </div>
                        )}

                        {selectedOrder.refundId && (
                          <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 sm:col-span-2 space-y-1">
                            <span className="font-semibold text-purple-800">Refund Details</span>
                            <p className="font-mono text-xs font-semibold text-purple-900">
                              ID: {selectedOrder.refundId}
                            </p>
                            {selectedOrder.recoveryReason && (
                              <p className="text-xs text-purple-800">
                                Reason: {selectedOrder.recoveryReason}
                              </p>
                            )}
                            {selectedOrder.refundedAt && (
                              <p className="text-xs text-purple-700 font-mono">
                                Refunded{" "}
                                {selectedOrder.refundedAt?.toDate
                                  ? format(
                                      selectedOrder.refundedAt.toDate(),
                                      "dd MMM yyyy, hh:mm a"
                                    )
                                  : "Recently"}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </SectionCard>

                    <SectionCard
                      title="Order Timeline & Audit Trail"
                      headerRight={<History className="h-4 w-4 text-slate-400" />}
                    >
                      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                        <div className="relative text-xs">
                          <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-slate-900 border-2 border-white" />
                          <p className="font-semibold text-slate-900">Order Created</p>
                          <p className="text-xs font-mono text-slate-500">
                            {orderDate
                              ? format(orderDate, "dd MMM yyyy, hh:mm a")
                              : "Recently"}{" "}
                            via Storefront
                          </p>
                        </div>

                        {isPaid && (
                          <div className="relative text-xs">
                            <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                            <p className="font-semibold text-emerald-800">
                              Payment Captured & Settled
                            </p>
                            <p className="text-xs font-mono text-slate-500">
                              Verified ({selectedOrder.razorpayPaymentId || "Recorded"})
                            </p>
                          </div>
                        )}

                        {timeline.map((entry: any, i: number) => {
                          const entryDate = entry.changedAt ? new Date(entry.changedAt) : null;
                          return (
                            <div key={i} className="relative text-xs">
                              <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-slate-400 border-2 border-white" />
                              <p className="font-semibold text-slate-900 capitalize">
                                Status: {entry.status}
                              </p>
                              {entry.note && (
                                <p className="text-xs text-slate-600 mt-0.5">{entry.note}</p>
                              )}
                              {entry.trackingNumber && (
                                <p className="text-xs font-mono text-indigo-700 mt-0.5">
                                  Tracking: {entry.trackingNumber} (
                                  {entry.courierName || "Carrier"})
                                </p>
                              )}
                              <p className="text-xs font-mono text-slate-400 mt-0.5">
                                {entryDate
                                  ? format(entryDate, "dd MMM yyyy, hh:mm a")
                                  : "Recorded"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </SectionCard>
                  </div>
                </div>
              );
            })()}
        </SheetContent>
      </Sheet>

      <Dialog open={shipDialogOpen} onOpenChange={setShipDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden text-left">
          <DialogHeader className="p-5 bg-slate-900 text-white text-left">
            <DialogTitle className="text-base font-bold text-white">
              Mark Order as Shipped
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300">
              Add courier carrier and tracking number to update the customer record.
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-4 text-left">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Courier / Carrier Name
              </Label>
              <Input
                placeholder="e.g. BlueDart, Delhivery, DTDC, FedEx"
                value={carrierInput}
                onChange={(e) => setCarrierInput(e.target.value)}
                className="h-10 rounded-xl border-slate-200 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Tracking Number / AWB
              </Label>
              <Input
                placeholder="e.g. BLU123456789"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                className="h-10 rounded-xl border-slate-200 font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Fulfillment Note (Optional)
              </Label>
              <Textarea
                placeholder="Dispatched via express road logistics..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="rounded-xl border-slate-200 text-sm"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShipDialogOpen(false)}
              className="rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={executeShipOrder}
              disabled={isPendingAction}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl"
            >
              {isPendingAction ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Truck className="h-4 w-4 mr-1.5" />
              )}
              Confirm Dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden text-left">
          <DialogHeader className="p-5 bg-slate-900 text-white text-left">
            <DialogTitle className="text-base font-bold text-white">Cancel Order</DialogTitle>
            <DialogDescription className="text-xs text-slate-300">
              {selectedOrder?.status === "paid" || selectedOrder?.status === "processing"
                ? "This order is paid. Cancelling will automatically refund the customer via Razorpay and restore inventory stock."
                : "Are you sure you want to cancel this order?"}
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-2 text-left">
            <Label className="text-xs font-semibold text-slate-700">
              Cancellation Reason
            </Label>
            <Textarea
              placeholder="e.g. Customer requested cancellation before dispatch..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="rounded-xl border-slate-200 text-sm"
              rows={3}
            />
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              className="rounded-xl text-xs font-semibold"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={executeCancelOrder}
              disabled={isPendingAction}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl"
            >
              {isPendingAction ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <XCircle className="h-4 w-4 mr-1.5" />
              )}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden text-left">
          <DialogHeader className="p-5 bg-slate-900 text-white text-left">
            <DialogTitle className="text-base font-bold text-white">
              Issue Customer Refund
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300">
              {selectedOrder?.razorpayPaymentId
                ? "Executes a Razorpay gateway refund and records a debit entry in your Cashbook ledger."
                : "Marks this offline order as refunded, updates inventory if selected, and syncs your Cashbook ledger."}
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-4 text-left">
            {(() => {
              const eligibility = determineRefundRestockEligibility({
                orderStatus: selectedOrder?.status || "",
              });
              return (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="space-y-0.5 pr-3">
                    <Label className="text-xs font-semibold text-slate-900">
                      Restock Inventory Units
                    </Label>
                    <p className="text-xs text-slate-500 leading-snug">
                      {eligibility.wasStockDeducted
                        ? "Add purchased item quantities back to your active product stock."
                        : "Stock was never deducted for this stalled order."}
                    </p>
                  </div>
                  <Switch
                    checked={eligibility.wasStockDeducted ? restockOnRefund : false}
                    disabled={!eligibility.wasStockDeducted}
                    onCheckedChange={setRestockOnRefund}
                    aria-label="Restock Inventory Units"
                  />
                </div>
              );
            })()}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Refund Reason</Label>
              <Textarea
                placeholder="e.g. Customer return processed or stock unavailable..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="rounded-xl border-slate-200 text-sm"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRefundDialogOpen(false)}
              className="rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={executeRefundOrder}
              disabled={isPendingAction}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl"
            >
              {isPendingAction ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <RefreshCcw className="h-4 w-4 mr-1.5" />
              )}
              Dispatch Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
