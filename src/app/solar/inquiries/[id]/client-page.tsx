"use client";

import { useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  User,
  Zap,
  Activity,
  Bot,
  Loader2,
  Smartphone,
  ChevronRight,
  Building2,
  Target,
  FileText,
  Calculator,
  AlertTriangle,
  History,
  ClipboardCheck,
  ClipboardList,
  Settings2,
  Handshake,
  BadgeCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  PageHeader,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  updateDocumentNonBlocking,
  useCollection,
} from "@/firebase";
import { collection, doc, serverTimestamp, query, where } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";

const SOLAR_STATUSES: Record<
  string,
  { label: string; badgeClass: string; icon: any }
> = {
  NEW: {
    label: "New Inquiry",
    badgeClass: "text-sky-700 bg-sky-50 border-sky-200",
    icon: Zap,
  },
  CONTACTED: {
    label: "Contacted",
    badgeClass: "text-amber-700 bg-amber-50 border-amber-200",
    icon: Clock,
  },
  QUALIFIED: {
    label: "Qualified",
    badgeClass: "text-purple-700 bg-purple-50 border-purple-200",
    icon: Target,
  },
  SITE_SURVEY_PENDING: {
    label: "Survey Pending",
    badgeClass: "text-orange-700 bg-orange-50 border-orange-200",
    icon: Activity,
  },
  QUOTATION_PENDING: {
    label: "Quote Pending",
    badgeClass: "text-indigo-700 bg-indigo-50 border-indigo-200",
    icon: FileText,
  },
  CONVERTED: {
    label: "Converted",
    badgeClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
    icon: CheckCircle2,
  },
  LOST: {
    label: "Lost",
    badgeClass: "text-rose-700 bg-rose-50 border-rose-200",
    icon: AlertTriangle,
  },
};

const SURVEY_STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  SCHEDULED: {
    label: "Scheduled",
    badgeClass: "text-sky-700 bg-sky-50 border-sky-200",
  },
  IN_PROGRESS: {
    label: "Field Audit",
    badgeClass: "text-amber-700 bg-amber-50 border-amber-200",
  },
  COMPLETED: {
    label: "Audit Finished",
    badgeClass: "text-purple-700 bg-purple-50 border-purple-200",
  },
  REVIEW_REQUIRED: {
    label: "Review Pending",
    badgeClass: "text-indigo-700 bg-indigo-50 border-indigo-200",
  },
  APPROVED: {
    label: "Approved",
    badgeClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  CANCELLED: {
    label: "Cancelled",
    badgeClass: "text-rose-700 bg-rose-50 border-rose-200",
  },
};

export default function SolarInquiryDetailPage(props: {
  params: { id: string };
}) {
  const { id } = props.params;
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const inquiryRef = useMemoFirebase(
    () =>
      businessId && id
        ? doc(firestore, "businesses", businessId, "solarInquiries", id)
        : null,
    [firestore, businessId, id]
  );
  const { data: inquiry, isLoading: isInquiryLoading } =
    useDoc<any>(inquiryRef);

  const surveysQuery = useMemoFirebase(
    () =>
      businessId && id
        ? query(
            collection(firestore, "businesses", businessId, "solarSurveys"),
            where("inquiryId", "==", id)
          )
        : null,
    [firestore, businessId, id]
  );
  const { data: surveysData } = useCollection<any>(surveysQuery);
  const relatedSurveys = surveysData || [];

  const designsQuery = useMemoFirebase(
    () =>
      businessId && id
        ? query(
            collection(
              firestore,
              "businesses",
              businessId,
              "solarSystemDesigns"
            ),
            where("solarInquiryId", "==", id)
          )
        : null,
    [firestore, businessId, id]
  );
  const { data: designsData } = useCollection<any>(designsQuery);
  const relatedDesigns = designsData || [];

  const quotesQuery = useMemoFirebase(
    () =>
      businessId && id
        ? query(
            collection(firestore, "businesses", businessId, "quotations"),
            where("solarInquiryId", "==", id)
          )
        : null,
    [firestore, businessId, id]
  );
  const { data: quotesData } = useCollection<any>(quotesQuery);
  const relatedQuotes = quotesData || [];

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const teamQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "users"),
            where("businessId", "==", businessId)
          )
        : null,
    [firestore, businessId]
  );
  const { data: teamMembersData } = useCollection<any>(teamQuery);
  const teamMembers = teamMembersData || [];

  const handleUpdateStatus = (status: string) => {
    if (!inquiryRef) return;
    updateDocumentNonBlocking(inquiryRef, {
      status,
      updatedAt: serverTimestamp(),
    });
    toast({
      title: "Lifecycle Updated",
      description: `Status changed to ${SOLAR_STATUSES[status]?.label || status}.`,
    });
  };

  const handleUpdateAssignee = (userId: string) => {
    if (!inquiryRef) return;
    const staff = teamMembers.find((u: any) => u.id === userId);
    updateDocumentNonBlocking(inquiryRef, {
      assignedTo: userId,
      assignedName: staff?.name || "Admin",
      updatedAt: serverTimestamp(),
    });
    toast({
      title: "Specialist Assigned",
      description: `Inquiry assigned to ${staff?.name}.`,
    });
  };

  if (isInquiryLoading || isProfileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="animate-spin text-slate-600 h-8 w-8" />
        <p className="text-xs font-medium text-slate-500">
          Loading inquiry details...
        </p>
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="max-w-xl mx-auto py-16">
        <EmptyStatePanel
          icon={AlertTriangle}
          title="Inquiry Not Found"
          description="This solar inquiry record could not be located."
          action={
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/solar/inquiries">Back to Registry</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const currencySymbol = getCurrencySymbol(business?.currency);
  const activeSurvey = relatedSurveys.length > 0 ? relatedSurveys[0] : null;
  const activeDesign = relatedDesigns.length > 0 ? relatedDesigns[0] : null;
  const activeQuote = relatedQuotes.length > 0 ? relatedQuotes[0] : null;

  return (
    <div className="space-y-8 pb-20 text-left max-w-5xl mx-auto">
      <PageHeader
        backHref="/solar/inquiries"
        backLabel="Back to Inquiries"
        breadcrumb={`Inquiry #${id.slice(-8).toUpperCase()}`}
        title={inquiry.customerName}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="bg-slate-900 p-6 sm:p-8 text-white text-left">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                <div className="flex items-center gap-4 text-left">
                  <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-bold leading-tight">
                      {inquiry.customerName}
                    </h2>
                    <p className="text-slate-300 text-xs font-mono tabular-nums mt-1 flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5" />{" "}
                      {inquiry.customerPhone}
                    </p>
                    {inquiry.dealerName && (
                      <Badge
                        variant="outline"
                        className="mt-2 bg-white/10 border-white/20 text-slate-200 text-xs font-medium px-2.5 py-0.5"
                      >
                        Dealer: {inquiry.dealerName}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-row items-center gap-2.5 bg-white/10 p-1.5 rounded-xl border border-white/15">
                  <span className="text-xs font-medium text-slate-300 ml-2">
                    Stage:
                  </span>
                  <Select
                    value={inquiry.status}
                    onValueChange={handleUpdateStatus}
                  >
                    <SelectTrigger
                      aria-label="Inquiry pipeline stage"
                      className="h-9 w-40 rounded-lg bg-slate-800 border-white/20 text-white text-xs font-semibold"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {Object.keys(SOLAR_STATUSES).map((s) => (
                        <SelectItem
                          key={s}
                          value={s}
                          className="text-sm font-medium"
                        >
                          {SOLAR_STATUSES[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              {/* Technical Site Assessment */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-left">
                  <ClipboardCheck className="h-4 w-4 text-slate-700" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Technical Site Assessment
                  </h3>
                </div>
                {activeSurvey ? (
                  <div className="rounded-xl bg-slate-50 p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 text-left">
                      <div className="h-11 w-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                        <ClipboardList className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">
                            Site Survey Linked
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-semibold border rounded-lg px-2 py-0",
                              SURVEY_STATUS_CONFIG[activeSurvey.status]
                                ?.badgeClass
                            )}
                          >
                            {SURVEY_STATUS_CONFIG[activeSurvey.status]?.label ||
                              activeSurvey.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Surveyor: {activeSurvey.assignedName || "Unassigned"}
                        </p>
                      </div>
                    </div>
                    <Button
                      asChild
                      className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shrink-0"
                    >
                      <Link href={`/solar/surveys/${activeSurvey.id}`}>
                        Open Report <ChevronRight className="ml-1.5 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <EmptyStatePanel
                    icon={ClipboardCheck}
                    title="No site survey scheduled"
                    description="Launch a technical site survey to evaluate roof area and electrical load before system design."
                    action={
                      <Button
                        asChild
                        className="h-10 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm"
                      >
                        <Link href={`/solar/surveys/new?inquiryId=${id}`}>
                          Launch Site Survey
                        </Link>
                      </Button>
                    }
                  />
                )}
              </section>

              {/* Engineering & Proposal */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-left">
                  <Settings2 className="h-4 w-4 text-slate-700" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Engineering & Proposal
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeDesign ? (
                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-xs font-semibold text-amber-800">
                          System Design
                        </p>
                        <p className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                          {activeDesign.capacityKw} kW
                        </p>
                      </div>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="text-amber-800"
                      >
                        <Link
                          href={`/solar/designs/${activeDesign.id}`}
                          aria-label="Open system design"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center">
                      <span className="text-xs font-medium text-slate-400">
                        Design Pending
                      </span>
                    </div>
                  )}

                  {activeQuote ? (
                    <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-xs font-semibold text-indigo-800">
                          Solar Quotation
                        </p>
                        <p className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                          {currencySymbol}
                          {activeQuote.totals?.finalPayout?.toLocaleString()}
                        </p>
                      </div>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="text-indigo-800"
                      >
                        <Link
                          href={`/solar/quotations/${activeQuote.id}`}
                          aria-label="Open quotation"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center">
                      <span className="text-xs font-medium text-slate-400">
                        Proposal Pending
                      </span>
                    </div>
                  )}
                </div>
              </section>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1">
                  <p className="text-xs font-medium text-slate-500">
                    Required Capacity
                  </p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                    {inquiry.requiredCapacity || "--"}{" "}
                    <span className="text-sm font-semibold">kW</span>
                  </p>
                </div>
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <Label className="text-xs font-medium text-slate-500">
                    Assigned Specialist
                  </Label>
                  <Select
                    value={inquiry.assignedTo || ""}
                    onValueChange={handleUpdateAssignee}
                  >
                    <SelectTrigger
                      aria-label="Assign team specialist"
                      className="h-10 border-slate-200 bg-white rounded-xl text-sm font-medium text-left"
                    >
                      <SelectValue placeholder="Pick Specialist" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {teamMembers.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-slate-700" /> Technical
                  Profile
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-left">
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-500">Property Type</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {inquiry.propertyType}
                      </p>
                    </div>
                    <Building2 className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-left">
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-500">Connection</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {inquiry.electricityConnection}
                      </p>
                    </div>
                    <Zap className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-left">
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-500">Avg Monthly Bill</p>
                      <p className="text-sm font-bold font-mono tabular-nums text-slate-900">
                        {inquiry.monthlyBill
                          ? `${currencySymbol}${inquiry.monthlyBill.toLocaleString()}`
                          : "--"}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      Utility
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-left">
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-500">Roof Type</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {inquiry.roofType}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      Site
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 text-left">
          <SectionCard
            title="Inquiry Summary"
            headerRight={<History className="h-4 w-4 text-slate-500" />}
            bodyClassName="space-y-5"
          >
            <div className="space-y-1 text-left">
              <p className="text-xs text-slate-500">Created On</p>
              <p className="text-sm font-mono tabular-nums font-semibold text-slate-900">
                {inquiry.createdAt?.toDate
                  ? format(inquiry.createdAt.toDate(), "dd MMM yyyy")
                  : "Recently"}
              </p>
            </div>
            <Separator className="bg-slate-200" />
            <div className="space-y-1 text-left">
              <p className="text-xs text-slate-500">Channel Partner</p>
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <Handshake className="h-4 w-4 text-slate-600" />{" "}
                {inquiry.dealerName || "Direct Sale"}
              </div>
            </div>
            <Separator className="bg-slate-200" />
            <div>
              <Button
                asChild
                variant="outline"
                className="w-full h-11 rounded-xl text-sm font-semibold border-slate-200 text-slate-900 gap-2 bg-white"
              >
                {inquiry.leadId ? (
                  <Link href={`/leads?id=${inquiry.leadId}`}>
                    <Target className="h-4 w-4" /> View CRM Lead
                  </Link>
                ) : (
                  <Link href={`/customers?id=${inquiry.customerId}`}>
                    <User className="h-4 w-4" /> View Customer
                  </Link>
                )}
              </Button>
            </div>
          </SectionCard>

          <div className="p-6 bg-slate-900 text-white rounded-2xl space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-base font-bold text-white">Next Step Tip</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Completing the rooftop site survey verifies usable panel area and
              shading before locking system design sizing.
            </p>
            <Separator className="bg-white/15" />
            <div className="flex items-center gap-2 text-xs text-emerald-300">
              <BadgeCheck className="h-4 w-4 shrink-0" />
              <span>Workspace Records Isolated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
