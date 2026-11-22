/**
 * Growth Engine & WhatsApp Automation Suite
 * Standardized utility functions for phone normalization, keyword matching,
 * Meta Cloud API template validation, campaign metrics, and coupon calculation.
 */

/**
 * Normalizes phone numbers to standard format for Meta WhatsApp Cloud API (e.g. 919876543210).
 */
export function normalizeWhatsAppPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  let clean = phone.replace(/\D/g, '');

  if (clean.startsWith('0')) {
    clean = clean.substring(1);
  }

  // 10-digit Indian mobile number
  if (clean.length === 10) {
    return `91${clean}`;
  }

  return clean;
}

/**
 * Determines whether an inbound customer text matches a configured keyword rule.
 */
export function matchKeywordTrigger(
  incomingText: string,
  keywordsString: string,
  matchType: 'exact' | 'contains' = 'contains'
): boolean {
  if (!incomingText || !keywordsString) return false;

  const normalizedInput = incomingText.trim().toLowerCase();
  const keywordList = keywordsString
    .toLowerCase()
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  if (keywordList.length === 0) return false;

  if (matchType === 'exact') {
    return keywordList.includes(normalizedInput);
  }

  return keywordList.some((kw) => normalizedInput.includes(kw));
}

export interface CampaignMetricsSummary {
  totalCampaigns: number;
  totalRecipients: number;
  totalDelivered: number;
  deliveryRate: number;
}

/**
 * Computes live campaign analytics from Firestore campaign records.
 */
export function calculateCampaignMetrics(campaigns: any[] = []): CampaignMetricsSummary {
  const list = campaigns || [];
  const totalCampaigns = list.length;
  const totalRecipients = list.reduce((sum, c) => sum + (Number(c?.recipientCount) || 0), 0);
  const deliveredCampaigns = list.filter((c) => c?.status === 'sent' || c?.status === 'delivered');
  const totalDelivered = deliveredCampaigns.reduce(
    (sum, c) => sum + (Number(c?.deliveredCount || c?.recipientCount) || 0),
    0
  );

  const deliveryRate =
    totalCampaigns > 0 ? Math.round((deliveredCampaigns.length / totalCampaigns) * 100) : 0;

  return {
    totalCampaigns,
    totalRecipients,
    totalDelivered,
    deliveryRate,
  };
}

/**
 * Validates a Meta message template before submission.
 */
export function validateMetaTemplate(template: {
  name: string;
  category: string;
  bodyText: string;
  exampleValues?: string[];
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  const cleanName = String(template?.name || '').trim();
  if (!cleanName) {
    errors.push('Template name is required.');
  } else if (!/^[a-z0-9_]+$/.test(cleanName)) {
    errors.push('Template name must be lowercase alphanumeric with underscores only.');
  }

  const validCategories = ['MARKETING', 'UTILITY', 'AUTHENTICATION'];
  if (!validCategories.includes(String(template?.category || '').toUpperCase())) {
    errors.push('Category must be MARKETING, UTILITY, or AUTHENTICATION.');
  }

  const bodyText = String(template?.bodyText || '').trim();
  if (!bodyText) {
    errors.push('Template body text is required.');
  } else {
    // Count {{1}}, {{2}} placeholders
    const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
    const uniquePlaceholders = new Set(matches);
    const exampleCount = template.exampleValues?.length || 0;

    if (uniquePlaceholders.size > 0 && exampleCount < uniquePlaceholders.size) {
      errors.push(
        `Template contains ${uniquePlaceholders.size} variable(s), but only ${exampleCount} sample value(s) provided.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export interface CouponDiscountResult {
  discountAmount: number;
  finalAmount: number;
  eligible: boolean;
  reason?: string;
}

/**
 * Computes promotional coupon discount with minimum order and maximum cap logic.
 */
export function calculateCouponDiscount(
  coupon: {
    type: 'percentage' | 'fixed' | string;
    value: number;
    minOrder?: number;
    maxDiscount?: number;
    isActive?: boolean;
    expiresAt?: string;
  },
  orderAmount: number
): CouponDiscountResult {
  const safeOrder = Math.max(0, orderAmount || 0);

  if (coupon.isActive === false) {
    return { discountAmount: 0, finalAmount: safeOrder, eligible: false, reason: 'Coupon is inactive.' };
  }

  if (coupon.expiresAt) {
    const expiry = new Date(coupon.expiresAt).getTime();
    if (!isNaN(expiry) && expiry < Date.now()) {
      return { discountAmount: 0, finalAmount: safeOrder, eligible: false, reason: 'Coupon has expired.' };
    }
  }

  const minOrder = Number(coupon.minOrder || 0);
  if (safeOrder < minOrder) {
    return {
      discountAmount: 0,
      finalAmount: safeOrder,
      eligible: false,
      reason: `Minimum order amount of ₹${minOrder} required.`,
    };
  }

  let discount = 0;
  const val = Number(coupon.value || 0);

  if (coupon.type === 'percentage') {
    discount = (safeOrder * val) / 100;
    if (coupon.maxDiscount && coupon.maxDiscount > 0) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else {
    // Flat / Fixed amount
    discount = Math.min(val, safeOrder);
  }

  discount = Math.round(discount * 100) / 100;
  const finalAmount = Math.max(0, Math.round((safeOrder - discount) * 100) / 100);

  return {
    discountAmount: discount,
    finalAmount,
    eligible: true,
  };
}
