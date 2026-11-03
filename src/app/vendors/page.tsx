
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
  DialogTrigger 
} from "@/components/ui/dialog";
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

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Chandigarh"
];

export default function VendorsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  // Dynamic Profile and Business Resolution
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

  const isAdmin = userProfile?.role === 'admin';

  // Real-time Firestore Collection
  const vendorsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'vendors') : null, 
    [firestore, businessId]
  );
  const { data: vendorListData, isLoading: isVendorsLoading } = useCollection<Vendor>(vendorsQuery);
  const vendorList = vendorListData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);

  // Settlement Form State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("Bank Transfer");
  const [payNote, setPayNote] = useState("");

  // Add Vendor Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    businessName: "",
    gstin: "",
    address: "",
    city: "",
    state: "Maharashtra",
    pincode: "",
    openingBalance: "0",
    notes: ""
  });

  const filteredVendors = useMemo(() => {
    return vendorList.filter(v => {
      const name = v.name || "";
      const phone = v.phone || "";
      const bName = v.businessName || "";
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           phone.includes(searchTerm) ||
                           bName.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (activeTab === "pending") return (v.pendingBalance || 0) > 0;
      return true;
    });
  }, [vendorList, searchTerm, activeTab]);

  const stats = useMemo(() => ({
    total: vendorList.length,
    pendingPayments: vendorList.reduce((sum, v) => sum + (v.pendingBalance || 0), 0),
    totalPurchase: vendorList.reduce((sum, v) => sum + (v.totalPurchase || 0), 0)
  }), [vendorList]);

  const handleSaveVendor = () => {
    if (!isAdmin || !businessId) return;
    if (!formData.name || !formData.phone) {
      toast({ variant: "destructive", title: "Required", description: "Name and Phone are mandatory." });
      return;
    }

    const vendorId = `v${Date.now()}`;
    const newVendor: any = {
      ...formData,
      id: vendorId,
      tenantId: businessId,
      totalPurchase: 0,
      paidAmount: 0,
      pendingBalance: parseFloat(formData.openingBalance) || 0,
      status: 'Active',
      lastPurchaseDate: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp()
    };

    const vendorDocRef = doc(firestore, 'businesses', businessId, 'vendors', vendorId);
    setDocumentNonBlocking(vendorDocRef, newVendor, { merge: true });

    setIsAddVendorOpen(false);
    resetForm();
    toast({ title: "Vendor Registered" });
  };

  const resetForm = () => {
    setFormData({
      name: "", phone: "", email: "", businessName: "", gstin: "",
      address: "", city: "", state: "Maharashtra", pincode: "",
      openingBalance: "0", notes: ""
    });
  };

  const handleRecordPayment = () => {
    if (!businessId || !selectedVendor || !payAmount) return;
    const amount = parseFloat(payAmount);
    
    // 1. Update Vendor Node
    const vendorRef = doc(firestore, 'businesses', businessId, 'vendors', selectedVendor.id);
    updateDocumentNonBlocking(vendorRef, {
      paidAmount: increment(amount),
      pendingBalance: increment(-amount),
      lastPaymentAt: serverTimestamp()
    });

    // 2. Log in Cashbook
    const cashbookRef = collection(firestore, 'businesses', businessId, 'cashbook');
    addDocumentNonBlocking(cashbookRef, {
      businessId,
      vendorId: selectedVendor.id,
      vendorName: selectedVendor.name,
      type: 'debit',
      amount: amount,
      particulars: `Supplier Payment: ${selectedVendor.name} (${payNote || 'Direct'})`,
      category: 'Purchase',
      mode: payMode,
      entryBy: userProfile?.name || 'Admin',
      date: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp()
    });

    setIsPaymentModalOpen(false);
    setPayAmount("");
    setPayNote("");
    toast({ title: "Payment Recorded", description: "Vendor balance and cashbook updated." });
  };

  if (isProfileLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-10 px-2 sm:px-0 text-left">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
            <Truck className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 leading-none">Vendor Command</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Supply Chain Ledger</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddVendorOpen(true)} disabled={!isAdmin || isVendorsLoading} className="bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Partner
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-border/50">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest">Active Force</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.total} Suppliers</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-red-500 border-border/50">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Trade Payable</span>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-700">{currencySymbol}{stats.pendingPayments.toLocaleString()}</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-green-500 border-border/50">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Global Sourcing</span>
            <Wallet className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{currencySymbol}{stats.totalPurchase.toLocaleString()}</div>
        </Card>
        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6">
          <div className="flex items-center justify-between opacity-40 mb-1">
            <span className="text-[10px] font-black text-accent uppercase tracking-widest">Health Node</span>
            <ShieldCheck className="h-4 w-4 text-accent" />
          </div>
          <div className="text-2xl font-black text-white">95% Reliable</div>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
        <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="bg-white border h-10 p-1 rounded-xl shadow-sm">
              <TabsTrigger value="all" className="text-[10px] font-bold uppercase px-6">All List</TabsTrigger>
              <TabsTrigger value="pending" className="text-[10px] font-bold uppercase px-6 text-red-600">Pending Dues</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input placeholder="Search name or business..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 pl-10 rounded-xl bg-white border-none shadow-inner text-xs font-bold" />
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-muted/10">
                <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Partner Identity</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">GST & Contact</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12 text-center">Status</TableHead>
                <TableHead className="text-right pr-8 text-[10px] font-black uppercase h-12">Outstanding Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isVendorsLoading ? (
                <TableRow><TableCell colSpan={4} className="h-40 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary opacity-20" /></TableCell></TableRow>
              ) : filteredVendors.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-40 text-center opacity-30 italic text-sm uppercase">No supplier nodes found.</TableCell></TableRow>
              ) : (
                filteredVendors.map((vendor) => (
                  <TableRow key={vendor.id} className="hover:bg-muted/5 transition-colors border-b cursor-pointer group" onClick={() => { setSelectedVendor(vendor); setIsDrawerOpen(true); }}>
                    <TableCell className="pl-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-sm uppercase shadow-inner shrink-0">{vendor.name?.charAt(0)}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 truncate group-hover:underline">{vendor.name}</p>
                          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{vendor.businessName || 'Regular Supplier'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium flex items-center gap-1.5"><Phone className="h-3 w-3 text-muted-foreground" /> {vendor.phone}</span>
                        <span className="text-[8px] font-mono text-muted-foreground uppercase">{vendor.gstin || 'Unregistered'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center"><Badge className="text-[8px] font-black uppercase h-4 px-1.5 border-none shadow-sm bg-green-100 text-green-700">{vendor.status}</Badge></TableCell>
                    <TableCell className="text-right pr-8">
                       <p className="text-sm font-black text-red-600 leading-none">{currencySymbol}{vendor.pendingBalance?.toLocaleString()}</p>
                       <p className="text-[8px] font-black text-muted-foreground uppercase mt-1 opacity-40">Volume: {currencySymbol}{vendor.totalPurchase?.toLocaleString()}</p>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

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
               <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Full Name *</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="h-12 rounded-xl font-bold bg-muted/20 border-none" /></div>
               <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground">WhatsApp *</Label><Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="91XXXXXXXX" className="h-12 rounded-xl font-bold bg-muted/20 border-none" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Business Identity</Label><Input value={formData.businessName} onChange={(e) => setFormData({...formData, businessName: e.target.value})} className="h-12 rounded-xl bg-muted/20 border-none" /></div>
               <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground">GSTIN</Label><Input value={formData.gstin} onChange={(e) => setFormData({...formData, gstin: e.target.value.toUpperCase()})} className="h-12 rounded-xl font-mono uppercase bg-muted/20 border-none" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Billing Address</Label><Textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="h-20 rounded-xl bg-muted/20 border-none text-xs" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Opening Dues ({currencySymbol})</Label><Input type="number" value={formData.openingBalance} onChange={(e) => setFormData({...formData, openingBalance: e.target.value})} className="h-12 rounded-xl bg-red-50 text-red-600 border-none font-bold" /></div>
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
