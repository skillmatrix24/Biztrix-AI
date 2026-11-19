"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  Calendar as CalendarIcon,
  CheckCircle2,
  CheckSquare,
  Edit2,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquare,
  Phone,
  Receipt,
  RefreshCw,
  Send,
  SmartphoneNfc,
  Sun,
  Trash2,
  UserPlus,
  XCircle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CRM_LOST_REASONS,
  CRM_STAGES,
  addDaysToYmd,
  buildBillingHrefForLead,
  buildWhatsAppLeadTemplates,
  classifyFollowUpUrgency,
  getTodayLocalYmd,
  normalizeLeadPriority,
  resolveEffectiveIntentScore,
} from "@/lib/crm-engine";
import { type Lead, type LeadActivityType, type LeadStatus } from "@/lib/mock-db";
import { cn } from "@/lib/utils";

interface StaffOption {
  id: string;
  name: string;
  role?: string;
}

interface LeadDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  staffMembers: StaffOption[];
  currencySymbol: string;
  businessName?: string;
  isReadOnly?: boolean;
  isConverting?: boolean;
  linkedQuotations?: any[];
  linkedProjects?: any[];
  hasSolarSuite?: boolean;
  hasPropertySuite?: boolean;
  onChangeStage: (lead: Lead, nextStage: LeadStatus, lostReason?: string) => void;
  onAssignStaff: (lead: Lead, staffId: string, staffName: string) => void;
  onScheduleFollowUp: (lead: Lead, date: string, time: string) => void;
  onLogActivity: (lead: Lead, type: LeadActivityType, description: string) => void;
  onEditLead: (lead: Lead) => void;
  onRequestDeleteLead: (lead: Lead) => void;
  onConvertToCustomer: (lead: Lead) => void;
}

export function LeadDetailSheet({
  open,
  onOpenChange,
  lead,
  staffMembers,
  currencySymbol,
  businessName,
  isReadOnly = false,
  isConverting = false,
  linkedQuotations = [],
  linkedProjects = [],
  hasSolarSuite = false,
  hasPropertySuite = false,
  onChangeStage,
  onAssignStaff,
  onScheduleFollowUp,
  onLogActivity,
  onEditLead,
  onRequestDeleteLead,
  onConvertToCustomer,
}: LeadDetailSheetProps) {
  const todayYmd = useMemo(() => getTodayLocalYmd(), []);

  const [pendingLostMode, setPendingLostMode] = useState(false);
  const [selectedLostReason, setSelectedLostReason] = useState(CRM_LOST_REASONS[0]);
  const [followDateDraft, setFollowDateDraft] = useState("");
  const [followTimeDraft, setFollowTimeDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [selectedWaTemplateId, setSelectedWaTemplateId] = useState("intro");

  useEffect(() => {
    if (!lead) return;
    setPendingLostMode(false);
    setSelectedLostReason(lead.lostReason || CRM_LOST_REASONS[0]);
    setFollowDateDraft(lead.followUpDate || "");
    setFollowTimeDraft(lead.followUpTime || "");
    setNoteDraft("");
  }, [lead?.id, lead?.followUpDate, lead?.followUpTime, lead?.lostReason]);

  if (!lead) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl p-0 bg-white" />
      </Sheet>
    );
  }

  const effectiveScore = resolveEffectiveIntentScore(lead, todayYmd);
  const priority = normalizeLeadPriority(lead.priority, effectiveScore);
  const followUpUrgency = classifyFollowUpUrgency(lead, todayYmd);
  const cleanDigits = (lead.phone || "").replace(/\D/g, "");
  const waPhone =
    cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

  const interestSummary =
    lead.interest ||
    (Array.isArray(lead.viewedProducts) && lead.viewedProducts.length > 0
      ? lead.viewedProducts.join(", ")
      : "");

  const waTemplates = buildWhatsAppLeadTemplates(lead, businessName, currencySymbol);
  const activeWaTemplate =
    waTemplates.find((t) => t.id === selectedWaTemplateId) || waTemplates[0];
  const waMessage = encodeURIComponent(activeWaTemplate?.message || "");
  const waHref = waPhone
    ? `https://wa.me/${waPhone}?text=${waMessage}`
    : `https://wa.me/?text=${waMessage}`;

  const quotationHref = buildBillingHrefForLead(lead, "quotation");
  const posBillHref = buildBillingHrefForLead(lead, "sale");
  const projectHref = `/projects?leadId=${encodeURIComponent(lead.id)}`;

  const handleStageClick = (targetStage: LeadStatus) => {
    if (isReadOnly || targetStage === lead.status) return;
    if (targetStage === "lost") {
      setPendingLostMode(true);
      return;
    }
    setPendingLostMode(false);
    onChangeStage(lead, targetStage);
  };

  const handleConfirmLost = () => {
    if (isReadOnly) return;
    onChangeStage(lead, "lost", selectedLostReason);
    setPendingLostMode(false);
  };

  const handleSaveFollowUp = () => {
    if (isReadOnly) return;
    onScheduleFollowUp(lead, followDateDraft.trim(), followTimeDraft.trim());
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !noteDraft.trim()) return;
    onLogActivity(lead, "note", noteDraft.trim());
    setNoteDraft("");
  };

  const timeline = Array.isArray(lead.activities) ? lead.activities : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col border-l border-slate-200 overflow-hidden bg-white text-left">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white shrink-0 pr-12 space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-mono text-slate-400">
                Inquiry · {lead.id.slice(-8).toUpperCase()}
                {lead.createdAt ? ` · ${lead.createdAt}` : ""}
              </p>
              <SheetTitle className="text-lg sm:text-xl font-bold text-white break-words leading-snug">
                {lead.name}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Lead qualification, follow-up schedule, and activity timeline for {lead.name}.
              </SheetDescription>
              <p className="text-xs text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-mono tabular-nums">{lead.phone}</span>
                {lead.companyName && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{lead.companyName}</span>
                  </>
                )}
                {lead.location && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{lead.location}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
            <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
              <span>{lead.source}</span>
              <span aria-hidden="true">·</span>
              <span
                className={cn(
                  "font-semibold",
                  priority === "Hot"
                    ? "text-amber-300"
                    : priority === "Cold"
                      ? "text-slate-400"
                      : "text-white"
                )}
              >
                {priority} Priority
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono font-semibold text-white">
                {effectiveScore}% Intent
              </span>
              {Number(lead.budget || 0) > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {currencySymbol}
                    {Number(lead.budget).toLocaleString("en-IN")}
                  </span>
                </>
              )}
            </div>

            {!isReadOnly && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onEditLead(lead)}
                  className="h-8 px-2.5 rounded-lg border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white text-xs font-semibold whitespace-nowrap"
                >
                  <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Delete lead ${lead.name}`}
                  onClick={() => onRequestDeleteLead(lead)}
                  className="h-8 w-8 rounded-lg border-white/20 bg-white/10 text-rose-300 hover:bg-rose-600 hover:text-white hover:border-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 scrollbar-hide">
          <div className="p-5 sm:p-6 space-y-6 text-left">
            {/* 1. Interactive Stage Stepper */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold text-slate-800">Pipeline Stage</h4>
                <span className="text-xs text-slate-500 capitalize">
                  Current: <strong className="text-slate-900">{lead.status || "new"}</strong>
                </span>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto scrollbar-hide">
                {CRM_STAGES.map((st) => {
                  const active = (lead.status || "new") === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => handleStageClick(st.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0",
                        active
                          ? st.id === "lost"
                            ? "bg-rose-600 text-white shadow-sm"
                            : st.id === "converted"
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "bg-slate-900 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                      )}
                    >
                      {st.shortLabel}
                    </button>
                  );
                })}
              </div>

              {pendingLostMode && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-rose-900 flex items-center gap-1.5">
                      <XCircle className="h-4 w-4 text-rose-600" /> Select Reason for Marking Lost
                    </p>
                    <button
                      type="button"
                      onClick={() => setPendingLostMode(false)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={selectedLostReason} onValueChange={setSelectedLostReason}>
                      <SelectTrigger className="h-9 rounded-lg text-xs bg-white border-rose-200 flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        {CRM_LOST_REASONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleConfirmLost}
                      className="h-9 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold whitespace-nowrap"
                    >
                      Confirm Lost
                    </Button>
                  </div>
                </div>
              )}

              {lead.status === "lost" && lead.lostReason && !pendingLostMode && (
                <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2">
                  Lost Reason: <span className="font-semibold">{lead.lostReason}</span>
                </p>
              )}
            </section>

            {/* 2. Deal Summary & Assignment */}
            <section className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-800">Deal & Qualification Context</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-slate-200 rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-white p-3.5 space-y-1">
                  <p className="text-xs text-slate-500">Expected Deal Value</p>
                  <p className="text-base font-bold font-mono tabular-nums text-slate-900">
                    {Number(lead.budget || 0) > 0
                      ? `${currencySymbol}${Number(lead.budget).toLocaleString("en-IN")}`
                      : "Not specified"}
                  </p>
                </div>
                <div className="bg-white p-3.5 space-y-1">
                  <p className="text-xs text-slate-500">Assigned Representative</p>
                  <Select
                    disabled={isReadOnly}
                    value={lead.assignedTo || "unassigned"}
                    onValueChange={(val) => {
                      if (val === "unassigned") {
                        onAssignStaff(lead, "", "");
                      } else {
                        const found = staffMembers.find((s) => s.id === val);
                        onAssignStaff(lead, val, found?.name || "Team Member");
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs font-semibold border-slate-200 rounded-lg mt-0.5">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {staffMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                          {member.role ? ` · ${member.role}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-white p-3.5 space-y-1 sm:col-span-2">
                  <p className="text-xs text-slate-500">Requirement & Interested Items</p>
                  <p className="text-xs font-medium text-slate-900 leading-relaxed">
                    {interestSummary || "No specific products or requirements recorded yet."}
                  </p>
                  {Array.isArray(lead.viewedProducts) &&
                    lead.viewedProducts.length > 0 &&
                    lead.interest && (
                      <p className="text-xs text-slate-500 pt-0.5">
                        Catalog Items: {lead.viewedProducts.join(" · ")}
                      </p>
                    )}
                </div>
                {(lead.email || lead.gstin) && (
                  <div className="bg-white p-3.5 space-y-1 sm:col-span-2">
                    <p className="text-xs text-slate-500">Email & Tax Details</p>
                    <p className="text-xs text-slate-800 flex flex-wrap items-center gap-x-2 gap-y-1">
                      {lead.email && <span>{lead.email}</span>}
                      {lead.email && lead.gstin && <span aria-hidden="true">·</span>}
                      {lead.gstin && <span className="font-mono">GSTIN: {lead.gstin}</span>}
                    </p>
                  </div>
                )}
              </div>

              {lead.notes && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-1">
                  <p className="text-xs font-medium text-slate-500">Sales Notes</p>
                  <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {lead.notes}
                  </p>
                </div>
              )}
            </section>

            {/* 3. Follow-up Schedule & Direct Outreach */}
            <section className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5 text-slate-500" /> Next Follow-up & Outreach
                </h4>
                <span
                  className={cn(
                    "text-xs font-medium tabular-nums",
                    followUpUrgency === "overdue"
                      ? "text-rose-700 font-semibold"
                      : followUpUrgency === "today"
                        ? "text-amber-700 font-semibold"
                        : followUpUrgency === "upcoming"
                          ? "text-emerald-700"
                          : "text-slate-500"
                  )}
                >
                  {followUpUrgency === "overdue"
                    ? `Overdue · ${lead.followUpDate}`
                    : followUpUrgency === "today"
                      ? `Due Today${lead.followUpTime ? ` at ${lead.followUpTime}` : ""}`
                      : followUpUrgency === "upcoming"
                        ? `Scheduled · ${lead.followUpDate}`
                        : followUpUrgency === "closed"
                          ? "Deal Closed"
                          : "Not Scheduled"}
                </span>
              </div>

              {!isReadOnly && lead.status !== "converted" && lead.status !== "lost" && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Input
                      type="date"
                      value={followDateDraft}
                      onChange={(e) => setFollowDateDraft(e.target.value)}
                      className="h-9 rounded-lg text-xs font-mono tabular-nums bg-white"
                    />
                    <Input
                      type="time"
                      value={followTimeDraft}
                      onChange={(e) => setFollowTimeDraft(e.target.value)}
                      className="h-9 rounded-lg text-xs font-mono tabular-nums bg-white"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFollowDateDraft(todayYmd)}
                        className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setFollowDateDraft(addDaysToYmd(todayYmd, 1))}
                        className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                      >
                        +1d
                      </button>
                      <button
                        type="button"
                        onClick={() => setFollowDateDraft(addDaysToYmd(todayYmd, 3))}
                        className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                      >
                        +3d
                      </button>
                      <button
                        type="button"
                        onClick={() => setFollowDateDraft(addDaysToYmd(todayYmd, 7))}
                        className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                      >
                        +7d
                      </button>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveFollowUp}
                      className="h-8 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                    >
                      Save Schedule
                    </Button>
                  </div>
                </div>
              )}

              {/* WhatsApp Quick Follow-up Templates */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-800">
                    WhatsApp Follow-up Template
                  </p>
                  <div className="flex flex-wrap items-center gap-1">
                    {waTemplates.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setSelectedWaTemplateId(tpl.id)}
                        className={cn(
                          "px-2 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap",
                          activeWaTemplate?.id === tpl.id
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                        )}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-600 bg-slate-50 rounded-lg border border-slate-100 px-3 py-2 leading-relaxed">
                  {activeWaTemplate?.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-xl text-xs font-semibold gap-2"
                  onClick={() =>
                    onLogActivity(lead, "call", `Initiated phone call to ${lead.phone}`)
                  }
                >
                  <a href={`tel:${lead.phone}`}>
                    <Phone className="h-3.5 w-3.5" /> Call Client
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-xl text-xs font-semibold gap-2 border-emerald-200 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100/70"
                  onClick={() =>
                    onLogActivity(
                      lead,
                      "whatsapp",
                      `Sent WhatsApp "${activeWaTemplate?.label}" template to ${lead.name}`
                    )
                  }
                >
                  <a href={waHref} target="_blank" rel="noopener noreferrer">
                    <SmartphoneNfc className="h-3.5 w-3.5" /> Send WhatsApp
                  </a>
                </Button>
              </div>
            </section>

            {/* 4. Commerce, Delivery & Industry Suite Actions */}
            <section className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-800">
                  Commerce & Delivery Bridges
                </h4>
                <span className="text-[11px] text-slate-500">1-click prefilled launch</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-xl text-xs font-semibold border-slate-200 text-slate-800 hover:bg-slate-50 justify-start px-3"
                >
                  <Link href={quotationHref}>
                    <FileText className="mr-1.5 h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">Prepare Quote</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-xl text-xs font-semibold border-slate-200 text-slate-800 hover:bg-slate-50 justify-start px-3"
                >
                  <Link href={posBillHref}>
                    <Receipt className="mr-1.5 h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">Direct POS Bill</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-xl text-xs font-semibold border-slate-200 text-slate-800 hover:bg-slate-50 justify-start px-3"
                >
                  <Link href={projectHref}>
                    <Briefcase className="mr-1.5 h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">Start Project</span>
                  </Link>
                </Button>
              </div>

              {(hasSolarSuite || hasPropertySuite) && (
                <div className="flex flex-wrap gap-2">
                  {hasSolarSuite && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl text-xs font-semibold border-amber-200 bg-amber-50/60 text-amber-900 hover:bg-amber-100/70"
                    >
                      <Link href={`/solar/inquiries/new?leadId=${encodeURIComponent(lead.id)}`}>
                        <Sun className="mr-1.5 h-3.5 w-3.5" /> Promote to Solar Inquiry
                      </Link>
                    </Button>
                  )}
                  {hasPropertySuite && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl text-xs font-semibold border-sky-200 bg-sky-50/60 text-sky-900 hover:bg-sky-100/70"
                    >
                      <Link href={`/properties/leads/new?leadId=${encodeURIComponent(lead.id)}`}>
                        <Building2 className="mr-1.5 h-3.5 w-3.5" /> Promote to Property CRM
                      </Link>
                    </Button>
                  )}
                </div>
              )}

              {/* Linked Quotations, Projects & Synced Task */}
              {(linkedQuotations.length > 0 ||
                linkedProjects.length > 0 ||
                Boolean(lead.followUpDate)) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 divide-y divide-slate-200/80 overflow-hidden">
                  {Boolean(lead.followUpDate) && (
                    <Link
                      href="/notes"
                      className="px-3.5 py-2.5 flex items-center justify-between gap-2 hover:bg-white transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 text-xs">
                        <CheckSquare className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">
                          Task Manager Reminder Synced
                        </span>
                        <span className="text-slate-500 font-mono tabular-nums shrink-0">
                          · {lead.followUpDate}
                        </span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    </Link>
                  )}

                  {linkedQuotations.map((q: any) => (
                    <Link
                      key={q.id}
                      href={`/billing?quoteId=${encodeURIComponent(q.id)}`}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-2 hover:bg-white transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 text-xs">
                        <FileText className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="font-semibold text-slate-900 font-mono">
                          {q.quotationId || q.id}
                        </span>
                        <span className="text-slate-500 capitalize">· {q.status || "sent"}</span>
                        {q.totals?.finalPayout !== undefined && (
                          <span className="font-mono tabular-nums font-semibold text-slate-800">
                            · {currencySymbol}
                            {Number(q.totals.finalPayout).toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    </Link>
                  ))}

                  {linkedProjects.map((proj: any) => (
                    <Link
                      key={proj.id}
                      href={`/projects/${encodeURIComponent(proj.id)}`}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-2 hover:bg-white transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 text-xs">
                        <Briefcase className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span className="font-semibold text-slate-900 truncate">
                          {proj.title}
                        </span>
                        <span className="text-slate-500 capitalize shrink-0">
                          · {proj.status || "planning"}
                        </span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* 5. Customer Conversion Card */}
            {lead.status === "converted" ? (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-950">Converted to Customer</p>
                    <p className="text-xs text-emerald-800">
                      Permanent profile active in your Customer Registry.
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-9 px-3.5 rounded-xl border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100 text-xs font-semibold whitespace-nowrap"
                >
                  <Link href="/customers">
                    Open Customers <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </section>
            ) : (
              <section className="p-4 sm:p-5 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-emerald-700 border border-emerald-200 shrink-0">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">Convert to Customer</h4>
                    <p className="text-xs text-emerald-800">
                      Promote this lead to your Customer Registry for GST billing and ledger tracking.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => onConvertToCustomer(lead)}
                  disabled={isConverting || isReadOnly}
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl"
                >
                  {isConverting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-3.5 w-3.5" /> Convert Lead to Customer
                    </>
                  )}
                </Button>
              </section>
            )}

            {/* 5. Activity Log & Timeline */}
            <section className="space-y-3.5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-slate-500" /> Activity & Interaction Log
                </h4>
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  {timeline.length} event{timeline.length === 1 ? "" : "s"}
                </span>
              </div>

              {!isReadOnly && (
                <form onSubmit={handleAddNote} className="space-y-2">
                  <Textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={2}
                    placeholder="Log a call summary, client objection, or pricing discussion..."
                    className="rounded-xl text-xs resize-none"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!noteDraft.trim()}
                      className="h-8 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                    >
                      <Send className="mr-1.5 h-3 w-3" /> Log Activity Note
                    </Button>
                  </div>
                </form>
              )}

              {timeline.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center text-xs text-slate-500">
                  No timeline events recorded yet. Log a note or initiate a follow-up above.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
                  {timeline.map((item) => (
                    <div key={item.id} className="p-3.5 space-y-1">
                      <p className="text-xs font-medium text-slate-900 leading-relaxed break-words">
                        {item.description}
                      </p>
                      <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
                        <span className="capitalize">{item.type.replace("_", " ")}</span>
                        {item.actorName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{item.actorName}</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{item.timestamp}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
