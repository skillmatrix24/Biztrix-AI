"use client";

import React from "react";
import { Target, Zap, ArrowRight, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { SectionCard } from "@/components/ui/editorial";
import Link from "next/link";

export function IntelligenceTab({ aiStats }: { aiStats: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left items-stretch">
      <div className="lg:col-span-8">
        <SectionCard title="Customer Churn Radar" description="Live member health segmented by last store interaction window.">
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-1">
                <p className="text-xs font-semibold text-rose-700">At-Risk Members</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-rose-900">{aiStats["at-risk"]}</p>
                <p className="text-[11px] text-rose-600">No visit for 30+ days</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                <p className="text-xs font-semibold text-amber-700">Inactive Contacts</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-amber-900">{aiStats["inactive"]}</p>
                <p className="text-[11px] text-amber-600">No visit for 90+ days</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                <p className="text-xs font-semibold text-emerald-700">Active & Loyal</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-emerald-900">{aiStats["loyal"]}</p>
                <p className="text-[11px] text-emerald-600">Recent interaction</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900">Recommended Actions</h4>
                <Button asChild variant="ghost" size="sm" className="h-8 text-xs font-semibold text-slate-700 gap-1">
                  <Link href="/customers">
                    View Directory <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>

              {aiStats["at-risk"] > 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-900 shrink-0">
                      <Zap className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-medium text-slate-800 leading-snug">
                      Re-engage <span className="font-mono font-bold tabular-nums">{aiStats["at-risk"]}</span> at-risk customers with a targeted comeback offer.
                    </p>
                  </div>
                  <Button asChild size="sm" className="h-9 px-4 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shrink-0">
                    <Link href="/loyalty/campaigns">Launch Campaign</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-slate-500">All customer segments are currently healthy.</p>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-slate-900 text-white p-6 space-y-5 text-left h-full flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-sm font-bold text-white">
              <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              Retention Insight
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Send a Friday evening WhatsApp reminder to at-risk customers before their 60-day dormancy window closes.
            </p>
          </div>
          <div className="space-y-3">
            <Separator className="bg-white/10" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">Signal Confidence</span>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-none text-[11px]">Optimal</Badge>
            </div>
            <Progress value={92} className="h-1.5 bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
