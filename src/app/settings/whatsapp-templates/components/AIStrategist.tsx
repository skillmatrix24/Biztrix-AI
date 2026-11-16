"use client";

import React from "react";
import { Bot, Sparkles, Loader2, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AIStrategistProps {
  aiGoal: string;
  setAiGoal: (v: string) => void;
  isAiLoading: boolean;
  onDraft: () => void;
}

export function AIStrategist({
  aiGoal,
  setAiGoal,
  isAiLoading,
  onDraft,
}: AIStrategistProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
          <Bot className="h-6 w-6 text-slate-700" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900">
          AI Strategy Assistant
        </h3>
        <p className="mx-auto max-w-md text-sm text-slate-600">
          Describe your campaign goal to draft a Meta-compliant template.
        </p>
      </div>

      <Card className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="space-y-6">
          <div className="space-y-2 text-left">
            <Label className="text-xs font-semibold text-slate-700">
              Campaign Sequence Goal
            </Label>
            <Textarea
              value={aiGoal}
              onChange={(e) => setAiGoal(e.target.value)}
              placeholder="e.g. Send a 10% discount to customers who haven't visited in 30 days."
              className="min-h-[120px] rounded-xl border-slate-200 bg-slate-50 p-4 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
            {[
              { label: "Birthday Surprise with Voucher", goal: "birthday_wish" },
              { label: "New Member Onboarding", goal: "onboarding" },
              { label: "Inactive User Win-back", goal: "retention" },
              { label: "High-Value Bill Gratitude", goal: "loyalty_thankyou" },
            ].map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setAiGoal(prompt.label)}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-100"
              >
                <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                  {prompt.label}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700" />
              </button>
            ))}
          </div>

          <Button
            onClick={onDraft}
            disabled={isAiLoading || !aiGoal.trim()}
            className="h-11 w-full rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
          >
            {isAiLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Draft Content
          </Button>
        </div>
      </Card>
    </div>
  );
}
