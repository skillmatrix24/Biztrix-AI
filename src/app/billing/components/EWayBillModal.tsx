"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldOff, Truck, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EWAY_CANCEL_REASONS,
  EWAY_TRANSPORT_MODES,
  EWAY_VEHICLE_UPDATE_REASONS,
  normalizeVehicleNo,
  validateEWayBillDetails,
  type EWayBillDetails,
  type EWayTransportMode,
} from "@/lib/eway-bill";

interface EWayBillModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  details: EWayBillDetails;
  invoiceTotal: number;
  currencySymbol: string;
  isRequired: boolean;
  invoiceId?: string;
  isSaving?: boolean;
  isGspConfigured?: boolean;
  isGeneratingLive?: boolean;
  isRunningApiAction?: boolean;
  onSave: (nextDetails: EWayBillDetails) => Promise<void> | void;
  onGenerateLiveEwb?: (draftDetails: EWayBillDetails) => Promise<void> | void;
  onUpdateVehicleApi?: (params: {
    vehicleNo: string;
    fromPlace: string;
    reasonCode: string;
    reasonRem: string;
    transMode: EWayTransportMode;
    transDocNo: string;
    transDocDate: string;
  }) => Promise<void> | void;
  onCancelEwbApi?: (params: {
    cancelRsnCode: string;
    cancelRmrk: string;
  }) => Promise<void> | void;
  onOpenGspSettings?: () => void;
}

export function EWayBillModal({
  isOpen,
  onOpenChange,
  details,
  invoiceTotal,
  currencySymbol,
  isRequired,
  invoiceId,
  isSaving = false,
  isGspConfigured = false,
  isGeneratingLive = false,
  isRunningApiAction = false,
  onSave,
  onGenerateLiveEwb,
  onUpdateVehicleApi,
  onCancelEwbApi,
  onOpenGspSettings,
}: EWayBillModalProps) {
  const [draft, setDraft] = useState<EWayBillDetails>(details);
  const [submittedOnce, setSubmittedOnce] = useState(false);

  // Live GSP Post-Generation Action state (Part-B Vehicle Update & Cancellation)
  const [livePanel, setLivePanel] = useState<"none" | "vehicle" | "cancel">("none");
  const [vehFromPlace, setVehFromPlace] = useState("");
  const [vehReasonCode, setVehReasonCode] = useState("1");
  const [vehReasonRem, setVehReasonRem] = useState("Vehicle updated during transit");
  const [cancelReasonCode, setCancelReasonCode] = useState("2");
  const [cancelRemark, setCancelRemark] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setSubmittedOnce(false);
    setLivePanel("none");
    setCancelRemark("");
    setDraft({
      ...details,
      enabled: details.enabled || isRequired,
    });
  }, [isOpen, details, isRequired]);

  const validation = useMemo(() => validateEWayBillDetails(draft), [draft]);

  const isEwbGenerated =
    Boolean(draft.ewbNumber) && draft.ewbStatus !== "CANCELLED";
  const isEwbCancelled = draft.ewbStatus === "CANCELLED";

  const handleSave = async () => {
    setSubmittedOnce(true);
    if (!validation.valid) return;

    const cleanEwb = (draft.ewbNumber || "").replace(/\D/g, "");
    const nextStatus =
      draft.ewbStatus === "CANCELLED"
        ? "CANCELLED"
        : cleanEwb
          ? "GENERATED"
          : draft.enabled || isRequired
            ? "PENDING_PORTAL"
            : "NOT_REQUIRED";

    await onSave({
      ...draft,
      vehicleNo: normalizeVehicleNo(draft.vehicleNo),
      transporterId: (draft.transporterId || "").trim().toUpperCase(),
      ewbNumber: cleanEwb,
      ewbStatus: nextStatus,
    });
  };

  const handleGenerateLive = async () => {
    setSubmittedOnce(true);
    if (!validation.valid || !onGenerateLiveEwb) return;
    await onGenerateLiveEwb({
      ...draft,
      enabled: true,
      vehicleNo: normalizeVehicleNo(draft.vehicleNo),
      transporterId: (draft.transporterId || "").trim().toUpperCase(),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl w-[95vw] bg-white text-left">
        <DialogHeader className="px-6 py-5 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Truck className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">
                {invoiceId
                  ? `E-Way Bill & Dispatch · ${invoiceId}`
                  : "E-Way Bill & Part-B Transport Details"}
              </DialogTitle>
              <DialogDescription className="text-slate-300 text-xs mt-0.5 font-mono tabular-nums">
                Invoice Total: {currencySymbol}
                {Number(invoiceTotal || 0).toLocaleString("en-IN")} ·{" "}
                {isRequired ? "Above ₹50,000 Threshold" : "Optional Dispatch Info"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-900">
                Attach Transport &amp; E-Way Bill Details
              </p>
              <p className="text-xs text-slate-600">
                Includes Part-B transport info on the A4 Tax Invoice and NIC GST Portal JSON export.
              </p>
            </div>
            <Switch
              checked={draft.enabled}
              onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, enabled: checked }))}
              aria-label="Enable E-Way Bill details"
            />
          </div>

          {draft.enabled && (
            <>
              {/* ROUTE & SUPPLY CLASSIFICATION */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Supply Type</Label>
                  <Select
                    value={draft.supplyType}
                    onValueChange={(v: "O" | "I") =>
                      setDraft((prev) => ({ ...prev, supplyType: v }))
                    }
                  >
                    <SelectTrigger className="h-9 text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[300]">
                      <SelectItem value="O" className="text-xs">
                        Outward (Sales)
                      </SelectItem>
                      <SelectItem value="I" className="text-xs">
                        Inward (Purchase / Return)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    From Pincode (Origin)
                  </Label>
                  <Input
                    maxLength={6}
                    placeholder="e.g. 400001"
                    value={draft.fromPincode}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        fromPincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                      }))
                    }
                    className="h-9 font-mono tabular-nums text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    To Pincode (Destination)
                  </Label>
                  <Input
                    maxLength={6}
                    placeholder="e.g. 411001"
                    value={draft.toPincode}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        toPincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                      }))
                    }
                    className="h-9 font-mono tabular-nums text-xs"
                  />
                </div>
              </div>

              {/* PART-B TRANSPORT FIELDS */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <p className="text-xs font-bold text-slate-900">Part-B Transport Information</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Transport Mode</Label>
                    <Select
                      value={draft.transMode}
                      onValueChange={(v: EWayTransportMode) =>
                        setDraft((prev) => ({ ...prev, transMode: v }))
                      }
                    >
                      <SelectTrigger className="h-9 text-xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[300]">
                        {EWAY_TRANSPORT_MODES.map((m) => (
                          <SelectItem key={m.value} value={m.value} className="text-xs">
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Vehicle Number
                    </Label>
                    <Input
                      placeholder="e.g. MH12AB1234"
                      value={draft.vehicleNo}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          vehicleNo: normalizeVehicleNo(e.target.value),
                        }))
                      }
                      className="h-9 font-mono uppercase text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Distance (KM · 0 = Auto)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={4000}
                      placeholder="0"
                      value={draft.transDistance}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, transDistance: e.target.value }))
                      }
                      className="h-9 font-mono tabular-nums text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Transporter Name (Optional)
                    </Label>
                    <Input
                      placeholder="e.g. SafeExpress / VRL Logistics"
                      value={draft.transporterName}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, transporterName: e.target.value }))
                      }
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Transporter ID / GSTIN (15 chars)
                    </Label>
                    <Input
                      maxLength={15}
                      placeholder="e.g. 27AABCT1234F1Z5"
                      value={draft.transporterId}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          transporterId: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                        }))
                      }
                      className="h-9 font-mono uppercase text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      LR / GR / Transport Doc No.
                    </Label>
                    <Input
                      placeholder="Optional doc no."
                      value={draft.transDocNo}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, transDocNo: e.target.value }))
                      }
                      className="h-9 font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Transport Doc Date
                    </Label>
                    <Input
                      type="date"
                      value={draft.transDocDate}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, transDocDate: e.target.value }))
                      }
                      className="h-9 font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Vehicle Type</Label>
                    <Select
                      value={draft.vehicleType}
                      onValueChange={(v: "R" | "O") =>
                        setDraft((prev) => ({ ...prev, vehicleType: v }))
                      }
                    >
                      <SelectTrigger className="h-9 text-xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[300]">
                        <SelectItem value="R" className="text-xs">
                          Regular
                        </SelectItem>
                        <SelectItem value="O" className="text-xs">
                          Over Dimensional Cargo (ODC)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* PORTAL EWB TRACKING SECTION */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-900">
                    Portal E-Way Bill Tracking (Optional)
                  </p>
                  <span className="text-[11px] text-slate-500">
                    Fill after uploading JSON on ewaybillgst.gov.in
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      12-Digit E-Way Bill Number
                    </Label>
                    <Input
                      maxLength={12}
                      placeholder="e.g. 141009912345"
                      value={draft.ewbNumber || ""}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          ewbNumber: e.target.value.replace(/\D/g, "").slice(0, 12),
                        }))
                      }
                      className="h-9 font-mono tabular-nums text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Valid Upto (Date / Time)
                    </Label>
                    <Input
                      placeholder="e.g. 16/11/2026 11:59 PM"
                      value={draft.ewbValidUpto || ""}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, ewbValidUpto: e.target.value }))
                      }
                      className="h-9 font-mono text-xs"
                    />
                  </div>
                </div>

                {invoiceId && isEwbCancelled && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    E-Way Bill {draft.ewbNumber} is marked CANCELLED
                    {draft.cancelReason ? ` · Reason: ${draft.cancelReason}` : ""}.
                  </div>
                )}

                {invoiceId && !isEwbGenerated && !isGspConfigured && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between gap-3 text-xs text-slate-600">
                    <span>
                      Want 1-click live E-Way Bill generation without uploading JSON manually?
                    </span>
                    {onOpenGspSettings && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={onOpenGspSettings}
                        className="h-7 px-2.5 text-[11px] font-semibold shrink-0"
                      >
                        Configure GSP API
                      </Button>
                    )}
                  </div>
                )}

                {invoiceId && isEwbGenerated && isGspConfigured && (onUpdateVehicleApi || onCancelEwbApi) && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900">
                        Live NIC Portal Actions · EWB {draft.ewbNumber}
                      </p>
                      <div className="flex items-center gap-2">
                        {onUpdateVehicleApi && (
                          <Button
                            type="button"
                            size="sm"
                            variant={livePanel === "vehicle" ? "default" : "outline"}
                            onClick={() =>
                              setLivePanel((p) => (p === "vehicle" ? "none" : "vehicle"))
                            }
                            className="h-7 px-2.5 text-[11px] font-semibold"
                          >
                            <RefreshCw className="mr-1 h-3 w-3" />
                            Update Vehicle (Part-B)
                          </Button>
                        )}
                        {onCancelEwbApi && (
                          <Button
                            type="button"
                            size="sm"
                            variant={livePanel === "cancel" ? "destructive" : "outline"}
                            onClick={() =>
                              setLivePanel((p) => (p === "cancel" ? "none" : "cancel"))
                            }
                            className="h-7 px-2.5 text-[11px] font-semibold"
                          >
                            <ShieldOff className="mr-1 h-3 w-3" />
                            Cancel EWB
                          </Button>
                        )}
                      </div>
                    </div>

                    {livePanel === "vehicle" && onUpdateVehicleApi && (
                      <div className="space-y-3 pt-2 border-t border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              From Place (City)
                            </Label>
                            <Input
                              placeholder="e.g. Pune"
                              value={vehFromPlace}
                              onChange={(e) => setVehFromPlace(e.target.value)}
                              className="h-8 bg-white text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              Update Reason
                            </Label>
                            <Select value={vehReasonCode} onValueChange={setVehReasonCode}>
                              <SelectTrigger className="h-8 bg-white text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-[300]">
                                {EWAY_VEHICLE_UPDATE_REASONS.map((r) => (
                                  <SelectItem key={r.code} value={r.code} className="text-xs">
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              Reason Remark
                            </Label>
                            <Input
                              value={vehReasonRem}
                              onChange={(e) => setVehReasonRem(e.target.value)}
                              className="h-8 bg-white text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            disabled={isRunningApiAction}
                            onClick={() =>
                              onUpdateVehicleApi({
                                vehicleNo: normalizeVehicleNo(draft.vehicleNo),
                                fromPlace: vehFromPlace.trim() || "Local",
                                reasonCode: vehReasonCode,
                                reasonRem: vehReasonRem.trim() || "Vehicle updated",
                                transMode: draft.transMode,
                                transDocNo: draft.transDocNo,
                                transDocDate: draft.transDocDate,
                              })
                            }
                            className="h-8 px-3 text-xs font-semibold bg-slate-900 text-white"
                          >
                            {isRunningApiAction ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Push Vehicle Update ({draft.vehicleNo || "Enter Vehicle Above"})
                          </Button>
                        </div>
                      </div>
                    )}

                    {livePanel === "cancel" && onCancelEwbApi && (
                      <div className="space-y-3 pt-2 border-t border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              NIC Cancellation Reason
                            </Label>
                            <Select value={cancelReasonCode} onValueChange={setCancelReasonCode}>
                              <SelectTrigger className="h-8 bg-white text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-[300]">
                                {EWAY_CANCEL_REASONS.map((r) => (
                                  <SelectItem key={r.code} value={r.code} className="text-xs">
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              Cancellation Remark (Required)
                            </Label>
                            <Input
                              placeholder="e.g. Order cancelled by customer"
                              value={cancelRemark}
                              onChange={(e) => setCancelRemark(e.target.value)}
                              className="h-8 bg-white text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={isRunningApiAction || !cancelRemark.trim()}
                            onClick={() =>
                              onCancelEwbApi({
                                cancelRsnCode: cancelReasonCode,
                                cancelRmrk: cancelRemark.trim(),
                              })
                            }
                            className="h-8 px-3 text-xs font-semibold"
                          >
                            {isRunningApiAction ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Confirm Cancel E-Way Bill
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {(submittedOnce || validation.errors.length > 0 || validation.warnings.length > 0) &&
                (validation.errors.length > 0 || validation.warnings.length > 0) && (
                  <div className="space-y-2">
                    {validation.errors.map((err, i) => (
                      <div
                        key={`err-${i}`}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-center gap-2"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{err}</span>
                      </div>
                    ))}
                    {validation.warnings.map((warn, i) => (
                      <div
                        key={`warn-${i}`}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center gap-2"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{warn}</span>
                      </div>
                    ))}
                  </div>
                )}
            </>
          )}
        </div>

        <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-row items-center justify-between gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 rounded-lg text-xs font-semibold"
          >
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {invoiceId && isGspConfigured && onGenerateLiveEwb && !isEwbGenerated && (
              <Button
                type="button"
                disabled={isGeneratingLive || isSaving || (submittedOnce && !validation.valid)}
                onClick={handleGenerateLive}
                className="h-10 px-4 bg-emerald-700 hover:bg-emerald-800 text-xs font-bold rounded-lg text-white"
              >
                {isGeneratingLive ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="mr-1.5 h-4 w-4" />
                    Generate Live EWB
                  </>
                )}
              </Button>
            )}
            <Button
              type="button"
              disabled={isSaving || isGeneratingLive || (submittedOnce && !validation.valid)}
              onClick={handleSave}
              className="h-10 px-5 bg-primary hover:bg-primary/90 text-xs font-bold rounded-lg text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Save E-Way Details
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
