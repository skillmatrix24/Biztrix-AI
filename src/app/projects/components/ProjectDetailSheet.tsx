"use client";

import { useState, useMemo } from "react";
import { 
  CheckCircle2, 
  Edit2, 
  Trash2, 
  Target, 
  Globe, 
  Copy, 
  Check, 
  MessageSquare, 
  Mail, 
  ExternalLink, 
  SmartphoneNfc, 
  Receipt, 
  LayoutList, 
  Briefcase,
  Users,
  Wallet,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Loader2,
  Trash,
  Building2,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Project, ProjectStatus, Task } from "@/lib/mock-db";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, where, serverTimestamp, doc } from "firebase/firestore";

interface ProjectDetailSheetProps {
  project: Project | null;
  tasks: Task[];
  businessId?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (id: string, status: ProjectStatus) => void;
  onTogglePublic: (id: string, current: boolean) => void;
  onCopyLink: (p: any) => void;
  onConvertToBill: (p: any) => void;
  isCopied: boolean;
  statusConfig: any;
}

export function ProjectDetailSheet({
  project,
  tasks,
  businessId,
  isOpen,
  onOpenChange,
  onUpdateStatus,
  onTogglePublic,
  onCopyLink,
  onConvertToBill,
  isCopied,
  statusConfig
}: ProjectDetailSheetProps) {
  const firestore = useFirestore();
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseParticulars, setExpenseParticulars] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Expense");

  // Fetch Project-specific Transactions from Cashbook
  const transactionsQuery = useMemoFirebase(() => {
    if (!businessId || !project?.id) return null;
    return query(
      collection(firestore, 'businesses', businessId, 'cashbook'),
      where('projectId', '==', project.id)
    );
  }, [firestore, businessId, project?.id]);

  const { data: projectTransactions, isLoading: isTransactionsLoading } = useCollection<any>(transactionsQuery);

  const stats = useMemo(() => {
    if (!projectTransactions) return { expense: 0, revenue: 0, profit: 0 };
    const expense = projectTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const revenue = projectTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    return { expense, revenue, profit: revenue - expense };
  }, [projectTransactions]);

  if (!project) return null;

  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const completed = projectTasks.filter(t => t.status === 'completed').length;
  const total = projectTasks.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleSyncTeamWhatsApp = () => {
    const pendingTasks = projectTasks.filter(t => t.status !== 'completed');
    if (pendingTasks.length === 0) {
      toast({ title: "No Pending Tasks", description: "Team is already caught up!" });
      return;
    }

    const taskListString = pendingTasks.map(t => {
      const priorityEmoji = t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟠' : '🔵';
      return `${priorityEmoji} *${t.title}* (${t.assignedName})`;
    }).join('\n');

    const message = `🚀 *Project Update: ${project.title}*\n━━━━━━━━━━━━━━━━\n📊 *Progress:* ${progress}% Complete\n✅ *Closed:* ${completed}/${total} Tasks\n\n🎯 *Pending Task List:*\n${taskListString}\n\nTeam, please prioritize these items. 🎯`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    toast({ title: "WhatsApp Sync Prepared", description: "Digest generated for the team." });
  };

  const handleRecordExpense = () => {
    if (!expenseAmount || !expenseParticulars || !businessId || !project.id) return;

    const cashbookRef = collection(firestore, 'businesses', businessId, 'cashbook');
    addDocumentNonBlocking(cashbookRef, {
      type: 'debit',
      amount: parseFloat(expenseAmount),
      particulars: `${expenseParticulars} (Project: ${project.title})`,
      category: expenseCategory,
      projectId: project.id,
      date: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp()
    });

    setIsAddExpenseOpen(false);
    setExpenseAmount("");
    setExpenseParticulars("");
    toast({ title: "Expense Recorded", description: "Syncing with Cash Book..." });
  };

  const deleteTransaction = (id: string) => {
    if (!businessId) return;
    deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'cashbook', id));
    toast({ title: "Record Removed", variant: "destructive" });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col border-none shadow-2xl overflow-hidden">
        <div className="p-8 bg-primary text-primary-foreground shrink-0">
          <div className="flex items-center justify-between mb-6">
            <Badge className="bg-white/20 text-white border-none uppercase text-[9px] font-bold tracking-widest px-3 py-1 rounded-full">
              ID: {project.id.slice(-6).toUpperCase()}
            </Badge>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSyncTeamWhatsApp}
                className="h-8 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase rounded-lg border-none"
              >
                <SmartphoneNfc className="h-3.5 w-3.5 mr-1.5" /> Sync Team
              </Button>
              <Select 
                value={project.status} 
                onValueChange={(v: any) => onUpdateStatus(project.id, v)}
              >
                <SelectTrigger className="h-8 bg-white/10 border-white/20 text-white text-[10px] font-bold uppercase rounded-lg w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(statusConfig).map(s => (
                    <SelectItem key={s} value={s} className="text-xs">{statusConfig[s as ProjectStatus].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetHeader className="text-left space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[8px] font-black uppercase border-white/20 text-white/80 bg-white/5 h-4 px-1.5">
                {project.clientType === 'customer' ? <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> : <AlertCircle className="h-2.5 w-2.5 mr-1" />}
                {project.clientType}
              </Badge>
              <span className="text-[10px] font-black uppercase tracking-widest text-accent">{project.clientName}</span>
            </div>
            <SheetTitle className="text-2xl text-white font-bold leading-tight">{project.title}</SheetTitle>
            <p className="text-white/70 text-sm italic line-clamp-2">{project.description || 'No description provided.'}</p>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
          {/* Financials & Profitability Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Project Financials
              </h4>
              <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-[9px] font-bold uppercase border-primary/20 text-primary hover:bg-primary/5">
                    <Plus className="h-3 w-3 mr-1" /> Record Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px] rounded-3xl">
                  <DialogHeader>
                    <DialogTitle>Record Project Expense</DialogTitle>
                    <DialogDescription>Sync this outflow with your main Cash Book.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase">Particulars</Label>
                      <Input value={expenseParticulars} onChange={(e) => setExpenseParticulars(e.target.value)} placeholder="e.g. Raw material purchase" className="h-11 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase">Amount (₹)</Label>
                        <Input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="0.00" className="h-11 rounded-xl font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase">Category</Label>
                        <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                          <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Expense">General</SelectItem>
                            <SelectItem value="Purchase">Materials</SelectItem>
                            <SelectItem value="Salary">Labor</SelectItem>
                            <SelectItem value="Utility">Utility</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleRecordExpense} className="w-full h-12 bg-primary font-bold uppercase text-[10px] tracking-widest shadow-xl rounded-xl">
                      Record & Sync to Cashbook
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/20 rounded-2xl border border-border/50 text-center">
                <p className="text-[8px] font-bold text-muted-foreground uppercase">Total Incurred Cost</p>
                <p className="text-sm font-bold text-destructive">₹{stats.expense.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-center">
                <p className="text-[8px] font-bold text-muted-foreground uppercase">Revenue Collected</p>
                <p className="text-sm font-bold text-green-600">₹{stats.revenue.toLocaleString()}</p>
              </div>
              <div className={cn(
                "col-span-2 p-4 rounded-2xl border flex items-center justify-between",
                stats.profit >= 0 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
              )}>
                <div>
                  <p className="text-[9px] font-bold uppercase text-muted-foreground">Live Project P&L</p>
                  <p className={cn("text-2xl font-bold", stats.profit >= 0 ? "text-green-600" : "text-red-600")}>
                    ₹{stats.profit.toLocaleString()}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                  {stats.profit >= 0 ? <TrendingUp className="h-5 w-5 text-green-600" /> : <ArrowUpRight className="h-5 w-5 text-red-600 rotate-90" />}
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <p className="text-[9px] font-bold text-muted-foreground uppercase px-1">Ledger Sync</p>
              {isTransactionsLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto opacity-20" /> : projectTransactions?.length === 0 ? (
                <p className="text-[10px] text-center italic text-muted-foreground p-4 bg-muted/10 rounded-xl">No transactions found.</p>
              ) : (
                projectTransactions?.slice(0, 5).map((trans: any) => (
                  <div key={trans.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-border/30 group hover:shadow-sm transition-all">
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{trans.particulars.split(' (')[0]}</p>
                      <p className="text-[8px] text-muted-foreground uppercase">{trans.date} • {trans.category}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("text-xs font-bold", trans.type === 'credit' ? "text-green-600" : "text-destructive")}>
                        {trans.type === 'credit' ? '+' : '-'} ₹{parseFloat(trans.amount).toLocaleString()}
                      </span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteTransaction(trans.id)}>
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Work Progress Section */}
          <section className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Target className="h-4 w-4" /> Work Progress
            </h4>
            <div className="space-y-2">
              <Progress value={progress} className="h-2 rounded-full" />
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                <span>{completed} Tasks Closed</span>
                <span className="text-primary">{progress}% Done</span>
              </div>
            </div>
          </section>

          {/* Client Identity Context */}
          <section className="p-6 bg-muted/20 rounded-3xl border border-dashed border-primary/20 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-primary">Client Profile Context</h4>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{project.clientName}</p>
              </div>
            </div>
            {project.clientType === 'lead' && (
              <Alert className="bg-orange-50 border-orange-200 p-3 rounded-2xl">
                <ShieldCheck className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-[10px] text-orange-800 font-bold uppercase">
                  This client is currently a LEAD. Convert to Customer to enable GST Billing.
                </AlertDescription>
              </Alert>
            )}
          </section>

          {/* Public Sharing Section */}
          <section className="p-6 bg-slate-900 text-white rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-accent flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Progress Tracking URL
                </h4>
                <p className="text-[9px] text-slate-400 font-medium leading-relaxed uppercase">
                  Allow client to view live progress.
                </p>
              </div>
              <Switch 
                checked={project.sharePublic} 
                onCheckedChange={() => onTogglePublic(project.id, !!project.sharePublic)}
                className="data-[state=checked]:bg-accent"
              />
            </div>
            
            {project.sharePublic && (
              <div className="pt-4 border-t border-white/10 flex flex-col gap-3 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10 text-[10px] font-mono break-all text-accent">
                  <span className="truncate flex-1">{`${typeof window !== 'undefined' ? window.location.origin : ''}/projects/track/${businessId}/${project.id}`}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 hover:bg-white/10" onClick={() => onCopyLink(project)}>
                    {isCopied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="p-8 border-t bg-muted/20 flex flex-wrap gap-3 shrink-0">
          <Button 
            variant="outline" 
            disabled={project.clientType === 'lead'}
            onClick={() => onConvertToBill(project)} 
            className="flex-1 h-12 bg-white font-bold uppercase text-[10px] gap-2 rounded-xl border-primary/10 text-primary shadow-sm hover:bg-primary/5 transition-all"
          >
            <Receipt className="h-4 w-4" /> {project.clientType === 'lead' ? 'Convert Lead First' : 'Generate GST Bill'}
          </Button>
          <Button onClick={() => onUpdateStatus(project.id, 'completed')} className="flex-1 h-12 bg-primary font-bold uppercase text-[10px] gap-2 rounded-xl shadow-lg hover:bg-primary/90 active:scale-95 transition-all">
            <CheckCircle2 className="h-4 w-4" /> Mark Complete
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}