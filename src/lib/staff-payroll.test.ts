import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateStaffPayrollRow,
  buildSampleTeamMembersCsvTemplate,
  buildStaffActivityCsv,
  buildTeamDirectoryCsv,
  buildTeamInviteLinks,
  buildTeamSummaryCsv,
  calculateDayEarning,
  computeDailyTeamStats,
  escapeCsvCell,
  findMatchingExistingMemberByEmail,
  formatLongDateLabel,
  formatShortDateLabel,
  getCombinedDateQueryRange,
  getDailyDraftKey,
  getDynamicRoleOptions,
  getMemberInviteState,
  getPayrollYearOptions,
  isDateInMonthYear,
  isPulseWidgetEnabled,
  isStaffAdminRole,
  parseTeamMembersCsvImport,
  planAttendanceAction,
  resolveNumericDraft,
  toggleDashboardPulseLayout,
  DEFAULT_RBAC_MATRIX,
  normalizeRoleKey,
  isRbacRoleLocked,
  resolveEffectivePermission,
  updateRbacPermission,
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

test("team directory invite & re-invite helpers classify members and build share links", () => {
  const uninvited = getMemberInviteState({ id: "u1", name: "Ramesh" }, "admin1");
  assert.equal(uninvited.canInvite, true);
  assert.equal(uninvited.actionLabel, "Invite");
  assert.equal(uninvited.statusLabel, "No login invited");

  const pending = getMemberInviteState(
    { id: "u2", name: "Suresh", email: "suresh@company.com", status: "pending" },
    "admin1"
  );
  assert.equal(pending.canInvite, true);
  assert.equal(pending.actionLabel, "Re-invite");
  assert.equal(pending.statusLabel, "Pending invite");

  const active = getMemberInviteState(
    { id: "u3", name: "Priya", email: "priya@company.com", status: "active" },
    "admin1"
  );
  assert.equal(active.canInvite, true);
  assert.equal(active.actionLabel, "Re-invite");
  assert.equal(active.statusLabel, "Active");

  const self = getMemberInviteState(
    { id: "admin1", name: "Owner", email: "owner@company.com", status: "active" },
    "admin1"
  );
  assert.equal(self.isSelf, true);
  assert.equal(self.canInvite, false);

  const matched = findMatchingExistingMemberByEmail(
    [
      { id: "u2", name: "Suresh", email: "Suresh@Company.com" },
      { id: "u3", name: "Priya", email: "priya@company.com" },
    ],
    "  suresh@company.com "
  );
  assert.equal(matched?.id, "u2");

  const links = buildTeamInviteLinks({
    origin: "https://app.example.com/",
    email: "Suresh@Company.com",
    name: "Suresh Kumar",
    role: "Manager",
    businessName: "Apex Solar",
    businessId: "biz_apex_99",
    phone: "09876543210",
  });
  assert.match(links.inviteUrl, /^https:\/\/app\.example\.com\/signup\?/);
  assert.match(links.inviteUrl, /invite=1/);
  assert.match(links.inviteUrl, /email=suresh%40company\.com/);
  assert.match(links.inviteUrl, /bid=biz_apex_99/);
  assert.match(links.inviteUrl, /role=Manager/);
  assert.match(links.loginUrl, /bid=biz_apex_99/);
  assert.match(links.whatsappUrl, /^https:\/\/wa\.me\/919876543210\?text=/);
  assert.match(links.mailtoUrl, /^mailto:suresh%40company\.com\?subject=/);

  const phoneOnlyLinks = buildTeamInviteLinks({
    origin: "https://app.example.com",
    name: "Kiran",
    role: "Technician",
    businessName: "Apex Solar",
    phone: "9811223344",
  });
  assert.match(phoneOnlyLinks.whatsappUrl, /^https:\/\/wa\.me\/919811223344\?text=/);
  assert.doesNotMatch(phoneOnlyLinks.inviteUrl, /email=/);

  const genericWaLinks = buildTeamInviteLinks({
    origin: "https://app.example.com",
    email: "no-phone@company.com",
    name: "Meera",
  });
  assert.match(genericWaLinks.whatsappUrl, /^https:\/\/wa\.me\/\?text=/);
});

test("team directory CSV export and import handle formula neutralization, aliases, and deduplication", () => {
  const csv = buildTeamDirectoryCsv([
    {
      id: "u1",
      name: "=HYPERLINK(\"bad\")",
      email: "admin@company.com",
      phone: "9876543210",
      role: "Admin",
      status: "active",
      dailyRate: 1200,
      shiftHours: 9,
      shiftTimings: "09:00 AM - 06:00 PM",
      address: "Pune, MH",
    },
  ]);

  const lines = csv.split("\n");
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^Name,Email,Phone,Role,Status,Daily Rate/);
  assert.match(lines[1], /^"'=HYPERLINK/);
  assert.match(lines[1], /"Pune, MH"/);

  const sample = buildSampleTeamMembersCsvTemplate();
  const sampleParsed = parseTeamMembersCsvImport(sample, []);
  assert.equal(sampleParsed.valid.length, 2);
  assert.equal(sampleParsed.skipped.length, 0);
  assert.equal(sampleParsed.valid[0].name, "Aarav Sharma");
  assert.equal(sampleParsed.valid[0].dailyRate, 900);

  const batchCsv = [
    "Full Name,Login Email,WhatsApp,Designation,Rate,Hours,Address",
    'Rohan Patel,rohan@company.com,9820011223,Supervisor,850,9,"Surat, GJ"',
    "Duplicate Existing,admin@company.com,9999988888,Staff,500,8,Mumbai",
    "Duplicate Phone,fresh@company.com,+91 9820011223,Staff,500,8,Mumbai",
    "Invalid Email,not-an-email,9111122222,Staff,500,8,Delhi",
    ",missingname@company.com,9333344444,Staff,500,8,Delhi",
    "Phone Only Member,,9444455555,Field Agent,650,8,Indore",
  ].join("\n");

  const parsed = parseTeamMembersCsvImport(batchCsv, [
    { id: "u1", name: "Existing Admin", email: "admin@company.com", phone: "9876543210" },
  ]);

  assert.equal(parsed.valid.length, 2);
  assert.equal(parsed.valid[0].name, "Rohan Patel");
  assert.equal(parsed.valid[0].address, "Surat, GJ");
  assert.equal(parsed.valid[1].name, "Phone Only Member");
  assert.equal(parsed.valid[1].email, "");
  assert.equal(parsed.skipped.length, 4);
});

test("RBAC matrix resolution: default fallbacks, admin lockout protection, and manual permission editing", () => {
  assert.equal(DEFAULT_RBAC_MATRIX.length, 11);
  assert.equal(normalizeRoleKey("Field Agent"), "field_agent");
  assert.equal(normalizeRoleKey("Manager "), "manager");

  // Admin lockout protection
  assert.equal(isRbacRoleLocked("OS Settings & Role Configuration", "admin"), true);
  assert.equal(isRbacRoleLocked("Dashboard & Executive KPIs", "admin"), true);
  assert.equal(isRbacRoleLocked("Billing (POS) & Invoice Checkout", "admin"), false);
  assert.equal(isRbacRoleLocked("OS Settings & Role Configuration", "manager"), false);

  // Default permissions
  assert.equal(
    resolveEffectivePermission(null, "Billing (POS) & Invoice Checkout", "staff"),
    true
  );
  assert.equal(
    resolveEffectivePermission(null, "Billing (POS) & Invoice Checkout", "agent"),
    false
  );
  assert.equal(
    resolveEffectivePermission(null, "Staff Payroll & Wage Payouts", "supervisor"),
    false
  );

  // Locked admin cannot be revoked via custom matrix
  const maliciousMatrix = {
    "OS Settings & Role Configuration": { admin: false },
  };
  assert.equal(
    resolveEffectivePermission(maliciousMatrix, "OS Settings & Role Configuration", "admin"),
    true
  );

  // Manual edit / override: Grant agent billing access
  const updated1 = updateRbacPermission(
    null,
    "Billing (POS) & Invoice Checkout",
    "agent",
    true
  );
  assert.equal(
    resolveEffectivePermission(updated1, "Billing (POS) & Invoice Checkout", "agent"),
    true
  );

  // Manual edit / override: Revoke staff billing access
  const updated2 = updateRbacPermission(
    updated1,
    "Billing (POS) & Invoice Checkout",
    "staff",
    false
  );
  assert.equal(
    resolveEffectivePermission(updated2, "Billing (POS) & Invoice Checkout", "staff"),
    false
  );

  // Custom role permissions (e.g. Cashier)
  assert.equal(
    resolveEffectivePermission(null, "Billing (POS) & Invoice Checkout", "cashier"),
    false
  );
  const updated3 = updateRbacPermission(
    updated2,
    "Billing (POS) & Invoice Checkout",
    "cashier",
    true
  );
  assert.equal(
    resolveEffectivePermission(updated3, "Billing (POS) & Invoice Checkout", "cashier"),
    true
  );
});

