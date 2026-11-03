
"use client";

import React from "react";
import { 
  Bot, 
  Sparkles, 
  Loader2, 
  ChevronRight 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AIStrategistProps {
  aiGoal: string;
  setAiGoal: (v: string) => void;
  isAiLoading: boolean;
  onDraft: () => void;
}

export function AIStrategist({ aiGoal, setAiGoal, isAiLoading, onDraft }: AIStrategistProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="text-center space-y-4">
        <div className="h-16 w-16 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto border border-indigo-100 shadow-inner">
          <Bot className="h-8 w-8 text-indigo-600" />
        </div>
        <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase">AI Strategy Node</h3>
        <p className="text-sm text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">Tell me your campaign goal, and I'll draft a sateek (precise) Meta-compliant template for you.</p>
      </div>
      <Card className="border-none shadow-2xl bg-white rounded-[3rem] overflow-hidden p-10 sm:p-14 border border-border/50">
        <div className="space-y-10">
          <div className="space-y-4 text-left">
            <Label className="text-[11px] font-black uppercase text-primary ml-1 tracking-[0.2em]">Describe the sequence goal?</Label>
            <Textarea value={aiGoal} onChange={(e) => setAiGoal(e.target.value)} placeholder="e.g. Send a 10% discount to customers who haven't visited in 30 days." className="min-h-[140px] rounded-3xl bg-muted/20 border-none shadow-inner p-6 text-sm font-bold leading-relaxed" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            {[
              { label: "Birthday Surprise with Voucher", goal: "birthday_wish" },
              { label: "New Member Onboarding", goal: "onboarding" },
              { label: "Inactive User Win-back", goal: "retention" },
              { label: "High-Value Bill Gratitude", goal: "loyalty_thankyou" }
            ].map((prompt, i) => (
              <button key={i} onClick={() => setAiGoal(prompt.label)} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-left hover:bg-primary/5 hover:border-primary/20 transition-all group flex justify-between items-center">
                <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight group-hover:text-primary">{prompt.label}</p>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-all" />
              </button>
            ))}
          </div>
          <Button onClick={onDraft} disabled={isAiLoading || !aiGoal.trim()} className="w-full h-16 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all text-white">
            {isAiLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6 mr-3" />} Draft Content Node
          </Button>
        </div>
      </Card>
    </div>
  );
}
