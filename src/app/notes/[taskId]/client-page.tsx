"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  SmartphoneNfc,
  Loader2,
  Sparkles,
  Bot,
  History,
  Plus,
  X,
  AlertCircle,
  ShieldAlert,
  Play,
  Square,
  Briefcase,
  BrainCircuit,
  Trash2,
  Target,
  Calendar,
  Activity,
  Zap,
  Stethoscope,
  Eye,
  AlertTriangle,
  Ban,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  addDocumentNonBlocking,
  useCollection,
} from "@/firebase";
import { doc, serverTimestamp, collection, query, where } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { suggestTaskSteps } from "@/ai/flows/suggest-task-steps";
import { format } from "date-fns";
import { PageHeader, SectionCard } from "@/components/ui/editorial";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: "To Do", color: "text-slate-600", bg: "bg-slate-100", icon: Clock },
  "in-progress": { label: "Working", color: "text-sky-700", bg: "bg-sky-50", icon: Activity },
  "on-hold": { label: "On Hold", color: "text-amber-700", bg: "bg-amber-50", icon: Ban },
  testing: { label: "QA Testing", color: "text-purple-700", bg: "bg-purple-50", icon: Stethoscope },
  review: { label: "Revision", color: "text-pink-700", bg: "bg-pink-50", icon: Eye },
  completed: {
    label: "Completed",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    icon: CheckCircle2,
  },
  cancelled: { label: "Cancelled", color: "text-rose-700", bg: "bg-rose-50", icon: X },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  low: { label: "Routine", color: "text-slate-600", bg: "bg-slate-100", icon: Circle },
  medium: { label: "Normal", color: "text-sky-700", bg: "bg-sky-50", icon: Target },
  high: { label: "High Focus", color: "text-amber-700", bg: "bg-amber-50", icon: Zap },
  urgent: { label: "Urgent (24h)", color: "text-rose-700", bg: "bg-rose-50", icon: AlertTriangle },
  emergency: {
    label: "Emergency",
    color: "text-rose-900",
    bg: "bg-rose-100",
    icon: ShieldAlert,
  },
};

export default function TaskDetailPage(props: { params: { taskId: string } }) {
  const { taskId } = props.params;
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const taskRef = useMemoFirebase(
    () =>
      businessId && taskId
        ? doc(firestore, "businesses", businessId, "tasks", taskId)
        : null,
    [firestore, businessId, taskId]
  );
  const { data: task, isLoading: isTaskLoading } = useDoc<any>(taskRef);

  const teamQuery = useMemoFirebase(
    () => (businessId ? query(collection(firestore, "users"), where("businessId", "==", businessId)) : null),
    [firestore, businessId]
  );
  const { data: businessUsers = [] } = useCollection<any>(teamQuery);

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const projectsQuery = useMemoFirebase(
    () => (businessId ? query(collection(firestore, "businesses", businessId, "projects"), orderBy("createdAt", "desc")) : null),
    [firestore, businessId]
  );
  const { data: projects = [] } = useCollection<any>(projectsQuery);

  const [newStepText, setNewStepText] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<any>(null);

  const [localProjectDesc, setLocalProjectDesc] = useState("");

  useEffect(() => {
    if (task?.description !== undefined) {
      setLocalProjectDesc(task.description);
    }
  }, [task?.description]);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  const handleUpdateField = (key: string, value: any) => {
    if (!taskRef) return;
    updateDocumentNonBlocking(taskRef, { [key]: value, lastUpdate: serverTimestamp() });

    if (key === "status" && value === "completed" && business?.ownerId) {
      addDocumentNonBlocking(collection(firestore, "businesses", businessId!, "notifications"), {
        businessId: businessId!,
        recipientId: business.ownerId,
        title: "Task Completed",
        message: `${userProfile?.name || "A specialist"} finalized: ${task.title}`,
        type: "task",
        taskId,
        isRead: false,
        createdAt: serverTimestamp(),
      });
    }
  };

  const handleUpdateAssignee = (userId: string) => {
    const staff = businessUsers.find((u: any) => u.id === userId);
    handleUpdateField("assignedTo", userId);
    handleUpdateField("assignedName", staff?.name || "Unassigned");

    if (userId) {
      addDocumentNonBlocking(collection(firestore, "businesses", businessId!, "notifications"), {
        businessId: businessId!,
        recipientId: userId,
        title: "New Task Assignment",
        message: `You are now responsible for: ${task.title}`,
        type: "task",
        taskId,
        isRead: false,
        createdAt: serverTimestamp(),
      });
    }

    toast({
      title: "Assignee Updated",
      description: `Task assigned to ${staff?.name || "Unassigned"}.`,
    });
  };

  const handleAddStep = () => {
    if (!newStepText.trim()) return;
    const newStep = {
      id: Math.random().toString(36).substr(2, 9),
      text: newStepText,
      isCompleted: false,
    };
    const updatedSubtasks = [...(task.subtasks || []), newStep];
    handleUpdateField("subtasks", updatedSubtasks);
    setNewStepText("");
  };

  const handleToggleStep = (sid: string) => {
    const updatedSubtasks = task.subtasks.map((s: any) =>
      s.id === sid ? { ...s, isCompleted: !s.isCompleted } : s
    );
    handleUpdateField("subtasks", updatedSubtasks);
  };

  const handleRemoveStep = (sid: string) => {
    const updatedSubtasks = task.subtasks.filter((s: any) => s.id !== sid);
    handleUpdateField("subtasks", updatedSubtasks);
  };

  const handleAiSuggest = async () => {
    setIsAiLoading(true);
    try {
      const result = await suggestTaskSteps({
        taskTitle: task.title,
        businessType: "General Business",
      });
      const newSteps = result.steps.map((s) => ({
        id: Math.random().toString(36).substr(2, 9),
        text: s.text,
        isCompleted: false,
      }));
      handleUpdateField("subtasks", [...(task.subtasks || []), ...newSteps]);
      toast({ title: "Checklist Steps Generated" });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "AI Error" });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleToggleTimer = () => {
    if (!timerRunning) {
      setTimerRunning(true);
      toast({ title: "Execution Timer Started" });
    } else {
      setTimerRunning(false);
      const minutesSpent = Math.max(1, Math.round(seconds / 60));
      const totalTime = (task.timeSpent || 0) + minutesSpent;

      const newLog = {
        action: `Recorded ${minutesSpent}m execution`,
        by: userProfile?.name || "User",
        time: new Date().toISOString(),
      };

      handleUpdateField("timeSpent", totalTime);
      handleUpdateField("logs", [...(task.logs || []), newLog]);
      setSeconds(0);
      toast({ title: "Activity Synced", description: `Logged ${minutesSpent}m of work.` });
    }
  };

  const assignedStaff = useMemo(
    () => businessUsers.find((u: any) => u.id === task?.assignedTo),
    [businessUsers, task?.assignedTo]
  );

  const whatsAppPingHref = useMemo(() => {
    if (!assignedStaff?.phone || !task) return null;
    const currentUrl = typeof window !== "undefined" ? window.location.href : "";
    const message = `Task Ping: ${task.title}\nAssignee: ${assignedStaff.name}\nDue: ${task.dueDate || "Soon"}\nStatus: ${(task.status || "pending").toUpperCase()}\n\nDetails: ${currentUrl}`;
    return `https://wa.me/${assignedStaff.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
  }, [assignedStaff, task]);

  const handleDelete = () => {
    if (!taskRef) return;
    deleteDocumentNonBlocking(taskRef);
    toast({ title: "Task Removed", variant: "destructive" });
    router.push("/notes");
  };

  if (isProfileLoading || isTaskLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-700 h-8 w-8" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <ShieldAlert className="h-10 w-10 text-rose-600" />
        <h1 className="text-xl font-bold text-slate-900">Task Not Found</h1>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/notes">Back to Task Manager</Link>
        </Button>
      </div>
    );
  }

  const subtaskProgress = Math.round(
    ((task.subtasks?.filter((s: any) => s.isCompleted).length || 0) /
      (task.subtasks?.length || 1)) *
      100
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-28 md:pb-16 text-left">
      <PageHeader
        breadcrumb={`Task Manager · #${taskId.slice(-8).toUpperCase()}`}
        title={task.title}
        description={
          task.projectId ? (
            <Link
              href={`/projects/${task.projectId}`}
              className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900 underline decoration-slate-300 font-medium"
            >
              <Briefcase className="h-3.5 w-3.5 text-slate-500 shrink-0" /> Project: {task.projectName || "View Project"}
            </Link>
          ) : (
            "Standalone Business Task"
          )
        }
        backHref="/notes"
        backLabel="Back to Task Manager"
        actions={
          <>
            {task.projectId && (
              <Button
                asChild
                variant="outline"
                className="h-10 px-4 rounded-xl bg-white border-slate-200 text-slate-800 hover:bg-slate-50 font-semibold text-xs gap-1.5"
              >
                <Link href={`/projects/${task.projectId}`}>
                  <Briefcase className="h-4 w-4 text-slate-500 shrink-0" /> View Project
                </Link>
              </Button>
            )}
            {whatsAppPingHref ? (
              <Button
                asChild
                variant="outline"
                className="h-10 px-4 rounded-xl bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-semibold text-xs gap-2"
              >
                <a href={whatsAppPingHref} target="_blank" rel="noopener noreferrer">
                  <SmartphoneNfc className="h-4 w-4" /> WhatsApp Ping
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => toast({ variant: "destructive", title: "No Phone Found" })}
                className="h-10 px-4 rounded-xl bg-white border-slate-200 text-slate-600 font-semibold text-xs gap-2"
              >
                <SmartphoneNfc className="h-4 w-4" /> WhatsApp Ping
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleToggleTimer}
              className={cn(
                "h-10 px-4 rounded-xl font-semibold text-xs gap-2",
                timerRunning
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-white text-slate-900 border-slate-200"
              )}
            >
              {timerRunning ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-current" /> Stop Timer
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" /> Start Timer
                </>
              )}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-8 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-300">Completion Progress</p>
                <p className="text-3xl font-bold font-mono tabular-nums mt-0.5">
                  {subtaskProgress}%
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-slate-300">Time Logged</p>
                <p className="text-xl font-bold font-mono tabular-nums mt-0.5">
                  {Math.floor((task.timeSpent || 0) / 60)}h {(task.timeSpent || 0) % 60}m
                </p>
                {timerRunning && (
                  <Badge className="mt-1.5 bg-rose-600 text-white border-none text-[11px]">
                    Timer Running
                  </Badge>
                )}
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 border-b border-slate-200 bg-slate-50/70">
                <TabsList className="bg-transparent h-12 p-0 gap-6 border-none overflow-x-auto scrollbar-hide flex">
                  <TabsTrigger
                    value="overview"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 rounded-none h-12 text-xs font-semibold px-0 whitespace-nowrap"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="checklist"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 rounded-none h-12 text-xs font-semibold px-0 whitespace-nowrap"
                  >
                    Steps ({task.subtasks?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger
                    value="insights"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 rounded-none h-12 text-xs font-semibold px-0 whitespace-nowrap gap-1.5"
                  >
                    <BrainCircuit className="h-3.5 w-3.5" /> Workload Notes
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6 text-left min-h-[360px]">
                <TabsContent value="overview" className="m-0 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Assigned Specialist
                      </Label>
                      <Select value={task.assignedTo || ""} onValueChange={handleUpdateAssignee}>
                        <SelectTrigger className="h-10 rounded-xl border-slate-300 bg-white text-sm font-semibold shadow-xs">
                          <SelectValue placeholder="Pick a specialist" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {businessUsers.map((s: any) => (
                            <SelectItem key={s.id} value={s.id} className="text-sm font-medium">
                              {s.name} ({s.role || "Staff"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Task Status</Label>
                      <Select
                        value={task.status}
                        onValueChange={(v: any) => handleUpdateField("status", v)}
                      >
                        <SelectTrigger
                          className={cn(
                            "h-10 rounded-xl border text-sm font-bold shadow-xs",
                            STATUS_CONFIG[task.status]?.bg,
                            STATUS_CONFIG[task.status]?.color,
                            task.status === "completed" ? "border-emerald-300" : "border-slate-300"
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {Object.keys(STATUS_CONFIG).map((key) => {
                            const cfg = STATUS_CONFIG[key];
                            const Icon = cfg.icon;
                            return (
                              <SelectItem key={key} value={key} className="py-2">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={cn(
                                      "h-6 w-6 rounded-md flex items-center justify-center",
                                      cfg.bg
                                    )}
                                  >
                                    <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                                  </div>
                                  <span className={cn("text-xs font-bold", cfg.color)}>
                                    {cfg.label}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Urgency Priority
                      </Label>
                      <Select
                        value={task.priority}
                        onValueChange={(v: any) => handleUpdateField("priority", v)}
                      >
                        <SelectTrigger
                          className={cn(
                            "h-10 rounded-xl border text-sm font-bold shadow-xs",
                            PRIORITY_CONFIG[task.priority]?.bg,
                            PRIORITY_CONFIG[task.priority]?.color,
                            task.priority === "urgent" || task.priority === "emergency" ? "border-rose-300" : "border-slate-300"
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {Object.keys(PRIORITY_CONFIG).map((key) => {
                            const cfg = PRIORITY_CONFIG[key];
                            const Icon = cfg.icon;
                            return (
                              <SelectItem key={key} value={key} className="py-2">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={cn(
                                      "h-6 w-6 rounded-md flex items-center justify-center",
                                      cfg.bg
                                    )}
                                  >
                                    <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                                  </div>
                                  <span className={cn("text-xs font-bold", cfg.color)}>
                                    {cfg.label}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700">
                          Linked Project
                        </Label>
                        {task.projectId && (
                          <Link
                            href={`/projects/${task.projectId}`}
                            className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                          >
                            Open Project <Briefcase className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                      <Select
                        value={task.projectId || "none"}
                        onValueChange={(val) => {
                          if (val === "none") {
                            handleUpdateField("projectId", null);
                            handleUpdateField("projectName", null);
                            toast({ title: "Unlinked from project", description: "Task is now standalone." });
                          } else {
                            const selectedProj = projects.find((p: any) => p.id === val);
                            handleUpdateField("projectId", val);
                            handleUpdateField("projectName", selectedProj?.title || "Project");
                            toast({ title: "Project Linked", description: `Linked to ${selectedProj?.title}.` });
                          }
                        }}
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-white border-slate-300 text-xs shadow-xs font-semibold">
                          <Briefcase className="mr-2 h-3.5 w-3.5 text-slate-600 shrink-0" />
                          <SelectValue placeholder="Standalone Task (No Project)" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="none" className="text-xs font-medium text-slate-500">
                            Standalone Task (No Project)
                          </SelectItem>
                          {projects.map((p: any) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs font-medium">
                              Project: {p.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-slate-500" /> Schedule Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-500">Target Deadline</p>
                          <p className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                            {task.dueDate || "ASAP"}
                          </p>
                        </div>
                        <Calendar className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-500">Created On</p>
                          <p className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                            {task.createdAt?.toDate
                              ? format(task.createdAt.toDate(), "dd MMM yy")
                              : "Recently"}
                          </p>
                        </div>
                        <Clock className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-500">Last Sync</p>
                          <p className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                            {task.lastUpdate?.toDate
                              ? format(task.lastUpdate.toDate(), "HH:mm")
                              : "--:--"}
                          </p>
                        </div>
                        <Zap className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Instructions & Description
                    </Label>
                    <Textarea
                      value={localProjectDesc}
                      onChange={(e) => setLocalProjectDesc(e.target.value)}
                      onBlur={(e) => handleUpdateField("description", e.target.value)}
                      className="min-h-[110px] rounded-xl border-slate-300 bg-white p-3.5 text-sm leading-relaxed shadow-xs focus-visible:ring-1 focus-visible:ring-slate-900 font-medium"
                      placeholder="Special instructions or execution notes..."
                    />
                  </div>
                </TabsContent>

                <TabsContent value="checklist" className="m-0 space-y-5">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Checklist Progress</p>
                      <h3 className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                        {task.subtasks?.filter((s: any) => s.isCompleted).length || 0} /{" "}
                        {task.subtasks?.length || 0} Completed
                      </h3>
                    </div>
                    <Progress value={subtaskProgress} className="h-2 w-full sm:w-44" />
                  </div>

                  <div className="space-y-2.5">
                    {task.subtasks?.map((st: any) => (
                      <div
                        key={st.id}
                        className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors group"
                      >
                        <button
                          type="button"
                          aria-label={st.isCompleted ? "Mark step incomplete" : "Mark step complete"}
                          className={cn(
                            "h-7 w-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors shadow-2xs",
                            st.isCompleted
                              ? "bg-slate-900 border-slate-900 text-white"
                              : "bg-white border-slate-300"
                          )}
                          onClick={() => handleToggleStep(st.id)}
                        >
                          {st.isCompleted && <CheckCircle2 className="h-4 w-4" />}
                        </button>
                        <Input
                          value={st.text}
                          onChange={(e) => {
                            const updated = task.subtasks.map((s: any) =>
                              s.id === st.id ? { ...s, text: e.target.value } : s
                            );
                            handleUpdateField("subtasks", updated);
                          }}
                          className={cn(
                            "h-9 text-sm border-none bg-transparent p-0 focus-visible:ring-0 font-semibold flex-1",
                            st.isCompleted ? "line-through text-slate-400 font-normal" : "text-slate-900"
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove step"
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => handleRemoveStep(st.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <div className="flex gap-2.5 pt-4 border-t border-slate-200">
                      <Input
                        placeholder="Add a new checklist step..."
                        value={newStepText}
                        onChange={(e) => setNewStepText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddStep()}
                        className="h-10 rounded-xl border-slate-300 bg-white text-sm shadow-xs font-medium focus-visible:ring-1 focus-visible:ring-slate-900"
                      />
                      <Button
                        type="button"
                        size="icon"
                        aria-label="Add checklist step"
                        onClick={handleAddStep}
                        className="h-10 w-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shrink-0 shadow-xs"
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={isAiLoading}
                      onClick={handleAiSuggest}
                      className="w-full h-10 rounded-xl border-dashed border-slate-300 text-slate-700 font-semibold text-xs gap-2"
                    >
                      {isAiLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-amber-500" />
                      )}
                      Generate Suggested Checklist Steps
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="insights" className="m-0">
                  <div className="rounded-2xl bg-slate-900 text-white p-6 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white">Workload Guidance</h4>
                        <p className="text-xs text-slate-300">
                          Task throughput & checklist pacing
                        </p>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-200">
                      Break this deliverable into smaller verified steps and keep the time
                      tracker active during execution to maintain accurate delivery logs.
                    </p>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        <div className="md:col-span-4 space-y-6">
          <SectionCard title="Activity Log">
            <ScrollArea className="h-72 pr-3">
              <div className="space-y-5 relative pl-5 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                {(task.logs || []).length === 0 ? (
                  <p className="text-xs text-slate-400">No activity logged yet.</p>
                ) : (
                  [...(task.logs || [])].reverse().map((log: any, i: number) => (
                    <div key={i} className="relative flex flex-col gap-1">
                      <div className="absolute -left-[18px] top-1 h-2.5 w-2.5 rounded-full bg-white border-2 border-slate-900 z-10" />
                      <p className="text-xs font-semibold text-slate-900">{log.action}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                        <span>{log.by}</span>
                        <span>·</span>
                        <span>
                          {new Date(log.time).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </SectionCard>

          <Button
            type="button"
            onClick={handleDelete}
            variant="outline"
            className="w-full h-10 text-rose-600 border-rose-200 bg-white hover:bg-rose-50 font-semibold text-xs rounded-xl gap-2"
          >
            <Trash2 className="h-4 w-4" /> Delete Task
          </Button>
        </div>
      </div>

      <div className="fixed bottom-4 left-0 right-0 px-4 md:hidden z-40">
        <Button
          type="button"
          onClick={() => {
            handleUpdateField("status", "completed");
            toast({ title: "Task Finalized" });
          }}
          className="w-full h-12 bg-slate-900 text-white font-semibold text-sm rounded-xl gap-2"
        >
          <CheckCircle2 className="h-5 w-5" /> Mark Task Complete
        </Button>
      </div>
    </div>
  );
}
