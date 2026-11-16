"use client";

import React from "react";
import { SmartphoneNfc, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ProfileCardProps {
  member: any;
  cardThemeColor: string;
  currencySymbol: string;
}

export function ProfileCard({
  member,
  cardThemeColor,
  currencySymbol,
}: ProfileCardProps) {
  const displayExpiry = React.useMemo(() => {
    if (member?.type?.toLowerCase() === "lifetime") return "Lifetime";

    const expiryData = member?.expiryDate;
    if (!expiryData) return "Active";

    try {
      const d = expiryData.toDate ? expiryData.toDate() : new Date(expiryData);
      if (d && !isNaN(d.getTime())) {
        return format(d, "dd MMM yyyy");
      }
    } catch {
      // Fallback
    }

    return "Lifetime";
  }, [member?.expiryDate, member?.type]);

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden p-6 sm:p-10 flex flex-col justify-between text-white border border-white/15"
      style={{ backgroundColor: cardThemeColor }}
    >
      <div className="flex justify-between items-start gap-4 text-left">
        <div className="space-y-2 min-w-0">
          <Badge className="bg-white/20 text-white border-none text-xs font-semibold px-3 h-6 rounded-full">
            {member?.tier || "Standard"} Tier
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight truncate">
            {member?.customerName}
          </h2>
        </div>
        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20 shrink-0 text-white">
          <SmartphoneNfc className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 sm:gap-12 mt-8 text-left">
        <div className="space-y-1">
          <p className="text-xs font-medium text-white/75">Reward Points</p>
          <p className="text-2xl sm:text-4xl font-bold font-mono tabular-nums leading-none">
            {member?.rewardPoints?.toLocaleString() || 0}{" "}
            <span className="text-xs font-semibold text-white/70">pts</span>
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-white/75">Cashback Balance</p>
          <p className="text-2xl sm:text-4xl font-bold font-mono tabular-nums leading-none">
            {currencySymbol}
            {member?.walletBalance?.toLocaleString() || 0}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-t border-white/20 pt-5 mt-8 gap-4">
        <div className="space-y-1.5 w-full sm:w-auto text-left">
          <p className="text-xs font-medium text-white/70">Member Card ID</p>
          <div className="bg-black/25 px-4 py-2 rounded-xl border border-white/15 font-mono text-sm sm:text-base font-semibold tracking-wider text-white inline-block max-w-full truncate tabular-nums">
            {member?.cardNumber?.toUpperCase() ||
              "ID-" + member?.id?.slice(-6).toUpperCase()}
          </div>
        </div>
        <div className="text-left sm:text-right space-y-1">
          <p className="text-xs font-medium text-white/70">Valid Until</p>
          <div className="flex items-center gap-2 justify-start sm:justify-end text-white">
            <Clock className="h-4 w-4 text-white/75" />
            <p className="text-sm sm:text-lg font-bold font-mono tabular-nums">
              {displayExpiry}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
