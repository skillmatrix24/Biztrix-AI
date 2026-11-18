
"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Coins, 
  Plus, 
  Calendar, 
  TrendingUp, 
  History, 
  Trash2, 
  Edit2, 
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Filter,
  Search,
  Zap,
  Briefcase,
  Building2,
  Wifi,
  Lightbulb,
  CreditCard,
  FileText,
  Notebook,
  Loader2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiStatCard, PageHeader, SectionCard } from "@/components/ui/editorial";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { fixedExpenses as initialExpenses, MOCK_TENANT_ID, FixedExpense } from "@/lib/mock-db";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useFirestore, addDocumentNonBlocking, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { collection, serverTimestamp, doc } from "firebase/firestore";
import { useMarketplaceCatalog } from "@/hooks/use-marketplace-catalog";
import { evaluateCoreQuota } from "@/lib/marketplace-catalog";
import { CoreQuotaBanner } from "@/components/quota-upgrade-banner";

const EXPENSE_CATEGORIES = ["Rent", "Electricity", "Internet", "Salary", "Subscription", "Insurance", "EMI", "Other"];

export default function FixedExpensesPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  // Dynamic Business Resolution
  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const { limits } = useMarketplaceCatalog();
  const currencySymbol = getCurrencySymbol(business?.currency);

  const [expenses, setExpenses] = useState<FixedExpense[]>(initialExpenses);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const fixedExpenseQuota = useMemo(
    () => evaluateCoreQuota("fixed_expenses", expenses.length, { limits, business }),
    [expenses.length, limits, business]
  );

  // Form State
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<any>("Rent");
  const [frequency, setFrequency] = useState<any>("Monthly");
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setStartDate(new Date().toISOString().split('T')[0]);
  }, []);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [expenses, searchTerm]);

  const totalMonthly = useMemo(() => {
    return expenses.reduce((sum, e) => {
      if (e.frequency === 'Weekly') return sum + (e.amount * 4);
      if (e.frequency === 'Monthly') return sum + e.amount;
      if (e.frequency === 'Quarterly') return sum + (e.amount / 3);
      if (e.frequency === 'Yearly') return sum + (e.amount / 12);
      return sum;
    }, 0);
  }, [expenses]);

  const handleAddExpense = () => {
    if (fixedExpenseQuota.isReached) {
      toast({
        variant: "destructive",
        title: "Fixed Expense Quota Reached",
        description: `Your plan allows up to ${fixedExpenseQuota.limit} recurring overheads. Activate ${fixedExpenseQuota.menu.addonLabel} in Marketplace for unlimited entries.`,
      });
      return;
    }
    if (!name || !amount || !businessId) {
      toast({ variant: "destructive", title: "Error", description: "Please fill all required fields and ensure business context." });
      return;
    }

    const nextDue = new Date(startDate);
    if (frequency === 'Weekly') nextDue.setDate(nextDue.getDate() + 7);
    else if (frequency === 'Monthly') nextDue.setMonth(nextDue.getMonth() + 1);
    else if (frequency === 'Quarterly') nextDue.setMonth(nextDue.getMonth() + 3);
    else nextDue.setFullYear(nextDue.getFullYear() + 1);

    const newExpense: FixedExpense = {
      id: `fe${Date.now()}`,
      tenantId: businessId,
      name,
      amount: parseFloat(amount),
      category,
      frequency,
      startDate,
      nextDueDate: nextDue.toISOString().split('T')[0],
      status: 'Active',
      notes: category === 'Other' ? notes : undefined
    };

    // AUTO INTEGRATION WITH CASHBOOK
    const cashbookRef = collection(firestore, 'businesses', businessId, 'cashbook');
    addDocumentNonBlocking(cashbookRef, {
      businessId, 
      type: 'debit',
      amount: parseFloat(amount),
      particulars: `Fixed Expense: ${name}`,
      category: category,
      entryBy: userProfile?.name || 'System (Fixed Expense)',
      date: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp()
    });

    setExpenses([newExpense, ...expenses]);
    setIsAddOpen(false);
    resetForm();
    toast({ title: "Expense Recorded", description: `${name} has been added and posted to Cash Book.` });
  };

  const resetForm = () => {
    setName(""); setAmount(""); setCategory("Rent"); setFrequency("Monthly");
    setStartDate(new Date().toISOString().split('T')[0]);
    setNotes("");
  };

  if (isProfileLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 pb-16 text-left">
      <CoreQuotaBanner quota={fixedExpenseQuota} />

      <PageHeader
        breadcrumb="Back Office / Fixed Expenses"
        title="Fixed Overheads"
        description="Manage recurring bills, rent, salaries, and monthly subscriptions."
        icon={Coins}
        actions={
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button disabled={fixedExpenseQuota.isReached} className="h-10 px-5 text-xs font-semibold rounded-xl">
                <Plus className="mr-1.5 h-4 w-4" /> Add Recurring
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[460px] rounded-2xl border border-slate-200 bg-white shadow-lg p-0 overflow-hidden">
              <DialogHeader className="p-6 bg-slate-900 text-white text-left">
                <DialogTitle className="text-lg font-bold text-white">Add Fixed Expense</DialogTitle>
                <DialogDescription className="text-slate-300 text-xs">Configure recurring commitments and auto-post to Cashbook.</DialogDescription>
              </DialogHeader>
              <div className="p-5 sm:p-6 space-y-4 text-left">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Expense Name *</Label>
                  <Input placeholder="e.g. Shop Rent" value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-xl" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Amount ({currencySymbol}) *</Label>
                    <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 rounded-xl font-mono tabular-nums font-semibold" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {EXPENSE_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Cycle</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                        <SelectItem value="Yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Start Date</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 rounded-xl font-mono tabular-nums" />
                  </div>
                </div>

                {category === 'Other' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Notebook className="h-3.5 w-3.5 text-slate-500" /> Note
                    </Label>
                    <Textarea 
                      placeholder="Specific details about this expense..." 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      className="min-h-[80px] rounded-xl border-slate-200 text-xs" 
                    />
                  </div>
                )}
              </div>
              <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200">
                <Button className="w-full h-11 text-xs font-semibold rounded-xl" onClick={handleAddExpense}>
                  Save Recurring Expense
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <KpiStatCard
          label="Monthly Budget"
          value={`${currencySymbol}${Math.round(totalMonthly).toLocaleString("en-IN")}`}
          subtext="Normalized monthly commitment"
          tone="dark"
          icon={Coins}
        />
        <KpiStatCard
          label="Active Schedules"
          value={expenses.length}
          subtext="Configured recurring commitments"
          icon={Calendar}
        />
      </div>

      <SectionCard
        title="Recurring Commitments"
        description="Search or review scheduled fixed expenses"
        bodyClassName="p-0"
        headerRight={
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 rounded-xl bg-slate-50 border-slate-200 text-xs w-full"
            />
          </div>
        }
      >
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Expense Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right pr-6">Next Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-sm text-slate-500">
                  No fixed expenses match your search.
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell className="pl-6 py-4">
                    <span className="text-sm font-semibold text-slate-900">{exp.name}</span>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-slate-600">
                    {exp.category}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{exp.frequency}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums font-bold text-sm text-slate-900">
                    {currencySymbol}{exp.amount.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-end flex-col">
                      <span className="text-xs font-mono tabular-nums font-semibold text-slate-900">{exp.nextDueDate}</span>
                      <span className="text-[11px] text-slate-500">Scheduled</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
