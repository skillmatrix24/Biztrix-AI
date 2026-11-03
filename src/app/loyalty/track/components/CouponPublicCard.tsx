
"use client";

import React, { useMemo } from "react";
import { 
  Ticket, 
  Tag, 
  Clock, 
  BadgeCheck, 
  Info 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const THEME_STYLES: Record<string, string> = {
  blue: 'bg-gradient-to-br from-blue-600 to-indigo-800',
  purple: 'bg-gradient-to-br from-purple-600 to-pink-700',
  orange: 'bg-gradient-to-br from-orange-500 to-red-600',
  green: 'bg-gradient-to-br from-emerald-500 to-teal-700',
  black: 'bg-gradient-to-br from-slate-800 to-black',
  red: 'bg-gradient-to-br from-red-600 to-rose-900',
  gold: 'bg-gradient-to-br from-amber-400 via-amber-600 to-yellow-800',
  cyan: 'bg-gradient-to-br from-cyan-500 to-blue-700',
  rose: 'bg-gradient-to-br from-rose-400 to-pink-600',
  indigo: 'bg-gradient-to-br from-indigo-900 to-slate-900',
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
  hideInspectButton = false 
}: CouponPublicCardProps) {
  const themeClass = THEME_STYLES[data.theme || 'blue'] || THEME_STYLES.blue;
  const redemptionCount = (activities || []).filter((a: any) => a.type === 'coupon_redeem' && a.couponId === data.id).length;
  const isUsed = redemptionCount >= (data.perUserLimit || 1);

  const displayExpiry = useMemo(() => {
    // If the coupon itself has an expiry, use it. 
    // Otherwise use the membership's expiry as bundled rewards are tied to membership duration.
    const rawDate = data.expiryDate || member?.expiryDate;
    
    if (!rawDate || rawDate === 'LIFETIME') return 'LIFETIME';

    try {
      const d = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
      if (d && !isNaN(d.getTime())) {
        return format(d, 'dd MMM yyyy');
      }
    } catch (e) {
    console.error(e);
      console.warn("Date parsing error in Coupon Card");
    }
    
    return 'LIFETIME';
  }, [data.expiryDate, member?.expiryDate]);

  const renderTopContent = () => {
    const usageLabel = `${data.usageCount || 0} / ${data.usageLimit || '∞'}`;
    return (
      <div className="flex justify-between relative z-10 h-full min-h-[110px] text-left">
        <div className="flex-1 min-w-0 pr-4 flex flex-col justify-center text-left">
          <div className="flex items-center gap-1.5 opacity-60 mb-2 sm:mb-3 text-left">
            <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.25em] truncate text-left">
              {business?.offerGroups?.find((g: any) => g.id === data.groupId)?.name || 'REWARD NODE'}
            </span>
          </div>
          <h3 className="text-xl sm:text-3xl font-black tracking-widest leading-none truncate drop-shadow-2xl text-left">{data.code || 'CODE'}</h3>
          <p className="text-[9px] sm:text-[13px] font-bold text-accent italic uppercase mt-3 sm:mt-4 text-left">
            {data.type === 'percentage' ? `${data.value}% OFF` : data.type === 'bogo' ? data.value : `${currencySymbol}${data.value} FLAT`}
          </p>
        </div>
        <div className="w-[34%] flex flex-col items-center justify-between py-1.5 sm:py-2 pl-2 sm:pl-3 border-l-2 border-dashed border-white/30 shrink-0 text-center">
          <div className="text-center">
            <p className="text-[6px] sm:text-[8px] font-black uppercase opacity-60 tracking-tighter text-center">GLOBAL LOG</p>
            <p className="text-[10px] sm:text-[12px] font-black text-white text-center leading-none mt-0.5 sm:mt-1">
              {usageLabel}
            </p>
          </div>
          <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-xs sm:text-[14px] font-black text-white shadow-inner shrink-0 mx-auto">
            {business?.name?.charAt(0) || 'B'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={cn(
      "border-none shadow-2xl bg-white rounded-[2rem] sm:rounded-[3rem] overflow-hidden border group relative transition-all duration-700 flex flex-col h-full text-left",
      isUsed ? "opacity-60 grayscale-[0.5]" : "hover:scale-[1.05] hover:shadow-primary/20"
    )}>
      <div className={cn("p-6 sm:p-10 relative text-white min-h-[160px] sm:min-h-[180px]", themeClass)}>
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '15px 15px' }} />
        <div className="absolute -top-4 right-[34%] -translate-x-1/2 h-8 w-8 bg-slate-50 rounded-full z-20 shadow-inner" />
        <div className="absolute -bottom-4 right-[34%] -translate-x-1/2 h-8 w-8 bg-white rounded-full z-20 shadow-inner" />
        {renderTopContent()}
      </div>
      <CardContent className="p-6 sm:p-10 space-y-6 sm:space-y-8 bg-white relative z-20 text-left flex-1">
        <div className="flex justify-between items-center text-left">
          <div className="space-y-1 text-left">
            <p className="text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-widest text-left leading-none">MIN SPEND</p>
            <p className="text-lg sm:text-2xl font-black text-slate-900 text-left leading-none">{currencySymbol}{data.minOrder || 0}</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-widest text-right leading-none">MY USAGE</p>
            <p className={cn("text-xs sm:text-lg font-black uppercase text-right leading-none", isUsed ? "text-green-600" : "text-primary")}>
              {redemptionCount} / {data.perUserLimit || 1}
            </p>
          </div>
        </div>
        
        {!hideInspectButton && (
          <Button 
            disabled={isUsed}
            onClick={onClick}
            variant="ghost" 
            className={cn(
              "w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-[0.2em] border-2 border-dashed transition-all duration-300",
              isUsed ? "bg-slate-50 border-slate-200 text-slate-400" : "border-primary/20 text-primary hover:bg-primary/5 shadow-sm"
            )}
          >
            {isUsed ? <BadgeCheck className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-green-600" /> : <Info className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />} 
            {isUsed ? 'CLAIMED & USED' : 'INSPECT REWARD'}
          </Button>
        )}

        <Separator className="opacity-40" />

        <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 text-left">
           <div className="flex items-center gap-2 sm:gap-3 text-left">
             <Clock className="h-4 w-4 sm:h-5 sm:w-5 opacity-40" />
             <span className="text-primary font-black text-left">{displayExpiry}</span>
           </div>
           <Badge variant="outline" className={cn("text-[7px] sm:text-[8px] h-4 sm:h-5 px-2 sm:px-3 border-primary/20 uppercase font-black tracking-widest rounded-full", isUsed ? "bg-green-100 text-green-700" : "bg-primary/5 text-primary")}>
              {isUsed ? 'REDEEMED' : 'AUTHORIZED'}
           </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
