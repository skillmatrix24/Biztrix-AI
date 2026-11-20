"use server";

import { initializeAdmin } from "@/firebase/admin";
import { KNOWN_BUSINESS_SUBCOLLECTIONS, computeTenantInactivityDays } from "@/lib/cleanup-audit";
import { revalidatePath } from "next/cache";

const AUTHORIZED_OWNER_EMAILS = [
  "skillmatrix24@gmail.com",
  "gw7infra@gmail.com",
];

const AUTHORIZED_OWNER_UIDS = [
  "sEM5J1HuMCW8RbBTbvnJ5EwaDYA2",
  "jA4htunMjSVcMBpRuzfSx8yooHC2",
];

function isAuthorizedOwner(email?: string | null, uid?: string | null): boolean {
  if (email && AUTHORIZED_OWNER_EMAILS.includes(email.toLowerCase().trim())) {
    return true;
  }
  if (uid && AUTHORIZED_OWNER_UIDS.includes(uid)) {
    return true;
  }
  return false;
}

/**
 * Inspects live document counts across subcollections of a business.
 */
export async function inspectBusinessSubcollectionsAction(businessId: string) {
  try {
    const { db } = initializeAdmin();
    const cleanId = String(businessId || "").trim();
    if (!cleanId) return { success: false, error: "Invalid business ID" };

    const bizDoc = await db.collection("businesses").doc(cleanId).get();
    if (!bizDoc.exists) {
      return { success: false, error: "Business document does not exist" };
    }

    const counts: Record<string, number> = {};
    const keySubcollections = [
      "products",
      "orders",
      "customers",
      "vendors",
      "cashbook",
      "leads",
      "tasks",
      "invoices",
      "users",
      "websites",
    ];

    for (const sub of keySubcollections) {
      const snap = await db
        .collection("businesses")
        .doc(cleanId)
        .collection(sub)
        .limit(250)
        .get();
      counts[sub] = snap.size;
    }

    return {
      success: true,
      businessId: cleanId,
      name: bizDoc.data()?.name || "Unnamed Business",
      status: bizDoc.data()?.status || "trial",
      counts,
    };
  } catch (err: any) {
    console.error("[inspectBusinessSubcollectionsAction] error:", err);
    return { success: false, error: err.message || "Failed to inspect business" };
  }
}

/**
 * Permanently deletes a business and all of its subcollections (Recursive Deep Clean).
 */
export async function purgeBusinessCompletelyAction(input: {
  businessId: string;
  callerEmail?: string;
  callerUid?: string;
  reason?: string;
}) {
  try {
    const { businessId, callerEmail, callerUid, reason } = input;
    if (!isAuthorizedOwner(callerEmail, callerUid)) {
      return { success: false, error: "UNAUTHORIZED: Platform Owner access required" };
    }

    const cleanId = String(businessId || "").trim();
    if (!cleanId) return { success: false, error: "Business ID is required" };

    const { db, admin } = initializeAdmin();
    const bizRef = db.collection("businesses").doc(cleanId);
    const bizSnap = await bizRef.get();

    if (!bizSnap.exists) {
      return { success: false, error: `Business "${cleanId}" not found in Firestore` };
    }

    const bizData = bizSnap.data();
    if (bizData?.status === "pro") {
      return {
        success: false,
        error: `SAFETY LOCK: Business "${bizData?.name || cleanId}" has an Active Pro license. Change status before purging.`,
      };
    }

    let totalDeletedDocs = 0;
    const deletedSubcollections: string[] = [];

    // 1. Delete all subcollections in batches
    for (const sub of KNOWN_BUSINESS_SUBCOLLECTIONS) {
      const subRef = bizRef.collection(sub);
      const docsSnap = await subRef.limit(500).get();

      if (!docsSnap.empty) {
        const batch = db.batch();
        for (const doc of docsSnap.docs) {
          batch.delete(doc.ref);
          totalDeletedDocs++;
        }
        await batch.commit();
        deletedSubcollections.push(sub);
      }
    }

    // 2. Remove associated staff users from /users collection (excluding platform owner)
    const associatedUsersSnap = await db
      .collection("users")
      .where("businessId", "==", cleanId)
      .limit(100)
      .get();

    if (!associatedUsersSnap.empty) {
      const userBatch = db.batch();
      for (const uDoc of associatedUsersSnap.docs) {
        const uEmail = uDoc.data()?.email?.toLowerCase();
        if (!AUTHORIZED_OWNER_EMAILS.includes(uEmail)) {
          userBatch.delete(uDoc.ref);
          totalDeletedDocs++;
        }
      }
      await userBatch.commit();
    }

    // 3. Delete parent business document
    await bizRef.delete();
    totalDeletedDocs++;

    // 4. Record audit log
    await db.collection("system").doc("logs").collection("cleanup").add({
      action: "PURGE_BUSINESS_COMPLETELY",
      businessId: cleanId,
      businessName: bizData?.name || "Unnamed",
      deletedDocsCount: totalDeletedDocs,
      subcollectionsCleaned: deletedSubcollections,
      triggeredBy: callerEmail || callerUid || "system",
      reason: reason || "Manual owner purge",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    revalidatePath("/owner/cleanup");
    revalidatePath("/owner");

    return {
      success: true,
      businessId: cleanId,
      name: bizData?.name || cleanId,
      totalDeletedDocs,
      deletedSubcollections,
    };
  } catch (err: any) {
    console.error("[purgeBusinessCompletelyAction] error:", err);
    return { success: false, error: err.message || "Failed to purge business" };
  }
}

/**
 * Batch purges all trial businesses that have been expired for more than X days.
 */
export async function batchPurgeStaleTenantsAction(input: {
  minDaysExpired: number;
  callerEmail?: string;
  callerUid?: string;
}) {
  try {
    const { minDaysExpired = 60, callerEmail, callerUid } = input;
    if (!isAuthorizedOwner(callerEmail, callerUid)) {
      return { success: false, error: "UNAUTHORIZED: Platform Owner access required" };
    }

    const { db } = initializeAdmin();
    const businessesSnap = await db.collection("businesses").get();
    const staleToPurge: Array<{ id: string; name: string; daysExpired: number }> = [];

    const now = new Date();
    for (const doc of businessesSnap.docs) {
      const data = doc.data();
      const status = String(data?.status || "").toLowerCase().trim();
      if (status === "pro" || status === "active") continue;

      const daysExpired = computeTenantInactivityDays(data, now);
      if (daysExpired >= minDaysExpired) {
        staleToPurge.push({
          id: doc.id,
          name: data?.name || doc.id,
          daysExpired,
        });
      }
    }

    if (staleToPurge.length === 0) {
      return {
        success: true,
        purgedCount: 0,
        message: `No trial businesses found expired for more than ${minDaysExpired} days.`,
      };
    }

    const purgedList: string[] = [];
    const errors: string[] = [];

    for (const biz of staleToPurge) {
      const result = await purgeBusinessCompletelyAction({
        businessId: biz.id,
        callerEmail,
        callerUid,
        reason: `Auto batch purge: Expired ${biz.daysExpired} days ago (Threshold: ${minDaysExpired}d)`,
      });

      if (result.success) {
        purgedList.push(`${biz.name} (${biz.id})`);
      } else {
        errors.push(`${biz.id}: ${result.error}`);
      }
    }

    revalidatePath("/owner/cleanup");

    return {
      success: true,
      purgedCount: purgedList.length,
      purgedList,
      errors,
      message: `Successfully purged ${purgedList.length} stale businesses.`,
    };
  } catch (err: any) {
    console.error("[batchPurgeStaleTenantsAction] error:", err);
    return { success: false, error: err.message || "Failed to batch purge" };
  }
}

/**
 * Extends a tenant's trial by N days.
 */
export async function extendBusinessTrialAction(input: {
  businessId: string;
  additionalDays: number;
  callerEmail?: string;
  callerUid?: string;
}) {
  try {
    const { businessId, additionalDays = 15, callerEmail, callerUid } = input;
    if (!isAuthorizedOwner(callerEmail, callerUid)) {
      return { success: false, error: "UNAUTHORIZED: Platform Owner access required" };
    }

    const cleanId = String(businessId || "").trim();
    const { db, admin } = initializeAdmin();
    const bizRef = db.collection("businesses").doc(cleanId);
    const snap = await bizRef.get();

    if (!snap.exists) {
      return { success: false, error: "Business not found" };
    }

    const currentData = snap.data();
    const currentEnd =
      currentData?.trialEndDate?.toDate?.() ||
      (currentData?.trialEndDate ? new Date(currentData.trialEndDate) : new Date());

    const baseDate = currentEnd > new Date() ? currentEnd : new Date();
    const newEndDate = new Date(baseDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);

    await bizRef.update({
      trialEndDate: admin.firestore.Timestamp.fromDate(newEndDate),
      status: "trial",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    revalidatePath("/owner/cleanup");
    revalidatePath("/owner");

    return {
      success: true,
      businessId: cleanId,
      newEndDate: newEndDate.toISOString(),
      message: `Trial for "${currentData?.name || cleanId}" extended by ${additionalDays} days.`,
    };
  } catch (err: any) {
    console.error("[extendBusinessTrialAction] error:", err);
    return { success: false, error: err.message || "Failed to extend trial" };
  }
}

/**
 * Updates the global deletion policy in Firestore (Immediate Hard Delete vs Soft Delete).
 */
export async function updateGlobalRetentionPolicyAction(input: {
  immediateHardDelete: boolean;
  callerEmail?: string;
  callerUid?: string;
}) {
  try {
    const { immediateHardDelete, callerEmail, callerUid } = input;
    if (!isAuthorizedOwner(callerEmail, callerUid)) {
      return { success: false, error: "UNAUTHORIZED: Platform Owner access required" };
    }

    const { db, admin } = initializeAdmin();
    await db
      .collection("system")
      .doc("config")
      .collection("retention")
      .doc("policy")
      .set(
        {
          immediateHardDelete,
          updatedBy: callerEmail || callerUid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return {
      success: true,
      immediateHardDelete,
      message: immediateHardDelete
        ? "Global Policy set to Immediate Permanent Hard Delete."
        : "Global Policy set to Soft-Delete with Archive Protection.",
    };
  } catch (err: any) {
    console.error("[updateGlobalRetentionPolicyAction] error:", err);
    return { success: false, error: err.message || "Failed to update policy" };
  }
}
