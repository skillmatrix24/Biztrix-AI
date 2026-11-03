
"use client";

import React from "react";
import { Target, Zap, ArrowRight, Bot, ShieldCheck, BadgeCheck, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

export function IntelligenceTab({ aiStats }: { aiStats: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
      <div className="lg:col-span-8 space-y-8 text-left">
        <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
          <CardHeader className="bg-primary/5 border-b py-6 px-8 text-left"><CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><Target className="h-4 w-4" /> Global Churn Radar</CardTitle></CardHeader>
          <CardContent className="p-8 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10 text-left">
               <div className="p-5 bg-red-50 rounded-2xl border border-red-100 space-y-2 text-left"><p className="text-[9px] font-black text-red-600 uppercase">At-Risk Cluster</p><p className="text-3xl font-black text-red-700">{aiStats['at-risk']}</p><p className="text-[8px] font-bold text-red-500 uppercase">No visit for 30+ days</p></div>
               <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100 space-y-2 text-left"><p className="text-[9px] font-black text-orange-600 uppercase">Inactive Nodes</p><p className="text-3xl font-black text-orange-700">{aiStats['inactive']}</p><p className="text-[8px] font-bold text-orange-500 uppercase">Gone for 90+ days</p></div>
               <div className="p-5 bg-green-50 rounded-2xl border border-green-100 space-y-2 text-left"><p className="text-[9px] font-black text-green-600 uppercase">Loyal Force</p><p className="text-3xl font-black text-green-700">{aiStats['loyal']}</p><p className="text-[8px] font-bold text-green-500 uppercase">Active interaction</p></div>
            </div>
            <Separator className="mb-10 opacity-40" />
            <div className="space-y-6 text-left">
               <div className="flex items-center justify-between text-left"><h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Intelligence Suggestions</h4><Button variant="ghost" size="sm" className="h-7 text-[8px] font-black uppercase text-primary gap-1">Scan Full Registry <ArrowRight className="h-3 w-3" /></Button></div>
               <div className="space-y-4 text-left">{aiStats['at-risk'] > 0 && <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between gap-6 group hover:bg-primary/10 transition-all text-left"><div className="flex items-center gap-4 text-left"><div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm"><Zap className="h-5 w-5" /></div><div><p className="text-xs font-bold text-slate-900 leading-tight">Re-engage {aiStats['at-risk']} At-Risk customers with AI-personalized offers.</p></div></div><Button asChild size="sm" className="h-8 rounded-lg text-[9px] font-black uppercase bg-primary"><Link href="/loyalty/campaigns">Launch Sequence</Link></Button></div>}</div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-4 space-y-8 text-left">
        <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden text-left"><CardHeader className="p-8 pb-4 text-left"><CardTitle className="text-sm font-black uppercase tracking-widest text-accent flex items-center gap-2"><Bot className="h-5 w-5" /> Cognitive Insight</CardTitle></CardHeader><CardContent className="p-8 pt-0 space-y-6 text-left"><p className="text-xs text-slate-400 leading-relaxed italic text-left">"I have analyzed the registry. Your <strong>Retention Score is 82%</strong>. I suggest a Friday evening WhatsApp sequence for at-risk clusters."</p><Separator className="bg-white/10" /><div className="space-y-4"><div className="flex items-center justify-between"><span className="text-[8px] font-bold text-slate-500 uppercase">Analysis Confidence</span><Badge className="bg-green-500 text-white border-none text-[7px] font-black uppercase h-4 px-1.5">OPTIMAL</Badge></div><Progress value={92} className="h-1 bg-white/10" /></div></CardContent></Card>
      </div>
    </div>
  );
}
