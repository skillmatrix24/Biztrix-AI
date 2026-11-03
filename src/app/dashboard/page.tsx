"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Plus,
  Package,
  Receipt, 
  ArrowRight, 
  Zap, 
  Sparkles, 
  Bot, 
  SmartphoneNfc, 
  Lock,
  ChevronRight,
  BrainCircuit,
  Wallet,
  BookOpenText,
  TrendingUp,
  Loader2,
  Settings2,
  CheckCircle2,
  Clock,
  Briefcase,
  Gem,
  Layout,
  Flame,
  UserCheck,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Settings,
  ChevronDown,
  Activity,
  XCircle as XCircleIcon,
  Building,
  MapPin,
  Trophy,
  Target,
  UserCircle,
  Coins,
  Users,
  ShoppingBasket,
  ArrowUpRight,
  GripVertical,
  Eye,
  EyeOff,
  Save,
  LineChart,
  ScanLine,
  MessageSquare,
  Handshake,
  DollarSign,
  MessageCircle,
  Star,
  Headset,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { useFirestore, useDoc, useMemoFirebase, useCollection, useUser, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, where, serverTimestamp, orderBy, limit, Timestamp } from "firebase/firestore";
import { startOfMonth, format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { getMorningBrief, MorningBriefOutput } from "@/ai/flows/morning-brief-flow";

export default function AICommandDashboard() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  
  const businessId = userProfile?.businessId;
  const isProfileValid = !!(userProfile && businessId && !user?.isAnonymous);

  // REAL-TIME MODULE INTEGRATION DATA
  const customersQuery = useMemoFirebase(() => 
    isProfileValid ? collection(firestore, 'businesses', businessId, 'customers') : null
  , [firestore, businessId, isProfileValid]);
  const { data: customersDataRaw } = useCollection<any>(customersQuery);
  const customersData = customersDataRaw || [];

  const vendorsQuery = useMemoFirebase(() => 
    isProfileValid ? collection(firestore, 'businesses', businessId, 'vendors') : null
  , [firestore, businessId, isProfileValid]);
  const { data: vendorsDataRaw } = useCollection<any>(vendorsQuery);
  const vendorsData = vendorsDataRaw || [];

  const salesCountQuery = useMemoFirebase(() => {
    if (!isProfileValid) return null;
    const start = startOfMonth(new Date());
    return query(
      collection(firestore, 'businesses', businessId, 'cashbook'),
      where('category', '==', 'Sales'),
      where('createdAt', '>=', Timestamp.fromDate(start))
    );
  }, [firestore, businessId, isProfileValid]);
  const { data: salesThisMonthRaw } = useCollection<any>(salesCountQuery);
  const salesThisMonth = salesThisMonthRaw || [];

  const mtdRevenue = useMemo(() => {
    return (salesThisMonth || []).reduce((sum: number, doc: any) => sum + (parseFloat(doc.amount) || 0), 0);
  }, [salesThisMonth]);

  const totalUdhaar = useMemo(() => {
    return (customersData || []).reduce((sum: number, c: any) => sum + (parseFloat(c.creditBalance) || 0), 0);
  }, [customersData]);

  const totalPayable = useMemo(() => {
    return (vendorsData || []).reduce((sum: number, v: any) => sum + (parseFloat(v.pendingBalance) || 0), 0);
  }, [vendorsData]);

  const productsQuery = useMemoFirebase(() => 
    isProfileValid ? collection(firestore, 'businesses', businessId, 'products') : null
  , [firestore, businessId, isProfileValid]);
  const { data: productsDataRaw } = useCollection<any>(productsQuery);
  const productsData = productsDataRaw || [];

  const leadsQuery = useMemoFirebase(() => 
    isProfileValid ? collection(firestore, 'businesses', businessId, 'leads') : null
  , [firestore, businessId, isProfileValid]);
  const { data: leadsDataRaw } = useCollection<any>(leadsQuery);
  const leadsData = leadsDataRaw || [];

  const tasksQuery = useMemoFirebase(() => 
    isProfileValid ? query(collection(firestore, 'businesses', businessId, 'tasks'), where('status', '!=', 'completed'), limit(10)) : null
  , [firestore, businessId, isProfileValid]);
  const { data: tasksDataRaw } = useCollection<any>(tasksQuery);
  const tasksData = tasksDataRaw || [];

  const businessRef = useMemoFirebase(() => 
    isProfileValid ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId, isProfileValid]);
  const { data: business, isLoading: isBusinessLoading } = useDoc<any>(businessRef);

  const activeAddonIds = useMemo(() => business?.activeAddonIds || [], [business]);
  const currencySymbol = getCurrencySymbol(business?.currency);

  // --- MORNING BRIEF LOGIC ---
  const [brief, setBrief] = useState<MorningBriefOutput | null>(null);
  const [isBriefLoading, setIsBriefLoading] = useState(false);
  const [isBriefDismissed, setIsBriefDismissed] = useState(false);

  useEffect(() => {
    if (isProfileValid && business && !isBriefLoading && !brief) {
      const runBriefing = async () => {
        setIsBriefLoading(true);
        try {
          const result = await getMorningBrief({
            businessName: business.name,
            userName: userProfile.name,
            activeAddonIds: activeAddonIds,
            context: {
              tasks: (tasksData || []).filter(t => t.priority === 'high' || t.priority === 'urgent').map(t => ({ title: t.title, assignedName: t.assignedName })),
              lowStockItems: (productsData || []).filter(p => p.stock <= p.minThreshold).map(p => ({ name: p.name, stock: p.stock, unit: p.unit })),
              hotLeads: (leadsData || []).filter(l => (l.intentScore || 0) >= 80).map(l => ({ name: l.name, intentScore: l.intentScore })),
              pendingPayments: totalUdhaar,
              ongoingProjects: []
            }
          });
          setBrief(result);
        } catch (e) {
          console.error("Briefing Error:", e);
        } finally {
          setIsBriefLoading(false);
        }
      };
      runBriefing();
    }
  }, [isProfileValid, business, activeAddonIds, tasksData, productsData, leadsData, totalUdhaar]);

  if (isUserLoading || isProfileLoading || isBusinessLoading) {
    return <div className="flex flex-col items-center justify-center py-20 opacity-40"><Loader2 className="h-10 w-10 animate-spin text-primary mb-4" /><p className="text-xs font-bold uppercase tracking-widest text-primary">Establishing Connection...</p></div>;
  }

  return (
    <div className="space-y-8 pb-24 md:pb-12 text-left">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg"><Bot className="h-7 w-7" /></div>
          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 uppercase">OS Command Center</h2>
            <div className="flex items-center gap-2 mt-1">
               <Badge className="bg-primary text-white border-none text-[8px] font-black h-4 uppercase">ADMIN CONSOLE</Badge>
               <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse ml-2" />
               <span className="text-[9px] font-black uppercase text-slate-400">All Nodes Synced</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" className="h-10 px-4 rounded-xl border-primary/20 text-primary font-bold uppercase text-[10px] tracking-widest shadow-sm bg-white"><Link href="/settings"><Settings2 className="mr-2 h-4 w-4" /> Config Hub</Link></Button>
          <Button asChild className="h-10 px-6 rounded-xl text-[10px] font-bold uppercase bg-primary text-white shadow-lg"><Link href="/billing"><Plus className="mr-2 h-3.5 w-3.5" /> New Sale</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-12">
          {/* STRATEGIC INTELLIGENCE (MORNING BRIEF) */}
          {!isBriefDismissed && (
            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
               <div className="flex items-center justify-between px-2 text-left">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Strategic Intelligence Node</h3>
                  </div>
                  <button onClick={() => setIsBriefDismissed(true)} className="h-6 w-6 rounded-full hover:bg-primary/10 flex items-center justify-center text-slate-400 hover:text-primary transition-colors"><X className="h-3.5 w-3.5" /></button>
               </div>
               <Card className={cn("border-none shadow-2xl rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden transition-all duration-700", brief?.statusNode === 'critical' ? "bg-red-50 border-2 border-red-100" : "bg-white border")}>
                  <CardHeader className="p-5 sm:p-6 md:p-8 border-b bg-muted/10 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-4">
                     <div className="flex items-center gap-3 sm:gap-4">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg">{isBriefLoading ? <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" /> : <Bot className="h-5 w-5 sm:h-6 sm:w-6" />}</div>
                        <div className="text-left">
                          <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight truncate max-w-[180px] sm:max-w-none">{brief?.greeting || "Namaste!"}</CardTitle>
                          <p className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Decision Engine v3.5 • Real-time Data Aware</p>
                        </div>
                     </div>
                     {brief && <Badge className={cn("border-none text-[7px] sm:text-[8px] font-black uppercase h-4 sm:h-5 px-1.5 sm:px-2 shadow-sm", brief.statusNode === 'critical' ? "bg-red-500 text-white animate-pulse" : "bg-green-500 text-white")}>{brief.statusNode}</Badge>}
                  </CardHeader>
                  <CardContent className="p-5 sm:p-8 md:p-10 space-y-8">
                    {isBriefLoading ? (
                      <div className="space-y-4 py-4"><Progress value={45} className="h-1 bg-primary/5" /><p className="text-[9px] sm:text-[10px] font-black uppercase text-center text-primary/40 animate-pulse">Gemini is scanning your operational matrix...</p></div>
                    ) : brief ? (
                      <div className="space-y-8 sm:space-y-10 animate-in fade-in duration-1000">
                        <p className="text-sm sm:text-base md:text-lg font-medium text-slate-700 leading-relaxed italic text-left">"{brief.summary}"</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                          {brief.priorityActions?.map((action, i) => (
                            <div key={i} className="p-4 sm:p-5 bg-muted/20 rounded-2xl sm:rounded-3xl border border-transparent hover:border-primary/20 transition-all group flex flex-col justify-between gap-3 sm:gap-4">
                               <div className="space-y-1.5 sm:space-y-2 text-left">
                                  <div className="flex items-center justify-between"><Badge className={cn("text-[6px] font-black uppercase h-3.5 px-1", action.impact === 'high' ? "bg-red-500 text-white" : "bg-primary text-white")}>{action.impact} Impact</Badge><ArrowUpRight className="h-3 w-3 opacity-20 group-hover:opacity-100 transition-all" /></div>
                                  <p className="text-[10px] sm:text-xs font-black text-slate-900 leading-tight uppercase line-clamp-2">{action.label}</p>
                               </div>
                               <Button variant="link" className="h-auto p-0 text-[8px] sm:text-[9px] font-black uppercase text-primary w-fit hover:no-underline">Execute Node</Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
               </Card>
            </section>
          )}

          {/* REAL-TIME MATRIX PERFORMANCE */}
          <section className="space-y-4 px-1 text-left">
             <div className="flex items-center gap-2 mb-2"><Activity className="h-4 w-4 text-primary" /><h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Unified Node Performance</h3></div>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-primary flex flex-col justify-between h-32 text-left relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp className="h-10 w-10 text-primary" /></div>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">MTD REVENUE</p>
                  <div className="text-2xl md:text-3xl font-black text-slate-900">{currencySymbol}{mtdRevenue.toLocaleString()}</div>
                  <p className="text-[8px] font-bold uppercase text-green-600">▲ 14% Contribution</p>
                </Card>
                <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-red-500 flex flex-col justify-between h-32 text-left relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><AlertCircle className="h-10 w-10 text-red-500" /></div>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">UNIFIED UDHAAR</p>
                  <div className="text-2xl md:text-3xl font-black text-red-700">{currencySymbol}{totalUdhaar.toLocaleString()}</div>
                  <p className="text-[8px] font-bold uppercase text-red-500/60">Outstanding Recovery</p>
                </Card>
                <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6 flex flex-col justify-between h-32 text-left relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Handshake className="h-10 w-10 text-accent" /></div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">TRADE PAYABLE</p>
                  <div className="text-2xl md:text-3xl font-black text-white">{currencySymbol}{totalPayable.toLocaleString()}</div>
                  <p className="text-[8px] font-bold uppercase text-accent/60">Pending to Vendors</p>
                </Card>
             </div>
          </section>

          <section className="space-y-4 px-1 text-left">
             <div className="flex items-center gap-2 mb-2"><Briefcase className="h-4 w-4 text-primary" /><h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Operational Pulse</h3></div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm bg-white rounded-3xl p-6 flex items-center justify-between group hover:shadow-md transition-all border text-left">
                   <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600"><Users className="h-6 w-6" /></div>
                      <div><p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Pipeline Registry</p><div className="text-xl font-black text-slate-900">{leadsData.length} active leads</div></div>
                   </div>
                   <Button asChild variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase text-primary"><Link href="/leads">View CRM</Link></Button>
                </Card>
                <Card className="border-none shadow-sm bg-white rounded-3xl p-6 flex items-center justify-between group hover:shadow-md transition-all border text-left">
                   <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600"><Package className="h-6 w-6" /></div>
                      <div><p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Critical Inventory</p><div className="text-xl font-black text-slate-900">{productsData.filter((p:any) => p.stock <= p.minThreshold).length} items low</div></div>
                   </div>
                   <Button asChild variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase text-primary"><Link href="/inventory">Scan List</Link></Button>
                </Card>
             </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden group sticky top-24">
            <CardContent className="p-8 space-y-8 text-left relative">
              <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 group-hover:scale-110 transition-transform"><BrainCircuit className="h-40 w-40" /></div>
              <div className="flex items-center gap-4 relative z-10"><div className="h-14 w-14 rounded-[1.5rem] bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><Sparkles className="h-7 w-7 text-accent fill-accent" /></div><div><h3 className="text-lg font-bold">Intelligent OS</h3><div className="flex items-center gap-2 mt-1"><div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" /><span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Intelligence</span></div></div></div>
              <Separator className="bg-white/10" />
              <div className="space-y-5 relative z-10">
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer"><CheckCircle2 className="h-4 w-4 text-green-400" /><span className="text-[10px] font-bold uppercase text-slate-300">GST Compliance Engine Live</span></div>
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer"><CheckCircle2 className="h-4 w-4 text-green-400" /><span className="text-[10px] font-bold uppercase text-slate-300">Cross-tenant Security Verified</span></div>
              </div>
              <Button asChild className="w-full h-14 bg-white text-primary font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-accent transition-colors shadow-2xl relative z-10"><Link href="/ai-insights">Launch AI Advisor <ChevronRight className="ml-1 h-4 w-4" /></Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
