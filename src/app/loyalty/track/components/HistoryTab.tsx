
"use client";

import React from "react";
import { History, Gem, Ticket, Handshake, Zap, Gift, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface HistoryTabProps {
  activities: any[];
  currencySymbol: string;
}

export function HistoryTab({ activities, currencySymbol }: HistoryTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in text-left">
      <Card className="border-none shadow-xl overflow-hidden bg-white rounded-[2rem] sm:rounded-[3.5rem] border mx-1 sm:mx-0">
        <div className="divide-y overflow-hidden">
          {(!activities || activities.length === 0) ? (
            <div className="p-16 sm:p-24 text-center opacity-30 italic text-sm sm:text-base font-black uppercase tracking-widest">No history logged yet.</div>
          ) : (
            activities.map((a: any) => (
              <div key={a.id} className="p-4 sm:p-6 space-y-3 sm:space-y-4 hover:bg-muted/5 transition-all text-left">
                <div className="flex items-center justify-between text-left gap-4">
                  <div className="flex items-center gap-4 sm:gap-6 min-w-0 text-left">
                    <div className={cn(
                      "h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-primary shadow-inner shrink-0",
                      a.type === 'purchase_reward' ? "bg-green-50 text-green-600" : 
                      a.type === 'coupon_redeem' ? "bg-orange-50 text-orange-600" : "bg-primary/5"
                    )}>
                      {a.type === 'purchase_reward' ? <Gem className="h-5 w-5 sm:h-6 sm:w-6" /> : 
                       a.type === 'coupon_redeem' ? <Ticket className="h-5 w-5 sm:h-6 sm:w-6" /> : 
                       a.type === 'referral_bonus' ? <Handshake className="h-5 w-5 sm:h-6 sm:w-6" /> : 
                       a.type === 'profile_bonus' ? <Zap className="h-5 w-5 sm:h-6 sm:w-6" /> : <Gift className="h-5 w-5 sm:h-6 sm:w-6" />}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-sm sm:text-lg font-black text-slate-900 uppercase tracking-tight truncate">{a.type?.replace(/_/g, ' ')}</p>
                      <p className="text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2 mt-1">
                        <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {new Date(a.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' , year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                     {a.points > 0 && <p className="text-base sm:text-xl font-black text-primary">+{a.points?.toLocaleString()} <span className="text-[8px] sm:text-[10px] opacity-40">PTS</span></p>}
                     {a.cashback > 0 && <p className="text-xs sm:text-base font-black text-green-600">+{currencySymbol}{a.cashback?.toLocaleString()} <span className="text-[7px] sm:text-[8px] opacity-40">CASH</span></p>}
                  </div>
                </div>
                
                <div className="pl-14 sm:pl-18 flex flex-wrap gap-x-4 sm:gap-x-8 gap-y-2 sm:gap-y-4 text-left">
                   {a.invoiceValue > 0 && (
                     <div className="space-y-0.5 text-left">
                        <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-tighter">Bill Value</p>
                        <p className="text-[10px] sm:text-xs font-bold text-slate-700">{currencySymbol}{a.invoiceValue.toLocaleString()}</p>
                     </div>
                   )}
                   {a.couponCode && (
                     <div className="space-y-0.5 text-left">
                        <p className="text-[7px] sm:text-[8px] font-black text-orange-400 uppercase tracking-tighter">Coupon Used</p>
                        <Badge variant="outline" className="h-4 text-[6px] sm:text-[7px] font-black bg-orange-50 border-orange-200 text-orange-600 uppercase px-1.5 sm:px-2">{a.couponCode}</Badge>
                     </div>
                   )}
                   {a.description && (
                     <div className="w-full pt-1 sm:pt-2 text-left">
                        <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1 sm:mb-1.5">Audit Remark</p>
                        <p className="text-[10px] sm:text-xs font-medium text-slate-500 italic leading-relaxed text-left max-w-2xl">"{a.description}"</p>
                     </div>
                   )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
