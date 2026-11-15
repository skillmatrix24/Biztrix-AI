"use client";

import { AlertCircle, BadgeCheck, Check, Link2, Lock, Sparkles, X } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const THEMES: Record<string, { class: string }> = {
  blue: { class: "bg-gradient-to-br from-blue-600 to-indigo-800" },
  purple: { class: "bg-gradient-to-br from-purple-600 to-pink-700" },
  orange: { class: "bg-gradient-to-br from-orange-500 to-red-600" },
  green: { class: "bg-gradient-to-br from-emerald-500 to-teal-700" },
  black: { class: "bg-gradient-to-br from-slate-800 to-slate-950" },
  red: { class: "bg-gradient-to-br from-red-600 to-rose-900" },
  gold: { class: "bg-gradient-to-br from-amber-500 to-yellow-700" },
  cyan: { class: "bg-gradient-to-br from-cyan-600 to-blue-700" },
  rose: { class: "bg-gradient-to-br from-rose-500 to-pink-700" },
  indigo: { class: "bg-gradient-to-br from-indigo-900 to-slate-900" },
};

interface RewardCardsSectionProps {
  memberCoupons: any[];
  appliedCoupons: any[];
  grossSubtotal: number;
  handleApplyCoupon: (code: string) => void;
  activities?: any[];
  currencySymbol?: string;
}

export function RewardCardsSection({
  memberCoupons,
  appliedCoupons,
  grossSubtotal,
  handleApplyCoupon,
  activities = [],
  currencySymbol = "₹",
}: RewardCardsSectionProps) {
  if (!memberCoupons || memberCoupons.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-sm font-bold text-slate-900">Available Loyalty Rewards</h3>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-500">
          {memberCoupons.length} active offer{memberCoupons.length === 1 ? "" : "s"}
        </span>
      </div>

      <ScrollArea className="w-full whitespace-nowrap pb-2">
        <div className="flex gap-3.5">
          {memberCoupons.map((coupon: any) => {
            const isApplied = appliedCoupons.some((c) => c.id === coupon.id);
            const redemptionCount = (activities || []).filter(
              (a: any) =>
                a.type === "coupon_redeem" &&
                (a.couponId === coupon.id || a.couponCode === coupon.code)
            ).length;
            const isUserLimitReached = redemptionCount >= (coupon.perUserLimit || 1);
            const isGlobalLimitReached =
              coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit;
            const isEligible =
              grossSubtotal >= (coupon.minOrder || 0) &&
              !isGlobalLimitReached &&
              !isUserLimitReached;
            const theme = THEMES[coupon.theme || "blue"] || THEMES.blue;

            return (
              <button
                key={coupon.id}
                type="button"
                onClick={() =>
                  !isGlobalLimitReached && !isUserLimitReached && handleApplyCoupon(coupon.code)
                }
                disabled={isGlobalLimitReached || isUserLimitReached}
                className={cn(
                  "flex flex-col rounded-xl overflow-hidden border transition-all min-w-[240px] max-w-[240px] text-left shrink-0 bg-white",
                  isApplied
                    ? "ring-2 ring-emerald-600 border-emerald-600"
                    : isGlobalLimitReached || isUserLimitReached
                      ? "opacity-50 grayscale cursor-not-allowed border-slate-200"
                      : !isEligible
                        ? "opacity-75 border-slate-200 cursor-not-allowed"
                        : "border-slate-200 hover:border-primary"
                )}
              >
                <div className={cn("p-4 text-white relative", theme.class)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-white/80">
                        {coupon.category || "Member Reward"}
                      </p>
                      <h4 className="text-base font-bold font-mono tracking-wide truncate mt-0.5">
                        {coupon.code}
                      </h4>
                    </div>
                    {isApplied && (
                      <span className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Check className="h-3.5 w-3.5 stroke-[3px]" />
                      </span>
                    )}
                    {(isGlobalLimitReached || isUserLimitReached) && (
                      <span className="h-6 w-6 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white mt-2">
                    {coupon.type === "percentage"
                      ? `${coupon.value}% OFF`
                      : coupon.type === "bogo"
                        ? coupon.value
                        : `${currencySymbol}${coupon.value} OFF`}
                  </p>
                </div>

                <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-mono tabular-nums">
                      Min: {currencySymbol}
                      {(coupon.minOrder || 0).toLocaleString("en-IN")}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                      {coupon.isStackable ? (
                        <Link2 className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Lock className="h-3 w-3 text-slate-400" />
                      )}
                      {coupon.isStackable ? "Stackable" : "Exclusive"}
                    </span>
                  </div>

                  <div className="text-xs font-semibold">
                    {isUserLimitReached ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <BadgeCheck className="h-3.5 w-3.5" /> Already used
                      </span>
                    ) : isGlobalLimitReached ? (
                      <span className="inline-flex items-center gap-1 text-red-700">
                        <AlertCircle className="h-3.5 w-3.5" /> Campaign limit reached
                      </span>
                    ) : isApplied ? (
                      <span className="text-emerald-700">Applied · Click to remove</span>
                    ) : isEligible ? (
                      <span className="text-primary">Click to apply</span>
                    ) : (
                      <span className="text-amber-700 font-mono tabular-nums">
                        Add {currencySymbol}
                        {Math.ceil((coupon.minOrder || 0) - grossSubtotal).toLocaleString("en-IN")}{" "}
                        more
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}
