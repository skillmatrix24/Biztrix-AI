"use client";

import {
  ArrowRight,
  Calendar as CalendarIcon,
  Clock,
  Phone,
  Plus,
  SmartphoneNfc,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyStatePanel, SectionCard } from "@/components/ui/editorial";
import {
  CRM_STAGES,
  addDaysToYmd,
  classifyFollowUpUrgency,
  getNextPipelineStage,
  isLeadOpenInPipeline,
  normalizeLeadPriority,
  resolveEffectiveIntentScore,
} from "@/lib/crm-engine";
import { type Lead, type LeadActivityType, type LeadStatus } from "@/lib/mock-db";
import { cn } from "@/lib/utils";

interface SharedLeadsViewProps {
  leads: Lead[];
  todayYmd: string;
  currencySymbol: string;
  isReadOnly?: boolean;
  onSelectLead: (lead: Lead) => void;
  onChangeStage: (lead: Lead, nextStage: LeadStatus) => void;
  onQuickSnoozeFollowUp: (lead: Lead, nextDateYmd: string) => void;
  onLogOutreach: (lead: Lead, type: LeadActivityType, description: string) => void;
  onOpenNewLead?: () => void;
}

function formatFollowUpStatusText(lead: Lead, todayYmd: string): {
  text: string;
  toneClass: string;
} {
  const urgency = classifyFollowUpUrgency(lead, todayYmd);
  if (urgency === "overdue") {
    return {
      text: `Overdue · ${lead.followUpDate}`,
      toneClass: "text-rose-700 font-semibold",
    };
  }
  if (urgency === "today") {
    return {
      text: `Today${lead.followUpTime ? ` ${lead.followUpTime}` : ""}`,
      toneClass: "text-amber-700 font-semibold",
    };
  }
  if (urgency === "upcoming") {
    return {
      text: `Follow-up ${lead.followUpDate}`,
      toneClass: "text-slate-600",
    };
  }
  if (urgency === "closed") {
    return {
      text: lead.status === "converted" ? "Converted" : "Closed",
      toneClass: lead.status === "converted" ? "text-emerald-700 font-medium" : "text-slate-500",
    };
  }
  return {
    text: lead.createdAt ? `Added ${lead.createdAt}` : "No follow-up set",
    toneClass: "text-slate-500",
  };
}

export function LeadsKanbanView({
  leads,
  todayYmd,
  currencySymbol,
  isReadOnly = false,
  onSelectLead,
  onChangeStage,
}: SharedLeadsViewProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-5 scrollbar-hide min-h-[520px] snap-x snap-mandatory sm:snap-none">
      {CRM_STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => (l.status || "new") === stage.id);
        const stageWorth = stageLeads.reduce(
          (sum, l) => sum + Math.max(0, Number(l.budget) || 0),
          0
        );

        return (
          <div
            key={stage.id}
            className="w-[84vw] max-w-[310px] sm:w-[310px] shrink-0 space-y-2.5 snap-start"
          >
            <div className="flex items-center justify-between px-1.5 gap-2">
              <h3 className={cn("text-xs font-bold tracking-tight", stage.toneTextClass)}>
                {stage.label}
              </h3>
              <p className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                {stageLeads.length}
                {stageWorth > 0
                  ? ` · ${currencySymbol}${stageWorth.toLocaleString("en-IN")}`
                  : ""}
              </p>
            </div>

            <div className="space-y-2.5 bg-slate-100/80 p-2.5 rounded-2xl min-h-[500px] border border-slate-200/80">
              {stageLeads.length === 0 ? (
                <div className="h-28 flex items-center justify-center text-xs text-slate-400">
                  No inquiries in {stage.shortLabel.toLowerCase()}
                </div>
              ) : (
                stageLeads.map((lead) => {
                  const score = resolveEffectiveIntentScore(lead, todayYmd);
                  const priority = normalizeLeadPriority(lead.priority, score);
                  const nextStage = getNextPipelineStage(lead.status);
                  const nextStageLabel = nextStage
                    ? CRM_STAGES.find((s) => s.id === nextStage)?.shortLabel
                    : null;
                  const followInfo = formatFollowUpStatusText(lead, todayYmd);
                  const interestText =
                    lead.interest ||
                    (Array.isArray(lead.viewedProducts) && lead.viewedProducts.length > 0
                      ? lead.viewedProducts.join(", ")
                      : lead.companyName || "");

                  return (
                    <div
                      key={lead.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectLead(lead)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectLead(lead);
                        }
                      }}
                      className="cursor-pointer bg-white hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 transition-colors rounded-xl border border-slate-200 p-3.5 space-y-2.5 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {lead.name}
                          </h4>
                          <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5 truncate">
                            {lead.phone}
                            {lead.location ? ` · ${lead.location}` : ""}
                          </p>
                        </div>
                        {Number(lead.budget || 0) > 0 && (
                          <span className="text-xs font-bold font-mono tabular-nums text-slate-900 shrink-0">
                            {currencySymbol}
                            {Number(lead.budget).toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>

                      {interestText && (
                        <p className="text-xs text-slate-600 truncate">{interestText}</p>
                      )}

                      {/* Unboxed metadata row (Zero-Pill Discipline) */}
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-500 tabular-nums">
                        <span>{lead.source}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={cn(
                            priority === "Hot"
                              ? "text-amber-700 font-semibold"
                              : priority === "Cold"
                                ? "text-slate-400"
                                : "text-slate-600"
                          )}
                        >
                          {priority}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono font-medium text-slate-700">
                          {score}% intent
                        </span>
                        {lead.assignedName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate max-w-[90px]">{lead.assignedName}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <span
                          className={cn(
                            "text-[11px] font-mono tabular-nums truncate",
                            followInfo.toneClass
                          )}
                        >
                          {followInfo.text}
                        </span>

                        {!isReadOnly && nextStage && nextStageLabel && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onChangeStage(lead, nextStage);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800 hover:bg-slate-900 hover:text-white transition-colors whitespace-nowrap shrink-0"
                          >
                            {nextStageLabel} <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LeadsTableView({
  leads,
  todayYmd,
  currencySymbol,
  isReadOnly = false,
  onSelectLead,
  onChangeStage,
  onLogOutreach,
  onOpenNewLead,
}: SharedLeadsViewProps) {
  if (leads.length === 0) {
    return (
      <EmptyStatePanel
        icon={Target}
        title="No matching leads found"
        description="Adjust your search or pipeline filters, or register a new sales inquiry to begin tracking deals."
        action={
          !isReadOnly && onOpenNewLead ? (
            <Button onClick={onOpenNewLead} className="h-9 px-4 text-xs font-semibold rounded-xl">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Lead
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <SectionCard
      title="Pipeline Registry"
      description={`${leads.length} inquiry record${leads.length === 1 ? "" : "s"} matching active filters.`}
      bodyClassName="p-0"
    >
      {/* Mobile Cards (<md) */}
      <div className="md:hidden divide-y divide-slate-100">
        {leads.map((lead) => {
          const score = resolveEffectiveIntentScore(lead, todayYmd);
          const priority = normalizeLeadPriority(lead.priority, score);
          const followInfo = formatFollowUpStatusText(lead, todayYmd);
          const cleanDigits = (lead.phone || "").replace(/\D/g, "");
          const waPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

          return (
            <div key={lead.id} className="p-4 space-y-3 text-left">
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectLead(lead)}
                  className="text-left min-w-0 flex-1"
                >
                  <p className="text-sm font-bold text-slate-900 truncate">{lead.name}</p>
                  <p className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                    {lead.phone}
                    {lead.companyName ? ` · ${lead.companyName}` : ""}
                  </p>
                </button>
                <p className="text-sm font-bold font-mono tabular-nums text-slate-900 shrink-0">
                  {Number(lead.budget || 0) > 0
                    ? `${currencySymbol}${Number(lead.budget).toLocaleString("en-IN")}`
                    : "—"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 tabular-nums">
                <span>{lead.source}</span>
                <span aria-hidden="true">·</span>
                <span className={cn(priority === "Hot" && "text-amber-700 font-semibold")}>
                  {priority}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{score}% intent</span>
                <span aria-hidden="true">·</span>
                <span className={cn("font-mono", followInfo.toneClass)}>{followInfo.text}</span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <Select
                  disabled={isReadOnly}
                  value={lead.status || "new"}
                  onValueChange={(val) => {
                    if (val === "lost") {
                      onSelectLead(lead);
                    } else {
                      onChangeStage(lead, val as LeadStatus);
                    }
                  }}
                >
                  <SelectTrigger className="h-9 w-[142px] rounded-lg text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {CRM_STAGES.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.shortLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1.5">
                  <Button
                    asChild
                    variant="outline"
                    size="icon"
                    aria-label={`Call ${lead.name}`}
                    className="h-9 w-9 rounded-lg"
                    onClick={() => onLogOutreach(lead, "call", `Called ${lead.phone}`)}
                  >
                    <a href={`tel:${lead.phone}`}>
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="icon"
                    aria-label={`WhatsApp ${lead.name}`}
                    className="h-9 w-9 rounded-lg border-emerald-200 text-emerald-700"
                    onClick={() =>
                      onLogOutreach(lead, "whatsapp", `Opened WhatsApp chat with ${lead.name}`)
                    }
                  >
                    <a
                      href={`https://wa.me/${waPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <SmartphoneNfc className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectLead(lead)}
                    className="h-9 px-3 rounded-lg text-xs font-semibold"
                  >
                    Open
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop / Tablet High-Density Table (md+) */}
      <div className="hidden md:block">
        <Table className="min-w-[900px] w-full">
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="text-xs font-semibold text-slate-600">Client & Contact</TableHead>
              <TableHead className="text-xs font-semibold text-slate-600">Stage</TableHead>
              <TableHead className="text-xs font-semibold text-slate-600">Qualification</TableHead>
              <TableHead className="text-xs font-semibold text-slate-600">Interest / Notes</TableHead>
              <TableHead className="text-xs font-semibold text-slate-600">Follow-up</TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 text-right">
                Deal Value
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const score = resolveEffectiveIntentScore(lead, todayYmd);
              const priority = normalizeLeadPriority(lead.priority, score);
              const followInfo = formatFollowUpStatusText(lead, todayYmd);
              const cleanDigits = (lead.phone || "").replace(/\D/g, "");
              const waPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
              const interestSummary =
                lead.interest ||
                (Array.isArray(lead.viewedProducts) && lead.viewedProducts.length > 0
                  ? lead.viewedProducts.join(", ")
                  : lead.notes || "—");

              return (
                <TableRow
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="cursor-pointer hover:bg-slate-50/80"
                >
                  <TableCell className="py-3">
                    <p className="text-sm font-semibold text-slate-900">{lead.name}</p>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      {lead.phone}
                      {lead.companyName ? ` · ${lead.companyName}` : ""}
                      {lead.assignedName ? ` · ${lead.assignedName}` : ""}
                    </p>
                  </TableCell>

                  <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                    <Select
                      disabled={isReadOnly}
                      value={lead.status || "new"}
                      onValueChange={(val) => {
                        if (val === "lost") {
                          onSelectLead(lead);
                        } else {
                          onChangeStage(lead, val as LeadStatus);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 w-[132px] rounded-lg text-xs font-semibold bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        {CRM_STAGES.map((st) => (
                          <SelectItem key={st.id} value={st.id}>
                            {st.shortLabel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  <TableCell className="py-3 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                    <span>{lead.source}</span>
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span
                      className={cn(
                        priority === "Hot"
                          ? "text-amber-700 font-semibold"
                          : priority === "Cold"
                            ? "text-slate-400"
                            : "text-slate-700"
                      )}
                    >
                      {priority}
                    </span>
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono font-semibold text-slate-900">{score}%</span>
                  </TableCell>

                  <TableCell className="py-3 max-w-[240px]">
                    <p className="text-xs text-slate-700 truncate">{interestSummary}</p>
                  </TableCell>

                  <TableCell className="py-3 whitespace-nowrap">
                    <span className={cn("text-xs font-mono tabular-nums", followInfo.toneClass)}>
                      {followInfo.text}
                    </span>
                  </TableCell>

                  <TableCell className="py-3 text-right font-mono tabular-nums text-sm font-bold text-slate-900 whitespace-nowrap">
                    {Number(lead.budget || 0) > 0
                      ? `${currencySymbol}${Number(lead.budget).toLocaleString("en-IN")}`
                      : "—"}
                  </TableCell>

                  <TableCell
                    className="py-3 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <Button
                        asChild
                        variant="outline"
                        size="icon"
                        aria-label={`Call ${lead.name}`}
                        className="h-8 w-8 rounded-lg"
                        onClick={() => onLogOutreach(lead, "call", `Called ${lead.phone}`)}
                      >
                        <a href={`tel:${lead.phone}`}>
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        size="icon"
                        aria-label={`WhatsApp ${lead.name}`}
                        className="h-8 w-8 rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={() =>
                          onLogOutreach(lead, "whatsapp", `Opened WhatsApp chat with ${lead.name}`)
                        }
                      >
                        <a
                          href={`https://wa.me/${waPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <SmartphoneNfc className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectLead(lead)}
                        className="h-8 px-2.5 rounded-lg text-xs font-semibold"
                      >
                        Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
}

export function LeadsFollowUpView({
  leads,
  todayYmd,
  currencySymbol,
  isReadOnly = false,
  onSelectLead,
  onQuickSnoozeFollowUp,
  onLogOutreach,
}: SharedLeadsViewProps) {
  const openLeads = leads.filter((l) => isLeadOpenInPipeline(l.status));

  const overdue = openLeads.filter((l) => classifyFollowUpUrgency(l, todayYmd) === "overdue");
  const dueToday = openLeads.filter((l) => classifyFollowUpUrgency(l, todayYmd) === "today");
  const upcoming = openLeads.filter((l) => classifyFollowUpUrgency(l, todayYmd) === "upcoming");
  const unscheduled = openLeads.filter(
    (l) => classifyFollowUpUrgency(l, todayYmd) === "unscheduled"
  );

  if (openLeads.length === 0) {
    return (
      <EmptyStatePanel
        icon={CalendarIcon}
        title="No open leads in your follow-up queue"
        description="All inquiries are either closed or filtered out. Clear filters or add a new lead to schedule follow-ups."
      />
    );
  }

  const buckets = [
    {
      id: "overdue",
      title: "Overdue Follow-ups",
      description: "Open leads whose scheduled callback date has passed.",
      items: overdue,
      headerTone: "text-rose-700",
    },
    {
      id: "today",
      title: "Due Today",
      description: "Scheduled calls, demos, and check-ins for today.",
      items: dueToday,
      headerTone: "text-amber-700",
    },
    {
      id: "upcoming",
      title: "Upcoming Scheduled",
      description: "Future callbacks already locked on the calendar.",
      items: upcoming,
      headerTone: "text-emerald-700",
    },
    {
      id: "unscheduled",
      title: "Unscheduled Open Leads",
      description: "Active inquiries without a next follow-up date yet.",
      items: unscheduled,
      headerTone: "text-slate-700",
    },
  ];

  return (
    <div className="space-y-5">
      {buckets.map((bucket) => {
        if (bucket.items.length === 0) return null;
        return (
          <SectionCard
            key={bucket.id}
            title={bucket.title}
            description={bucket.description}
            headerRight={
              <span className={cn("text-xs font-mono tabular-nums font-bold", bucket.headerTone)}>
                {bucket.items.length} lead{bucket.items.length === 1 ? "" : "s"}
              </span>
            }
            bodyClassName="p-0"
          >
            <div className="divide-y divide-slate-100">
              {bucket.items.map((lead) => {
                const score = resolveEffectiveIntentScore(lead, todayYmd);
                const cleanDigits = (lead.phone || "").replace(/\D/g, "");
                const waPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

                return (
                  <div
                    key={lead.id}
                    className="p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectLead(lead)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectLead(lead);
                        }
                      }}
                      className="cursor-pointer min-w-0 flex-1 space-y-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="text-sm font-bold text-slate-900">{lead.name}</span>
                        <span className="text-xs font-mono tabular-nums text-slate-500">
                          {lead.phone}
                        </span>
                        {Number(lead.budget || 0) > 0 && (
                          <span className="text-xs font-mono tabular-nums font-bold text-slate-900">
                            · {currencySymbol}
                            {Number(lead.budget).toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 tabular-nums">
                        <span className="capitalize">{lead.status}</span>
                        <span aria-hidden="true">·</span>
                        <span>{lead.source}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{score}% intent</span>
                        {lead.followUpDate && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono inline-flex items-center gap-1 text-slate-700">
                              <Clock className="h-3 w-3" />
                              {lead.followUpDate}
                              {lead.followUpTime ? ` ${lead.followUpTime}` : ""}
                            </span>
                          </>
                        )}
                        {lead.assignedName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Rep: {lead.assignedName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 rounded-lg text-xs font-semibold gap-1.5"
                        onClick={() => onLogOutreach(lead, "call", `Called ${lead.phone}`)}
                      >
                        <a href={`tel:${lead.phone}`}>
                          <Phone className="h-3.5 w-3.5" /> Call
                        </a>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 rounded-lg text-xs font-semibold gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={() =>
                          onLogOutreach(lead, "whatsapp", `Opened WhatsApp chat with ${lead.name}`)
                        }
                      >
                        <a
                          href={`https://wa.me/${waPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <SmartphoneNfc className="h-3.5 w-3.5" /> WhatsApp
                        </a>
                      </Button>
                      {!isReadOnly && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onQuickSnoozeFollowUp(lead, addDaysToYmd(todayYmd, 1))
                            }
                            className="h-8 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap"
                          >
                            Tomorrow
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onQuickSnoozeFollowUp(lead, addDaysToYmd(todayYmd, 3))
                            }
                            className="h-8 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap"
                          >
                            +3d
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onSelectLead(lead)}
                        className="h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap"
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        );
      })}
    </div>
  );
}
