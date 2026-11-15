"use client";

import { useMemo } from "react";
import { 
  Gem, 
  Calendar, 
  CreditCard, 
  ArrowRight, 
  History, 
  ShieldCheck, 
  ArrowLeft,
  SmartphoneNfc,
  ScanLine,
  ShoppingBag,
  Briefcase,
  Wallet,
  ShoppingBasket,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { addonFeatures } from "@/lib/mock-db";
import Link from "next/link";
import { useFirestore, useDoc, useMemoFirebase, useUser } from "@/firebase";
import { doc } from "firebase/firestore";

const categoryIcons: Record<string, any> = {
  SmartphoneNfc,
  ScanLine,
  ShoppingBag,
  Briefcase,
  Wallet
};

export default function SubscriptionPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  // Real-time Dynamic Profile Resolution
  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);

  const businessId = userProfile?.businessId;
  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const activeAddonIds = useMemo(() => business?.activeAddonIds || [], [business]);
  const activeAddons = useMemo(() => 
    addonFeatures.filter(f => activeAddonIds.includes(f.id)), 
  [activeAddonIds]);

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Button asChild variant="ghost" size="sm" className="h-8 p-0 hover:bg-transparent">
              <Link href="/dashboard" className="text-muted-foreground hover:text-primary flex items-center gap-1 group">
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> 
                <span className="text-[10px] font-bold uppercase tracking-widest">Back to Center</span>
              </Link>
            </Button>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <Gem className="h-7 w-7 text-accent-foreground" /> Billing & Plan
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground font-medium">Manage your Biztrix AI subscription and active feature modules.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Plan Summary */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-none shadow-xl bg-slate-900 text-white rounded-3xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
              <Gem className="h-40 w-40 text-white" />
            </div>
            <CardHeader className="p-8 pb-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <Badge className="bg-primary text-white border-none uppercase text-[9px] font-bold tracking-widest px-3">
                    CURRENT PLAN
                  </Badge>
                  <CardTitle className="text-3xl font-bold">Business Pro Suite</CardTitle>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-foreground">₹1,299</p>
                  <p className="text-[10px] opacity-60 font-bold uppercase">per month</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Status</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-sm font-bold uppercase">Active</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Next Billing</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary-foreground/60" />
                    <span className="text-sm font-bold uppercase">12 Apr 2024</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Payment Method</p>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary-foreground/60" />
                    <span className="text-sm font-bold uppercase">VISA •••• 4242</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest border-none shadow-lg">
                  Manage Plan <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" className="flex-1 border-white/20 text-white bg-transparent hover:bg-white/10 hover:text-white h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest">
                  Update Payment Info
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Features List */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">Active Modules</h3>
            <div className="grid gap-4">
              {activeAddons.length === 0 ? (
                <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-muted-foreground/20 italic text-sm opacity-40">
                  No advanced modules active.
                </div>
              ) : (
                activeAddons.map((addon) => {
                  const Icon = categoryIcons[addon.icon] || SmartphoneNfc;
                  return (
                    <Card key={addon.id} className="border-none shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all">
                      <CardContent className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-primary">{addon.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{addon.price}/{addon.period} • Active since Jan 2024</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Next Payment</p>
                            <p className="text-xs font-bold">₹{addon.price.split('₹')[1]}</p>
                          </div>
                          <Switch defaultChecked className="scale-75 data-[state=checked]:bg-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
              
              <Button asChild variant="outline" className="w-full h-14 border-dashed border-primary/20 text-primary hover:bg-primary/5 rounded-2xl group">
                <Link href="/marketplace">
                  <ShoppingBasket className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Browse Add-on Marketplace</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Usage */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden border">
            <CardHeader className="bg-muted/30 border-b py-5 px-6">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Secure OS Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                  <span className="text-muted-foreground">Automation Tokens</span>
                  <span className="text-primary">84% Used</span>
                </div>
                <Progress value={84} className="h-1.5 rounded-full" />
                <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                  * Tokens reset on the 1st of every month. Upgrade plan for unlimited automation.
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Bank Grade Encryption</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Cancel Any Add-on Instantly</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-primary/5 border border-primary/10 rounded-3xl overflow-hidden">
            <CardHeader className="py-5">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <History className="h-4 w-4" /> Billing History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-primary/10">
                {[
                  { date: "12 Mar", amt: "₹1,299", status: "Paid" },
                  { date: "12 Feb", amt: "₹1,299", status: "Paid" },
                ].map((inv, i) => (
                  <div key={i} className="px-6 py-3 flex items-center justify-between hover:bg-primary/5 transition-colors cursor-pointer">
                    <div>
                      <p className="text-[10px] font-bold text-primary uppercase">{inv.date} Invoice</p>
                      <p className="text-[9px] text-muted-foreground font-medium uppercase">Receipt #BM-{Math.floor(Math.random() * 9000) + 1000}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-primary">{inv.amt}</p>
                      <Badge variant="outline" className="text-[7px] h-3 px-1 border-green-200 text-green-600 uppercase font-bold">PAID</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="p-4 bg-primary/5 border-t border-primary/10">
              <Button variant="ghost" className="w-full text-[9px] font-bold uppercase text-primary">Download All Receipts</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}