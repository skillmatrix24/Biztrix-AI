"use client";

import { useState, useMemo } from "react";
import {
  Wallet,
  Trophy,
  Zap,
  Loader2,
  History,
  Building2,
  Handshake,
  CheckCircle2,
  Clock,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { KpiStatCard, SectionCard, EmptyStatePanel } from "@/components/ui/editorial";
import { cn, getCurrencySymbol } from "@/lib/utils";
import {
  useFirestore,
  useUser,
  useDoc,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from "@/firebase";
import { doc, collection, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import {
  PAYROLL_MONTHS,
  aggregateStaffPayrollRow,
  calculateDayEarning,
  formatLongDateLabel,
  getEffectiveDailyRate,
  getEffectiveShiftHours,
  getPayrollYearOptions,
  parseNonNegativeNumber,
} from "@/lib/staff-payroll";

export default function MyStaffPortalPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const attendanceQuery = useMemoFirebase(() => {
    if (!businessId || !user?.uid) return null;
    return query(
      collection(firestore, "businesses", businessId, "attendance"),
      where("staffId", "==", user.uid)
    );
  }, [firestore, businessId, user?.uid]);
  const { data: myAttendanceData, isLoading: isAttendanceLoading } =
    useCollection<any>(attendanceQuery);
  const myAttendance = useMemo(() => myAttendanceData || [], [myAttendanceData]);

  const paymentsQuery = useMemoFirebase(() => {
    if (!businessId || !user?.uid) return null;
    return query(
      collection(firestore, "businesses", businessId, "staffPayments"),
      where("staffId", "==", user.uid)
    );
  }, [firestore, businessId, user?.uid]);
  const { data: myPaymentsData } = useCollection<any>(paymentsQuery);
  const myPayments = useMemo(() => myPaymentsData || [], [myPaymentsData]);

  const requestsQuery = useMemoFirebase(() => {
    if (!businessId || !user?.uid) return null;
    return query(
      collection(firestore, "businesses", businessId, "paymentRequests"),
      where("requesterId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
  }, [firestore, businessId, user?.uid]);
  const { data: myRequestsData } = useCollection<any>(requestsQuery);
  const myRequests = useMemo(() => myRequestsData || [], [myRequestsData]);

  const tasksQuery = useMemoFirebase(() => {
    if (!businessId || !user?.uid) return null;
    return query(
      collection(firestore, "businesses", businessId, "tasks"),
      orderBy("createdAt", "desc")
    );
  }, [firestore, businessId, user?.uid]);
  const { data: myTasksData } = useCollection<any>(tasksQuery);
  const myTasks = useMemo(() => {
    if (!myTasksData || !user?.uid) return [];
    return myTasksData.filter((t: any) => {
      if (t.assignedTo === user.uid) return true;
      if (Array.isArray(t.assignedTo) && t.assignedTo.includes(user.uid)) return true;
      if (Array.isArray(t.assignedIds) && t.assignedIds.includes(user.uid)) return true;
      return false;
    });
  }, [myTasksData, user?.uid]);

  const bizRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(bizRef);

  const currencySymbol = getCurrencySymbol(business?.currency);
  const yearOptions = useMemo(() => getPayrollYearOptions(new Date()), []);

  const [isRequestOpen, setIsAddOpen] = useState(false);
  const [requestAmount, setAmount] = useState("");
  const [requestPurpose, setPurpose] = useState("");

  const handleRequestFund = () => {
    const cleanAmount = parseNonNegativeNumber(requestAmount);
    if (!businessId || !user?.uid || cleanAmount <= 0 || !requestPurpose.trim()) return;

    addDocumentNonBlocking(collection(firestore, "businesses", businessId, "paymentRequests"), {
      businessId,
      requesterId: user.uid,
      requesterName: profile?.name || "User",
      recipientType: "staff",
      recipientId: user.uid,
      recipientName: profile?.name || "User",
      amount: cleanAmount,
      purpose: requestPurpose.trim(),
      status: "pending",
      createdAt: serverTimestamp(),
    });

    if (business?.ownerId) {
      addDocumentNonBlocking(collection(firestore, "businesses", businessId, "notifications"), {
        businessId,
        recipientId: business.ownerId,
        title: "Staff Advance Request",
        message: `${profile?.name || "Staff"} requested ${currencySymbol}${cleanAmount.toLocaleString("en-IN")}: ${requestPurpose.trim()}`,
        type: "payment",
        isRead: false,
        createdAt: serverTimestamp(),
      });
    }

    setIsAddOpen(false);
    setAmount("");
    setPurpose("");
    toast({ title: "Fund Requested", description: "Admin will review your request." });
  };

  const handleToggleTaskStatus = (task: any) => {
    if (!businessId || !task?.id) return;
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    updateDocumentNonBlocking(doc(firestore, "businesses", businessId, "tasks", task.id), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
    toast({
      title: nextStatus === "completed" ? "Task Completed" : "Task Reopened",
      description: task.title || "Task status updated.",
    });
  };

  const payrollRow = useMemo(() => {
    if (!profile || !user?.uid) return null;
    return aggregateStaffPayrollRow({
      staff: { ...profile, id: profile.id || user.uid },
      attendanceData: myAttendance,
      staffPayments: myPayments,
      tasksList: myTasks,
      monthOneBased: selectedMonth,
      year: selectedYear,
    });
  }, [profile, user?.uid, myAttendance, myPayments, myTasks, selectedMonth, selectedYear]);

  const monthLogEntries = useMemo(() => {
    if (!payrollRow || !profile) return [];
    const dailyRate = getEffectiveDailyRate(profile);
    const shiftHours = getEffectiveShiftHours(profile);

    const attItems = payrollRow.monthRecords.map((r) => {
      const earned = calculateDayEarning({
        dailyRate,
        shiftHours,
        status: r.status || "",
        overtimeHours: r.overtimeHours || 0,
        allowance: r.allowance || 0,
      });
      const paid = parseNonNegativeNumber(r.manualPayment);
      return {
        key: `att_${r.id || r.date}`,
        date: r.date,
        kind: "attendance" as const,
        label: r.status || "present",
        otHours: r.status === "absent" ? 0 : parseNonNegativeNumber(r.overtimeHours),
        allowance: r.status === "absent" ? 0 : parseNonNegativeNumber(r.allowance),
        earned,
        paid,
        note: "",
      };
    });

    const payItems = payrollRow.monthPayments.map((p) => ({
      key: `pay_${p.id || `${p.date}_${p.amount}`}`,
      date: p.date,
      kind: "payment" as const,
      label: p.type || "advance",
      otHours: 0,
      allowance: 0,
      earned: 0,
      paid: parseNonNegativeNumber(p.amount),
      note: p.note || p.mode || "",
    }));

    return [...attItems, ...payItems].sort((a, b) => b.date.localeCompare(a.date));
  }, [payrollRow, profile]);

  const efficiency = useMemo(() => {
    if (!payrollRow || payrollRow.totalAssignedTasks === 0) return 0;
    return Math.round((payrollRow.completedTasks / payrollRow.totalAssignedTasks) * 100);
  }, [payrollRow]);

  if (isProfileLoading || isAttendanceLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-xs font-medium text-slate-500">Loading your portal...</p>
      </div>
    );
  }

  const balance = payrollRow?.pendingBalance || 0;
  const balanceTone = balance > 0 ? "danger" : balance < 0 ? "default" : "positive";
  const selectedMonthLabel = PAYROLL_MONTHS[selectedMonth - 1] || "Month";

  return (
    <div className="space-y-6 pb-20 text-left">
      <div className="rounded-2xl bg-slate-900 p-6 sm:p-8 text-white">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="h-20 w-20 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white font-bold text-3xl shrink-0">
            {(profile?.name || "S").charAt(0)}
          </div>
          <div className="space-y-1.5 text-center md:text-left flex-1 min-w-0">
            <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-medium text-slate-300">
              <span>{profile?.role || "Specialist"}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                ID: {(profile?.id || user?.uid || "").slice(-6).toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
              {profile?.name || "Team Member"}
            </h1>
            <p className="text-sm text-slate-300 flex items-center justify-center md:justify-start gap-2">
              <Building2 className="h-4 w-4" /> {business?.name || "Member Hub"}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
            <Select
              value={String(selectedMonth)}
              onValueChange={(v) => setSelectedMonth(Number.parseInt(v, 10))}
            >
              <SelectTrigger
                aria-label="Select month"
                className="h-11 w-[132px] rounded-xl border-white/15 bg-white/10 text-xs font-semibold text-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {PAYROLL_MONTHS.map((m, idx) => (
                  <SelectItem key={m} value={String(idx + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(Number.parseInt(v, 10))}
            >
              <SelectTrigger
                aria-label="Select year"
                className="h-11 w-[96px] rounded-xl border-white/15 bg-white/10 text-xs font-mono tabular-nums font-semibold text-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {yearOptions.map((yr) => (
                  <SelectItem key={yr} value={yr}>
                    {yr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={isRequestOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white h-11 px-5 rounded-xl font-semibold text-sm whitespace-nowrap shrink-0">
                  <Handshake className="mr-2 h-4 w-4" /> Request Fund
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[440px] rounded-2xl border border-slate-200 p-0 overflow-hidden bg-white">
                <DialogHeader className="p-6 bg-slate-900 text-white text-left">
                  <DialogTitle className="text-lg font-bold text-white">
                    Request Fund / Advance
                  </DialogTitle>
                  <DialogDescription className="text-slate-300 text-xs">
                    This request will be sent to your Admin for approval.
                  </DialogDescription>
                </DialogHeader>
                <div className="p-6 space-y-5 text-left">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Requested Amount ({currencySymbol})
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={requestAmount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-11 rounded-xl font-mono tabular-nums font-bold text-base bg-slate-50 border-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Purpose / Reason</Label>
                    <Textarea
                      placeholder="e.g. Travel Advance / Emergency"
                      value={requestPurpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="min-h-[96px] rounded-xl bg-slate-50 border-slate-200 p-3.5 text-sm"
                    />
                  </div>
                </div>
                <DialogFooter className="p-6 bg-slate-50 border-t border-slate-200">
                  <Button
                    onClick={handleRequestFund}
                    className="w-full h-11 bg-primary font-semibold text-sm rounded-xl text-white"
                  >
                    Send Request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiStatCard
          label={`${selectedMonthLabel} Earnings`}
          value={`${currencySymbol}${(payrollRow?.totalEarnedMonth || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          subtext={`${payrollRow?.payableDays || 0} payable days · Paid ${currencySymbol}${(payrollRow?.totalPaidMonth || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          icon={Wallet}
        />
        <KpiStatCard
          label={balance > 0 ? "Pending Due" : balance < 0 ? "Advance Balance" : "Account Clear"}
          value={`${currencySymbol}${Math.abs(balance).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          subtext={balance > 0 ? "Receivable from company" : balance < 0 ? "Advance carried" : "All settled"}
          icon={History}
          tone={balanceTone}
        />
        <KpiStatCard
          label="Total Overtime"
          value={`${payrollRow?.otHours || 0} Hours`}
          subtext={`OT Pay ${currencySymbol}${(payrollRow?.otPay || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          icon={Zap}
        />
        <KpiStatCard
          label="Work Efficiency"
          value={`${efficiency}%`}
          subtext={`${payrollRow?.completedTasks || 0} of ${payrollRow?.totalAssignedTasks || 0} tasks done`}
          icon={Trophy}
          tone="positive"
        />
      </div>

      <Tabs defaultValue="overview" className="w-full space-y-6">
        <TabsList className="bg-white border border-slate-200 h-12 p-1 rounded-xl flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="overview" className="flex-1 text-xs font-semibold px-6 whitespace-nowrap">
            My Profile
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex-1 text-xs font-semibold px-6 whitespace-nowrap">
            Month Log ({monthLogEntries.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex-1 text-xs font-semibold px-6 whitespace-nowrap">
            Fund Requests ({myRequests.length})
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex-1 text-xs font-semibold px-6 whitespace-nowrap">
            Assigned Tasks ({myTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="m-0">
          <SectionCard
            title="Shift & Compensation Summary"
            description={`Active terms and ${selectedMonthLabel} ${selectedYear} statement breakdown`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Daily Wage Rate</p>
                <p className="text-base font-bold font-mono tabular-nums text-slate-900">
                  {currencySymbol}
                  {getEffectiveDailyRate(profile).toLocaleString("en-IN")} / day
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Standard Shift</p>
                <p className="text-base font-semibold text-slate-900">
                  {getEffectiveShiftHours(profile)} hrs · {profile?.shiftTimings || "09:00 AM - 06:00 PM"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Attendance Breakdown</p>
                <p className="text-base font-mono tabular-nums font-semibold text-slate-900">
                  {payrollRow?.presentCount || 0} Present · {payrollRow?.halfDayCount || 0} Half ·{" "}
                  {payrollRow?.absentCount || 0} Absent
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Allowances & OT Earned</p>
                <p className="text-base font-mono tabular-nums font-semibold text-slate-900">
                  {currencySymbol}
                  {((payrollRow?.totalAllowances || 0) + (payrollRow?.otPay || 0)).toLocaleString(
                    "en-IN",
                    { maximumFractionDigits: 0 }
                  )}
                </p>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="attendance" className="m-0">
          <SectionCard
            title={`${selectedMonthLabel} ${selectedYear} Attendance & Payout Log`}
            description="Includes daily attendance entries and approved advances/settlements"
            bodyClassName="p-0"
          >
            {monthLogEntries.length === 0 ? (
              <div className="p-8">
                <EmptyStatePanel
                  icon={Calendar}
                  title={`No records in ${selectedMonthLabel} ${selectedYear}`}
                  description="Daily attendance and payouts recorded by your administrator appear here automatically."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70">
                      <TableHead className="pl-6">Date</TableHead>
                      <TableHead>Entry</TableHead>
                      <TableHead className="text-right">OT (Hrs)</TableHead>
                      <TableHead className="text-right">Allowance</TableHead>
                      <TableHead className="text-right">Day Earned</TableHead>
                      <TableHead className="text-right pr-6">Cash / Advance Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthLogEntries.map((item) => (
                      <TableRow key={item.key}>
                        <TableCell className="pl-6 py-3.5 text-xs font-mono tabular-nums text-slate-700">
                          {formatLongDateLabel(item.date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-xs">
                            <span
                              className={cn(
                                "font-semibold capitalize",
                                item.kind === "payment"
                                  ? "text-sky-700"
                                  : item.label === "present"
                                    ? "text-emerald-700"
                                    : item.label === "half-day"
                                      ? "text-amber-700"
                                      : "text-rose-700"
                              )}
                            >
                              {item.kind === "payment" ? `Payout · ${item.label}` : item.label}
                            </span>
                            {item.note && (
                              <>
                                <span aria-hidden="true" className="text-slate-300">
                                  ·
                                </span>
                                <span className="text-slate-500 truncate max-w-[200px]">
                                  {item.note}
                                </span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-xs text-slate-600">
                          {item.otHours > 0 ? item.otHours : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-xs text-slate-600">
                          {item.allowance > 0
                            ? `${currencySymbol}${item.allowance.toLocaleString("en-IN")}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-sm font-semibold text-slate-900">
                          {item.earned > 0
                            ? `${currencySymbol}${item.earned.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right pr-6 font-mono tabular-nums text-sm font-semibold text-emerald-700">
                          {item.paid > 0
                            ? `${currencySymbol}${item.paid.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="requests" className="m-0 space-y-6">
          <SectionCard
            title="My Request History"
            description="Advance requests submitted to your workspace administrator"
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70">
                    <TableHead className="pl-6">Date</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right pr-6">Amount ({currencySymbol})</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-sm text-slate-500">
                        No advance requests submitted yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    myRequests.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="pl-6 py-4 text-xs font-mono tabular-nums text-slate-600">
                          {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString("en-IN") : "Recently"}
                        </TableCell>
                        <TableCell className="text-sm text-slate-800">{r.purpose}</TableCell>
                        <TableCell className="text-center">
                          <span
                            className={cn(
                              "text-xs font-semibold capitalize",
                              r.status === "approved"
                                ? "text-emerald-700"
                                : r.status === "rejected"
                                  ? "text-rose-700"
                                  : "text-amber-700"
                            )}
                          >
                            {r.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-6 font-mono tabular-nums font-bold text-sm text-slate-900">
                          {currencySymbol}
                          {parseNonNegativeNumber(r.amount).toLocaleString("en-IN")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="tasks" className="m-0">
          <SectionCard
            title="Assigned Tasks"
            description="Tasks assigned to you across workspace operations"
            bodyClassName="p-0"
          >
            {myTasks.length === 0 ? (
              <div className="p-8">
                <EmptyStatePanel
                  icon={CheckCircle2}
                  title="No tasks assigned yet"
                  description="When your manager assigns tasks to you, they will appear here."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70">
                      <TableHead className="pl-6">Task</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myTasks.map((t: any) => {
                      const isDone = t.status === "completed";
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="pl-6 py-3.5">
                            <p
                              className={cn(
                                "text-sm font-semibold",
                                isDone ? "line-through text-slate-400" : "text-slate-900"
                              )}
                            >
                              {t.title || "Untitled Task"}
                            </p>
                            {t.description && (
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                {t.description}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-xs capitalize text-slate-600">
                            {t.priority || "normal"}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-xs font-semibold capitalize",
                                isDone ? "text-emerald-700" : "text-amber-700"
                              )}
                            >
                              {isDone ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <Clock className="h-3.5 w-3.5" />
                              )}
                              {t.status || "pending"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              type="button"
                              size="sm"
                              variant={isDone ? "outline" : "default"}
                              onClick={() => handleToggleTaskStatus(t)}
                              className="h-8 rounded-lg text-xs font-semibold whitespace-nowrap"
                            >
                              {isDone ? "Reopen" : "Mark Done"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
