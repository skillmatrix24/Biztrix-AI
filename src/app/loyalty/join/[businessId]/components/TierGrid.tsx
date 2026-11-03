
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

export function TierGrid({ tiers, selectedTierId, onSelect, currencySymbol, business }: TierGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {tiers.map((tier: any) => {
        const breakdown = calculateGST(tier.minSpend || 0, tier.gstRate || 0, false, business?.gstMode || 'exclusive');
        return (
          <Card 
            key={tier.id} 
            className={cn(
              "border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden border-4 transition-all flex flex-col h-full",
              selectedTierId === tier.id ? "border-primary ring-8 ring-primary/5 scale-[1.02]" : "border-transparent"
            )}
          >
            <div className="p-8 text-white relative overflow-hidden shrink-0 aspect-[1.8/1] flex flex-col justify-between" style={{ backgroundColor: tier.color || '#0C83B3' }}>
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />
                <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-white/20 blur-[60px]" />
              </div>
              <div className="relative z-10 flex justify-between items-start">
                <div className="space-y-1">
                  <Badge className="bg-white/20 text-white border-none text-[8px] font-black px-2 h-4 uppercase tracking-widest">MEMBERSHIP</Badge>
                  <h3 className="text-2xl font-black uppercase tracking-tight">{tier.name}</h3>
                </div>
                <Crown className={cn("h-10 w-10", selectedTierId === tier.id ? "text-white" : "text-white/30")} />
              </div>
              <div className="relative z-10 flex justify-between items-end">
                 <div className="space-y-1">
                    <p className="text-[7px] font-black uppercase opacity-60">Total Fee (Incl. GST)</p>
                    <p className="text-2xl font-black">{currencySymbol}{breakdown.lineTotal.toLocaleString()}</p>
                 </div>
                 <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md">
                    <SmartphoneNfc className="h-5 w-5" />
                 </div>
              </div>
            </div>

            <CardContent className="p-8 space-y-8 flex-1 flex flex-col text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-center">
                  <p className="text-[7px] font-black uppercase text-primary/60 mb-1">Rewards</p>
                  <p className="text-sm font-black text-primary">{tier.pointsMultiplier}X Points</p>
                </div>
                <div className="p-4 bg-green-50 rounded-2xl border border-green-100 text-center">
                  <p className="text-[7px] font-black uppercase text-green-600/60 mb-1">Cashback</p>
                  <p className="text-sm font-black text-green-700">{tier.cashbackPercent}% Back</p>
                </div>
              </div>
              <div className="space-y-3 flex-1 text-left">
                {(tier.benefits || []).slice(0, 4).map((b: string, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{b}</span>
                  </div>
                ))}
              </div>
              <Button 
                onClick={() => onSelect(tier.id)} 
                className={cn(
                  "w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl mt-6 transition-all",
                  selectedTierId === tier.id ? "bg-primary text-white scale-105" : "bg-muted text-muted-foreground hover:bg-primary hover:text-white"
                )}
              >
                Join Membership
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
