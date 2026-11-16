
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
import Link from "next/link";
import { PageHeader, KpiStatCard, SectionCard } from "@/components/ui/editorial";

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
  const [gstAmount, setGstAmount] = useState("");
  const [vendorGstin, setVendorGstin] = useState("");

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
    
    const parsedGst = type === 'expense' ? Math.max(0, parseFloat(gstAmount) || 0) : 0;
    const cleanVendorGstin = type === 'expense' ? vendorGstin.trim().toUpperCase() : "";

    const entryData = {
      businessId,
      type: type === 'income' ? 'credit' : 'debit',
      amount: parseFloat(amount),
      particulars,
      category: category || (type === 'income' ? 'Sales' : 'Other'),
      mode,
      date,
      ...(parsedGst > 0 ? { gstAmount: parsedGst } : {}),
      ...(cleanVendorGstin ? { vendorGstin: cleanVendorGstin } : {}),
      entryBy: userProfile?.name || 'Admin',
      createdAt: serverTimestamp()
    };

    addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'cashbook'), entryData);
    setIsAddOpen(false);
    setAmount(""); setParticulars(""); setCategory(""); setGstAmount(""); setVendorGstin("");
    toast({ title: "Transaction Recorded", description: "Ledger updated successfully." });
  };

  if (isProfileLoading || isUserLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 pb-12 text-left">
      <PageHeader
        title="Profit & Loss"
        description="Consolidated cashflow, expense breakdown, and transaction ledger."
        icon={Wallet}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              className="flex items-center gap-2 bg-white px-3 h-10 rounded-xl border border-slate-200 shrink-0"
              title="Pin Accounting widget to Dashboard"
            >
              <Layout className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600 hidden sm:inline">Pin widget</span>
              <Switch checked={isPinned} onCheckedChange={toggleDashboardPin} aria-label="Pin accounting widget to dashboard" className="scale-90 data-[state=checked]:bg-slate-900" />
            </div>

            <div className="flex items-center gap-1.5 bg-white px-2.5 h-10 rounded-xl border border-slate-200">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="h-8 w-32 border-none bg-transparent font-medium text-xs text-slate-700 focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="today" className="text-xs font-medium">Today</SelectItem>
                  <SelectItem value="thisMonth" className="text-xs font-medium">This month</SelectItem>
                  <SelectItem value="lastMonth" className="text-xs font-medium">Last month</SelectItem>
                  <SelectItem value="all" className="text-xs font-medium">Full history</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button asChild variant="outline" className="h-10 px-4 rounded-xl font-medium text-xs border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              <Link href="/accounting/gst">
                <Percent className="mr-1.5 h-3.5 w-3.5 text-slate-600" /> GST reports
              </Link>
            </Button>

            <Button onClick={() => setIsAddOpen(true)} className="bg-slate-900 hover:bg-slate-800 h-10 px-4 font-semibold text-xs rounded-xl text-white">
              <Plus className="mr-1.5 h-4 w-4" /> New entry
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiStatCard
          label="Gross Revenue"
          value={`${currencySymbol}${stats.income.toLocaleString()}`}
          subtext="Total inflows in period"
          tone="positive"
          icon={TrendingUp}
        />
        <KpiStatCard
          label="Total Outflow"
          value={`${currencySymbol}${stats.expense.toLocaleString()}`}
          subtext="Total expenses in period"
          tone="danger"
          icon={TrendingDown}
        />
        <KpiStatCard
          label="Profit Margin"
          value={`${margin}%`}
          subtext="Net surplus ratio"
          icon={Percent}
        />
        <KpiStatCard
          label="Net Balance"
          value={`${currencySymbol}${profit.toLocaleString()}`}
          subtext={profit >= 0 ? "Net surplus" : "Net deficit"}
          tone={profit >= 0 ? "dark" : "danger"}
          icon={Wallet}
        />
      </div>

      {/* ANALYTICS SECTION: SPENDING BREAKDOWN & CASHFLOW TREND */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4">
          <SectionCard
            title="Spending breakdown"
            description="Expense distribution by category"
            headerRight={
              <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                Live
              </span>
            }
            className="h-full flex flex-col"
            bodyClassName="flex-1 flex flex-col justify-between gap-4"
          >
            <div className="h-[240px]">
              {categoryData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                  No expense entries in this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      innerRadius={56}
                      outerRadius={78}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === 0 ? '#0f172a' : index === 1 ? '#334155' : index === 2 ? '#64748b' : '#cbd5e1'}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none', fontSize: '12px', fontWeight: 500 }}
                      formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, 'Outflow']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {categoryData.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {categoryData.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex items-center justify-between w-full text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn("h-2 w-2 rounded-full shrink-0", i === 0 ? "bg-slate-900" : i === 1 ? "bg-slate-700" : i === 2 ? "bg-slate-500" : "bg-slate-300")} />
                      <span className="font-medium text-slate-600 truncate">{item.name}</span>
                    </div>
                    <span className="font-mono tabular-nums font-semibold text-slate-900 shrink-0">{currencySymbol}{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="lg:col-span-8">
          <SectionCard
            title="Cashflow trend"
            description="Inflow vs outflow velocity over recent entries"
            className="h-full"
          >
            <div className="h-[320px]">
              {cashflowTrend.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                  Waiting for cashbook entries...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashflowTrend}>
                    <defs>
                      <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0f172a" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e11d48" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} tick={{ fill: '#64748b' }} />
                    <YAxis hide />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none', fontSize: '12px', fontWeight: 500 }}
                    />
                    <Area type="monotone" dataKey="inflow" name="Inflow" stroke="#0f172a" fillOpacity={1} fill="url(#colorIn)" strokeWidth={2} />
                    <Area type="monotone" dataKey="outflow" name="Outflow" stroke="#e11d48" fillOpacity={1} fill="url(#colorOut)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>
        </div>
      </section>

      <SectionCard bodyClassName="p-0">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row gap-3 items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="bg-white border border-slate-200 h-10 p-1 rounded-xl">
              <TabsTrigger value="all" className="text-xs font-medium px-4 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white">Consolidated</TabsTrigger>
              <TabsTrigger value="income" className="text-xs font-medium px-4 rounded-lg text-emerald-700 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Earnings</TabsTrigger>
              <TabsTrigger value="expense" className="text-xs font-medium px-4 rounded-lg text-rose-700 data-[state=active]:bg-rose-600 data-[state=active]:text-white">Outflows</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search particulars or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 pl-10 rounded-xl bg-white border-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-slate-50/80 border-b border-slate-200 hover:bg-slate-50/80">
                <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">Entry date</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">Particulars</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">Category</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-600 h-11">Inflow (+)</TableHead>
                <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11">Outflow (-)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTransactionsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-44 text-center">
                    <Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-44 text-center text-slate-500 text-sm">
                    No cashbook entries logged for this window.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((t: any) => (
                  <TableRow key={t.id} className="group hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                    <TableCell className="pl-6 py-3.5">
                      <span className="text-xs font-mono tabular-nums font-medium text-slate-500">{format(parseISO(t.date), 'dd MMM yyyy')}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border", t.type === 'credit' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200")}>
                          {t.type === 'credit' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{t.particulars}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Mode: {t.mode} • By: {t.entryBy}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium px-2 py-0.5">
                        {t.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-semibold text-sm text-emerald-700">
                      {t.type === 'credit' ? `${currencySymbol}${t.amount.toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell className="text-right pr-6 font-mono tabular-nums font-semibold text-sm text-rose-700">
                      {t.type === 'debit' ? `${currencySymbol}${t.amount.toLocaleString()}` : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden text-left">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight">Record ledger entry</DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">Direct cashbook entry synchronization</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Flow type</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger className={cn("h-10 rounded-xl font-semibold text-xs border-slate-200", type === 'income' ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="income" className="text-xs font-medium text-emerald-700">Credit (+)</SelectItem>
                    <SelectItem value="expense" className="text-xs font-medium text-rose-700">Debit (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Entry date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 rounded-xl border-slate-200 font-mono text-xs" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Particulars / description *</Label>
              <Input value={particulars} onChange={(e) => setParticulars(e.target.value)} placeholder="What was this for?" className="h-10 rounded-xl bg-white border-slate-200 text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Amount ({currencySymbol}) *</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-10 rounded-xl font-mono tabular-nums font-semibold text-sm bg-white border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-medium"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                      <SelectItem key={cat} value={cat} className="text-xs font-medium">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Payment mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 text-xs font-medium"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {dynamicPaymentModes.map((m: string) => <SelectItem key={m} value={m} className="text-xs font-medium">{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {type === 'expense' && (
              <div className="grid grid-cols-2 gap-3.5 pt-2 border-t border-slate-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Input GST / ITC ({currencySymbol})</Label>
                  <Input type="number" value={gstAmount} onChange={(e) => setGstAmount(e.target.value)} placeholder="0.00 (Optional)" className="h-10 rounded-xl font-mono tabular-nums text-xs bg-white border-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Vendor GSTIN (ITC)</Label>
                  <Input value={vendorGstin} onChange={(e) => setVendorGstin(e.target.value.toUpperCase())} placeholder="27AAA..." maxLength={15} className="h-10 rounded-xl font-mono text-xs uppercase bg-white border-slate-200" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200">
            <Button onClick={handleAddEntry} disabled={!amount || !particulars} className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl">
              Save ledger entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
