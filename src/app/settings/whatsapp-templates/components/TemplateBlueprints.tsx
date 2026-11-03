

"use client";

import React, { useState, useMemo } from "react";
import { 
  Search, 
  Filter, 
  Terminal, 
  Palette,
  Bot,
  Sparkles,
  Loader2,
  ChevronRight,
  Zap,
  Star,
  Ticket,
  Wand2,
  LayoutList,
  Info,
  BookOpen,
  Receipt,
  SmartphoneNfc
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    purpose: "Full POS Billing: Complete financial breakdown and tracking link.",
    body: "Namaste {{1}}! 🙏 Aapka Bill ID #{{2}} worth {{3}} successfully generate ho gaya hai. Aapne aaj {{4}} use karke total {{5}} ki bachat ki hai. Final payable: {{6}}. Rewards yahan check karein: {{7}}",
    successRate: "99%",
    icon: Receipt
  },
  {
    id: "reward_sync_v3",
    name: "reward_sync_v3",
    category: "MARKETING",
    purpose: "Reward Sync Only: Acknowledgement of points and savings for external bills.",
    body: "Namaste {{1}}! 🎁 Aapka Bill #{{2}} successfully sync ho gaya hai aur aapne {{3}} earn kiye hain. Is visit par aapne {{4}} use kiya aur total {{5}} save kiye. Naya balance yahan dekhein: {{6}}",
    successRate: "98%",
    icon: SmartphoneNfc
  },
  {
    id: "welcome_member",
    name: "welcome_member",
    category: "MARKETING",
    purpose: "Naye enrollment ke baad digital card bhejne ke liye.",
    body: "Namaste {{1}}! Welcome to {{2}} Club. Aapka digital membership card active ho gaya hai. Yahan check karein: {{3}}",
    successRate: "92%",
    icon: Ticket
  },
  {
    id: "birthday_wish",
    name: "birthday_wish",
    category: "MARKETING",
    purpose: "Birthday trigger ke liye sateek wish.",
    body: "Happy Birthday {{1}}! 🎂 Aapka din khaas banane ke liye humne aapke wallet mein {{2}} points add kar diye hain. Use code: {{3}}",
    successRate: "88%",
    icon: Star
  }
];

const VARIABLE_PROTOCOL = [
  { id: '{{1}}', label: 'Customer Name', desc: 'Sanjay Gupta' },
  { id: '{{2}}', label: 'ID / Identifier', desc: 'Bill No / External Ref' },
  { id: '{{3}}', label: 'Value / Reward', desc: '₹1,250 / 500 Pts' },
  { id: '{{4}}', label: 'Coupon / Track', desc: 'Offer Name or Link' },
  { id: '{{5}}', label: 'Savings Node', desc: 'Total Amount Saved' },
  { id: '{{6}}', label: 'Net Payable', desc: 'Final Amount' },
  { id: '{{7}}', label: 'Digital Hub', desc: 'Member Portal URL' },
];

interface TemplateBlueprintsProps {
  business: any;
  onUse: (bp: any) => void;
}

export function TemplateBlueprints({ business, onUse }: TemplateBlueprintsProps) {
  const [blueprintSearch, setBlueprintSearch] = useState("");
  const [blueprintCategory, setBlueprintCategory] = useState("all");
  
  // AI State
  const [aiGoal, setAiGoal] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<any[]>([]);

  const filteredBlueprints = useMemo(() => {
    return STATIC_BLUEPRINTS.filter((bp) => {
      const matchesSearch = bp.name.toLowerCase().includes(blueprintSearch.toLowerCase()) || 
                           bp.purpose.toLowerCase().includes(blueprintSearch.toLowerCase());
      const matchesTab = blueprintCategory === "all" || bp.category === blueprintCategory;
      return matchesSearch && matchesTab;
    });
  }, [blueprintSearch, blueprintCategory]);

  const handleGenerateAI = async () => {
    if (!aiGoal.trim()) {
      toast({ variant: "destructive", title: "Goal Missing", description: "Please describe what you want to achieve." });
      return;
    }
    setIsAiLoading(true);
    try {
      const result = await suggestAutomationTemplate({
        businessName: business?.name || "Our Store",
        ruleType: aiGoal + ". STRICT RULE: Use only numbered placeholders like {{1}}, {{2}} following the Standard Mapping Protocol.",
      });
      
      const suggestions = [
        { id: 'ai_1', name: 'ai_strategy_v1', category: 'MARKETING', purpose: 'Standard Protocol Response', body: result.template, successRate: 'AI', icon: Bot },
        { id: 'ai_2', name: 'ai_strategy_v2', category: 'MARKETING', purpose: 'Short & Impactful', body: `Namaste {{1}}! Aapke liye ek gift hai. Check here: {{2}}`, successRate: 'AI', icon: Zap },
        { id: 'ai_3', name: 'ai_strategy_v3', category: 'MARKETING', purpose: 'Reminder Node', body: `Urgent Alert! ⚡ {{1}}, aapka reward point balance check karein: {{2}}`, successRate: 'AI', icon: Star }
      ];
      
      setAiResults(suggestions);
      toast({ title: "AI Blueprints Ready", description: "3 strategy variants generated with Numbered Logic." });
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "AI Error" });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Input & Lab */}
        <div className="lg:col-span-8 space-y-10">
          <section className="space-y-8">
            <div className="text-center sm:text-left space-y-3 px-2">
              <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-inner">
                <Bot className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">AI Blueprints Lab</h3>
              <p className="text-sm text-muted-foreground font-medium max-w-lg">Enter a goal, and Gemini will generate Meta-compliant Numbered Blueprints.</p>
            </div>

            <Card className="border-none shadow-2xl bg-slate-900 text-white rounded-[3rem] overflow-hidden p-8 sm:p-10 border-4 border-primary/20">
              <div className="space-y-8">
                <div className="space-y-4 text-left">
                  <Label className="text-[11px] font-black uppercase text-accent ml-1 tracking-[0.2em]">Campaign Objective / Goal</Label>
                  <div className="relative">
                    <Wand2 className="absolute left-4 top-4 h-5 w-5 text-accent opacity-40" />
                    <Textarea 
                      value={aiGoal} 
                      onChange={(e) => setAiGoal(e.target.value)} 
                      placeholder="e.g. Birthday wish with 100 bonus points..." 
                      className="min-h-[120px] rounded-[2rem] bg-white/5 border-white/10 text-white p-6 pl-12 text-sm font-medium leading-relaxed focus-visible:ring-accent placeholder:text-white/20" 
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {["Welcome Member", "Birthday Wish", "Points Milestone", "Expiry Alert"].map((hint) => (
                    <button 
                      key={hint} 
                      onClick={() => setAiGoal(hint)}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10 hover:text-accent transition-all"
                    >
                      {hint}
                    </button>
                  ))}
                </div>

                <Button 
                  onClick={handleGenerateAI} 
                  disabled={isAiLoading || !aiGoal.trim()} 
                  className="w-full h-16 bg-accent text-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all"
                >
                  {isAiLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6 mr-3" />} 
                  Engineer Numbered Blueprints
                </Button>
              </div>
            </Card>

            {aiResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-700">
                {aiResults.map((bp) => (
                  <BlueprintCard key={bp.id} bp={bp} onUse={onUse} isAI />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right: Protocol Guide */}
        <div className="lg:col-span-4 space-y-8">
           <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border">
              <CardHeader className="bg-primary/5 border-b py-6 px-8">
                 <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <BookOpen className="h-4 w-4" /> Variable Protocol Guide
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                 <p className="text-[10px] text-muted-foreground font-bold uppercase leading-relaxed">
                   Meta Templates require strictly Numbered variables. Use this standard for perfect system mapping:
                 </p>
                 <div className="space-y-4">
                    {VARIABLE_PROTOCOL.map((v) => (
                      <div key={v.id} className="p-4 bg-muted/20 rounded-2xl border border-transparent hover:border-primary/20 transition-all group">
                         <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-black text-primary font-mono">{v.id}</span>
                            <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-primary">{v.label}</span>
                         </div>
                         <p className="text-[9px] italic text-slate-500 font-medium">Sample: {v.desc}</p>
                      </div>
                    ))}
                 </div>
                 <Separator className="opacity-40" />
                 <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-2xl">
                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[9px] text-primary/70 font-bold uppercase leading-relaxed">
                      Always use numbers in order. AI Lab will automatically follow this sequence.
                    </p>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* STATIC REGISTRY SECTION */}
      <section className="space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-1 text-left">
          <div className="flex items-center gap-3">
            <LayoutList className="h-5 w-5 text-slate-400" />
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">Industry Standard Library</h4>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
              <Input placeholder="Search use-case..." value={blueprintSearch} onChange={(e) => setBlueprintSearch(e.target.value)} className="h-11 pl-10 rounded-xl bg-white border-none shadow-inner text-xs font-bold w-full" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredBlueprints.map((bp) => (
            <BlueprintCard key={bp.id} bp={bp} onUse={onUse} />
          ))}
        </div>
      </section>
    </div>
  );
}

function BlueprintCard({ bp, onUse, isAI = false }: { bp: any, onUse: (bp: any) => void, isAI?: boolean }) {
  const Icon = bp.icon || Terminal;
  
  return (
    <Card className={cn(
      "border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border group hover:shadow-2xl transition-all flex flex-col h-full text-left",
      isAI && "ring-2 ring-accent"
    )}>
      <CardHeader className={cn("p-8 shrink-0 text-left", isAI ? "bg-accent/10" : "bg-slate-900 text-white")}>
        <div className="flex items-center justify-between mb-4">
          <Badge className={cn("text-[8px] font-black h-5 px-3 uppercase tracking-widest border-none", bp.category === 'MARKETING' ? 'bg-orange-500 text-white' : 'bg-primary text-white')}>{bp.category} NODE</Badge>
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shadow-inner", isAI ? "bg-primary text-white" : "bg-white/10")}>
             <Icon className="h-4 w-4" />
          </div>
        </div>
        <CardTitle className={cn("text-xl font-bold tracking-tight uppercase", isAI ? "text-primary" : "text-white")}>{bp.name?.replace(/_/g, ' ')}</CardTitle>
        <p className={cn("text-[10px] font-bold uppercase tracking-widest mt-1", isAI ? "text-primary/60" : "text-slate-400")}>{bp.purpose}</p>
      </CardHeader>
      <CardContent className="p-8 space-y-6 text-left flex-1 text-left">
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase text-primary tracking-widest">Logic Structure</p>
          <div className="p-5 bg-muted/20 rounded-2xl border border-transparent font-medium text-xs text-slate-700 leading-relaxed italic">
            "{bp.body}"
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/10 p-6 border-t mt-auto">
        <Button onClick={() => onUse(bp)} className="w-full h-12 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
          <Palette className="mr-2 h-4 w-4" /> Load to Visual Designer
        </Button>
      </CardFooter>
    </Card>
  );
}

