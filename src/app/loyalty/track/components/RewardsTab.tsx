"use client";

import React from "react";
import { Star, Zap, Gift, Flame, Ticket, Gem, Grid, Layout } from "lucide-react";
import { CouponPublicCard } from "./CouponPublicCard";

const GROUP_ICONS: Record<string, any> = {
  Star, Zap, Gift, Flame, Ticket, Gem, Grid, Layout
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
  onInspect 
}: RewardsTabProps) {
  if (!bundledCoupons || bundledCoupons.length === 0) {
    return (
      <div className="p-20 text-center border-2 border-dashed rounded-[3rem] opacity-30 italic text-sm font-black uppercase">
        No exclusive rewards currently linked to your tier.
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in text-left">
      {Object.keys(groupedCoupons).length > 0 ? (
        offerGroups.map((group: any) => {
          const groupCoupons = groupedCoupons[group.id];
          if (!groupCoupons || groupCoupons.length === 0) return null;
          const IconComp = GROUP_ICONS[group.icon] || Star;
          return (
            <div key={group.id} className="col-span-full space-y-8 text-left">
              <div className="flex items-center gap-4 text-left px-2">
                <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0 border border-primary/10 shadow-inner">
                  <IconComp className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 leading-none">{group.name}</h3>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5">{groupCoupons.length} Curated Offers</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-12">
                {groupCoupons.map((c: any) => (
                  <div key={c.id} onClick={() => onInspect(c)} className="cursor-pointer">
                    <CouponPublicCard data={c} business={business} currencySymbol={currencySymbol} member={member} activities={activities} />
                  </div>
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-12">
          {bundledCoupons.map((c: any) => (
            <div key={c.id} onClick={() => onInspect(c)} className="cursor-pointer h-full">
              <CouponPublicCard data={c} business={business} currencySymbol={currencySymbol} member={member} activities={activities} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
