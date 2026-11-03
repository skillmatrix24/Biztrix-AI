"use client";

import { recordStorefrontEvent } from "@/app/actions/storefront-actions";

/**
 * PHASE 9: PRODUCTION-GRADE STOREFRONT CONVERSION & TRACKING ENGINE
 * 
 * Secure, non-blocking client-side telemetry:
 * 1. Dispatches standard e-commerce events:
 *    - storefront_view
 *    - product_view
 *    - add_to_cart
 *    - remove_from_cart
 *    - begin_checkout
 *    - purchase
 *    - whatsapp_order_click
 *    - search
 *    - product_share
 * 2. Scoped strictly to the tenant's businessId (prevents cross-tenant contamination)
 * 3. Bridges to existing browser pixels (Meta Pixel / Google Analytics) if active on the page
 * 4. Authoritatively persists events server-side using secure Admin SDK
 * 5. Non-blocking: failures never degrade customer shopping experience
 */

export type StorefrontEventName =
  | "storefront_view"
  | "product_view"
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "purchase"
  | "whatsapp_order_click"
  | "search"
  | "product_share";

export interface TrackEventPayload {
  businessId: string;
  eventName: StorefrontEventName;
  data?: Record<string, any>;
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "srv_sess";
  try {
    let sess = sessionStorage.getItem("biztrix_sess_id");
    if (!sess) {
      sess = `ss_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      sessionStorage.setItem("biztrix_sess_id", sess);
    }
    return sess;
  } catch {
    return `ss_${Date.now().toString(36)}`;
  }
}

function getDeviceType(): "mobile" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    ? "mobile"
    : "desktop";
}

export function trackStorefrontEvent({ businessId, eventName, data = {} }: TrackEventPayload) {
  if (!businessId || typeof window === "undefined") return;

  const sessionId = getOrCreateSessionId();
  const device = getDeviceType();

  try {
    // 1. Dispatch custom DOM event for potential merchant/third-party listeners
    const customEvent = new CustomEvent("biztrix:storefront_event", {
      detail: { 
        businessId, 
        eventName, 
        data, 
        sessionId,
        device,
        timestamp: new Date().toISOString() 
      }
    });
    window.dispatchEvent(customEvent);

    // 2. Dispatch to Meta Pixel (fbq) if initialized on merchant storefront
    const fbq = (window as any).fbq;
    if (typeof fbq === "function") {
      switch (eventName) {
        case "storefront_view":
          fbq("track", "PageView");
          break;
        case "product_view":
          fbq("track", "ViewContent", {
            content_name: data.name,
            content_ids: [data.id],
            content_type: "product",
            value: data.price,
            currency: data.currency || "INR"
          });
          break;
        case "add_to_cart":
          fbq("track", "AddToCart", {
            content_name: data.name,
            content_ids: [data.id],
            content_type: "product",
            value: (data.price || 0) * (data.quantity || 1),
            currency: data.currency || "INR"
          });
          break;
        case "remove_from_cart":
          fbq("trackCustom", "RemoveFromCart", {
            content_name: data.name,
            content_ids: [data.id],
            content_type: "product",
            value: data.price,
            currency: data.currency || "INR"
          });
          break;
        case "begin_checkout":
          fbq("track", "InitiateCheckout", {
            num_items: data.totalItems,
            value: data.totalPrice,
            currency: data.currency || "INR"
          });
          break;
        case "purchase":
          fbq("track", "Purchase", {
            value: data.amount,
            currency: data.currency || "INR",
            content_type: "product"
          });
          break;
        case "whatsapp_order_click":
          fbq("trackCustom", "WhatsAppOrderClick", {
            value: data.totalPrice || data.price || 0,
            currency: data.currency || "INR",
            context: data.context || "storefront"
          });
          break;
        case "search":
          fbq("track", "Search", {
            search_string: data.query
          });
          break;
        case "product_share":
          fbq("trackCustom", "Share", {
            content_name: data.name || data.storeName,
            content_type: data.id ? "product" : "store"
          });
          break;
      }
    }

    // 3. Dispatch to Google Analytics (gtag) if initialized
    const gtag = (window as any).gtag;
    if (typeof gtag === "function") {
      switch (eventName) {
        case "storefront_view":
          gtag("event", "page_view", {
            page_title: data.storeName || "Storefront",
            page_location: window.location.href,
            page_path: window.location.pathname
          });
          break;
        case "product_view":
          gtag("event", "view_item", {
            items: [{ item_id: data.id, item_name: data.name, price: data.price }]
          });
          break;
        case "add_to_cart":
          gtag("event", "add_to_cart", {
            items: [{ item_id: data.id, item_name: data.name, price: data.price, quantity: data.quantity || 1 }]
          });
          break;
        case "remove_from_cart":
          gtag("event", "remove_from_cart", {
            items: [{ item_id: data.id, item_name: data.name, price: data.price, quantity: data.quantity || 1 }]
          });
          break;
        case "begin_checkout":
          gtag("event", "begin_checkout", {
            value: data.totalPrice,
            currency: data.currency || "INR"
          });
          break;
        case "purchase":
          gtag("event", "purchase", {
            transaction_id: data.orderId,
            value: data.amount,
            currency: data.currency || "INR"
          });
          break;
        case "whatsapp_order_click":
          gtag("event", "whatsapp_click", {
            context: data.context || "storefront",
            value: data.totalPrice || data.price || 0,
            currency: data.currency || "INR"
          });
          break;
        case "search":
          gtag("event", "search", {
            search_term: data.query
          });
          break;
        case "product_share":
          gtag("event", "share", {
            method: data.method || "web_share",
            content_type: data.id ? "product" : "store",
            item_id: data.id
          });
          break;
      }
    }

    // 4. Server-Side Persistence Node: Non-blocking write to business tenant events collection
    recordStorefrontEvent({
      businessId,
      eventName,
      data,
      sessionId,
      device
    }).catch(serverErr => {
      // Non-blocking telemetry warning
      console.debug("[trackStorefrontEvent] Server event persistence notice:", serverErr);
    });

  } catch (err) {
    // Non-blocking telemetry failure should never degrade customer shopping experience
    console.debug("[trackStorefrontEvent] suppressed tracking exception:", err);
  }
}

