
"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  TrendingDown, 
  Filter, 
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Calendar,
  Tag,
  Receipt,
  Download,
  AlertCircle,
  BarChart3,
  Percent,
  CheckCircle2,
  ChevronRight,
  SmartphoneNfc,
  Coins,
  Building2,
  Layout,
  Loader2,
  PieChart as PieChartIcon,
  Activity,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  Cell,
  PieChart,
  Pie,
  Area,
  AreaChart,
  CartesianGrid
} from "recharts";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking, useCollection, addDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp, Timestamp } from "firebase/firestore";
import { startOfMonth, format, subMonths, isWithinInterval, parseISO, startOfDay, endOfDay, endOfMonth } from "date-fns";

const EXPENSE_CATEGORIES = ["Rent", "Salary", "Electricity", "Utility", "Marketing", "Maintenance", "Travel", "Purchase", "Other"];
const INCOME_CATEGORIES = ["Sales", "Services", "Interest", "Refund", "Other"];
const DEFAULT_PAYMENT_MODES = ["Cash", "UPI", "Bank", "Card"];

export default function AccountingPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  
  // Dynamic Profile and Business Resolution
  const userProfileRef = useMemoFirebase(() => 
    !isUserLoading && user?.uid && !user.isAnonymous ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid, isUserLoading, user?.isAnonymous]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);

  const businessId = userProfile?.businessId;
  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const currencySymbol = getCurrencySymbol(business?.currency);
  const dynamicPaymentModes = useMemo(() => business?.paymentModes || DEFAULT_PAYMENT_MODES, [business]);

  // Fetch Full Cashbook Data for Analytics
  const cashbookQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'cashbook'), orderBy('date', 'desc')) : null
  , [firestore, businessId]);
  const { data: transactions = [], isLoading: isTransactionsLoading } = useCollection<any>(cashbookQuery);

  const isPinned = useMemo(() => {
    const layout = (userProfile?.dashboardLayout as any[]) || [];
    return layout.find(w => w.id === 'pulse')?.enabled ?? true;
  }, [userProfile]);

  const toggleDashboardPin = () => {
    if (!userProfileRef || !userProfile) return;
    const currentLayout = [...(userProfile.dashboardLayout || [])];
    const newLayout = currentLayout.map(w => w.id === 'pulse' ? { ...w, enabled: !w.enabled } : w);
    updateDocumentNonBlocking(userProfileRef, { dashboardLayout: newLayout });
    toast({ title: isPinned ? "Unpinned" : "Pinned", description: `Accounting widget ${isPinned ? 'removed from' : 'added to'} Dashboard.` });
  };

  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [period, setPeriod] = useState("thisMonth");
  
  // Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [particulars, setParticulars] = useState("");
  const [mode, setMode] = useState("Cash");
  const [date, setDate] = useState("");

  useEffect(() => {
    setDate(new Date().toISOString().split('T')[0]);
  }, []);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const list = transactions || [];
    return list.filter((t: any) => {
      const tDate = parseISO(t.date);
      let inRange = true;

      if (period === 'today') inRange = t.date === now.toISOString().split('T')[0];
      else if (period === 'thisMonth') {
        const start = startOfMonth(now);
        inRange = isWithinInterval(tDate, { start, end: now });
      } else if (period === 'lastMonth') {
        const start = startOfMonth(subMonths(now, 1));
        const end = endOfMonth(start);
        inRange = isWithinInterval(tDate, { start, end });
      }

      const matchesSearch = t.particulars?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           t.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTab = activeTab === 'all' || 
                        (activeTab === 'income' && t.type === 'credit') || 
                        (activeTab === 'expense' && t.type === 'debit');

      return inRange && matchesSearch && matchesTab;
    });
  }, [transactions, period, searchTerm, activeTab]);

  const stats = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      const amt = parseFloat(t.amount) || 0;
      if (t.type === 'credit') acc.income += amt;
      else acc.expense += amt;
      return acc;
    }, { income: 0, expense: 0 });
  }, [filteredTransactions]);

  const profit = stats.income - stats.expense;
  const margin = stats.income > 0 ? ((profit / stats.income) * 100).toFixed(1) : "0";

  // --- ANALYTICS PROCESSING ---

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'debit').forEach(t => {
      const cat = t.category || 'Other';
      categories[cat] = (categories[cat] || 0) + (parseFloat(t.amount) || 0);
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const cashflowTrend = useMemo(() => {
    const trend: Record<string, { name: string, inflow: number, outflow: number }> = {};
    // Get last 7 days or items in current filter
    filteredTransactions.slice(0, 15).reverse().forEach(t => {
      const day = format(parseISO(t.date), 'dd MMM');
      if (!trend[day]) trend[day] = { name: day, inflow: 0, outflow: 0 };
      if (t.type === 'credit') trend[day].inflow += (parseFloat(t.amount) || 0);
      else trend[day].outflow += (parseFloat(t.amount) || 0);
    });
    return Object.values(trend);
  }, [filteredTransactions]);

  const handleAddEntry = () => {
    if (!businessId || !amount || !particulars) return;
    
    const entryData = {
      businessId,
      type: type === 'income' ? 'credit' : 'debit',
      amount: parseFloat(amount),
      particulars,
      category: category || (type === 'income' ? 'Sales' : 'Other'),
      mode,
      date,
      entryBy: userProfile?.name || 'Admin',
      createdAt: serverTimestamp()
    };

    addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'cashbook'), entryData);
    setIsAddOpen(false);
    setAmount(""); setParticulars(""); setCategory("");
    toast({ title: "Transaction Recorded", description: "Ledger updated successfully." });
  };

  if (isProfileLoading || isUserLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 md:space-y-12 pb-20 text-left">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
            <Wallet className="h-7 w-7 md:h-8 md:w-8 text-primary" />
          </div>
          <div className="text-left">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 leading-none">Profit & Loss</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-black tracking-widest opacity-60">Financial Intelligence Node</p>
              <div className="flex items-center gap-1.5 ml-2 bg-white px-2 py-1 rounded-lg border shadow-sm shrink-0">
                <Layout className="h-3 w-3 text-muted-foreground" />
                <Switch checked={isPinned} onCheckedChange={toggleDashboardPin} className="scale-[0.6] data-[state=checked]:bg-primary" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border shadow-sm flex-1 sm:flex-none">
            <Filter className="h-3.5 w-3.5 text-primary ml-2 opacity-40" />
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-9 w-full sm:w-32 border-none bg-transparent font-black text-[10px] uppercase tracking-widest"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-2xl">
                <SelectItem value="today" className="text-[10px] font-bold uppercase">Today</SelectItem>
                <SelectItem value="thisMonth" className="text-[10px] font-bold uppercase">This Month</SelectItem>
                <SelectItem value="lastMonth" className="text-[10px] font-bold uppercase">Last Month</SelectItem>
                <SelectItem value="all" className="text-[10px] font-bold uppercase">Full History</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
            <Plus className="mr-2 h-4 w-4" /> New Entry
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-border/50">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest">Gross Revenue</span>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{currencySymbol}{stats.income.toLocaleString()}</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-border/50">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest">Total Outflow</span>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{currencySymbol}{stats.expense.toLocaleString()}</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-border/50 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Profit Margin</span>
            <Percent className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700">{margin}%</div>
        </Card>
        <Card className={cn("border-none shadow-xl rounded-3xl p-6 border-l-4 transition-all", profit >= 0 ? "border-l-primary bg-primary/5" : "border-l-destructive bg-destructive/5")}>
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className={cn("text-[10px] font-black uppercase tracking-widest", profit >= 0 ? "text-primary" : "text-destructive")}>Net Balance</span>
            <Wallet className={cn("h-4 w-4", profit >= 0 ? "text-primary" : "text-destructive")} />
          </div>
          <div className={cn("text-2xl font-black", profit >= 0 ? "text-primary" : "text-destructive")}>{currencySymbol}{profit.toLocaleString()}</div>
        </Card>
      </div>

      {/* ANALYTICS SECTION: SPENDING HEATMAP & TRENDS */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
         <div className="lg:col-span-4">
            <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border h-full">
               <CardHeader className="bg-muted/30 border-b py-6 px-8">
                  <div className="flex items-center justify-between">
                     <div className="space-y-1">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                           <PieChartIcon className="h-4 w-4" /> Spending Heatmap
                        </CardTitle>
                        <p className="text-[8px] font-bold text-muted-foreground uppercase">Expense Distribution by Node</p>
                     </div>
                     <Badge variant="outline" className="h-4 text-[7px] font-black border-primary/20 text-primary">REAL-TIME</Badge>
                  </div>
               </CardHeader>
               <CardContent className="p-6 h-[320px]">
                  {categoryData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-xs uppercase font-black">No Expense Traffic</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie
                            data={categoryData}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                             {categoryData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--primary))' : index === 1 ? 'hsl(var(--primary)/0.6)' : index === 2 ? 'hsl(var(--primary)/0.3)' : '#f1f5f9'} />
                             ))}
                          </Pie>
                          <RechartsTooltip 
                             contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                             formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, 'Outflow']}
                          />
                       </PieChart>
                    </ResponsiveContainer>
                  )}
               </CardContent>
               <CardFooter className="px-8 pb-8 pt-0 flex flex-col gap-2">
                  {categoryData.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center justify-between w-full">
                       <div className="flex items-center gap-2">
                          <div className={cn("h-1.5 w-1.5 rounded-full", i === 0 ? "bg-primary" : i === 1 ? "bg-primary/60" : "bg-primary/30")} />
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{item.name}</span>
                       </div>
                       <span className="text-[10px] font-black text-slate-900">{currencySymbol}{item.value.toLocaleString()}</span>
                    </div>
                  ))}
               </CardFooter>
            </Card>
         </div>

         <div className="lg:col-span-8">
            <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border h-full">
               <CardHeader className="bg-primary/5 border-b py-6 px-8 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                       <Activity className="h-4 w-4" /> Cashflow Node Pulse
                    </CardTitle>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Inflow vs Outflow Velocity</p>
                  </div>
               </CardHeader>
               <CardContent className="p-8 h-[380px]">
                  {cashflowTrend.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-xs uppercase font-black">Waiting for Data Nodes...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={cashflowTrend}>
                          <defs>
                             <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient>
                             <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8'}} />
                          <YAxis hide />
                          <RechartsTooltip 
                             contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                          />
                          <Area type="monotone" dataKey="inflow" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorIn)" strokeWidth={3} />
                          <Area type="monotone" dataKey="outflow" stroke="#ef4444" fillOpacity={1} fill="url(#colorOut)" strokeWidth={3} />
                       </AreaChart>
                    </ResponsiveContainer>
                  )}
               </CardContent>
            </Card>
         </div>
      </section>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2.5rem] border">
        <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="bg-white border h-10 p-1 rounded-xl shadow-sm">
              <TabsTrigger value="all" className="text-[10px] font-bold uppercase px-6">Consolidated</TabsTrigger>
              <TabsTrigger value="income" className="text-[10px] font-bold uppercase px-6 text-green-600">Earnings</TabsTrigger>
              <TabsTrigger value="expense" className="text-[10px] font-bold uppercase px-6 text-red-600">Outflows</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input placeholder="Search descriptions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 pl-10 rounded-xl bg-white border-none shadow-inner text-xs font-bold" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-muted/10">
                <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Entry Date</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Transaction Node</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Sector</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase h-12">Inflow (+)</TableHead>
                <TableHead className="text-right pr-8 text-[10px] font-black uppercase h-12">Outflow (-)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTransactionsLoading ? (
                <TableRow><TableCell colSpan={5} className="h-60 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary opacity-20" /></TableCell></TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-60 text-center opacity-30 italic text-sm uppercase">No traffic logged for this window.</TableCell></TableRow>
              ) : (
                filteredTransactions.map((t: any) => (
                  <TableRow key={t.id} className="group hover:bg-muted/5 transition-colors border-b">
                    <TableCell className="pl-8 py-5">
                       <span className="text-[10px] font-black text-slate-400 uppercase">{format(parseISO(t.date), 'dd MMM yyyy')}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs uppercase shadow-inner", t.type === 'credit' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                          {t.type === 'credit' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{t.particulars}</p>
                          <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Mode: {t.mode} • By: {t.entryBy}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 border-primary/20 text-primary">{t.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-sm text-green-600">{t.type === 'credit' ? `${currencySymbol}${t.amount.toLocaleString()}` : '-'}</TableCell>
                    <TableCell className="text-right pr-8 font-black text-sm text-destructive">{t.type === 'debit' ? `${currencySymbol}${t.amount.toLocaleString()}` : '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden text-left">
          <DialogHeader className="p-8 bg-primary text-white text-left shrink-0">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl">Record Ledger Entry</DialogTitle>
                <DialogDescription className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-1">Direct Cashbook Synchronization</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Flow Type</Label>
                  <Select value={type} onValueChange={(v: any) => setType(v)}>
                    <SelectTrigger className={cn("h-11 rounded-xl font-bold uppercase text-[10px]", type === 'income' ? "text-green-600 bg-green-50" : "text-destructive bg-red-50")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      <SelectItem value="income" className="text-[10px] font-bold uppercase text-green-600">Credit (+)</SelectItem>
                      <SelectItem value="expense" className="text-[10px] font-bold uppercase text-destructive">Debit (-)</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Entry Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-xl font-bold" />
               </div>
            </div>

            <div className="space-y-1.5">
               <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Particulars / Description *</Label>
               <Input value={particulars} onChange={(e) => setParticulars(e.target.value)} placeholder="What was this for?" className="h-11 rounded-xl font-bold bg-muted/20 border-none shadow-inner" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Amount ({currencySymbol}) *</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-11 rounded-xl font-black text-lg bg-primary/5 text-primary border-none shadow-inner" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Sector Category</Label>
                <Select value={category} onValueChange={setCategory}>
                   <SelectTrigger className="h-11 rounded-xl font-bold uppercase text-[10px]"><SelectValue placeholder="Select" /></SelectTrigger>
                   <SelectContent className="rounded-xl">
                      {(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                        <SelectItem key={cat} value={cat} className="text-[10px] font-bold uppercase">{cat}</SelectItem>
                      ))}
                   </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
               <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Execution Mode</Label>
               <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger className="h-11 rounded-xl font-bold bg-muted/20 border-none shadow-inner"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {dynamicPaymentModes.map((m: string) => <SelectItem key={m} value={m} className="text-[10px] font-bold uppercase">{m}</SelectItem>)}
                  </SelectContent>
               </Select>
            </div>
          </div>
          <DialogFooter className="p-8 bg-muted/10 border-t">
            <Button onClick={handleAddEntry} disabled={!amount || !particulars} className="w-full h-14 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">Commit Node Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
