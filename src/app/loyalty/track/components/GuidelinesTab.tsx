
"use client";

import React from "react";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface GuidelinesTabProps {
  rules: string;
}

export function GuidelinesTab({ rules }: GuidelinesTabProps) {
  return (
    <div className="space-y-10 animate-in fade-in text-left">
      <Card className="max-w-4xl mx-auto border-none shadow-2xl bg-white rounded-[2rem] sm:rounded-[3rem] overflow-hidden border p-6 sm:p-12 lg:p-16">
        <div className="space-y-8 sm:space-y-10 text-left">
            <div className="flex items-center gap-4 sm:gap-5 text-left">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><FileText className="h-6 w-6 sm:h-7 sm:w-7" /></div>
              <div className="text-left">
                <h4 className="text-sm sm:text-lg font-black uppercase text-slate-900 tracking-widest leading-none">Membership Rules & Policy</h4>
                <p className="text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-2">Terms and conditions for reward accrual</p>
              </div>
            </div>
            <Separator className="opacity-40" />
            <div className="space-y-6 sm:space-y-8">
              {(rules || "Standard program rules apply.").split('\n').filter((l: string) => l.trim() !== '').map((rule: string, i: number) => (
                <div key={i} className="flex gap-4 sm:gap-8 group text-left">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-slate-50 border border-border flex items-center justify-center text-[10px] sm:text-xs font-black text-primary shrink-0 transition-all group-hover:bg-primary group-hover:text-white group-hover:scale-110 shadow-sm">{i + 1}</div>
                  <p className="text-xs sm:text-base font-medium text-slate-600 leading-relaxed uppercase tracking-tight text-left flex-1 pt-1.5">{rule}</p>
                </div>
              ))}
            </div>
        </div>
      </Card>
    </div>
  );
}
