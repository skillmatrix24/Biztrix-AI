"use client";

import React from "react";
import { Star, Zap, Gift, Flame, Ticket, Gem, Grid, Layout } from "lucide-react";
import { EmptyStatePanel } from "@/components/ui/editorial";
import { CouponPublicCard } from "./CouponPublicCard";

const GROUP_ICONS: Record<string, any> = {
  Star,
  Zap,
  Gift,
  Flame,
  Ticket,
  Gem,
  Grid,
  Layout,
};

interface RewardsTabProps {
  bundledCoupons: any[];
  groupedCoupons: Record<string, any[]>;
  offerGroups: any[];
  business: any;
  currencySymbol: string;
  member: any;
  activities: any[];
  onInspect: (coupon: any) => void;
}

export function RewardsTab({
  bundledCoupons,
  groupedCoupons,
  offerGroups,
  business,
  currencySymbol,
  member,
  activities,
  onInspect,
}: RewardsTabProps) {
  if (!bundledCoupons || bundledCoupons.length === 0) {
    return (
      <EmptyStatePanel
        icon={Ticket}
        title="No Exclusive Rewards Available"
        description="No coupon offers are currently linked to your membership tier."
      />
    );
  }

  return (
    <div className="space-y-10 text-left">
      {Object.keys(groupedCoupons).length > 0 && offerGroups.length > 0 ? (
        offerGroups.map((group: any) => {
          const groupCoupons = groupedCoupons[group.id];
          if (!groupCoupons || groupCoupons.length === 0) return null;
          const IconComp = GROUP_ICONS[group.icon] || Star;
          return (
            <div key={group.id} className="space-y-5 text-left">
              <div className="flex items-center gap-3.5 text-left">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary shrink-0 border border-slate-200">
                  <IconComp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-none">
                    {group.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                    {groupCoupons.length} curated offer
                    {groupCoupons.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupCoupons.map((c: any) => (
                  <CouponPublicCard
                    key={c.id}
                    data={c}
                    business={business}
                    currencySymbol={currencySymbol}
                    member={member}
                    activities={activities}
                    onClick={() => onInspect(c)}
                  />
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bundledCoupons.map((c: any) => (
            <CouponPublicCard
              key={c.id}
              data={c}
              business={business}
              currencySymbol={currencySymbol}
              member={member}
              activities={activities}
              onClick={() => onInspect(c)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
