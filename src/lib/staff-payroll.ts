import { format } from "date-fns";

export type AttendanceStatus = "present" | "half-day" | "absent";

export interface StaffMemberLike {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  dailyRate?: number | string;
  shiftHours?: number | string;
  shiftTimings?: string;
  sharePublic?: boolean;
}

export interface AttendanceRecordLike {
  id?: string;
  staffId: string;
  businessId?: string;
  date: string;
  status?: string;
  overtimeHours?: number | string;
  allowance?: number | string;
  manualPayment?: number | string;
}

export interface StaffPaymentLike {
  id?: string;
  staffId: string;
  businessId?: string;
  date: string;
  amount: number | string;
  type?: "advance" | "settlement" | "bonus" | string;
  mode?: string;
  note?: string;
}

export interface TaskLike {
  id?: string;
  assignedTo?: string;
  status?: string;
}

export interface DashboardWidgetConfig {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
}

export const PAYROLL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const DEFAULT_TEAM_ROLES = ["Admin", "Manager", "Staff", "Agent", "Accountant"] as const;

export function parseNonNegativeNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }
  return 0;
}

export function getEffectiveDailyRate(staff?: Partial<StaffMemberLike> | null): number {
  const rate = parseNonNegativeNumber(staff?.dailyRate);
  return rate > 0 ? rate : 500;
}

export function getEffectiveShiftHours(staff?: Partial<StaffMemberLike> | null): number {
  const hrs = parseNonNegativeNumber(staff?.shiftHours);
  return hrs > 0 ? hrs : 8;
}

export function getPayrollYearOptions(
  referenceDate: Date = new Date(),
  extraYears: Array<string | number> = []
): string[] {
  const currentYear = referenceDate.getFullYear();
  const minYear = Math.min(2023, currentYear - 2);
  const maxYear = Math.max(currentYear + 2, 2027);
  const set = new Set<number>();
  for (let y = minYear; y <= maxYear; y++) {
    set.add(y);
  }
  for (const raw of extraYears) {
    const num = Number.parseInt(String(raw), 10);
    if (Number.isFinite(num) && num >= 2000 && num <= 2100) {
      set.add(num);
    }
  }
  return Array.from(set)
    .sort((a, b) => a - b)
    .map(String);
}

export function getDynamicRoleOptions(
  businessRoles?: unknown[],
  staffList?: Array<{ role?: string }>
): string[] {
  const seen = new Map<string, string>();
  const addRole = (raw: unknown) => {
    if (typeof raw !== "string") return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, trimmed);
    }
  };

  for (const r of DEFAULT_TEAM_ROLES) addRole(r);
  if (Array.isArray(businessRoles)) {
    for (const r of businessRoles) addRole(r);
  }
  if (Array.isArray(staffList)) {
    for (const s of staffList) addRole(s?.role);
  }
  return Array.from(seen.values());
}

export function parseLocalDateParts(
  dateStr: string | null | undefined
): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return { year, month, day };
}

export function isDateInMonthYear(
  dateStr: string | null | undefined,
  monthOneBased: number,
  year: number
): boolean {
  const parts = parseLocalDateParts(dateStr);
  if (!parts) return false;
  return parts.month === monthOneBased && parts.year === year;
}

export function toLocalDateFromYmd(dateStr: string): Date | null {
  const parts = parseLocalDateParts(dateStr);
  if (!parts) return null;
  return new Date(parts.year, parts.month - 1, parts.day);
}

export function formatShortDateLabel(dateStr: string): string {
  const local = toLocalDateFromYmd(dateStr);
  if (!local) return dateStr || "-";
  return format(local, "dd MMM");
}

export function formatLongDateLabel(dateStr: string): string {
  const local = toLocalDateFromYmd(dateStr);
  if (!local) return dateStr || "-";
  return format(local, "dd MMMM yyyy");
}

export function getMonthQueryBounds(monthOneBased: number, year: number): {
  start: string;
  end: string;
} {
  const paddedMonth = String(monthOneBased).padStart(2, "0");
  const lastDay = new Date(year, monthOneBased, 0).getDate();
  return {
    start: `${year}-${paddedMonth}-01`,
    end: `${year}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function getCombinedDateQueryRange(
  selectedMonth: number,
  selectedYear: number,
  selectedDate: string
): { start: string; end: string } {
  const monthBounds = getMonthQueryBounds(selectedMonth, selectedYear);
  const parts = parseLocalDateParts(selectedDate);
  if (!parts) return monthBounds;
  const dateMonthBounds = getMonthQueryBounds(parts.month, parts.year);
  return {
    start: monthBounds.start < dateMonthBounds.start ? monthBounds.start : dateMonthBounds.start,
    end: monthBounds.end > dateMonthBounds.end ? monthBounds.end : dateMonthBounds.end,
  };
}

export function getDailyDraftKey(staffId: string, dateStr: string): string {
  return `${staffId}__${dateStr}`;
}

export function resolveNumericDraft(
  draftValue: string | undefined,
  savedValue: number | string | null | undefined
): string {
  if (draftValue !== undefined) {
    return draftValue;
  }
  const num = parseNonNegativeNumber(savedValue);
  return num > 0 ? String(num) : "";
}

export function calculateOvertimePay(
  dailyRate: number,
  shiftHours: number,
  overtimeHours: number | string
): number {
  const safeDaily = dailyRate > 0 ? dailyRate : 500;
  const safeShift = shiftHours > 0 ? shiftHours : 8;
  const ot = parseNonNegativeNumber(overtimeHours);
  return (safeDaily / safeShift) * ot;
}

export function calculateDayEarning(params: {
  dailyRate: number;
  shiftHours: number;
  status: string;
  overtimeHours: number | string;
  allowance: number | string;
}): number {
  const status = (params.status || "").toLowerCase();
  if (status !== "present" && status !== "half-day") {
    return 0;
  }
  const dailyRate = params.dailyRate > 0 ? params.dailyRate : 500;
  const shiftHours = params.shiftHours > 0 ? params.shiftHours : 8;
  const base = status === "present" ? dailyRate : dailyRate / 2;
  const otPay = calculateOvertimePay(dailyRate, shiftHours, params.overtimeHours);
  const allow = parseNonNegativeNumber(params.allowance);
  return base + otPay + allow;
}

export type AttendanceSavePlan =
  | { kind: "delete-attendance" }
  | {
      kind: "save-attendance";
      status: AttendanceStatus;
      overtimeHours: number;
      allowance: number;
      manualPayment: number;
      clearExtraDrafts: boolean;
    }
  | {
      kind: "save-standalone-payment";
      amount: number;
    }
  | { kind: "require-status" };

export function planAttendanceAction(params: {
  mode: "toggle-status" | "save-details";
  targetStatus?: AttendanceStatus;
  existingRecord?: AttendanceRecordLike | null;
  otInput: string;
  allowanceInput: string;
  payTodayInput: string;
}): AttendanceSavePlan {
  const existingStatus = params.existingRecord?.status as AttendanceStatus | undefined;
  const cleanOt = parseNonNegativeNumber(params.otInput);
  const cleanAllowance = parseNonNegativeNumber(params.allowanceInput);
  const cleanManualPayment = parseNonNegativeNumber(params.payTodayInput);

  if (params.mode === "toggle-status") {
    const nextStatus = params.targetStatus || "present";
    if (existingStatus === nextStatus) {
      return { kind: "delete-attendance" };
    }
    if (nextStatus === "absent") {
      return {
        kind: "save-attendance",
        status: "absent",
        overtimeHours: 0,
        allowance: 0,
        manualPayment: cleanManualPayment,
        clearExtraDrafts: true,
      };
    }
    return {
      kind: "save-attendance",
      status: nextStatus,
      overtimeHours: cleanOt,
      allowance: cleanAllowance,
      manualPayment: cleanManualPayment,
      clearExtraDrafts: false,
    };
  }

  // Explicit save (+) button: NEVER deletes an existing attendance record.
  if (existingStatus) {
    return {
      kind: "save-attendance",
      status: existingStatus,
      overtimeHours: existingStatus === "absent" ? 0 : cleanOt,
      allowance: existingStatus === "absent" ? 0 : cleanAllowance,
      manualPayment: cleanManualPayment,
      clearExtraDrafts: existingStatus === "absent",
    };
  }

  // Unmarked staff: if user entered Pay today without OT/allowance, record standalone payment without forcing Present.
  if (cleanManualPayment > 0 && cleanOt === 0 && cleanAllowance === 0) {
    return {
      kind: "save-standalone-payment",
      amount: cleanManualPayment,
    };
  }

  return { kind: "require-status" };
}

export interface StaffPayrollSummaryRow<TStaff extends StaffMemberLike = StaffMemberLike> {
  staff: TStaff;
  presentCount: number;
  halfDayCount: number;
  absentCount: number;
  payableDays: number;
  otHours: number;
  otPay: number;
  totalAllowances: number;
  baseEarnings: number;
  totalEarnedMonth: number;
  totalPaidMonth: number;
  pendingBalance: number;
  completedTasks: number;
  totalAssignedTasks: number;
  monthRecords: AttendanceRecordLike[];
  monthPayments: StaffPaymentLike[];
}

export function aggregateStaffPayrollRow<TStaff extends StaffMemberLike>(params: {
  staff: TStaff;
  attendanceData: AttendanceRecordLike[];
  staffPayments?: StaffPaymentLike[];
  tasksList?: TaskLike[];
  monthOneBased: number;
  year: number;
}): StaffPayrollSummaryRow<TStaff> {
  const { staff, attendanceData, staffPayments = [], tasksList = [], monthOneBased, year } = params;

  const monthRecords = (attendanceData || []).filter(
    (a) => a.staffId === staff.id && isDateInMonthYear(a.date, monthOneBased, year)
  );
  const monthPayments = (staffPayments || []).filter(
    (p) => p.staffId === staff.id && isDateInMonthYear(p.date, monthOneBased, year)
  );

  const dailyRate = getEffectiveDailyRate(staff);
  const shiftHours = getEffectiveShiftHours(staff);
  const hourlyRate = dailyRate / shiftHours;

  const presentCount = monthRecords.filter((r) => r.status === "present").length;
  const halfDayCount = monthRecords.filter((r) => r.status === "half-day").length;
  const absentCount = monthRecords.filter((r) => r.status === "absent").length;

  const otHours = monthRecords.reduce(
    (sum, r) => sum + parseNonNegativeNumber(r.overtimeHours),
    0
  );
  const otPay = otHours * hourlyRate;

  const totalAllowances = monthRecords.reduce(
    (sum, r) => sum + (r.status === "absent" ? 0 : parseNonNegativeNumber(r.allowance)),
    0
  );

  const baseEarnings = presentCount * dailyRate + halfDayCount * (dailyRate / 2);
  const totalEarnedMonth = baseEarnings + otPay + totalAllowances;

  const attendancePaid = monthRecords.reduce(
    (sum, r) => sum + parseNonNegativeNumber(r.manualPayment),
    0
  );
  const standalonePaid = monthPayments.reduce(
    (sum, p) => sum + parseNonNegativeNumber(p.amount),
    0
  );
  const totalPaidMonth = attendancePaid + standalonePaid;
  const pendingBalance = totalEarnedMonth - totalPaidMonth;

  const completedTasks = tasksList.filter(
    (t) => t.assignedTo === staff.id && t.status === "completed"
  ).length;
  const totalAssignedTasks = tasksList.filter((t) => t.assignedTo === staff.id).length;

  return {
    staff,
    presentCount,
    halfDayCount,
    absentCount,
    payableDays: presentCount + halfDayCount * 0.5,
    otHours,
    otPay,
    totalAllowances,
    baseEarnings,
    totalEarnedMonth,
    totalPaidMonth,
    pendingBalance,
    completedTasks,
    totalAssignedTasks,
    monthRecords,
    monthPayments,
  };
}

export function computeDailyTeamStats(params: {
  staffList: StaffMemberLike[];
  attendanceData: AttendanceRecordLike[];
  staffPayments?: StaffPaymentLike[];
  selectedDate: string;
}): {
  totalStaff: number;
  presentToday: number;
  halfDayToday: number;
  accruedWageToday: number;
  cashPaidToday: number;
} {
  const { staffList, attendanceData, staffPayments = [], selectedDate } = params;
  const staffIds = new Set(staffList.map((s) => s.id));
  const dayAttendance = attendanceData.filter(
    (a) => a.date === selectedDate && staffIds.has(a.staffId)
  );
  const dayPayments = staffPayments.filter(
    (p) => p.date === selectedDate && staffIds.has(p.staffId)
  );

  let accruedWageToday = 0;
  let cashPaidToday = 0;

  for (const s of staffList) {
    const rec = dayAttendance.find((a) => a.staffId === s.id);
    if (rec) {
      accruedWageToday += calculateDayEarning({
        dailyRate: getEffectiveDailyRate(s),
        shiftHours: getEffectiveShiftHours(s),
        status: rec.status || "",
        overtimeHours: rec.overtimeHours || 0,
        allowance: rec.allowance || 0,
      });
      cashPaidToday += parseNonNegativeNumber(rec.manualPayment);
    }
  }

  for (const p of dayPayments) {
    cashPaidToday += parseNonNegativeNumber(p.amount);
  }

  return {
    totalStaff: staffList.length,
    presentToday: dayAttendance.filter((a) => a.status === "present").length,
    halfDayToday: dayAttendance.filter((a) => a.status === "half-day").length,
    accruedWageToday,
    cashPaidToday,
  };
}

export function escapeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const trimmedStart = raw.replace(/^[\t\r\n ]+/, "");
  const formulaSafe = /^[=+\-@]/.test(trimmedStart) ? `'${raw}` : raw;
  const escaped = formulaSafe.replace(/"/g, '""');
  if (/[",\r\n]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
}

export function buildTeamSummaryCsv(
  rows: Array<{
    name?: string;
    role?: string;
    phone?: string;
    payableDays: number;
    otHours: number;
    otPay: number;
    totalEarnedMonth: number;
    totalPaidMonth: number;
    pendingBalance: number;
  }>
): string {
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
    "Balance",
  ];

  const grand = rows.reduce(
    (acc, r) => ({
      attendance: acc.attendance + (r.payableDays || 0),
      otHours: acc.otHours + (r.otHours || 0),
      otPay: acc.otPay + (r.otPay || 0),
      earnings: acc.earnings + (r.totalEarnedMonth || 0),
      paid: acc.paid + (r.totalPaidMonth || 0),
      balance: acc.balance + (r.pendingBalance || 0),
    }),
    { attendance: 0, otHours: 0, otPay: 0, earnings: 0, paid: 0, balance: 0 }
  );

  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((s, idx) =>
      [
        idx + 1,
        s.name || "Member",
        s.role || "Staff",
        s.phone || "",
        s.payableDays,
        s.otHours,
        s.otPay.toFixed(2),
        s.totalEarnedMonth.toFixed(2),
        s.totalPaidMonth.toFixed(2),
        s.pendingBalance.toFixed(2),
      ]
        .map(escapeCsvCell)
        .join(",")
    ),
    [
      "",
      "GRAND TOTAL",
      "",
      "",
      grand.attendance,
      grand.otHours,
      grand.otPay.toFixed(2),
      grand.earnings.toFixed(2),
      grand.paid.toFixed(2),
      grand.balance.toFixed(2),
    ]
      .map(escapeCsvCell)
      .join(","),
  ];

  return lines.join("\n");
}

export function buildStaffActivityCsv(params: {
  staff: StaffMemberLike;
  records: AttendanceRecordLike[];
  standalonePayments?: StaffPaymentLike[];
  currencyCode?: string;
}): string {
  const { staff, records, standalonePayments = [], currencyCode = "INR" } = params;
  const dailyRate = getEffectiveDailyRate(staff);
  const shiftHours = getEffectiveShiftHours(staff);
  const hourlyRate = dailyRate / shiftHours;

  const headers = [
    "Date",
    "Status",
    "OT Hours",
    `OT Payment (${currencyCode})`,
    `Allowances (${currencyCode})`,
    `Amount Paid (${currencyCode})`,
    `Total Earning (${currencyCode})`,
    `Balance (${currencyCode})`,
  ];

  let totalOtHours = 0;
  let totalOtPay = 0;
  let totalAllow = 0;
  let totalPaid = 0;
  let totalEarned = 0;

  const attendanceRows = records.map((r) => {
    const status = (r.status || "").toLowerCase();
    const base = status === "present" ? dailyRate : status === "half-day" ? dailyRate / 2 : 0;
    const otHrs = status === "absent" ? 0 : parseNonNegativeNumber(r.overtimeHours);
    const otPay = otHrs * hourlyRate;
    const allow = status === "absent" ? 0 : parseNonNegativeNumber(r.allowance);
    const paid = parseNonNegativeNumber(r.manualPayment);
    const dayEarnings = base + otPay + allow;
    const dayBalance = dayEarnings - paid;

    totalOtHours += otHrs;
    totalOtPay += otPay;
    totalAllow += allow;
    totalPaid += paid;
    totalEarned += dayEarnings;

    return [
      r.date,
      (r.status || "UNMARKED").toUpperCase(),
      otHrs,
      otPay.toFixed(2),
      allow.toFixed(2),
      paid.toFixed(2),
      dayEarnings.toFixed(2),
      dayBalance.toFixed(2),
    ]
      .map(escapeCsvCell)
      .join(",");
  });

  const paymentRows = standalonePayments.map((p) => {
    const paid = parseNonNegativeNumber(p.amount);
    totalPaid += paid;
    return [
      p.date,
      `PAYOUT (${p.type || "advance"})`.toUpperCase(),
      0,
      "0.00",
      "0.00",
      paid.toFixed(2),
      "0.00",
      (-paid).toFixed(2),
    ]
      .map(escapeCsvCell)
      .join(",");
  });

  const totalRow = [
    "GRAND TOTAL",
    "",
    totalOtHours,
    totalOtPay.toFixed(2),
    totalAllow.toFixed(2),
    totalPaid.toFixed(2),
    totalEarned.toFixed(2),
    (totalEarned - totalPaid).toFixed(2),
  ]
    .map(escapeCsvCell)
    .join(",");

  return [headers.map(escapeCsvCell).join(","), ...attendanceRows, ...paymentRows, totalRow].join(
    "\n"
  );
}

export function isPulseWidgetEnabled(layout: unknown): boolean {
  if (!Array.isArray(layout)) return true;
  const entry = layout.find((w: any) => w?.id === "pulse");
  return entry ? Boolean(entry.enabled) : true;
}

export function toggleDashboardPulseLayout(
  layout: unknown,
  nextEnabled?: boolean
): DashboardWidgetConfig[] {
  const existing: DashboardWidgetConfig[] = Array.isArray(layout)
    ? layout.map((w: any, index: number) => ({
        id: String(w?.id || `widget_${index}`),
        label: String(w?.label || w?.id || "Widget"),
        enabled: Boolean(w?.enabled),
        order: typeof w?.order === "number" ? w.order : index,
      }))
    : [];

  const hasPulse = existing.some((w) => w.id === "pulse");
  if (hasPulse) {
    return existing.map((w) =>
      w.id === "pulse"
        ? { ...w, enabled: nextEnabled !== undefined ? nextEnabled : !w.enabled }
        : w
    );
  }

  return [
    ...existing,
    {
      id: "pulse",
      label: "Daily Pulse",
      enabled: nextEnabled !== undefined ? nextEnabled : false,
      order: existing.length,
    },
  ];
}

export function isStaffAdminRole(role?: string | null, email?: string | null): boolean {
  const normalizedRole = (role || "").trim().toLowerCase();
  if (["admin", "manager", "owner", "superadmin"].includes(normalizedRole)) {
    return true;
  }
  const normalizedEmail = (email || "").trim().toLowerCase();
  return normalizedEmail === "skillmatrix24@gmail.com" || normalizedEmail === "gw7infra@gmail.com";
}

export function isPendingStaffMember(staff?: StaffMemberLike | null): boolean {
  return (staff?.status || "").trim().toLowerCase() === "pending";
}
