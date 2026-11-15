import { NextRequest, NextResponse } from "next/server";
import {
  buildNicCancelEwbPayload,
  buildNicVehicleUpdatePayload,
  normalizeVehicleNo,
  resolveGstStateCode,
  type EWayBillDetails,
  type EWayTransportMode,
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
    const { businessId, invoiceId, action, payload = {} } = body || {};

    if (!invoiceId || !action) {
      return NextResponse.json(
        { success: false, message: "invoiceId and action are required." },
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
    const invoice: Record<string, any> = { id: invoiceId, ...invRes.data };
    const existingEway = (invoice.ewayBill || {}) as EWayBillDetails;
    const ewbNo = String(existingEway.ewbNumber || payload.ewbNumber || "").replace(/\D/g, "");

    if (!/^\d{12}$/.test(ewbNo)) {
      return NextResponse.json(
        { success: false, message: "A valid 12-digit E-Way Bill number is required first." },
        { status: 400 }
      );
    }

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
          message: "GSP E-Way Bill API credentials are not configured.",
        },
        { status: 412 }
      );
    }

    if (action === "UPDATE_VEHICLE") {
      if (existingEway.ewbStatus === "CANCELLED") {
        return NextResponse.json(
          { success: false, message: "Cannot update vehicle on a cancelled E-Way Bill." },
          { status: 400 }
        );
      }

      const cleanVehicle = normalizeVehicleNo(payload.vehicleNo || existingEway.vehicleNo || "");
      if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/.test(cleanVehicle)) {
        return NextResponse.json(
          { success: false, message: "Enter a valid Vehicle Number (e.g., MH12AB1234)." },
          { status: 400 }
        );
      }

      const nicVehPayload = buildNicVehicleUpdatePayload({
        ewbNo,
        vehicleNo: cleanVehicle,
        fromPlace: String(payload.fromPlace || auth.business?.state || "Local"),
        fromState: resolveGstStateCode(auth.business?.state, auth.business?.gstin),
        reasonCode: String(payload.reasonCode || "1"),
        reasonRem: String(payload.reasonRem || "Vehicle updated via Biztrix"),
        transMode: (payload.transMode || existingEway.transMode || "1") as EWayTransportMode,
        transDocNo: payload.transDocNo ?? existingEway.transDocNo,
        transDocDate: payload.transDocDate ?? existingEway.transDocDate,
      });

      const gspRes = await dispatchGspOperation({
        secrets,
        operation: "VEHEWB",
        payload: nicVehPayload,
      });

      if (!gspRes.ok) {
        return NextResponse.json(
          { success: false, code: gspRes.errorCode, message: gspRes.errorMessage },
          { status: gspRes.statusCode }
        );
      }

      const updatedEway: EWayBillDetails = {
        ...existingEway,
        enabled: true,
        ewbNumber: ewbNo,
        ewbStatus: "GENERATED",
        vehicleNo: cleanVehicle,
        transMode: nicVehPayload.transMode as EWayTransportMode,
        transDocNo: nicVehPayload.transDocNo || existingEway.transDocNo || "",
        ewbValidUpto: gspRes.data.ewbValidUpto || existingEway.ewbValidUpto || "",
        lastVehicleUpdateAt: new Date().toISOString(),
      };

      await updateDocSafe(
        `businesses/${businessId}/invoices/${invoiceId}`,
        { ewayBill: updatedEway },
        auth.idToken
      );

      return NextResponse.json({
        success: true,
        ewayBill: updatedEway,
        message: `Part-B Vehicle updated to ${cleanVehicle} on NIC portal.`,
      });
    }

    if (action === "CANCEL_EWB") {
      const cancelRmrk = String(payload.cancelRmrk || "").trim();
      if (!cancelRmrk) {
        return NextResponse.json(
          { success: false, message: "Cancellation remark is required." },
          { status: 400 }
        );
      }

      const nicCancelPayload = buildNicCancelEwbPayload({
        ewbNo,
        cancelRsnCode: String(payload.cancelRsnCode || "2"),
        cancelRmrk,
      });

      const gspRes = await dispatchGspOperation({
        secrets,
        operation: "CANEWB",
        payload: nicCancelPayload,
      });

      if (!gspRes.ok) {
        return NextResponse.json(
          { success: false, code: gspRes.errorCode, message: gspRes.errorMessage },
          { status: gspRes.statusCode }
        );
      }

      const updatedEway: EWayBillDetails = {
        ...existingEway,
        enabled: true,
        ewbNumber: ewbNo,
        ewbStatus: "CANCELLED",
        cancelledAt: new Date().toISOString(),
        cancelReason: cancelRmrk,
      };

      await updateDocSafe(
        `businesses/${businessId}/invoices/${invoiceId}`,
        { ewayBill: updatedEway },
        auth.idToken
      );

      return NextResponse.json({
        success: true,
        ewayBill: updatedEway,
        message: `E-Way Bill ${ewbNo} cancelled on NIC portal.`,
      });
    }

    return NextResponse.json(
      { success: false, message: `Unsupported action: ${action}` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("POST /api/eway-bill/action failed:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to execute E-Way Bill action." },
      { status: 500 }
    );
  }
}
