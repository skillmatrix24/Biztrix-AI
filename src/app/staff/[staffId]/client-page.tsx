"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  History,
  TrendingUp,
  CheckCircle2,
  Loader2,
  SmartphoneNfc,
  DollarSign,
  Filter,
  Download,
  FileText,
  Printer,
  HandCoins,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
} from "@/firebase";
import {
  doc,
  query,
  where,
  collection,
  getDocs,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  aggregateStaffPayrollRow,
  buildStaffActivityCsv,
  calculateOvertimePay,
  formatShortDateLabel,
  getEffectiveDailyRate,
  getEffectiveShiftHours,
  getMonthQueryBounds,
  getPayrollYearOptions,
  isStaffAdminRole,
  parseNonNegativeNumber,
  PAYROLL_MONTHS,
} from "@/lib/staff-payroll";
import {
  mirrorStaffPaymentIfPublic,
  syncPublicStaffProfileAndRecords,
} from "@/lib/public-staff-sync";

export default function StaffProfilePage(props: { params: { staffId: string } }) {
  const { staffId } = props.params;
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: adminProfile } = useDoc<any>(userProfileRef);
  const businessId = adminProfile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const staffRef = useMemoFirebase(
    () => (staffId ? doc(firestore, "users", staffId) : null),
    [firestore, staffId]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc<any>(staffRef);

  const canManagePayroll = useMemo(
    () => isStaffAdminRole(adminProfile?.role, user?.email),
    [adminProfile?.role, user?.email]
  );

  const now = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState(() => (new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());
  const yearOptions = useMemo(
    () => getPayrollYearOptions(now, [selectedYear]),
    [now, selectedYear]
  );

  const [records, setRecords] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);
  const [isTogglingPublic, setIsTogglingPublic] = useState(false);

  // Record payment modal
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [payType, setPayType] = useState<"settlement" | "advance" | "bonus">("settlement");
  const [payMode, setPayMode] = useState("Cash");
  const [payNote, setPayNote] = useState("");
  const [logToCashbook, setLogToCashbook] = useState(true);

  const fetchMonthRecords = useCallback(async () => {
    if (!businessId || !staffId) return;
    setIsRecordsLoading(true);

    const monthNum = Number.parseInt(selectedMonth, 10) || 1;
    const yearNum = Number.parseInt(selectedYear, 10) || new Date().getFullYear();
    const { start, end } = getMonthQueryBounds(monthNum, yearNum);

    const attQuery = query(
      collection(firestore, "businesses", businessId, "attendance"),
      where("staffId", "==", staffId),
      where("date", ">=", start),
      where("date", "<=", end),
      orderBy("date", "desc")
    );

    const payQuery = query(
      collection(firestore, "businesses", businessId, "staffPayments"),
      where("staffId", "==", staffId),
      where("date", ">=", start),
      where("date", "<=", end),
      orderBy("date", "desc")
    );

    try {
      const [attSnap, paySnap] = await Promise.all([
        getDocs(attQuery),
        getDocs(payQuery).catch(() => ({ docs: [] as any[] })),
      ]);
      setRecords(attSnap.docs.map((d) => ({ ...d.data(), id: d.id })));
      setPayments(paySnap.docs.map((d) => ({ ...d.data(), id: d.id })));
    } catch (e) {
      console.error("Error fetching staff records:", e);
    } finally {
      setIsRecordsLoading(false);
    }
  }, [firestore, businessId, staffId, selectedMonth, selectedYear]);

  useEffect(() => {
    void fetchMonthRecords();
  }, [fetchMonthRecords]);

  const stats = useMemo(() => {
    if (!profile) return null;
    const monthNum = Number.parseInt(selectedMonth, 10) || 1;
    const yearNum = Number.parseInt(selectedYear, 10) || now.getFullYear();
    const agg = aggregateStaffPayrollRow({
      staff: { ...profile, id: staffId },
      attendanceData: records,
      staffPayments: payments,
      monthOneBased: monthNum,
      year: yearNum,
    });

    return {
      earned: agg.totalEarnedMonth,
      paid: agg.totalPaidMonth,
      balance: agg.pendingBalance,
      presentCount: agg.presentCount,
      halfDayCount: agg.halfDayCount,
      absentCount: agg.absentCount,
      otHours: agg.otHours,
      otPay: agg.otPay,
      daysMarked: records.length,
      payableDays: agg.payableDays,
      totalAllowances: agg.totalAllowances,
      baseEarnings: agg.baseEarnings,
    };
  }, [profile, staffId, records, payments, selectedMonth, selectedYear, now]);

  const currencyCode = business?.currency || "INR";
  const currencySymbol = getCurrencySymbol(currencyCode);
  const paymentModes = useMemo(
    () =>
      Array.isArray(business?.paymentModes) && business.paymentModes.length > 0
        ? business.paymentModes
        : ["Cash", "UPI", "Bank", "Card"],
    [business?.paymentModes]
  );

  const handleExportCSV = () => {
    if ((!records || records.length === 0) && (!payments || payments.length === 0)) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "No records found for the selected period.",
      });
      return;
    }
    if (!profile) return;

    const csvContent = buildStaffActivityCsv({
      staff: { ...profile, id: staffId },
      records,
      standalonePayments: payments,
      currencyCode,
    });
    const safeName = (profile.name || "staff").replace(/\s+/g, "_");
    const fileName = `activity_${safeName}_${PAYROLL_MONTHS[Number.parseInt(selectedMonth, 10) - 1]}_${selectedYear}.csv`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "Report Exported", description: `File: ${fileName}` });
  };

  const handleToggleSharePublic = async (checked: boolean) => {
    if (!staffRef || !businessId || !profile || !canManagePayroll) return;
    setIsTogglingPublic(true);
    try {
      updateDocumentNonBlocking(staffRef, { sharePublic: checked });
      await syncPublicStaffProfileAndRecords({
        firestore,
        businessId,
        staff: { ...profile, id: staffId },
        sharePublic: checked,
      });
      toast({
        title: checked ? "Public Portal Enabled" : "Public Portal Disabled",
        description: checked
          ? "Sanitized attendance and payout ledger synced for external sharing."
          : "Public tracking access has been revoked.",
      });
    } catch (err) {
      console.error("Failed syncing public profile:", err);
      toast({
        variant: "destructive",
        title: "Sync warning",
        description: "Could not sync all public tracking records.",
      });
    } finally {
      setIsTogglingPublic(false);
    }
  };

  const handleOpenPayModal = () => {
    const due = Math.round(stats?.balance || 0);
    setPayAmount(due > 0 ? String(due) : "");
    setPayDate(format(new Date(), "yyyy-MM-dd"));
    setPayType(due > 0 ? "settlement" : "advance");
    setPayMode(paymentModes[0] || "Cash");
    setPayNote(
      `${PAYROLL_MONTHS[Number.parseInt(selectedMonth, 10) - 1]} ${selectedYear} payroll`
    );
    setLogToCashbook(true);
    setIsPayOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!businessId || !profile || !canManagePayroll) return;
    const cleanAmount = parseNonNegativeNumber(payAmount);
    if (cleanAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Enter an amount greater than zero.",
      });
      return;
    }

    const addedRef = await addDocumentNonBlocking(
      collection(firestore, "businesses", businessId, "staffPayments"),
      {
        staffId,
        businessId,
        date: payDate,
        amount: cleanAmount,
        type: payType,
        mode: payMode,
        note: payNote.trim() || `${payType} payout`,
        recordedBy: user?.uid || "",
        createdAt: serverTimestamp(),
      }
    );

    if (logToCashbook) {
      addDocumentNonBlocking(collection(firestore, "businesses", businessId, "cashbook"), {
        businessId,
        type: "expense",
        amount: cleanAmount,
        category: "Salary",
        particulars: `Staff ${payType}: ${profile.name}${payNote ? ` (${payNote})` : ""}`,
        mode: payMode,
        entryBy: adminProfile?.name || "Admin",
        date: payDate,
        createdAt: serverTimestamp(),
      });
    }

    if (addedRef?.id) {
      await mirrorStaffPaymentIfPublic({
        firestore,
        businessId,
        staff: { ...profile, id: staffId },
        paymentId: addedRef.id,
        payload: {
          date: payDate,
          amount: cleanAmount,
          type: payType,
          mode: payMode,
          note: payNote.trim() || `${payType} payout`,
        },
      });
    }

    setIsPayOpen(false);
    toast({
      title: "Payment Recorded",
      description: `${currencySymbol}${cleanAmount.toLocaleString()} added to ${profile.name}'s ledger.`,
    });
    await fetchMonthRecords();
  };

  const whatsappPhone = profile?.phone?.replace(/\D/g, "") || "";
  const whatsappSlipMessage = useMemo(() => {
    if (!stats || !profile) return "";
    const month = PAYROLL_MONTHS[Number.parseInt(selectedMonth, 10) - 1];
    return `Salary Slip: ${month} ${selectedYear}\nSpecialist: ${profile.name}\nRole: ${profile.role}\nPresent: ${stats.presentCount} Days (Payable: ${stats.payableDays})\nOT Hours: ${stats.otHours}\nTotal Earning: ${currencySymbol}${Math.round(stats.earned).toLocaleString()}\nPaid / Advance: ${currencySymbol}${Math.round(stats.paid).toLocaleString()}\nNet Payable: ${currencySymbol}${Math.round(stats.balance).toLocaleString()}`;
  }, [stats, profile, selectedMonth, selectedYear, currencySymbol]);

  if (isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary h-10 w-10" />
      </div>
    );
  }
  if (!profile) {
    return <div className="p-20 text-center text-sm text-slate-500">Staff not found.</div>;
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-4 sm:px-0 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            asChild
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl bg-white border-slate-200 shadow-none shrink-0"
            aria-label="Back to staff list"
          >
            <Link href="/staff">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-white font-semibold text-lg">
              {profile.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-semibold text-slate-900 leading-tight">
                {profile.name}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                <span className="font-medium text-primary capitalize">{profile.role || "Staff"}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">ID: {staffId.slice(-6).toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {canManagePayroll && (
            <Button
              type="button"
              onClick={handleOpenPayModal}
              className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs"
            >
              <HandCoins className="mr-1.5 h-4 w-4" /> Record Payment
            </Button>
          )}
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="h-10 px-4 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs bg-white shadow-none"
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 flex-1 sm:flex-none">
            <Filter className="h-3.5 w-3.5 text-slate-500 ml-2" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger
                aria-label="Select month"
                className="h-8 w-32 border-none bg-transparent font-medium text-xs shadow-none"
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
                className="h-8 w-24 border-none bg-transparent font-medium text-xs shadow-none"
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
          {whatsappPhone && (
            <Button
              asChild
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl bg-white text-emerald-600 border-slate-200 shadow-none"
              aria-label="Message staff on WhatsApp"
            >
              <a
                href={`https://wa.me/${whatsappPhone}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <SmartphoneNfc className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-none bg-white rounded-2xl p-5 border border-slate-200 text-left">
          <p className="text-xs font-medium text-slate-500 mb-1">Period Earnings</p>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {currencySymbol}
            {Math.round(stats?.earned || 0).toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Based on <span className="font-mono tabular-nums">{stats?.payableDays}</span> Work Days
          </p>
        </Card>
        <Card className="shadow-none bg-white rounded-2xl p-5 border border-slate-200 text-left">
          <p className="text-xs font-medium text-emerald-600 mb-1">Amount Paid</p>
          <div className="text-2xl font-semibold font-mono tabular-nums text-emerald-600">
            {currencySymbol}
            {Math.round(stats?.paid || 0).toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">Daily + Settlement Transfers</p>
        </Card>
        <Card
          className={cn(
            "shadow-none rounded-2xl p-5 border transition-colors text-left",
            (stats?.balance || 0) > 0
              ? "border-red-200 bg-red-50/50"
              : "border-emerald-200 bg-emerald-50/50"
          )}
        >
          <p
            className={cn(
              "text-xs font-medium mb-1",
              (stats?.balance || 0) > 0 ? "text-red-600" : "text-emerald-600"
            )}
          >
            {(stats?.balance || 0) > 0 ? "Outstanding Due" : "Settled"}
          </p>
          <div
            className={cn(
              "text-2xl font-semibold font-mono tabular-nums",
              (stats?.balance || 0) > 0 ? "text-red-600" : "text-emerald-600"
            )}
          >
            {currencySymbol}
            {Math.round(Math.abs(stats?.balance || 0)).toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">Net Difference</p>
        </Card>
        <Card className="border border-slate-800 shadow-none bg-slate-900 text-white rounded-2xl p-5 text-left">
          <p className="text-xs font-medium text-slate-300 mb-1">Overtime Bonus</p>
          <div className="text-2xl font-semibold font-mono tabular-nums text-white">
            {currencySymbol}
            {Math.round(stats?.otPay || 0).toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            <span className="font-mono tabular-nums">{stats?.otHours}</span> Extra Hours Clocked
          </p>
        </Card>
      </div>

      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="bg-white border border-slate-200 h-12 p-1 rounded-xl shadow-none mb-6 flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="activity" className="flex-1 text-xs font-medium px-6 gap-2">
            <History className="h-4 w-4" /> Activity Ledger
          </TabsTrigger>
          <TabsTrigger value="slip" className="flex-1 text-xs font-medium px-6 gap-2 text-primary">
            <FileText className="h-4 w-4" /> Digital Salary Slip
          </TabsTrigger>
          <TabsTrigger value="sharing" className="flex-1 text-xs font-medium px-6 gap-2">
            <SmartphoneNfc className="h-4 w-4" /> Public Portal Link
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="m-0 space-y-6">
          <Card className="shadow-none overflow-hidden bg-white rounded-2xl border border-slate-200 text-left">
            <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-4 px-6 flex flex-row justify-between items-center">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Daily Attendance Ledger:{" "}
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
                      OT Payment ({currencySymbol})
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 text-center h-11">
                      Allowance ({currencySymbol})
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 text-center h-11">
                      Paid ({currencySymbol})
                    </TableHead>
                    <TableHead className="text-right pr-6 text-xs font-medium text-slate-500 h-11">
                      Day Earning ({currencySymbol})
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 && !isRecordsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-slate-500 text-sm">
                        No attendance logged for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((r: any) => {
                      const dailyRate = getEffectiveDailyRate(profile);
                      const shiftHours = getEffectiveShiftHours(profile);
                      const status = (r.status || "").toLowerCase();
                      const base =
                        status === "present" ? dailyRate : status === "half-day" ? dailyRate / 2 : 0;
                      const otHrs = status === "absent" ? 0 : parseNonNegativeNumber(r.overtimeHours);
                      const otPay = calculateOvertimePay(dailyRate, shiftHours, otHrs);
                      const allowance = status === "absent" ? 0 : parseNonNegativeNumber(r.allowance);
                      const payout = base + otPay + allowance;
                      const todayPayment = parseNonNegativeNumber(r.manualPayment);

                      return (
                        <TableRow
                          key={r.id}
                          className="hover:bg-slate-50/60 transition-colors border-b border-slate-100"
                        >
                          <TableCell className="pl-6 py-4">
                            <span className="text-xs font-mono tabular-nums font-medium text-slate-700">
                              {formatShortDateLabel(r.date)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs font-medium border px-2 py-0.5 capitalize",
                                r.status === "present"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : r.status === "half-day"
                                    ? "bg-orange-50 text-orange-700 border-orange-200"
                                    : "bg-red-50 text-red-600 border-red-200"
                              )}
                            >
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono tabular-nums text-slate-600">
                            {otHrs || "-"}
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono tabular-nums text-slate-900">
                            {currencySymbol}
                            {Math.round(otPay).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono tabular-nums text-slate-600">
                            {allowance > 0 ? `${currencySymbol}${allowance.toLocaleString()}` : "-"}
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono tabular-nums text-emerald-600">
                            {currencySymbol}
                            {todayPayment.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right pr-6 font-semibold font-mono tabular-nums text-sm text-slate-900">
                            {currencySymbol}
                            {Math.round(payout).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {payments.length > 0 && (
            <Card className="shadow-none overflow-hidden bg-white rounded-2xl border border-slate-200 text-left">
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
                      <TableHead className="text-xs font-medium text-slate-500 h-11">Type</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 h-11">Mode</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 h-11">Note</TableHead>
                      <TableHead className="text-right pr-6 text-xs font-medium text-slate-500 h-11">
                        Amount ({currencySymbol})
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p: any) => (
                      <TableRow key={p.id} className="border-b border-slate-100">
                        <TableCell className="pl-6 py-3.5 text-xs font-mono tabular-nums text-slate-700">
                          {formatShortDateLabel(p.date)}
                        </TableCell>
                        <TableCell className="text-xs font-medium capitalize text-slate-700">
                          {p.type || "advance"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{p.mode || "Cash"}</TableCell>
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

        <TabsContent value="slip" className="m-0 space-y-6">
          <Card className="max-w-4xl mx-auto shadow-none bg-white rounded-2xl overflow-hidden border border-slate-200 p-0 print:border-none">
            <div className="p-8 bg-slate-900 text-white text-left relative overflow-hidden shrink-0">
              <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="space-y-3">
                  <Badge
                    variant="outline"
                    className="bg-white/10 text-white border-white/20 text-xs font-medium px-2.5 py-0.5"
                  >
                    Official Salary Statement
                  </Badge>
                  <h3 className="text-2xl font-semibold tracking-tight">{profile.name}</h3>
                  <p className="text-slate-300 text-xs font-mono tabular-nums">
                    {profile.role} • ID: {staffId.slice(-6).toUpperCase()}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-medium text-slate-400 mb-1">Pay Period</p>
                  <p className="text-lg font-semibold">
                    {PAYROLL_MONTHS[Number.parseInt(selectedMonth, 10) - 1]} {selectedYear}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Generated on {format(new Date(), "dd MMM yyyy")}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold text-slate-900">Earnings Summary</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-600">
                        Basic Pay (<span className="font-mono tabular-nums">{stats?.payableDays}</span>{" "}
                        Days)
                      </span>
                      <span className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                        {currencySymbol}
                        {Math.round(stats?.baseEarnings || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-600">
                        Overtime (<span className="font-mono tabular-nums">{stats?.otHours}</span> Hrs)
                      </span>
                      <span className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                        {currencySymbol}
                        {Math.round(stats?.otPay || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-600">Allowances</span>
                      <span className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                        {currencySymbol}
                        {Math.round(stats?.totalAllowances || 0).toLocaleString()}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-xs font-semibold text-slate-900">Gross Earnings</span>
                      <span className="text-lg font-semibold font-mono tabular-nums text-primary">
                        {currencySymbol}
                        {Math.round(stats?.earned || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-red-600" />
                    <h4 className="text-sm font-semibold text-red-600">
                      Deductions &amp; Advances
                    </h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-600">
                        Advances &amp; Settlements Paid
                      </span>
                      <span className="text-sm font-semibold font-mono tabular-nums text-red-600">
                        {currencySymbol}
                        {Math.round(stats?.paid || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-600">TDS / PF</span>
                      <span className="text-sm font-semibold font-mono tabular-nums text-slate-400">
                        {currencySymbol}0.00
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center p-4 bg-red-50/70 rounded-xl border border-red-200">
                      <span className="text-xs font-semibold text-red-700">Total Paid / Deducted</span>
                      <span className="text-lg font-semibold font-mono tabular-nums text-red-600">
                        {currencySymbol}
                        {Math.round(stats?.paid || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-primary shrink-0">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-slate-500 mb-0.5">Net Payable Amount</p>
                    <h4 className="text-3xl font-semibold font-mono tabular-nums text-slate-900 tracking-tight">
                      {currencySymbol}
                      {Math.round(stats?.balance || 0).toLocaleString()}
                    </h4>
                  </div>
                </div>
                <div className="flex flex-col items-center sm:items-end gap-1.5">
                  <Badge
                    className={cn(
                      "border-none text-xs font-medium px-4 py-1 rounded-full",
                      (stats?.balance || 0) <= 0
                        ? "bg-emerald-600 text-white"
                        : "bg-orange-500 text-white"
                    )}
                  >
                    {(stats?.balance || 0) <= 0 ? "Settled" : "Payment Due"}
                  </Badge>
                  <p className="text-xs text-slate-500 text-center">
                    {business?.name || "Workspace"} Payroll Ledger
                  </p>
                </div>
              </div>
            </div>
            <CardFooter className="p-6 sm:p-8 bg-slate-50/60 border-t border-slate-200 flex flex-col sm:flex-row gap-3 print:hidden">
              <Button
                onClick={() => window.print()}
                variant="outline"
                className="flex-1 h-11 rounded-xl font-medium text-xs gap-2 bg-white border-slate-200 shadow-none hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" /> Print Document
              </Button>
              <Button
                asChild
                className="flex-1 h-11 rounded-xl font-medium text-xs gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-none"
              >
                <a
                  href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappSlipMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => toast({ title: "Slip Summary Dispatched" })}
                >
                  <SmartphoneNfc className="h-4 w-4" /> Dispatch on WhatsApp
                </a>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="sharing" className="m-0">
          <Card className="shadow-none bg-white rounded-2xl overflow-hidden border border-slate-200 text-left">
            <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-4 px-6">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <SmartphoneNfc className="h-4 w-4 text-primary" /> Share Tracking Portal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <p className="text-sm text-slate-600 leading-relaxed">
                Give this specialist read-only access to view their attendance, earnings log, and
                payout statements via a secure public link (no private phone or email exposed).
              </p>
              <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-5">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-sm font-semibold text-slate-900">
                      Public Tracking Portal
                    </span>
                    <p className="text-xs text-slate-500">
                      {isTogglingPublic
                        ? "Syncing tracking portal..."
                        : "Enable secure external access"}
                    </p>
                  </div>
                  <Switch
                    disabled={!canManagePayroll || isTogglingPublic}
                    checked={!!profile.sharePublic}
                    onCheckedChange={handleToggleSharePublic}
                    aria-label="Toggle public tracking portal"
                    className="scale-90 data-[state=checked]:bg-primary"
                  />
                </div>
                {profile.sharePublic && businessId && (
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-mono text-primary truncate">
                      {`${typeof window !== "undefined" ? window.location.origin : ""}/staff/track/${businessId}/${staffId}`}
                    </div>
                    <Button
                      onClick={() => {
                        const url = `${window.location.origin}/staff/track/${businessId}/${staffId}`;
                        navigator.clipboard.writeText(url);
                        toast({ title: "Copied", description: "URL ready to send." });
                      }}
                      className="w-full h-11 bg-slate-900 text-white font-medium text-xs rounded-xl shadow-none hover:bg-slate-800"
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

      {/* Record Staff Payment Dialog */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl border-slate-200 p-0 overflow-hidden text-left">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <HandCoins className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Record Payment for {profile.name}
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  Outstanding balance: {currencySymbol}
                  {Math.round(stats?.balance || 0).toLocaleString()}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="profile-pay-amount" className="text-xs font-semibold text-slate-700">
                  Amount ({currencySymbol})
                </Label>
                <Input
                  id="profile-pay-amount"
                  type="number"
                  min="1"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="h-10 rounded-xl font-mono tabular-nums font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-pay-date" className="text-xs font-semibold text-slate-700">
                  Payment Date
                </Label>
                <Input
                  id="profile-pay-date"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="h-10 rounded-xl font-mono text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Payout Type</Label>
                <Select
                  value={payType}
                  onValueChange={(v) => setPayType(v as "settlement" | "advance" | "bonus")}
                >
                  <SelectTrigger className="h-10 rounded-xl text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="settlement">Salary Settlement</SelectItem>
                    <SelectItem value="advance">Advance</SelectItem>
                    <SelectItem value="bonus">Bonus / Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Payment Mode</Label>
                <Select value={payMode} onValueChange={setPayMode}>
                  <SelectTrigger className="h-10 rounded-xl text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {paymentModes.map((m: string) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-pay-note" className="text-xs font-semibold text-slate-700">
                Note
              </Label>
              <Input
                id="profile-pay-note"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                className="h-10 rounded-xl text-sm"
              />
            </div>
            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer pt-1">
              <Checkbox
                checked={logToCashbook}
                onCheckedChange={(v) => setLogToCashbook(Boolean(v))}
              />
              <span>Also record as Salary expense in Cashbook</span>
            </label>
          </div>
          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200 flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPayOpen(false)}
              className="flex-1 h-10 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRecordPayment}
              className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
            >
              Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
