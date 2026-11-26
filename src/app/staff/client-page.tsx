"use client";

import { useState, useMemo } from "react";
import {
  Users2,
  UserPlus,
  CalendarCheck,
  Wallet,
  Search,
  Loader2,
  Coins,
  Phone,
  Receipt,
  Filter,
  ChevronRight,
  Download,
  Check,
  LayoutList,
  LayoutGrid,
  HandCoins,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
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
  deleteDocumentNonBlocking,
  addDocumentNonBlocking,
} from "@/firebase";
import { collection, query, where, doc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { PageHeader, KpiStatCard, SectionCard, EmptyStatePanel } from "@/components/ui/editorial";
import {
  aggregateStaffPayrollRow,
  buildTeamSummaryCsv,
  calculateDayEarning,
  calculateOvertimePay,
  computeDailyTeamStats,
  formatLongDateLabel,
  formatShortDateLabel,
  getCombinedDateQueryRange,
  getDailyDraftKey,
  getDynamicRoleOptions,
  getEffectiveDailyRate,
  getEffectiveShiftHours,
  getPayrollYearOptions,
  isPendingStaffMember,
  isStaffAdminRole,
  parseNonNegativeNumber,
  PAYROLL_MONTHS,
  planAttendanceAction,
  resolveNumericDraft,
  type AttendanceStatus,
} from "@/lib/staff-payroll";
import {
  mirrorAttendanceRecordIfPublic,
  mirrorStaffPaymentIfPublic,
} from "@/lib/public-staff-sync";

export default function StaffManagementPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const staffQuery = useMemoFirebase(
    () =>
      businessId
        ? query(collection(firestore, "users"), where("businessId", "==", businessId))
        : null,
    [firestore, businessId]
  );
  const { data: staffList = [], isLoading: isStaffLoading } = useCollection<any>(staffQuery);

  const now = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [selectedMonth, setSelectedMonth] = useState(() => (new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());

  // Keyed by `${staffId}__${date}` so drafts never leak when changing dates
  const [otDrafts, setOtDrafts] = useState<Record<string, string>>({});
  const [allowanceDrafts, setAllowanceDrafts] = useState<Record<string, string>>({});
  const [payTodayDrafts, setPayTodayDrafts] = useState<Record<string, string>>({});

  const [roleFilter, setRoleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("directory");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  // Settlement payment dialog state
  const [settleTarget, setSettleTarget] = useState<any | null>(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleDate, setSettleDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [settleType, setSettleType] = useState<"settlement" | "advance" | "bonus">("settlement");
  const [settleMode, setSettleMode] = useState("Cash");
  const [settleNote, setSettleNote] = useState("");
  const [logToCashbook, setLogToCashbook] = useState(true);

  const canManagePayroll = useMemo(
    () => isStaffAdminRole(userProfile?.role, user?.email),
    [userProfile?.role, user?.email]
  );


  const queryRange = useMemo(
    () =>
      getCombinedDateQueryRange(
        Number.parseInt(selectedMonth, 10) || 1,
        Number.parseInt(selectedYear, 10) || now.getFullYear(),
        selectedDate
      ),
    [selectedMonth, selectedYear, selectedDate, now]
  );

  const attendanceQuery = useMemoFirebase(() => {
    if (!businessId) return null;
    return query(
      collection(firestore, "businesses", businessId, "attendance"),
      where("date", ">=", queryRange.start),
      where("date", "<=", queryRange.end)
    );
  }, [firestore, businessId, queryRange.start, queryRange.end]);
  const { data: attendanceData = [] } = useCollection<any>(attendanceQuery);

  const staffPaymentsQuery = useMemoFirebase(() => {
    if (!businessId) return null;
    return query(
      collection(firestore, "businesses", businessId, "staffPayments"),
      where("date", ">=", queryRange.start),
      where("date", "<=", queryRange.end)
    );
  }, [firestore, businessId, queryRange.start, queryRange.end]);
  const { data: staffPayments = [] } = useCollection<any>(staffPaymentsQuery);

  const tasksQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "tasks") : null),
    [firestore, businessId]
  );
  const { data: tasksList = [] } = useCollection<any>(tasksQuery);

  const roleOptions = useMemo(
    () => getDynamicRoleOptions(business?.staffRoles, staffList || []),
    [business?.staffRoles, staffList]
  );

  const yearOptions = useMemo(
    () => getPayrollYearOptions(now, [selectedYear]),
    [now, selectedYear]
  );

  const filteredStaff = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (staffList || []).filter((s: any) => {
      const matchesSearch =
        !q ||
        (s.name || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q);
      const matchesRole =
        roleFilter === "all" || (s.role || "").toLowerCase() === roleFilter.toLowerCase();
      return matchesSearch && matchesRole;
    });
  }, [staffList, searchTerm, roleFilter]);

  // Exclude unaccepted pending invites from attendance & payroll unless they already have records
  const activePayrollStaff = useMemo(() => {
    const staffIdsWithRecords = new Set([
      ...(attendanceData || []).map((a: any) => a.staffId),
      ...(staffPayments || []).map((p: any) => p.staffId),
    ]);
    return filteredStaff.filter(
      (s: any) => !isPendingStaffMember(s) || staffIdsWithRecords.has(s.id)
    );
  }, [filteredStaff, attendanceData, staffPayments]);

  const pendingStaff = useMemo(
    () => filteredStaff.filter((s: any) => isPendingStaffMember(s)),
    [filteredStaff]
  );

  const payrollSummary = useMemo(() => {
    const monthNum = Number.parseInt(selectedMonth, 10) || 1;
    const yearNum = Number.parseInt(selectedYear, 10) || now.getFullYear();

    return activePayrollStaff.map((s: any) => {
      const agg = aggregateStaffPayrollRow({
        staff: s,
        attendanceData: attendanceData || [],
        staffPayments: staffPayments || [],
        tasksList: tasksList || [],
        monthOneBased: monthNum,
        year: yearNum,
      });

      return {
        ...s,
        payableDays: agg.payableDays,
        totalEarnedMonth: agg.totalEarnedMonth,
        totalPaidMonth: agg.totalPaidMonth,
        pendingBalance: agg.pendingBalance,
        completedTasks: agg.completedTasks,
        totalAssignedTasks: agg.totalAssignedTasks,
        monthRecords: agg.monthRecords,
        monthPayments: agg.monthPayments,
        otHours: agg.otHours,
        otPay: agg.otPay,
      };
    });
  }, [activePayrollStaff, attendanceData, staffPayments, tasksList, selectedMonth, selectedYear, now]);

  const grandTotals = useMemo(
    () =>
      payrollSummary.reduce(
        (acc, s) => ({
          attendance: acc.attendance + (s.payableDays || 0),
          otHours: acc.otHours + (s.otHours || 0),
          otPay: acc.otPay + (s.otPay || 0),
          earnings: acc.earnings + (s.totalEarnedMonth || 0),
          paid: acc.paid + (s.totalPaidMonth || 0),
          balance: acc.balance + (s.pendingBalance || 0),
        }),
        { attendance: 0, otHours: 0, otPay: 0, earnings: 0, paid: 0, balance: 0 }
      ),
    [payrollSummary]
  );

  const stats = useMemo(() => {
    const daily = computeDailyTeamStats({
      staffList: activePayrollStaff,
      attendanceData: attendanceData || [],
      staffPayments: staffPayments || [],
      selectedDate,
    });

    const totalMonthlyDue = payrollSummary.reduce(
      (sum, s) => sum + (s.totalEarnedMonth || 0),
      0
    );
    const totalMonthlyPaid = payrollSummary.reduce(
      (sum, s) => sum + (s.totalPaidMonth || 0),
      0
    );

    return {
      total: activePayrollStaff.length,
      pendingCount: pendingStaff.length,
      activeToday: daily.presentToday,
      accruedWageToday: daily.accruedWageToday,
      cashPaidToday: daily.cashPaidToday,
      totalMonthlyDue,
      totalPaidSalary: totalMonthlyPaid,
    };
  }, [activePayrollStaff, pendingStaff.length, payrollSummary, attendanceData, staffPayments, selectedDate]);

  const handleExportCSV = () => {
    if (!payrollSummary || payrollSummary.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "Nothing to export based on filters.",
      });
      return;
    }

    const csvContent = buildTeamSummaryCsv(payrollSummary);
    const fileName = `team_summary_${PAYROLL_MONTHS[Number.parseInt(selectedMonth, 10) - 1]}_${selectedYear}.csv`;

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

    toast({ title: "Summary Exported", description: `File: ${fileName}` });
  };

  const clearDraftsForKey = (draftKey: string, fields: Array<"ot" | "allow" | "pay">) => {
    if (fields.includes("ot")) {
      setOtDrafts((prev) => {
        if (!(draftKey in prev)) return prev;
        const next = { ...prev };
        delete next[draftKey];
        return next;
      });
    }
    if (fields.includes("allow")) {
      setAllowanceDrafts((prev) => {
        if (!(draftKey in prev)) return prev;
        const next = { ...prev };
        delete next[draftKey];
        return next;
      });
    }
    if (fields.includes("pay")) {
      setPayTodayDrafts((prev) => {
        if (!(draftKey in prev)) return prev;
        const next = { ...prev };
        delete next[draftKey];
        return next;
      });
    }
  };

  const handleAttendanceAction = async (
    staffMember: any,
    mode: "toggle-status" | "save-details",
    targetStatus?: AttendanceStatus
  ) => {
    if (!businessId || !canManagePayroll) {
      toast({
        variant: "destructive",
        title: "Permission Required",
        description: "Only workspace admins or managers can update team attendance and payroll.",
      });
      return;
    }

    const staffId = staffMember.id;
    const draftKey = getDailyDraftKey(staffId, selectedDate);
    const recordId = `${staffId}_${selectedDate}`;
    const docRef = doc(firestore, "businesses", businessId, "attendance", recordId);
    const existingRecord = (attendanceData || []).find(
      (a: any) => a.staffId === staffId && a.date === selectedDate
    );

    const otInput = resolveNumericDraft(otDrafts[draftKey], existingRecord?.overtimeHours);
    const allowanceInput = resolveNumericDraft(
      allowanceDrafts[draftKey],
      existingRecord?.allowance
    );
    const payTodayInput = resolveNumericDraft(
      payTodayDrafts[draftKey],
      existingRecord?.manualPayment
    );

    const plan = planAttendanceAction({
      mode,
      targetStatus,
      existingRecord,
      otInput,
      allowanceInput,
      payTodayInput,
    });

    if (plan.kind === "require-status") {
      toast({
        variant: "destructive",
        title: "Select attendance status first",
        description:
          "Choose Present or Half day before saving OT or Allowance, or enter Pay today only to log an advance.",
      });
      return;
    }

    if (plan.kind === "delete-attendance") {
      deleteDocumentNonBlocking(docRef);
      clearDraftsForKey(draftKey, ["ot", "allow", "pay"]);
      void mirrorAttendanceRecordIfPublic({
        firestore,
        businessId,
        staff: staffMember,
        recordId,
        payload: null,
      });
      toast({
        title: "Attendance unmarked",
        description: `Attendance cleared for ${staffMember.name} on ${formatShortDateLabel(selectedDate)}.`,
      });
      return;
    }

    if (plan.kind === "save-standalone-payment") {
      const paymentPayload = {
        staffId,
        businessId,
        date: selectedDate,
        amount: plan.amount,
        type: "advance",
        mode: "Cash",
        note: "Recorded from Mark daily",
        recordedBy: user?.uid || "",
        createdAt: serverTimestamp(),
      };
      const addedRef = await addDocumentNonBlocking(
        collection(firestore, "businesses", businessId, "staffPayments"),
        paymentPayload
      );
      clearDraftsForKey(draftKey, ["pay"]);
      if (addedRef?.id) {
        void mirrorStaffPaymentIfPublic({
          firestore,
          businessId,
          staff: staffMember,
          paymentId: addedRef.id,
          payload: {
            date: selectedDate,
            amount: plan.amount,
            type: "advance",
            mode: "Cash",
            note: "Recorded from Mark daily",
          },
        });
      }
      toast({
        title: "Advance logged",
        description: `${currencySymbol}${plan.amount.toLocaleString()} recorded for ${staffMember.name} without marking Present.`,
      });
      return;
    }

    // plan.kind === "save-attendance"
    setDocumentNonBlocking(
      docRef,
      {
        staffId,
        businessId,
        date: selectedDate,
        status: plan.status,
        overtimeHours: plan.overtimeHours,
        allowance: plan.allowance,
        manualPayment: plan.manualPayment,
        updatedAt: serverTimestamp(),
        ...(existingRecord ? {} : { createdAt: serverTimestamp() }),
      },
      { merge: true }
    );

    clearDraftsForKey(draftKey, ["ot", "allow", "pay"]);
    void mirrorAttendanceRecordIfPublic({
      firestore,
      businessId,
      staff: staffMember,
      recordId,
      payload: {
        date: selectedDate,
        status: plan.status,
        overtimeHours: plan.overtimeHours,
        allowance: plan.allowance,
        manualPayment: plan.manualPayment,
      },
    });

    toast({
      title: existingRecord ? "Attendance updated" : "Attendance saved",
      description: `${staffMember.name} marked ${plan.status} for ${formatShortDateLabel(selectedDate)}.`,
    });
  };

  const openSettleDialog = (staffRow: any) => {
    setSettleTarget(staffRow);
    setSettleAmount(
      staffRow.pendingBalance > 0 ? String(Math.round(staffRow.pendingBalance)) : ""
    );
    setSettleDate(format(new Date(), "yyyy-MM-dd"));
    setSettleType(staffRow.pendingBalance > 0 ? "settlement" : "advance");
    setSettleMode("Cash");
    setSettleNote(
      `${PAYROLL_MONTHS[Number.parseInt(selectedMonth, 10) - 1]} ${selectedYear} payroll`
    );
    setLogToCashbook(true);
  };

  const handleConfirmSettlement = async () => {
    if (!businessId || !settleTarget || !canManagePayroll) return;
    const cleanAmount = parseNonNegativeNumber(settleAmount);
    if (cleanAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Enter a payment amount greater than zero.",
      });
      return;
    }

    const paymentPayload = {
      staffId: settleTarget.id,
      businessId,
      date: settleDate,
      amount: cleanAmount,
      type: settleType,
      mode: settleMode,
      note: settleNote.trim() || `${settleType} payout`,
      recordedBy: user?.uid || "",
      createdAt: serverTimestamp(),
    };

    const addedRef = await addDocumentNonBlocking(
      collection(firestore, "businesses", businessId, "staffPayments"),
      paymentPayload
    );

    if (logToCashbook) {
      addDocumentNonBlocking(collection(firestore, "businesses", businessId, "cashbook"), {
        businessId,
        type: "expense",
        amount: cleanAmount,
        category: "Salary",
        particulars: `Staff ${settleType}: ${settleTarget.name}${settleNote ? ` (${settleNote})` : ""}`,
        mode: settleMode,
        entryBy: userProfile?.name || "Admin",
        date: settleDate,
        createdAt: serverTimestamp(),
      });
    }

    if (addedRef?.id) {
      void mirrorStaffPaymentIfPublic({
        firestore,
        businessId,
        staff: settleTarget,
        paymentId: addedRef.id,
        payload: {
          date: settleDate,
          amount: cleanAmount,
          type: settleType,
          mode: settleMode,
          note: settleNote.trim() || `${settleType} payout`,
        },
      });
    }

    toast({
      title: "Payment Recorded",
      description: `${currencySymbol}${cleanAmount.toLocaleString()} logged for ${settleTarget.name}.`,
    });
    setSettleTarget(null);
  };

  const currencySymbol = getCurrencySymbol(business?.currency);
  const paymentModes = useMemo(
    () => (Array.isArray(business?.paymentModes) && business.paymentModes.length > 0
      ? business.paymentModes
      : ["Cash", "UPI", "Bank", "Card"]),
    [business?.paymentModes]
  );

  if (isProfileLoading || isStaffLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 text-left">
      <PageHeader
        title="Team Management"
        description="Real-time team attendance, daily wage tracking, and monthly payroll settlement."
        icon={Users2}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="h-10 px-4 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs bg-white"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
            {canManagePayroll && (
              <Button
                asChild
                className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs"
              >
                <Link href="/team">
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add member
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {!canManagePayroll && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-900">
              <p className="font-semibold">Read-only team view</p>
              <p className="text-amber-800 mt-0.5">
                Only workspace admins or managers can mark attendance or record salary settlements.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="h-9 rounded-xl bg-white border-amber-300 text-amber-900 text-xs font-semibold shrink-0">
            <Link href="/my-staff-portal">Open My Staff Portal</Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiStatCard
          label="Active Team"
          value={`${stats.total} Specialists`}
          subtext={`${stats.activeToday} present on ${formatShortDateLabel(selectedDate)}${stats.pendingCount > 0 ? ` · ${stats.pendingCount} pending invite` : ""}`}
          icon={Users2}
        />
        <KpiStatCard
          label={`Payroll (${PAYROLL_MONTHS[Number.parseInt(selectedMonth, 10) - 1]})`}
          value={`${currencySymbol}${Math.round(stats.totalMonthlyDue).toLocaleString()}`}
          subtext={`Paid: ${currencySymbol}${Math.round(stats.totalPaidSalary).toLocaleString()} · Due: ${currencySymbol}${Math.round(stats.totalMonthlyDue - stats.totalPaidSalary).toLocaleString()}`}
          tone="dark"
          icon={Wallet}
        />
        <KpiStatCard
          label="Daily Wage Accrued"
          value={`${currencySymbol}${Math.round(stats.accruedWageToday).toLocaleString()}`}
          subtext={`Earned on ${formatShortDateLabel(selectedDate)} · Cash paid: ${currencySymbol}${Math.round(stats.cashPaidToday).toLocaleString()}`}
          tone="warning"
          icon={Receipt}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-5">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
          <TabsList className="bg-white border border-slate-200 h-11 p-1 rounded-xl w-full xl:w-auto overflow-x-auto scrollbar-hide flex">
            <TabsTrigger
              value="directory"
              className="flex-1 text-xs font-medium px-5 gap-2 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              <LayoutList className="h-3.5 w-3.5" /> Directory
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="flex-1 text-xs font-medium px-5 gap-2 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              <CalendarCheck className="h-3.5 w-3.5" /> Mark daily
            </TabsTrigger>
            <TabsTrigger
              value="payroll"
              className="flex-1 text-xs font-medium px-5 gap-2 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              <Wallet className="h-3.5 w-3.5" /> Settlement
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
            {/* View Mode Switcher: Card vs List */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shrink-0 shadow-2xs">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("card")}
                aria-label="Card view"
                className={cn(
                  "h-8 px-2.5 rounded-lg text-xs font-semibold gap-1.5 transition-colors cursor-pointer",
                  viewMode === "card"
                    ? "bg-slate-900 text-white hover:bg-slate-900 hover:text-white"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Cards</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("list")}
                aria-label="List view"
                className={cn(
                  "h-8 px-2.5 rounded-lg text-xs font-semibold gap-1.5 transition-colors cursor-pointer",
                  viewMode === "list"
                    ? "bg-slate-900 text-white hover:bg-slate-900 hover:text-white"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span>List</span>
              </Button>
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-white px-2.5 h-10 rounded-xl border border-slate-200 w-full sm:w-auto">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger
                    aria-label="Filter month"
                    className="h-8 w-28 border-none bg-transparent font-medium text-xs focus:ring-0"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {PAYROLL_MONTHS.map((m, i) => (
                      <SelectItem key={m} value={(i + 1).toString()}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator orientation="vertical" className="h-4 bg-slate-200" />
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger
                  aria-label="Filter year"
                  className="h-8 w-20 border-none bg-transparent font-mono text-xs font-medium focus:ring-0"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger
                aria-label="Filter by role"
                className="h-10 w-full sm:w-36 rounded-xl bg-white border-slate-200 text-xs font-medium text-slate-700"
              >
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all" className="text-xs font-medium">
                  All roles
                </SelectItem>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role.toLowerCase()} className="text-xs font-medium">
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative w-full sm:flex-1 xl:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search name or email..."
                className="h-10 pl-10 text-sm bg-white border-slate-200 rounded-xl w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <TabsContent value="directory" className="m-0 space-y-5">
          {filteredStaff.length === 0 ? (
            <SectionCard>
              <EmptyStatePanel
                icon={Users2}
                title="No team members match your filters"
                description="Try clearing your search or role filter, or invite a new member from Settings."
              />
            </SectionCard>
          ) : viewMode === "card" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((s: any) => {
                const isPending = isPendingStaffMember(s);
                return (
                  <Link
                    key={s.id}
                    href={`/staff/${s.id}`}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-slate-300 transition-colors group flex flex-col justify-between text-left"
                  >
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-center justify-between gap-3">
                        <div className="h-11 w-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-900 text-base">
                          {s.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          {isPending && (
                            <span className="text-amber-700 font-medium">Pending invite</span>
                          )}
                          {isPending && <span aria-hidden="true">·</span>}
                          <span className="font-medium capitalize text-slate-700">
                            {s.role || "Staff"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3.5">
                        <h3 className="text-base font-semibold text-slate-900 group-hover:underline truncate">
                          {s.name || "Unnamed member"}
                        </h3>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{s.email}</p>
                      </div>
                    </div>
                    <div className="p-5 space-y-2.5 text-xs">
                      <div className="flex items-center gap-2.5 text-slate-600 font-mono tabular-nums">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-medium">{s.phone || "No phone"}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-700 font-mono tabular-nums">
                        <Coins className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-semibold">
                          {currencySymbol}
                          {getEffectiveDailyRate(s)}/day · {getEffectiveShiftHours(s)}h shift
                        </span>
                      </div>
                    </div>
                    <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-700">
                      <span>View profile &amp; payslip</span>
                      <ChevronRight className="h-4 w-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <SectionCard bodyClassName="p-0 overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow className="border-b border-slate-200 bg-slate-50/70 hover:bg-slate-50/70">
                    <TableHead className="text-xs font-bold text-slate-800 h-11 pl-5">Specialist</TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 h-11">Role</TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 h-11">Contact</TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 h-11">Wage & Shift</TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 h-11">Status</TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 h-11 text-right pr-5">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((s: any) => {
                    const isPending = isPendingStaffMember(s);
                    return (
                      <TableRow key={s.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                        <TableCell className="pl-5 py-3.5">
                          <Link href={`/staff/${s.id}`} className="flex items-center gap-3 group">
                            <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-900 text-xs shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                              {s.name?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 group-hover:underline truncate">
                                {s.name || "Unnamed member"}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">{s.email}</p>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-medium capitalize text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                            {s.role || "Staff"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                            <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{s.phone || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-mono tabular-nums text-slate-700">
                            <span className="font-semibold">{currencySymbol}{getEffectiveDailyRate(s)}/day</span>
                            <span className="text-slate-400 ml-1">· {getEffectiveShiftHours(s)}h</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isPending ? (
                            <span className="inline-flex items-center text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              Pending invite
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-5">
                          <Button asChild size="sm" variant="outline" className="h-8 rounded-lg text-xs font-medium border-slate-200 hover:bg-slate-900 hover:text-white">
                            <Link href={`/staff/${s.id}`}>
                              Profile & Slip
                              <ChevronRight className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </SectionCard>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="m-0">
          <SectionCard bodyClassName="p-0">
            <div className="p-5 sm:px-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
                  <CalendarCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Daily attendance feed</h3>
                  <p className="text-slate-300 text-xs">
                    Records for {formatLongDateLabel(selectedDate)}
                  </p>
                </div>
              </div>
              <div className="bg-white/10 rounded-xl px-3 py-1.5 border border-white/15 self-start sm:self-auto">
                <input
                  type="date"
                  aria-label="Attendance date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) setSelectedDate(e.target.value);
                  }}
                  className="bg-transparent border-none text-white font-mono text-xs font-medium outline-none cursor-pointer"
                />
              </div>
            </div>

            {activePayrollStaff.length === 0 ? (
              <div className="p-8">
                <EmptyStatePanel
                  icon={CalendarCheck}
                  title="No active team members to mark"
                  description="Active team members appear here once they accept their workspace invite."
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activePayrollStaff.map((s: any) => {
                  const record = (attendanceData || []).find(
                    (a: any) => a.staffId === s.id && a.date === selectedDate
                  );
                  const dayStandalonePaid = (staffPayments || [])
                    .filter((p: any) => p.staffId === s.id && p.date === selectedDate)
                    .reduce((sum: number, p: any) => sum + parseNonNegativeNumber(p.amount), 0);

                  const draftKey = getDailyDraftKey(s.id, selectedDate);
                  const currentStatus = (record?.status as AttendanceStatus | undefined) || undefined;
                  const currentOt = resolveNumericDraft(
                    otDrafts[draftKey],
                    currentStatus === "absent" ? 0 : record?.overtimeHours
                  );
                  const currentAllowance = resolveNumericDraft(
                    allowanceDrafts[draftKey],
                    currentStatus === "absent" ? 0 : record?.allowance
                  );
                  const currentManualPayment = resolveNumericDraft(
                    payTodayDrafts[draftKey],
                    record?.manualPayment
                  );

                  const hasDraftChanges =
                    draftKey in otDrafts ||
                    draftKey in allowanceDrafts ||
                    draftKey in payTodayDrafts;

                  const dayTotal = calculateDayEarning({
                    dailyRate: getEffectiveDailyRate(s),
                    shiftHours: getEffectiveShiftHours(s),
                    status: currentStatus || "",
                    overtimeHours: currentOt,
                    allowance: currentAllowance,
                  });
                  const otPayment =
                    currentStatus === "absent"
                      ? 0
                      : calculateOvertimePay(
                          getEffectiveDailyRate(s),
                          getEffectiveShiftHours(s),
                          currentOt
                        );

                  return (
                    <div
                      key={s.id}
                      className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 w-full xl:w-auto min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-semibold text-slate-700 text-sm shrink-0">
                          {s.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/staff/${s.id}`}
                            className="text-sm font-semibold text-slate-900 hover:underline truncate block"
                          >
                            {s.name}
                          </Link>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500">
                            <span className="capitalize">{s.role || "Staff"}</span>
                            {currentStatus && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums font-medium text-emerald-700">
                                  Earning: {currencySymbol}
                                  {Math.round(dayTotal).toLocaleString()}
                                </span>
                              </>
                            )}
                            {dayStandalonePaid > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums font-medium text-slate-700">
                                  Advance paid: {currencySymbol}
                                  {dayStandalonePaid.toLocaleString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-3.5 w-full xl:w-auto">
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            type="button"
                            disabled={!canManagePayroll}
                            variant={currentStatus === "present" ? "default" : "outline"}
                            className={cn(
                              "h-10 sm:h-9 rounded-xl text-xs font-medium px-2.5 sm:px-3.5",
                              currentStatus === "present"
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-white border-slate-200 text-slate-700"
                            )}
                            onClick={() => handleAttendanceAction(s, "toggle-status", "present")}
                          >
                            Present
                          </Button>
                          <Button
                            type="button"
                            disabled={!canManagePayroll}
                            variant={currentStatus === "half-day" ? "default" : "outline"}
                            className={cn(
                              "h-10 sm:h-9 rounded-xl text-xs font-medium px-2.5 sm:px-3.5",
                              currentStatus === "half-day"
                                ? "bg-amber-600 hover:bg-amber-700 text-white"
                                : "bg-white border-slate-200 text-slate-700"
                            )}
                            onClick={() => handleAttendanceAction(s, "toggle-status", "half-day")}
                          >
                            Half day
                          </Button>
                          <Button
                            type="button"
                            disabled={!canManagePayroll}
                            variant={currentStatus === "absent" ? "default" : "outline"}
                            className={cn(
                              "h-10 sm:h-9 rounded-xl text-xs font-medium px-2.5 sm:px-3.5",
                              currentStatus === "absent"
                                ? "bg-rose-600 hover:bg-rose-700 text-white"
                                : "bg-white border-slate-200 text-slate-700"
                            )}
                            onClick={() => handleAttendanceAction(s, "toggle-status", "absent")}
                          >
                            Absent
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1">
                          <div className="space-y-1 min-w-0">
                            <Label
                              htmlFor={`ot-${s.id}`}
                              className="text-[11px] font-medium text-slate-500 block truncate"
                            >
                              OT hrs
                            </Label>
                            <Input
                              id={`ot-${s.id}`}
                              type="number"
                              min="0"
                              step="0.5"
                              disabled={!canManagePayroll || currentStatus === "absent"}
                              placeholder="0"
                              value={currentOt}
                              onChange={(e) =>
                                setOtDrafts({ ...otDrafts, [draftKey]: e.target.value })
                              }
                              className="h-10 sm:h-9 w-full xl:w-20 text-center font-mono tabular-nums text-xs font-semibold rounded-xl bg-white border-slate-200"
                            />
                          </div>
                          <div className="space-y-1 min-w-0">
                            <Label className="text-[11px] font-medium text-slate-500 block truncate">
                              OT pay ({currencySymbol})
                            </Label>
                            <div className="h-10 sm:h-9 w-full xl:w-24 px-2 flex items-center justify-center font-mono tabular-nums text-xs font-semibold text-slate-900 bg-slate-50 rounded-xl border border-slate-200 truncate">
                              {currencySymbol}
                              {Math.round(otPayment).toLocaleString()}
                            </div>
                          </div>
                          <div className="space-y-1 min-w-0">
                            <Label
                              htmlFor={`allow-${s.id}`}
                              className="text-[11px] font-medium text-slate-500 block truncate"
                            >
                              Allowance ({currencySymbol})
                            </Label>
                            <Input
                              id={`allow-${s.id}`}
                              type="number"
                              min="0"
                              disabled={!canManagePayroll || currentStatus === "absent"}
                              placeholder="0"
                              value={currentAllowance}
                              onChange={(e) =>
                                setAllowanceDrafts({
                                  ...allowanceDrafts,
                                  [draftKey]: e.target.value,
                                })
                              }
                              className="h-10 sm:h-9 w-full xl:w-24 text-center font-mono tabular-nums text-xs font-semibold rounded-xl bg-white border-slate-200"
                            />
                          </div>
                          <div className="space-y-1 min-w-0">
                            <Label
                              htmlFor={`pay-${s.id}`}
                              className="text-[11px] font-medium text-slate-500 block truncate"
                            >
                              Pay today ({currencySymbol})
                            </Label>
                            <div className="flex gap-1.5">
                              <Input
                                id={`pay-${s.id}`}
                                type="number"
                                min="0"
                                disabled={!canManagePayroll}
                                value={currentManualPayment}
                                onChange={(e) =>
                                  setPayTodayDrafts({
                                    ...payTodayDrafts,
                                    [draftKey]: e.target.value,
                                  })
                                }
                                placeholder="0"
                                className="h-10 sm:h-9 w-full xl:w-24 text-center font-mono tabular-nums text-xs font-semibold rounded-xl bg-emerald-50/70 text-emerald-800 border-emerald-200 px-2"
                              />
                              <Button
                                type="button"
                                size="icon"
                                disabled={!canManagePayroll}
                                variant={hasDraftChanges ? "default" : "outline"}
                                aria-label={`Save details for ${s.name}`}
                                title={
                                  currentStatus
                                    ? "Save OT, allowance & payment"
                                    : "Log Pay today advance"
                                }
                                className={cn(
                                  "h-10 w-10 sm:h-9 sm:w-9 rounded-xl shrink-0",
                                  hasDraftChanges
                                    ? "bg-slate-900 text-white hover:bg-slate-800"
                                    : "border-slate-200 text-slate-700 hover:bg-slate-900 hover:text-white"
                                )}
                                onClick={() => handleAttendanceAction(s, "save-details")}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="payroll" className="m-0">
          <SectionCard
            title={`Monthly payroll ledger (${PAYROLL_MONTHS[Number.parseInt(selectedMonth, 10) - 1]} ${selectedYear})`}
            bodyClassName="p-0"
          >
            {viewMode === "card" ? (
              <div className="p-4 sm:p-5">
                {payrollSummary.length === 0 ? (
                  <div className="py-12 px-5 text-center text-slate-500 text-sm">
                    No payroll records found for this month.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {payrollSummary.map((s: any) => (
                        <div
                          key={s.id}
                          className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors shadow-2xs text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <Link href={`/staff/${s.id}`} className="min-w-0 flex items-center gap-3 group">
                              <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-900 text-sm shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                {s.name?.charAt(0)?.toUpperCase() || "U"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 group-hover:underline truncate">
                                  {s.name}
                                </p>
                                <p className="text-xs text-slate-500 capitalize">
                                  {s.role} · {s.payableDays} days
                                  {s.otHours > 0 ? ` · ${s.otHours}h OT` : ""}
                                </p>
                              </div>
                            </Link>

                            <span
                              className={cn(
                                "text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0",
                                (s.pendingBalance || 0) > 0
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              )}
                            >
                              {(s.pendingBalance || 0) > 0 ? "Due" : "Settled"}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 border border-slate-100 p-2.5 text-xs font-mono tabular-nums">
                            <div>
                              <p className="font-sans text-[11px] text-slate-500">Earned</p>
                              <p className="font-semibold text-slate-900 mt-0.5">
                                {currencySymbol}
                                {Math.round(s.totalEarnedMonth).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="font-sans text-[11px] text-slate-500">Paid</p>
                              <p className="font-semibold text-emerald-700 mt-0.5">
                                {currencySymbol}
                                {Math.round(s.totalPaidMonth).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-sans text-[11px] text-slate-500">Balance</p>
                              <p
                                className={cn(
                                  "font-bold mt-0.5",
                                  (s.pendingBalance || 0) > 0 ? "text-rose-600" : "text-emerald-700"
                                )}
                              >
                                {currencySymbol}
                                {Math.round(s.pendingBalance || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-xs font-medium text-slate-600 hover:text-slate-900">
                              <Link href={`/staff/${s.id}`}>
                                View slip <ChevronRight className="ml-1 h-3 w-3" />
                              </Link>
                            </Button>
                            {canManagePayroll && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                aria-label={`Settle payment for ${s.name}`}
                                className="h-8 px-3 rounded-lg text-xs font-semibold border-slate-200 hover:bg-slate-900 hover:text-white shrink-0"
                                onClick={() => openSettleDialog(s)}
                              >
                                <HandCoins className="mr-1.5 h-3.5 w-3.5" />
                                Settle
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono tabular-nums">
                      <div className="flex items-center gap-2 font-sans font-semibold text-slate-700">
                        <Wallet className="h-4 w-4 text-slate-500" />
                        <span>Grand Total ({grandTotals.attendance} days attendance)</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-600 font-sans">
                          Paid: <strong className="font-mono text-emerald-700">{currencySymbol}{Math.round(grandTotals.paid).toLocaleString()}</strong>
                        </span>
                        <span className="font-bold text-rose-600 text-sm font-sans">
                          Due: <strong className="font-mono">{currencySymbol}{Math.round(grandTotals.balance).toLocaleString()}</strong>
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[920px]">
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 border-b border-slate-200 hover:bg-slate-50/80">
                      <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11 w-14">
                        #
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 h-11">
                        Member / role
                      </TableHead>
                      <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                        Attendance
                      </TableHead>
                      <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                        OT (hrs)
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-600 h-11">
                        OT pay
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-600 h-11">
                        Total earnings
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-600 h-11">
                        Amount paid
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-600 h-11">
                        Balance due
                      </TableHead>
                      <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollSummary.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-40 text-center text-slate-500 text-sm">
                          No payroll records found for this month.
                        </TableCell>
                      </TableRow>
                    ) : (
                      payrollSummary.map((s: any, idx: number) => (
                        <TableRow
                          key={s.id}
                          className="group hover:bg-slate-50/80 transition-colors cursor-pointer border-b border-slate-100"
                          onClick={() => router.push(`/staff/${s.id}`)}
                        >
                          <TableCell className="pl-6 py-3.5 text-xs font-mono tabular-nums text-slate-400">
                            #{idx + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-900 group-hover:underline">
                                {s.name}
                              </span>
                              <span className="text-xs text-slate-500 capitalize">{s.role}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-mono tabular-nums text-xs font-medium text-slate-700">
                            {s.payableDays} days
                          </TableCell>
                          <TableCell className="text-center font-mono tabular-nums text-xs text-slate-600">
                            {s.otHours}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-xs font-medium text-slate-700">
                            {currencySymbol}
                            {Math.round(s.otPay).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-sm font-semibold text-slate-900">
                            {currencySymbol}
                            {Math.round(s.totalEarnedMonth).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-sm font-semibold text-emerald-700">
                            {currencySymbol}
                            {Math.round(s.totalPaidMonth).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={cn(
                                "font-mono tabular-nums text-sm font-bold",
                                (s.pendingBalance || 0) > 0 ? "text-rose-600" : "text-emerald-700"
                              )}
                            >
                              {currencySymbol}
                              {Math.round(s.pendingBalance || 0).toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            {canManagePayroll ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                aria-label={`Settle payment for ${s.name}`}
                                className="h-8 rounded-lg text-xs font-semibold border-slate-200 hover:bg-slate-900 hover:text-white whitespace-nowrap"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSettleDialog(s);
                                }}
                              >
                                <HandCoins className="mr-1.5 h-3.5 w-3.5" />
                                Settle / Pay
                              </Button>
                            ) : (
                              <Link
                                href={`/staff/${s.id}`}
                                className="text-xs font-medium text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View slip
                              </Link>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  <TableFooter className="bg-slate-50 hover:bg-slate-50 border-t border-slate-200">
                    <TableRow>
                      <TableCell colSpan={2} className="pl-6 py-4 font-semibold text-slate-900 text-xs">
                        Grand total
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums font-semibold text-slate-900 text-xs">
                        {grandTotals.attendance} days
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums font-medium text-slate-600 text-xs">
                        {grandTotals.otHours} hrs
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-semibold text-slate-900 text-xs">
                        {currencySymbol}
                        {Math.round(grandTotals.otPay).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-semibold text-slate-900 text-sm">
                        {currencySymbol}
                        {Math.round(grandTotals.earnings).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-semibold text-emerald-700 text-sm">
                        {currencySymbol}
                        {Math.round(grandTotals.paid).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-bold text-rose-600 text-base">
                        {currencySymbol}
                        {Math.round(grandTotals.balance).toLocaleString()}
                      </TableCell>
                      <TableCell className="pr-6" />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Settlement / Payout Modal */}
      <Dialog open={Boolean(settleTarget)} onOpenChange={(open) => !open && setSettleTarget(null)}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl border-slate-200 p-0 overflow-hidden text-left">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <HandCoins className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Record Staff Payment
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  {settleTarget?.name} · Pending balance: {currencySymbol}
                  {Math.round(settleTarget?.pendingBalance || 0).toLocaleString()}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="settle-amount" className="text-xs font-semibold text-slate-700">
                  Amount ({currencySymbol})
                </Label>
                <Input
                  id="settle-amount"
                  type="number"
                  min="1"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  placeholder="0"
                  className="h-10 rounded-xl font-mono tabular-nums font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settle-date" className="text-xs font-semibold text-slate-700">
                  Payment Date
                </Label>
                <Input
                  id="settle-date"
                  type="date"
                  value={settleDate}
                  onChange={(e) => setSettleDate(e.target.value)}
                  className="h-10 rounded-xl font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Payout Type</Label>
                <Select
                  value={settleType}
                  onValueChange={(v) => setSettleType(v as "settlement" | "advance" | "bonus")}
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
                <Select value={settleMode} onValueChange={setSettleMode}>
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
              <Label htmlFor="settle-note" className="text-xs font-semibold text-slate-700">
                Note / Reference
              </Label>
              <Input
                id="settle-note"
                value={settleNote}
                onChange={(e) => setSettleNote(e.target.value)}
                placeholder="e.g. Monthly salary cleared via UPI"
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
              onClick={() => setSettleTarget(null)}
              className="flex-1 h-10 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSettlement}
              className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
            >
              Confirm Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
