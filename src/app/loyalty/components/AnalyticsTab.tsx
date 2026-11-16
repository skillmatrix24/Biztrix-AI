"use client";

import React from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/editorial";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import Link from "next/link";

const revenueData = [
  { name: "Week 1", loyalty: 45000, organic: 20000 },
  { name: "Week 2", loyalty: 52000, organic: 18000 },
  { name: "Week 3", loyalty: 48000, organic: 22000 },
  { name: "Week 4", loyalty: 61000, organic: 25000 },
];

export function AnalyticsTab({ stats, currencySymbol }: { stats: any; currencySymbol: string }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      <div className="lg:col-span-8">
        <SectionCard
          title="Revenue Contribution"
          description={`Member billing contribution (${currencySymbol}${stats.loyaltyRevenueMonth?.toLocaleString() || 0}) vs walk-in sales.`}
        >
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorLoyalty" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.14} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} />
                <YAxis axisLine={false} tickLine={false} fontSize={11} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="loyalty"
                  stroke="#0f172a"
                  fillOpacity={1}
                  fill="url(#colorLoyalty)"
                  strokeWidth={2.5}
                />
                <Area
                  type="monotone"
                  dataKey="organic"
                  stroke="#cbd5e1"
                  fillOpacity={0.1}
                  fill="#cbd5e1"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
      <div className="lg:col-span-4">
        <div className="rounded-2xl bg-slate-900 text-white p-6 space-y-5 text-left h-full flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">Growth Strategy</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Rewarded member billing drives stronger repeat visits. Launch a targeted weekend VIP campaign to bring dormant members back to the counter.
            </p>
          </div>
          <Button asChild className="w-full h-10 bg-white text-slate-900 hover:bg-slate-100 font-semibold text-xs rounded-xl">
            <Link href="/loyalty/campaigns">Launch Campaign</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
