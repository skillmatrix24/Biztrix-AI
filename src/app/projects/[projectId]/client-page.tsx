"use client";

import { useState, useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  Target,
  LayoutList,
  ChevronRight,
  Bot,
  Zap,
  Loader2,
  Circle,
  SmartphoneNfc,
  Wallet,
  Plus,
  TrendingUp,
  Receipt,
  Globe,
  Copy,
  Check,
  Briefcase,
  Sparkles,
  MessageCircle,
  DollarSign,
  Coins,
  Reply,
  BadgeCheck,
  Activity,
  User,
  ShieldAlert,
  ListTodo,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, getCurrencySymbol } from "@/lib/utils";
import {
  useFirestore,
  useDoc,
  useMemoFirebase,
  useCollection,
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  useUser,
} from "@/firebase";
import { collection, doc, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { suggestProjectTasks } from "@/ai/flows/suggest-project-tasks";
import {
  PageHeader,
  KpiStatCard,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";

const PROJECT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  planning: { label: "Planning", color: "text-sky-700", bg: "bg-sky-50 border-sky-200", icon: Zap },
  "in-progress": {
    label: "Active Execution",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: Activity,
  },
  "on-hold": { label: "On Hold", color: "text-slate-600", bg: "bg-slate-100 border-slate-200", icon: Clock },
  completed: {
    label: "Fully Delivered",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: BadgeCheck,
  },
};

export default function ProjectDashboardPage(props: { params: { projectId: string } }) {
  const { projectId } = props.params;
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const projectRef = useMemoFirebase(
    () =>
      businessId && projectId
        ? doc(firestore, "businesses", businessId, "projects", projectId)
        : null,
    [firestore, businessId, projectId]
  );
  const { data: project, isLoading: isProjectLoading } = useDoc<any>(projectRef);

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const tasksQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "tasks"),
            where("projectId", "==", projectId)
          )
        : null,
    [firestore, businessId, projectId]
  );
  const { data: tasksData } = useCollection<any>(tasksQuery);
  const projectTasks = tasksData || [];

  const messagesQuery = useMemoFirebase(
    () =>
      businessId && projectId
        ? query(
            collection(firestore, "businesses", businessId, "projects", projectId, "clientMessages"),
            orderBy("timestamp", "desc")
          )
        : null,
    [firestore, businessId, projectId]
  );
  const { data: messagesData } = useCollection<any>(messagesQuery);
  const clientMessages = messagesData || [];

  const transactionsQuery = useMemoFirebase(
    () =>
      businessId && projectId
        ? query(
            collection(firestore, "businesses", businessId, "cashbook"),
            where("projectId", "==", projectId)
          )
        : null,
    [firestore, businessId, projectId]
  );
  const { data: transactionsData } = useCollection<any>(transactionsQuery);
  const projectTransactions = transactionsData || [];

  const teamQuery = useMemoFirebase(
    () => (businessId ? query(collection(firestore, "users"), where("businessId", "==", businessId)) : null),
    [firestore, businessId]
  );
  const { data: businessUsers = [] } = useCollection<any>(teamQuery);

  const [activeTab, setActiveTab] = useState("roadmap");
  const [isCopied, setIsCopied] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseParticulars, setExpenseParticulars] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Expense");

  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
  const [milestoneLabel, setMilestoneLabel] = useState("");
  const [milestoneAmount, setMilestoneAmount] = useState("");

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [selectedAiTaskIds, setSelectedAiTaskIds] = useState<string[]>([]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickTaskAssignee, setQuickTaskAssignee] = useState("unassigned");
  const [quickTaskPriority, setQuickTaskPriority] = useState<string>("medium");
  const [quickTaskDueDate, setQuickTaskDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [quickTaskSection, setQuickTaskSection] = useState("Execution");

  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const handleQuickAddTask = () => {
    if (!quickTaskTitle.trim() || !businessId || !projectId) return;
    const effectiveAssignee = quickTaskAssignee === "unassigned" ? "" : quickTaskAssignee;
    const assignedUser = effectiveAssignee
      ? businessUsers.find((u: any) => u.id === effectiveAssignee)
      : null;
    const tasksRef = collection(firestore, "businesses", businessId, "tasks");

    addDocumentNonBlocking(tasksRef, {
      title: quickTaskTitle.trim(),
      status: "pending",
      priority: quickTaskPriority,
      dueDate: quickTaskDueDate,
      section: quickTaskSection || "Execution",
      projectId,
      projectName: project?.title || "Project",
      assignedTo: effectiveAssignee || project?.team?.[0] || "",
      assignedName:
        assignedUser?.name ||
        businessUsers.find((u: any) => u.id === project?.team?.[0])?.name ||
        "Unassigned",
      businessId,
      createdAt: serverTimestamp(),
    });

    if (effectiveAssignee) {
      addDocumentNonBlocking(collection(firestore, "businesses", businessId, "notifications"), {
        businessId,
        recipientId: effectiveAssignee,
        title: "New Project Task Assigned",
        message: `Task assigned in ${project?.title}: ${quickTaskTitle.trim()}`,
        type: "task",
        projectId,
        isRead: false,
        createdAt: serverTimestamp(),
      });
    }

    setQuickTaskTitle("");
    setIsAddTaskOpen(false);
    toast({ title: "Task Added to Project", description: quickTaskTitle.trim() });
  };

  const finStats = useMemo(() => {
    if (!project)
      return {
        expense: 0,
        revenue: 0,
        staffCost: 0,
        netProfit: 0,
        profitMargin: 0,
        totalProjectValue: 0,
        remainBalance: 0,
      };

    const expense = projectTransactions
      .filter((t: any) => t.type === "debit")
      .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
    const revenue = projectTransactions
      .filter((t: any) => t.type === "credit")
      .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);

    const staffCost = projectTasks.reduce((total: number, task: any) => {
      const staff = businessUsers.find((u: any) => u.id === task.assignedTo);
      if (!staff || !task.timeSpent) return total;
      const hourlyRate = (staff.dailyRate || 500) / (staff.shiftHours || 8);
      return total + (task.timeSpent / 60) * hourlyRate;
    }, 0);

    const baseValue = parseFloat(project.estimatedValue) || 0;
    const addonsValue = (project.addons || []).reduce(
      (sum: number, a: any) => sum + (parseFloat(a.price) || 0),
      0
    );
    const totalProjectValue = baseValue + addonsValue;
    const remainBalance = totalProjectValue - revenue;
    const netProfit = revenue - expense - staffCost;
    const profitMargin = totalProjectValue > 0 ? (netProfit / totalProjectValue) * 100 : 0;

    return {
      expense,
      revenue,
      staffCost,
      netProfit,
      profitMargin,
      totalProjectValue,
      remainBalance,
      baseValue,
      addonsValue,
    };
  }, [projectTransactions, project, projectTasks, businessUsers]);

  const taskStats = useMemo(() => {
    const total = projectTasks.length;
    const completed = projectTasks.filter((t) => t.status === "completed").length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, progress };
  }, [projectTasks]);

  const handleUpdateField = (key: string, value: any) => {
    if (!projectRef) return;
    updateDocumentNonBlocking(projectRef, { [key]: value, updatedAt: serverTimestamp() });
    toast({ title: "Updated" });
  };

  const handleUpdateStatus = (status: string) => {
    if (!projectRef) return;
    updateDocumentNonBlocking(projectRef, { status, updatedAt: serverTimestamp() });
    toast({ title: "Status Updated" });
  };

  const handleAddMilestone = () => {
    if (!projectRef || !milestoneLabel || !milestoneAmount) return;
    const currentMilestones = project.milestones || [];
    const newMilestone = {
      id: `ms_${Date.now()}`,
      label: milestoneLabel,
      amount: parseFloat(milestoneAmount),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    updateDocumentNonBlocking(projectRef, {
      milestones: [...currentMilestones, newMilestone],
      updatedAt: serverTimestamp(),
    });
    setMilestoneLabel("");
    setMilestoneAmount("");
    setIsAddMilestoneOpen(false);
    toast({ title: "Milestone Added" });
  };

  const toggleMilestoneStatus = (milestoneId: string, currentStatus: string) => {
    if (!projectRef || !project) return;
    const nextStatus = currentStatus === "pending" ? "completed" : "pending";
    const updatedMilestones = (project.milestones || []).map((m: any) =>
      m.id === milestoneId ? { ...m, status: nextStatus } : m
    );
    updateDocumentNonBlocking(projectRef, {
      milestones: updatedMilestones,
      updatedAt: serverTimestamp(),
    });
    toast({ title: "Status Updated" });
  };

  const handleCreateMilestoneBill = (milestone: any) => {
    if (!businessId || !project) return;
    router.push(
      `/billing?customerId=${project.clientId}&projectId=${project.id}&milestoneId=${milestone.id}&amount=${milestone.amount}`
    );
  };

  const handleSuggestTasks = async () => {
    if (!project) return;
    setIsAiLoading(true);
    try {
      const result = await suggestProjectTasks({
        title: project.title,
        description: project.description,
        deepResearch: true,
      });
      const tasksWithTempIds = result.tasks.map((t) => ({
        ...t,
        tempId: Math.random().toString(36).substr(2, 9),
      }));
      setAiSuggestions(tasksWithTempIds);
      setSelectedAiTaskIds(tasksWithTempIds.map((t) => t.tempId));
      setIsAiModalOpen(true);
    } finally {
      setIsAiLoading(false);
    }
  };

  const saveSelectedAiTasks = () => {
    if (!businessId || !projectId || !project) return;
    const tasksRef = collection(firestore, "businesses", businessId, "tasks");
    const selectedTasks = aiSuggestions.filter((t) => selectedAiTaskIds.includes(t.tempId));

    selectedTasks.forEach((task) => {
      addDocumentNonBlocking(tasksRef, {
        title: task.title,
        description: task.description,
        section: task.section,
        priority: task.priority,
        status: "pending",
        projectId,
        projectName: project.title,
        assignedTo: project.team?.[0] || "",
        assignedName:
          businessUsers.find((u: any) => u.id === project.team?.[0])?.name || "Unassigned",
        createdAt: serverTimestamp(),
        businessId,
      });
    });

    setIsAiModalOpen(false);
    setAiSuggestions([]);
    setSelectedAiTaskIds([]);
    toast({
      title: "Workflow Created",
      description: `${selectedTasks.length} tasks added to project.`,
    });
  };

  const digestShareHref = useMemo(() => {
    if (!project) return "#";
    const nextMilestone = (project.milestones || []).find((m: any) => m.status === "pending");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const trackUrl = `${origin}/projects/track/${businessId}/${projectId}`;
    const statusLabel = PROJECT_STATUS_CONFIG[project.status]?.label || project.status;
    const message = `Project Progress Update: ${project.title}\nStatus: ${statusLabel}\nProgress: ${taskStats.progress}% Complete (${taskStats.completed}/${taskStats.total} Tasks)\nCollection: ${currencySymbol}${finStats.revenue.toLocaleString()} / ${currencySymbol}${finStats.totalProjectValue.toLocaleString()}\nNext Milestone: ${nextMilestone?.label || "Final Handover"}\nTracking Portal: ${trackUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }, [project, businessId, projectId, taskStats, currencySymbol, finStats]);

  const handleRecordExpense = () => {
    if (!expenseAmount || !expenseParticulars || !businessId || !project?.id) return;
    const cashbookRef = collection(firestore, "businesses", businessId, "cashbook");
    addDocumentNonBlocking(cashbookRef, {
      businessId,
      type: "debit",
      amount: parseFloat(expenseAmount),
      particulars: `${expenseParticulars} (Project: ${project.title})`,
      category: expenseCategory,
      projectId: project.id,
      date: new Date().toISOString().split("T")[0],
      createdAt: serverTimestamp(),
    });
    setIsAddExpenseOpen(false);
    setExpenseAmount("");
    setExpenseParticulars("");
    toast({ title: "Expense Recorded" });
  };

  const handleSendReply = (msgId: string) => {
    if (!replyText.trim() || !businessId || !projectId) return;
    const msgRef = doc(
      firestore,
      "businesses",
      businessId,
      "projects",
      projectId,
      "clientMessages",
      msgId
    );
    updateDocumentNonBlocking(msgRef, {
      replyText,
      repliedAt: new Date().toISOString(),
      status: "replied",
    });
    setReplyText("");
    setActiveReplyId(null);
    toast({ title: "Reply Dispatched" });
  };

  if (isProfileLoading || isProjectLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-700 h-8 w-8" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <ShieldAlert className="h-10 w-10 text-rose-600" />
        <h1 className="text-xl font-bold text-slate-900">Project Not Found</h1>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/projects">Back to Projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 text-left">
      <PageHeader
        breadcrumb={`Projects · #${projectId.slice(-6).toUpperCase()}`}
        title={project.title}
        description={project.clientName ? `Client: ${project.clientName}` : undefined}
        backHref="/projects"
        backLabel="Back to Projects"
        actions={
          <>
            <Button
              asChild
              variant="outline"
              className="h-10 px-4 rounded-xl bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-semibold text-xs gap-2"
            >
              <a href={digestShareHref} target="_blank" rel="noopener noreferrer">
                <SmartphoneNfc className="h-4 w-4" /> Share Digest
              </a>
            </Button>
            <Select value={project.status} onValueChange={handleUpdateStatus}>
              <SelectTrigger
                className={cn(
                  "h-10 rounded-xl font-semibold text-xs w-44 border",
                  PROJECT_STATUS_CONFIG[project.status]?.bg,
                  PROJECT_STATUS_CONFIG[project.status]?.color
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {Object.keys(PROJECT_STATUS_CONFIG).map((s) => (
                  <SelectItem key={s} value={s} className="text-xs font-medium">
                    {PROJECT_STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiStatCard
          label="Execution Progress"
          value={`${taskStats.progress}%`}
          subtext={`${taskStats.completed} of ${taskStats.total} tasks closed`}
          icon={Target}
        />
        <KpiStatCard
          label="Collected"
          value={`${currencySymbol}${finStats.revenue.toLocaleString()}`}
          subtext="Received payments"
          icon={CheckCircle2}
          tone="positive"
        />
        <KpiStatCard
          label="Pending Balance"
          value={`${currencySymbol}${Math.max(0, finStats.remainBalance).toLocaleString()}`}
          subtext="Remaining receivable"
          icon={Wallet}
          tone="warning"
        />
        <KpiStatCard
          label="Net Profit"
          value={`${currencySymbol}${finStats.netProfit.toLocaleString()}`}
          subtext={`${Math.round(finStats.profitMargin)}% profit margin`}
          icon={TrendingUp}
          tone={finStats.netProfit >= 0 ? "dark" : "danger"}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-slate-100 border border-slate-200 h-11 p-1 rounded-xl inline-flex w-full sm:w-auto overflow-x-auto scrollbar-hide">
          <TabsTrigger
            value="roadmap"
            className="rounded-lg px-4 text-xs font-semibold gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <LayoutList className="h-4 w-4" /> Workflow
          </TabsTrigger>
          <TabsTrigger
            value="financials"
            className="rounded-lg px-4 text-xs font-semibold gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <DollarSign className="h-4 w-4" /> Financials
          </TabsTrigger>
          <TabsTrigger
            value="messages"
            className="rounded-lg px-4 text-xs font-semibold gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <MessageCircle className="h-4 w-4" /> Requests
          </TabsTrigger>
          <TabsTrigger
            value="sharing"
            className="rounded-lg px-4 text-xs font-semibold gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <Globe className="h-4 w-4" /> Client Tracking
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <TabsContent value="roadmap" className="m-0 space-y-4">
              <SectionCard
                title="Execution Timeline"
                description="Track project tasks, assignees, and deadlines."
                headerRight={
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSuggestTasks}
                      disabled={isAiLoading}
                      className="h-9 rounded-xl text-xs font-semibold gap-1.5"
                    >
                      {isAiLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Bot className="h-3.5 w-3.5" />
                      )}
                      Suggest Tasks
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setQuickTaskAssignee(project?.team?.[0] || "");
                        setIsAddTaskOpen(true);
                      }}
                      className="h-9 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Task
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-9 rounded-xl text-xs font-semibold">
                      <Link href={`/notes?projectId=${projectId}`}>
                        <ListTodo className="h-3.5 w-3.5 mr-1" /> Task Manager
                      </Link>
                    </Button>
                  </div>
                }
              >
                {projectTasks.length === 0 ? (
                  <EmptyStatePanel
                    icon={LayoutList}
                    title="No tasks linked yet"
                    description="Create tasks or generate a project checklist to track execution."
                  />
                ) : (
                  <div className="space-y-3">
                    {projectTasks.map((task: any) => {
                      const priorityColor =
                        task.priority === "urgent"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : task.priority === "high"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : task.priority === "low"
                              ? "bg-slate-100 text-slate-700 border-slate-200"
                              : "bg-sky-50 text-sky-800 border-sky-200";

                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => router.push(`/notes/${task.id}`)}
                          className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div
                              className={cn(
                                "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border",
                                task.status === "completed"
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : "bg-slate-50 border-slate-200 text-slate-500"
                              )}
                            >
                              {task.status === "completed" ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <Circle className="h-4 w-4" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p
                                  className={cn(
                                    "text-sm font-bold text-slate-900 group-hover:text-primary transition-colors truncate",
                                    task.status === "completed" && "line-through text-slate-500"
                                  )}
                                >
                                  {task.title}
                                </p>
                                {task.section && (
                                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                    {task.section}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-600 mt-1 flex-wrap">
                                <span className="font-medium text-slate-700">{task.assignedName || "Unassigned"}</span>
                                {task.dueDate && (
                                  <>
                                    <span>·</span>
                                    <span className="font-mono tabular-nums font-semibold text-slate-600 flex items-center gap-1">
                                      <Clock className="h-3 w-3 text-slate-400" />
                                      {task.dueDate}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <Badge variant="outline" className={cn("text-[11px] font-bold capitalize border px-2 py-0.5", priorityColor)}>
                              {task.priority || "Normal"}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </TabsContent>

            <TabsContent value="financials" className="m-0 space-y-6">
              <SectionCard
                title="Project Ledger"
                description="All inflows and project expenses synced with your cashbook."
                headerRight={
                  <Button
                    type="button"
                    onClick={() => setIsAddExpenseOpen(true)}
                    size="sm"
                    className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" /> Record Expense
                  </Button>
                }
                bodyClassName="p-0"
              >
                {projectTransactions.length === 0 ? (
                  <div className="p-6">
                    <EmptyStatePanel
                      icon={Coins}
                      title="No project transactions yet"
                      description="Record an expense or receive a milestone payment to view entries here."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/80 border-b border-slate-200">
                          <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">
                            Date
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-slate-600 h-11">
                            Transaction
                          </TableHead>
                          <TableHead className="text-right text-xs font-semibold text-slate-600 h-11">
                            Inflow (+)
                          </TableHead>
                          <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11">
                            Outflow (-)
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projectTransactions.map((t: any) => (
                          <TableRow key={t.id} className="hover:bg-slate-50/70 border-b border-slate-100">
                            <TableCell className="pl-6 py-3.5 text-xs font-mono tabular-nums text-slate-500">
                              {t.date}
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-medium text-slate-900">
                                {t.particulars.split(" (Project:")[0]}
                              </p>
                              <p className="text-xs text-slate-500">{t.category}</p>
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums font-semibold text-sm text-emerald-700">
                              {t.type === "credit"
                                ? `${currencySymbol}${Number(t.amount || 0).toLocaleString()}`
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right pr-6 font-mono tabular-nums font-semibold text-sm text-rose-700">
                              {t.type === "debit"
                                ? `${currencySymbol}${Number(t.amount || 0).toLocaleString()}`
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Payment Milestones"
                description="Stage deliverables and trigger GST invoices on client approval."
                headerRight={
                  <Button
                    type="button"
                    onClick={() => setIsAddMilestoneOpen(true)}
                    variant="outline"
                    size="sm"
                    className="h-9 px-3.5 rounded-xl text-xs font-semibold"
                  >
                    Define Stage
                  </Button>
                }
                bodyClassName="p-0"
              >
                {(project.milestones || []).length === 0 ? (
                  <div className="p-6">
                    <EmptyStatePanel
                      icon={Sparkles}
                      title="No payment milestones defined"
                      description="Break project value into billing stages to track payouts cleanly."
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {(project.milestones || []).map((m: any) => (
                      <div
                        key={m.id}
                        className={cn(
                          "p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                          m.status === "approved_by_client" ? "bg-sky-50/40" : ""
                        )}
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={cn(
                              "h-9 w-9 rounded-xl border flex items-center justify-center shrink-0",
                              m.status === "completed" ||
                                m.status === "invoiced" ||
                                m.status === "approved_by_client"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-slate-50 border-slate-200 text-slate-400"
                            )}
                          >
                            {m.status === "completed" ||
                            m.status === "invoiced" ||
                            m.status === "approved_by_client" ? (
                              <BadgeCheck className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{m.label}</p>
                            <p className="text-xs font-mono tabular-nums text-slate-500">
                              {currencySymbol}
                              {Number(m.amount || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {m.status === "pending" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs font-semibold text-slate-700"
                              onClick={() => toggleMilestoneStatus(m.id, "pending")}
                            >
                              Mark Finished
                            </Button>
                          )}
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[11px] font-semibold capitalize",
                              m.status === "invoiced"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            )}
                          >
                            {m.status.replace("_", " ")}
                          </Badge>
                          {m.status === "approved_by_client" && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleCreateMilestoneBill(m)}
                              className="h-8 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg gap-1"
                            >
                              <Receipt className="h-3.5 w-3.5" /> Create Bill
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </TabsContent>

            <TabsContent value="messages" className="m-0">
              <SectionCard
                title="Client Requests"
                description="Direct inquiries sent from the public project tracking page."
                bodyClassName="p-0"
              >
                {clientMessages.length === 0 ? (
                  <div className="p-6">
                    <EmptyStatePanel
                      icon={MessageCircle}
                      title="No client requests yet"
                      description="Messages posted by the client through the tracking link will appear here."
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                    {clientMessages.map((msg: any) => (
                      <div key={msg.id} className="p-5 space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-slate-600" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm text-slate-800 leading-relaxed">{msg.text}</p>
                            <p className="text-xs font-mono tabular-nums text-slate-400">
                              {new Date(msg.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {msg.replyText ? (
                          <div className="flex items-start gap-3 pl-10">
                            <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                              <Bot className="h-4 w-4" />
                            </div>
                            <div className="flex-1 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                              <p className="text-sm text-slate-800">{msg.replyText}</p>
                              <p className="text-xs font-mono tabular-nums text-slate-400 mt-1">
                                Replied {new Date(msg.repliedAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="pl-10">
                            {activeReplyId === msg.id ? (
                              <div className="space-y-2.5">
                                <Textarea
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Type official response..."
                                  className="min-h-[88px] rounded-xl border-slate-200 bg-white p-3 text-sm"
                                />
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setActiveReplyId(null)}
                                    className="h-8 text-xs"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleSendReply(msg.id)}
                                    className="h-8 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                                  >
                                    Dispatch Reply
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg text-xs font-semibold gap-1.5"
                                onClick={() => setActiveReplyId(msg.id)}
                              >
                                <Reply className="h-3.5 w-3.5" /> Reply to Client
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </TabsContent>

            <TabsContent value="sharing" className="m-0">
              <SectionCard
                title="Client Portal Control"
                description="Enable a read-only external progress link for this project."
              >
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Public Tracking Link</p>
                      <p className="text-xs text-slate-500">
                        Allow the client to view task completion and milestones without login
                      </p>
                    </div>
                    <Switch
                      aria-label="Enable public tracking portal"
                      checked={!!project.sharePublic}
                      onCheckedChange={(v) => handleUpdateField("sharePublic", v)}
                    />
                  </div>
                  {project.sharePublic && (
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-700 truncate">
                        {`${typeof window !== "undefined" ? window.location.origin : ""}/projects/track/${businessId}/${projectId}`}
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/projects/track/${businessId}/${projectId}`;
                          navigator.clipboard.writeText(url);
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                          toast({ title: "Copied" });
                        }}
                        className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl gap-2"
                      >
                        {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        Copy Tracking Link
                      </Button>
                    </div>
                  )}
                </div>
              </SectionCard>
            </TabsContent>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <SectionCard title="Client Details">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
                  {project.clientName?.charAt(0) || "C"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {project.clientName}
                  </p>
                  <p className="text-xs text-slate-600 font-medium capitalize mt-0.5">
                    {project.clientType || "Direct Client"}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Schedule & Scope">
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-medium text-slate-600 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-500" /> Deadline
                  </span>
                  <span className={cn(
                    "font-mono font-bold tabular-nums px-2 py-0.5 rounded",
                    project.deadline && new Date(project.deadline) < new Date() && project.status !== "completed"
                      ? "text-rose-700 bg-rose-50 border border-rose-200"
                      : "text-slate-900"
                  )}>
                    {project.deadline || "Open-ended"}
                  </span>
                </div>

                {project.description && (
                  <div className="space-y-1">
                    <p className="text-slate-500 font-medium">Scope Summary</p>
                    <p className="text-slate-800 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">
                      {project.description}
                    </p>
                  </div>
                )}

                <div className="space-y-1.5 pt-1">
                  <p className="text-slate-500 font-medium">Assigned Specialists</p>
                  <div className="space-y-1.5">
                    {(project.team || []).length === 0 ? (
                      <p className="text-slate-400 italic">No team assigned yet.</p>
                    ) : (
                      (project.team || []).map((uid: string) => {
                        const member = businessUsers.find((u: any) => u.id === uid);
                        return (
                          <div key={uid} className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="h-6 w-6 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                              {(member?.name || "M").charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-800 truncate flex-1">
                              {member?.name || uid}
                            </span>
                            <span className="text-[10px] text-slate-500 capitalize">
                              {member?.role || "Staff"}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700">Project Progress</span>
                <span className="font-mono tabular-nums font-bold text-slate-900">{taskStats.progress}%</span>
              </div>
              <Progress value={taskStats.progress} className="h-2.5 bg-slate-100" />
              <p className="text-xs font-mono font-medium tabular-nums text-slate-600 pt-0.5">
                {taskStats.completed} / {taskStats.total} deliverables finalized
              </p>
            </div>
          </div>
        </div>
      </Tabs>

      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden text-left shadow-lg">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5" /> Add Project Task
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Task Title *</Label>
              <Input
                placeholder="e.g. Design Wireframes, Procure Hardware..."
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                className="h-10 rounded-xl border-slate-300 bg-white text-sm shadow-xs focus-visible:ring-1 focus-visible:ring-slate-900 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Assignee</Label>
                <Select value={quickTaskAssignee} onValueChange={setQuickTaskAssignee}>
                  <SelectTrigger className="h-10 rounded-xl bg-white border-slate-300 text-xs shadow-xs font-medium">
                    <SelectValue placeholder="Select Member" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
                    {businessUsers.map((u: any) => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Priority</Label>
                <Select value={quickTaskPriority} onValueChange={setQuickTaskPriority}>
                  <SelectTrigger className="h-10 rounded-xl bg-white border-slate-300 text-xs shadow-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="low" className="text-xs">Low / Routine</SelectItem>
                    <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                    <SelectItem value="high" className="text-xs font-semibold text-amber-800">High Focus</SelectItem>
                    <SelectItem value="urgent" className="text-xs font-bold text-rose-700">Urgent (24h)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Target Date</Label>
                <Input
                  type="date"
                  value={quickTaskDueDate}
                  onChange={(e) => setQuickTaskDueDate(e.target.value)}
                  className="h-10 rounded-xl border-slate-300 bg-white font-mono text-xs shadow-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Section / Phase</Label>
                <Input
                  placeholder="e.g. Planning, Execution"
                  value={quickTaskSection}
                  onChange={(e) => setQuickTaskSection(e.target.value)}
                  className="h-10 rounded-xl border-slate-300 bg-white text-xs shadow-xs font-medium"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddTaskOpen(false)}
              className="h-9 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleQuickAddTask}
              disabled={!quickTaskTitle.trim()}
              className="h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4"
            >
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden text-left">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <DialogTitle className="text-lg font-bold text-white">Record Expense</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Particulars</Label>
              <Input
                value={expenseParticulars}
                onChange={(e) => setExpenseParticulars(e.target.value)}
                placeholder="e.g. Travel, Cement, Server hosting..."
                className="h-10 rounded-xl border-slate-300 bg-white text-sm shadow-xs font-medium"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Amount (₹)</Label>
                <Input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0"
                  className="h-10 rounded-xl border-slate-300 bg-white font-mono text-sm shadow-xs font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Category</Label>
                <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-300 bg-white text-xs font-medium shadow-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Expense">General</SelectItem>
                    <SelectItem value="Purchase">Material</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddExpenseOpen(false)}
              className="h-10 px-4 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRecordExpense}
              disabled={!expenseAmount}
              className="h-10 px-5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs"
            >
              Commit Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddMilestoneOpen} onOpenChange={setIsAddMilestoneOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden text-left shadow-lg">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <DialogTitle className="text-lg font-bold text-white">
              Define Payment Stage
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Milestone Label</Label>
              <Input
                value={milestoneLabel}
                onChange={(e) => setMilestoneLabel(e.target.value)}
                placeholder="e.g. 50% Advance, Site Handover..."
                className="h-10 rounded-xl border-slate-300 bg-white text-sm shadow-xs font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Amount (₹)</Label>
              <Input
                type="number"
                value={milestoneAmount}
                onChange={(e) => setMilestoneAmount(e.target.value)}
                placeholder="0"
                className="h-10 rounded-xl border-slate-300 bg-white font-mono text-sm shadow-xs font-bold"
              />
            </div>
          </div>
          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddMilestoneOpen(false)}
              className="h-10 px-4 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddMilestone}
              disabled={!milestoneLabel || !milestoneAmount}
              className="h-10 px-5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl"
            >
              Save Milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden text-left w-[95vw]">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <DialogTitle className="text-lg font-bold text-white">
              Suggested Project Tasks
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
            {aiSuggestions.map((task) => (
              <div
                key={task.tempId}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3"
              >
                <Checkbox
                  checked={selectedAiTaskIds.includes(task.tempId)}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedAiTaskIds([...selectedAiTaskIds, task.tempId]);
                    else
                      setSelectedAiTaskIds(
                        selectedAiTaskIds.filter((id) => id !== task.tempId)
                      );
                  }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{task.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                    {task.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200 flex flex-row gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-10 rounded-xl font-semibold text-xs"
              onClick={() => setIsAiModalOpen(false)}
            >
              Discard
            </Button>
            <Button
              type="button"
              onClick={saveSelectedAiTasks}
              className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl"
            >
              Add {selectedAiTaskIds.length} Tasks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
