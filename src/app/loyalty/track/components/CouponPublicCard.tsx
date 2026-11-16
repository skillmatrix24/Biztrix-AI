"use client";

import React, { useMemo } from "react";
import { Tag, Clock, BadgeCheck, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const THEME_STYLES: Record<string, string> = {
  blue: "bg-gradient-to-br from-blue-600 to-indigo-800",
  purple: "bg-gradient-to-br from-purple-600 to-pink-700",
  orange: "bg-gradient-to-br from-orange-500 to-red-600",
  green: "bg-gradient-to-br from-emerald-600 to-teal-800",
  black: "bg-gradient-to-br from-slate-800 to-slate-950",
  red: "bg-gradient-to-br from-red-600 to-rose-900",
  gold: "bg-gradient-to-br from-amber-500 to-amber-700",
  cyan: "bg-gradient-to-br from-cyan-600 to-blue-800",
  rose: "bg-gradient-to-br from-rose-500 to-pink-700",
  indigo: "bg-gradient-to-br from-indigo-800 to-slate-900",
};

interface CouponPublicCardProps {
  data: any;
  business: any;
  currencySymbol: string;
  member: any;
  activities: any[];
  onClick?: () => void;
  hideInspectButton?: boolean;
}

export function CouponPublicCard({
  data,
  business,
  currencySymbol,
  member,
  activities,
  onClick,
  hideInspectButton = false,
}: CouponPublicCardProps) {
  const themeClass = THEME_STYLES[data.theme || "blue"] || THEME_STYLES.blue;
  const redemptionCount = (activities || []).filter(
    (a: any) => a.type === "coupon_redeem" && a.couponId === data.id
  ).length;
  const isUsed = redemptionCount >= (data.perUserLimit || 1);

  const displayExpiry = useMemo(() => {
    const rawDate = data.expiryDate || member?.expiryDate;
    if (!rawDate || rawDate === "LIFETIME") return "Lifetime";

    try {
      const d = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
      if (d && !isNaN(d.getTime())) {
        return format(d, "dd MMM yyyy");
      }
    } catch {
      // Fallback to Lifetime if unparseable
    }

    return "Lifetime";
  }, [data.expiryDate, member?.expiryDate]);

  const usageLabel = `${data.usageCount || 0} / ${data.usageLimit || "∞"}`;
  const groupName =
    business?.offerGroups?.find((g: any) => g.id === data.groupId)?.name ||
    "Member Offer";

  return (
    <Card
      className={cn(
        "border border-slate-200 bg-white rounded-2xl overflow-hidden flex flex-col h-full text-left shadow-none transition-colors",
        isUsed ? "opacity-65" : "hover:border-slate-300"
      )}
    >
      <div
        className={cn(
          "p-6 relative text-white min-h-[148px] flex justify-between items-stretch gap-3",
          themeClass
        )}
      >
        <div className="flex-1 min-w-0 pr-3 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-white/75 mb-2">
            <Tag className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-medium truncate">{groupName}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-wider leading-none truncate font-mono">
            {data.code || "CODE"}
          </h3>
          <p className="text-sm font-semibold text-white/90 mt-2.5">
            {data.type === "percentage"
              ? `${data.value}% Off`
              : data.type === "bogo"
                ? data.value
                : `${currencySymbol}${data.value} Flat Off`}
          </p>
        </div>

        <div className="w-[34%] flex flex-col items-center justify-between py-1 pl-3 border-l border-dashed border-white/30 shrink-0 text-center">
          <div>
            <p className="text-[11px] font-medium text-white/70">Claims</p>
            <p className="text-xs font-semibold text-white font-mono tabular-nums mt-0.5">
              {usageLabel}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-black/20 border border-white/15 flex items-center justify-center text-sm font-bold text-white shrink-0">
            {business?.name?.charAt(0) || "B"}
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-5 bg-white text-left flex-1 flex flex-col justify-between">
        <div className="flex justify-between items-center gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">Min Spend</p>
            <p className="text-lg font-bold text-slate-900 font-mono tabular-nums leading-none">
              {currencySymbol}
              {data.minOrder || 0}
            </p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs font-medium text-slate-500">My Usage</p>
            <p
              className={cn(
                "text-base font-bold font-mono tabular-nums leading-none",
                isUsed ? "text-emerald-700" : "text-primary"
              )}
            >
              {redemptionCount} / {data.perUserLimit || 1}
            </p>
          </div>
        </div>

        {!hideInspectButton && (
          <Button
            type="button"
            disabled={isUsed}
            onClick={onClick}
            variant="outline"
            className={cn(
              "w-full h-11 rounded-xl font-semibold text-xs border transition-colors",
              isUsed
                ? "bg-slate-50 border-slate-200 text-slate-500"
                : "border-slate-300 text-primary hover:bg-primary/5"
            )}
          >
            {isUsed ? (
              <BadgeCheck className="h-4 w-4 mr-2 text-emerald-600" />
            ) : (
              <Info className="h-4 w-4 mr-2" />
            )}
            {isUsed ? "Claimed & Used" : "Inspect Reward"}
          </Button>
        )}

        <div className="space-y-4">
          <Separator className="bg-slate-100" />
          <div className="flex justify-between items-center text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="font-medium text-slate-700 font-mono tabular-nums">
                {displayExpiry}
              </span>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-medium rounded-full px-2.5 py-0.5",
                isUsed
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-slate-50 border-slate-200 text-primary"
              )}
            >
              {isUsed ? "Redeemed" : "Active"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
