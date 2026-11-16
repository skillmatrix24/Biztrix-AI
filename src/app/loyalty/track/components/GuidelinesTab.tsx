"use client";

import React from "react";
import { FileText } from "lucide-react";
import { SectionCard } from "@/components/ui/editorial";

interface GuidelinesTabProps {
  rules: string;
}

export function GuidelinesTab({ rules }: GuidelinesTabProps) {
  const parsedRules = (rules || "Standard program rules apply.")
    .split("\n")
    .filter((l: string) => l.trim() !== "");

  return (
    <div className="text-left">
      <SectionCard
        title="Membership Rules & Policy"
        description="Terms and conditions for reward accrual and redemption."
        className="max-w-4xl mx-auto"
        headerRight={
          <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-primary">
            <FileText className="h-5 w-5" />
          </div>
        }
      >
        <div className="space-y-4">
          {parsedRules.map((rule: string, i: number) => (
            <div
              key={i}
              className="flex gap-4 items-start p-4 rounded-xl border border-slate-100 bg-slate-50/50"
            >
              <div className="h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-primary shrink-0 font-mono tabular-nums">
                {i + 1}
              </div>
              <p className="text-sm font-medium text-slate-700 leading-relaxed flex-1 pt-0.5">
                {rule}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
