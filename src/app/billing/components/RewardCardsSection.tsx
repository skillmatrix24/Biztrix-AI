
"use client";

import { useMemo } from "react";
import { 
  Sparkles, 
  Check, 
  AlertCircle, 
  X, 
  Tag,
  BadgeCheck,
  Clock,
  Link2,
  Lock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const THEMES: Record<string, { label: string, class: string, accent: string }> = {
  blue: { label: 'Indigo Night', class: 'bg-gradient-to-br from-blue-600 to-indigo-800', accent: 'text-blue-100' },
  purple: { label: 'Royal Purple', class: 'bg-gradient-to-br from-purple-600 to-pink-700', accent: 'text-purple-100' },
  orange: { label: 'Sunset Glow', class: 'bg-gradient-to-br from-orange-500 to-red-600', accent: 'text-orange-100' },
  green: { label: 'Emerald Forest', class: 'bg-gradient-to-br from-emerald-500 to-teal-700', accent: 'text-emerald-100' },
  black: { label: 'Carbon Black', class: 'bg-gradient-to-br from-slate-800 to-black', accent: 'text-slate-300' },
  red: { label: 'Crimson Fire', class: 'bg-gradient-to-br from-red-600 to-rose-900', accent: 'text-red-100' },
  gold: { label: 'Golden Luxury', class: 'bg-gradient-to-br from-amber-400 via-amber-600 to-yellow-800', accent: 'text-yellow-100' },
  cyan: { label: 'Ocean Cyan', class: 'bg-gradient-to-br from-cyan-500 to-blue-700', accent: 'text-cyan-100' },
  rose: { label: 'Rose Quartz', class: 'bg-gradient-to-br from-rose-400 to-pink-600', accent: 'text-rose-100' },
  indigo: { label: 'Deep Space', class: 'bg-gradient-to-br from-indigo-900 to-slate-900', accent: 'text-indigo-200' },
};

interface RewardCardsSectionProps {
  memberCoupons: any[];
  appliedCoupons: any[];
  grossSubtotal: number;
  handleApplyCoupon: (code: string) => void;
  activities?: any[];
}

export function RewardCardsSection({ 
  memberCoupons, 
  appliedCoupons, 
  grossSubtotal, 
  handleApplyCoupon, 
  activities = []
}: RewardCardsSectionProps) {
  if (!memberCoupons || memberCoupons.length === 0) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 w-full text-left">
      <div className="flex items-center justify-between px-2 text-left">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h4 className="text-xs font-black uppercase text-primary tracking-widest leading-none">Applicable Reward Cards</h4>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[8px] font-black h-5 px-2 uppercase">{memberCoupons.length} Nodes Found</Badge>
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap pb-4">
        <div className="flex gap-6 px-1">
            {memberCoupons.map((coupon: any) => {
              const isApplied = appliedCoupons.some(c => c.id === coupon.id);
              
              // 1. INDIVIDUAL USAGE LOGIC
              const redemptionCount = (activities || []).filter((a: any) => 
                a.type === 'coupon_redeem' && (a.couponId === coupon.id || a.couponCode === coupon.code)
              ).length;
              const isUserLimitReached = redemptionCount >= (coupon.perUserLimit || 1);
              
              // 2. GLOBAL USAGE LOGIC
              const isGlobalLimitReached = (coupon.usageLimit > 0) && (coupon.usageCount >= coupon.usageLimit);
              
              // 3. ELIGIBILITY
              const isEligible = (grossSubtotal >= (coupon.minOrder || 0)) && !isGlobalLimitReached && !isUserLimitReached;
              
              const theme = THEMES[coupon.theme || 'blue'] || THEMES.blue;
              const style = coupon.cardStyle || 'ticket';

              return (
                <button 
                  key={coupon.id} 
                  onClick={() => !isGlobalLimitReached && !isUserLimitReached && handleApplyCoupon(coupon.code)}
                  disabled={isGlobalLimitReached || isUserLimitReached}
                  className={cn(
                    "flex flex-col rounded-[2rem] overflow-hidden border-2 transition-all duration-500 min-w-[280px] max-w-[280px] text-left shrink-0 shadow-xl relative",
                    isApplied 
                      ? "ring-4 ring-green-500 scale-95" 
                      : (isGlobalLimitReached || isUserLimitReached)
                        ? "opacity-40 grayscale cursor-not-allowed border-muted"
                        : !isEligible 
                          ? "opacity-40 grayscale-[0.5] border-transparent cursor-not-allowed"
                          : "hover:scale-105 hover:shadow-2xl border-primary"
                  )}
                >
                  <div className={cn("p-6 text-white relative h-[140px] flex flex-col justify-center text-left", theme.class)}>
                    <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '12px 12px' }} />
                    <div className="relative z-10 text-left">
                      <p className="text-[8px] font-black uppercase opacity-60 tracking-[0.2em] mb-1">{coupon.category || 'REWARD'}</p>
                      <h5 className="text-xl font-black tracking-widest truncate uppercase leading-none">{coupon.code}</h5>
                      <p className="text-[10px] font-bold text-accent uppercase mt-3">
                        {coupon.type === 'percentage' ? `${coupon.value}% OFF` : coupon.type === 'bogo' ? coupon.value : `₹${coupon.value} FLAT`}
                      </p>
                    </div>
                    
                    {isApplied && (
                      <div className="absolute top-4 right-4 h-6 w-6 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg animate-in zoom-in">
                        <Check className="h-4 w-4 stroke-[4px]" />
                      </div>
                    )}
                    {(isGlobalLimitReached || isUserLimitReached) && (
                      <div className="absolute top-4 right-4 bg-red-600 text-white p-1 rounded-md shadow-lg animate-in zoom-in">
                         <X className="h-4 w-4 stroke-[3px]" />
                      </div>
                    )}
                    
                    {style === 'ticket' && (
                      <>
                        <div className="absolute -top-3 right-[32%] -translate-x-1/2 h-6 w-6 bg-slate-50 rounded-full z-20 shadow-inner" />
                        <div className="absolute -bottom-3 right-[32%] -translate-x-1/2 h-6 w-6 bg-white rounded-full z-20 shadow-inner" />
                      </>
                    )}
                  </div>
                  
                  <div className="p-6 bg-white space-y-4 flex-1 flex flex-col justify-between text-left">
                      <div className="flex justify-between items-center text-left">
                        <div className="space-y-0.5 text-left">
                            <p className="text-[7px] font-black text-muted-foreground uppercase">Min Order</p>
                            <p className="text-sm font-black text-slate-900">₹{(coupon.minOrder || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-right space-y-0.5">
                            <p className="text-[7px] font-black text-muted-foreground uppercase">Usage Node</p>
                            <Badge variant={coupon.isStackable ? "secondary" : "outline"} className={cn("text-[7px] font-black h-4 px-1.5 border-none", coupon.isStackable ? "bg-green-50 text-green-700" : "bg-muted text-slate-400")}>
                               {coupon.isStackable ? <Link2 className="h-2 w-2 mr-1" /> : <Lock className="h-2 w-2 mr-1" />}
                               {coupon.isStackable ? 'STACKABLE' : 'EXCLUSIVE'}
                            </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-left">
                        <Badge variant="outline" className="text-[6px] font-bold h-4 border-none opacity-40 uppercase">Global: {coupon.usageCount || 0}/{coupon.usageLimit || '∞'}</Badge>
                      </div>

                      {isUserLimitReached ? (
                        <Badge className="bg-green-50 text-green-600 border-none text-[8px] font-black h-6 px-3 uppercase w-full justify-center gap-1.5">
                           <BadgeCheck className="h-3 w-3" /> ALREADY USED
                        </Badge>
                      ) : isGlobalLimitReached ? (
                        <Badge className="bg-red-50 text-red-600 border-none text-[8px] font-black h-6 px-3 uppercase w-full justify-center gap-1.5">
                           <AlertCircle className="h-3 w-3" /> LIMIT EXHAUSTED
                        </Badge>
                      ) : isApplied ? (
                        <Badge className="bg-green-100 text-green-700 border-none text-[8px] font-black h-6 px-3 uppercase w-full justify-center">UNSELECT TO REMOVE</Badge>
                      ) : isEligible ? (
                        <Badge className="bg-green-500 text-white border-none text-[8px] font-black h-6 px-3 uppercase animate-pulse w-full justify-center">TAP TO REDEEM</Badge>
                      ) : (
                        <p className="text-[8px] font-black text-red-500 uppercase text-center bg-red-50 p-1.5 rounded-lg border border-red-100">Add ₹{(coupon.minOrder - grossSubtotal).toLocaleString()} more</p>
                      )}
                  </div>
                </button>
              );
            })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
