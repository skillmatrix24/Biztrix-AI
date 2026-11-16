import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateStaffPayrollRow,
  buildStaffActivityCsv,
  buildTeamSummaryCsv,
  calculateDayEarning,
  computeDailyTeamStats,
  escapeCsvCell,
  formatLongDateLabel,
  formatShortDateLabel,
  getCombinedDateQueryRange,
  getDailyDraftKey,
  getDynamicRoleOptions,
  getPayrollYearOptions,
  isDateInMonthYear,
  isPulseWidgetEnabled,
  isStaffAdminRole,
  planAttendanceAction,
  resolveNumericDraft,
  toggleDashboardPulseLayout,
} from "./staff-payroll";

test("planAttendanceAction: clicking + Save on an already Present member updates instead of deleting", () => {
  const plan = planAttendanceAction({
    mode: "save-details",
    existingRecord: {
      staffId: "s1",
      date: "2026-11-16",
      status: "present",
      overtimeHours: 1,
      allowance: 50,
      manualPayment: 0,
    },
    otInput: "2.5",
    allowanceInput: "150",
    payTodayInput: "300",
  });

  assert.equal(plan.kind, "save-attendance");
  if (plan.kind === "save-attendance") {
    assert.equal(plan.status, "present");
    assert.equal(plan.overtimeHours, 2.5);
    assert.equal(plan.allowance, 150);
    assert.equal(plan.manualPayment, 300);
    assert.equal(plan.clearExtraDrafts, false);
  }
});

test("planAttendanceAction: clicking same status button toggles attendance off", () => {
  const plan = planAttendanceAction({
    mode: "toggle-status",
    targetStatus: "present",
    existingRecord: {
      staffId: "s1",
      date: "2026-11-16",
      status: "present",
    },
    otInput: "2",
    allowanceInput: "100",
    payTodayInput: "0",
  });

  assert.equal(plan.kind, "delete-attendance");
});

test("planAttendanceAction: clicking Absent forces OT & allowance to 0 and flags draft clear", () => {
  const plan = planAttendanceAction({
    mode: "toggle-status",
    targetStatus: "absent",
    existingRecord: {
      staffId: "s1",
      date: "2026-11-16",
      status: "present",
    },
    otInput: "3",
    allowanceInput: "200",
    payTodayInput: "100",
  });

  assert.equal(plan.kind, "save-attendance");
  if (plan.kind === "save-attendance") {
    assert.equal(plan.status, "absent");
    assert.equal(plan.overtimeHours, 0);
    assert.equal(plan.allowance, 0);
    assert.equal(plan.manualPayment, 100);
    assert.equal(plan.clearExtraDrafts, true);
  }
});

test("planAttendanceAction: Pay today on unmarked staff records standalone payment without forcing Present", () => {
  const plan = planAttendanceAction({
    mode: "save-details",
    existingRecord: null,
    otInput: "",
    allowanceInput: "",
    payTodayInput: "500",
  });

  assert.equal(plan.kind, "save-standalone-payment");
  if (plan.kind === "save-standalone-payment") {
    assert.equal(plan.amount, 500);
  }
});

test("planAttendanceAction: OT/Allowance on unmarked staff prompts to select Present or Half day first", () => {
  const plan = planAttendanceAction({
    mode: "save-details",
    existingRecord: null,
    otInput: "2",
    allowanceInput: "",
    payTodayInput: "",
  });

  assert.equal(plan.kind, "require-status");
});

test("resolveNumericDraft allows clearing input to empty string without snapping back to DB value", () => {
  assert.equal(resolveNumericDraft("", 250), "");
  assert.equal(resolveNumericDraft(undefined, 250), "250");
  assert.equal(resolveNumericDraft(undefined, 0), "");
  assert.equal(resolveNumericDraft("400", 250), "400");
});

test("getDailyDraftKey isolates draft values per staff and date", () => {
  assert.notEqual(
    getDailyDraftKey("staff-1", "2026-11-15"),
    getDailyDraftKey("staff-1", "2026-11-16")
  );
});

test("calculateDayEarning returns 0 for absent or unmarked status", () => {
  assert.equal(
    calculateDayEarning({
      dailyRate: 800,
      shiftHours: 8,
      status: "absent",
      overtimeHours: 4,
      allowance: 100,
    }),
    0
  );
  assert.equal(
    calculateDayEarning({
      dailyRate: 800,
      shiftHours: 8,
      status: "",
      overtimeHours: 2,
      allowance: 50,
    }),
    0
  );
  assert.equal(
    calculateDayEarning({
      dailyRate: 800,
      shiftHours: 8,
      status: "half-day",
      overtimeHours: 2,
      allowance: 50,
    }),
    650
  );
});

test("timezone-safe date helpers parse YYYY-MM-DD accurately on month boundaries", () => {
  assert.equal(isDateInMonthYear("2026-11-01", 11, 2026), true);
  assert.equal(isDateInMonthYear("2026-11-01", 10, 2026), false);
  assert.equal(formatShortDateLabel("2026-11-01"), "01 Nov");
  assert.equal(formatLongDateLabel("2026-11-01"), "01 November 2026");

  const bounds = getCombinedDateQueryRange(11, 2026, "2026-10-15");
  assert.equal(bounds.start, "2026-10-01");
  assert.equal(bounds.end, "2026-11-30");
});

test("computeDailyTeamStats separates accrued wages from cash paid (no double-counting)", () => {
  const stats = computeDailyTeamStats({
    staffList: [
      { id: "s1", dailyRate: 600, shiftHours: 8 },
      { id: "s2", dailyRate: 500, shiftHours: 8 },
    ],
    attendanceData: [
      {
        staffId: "s1",
        date: "2026-11-16",
        status: "present",
        overtimeHours: 0,
        allowance: 0,
        manualPayment: 600,
      },
    ],
    staffPayments: [
      { staffId: "s2", date: "2026-11-16", amount: 300, type: "advance" },
    ],
    selectedDate: "2026-11-16",
  });

  assert.equal(stats.accruedWageToday, 600);
  assert.equal(stats.cashPaidToday, 900);
  assert.equal(stats.presentToday, 1);
});

test("aggregateStaffPayrollRow combines attendance payments and standalone staffPayments", () => {
  const row = aggregateStaffPayrollRow({
    staff: { id: "s1", name: "Aarav", dailyRate: 800, shiftHours: 8 },
    attendanceData: [
      {
        staffId: "s1",
        date: "2026-11-01",
        status: "present",
        overtimeHours: 2,
        allowance: 100,
        manualPayment: 200,
      },
      {
        staffId: "s1",
        date: "2026-11-02",
        status: "half-day",
        overtimeHours: 0,
        allowance: 0,
        manualPayment: 0,
      },
    ],
    staffPayments: [
      { staffId: "s1", date: "2026-11-15", amount: 500, type: "settlement" },
    ],
    monthOneBased: 11,
    year: 2026,
  });

  // 800 + 200 OT + 100 allowance + 400 half-day = 1500 earned
  assert.equal(row.payableDays, 1.5);
  assert.equal(row.totalEarnedMonth, 1500);
  // 200 attendance manualPayment + 500 settlement = 700 paid
  assert.equal(row.totalPaidMonth, 700);
  assert.equal(row.pendingBalance, 800);
});

test("CSV helpers escape quotes and neutralize spreadsheet formulas", () => {
  assert.equal(escapeCsvCell('Aarav "Pro", Staff'), '"Aarav ""Pro"", Staff"');
  assert.equal(escapeCsvCell("=CMD()"), "'=CMD()");
  const csv = buildTeamSummaryCsv([
    {
      name: 'Rohan "RJ"',
      role: "Supervisor",
      phone: "9876543210",
      payableDays: 20,
      otHours: 4,
      otPay: 250,
      totalEarnedMonth: 10250,
      totalPaidMonth: 5000,
      pendingBalance: 5250,
    },
  ]);
  assert.match(csv, /"Rohan ""RJ"""/);
  assert.match(csv, /GRAND TOTAL/);

  const activityCsv = buildStaffActivityCsv({
    staff: { id: "s1", name: "Rohan", dailyRate: 500, shiftHours: 8 },
    records: [{ staffId: "s1", date: "2026-11-01", status: "present", manualPayment: 100 }],
    standalonePayments: [{ staffId: "s1", date: "2026-11-05", amount: 400, type: "settlement" }],
    currencyCode: "USD",
  });
  assert.match(activityCsv, /Amount Paid \(USD\)/);
  assert.match(activityCsv, /PAYOUT \(SETTLEMENT\)/);
  assert.match(activityCsv, /GRAND TOTAL,,0,0\.00,0\.00,500\.00,500\.00,0\.00/);
});

test("dynamic years, roles, pulse widget layout, and admin role detection work beyond 2026", () => {
  const years = getPayrollYearOptions(new Date(2028, 0, 15));
  assert.equal(years.includes("2028"), true);
  assert.equal(years.includes("2030"), true);

  const roles = getDynamicRoleOptions(["Supervisor", "Admin"], [{ role: "Technician" }]);
  assert.equal(roles.includes("Supervisor"), true);
  assert.equal(roles.includes("Technician"), true);
  assert.equal(roles.filter((r) => r.toLowerCase() === "admin").length, 1);

  const toggledFromEmpty = toggleDashboardPulseLayout(undefined);
  assert.equal(toggledFromEmpty.length, 1);
  assert.equal(toggledFromEmpty[0].id, "pulse");
  assert.equal(isPulseWidgetEnabled(toggledFromEmpty), false);

  const toggledBack = toggleDashboardPulseLayout(toggledFromEmpty);
  assert.equal(isPulseWidgetEnabled(toggledBack), true);

  assert.equal(isStaffAdminRole("Admin"), true);
  assert.equal(isStaffAdminRole("manager"), true);
  assert.equal(isStaffAdminRole("Staff"), false);
  assert.equal(isStaffAdminRole("Staff", "skillmatrix24@gmail.com"), true);
});
