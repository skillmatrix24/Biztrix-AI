import { NextRequest, NextResponse } from "next/server";
import {
  buildNicGeneratePayload,
  validateInvoiceForLiveEwb,
  type EWayBillDetails,
} from "@/lib/eway-bill";
import {
  dispatchGspOperation,
  readDocSafe,
  updateDocSafe,
  verifyBusinessApiRequest,
  type GspPrivateSecrets,
} from "@/lib/eway-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, invoiceId, ewayDetails } = body || {};

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, message: "invoiceId is required." },
        { status: 400 }
      );
    }

    const auth = await verifyBusinessApiRequest(req, String(businessId || ""), false);
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }

    const invRes = await readDocSafe(
      `businesses/${businessId}/invoices/${invoiceId}`,
      auth.idToken
    );
    if (!invRes.exists || !invRes.data) {
      return NextResponse.json(
        { success: false, message: `Invoice ${invoiceId} not found.` },
        { status: 404 }
      );
    }
    const invoice = { id: invoiceId, ...invRes.data };

    const privRes = await readDocSafe(
      `businesses/${businessId}/privateConfig/ewayBill`,
      auth.idToken
    );
    const secrets = (privRes.data as GspPrivateSecrets) || null;

    if (
      !secrets ||
      (secrets.provider === "cleartax"
        ? !secrets.apiKey
        : !secrets.clientId || !secrets.clientSecret || !secrets.gstPassword)
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "GSP_NOT_CONFIGURED",
          message:
            "Live GSP E-Way Bill credentials are not configured. Configure GSP API in Settings → Tax & GST (or GSP Settings) or download NIC JSON.",
        },
        { status: 412 }
      );
    }

    const preflight = validateInvoiceForLiveEwb(
      invoice,
      auth.business,
      ewayDetails as Partial<EWayBillDetails> | undefined
    );
    if (!preflight.valid) {
      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_FAILED",
          message: preflight.errors.join(" "),
          errors: preflight.errors,
        },
        { status: 400 }
      );
    }

    const nicPayload = buildNicGeneratePayload(invoice, auth.business, preflight.mergedDetails);

    const gspRes = await dispatchGspOperation({
      secrets,
      operation: "GENEWAYBILL",
      payload: nicPayload,
    });

    if (!gspRes.ok) {
      return NextResponse.json(
        {
          success: false,
          code: gspRes.errorCode,
          message: gspRes.errorMessage,
        },
        { status: gspRes.statusCode }
      );
    }

    if (!gspRes.data.ewbNumber) {
      return NextResponse.json(
        {
          success: false,
          code: "MISSING_EWB_NUMBER",
          message: "GSP responded without a valid 12-digit E-Way Bill number.",
        },
        { status: 502 }
      );
    }

    const updatedEway: EWayBillDetails = {
      ...preflight.mergedDetails,
      enabled: true,
      ewbNumber: gspRes.data.ewbNumber,
      ewbDate: gspRes.data.ewbDate || new Date().toLocaleDateString("en-IN"),
      ewbValidUpto: gspRes.data.ewbValidUpto || "",
      ewbQrData: gspRes.data.qrData || "",
      ewbStatus: "GENERATED",
      apiProvider: secrets.provider,
    };

    await updateDocSafe(
      `businesses/${businessId}/invoices/${invoiceId}`,
      { ewayBill: updatedEway },
      auth.idToken
    );

    return NextResponse.json({
      success: true,
      ewayBill: updatedEway,
      message: `Live E-Way Bill ${updatedEway.ewbNumber} generated successfully.`,
    });
  } catch (err: any) {
    console.error("POST /api/eway-bill/generate failed:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to generate live E-Way Bill." },
      { status: 500 }
    );
  }
}
