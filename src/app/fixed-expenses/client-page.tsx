
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

  const currencySymbol = getCurrencySymbol(business?.currency);

  const [expenses, setExpenses] = useState<FixedExpense[]>(initialExpenses);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

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
    <div className="space-y-6 md:space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
            <Coins className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">Fixed Overheads</h2>
            <p className="text-xs md:text-sm text-muted-foreground">Manage recurring bills, rent, and monthly subscriptions.</p>
          </div>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 shadow-lg h-10 px-6 font-bold uppercase text-xs tracking-widest">
              <Plus className="mr-2 h-4 w-4" /> Add Recurring
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px] rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
            <DialogHeader className="p-6 bg-primary text-white">
              <DialogTitle className="text-xl">Add Fixed Expense</DialogTitle>
              <DialogDescription className="text-white/70 text-xs font-medium uppercase tracking-wider">Configure recurring commitments.</DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Expense Name *</Label>
                <Input placeholder="e.g. Shop Rent" value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Amount ({currencySymbol}) *</Label>
                  <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11 rounded-xl font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {EXPENSE_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Cycle</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                      <SelectItem value="Yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11 rounded-xl" />
                </div>
              </div>

              {category === 'Other' && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <Notebook className="h-3 w-3" /> Note
                  </Label>
                  <Textarea 
                    placeholder="Specific details about this expense..." 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    className="min-h-[80px] rounded-xl bg-muted/20 border-none shadow-inner text-xs" 
                  />
                </div>
              )}
            </div>
            <DialogFooter className="p-6 bg-muted/10 border-t">
              <Button className="w-full h-12 bg-primary font-bold uppercase text-xs tracking-widest shadow-xl rounded-xl" onClick={handleAddExpense}>
                Initialize Recurring Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6 bg-white rounded-2xl shadow-sm border-none">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Monthly Budget</p>
          <div className="text-2xl font-bold text-primary">{currencySymbol}{totalMonthly.toLocaleString()}</div>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/10">
              <TableHead className="pl-6 text-[10px] font-bold uppercase">Expense Name</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Category</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Frequency</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase">Amount</TableHead>
              <TableHead className="text-right pr-6 text-[10px] font-bold uppercase">Next Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.map((exp) => (
              <TableRow key={exp.id} className="hover:bg-muted/5 group">
                <TableCell className="pl-6 py-4">
                  <span className="text-sm font-bold text-primary">{exp.name}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[8px] font-bold h-4 uppercase">{exp.category}</Badge>
                </TableCell>
                <TableCell className="text-xs font-medium text-muted-foreground">{exp.frequency}</TableCell>
                <TableCell className="text-right font-bold text-sm text-primary">{currencySymbol}{exp.amount.toLocaleString()}</TableCell>
                <TableCell className="text-right pr-6">
                  <div className="flex items-end flex-col">
                    <span className="text-xs font-bold">{exp.nextDueDate}</span>
                    <span className="text-[8px] font-bold text-muted-foreground uppercase">Scheduled</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
