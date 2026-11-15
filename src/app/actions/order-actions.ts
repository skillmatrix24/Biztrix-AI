"use server";

import { initializeAdmin } from "@/firebase/admin";
import {
  incrementSentinel,
  isPermissionDeniedError,
  restCommit,
  restGetDoc,
  restUpdateDoc,
  SERVER_TIMESTAMP_SENTINEL,
} from "@/firebase/firestore-rest";
import { authenticateMerchantServer } from "@/firebase/server-auth";
import { buildStorefrontCashbookEntry } from "@/lib/storefront-engine";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { refundOrder } from "./payment-actions";

const VALID_TRANSITIONS: Record<string, string[]> = {
  created: ["paid", "processing", "cancelled"],
  paid: ["processing", "shipped", "cancelled", "refunded"],
  processing: ["paid", "shipped", "delivered", "cancelled", "refunded"],
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

  const auth = await authenticateMerchantServer({
    userId,
    requestedBusinessId: businessId,
    idToken,
    allowedRoles: ["owner", "admin", "manager"],
  });
  if (!auth.authorized || !auth.businessId || !auth.uid) {
    return { success: false, error: auth.error || "UNAUTHORIZED" };
  }

  const tenantBusinessId = auth.businessId;
  const { db } = initializeAdmin();
  const orderPath = `businesses/${tenantBusinessId}/orders/${orderId}`;
  const orderRef = db.doc(orderPath);

  try {
    let orderData: Record<string, any> | undefined;
    let useRest = Boolean(auth.useRestFallback);

    if (!useRest) {
      try {
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
          return { success: false, error: "ORDER_NOT_FOUND" };
        }
        orderData = orderSnap.data()!;
      } catch (err: any) {
        if (isPermissionDeniedError(err)) {
          useRest = true;
        } else {
          throw err;
        }
      }
    }

    if (useRest) {
      const restSnap = await restGetDoc(orderPath, idToken);
      if (!restSnap.exists) {
        return { success: false, error: "ORDER_NOT_FOUND" };
      }
      orderData = restSnap.data()!;
    }

    const currentStatus = orderData!.status;

    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      return {
        success: false,
        error: `Cannot transition order from "${currentStatus}" to "${newStatus}". Allowed transitions: ${allowed.join(', ') || 'None (Terminal state)'}`
      };
    }

    if (newStatus === "cancelled") {
      return cancelMerchantOrder({
        userId: auth.uid,
        businessId: tenantBusinessId,
        orderId,
        reason: note || "Cancelled by merchant",
        idToken,
      });
    }

    if (newStatus === "refunded") {
      const refundRes = await refundOrder(
        auth.uid,
        tenantBusinessId,
        orderId,
        note || "Merchant initiated refund",
        true,
        idToken
      );
      if (refundRes.success) {
        revalidatePath("/website/orders");
        return { success: true, message: "Order refunded and items restocked." };
      }
      return { success: false, error: refundRes.error || "REFUND_EXECUTION_FAILED" };
    }

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

    const existingHistory = Array.isArray(orderData!.statusHistory) ? orderData!.statusHistory : [];
    const needsStockDeduction =
      currentStatus === "created" &&
      (newStatus === "paid" || newStatus === "processing") &&
      !orderData!.stockDeducted;

    const shouldRecordOfflineCashbook =
      !orderData!.cashbookRecorded &&
      !orderData!.razorpayPaymentId &&
      (newStatus === "paid" || (newStatus === "delivered" && orderData!.paymentMethod === "COD"));

    const baseUpdate: Record<string, any> = {
      status: newStatus,
      statusHistory: [...existingHistory, historyEntry],
    };

    if (needsStockDeduction) {
      baseUpdate.stockDeducted = true;
    }
    if (newStatus === "paid" || (newStatus === "delivered" && orderData!.paymentMethod === "COD")) {
      baseUpdate.settlementStatus = "success";
      baseUpdate.paymentCaptured = true;
    }
    if (shouldRecordOfflineCashbook) {
      baseUpdate.cashbookRecorded = true;
    }

    if (newStatus === "shipped") {
      if (trackingNumber) baseUpdate.trackingNumber = trackingNumber;
      if (courierName) baseUpdate.courierName = courierName;
    }

    const cbModeLabel =
      orderData!.paymentMethod === "COD"
        ? "Cash on Delivery"
        : orderData!.paymentMethod === "WHATSAPP"
          ? "WhatsApp Order"
          : "Storefront Offline";

    const updateViaRest = async () => {
      const ops: Parameters<typeof restCommit>[0] = [];

      if (needsStockDeduction && Array.isArray(orderData!.items)) {
        for (const item of orderData!.items) {
          const prodPath = `businesses/${tenantBusinessId}/products/${item.productId}`;
          const prodSnap = await restGetDoc(prodPath, idToken);
          if (!prodSnap.exists || (prodSnap.data()?.stock || 0) < item.quantity) {
            throw new Error(`Insufficient stock to confirm "${item.name}".`);
          }
          ops.push({
            type: "update",
            path: prodPath,
            currentDocument: prodSnap.updateTime ? { updateTime: prodSnap.updateTime } : { exists: true },
            data: {
              stock: incrementSentinel(-item.quantity),
              updatedAt: SERVER_TIMESTAMP_SENTINEL,
            },
          });
        }
      }

      const restPayload: Record<string, any> = {
        ...baseUpdate,
        updatedAt: SERVER_TIMESTAMP_SENTINEL,
      };
      if (newStatus === "processing") restPayload.processingStartedAt = SERVER_TIMESTAMP_SENTINEL;
      else if (newStatus === "shipped") restPayload.shippedAt = SERVER_TIMESTAMP_SENTINEL;
      else if (newStatus === "delivered") restPayload.deliveredAt = SERVER_TIMESTAMP_SENTINEL;

      ops.push({
        type: "update",
        path: orderPath,
        data: restPayload,
      });

      if (shouldRecordOfflineCashbook) {
        const cbEntry = buildStorefrontCashbookEntry({
          businessId: tenantBusinessId,
          orderId,
          customerName: orderData!.customerData?.name,
          amount: parseFloat(orderData!.amount) || 0,
          direction: "credit",
          paymentMode: cbModeLabel,
          dateIso: nowIso,
          note: note || `${cbModeLabel} settled`,
        });
        ops.push({
          type: "set",
          path: `businesses/${tenantBusinessId}/cashbook/cb_ord_${orderId}`,
          merge: true,
          data: {
            ...cbEntry,
            createdAt: SERVER_TIMESTAMP_SENTINEL,
          },
        });
      }

      await restCommit(ops, idToken);
    };

    if (useRest) {
      await updateViaRest();
    } else {
      try {
        await db.runTransaction(async (tx) => {
          if (needsStockDeduction && Array.isArray(orderData!.items)) {
            for (const item of orderData!.items) {
              const pRef = db.doc(`businesses/${tenantBusinessId}/products/${item.productId}`);
              const pSnap = await tx.get(pRef);
              if (!pSnap.exists || (pSnap.data()?.stock || 0) < item.quantity) {
                throw new Error(`Insufficient stock to confirm "${item.name}".`);
              }
            }
            for (const item of orderData!.items) {
              const pRef = db.doc(`businesses/${tenantBusinessId}/products/${item.productId}`);
              tx.update(pRef, {
                stock: FieldValue.increment(-item.quantity),
                updatedAt: FieldValue.serverTimestamp(),
              });
            }
          }

          const adminPayload: Record<string, any> = {
            ...baseUpdate,
            updatedAt: FieldValue.serverTimestamp(),
          };
          if (newStatus === "processing") adminPayload.processingStartedAt = FieldValue.serverTimestamp();
          else if (newStatus === "shipped") adminPayload.shippedAt = FieldValue.serverTimestamp();
          else if (newStatus === "delivered") adminPayload.deliveredAt = FieldValue.serverTimestamp();
          tx.update(orderRef, adminPayload);

          if (shouldRecordOfflineCashbook) {
            const cbEntry = buildStorefrontCashbookEntry({
              businessId: tenantBusinessId,
              orderId,
              customerName: orderData!.customerData?.name,
              amount: parseFloat(orderData!.amount) || 0,
              direction: "credit",
              paymentMode: cbModeLabel,
              dateIso: nowIso,
              note: note || `${cbModeLabel} settled`,
            });
            tx.set(
              db.doc(`businesses/${tenantBusinessId}/cashbook/cb_ord_${orderId}`),
              { ...cbEntry, createdAt: FieldValue.serverTimestamp() },
              { merge: true }
            );
          }
        });
      } catch (err: any) {
        if (isPermissionDeniedError(err)) {
          await updateViaRest();
        } else {
          throw err;
        }
      }
    }

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

  const auth = await authenticateMerchantServer({
    userId,
    requestedBusinessId: businessId,
    idToken,
    allowedRoles: ["owner", "admin", "manager"],
  });
  if (!auth.authorized || !auth.businessId || !auth.uid) {
    return { success: false, error: auth.error || "UNAUTHORIZED" };
  }

  const tenantBusinessId = auth.businessId;
  const { db } = initializeAdmin();
  const orderPath = `businesses/${tenantBusinessId}/orders/${orderId}`;
  const orderRef = db.doc(orderPath);

  try {
    let orderData: Record<string, any> | undefined;
    let useRest = Boolean(auth.useRestFallback);

    if (!useRest) {
      try {
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
          return { success: false, error: "ORDER_NOT_FOUND" };
        }
        orderData = orderSnap.data()!;
      } catch (err: any) {
        if (isPermissionDeniedError(err)) {
          useRest = true;
        } else {
          throw err;
        }
      }
    }

    if (useRest) {
      const restSnap = await restGetDoc(orderPath, idToken);
      if (!restSnap.exists) {
        return { success: false, error: "ORDER_NOT_FOUND" };
      }
      orderData = restSnap.data()!;
    }

    const currentStatus = orderData!.status;

    if (currentStatus === "cancelled" || currentStatus === "refunded") {
      return { success: false, error: `Order is already ${currentStatus}.` };
    }

    if (currentStatus === "created") {
      const nowIso = new Date().toISOString();
      const existingHistory = Array.isArray(orderData!.statusHistory) ? orderData!.statusHistory : [];
      const cancelBase = {
        status: "cancelled",
        cancelReason: reason || "Cancelled by merchant",
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
      };

      if (useRest) {
        await restUpdateDoc(orderPath, {
          ...cancelBase,
          cancelledAt: SERVER_TIMESTAMP_SENTINEL,
          updatedAt: SERVER_TIMESTAMP_SENTINEL,
        }, idToken);
      } else {
        try {
          await orderRef.update({
            ...cancelBase,
            cancelledAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        } catch (err: any) {
          if (isPermissionDeniedError(err)) {
            await restUpdateDoc(orderPath, {
              ...cancelBase,
              cancelledAt: SERVER_TIMESTAMP_SENTINEL,
              updatedAt: SERVER_TIMESTAMP_SENTINEL,
            }, idToken);
          } else {
            throw err;
          }
        }
      }

      revalidatePath("/website/orders");
      return { success: true, message: "Unpaid order marked as cancelled." };
    }

    if (currentStatus === "payment_captured_unsettled") {
      const res = await refundOrder(
        auth.uid,
        tenantBusinessId,
        orderId,
        `Order cancelled: ${reason}`,
        false,
        idToken
      );
      if (res.success) {
        if (useRest) {
          await restUpdateDoc(orderPath, {
            status: "cancelled",
            cancelReason: reason,
            cancelledAt: SERVER_TIMESTAMP_SENTINEL,
          }, idToken);
        } else {
          try {
            await orderRef.update({
              status: "cancelled",
              cancelReason: reason,
              cancelledAt: FieldValue.serverTimestamp(),
            });
          } catch (err: any) {
            if (isPermissionDeniedError(err)) {
              await restUpdateDoc(orderPath, {
                status: "cancelled",
                cancelReason: reason,
                cancelledAt: SERVER_TIMESTAMP_SENTINEL,
              }, idToken);
            } else {
              throw err;
            }
          }
        }
        revalidatePath("/website/orders");
        return { success: true, message: "Stalled order cancelled and customer refunded." };
      }
      return { success: false, error: res.error || "REFUND_FAILED" };
    }

    // Handle COD / Offline processing order cancellation (no Razorpay payment, restore stock directly)
    if (
      (currentStatus === "paid" || currentStatus === "processing") &&
      !orderData!.razorpayPaymentId
    ) {
      const nowIso = new Date().toISOString();
      const existingHistory = Array.isArray(orderData!.statusHistory) ? orderData!.statusHistory : [];
      const shouldRestoreCodStock = Boolean(orderData!.stockDeducted);
      const cancelPayload = {
        status: "cancelled",
        cancelReason: reason || "Cancelled by merchant",
        stockDeducted: false,
        statusHistory: [
          ...existingHistory,
          {
            status: "cancelled",
            previousStatus: currentStatus,
            changedBy: auth.uid,
            changedAt: nowIso,
            note: reason || "Offline/COD order cancelled and stock restored.",
          },
        ],
      };

      const cancelOfflineViaRest = async () => {
        const ops: Parameters<typeof restCommit>[0] = [];
        if (shouldRestoreCodStock && Array.isArray(orderData!.items)) {
          for (const item of orderData!.items) {
            if (item.productId && item.quantity > 0) {
              ops.push({
                type: "update",
                path: `businesses/${tenantBusinessId}/products/${item.productId}`,
                data: {
                  stock: incrementSentinel(item.quantity),
                  updatedAt: SERVER_TIMESTAMP_SENTINEL,
                },
              });
            }
          }
        }
        ops.push({
          type: "update",
          path: orderPath,
          data: {
            ...cancelPayload,
            cancelledAt: SERVER_TIMESTAMP_SENTINEL,
            updatedAt: SERVER_TIMESTAMP_SENTINEL,
          },
        });
        await restCommit(ops, idToken);
      };

      if (useRest) {
        await cancelOfflineViaRest();
      } else {
        try {
          await db.runTransaction(async (tx) => {
            if (shouldRestoreCodStock && Array.isArray(orderData!.items)) {
              for (const item of orderData!.items) {
                if (item.productId && item.quantity > 0) {
                  tx.update(
                    db.doc(`businesses/${tenantBusinessId}/products/${item.productId}`),
                    {
                      stock: FieldValue.increment(item.quantity),
                      updatedAt: FieldValue.serverTimestamp(),
                    }
                  );
                }
              }
            }
            tx.update(orderRef, {
              ...cancelPayload,
              cancelledAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });
          });
        } catch (err: any) {
          if (isPermissionDeniedError(err)) {
            await cancelOfflineViaRest();
          } else {
            throw err;
          }
        }
      }

      revalidatePath("/website/orders");
      return {
        success: true,
        message: shouldRestoreCodStock
          ? "Order cancelled and reserved inventory restored."
          : "Order marked as cancelled.",
      };
    }

    if (currentStatus === "paid" || currentStatus === "processing") {
      const res = await refundOrder(
        auth.uid,
        tenantBusinessId,
        orderId,
        `Order cancelled: ${reason}`,
        true,
        idToken
      );
      if (res.success) {
        if (useRest) {
          await restUpdateDoc(orderPath, {
            status: "cancelled",
            cancelReason: reason,
            cancelledAt: SERVER_TIMESTAMP_SENTINEL,
          }, idToken);
        } else {
          try {
            await orderRef.update({
              status: "cancelled",
              cancelReason: reason,
              cancelledAt: FieldValue.serverTimestamp(),
            });
          } catch (err: any) {
            if (isPermissionDeniedError(err)) {
              await restUpdateDoc(orderPath, {
                status: "cancelled",
                cancelReason: reason,
                cancelledAt: SERVER_TIMESTAMP_SENTINEL,
              }, idToken);
            } else {
              throw err;
            }
          }
        }
        revalidatePath("/website/orders");
        return { success: true, message: "Order cancelled, inventory restored, and customer refunded." };
      }
      return { success: false, error: res.error || "REFUND_FAILED" };
    }

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
  const auth = await authenticateMerchantServer({
    userId,
    requestedBusinessId: businessId,
    idToken,
    allowedRoles: ["owner", "admin", "manager"],
  });
  if (!auth.authorized || !auth.businessId) {
    return { success: false, error: auth.error || "UNAUTHORIZED" };
  }

  const { db } = initializeAdmin();
  const customerPath = `businesses/${auth.businessId}/customers/${customerId}`;

  try {
    if (auth.useRestFallback) {
      const restSnap = await restGetDoc(customerPath, idToken);
      if (!restSnap.exists) return { success: false, error: "CUSTOMER_NOT_FOUND" };
      return { success: true, customer: { id: restSnap.id, ...restSnap.data() } };
    }

    try {
      const snap = await db.doc(customerPath).get();
      if (!snap.exists) {
        return { success: false, error: "CUSTOMER_NOT_FOUND" };
      }
      return {
        success: true,
        customer: { id: snap.id, ...snap.data() },
      };
    } catch (err: any) {
      if (isPermissionDeniedError(err)) {
        const restSnap = await restGetDoc(customerPath, idToken);
        if (!restSnap.exists) return { success: false, error: "CUSTOMER_NOT_FOUND" };
        return { success: true, customer: { id: restSnap.id, ...restSnap.data() } };
      }
      throw err;
    }
  } catch (err: any) {
    return { success: false, error: err.message || "FETCH_FAILED" };
  }
}
