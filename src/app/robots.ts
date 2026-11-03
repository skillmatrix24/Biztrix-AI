import { MetadataRoute } from 'next';
import { headers } from 'next/headers';

/**
 * PHASE 8: PRODUCTION ROBOTS.TXT CONTROLLER
 * 
 * Rules:
 * 1. Public storefront routes (/shop, /shop/*) can be indexed by search engines
 * 2. Private merchant & operational routes are strictly disallowed
 * 3. Customer & invoice private data is shielded
 * 4. Development/test query parameters (/*?bId=*) are blocked from indexing
 * 5. Points to authoritative dynamic sitemap
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const headerList = await headers();
  const host = headerList.get('host') || 'biztrix.in';
  const proto = headerList.get('x-forwarded-proto') || 'https';
  const baseUrl = `${proto}://${host}`;

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/shop',
          '/shop/*',
          '/pricing',
        ],
        disallow: [
          '/api/',
          '/billing/',
          '/dashboard/',
          '/settings/',
          '/customers/',
          '/inventory/',
          '/website/orders/',
          '/website/domains/',
          '/owner/',
          '/notes/',
          '/staff/',
          '/accounting/',
          '/fixed-expenses/',
          '/daily-entries/',
          '/whatsapp-automation/',
          '/solar/',
          '/properties/',
          '/*?bId=*',
          '/*?test=*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
