
"use client";

import React, { use } from "react";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  Bot, 
  Sparkles, 
  Layout, 
  Terminal, 
  SmartphoneNfc,
  ChevronRight,
  BadgeCheck,
  Building,
  Target,
  Trophy,
  Users,
  IdCard,
  Ticket,
  LayoutDashboard,
  SearchCode,
  Briefcase,
  Headset,
  Wallet,
  Calculator,
  MessageSquare,
  Smartphone,
  Gem,
  LineChart,
  ShoppingBag,
  ListTodo,
  Users2,
  Lightbulb,
  ScanLine,
  Palette,
  Globe,
  Loader2,
  X,
  Info,
  ShieldAlert,
  Sun
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getModuleDetail } from "../../data";

const iconMap: Record<string, any> = {
  LayoutDashboard, SearchCode, Ticket, Users, IdCard, Zap, 
  Building, Target, Trophy, Bot, SmartphoneNfc, Briefcase, 
  Headset, Wallet, Calculator, MessageSquare, Smartphone, 
  Gem, LineChart, ShoppingBag, ListTodo, Users2, Lightbulb, 
  ScanLine, Palette, Globe, Sun
};

function DynamicIcon({ name, className }: { name: string, className?: string }) {
  const Icon = iconMap[name] || Bot;
  return <Icon className={className} />;
}

export default function ModuleFeaturePage(props: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = use(props.params);
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const detail = getModuleDetail(moduleId);
  const activeAddonIds = business?.activeAddonIds || [];
  const isActive = activeAddonIds.includes(moduleId);

  const handleActivate = () => {
    if (!user || user.isAnonymous) {
      toast({ title: "Login Required", description: "Please sign in to your business account." });
      return;
    }
    if (!business || !businessRef) return;

    const currentIds = business.activeAddonIds || [];
    if (currentIds.includes(moduleId)) return;

    const newIds = [...currentIds, moduleId];
    updateDocumentNonBlocking(businessRef, {
      activeAddonIds: newIds,
      updatedAt: new Date().toISOString()
    });
    
    toast({
      title: "Module Integrated",
      description: `This feature is now active on your plan.`,
    });
  };

  if (!detail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="h-10 w-10 text-red-600 mb-4" />
        <h1 className="text-xl font-bold uppercase">Module Node Not Found</h1>
        <Button asChild variant="outline" className="mt-6 rounded-xl">
          <Link href="/marketplace">Back to Marketplace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 text-left px-2 sm:px-4">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm border shrink-0">
          <Link href="/marketplace"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="text-left">
          <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary h-5 px-3 mb-1.5">Module Node Inspector</Badge>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 leading-none uppercase tracking-tight">{detail.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-8 space-y-12">
          {/* Hero Context */}
          <Card className="border-none shadow-2xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden p-8 sm:p-14 relative">
             <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                <ShieldCheck className="h-64 w-64 text-white" />
             </div>
             <div className="relative z-10 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                    <Sparkles className="h-7 w-7 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold uppercase tracking-tight">{detail.logicTitle}</h3>
                    <p className="text-accent text-[10px] font-bold uppercase tracking-widest mt-1">Platform Logic Node Verified</p>
                  </div>
                </div>
                <p className="text-base sm:text-xl text-slate-300 leading-relaxed font-medium italic">
                  "{detail.description}"
                </p>
             </div>
          </Card>

          {/* Core Feature Sections */}
          {detail.sections && (
            <section className="space-y-8 text-left">
              <div className="flex items-center gap-3 px-1">
                <Layout className="h-4 w-4 text-primary fill-primary" />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-primary">Operational Ecosystem</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {detail.sections.map((sec, i) => (
                  <div key={i} className="p-6 bg-white rounded-[2rem] border-2 border-border/40 hover:border-primary/20 transition-all shadow-sm space-y-4 group">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <DynamicIcon name={sec.icon} className="h-5 w-5" />
                      </div>
                      <h5 className="text-sm font-black uppercase text-slate-900 tracking-tight">{sec.title}</h5>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{sec.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Key Feature List */}
          {detail.features && (
            <section className="space-y-6 text-left">
              <div className="flex items-center gap-3 px-1">
                <Zap className="h-4 w-4 text-primary fill-primary" />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-primary">Capability Matrix</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {detail.features.map((feat, i) => (
                  <div key={i} className="flex items-start gap-4 p-5 bg-muted/20 rounded-2xl border border-transparent shadow-inner">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-tight leading-none">{feat}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Logic & Rules */}
          <section className="p-8 sm:p-12 bg-slate-50 rounded-[3rem] border border-border/50 space-y-10 text-left">
            <div className="flex items-center gap-3 px-1">
               <Terminal className="h-4 w-4 text-slate-900" />
               <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">System Protocols & Guidelines</h4>
            </div>
            <div className="space-y-8">
               {detail.rules.map((rule, i) => (
                 <div key={i} className="flex gap-6 text-left items-start group">
                    <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5 shadow-xl group-hover:scale-110 transition-transform">{i + 1}</div>
                    <p className="text-sm sm:text-base font-medium text-slate-600 leading-relaxed uppercase tracking-tight pt-1.5">{rule}</p>
                 </div>
               ))}
            </div>
          </section>

          {/* Backend Info */}
          <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 flex items-start gap-5 shadow-inner text-left">
            <ShieldCheck className="h-6 w-6 text-primary shrink-0 opacity-40 mt-0.5" />
            <div className="space-y-2">
               <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">Verified Backend Sync</p>
               <p className="text-xs text-primary/70 leading-relaxed font-medium italic">
                 "{detail.backend}"
               </p>
            </div>
          </div>
        </div>

        {/* Sidebar: Call to Action */}
        <div className="lg:col-span-4 space-y-8 sticky top-24">
          <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border">
             <CardHeader className="p-8 bg-muted/30 border-b text-left">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Action Node</CardTitle>
             </CardHeader>
             <CardContent className="p-8 space-y-8">
                <div className="text-left space-y-4">
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-tight">Deploy this suite to your tenant OS immediately.</p>
                  <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10 text-center">
                    <Badge className="bg-primary text-white text-[7px] font-black uppercase h-4 px-2 mb-2">LIMITED OFFER</Badge>
                    <p className="text-4xl font-black text-primary">14 Days</p>
                    <p className="text-[10px] font-bold text-primary/60 uppercase">FREE TRIAL ACCESS</p>
                  </div>
                </div>
                <Button 
                  onClick={handleActivate}
                  disabled={isActive}
                  className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl active:scale-95 transition-all"
                >
                  {isActive ? "ALREADY ACTIVE" : "ACTIVATE TRIAL"}
                </Button>
                <div className="space-y-4">
                   <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="text-[9px] font-black uppercase text-slate-400">Zero Setup Fee</span></div>
                   <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="text-[9px] font-black uppercase text-slate-400">Instant Node Sync</span></div>
                   <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="text-[9px] font-black uppercase text-slate-400">cancel anytime</span></div>
                </div>
             </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left p-8 space-y-4">
             <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm shrink-0">
                  <Info className="h-4 w-4" />
                </div>
                <h5 className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">Need a Demo?</h5>
             </div>
             <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">Connect with our engineering hub for a one-on-one walkthrough of this module's logic.</p>
             <Button variant="outline" className="w-full h-11 rounded-xl text-[9px] font-black uppercase border-primary/20 text-primary">Talk to Expert <ChevronRight className="ml-1 h-3 w-3" /></Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
