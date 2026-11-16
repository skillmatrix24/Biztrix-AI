"use client";

import { CreditCard, Loader2, ShieldCheck, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PaymentGateProps {
  tier: any;
  gstBreakdown: any;
  couponCode: string;
  setCouponCode: (v: string) => void;
  onApplyCoupon: () => void;
  appliedDiscount: number;
  onPay: () => void;
  isVerifyingCoupon: boolean;
  isSubmitting: boolean;
  currencySymbol: string;
  validCouponCode: string;
  onClearCoupon: () => void;
}

export function PaymentGate({
  tier,
  gstBreakdown,
  couponCode,
  setCouponCode,
  onApplyCoupon,
  appliedDiscount,
  onPay,
  isVerifyingCoupon,
  isSubmitting,
  currencySymbol,
  validCouponCode,
  onClearCoupon,
}: PaymentGateProps) {
  return (
    <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden text-left shadow-none">
      <CardHeader className="p-6 sm:p-8 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-primary shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              Checkout Summary
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Selected tier:{" "}
              <span className="font-semibold text-slate-700">{tier?.name}</span>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="promo-code-input"
              className="text-xs font-semibold text-slate-700"
            >
              Promo Code
            </Label>
            {validCouponCode && (
              <Badge className="bg-emerald-600 text-white text-xs font-medium px-2.5 h-5 border-none">
                Applied
              </Badge>
            )}
          </div>
          <div className="flex gap-2.5">
            <Input
              id="promo-code-input"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              disabled={isVerifyingCoupon || !!validCouponCode}
              placeholder="Enter promo code"
              className="h-11 rounded-xl bg-slate-50 border-slate-200 font-mono font-semibold uppercase tracking-wider"
            />
            {validCouponCode ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Remove promo code"
                className="h-11 w-11 rounded-xl border-red-200 text-red-600 hover:bg-red-50 shrink-0"
                onClick={onClearCoupon}
              >
                <X className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onApplyCoupon}
                disabled={isVerifyingCoupon || !couponCode}
                className="h-11 px-5 rounded-xl bg-primary font-semibold text-xs shrink-0"
              >
                {isVerifyingCoupon ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Apply"
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-8 bg-slate-900 text-white rounded-2xl space-y-3 text-center">
          <p className="text-xs font-medium text-slate-300">
            Total Payable (Incl. GST)
          </p>

          <div className="space-y-1.5">
            {appliedDiscount > 0 && (
              <p className="text-lg font-semibold line-through text-slate-400 font-mono tabular-nums">
                {currencySymbol}
                {(parseFloat(tier?.minSpend || 0) * 1.18).toLocaleString()}
              </p>
            )}
            <h3 className="text-4xl sm:text-5xl font-bold tracking-tight font-mono tabular-nums">
              {currencySymbol}
              {gstBreakdown?.lineTotal?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) || "0.00"}
            </h3>
            {appliedDiscount > 0 && (
              <Badge className="bg-emerald-600 text-white border-none text-xs font-medium px-3 py-0.5 mt-1">
                Saved {currencySymbol}
                {appliedDiscount.toLocaleString()}
              </Badge>
            )}
          </div>
        </div>

        <Button
          type="button"
          onClick={onPay}
          disabled={isSubmitting}
          className="w-full h-12 bg-primary hover:bg-primary/90 font-semibold text-sm rounded-xl text-white"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <ShieldCheck className="h-4 w-4 mr-2" />
          )}
          Complete & Pay Now
        </Button>
      </CardContent>
    </Card>
  );
}
