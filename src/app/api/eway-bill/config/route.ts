import { NextRequest, NextResponse } from "next/server";
import {
  validateGspConfigInput,
  type GspEnvironment,
  type GspProviderId,
} from "@/lib/eway-bill";
import {
  authenticateGspSession,
  buildPublicEWayConfig,
  deleteDocSafe,
  readDocSafe,
  setDocSafe,
  updateDocSafe,
  verifyBusinessApiRequest,
  type GspPrivateSecrets,
} from "@/lib/eway-server";

export async function GET(req: NextRequest) {
  try {
    const businessId = req.nextUrl.searchParams.get("businessId") || "";
    const auth = await verifyBusinessApiRequest(req, businessId, false);
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }

    let secrets: GspPrivateSecrets | null = null;
    try {
      const priv = await readDocSafe(`businesses/${businessId}/privateConfig/ewayBill`, auth.idToken);
      secrets = (priv.data as GspPrivateSecrets) || null;
    } catch {
      // Non-owner staff or missing ADC falls back cleanly to public metadata flags
      secrets = null;
    }

    const config = buildPublicEWayConfig(auth.business, secrets);
    return NextResponse.json({ success: true, config });
  } catch (err: any) {
    console.error("GET /api/eway-bill/config failed:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to load GSP configuration." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessId,
      provider = "mastergst",
      environment = "sandbox",
      gstin,
      gstUsername = "",
      clientId = "",
      clientSecret = "",
      gstPassword = "",
      apiKey = "",
      customAuthUrl = "",
      customBaseUrl = "",
      testHandshake = false,
    } = body || {};

    const auth = await verifyBusinessApiRequest(req, String(businessId || ""), true);
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }

    let existingSecrets: Partial<GspPrivateSecrets> = {};
    try {
      const priv = await readDocSafe(`businesses/${businessId}/privateConfig/ewayBill`, auth.idToken);
      if (priv.data) existingSecrets = priv.data;
    } catch {
      existingSecrets = {};
    }

    const resolvedGstin = String(gstin || auth.business?.gstin || "").trim().toUpperCase();
    const hasExistingSecrets = Boolean(
      existingSecrets.clientId || existingSecrets.clientSecret || existingSecrets.apiKey
    );

    const validation = validateGspConfigInput({
      provider: provider as GspProviderId,
      environment: environment as GspEnvironment,
      gstin: resolvedGstin,
      gstUsername,
      clientId,
      clientSecret,
      gstPassword,
      apiKey,
      customAuthUrl,
      customBaseUrl,
      hasExistingSecrets,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.errors.join(" "), errors: validation.errors },
        { status: 400 }
      );
    }

    const mergedSecrets: GspPrivateSecrets = {
      provider: provider as GspProviderId,
      environment: environment as GspEnvironment,
      gstin: resolvedGstin,
      gstUsername: String(gstUsername || existingSecrets.gstUsername || "").trim(),
      clientId: String(clientId || "").trim() || existingSecrets.clientId || "",
      clientSecret: String(clientSecret || "").trim() || existingSecrets.clientSecret || "",
      gstPassword: String(gstPassword || "").trim() || existingSecrets.gstPassword || "",
      apiKey: String(apiKey || "").trim() || existingSecrets.apiKey || "",
      customAuthUrl: String(customAuthUrl || "").trim(),
      customBaseUrl: String(customBaseUrl || "").trim(),
    };

    const nowIso = new Date().toISOString();
    let testResult: { ok: boolean; errorMessage?: string; errorCode?: string } | null = null;

    if (testHandshake) {
      testResult = await authenticateGspSession(mergedSecrets);
    }

    await setDocSafe(
      `businesses/${businessId}/privateConfig/ewayBill`,
      mergedSecrets,
      { merge: true },
      auth.idToken
    );

    const publicSummary = {
      provider: mergedSecrets.provider,
      environment: mergedSecrets.environment,
      gstin: mergedSecrets.gstin,
      gstUsername: mergedSecrets.gstUsername,
      customAuthUrl: mergedSecrets.customAuthUrl || "",
      customBaseUrl: mergedSecrets.customBaseUrl || "",
      isConfigured: true,
      hasClientId: Boolean(mergedSecrets.clientId),
      hasClientSecret: Boolean(mergedSecrets.clientSecret),
      hasPassword: Boolean(mergedSecrets.gstPassword),
      hasApiKey: Boolean(mergedSecrets.apiKey),
      updatedAt: nowIso,
      ...(testResult
        ? {
            lastTestedAt: nowIso,
            lastStatusMessage: testResult.ok
              ? "GSP Auth Handshake Verified"
              : testResult.errorMessage || "Auth Check Failed",
          }
        : {}),
    };

    await updateDocSafe(
      `businesses/${businessId}`,
      { ewayApiConfig: publicSummary },
      auth.idToken
    );

    if (testHandshake && testResult && !testResult.ok) {
      return NextResponse.json(
        {
          success: false,
          saved: true,
          config: publicSummary,
          errorCode: testResult.errorCode,
          message: `Credentials saved, but GSP Auth test failed: ${testResult.errorMessage}`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      config: publicSummary,
      message: testHandshake
        ? "GSP credentials saved and authenticated successfully."
        : "GSP API credentials saved securely.",
    });
  } catch (err: any) {
    console.error("POST /api/eway-bill/config failed:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to save GSP configuration." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const businessId = req.nextUrl.searchParams.get("businessId") || "";
    const auth = await verifyBusinessApiRequest(req, businessId, true);
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }

    await deleteDocSafe(`businesses/${businessId}/privateConfig/ewayBill`, auth.idToken);
    await updateDocSafe(
      `businesses/${businessId}`,
      {
        ewayApiConfig: {
          provider: auth.business?.ewayApiConfig?.provider || "mastergst",
          environment: auth.business?.ewayApiConfig?.environment || "sandbox",
          gstUsername: "",
          gstin: auth.business?.gstin || "",
          isConfigured: false,
          hasClientId: false,
          hasClientSecret: false,
          hasPassword: false,
          hasApiKey: false,
          updatedAt: new Date().toISOString(),
        },
      },
      auth.idToken
    );

    return NextResponse.json({ success: true, message: "GSP API configuration removed." });
  } catch (err: any) {
    console.error("DELETE /api/eway-bill/config failed:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to remove GSP configuration." },
      { status: 500 }
    );
  }
}
