
"use client";

import React from "react";
import { Zap, Lock, Coins, Calculator, ShieldCheck, Heart, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function GrowthHacksTab({ portalConfig, onUpdate, isWhatsappActive }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
      <div className="lg:col-span-8 space-y-8 text-left">
         <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
            <CardHeader className="bg-orange-50 border-b py-6 px-8 text-left">
              <div className="flex justify-between items-center text-left">
                <div className="text-left">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-orange-700 flex items-center gap-2">
                    <Zap className="h-4 w-4" /> Progressive Profiling & Incentives
                  </CardTitle>
                  <p className="text-[10px] font-bold text-orange-600/70 uppercase mt-1 tracking-widest">Reward members for sharing personal details</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 px-3 rounded-xl border border-orange-200">
                  {!isWhatsappActive && <Lock className="h-3 w-3 text-orange-400" />}
                  <span className="text-[9px] font-black uppercase text-orange-800">WhatsApp Nudge</span>
                  <Switch 
                    checked={portalConfig?.nudgeEnabled || false} 
                    onCheckedChange={(v) => onUpdate({ nudgeEnabled: v })}
                    className={cn("scale-75", isWhatsappActive ? "data-[state=checked]:bg-orange-600" : "data-[state=checked]:bg-slate-400")}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-10 text-left">
               <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-orange-100/30 rounded-3xl border border-orange-100 gap-6 text-left">
                  <div className="flex items-center gap-4 text-left">
                     <div className="h-12 w-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg"><Coins className="h-6 w-6" /></div>
                     <div className="text-left">
                        <p className="text-xs font-black text-orange-900 uppercase tracking-tight">Profile Completion Bonus</p>
                        <p className="text-[10px] font-medium text-orange-700">Reward points for adding Birthday & Anniversary</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3 text-left">
                     <Input 
                        type="number" 
                        value={portalConfig?.profileBonusPoints || 0} 
                        onChange={(e) => onUpdate({ profileBonusPoints: parseInt(e.target.value) })}
                        className="h-11 w-24 text-center font-black text-lg rounded-xl border-orange-200 bg-white" 
                     />
                     <span className="text-[10px] font-black uppercase text-orange-800 tracking-widest">Points</span>
                  </div>
               </div>

               <div className="space-y-6 text-left">
                  <div className="space-y-1 text-left">
                     <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Personalization Nudge (WhatsApp)</h4>
                     <p className="text-[9px] font-bold text-muted-foreground uppercase">Template for new member welcome message</p>
                  </div>
                  <Textarea 
                     defaultValue={portalConfig?.personalizationMessage || "Welcome to the Club! 🎁 Apne rewards ko personalize karne ke liye yahan click karein aur apna Birthday set karein taaki hum aapka din khaas bana sakte hain: {{track_url}}"}
                     onBlur={(e) => onUpdate({ personalizationMessage: e.target.value })}
                     className="min-h-[120px] rounded-2xl bg-muted/20 border-none p-4 text-xs font-medium leading-relaxed" 
                  />
               </div>
            </CardContent>
         </Card>

         <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
            <CardHeader className="bg-primary/5 border-b py-6 px-8 flex justify-between items-center text-left">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><Calculator className="h-4 w-4" /> Global Reward Logic</CardTitle>
              <Badge variant="outline" className="bg-white border-primary/20 text-primary font-black text-[8px] h-5 px-2 uppercase">Platform Engine</Badge>
            </CardHeader>
            <CardContent className="p-8 space-y-10 text-left">
              <div className="space-y-6 text-left">
                 <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-muted/20 rounded-3xl border border-transparent gap-6 text-left">
                    <div className="flex items-center gap-4 text-left">
                       <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg"><Zap className="h-6 w-6" /></div>
                       <div className="text-left">
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Discount Priority Node</p>
                          <p className="text-[9px] font-medium text-slate-500 uppercase tracking-widest">Decide calculation sequence for stacked cards</p>
                       </div>
                    </div>
                    <div className="w-full sm:w-48 text-left">
                       <Select value={portalConfig?.discountPriority || "percentage_first"} onValueChange={(v) => onUpdate({ discountPriority: v })}>
                          <SelectTrigger className="h-11 rounded-xl bg-white font-black text-[10px] uppercase shadow-sm border-muted-foreground/20 text-left"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl border-none shadow-2xl">
                             <SelectItem value="percentage_first" className="text-[10px] font-bold uppercase">Percentage (%) First</SelectItem>
                             <SelectItem value="flat_first" className="text-[10px] font-bold uppercase">Flat (₹) First</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                 </div>
                 
                 <Separator />

                 <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-primary/5 rounded-3xl border border-primary/10 gap-6 text-left">
                    <div className="flex items-center gap-4 text-left">
                       <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-primary shadow-lg"><ShieldCheck className="h-6 w-6" /></div>
                       <div className="text-left">
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Daily Node Protection</p>
                          <p className="text-[9px] font-medium text-slate-500 uppercase tracking-widest">Max 1 Exclusive coupon per customer daily (1:30 AM reset)</p>
                       </div>
                    </div>
                    <Switch 
                      checked={!!portalConfig?.dailyNodeProtectionEnabled} 
                      onCheckedChange={(v) => onUpdate({ dailyNodeProtectionEnabled: v })}
                      className="data-[state=checked]:bg-primary scale-110"
                    />
                 </div>
              </div>
            </CardContent>
         </Card>
      </div>
      <div className="lg:col-span-4 space-y-8 text-left">
         <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] p-8 space-y-6 overflow-hidden text-left">
            <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><Heart className="h-40 w-40" /></div>
            <div className="relative z-10 space-y-6 text-left">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20"><Sparkles className="h-6 w-6 text-accent" /></div>
              <h3 className="text-xl font-bold uppercase">Birthday Alerts Node</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed font-medium">"Members who register their birthday have a 2.5x higher LTV (Lifetime Value) compared to anonymous members."</p>
              <Separator className="bg-white/10" />
              <div className="space-y-4 text-left">
                 <div className="flex items-center justify-between text-left"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Alerts</span><Badge className={cn("border-none text-[8px] h-4 uppercase", isWhatsappActive ? "bg-green-500 text-white" : "bg-slate-700 text-slate-400")}>{isWhatsappActive ? 'System ON' : 'LOCKED'}</Badge></div>
                 <div className="flex items-center justify-between text-left"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data Enrichment</span><Badge variant="outline" className="text-accent border-accent text-[8px] h-4 uppercase">Incentivized</Badge></div>
              </div>
            </div>
         </Card>
      </div>
    </div>
  );
}
