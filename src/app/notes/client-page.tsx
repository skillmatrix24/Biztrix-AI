
"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Zap, 
  ListTodo, 
  Loader2, 
  Users, 
  Timer, 
  CheckCircle2, 
  BrainCircuit, 
  Sparkles, 
  PlusCircle, 
  X, 
  Target, 
  AlertCircle, 
  History, 
  Trophy, 
  LayoutList, 
  FolderKanban, 
  ChevronRight, 
  Edit2, 
  SmartphoneNfc, 
  Clock, 
  Repeat,
  Briefcase,
  Columns,
  Layout,
  LineChart,
  Activity,
  Bot,
  Send,
  User,
  ArrowRight,
  ArrowUpRight,
  TrendingUp,
  Target as TargetIcon
} from "lucide-react";
import { PageHeader, KpiStatCard, SectionCard, EmptyStatePanel } from "@/components/ui/editorial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useUser, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking, 
  useDoc 
} from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp, where, Timestamp } from "firebase/firestore";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  Cell,
  PieChart,
  Pie
} from "recharts";
import { format } from "date-fns";
import { advisorChat } from "@/ai/flows/advisor-chat-flow";
import { useRouter, useSearchParams } from "next/navigation";

const STATUS_COLUMNS: { id: 'pending' | 'in-progress' | 'completed'; label: string; color: string; bg: string }[] = [
  { id: 'pending', label: 'To Do', color: 'text-slate-400', bg: 'bg-slate-50/50' },
  { id: 'in-progress', label: 'Working', color: 'text-blue-500', bg: 'bg-slate-50/50' },
  { id: 'completed', label: 'Done', color: 'text-green-500', bg: 'bg-slate-50/50' },
];

export default function TaskManagerPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const tasksQuery = useMemoFirebase(() => {
    if (!businessId || !user?.uid || user.isAnonymous) return null;
    return query(collection(firestore, 'businesses', businessId, 'tasks'), orderBy('createdAt', 'desc'));
  }, [firestore, businessId, user?.uid, user?.isAnonymous]);
  const { data: taskListData, isLoading: isTasksLoading } = useCollection<any>(tasksQuery);
  const taskList = taskListData || [];

  const staffQuery = useMemoFirebase(() => {
    if (!businessId || !user?.uid || user.isAnonymous) return null;
    return query(collection(firestore, 'users'), where('businessId', '==', businessId));
  }, [firestore, businessId, user?.uid, user?.isAnonymous]);
  const { data: businessUsersData } = useCollection<any>(staffQuery);
  const businessUsers = businessUsersData || [];

  const projectsQuery = useMemoFirebase(() => {
    if (!businessId || !user?.uid || user.isAnonymous) return null;
    return query(collection(firestore, 'businesses', businessId, 'projects'), orderBy('createdAt', 'desc'));
  }, [firestore, businessId, user?.uid, user?.isAnonymous]);
  const { data: projectsData } = useCollection<any>(projectsQuery);
  const projects = projectsData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("all");
  const [activeView, setActiveView] = useState("board");
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>("medium");
  const [newAssignee, setNewAssignee] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newProjectId, setNewProjectId] = useState("");
  const [draftSubtasks, setDraftSubtasks] = useState<{id: string, text: string, isCompleted: boolean}[]>([]);
  
  // URL query parameter synchronization
  useEffect(() => {
    const pId = searchParams.get("projectId");
    if (pId) {
      setSelectedProjectFilter(pId);
      setNewProjectId(pId);
    }
    if (searchParams.get("openAdd") === "true") {
      setIsAddOpen(true);
    }
  }, [searchParams]);

  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [aiHistory, setAiHistory] = useState<{
    role: 'user' | 'ai';
    content: string;
    actions?: Array<{ label: string; route?: string; type?: string; payload?: any }>;
  }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    const total = taskList?.length || 0;
    const completed = taskList?.filter(t => t.status === 'completed').length || 0;
    const working = taskList?.filter(t => t.status === 'in-progress').length || 0;
    const highPriority = taskList?.filter(t => t.priority === 'high' || t.priority === 'urgent').length || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const statusDist = [
      { name: 'To Do', value: taskList?.filter(t => t.status === 'pending').length || 0 },
      { name: 'Working', value: working },
      { name: 'Completed', value: completed }
    ];

    return { total, completed, working, highPriority, completionRate, statusDist };
  }, [taskList]);

  const globalActivity = useMemo(() => {
    const allLogs: any[] = [];
    taskList.forEach(task => {
      if (task.logs) {
        task.logs.forEach((log: any) => {
          allLogs.push({ ...log, taskTitle: task.title, taskId: task.id });
        });
      }
    });
    return allLogs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 20);
  }, [taskList]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const handleAddTask = () => {
    if (!newTitle || !businessId) return;
    const staff = businessUsers.find(s => s.id === newAssignee);
    const linkedProject = projects.find(p => p.id === newProjectId);
    
    const taskData = {
      title: newTitle,
      description: newDesc,
      assignedTo: newAssignee,
      assignedName: staff?.name || 'Unassigned',
      dueDate: newDate,
      priority: newPriority,
      status: 'pending',
      category: newCategory,
      projectId: newProjectId || null,
      projectName: linkedProject?.title || null,
      subtasks: draftSubtasks,
      timeSpent: 0,
      logs: [{ action: 'Task initialized', by: userProfile?.name || 'Admin', time: new Date().toISOString() }],
      createdAt: serverTimestamp(),
      businessId
    };

    addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'tasks'), taskData).then((docRef) => {
      if (newAssignee && docRef) {
        addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'notifications'), {
          businessId,
          recipientId: newAssignee,
          title: "New Task Assigned",
          message: `You are assigned to: ${newTitle}`,
          type: 'task',
          taskId: docRef.id,
          isRead: false,
          createdAt: serverTimestamp()
        });
      }
    });

    setIsAddOpen(false);
    resetForm();
    toast({ title: "Task Created" });
  };

  const resetForm = () => {
    setNewTitle(""); setNewDesc(""); setNewPriority("medium"); 
    setNewAssignee(""); setDraftSubtasks([]); setNewProjectId("");
  };

  const handleSendMessage = async (overrideMessage?: string) => {
    const input = (overrideMessage !== undefined ? overrideMessage : chatInput).trim();
    if (!input || !businessId) return;
    setChatInput("");
    setAiHistory(prev => [...prev, { role: 'user', content: input }]);
    setIsTyping(true);

    try {
      const response = await advisorChat({
        message: input,
        context: {
          tasks: taskList.map(t => ({ title: t.title, status: t.status, priority: t.priority, assignedName: t.assignedName })),
          projects: projects.map(p => ({ title: p.title, status: p.status, clientName: p.clientName })),
          businessName: business?.name || "Our Store"
        },
        history: aiHistory.slice(-5).map(m => ({ role: m.role, content: m.content }))
      });
      setAiHistory(prev => [...prev, { 
        role: 'ai', 
        content: response.content,
        actions: response.actions || []
      }]);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Assistant Offline" });
    } finally {
      setIsTyping(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  const filteredTaskList = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    return taskList.filter((t) => {
      const matchesSearch =
        !cleanSearch ||
        t.title?.toLowerCase().includes(cleanSearch) ||
        t.assignedName?.toLowerCase().includes(cleanSearch) ||
        t.projectName?.toLowerCase().includes(cleanSearch) ||
        t.category?.toLowerCase().includes(cleanSearch);

      const matchesProject =
        selectedProjectFilter === "all" ||
        (selectedProjectFilter === "standalone" && !t.projectId) ||
        t.projectId === selectedProjectFilter;

      return matchesSearch && matchesProject;
    });
  }, [taskList, searchTerm, selectedProjectFilter]);

  if (isProfileLoading || isTasksLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <>
      <div className="space-y-6 pb-20 text-left">
        <PageHeader
          breadcrumb="Back Office / Tasks"
          title="Task Manager"
          description="Assign team tasks, monitor sprint progress, and resolve bottlenecks."
          icon={ListTodo}
          actions={
            <Button onClick={() => setIsAddOpen(true)} className="bg-slate-900 hover:bg-slate-800 h-10 px-5 font-semibold text-xs rounded-xl text-white">
              <Plus className="mr-2 h-4 w-4" /> New Task
            </Button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiStatCard
            label="Completion Rate"
            value={`${stats.completionRate}%`}
            subtext={`${stats.completed} of ${stats.total} tasks completed`}
            icon={TargetIcon}
          />
          <KpiStatCard
            label="In Progress"
            value={`${stats.working} Tasks`}
            subtext="Active team workload"
            icon={Timer}
            tone="warning"
          />
          <KpiStatCard
            label="High Priority"
            value={`${stats.highPriority} Urgent`}
            subtext="Needs immediate focus"
            icon={Zap}
            tone="danger"
          />
          <KpiStatCard
            label="AI Advisor Status"
            value="Ready"
            subtext="Ask AI for team workload help"
            icon={BrainCircuit}
            tone="dark"
          />
        </div>

        <Tabs value={activeView} onValueChange={setActiveView} className="w-full space-y-6">
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5 pb-1">
            <TabsList className="bg-slate-100/90 border border-slate-300 h-10 p-1 rounded-xl w-full xl:w-auto overflow-x-auto scrollbar-hide flex shadow-xs">
              <TabsTrigger value="board" className="h-8 flex-1 text-xs font-semibold px-4 rounded-lg gap-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-xs transition-all"><FolderKanban className="h-4 w-4" /> Board</TabsTrigger>
              <TabsTrigger value="list" className="h-8 flex-1 text-xs font-semibold px-4 rounded-lg gap-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-xs transition-all"><LayoutList className="h-4 w-4" /> Registry</TabsTrigger>
              <TabsTrigger value="analytics" className="h-8 flex-1 text-xs font-semibold px-4 rounded-lg gap-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-xs transition-all"><TrendingUp className="h-4 w-4" /> Analytics</TabsTrigger>
              <TabsTrigger value="activity" className="h-8 flex-1 text-xs font-semibold px-4 rounded-lg gap-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-xs transition-all"><History className="h-4 w-4" /> Activity</TabsTrigger>
              <TabsTrigger value="assistant" className="h-8 flex-1 text-xs font-semibold px-4 rounded-lg gap-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-xs transition-all"><Bot className="h-4 w-4" /> AI Assistant</TabsTrigger>
            </TabsList>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full xl:w-auto">
              <div className="w-full sm:w-60">
                <Select value={selectedProjectFilter} onValueChange={setSelectedProjectFilter}>
                  <SelectTrigger className="h-10 rounded-xl bg-white border border-slate-300 text-xs shadow-xs font-semibold hover:border-slate-400 focus:ring-1 focus:ring-slate-900">
                    <Briefcase className="mr-2 h-3.5 w-3.5 text-slate-600 shrink-0" />
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-slate-300 shadow-md">
                    <SelectItem value="all" className="text-xs font-medium">All Projects & Tasks</SelectItem>
                    <SelectItem value="standalone" className="text-xs font-semibold text-slate-700">Standalone Tasks (No Project)</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        Project: {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input placeholder="Search tasks, project, or member..." className="h-10 pl-9 rounded-xl bg-white border border-slate-300 text-xs w-full shadow-xs hover:border-slate-400 focus-visible:ring-1 focus-visible:ring-slate-900" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </div>

          <TabsContent value="board" className="m-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
              {STATUS_COLUMNS.map((col) => {
                const colTasks = filteredTaskList.filter((t) => t.status === col.id);
                return (
                  <div
                    key={col.id}
                    className="bg-slate-50/90 rounded-2xl border border-slate-300 p-4 space-y-3.5 shadow-xs min-h-[460px] flex flex-col"
                  >
                    <div className="flex items-center justify-between px-1 pb-2.5 border-b border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "h-3 w-3 rounded-full ring-2 ring-white",
                            col.id === "completed"
                              ? "bg-emerald-500"
                              : col.id === "in-progress"
                                ? "bg-blue-500"
                                : "bg-slate-400"
                          )}
                        />
                        <h3 className="text-xs font-bold text-slate-900 tracking-wider uppercase">
                          {col.label}
                        </h3>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-xs font-mono font-bold tabular-nums px-2.5 h-5 bg-white text-slate-800 border border-slate-300 shadow-2xs"
                      >
                        {colTasks.length}
                      </Badge>
                    </div>

                    <div className="space-y-3 flex-1">
                      {colTasks.length === 0 ? (
                        <div className="h-44 rounded-xl border-2 border-dashed border-slate-300 bg-white/70 flex flex-col items-center justify-center p-4 text-center">
                          <p className="text-xs font-bold text-slate-700">No {col.label} tasks</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {col.id === "pending"
                              ? "Click '+ New Task' above"
                              : `Tasks moved to ${col.label.toLowerCase()} will appear here`}
                          </p>
                        </div>
                      ) : (
                        colTasks.map((t) => (
                          <TaskItemCard
                            key={t.id}
                            task={t}
                            onClick={() => router.push(`/notes/${t.id}`)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="list" className="m-0">
            <SectionCard title="Task Registry" description="All team tasks ordered by creation date" bodyClassName="p-0">
              <div className="overflow-x-auto scrollbar-hide">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow className="bg-slate-100 border-b border-slate-200">
                      <TableHead className="pl-6 text-xs font-bold text-slate-800 h-11">Task Detail</TableHead>
                      <TableHead className="text-xs font-bold text-slate-800 h-11">Assignee</TableHead>
                      <TableHead className="text-xs font-bold text-slate-800 h-11 text-center">Status</TableHead>
                      <TableHead className="text-xs font-bold text-slate-800 h-11 text-center">Priority</TableHead>
                      <TableHead className="text-right pr-6 h-11 w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTaskList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="p-8">
                          <EmptyStatePanel icon={ListTodo} title="No tasks in registry" description="Adjust your search or create a new task." />
                        </TableCell>
                      </TableRow>
                    ) : filteredTaskList.map(t => (
                      <TableRow key={t.id} className="group hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100" onClick={() => router.push(`/notes/${t.id}`)}>
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-3.5">
                              <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">{t.title?.charAt(0)}</div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors truncate">{t.title}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-xs text-slate-600 font-mono font-medium tabular-nums">Due: {t.dueDate || 'ASAP'}</span>
                                  {t.projectName && (
                                    <Badge variant="outline" className="text-[11px] h-4 px-1.5 bg-slate-100 text-slate-800 border-slate-200 gap-1 font-semibold">
                                      <Briefcase className="h-2.5 w-2.5 text-slate-600 shrink-0" /> {t.projectName}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">{t.assignedName?.charAt(0)}</div>
                            <span className="text-xs font-semibold text-slate-800">{t.assignedName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn("text-xs font-semibold capitalize border px-2 py-0.5", t.status === 'completed' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : t.status === 'in-progress' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-700 border-slate-200")}>
                            {t.status === 'in-progress' ? 'Working' : t.status === 'pending' ? 'To Do' : 'Done'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn("text-xs font-bold capitalize border px-2 py-0.5", t.priority === 'high' || t.priority === 'urgent' ? "bg-rose-50 text-rose-700 border-rose-200" : t.priority === 'low' ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-sky-50 text-sky-800 border-sky-200")}>
                            {t.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-900 transition-colors inline-block" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="analytics" className="m-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SectionCard title="Task Status Breakdown" description="Distribution across To Do, Working, and Completed">
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={stats.statusDist} innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                            {stats.statusDist.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#94a3b8' : index === 1 ? '#0f172a' : '#10b981'} />)}
                          </Pie>
                          <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
                <SectionCard title="Team Workload" description="Assigned tasks per team member">
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={businessUsers.slice(0, 5).map(u => ({ name: u.name?.split(' ')[0], tasks: taskList.filter(t => t.assignedTo === u.id).length }))}>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} />
                          <YAxis hide />
                          <RechartsTooltip cursor={{fill: 'transparent'}} />
                          <Bar dataKey="tasks" fill="#0f172a" radius={[6, 6, 0, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="m-0">
            <SectionCard title="Global Activity Logs" description="Recent task updates and team actions" bodyClassName="p-0">
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {globalActivity.length === 0 ? (
                  <div className="p-8">
                    <EmptyStatePanel icon={History} title="No activity logged yet" description="Task updates will appear here chronologically." />
                  </div>
                ) : globalActivity.map((log, i) => (
                  <div key={i} className="p-5 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0"><History className="h-4 w-4" /></div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{log.action}</p>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">Task: {log.taskTitle} • By {log.by}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-slate-400 shrink-0 ml-4">{format(new Date(log.time), 'dd MMM, HH:mm')}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="assistant" className="m-0">
            <div className="max-w-4xl mx-auto space-y-6">
              <SectionCard
                title="Task Management Advisor"
                description="Ask about task delegation, bottlenecks, and team workload."
                bodyClassName="p-0"
              >
                <div className="flex flex-col h-[520px]">
                  <div className="bg-slate-900 py-3.5 px-6 flex items-center justify-between text-white shrink-0">
                    <div className="flex items-center gap-2.5">
                      <Bot className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-semibold">AI Sprint Assistant</span>
                    </div>
                    <Badge variant="outline" className="text-slate-300 border-white/20 text-xs">Live Context</Badge>
                  </div>
                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-4">
                      {aiHistory.length === 0 && (
                        <div className="py-12 text-center text-sm text-slate-500 px-8">
                          Namaste! Main aapka task advisor hoon. Aaj team ki productivity kaise badhayein?
                        </div>
                      )}
                      {aiHistory.map((msg, i) => (
                        <div key={i} className={cn("flex gap-3 max-w-[85%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border", msg.role === 'user' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200")}>
                            {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                          </div>
                          <div className={cn("space-y-2", msg.role === 'user' ? "text-right" : "text-left")}>
                            <div className={cn("p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap", msg.role === 'user' ? "bg-slate-900 text-white rounded-tr-none text-left" : "bg-slate-100 text-slate-800 rounded-tl-none")}>
                              {msg.content}
                            </div>
                            {msg.actions && msg.actions.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {msg.actions.map((act, actIdx) => {
                                  const targetRoute = act.route || act.payload?.route;
                                  if (targetRoute) {
                                    return (
                                      <Link
                                        key={actIdx}
                                        href={targetRoute}
                                        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
                                      >
                                        <span>{act.label}</span>
                                        <ArrowRight className="h-3 w-3 text-slate-500" />
                                      </Link>
                                    );
                                  }
                                  return (
                                    <span
                                      key={actIdx}
                                      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700"
                                    >
                                      {act.label}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {isTyping && (
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center"><Bot className="h-4 w-4 text-slate-700" /></div>
                          <div className="bg-slate-100 p-3.5 rounded-2xl flex items-center gap-1">
                            <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" />
                            <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce delay-100" />
                            <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce delay-200" />
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} className="h-2" />
                    </div>
                  </ScrollArea>

                  <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100 flex gap-2 overflow-x-auto scrollbar-hide shrink-0">
                    {[
                      "Urgent tasks kaunse hain?",
                      "Staff attendance aur roles kaise manage karein?",
                      "Billing POS ka SOP kya hai?",
                      "Thermal printer kaise setup karein?",
                    ].map((q, idx) => (
                      <Button
                        key={idx}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendMessage(q)}
                        className="h-7 text-[11px] font-medium whitespace-nowrap bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      >
                        {q}
                      </Button>
                    ))}
                  </div>

                  <div className="p-4 border-t border-slate-200 bg-white shrink-0">
                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative">
                      <Input placeholder="Team performance ya platform SOP puchiye..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} className="h-11 rounded-xl bg-white border-slate-200 pr-12 text-sm pl-4" />
                      <Button type="submit" size="icon" aria-label="Send message" disabled={!chatInput.trim() || isTyping} className="absolute right-1.5 top-1.5 h-8 w-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white">
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </div>
              </SectionCard>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden rounded-2xl border border-slate-200 w-[95vw]">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Create New Task</DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">Assign task details, priority, and due date</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] p-6 bg-white">
            <div className="space-y-4">
              <div className="space-y-1.5 text-left">
                <Label className="text-xs font-semibold text-slate-700">Task Title *</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Site Survey, Prepare CAD Drawings, Send Invoices..."
                  className="h-10 rounded-xl border-slate-300 bg-white shadow-xs text-sm font-medium focus-visible:ring-1 focus-visible:ring-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <Label className="text-xs font-semibold text-slate-700">Target Deadline</Label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="h-10 rounded-xl border-slate-300 bg-white shadow-xs font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <Label className="text-xs font-semibold text-slate-700">Urgency Priority</Label>
                  <Select value={newPriority} onValueChange={(v: any) => setNewPriority(v)}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-300 bg-white shadow-xs font-medium text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="low" className="text-xs">Routine</SelectItem>
                      <SelectItem value="medium" className="text-xs">Normal</SelectItem>
                      <SelectItem value="high" className="text-xs font-semibold text-amber-800">High Focus</SelectItem>
                      <SelectItem value="urgent" className="text-xs font-bold text-rose-700">Urgent (24h)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <Label className="text-xs font-semibold text-slate-700">Assign Specialist</Label>
                  <Select value={newAssignee} onValueChange={setNewAssignee}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-300 bg-white shadow-xs font-medium text-xs">
                      <SelectValue placeholder="Pick member" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {businessUsers.map((u: any) => (
                        <SelectItem key={u.id} value={u.id} className="text-xs">
                          {u.name} ({u.role || "Staff"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 text-left">
                  <Label className="text-xs font-semibold text-slate-700">Link Project</Label>
                  <Select value={newProjectId} onValueChange={setNewProjectId}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-300 bg-white shadow-xs font-medium text-xs">
                      <SelectValue placeholder="Standalone Task" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none" className="text-xs text-slate-500 font-medium">Standalone (No Project)</SelectItem>
                      {projects.map((p: any) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          Project: {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-xs font-semibold text-slate-700">Description / Execution Notes</Label>
                <Textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Scope, specifications, client requirements, or special notes..."
                  className="min-h-[96px] rounded-xl border-slate-300 bg-white shadow-xs text-sm"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200">
            <Button onClick={handleAddTask} className="w-full h-11 bg-slate-900 hover:bg-slate-800 font-semibold text-xs rounded-xl text-white">
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TaskItemCard({ task, onClick }: any) {
  const isHighPriority =
    task.priority === "high" || task.priority === "urgent" || task.priority === "emergency";

  const priorityStyles: Record<string, { label: string; bg: string; text: string; border: string }> = {
    urgent: { label: "Urgent", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
    emergency: { label: "Emergency", bg: "bg-rose-100", text: "text-rose-900", border: "border-rose-300" },
    high: { label: "High Focus", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
    medium: { label: "Normal", bg: "bg-sky-50", text: "text-sky-800", border: "border-sky-200" },
    low: { label: "Routine", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
  };

  const pStyle = priorityStyles[task.priority] || priorityStyles.medium;

  const isOverdue = Boolean(
    task.dueDate &&
    task.dueDate !== "ASAP" &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "completed"
  );

  const progress = useMemo(() => {
    if (!task.subtasks || task.subtasks.length === 0) return 0;
    return Math.round(
      (task.subtasks.filter((s: any) => s.isCompleted).length / task.subtasks.length) * 100
    );
  }, [task.subtasks]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border bg-white p-4 space-y-3.5 transition-all duration-200 shadow-xs hover:shadow-md group",
        isOverdue ? "border-rose-400 ring-1 ring-rose-300/70" : "border-slate-300 hover:border-slate-400"
      )}
    >
      <div className="flex justify-between items-start gap-2.5">
        <div className="space-y-1.5 flex-1 min-w-0">
          <h4 className="text-sm font-bold tracking-tight text-slate-900 group-hover:text-primary transition-colors truncate">
            {task.title}
          </h4>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
              {task.category || "General"}
            </span>
            {task.projectName && (
              <span className="text-[11px] font-bold text-white bg-slate-900 px-2 py-0.5 rounded flex items-center gap-1 truncate max-w-[150px]">
                <Briefcase className="h-3 w-3 shrink-0" />
                <span className="truncate">{task.projectName}</span>
              </span>
            )}
          </div>
        </div>

        <Badge
          variant="outline"
          className={cn("text-[11px] font-bold px-2 py-0.5 shrink-0 border", pStyle.bg, pStyle.text, pStyle.border)}
        >
          {pStyle.label}
        </Badge>
      </div>

      {task.subtasks?.length > 0 && (
        <div className="space-y-1.5 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200">
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            <span>Checklist</span>
            <span className="font-mono tabular-nums text-slate-900 font-bold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5 rounded-full bg-slate-200" />
        </div>
      )}

      <div className="pt-2.5 border-t border-slate-200 flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
            {(task.assignedName || "U").charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium text-slate-700 truncate max-w-[120px]">
            {task.assignedName || "Unassigned"}
          </span>
        </div>

        <div
          className={cn(
            "flex items-center gap-1 text-[11px] font-mono font-semibold tabular-nums px-2 py-0.5 rounded border",
            isOverdue
              ? "text-rose-700 bg-rose-50 border-rose-300"
              : "text-slate-700 bg-slate-50 border-slate-300"
          )}
        >
          <Clock className="h-3 w-3 shrink-0" />
          <span>{task.dueDate || "ASAP"}</span>
        </div>
      </div>
    </button>
  );
}
