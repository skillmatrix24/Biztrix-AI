"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  User,
  History,
  ShieldCheck,
  Send,
  Loader2,
  BadgeCheck,
  Zap,
  Activity,
  ShieldAlert,
  Wallet,
  DollarSign,
  Circle,
  LayoutList,
  Target,
  Sparkles,
  Scale,
  FileText,
  Lock,
  MessageSquare,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  KpiStatCard,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
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
} from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

const PROJECT_STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  planning: {
    label: "Planning",
    color: "text-sky-700",
    bg: "bg-sky-50 border-sky-200",
    icon: Zap,
  },
  "in-progress": {
    label: "In Progress",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: Activity,
  },
  "on-hold": {
    label: "On Hold",
    color: "text-slate-700",
    bg: "bg-slate-100 border-slate-200",
    icon: Clock,
  },
  completed: {
    label: "Completed",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: BadgeCheck,
  },
};

export default function PublicProjectTrackingPage(props: {
  params: { businessId: string; projectId: string };
}) {
  const { businessId, projectId } = props.params;
  const firestore = useFirestore();

  const projectRef = useMemoFirebase(
    () =>
      businessId && projectId
        ? doc(firestore, "businesses", businessId, "projects", projectId)
        : null,
    [firestore, businessId, projectId]
  );
  const { data: project, isLoading: isProjectLoading, error } = useDoc<any>(projectRef);

  const tasksQuery = useMemoFirebase(
    () =>
      businessId && projectId
        ? query(
            collection(firestore, "businesses", businessId, "tasks"),
            where("projectId", "==", projectId)
          )
        : null,
    [firestore, businessId, projectId]
  );
  const { data: tasksData } = useCollection<any>(tasksQuery);
  const projectTasks = useMemo(() => tasksData || [], [tasksData]);

  const transactionsQuery = useMemoFirebase(() => {
    if (!businessId || !projectId) return null;
    return query(
      collection(firestore, "businesses", businessId, "cashbook"),
      where("projectId", "==", projectId)
    );
  }, [firestore, businessId, projectId]);
  const { data: projectTransactions } = useCollection<any>(transactionsQuery);

  const bizRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(bizRef);

  const [clientRequest, setClientRequest] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);

  const finStats = useMemo(() => {
    const revenue = (projectTransactions || [])
      .filter((t: any) => t.type === "credit")
      .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
    const baseValue = parseFloat(project?.estimatedValue) || 0;
    const addonsValue = (project?.addons || []).reduce(
      (sum: number, a: any) => sum + (parseFloat(a.price) || 0),
      0
    );
    const totalProjectValue = baseValue + addonsValue;
    const remainBalance = totalProjectValue - revenue;

    return { revenue, totalProjectValue, remainBalance, baseValue, addonsValue };
  }, [projectTransactions, project]);

  const taskStats = useMemo(() => {
    const total = projectTasks.length;
    const completed = projectTasks.filter((t) => t.status === "completed").length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, progress };
  }, [projectTasks]);

  const groupedTasks = useMemo(() => {
    const sections: Record<string, any[]> = {};
    projectTasks.forEach((t: any) => {
      const sec = t.section || "Project Milestones";
      if (!sections[sec]) sections[sec] = [];
      sections[sec].push(t);
    });
    return sections;
  }, [projectTasks]);

  const handleSubmitRequest = () => {
    if (!clientRequest.trim() || !businessId || !project) return;
    setIsSubmitting(true);
    addDocumentNonBlocking(
      collection(
        firestore,
        "businesses",
        businessId,
        "projects",
        projectId,
        "clientMessages"
      ),
      {
        text: clientRequest,
        timestamp: new Date().toISOString(),
        status: "pending",
        isRead: false,
      }
    );
    setClientRequest("");
    setIsSubmitting(false);
    toast({ title: "Message sent", description: "The project team has been notified." });
  };

  const handleApproveMilestone = (milestoneId: string) => {
    if (!projectRef || !project) return;
    const updatedMilestones = (project.milestones || []).map((m: any) =>
      m.id === milestoneId
        ? {
            ...m,
            status: "approved_by_client",
            approvedAt: new Date().toISOString(),
          }
        : m
    );
    updateDocumentNonBlocking(projectRef, {
      milestones: updatedMilestones,
      lastClientUpdate: serverTimestamp(),
    });

    addDocumentNonBlocking(
      collection(firestore, "businesses", businessId, "notifications"),
      {
        recipientId: project.ownerId || business?.ownerId,
        projectId,
        title: "Milestone Approved",
        message: `${project.clientName} has approved a milestone.`,
        type: "payment",
        isRead: false,
        createdAt: serverTimestamp(),
        businessId,
      }
    );
    toast({ title: "Milestone approved" });
  };

  const handleAcceptAgreement = () => {
    if (!projectRef || !agreementChecked || !project) return;
    updateDocumentNonBlocking(projectRef, {
      isAgreed: true,
      agreedAt: serverTimestamp(),
      lastClientUpdate: serverTimestamp(),
    });
    toast({ title: "Agreement accepted" });
  };

  const currencySymbol = getCurrencySymbol(business?.currency);

  if (isProjectLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (error || !project || project.sharePublic === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="h-12 w-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-4">
          <ShieldAlert className="h-6 w-6 text-rose-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Private Project</h1>
        <p className="text-sm text-slate-600 mt-1">
          This client progress page is currently private or unavailable.
        </p>
        <Button asChild variant="outline" className="mt-5 rounded-xl border-slate-200">
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    );
  }

  const statusInfo =
    PROJECT_STATUS_CONFIG[project.status] || PROJECT_STATUS_CONFIG["planning"];
  const whatsappDigits = business?.phone?.replace(/\D/g, "") || "";
  const whatsappUrl = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
        `Hi! I need an update on Project ${projectId.slice(-6).toUpperCase()}`
      )}`
    : null;

  const creditTransactions = (projectTransactions || []).filter(
    (t: any) => t.type === "credit"
  );

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-20 overflow-x-hidden text-left">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 h-16 flex items-center">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
              {business?.logoUrl ? (
                <img
                  src={business.logoUrl}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain p-1"
                  alt={business?.name || "Business"}
                />
              ) : (
                <div className="h-full w-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
                  {business?.name?.charAt(0) || "B"}
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-900 truncate">
                {business?.name || "Client Portal"}
              </span>
              <span className="text-xs font-medium text-emerald-700">
                Client Progress Portal
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
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6">
          <div className="space-y-1.5 min-w-0">
            <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700 font-mono tabular-nums">
              Project ID: {projectId.slice(-6).toUpperCase()}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {project.title}
            </h1>
            <p className="text-sm text-slate-600 flex items-center gap-1.5">
              <User className="h-4 w-4 text-slate-400" /> Client:{" "}
              <span className="font-semibold text-slate-900">{project.clientName}</span>
            </p>
          </div>
          <div
            className={cn(
              "w-full md:w-auto px-5 py-3.5 rounded-xl border flex items-center gap-3.5 shrink-0",
              statusInfo.bg
            )}
          >
            <statusInfo.icon className={cn("h-6 w-6", statusInfo.color)} />
            <div>
              <p className="text-xs font-medium text-slate-600">Current Status</p>
              <p className={cn("text-base font-bold leading-tight", statusInfo.color)}>
                {statusInfo.label}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiStatCard
            label="Contract Value"
            value={`${currencySymbol}${finStats.totalProjectValue.toLocaleString()}`}
            icon={DollarSign}
            tone="dark"
          />
          <KpiStatCard
            label="Settled Amount"
            value={`${currencySymbol}${finStats.revenue.toLocaleString()}`}
            icon={CheckCircle2}
            tone="positive"
          />
          <KpiStatCard
            label="Balance Due"
            value={`${currencySymbol}${Math.max(0, finStats.remainBalance).toLocaleString()}`}
            icon={Wallet}
            tone={finStats.remainBalance > 0 ? "warning" : "positive"}
          />
          <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Completion</span>
              <Target className="h-4 w-4 text-slate-400" />
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  {taskStats.progress}%
                </span>
                <span className="text-xs font-semibold text-slate-500 font-mono tabular-nums">
                  {taskStats.completed}/{taskStats.total} tasks
                </span>
              </div>
              <Progress value={taskStats.progress} className="h-1.5 mt-2.5" />
            </div>
          </div>
        </div>

        <Tabs defaultValue="roadmap" className="w-full space-y-6">
          <TabsList className="bg-white border border-slate-200 h-12 p-1 rounded-xl flex overflow-x-auto scrollbar-hide w-full sm:w-fit">
            <TabsTrigger
              value="roadmap"
              className="rounded-lg px-4 text-xs font-semibold gap-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              <LayoutList className="h-4 w-4" /> Execution Roadmap
            </TabsTrigger>
            <TabsTrigger
              value="milestones"
              className="rounded-lg px-4 text-xs font-semibold gap-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              <Sparkles className="h-4 w-4" /> Milestones & Sign-off
            </TabsTrigger>
            <TabsTrigger
              value="legal"
              className="rounded-lg px-4 text-xs font-semibold gap-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              <Scale className="h-4 w-4" /> Agreements
            </TabsTrigger>
            <TabsTrigger
              value="ledger"
              className="rounded-lg px-4 text-xs font-semibold gap-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              <History className="h-4 w-4" /> Payment Ledger
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-6">
              <TabsContent value="roadmap" className="m-0 space-y-6">
                {Object.keys(groupedTasks).length === 0 ? (
                  <EmptyStatePanel
                    icon={LayoutList}
                    title="No roadmap tasks published yet"
                    description="Deliverables and task stages added by the project team will appear here."
                  />
                ) : (
                  Object.entries(groupedTasks).map(([section, sectionTasks], sIdx) => (
                    <SectionCard
                      key={section}
                      title={`${sIdx + 1}. ${section}`}
                      description={`${sectionTasks.filter((t) => t.status === "completed").length} of ${sectionTasks.length} completed`}
                    >
                      <div className="space-y-2.5">
                        {sectionTasks.map((task: any) => (
                          <div
                            key={task.id}
                            className={cn(
                              "p-3.5 rounded-xl border flex items-center gap-3.5 transition-colors",
                              task.status === "completed"
                                ? "border-emerald-200 bg-emerald-50/40"
                                : "border-slate-200 bg-white"
                            )}
                          >
                            <div
                              className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border",
                                task.status === "completed"
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : "bg-slate-50 border-slate-200 text-slate-400"
                              )}
                            >
                              {task.status === "completed" ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <Circle className="h-4 w-4" />
                              )}
                            </div>
                            <span
                              className={cn(
                                "text-sm font-medium truncate",
                                task.status === "completed"
                                  ? "text-slate-500 line-through"
                                  : "text-slate-900"
                              )}
                            >
                              {task.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  ))
                )}
              </TabsContent>

              <TabsContent value="milestones" className="m-0 space-y-6">
                <SectionCard
                  title="Financial Stages & Client Sign-off"
                  description="Review completed project stages and approve delivery milestones."
                >
                  {!project.milestones || project.milestones.length === 0 ? (
                    <EmptyStatePanel
                      icon={Sparkles}
                      title="No milestones defined"
                      description="Payment and delivery stages will appear here once configured."
                    />
                  ) : (
                    <div className="divide-y divide-slate-200 -mx-6 -my-5">
                      {project.milestones.map((m: any) => (
                        <div
                          key={m.id}
                          className={cn(
                            "p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                            m.status === "approved_by_client"
                              ? "bg-emerald-50/40"
                              : "bg-white"
                          )}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div
                              className={cn(
                                "h-10 w-10 rounded-xl border flex items-center justify-center shrink-0",
                                m.status === "approved_by_client" ||
                                  m.status === "invoiced"
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : "bg-slate-50 border-slate-200 text-slate-400"
                              )}
                            >
                              {m.status === "approved_by_client" ||
                              m.status === "invoiced" ? (
                                <BadgeCheck className="h-5 w-5" />
                              ) : (
                                <Clock className="h-5 w-5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-base font-bold text-slate-900 truncate">
                                {m.label}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 mt-1">
                                <span className="text-xs font-semibold text-slate-700 font-mono tabular-nums">
                                  Stage Amount: {currencySymbol}
                                  {parseFloat(m.amount || 0).toLocaleString()}
                                </span>
                                {m.status === "approved_by_client" && (
                                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Signed off by
                                    you
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {m.status === "completed" && (
                              <Button
                                onClick={() => handleApproveMilestone(m.id)}
                                className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 rounded-xl"
                              >
                                Approve Stage
                              </Button>
                            )}
                            {m.status === "approved_by_client" && (
                              <span className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                                Approved
                              </span>
                            )}
                            {m.status === "invoiced" && (
                              <span className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                                Settled
                              </span>
                            )}
                            {m.status === "pending" && (
                              <span className="inline-flex items-center rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500">
                                Awaiting Team
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </TabsContent>

              <TabsContent value="legal" className="m-0 space-y-6">
                <SectionCard
                  title="Service Agreements"
                  description="Review delivery terms and payment policy for this engagement."
                >
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-slate-500" /> Scope & Delivery
                        Terms
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {project.terms || "Standard project terms apply."}
                      </p>
                    </div>
                    <div className="border-t border-slate-200 pt-5">
                      <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-2 mb-2">
                        <Wallet className="h-4 w-4 text-slate-500" /> Financial & Refund
                        Policy
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {project.policy ||
                          "Payments are non-refundable after milestone approval."}
                      </p>
                    </div>

                    {!project.isAgreed ? (
                      <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="accept-terms"
                            checked={agreementChecked}
                            onCheckedChange={(v) => setAgreementChecked(!!v)}
                            className="mt-0.5"
                          />
                          <Label
                            htmlFor="accept-terms"
                            className="text-sm font-medium text-slate-700 leading-relaxed cursor-pointer"
                          >
                            I confirm that I have reviewed the roadmap and financial terms,
                            and I accept the agreement for{" "}
                            <span className="font-bold text-slate-900">
                              &ldquo;{project.title}&rdquo;
                            </span>
                            .
                          </Label>
                        </div>
                        <Button
                          onClick={handleAcceptAgreement}
                          disabled={!agreementChecked}
                          className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl"
                        >
                          Confirm & Sign Off
                        </Button>
                      </div>
                    ) : (
                      <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-4">
                        <CheckCircle2 className="h-7 w-7 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-base font-bold text-emerald-900">
                            Agreement Accepted
                          </p>
                          <p className="text-xs font-medium text-emerald-700 font-mono tabular-nums mt-0.5">
                            Signed on{" "}
                            {project.agreedAt?.toDate?.()?.toLocaleDateString() ||
                              "Recently"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </SectionCard>
              </TabsContent>

              <TabsContent value="ledger" className="m-0">
                {project.shareLedger ? (
                  <SectionCard
                    title="Payment Ledger"
                    description="Verified inflow entries recorded against this project."
                  >
                    {creditTransactions.length === 0 ? (
                      <EmptyStatePanel
                        icon={History}
                        title="No payment entries yet"
                        description="Payments received for this project will be itemized here."
                      />
                    ) : (
                      <div className="overflow-x-auto -mx-6 -my-5">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50 border-b border-slate-200">
                              <TableHead className="pl-6 text-xs font-semibold text-slate-700 h-11">
                                Date
                              </TableHead>
                              <TableHead className="text-xs font-semibold text-slate-700 h-11">
                                Particulars
                              </TableHead>
                              <TableHead className="text-right pr-6 text-xs font-semibold text-slate-700 h-11">
                                Amount Received
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {creditTransactions.map((trans: any) => (
                              <TableRow
                                key={trans.id}
                                className="hover:bg-slate-50/80 border-b border-slate-200 last:border-0"
                              >
                                <TableCell className="pl-6 py-4 text-xs font-mono tabular-nums text-slate-500">
                                  {trans.date}
                                </TableCell>
                                <TableCell className="text-sm font-medium text-slate-800">
                                  {trans.particulars?.split(" (")[0]}
                                </TableCell>
                                <TableCell className="text-right pr-6 font-bold font-mono tabular-nums text-sm text-emerald-700">
                                  {currencySymbol}
                                  {parseFloat(trans.amount || 0).toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </SectionCard>
                ) : (
                  <EmptyStatePanel
                    icon={Lock}
                    title="Payment ledger is private"
                    description="The service team has restricted public access to the financial ledger."
                  />
                )}
              </TabsContent>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <SectionCard
                title="Message Project Team"
                description="Ask a question or request a revision."
              >
                <div className="space-y-4">
                  <Textarea
                    placeholder="Need clarification or want to request a change?"
                    className="min-h-[120px] rounded-xl text-sm border-slate-200 bg-slate-50 p-3.5"
                    value={clientRequest}
                    onChange={(e) => setClientRequest(e.target.value)}
                  />
                  <Button
                    onClick={handleSubmitRequest}
                    disabled={!clientRequest.trim() || isSubmitting}
                    className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Message
                  </Button>
                </div>
              </SectionCard>

              <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 text-white space-y-5">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                    <MessageCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Direct Support</h4>
                    <p className="text-xs text-slate-400">Priority Client Desk</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Connect directly with our team for urgent project updates or billing questions.
                </p>
                {whatsappUrl && (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-10 bg-white/10 border-white/15 text-white hover:bg-white/20 hover:text-white font-semibold text-xs rounded-xl"
                  >
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      Message on WhatsApp
                    </a>
                  </Button>
                )}
                <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 flex items-start gap-3">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Encrypted, workspace-isolated client progress link.
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
            Secure Client Project Portal · {business?.name || "Biztrix Workspace"}
          </p>
        </div>
      </footer>
    </div>
  );
}
