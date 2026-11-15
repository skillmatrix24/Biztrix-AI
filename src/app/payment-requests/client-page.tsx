"use client";

import { useState, useMemo } from "react";
import { 
  Handshake, 
  Plus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Wallet, 
  Building2, 
  Users, 
  Truck, 
  ShoppingBag,
  ArrowRight,
  Loader2,
  AlertCircle,
  History,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  Coins,
  Receipt
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useFirestore, useCollection, useMemoFirebase, useUser, addDocumentNonBlocking, updateDocumentNonBlocking, useDoc, setDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, doc, serverTimestamp, where, increment } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";

const RECIPIENT_TYPES = [
  { id: 'staff', label: 'Staff Member', icon: Users, color: 'text-blue-600' },
  { id: 'vendor', label: 'Registered Vendor', icon: Truck, color: 'text-orange-600' },
  { id: 'direct_purchase', label: 'Direct Purchase', icon: ShoppingBag, color: 'text-green-600' },
];

export default function PaymentRequestsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  // Context Resolution
  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  // Data Fetching
  const requestsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'paymentRequests'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: requestsData, isLoading } = useCollection<any>(requestsQuery);
  const requests = requestsData || [];

  const staffQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null
  , [firestore, businessId]);
  const { data: staffListData } = useCollection<any>(staffQuery);
  const staffList = staffListData || [];

  const vendorsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'vendors') : null
  , [firestore, businessId]);
  const { data: vendorListData } = useCollection<any>(vendorsQuery);
  const vendorList = vendorListData || [];

  // UI State
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Form State
  const [recipientType, setRecipientType] = useState<string>("staff");
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [directPurchaseLabel, setDirectPurchaseName] = useState("");

  const filteredRequests = useMemo(() => {
    return requests.filter((r: any) => {
      const matchesSearch = r.recipientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           r.purpose?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (activeTab === "pending") return r.status === "pending";
      return true;
    });
  }, [requests, searchTerm, activeTab]);

  const handleCreateRequest = () => {
    if (!businessId || !user?.uid || !amount || !purpose) return;

    let rName = "";
    if (recipientType === 'staff') rName = staffList.find(s => s.id === recipientId)?.name || "Unknown";
    else if (recipientType === 'vendor') rName = vendorList.find(v => v.id === recipientId)?.name || "Unknown";
    else rName = directPurchaseLabel || "Direct Purchase";

    const requestData = {
      businessId,
      requesterId: user.uid,
      requesterName: profile?.name || "User",
      recipientType,
      recipientId: recipientType === 'direct_purchase' ? '' : recipientId,
      recipientName: rName,
      amount: parseFloat(amount),
      purpose,
      status: 'pending',
      createdAt: serverTimestamp()
    };

    addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'paymentRequests'), requestData);

    // Notify Admin
    if (business?.ownerId) {
      addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'notifications'), {
        businessId,
        recipientId: business.ownerId,
        title: "New Payment Request",
        message: `${profile?.name} requested ₹${amount} for ${rName}`,
        type: 'payment',
        isRead: false,
        createdAt: serverTimestamp()
      });
    }

    setIsAddOpen(false);
    resetForm();
    toast({ title: "Request Sent", description: "Waiting for admin approval." });
  };

  const resetForm = () => {
    setAmount(""); setPurpose(""); setRecipientId(""); setDirectPurchaseName("");
  };

  const handleApprove = async (request: any) => {
    if (!businessId || !isAdmin) return;

    const requestRef = doc(firestore, 'businesses', businessId, 'paymentRequests', request.id);
    const cashbookRef = collection(firestore, 'businesses', businessId, 'cashbook');

    updateDocumentNonBlocking(requestRef, { 
      status: 'approved', 
      processedBy: user?.uid, 
      processedAt: serverTimestamp() 
    });

    // 1. Sync to Cashbook
    addDocumentNonBlocking(cashbookRef, {
      businessId,
      type: 'debit',
      amount: request.amount,
      particulars: `Payment: ${request.recipientName} (${request.purpose})`,
      category: request.recipientType === 'staff' ? 'Salary' : request.recipientType === 'vendor' ? 'Purchase' : 'Other',
      entryBy: profile?.name || 'Admin',
      date: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp()
    });

    // 2. Sync to Staff Ledger (if applicable)
    if (request.recipientType === 'staff' && request.recipientId) {
      const recordId = `${request.recipientId}_${new Date().toISOString().split('T')[0]}`;
      const attendanceRef = doc(firestore, 'businesses', businessId, 'attendance', recordId);
      setDocumentNonBlocking(attendanceRef, {
        staffId: request.recipientId,
        date: new Date().toISOString().split('T')[0],
        manualPayment: increment(request.amount),
        businessId,
        status: 'present'
      }, { merge: true });
    } 
    // 3. Sync to Vendor Balance (if applicable)
    else if (request.recipientType === 'vendor' && request.recipientId) {
      const vendorRef = doc(firestore, 'businesses', businessId, 'vendors', request.recipientId);
      updateDocumentNonBlocking(vendorRef, {
        paidAmount: increment(request.amount),
        pendingBalance: increment(-request.amount)
      });
    }

    // 4. Notify Requester
    addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'notifications'), {
      businessId,
      recipientId: request.requesterId,
      title: "Request Approved",
      message: `Your payment request of ₹${request.amount} for ${request.recipientName} has been approved.`,
      type: 'payment',
      isRead: false,
      createdAt: serverTimestamp()
    });

    toast({ title: "Approved & Synced", description: `Amount released for ${request.recipientName}` });
  };

  const handleReject = (request: any) => {
    if (!businessId || !isAdmin) return;
    updateDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'paymentRequests', request.id), { 
      status: 'rejected',
      processedBy: user?.uid,
      processedAt: serverTimestamp()
    });

    // Notify Requester
    addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'notifications'), {
      businessId,
      recipientId: request.requesterId,
      title: "Request Rejected",
      message: `Your payment request of ₹${request.amount} was rejected.`,
      type: 'payment',
      isRead: false,
      createdAt: serverTimestamp()
    });

    toast({ title: "Request Rejected", variant: "destructive" });
  };

  const currencySymbol = getCurrencySymbol(business?.currency);

  return (
    <div className="space-y-6 md:space-y-10 pb-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
            <Handshake className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Payment Approvals</h2>
            <p className="text-xs md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Staff & Vendor Fund Logic</p>
          </div>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-[0.2em] rounded-xl text-white">
              <Plus className="mr-2 h-4 w-4" /> New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden w-[95vw]">
            <DialogHeader className="p-8 bg-primary text-white">
              <DialogTitle className="text-xl font-bold">Initiate Fund Request</DialogTitle>
              <DialogDescription className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-1">Cashier/Accountant Approval Flow</DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Payment Recipient</Label>
                <div className="grid grid-cols-3 gap-2">
                  {RECIPIENT_TYPES.map(type => (
                    <button 
                      key={type.id} 
                      onClick={() => setRecipientType(type.id)}
                      className={cn(
                        "p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                        recipientType === type.id ? "border-primary bg-primary/5" : "border-muted bg-white hover:border-primary/20"
                      )}
                    >
                      <type.icon className={cn("h-5 w-5", recipientType === type.id ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-[8px] font-black uppercase">{type.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {recipientType === 'staff' && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                    <Label className="text-[10px] font-bold uppercase">Select Staff Member</Label>
                    <Select value={recipientId} onValueChange={setRecipientId}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Choose Person" /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.role})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {recipientType === 'vendor' && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                    <Label className="text-[10px] font-bold uppercase">Select Registered Vendor</Label>
                    <Select value={recipientId} onValueChange={setRecipientId}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Choose Supplier" /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {vendorList.map(v => <SelectItem key={v.id} value={v.id}>{v.name} - Bal: {currencySymbol}{v.pendingBalance}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {recipientType === 'direct_purchase' && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                    <Label className="text-[10px] font-bold uppercase">Purpose Label</Label>
                    <Input placeholder="e.g. Office Stationery" value={directPurchaseLabel} onChange={(e) => setDirectPurchaseName(e.target.value)} className="h-12 rounded-xl font-bold" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase">Amount (₹)</Label>
                  <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 rounded-xl font-black text-primary text-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase">Priority</Label>
                  <Badge className="h-12 w-full flex items-center justify-center bg-orange-50 text-orange-600 border border-orange-100 font-black uppercase text-[10px]">Normal</Badge>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase">Detailed Reason / Note</Label>
                <Textarea placeholder="Why is this payment needed?" value={purpose} onChange={(e) => setPurpose(e.target.value)} className="min-h-[100px] rounded-xl bg-muted/20 border-none p-4 text-xs font-bold" />
              </div>
            </div>
            <DialogFooter className="p-8 bg-muted/30 border-t">
              <Button onClick={handleCreateRequest} className="w-full h-14 bg-primary font-black uppercase text-xs tracking-widest shadow-xl rounded-2xl">
                Submit for Approval
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-white rounded-2xl p-6 flex flex-col gap-1 border border-border/50">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Requests</p>
          <div className="text-2xl font-bold text-primary">{requests.filter(r => r.status === 'pending').length} Waiting</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-2xl p-6 border-l-4 border-l-green-500 flex flex-col gap-1 border border-border/50">
          <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Released Today</p>
          <div className="text-2xl font-bold text-green-600">₹{requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-2xl p-6 border-l-4 border-l-destructive flex flex-col gap-1 border border-border/50">
          <p className="text-[10px] font-bold text-destructive uppercase tracking-widest">Rejected / Held</p>
          <div className="text-2xl font-bold text-destructive">{requests.filter(r => r.status === 'rejected').length} Requests</div>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
        <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="bg-white border h-10 p-1 rounded-xl shadow-sm">
              <TabsTrigger value="all" className="text-[10px] font-bold uppercase px-6">Full Log</TabsTrigger>
              <TabsTrigger value="pending" className="text-[10px] font-bold uppercase px-6 text-orange-600">Pending Approval</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search reason or name..." className="pl-9 h-11 text-xs shadow-inner bg-white rounded-xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10">
                <TableHead className="text-[10px] font-black uppercase pl-8 h-12">Flow & Date</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Payee Info</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Reason</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase h-12">Amount (₹)</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Status</TableHead>
                <TableHead className="text-right pr-8 h-12 w-48"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-40 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-40 text-center opacity-30 italic text-sm">No payment requests found.</TableCell></TableRow>
              ) : (
                filteredRequests.map((req: any) => {
                  const typeInfo = RECIPIENT_TYPES.find(t => t.id === req.recipientType) || RECIPIENT_TYPES[0];
                  return (
                    <TableRow key={req.id} className="hover:bg-muted/5 group transition-colors">
                      <TableCell className="pl-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase">{req.createdAt?.toDate?.()?.toLocaleDateString('en-IN') || 'Recently'}</span>
                          <span className="text-[8px] font-bold text-primary uppercase mt-1">REQ BY: {req.requesterName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center bg-muted/30", typeInfo.color)}>
                            <typeInfo.icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{req.recipientName}</p>
                            <p className="text-[9px] font-black text-muted-foreground uppercase opacity-60">{req.recipientType.replace('_', ' ')}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-medium text-slate-600 line-clamp-1 italic max-w-[200px]">"{req.purpose}"</p>
                      </TableCell>
                      <TableCell className="text-right font-black text-sm text-slate-900">
                        ₹{req.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "text-[8px] font-black uppercase h-5 px-2 border-none",
                          req.status === 'approved' ? "bg-green-100 text-green-700" :
                          req.status === 'rejected' ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"
                        )}>
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-8 text-right">
                        {req.status === 'pending' && isAdmin ? (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" className="h-8 rounded-lg text-[9px] font-black uppercase text-destructive border-destructive/20 hover:bg-red-50" onClick={() => handleReject(req)}>Reject</Button>
                            <Button size="sm" className="h-8 rounded-lg text-[9px] font-black uppercase bg-primary shadow-lg" onClick={() => handleApprove(req)}>Approve & Pay</Button>
                          </div>
                        ) : (
                          <span className="text-[9px] font-black text-muted-foreground uppercase opacity-40">
                            {req.status === 'approved' ? 'Settled' : 'Closed'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
