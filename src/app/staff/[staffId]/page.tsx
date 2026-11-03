
"use client";

import { use, useState, useMemo, useEffect } from "react";
import { 
  ArrowLeft, 
  UserCircle, 
  Calendar, 
  Wallet, 
  History, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  SmartphoneNfc, 
  Mail, 
  Phone, 
  Building2, 
  ShieldCheck, 
  Clock, 
  Timer, 
  DollarSign, 
  Coins,
  ChevronRight,
  Filter,
  ArrowRight,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Share2,
  BadgeCheck,
  Zap,
  Briefcase
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { doc, query, where, collection, getDocs, orderBy, increment } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const YEARS = ["2023", "2024", "2025", "2026"];

export default function StaffProfilePage(props: { params: Promise<{ staffId: string }> }) {
  const { staffId } = use(props.params);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  // 1. Resolve Profile
  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: adminProfile } = useDoc<any>(userProfileRef);
  const businessId = adminProfile?.businessId;

  // 2. Fetch Target Staff Profile
  const staffRef = useMemoFirebase(() => staffId ? doc(firestore, 'users', staffId) : null, [firestore, staffId]);
  const { data: profile, isLoading: isProfileLoading } = useDoc<any>(staffRef);

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
    const absentCount = records.filter((r: any) => r.status === 'absent').length;
    
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
      presentCount,
      halfDayCount,
      absentCount,
      otHours: totalOtHours,
      otPay: totalOTEarned,
      daysMarked: records.length,
      payableDays: presentCount + (halfDayCount * 0.5),
      totalAllowances,
      baseEarnings
    };
  }, [profile, records]);

  const handleExportCSV = () => {
    if (!records || records.length === 0 || !profile) {
      toast({ variant: "destructive", title: "No Data", description: "No records found for the selected period." });
      return;
    }

    const dailyRate = profile.dailyRate || 500;
    const shiftHours = profile.shiftHours || 8;
    const hourlyRate = dailyRate / shiftHours;

    const headers = [
      "Date", 
      "Status", 
      "OT Hours", 
      "OT Payment (₹)", 
      "Allowances (₹)", 
      "Amount Paid (₹)", 
      "Total Earning (₹)", 
      "Balance (₹)"
    ];

    const csvRows = records.map(r => {
      let base = 0;
      if (r.status === 'present') base = dailyRate;
      else if (r.status === 'half-day') base = dailyRate / 2;

      const otPay = (parseFloat(r.overtimeHours) || 0) * hourlyRate;
      const allow = (parseFloat(r.allowance) || 0);
      const paid = (parseFloat(r.manualPayment) || 0);
      const dayEarnings = base + otPay + allow;
      const dayBalance = dayEarnings - paid;

      return [
        r.date,
        r.status.toUpperCase(),
        r.overtimeHours || 0,
        otPay.toFixed(2),
        allow.toFixed(2),
        paid.toFixed(2),
        dayEarnings.toFixed(2),
        dayBalance.toFixed(2)
      ].join(',');
    });

    const totalRow = [
      "GRAND TOTAL",
      "",
      stats?.otHours || 0,
      stats?.otPay.toFixed(2) || 0,
      records.reduce((sum, r) => sum + (parseFloat(r.allowance) || 0), 0).toFixed(2),
      stats?.paid.toFixed(2) || 0,
      stats?.earned.toFixed(2) || 0,
      stats?.balance.toFixed(2) || 0
    ].join(',');

    const csvContent = headers.join(',') + '\n' + csvRows.join('\n') + '\n' + totalRow;
    const fileName = `activity_${profile.name.replace(/\s+/g, '_')}_${MONTHS[parseInt(selectedMonth)-1]}_${selectedYear}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Report Exported", description: `File: ${fileName}` });
  };

  const handleShareSlipWhatsApp = () => {
    if (!stats || !profile) return;
    const month = MONTHS[parseInt(selectedMonth)-1];
    const message = `📄 *Salary Slip Node: ${month} ${selectedYear}*\n━━━━━━━━━━━━━━━━\n👤 *Specialist:* ${profile.name}\n💼 *Role:* ${profile.role}\n\n✅ *Present:* ${stats.presentCount} Days\n🕒 *OT Hours:* ${stats.otHours}\n\n💰 *Total Earning:* ₹${stats.earned.toLocaleString()}\n💸 *Paid Advance:* ₹${stats.paid.toLocaleString()}\n\n🎯 *Net Payable:* ₹${stats.balance.toLocaleString()}\n━━━━━━━━━━━━━━━━\n_Powered by Biztrix AI OS_`;
    window.open(`https://wa.me/${profile.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
    toast({ title: "Slip Summary Dispatched" });
  };

  const currencySymbol = getCurrencySymbol("INR");

  if (isProfileLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;
  if (!profile) return <div className="p-20 text-center">Staff not found.</div>;

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto px-4 sm:px-0 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm border border-border/50 shrink-0"><Link href="/staff"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="flex items-center gap-4">
             <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-xl shadow-primary/10">{profile.name?.charAt(0)}</div>
             <div className="text-left">
               <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight uppercase">{profile.name}</h1>
               <div className="flex items-center gap-2 mt-1">
                 <Badge className="bg-primary text-white border-none font-black text-[9px] uppercase h-5 px-2">{profile.role}</Badge>
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">• ID: {staffId.slice(-6).toUpperCase()}</span>
               </div>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button onClick={handleExportCSV} variant="outline" className="h-11 px-6 rounded-xl border-primary/20 text-primary hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest bg-white">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border shadow-sm flex-1 sm:flex-none">
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
          <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl bg-white text-green-600 border-green-100" onClick={() => window.open(`https://wa.me/${profile.phone?.replace(/\D/g, '')}`, '_blank')}>
            <SmartphoneNfc className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border border-border/50 text-left">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Period Earnings</p>
          <div className="text-2xl font-black text-slate-900">₹{stats?.earned.toLocaleString()}</div>
          <p className="text-[8px] font-bold uppercase text-primary mt-2">Based on {stats?.payableDays} Work Days</p>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-green-500 text-left">
          <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Amount Paid</p>
          <div className="text-2xl font-black text-green-600">₹{stats?.paid.toLocaleString()}</div>
          <p className="text-[8px] font-bold uppercase text-muted-foreground mt-2">Total Transfers Logged</p>
        </Card>
        <Card className={cn("border-none shadow-sm rounded-3xl p-6 border-l-4 transition-all text-left", (stats?.balance || 0) > 0 ? "border-l-red-500 bg-red-50/30" : "border-l-green-500 bg-green-50/30")}>
          <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", (stats?.balance || 0) > 0 ? "text-red-600" : "text-green-600")}>
            {(stats?.balance || 0) > 0 ? "Outstanding Due" : "Settled"}
          </p>
          <div className={cn("text-2xl font-black", (stats?.balance || 0) > 0 ? "text-red-600" : "text-green-600")}>
            ₹{Math.abs(stats?.balance || 0).toLocaleString()}
          </div>
          <p className="text-[8px] font-bold uppercase text-muted-foreground mt-2">Net Difference</p>
        </Card>
        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6 text-left">
          <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">Overtime Bonus</p>
          <div className="text-2xl font-black text-white">₹{stats?.otPay.toLocaleString()}</div>
          <p className="text-[8px] font-black uppercase text-slate-400 mt-2">{stats?.otHours} Extra Hours Clocked</p>
        </Card>
      </div>

      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="bg-white border h-14 p-1.5 rounded-2xl shadow-sm mb-10 flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="activity" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><History className="h-4 w-4" /> Activity Ledger</TabsTrigger>
          <TabsTrigger value="slip" className="flex-1 text-[10px] font-black uppercase px-8 gap-2 text-primary"><FileText className="h-4 w-4" /> Digital Salary Slip</TabsTrigger>
          <TabsTrigger value="sharing" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><SmartphoneNfc className="h-4 w-4" /> Sharing Node</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="m-0 space-y-6">
          <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2.5rem] border text-left">
            <CardHeader className="bg-muted/30 border-b py-5 px-8 flex justify-between items-center">
               <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                 <History className="h-4 w-4" /> Activity Matrix: {MONTHS[parseInt(selectedMonth)-1]} {selectedYear}
               </CardTitle>
               {isRecordsLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center h-12">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center h-12">OT Hours</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center h-12">OT Payment(₹)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center h-12">Exps (₹)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center h-12">Paid (₹)</TableHead>
                    <TableHead className="text-right pr-8 text-[10px] font-black uppercase h-12">Day Earning (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 && !isRecordsLoading ? (
                    <TableRow><TableCell colSpan={7} className="h-60 text-center opacity-30 italic text-sm font-black uppercase tracking-widest">No activity logged for this window.</TableCell></TableRow>
                  ) : (
                    records.map((r: any) => {
                      const dailyRate = profile.dailyRate || 500;
                      const shiftHours = profile.shiftHours || 8;
                      const hourlyRate = dailyRate / shiftHours;
                      
                      let base = 0;
                      if (r.status === 'present') base = dailyRate;
                      else if (r.status === 'half-day') base = dailyRate / 2;

                      const otPay = (parseFloat(r.overtimeHours) || 0) * hourlyRate;
                      const allowance = (parseFloat(r.allowance) || 0);
                      const payout = base + otPay + allowance;
                      const todayPayment = (parseFloat(r.manualPayment) || 0);

                      return (
                        <TableRow key={r.id} className="hover:bg-muted/5 transition-colors border-b">
                          <TableCell className="pl-8 py-5">
                            <span className="text-xs font-bold text-slate-700">{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={r.status === 'present' ? 'default' : 'outline'} className={cn(
                              "text-[8px] font-black uppercase h-4 px-1.5 border-none",
                              r.status === 'present' ? "bg-green-100 text-green-700" : 
                              r.status === 'half-day' ? "bg-orange-100 text-orange-700" : "bg-red-50 text-red-600"
                            )}>{r.status}</Badge>
                          </TableCell>
                          <TableCell className="text-center text-xs font-bold text-slate-500">{r.overtimeHours || '-'}</TableCell>
                          <TableCell className="text-center text-xs font-bold text-primary">₹{Math.round(otPay).toLocaleString()}</TableCell>
                          <TableCell className="text-center text-xs font-bold text-slate-500">{r.allowance ? `₹${r.allowance}` : '-'}</TableCell>
                          <TableCell className="text-center text-xs font-bold text-green-600">₹{todayPayment.toLocaleString()}</TableCell>
                          <TableCell className="text-right pr-8 font-black text-sm text-primary">₹{payout.toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="slip" className="m-0 space-y-8 animate-in fade-in zoom-in-95 duration-500">
           <Card className="max-w-4xl mx-auto border-none shadow-2xl bg-white rounded-[3rem] overflow-hidden border p-0 print:shadow-none print:border-none">
              <div className="p-8 sm:p-12 bg-slate-900 text-white text-left relative overflow-hidden shrink-0">
                 <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12"><FileText className="h-60 w-60" /></div>
                 <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
                    <div className="space-y-4">
                       <Badge variant="outline" className="bg-white/10 text-white border-white/20 uppercase text-[9px] font-black px-3 h-5 tracking-widest">OFFICIAL SALARY NODE</Badge>
                       <h3 className="text-3xl font-black tracking-tight">{profile.name}</h3>
                       <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">{profile.role} • ID: {profile.id.slice(-6).toUpperCase()}</p>
                    </div>
                    <div className="text-left sm:text-right">
                       <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">Pay Period</p>
                       <p className="text-lg font-black">{MONTHS[parseInt(selectedMonth)-1]} {selectedYear}</p>
                       <p className="text-[8px] text-slate-500 font-bold uppercase mt-2">Generated on {new Date().toLocaleDateString()}</p>
                    </div>
                 </div>
              </div>
              
              <div className="p-8 sm:p-12 space-y-12">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* EARNINGS */}
                    <div className="space-y-6">
                       <div className="flex items-center gap-3 px-1">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Earnings Matrix</h4>
                       </div>
                       <div className="space-y-4">
                          <div className="flex justify-between items-center px-1"><span className="text-xs font-bold text-slate-500 uppercase">Basic Pay ({stats?.payableDays} Days)</span><span className="text-sm font-black text-slate-900">{currencySymbol}{stats?.baseEarnings.toLocaleString()}</span></div>
                          <div className="flex justify-between items-center px-1"><span className="text-xs font-bold text-slate-500 uppercase">Overtime ({stats?.otHours} Hrs)</span><span className="text-sm font-black text-slate-900">{currencySymbol}{Math.round(stats?.otPay || 0).toLocaleString()}</span></div>
                          <div className="flex justify-between items-center px-1"><span className="text-xs font-bold text-slate-500 uppercase">Allowances</span><span className="text-sm font-black text-slate-900">{currencySymbol}{stats?.totalAllowances.toLocaleString()}</span></div>
                          <Separator className="opacity-40" />
                          <div className="flex justify-between items-center p-4 bg-primary/5 rounded-2xl border border-primary/10"><span className="text-xs font-black text-primary uppercase">Gross Earnings</span><span className="text-lg font-black text-primary">{currencySymbol}{stats?.earned.toLocaleString()}</span></div>
                       </div>
                    </div>

                    {/* DEDUCTIONS / PAYMENTS */}
                    <div className="space-y-6">
                       <div className="flex items-center gap-3 px-1">
                          <DollarSign className="h-4 w-4 text-red-600" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-red-600">Deductions & Advances</h4>
                       </div>
                       <div className="space-y-4">
                          <div className="flex justify-between items-center px-1"><span className="text-xs font-bold text-slate-500 uppercase">Advance / Manual Paid</span><span className="text-sm font-black text-red-600">{currencySymbol}{stats?.paid.toLocaleString()}</span></div>
                          <div className="flex justify-between items-center px-1"><span className="text-xs font-bold text-slate-500 uppercase">TDS / PF</span><span className="text-sm font-black text-slate-400">{currencySymbol}0.00</span></div>
                          <Separator className="opacity-40" />
                          <div className="flex justify-between items-center p-4 bg-red-50 rounded-2xl border border-red-100"><span className="text-xs font-black text-red-600 uppercase">Total Reductions</span><span className="text-lg font-black text-red-600">{currencySymbol}{stats?.paid.toLocaleString()}</span></div>
                       </div>
                    </div>
                 </div>

                 <div className="p-10 bg-slate-100 rounded-[2.5rem] border-2 border-dashed border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                       <div className="h-16 w-16 rounded-[1.5rem] bg-white flex items-center justify-center text-primary shadow-xl shrink-0"><CheckCircle2 className="h-8 w-8" /></div>
                       <div className="text-left">
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Net Payable Amount</p>
                          <h4 className="text-4xl font-black text-slate-900 tracking-tighter">{currencySymbol}{stats?.balance.toLocaleString()}</h4>
                       </div>
                    </div>
                    <div className="flex flex-col items-center sm:items-end gap-2">
                       <Badge className={cn("border-none text-[10px] font-black h-7 px-6 uppercase rounded-full shadow-lg", (stats?.balance || 0) <= 0 ? "bg-green-600 text-white" : "bg-orange-500 text-white")}>
                          {(stats?.balance || 0) <= 0 ? 'SETTLED' : 'PAYMENT DUE'}
                       </Badge>
                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center">Verified by Biztrix Financial Node</p>
                    </div>
                 </div>
              </div>
              <CardFooter className="p-8 sm:p-12 bg-muted/10 border-t flex flex-col sm:flex-row gap-4 print:hidden">
                 <Button onClick={() => window.print()} variant="outline" className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-white shadow-sm hover:bg-slate-50"><Printer className="h-4 w-4" /> Print Document</Button>
                 <Button onClick={handleShareSlipWhatsApp} className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-green-600 hover:bg-green-700 text-white shadow-xl active:scale-95 transition-all"><SmartphoneNfc className="h-4 w-4" /> Dispatch on WhatsApp</Button>
              </CardFooter>
           </Card>
        </TabsContent>

        <TabsContent value="sharing" className="m-0 animate-in fade-in">
          <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden border text-left">
            <CardHeader className="bg-primary/5 border-b py-5 px-6">
               <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                 <SmartphoneNfc className="h-4 w-4" /> Share Tracking Node
               </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
               <p className="text-sm text-muted-foreground leading-relaxed font-medium">Give this specialist direct access to view their own attendance, earnings log, and <strong>Salary Slips</strong> via a secure public link.</p>
               <div className="p-8 bg-muted/20 rounded-[2rem] border-2 border-dashed border-border/50 text-center space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Public Tracking Portal</span>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase">Enable secure external access</p>
                    </div>
                    <Switch 
                      checked={!!profile.sharePublic} 
                      onCheckedChange={(v) => updateDocumentNonBlocking(staffRef!, { sharePublic: v })}
                      className="scale-90 data-[state=checked]:bg-primary" 
                    />
                  </div>
                  {profile.sharePublic && (
                    <div className="space-y-4 animate-in zoom-in-95">
                      <div className="p-4 bg-white rounded-2xl border text-[9px] font-mono text-primary truncate shadow-inner">
                        {`${window.location.origin}/staff/track/${businessId}/${staffId}`}
                      </div>
                      <Button 
                        onClick={() => {
                          const url = `${window.location.origin}/staff/track/${businessId}/${staffId}`;
                          navigator.clipboard.writeText(url);
                          toast({ title: "Copied", description: "URL ready to send." });
                        }}
                        className="w-full h-12 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl hover:bg-slate-800"
                      >
                        Copy Track Link
                      </Button>
                    </div>
                  )}
               </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
