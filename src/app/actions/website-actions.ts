"use server";

import { promises as dns } from "dns";
import { initializeAdmin } from "@/firebase/admin";
import {
  incrementSentinel,
  isPermissionDeniedError,
  restCommit,
  restGetDoc,
  restQueryCollection,
  restSetDoc,
  restUpdateDoc,
  SERVER_TIMESTAMP_SENTINEL,
} from "@/firebase/firestore-rest";
import { authenticateMerchantServer } from "@/firebase/server-auth";
import {
  normalizeAnnouncementBar,
  normalizeFooterConfig,
  normalizeFunnelConfig,
  normalizeStoreCoupons,
  normalizeStorePolicyConfig,
  normalizeStoreSections,
  normalizeStoreShippingConfig,
  normalizeStoreThemeConfig,
  normalizeStoreTrackingConfig,
  sanitizeStoreSlug,
  StoreAnnouncementBar,
  StoreCoupon,
  StoreFooterConfig,
  StoreFunnelConfig,
  StorePolicyConfig,
  StoreShippingConfig,
  StoreThemeConfig,
  StoreTrackingConfig,
} from "@/lib/storefront-engine";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

/**
 * PHASE 4B: SECURE SERVER-SIDE CUSTOM DOMAIN VERIFICATION ENGINE
 *
 * Enforces:
 * 1. User authentication & tenant isolation (strict idToken required)
 * 2. Role authorization (owner/admin/manager)
 * 3. Domain format validation
 * 4. Authentic server-side DNS lookup (CNAME resolution)
 * 5. State persistence in businesses/{businessId}/websites/main (Admin SDK + REST fallback)
 */

const EXPECTED_CNAME_TARGET = "cname.biztrix.in";
const BIZTRIX_RESERVED_DOMAINS = ["biztrix.in", "biztrix.io", "biztrix.co"];

export interface DomainValidationResult {
  isValid: boolean;
  error?: string;
  cleanedDomain?: string;
}

/**
 * Validates domain format and disallows reserved platform domains.
 */
export async function validateDomainFormat(domain: string): Promise<DomainValidationResult> {
  if (!domain || typeof domain !== "string") {
    return { isValid: false, error: "Domain name is required." };
  }

  const sanitized = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  if (!sanitized) {
    return { isValid: false, error: "Domain name cannot be empty." };
  }

  const domainRegex = /^(?!:\/\/)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;
  if (!domainRegex.test(sanitized)) {
    return {
      isValid: false,
      error: "Invalid domain format. Please enter a valid domain like 'shop.yourbrand.com' or 'www.yourbrand.com'."
    };
  }

  if (BIZTRIX_RESERVED_DOMAINS.some(d => sanitized === d || sanitized.endsWith(`.${d}`))) {
    return {
      isValid: false,
      error: "Biztrix platform domains cannot be configured as custom storefront domains."
    };
  }

  return { isValid: true, cleanedDomain: sanitized };
}

interface AuthContext {
  uid: string;
  businessId: string;
  role: string;
  useRestFallback?: boolean;
}

/**
 * Authorizes user and resolves tenant context securely from the authenticated token.
 */
async function authenticateTenantUser(
  idToken?: string,
  requestedBusinessId?: string
): Promise<{ authorized: boolean; authContext?: AuthContext; error?: string }> {
  const auth = await authenticateMerchantServer({
    requestedBusinessId,
    idToken,
    allowedRoles: ["owner", "admin", "manager"],
    requireIdToken: true,
  });

  if (!auth.authorized || !auth.uid || !auth.businessId || !auth.role) {
    if (auth.error === "AUTHENTICATION_TOKEN_REQUIRED") {
      return { authorized: false, error: "Authentication required. Please sign in to manage domains." };
    }
    if (auth.error === "INSUFFICIENT_ROLE_PERMISSIONS") {
      return { authorized: false, error: "Permission denied: Only business administrators can manage custom domains." };
    }
    if (auth.error === "TENANT_MISMATCH_SECURITY_VIOLATION") {
      return { authorized: false, error: "Security violation: Tenant mismatch detected." };
    }
    return { authorized: false, error: auth.error || "Authentication session expired or invalid. Please refresh the page." };
  }

  return {
    authorized: true,
    authContext: {
      uid: auth.uid,
      businessId: auth.businessId,
      role: auth.role,
      useRestFallback: auth.useRestFallback,
    }
  };
}

/**
 * Checks DNS records for the domain using authentic Node.js DNS resolver.
 */
export async function checkDomainDns(domain: string): Promise<{
  isVerified: boolean;
  recordsFound: string[];
  errorMessage: string | null;
}> {
  const cleanDomain = domain.trim().toLowerCase();

  try {
    let cnameRecords: string[] = [];
    try {
      cnameRecords = await dns.resolveCname(cleanDomain);
    } catch (cnameErr: any) {
      if (cnameErr.code !== "ENODATA" && cnameErr.code !== "ENOTFOUND") {
        throw cnameErr;
      }
    }

    if (cnameRecords.length > 0) {
      const match = cnameRecords.some(r => {
        const normalized = r.toLowerCase().replace(/\.$/, "");
        return normalized === EXPECTED_CNAME_TARGET || normalized.endsWith(".biztrix.in");
      });

      if (match) {
        return {
          isVerified: true,
          recordsFound: cnameRecords,
          errorMessage: null,
        };
      } else {
        return {
          isVerified: false,
          recordsFound: cnameRecords,
          errorMessage: `DNS CNAME currently points to "${cnameRecords.join(', ')}", but must point to "${EXPECTED_CNAME_TARGET}".`,
        };
      }
    }

    try {
      const aRecords = await dns.resolve4(cleanDomain);
      if (aRecords.length > 0) {
        return {
          isVerified: false,
          recordsFound: aRecords.map(ip => `A: ${ip}`),
          errorMessage: `Domain currently resolves to IP address (${aRecords.join(', ')}). A CNAME record pointing to "${EXPECTED_CNAME_TARGET}" is required for storefront routing.`,
        };
      }
    } catch {
      // Ignore A record resolution errors
    }

    return {
      isVerified: false,
      recordsFound: [],
      errorMessage: `No CNAME record found pointing to "${EXPECTED_CNAME_TARGET}". Please ensure you added the DNS record with your domain provider and allowed time for DNS propagation.`,
    };
  } catch (error: any) {
    const code = error?.code || "UNKNOWN";
    if (code === "ENOTFOUND") {
      return {
        isVerified: false,
        recordsFound: [],
        errorMessage: `Domain not found in DNS registry (${code}). Please check domain spelling and ensure registrar registration is active.`,
      };
    }
    return {
      isVerified: false,
      recordsFound: [],
      errorMessage: `DNS resolution error (${code}): ${error?.message || "Lookup failed"}.`,
    };
  }
}

/**
 * Server Action: Verify custom domain DNS and update verification state.
 */
export async function verifyCustomDomain(params: {
  idToken?: string;
  businessId?: string;
}) {
  const auth = await authenticateTenantUser(params.idToken, params.businessId);
  if (!auth.authorized || !auth.authContext) {
    return { success: false, message: auth.error || "Unauthorized request." };
  }

  const { businessId, useRestFallback } = auth.authContext;
  const { db } = initializeAdmin();
  const websitePath = `businesses/${businessId}/websites/main`;
  const websiteRef = db.doc(websitePath);

  let websiteData: Record<string, any> | undefined;
  let useRest = Boolean(useRestFallback);

  if (!useRest) {
    try {
      const websiteDoc = await websiteRef.get();
      if (!websiteDoc.exists) {
        return { success: false, message: "Website configuration document not found." };
      }
      websiteData = websiteDoc.data();
    } catch (err: any) {
      if (isPermissionDeniedError(err)) {
        useRest = true;
      } else {
        throw err;
      }
    }
  }

  if (useRest) {
    const restSnap = await restGetDoc(websitePath, params.idToken);
    if (!restSnap.exists) {
      return { success: false, message: "Website configuration document not found." };
    }
    websiteData = restSnap.data();
  }

  const domain = websiteData?.customDomain;

  if (!domain) {
    return { success: false, message: "No custom domain linked. Please link a domain first." };
  }

  const validation = await validateDomainFormat(domain);
  if (!validation.isValid || !validation.cleanedDomain) {
    return { success: false, message: validation.error || "Invalid domain format." };
  }

  const cleanDomain = validation.cleanedDomain;
  const nowIso = new Date().toISOString();

  const dnsResult = await checkDomainDns(cleanDomain);

  const updateData = dnsResult.isVerified
    ? {
        customDomainStatus: "verified",
        customDomainVerifiedAt: nowIso,
        customDomainLastCheckedAt: nowIso,
        customDomainVerificationError: null,
        customDomainDnsRecord: dnsResult.recordsFound.join(", ") || EXPECTED_CNAME_TARGET,
      }
    : {
        customDomainStatus: "failed",
        customDomainVerifiedAt: null,
        customDomainLastCheckedAt: nowIso,
        customDomainVerificationError: dnsResult.errorMessage,
        customDomainDnsRecord: dnsResult.recordsFound.join(", ") || null,
      };

  if (useRest) {
    await restUpdateDoc(websitePath, updateData, params.idToken);
  } else {
    try {
      await websiteRef.update(updateData);
    } catch (err: any) {
      if (isPermissionDeniedError(err)) {
        await restUpdateDoc(websitePath, updateData, params.idToken);
      } else {
        throw err;
      }
    }
  }

  revalidatePath("/website");
  revalidatePath("/website/domains");
  revalidatePath("/shop");

  if (dnsResult.isVerified) {
    return {
      success: true,
      status: "verified",
      message: `Domain ${cleanDomain} verified successfully! DNS CNAME correctly points to ${EXPECTED_CNAME_TARGET}.`,
      verifiedAt: nowIso,
    };
  }

  return {
    success: false,
    status: "failed",
    message: dnsResult.errorMessage || "DNS verification failed.",
    lastCheckedAt: nowIso,
  };
}

/**
 * Server Action: Link or update custom domain configuration for a business.
 */
export async function updateCustomDomain(
  businessIdOrParams: string | { businessId?: string; domain: string; idToken?: string },
  maybeDomain?: string,
  maybeIdToken?: string
) {
  let businessId: string | undefined;
  let domain: string;
  let idToken: string | undefined;

  if (typeof businessIdOrParams === "object") {
    businessId = businessIdOrParams.businessId;
    domain = businessIdOrParams.domain;
    idToken = businessIdOrParams.idToken;
  } else {
    businessId = businessIdOrParams;
    domain = maybeDomain || "";
    idToken = maybeIdToken;
  }

  const auth = await authenticateTenantUser(idToken, businessId);
  if (!auth.authorized || !auth.authContext) {
    return { success: false, message: auth.error || "Unauthorized request." };
  }

  const { businessId: tenantBusinessId, useRestFallback } = auth.authContext;
  const validation = await validateDomainFormat(domain);
  if (!validation.isValid || !validation.cleanedDomain) {
    return { success: false, message: validation.error || "Invalid domain format." };
  }

  const cleanDomain = validation.cleanedDomain;

  try {
    const { db } = initializeAdmin();
    let useRest = Boolean(useRestFallback);

    if (!useRest) {
      try {
        const existingSnap = await db.collectionGroup("websites")
          .where("customDomain", "==", cleanDomain)
          .limit(1)
          .get();

        if (!existingSnap.empty) {
          const existingDoc = existingSnap.docs[0];
          const existingBizId = existingDoc.ref.path.split("/")[1];
          if (existingBizId !== tenantBusinessId) {
            return { success: false, message: "This domain is already linked to another business storefront." };
          }
        }
      } catch (err: any) {
        if (isPermissionDeniedError(err)) {
          useRest = true;
        } else {
          throw err;
        }
      }
    }

    if (useRest) {
      try {
        const existingDocs = await restQueryCollection(
          "",
          "websites",
          {
            allDescendants: true,
            where: [{ field: "customDomain", value: cleanDomain }],
            limit: 1,
          },
          idToken
        );
        if (existingDocs.length > 0) {
          const existingBizId = existingDocs[0].__path.split("/")[1];
          if (existingBizId !== tenantBusinessId) {
            return { success: false, message: "This domain is already linked to another business storefront." };
          }
        }
      } catch {
        // Proceed if collectionGroup index is unavailable in REST mode
      }
    }

    const websitePath = `businesses/${tenantBusinessId}/websites/main`;
    const nowIso = new Date().toISOString();
    const updatePayload = {
      customDomain: cleanDomain,
      customDomainStatus: "pending",
      customDomainVerifiedAt: null,
      customDomainLastCheckedAt: nowIso,
      customDomainVerificationError: null,
      customDomainDnsRecord: null,
    };

    if (useRest) {
      await restUpdateDoc(websitePath, updatePayload, idToken);
    } else {
      try {
        await db.doc(websitePath).update(updatePayload);
      } catch (err: any) {
        if (isPermissionDeniedError(err)) {
          await restUpdateDoc(websitePath, updatePayload, idToken);
        } else {
          throw err;
        }
      }
    }

    revalidatePath("/website");
    revalidatePath("/website/domains");
    return {
      success: true,
      message: `Domain ${cleanDomain} linked successfully. Please configure your CNAME record and click Verify.`
    };
  } catch (error: any) {
    console.error("Error updating custom domain:", error);
    return { success: false, message: "An unexpected error occurred while linking the domain." };
  }
}

/**
 * Server Action: Remove custom domain configuration.
 */
export async function removeCustomDomain(
  businessIdOrParams: string | { businessId?: string; idToken?: string },
  maybeIdToken?: string
) {
  let businessId: string | undefined;
  let idToken: string | undefined;

  if (typeof businessIdOrParams === "object") {
    businessId = businessIdOrParams.businessId;
    idToken = businessIdOrParams.idToken;
  } else {
    businessId = businessIdOrParams;
    idToken = maybeIdToken;
  }

  const auth = await authenticateTenantUser(idToken, businessId);
  if (!auth.authorized || !auth.authContext) {
    return { success: false, message: auth.error || "Unauthorized request." };
  }

  const { businessId: tenantBusinessId, useRestFallback } = auth.authContext;
  const websitePath = `businesses/${tenantBusinessId}/websites/main`;
  const clearPayload = {
    customDomain: null,
    customDomainStatus: null,
    customDomainVerifiedAt: null,
    customDomainLastCheckedAt: null,
    customDomainVerificationError: null,
    customDomainDnsRecord: null,
  };

  try {
    const { db } = initializeAdmin();

    if (useRestFallback) {
      await restUpdateDoc(websitePath, clearPayload, idToken);
    } else {
      try {
        await db.doc(websitePath).update(clearPayload);
      } catch (err: any) {
        if (isPermissionDeniedError(err)) {
          await restUpdateDoc(websitePath, clearPayload, idToken);
        } else {
          throw err;
        }
      }
    }

    revalidatePath("/website");
    revalidatePath("/website/domains");
    revalidatePath("/shop");
    return { success: true, message: "Custom domain unlinked successfully." };
  } catch (error) {
    console.error("Error removing custom domain:", error);
    return { success: false, message: "An unexpected error occurred while unlinking domain." };
  }
}

export interface SaveStorefrontConfigInput {
  businessId?: string;
  idToken?: string;
  config: {
    primaryColor?: string;
    uiStyle?: string;
    whatsappOrderEnabled?: boolean;
    codEnabled?: boolean;
    showDiscount?: boolean;
    storeName?: string;
    slug?: string;
    logoUrl?: string;
    faviconUrl?: string;
    contactEmail?: string;
    contactPhone?: string;
    storeAddress?: string;
    sections?: any[];
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    socialShareImage?: string;
    status?: "draft" | "published";
    coupons?: StoreCoupon[];
    shippingConfig?: Partial<StoreShippingConfig>;
    themeConfig?: Partial<StoreThemeConfig>;
    announcementBar?: Partial<StoreAnnouncementBar>;
    footerConfig?: Partial<StoreFooterConfig>;
    trackingConfig?: Partial<StoreTrackingConfig>;
    policyConfig?: Partial<StorePolicyConfig>;
  };
}

/**
 * Server Action: Save & synchronize storefront configuration across
 * `businesses/{businessId}/websites/main` AND `businesses/{businessId}` (slug, logo, favicon).
 */
export async function saveStorefrontConfig(input: SaveStorefrontConfigInput): Promise<{
  success: boolean;
  message: string;
  slug?: string;
}> {
  const auth = await authenticateTenantUser(input.idToken, input.businessId);
  if (!auth.authorized || !auth.authContext) {
    return { success: false, message: auth.error || "Unauthorized request." };
  }

  const { businessId: tenantBusinessId, useRestFallback } = auth.authContext;
  const { idToken, config } = input;
  const cleanSlug = sanitizeStoreSlug(config.slug || "");

  if (cleanSlug && ["www", "app", "admin", "api", "shop", "owner"].includes(cleanSlug)) {
    return {
      success: false,
      message: `Subdomain "${cleanSlug}" is reserved by the platform. Please choose a different brand slug.`,
    };
  }

  let useRest = Boolean(useRestFallback);
  const { db } = initializeAdmin();

  try {
    // 1. Validate cross-tenant slug uniqueness if slug is provided
    if (cleanSlug) {
      if (!useRest) {
        try {
          const bizSlugSnap = await db
            .collection("businesses")
            .where("slug", "==", cleanSlug)
            .limit(2)
            .get();
          const conflictBiz = bizSlugSnap.docs.find((d) => d.id !== tenantBusinessId);
          if (conflictBiz) {
            return {
              success: false,
              message: `Subdomain "${cleanSlug}.biztrix.in" is already claimed by another business.`,
            };
          }
        } catch (err: any) {
          if (isPermissionDeniedError(err)) {
            useRest = true;
          } else {
            throw err;
          }
        }
      }

      if (useRest) {
        const existingBizDocs = await restQueryCollection(
          "",
          "businesses",
          { where: [{ field: "slug", op: "EQUAL", value: cleanSlug }], limit: 2 },
          idToken
        );
        const conflict = existingBizDocs.find((d) => d.id !== tenantBusinessId);
        if (conflict) {
          return {
            success: false,
            message: `Subdomain "${cleanSlug}.biztrix.in" is already claimed by another business.`,
          };
        }
      }
    }

    const normalizedSections = config.sections
      ? normalizeStoreSections(config.sections)
      : undefined;

    const websitePath = `businesses/${tenantBusinessId}/websites/main`;
    const businessPath = `businesses/${tenantBusinessId}`;

    const websitePayload: Record<string, any> = {
      primaryColor: config.primaryColor || "#0C83B3",
      uiStyle: config.uiStyle || "modern",
      whatsappOrderEnabled: config.whatsappOrderEnabled ?? true,
      codEnabled: config.codEnabled ?? true,
      showDiscount: config.showDiscount ?? true,
      storeName: (config.storeName || "").trim(),
      slug: cleanSlug,
      contactEmail: (config.contactEmail || "").trim().toLowerCase(),
      contactPhone: (config.contactPhone || "").trim(),
      storeAddress: (config.storeAddress || "").trim(),
      seoTitle: (config.seoTitle || "").trim(),
      seoDescription: (config.seoDescription || "").trim(),
      seoKeywords: (config.seoKeywords || "").trim(),
      ogTitle: (config.ogTitle || "").trim(),
      ogDescription: (config.ogDescription || "").trim(),
      ogImage: (config.ogImage || "").trim(),
      socialShareImage: (config.socialShareImage || config.ogImage || "").trim(),
      faviconUrl: (config.faviconUrl || "").trim(),
      logoUrl: (config.logoUrl || "").trim(),
      status: config.status || "draft",
    };

    if (normalizedSections) {
      websitePayload.sections = normalizedSections;
    }
    if (config.coupons !== undefined) {
      websitePayload.coupons = normalizeStoreCoupons(config.coupons);
    }
    if (config.shippingConfig !== undefined) {
      websitePayload.shippingConfig = normalizeStoreShippingConfig(config.shippingConfig);
    }
    if (config.themeConfig !== undefined) {
      websitePayload.themeConfig = normalizeStoreThemeConfig(
        config.themeConfig,
        config.uiStyle
      );
    }
    if (config.announcementBar !== undefined) {
      websitePayload.announcementBar = normalizeAnnouncementBar(config.announcementBar);
    }
    if (config.footerConfig !== undefined) {
      websitePayload.footerConfig = normalizeFooterConfig(config.footerConfig);
    }
    if (config.trackingConfig !== undefined) {
      websitePayload.trackingConfig = normalizeStoreTrackingConfig(config.trackingConfig);
    }
    if (config.policyConfig !== undefined) {
      websitePayload.policyConfig = normalizeStorePolicyConfig(config.policyConfig);
    }

    const businessSyncPayload: Record<string, any> = {};
    if (cleanSlug) {
      businessSyncPayload.slug = cleanSlug;
    }
    if (config.logoUrl !== undefined && config.logoUrl.trim()) {
      businessSyncPayload.logoUrl = config.logoUrl.trim();
    }
    if (config.faviconUrl !== undefined && config.faviconUrl.trim()) {
      businessSyncPayload.faviconUrl = config.faviconUrl.trim();
    }

    const saveViaRest = async () => {
      await restSetDoc(
        websitePath,
        { ...websitePayload, updatedAt: SERVER_TIMESTAMP_SENTINEL },
        idToken,
        { merge: true }
      );
      if (Object.keys(businessSyncPayload).length > 0) {
        await restUpdateDoc(
          businessPath,
          { ...businessSyncPayload, updatedAt: SERVER_TIMESTAMP_SENTINEL },
          idToken
        );
      }
    };

    if (useRest) {
      await saveViaRest();
    } else {
      try {
        await db.doc(websitePath).set(
          { ...websitePayload, updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        );
        if (Object.keys(businessSyncPayload).length > 0) {
          await db.doc(businessPath).update({
            ...businessSyncPayload,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      } catch (err: any) {
        if (isPermissionDeniedError(err)) {
          await saveViaRest();
        } else {
          throw err;
        }
      }
    }

    revalidatePath("/website");
    revalidatePath("/shop");
    return {
      success: true,
      slug: cleanSlug,
      message:
        config.status === "published"
          ? "Storefront published and live!"
          : "Storefront draft saved.",
    };
  } catch (err: any) {
    console.error("saveStorefrontConfig error:", err);
    return {
      success: false,
      message: err.message || "Failed to save storefront configuration.",
    };
  }
}

/**
 * Promotes any server-validated unauthenticated storefront order/event relays
 * from `businesses/{businessId}/notifications` into `orders` and `storefront_events`
 * when a merchant opens Store Builder in environments without Service Account IAM.
 */
export async function syncStorefrontRelays(params: {
  businessId?: string;
  idToken?: string;
}): Promise<{ syncedOrders: number; syncedEvents: number }> {
  const auth = await authenticateTenantUser(params.idToken, params.businessId);
  if (!auth.authorized || !auth.authContext) {
    return { syncedOrders: 0, syncedEvents: 0 };
  }

  const { businessId: tenantBusinessId } = auth.authContext;
  const { idToken } = params;
  let syncedOrders = 0;
  let syncedEvents = 0;

  try {
    const relayDocs = await restQueryCollection(
      `businesses/${tenantBusinessId}`,
      "notifications",
      {
        where: [{ field: "relayed", op: "EQUAL", value: false }],
        limit: 50,
      },
      idToken
    );

    if (relayDocs.length === 0) {
      return { syncedOrders: 0, syncedEvents: 0 };
    }

    const ops: Parameters<typeof restCommit>[0] = [];
    for (const docItem of relayDocs) {
      if (docItem.relayKind === "storefront_order" && docItem.orderPayload?.id) {
        const orderPayload = docItem.orderPayload;
        const cleanPhone = String(orderPayload.customerData?.phone || "")
          .replace(/\D/g, "")
          .slice(-10);
        const customerId = orderPayload.customerId || `c_${cleanPhone}`;

        if (cleanPhone) {
          ops.push({
            type: "set",
            path: `businesses/${tenantBusinessId}/customers/${customerId}`,
            merge: true,
            data: {
              id: customerId,
              tenantId: tenantBusinessId,
              name: orderPayload.customerData?.name || "Online Shopper",
              phone: orderPayload.customerData?.phone || "",
              normalizedPhone: cleanPhone,
              email: orderPayload.customerData?.email || "",
              address: orderPayload.customerData?.address || "",
              lastOrderDate: SERVER_TIMESTAMP_SENTINEL,
              updatedAt: SERVER_TIMESTAMP_SENTINEL,
            },
          });
        }

        ops.push({
          type: "set",
          path: `businesses/${tenantBusinessId}/orders/${orderPayload.id}`,
          merge: true,
          data: {
            ...orderPayload,
            createdAt: orderPayload.createdAtIso
              ? new Date(orderPayload.createdAtIso)
              : SERVER_TIMESTAMP_SENTINEL,
            updatedAt: SERVER_TIMESTAMP_SENTINEL,
          },
        });

        ops.push({
          type: "update",
          path: `businesses/${tenantBusinessId}/notifications/${docItem.id}`,
          data: { relayed: true },
        });
        syncedOrders += 1;
      } else if (docItem.relayKind === "storefront_event" && docItem.eventPayload?.id) {
        const ev = docItem.eventPayload;
        ops.push({
          type: "set",
          path: `businesses/${tenantBusinessId}/storefront_events/${ev.id}`,
          merge: true,
          data: {
            ...ev,
            createdAt: ev.clientTimestamp
              ? new Date(ev.clientTimestamp)
              : SERVER_TIMESTAMP_SENTINEL,
          },
        });

        if (ev.counterField) {
          ops.push({
            type: "set",
            path: `businesses/${tenantBusinessId}/storefront_analytics/summary`,
            merge: true,
            data: {
              [ev.counterField]: incrementSentinel(1),
              lastEventAt: SERVER_TIMESTAMP_SENTINEL,
              updatedAt: SERVER_TIMESTAMP_SENTINEL,
            },
          });
        }

        ops.push({
          type: "update",
          path: `businesses/${tenantBusinessId}/notifications/${docItem.id}`,
          data: { relayed: true, read: true },
        });
        syncedEvents += 1;
      } else if (docItem.relayKind === "storefront_lead" && docItem.leadPayload?.id) {
        const lead = docItem.leadPayload;
        ops.push({
          type: "set",
          path: `businesses/${tenantBusinessId}/storefront_leads/${lead.id}`,
          merge: true,
          data: {
            ...lead,
            createdAt: lead.subscribedAtIso
              ? new Date(lead.subscribedAtIso)
              : SERVER_TIMESTAMP_SENTINEL,
            updatedAt: SERVER_TIMESTAMP_SENTINEL,
          },
        });
        if (lead.contactType === "phone" && lead.phone) {
          const customerId = `c_${lead.phone}`;
          ops.push({
            type: "set",
            path: `businesses/${tenantBusinessId}/customers/${customerId}`,
            merge: true,
            data: {
              id: customerId,
              tenantId: tenantBusinessId,
              name: lead.name || "VIP Subscriber",
              phone: lead.phone,
              normalizedPhone: lead.phone,
              source: "storefront_vip_alerts",
              vipAlertsOptIn: true,
              updatedAt: SERVER_TIMESTAMP_SENTINEL,
            },
          });
        }
        ops.push({
          type: "update",
          path: `businesses/${tenantBusinessId}/notifications/${docItem.id}`,
          data: { relayed: true },
        });
        syncedEvents += 1;
      }
    }

    if (ops.length > 0) {
      await restCommit(ops, idToken);
    }
  } catch (err) {
    console.warn("[syncStorefrontRelays] skipped:", err);
  }

  return { syncedOrders, syncedEvents };
}

/**
 * Saves or publishes a Sales Funnel document in `businesses/{businessId}/websites/{funnelId}`.
 * Never modifies customDomain on `websites/main` so store domain routing stays isolated.
 */
export async function saveFunnelPage(params: {
  idToken?: string;
  businessId?: string;
  funnel: Partial<StoreFunnelConfig> & { id: string };
}): Promise<{ success: boolean; message: string; funnel?: StoreFunnelConfig }> {
  const auth = await authenticateTenantUser(params.idToken, params.businessId);
  if (!auth.authorized || !auth.authContext) {
    return { success: false, message: auth.error || "Unauthorized request." };
  }

  const { businessId: tenantBusinessId, useRestFallback } = auth.authContext;
  const cleanId = String(params.funnel?.id || "").trim();
  if (!cleanId || cleanId === "main" || !cleanId.startsWith("funnel_")) {
    return { success: false, message: "Invalid funnel document identifier." };
  }

  const normalized = normalizeFunnelConfig({ ...params.funnel, id: cleanId }, cleanId);
  const { db } = initializeAdmin();
  let useRest = Boolean(useRestFallback);

  try {
    // Check slug uniqueness within the same tenant's funnel documents
    if (!useRest) {
      try {
        const existingSnap = await db
          .collection(`businesses/${tenantBusinessId}/websites`)
          .where("kind", "==", "funnel")
          .where("slug", "==", normalized.slug)
          .limit(3)
          .get();
        const conflict = existingSnap.docs.find((d) => d.id !== cleanId);
        if (conflict) {
          return {
            success: false,
            message: `Funnel slug "/${normalized.slug}" is already in use by another landing page.`,
          };
        }
      } catch (err: any) {
        if (isPermissionDeniedError(err)) {
          useRest = true;
        } else {
          throw err;
        }
      }
    }

    if (useRest) {
      const docs = await restQueryCollection(
        `businesses/${tenantBusinessId}`,
        "websites",
        {
          where: [
            { field: "kind", op: "EQUAL", value: "funnel" },
            { field: "slug", op: "EQUAL", value: normalized.slug },
          ],
          limit: 3,
        },
        params.idToken
      );
      const conflict = docs.find((d: any) => d.id !== cleanId);
      if (conflict) {
        return {
          success: false,
          message: `Funnel slug "/${normalized.slug}" is already in use by another landing page.`,
        };
      }
    }

    const docPath = `businesses/${tenantBusinessId}/websites/${cleanId}`;
    if (useRest) {
      await restSetDoc(
        docPath,
        { ...normalized, updatedAt: SERVER_TIMESTAMP_SENTINEL },
        params.idToken,
        { merge: true }
      );
    } else {
      try {
        await db.doc(docPath).set(
          { ...normalized, updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        );
      } catch (err: any) {
        if (isPermissionDeniedError(err)) {
          await restSetDoc(
            docPath,
            { ...normalized, updatedAt: SERVER_TIMESTAMP_SENTINEL },
            params.idToken,
            { merge: true }
          );
        } else {
          throw err;
        }
      }
    }

    revalidatePath("/website/funnels");
    revalidatePath("/funnel");
    return {
      success: true,
      funnel: normalized,
      message:
        normalized.status === "published"
          ? `Funnel "${normalized.name}" published live!`
          : `Funnel "${normalized.name}" draft saved.`,
    };
  } catch (err: any) {
    console.error("saveFunnelPage error:", err);
    return { success: false, message: err?.message || "Failed to save funnel." };
  }
}

export async function deleteFunnelPage(params: {
  idToken?: string;
  businessId?: string;
  funnelId: string;
}): Promise<{ success: boolean; message: string }> {
  const auth = await authenticateTenantUser(params.idToken, params.businessId);
  if (!auth.authorized || !auth.authContext) {
    return { success: false, message: auth.error || "Unauthorized request." };
  }

  const { businessId: tenantBusinessId } = auth.authContext;
  const cleanId = String(params.funnelId || "").trim();
  if (!cleanId || cleanId === "main" || !cleanId.startsWith("funnel_")) {
    return { success: false, message: "Only funnel landing pages can be deleted." };
  }

  const docPath = `businesses/${tenantBusinessId}/websites/${cleanId}`;
  try {
    const { db } = initializeAdmin();
    await db.doc(docPath).delete();
  } catch (err: any) {
    if (!isPermissionDeniedError(err)) {
      console.error("deleteFunnelPage error:", err);
      return { success: false, message: err?.message || "Failed to delete funnel." };
    }
    try {
      await restSetDoc(
        docPath,
        {
          id: cleanId,
          kind: "funnel_deleted",
          status: "draft",
          deletedAt: SERVER_TIMESTAMP_SENTINEL,
        },
        params.idToken,
        { merge: true }
      );
    } catch (restErr: any) {
      return { success: false, message: restErr?.message || "Failed to delete funnel." };
    }
  }

  revalidatePath("/website/funnels");
  revalidatePath("/funnel");
  return { success: true, message: "Funnel deleted successfully." };
}

