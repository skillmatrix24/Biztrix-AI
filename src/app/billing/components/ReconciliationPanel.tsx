
"use client";

import { useState } from "react";
import { Wallet, Sparkles, Bot, DollarSign, Banknote, ShieldCheck, Eye, Receipt, Banknote as BanknoteIcon, Loader2, MessageSquare, Percent, Edit2, Check, X, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ReconciliationPanelProps {
  selectedCustomerId: string;
  bestOffer: any;
  totals: any;
  manualAmount: string;
  setManualAmount: (v: string) => void;
  manualOverrideReason: string;
  setManualOverrideReason: (v: string) => void;
  manualGstRate: string;
  setManualGstRate: (v: string) => void;
  exemptAmount: string;
  setExemptAmount: (v: string) => void;
  advanceAmount: string;
  setAdvanceAmount: (v: string) => void;
  manualDiscount: number;
  setManualDiscount: (v: number) => void;
  couponCode: string;
  setCouponCode: (v: string) => void;
  handleApplyCoupon: (code?: string) => void;
  currencySymbol: string;
  isQuotation: boolean;
  paidAmount: string;
  setPaidAmount: (v: string) => void;
  paymentMode: string;
  setPaymentMode: (v: string) => void;
  paymentNote: string;
  setPaymentNote: (v: string) => void;
  handleOpenPreview: () => void;
  handleSave: () => void;
  appliedCoupons: any[];
  isSaving?: boolean;
  paymentModes: string[];
  isRewardSyncMode?: boolean;
  couponOverrides: Record<string, number>;
  setCouponOverrides: (v: Record<string, number>) => void;
  couponOverrideReasons: Record<string, string>;
  setCouponOverrideReasons: (v: Record<string, string>) => void;
}

export function ReconciliationPanel({
  selectedCustomerId,
  bestOffer,
  totals,
  manualAmount,
  setManualAmount,
  manualOverrideReason,
  setManualOverrideReason,
  manualGstRate,
  setManualGstRate,
  exemptAmount,
  setExemptAmount,
  advanceAmount,
  setAdvanceAmount,
  manualDiscount,
  setManualDiscount,
  couponCode,
  setCouponCode,
  handleApplyCoupon,
  currencySymbol,
  isQuotation,
  paidAmount,
  setPaidAmount,
  paymentMode,
  setPaymentMode,
  paymentNote,
  setPaymentNote,
  handleOpenPreview,
  handleSave,
  appliedCoupons,
  isSaving,
  paymentModes,
  isRewardSyncMode = false,
  couponOverrides,
  setCouponOverrides,
  couponOverrideReasons,
  setCouponOverrideReasons
}: ReconciliationPanelProps) {
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [tempOverrideValue, setTempOverrideValue] = useState("");
  const [tempOverrideReason, setTempOverrideReason] = useState("");

  const startOverride = (coupon: any) => {
    setEditingCouponId(coupon.id);
    setTempOverrideValue(couponOverrides[coupon.code]?.toString() || "");
    setTempOverrideReason(couponOverrideReasons[coupon.code] || "");
  };

  const cancelOverride = () => {
    setEditingCouponId(null);
    setTempOverrideValue("");
    setTempOverrideReason("");
  };

  const commitOverride = (code: string) => {
    const val = parseFloat(tempOverrideValue);
    if (isNaN(val)) return;

    setCouponOverrides({ ...couponOverrides, [code]: val });
    setCouponOverrideReasons({ ...couponOverrideReasons, [code]: tempOverrideReason });
    setEditingCouponId(null);
  };

  return (
    <Card className="shadow-2xl border-none overflow-hidden bg-white rounded-[1.5rem] sm:rounded-[2.5rem]">
      <CardHeader className="bg-primary/5 py-4 sm:py-6 px-6 sm:px-8 border-b text-left">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
          <Wallet className="h-5 w-5" /> 3. Reconciliation
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-8 space-y-6 text-left">
        {selectedCustomerId && bestOffer && (
           <div className={cn("p-4 sm:p-5 rounded-[1.2rem] sm:rounded-[1.5rem] border-2 animate-in zoom-in-95 flex items-start gap-4", bestOffer.type === 'best' ? "bg-green-50 border-green-100" : "bg-primary/5 border-primary/10")}>
              {bestOffer.type === 'best' ? <Sparkles className="h-5 w-5 text-green-600 fill-current mt-0.5" /> : <Bot className="h-5 w-5 text-primary mt-0.5" />}
              <div className="space-y-1 flex-1">
                <p className={cn("text-[9px] font-black uppercase tracking-widest", bestOffer.type === 'best' ? "text-green-700" : "text-primary")}>AI Best Fit Node</p>
                <p className="text-xs font-bold text-slate-800 leading-tight">{bestOffer.type === 'best' ? `Use *${bestOffer.coupon.code}* for max savings!` : `Add ₹${bestOffer.coupon.minOrder - totals.grossSubtotal} more to unlock ${bestOffer.coupon.code}.`}</p>
                {bestOffer.type === 'best' && !appliedCoupons.some(c => c.id === bestOffer.coupon.id) && (
                  <button className="h-auto p-0 text-[8px] font-black uppercase text-green-700 underline" onClick={() => handleApplyCoupon(bestOffer.coupon.code)}>Apply Now</button>
                )}
              </div>
           </div>
        )}
        
        {!isRewardSyncMode && (
          <div className="space-y-6 p-5 sm:p-6 bg-muted/20 rounded-[2rem] border-2 border-dashed border-primary/10">
             <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase text-primary tracking-widest ml-1">Manual Total Override</Label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary opacity-30" />
                  <Input placeholder="Amount override" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} className="pl-12 h-12 text-base font-black rounded-xl bg-white border-none shadow-sm" />
                </div>
                {manualAmount && (
                  <div className="mt-2 space-y-1.5 animate-in slide-in-from-top-1">
                     <Label className="text-[8px] font-black uppercase text-muted-foreground ml-1">Override Reason *</Label>
                     <Input 
                        value={manualOverrideReason} 
                        onChange={(e) => setManualOverrideReason(e.target.value)} 
                        placeholder="Why this override?" 
                        className="h-9 rounded-xl bg-white border-none shadow-sm text-[10px] font-bold" 
                     />
                  </div>
                )}
             </div>
             {totals.isOverridden && (
               <div className="space-y-2 text-left animate-in fade-in">
                 <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Manual GST Rate (%)</Label>
                 <Select value={manualGstRate} onValueChange={setManualGstRate}>
                   <SelectTrigger className="h-10 rounded-xl bg-white border-none shadow-sm font-bold text-left"><SelectValue /></SelectTrigger>
                   <SelectContent className="rounded-xl border-none shadow-2xl">
                     {[0, 5, 12, 18, 28].map(r => <SelectItem key={r} value={r.toString()} className="text-xs font-bold">{r}% GST</SelectItem>)}
                   </SelectContent>
                 </Select>
               </div>
             )}
             <div className="space-y-2 text-left">
               <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Advance Payment Received</Label>
               <div className="relative">
                 <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600 opacity-40" />
                 <Input placeholder="Advance amount" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} className="pl-12 h-12 text-base font-black rounded-xl bg-white border-none shadow-sm text-green-700" />
               </div>
             </div>
          </div>
        )}

        {/* APPLIED COUPONS LIST WITH OVERRIDE CAPABILITY */}
        <div className="space-y-4">
          <Label className="text-[10px] font-black uppercase text-primary ml-1 tracking-widest">Active Reward Bundle</Label>
          <div className="space-y-3">
            {appliedCoupons.length === 0 ? (
              <p className="text-[10px] text-muted-foreground italic uppercase px-1">No coupons applied.</p>
            ) : appliedCoupons.map((c) => {
              const isEditing = editingCouponId === c.id;
              const hasOverride = couponOverrides[c.code] !== undefined;

              return (
                <div key={c.id} className={cn("p-4 rounded-2xl border-2 transition-all", isEditing ? "border-primary bg-primary/5" : hasOverride ? "border-orange-200 bg-orange-50" : "border-muted bg-white")}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 border-primary/20 text-primary">{c.code}</Badge>
                        {hasOverride && <Badge className="bg-orange-500 text-white border-none text-[6px] font-black h-3.5 px-1 uppercase">Overridden</Badge>}
                      </div>
                      <p className="text-[9px] font-bold text-slate-500">{c.type === 'percentage' ? `${c.value}% OFF` : `₹${c.value} FLAT`}</p>
                    </div>
                    {!isEditing && (
                      <button onClick={() => startOverride(c)} className="h-8 w-8 rounded-lg hover:bg-primary/10 flex items-center justify-center text-primary/40 hover:text-primary transition-all">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
                       <div className="space-y-2">
                          <Label className="text-[8px] font-black uppercase text-primary">New Discount Value (₹)</Label>
                          <div className="flex gap-2">
                             <Input 
                                type="number" 
                                value={tempOverrideValue} 
                                onChange={(e) => setTempOverrideValue(e.target.value)}
                                className="h-9 rounded-lg bg-white border-primary/30 font-black text-sm" 
                             />
                             <Button size="icon" onClick={() => commitOverride(c.code)} className="h-9 w-9 bg-primary rounded-lg shrink-0"><Check className="h-4 w-4" /></Button>
                             <Button variant="ghost" size="icon" onClick={cancelOverride} className="h-9 w-9 rounded-lg shrink-0"><X className="h-4 w-4" /></Button>
                          </div>
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[8px] font-black uppercase text-primary">Override Reason *</Label>
                          <Input 
                             value={tempOverrideReason} 
                             onChange={(e) => setTempOverrideReason(e.target.value)}
                             placeholder="e.g. Special client gesture" 
                             className="h-8 rounded-lg bg-white border-primary/10 text-[10px] font-bold" 
                          />
                       </div>
                    </div>
                  ) : hasOverride && (
                    <div className="mt-2 p-2 bg-white/50 rounded-lg border border-orange-100 flex items-start gap-2">
                       <AlertCircle className="h-3 w-3 text-orange-400 shrink-0 mt-0.5" />
                       <p className="text-[8px] font-bold text-orange-700 italic leading-tight">"Manual Value Set: ₹{couponOverrides[c.code]} • {couponOverrideReasons[c.code]}"</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6 text-left">
           {!isRewardSyncMode && (
             <div className="space-y-2 text-left">
               <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Manual Global Discount (₹)</Label>
               <Input type="number" placeholder="0.00" value={manualDiscount || ""} onChange={(e) => setManualDiscount(parseFloat(e.target.value) || 0)} className="h-12 rounded-xl bg-muted/20 border-none shadow-inner font-bold text-destructive" />
             </div>
           )}
           <div className="space-y-2 text-left">
             <Label className="text-[10px] font-black uppercase text-primary ml-1">Apply Coupon Code</Label>
             <div className="flex gap-2">
               <Input placeholder="CODE" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="h-11 rounded-xl font-black uppercase tracking-widest text-xs shadow-inner" />
               <Button onClick={() => handleApplyCoupon()} size="sm" className="h-11 px-4 rounded-xl font-bold uppercase text-[10px] bg-primary text-white shadow-md">Apply</Button>
             </div>
           </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-xs font-black">
            <span className="text-muted-foreground uppercase tracking-widest opacity-60 text-left">GROSS SUB (INC TAX)</span>
            <span>{currencySymbol}{totals.grossSubtotal.toLocaleString()}</span>
          </div>
          {!isRewardSyncMode && (
            <div className="flex justify-between text-xs font-black">
              <span className="text-muted-foreground uppercase tracking-widest opacity-60 text-left">TAX TOTAL</span>
              <span>{currencySymbol}{totals.taxTotal.toLocaleString()}</span>
            </div>
          )}
        </div>

        <Separator className="opacity-40" />

        <div className={cn("p-6 sm:p-8 text-white rounded-[1.5rem] sm:rounded-[2rem] flex justify-between items-center shadow-2xl relative overflow-hidden transition-all", isQuotation ? "bg-orange-600" : "bg-primary")}>
          <div className="absolute top-0 right-0 p-6 opacity-10"><ShieldCheck className="h-24 w-24" /></div>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60 text-left">{isQuotation ? 'Quoted Value' : 'Final Payout'}</span>
          <span className="text-3xl sm:text-4xl font-black">{currencySymbol}{totals.finalPayout.toLocaleString()}</span>
        </div>

        {!isQuotation && !isRewardSyncMode && (
          <div className="space-y-5 text-left animate-in fade-in">
            <div className="space-y-2.5 text-left">
              <Label className="text-[10px] font-black uppercase text-green-600 tracking-widest ml-1">Amount Collected (Settled Now)</Label>
              <div className="relative">
                <BanknoteIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600 opacity-60" />
                <Input placeholder="Amount paid by customer" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="pl-12 h-14 text-lg font-black rounded-2xl bg-green-50 border-green-100 shadow-inner text-green-800" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2.5 text-left">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Settlement Method</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger className="h-12 rounded-xl font-bold bg-muted/10 border-none shadow-sm text-left"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-2xl">
                    {paymentModes.map((mode: string) => (
                      <SelectItem key={mode} value={mode} className="text-xs font-bold uppercase text-left">
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5 text-left">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Payment Note / Memo</Label>
                <Input value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="Ref or remark..." className="h-12 rounded-xl bg-muted/5 border-none shadow-sm text-xs font-bold" />
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 sm:p-8 pt-0 flex flex-col gap-3">
        {!isRewardSyncMode && (
          <Button variant="outline" disabled={isSaving} className="w-full h-14 border-2 border-primary/20 text-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-sm" onClick={handleOpenPreview}>
            <Eye className="mr-2 h-4 w-4" /> View Bill Preview
          </Button>
        )}
        <Button disabled={!selectedCustomerId || isSaving} className="w-full h-20 bg-primary font-black uppercase text-base tracking-[0.2em] rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl active:scale-95 transition-all text-white" onClick={handleSave}>
          {isSaving ? <Loader2 className="animate-spin h-6 w-6 mr-3" /> : (isQuotation ? 'Initialize Quotation' : 'Finalize Node Entry')}
        </Button>
      </CardFooter>
    </Card>
  );
}
