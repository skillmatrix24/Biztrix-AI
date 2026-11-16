
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { 
  Truck, 
  Plus, 
  Search, 
  Download, 
  Upload, 
  Filter,
  CreditCard,
  MessageSquare,
  MoreVertical,
  Phone,
  Mail,
  MapPin,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Wallet,
  Notebook,
  Info,
  ChevronRight,
  History,
  Settings,
  ChevronDown,
  ChevronUp,
  PlusSquare,
  Building2,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  Trash2,
  Loader2,
  ShieldAlert,
  UserPlus,
  Globe,
  Handshake,
  DollarSign,
  Receipt,
  X,
  PlusCircle,
  Users,
  IdCard,
  ShieldCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogPortal,
  DialogOverlay
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Vendor } from "@/lib/mock-db";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  setDocumentNonBlocking, 
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  useUser,
  useDoc,
  addDocumentNonBlocking
} from "@/firebase";
import { collection, doc, serverTimestamp, query, where, orderBy, increment } from "firebase/firestore";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMarketplaceCatalog } from "@/hooks/use-marketplace-catalog";
import { evaluateCoreQuota } from "@/lib/marketplace-catalog";
import { CoreQuotaBanner } from "@/components/quota-upgrade-banner";

import { PageHeader, KpiStatCard, SectionCard } from "@/components/ui/editorial";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Chandigarh"
];

export default function VendorsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => 
    !isUserLoading && user?.uid && !user.isAnonymous ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid, isUserLoading, user?.isAnonymous]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Vendor>>({});
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("Cash");
  const [payNote, setPayNote] = useState("");
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const currencySymbol = getCurrencySymbol(business?.currency);

  const { limits } = useMarketplaceCatalog();
  const vendorsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'vendors') : null
  , [firestore, businessId]);
  const { data, isLoading: isVendorsLoading } = useCollection<Vendor>(vendorsQuery);
  const vendorList = useMemo(() => data || [], [data]);

  const vendorQuota = useMemo(
    () => evaluateCoreQuota("vendors", vendorList.length, { limits, business }),
    [vendorList.length, limits, business]
  );
  
  const [filterCity, setFilterCity] = useState("all");
  const [filterState, setFilterState] = useState("all");

  const cities = useMemo(() => Array.from(new Set(vendorList.map(v => v.city || "Unknown"))), [vendorList]);

  const filteredVendors = useMemo(() => {
    return vendorList.filter(v => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        v.name?.toLowerCase().includes(q) ||
        v.businessName?.toLowerCase().includes(q) ||
        v.phone?.toLowerCase().includes(q) ||
        v.gstin?.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (activeTab === "dues" && (v.pendingBalance || 0) <= 0) return false;
      if (activeTab === "settled" && (v.pendingBalance || 0) > 0) return false;

      if (filterCity !== "all" && (v.city || "Unknown") !== filterCity) return false;
      if (filterState !== "all" && v.state !== filterState) return false;
      return true;
    });
  }, [vendorList, searchTerm, activeTab, filterCity, filterState]);

  const totalPayables = useMemo(() => vendorList.reduce((acc, v) => acc + (Number(v.pendingBalance) || 0), 0), [vendorList]);
  const totalVolume = useMemo(() => vendorList.reduce((acc, v) => acc + (Number(v.totalPurchase) || 0), 0), [vendorList]);

  const paymentTrends = useMemo(() => {
    return [
      { name: 'Mon', amount: 4000 },
      { name: 'Tue', amount: 3000 },
      { name: 'Wed', amount: 2000 },
      { name: 'Thu', amount: 2780 },
      { name: 'Fri', amount: 1890 },
    ];
  }, []);

  const handleSaveVendor = () => {
    if (!businessId) return;
    if (!formData.id && vendorQuota.isReached) {
      toast({
        variant: "destructive",
        title: "Supplier Quota Reached",
        description: `Your plan allows up to ${vendorQuota.limit} vendor profiles. Activate ${vendorQuota.menu.addonLabel} in Marketplace for unlimited suppliers.`,
      });
      return;
    }
    if (!formData.name?.trim() || !formData.phone?.trim()) {
      toast({ variant: "destructive", title: "Missing Details", description: "Supplier name and WhatsApp phone are required." });
      return;
    }

    const openingBal = Number(formData.openingBalance) || 0;
    const isEditing = !!formData.id;
    const vendorId = formData.id || `vnd_${Date.now()}`;
    const vendorRef = doc(firestore, 'businesses', businessId, 'vendors', vendorId);

    const payload: any = {
      ...formData,
      id: vendorId,
      tenantId: businessId,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      businessName: formData.businessName || formData.name.trim(),
      email: formData.email || "",
      gstin: (formData.gstin || "").toUpperCase(),
      address: formData.address || "",
      city: formData.city || "Local",
      state: formData.state || business?.state || "Maharashtra",
      openingBalance: openingBal,
      totalPurchase: isEditing ? (formData.totalPurchase || 0) : openingBal,
      paidAmount: isEditing ? (formData.paidAmount || 0) : 0,
      pendingBalance: isEditing ? (formData.pendingBalance ?? openingBal) : openingBal,
      status: formData.status || "Active",
      updatedAt: serverTimestamp(),
      ...(isEditing ? {} : { createdAt: serverTimestamp() })
    };

    setDocumentNonBlocking(vendorRef, payload, { merge: true });
    setIsAddVendorOpen(false);
    setFormData({});
    toast({ title: isEditing ? "Supplier Updated" : "Supplier Registered", description: `${payload.name} saved to supplier directory.` });
  };

  const handleDeleteVendor = () => {
    if (!businessId || !vendorToDelete) return;
    const vendorRef = doc(firestore, 'businesses', businessId, 'vendors', vendorToDelete.id);
    deleteDocumentNonBlocking(vendorRef);
    if (selectedVendor?.id === vendorToDelete.id) {
      setIsDrawerOpen(false);
      setSelectedVendor(null);
    }
    setVendorToDelete(null);
    setIsDeleteModalOpen(false);
    toast({ title: "Vendor Removed", description: "Supplier profile removed from directory." });
  };

  const handleRecordPayment = () => {
    if (!businessId || !selectedVendor || !payAmount) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid payout amount." });
      return;
    }

    const vendorRef = doc(firestore, 'businesses', businessId, 'vendors', selectedVendor.id);
    const newPending = Math.max(0, (Number(selectedVendor.pendingBalance) || 0) - amt);
    const newPaid = (Number(selectedVendor.paidAmount) || 0) + amt;

    updateDocumentNonBlocking(vendorRef, {
      pendingBalance: newPending,
      paidAmount: newPaid,
      updatedAt: serverTimestamp()
    });

    const cashbookRef = collection(firestore, 'businesses', businessId, 'cashbook');
    addDocumentNonBlocking(cashbookRef, {
      type: 'debit',
      particulars: `Vendor Payout - ${selectedVendor.name}`,
      vendorId: selectedVendor.id,
      vendorName: selectedVendor.name,
      rate: amt,
      qty: 1,
      unit: 'unit',
      amount: amt,
      mode: payMode,
      category: 'Purchase',
      notes: payNote || `Payout via ${payMode}`,
      date: new Date().toISOString().split('T')[0],
      entryBy: userProfile?.name || 'Owner',
      businessId,
      createdAt: serverTimestamp()
    });

    setSelectedVendor({
      ...selectedVendor,
      pendingBalance: newPending,
      paidAmount: newPaid
    });
    setPayAmount("");
    setPayNote("");
    setIsPaymentModalOpen(false);
    toast({ title: "Payout Recorded", description: `${currencySymbol}${amt.toLocaleString()} settled for ${selectedVendor.name}.` });
  };

  return (
    <div className="space-y-6 pb-10 text-left">
      <CoreQuotaBanner quota={vendorQuota} />

      <PageHeader
        title="Suppliers & Payables"
        description="Manage trade vendors, purchase ledgers, and payable settlements."
        breadcrumb="Supply Chain Directory"
        icon={Truck}
        actions={
          <Button
            disabled={vendorQuota.isReached}
            onClick={() => {
              setFormData({ status: "Active", state: business?.state || "Maharashtra" });
              setIsAddVendorOpen(true);
            }}
            className="h-10 px-5 rounded-xl bg-primary text-white font-semibold text-xs gap-2"
          >
            <Plus className="h-4 w-4" /> Register Supplier
          </Button>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiStatCard
          label="Active Suppliers"
          value={vendorList.length}
          subtext="Registered in directory"
          icon={Users}
        />
        <KpiStatCard
          label="Total Payable Dues"
          value={`${currencySymbol}${totalPayables.toLocaleString()}`}
          subtext="Outstanding vendor balance"
          tone="danger"
          icon={Wallet}
        />
        <KpiStatCard
          label="Cumulative Purchases"
          value={`${currencySymbol}${totalVolume.toLocaleString()}`}
          subtext="Total recorded purchase volume"
          icon={TrendingUp}
        />
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard
          title="Payment Trends"
          description="Weekly supplier settlement outflow"
          className="lg:col-span-2"
        >
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentTrends}>
                <XAxis dataKey="name" fontSize={11} stroke="#64748b" tickLine={false} axisLine={false} />
                <YAxis fontSize={11} stroke="#64748b" tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                  {paymentTrends.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#0f172a' : '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Top Suppliers (Volume)"
          description="Highest purchase value partners"
        >
          <div className="space-y-3.5">
            {[...vendorList].sort((a, b) => (b.totalPurchase || 0) - (a.totalPurchase || 0)).slice(0, 3).map((v) => (
              <div key={v.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <p className="text-sm font-medium text-slate-800 truncate pr-3">{v.name}</p>
                <p className="text-sm font-semibold font-mono tabular-nums text-slate-900 shrink-0">
                  {currencySymbol}{(v.totalPurchase || 0).toLocaleString()}
                </p>
              </div>
            ))}
            {vendorList.length === 0 && (
              <p className="text-xs text-slate-500">No supplier records yet.</p>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap gap-3 items-center flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search supplier, phone, GSTIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 rounded-xl text-xs bg-white border-slate-200"
            />
          </div>
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="w-[150px] h-10 rounded-xl text-xs bg-white border-slate-200"><SelectValue placeholder="Filter City" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Cities</SelectItem>{cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterState} onValueChange={setFilterState}>
            <SelectTrigger className="w-[160px] h-10 rounded-xl text-xs bg-white border-slate-200"><SelectValue placeholder="Filter State" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All States</SelectItem>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All ({vendorList.length})</TabsTrigger>
            <TabsTrigger value="dues">With Dues</TabsTrigger>
            <TabsTrigger value="settled">Settled</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Vendors Directory Table */}
      <SectionCard
        title="Supplier Directory"
        description={`${filteredVendors.length} supplier ${filteredVendors.length === 1 ? 'record' : 'records'} shown`}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Supplier</TableHead>
                <TableHead>Phone / GSTIN</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Total Purchase</TableHead>
                <TableHead className="text-right">Pending Dues</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isVendorsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : filteredVendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-sm text-slate-500">
                    No suppliers match your filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredVendors.map((v) => (
                  <TableRow
                    key={v.id}
                    className="cursor-pointer"
                  >
                    <TableCell className="pl-6 py-4" onClick={() => router.push(`/vendors/${v.id}`)}>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                          <AvatarFallback className="rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs">
                            {v.name?.charAt(0)?.toUpperCase() || "V"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{v.name}</p>
                          {v.businessName && v.businessName !== v.name && (
                            <p className="text-xs text-slate-500">{v.businessName}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-mono tabular-nums font-medium text-slate-800">{v.phone}</p>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">{v.gstin || "Unregistered"}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{[v.city, v.state].filter(Boolean).join(", ") || "N/A"}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-semibold text-xs text-slate-900">
                      {currencySymbol}{(v.totalPurchase || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-semibold text-xs">
                      <span className={cn((v.pendingBalance || 0) > 0 ? "text-rose-600" : "text-emerald-700")}>
                        {currencySymbol}{(v.pendingBalance || 0).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          aria-label={`Record payout for ${v.name}`}
                          onClick={() => {
                            setSelectedVendor(v);
                            setIsPaymentModalOpen(true);
                          }}
                          title="Record Payout"
                        >
                          <DollarSign className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          aria-label={`Edit ${v.name}`}
                          onClick={() => {
                            setFormData(v);
                            setIsAddVendorOpen(true);
                          }}
                          title="Edit Supplier"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          aria-label={`Delete ${v.name}`}
                          onClick={() => {
                            setVendorToDelete(v);
                            setIsDeleteModalOpen(true);
                          }}
                          title="Delete Supplier"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      {/* DELETE DIALOG */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl border border-slate-200 bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Delete Vendor</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-slate-600">
              Are you sure you want to delete {vendorToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteVendor}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col border-l border-slate-200 overflow-hidden bg-slate-50">
          {selectedVendor && (
            <VendorInspector 
              vendor={selectedVendor} 
              businessId={businessId!} 
              currencySymbol={currencySymbol} 
              onClose={() => setIsDrawerOpen(false)}
              onOpenPayment={() => setIsPaymentModalOpen(true)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* SETTLEMENT DIALOG */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl border border-slate-200 p-0 overflow-hidden text-left bg-white">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                <Handshake className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">Record Payout</DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  Settle trade payable dues{selectedVendor ? ` for ${selectedVendor.name}` : ""}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Payout Amount ({currencySymbol})</Label>
              <Input 
                type="number" 
                value={payAmount} 
                onChange={(e) => setPayAmount(e.target.value)} 
                placeholder="0.00" 
                className="h-12 rounded-xl font-mono tabular-nums font-bold text-xl text-slate-900" 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Payment Mode</Label>
              <Select value={payMode} onValueChange={setPayMode}>
                <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 text-xs font-medium"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Bank Transfer" className="text-xs">Bank / NEFT</SelectItem>
                  <SelectItem value="UPI" className="text-xs">UPI / QR</SelectItem>
                  <SelectItem value="Cash" className="text-xs">Cash Desk</SelectItem>
                  <SelectItem value="Cheque" className="text-xs">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Memo / Remark</Label>
              <Textarea value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Transaction ref or reason..." className="min-h-[80px] rounded-xl border-slate-200 p-3 text-xs" />
            </div>
          </div>
          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200">
            <Button onClick={handleRecordPayment} disabled={!payAmount} className="w-full h-11 bg-primary text-white font-semibold text-xs rounded-xl">
              Record Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddVendorOpen} onOpenChange={setIsAddVendorOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-2xl border border-slate-200 text-left w-[95vw] bg-white">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  {formData.id ? "Edit Supplier Profile" : "Register Supplier"}
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  Contact identity, GST details, and opening payable balance
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-5 max-h-[62vh] overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Full Name *</Label>
                <Input value={formData.name || ""} onChange={(e) => setFormData({...formData, name: e.target.value})} className="h-10 rounded-xl font-medium" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">WhatsApp Phone *</Label>
                <Input value={formData.phone || ""} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="91XXXXXXXX" className="h-10 rounded-xl font-mono tabular-nums" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">State *</Label>
                <Select value={formData.state || ""} onValueChange={(v) => setFormData({...formData, state: v})}>
                  <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 text-xs"><SelectValue placeholder="Select State" /></SelectTrigger>
                  <SelectContent className="max-h-60 rounded-xl">
                    {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">GSTIN</Label>
                <Input value={formData.gstin || ""} onChange={(e) => setFormData({...formData, gstin: e.target.value.toUpperCase()})} className="h-10 rounded-xl font-mono uppercase" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Billing Address</Label>
              <Textarea value={formData.address || ""} onChange={(e) => setFormData({...formData, address: e.target.value})} className="h-20 rounded-xl border-slate-200 text-xs" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Opening Dues ({currencySymbol})</Label>
                <Input type="number" value={formData.openingBalance ?? ""} onChange={(e) => setFormData({...formData, openingBalance: parseFloat(e.target.value) || 0})} className="h-10 rounded-xl font-mono tabular-nums text-rose-600 font-semibold" />
              </div>
            </div>
          </div>
          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200">
            <Button onClick={handleSaveVendor} className="w-full h-11 bg-primary text-white font-semibold text-xs rounded-xl">
              {formData.id ? "Update Supplier" : "Save Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VendorInspector({ vendor, businessId, currencySymbol, onClose, onOpenPayment }: any) {
  const firestore = useFirestore();

  const ledgerQuery = useMemoFirebase(() => {
    return query(
      collection(firestore, 'businesses', businessId, 'cashbook'),
      where('vendorId', '==', vendor.id),
      orderBy('date', 'asc')
    );
  }, [firestore, businessId, vendor.id]);

  const { data: ledgerData, isLoading } = useCollection<any>(ledgerQuery);

  const calculatedLedger = useMemo(() => {
    if (!ledgerData) return [];
    
    let currentBalance = vendor.openingBalance || 0;
    const initialEntry = {
      id: 'opening',
      date: vendor.createdAt?.toDate ? format(vendor.createdAt.toDate(), 'yyyy-MM-dd') : 'Original',
      particulars: 'Opening Balance',
      type: 'credit',
      amount: currentBalance,
      balance: currentBalance
    };

    const entries = ledgerData.map((t: any) => {
      if (t.type === 'debit') currentBalance -= t.amount;
      else currentBalance += t.amount;

      return {
        ...t,
        balance: currentBalance
      };
    });

    return [initialEntry, ...entries].reverse();
  }, [ledgerData, vendor]);

  return (
    <>
      <div className="p-6 bg-slate-900 text-white shrink-0 relative">
        <div className="text-left space-y-4">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
            <span className="font-mono">Supplier ID: {vendor.id.slice(-8).toUpperCase()}</span>
            <span className="rounded-md bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-xs font-medium">
              {vendor.status}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white font-bold text-xl shrink-0">
              {vendor.name?.charAt(0)}
            </div>
            <div className="space-y-0.5 min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{vendor.name}</h2>
              <p className="text-xs font-mono text-slate-300">{vendor.phone}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-2.5 border-b border-slate-200 bg-white">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
            <TabsTrigger value="contact">Profile & GST</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide text-left">
          <TabsContent value="overview" className="m-0 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <KpiStatCard
                label="Total Liability"
                value={`${currencySymbol}${(vendor.pendingBalance || 0).toLocaleString()}`}
                tone="danger"
              />
              <KpiStatCard
                label="Trading Volume"
                value={`${currencySymbol}${(vendor.totalPurchase || 0).toLocaleString()}`}
              />
            </div>

            <SectionCard title="Recent Activity" bodyClassName="p-4">
              <div className="flex justify-between items-center text-sm">
                <div>
                  <p className="text-xs text-slate-500">Last Bill Entry</p>
                  <p className="font-semibold text-slate-900 mt-0.5 font-mono tabular-nums">{vendor.lastPurchaseDate || 'N/A'}</p>
                </div>
                <span className="rounded-md bg-slate-100 text-slate-700 px-2.5 py-1 text-xs font-medium">
                  Ledger Synced
                </span>
              </div>
            </SectionCard>

            <SectionCard title="Internal Remarks" bodyClassName="p-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                {vendor.notes || 'No specific supplier remarks.'}
              </p>
            </SectionCard>
          </TabsContent>

          <TabsContent value="ledger" className="m-0 space-y-4">
            <SectionCard bodyClassName="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">Date</TableHead>
                      <TableHead>Particulars</TableHead>
                      <TableHead className="text-right">Paid (-)</TableHead>
                      <TableHead className="text-right">Billed (+)</TableHead>
                      <TableHead className="text-right pr-5">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="h-36 text-center"><Loader2 className="animate-spin h-5 w-5 mx-auto text-slate-400" /></TableCell></TableRow>
                    ) : calculatedLedger.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="h-36 text-center text-xs text-slate-500">No ledger transactions recorded.</TableCell></TableRow>
                    ) : calculatedLedger.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="pl-5 py-3 text-xs font-mono text-slate-500">
                          {entry.date?.split('-').reverse().slice(0, 2).join('/')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-800 truncate max-w-[160px]">{entry.particulars}</span>
                            <span className="text-xs text-slate-500">{entry.mode || 'Registry'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums font-semibold text-xs text-emerald-700">
                          {entry.type === 'debit' ? `${currencySymbol}${entry.amount.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums font-semibold text-xs text-rose-600">
                          {entry.type === 'credit' ? `${currencySymbol}${entry.amount.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-right pr-5 font-mono tabular-nums font-semibold text-xs text-slate-900">
                          {currencySymbol}{entry.balance.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="contact" className="m-0 space-y-5">
            <SectionCard title="Business Profile">
              <div className="grid grid-cols-2 gap-5 text-sm">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Business GSTIN</p>
                  <p className="font-mono font-semibold text-slate-900">{vendor.gstin || 'Unregistered'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Location</p>
                  <p className="font-semibold text-slate-900">{[vendor.city, vendor.state].filter(Boolean).join(', ')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="font-medium text-slate-900">{vendor.email || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Status</p>
                  <span className="inline-block rounded-md bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs font-medium">{vendor.status}</span>
                </div>
              </div>
              <Separator className="my-5" />
              <div className="space-y-1.5">
                <p className="text-xs text-slate-500">Billing Address</p>
                <p className="text-sm text-slate-700 leading-relaxed">{vendor.address || 'No billing address on file.'}</p>
              </div>
            </SectionCard>
          </TabsContent>
        </div>
      </Tabs>

      <div className="p-4 border-t border-slate-200 bg-white flex gap-3 shrink-0">
        <Button variant="outline" className="flex-1 h-11 rounded-xl font-semibold text-xs" onClick={onClose}>
          Close Profile
        </Button>
        <Button className="flex-1 h-11 bg-primary text-white font-semibold text-xs gap-2 rounded-xl" onClick={onOpenPayment}>
          <DollarSign className="h-4 w-4" /> Record Payout
        </Button>
      </div>
    </>
  );
}
