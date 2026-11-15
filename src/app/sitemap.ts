import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { initializeAdmin } from '@/firebase/admin';
import { isPermissionDeniedError, restQueryCollection } from '@/firebase/firestore-rest';
import { getBusinessIdBySlug } from '@/app/actions/p0-migration';
import { 
  getStorefrontSeoData, 
  getPublicStoreProductsForSeo, 
  resolveCanonicalStorefrontUrl 
} from '@/lib/storefront-seo';

/**
 * Resolves businessId from a verified custom domain for sitemap generation.
 */
async function getVerifiedBusinessIdByDomain(domain: string): Promise<string | null> {
  try {
    const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0];

    if (
      cleanDomain.endsWith('.biztrix.in') ||
      cleanDomain.includes('localhost') ||
      cleanDomain.includes('run.app')
    ) {
      return null;
    }

    let docPath: string | null = null;
    let data: Record<string, any> | undefined;

    try {
      const { db } = initializeAdmin();
      const q = db.collectionGroup('websites')
        .where('customDomain', '==', cleanDomain)
        .limit(1);
      const snap = await q.get();
      if (snap.empty) return null;

      const doc = snap.docs[0];
      docPath = doc.ref.path;
      data = doc.data();
    } catch (adminErr: any) {
      if (!isPermissionDeniedError(adminErr)) throw adminErr;
      const docs = await restQueryCollection('', 'websites', {
        allDescendants: true,
        where: [{ field: 'customDomain', op: 'EQUAL', value: cleanDomain }],
        limit: 1,
      });
      if (docs.length === 0) return null;
      docPath = docs[0].__path;
      data = docs[0];
    }

    if (!docPath) return null;

    if (data?.customDomainStatus !== 'verified' && data?.customDomainStatus !== 'active') {
      return null;
    }

    return docPath.split('/')[1] || null;
  } catch (err) {
    console.error("[sitemap] getVerifiedBusinessIdByDomain error:", err);
    return null;
  }
}

/**
 * PHASE 8: PRODUCTION-GRADE STOREFRONT SITEMAP GENERATOR
 * Generates valid search engine sitemaps respecting tenant isolation and domain context.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headerList = await headers();
  const slugFromHeader = headerList.get('x-biztrix-slug');
  const customDomainFromHeader = headerList.get('x-biztrix-custom-domain');
  const hostHeader = headerList.get('host') || '';

  let businessId: string | null = null;

  // 1. Resolve tenant if request came through custom domain
  if (customDomainFromHeader) {
    businessId = await getVerifiedBusinessIdByDomain(customDomainFromHeader);
  } else if (hostHeader) {
    businessId = await getVerifiedBusinessIdByDomain(hostHeader);
  }

  // 2. Resolve tenant if request came through platform subdomain
  if (!businessId && slugFromHeader) {
    businessId = await getBusinessIdBySlug(slugFromHeader);
  }

  // If a specific store tenant is resolved:
  if (businessId) {
    const seoData = await getStorefrontSeoData(businessId);
    if (!seoData || (seoData.status !== 'published' && seoData.status !== 'active' && seoData.status !== 'pro')) {
      return [];
    }

    const canonicalStoreUrl = resolveCanonicalStorefrontUrl({
      customDomain: seoData.customDomain,
      customDomainStatus: seoData.customDomainStatus,
      slug: seoData.slug,
    });

    const storeEntry = {
      url: canonicalStoreUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    };

    // Bounded fetch of visible, non-archived products (limit 100)
    const products = await getPublicStoreProductsForSeo(businessId, 100);

    const productEntries = products.map((prod) => ({
      url: resolveCanonicalStorefrontUrl({
        customDomain: seoData.customDomain,
        customDomainStatus: seoData.customDomainStatus,
        slug: seoData.slug,
        productId: prod.id,
      }),
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    return [storeEntry, ...productEntries];
  }

  // Fallback: Platform root sitemap for main Biztrix application
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://biztrix.in').replace(/\/$/, '');

  return [
    {
      url: `${appUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${appUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${appUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${appUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];
}
