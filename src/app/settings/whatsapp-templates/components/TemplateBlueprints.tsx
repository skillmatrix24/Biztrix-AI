"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Terminal,
  Palette,
  Bot,
  Sparkles,
  Loader2,
  Zap,
  Star,
  Ticket,
  Wand2,
  LayoutList,
  Info,
  BookOpen,
  Receipt,
  SmartphoneNfc,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { suggestAutomationTemplate } from "@/ai/flows/suggest-automation-template";

const STATIC_BLUEPRINTS = [
  {
    id: "pos_invoice_v3",
    name: "pos_invoice_v3",
    category: "UTILITY",
    purpose: "Full POS billing: complete financial breakdown and tracking link.",
    body: "Namaste {{1}}! Aapka Bill ID #{{2}} worth {{3}} successfully generate ho gaya hai. Aapne aaj {{4}} use karke total {{5}} ki bachat ki hai. Final payable: {{6}}. Rewards yahan check karein: {{7}}",
    successRate: "99%",
    icon: Receipt,
  },
  {
    id: "reward_sync_v3",
    name: "reward_sync_v3",
    category: "MARKETING",
    purpose: "Reward sync: acknowledgement of points and savings for bills.",
    body: "Namaste {{1}}! Aapka Bill #{{2}} successfully sync ho gaya hai aur aapne {{3}} earn kiye hain. Is visit par aapne {{4}} use kiya aur total {{5}} save kiye. Naya balance yahan dekhein: {{6}}",
    successRate: "98%",
    icon: SmartphoneNfc,
  },
  {
    id: "welcome_member",
    name: "welcome_member",
    category: "MARKETING",
    purpose: "Send a digital membership card right after enrollment.",
    body: "Namaste {{1}}! Welcome to {{2}} Club. Aapka digital membership card active ho gaya hai. Yahan check karein: {{3}}",
    successRate: "92%",
    icon: Ticket,
  },
  {
    id: "birthday_wish",
    name: "birthday_wish",
    category: "MARKETING",
    purpose: "Automated birthday wish with bonus wallet points.",
    body: "Happy Birthday {{1}}! Aapka din khaas banane ke liye humne aapke wallet mein {{2}} points add kar diye hain. Use code: {{3}}",
    successRate: "88%",
    icon: Star,
  },
];

const VARIABLE_PROTOCOL = [
  { id: "{{1}}", label: "Customer Name", desc: "Sanjay Gupta" },
  { id: "{{2}}", label: "ID / Identifier", desc: "Bill No / External Ref" },
  { id: "{{3}}", label: "Value / Reward", desc: "Rs 1,250 / 500 Pts" },
  { id: "{{4}}", label: "Coupon / Track", desc: "Offer Name or Link" },
  { id: "{{5}}", label: "Savings", desc: "Total Amount Saved" },
  { id: "{{6}}", label: "Net Payable", desc: "Final Amount" },
  { id: "{{7}}", label: "Digital Hub", desc: "Member Portal URL" },
];

interface TemplateBlueprintsProps {
  business: any;
  onUse: (bp: any) => void;
}

export function TemplateBlueprints({ business, onUse }: TemplateBlueprintsProps) {
  const [blueprintSearch, setBlueprintSearch] = useState("");
  const [blueprintCategory] = useState("all");

  const [aiGoal, setAiGoal] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<any[]>([]);

  const filteredBlueprints = useMemo(() => {
    return STATIC_BLUEPRINTS.filter((bp) => {
      const matchesSearch =
        bp.name.toLowerCase().includes(blueprintSearch.toLowerCase()) ||
        bp.purpose.toLowerCase().includes(blueprintSearch.toLowerCase());
      const matchesTab =
        blueprintCategory === "all" || bp.category === blueprintCategory;
      return matchesSearch && matchesTab;
    });
  }, [blueprintSearch, blueprintCategory]);

  const handleGenerateAI = async () => {
    if (!aiGoal.trim()) {
      toast({
        variant: "destructive",
        title: "Goal missing",
        description: "Please describe what you want to achieve.",
      });
      return;
    }
    setIsAiLoading(true);
    try {
      const result = await suggestAutomationTemplate({
        businessName: business?.name || "Our Store",
        ruleType:
          aiGoal +
          ". STRICT RULE: Use only numbered placeholders like {{1}}, {{2}} following the Standard Mapping Protocol.",
      });

      const suggestions = [
        {
          id: "ai_1",
          name: "ai_strategy_v1",
          category: "MARKETING",
          purpose: "Standard Protocol Response",
          body: result.template,
          successRate: "AI",
          icon: Bot,
        },
        {
          id: "ai_2",
          name: "ai_strategy_v2",
          category: "MARKETING",
          purpose: "Short & Impactful",
          body: "Namaste {{1}}! Aapke liye ek gift hai. Check here: {{2}}",
          successRate: "AI",
          icon: Zap,
        },
        {
          id: "ai_3",
          name: "ai_strategy_v3",
          category: "MARKETING",
          purpose: "Reminder Message",
          body: "Reminder: {{1}}, aapka reward point balance check karein: {{2}}",
          successRate: "AI",
          icon: Star,
        },
      ];

      setAiResults(suggestions);
      toast({
        title: "AI Blueprints Ready",
        description: "3 strategy variants generated with numbered variables.",
      });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "AI Error" });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left: Input & Lab */}
        <div className="space-y-6 lg:col-span-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white sm:p-8">
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                <Bot className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-white">
                  AI Blueprints Lab
                </h3>
                <p className="mt-1 text-xs text-slate-300">
                  Describe your campaign goal and generate Meta-compliant templates with numbered variables.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2 text-left">
                <Label className="text-xs font-semibold text-slate-200">
                  Campaign Objective / Goal
                </Label>
                <div className="relative">
                  <Wand2 className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <Textarea
                    value={aiGoal}
                    onChange={(e) => setAiGoal(e.target.value)}
                    placeholder="e.g. Birthday wish with 100 bonus points..."
                    className="min-h-[110px] rounded-xl border-white/15 bg-white/5 pl-10 text-sm text-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  "Welcome Member",
                  "Birthday Wish",
                  "Points Milestone",
                  "Expiry Alert",
                ].map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => setAiGoal(hint)}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/15"
                  >
                    {hint}
                  </button>
                ))}
              </div>

              <Button
                onClick={handleGenerateAI}
                disabled={isAiLoading || !aiGoal.trim()}
                className="h-11 w-full rounded-xl bg-white text-xs font-semibold text-slate-900 hover:bg-slate-100"
              >
                {isAiLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Numbered Blueprints
              </Button>
            </div>
          </div>

          {aiResults.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {aiResults.map((bp) => (
                <BlueprintCard key={bp.id} bp={bp} onUse={onUse} isAI />
              ))}
            </div>
          )}
        </div>

        {/* Right: Protocol Guide */}
        <div className="lg:col-span-4">
          <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100 px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BookOpen className="h-4 w-4 text-slate-600" /> Variable Protocol Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <p className="text-xs leading-relaxed text-slate-600">
                Meta templates require numbered variables in sequence. Map each placeholder as follows:
              </p>
              <div className="space-y-2">
                {VARIABLE_PROTOCOL.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {v.id}
                      </span>
                      <span className="text-xs font-medium text-slate-700">
                        {v.label}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Sample: {v.desc}
                    </p>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                <p className="text-xs leading-relaxed text-slate-600">
                  Always use sequential numbers. Generated drafts follow this mapping automatically.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Static Library */}
      <section className="space-y-4">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <LayoutList className="h-4 w-4 text-slate-500" />
            <h4 className="text-base font-semibold text-slate-900">
              Standard Template Library
            </h4>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search templates..."
              value={blueprintSearch}
              onChange={(e) => setBlueprintSearch(e.target.value)}
              className="h-10 rounded-xl border-slate-200 bg-white pl-9 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBlueprints.map((bp) => (
            <BlueprintCard key={bp.id} bp={bp} onUse={onUse} />
          ))}
        </div>
      </section>
    </div>
  );
}

function BlueprintCard({
  bp,
  onUse,
  isAI = false,
}: {
  bp: any;
  onUse: (bp: any) => void;
  isAI?: boolean;
}) {
  const Icon = bp.icon || Terminal;

  return (
    <Card
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border bg-white text-left",
        isAI ? "border-slate-900" : "border-slate-200"
      )}
    >
      <CardHeader
        className={cn(
          "border-b p-5",
          isAI
            ? "border-slate-100 bg-slate-50 text-slate-900"
            : "border-slate-800 bg-slate-900 text-white"
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <Badge
            variant="outline"
            className={cn(
              "rounded-md text-[11px] font-medium",
              isAI
                ? "border-slate-300 bg-white text-slate-800"
                : "border-white/20 bg-white/10 text-white"
            )}
          >
            {bp.category}
          </Badge>
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              isAI ? "bg-slate-900 text-white" : "bg-white/10 text-white"
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <CardTitle
          className={cn(
            "text-base font-semibold capitalize",
            isAI ? "text-slate-900" : "text-white"
          )}
        >
          {bp.name?.replace(/_/g, " ")}
        </CardTitle>
        <p
          className={cn(
            "mt-1 text-xs",
            isAI ? "text-slate-600" : "text-slate-300"
          )}
        >
          {bp.purpose}
        </p>
      </CardHeader>
      <CardContent className="flex-1 p-5">
        <p className="mb-2 text-xs font-semibold text-slate-700">
          Message Structure
        </p>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-700">
          &ldquo;{bp.body}&rdquo;
        </div>
      </CardContent>
      <CardFooter className="border-t border-slate-100 bg-slate-50/50 p-4">
        <Button
          onClick={() => onUse(bp)}
          className="h-10 w-full rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
        >
          <Palette className="mr-2 h-4 w-4" /> Load in Visual Designer
        </Button>
      </CardFooter>
    </Card>
  );
}
