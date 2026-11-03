"use client";

import React from "react";
import { Handshake, Trophy, SmartphoneNfc, Check, Copy, Flame, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ReferralTabProps {
  member: any;
  business: any;
  currencySymbol: string;
  referralLink: string;
  isReferralCopied: boolean;
  topReferrers: any[];
  onShare: () => void;
  onCopy: () => void;
}

export function ReferralTab({ 
  member, business, currencySymbol, referralLink, isReferralCopied, topReferrers, onShare, onCopy 
}: ReferralTabProps) {
  return (
    <div className="space-y-10 animate-in fade-in text-left">
      <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden border">
        <div className="grid grid-cols-1 md:grid-cols-2">
           <div className="p-6 sm:p-10 lg:p-14 bg-slate-50 flex flex-col justify-center space-y-8 sm:space-y-10 border-b md:border-b-0 md:border-r text-left">
              <div className="space-y-4 text-left">
                 <Badge className="bg-primary text-white border-none text-[8px] font-black h-5 sm:h-6 px-3 sm:px-4 uppercase tracking-[0.2em] rounded-full">VIRAL NODE ACTIVE</Badge>
                 <h3 className="text-2xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight leading-none">Refer Friends, <br/><span className="text-primary underline decoration-primary/10">Win Rewards.</span></h3>
                 <p className="text-xs sm:text-base text-slate-500 font-medium leading-relaxed italic text-left max-w-sm">
                   Jab aapka dost join karega, unhe welcome gift milega aur aapko instant wallet credits!
                 </p>
              </div>

              <div className="space-y-6 text-left">
                 <div className="grid grid-cols-2 gap-4 sm:gap-6 text-left">
                    <div className="p-4 sm:p-6 bg-primary/5 rounded-[1.5rem] sm:rounded-[2rem] border border-primary/10 text-center flex flex-col items-center justify-center gap-1 shadow-sm">
                       <p className="text-[8px] sm:text-[10px] font-black text-primary uppercase">Aapko Milega</p>
                       <p className="text-lg sm:text-2xl font-black text-slate-900">{currencySymbol}{business?.referralBonusAmount || 50}</p>
                       <p className="text-[7px] sm:text-[8px] text-muted-foreground uppercase font-black opacity-60">Success Ref</p>
                    </div>
                    <div className="p-4 sm:p-6 bg-green-50 rounded-[1.5rem] sm:rounded-[2rem] border border-green-100 text-center flex flex-col items-center justify-center gap-1 shadow-sm">
                       <p className="text-[8px] sm:text-[10px] font-black text-green-700 uppercase">Dost ko Milega</p>
                       <p className="text-lg sm:text-2xl font-black text-slate-900">{currencySymbol}{business?.welcomeBonusAmount || 100}</p>
                       <p className="text-[7px] sm:text-[8px] text-muted-foreground uppercase font-black opacity-60">Join Bonus</p>
                    </div>
                 </div>

                 <div className="p-5 sm:p-6 bg-white rounded-[1.5rem] sm:rounded-[2rem] border-2 border-dashed border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-left w-full sm:w-auto">
                       <p className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center sm:text-left">My Referral Status</p>
                       <div className="flex items-center justify-center sm:justify-start gap-3 mt-1">
                          <p className="text-2xl sm:text-3xl font-black text-primary">{member?.referralCount || 0}</p>
                          <Badge className="bg-primary/10 text-primary border-none text-[7px] sm:text-[8px] font-black h-4 sm:h-5 px-2 uppercase">Success Nodes</Badge>
                       </div>
                    </div>
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-primary/5 flex items-center justify-center text-primary shadow-inner shrink-0"><TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" /></div>
                 </div>
                 
                 <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Button onClick={onShare} className="flex-1 h-14 sm:h-16 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] sm:text-[11px] tracking-widest rounded-xl sm:rounded-2xl shadow-xl gap-2 sm:gap-3">
                       <SmartphoneNfc className="h-4 w-4 sm:h-5 sm:w-5" /> Share WhatsApp
                    </Button>
                    <Button variant="outline" onClick={onCopy} className="flex-1 h-14 sm:h-16 rounded-xl sm:rounded-2xl font-black uppercase text-[10px] sm:text-[11px] tracking-widest border-primary/20 text-primary bg-white shadow-sm hover:bg-primary/5">
                       {isReferralCopied ? <Check className="h-4 w-4 sm:h-5 sm:w-5 mr-2" /> : <Copy className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />} {isReferralCopied ? 'Copied' : 'Copy Link'}
                    </Button>
                 </div>
              </div>
           </div>

           <div className="p-6 sm:p-10 lg:p-14 bg-slate-900 text-white relative overflow-hidden flex flex-col text-left">
              <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12"><Trophy className="h-48 sm:h-64 w-48 sm:w-64" /></div>
              <div className="relative z-10 space-y-8 sm:space-y-10 flex-1 flex flex-col text-left">
                 <div className="flex items-center gap-4 text-left">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><Trophy className="h-6 w-6 sm:h-7 sm:w-7 text-accent" /></div>
                    <h4 className="text-base sm:text-lg font-black uppercase tracking-widest text-accent leading-none">Hall of Fame (Top 10)</h4>
                 </div>
                 
                 <div className="space-y-3 sm:space-y-4 flex-1">
                    {(!topReferrers || topReferrers.length === 0) ? (
                      <p className="text-[10px] sm:text-[11px] text-slate-500 uppercase italic py-8 sm:py-10 text-center">Leaderboard nodes initializing...</p>
                    ) : topReferrers.map((ref, idx) => {
                      const isMe = ref.id === member?.id;
                      return (
                        <div key={ref.id} className={cn(
                          "p-3 sm:p-4 rounded-xl sm:rounded-2xl border flex items-center justify-between transition-all duration-500",
                          isMe ? "bg-accent/10 border-accent shadow-[0_0_15px_rgba(var(--accent),0.3)] scale-[1.03]" : "bg-white/5 border-white/5"
                        )}>
                           <div className="flex items-center gap-3 sm:gap-4">
                              <span className={cn("text-[9px] sm:text-[11px] font-black w-4 sm:w-6 text-center", idx === 0 ? "text-yellow-400" : idx === 1 ? "text-slate-300" : idx === 2 ? "text-orange-400" : "text-slate-600")}>#{idx + 1}</span>
                              <div className="min-w-0 text-left">
                                <p className="text-[11px] sm:text-[12px] font-bold uppercase truncate max-w-[100px] sm:max-w-[140px]">{ref.customerName?.substring(0, 1)}***{ref.customerName?.slice(-1)}</p>
                                {isMe && <Badge className="bg-accent text-primary text-[6px] sm:text-[7px] font-black h-3 sm:h-3.5 px-1.5 sm:px-2 uppercase mt-0.5">YOU</Badge>}
                              </div>
                           </div>
                           <p className="text-[10px] sm:text-xs font-black text-slate-300 whitespace-nowrap">{ref.referralCount || 0} Successful Nodes</p>
                        </div>
                      );
                    })}
                 </div>

                 <div className="p-4 sm:p-6 bg-white/5 rounded-2xl sm:rounded-3xl border border-white/10 flex items-start gap-3 sm:gap-4 text-left shadow-inner mt-4">
                    <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-accent shrink-0 mt-0.5 animate-pulse" />
                    <p className="text-[10px] sm:text-[11px] text-slate-400 leading-relaxed font-bold uppercase tracking-tight">
                       Top 10 winners ko <span className="text-white font-black">Next Year Membership Upgrade Free</span> milegi! Node active.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </Card>
    </div>
  );
}
