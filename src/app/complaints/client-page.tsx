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
  User,
  Smartphone,
  LayoutDashboard,
  LayoutList,
  Calendar,
} from "lucide-react";
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
  TableRow,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from "@/firebase";
import { collection, query, orderBy, serverTimestamp, doc, where } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  KpiStatCard,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";

const PRIORITY_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  low: { label: "Normal", badgeClass: "bg-slate-100 text-slate-600 border-slate-200" },
  medium: { label: "Medium", badgeClass: "bg-sky-50 text-sky-700 border-sky-200" },
  high: { label: "Urgent", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  urgent: { label: "High Priority", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" },
  emergency: { label: "Emergency", badgeClass: "bg-rose-100 text-rose-900 border-rose-300" },
};

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; icon: any }> = {
  new: { label: "New", badgeClass: "bg-sky-50 text-sky-700 border-sky-200", icon: Zap },
  pending: { label: "Pending", badgeClass: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  "in-progress": {
    label: "Working",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: Zap,
  },
  "on-hold": { label: "On Hold", badgeClass: "bg-slate-100 text-slate-600 border-slate-200", icon: Clock },
  "waiting-customer": {
    label: "Waiting",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    icon: User,
  },
  resolved: {
    label: "Resolved",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  closed: {
    label: "Closed",
    badgeClass: "bg-slate-100 text-slate-500 border-slate-200",
    icon: ShieldCheck,
  },
  rejected: {
    label: "Rejected",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    icon: AlertCircle,
  },
};

export default function ComplaintsAdminPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const isAdmin = useMemo(() => {
    const role = (userProfile?.role || "").toLowerCase();
    return (
      role === "admin" ||
      role === "manager" ||
      user?.email?.toLowerCase() === "skillmatrix24@gmail.com"
    );
  }, [userProfile, user]);

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const complaintsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "complaints"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: complaintsData, isLoading } = useCollection<any>(complaintsQuery);
  const complaints = complaintsData || [];

  const teamQuery = useMemoFirebase(
    () => (businessId ? query(collection(firestore, "users"), where("businessId", "==", businessId)) : null),
    [firestore, businessId]
  );
  const { data: teamMembersData } = useCollection<any>(teamQuery);
  const teamMembers = teamMembersData || [];

  const customersQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "customers") : null),
    [firestore, businessId]
  );
  const { data: customersData } = useCollection<any>(customersQuery);
  const customers = customersData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);

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
    problemDate: new Date().toISOString().split("T")[0],
    problemTime: "",
  });

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    return customers
      .filter(
        (c: any) =>
          c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.phone?.includes(customerSearch)
      )
      .slice(0, 5);
  }, [customers, customerSearch]);

  const runEscalationScan = async () => {
    if (!isAdmin || !businessId || complaints.length === 0) return;
    setIsEscalating(true);
    let count = 0;
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);

    for (const c of complaints) {
      if (c.status === "new" && !c.escalated) {
        const created = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
        if (created < cutoff) {
          const docRef = doc(firestore, "businesses", businessId, "complaints", c.id);
          updateDocumentNonBlocking(docRef, { escalated: true, priority: "urgent" });
          addDocumentNonBlocking(
            collection(firestore, "businesses", businessId, "complaints", c.id, "timeline"),
            {
              action: "Auto-Escalated due to 24h inactivity",
              by: "Automated Escalation",
              timestamp: new Date().toISOString(),
            }
          );
          count++;
        }
      }
    }
    setIsEscalating(false);
    if (count > 0)
      toast({
        title: "Escalation Sync Complete",
        description: `${count} tickets moved to urgent status.`,
      });
  };

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c: any) => {
      const matchesSearch =
        c.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.ticketId?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || c.priority === priorityFilter;

      const assignedIds = Array.isArray(c.assignedTo)
        ? c.assignedTo
        : typeof c.assignedTo === "string"
          ? [c.assignedTo]
          : [];
      const isAssignedToMe = assignedIds.includes(user?.uid);
      const hasPermission = isAdmin || isAssignedToMe;
      return matchesSearch && matchesStatus && matchesPriority && hasPermission;
    });
  }, [complaints, searchTerm, statusFilter, priorityFilter, isAdmin, user?.uid]);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;

    if (!formData.customerName || !formData.customerPhone) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Name and Phone are compulsory fields.",
      });
      return;
    }

    const ticketId = `T-${Math.floor(1000 + Math.random() * 9000)}`;
    addDocumentNonBlocking(collection(firestore, "businesses", businessId, "complaints"), {
      ...formData,
      ticketId,
      status: "new",
      assignedTo: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
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
      problemDate: new Date().toISOString().split("T")[0],
      problemTime: "",
    });
    setCustomerSearch("");
    toast({ title: "Ticket Created", description: `Reference ID: ${ticketId}` });
  };

  const isPinned = useMemo(() => {
    const layout = (userProfile?.dashboardLayout as any[]) || [];
    return layout.find((w) => w.id === "pulse")?.enabled ?? true;
  }, [userProfile]);

  const toggleDashboardPin = () => {
    if (!userProfileRef || !userProfile) return;
    const currentLayout = [...(userProfile.dashboardLayout || [])];
    const newLayout = currentLayout.map((w) =>
      w.id === "pulse" ? { ...w, enabled: !w.enabled } : w
    );
    updateDocumentNonBlocking(userProfileRef, { dashboardLayout: newLayout });
    toast({
      title: isPinned ? "Unpinned" : "Pinned",
      description: `Support widget ${isPinned ? "removed from" : "added to"} Dashboard.`,
    });
  };

  const resolvedPercent =
    complaints.length > 0
      ? Math.round(
          (complaints.filter((c) => c.status === "resolved" || c.status === "closed").length /
            complaints.length) *
            100
        )
      : 0;

  if (isLoading || isProfileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-50 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
        <p className="text-xs font-medium text-slate-500">Loading support tickets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-left">
      <PageHeader
        breadcrumb="Engagement & Support"
        title="Support Desk"
        description="Track customer issues, assign team specialists, and monitor SLA escalations."
        icon={Headset}
        actions={
          <>
            <div className="flex items-center gap-2 bg-white px-3 h-10 rounded-xl border border-slate-200">
              <LayoutDashboard className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-700">Pin Widget</span>
              <Switch
                aria-label="Pin support desk widget to dashboard"
                checked={isPinned}
                onCheckedChange={toggleDashboardPin}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={runEscalationScan}
              disabled={isEscalating}
              className="h-10 px-4 rounded-xl border-amber-200 text-amber-700 bg-white hover:bg-amber-50 text-xs font-semibold gap-1.5"
            >
              {isEscalating ? (
                <Loader2 className="animate-spin h-3.5 w-3.5" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              Scan Inactivity
            </Button>
            <Button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 h-10 px-4 font-semibold text-xs rounded-xl text-white gap-2"
            >
              <Plus className="h-4 w-4" /> New Ticket
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiStatCard
          label="Total Tickets"
          value={complaints.length}
          subtext="All registered cases"
          icon={Layers}
        />
        <KpiStatCard
          label="New Requests"
          value={complaints.filter((c) => c.status === "new").length}
          subtext="Awaiting triage"
          icon={Zap}
        />
        <KpiStatCard
          label="Escalated"
          value={complaints.filter((c) => c.escalated).length}
          subtext="Past 24h SLA window"
          icon={AlertCircle}
          tone="danger"
        />
        <KpiStatCard
          label="Resolution Rate"
          value={`${resolvedPercent}%`}
          subtext="Resolved & closed"
          icon={TrendingUp}
          tone="dark"
        />
      </div>

      <SectionCard
        title="Complaint Registry"
        description="Click any ticket row to assign specialists, reply, or update resolution status."
        headerRight={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-36 rounded-xl bg-white border-slate-200 text-xs font-medium">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Lifecycle</SelectItem>
                {Object.keys(STATUS_CONFIG).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-9 w-36 rounded-xl bg-white border-slate-200 text-xs font-medium">
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Priority</SelectItem>
                {Object.keys(PRIORITY_CONFIG).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_CONFIG[p].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search ticket, customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 rounded-xl border-slate-200 bg-white text-xs"
              />
            </div>
          </div>
        }
        bodyClassName="p-0"
      >
        {filteredComplaints.length === 0 ? (
          <div className="p-6">
            <EmptyStatePanel
              icon={Headset}
              title="No matching tickets found"
              description="Create a new support ticket or clear active search filters to view tickets."
            />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <Table className="min-w-[920px]">
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200">
                  <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">
                    Ticket ID & Subject
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 h-11">
                    Customer
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 h-11 text-center">
                    Priority
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 h-11 text-center">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 h-11">
                    Assigned Team
                  </TableHead>
                  <TableHead className="text-right pr-6 h-11 w-14"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComplaints.map((c: any) => {
                  const sInfo = STATUS_CONFIG[c.status || "new"] || STATUS_CONFIG.new;
                  const pInfo = PRIORITY_CONFIG[c.priority || "medium"] || PRIORITY_CONFIG.medium;
                  const assignedIds = Array.isArray(c.assignedTo)
                    ? c.assignedTo
                    : typeof c.assignedTo === "string"
                      ? [c.assignedTo]
                      : [];

                  return (
                    <TableRow
                      key={c.id}
                      className="group hover:bg-slate-50/70 transition-colors border-b border-slate-100 cursor-pointer"
                      onClick={() => router.push(`/complaints/${c.id}`)}
                    >
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-semibold text-slate-700 text-xs shrink-0 relative">
                            {c.category?.charAt(0) || "S"}
                            {c.escalated && (
                              <span
                                className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-rose-600 rounded-full border-2 border-white"
                                title="Escalated"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {c.subject}
                            </p>
                            <p className="text-xs font-mono text-slate-500 tabular-nums mt-0.5">
                              {c.ticketId}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900">
                            {c.customerName}
                          </span>
                          <span className="text-xs font-mono text-slate-500 tabular-nums">
                            {c.customerPhone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn("text-[11px] font-semibold px-2 py-0.5", pInfo.badgeClass)}
                        >
                          {pInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn("text-[11px] font-semibold px-2 py-0.5", sInfo.badgeClass)}
                        >
                          {sInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap max-w-[150px]">
                          {assignedIds.length === 0 ? (
                            <span className="text-xs text-slate-400">Unassigned</span>
                          ) : (
                            assignedIds.map((uid: string) => {
                              const member = teamMembers.find((m) => m.id === uid);
                              return (
                                <div
                                  key={uid}
                                  className="h-6 w-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-semibold text-slate-700 text-xs"
                                  title={member?.name || "Team member"}
                                >
                                  {member?.name?.charAt(0) || "?"}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-900 transition-colors ml-auto" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden flex flex-col text-left">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Register New Ticket
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 mt-0.5">
                  Customer name, mobile number, and issue subject are required.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 overflow-y-auto">
            <form
              id="raise-ticket-form"
              className="p-6 space-y-6 text-left"
              onSubmit={handleCreateTicket}
            >
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-slate-500" /> Find Existing Customer
                  (Optional)
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    placeholder="Search registry by name or phone..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="flex h-10 w-full rounded-xl bg-white border border-slate-200 text-sm pl-9 pr-3 outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-xl mt-1.5 z-[110] overflow-hidden shadow-md">
                      {filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left p-3 hover:bg-slate-50 flex justify-between items-center border-b border-slate-100 last:border-0"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              customerId: c.id,
                              customerName: c.name,
                              customerPhone: c.phone,
                            });
                            setCustomerSearch("");
                            setShowCustomerDropdown(false);
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900">
                              {c.name}
                            </span>
                            <span className="text-xs font-mono text-slate-500 tabular-nums">
                              {c.phone}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-slate-500" /> Customer Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Full Name *</Label>
                    <Input
                      required
                      value={formData.customerName}
                      onChange={(e) =>
                        setFormData({ ...formData, customerName: e.target.value })
                      }
                      className="h-10 rounded-xl border-slate-200 bg-white text-sm"
                      placeholder="e.g. Rohan Mehta"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Mobile Number *
                    </Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        required
                        value={formData.customerPhone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customerPhone: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        placeholder="91XXXXXXXX"
                        className="h-10 pl-9 rounded-xl border-slate-200 bg-white font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-slate-500" /> Occurrence Timeline
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Date of Problem
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="date"
                        value={formData.problemDate}
                        onChange={(e) =>
                          setFormData({ ...formData, problemDate: e.target.value })
                        }
                        className="h-10 pl-9 rounded-xl border-slate-200 bg-white text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Approximate Time
                    </Label>
                    <Input
                      type="time"
                      value={formData.problemTime}
                      onChange={(e) =>
                        setFormData({ ...formData, problemTime: e.target.value })
                      }
                      className="h-10 rounded-xl border-slate-200 bg-white text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                  <LayoutList className="h-3.5 w-3.5 text-slate-500" /> Case Particulars
                </h4>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Subject Title *
                    </Label>
                    <Input
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData({ ...formData, subject: e.target.value })
                      }
                      placeholder="e.g. Delayed Delivery / Broken Item"
                      required
                      className="h-10 rounded-xl border-slate-200 bg-white text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Priority Level
                      </Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(v) => setFormData({ ...formData, priority: v })}
                      >
                        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {Object.keys(PRIORITY_CONFIG).map((p) => (
                            <SelectItem key={p} value={p} className="text-xs">
                              {PRIORITY_CONFIG[p].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(v) => setFormData({ ...formData, category: v })}
                      >
                        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="Service" className="text-xs">
                            Service
                          </SelectItem>
                          <SelectItem value="Product" className="text-xs">
                            Product
                          </SelectItem>
                          <SelectItem value="Billing" className="text-xs">
                            Billing
                          </SelectItem>
                          <SelectItem value="Logistics" className="text-xs">
                            Logistics
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Target Branch</Label>
                    <Select
                      value={formData.branchLocation}
                      onValueChange={(v) => setFormData({ ...formData, branchLocation: v })}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium">
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Main" className="text-xs">
                          Main Center
                        </SelectItem>
                        {(business?.branchLocations || []).map((b: string) => (
                          <SelectItem key={b} value={b} className="text-xs">
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Problem Description *
                    </Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Please describe the issue in detail..."
                      required
                      className="min-h-[110px] rounded-xl border-slate-200 bg-white p-3.5 text-sm leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            </form>
          </ScrollArea>
          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              className="h-10 px-4 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="raise-ticket-form"
              disabled={!formData.customerName || !formData.customerPhone}
              className="h-10 px-5 bg-slate-900 hover:bg-slate-800 font-semibold text-xs rounded-xl text-white"
            >
              Create Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
