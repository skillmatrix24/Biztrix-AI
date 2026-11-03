
"use client";

import { use, useState, useMemo, useEffect } from "react";
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Building2, 
  Target, 
  LayoutList,
  ChevronRight,
  ShieldCheck,
  Bot, 
  Zap, 
  Star, 
  Loader2, 
  Circle, 
  MessageSquare, 
  SmartphoneNfc, 
  ArrowLeft, 
  Wallet, 
  Plus, 
  TrendingUp, 
  ArrowUpRight, 
  Trash, 
  Receipt, 
  Globe, 
  Copy, 
  Check, 
  Users, 
  Briefcase, 
  AlertCircle, 
  History, 
  ExternalLink, 
  Share2, 
  Sparkles, 
  Save, 
  Mail, 
  Send, 
  MessageCircle, 
  FileText, 
  Scale, 
  ShieldAlert, 
  Info, 
  CornerDownRight, 
  Reply, 
  Handshake, 
  CreditCard, 
  DollarSign, 
  Coins,
  PlusCircle,
  Calculator,
  Tag,
  Edit2,
  Trash2,
  BadgeCheck,
  TrendingDown,
  Timer,
  Activity,
  X,
  User,
  Smartphone
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { calculateGST } from "@/lib/mock-db";
import { 
  useFirestore, 
  useDoc, 
  useMemoFirebase, 
  useCollection, 
  updateDocumentNonBlocking, 
  addDocumentNonBlocking, 
  deleteDocumentNonBlocking,
  useUser 
} from "@/firebase";
import { collection, doc, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { suggestProjectTasks } from "@/ai/flows/suggest-project-tasks";
import { format } from "date-fns";

const PROJECT_STATUS_CONFIG: any = {
  'planning': { label: 'Strategy Node', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', icon: Zap },
  'in-progress': { label: 'Active Execution', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100', icon: Activity },
  'on-hold': { label: 'Lifecycle Hold', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-100', icon: Clock },
  'completed': { label: 'Fully Delivered', color: 'text-green-600', bg: 'bg-green-50 border-green-100', icon: BadgeCheck },
};

export default function ProjectDashboardPage(props: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(props.params);
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const projectRef = useMemoFirebase(() => 
    businessId && projectId ? doc(firestore, 'businesses', businessId, 'projects', projectId) : null
  , [firestore, businessId, projectId]);
  const { data: project, isLoading: isProjectLoading } = useDoc<any>(projectRef);

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const tasksQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'tasks'), where('projectId', '==', projectId)) : null
  , [firestore, businessId, projectId]);
  const { data: tasksData } = useCollection<any>(tasksQuery);
  const projectTasks = tasksData || [];

  const messagesQuery = useMemoFirebase(() => 
    businessId && projectId ? query(collection(firestore, 'businesses', businessId, 'projects', projectId, 'clientMessages'), orderBy('timestamp', 'desc')) : null
  , [firestore, businessId, projectId]);
  const { data: messagesData } = useCollection<any>(messagesQuery);
  const clientMessages = messagesData || [];

  const transactionsQuery = useMemoFirebase(() => 
    businessId && projectId ? query(collection(firestore, 'businesses', businessId, 'cashbook'), where('projectId', '==', projectId)) : null
  , [firestore, businessId, projectId]);
  const { data: transactionsData } = useCollection<any>(transactionsQuery);
  const projectTransactions = transactionsData || [];

  const teamQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null
  , [firestore, businessId]);
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

  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const finStats = useMemo(() => {
    if (!project) return { expense: 0, revenue: 0, staffCost: 0, netProfit: 0, profitMargin: 0, totalProjectValue: 0, remainBalance: 0 };
    
    const expense = projectTransactions.filter((t: any) => t.type === 'debit').reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
    const revenue = projectTransactions.filter((t: any) => t.type === 'credit').reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
    
    const staffCost = projectTasks.reduce((total: number, task: any) => {
      const staff = businessUsers.find((u: any) => u.id === task.assignedTo);
      if (!staff || !task.timeSpent) return total;
      const hourlyRate = (staff.dailyRate || 500) / (staff.shiftHours || 8);
      return total + (task.timeSpent / 60) * hourlyRate;
    }, 0);

    const baseValue = parseFloat(project.estimatedValue) || 0;
    const addonsValue = (project.addons || []).reduce((sum: number, a: any) => sum + (parseFloat(a.price) || 0), 0);
    const totalProjectValue = baseValue + addonsValue;
    const remainBalance = totalProjectValue - revenue;
    const netProfit = revenue - expense - staffCost;
    const profitMargin = totalProjectValue > 0 ? (netProfit / totalProjectValue) * 100 : 0;

    return { 
      expense, revenue, staffCost, netProfit, profitMargin, 
      totalProjectValue, remainBalance, baseValue, addonsValue 
    };
  }, [projectTransactions, project, projectTasks, businessUsers]);

  const taskStats = useMemo(() => {
    const total = projectTasks.length;
    const completed = projectTasks.filter(t => t.status === 'completed').length;
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
    const newMilestone = { id: `ms_${Date.now()}`, label: milestoneLabel, amount: parseFloat(milestoneAmount), status: 'pending', createdAt: new Date().toISOString() };
    updateDocumentNonBlocking(projectRef, { milestones: [...currentMilestones, newMilestone], updatedAt: serverTimestamp() });
    setMilestoneLabel(""); setMilestoneAmount(""); setIsAddMilestoneOpen(false);
    toast({ title: "Milestone Added" });
  };

  const toggleMilestoneStatus = (milestoneId: string, currentStatus: string) => {
    if (!projectRef || !project) return;
    const nextStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    const updatedMilestones = (project.milestones || []).map((m: any) => 
      m.id === milestoneId ? { ...m, status: nextStatus } : m
    );
    updateDocumentNonBlocking(projectRef, { milestones: updatedMilestones, updatedAt: serverTimestamp() });
    toast({ title: "Status Updated" });
  };

  const handleCreateMilestoneBill = (milestone: any) => {
    if (!businessId || !project) return;
    router.push(`/billing?customerId=${project.clientId}&projectId=${project.id}&milestoneId=${milestone.id}&amount=${milestone.amount}`);
  };

  const handleSuggestTasks = async () => {
    if (!project) return;
    setIsAiLoading(true);
    try {
      const result = await suggestProjectTasks({ title: project.title, description: project.description, deepResearch: true });
      const tasksWithTempIds = result.tasks.map(t => ({ ...t, tempId: Math.random().toString(36).substr(2, 9) }));
      setAiSuggestions(tasksWithTempIds);
      setSelectedAiTaskIds(tasksWithTempIds.map(t => t.tempId));
      setIsAiModalOpen(true);
    } finally {
      setIsAiLoading(false);
    }
  };

  const saveSelectedAiTasks = () => {
    if (!businessId || !projectId || !project) return;
    const tasksRef = collection(firestore, 'businesses', businessId, 'tasks');
    const selectedTasks = aiSuggestions.filter(t => selectedAiTaskIds.includes(t.tempId));
    
    selectedTasks.forEach(task => {
      addDocumentNonBlocking(tasksRef, {
        title: task.title,
        description: task.description,
        section: task.section,
        priority: task.priority,
        status: 'pending',
        projectId,
        projectName: project.title,
        assignedTo: project.team?.[0] || '',
        assignedName: businessUsers.find((u: any) => u.id === project.team?.[0])?.name || 'Unassigned',
        createdAt: serverTimestamp(),
        businessId
      });
    });

    setIsAiModalOpen(false);
    setAiSuggestions([]);
    setSelectedAiTaskIds([]);
    toast({ title: "Workflow Deployed", description: `${selectedTasks.length} task nodes initialized.` });
  };

  const handleGenerateProgressDigest = () => {
    if (!project) return;
    const nextMilestone = (project.milestones || []).find((m: any) => m.status === 'pending');
    const trackUrl = `${window.location.origin}/projects/track/${businessId}/${projectId}`;
    const statusLabel = PROJECT_STATUS_CONFIG[project.status]?.label || project.status;
    const message = `🚀 *Project Progress Update: ${project.title}*\n━━━━━━━━━━━━━━━━\n📊 *Status:* ${statusLabel}\n✅ *Progress:* ${taskStats.progress}% Complete (${taskStats.completed}/${taskStats.total} Tasks)\n💰 *Collection:* ${currencySymbol}${finStats.revenue.toLocaleString()} / ${currencySymbol}${finStats.totalProjectValue.toLocaleString()}\n\n🎯 *Next Milestone:* ${nextMilestone?.label || 'Final Handover'}\n📌 *Live Tracking Node:* ${trackUrl}\n━━━━━━━━━━━━━━━━\n_Powered by Biztrix AI OS_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    toast({ title: "Digest Compiled" });
  };

  const handleRecordExpense = () => {
    if (!expenseAmount || !expenseParticulars || !businessId || !project?.id) return;
    const cashbookRef = collection(firestore, 'businesses', businessId, 'cashbook');
    addDocumentNonBlocking(cashbookRef, {
      businessId, type: 'debit', amount: parseFloat(expenseAmount), particulars: `${expenseParticulars} (Project: ${project.title})`,
      category: expenseCategory, projectId: project.id, date: new Date().toISOString().split('T')[0], createdAt: serverTimestamp()
    });
    setIsAddExpenseOpen(false); setExpenseAmount(""); setExpenseParticulars("");
    toast({ title: "Expense Recorded" });
  };

  const handleSendReply = (msgId: string) => {
    if (!replyText.trim() || !businessId || !projectId) return;
    const msgRef = doc(firestore, 'businesses', businessId, 'projects', projectId, 'clientMessages', msgId);
    updateDocumentNonBlocking(msgRef, {
      replyText,
      repliedAt: new Date().toISOString(),
      status: 'replied'
    });
    setReplyText("");
    setActiveReplyId(null);
    toast({ title: "Reply Dispatched" });
  };

  if (isProfileLoading || isProjectLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;
  if (!project) return <div className="min-h-screen flex flex-col items-center justify-center text-center p-6"><ShieldAlert className="h-10 w-10 text-red-600 mb-4" /><h1 className="text-xl font-bold">Node Not Found</h1><Button asChild className="mt-4"><Link href="/projects">Back to Projects</Link></Button></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32 md:pb-20 text-left px-2 sm:px-4">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left w-full sm:w-auto">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0"><Link href="/projects"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="min-w-0 text-left flex-1">
             <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary h-5 px-3 mb-1.5">PROJECT: {projectId.slice(-6).toUpperCase()}</Badge>
             <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-none uppercase truncate">{project?.title}</h1>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleGenerateProgressDigest} className="flex-1 sm:flex-none h-11 rounded-xl bg-white border-green-200 text-green-600 font-bold uppercase text-[10px] tracking-widest shadow-sm gap-2">
            <SmartphoneNfc className="h-4 w-4" /> Share Digest
          </Button>
          <Select value={project.status} onValueChange={handleUpdateStatus}>
             <SelectTrigger className={cn("flex-1 sm:flex-none h-11 rounded-xl font-black uppercase text-[10px] tracking-widest w-40", PROJECT_STATUS_CONFIG[project.status]?.bg, PROJECT_STATUS_CONFIG[project.status]?.color)}>
                <SelectValue />
             </SelectTrigger>
             <SelectContent className="rounded-xl border-none shadow-2xl">
                {Object.keys(PROJECT_STATUS_CONFIG).map(s => <SelectItem key={s} value={s} className="text-[10px] font-black uppercase">{PROJECT_STATUS_CONFIG[s].label}</SelectItem>)}
             </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="border-none shadow-md bg-white rounded-3xl p-6 border-l-4 border-l-primary flex flex-col justify-between h-32">
              <div className="flex items-center justify-between opacity-60"><span className="text-[9px] font-black uppercase tracking-widest">Progress</span><Target className="h-4 w-4 text-primary" /></div>
              <div className="text-3xl font-black text-slate-900">{taskStats.progress}%</div>
              <Progress value={taskStats.progress} className="h-1 bg-primary/10" />
          </Card>
          <Card className="border-none shadow-md bg-white rounded-3xl p-6 border-l-4 border-l-green-500 flex flex-col justify-between h-32">
              <div className="flex items-center justify-between opacity-60"><span className="text-[9px] font-black uppercase tracking-widest text-green-600">Collected</span><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
              <div className="text-3xl font-black text-green-700">{currencySymbol}{finStats.revenue.toLocaleString()}</div>
          </Card>
          <Card className="border-none shadow-md bg-white rounded-3xl p-6 border-l-4 border-l-orange-500 flex flex-col justify-between h-32">
              <div className="flex items-center justify-between opacity-60"><span className="text-[9px] font-black uppercase tracking-widest text-orange-600">Pending</span><Wallet className="h-4 w-4 text-orange-600" /></div>
              <div className="text-3xl font-black text-orange-700">{currencySymbol}{Math.max(0, finStats.remainBalance).toLocaleString()}</div>
          </Card>
          <Card className={cn("border-none shadow-xl rounded-3xl p-6 flex flex-col justify-between h-32 relative overflow-hidden group", finStats.netProfit >= 0 ? "bg-green-50 border-l-green-600" : "bg-red-50 border-l-red-600")}>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp className="h-12 w-12" /></div>
              <div className="flex items-center justify-between opacity-40"><span className="text-[9px] font-black uppercase tracking-widest">Net Profit</span><Sparkles className="h-4 w-4" /></div>
              <div className="text-2xl font-black">{currencySymbol}{finStats.netProfit.toLocaleString()}</div>
              <p className="text-[8px] font-bold uppercase opacity-60">{Math.round(finStats.profitMargin)}% Margin node</p>
          </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border h-14 p-1.5 rounded-2xl shadow-sm mb-8 flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="roadmap" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><LayoutList className="h-4 w-4" /> Workflow</TabsTrigger>
          <TabsTrigger value="financials" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><DollarSign className="h-4 w-4" /> Financials</TabsTrigger>
          <TabsTrigger value="messages" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><MessageCircle className="h-4 w-4" /> Requests</TabsTrigger>
          <TabsTrigger value="sharing" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><Globe className="h-4 w-4" /> Tracking Node</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8 space-y-10">
            <TabsContent value="roadmap" className="m-0 space-y-10 animate-in fade-in">
              <div className="flex items-center justify-between px-2 text-left">
                 <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-3"><Zap className="h-5 w-5" /> Execution Timeline</h3>
                 <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleSuggestTasks} disabled={isAiLoading} className="h-8 rounded-xl bg-primary/5 text-primary text-[8px] font-black uppercase border border-primary/10 hover:bg-primary/10 transition-all gap-1.5">
                       {isAiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                       AI Research Tasks
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-8 rounded-xl text-[9px] font-black uppercase"><Link href="/notes"><Plus className="h-3 w-3 mr-1" /> New Task</Link></Button>
                 </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {projectTasks.length === 0 ? (
                  <div className="p-20 text-center border-2 border-dashed rounded-[3rem] opacity-30 italic uppercase text-[10px] font-black">No tasks linked to this project node.</div>
                ) : projectTasks.map((task: any) => (
                  <Card key={task.id} className="border-none shadow-sm hover:shadow-md transition-all rounded-[1.5rem] overflow-hidden group border cursor-pointer" onClick={() => router.push(`/notes/${task.id}`)}>
                    <CardContent className="p-5 flex items-center justify-between">
                       <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-all", task.status === 'completed' ? "bg-green-500 border-green-500 text-white" : "bg-muted/20")}>
                             {task.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 opacity-10" />}
                          </div>
                          <div className="min-w-0 text-left">
                             <h4 className={cn("text-sm font-black uppercase tracking-tight truncate", task.status === 'completed' && "line-through opacity-40")}>{task.title}</h4>
                             <div className="flex items-center gap-3 mt-1">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">{task.assignedName}</span>
                                <Separator orientation="vertical" className="h-2" />
                                <span className="text-[9px] font-bold text-slate-400 uppercase">{task.dueDate}</span>
                             </div>
                          </div>
                       </div>
                       <ChevronRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="financials" className="m-0 space-y-10 animate-in fade-in">
               <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border">
                  <CardHeader className="bg-primary/5 border-b py-6 px-8 flex justify-between items-center">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><Coins className="h-4 w-4" /> Project Ledger</CardTitle>
                    <Button onClick={() => setIsAddExpenseOpen(true)} size="sm" className="h-8 px-4 rounded-xl text-[9px] font-black uppercase shadow-lg"><Plus className="mr-1.5 h-3.5 w-3.5" /> Record Expense</Button>
                  </CardHeader>
                  <div className="overflow-x-auto">
                     <Table>
                        <TableHeader><TableRow className="bg-muted/10"><TableHead className="pl-8 text-[10px] font-black uppercase h-12">Date</TableHead><TableHead className="text-[10px] font-black uppercase h-12">Transaction</TableHead><TableHead className="text-right text-[10px] font-black uppercase h-12">Inflow (+)</TableHead><TableHead className="text-right pr-8 text-[10px] font-black uppercase h-12">Outflow (-)</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {projectTransactions.length === 0 ? <TableRow><TableCell colSpan={4} className="h-60 text-center opacity-30 italic text-sm">No transactions linked to this node.</TableCell></TableRow> : projectTransactions.map((t: any) => (
                            <TableRow key={t.id} className="hover:bg-muted/5 transition-colors border-b">
                               <TableCell className="pl-8 py-5 text-[10px] font-black text-slate-400 uppercase">{t.date}</TableCell>
                               <TableCell><div className="flex flex-col text-left"><span className="text-xs font-bold text-slate-900 uppercase">{t.particulars.split(' (Project:')[0]}</span><span className="text-[8px] font-black text-muted-foreground uppercase opacity-60">{t.category}</span></div></TableCell>
                               <TableCell className="text-right font-black text-sm text-green-600">{t.type === 'credit' ? `${currencySymbol}${t.amount.toLocaleString()}` : '-'}</TableCell>
                               <TableCell className="text-right pr-8 font-black text-sm text-red-600">{t.type === 'debit' ? `${currencySymbol}${t.amount.toLocaleString()}` : '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                     </Table>
                  </div>
               </Card>

               <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border">
                  <CardHeader className="bg-muted/30 border-b py-6 px-8 flex justify-between items-center">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><Sparkles className="h-4 w-4" /> Payment Milestones</CardTitle>
                    <Button onClick={() => setIsAddMilestoneOpen(true)} variant="outline" size="sm" className="h-8 px-4 rounded-xl text-[9px] font-black uppercase border-primary/20 text-primary">Define Stage</Button>
                  </CardHeader>
                  <div className="divide-y">
                     {(project.milestones || []).map((m: any) => (
                       <div key={m.id} className={cn("p-6 flex flex-col sm:flex-row items-center justify-between gap-8 hover:bg-muted/5 transition-all", m.status === 'approved_by_client' ? "bg-primary/5" : "")}>
                          <div className="flex items-center gap-4 text-left">
                             <div className={cn("h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all", m.status === 'completed' || m.status === 'invoiced' || m.status === 'approved_by_client' ? "bg-green-50 border-green-50 text-green-600" : "border-slate-200")}>
                                {m.status === 'completed' || m.status === 'invoiced' || m.status === 'approved_by_client' ? <BadgeCheck className="h-5 w-5" /> : <Clock className="h-5 w-5 opacity-20" />}
                             </div>
                             <div>
                                <p className="text-sm font-black text-slate-900 uppercase">{m.label}</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Value: {currencySymbol}{m.amount.toLocaleString()}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-2">
                             {m.status === 'pending' && <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase text-primary" onClick={() => toggleMilestoneStatus(m.id, 'pending')}>Mark Finished</Button>}
                             <Badge className={cn("text-[7px] font-black uppercase h-5", m.status === 'invoiced' ? "bg-green-600 text-white" : "bg-primary/5 text-primary border border-primary/10")}>{m.status.replace('_', ' ')}</Badge>
                             {m.status === 'approved_by_client' && <Button size="sm" onClick={() => handleCreateMilestoneBill(m)} className="h-8 bg-primary text-white text-[8px] font-black uppercase rounded-lg shadow-lg"><Receipt className="h-3 w-3 mr-1" /> Create Bill</Button>}
                          </div>
                       </div>
                     ))}
                  </div>
               </Card>
            </TabsContent>

            <TabsContent value="messages" className="m-0 space-y-8 animate-in fade-in">
               <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border">
                  <CardHeader className="bg-muted/30 border-b py-6 px-8 text-left"><CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Client Requests</CardTitle></CardHeader>
                  <div className="divide-y max-h-[500px] overflow-y-auto">
                    {clientMessages.length === 0 ? <div className="p-20 text-center opacity-30 italic text-sm">No incoming requests from client portal.</div> : clientMessages.map((msg: any) => (
                      <div key={msg.id} className="p-8 space-y-6 hover:bg-muted/5 transition-all text-left">
                         <div className="flex items-start gap-4">
                            <div className="h-9 w-9 rounded-xl bg-muted/20 flex items-center justify-center shrink-0"><User className="h-4 w-4 text-slate-500" /></div>
                            <div className="flex-1 space-y-2">
                               <p className="text-sm font-medium text-slate-700 leading-relaxed italic">"{msg.text}"</p>
                               <p className="text-[8px] font-black text-slate-400 uppercase">{new Date(msg.timestamp).toLocaleString()}</p>
                            </div>
                         </div>
                         {msg.replyText ? (
                           <div className="flex items-start gap-4 pl-12 text-left">
                              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Bot className="h-5 w-5 text-primary" /></div>
                              <div className="flex-1 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                 <p className="text-xs font-bold text-primary leading-relaxed">{msg.replyText}</p>
                                 <p className="text-[7px] font-black text-primary/40 uppercase mt-2">Replied on {new Date(msg.repliedAt).toLocaleString()}</p>
                              </div>
                           </div>
                         ) : (
                           <div className="pl-12 text-left">
                              {activeReplyId === msg.id ? (
                                <div className="space-y-3 animate-in slide-in-from-top-2">
                                   <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type official response..." className="min-h-[100px] rounded-xl bg-muted/20 border-none p-4 text-xs font-bold" />
                                   <div className="flex gap-2 justify-end">
                                      <Button variant="ghost" size="sm" onClick={() => setActiveReplyId(null)} className="h-8 text-[9px] font-black uppercase">Cancel</Button>
                                      <Button size="sm" onClick={() => handleSendReply(msg.id)} className="h-8 bg-primary rounded-xl text-[9px] font-black uppercase shadow-lg">Dispatch Reply</Button>
                                   </div>
                                </div>
                              ) : <Button variant="outline" size="sm" className="h-8 rounded-xl text-[9px] font-black uppercase border-primary/20 text-primary gap-2" onClick={() => setActiveReplyId(msg.id)}><Reply className="h-3.5 w-3.5" /> Reply to client</Button>}
                           </div>
                         )}
                      </div>
                    ))}
                  </div>
               </Card>
            </TabsContent>

            <TabsContent value="sharing" className="m-0 animate-in fade-in">
              <Card className="border-none shadow-md bg-white rounded-[2rem] border overflow-hidden">
                <CardHeader className="bg-primary/5 border-b py-5 px-6">
                   <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                     <SmartphoneNfc className="h-4 w-4" /> Client Portal Control
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6 text-left">
                   <p className="text-sm text-muted-foreground leading-relaxed font-medium">Allow the client to track live progress via a secure public node.</p>
                   <div className="p-8 bg-muted/20 rounded-[2rem] border-2 border-dashed border-border/50 text-center space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Public Sharing Node</span>
                          <p className="text-[8px] font-bold text-muted-foreground uppercase">Enables secure external access</p>
                        </div>
                        <Switch 
                          checked={!!project.sharePublic} 
                          onCheckedChange={(v) => handleUpdateField('sharePublic', v)}
                          className="scale-90 data-[state=checked]:bg-primary" 
                        />
                      </div>
                      {project.sharePublic && (
                        <div className="space-y-4 animate-in zoom-in-95">
                          <div className="p-4 bg-white rounded-2xl border text-[9px] font-mono text-primary truncate shadow-inner">
                            {`${window.location.origin}/projects/track/${businessId}/${projectId}`}
                          </div>
                          <Button 
                            onClick={() => {
                              const url = `${window.location.origin}/projects/track/${businessId}/${projectId}`;
                              navigator.clipboard.writeText(url);
                              setIsCopied(true);
                              setTimeout(() => setIsCopied(false), 2000);
                              toast({ title: "Copied" });
                            }}
                            className="w-full h-12 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl hover:bg-slate-800"
                          >
                            {isCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                            Copy Tracking Link
                          </Button>
                        </div>
                      )}
                   </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          <div className="lg:col-span-4 space-y-8">
             <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
                <CardHeader className="bg-muted/30 border-b py-5 px-6"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Briefcase className="h-4 w-4" /> Client Context</CardTitle></CardHeader>
                <CardContent className="p-6 space-y-5">
                   <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary text-lg shadow-inner">{project?.clientName?.charAt(0)}</div>
                      <div className="min-w-0">
                         <p className="text-sm font-black text-slate-900 truncate">{project?.clientName}</p>
                         <p className="text-[9px] font-bold text-muted-foreground uppercase">{project?.clientType} NODE</p>
                      </div>
                   </div>
                </CardContent>
             </Card>

             <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 space-y-6 shadow-inner text-left">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center shadow-md"><ShieldCheck className="h-5 w-5 text-primary" /></div>
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">Security Node</p>
                </div>
                <p className="text-[11px] text-primary/70 leading-relaxed font-medium italic">"All project data and financials are isolated per-tenant v3.5."</p>
             </div>
          </div>
        </div>
      </Tabs>

      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden text-left">
           <DialogHeader className="p-8 bg-primary text-white text-left shrink-0"><DialogTitle className="text-xl">Record Expense</DialogTitle></DialogHeader>
           <div className="p-8 space-y-6">
              <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Particulars</Label><Input value={expenseParticulars} onChange={(e) => setExpenseParticulars(e.target.value)} className="h-12 rounded-xl font-bold bg-muted/20 border-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Amount (₹)</Label><Input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="h-12 rounded-xl bg-primary/5 text-primary border-none" /></div>
                 <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Category</Label><Select value={expenseCategory} onValueChange={setExpenseCategory}><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="Expense">General</SelectItem><SelectItem value="Purchase">Material</SelectItem></SelectContent></Select></div>
              </div>
           </div>
           <DialogFooter className="p-8 bg-muted/10 border-t"><Button onClick={handleRecordExpense} disabled={!expenseAmount} className="w-full h-14 bg-primary font-black uppercase text-xs rounded-2xl">Commit Entry</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddMilestoneOpen} onOpenChange={setIsAddMilestoneOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden text-left">
           <DialogHeader className="p-8 bg-slate-900 text-white text-left shrink-0"><DialogTitle className="text-xl">Define Stage Node</DialogTitle></DialogHeader>
           <div className="p-8 space-y-6">
              <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Milestone Label</Label><Input value={milestoneLabel} onChange={(e) => setMilestoneLabel(e.target.value)} className="h-12 rounded-xl bg-muted/20 border-none shadow-inner" /></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Amount (₹)</Label><Input type="number" value={milestoneAmount} onChange={(e) => setMilestoneAmount(e.target.value)} className="h-12 rounded-xl bg-primary/5 text-primary border-none shadow-inner" /></div>
           </div>
           <DialogFooter className="p-8 bg-muted/10 border-t"><Button onClick={handleAddMilestone} disabled={!milestoneLabel || !milestoneAmount} className="w-full h-14 bg-primary font-black uppercase text-xs rounded-2xl">Deploy Milestone</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden text-left w-[95vw]">
           <DialogHeader className="p-8 bg-primary text-white text-left shrink-0"><DialogTitle className="text-xl">AI Workflow Suggested</DialogTitle></DialogHeader>
           <div className="p-8 max-h-[60vh] overflow-y-auto scrollbar-hide">
              <div className="space-y-4">
                 {aiSuggestions.map((task) => (
                    <div key={task.tempId} className="p-4 bg-muted/20 rounded-2xl flex items-start gap-4">
                       <Checkbox checked={selectedAiTaskIds.includes(task.tempId)} onCheckedChange={(checked) => { if(checked) setSelectedAiTaskIds([...selectedAiTaskIds, task.tempId]); else setSelectedAiTaskIds(selectedAiTaskIds.filter(id => id !== task.tempId)); }} />
                       <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 uppercase truncate">{task.title}</p>
                          <p className="text-[9px] text-muted-foreground line-clamp-1 mt-1">{task.description}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
           <DialogFooter className="p-8 bg-muted/10 border-t flex flex-row gap-3"><Button variant="outline" className="flex-1 h-12 rounded-xl font-bold uppercase text-[10px]" onClick={() => setIsAiModalOpen(false)}>Discard</Button><Button onClick={saveSelectedAiTasks} className="flex-1 h-12 bg-primary font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl">Deploy {selectedAiTaskIds.length} Nodes</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
