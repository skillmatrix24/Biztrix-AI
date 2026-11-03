
"use client";

import { CreditCard, Zap, Ticket, Loader2, ShieldCheck, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  tier, gstBreakdown, couponCode, setCouponCode, onApplyCoupon, 
  appliedDiscount, onPay, isVerifyingCoupon, isSubmitting, currencySymbol,
  validCouponCode, onClearCoupon
}: PaymentGateProps) {
  return (
    <Card className="border-none shadow-xl bg-white rounded-[3rem] overflow-hidden border animate-in slide-in-from-right-10 duration-500 mx-2 text-left">
      <CardHeader className="p-8 sm:p-12 pb-0">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-inner">
            <CreditCard className="h-7 w-7" />
          </div>
          <div className="text-left">
            <h3 className="text-base sm:text-xl font-black uppercase tracking-[0.3em] text-slate-900 leading-none">Checkout Summary</h3>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-2">Selected: {tier?.name} Node</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 sm:p-12 space-y-10">
          <div className="space-y-6">
             <div className="flex items-center justify-between px-1">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Apply Promo Code</Label>
                {validCouponCode && <Badge className="bg-green-500 text-white text-[8px] font-black h-4 px-2 uppercase">Node Active</Badge>}
             </div>
             <div className="flex gap-3">
                <Input 
                  value={couponCode} 
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())} 
                  disabled={isVerifyingCoupon || !!validCouponCode}
                  placeholder="CODE" 
                  className="h-12 rounded-xl bg-muted/20 border-none shadow-inner font-black uppercase tracking-widest text-center" 
                />
                {validCouponCode ? (
                  <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-red-200 text-red-500" onClick={onClearCoupon}>
                     <X className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button onClick={onApplyCoupon} disabled={isVerifyingCoupon || !couponCode} className="h-12 px-6 rounded-xl bg-primary font-black uppercase text-[10px]">
                     {isVerifyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                  </Button>
                )}
             </div>
          </div>

          <div className="p-10 sm:p-16 bg-slate-900 text-white rounded-[3rem] space-y-6 relative overflow-hidden shadow-2xl text-center">
             <div className="absolute top-0 right-0 p-4 opacity-5"><Zap className="h-60 w-60" /></div>
             <p className="text-[11px] text-accent font-black uppercase tracking-[0.5em] relative z-10">Total Pay Node</p>
             
             <div className="space-y-2 relative z-10">
                {appliedDiscount > 0 && (
                  <div className="flex items-center justify-center gap-3 opacity-40">
                     <p className="text-2xl font-black line-through">{currencySymbol}{(parseFloat(tier?.minSpend || 0) * 1.18).toLocaleString()}</p>
                  </div>
                )}
                <h3 className="text-5xl sm:text-8xl font-black tracking-tighter">{currencySymbol}{gstBreakdown?.lineTotal.toLocaleString() || '0'}</h3>
                {appliedDiscount > 0 && (
                   <Badge className="bg-green-500 text-white border-none text-[8px] font-black h-5 px-2 uppercase animate-bounce">SAVED {currencySymbol}{appliedDiscount.toLocaleString()}</Badge>
                )}
             </div>
          </div>

          <Button 
            onClick={onPay} 
            disabled={isSubmitting} 
            className="w-full h-16 sm:h-24 bg-primary hover:bg-primary/90 font-black uppercase text-sm sm:text-base tracking-[0.3em] rounded-2xl sm:rounded-[2.5rem] shadow-2xl active:scale-95 transition-all text-white"
          >
            {isSubmitting ? <Loader2 className="h-8 w-8 animate-spin mr-3" /> : <ShieldCheck className="h-8 w-8 mr-3" />}
            Finalize & Pay
          </Button>
      </CardContent>
    </Card>
  );
}
