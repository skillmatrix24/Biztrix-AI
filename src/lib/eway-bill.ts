import { calculateGST } from "./mock-db";

export type EWayTransportMode = "1" | "2" | "3" | "4"; // 1=Road, 2=Rail, 3=Air, 4=Ship
export type EWayBillStatus = "NOT_REQUIRED" | "PENDING_PORTAL" | "GENERATED" | "CANCELLED";
export type GspProviderId = "mastergst" | "cleartax" | "nic_direct" | "custom";
export type GspEnvironment = "sandbox" | "production";

export interface PublicEWayApiConfig {
  provider: GspProviderId;
  environment: GspEnvironment;
  gstUsername: string;
  gstin: string;
  customAuthUrl?: string;
  customBaseUrl?: string;
  isConfigured: boolean;
  hasClientId?: boolean;
  hasClientSecret?: boolean;
  hasPassword?: boolean;
  hasApiKey?: boolean;
  updatedAt?: string;
  lastTestedAt?: string;
  lastStatusMessage?: string;
}

export interface EWayBillDetails {
  enabled: boolean;
  supplyType: "O" | "I"; // Outward | Inward
  subSupplyType: string; // "1" = Supply
  docType: "INV" | "CHL" | "BIL";
  transMode: EWayTransportMode;
  transDistance: string;
  vehicleNo: string;
  vehicleType: "R" | "O"; // Regular | ODC
  transporterName: string;
  transporterId: string;
  transDocNo: string;
  transDocDate: string; // YYYY-MM-DD or DD/MM/YYYY
  fromPincode: string;
  toPincode: string;
  ewbNumber?: string;
  ewbDate?: string;
  ewbValidUpto?: string;
  ewbStatus?: EWayBillStatus;
  ewbQrData?: string;
  apiProvider?: GspProviderId;
  cancelledAt?: string;
  cancelReason?: string;
  lastVehicleUpdateAt?: string;
}

export const EWAY_THRESHOLD_AMOUNT = 50000;

export const EWAY_TRANSPORT_MODES: Array<{ value: EWayTransportMode; label: string }> = [
  { value: "1", label: "Road" },
  { value: "2", label: "Rail" },
  { value: "3", label: "Air" },
  { value: "4", label: "Ship" },
];

export const INDIAN_STATE_CODES: Record<string, number> = {
  "jammu and kashmir": 1,
  "himachal pradesh": 2,
  punjab: 3,
  chandigarh: 4,
  uttarakhand: 5,
  haryana: 6,
  delhi: 7,
  "new delhi": 7,
  rajasthan: 8,
  "uttar pradesh": 9,
  bihar: 10,
  sikkim: 11,
  "arunachal pradesh": 12,
  nagaland: 13,
  manipur: 14,
  mizoram: 15,
  tripura: 16,
  meghalaya: 17,
  assam: 18,
  "west bengal": 19,
  jharkhand: 20,
  odisha: 21,
  orissa: 21,
  chhattisgarh: 22,
  "madhya pradesh": 23,
  gujarat: 24,
  "dadra and nagar haveli and daman and diu": 26,
  "daman and diu": 26,
  "dadra and nagar haveli": 26,
  maharashtra: 27,
  "andhra pradesh": 37,
  karnataka: 29,
  goa: 30,
  lakshadweep: 31,
  kerala: 32,
  "tamil nadu": 33,
  puducherry: 34,
  pondicherry: 34,
  "andaman and nicobar islands": 35,
  telangana: 36,
  ladakh: 38,
};

export function createDefaultEWayDetails(opts?: {
  enabled?: boolean;
  fromPincode?: string;
  toPincode?: string;
}): EWayBillDetails {
  return {
    enabled: Boolean(opts?.enabled),
    supplyType: "O",
    subSupplyType: "1",
    docType: "INV",
    transMode: "1",
    transDistance: "0",
    vehicleNo: "",
    vehicleType: "R",
    transporterName: "",
    transporterId: "",
    transDocNo: "",
    transDocDate: new Date().toISOString().split("T")[0],
    fromPincode: opts?.fromPincode || "",
    toPincode: opts?.toPincode || "",
    ewbNumber: "",
    ewbDate: "",
    ewbValidUpto: "",
    ewbStatus: opts?.enabled ? "PENDING_PORTAL" : "NOT_REQUIRED",
  };
}

export function extractPincode(explicitPincode?: unknown, address?: unknown): string {
  const cleanExplicit = String(explicitPincode || "").replace(/\D/g, "");
  if (/^[1-9][0-9]{5}$/.test(cleanExplicit)) return cleanExplicit;
  const addrMatch = String(address || "").match(/\b([1-9][0-9]{5})\b/);
  return addrMatch ? addrMatch[1] : "";
}

export function normalizeVehicleNo(value: string): string {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 15);
}

export function resolveGstStateCode(stateName?: string, gstin?: string): number {
  const cleanGstin = String(gstin || "").trim().toUpperCase();
  if (/^[0-9]{2}[A-Z0-9]{13}$/.test(cleanGstin)) {
    const code = Number.parseInt(cleanGstin.slice(0, 2), 10);
    if (code >= 1 && code <= 38) return code;
  }
  const normalizedState = String(stateName || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (normalizedState && INDIAN_STATE_CODES[normalizedState]) {
    return INDIAN_STATE_CODES[normalizedState];
  }
  return 27; // Safe default if unconfigured
}

export function evaluateEWayRequirement(params: {
  finalPayout: number;
  isQuotation?: boolean;
  isRewardSyncMode?: boolean;
  hasPhysicalGoods?: boolean;
}): {
  required: boolean;
  threshold: number;
  statusLabel: string;
} {
  const { finalPayout, isQuotation, isRewardSyncMode, hasPhysicalGoods = true } = params;
  if (isQuotation || isRewardSyncMode || !hasPhysicalGoods) {
    return {
      required: false,
      threshold: EWAY_THRESHOLD_AMOUNT,
      statusLabel: "Not Applicable",
    };
  }
  const required = Number(finalPayout || 0) > EWAY_THRESHOLD_AMOUNT;
  return {
    required,
    threshold: EWAY_THRESHOLD_AMOUNT,
    statusLabel: required ? "E-Way Bill Required (>₹50,000)" : "Optional (Under ₹50,000)",
  };
}

export function generateUniqueInvoiceId(businessName?: string, now = new Date()): string {
  const words = String(businessName || "BZ")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  let prefix = "BZ";
  if (words.length >= 2) {
    prefix = `${words[0][0]}${words[1][0]}`.toUpperCase();
  } else if (words.length === 1) {
    prefix = words[0].slice(0, 2).toUpperCase().padEnd(2, "X");
  }
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  // Format: XX-YYMMDD-RRRR -> 14 chars (strictly <= 16 chars NIC docNo limit)
  return `${prefix}-${yy}${mm}${dd}-${rand}`;
}

export function formatNicDate(input?: string): string {
  const raw = String(input || "").trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  const parsed = raw ? new Date(raw) : new Date();
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const dd = String(safeDate.getDate()).padStart(2, "0");
  const mm = String(safeDate.getMonth() + 1).padStart(2, "0");
  const yyyy = safeDate.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function validateEWayBillDetails(details: EWayBillDetails): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (details.enabled) {
    const cleanVehicle = normalizeVehicleNo(details.vehicleNo);
    const cleanTransId = String(details.transporterId || "").trim().toUpperCase();

    if (details.transMode === "1" && !cleanVehicle && !cleanTransId) {
      warnings.push(
        "Enter either Vehicle Number or Transporter ID for complete Part-B on the GST Portal."
      );
    }
    if (cleanVehicle && !/^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/.test(cleanVehicle)) {
      errors.push("Invalid Vehicle Number format (e.g., MH12AB1234).");
    }
    if (cleanTransId && !/^[0-9]{2}[A-Z0-9]{13}$/.test(cleanTransId)) {
      errors.push("Transporter ID / GSTIN must be 15 alphanumeric characters.");
    }
    if (details.fromPincode && !/^[1-9][0-9]{5}$/.test(details.fromPincode.trim())) {
      errors.push("Origin (From) Pincode must be a valid 6-digit Indian PIN.");
    }
    if (details.toPincode && !/^[1-9][0-9]{5}$/.test(details.toPincode.trim())) {
      errors.push("Destination (To) Pincode must be a valid 6-digit Indian PIN.");
    }
    const dist = Number.parseInt(details.transDistance || "0", 10);
    if (Number.isNaN(dist) || dist < 0 || dist > 4000) {
      errors.push("Approximate distance must be between 0 and 4000 KM.");
    }
  }

  const cleanEwb = String(details.ewbNumber || "").replace(/\s+/g, "");
  if (cleanEwb && !/^\d{12}$/.test(cleanEwb)) {
    errors.push("E-Way Bill Number must be exactly 12 digits.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function getEWayModeLabel(mode?: string): string {
  return EWAY_TRANSPORT_MODES.find((m) => m.value === String(mode || "1"))?.label || "Road";
}

export function buildNicEWayBillJson(invoices: any[], business: any) {
  const gstMode: "inclusive" | "exclusive" =
    business?.gstMode === "inclusive" ? "inclusive" : "exclusive";
  const fromGstin = String(business?.gstin || "URP").trim().toUpperCase() || "URP";
  const fromStateCode = resolveGstStateCode(business?.state, fromGstin);
  const defaultFromPin = extractPincode(business?.pincode, business?.address);

  const billLists = (invoices || []).map((inv) => {
    const eway: Partial<EWayBillDetails> = inv.ewayBill || {};
    const t = inv.totals || {};
    const isInterState = Boolean(t.isInterState);
    const toGstin = String(inv.customerGstin || "URP").trim().toUpperCase() || "URP";
    const toStateCode = resolveGstStateCode(inv.customerState, toGstin);

    const fromPinStr = extractPincode(eway.fromPincode, business?.address) || defaultFromPin || "000000";
    const toPinStr = extractPincode(eway.toPincode, inv.customerAddress) || "000000";

    const rawItems = Array.isArray(inv.items) ? inv.items : [];
    let highestTaxable = -1;
    let mainHsn = 9999;

    const itemList = rawItems.map((item: any) => {
      const qty = Math.max(1, Number(item.quantity || 1));
      const discountedUnit = Number(item.price || 0) * (1 - Number(item.itemDiscount || 0) / 100);
      const lineAmount = discountedUnit * qty;
      const gstRate = Number(item.gstRate || 0);
      const gstData = calculateGST(lineAmount, gstRate, isInterState, gstMode);
      const hsnDigits = String(item.hsnCode || "").replace(/\D/g, "");
      const hsnNumeric = hsnDigits ? Number.parseInt(hsnDigits.slice(0, 8), 10) : 9999;

      if (gstData.baseAmount > highestTaxable) {
        highestTaxable = gstData.baseAmount;
        mainHsn = hsnNumeric;
      }

      return {
        productName: String(item.name || "Goods").slice(0, 100),
        productDesc: String(item.name || "Goods").slice(0, 100),
        hsnCode: hsnNumeric,
        quantity: qty,
        qtyUnit: String(item.unit || "NOS").toUpperCase().slice(0, 3),
        taxableAmount: Number(gstData.baseAmount.toFixed(2)),
        cgstRate: isInterState ? 0 : Number((gstRate / 2).toFixed(2)),
        sgstRate: isInterState ? 0 : Number((gstRate / 2).toFixed(2)),
        igstRate: isInterState ? Number(gstRate.toFixed(2)) : 0,
        cessRate: 0,
      };
    });

    const totalTaxable = Number(
      (t.itemTotal !== undefined
        ? Number(t.itemTotal)
        : itemList.reduce((s: number, it: any) => s + it.taxableAmount, 0)
      ).toFixed(2)
    );
    const cgstValue = Number((t.cgst || 0).toFixed(2));
    const sgstValue = Number((t.sgst || 0).toFixed(2));
    const igstValue = Number((t.igst || 0).toFixed(2));
    const totInvValue = Number((t.finalPayout || totalTaxable + cgstValue + sgstValue + igstValue).toFixed(2));

    const cleanDocNo = String(inv.invoiceId || "INV-001")
      .replace(/[^a-zA-Z0-9/-]/g, "")
      .slice(0, 16);

    const distNum = Math.max(0, Number.parseInt(String(eway.transDistance || "0"), 10) || 0);

    return {
      supplyType: eway.supplyType === "I" ? "I" : "O",
      subSupplyType: Number.parseInt(String(eway.subSupplyType || "1"), 10) || 1,
      subSupplyDesc: "",
      docType: eway.docType || "INV",
      docNo: cleanDocNo,
      docDate: formatNicDate(inv.isoDate || inv.date),
      fromGstin,
      fromTrdName: String(business?.name || "Supplier").slice(0, 100),
      fromAddr1: String(business?.address || "Business Address").slice(0, 120),
      fromAddr2: "",
      fromPlace: String(business?.state || "Local").slice(0, 50),
      fromPincode: Number.parseInt(fromPinStr, 10) || 0,
      actFromStateCode: fromStateCode,
      fromStateCode,
      toGstin,
      toTrdName: String(inv.customerName || "Customer").slice(0, 100),
      toAddr1: String(inv.customerAddress || "Customer Address").slice(0, 120),
      toAddr2: "",
      toPlace: String(inv.customerState || business?.state || "Local").slice(0, 50),
      toPincode: Number.parseInt(toPinStr, 10) || 0,
      actToStateCode: toStateCode,
      toStateCode,
      transactionType: 1,
      otherValue: 0,
      totalValue: totalTaxable,
      cgstValue,
      sgstValue,
      igstValue,
      cessValue: 0,
      cessNonAdvolValue: 0,
      totInvValue,
      transMode: Number.parseInt(String(eway.transMode || "1"), 10) || 1,
      transDistance: distNum,
      transporterName: String(eway.transporterName || "").slice(0, 100),
      transporterId: String(eway.transporterId || "").trim().toUpperCase(),
      transDocNo: String(eway.transDocNo || "").slice(0, 15),
      transDocDate: eway.transDocNo ? formatNicDate(eway.transDocDate) : "",
      vehicleNo: normalizeVehicleNo(eway.vehicleNo || ""),
      vehicleType: eway.vehicleType === "O" ? "O" : "R",
      mainHsnCode: mainHsn,
      itemList,
    };
  });

  return {
    version: "1.0.0420",
    billLists,
  };
}

export function downloadNicJsonFile(payload: unknown, filename: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const GSP_PROVIDER_PRESETS: Record<
  GspProviderId,
  {
    label: string;
    description: string;
    authStyle: "nic_token" | "bearer_key" | "cleartax_token";
    sandboxAuthUrl: string;
    sandboxBaseUrl: string;
    prodAuthUrl: string;
    prodBaseUrl: string;
  }
> = {
  mastergst: {
    label: "MasterGST (NIC v1.03)",
    description: "Standard MasterGST / Suvidha GSP REST API with client_id, client_secret & EWB login.",
    authStyle: "nic_token",
    sandboxAuthUrl: "https://api.mastergst.com/ewaybillapi/v1.03/authenticate",
    sandboxBaseUrl: "https://api.mastergst.com/ewaybillapi/v1.03/ewayapi",
    prodAuthUrl: "https://api.mastergst.com/ewaybillapi/v1.03/authenticate",
    prodBaseUrl: "https://api.mastergst.com/ewaybillapi/v1.03/ewayapi",
  },
  cleartax: {
    label: "ClearTax (Clear E-Way API)",
    description: "ClearTax v2 E-Way Bill REST API authenticated via x-cleartax-auth-token & GSTIN.",
    authStyle: "cleartax_token",
    sandboxAuthUrl: "https://api-sandbox.clear.in/einv/v2/eWayBill/generate",
    sandboxBaseUrl: "https://api-sandbox.clear.in/einv/v2/eWayBill",
    prodAuthUrl: "https://api.clear.in/einv/v2/eWayBill/generate",
    prodBaseUrl: "https://api.clear.in/einv/v2/eWayBill",
  },
  nic_direct: {
    label: "NIC Direct / GSP Gateway",
    description: "NIC E-Way Bill v1.03 API (ewbbackend / TaxPro / IRIS / Cygnature GSP).",
    authStyle: "nic_token",
    sandboxAuthUrl: "https://ewbbackend-sandbox.nic.in/v1.03/auth",
    sandboxBaseUrl: "https://ewbbackend-sandbox.nic.in/v1.03/ewayapi",
    prodAuthUrl: "https://api.ewaybillgst.gov.in/v1.03/auth",
    prodBaseUrl: "https://api.ewaybillgst.gov.in/v1.03/ewayapi",
  },
  custom: {
    label: "Custom GSP Endpoint",
    description: "Bring your own GSP gateway base URL and authentication endpoint.",
    authStyle: "nic_token",
    sandboxAuthUrl: "",
    sandboxBaseUrl: "",
    prodAuthUrl: "",
    prodBaseUrl: "",
  },
};

export const EWAY_VEHICLE_UPDATE_REASONS = [
  { code: "1", label: "Due to Break Down" },
  { code: "2", label: "Due to Transshipment" },
  { code: "3", label: "Others (Vehicle Change)" },
  { code: "4", label: "First Time Part-B Entry" },
] as const;

export const EWAY_CANCEL_REASONS = [
  { code: "1", label: "Duplicate E-Way Bill" },
  { code: "2", label: "Order Cancelled" },
  { code: "3", label: "Data Entry Mistake" },
  { code: "4", label: "Others" },
] as const;

export function resolveGspEndpoints(config: {
  provider?: GspProviderId;
  environment?: GspEnvironment;
  customAuthUrl?: string;
  customBaseUrl?: string;
}) {
  const provider: GspProviderId = config.provider && GSP_PROVIDER_PRESETS[config.provider]
    ? config.provider
    : "mastergst";
  const env: GspEnvironment = config.environment === "production" ? "production" : "sandbox";
  const preset = GSP_PROVIDER_PRESETS[provider];

  const defaultAuth = env === "production" ? preset.prodAuthUrl : preset.sandboxAuthUrl;
  const defaultBase = env === "production" ? preset.prodBaseUrl : preset.sandboxBaseUrl;

  const authUrl = String(config.customAuthUrl || defaultAuth || "").trim().replace(/\/+$/, "");
  const baseUrl = String(config.customBaseUrl || defaultBase || "").trim().replace(/\/+$/, "");

  if (provider === "cleartax") {
    return {
      provider,
      environment: env,
      authStyle: preset.authStyle,
      authUrl,
      generateUrl: `${baseUrl}/generate`,
      updateVehicleUrl: `${baseUrl}/updateVehicle`,
      cancelUrl: `${baseUrl}/cancel`,
    };
  }

  return {
    provider,
    environment: env,
    authStyle: preset.authStyle,
    authUrl,
    generateUrl: `${baseUrl}/genewaybill`,
    updateVehicleUrl: `${baseUrl}/vehewb`,
    cancelUrl: `${baseUrl}/canewb`,
  };
}

export function isValidGstinFormat(gstin?: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
    String(gstin || "").trim().toUpperCase()
  );
}

export function validateGspConfigInput(input: {
  provider?: GspProviderId;
  environment?: GspEnvironment;
  gstin?: string;
  gstUsername?: string;
  clientId?: string;
  clientSecret?: string;
  gstPassword?: string;
  apiKey?: string;
  customAuthUrl?: string;
  customBaseUrl?: string;
  hasExistingSecrets?: boolean;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const provider = input.provider || "mastergst";
  const cleanGstin = String(input.gstin || "").trim().toUpperCase();

  if (!cleanGstin || !isValidGstinFormat(cleanGstin)) {
    errors.push("Valid 15-character Business GSTIN is required for GSP API.");
  }

  if (provider === "custom") {
    if (!String(input.customBaseUrl || "").trim().startsWith("https://")) {
      errors.push("Custom GSP Base URL must start with https://");
    }
    if (!String(input.customAuthUrl || "").trim().startsWith("https://")) {
      errors.push("Custom Auth URL must start with https://");
    }
  }

  if (provider === "cleartax") {
    if (!String(input.apiKey || "").trim() && !input.hasExistingSecrets) {
      errors.push("ClearTax Auth Token / API Key is required.");
    }
  } else {
    if (!String(input.gstUsername || "").trim()) {
      errors.push("NIC / E-Way Bill Portal API Username is required.");
    }
    if (!input.hasExistingSecrets) {
      if (!String(input.clientId || "").trim()) {
        errors.push("GSP Client ID is required.");
      }
      if (!String(input.clientSecret || "").trim()) {
        errors.push("GSP Client Secret is required.");
      }
      if (!String(input.gstPassword || "").trim()) {
        errors.push("NIC / E-Way Portal API Password is required.");
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateInvoiceForLiveEwb(
  invoice: any,
  business: any,
  overrideDetails?: Partial<EWayBillDetails>
): { valid: boolean; errors: string[]; mergedDetails: EWayBillDetails } {
  const errors: string[] = [];
  const mergedDetails: EWayBillDetails = {
    ...createDefaultEWayDetails({
      enabled: true,
      fromPincode: extractPincode(business?.pincode, business?.address),
      toPincode: extractPincode("", invoice?.customerAddress),
    }),
    ...(invoice?.ewayBill || {}),
    ...(overrideDetails || {}),
    enabled: true,
  };

  const fromGstin = String(business?.gstin || "").trim().toUpperCase();
  if (!fromGstin || fromGstin === "URP" || !isValidGstinFormat(fromGstin)) {
    errors.push("Business GSTIN must be a valid 15-character GSTIN (cannot be URP) to generate live EWB.");
  }

  const fromPin = extractPincode(mergedDetails.fromPincode, business?.address);
  if (!fromPin) {
    errors.push("Valid 6-digit Origin (From) Pincode is required.");
  } else {
    mergedDetails.fromPincode = fromPin;
  }

  const toPin = extractPincode(mergedDetails.toPincode, invoice?.customerAddress);
  if (!toPin) {
    errors.push("Valid 6-digit Destination (To) Pincode is required.");
  } else {
    mergedDetails.toPincode = toPin;
  }

  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  if (items.length === 0) {
    errors.push("Invoice must have at least one line item.");
  }

  const baseCheck = validateEWayBillDetails({
    ...mergedDetails,
    ewbNumber: "", // Allow generation even if replacing or fresh
  });
  errors.push(...baseCheck.errors);

  if (
    mergedDetails.transMode === "1" &&
    !normalizeVehicleNo(mergedDetails.vehicleNo) &&
    !String(mergedDetails.transporterId || "").trim()
  ) {
    errors.push("For Road transport, enter either Vehicle Number or 15-digit Transporter ID.");
  }

  return {
    valid: errors.length === 0,
    errors: Array.from(new Set(errors)),
    mergedDetails,
  };
}

export function buildNicGeneratePayload(
  invoice: any,
  business: any,
  overrideDetails?: Partial<EWayBillDetails>
) {
  const mergedInvoice = {
    ...invoice,
    ewayBill: {
      ...(invoice?.ewayBill || {}),
      ...(overrideDetails || {}),
      enabled: true,
    },
  };
  const nicEnvelope = buildNicEWayBillJson([mergedInvoice], business);
  return nicEnvelope.billLists[0];
}

export function buildNicVehicleUpdatePayload(params: {
  ewbNo: string;
  vehicleNo: string;
  fromPlace: string;
  fromState: number;
  reasonCode: string;
  reasonRem: string;
  transMode?: EWayTransportMode;
  transDocNo?: string;
  transDocDate?: string;
}) {
  return {
    ewbNo: Number(String(params.ewbNo || "").replace(/\D/g, "")),
    vehicleNo: normalizeVehicleNo(params.vehicleNo),
    fromPlace: String(params.fromPlace || "Local").trim().slice(0, 50),
    fromState: Number(params.fromState || 27),
    reasonCode: String(params.reasonCode || "1"),
    reasonRem: String(params.reasonRem || "Vehicle updated").trim().slice(0, 50),
    transMode: String(params.transMode || "1"),
    ...(params.transDocNo
      ? {
          transDocNo: String(params.transDocNo).trim().slice(0, 15),
          transDocDate: formatNicDate(params.transDocDate),
        }
      : {}),
  };
}

export function buildNicCancelEwbPayload(params: {
  ewbNo: string;
  cancelRsnCode: string;
  cancelRmrk: string;
}) {
  return {
    ewbNo: Number(String(params.ewbNo || "").replace(/\D/g, "")),
    cancelRsnCode: Number.parseInt(String(params.cancelRsnCode || "2"), 10) || 2,
    cancelRmrk: String(params.cancelRmrk || "Cancelled by supplier").trim().slice(0, 50),
  };
}

export interface NormalizedGspResponse {
  ok: boolean;
  ewbNumber?: string;
  ewbDate?: string;
  ewbValidUpto?: string;
  qrData?: string;
  authToken?: string;
  sek?: string;
  errorMessage?: string;
  errorCode?: string;
}

export function parseNicGspResponse(raw: any): NormalizedGspResponse {
  if (!raw || typeof raw !== "object") {
    return { ok: false, errorMessage: "Empty or non-JSON response from GSP server." };
  }

  // Handle explicit NIC / MasterGST failure flags
  if (raw.status_cd === "0" || raw.status_cd === 0 || raw.success === false || raw.error) {
    const errMsg =
      raw?.error?.message ||
      raw?.error?.errDesc ||
      raw?.govt_response?.ErrorDetails?.[0]?.error_message ||
      raw?.message ||
      raw?.status_desc ||
      "GSP API rejected the E-Way Bill request.";
    const errCode =
      String(
        raw?.error?.error_cd ||
          raw?.error?.code ||
          raw?.govt_response?.ErrorDetails?.[0]?.error_code ||
          raw?.status_cd ||
          ""
      ) || undefined;
    return {
      ok: false,
      errorMessage: String(errMsg),
      errorCode: errCode,
    };
  }

  const node = raw.data || raw.govt_response || raw;
  const ewbNoRaw =
    node?.ewayBillNo ||
    node?.ewbNumber ||
    node?.ewbNo ||
    raw?.ewayBillNo ||
    raw?.ewbNumber ||
    raw?.ewbNo;

  const authToken =
    node?.AuthToken ||
    node?.authToken ||
    node?.access_token ||
    raw?.AuthToken ||
    raw?.access_token;

  if (ewbNoRaw !== undefined && ewbNoRaw !== null && String(ewbNoRaw).trim() !== "") {
    return {
      ok: true,
      ewbNumber: String(ewbNoRaw).trim(),
      ewbDate: String(node?.ewayBillDate || node?.ewbDate || node?.ewbDt || "").trim() || undefined,
      ewbValidUpto:
        String(node?.validUpto || node?.ewbValidTill || node?.ewbValidUpto || "").trim() ||
        undefined,
      qrData: String(node?.qrCode || node?.ewbQrCode || "").trim() || undefined,
    };
  }

  if (raw.status_cd === "1" || raw.status_cd === 1 || raw.success === true || authToken) {
    return {
      ok: true,
      authToken: authToken ? String(authToken) : undefined,
      sek: node?.Sek ? String(node.Sek) : undefined,
      ewbDate: String(node?.vehUpdDate || node?.cancelDate || "").trim() || undefined,
    };
  }

  return {
    ok: false,
    errorMessage: String(raw?.message || "Unexpected response structure from GSP endpoint."),
  };
}

export interface GspGuideStep {
  stepNumber: string;
  title: string;
  detail: string;
}

export interface GspIntegrationGuide {
  providerName: string;
  portalLabel: string;
  portalUrl: string;
  nicPortalUrl: string;
  requiredCredentials: string[];
  steps: GspGuideStep[];
  checklist: string[];
}

const COMMON_EWB_CHECKLIST = [
  "Tax & GST settings me apna 15-digit Business GSTIN, State aur address me 6-digit Pincode zaroor save rakhein.",
  "Har product par sahi HSN Code (4-8 digits) aur GST rate set hona chahiye.",
  "Bill ₹50,000 se zyada hone par /billing me Vehicle No (ya Transporter ID) aur Distance (KM) bharein.",
  "Aapke API Password / Client Secret / Auth Token server-side privateConfig me securely save hote hain.",
];

export function getGspIntegrationGuide(provider: GspProviderId): GspIntegrationGuide {
  if (provider === "cleartax") {
    return {
      providerName: GSP_PROVIDER_PRESETS.cleartax.label,
      portalLabel: "Open ClearTax Portal",
      portalUrl: "https://www.clear.in/",
      nicPortalUrl: "https://ewaybillgst.gov.in/",
      requiredCredentials: ["Business GSTIN", "ClearTax Auth Token (x-cleartax-auth-token)"],
      steps: [
        {
          stepNumber: "01",
          title: "ClearTax Account & Sandbox/Live Enable Karein",
          detail:
            "ClearTax (clear.in) par login karein aur E-Way Bill / E-Invoicing API module activate karein.",
        },
        {
          stepNumber: "02",
          title: "API Auth Token Generate Karein",
          detail:
            "ClearTax dashboard me Settings → API / Integration Tokens me jakar apna x-cleartax-auth-token copy karein.",
        },
        {
          stepNumber: "03",
          title: "GSTIN aur Token Enter Karein",
          detail:
            "ClearTax ke liye alag NIC API username/password ki zaroorat nahi hoti — niche Business GSTIN aur Auth Token paste karein.",
        },
        {
          stepNumber: "04",
          title: "Test & Save Auth Par Click Karein",
          detail:
            "Pehle Sandbox token se check karein, phir Production par switch karke live keys save karein.",
        },
      ],
      checklist: COMMON_EWB_CHECKLIST,
    };
  }

  if (provider === "nic_direct") {
    return {
      providerName: GSP_PROVIDER_PRESETS.nic_direct.label,
      portalLabel: "Open NIC EWB Portal",
      portalUrl: "https://ewaybillgst.gov.in/",
      nicPortalUrl: "https://ewaybillgst.gov.in/",
      requiredCredentials: [
        "Business GSTIN",
        "NIC API Sub-User Username & Password",
        "GSP Client ID & Client Secret",
      ],
      steps: [
        {
          stepNumber: "01",
          title: "NIC Portal Par GSP API User Banayein",
          detail:
            "ewaybillgst.gov.in par login karein → Registration → For GSP me jakar apna authorized GSP (TaxPro / IRIS / Cygnature) chunein aur API Username & Password banayein.",
        },
        {
          stepNumber: "02",
          title: "GSP Dashboard Se Client Keys Lein",
          detail:
            "Apne GSP vendor dashboard se GSP Client ID aur GSP Client Secret copy karein.",
        },
        {
          stepNumber: "03",
          title: "Sandbox Environment Me Verify Karein",
          detail:
            "Environment ko Sandbox / Testing chunein, upar sabhi 5 fields bharein aur Test & Save Auth par click karein.",
        },
        {
          stepNumber: "04",
          title: "Production (Live NIC) Activate Karein",
          detail:
            "Sandbox check pass hone ke baad Environment ko Production par switch karke live credentials save karein.",
        },
      ],
      checklist: COMMON_EWB_CHECKLIST,
    };
  }

  if (provider === "custom") {
    return {
      providerName: GSP_PROVIDER_PRESETS.custom.label,
      portalLabel: "Open NIC EWB Portal",
      portalUrl: "https://ewaybillgst.gov.in/",
      nicPortalUrl: "https://ewaybillgst.gov.in/",
      requiredCredentials: [
        "Business GSTIN",
        "NIC API Username & Password",
        "GSP Client ID & Secret",
        "Custom Auth & EWB Base URL",
      ],
      steps: [
        {
          stepNumber: "01",
          title: "Apne GSP Vendor Se Endpoint URLs Lein",
          detail:
            "Apne GSP provider se Authentication URL (.../authenticate) aur EWB Base URL (.../ewayapi) prapt karein.",
        },
        {
          stepNumber: "02",
          title: "NIC Portal Par GSP API User Register Karein",
          detail:
            "ewaybillgst.gov.in → Registration → For GSP me us GSP ke naam par API Username & Password create karein.",
        },
        {
          stepNumber: "03",
          title: "Custom URLs Aur Credentials Fill Karein",
          detail:
            "Niche Custom Auth URL, Custom EWB Base URL, Client ID, Client Secret aur NIC API login details enter karein.",
        },
        {
          stepNumber: "04",
          title: "Test & Save Auth Run Karein",
          detail:
            "Test & Save Auth button se endpoint handshake verify karein taaki 1-click EWB generation start ho sake.",
        },
      ],
      checklist: COMMON_EWB_CHECKLIST,
    };
  }

  return {
    providerName: GSP_PROVIDER_PRESETS.mastergst.label,
    portalLabel: "Open MasterGST Portal",
    portalUrl: "https://www.mastergst.com/",
    nicPortalUrl: "https://ewaybillgst.gov.in/",
    requiredCredentials: [
      "Business GSTIN",
      "NIC API Sub-User Username & Password",
      "MasterGST Client ID & Client Secret",
    ],
    steps: [
      {
        stepNumber: "01",
        title: "NIC E-Way Bill Portal Par GSP Register Karein",
        detail:
          "ewaybillgst.gov.in par login karein → Registration → For GSP me 'MasterGST' (Tera Software / Suvidha) select karke apna API Username & Password banayein (yeh regular portal password se alag hota hai).",
      },
      {
        stepNumber: "02",
        title: "MasterGST Se Client ID Aur Client Secret Copy Karein",
        detail:
          "mastergst.com account me login karein → E-Way Bill API section se apna Client ID aur Client Secret copy karein.",
      },
      {
        stepNumber: "03",
        title: "Pehle Sandbox / Testing Check Karein",
        detail:
          "Environment ko Sandbox / Testing rakhein, apna 15-digit Business GSTIN aur credentials dal kar Test & Save Auth click karein.",
      },
      {
        stepNumber: "04",
        title: "Production Live Chalu Karein",
        detail:
          "Test verify hone ke baad Environment ko Production (Live NIC) par switch karke live keys save karein — ab /billing aur /invoices se 1-click EWB banega.",
      },
    ],
    checklist: COMMON_EWB_CHECKLIST,
  };
}


