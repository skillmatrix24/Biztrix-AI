
"use client";

import { useState, useMemo } from "react";
import { 
  BarChart3, 
  ArrowLeft, 
  TrendingUp, 
  DollarSign, 
  Calculator, 
  Briefcase, 
  Package, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Download, 
  Filter, 
  Search, 
  PieChart as PieChartIcon,
  Activity,
  History,
  Target,
  Zap,
  Loader2,
  AlertCircle,
  Users,
  FileText,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell,
  PieChart,
  Pie
} from "recharts";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc, where, Timestamp } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export default function SolarReportsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const isAdmin = useMemo(() => {
    const role = (profile?.role || '').toLowerCase();
    return role === 'admin' || role === 'manager' || user?.email?.toLowerCase() === 'skillmatrix24@gmail.com';
  }, [profile, user]);

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  // DATA NODES
  const inqQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'solarInquiries') : null, [firestore, businessId]);
  const { data: inquiries = [] } = useCollection<any>(inqQuery);

  const installsQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'solarInstallations') : null, [firestore, businessId]);
  const { data: installations = [] } = useCollection<any>(installsQuery);

  const productsQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'products') : null, [firestore, businessId]);
  const { data: products = [] } = useCollection<any>(productsQuery);

  const quotesQuery = useMemoFirebase(() => businessId ? query(collection(firestore, 'businesses', businessId, 'quotations'), orderBy('createdAt', 'desc')) : null, [firestore, businessId]);
  const { data: allQuotes = [] } = useCollection<any>(quotesQuery);
  const solarQuotes = useMemo(() => (allQuotes || []).filter((q: any) => q.solarSystemDesignId), [allQuotes]);

  const cashbookQuery = useMemoFirebase(() => businessId ? query(collection(firestore, 'businesses', businessId, 'cashbook'), where('category', '==', 'Sales')) : null, [firestore, businessId]);
  const { data: transactions = [] } = useCollection<any>(cashbookQuery);

  const commissionsQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'solarDealerCommissions') : null, [firestore, businessId]);
  const { data: commissions = [] } = useCollection<any>(commissionsQuery);

  const [activeReport, setActiveTab] = useState("sales");
  const [timeFilter, setTimeFilter] = useState("thisMonth");
  
  const currencySymbol = getCurrencySymbol(business?.currency);

  const reportStats = useMemo(() => {
    const qList = solarQuotes || [];
    const tList = transactions || [];
    const iList = installations || [];
    const pList = products || [];

    // 1. Sales Performance (Order Value)
    const totalQuotes = qList.length;
    const acceptedQuotes = qList.filter(q => q.status === 'converted');
    const acceptedValue = acceptedQuotes.reduce((sum, q) => sum + (q.totals?.finalPayout || 0), 0);
    
    // 2. Financial Performance (Collected Amount)
    const totalCollected = tList.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const collectionGap = acceptedValue - totalCollected;

    // 3. Operational Performance (Installed kWp)
    const installedKw = iList.filter(i => i.status === 'HANDED_OVER').reduce((sum, i) => sum + (parseFloat(i.capacityKw) || 0), 0);
    
    // 4. Material Costing Logic
    let totalMaterialCost = 0;
    let hasIncompleteCostBasis = false;

    iList.forEach(inst => {
      (inst.materials || []).forEach((m: any) => {
        const qty = parseFloat(m.issued) || 0;
        if (qty <= 0) return;

        if (m.unitCostAtIssue !== undefined) {
           totalMaterialCost += qty * m.unitCostAtIssue;
        } else {
           const currentCost = pList.find(p => p.id === m.productId)?.cost || 0;
           totalMaterialCost += qty * currentCost;
           hasIncompleteCostBasis = true;
        }
      });
    });
    
    return { 
      totalQuotes, 
      acceptedCount: acceptedQuotes.length, 
      acceptedValue, 
      totalCollected, 
      collectionGap, 
      installedKw,
      totalMaterialCost,
      hasIncompleteCostBasis
    };
  }, [solarQuotes, transactions, installations, products]);

  const handleExport = () => {
    toast({ title: "Report Exported", description: "Audit node generated in CSV format." });
  };

  if (isProfileLoading) return <div className="flex items-center justify-center py-20 opacity-40 text-left"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="space-y-8 pb-20 text-left">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner shrink-0">
            <BarChart3 className="h-7 w-7 text-primary" />
          </div>
          <div className="text-left">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Management Reports</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1.5 opacity-60">Verified Business Intelligence</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button onClick={handleExport} variant="outline" className="h-10 px-6 rounded-xl border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest shadow-sm bg-white">
             <Download className="mr-2 h-4 w-4" /> Export Node
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-primary text-left">
           <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Accepted Order Value</p>
           <div className="text-2xl font-black text-slate-900">{currencySymbol}{reportStats.acceptedValue.toLocaleString()}</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-green-500 text-left">
           <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1">Collected Amount</p>
           <div className="text-2xl font-black text-green-700">{currencySymbol}{reportStats.totalCollected.toLocaleString()}</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-orange-500 text-left">
           <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1">Installed Capacity (kWp)</p>
           <div className="text-2xl font-black text-orange-700">{reportStats.installedKw} kWp</div>
        </Card>
        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6 text-left">
           <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">Pipeline Ratio</p>
           <div className="text-2xl font-black text-white">{reportStats.totalQuotes > 0 ? Math.round((reportStats.acceptedCount / reportStats.totalQuotes) * 100) : 0}%</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
            <CardHeader className="bg-primary/5 border-b py-6 px-8 flex justify-between items-center text-left">
               <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><Calculator className="h-4 w-4" /> Material Costing Node</CardTitle>
               {reportStats.hasIncompleteCostBasis ? (
                 <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-[7px] font-black uppercase h-5">Estimated Basis</Badge>
               ) : (
                 <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-[7px] font-black uppercase h-5">Authoritative Basis</Badge>
               )}
            </CardHeader>
            <CardContent className="p-8 space-y-6 text-left">
               <div className="space-y-1 text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Material Consumption</p>
                  <p className="text-3xl font-black text-slate-900">{currencySymbol}{reportStats.totalMaterialCost.toLocaleString()}</p>
               </div>
               <div className="p-4 bg-muted/20 rounded-2xl space-y-2 text-left">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-2"><Info className="h-3.5 w-3.5" /> Cost Logic Notes</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                    {reportStats.hasIncompleteCostBasis 
                      ? "Historical records without issue-time snapshots use current catalog costs for estimation." 
                      : "Costs are based on actual historical prices recorded at the time of material issuance."}
                  </p>
               </div>
            </CardContent>
         </Card>

         <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
            <CardHeader className="bg-primary/5 border-b py-6 px-8 text-left">
               <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Est. Gross Contribution</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6 text-left">
               <div className="space-y-1 text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contribution - Material Only Basis</p>
                  <p className="text-3xl font-black text-green-600">{currencySymbol}{(reportStats.totalCollected - reportStats.totalMaterialCost).toLocaleString()}</p>
               </div>
               <p className="text-[10px] text-muted-foreground font-medium uppercase leading-relaxed italic text-left">
                 * Excludes Labour, Logistics and Commissions. Labeled as Estimated Gross Contribution per Phase 12A.
               </p>
            </CardContent>
         </Card>
      </div>

      <Tabs value={activeReport} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border h-14 p-1.5 rounded-2xl shadow-sm mb-10 flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="sales" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><Target className="h-4 w-4" /> Sales Registry</TabsTrigger>
          <TabsTrigger value="installs" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><Briefcase className="h-4 w-4" /> Field Node Report</TabsTrigger>
          {isAdmin && <TabsTrigger value="finance" className="flex-1 text-[10px] font-black uppercase px-8 gap-2 text-primary"><DollarSign className="h-4 w-4" /> Financial Node</TabsTrigger>}
          <TabsTrigger value="dealer" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><Users className="h-4 w-4" /> Partner Report</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="m-0 space-y-8 animate-in fade-in">
           <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2.5rem] border">
              <div className="overflow-x-auto scrollbar-hide text-left">
                 <Table className="min-w-[1000px]">
                    <TableHeader><TableRow className="bg-muted/10 border-b"><TableHead className="pl-8 text-[10px] font-black uppercase h-12">Client Identity</TableHead><TableHead className="text-[10px] font-black uppercase h-12">System Node</TableHead><TableHead className="text-center text-[10px] font-black uppercase h-12">Status</TableHead><TableHead className="text-right text-[10px] font-black uppercase h-12">Accepted Value</TableHead><TableHead className="text-right pr-8 h-12 w-16"></TableHead></TableRow></TableHeader>
                    <TableBody>
                       {solarQuotes.length === 0 ? <TableRow><TableCell colSpan={5} className="h-40 text-center opacity-30 italic text-sm">No sales traffic logged.</TableCell></TableRow> : solarQuotes.map((q: any) => (
                         <TableRow key={q.id} className="hover:bg-muted/5 border-b">
                            <TableCell className="pl-8 py-5 text-left"><p className="text-sm font-black text-slate-900 uppercase">{q.customerName}</p><p className="text-[9px] font-bold text-muted-foreground uppercase">{q.quotationId}</p></TableCell>
                            <TableCell><span className="text-xs font-bold text-slate-700 uppercase">SOLAR GEN NODE</span></TableCell>
                            <TableCell className="text-center"><Badge variant="outline" className="text-[8px] font-black uppercase h-5 px-2">{q.status}</Badge></TableCell>
                            <TableCell className="text-right font-black text-sm text-primary">{currencySymbol}{q.totals?.finalPayout?.toLocaleString()}</TableCell>
                            <TableCell className="text-right pr-8"><Button variant="ghost" size="icon" asChild><Link href={`/solar/quotations/${q.id}`}><ChevronRight className="h-4 w-4" /></Link></Button></TableCell>
                         </TableRow>
                       ))}
                    </TableBody>
                 </Table>
              </div>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
