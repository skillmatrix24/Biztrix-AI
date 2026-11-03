
"use client";

import { useMemo, use, useState, useEffect } from "react";
import { 
  Headset, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  User, 
  Bot, 
  History, 
  ShieldCheck, 
  Building2, 
  Star, 
  Send, 
  SmartphoneNfc, 
  Loader2, 
  Reply, 
  Info, 
  ExternalLink, 
  ChevronRight, 
  BadgeCheck, 
  Zap, 
  Activity, 
  Phone, 
  MessageSquare, 
  AlertTriangle, 
  ShieldAlert, 
  Smartphone, 
  ImageIcon, 
  X, 
  Lock, 
  MessageCircle, 
  PhoneCall, 
  Users,
  Wallet,
  DollarSign,
  Tag,
  Circle,
  Briefcase,
  Handshake,
  LayoutList
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking, useCollection, addDocumentNonBlocking } from "@/firebase";
import { doc, serverTimestamp, collection, query, orderBy, where, getDoc } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

const STATUS_CONFIG: any = {
  'planning': { label: 'Planning', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', icon: Zap },
  'in-progress': { label: 'In Queue', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100', icon: Clock },
  'on-hold': { label: 'Hold', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-100', icon: Clock },
  'completed': { label: 'Resolved', color: 'text-green-600', bg: 'bg-green-50 border-green-100', icon: CheckCircle2 },
  'closed': { label: 'Case Closed', color: 'text-slate-500', bg: 'bg-slate-100 border-slate-200', icon: ShieldCheck },
  'rejected': { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-50 border-red-100', icon: AlertTriangle },
};

const PROJECT_STATUS_CONFIG: any = {
  'planning': { label: 'Strategy Node', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', icon: Zap },
  'in-progress': { label: 'Active Execution', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100', icon: Activity },
  'on-hold': { label: 'Lifecycle Hold', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-100', icon: Clock },
  'completed': { label: 'Fully Delivered', color: 'text-green-600', bg: 'bg-green-50 border-green-100', icon: BadgeCheck },
};

export default function PublicProjectTrackingPage(props: { params: Promise<{ businessId: string, projectId: string }> }) {
  const { businessId, projectId } = use(props.params);
  const firestore = useFirestore();

  // 1. Project Data
  const projectRef = useMemoFirebase(() => 
    businessId && projectId ? doc(firestore, 'businesses', businessId, 'projects', projectId) : null
  , [firestore, businessId, projectId]);
  const { data: project, isLoading: isProjectLoading, error } = useDoc<any>(projectRef);

  // 2. Tasks
  const tasksQuery = useMemoFirebase(() => 
    businessId && projectId ? query(collection(firestore, 'businesses', businessId, 'tasks'), where('projectId', '==', projectId)) : null
  , [firestore, businessId, projectId]);
  const { data: tasksData } = useCollection<any>(tasksQuery);
  const projectTasks = tasksData || [];

  // 3. Client Messages
  const messagesQuery = useMemoFirebase(() => 
    businessId && projectId ? query(collection(firestore, 'businesses', businessId, 'projects', projectId, 'clientMessages'), orderBy('timestamp', 'asc')) : null
  , [firestore, businessId, projectId]);
  const { data: messagesData } = useCollection<any>(messagesQuery);
  const clientMessages = messagesData || [];

  // 4. Financials (Ledger)
  const transactionsQuery = useMemoFirebase(() => {
    if (!businessId || !projectId) return null;
    return query(collection(firestore, 'businesses', businessId, 'cashbook'), where('projectId', '==', projectId))
  }, [firestore, businessId, projectId]);
  const { data: projectTransactions } = useCollection<any>(transactionsQuery);

  // 5. Business Info
  const bizRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(bizRef);

  const [clientRequest, setClientRequest] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("roadmap");
  const [agreementChecked, setAgreementChecked] = useState(false);

  const finStats = useMemo(() => {
    const revenue = (projectTransactions || []).filter((t: any) => t.type === 'credit').reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
    const baseValue = parseFloat(project?.estimatedValue) || 0;
    const addonsValue = (project?.addons || []).reduce((sum: number, a: any) => sum + (parseFloat(a.price) || 0), 0);
    const totalProjectValue = baseValue + addonsValue;
    const remainBalance = totalProjectValue - revenue;

    return { revenue, totalProjectValue, remainBalance, baseValue, addonsValue };
  }, [projectTransactions, project]);

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

  const handleSubmitRequest = () => {
    if (!clientRequest.trim() || !businessId || !project) return;
    setIsSubmitting(true);
    addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'projects', projectId, 'clientMessages'), {
      text: clientRequest, timestamp: new Date().toISOString(), status: 'pending', isRead: false
    });
    setClientRequest(""); setIsSubmitting(false);
    toast({ title: "Request Sent" });
  };

  const handleApproveMilestone = (milestoneId: string) => {
    if (!projectRef || !project) return;
    const updatedMilestones = (project.milestones || []).map((m: any) => 
      m.id === milestoneId ? { ...m, status: 'approved_by_client', approvedAt: new Date().toISOString() } : m
    );
    updateDocumentNonBlocking(projectRef, { milestones: updatedMilestones, lastClientUpdate: serverTimestamp() });
    
    addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'notifications'), {
      recipientId: project.ownerId || business?.ownerId,
      projectId,
      title: "Milestone Approved",
      message: `${project.clientName} has approved a milestone.`,
      type: 'payment',
      isRead: false,
      createdAt: serverTimestamp(),
      businessId
    });
    toast({ title: "Stage Approved" });
  };

  const handleAcceptAgreement = () => {
    if (!projectRef || !agreementChecked || !project) return;
    updateDocumentNonBlocking(projectRef, { isAgreed: true, agreedAt: serverTimestamp(), lastClientUpdate: serverTimestamp() });
    toast({ title: "Agreements Accepted" });
  };

  const currencySymbol = getCurrencySymbol(business?.currency);

  if (isProjectLoading) return <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-primary mb-4" /></div>;
  if (error || !project || project.sharePublic === false) return <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center"><ShieldAlert className="h-8 w-8 text-red-600 mb-6" /><h1 className="text-2xl font-bold">Private Project</h1><p className="text-muted-foreground mt-2">This tracking page is private.</p></div>;

  const statusInfo = PROJECT_STATUS_CONFIG[project.status] || PROJECT_STATUS_CONFIG['planning'];

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-20 overflow-x-hidden text-left">
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm h-16 sm:h-20 flex items-center">
        <div className="max-w-6xl mx-auto px-4 w-full flex items-center justify-between text-left">
          <div className="flex items-center gap-4">
             <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-border/10 shrink-0 overflow-hidden text-left">
                {business?.logoUrl ? <img src={business.logoUrl} className="h-full w-full object-contain p-1" alt="" /> : <div className="h-full w-full bg-primary flex items-center justify-center text-white font-black text-xs sm:text-sm">{business?.name?.charAt(0) || 'B'}</div>}
             </div>
             <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm md:text-base font-black text-slate-900 truncate">{business?.name}</span>
                <span className="text-[8px] sm:text-[9px] font-bold text-green-600 uppercase tracking-widest">Live Progress Node</span>
             </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-8 rounded-xl text-[9px] font-black uppercase text-primary px-2">
            <Link href="/"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Home</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 md:pt-12 space-y-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-8">
           <div className="space-y-2 w-full md:w-auto text-left">
              <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary h-5 px-3">Tracking ID: {projectId.slice(-6).toUpperCase()}</Badge>
              <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">{project.title}</h1>
              <p className="text-xs md:text-sm text-muted-foreground font-medium flex items-center gap-2"><User className="h-3.5 w-3.5" /> Client Identity: {project.clientName}</p>
           </div>
           <div className={cn("w-full md:w-auto px-6 md:px-8 py-4 md:py-5 rounded-[2rem] border-2 flex items-center gap-4 md:gap-5 transition-all shadow-xl", statusInfo.bg)}>
              <statusInfo.icon className={cn("h-6 w-6 md:h-7 md:w-7", statusInfo.color)} />
              <div>
                <p className="text-[9px] font-black uppercase text-muted-foreground opacity-60">Live Status</p>
                <p className={cn("text-lg font-black leading-none mt-1", statusInfo.color)}>{statusInfo.label}</p>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6">
            <div className="flex items-center justify-between pb-1 opacity-60"><span className="text-[9px] font-bold uppercase tracking-widest text-accent">Contract Value</span><DollarSign className="h-4 w-4 text-accent" /></div>
            <div className="text-2xl font-black">{currencySymbol}{finStats.totalProjectValue.toLocaleString()}</div>
          </Card>
          <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between pb-1 opacity-60"><span className="text-[9px] font-bold uppercase tracking-widest text-green-600">Settled Amount</span><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
            <div className="text-2xl font-black text-green-600">{currencySymbol}{finStats.revenue.toLocaleString()}</div>
          </Card>
          <Card className={cn("border-none shadow-sm rounded-2xl p-6 border-l-4", finStats.remainBalance > 0 ? "border-l-orange-500 bg-orange-50/30" : "border-l-green-500 bg-green-50/30")}>
            <div className="flex items-center justify-between pb-1 opacity-60"><span className={cn("text-[9px] font-bold uppercase tracking-widest", finStats.remainBalance > 0 ? "text-orange-600" : "text-green-600")}>Balance Due</span><Wallet className="h-4 w-4" /></div>
            <div className={cn("text-2xl font-black", finStats.remainBalance > 0 ? "text-orange-600" : "text-green-600")}>{currencySymbol}{Math.max(0, finStats.remainBalance).toLocaleString()}</div>
          </Card>
          <Card className="border-none shadow-sm bg-white rounded-3xl p-6">
            <div className="flex items-center justify-between pb-1 opacity-60"><span className="text-[9px] font-bold uppercase tracking-widest">Efficiency</span><Target className="h-4 w-4 text-primary" /></div>
            <div className="flex items-baseline justify-between mt-1"><span className="text-2xl font-black text-primary">{taskStats.progress}%</span><span className="text-[9px] font-bold text-muted-foreground uppercase">{taskStats.completed}/{taskStats.total} TASKS</span></div>
            <Progress value={taskStats.progress} className="h-1 mt-2" />
          </Card>
        </div>

        <Tabs defaultValue="roadmap" className="w-full">
          <TabsList className="bg-white border h-14 p-1.5 rounded-2xl shadow-sm mb-10 flex overflow-x-auto scrollbar-hide">
            <TabsTrigger value="roadmap" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><LayoutList className="h-4 w-4" /> Execution Roadmap</TabsTrigger>
            <TabsTrigger value="milestones" className="flex-1 text-[10px] font-black uppercase px-8 gap-2 text-primary"><Sparkles className="h-4 w-4" /> Milestones & Approval</TabsTrigger>
            <TabsTrigger value="legal" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><Scale className="h-4 w-4" /> Agreements</TabsTrigger>
            <TabsTrigger value="ledger" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><History className="h-4 w-4" /> Ledger</TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-8 space-y-10">
              <TabsContent value="roadmap" className="m-0 space-y-10 text-left">
                {Object.entries(groupedTasks).map(([section, sectionTasks], sIdx) => (
                  <div key={section} className="relative pl-8 animate-in slide-in-from-left-2 duration-500" style={{ animationDelay: `${sIdx * 100}ms` }}>
                    <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-muted/40" />
                    <div className="mb-6 flex items-center gap-4 text-left">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-black text-white z-10 shadow-lg">{sIdx + 1}</div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-primary/60">{section}</h4>
                    </div>
                    <div className="space-y-4">
                      {sectionTasks.map((task: any) => (
                        <div key={task.id} className={cn("p-5 rounded-[2rem] border flex items-center gap-5 bg-white shadow-sm transition-all text-left", task.status === 'completed' ? "border-green-100 opacity-70" : "border-border/50")}>
                          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-all", task.status === 'completed' ? "bg-green-500 border-green-500 text-white" : "bg-muted/30")}>
                            {task.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 opacity-10" />}
                          </div>
                          <span className={cn("text-sm font-bold uppercase tracking-tight truncate text-left", task.status === 'completed' ? "text-slate-400 line-through" : "text-slate-900")}>{task.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="milestones" className="m-0 space-y-8 animate-in fade-in">
                 <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border text-left">
                    <CardHeader className="bg-primary/5 border-b py-6 px-8"><CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><Sparkles className="h-4 w-4" /> Financial Stages & Sign-off</CardTitle></CardHeader>
                    <div className="divide-y">
                       {(!project.milestones || project.milestones.length === 0) ? <div className="p-20 text-center opacity-30 italic text-xs font-black uppercase">No milestones defined by team.</div> : project.milestones.map((m: any) => (
                          <div key={m.id} className={cn("p-8 flex flex-col sm:flex-row items-center justify-between gap-8 transition-all text-left", m.status === 'approved_by_client' ? "bg-green-50/50" : m.status === 'completed' ? "bg-primary/5" : "bg-white")}>
                             <div className="flex items-center gap-6 flex-1 text-left">
                                <div className={cn("h-12 w-12 rounded-full border-4 flex items-center justify-center shrink-0 transition-all", m.status === 'approved_by_client' || m.status === 'invoiced' ? "bg-green-500 border-green-100 text-white" : "bg-slate-100 border-white shadow-inner")}>
                                   {m.status === 'approved_by_client' || m.status === 'invoiced' ? <BadgeCheck className="h-6 w-6" /> : <Clock className="h-6 w-6 opacity-20" />}
                                </div>
                                <div className="min-w-0 text-left">
                                   <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{m.label}</p>
                                   <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary h-5 px-3">Stage Node: {currencySymbol}{parseFloat(m.amount).toLocaleString()}</Badge>
                                      {m.status === 'approved_by_client' && <span className="text-[9px] font-bold text-green-600 uppercase flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Signed off by you</span>}
                                   </div>
                                </div>
                             </div>
                             <div className="shrink-0">
                                {m.status === 'completed' && (
                                  <Button onClick={() => handleApproveMilestone(m.id)} className="h-12 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] px-10 rounded-2xl shadow-xl transition-all active:scale-95">Approve Stage</Button>
                                )}
                                {m.status === 'approved_by_client' && <Badge className="bg-slate-900 text-accent border-none font-black text-[9px] h-8 px-6 uppercase rounded-full shadow-lg">APPROVED</Badge>}
                                {m.status === 'invoiced' && <Badge className="bg-green-600 text-white border-none font-black text-[9px] h-8 px-6 uppercase rounded-full shadow-lg">SETTLED</Badge>}
                                {m.status === 'pending' && <Badge variant="outline" className="text-[9px] font-black uppercase h-8 px-6 border-dashed opacity-40">Awaiting Team</Badge>}
                             </div>
                          </div>
                       ))}
                    </div>
                 </Card>
              </TabsContent>

              <TabsContent value="legal" className="m-0 space-y-8 animate-in fade-in">
                <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border text-left">
                  <CardHeader className="bg-muted/30 border-b py-6 px-8"><CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><Scale className="h-4 w-4" /> Service Agreements</CardTitle></CardHeader>
                  <CardContent className="p-8 space-y-10 text-left">
                    <div className="space-y-8">
                       <div><h5 className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2 mb-3"><FileText className="h-3.5 w-3.5" /> Scope & Delivery Terms</h5><p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">{project.terms || "Standard project terms apply."}</p></div>
                       <Separator className="opacity-40" />
                       <div><h5 className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2 mb-3"><Wallet className="h-3.5 w-3.5" /> Financial & Refund Policy</h5><p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">{project.policy || "Payments are non-refundable after milestone approval."}</p></div>
                    </div>
                    {!project.isAgreed ? (
                      <div className="p-8 bg-primary/5 rounded-[2.5rem] border-2 border-dashed border-primary/20 space-y-8 mt-10">
                        <div className="flex items-start gap-4"><Checkbox id="accept-terms" checked={agreementChecked} onCheckedChange={(v) => setAgreementChecked(!!v)} className="mt-1" /><Label htmlFor="accept-terms" className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed cursor-pointer">I verify that I have reviewed the roadmap and financial nodes. I accept the project agreement for <span className="font-black">"{project.title}"</span>.</Label></div>
                        <Button onClick={handleAcceptAgreement} disabled={!agreementChecked} className="w-full h-16 bg-primary text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">Confirm & Sign-off</Button>
                      </div>
                    ) : (
                      <div className="p-8 bg-green-50 rounded-[2.5rem] border-2 border-green-100 flex items-center gap-5 mt-10 shadow-inner">
                        <CheckCircle2 className="h-10 w-10 text-green-600" />
                        <div><p className="text-lg font-black text-green-800 uppercase tracking-tight">Contract Active</p><p className="text-[9px] text-green-600 font-bold uppercase tracking-widest">Verified on {project.agreedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}</p></div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ledger" className="m-0 animate-in fade-in">
                {project.shareLedger ? (
                  <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border text-left">
                    <CardHeader className="bg-muted/30 border-b py-6 px-8"><CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><History className="h-4 w-4" /> Financial Node Ledger</CardTitle></CardHeader>
                    <div className="overflow-x-auto">
                      <Table className="min-w-[700px]">
                        <TableHeader><TableRow className="bg-muted/10"><TableHead className="pl-8 text-[10px] font-black uppercase h-12">Date</TableHead><TableHead className="text-[10px] font-black uppercase h-12">Transaction Node</TableHead><TableHead className="text-right pr-8 text-[10px] font-black uppercase h-12">Inflow (+)</TableHead></TableRow></TableHeader>
                        <TableBody>{(!projectTransactions || projectTransactions.filter((t:any)=>t.type === 'credit').length === 0) ? <TableRow><TableCell colSpan={3} className="h-60 text-center opacity-30 italic text-sm">No transaction records found.</TableCell></TableRow> : projectTransactions.filter((t:any)=>t.type==='credit').map((trans: any) => (
                          <TableRow key={trans.id} className="hover:bg-muted/5 transition-colors border-b last:border-0"><TableCell className="pl-8 py-5"><span className="text-[10px] font-black text-slate-400 uppercase">{trans.date}</span></TableCell><TableCell><span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{trans.particulars.split(' (')[0]}</span></TableCell><TableCell className="text-right pr-8 font-black text-sm text-green-600">₹{parseFloat(trans.amount).toLocaleString()}</TableCell></TableRow>
                        ))}</TableBody>
                      </Table>
                    </div>
                  </Card>
                ) : (
                  <div className="p-24 text-center bg-white rounded-[3rem] border border-dashed flex flex-col items-center gap-6 opacity-40">
                    <Lock className="h-12 w-12 text-slate-300" />
                    <p className="text-xs font-black uppercase tracking-widest">Financial Ledger Restricted</p>
                  </div>
                )}
              </TabsContent>
            </div>

            <div className="lg:col-span-4 space-y-8 text-left">
              <Card className="border-none shadow-xl bg-white rounded-[2.5rem] border overflow-hidden">
                <CardHeader className="bg-primary/5 border-b py-6 px-8 text-left">
                   <CardTitle className="text-[10px] font-black uppercase text-primary flex items-center gap-2 tracking-widest">
                     <MessageSquare className="h-4 w-4" /> Message specialist team
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <Textarea placeholder="Need clarification or want to request a change?" className="min-h-[140px] rounded-[1.5rem] text-sm border-none bg-muted/20 shadow-inner p-5 font-medium" value={clientRequest} onChange={(e) => setClientRequest(e.target.value)} />
                  <Button onClick={handleSubmitRequest} disabled={!clientRequest.trim() || isSubmitting} className="w-full bg-primary hover:bg-primary/90 text-white font-black h-16 rounded-2xl uppercase text-[10px] tracking-[0.2em] shadow-xl active:scale-95 transition-all">
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 mr-3" />} Shoot Message
                  </Button>
                </CardContent>
              </Card>

              <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white space-y-10 shadow-2xl relative overflow-hidden text-left">
                 <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><SmartphoneNfc className="h-60 w-60" /></div>
                 <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-4">
                       <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><SmartphoneNfc className="h-7 w-7 text-accent" /></div>
                       <div><h4 className="text-xl font-bold uppercase leading-none">Global Hub</h4><p className="text-[9px] font-bold text-slate-400 uppercase mt-2 tracking-widest">Immediate Escalation Node</p></div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium italic">"Connect with our central support desk for project-level emergencies or general billing queries."</p>
                    <div className="grid grid-cols-1 gap-3 pt-2">
                       <Button variant="outline" className="w-full h-12 bg-white/5 border-white/10 text-white font-black uppercase text-[10px] rounded-xl hover:bg-white/10" onClick={() => window.open(`https://wa.me/${business?.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi! I need urgent update on Project ${projectId.slice(-6).toUpperCase()}`)}`)}>Connect via WhatsApp</Button>
                    </div>
                 </div>
                 <div className="p-6 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-4 shadow-inner relative z-10">
                    <ShieldCheck className="h-5 w-5 text-accent shrink-0 mt-0.5 opacity-60" />
                    <p className="text-[10px] font-black uppercase text-slate-300 leading-relaxed tracking-tighter">Your tracking node is encrypted and isolated per tenant security protocol v3.5</p>
                 </div>
              </div>
            </div>
          </div>
        </Tabs>
      </main>

      <footer className="mt-32 py-16 bg-white border-t text-center px-4">
         <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3"><div className="h-10 w-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl">B</div><span className="text-sm font-black uppercase tracking-[0.3em] text-slate-900">Biztrix AI OS</span></div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Secured Multi-tenant Project Tracking Port • Verified v3.5</p>
         </div>
      </footer>
    </div>
  );
}
