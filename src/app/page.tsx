
"use client";

import { 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  ShoppingCart, 
  BarChart3, 
  MessageSquare, 
  Globe, 
  ScanLine, 
  Star,
  Users,
  Package,
  TrendingUp,
  MonitorSmartphone,
  ChevronRight,
  Bot,
  BrainCircuit,
  Sparkles,
  Receipt,
  Ticket,
  Gem,
  Building,
  Target,
  Clock,
  Check,
  MousePointer2,
  Users2,
  ListTodo,
  SmartphoneNfc,
  Briefcase,
  BadgeCheck,
  ShoppingBasket,
  Smartphone,
  IdCard,
  Layout,
  Heart,
  Palette,
  SearchCode,
  Handshake,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useUser } from "@/firebase/provider";
import { cn } from "@/lib/utils";

const CORE_MATRIX = [
  { icon: Receipt, title: "Smart Billing & GST", desc: "Enterprise-grade POS with automatic HSN/GST split and thermal print nodes.", suite: "Core OS" },
  { icon: ScanLine, title: "Vision AI Scanner", desc: "Photograph purchase bills to automatically update inventory and vendor ledgers.", suite: "Intelligence" },
  { icon: SmartphoneNfc, title: "WhatsApp Sequences", desc: "Automate nurturing with 3-step sequences for birthdays, expiry, and win-backs.", suite: "Growth" },
  { icon: Ticket, title: "Loyalty Portals", desc: "Digital membership cards and reward wallets for your customers to track live points.", suite: "Loyalty" },
  { icon: Building, title: "Real Estate Node", desc: "Manage property catalogs, map locations, and site-visit scheduling in one place.", suite: "Real Estate" },
  { icon: Briefcase, title: "Back Office Pro", desc: "Staff biometric payroll, project milestone tracking, and full vendor accounting.", suite: "Back Office" },
  { icon: Bot, title: "AI Advisor Bot", desc: "Conversational business advisor providing real-time data-backed Hinglish insights.", suite: "Intelligence" },
  { icon: Target, title: "Project Milestones", desc: "Advanced project dashboard for financial radar and client tracking portals.", suite: "Back Office" },
  { icon: ShoppingBasket, title: "Marketplace Hub", desc: "Modular add-ons that integrate seamlessly with your core business data nodes.", suite: "Platform" },
  { icon: Users2, title: "Staff Management", desc: "Comprehensive workforce directory with payroll logic and daily attendance logs.", suite: "Back Office" },
  { icon: Smartphone, title: "Mobile UI Designer", desc: "Role-based custom mobile interface settings for field agents and admin.", suite: "Core OS" },
  { icon: IdCard, title: "Global Identity", desc: "Unified customer registry with AI-powered payment risk and churn analysis.", suite: "Platform" },
];

export default function LandingPage() {
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-background font-body selection:bg-primary/10">
      
      {/* --- NAVIGATION --- */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-primary text-lg sm:text-xl">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <Bot className="h-5 w-5" />
            </div>
            <span className="tracking-tighter uppercase font-black">Biztrix AI</span>
          </div>
          <div className="hidden lg:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <a href="#matrix" className="hover:text-primary transition-colors">OS Matrix</a>
            <a href="#marketplace" className="hover:text-primary transition-colors">Marketplace</a>
            <a href="#intelligence" className="hover:text-primary transition-colors">Intelligence</a>
            <Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild className="bg-primary hover:bg-primary/90 text-white rounded-full px-4 sm:px-6 h-9 sm:h-10 text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg">
                <Link href="/dashboard">Control Center</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="text-[10px] font-black uppercase tracking-widest hidden sm:flex hover:text-primary h-9 sm:h-10">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild className="bg-primary hover:bg-primary/90 text-white rounded-full px-4 sm:px-6 h-9 sm:h-10 text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg">
                  <Link href="/signup">Join Trial</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative overflow-hidden pt-24 pb-16 lg:pt-48 lg:pb-32 px-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
        </div>
        
        <div className="max-w-7xl mx-auto text-center space-y-8 sm:space-y-12">
          <div className="space-y-4">
            <Badge variant="outline" className="py-1.5 px-4 rounded-full border-primary/20 bg-primary/5 text-primary text-[9px] font-black uppercase tracking-[0.2em] animate-fade-in">
              <Zap className="mr-2 h-3.5 w-3.5 fill-current" /> India's Most Intelligent Business OS
            </Badge>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-[1.1] max-w-5xl mx-auto uppercase">
              Run Your Entire Business on <span className="text-primary underline decoration-primary/10 underline-offset-8">Autopilot</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium">
              Biztrix AI replaces messy spreadsheets and disjointed apps with one unified Operating System. From billing and inventory to automated WhatsApp growth.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <Button asChild size="lg" className="h-14 sm:h-16 px-8 sm:px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm font-black uppercase tracking-[0.15em] shadow-2xl hover:scale-[1.02] transition-all w-full sm:w-auto">
              <Link href={user ? "/dashboard" : "/signup"}>Launch My Business Node <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 sm:h-16 px-8 sm:px-12 rounded-2xl border-border bg-white text-slate-900 text-xs sm:text-sm font-black uppercase tracking-[0.15em] hover:bg-slate-50 transition-all w-full sm:w-auto">
              <Link href="/pricing">View Pro Modules</Link>
            </Button>
          </div>

          <div className="relative max-w-5xl mx-auto px-2">
            <div className="absolute inset-0 bg-primary/20 blur-[100px] -z-10 rounded-full opacity-30 animate-pulse" />
            <div className="rounded-[2rem] sm:rounded-[3.5rem] border-[4px] sm:border-[12px] border-slate-900 bg-slate-900 shadow-2xl overflow-hidden shadow-primary/20 group">
              <img 
                src="https://picsum.photos/seed/biztrix-home/1200/800" 
                alt="Biztrix AI Command Center" 
                className="w-full h-auto object-cover opacity-95 group-hover:scale-[1.02] transition-transform duration-[2s]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* --- 360° OS MATRIX --- */}
      <section id="matrix" className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">The 360° OS Matrix</h2>
            <p className="text-slate-500 max-w-2xl mx-auto font-medium text-left sm:text-center">Modular power. Pay only for the suites your business needs to scale.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {CORE_MATRIX.map((f, i) => (
              <Card key={i} className="group border-none shadow-sm hover:shadow-2xl transition-all duration-500 rounded-[2.5rem] overflow-hidden bg-white ring-1 ring-slate-100 flex flex-col h-full text-left">
                <CardContent className="p-8 sm:p-10 flex flex-col h-full">
                  <div className={cn("h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 text-primary shadow-inner")}>
                    <f.icon className="h-7 w-7" />
                  </div>
                  <Badge variant="secondary" className="w-fit mb-4 bg-primary/5 text-primary border-none text-[8px] font-black uppercase h-5 px-2">{f.suite}</Badge>
                  <h3 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tight">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium flex-1">{f.desc}</p>
                  <div className="pt-8 border-t border-slate-50 mt-8 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-black uppercase text-primary">Learn Module</span>
                    <ChevronRight className="h-4 w-4 text-primary" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* --- AI INTELLIGENCE HIGHLIGHT --- */}
      <section id="intelligence" className="py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 opacity-10 rotate-12 -z-1">
          <BrainCircuit className="h-96 w-96 text-primary" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="space-y-10 text-left">
            <div className="space-y-6">
              <Badge className="bg-primary text-white border-none py-1.5 px-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                <Sparkles className="mr-2 h-4 w-4 fill-current" /> Gemini AI Integrated
              </Badge>
              <h2 className="text-4xl md:text-7xl font-black leading-[1.1] uppercase tracking-tighter">
                Cognitive <br /> <span className="text-primary">Decision</span> Node.
              </h2>
              <p className="text-lg text-slate-400 font-medium leading-relaxed">
                Biztrix AI isn't just a dashboard. It's a strategic partner that scans your data nodes to predict stockouts, identifies your highest intent leads, and drafts your marketing copy.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-8 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 hover:border-primary/40 transition-all group text-left">
                <Bot className="h-8 w-8 text-primary mb-6 group-hover:scale-110 transition-transform" />
                <h4 className="font-black text-sm uppercase tracking-widest mb-2">Morning Strategy Brief</h4>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">AI analyzes yesterday's performance to give you a sateek (precise) plan for today.</p>
              </div>
              <div className="p-8 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 hover:border-primary/40 transition-all group text-left">
                <Target className="h-8 w-8 text-primary mb-6 group-hover:scale-110 transition-transform" />
                <h4 className="font-black text-sm uppercase tracking-widest mb-2">Lead Intent Logic</h4>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">Real-time visitor scoring that flags "Hot Leads" in your CRM for immediate closing.</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full animate-pulse" />
            <Card className="border-none shadow-[0_50px_100px_-20px_rgba(12,131,179,0.4)] bg-white rounded-[3rem] p-8 sm:p-12 text-slate-900 space-y-10 animate-in fade-in zoom-in duration-1000">
               <div className="flex items-center gap-4 border-b pb-8">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <Sparkles className="h-8 w-8 fill-current" />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] font-black uppercase text-primary tracking-[0.2em] leading-none mb-2">AI Advisor Response</p>
                    <p className="text-lg font-bold text-slate-900 uppercase tracking-tight">Today's Operation Pulse</p>
                  </div>
               </div>
               <div className="space-y-8 text-left">
                  <p className="text-base sm:text-xl font-medium leading-relaxed italic text-slate-700">
                    "Namaste! Aaj aapke paas <span className="text-primary font-black">3 High-Priority</span> tasks hain. Wireless Mouse ka stock khatam ho raha hai, maine reorder draft kar diya hai. 2 hot leads follow-up ka intezar kar rahi hain."
                  </p>
                  <div className="space-y-4">
                     <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                       <span className="text-slate-400">Analysis Confidence</span>
                       <span className="text-green-600">98% Sateek</span>
                     </div>
                     <Progress value={98} className="h-1 bg-slate-100" />
                  </div>
               </div>
               <Button asChild className="w-full h-16 rounded-2xl bg-primary font-black uppercase text-xs tracking-[0.2em] shadow-xl group cursor-pointer">
                 <Link href="/ai-insights">Launch Advisor Hub <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" /></Link>
               </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* --- MARKETPLACE & PRO SUITES --- */}
      <section id="marketplace" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-6">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">The Growth Marketplace</h2>
            <p className="text-slate-500 max-w-3xl mx-auto font-medium text-lg leading-relaxed">
              Aapka business static nahi hai, toh aapka software kyun ho? 
              Explore **6 Strategic Revenue Bundles** and **14+ Specialized Individual Add-ons** to customize your node exactly how you scale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Zap, label: "Growth Suite", desc: "6-in-1 Combo for WhatsApp, Leads and ROI Tracking.", price: "999", type: "Bundle" },
              { icon: Building, label: "Property Pro", desc: "Real Estate catalog, site-visits and agent logic.", price: "1499", type: "Bundle" },
              { icon: Bot, label: "Intelligence Hub", desc: "Gemini AI, OCR scanner and predictive math.", price: "1499", type: "Bundle" },
            ].map((m, i) => (
              <Card key={i} className="border-none shadow-xl bg-slate-50 rounded-[2.5rem] p-8 space-y-6 hover:scale-[1.02] transition-all border border-border/50 text-left">
                <div className="flex justify-between items-start">
                  <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg"><m.icon className="h-7 w-7" /></div>
                  <Badge className="bg-primary text-white border-none text-[8px] font-black h-5 uppercase">{m.type}</Badge>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase">{m.label}</h3>
                  <p className="text-sm text-slate-500 mt-2 font-medium">{m.desc}</p>
                </div>
                <div className="pt-4 flex items-baseline gap-1 border-t border-slate-200">
                  <span className="text-2xl font-black text-slate-900">₹{m.price}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">/ Month</span>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-4">
             {[
               "Custom Branding", "Staff Payroll", "Project Hub", "Vendor Ledger", "QR Validator", "Manual Responders", "Payment Approvals", "Task SOPs"
             ].map((addon, i) => (
               <Badge key={i} variant="outline" className="h-10 px-6 rounded-xl border-primary/10 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all cursor-pointer">
                 <Check className="h-3 w-3 mr-2" /> {addon}
               </Badge>
             ))}
             <Badge className="h-10 px-6 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">+ 6 MORE</Badge>
          </div>
        </div>
      </section>

      {/* --- VERTICAL SOLUTIONS --- */}
      <section id="solutions" className="py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="text-center space-y-6">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">Niche OS Architectures</h2>
            <p className="text-slate-500 max-w-xl mx-auto font-medium">Standard software doesn't fit every business. We built specialized nodes.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Property Suite */}
            <Card className="border-none shadow-xl bg-white rounded-[3rem] overflow-hidden group border text-left">
              <CardContent className="p-0 flex flex-col md:flex-row h-full">
                <div className="md:w-1/2 relative overflow-hidden bg-primary/5">
                   <img src="https://picsum.photos/seed/realestate/600/800" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="Real Estate OS" />
                   <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
                   <Badge className="absolute top-6 left-6 bg-white text-primary border-none font-black text-[9px] px-3 h-6 uppercase shadow-lg">REAL ESTATE SUITE</Badge>
                </div>
                <div className="p-8 sm:p-12 md:w-1/2 space-y-8 flex flex-col justify-center text-left">
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black text-slate-900 uppercase leading-none">Property Catalog Node</h3>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium">Capture Khet, Plot, or Buildings with 20+ technical fields like Facing, Soil Type, and Road Access.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-primary" /><span className="text-[10px] font-black uppercase text-slate-600">Site-Visit Scheduling</span></div>
                    <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-primary" /><span className="text-[10px] font-black uppercase text-slate-600">Agent Reward Leaderboard</span></div>
                    <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-primary" /><span className="text-[10px] font-black uppercase text-slate-600">Public Property Portals</span></div>
                  </div>
                  <Button variant="outline" className="w-fit rounded-xl font-bold uppercase text-[9px] tracking-widest border-primary/20 text-primary">Explore Asset Hub</Button>
                </div>
              </CardContent>
            </Card>

            {/* Loyalty Suite */}
            <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[3rem] overflow-hidden group text-left">
              <CardContent className="p-0 flex flex-col md:flex-row h-full">
                <div className="md:w-1/2 relative overflow-hidden bg-accent/10">
                   <img src="https://picsum.photos/seed/loyalty/600/800" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="Loyalty OS" />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                   <Badge className="absolute top-6 left-6 bg-accent text-primary border-none font-black text-[9px] px-3 h-6 uppercase shadow-lg">LOYALTY HUB</Badge>
                </div>
                <div className="p-8 sm:p-12 md:w-1/2 space-y-8 flex flex-col justify-center text-left">
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black text-white uppercase leading-none">Membership Node</h3>
                    <p className="text-sm text-slate-400 leading-relaxed font-medium">Issue digital cards instantly. Let customers track points and wallet balance via a secure public URL.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-accent" /><span className="text-[10px] font-black uppercase text-slate-300">Tier-Based Multipliers</span></div>
                    <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-accent" /><span className="text-[10px] font-black uppercase text-slate-300">WhatsApp Reward Nudges</span></div>
                    <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-accent" /><span className="text-[10px] font-black uppercase text-slate-300">Birthday Automation Bot</span></div>
                  </div>
                  <Button variant="outline" className="w-fit rounded-xl font-bold uppercase text-[9px] tracking-widest border-white/20 text-white hover:bg-white/5">Launch Reward Node</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* --- PRICING CTA --- */}
      <section className="py-24 px-4">
        <Card className="max-w-5xl mx-auto border-none shadow-2xl bg-white rounded-[4rem] overflow-hidden border p-10 sm:p-20 text-center relative">
          <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12"><Zap className="h-60 w-60 text-primary" /></div>
          <div className="space-y-12 relative z-10">
            <div className="space-y-6">
              <h2 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase leading-none text-center">
                Ready to Join the <br /> <span className="text-primary italic">SaaS Revolution?</span>
              </h2>
              <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                No setup fees. No long-term contracts. Join thousands of businesses scaling their operations with Biztrix AI OS.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
              <Button asChild size="lg" className="h-20 px-12 rounded-[2rem] bg-primary text-white hover:bg-primary/90 text-sm font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all w-full sm:w-auto">
                <Link href="/signup">Start Free Trial <ArrowRight className="ml-3 h-6 w-6" /></Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="h-20 px-12 rounded-[2rem] text-slate-400 hover:text-primary text-sm font-black uppercase tracking-[0.2em] transition-all w-full sm:w-auto">
                <Link href="/pricing">Compare Plan Features</Link>
              </Button>
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              No credit card required • Instant Node Activation • 14 Day Global Access
            </p>
          </div>
        </Card>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-16 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex flex-col items-center md:items-start gap-6">
              <div className="flex items-center gap-3 font-black text-primary text-2xl tracking-tighter">
                <div className="h-10 w-10 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <Bot className="h-6 w-6" />
                </div>
                BIZTRIX AI
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed max-w-xs text-center md:text-left uppercase tracking-tight">
                India's First Intelligent Business Operating System for the Modern Entrepreneur.
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12 md:gap-24 text-center md:text-left">
               <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 text-left">Platform</h4>
                  <ul className="space-y-3 text-[11px] font-bold text-slate-400 uppercase tracking-tighter text-left">
                    <li><Link href="#matrix" className="hover:text-primary">OS Matrix</Link></li>
                    <li><Link href="/pricing" className="hover:text-primary">Marketplace</Link></li>
                    <li><Link href="/shop" className="hover:text-primary">Demo Store</Link></li>
                  </ul>
               </div>
               <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 text-left">Legal Node</h4>
                  <ul className="space-y-3 text-[11px] font-bold text-slate-400 uppercase tracking-tighter text-left">
                    <li><Link href="#" className="hover:text-primary">Privacy Policy</Link></li>
                    <li><Link href="#" className="hover:text-primary">Terms of Use</Link></li>
                    <li><Link href="#" className="hover:text-primary">SLA Agreement</Link></li>
                  </ul>
               </div>
               <div className="hidden sm:block space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 text-left">Connect</h4>
                  <ul className="space-y-3 text-[11px] font-bold text-slate-400 uppercase tracking-tighter text-left">
                    <li><Link href="#" className="hover:text-primary">WhatsApp Support</Link></li>
                    <li><Link href="#" className="hover:text-primary">Documentation</Link></li>
                  </ul>
               </div>
            </div>
          </div>
          
          <Separator className="opacity-50" />
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">© 2026 Biztrix AI Solutions • Secured Multi-tenant Architecture v3.5</p>
            <div className="flex items-center gap-6">
               <ShieldCheck className="h-5 w-5 text-green-600 opacity-40" />
               <BadgeCheck className="h-5 w-5 text-primary opacity-40" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
