
"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
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
  ArrowUpRight,
  TrendingUp,
  Target as TargetIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
import { useRouter } from "next/navigation";

const STATUS_COLUMNS: { id: 'pending' | 'in-progress' | 'completed'; label: string; color: string; bg: string }[] = [
  { id: 'pending', label: 'To Do', color: 'text-slate-400', bg: 'bg-slate-50/50' },
  { id: 'in-progress', label: 'Working', color: 'text-blue-500', bg: 'bg-slate-50/50' },
  { id: 'completed', label: 'Done', color: 'text-green-500', bg: 'bg-slate-50/50' },
];

export default function TaskManagerPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

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
  
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [aiHistory, setAiHistory] = useState<{role: 'user' | 'ai', content: string}[]>([]);
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
          title: "New Task Node",
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
    toast({ title: "Node Deployed" });
  };

  const resetForm = () => {
    setNewTitle(""); setNewDesc(""); setNewPriority("medium"); 
    setNewAssignee(""); setDraftSubtasks([]); setNewProjectId("");
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !businessId) return;
    const input = chatInput;
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
        history: aiHistory.slice(-5)
      });
      setAiHistory(prev => [...prev, { role: 'ai', content: response.content }]);
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Assistant Offline" });
    } finally {
      setIsTyping(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  const filteredTaskList = taskList.filter(t => 
    t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.assignedName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isProfileLoading || isTasksLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <>
      <div className="space-y-8 pb-20 text-left">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
          <div className="flex items-center gap-4 text-left w-full sm:w-auto">
            <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
              <ListTodo className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none">Task Hub</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="outline" className="text-[10px] font-black uppercase h-5 border-primary/20 text-primary">Team Operations Node</Badge>
                <div className="flex items-center gap-1.5 ml-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Live Sync</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setIsAddOpen(true)} className="bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
              <Plus className="mr-2 h-4 w-4" /> New Task Node
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-md bg-white rounded-3xl p-6 border-l-4 border-l-primary flex flex-col justify-between h-32">
              <div className="flex items-center justify-between opacity-60"><span className="text-[9px] font-black uppercase tracking-widest">Throughput</span><TargetIcon className="h-4 w-4 text-primary" /></div>
              <div className="text-3xl font-black text-slate-900">{stats.completionRate}%</div>
              <Progress value={stats.completionRate} className="h-1 bg-primary/10" />
          </Card>
          <Card className="border-none shadow-md bg-white rounded-3xl p-6 border-l-4 border-l-orange-500 flex flex-col justify-between h-32">
              <div className="flex items-center justify-between opacity-60"><span className="text-[9px] font-black uppercase tracking-widest text-orange-600">Active Working</span><Timer className="h-4 w-4 text-orange-600" /></div>
              <div className="text-3xl font-black text-slate-900">{stats.working} Nodes</div>
              <p className="text-[8px] font-bold uppercase text-muted-foreground">Specialist Load</p>
          </Card>
          <Card className="border-none shadow-md bg-white rounded-3xl p-6 border-l-4 border-l-red-500 flex flex-col justify-between h-32">
              <div className="flex items-center justify-between opacity-60"><span className="text-[9px] font-black text-red-600 uppercase tracking-widest">High Focus</span><Zap className="h-4 w-4 text-red-600" /></div>
              <div className="text-3xl font-black text-red-700">{stats.highPriority} Urgent</div>
              <p className="text-[8px] font-bold uppercase text-red-500/60">Immediate Attention</p>
          </Card>
          <Card className="border-none shadow-xl bg-slate-900 text-white rounded-3xl p-6 flex flex-col justify-between h-32 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Bot className="h-12 w-12 text-accent" /></div>
              <div className="flex items-center justify-between opacity-40"><span className="text-[9px] font-black uppercase tracking-widest text-accent">AI Status Pulse</span><BrainCircuit className="h-4 w-4 text-accent" /></div>
              <div className="text-xl font-bold text-white leading-tight">System Optimal</div>
              <p className="text-[8px] font-medium text-slate-400 leading-tight">Gemini: "No bottlenecks detected in current sprint."</p>
          </Card>
        </div>

        <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
          <div className="flex flex-col xl:flex-row items-center justify-between gap-6 mb-8 px-1">
            <TabsList className="bg-white border h-14 p-1.5 rounded-2xl shadow-sm w-full xl:w-auto overflow-x-auto scrollbar-hide flex">
              <TabsTrigger value="board" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><FolderKanban className="h-4 w-4" /> Board</TabsTrigger>
              <TabsTrigger value="list" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><LayoutList className="h-4 w-4" /> Registry</TabsTrigger>
              <TabsTrigger value="analytics" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><TrendingUp className="h-4 w-4" /> Analytics</TabsTrigger>
              <TabsTrigger value="activity" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><History className="h-4 w-4" /> Activity</TabsTrigger>
              <TabsTrigger value="assistant" className="flex-1 text-[10px] font-black uppercase px-8 gap-2 text-primary"><Bot className="h-4 w-4" /> AI Assistant</TabsTrigger>
            </TabsList>
            
            <div className="relative w-full xl:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
              <Input placeholder="Search tasks, agents..." className="h-11 pl-10 rounded-xl bg-white border-none shadow-inner text-xs font-bold w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <TabsContent value="board" className="m-0 space-y-12 animate-in fade-in duration-500">
            {STATUS_COLUMNS.map(col => {
              const colTasks = filteredTaskList.filter(t => t.status === col.id);
              if (colTasks.length === 0 && col.id !== 'pending') return null;
              return (
                <div key={col.id} className="space-y-6 text-left">
                    <div className="flex items-center gap-4 px-2">
                      <div className={cn("h-2.5 w-2.5 rounded-full shadow-sm", col.id === 'completed' ? 'bg-green-500' : col.id === 'in-progress' ? 'bg-blue-500' : 'bg-slate-300')} />
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{col.label}</h3>
                      <Badge variant="secondary" className="text-[9px] font-bold px-2 h-4 border-none bg-muted text-slate-400">{colTasks.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {colTasks.map(t => (
                        <TaskNodeCard key={t.id} task={t} currencySymbol={currencySymbol} onClick={() => router.push(`/notes/${t.id}`)} />
                      ))}
                    </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="list" className="m-0 animate-in fade-in">
            <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2.5rem] border">
              <div className="overflow-x-auto scrollbar-hide">
                <Table className="min-w-[1000px]">
                  <TableHeader><TableRow className="bg-muted/10"><TableHead className="pl-8 text-[10px] font-black uppercase h-12">Task Detail</TableHead><TableHead className="text-[10px] font-black uppercase h-12">Agent</TableHead><TableHead className="text-[10px] font-black uppercase h-12 text-center">Status</TableHead><TableHead className="text-[10px) font-black uppercase h-12 text-center">Priority</TableHead><TableHead className="text-right pr-8 h-12 w-32"></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredTaskList.length === 0 ? <TableRow><TableCell colSpan={5} className="h-60 text-center opacity-30 italic text-sm">No tasks in registry.</TableCell></TableRow> : filteredTaskList.map(t => (
                      <TableRow key={t.id} className="group hover:bg-muted/5 transition-colors cursor-pointer border-b" onClick={() => router.push(`/notes/${t.id}`)}>
                        <TableCell className="pl-8 py-5">
                          <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-xs uppercase shadow-inner shrink-0">{t.title?.charAt(0)}</div>
                              <div className="min-w-0"><p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{t.title}</p><p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Due: {t.dueDate || 'ASAP'}</p></div>
                          </div>
                        </TableCell>
                        <TableCell><div className="flex items-center gap-2"><div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-500 uppercase">{t.assignedName?.charAt(0)}</div><span className="text-xs font-bold text-slate-600">{t.assignedName}</span></div></TableCell>
                        <TableCell className="text-center"><Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 border-primary/20 text-primary">{t.status}</Badge></TableCell>
                        <TableCell className="text-center"><Badge className={cn("text-[7px] font-black uppercase h-4 px-1.5 border-none", t.priority === 'high' ? "bg-red-500 text-white" : "bg-blue-500 text-white")}>{t.priority}</Badge></TableCell>
                        <TableCell className="text-right pr-8"><ChevronRight className="h-4 w-4 text-primary opacity-20 group-hover:opacity-100 transition-all" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="m-0 animate-in fade-in space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border">
                  <CardHeader className="bg-muted/30 border-b py-5 px-8"><CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><Activity className="h-4 w-4" /> Node Distribution</CardTitle></CardHeader>
                  <CardContent className="p-8 h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={stats.statusDist} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                              {stats.statusDist.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#94a3b8' : index === 1 ? '#0C83B3' : '#22c55e'} />)}
                            </Pie>
                            <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border">
                  <CardHeader className="bg-muted/30 border-b py-5 px-8"><CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><Users className="h-4 w-4" /> Specialist Workload</CardTitle></CardHeader>
                  <CardContent className="p-8 h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={businessUsers.slice(0, 5).map(u => ({ name: u.name?.split(' ')[0], tasks: taskList.filter(t => t.assignedTo === u.id).length }))}>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} /><YAxis hide /><RechartsTooltip cursor={{fill: 'transparent'}} /><Bar dataKey="tasks" fill="#0C83B3" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                      </ResponsiveContainer>
                  </CardContent>
                </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="m-0 animate-in fade-in">
            <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border">
              <CardHeader className="bg-muted/30 border-b py-6 px-8"><CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><History className="h-4 w-4" /> Global Activity Logs</CardTitle></CardHeader>
              <CardContent className="p-0">
                  <div className="divide-y max-h-[600px] overflow-y-auto">
                    {globalActivity.length === 0 ? <div className="p-20 text-center opacity-30 italic text-sm">No activity logged.</div> : globalActivity.map((log, i) => (
                      <div key={i} className="p-6 flex items-center justify-between hover:bg-muted/5 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0 shadow-sm"><History className="h-5 w-5" /></div>
                            <div className="min-w-0">
                                <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{log.action}</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Task: {log.taskTitle} • By: {log.by}</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase">{format(new Date(log.time), 'dd MMM, HH:mm')}</span>
                      </div>
                    ))}
                  </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assistant" className="m-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="text-center space-y-4">
                <div className="h-16 w-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center mx-auto border border-primary/20 shadow-inner"><Bot className="h-8 w-8 text-primary" /></div>
                <h3 className="text-2xl font-black text-slate-900">Task Management Advisor</h3>
                <p className="text-sm text-muted-foreground font-medium max-w-md mx-auto leading-relaxed uppercase tracking-tight">Delegation matrix, bottleneck detection, aur team efficiency par AI se baat karein.</p>
              </div>

              <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden flex flex-col h-[550px] border">
                <CardHeader className="bg-slate-900 py-4 px-8 border-b shrink-0 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3"><Bot className="h-5 w-5 text-accent" /><span className="text-[10px] font-black uppercase text-white tracking-widest">Logic Bot v2.5</span></div>
                    <Badge variant="outline" className="text-white/40 border-white/20 text-[7px] font-bold uppercase">SECURE HANDSHAKE</Badge>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
                    <ScrollArea className="flex-1 p-6">
                      <div className="space-y-6">
                        {aiHistory.length === 0 && (
                          <div className="py-12 text-center opacity-30 italic text-sm font-bold uppercase px-8">Namaste! Main aapka task advisor hoon. Aaj team ki productivity kaise badhayein?</div>
                        )}
                        {aiHistory.map((msg, i) => (
                          <div key={i} className={cn("flex gap-3 max-w-[85%] animate-in slide-in-from-bottom-2", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border", msg.role === 'user' ? "bg-primary text-white" : "bg-white text-primary")}>
                              {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                            </div>
                            <div className={cn("p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm", msg.role === 'user' ? "bg-primary text-white rounded-tr-none" : "bg-muted/30 border border-border/50 rounded-tl-none")}>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                        {isTyping && (
                          <div className="flex gap-3"><div className="h-8 w-8 rounded-lg bg-white border flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div><div className="bg-muted/20 p-4 rounded-2xl flex items-center gap-1"><div className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce" /><div className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce delay-100" /><div className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce delay-200" /></div></div>
                        )}
                        <div ref={chatEndRef} className="h-2" />
                      </div>
                    </ScrollArea>
                    <div className="p-4 border-t bg-white shrink-0">
                      <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative">
                        <Input placeholder="Team performance puchiye..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} className="h-14 rounded-2xl bg-muted/20 border-none shadow-inner pr-14 text-sm font-bold pl-6" />
                        <Button size="icon" disabled={!chatInput.trim() || isTyping} className="absolute right-2 top-2 h-10 w-10 rounded-xl bg-primary text-white shadow-lg"><Send className="h-4 w-4" /></Button>
                      </form>
                    </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl w-[95vw]">
          <DialogHeader className="p-8 bg-primary text-white text-left shrink-0">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Deploy New Task Node</DialogTitle>
                <DialogDescription className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-1">Operational lifecycle initialization</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] p-8">
            <div className="space-y-6">
              <div className="space-y-2 text-left"><Label className="text-[10px] font-bold uppercase ml-1">Title *</Label><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="h-12 rounded-xl" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 text-left"><Label className="text-[10px] font-bold uppercase ml-1">Deadline</Label><Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-11 rounded-xl" /></div>
                <div className="space-y-2 text-left">
                  <Label className="text-[10px] font-bold uppercase ml-1">Priority</Label>
                  <Select value={newPriority} onValueChange={(v: any) => setNewPriority(v)}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl"><SelectItem value="low">Routine</SelectItem><SelectItem value="medium">Normal</SelectItem><SelectItem value="high">High Focus</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 text-left">
                  <Label className="text-[10px] font-bold uppercase ml-1">Assign Specialist</Label>
                  <Select value={newAssignee} onValueChange={setNewAssignee}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Pick agent" /></SelectTrigger>
                    <SelectContent className="rounded-xl">{businessUsers.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 text-left">
                  <Label className="text-[10px] font-bold uppercase ml-1">Link Project</Label>
                  <Select value={newProjectId} onValueChange={setNewProjectId}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Standalone" /></SelectTrigger>
                    <SelectContent className="rounded-xl"><SelectItem value="none">Standalone</SelectItem>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2 text-left"><Label className="text-[10px] font-bold uppercase ml-1">Description</Label><Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="min-h-[100px] rounded-xl" /></div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-8 bg-muted/10 border-t"><Button onClick={handleAddTask} className="w-full h-14 bg-primary font-black uppercase text-xs shadow-xl rounded-2xl">Initialize Node</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TaskNodeCard({ task, currencySymbol, onClick }: any) {
  const isHighPriority = task.priority === 'high' || task.priority === 'urgent' || task.priority === 'emergency';
  const progress = useMemo(() => {
    if (!task.subtasks || task.subtasks.length === 0) return 0;
    return Math.round((task.subtasks.filter((s: any) => s.isCompleted).length / task.subtasks.length) * 100);
  }, [task.subtasks]);

  return (
    <Card 
      className={cn(
        "border-none shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer bg-white group overflow-hidden rounded-[2rem] relative border-l-4",
        isHighPriority ? "border-l-red-500" : "border-l-primary/30"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6 space-y-4 text-left">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <h4 className="text-sm font-black tracking-tight text-slate-900 truncate uppercase leading-none mb-1">{task.title}</h4>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[7px] font-black uppercase h-4 px-1.5 bg-primary/5 border-primary/10 text-primary">{task.category}</Badge>
              {task.projectName && <Badge className="text-[7px] font-black uppercase h-4 px-1.5 bg-slate-900 text-white border-none shadow-sm">{task.projectName}</Badge>}
            </div>
          </div>
          {isHighPriority && <Zap className="h-4 w-4 text-red-500 fill-red-500 animate-pulse" />}
        </div>

        {task.subtasks?.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-[7px] font-black uppercase tracking-widest text-slate-400"><span>Progress Node</span><span>{progress}%</span></div>
            <Progress value={progress} className="h-1 rounded-full" />
          </div>
        )}

        <div className="pt-4 border-t border-border/50 flex justify-between items-center mt-4">
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-[10px] uppercase shadow-inner border border-primary/5">{(task.assignedName || 'U').charAt(0)}</div>
             <span className="text-[9px] font-black text-slate-500 uppercase truncate max-w-[80px]">{task.assignedName || 'Unassigned'}</span>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{task.dueDate || 'ASAP'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
