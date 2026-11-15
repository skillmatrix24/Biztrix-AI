import { initializeAdmin } from "@/firebase/admin";
import {
  isPermissionDeniedError,
  restDeleteDoc,
  restGetDoc,
  restSetDoc,
  restUpdateDoc,
  SERVER_TIMESTAMP_SENTINEL,
} from "@/firebase/firestore-rest";
import {
  parseNicGspResponse,
  resolveGspEndpoints,
  type GspEnvironment,
  type GspProviderId,
  type PublicEWayApiConfig,
} from "./eway-bill";

export interface GspPrivateSecrets {
  provider: GspProviderId;
  environment: GspEnvironment;
  gstin: string;
  gstUsername: string;
  gstPassword?: string;
  clientId?: string;
  clientSecret?: string;
  apiKey?: string;
  customAuthUrl?: string;
  customBaseUrl?: string;
  cachedAuthToken?: string;
  cachedAuthExpiresAt?: string;
}

export interface AuthBusinessContext {
  ok: true;
  uid: string;
  email: string;
  idToken: string;
  role: string;
  isPlatformOwner: boolean;
  business: Record<string, any>;
}

export interface AuthBusinessFailure {
  ok: false;
  status: number;
  message: string;
}

const PLATFORM_OWNER_EMAILS = new Set(["skillmatrix24@gmail.com", "gw7infra@gmail.com"]);

function shouldUseRestFallback(err: unknown): boolean {
  if (isPermissionDeniedError(err)) return true;
  const msg = String((err as any)?.message || "").toLowerCase();
  return (
    msg.includes("default credentials") ||
    msg.includes("unauthenticated") ||
    msg.includes("could not refresh access token") ||
    msg.includes("credential")
  );
}

export async function readDocSafe(
  path: string,
  idToken?: string
): Promise<{ exists: boolean; data: Record<string, any> | null }> {
  const { db } = initializeAdmin();
  try {
    const snap = await db.doc(path).get();
    return {
      exists: snap.exists,
      data: snap.exists ? ((snap.data() as Record<string, any>) || null) : null,
    };
  } catch (err) {
    if (idToken && shouldUseRestFallback(err)) {
      const restSnap = await restGetDoc(path, idToken);
      return {
        exists: restSnap.exists,
        data: restSnap.exists ? (restSnap.data() || null) : null,
      };
    }
    throw err;
  }
}

export async function setDocSafe(
  path: string,
  data: Record<string, any>,
  options: { merge?: boolean } = {},
  idToken?: string
): Promise<void> {
  const { db, admin } = initializeAdmin();
  try {
    const payload = {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.doc(path).set(payload, { merge: Boolean(options.merge) });
  } catch (err) {
    if (idToken && shouldUseRestFallback(err)) {
      await restSetDoc(
        path,
        { ...data, updatedAt: SERVER_TIMESTAMP_SENTINEL },
        idToken,
        options
      );
      return;
    }
    throw err;
  }
}

export async function updateDocSafe(
  path: string,
  updates: Record<string, any>,
  idToken?: string
): Promise<void> {
  const { db, admin } = initializeAdmin();
  try {
    await db.doc(path).update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    if (idToken && shouldUseRestFallback(err)) {
      await restUpdateDoc(
        path,
        { ...updates, updatedAt: SERVER_TIMESTAMP_SENTINEL },
        idToken
      );
      return;
    }
    throw err;
  }
}

export async function deleteDocSafe(path: string, idToken?: string): Promise<void> {
  const { db } = initializeAdmin();
  try {
    await db.doc(path).delete();
  } catch (err) {
    if (idToken && shouldUseRestFallback(err)) {
      await restDeleteDoc(path, idToken);
      return;
    }
    throw err;
  }
}

export async function verifyBusinessApiRequest(
  req: Request,
  businessId: string,
  requireAdmin = false
): Promise<AuthBusinessContext | AuthBusinessFailure> {
  if (!businessId) {
    return { ok: false, status: 400, message: "businessId is required." };
  }

  const authHeader = req.headers.get("authorization") || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!idToken) {
    return { ok: false, status: 401, message: "Missing Authorization Bearer token." };
  }

  let uid = "";
  let email = "";
  let emailVerified = false;

  try {
    const { admin } = initializeAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
    email = String(decoded.email || "").toLowerCase();
    emailVerified = Boolean(decoded.email_verified);
  } catch (err: any) {
    return {
      ok: false,
      status: 401,
      message: `Invalid or expired Firebase ID token: ${err?.message || "Unauthorized"}`,
    };
  }

  const isPlatformOwner = emailVerified && PLATFORM_OWNER_EMAILS.has(email);

  const bizRes = await readDocSafe(`businesses/${businessId}`, idToken);
  if (!bizRes.exists || !bizRes.data) {
    return { ok: false, status: 404, message: "Business workspace not found." };
  }
  const business: Record<string, any> = { id: businessId, ...bizRes.data };

  const userRes = await readDocSafe(`users/${uid}`, idToken);
  const userData = userRes.data || {};
  const userRole = String(userData.role || (business.ownerId === uid ? "owner" : "staff")).toLowerCase();
  const isOwner = business.ownerId === uid;
  const isMember = isPlatformOwner || isOwner || userData.businessId === businessId;

  if (!isMember) {
    return { ok: false, status: 403, message: "Access denied for this business workspace." };
  }

  if (requireAdmin) {
    const isAdminRole = isPlatformOwner || isOwner || ["admin", "owner", "manager"].includes(userRole);
    if (!isAdminRole) {
      return {
        ok: false,
        status: 403,
        message: "Only Business Admin or Manager can modify GSP API credentials.",
      };
    }
  }

  return {
    ok: true,
    uid,
    email,
    idToken,
    role: userRole,
    isPlatformOwner,
    business,
  };
}

export function buildPublicEWayConfig(
  business: Record<string, any>,
  secrets: GspPrivateSecrets | null
): PublicEWayApiConfig {
  const existing = (business?.ewayApiConfig || {}) as Partial<PublicEWayApiConfig>;
  const provider: GspProviderId = secrets?.provider || existing.provider || "mastergst";
  const environment: GspEnvironment = secrets?.environment || existing.environment || "sandbox";

  const hasClientId = Boolean(secrets?.clientId);
  const hasClientSecret = Boolean(secrets?.clientSecret);
  const hasPassword = Boolean(secrets?.gstPassword);
  const hasApiKey = Boolean(secrets?.apiKey);

  const isConfigured =
    provider === "cleartax"
      ? Boolean(existing.isConfigured || hasApiKey)
      : Boolean(
          existing.isConfigured ||
            (hasClientId && hasClientSecret && hasPassword && (secrets?.gstUsername || existing.gstUsername))
        );

  return {
    provider,
    environment,
    gstUsername: secrets?.gstUsername || existing.gstUsername || "",
    gstin: secrets?.gstin || existing.gstin || business?.gstin || "",
    customAuthUrl: secrets?.customAuthUrl || existing.customAuthUrl || "",
    customBaseUrl: secrets?.customBaseUrl || existing.customBaseUrl || "",
    isConfigured,
    hasClientId: hasClientId || existing.hasClientId || false,
    hasClientSecret: hasClientSecret || existing.hasClientSecret || false,
    hasPassword: hasPassword || existing.hasPassword || false,
    hasApiKey: hasApiKey || existing.hasApiKey || false,
    updatedAt: existing.updatedAt,
    lastTestedAt: existing.lastTestedAt,
    lastStatusMessage: existing.lastStatusMessage,
  };
}

async function fetchJsonWithTimeout(url: string, init: RequestInit, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { rawText: text };
    }
    return { httpStatus: res.status, okHttp: res.ok, json, rawText: text };
  } finally {
    clearTimeout(timer);
  }
}

export async function authenticateGspSession(secrets: GspPrivateSecrets): Promise<{
  ok: boolean;
  authToken?: string;
  errorMessage?: string;
  errorCode?: string;
}> {
  const endpoints = resolveGspEndpoints(secrets);

  if (endpoints.authStyle === "cleartax_token") {
    if (!secrets.apiKey) {
      return { ok: false, errorMessage: "ClearTax Auth Token is missing." };
    }
    return { ok: true, authToken: secrets.apiKey };
  }

  if (!endpoints.authUrl) {
    return { ok: false, errorMessage: "GSP Authentication URL is missing." };
  }

  const authUrlWithQuery = new URL(endpoints.authUrl);
  if (secrets.provider === "mastergst" && secrets.gstin) {
    authUrlWithQuery.searchParams.set("email", secrets.gstUsername || "");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    gstin: secrets.gstin,
    username: secrets.gstUsername,
    password: secrets.gstPassword || "",
    client_id: secrets.clientId || "",
    client_secret: secrets.clientSecret || "",
  };

  try {
    const resp = await fetchJsonWithTimeout(authUrlWithQuery.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify({
        username: secrets.gstUsername,
        password: secrets.gstPassword || "",
        gstin: secrets.gstin,
        app_key: secrets.clientSecret || "",
      }),
    });

    const parsed = parseNicGspResponse(resp.json);
    if (!resp.okHttp && !parsed.authToken) {
      return {
        ok: false,
        errorCode: parsed.errorCode || String(resp.httpStatus),
        errorMessage:
          parsed.errorMessage ||
          `GSP Authentication failed with HTTP ${resp.httpStatus}. Check Client ID, Secret & EWB credentials.`,
      };
    }

    if (!parsed.ok && !parsed.authToken) {
      return {
        ok: false,
        errorCode: parsed.errorCode,
        errorMessage: parsed.errorMessage || "GSP Auth handshake rejected credentials.",
      };
    }

    return {
      ok: true,
      authToken: parsed.authToken || secrets.apiKey || "AUTHENTICATED",
    };
  } catch (err: any) {
    const isTimeout = err?.name === "AbortError";
    return {
      ok: false,
      errorMessage: isTimeout
        ? "GSP server timed out after 15 seconds while authenticating."
        : `Could not reach GSP Auth endpoint (${endpoints.authUrl}): ${err?.message || "Network error"}`,
    };
  }
}

export async function dispatchGspOperation(params: {
  secrets: GspPrivateSecrets;
  operation: "GENEWAYBILL" | "VEHEWB" | "CANEWB";
  payload: Record<string, any>;
}) {
  const { secrets, operation, payload } = params;
  const endpoints = resolveGspEndpoints(secrets);

  const authRes = await authenticateGspSession(secrets);
  if (!authRes.ok) {
    return {
      ok: false as const,
      statusCode: 502,
      errorCode: authRes.errorCode || "GSP_AUTH_FAILED",
      errorMessage: authRes.errorMessage || "GSP Authentication failed.",
    };
  }

  const targetUrl =
    operation === "GENEWAYBILL"
      ? endpoints.generateUrl
      : operation === "VEHEWB"
        ? endpoints.updateVehicleUrl
        : endpoints.cancelUrl;

  if (!targetUrl) {
    return {
      ok: false as const,
      statusCode: 400,
      errorCode: "MISSING_ENDPOINT",
      errorMessage: `Target GSP URL missing for operation ${operation}.`,
    };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    gstin: secrets.gstin,
  };

  if (endpoints.authStyle === "cleartax_token") {
    headers["x-cleartax-auth-token"] = secrets.apiKey || authRes.authToken || "";
  } else {
    headers["client_id"] = secrets.clientId || "";
    headers["client_secret"] = secrets.clientSecret || "";
    headers["username"] = secrets.gstUsername || "";
    if (authRes.authToken) {
      headers["auth-token"] = authRes.authToken;
      headers["Authorization"] = `Bearer ${authRes.authToken}`;
    }
  }

  try {
    const resp = await fetchJsonWithTimeout(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const parsed = parseNicGspResponse(resp.json);
    if (!resp.okHttp || !parsed.ok) {
      return {
        ok: false as const,
        statusCode: resp.httpStatus >= 400 && resp.httpStatus < 500 ? 400 : 502,
        errorCode: parsed.errorCode || String(resp.httpStatus),
        errorMessage:
          parsed.errorMessage ||
          `GSP API returned HTTP ${resp.httpStatus} on ${operation}.`,
      };
    }

    return {
      ok: true as const,
      data: parsed,
    };
  } catch (err: any) {
    const isTimeout = err?.name === "AbortError";
    return {
      ok: false as const,
      statusCode: 504,
      errorCode: isTimeout ? "GSP_TIMEOUT" : "GSP_NETWORK_ERROR",
      errorMessage: isTimeout
        ? `GSP request timed out (${operation}).`
        : `Failed to connect to GSP endpoint (${targetUrl}): ${err?.message || "Network error"}`,
    };
  }
}
