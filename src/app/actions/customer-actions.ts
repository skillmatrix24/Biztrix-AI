"use server";

import { initializeAdmin } from "@/firebase/admin";
import {
  isPermissionDeniedError,
  restDeleteDoc,
  restGetDoc,
  restQueryCollection,
  restSetDoc,
  restUpdateDoc,
  SERVER_TIMESTAMP_SENTINEL,
} from "@/firebase/firestore-rest";
import { authenticateMerchantServer } from "@/firebase/server-auth";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { normalizePhoneNumber } from "@/lib/utils";

/**
 * PHASE 7: PRODUCTION-GRADE CUSTOMER MANAGEMENT SERVER ACTIONS
 *
 * Enforces:
 * 1. User authentication & tenant isolation
 * 2. Role-based authorization (owner / admin / manager / staff)
 * 3. Deterministic customer deduplication (by normalized phone)
 * 4. Safe customer deletion (preserves historical order documents)
 * 5. Accurate customer metrics (paid vs unsettled vs refunded)
 * 6. Privileged writes via Firebase Admin SDK with authenticated Firestore REST fallback
 */

export interface SaveCustomerInput {
  userId: string;
  businessId: string;
  idToken?: string;
  id?: string; // If editing
  name: string;
  phone: string;
  email?: string;
  businessName?: string;
  customerType?: 'Regular' | 'VIP' | 'Wholesale' | 'Risky' | 'B2B';
  address?: string;
  state?: string;
  gstin?: string;
  openingBalance?: number;
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  whatsappNumber?: string;
  language?: string;
  communicationMode?: 'WhatsApp' | 'SMS' | 'Email';
  notes?: string;
  loyaltyTier?: string;
  rewardPoints?: number;
  walletBalance?: number;
  customFields?: Record<string, any>;
  events?: any[];
}

/**
 * Creates or updates a customer profile with deterministic deduplication.
 */
export async function saveCustomer(input: SaveCustomerInput) {
  try {
    const auth = await authenticateMerchantServer({
      userId: input.userId,
      requestedBusinessId: input.businessId,
      idToken: input.idToken,
      allowedRoles: ['owner', 'admin', 'manager', 'staff'],
    });

    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const { db } = initializeAdmin();
    const cleanPhone = normalizePhoneNumber(input.phone);
    const trimmedName = (input.name || "").trim();

    if (!trimmedName) {
      return { success: false, error: "Customer name is required." };
    }
    if (!cleanPhone) {
      return { success: false, error: "A valid mobile phone number is required." };
    }

    let useRest = Boolean(auth.useRestFallback);
    let customerId = input.id;
    let isExistingRecord = false;
    let existingData: Record<string, any> = {};
    let docExists = false;

    const resolveCustomerViaRest = async () => {
      if (!customerId) {
        const canonicalId = `c_${cleanPhone}`;
        const canonicalSnap = await restGetDoc(`businesses/${input.businessId}/customers/${canonicalId}`, input.idToken);
        if (canonicalSnap.exists) {
          customerId = canonicalId;
          isExistingRecord = true;
          docExists = true;
          existingData = canonicalSnap.data() || {};
        } else {
          const matches = await restQueryCollection(
            `businesses/${input.businessId}`,
            'customers',
            { where: [{ field: 'phone', value: input.phone }], limit: 1 },
            input.idToken
          );
          if (matches.length > 0) {
            customerId = matches[0].id;
            isExistingRecord = true;
            docExists = true;
            existingData = matches[0];
          } else {
            customerId = canonicalId;
          }
        }
      } else {
        isExistingRecord = true;
        const snap = await restGetDoc(`businesses/${input.businessId}/customers/${customerId}`, input.idToken);
        if (snap.exists) {
          docExists = true;
          existingData = snap.data() || {};
        }
      }
    };

    if (useRest) {
      await resolveCustomerViaRest();
    } else {
      try {
        if (!customerId) {
          const canonicalId = `c_${cleanPhone}`;
          const canonicalDoc = await db.doc(`businesses/${input.businessId}/customers/${canonicalId}`).get();

          if (canonicalDoc.exists) {
            customerId = canonicalId;
            isExistingRecord = true;
            docExists = true;
            existingData = canonicalDoc.data() || {};
          } else {
            const phoneMatchSnap = await db.collection(`businesses/${input.businessId}/customers`)
              .where('phone', '==', input.phone)
              .limit(1)
              .get();

            if (!phoneMatchSnap.empty) {
              customerId = phoneMatchSnap.docs[0].id;
              isExistingRecord = true;
              docExists = true;
              existingData = phoneMatchSnap.docs[0].data() || {};
            } else {
              customerId = canonicalId;
            }
          }
        } else {
          isExistingRecord = true;
          const existingSnap = await db.doc(`businesses/${input.businessId}/customers/${customerId}`).get();
          if (existingSnap.exists) {
            docExists = true;
            existingData = existingSnap.data() || {};
          }
        }
      } catch (err: any) {
        if (isPermissionDeniedError(err)) {
          useRest = true;
          await resolveCustomerViaRest();
        } else {
          throw err;
        }
      }
    }

    const basePayload: Record<string, any> = {
      id: customerId,
      tenantId: input.businessId,
      name: trimmedName,
      phone: input.phone.trim(),
      normalizedPhone: cleanPhone,
      email: (input.email || "").trim(),
      businessName: (input.businessName || "").trim(),
      customerType: input.customerType || existingData?.customerType || "Regular",
      address: (input.address || "").trim(),
      state: input.state || existingData?.state || "Maharashtra",
      gstin: (input.gstin || "").trim().toUpperCase(),
      dob: input.dob || "",
      gender: input.gender || "Prefer not to say",
      whatsappNumber: input.whatsappNumber || input.phone,
      language: input.language || "English",
      communicationMode: input.communicationMode || "WhatsApp",
      notes: input.notes !== undefined ? input.notes : (existingData?.notes || ""),
      updatedBy: input.userId
    };

    if (input.openingBalance !== undefined) {
      basePayload.creditBalance = parseFloat(String(input.openingBalance)) || 0;
    }
    if (input.customFields) {
      basePayload.customFields = input.customFields;
    }
    if (input.events) {
      basePayload.events = input.events;
    }

    if (input.loyaltyTier !== undefined) {
      basePayload.loyaltyTier = input.loyaltyTier;
    } else if (!docExists) {
      basePayload.loyaltyTier = "Standard";
    }

    if (input.rewardPoints !== undefined) {
      basePayload.rewardPoints = Number(input.rewardPoints) || 0;
    } else if (!docExists) {
      basePayload.rewardPoints = 0;
    }

    if (input.walletBalance !== undefined) {
      basePayload.walletBalance = Number(input.walletBalance) || 0;
    } else if (!docExists) {
      basePayload.walletBalance = 0;
    }

    if (!docExists) {
      basePayload.createdBy = input.userId;
    }

    const customerPath = `businesses/${input.businessId}/customers/${customerId}`;

    if (useRest) {
      const restPayload: Record<string, any> = {
        ...basePayload,
        updatedAt: SERVER_TIMESTAMP_SENTINEL,
      };
      if (!docExists) {
        restPayload.createdAt = SERVER_TIMESTAMP_SENTINEL;
      }
      await restSetDoc(customerPath, restPayload, input.idToken, { merge: true });
    } else {
      try {
        const adminPayload: Record<string, any> = {
          ...basePayload,
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (!docExists) {
          adminPayload.createdAt = FieldValue.serverTimestamp();
        }
        await db.doc(customerPath).set(adminPayload, { merge: true });
      } catch (err: any) {
        if (isPermissionDeniedError(err)) {
          const restPayload: Record<string, any> = {
            ...basePayload,
            updatedAt: SERVER_TIMESTAMP_SENTINEL,
          };
          if (!docExists) {
            restPayload.createdAt = SERVER_TIMESTAMP_SENTINEL;
          }
          await restSetDoc(customerPath, restPayload, input.idToken, { merge: true });
        } else {
          throw err;
        }
      }
    }

    revalidatePath("/customers");
    revalidatePath("/website/orders");

    return {
      success: true,
      customerId,
      message: isExistingRecord
        ? `Customer profile for "${trimmedName}" updated successfully.`
        : `Customer "${trimmedName}" registered successfully.`
    };
  } catch (err: any) {
    console.error("[saveCustomer] error:", err);
    return { success: false, error: err.message || "Failed to save customer profile." };
  }
}

/**
 * Updates merchant internal notes for a customer securely.
 */
export async function updateCustomerNotes(input: {
  userId: string;
  businessId: string;
  customerId: string;
  notes: string;
  idToken?: string;
}) {
  try {
    const auth = await authenticateMerchantServer({
      userId: input.userId,
      requestedBusinessId: input.businessId,
      idToken: input.idToken,
      allowedRoles: ['owner', 'admin', 'manager', 'staff'],
    });

    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const { db } = initializeAdmin();
    const customerPath = `businesses/${input.businessId}/customers/${input.customerId}`;
    const customerRef = db.doc(customerPath);
    const trimmedNotes = (input.notes || "").trim();

    if (auth.useRestFallback) {
      const snap = await restGetDoc(customerPath, input.idToken);
      if (!snap.exists) return { success: false, error: "Customer not found." };
      await restUpdateDoc(customerPath, {
        notes: trimmedNotes,
        notesUpdatedAt: SERVER_TIMESTAMP_SENTINEL,
        notesUpdatedBy: input.userId,
        updatedAt: SERVER_TIMESTAMP_SENTINEL,
      }, input.idToken);
    } else {
      try {
        const snap = await customerRef.get();
        if (!snap.exists) {
          return { success: false, error: "Customer not found." };
        }
        await customerRef.update({
          notes: trimmedNotes,
          notesUpdatedAt: FieldValue.serverTimestamp(),
          notesUpdatedBy: input.userId,
          updatedAt: FieldValue.serverTimestamp()
        });
      } catch (err: any) {
        if (isPermissionDeniedError(err)) {
          const snap = await restGetDoc(customerPath, input.idToken);
          if (!snap.exists) return { success: false, error: "Customer not found." };
          await restUpdateDoc(customerPath, {
            notes: trimmedNotes,
            notesUpdatedAt: SERVER_TIMESTAMP_SENTINEL,
            notesUpdatedBy: input.userId,
            updatedAt: SERVER_TIMESTAMP_SENTINEL,
          }, input.idToken);
        } else {
          throw err;
        }
      }
    }

    revalidatePath("/customers");

    return { success: true, message: "Customer notes updated successfully." };
  } catch (err: any) {
    console.error("[updateCustomerNotes] error:", err);
    return { success: false, error: err.message || "Failed to update customer notes." };
  }
}

/**
 * Safely removes or archives a customer record.
 * If historical orders exist, soft-archives the customer to preserve order integrity.
 */
export async function deleteCustomer(input: {
  userId: string;
  businessId: string;
  customerId: string;
  idToken?: string;
}) {
  try {
    const auth = await authenticateMerchantServer({
      userId: input.userId,
      requestedBusinessId: input.businessId,
      idToken: input.idToken,
      allowedRoles: ['owner', 'admin', 'manager'],
    });

    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const { db } = initializeAdmin();
    const customerPath = `businesses/${input.businessId}/customers/${input.customerId}`;
    const customerRef = db.doc(customerPath);

    let cData: Record<string, any> = {};
    let hasOrders = false;
    let useRest = Boolean(auth.useRestFallback);

    const runRestDelete = async () => {
      const snap = await restGetDoc(customerPath, input.idToken);
      if (!snap.exists) {
        return { notFound: true };
      }
      cData = snap.data() || {};
      const cleanPhone = normalizePhoneNumber(cData.phone || "");

      const ordersById = await restQueryCollection(
        `businesses/${input.businessId}`,
        'orders',
        { where: [{ field: 'customerId', value: input.customerId }], limit: 1 },
        input.idToken
      );
      hasOrders = ordersById.length > 0;

      if (!hasOrders && cleanPhone) {
        const phoneOrders = await restQueryCollection(
          `businesses/${input.businessId}`,
          'orders',
          { where: [{ field: 'customerData.phone', value: cData.phone }], limit: 1 },
          input.idToken
        );
        hasOrders = phoneOrders.length > 0;
      }

      if (hasOrders) {
        await restUpdateDoc(customerPath, {
          isArchived: true,
          archivedAt: new Date().toISOString(),
          archivedBy: input.userId,
          updatedAt: SERVER_TIMESTAMP_SENTINEL,
        }, input.idToken);
      } else {
        await restDeleteDoc(customerPath, input.idToken);
      }
      return { notFound: false };
    };

    if (useRest) {
      const res = await runRestDelete();
      if (res.notFound) return { success: false, error: "Customer record not found." };
    } else {
      try {
        const snap = await customerRef.get();
        if (!snap.exists) {
          return { success: false, error: "Customer record not found." };
        }

        cData = snap.data() || {};
        const cleanPhone = normalizePhoneNumber(cData.phone || "");

        const ordersSnap = await db.collection(`businesses/${input.businessId}/orders`)
          .where('customerId', '==', input.customerId)
          .limit(1)
          .get();

        hasOrders = !ordersSnap.empty;

        if (!hasOrders && cleanPhone) {
          const phoneOrdersSnap = await db.collection(`businesses/${input.businessId}/orders`)
            .where('customerData.phone', '==', cData.phone)
            .limit(1)
            .get();
          hasOrders = !phoneOrdersSnap.empty;
        }

        if (hasOrders) {
          await customerRef.update({
            isArchived: true,
            archivedAt: new Date().toISOString(),
            archivedBy: input.userId,
            updatedAt: FieldValue.serverTimestamp()
          });
        } else {
          await customerRef.delete();
        }
      } catch (err: any) {
        if (isPermissionDeniedError(err)) {
          const res = await runRestDelete();
          if (res.notFound) return { success: false, error: "Customer record not found." };
        } else {
          throw err;
        }
      }
    }

    revalidatePath("/customers");

    return {
      success: true,
      message: hasOrders
        ? `Customer "${cData.name}" has historical orders. The profile was safely archived to maintain transaction records.`
        : `Customer record for "${cData.name}" permanently deleted.`
    };
  } catch (err: any) {
    console.error("[deleteCustomer] error:", err);
    return { success: false, error: err.message || "Failed to process customer deletion." };
  }
}

/**
 * Fetches unified customer metrics and full order history server-side.
 */
export async function fetchCustomerDetailsAndOrders(input: {
  userId: string;
  businessId: string;
  customerId: string;
  idToken?: string;
}): Promise<{
  success: boolean;
  customer?: any;
  orders?: any[];
  stats?: any;
  error?: string;
}> {
  try {
    const auth = await authenticateMerchantServer({
      userId: input.userId,
      requestedBusinessId: input.businessId,
      idToken: input.idToken,
    });

    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const { db } = initializeAdmin();
    const customerPath = `businesses/${input.businessId}/customers/${input.customerId}`;
    let customerData: Record<string, any> | undefined;
    let orderDocs: any[] = [];

    const loadViaRest = async () => {
      const restSnap = await restGetDoc(customerPath, input.idToken);
      if (!restSnap.exists) {
        return { notFound: true };
      }
      customerData = restSnap.data()!;
      const cleanPhone = normalizePhoneNumber(customerData.phone || "");

      orderDocs = await restQueryCollection(
        `businesses/${input.businessId}`,
        'orders',
        { where: [{ field: 'customerId', value: input.customerId }], limit: 100 },
        input.idToken
      );

      if (orderDocs.length === 0 && cleanPhone) {
        orderDocs = await restQueryCollection(
          `businesses/${input.businessId}`,
          'orders',
          { where: [{ field: 'customerData.phone', value: customerData.phone }], limit: 100 },
          input.idToken
        );
      }
      return { notFound: false };
    };

    if (auth.useRestFallback) {
      const res = await loadViaRest();
      if (res.notFound) return { success: false, error: "Customer not found." };
    } else {
      try {
        const customerRef = db.doc(customerPath);
        const snap = await customerRef.get();

        if (!snap.exists) {
          return { success: false, error: "Customer not found." };
        }

        customerData = snap.data()!;
        const cleanPhone = normalizePhoneNumber(customerData.phone || "");

        const ordersByIdSnap = await db.collection(`businesses/${input.businessId}/orders`)
          .where('customerId', '==', input.customerId)
          .limit(100)
          .get();

        ordersByIdSnap.docs.forEach(doc => {
          orderDocs.push({ id: doc.id, ...doc.data() });
        });

        if (orderDocs.length === 0 && cleanPhone) {
          const ordersByPhoneSnap = await db.collection(`businesses/${input.businessId}/orders`)
            .where('customerData.phone', '==', customerData.phone)
            .limit(100)
            .get();

          ordersByPhoneSnap.docs.forEach(doc => {
            orderDocs.push({ id: doc.id, ...doc.data() });
          });
        }
      } catch (err: any) {
        if (isPermissionDeniedError(err)) {
          orderDocs = [];
          const res = await loadViaRest();
          if (res.notFound) return { success: false, error: "Customer not found." };
        } else {
          throw err;
        }
      }
    }

    orderDocs.sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    let totalPaidAmount = 0;
    let paidOrdersCount = 0;
    let cancelledOrdersCount = 0;
    let refundedOrdersCount = 0;
    let unsettledOrdersCount = 0;
    let lastOrderDate: string | null = null;

    orderDocs.forEach((ord, index) => {
      const status = ord.status || 'created';
      const isPaiseOrder = 
        Boolean(ord.tierId) || 
        ord.unit === "paise" || 
        (typeof ord.id === "string" && ord.id.startsWith("order_")) ||
        (typeof ord.razorpayOrderId === "string" && ord.razorpayOrderId === ord.id) ||
        Boolean(ord.amountInPaise && ord.amountInPaise === parseFloat(ord.amount));
      
      const rawAmt = parseFloat(ord.amount) || 0;
      const amt = isPaiseOrder ? rawAmt / 100 : rawAmt;

      if (index === 0) {
        lastOrderDate = ord.createdAt?.toDate ? ord.createdAt.toDate().toISOString() : ord.createdAt;
      }

      if (['paid', 'processing', 'shipped', 'delivered'].includes(status)) {
        paidOrdersCount++;
        totalPaidAmount += amt;
      } else if (status === 'cancelled') {
        cancelledOrdersCount++;
      } else if (['refunded', 'refund_pending'].includes(status)) {
        refundedOrdersCount++;
      } else if (status === 'payment_captured_unsettled') {
        unsettledOrdersCount++;
      }
    });

    const averageOrderValue = paidOrdersCount > 0 ? Math.round(totalPaidAmount / paidOrdersCount) : 0;

    return {
      success: true,
      customer: {
        id: input.customerId,
        ...customerData
      },
      orders: orderDocs,
      stats: {
        totalOrders: orderDocs.length,
        paidOrders: paidOrdersCount,
        cancelledOrders: cancelledOrdersCount,
        refundedOrders: refundedOrdersCount,
        unsettledOrders: unsettledOrdersCount,
        totalPaidAmount,
        averageOrderValue,
        lastOrderDate
      }
    };
  } catch (err: any) {
    console.error("[fetchCustomerDetailsAndOrders] error:", err);
    return { success: false, error: err.message || "Failed to fetch customer profile and orders." };
  }
}
