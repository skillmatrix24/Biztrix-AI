import { differenceInDays, parseISO } from "date-fns";

export type TenantLifecycleCategory =
  | "pro"
  | "healthy_trial"
  | "grace_period"
  | "warning"
  | "stale_purge";

export interface TenantLifecycleInfo {
  category: TenantLifecycleCategory;
  label: string;
  badgeClass: string;
  daysExpired: number;
  isPurgeRecommended: boolean;
  isProtected: boolean;
}

/**
 * Standard business subcollections in Biztrix AI for deep recursive cleanup.
 */
export const KNOWN_BUSINESS_SUBCOLLECTIONS = [
  "products",
  "orders",
  "cashbook",
  "customers",
  "vendors",
  "leads",
  "tasks",
  "quotations",
  "invoices",
  "complaints",
  "attendance",
  "staffPayments",
  "projects",
  "fixedExpenses",
  "paymentRequests",
  "invites",
  "users",
  "team",
  "websites",
  "funnels",
  "whatsapp_chats",
  "whatsapp_messages",
  "whatsapp_contacts",
  "whatsapp_campaigns",
  "solar_plants",
  "solar_inquiries",
  "solar_surveys",
  "solar_designs",
  "solar_installations",
  "solar_warranties",
  "solar_amc",
  "solar_service",
  "solar_commissions",
  "solar_requisitions",
  "loyalty_members",
  "loyalty_coupons",
  "loyalty_tiers",
  "realestate_properties",
  "realestate_leads",
] as const;

/**
 * Computes how many days ago a tenant's trial expired.
 * Negative number means trial is still active with X days remaining.
 */
export function computeTenantInactivityDays(
  business: any,
  now: Date = new Date()
): number {
  if (!business) return 0;
  const status = String(business.status || "").toLowerCase().trim();
  if (status === "pro" || status === "active") return -9999;

  const rawEnd = business.trialEndDate || business.trialEndsAt;
  if (!rawEnd) return 0;

  const endDate =
    typeof rawEnd?.toDate === "function"
      ? rawEnd.toDate()
      : typeof rawEnd === "string"
        ? parseISO(rawEnd)
        : rawEnd instanceof Date
          ? rawEnd
          : null;

  if (!endDate || Number.isNaN(endDate.getTime())) return 0;

  // If endDate is in the past, difference is positive days expired
  return differenceInDays(now, endDate);
}

/**
 * Categorizes a business into safe SaaS lifecycle buckets.
 */
export function categorizeTenantLifecycle(
  business: any,
  now: Date = new Date()
): TenantLifecycleInfo {
  const status = String(business?.status || "").toLowerCase().trim();

  // 1. Pro / Paid businesses are 100% protected
  if (status === "pro" || status === "active") {
    return {
      category: "pro",
      label: "Active Pro (Protected)",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      daysExpired: -9999,
      isPurgeRecommended: false,
      isProtected: true,
    };
  }

  const daysExpired = computeTenantInactivityDays(business, now);

  // 2. Active Trial
  if (daysExpired < 0) {
    const daysLeft = Math.abs(daysExpired);
    return {
      category: "healthy_trial",
      label: `Active Trial (${daysLeft}d left)`,
      badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
      daysExpired,
      isPurgeRecommended: false,
      isProtected: true,
    };
  }

  // 3. Grace Period (0 to 14 days expired) - keep for renewal
  if (daysExpired <= 14) {
    return {
      category: "grace_period",
      label: `Grace Period (Expired ${daysExpired}d ago)`,
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
      daysExpired,
      isPurgeRecommended: false,
      isProtected: false,
    };
  }

  // 4. Warning Phase (15 to 45 days expired)
  if (daysExpired <= 45) {
    return {
      category: "warning",
      label: `Warning (Expired ${daysExpired}d ago)`,
      badgeClass: "bg-orange-100 text-orange-800 border-orange-300",
      daysExpired,
      isPurgeRecommended: false,
      isProtected: false,
    };
  }

  // 5. Stale / Safe to Purge (>45 days expired)
  return {
    category: "stale_purge",
    label: `Stale Trial (Expired ${daysExpired}d ago)`,
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
    daysExpired,
    isPurgeRecommended: true,
    isProtected: false,
  };
}

/**
 * Pure filter function for the Cleanup Dashboard table.
 */
export function filterTenantsForCleanup(
  businesses: any[],
  filterCategory: string,
  searchQuery: string,
  now: Date = new Date()
): Array<any & { lifecycle: TenantLifecycleInfo }> {
  if (!Array.isArray(businesses)) return [];
  const q = String(searchQuery || "").toLowerCase().trim();

  return businesses
    .map((biz) => ({
      ...biz,
      lifecycle: categorizeTenantLifecycle(biz, now),
    }))
    .filter((item) => {
      // Category filter
      if (filterCategory !== "all" && item.lifecycle.category !== filterCategory) {
        return false;
      }
      // Search query filter
      if (!q) return true;
      const name = String(item.name || "").toLowerCase();
      const id = String(item.id || "").toLowerCase();
      const email = String(item.ownerEmail || item.email || "").toLowerCase();
      const phone = String(item.phone || "").toLowerCase();
      return (
        name.includes(q) ||
        id.includes(q) ||
        email.includes(q) ||
        phone.includes(q)
      );
    })
    .sort((a, b) => b.lifecycle.daysExpired - a.lifecycle.daysExpired);
}
