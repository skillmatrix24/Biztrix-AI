"use client";

import { useState, useMemo } from "react";
import {
  Zap,
  Plus,
  Ticket,
  TrendingUp,
  Clock,
  Edit2,
  Trash2,
  CheckCircle2,
  Bot,
  Sparkles,
  Search,
  History,
  Layers,
  ShieldCheck,
  BadgeCheck,
  RefreshCcw,
  Loader2,
  PlusSquare,
  Info,
  Download,
  FileSpreadsheet,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageHeader,
  KpiStatCard,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  useCollection,
  setDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase";
import {
  collection,
  doc,
  query,
  orderBy,
  serverTimestamp,
  where,
  limit,
} from "firebase/firestore";

const OFFER_TYPES = [
  { id: "percentage", label: "Percentage (%)" },
  { id: "fixed", label: "Flat Amount (₹)" },
];

export default function MarketingPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: profile, isLoading: isProfileLoading } =
    useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const couponsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "coupons"),
            orderBy("code", "asc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: couponsData, isLoading: isCouponsLoading } =
    useCollection<any>(couponsQuery);
  const coupons = useMemo(() => couponsData || [], [couponsData]);

  const activitiesQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "loyaltyActivity"),
            where("type", "==", "coupon_redeem"),
            orderBy("timestamp", "desc"),
            limit(200)
          )
        : null,
    [firestore, businessId]
  );
  const { data: redemptionsData } = useCollection<any>(activitiesQuery);
  const redemptions = useMemo(() => redemptionsData || [], [redemptionsData]);

  const [activeTab, setActiveTab] = useState("coupons");
  const [searchTerm, setSearchTerm] = useState("");
  const [redemptionSearchTerm, setRedemptionSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    type: "percentage",
    value: "10",
    minOrder: "0",
    usageProtocol: "single" as "single" | "multiple",
    expiry: "",
    status: "active",
  });

  const [bulkPrefix, setBulkPrefix] = useState("SAVE");
  const [bulkQty, setBulkQty] = useState("10");
  const [isGenerating, setIsGenerating] = useState(false);

  const lastUsageMap = useMemo(() => {
    const map: Record<string, string> = {};
    redemptions.forEach((r: any) => {
      if (r.couponCode && !map[r.couponCode]) {
        map[r.couponCode] = r.customerName;
      }
    });
    return map;
  }, [redemptions]);

  const stats = useMemo(() => {
    const active = coupons.filter((c) => c.status === "active").length;
    const totalRedeemed = redemptions.length;
    const totalSavings = redemptions.reduce(
      (sum: number, r: any) => sum + (parseFloat(r.cashback) || 0),
      0
    );
    return { active, totalRedeemed, totalSavings };
  }, [coupons, redemptions]);

  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) =>
      c.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [coupons, searchTerm]);

  const filteredRedemptions = useMemo(() => {
    if (!redemptionSearchTerm.trim()) return redemptions;
    const term = redemptionSearchTerm.toLowerCase();
    return redemptions.filter(
      (r: any) =>
        r.customerName?.toLowerCase().includes(term) ||
        r.couponCode?.toLowerCase().includes(term) ||
        r.customerId?.toLowerCase().includes(term)
    );
  }, [redemptions, redemptionSearchTerm]);

  const handleExportCoupons = () => {
    if (!coupons || coupons.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "Coupons registry is empty.",
      });
      return;
    }
    const headers = [
      "Coupon Code",
      "Type",
      "Value",
      "Min Order",
      "Usage Limit",
      "Usage Count",
      "Status",
      "Expiry",
      "Last Used By",
    ];
    const csvRows = coupons.map((c) =>
      [
        c.code,
        c.type?.toUpperCase(),
        c.value,
        c.minOrder || 0,
        c.usageLimit === 1 ? "Single" : "Multiple",
        c.usageCount || 0,
        c.status?.toUpperCase(),
        c.expiry || "Lifetime",
        `"${lastUsageMap[c.code] || "N/A"}"`,
      ].join(",")
    );
    const csvContent = headers.join(",") + "\n" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `coupons_registry_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.click();
    toast({ title: "Coupons Exported" });
  };

  const handleExportRedemptions = () => {
    if (!redemptions || redemptions.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "No redemptions to export.",
      });
      return;
    }
    const headers = [
      "Customer Name",
      "Customer ID",
      "Coupon Code",
      "Savings",
      "Timestamp",
      "Description",
    ];
    const csvRows = redemptions.map((r) =>
      [
        `"${r.customerName}"`,
        r.customerId,
        r.couponCode,
        r.cashback || 0,
        `"${new Date(r.timestamp).toLocaleString()}"`,
        `"${r.description || ""}"`,
      ].join(",")
    );
    const csvContent = headers.join(",") + "\n" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `redemptions_report_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.click();
    toast({ title: "Redemptions Exported" });
  };

  const handleSaveCoupon = () => {
    if (!formData.code || !businessId) return;
    const id = formData.code.toUpperCase().replace(/\s+/g, "");
    const docRef = doc(firestore, "businesses", businessId, "coupons", id);

    setDocumentNonBlocking(
      docRef,
      {
        ...formData,
        id,
        code: id,
        value: parseFloat(formData.value),
        minOrder: parseFloat(formData.minOrder) || 0,
        usageLimit: formData.usageProtocol === "single" ? 1 : 0,
        usageCount: isEditing
          ? coupons.find((c) => c.id === id)?.usageCount || 0
          : 0,
        updatedAt: serverTimestamp(),
        ...(isEditing ? {} : { createdAt: serverTimestamp() }),
      },
      { merge: true }
    );

    setIsAddOpen(false);
    resetForm();
    toast({ title: isEditing ? "Coupon Updated" : "Coupon Created" });
  };

  const handleEdit = (coupon: any) => {
    setFormData({
      code: coupon.code || "",
      type: coupon.type || "percentage",
      value: (coupon.value || 0).toString(),
      minOrder: (coupon.minOrder || 0).toString(),
      usageProtocol: coupon.usageLimit === 1 ? "single" : "multiple",
      expiry: coupon.expiry || "",
      status: coupon.status || "active",
    });
    setIsEditing(true);
    setIsAddOpen(true);
  };

  const resetForm = () => {
    setFormData({
      code: "",
      type: "percentage",
      value: "10",
      minOrder: "0",
      usageProtocol: "single",
      expiry: "",
      status: "active",
    });
    setIsEditing(false);
  };

  const handleBulkGenerate = async () => {
    if (!businessId || isGenerating) return;
    setIsGenerating(true);
    const qty = parseInt(bulkQty) || 10;

    try {
      for (let i = 0; i < qty; i++) {
        const uniqueId = Math.random()
          .toString(36)
          .substr(2, 6)
          .toUpperCase();
        const code = `${bulkPrefix}-${uniqueId}`;
        const docRef = doc(firestore, "businesses", businessId, "coupons", code);

        setDocumentNonBlocking(
          docRef,
          {
            id: code,
            code,
            type: formData.type,
            value: parseFloat(formData.value),
            minOrder: parseFloat(formData.minOrder) || 0,
            usageLimit: formData.usageProtocol === "single" ? 1 : 0,
            usageCount: 0,
            status: "active",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
      toast({
        title: "Bulk Coupons Generated",
        description: `${qty} unique promo codes added.`,
      });
      setIsBulkOpen(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Generation Failed" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!businessId) return;
    deleteDocumentNonBlocking(
      doc(firestore, "businesses", businessId, "coupons", id)
    );
    toast({ title: "Coupon Deleted", variant: "destructive" });
  };

  const handleDeleteRedemption = (id: string) => {
    if (!businessId) return;
    deleteDocumentNonBlocking(
      doc(firestore, "businesses", businessId, "loyaltyActivity", id)
    );
    toast({
      title: "Log Entry Removed",
      description: "Audit feed updated while preserving usage limits.",
    });
  };

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-6 w-6 text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 text-left">
      <PageHeader
        title="Marketing & Promotions"
        description="Manage promo codes, bulk voucher batches, and track coupon redemptions."
        breadcrumb="Growth Suite"
        icon={Zap}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setIsBulkOpen(true)}
              className="h-10 px-4 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs"
            >
              <Layers className="mr-2 h-4 w-4" /> Bulk Generator
            </Button>
            <Button
              onClick={() => {
                resetForm();
                setIsAddOpen(true);
              }}
              className="bg-slate-900 hover:bg-slate-800 h-10 px-5 font-semibold text-xs rounded-xl text-white"
            >
              <Plus className="mr-2 h-4 w-4" /> New Coupon
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiStatCard
          label="Active Campaigns"
          value={stats.active}
          subtext="Live promo codes"
          icon={Ticket}
        />
        <KpiStatCard
          label="Total Redemptions"
          value={stats.totalRedeemed}
          subtext="Verified uses"
          icon={CheckCircle2}
          tone="positive"
        />
        <KpiStatCard
          label="Savings Distributed"
          value={`${currencySymbol}${stats.totalSavings.toLocaleString()}`}
          subtext="Cumulative customer benefit"
          icon={TrendingUp}
        />
        <KpiStatCard
          label="Engagement Lift"
          value="+8.5%"
          subtext="Repeat checkout uplift"
          icon={Sparkles}
          tone="dark"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-white border border-slate-200 h-11 p-1 rounded-xl flex overflow-x-auto scrollbar-hide w-full sm:w-fit">
          <TabsTrigger
            value="coupons"
            className="rounded-lg px-4 text-xs font-semibold gap-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            <Ticket className="h-4 w-4" /> Coupons Registry
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="rounded-lg px-4 text-xs font-semibold gap-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            <History className="h-4 w-4" /> Redemption Feed
          </TabsTrigger>
          <TabsTrigger
            value="insights"
            className="rounded-lg px-4 text-xs font-semibold gap-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            <Bot className="h-4 w-4" /> Strategy Suggestions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coupons" className="m-0 space-y-5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search promo code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 pl-9 rounded-xl bg-white border-slate-200 text-xs"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleExportCoupons}
                variant="outline"
                size="sm"
                className="h-9 px-3.5 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs gap-1.5 bg-white"
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
              <span className="text-xs font-semibold font-mono tabular-nums text-slate-500">
                {filteredCoupons.length} codes
              </span>
            </div>
          </div>

          {isCouponsLoading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="animate-spin text-slate-400 h-7 w-7" />
            </div>
          ) : filteredCoupons.length === 0 ? (
            <EmptyStatePanel
              icon={Ticket}
              title="No matching coupons"
              description="Create a single promo code or generate a bulk voucher batch to get started."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredCoupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className={cn(
                    "bg-white rounded-2xl border border-slate-200 overflow-hidden text-left flex flex-col justify-between",
                    coupon.status === "expired" && "opacity-65"
                  )}
                >
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        <Ticket className="h-4 w-4 text-slate-700" />
                      </div>
                      <p className="text-sm font-bold text-slate-900 font-mono truncate">
                        {coupon.code}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold capitalize shrink-0",
                        coupon.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      )}
                    >
                      {coupon.status}
                    </span>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-end gap-2">
                      <div>
                        <p className="text-xs text-slate-500">Discount Value</p>
                        <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                          {coupon.type === "percentage"
                            ? `${coupon.value}% OFF`
                            : `${currencySymbol}${coupon.value} FLAT`}
                        </p>
                      </div>
                      <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        {coupon.usageLimit === 1
                          ? "Single Use"
                          : `Limit: ${coupon.usageLimit || "Unlimited"}`}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium text-slate-500 font-mono tabular-nums">
                        <span>Redemptions</span>
                        <span>
                          {coupon.usageCount || 0} /{" "}
                          {coupon.usageLimit || "∞"}
                        </span>
                      </div>
                      <Progress
                        value={
                          coupon.usageLimit
                            ? (coupon.usageCount / coupon.usageLimit) * 100
                            : 35
                        }
                        className="h-1.5"
                      />
                      {coupon.usageCount > 0 && lastUsageMap[coupon.code] && (
                        <div className="flex items-center gap-1.5 pt-1 text-xs text-slate-500">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>Last used by {lastUsageMap[coupon.code]}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-slate-500">
                      <Clock className="h-3.5 w-3.5" />{" "}
                      {coupon.expiry || "No Expiry"}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit coupon ${coupon.code}`}
                        className="h-8 w-8 rounded-lg text-slate-600 hover:text-slate-900"
                        onClick={() => handleEdit(coupon)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete coupon ${coupon.code}`}
                        className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50"
                        onClick={() => handleDelete(coupon.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="m-0">
          <SectionCard
            title="Live Redemption Feed"
            description="History of customer coupon applications at checkout"
            headerRight={
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search customer or code..."
                    value={redemptionSearchTerm}
                    onChange={(e) => setRedemptionSearchTerm(e.target.value)}
                    className="h-9 pl-9 rounded-xl bg-slate-50 border-slate-200 text-xs"
                  />
                </div>
                <Button
                  onClick={handleExportRedemptions}
                  variant="outline"
                  size="sm"
                  className="h-9 px-3.5 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs gap-1.5 bg-white"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Export Feed
                </Button>
              </div>
            }
          >
            <div className="overflow-x-auto -mx-6 -my-5">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-200">
                    <TableHead className="pl-6 text-xs font-semibold text-slate-700 h-11">
                      Customer
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 h-11 text-center">
                      Promo Code
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 h-11 text-center">
                      Savings Applied
                    </TableHead>
                    <TableHead className="text-right pr-6 text-xs font-semibold text-slate-700 h-11">
                      Timestamp
                    </TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!filteredRedemptions || filteredRedemptions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-40 text-center text-sm text-slate-500"
                      >
                        No coupon redemptions recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRedemptions.map((r: any) => (
                      <TableRow
                        key={r.id}
                        className="hover:bg-slate-50/70 border-b border-slate-200 last:border-0"
                      >
                        <TableCell className="pl-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center font-bold text-emerald-700 text-xs shrink-0">
                              {(r.customerName || "U").charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {r.customerName}
                              </p>
                              <p className="text-xs font-mono text-slate-500">
                                ID: {r.customerId?.slice(-6).toUpperCase()}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono font-semibold text-slate-800">
                            {r.couponCode || "PROMO"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-bold font-mono tabular-nums text-sm text-emerald-700">
                          {currencySymbol}
                          {r.cashback || 0} saved
                        </TableCell>
                        <TableCell className="text-right pr-4 text-xs font-mono tabular-nums text-slate-500">
                          {new Date(r.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove redemption log for ${r.customerName}`}
                            className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDeleteRedemption(r.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="insights" className="m-0">
          <div className="max-w-4xl space-y-6">
            <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Campaign Strategy Brief</h3>
                  <p className="text-xs text-slate-300">
                    Retention & win-back promotion recommendations
                  </p>
                </div>
              </div>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                Your checkout conversion uplift is tracking at{" "}
                <strong className="text-white">+8.5%</strong>. Launching a
                limited-time single-use flat discount code for inactive 30+ day
                customers helps recover dormant repeat orders cleanly.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-xs text-slate-400">Target Audience</p>
                  <p className="text-base font-bold text-white mt-0.5">
                    Idle Customers (30+ Days)
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-xs text-slate-400">Suggested Offer</p>
                  <p className="text-base font-bold text-emerald-400 mt-0.5">
                    10% Single-Use Code
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          if (!open) resetForm();
          setIsAddOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[460px] rounded-2xl border border-slate-200 p-0 overflow-hidden text-left">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                {isEditing ? (
                  <Edit2 className="h-5 w-5" />
                ) : (
                  <PlusSquare className="h-5 w-5" />
                )}
              </div>
              <DialogTitle className="text-lg font-bold">
                {isEditing ? "Edit Coupon" : "Create Coupon"}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Promo Code *
              </Label>
              <Input
                value={formData.code || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase(),
                  })
                }
                placeholder="e.g. SAVE20"
                className="h-11 rounded-xl font-bold font-mono text-base border-slate-200 bg-slate-50"
                disabled={isEditing}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Discount Type
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {OFFER_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Value
                </Label>
                <Input
                  type="number"
                  value={formData.value || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                  className="h-11 rounded-xl font-bold font-mono tabular-nums border-slate-200"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Min Order ({currencySymbol})
                </Label>
                <Input
                  type="number"
                  value={formData.minOrder ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, minOrder: e.target.value })
                  }
                  className="h-11 rounded-xl font-mono tabular-nums border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Expiry Date
                </Label>
                <Input
                  type="date"
                  value={formData.expiry || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, expiry: e.target.value })
                  }
                  className="h-11 rounded-xl font-mono tabular-nums border-slate-200"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">
                Usage Limit
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={
                    formData.usageProtocol === "single" ? "default" : "outline"
                  }
                  onClick={() =>
                    setFormData({ ...formData, usageProtocol: "single" })
                  }
                  className="flex-1 h-10 text-xs font-semibold rounded-xl"
                >
                  Single Use
                </Button>
                <Button
                  type="button"
                  variant={
                    formData.usageProtocol === "multiple" ? "default" : "outline"
                  }
                  onClick={() =>
                    setFormData({ ...formData, usageProtocol: "multiple" })
                  }
                  className="flex-1 h-10 text-xs font-semibold rounded-xl"
                >
                  Multiple Use
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-200">
            <Button
              onClick={handleSaveCoupon}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl"
            >
              {isEditing ? "Save Changes" : "Create Coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-2xl border border-slate-200 p-0 overflow-hidden text-left w-[95vw]">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Bulk Coupon Generator
                </DialogTitle>
                <p className="text-slate-300 text-xs mt-0.5">
                  Generate {bulkQty} unique voucher codes
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Code Prefix
                </Label>
                <Input
                  value={bulkPrefix}
                  onChange={(e) => setBulkPrefix(e.target.value.toUpperCase())}
                  className="h-11 rounded-xl font-bold font-mono bg-slate-50 border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Quantity
                </Label>
                <Input
                  type="number"
                  value={bulkQty}
                  onChange={(e) => setBulkQty(e.target.value)}
                  className="h-11 rounded-xl font-bold font-mono tabular-nums bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Discount Type
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {OFFER_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Discount Value
                </Label>
                <Input
                  type="number"
                  value={formData.value || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                  className="h-11 rounded-xl font-bold font-mono tabular-nums bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Min Order Requirement ({currencySymbol})
              </Label>
              <Input
                type="number"
                value={formData.minOrder ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, minOrder: e.target.value })
                }
                className="h-11 rounded-xl font-mono tabular-nums bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">
                Usage Limit
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={
                    formData.usageProtocol === "single" ? "default" : "outline"
                  }
                  onClick={() =>
                    setFormData({ ...formData, usageProtocol: "single" })
                  }
                  className="flex-1 h-10 text-xs font-semibold rounded-xl"
                >
                  Single Use
                </Button>
                <Button
                  type="button"
                  variant={
                    formData.usageProtocol === "multiple" ? "default" : "outline"
                  }
                  onClick={() =>
                    setFormData({ ...formData, usageProtocol: "multiple" })
                  }
                  className="flex-1 h-10 text-xs font-semibold rounded-xl"
                >
                  Multiple Use
                </Button>
              </div>
            </div>

            <div className="p-4 bg-slate-900 rounded-xl text-white space-y-2">
              <p className="text-xs font-semibold text-slate-300">
                Batch Summary
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-200">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  Usage:{" "}
                  {formData.usageProtocol === "single"
                    ? "Single Use"
                    : "Multiple Use"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-200">
                <BadgeCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  Benefit:{" "}
                  {formData.type === "percentage"
                    ? `${formData.value}% OFF`
                    : `${currencySymbol}${formData.value} FLAT`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-200">
                <Info className="h-4 w-4 text-slate-400 shrink-0" />
                <span>
                  Min Order: {currencySymbol}
                  {formData.minOrder}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-200">
            <Button
              onClick={handleBulkGenerate}
              disabled={isGenerating}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl"
            >
              {isGenerating ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <RefreshCcw className="h-4 w-4 mr-2" />
              )}
              Generate {bulkQty} Coupons
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
