
"use client";

import { useState } from "react";
import { 
  Check, 
  Zap, 
  Sparkles, 
  SmartphoneNfc, 
  ShoppingBag, 
  Bot, 
  ShieldCheck, 
  ArrowRight, 
  ChevronDown,
  Star,
  Globe,
  Wallet,
  Users2,
  Package,
  Receipt,
  ScanLine,
  Lock,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { cn } from "@/lib/utils";

const CORE_FEATURES = [
  { name: "Smart Billing & GST", icon: Receipt },
  { name: "Master Inventory", icon: Package },
  { name: "CRM & Lead Pipeline", icon: Users2 },
  { name: "Customer Directory", icon: Star },
  { name: "Vendor Management", icon: Globe },
  { name: "Daily Cash Book", icon: Wallet },
  { name: "Fixed Expenses", icon: Zap },
];

const MARKETPLACE_MODULES = [
  { 
    id: "ai", 
    name: "AI Advisor Pro", 
    desc: "Predictive growth math and pricing suggestions powered by Gemini.", 
    price: "399", 
    icon: Bot, 
    color: "bg-blue-500",
    isPopular: true 
  },
  { 
    id: "wa", 
    name: "WhatsApp Flows", 
    desc: "Automated payment reminders and marketing sequences via official API.", 
    price: "499", 
    icon: SmartphoneNfc, 
    color: "bg-green-500" 
  },
  { 
    id: "store", 
    name: "E-commerce Builder", 
    desc: "Turn inventory into a live storefront with custom domain and WA ordering.", 
    price: "799", 
    icon: ShoppingBag, 
    color: "bg-orange-500" 
  },
  { 
    id: "scan", 
    name: "AI Bill Scanner", 
    desc: "Scan purchase bills to update stock automatically using OCR.", 
    price: "299", 
    icon: ScanLine, 
    color: "bg-primary" 
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white font-body">
      {/* 1. HERO SECTION */}
      <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden border-b bg-slate-50">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 text-center space-y-6">
          <Badge className="bg-primary/10 text-primary border-none py-1.5 px-4 rounded-full text-[10px] font-bold uppercase tracking-widest">
            Simple Modular Pricing
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.1] max-w-3xl mx-auto">
            Scale your OS as you <span className="text-primary">grow.</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Start with the core Operating System for free. Only pay for the advanced intelligence and automation modules your business needs.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Button asChild size="lg" className="h-14 px-10 rounded-full bg-primary hover:bg-primary/90 text-white font-bold shadow-xl">
              <Link href="/signup">Start 14-Day Free Trial</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 2. THE CORE OS PLAN */}
      <section className="py-24 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">The Core OS Plan</h2>
              <p className="text-slate-600">Everything you need to digitize your shop. Professional, multi-tenant, and high-performance.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {CORE_FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-primary/20 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary shrink-0">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-slate-700 text-sm uppercase tracking-tight">{f.name}</span>
                  <Check className="ml-auto h-4 w-4 text-green-500" />
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7">
            <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-slate-900 text-white relative">
              <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12">
                <Zap className="h-64 w-64 text-white" />
              </div>
              <CardHeader className="p-10 pb-6 relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className="bg-accent text-primary font-black px-3 mb-2">LIMITED TIME</Badge>
                    <CardTitle className="text-4xl font-bold">Free Trial</CardTitle>
                    <CardDescription className="text-slate-400 mt-2 text-base">Full access to the Core OS features for 14 days.</CardDescription>
                  </div>
                  <div className="text-right">
                    <span className="text-5xl font-black text-accent">₹0</span>
                    <p className="text-[10px] font-bold uppercase opacity-60 mt-1">For 14 Days</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-10 pt-0 space-y-8 relative z-10">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-accent" />
                    <p className="text-sm font-medium">No Credit Card required to start</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-accent" />
                    <p className="text-sm font-medium">Unlimited Products & Invoices during trial</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-accent" />
                    <p className="text-sm font-medium">Automatic conversion to Basic Free mode</p>
                  </div>
                </div>
                <Button asChild size="lg" className="w-full h-16 rounded-2xl bg-accent hover:bg-accent/90 text-primary font-black uppercase tracking-widest text-sm shadow-xl">
                  <Link href="/signup">Launch Your Business OS <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. MARKETPLACE MODULES */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900">The Power Marketplace</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">Don't pay for features you don't use. Pick your power-ups a la carte.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {MARKETPLACE_MODULES.map((m) => (
              <Card key={m.id} className={cn(
                "border-none shadow-lg bg-white rounded-3xl overflow-hidden group hover:shadow-2xl transition-all relative",
                m.isPopular && "ring-2 ring-primary"
              )}>
                {m.isPopular && (
                  <Badge className="absolute top-4 right-4 bg-primary text-white text-[8px] font-black uppercase px-2 h-4">TOP PICK</Badge>
                )}
                <CardHeader className="p-6 pb-4">
                  <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform", m.color)}>
                    <m.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg font-bold text-slate-900">{m.name}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed line-clamp-2 min-h-[32px]">{m.desc}</CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-primary">₹{m.price}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">/month</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase">
                      <Check className="h-3 w-3 text-green-500" /> Instant Activation
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase">
                      <Check className="h-3 w-3 text-green-500" /> Seamless Integration
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-6 bg-slate-50 border-t">
                  <Button variant="outline" className="w-full h-10 rounded-xl font-bold uppercase text-[10px] tracking-widest border-primary/20 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    Add to My OS
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 4. COMPARISON TABLE */}
      <section className="py-24 max-w-5xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900">Plan Comparison</h2>
        </div>
        
        <div className="border rounded-[2rem] overflow-hidden shadow-xl bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-6 text-left text-xs font-black uppercase tracking-widest">Feature</th>
                <th className="p-6 text-center text-xs font-black uppercase tracking-widest">14-Day Trial</th>
                <th className="p-6 text-center text-xs font-black uppercase tracking-widest text-accent">Pro OS Addons</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                { name: "Billing & Invoices", trial: true, pro: true },
                { name: "Inventory (Real-time)", trial: true, pro: true },
                { name: "Staff Management", trial: "Basic", pro: "Advanced" },
                { name: "Gemini AI Advisor", trial: false, pro: true },
                { name: "WhatsApp Automation", trial: false, pro: true },
                { name: "Custom Domain Store", trial: false, pro: true },
                { name: "Multi-Store Sync", trial: false, pro: true },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="p-6 text-sm font-bold text-slate-700">{row.name}</td>
                  <td className="p-6 text-center">
                    {typeof row.trial === 'boolean' ? (
                      row.trial ? <Check className="h-5 w-5 text-green-500 mx-auto" /> : <Lock className="h-4 w-4 text-slate-300 mx-auto" />
                    ) : <span className="text-[10px] font-bold text-slate-500 uppercase">{row.trial}</span>}
                  </td>
                  <td className="p-6 text-center">
                    {typeof row.pro === 'boolean' ? (
                      row.pro ? <Check className="h-5 w-5 text-primary mx-auto" /> : <Lock className="h-4 w-4 text-slate-300 mx-auto" />
                    ) : <span className="text-[10px] font-bold text-primary uppercase">{row.pro}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. TRUST SECTION */}
      <section className="py-24 bg-primary text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-24 opacity-10">
          <Bot className="h-64 w-64 text-white" />
        </div>
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10 space-y-12">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Built for Entrepreneurs. Trusted by Thousands.</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { val: "10k+", lab: "Active Businesses" },
              { val: "₹500Cr+", lab: "Processed Volume" },
              { val: "32%", lab: "Avg. Revenue Growth" },
              { val: "24/7", lab: "Expert Support" },
            ].map((stat, i) => (
              <div key={i} className="space-y-2">
                <p className="text-4xl md:text-5xl font-black text-accent">{stat.val}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">{stat.lab}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-12 overflow-x-auto pb-4 scrollbar-hide opacity-50 grayscale hover:grayscale-0 transition-all">
             <div className="font-black text-2xl tracking-tighter">SAMSUNG</div>
             <div className="font-black text-2xl tracking-tighter">RELIANCE</div>
             <div className="font-black text-2xl tracking-tighter">TATA</div>
             <div className="font-black text-2xl tracking-tighter">JIO</div>
          </div>
        </div>
      </section>

      {/* 6. FAQ */}
      <section className="py-24 max-w-3xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">Frequently Asked Questions</h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1" className="border-b">
            <AccordionTrigger className="font-bold text-slate-700">What happens after 14 days?</AccordionTrigger>
            <AccordionContent className="text-slate-600">
              Your OS will automatically switch to "Read-Only" mode. You'll still be able to view your data, but you won't be able to create new invoices or products until you upgrade your subscription.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2" className="border-b">
            <AccordionTrigger className="font-bold text-slate-700">Can I cancel a marketplace module anytime?</AccordionTrigger>
            <AccordionContent className="text-slate-600">
              Yes, we follow a strict "No Strings Attached" policy. You can activate or deactivate any module instantly from your Marketplace dashboard.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3" className="border-b">
            <AccordionTrigger className="font-bold text-slate-700">Do I need technical skills to build my store?</AccordionTrigger>
            <AccordionContent className="text-slate-600">
              Zero. If you can use WhatsApp, you can use Biztrix. Our E-commerce builder turns your existing inventory into a website automatically.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* 7. FINAL CTA */}
      <section className="py-24 bg-slate-900 relative overflow-hidden text-center text-white">
        <div className="absolute inset-0 bg-primary/5 -z-10" />
        <div className="max-w-4xl mx-auto px-4 space-y-10">
          <h2 className="text-4xl md:text-6xl font-bold leading-tight">Ready to join the <br /><span className="text-accent">Business Revolution?</span></h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="h-16 px-12 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-sm shadow-2xl">
              <Link href="/signup">Start Your Free OS Trial</Link>
            </Button>
            <Button size="lg" variant="outline" className="h-16 px-12 rounded-2xl border-white/20 text-white font-black uppercase tracking-widest text-sm hover:bg-white/5">
              Contact Sales
            </Button>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No credit card required • Instant setup • Multi-tenant secure</p>
        </div>
      </section>

      {/* FOOTER COPIED FROM HOME */}
      <footer className="py-12 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2 font-bold text-primary text-lg">
            <div className="h-6 w-6 bg-accent rounded flex items-center justify-center text-white">
              <Bot className="h-4 w-4" />
            </div>
            Biztrix AI
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">© 2024 Biztrix AI Solutions.</p>
          <div className="flex gap-6 text-xs font-bold uppercase tracking-widest text-slate-400">
            <Link href="/terms" className="hover:text-primary">Terms</Link>
            <Link href="/privacy" className="hover:text-primary">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
