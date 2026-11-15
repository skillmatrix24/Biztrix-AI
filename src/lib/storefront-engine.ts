/**
 * @fileOverview Pure Storefront & Store Builder Engine.
 * Decouples section normalization, URL resolution, publish visibility rules,
 * WhatsApp phone formatting, store readiness auditing, refund restock rules,
 * and cashbook ledger entry builders from UI components.
 */

export type StoreSectionType =
  | "hero"
  | "trust_strip"
  | "categories"
  | "featured"
  | "new_arrivals"
  | "offers"
  | "timer"
  | "products"
  | "media_showcase"
  | "testimonials"
  | "faq"
  | "about"
  | "store_location"
  | "newsletter"
  | "contact"
  | "whatsapp"
  | "problem_solution"
  | "comparison_table"
  | "how_it_works"
  | "offer_stack"
  | "pricing_tiers"
  | "guarantee_seal"
  | "express_checkout";

export interface StoreTrustItem {
  title: string;
  subtitle: string;
  icon?: string;
}

export interface StoreFaqItem {
  question: string;
  answer: string;
}

export interface FunnelComparisonRow {
  feature: string;
  us: boolean;
  others: boolean;
}

export interface FunnelHowItWorksStep {
  stepNumber: string;
  title: string;
  description: string;
}

export interface FunnelStackItem {
  title: string;
  value: number;
}

export interface FunnelPricingTier {
  id: string;
  name: string;
  badge?: string;
  price: number;
  compareAtPrice?: number;
  quantityMultiplier?: number;
  features: string[];
  cta: string;
  highlight?: boolean;
}

export interface StoreSectionContent {
  title?: string;
  subtitle?: string;
  cta?: string;
  body?: string;
  badgeText?: string;
  limit?: number;
  showPricing?: boolean;
  offerCode?: string;
  discountLabel?: string;
  endTimeIso?: string;
  mediaUrl?: string;
  deliveryZones?: string;
  mapUrl?: string;
  pickupEnabled?: boolean;
  trustItems?: StoreTrustItem[];
  faqs?: StoreFaqItem[];
  testimonials?: Array<{
    name: string;
    role?: string;
    quote: string;
    rating?: number;
  }>;
  painTitle?: string;
  solutionTitle?: string;
  painPoints?: string[];
  solutionPoints?: string[];
  usLabel?: string;
  othersLabel?: string;
  comparisonRows?: FunnelComparisonRow[];
  steps?: FunnelHowItWorksStep[];
  stackItems?: FunnelStackItem[];
  offerPrice?: number;
  regularPrice?: number;
  pricingTiers?: FunnelPricingTier[];
  guaranteeDays?: number;
  orderBumpEnabled?: boolean;
  orderBumpTitle?: string;
  orderBumpDescription?: string;
  orderBumpPrice?: number;
  orderBumpProductId?: string;
}

export interface StoreSection {
  id: string;
  type: StoreSectionType;
  label: string;
  status: "Active" | "Inactive";
  iconName: string;
  content: StoreSectionContent;
}

export type StoreUiStyle = "modern" | "minimal" | "classic";

export interface StoreIntegrityCheckItem {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
  detail: string;
  targetTab: "overview" | "design" | "catalog" | "seo" | "settings";
}

export interface StoreIntegrityReport {
  score: number;
  seoScore: number;
  catalogScore: number;
  checks: StoreIntegrityCheckItem[];
}

export interface StoreSectionCatalogEntry {
  type: StoreSectionType;
  label: string;
  description: string;
  group: "core" | "merchandising" | "trust_conversion" | "funnel";
  iconName: string;
}

export const DEFAULT_TRUST_ITEMS: StoreTrustItem[] = [
  {
    title: "Same-Day Dispatch",
    subtitle: "Fast order verification & packing",
    icon: "Truck",
  },
  {
    title: "7-Day Easy Returns",
    subtitle: "Hassle-free replacement support",
    icon: "ShieldCheck",
  },
  {
    title: "100% Genuine Stock",
    subtitle: "Quality-checked merchant inventory",
    icon: "BadgeCheck",
  },
  {
    title: "Secure UPI & COD",
    subtitle: "Pay online or on doorstep delivery",
    icon: "Banknote",
  },
];

export const DEFAULT_FAQ_ITEMS: StoreFaqItem[] = [
  {
    question: "How long does delivery take after placing an order?",
    answer:
      "Orders are verified and dispatched within 24-48 business hours. Local deliveries arrive in 1-3 days and pan-India shipments take 3-7 business days.",
  },
  {
    question: "Is Cash on Delivery (COD) available?",
    answer:
      "Yes, when Cash on Delivery is enabled for your cart, you can confirm your order with your delivery address and pay via cash or UPI at the doorstep.",
  },
  {
    question: "Will I receive an invoice or GST bill?",
    answer:
      "Yes, every confirmed storefront order includes an itemized merchant receipt and invoice generated directly from our billing desk.",
  },
  {
    question: "What is the return or replacement process?",
    answer:
      "Unused items in original packaging are eligible for return or replacement within 7 days of delivery. Share your Order ID on WhatsApp or call our support desk.",
  },
];

export const DEFAULT_COMPARISON_ROWS: FunnelComparisonRow[] = [
  { feature: "100% Authentic Direct-from-Merchant Stock", us: true, others: false },
  { feature: "Same-Day Verification & Tracked Dispatch", us: true, others: false },
  { feature: "Itemized GST Invoice & Official Warranty", us: true, others: false },
  { feature: "7-Day Hassle-Free Replacement Guarantee", us: true, others: false },
  { feature: "Direct WhatsApp Desk Support & COD Available", us: true, others: false },
];

export const DEFAULT_HOW_IT_WORKS_STEPS: FunnelHowItWorksStep[] = [
  {
    stepNumber: "01",
    title: "Select Your Pack",
    description: "Choose the bundle or single pack that fits your needs and apply any live promo code.",
  },
  {
    stepNumber: "02",
    title: "Confirm Express Order",
    description: "Pay securely via UPI/Razorpay or lock Cash on Delivery in under 30 seconds.",
  },
  {
    stepNumber: "03",
    title: "Fast Tracked Delivery",
    description: "Receive instant order confirmation and doorstep delivery straight from our desk.",
  },
];

export const DEFAULT_STACK_ITEMS: FunnelStackItem[] = [
  { title: "Signature Flagship Product (Full Pack)", value: 1999 },
  { title: "Priority Insured Express Shipping", value: 199 },
  { title: "Extended 6-Month Replacement Protection", value: 499 },
  { title: "VIP WhatsApp Concierge Support & Quick Guide", value: 299 },
];

export const DEFAULT_PRICING_TIERS: FunnelPricingTier[] = [
  {
    id: "tier_starter",
    name: "Single Starter Pack",
    badge: "Try It Out",
    price: 999,
    compareAtPrice: 1499,
    quantityMultiplier: 1,
    features: ["1x Standard Unit", "Official GST Receipt", "Tracked Delivery"],
    cta: "Select Starter",
    highlight: false,
  },
  {
    id: "tier_popular",
    name: "Most Popular Duo",
    badge: "BEST VALUE",
    price: 1799,
    compareAtPrice: 2998,
    quantityMultiplier: 2,
    features: ["2x Units (Save Extra)", "Free Priority Delivery", "Priority WhatsApp Support"],
    cta: "Claim Best Value",
    highlight: true,
  },
  {
    id: "tier_family",
    name: "Value Family Bundle",
    badge: "MAX SAVINGS",
    price: 2499,
    compareAtPrice: 4497,
    quantityMultiplier: 3,
    features: ["3x Complete Units", "Free Priority Delivery", "Extended Warranty Included"],
    cta: "Claim Family Pack",
    highlight: false,
  },
];

const SECTION_META: Record<
  StoreSectionType,
  {
    label: string;
    description: string;
    group: "core" | "merchandising" | "trust_conversion" | "funnel";
    iconName: string;
    defaultContent: StoreSectionContent;
  }
> = {
  hero: {
    label: "Hero Banner",
    description: "Main storefront headline, brand visual, and primary CTA.",
    group: "core",
    iconName: "Globe",
    defaultContent: {
      badgeText: "Verified Merchant Catalog",
      title: "",
      subtitle:
        "Browse our authentic catalog and place direct orders with secure online payment, Cash on Delivery, or WhatsApp.",
      cta: "Explore Catalog",
    },
  },
  trust_strip: {
    label: "Benefits & Trust Strip",
    description: "4-pillar guarantee row (Fast Dispatch, Easy Returns, Genuine Stock, Safe Pay).",
    group: "trust_conversion",
    iconName: "ShieldCheck",
    defaultContent: {
      title: "Why Shop Direct With Us",
      subtitle: "Verified merchant promises backed by our store desk",
      trustItems: DEFAULT_TRUST_ITEMS.map((item) => ({ ...item })),
    },
  },
  categories: {
    label: "Shop by Category",
    description: "Interactive category cards auto-generated from your live catalog.",
    group: "merchandising",
    iconName: "LayoutGrid",
    defaultContent: {
      title: "Shop by Category",
      subtitle: "Jump straight to what you need from our curated collections",
      limit: 6,
    },
  },
  featured: {
    label: "Featured & Best Sellers",
    description: "Spotlight best sellers and featured items above the main grid.",
    group: "merchandising",
    iconName: "Layers",
    defaultContent: {
      title: "Featured Picks & Best Sellers",
      subtitle: "Top-rated items handpicked from our live inventory",
      limit: 4,
      showPricing: true,
    },
  },
  new_arrivals: {
    label: "New Arrivals Row",
    description: "Dedicated showcase for your latest added products and fresh drops.",
    group: "merchandising",
    iconName: "Sparkles",
    defaultContent: {
      title: "New Arrivals & Fresh Stock",
      subtitle: "Just added to our online storefront inventory",
      limit: 4,
      showPricing: true,
      cta: "View Latest Catalog",
    },
  },
  offers: {
    label: "Live Coupons & Offers",
    description: "Shows active promo codes with 1-click Copy & Apply to Shopping Bag.",
    group: "trust_conversion",
    iconName: "Ticket",
    defaultContent: {
      title: "Active Offers & Promo Codes",
      subtitle: "Tap any active code to copy and apply instantly at checkout",
      cta: "Apply Code",
    },
  },
  timer: {
    label: "Flash Sale Timer",
    description: "Countdown deal banner to create urgency around limited offers.",
    group: "trust_conversion",
    iconName: "Clock",
    defaultContent: {
      title: "Limited-Time Storefront Offer",
      subtitle: "Order before the countdown ends to lock special online pricing",
      discountLabel: "EXTRA SAVINGS LIVE",
      cta: "Shop Deal Now",
    },
  },
  products: {
    label: "Catalog Grid",
    description: "Main searchable, sortable, filterable product grid.",
    group: "core",
    iconName: "ShoppingBag",
    defaultContent: {
      title: "Our Catalog",
      limit: 24,
      showPricing: true,
    },
  },
  media_showcase: {
    label: "Product Demo & Brand Reel",
    description: "Split video or product showcase story to demonstrate quality in action.",
    group: "merchandising",
    iconName: "PlayCircle",
    defaultContent: {
      badgeText: "Product Spotlight",
      title: "See Our Quality Up Close",
      subtitle: "Watch our product walkthrough and craftsmanship standards",
      body: "Every item passes multi-point inspection before dispatch so what you see online is exactly what arrives at your doorstep.",
      mediaUrl: "",
      cta: "Explore Featured Stock",
    },
  },
  testimonials: {
    label: "Customer Testimonials",
    description: "Social proof cards from verified buyers and repeat clients.",
    group: "trust_conversion",
    iconName: "CheckCircle2",
    defaultContent: {
      title: "Trusted by Verified Buyers",
      subtitle: "Real feedback from repeat customers ordering directly from our store",
      testimonials: [
        {
          name: "Verified Customer",
          role: "Repeat Buyer",
          quote:
            "Genuine quality products, transparent pricing, and quick confirmation on WhatsApp.",
          rating: 5,
        },
        {
          name: "Local Business Client",
          role: "Direct Order",
          quote:
            "Smooth ordering experience and prompt dispatch updates right from checkout to delivery.",
          rating: 5,
        },
        {
          name: "Regular Shopper",
          role: "Online Storefront",
          quote: "Accurate stock availability and reliable packaging every single time.",
          rating: 5,
        },
      ],
    },
  },
  faq: {
    label: "Customer FAQ Accordion",
    description: "Expandable answers on delivery, COD, GST billing, and returns.",
    group: "trust_conversion",
    iconName: "HelpCircle",
    defaultContent: {
      title: "Frequently Asked Questions",
      subtitle: "Clear answers before you place your order",
      faqs: DEFAULT_FAQ_ITEMS.map((item) => ({ ...item })),
    },
  },
  about: {
    label: "About Our Brand",
    description: "Direct-from-merchant story card with business contact summary.",
    group: "core",
    iconName: "Building2",
    defaultContent: {
      title: "Direct From the Merchant",
      body: "We deliver authentic, quality-checked products directly from our store inventory with transparent pricing and responsive customer support.",
    },
  },
  store_location: {
    label: "Store Location & Pickup",
    description: "Showroom address, support hours, delivery zones, and self-pickup info.",
    group: "trust_conversion",
    iconName: "MapPin",
    defaultContent: {
      title: "Visit Our Store & Dispatch Desk",
      subtitle: "Order online for doorstep delivery or pick up directly from our counter",
      body: "Walk-in inspection and counter pickup available during store support hours.",
      deliveryZones: "Local Same-Day Delivery · Pan-India Insured Dispatch",
      pickupEnabled: true,
      mapUrl: "",
      cta: "Get Directions",
    },
  },
  newsletter: {
    label: "VIP Deal Alerts Opt-in",
    description: "Capture shopper WhatsApp or email leads for restock & sale alerts.",
    group: "trust_conversion",
    iconName: "BellRing",
    defaultContent: {
      discountLabel: "VIP RESTOCK & OFFER ALERTS",
      title: "Get Early Access to New Drops & Promo Codes",
      subtitle:
        "Join our store alert list for restock updates, festival discounts, and subscriber-only codes.",
      cta: "Notify Me",
    },
  },
  contact: {
    label: "Contact & Store Desk",
    description: "Support desk card with phone, email, and address links.",
    group: "core",
    iconName: "MessageSquare",
    defaultContent: {
      title: "Need Assistance? Reach Out Directly",
      subtitle: "Connect with our support desk via phone, email, or instant WhatsApp chat.",
    },
  },
  whatsapp: {
    label: "WhatsApp Quick Order Banner",
    description: "Direct WhatsApp chat banner for bulk quotes and assisted orders.",
    group: "core",
    iconName: "MessageCircle",
    defaultContent: {
      title: "Prefer Ordering on WhatsApp?",
      subtitle: "Send your cart directly to our store desk for instant personal assistance.",
      cta: "Chat on WhatsApp",
    },
  },
  problem_solution: {
    label: "Problem -> Solution Split",
    description: "Highlight customer pain points alongside your exact solution.",
    group: "funnel",
    iconName: "Target",
    defaultContent: {
      badgeText: "WHY SWITCH TODAY",
      title: "Stop Overpaying for Unverified Alternatives",
      subtitle: "See why thousands of smart buyers switch directly to our verified catalog",
      painTitle: "Common Frustrations Elsewhere",
      solutionTitle: "What You Get With Us",
      painPoints: [
        "Delayed shipping with zero live tracking visibility",
        "No proper GST invoice or warranty claim support",
        "Hidden middleman markups and inconsistent quality",
      ],
      solutionPoints: [
        "Verified genuine stock dispatched fast from our store desk",
        "Instant GST billing + 7-day easy replacement backing",
        "Direct-to-consumer bundle savings with COD & UPI options",
      ],
      cta: "See Our Guarantee",
    },
  },
  comparison_table: {
    label: "Us vs Others Comparison",
    description: "Feature-by-feature table showing why your offer wins over competitors.",
    group: "funnel",
    iconName: "Scale",
    defaultContent: {
      badgeText: "SIDE-BY-SIDE PROOF",
      title: "How Our Direct Offer Compares",
      subtitle: "Clear checklist before you make your buying decision",
      usLabel: "Our Store",
      othersLabel: "Typical Sellers",
      comparisonRows: DEFAULT_COMPARISON_ROWS.map((r) => ({ ...r })),
      cta: "Claim Offer Below",
    },
  },
  how_it_works: {
    label: "3-Step How It Works",
    description: "Simple 3-step visual journey explaining ordering and delivery clarity.",
    group: "funnel",
    iconName: "ListChecks",
    defaultContent: {
      badgeText: "SIMPLE 3-STEP PROCESS",
      title: "From Click to Doorstep in 3 Easy Steps",
      subtitle: "No complicated checkout hoops — order online or on WhatsApp in seconds",
      steps: DEFAULT_HOW_IT_WORKS_STEPS.map((s) => ({ ...s })),
      cta: "Start Step 1 Now",
    },
  },
  offer_stack: {
    label: "Value Stack & Savings Box",
    description: "Itemized offer value stack comparing total worth vs today's deal price.",
    group: "funnel",
    iconName: "Gift",
    defaultContent: {
      badgeText: "LIMITED BUNDLE VALUE",
      title: "Everything Included in Today's Offer",
      subtitle: "Unlock the complete package at one transparent direct-store price",
      regularPrice: 2996,
      offerPrice: 1499,
      stackItems: DEFAULT_STACK_ITEMS.map((item) => ({ ...item })),
      cta: "Lock This Offer Price",
    },
  },
  pricing_tiers: {
    label: "1-Click Package Tiers",
    description: "Starter / Duo / Family pack pricing cards wired to express checkout.",
    group: "funnel",
    iconName: "Flame",
    defaultContent: {
      badgeText: "CHOOSE YOUR PACK",
      title: "Pick the Bundle That Saves You Most",
      subtitle: "Click any tier to auto-fill Express Checkout below with that pack",
      pricingTiers: DEFAULT_PRICING_TIERS.map((t) => ({ ...t, features: [...t.features] })),
    },
  },
  guarantee_seal: {
    label: "Risk-Free Guarantee Seal",
    description: "Money-back & replacement guarantee badge eliminating buyer hesitation.",
    group: "funnel",
    iconName: "Award",
    defaultContent: {
      badgeText: "100% RISK-FREE PROMISE",
      guaranteeDays: 7,
      title: "7-Day Ironclad Replacement & Quality Guarantee",
      body: "Try your order worry-free. If anything arrives damaged, mismatched, or doesn't meet expectations, our support desk replaces or resolves it within 7 days — zero hassle.",
      cta: "Order Risk-Free Now",
    },
  },
  express_checkout: {
    label: "Inline Express Checkout + Bump",
    description: "Embedded conversion form (COD/Razorpay/Lead + 1-click Order Bump) on page.",
    group: "funnel",
    iconName: "Zap",
    defaultContent: {
      badgeText: "EXPRESS 30-SEC CHECKOUT",
      title: "Complete Your Order & Claim Instant Dispatch",
      subtitle: "Enter your delivery details below — pay securely online or via Cash on Delivery",
      orderBumpEnabled: true,
      orderBumpTitle: "YES! Add Priority Care & Bonus Accessory Pack",
      orderBumpDescription: "One-time funnel exclusive add-on shipped inside the same parcel.",
      orderBumpPrice: 199,
      cta: "Confirm My Order Now",
    },
  },
};

export const STORE_SECTION_CATALOG: StoreSectionCatalogEntry[] = (
  Object.keys(SECTION_META) as StoreSectionType[]
).map((type) => ({
  type,
  label: SECTION_META[type].label,
  description: SECTION_META[type].description,
  group: SECTION_META[type].group,
  iconName: SECTION_META[type].iconName,
}));

export const DEFAULT_STORE_SECTIONS: StoreSection[] = [
  {
    id: "hero",
    type: "hero",
    label: SECTION_META.hero.label,
    status: "Active",
    iconName: SECTION_META.hero.iconName,
    content: { ...SECTION_META.hero.defaultContent },
  },
  {
    id: "timer",
    type: "timer",
    label: SECTION_META.timer.label,
    status: "Inactive",
    iconName: SECTION_META.timer.iconName,
    content: { ...SECTION_META.timer.defaultContent },
  },
  {
    id: "featured",
    type: "featured",
    label: SECTION_META.featured.label,
    status: "Active",
    iconName: SECTION_META.featured.iconName,
    content: { ...SECTION_META.featured.defaultContent },
  },
  {
    id: "products",
    type: "products",
    label: SECTION_META.products.label,
    status: "Active",
    iconName: SECTION_META.products.iconName,
    content: { ...SECTION_META.products.defaultContent },
  },
  {
    id: "testimonials",
    type: "testimonials",
    label: SECTION_META.testimonials.label,
    status: "Active",
    iconName: SECTION_META.testimonials.iconName,
    content: { ...SECTION_META.testimonials.defaultContent },
  },
  {
    id: "about",
    type: "about",
    label: SECTION_META.about.label,
    status: "Active",
    iconName: SECTION_META.about.iconName,
    content: { ...SECTION_META.about.defaultContent },
  },
];

function inferSectionType(raw: Record<string, any>): StoreSectionType {
  const candidate = String(raw.type || raw.id || "").toLowerCase().trim();
  if (candidate in SECTION_META) {
    return candidate as StoreSectionType;
  }
  const label = String(raw.label || "").toLowerCase();
  if (label.includes("hero") || label.includes("banner")) return "hero";
  if (label.includes("trust") || label.includes("benefit") || label.includes("usp")) return "trust_strip";
  if (label.includes("categor")) return "categories";
  if (label.includes("new arrival") || label.includes("fresh")) return "new_arrivals";
  if (label.includes("offer") || label.includes("coupon")) return "offers";
  if (label.includes("feature") || label.includes("best")) return "featured";
  if (label.includes("timer") || label.includes("flash")) return "timer";
  if (label.includes("video") || label.includes("demo") || label.includes("reel") || label.includes("media")) return "media_showcase";
  if (label.includes("testimonial") || label.includes("review")) return "testimonials";
  if (label.includes("faq") || label.includes("question")) return "faq";
  if (label.includes("location") || label.includes("pickup") || label.includes("dispatch")) return "store_location";
  if (label.includes("newsletter") || label.includes("alert") || label.includes("vip")) return "newsletter";
  if (label.includes("problem") || label.includes("solution") || label.includes("pain")) return "problem_solution";
  if (label.includes("compar") || label.includes("versus") || label.includes("vs")) return "comparison_table";
  if (label.includes("how it works") || label.includes("step")) return "how_it_works";
  if (label.includes("value stack") || label.includes("bundle box")) return "offer_stack";
  if (label.includes("tier") || label.includes("package") || label.includes("pricing")) return "pricing_tiers";
  if (label.includes("guarantee") || label.includes("warranty seal") || label.includes("money-back")) return "guarantee_seal";
  if (label.includes("express checkout") || label.includes("order bump") || label.includes("claim form")) return "express_checkout";
  if (label.includes("product") || label.includes("catalog")) return "products";
  if (label.includes("contact")) return "contact";
  if (label.includes("whatsapp")) return "whatsapp";
  return "about";
}

/**
 * Normalizes legacy `/website` sections (`{ id, label, status }`) and
 * `/website/editor/[pageId]` sections (`{ id, type, content }`) into one unified schema.
 */
export function normalizeStoreSections(
  rawSections: unknown,
  options?: { requireCatalogGrid?: boolean }
): StoreSection[] {
  const requireCatalogGrid = options?.requireCatalogGrid !== false;
  if (!Array.isArray(rawSections) || rawSections.length === 0) {
    return DEFAULT_STORE_SECTIONS.map((s) => ({
      ...s,
      content: { ...s.content },
    }));
  }

  const normalized: StoreSection[] = rawSections
    .filter((item) => Boolean(item && typeof item === "object"))
    .map((raw: any, index: number) => {
      const type = inferSectionType(raw);
      const meta = SECTION_META[type];
      const status: "Active" | "Inactive" =
        raw.status === "Inactive" ? "Inactive" : "Active";

      const rawContent =
        raw.content && typeof raw.content === "object" ? raw.content : {};

      return {
        id: String(raw.id || `${type}_${index + 1}`),
        type,
        label: String(raw.label || rawContent.title || meta.label),
        status,
        iconName: String(raw.iconName || meta.iconName),
        content: {
          ...meta.defaultContent,
          ...rawContent,
        },
      };
    });

  // Ensure the core catalog products grid is always addressable if missing from legacy 4-item array
  const hasProducts = normalized.some((s) => s.type === "products");
  if (requireCatalogGrid && !hasProducts) {
    const featuredIdx = normalized.findIndex((s) => s.type === "featured");
    const productsNode: StoreSection = {
      id: "products",
      type: "products",
      label: SECTION_META.products.label,
      status: "Active",
      iconName: SECTION_META.products.iconName,
      content: { ...SECTION_META.products.defaultContent },
    };
    if (featuredIdx >= 0) {
      normalized.splice(featuredIdx + 1, 0, productsNode);
    } else {
      normalized.push(productsNode);
    }
  }

  return normalized;
}

export function createStoreSection(type: StoreSectionType): StoreSection {
  const meta = SECTION_META[type];
  const content: StoreSectionContent = {
    ...meta.defaultContent,
    ...(meta.defaultContent.trustItems
      ? { trustItems: meta.defaultContent.trustItems.map((i) => ({ ...i })) }
      : {}),
    ...(meta.defaultContent.faqs
      ? { faqs: meta.defaultContent.faqs.map((f) => ({ ...f })) }
      : {}),
    ...(meta.defaultContent.testimonials
      ? { testimonials: meta.defaultContent.testimonials.map((t) => ({ ...t })) }
      : {}),
    ...(meta.defaultContent.painPoints
      ? { painPoints: [...meta.defaultContent.painPoints] }
      : {}),
    ...(meta.defaultContent.solutionPoints
      ? { solutionPoints: [...meta.defaultContent.solutionPoints] }
      : {}),
    ...(meta.defaultContent.comparisonRows
      ? { comparisonRows: meta.defaultContent.comparisonRows.map((r) => ({ ...r })) }
      : {}),
    ...(meta.defaultContent.steps
      ? { steps: meta.defaultContent.steps.map((st) => ({ ...st })) }
      : {}),
    ...(meta.defaultContent.stackItems
      ? { stackItems: meta.defaultContent.stackItems.map((it) => ({ ...it })) }
      : {}),
    ...(meta.defaultContent.pricingTiers
      ? {
          pricingTiers: meta.defaultContent.pricingTiers.map((tier) => ({
            ...tier,
            features: [...tier.features],
          })),
        }
      : {}),
  };
  return {
    id: `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type,
    label: meta.label,
    status: "Active",
    iconName: meta.iconName,
    content,
  };
}

export function removeStoreSection(
  sections: StoreSection[],
  id: string,
  options?: { protectProducts?: boolean }
): StoreSection[] {
  const target = sections.find((s) => s.id === id);
  if (!target) return [...sections];
  const protectProducts = options?.protectProducts !== false;
  // Protect the last catalog grid section on main storefront so it never loses its core product catalog
  if (
    protectProducts &&
    target.type === "products" &&
    sections.filter((s) => s.type === "products").length <= 1
  ) {
    return [...sections];
  }
  return sections.filter((s) => s.id !== id);
}

export function sanitizeStoreSlug(rawSlug: string): string {
  return String(rawSlug || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/**
 * Resolves the reliable internal preview link for merchants in AI Studio / browser tabs.
 * Always includes `bId` fallback when `slug` is not set or still syncing, and `preview=1`
 * when the merchant previews a draft store.
 */
export function resolveStorePreviewUrl(params: {
  slug?: string | null;
  businessId?: string | null;
  isPreview?: boolean;
}): string {
  const cleanSlug = sanitizeStoreSlug(params.slug || "");
  const bId = (params.businessId || "").trim();
  const queryParts: string[] = [];

  if (cleanSlug) {
    queryParts.push(`slug=${encodeURIComponent(cleanSlug)}`);
  }
  if (bId) {
    queryParts.push(`bId=${encodeURIComponent(bId)}`);
  }
  if (params.isPreview) {
    queryParts.push("preview=1");
  }

  if (queryParts.length === 0) {
    return "/shop";
  }
  return `/shop?${queryParts.join("&")}`;
}

/**
 * Determines whether a storefront can be viewed/ordered from publicly.
 * - Suspended businesses are always blocked.
 * - Explicit `websiteStatus` ('published' vs 'draft') takes priority over `businessStatus`
 *   so trial merchants who publish their store are live, and active merchants who switch
 *   their store to 'draft' take it offline (unless `isPreview === true`).
 */
export function isStorePubliclyVisible(params: {
  websiteStatus?: string | null;
  businessStatus?: string | null;
  isPreview?: boolean;
}): boolean {
  const bizStatus = String(params.businessStatus || "").toLowerCase().trim();
  if (bizStatus === "suspended" || bizStatus === "banned") {
    return false;
  }

  if (params.isPreview) {
    return Boolean(bizStatus || params.websiteStatus);
  }

  const webStatus = String(params.websiteStatus || "").toLowerCase().trim();
  if (webStatus) {
    return webStatus === "published" || webStatus === "active" || webStatus === "pro";
  }

  return bizStatus === "published" || bizStatus === "active" || bizStatus === "pro";
}

/**
 * Normalizes a merchant's WhatsApp phone number for `https://wa.me/<number>`.
 * Converts 10-digit Indian mobile numbers or leading-0 numbers (`09907471591`) to `919907471591`.
 */
export function resolveMerchantWhatsAppPhone(params: {
  contactPhone?: string | null;
  businessPhone?: string | null;
}): string {
  const raw = String(params.contactPhone || params.businessPhone || "").trim();
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.length === 11 && digits.startsWith("0")) {
    digits = `91${digits.slice(1)}`;
  } else if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return digits;
}

export function buildWhatsAppUrl(phoneDigits: string, message: string): string {
  const encoded = encodeURIComponent(message);
  return phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

/**
 * Computes real Deployment Readiness & SEO/Catalog scores for `/website` Overview.
 */
export function computeStoreIntegrityAudit(params: {
  storeName?: string;
  slug?: string;
  logoUrl?: string;
  primaryColor?: string;
  onlineProductsCount: number;
  whatsappOrderEnabled?: boolean;
  codEnabled?: boolean;
  hasActiveGateway?: boolean;
  contactPhone?: string;
  seoTitle?: string;
  seoDescription?: string;
  websiteStatus?: string;
}): StoreIntegrityReport {
  const hasIdentity = Boolean(
    params.storeName?.trim() && sanitizeStoreSlug(params.slug || "").length >= 2
  );
  const hasBranding = Boolean(params.logoUrl?.trim() && params.primaryColor?.trim());
  const hasCatalog = params.onlineProductsCount > 0;
  const hasWhatsappReady = Boolean(
    params.whatsappOrderEnabled &&
      resolveMerchantWhatsAppPhone({ contactPhone: params.contactPhone }).length >= 10
  );
  const hasCheckoutChannel = Boolean(
    params.hasActiveGateway || params.codEnabled || hasWhatsappReady
  );
  const hasSeo = Boolean(
    params.seoTitle?.trim() && params.seoDescription?.trim()
  );
  const isPublished = params.websiteStatus === "published";

  const checks: StoreIntegrityCheckItem[] = [
    {
      id: "identity",
      label: "Store Identity & Public Slug",
      passed: hasIdentity,
      weight: 20,
      detail: hasIdentity
        ? `Public URL slug (${sanitizeStoreSlug(params.slug || "")}.biztrix.in) is configured.`
        : "Set your Store Name and Subdomain Slug in Core Config.",
      targetTab: "settings",
    },
    {
      id: "catalog",
      label: "Online Product Catalog",
      passed: hasCatalog,
      weight: 25,
      detail: hasCatalog
        ? `${params.onlineProductsCount} product(s) marked visible on storefront.`
        : "Enable showOnWebsite on at least 1 product in Catalog Control.",
      targetTab: "catalog",
    },
    {
      id: "checkout",
      label: "Active Checkout Channel",
      passed: hasCheckoutChannel,
      weight: 20,
      detail: hasCheckoutChannel
        ? "Customers can complete orders via Online Gateway, COD, or WhatsApp."
        : "Enable COD, configure Razorpay, or add a valid WhatsApp phone number.",
      targetTab: "settings",
    },
    {
      id: "branding",
      label: "Brand Logo & Theme Palette",
      passed: hasBranding,
      weight: 10,
      detail: hasBranding
        ? "Store logo and primary brand color are active."
        : "Upload a Store Primary Logo in Design & Theme for stronger buyer trust.",
      targetTab: "design",
    },
    {
      id: "seo",
      label: "Search & Social Metadata (SEO)",
      passed: hasSeo,
      weight: 15,
      detail: hasSeo
        ? "Custom Meta Title and Meta Description are configured."
        : "Add a custom Meta Title and Meta Description in SEO & Social.",
      targetTab: "seo",
    },
    {
      id: "published",
      label: "Live Storefront Status",
      passed: isPublished,
      weight: 10,
      detail: isPublished
        ? "Storefront is Published and accessible to public shoppers."
        : "Store is currently in Draft Mode. Click 'Publish Store' to go live.",
      targetTab: "overview",
    },
  ];

  const score = checks.reduce((sum, item) => sum + (item.passed ? item.weight : 0), 0);
  const seoScore = hasSeo ? 100 : params.seoTitle?.trim() || params.seoDescription?.trim() ? 60 : 35;
  const catalogScore = hasCatalog
    ? Math.min(100, 70 + Math.min(30, params.onlineProductsCount * 5))
    : 20;

  return {
    score,
    seoScore,
    catalogScore,
    checks,
  };
}

/**
 * Determines whether inventory stock was deducted for an order and whether a refund should restore stock.
 */
export function determineRefundRestockEligibility(params: {
  orderStatus: string;
  explicitRestock?: boolean;
}): { wasStockDeducted: boolean; shouldRestock: boolean } {
  const deductedStatuses = ["paid", "processing", "shipped", "delivered"];
  const wasStockDeducted = deductedStatuses.includes(
    String(params.orderStatus || "").toLowerCase()
  );
  if (!wasStockDeducted) {
    return { wasStockDeducted: false, shouldRestock: false };
  }
  const shouldRestock =
    params.explicitRestock !== undefined ? Boolean(params.explicitRestock) : true;
  return { wasStockDeducted: true, shouldRestock };
}

/**
 * Builds a Cashbook ledger record matching `/billing` & `/accounting` schema.
 */
export function buildStorefrontCashbookEntry(params: {
  businessId: string;
  orderId: string;
  customerName?: string;
  amount: number;
  direction: "credit" | "debit";
  paymentMode: string;
  dateIso?: string;
  note?: string;
}) {
  const cleanAmount = Math.max(0, Number(params.amount) || 0);
  const todayIso = (params.dateIso || new Date().toISOString()).split("T")[0];
  const customerLabel = (params.customerName || "Online Customer").trim();

  const particulars =
    params.direction === "credit"
      ? `Storefront Order: ${params.orderId} - ${customerLabel}`
      : `Storefront Refund: ${params.orderId} - ${customerLabel}`;

  return {
    businessId: params.businessId,
    type: params.direction,
    amount: cleanAmount,
    particulars,
    category: params.direction === "credit" ? "Sales" : "Expense",
    paymentMode: params.paymentMode,
    entryBy: "Storefront OS",
    source: "storefront",
    referenceOrderId: params.orderId,
    date: todayIso,
    paymentNote: params.note || null,
  };
}

// ============================================================================
// PHASE 1 CONVERSION ENGINE: COUPONS, SHIPPING, SORTING & ORDER TRACKING
// ============================================================================

export type StoreCouponDiscountType = "percent" | "flat";

export interface StoreCoupon {
  id: string;
  code: string;
  discountType: StoreCouponDiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  active: boolean;
  expiresAt?: string;
  description?: string;
}

export interface StoreShippingConfig {
  shippingFee: number;
  freeShippingThreshold: number;
  codFee: number;
}

export const DEFAULT_STORE_SHIPPING_CONFIG: StoreShippingConfig = {
  shippingFee: 0,
  freeShippingThreshold: 0,
  codFee: 0,
};

export function sanitizeCouponCode(rawCode: string): string {
  return String(rawCode || "")
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 24);
}

export function normalizeStoreCoupons(rawCoupons: unknown): StoreCoupon[] {
  if (!Array.isArray(rawCoupons)) return [];
  const seenCodes = new Set<string>();
  const result: StoreCoupon[] = [];

  rawCoupons.forEach((raw: any, index: number) => {
    if (!raw || typeof raw !== "object") return;
    const code = sanitizeCouponCode(raw.code || "");
    if (!code || seenCodes.has(code)) return;
    seenCodes.add(code);

    const discountType: StoreCouponDiscountType =
      raw.discountType === "flat" ? "flat" : "percent";
    const rawValue = Math.max(0, Number(raw.discountValue) || 0);
    const discountValue =
      discountType === "percent" ? Math.min(100, rawValue) : rawValue;
    const minOrderAmount = Math.max(0, Number(raw.minOrderAmount) || 0);
    const maxDiscountNum = Number(raw.maxDiscount);
    const maxDiscount =
      Number.isFinite(maxDiscountNum) && maxDiscountNum > 0
        ? maxDiscountNum
        : undefined;

    result.push({
      id: String(raw.id || `cpn_${index + 1}`),
      code,
      discountType,
      discountValue,
      minOrderAmount,
      ...(maxDiscount !== undefined ? { maxDiscount } : {}),
      active: raw.active !== false,
      ...(raw.expiresAt ? { expiresAt: String(raw.expiresAt).trim() } : {}),
      ...(raw.description ? { description: String(raw.description).trim() } : {}),
    });
  });

  return result;
}

export function normalizeStoreShippingConfig(raw: any): StoreShippingConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_STORE_SHIPPING_CONFIG };
  }
  return {
    shippingFee: Math.max(0, Number(raw.shippingFee) || 0),
    freeShippingThreshold: Math.max(0, Number(raw.freeShippingThreshold) || 0),
    codFee: Math.max(0, Number(raw.codFee) || 0),
  };
}

export interface CouponEvaluationResult {
  valid: boolean;
  coupon?: StoreCoupon;
  discountAmount: number;
  message: string;
}

export function evaluateCouponDiscount(params: {
  coupons: StoreCoupon[];
  code: string;
  subtotal: number;
  nowIso?: string;
}): CouponEvaluationResult {
  const cleanCode = sanitizeCouponCode(params.code);
  const subtotal = Math.max(0, Number(params.subtotal) || 0);

  if (!cleanCode) {
    return { valid: false, discountAmount: 0, message: "Please enter a promo code." };
  }

  const coupon = params.coupons.find(
    (c) => sanitizeCouponCode(c.code) === cleanCode
  );
  if (!coupon) {
    return { valid: false, discountAmount: 0, message: `Promo code "${cleanCode}" is invalid.` };
  }
  if (!coupon.active) {
    return { valid: false, discountAmount: 0, message: `Promo code "${cleanCode}" is currently inactive.` };
  }

  if (coupon.expiresAt) {
    const nowTime = params.nowIso ? new Date(params.nowIso).getTime() : Date.now();
    // Treat date-only YYYY-MM-DD as inclusive until end of that UTC day
    const expiryString = /^\d{4}-\d{2}-\d{2}$/.test(coupon.expiresAt)
      ? `${coupon.expiresAt}T23:59:59.999Z`
      : coupon.expiresAt;
    const expiryTime = new Date(expiryString).getTime();
    if (Number.isFinite(expiryTime) && nowTime > expiryTime) {
      return {
        valid: false,
        discountAmount: 0,
        message: `Promo code "${cleanCode}" expired on ${coupon.expiresAt}.`,
      };
    }
  }

  if (coupon.minOrderAmount > 0 && subtotal < coupon.minOrderAmount) {
    return {
      valid: false,
      discountAmount: 0,
      message: `Minimum order of ₹${coupon.minOrderAmount.toLocaleString()} required for "${cleanCode}".`,
    };
  }

  let discount = 0;
  if (coupon.discountType === "percent") {
    discount = Math.round((subtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscount && coupon.maxDiscount > 0) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else {
    discount = Math.round(coupon.discountValue);
  }

  discount = Math.max(0, Math.min(subtotal, discount));

  return {
    valid: true,
    coupon,
    discountAmount: discount,
    message: `Applied "${cleanCode}" — saved ₹${discount.toLocaleString()}!`,
  };
}

export interface StoreOrderPricingBreakdown {
  subtotal: number;
  discountAmount: number;
  appliedCouponCode: string | null;
  couponMessage: string | null;
  shippingFee: number;
  codFee: number;
  grandTotal: number;
}

export function computeStoreOrderPricing(params: {
  subtotal: number;
  coupons?: StoreCoupon[];
  couponCode?: string | null;
  shippingConfig?: Partial<StoreShippingConfig> | null;
  paymentMethod?: "ONLINE" | "COD" | "WHATSAPP";
  nowIso?: string;
}): StoreOrderPricingBreakdown {
  const subtotal = Math.max(0, Math.round(Number(params.subtotal) || 0));
  const shipping = normalizeStoreShippingConfig(params.shippingConfig);
  const coupons = Array.isArray(params.coupons) ? params.coupons : [];

  let discountAmount = 0;
  let appliedCouponCode: string | null = null;
  let couponMessage: string | null = null;

  if (params.couponCode && sanitizeCouponCode(params.couponCode)) {
    const evalRes = evaluateCouponDiscount({
      coupons,
      code: params.couponCode,
      subtotal,
      nowIso: params.nowIso,
    });
    if (evalRes.valid && evalRes.coupon) {
      discountAmount = evalRes.discountAmount;
      appliedCouponCode = evalRes.coupon.code;
    }
    couponMessage = evalRes.message;
  }

  const netMerchandise = Math.max(0, subtotal - discountAmount);
  const qualifiedFreeShipping =
    shipping.freeShippingThreshold > 0 &&
    netMerchandise >= shipping.freeShippingThreshold;
  const shippingFee =
    netMerchandise === 0 || qualifiedFreeShipping ? 0 : shipping.shippingFee;
  const codFee = params.paymentMethod === "COD" ? shipping.codFee : 0;
  const grandTotal = Math.max(0, netMerchandise + shippingFee + codFee);

  return {
    subtotal,
    discountAmount,
    appliedCouponCode,
    couponMessage,
    shippingFee,
    codFee,
    grandTotal,
  };
}

export interface FreeShippingProgress {
  hasThreshold: boolean;
  qualified: boolean;
  remainingAmount: number;
  progressPercent: number;
  shippingFee: number;
}

export function computeFreeShippingProgress(
  netSubtotal: number,
  shippingConfig?: Partial<StoreShippingConfig> | null
): FreeShippingProgress {
  const cfg = normalizeStoreShippingConfig(shippingConfig);
  const amount = Math.max(0, Number(netSubtotal) || 0);

  if (cfg.freeShippingThreshold <= 0 || cfg.shippingFee <= 0) {
    return {
      hasThreshold: false,
      qualified: cfg.shippingFee === 0,
      remainingAmount: 0,
      progressPercent: 100,
      shippingFee: cfg.shippingFee,
    };
  }

  const remainingAmount = Math.max(0, Math.ceil(cfg.freeShippingThreshold - amount));
  const progressPercent = Math.min(
    100,
    Math.round((amount / cfg.freeShippingThreshold) * 100)
  );

  return {
    hasThreshold: true,
    qualified: remainingAmount === 0,
    remainingAmount,
    progressPercent,
    shippingFee: cfg.shippingFee,
  };
}

export type StoreSortOption = "featured" | "price_asc" | "price_desc" | "newest";

export function sortAndFilterStoreProducts<T extends Record<string, any>>(
  products: T[],
  options: {
    searchQuery?: string;
    category?: string;
    inStockOnly?: boolean;
    sortBy?: StoreSortOption;
  }
): T[] {
  const q = (options.searchQuery || "").toLowerCase().trim();
  const category = options.category || "All";
  const inStockOnly = Boolean(options.inStockOnly);
  const sortBy = options.sortBy || "featured";

  const filtered = (products || []).filter((p) => {
    const matchesSearch =
      !q ||
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q);
    const matchesCategory = category === "All" || p.category === category;
    const matchesStock = !inStockOnly || (Number(p.stock) || 0) > 0;
    return matchesSearch && matchesCategory && matchesStock;
  });

  const getEffectivePrice = (p: any) =>
    p.onlinePrice !== undefined && p.onlinePrice !== null
      ? Number(p.onlinePrice) || 0
      : Number(p.price) || 0;

  const getCreatedAtMs = (p: any) => {
    if (!p.createdAt) return 0;
    if (typeof p.createdAt?.toDate === "function") return p.createdAt.toDate().getTime();
    const parsed = new Date(p.createdAt).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return [...filtered].sort((a, b) => {
    if (sortBy === "price_asc") {
      return getEffectivePrice(a) - getEffectivePrice(b);
    }
    if (sortBy === "price_desc") {
      return getEffectivePrice(b) - getEffectivePrice(a);
    }
    if (sortBy === "newest") {
      return getCreatedAtMs(b) - getCreatedAtMs(a);
    }
    // Default "featured": Featured/Best Sellers first, then in-stock items
    const scoreA = (a.isFeatured ? 4 : 0) + (a.isBestSeller ? 2 : 0) + ((a.stock || 0) > 0 ? 1 : 0);
    const scoreB = (b.isFeatured ? 4 : 0) + (b.isBestSeller ? 2 : 0) + ((b.stock || 0) > 0 ? 1 : 0);
    return scoreB - scoreA;
  });
}

export function normalizeIndianPhoneTail(phone: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function matchesTrackOrderQuery(params: {
  orderId: string;
  orderPhone: string;
  queryOrderId: string;
  queryPhone: string;
}): boolean {
  const cleanOrderId = String(params.orderId || "").trim().toUpperCase();
  const cleanQueryId = String(params.queryOrderId || "").trim().toUpperCase();
  const orderPhoneTail = normalizeIndianPhoneTail(params.orderPhone);
  const queryPhoneTail = normalizeIndianPhoneTail(params.queryPhone);

  if (!cleanOrderId || !cleanQueryId || !orderPhoneTail || queryPhoneTail.length < 6) {
    return false;
  }

  const phoneMatches =
    orderPhoneTail === queryPhoneTail || orderPhoneTail.endsWith(queryPhoneTail);
  if (!phoneMatches) return false;

  const idMatches =
    cleanOrderId === cleanQueryId ||
    cleanOrderId.endsWith(cleanQueryId) ||
    cleanOrderId.slice(-8) === cleanQueryId;

  return idMatches;
}

export interface TrackedOrderSummary {
  orderId: string;
  status: string;
  paymentMethod: string;
  settlementStatus: string;
  customerFirstName: string;
  subtotal: number;
  discountAmount: number;
  couponCode: string | null;
  shippingFee: number;
  codFee: number;
  totalAmount: number;
  trackingNumber: string | null;
  courierName: string | null;
  items: Array<{ name: string; quantity: number; price: number; lineTotal: number }>;
  statusHistory: Array<{ status: string; changedAt: string; note: string }>;
  createdAtIso: string | null;
}

export function sanitizeTrackedOrderSummary(order: Record<string, any>): TrackedOrderSummary {
  const fullName = String(order.customerData?.name || "Customer").trim();
  const firstName = fullName.split(/\s+/)[0] || "Customer";

  const createdAtIso =
    typeof order.createdAt === "string"
      ? order.createdAt
      : typeof order.createdAt?.toDate === "function"
        ? order.createdAt.toDate().toISOString()
        : order.createdAtIso || null;

  const items = Array.isArray(order.items)
    ? order.items.map((it: any) => ({
        name: String(it.name || "Item"),
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0,
        lineTotal: Number(it.lineTotal) || (Number(it.price) || 0) * (Number(it.quantity) || 1),
      }))
    : [];

  const statusHistory = Array.isArray(order.statusHistory)
    ? order.statusHistory.map((h: any) => ({
        status: String(h.status || "created"),
        changedAt: String(h.changedAt || ""),
        note: String(h.note || ""),
      }))
    : [];

  const totalAmount = Number(order.amount) || 0;
  const discountAmount = Number(order.discountAmount) || 0;
  const shippingFee = Number(order.shippingFee) || 0;
  const codFee = Number(order.codFee) || 0;
  const subtotal =
    Number(order.subtotal) ||
    Math.max(0, totalAmount - shippingFee - codFee + discountAmount);

  return {
    orderId: String(order.id || ""),
    status: String(order.status || "created"),
    paymentMethod: String(order.paymentMethod || "ONLINE"),
    settlementStatus: String(order.settlementStatus || "pending"),
    customerFirstName: firstName,
    subtotal,
    discountAmount,
    couponCode: order.couponCode || null,
    shippingFee,
    codFee,
    totalAmount,
    trackingNumber: order.trackingNumber || null,
    courierName: order.courierName || null,
    items,
    statusHistory,
    createdAtIso,
  };
}

// ============================================================================
// PHASE 2 VISUAL & MERCHANDISING ENGINE: THEME, HERO, ANNOUNCEMENTS & LAYOUT
// ============================================================================

export type StoreFontPair = "jakarta" | "playfair" | "outfit";
export type StoreThemeSurface = "light" | "warm_paper" | "charcoal";
export type StoreHeroLayout = "classic_banner" | "split_showcase" | "editorial_cover";
export type StoreCornerRadius = "sharp" | "rounded" | "soft";
export type StoreButtonStyle = "solid" | "pill" | "outline";
export type StoreGridColumns = 3 | 4;

export interface StoreThemeConfig {
  fontPair: StoreFontPair;
  themeSurface: StoreThemeSurface;
  heroLayout: StoreHeroLayout;
  heroImageUrl: string;
  cardRadius: StoreCornerRadius;
  buttonStyle: StoreButtonStyle;
  gridColumns: StoreGridColumns;
}

export const DEFAULT_STORE_THEME_CONFIG: StoreThemeConfig = {
  fontPair: "jakarta",
  themeSurface: "light",
  heroLayout: "classic_banner",
  heroImageUrl: "",
  cardRadius: "rounded",
  buttonStyle: "solid",
  gridColumns: 4,
};

export interface StoreAnnouncementBar {
  enabled: boolean;
  text: string;
  ctaLabel: string;
  ctaUrl: string;
  bgColor: string;
  textColor: string;
}

export const DEFAULT_ANNOUNCEMENT_BAR: StoreAnnouncementBar = {
  enabled: false,
  text: "Free doorstep delivery on prepaid orders above threshold!",
  ctaLabel: "Shop Now",
  ctaUrl: "#store-catalog",
  bgColor: "#0F172A",
  textColor: "#FFFFFF",
};

export interface StoreFooterConfig {
  tagline: string;
  instagramUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  showTrustHighlights: boolean;
  trustHighlights: string[];
}

export const DEFAULT_STORE_FOOTER_CONFIG: StoreFooterConfig = {
  tagline: "Genuine quality products delivered directly from our store desk.",
  instagramUrl: "",
  facebookUrl: "",
  youtubeUrl: "",
  showTrustHighlights: true,
  trustHighlights: [
    "Verified Merchant Store",
    "Direct Dispatch & Support",
    "Secure Online & COD Checkout",
  ],
};

export function sanitizeExternalUrl(raw: unknown): string {
  const val = String(raw || "").trim();
  if (!val) return "";
  if (val.startsWith("/") || val.startsWith("#")) return val;
  if (/^https?:\/\//i.test(val)) return val;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(val)) return `https://${val}`;
  return "";
}

export function normalizeStoreThemeConfig(
  raw: any,
  legacyUiStyle?: string
): StoreThemeConfig {
  const obj = raw && typeof raw === "object" ? raw : {};

  const fontPair: StoreFontPair =
    obj.fontPair === "playfair" || obj.fontPair === "outfit"
      ? obj.fontPair
      : "jakarta";

  const themeSurface: StoreThemeSurface =
    obj.themeSurface === "warm_paper" || obj.themeSurface === "charcoal"
      ? obj.themeSurface
      : "light";

  const heroLayout: StoreHeroLayout =
    obj.heroLayout === "split_showcase" || obj.heroLayout === "editorial_cover"
      ? obj.heroLayout
      : "classic_banner";

  const fallbackRadius: StoreCornerRadius =
    legacyUiStyle === "minimal"
      ? "sharp"
      : legacyUiStyle === "modern"
        ? "soft"
        : "rounded";

  const cardRadius: StoreCornerRadius =
    obj.cardRadius === "sharp" || obj.cardRadius === "rounded" || obj.cardRadius === "soft"
      ? obj.cardRadius
      : fallbackRadius;

  const buttonStyle: StoreButtonStyle =
    obj.buttonStyle === "pill" || obj.buttonStyle === "outline"
      ? obj.buttonStyle
      : "solid";

  const gridColumns: StoreGridColumns = Number(obj.gridColumns) === 3 ? 3 : 4;

  const heroImageRaw = String(obj.heroImageUrl || "").trim();
  const heroImageUrl =
    heroImageRaw.startsWith("data:image/") ||
    /^https?:\/\//i.test(heroImageRaw) ||
    heroImageRaw.startsWith("/")
      ? heroImageRaw
      : "";

  return {
    fontPair,
    themeSurface,
    heroLayout,
    heroImageUrl,
    cardRadius,
    buttonStyle,
    gridColumns,
  };
}

export function normalizeAnnouncementBar(raw: any): StoreAnnouncementBar {
  const obj = raw && typeof raw === "object" ? raw : {};
  const hexColorRegex = /^#[0-9a-fA-F]{3,8}$/;
  const bgColor = hexColorRegex.test(String(obj.bgColor || "").trim())
    ? String(obj.bgColor).trim()
    : DEFAULT_ANNOUNCEMENT_BAR.bgColor;
  const textColor = hexColorRegex.test(String(obj.textColor || "").trim())
    ? String(obj.textColor).trim()
    : DEFAULT_ANNOUNCEMENT_BAR.textColor;

  return {
    enabled: Boolean(obj.enabled),
    text: String(obj.text ?? DEFAULT_ANNOUNCEMENT_BAR.text).trim().slice(0, 140),
    ctaLabel: String(obj.ctaLabel ?? "").trim().slice(0, 28),
    ctaUrl: sanitizeExternalUrl(obj.ctaUrl),
    bgColor,
    textColor,
  };
}

export function normalizeFooterConfig(raw: any): StoreFooterConfig {
  const obj = raw && typeof raw === "object" ? raw : {};
  const highlights = Array.isArray(obj.trustHighlights)
    ? obj.trustHighlights
        .map((item: unknown) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 4)
    : [...DEFAULT_STORE_FOOTER_CONFIG.trustHighlights];

  return {
    tagline:
      String(obj.tagline ?? DEFAULT_STORE_FOOTER_CONFIG.tagline)
        .trim()
        .slice(0, 180) || DEFAULT_STORE_FOOTER_CONFIG.tagline,
    instagramUrl: sanitizeExternalUrl(obj.instagramUrl),
    facebookUrl: sanitizeExternalUrl(obj.facebookUrl),
    youtubeUrl: sanitizeExternalUrl(obj.youtubeUrl),
    showTrustHighlights: obj.showTrustHighlights !== false,
    trustHighlights:
      highlights.length > 0
        ? highlights
        : [...DEFAULT_STORE_FOOTER_CONFIG.trustHighlights],
  };
}

export function moveStoreSection(
  sections: StoreSection[],
  id: string,
  direction: "up" | "down"
): StoreSection[] {
  const idx = sections.findIndex((s) => s.id === id);
  if (idx < 0) return [...sections];
  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= sections.length) {
    return [...sections];
  }
  const next = [...sections];
  const [moved] = next.splice(idx, 1);
  next.splice(targetIdx, 0, moved);
  return next;
}

export function updateStoreSectionItem(
  sections: StoreSection[],
  id: string,
  patch: {
    label?: string;
    status?: "Active" | "Inactive";
    content?: Partial<StoreSectionContent>;
  }
): StoreSection[] {
  return sections.map((section) => {
    if (section.id !== id) return section;
    const nextContent = patch.content
      ? { ...section.content, ...patch.content }
      : section.content;
    return {
      ...section,
      ...(patch.label !== undefined ? { label: patch.label } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      content: nextContent,
    };
  });
}

export function getStoreFontFamilies(fontPair: StoreFontPair): {
  headingFont: string;
  bodyFont: string;
  label: string;
} {
  if (fontPair === "playfair") {
    return {
      headingFont: '"Playfair Display", "Mukta", serif',
      bodyFont: '"Plus Jakarta Sans", "Mukta", sans-serif',
      label: "Playfair + Jakarta Editorial",
    };
  }
  if (fontPair === "outfit") {
    return {
      headingFont: '"Outfit", "Mukta", sans-serif',
      bodyFont: '"Manrope", "Mukta", sans-serif',
      label: "Outfit + Manrope Retail",
    };
  }
  return {
    headingFont: '"Plus Jakarta Sans", "Mukta", sans-serif',
    bodyFont: '"DM Sans", "Plus Jakarta Sans", "Mukta", sans-serif',
    label: "Plus Jakarta + DM Sans Modern",
  };
}

export function getProductGalleryImages(product: Record<string, any> | null | undefined): string[] {
  if (!product) return [];
  const candidates: string[] = [];
  if (Array.isArray(product.images)) {
    for (const img of product.images) {
      if (typeof img === "string" && img.trim()) {
        candidates.push(img.trim());
      }
    }
  }
  if (typeof product.imageUrl === "string" && product.imageUrl.trim()) {
    candidates.push(product.imageUrl.trim());
  }
  if (typeof product.image === "string" && product.image.trim()) {
    candidates.push(product.image.trim());
  }
  return Array.from(new Set(candidates));
}

// ============================================================================
// PHASE 3 GROWTH, ANALYTICS, PIXELS, RETENTION & STORE POLICIES ENGINE
// ============================================================================

export interface StoreTrackingConfig {
  metaPixelId: string;
  ga4MeasurementId: string;
  googleSiteVerification: string;
}

export const DEFAULT_STORE_TRACKING_CONFIG: StoreTrackingConfig = {
  metaPixelId: "",
  ga4MeasurementId: "",
  googleSiteVerification: "",
};

export function sanitizeMetaPixelId(raw: unknown): string {
  return String(raw || "")
    .replace(/\D/g, "")
    .slice(0, 20);
}

export function isValidMetaPixelId(id: string): boolean {
  return /^\d{10,20}$/.test(id.trim());
}

export function sanitizeGa4MeasurementId(raw: unknown): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 20);
}

export function isValidGa4MeasurementId(id: string): boolean {
  return /^G-[A-Z0-9]{6,14}$/.test(id.trim());
}

export function sanitizeGoogleSiteVerification(raw: unknown): string {
  const str = String(raw || "").trim();
  if (!str) return "";
  // Allow merchants to paste either the raw content token or full HTML meta tag
  const metaMatch = str.match(/content=["']([A-Za-z0-9_-]{10,120})["']/i);
  if (metaMatch?.[1]) {
    return metaMatch[1];
  }
  const cleaned = str.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 120);
  return cleaned.length >= 10 ? cleaned : "";
}

export function normalizeStoreTrackingConfig(raw: any): StoreTrackingConfig {
  const obj = raw && typeof raw === "object" ? raw : {};
  const metaRaw = sanitizeMetaPixelId(obj.metaPixelId);
  const gaRaw = sanitizeGa4MeasurementId(obj.ga4MeasurementId);
  return {
    metaPixelId: metaRaw,
    ga4MeasurementId: gaRaw,
    googleSiteVerification: sanitizeGoogleSiteVerification(obj.googleSiteVerification),
  };
}

export interface StorePolicyConfig {
  supportHours: string;
  shippingPolicy: string;
  returnPolicy: string;
  privacyPolicy: string;
}

export const DEFAULT_STORE_POLICY_CONFIG: StorePolicyConfig = {
  supportHours: "Mon - Sat, 10:00 AM - 7:00 PM IST",
  shippingPolicy:
    "Orders are processed within 24-48 business hours. Standard doorstep delivery typically completes within 3-7 business days depending on your pincode.",
  returnPolicy:
    "Eligible unused items in original packaging may be requested for return or replacement within 7 days of delivery by contacting our store desk with your Order ID.",
  privacyPolicy:
    "Customer phone numbers, delivery addresses, and order details are collected strictly to fulfill purchases, send order status updates, and provide merchant support.",
};

export function normalizeStorePolicyConfig(raw: any): StorePolicyConfig {
  const obj = raw && typeof raw === "object" ? raw : {};
  const cleanText = (val: unknown, fallback: string, maxLen: number) => {
    const trimmed = String(val ?? "").trim();
    return trimmed ? trimmed.slice(0, maxLen) : fallback;
  };
  return {
    supportHours: cleanText(obj.supportHours, DEFAULT_STORE_POLICY_CONFIG.supportHours, 100),
    shippingPolicy: cleanText(obj.shippingPolicy, DEFAULT_STORE_POLICY_CONFIG.shippingPolicy, 2000),
    returnPolicy: cleanText(obj.returnPolicy, DEFAULT_STORE_POLICY_CONFIG.returnPolicy, 2000),
    privacyPolicy: cleanText(obj.privacyPolicy, DEFAULT_STORE_POLICY_CONFIG.privacyPolicy, 2000),
  };
}

export function toggleWishlistId(currentIds: string[], productId: string): string[] {
  const cleanId = String(productId || "").trim();
  if (!cleanId) return [...currentIds];
  if (currentIds.includes(cleanId)) {
    return currentIds.filter((id) => id !== cleanId);
  }
  return [cleanId, ...currentIds].slice(0, 50);
}

export function updateRecentlyViewedIds(
  currentIds: string[],
  productId: string,
  maxItems = 6
): string[] {
  const cleanId = String(productId || "").trim();
  if (!cleanId) return [...currentIds];
  return [cleanId, ...currentIds.filter((id) => id !== cleanId)].slice(0, Math.max(1, maxItems));
}

export interface PersistedCartItemInput {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  sku?: string;
}

export function reconcilePersistedCart<T extends PersistedCartItemInput>(
  rawItems: unknown,
  liveCatalog: Array<Record<string, any>>
): T[] {
  if (!Array.isArray(rawItems) || !Array.isArray(liveCatalog)) return [];
  const catalogById = new Map<string, Record<string, any>>();
  for (const prod of liveCatalog) {
    if (prod?.id && prod.showOnWebsite && !prod.isArchived) {
      catalogById.set(String(prod.id), prod);
    }
  }

  const result: T[] = [];
  const seen = new Set<string>();
  for (const item of rawItems) {
    if (!item || typeof item !== "object") continue;
    const id = String((item as any).id || "").trim();
    if (!id || seen.has(id)) continue;
    const liveProd = catalogById.get(id);
    if (!liveProd) continue;
    const liveStock = Number(liveProd.stock) || 0;
    if (liveStock <= 0) continue;

    seen.add(id);
    const requestedQty = Math.max(1, Math.floor(Number((item as any).quantity) || 1));
    const cappedQty = Math.min(requestedQty, liveStock);
    const livePrice =
      liveProd.onlinePrice !== undefined && liveProd.onlinePrice !== null
        ? Number(liveProd.onlinePrice)
        : Number(liveProd.price) || 0;

    result.push({
      id,
      name: String(liveProd.name || (item as any).name || "Item"),
      price: livePrice,
      quantity: cappedQty,
      image: Array.isArray(liveProd.images) ? liveProd.images[0] : (item as any).image,
      sku: liveProd.sku || (item as any).sku,
    } as T);
  }
  return result;
}

export interface SearchQuerySummary {
  query: string;
  count: number;
  zeroResults: number;
}

export interface StorefrontFunnelMetrics {
  uniqueSessions: number;
  storefrontViews: number;
  productViews: number;
  addToCarts: number;
  beginCheckouts: number;
  whatsappClicks: number;
  paidOrders: number;
  paidRevenue: number;
  averageOrderValue: number;
  couponOrdersCount: number;
  viewToCartRate: number;
  cartToOrderRate: number;
  overallConversionRate: number;
  deviceBreakdown: {
    mobileSessions: number;
    desktopSessions: number;
    mobilePercent: number;
    desktopPercent: number;
  };
  topSearchQueries: SearchQuerySummary[];
}

export function computeStorefrontFunnelMetrics(
  events: Array<Record<string, any>>,
  paidOrders: Array<Record<string, any>>
): StorefrontFunnelMetrics {
  const safeEvents = Array.isArray(events) ? events : [];
  const safePaid = Array.isArray(paidOrders) ? paidOrders : [];

  const sessionDeviceMap = new Map<string, "mobile" | "desktop">();
  let storefrontViews = 0;
  let productViews = 0;
  let addToCarts = 0;
  let beginCheckouts = 0;
  let whatsappClicks = 0;

  const searchMap = new Map<string, { display: string; count: number; zeroResults: number }>();

  for (const ev of safeEvents) {
    const sId = String(ev?.sessionId || "").trim();
    const device = ev?.device === "mobile" ? "mobile" : "desktop";
    if (sId && !sessionDeviceMap.has(sId)) {
      sessionDeviceMap.set(sId, device);
    }

    switch (ev?.eventName) {
      case "storefront_view":
        storefrontViews += 1;
        break;
      case "product_view":
        productViews += 1;
        break;
      case "add_to_cart":
        addToCarts += 1;
        break;
      case "begin_checkout":
        beginCheckouts += 1;
        break;
      case "whatsapp_order_click":
        whatsappClicks += 1;
        break;
      case "search": {
        const rawQuery = String(ev?.data?.query || "").trim();
        if (rawQuery.length >= 2) {
          const key = rawQuery.toLowerCase();
          const current = searchMap.get(key) || {
            display: rawQuery,
            count: 0,
            zeroResults: 0,
          };
          current.count += 1;
          if (Number(ev?.data?.resultsCount) === 0) {
            current.zeroResults += 1;
          }
          searchMap.set(key, current);
        }
        break;
      }
    }
  }

  let mobileSessions = 0;
  let desktopSessions = 0;
  sessionDeviceMap.forEach((dev) => {
    if (dev === "mobile") mobileSessions += 1;
    else desktopSessions += 1;
  });

  const uniqueSessions = sessionDeviceMap.size;
  const mobilePercent =
    uniqueSessions > 0 ? Math.round((mobileSessions / uniqueSessions) * 100) : 0;
  const desktopPercent = uniqueSessions > 0 ? 100 - mobilePercent : 0;

  let paidRevenue = 0;
  let couponOrdersCount = 0;
  for (const order of safePaid) {
    paidRevenue += Number(order?.amount) || 0;
    if (order?.couponCode || Number(order?.discountAmount) > 0) {
      couponOrdersCount += 1;
    }
  }

  const paidOrdersCount = safePaid.length;
  const averageOrderValue = paidOrdersCount > 0 ? Math.round(paidRevenue / paidOrdersCount) : 0;

  const pct = (num: number, den: number) =>
    den > 0 ? Math.min(100, Number(((num / den) * 100).toFixed(1))) : 0;

  const viewBase = storefrontViews > 0 ? storefrontViews : uniqueSessions;
  const viewToCartRate = pct(addToCarts, Math.max(productViews, viewBase));
  const cartToOrderRate = pct(paidOrdersCount, addToCarts);
  const overallConversionRate = pct(paidOrdersCount, uniqueSessions || storefrontViews);

  const topSearchQueries: SearchQuerySummary[] = Array.from(searchMap.values())
    .sort((a, b) => b.count - a.count || b.zeroResults - a.zeroResults)
    .slice(0, 6)
    .map((item) => ({
      query: item.display,
      count: item.count,
      zeroResults: item.zeroResults,
    }));

  return {
    uniqueSessions,
    storefrontViews,
    productViews,
    addToCarts,
    beginCheckouts,
    whatsappClicks,
    paidOrders: paidOrdersCount,
    paidRevenue,
    averageOrderValue,
    couponOrdersCount,
    viewToCartRate,
    cartToOrderRate,
    overallConversionRate,
    deviceBreakdown: {
      mobileSessions,
      desktopSessions,
      mobilePercent,
      desktopPercent,
    },
    topSearchQueries,
  };
}

export interface StorefrontActionInsight {
  id: string;
  title: string;
  description: string;
  severity: "opportunity" | "warning" | "healthy";
  targetTab: "overview" | "design" | "catalog" | "seo" | "settings";
  metricTag: string;
}

export function generateStorefrontActionInsights(input: {
  websiteStatus?: string | null;
  onlineProductsCount: number;
  activeCouponsCount: number;
  freeShippingThreshold: number;
  heroLayout: StoreHeroLayout;
  heroImageUrl?: string;
  trackingConfig: StoreTrackingConfig;
  seoTitle?: string;
  seoDescription?: string;
  funnel: StorefrontFunnelMetrics;
}): StorefrontActionInsight[] {
  const insights: StorefrontActionInsight[] = [];

  if (input.websiteStatus !== "published") {
    insights.push({
      id: "publish-storefront",
      title: "Storefront is Still in Draft Mode",
      description:
        "Public search indexing and share links are restricted until you publish your storefront.",
      severity: "warning",
      targetTab: "overview",
      metricTag: "DRAFT",
    });
  }

  const zeroResultSearch = input.funnel.topSearchQueries.find((q) => q.zeroResults > 0);
  if (zeroResultSearch) {
    insights.push({
      id: "missed-search-demand",
      title: `Unfulfilled Search: "${zeroResultSearch.query}"`,
      description: `Shoppers searched for "${zeroResultSearch.query}" (${zeroResultSearch.zeroResults} zero-result lookup). Publish matching inventory or adjust product keywords.`,
      severity: "opportunity",
      targetTab: "catalog",
      metricTag: `${zeroResultSearch.zeroResults} MISSED`,
    });
  }

  if (input.onlineProductsCount < 4) {
    insights.push({
      id: "expand-online-catalog",
      title: "Expand Your Online Catalog",
      description: `Only ${input.onlineProductsCount} products are currently marked visible on your storefront. Enable at least 4 items to fill desktop grid rows cleanly.`,
      severity: "opportunity",
      targetTab: "catalog",
      metricTag: `${input.onlineProductsCount} LIVE`,
    });
  }

  if (input.activeCouponsCount === 0) {
    insights.push({
      id: "add-first-coupon",
      title: "Launch a Welcome Promo Code",
      description:
        "No active promo coupons are configured. Adding a starter discount code in Core Config helps lift bag-to-checkout completion.",
      severity: "opportunity",
      targetTab: "settings",
      metricTag: "0 COUPONS",
    });
  }

  if (input.freeShippingThreshold <= 0) {
    insights.push({
      id: "set-shipping-threshold",
      title: "Set a Free-Delivery Progress Target",
      description:
        "Configure a Free Shipping Threshold in Core Config to unlock the live progress bar inside customer shopping bags and raise average order value.",
      severity: "opportunity",
      targetTab: "settings",
      metricTag: "NO THRESHOLD",
    });
  }

  if (
    (input.heroLayout === "split_showcase" || input.heroLayout === "editorial_cover") &&
    !input.heroImageUrl
  ) {
    insights.push({
      id: "upload-hero-banner",
      title: "Upload a Custom Hero Cover Photo",
      description: `Your active "${input.heroLayout.replace("_", " ")}" layout looks strongest with a custom hero banner uploaded in Design & Theme.`,
      severity: "opportunity",
      targetTab: "design",
      metricTag: "HERO IMAGE",
    });
  }

  if (
    !isValidGa4MeasurementId(input.trackingConfig.ga4MeasurementId) &&
    !isValidMetaPixelId(input.trackingConfig.metaPixelId)
  ) {
    insights.push({
      id: "connect-analytics-pixels",
      title: "Connect GA4 or Meta Pixel Tracking",
      description:
        "Add a GA4 Measurement ID or Meta Pixel ID in SEO & Social to sync product views, cart events, and purchases automatically.",
      severity: "opportunity",
      targetTab: "seo",
      metricTag: "NO PIXEL",
    });
  }

  if (!input.seoTitle?.trim() || !input.seoDescription?.trim()) {
    insights.push({
      id: "complete-seo-tags",
      title: "Complete Store Meta Title & Description",
      description:
        "Search snippets and WhatsApp link previews rely on your SEO Title and Description configured under SEO & Social.",
      severity: "opportunity",
      targetTab: "seo",
      metricTag: "SEO GAPS",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "storefront-fully-configured",
      title: "Conversion & Tracking Stack Configured",
      description:
        "Your catalog, promo rules, SEO metadata, and analytics tracking are configured cleanly. Monitor shopper searches and cart drop-off in Visitor Insights.",
      severity: "healthy",
      targetTab: "overview",
      metricTag: `${input.funnel.overallConversionRate}% CONV`,
    });
  }

  return insights.slice(0, 4);
}

export interface StoreCategorySummary {
  name: string;
  count: number;
  minPrice: number;
  imageUrl: string | null;
}

export function deriveStorefrontCategorySummaries(
  products: Array<Record<string, any>>,
  maxCategories = 6
): StoreCategorySummary[] {
  if (!Array.isArray(products) || products.length === 0) return [];
  const groups = new Map<
    string,
    { name: string; count: number; minPrice: number; imageUrl: string | null }
  >();

  for (const prod of products) {
    if (!prod || prod.isArchived || prod.showOnWebsite === false) continue;
    const rawCat = String(prod.category || "").trim() || "Featured Collection";
    const key = rawCat.toLowerCase();
    const effectivePrice =
      prod.onlinePrice !== undefined && prod.onlinePrice !== null
        ? Number(prod.onlinePrice)
        : Number(prod.price) || 0;
    const images = getProductGalleryImages(prod);
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        name: rawCat,
        count: 1,
        minPrice: effectivePrice,
        imageUrl: images[0] || null,
      });
    } else {
      existing.count += 1;
      if (effectivePrice > 0 && (existing.minPrice <= 0 || effectivePrice < existing.minPrice)) {
        existing.minPrice = effectivePrice;
      }
      if (!existing.imageUrl && images[0]) {
        existing.imageUrl = images[0];
      }
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, Math.max(1, maxCategories));
}

export function extractYouTubeVideoId(rawUrl: unknown): string | null {
  const input = String(rawUrl || "").trim();
  if (!input) return null;
  try {
    const parsed = new URL(input);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0];
      return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const vParam = parsed.searchParams.get("v");
      if (vParam && /^[A-Za-z0-9_-]{6,20}$/.test(vParam)) return vParam;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if ((parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") && parts[1]) {
        return /^[A-Za-z0-9_-]{6,20}$/.test(parts[1]) ? parts[1] : null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function buildGoogleMapsPlaceUrl(
  explicitMapUrl: unknown,
  address: string,
  storeName: string
): string {
  const sanitized = sanitizeExternalUrl(explicitMapUrl);
  if (sanitized) return sanitized;
  const query = [storeName, address].map((v) => String(v || "").trim()).filter(Boolean).join(", ");
  if (!query) return "https://maps.google.com";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function validateStorefrontLeadInput(input: {
  name?: string;
  contact?: string;
}): { valid: boolean; contactType?: "phone" | "email"; cleanedContact?: string; error?: string } {
  const name = String(input.name || "").trim();
  const contact = String(input.contact || "").trim();

  if (name.length < 2) {
    return { valid: false, error: "Please enter your name (at least 2 characters)." };
  }
  if (!contact) {
    return { valid: false, error: "Please enter a WhatsApp mobile number or email address." };
  }

  if (contact.includes("@")) {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact);
    if (!emailOk) {
      return { valid: false, error: "Please enter a valid email address." };
    }
    return { valid: true, contactType: "email", cleanedContact: contact.toLowerCase() };
  }

  const digits = contact.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) {
    return {
      valid: false,
      error: "Please enter a valid 10-digit WhatsApp mobile number or email address.",
    };
  }
  return { valid: true, contactType: "phone", cleanedContact: digits.slice(-10) };
}

// ============================================================================
// SALES FUNNEL & LANDING PAGE BUILDER ENGINE
// Reuses StoreSection, Theme, Coupons, Shipping, Tracking & Checkout settings.
// ============================================================================

export type StoreFunnelGoal = "direct_checkout" | "lead_capture" | "whatsapp_consult";
export type StoreFunnelTemplateId = "product_launch" | "combo_cod" | "lead_magnet";

export interface StoreFunnelConfig {
  id: string;
  kind: "funnel";
  name: string;
  slug: string;
  status: "draft" | "published";
  goal: StoreFunnelGoal;
  templateId: StoreFunnelTemplateId;
  targetProductId: string;
  orderBumpProductId: string;
  couponCode: string;
  stickyCtaEnabled: boolean;
  stickyCtaLabel: string;
  inheritStoreTheme: boolean;
  accentColorOverride: string;
  seoTitle: string;
  seoDescription: string;
  sections: StoreSection[];
}

export interface StoreFunnelTemplateDef {
  id: StoreFunnelTemplateId;
  name: string;
  tagline: string;
  goal: StoreFunnelGoal;
  stickyCtaLabel: string;
  defaultSlug: string;
  sectionTypes: StoreSectionType[];
}

export const STORE_FUNNEL_TEMPLATES: StoreFunnelTemplateDef[] = [
  {
    id: "product_launch",
    name: "Flagship Product Launch Funnel",
    tagline: "Hero -> Trust -> Problem/Solution -> Video Demo -> Value Stack -> Guarantee -> Express Checkout",
    goal: "direct_checkout",
    stickyCtaLabel: "Claim Launch Offer Now",
    defaultSlug: "launch-offer",
    sectionTypes: [
      "hero",
      "trust_strip",
      "problem_solution",
      "media_showcase",
      "how_it_works",
      "offer_stack",
      "testimonials",
      "guarantee_seal",
      "faq",
      "express_checkout",
    ],
  },
  {
    id: "combo_cod",
    name: "High-Converting Combo & COD Funnel",
    tagline: "Urgency Timer -> Bundle Tiers -> Us vs Others -> Live Offers -> Express COD Checkout",
    goal: "direct_checkout",
    stickyCtaLabel: "Order Combo with COD",
    defaultSlug: "combo-deal",
    sectionTypes: [
      "hero",
      "timer",
      "pricing_tiers",
      "comparison_table",
      "offers",
      "testimonials",
      "guarantee_seal",
      "faq",
      "express_checkout",
    ],
  },
  {
    id: "lead_magnet",
    name: "Lead Capture & Consultation Funnel",
    tagline: "Hero -> Value Pillars -> How It Works -> Demo Video -> VIP Lead Form -> Store Pickup / WhatsApp",
    goal: "lead_capture",
    stickyCtaLabel: "Request Instant Callback",
    defaultSlug: "vip-access",
    sectionTypes: [
      "hero",
      "trust_strip",
      "problem_solution",
      "how_it_works",
      "media_showcase",
      "testimonials",
      "newsletter",
      "store_location",
      "whatsapp",
    ],
  },
];

export function createFunnelFromTemplate(params: {
  templateId: StoreFunnelTemplateId;
  name?: string;
  slug?: string;
  targetProductId?: string;
  targetProductName?: string;
  id?: string;
}): StoreFunnelConfig {
  const tpl =
    STORE_FUNNEL_TEMPLATES.find((t) => t.id === params.templateId) ||
    STORE_FUNNEL_TEMPLATES[0];

  const cleanId =
    params.id || `funnel_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  const funnelName =
    (params.name || "").trim() ||
    (params.targetProductName
      ? `${params.targetProductName} — Offer Funnel`
      : tpl.name);
  const cleanSlug =
    sanitizeStoreSlug(params.slug || funnelName) || tpl.defaultSlug;

  const sections = tpl.sectionTypes.map((type, idx) => {
    const sec = createStoreSection(type);
    sec.id = `${type}_${idx + 1}`;
    if (type === "hero" && params.targetProductName) {
      sec.content = {
        ...sec.content,
        badgeText: "EXCLUSIVE FUNNEL OFFER",
        title: `Get ${params.targetProductName} — Direct Store Deal`,
        cta: tpl.stickyCtaLabel,
      };
    }
    return sec;
  });

  return {
    id: cleanId,
    kind: "funnel",
    name: funnelName,
    slug: cleanSlug,
    status: "draft",
    goal: tpl.goal,
    templateId: tpl.id,
    targetProductId: (params.targetProductId || "").trim(),
    orderBumpProductId: "",
    couponCode: "",
    stickyCtaEnabled: true,
    stickyCtaLabel: tpl.stickyCtaLabel,
    inheritStoreTheme: true,
    accentColorOverride: "",
    seoTitle: funnelName,
    seoDescription: tpl.tagline,
    sections,
  };
}

export function normalizeFunnelConfig(
  raw: Record<string, any> | undefined | null,
  fallbackId = "funnel_default"
): StoreFunnelConfig {
  const data = raw && typeof raw === "object" ? raw : {};
  const templateId: StoreFunnelTemplateId =
    data.templateId === "combo_cod" || data.templateId === "lead_magnet"
      ? data.templateId
      : "product_launch";
  const goal: StoreFunnelGoal =
    data.goal === "lead_capture" || data.goal === "whatsapp_consult"
      ? data.goal
      : "direct_checkout";

  const base = createFunnelFromTemplate({
    templateId,
    id: String(data.id || fallbackId),
    name: typeof data.name === "string" ? data.name : undefined,
    slug: typeof data.slug === "string" ? data.slug : undefined,
    targetProductId: typeof data.targetProductId === "string" ? data.targetProductId : "",
  });

  return {
    id: String(data.id || fallbackId),
    kind: "funnel",
    name: String(data.name || base.name).trim() || base.name,
    slug: sanitizeStoreSlug(data.slug || base.slug) || base.slug,
    status: data.status === "published" ? "published" : "draft",
    goal,
    templateId,
    targetProductId: String(data.targetProductId || "").trim(),
    orderBumpProductId: String(data.orderBumpProductId || "").trim(),
    couponCode: sanitizeCouponCode(data.couponCode || ""),
    stickyCtaEnabled: data.stickyCtaEnabled !== false,
    stickyCtaLabel:
      String(data.stickyCtaLabel || base.stickyCtaLabel).trim() || base.stickyCtaLabel,
    inheritStoreTheme: data.inheritStoreTheme !== false,
    accentColorOverride: /^#[0-9a-f]{3,8}$/i.test(String(data.accentColorOverride || "").trim())
      ? String(data.accentColorOverride).trim()
      : "",
    seoTitle: String(data.seoTitle || data.name || base.name).trim(),
    seoDescription: String(data.seoDescription || base.seoDescription).trim(),
    sections:
      Array.isArray(data.sections) && data.sections.length > 0
        ? normalizeStoreSections(data.sections, { requireCatalogGrid: false })
        : base.sections,
  };
}

export function resolveFunnelPreviewUrl(params: {
  businessId?: string | null;
  businessSlug?: string | null;
  funnelId?: string | null;
  funnelSlug?: string | null;
  templateId?: StoreFunnelTemplateId | null;
  isPreview?: boolean;
}): string {
  const parts: string[] = [];
  const bId = (params.businessId || "").trim();
  const bSlug = sanitizeStoreSlug(params.businessSlug || "");
  const fId = (params.funnelId || "").trim();
  const fSlug = sanitizeStoreSlug(params.funnelSlug || "");

  if (bSlug) parts.push(`slug=${encodeURIComponent(bSlug)}`);
  if (bId) parts.push(`bId=${encodeURIComponent(bId)}`);
  if (fId) parts.push(`fId=${encodeURIComponent(fId)}`);
  if (fSlug) parts.push(`fSlug=${encodeURIComponent(fSlug)}`);
  if (params.templateId) parts.push(`template=${encodeURIComponent(params.templateId)}`);
  if (params.isPreview) parts.push("preview=1");

  return parts.length > 0 ? `/funnel?${parts.join("&")}` : "/funnel";
}

export interface FunnelAnalyticsMetrics {
  funnelId: string;
  views: number;
  checkoutsStarted: number;
  ordersCount: number;
  leadsCount: number;
  revenue: number;
  conversionRate: number;
}

export function computeFunnelMetrics(params: {
  funnelId: string;
  funnelSlug?: string;
  events: Array<Record<string, any>>;
  orders: Array<Record<string, any>>;
  leads?: Array<Record<string, any>>;
}): FunnelAnalyticsMetrics {
  const targetId = String(params.funnelId || "").trim();
  const targetSlug = sanitizeStoreSlug(params.funnelSlug || "");

  const matchesFunnel = (record: Record<string, any> | undefined | null): boolean => {
    if (!record) return false;
    const recId = String(record.funnelId || record.data?.funnelId || "").trim();
    const recSlug = sanitizeStoreSlug(record.funnelSlug || record.data?.funnelSlug || "");
    if (targetId && recId === targetId) return true;
    if (targetSlug && recSlug === targetSlug) return true;
    return false;
  };

  let views = 0;
  let checkoutsStarted = 0;
  for (const ev of params.events || []) {
    if (!matchesFunnel(ev)) continue;
    if (ev.eventName === "page_view") views += 1;
    if (ev.eventName === "begin_checkout" || ev.eventName === "add_to_cart") {
      checkoutsStarted += 1;
    }
  }

  let ordersCount = 0;
  let revenue = 0;
  for (const ord of params.orders || []) {
    if (!matchesFunnel(ord)) continue;
    const status = String(ord.status || "").toLowerCase();
    if (status === "cancelled" || status === "refunded") continue;
    ordersCount += 1;
    if (["paid", "processing", "shipped", "delivered"].includes(status)) {
      revenue += Number(ord.amount) || 0;
    }
  }

  const leadsCount = (params.leads || []).filter((l) => matchesFunnel(l)).length;
  const totalConversions = ordersCount + leadsCount;
  const conversionRate =
    views > 0 ? Number(((totalConversions / views) * 100).toFixed(1)) : 0;

  return {
    funnelId: targetId,
    views,
    checkoutsStarted,
    ordersCount,
    leadsCount,
    revenue,
    conversionRate,
  };
}




