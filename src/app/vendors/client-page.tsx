
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

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Chandigarh"
];

// ... imports
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// ... (existing code: INDIAN_STATES constant)

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

  const vendorsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'vendors') : null
  , [firestore, businessId]);
  const { data, isLoading: isVendorsLoading } = useCollection<Vendor>(vendorsQuery);
  const vendorList = useMemo(() => data || [], [data]);
  
  // New Filter State
  const [filterCity, setFilterCity] = useState("all");
  const [filterState, setFilterState] = useState("all");

  const cities = useMemo(() => Array.from(new Set(vendorList.map(v => v.city || "Unknown"))), [vendorList]);

  // Enhanced Filtering
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

  // Payment Trends Data
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
    toast({ title: isEditing ? "Supplier Updated" : "Supplier Registered", description: `${payload.name} saved to supply registry.` });
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
    toast({ title: "Vendor Removed", description: "Supplier node deleted from registry." });
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
    <div className="space-y-6 md:space-y-10 pb-10 px-2 sm:px-0 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary bg-primary/5">Supply Chain Registry</Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Suppliers & Payables</h1>
          <p className="text-xs text-muted-foreground font-medium">Manage trade vendors, purchase ledgers, and payable settlements.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setFormData({ status: "Active", state: business?.state || "Maharashtra" });
              setIsAddVendorOpen(true);
            }}
            className="h-11 px-6 rounded-2xl bg-primary font-black uppercase text-[10px] tracking-widest shadow-lg gap-2"
          >
            <Plus className="h-4 w-4" /> Register Supplier
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Suppliers</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{vendorList.length}</p>
        </Card>
        <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Payable Dues</p>
          <p className="text-2xl font-black text-red-600 mt-1">{currencySymbol}{totalPayables.toLocaleString()}</p>
        </Card>
        <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cumulative Purchases</p>
          <p className="text-2xl font-black text-primary mt-1">{currencySymbol}{totalVolume.toLocaleString()}</p>
        </Card>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl p-6">
            <CardTitle className="text-sm font-black uppercase mb-6">Payment Trends</CardTitle>
            <div className="h-[200px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentTrends}>
                     <XAxis dataKey="name" fontSize={10} />
                     <YAxis fontSize={10} />
                     <Tooltip />
                     <Bar dataKey="amount" fill="#3b82f6" radius={[4,4,0,0]}>
                       {paymentTrends.map((entry, index) => <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#93c5fd'} />)}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </Card>
         <Card className="border-none shadow-sm rounded-3xl p-6">
            <CardTitle className="text-sm font-black uppercase mb-6">Top Suppliers (Volume)</CardTitle>
            <div className="space-y-4">
              {[...vendorList].sort((a,b) => (b.totalPurchase || 0) - (a.totalPurchase || 0)).slice(0, 3).map(v => (
                <div key={v.id} className="flex items-center justify-between">
                   <p className="text-xs font-bold truncate">{v.name}</p>
                   <p className="text-xs font-black text-primary">{currencySymbol}{(v.totalPurchase || 0).toLocaleString()}</p>
                </div>
              ))}
              {vendorList.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No supplier records yet.</p>
              )}
            </div>
         </Card>
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border">
         <div className="flex flex-wrap gap-3 items-center flex-1 min-w-[240px]">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
               <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                 placeholder="Search supplier, phone, GSTIN..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="pl-10 h-10 rounded-xl text-xs font-bold"
               />
            </div>
            <Select value={filterCity} onValueChange={setFilterCity}>
               <SelectTrigger className="w-[150px] h-10 rounded-xl font-bold text-xs"><SelectValue placeholder="Filter City" /></SelectTrigger>
               <SelectContent><SelectItem value="all">All Cities</SelectItem>{cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterState} onValueChange={setFilterState}>
               <SelectTrigger className="w-[160px] h-10 rounded-xl font-bold text-xs"><SelectValue placeholder="Filter State" /></SelectTrigger>
               <SelectContent><SelectItem value="all">All States</SelectItem>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
         </div>
         <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-10 rounded-xl">
               <TabsTrigger value="all" className="text-[10px] font-black uppercase rounded-lg">All ({vendorList.length})</TabsTrigger>
               <TabsTrigger value="dues" className="text-[10px] font-black uppercase rounded-lg">With Dues</TabsTrigger>
               <TabsTrigger value="settled" className="text-[10px] font-black uppercase rounded-lg">Settled</TabsTrigger>
            </TabsList>
         </Tabs>
      </div>

      {/* Vendors Directory Table */}
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="pl-6 text-[10px] font-black uppercase">Supplier</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Phone / GSTIN</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Location</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase">Total Purchase</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase">Pending Dues</TableHead>
                <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isVendorsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary opacity-40" />
                  </TableCell>
                </TableRow>
              ) : filteredVendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-xs text-muted-foreground italic">
                    No suppliers match your filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredVendors.map((v) => (
                  <TableRow
                    key={v.id}
                    className="cursor-pointer hover:bg-muted/10 transition-colors"
                  >
                    <TableCell className="pl-6 py-4" onClick={() => router.push(`/vendors/${v.id}`)}>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-xl bg-primary/10 text-primary font-black">
                          <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-black text-xs">
                            {v.name?.charAt(0)?.toUpperCase() || "V"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-black text-slate-900">{v.name}</p>
                          {v.businessName && v.businessName !== v.name && (
                            <p className="text-[10px] text-muted-foreground font-medium">{v.businessName}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-bold text-slate-700">{v.phone}</p>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase">{v.gstin || "Unregistered"}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium text-slate-600">{[v.city, v.state].filter(Boolean).join(", ") || "N/A"}</span>
                    </TableCell>
                    <TableCell className="text-right font-black text-xs text-slate-900">
                      {currencySymbol}{(v.totalPurchase || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-black text-xs">
                      <span className={cn((v.pendingBalance || 0) > 0 ? "text-red-600" : "text-green-600")}>
                        {currencySymbol}{(v.pendingBalance || 0).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
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
                          onClick={() => {
                            setVendorToDelete(v);
                            setIsDeleteModalOpen(true);
                          }}
                          title="Delete Supplier"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>


      {/* DELETE DIALOG */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
           <DialogHeader>
              <DialogTitle>Delete Vendor</DialogTitle>
              <DialogDescription>Are you sure you want to delete {vendorToDelete?.name}? This action cannot be undone.</DialogDescription>
           </DialogHeader>
           <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteVendor}>Delete</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col border-none shadow-2xl overflow-hidden bg-background">
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
        <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden text-left">
           <DialogHeader className="p-8 bg-slate-900 text-white text-left shrink-0">
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                    <Handshake className="h-6 w-6 text-accent" />
                 </div>
                 <div>
                    <DialogTitle className="text-xl font-bold">Record Payout</DialogTitle>
                    <DialogDescription className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Settle trade payable dues</DialogDescription>
                 </div>
              </div>
           </DialogHeader>
           <div className="p-8 space-y-8">
              <div className="space-y-1.5">
                 <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Payout Amount ({currencySymbol})</Label>
                 <Input 
                   type="number" 
                   value={payAmount} 
                   onChange={(e) => setPayAmount(e.target.value)} 
                   placeholder="0.00" 
                   className="h-14 rounded-2xl bg-muted/20 border-none shadow-inner font-black text-2xl text-primary" 
                 />
              </div>
              <div className="space-y-1.5">
                 <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Payment Mode</Label>
                 <Select value={payMode} onValueChange={setPayMode}>
                    <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                       <SelectItem value="Bank Transfer" className="text-xs font-bold uppercase">Bank / NEFT</SelectItem>
                       <SelectItem value="UPI" className="text-xs font-bold uppercase">UPI / QR</SelectItem>
                       <SelectItem value="Cash" className="text-xs font-bold uppercase">Cash Desk</SelectItem>
                       <SelectItem value="Cheque" className="text-xs font-bold uppercase">Cheque</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
              <div className="space-y-1.5">
                 <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Memo / Remark</Label>
                 <Textarea value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Transaction ref or reason..." className="min-h-[80px] rounded-xl bg-muted/20 border-none shadow-inner p-3 text-xs" />
              </div>
           </div>
           <DialogFooter className="p-8 bg-muted/10 border-t">
              <Button onClick={handleRecordPayment} disabled={!payAmount} className="w-full h-14 bg-primary font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">
                 Commit Settlement Node
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddVendorOpen} onOpenChange={setIsAddVendorOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left w-[95vw]">

          <DialogHeader className="p-8 bg-primary text-white text-left">
            <div className="flex items-center gap-4">
               <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                  <UserPlus className="h-6 w-6 text-white" />
               </div>
               <div>
                  <DialogTitle className="text-xl">Register Supplier Node</DialogTitle>
                  <DialogDescription className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-1">Identity & Global Parameters</DialogDescription>
               </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Full Name *</Label><Input value={formData.name || ""} onChange={(e) => setFormData({...formData, name: e.target.value})} className="h-12 rounded-xl font-bold bg-white border" /></div>
               <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground">WhatsApp *</Label><Input value={formData.phone || ""} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="91XXXXXXXX" className="h-12 rounded-xl font-bold bg-white border" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground">State *</Label>
                  <Select value={formData.state || ""} onValueChange={(v) => setFormData({...formData, state: v})}>
                    <SelectTrigger className="h-12 rounded-xl bg-white border"><SelectValue placeholder="Select State" /></SelectTrigger>
                    <SelectContent className="max-h-60 rounded-xl">
                      {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground">GSTIN</Label><Input value={formData.gstin || ""} onChange={(e) => setFormData({...formData, gstin: e.target.value.toUpperCase()})} className="h-12 rounded-xl font-mono uppercase bg-white border" /></div>
             </div>
            <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Billing Address</Label><Textarea value={formData.address || ""} onChange={(e) => setFormData({...formData, address: e.target.value})} className="h-20 rounded-xl bg-white border text-xs" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Opening Dues ({currencySymbol})</Label><Input type="number" value={formData.openingBalance ?? ""} onChange={(e) => setFormData({...formData, openingBalance: parseFloat(e.target.value) || 0})} className="h-12 rounded-xl bg-white border text-red-600 font-bold" /></div>
            </div>
          </div>
          <DialogFooter className="p-8 bg-muted/10 border-t">
            <Button onClick={handleSaveVendor} className="w-full h-14 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">Establish Supply Node</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}





function VendorInspector({ vendor, businessId, currencySymbol, onClose, onOpenPayment }: any) {
  const firestore = useFirestore();

  // 1. Fetch real-time Ledger from Cashbook
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
    
    // Starting point: Opening Balance (as a virtual Credit entry)
    let currentBalance = vendor.openingBalance || 0;
    const initialEntry = {
      id: 'opening',
      date: vendor.createdAt?.toDate ? format(vendor.createdAt.toDate(), 'yyyy-MM-dd') : 'Original',
      particulars: 'Opening Balance Node',
      type: 'credit',
      amount: currentBalance,
      balance: currentBalance
    };

    const entries = ledgerData.map((t: any) => {
      // In Vendor context: 
      // Credit = Bill received (Liability increases)
      // Debit = Payment made (Liability decreases)
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
      <div className="p-8 bg-primary text-white shrink-0 relative">
        <div className="absolute top-0 right-0 p-8 opacity-10"><Building2 className="h-40 w-40" /></div>
        <div className="text-left space-y-6 relative z-10">
          <Badge variant="outline" className="bg-white/10 text-white border-white/20 uppercase text-[9px] font-black px-3 py-1">NODE ID: {vendor.id.slice(-8).toUpperCase()}</Badge>
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-3xl bg-white flex items-center justify-center text-primary font-black text-3xl shrink-0 shadow-2xl">
              {vendor.name?.charAt(0)}
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white">{vendor.name}</h2>
              <div className="flex items-center gap-3">
                <span className="text-accent text-[10px] font-bold uppercase tracking-widest">{vendor.phone}</span>
                <Separator orientation="vertical" className="h-3 bg-white/20" />
                <Badge className="bg-green-500 text-white border-none font-black text-[9px] h-5 uppercase px-2">{vendor.status}</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 border-b bg-muted/5">
          <TabsList className="bg-transparent h-12 gap-8 p-0 border-none overflow-x-auto scrollbar-hide">
            <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-12 text-[10px] font-black uppercase tracking-widest px-0">Overview</TabsTrigger>
            <TabsTrigger value="ledger" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-12 text-[10px] font-black uppercase tracking-widest px-0"><History className="h-3 w-3 mr-2" /> Node Ledger</TabsTrigger>
            <TabsTrigger value="contact" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-12 text-[10px] font-black uppercase tracking-widest px-0">Registry Profile</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide text-left">
          <TabsContent value="overview" className="m-0 space-y-10">
             <div className="grid grid-cols-2 gap-4 md:gap-6">
                <div className="p-6 bg-muted/20 rounded-[2rem] border-none space-y-1 text-left">
                   <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Total Liability</p>
                   <p className="text-2xl font-black text-red-600">{currencySymbol}{vendor.pendingBalance?.toLocaleString()}</p>
                </div>
                <div className="p-6 bg-muted/20 rounded-[2rem] border-none space-y-1 text-left">
                   <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Trading Volume</p>
                   <p className="text-2xl font-black text-slate-900">{currencySymbol}{vendor.totalPurchase?.toLocaleString()}</p>
                </div>
             </div>

             <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Clock className="h-4 w-4" /> Activity Pulse</h4>
                <div className="grid grid-cols-1 gap-3">
                   <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10 flex justify-between items-center">
                      <div><p className="text-[8px] font-bold text-muted-foreground uppercase">Last Bill Entry</p><p className="text-sm font-black text-slate-700">{vendor.lastPurchaseDate || 'N/A'}</p></div>
                      <Badge variant="outline" className="bg-white text-primary border-primary/20 text-[7px] font-black h-5 uppercase">AUTOMATED SYNC</Badge>
                   </div>
                </div>
             </div>

             <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Internal Remarks</p>
                <div className="p-5 bg-muted/20 rounded-3xl border border-transparent italic">
                  <p className="text-sm text-slate-600 leading-relaxed">"{vendor.notes || 'No specific node remarks.'}"</p>
                </div>
             </div>
          </TabsContent>

          <TabsContent value="ledger" className="m-0 space-y-6">
             <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
                <div className="overflow-x-auto">
                   <Table>
                      <TableHeader><TableRow className="bg-muted/10"><TableHead className="pl-6 text-[9px] font-black uppercase h-10">Date</TableHead><TableHead className="text-[9px] font-black uppercase h-10">Particulars</TableHead><TableHead className="text-right text-[9px] font-black uppercase h-10">Outflow (-)</TableHead><TableHead className="text-right text-[9px) font-black uppercase h-10">Inflow (+)</TableHead><TableHead className="text-right pr-6 text-[9px] font-black uppercase h-10">Balance node</TableHead></TableRow></TableHeader>
                      <TableBody>
                         {isLoading ? (
                           <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary opacity-20" /></TableCell></TableRow>
                         ) : calculatedLedger.length === 0 ? (
                           <TableRow><TableCell colSpan={5} className="h-40 text-center opacity-30 italic text-xs uppercase">No ledger traffic.</TableCell></TableRow>
                         ) : calculatedLedger.map((entry) => (
                           <TableRow key={entry.id} className="border-b last:border-0 hover:bg-muted/5 transition-colors">
                              <TableCell className="pl-6 py-4"><span className="text-[10px] font-black text-slate-400 uppercase">{entry.date?.split('-').reverse().slice(0, 2).join('/')}</span></TableCell>
                              <TableCell><div className="flex flex-col"><span className="text-xs font-bold text-slate-700 truncate block max-w-[150px]">{entry.particulars}</span><span className="text-[8px] font-black text-muted-foreground uppercase opacity-40">{entry.mode || 'Registry'}</span></div></TableCell>
                              <TableCell className="text-right font-black text-xs text-green-600">{entry.type === 'debit' ? `${currencySymbol}${entry.amount.toLocaleString()}` : '-'}</TableCell>
                              <TableCell className="text-right font-black text-xs text-red-600">{entry.type === 'credit' ? `${currencySymbol}${entry.amount.toLocaleString()}` : '-'}</TableCell>
                              <TableCell className="text-right pr-6 font-black text-xs text-slate-900">{currencySymbol}{entry.balance.toLocaleString()}</TableCell>
                           </TableRow>
                         ))}
                      </TableBody>
                   </Table>
                </div>
             </Card>
          </TabsContent>

          <TabsContent value="contact" className="m-0 space-y-8">
             <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1"><p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Business GSTIN</p><p className="text-sm font-mono font-black text-primary uppercase">{vendor.gstin || 'Unregistered'}</p></div>
                <div className="space-y-1"><p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Location Node</p><p className="text-sm font-black text-slate-900">{vendor.city}, {vendor.state}</p></div>
                <div className="space-y-1"><p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Global Email</p><p className="text-sm font-black text-slate-900">{vendor.email || 'N/A'}</p></div>
                <div className="space-y-1"><p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Identity Status</p><Badge className="bg-green-50 text-green-700 border-none font-black text-[9px] uppercase h-5">{vendor.status}</Badge></div>
             </div>
             <Separator className="opacity-40" />
             <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Billing Address Registry</Label>
                <div className="p-6 bg-muted/20 rounded-[2rem] border-none shadow-inner">
                   <p className="text-sm font-bold text-slate-700 leading-relaxed uppercase tracking-tight">{vendor.address}</p>
                </div>
             </div>
          </TabsContent>
        </div>
      </Tabs>

      <div className="p-8 border-t bg-muted/20 flex gap-4 shrink-0">
        <Button variant="outline" className="flex-1 h-16 bg-white font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-sm border-slate-200" onClick={onClose}>Close Profile</Button>
        <Button className="flex-1 h-16 bg-primary font-black shadow-xl uppercase tracking-widest text-[11px] gap-3 rounded-2xl active:scale-95 transition-all text-white" onClick={onOpenPayment}>
          <DollarSign className="h-6 w-6" /> Record Payout
        </Button>
      </div>
    </>
  );
}
