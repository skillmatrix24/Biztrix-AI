'use server';

import { initializeAdmin } from '@/firebase/admin';
import {
  incrementSentinel,
  isPermissionDeniedError,
  restCommit,
  restGetDoc,
  restQueryCollection,
  restSetDoc,
  SERVER_TIMESTAMP_SENTINEL,
} from '@/firebase/firestore-rest';
import {
  computeStoreOrderPricing,
  createFunnelFromTemplate,
  evaluateCouponDiscount,
  isStorePubliclyVisible,
  matchesTrackOrderQuery,
  normalizeAnnouncementBar,
  normalizeFooterConfig,
  normalizeFunnelConfig,
  normalizeStoreCoupons,
  normalizeStorePolicyConfig,
  normalizeStoreShippingConfig,
  normalizeStoreThemeConfig,
  normalizeStoreTrackingConfig,
  sanitizeStoreSlug,
  sanitizeTrackedOrderSummary,
  StoreFunnelConfig,
  StoreFunnelTemplateId,
  TrackedOrderSummary,
  validateStorefrontLeadInput,
} from '@/lib/storefront-engine';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * @fileOverview Storefront Server Actions.
 * Handles secure order creation (Online / COD / WhatsApp) and visitor telemetry
 * for public customers with 3-tier persistence:
 * 1. Firebase Admin SDK (App Hosting / Service Account)
 * 2. Authenticated / Direct Firestore REST
 * 3. Server-validated Notification Relay (unauthenticated non-IAM preview fallback)
 */

export type StorePaymentMethod = 'ONLINE' | 'COD' | 'WHATSAPP';

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
  paymentMethod?: StorePaymentMethod;
  couponCode?: string;
  funnelId?: string;
  funnelSlug?: string;
  isPreview?: boolean;
  idToken?: string;
};

/**
 * SECURE ORDER CREATION NODE
 * Validates stock and pricing server-side before persisting the order.
 */
export async function createStorefrontOrder(input: StoreOrderInput) {
  const { db } = initializeAdmin();
  const {
    businessId,
    customerData,
    items,
    paymentMethod = 'ONLINE',
    isPreview = false,
    idToken,
  } = input;
  const cleanFunnelId = String(input.funnelId || '').trim();
  const cleanFunnelSlug = sanitizeStoreSlug(input.funnelSlug || '');

  if (!businessId || !items.length || !customerData.phone?.trim() || !customerData.name?.trim()) {
    return { success: false, error: 'Missing required customer or cart parameters.' };
  }

  try {
    // 1. Validate Business & Storefront / Funnel Live Status
    let bizData: Record<string, any> | undefined;
    let webData: Record<string, any> | undefined;
    let funnelData: Record<string, any> | undefined;
    let adminPermissionDenied = false;

    try {
      const reads: Array<Promise<any>> = [
        db.doc(`businesses/${businessId}`).get(),
        db.doc(`businesses/${businessId}/websites/main`).get(),
      ];
      if (cleanFunnelId && cleanFunnelId.startsWith('funnel_')) {
        reads.push(db.doc(`businesses/${businessId}/websites/${cleanFunnelId}`).get());
      }
      const [bizSnap, webSnap, funnelSnap] = await Promise.all(reads);
      if (!bizSnap.exists) return { success: false, error: 'Business node not found.' };
      bizData = bizSnap.data();
      webData = webSnap.exists ? webSnap.data() : {};
      funnelData = funnelSnap?.exists ? funnelSnap.data() : undefined;
    } catch (err: any) {
      if (isPermissionDeniedError(err)) {
        adminPermissionDenied = true;
        const restReads = [
          restGetDoc(`businesses/${businessId}`, idToken),
          restGetDoc(`businesses/${businessId}/websites/main`, idToken),
        ];
        if (cleanFunnelId && cleanFunnelId.startsWith('funnel_')) {
          restReads.push(restGetDoc(`businesses/${businessId}/websites/${cleanFunnelId}`, idToken));
        }
        const [restBiz, restWeb, restFunnel] = await Promise.all(restReads);
        if (!restBiz.exists) return { success: false, error: 'Business node not found.' };
        bizData = restBiz.data();
        webData = restWeb.exists ? restWeb.data() : {};
        funnelData = restFunnel?.exists ? restFunnel.data() : undefined;
      } else {
        throw err;
      }
    }

    const storeLive = isStorePubliclyVisible({
      websiteStatus: funnelData?.status || webData?.status,
      businessStatus: bizData?.status,
      isPreview,
    });

    if (!storeLive) {
      return { success: false, error: 'Storefront is currently in offline/draft mode.' };
    }

    if (paymentMethod === 'COD' && webData?.codEnabled === false) {
      return { success: false, error: 'Cash on Delivery is currently disabled for this store.' };
    }

    // 2. Authoritative Server-Side Price & Stock Validation
    let totalAmount = 0;
    const validatedItems: Array<{
      productId: string;
      name: string;
      quantity: number;
      price: number;
      lineTotal: number;
      sku: string;
    }> = [];

    for (const item of items) {
      const qty = Math.max(1, Math.floor(Number(item.quantity) || 0));
      const productPath = `businesses/${businessId}/products/${item.productId}`;
      let pData: Record<string, any> | undefined;

      if (adminPermissionDenied) {
        const restProd = await restGetDoc(productPath, idToken);
        if (!restProd.exists) {
          return { success: false, error: `Product ${item.productId} not found.` };
        }
        pData = restProd.data();
      } else {
        const productSnap = await db.doc(productPath).get();
        if (!productSnap.exists) {
          return { success: false, error: `Product ${item.productId} not found.` };
        }
        pData = productSnap.data();
      }

      if (!pData?.showOnWebsite || pData?.isArchived) {
        return { success: false, error: `Item "${pData?.name || 'Product'}" is no longer available online.` };
      }

      if ((pData?.stock || 0) < qty) {
        return {
          success: false,
          error: `Insufficient stock for "${pData?.name}". Available: ${pData?.stock || 0}`,
        };
      }

      const price =
        pData?.onlinePrice !== undefined && pData?.onlinePrice !== null
          ? Number(pData.onlinePrice)
          : Number(pData?.price) || 0;
      const lineTotal = price * qty;
      totalAmount += lineTotal;

      validatedItems.push({
        productId: item.productId,
        name: pData?.name || 'Product',
        quantity: qty,
        price,
        lineTotal,
        sku: pData?.sku || '',
      });
    }

    const subtotal = validatedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const normalizedCoupons = normalizeStoreCoupons(webData?.coupons);
    const normalizedShipping = normalizeStoreShippingConfig(webData?.shippingConfig);

    const pricing = computeStoreOrderPricing({
      subtotal,
      coupons: normalizedCoupons,
      couponCode: input.couponCode || null,
      shippingConfig: normalizedShipping,
      paymentMethod,
    });

    if (input.couponCode && input.couponCode.trim() && !pricing.appliedCouponCode) {
      return {
        success: false,
        error: pricing.couponMessage || 'The promo code could not be applied.',
      };
    }

    const finalAmount = pricing.grandTotal;
    const cleanPhone = customerData.phone.replace(/\D/g, '').slice(-10);
    let customerId = `c_${cleanPhone}`;
    const orderId = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    const baseOrderPayload = {
      id: orderId,
      businessId,
      customerId,
      customerData: {
        name: customerData.name.trim(),
        phone: customerData.phone.trim(),
        email: (customerData.email || '').trim(),
        address: (customerData.address || '').trim(),
      },
      items: validatedItems,
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      couponCode: pricing.appliedCouponCode,
      shippingFee: pricing.shippingFee,
      codFee: pricing.codFee,
      amount: finalAmount,
      paymentMethod,
      source: 'storefront',
      ...(cleanFunnelId ? { funnelId: cleanFunnelId } : {}),
      ...(cleanFunnelSlug ? { funnelSlug: cleanFunnelSlug } : {}),
    };

    // 3A. Primary Path: Firebase Admin SDK (Production App Hosting / ADC)
    if (!adminPermissionDenied) {
      const existingSnap = await db
        .collection(`businesses/${businessId}/customers`)
        .where('phone', '==', customerData.phone)
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        customerId = existingSnap.docs[0].id;
      }

      const isImmediateCodConfirm = paymentMethod === 'COD';
      const initialStatus = isImmediateCodConfirm ? 'processing' : 'created';

      await db.runTransaction(async (tx) => {
        if (isImmediateCodConfirm) {
          for (const item of validatedItems) {
            const pRef = db.doc(`businesses/${businessId}/products/${item.productId}`);
            const pSnap = await tx.get(pRef);
            if (!pSnap.exists || (pSnap.data()?.stock || 0) < item.quantity) {
              throw new Error(`INSUFFICIENT_STOCK:${item.name}`);
            }
          }
          for (const item of validatedItems) {
            const pRef = db.doc(`businesses/${businessId}/products/${item.productId}`);
            tx.update(pRef, {
              stock: FieldValue.increment(-item.quantity),
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        }

        const customerRef = db.doc(`businesses/${businessId}/customers/${customerId}`);
        tx.set(
          customerRef,
          {
            id: customerId,
            tenantId: businessId,
            name: customerData.name.trim(),
            phone: customerData.phone.trim(),
            normalizedPhone: cleanPhone,
            email: (customerData.email || '').trim(),
            address: (customerData.address || '').trim(),
            lastOrderDate: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        const orderRef = db.doc(`businesses/${businessId}/orders/${orderId}`);
        tx.set(orderRef, {
          ...baseOrderPayload,
          customerId,
          status: initialStatus,
          stockDeducted: isImmediateCodConfirm,
          settlementStatus: paymentMethod === 'COD' ? 'cod_pending' : 'pending',
          statusHistory: [
            {
              status: initialStatus,
              previousStatus: null,
              changedBy: 'storefront_checkout',
              changedAt: nowIso,
              note:
                paymentMethod === 'COD'
                  ? 'Cash on Delivery order placed and stock reserved.'
                  : paymentMethod === 'WHATSAPP'
                    ? 'WhatsApp order created via storefront.'
                    : 'Online checkout initiated.',
            },
          ],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      return {
        success: true,
        orderId,
        totalAmount: finalAmount,
        pricing,
        status: initialStatus,
      };
    }

    // 3B. Secondary Path: Firestore REST (succeeds directly when merchant/user idToken has write access)
    const isImmediateCodRest = Boolean(idToken && paymentMethod === 'COD');
    const restStatus = isImmediateCodRest ? 'processing' : 'created';
    try {
      if (idToken) {
        const existingCustomers = await restQueryCollection(
          `businesses/${businessId}`,
          'customers',
          { where: [{ field: 'phone', op: 'EQUAL', value: customerData.phone }], limit: 1 },
          idToken
        );
        if (existingCustomers.length > 0) {
          customerId = existingCustomers[0].id;
        }
      }

      const ops: Parameters<typeof restCommit>[0] = [
        {
          type: 'set',
          path: `businesses/${businessId}/customers/${customerId}`,
          merge: true,
          data: {
            id: customerId,
            tenantId: businessId,
            name: customerData.name.trim(),
            phone: customerData.phone.trim(),
            normalizedPhone: cleanPhone,
            email: (customerData.email || '').trim(),
            address: (customerData.address || '').trim(),
            lastOrderDate: SERVER_TIMESTAMP_SENTINEL,
            updatedAt: SERVER_TIMESTAMP_SENTINEL,
          },
        },
        {
          type: 'set',
          path: `businesses/${businessId}/orders/${orderId}`,
          data: {
            ...baseOrderPayload,
            customerId,
            status: restStatus,
            stockDeducted: isImmediateCodRest,
            settlementStatus: paymentMethod === 'COD' ? 'cod_pending' : 'pending',
            statusHistory: [
              {
                status: restStatus,
                previousStatus: null,
                changedBy: 'storefront_checkout',
                changedAt: nowIso,
                note:
                  paymentMethod === 'COD'
                    ? 'Cash on Delivery order placed via storefront.'
                    : paymentMethod === 'WHATSAPP'
                      ? 'WhatsApp order created via storefront.'
                      : 'Online checkout initiated.',
              },
            ],
            createdAt: SERVER_TIMESTAMP_SENTINEL,
            updatedAt: SERVER_TIMESTAMP_SENTINEL,
          },
        },
      ];

      if (isImmediateCodRest) {
        for (const item of validatedItems) {
          ops.push({
            type: 'update',
            path: `businesses/${businessId}/products/${item.productId}`,
            data: {
              stock: incrementSentinel(-item.quantity),
              updatedAt: SERVER_TIMESTAMP_SENTINEL,
            },
          });
        }
      }

      await restCommit(ops, idToken);
      return {
        success: true,
        orderId,
        totalAmount: finalAmount,
        pricing,
        status: restStatus,
      };
    } catch (restErr: any) {
      // 3C. Tertiary Path: Server-validated Notification Relay for unauthenticated preview shoppers
      if (paymentMethod === 'COD' || paymentMethod === 'WHATSAPP') {
        const notifId = `notif_ord_${orderId}`;
        await restSetDoc(`businesses/${businessId}/notifications/${notifId}`, {
          id: notifId,
          businessId,
          recipientId: bizData?.ownerId || 'owner',
          title: `New ${paymentMethod} Storefront Order (${orderId})`,
          message: `${customerData.name.trim()} (${customerData.phone.trim()}) placed an order worth ₹${finalAmount.toLocaleString()}.`,
          type: 'order',
          read: false,
          relayed: false,
          relayKind: 'storefront_order',
          orderPayload: {
            ...baseOrderPayload,
            customerId,
            status: 'created',
            stockDeducted: false,
            settlementStatus: paymentMethod === 'COD' ? 'cod_pending' : 'whatsapp_pending',
            createdAtIso: nowIso,
            statusHistory: [
              {
                status: 'created',
                previousStatus: null,
                changedBy: 'storefront_checkout',
                changedAt: nowIso,
                note: `${paymentMethod} order submitted by public shopper.`,
              },
            ],
          },
          createdAt: SERVER_TIMESTAMP_SENTINEL,
        });

        return {
          success: true,
          orderId,
          totalAmount: finalAmount,
          pricing,
          status: 'created',
          persistedVia: 'notification_relay',
        };
      }

      console.error('REST storefront order write blocked:', restErr);
      return {
        success: false,
        error:
          'Online gateway checkout requires Service Account IAM in production. Please use Cash on Delivery or Order via WhatsApp in preview.',
      };
    }
  } catch (err: any) {
    console.error('Critical Storefront Order Failure:', err);
    return {
      success: false,
      error: err.message?.startsWith('INSUFFICIENT_STOCK:')
        ? `Insufficient stock for ${err.message.split(':')[1]}`
        : 'System failed to establish order node.',
    };
  }
}

export type StorefrontEventInput = {
  businessId: string;
  eventName:
    | 'storefront_view'
    | 'page_view'
    | 'product_view'
    | 'add_to_cart'
    | 'remove_from_cart'
    | 'begin_checkout'
    | 'purchase'
    | 'whatsapp_order_click'
    | 'search'
    | 'product_share';
  data?: Record<string, any>;
  sessionId?: string;
  device?: 'mobile' | 'desktop';
  funnelId?: string;
  funnelSlug?: string;
  idToken?: string;
};

const EVENT_COUNTER_MAP: Record<string, string> = {
  storefront_view: 'totalStorefrontViews',
  page_view: 'totalStorefrontViews',
  product_view: 'totalProductViews',
  add_to_cart: 'totalAddToCart',
  remove_from_cart: 'totalRemoveFromCart',
  begin_checkout: 'totalBeginCheckout',
  purchase: 'totalPurchases',
  whatsapp_order_click: 'totalWhatsappClicks',
  search: 'totalSearches',
  product_share: 'totalShares',
};

/**
 * PHASE 9: AUTHORITATIVE STOREFRONT EVENT RECORDER
 */
export async function recordStorefrontEvent(input: StorefrontEventInput) {
  const { businessId, eventName, data = {}, sessionId, device, funnelId, funnelSlug, idToken } = input;
  const cleanFunnelId = String(funnelId || data?.funnelId || '').trim();
  const cleanFunnelSlug = sanitizeStoreSlug(funnelSlug || data?.funnelSlug || '');
  const enrichedData = {
    ...(data || {}),
    ...(cleanFunnelId ? { funnelId: cleanFunnelId } : {}),
    ...(cleanFunnelSlug ? { funnelSlug: cleanFunnelSlug } : {}),
  };

  if (!businessId || typeof businessId !== 'string') {
    return { success: false, error: 'Missing or invalid business identifier.' };
  }

  if (!(eventName in EVENT_COUNTER_MAP)) {
    return { success: false, error: 'Unsupported event name.' };
  }

  const eventId = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clientTimestamp = new Date().toISOString();
  const counterField = EVENT_COUNTER_MAP[eventName];

  try {
    const { db } = initializeAdmin();

    const bizSnap = await db.doc(`businesses/${businessId}`).get();
    if (!bizSnap.exists) {
      return { success: false, error: 'Tenant business node not found.' };
    }

    if (eventName === 'purchase') {
      const orderId = data?.orderId;
      if (!orderId) {
        return { success: false, error: 'Missing orderId for purchase event.' };
      }
      const orderSnap = await db.doc(`businesses/${businessId}/orders/${orderId}`).get();
      if (!orderSnap.exists) {
        return { success: false, error: 'Referenced order does not exist in tenant registry.' };
      }
      const orderStatus = orderSnap.data()?.status;
      const validStatuses = ['paid', 'processing', 'shipped', 'delivered', 'created'];
      if (!validStatuses.includes(orderStatus)) {
        return { success: false, error: `Invalid order state (${orderStatus}) for purchase analytics.` };
      }
    }

    await db.doc(`businesses/${businessId}/storefront_events/${eventId}`).set({
      id: eventId,
      businessId,
      eventName,
      data: enrichedData,
      ...(cleanFunnelId ? { funnelId: cleanFunnelId } : {}),
      ...(cleanFunnelSlug ? { funnelSlug: cleanFunnelSlug } : {}),
      sessionId: sessionId || 'anon',
      device: device || 'desktop',
      createdAt: FieldValue.serverTimestamp(),
      clientTimestamp,
    });

    if (counterField) {
      await db.doc(`businesses/${businessId}/storefront_analytics/summary`).set(
        {
          [counterField]: FieldValue.increment(1),
          lastEventAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    return { success: true, eventId };
  } catch (err: any) {
    if (!isPermissionDeniedError(err)) {
      console.error('Storefront event persistence error:', err);
      return { success: false, error: 'Internal telemetry pipeline exception.' };
    }

    // Fallback 1: Direct/Authenticated REST commit
    try {
      const bizRest = await restGetDoc(`businesses/${businessId}`, idToken);
      if (!bizRest.exists) {
        return { success: false, error: 'Tenant business node not found.' };
      }

      try {
        await restCommit(
          [
            {
              type: 'set',
              path: `businesses/${businessId}/storefront_events/${eventId}`,
              data: {
                id: eventId,
                businessId,
                eventName,
                data: enrichedData,
                ...(cleanFunnelId ? { funnelId: cleanFunnelId } : {}),
                ...(cleanFunnelSlug ? { funnelSlug: cleanFunnelSlug } : {}),
                sessionId: sessionId || 'anon',
                device: device || 'desktop',
                createdAt: SERVER_TIMESTAMP_SENTINEL,
                clientTimestamp,
              },
            },
            {
              type: 'set',
              path: `businesses/${businessId}/storefront_analytics/summary`,
              merge: true,
              data: {
                [counterField]: incrementSentinel(1),
                lastEventAt: SERVER_TIMESTAMP_SENTINEL,
                updatedAt: SERVER_TIMESTAMP_SENTINEL,
              },
            },
          ],
          idToken
        );
        return { success: true, eventId };
      } catch {
        // Fallback 2: Relay via notifications node when unauthenticated in non-IAM preview
        const notifId = `notif_ev_${eventId}`;
        await restSetDoc(`businesses/${businessId}/notifications/${notifId}`, {
          id: notifId,
          businessId,
          recipientId: bizRest.data()?.ownerId || 'owner',
          title: 'Storefront Telemetry Event',
          message: eventName,
          type: 'telemetry_relay',
          read: true,
          relayed: false,
          relayKind: 'storefront_event',
          eventPayload: {
            id: eventId,
            businessId,
            eventName,
            data: enrichedData,
            ...(cleanFunnelId ? { funnelId: cleanFunnelId } : {}),
            ...(cleanFunnelSlug ? { funnelSlug: cleanFunnelSlug } : {}),
            sessionId: sessionId || 'anon',
            device: device || 'desktop',
            clientTimestamp,
            counterField,
          },
          createdAt: SERVER_TIMESTAMP_SENTINEL,
        });
        return { success: true, eventId, persistedVia: 'notification_relay' };
      }
  } catch {
      return { success: false, error: 'Telemetry persistence skipped.' };
    }
  }
}

/**
 * PHASE 1: PUBLIC STOREFRONT COUPON VALIDATOR
 */
export async function validateStorefrontCoupon(params: {
  businessId: string;
  code: string;
  subtotal: number;
  idToken?: string;
}) {
  const { businessId, code, subtotal, idToken } = params;
  if (!businessId || !code?.trim()) {
    return { valid: false, discountAmount: 0, message: 'Enter a promo code to apply.' };
  }

  try {
    let webData: Record<string, any> = {};
    try {
      const { db } = initializeAdmin();
      const webSnap = await db.doc(`businesses/${businessId}/websites/main`).get();
      webData = webSnap.exists ? webSnap.data() || {} : {};
    } catch (err: any) {
      if (!isPermissionDeniedError(err)) throw err;
      const restSnap = await restGetDoc(`businesses/${businessId}/websites/main`, idToken);
      webData = restSnap.exists ? restSnap.data() || {} : {};
    }

    const coupons = normalizeStoreCoupons(webData.coupons);
    const res = evaluateCouponDiscount({ coupons, code, subtotal });
    return {
      valid: res.valid,
      discountAmount: res.discountAmount,
      code: res.coupon?.code || null,
      message: res.message,
    };
  } catch (err) {
    console.error('validateStorefrontCoupon error:', err);
    return { valid: false, discountAmount: 0, message: 'Unable to verify promo code right now.' };
  }
}

/**
 * PHASE 1: PUBLIC STOREFRONT ORDER TRACKER (PHONE + ORDER ID VERIFIED)
 */
export async function trackStorefrontOrder(params: {
  businessId: string;
  orderId: string;
  phone: string;
  idToken?: string;
}): Promise<{ success: boolean; order?: TrackedOrderSummary; error?: string; previewLimited?: boolean }> {
  const cleanBiz = (params.businessId || '').trim();
  const cleanQueryId = (params.orderId || '').trim();
  const cleanQueryPhone = (params.phone || '').trim();

  if (!cleanBiz || !cleanQueryId || cleanQueryPhone.replace(/\D/g, '').length < 6) {
    return {
      success: false,
      error: 'Please enter a valid Order ID and the phone number used at checkout.',
    };
  }

  const findMatch = (docs: Array<Record<string, any>>) =>
    docs.find((ord) =>
      matchesTrackOrderQuery({
        orderId: ord.id || '',
        orderPhone: ord.customerData?.phone || '',
        queryOrderId: cleanQueryId,
        queryPhone: cleanQueryPhone,
      })
    );

  try {
    let matchedOrder: Record<string, any> | undefined;
    let useRest = false;

    try {
      const { db } = initializeAdmin();
      // 1. Direct lookup if user entered full Order ID
      const exactSnap = await db.doc(`businesses/${cleanBiz}/orders/${cleanQueryId}`).get();
      if (exactSnap.exists) {
        const data = { id: exactSnap.id, ...exactSnap.data() };
        if (
          matchesTrackOrderQuery({
            orderId: data.id,
            orderPhone: (data as any).customerData?.phone || '',
            queryOrderId: cleanQueryId,
            queryPhone: cleanQueryPhone,
          })
        ) {
          matchedOrder = data;
        }
      }

      // 2. Fallback short-ID scan across recent storefront orders
      if (!matchedOrder) {
        const recentSnap = await db
          .collection(`businesses/${cleanBiz}/orders`)
          .where('source', '==', 'storefront')
          .limit(80)
          .get();
        const docs = recentSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        matchedOrder = findMatch(docs);
      }

      // 3. Also check unrelayed preview notifications if still in relay state
      if (!matchedOrder) {
        const relaySnap = await db
          .collection(`businesses/${cleanBiz}/notifications`)
          .where('relayKind', '==', 'storefront_order')
          .limit(30)
          .get();
        const relayOrders = relaySnap.docs
          .map((d) => d.data()?.orderPayload)
          .filter(Boolean);
        matchedOrder = findMatch(relayOrders);
      }
    } catch (adminErr: any) {
      if (!isPermissionDeniedError(adminErr)) throw adminErr;
      useRest = true;
    }

    if (useRest) {
      let restPermissionBlocked = false;
      try {
        const exactRest = await restGetDoc(
          `businesses/${cleanBiz}/orders/${cleanQueryId}`,
          params.idToken
        );
        if (exactRest.exists) {
          const data = { id: exactRest.id, ...exactRest.data() };
          if (
            matchesTrackOrderQuery({
              orderId: data.id,
              orderPhone: (data as any).customerData?.phone || '',
              queryOrderId: cleanQueryId,
              queryPhone: cleanQueryPhone,
            })
          ) {
            matchedOrder = data;
          }
        }

        if (!matchedOrder) {
          const recentDocs = await restQueryCollection(
            `businesses/${cleanBiz}`,
            'orders',
            {
              where: [{ field: 'source', op: 'EQUAL', value: 'storefront' }],
              limit: 80,
            },
            params.idToken
          );
          matchedOrder = findMatch(recentDocs);
        }

        if (!matchedOrder) {
          const relayDocs = await restQueryCollection(
            `businesses/${cleanBiz}`,
            'notifications',
            {
              where: [{ field: 'relayKind', op: 'EQUAL', value: 'storefront_order' }],
              limit: 30,
            },
            params.idToken
          );
          const relayOrders = relayDocs
            .map((d: any) => d.orderPayload)
            .filter(Boolean);
          matchedOrder = findMatch(relayOrders);
        }
      } catch (restErr: any) {
        if (isPermissionDeniedError(restErr)) {
          restPermissionBlocked = true;
        } else {
          throw restErr;
        }
      }

      if (!matchedOrder && restPermissionBlocked) {
        return {
          success: false,
          previewLimited: true,
          error:
            'No matching order found. Please check your Order ID and checkout phone number.',
        };
      }
    }

    if (!matchedOrder) {
      return {
        success: false,
        error: 'No matching order found. Please check your Order ID and checkout phone number.',
      };
    }

    return {
      success: true,
      order: sanitizeTrackedOrderSummary(matchedOrder),
    };
  } catch (err) {
    console.error('trackStorefrontOrder error:', err);
    return {
      success: false,
      error: 'Unable to track order right now. Please contact the store via WhatsApp.',
    };
  }
}

/**
 * PHASE 4: PUBLIC VIP DEAL ALERTS / RESTOCK OPT-IN LEAD CAPTURE
 */
export async function subscribeStorefrontLead(params: {
  businessId: string;
  name: string;
  contact: string;
  sourceSectionId?: string;
  funnelId?: string;
  funnelSlug?: string;
  idToken?: string;
}): Promise<{ success: boolean; message: string }> {
  const cleanBiz = (params.businessId || '').trim();
  if (!cleanBiz) {
    return { success: false, message: 'Store reference is missing.' };
  }

  const check = validateStorefrontLeadInput({
    name: params.name,
    contact: params.contact,
  });

  if (!check.valid || !check.cleanedContact || !check.contactType) {
    return { success: false, message: check.error || 'Please enter valid details.' };
  }

  const cleanName = params.name.trim().slice(0, 80);
  const leadId = `lead_${check.contactType === 'phone' ? check.cleanedContact : Buffer.from(check.cleanedContact).toString('hex').slice(0, 16)}`;
  const nowIso = new Date().toISOString();
  const cleanFunnelId = String(params.funnelId || '').trim();
  const cleanFunnelSlug = sanitizeStoreSlug(params.funnelSlug || '');

  const leadPayload = {
    id: leadId,
    businessId: cleanBiz,
    name: cleanName,
    contact: check.cleanedContact,
    contactType: check.contactType,
    phone: check.contactType === 'phone' ? check.cleanedContact : '',
    email: check.contactType === 'email' ? check.cleanedContact : '',
    source: cleanFunnelId ? 'funnel_lead_capture' : 'storefront_vip_alerts',
    sourceSectionId: (params.sourceSectionId || 'newsletter').slice(0, 64),
    ...(cleanFunnelId ? { funnelId: cleanFunnelId } : {}),
    ...(cleanFunnelSlug ? { funnelSlug: cleanFunnelSlug } : {}),
    subscribedAtIso: nowIso,
  };

  try {
    const { db } = initializeAdmin();
    try {
      const bizSnap = await db.doc(`businesses/${cleanBiz}`).get();
      if (!bizSnap.exists) {
        return { success: false, message: 'Storefront could not be verified.' };
      }

      await db
        .doc(`businesses/${cleanBiz}/storefront_leads/${leadId}`)
        .set(
          {
            ...leadPayload,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      const crmLeadId =
        check.contactType === 'phone' ? `crm_sf_${check.cleanedContact}` : `crm_sf_${leadId}`;
      await db
        .doc(`businesses/${cleanBiz}/leads/${crmLeadId}`)
        .set(
          {
            id: crmLeadId,
            tenantId: cleanBiz,
            name: cleanName,
            phone: check.contactType === 'phone' ? check.cleanedContact : check.cleanedContact,
            ...(check.contactType === 'phone' ? { normalizedPhone: check.cleanedContact } : {}),
            ...(check.contactType === 'email' ? { email: check.cleanedContact } : {}),
            source: cleanFunnelId ? 'Funnel' : 'Website',
            status: 'new',
            priority: 'Warm',
            interest: cleanFunnelSlug
              ? `Sales Funnel (${cleanFunnelSlug})`
              : 'Online Storefront VIP / Deal Inquiry',
            ...(cleanFunnelSlug ? { funnelSlug: cleanFunnelSlug } : {}),
            intentScore: cleanFunnelId ? 62 : 58,
            createdAt: nowIso.slice(0, 10),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      if (check.contactType === 'phone') {
        const customerId = `c_${check.cleanedContact}`;
        await db.doc(`businesses/${cleanBiz}/customers/${customerId}`).set(
          {
            id: customerId,
            tenantId: cleanBiz,
            name: cleanName,
            phone: check.cleanedContact,
            normalizedPhone: check.cleanedContact,
            source: cleanFunnelId ? 'funnel_lead_capture' : 'storefront_vip_alerts',
            vipAlertsOptIn: true,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      return {
        success: true,
        message: 'You are subscribed! Watch for exclusive offers and restock alerts.',
      };
    } catch (adminErr: any) {
      if (!isPermissionDeniedError(adminErr)) throw adminErr;
    }

    // Fallback: REST or notifications relay
    const bizRest = await restGetDoc(`businesses/${cleanBiz}`, params.idToken);
    if (!bizRest.exists) {
      return { success: false, message: 'Storefront could not be verified.' };
    }

    try {
      await restSetDoc(
        `businesses/${cleanBiz}/storefront_leads/${leadId}`,
        {
          ...leadPayload,
          createdAt: SERVER_TIMESTAMP_SENTINEL,
          updatedAt: SERVER_TIMESTAMP_SENTINEL,
        },
        params.idToken,
        { merge: true }
      );
      return {
        success: true,
        message: 'You are subscribed! Watch for exclusive offers and restock alerts.',
      };
    } catch {
      const notifId = `notif_lead_${leadId}_${Date.now()}`;
      await restSetDoc(`businesses/${cleanBiz}/notifications/${notifId}`, {
        id: notifId,
        businessId: cleanBiz,
        recipientId: bizRest.data()?.ownerId || 'owner',
        title: `New VIP Alert Subscriber: ${cleanName}`,
        message: `${check.contactType === 'phone' ? 'WhatsApp' : 'Email'}: ${check.cleanedContact}`,
        type: 'lead_relay',
        read: false,
        relayed: false,
        relayKind: 'storefront_lead',
        leadPayload,
        createdAt: SERVER_TIMESTAMP_SENTINEL,
      });

      return {
        success: true,
        message: 'You are subscribed! Watch for exclusive offers and restock alerts.',
      };
    }
  } catch (err) {
    console.error('subscribeStorefrontLead error:', err);
    return {
      success: false,
      message: 'Could not save your alert subscription right now. Please try again.',
    };
  }
}

/**
 * Resolves a public or preview Sales Funnel along with inherited Storefront settings.
 */
export async function getPublicFunnelData(params: {
  businessId: string;
  funnelId?: string;
  funnelSlug?: string;
  templateId?: string;
  isPreview?: boolean;
}): Promise<{
  funnel: StoreFunnelConfig | null;
  storeSettings: Record<string, any> | null;
  isPubliclyVisible: boolean;
}> {
  const cleanBiz = (params.businessId || '').trim();
  if (!cleanBiz) {
    return { funnel: null, storeSettings: null, isPubliclyVisible: false };
  }

  const targetId = (params.funnelId || '').trim();
  const targetSlug = sanitizeStoreSlug(params.funnelSlug || '');
  const cleanTemplate = (params.templateId || '').trim() as StoreFunnelTemplateId;

  let bizData: Record<string, any> | null = null;
  let mainWebData: Record<string, any> = {};
  let rawFunnelDoc: Record<string, any> | null = null;

  try {
    const { db } = initializeAdmin();
    try {
      const [bizSnap, mainSnap] = await Promise.all([
        db.doc(`businesses/${cleanBiz}`).get(),
        db.doc(`businesses/${cleanBiz}/websites/main`).get(),
      ]);
      bizData = bizSnap.exists ? bizSnap.data() || null : null;
      mainWebData = mainSnap.exists ? mainSnap.data() || {} : {};

      if (targetId) {
        const fSnap = await db.doc(`businesses/${cleanBiz}/websites/${targetId}`).get();
        if (fSnap.exists) rawFunnelDoc = { id: fSnap.id, ...fSnap.data() };
      } else if (targetSlug) {
        const fQuery = await db
          .collection(`businesses/${cleanBiz}/websites`)
          .where('kind', '==', 'funnel')
          .where('slug', '==', targetSlug)
          .limit(1)
          .get();
        if (!fQuery.empty) {
          rawFunnelDoc = { id: fQuery.docs[0].id, ...fQuery.docs[0].data() };
        }
      } else if (!cleanTemplate) {
        const fQuery = await db
          .collection(`businesses/${cleanBiz}/websites`)
          .where('kind', '==', 'funnel')
          .limit(5)
          .get();
        const docs: Array<Record<string, any> & { id: string }> = fQuery.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Record<string, any>),
        }));
        rawFunnelDoc = docs.find((d) => d.status === 'published') || docs[0] || null;
      }
    } catch (adminErr: any) {
      if (!isPermissionDeniedError(adminErr)) throw adminErr;
      const [restBiz, restMain] = await Promise.all([
        restGetDoc(`businesses/${cleanBiz}`),
        restGetDoc(`businesses/${cleanBiz}/websites/main`),
      ]);
      bizData = restBiz.exists ? restBiz.data() || null : null;
      mainWebData = restMain.exists ? restMain.data() || {} : {};

      if (targetId) {
        const fRest = await restGetDoc(`businesses/${cleanBiz}/websites/${targetId}`);
        if (fRest.exists) rawFunnelDoc = { id: fRest.id, ...fRest.data() };
      } else if (targetSlug) {
        const docs = await restQueryCollection(`businesses/${cleanBiz}`, 'websites', {
          where: [
            { field: 'kind', op: 'EQUAL', value: 'funnel' },
            { field: 'slug', op: 'EQUAL', value: targetSlug },
          ],
          limit: 1,
        });
        if (docs.length > 0) rawFunnelDoc = docs[0];
      } else if (!cleanTemplate) {
        const docs = await restQueryCollection(`businesses/${cleanBiz}`, 'websites', {
          where: [{ field: 'kind', op: 'EQUAL', value: 'funnel' }],
          limit: 5,
        });
        rawFunnelDoc = docs.find((d: any) => d.status === 'published') || docs[0] || null;
      }
    }
  } catch (err) {
    console.error('getPublicFunnelData error:', err);
  }

  let funnel: StoreFunnelConfig | null = null;
  if (rawFunnelDoc) {
    funnel = normalizeFunnelConfig(rawFunnelDoc, rawFunnelDoc.id || 'funnel_live');
  } else if (
    cleanTemplate === 'product_launch' ||
    cleanTemplate === 'combo_cod' ||
    cleanTemplate === 'lead_magnet'
  ) {
    funnel = createFunnelFromTemplate({
      templateId: cleanTemplate,
      id: `preview_${cleanTemplate}`,
    });
    if (params.isPreview) {
      funnel.status = 'published';
    }
  }

  const isVisible =
    Boolean(bizData) &&
    Boolean(funnel) &&
    isStorePubliclyVisible({
      websiteStatus: funnel?.status,
      businessStatus: bizData?.status,
      isPreview: Boolean(params.isPreview),
    });

  const normalizedStoreSettings = {
    storeName: mainWebData.storeName || bizData?.name || 'Online Store',
    slug: mainWebData.slug || bizData?.slug || '',
    logoUrl: mainWebData.logoUrl || bizData?.logoUrl || '',
    faviconUrl: mainWebData.faviconUrl || bizData?.faviconUrl || '',
    primaryColor: mainWebData.primaryColor || '#0C83B3',
    uiStyle: mainWebData.uiStyle || 'modern',
    contactPhone: mainWebData.contactPhone || bizData?.phone || '',
    contactEmail: mainWebData.contactEmail || bizData?.email || '',
    storeAddress: mainWebData.storeAddress || bizData?.address || '',
    whatsappOrderEnabled: mainWebData.whatsappOrderEnabled ?? true,
    codEnabled: mainWebData.codEnabled ?? true,
    showDiscount: mainWebData.showDiscount ?? true,
    coupons: normalizeStoreCoupons(mainWebData.coupons),
    shippingConfig: normalizeStoreShippingConfig(mainWebData.shippingConfig),
    themeConfig: normalizeStoreThemeConfig(mainWebData.themeConfig, mainWebData.uiStyle),
    announcementBar: normalizeAnnouncementBar(mainWebData.announcementBar),
    footerConfig: normalizeFooterConfig(mainWebData.footerConfig),
    trackingConfig: normalizeStoreTrackingConfig(mainWebData.trackingConfig),
    policyConfig: normalizeStorePolicyConfig(mainWebData.policyConfig),
  };

  return {
    funnel,
    storeSettings: normalizedStoreSettings,
    isPubliclyVisible: isVisible,
  };
}

