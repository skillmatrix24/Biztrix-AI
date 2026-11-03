import { headers } from "next/headers";
import { Metadata } from "next";
import { getBusinessIdBySlug, getPublicBusinessNode } from "@/app/actions/p0-migration";
import { initializeAdmin } from "@/firebase/admin";
import { ShopClient } from "./shop-client";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import Script from "next/script";
import { 
  getStorefrontSeoData, 
  getProductSeoData, 
  getPublicStoreProductsForSeo, 
  resolveCanonicalStorefrontUrl,
  generateStoreJsonLd,
  generateProductJsonLd
} from "@/lib/storefront-seo";

/**
 * PRIVILEGED DOMAIN RESOLVER (Phase 4A & 4B)
 * Resolves businessId from a registered and verified custom domain.
 * Enforces production security: unverified or failed domains will not resolve.
 */
async function getBusinessIdByDomain(domain: string): Promise<string | null> {
  try {
    const { db } = initializeAdmin();
    const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0];
    
    // Skip internal platform and local domains
    if (
      cleanDomain.endsWith('.biztrix.in') || 
      cleanDomain.includes('localhost') || 
      cleanDomain.includes('run.app')
    ) {
      return null;
    }

    const q = db.collectionGroup('websites')
      .where('customDomain', '==', cleanDomain)
      .limit(1);
    const snap = await q.get();
    if (snap.empty) return null;

    const websiteDoc = snap.docs[0];
    const websiteData = websiteDoc.data();

    // Phase 4B: Only verified custom domains are permitted to serve production traffic
    const isVerified = websiteData?.customDomainStatus === 'verified' || websiteData?.customDomainStatus === 'active';
    if (!isVerified) {
      return null;
    }

    return websiteDoc.ref.path.split('/')[1];
  } catch (err) {
    console.error("Error resolving custom domain in getBusinessIdByDomain:", err);
    return null;
  }
}

/**
 * Helper to resolve the active tenant businessId across request contexts.
 */
async function resolveStoreBusinessId(searchParams: { bId?: string; slug?: string }) {
  const headerList = await headers();
  const slugFromHeader = headerList.get('x-biztrix-slug');
  const customDomainFromHeader = headerList.get('x-biztrix-custom-domain');
  const hostHeader = headerList.get('host') || '';

  let resolvedId = searchParams.bId || null;
  let resolvedSlug = searchParams.slug || slugFromHeader || null;

  // 1. SSR RESOLUTION: Path A (Slug/Subdomain)
  if (!resolvedId && resolvedSlug) {
    resolvedId = await getBusinessIdBySlug(resolvedSlug);
  }

  // 2. SSR RESOLUTION: Path B (Explicit Custom Domain Header)
  if (!resolvedId && customDomainFromHeader) {
    resolvedId = await getBusinessIdByDomain(customDomainFromHeader);
  }

  // 3. SSR RESOLUTION: Path C (Host Header for direct custom domains)
  if (!resolvedId && hostHeader) {
    resolvedId = await getBusinessIdByDomain(hostHeader);
  }

  return { resolvedId, resolvedSlug };
}

/**
 * PHASE 8: DYNAMIC METADATA GENERATOR FOR STOREFRONT & PRODUCT PAGES
 * Generates authoritative title, description, OpenGraph, Twitter, and canonical URLs.
 * Never exposes hidden/archived products or private business configuration.
 */
export async function generateMetadata(
  props: { searchParams: Promise<{ bId?: string; slug?: string; pId?: string }> }
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const { resolvedId } = await resolveStoreBusinessId(searchParams);

  if (!resolvedId) {
    return {
      title: "Storefront – Biztrix",
      description: "Official online store powered by Biztrix.",
      robots: { index: false, follow: false },
    };
  }

  const seoData = await getStorefrontSeoData(resolvedId);
  if (!seoData) {
    return {
      title: "Storefront – Biztrix",
      description: "Official online store powered by Biztrix.",
      robots: { index: false, follow: false },
    };
  }

  const isStoreLive = seoData.status === 'published' || seoData.status === 'active' || seoData.status === 'pro';
  if (!isStoreLive) {
    return {
      title: `${seoData.storeName} (Preview Mode)`,
      description: "Storefront is currently in preview mode.",
      robots: { index: false, follow: false },
    };
  }

  // 1. PRODUCT-LEVEL SEO: If specific product is requested via ?pId=...
  if (searchParams.pId) {
    const product = await getProductSeoData(resolvedId, searchParams.pId);
    if (product) {
      const productCanonical = resolveCanonicalStorefrontUrl({
        customDomain: seoData.customDomain,
        customDomainStatus: seoData.customDomainStatus,
        slug: seoData.slug,
        productId: product.id,
      });

      const effectivePrice = product.onlinePrice || product.price;
      const productTitle = `${product.name} | ${seoData.storeName}`;
      const productDesc = product.description 
        ? `${product.description.slice(0, 150)}... Buy online for ${seoData.currency} ${effectivePrice}.`
        : `Order ${product.name} online from ${seoData.storeName} for ${seoData.currency} ${effectivePrice}.`;
      const productImage = product.images?.[0] || seoData.ogImage || seoData.logoUrl;

      return {
        title: productTitle,
        description: productDesc,
        keywords: [product.name, product.category, seoData.storeName, ...(seoData.seoKeywords ? seoData.seoKeywords.split(',') : [])].filter(Boolean) as string[],
        alternates: {
          canonical: productCanonical,
        },
        openGraph: {
          title: productTitle,
          description: productDesc,
          url: productCanonical,
          siteName: seoData.storeName,
          type: "website",
          images: productImage ? [{ url: productImage, alt: product.name }] : undefined,
        },
        twitter: {
          card: "summary_large_image",
          title: productTitle,
          description: productDesc,
          images: productImage ? [productImage] : undefined,
        },
        icons: {
          icon: seoData.faviconUrl || "/favicon.ico",
        },
      };
    }
  }

  // 2. STOREFRONT-LEVEL SEO
  const storeCanonical = resolveCanonicalStorefrontUrl({
    customDomain: seoData.customDomain,
    customDomainStatus: seoData.customDomainStatus,
    slug: seoData.slug,
  });

  const title = seoData.seoTitle || `${seoData.storeName} – Official Online Store`;
  const description = seoData.seoDescription || `Welcome to ${seoData.storeName}. Browse our full catalog and order online with fast and reliable delivery.`;
  const ogTitle = seoData.ogTitle || seoData.seoTitle || seoData.storeName;
  const ogDescription = seoData.ogDescription || seoData.seoDescription || description;
  const ogImage = seoData.ogImage || seoData.socialShareImage || seoData.logoUrl;

  return {
    title,
    description,
    keywords: seoData.seoKeywords ? seoData.seoKeywords.split(',').map(s => s.trim()) : undefined,
    alternates: {
      canonical: storeCanonical,
    },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: storeCanonical,
      siteName: seoData.storeName,
      type: "website",
      images: ogImage ? [{ url: ogImage, alt: seoData.storeName }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: ogImage ? [ogImage] : undefined,
    },
    icons: {
      icon: seoData.faviconUrl || "/favicon.ico",
    },
  };
}

/**
 * Public Storefront Page: Multi-channel Identity Resolution (Phase 4A & 8)
 * Includes Server-side JSON-LD structured data and deep-linked product view.
 */
export default async function ShopPage(props: { 
  searchParams: Promise<{ bId?: string; slug?: string; pId?: string }> 
}) {
  const searchParams = await props.searchParams;
  const { resolvedId } = await resolveStoreBusinessId(searchParams);

  // DATA NODE FETCHING: Fetch public business profile and SEO data server-side
  let businessNode = null;
  let seoData = null;
  let jsonLdScripts: Record<string, any>[] = [];

  if (resolvedId) {
    [businessNode, seoData] = await Promise.all([
      getPublicBusinessNode(resolvedId),
      getStorefrontSeoData(resolvedId)
    ]);

    if (seoData) {
      const canonicalStoreUrl = resolveCanonicalStorefrontUrl({
        customDomain: seoData.customDomain,
        customDomainStatus: seoData.customDomainStatus,
        slug: seoData.slug,
      });

      // 1. Store / LocalBusiness JSON-LD
      jsonLdScripts.push(generateStoreJsonLd(seoData, canonicalStoreUrl));

      // 2. Product JSON-LD (if pId is in query or for top public products)
      if (searchParams.pId) {
        const product = await getProductSeoData(resolvedId, searchParams.pId);
        if (product) {
          const productCanonical = resolveCanonicalStorefrontUrl({
            customDomain: seoData.customDomain,
            customDomainStatus: seoData.customDomainStatus,
            slug: seoData.slug,
            productId: product.id,
          });
          jsonLdScripts.push(generateProductJsonLd(product, seoData, productCanonical));
        }
      } else {
        // Embed top 5 visible products in catalog structured data
        const topProducts = await getPublicStoreProductsForSeo(resolvedId, 5);
        topProducts.forEach(prod => {
          const prodUrl = `${canonicalStoreUrl}?pId=${prod.id}`;
          jsonLdScripts.push(generateProductJsonLd(prod, seoData!, prodUrl));
        });
      }
    }
  }

  // SECURITY GATE: Only allow published stores to render publicly
  const isPublished = businessNode?.status === 'published' || businessNode?.status === 'active' || businessNode?.status === 'pro';

  return (
    <>
      {/* Structured Data (JSON-LD) */}
      {jsonLdScripts.map((schema, index) => (
        <script
          key={`ld-json-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-primary h-10 w-10 opacity-20" />
        </div>
      }>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
        <ShopClient 
          initialBusiness={isPublished ? businessNode : null} 
          businessId={resolvedId}
          initialProductId={searchParams.pId || null}
          initialSeoData={seoData}
        />
      </Suspense>
    </>
  );
}
