"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Users2, 
  UserPlus, 
  CalendarCheck, 
  Wallet, 
  Search,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  TrendingUp,
  Loader2,
  SmartphoneNfc,
  BadgeCheck,
  Building2,
  Trophy,
  UserCircle,
  Calendar,
  LayoutList,
  Edit2,
  Trash2,
  Coins,
  Sparkles,
  Zap,
  Timer,
  Mail,
  Phone,
  HandCoins,
  Receipt,
  DollarSign,
  Globe,
  PlusCircle,
  Filter,
  ChevronRight,
  ChevronDown,
  Layout,
  Download,
  FileSpreadsheet
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useUser, 
  useDoc, 
  setDocumentNonBlocking, 
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking
} from "@/firebase";
import { collection, query, where, doc, serverTimestamp, orderBy, increment } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startOfMonth, endOfMonth, format } from "date-fns";

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const YEARS = ["2023", "2024", "2025", "2026"];

export default function StaffManagementPage() {
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

  const staffQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null
  , [firestore, businessId]);
  const { data: staffList = [], isLoading: isStaffLoading } = useCollection<any>(staffQuery);

  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(format(now, 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState((now.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString());

  const [otHours, setOtHours] = useState<Record<string, string>>({});
  const [allowances, setAllowances] = useState<Record<string, string>>({});
  const [manualPayments, setManualPayments] = useState<Record<string, string>>({});
  
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("directory");

  const isPinned = useMemo(() => {
    const layout = (userProfile?.dashboardLayout as any[]) || [];
    return layout.find(w => w.id === 'pulse')?.enabled ?? true;
  }, [userProfile]);

  const toggleDashboardPin = () => {
    if (!userProfileRef || !userProfile) return;
    const currentLayout = [...(userProfile.dashboardLayout || [])];
    const newLayout = currentLayout.map(w => w.id === 'pulse' ? { ...w, enabled: !w.enabled } : w);
    updateDocumentNonBlocking(userProfileRef, { dashboardLayout: newLayout });
    toast({ title: isPinned ? "Unpinned" : "Pinned", description: `Daily Pulse widget ${isPinned ? 'removed from' : 'added to'} Dashboard.` });
  };

  const attendanceQuery = useMemoFirebase(() => {
    if (!businessId) return null;
    return query(collection(firestore, 'businesses', businessId, 'attendance'));
  }, [firestore, businessId]);
  const { data: attendanceData = [] } = useCollection<any>(attendanceQuery);

  const tasksQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'tasks') : null
  , [firestore, businessId]);
  const { data: tasksList = [] } = useCollection<any>(tasksQuery);

  const filteredStaff = useMemo(() => {
    return (staffList || []).filter((s: any) => {
      const matchesSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           s.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === "all" || (s.role || "").toLowerCase() === roleFilter.toLowerCase();
      return matchesSearch && matchesRole;
    });
  }, [staffList, searchTerm, roleFilter]);

  const payrollSummary = useMemo(() => {
    if (!filteredStaff || !attendanceData) return [];
    
    const filterMonth = parseInt(selectedMonth) - 1;
    const filterYear = parseInt(selectedYear);
    
    return (filteredStaff || []).map((s: any) => {
      const monthRecords = (attendanceData || []).filter((a: any) => {
        const d = new Date(a.date);
        return a.staffId === s.id && d.getMonth() === filterMonth && d.getFullYear() === filterYear;
      });

      const dailyRate = s.dailyRate || 500;
      const shiftHours = s.shiftHours || 8;
      const hourlyRate = dailyRate / shiftHours;

      const presentCount = monthRecords.filter((r: any) => r.status === 'present').length;
      const halfDayCount = monthRecords.filter((r: any) => r.status === 'half-day').length;
      
      let totalOTEarnedMonth = 0;
      const totalOTHoursMonth = monthRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.overtimeHours) || 0), 0);
      totalOTEarnedMonth = totalOTHoursMonth * hourlyRate;

      const totalEarnedMonth = monthRecords.reduce((sum: number, r: any) => {
        let base = 0;
        if (r.status === 'present') base = dailyRate;
        else if (r.status === 'half-day') base = dailyRate / 2;
        
        const otPay = (parseFloat(r.overtimeHours) || 0) * hourlyRate;
        const allow = (parseFloat(r.allowance) || 0);
        return sum + base + otPay + allow;
      }, 0);

      const totalPaidMonth = monthRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.manualPayment) || 0), 0);
      const pendingBalance = totalEarnedMonth - totalPaidMonth;

      const completedTasks = (tasksList || []).filter((t: any) => t.assignedTo === s.id && t.status === 'completed').length;
      const totalAssignedTasks = (tasksList || []).filter((t: any) => t.assignedTo === s.id).length;

      return {
        ...s,
        payableDays: presentCount + (halfDayCount * 0.5),
        totalEarnedMonth,
        totalPaidMonth,
        pendingBalance,
        completedTasks,
        totalAssignedTasks,
        monthRecords,
        otHours: totalOTHoursMonth,
        otPay: totalOTEarnedMonth
      };
    });
  }, [filteredStaff, attendanceData, tasksList, selectedMonth, selectedYear]);

  const grandTotals = useMemo(() => {
    return (payrollSummary || []).reduce((acc, s) => ({
      attendance: acc.attendance + (s.payableDays || 0),
      otHours: acc.otHours + (s.otHours || 0),
      otPay: acc.otPay + (s.otPay || 0),
      earnings: acc.earnings + (s.totalEarnedMonth || 0),
      paid: acc.paid + (s.totalPaidMonth || 0),
      balance: acc.balance + (s.pendingBalance || 0),
    }), { attendance: 0, otHours: 0, otPay: 0, earnings: 0, paid: 0, balance: 0 });
  }, [payrollSummary]);

  const stats = useMemo(() => {
    const periodAttendance = (attendanceData || []).filter((a: any) => a.date === selectedDate);
    
    const dailyTeamOutflow = (filteredStaff || []).reduce((total, s) => {
      const record = periodAttendance.find(a => a.staffId === s.id);
      if (!record) return total;

      const dailyRate = s.dailyRate || 500;
      const shiftHours = s.shiftHours || 8;
      const hourlyRate = dailyRate / shiftHours;

      let base = 0;
      if (record.status === 'present') base = dailyRate;
      else if (record.status === 'half-day') base = dailyRate / 2;

      const otPay = (parseFloat(record.overtimeHours) || 0) * hourlyRate;
      const allowance = (parseFloat(record.allowance) || 0);
      const manualPay = (parseFloat(record.manualPayment) || 0);

      return total + base + otPay + allowance + manualPay;
    }, 0);
    
    const totalMonthlyDue = (payrollSummary || []).reduce((sum, s) => sum + (s.totalEarnedMonth || 0), 0);
    const totalMonthlyPaid = (payrollSummary || []).reduce((sum, s) => sum + (s.totalPaidMonth || 0), 0);

    return {
      total: filteredStaff?.length || 0,
      activeToday: (filteredStaff || []).filter(s => periodAttendance.some(a => a.staffId === s.id && a.status === 'present')).length,
      dailyTeamOutflow,
      totalMonthlyDue,
      totalPaidSalary: totalMonthlyPaid,
    };
  }, [filteredStaff, payrollSummary, attendanceData, selectedDate]);

  const handleExportCSV = () => {
    if (!payrollSummary || payrollSummary.length === 0) {
      toast({ variant: "destructive", title: "No Data", description: "Nothing to export based on filters." });
      return;
    }

    const headers = [
      "SN.", 
      "Name", 
      "Designation", 
      "Mobile Number", 
      "Attendance Count", 
      "OT Count (Hrs)", 
      "OT Payment", 
      "Period Earnings", 
      "Amount Paid", 
      "Balance"
    ];

    const csvRows = payrollSummary.map((s, index) => [
      index + 1,
      `"${s.name}"`,
      `"${s.role}"`,
      `"${s.phone || ''}"`,
      s.payableDays,
      s.otHours,
      s.otPay.toFixed(2),
      s.totalEarnedMonth.toFixed(2),
      s.totalPaidMonth.toFixed(2),
      s.pendingBalance.toFixed(2)
    ].join(','));

    // Add Total Row to CSV
    const totalRow = [
      "",
      "GRAND TOTAL",
      "",
      "",
      grandTotals.attendance,
      grandTotals.otHours,
      grandTotals.otPay.toFixed(2),
      grandTotals.earnings.toFixed(2),
      grandTotals.paid.toFixed(2),
      grandTotals.balance.toFixed(2)
    ].join(',');

    const csvContent = headers.join(',') + '\n' + csvRows.join('\n') + '\n' + totalRow;
    const fileName = `team_summary_${MONTHS[parseInt(selectedMonth)-1]}_${selectedYear}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Summary Exported", description: `File: ${fileName}` });
  };

  const markAttendance = (staffId: string, status: string, ot: string = "0", allowance: string = "0", payment: string = "0") => {
    if (!businessId) return;
    const recordId = `${staffId}_${selectedDate}`;
    const docRef = doc(firestore, 'businesses', businessId, 'attendance', recordId);
    
    const existingRecord = (attendanceData || []).find((a: any) => a.staffId === staffId && a.date === selectedDate);
    
    if (existingRecord?.status === status) {
      deleteDocumentNonBlocking(docRef);
      toast({ title: "Unmarked", description: `Attendance record cleared for ${selectedDate}` });
      return;
    }

    setDocumentNonBlocking(docRef, {
      staffId,
      businessId,
      date: selectedDate,
      status,
      overtimeHours: parseFloat(ot) || 0,
      allowance: parseFloat(allowance) || 0,
      manualPayment: parseFloat(payment) || 0,
      createdAt: serverTimestamp()
    }, { merge: true });

    toast({ title: "Updated", description: `Record saved for ${selectedDate}` });
  };

  const calculateDayEarning = (s: any, status: string, ot: string, allowance: string) => {
    const dailyRate = s.dailyRate || 500;
    const shiftHours = s.shiftHours || 8;
    const hourlyRate = dailyRate / shiftHours;
    let base = status === 'present' ? dailyRate : status === 'half-day' ? dailyRate / 2 : 0;
    const otPay = (parseFloat(ot) || 0) * hourlyRate;
    return base + otPay + (parseFloat(allowance) || 0);
  };

  const currencySymbol = getCurrencySymbol(business?.currency);

  if (isProfileLoading || isStaffLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-xl shadow-primary/10">
            <Users2 className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 leading-tight">Team Management</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest h-5 border-primary/20 text-primary bg-primary/5">Real-time Presence & Payroll Node</Badge>
              <div className="flex items-center gap-1.5 ml-2 bg-white px-2 py-1 rounded-lg border shadow-sm shrink-0">
                <Layout className="h-3 w-3 text-muted-foreground" />
                <Switch checked={isPinned} onCheckedChange={toggleDashboardPin} className="scale-[0.6] data-[state=checked]:bg-primary" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" className="h-11 px-6 rounded-xl border-primary/20 text-primary hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest bg-white">
            <Download className="mr-2 h-4 w-4" /> Export Node
          </Button>
          <Button asChild variant="outline" className="h-11 px-6 rounded-xl border-primary/20 text-primary hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest bg-white">
            <Link href="/settings?tab=users"><UserPlus className="mr-2 h-4 w-4" /> Add Member</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-border/50">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest">Active Force</span>
            <Users2 className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.total} Specialists</div>
          <p className="text-[8px] font-bold uppercase text-muted-foreground mt-2">{stats.activeToday} Present on {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
        </Card>
        
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-primary border-border/50">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest">Payroll Index ({MONTHS[parseInt(selectedMonth)-1]})</span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-slate-900">{currencySymbol}{stats.totalMonthlyDue.toLocaleString()}</div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[8px] font-bold uppercase text-green-600">Paid: {currencySymbol}{stats.totalPaidSalary.toLocaleString()}</span>
            <span className="text-[8px] font-bold uppercase text-red-600">Due: {currencySymbol}{(stats.totalMonthlyDue - stats.totalPaidSalary).toLocaleString()}</span>
          </div>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-orange-500 border-border/50">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest">Daily Cost</span>
            <Receipt className="h-4 w-4 text-orange-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{currencySymbol}{stats.dailyTeamOutflow.toLocaleString()}</div>
          <p className="text-[8px] font-bold uppercase text-muted-foreground mt-2">Accrued on {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col xl:flex-row items-center justify-between gap-6 mb-8">
          <TabsList className="bg-white border h-14 p-1.5 rounded-2xl shadow-sm w-full xl:w-auto overflow-x-auto scrollbar-hide flex">
            <TabsTrigger value="directory" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><LayoutList className="h-4 w-4" /> Directory</TabsTrigger>
            <TabsTrigger value="attendance" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><CalendarCheck className="h-4 w-4" /> Mark Daily</TabsTrigger>
            <TabsTrigger value="payroll" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><Wallet className="h-4 w-4" /> Settlement</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-3 w-full xl:w-auto">
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border shadow-sm">
              <Filter className="h-3.5 w-3.5 text-primary ml-2 opacity-40" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-9 w-32 border-none bg-transparent font-bold text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  {MONTHS.map((m, i) => <SelectItem key={m} value={(i + 1).toString()}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Separator orientation="vertical" className="h-4" />
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-9 w-24 border-none bg-transparent font-bold text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-11 w-full sm:w-40 rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase tracking-widest text-primary">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-2xl">
                <SelectItem value="all" className="text-[10px] font-bold uppercase">All Roles</SelectItem>
                <SelectItem value="admin" className="text-[10px] font-bold uppercase">Admin</SelectItem>
                <SelectItem value="manager" className="text-[10px] font-bold uppercase">Manager</SelectItem>
                <SelectItem value="staff" className="text-[10px] font-bold uppercase">Staff</SelectItem>
                <SelectItem value="agent" className="text-[10px] font-bold uppercase">Agent</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 xl:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
              <Input placeholder="Search name..." className="h-11 pl-10 text-xs bg-white border-none shadow-inner rounded-xl w-full font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </div>

        <TabsContent value="directory" className="m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(filteredStaff || []).map((s: any) => (
              <Card key={s.id} className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border hover:shadow-xl transition-all group cursor-pointer" onClick={() => router.push(`/staff/${s.id}`)}>
                <CardHeader className="bg-muted/30 border-b py-6 px-6">
                  <div className="flex items-center justify-between">
                    <div className="h-14 w-14 rounded-2xl bg-white border shadow-sm flex items-center justify-center font-black text-primary text-xl group-hover:scale-110 transition-transform">
                      {s.name?.charAt(0)}
                    </div>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-black text-[8px] h-5 px-2 uppercase">{s.role}</Badge>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-base font-black text-slate-900 group-hover:underline">{s.name}</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">{s.email}</p>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Phone className="h-3.5 w-3.5 opacity-30" />
                    <span className="text-xs font-bold">{s.phone || 'No phone'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Coins className="h-3.5 w-3.5 opacity-30" />
                    <span className="text-xs font-bold">{currencySymbol}{s.dailyRate || 500}/day</span>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/10 p-4 border-t flex items-center justify-between">
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest">View Profile</span>
                  <ChevronRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="m-0">
          <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2.5rem] border">
            <CardHeader className="bg-primary py-6 px-8 flex flex-col sm:flex-row items-center justify-between border-b">
              <div className="flex items-center gap-4 text-white">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                  <CalendarCheck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Daily Entry Feed</CardTitle>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Records for {new Date(selectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long' })}</p>
                </div>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-2 border border-white/20 mt-4 sm:mt-0">
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent border-none text-white font-black text-xs outline-none cursor-pointer" />
              </div>
            </CardHeader>
            <div className="divide-y divide-border/50">
              {(filteredStaff || []).map((s: any) => {
                const record = (attendanceData || []).find((a: any) => a.staffId === s.id && a.date === selectedDate);
                const currentStatus = record?.status;
                const currentOt = otHours[s.id] || record?.overtimeHours?.toString() || "0";
                const currentAllowance = allowances[s.id] || record?.allowance?.toString() || "0";
                const currentManualPayment = manualPayments[s.id] || record?.manualPayment?.toString() || "0";
                
                const dayTotal = calculateDayEarning(s, currentStatus || '', currentOt, currentAllowance);
                const otPayment = (parseFloat(currentOt) || 0) * ((s.dailyRate || 500) / (s.shiftHours || 8));

                return (
                  <div key={s.id} className="p-6 flex flex-col xl:flex-row items-center justify-between gap-8 hover:bg-muted/5 transition-all">
                    <div className="flex items-center gap-4 w-full xl:w-auto cursor-pointer" onClick={() => router.push(`/staff/${s.id}`)}>
                      <div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center font-black text-primary text-sm shadow-inner">{s.name?.charAt(0)}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate group-hover:underline">{s.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">{s.role}</p>
                        {currentStatus && <Badge variant="secondary" className="bg-green-50 text-green-700 border-none font-black text-[8px] h-4 uppercase px-1.5 mt-1">Earning: {currencySymbol}{dayTotal.toLocaleString()}</Badge>}
                      </div>
                    </div>

                    <div className="flex flex-col lg:flex-row items-center gap-6 w-full xl:w-auto">
                      <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                        <Button 
                          variant={currentStatus === 'present' ? 'default' : 'outline'} 
                          className={cn("h-10 rounded-xl text-[9px] font-black uppercase px-4", currentStatus === 'present' ? "bg-green-600 shadow-lg text-white" : "bg-white")}
                          onClick={() => markAttendance(s.id, 'present', currentOt, currentAllowance, currentManualPayment)}
                        >Present</Button>
                        <Button 
                          variant={currentStatus === 'half-day' ? 'default' : 'outline'} 
                          className={cn("h-10 rounded-xl text-[9px] font-black uppercase px-4", currentStatus === 'half-day' ? "bg-orange-50 shadow-lg text-white" : "bg-white")}
                          onClick={() => markAttendance(s.id, 'half-day', currentOt, currentAllowance, currentManualPayment)}
                        >Half Day</Button>
                        <Button 
                          variant={currentStatus === 'absent' ? 'default' : 'outline'} 
                          className={cn("h-10 rounded-xl text-[9px] font-black uppercase px-4", currentStatus === 'absent' ? "bg-red-600 shadow-lg text-white" : "bg-white")}
                          onClick={() => markAttendance(s.id, 'absent', "0", "0", currentManualPayment)}
                        >Absent</Button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full sm:w-auto">
                        <div className="space-y-1">
                          <Label className="text-[8px] font-black uppercase text-slate-400 ml-1">OT Hrs</Label>
                          <Input type="number" min="0" value={currentOt} onChange={(e) => setOtHours({...otHours, [s.id]: e.target.value})} className="h-9 w-20 text-center text-xs font-bold rounded-xl bg-muted/20 border-none shadow-inner" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[8px] font-black uppercase text-slate-400 ml-1">OT Pay (₹)</Label>
                          <div className="h-9 w-24 flex items-center justify-center text-xs font-black text-primary bg-primary/5 rounded-xl border border-primary/5 shadow-inner">
                            {currencySymbol}{Math.round(otPayment).toLocaleString()}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[8px] font-black uppercase text-slate-400 ml-1">Exps (₹)</Label>
                          <Input type="number" value={currentAllowance} onChange={(e) => setAllowances({...allowances, [s.id]: e.target.value})} className="h-9 w-24 text-center text-xs font-bold rounded-xl bg-muted/20 border-none shadow-inner" />
                        </div>
                        <div className="space-y-1 col-span-2 sm:col-span-1">
                          <Label className="text-[8px] font-black uppercase text-slate-400 ml-1">Pay Today</Label>
                          <div className="flex gap-2">
                            <Input type="number" value={currentManualPayment} onChange={(e) => setManualPayments({...manualPayments, [s.id]: e.target.value})} placeholder="0" className="h-9 text-center text-xs font-bold rounded-xl bg-green-50 text-green-700 border-none shadow-inner" />
                            <Button size="icon" variant="ghost" className="h-9 w-9 bg-primary/10 text-primary rounded-xl" onClick={() => markAttendance(s.id, currentStatus || 'present', currentOt, currentAllowance, currentManualPayment)}><PlusCircle className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="m-0">
           <Card className="border-none shadow-md bg-white rounded-[2.5rem] border overflow-hidden">
              <CardHeader className="bg-muted/30 border-b py-5 px-8 flex justify-between items-center">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-primary">Monthly Payroll Master ({MONTHS[parseInt(selectedMonth)-1]})</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10">
                      <TableHead className="pl-8 text-[10px] font-black uppercase h-12 w-16">SN.</TableHead>
                      <TableHead className="text-[10px] font-black uppercase h-12">Specialist / Designation</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase h-12">Attendance</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase h-12">OT (Hrs)</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase h-12">OT Pay (₹)</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase h-12">Total Earnings (₹)</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase h-12">Amount Paid (₹)</TableHead>
                      <TableHead className="text-right pr-8 text-[10px] font-black uppercase h-12">Balance Due (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payrollSummary || []).length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="h-40 text-center opacity-30 italic text-sm">No records found.</TableCell></TableRow>
                    ) : (
                      payrollSummary.map((s: any, idx: number) => (
                        <TableRow key={s.id} className="group hover:bg-muted/5 transition-colors cursor-pointer border-b" onClick={() => router.push(`/staff/${s.id}`)}>
                          <TableCell className="pl-8 py-5 text-[10px] font-black text-slate-400 uppercase">#{idx + 1}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900 group-hover:underline">{s.name}</span>
                              <span className="text-[9px] text-muted-foreground font-black uppercase">{s.role}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm font-bold">{s.payableDays} Days</TableCell>
                          <TableCell className="text-center text-sm font-bold text-slate-500">{s.otHours}</TableCell>
                          <TableCell className="text-center text-sm font-bold text-primary">{currencySymbol}{s.otPay.toLocaleString()}</TableCell>
                          <TableCell className="text-center text-sm font-bold text-slate-900">{currencySymbol}{s.totalEarnedMonth.toLocaleString()}</TableCell>
                          <TableCell className="text-center text-sm font-bold text-green-600">{currencySymbol}{s.totalPaidMonth.toLocaleString()}</TableCell>
                          <TableCell className="text-right pr-8">
                            <span className={cn("text-base font-black", (s.pendingBalance || 0) > 0 ? "text-red-600" : "text-green-600")}>
                              {currencySymbol}{(s.pendingBalance || 0).toLocaleString()}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  <TableFooter className="bg-primary/5 hover:bg-primary/5">
                    <TableRow className="border-t-2 border-primary/20">
                      <TableCell colSpan={2} className="pl-8 py-6 font-black text-primary uppercase tracking-widest text-xs">Grand Platform Total</TableCell>
                      <TableCell className="text-center font-black text-primary text-sm">{grandTotals.attendance} Days</TableCell>
                      <TableCell className="text-center font-black text-slate-500 text-sm">{grandTotals.otHours} Hrs</TableCell>
                      <TableCell className="text-center font-black text-primary text-sm">{currencySymbol}{grandTotals.otPay.toLocaleString()}</TableCell>
                      <TableCell className="text-center font-black text-slate-900 text-sm">{currencySymbol}{grandTotals.earnings.toLocaleString()}</TableCell>
                      <TableCell className="text-center font-black text-green-600 text-sm">{currencySymbol}{grandTotals.paid.toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-8 font-black text-red-600 text-lg">{currencySymbol}{grandTotals.balance.toLocaleString()}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
