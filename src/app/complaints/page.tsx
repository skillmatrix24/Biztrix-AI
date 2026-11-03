
"use client";

import { useState, useMemo } from "react";
import { 
  Headset, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck,
  Zap, 
  ChevronRight, 
  Layers, 
  TrendingUp,
  Loader2, 
  Globe, 
  PlusCircle,
  User,
  MapPin,
  Smartphone,
  Check,
  X,
  LayoutDashboard,
  LayoutList,
  Calendar,
  ChevronDown,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, serverTimestamp, doc, where } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PRIORITY_CONFIG: any = {
  'low': { label: 'Normal', color: 'text-slate-600', bg: 'bg-slate-100' },
  'medium': { label: 'Medium', color: 'text-blue-700', bg: 'bg-blue-100/60' },
  'high': { label: 'Urgent', color: 'text-orange-700', bg: 'bg-orange-100/60' },
  'urgent': { label: 'High Priority', color: 'text-red-700', bg: 'bg-red-100/60' },
  'emergency': { label: 'Emergency', color: 'text-red-900', bg: 'bg-red-200' },
};

const STATUS_CONFIG: any = {
  'new': { label: 'New', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', icon: Zap },
  'pending': { label: 'Pending', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100', icon: Clock },
  'in-progress': { label: 'Working', color: 'text-primary', bg: 'bg-primary/5 border-primary/10', icon: Zap },
  'on-hold': { label: 'On Hold', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-100', icon: Clock },
  'waiting-customer': { label: 'Waiting', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100', icon: User },
  'resolved': { label: 'Resolved', color: 'text-green-600', bg: 'bg-green-50 border-green-100', icon: CheckCircle2 },
  'closed': { label: 'Closed', color: 'text-slate-500', bg: 'bg-slate-100 border-slate-200', icon: ShieldCheck },
  'rejected': { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-50 border-red-100', icon: AlertCircle },
};

export default function ComplaintsAdminPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const isAdmin = useMemo(() => {
    const role = (userProfile?.role || '').toLowerCase();
    return role === 'admin' || role === 'manager' || user?.email?.toLowerCase() === 'skillmatrix24@gmail.com';
  }, [userProfile, user]);

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const complaintsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'complaints'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: complaintsData, isLoading } = useCollection<any>(complaintsQuery);
  const complaints = complaintsData || [];

  const teamQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null
  , [firestore, businessId]);
  const { data: teamMembersData } = useCollection<any>(teamQuery);
  const teamMembers = teamMembersData || [];

  const customersQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'customers') : null
  , [firestore, businessId]);
  const { data: customersData } = useCollection<any>(customersQuery);
  const customers = customersData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);

  // Form State
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    customerPhone: "",
    subject: "",
    description: "",
    category: "Service",
    priority: "medium",
    branchLocation: "Main",
    problemDate: new Date().toISOString().split('T')[0],
    problemTime: ""
  });

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    return customers.filter((c: any) => 
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || 
      c.phone?.includes(customerSearch)
    ).slice(0, 5);
  }, [customers, customerSearch]);

  const runEscalationScan = async () => {
    if (!isAdmin || !businessId || complaints.length === 0) return;
    setIsEscalating(true);
    let count = 0;
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);

    for (const c of complaints) {
      if (c.status === 'new' && !c.escalated) {
        const created = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
        if (created < cutoff) {
          const docRef = doc(firestore, 'businesses', businessId, 'complaints', c.id);
          updateDocumentNonBlocking(docRef, { escalated: true, priority: 'urgent' });
          addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'complaints', c.id, 'timeline'), {
            action: "Auto-Escalated due to 24h inactivity",
            by: "AI System Node",
            timestamp: new Date().toISOString()
          });
          count++;
        }
      }
    }
    setIsEscalating(false);
    if (count > 0) toast({ title: "Escalation Sync Complete", description: `${count} tickets moved to urgent status.` });
  };

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c: any) => {
      const matchesSearch = c.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           c.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.ticketId?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || c.priority === priorityFilter;
      
      const assignedIds = Array.isArray(c.assignedTo) ? c.assignedTo : (typeof c.assignedTo === 'string' ? [c.assignedTo] : []);
      const isAssignedToMe = assignedIds.includes(user?.uid);
      const hasPermission = isAdmin || isAssignedToMe;
      return matchesSearch && matchesStatus && matchesPriority && hasPermission;
    });
  }, [complaints, searchTerm, statusFilter, priorityFilter, isAdmin, user?.uid]);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;

    if (!formData.customerName || !formData.customerPhone) {
      toast({ variant: "destructive", title: "Missing Information", description: "Name and Phone are compulsory fields." });
      return;
    }

    const ticketId = `T-${Math.floor(1000 + Math.random() * 9000)}`;
    addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'complaints'), {
      ...formData,
      ticketId,
      status: 'new',
      assignedTo: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    setIsAddOpen(false);
    setFormData({
      customerId: "",
      customerName: "",
      customerPhone: "",
      subject: "",
      description: "",
      category: "Service",
      priority: "medium",
      branchLocation: "Main",
      problemDate: new Date().toISOString().split('T')[0],
      problemTime: ""
    });
    setCustomerSearch("");
    toast({ title: "Ticket Created", description: `Reference ID: ${ticketId}` });
  };

  const isPinned = useMemo(() => {
    const layout = (userProfile?.dashboardLayout as any[]) || [];
    return layout.find(w => w.id === 'pulse')?.enabled ?? true;
  }, [userProfile]);

  const toggleDashboardPin = () => {
    if (!userProfileRef || !userProfile) return;
    const currentLayout = [...(userProfile.dashboardLayout || [])];
    const newLayout = currentLayout.map(w => w.id === 'pulse' ? { ...w, enabled: !w.enabled } : w);
    updateDocumentNonBlocking(userProfileRef, { dashboardLayout: newLayout });
    toast({ title: isPinned ? "Unpinned" : "Pinned", description: `Support widget ${isPinned ? 'removed from' : 'added to'} Dashboard.` });
  };

  if (isLoading || isProfileLoading) return <div className="flex flex-col items-center justify-center py-20 opacity-40"><Loader2 className="h-10 w-10 animate-spin text-primary mb-4" /><p className="text-[10px] font-black uppercase tracking-widest text-primary">Accessing Support Node...</p></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20 px-2 sm:px-0 text-left">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
            <Headset className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">Support Desk</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest opacity-60">Complaint Registry</p>
              <div className="flex items-center gap-1.5 ml-2 bg-white px-2 py-1 rounded-lg border shadow-sm shrink-0">
                <LayoutDashboard className="h-3 w-3 text-muted-foreground" />
                <Switch checked={isPinned} onCheckedChange={toggleDashboardPin} className="scale-[0.6] data-[state=checked]:bg-primary" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={runEscalationScan} disabled={isEscalating} className="flex-1 sm:flex-none h-11 px-4 rounded-xl border-orange-200 text-orange-600 bg-white shadow-sm font-black uppercase text-[9px]">
             {isEscalating ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-1.5" /> : <Zap className="mr-1.5 h-3.5 w-3.5" />} Scan Inactivity
          </Button>
          <Button onClick={() => setIsAddOpen(true)} className="flex-1 sm:flex-none bg-primary shadow-xl h-11 px-6 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
            <Plus className="mr-2 h-4 w-4" /> New Ticket
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-5 md:p-6 border-l-4 border-l-primary flex flex-col justify-between h-28 md:h-32">
           <div className="flex items-center justify-between opacity-60"><span className="text-[10px] font-black uppercase tracking-widest">Total Tickets</span><Layers className="h-4 w-4 text-primary" /></div>
           <div className="text-2xl md:text-3xl font-black text-slate-900">{complaints.length}</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-5 md:p-6 border-l-4 border-l-blue-500 flex flex-col justify-between h-28 md:h-32">
           <div className="flex items-center justify-between opacity-60"><span className="text-[10px] font-black uppercase tracking-widest">New Requests</span><Zap className="h-4 w-4 text-blue-500" /></div>
           <div className="text-2xl md:text-3xl font-black text-slate-900">{complaints.filter(c => c.status === 'new').length}</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-5 md:p-6 border-l-4 border-l-red-500 flex flex-col justify-between h-28 md:h-32">
           <div className="flex items-center justify-between opacity-60"><span className="text-[10px] font-black uppercase tracking-widest text-red-600">Escalated</span><AlertCircle className="h-4 w-4 text-red-600" /></div>
           <div className="text-2xl md:text-3xl font-black text-red-700">{complaints.filter(c => c.escalated).length}</div>
        </Card>
        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-5 md:p-6 flex flex-col justify-between h-28 md:h-32">
           <div className="flex items-center justify-between opacity-40"><span className="text-[10px] font-black uppercase tracking-widest text-accent">Resolved Rate</span><TrendingUp className="h-4 w-4 text-accent" /></div>
           <div className="text-2xl md:text-3xl font-black text-white">{(complaints.length > 0 ? Math.round((complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length / complaints.length) * 100) : 0)}%</div>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
        <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-full md:w-40 rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-primary">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Lifecycle</SelectItem>
                {Object.keys(STATUS_CONFIG).map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-11 w-full md:w-40 rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-primary">
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Priority</SelectItem>
                {Object.keys(PRIORITY_CONFIG).map(p => <SelectItem key={p} value={p}>{PRIORITY_CONFIG[p].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input placeholder="Search ticket, customer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 pl-10 rounded-xl bg-white border-none shadow-inner text-xs font-bold w-full" />
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-muted/10 border-b">
                <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Ticket ID & Subject</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Customer</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12 text-center">Priority</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12 text-center">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Assigned Team</TableHead>
                <TableHead className="text-right pr-8 h-12 w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredComplaints.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-40 text-center opacity-30 italic text-sm">No matching tickets found.</TableCell></TableRow>
              ) : (
                filteredComplaints.map((c: any) => {
                  const sInfo = STATUS_CONFIG[c.status || 'new'];
                  const pInfo = PRIORITY_CONFIG[c.priority || 'medium'];
                  const assignedIds = Array.isArray(c.assignedTo) ? c.assignedTo : (typeof c.assignedTo === 'string' ? [c.assignedTo] : []);
                  
                  return (
                    <TableRow key={c.id} className="group hover:bg-muted/5 transition-colors border-b cursor-pointer" onClick={() => router.push(`/complaints/${c.id}`)}>
                      <TableCell className="pl-8 py-5">
                         <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-[10px] uppercase shadow-inner shrink-0 relative">
                               {c.category?.charAt(0) || 'S'}
                               {c.escalated && <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-600 rounded-full border-2 border-white animate-pulse" title="Escalated" />}
                            </div>
                            <div className="min-w-0">
                               <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{c.subject}</p>
                               <p className="text-[9px] font-mono text-primary/60 font-bold uppercase tracking-widest mt-1">ID: {c.ticketId}</p>
                            </div>
                         </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">{c.customerName}</span>
                            <span className="text-[9px] font-medium text-slate-400">{c.customerPhone}</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-center">
                         <Badge className={cn("text-[7px] font-black uppercase h-4 px-1.5 border-none", pInfo.bg, pInfo.color)}>{pInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                         <Badge className={cn("text-[8px] font-black uppercase h-4 px-1.5 border-none shadow-sm", sInfo.bg, sInfo.color)}>{sInfo.label}</Badge>
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-1 flex-wrap max-w-[150px]">
                            {assignedIds.length === 0 ? <span className="text-[10px] font-bold text-slate-400">UNASSIGNED</span> : assignedIds.map((uid: string) => {
                              const member = teamMembers.find(m => m.id === uid);
                              return (
                                <div key={uid} className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center font-black text-primary text-[8px] uppercase border" title={member?.name || 'User'}>
                                  {member?.name?.charAt(0) || '?'}
                                </div>
                              );
                            })}
                         </div>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                         <ChevronRight className="h-4 w-4 text-primary opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
         <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden flex flex-col text-left">
            <DialogHeader className="p-6 md:p-8 bg-primary text-white text-left shrink-0">
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                     <Plus className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black">Register New Ticket</DialogTitle>
                    <Badge variant="outline" className="text-white/70 border-white/20 text-[9px] font-bold uppercase mt-1 tracking-widest">Mandatory Details Required</Badge>
                  </div>
               </div>
            </DialogHeader>
            <ScrollArea className="flex-1 overflow-y-auto">
              <form id="raise-ticket-form" className="p-6 md:p-8 space-y-10 text-left" onSubmit={handleCreateTicket}>
                 {/* SEARCH SECTION */}
                 <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Search className="h-4 w-4 text-primary" />
                      <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Find Existing Customer (Optional)</h4>
                    </div>
                    <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
                       <input 
                          placeholder="Search registry by name or phone..." 
                          value={customerSearch} 
                          onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                          onFocus={() => setShowCustomerDropdown(true)}
                          className="flex h-12 w-full rounded-xl bg-muted/20 border-none shadow-inner text-sm font-bold pl-10 outline-none focus:ring-1 focus:ring-primary/20" 
                       />
                       {showCustomerDropdown && filteredCustomers.length > 0 && (
                          <div className="absolute top-full left-0 w-full bg-white border rounded-xl mt-2 shadow-2xl z-[110] overflow-hidden animate-in fade-in zoom-in-95">
                             {filteredCustomers.map(c => (
                               <div 
                                 key={c.id} 
                                 className="p-4 hover:bg-primary/5 cursor-pointer flex justify-between items-center border-b last:border-0"
                                 onClick={() => {
                                    setFormData({...formData, customerId: c.id, customerName: c.name, customerPhone: c.phone});
                                    setCustomerSearch("");
                                    setShowCustomerDropdown(false);
                                 }}
                               >
                                 <div className="flex flex-col"><span className="text-sm font-bold">{c.name}</span><span className="text-[10px] opacity-60 font-black">{c.phone}</span></div>
                                 <ChevronRight className="h-4 w-4 text-primary/30" />
                               </div>
                             ))}
                          </div>
                       )}
                    </div>
                 </div>

                 <Separator className="opacity-40" />

                 {/* MANDATORY IDENTITY SECTION */}
                 <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-primary" />
                      <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Customer Information (Mandatory)</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-10">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-[0.15em]">Full Name *</Label>
                        <Input required value={formData.customerName} onChange={(e) => setFormData({...formData, customerName: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-none shadow-inner font-bold text-lg" placeholder="e.g. John Doe" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-[0.15em]">Mobile Number *</Label>
                        <div className="relative">
                          <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 opacity-40" />
                          <Input required value={formData.customerPhone} onChange={(e) => setFormData({...formData, customerPhone: e.target.value.replace(/\D/g, '')})} placeholder="91XXXXXXXX" className="h-14 pl-12 rounded-2xl bg-slate-50 border-none shadow-inner font-bold text-lg" />
                        </div>
                      </div>
                    </div>
                 </div>

                 <Separator className="opacity-40" />

                 {/* PROBLEM TIMELINE SECTION */}
                 <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-primary" />
                      <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Occurrence Timeline</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                       <div className="space-y-1.5">
                         <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Date of Problem</Label>
                         <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40" />
                            <Input type="date" value={formData.problemDate} onChange={(e) => setFormData({...formData, problemDate: e.target.value})} className="h-11 pl-10 rounded-xl bg-muted/10 font-bold" />
                         </div>
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Approximate Time</Label>
                         <Input type="time" value={formData.problemTime} onChange={(e) => setFormData({...formData, problemTime: e.target.value})} className="h-11 rounded-xl bg-muted/10 font-bold" />
                       </div>
                    </div>
                 </div>

                 <Separator className="opacity-40" />

                 {/* ISSUE DETAILS SECTION */}
                 <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <LayoutList className="h-4 w-4 text-primary" />
                      <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Case Particulars</h4>
                    </div>
                    <div className="space-y-6">
                       <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Subject Title</Label>
                          <Input value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} placeholder="e.g. Delayed Delivery / Broken Item" required className="h-12 rounded-xl bg-muted/10 font-bold" />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                             <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Priority Level</Label>
                             <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                                <SelectTrigger className="h-11 rounded-xl font-bold uppercase text-[10px]"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  {Object.keys(PRIORITY_CONFIG).map(p => <SelectItem key={p} value={p} className="text-xs uppercase font-bold">{PRIORITY_CONFIG[p].label}</SelectItem>)}
                                </SelectContent>
                             </Select>
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Category</Label>
                             <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                                <SelectTrigger className="h-11 rounded-xl font-bold uppercase text-[10px]"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="Service" className="text-xs uppercase font-bold">Service</SelectItem>
                                  <SelectItem value="Product" className="text-xs uppercase font-bold">Product</SelectItem>
                                  <SelectItem value="Billing" className="text-xs uppercase font-bold">Billing</SelectItem>
                                  <SelectItem value="Logistics" className="text-xs uppercase font-bold">Logistics</SelectItem>
                                </SelectContent>
                             </Select>
                          </div>
                       </div>
                       <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Target Branch</Label>
                          <Select value={formData.branchLocation} onValueChange={(v) => setFormData({...formData, branchLocation: v})}>
                             <SelectTrigger className="h-11 rounded-xl bg-muted/10 border-none shadow-sm font-bold"><SelectValue placeholder="Select Branch" /></SelectTrigger>
                             <SelectContent className="rounded-xl">
                                <SelectItem value="Main" className="text-xs font-bold uppercase">Main Center</SelectItem>
                                {(business?.branchLocations || []).map((b: string) => <SelectItem key={b} value={b} className="text-xs font-bold uppercase">{b}</SelectItem>)}
                             </SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Problem Description</Label>
                          <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Please describe the issue in detail..." required className="min-h-[140px] rounded-2xl bg-muted/10 border-none shadow-inner p-4 text-sm font-medium leading-relaxed" />
                       </div>
                    </div>
                 </div>
              </form>
            </ScrollArea>
            <DialogFooter className="p-6 md:p-8 bg-muted/10 border-t shrink-0">
              <Button type="submit" form="raise-ticket-form" disabled={!formData.customerName || !formData.customerPhone} className="w-full h-16 bg-primary font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl text-white">Create Ticket</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
