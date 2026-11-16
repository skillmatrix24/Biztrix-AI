"use client";

import { Crown, CheckCircle2, SmartphoneNfc } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { calculateGST } from "@/lib/mock-db";

interface TierGridProps {
  tiers: any[];
  selectedTierId: string;
  onSelect: (id: string) => void;
  currencySymbol: string;
  business: any;
}

export function TierGrid({
  tiers,
  selectedTierId,
  onSelect,
  currencySymbol,
  business,
}: TierGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tiers.map((tier: any) => {
        const breakdown = calculateGST(
          tier.minSpend || 0,
          tier.gstRate || 0,
          false,
          business?.gstMode || "exclusive"
        );
        const isSelected = selectedTierId === tier.id;
        return (
          <Card
            key={tier.id}
            className={cn(
              "bg-white rounded-2xl overflow-hidden border transition-colors flex flex-col h-full shadow-none",
              isSelected
                ? "border-primary ring-2 ring-primary/15"
                : "border-slate-200 hover:border-slate-300"
            )}
          >
            <div
              className="p-6 text-white flex flex-col justify-between min-h-[168px]"
              style={{ backgroundColor: tier.color || "#0C83B3" }}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="space-y-1">
                  <Badge className="bg-white/20 text-white border-none text-xs font-medium px-2.5 h-5">
                    Membership
                  </Badge>
                  <h3 className="text-xl font-bold tracking-tight">
                    {tier.name}
                  </h3>
                </div>
                <Crown
                  className={cn(
                    "h-7 w-7 shrink-0",
                    isSelected ? "text-white" : "text-white/50"
                  )}
                />
              </div>
              <div className="flex justify-between items-end pt-4">
                <div>
                  <p className="text-xs text-white/75">Total Fee (Incl. GST)</p>
                  <p className="text-2xl font-bold font-mono tabular-nums">
                    {currencySymbol}
                    {breakdown.lineTotal.toLocaleString()}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                  <SmartphoneNfc className="h-4 w-4" />
                </div>
              </div>
            </div>

            <CardContent className="p-6 space-y-5 flex-1 flex flex-col text-left">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs font-medium text-slate-500">Rewards</p>
                  <p className="text-sm font-bold text-primary font-mono tabular-nums mt-0.5">
                    {tier.pointsMultiplier}x Points
                  </p>
                </div>
                <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 text-center">
                  <p className="text-xs font-medium text-emerald-700">
                    Cashback
                  </p>
                  <p className="text-sm font-bold text-emerald-800 font-mono tabular-nums mt-0.5">
                    {tier.cashbackPercent}% Back
                  </p>
                </div>
              </div>
              <div className="space-y-2.5 flex-1 text-left">
                {(tier.benefits || []).slice(0, 4).map((b: string, i: number) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-xs font-medium text-slate-700 leading-snug">
                      {b}
                    </span>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                onClick={() => onSelect(tier.id)}
                className={cn(
                  "w-full h-11 rounded-xl font-semibold text-xs mt-2 transition-colors",
                  isSelected
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-800 hover:bg-primary hover:text-white"
                )}
              >
                {isSelected ? "Selected Plan" : "Select Membership"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
