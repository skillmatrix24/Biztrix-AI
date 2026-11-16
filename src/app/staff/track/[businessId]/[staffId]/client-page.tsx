"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Wallet,
  CalendarCheck,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Timer,
  Layers,
  ShieldCheck,
  ShieldAlert,
  History,
  ArrowLeft,
  Filter,
  HandCoins,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { useFirestore } from "@/firebase";
import { doc, getDoc, getDocs, collection, query, where, orderBy } from "firebase/firestore";
import Link from "next/link";
import {
  aggregateStaffPayrollRow,
  calculateOvertimePay,
  formatShortDateLabel,
  getEffectiveDailyRate,
  getEffectiveShiftHours,
  getMonthQueryBounds,
  getPayrollYearOptions,
  parseNonNegativeNumber,
  PAYROLL_MONTHS,
} from "@/lib/staff-payroll";

type PageProps = {
  params: { businessId: string; staffId: string };
};

export default function StaffTrackPage(props: PageProps) {
  const { businessId, staffId } = props.params;
  const firestore = useFirestore();

  const [profile, setProfile] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadPublicMeta() {
      if (!firestore || !staffId || !businessId) {
        if (!cancelled) setIsProfileLoading(false);
        return;
      }
      setIsProfileLoading(true);
      setProfileError(null);
      try {
        const [publicSnap, bizSnap] = await Promise.all([
          getDoc(doc(firestore, "businesses", businessId, "publicStaff", staffId)),
          getDoc(doc(firestore, "businesses", businessId)),
        ]);

        if (!cancelled) {
          setProfile(publicSnap.exists() ? { ...publicSnap.data(), id: publicSnap.id } : null);
          setBusiness(bizSnap.exists() ? { ...bizSnap.data(), id: bizSnap.id } : null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setProfileError(err instanceof Error ? err : new Error("Private profile"));
        }
      } finally {
        if (!cancelled) setIsProfileLoading(false);
      }
    }
    void loadPublicMeta();
    return () => {
      cancelled = true;
    };
  }, [firestore, businessId, staffId]);

  const now = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState(() => (new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());
  const yearOptions = useMemo(
    () => getPayrollYearOptions(now, [selectedYear]),
    [now, selectedYear]
  );

  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<any[]>([]);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchMonthRecords() {
      if (!businessId || !staffId || !profile?.sharePublic) return;
      setIsRecordsLoading(true);

      const monthNum = Number.parseInt(selectedMonth, 10) || 1;
      const yearNum = Number.parseInt(selectedYear, 10) || new Date().getFullYear();
      const { start, end } = getMonthQueryBounds(monthNum, yearNum);

      const q = query(
        collection(firestore, "businesses", businessId, "publicStaff", staffId, "records"),
        where("date", ">=", start),
        where("date", "<=", end),
        orderBy("date", "desc")
      );

      try {
        const snap = await getDocs(q);
        if (cancelled) return;
        const allDocs = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
        setAttendanceRecords(allDocs.filter((r: any) => r.recordType !== "payment"));
        setPaymentRecords(allDocs.filter((r: any) => r.recordType === "payment"));
      } catch {
        if (!cancelled) {
          setAttendanceRecords([]);
          setPaymentRecords([]);
        }
      } finally {
        if (!cancelled) setIsRecordsLoading(false);
      }
    }
    void fetchMonthRecords();
    return () => {
      cancelled = true;
    };
  }, [firestore, businessId, staffId, selectedMonth, selectedYear, profile?.sharePublic]);

  const stats = useMemo(() => {
    if (!profile) return null;
    const monthNum = Number.parseInt(selectedMonth, 10) || 1;
    const yearNum = Number.parseInt(selectedYear, 10) || now.getFullYear();
    const agg = aggregateStaffPayrollRow({
      staff: { ...profile, id: staffId },
      attendanceData: attendanceRecords,
      staffPayments: paymentRecords,
      monthOneBased: monthNum,
      year: yearNum,
    });

    return {
      earned: agg.totalEarnedMonth,
      paid: agg.totalPaidMonth,
      balance: agg.pendingBalance,
      otHours: agg.otHours,
      otPay: agg.otPay,
      daysMarked: attendanceRecords.length,
      payableDays: agg.payableDays,
    };
  }, [profile, staffId, attendanceRecords, paymentRecords, selectedMonth, selectedYear, now]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  if (isProfileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-screen bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-xs font-medium text-slate-500">Loading staff performance tracker...</p>
      </div>
    );
  }

  if (profileError || !profile || !profile.sharePublic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="h-14 w-14 bg-red-50 text-red-600 rounded-2xl border border-red-200 flex items-center justify-center mb-5">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Private Profile</h1>
        <p className="text-slate-600 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
          This tracking page is private. Please contact the administrator to enable Public Track
          mode.
        </p>
        <Button
          asChild
          variant="outline"
          className="mt-6 rounded-xl h-10 px-6 text-sm font-medium border-slate-200 bg-white shadow-none"
        >
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  const balanceColor =
    (stats?.balance || 0) > 0
      ? "text-red-600"
      : (stats?.balance || 0) < 0
        ? "text-indigo-600"
        : "text-emerald-600";
  const balanceBg =
    (stats?.balance || 0) > 0
      ? "bg-red-50/70 border-red-200"
      : (stats?.balance || 0) < 0
        ? "bg-indigo-50/70 border-indigo-200"
        : "bg-emerald-50/70 border-emerald-200";

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
              {business?.logoUrl ? (
                <img
                  src={business.logoUrl}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain p-1"
                  alt={business?.name || "Business Logo"}
                />
              ) : (
                <div className="h-full w-full bg-slate-900 flex items-center justify-center text-white font-semibold text-base">
                  {business?.name?.charAt(0) || "B"}
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm sm:text-base font-semibold text-slate-900 truncate leading-tight">
                {business?.name || "Member Portal"}
              </span>
              <span className="text-xs font-medium text-emerald-600 mt-0.5">
                Performance &amp; Payroll Portal
              </span>
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 rounded-xl text-xs font-medium border-slate-200 bg-white shadow-none"
          >
            <Link href="/">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Site Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-8 space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 md:p-10 text-white border border-slate-800 w-full">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="h-20 w-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 font-semibold text-3xl shrink-0">
              {profile?.name?.charAt(0)?.toUpperCase() || "S"}
            </div>
            <div className="space-y-2 text-center md:text-left flex-1 min-w-0">
              <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-slate-300">
                <span className="font-semibold text-white">{profile?.role || "Specialist"}</span>
                <span aria-hidden="true">·</span>
                <span>Verified Member Portal</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-semibold tracking-tight truncate">
                {profile?.name}
              </h1>
              <p className="text-sm text-slate-400">
                Attendance, overtime, and monthly payout statement
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
            <Filter className="h-3.5 w-3.5 text-slate-500 ml-2" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger
                aria-label="Select month"
                className="h-9 w-32 border-none bg-transparent font-medium text-xs shadow-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-slate-200 shadow-sm">
                {PAYROLL_MONTHS.map((m, i) => (
                  <SelectItem key={m} value={(i + 1).toString()}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Separator orientation="vertical" className="h-4" />
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger
                aria-label="Select year"
                className="h-9 w-24 border-none bg-transparent font-medium text-xs shadow-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-slate-200 shadow-sm">
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-slate-200 shadow-none bg-white rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-medium">Period Earnings</span>
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900">
              {currencySymbol}
              {Math.round(stats?.earned || 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              {PAYROLL_MONTHS[Number.parseInt(selectedMonth, 10) - 1]} {selectedYear} Log
            </p>
          </Card>

          <Card className={cn("border shadow-none rounded-2xl p-5 transition-colors", balanceBg)}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={cn("text-xs font-medium", balanceColor)}>
                {(stats?.balance || 0) > 0
                  ? "Pending Payout"
                  : (stats?.balance || 0) < 0
                    ? "Advance Available"
                    : "Account Clear"}
              </span>
              <History className={cn("h-4 w-4", balanceColor)} />
            </div>
            <div className={cn("text-2xl font-semibold font-mono tabular-nums", balanceColor)}>
              {currencySymbol}
              {Math.round(Math.abs(stats?.balance || 0)).toLocaleString()}
            </div>
            <p className="text-xs text-slate-600 mt-1.5">Latest Statement Balance</p>
          </Card>

          <Card className="border border-slate-200 shadow-none bg-white rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-medium text-orange-600">Total OT</span>
              <Zap className="h-4 w-4 text-orange-600" />
            </div>
            <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900">
              {stats?.otHours} Hours
            </div>
            <p className="text-xs font-mono tabular-nums text-slate-500 mt-1.5">
              {currencySymbol}
              {Math.round(stats?.otPay || 0).toLocaleString()} OT Premium
            </p>
          </Card>

          <Card className="border border-slate-200 shadow-none bg-white rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-medium text-emerald-600">Amount Received</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900">
              {currencySymbol}
              {Math.round(stats?.paid || 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">Verified Transfers</p>
          </Card>
        </div>

        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="bg-white border border-slate-200 h-12 p-1 rounded-xl shadow-none mb-6 flex overflow-x-auto scrollbar-hide">
            <TabsTrigger value="attendance" className="flex-1 text-xs font-medium px-6 gap-2">
              <CalendarCheck className="h-4 w-4" /> Activity Ledger
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex-1 text-xs font-medium px-6 gap-2">
              <Layers className="h-4 w-4" /> Duty List
            </TabsTrigger>
            <TabsTrigger value="agreement" className="flex-1 text-xs font-medium px-6 gap-2">
              <ShieldCheck className="h-4 w-4" /> Terms
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="m-0 space-y-6">
            <Card className="border border-slate-200 shadow-none overflow-hidden bg-white rounded-2xl">
              <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-4 px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Monthly Log:{" "}
                  {PAYROLL_MONTHS[Number.parseInt(selectedMonth, 10) - 1]} {selectedYear}
                </CardTitle>
                {isRecordsLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="pl-6 text-xs font-medium text-slate-500 h-11">
                        Date
                      </TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 text-center h-11">
                        Status
                      </TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 text-center h-11">
                        OT Hours
                      </TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 text-center h-11">
                        OT Pay ({currencySymbol})
                      </TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 text-center h-11">
                        Allowance ({currencySymbol})
                      </TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 text-center h-11">
                        Paid Today ({currencySymbol})
                      </TableHead>
                      <TableHead className="text-right pr-6 text-xs font-medium text-slate-500 h-11">
                        Total Earning ({currencySymbol})
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.length === 0 && !isRecordsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-36 text-center text-slate-500 text-sm">
                          No records found for the selected window.
                        </TableCell>
                      </TableRow>
                    ) : (
                      attendanceRecords.map((record: any) => {
                        const dailyRate = getEffectiveDailyRate(profile);
                        const shiftHours = getEffectiveShiftHours(profile);
                        const status = (record.status || "").toLowerCase();
                        const base =
                          status === "present"
                            ? dailyRate
                            : status === "half-day"
                              ? dailyRate / 2
                              : 0;
                        const otHrs =
                          status === "absent" ? 0 : parseNonNegativeNumber(record.overtimeHours);
                        const otAmt = calculateOvertimePay(dailyRate, shiftHours, otHrs);
                        const allow =
                          status === "absent" ? 0 : parseNonNegativeNumber(record.allowance);
                        const totalDayPayout = base + otAmt + allow;
                        const todayPay = parseNonNegativeNumber(record.manualPayment);

                        return (
                          <TableRow
                            key={record.id}
                            className="hover:bg-slate-50/60 transition-colors border-b border-slate-100"
                          >
                            <TableCell className="pl-6 py-4">
                              <span className="text-xs font-medium font-mono tabular-nums text-slate-900">
                                {formatShortDateLabel(record.date)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs font-medium border px-2 py-0.5 capitalize",
                                  record.status === "present"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : record.status === "half-day"
                                      ? "bg-orange-50 text-orange-700 border-orange-200"
                                      : "bg-red-50 text-red-600 border-red-200"
                                )}
                              >
                                {record.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-xs font-mono tabular-nums text-slate-600">
                              {otHrs || "-"}
                            </TableCell>
                            <TableCell className="text-center text-xs font-mono tabular-nums text-slate-900">
                              {otAmt > 0 ? `${currencySymbol}${Math.round(otAmt)}` : "-"}
                            </TableCell>
                            <TableCell className="text-center text-xs font-mono tabular-nums text-slate-600">
                              {allow > 0 ? `${currencySymbol}${allow}` : "-"}
                            </TableCell>
                            <TableCell className="text-center text-xs font-mono tabular-nums text-emerald-600">
                              {todayPay > 0 ? `${currencySymbol}${todayPay}` : "-"}
                            </TableCell>
                            <TableCell className="text-right pr-6 font-semibold font-mono tabular-nums text-sm text-slate-900">
                              {currencySymbol}
                              {Math.round(totalDayPayout).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {paymentRecords.length > 0 && (
              <Card className="border border-slate-200 shadow-none overflow-hidden bg-white rounded-2xl">
                <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-4 px-6">
                  <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <HandCoins className="h-4 w-4 text-emerald-600" /> Settlements &amp; Advances
                  </CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="pl-6 text-xs font-medium text-slate-500 h-11">
                          Date
                        </TableHead>
                        <TableHead className="text-xs font-medium text-slate-500 h-11">
                          Type
                        </TableHead>
                        <TableHead className="text-xs font-medium text-slate-500 h-11">
                          Mode
                        </TableHead>
                        <TableHead className="text-xs font-medium text-slate-500 h-11">
                          Note
                        </TableHead>
                        <TableHead className="text-right pr-6 text-xs font-medium text-slate-500 h-11">
                          Amount ({currencySymbol})
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentRecords.map((p: any) => (
                        <TableRow key={p.id} className="border-b border-slate-100">
                          <TableCell className="pl-6 py-3.5 text-xs font-mono tabular-nums text-slate-900">
                            {formatShortDateLabel(p.date)}
                          </TableCell>
                          <TableCell className="text-xs font-medium capitalize text-slate-700">
                            {p.type || "advance"}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {p.mode || "Cash"}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">{p.note || "-"}</TableCell>
                          <TableCell className="text-right pr-6 font-mono tabular-nums font-semibold text-sm text-emerald-700">
                            {currencySymbol}
                            {parseNonNegativeNumber(p.amount).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="m-0">
            <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-3">
              <AlertCircle className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-semibold text-slate-900">Task Pipeline Restricted</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Specific tasks are private. Please contact the administrator for a manifest of your
                active duties.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="agreement" className="m-0">
            <Card className="border border-slate-200 shadow-none bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-5 px-6">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Employment Contract
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">Base Daily Rate</p>
                  <p className="text-lg font-semibold font-mono tabular-nums text-slate-900">
                    {currencySymbol}
                    {getEffectiveDailyRate(profile)} / Day
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">Calculated Hourly</p>
                  <p className="text-lg font-semibold font-mono tabular-nums text-slate-900">
                    {currencySymbol}
                    {Math.round(
                      getEffectiveDailyRate(profile) / getEffectiveShiftHours(profile)
                    )}{" "}
                    / Hr
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">Assigned Shift</p>
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />{" "}
                    <span className="font-mono tabular-nums">
                      {profile?.shiftTimings || "09:00 AM - 06:00 PM"}
                    </span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">Standard Hours</p>
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Timer className="h-4 w-4 text-primary" />{" "}
                    <span className="font-mono tabular-nums">
                      {getEffectiveShiftHours(profile)}
                    </span>{" "}
                    Hours / Day
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mt-16 py-8 bg-white border-t border-slate-200 text-center">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-semibold text-xs">
              {business?.name?.charAt(0) || "B"}
            </div>
            <span className="text-xs font-medium text-slate-700">
              © {new Date().getFullYear()} {business?.name || "Biztrix"} · Personal Performance
              Portal
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
