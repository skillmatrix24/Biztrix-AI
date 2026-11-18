"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Edit2,
  Eye,
  Loader2,
  Plus,
  Scissors,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type {
  BestCouponOffer,
  BillingTotalsOutput,
  SplitPaymentEntry,
} from "@/lib/billing-engine";
import { getEWayModeLabel, type EWayBillDetails } from "@/lib/eway-bill";

interface ReconciliationPanelProps {
  selectedCustomerId: string;
  bestOffer: BestCouponOffer | null;
  totals: BillingTotalsOutput;
  manualAmount: string;
  setManualAmount: (v: string) => void;
  manualOverrideReason: string;
  setManualOverrideReason: (v: string) => void;
  manualGstRate: string;
  setManualGstRate: (v: string) => void;
  exemptAmount: string;
  setExemptAmount: (v: string) => void;
  advanceAmount: string;
  setAdvanceAmount: (v: string) => void;
  manualDiscount: number;
  setManualDiscount: (v: number) => void;
  couponCode: string;
  setCouponCode: (v: string) => void;
  handleApplyCoupon: (code?: string) => void;
  currencySymbol: string;
  isQuotation: boolean;
  paidAmount: string;
  setPaidAmount: (v: string) => void;
  paymentMode: string;
  setPaymentMode: (v: string) => void;
  paymentNote: string;
  setPaymentNote: (v: string) => void;
  handleOpenPreview: () => void;
  handleSave: () => void;
  appliedCoupons: any[];
  isSaving?: boolean;
  paymentModes: string[];
  isRewardSyncMode?: boolean;
  couponOverrides: Record<string, number>;
  setCouponOverrides: (v: Record<string, number>) => void;
  couponOverrideReasons: Record<string, string>;
  setCouponOverrideReasons: (v: Record<string, string>) => void;
  isSplitPayment: boolean;
  onToggleSplitPayment: (enabled: boolean) => void;
  splitPayments: SplitPaymentEntry[];
  onChangeSplitPayments: (entries: SplitPaymentEntry[]) => void;
  onOpenSplitBill?: () => void;
  ewayDetails?: EWayBillDetails;
  isEWayRequired?: boolean;
  onOpenEWayModal?: () => void;
}

export function ReconciliationPanel({
  selectedCustomerId,
  bestOffer,
  totals,
  manualAmount,
  setManualAmount,
  manualOverrideReason,
  setManualOverrideReason,
  manualGstRate,
  setManualGstRate,
  exemptAmount,
  setExemptAmount,
  advanceAmount,
  setAdvanceAmount,
  manualDiscount,
  setManualDiscount,
  couponCode,
  setCouponCode,
  handleApplyCoupon,
  currencySymbol,
  isQuotation,
  paidAmount,
  setPaidAmount,
  paymentMode,
  setPaymentMode,
  paymentNote,
  setPaymentNote,
  handleOpenPreview,
  handleSave,
  appliedCoupons,
  isSaving,
  paymentModes,
  isRewardSyncMode = false,
  couponOverrides,
  setCouponOverrides,
  couponOverrideReasons,
  setCouponOverrideReasons,
  isSplitPayment,
  onToggleSplitPayment,
  splitPayments,
  onChangeSplitPayments,
  onOpenSplitBill,
  ewayDetails,
  isEWayRequired = false,
  onOpenEWayModal,
}: ReconciliationPanelProps) {
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [tempOverrideValue, setTempOverrideValue] = useState("");
  const [tempOverrideReason, setTempOverrideReason] = useState("");
  const [showAdjustments, setShowAdjustments] = useState(
    Boolean(manualAmount || exemptAmount || advanceAmount || manualDiscount > 0)
  );

  const startOverride = (coupon: any) => {
    setEditingCouponId(coupon.id);
    setTempOverrideValue(couponOverrides[coupon.code]?.toString() || "");
    setTempOverrideReason(couponOverrideReasons[coupon.code] || "");
  };

  const cancelOverride = () => {
    setEditingCouponId(null);
    setTempOverrideValue("");
    setTempOverrideReason("");
  };

  const commitOverride = (code: string) => {
    const val = parseFloat(tempOverrideValue);
    if (Number.isNaN(val)) return;
    setCouponOverrides({ ...couponOverrides, [code]: val });
    setCouponOverrideReasons({ ...couponOverrideReasons, [code]: tempOverrideReason });
    setEditingCouponId(null);
  };

  const hasAdjustmentsActive =
    Boolean(manualAmount) ||
    Boolean(exemptAmount) ||
    Boolean(advanceAmount) ||
    manualDiscount > 0;

  return (
    <aside className="rounded-xl border border-slate-200 bg-white overflow-hidden xl:sticky xl:top-6">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary shrink-0" />
          <h2 className="text-sm font-bold text-slate-900">Payment &amp; Summary</h2>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-500">
          {totals.qty} qty
        </span>
      </div>

      <div className="p-5 space-y-5 text-left">
        {/* AUTOMATIC BEST-OFFER SUGGESTION */}
        {selectedCustomerId && bestOffer && (
          <div
            className={cn(
              "rounded-lg border p-3.5 flex items-start justify-between gap-3",
              bestOffer.type === "best"
                ? "bg-emerald-50/70 border-emerald-200"
                : "bg-sky-50/70 border-sky-200"
            )}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <Sparkles
                className={cn(
                  "h-4 w-4 shrink-0 mt-0.5",
                  bestOffer.type === "best" ? "text-emerald-700" : "text-primary"
                )}
              />
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs font-bold text-slate-900">
                  {bestOffer.type === "best"
                    ? `Best offer: ${bestOffer.coupon.code}`
                    : `Unlock ${bestOffer.coupon.code}`}
                </p>
                <p className="text-xs text-slate-600 font-mono tabular-nums">
                  {bestOffer.type === "best"
                    ? `Save ${currencySymbol}${(bestOffer.estimatedSavings || 0).toLocaleString("en-IN")}`
                    : `Add ${currencySymbol}${(bestOffer.amountNeeded || 0).toLocaleString("en-IN")} more`}
                </p>
              </div>
            </div>
            {bestOffer.type === "best" &&
              !appliedCoupons.some((c) => c.id === bestOffer.coupon.id) && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleApplyCoupon(bestOffer.coupon.code)}
                  className="h-7 px-2.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shrink-0"
                >
                  Apply
                </Button>
              )}
          </div>
        )}

        {/* FINAL PAYABLE BANNER */}
        <div
          className={cn(
            "rounded-xl p-4 text-white space-y-3",
            isQuotation
              ? "bg-amber-600"
              : isRewardSyncMode
                ? "bg-emerald-700"
                : "bg-slate-900"
          )}
        >
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <span className="text-xs font-semibold text-white/80">
              {isQuotation ? "Quoted Total" : "Final Payable"}
            </span>
            <span className="font-mono tabular-nums text-2xl sm:text-3xl font-extrabold tracking-tight">
              {currencySymbol}
              {totals.finalPayout.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="pt-2.5 border-t border-white/15 space-y-1 text-xs font-mono tabular-nums text-white/85">
            <div className="flex justify-between">
              <span className="font-sans">Gross Subtotal</span>
              <span>
                {currencySymbol}
                {totals.grossSubtotal.toLocaleString("en-IN")}
              </span>
            </div>
            {!isRewardSyncMode && totals.taxTotal > 0 && (
              <div className="flex justify-between">
                <span className="font-sans">
                  {totals.isInterState ? "IGST" : "CGST + SGST"}
                </span>
                <span>
                  {currencySymbol}
                  {totals.taxTotal.toLocaleString("en-IN")}
                </span>
              </div>
            )}
            {(totals.manualDiscountApplied > 0 || totals.couponApplied > 0) && (
              <div className="flex justify-between text-emerald-300">
                <span className="font-sans">Discounts &amp; Coupons</span>
                <span>
                  -{currencySymbol}
                  {(totals.manualDiscountApplied + totals.couponApplied).toLocaleString("en-IN")}
                </span>
              </div>
            )}
            {totals.advanceApplied > 0 && (
              <div className="flex justify-between text-emerald-300">
                <span className="font-sans">Advance Adjusted</span>
                <span>
                  -{currencySymbol}
                  {totals.advanceApplied.toLocaleString("en-IN")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* COUPON INPUT & APPLIED COUPONS */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-primary" />
            Promo / Loyalty Coupon
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter coupon code"
              value={couponCode || ""}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyCoupon();
                }
              }}
              className="h-9 rounded-lg font-mono text-xs uppercase border-slate-200 bg-slate-50/70"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => handleApplyCoupon()}
              className="h-9 px-3.5 rounded-lg border-slate-200 text-xs font-semibold text-primary shrink-0"
            >
              Apply
            </Button>
          </div>

          {appliedCoupons.length > 0 && (
            <div className="space-y-2 pt-1">
              {appliedCoupons.map((c) => {
                const isEditing = editingCouponId === c.id;
                const hasOverride = couponOverrides[c.code] !== undefined;

                return (
                  <div
                    key={c.id}
                    className={cn(
                      "rounded-lg border p-3 text-xs space-y-2",
                      hasOverride ? "border-amber-200 bg-amber-50/50" : "border-slate-200 bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-slate-900">{c.code}</span>
                        <span className="text-slate-500 ml-2">
                          {c.type === "percentage"
                            ? `${c.value}% OFF`
                            : `${currencySymbol}${c.value} OFF`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {!isEditing && (
                          <button
                            type="button"
                            aria-label={`Override value for ${c.code}`}
                            onClick={() => startOverride(c)}
                            className="h-7 w-7 rounded text-slate-500 hover:text-slate-900 hover:bg-white flex items-center justify-center"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={`Remove coupon ${c.code}`}
                          onClick={() => handleApplyCoupon(c.code)}
                          className="h-7 w-7 rounded text-slate-400 hover:text-red-600 hover:bg-white flex items-center justify-center"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 pt-1 border-t border-slate-200">
                        <div className="flex gap-1.5">
                          <Input
                            type="number"
                            placeholder={`Amount (${currencySymbol})`}
                            value={tempOverrideValue}
                            onChange={(e) => setTempOverrideValue(e.target.value)}
                            className="h-8 text-xs font-mono bg-white"
                          />
                          <Button
                            type="button"
                            size="icon"
                            onClick={() => commitOverride(c.code)}
                            className="h-8 w-8 bg-primary text-white shrink-0"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={cancelOverride}
                            className="h-8 w-8 shrink-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Input
                          value={tempOverrideReason}
                          onChange={(e) => setTempOverrideReason(e.target.value)}
                          placeholder="Reason for custom discount..."
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                    ) : (
                      hasOverride && (
                        <p className="text-[11px] text-amber-800 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          Custom discount: {currencySymbol}
                          {couponOverrides[c.code]}
                          {couponOverrideReasons[c.code]
                            ? ` (${couponOverrideReasons[c.code]})`
                            : ""}
                        </p>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLLAPSIBLE ADJUSTMENTS & OVERRIDES */}
        {!isRewardSyncMode && (
          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowAdjustments((prev) => !prev)}
              aria-expanded={showAdjustments}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 py-1"
            >
              <span>
                Discounts &amp; Bill Overrides
                {hasAdjustmentsActive ? " (Active)" : ""}
              </span>
              {showAdjustments ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {showAdjustments && (
              <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">
                      Global Discount ({currencySymbol})
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={manualDiscount || ""}
                      onChange={(e) =>
                        setManualDiscount(Math.max(0, parseFloat(e.target.value) || 0))
                      }
                      className="h-9 sm:h-8 text-xs font-mono tabular-nums bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">
                      Advance Paid ({currencySymbol})
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={advanceAmount || ""}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      className="h-9 sm:h-8 text-xs font-mono tabular-nums bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">
                      Manual Total Override
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Leave blank"
                      value={manualAmount || ""}
                      onChange={(e) => setManualAmount(e.target.value)}
                      className="h-9 sm:h-8 text-xs font-mono tabular-nums bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">
                      Tax-Exempt ({currencySymbol})
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={exemptAmount || ""}
                      onChange={(e) => setExemptAmount(e.target.value)}
                      className="h-9 sm:h-8 text-xs font-mono tabular-nums bg-white"
                    />
                  </div>
                </div>

                {totals.isOverridden && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600">
                        Override GST Slab
                      </Label>
                      <Select value={manualGstRate} onValueChange={setManualGstRate}>
                        <SelectTrigger className="h-8 text-xs font-mono bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 5, 12, 18, 28].map((r) => (
                            <SelectItem key={r} value={r.toString()} className="text-xs font-mono">
                              {r}% GST
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600">
                        Override Reason
                      </Label>
                      <Input
                        value={manualOverrideReason || ""}
                        onChange={(e) => setManualOverrideReason(e.target.value)}
                        placeholder="Reason..."
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PAYMENT SETTLEMENT (POS ONLY) */}
        {!isQuotation && !isRewardSyncMode && (
          <div className="space-y-3.5 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label className="text-xs font-semibold text-slate-700">
                {isSplitPayment ? "Split Payment" : `Amount Received (${currencySymbol})`}
              </Label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onToggleSplitPayment(false);
                    setPaidAmount(String(totals.finalPayout));
                  }}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700"
                >
                  Full
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onToggleSplitPayment(false);
                    setPaidAmount(String(Math.round(totals.finalPayout / 2)));
                  }}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onToggleSplitPayment(false);
                    setPaidAmount("0");
                  }}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-red-700"
                >
                  Udhaar
                </button>
                <button
                  type="button"
                  aria-pressed={isSplitPayment}
                  onClick={() => onToggleSplitPayment(!isSplitPayment)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-semibold transition-colors",
                    isSplitPayment
                      ? "bg-primary text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  )}
                >
                  Split
                </button>
              </div>
            </div>

            {!isSplitPayment ? (
              <>
                <Input
                  type="number"
                  min={0}
                  placeholder="Enter received amount (blank = ₹0 Udhaar)"
                  value={paidAmount || ""}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="h-11 font-mono tabular-nums text-base font-bold text-slate-900 rounded-lg border-slate-200 bg-slate-50/70"
                />

                {totals.finalPayout > 0 && (
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    {totals.changeReturn > 0 ? (
                      <>
                        <span className="font-sans text-emerald-700 font-semibold">Change to Return</span>
                        <span className="font-bold text-emerald-700">
                          {currencySymbol}
                          {totals.changeReturn.toLocaleString("en-IN")}
                        </span>
                      </>
                    ) : totals.dueAmount > 0 ? (
                      <>
                        <span className="font-sans text-red-700 font-semibold">Balance Udhaar</span>
                        <span className="font-bold text-red-700">
                          {currencySymbol}
                          {totals.dueAmount.toLocaleString("en-IN")}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-sans text-emerald-700 font-semibold">Settlement</span>
                        <span className="font-bold text-emerald-700">Fully Paid</span>
                      </>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label
                      htmlFor="billing-payment-mode"
                      className="text-xs font-semibold text-slate-700"
                    >
                      Payment Mode
                    </Label>
                    <Link
                      href="/settings?tab=payments"
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      OS Settings
                    </Link>
                  </div>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger
                      id="billing-payment-mode"
                      aria-label="Payment Mode"
                      className="h-9 bg-white text-xs font-semibold"
                    >
                      <SelectValue placeholder="Select payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentModes.map((mode) => (
                        <SelectItem key={mode} value={mode} className="text-xs font-semibold">
                          {mode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="space-y-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                {splitPayments.map((sp, idx) => (
                  <div key={sp.id} className="flex items-center gap-1.5 min-w-0">
                    <Select
                      value={sp.mode}
                      onValueChange={(mode) =>
                        onChangeSplitPayments(
                          splitPayments.map((row) =>
                            row.id === sp.id ? { ...row, mode } : row
                          )
                        )
                      }
                    >
                      <SelectTrigger className="h-9 w-[104px] sm:w-[122px] shrink-0 bg-white text-xs font-semibold px-2.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentModes.map((mode) => (
                          <SelectItem key={mode} value={mode} className="text-xs font-semibold">
                            {mode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      min={0}
                      aria-label={`Split payment amount ${idx + 1}`}
                      placeholder="0"
                      value={sp.amount}
                      onChange={(e) =>
                        onChangeSplitPayments(
                          splitPayments.map((row) =>
                            row.id === sp.id ? { ...row, amount: e.target.value } : row
                          )
                        )
                      }
                      className="h-9 flex-1 bg-white font-mono tabular-nums text-xs font-bold"
                    />

                    {totals.dueAmount > 0 && (
                      <button
                        type="button"
                        title="Add remaining balance to this row"
                        onClick={() => {
                          const currentAmt = Math.max(0, parseFloat(sp.amount) || 0);
                          const nextAmt = currentAmt + totals.dueAmount;
                          onChangeSplitPayments(
                            splitPayments.map((row) =>
                              row.id === sp.id ? { ...row, amount: String(nextAmt) } : row
                            )
                          );
                        }}
                        className="h-9 px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-semibold text-primary shrink-0 whitespace-nowrap"
                      >
                        +Bal
                      </button>
                    )}

                    {splitPayments.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove split row ${idx + 1}`}
                        onClick={() =>
                          onChangeSplitPayments(splitPayments.filter((row) => row.id !== sp.id))
                        }
                        className="h-9 w-8 shrink-0 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const usedModes = new Set(splitPayments.map((s) => s.mode));
                      const nextMode =
                        paymentModes.find((m) => !usedModes.has(m)) || paymentModes[0] || "Cash";
                      onChangeSplitPayments([
                        ...splitPayments,
                        {
                          id: `sp_${Date.now()}_${splitPayments.length}`,
                          mode: nextMode,
                          amount: totals.dueAmount > 0 ? String(totals.dueAmount) : "0",
                        },
                      ]);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Mode
                  </button>

                  <span className="text-xs font-mono tabular-nums font-bold text-slate-800">
                    Collected: {currencySymbol}
                    {totals.collected.toLocaleString("en-IN")}
                  </span>
                </div>

                {totals.finalPayout > 0 && (
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums border-t border-slate-200 pt-2">
                    {totals.changeReturn > 0 ? (
                      <>
                        <span className="font-sans text-emerald-700 font-semibold">Change to Return</span>
                        <span className="font-bold text-emerald-700">
                          {currencySymbol}
                          {totals.changeReturn.toLocaleString("en-IN")}
                        </span>
                      </>
                    ) : totals.dueAmount > 0 ? (
                      <>
                        <span className="font-sans text-red-700 font-semibold">Remaining Udhaar</span>
                        <span className="font-bold text-red-700">
                          {currencySymbol}
                          {totals.dueAmount.toLocaleString("en-IN")}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-sans text-emerald-700 font-semibold">Settlement</span>
                        <span className="font-bold text-emerald-700">Fully Paid</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Payment Note</Label>
              <Input
                value={paymentNote || ""}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="UTR, cheque ref, or delivery remark..."
                className="h-9 text-xs rounded-lg border-slate-200 bg-slate-50/70"
              />
            </div>

            {onOpenEWayModal && (
              <div
                className={cn(
                  "rounded-lg border p-3 flex items-center justify-between gap-2.5",
                  isEWayRequired && !ewayDetails?.enabled
                    ? "border-amber-300 bg-amber-50/80"
                    : ewayDetails?.enabled
                      ? "border-emerald-200 bg-emerald-50/60"
                      : "border-slate-200 bg-slate-50/70"
                )}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <Truck
                    className={cn(
                      "h-4 w-4 shrink-0 mt-0.5",
                      isEWayRequired && !ewayDetails?.enabled
                        ? "text-amber-700"
                        : ewayDetails?.enabled
                          ? "text-emerald-700"
                          : "text-slate-500"
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900">
                      {ewayDetails?.enabled
                        ? "E-Way Bill Attached"
                        : isEWayRequired
                          ? "E-Way Bill Required (>₹50k)"
                          : "Transport / E-Way Bill"}
                    </p>
                    <p className="text-[11px] text-slate-600 truncate font-mono">
                      {ewayDetails?.enabled
                        ? `${getEWayModeLabel(ewayDetails.transMode)}${
                            ewayDetails.vehicleNo ? ` · ${ewayDetails.vehicleNo}` : ""
                          }${
                            ewayDetails.transDistance && ewayDetails.transDistance !== "0"
                              ? ` · ${ewayDetails.transDistance}km`
                              : ""
                          }`
                        : isEWayRequired
                          ? "Add Part-B Vehicle / Transporter"
                          : "Optional dispatch & NIC JSON"}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onOpenEWayModal}
                  className="h-7 px-2.5 rounded-md bg-white border-slate-200 text-[11px] font-semibold text-slate-800 shrink-0 whitespace-nowrap"
                >
                  {ewayDetails?.enabled ? "Edit" : "+ Add"}
                </Button>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* PRIMARY ACTIONS */}
        <div className="space-y-2.5">
          <Button
            type="button"
            disabled={!selectedCustomerId || isSaving}
            onClick={handleSave}
            className={cn(
              "w-full h-11 rounded-lg text-sm font-bold text-white",
              isQuotation
                ? "bg-amber-600 hover:bg-amber-700"
                : isRewardSyncMode
                  ? "bg-emerald-700 hover:bg-emerald-800"
                  : "bg-primary hover:bg-primary/90"
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isQuotation ? (
              "Save Quotation"
            ) : isRewardSyncMode ? (
              "Sync Loyalty Rewards"
            ) : (
              "Complete Sale & Generate Bill"
            )}
          </Button>

          {!isRewardSyncMode && (
            <div className={cn("grid gap-2", !isQuotation && onOpenSplitBill ? "grid-cols-2" : "grid-cols-1")}>
              <Button
                type="button"
                variant="outline"
                disabled={!selectedCustomerId || isSaving}
                onClick={handleOpenPreview}
                className="w-full h-10 rounded-lg border-slate-200 text-xs font-semibold text-slate-700 whitespace-nowrap"
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Preview A4
              </Button>

              {!isQuotation && onOpenSplitBill && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving || (totals.qty === 0 && totals.finalPayout <= 0)}
                  onClick={onOpenSplitBill}
                  className="w-full h-10 rounded-lg border-slate-200 text-xs font-semibold text-slate-700 hover:text-primary whitespace-nowrap"
                >
                  <Scissors className="mr-1.5 h-3.5 w-3.5" />
                  Split Bills
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
