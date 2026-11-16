"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  User,
  Bot,
  ShieldCheck,
  Star,
  Send,
  Loader2,
  BadgeCheck,
  Zap,
  Activity,
  MessageSquare,
  AlertTriangle,
  ShieldAlert,
  ImageIcon,
  Lock,
  PhoneCall,
  Users,
  LayoutList,
  Sparkles,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionCard, EmptyStatePanel } from "@/components/ui/editorial";
import {
  useFirestore,
  useDoc,
  useMemoFirebase,
  updateDocumentNonBlocking,
  useCollection,
  addDocumentNonBlocking,
} from "@/firebase";
import {
  doc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  where,
  getDoc,
  getDocs,
  limit,
} from "firebase/firestore";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  new: {
    label: "Raised",
    color: "text-sky-700",
    bg: "bg-sky-50 border-sky-200",
    icon: Zap,
  },
  pending: {
    label: "In Queue",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: Clock,
  },
  "in-progress": {
    label: "In Progress",
    color: "text-slate-900",
    bg: "bg-slate-100 border-slate-200",
    icon: Activity,
  },
  "on-hold": {
    label: "On Hold",
    color: "text-slate-700",
    bg: "bg-slate-100 border-slate-200",
    icon: Clock,
  },
  "waiting-customer": {
    label: "Action Needed",
    color: "text-violet-700",
    bg: "bg-violet-50 border-violet-200",
    icon: User,
  },
  resolved: {
    label: "Resolved",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: CheckCircle2,
  },
  closed: {
    label: "Closed",
    color: "text-slate-600",
    bg: "bg-slate-100 border-slate-200",
    icon: ShieldCheck,
  },
  rejected: {
    label: "Rejected",
    color: "text-rose-700",
    bg: "bg-rose-50 border-rose-200",
    icon: AlertTriangle,
  },
};

export default function PublicComplaintTrackingPage(props: {
  params: { businessId: string; ticketId: string };
}) {
  const { businessId: paramId, ticketId } = props.params;
  const firestore = useFirestore();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [verifyPhone, setVerifyPhone] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const [chatRequest, setChatRequest] = useState("");
  const [isSubmittingChat, setIsSubmittingChat] = useState(false);

  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  useEffect(() => {
    async function resolveId() {
      if (!paramId) return;
      if (paramId.startsWith("biz_")) {
        setBusinessId(paramId);
      } else {
        const q = query(
          collection(firestore, "businesses"),
          where("slug", "==", paramId.toLowerCase()),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) setBusinessId(snap.docs[0].id);
        else setBusinessId(paramId);
      }
    }
    resolveId();
  }, [paramId, firestore]);

  useEffect(() => {
    async function findTicket() {
      if (!businessId || !ticketId) return;
      const docRef = doc(
        firestore,
        "businesses",
        businessId,
        "complaints",
        ticketId
      );
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setTicket({ ...snap.data(), id: snap.id });
      }
      setIsSearching(false);
    }
    if (businessId) findTicket();
  }, [businessId, ticketId, firestore]);

  const handleVerify = () => {
    if (!ticket) return;
    setIsVerifying(true);
    if (ticket.customerPhone?.includes(verifyPhone) && verifyPhone.length >= 4) {
      setIsVerified(true);
      toast({ title: "Identity Verified" });
    } else {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: "Phone number does not match the ticket record.",
      });
    }
    setIsVerifying(false);
  };

  const bizRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(bizRef);

  const timelineQuery = useMemoFirebase(
    () =>
      businessId && ticket?.id
        ? query(
            collection(
              firestore,
              "businesses",
              businessId,
              "complaints",
              ticket.id,
              "timeline"
            ),
            orderBy("timestamp", "asc")
          )
        : null,
    [firestore, businessId, ticket?.id]
  );
  const { data: timelineData } = useCollection<any>(timelineQuery);
  const timeline = timelineData || [];

  const assignedUsersQuery = useMemoFirebase(() => {
    if (!businessId || !ticket) return null;
    const ids = Array.isArray(ticket.assignedTo)
      ? ticket.assignedTo
      : typeof ticket.assignedTo === "string"
        ? [ticket.assignedTo]
        : [];
    if (ids.length === 0) return null;
    return query(collection(firestore, "users"), where("id", "in", ids));
  }, [firestore, businessId, ticket?.assignedTo]);
  const { data: assignedMembersData } = useCollection<any>(assignedUsersQuery);
  const assignedMembers = assignedMembersData || [];

  const handleFeedbackSubmit = () => {
    if (!rating || !ticket || !businessId) return;
    setIsSubmittingFeedback(true);
    const docRef = doc(
      firestore,
      "businesses",
      businessId,
      "complaints",
      ticket.id
    );
    updateDocumentNonBlocking(docRef, {
      rating,
      feedback: feedbackText,
      feedbackAt: new Date().toISOString(),
    });
    setTicket({ ...ticket, rating, feedback: feedbackText });
    setIsSubmittingFeedback(false);
    toast({ title: "Thank You!", description: "Your feedback has been saved." });
  };

  const handleSubmitChat = () => {
    if (!chatRequest.trim() || !businessId || !ticket) return;
    setIsSubmittingChat(true);

    const timelineRef = collection(
      firestore,
      "businesses",
      businessId,
      "complaints",
      ticket.id,
      "timeline"
    );
    addDocumentNonBlocking(timelineRef, {
      action: chatRequest,
      by: ticket.customerName || "Customer",
      role: "customer",
      timestamp: new Date().toISOString(),
    });

    const assignedIds = Array.isArray(ticket.assignedTo)
      ? ticket.assignedTo
      : typeof ticket.assignedTo === "string"
        ? [ticket.assignedTo]
        : [];
    if (assignedIds.length > 0) {
      assignedIds.forEach((uid: string) => {
        if (!uid) return;
        addDocumentNonBlocking(
          collection(firestore, "businesses", businessId, "notifications"),
          {
            businessId,
            recipientId: uid,
            title: `Update on Ticket ${ticket.ticketId}`,
            message: `${ticket.customerName}: ${chatRequest.substring(0, 50)}...`,
            type: "message",
            isRead: false,
            createdAt: serverTimestamp(),
          }
        );
      });
    }

    setChatRequest("");
    setIsSubmittingChat(false);
    toast({ title: "Message Sent" });
  };

  if (isSearching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="h-12 w-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-4">
          <ShieldAlert className="h-6 w-6 text-rose-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Ticket Not Found</h1>
        <Button asChild variant="outline" className="mt-4 rounded-xl border-slate-200">
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-6 sm:p-8 bg-slate-900 text-white text-center">
            <div className="h-12 w-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center mx-auto mb-4">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold">Verify Ticket Access</h1>
            <p className="text-xs text-slate-300 mt-1">
              Enter your registered phone number to view Ticket{" "}
              <span className="font-mono">{ticket.ticketId}</span>
            </p>
          </div>
          <div className="p-6 sm:p-8 space-y-5 text-left">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">
                Registered Phone Number
              </Label>
              <Input
                type="tel"
                value={verifyPhone}
                onChange={(e) => setVerifyPhone(e.target.value)}
                placeholder="91XXXXXXXX"
                className="h-11 rounded-xl bg-slate-50 border-slate-200 text-base font-bold font-mono tabular-nums text-center"
              />
            </div>
            <Button
              onClick={handleVerify}
              disabled={isVerifying || verifyPhone.length < 4}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl"
            >
              {isVerifying ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                "Verify Identity"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const sInfo = STATUS_CONFIG[ticket.status || "new"] || STATUS_CONFIG.new;
  const canGiveFeedback =
    (ticket.status === "resolved" || ticket.status === "closed") &&
    !ticket.rating;
  const businessWhatsappDigits = business?.phone?.replace(/\D/g, "") || "";
  const businessWhatsappUrl = businessWhatsappDigits
    ? `https://wa.me/${businessWhatsappDigits}?text=${encodeURIComponent(
        `Hi! I need an update on Ticket ${ticket.ticketId}`
      )}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-20 overflow-x-hidden text-left">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 h-16 flex items-center">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
              {business?.logoUrl ? (
                <img
                  src={business.logoUrl}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover p-1"
                  alt={business?.name ? `${business.name} logo` : "Business logo"}
                />
              ) : (
                <div className="h-full w-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
                  {business?.name?.charAt(0) || "B"}
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-900 truncate">
                {business?.name || "Support Portal"}
              </span>
              <span className="text-xs font-medium text-sky-700">
                Support Ticket Tracker
              </span>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200 text-xs font-semibold text-slate-700"
          >
            <Link href="/">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6">
          <div className="space-y-1.5 min-w-0">
            <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700 font-mono tabular-nums">
              Ticket ID: {ticket.ticketId}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {ticket.subject}
            </h1>
            <div className="flex items-center gap-3 flex-wrap text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-slate-400" /> Filed by{" "}
                <strong className="text-slate-900">{ticket.customerName}</strong>
              </span>
              <span className="text-slate-300">·</span>
              <span className="font-semibold text-sky-700">{ticket.category}</span>
            </div>
          </div>
          <div
            className={cn(
              "w-full md:w-auto px-5 py-3.5 rounded-xl border flex items-center gap-3.5 shrink-0",
              sInfo.bg
            )}
          >
            <sInfo.icon className={cn("h-6 w-6", sInfo.color)} />
            <div>
              <p className="text-xs font-medium text-slate-600">Live Status</p>
              <p className={cn("text-base font-bold leading-tight", sInfo.color)}>
                {sInfo.label}
              </p>
            </div>
          </div>
        </div>

        {canGiveFeedback && (
          <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">How did we do?</h3>
                <p className="text-xs text-slate-300">
                  Share your satisfaction rating for this resolution
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-center gap-2.5">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-label={`Rate ${v} out of 5 stars`}
                    onClick={() => setRating(v)}
                    className={cn(
                      "h-11 w-11 rounded-xl flex items-center justify-center transition-colors border",
                      rating >= v
                        ? "bg-amber-400 border-amber-400 text-slate-900"
                        : "bg-white/10 border-white/15 text-white/50 hover:bg-white/20"
                    )}
                  >
                    <Star className={cn("h-5 w-5", rating >= v && "fill-current")} />
                  </button>
                ))}
              </div>
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Type a quick review (optional)..."
                className="bg-white/10 border-white/15 text-white p-3.5 rounded-xl text-sm placeholder:text-white/40"
              />
              <Button
                onClick={handleFeedbackSubmit}
                disabled={!rating || isSubmittingFeedback}
                className="w-full h-11 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm rounded-xl"
              >
                {isSubmittingFeedback ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  "Submit Rating"
                )}
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="feed" className="w-full space-y-6">
          <TabsList className="bg-white border border-slate-200 h-12 p-1 rounded-xl flex overflow-x-auto scrollbar-hide w-full sm:w-fit">
            <TabsTrigger
              value="feed"
              className="rounded-lg px-4 text-xs font-semibold gap-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              <MessageSquare className="h-4 w-4" /> Live Updates
            </TabsTrigger>
            <TabsTrigger
              value="info"
              className="rounded-lg px-4 text-xs font-semibold gap-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              <LayoutList className="h-4 w-4" /> Details & Media
            </TabsTrigger>
            <TabsTrigger
              value="team"
              className="rounded-lg px-4 text-xs font-semibold gap-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              <Users className="h-4 w-4" /> Assigned Team
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8">
              <TabsContent value="feed" className="m-0 space-y-6">
                <SectionCard
                  title="Ticket Timeline"
                  description="Messages and updates between you and our specialists."
                >
                  <div className="space-y-5 max-h-[480px] overflow-y-auto pr-1">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                        {ticket.customerName?.charAt(0) || "C"}
                      </div>
                      <div className="space-y-1 max-w-[85%]">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                          <p className="text-xs font-semibold text-slate-500 mb-1">
                            Original Request
                          </p>
                          <p className="text-sm text-slate-800 leading-relaxed">
                            {ticket.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    {timeline.map((log: any, i: number) => {
                      const isAdminRole = log.role === "admin";
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex gap-3",
                            isAdminRole ? "flex-row" : "flex-row-reverse"
                          )}
                        >
                          <div
                            className={cn(
                              "h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border",
                              isAdminRole
                                ? "bg-slate-900 border-slate-900 text-white"
                                : "bg-slate-100 border-slate-200 text-slate-700"
                            )}
                          >
                            {isAdminRole ? (
                              <Bot className="h-4 w-4" />
                            ) : (
                              log.by?.charAt(0) || "C"
                            )}
                          </div>
                          <div
                            className={cn(
                              "space-y-1 max-w-[85%]",
                              isAdminRole ? "text-left" : "text-right"
                            )}
                          >
                            <div
                              className={cn(
                                "p-3.5 rounded-xl border text-left",
                                isAdminRole
                                  ? "bg-slate-900 text-white border-slate-900"
                                  : "bg-white border-slate-200 text-slate-900"
                              )}
                            >
                              {isAdminRole && (
                                <p className="text-xs font-semibold text-amber-300 mb-1 flex items-center gap-1">
                                  <BadgeCheck className="h-3.5 w-3.5" />{" "}
                                  Specialist Response
                                </p>
                              )}
                              <p className="text-sm leading-relaxed">
                                {log.action}
                              </p>
                            </div>
                            <p className="text-xs text-slate-500 font-mono tabular-nums px-1">
                              {new Date(log.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-200 pt-5 mt-5 space-y-3">
                    <Label
                      htmlFor="ticket-message"
                      className="text-xs font-semibold text-slate-700 block"
                    >
                      Message Support Team
                    </Label>
                    <div className="relative">
                      <Textarea
                        id="ticket-message"
                        placeholder="Need to add more details? Write here..."
                        value={chatRequest}
                        onChange={(e) => setChatRequest(e.target.value)}
                        className="min-h-[100px] rounded-xl bg-slate-50 border-slate-200 p-3.5 text-sm pr-14"
                      />
                      <Button
                        onClick={handleSubmitChat}
                        disabled={!chatRequest.trim() || isSubmittingChat}
                        aria-label="Send message to support team"
                        className="absolute bottom-3 right-3 h-9 w-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white p-0"
                      >
                        {isSubmittingChat ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </SectionCard>
              </TabsContent>

              <TabsContent value="info" className="m-0 space-y-6">
                <SectionCard
                  title="Issue Details"
                  description="Ticket categorization and uploaded attachments."
                >
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <p className="text-xs font-medium text-slate-500">
                          Category
                        </p>
                        <p className="text-sm font-bold text-slate-900">
                          {ticket.category}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <p className="text-xs font-medium text-slate-500">
                          Target Branch
                        </p>
                        <p className="text-sm font-bold text-slate-900">
                          {ticket.branchLocation || "Main Office"}
                        </p>
                      </div>
                    </div>

                    {ticket.mediaUrls?.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-slate-500" />{" "}
                          Evidence & Photos
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {ticket.mediaUrls.map((url: string, i: number) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="aspect-video rounded-xl overflow-hidden border border-slate-200 block hover:border-slate-400 transition-colors"
                            >
                              <img
                                src={url}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                                alt={`Attachment ${i + 1}`}
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </SectionCard>
              </TabsContent>

              <TabsContent value="team" className="m-0">
                {assignedMembers.length === 0 ? (
                  <EmptyStatePanel
                    icon={Users}
                    title="Specialist assignment in progress"
                    description="An agent will be assigned to your ticket shortly."
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {assignedMembers.map((member: any) => {
                      const cleanPhone = member.phone?.replace(/\D/g, "") || "";
                      return (
                        <div
                          key={member.id}
                          className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="h-11 w-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-bold text-lg shrink-0">
                              {member.name?.charAt(0) || "S"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-slate-900 truncate">
                                {member.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {member.role || "Resolution Specialist"}
                              </p>
                            </div>
                          </div>
                          {cleanPhone && (
                            <div className="grid grid-cols-2 gap-2.5">
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-xl border-slate-200 text-slate-700 text-xs font-semibold gap-1.5"
                              >
                                <a href={`tel:${cleanPhone}`}>
                                  <PhoneCall className="h-3.5 w-3.5" /> Call
                                </a>
                              </Button>
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold gap-1.5"
                              >
                                <a
                                  href={`https://wa.me/${cleanPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />{" "}
                                  WhatsApp
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 text-white space-y-4">
                <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    Direct Escalation Desk
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed mt-1.5">
                    Connect directly with our resolution desk for urgent updates
                    or billing inquiries.
                  </p>
                </div>
                {businessWhatsappUrl && (
                  <Button
                    asChild
                    className="w-full h-10 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs rounded-xl"
                  >
                    <a
                      href={businessWhatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Connect on WhatsApp <ChevronRight className="ml-1 h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-200 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900">
                    Privacy Guard Active
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Your ticket details are private and visible only to assigned
                    specialists.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Tabs>
      </main>

      <footer className="mt-20 py-8 bg-white border-t border-slate-200 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              B
            </div>
            <span className="text-sm font-bold text-slate-900">Biztrix AI</span>
          </div>
          <p className="text-xs text-slate-500">
            Encrypted Support Portal · {business?.name || "Biztrix Workspace"}
          </p>
        </div>
      </footer>
    </div>
  );
}
