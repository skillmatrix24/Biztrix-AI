
"use client";

import { use, useState, useMemo, useEffect, useRef } from "react";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  SmartphoneNfc, 
  Loader2, 
  Smartphone, 
  Sparkles, 
  BadgeCheck, 
  Bot, 
  Layers, 
  History, 
  Plus, 
  X, 
  Save, 
  Timer, 
  AlertCircle, 
  ShieldCheck, 
  ShieldAlert,
  Play, 
  Square, 
  Briefcase, 
  BrainCircuit, 
  Trash2,
  PlusCircle,
  LayoutList,
  Target,
  Calendar,
  Activity,
  User,
  Zap,
  ChevronRight,
  Stethoscope,
  Eye,
  AlertTriangle,
  Ban,
  Circle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
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
  useCollection 
} from "@/firebase";
import { doc, serverTimestamp, collection, query, where } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { suggestTaskSteps } from "@/ai/flows/suggest-task-steps";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  'pending': { label: 'To Do', color: 'text-slate-500', bg: 'bg-slate-100', icon: Clock },
  'in-progress': { label: 'Working', color: 'text-blue-600', bg: 'bg-blue-50', icon: Activity },
  'on-hold': { label: 'On Hold', color: 'text-amber-600', bg: 'bg-amber-50', icon: Ban },
  'testing': { label: 'QA Testing', color: 'text-purple-600', bg: 'bg-purple-50', icon: Stethoscope },
  'review': { label: 'Revision', color: 'text-pink-600', bg: 'bg-pink-50', icon: Eye },
  'completed': { label: 'Completed', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
  'cancelled': { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-50', icon: X },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  'low': { label: 'Routine', color: 'text-slate-500', bg: 'bg-slate-100', icon: Circle },
  'medium': { label: 'Normal', color: 'text-blue-600', bg: 'bg-blue-50', icon: Target },
  'high': { label: 'High Focus', color: 'text-orange-600', bg: 'bg-orange-50', icon: Zap },
  'urgent': { label: 'Urgent (24h)', color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle },
  'emergency': { label: 'Emergency', color: 'text-red-900', bg: 'bg-red-200', icon: ShieldAlert },
};

export default function TaskDetailPage(props: { params: Promise<{ taskId: string }> }) {
  const { taskId } = use(props.params);
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const taskRef = useMemoFirebase(() => 
    businessId && taskId ? doc(firestore, 'businesses', businessId, 'tasks', taskId) : null
  , [firestore, businessId, taskId]);
  const { data: task, isLoading: isTaskLoading } = useDoc<any>(taskRef);

  const teamQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null
  , [firestore, businessId]);
  const { data: businessUsers = [] } = useCollection<any>(teamQuery);

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

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
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  const handleUpdateField = (key: string, value: any) => {
    if (!taskRef) return;
    updateDocumentNonBlocking(taskRef, { [key]: value, lastUpdate: serverTimestamp() });

    if (key === 'status' && value === 'completed' && business?.ownerId) {
      addDocumentNonBlocking(collection(firestore, 'businesses', businessId!, 'notifications'), {
        businessId: businessId!,
        recipientId: business.ownerId,
        title: "Task Completed",
        message: `${userProfile?.name || 'A specialist'} finalized: ${task.title}`,
        type: 'task',
        taskId: taskId,
        isRead: false,
        createdAt: serverTimestamp()
      });
    }
  };

  const handleUpdateAssignee = (userId: string) => {
    const staff = businessUsers.find((u: any) => u.id === userId);
    handleUpdateField('assignedTo', userId);
    handleUpdateField('assignedName', staff?.name || 'Unassigned');

    if (userId) {
      addDocumentNonBlocking(collection(firestore, 'businesses', businessId!, 'notifications'), {
        businessId: businessId!,
        recipientId: userId,
        title: "New Task Assignment",
        message: `You are now responsible for: ${task.title}`,
        type: 'task',
        taskId: taskId,
        isRead: false,
        createdAt: serverTimestamp()
      });
    }

    toast({ title: "Assignee Updated", description: `Task node assigned to ${staff?.name || 'Unassigned'}.` });
  };

  const handleAddStep = () => {
    if (!newStepText.trim()) return;
    const newStep = { id: Math.random().toString(36).substr(2, 9), text: newStepText, isCompleted: false };
    const updatedSubtasks = [...(task.subtasks || []), newStep];
    handleUpdateField('subtasks', updatedSubtasks);
    setNewStepText("");
  };

  const handleToggleStep = (sid: string) => {
    const updatedSubtasks = task.subtasks.map((s: any) => s.id === sid ? { ...s, isCompleted: !s.isCompleted } : s);
    handleUpdateField('subtasks', updatedSubtasks);
  };

  const handleRemoveStep = (sid: string) => {
    const updatedSubtasks = task.subtasks.filter((s: any) => s.id !== sid);
    handleUpdateField('subtasks', updatedSubtasks);
  };

  const handleAiSuggest = async () => {
    setIsAiLoading(true);
    try {
      const result = await suggestTaskSteps({ taskTitle: task.title });
      const newSteps = result.steps.map(s => ({
        id: Math.random().toString(36).substr(2, 9),
        text: s.text,
        isCompleted: false
      }));
      handleUpdateField('subtasks', [...(task.subtasks || []), ...newSteps]);
      toast({ title: "Logic Checklist Generated" });
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
        by: userProfile?.name || 'User', 
        time: new Date().toISOString() 
      };

      handleUpdateField('timeSpent', totalTime);
      handleUpdateField('logs', [...(task.logs || []), newLog]);
      setSeconds(0);
      toast({ title: "Activity Synced", description: `Logged ${minutesSpent}m of work.` });
    }
  };

  const handleWhatsAppPing = () => {
    const staff = businessUsers.find((u: any) => u.id === task.assignedTo);
    if (!staff?.phone) {
      toast({ variant: "destructive", title: "No Phone Found" });
      return;
    }
    const message = `🚀 *Task Ping: ${task.title}*\n👤 *Agent:* ${staff.name}\n📅 *Due:* ${task.dueDate || 'Soon'}\n📊 *Status:* ${task.status.toUpperCase()}\n\nPlease verify details: ${window.location.href}`;
    window.open(`https://wa.me/${staff.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDelete = () => {
    if (!taskRef) return;
    deleteDocumentNonBlocking(taskRef);
    toast({ title: "Task Removed", variant: "destructive" });
    router.push("/notes");
  };

  if (isProfileLoading || isTaskLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;
  if (!task) return <div className="min-h-screen flex flex-col items-center justify-center text-center p-6"><ShieldAlert className="h-10 w-10 text-red-600 mb-4" /><h1 className="text-xl font-bold">Node Not Found</h1><Button asChild className="mt-4"><Link href="/notes">Back to Manager</Link></Button></div>;

  const subtaskProgress = Math.round((task.subtasks?.filter((s: any) => s.isCompleted).length || 0) / (task.subtasks?.length || 1) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 md:pb-20 text-left px-2 sm:px-4">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left w-full sm:w-auto">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0"><Link href="/notes"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="min-w-0 text-left flex-1">
             <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary h-5 px-3 mb-1.5">TASK NODE: {taskId.slice(-8).toUpperCase()}</Badge>
             <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-none uppercase truncate">{task.title}</h1>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleWhatsAppPing} className="flex-1 sm:flex-none h-11 rounded-xl bg-white border-green-200 text-green-600 font-bold uppercase text-[10px] tracking-widest shadow-sm gap-2">
            <SmartphoneNfc className="h-4 w-4" /> WhatsApp
          </Button>
          <Button variant="outline" onClick={handleToggleTimer} className={cn("flex-1 sm:flex-none h-11 rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2 shadow-sm transition-all", timerRunning ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-white text-primary border-primary/20")}>
            {timerRunning ? <><Square className="h-3.5 w-3.5 fill-current" /> Stop</> : <><Play className="h-3.5 w-3.5 fill-current" /> Start</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-8 space-y-8">
          <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border">
            <div className="p-8 sm:p-10 bg-primary text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><Target className="h-40 w-40" /></div>
               <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8">
                  <div className="space-y-4 text-left w-full sm:w-auto">
                    <div className="p-5 bg-white/10 rounded-[2rem] border border-white/20 backdrop-blur-md">
                      <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Node Efficiency</p>
                      <p className="text-4xl font-black">{subtaskProgress}%</p>
                    </div>
                  </div>
                  <div className="text-center sm:text-right w-full sm:w-auto">
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Time Logged</p>
                    <p className="text-2xl font-black">{Math.floor((task.timeSpent || 0) / 60)}h {task.timeSpent % 60}m</p>
                    {timerRunning && <Badge className="mt-2 bg-red-500 text-white animate-pulse border-none text-[8px] font-black uppercase">Live Track Active</Badge>}
                  </div>
               </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-8 border-b bg-muted/5">
                <TabsList className="bg-transparent h-14 p-0 gap-6 sm:gap-8 border-none overflow-x-auto scrollbar-hide flex">
                  <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-14 text-[10px] font-black uppercase tracking-widest px-0 whitespace-nowrap">Overview</TabsTrigger>
                  <TabsTrigger value="checklist" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-14 text-[10px] font-black uppercase tracking-widest px-0 whitespace-nowrap">Steps ({task.subtasks?.length || 0})</TabsTrigger>
                  <TabsTrigger value="insights" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-14 text-[10px] font-black uppercase tracking-widest px-0 text-primary whitespace-nowrap"><BrainCircuit className="h-3.5 w-3.5 mr-2" /> AI Intelligence</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6 sm:p-10 text-left min-h-[400px]">
                <TabsContent value="overview" className="m-0 space-y-10 text-left">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-3 text-left">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Assigned Specialist</Label>
                      <Select value={task.assignedTo || ""} onValueChange={handleUpdateAssignee}>
                        <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-base">
                          <SelectValue placeholder="Pick a specialist" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl">
                          {businessUsers.map((s: any) => (
                            <SelectItem key={s.id} value={s.id} className="text-sm font-bold">{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3 text-left">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Status Node</Label>
                      <Select value={task.status} onValueChange={(v: any) => handleUpdateField('status', v)}>
                        <SelectTrigger className={cn(
                          "h-14 rounded-2xl border-none shadow-inner font-bold text-base",
                          STATUS_CONFIG[task.status]?.bg, STATUS_CONFIG[task.status]?.color
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl">
                          {Object.keys(STATUS_CONFIG).map((key) => {
                             const cfg = STATUS_CONFIG[key];
                             const Icon = cfg.icon;
                             return (
                               <SelectItem key={key} value={key} className="p-2.5">
                                 <div className="flex items-center gap-3">
                                   <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center", cfg.bg)}>
                                     <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                                   </div>
                                   <span className={cn("text-[10px] font-black uppercase tracking-tight", cfg.color)}>{cfg.label}</span>
                                 </div>
                               </SelectItem>
                             );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-3 text-left">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Urgency Priority</Label>
                      <Select value={task.priority} onValueChange={(v: any) => handleUpdateField('priority', v)}>
                        <SelectTrigger className={cn(
                          "h-14 rounded-2xl border-none shadow-inner font-bold text-base",
                          PRIORITY_CONFIG[task.priority]?.bg, PRIORITY_CONFIG[task.priority]?.color
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl">
                           {Object.keys(PRIORITY_CONFIG).map((key) => {
                             const cfg = PRIORITY_CONFIG[key];
                             const Icon = cfg.icon;
                             return (
                               <SelectItem key={key} value={key} className="p-2.5">
                                 <div className="flex items-center gap-3">
                                   <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center", cfg.bg)}>
                                     <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                                   </div>
                                   <span className={cn("text-[10px] font-black uppercase tracking-tight", cfg.color)}>{cfg.label}</span>
                                 </div>
                               </SelectItem>
                             );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3 text-left">
                       <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Linked Project</Label>
                       <div className="h-14 px-6 rounded-2xl bg-muted/10 border border-transparent flex items-center gap-3">
                          <Briefcase className="h-4 w-4 text-primary opacity-40" />
                          <span className="text-sm font-bold text-slate-700 truncate">{task.projectName || "Standalone Node"}</span>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1">
                      <Activity className="h-4 w-4" /> Timeline Matrix
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       <div className="p-5 bg-muted/20 rounded-2xl border border-transparent flex flex-col gap-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase">Target Deadline</p>
                          <div className="flex items-center justify-between">
                             <p className="text-sm font-bold text-slate-700">{task.dueDate || 'ASAP'}</p>
                             <Calendar className="h-3.5 w-3.5 text-primary opacity-20" />
                          </div>
                       </div>
                       <div className="p-5 bg-muted/20 rounded-2xl border border-transparent flex flex-col gap-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase">Initialized On</p>
                          <div className="flex items-center justify-between">
                             <p className="text-sm font-bold text-slate-700">{task.createdAt?.toDate ? format(task.createdAt.toDate(), 'dd MMM yy') : 'Recently'}</p>
                             <Clock className="h-3.5 w-3.5 text-primary opacity-20" />
                          </div>
                       </div>
                       <div className="p-5 bg-muted/20 rounded-2xl border border-transparent flex flex-col gap-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase">Last Sync</p>
                          <div className="flex items-center justify-between">
                             <p className="text-sm font-bold text-slate-700">{task.lastUpdate?.toDate ? format(task.lastUpdate.toDate(), 'HH:mm') : '--:--'}</p>
                             <Zap className="h-3.5 w-3.5 text-primary opacity-20" />
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Internal Protocol / Description</Label>
                     <Textarea 
                       value={localProjectDesc} 
                       onChange={(e) => setLocalProjectDesc(e.target.value)}
                       onBlur={(e) => handleUpdateField('description', e.target.value)} 
                       className="min-h-[120px] rounded-3xl bg-muted/20 border-none shadow-inner p-6 text-sm font-medium leading-relaxed" 
                       placeholder="Special instructions or protocols..."
                     />
                  </div>
                </TabsContent>

                <TabsContent value="checklist" className="m-0 space-y-8 animate-in fade-in">
                  <div className="p-6 bg-primary/5 rounded-[2.5rem] border-2 border-dashed border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="text-center sm:text-left">
                       <p className="text-[10px] font-black uppercase text-primary tracking-widest">Stage Progress Node</p>
                       <h3 className="text-2xl font-black text-slate-900 mt-1">{task.subtasks?.filter((s:any)=>s.isCompleted).length || 0} / {task.subtasks?.length || 0} Closed</h3>
                    </div>
                    <Progress value={subtaskProgress} className="h-1.5 w-full sm:w-40 bg-primary/10" />
                  </div>

                  <div className="space-y-4">
                    {task.subtasks?.map((st: any) => (
                      <div key={st.id} className="flex items-center gap-4 sm:gap-5 p-4 bg-white rounded-2xl border border-border/50 hover:border-primary/20 transition-all group animate-in slide-in-from-left-2">
                        <div 
                          className={cn(
                            "h-8 w-8 rounded-xl border-2 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-sm",
                            st.isCompleted ? "bg-primary border-primary text-white" : "bg-white border-muted"
                          )}
                          onClick={() => handleToggleStep(st.id)}
                        >
                          {st.isCompleted && <CheckCircle2 className="h-5 w-5" />}
                        </div>
                        <Input 
                          value={st.text}
                          onChange={(e) => {
                            const updated = task.subtasks.map((s:any) => s.id === st.id ? { ...s, text: e.target.value } : s);
                            handleUpdateField('subtasks', updated);
                          }}
                          className={cn(
                            "h-10 text-sm border-none bg-transparent p-0 focus-visible:ring-0 font-bold flex-1",
                            st.isCompleted && "line-through opacity-40 font-medium"
                          )}
                        />
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveStep(st.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <div className="flex gap-3 pt-6 border-t border-dashed">
                      <Input 
                        placeholder="Define naya step..." 
                        value={newStepText} 
                        onChange={(e) => setNewStepText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddStep()}
                        className="h-14 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-sm px-6"
                      />
                      <Button size="icon" onClick={handleAddStep} className="h-14 w-14 rounded-2xl bg-primary text-white shadow-xl shrink-0 active:scale-90 transition-transform">
                        <Plus className="h-6 w-6" />
                      </Button>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="sm" 
                      disabled={isAiLoading}
                      onClick={handleAiSuggest}
                      className="w-full h-14 rounded-2xl border-2 border-dashed border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest mt-8 hover:bg-primary/5 gap-2"
                    >
                      {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 fill-primary" />}
                      AI Suggest Optimization Steps
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="insights" className="m-0 space-y-6 animate-in fade-in">
                   <Card className="border-none bg-slate-900 text-white rounded-[2.5rem] p-8 sm:p-12 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 group-hover:scale-110 transition-transform"><BrainCircuit className="h-60 w-60" /></div>
                      <div className="relative z-10 space-y-10 text-left">
                        <div className="flex items-center gap-4">
                           <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><Bot className="h-6 w-6 text-accent" /></div>
                           <div><h4 className="text-xl font-bold uppercase tracking-tight">AI Strategy Node</h4><p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Cognitive Workload Analytics</p></div>
                        </div>
                        <div className="space-y-6">
                           <p className="text-base leading-relaxed italic text-slate-300">
                             "Maine is task node ko analyze kiya hai. Iska completion trajectory normal hai par deadline pressure high hai. Sub-agent assign karne se efficiency 2.5x badh sakti hai."
                           </p>
                           <div className="p-6 bg-white/5 rounded-3xl border border-white/10 flex items-start gap-4">
                              <ShieldCheck className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                 <p className="text-[10px] font-black uppercase text-accent">Optimization Flag</p>
                                 <p className="text-[11px] text-slate-400 font-bold uppercase leading-relaxed tracking-widest">Prioritize Step #3 for maximum throughput</p>
                              </div>
                           </div>
                        </div>
                      </div>
                   </Card>
                </TabsContent>
              </div>
            </Tabs>
          </Card>
        </div>

        <div className="md:col-span-4 space-y-8">
           <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border text-left">
              <CardHeader className="bg-muted/30 border-b py-5 px-6"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><History className="h-4 w-4" /> Activity Log</CardTitle></CardHeader>
              <div className="p-6">
                <ScrollArea className="h-80 pr-4">
                  <div className="space-y-8 relative pl-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-muted/40">
                    {(task.logs || []).length === 0 ? <p className="text-[9px] font-black uppercase text-slate-300 italic">No activity logged.</p> : (task.logs || []).map((log: any, i: number) => (
                      <div key={i} className="relative flex flex-col gap-1.5 animate-in slide-in-from-left-2" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="absolute -left-[20px] h-3 w-3 rounded-full bg-white border-2 border-primary z-10 shadow-sm" />
                        <p className="text-[11px] font-black text-slate-800 uppercase leading-none tracking-tight">{log.action}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">{log.by}</span>
                          <span className="text-[8px] font-bold text-slate-300 uppercase">{new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    )).reverse()}
                  </div>
                </ScrollArea>
              </div>
           </Card>

           <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 space-y-6 shadow-inner text-left">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center shadow-md"><CheckCircle2 className="h-5 w-5 text-primary" /></div>
                <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">Security Node</p>
              </div>
              <p className="text-[11px] text-primary/70 leading-relaxed font-medium italic">"Is task ki saari activities encrypted hain aur sirf authorized specialists ko hi dikh rahi hain."</p>
           </div>

           <Button onClick={handleDelete} variant="ghost" className="w-full h-12 text-destructive hover:bg-red-50 font-black uppercase text-[10px] tracking-widest rounded-xl">
             <Trash2 className="mr-2 h-4 w-4" /> Erase Task Node
           </Button>
        </div>
      </div>

      <div className="fixed bottom-6 left-0 right-0 px-4 md:hidden z-40">
         <Button onClick={() => { handleUpdateField('status', 'completed'); toast({title:"Task Finalized"}); }} className="w-full h-16 bg-primary text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all">
            <CheckCircle2 className="h-6 w-6 mr-3" /> Mark Node Complete
         </Button>
      </div>
    </div>
  );
}
