import {
  NotificationStage,
  cleanWhatsAppPhone,
  isNotificationOnCooldown,
  resolveRecommendedNotificationStage,
} from "./cleanup-notifications";
import { computeTenantInactivityDays } from "./cleanup-audit";

export type MetaOutreachVariableKey =
  | "ownerName"
  | "businessName"
  | "daysStale"
  | "renewUrl"
  | "supportPhone"
  | "custom";

export interface StageMetaTemplateMapping {
  enabled: boolean;
  templateName: string;
  languageCode: string;
  bodyParamKeys: MetaOutreachVariableKey[];
  customValues?: Record<string, string>;
}

export interface PlatformMetaOutreachConfig {
  phoneId: string;
  wabaId: string;
  accessToken: string;
  verifiedDisplayPhone?: string;
  verifiedName?: string;
  supportPhone: string;
  isVerified: boolean;
  cooldownDays: number;
  autoDispatchEnabled: boolean;
  stageMappings: Record<NotificationStage, StageMetaTemplateMapping>;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MetaTemplateRecord {
  id?: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components?: Array<{
    type: string;
    text?: string;
    format?: string;
    buttons?: any[];
  }>;
}

export interface RecommendedMetaTemplateBlueprint {
  stage: NotificationStage;
  name: string;
  category: "UTILITY" | "MARKETING";
  language: string;
  bodyText: string;
  exampleValues: string[];
  bodyParamKeys: MetaOutreachVariableKey[];
  description: string;
}

export const META_VARIABLE_OPTIONS: Array<{
  key: MetaOutreachVariableKey;
  label: string;
  sample: string;
}> = [
  { key: "ownerName", label: "Owner Name", sample: "Rajesh Sharma" },
  { key: "businessName", label: "Business Name", sample: "Sharma Traders" },
  { key: "daysStale", label: "Days Expired / Stale", sample: "15" },
  { key: "renewUrl", label: "Renewal / Pricing Link", sample: "https://biztrix.in/pricing" },
  { key: "supportPhone", label: "Platform Support Phone", sample: "+91 98765 43210" },
  { key: "custom", label: "Custom Fixed Text", sample: "15 Days Free" },
];

export const RECOMMENDED_META_TEMPLATES: RecommendedMetaTemplateBlueprint[] = [
  {
    stage: "pre_expiry",
    name: "biztrix_trial_expiring",
    category: "UTILITY",
    language: "en_US",
    bodyText:
      "Namaste {{1}}, your Biztrix OS trial for {{2}} is expiring soon. Your billing, GST invoices, and inventory records are safe. Renew or extend access here: {{3}}. Support: {{4}}.",
    exampleValues: ["Rajesh Sharma", "Sharma Traders", "https://biztrix.in/pricing", "+91 98765 43210"],
    bodyParamKeys: ["ownerName", "businessName", "renewUrl", "supportPhone"],
    description: "Pre-expiry gentle reminder (Utility template).",
  },
  {
    stage: "grace",
    name: "biztrix_grace_extension",
    category: "UTILITY",
    language: "en_US",
    bodyText:
      "Namaste {{1}}, your trial for {{2}} expired {{3}} days ago. We have unlocked a complimentary extension so your billing and ledger continue smoothly. Reactivate now: {{4}}.",
    exampleValues: ["Rajesh Sharma", "Sharma Traders", "5", "https://biztrix.in/pricing"],
    bodyParamKeys: ["ownerName", "businessName", "daysStale", "renewUrl"],
    description: "Grace period 1-14 days reactivation notice.",
  },
  {
    stage: "warning",
    name: "biztrix_account_reactivate",
    category: "MARKETING",
    language: "en_US",
    bodyText:
      "Namaste {{1}}, your workspace {{2}} has been inactive for {{3}} days. All your POS records and customer ledger are safely stored. Resume anytime here: {{4}}.",
    exampleValues: ["Rajesh Sharma", "Sharma Traders", "25", "https://biztrix.in/pricing"],
    bodyParamKeys: ["ownerName", "businessName", "daysStale", "renewUrl"],
    description: "Win-back reminder for 15-49 days stale tenants.",
  },
  {
    stage: "purge_warning",
    name: "biztrix_final_purge_notice",
    category: "UTILITY",
    language: "en_US",
    bodyText:
      "Urgent Notice for {{1}}: Your inactive account {{2}} has been expired for {{3}} days and is scheduled for database cleanup in 7 days. Log in now to protect your records: {{4}}.",
    exampleValues: ["Rajesh Sharma", "Sharma Traders", "55", "https://biztrix.in/pricing"],
    bodyParamKeys: ["ownerName", "businessName", "daysStale", "renewUrl"],
    description: "Final pre-purge data retention warning (50+ days stale).",
  },
];

export const DEFAULT_PLATFORM_META_CONFIG: PlatformMetaOutreachConfig = {
  phoneId: "",
  wabaId: "",
  accessToken: "",
  supportPhone: "+91 98765 43210",
  isVerified: false,
  cooldownDays: 7,
  autoDispatchEnabled: false,
  stageMappings: {
    pre_expiry: {
      enabled: true,
      templateName: "biztrix_trial_expiring",
      languageCode: "en_US",
      bodyParamKeys: ["ownerName", "businessName", "renewUrl", "supportPhone"],
      customValues: {},
    },
    grace: {
      enabled: true,
      templateName: "biztrix_grace_extension",
      languageCode: "en_US",
      bodyParamKeys: ["ownerName", "businessName", "daysStale", "renewUrl"],
      customValues: {},
    },
    warning: {
      enabled: true,
      templateName: "biztrix_account_reactivate",
      languageCode: "en_US",
      bodyParamKeys: ["ownerName", "businessName", "daysStale", "renewUrl"],
      customValues: {},
    },
    purge_warning: {
      enabled: true,
      templateName: "biztrix_final_purge_notice",
      languageCode: "en_US",
      bodyParamKeys: ["ownerName", "businessName", "daysStale", "renewUrl"],
      customValues: {},
    },
  },
};

/**
 * Merges a partial Firestore config document with defaults safely.
 */
export function normalizePlatformMetaConfig(
  raw?: Partial<PlatformMetaOutreachConfig> | null
): PlatformMetaOutreachConfig {
  if (!raw) {
    return {
      ...DEFAULT_PLATFORM_META_CONFIG,
      stageMappings: {
        pre_expiry: { ...DEFAULT_PLATFORM_META_CONFIG.stageMappings.pre_expiry },
        grace: { ...DEFAULT_PLATFORM_META_CONFIG.stageMappings.grace },
        warning: { ...DEFAULT_PLATFORM_META_CONFIG.stageMappings.warning },
        purge_warning: { ...DEFAULT_PLATFORM_META_CONFIG.stageMappings.purge_warning },
      },
    };
  }

  const stages: NotificationStage[] = ["pre_expiry", "grace", "warning", "purge_warning"];
  const mergedMappings = {} as Record<NotificationStage, StageMetaTemplateMapping>;

  for (const stage of stages) {
    const def = DEFAULT_PLATFORM_META_CONFIG.stageMappings[stage];
    const incoming = raw.stageMappings?.[stage];
    mergedMappings[stage] = {
      enabled: incoming?.enabled ?? def.enabled,
      templateName: incoming?.templateName ?? def.templateName,
      languageCode: incoming?.languageCode || def.languageCode,
      bodyParamKeys: Array.isArray(incoming?.bodyParamKeys)
        ? incoming.bodyParamKeys
        : [...def.bodyParamKeys],
      customValues: incoming?.customValues || {},
    };
  }

  return {
    phoneId: String(raw.phoneId || "").trim(),
    wabaId: String(raw.wabaId || "").trim(),
    accessToken: String(raw.accessToken || "").trim(),
    verifiedDisplayPhone: raw.verifiedDisplayPhone || "",
    verifiedName: raw.verifiedName || "",
    supportPhone: String(raw.supportPhone || DEFAULT_PLATFORM_META_CONFIG.supportPhone).trim(),
    isVerified: Boolean(raw.isVerified),
    cooldownDays:
      typeof raw.cooldownDays === "number" && raw.cooldownDays >= 1
        ? Math.min(90, Math.floor(raw.cooldownDays))
        : 7,
    autoDispatchEnabled: Boolean(raw.autoDispatchEnabled),
    stageMappings: mergedMappings,
    updatedAt: raw.updatedAt,
    updatedBy: raw.updatedBy,
  };
}

/**
 * Sanitizes a Meta WhatsApp template name to lowercase snake_case (a-z0-9_).
 */
export function sanitizeMetaTemplateName(input: string): string {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

/**
 * Extracts how many unique positional variables ({{1}}, {{2}}, ...) exist in a template BODY component.
 */
export function extractMetaTemplatePlaceholderCount(
  templateOrBodyText?: MetaTemplateRecord | string | null
): number {
  if (!templateOrBodyText) return 0;

  let bodyText = "";
  if (typeof templateOrBodyText === "string") {
    bodyText = templateOrBodyText;
  } else {
    const bodyComp = templateOrBodyText.components?.find(
      (c) => String(c.type || "").toUpperCase() === "BODY"
    );
    bodyText = bodyComp?.text || "";
  }

  const matches = bodyText.match(/\{\{\d+\}\}/g);
  if (!matches) return 0;
  return new Set(matches).size;
}

/**
 * Sanitizes parameter text for Meta Cloud API (no newlines, tabs, or >4 consecutive spaces).
 */
export function sanitizeMetaParamValue(value: string | number | null | undefined): string {
  const cleaned = String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || "-";
}

/**
 * Resolves Meta Cloud API body components payload for a template mapping and tenant variables.
 */
export function buildMetaTemplateBodyComponents(
  mapping: Pick<StageMetaTemplateMapping, "bodyParamKeys" | "customValues">,
  tenantVars: {
    ownerName: string;
    businessName: string;
    daysStale: number;
    renewUrl: string;
    supportPhone: string;
  }
): {
  components: Array<{
    type: "body";
    parameters: Array<{ type: "text"; text: string }>;
  }>;
  resolvedValues: string[];
} {
  const keys = mapping.bodyParamKeys || [];
  if (keys.length === 0) {
    return { components: [], resolvedValues: [] };
  }

  const resolvedValues = keys.map((key, index) => {
    if (key === "custom") {
      return sanitizeMetaParamValue(mapping.customValues?.[String(index)] || "Biztrix");
    }
    const raw = tenantVars[key];
    return sanitizeMetaParamValue(raw);
  });

  return {
    components: [
      {
        type: "body",
        parameters: resolvedValues.map((text) => ({ type: "text", text })),
      },
    ],
    resolvedValues,
  };
}

export interface AutoDispatchCandidate {
  businessId: string;
  businessName: string;
  ownerName: string;
  phone: string;
  daysStale: number;
  stage: NotificationStage;
  templateName: string;
  languageCode: string;
  components: Array<{
    type: "body";
    parameters: Array<{ type: "text"; text: string }>;
  }>;
  resolvedValues: string[];
}

/**
 * Computes eligible tenants for automated Meta API template dispatch,
 * respecting non-Pro filter, valid phone numbers, enabled stage mappings, and cooldown window.
 */
export function getAutoDispatchCandidates(
  businesses: any[],
  config: PlatformMetaOutreachConfig,
  options?: {
    origin?: string;
    stagesFilter?: NotificationStage[];
    bypassCooldown?: boolean;
  }
): {
  eligible: AutoDispatchCandidate[];
  skippedCooldown: number;
  skippedNoPhone: number;
  skippedStageDisabled: number;
} {
  const origin = options?.origin || "https://biztrix.in";
  const stagesFilter = options?.stagesFilter;
  const bypassCooldown = Boolean(options?.bypassCooldown);

  const eligible: AutoDispatchCandidate[] = [];
  let skippedCooldown = 0;
  let skippedNoPhone = 0;
  let skippedStageDisabled = 0;

  for (const biz of businesses || []) {
    const status = String(biz?.status || "").toLowerCase();
    if (status === "pro" || status === "active_pro" || status === "active") {
      continue;
    }

    const daysStale = computeTenantInactivityDays(biz);
    // Only target businesses that are expired or expiring within 2 days
    if (daysStale === -9999 || daysStale < -2) {
      continue;
    }

    const stage = resolveRecommendedNotificationStage(biz.status, daysStale);
    if (stagesFilter && !stagesFilter.includes(stage)) {
      continue;
    }

    const mapping = config.stageMappings[stage];
    if (!mapping || !mapping.enabled || !mapping.templateName.trim()) {
      skippedStageDisabled++;
      continue;
    }

    const rawPhone = biz.phone || biz.ownerPhone || biz.contactPhone || "";
    const phone = cleanWhatsAppPhone(rawPhone);
    if (!phone || phone.length < 10) {
      skippedNoPhone++;
      continue;
    }

    if (!bypassCooldown) {
      const cooldown = isNotificationOnCooldown(biz.lastNotifiedAt, config.cooldownDays);
      if (cooldown.onCooldown) {
        skippedCooldown++;
        continue;
      }
    }

    const businessName = String(biz.name || biz.businessName || biz.id || "Your Business");
    const ownerName = String(biz.ownerName || biz.contactName || businessName);

    const { components, resolvedValues } = buildMetaTemplateBodyComponents(mapping, {
      ownerName,
      businessName,
      daysStale: daysStale > 0 ? daysStale : 1,
      renewUrl: `${origin}/pricing`,
      supportPhone: config.supportPhone || "+91 98765 43210",
    });

    eligible.push({
      businessId: biz.id,
      businessName,
      ownerName,
      phone,
      daysStale: daysStale > 0 ? daysStale : 0,
      stage,
      templateName: mapping.templateName.trim(),
      languageCode: mapping.languageCode || "en_US",
      components,
      resolvedValues,
    });
  }

  return {
    eligible,
    skippedCooldown,
    skippedNoPhone,
    skippedStageDisabled,
  };
}
