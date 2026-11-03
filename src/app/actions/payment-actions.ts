'use server';
/**
 * @fileOverview Payment Recovery & Refund Engine (Phase 5).
 * Provides secure server-side logic for handling refunds and payment reconciliations.
 * Hardened: Uses privileged Admin SDK and isolated gateway secrets.
 */

import { initializeAdmin } from '@/firebase/admin';
import Razorpay from 'razorpay';
import { FieldValue } from 'firebase-admin/firestore';

export type RefundResult = {
  success: boolean;
  error?: string;
  refundId?: string;
};

/**
 * Core Razorpay Refund Engine (Phase 5).
 * Handles both unsettled stockout recovery and merchant-initiated order refunds.
 * Security: Validates Admin/Manager/Owner role and tenant ownership.
 * Hardened: Implements atomic pre-execution lock and gateway-level idempotency key.
 * Inventory: If restockItems is true and order was previously settled, restores product stock.
 */
export async function refundOrder(
  userId: string,
  businessId: string,
  orderId: string,
  reason: string = "Merchant initiated refund",
  restockItems: boolean = true
): Promise<RefundResult> {
  const { db } = initializeAdmin();

  try {
    // 1. Authorization Node
    const userRef = db.doc(`users/${userId}`);
    const userSnap = await userRef.get();
    const uData = userSnap.data();

    if (!userSnap.exists || uData?.businessId !== businessId) {
      return { success: false, error: "UNAUTHORIZED_TENANT_ACCESS" };
    }

    const role = (uData?.role || '').toLowerCase();
    if (!['admin', 'manager', 'owner'].includes(role)) {
      return { success: false, error: "INSUFFICIENT_PERMISSIONS" };
    }

    const orderRef = db.doc(`businesses/${businessId}/orders/${orderId}`);

    // 2. Atomic Pre-Lock Phase
    let orderData: any;
    try {
      orderData = await db.runTransaction(async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists) {
          throw new Error("ORDER_NOT_FOUND");
        }

        const data = orderSnap.data()!;
        
        if (data.status === 'refunded' || data.refundId) {
          throw new Error("REFUND_ALREADY_PROCESSED");
        }

        if (data.status === 'refund_pending') {
          throw new Error("REFUND_OPERATION_IN_PROGRESS");
        }

        const eligibleStatuses = ['payment_captured_unsettled', 'paid', 'processing', 'shipped', 'delivered'];
        if (!eligibleStatuses.includes(data.status)) {
          throw new Error(`ORDER_NOT_ELIGIBLE_FOR_REFUND (current status: ${data.status})`);
        }

        const paymentId = data.razorpayPaymentId;
        if (!paymentId) {
          throw new Error("PAYMENT_ID_MISSING");
        }

        // Acquire State Lock
        transaction.update(orderRef, {
          status: 'refund_pending',
          refundStartedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });

        return data;
      });
    } catch (e: any) {
      console.error("Lock Acquisition Failed:", e);
      return { success: false, error: e.message || "LOCK_ACQUISITION_FAILED" };
    }

    const paymentId = orderData.razorpayPaymentId;
    const previousStatus = orderData.status;

    // 3. Resolve Razorpay Credentials (Hardened Node)
    const gatewayQuery = await db.collection(`businesses/${businessId}/paymentGatewayConfigs`)
      .where('provider', '==', 'RAZORPAY')
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (gatewayQuery.empty) {
      await orderRef.update({ status: previousStatus });
      return { success: false, error: "GATEWAY_CONFIG_NOT_FOUND" };
    }

    const gatewayDocId = gatewayQuery.docs[0].id;
    const rzpConfig = gatewayQuery.docs[0].data();
    
    const privateRef = db.doc(`businesses/${businessId}/privateConfig/gateways`);
    const privateSnap = await privateRef.get();
    const privateData = privateSnap.exists ? privateSnap.data() : {};
    
    const secret = privateData?.[gatewayDocId]?.apiSecret;

    if (!secret) {
      await orderRef.update({ status: previousStatus });
      return { success: false, error: "GATEWAY_SECRET_MISSING" };
    }

    // 4. Execute Razorpay Refund Handshake
    const razorpay = new Razorpay({
      key_id: rzpConfig.apiKey,
      key_secret: secret,
    });

    const refundAmountPaise = Math.round((parseFloat(orderData.amount) || 0) * 100);

    try {
      // Use Order ID as idempotency key to protect against double-refund at the gateway level.
      const rzpRefund = await (razorpay.payments as any).refund(paymentId, {
        amount: refundAmountPaise,
        notes: {
          orderId,
          businessId,
          reason: reason || "BIZTRIX_MERCHANT_REFUND"
        }
      }, {
        'X-Razorpay-Idempotency-Key': orderId
      });

      // 5. Atomic State Finalization
      await db.runTransaction(async (transaction) => {
        // Restock inventory if items were previously settled
        const wasStockDeducted = ['paid', 'processing', 'shipped'].includes(previousStatus);
        if (restockItems && wasStockDeducted && Array.isArray(orderData.items)) {
          for (const item of orderData.items) {
            if (item.productId && item.quantity > 0) {
              const productRef = db.doc(`businesses/${businessId}/products/${item.productId}`);
              transaction.update(productRef, {
                stock: FieldValue.increment(item.quantity),
                updatedAt: FieldValue.serverTimestamp()
              });
            }
          }
        }

        const nowIso = new Date().toISOString();
        const historyEntry = {
          status: 'refunded',
          previousStatus: previousStatus,
          changedBy: userId,
          changedAt: nowIso,
          note: reason,
          refundId: rzpRefund.id,
          restocked: Boolean(restockItems && wasStockDeducted)
        };

        const existingHistory = Array.isArray(orderData.statusHistory) ? orderData.statusHistory : [];

        transaction.update(orderRef, {
          status: 'refunded',
          refundId: rzpRefund.id,
          refundedAmount: orderData.amount,
          refundedAt: FieldValue.serverTimestamp(),
          recoveryReason: reason,
          requiresManualReview: false,
          updatedAt: FieldValue.serverTimestamp(),
          statusHistory: [...existingHistory, historyEntry]
        });

        const paymentRef = db.doc(`businesses/${businessId}/payments/${paymentId}`);
        transaction.set(paymentRef, {
          status: 'refunded',
          refundId: rzpRefund.id,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      });

      return { success: true, refundId: rzpRefund.id };

    } catch (apiErr: any) {
      console.error("Razorpay Refund API Failure:", apiErr);
      await orderRef.update({ 
        status: previousStatus,
        lastRefundError: apiErr.message || "GATEWAY_REJECTION",
        updatedAt: FieldValue.serverTimestamp()
      });
      return { success: false, error: apiErr.message || "INTERNAL_GATEWAY_ERROR" };
    }

  } catch (err: any) {
    console.error("Critical Refund Failure:", err);
    return { success: false, error: err.message || "INTERNAL_SERVER_ERROR" };
  }
}

/**
 * Executes a Razorpay refund for an order that could not be settled (e.g. stock out).
 * Boundary: Server-only.
 * Preserves existing contract while delegating to hardened refundOrder engine.
 */
export async function refundUnsettledOrder(
  userId: string,
  businessId: string,
  orderId: string,
  reason: string = "Stock unavailable at settlement"
): Promise<RefundResult> {
  // Stock was never deducted for unsettled orders, so restockItems is false
  return refundOrder(userId, businessId, orderId, reason, false);
}

/**
 * Manually retries inventory settlement for a "Charged but Unsettled" order.
 * Transitions order to 'paid' and updates inventory atomically.
 */
export async function settleUnsettledOrder(
  userId: string,
  businessId: string,
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const { db } = initializeAdmin();

  try {
    // 1. Authorization
    const userSnap = await db.doc(`users/${userId}`).get();
    const uData = userSnap.data();
    if (!userSnap.exists || uData?.businessId !== businessId) {
      return { success: false, error: "UNAUTHORIZED" };
    }

    const orderRef = db.doc(`businesses/${businessId}/orders/${orderId}`);

    // 2. Atomic Settlement Transaction
    return await db.runTransaction(async (transaction) => {
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists) throw new Error("ORDER_NOT_FOUND");
      
      const orderData = orderSnap.data()!;
      if (orderData.status !== 'payment_captured_unsettled') {
        throw new Error("ORDER_IN_INVALID_STATE_FOR_SETTLEMENT");
      }

      // A. Re-validate Stock for all items
      for (const item of orderData.items) {
        const productRef = db.doc(`businesses/${businessId}/products/${item.productId}`);
        const productSnap = await transaction.get(productRef);
        const pData = productSnap.data();

        if (!productSnap.exists || (pData?.stock || 0) < item.quantity) {
          throw new Error(`INSUFFICIENT_STOCK: ${item.name}`);
        }
      }

      // B. Deduct Stock
      for (const item of orderData.items) {
        const productRef = db.doc(`businesses/${businessId}/products/${item.productId}`);
        transaction.update(productRef, { 
          stock: FieldValue.increment(-item.quantity),
          updatedAt: FieldValue.serverTimestamp()
        });
      }

      // C. Finalize Order & Payment status
      const nowIso = new Date().toISOString();
      const historyEntry = {
        status: 'paid',
        previousStatus: 'payment_captured_unsettled',
        changedBy: userId,
        changedAt: nowIso,
        note: "Manual settlement retry: inventory deducted and payment confirmed settled."
      };
      const existingHistory = Array.isArray(orderData.statusHistory) ? orderData.statusHistory : [];

      transaction.update(orderRef, {
        status: 'paid',
        settlementStatus: 'success',
        requiresManualReview: false,
        recoveredAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        statusHistory: [...existingHistory, historyEntry]
      });

      const paymentId = orderData.razorpayPaymentId;
      if (paymentId) {
        const paymentRef = db.doc(`businesses/${businessId}/payments/${paymentId}`);
        transaction.update(paymentRef, {
          status: 'captured',
          settledAt: FieldValue.serverTimestamp()
        });
      }

      return { success: true };
    });
  } catch (err: any) {
    console.error("Manual Settlement Failure:", err);
    return { success: false, error: err.message };
  }
}
