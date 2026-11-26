import { ModuleDetail, MarketplaceItem } from "../types";

export const ecommerceItem: MarketplaceItem = {
  id: "suite_ecommerce",
  name: "E-Commerce & Funnel Mega Combo",
  description: "23-Section Storefront, Landing Page Sales Funnels, WhatsApp Automation, Loyalty Rewards & AI OCR Bill Scanner.",
  price: "1499",
  icon: "ShoppingBag",
  isPopular: true,
  category: "Bundles",
  isTrialAvailable: true,
  inclusions: "Storefront & Visual Editor, Sales Funnel Engine, Meta WhatsApp API, VIP Loyalty Tiers, Coupon ROI, AI Bill OCR",
  sortOrder: 1,
};

export const ecommerceDetail: ModuleDetail = {
  id: "suite_ecommerce",
  title: "E-Commerce & Sales Funnel Mega Combo",
  logicTitle: "Omnichannel D2C & Retail Engine",
  description: "The complete digital sales powerhouse: run an interactive online storefront, build distraction-free sales funnels, recover abandoned carts on WhatsApp, and reward loyal customers.",
  sections: [
    {
      title: "Storefront & Visual Editor",
      icon: "ShoppingBag",
      desc: "23 drag-and-drop sections, responsive mobile simulator, custom domain DNS mapping, and Razorpay/COD checkout.",
    },
    {
      title: "Sales Funnel Builder",
      icon: "Zap",
      desc: "7 high-converting funnel templates (AIDA, Lead Squeeze, VSL, Flash Sale, Webinar, Consultation) with 1-click upsells.",
    },
    {
      title: "WhatsApp Marketing Drips",
      icon: "SmartphoneNfc",
      desc: "Meta Cloud API v21.0 integration, automated abandoned cart recovery, keyword responders, and broadcast campaigns.",
    },
    {
      title: "Loyalty & Customer Retention",
      icon: "Trophy",
      desc: "Digital membership passes, spend-to-points multipliers, dynamic discount coupons, and VIP tier automation.",
    },
  ],
  features: [
    "23-Section Pro E-Commerce Storefront + Drag-and-Drop Visual Editor",
    "Sales Funnel & Landing Page Builder with Order Bumps & 1-Click Upsells",
    "Official Meta Cloud API WhatsApp Broadcast & 3-Step Nurturing Drips",
    "Customer Loyalty Pass & Multi-Tier Cashback Points Engine",
    "Photo-to-Inventory OCR Scanner for Supplier Bill Restocking",
    "Custom Domain DNS Mapping (A/CNAME) & Meta Pixel / GA4 Tracking",
  ],
  rules: [
    "Catalog Sync: Storefront inventory updates in real time from master stock.",
    "Funnel Isolation: Sales funnels operate on dedicated high-speed routes.",
    "Spam Shield: WhatsApp broadcasts are rate-limited per Meta API standards.",
  ],
  backend: "Real-time Firestore listeners for instant order checkout, stock reservation, and payment reconciliation.",
};
