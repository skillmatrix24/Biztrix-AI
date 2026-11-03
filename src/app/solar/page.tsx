
"use client";

import { useMemo, useState } from "react";
import { 
  Sun, 
  Zap, 
  Target, 
  Users, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  Bot,
  Sparkles,
  Loader2,
  Activity,
  Plus,
  ClipboardCheck,
  LayoutList,
  FileSpreadsheet,
  Settings2,
  BadgeCheck,
  SmartphoneNfc,
  ShieldCheck,
  Briefcase,
  Gem,
  Handshake,
  Shield,
  LineChart,
  ChevronRight,
  Wrench,
  ShieldAlert,
  LayoutDashboard,
  BarChart3,
  ShieldQuestion
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { collection, doc, query, orderBy, limit, where } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";

export default function SolarDashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const inquiriesQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarInquiries'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: inquiries = [], isLoading: isInquiriesLoading } = useCollection<any>(inquiriesQuery);

  const surveysQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarSurveys'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: surveys = [] } = useCollection<any>(surveysQuery);

  const designsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarSystemDesigns'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: designs = [] } = useCollection<any>(designsQuery);

  const quotesQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'quotations'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: allQuotes = [] } = useCollection<any>(quotesQuery);

  const installationsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarInstallations'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: installations = [] } = useCollection<any>(installationsQuery);

  const commissionsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarDealerCommissions'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: commissions = [] } = useCollection<any>(commissionsQuery);

  const warrantiesQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarWarranties'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: warranties = [] } = useCollection<any>(warrantiesQuery);

  const serviceQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarServiceRequests'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: serviceRequests = [] } = useCollection<any>(serviceQuery);

  const amcQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarAmcContracts'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: amcContracts = [] } = useCollection<any>(amcQuery);

  const solarQuotes = useMemo(() => 
    (allQuotes || []).filter((q: any) => q.solarSystemDesignId), 
  [allQuotes]);

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business, isLoading: isBusinessLoading } = useDoc<any>(businessRef);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const stats = useMemo(() => {
    const totalInq = (inquiries || []).length;
    const newInq = (inquiries || []).filter((i: any) => i.status === 'NEW').length;
    
    const activeInstalls = (installations || []).filter((i: any) => !['COMPLETED', 'HANDED_OVER', 'CANCELLED'].includes(i.status)).length;
    const activeWarranties = (warranties || []).filter(w => w.status === 'ACTIVE').length;
    
    const openServices = (serviceRequests || []).filter(s => s.status !== 'RESOLVED' && s.status !== 'CLOSED').length;
    const activeAmc = (amcContracts || []).filter(a => a.status === 'ACTIVE').length;

    return { 
      totalInq, newInq, activeInstalls, activeWarranties, openServices, activeAmc
    };
  }, [inquiries, installations, warranties, serviceRequests, amcContracts]);

  if (isProfileLoading) return <div className="flex flex-col items-center justify-center py-20 opacity-40 text-left"><Loader2 className="animate-spin text-primary mb-4" /><p className="text-[10px] font-black uppercase tracking-widest text-primary">Establishing Solar Node...</p></div>;

  return (
    <div className="space-y-8 pb-10 text-left">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-14 w-14 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20 shadow-inner">
            <Sun className="h-8 w-8 text-orange-600" />
          </div>
          <div className="text-left">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Solar Command</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Operations & Lifecycle Hub</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" className="h-10 px-6 rounded-xl border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest bg-white shadow-sm">
            <Link href="/solar/reports"><BarChart3 className="mr-2 h-4 w-4" /> Reporting</Link>
          </Button>
          <Button asChild variant="outline" className="h-10 px-6 rounded-xl border-orange-200 text-orange-600 font-black uppercase text-[10px] tracking-widest bg-white shadow-sm">
            <Link href="/solar/analytics"><LineChart className="mr-2 h-4 w-4" /> BI Insights</Link>
          </Button>
          <Button asChild className="bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
            <Link href="/solar/inquiries/new"><Plus className="mr-2 h-4 w-4" /> New Inquiry</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-5 md:p-6 border-l-4 border-l-blue-500 flex flex-col justify-between h-32 text-left">
           <div className="flex items-center justify-between opacity-60 mb-1"><span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Pipeline</span><Zap className="h-4 w-4 text-blue-500" /></div>
           <div className="text-2xl md:text-3xl font-black text-slate-900">{stats.newInq} New</div>
           <p className="text-[8px] font-bold uppercase text-muted-foreground">Inquiry Registry</p>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-5 md:p-6 border-l-4 border-l-orange-500 flex flex-col justify-between h-32 text-left">
           <div className="flex items-center justify-between opacity-60 mb-1"><span className="text-[10px] font-black uppercase tracking-widest text-orange-600">Active Field</span><Briefcase className="h-4 w-4 text-orange-600" /></div>
           <div className="text-2xl md:text-3xl font-black text-orange-700">{stats.activeInstalls} Sites</div>
           <p className="text-[8px] font-bold uppercase text-muted-foreground">Under Installation</p>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-5 md:p-6 border-l-4 border-l-indigo-500 flex flex-col justify-between h-32 text-left">
           <div className="flex items-center justify-between opacity-60 mb-1"><span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Service Nodes</span><Wrench className="h-4 w-4 text-indigo-600" /></div>
           <div className="text-2xl md:text-3xl font-black text-indigo-700">{stats.openServices} Open</div>
           <p className="text-[8px] font-bold uppercase text-muted-foreground">Active Tickets</p>
        </Card>
        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6 flex flex-col justify-between h-32 text-left">
           <div className="flex items-center justify-between opacity-40 mb-1"><span className="text-[10px] font-black uppercase tracking-widest text-accent">AMC Hub</span><ShieldAlert className="h-4 w-4 text-accent" /></div>
           <div className="text-2xl font-black text-white">{stats.activeAmc} <span className="text-xs opacity-50">Active</span></div>
           <p className="text-[8px] font-bold uppercase text-slate-400">Contracts Verified</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
           <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left hover:shadow-xl transition-all group">
                <CardHeader className="bg-muted/30 p-6 border-b">
                   <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Wrench className="h-5 w-5" /></div>
                      <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 text-primary h-5 px-2">SERVICE</Badge>
                   </div>
                </CardHeader>
                <CardContent className="p-6 space-y-2">
                   <h4 className="text-sm font-black uppercase text-slate-900">After-Sales Support</h4>
                   <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-tight">Manage fault tickets, warranty claims, and technician dispatches.</p>
                </CardContent>
                <CardFooter className="p-6 pt-0 border-t bg-muted/5 mt-auto">
                   <Button asChild variant="ghost" className="w-full h-10 rounded-xl text-[9px] font-black uppercase text-primary hover:bg-white">
                      <Link href="/solar/service">Enter Service Desk <ArrowRight className="ml-2 h-3.5 w-3.5" /></Link>
                   </Button>
                </CardFooter>
              </Card>

              <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left hover:shadow-xl transition-all group">
                <CardHeader className="bg-muted/30 p-6 border-b">
                   <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600"><ShieldAlert className="h-5 w-5" /></div>
                      <Badge variant="outline" className="text-[8px] font-black uppercase border-orange-200 text-orange-600 h-5 px-2">MAINTENANCE</Badge>
                   </div>
                </CardHeader>
                <CardContent className="p-6 space-y-2">
                   <h4 className="text-sm font-black uppercase text-slate-900">AMC & Maintenance</h4>
                   <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-tight">Contract registry, renewal tracking, and preventive visit scheduling.</p>
                </CardContent>
                <CardFooter className="p-6 pt-0 border-t bg-muted/5 mt-auto">
                   <Button asChild variant="ghost" className="w-full h-10 rounded-xl text-[9px] font-black uppercase text-orange-600 hover:bg-white">
                      <Link href="/solar/amc">Manage Contracts <ArrowRight className="ml-2 h-3.5 w-3.5" /></Link>
                   </Button>
                </CardFooter>
              </Card>
           </section>

           <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2.5rem] border">
            <CardHeader className="bg-muted/20 border-b py-6 px-8 flex flex-row items-center justify-between text-left">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 text-left">
                <Activity className="h-4 w-4" /> Recent Operational Activity
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto scrollbar-hide">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Customer Node</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase h-12">Last Stage</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase h-12">Warranty</TableHead>
                    <TableHead className="text-right pr-8 h-12 w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installations.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="h-40 text-center opacity-30 italic text-sm uppercase">No operational traffic logged.</TableCell></TableRow>
                  ) : (
                    installations.slice(0, 5).map((inst: any) => {
                      const hasWarranty = warranties.some(w => w.solarInstallationId === inst.id);
                      return (
                        <TableRow key={inst.id} className="group hover:bg-muted/5 transition-colors border-b cursor-pointer" onClick={() => router.push(`/solar/installations/${inst.id}`)}>
                          <TableCell className="pl-8 py-5">
                            <div className="flex items-center gap-4 text-left">
                              <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center font-black text-orange-600 text-xs shadow-inner uppercase shrink-0">I</div>
                              <div className="min-w-0 text-left">
                                <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{inst.customerName}</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{inst.installationNumber}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-2 border-none bg-muted/50 shadow-sm">{inst.status}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {hasWarranty ? <BadgeCheck className="h-5 w-5 text-green-600 mx-auto" /> : <ShieldAlert className="h-5 w-5 text-slate-200 mx-auto" />}
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <ChevronRight className="h-4 w-4 text-primary opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8 text-left">
           <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden text-left relative group">
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:scale-110 transition-transform"><Bot className="h-40 w-40" /></div>
              <CardHeader className="mb-6 relative z-10 p-8 pb-0 text-left">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><Sparkles className="h-6 w-6 text-accent" /></div>
                <CardTitle className="text-base font-black uppercase tracking-widest mt-4 text-white leading-none">AI Strategy Center</CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-6 relative z-10 text-left">
                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-left">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Retention</span>
                      <span className="text-xs font-black text-accent">{stats.activeAmc} Contracts</span>
                    </div>
                    <Progress value={85} className="h-1 bg-white/10" />
                 </div>
                 <Separator className="bg-white/10" />
                 <p className="text-xs text-slate-400 leading-relaxed font-medium italic text-left">"Analysis: Technical service tickets average 24h resolution. Suggest increasing AMC coverage for older installations."</p>
                 <Button asChild className="w-full h-12 bg-white text-primary font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl hover:bg-accent transition-all">
                    <Link href="/solar/ai-insights">Open Strategy Center <ChevronRight className="ml-1 h-3 w-3" /></Link>
                 </Button>
              </CardContent>
           </Card>

           <Card className="border-none shadow-md bg-white rounded-[2rem] border overflow-hidden text-left">
              <CardHeader className="bg-muted/30 border-b py-5 px-8">
                 <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><ShieldQuestion className="h-4 w-4" /> Reconciliation</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-4 text-left">
                 <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">Detect orphaned installations or payment mismatches in the technical registry.</p>
                 <Button asChild variant="outline" className="w-full h-10 rounded-xl text-[10px] font-black uppercase border-primary/20 text-primary">
                    <Link href="/solar/reconciliation">Run Logic Audit <ArrowRight className="ml-2 h-3.5 w-3.5" /></Link>
                 </Button>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
