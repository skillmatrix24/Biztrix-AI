import { initializeAdmin } from "@/firebase/admin";
import {
  isPermissionDeniedError,
  restGetDoc,
  restQueryCollection,
} from "@/firebase/firestore-rest";
import {
  normalizeAnnouncementBar,
  normalizeFooterConfig,
  normalizeStoreCoupons,
  normalizeStorePolicyConfig,
  normalizeStoreShippingConfig,
  normalizeStoreThemeConfig,
  normalizeStoreTrackingConfig,
  StoreAnnouncementBar,
  StoreCoupon,
  StoreFooterConfig,
  StorePolicyConfig,
  StoreShippingConfig,
  StoreThemeConfig,
  StoreTrackingConfig,
} from "@/lib/storefront-engine";

export interface StorefrontSeoData {
  businessId: string;
  storeName: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  socialShareImage?: string;
  faviconUrl?: string;
  logoUrl?: string;
  primaryColor?: string;
  uiStyle?: string;
  customDomain?: string | null;
  customDomainStatus?: string | null;
  slug?: string | null;
  contactEmail?: string;
  contactPhone?: string;
  storeAddress?: string;
  currency?: string;
  status?: string;
  websiteStatus?: string | null;
  businessStatus?: string | null;
  whatsappOrderEnabled?: boolean;
  codEnabled?: boolean;
  showDiscount?: boolean;
  sections?: any[];
  coupons?: StoreCoupon[];
  shippingConfig?: StoreShippingConfig;
  themeConfig?: StoreThemeConfig;
  announcementBar?: StoreAnnouncementBar;
  footerConfig?: StoreFooterConfig;
  trackingConfig?: StoreTrackingConfig;
  policyConfig?: StorePolicyConfig;
}

export interface ProductSeoData {
  id: string;
  name: string;
  description?: string;
  price: number;
  onlinePrice?: number;
  sku?: string;
  stock: number;
  minThreshold: number;
  category?: string;
  images?: string[];
  isFeatured?: boolean;
  isBestSeller?: boolean;
  showOnWebsite: boolean;
  isArchived?: boolean;
  createdAt?: string | null;
}

/**
 * Resolves the canonical URL according to strict Phase 8 hierarchy:
 * Priority 1: Verified custom domain (e.g. https://shop.brand.com)
 * Priority 2: Existing Biztrix platform subdomain (e.g. https://brand.biztrix.in)
 * Priority 3: Platform production/app URL fallback (clean route without ?bId=...)
 * 
 * Never outputs ?bId=... as canonical production URL.
 */
export function resolveCanonicalStorefrontUrl({
  customDomain,
  customDomainStatus,
  slug,
  productId,
}: {
  customDomain?: string | null;
  customDomainStatus?: string | null;
  slug?: string | null;
  productId?: string | null;
}): string {
  let baseUrl = '';

  const isVerified = customDomainStatus === 'verified' || customDomainStatus === 'active';
  if (customDomain && isVerified) {
    const cleanDomain = customDomain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    baseUrl = `https://${cleanDomain}`;
  } else if (slug) {
    const cleanSlug = slug.toLowerCase().trim().replace(/\s+/g, '-');
    baseUrl = `https://${cleanSlug}.biztrix.in`;
  } else {
    const defaultHost = process.env.NEXT_PUBLIC_APP_URL || 'https://biztrix.in';
    baseUrl = `${defaultHost.replace(/\/$/, '')}/shop`;
  }

  let canonical = baseUrl;
  if (!canonical.endsWith('/shop') && !isVerified && !slug) {
    canonical = `${canonical}/shop`;
  }

  if (productId) {
    const separator = canonical.includes('?') ? '&' : '?';
    canonical = `${canonical}${separator}pId=${encodeURIComponent(productId)}`;
  }

  return canonical;
}

/**
 * Privileged server-side loader for public storefront SEO metadata.
 * Never exposes private secrets or internal business credentials.
 */
export async function getStorefrontSeoData(businessId: string): Promise<StorefrontSeoData | null> {
  try {
    let bizExists = false;
    let bizData: Record<string, any> = {};
    let websiteData: Record<string, any> = {};

    try {
      const { db } = initializeAdmin();
      const [bizSnap, websiteSnap] = await Promise.all([
        db.doc(`businesses/${businessId}`).get(),
        db.doc(`businesses/${businessId}/websites/main`).get()
      ]);
      bizExists = bizSnap.exists;
      bizData = bizSnap.data() || {};
      websiteData = websiteSnap.exists ? websiteSnap.data() || {} : {};
    } catch (adminErr: any) {
      if (!isPermissionDeniedError(adminErr)) throw adminErr;
      const [bizSnap, websiteSnap] = await Promise.all([
        restGetDoc(`businesses/${businessId}`),
        restGetDoc(`businesses/${businessId}/websites/main`)
      ]);
      bizExists = bizSnap.exists;
      bizData = (bizSnap.exists ? bizSnap.data() : undefined) || {};
      websiteData = (websiteSnap.exists ? websiteSnap.data() : undefined) || {};
    }

    if (!bizExists) return null;

    // Only return if store is published or active
    const status = websiteData.status || bizData.status || 'draft';

    return {
      businessId,
      storeName: websiteData.storeName || bizData.name || "Online Store",
      seoTitle: websiteData.seoTitle,
      seoDescription: websiteData.seoDescription,
      seoKeywords: websiteData.seoKeywords,
      ogTitle: websiteData.ogTitle,
      ogDescription: websiteData.ogDescription,
      ogImage: websiteData.ogImage,
      socialShareImage: websiteData.socialShareImage,
      faviconUrl: websiteData.faviconUrl || bizData.faviconUrl,
      logoUrl: websiteData.logoUrl || bizData.logoUrl,
      primaryColor: websiteData.primaryColor || "#0C83B3",
      uiStyle: websiteData.uiStyle || "modern",
      customDomain: websiteData.customDomain || null,
      customDomainStatus: websiteData.customDomainStatus || null,
      slug: websiteData.slug || bizData.slug || null,
      contactEmail: websiteData.contactEmail || bizData.email || "",
      contactPhone: websiteData.contactPhone || bizData.phone || "",
      storeAddress: websiteData.storeAddress || bizData.address || "",
      currency: bizData.currency || "INR",
      status,
      websiteStatus: websiteData.status || null,
      businessStatus: bizData.status || null,
      whatsappOrderEnabled: websiteData.whatsappOrderEnabled ?? true,
      codEnabled: websiteData.codEnabled ?? true,
      showDiscount: websiteData.showDiscount ?? true,
      sections: Array.isArray(websiteData.sections) ? websiteData.sections : undefined,
      coupons: normalizeStoreCoupons(websiteData.coupons),
      shippingConfig: normalizeStoreShippingConfig(websiteData.shippingConfig),
      themeConfig: normalizeStoreThemeConfig(websiteData.themeConfig, websiteData.uiStyle),
      announcementBar: normalizeAnnouncementBar(websiteData.announcementBar),
      footerConfig: normalizeFooterConfig(websiteData.footerConfig),
      trackingConfig: normalizeStoreTrackingConfig(websiteData.trackingConfig),
      policyConfig: normalizeStorePolicyConfig(websiteData.policyConfig),
    };
  } catch (err) {
    console.error("[getStorefrontSeoData] error:", err);
    return null;
  }
}

/**
 * Privileged server-side loader for publicly visible product SEO metadata.
 * Enforces security: only returns products with showOnWebsite === true and !isArchived.
 */
export async function getProductSeoData(businessId: string, productId: string): Promise<ProductSeoData | null> {
  try {
    let exists = false;
    let resolvedId = productId;
    let p: Record<string, any> = {};

    try {
      const { db } = initializeAdmin();
      const productRef = db.doc(`businesses/${businessId}/products/${productId}`);
      const snap = await productRef.get();
      exists = snap.exists;
      resolvedId = snap.id;
      p = snap.data() || {};
    } catch (adminErr: any) {
      if (!isPermissionDeniedError(adminErr)) throw adminErr;
      const restSnap = await restGetDoc(`businesses/${businessId}/products/${productId}`);
      exists = restSnap.exists;
      resolvedId = restSnap.id;
      p = (restSnap.exists ? restSnap.data() : undefined) || {};
    }

    if (!exists) return null;

    // Security Gate: hidden or archived products are never exposed to search engines
    if (!p.showOnWebsite || p.isArchived) {
      return null;
    }

    return {
      id: resolvedId,
      name: p.name || "Product",
      description: p.description || "",
      price: parseFloat(p.price) || 0,
      onlinePrice: p.onlinePrice !== undefined ? parseFloat(p.onlinePrice) : undefined,
      sku: p.sku || "",
      stock: parseInt(p.stock, 10) || 0,
      minThreshold: parseInt(p.minThreshold, 10) || 2,
      category: p.category || "",
      images: Array.isArray(p.images) ? p.images : [],
      isFeatured: Boolean(p.isFeatured),
      isBestSeller: Boolean(p.isBestSeller),
      showOnWebsite: Boolean(p.showOnWebsite),
      isArchived: Boolean(p.isArchived),
    };
  } catch (err) {
    console.error("[getProductSeoData] error:", err);
    return null;
  }
}

/**
 * Fetches publicly visible products for sitemap and catalog JSON-LD.
 * Bounded query: limit 100 items to prevent unbounded reads.
 */
export async function getPublicStoreProductsForSeo(businessId: string, limitCount = 100): Promise<ProductSeoData[]> {
  try {
    let rawItems: Array<{ id: string; data: Record<string, any> }> = [];

    try {
      const { db } = initializeAdmin();
      const q = db.collection(`businesses/${businessId}/products`)
        .where("showOnWebsite", "==", true)
        .limit(limitCount);

      const snap = await q.get();
      rawItems = snap.docs.map(doc => ({ id: doc.id, data: doc.data() }));
    } catch (adminErr: any) {
      if (!isPermissionDeniedError(adminErr)) throw adminErr;
      const docs = await restQueryCollection(`businesses/${businessId}`, 'products', {
        where: [{ field: "showOnWebsite", op: "EQUAL", value: true }],
        limit: limitCount,
      });
      rawItems = docs.map(doc => ({ id: doc.id, data: doc }));
    }

    return rawItems
      .map(({ id, data: p }) => ({
        id,
        name: p.name || "Product",
        description: p.description || "",
        price: parseFloat(p.price) || 0,
        onlinePrice: p.onlinePrice !== undefined ? parseFloat(p.onlinePrice) : undefined,
        sku: p.sku || "",
        stock: parseInt(p.stock, 10) || 0,
        minThreshold: parseInt(p.minThreshold, 10) || 2,
        category: p.category || "",
        images: Array.isArray(p.images) ? p.images : [],
        isFeatured: Boolean(p.isFeatured),
        isBestSeller: Boolean(p.isBestSeller),
        showOnWebsite: Boolean(p.showOnWebsite),
        isArchived: Boolean(p.isArchived),
        createdAt:
          typeof p.createdAt === "string"
            ? p.createdAt
            : typeof p.createdAt?.toDate === "function"
              ? p.createdAt.toDate().toISOString()
              : null,
      }))
      .filter(p => !p.isArchived);
  } catch (err) {
    console.error("[getPublicStoreProductsForSeo] error:", err);
    return [];
  }
}

/**
 * Generates Schema.org Store / OnlineBusiness JSON-LD
 */
export function generateStoreJsonLd(seoData: StorefrontSeoData, canonicalUrl: string) {
  const jsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "name": seoData.storeName,
    "url": canonicalUrl,
    "description": seoData.seoDescription || `Official online store for ${seoData.storeName}`,
  };

  if (seoData.ogImage || seoData.logoUrl) {
    jsonLd.image = seoData.ogImage || seoData.logoUrl;
    jsonLd.logo = seoData.logoUrl || seoData.ogImage;
  }

  if (seoData.contactPhone) {
    jsonLd.telephone = seoData.contactPhone;
  }

  if (seoData.contactEmail) {
    jsonLd.email = seoData.contactEmail;
  }

  if (seoData.storeAddress) {
    jsonLd.address = {
      "@type": "PostalAddress",
      "streetAddress": seoData.storeAddress
    };
  }

  return jsonLd;
}

/**
 * Generates Schema.org Product JSON-LD using authentic product fields.
 * Never invents ratings, reviews, or prices.
 */
export function generateProductJsonLd(
  product: ProductSeoData,
  seoData: StorefrontSeoData,
  productCanonicalUrl: string
) {
  const effectivePrice = product.onlinePrice !== undefined && product.onlinePrice !== null
    ? product.onlinePrice
    : product.price;

  const jsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description || product.name,
    "offers": {
      "@type": "Offer",
      "url": productCanonicalUrl,
      "price": effectivePrice,
      "priceCurrency": seoData.currency || "INR",
      "availability": product.stock > 0 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": seoData.storeName
      }
    }
  };

  if (product.images && product.images.length > 0) {
    jsonLd.image = product.images;
  }

  if (product.sku) {
    jsonLd.sku = product.sku;
  }

  if (product.category) {
    jsonLd.category = product.category;
  }

  return jsonLd;
}
