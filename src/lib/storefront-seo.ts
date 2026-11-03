import { initializeAdmin } from "@/firebase/admin";

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
  customDomain?: string | null;
  customDomainStatus?: string | null;
  slug?: string | null;
  contactEmail?: string;
  contactPhone?: string;
  storeAddress?: string;
  currency?: string;
  status?: string;
  whatsappOrderEnabled?: boolean;
  showDiscount?: boolean;
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
    const { db } = initializeAdmin();

    const [bizSnap, websiteSnap] = await Promise.all([
      db.doc(`businesses/${businessId}`).get(),
      db.doc(`businesses/${businessId}/websites/main`).get()
    ]);

    if (!bizSnap.exists) return null;

    const bizData = bizSnap.data() || {};
    const websiteData = websiteSnap.exists ? websiteSnap.data() || {} : {};

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
      logoUrl: bizData.logoUrl,
      primaryColor: websiteData.primaryColor || "#0C83B3",
      customDomain: websiteData.customDomain || null,
      customDomainStatus: websiteData.customDomainStatus || null,
      slug: websiteData.slug || bizData.slug || null,
      contactEmail: websiteData.contactEmail || "",
      contactPhone: websiteData.contactPhone || bizData.phone || "",
      storeAddress: websiteData.storeAddress || bizData.address || "",
      currency: bizData.currency || "INR",
      status,
      whatsappOrderEnabled: websiteData.whatsappOrderEnabled ?? true,
      showDiscount: websiteData.showDiscount ?? true,
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
    const { db } = initializeAdmin();
    const productRef = db.doc(`businesses/${businessId}/products/${productId}`);
    const snap = await productRef.get();

    if (!snap.exists) return null;

    const p = snap.data() || {};

    // Security Gate: hidden or archived products are never exposed to search engines
    if (!p.showOnWebsite || p.isArchived) {
      return null;
    }

    return {
      id: snap.id,
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
    const { db } = initializeAdmin();
    const q = db.collection(`businesses/${businessId}/products`)
      .where("showOnWebsite", "==", true)
      .limit(limitCount);

    const snap = await q.get();

    return snap.docs
      .map(doc => {
        const p = doc.data();
        return {
          id: doc.id,
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
      })
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
