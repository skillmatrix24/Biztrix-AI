
"use client";

import React, { useState, useMemo } from "react";
import { 
  ShoppingBasket, 
  Plus, 
  Search, 
  SmartphoneNfc, 
  ScanLine, 
  ShoppingBag, 
  Briefcase, 
  Wallet, 
  CheckCircle2, 
  Zap, 
  ArrowRight,
  Sparkles, 
  ShieldCheck, 
  Gem,
  Bot, 
  Lightbulb,
  Users2,
  ListTodo,
  Facebook,
  Loader2,
  Lock,
  Layers,
  ChevronRight,
  Star,
  Building,
  Handshake,
  Palette,
  MessageCircle,
  Ticket,
  Headset,
  Target,
  Info,
  BadgeCheck,
  ShieldAlert,
  Calculator,
  Terminal,
  Activity,
  UserPlus,
  X,
  User,
  LayoutList,
  SearchCode,
  LineChart,
  Trophy,
  IdCard,
  Layout,
  LayoutDashboard,
  Users,
  MousePointer2,
  TrendingUp,
  Sun,
  CreditCard
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Modular Data Import
import { bundles, individuals } from "./data";

const iconMap: Record<string, any> = {
  Lightbulb, SmartphoneNfc, Wallet, Briefcase, Users2, ListTodo, Zap, ShoppingBag, Facebook, ScanLine, Bot, Layers, Gem, Handshake, Building, MessageCircle, Palette, Ticket, Headset, Star, Target, Sun
};

function DynamicIcon({ name, className }: { name: string, className?: string }) {
  const Icon = iconMap[name] || Bot;
  return <Icon className={className} />;
}

export default function MarketplacePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);

  const businessId = userProfile?.businessId;
  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const activeAddonIds = useMemo(() => business?.activeAddonIds || [], [business]);

  const filteredBundles = useMemo(() => {
    return bundles.filter(f => 
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      f.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const filteredIndividuals = useMemo(() => {
    return individuals.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) || f.description.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (activeTab === "all") return true;
      const catSlug = f.category?.toLowerCase()?.replace(/\s+/g, '-') || "";
      return catSlug === activeTab.toLowerCase();
    });
  }, [searchTerm, activeTab]);

  const handleActivate = (e: React.MouseEvent, featureId: string, isPurchase: boolean = false) => {
    e.stopPropagation();
    if (!user || user.isAnonymous) {
      toast({ title: "Login Required", description: "Please sign in to your business account." });
      return;
    }
    if (!business || !businessRef) return;

    const currentIds = business.activeAddonIds || [];
    if (currentIds.includes(featureId)) return;

    const newIds = [...currentIds, featureId];
    updateDocumentNonBlocking(businessRef, {
      activeAddonIds: newIds,
      updatedAt: new Date().toISOString()
    });
    
    toast({
      title: isPurchase ? "Module Purchased" : "Trial Activated",
      description: `This feature is now active on your ${billingCycle} plan.`,
    });
  };

  return (
    <div className="space-y-10 pb-20 text-left">
      <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 md:p-16 text-white shadow-2xl text-left">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
          <ShoppingBasket className="h-80 w-80 text-white" />
        </div>
        <div className="relative z-10 max-w-3xl space-y-6">
          <Badge className="bg-primary hover:bg-primary/90 text-white border-none py-1.5 px-4 rounded-full text-[10px] font-bold uppercase tracking-widest">
            <Sparkles className="mr-2 h-3.5 w-3.5 fill-current" /> Revenue Strategy Hub
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight uppercase">
            Expand Your <span className="text-primary italic">Node Logic.</span>
          </h1>
          <p className="text-sm md:text-lg text-slate-400 leading-relaxed max-w-xl font-medium">
            Explore industrial-grade modules for scaling your business. Each module has a dedicated features page with logic, rules, and backend details.
          </p>
          
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-md w-fit shadow-inner">
            <Label className={cn("text-[10px] font-black uppercase tracking-widest cursor-pointer", billingCycle === 'monthly' ? "text-primary" : "text-slate-400")}>Monthly</Label>
            <Switch checked={billingCycle === 'yearly'} onCheckedChange={(v) => setBillingCycle(v ? 'yearly' : 'monthly')} className="data-[state=checked]:bg-primary scale-110" />
            <div className="flex items-center gap-2">
              <Label className={cn("text-[10px] font-black uppercase tracking-widest cursor-pointer", billingCycle === 'yearly' ? "text-primary" : "text-slate-400")}>Yearly</Label>
              <Badge className="bg-green-50 text-white border-none text-[8px] font-black py-1 px-2 uppercase shadow-sm">SAVE 30%</Badge>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 text-left">
        <div className="flex items-center gap-3 px-2 text-left">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
            <Gem className="h-5 w-5" />
          </div>
          <div>
             <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Revenue Suites</h2>
             <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Multi-node bundle packages</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredBundles.map((bundle) => {
            const isActive = activeAddonIds.includes(bundle.id);
            const price = billingCycle === 'yearly' ? Math.floor(parseInt(bundle.price) * 0.7) : parseInt(bundle.price);
            
            return (
              <Card key={bundle.id} onClick={() => router.push(`/marketplace/features/${bundle.id}`)} className={cn(
                "border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden transition-all hover:scale-[1.03] hover:shadow-2xl relative border flex flex-col h-full group cursor-pointer",
                bundle.isPopular && "ring-2 ring-primary",
                isActive && "ring-2 ring-green-500 shadow-green-100"
              )}>
                <CardHeader className="p-8 pb-4 text-left">
                  <div className="flex justify-between items-start mb-6">
                    <div className={cn("h-16 w-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl transition-transform group-hover:rotate-12", bundle.isPopular ? "bg-primary" : "bg-slate-900")}>
                      <DynamicIcon name={bundle.icon} className="h-8 w-8" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {bundle.isPopular && <Badge className="bg-primary text-white border-none text-[8px] font-black h-5 px-2 uppercase shadow-sm">POPULAR CHOICE</Badge>}
                      {isActive ? (
                        <Badge className="bg-green-50 text-white border-none text-[8px] font-black h-5 px-2 uppercase shadow-sm">ACTIVE NODE</Badge>
                      ) : bundle.isTrialAvailable && (
                        <Badge className="bg-orange-500 text-white border-none text-[8px] font-black h-5 px-2 uppercase animate-pulse shadow-md">14D FREE TRIAL</Badge>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">{bundle.name}</CardTitle>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium mt-2 min-h-[40px] italic">"{bundle.description}"</p>
                </CardHeader>
                <CardContent className="p-8 pt-4 space-y-6 flex-1 text-left">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900">₹{price}</span>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">/mo</span>
                  </div>
                  <Separator className="opacity-40" />
                  <div className="space-y-4">
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-2"><Info className="h-3 w-3" /> Core Inclusions</p>
                    <div className="flex flex-wrap gap-2">
                       {bundle.inclusions?.split(',').map((inc, idx) => (
                         <Badge key={idx} variant="secondary" className="bg-slate-100 text-slate-600 border-none text-[8px] font-bold h-5 px-2 uppercase">{inc.trim()}</Badge>
                       ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-8 bg-muted/20 border-t mt-auto flex flex-col gap-3">
                  <Button 
                    variant="ghost"
                    className="w-full text-[9px] font-black uppercase tracking-widest text-primary hover:bg-white"
                  >
                    Dedicated Feature Page <ChevronRight className="ml-1.5 h-3 w-3" />
                  </Button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    <Button 
                      onClick={(e) => handleActivate(e, bundle.id)}
                      disabled={isActive}
                      className={cn(
                        "h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95",
                        isActive ? "bg-muted text-muted-foreground" : "bg-primary text-white"
                      )}
                    >
                      {isActive ? "Integrated" : (bundle.isTrialAvailable ? `Trial 14D` : `Purchase`)}
                    </Button>
                    <Button 
                      onClick={(e) => handleActivate(e, bundle.id, true)}
                      disabled={isActive}
                      className={cn(
                        "h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95",
                        isActive ? "hidden" : "bg-slate-900 text-accent border border-white/10"
                      )}
                    >
                      <CreditCard className="mr-2 h-4 w-4" /> Activate Pro
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-8 text-left">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2 text-left">
          <div className="flex items-center gap-3 text-left">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Plus className="h-5 w-5" />
            </div>
            <div className="text-left">
               <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Individual Nodes</h2>
               <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Pick power-ups a la carte</p>
            </div>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="bg-white border rounded-2xl h-12 p-1 shadow-sm w-full">
              <TabsTrigger value="all" className="flex-1 text-[10px] font-black uppercase px-6">All</TabsTrigger>
              <TabsTrigger value="ai" className="flex-1 text-[10px] font-black uppercase px-6">AI</TabsTrigger>
              <TabsTrigger value="ops" className="flex-1 text-[10px] font-black uppercase px-6">Ops</TabsTrigger>
              <TabsTrigger value="branding" className="flex-1 text-[10px] font-black uppercase px-6">Branding</TabsTrigger>
              <TabsTrigger value="real-estate" className="flex-1 text-[10px] font-black uppercase px-6">Real Estate</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 text-left">
          {filteredIndividuals.map((item) => {
            const isActive = activeAddonIds.includes(item.id);
            const price = billingCycle === 'yearly' ? Math.floor(parseInt(item.price) * 0.7) : parseInt(item.price);
            
            return (
              <Card key={item.id} className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all flex flex-col h-full border border-border/50 text-left">
                <CardHeader className="p-6 pb-4 text-left">
                  <div className="flex justify-between items-start">
                    <div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/10 transition-all shadow-inner">
                      <DynamicIcon name={item.icon} className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isActive && <Badge className="bg-green-500 text-white border-none text-[7px] font-black uppercase px-2 h-4 shadow-sm">ACTIVE</Badge>}
                    </div>
                  </div>
                  <CardTitle className="text-sm font-black mt-4 uppercase tracking-tight">{item.name}</CardTitle>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 h-8 font-medium italic">"{item.description}"</p>
                </CardHeader>
                <CardContent className="px-6 pb-6 flex-1 flex flex-col space-y-4 text-left">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-slate-900">₹{price}</span>
                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">/mo</span>
                  </div>
                  
                  <Separator className="opacity-40" />
                  
                  <div className="space-y-2">
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <BadgeCheck className="h-3 w-3 text-green-500" /> Key Capability
                    </p>
                    <p className="text-[9px] font-bold text-slate-600 uppercase leading-relaxed">{item.inclusions?.split(',')[0] || 'Module Node Access'}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 mt-auto">
                    <Button 
                      variant={isActive ? "secondary" : "outline"} 
                      size="sm" 
                      onClick={(e) => handleActivate(e, item.id)}
                      disabled={isActive}
                      className={cn(
                        "w-full h-10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm",
                        isActive ? "bg-muted text-muted-foreground border-none" : "border-primary/20 text-primary hover:bg-primary hover:text-white"
                      )}
                    >
                      {isActive ? "Active Node" : (item.isTrialAvailable ? "Trial 14D" : "Activate Node")}
                    </Button>
                    {!isActive && (
                      <Button 
                        size="sm" 
                        onClick={(e) => handleActivate(e, item.id, true)}
                        className="w-full h-10 rounded-xl text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white shadow-lg active:scale-95"
                      >
                        Purchase Now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="pt-10 px-1 text-left">
        <Card className="border-none shadow-2xl bg-slate-900 text-white rounded-[3.5rem] overflow-hidden border">
          <CardHeader className="p-10 sm:p-16 text-center space-y-4">
            <CardTitle className="text-3xl sm:text-5xl font-black uppercase tracking-tight">The Multi-Tier OS Value</CardTitle>
            <p className="text-slate-400 text-sm sm:text-base font-medium max-w-2xl mx-auto uppercase tracking-widest">Compare feature nodes across your business evolution.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto scrollbar-hide">
              <Table>
                <TableHeader className="border-white/10 hover:bg-transparent">
                  <TableRow className="hover:bg-transparent border-white/10">
                    <TableHead className="text-white text-[10px] font-black uppercase tracking-widest pl-12 h-16">Feature Control</TableHead>
                    <TableHead className="text-white text-[10px] font-black uppercase tracking-widest text-center h-16">Free Hook</TableHead>
                    <TableHead className="text-accent text-[10px] font-black uppercase tracking-widest text-center h-16">Paid Suites</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { name: 'Invoices & Billing', free: 'Limited (50/mo)', paid: 'Unlimited Pro' },
                    { name: 'WhatsApp Logic', free: 'Manual Share', paid: 'Full Automation' },
                    { name: 'AI Insights', free: '❌', paid: 'Gemini Engine' },
                    { name: 'Project & Tasks', free: '❌', paid: 'Team Scaling' },
                    { name: 'Custom Branding', free: '❌', paid: 'Full Identity' },
                  ].map((row, i) => (
                    <TableRow key={i} className="border-white/5 hover:bg-white/5 group">
                      <TableCell className="pl-12 py-6 text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{row.name}</TableCell>
                      <TableCell className="text-center text-xs text-slate-500 uppercase font-black">{row.free}</TableCell>
                      <TableCell className="text-center text-sm text-accent font-black tracking-widest">{row.paid}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="p-10 sm:p-12 bg-white/5 justify-center gap-10 flex-wrap">
            <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-green-500" /> <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Cancel Anytime</span></div>
            <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-green-500" /> <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">No Setup Fee</span></div>
            <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-green-500" /> <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">24/7 Expert Port</span></div>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}

