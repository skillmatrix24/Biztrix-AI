'use server';
/**
 * @fileOverview Payment Recovery & Refund Engine (Phase 5).
 * Provides secure server-side logic for handling refunds and payment reconciliations.
 * Hardened: Uses privileged Admin SDK with authenticated Firestore REST fallback and verified ID tokens.
 */

import { initializeAdmin } from '@/firebase/admin';
import {
  incrementSentinel,
  isPermissionDeniedError,
  restCommit,
  restGetDoc,
  restQueryCollection,
  restUpdateDoc,
  SERVER_TIMESTAMP_SENTINEL,
} from '@/firebase/firestore-rest';
import { authenticateMerchantServer } from '@/firebase/server-auth';
import {
  buildStorefrontCashbookEntry,
  determineRefundRestockEligibility,
} from '@/lib/storefront-engine';
import Razorpay from 'razorpay';
import { FieldValue } from 'firebase-admin/firestore';

export type RefundResult = {
  success: boolean;
  error?: string;
  refundId?: string;
};

/**
 * Core Razorpay Refund Engine (Phase 5).
 */
export async function refundOrder(
  userId: string,
  businessId: string,
  orderId: string,
  reason: string = "Merchant initiated refund",
  restockItems: boolean = true,
  idToken?: string
): Promise<RefundResult> {
  const { db } = initializeAdmin();

  try {
    // 1. Authorization Node
    const auth = await authenticateMerchantServer({
      userId,
      requestedBusinessId: businessId,
      idToken,
      allowedRoles: ['admin', 'manager', 'owner'],
    });

    if (!auth.authorized) {
      return { success: false, error: auth.error === 'INSUFFICIENT_ROLE_PERMISSIONS' ? 'INSUFFICIENT_PERMISSIONS' : 'UNAUTHORIZED_TENANT_ACCESS' };
    }

    const orderPath = `businesses/${businessId}/orders/${orderId}`;
    const orderRef = db.doc(orderPath);
    let useRest = Boolean(auth.useRestFallback);

    // 2. Atomic Pre-Lock Phase
    let orderData: any;
    const acquireRestLock = async () => {
      const orderSnap = await restGetDoc(orderPath, idToken);
      if (!orderSnap.exists) throw new Error("ORDER_NOT_FOUND");
      const data = orderSnap.data()!;
      if (data.status === 'refunded' || data.refundId) throw new Error("REFUND_ALREADY_PROCESSED");
      if (data.status === 'refund_pending') throw new Error("REFUND_OPERATION_IN_PROGRESS");
      const eligibleStatuses = ['payment_captured_unsettled', 'paid', 'processing', 'shipped', 'delivered'];
      if (!eligibleStatuses.includes(data.status)) {
        throw new Error(`ORDER_NOT_ELIGIBLE_FOR_REFUND (current status: ${data.status})`);
      }
      if (data.status === 'payment_captured_unsettled' && !data.razorpayPaymentId) {
        throw new Error("PAYMENT_ID_MISSING");
      }

      await restCommit(
        [
          {
            type: 'update',
            path: orderPath,
            currentDocument: orderSnap.updateTime ? { updateTime: orderSnap.updateTime } : { exists: true },
            data: {
              status: 'refund_pending',
              refundStartedAt: SERVER_TIMESTAMP_SENTINEL,
              updatedAt: SERVER_TIMESTAMP_SENTINEL,
            },
          },
        ],
        idToken
      );
      return data;
    };

    try {
      if (useRest) {
        orderData = await acquireRestLock();
      } else {
        try {
          orderData = await db.runTransaction(async (transaction) => {
            const orderSnap = await transaction.get(orderRef);
            if (!orderSnap.exists) throw new Error("ORDER_NOT_FOUND");
            const data = orderSnap.data()!;
            if (data.status === 'refunded' || data.refundId) throw new Error("REFUND_ALREADY_PROCESSED");
            if (data.status === 'refund_pending') throw new Error("REFUND_OPERATION_IN_PROGRESS");
            const eligibleStatuses = ['payment_captured_unsettled', 'paid', 'processing', 'shipped', 'delivered'];
            if (!eligibleStatuses.includes(data.status)) {
              throw new Error(`ORDER_NOT_ELIGIBLE_FOR_REFUND (current status: ${data.status})`);
            }
            if (data.status === 'payment_captured_unsettled' && !data.razorpayPaymentId) {
              throw new Error("PAYMENT_ID_MISSING");
            }

            transaction.update(orderRef, {
              status: 'refund_pending',
              refundStartedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp()
            });

            return data;
          });
        } catch (err: any) {
          if (isPermissionDeniedError(err)) {
            useRest = true;
            orderData = await acquireRestLock();
          } else {
            throw err;
          }
        }
      }
    } catch (e: any) {
      return { success: false, error: e.message || "LOCK_ACQUISITION_FAILED" };
    }

    const paymentId = orderData.razorpayPaymentId as string | undefined;
    const previousStatus = orderData.status;

    const revertOrderStatus = async (extra?: Record<string, any>) => {
      if (useRest) {
        await restUpdateDoc(orderPath, { status: previousStatus, ...(extra || {}) }, idToken);
      } else {
        await orderRef.update({ status: previousStatus, ...(extra || {}) });
      }
    };

    // Offline COD / WhatsApp Refund Branch (no Razorpay Payment ID)
    if (!paymentId) {
      const manualRefundId = `offline_ref_${Date.now()}`;
      const { wasStockDeducted, shouldRestock } = determineRefundRestockEligibility({
        orderStatus: previousStatus,
        explicitRestock: restockItems,
      });
      const nowIso = new Date().toISOString();
      const historyEntry = {
        status: 'refunded',
        previousStatus,
        changedBy: auth.uid || userId,
        changedAt: nowIso,
        note: reason,
        refundId: manualRefundId,
        restocked: Boolean(shouldRestock && wasStockDeducted),
      };
      const existingHistory = Array.isArray(orderData.statusHistory) ? orderData.statusHistory : [];
      const wasMoneySettled = orderData.settlementStatus === 'success' || previousStatus === 'paid' || previousStatus === 'delivered';
      const cashbookId = `cb_ref_${orderId}`;
      const offlineModeLabel = orderData.paymentMethod === 'WHATSAPP' ? 'WhatsApp Refund' : 'Cash Refund';
      const cashbookEntry = buildStorefrontCashbookEntry({
        businessId,
        orderId,
        customerName: orderData.customerData?.name,
        amount: parseFloat(orderData.amount) || 0,
        direction: 'debit',
        paymentMode: offlineModeLabel,
        dateIso: nowIso,
        note: `Offline Refund ${manualRefundId} (${reason})`,
      });

      try {
        if (useRest) {
          const ops: Parameters<typeof restCommit>[0] = [];
          if (shouldRestock && wasStockDeducted && Array.isArray(orderData.items)) {
            for (const item of orderData.items) {
              if (item.productId && item.quantity > 0) {
                ops.push({
                  type: 'update',
                  path: `businesses/${businessId}/products/${item.productId}`,
                  data: {
                    stock: incrementSentinel(item.quantity),
                    updatedAt: SERVER_TIMESTAMP_SENTINEL,
                  },
                });
              }
            }
          }
          ops.push({
            type: 'update',
            path: orderPath,
            data: {
              status: 'refunded',
              refundId: manualRefundId,
              refundedAmount: orderData.amount,
              refundedAt: SERVER_TIMESTAMP_SENTINEL,
              recoveryReason: reason,
              requiresManualReview: false,
              updatedAt: SERVER_TIMESTAMP_SENTINEL,
              statusHistory: [...existingHistory, historyEntry],
            },
          });
          if (wasMoneySettled) {
            ops.push({
              type: 'set',
              path: `businesses/${businessId}/cashbook/${cashbookId}`,
              merge: true,
              data: {
                ...cashbookEntry,
                createdAt: SERVER_TIMESTAMP_SENTINEL,
              },
            });
          }
          await restCommit(ops, idToken);
        } else {
          await db.runTransaction(async (transaction) => {
            if (shouldRestock && wasStockDeducted && Array.isArray(orderData.items)) {
              for (const item of orderData.items) {
                if (item.productId && item.quantity > 0) {
                  const productRef = db.doc(`businesses/${businessId}/products/${item.productId}`);
                  transaction.update(productRef, {
                    stock: FieldValue.increment(item.quantity),
                    updatedAt: FieldValue.serverTimestamp(),
                  });
                }
              }
            }
            transaction.update(orderRef, {
              status: 'refunded',
              refundId: manualRefundId,
              refundedAmount: orderData.amount,
              refundedAt: FieldValue.serverTimestamp(),
              recoveryReason: reason,
              requiresManualReview: false,
              updatedAt: FieldValue.serverTimestamp(),
              statusHistory: [...existingHistory, historyEntry],
            });
            if (wasMoneySettled) {
              const cbRef = db.doc(`businesses/${businessId}/cashbook/${cashbookId}`);
              transaction.set(cbRef, {
                ...cashbookEntry,
                createdAt: FieldValue.serverTimestamp(),
              }, { merge: true });
            }
          });
        }
        return { success: true, refundId: manualRefundId };
      } catch (offlineErr: any) {
        await revertOrderStatus();
        return { success: false, error: offlineErr.message || "OFFLINE_REFUND_FAILED" };
      }
    }

    // 3. Resolve Razorpay Credentials
    let gatewayDocId = '';
    let rzpConfig: Record<string, any> = {};
    let secret: string | undefined;

    if (useRest) {
      const gwDocs = await restQueryCollection(
        `businesses/${businessId}`,
        'paymentGatewayConfigs',
        { where: [{ field: 'provider', value: 'RAZORPAY' }, { field: 'isActive', value: true }], limit: 1 },
        idToken
      );
      if (gwDocs.length === 0) {
        await revertOrderStatus();
        return { success: false, error: "GATEWAY_CONFIG_NOT_FOUND" };
      }
      gatewayDocId = gwDocs[0].id;
      rzpConfig = gwDocs[0];

      try {
        const privateSnap = await restGetDoc(`businesses/${businessId}/privateConfig/gateways`, idToken);
        secret = privateSnap.exists ? privateSnap.data()?.[gatewayDocId]?.apiSecret : undefined;
      } catch {
        // privateConfig is intentionally locked from client/REST reads
        secret = undefined;
      }
    } else {
      const gatewayQuery = await db.collection(`businesses/${businessId}/paymentGatewayConfigs`)
        .where('provider', '==', 'RAZORPAY')
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (gatewayQuery.empty) {
        await revertOrderStatus();
        return { success: false, error: "GATEWAY_CONFIG_NOT_FOUND" };
      }

      gatewayDocId = gatewayQuery.docs[0].id;
      rzpConfig = gatewayQuery.docs[0].data();

      const privateRef = db.doc(`businesses/${businessId}/privateConfig/gateways`);
      const privateSnap = await privateRef.get();
      const privateData = privateSnap.exists ? privateSnap.data() : {};
      secret = privateData?.[gatewayDocId]?.apiSecret;
    }

    if (!secret) {
      await revertOrderStatus();
      return { success: false, error: "GATEWAY_SECRET_MISSING" };
    }

    // 4. Execute Razorpay Refund Handshake
    const razorpay = new Razorpay({
      key_id: rzpConfig.apiKey,
      key_secret: secret,
    });

    const refundAmountPaise = Math.round((parseFloat(orderData.amount) || 0) * 100);

    try {
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

      const { wasStockDeducted, shouldRestock } = determineRefundRestockEligibility({
        orderStatus: previousStatus,
        explicitRestock: restockItems,
      });
      const nowIso = new Date().toISOString();
      const historyEntry = {
        status: 'refunded',
        previousStatus: previousStatus,
        changedBy: auth.uid || userId,
        changedAt: nowIso,
        note: reason,
        refundId: rzpRefund.id,
        restocked: Boolean(shouldRestock && wasStockDeducted)
      };
      const existingHistory = Array.isArray(orderData.statusHistory) ? orderData.statusHistory : [];
      const cashbookId = `cb_ref_${orderId}`;
      const cashbookEntry = buildStorefrontCashbookEntry({
        businessId,
        orderId,
        customerName: orderData.customerData?.name,
        amount: parseFloat(orderData.amount) || 0,
        direction: 'debit',
        paymentMode: 'Razorpay Refund',
        dateIso: nowIso,
        note: `Refund ID: ${rzpRefund.id} (${reason})`,
      });

      if (useRest) {
        const ops: Parameters<typeof restCommit>[0] = [];
        if (shouldRestock && wasStockDeducted && Array.isArray(orderData.items)) {
          for (const item of orderData.items) {
            if (item.productId && item.quantity > 0) {
              ops.push({
                type: 'update',
                path: `businesses/${businessId}/products/${item.productId}`,
                data: {
                  stock: incrementSentinel(item.quantity),
                  updatedAt: SERVER_TIMESTAMP_SENTINEL,
                },
              });
            }
          }
        }
        ops.push({
          type: 'update',
          path: orderPath,
          data: {
            status: 'refunded',
            refundId: rzpRefund.id,
            refundedAmount: orderData.amount,
            refundedAt: SERVER_TIMESTAMP_SENTINEL,
            recoveryReason: reason,
            requiresManualReview: false,
            updatedAt: SERVER_TIMESTAMP_SENTINEL,
            statusHistory: [...existingHistory, historyEntry],
          },
        });
        ops.push({
          type: 'set',
          path: `businesses/${businessId}/payments/${paymentId}`,
          merge: true,
          data: {
            status: 'refunded',
            refundId: rzpRefund.id,
            updatedAt: SERVER_TIMESTAMP_SENTINEL,
          },
        });
        ops.push({
          type: 'set',
          path: `businesses/${businessId}/cashbook/${cashbookId}`,
          merge: true,
          data: {
            ...cashbookEntry,
            createdAt: SERVER_TIMESTAMP_SENTINEL,
          },
        });
        await restCommit(ops, idToken);
      } else {
        await db.runTransaction(async (transaction) => {
          if (shouldRestock && wasStockDeducted && Array.isArray(orderData.items)) {
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

          const cbRef = db.doc(`businesses/${businessId}/cashbook/${cashbookId}`);
          transaction.set(cbRef, {
            ...cashbookEntry,
            createdAt: FieldValue.serverTimestamp(),
          }, { merge: true });
        });
      }

      return { success: true, refundId: rzpRefund.id };

    } catch (apiErr: any) {
      console.error("Razorpay Refund API Failure:", apiErr);
      await revertOrderStatus({
        lastRefundError: apiErr.message || "GATEWAY_REJECTION",
        updatedAt: useRest ? SERVER_TIMESTAMP_SENTINEL : FieldValue.serverTimestamp(),
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
 */
export async function refundUnsettledOrder(
  userId: string,
  businessId: string,
  orderId: string,
  reason: string = "Stock unavailable at settlement",
  idToken?: string
): Promise<RefundResult> {
  return refundOrder(userId, businessId, orderId, reason, false, idToken);
}

/**
 * Manually retries inventory settlement for a "Charged but Unsettled" order.
 */
export async function settleUnsettledOrder(
  userId: string,
  businessId: string,
  orderId: string,
  idToken?: string
): Promise<{ success: boolean; error?: string }> {
  const { db } = initializeAdmin();

  try {
    const auth = await authenticateMerchantServer({
      userId,
      requestedBusinessId: businessId,
      idToken,
      allowedRoles: ['admin', 'manager', 'owner'],
    });

    if (!auth.authorized) {
      return { success: false, error: "UNAUTHORIZED" };
    }

    const orderPath = `businesses/${businessId}/orders/${orderId}`;
    const orderRef = db.doc(orderPath);

    const settleViaRest = async () => {
      const orderSnap = await restGetDoc(orderPath, idToken);
      if (!orderSnap.exists) throw new Error("ORDER_NOT_FOUND");

      const orderData = orderSnap.data()!;
      if (orderData.status !== 'payment_captured_unsettled') {
        throw new Error("ORDER_IN_INVALID_STATE_FOR_SETTLEMENT");
      }

      const ops: Parameters<typeof restCommit>[0] = [];
      for (const item of orderData.items || []) {
        const productPath = `businesses/${businessId}/products/${item.productId}`;
        const productSnap = await restGetDoc(productPath, idToken);
        const pData = productSnap.data();

        if (!productSnap.exists || (pData?.stock || 0) < item.quantity) {
          throw new Error(`INSUFFICIENT_STOCK: ${item.name}`);
        }

        ops.push({
          type: 'update',
          path: productPath,
          currentDocument: productSnap.updateTime ? { updateTime: productSnap.updateTime } : { exists: true },
          data: {
            stock: incrementSentinel(-item.quantity),
            updatedAt: SERVER_TIMESTAMP_SENTINEL,
          },
        });
      }

      const nowIso = new Date().toISOString();
      const historyEntry = {
        status: 'paid',
        previousStatus: 'payment_captured_unsettled',
        changedBy: auth.uid || userId,
        changedAt: nowIso,
        note: "Manual settlement retry: inventory deducted and payment confirmed settled."
      };
      const existingHistory = Array.isArray(orderData.statusHistory) ? orderData.statusHistory : [];

      ops.push({
        type: 'update',
        path: orderPath,
        currentDocument: orderSnap.updateTime ? { updateTime: orderSnap.updateTime } : { exists: true },
        data: {
          status: 'paid',
          settlementStatus: 'success',
          requiresManualReview: false,
          recoveredAt: SERVER_TIMESTAMP_SENTINEL,
          updatedAt: SERVER_TIMESTAMP_SENTINEL,
          statusHistory: [...existingHistory, historyEntry],
        },
      });

      const paymentId = orderData.razorpayPaymentId;
      if (paymentId) {
        ops.push({
          type: 'update',
          path: `businesses/${businessId}/payments/${paymentId}`,
          data: {
            status: 'captured',
            settledAt: SERVER_TIMESTAMP_SENTINEL,
          },
        });
      }

      const cbSettleId = `cb_ord_${orderId}`;
      const cbSettleEntry = buildStorefrontCashbookEntry({
        businessId,
        orderId,
        customerName: orderData.customerData?.name,
        amount: parseFloat(orderData.amount) || 0,
        direction: 'credit',
        paymentMode: 'Online (Razorpay)',
        dateIso: nowIso,
        note: paymentId ? `Razorpay ID: ${paymentId}` : 'Storefront Online Settlement',
      });
      ops.push({
        type: 'set',
        path: `businesses/${businessId}/cashbook/${cbSettleId}`,
        merge: true,
        data: {
          ...cbSettleEntry,
          createdAt: SERVER_TIMESTAMP_SENTINEL,
        },
      });

      await restCommit(ops, idToken);
      return { success: true };
    };

    if (auth.useRestFallback) {
      return await settleViaRest();
    }

    try {
      return await db.runTransaction(async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists) throw new Error("ORDER_NOT_FOUND");

        const orderData = orderSnap.data()!;
        if (orderData.status !== 'payment_captured_unsettled') {
          throw new Error("ORDER_IN_INVALID_STATE_FOR_SETTLEMENT");
        }

        for (const item of orderData.items) {
          const productRef = db.doc(`businesses/${businessId}/products/${item.productId}`);
          const productSnap = await transaction.get(productRef);
          const pData = productSnap.data();

          if (!productSnap.exists || (pData?.stock || 0) < item.quantity) {
            throw new Error(`INSUFFICIENT_STOCK: ${item.name}`);
          }
        }

        for (const item of orderData.items) {
          const productRef = db.doc(`businesses/${businessId}/products/${item.productId}`);
          transaction.update(productRef, {
            stock: FieldValue.increment(-item.quantity),
            updatedAt: FieldValue.serverTimestamp()
          });
        }

        const nowIso = new Date().toISOString();
        const historyEntry = {
          status: 'paid',
          previousStatus: 'payment_captured_unsettled',
          changedBy: auth.uid || userId,
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

        const cbSettleRef = db.doc(`businesses/${businessId}/cashbook/cb_ord_${orderId}`);
        const cbSettleEntry = buildStorefrontCashbookEntry({
          businessId,
          orderId,
          customerName: orderData.customerData?.name,
          amount: parseFloat(orderData.amount) || 0,
          direction: 'credit',
          paymentMode: 'Online (Razorpay)',
          dateIso: nowIso,
          note: paymentId ? `Razorpay ID: ${paymentId}` : 'Storefront Online Settlement',
        });
        transaction.set(cbSettleRef, {
          ...cbSettleEntry,
          createdAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        return { success: true };
      });
    } catch (err: any) {
      if (isPermissionDeniedError(err)) {
        return await settleViaRest();
      }
      throw err;
    }
  } catch (err: any) {
    console.error("Manual Settlement Failure:", err);
    return { success: false, error: err.message };
  }
}
