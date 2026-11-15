import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeStoreSections,
  sanitizeStoreSlug,
  resolveStorePreviewUrl,
  isStorePubliclyVisible,
  resolveMerchantWhatsAppPhone,
  computeStoreIntegrityAudit,
  determineRefundRestockEligibility,
  buildStorefrontCashbookEntry,
  normalizeStoreCoupons,
  evaluateCouponDiscount,
  computeStoreOrderPricing,
  computeFreeShippingProgress,
  sortAndFilterStoreProducts,
  matchesTrackOrderQuery,
  sanitizeTrackedOrderSummary,
  normalizeStoreThemeConfig,
  normalizeAnnouncementBar,
  normalizeFooterConfig,
  moveStoreSection,
  updateStoreSectionItem,
  getStoreFontFamilies,
  getProductGalleryImages,
  sanitizeExternalUrl,
  DEFAULT_STORE_SECTIONS,
  normalizeStoreTrackingConfig,
  isValidMetaPixelId,
  isValidGa4MeasurementId,
  sanitizeGoogleSiteVerification,
  normalizeStorePolicyConfig,
  DEFAULT_STORE_POLICY_CONFIG,
  toggleWishlistId,
  updateRecentlyViewedIds,
  reconcilePersistedCart,
  computeStorefrontFunnelMetrics,
  generateStorefrontActionInsights,
  STORE_SECTION_CATALOG,
  createStoreSection,
  removeStoreSection,
  deriveStorefrontCategorySummaries,
  extractYouTubeVideoId,
  buildGoogleMapsPlaceUrl,
  validateStorefrontLeadInput,
  STORE_FUNNEL_TEMPLATES,
  createFunnelFromTemplate,
  normalizeFunnelConfig,
  resolveFunnelPreviewUrl,
  computeFunnelMetrics,
} from "./storefront-engine";

test("normalizeStoreSections preserves legacy /website sections and injects catalog grid", () => {
  const legacy = [
    { id: "hero", label: "Hero Banner", status: "Active", iconName: "Globe" },
    { id: "featured", label: "Featured Products", status: "Inactive", iconName: "Layers" },
    { id: "timer", label: "Flash Sale Timer", status: "Active", iconName: "Clock" },
  ];

  const result = normalizeStoreSections(legacy);
  assert.equal(result.some((s) => s.type === "products" && s.status === "Active"), true);
  const featured = result.find((s) => s.id === "featured");
  assert.equal(featured?.status, "Inactive");
  assert.equal(featured?.type, "featured");
  const timer = result.find((s) => s.id === "timer");
  assert.equal(timer?.status, "Active");
  assert.equal(timer?.type, "timer");
});

test("normalizeStoreSections preserves visual editor custom content without losing status", () => {
  const editorSections = [
    {
      id: "s101",
      type: "hero",
      content: { title: "Monsoon Mega Sale", subtitle: "Up to 40% Off", cta: "Buy Now" },
    },
    {
      id: "s102",
      type: "about",
      status: "Inactive",
      content: { title: "Our Heritage", body: "Since 1998 in Raipur." },
    },
  ];

  const result = normalizeStoreSections(editorSections);
  const hero = result.find((s) => s.id === "s101");
  assert.equal(hero?.status, "Active");
  assert.equal(hero?.content.title, "Monsoon Mega Sale");
  assert.equal(hero?.content.cta, "Buy Now");

  const about = result.find((s) => s.id === "s102");
  assert.equal(about?.status, "Inactive");
  assert.equal(about?.content.body, "Since 1998 in Raipur.");
});

test("sanitizeStoreSlug and resolveStorePreviewUrl build safe preview links with bId fallback", () => {
  assert.equal(sanitizeStoreSlug("  My Ginger Store!! "), "my-ginger-store");
  assert.equal(
    resolveStorePreviewUrl({ slug: "", businessId: "biz_123", isPreview: true }),
    "/shop?bId=biz_123&preview=1"
  );
  assert.equal(
    resolveStorePreviewUrl({ slug: "ginger-mart", businessId: "biz_123" }),
    "/shop?slug=ginger-mart&bId=biz_123"
  );
});

test("isStorePubliclyVisible honors websiteStatus for trial and draft stores", () => {
  assert.equal(
    isStorePubliclyVisible({ websiteStatus: "published", businessStatus: "trial" }),
    true
  );
  assert.equal(
    isStorePubliclyVisible({ websiteStatus: "draft", businessStatus: "active" }),
    false
  );
  assert.equal(
    isStorePubliclyVisible({ websiteStatus: "draft", businessStatus: "active", isPreview: true }),
    true
  );
  assert.equal(
    isStorePubliclyVisible({ websiteStatus: "published", businessStatus: "suspended", isPreview: true }),
    false
  );
});

test("resolveMerchantWhatsAppPhone normalizes 0-prefixed and 10-digit Indian numbers", () => {
  assert.equal(
    resolveMerchantWhatsAppPhone({ contactPhone: "09907471591", businessPhone: "" }),
    "919907471591"
  );
  assert.equal(
    resolveMerchantWhatsAppPhone({ contactPhone: "", businessPhone: "+91 98765-43210" }),
    "919876543210"
  );
});

test("determineRefundRestockEligibility distinguishes unsettled vs paid/delivered orders", () => {
  assert.deepEqual(
    determineRefundRestockEligibility({ orderStatus: "payment_captured_unsettled", explicitRestock: true }),
    { wasStockDeducted: false, shouldRestock: false }
  );
  assert.deepEqual(
    determineRefundRestockEligibility({ orderStatus: "delivered" }),
    { wasStockDeducted: true, shouldRestock: true }
  );
  assert.deepEqual(
    determineRefundRestockEligibility({ orderStatus: "paid", explicitRestock: false }),
    { wasStockDeducted: true, shouldRestock: false }
  );
});

test("computeStoreIntegrityAudit and buildStorefrontCashbookEntry return accurate outputs", () => {
  const audit = computeStoreIntegrityAudit({
    storeName: "Ginger Fresh",
    slug: "ginger-fresh",
    logoUrl: "https://example.com/logo.png",
    primaryColor: "#5ac059",
    onlineProductsCount: 6,
    whatsappOrderEnabled: true,
    contactPhone: "09907471591",
    seoTitle: "Ginger Fresh Store",
    seoDescription: "Buy fresh organic groceries online.",
    websiteStatus: "published",
  });
  assert.equal(audit.score, 100);

  const cb = buildStorefrontCashbookEntry({
    businessId: "biz_1",
    orderId: "ORD-999",
    customerName: "Aarav Sharma",
    amount: 1499,
    direction: "credit",
    paymentMode: "Online (Razorpay)",
    dateIso: "2026-11-15T10:00:00.000Z",
  });
  assert.equal(cb.type, "credit");
  assert.equal(cb.category, "Sales");
  assert.equal(cb.amount, 1499);
  assert.equal(cb.date, "2026-11-15");
});

test("coupon validation enforces minOrder, expiry, percent cap, and flat discounts", () => {
  const coupons = normalizeStoreCoupons([
    {
      code: " welcome10 ",
      discountType: "percent",
      discountValue: 10,
      minOrderAmount: 500,
      maxDiscount: 150,
      active: true,
    },
    {
      code: "FLAT100",
      discountType: "flat",
      discountValue: 100,
      minOrderAmount: 0,
      expiresAt: "2025-01-01",
      active: true,
    },
    {
      code: "PAUSED",
      discountType: "flat",
      discountValue: 50,
      active: false,
    },
  ]);

  assert.equal(coupons.length, 3);
  assert.equal(coupons[0].code, "WELCOME10");

  // Below min order
  const belowMin = evaluateCouponDiscount({
    coupons,
    code: "welcome10",
    subtotal: 300,
    nowIso: "2026-11-15T00:00:00.000Z",
  });
  assert.equal(belowMin.valid, false);
  assert.equal(belowMin.discountAmount, 0);

  // Percentage with cap
  const capped = evaluateCouponDiscount({
    coupons,
    code: "WELCOME10",
    subtotal: 3000,
    nowIso: "2026-11-15T00:00:00.000Z",
  });
  assert.equal(capped.valid, true);
  assert.equal(capped.discountAmount, 150);

  // Expired coupon
  const expired = evaluateCouponDiscount({
    coupons,
    code: "FLAT100",
    subtotal: 500,
    nowIso: "2026-11-15T00:00:00.000Z",
  });
  assert.equal(expired.valid, false);

  // Inactive coupon
  const paused = evaluateCouponDiscount({
    coupons,
    code: "PAUSED",
    subtotal: 500,
    nowIso: "2026-11-15T00:00:00.000Z",
  });
  assert.equal(paused.valid, false);
});

test("computeStoreOrderPricing and computeFreeShippingProgress calculate totals & COD fees", () => {
  const coupons = normalizeStoreCoupons([
    { code: "SAVE200", discountType: "flat", discountValue: 200, minOrderAmount: 500, active: true },
  ]);
  const shippingConfig = { shippingFee: 60, freeShippingThreshold: 1000, codFee: 40 };

  // Net after discount = 900 < 1000 -> shipping applies + COD fee applies
  const codPricing = computeStoreOrderPricing({
    subtotal: 1100,
    coupons,
    couponCode: "SAVE200",
    shippingConfig,
    paymentMethod: "COD",
  });
  assert.equal(codPricing.discountAmount, 200);
  assert.equal(codPricing.shippingFee, 60);
  assert.equal(codPricing.codFee, 40);
  assert.equal(codPricing.grandTotal, 1000);

  // Net = 1200 >= 1000 -> free shipping + no COD fee for ONLINE
  const freePricing = computeStoreOrderPricing({
    subtotal: 1400,
    coupons,
    couponCode: "SAVE200",
    shippingConfig,
    paymentMethod: "ONLINE",
  });
  assert.equal(freePricing.shippingFee, 0);
  assert.equal(freePricing.codFee, 0);
  assert.equal(freePricing.grandTotal, 1200);

  const progress = computeFreeShippingProgress(750, shippingConfig);
  assert.equal(progress.hasThreshold, true);
  assert.equal(progress.qualified, false);
  assert.equal(progress.remainingAmount, 250);
  assert.equal(progress.progressPercent, 75);
});

test("sortAndFilterStoreProducts sorts by price and filters in-stock items", () => {
  const items = [
    { id: "1", name: "Alpha", price: 500, stock: 0, isFeatured: true },
    { id: "2", name: "Beta", price: 300, onlinePrice: 200, stock: 5 },
    { id: "3", name: "Gamma", price: 900, stock: 2 },
  ];

  const inStockAsc = sortAndFilterStoreProducts(items, {
    inStockOnly: true,
    sortBy: "price_asc",
  });
  assert.deepEqual(
    inStockAsc.map((x) => x.id),
    ["2", "3"]
  );

  const desc = sortAndFilterStoreProducts(items, { sortBy: "price_desc" });
  assert.deepEqual(
    desc.map((x) => x.id),
    ["3", "1", "2"]
  );
});

test("matchesTrackOrderQuery & sanitizeTrackedOrderSummary match phone/ID and strip PII", () => {
  assert.equal(
    matchesTrackOrderQuery({
      orderId: "ORD-1775660965-4821",
      orderPhone: "+91 9876543210",
      queryOrderId: "WRONG999",
      queryPhone: "09876543210",
    }),
    false
  );
  assert.equal(
    matchesTrackOrderQuery({
      orderId: "ORD-1775660965-4821",
      orderPhone: "+91 9876543210",
      queryOrderId: "965-4821",
      queryPhone: "9876543210",
    }),
    true
  );

  const summary = sanitizeTrackedOrderSummary({
    id: "ORD-1775660965-4821",
    status: "shipped",
    paymentMethod: "COD",
    customerData: {
      name: "Priya Patel",
      phone: "9876543210",
      address: "Private Home Address",
    },
    subtotal: 1000,
    discountAmount: 100,
    couponCode: "SAVE10",
    shippingFee: 50,
    codFee: 25,
    amount: 975,
    trackingNumber: "AWB998877",
    courierName: "Delhivery",
    items: [{ name: "Widget", quantity: 2, price: 500, lineTotal: 1000 }],
  });

  assert.equal(summary.customerFirstName, "Priya");
  assert.equal("customerData" in summary, false);
  assert.equal(summary.trackingNumber, "AWB998877");
  assert.equal(summary.totalAmount, 975);
});

test("normalizeStoreThemeConfig maps defaults and validates enums and heroImageUrl", () => {
  const minimalFallback = normalizeStoreThemeConfig(undefined, "minimal");
  assert.equal(minimalFallback.fontPair, "jakarta");
  assert.equal(minimalFallback.themeSurface, "light");
  assert.equal(minimalFallback.heroLayout, "classic_banner");
  assert.equal(minimalFallback.cardRadius, "sharp");
  assert.equal(minimalFallback.buttonStyle, "solid");
  assert.equal(minimalFallback.gridColumns, 4);

  const custom = normalizeStoreThemeConfig({
    fontPair: "playfair",
    themeSurface: "charcoal",
    heroLayout: "editorial_cover",
    heroImageUrl: "javascript:alert(1)",
    cardRadius: "soft",
    buttonStyle: "pill",
    gridColumns: 3,
  });
  assert.equal(custom.fontPair, "playfair");
  assert.equal(custom.themeSurface, "charcoal");
  assert.equal(custom.heroLayout, "editorial_cover");
  assert.equal(custom.heroImageUrl, "");
  assert.equal(custom.cardRadius, "soft");
  assert.equal(custom.buttonStyle, "pill");
  assert.equal(custom.gridColumns, 3);

  const validImg = normalizeStoreThemeConfig({
    heroImageUrl: "https://cdn.example.com/banner.webp",
  });
  assert.equal(validImg.heroImageUrl, "https://cdn.example.com/banner.webp");
});

test("normalizeAnnouncementBar & normalizeFooterConfig sanitize colors and external links", () => {
  assert.equal(sanitizeExternalUrl("javascript:alert(1)"), "");
  assert.equal(sanitizeExternalUrl("instagram.com/myshop"), "https://instagram.com/myshop");
  assert.equal(sanitizeExternalUrl("#store-catalog"), "#store-catalog");

  const bar = normalizeAnnouncementBar({
    enabled: true,
    text: "Diwali Sale Live — Flat 15% OFF",
    ctaLabel: "Grab Deal",
    ctaUrl: "javascript:evil()",
    bgColor: "not-hex",
    textColor: "#fef08a",
  });
  assert.equal(bar.enabled, true);
  assert.equal(bar.ctaUrl, "");
  assert.equal(bar.bgColor, "#0F172A");
  assert.equal(bar.textColor, "#fef08a");

  const footer = normalizeFooterConfig({
    tagline: "Handcrafted essentials from Jaipur",
    instagramUrl: "instagram.com/jaipurcraft",
    youtubeUrl: "https://youtube.com/@jaipurcraft",
    showTrustHighlights: true,
    trustHighlights: ["Free Returns", "100% Authentic"],
  });
  assert.equal(footer.instagramUrl, "https://instagram.com/jaipurcraft");
  assert.equal(footer.youtubeUrl, "https://youtube.com/@jaipurcraft");
  assert.deepEqual(footer.trustHighlights, ["Free Returns", "100% Authentic"]);
});

test("moveStoreSection and updateStoreSectionItem reorder and edit immutably", () => {
  const initial = DEFAULT_STORE_SECTIONS.map((s) => ({ ...s, content: { ...s.content } }));
  const firstId = initial[0].id;
  const secondId = initial[1].id;

  // Moving first item up should be a safe no-op
  const noopUp = moveStoreSection(initial, firstId, "up");
  assert.equal(noopUp[0].id, firstId);

  // Moving first item down swaps index 0 and 1
  const movedDown = moveStoreSection(initial, firstId, "down");
  assert.equal(movedDown[0].id, secondId);
  assert.equal(movedDown[1].id, firstId);
  assert.equal(initial[0].id, firstId); // original untouched

  const updated = updateStoreSectionItem(movedDown, firstId, {
    label: "Summer Hero",
    content: { title: "Summer Collection", cta: "Browse Now" },
  });
  const hero = updated.find((s) => s.id === firstId);
  assert.equal(hero?.label, "Summer Hero");
  assert.equal(hero?.content.title, "Summer Collection");
  assert.equal(hero?.content.cta, "Browse Now");
  assert.ok(hero?.content.subtitle); // preserved existing content keys
});

test("getStoreFontFamilies and getProductGalleryImages return clean font tokens and unique images", () => {
  assert.match(getStoreFontFamilies("playfair").headingFont, /Playfair Display/);
  assert.match(getStoreFontFamilies("outfit").headingFont, /Outfit/);
  assert.match(getStoreFontFamilies("jakarta").bodyFont, /DM Sans/);

  const gallery = getProductGalleryImages({
    images: ["https://cdn.example.com/1.png", "", "https://cdn.example.com/2.png"],
    imageUrl: "https://cdn.example.com/1.png",
    image: "https://cdn.example.com/3.png",
  });
  assert.deepEqual(gallery, [
    "https://cdn.example.com/1.png",
    "https://cdn.example.com/2.png",
    "https://cdn.example.com/3.png",
  ]);
});

test("Phase 3: tracking ID sanitizers, validators & policy config normalize cleanly", () => {
  assert.equal(isValidMetaPixelId("123456789012345"), true);
  assert.equal(isValidMetaPixelId("12345"), false);
  assert.equal(isValidGa4MeasurementId("G-ABC12345XY"), true);
  assert.equal(isValidGa4MeasurementId("UA-12345-1"), false);

  assert.equal(
    sanitizeGoogleSiteVerification('<meta name="google-site-verification" content="abcDEF_123456-xyz" />'),
    "abcDEF_123456-xyz"
  );

  const tracking = normalizeStoreTrackingConfig({
    metaPixelId: " 998877665544abc ",
    ga4MeasurementId: " g-xyz98765 ",
    googleSiteVerification: "token_1234567890",
  });
  assert.equal(tracking.metaPixelId, "998877665544");
  assert.equal(tracking.ga4MeasurementId, "G-XYZ98765");
  assert.equal(tracking.googleSiteVerification, "token_1234567890");

  const policies = normalizeStorePolicyConfig({
    shippingPolicy: "Ships same day before 4 PM.",
    returnPolicy: "",
  });
  assert.equal(policies.shippingPolicy, "Ships same day before 4 PM.");
  assert.equal(policies.returnPolicy, DEFAULT_STORE_POLICY_CONFIG.returnPolicy);
  assert.equal(policies.supportHours, DEFAULT_STORE_POLICY_CONFIG.supportHours);
});

test("Phase 3: retention helpers handle wishlist, recently viewed & live stock cart reconciliation", () => {
  let saved = toggleWishlistId([], "p1");
  saved = toggleWishlistId(saved, "p2");
  assert.deepEqual(saved, ["p2", "p1"]);
  saved = toggleWishlistId(saved, "p1");
  assert.deepEqual(saved, ["p2"]);

  let recent: string[] = [];
  for (const id of ["p1", "p2", "p3", "p4", "p5", "p6", "p7"]) {
    recent = updateRecentlyViewedIds(recent, id, 6);
  }
  assert.deepEqual(recent, ["p7", "p6", "p5", "p4", "p3", "p2"]);
  recent = updateRecentlyViewedIds(recent, "p4", 6);
  assert.equal(recent[0], "p4");

  const liveCatalog = [
    { id: "p1", name: "Organic Tea", price: 400, onlinePrice: 350, stock: 2, showOnWebsite: true },
    { id: "p2", name: "Out Of Stock", price: 200, stock: 0, showOnWebsite: true },
    { id: "p3", name: "Hidden Item", price: 150, stock: 10, showOnWebsite: false },
  ];
  const hydrated = reconcilePersistedCart(
    [
      { id: "p1", name: "Old Name", price: 500, quantity: 5 },
      { id: "p2", name: "Out Of Stock", price: 200, quantity: 1 },
      { id: "p3", name: "Hidden Item", price: 150, quantity: 1 },
    ],
    liveCatalog
  );
  assert.equal(hydrated.length, 1);
  assert.equal(hydrated[0].name, "Organic Tea");
  assert.equal(hydrated[0].price, 350);
  assert.equal(hydrated[0].quantity, 2); // capped to live stock
});

test("Phase 3: funnel metrics & deterministic diagnostics compute real rates and zero-result queries", () => {
  const events = [
    { sessionId: "s1", device: "mobile", eventName: "storefront_view" },
    { sessionId: "s1", device: "mobile", eventName: "product_view", data: { name: "Ginger" } },
    { sessionId: "s1", device: "mobile", eventName: "add_to_cart", data: { name: "Ginger" } },
    { sessionId: "s1", device: "mobile", eventName: "begin_checkout" },
    { sessionId: "s2", device: "desktop", eventName: "storefront_view" },
    { sessionId: "s2", device: "desktop", eventName: "search", data: { query: "Cardamom", resultsCount: 0 } },
    { sessionId: "s2", device: "desktop", eventName: "search", data: { query: "Cardamom", resultsCount: 0 } },
    { sessionId: "s2", device: "desktop", eventName: "whatsapp_order_click" },
  ];
  const paidOrders = [{ id: "ord1", amount: 950, couponCode: "WELCOME10", discountAmount: 50 }];

  const funnel = computeStorefrontFunnelMetrics(events, paidOrders);
  assert.equal(funnel.uniqueSessions, 2);
  assert.equal(funnel.storefrontViews, 2);
  assert.equal(funnel.productViews, 1);
  assert.equal(funnel.addToCarts, 1);
  assert.equal(funnel.beginCheckouts, 1);
  assert.equal(funnel.whatsappClicks, 1);
  assert.equal(funnel.paidOrders, 1);
  assert.equal(funnel.averageOrderValue, 950);
  assert.equal(funnel.couponOrdersCount, 1);
  assert.equal(funnel.deviceBreakdown.mobilePercent, 50);
  assert.equal(funnel.topSearchQueries[0].query, "Cardamom");
  assert.equal(funnel.topSearchQueries[0].zeroResults, 2);

  const insights = generateStorefrontActionInsights({
    websiteStatus: "published",
    onlineProductsCount: 6,
    activeCouponsCount: 0,
    freeShippingThreshold: 0,
    heroLayout: "classic_banner",
    trackingConfig: { metaPixelId: "", ga4MeasurementId: "", googleSiteVerification: "" },
    seoTitle: "Store",
    seoDescription: "Store desc",
    funnel,
  });
  assert.equal(insights.some((i) => i.id === "missed-search-demand"), true);
  assert.equal(insights.some((i) => i.id === "add-first-coupon"), true);
});

test("Pro E-Commerce Sections: catalog exposes all 23 sections & protects last products grid on remove", () => {
  assert.equal(STORE_SECTION_CATALOG.length, 23);
  const newTypes = [
    "trust_strip",
    "categories",
    "new_arrivals",
    "offers",
    "media_showcase",
    "faq",
    "store_location",
    "newsletter",
  ] as const;

  let list = [...DEFAULT_STORE_SECTIONS];
  for (const t of newTypes) {
    assert.equal(
      STORE_SECTION_CATALOG.some((c) => c.type === t),
      true,
      `Missing catalog entry for ${t}`
    );
    list = [...list, createStoreSection(t)];
  }

  const normalized = normalizeStoreSections(list);
  for (const t of newTypes) {
    assert.equal(
      normalized.some((s) => s.type === t && s.status === "Active"),
      true,
      `Section ${t} not preserved after normalization`
    );
  }

  // Attempting to delete the sole remaining catalog products grid should be guarded
  const afterAttemptedDelete = removeStoreSection(normalized, "products");
  assert.equal(afterAttemptedDelete.some((s) => s.type === "products"), true);

  // Deleting an optional added section succeeds
  const faqSection = normalized.find((s) => s.type === "faq")!;
  const afterFaqDelete = removeStoreSection(normalized, faqSection.id);
  assert.equal(afterFaqDelete.some((s) => s.id === faqSection.id), false);
});

test("Pro E-Commerce Sections: category summaries, YouTube parser, map URL & lead validation", () => {
  const summaries = deriveStorefrontCategorySummaries([
    { id: "1", category: "Spices", price: 300, onlinePrice: 250, showOnWebsite: true, images: ["https://img/1.jpg"] },
    { id: "2", category: "Spices", price: 180, showOnWebsite: true },
    { id: "3", category: "Tea", price: 500, onlinePrice: 450, showOnWebsite: true },
    { id: "4", category: "Archived", price: 100, showOnWebsite: true, isArchived: true },
    { id: "5", category: "Hidden", price: 100, showOnWebsite: false },
  ]);
  assert.equal(summaries.length, 2);
  assert.equal(summaries[0].name, "Spices");
  assert.equal(summaries[0].count, 2);
  assert.equal(summaries[0].minPrice, 180);
  assert.equal(summaries[0].imageUrl, "https://img/1.jpg");

  assert.equal(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(extractYouTubeVideoId("https://youtube.com/shorts/abcDEF12345"), "abcDEF12345");
  assert.equal(extractYouTubeVideoId("javascript:alert(1)"), null);

  assert.equal(
    buildGoogleMapsPlaceUrl("", "Main Road Raipur", "Ginger Mart").includes("Ginger%20Mart"),
    true
  );

  assert.equal(validateStorefrontLeadInput({ name: "A", contact: "9876543210" }).valid, false);
  assert.deepEqual(
    validateStorefrontLeadInput({ name: "Aarav", contact: "+91 98765-43210" }),
    { valid: true, contactType: "phone", cleanedContact: "9876543210" }
  );
  assert.deepEqual(
    validateStorefrontLeadInput({ name: "Neha", contact: "Neha@Example.com" }),
    { valid: true, contactType: "email", cleanedContact: "neha@example.com" }
  );
  assert.equal(validateStorefrontLeadInput({ name: "Ravi", contact: "bad@email" }).valid, false);
});

test("Sales Funnel Engine: supports 7 funnel blocks, allows removing products on funnels, and builds templates cleanly", () => {
  const funnelBlockTypes = [
    "problem_solution",
    "comparison_table",
    "how_it_works",
    "offer_stack",
    "pricing_tiers",
    "guarantee_seal",
    "express_checkout",
  ] as const;

  for (const t of funnelBlockTypes) {
    assert.equal(
      STORE_SECTION_CATALOG.some((c) => c.type === t && c.group === "funnel"),
      true,
      `Missing funnel catalog entry for ${t}`
    );
  }

  assert.equal(STORE_FUNNEL_TEMPLATES.length, 3);
  const combo = createFunnelFromTemplate({
    templateId: "combo_cod",
    targetProductId: "prod_1",
    targetProductName: "Organic Turmeric Combo",
  });
  assert.equal(combo.kind, "funnel");
  assert.equal(combo.templateId, "combo_cod");
  assert.equal(combo.targetProductId, "prod_1");
  assert.equal(combo.sections.some((s) => s.type === "pricing_tiers"), true);
  assert.equal(combo.sections.some((s) => s.type === "express_checkout"), true);

  // Funnels do not force-inject a catalog products grid
  const normalizedFunnelSections = normalizeStoreSections(combo.sections, {
    requireCatalogGrid: false,
  });
  assert.equal(normalizedFunnelSections.some((s) => s.type === "products"), false);

  // Removing products section is permitted when protectProducts is false
  const withProducts = [createStoreSection("hero"), createStoreSection("products")];
  const removed = removeStoreSection(withProducts, withProducts[1].id, {
    protectProducts: false,
  });
  assert.equal(removed.some((s) => s.type === "products"), false);

  // Normalize funnel config sanitizes accent colors and coupon codes
  const normalized = normalizeFunnelConfig({
    id: "funnel_diwali",
    name: "Diwali Mega Combo",
    slug: " Diwali Mega!! ",
    templateId: "combo_cod",
    couponCode: " diwali20 ",
    inheritStoreTheme: false,
    accentColorOverride: "invalid-color",
  });
  assert.equal(normalized.slug, "diwali-mega");
  assert.equal(normalized.couponCode, "DIWALI20");
  assert.equal(normalized.accentColorOverride, "");

  assert.equal(
    resolveFunnelPreviewUrl({
      businessId: "biz_1",
      businessSlug: "my-store",
      funnelId: "funnel_1",
      funnelSlug: "combo-deal",
      isPreview: true,
    }),
    "/funnel?slug=my-store&bId=biz_1&fId=funnel_1&fSlug=combo-deal&preview=1"
  );
});

test("Sales Funnel Analytics: computeFunnelMetrics attributes views, checkouts, paid revenue & leads", () => {
  const metrics = computeFunnelMetrics({
    funnelId: "funnel_launch",
    funnelSlug: "launch-offer",
    events: [
      { eventName: "page_view", funnelId: "funnel_launch" },
      { eventName: "page_view", funnelSlug: "launch-offer" },
      { eventName: "begin_checkout", funnelId: "funnel_launch" },
      { eventName: "page_view", funnelId: "other_funnel" },
    ],
    orders: [
      { id: "o1", status: "paid", amount: 1499, funnelId: "funnel_launch" },
      { id: "o2", status: "cancelled", amount: 999, funnelId: "funnel_launch" },
      { id: "o3", status: "delivered", amount: 500, funnelId: "other_funnel" },
    ],
    leads: [
      { id: "l1", funnelId: "funnel_launch" },
      { id: "l2", funnelSlug: "launch-offer" },
      { id: "l3", funnelId: "other_funnel" },
    ],
  });

  assert.equal(metrics.views, 2);
  assert.equal(metrics.checkoutsStarted, 1);
  assert.equal(metrics.ordersCount, 1);
  assert.equal(metrics.revenue, 1499);
  assert.equal(metrics.leadsCount, 2);
  assert.equal(metrics.conversionRate, 150);
});



