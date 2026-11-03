
"use client";

import React from "react";
import { TrendingUp, Bot, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import Link from "next/link";

const revenueData = [
  { name: "Week 1", loyalty: 45000, organic: 20000 },
  { name: "Week 2", loyalty: 52000, organic: 18000 },
  { name: "Week 3", loyalty: 48000, organic: 22000 },
  { name: "Week 4", loyalty: 61000, organic: 25000 },
];

export function AnalyticsTab({ stats, currencySymbol }: { stats: any, currencySymbol: string }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
      <div className="lg:col-span-8">
        <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
          <CardHeader className="bg-muted/30 border-b py-5 px-8">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Revenue Contribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-8">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorLoyalty" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} />
                  <YAxis axisLine={false} tickLine={false} fontSize={10} />
                  <Tooltip />
                  <Area type="monotone" dataKey="loyalty" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorLoyalty)" strokeWidth={3} />
                  <Area type="monotone" dataKey="organic" stroke="#e2e8f0" fillOpacity={0.1} fill="#e2e8f0" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-4">
         <Card className="border-none shadow-xl bg-slate-900 text-white rounded-3xl p-8 space-y-6 text-left">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Bot className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-bold">Growth Strategy</h3>
            <p className="text-xs text-slate-400 leading-relaxed italic">"Loyalty revenue is up 15%. Recommend a specialized 'VIP Event' campaign this weekend to maximize returns."</p>
            <Button asChild className="w-full bg-accent text-primary font-black uppercase text-[10px] rounded-xl">
              <Link href="/loyalty/campaigns">Execute Strategy</Link>
            </Button>
         </Card>
      </div>
    </div>
  );
}
