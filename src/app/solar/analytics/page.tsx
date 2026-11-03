"use client";

import { useMemo, useState } from "react";
import { 
  LineChart as LineChartIcon, 
  ArrowLeft, 
  TrendingUp, 
  Target, 
  Zap, 
  CheckCircle2, 
  BarChart3, 
  PieChart as PieChartIcon,
  Activity,
  ArrowRight,
  Filter,
  Calendar,
  Loader2,
  Users,
  Building2,
  Package,
  ShieldCheck,
  SmartphoneNfc,
  Gem,
  DollarSign,
  ChevronRight,
  Sparkles,
  Bot
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell,
  PieChart,
  Pie,
  Area,
  AreaChart,
  CartesianGrid
} from "recharts";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc, where, Timestamp } from "firebase/firestore";
import Link from "next/link";

export default function SolarAnalyticsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  // DATA NODES
  const inquiriesQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'solarInquiries') : null, [firestore, businessId]);
  const { data: inquiries = [] } = useCollection<any>(inquiriesQuery);

  const surveysQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'solarSurveys') : null, [firestore, businessId]);
  const { data: surveys = [] } = useCollection<any>(surveysQuery);

  const designsQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'solarSystemDesigns') : null, [firestore, businessId]);
  const { data: designs = [] } = useCollection<any>(designsQuery);

  const quotesQuery = useMemoFirebase(() => businessId ? query(collection(firestore, 'businesses', businessId, 'quotations'), orderBy('createdAt', 'desc')) : null, [firestore, businessId]);
  const { data: allQuotes = [] } = useCollection<any>(quotesQuery);
  const solarQuotes = useMemo(() => (allQuotes || []).filter((q: any) => q.solarSystemDesignId), [allQuotes]);

  const installationsQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'solarInstallations') : null, [firestore, businessId]);
  const { data: installations = [] } = useCollection<any>(installationsQuery);

  const cashbookQuery = useMemoFirebase(() => businessId ? query(collection(firestore, 'businesses', businessId, 'cashbook'), where('category', '==', 'Sales')) : null, [firestore, businessId]);
  const { data: transactions = [] } = useCollection<any>(cashbookQuery);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const stats = useMemo(() => {
    const totalInq = (inquiries || []).length || 0;
    const totalSurveys = (surveys || []).length || 0;
    const totalDesigns = (designs || []).length || 0;
    const totalQuotes = (solarQuotes || []).length || 0;
    const totalInstalls = (installations || []).length || 0;

    // Funnel Data
    const funnelData = [
      { name: "Inquiries", value: totalInq, color: "#0C83B3" },
      { name: "Surveys", value: totalSurveys, color: "#0C83B3CC" },
      { name: "Designs", value: totalDesigns, color: "#0C83B399" },
      { name: "Quotes", value: totalQuotes, color: "#0C83B366" },
      { name: "Projects", value: totalInstalls, color: "#0C83B333" },
    ];

    const acceptedQuotes = (solarQuotes || []).filter(q => q.status === 'converted');
    const totalAcceptedValue = acceptedQuotes.reduce((sum, q) => sum + (q.totals?.finalPayout || 0), 0);
    const totalCollected = (transactions || []).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const installedKw = (installations || [])
      .filter(i => i.status === 'HANDED_OVER')
      .reduce((sum, i) => sum + (parseFloat(i.capacityKw) || 0), 0);

    return { funnelData, totalAcceptedValue, totalCollected, installedKw, totalInq };
  }, [inquiries, surveys, designs, solarQuotes, installations, transactions]);

  if (isProfileLoading) return <div className="flex items-center justify-center py-20 opacity-40 text-left"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="space-y-8 pb-20 text-left">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner shrink-0">
            <LineChartIcon className="h-7 w-7 text-primary" />
          </div>
          <div className="text-left">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Solar Analytics</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1.5 opacity-60">Verified Business Intelligence</p>
          </div>
        </div>
        <Button asChild variant="outline" className="h-10 px-6 rounded-xl border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest shadow-sm bg-white">
          <Link href="/solar/ai-insights"><Sparkles className="mr-2 h-4 w-4" /> AI Strategy Hub</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-border/50 text-left">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Accepted Order Value</p>
          <div className="text-2xl font-black text-slate-900">{currencySymbol}{stats.totalAcceptedValue.toLocaleString()}</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-green-500 text-left">
          <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Collected Amount</p>
          <div className="text-2xl font-black text-green-700">{currencySymbol}{stats.totalCollected.toLocaleString()}</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-orange-500 text-left">
          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Installed Capacity (kWp)</p>
          <div className="text-2xl font-black text-orange-700">{stats.installedKw} kWp</div>
        </Card>
        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6 text-left">
          <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">Funnel Throughput</p>
          <div className="text-2xl font-black text-white">{stats.totalInq > 0 ? Math.round((installations.length / stats.totalInq) * 100) : 0}%</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border">
            <CardHeader className="bg-muted/30 border-b py-6 px-8 flex justify-between items-center text-left">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Target className="h-4 w-4" /> Sales Conversion Funnel
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10 h-[400px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.funnelData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={10} width={80} />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                       {stats.funnelData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.color} />
                       ))}
                    </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8 text-left">
           <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden group">
              <CardHeader className="p-8 pb-4 text-left">
                 <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner group-hover:scale-110 transition-transform">
                   <Bot className="h-7 w-7 text-accent" />
                 </div>
                 <CardTitle className="text-base font-black uppercase tracking-widest mt-4 leading-none text-white">Strategy Pulse</CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-6 text-left">
                 <p className="text-xs text-slate-400 leading-relaxed font-medium italic">"Funnel logic scan successful. We see a <strong>{stats.totalInq > 0 ? Math.round((surveys.length / stats.totalInq) * 100) : 0}%</strong> conversion from Lead to Survey."</p>
                 <Separator className="bg-white/10" />
                 <Button asChild className="w-full h-12 bg-white text-primary font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl hover:bg-accent transition-colors">
                    <Link href="/solar/ai-insights">Generate Detailed Insights <ChevronRight className="ml-1 h-3 w-3" /></Link>
                 </Button>
              </CardContent>
           </Card>

           <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 flex items-start gap-4 text-left">
              <ShieldCheck className="h-5 w-5 text-primary opacity-40 shrink-0 mt-0.5" />
              <p className="text-[10px] text-primary/70 leading-relaxed font-medium italic uppercase tracking-tighter text-left">
                "Analytics are derived from production snapshots. Recognized Revenue is NOT available. Metrics are Collection and Order Value based."
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
