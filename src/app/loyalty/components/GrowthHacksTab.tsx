"use client";

import React from "react";
import { Zap, Lock, Coins, Calculator, ShieldCheck, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionCard } from "@/components/ui/editorial";
import { cn } from "@/lib/utils";

export function GrowthHacksTab({ portalConfig, onUpdate, isWhatsappActive }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left items-start">
      <div className="lg:col-span-8 space-y-6">
        <SectionCard
          title="Progressive Profiling & Incentives"
          description="Reward members for completing their birthday and anniversary details."
          headerRight={
            <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              {!isWhatsappActive && <Lock className="h-3.5 w-3.5 text-amber-600" />}
              <Label htmlFor="wa-nudge-toggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
                WhatsApp Nudge
              </Label>
              <Switch
                id="wa-nudge-toggle"
                checked={portalConfig?.nudgeEnabled || false}
                onCheckedChange={(v) => onUpdate({ nudgeEnabled: v })}
                className={cn(isWhatsappActive ? "data-[state=checked]:bg-emerald-600" : "data-[state=checked]:bg-slate-400")}
              />
            </div>
          }
        >
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-amber-50/70 rounded-xl border border-amber-200 gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shrink-0">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Profile Completion Bonus</p>
                  <p className="text-xs text-slate-600">Points credited for adding Birthday & Anniversary dates.</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Input
                  type="number"
                  aria-label="Profile completion bonus points"
                  value={portalConfig?.profileBonusPoints || 0}
                  onChange={(e) => onUpdate({ profileBonusPoints: parseInt(e.target.value) || 0 })}
                  className="h-10 w-24 text-center font-mono font-bold tabular-nums rounded-xl border-amber-200 bg-white"
                />
                <span className="text-xs font-semibold text-slate-700">Points</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nudge-msg" className="text-xs font-semibold text-slate-700">
                Welcome Personalization Message (WhatsApp)
              </Label>
              <Textarea
                id="nudge-msg"
                defaultValue={
                  portalConfig?.personalizationMessage ||
                  "Welcome to the Club! 🎁 Apne rewards ko personalize karne ke liye yahan click karein aur apna Birthday set karein taaki hum aapka din khaas bana sakte hain: {{track_url}}"
                }
                onBlur={(e) => onUpdate({ personalizationMessage: e.target.value })}
                className="min-h-[110px] rounded-xl text-xs leading-relaxed"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Global Reward Rules"
          description="Control stacked discount priority and daily exclusive redemption limits."
          headerRight={
            <Badge variant="outline" className="border-slate-200 text-slate-700 text-xs font-medium">
              Platform Engine
            </Badge>
          }
        >
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Discount Priority Order</p>
                  <p className="text-xs text-slate-500">Order used when calculating percentage vs flat card savings.</p>
                </div>
              </div>
              <div className="w-full sm:w-52 shrink-0">
                <Select
                  value={portalConfig?.discountPriority || "percentage_first"}
                  onValueChange={(v) => onUpdate({ discountPriority: v })}
                >
                  <SelectTrigger className="h-10 rounded-xl bg-white text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="percentage_first" className="text-xs">Percentage (%) First</SelectItem>
                    <SelectItem value="flat_first" className="text-xs">Flat (₹) First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <Label htmlFor="daily-limit-toggle" className="text-sm font-bold text-slate-900 cursor-pointer">
                    Daily Exclusive Protection
                  </Label>
                  <p className="text-xs text-slate-500">
                    Limit 1 exclusive coupon per customer daily (resets 1:30 AM).
                  </p>
                </div>
              </div>
              <Switch
                id="daily-limit-toggle"
                checked={!!portalConfig?.dailyNodeProtectionEnabled}
                onCheckedChange={(v) => onUpdate({ dailyNodeProtectionEnabled: v })}
                className="data-[state=checked]:bg-slate-900 shrink-0"
              />
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-slate-900 text-white p-6 space-y-5 text-left">
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-white">Birthday Automation</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Members who save their birthday and anniversary dates deliver up to 2.5x higher repeat visits when paired with automated WhatsApp wishes.
          </p>
          <Separator className="bg-white/10" />
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">WhatsApp Delivery</span>
              <Badge
                className={cn(
                  "text-[11px] font-semibold border-none",
                  isWhatsappActive ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-slate-300"
                )}
              >
                {isWhatsappActive ? "Enabled" : "Locked"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Profile Enrichment</span>
              <Badge variant="outline" className="text-slate-200 border-white/20 text-[11px]">
                Incentivized
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
