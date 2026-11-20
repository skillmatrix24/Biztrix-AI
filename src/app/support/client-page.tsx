"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Headset,
  Search,
  Receipt,
  FileText,
  Package,
  UserCheck,
  BookOpenText,
  Globe,
  SmartphoneNfc,
  Settings,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Send,
  Layers,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Sparkles,
  Phone,
  Mail,
  User,
  Zap,
  Building2,
  HelpCircle,
  ArrowRight,
  RefreshCcw,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
  Plus,
  Lock,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PageHeader,
  KpiStatCard,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
  updateDocumentNonBlocking,
} from "@/firebase";
import { collection, query, orderBy, serverTimestamp, doc, where, arrayUnion } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import {
  SUPPORT_KNOWLEDGE_BASE,
  SupportPageGuide,
  SupportIssueSOP,
  searchSupportKnowledge,
  searchAllCommonIssues,
  formatCustomerScript,
  getSupportGroups,
} from "@/lib/support-knowledge-base";
import { cleanWhatsAppPhone, buildWhatsAppDirectUrl } from "@/lib/cleanup-notifications";

// Icon mapping helper
function resolveGuideIcon(iconName: string) {
  switch (iconName) {
    case "Receipt":
      return Receipt;
    case "FileText":
      return FileText;
    case "Package":
      return Package;
    case "UserCheck":
      return UserCheck;
    case "BookOpenText":
      return BookOpenText;
    case "Globe":
      return Globe;
    case "SmartphoneNfc":
      return SmartphoneNfc;
    case "Headset":
      return Headset;
    case "Settings":
      return Settings;
    default:
      return HelpCircle;
  }
}

const SEVERITY_BADGES: Record<string, string> = {
  critical: "bg-rose-100 text-rose-800 border-rose-300",
  high: "bg-amber-100 text-amber-800 border-amber-300",
  medium: "bg-sky-100 text-sky-800 border-sky-300",
  low: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function CustomerCareClientPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  // Active Tab state
  const [activeTab, setActiveTab] = useState<string>("pages");

  // Tab 1 (Page Guides) States
  const [pageSearch, setPageSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [expandedGuideIds, setExpandedGuideIds] = useState<Record<string, boolean>>({
    billing_pos: true,
  });

  // Tab 2 (Troubleshooter) States
  const [troubleshooterSearch, setTroubleshooterSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  // Tab 4 (Customer 360 Lookup) States
  const [customerLookupQuery, setCustomerLookupQuery] = useState("");

  // Copy Feedback State
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Ticket Quick Resolution Modal
  const [resolveTicketModalOpen, setResolveTicketModalOpen] = useState(false);
  const [ticketToResolve, setTicketToResolve] = useState<any>(null);
  const [selectedSopToAttach, setSelectedSopToAttach] = useState<string>("");
  const [customResolutionNote, setCustomResolutionNote] = useState("");
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);

  // User Profile and Business Retrieval
  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, "users", user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<any>(userDocRef);
  const businessId = userProfile?.businessId;

  const isPlatformOwner =
    user?.email?.toLowerCase() === "skillmatrix24@gmail.com" ||
    user?.email?.toLowerCase() === "gw7infra@gmail.com" ||
    user?.uid === "sEM5J1HuMCW8RbBTbvnJ5EwaDYA2" ||
    user?.uid === "jA4htunMjSVcMBpRuzfSx8yooHC2";

  const userRole = String(userProfile?.role || "").toLowerCase();

  // Internal support access: Platform owners, admins, managers, support agents, and staff
  const isAuthorizedSupportStaff = useMemo(() => {
    if (isPlatformOwner) return true;
    return (
      userRole === "admin" ||
      userRole === "owner" ||
      userRole === "manager" ||
      userRole === "support" ||
      userRole === "support_agent" ||
      userRole === "agent" ||
      userRole === "staff"
    );
  }, [isPlatformOwner, userRole]);

  // Complaints / Tickets Query
  const complaintsQuery = useMemoFirebase(() => {
    if (!businessId) return null;
    return query(
      collection(firestore, "businesses", businessId, "complaints"),
      orderBy("createdAt", "desc")
    );
  }, [firestore, businessId]);
  const { data: rawComplaints, isLoading: complaintsLoading } =
    useCollection<any>(complaintsQuery);
  const complaints = rawComplaints || [];

  // Customers Query for Lookup
  const customersQuery = useMemoFirebase(() => {
    if (!businessId) return null;
    return collection(firestore, "businesses", businessId, "customers");
  }, [firestore, businessId]);
  const { data: rawCustomers } = useCollection<any>(customersQuery);
  const allCustomers = rawCustomers || [];

  // Filtered Page Guides
  const filteredPageGuides = useMemo(() => {
    return searchSupportKnowledge(pageSearch, selectedGroup);
  }, [pageSearch, selectedGroup]);

  // Filtered Common Issues (Troubleshooter)
  const filteredIssues = useMemo(() => {
    let list = searchAllCommonIssues(troubleshooterSearch);
    if (severityFilter !== "all") {
      list = list.filter((item) => item.issue.severity === severityFilter);
    }
    return list;
  }, [troubleshooterSearch, severityFilter]);

  // Customer 360 Matching
  const matchedCustomers = useMemo(() => {
    const q = customerLookupQuery.trim().toLowerCase();
    if (!q) return [];
    return allCustomers.filter((c: any) => {
      const name = String(c.name || "").toLowerCase();
      const phone = String(c.phone || "");
      const email = String(c.email || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [allCustomers, customerLookupQuery]);

  // Overall KPI statistics
  const stats = useMemo(() => {
    const totalGuides = SUPPORT_KNOWLEDGE_BASE.length;
    let totalIssues = 0;
    for (const g of SUPPORT_KNOWLEDGE_BASE) {
      totalIssues += g.commonIssues.length;
    }
    const openTickets = complaints.filter(
      (c) => c.status !== "resolved" && c.status !== "closed"
    ).length;
    const resolvedTickets = complaints.filter(
      (c) => c.status === "resolved" || c.status === "closed"
    ).length;
    const resolutionRate =
      complaints.length > 0
        ? Math.round((resolvedTickets / complaints.length) * 100)
        : 100;

    return {
      totalGuides,
      totalIssues,
      openTickets,
      resolvedTickets,
      resolutionRate,
    };
  }, [complaints]);

  // Toggle guide expansion
  const toggleGuideExpand = (id: string) => {
    setExpandedGuideIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Copy helper
  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Copied to Clipboard", description: "Customer script copied successfully." });
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Direct WhatsApp Launcher
  const handleOpenWhatsApp = (phone: string, text: string) => {
    const clean = cleanWhatsAppPhone(phone);
    if (!clean) {
      toast({
        variant: "destructive",
        title: "Phone Required",
        description: "Please enter or verify the customer's phone number.",
      });
      return;
    }
    const url = buildWhatsAppDirectUrl(clean, text);
    try {
      if (typeof window !== "undefined") {
        const win = window.open(url, "_blank", "noopener,noreferrer");
        if (!win) {
          toast({
            title: "WhatsApp Ready",
            description: "Click copy text to paste message manually into WhatsApp.",
          });
        }
      }
    } catch {
      // safe fallback
    }
  };

  // Quick Ticket Resolution
  const handleOpenResolveModal = (ticket: any) => {
    setTicketToResolve(ticket);
    setSelectedSopToAttach("");
    setCustomResolutionNote("");
    setResolveTicketModalOpen(true);
  };

  const handleApplyResolution = async () => {
    if (!businessId || !ticketToResolve) return;
    setIsSubmittingResolution(true);

    try {
      const ticketRef = doc(firestore, "businesses", businessId, "complaints", ticketToResolve.id);
      const matchedSop = searchAllCommonIssues("").find((i) => i.issue.id === selectedSopToAttach);

      const noteText = customResolutionNote.trim() ||
        (matchedSop ? `Resolved with SOP [${matchedSop.issue.symptom}]: ${matchedSop.issue.rootCause}` : "Issue verified and resolved by support agent.");

      const newTimelineEntry = {
        action: "resolved",
        author: user?.displayName || user?.email || "Support Agent",
        timestamp: new Date().toISOString(),
        note: noteText,
        sopId: selectedSopToAttach || null,
      };

      await updateDocumentNonBlocking(ticketRef, {
        status: "resolved",
        resolvedAt: serverTimestamp(),
        timeline: arrayUnion(newTimelineEntry),
        resolutionNote: noteText,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Ticket Resolved",
        description: `Ticket #${ticketToResolve.id?.slice(0, 8)} status marked resolved.`,
      });

      // Optionally offer WhatsApp dispatch to customer
      if (ticketToResolve.customerPhone) {
        const customerText = formatCustomerScript(
          matchedSop?.issue.customerScript || "Namaste {customer_name}! Aapki samasya resolve kar di gayi hai: " + noteText,
          {
            customerName: ticketToResolve.customerName || "Customer",
            ticketId: ticketToResolve.id?.slice(0, 8),
          }
        );
        handleOpenWhatsApp(ticketToResolve.customerPhone, customerText);
      }

      setResolveTicketModalOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to Update",
        description: err?.message || "Could not update ticket.",
      });
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  // Guard 1: Loading authentication status
  if (isUserLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
        <p className="text-xs font-mono text-slate-500">Checking Support Team credentials...</p>
      </div>
    );
  }

  // Guard 2: Strict Non-Public Guard (Require authenticated user)
  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white border border-slate-200 rounded-3xl shadow-sm text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Private Support Operations Hub
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Yeh page public nahi hai. Yeh hamare website ke internal Customer Care aur Support Team ke liye reserve hai. Kripya apne support team account se sign in karein.
        </p>
        <div className="pt-2">
          <Button asChild className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold">
            <Link href="/login?redirect=/support">
              Sign In as Support Staff
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Guard 3: Strict Role Guard (Authorized Support Staff, Admin, or Owner only)
  if (!isAuthorizedSupportStaff) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white border border-slate-200 rounded-3xl shadow-sm text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Access Restricted to Support Team
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Aapka account ({user.email || userRole}) is internal Customer Care portal ke liye authorized nahi hai. Yeh page sirf support staff aur administrators ke liye reserved hai.
        </p>
        <div className="pt-2">
          <Button asChild variant="outline" className="w-full h-10 rounded-xl border-slate-200 text-xs font-semibold">
            <Link href="/dashboard">
              Back to Workspace Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <PageHeader
        title="Customer Care & Support Operations"
        description="Internal portal for authorized Support Team members only: page-wise interactive frontend guide, troubleshooting SOPs, live ticket queue, aur customer 360 lookup."
        badgeText="Support Team Only (Internal)"
        badgeIcon={Lock}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-slate-200 text-xs font-semibold"
            >
              <Link href="/complaints">
                <Layers className="h-3.5 w-3.5 mr-1.5 text-slate-600" />
                Open Tickets Queue
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
            >
              <Link href="/billing">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Live Billing Desk
              </Link>
            </Button>
          </div>
        }
      />

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiStatCard
          title="System Page Guides"
          value={stats.totalGuides}
          icon={Globe}
          change="100% Core Coverage"
          trend="neutral"
        />
        <KpiStatCard
          title="Troubleshooting SOPs"
          value={stats.totalIssues}
          icon={CheckCircle2}
          change="Instant Canned Fixes"
          trend="up"
        />
        <KpiStatCard
          title="Open Customer Tickets"
          value={stats.openTickets}
          icon={Clock}
          change={stats.openTickets > 0 ? "Requires Agent Attention" : "All Clear"}
          trend={stats.openTickets > 0 ? "down" : "up"}
        />
        <KpiStatCard
          title="Resolution Rate"
          value={`${stats.resolutionRate}%`}
          icon={ShieldCheck}
          change={`${stats.resolvedTickets} tickets solved`}
          trend="up"
        />
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 bg-slate-100 p-1.5 rounded-2xl h-auto gap-1 border border-slate-200/80">
          <TabsTrigger
            value="pages"
            className="rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs flex items-center justify-center gap-2"
          >
            <Globe className="h-4 w-4 text-primary" />
            <span>Page-by-Page SOP</span>
          </TabsTrigger>
          <TabsTrigger
            value="troubleshooter"
            className="rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs flex items-center justify-center gap-2"
          >
            <Zap className="h-4 w-4 text-amber-600" />
            <span>Problem Finder</span>
            <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-amber-100 text-amber-800 border-none">
              {stats.totalIssues}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="tickets"
            className="rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs flex items-center justify-center gap-2"
          >
            <Headset className="h-4 w-4 text-emerald-600" />
            <span>Live Tickets Desk</span>
            {stats.openTickets > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-rose-500 text-white border-none animate-pulse">
                {stats.openTickets}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="lookup"
            className="rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs flex items-center justify-center gap-2"
          >
            <UserCheck className="h-4 w-4 text-blue-600" />
            <span>Customer 360° Lookup</span>
          </TabsTrigger>
        </TabsList>

        {/* =========================================================================
            TAB 1: PAGE-BY-PAGE FRONTEND INTERACTIVE SYSTEM GUIDE
        ========================================================================== */}
        <TabsContent value="pages" className="space-y-6 m-0">
          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={pageSearch}
                  onChange={(e) => setPageSearch(e.target.value)}
                  placeholder="Search page name, customer symptoms, keywords (e.g. printer, igst, negative stock, barcode)..."
                  className="pl-10 h-10 rounded-xl bg-slate-50/50 border-slate-200 text-xs sm:text-sm"
                />
                {pageSearch && (
                  <button
                    onClick={() => setPageSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="sm:col-span-4 flex items-center justify-end">
                <span className="text-xs text-slate-500 font-mono">
                  Showing {filteredPageGuides.length} of {SUPPORT_KNOWLEDGE_BASE.length} Page SOPs
                </span>
              </div>
            </div>

            {/* Group Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                type="button"
                onClick={() => setSelectedGroup("all")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
                  selectedGroup === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Modules
              </button>
              {getSupportGroups().map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setSelectedGroup(group)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
                    selectedGroup === group
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>

          {/* List of Interactive Page Guides */}
          {filteredPageGuides.length === 0 ? (
            <EmptyStatePanel
              icon={Search}
              title="No Matching Page Guide Found"
              description={`Koi bhi page guide "${pageSearch}" query se match nahi hua. Search clear karein ya keywords check karein.`}
              action={
                <Button variant="outline" size="sm" onClick={() => { setPageSearch(""); setSelectedGroup("all"); }}>
                  Reset Search
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {filteredPageGuides.map((guide) => {
                const IconComp = resolveGuideIcon(guide.iconName);
                const isExpanded = Boolean(expandedGuideIds[guide.id]);

                return (
                  <div
                    key={guide.id}
                    className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all hover:border-slate-300"
                  >
                    {/* Header Bar */}
                    <div className="p-5 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row bg-slate-50/50 border-b border-slate-100">
                      <div className="flex items-start gap-3.5">
                        <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs text-primary">
                          <IconComp className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                              {guide.title}
                            </h3>
                            <Badge className="bg-slate-200/70 text-slate-700 border-slate-300 font-mono text-[10px]">
                              {guide.group}
                            </Badge>
                            <span className="font-mono text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {guide.route}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                            {guide.summary}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">
                            <span className="text-slate-400">Hindi: </span>
                            {guide.summaryHindi}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg text-xs border-slate-200 hover:bg-white"
                          title="Open live page in new tab"
                        >
                          <Link href={guide.route} target="_blank">
                            <ExternalLink className="h-3.5 w-3.5 mr-1 text-slate-500" />
                            Live Page
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGuideExpand(guide.id)}
                          className="h-8 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-200/60"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1 text-slate-500" />
                              Hide SOPs
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1 text-slate-500" />
                              View SOPs ({guide.commonIssues.length})
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Step-by-Step Customer Journey (Always visible quick guide) */}
                    <div className="p-5 space-y-4">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Customer Frontend Workflow (Kaise Kaam Karta Hai)
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-2.5">
                          {guide.customerJourney.map((step, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-start gap-2.5 text-xs text-slate-700 leading-snug"
                            >
                              <div className="h-5 w-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </div>
                              <span className="font-medium">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Key Frontend Controls */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Key Buttons & Interactive Screen Controls
                        </span>
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          {guide.keyFrontendControls.map((ctrl, cIdx) => (
                            <div
                              key={cIdx}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs space-x-1.5 shadow-2xs"
                            >
                              <span className="font-bold text-slate-800">
                                {ctrl.label}:
                              </span>
                              <span className="text-slate-600 text-[11px]">
                                {ctrl.actionDescription}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Expanded Section: Common Issues, Root Causes, and Agent SOPs */}
                      {isExpanded && (
                        <div className="pt-4 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                              Common Customer Issues & Agent Resolution SOPs ({guide.commonIssues.length})
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              Canned WhatsApp & Action Checklist
                            </span>
                          </div>

                          <div className="space-y-3">
                            {guide.commonIssues.map((issue) => (
                              <div
                                key={issue.id}
                                className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3"
                              >
                                <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge className={SEVERITY_BADGES[issue.severity] || "bg-slate-100 text-slate-700"}>
                                        {issue.severity.toUpperCase()}
                                      </Badge>
                                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                                        {issue.symptom}
                                      </h4>
                                    </div>
                                    <p className="text-xs text-slate-600 font-medium">
                                      <span className="text-slate-400">Hindi: </span>
                                      {issue.symptomHindi}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCopyText(issue.id, issue.customerScript)}
                                      className="h-8 rounded-lg text-xs border-slate-200 bg-white hover:bg-slate-50 font-semibold"
                                    >
                                      {copiedId === issue.id ? (
                                        <>
                                          <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                                          Copied
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="h-3.5 w-3.5 mr-1" />
                                          Copy Script
                                        </>
                                      )}
                                    </Button>

                                    {issue.settingsPath && (
                                      <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="h-8 rounded-lg text-xs border-slate-200 bg-white"
                                      >
                                        <Link href={issue.settingsPath}>
                                          <Settings className="h-3 w-3 mr-1 text-slate-500" />
                                          Open Settings
                                        </Link>
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {/* Root Cause Alert Box */}
                                <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-950 font-mono flex items-start gap-2">
                                  <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold">Root Cause: </span>
                                    <span>{issue.rootCause}</span>
                                  </div>
                                </div>

                                {/* Step by Step Agent SOP */}
                                <div className="space-y-1.5">
                                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                                    Support Agent Resolution Steps:
                                  </span>
                                  <ol className="space-y-1 text-xs text-slate-700 pl-1">
                                    {issue.agentSteps.map((s, sIdx) => (
                                      <li key={sIdx} className="flex items-start gap-2">
                                        <span className="h-4 w-4 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                          {sIdx + 1}
                                        </span>
                                        <span>{s}</span>
                                      </li>
                                    ))}
                                  </ol>
                                </div>

                                {/* Canned Customer Script */}
                                <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1 text-xs">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Ready Canned WhatsApp / SMS Message:
                                  </span>
                                  <p className="text-slate-800 italic font-mono text-[11px]">
                                    "{issue.customerScript}"
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* =========================================================================
            TAB 2: SMART ISSUE TROUBLESHOOTER (PROBLEM FINDER)
        ========================================================================== */}
        <TabsContent value="troubleshooter" className="space-y-6 m-0">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={troubleshooterSearch}
                  onChange={(e) => setTroubleshooterSearch(e.target.value)}
                  placeholder="Describe customer's problem (e.g. blank receipt, negative stock, expired token, eway distance)..."
                  className="pl-10 h-10 rounded-xl bg-slate-50/50 border-slate-200 text-xs sm:text-sm"
                />
                {troubleshooterSearch && (
                  <button
                    onClick={() => setTroubleshooterSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="sm:col-span-4 flex items-center justify-end gap-1.5">
                <span className="text-xs text-slate-500 mr-2">Severity:</span>
                {["all", "critical", "high", "medium", "low"].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-all ${
                      severityFilter === sev
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Troubleshooter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredIssues.map(({ issue, guideTitle, guideRoute, guideGroup }) => (
              <div
                key={issue.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-mono text-[10px]">
                        {guideTitle}
                      </Badge>
                      <Badge className={SEVERITY_BADGES[issue.severity] || "bg-slate-100 text-slate-700"}>
                        {issue.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <Link
                      href={guideRoute}
                      target="_blank"
                      className="text-[11px] font-mono text-primary flex items-center hover:underline"
                    >
                      {guideRoute} <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{issue.symptom}</h3>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">{issue.symptomHindi}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 font-mono">
                    <span className="font-bold">Root Cause: </span>
                    {issue.rootCause}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                      Resolution SOP Steps:
                    </span>
                    <ol className="space-y-1 text-xs text-slate-700 pl-1">
                      {issue.agentSteps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyText(issue.id, issue.customerScript)}
                    className="h-8 rounded-lg text-xs font-semibold border-slate-200"
                  >
                    {copiedId === issue.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copy Canned Script
                      </>
                    )}
                  </Button>

                  {issue.settingsPath && (
                    <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg text-xs text-slate-600">
                      <Link href={issue.settingsPath}>
                        Open Fix Settings <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* =========================================================================
            TAB 3: LIVE TICKET & COMPLAINT QUEUE
        ========================================================================== */}
        <TabsContent value="tickets" className="space-y-6 m-0">
          <SectionCard
            title="Live Customer Tickets & Escalations"
            description="Customers dwara bheje gaye tickets ko review karein, status change karein, aur verified SOP se solve karein."
          >
            {complaintsLoading ? (
              <div className="py-12 text-center text-slate-400 font-mono text-xs">
                Loading live ticket queue from Firestore...
              </div>
            ) : complaints.length === 0 ? (
              <EmptyStatePanel
                icon={CheckCircle2}
                title="All Clear! No Open Tickets"
                description="Koi bhi pending ya active complaint ticket nahi hai. Support system up to date hai."
                action={
                  <Button asChild size="sm" className="rounded-xl">
                    <Link href="/complaints">
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Test Ticket
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {complaints.map((ticket: any) => {
                  const isResolved = ticket.status === "resolved" || ticket.status === "closed";
                  return (
                    <div
                      key={ticket.id}
                      className={`p-4 rounded-xl border transition-all flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row ${
                        isResolved
                          ? "border-slate-200 bg-slate-50/50 opacity-80"
                          : "border-slate-200 bg-white shadow-xs hover:border-slate-300"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            #{ticket.id?.slice(0, 8)}
                          </span>
                          <Badge
                            className={`text-[10px] font-semibold ${
                              ticket.status === "resolved"
                                ? "bg-emerald-100 text-emerald-800"
                                : ticket.status === "in-progress"
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-sky-100 text-sky-800"
                            }`}
                          >
                            {String(ticket.status || "NEW").toUpperCase()}
                          </Badge>
                          <Badge className="bg-slate-100 text-slate-700 text-[10px] font-mono">
                            Priority: {String(ticket.priority || "Medium").toUpperCase()}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-slate-900 text-xs sm:text-sm">
                          {ticket.subject || ticket.title || "Customer Inquiry / Issue"}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500 font-mono flex-wrap">
                          {ticket.customerName && (
                            <span className="flex items-center gap-1 text-slate-700">
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              {ticket.customerName}
                            </span>
                          )}
                          {ticket.customerPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5 text-slate-400" />
                              {ticket.customerPhone}
                            </span>
                          )}
                          <span>
                            Created: {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : "Recent"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {ticket.customerPhone && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleOpenWhatsApp(
                                ticket.customerPhone,
                                `Namaste ${ticket.customerName || "Customer"}! Main Biztrix Support se baat kar raha hoon aapke ticket #${ticket.id?.slice(0, 8)} ke sandarbh me.`
                              )
                            }
                            className="h-8 rounded-lg border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100"
                          >
                            <MessageSquare className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                            WhatsApp
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenResolveModal(ticket)}
                          className="h-8 rounded-lg text-xs font-semibold border-slate-200"
                        >
                          Resolve with SOP
                        </Button>

                        <Button
                          asChild
                          size="sm"
                          className="h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                        >
                          <Link href={`/complaints/${ticket.id}`}>
                            Details →
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* =========================================================================
            TAB 4: CUSTOMER 360° LOOKUP
        ========================================================================== */}
        <TabsContent value="lookup" className="space-y-6 m-0">
          <SectionCard
            title="Customer 360° Quick Lookup"
            description="Customer ka phone number ya email enter karein taaki unki poori history aur details ek jagah mil sakein."
          >
            <div className="space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={customerLookupQuery}
                  onChange={(e) => setCustomerLookupQuery(e.target.value)}
                  placeholder="Enter 10-digit mobile number, customer name, or email..."
                  className="pl-10 h-11 rounded-xl bg-slate-50/50 border-slate-200 text-xs sm:text-sm font-mono"
                />
              </div>

              {!customerLookupQuery.trim() ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Type a customer's phone number or name above to load their 360° profile.
                </div>
              ) : matchedCustomers.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No registered customer found for "{customerLookupQuery}".
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matchedCustomers.map((cust: any) => (
                    <div
                      key={cust.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                            {(cust.name || "C")[0]?.toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{cust.name}</h4>
                            <p className="font-mono text-xs text-slate-500">{cust.phone}</p>
                          </div>
                        </div>

                        {cust.phone && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleOpenWhatsApp(
                                cust.phone,
                                `Namaste ${cust.name || "Customer"}! Biztrix Support se aapki kya sahayata kar sakte hain?`
                              )
                            }
                            className="h-8 rounded-lg border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold"
                          >
                            <MessageSquare className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                            WhatsApp
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[10px]">EMAIL</span>
                          <span className="text-slate-700 truncate block">{cust.email || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">CITY / STATE</span>
                          <span className="text-slate-700 block">{cust.city || cust.state || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">TOTAL OUTSTANDING</span>
                          <span className="text-slate-900 font-bold block">₹{cust.outstandingBalance || 0}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">LOYALTY POINTS</span>
                          <span className="text-slate-900 font-bold block">{cust.loyaltyPoints || 0} pts</span>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between text-xs">
                        <Button asChild variant="ghost" size="sm" className="h-8 text-primary font-semibold">
                          <Link href={`/customers`}>
                            View Full Ledger →
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs">
                          <Link href={`/billing`}>
                            Create New POS Bill
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* =========================================================================
          MODAL: RESOLVE TICKET WITH SOP
      ========================================================================== */}
      <Dialog open={resolveTicketModalOpen} onOpenChange={setResolveTicketModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-2xl bg-white p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Resolve Ticket with SOP
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Attach a verified solution SOP to ticket #{ticketToResolve?.id?.slice(0, 8)} and mark as resolved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Select Matching SOP:</label>
              <select
                value={selectedSopToAttach}
                onChange={(e) => setSelectedSopToAttach(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
              >
                <option value="">-- Select from Knowledge Base --</option>
                {searchAllCommonIssues("").map((item) => (
                  <option key={item.issue.id} value={item.issue.id}>
                    [{item.guideTitle}] {item.issue.symptom}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Resolution Note for Customer & Team:</label>
              <textarea
                rows={4}
                value={customResolutionNote}
                onChange={(e) => setCustomResolutionNote(e.target.value)}
                placeholder="Enter details of what was checked and fixed (e.g. Printer margin set to none, stock in updated, or invoice regenerated)..."
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setResolveTicketModalOpen(false)}
              className="h-9 rounded-xl border-slate-200 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmittingResolution}
              onClick={handleApplyResolution}
              className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              Mark Resolved & Send WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
