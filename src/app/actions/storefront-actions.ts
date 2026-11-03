
'use server';

import { initializeAdmin } from '@/firebase/admin';
import { 
  FieldValue
} from 'firebase-admin/firestore';

/**
 * @fileOverview Storefront Server Actions.
 * Handles secure order creation and data validation for public customers.
 * Hardened: Uses privileged Admin SDK to bypass restrictive firestore rules.
 */

export type StoreOrderInput = {
  businessId: string;
  customerData: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  items: {
    productId: string;
    quantity: number;
  }[];
};

/**
 * SECURE ORDER CREATION NODE
 * Validates stock and pricing server-side before persisting the order.
 * PRIVILEGED: Executed via Admin SDK.
 */
export async function createStorefrontOrder(input: StoreOrderInput) {
  const { db } = initializeAdmin();
  const { businessId, customerData, items } = input;

  if (!businessId || !items.length || !customerData.phone) {
    return { success: false, error: "Missing required order parameters." };
  }

  try {
    // 1. Validate Business Registry & Status
    const bizRef = db.doc(`businesses/${businessId}`);
    const bizSnap = await bizRef.get();
    if (!bizSnap.exists) return { success: false, error: "Business node not found." };
    
    const bizData = bizSnap.data();
    if (bizData?.status !== 'published' && bizData?.status !== 'active' && bizData?.status !== 'pro') {
      return { success: false, error: "Storefront is currently in offline/draft mode." };
    }

    // 2. Authoritative Price & Stock Validation
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const productRef = db.doc(`businesses/${businessId}/products/${item.productId}`);
      const productSnap = await productRef.get();
      
      if (!productSnap.exists) {
        return { success: false, error: `Product node ${item.productId} not found.` };
      }
      
      const pData = productSnap.data();
      
      // Security Check: Visibility
      if (!pData?.showOnWebsite) {
        return { success: false, error: `Item "${pData?.name}" is no longer available online.` };
      }
      
      // Integrity Check: Stock
      if ((pData?.stock || 0) < item.quantity) {
        return { success: false, error: `Insufficient stock for "${pData?.name}". Available: ${pData?.stock}` };
      }

      // Authoritative Pricing Node
      const price = pData?.onlinePrice || pData?.price || 0;
      const lineTotal = price * item.quantity;
      totalAmount += lineTotal;

      validatedItems.push({
        productId: item.productId,
        name: pData?.name,
        quantity: item.quantity,
        price: price,
        lineTotal: lineTotal,
        sku: pData?.sku || ""
      });
    }

    // 3. Customer Identity Sync (Unified Registry with Safe Deduplication)
    const cleanPhone = customerData.phone.replace(/\D/g, '').slice(-10);
    let customerId = `c_${cleanPhone}`;

    // Check if customer already exists with this phone under a legacy or custom ID
    const existingSnap = await db.collection(`businesses/${businessId}/customers`)
      .where('phone', '==', customerData.phone)
      .limit(1)
      .get();
      
    if (!existingSnap.empty) {
      customerId = existingSnap.docs[0].id;
    }

    const customerRef = db.doc(`businesses/${businessId}/customers/${customerId}`);
    
    await customerRef.set({
      id: customerId,
      tenantId: businessId,
      name: customerData.name,
      phone: customerData.phone,
      normalizedPhone: cleanPhone,
      email: customerData.email || "",
      address: customerData.address || "",
      lastOrderDate: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    // 4. Persistence: Create Order Node
    const orderId = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderRef = db.doc(`businesses/${businessId}/orders/${orderId}`);

    const orderData = {
      id: orderId,
      businessId,
      customerId,
      customerData: {
        name: customerData.name,
        phone: customerData.phone,
        email: customerData.email || "",
        address: customerData.address || ""
      },
      items: validatedItems,
      amount: totalAmount,
      status: 'created',
      source: 'storefront',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    await orderRef.set(orderData);

    return { 
      success: true, 
      orderId, 
      totalAmount 
    };
  } catch (err: any) {
    console.error("Critical Storefront Order Failure:", err);
    return { success: false, error: "System failed to establish order node." };
  }
}

export type StorefrontEventInput = {
  businessId: string;
  eventName: 
    | "storefront_view"
    | "product_view"
    | "add_to_cart"
    | "remove_from_cart"
    | "begin_checkout"
    | "purchase"
    | "whatsapp_order_click"
    | "search"
    | "product_share";
  data?: Record<string, any>;
  sessionId?: string;
  device?: "mobile" | "desktop";
};

/**
 * PHASE 9: AUTHORITATIVE STOREFRONT EVENT RECORDER
 * Validates tenant identity and persists bounded telemetry in the merchant's private subcollection.
 * Hardened: Uses Admin SDK, enforces strict validation, and rejects unverified purchase claims.
 */
export async function recordStorefrontEvent(input: StorefrontEventInput) {
  const { businessId, eventName, data = {}, sessionId, device } = input;
  
  if (!businessId || typeof businessId !== 'string') {
    return { success: false, error: "Missing or invalid business identifier." };
  }

  const validEvents = [
    "storefront_view",
    "product_view",
    "add_to_cart",
    "remove_from_cart",
    "begin_checkout",
    "purchase",
    "whatsapp_order_click",
    "search",
    "product_share"
  ];
  if (!validEvents.includes(eventName)) {
    return { success: false, error: "Unsupported event name." };
  }

  try {
    const { db } = initializeAdmin();

    // 1. Authoritative Business Node check
    const bizRef = db.doc(`businesses/${businessId}`);
    const bizSnap = await bizRef.get();
    if (!bizSnap.exists) {
      return { success: false, error: "Tenant business node not found." };
    }

    // 2. Authoritative check for purchase events:
    // Only count truly paid orders; reject created, payment_captured_unsettled, cancelled, or refunded
    if (eventName === "purchase") {
      const orderId = data?.orderId;
      if (!orderId) {
        return { success: false, error: "Missing orderId for purchase event." };
      }
      const orderSnap = await db.doc(`businesses/${businessId}/orders/${orderId}`).get();
      if (!orderSnap.exists) {
        return { success: false, error: "Referenced order does not exist in tenant registry." };
      }
      const orderStatus = orderSnap.data()?.status;
      const validPaidStatuses = ['paid', 'processing', 'shipped', 'delivered'];
      if (!validPaidStatuses.includes(orderStatus)) {
        return { success: false, error: `Invalid order state (${orderStatus}) for purchase analytics.` };
      }
    }

    // 3. Persist individual event record
    const eventId = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const eventRef = db.doc(`businesses/${businessId}/storefront_events/${eventId}`);
    
    await eventRef.set({
      id: eventId,
      businessId,
      eventName,
      data: data || {},
      sessionId: sessionId || "anon",
      device: device || "desktop",
      createdAt: FieldValue.serverTimestamp(),
      clientTimestamp: new Date().toISOString()
    });

    // 4. Update aggregated storefront analytics counter
    const summaryRef = db.doc(`businesses/${businessId}/storefront_analytics/summary`);
    const updateFieldMap: Record<string, string> = {
      storefront_view: "totalStorefrontViews",
      product_view: "totalProductViews",
      add_to_cart: "totalAddToCart",
      remove_from_cart: "totalRemoveFromCart",
      begin_checkout: "totalBeginCheckout",
      purchase: "totalPurchases",
      whatsapp_order_click: "totalWhatsappClicks",
      search: "totalSearches",
      product_share: "totalShares"
    };

    const counterField = updateFieldMap[eventName];
    if (counterField) {
      await summaryRef.set({
        [counterField]: FieldValue.increment(1),
        lastEventAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

    return { success: true, eventId };
  } catch (err: any) {
    console.error("Storefront event persistence error:", err);
    return { success: false, error: "Internal telemetry pipeline exception." };
  }
}

