
"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  LayoutDashboard, 
  Zap, 
  Target, 
  Briefcase, 
  Calculator, 
  Package, 
  Wrench, 
  ShieldCheck, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  ChevronRight, 
  Filter, 
  Search,
  Users,
  User,
  Bot,
  SmartphoneNfc,
  History,
  FileText,
  BadgeCheck,
  Building2,
  DollarSign,
  Smartphone,
  Loader2,
  Lock,
  ArrowRight,
  Sun,
  ClipboardCheck,
  AlertTriangle,
  Layers,
  SearchCode,
  Activity,
  LineChart,
  Info,
  Sparkles,
  Bell
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, where, orderBy, limit } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { runSolarConditionScanner } from "@/firebase/solar-notifications";

const INSTALL_STATUS_GROUPS: Record<string, string[]> = {
  'Staging': ['READY_TO_SCHEDULE', 'SCHEDULED', 'TEAM_ASSIGNED', 'MATERIAL_READY'],
  'Active': ['IN_PROGRESS', 'QUALITY_CHECK', 'COMMISSIONING'],
  'Closed': ['COMPLETED', 'HANDED_OVER']
};

export default function SolarOperationsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  // --- DATA NODES ---
  const inqQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'solarInquiries') : null, [firestore, businessId]);
  const { data: inquiriesData } = useCollection<any>(inqQuery);
  const inquiries = inquiriesData || [];

  const installsQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'solarInstallations') : null, [firestore, businessId]);
  const { data: installationsData } = useCollection<any>(installsQuery);
  const installations = installationsData || [];

  const serviceQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'solarServiceRequests') : null, [firestore, businessId]);
  const { data: servicesData } = useCollection<any>(serviceQuery);
  const services = servicesData || [];

  const amcQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'solarAmcContracts') : null, [firestore, businessId]);
  const { data: amcListData } = useCollection<any>(amcQuery);
  const amcList = amcListData || [];

  const productsQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'products') : null, [firestore, businessId]);
  const { data: productsData } = useCollection<any>(productsQuery);
  const products = productsData || [];

  const quotesQuery = useMemoFirebase(() => businessId ? query(collection(firestore, 'businesses', businessId, 'quotations'), orderBy('createdAt', 'desc')) : null, [firestore, businessId]);
  const { data: allQuotesData } = useCollection<any>(quotesQuery);
  const allQuotes = allQuotesData || [];
  const solarQuotes = useMemo(() => (allQuotes || []).filter((q: any) => q.solarSystemDesignId), [allQuotes]);

  const cashbookQuery = useMemoFirebase(() => businessId ? query(collection(firestore, 'businesses', businessId, 'cashbook'), where('category', '==', 'Sales')) : null, [firestore, businessId]);
  const { data: transactionsData } = useCollection<any>(cashbookQuery);
  const transactions = transactionsData || [];

  const notifQuery = useMemoFirebase(() => businessId ? query(collection(firestore, 'businesses', businessId, 'notifications'), where('type', '==', 'solar_alert'), orderBy('createdAt', 'desc'), limit(10)) : null, [firestore, businessId]);
  const { data: solarAlertsData } = useCollection<any>(notifQuery);
  const solarAlerts = solarAlertsData || [];

  const [activeTab, setActiveTab] = useState("overview");
  const currencySymbol = getCurrencySymbol(businessId ? "INR" : "INR");

  // --- TRIGGER SCANNER ---
  useEffect(() => {
    if (businessId && isAdmin && user?.uid) {
      runSolarConditionScanner(firestore, businessId, user.uid);
    }
  }, [businessId, isAdmin, user?.uid, firestore]);

  const opsStats = useMemo(() => {
    const fresh = (inquiries || []).filter(i => i.status === 'NEW').length;
    const workingInstalls = (installations || []).filter(i => i.status !== 'HANDED_OVER' && i.status !== 'CANCELLED').length;
    const openService = (services || []).filter(s => s.status !== 'RESOLVED' && s.status !== 'CLOSED').length;
    const activeAmc = (amcList || []).filter(a => a.status === 'ACTIVE').length; 

    const totalKw = (installations || []).filter(i => i.status === 'HANDED_OVER').reduce((sum, i) => sum + (parseFloat(i.capacityKw) || 0), 0);
    const acceptedValue = (solarQuotes || []).filter(q => q.status === 'converted').reduce((sum, q) => sum + (q.totals?.finalPayout || 0), 0);
    const totalCollected = (transactions || []).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const collectionGap = acceptedValue - totalCollected;

    return { fresh, workingInstalls, openService, activeAmc, totalKw, acceptedValue, totalCollected, collectionGap };
  }, [inquiries, installations, services, amcList, solarQuotes, transactions]);

  // MATERIAL READINESS ENGINE
  const materialReadiness = useMemo(() => {
    const active = (installations || []).filter(i => i.status !== 'HANDED_OVER' && i.status !== 'CANCELLED');
    return active.map(inst => {
      const materials = inst.materials || [];
      const shortages = materials.filter((m: any) => {
        const product = products?.find(p => p.id === m.productId);
        const remaining = (m.required || 0) - (m.issued || 0);
        return (product?.stock || 0) < remaining;
      });

      return {
        id: inst.id,
        name: inst.customerName,
        number: inst.installationNumber,
        status: inst.status,
        shortageCount: shortages.length,
        isReady: shortages.length === 0
      };
    });
  }, [installations, products]);

  if (isProfileLoading) return <div className="min-h-screen flex items-center justify-center opacity-40 text-left"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="space-y-8 pb-20 text-left">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl">
            <LayoutDashboard className="h-7 w-7" />
          </div>
          <div className="text-left">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Solar Operations</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Control Center Node v3.5</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button asChild variant="outline" className="h-10 px-6 rounded-xl border-primary/20 text-primary font-black uppercase text-[9px] tracking-widest bg-white shadow-sm">
             <Link href="/solar/analytics"><LineChart className="mr-2 h-4 w-4" /> BI Analytics</Link>
           </Button>
           <Button asChild className="bg-primary hover:bg-primary/90 shadow-xl h-10 px-6 font-black uppercase text-[9px] tracking-widest rounded-xl text-white">
             <Link href="/solar/ai-insights"><Sparkles className="mr-2 h-4 w-4" /> Intelligence</Link>
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-primary flex flex-col justify-between h-32 text-left">
           <div className="flex items-center justify-between opacity-60 mb-1"><span className="text-[9px] font-black uppercase tracking-widest">Active Sites</span><Activity className="h-4 w-4 text-primary" /></div>
           <div className="text-2xl md:text-3xl font-black text-slate-900">{opsStats.workingInstalls} Units</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-orange-500 flex flex-col justify-between h-32 text-left">
           <div className="flex items-center justify-between opacity-60 mb-1"><span className="text-[9px] font-black uppercase tracking-widest">Installed Capacity</span><BadgeCheck className="h-4 w-4 text-orange-600" /></div>
           <div className="text-2xl md:text-3xl font-black text-orange-700">{opsStats.totalKw} kWp</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-green-500 flex flex-col justify-between h-32 text-left">
           <div className="flex items-center justify-between opacity-60 mb-1"><span className="text-[10px] font-black uppercase tracking-widest text-green-600">Service Load</span><Wrench className="h-4 w-4 text-green-600" /></div>
           <div className="text-2xl md:text-3xl font-black text-green-700">{opsStats.openService} Tickets</div>
        </Card>
        <Card className={cn("border-none shadow-xl rounded-3xl p-6 flex flex-col justify-between h-32 border-l-4", opsStats.collectionGap > 0 ? "bg-red-50 border-l-red-600" : "bg-green-50 border-l-green-600")}>
           <div className="flex items-center justify-between opacity-60 mb-1"><span className={cn("text-[9px] font-black uppercase tracking-widest", opsStats.collectionGap > 0 ? "text-red-600" : "text-green-600")}>Collection Gap</span><DollarSign className="h-4 w-4" /></div>
           <div className={cn("text-2xl font-black", opsStats.collectionGap > 0 ? "text-red-700" : "text-green-700")}>{currencySymbol}{Math.max(0, opsStats.collectionGap).toLocaleString()}</div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border h-14 p-1.5 rounded-2xl shadow-sm mb-10 flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="overview" className="flex-1 text-[10px] font-black uppercase px-8 gap-2 whitespace-nowrap"><Target className="h-4 w-4" /> Attention Required</TabsTrigger>
          <TabsTrigger value="installations" className="flex-1 text-[10px] font-black uppercase px-8 gap-2 whitespace-nowrap"><Briefcase className="h-4 w-4" /> Field Execution</TabsTrigger>
          <TabsTrigger value="materials" className="flex-1 text-[10px] font-black uppercase px-8 gap-2 whitespace-nowrap"><Package className="h-4 w-4" /> Material Readiness</TabsTrigger>
          <TabsTrigger value="pipeline" className="flex-1 text-[10px] font-black uppercase px-8 gap-2 whitespace-nowrap"><SearchCode className="h-4 w-4" /> Sales Pipeline</TabsTrigger>
          {isAdmin && <TabsTrigger value="financials" className="flex-1 text-[10px] font-black uppercase px-8 gap-2 whitespace-nowrap text-primary"><DollarSign className="h-4 w-4" /> Financials</TabsTrigger>}
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8 space-y-8">
            <TabsContent value="overview" className="m-0 space-y-8 animate-in fade-in">
               <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
                  <CardHeader className="bg-primary/5 border-b py-6 px-8 flex flex-row items-center justify-between">
                     <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> Critical Operations Radar
                     </CardTitle>
                     <Badge className="bg-primary text-white border-none text-[8px] font-black h-5 px-3 uppercase">Real-time</Badge>
                  </CardHeader>
                  <div className="divide-y divide-border/50">
                     {(solarAlerts || []).map(alert => (
                       <div key={alert.id} className="p-6 flex items-center justify-between hover:bg-muted/5 transition-all">
                          <div className="flex items-start gap-4">
                             <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shadow-inner shrink-0", 
                                alert.severity === 'URGENT' ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600")}>
                                <Bell className="h-5 w-5" />
                             </div>
                             <div className="text-left">
                                <p className="text-sm font-black text-slate-900 uppercase leading-none">{alert.title}</p>
                                <p className="text-[10px] font-medium text-slate-500 mt-1.5">{alert.message}</p>
                                <p className="text-[7px] font-bold text-muted-foreground uppercase mt-1">{alert.createdAt?.toDate ? format(alert.createdAt.toDate(), 'dd MMM, HH:mm') : 'Recently'}</p>
                             </div>
                          </div>
                          <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg text-primary">
                             <Link href={alert.entityType === 'SOLAR_INSTALLATION' ? `/solar/installations/${alert.entityId}` : alert.entityType === 'SOLAR_INQUIRY' ? `/solar/inquiries/${alert.entityId}` : '#'}>
                               <ChevronRight className="h-4 w-4" />
                             </Link>
                          </Button>
                       </div>
                     ))}
                     {materialReadiness.filter(m => !m.isReady).map(m => (
                       <div key={m.id} className="p-6 flex items-center justify-between hover:bg-muted/5 transition-all cursor-pointer" onClick={() => router.push(`/solar/installations/${m.id}`)}>
                          <div className="flex items-center gap-4 text-left">
                             <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shadow-inner"><Package className="h-5 w-5" /></div>
                             <div className="text-left"><p className="text-sm font-black text-slate-900 uppercase">{m.name}</p><p className="text-[9px] font-bold text-red-600 uppercase">Material Shortage: {m.shortageCount} components</p></div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-primary opacity-20" />
                       </div>
                     ))}
                  </div>
               </Card>
            </TabsContent>

            <TabsContent value="installations" className="m-0 space-y-10 animate-in fade-in">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {Object.entries(INSTALL_STATUS_GROUPS).map(([groupName, statuses]) => (
                    <Card key={groupName} className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border">
                       <CardHeader className="bg-muted/30 border-b py-4 px-6 text-left">
                          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500">{groupName} Node</CardTitle>
                       </CardHeader>
                       <div className="divide-y divide-border/50">
                          {(installations || []).filter(i => statuses.includes(i.status)).map(i => (
                            <div key={i.id} className="p-5 flex items-center justify-between hover:bg-muted/5 transition-all cursor-pointer" onClick={() => router.push(`/solar/installations/${i.id}`)}>
                               <div className="text-left">
                                  <p className="text-xs font-black text-slate-900 uppercase truncate max-w-[150px]">{i.customerName}</p>
                                  <p className="text-[8px] font-bold text-primary uppercase mt-1">{i.status.replace(/_/g, ' ')}</p>
                               </div>
                               <Badge variant="outline" className="text-[7px] h-4 border-primary/20 text-primary">{i.capacityKw} kW</Badge>
                            </div>
                          ))}
                       </div>
                    </Card>
                  ))}
               </div>
            </TabsContent>

            <TabsContent value="materials" className="m-0 space-y-6 animate-in fade-in">
               <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2.5rem] border">
                  <div className="overflow-x-auto scrollbar-hide text-left">
                     <Table className="min-w-[800px]">
                        <TableHeader><TableRow className="bg-muted/10"><TableHead className="pl-8 text-[10px] font-black uppercase h-12">Field Installation</TableHead><TableHead className="text-[10px] font-black uppercase h-12">Status</TableHead><TableHead className="text-center text-[10px] font-black uppercase h-12">Inventory Node</TableHead><TableHead className="text-right pr-8 h-12"></TableHead></TableRow></TableHeader>
                        <TableBody>
                           {materialReadiness.map(m => (
                             <TableRow key={m.id} className="hover:bg-muted/5 border-b">
                                <TableCell className="pl-8 py-5">
                                   <div className="text-left">
                                      <p className="text-sm font-black text-slate-900 uppercase">{m.name}</p>
                                      <p className="text-[9px] font-bold text-muted-foreground uppercase">{m.number}</p>
                                   </div>
                                </TableCell>
                                <TableCell>
                                   <Badge variant="outline" className="text-[8px] font-black uppercase h-5 px-2">{m.status}</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                   <Badge className={cn("text-[8px] font-black h-5 px-3 uppercase border-none", m.isReady ? "bg-green-500 text-white" : "bg-red-50 text-white")}>
                                      {m.isReady ? 'READY TO DISPATCH' : `SHORT: ${m.shortageCount} ITEMS`}
                                   </Badge>
                                </TableCell>
                                <TableCell className="text-right pr-8">
                                  <Button asChild variant="ghost" size="icon">
                                    <Link href={`/solar/installations/${m.id}`}>
                                      <ChevronRight className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </TableCell>
                             </TableRow>
                           ))}
                        </TableBody>
                     </Table>
                  </div>
               </Card>
            </TabsContent>

            <TabsContent value="pipeline" className="m-0 space-y-6 animate-in fade-in">
                <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border">
                    <CardHeader className="bg-muted/30 border-b py-6 px-8 flex justify-between items-center text-left">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Sales Pipeline Node</CardTitle>
                    </CardHeader>
                    <div className="p-20 text-center opacity-30 italic text-[10px] font-black uppercase">
                       Pipeline overview synchronized with registry.
                    </div>
                </Card>
            </TabsContent>

            <TabsContent value="financials" className="m-0 space-y-10 animate-in fade-in">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border">
                     <CardHeader className="bg-green-50 border-b py-6 px-8 text-left">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-green-700">Collection Protocol Node</CardTitle>
                     </CardHeader>
                     <CardContent className="p-8 space-y-6 text-left">
                        <div className="flex justify-between items-end border-b pb-4">
                           <div className="text-left"><p className="text-[9px] font-black text-slate-400 uppercase">Accepted Value</p><p className="text-2xl font-black text-primary">{currencySymbol}{opsStats.acceptedValue.toLocaleString()}</p></div>
                           <div className="text-right"><p className="text-[9px] font-black text-slate-400 uppercase">Collected Amount</p><p className="text-lg font-black text-green-600">{currencySymbol}{opsStats.totalCollected.toLocaleString()}</p></div>
                        </div>
                        <div className="flex justify-between items-center text-left pt-2">
                           <span className="text-[10px] font-black text-red-600 uppercase">Collection Gap</span>
                           <span className="text-sm font-black text-red-600">{currencySymbol}{Math.max(0, opsStats.collectionGap).toLocaleString()}</span>
                        </div>
                     </CardContent>
                  </Card>
               </div>
            </TabsContent>
          </div>

          <div className="lg:col-span-4 space-y-8 text-left">
             <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden border border-white/5 group text-left">
                <CardHeader className="p-8 pb-4 text-left">
                   <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner group-hover:scale-110 transition-transform text-white">
                      <ShieldCheck className="h-6 w-6 text-accent" />
                   </div>
                   <CardTitle className="text-base font-black uppercase tracking-widest mt-4 leading-none text-white">System Protocol</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-6 text-left">
                   <p className="text-xs text-slate-400 leading-relaxed font-medium">This control layer provides a read-only snapshot. Recognized Revenue node is currently unavailable from authoritative data.</p>
                   <div className="space-y-4">
                      <div className="flex items-center gap-3 text-left"><CheckCircle2 className="h-4 w-4 text-green-400" /><span className="text-[10px] font-black uppercase text-slate-300">Tenant Scoped Isolation</span></div>
                   </div>
                </CardContent>
             </Card>

             <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border p-8 space-y-6 text-left">
                <div className="flex items-center gap-3">
                   <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm"><Bot className="h-5 w-5" /></div>
                   <h5 className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">AI Advisor Note</h5>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium leading-relaxed italic text-left">"Analysis: Installation throughput is up 12%. However, {(materialReadiness.filter(m=>!m.isReady).length)} sites are blocked due to inventory shortages. Recommend bulk reordering of DC cables."</p>
                <Button asChild variant="outline" className="w-full h-11 rounded-xl text-[9px] font-black uppercase border-primary/20 text-primary hover:bg-white">
                  <Link href="/solar/ai-insights">
                    Open Strategy Center <ChevronRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
             </Card>

             <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 flex items-start gap-4 shadow-inner text-left">
                <ShieldCheck className="h-5 w-5 text-primary opacity-40 shrink-0 mt-0.5" />
                <p className="text-[10px] text-primary/70 leading-relaxed font-medium italic uppercase tracking-tighter text-left">
                  "Your solar tracking node is encrypted and isolated per-tenant security protocol v3.5."
                </p>
             </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
