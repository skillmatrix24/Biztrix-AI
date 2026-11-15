import { initializeAdmin } from "@/firebase/admin";
import {
  buildNicEWayBillJson,
  mapGspGenerateResponse,
  simulateSandboxEwbGenerate,
  type EWayApiMode,
  type EWayApiPublicConfig,
  type EWayGspProvider,
} from "./eway-bill";

export interface StoredEWayPrivateConfig {
  provider: EWayGspProvider;
  mode: EWayApiMode;
  customEndpoint?: string;
  nicUsername?: string;
  nicPassword?: string;
  gspClientId?: string;
  gspClientSecret?: string;
  apiKey?: string;
  updatedAt?: string;
  updatedBy?: string;
}

const PLATFORM_OWNER_EMAIL = "skillmatrix24@gmail.com";

export async function verifyBusinessApiCaller(
  request: Request,
  businessId: string,
  options?: { requireAdmin?: boolean }
) {
  if (!businessId || typeof businessId !== "string") {
    return { ok: false as const, status: 400, message: "businessId is required." };
  }

  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]) {
    return { ok: false as const, status: 401, message: "Missing authorization token." };
  }

  const { admin, db } = initializeAdmin();
  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(match[1]);
  } catch {
    return { ok: false as const, status: 401, message: "Invalid or expired session token." };
  }

  const uid = decoded.uid;
  const email = String(decoded.email || "").toLowerCase();
  const isPlatformOwner = email === PLATFORM_OWNER_EMAIL;

  const [userSnap, bizSnap] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.doc(`businesses/${businessId}`).get(),
  ]);

  if (!bizSnap.exists) {
    return { ok: false as const, status: 404, message: "Business workspace not found." };
  }

  const bizData = bizSnap.data() || {};
  const userData = userSnap.exists ? userSnap.data() || {} : {};

  const isMember =
    isPlatformOwner ||
    bizData.ownerId === uid ||
    userData.businessId === businessId;

  if (!isMember) {
    return { ok: false as const, status: 403, message: "Forbidden for this business workspace." };
  }

  if (options?.requireAdmin) {
    const roleLower = String(userData.role || "").toLowerCase();
    const isAdminUser =
      isPlatformOwner ||
      bizData.ownerId === uid ||
      userData.isAdmin === true ||
      ["owner", "admin", "super_admin", "manager"].includes(roleLower);

    if (!isAdminUser) {
      return {
        ok: false as const,
        status: 403,
        message: "Only business admins or owners can modify GSP API credentials.",
      };
    }
  }

  return {
    ok: true as const,
    uid,
    email,
    userData,
    bizData,
    db,
    admin,
  };
}

export function sanitizePublicEWayConfig(
  raw?: Partial<StoredEWayPrivateConfig> | null
): EWayApiPublicConfig {
  const provider: EWayGspProvider = raw?.provider || "sandbox";
  const mode: EWayApiMode = provider === "sandbox" ? "sandbox" : raw?.mode || "sandbox";
  const hasPassword = Boolean(raw?.nicPassword);
  const hasClientId = Boolean(raw?.gspClientId);
  const hasClientSecret = Boolean(raw?.gspClientSecret);
  const hasApiKey = Boolean(raw?.apiKey);

  const isConfigured =
    provider === "sandbox" ||
    mode === "sandbox" ||
    Boolean(
      raw?.nicUsername &&
        (hasPassword || hasApiKey) &&
        (provider !== "custom_rest" || raw?.customEndpoint)
    );

  return {
    provider,
    mode,
    customEndpoint: raw?.customEndpoint || "",
    nicUsername: raw?.nicUsername || "",
    hasPassword,
    hasClientId,
    hasClientSecret,
    hasApiKey,
    isConfigured,
    updatedAt: raw?.updatedAt || undefined,
  };
}

function getDefaultBaseUrl(provider: EWayGspProvider, customEndpoint?: string): string {
  if (provider === "custom_rest") {
    return String(customEndpoint || "").trim().replace(/\/+$/, "");
  }
  if (provider === "cleartax") {
    return String(customEndpoint || "https://api-einv.cleartax.in").trim().replace(/\/+$/, "");
  }
  return String(customEndpoint || "https://api.mastergst.com").trim().replace(/\/+$/, "");
}

async function authenticateMasterGst(
  baseUrl: string,
  config: StoredEWayPrivateConfig,
  gstin: string
): Promise<string> {
  const url = `${baseUrl}/ewaybillapi/v1.03/authenticate?email=${encodeURIComponent(
    config.nicUsername || ""
  )}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      username: config.nicUsername || "",
      password: config.nicPassword || "",
      gstin,
      client_id: config.gspClientId || "",
      client_secret: config.gspClientSecret || "",
    },
    signal: AbortSignal.timeout(15000),
  });
  const json: any = await res.json().catch(() => ({}));
  const token = json?.data?.authToken || json?.authToken || json?.token || "";
  if (!res.ok || !token) {
    throw new Error(
      json?.status_desc || json?.error?.message || json?.message || "MasterGST authentication failed."
    );
  }
  return token;
}

export async function dispatchGspGenerateEWayBill(params: {
  config: StoredEWayPrivateConfig;
  invoice: any;
  business: any;
}) {
  const { config, invoice, business } = params;
  const effectiveMode: EWayApiMode =
    config.provider === "sandbox" ? "sandbox" : config.mode || "sandbox";

  if (effectiveMode === "sandbox") {
    return simulateSandboxEwbGenerate(invoice, business);
  }

  const nicPayload = buildNicEWayBillJson([invoice], business).billLists[0];
  const fromGstin = String(business?.gstin || "").trim().toUpperCase();
  const baseUrl = getDefaultBaseUrl(config.provider, config.customEndpoint);

  if (config.provider === "custom_rest") {
    if (!baseUrl) {
      throw new Error("Custom GSP Endpoint URL is required in Live mode.");
    }
    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { "x-api-key": config.apiKey, Authorization: `Bearer ${config.apiKey}` } : {}),
        ...(config.gspClientId ? { "x-client-id": config.gspClientId } : {}),
        ...(config.gspClientSecret ? { "x-client-secret": config.gspClientSecret } : {}),
        ...(config.nicUsername ? { "x-nic-username": config.nicUsername } : {}),
        ...(config.nicPassword ? { "x-nic-password": config.nicPassword } : {}),
        "x-gstin": fromGstin,
      },
      body: JSON.stringify(nicPayload),
      signal: AbortSignal.timeout(20000),
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(raw?.message || raw?.error?.message || `Custom GSP HTTP ${res.status}`);
    }
    return mapGspGenerateResponse("custom_rest", raw, invoice, business);
  }

  if (config.provider === "cleartax") {
    if (!config.apiKey) {
      throw new Error("ClearTax Auth Token / API Key is required in Live mode.");
    }
    const res = await fetch(`${baseUrl}/v2/eInvoice/ewaybill`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Cleartax-Auth-Token": config.apiKey,
        gstin: fromGstin,
      },
      body: JSON.stringify(nicPayload),
      signal: AbortSignal.timeout(20000),
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(raw?.message || raw?.error_message || `ClearTax HTTP ${res.status}`);
    }
    return mapGspGenerateResponse("cleartax", raw, invoice, business);
  }

  // MasterGST GSP
  if (!config.nicUsername || !config.nicPassword || !config.gspClientId || !config.gspClientSecret) {
    throw new Error(
      "MasterGST requires NIC Username, NIC Password, GSP Client ID, and Client Secret."
    );
  }

  const authToken = await authenticateMasterGst(baseUrl, config, fromGstin);
  const res = await fetch(
    `${baseUrl}/ewaybillapi/v1.03/ewayapi/genewaybill?email=${encodeURIComponent(
      config.nicUsername
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        client_id: config.gspClientId,
        client_secret: config.gspClientSecret,
        gstin: fromGstin,
        "auth-token": authToken,
      },
      body: JSON.stringify(nicPayload),
      signal: AbortSignal.timeout(20000),
    }
  );
  const raw = await res.json().catch(() => ({}));
  if (!res.ok || String(raw?.status_cd || "") === "0") {
    throw new Error(
      raw?.status_desc || raw?.error?.message || raw?.message || `MasterGST HTTP ${res.status}`
    );
  }
  return mapGspGenerateResponse("mastergst", raw, invoice, business);
}

export async function dispatchGspEwbAction(params: {
  config: StoredEWayPrivateConfig;
  action: "UPDATE_VEHICLE" | "CANCEL_EWB";
  business: any;
  payload: Record<string, any>;
}): Promise<{ mode: EWayApiMode; raw?: any }> {
  const { config, action, business, payload } = params;
  const effectiveMode: EWayApiMode =
    config.provider === "sandbox" ? "sandbox" : config.mode || "sandbox";

  if (effectiveMode === "sandbox") {
    return { mode: "sandbox" };
  }

  const fromGstin = String(business?.gstin || "").trim().toUpperCase();
  const baseUrl = getDefaultBaseUrl(config.provider, config.customEndpoint);

  if (config.provider === "custom_rest") {
    if (!baseUrl) throw new Error("Custom GSP Endpoint URL is required in Live mode.");
    const pathSegment = action === "UPDATE_VEHICLE" ? "update-vehicle" : "cancel";
    const res = await fetch(`${baseUrl}/${pathSegment}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { "x-api-key": config.apiKey, Authorization: `Bearer ${config.apiKey}` } : {}),
        "x-gstin": fromGstin,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(raw?.message || `Custom GSP action HTTP ${res.status}`);
    }
    return { mode: "live", raw };
  }

  if (config.provider === "cleartax") {
    if (!config.apiKey) throw new Error("ClearTax Auth Token is required.");
    const endpoint =
      action === "UPDATE_VEHICLE"
        ? `${baseUrl}/v1/ewaybill/update`
        : `${baseUrl}/v2/eInvoice/ewaybill/cancel`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Cleartax-Auth-Token": config.apiKey,
        gstin: fromGstin,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(raw?.message || raw?.error_message || `ClearTax HTTP ${res.status}`);
    }
    return { mode: "live", raw };
  }

  // MasterGST GSP
  if (!config.nicUsername || !config.nicPassword || !config.gspClientId || !config.gspClientSecret) {
    throw new Error("MasterGST credentials incomplete for Live action.");
  }
  const authToken = await authenticateMasterGst(baseUrl, config, fromGstin);
  const nicCmd = action === "UPDATE_VEHICLE" ? "vehewb" : "canewb";
  const res = await fetch(
    `${baseUrl}/ewaybillapi/v1.03/ewayapi/${nicCmd}?email=${encodeURIComponent(
      config.nicUsername
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        client_id: config.gspClientId,
        client_secret: config.gspClientSecret,
        gstin: fromGstin,
        "auth-token": authToken,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    }
  );
  const raw = await res.json().catch(() => ({}));
  if (!res.ok || String(raw?.status_cd || "") === "0") {
    throw new Error(
      raw?.status_desc || raw?.error?.message || raw?.message || `MasterGST HTTP ${res.status}`
    );
  }
  return { mode: "live", raw };
}
