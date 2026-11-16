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
import { PageHeader, KpiStatCard, SectionCard, EmptyStatePanel } from "@/components/ui/editorial";
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
    <div className="space-y-6 pb-10 text-left">
      <PageHeader
        breadcrumb="Back Office / Approvals"
        title="Payment Approvals"
        description="Review and approve staff, vendor, and direct expense payout requests."
        icon={Handshake}
        actions={
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 hover:bg-slate-800 h-10 px-5 font-semibold text-xs rounded-xl text-white">
                <Plus className="mr-2 h-4 w-4" /> New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-2xl border border-slate-200 p-0 overflow-hidden w-[95vw]">
              <DialogHeader className="p-6 bg-slate-900 text-white text-left">
                <div className="flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                    <Handshake className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold">Initiate Fund Request</DialogTitle>
                    <DialogDescription className="text-slate-300 text-xs mt-0.5">
                      Submit a payout request for admin approval and ledger sync
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="p-6 space-y-5 bg-white">
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold text-slate-700">Payment Recipient</Label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {RECIPIENT_TYPES.map(type => (
                      <button
                        type="button"
                        key={type.id}
                        onClick={() => setRecipientType(type.id)}
                        className={cn(
                          "p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-colors",
                          recipientType === type.id
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <type.icon className={cn("h-4 w-4", recipientType === type.id ? "text-white" : "text-slate-500")} />
                        <span className="text-xs font-semibold">{type.label.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {recipientType === 'staff' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Select Staff Member</Label>
                      <Select value={recipientId} onValueChange={setRecipientId}>
                        <SelectTrigger className="h-10 rounded-xl border-slate-200"><SelectValue placeholder="Choose person" /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.role})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {recipientType === 'vendor' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Select Registered Vendor</Label>
                      <Select value={recipientId} onValueChange={setRecipientId}>
                        <SelectTrigger className="h-10 rounded-xl border-slate-200"><SelectValue placeholder="Choose supplier" /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {vendorList.map(v => <SelectItem key={v.id} value={v.id}>{v.name} - Bal: {currencySymbol}{v.pendingBalance}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {recipientType === 'direct_purchase' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Purpose Label</Label>
                      <Input placeholder="e.g. Office Stationery" value={directPurchaseLabel} onChange={(e) => setDirectPurchaseName(e.target.value)} className="h-10 rounded-xl border-slate-200" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Amount ({currencySymbol})</Label>
                    <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 rounded-xl border-slate-200 font-mono tabular-nums font-bold text-slate-900" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Priority</Label>
                    <div className="h-10 w-full rounded-xl border border-amber-200 bg-amber-50 text-amber-800 flex items-center justify-center text-xs font-semibold">
                      Normal
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Detailed Reason / Note</Label>
                  <Textarea placeholder="Why is this payment needed?" value={purpose} onChange={(e) => setPurpose(e.target.value)} className="min-h-[96px] rounded-xl border-slate-200 p-3 text-sm" />
                </div>
              </div>
              <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200">
                <Button onClick={handleCreateRequest} className="w-full h-11 bg-slate-900 hover:bg-slate-800 font-semibold text-xs rounded-xl text-white">
                  Submit for Approval
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiStatCard
          label="Active Requests"
          value={`${requests.filter(r => r.status === 'pending').length} Waiting`}
          subtext="Pending admin review"
          icon={Clock}
        />
        <KpiStatCard
          label="Released Approved"
          value={`${currencySymbol}${requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0).toLocaleString()}`}
          subtext="Synced to cashbook"
          icon={CheckCircle2}
          tone="positive"
        />
        <KpiStatCard
          label="Rejected / Held"
          value={`${requests.filter(r => r.status === 'rejected').length} Requests`}
          subtext="Declined payout entries"
          icon={XCircle}
          tone="danger"
        />
      </div>

      <SectionCard
        title="Approval Ledger"
        description="Track fund requests and auto-sync approved payouts to cashbook and ledgers"
        bodyClassName="p-0"
        headerRight={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-slate-100 h-9 p-1 rounded-xl">
                <TabsTrigger value="all" className="text-xs font-semibold px-4 rounded-lg">Full Log</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs font-semibold px-4 rounded-lg">Pending</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search reason or name..."
                className="pl-9 h-9 text-xs bg-white border-slate-200 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                <TableHead className="text-xs font-semibold text-slate-600 pl-6 h-11">Date & Requester</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">Payee</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">Reason</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-600 h-11">Amount</TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">Status</TableHead>
                <TableHead className="text-right pr-6 h-11 w-48 text-xs font-semibold text-slate-600">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-40 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-8">
                    <EmptyStatePanel
                      icon={Handshake}
                      title="No payment requests found"
                      description="Create a new fund request to initiate approval and ledger sync."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((req: any) => {
                  const typeInfo = RECIPIENT_TYPES.find(t => t.id === req.recipientType) || RECIPIENT_TYPES[0];
                  return (
                    <TableRow key={req.id} className="hover:bg-slate-50/60 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-mono tabular-nums font-medium text-slate-700">
                            {req.createdAt?.toDate?.()?.toLocaleDateString('en-IN') || 'Recently'}
                          </span>
                          <span className="text-xs text-slate-500 mt-0.5">By {req.requesterName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-700 shrink-0">
                            <typeInfo.icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{req.recipientName}</p>
                            <p className="text-xs text-slate-500 capitalize">{req.recipientType.replace('_', ' ')}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-slate-600 line-clamp-1 max-w-[220px]">{req.purpose}</p>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-bold text-sm text-slate-900">
                        {currencySymbol}{Number(req.amount || 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn(
                          "text-xs font-medium capitalize",
                          req.status === 'approved' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          req.status === 'rejected' ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        {req.status === 'pending' && isAdmin ? (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50" onClick={() => handleReject(req)}>
                              Reject
                            </Button>
                            <Button size="sm" className="h-8 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white" onClick={() => handleApprove(req)}>
                              Approve & Pay
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">
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
      </SectionCard>
    </div>
  );
}
