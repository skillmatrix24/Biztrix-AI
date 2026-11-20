import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  deleteDoc,
  writeBatch,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  getCountFromServer,
  increment,
  Firestore,
} from "firebase/firestore";
import { KNOWN_BUSINESS_SUBCOLLECTIONS, computeTenantInactivityDays } from "@/lib/cleanup-audit";

export interface InspectResult {
  success: boolean;
  counts?: Record<string, number>;
  error?: string;
}

export interface PurgeResult {
  success: boolean;
  name?: string;
  totalDeletedDocs?: number;
  collectionsCleaned?: number;
  error?: string;
}

export interface ExtendResult {
  success: boolean;
  message?: string;
  newTrialEndsAt?: string;
  error?: string;
}

export interface PolicyResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface BatchPurgeResult {
  success: boolean;
  purgedCount: number;
  totalDocsCleaned: number;
  message?: string;
  error?: string;
}

/**
 * Inspects live document counts across key subcollections of a business using client Firestore.
 */
export async function inspectBusinessSubcollectionsClient(
  firestore: Firestore,
  businessId: string
): Promise<InspectResult> {
  try {
    const cleanId = String(businessId || "").trim();
    if (!cleanId) return { success: false, error: "Invalid business ID" };

    const bizRef = doc(firestore, "businesses", cleanId);
    const bizDoc = await getDoc(bizRef);
    if (!bizDoc.exists()) {
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
      try {
        const colRef = collection(firestore, "businesses", cleanId, sub);
        const countSnap = await getCountFromServer(colRef);
        counts[sub] = countSnap.data().count;
      } catch {
        try {
          const snap = await getDocs(
            query(collection(firestore, "businesses", cleanId, sub), limit(250))
          );
          counts[sub] = snap.size;
        } catch {
          counts[sub] = 0;
        }
      }
    }

    return { success: true, counts };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to inspect subcollections.",
    };
  }
}

/**
 * Deep recursive purge of a business and its 39 subcollections.
 */
export async function purgeBusinessCompletelyClient(
  firestore: Firestore,
  params: {
    businessId: string;
    callerEmail?: string;
    reason?: string;
  }
): Promise<PurgeResult> {
  try {
    const cleanId = String(params.businessId || "").trim();
    if (!cleanId) return { success: false, error: "Invalid business ID" };

    const bizRef = doc(firestore, "businesses", cleanId);
    const bizSnap = await getDoc(bizRef);

    if (!bizSnap.exists()) {
      return { success: false, error: "Business document does not exist" };
    }

    const bizData = bizSnap.data() || {};
    const bizName = String(bizData.name || bizData.businessName || cleanId);
    const status = String(bizData.status || "").toLowerCase();

    // Safety lock: Never allow accidental purge of active pro businesses
    if (status === "pro" || status === "active_pro") {
      return {
        success: false,
        error: `Action blocked: "${bizName}" is marked as active Pro subscription. Downgrade or pause subscription first before purging.`,
      };
    }

    let totalDeletedDocs = 0;
    let collectionsCleaned = 0;

    // 1. Purge all 39 known subcollections in chunked batches
    for (const sub of KNOWN_BUSINESS_SUBCOLLECTIONS) {
      let hasMore = true;
      let subDocCount = 0;

      while (hasMore) {
        const subColRef = collection(firestore, "businesses", cleanId, sub);
        const snap = await getDocs(query(subColRef, limit(350)));

        if (snap.empty) {
          hasMore = false;
          break;
        }

        const batch = writeBatch(firestore);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();

        subDocCount += snap.size;
        totalDeletedDocs += snap.size;

        if (snap.size < 350) {
          hasMore = false;
        }
      }

      if (subDocCount > 0) {
        collectionsCleaned++;
      }
    }

    // 2. Remove non-owner tenant users attached to this business
    try {
      const usersQuery = query(
        collection(firestore, "users"),
        where("businessId", "==", cleanId),
        limit(150)
      );
      const userSnaps = await getDocs(usersQuery);

      if (!userSnaps.empty) {
        const batch = writeBatch(firestore);
        let userDeleteCount = 0;

        for (const uDoc of userSnaps.docs) {
          const uData = uDoc.data();
          const email = String(uData.email || "").toLowerCase();
          if (
            email !== "skillmatrix24@gmail.com" &&
            email !== "gw7infra@gmail.com"
          ) {
            batch.delete(uDoc.ref);
            userDeleteCount++;
          }
        }

        if (userDeleteCount > 0) {
          await batch.commit();
          totalDeletedDocs += userDeleteCount;
        }
      }
    } catch (userErr) {
      console.warn("User cleanup skipped:", userErr);
    }

    // 3. Delete the parent business document
    await deleteDoc(bizRef);
    totalDeletedDocs++;

    // 4. Log to /system/logs/cleanup
    try {
      await addDoc(collection(firestore, "system", "logs", "cleanup"), {
        action: "PURGE_BUSINESS",
        businessId: cleanId,
        businessName: bizName,
        executorEmail: params.callerEmail || "platform_owner",
        timestamp: new Date().toISOString(),
        purgedCollectionsCount: collectionsCleaned,
        purgedDocumentsCount: totalDeletedDocs,
        reason: params.reason || "Manual Deep Cleanup via Platform Master",
      });
    } catch (logErr) {
      console.warn("Cleanup audit log write warning:", logErr);
    }

    return {
      success: true,
      name: bizName,
      totalDeletedDocs,
      collectionsCleaned,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to complete recursive business purge.",
    };
  }
}

/**
 * Extends the trial of a business by N additional days.
 */
export async function extendBusinessTrialClient(
  firestore: Firestore,
  params: {
    businessId: string;
    additionalDays: number;
    callerEmail?: string;
  }
): Promise<ExtendResult> {
  try {
    const cleanId = String(params.businessId || "").trim();
    if (!cleanId) return { success: false, error: "Invalid business ID" };

    const bizRef = doc(firestore, "businesses", cleanId);
    const bizSnap = await getDoc(bizRef);

    if (!bizSnap.exists()) {
      return { success: false, error: "Business not found" };
    }

    const bizData = bizSnap.data() || {};
    const currentEnd = bizData.trialEndsAt ? new Date(bizData.trialEndsAt) : new Date();
    const baseDate = currentEnd > new Date() ? currentEnd : new Date();
    const newEnd = new Date(
      baseDate.getTime() + (params.additionalDays || 15) * 86400 * 1000
    );

    await updateDoc(bizRef, {
      trialEndsAt: newEnd.toISOString(),
      status: "trial",
      updatedAt: serverTimestamp(),
      lastTrialExtendedAt: new Date().toISOString(),
      lastTrialExtendedBy: params.callerEmail || "platform_owner",
    });

    return {
      success: true,
      message: `Trial for ${bizData.name || cleanId} extended by ${params.additionalDays} days until ${newEnd.toLocaleDateString()}.`,
      newTrialEndsAt: newEnd.toISOString(),
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to extend trial.",
    };
  }
}

/**
 * Updates global retention policy (Hard delete vs 30-day soft delete).
 */
export async function updateGlobalRetentionPolicyClient(
  firestore: Firestore,
  params: {
    immediateHardDelete: boolean;
    callerEmail?: string;
  }
): Promise<PolicyResult> {
  try {
    const policyRef = doc(firestore, "system", "config", "retention", "policy");
    await setDoc(
      policyRef,
      {
        immediateHardDelete: Boolean(params.immediateHardDelete),
        softDeleteRetentionDays: params.immediateHardDelete ? 0 : 30,
        updatedAt: serverTimestamp(),
        updatedBy: params.callerEmail || "platform_owner",
      },
      { merge: true }
    );

    return {
      success: true,
      message: params.immediateHardDelete
        ? "Global Retention Policy set to: Immediate Permanent Hard Delete on frontend deletions."
        : "Global Retention Policy set to: 30-Day Soft Retention Window before permanent purge.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to update retention policy.",
    };
  }
}

/**
 * Batch purges all trial businesses expired more than minDaysExpired.
 */
export async function batchPurgeStaleTenantsClient(
  firestore: Firestore,
  params: {
    minDaysExpired: number;
    callerEmail?: string;
    onProgress?: (msg: string) => void;
  }
): Promise<BatchPurgeResult> {
  try {
    const minDays = params.minDaysExpired || 60;
    const snap = await getDocs(collection(firestore, "businesses"));

    if (snap.empty) {
      return {
        success: true,
        purgedCount: 0,
        totalDocsCleaned: 0,
        message: "No business records found in database.",
      };
    }

    const now = Date.now();
    const staleList: { id: string; name: string }[] = [];

    for (const d of snap.docs) {
      const data = d.data();
      const status = String(data.status || "").toLowerCase();
      if (status === "pro" || status === "active_pro") continue;

      const trialEndsAt = data.trialEndsAt ? new Date(data.trialEndsAt).getTime() : 0;
      if (trialEndsAt && trialEndsAt < now) {
        const daysExpired = Math.floor((now - trialEndsAt) / (86400 * 1000));
        if (daysExpired >= minDays) {
          staleList.push({ id: d.id, name: data.name || data.businessName || d.id });
        }
      }
    }

    if (staleList.length === 0) {
      return {
        success: true,
        purgedCount: 0,
        totalDocsCleaned: 0,
        message: `No trial businesses found that have been expired for more than ${minDays} days.`,
      };
    }

    let purgedCount = 0;
    let totalDocsCleaned = 0;

    for (let i = 0; i < staleList.length; i++) {
      const biz = staleList[i];
      if (params.onProgress) {
        params.onProgress(`Purging ${i + 1}/${staleList.length}: ${biz.name}...`);
      }

      const res = await purgeBusinessCompletelyClient(firestore, {
        businessId: biz.id,
        callerEmail: params.callerEmail,
        reason: `Automated Batch Stale Purge (Expired > ${minDays}d)`,
      });

      if (res.success) {
        purgedCount++;
        totalDocsCleaned += res.totalDeletedDocs || 0;
      }
    }

    return {
      success: true,
      purgedCount,
      totalDocsCleaned,
      message: `Batch purge completed. ${purgedCount} stale trial businesses and ${totalDocsCleaned} documents permanently cleaned up.`,
    };
  } catch (err: any) {
    return {
      success: false,
      purgedCount: 0,
      totalDocsCleaned: 0,
      error: err?.message || "Failed to execute batch purge.",
    };
  }
}

export interface RecordNotificationParams {
  businessId: string;
  businessName: string;
  channel: 'whatsapp_direct' | 'whatsapp_meta' | 'email_direct' | 'email_api';
  recipientPhone?: string;
  recipientEmail?: string;
  subject?: string;
  templateName?: string;
  messageText: string;
  stage: string;
  callerEmail?: string;
}

export interface RecordNotificationResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Records a sent notification on the business document and writes audit log to system/logs/cleanup_notifications.
 */
export async function recordTenantNotificationSentClient(
  firestore: Firestore,
  params: RecordNotificationParams
): Promise<RecordNotificationResult> {
  try {
    const cleanId = String(params.businessId || "").trim();
    if (!cleanId) return { success: false, error: "Invalid business ID" };

    const bizRef = doc(firestore, "businesses", cleanId);
    await updateDoc(bizRef, {
      lastNotifiedAt: new Date().toISOString(),
      lastNotifiedChannel: params.channel,
      lastNotifiedStage: params.stage,
      ...(params.templateName ? { lastNotifiedTemplate: params.templateName } : {}),
      notificationCount: increment(1),
      updatedAt: serverTimestamp(),
    });

    try {
      await addDoc(collection(firestore, "system", "logs", "cleanup_notifications"), {
        businessId: cleanId,
        businessName: params.businessName || cleanId,
        channel: params.channel,
        stage: params.stage,
        templateName: params.templateName || null,
        recipientPhone: params.recipientPhone || null,
        recipientEmail: params.recipientEmail || null,
        subject: params.subject || null,
        messageExcerpt: (params.messageText || "").slice(0, 300),
        sentBy: params.callerEmail || "platform_owner",
        timestamp: new Date().toISOString(),
        status: "sent",
      });
    } catch (logErr) {
      console.warn("Notification log write warning:", logErr);
    }

    return {
      success: true,
      message: `Notification recorded for ${params.businessName || cleanId}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to record notification.",
    };
  }
}

/**
 * Saves Platform Master Meta Cloud API credentials and lifecycle automation template mappings
 * into owner-only Firestore node: /system/private/integrations/meta_whatsapp
 */
export async function savePlatformMetaOutreachConfigClient(
  firestore: Firestore,
  config: Record<string, any>,
  callerEmail?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const ref = doc(firestore, "system", "private", "integrations", "meta_whatsapp");
    await setDoc(
      ref,
      {
        ...config,
        updatedAt: new Date().toISOString(),
        updatedBy: callerEmail || "platform_owner",
      },
      { merge: true }
    );
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to save Meta API outreach configuration.",
    };
  }
}
