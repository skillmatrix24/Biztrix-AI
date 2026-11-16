"use client";

import { useState } from "react";
import {
  Headset,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  User,
  SmartphoneNfc,
  MessageSquare,
  History,
  Zap,
  ChevronRight,
  ChevronDown,
  Loader2,
  Globe,
  ImageIcon,
  Send,
  Reply,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
} from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp, where } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { sendWhatsAppTemplate } from "@/app/actions/whatsapp-actions";
import { PageHeader, SectionCard } from "@/components/ui/editorial";

const PRIORITY_CONFIG: Record<string, { label: string }> = {
  low: { label: "Low" },
  medium: { label: "Medium" },
  high: { label: "High" },
  urgent: { label: "Urgent" },
  emergency: { label: "Emergency" },
};

const STATUS_CONFIG: Record<string, { label: string; icon: any }> = {
  new: { label: "New", icon: Zap },
  pending: { label: "Pending", icon: Clock },
  "in-progress": { label: "Working", icon: Zap },
  "on-hold": { label: "On Hold", icon: Clock },
  "waiting-customer": { label: "Waiting", icon: User },
  resolved: { label: "Resolved", icon: CheckCircle2 },
  closed: { label: "Closed", icon: ShieldCheck },
  rejected: { label: "Rejected", icon: AlertCircle },
};

export default function TicketDetailPage(props: { params: { ticketId: string } }) {
  const { ticketId } = props.params;
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const ticketRef = useMemoFirebase(
    () =>
      businessId && ticketId
        ? doc(firestore, "businesses", businessId, "complaints", ticketId)
        : null,
    [firestore, businessId, ticketId]
  );
  const { data: ticket, isLoading: isTicketLoading } = useDoc<any>(ticketRef);

  const teamQuery = useMemoFirebase(
    () => (businessId ? query(collection(firestore, "users"), where("businessId", "==", businessId)) : null),
    [firestore, businessId]
  );
  const { data: teamMembersData } = useCollection<any>(teamQuery);
  const teamMembers = teamMembersData || [];

  const timelineQuery = useMemoFirebase(
    () =>
      businessId && ticketId
        ? query(
            collection(firestore, "businesses", businessId, "complaints", ticketId, "timeline"),
            orderBy("timestamp", "desc")
          )
        : null,
    [firestore, businessId, ticketId]
  );
  const { data: timelineData } = useCollection<any>(timelineQuery);
  const timeline = timelineData || [];

  const [replyText, setReplyText] = useState("");

  const handleUpdateTicket = async (updates: any) => {
    if (!businessId || !ticketId) return;
    const docRef = doc(firestore, "businesses", businessId, "complaints", ticketId);
    const prevStatus = ticket?.status;

    updateDocumentNonBlocking(docRef, { ...updates, updatedAt: serverTimestamp() });

    if (updates.status || updates.assignedTo !== undefined) {
      addDocumentNonBlocking(
        collection(firestore, "businesses", businessId, "complaints", ticketId, "timeline"),
        {
          action: updates.status
            ? `Status changed to ${updates.status}`
            : `Ticket assignment updated: ${updates.assignedNames || "Unassigned"}`,
          by: profile?.name || "System",
          timestamp: new Date().toISOString(),
        }
      );
    }

    const waConfig = business?.whatsappApiConfig;
    if (
      updates.status &&
      updates.status !== prevStatus &&
      waConfig?.isVerified &&
      ticket?.customerPhone
    ) {
      try {
        await sendWhatsAppTemplate(
          { phoneId: waConfig.phoneId, accessToken: waConfig.accessToken },
          ticket.customerPhone,
          "ticket_status_update",
          "en_US",
          [
            {
              type: "body",
              parameters: [
                { type: "text", text: ticket.ticketId },
                { type: "text", text: updates.status },
              ],
            },
          ]
        );
      } catch (e) {
        console.warn("WhatsApp Notify Failed:", e);
      }
    }
    toast({ title: "Ticket Updated" });
  };

  const toggleAssignee = (userId: string) => {
    const current = Array.isArray(ticket.assignedTo)
      ? ticket.assignedTo
      : typeof ticket.assignedTo === "string"
        ? [ticket.assignedTo]
        : [];
    const isSelected = current.includes(userId);
    const updated = isSelected
      ? current.filter((id: string) => id !== userId)
      : [...current, userId];

    const assignedNames = teamMembers
      .filter((m: any) => updated.includes(m.id))
      .map((m: any) => m.name)
      .join(", ");

    handleUpdateTicket({ assignedTo: updated, assignedNames });
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !businessId || !ticketId) return;
    const timelineRef = collection(
      firestore,
      "businesses",
      businessId,
      "complaints",
      ticketId,
      "timeline"
    );
    addDocumentNonBlocking(timelineRef, {
      action: replyText,
      by: profile?.name || "Admin",
      role: "admin",
      timestamp: new Date().toISOString(),
    });
    setReplyText("");
    toast({ title: "Message Dispatched" });
  };

  if (isTicketLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-50 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
        <p className="text-xs font-medium text-slate-500">Loading ticket details...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-16 text-center space-y-4">
        <ShieldAlert className="h-10 w-10 mx-auto text-rose-500" />
        <p className="font-semibold text-slate-900">Ticket not found.</p>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/complaints">Back to Support Desk</Link>
        </Button>
      </div>
    );
  }

  const publicTrackUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/complaints/track/${businessId}/${ticket.id}`;

  return (
    <div className="space-y-6 pb-20 text-left max-w-5xl mx-auto">
      <PageHeader
        breadcrumb={`Support Desk · Ticket ${ticket.ticketId}`}
        title={ticket.subject}
        description={`${ticket.customerName} · ${ticket.customerPhone}`}
        backHref="/complaints"
        backLabel="Back to Support Desk"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="bg-slate-900 p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{ticket.customerName}</h3>
                  <p className="text-slate-300 text-xs font-mono tabular-nums">
                    {ticket.customerPhone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-slate-300">Status</span>
                <Select
                  value={ticket.status}
                  onValueChange={(v) => handleUpdateTicket({ status: v })}
                >
                  <SelectTrigger className="h-9 w-36 rounded-xl bg-white/10 border-white/20 text-white text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {Object.keys(STATUS_CONFIG).map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {STATUS_CONFIG[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Urgency Priority</Label>
                  <Select
                    value={ticket.priority || "medium"}
                    onValueChange={(v) => handleUpdateTicket({ priority: v })}
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 text-xs font-medium w-full">
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
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Team Assignment</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 w-full rounded-xl bg-white border-slate-200 font-medium text-xs justify-between"
                      >
                        {(() => {
                          const assignedIds = Array.isArray(ticket.assignedTo)
                            ? ticket.assignedTo
                            : typeof ticket.assignedTo === "string"
                              ? [ticket.assignedTo]
                              : [];
                          return assignedIds.length > 0
                            ? `${assignedIds.length} Assigned`
                            : "Pick Members";
                        })()}
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-60 p-0 rounded-xl border-slate-200 overflow-hidden"
                      align="start"
                    >
                      <div className="p-3 bg-slate-50 border-b border-slate-200">
                        <p className="text-xs font-semibold text-slate-700">
                          Select Specialists
                        </p>
                      </div>
                      <ScrollArea className="h-48">
                        <div className="p-2 space-y-1">
                          {teamMembers.map((m: any) => {
                            const assignedIds = Array.isArray(ticket.assignedTo)
                              ? ticket.assignedTo
                              : typeof ticket.assignedTo === "string"
                                ? [ticket.assignedTo]
                                : [];
                            return (
                              <button
                                key={m.id}
                                type="button"
                                className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors text-left"
                                onClick={() => toggleAssignee(m.id)}
                              >
                                <Checkbox checked={assignedIds.includes(m.id)} />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-900 truncate">
                                    {m.name}
                                  </p>
                                  <p className="text-[11px] text-slate-500">{m.role}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-700">Issue Description</h4>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-sm text-slate-700 leading-relaxed">{ticket.description}</p>
                </div>
              </div>

              {ticket.mediaUrls?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-slate-500" /> Evidence Attachments
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {ticket.mediaUrls.map((url: string, i: number) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-video rounded-xl overflow-hidden border border-slate-200 block hover:opacity-90 transition-opacity"
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

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-500" /> Conversation Reply
                </h4>
                <div className="p-5 bg-slate-900 rounded-2xl space-y-4">
                  <Textarea
                    placeholder="Type your reply to the customer..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="bg-white/10 border-white/15 text-white p-3.5 rounded-xl text-sm placeholder:text-slate-400 min-h-[96px]"
                  />
                  <Button
                    type="button"
                    onClick={handleSendReply}
                    disabled={!replyText.trim()}
                    className="w-full h-10 bg-white text-slate-900 hover:bg-slate-100 font-semibold text-xs rounded-xl gap-2"
                  >
                    <Send className="h-4 w-4" /> Dispatch Reply
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <SectionCard
            title="Audit Trail & Logs"
            description="Chronological record of status changes and official replies."
          >
            <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-8px)] before:w-px before:bg-slate-200">
              <div className="relative flex items-center gap-3.5">
                <div className="absolute -left-[21px] h-3.5 w-3.5 rounded-full bg-white border-2 border-slate-900 z-10" />
                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">Ticket Initialized</p>
                  <p className="text-xs text-slate-500 font-mono tabular-nums">
                    {ticket.createdAt?.toDate
                      ? ticket.createdAt.toDate().toLocaleString()
                      : "Recently"}
                  </p>
                </div>
              </div>
              {timeline.map((log: any, i: number) => (
                <div key={i} className="relative flex items-center gap-3.5">
                  <div className="absolute -left-[21px] h-3.5 w-3.5 rounded-full bg-white border-2 border-slate-300 z-10" />
                  <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    {log.role === "admin" ? (
                      <Reply className="h-4 w-4 text-slate-700" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-slate-800 leading-relaxed">{log.action}</p>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      {log.by} · {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <SectionCard title="Quick Connect">
            <div className="space-y-4 text-center">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-700">
                <SmartphoneNfc className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-900">WhatsApp Follow-Up</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Connect directly with the customer on WhatsApp.
                </p>
              </div>
              <Button
                asChild
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs"
              >
                <a
                  href={`https://wa.me/${(ticket.customerPhone || "").replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open WhatsApp Chat
                </a>
              </Button>
            </div>
          </SectionCard>

          <div className="rounded-2xl bg-slate-900 text-white p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <h4 className="text-base font-bold text-white">Tracking Portal</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This link allows the customer to track resolution progress without signing in.
            </p>
            <div className="p-3 bg-white/10 rounded-xl border border-white/15 text-xs font-mono text-slate-200 truncate">
              {publicTrackUrl}
            </div>
            <Button
              type="button"
              className="w-full h-10 bg-white text-slate-900 hover:bg-slate-100 font-semibold text-xs rounded-xl gap-1"
              onClick={() => {
                navigator.clipboard.writeText(publicTrackUrl);
                toast({ title: "Link Copied" });
              }}
            >
              Copy Tracking URL <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
