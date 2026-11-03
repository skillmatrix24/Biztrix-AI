"use server";

import { initializeAdmin } from "@/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { refundOrder } from "./payment-actions";

/**
 * PHASE 5: PRODUCTION-GRADE ORDER MANAGEMENT SERVER ACTIONS
 * 
 * Enforces:
 * 1. User authentication & tenant isolation
 * 2. Role-based authorization (owner / admin / manager)
 * 3. State-machine transition validation
 * 4. Safe payment/cancellation coordination
 * 5. Privileged writes via Firebase Admin SDK
 */

interface AuthTenantResult {
  authorized: boolean;
  uid?: string;
  businessId?: string;
  role?: string;
  error?: string;
}

/**
 * Verifies tenant ownership and role permissions server-side.
 */
async function authenticateMerchant(
  userId?: string, 
  requestedBusinessId?: string, 
  idToken?: string
): Promise<AuthTenantResult> {
  const { admin, db } = initializeAdmin();

  let resolvedUid = userId;

  // 1. Verify ID token if provided
  if (idToken) {
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      resolvedUid = decoded.uid;
    } catch {
      return { authorized: false, error: "AUTH_TOKEN_EXPIRED" };
    }
  }

  if (!resolvedUid) {
    return { authorized: false, error: "AUTHENTICATION_REQUIRED" };
  }

  // 2. Fetch authenticated user document
  const userDoc = await db.doc(`users/${resolvedUid}`).get();
  if (!userDoc.exists) {
    return { authorized: false, error: "USER_RECORD_NOT_FOUND" };
  }

  const uData = userDoc.data();
  const tenantBusinessId = uData?.businessId;

  if (!tenantBusinessId) {
    return { authorized: false, error: "NO_TENANT_LINKED" };
  }

  // Prevent cross-tenant tampering
  if (requestedBusinessId && requestedBusinessId !== tenantBusinessId) {
    return { authorized: false, error: "TENANT_MISMATCH_SECURITY_VIOLATION" };
  }

  // 3. Enforce Role: owner, admin, or manager
  const role = (uData?.role || "").toLowerCase();
  const allowedRoles = ["owner", "admin", "manager"];
  if (!allowedRoles.includes(role)) {
    return { authorized: false, error: "INSUFFICIENT_PERMISSIONS" };
  }

  return {
    authorized: true,
    uid: resolvedUid,
    businessId: tenantBusinessId,
    role,
  };
}

/**
 * Valid transitions dictionary enforcing strict state progression.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  created: ["cancelled"],
  paid: ["processing", "shipped", "cancelled", "refunded"],
  processing: ["shipped", "delivered", "cancelled", "refunded"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  payment_captured_unsettled: ["paid", "refunded"],
  refund_pending: ["refunded"],
  cancelled: [],
  refunded: [],
};

export interface UpdateOrderStatusParams {
  userId: string;
  businessId: string;
  orderId: string;
  newStatus: string;
  note?: string;
  trackingNumber?: string;
  courierName?: string;
  idToken?: string;
}

/**
 * Executes a server-validated status transition for an order.
 */
export async function updateOrderStatus(params: UpdateOrderStatusParams): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const { userId, businessId, orderId, newStatus, note, trackingNumber, courierName, idToken } = params;

  const auth = await authenticateMerchant(userId, businessId, idToken);
  if (!auth.authorized || !auth.businessId || !auth.uid) {
    return { success: false, error: auth.error || "UNAUTHORIZED" };
  }

  const tenantBusinessId = auth.businessId;
  const { db } = initializeAdmin();
  const orderRef = db.doc(`businesses/${tenantBusinessId}/orders/${orderId}`);

  try {
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return { success: false, error: "ORDER_NOT_FOUND" };
    }

    const orderData = orderSnap.data()!;
    const currentStatus = orderData.status;

    // Validate state transition
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      return { 
        success: false, 
        error: `Cannot transition order from "${currentStatus}" to "${newStatus}". Allowed transitions: ${allowed.join(', ') || 'None (Terminal state)'}` 
      };
    }

    // Special Handling: Cancellation on paid/unsettled order requires refund processing
    if (newStatus === "cancelled") {
      return cancelMerchantOrder({
        userId: auth.uid,
        businessId: tenantBusinessId,
        orderId,
        reason: note || "Cancelled by merchant",
        idToken,
      });
    }

    // Special Handling: Transition to refunded delegates to the hardened refund engine
    if (newStatus === "refunded") {
      const refundRes = await refundOrder(
        auth.uid,
        tenantBusinessId,
        orderId,
        note || "Merchant initiated refund",
        true
      );
      if (refundRes.success) {
        revalidatePath("/website/orders");
        return { success: true, message: "Order refunded and items restocked." };
      }
      return { success: false, error: refundRes.error || "REFUND_EXECUTION_FAILED" };
    }

    // Standard Forward Transitions (processing, shipped, delivered)
    const nowIso = new Date().toISOString();
    const historyEntry: Record<string, any> = {
      status: newStatus,
      previousStatus: currentStatus,
      changedBy: auth.uid,
      changedAt: nowIso,
      note: note || "",
    };

    if (trackingNumber) historyEntry.trackingNumber = trackingNumber;
    if (courierName) historyEntry.courierName = courierName;

    const existingHistory = Array.isArray(orderData.statusHistory) ? orderData.statusHistory : [];

    const updatePayload: Record<string, any> = {
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
      statusHistory: [...existingHistory, historyEntry],
    };

    if (newStatus === "processing") {
      updatePayload.processingStartedAt = FieldValue.serverTimestamp();
    } else if (newStatus === "shipped") {
      updatePayload.shippedAt = FieldValue.serverTimestamp();
      if (trackingNumber) updatePayload.trackingNumber = trackingNumber;
      if (courierName) updatePayload.courierName = courierName;
    } else if (newStatus === "delivered") {
      updatePayload.deliveredAt = FieldValue.serverTimestamp();
    }

    await orderRef.update(updatePayload);

    revalidatePath("/website/orders");
    return { success: true, message: `Order updated to ${newStatus}.` };

  } catch (err: any) {
    console.error("Order status update failed:", err);
    return { success: false, error: err.message || "INTERNAL_ERROR" };
  }
}

export interface CancelOrderParams {
  userId: string;
  businessId: string;
  orderId: string;
  reason: string;
  idToken?: string;
}

/**
 * Safely cancels an order while protecting payment and inventory states.
 */
export async function cancelMerchantOrder(params: CancelOrderParams): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const { userId, businessId, orderId, reason, idToken } = params;

  const auth = await authenticateMerchant(userId, businessId, idToken);
  if (!auth.authorized || !auth.businessId || !auth.uid) {
    return { success: false, error: auth.error || "UNAUTHORIZED" };
  }

  const tenantBusinessId = auth.businessId;
  const { db } = initializeAdmin();
  const orderRef = db.doc(`businesses/${tenantBusinessId}/orders/${orderId}`);

  try {
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return { success: false, error: "ORDER_NOT_FOUND" };
    }

    const orderData = orderSnap.data()!;
    const currentStatus = orderData.status;

    if (currentStatus === "cancelled" || currentStatus === "refunded") {
      return { success: false, error: `Order is already ${currentStatus}.` };
    }

    // 1. UNPAID ORDER (created): Direct cancellation without payment action
    if (currentStatus === "created") {
      const nowIso = new Date().toISOString();
      const existingHistory = Array.isArray(orderData.statusHistory) ? orderData.statusHistory : [];

      await orderRef.update({
        status: "cancelled",
        cancelReason: reason || "Cancelled by merchant",
        cancelledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        statusHistory: [
          ...existingHistory,
          {
            status: "cancelled",
            previousStatus: currentStatus,
            changedBy: auth.uid,
            changedAt: nowIso,
            note: reason || "Unpaid order cancelled.",
          },
        ],
      });

      revalidatePath("/website/orders");
      return { success: true, message: "Unpaid order marked as cancelled." };
    }

    // 2. STALLED ORDER (payment_captured_unsettled): Refund payment, no stock restock needed
    if (currentStatus === "payment_captured_unsettled") {
      const res = await refundOrder(
        auth.uid,
        tenantBusinessId,
        orderId,
        `Order cancelled: ${reason}`,
        false
      );
      if (res.success) {
        await orderRef.update({
          status: "cancelled",
          cancelReason: reason,
          cancelledAt: FieldValue.serverTimestamp(),
        });
        revalidatePath("/website/orders");
        return { success: true, message: "Stalled order cancelled and customer refunded." };
      }
      return { success: false, error: res.error || "REFUND_FAILED" };
    }

    // 3. SETTLED ORDER (paid or processing): Refund payment AND restore stock
    if (currentStatus === "paid" || currentStatus === "processing") {
      const res = await refundOrder(
        auth.uid,
        tenantBusinessId,
        orderId,
        `Order cancelled: ${reason}`,
        true
      );
      if (res.success) {
        await orderRef.update({
          status: "cancelled",
          cancelReason: reason,
          cancelledAt: FieldValue.serverTimestamp(),
        });
        revalidatePath("/website/orders");
        return { success: true, message: "Order cancelled, inventory restored, and customer refunded." };
      }
      return { success: false, error: res.error || "REFUND_FAILED" };
    }

    // 4. DISPATCHED ORDER (shipped or delivered): Cannot silently cancel
    return {
      success: false,
      error: `Order has already been ${currentStatus}. Dispatched items must be handled via the formal return/refund workflow.`
    };

  } catch (err: any) {
    console.error("Cancellation failed:", err);
    return { success: false, error: err.message || "INTERNAL_ERROR" };
  }
}

/**
 * Fetches unified customer metrics from businesses/{businessId}/customers/{customerId}.
 * Resolves customer order history and contact details securely.
 */
export async function fetchCustomerProfile(
  userId: string,
  businessId: string,
  customerId: string,
  idToken?: string
): Promise<{
  success: boolean;
  customer?: any;
  error?: string;
}> {
  const auth = await authenticateMerchant(userId, businessId, idToken);
  if (!auth.authorized || !auth.businessId) {
    return { success: false, error: auth.error || "UNAUTHORIZED" };
  }

  const { db } = initializeAdmin();
  const customerRef = db.doc(`businesses/${auth.businessId}/customers/${customerId}`);

  try {
    const snap = await customerRef.get();
    if (!snap.exists) {
      return { success: false, error: "CUSTOMER_NOT_FOUND" };
    }

    const data = snap.data();
    return {
      success: true,
      customer: {
        id: snap.id,
        ...data,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "FETCH_FAILED" };
  }
}
