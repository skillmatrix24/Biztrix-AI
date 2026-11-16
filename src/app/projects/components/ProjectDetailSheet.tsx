"use client";

import { useState, useMemo } from "react";
import {
  CheckCircle2,
  Target,
  Globe,
  Copy,
  Check,
  SmartphoneNfc,
  Receipt,
  Wallet,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Loader2,
  Trash,
  Building2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Project, ProjectStatus, Task } from "@/lib/mock-db";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase";
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
  statusConfig,
}: ProjectDetailSheetProps) {
  const firestore = useFirestore();
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseParticulars, setExpenseParticulars] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Expense");

  const transactionsQuery = useMemoFirebase(() => {
    if (!businessId || !project?.id) return null;
    return query(
      collection(firestore, "businesses", businessId, "cashbook"),
      where("projectId", "==", project.id)
    );
  }, [firestore, businessId, project?.id]);

  const { data: projectTransactions, isLoading: isTransactionsLoading } =
    useCollection<any>(transactionsQuery);

  const stats = useMemo(() => {
    if (!projectTransactions) return { expense: 0, revenue: 0, profit: 0 };
    const expense = projectTransactions
      .filter((t) => t.type === "debit")
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const revenue = projectTransactions
      .filter((t) => t.type === "credit")
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    return { expense, revenue, profit: revenue - expense };
  }, [projectTransactions]);

  const projectTasks = useMemo(
    () => (project ? tasks.filter((t) => t.projectId === project.id) : []),
    [tasks, project]
  );
  const completed = projectTasks.filter((t) => t.status === "completed").length;
  const total = projectTasks.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const teamWhatsAppHref = useMemo(() => {
    if (!project) return null;
    const pendingTasks = projectTasks.filter((t) => t.status !== "completed");
    if (pendingTasks.length === 0) return null;
    const taskListString = pendingTasks
      .map((t) => `- ${t.title} (${t.assignedName || "Unassigned"})`)
      .join("\n");
    const message = `Project Update: ${project.title}\nProgress: ${progress}% Complete (${completed}/${total} Tasks)\n\nPending Tasks:\n${taskListString}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }, [project, projectTasks, progress, completed, total]);

  if (!project) return null;

  const handleRecordExpense = () => {
    if (!expenseAmount || !expenseParticulars || !businessId || !project.id) return;

    const cashbookRef = collection(firestore, "businesses", businessId, "cashbook");
    addDocumentNonBlocking(cashbookRef, {
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
    toast({ title: "Expense Recorded", description: "Syncing with Cash Book..." });
  };

  const deleteTransaction = (id: string) => {
    if (!businessId) return;
    deleteDocumentNonBlocking(doc(firestore, "businesses", businessId, "cashbook", id));
    toast({ title: "Record Removed", variant: "destructive" });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col border-l border-slate-200 bg-white overflow-hidden">
        <div className="p-6 bg-slate-900 text-white shrink-0 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Badge
              variant="outline"
              className="bg-white/10 text-white border-white/20 font-mono text-xs px-2.5 py-0.5"
            >
              ID: {project.id.slice(-6).toUpperCase()}
            </Badge>
            <div className="flex gap-2">
              {teamWhatsAppHref ? (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-8 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg"
                >
                  <a href={teamWhatsAppHref} target="_blank" rel="noopener noreferrer">
                    <SmartphoneNfc className="h-3.5 w-3.5 mr-1.5" /> Sync Team
                  </a>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    toast({
                      title: "No Pending Tasks",
                      description: "Team is already caught up!",
                    })
                  }
                  className="h-8 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg"
                >
                  <SmartphoneNfc className="h-3.5 w-3.5 mr-1.5" /> Sync Team
                </Button>
              )}
              <Select
                value={project.status}
                onValueChange={(v: any) => onUpdateStatus(project.id, v)}
              >
                <SelectTrigger className="h-8 bg-white/10 border-white/20 text-white text-xs font-medium rounded-lg w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(statusConfig).map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {statusConfig[s as ProjectStatus].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <SheetHeader className="text-left space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-[11px] capitalize border-white/20 text-slate-200 bg-white/5 h-5 px-2"
              >
                {project.clientType === "customer" ? (
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                ) : (
                  <AlertCircle className="h-3 w-3 mr-1" />
                )}
                {project.clientType}
              </Badge>
              <span className="text-xs font-medium text-slate-300">{project.clientName}</span>
            </div>
            <SheetTitle className="text-xl text-white font-bold leading-snug">
              {project.title}
            </SheetTitle>
            <p className="text-slate-300 text-xs line-clamp-2">
              {project.description || "No description provided."}
            </p>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-slate-600" /> Project Financials
              </h4>
              <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold rounded-lg"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Record Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px] rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden">
                  <DialogHeader className="p-5 bg-slate-900 text-white text-left">
                    <DialogTitle className="text-base font-bold text-white">
                      Record Project Expense
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-300">
                      Sync this outflow with your main Cash Book.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="p-5 space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Particulars</Label>
                      <Input
                        value={expenseParticulars}
                        onChange={(e) => setExpenseParticulars(e.target.value)}
                        placeholder="e.g. Raw material purchase"
                        className="h-10 rounded-xl border-slate-200"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Amount (₹)
                        </Label>
                        <Input
                          type="number"
                          value={expenseAmount}
                          onChange={(e) => setExpenseAmount(e.target.value)}
                          placeholder="0.00"
                          className="h-10 rounded-xl border-slate-200 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Category</Label>
                        <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                          <SelectTrigger className="h-10 rounded-xl border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
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
                  <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200">
                    <Button
                      type="button"
                      onClick={handleRecordExpense}
                      className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl"
                    >
                      Record & Sync to Cashbook
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500">Total Incurred Cost</p>
                <p className="text-base font-bold font-mono tabular-nums text-rose-700 mt-0.5">
                  ₹{stats.expense.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500">Revenue Collected</p>
                <p className="text-base font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
                  ₹{stats.revenue.toLocaleString()}
                </p>
              </div>
              <div
                className={cn(
                  "col-span-2 p-4 rounded-xl border flex items-center justify-between",
                  stats.profit >= 0
                    ? "bg-emerald-50/70 border-emerald-200"
                    : "bg-rose-50/70 border-rose-200"
                )}
              >
                <div>
                  <p className="text-xs font-medium text-slate-600">Live Project P&L</p>
                  <p
                    className={cn(
                      "text-xl font-bold font-mono tabular-nums mt-0.5",
                      stats.profit >= 0 ? "text-emerald-700" : "text-rose-700"
                    )}
                  >
                    ₹{stats.profit.toLocaleString()}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                  {stats.profit >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-rose-600 rotate-90" />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600">Recent Entries</p>
              {isTransactionsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto text-slate-400" />
              ) : projectTransactions?.length === 0 ? (
                <p className="text-xs text-center text-slate-400 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  No transactions found.
                </p>
              ) : (
                projectTransactions?.slice(0, 5).map((trans: any) => (
                  <div
                    key={trans.id}
                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {trans.particulars.split(" (")[0]}
                      </p>
                      <p className="text-xs text-slate-500 font-mono tabular-nums">
                        {trans.date} · {trans.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-xs font-semibold font-mono tabular-nums",
                          trans.type === "credit" ? "text-emerald-700" : "text-rose-700"
                        )}
                      >
                        {trans.type === "credit" ? "+" : "-"}₹
                        {parseFloat(trans.amount).toLocaleString()}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Delete transaction"
                        className="h-7 w-7 text-rose-500 hover:bg-rose-50"
                        onClick={() => deleteTransaction(trans.id)}
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
              <Target className="h-4 w-4 text-slate-600" /> Work Progress
            </h4>
            <div className="space-y-2">
              <Progress value={progress} className="h-2 rounded-full" />
              <div className="flex justify-between text-xs font-mono tabular-nums text-slate-500">
                <span>{completed} Tasks Closed</span>
                <span className="font-semibold text-slate-900">{progress}% Done</span>
              </div>
            </div>
          </section>

          <section className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Client Profile</h4>
                <p className="text-xs text-slate-500">{project.clientName}</p>
              </div>
            </div>
            {project.clientType === "lead" && (
              <Alert className="bg-amber-50 border-amber-200 p-3 rounded-xl">
                <ShieldCheck className="h-4 w-4 text-amber-700" />
                <AlertDescription className="text-xs text-amber-800 font-medium">
                  This client is currently a Lead. Convert to Customer to enable GST Billing.
                </AlertDescription>
              </Alert>
            )}
          </section>

          <section className="p-5 bg-slate-900 text-white rounded-2xl space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-300" /> Progress Tracking URL
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Allow client to view live progress.
                </p>
              </div>
              <Switch
                aria-label="Enable public progress tracking link"
                checked={project.sharePublic}
                onCheckedChange={() => onTogglePublic(project.id, !!project.sharePublic)}
              />
            </div>

            {project.sharePublic && (
              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center gap-2 p-2.5 bg-white/10 rounded-xl border border-white/15 text-xs font-mono text-slate-200">
                  <span className="truncate flex-1">
                    {`${typeof window !== "undefined" ? window.location.origin : ""}/projects/track/${businessId}/${project.id}`}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Copy tracking link"
                    className="h-7 w-7 shrink-0 text-white hover:bg-white/10"
                    onClick={() => onCopyLink(project)}
                  >
                    {isCopied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            disabled={project.clientType === "lead"}
            onClick={() => onConvertToBill(project)}
            className="flex-1 h-10 bg-white font-semibold text-xs gap-2 rounded-xl border-slate-200 text-slate-800"
          >
            <Receipt className="h-4 w-4" />
            {project.clientType === "lead" ? "Convert Lead First" : "Generate GST Bill"}
          </Button>
          <Button
            type="button"
            onClick={() => onUpdateStatus(project.id, "completed")}
            className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs gap-2 rounded-xl"
          >
            <CheckCircle2 className="h-4 w-4" /> Mark Complete
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}