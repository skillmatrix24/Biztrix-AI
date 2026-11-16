"use client";

import React from "react";
import { Gem, Ticket, Handshake, Zap, Gift, Calendar, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionCard, EmptyStatePanel } from "@/components/ui/editorial";
import { cn } from "@/lib/utils";

interface HistoryTabProps {
  activities: any[];
  currencySymbol: string;
}

function formatActivityTitle(raw?: string) {
  if (!raw) return "Activity";
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function HistoryTab({ activities, currencySymbol }: HistoryTabProps) {
  return (
    <div className="text-left">
      <SectionCard
        title="Points & Cashback Ledger"
        description="Chronological record of rewards earned, bonus credits, and redemptions."
        bodyClassName="p-0"
      >
        {!activities || activities.length === 0 ? (
          <div className="p-6">
            <EmptyStatePanel
              icon={History}
              title="No Activity Logged Yet"
              description="Points earned from visits, referrals, and redemptions will appear here."
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {activities.map((a: any) => (
              <div
                key={a.id}
                className="p-5 sm:p-6 space-y-3 hover:bg-slate-50/70 transition-colors text-left"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={cn(
                        "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border",
                        a.type === "purchase_reward"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : a.type === "coupon_redeem"
                            ? "bg-orange-50 border-orange-200 text-orange-700"
                            : "bg-slate-50 border-slate-200 text-primary"
                      )}
                    >
                      {a.type === "purchase_reward" ? (
                        <Gem className="h-5 w-5" />
                      ) : a.type === "coupon_redeem" ? (
                        <Ticket className="h-5 w-5" />
                      ) : a.type === "referral_bonus" ? (
                        <Handshake className="h-5 w-5" />
                      ) : a.type === "profile_bonus" ? (
                        <Zap className="h-5 w-5" />
                      ) : (
                        <Gift className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-bold text-slate-900 truncate">
                        {formatActivityTitle(a.type)}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-mono tabular-nums">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(a.timestamp).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    {a.points > 0 && (
                      <p className="text-base sm:text-lg font-bold text-primary font-mono tabular-nums">
                        +{a.points?.toLocaleString()}{" "}
                        <span className="text-xs font-medium text-slate-500">
                          pts
                        </span>
                      </p>
                    )}
                    {a.cashback > 0 && (
                      <p className="text-sm font-bold text-emerald-700 font-mono tabular-nums">
                        +{currencySymbol}
                        {a.cashback?.toLocaleString()}{" "}
                        <span className="text-xs font-medium text-slate-500">
                          cashback
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {(a.invoiceValue > 0 || a.couponCode || a.description) && (
                  <div className="pl-15 flex flex-wrap gap-x-6 gap-y-2 pt-1">
                    {a.invoiceValue > 0 && (
                      <div>
                        <p className="text-xs text-slate-500">Bill Value</p>
                        <p className="text-xs font-semibold text-slate-800 font-mono tabular-nums">
                          {currencySymbol}
                          {a.invoiceValue.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {a.couponCode && (
                      <div>
                        <p className="text-xs text-slate-500">Coupon Used</p>
                        <Badge
                          variant="outline"
                          className="mt-0.5 text-xs font-mono font-semibold bg-orange-50 border-orange-200 text-orange-700"
                        >
                          {a.couponCode}
                        </Badge>
                      </div>
                    )}
                    {a.description && (
                      <div className="w-full pt-1">
                        <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                          {a.description}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
