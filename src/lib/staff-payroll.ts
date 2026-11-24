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

export const DEFAULT_TEAM_ROLES = ["Staff", "Manager", "Supervisor", "Technician", "Sales Executive", "Agent", "Accountant", "Admin"] as const;

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

export interface MemberInviteState {
  isSelf: boolean;
  hasEmail: boolean;
  isPending: boolean;
  canInvite: boolean;
  actionLabel: "Invite" | "Re-invite";
  statusLabel: "Active" | "Pending invite" | "No login invited";
}

export function getMemberInviteState(
  member: StaffMemberLike & { status?: string },
  currentUserId?: string | null
): MemberInviteState {
  const isSelf = Boolean(currentUserId && member?.id === currentUserId);
  const cleanEmail = (member?.email || "").trim();
  const hasEmail = Boolean(cleanEmail && cleanEmail.includes("@"));
  const isPending = isPendingStaffMember(member);

  if (!hasEmail) {
    return {
      isSelf,
      hasEmail: false,
      isPending,
      canInvite: !isSelf,
      actionLabel: "Invite",
      statusLabel: "No login invited",
    };
  }

  if (isPending) {
    return {
      isSelf,
      hasEmail: true,
      isPending: true,
      canInvite: !isSelf,
      actionLabel: "Re-invite",
      statusLabel: "Pending invite",
    };
  }

  return {
    isSelf,
    hasEmail: true,
    isPending: false,
    canInvite: !isSelf,
    actionLabel: "Re-invite",
    statusLabel: "Active",
  };
}

export function findMatchingExistingMemberByEmail<T extends StaffMemberLike>(
  members: T[],
  email: string
): T | undefined {
  const target = (email || "").trim().toLowerCase();
  if (!target || !target.includes("@")) return undefined;
  return (members || []).find((m) => (m?.email || "").trim().toLowerCase() === target);
}

export function normalizeWhatsAppDigits(rawPhone?: string | null): string {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

export function buildTeamInviteLinks(params: {
  origin: string;
  email?: string;
  name?: string;
  role?: string;
  businessName?: string;
  businessId?: string;
  phone?: string;
}): {
  inviteUrl: string;
  loginUrl: string;
  inviteMessage: string;
  whatsappUrl: string;
  mailtoUrl: string;
} {
  const cleanOrigin = (params.origin || "").replace(/\/+$/, "");
  const cleanEmail = (params.email || "").trim().toLowerCase();
  const cleanName = (params.name || "Team Member").trim();
  const cleanRole = (params.role || "Staff").trim();
  const cleanBusiness = (params.businessName || "Workspace").trim();
  const cleanBusinessId = (params.businessId || "").trim();

  const queryParams = new URLSearchParams({
    invite: "1",
    name: cleanName,
    business: cleanBusiness,
    role: cleanRole,
  });
  if (cleanBusinessId) {
    queryParams.set("bid", cleanBusinessId);
  }
  if (cleanEmail) {
    queryParams.set("email", cleanEmail);
  }

  const inviteUrl = `${cleanOrigin}/signup?${queryParams.toString()}`;
  const loginParams = new URLSearchParams({
    invite: "1",
    name: cleanName,
    business: cleanBusiness,
    role: cleanRole,
  });
  if (cleanBusinessId) loginParams.set("bid", cleanBusinessId);
  if (cleanEmail) loginParams.set("email", cleanEmail);
  const loginUrl = `${cleanOrigin}/login?${loginParams.toString()}`;

  const inviteMessage = [
    `Hi ${cleanName},`,
    `You have been invited to join ${cleanBusiness} as ${cleanRole}.`,
    cleanEmail
      ? `Accept your workspace invite using email (${cleanEmail}):`
      : `Accept your workspace invite using the link below:`,
    inviteUrl,
    `Already have an account? Sign in here: ${loginUrl}`,
  ].join("\n");

  const phoneDigits = normalizeWhatsAppDigits(params.phone);
  const whatsappBase = phoneDigits ? `https://wa.me/${phoneDigits}` : "https://wa.me/";
  const whatsappUrl = `${whatsappBase}?text=${encodeURIComponent(inviteMessage)}`;

  const subject = `Invitation to join ${cleanBusiness}`;
  const mailtoUrl = `mailto:${encodeURIComponent(cleanEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(inviteMessage)}`;

  return {
    inviteUrl,
    loginUrl,
    inviteMessage,
    whatsappUrl,
    mailtoUrl,
  };
}

export interface TeamMemberCsvDraft {
  name: string;
  email: string;
  phone: string;
  role: string;
  dailyRate: number;
  shiftHours: number;
  shiftTimings: string;
  address: string;
}

export interface TeamMemberCsvSkippedRow {
  rowNumber: number;
  name?: string;
  reason: string;
}

export interface TeamMemberCsvParseResult {
  valid: TeamMemberCsvDraft[];
  skipped: TeamMemberCsvSkippedRow[];
}

export function buildTeamDirectoryCsv(
  members: Array<
    StaffMemberLike & {
      status?: string;
      phone?: string;
      shiftHours?: number;
      shiftTimings?: string;
      address?: string;
    }
  >
): string {
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Role",
    "Status",
    "Daily Rate",
    "Shift Hours",
    "Shift Timings",
    "Address",
  ];

  const rows = (members || []).map((m) =>
    [
      m.name || "",
      m.email || "",
      m.phone || "",
      m.role || "Staff",
      m.status || (m.email ? "active" : "pending"),
      parseNonNegativeNumber(m.dailyRate ?? 500),
      parseNonNegativeNumber(m.shiftHours ?? 8),
      m.shiftTimings || "09:00 AM - 06:00 PM",
      m.address || "",
    ]
      .map(escapeCsvCell)
      .join(",")
  );

  return [headers.map(escapeCsvCell).join(","), ...rows].join("\n");
}

export function buildSampleTeamMembersCsvTemplate(): string {
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Role",
    "Daily Rate",
    "Shift Hours",
    "Shift Timings",
    "Address",
  ];
  const sampleRows = [
    [
      "Aarav Sharma",
      "aarav@company.com",
      "9876543210",
      "Manager",
      "900",
      "9",
      "09:00 AM - 06:00 PM",
      "Pune, MH",
    ],
    [
      "Priya Verma",
      "priya@company.com",
      "9822011223",
      "Staff",
      "600",
      "8",
      "10:00 AM - 06:00 PM",
      "Nashik, MH",
    ],
  ];

  return [
    headers.map(escapeCsvCell).join(","),
    ...sampleRows.map((row) => row.map(escapeCsvCell).join(",")),
  ].join("\n");
}

function parseCsvLines(rawText: string): string[][] {
  const text = (rawText || "").replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field.trim());
      field = "";
    } else if (ch === "\r") {
      if (text[i + 1] === "\n") i += 1;
      row.push(field.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else if (ch === "\n") {
      row.push(field.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  row.push(field.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

function normalizePhoneLast10(phone?: string | null): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function parseTeamMembersCsvImport(
  csvText: string,
  existingMembers: Array<StaffMemberLike & { phone?: string }> = []
): TeamMemberCsvParseResult {
  const parsedRows = parseCsvLines(csvText);
  if (parsedRows.length < 2) {
    return { valid: [], skipped: [] };
  }

  const headerRow = parsedRows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const findCol = (aliases: string[]) =>
    headerRow.findIndex((h) => aliases.some((a) => h === a || h.includes(a)));

  const nameIdx = findCol(["fullname", "membername", "staffname", "name"]);
  const emailIdx = findCol(["emailaddress", "loginemail", "email"]);
  const phoneIdx = findCol(["whatsapp", "mobile", "phone", "contact"]);
  const roleIdx = findCol(["role", "designation", "position"]);
  const rateIdx = findCol(["dailyrate", "rate", "wage", "salary"]);
  const hoursIdx = findCol(["shifthours", "hours"]);
  const timingsIdx = findCol(["shifttimings", "timings", "shift"]);
  const addressIdx = findCol(["address", "city", "location"]);

  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();

  for (const existing of existingMembers || []) {
    const em = (existing?.email || "").trim().toLowerCase();
    if (em) seenEmails.add(em);
    const ph = normalizePhoneLast10(existing?.phone);
    if (ph.length >= 10) seenPhones.add(ph);
  }

  const valid: TeamMemberCsvDraft[] = [];
  const skipped: TeamMemberCsvSkippedRow[] = [];

  for (let i = 1; i < parsedRows.length; i += 1) {
    const cells = parsedRows[i];
    const rowNumber = i + 1;
    const getCell = (idx: number) => (idx >= 0 && idx < cells.length ? cells[idx].trim() : "");

    const name = getCell(nameIdx >= 0 ? nameIdx : 0);
    const rawEmail = getCell(emailIdx).toLowerCase();
    const phone = getCell(phoneIdx);
    const role = getCell(roleIdx) || "Staff";
    const dailyRateRaw = getCell(rateIdx);
    const shiftHoursRaw = getCell(hoursIdx);
    const shiftTimings = getCell(timingsIdx) || "09:00 AM - 06:00 PM";
    const address = getCell(addressIdx);

    if (!name) {
      skipped.push({ rowNumber, reason: "Missing member name" });
      continue;
    }

    if (rawEmail && (!rawEmail.includes("@") || !rawEmail.includes("."))) {
      skipped.push({ rowNumber, name, reason: `Invalid email "${rawEmail}"` });
      continue;
    }

    if (!rawEmail && !phone) {
      skipped.push({ rowNumber, name, reason: "Provide at least an Email or Phone number" });
      continue;
    }

    if (rawEmail && seenEmails.has(rawEmail)) {
      skipped.push({ rowNumber, name, reason: `Duplicate email (${rawEmail})` });
      continue;
    }

    const phoneKey = normalizePhoneLast10(phone);
    if (phoneKey.length >= 10 && seenPhones.has(phoneKey)) {
      skipped.push({ rowNumber, name, reason: `Duplicate mobile number (${phone})` });
      continue;
    }

    if (rawEmail) seenEmails.add(rawEmail);
    if (phoneKey.length >= 10) seenPhones.add(phoneKey);

    const parsedRate = parseNonNegativeNumber(dailyRateRaw);
    const parsedHours = Number.parseInt(shiftHoursRaw, 10);

    valid.push({
      name,
      email: rawEmail,
      phone,
      role,
      dailyRate: parsedRate > 0 ? parsedRate : 500,
      shiftHours: Number.isFinite(parsedHours) && parsedHours > 0 && parsedHours <= 24 ? parsedHours : 8,
      shiftTimings,
      address,
    });
  }

  return { valid, skipped };
}

export interface RolePermissionRule {
  module: string;
  category: string;
  description: string;
  admin: boolean;
  manager: boolean;
  supervisor: boolean;
  staff: boolean;
  agent: boolean;
  [customRole: string]: boolean | string;
}

export const DEFAULT_RBAC_MATRIX: RolePermissionRule[] = [
  {
    module: "Dashboard & Executive KPIs",
    category: "Core",
    description: "View daily sales, profit metrics, low stock notices, and business telemetry",
    admin: true,
    manager: true,
    supervisor: true,
    staff: true,
    agent: true,
  },
  {
    module: "Billing (POS) & Invoice Checkout",
    category: "Sales",
    description: "Create counter sales bills, barcode scanner lookup, and receive bill cash/UPI",
    admin: true,
    manager: true,
    supervisor: true,
    staff: true,
    agent: false,
  },
  {
    module: "Invoices, Receipts & E-Way Bills",
    category: "Sales",
    description: "Generate B2B tax invoices, government e-Way bills, and credit return notes",
    admin: true,
    manager: true,
    supervisor: true,
    staff: false,
    agent: false,
  },
  {
    module: "Quotations & Estimates",
    category: "Sales",
    description: "Draft customer price quotations, print PDFs, and convert offers to POS invoices",
    admin: true,
    manager: true,
    supervisor: true,
    staff: true,
    agent: true,
  },
  {
    module: "Sales CRM & Lead Pipeline",
    category: "CRM",
    description: "Capture inbound inquiries, schedule follow-up reminders, and assign leads",
    admin: true,
    manager: true,
    supervisor: true,
    staff: true,
    agent: true,
  },
  {
    module: "Customer & Vendor Directories",
    category: "Master Data",
    description: "Manage client party profiles, GSTINs, supplier purchase ledgers and balances",
    admin: true,
    manager: true,
    supervisor: true,
    staff: true,
    agent: false,
  },
  {
    module: "Inventory & Stock Adjustments",
    category: "Operations",
    description: "Add new products, modify selling/cost prices, adjust warehouse counts and barcodes",
    admin: true,
    manager: true,
    supervisor: true,
    staff: false,
    agent: false,
  },
  {
    module: "Staff Attendance & Daily Entries",
    category: "Back Office",
    description: "Mark attendance check-in/out and record daily business income and expenses",
    admin: true,
    manager: true,
    supervisor: true,
    staff: true,
    agent: false,
  },
  {
    module: "Staff Payroll & Wage Payouts",
    category: "Back Office",
    description: "Compute monthly employee salaries, issue cash advances, and generate salary slips",
    admin: true,
    manager: true,
    supervisor: false,
    staff: false,
    agent: false,
  },
  {
    module: "Accounting, Ledgers & Cashbook",
    category: "Finance",
    description: "Inspect P&L cashbook, GSTR filing reconciliation, audit logs, and bank accounts",
    admin: true,
    manager: false,
    supervisor: false,
    staff: false,
    agent: false,
  },
  {
    module: "OS Settings & Role Configuration",
    category: "System",
    description: "Configure business branding, payment gateways, thermal printers, and RBAC matrix",
    admin: true,
    manager: false,
    supervisor: false,
    staff: false,
    agent: false,
  },
];

export type RbacMatrixStore = Record<string, Record<string, boolean>>;

/**
 * Normalizes a role name to a safe object key, e.g. "Manager" -> "manager", "Field Agent" -> "field_agent"
 */
export function normalizeRoleKey(roleName: string): string {
  return String(roleName || "").trim().toLowerCase().replace(/\s+/g, "_");
}

/**
 * Checks whether an admin cell is strictly locked to prevent owner self-lockout
 */
export function isRbacRoleLocked(moduleName: string, roleKey: string): boolean {
  const normalizedKey = normalizeRoleKey(roleKey);
  if (normalizedKey !== "admin") return false;
  const lowerMod = moduleName.toLowerCase();
  return lowerMod.includes("os settings") || lowerMod.includes("dashboard");
}

/**
 * Resolves the effective permission for a given module and role
 */
export function resolveEffectivePermission(
  customMatrix: RbacMatrixStore | null | undefined,
  moduleName: string,
  roleKey: string
): boolean {
  const normKey = normalizeRoleKey(roleKey);

  // Locked admin roles always remain granted to prevent tenant lockout
  if (isRbacRoleLocked(moduleName, normKey)) {
    return true;
  }

  // Check saved custom matrix first
  if (customMatrix && customMatrix[moduleName] && typeof customMatrix[moduleName][normKey] === "boolean") {
    return customMatrix[moduleName][normKey];
  }

  // Fallback to default matrix
  const defaultRule = DEFAULT_RBAC_MATRIX.find((r) => r.module === moduleName);
  if (defaultRule) {
    if (typeof (defaultRule as any)[normKey] === "boolean") {
      return (defaultRule as any)[normKey];
    }
    if (normKey === "admin") return defaultRule.admin;
    if (normKey === "manager") return defaultRule.manager;
    if (normKey === "supervisor") return defaultRule.supervisor;
    if (normKey === "staff") return defaultRule.staff;
    if (normKey === "agent") return defaultRule.agent;
  }

  // Default fallback for custom roles: false unless admin
  return normKey === "admin";
}

/**
 * Immutably updates the RBAC matrix with a new permission value
 */
export function updateRbacPermission(
  currentMatrix: RbacMatrixStore | null | undefined,
  moduleName: string,
  roleKey: string,
  nextValue: boolean
): RbacMatrixStore {
  const normKey = normalizeRoleKey(roleKey);
  const nextMatrix: RbacMatrixStore = { ...(currentMatrix || {}) };
  nextMatrix[moduleName] = {
    ...(nextMatrix[moduleName] || {}),
    [normKey]: nextValue,
  };
  return nextMatrix;
}

