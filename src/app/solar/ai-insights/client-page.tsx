"use client";

import { useState, useMemo } from "react";
import { 
  Bot, 
  Sparkles, 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  Zap, 
  Target, 
  TrendingUp, 
  SmartphoneNfc, 
  ShieldCheck, 
  History,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Calculator,
  Briefcase,
  Gem,
  Package,
  BadgeCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { solarIntelligence, SolarIntelligenceOutput } from "@/ai/flows/solar-intelligence-flow";

export default function SolarAiInsightsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  // DATA NODES FOR AI CONTEXT
  const inquiriesQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'solarInquiries') : null, [firestore, businessId]);
  const { data: inquiries = [] } = useCollection<any>(inquiriesQuery);

  const surveysQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'solarSurveys') : null, [firestore, businessId]);
  const { data: surveys = [] } = useCollection<any>(surveysQuery);

  const designsQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'solarSystemDesigns') : null, [firestore, businessId]);
  const { data: designs = [] } = useCollection<any>(designsQuery);

  const quotesQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'quotations') : null, [firestore, businessId]);
  const { data: allQuotes = [] } = useCollection<any>(quotesQuery);
  const solarQuotes = useMemo(() => (allQuotes || []).filter((q: any) => q.solarSystemDesignId), [allQuotes]);

  const installationsQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'solarInstallations') : null, [firestore, businessId]);
  const { data: installations = [] } = useCollection<any>(installationsQuery);

  const commissionsQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'solarDealerCommissions') : null, [firestore, businessId]);
  const { data: commissions = [] } = useCollection<any>(commissionsQuery);

  const warrantiesQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'solarWarranties') : null, [firestore, businessId]);
  const { data: warranties = [] } = useCollection<any>(warrantiesQuery);

  const [isGenerating, setIsGenerating] = useState(false);
  const [insight, setInsight] = useState<SolarIntelligenceOutput | null>(null);

  const handleGenerate = async () => {
    if (!businessId) return;
    setIsGenerating(true);
    try {
      const result = await solarIntelligence({
        businessName: userProfile?.businessName || "Our Solar Business",
        metrics: {
          inquiries: {
            total: inquiries.length,
            new: inquiries.filter(i => i.status === 'NEW').length,
            qualified: inquiries.filter(i => i.status === 'QUALIFIED').length,
            lost: inquiries.filter(i => i.status === 'LOST').length
          },
          surveys: {
            total: surveys.length,
            pending: surveys.filter(s => s.status !== 'APPROVED').length,
            approved: surveys.filter(s => s.status === 'APPROVED').length
          },
          designs: {
            total: designs.length,
            approved: designs.filter(d => d.status === 'APPROVED').length
          },
          quotes: {
            total: solarQuotes.length,
            accepted: solarQuotes.filter(q => q.status === 'converted').length,
            pendingValue: solarQuotes.filter(q => q.status === 'sent').reduce((sum, q) => sum + (q.totals?.finalPayout || 0), 0),
            acceptedValue: solarQuotes.filter(q => q.status === 'converted').reduce((sum, q) => sum + (q.totals?.finalPayout || 0), 0)
          },
          installations: {
            total: installations.length,
            active: installations.filter(i => i.status !== 'HANDED_OVER').length,
            completed: installations.filter(i => i.status === 'HANDED_OVER').length,
            totalKw: installations.filter(i => i.status === 'HANDED_OVER').reduce((sum, i) => sum + (parseFloat(i.capacityKw) || 0), 0)
          },
          commissions: {
            pending: commissions.filter(c => c.status !== 'PAID').length,
            paid: commissions.filter(c => c.status === 'PAID').length
          },
          warranties: {
            active: warranties.filter(w => w.status === 'ACTIVE').length,
            claims: 0 // Placeholder
          }
        }
      });
      setInsight(result);
      toast({ title: "Intelligence Synced", description: "Business node interpretation complete." });
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "AI Offline", description: "Could not establish cognitive handshake." });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 text-left px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm border shrink-0"><Link href="/solar"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="text-left">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase leading-none">Intelligence Command</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1.5 opacity-60">Cognitive Business Logic v3.5</p>
          </div>
        </div>
        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating} 
          className="bg-primary hover:bg-primary/90 shadow-xl h-12 px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white active:scale-95 transition-all"
        >
          {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
          Run Deep Strategy Scan
        </Button>
      </div>

      {!insight && !isGenerating && (
        <Card className="border-none shadow-xl bg-white rounded-[3rem] p-16 text-center border space-y-8 animate-in zoom-in-95 duration-700">
           <div className="h-24 w-24 rounded-[2.5rem] bg-primary/5 flex items-center justify-center mx-auto text-primary border-2 border-dashed border-primary/20">
              <Bot className="h-10 w-10 opacity-30" />
           </div>
           <div className="space-y-3">
              <h3 className="text-2xl font-black text-slate-900 uppercase">Awaiting Cognitive Input</h3>
              <p className="text-muted-foreground text-sm font-medium max-w-sm mx-auto leading-relaxed">Gemini is ready to scan your sales funnel, installation velocity, and dealer performance. Launch the scan to begin.</p>
           </div>
           <Button onClick={handleGenerate} variant="outline" className="h-11 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest border-primary/20 text-primary">Start Analyzing <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </Card>
      )}

      {isGenerating && (
        <div className="py-20 flex flex-col items-center justify-center space-y-8 animate-pulse">
           <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-[50px] rounded-full" />
              <div className="h-20 w-20 rounded-[2rem] bg-white border-2 border-primary/20 flex items-center justify-center relative z-10">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
           </div>
           <div className="text-center space-y-2">
              <p className="text-xl font-black text-primary uppercase">Analyzing Production Nodes...</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">Establishing secure Gemini context v3.5</p>
           </div>
        </div>
      )}

      {insight && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
          <div className="lg:col-span-8 space-y-8">
            {/* MANAGEMENT SUMMARY */}
            <Card className="border-none shadow-2xl bg-slate-900 text-white rounded-[2.5rem] p-8 sm:p-12 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12"><ShieldCheck className="h-64 w-64 text-white" /></div>
               <div className="relative z-10 space-y-8 text-left">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner shrink-0">
                       <Bot className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                       <h3 className="text-lg font-black uppercase text-accent leading-none">Management Brief</h3>
                       <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Hinglish Cognitive Insight</p>
                    </div>
                  </div>
                  <p className="text-base sm:text-2xl font-medium leading-relaxed italic text-slate-200">
                    "{insight.summary}"
                  </p>
                  <Separator className="bg-white/10" />
                  <div className="flex items-center gap-3">
                     <BadgeCheck className="h-4 w-4 text-green-400" />
                     <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Verified Against Production Data Nodes</span>
                  </div>
               </div>
            </Card>

            {/* DETAILED CATEGORIES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
               {Object.entries(insight.categories).map(([key, value]) => (
                 <Card key={key} className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left group hover:shadow-xl transition-all">
                    <CardHeader className="bg-primary/5 border-b py-5 px-8 flex flex-row items-center justify-between">
                       <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                          {key === 'sales' ? <TrendingUp className="h-4 w-4" /> : 
                           key === 'operations' ? <Briefcase className="h-4 w-4" /> : 
                           key === 'financials' ? <Calculator className="h-4 w-4" /> : <Gem className="h-4 w-4" />}
                          {key} Node
                       </CardTitle>
                       <Badge variant="outline" className={cn("text-[7px] h-4 px-1.5 border-none shadow-sm font-black", value.confidence === 'high' ? 'bg-green-100 text-green-700' : 'bg-orange-50 text-orange-600')}>{value.confidence} Conf.</Badge>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6 text-left">
                       <div className="space-y-4">
                          <p className="text-sm font-bold text-slate-900 leading-tight">"{value.insight}"</p>
                          <div className="p-4 bg-muted/20 rounded-2xl space-y-1.5 shadow-inner">
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Supporting Metrics</p>
                             <p className="text-[10px] font-medium text-slate-600">{value.support}</p>
                          </div>
                       </div>
                       <Separator className="opacity-40" />
                       <div className="space-y-3">
                          <p className="text-[9px] font-black uppercase text-primary tracking-widest flex items-center gap-2"><CheckCircle2 className="h-3 w-3" /> Recommended Action</p>
                          <p className="text-xs font-bold text-slate-700 leading-relaxed uppercase">{value.recommendation}</p>
                       </div>
                    </CardContent>
                 </Card>
               ))}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8 text-left">
             <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
                <CardHeader className="bg-muted/30 border-b py-6 px-8 text-left">
                   <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                     <History className="h-4 w-4" /> Cognitive Protocol
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6 text-left">
                   <div className="flex gap-4 items-start text-left">
                      <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] shrink-0">1</div>
                      <div className="space-y-1 text-left">
                         <p className="text-xs font-black uppercase text-slate-900">Tenant Isolation</p>
                         <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">Context is strictly limited to authorized business data nodes only.</p>
                      </div>
                   </div>
                   <div className="flex gap-4 items-start text-left">
                      <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] shrink-0">2</div>
                      <div className="space-y-1 text-left">
                         <p className="text-xs font-black uppercase text-slate-900">Data Grounding</p>
                         <p className="text-[11px] text-muted-foreground font-medium leading-relaxed uppercase tracking-tighter">AI interprets real metrics from Inquiries, Quotes, and Installations registry.</p>
                      </div>
                   </div>
                </CardContent>
             </Card>

             <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 flex items-start gap-4 shadow-inner text-left">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 opacity-40 mt-0.5" />
                <div className="space-y-1 text-left">
                   <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">Security Node</p>
                   <p className="text-[10px] text-primary/70 leading-relaxed font-medium italic mt-2 uppercase tracking-tighter text-left">"AI Insights are read-only. No automated writes or transaction modifications are executed by the LLM node."</p>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
