"use client";

import {
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  getEffectiveDailyRate,
  getEffectiveShiftHours,
  parseNonNegativeNumber,
  StaffMemberLike,
} from "@/lib/staff-payroll";

export async function syncPublicStaffProfileAndRecords(params: {
  firestore: Firestore;
  businessId: string;
  staff: StaffMemberLike;
  sharePublic: boolean;
}) {
  const { firestore, businessId, staff, sharePublic } = params;
  if (!businessId || !staff?.id) return;

  const publicProfileRef = doc(firestore, "businesses", businessId, "publicStaff", staff.id);

  await setDoc(
    publicProfileRef,
    {
      id: staff.id,
      businessId,
      name: staff.name || "Specialist",
      role: staff.role || "Staff",
      dailyRate: getEffectiveDailyRate(staff),
      shiftHours: getEffectiveShiftHours(staff),
      shiftTimings: staff.shiftTimings || "09:00 AM - 06:00 PM",
      sharePublic: Boolean(sharePublic),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  if (!sharePublic) return;

  const [attendanceSnap, paymentsSnap] = await Promise.all([
    getDocs(
      query(
        collection(firestore, "businesses", businessId, "attendance"),
        where("staffId", "==", staff.id)
      )
    ),
    getDocs(
      query(
        collection(firestore, "businesses", businessId, "staffPayments"),
        where("staffId", "==", staff.id)
      )
    ),
  ]);

  const batch = writeBatch(firestore);
  attendanceSnap.docs.forEach((d) => {
    const data = d.data();
    batch.set(
      doc(firestore, "businesses", businessId, "publicStaff", staff.id, "records", `att_${d.id}`),
      {
        recordType: "attendance",
        staffId: staff.id,
        date: data.date || "",
        status: data.status || "present",
        overtimeHours: parseNonNegativeNumber(data.overtimeHours),
        allowance: parseNonNegativeNumber(data.allowance),
        manualPayment: parseNonNegativeNumber(data.manualPayment),
      },
      { merge: true }
    );
  });

  paymentsSnap.docs.forEach((d) => {
    const data = d.data();
    batch.set(
      doc(firestore, "businesses", businessId, "publicStaff", staff.id, "records", `pay_${d.id}`),
      {
        recordType: "payment",
        staffId: staff.id,
        date: data.date || "",
        amount: parseNonNegativeNumber(data.amount),
        type: data.type || "advance",
        mode: data.mode || "Cash",
        note: data.note || "",
      },
      { merge: true }
    );
  });

  await batch.commit();
}

export async function mirrorAttendanceRecordIfPublic(params: {
  firestore: Firestore;
  businessId: string;
  staff?: StaffMemberLike | null;
  recordId: string;
  payload: {
    date: string;
    status: string;
    overtimeHours: number;
    allowance: number;
    manualPayment: number;
  } | null;
}) {
  const { firestore, businessId, staff, recordId, payload } = params;
  if (!businessId || !staff?.id || !staff.sharePublic) return;

  const mirrorRef = doc(
    firestore,
    "businesses",
    businessId,
    "publicStaff",
    staff.id,
    "records",
    `att_${recordId}`
  );

  if (!payload) {
    await deleteDoc(mirrorRef).catch(() => {});
    return;
  }

  await setDoc(
    mirrorRef,
    {
      recordType: "attendance",
      staffId: staff.id,
      date: payload.date,
      status: payload.status,
      overtimeHours: payload.overtimeHours,
      allowance: payload.allowance,
      manualPayment: payload.manualPayment,
    },
    { merge: true }
  ).catch(() => {});
}

export async function mirrorStaffPaymentIfPublic(params: {
  firestore: Firestore;
  businessId: string;
  staff?: StaffMemberLike | null;
  paymentId: string;
  payload: {
    date: string;
    amount: number;
    type: string;
    mode?: string;
    note?: string;
  };
}) {
  const { firestore, businessId, staff, paymentId, payload } = params;
  if (!businessId || !staff?.id || !staff.sharePublic) return;

  const mirrorRef = doc(
    firestore,
    "businesses",
    businessId,
    "publicStaff",
    staff.id,
    "records",
    `pay_${paymentId}`
  );

  await setDoc(
    mirrorRef,
    {
      recordType: "payment",
      staffId: staff.id,
      date: payload.date,
      amount: payload.amount,
      type: payload.type,
      mode: payload.mode || "Cash",
      note: payload.note || "",
    },
    { merge: true }
  ).catch(() => {});
}
