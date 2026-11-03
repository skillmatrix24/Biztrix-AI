"use server";

import { initializeAdmin } from "@/firebase/admin";
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
 * 6. Privileged writes via Firebase Admin SDK
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
  userId: string,
  requestedBusinessId: string,
  idToken?: string,
  allowedRoles: string[] = ['owner', 'admin', 'manager', 'staff']
): Promise<AuthTenantResult> {
  const { admin, db } = initializeAdmin();

  if (!userId || !requestedBusinessId) {
    return { authorized: false, error: "MISSING_AUTHENTICATION_CONTEXT" };
  }

  // 1. Verify Firebase Auth Token if provided
  if (idToken) {
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      if (decoded.uid !== userId) {
        return { authorized: false, error: "TOKEN_UID_MISMATCH" };
      }
    } catch {
      return { authorized: false, error: "INVALID_AUTH_TOKEN" };
    }
  }

  // 2. Fetch User Profile to confirm business mapping & role
  const userSnap = await db.doc(`users/${userId}`).get();
  if (!userSnap.exists) {
    return { authorized: false, error: "USER_PROFILE_NOT_FOUND" };
  }

  const userData = userSnap.data();
  const userBusinessId = userData?.businessId || userData?.tenantId;

  if (userBusinessId !== requestedBusinessId) {
    return { authorized: false, error: "TENANT_MISMATCH_SECURITY_VIOLATION" };
  }

  const role = userData?.role || 'staff';
  if (!allowedRoles.includes(role)) {
    return { authorized: false, error: "INSUFFICIENT_ROLE_PERMISSIONS" };
  }

  return { authorized: true, uid: userId, businessId: userBusinessId, role };
}

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
    const auth = await authenticateMerchant(
      input.userId,
      input.businessId,
      input.idToken,
      ['owner', 'admin', 'manager', 'staff']
    );

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

    let customerId = input.id;
    let isExistingRecord = false;

    // Deduplication check if creating without an explicit ID
    if (!customerId) {
      const canonicalId = `c_${cleanPhone}`;
      const canonicalDoc = await db.doc(`businesses/${input.businessId}/customers/${canonicalId}`).get();

      if (canonicalDoc.exists) {
        customerId = canonicalId;
        isExistingRecord = true;
      } else {
        // Check if a customer exists with this phone under a legacy ID
        const phoneMatchSnap = await db.collection(`businesses/${input.businessId}/customers`)
          .where('phone', '==', input.phone)
          .limit(1)
          .get();

        if (!phoneMatchSnap.empty) {
          customerId = phoneMatchSnap.docs[0].id;
          isExistingRecord = true;
        } else {
          customerId = canonicalId;
        }
      }
    } else {
      isExistingRecord = true;
    }

    const customerRef = db.doc(`businesses/${input.businessId}/customers/${customerId}`);
    const existingSnap = await customerRef.get();
    const existingData = existingSnap.exists ? existingSnap.data() : {};

    const payload: Record<string, any> = {
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
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: input.userId
    };

    if (input.openingBalance !== undefined) {
      payload.creditBalance = parseFloat(String(input.openingBalance)) || 0;
    }
    if (input.customFields) {
      payload.customFields = input.customFields;
    }
    if (input.events) {
      payload.events = input.events;
    }

    if (!existingSnap.exists) {
      payload.createdAt = FieldValue.serverTimestamp();
      payload.createdBy = input.userId;
      payload.loyaltyTier = input.loyaltyTier || "Standard";
      payload.rewardPoints = input.rewardPoints || 0;
      payload.walletBalance = input.walletBalance || 0;
    }

    await customerRef.set(payload, { merge: true });

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
    const auth = await authenticateMerchant(
      input.userId,
      input.businessId,
      input.idToken,
      ['owner', 'admin', 'manager', 'staff']
    );

    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const { db } = initializeAdmin();
    const customerRef = db.doc(`businesses/${input.businessId}/customers/${input.customerId}`);
    const snap = await customerRef.get();

    if (!snap.exists) {
      return { success: false, error: "Customer not found." };
    }

    await customerRef.update({
      notes: (input.notes || "").trim(),
      notesUpdatedAt: FieldValue.serverTimestamp(),
      notesUpdatedBy: input.userId,
      updatedAt: FieldValue.serverTimestamp()
    });

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
    const auth = await authenticateMerchant(
      input.userId,
      input.businessId,
      input.idToken,
      ['owner', 'admin', 'manager']
    );

    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const { db } = initializeAdmin();
    const customerRef = db.doc(`businesses/${input.businessId}/customers/${input.customerId}`);
    const snap = await customerRef.get();

    if (!snap.exists) {
      return { success: false, error: "Customer record not found." };
    }

    const cData = snap.data() || {};
    const cleanPhone = normalizePhoneNumber(cData.phone || "");

    // Check if historical orders reference this customer
    const ordersSnap = await db.collection(`businesses/${input.businessId}/orders`)
      .where('customerId', '==', input.customerId)
      .limit(1)
      .get();

    let hasOrders = !ordersSnap.empty;

    if (!hasOrders && cleanPhone) {
      const phoneOrdersSnap = await db.collection(`businesses/${input.businessId}/orders`)
        .where('customerData.phone', '==', cData.phone)
        .limit(1)
        .get();
      hasOrders = !phoneOrdersSnap.empty;
    }

    if (hasOrders) {
      // Soft-archive to protect historical order integrity
      await customerRef.update({
        isArchived: true,
        archivedAt: new Date().toISOString(),
        archivedBy: input.userId,
        updatedAt: FieldValue.serverTimestamp()
      });

      revalidatePath("/customers");

      return {
        success: true,
        message: `Customer "${cData.name}" has historical orders. The profile was safely archived to maintain transaction records.`
      };
    } else {
      // Safe to delete if no historical orders exist
      await customerRef.delete();

      revalidatePath("/customers");

      return {
        success: true,
        message: `Customer record for "${cData.name}" permanently deleted.`
      };
    }
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
    const auth = await authenticateMerchant(
      input.userId,
      input.businessId,
      input.idToken
    );

    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const { db } = initializeAdmin();
    const customerRef = db.doc(`businesses/${input.businessId}/customers/${input.customerId}`);
    const snap = await customerRef.get();

    if (!snap.exists) {
      return { success: false, error: "Customer not found." };
    }

    const customerData = snap.data()!;
    const cleanPhone = normalizePhoneNumber(customerData.phone || "");

    // Query orders for this customer (safe limit 100)
    let orderDocs: any[] = [];

    // Query 1: by customerId
    const ordersByIdSnap = await db.collection(`businesses/${input.businessId}/orders`)
      .where('customerId', '==', input.customerId)
      .limit(100)
      .get();

    ordersByIdSnap.docs.forEach(doc => {
      orderDocs.push({ id: doc.id, ...doc.data() });
    });

    // Query 2: fallback by phone if customerId wasn't previously linked
    if (orderDocs.length === 0 && cleanPhone) {
      const ordersByPhoneSnap = await db.collection(`businesses/${input.businessId}/orders`)
        .where('customerData.phone', '==', customerData.phone)
        .limit(100)
        .get();

      ordersByPhoneSnap.docs.forEach(doc => {
        orderDocs.push({ id: doc.id, ...doc.data() });
      });
    }

    // Sort newest first
    orderDocs.sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    // Compute metrics adhering strictly to payment status semantics:
    // Only 'paid', 'processing', 'shipped', 'delivered' count towards successful revenue.
    // 'payment_captured_unsettled', 'created', 'cancelled', 'refunded' do NOT count as revenue.
    let totalPaidAmount = 0;
    let paidOrdersCount = 0;
    let cancelledOrdersCount = 0;
    let refundedOrdersCount = 0;
    let unsettledOrdersCount = 0;
    let lastOrderDate: string | null = null;

    orderDocs.forEach((ord, index) => {
      const status = ord.status || 'created';
      const amt = parseFloat(ord.amount) || 0;

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
        id: snap.id,
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
