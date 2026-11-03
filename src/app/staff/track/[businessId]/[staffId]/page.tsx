
"use client";

import { useMemo, use, useState, useEffect } from "react";
import { 
  UserCircle, 
  Wallet, 
  CalendarCheck, 
  Trophy, 
  Clock, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  SmartphoneNfc, 
  Loader2, 
  DollarSign, 
  Timer, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  History,
  Calendar,
  Building2,
  Mail,
  Phone,
  LayoutDashboard,
  Sparkles,
  Target,
  ArrowLeft,
  Coins,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { 
  useFirestore, 
  useDoc, 
  useMemoFirebase 
} from "@/firebase";
import { doc, getDocs, collection, query, where, orderBy } from "firebase/firestore";
import { startOfMonth, endOfMonth, format } from "date-fns";
import Link from "next/link";

type PageProps = {
  params: Promise<{
    businessId: string;
    staffId: string;
  }>;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const YEARS = ["2023", "2024", "2025", "2026"];

export default function StaffTrackPage(props: PageProps) {
  const { businessId, staffId } = use(props.params);
  const firestore = useFirestore();

  // 1. Fetch Staff Profile
  const staffRef = useMemoFirebase(() => 
    staffId ? doc(firestore, 'users', staffId) : null
  , [firestore, staffId]);
  const { data: profile, isLoading: isProfileLoading, error: profileError } = useDoc<any>(staffRef);

  // 2. Fetch Business Info
  const bizRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business, isLoading: isBizLoading } = useDoc<any>(bizRef);

  // 3. Filter State
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState((now.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString());

  // 4. Fetch Attendance for selected window
  const [records, setRecords] = useState<any[]>([]);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);

  useEffect(() => {
    async function fetchMonthRecords() {
      if (!businessId || !staffId) return;
      setIsRecordsLoading(true);
      
      const start = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1));
      const end = endOfMonth(start);

      const q = query(
        collection(firestore, 'businesses', businessId, 'attendance'),
        where('staffId', '==', staffId),
        where('date', '>=', format(start, 'yyyy-MM-dd')),
        where('date', '<=', format(end, 'yyyy-MM-dd')),
        orderBy('date', 'desc')
      );

      try {
        const snap = await getDocs(q);
        setRecords(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      } catch (e) {
        console.error("Error fetching records:", e);
      } finally {
        setIsRecordsLoading(false);
      }
    }
    fetchMonthRecords();
  }, [firestore, businessId, staffId, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    if (!profile || !records) return null;

    const dailyRate = profile.dailyRate || 500;
    const shiftHours = profile.shiftHours || 8;
    const hourlyRate = dailyRate / shiftHours;

    const presentCount = records.filter((r: any) => r.status === 'present').length;
    const halfDayCount = records.filter((r: any) => r.status === 'half-day').length;
    
    const totalOtHours = records.reduce((sum: number, r: any) => sum + (parseFloat(r.overtimeHours) || 0), 0);
    const totalOTEarned = totalOtHours * hourlyRate;
    const totalAllowances = records.reduce((sum: number, r: any) => sum + (parseFloat(r.allowance) || 0), 0);
    
    const baseEarnings = (presentCount * dailyRate) + (halfDayCount * (dailyRate / 2));
    const totalEarned = baseEarnings + totalOTEarned + totalAllowances;
    
    const totalPaid = records.reduce((sum: number, r: any) => sum + (parseFloat(r.manualPayment) || 0), 0);
    const balance = totalEarned - totalPaid;

    return {
      earned: totalEarned,
      paid: totalPaid,
      balance,
      otHours: totalOtHours,
      otPay: totalOTEarned,
      daysMarked: records.length,
      payableDays: presentCount + (halfDayCount * 0.5),
      efficiency: 100 
    };
  }, [profile, records]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  if (isProfileLoading || isBizLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-40 min-h-screen bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Establishing Secure Track...</p>
      </div>
    );
  }

  if (profileError || !profile || !profile.sharePublic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="h-16 w-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Private Profile</h1>
        <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto leading-relaxed">
          This tracking page is private. Please contact the administrator to enable "Public Track" mode.
        </p>
        <Button asChild variant="outline" className="mt-8 rounded-xl h-11 px-8 font-bold uppercase text-[10px] tracking-widest">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  const balanceColor = (stats?.balance || 0) > 0 ? "text-red-600" : (stats?.balance || 0) < 0 ? "text-indigo-600" : "text-green-600";
  const balanceBg = (stats?.balance || 0) > 0 ? "bg-red-50 border-red-100" : (stats?.balance || 0) < 0 ? "bg-indigo-50 border-indigo-100" : "bg-green-50 border-green-100";

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="h-12 w-12 sm:h-14 sm:w-14 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-border/10 shrink-0 overflow-hidden">
               {business?.logoUrl ? (
                 <img src={business.logoUrl} className="h-full w-full object-contain p-1" alt="Logo" />
               ) : (
                <div className="h-full w-full bg-primary flex items-center justify-center text-white font-black text-lg">
                  {business?.name?.charAt(0) || "B"}
                </div>
               )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm sm:text-base font-black text-slate-900 truncate leading-none">{business?.name || "Member Portal"}</span>
              <span className="text-[9px] sm:text-[10px] font-black text-green-600 flex items-center gap-1.5 uppercase tracking-widest mt-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Live Performance Hub
              </span>
            </div>
          </div>
          
          <Button asChild variant="ghost" size="sm" className="h-9 rounded-xl text-[10px] font-black uppercase text-primary">
            <Link href="/"><ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Site Home</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 md:p-12 text-white shadow-2xl flex-1 w-full">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
              <UserCircle className="h-64 w-64 text-white" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="h-24 w-24 rounded-[2rem] bg-white border-4 border-white/20 shadow-2xl flex items-center justify-center text-primary font-black text-4xl shrink-0">
                {profile?.name?.charAt(0)}
              </div>
              <div className="space-y-2 text-center md:text-left flex-1 min-w-0">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                  <Badge className="bg-primary text-white border-none font-black text-[10px] uppercase h-5 px-2">{profile?.role || "Specialist"}</Badge>
                  <Badge variant="outline" className="text-white/40 border-white/20 text-[9px] font-bold uppercase">Digital ID Verified</Badge>
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight truncate">{profile?.name}</h1>
                <p className="text-sm text-slate-400 font-medium flex items-center justify-center md:justify-start gap-2">
                  <Sparkles className="h-4 w-4 text-accent" /> Track Status & Earnings Dashboard
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border shadow-sm w-full sm:w-auto">
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="border-none shadow-sm bg-white rounded-2xl p-6 border-l-4 border-l-primary">
            <div className="flex items-center justify-between opacity-60 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest">Period Earnings</span>
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-slate-900">{currencySymbol}{stats?.earned.toLocaleString()}</div>
            <p className="text-[8px] font-black uppercase text-muted-foreground mt-2">{MONTHS[parseInt(selectedMonth)-1]} {selectedYear} Log</p>
          </Card>

          <Card className={cn("border-none shadow-md rounded-2xl p-6 border-l-4 transition-all", balanceBg)}>
            <div className="flex items-center justify-between opacity-60 mb-1">
              <span className={cn("text-[10px] font-bold uppercase tracking-widest", balanceColor)}>
                {(stats?.balance || 0) > 0 ? "Pending Payout" : (stats?.balance || 0) < 0 ? "Advance Available" : "Account Clear"}
              </span>
              <History className={cn("h-4 w-4", balanceColor)} />
            </div>
            <div className={cn("text-2xl font-black", balanceColor)}>{currencySymbol}{Math.abs(stats?.balance || 0).toLocaleString()}</div>
            <p className="text-[8px] font-black uppercase opacity-40 mt-2">Latest Statement Balance</p>
          </Card>

          <Card className="border-none shadow-sm bg-white rounded-2xl p-6 border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between opacity-60 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Total OT</span>
              <Zap className="h-4 w-4 text-orange-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{stats?.otHours} Hours</div>
            <p className="text-[8px] font-black uppercase text-muted-foreground mt-2">{currencySymbol}{stats?.otPay.toLocaleString()} OT Premium</p>
          </Card>

          <Card className="border-none shadow-sm bg-white rounded-2xl p-6 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between opacity-60 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">Amount Received</span>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{currencySymbol}{stats?.paid.toLocaleString()}</div>
            <p className="text-[8px] font-black uppercase text-muted-foreground mt-2">Verified Transfers</p>
          </Card>
        </div>

        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="bg-white border h-14 p-1.5 rounded-2xl shadow-sm mb-8 flex overflow-x-auto scrollbar-hide">
            <TabsTrigger value="attendance" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><CalendarCheck className="h-4 w-4" /> Activity Matrix</TabsTrigger>
            <TabsTrigger value="tasks" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><Layers className="h-4 w-4" /> Duty List</TabsTrigger>
            <TabsTrigger value="agreement" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><ShieldCheck className="h-4 w-4" /> Terms</TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-12">
              <TabsContent value="attendance" className="m-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2.5rem] border">
                  <CardHeader className="bg-muted/20 border-b py-5 px-8 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <History className="h-4 w-4" /> Monthly Log: {MONTHS[parseInt(selectedMonth)-1]} {selectedYear}
                    </CardTitle>
                    {isRecordsLoading && <Loader2 className="h-4 w-4 animate-spin text-primary opacity-20" />}
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/10">
                          <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Date</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-center h-12">Status</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-center h-12">OT Hours</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-center h-12">OT Pay(₹)</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-center h-12">Exps (₹)</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-center h-12">Paid Today (₹)</TableHead>
                          <TableHead className="text-right pr-8 text-[10px] font-black uppercase h-12">Total Payout (₹)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(records.length === 0 && !isRecordsLoading) ? (
                          <TableRow><TableCell colSpan={7} className="h-40 text-center opacity-30 italic text-sm">No records found for the selection window.</TableCell></TableRow>
                        ) : (
                          records.map((record: any) => {
                            const dailyRate = profile.dailyRate || 500;
                            const hourlyRate = dailyRate / (profile.shiftHours || 8);
                            
                            let base = 0;
                            if (record.status === 'present') base = dailyRate;
                            else if (record.status === 'half-day') base = dailyRate / 2;

                            const otHrs = parseFloat(record.overtimeHours) || 0;
                            const otAmt = otHrs * hourlyRate;
                            const allow = parseFloat(record.allowance) || 0;
                            const totalDayPayout = base + otAmt + allow;
                            const todayPay = parseFloat(record.manualPayment) || 0;

                            return (
                              <TableRow key={record.id} className="hover:bg-muted/5 transition-colors border-b">
                                <TableCell className="pl-8 py-5">
                                  <span className="text-xs font-bold text-slate-900">{new Date(record.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={record.status === 'present' ? 'default' : 'outline'} className={cn(
                                    "text-[8px] font-black uppercase h-4 px-1.5 border-none",
                                    record.status === 'present' ? "bg-green-100 text-green-700" : 
                                    record.status === 'half-day' ? "bg-orange-100 text-orange-700" : "bg-red-50 text-red-600"
                                  )}>
                                    {record.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center text-xs font-bold text-slate-600">{otHrs || '-'}</TableCell>
                                <TableCell className="text-center text-xs font-bold text-primary">{otAmt > 0 ? `${currencySymbol}${Math.round(otAmt)}` : '-'}</TableCell>
                                <TableCell className="text-center text-xs font-bold text-slate-600">{allow > 0 ? `${currencySymbol}${allow}` : '-'}</TableCell>
                                <TableCell className="text-center text-xs font-bold text-green-600">{todayPay > 0 ? `${currencySymbol}${todayPay}` : '-'}</TableCell>
                                <TableCell className="text-right pr-8 font-black text-sm text-primary">{currencySymbol}{totalDayPayout.toLocaleString()}</TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="tasks" className="m-0">
                <div className="p-20 text-center bg-white rounded-[2rem] border border-dashed flex flex-col items-center gap-4">
                  <AlertCircle className="h-12 w-12 opacity-20" />
                  <p className="text-xs font-black uppercase tracking-widest opacity-40">Task Pipeline Restricted</p>
                  <p className="text-[10px] text-muted-foreground max-w-xs mx-auto">Specific tasks are private. Please contact the administrator for a manifest of your active duties.</p>
                </div>
              </TabsContent>

              <TabsContent value="agreement" className="m-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border">
                  <CardHeader className="bg-muted/30 border-b py-6 px-8">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" /> Employment Contract
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-10">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Base Daily Rate</p>
                      <p className="text-lg font-black text-slate-900">{currencySymbol}{profile?.dailyRate || 500} / Day</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Calculated Hourly</p>
                      <p className="text-lg font-black text-slate-900">{currencySymbol}{Math.round((profile?.dailyRate || 500) / (profile?.shiftHours || 8))} / Hr</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Assigned Shift</p>
                      <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" /> {profile?.shiftTimings || "09:00 AM - 06:00 PM"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Standard Hours</p>
                      <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Timer className="h-4 w-4 text-primary" /> {profile?.shiftHours || 8} Hours / Day
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </main>

      <footer className="mt-20 py-12 bg-white border-t text-center">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-lg">B</div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">
              © 2026 Biztrix AI • <span className="text-primary font-black">Personal Performance Node</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
