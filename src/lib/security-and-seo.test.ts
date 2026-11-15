import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveCanonicalStorefrontUrl,
  generateStoreJsonLd,
  generateProductJsonLd,
} from './storefront-seo';
import {
  isPermissionDeniedError,
  incrementSentinel,
  SERVER_TIMESTAMP_SENTINEL,
} from '../firebase/firestore-rest';
import { resolveGeminiApiKey } from './gemini';

test('resolveCanonicalStorefrontUrl follows Priority 1 (verified custom domain) -> Priority 2 (slug) -> Priority 3 (default)', () => {
  assert.equal(
    resolveCanonicalStorefrontUrl({
      customDomain: 'https://Shop.Brand.com/',
      customDomainStatus: 'verified',
      slug: 'brand',
      productId: 'prod 1',
    }),
    'https://shop.brand.com?pId=prod%201'
  );

  assert.equal(
    resolveCanonicalStorefrontUrl({
      customDomain: 'shop.brand.com',
      customDomainStatus: 'pending',
      slug: 'My Brand',
    }),
    'https://my-brand.biztrix.in'
  );

  const fallback = resolveCanonicalStorefrontUrl({});
  assert.ok(fallback.endsWith('/shop'), `Expected /shop suffix, got ${fallback}`);
  assert.equal(fallback.includes('bId='), false);
});

test('generateStoreJsonLd and generateProductJsonLd build valid schema.org payloads', () => {
  const seoData = {
    businessId: 'biz_1',
    storeName: 'Solar Mart',
    currency: 'INR',
    contactPhone: '9876543210',
  };
  const storeLd = generateStoreJsonLd(seoData, 'https://solarmart.biztrix.in');
  assert.equal(storeLd['@type'], 'OnlineStore');
  assert.equal(storeLd.name, 'Solar Mart');
  assert.equal(storeLd.telephone, '9876543210');

  const productLd = generateProductJsonLd(
    {
      id: 'p1',
      name: '5kW Inverter',
      price: 45000,
      onlinePrice: 42000,
      stock: 3,
      minThreshold: 1,
      showOnWebsite: true,
    },
    seoData,
    'https://solarmart.biztrix.in?pId=p1'
  );
  assert.equal(productLd['@type'], 'Product');
  assert.equal(productLd.offers.price, 42000);
  assert.equal(productLd.offers.availability, 'https://schema.org/InStock');
});

test('isPermissionDeniedError detects gRPC, Firebase client, and REST permission errors', () => {
  assert.equal(isPermissionDeniedError({ code: 7, message: '7 PERMISSION_DENIED' }), true);
  assert.equal(isPermissionDeniedError({ code: 'permission-denied' }), true);
  assert.equal(isPermissionDeniedError(new Error('Missing or insufficient permissions.')), true);
  assert.equal(isPermissionDeniedError(new Error('Network timeout')), false);
  assert.equal(isPermissionDeniedError(null), false);
  assert.deepEqual(incrementSentinel(-2), { __increment: -2 });
  assert.deepEqual(SERVER_TIMESTAMP_SENTINEL, { __serverTimestamp: true });
});

test('resolveGeminiApiKey rejects placeholder keys', () => {
  const orig = process.env.GEMINI_API_KEY;
  try {
    process.env.GEMINI_API_KEY = 'MY_GEMINI_API_KEY';
    assert.equal(resolveGeminiApiKey(), '');
    process.env.GEMINI_API_KEY = 'YOUR_API_KEY_HERE';
    assert.equal(resolveGeminiApiKey(), '');
  } finally {
    if (orig === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = orig;
  }
});

test('firestore.rules enforces hardened multi-tenant invariants without global bypass', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  // Global bypass must NOT exist
  assert.equal(
    /match\s+\/\{allPaths=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+true;/m.test(rules),
    false,
    'Global allow read, write: if true bypass must be removed'
  );

  // Global wildcard must be restricted to platform owner
  assert.equal(
    /match\s+\/\{allPaths=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+isPlatformOwner\(\);/m.test(rules),
    true
  );

  // privateConfig must be completely denied to clients
  assert.equal(
    /match\s+\/privateConfig\/\{docId\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;/m.test(rules),
    true
  );

  // /users must require authentication and prohibit open allow read/create: if true
  assert.equal(/match\s+\/users\/\{userId\}\s*\{[^}]*allow\s+read:\s*if\s+true;/m.test(rules), false);
  assert.equal(/match\s+\/users\/\{userId\}\s*\{[^}]*allow\s+create:\s*if\s+true;/m.test(rules), false);

  // /system/config must allow read (branding) while /system/{document=**} stays owner-only
  assert.equal(/match\s+\/system\/config\/\{document=\*\*\}\s*\{[^}]*allow\s+read:\s*if\s+true;/m.test(rules), true);
});
