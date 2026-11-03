'use client';
/**
 * @fileOverview Solar Operational Notification Engine.
 * Handles event-based triggers and condition scanning for the Solar lifecycle.
 */

import { 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase";
import { differenceInDays, isBefore, parseISO, addDays } from "date-fns";

export type SolarNotificationType = 
  | 'INQUIRY_NEW' 
  | 'INQUIRY_OVERDUE' 
  | 'SURVEY_SCHEDULED' 
  | 'SURVEY_OVERDUE'
  | 'INSTALL_OVERDUE'
  | 'WARRANTY_EXPIRING'
  | 'AMC_RENEWAL'
  | 'SERVICE_NEW';

export type NotificationSeverity = 'INFO' | 'WARNING' | 'URGENT';

interface CreateNotificationInput {
  businessId: string;
  recipientId: string;
  title: string;
  message: string;
  type: string;
  severity: NotificationSeverity;
  entityType: string;
  entityId: string;
  dedupeKey?: string;
}

/**
 * Creates a tenant-scoped notification node.
 * Uses setDoc with dedupeKey for idempotent alerts.
 */
export function createSolarNotification(db: Firestore, input: CreateNotificationInput) {
  const notificationId = input.dedupeKey || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const docRef = doc(db, 'businesses', input.businessId, 'notifications', notificationId);

  setDoc(docRef, {
    recipientId: input.recipientId,
    title: input.title,
    message: input.message,
    type: input.type,
    severity: input.severity,
    entityType: input.entityType,
    entityId: input.entityId,
    isRead: false,
    createdAt: serverTimestamp(),
  }, { merge: true }).catch(err => {
    console.error(err);
    console.warn("Notification dispatch failed:", err);
  });
}

/**
 * SCANS Solar registry for overdue or expiring nodes and generates alerts.
 * Designed to run on dashboard load for authorized roles.
 */
export async function runSolarConditionScanner(db: Firestore, businessId: string, ownerId: string) {
  if (!businessId || !ownerId) return;

  const today = new Date();
  const thirtyDaysFromNow = addDays(today, 30);

  // 1. SCAN: Overdue Inquiries (New and older than 3 days)
  const inqQuery = query(
    collection(db, 'businesses', businessId, 'solarInquiries'),
    where('status', '==', 'NEW')
  );
  const inqSnap = await getDocs(inqQuery);
  inqSnap.docs.forEach(d => {
    const data = d.data();
    const created = data.createdAt?.toDate?.() || today;
    if (differenceInDays(today, created) >= 3) {
      createSolarNotification(db, {
        businessId,
        recipientId: ownerId,
        title: "Inquiry Stalled",
        message: `Inquiry for ${data.customerName} has been NEW for 3+ days.`,
        type: 'solar_alert',
        severity: 'WARNING',
        entityType: 'SOLAR_INQUIRY',
        entityId: d.id,
        dedupeKey: `alert_inq_overdue_${d.id}`
      });
    }
  });

  // 2. SCAN: Overdue Installations (In Progress and past deadline)
  const installQuery = query(
    collection(db, 'businesses', businessId, 'solarInstallations'),
    where('status', '==', 'IN_PROGRESS')
  );
  const installSnap = await getDocs(installQuery);
  installSnap.docs.forEach(d => {
    const data = d.data();
    if (data.scheduledEndDate && isBefore(parseISO(data.scheduledEndDate), today)) {
      createSolarNotification(db, {
        businessId,
        recipientId: ownerId,
        title: "Installation Overdue",
        message: `Field execution for ${data.customerName} is past the target date.`,
        type: 'solar_alert',
        severity: 'URGENT',
        entityType: 'SOLAR_INSTALLATION',
        entityId: d.id,
        dedupeKey: `alert_inst_overdue_${d.id}`
      });
    }
  });

  // 3. SCAN: Expiring Warranties (Next 30 days)
  const warQuery = query(
    collection(db, 'businesses', businessId, 'solarWarranties'),
    where('status', '==', 'ACTIVE')
  );
  const warSnap = await getDocs(warQuery);
  warSnap.docs.forEach(d => {
    const data = d.data();
    if (data.endDate && isBefore(parseISO(data.endDate), thirtyDaysFromNow)) {
      createSolarNotification(db, {
        businessId,
        recipientId: ownerId,
        title: "Warranty Expiring",
        message: `System warranty for ${data.customerName} expires on ${data.endDate}.`,
        type: 'solar_alert',
        severity: 'WARNING',
        entityType: 'SOLAR_WARRANTY',
        entityId: d.id,
        dedupeKey: `alert_war_exp_${d.id}`
      });
    }
  });

  // 4. SCAN: AMC Renewals
  const amcQuery = query(
    collection(db, 'businesses', businessId, 'solarAmcContracts'),
    where('status', '==', 'ACTIVE')
  );
  const amcSnap = await getDocs(amcQuery);
  amcSnap.docs.forEach(d => {
    const data = d.data();
    if (data.endDate && isBefore(parseISO(data.endDate), thirtyDaysFromNow)) {
      createSolarNotification(db, {
        businessId,
        recipientId: ownerId,
        title: "AMC Renewal Due",
        message: `Maintenance contract for ${data.customerName} requires renewal.`,
        type: 'solar_alert',
        severity: 'WARNING',
        entityType: 'SOLAR_AMC',
        entityId: d.id,
        dedupeKey: `alert_amc_ren_${d.id}`
      });
    }
  });
}
