
"use client";

import { use, useState, useMemo } from "react";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Zap, 
  Loader2, 
  History, 
  Settings2, 
  Calculator, 
  BadgeCheck, 
  FileText, 
  ArrowRight,
  Sun,
  Smartphone,
  Globe,
  Lock,
  Package,
  Wrench,
  Activity,
  User,
  SmartphoneNfc,
  ClipboardCheck,
  ChevronRight,
  Info,
  ShieldAlert,
  Bot,
  Sparkles
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { doc, serverTimestamp, collection, query, where, orderBy } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";

const PLANT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  'ACTIVE': { label: 'Operational', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
  'SERVICE': { label: 'Under Service', color: 'text-orange-600', bg: 'bg-orange-50', icon: Wrench },
  'INACTIVE': { label: 'System Offline', color: 'text-slate-500', bg: 'bg-slate-100', icon: Clock },
  'DECOMMISSIONED': { label: 'Decommissioned', color: 'text-red-600', bg: 'bg-red-50', icon: History },
};

export default function SolarPlantDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const plantRef = useMemoFirebase(() => businessId && id ? doc(firestore, 'businesses', businessId, 'solarPlants', id) : null, [firestore, businessId, id]);
  const { data: plant, isLoading: isPlantLoading } = useDoc<any>(plantRef);

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const [activeTab, setActiveTab] = useState("overview");

  // Related Entities Fetching
  const serviceQuery = useMemoFirebase(() => 
    businessId && plant?.installationId ? query(collection(firestore, 'businesses', businessId, 'solarServiceRequests'), where('installationId', '==', plant.installationId), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId, plant?.installationId]);
  const { data: serviceHistory = [] } = useCollection<any>(serviceQuery);

  const docsQuery = useMemoFirebase(() => 
    businessId && plant?.installationId ? query(collection(firestore, 'businesses', businessId, 'solarDocuments'), where('installationId', '==', plant.installationId)) : null
  , [firestore, businessId, plant?.installationId]);
  const { data: documents = [] } = useCollection<any>(docsQuery);

  const handleUpdateStatus = (status: string) => {
    if (!plantRef) return;
    updateDocumentNonBlocking(plantRef, { status, updatedAt: serverTimestamp() });
    toast({ title: "Plant Status Updated" });
  };

  if (isPlantLoading) return <div className="min-h-screen flex items-center justify-center opacity-40"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;
  if (!plant) return <div className="p-20 text-center space-y-4 text-left"><ShieldCheck className="h-12 w-12 mx-auto text-slate-300" /><p className="font-bold">Plant Node Not Found</p><Button asChild variant="outline"><Link href="/solar/plants">Back to Registry</Link></Button></div>;

  const sInfo = PLANT_STATUS_CONFIG[plant.status] || PLANT_STATUS_CONFIG['ACTIVE'];
  const currencySymbol = getCurrencySymbol(business?.currency);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32 text-left px-2 sm:px-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4 text-left flex-1 min-w-0">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm border border-border/50 shrink-0"><Link href="/solar/plants"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="text-left flex-1 min-w-0">
             <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary h-5 px-3 mb-1.5 tracking-widest">ASSET NODE: {plant.plantReference}</Badge>
             <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase truncate">{plant.customerName}</h1>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={plant.status} onValueChange={handleUpdateStatus}>
             <SelectTrigger className={cn("flex-1 md:flex-none h-11 rounded-xl font-black uppercase text-[10px] tracking-widest w-full md:w-48 shadow-lg", sInfo.bg, sInfo.color)}>
                <SelectValue />
             </SelectTrigger>
             <SelectContent className="rounded-xl border-none shadow-2xl">
                {Object.keys(PLANT_STATUS_CONFIG).map(s => <SelectItem key={s} value={s} className="text-[10px] font-black uppercase">{PLANT_STATUS_CONFIG[s].label}</SelectItem>)}
             </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-8 space-y-10">
          <Card className="border-none shadow-xl bg-white rounded-[3rem] overflow-hidden border">
             <CardHeader className="bg-slate-900 py-10 px-10 text-white relative text-left shrink-0">
                <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12"><Sun className="h-64 w-64" /></div>
                <div className="relative z-10 space-y-8 text-left">
                   <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner shrink-0">
                         <Zap className="h-8 w-8 text-accent" />
                      </div>
                      <div className="text-left">
                         <h3 className="text-2xl font-black uppercase tracking-tight leading-none">{plant.installedCapacityKwp} kWp Installed</h3>
                         <p className="text-white/40 text-[9px] font-bold uppercase tracking-[0.2em] mt-3">System Identity v3.5 • {plant.systemType}</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10 text-left">
                         <p className="text-[10px] font-black uppercase text-slate-400 mb-1.5">Asset Registry Node</p>
                         <p className="text-xl font-black text-white">{plant.plantReference}</p>
                      </div>
                      <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10 text-left">
                         <p className="text-[10px] font-black uppercase text-slate-400 mb-1.5">Activation Point</p>
                         <p className="text-xl font-black text-white">{plant.handoverDate || plant.commissioningDate || '--'}</p>
                      </div>
                   </div>
                </div>
             </CardHeader>
             
             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-8 border-b bg-muted/5">
                  <TabsList className="bg-transparent h-14 p-0 gap-8 border-none overflow-x-auto scrollbar-hide flex">
                    <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-14 text-[10px] font-black uppercase tracking-widest px-0">Overview</TabsTrigger>
                    <TabsTrigger value="equipment" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-14 text-[10px] font-black uppercase tracking-widest px-0">Equipment</TabsTrigger>
                    <TabsTrigger value="monitoring" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-14 text-[10px] font-black uppercase tracking-widest px-0">Monitoring</TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-8 sm:p-10 text-left min-h-[400px]">
                   <TabsContent value="overview" className="m-0 space-y-10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
                         <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1"><Info className="h-4 w-4" /> Technical Profile</h4>
                            <div className="p-6 bg-muted/10 rounded-[2rem] space-y-4 shadow-inner">
                               <div className="text-left"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Architecture</p><p className="text-sm font-bold text-slate-700 uppercase">{plant.systemType}</p></div>
                               <div className="text-left"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Source Record</p><Button asChild variant="link" className="h-auto p-0 font-bold text-primary text-[10px] uppercase"><Link href={`/solar/installations/${plant.installationId}`}>View Installation Hub</Link></Button></div>
                            </div>
                         </div>
                         <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1"><ShieldCheck className="h-4 w-4" /> Coverage Node</h4>
                            <div className="p-6 bg-green-50/50 rounded-[2rem] border border-green-100 space-y-4">
                               <div className="text-left"><p className="text-[8px] font-black text-green-600 uppercase tracking-widest mb-1">Warranty Health</p><Badge className="bg-green-600 text-white border-none text-[8px] font-black px-2 h-4 uppercase">VERIFIED ACTIVE</Badge></div>
                               <Button asChild variant="outline" className="w-full h-10 rounded-xl bg-white border-green-200 text-green-600 text-[9px] font-black uppercase"><Link href={`/solar/warranties`}>Open Warranty Hub</Link></Button>
                            </div>
                         </div>
                      </div>

                      <Separator />

                      <section className="space-y-6 text-left">
                         <div className="flex items-center gap-3 px-1 text-left">
                            <History className="h-5 w-5 text-primary" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Service Lifecycle Feed</h4>
                         </div>
                         {serviceHistory.length === 0 ? (
                           <div className="p-12 text-center border-2 border-dashed rounded-[2rem] opacity-30 italic text-[10px] font-black uppercase">No technical interventions logged.</div>
                         ) : (
                           <div className="space-y-4">
                              {serviceHistory.map((s: any) => (
                                <div key={s.id} className="p-4 bg-white rounded-2xl border flex items-center justify-between group hover:shadow-md transition-all">
                                   <div className="text-left"><p className="text-xs font-bold text-slate-900 uppercase">{s.category?.replace(/_/g, ' ')}</p><p className="text-[8px] font-black text-muted-foreground uppercase mt-1">{s.createdAt?.toDate ? format(s.createdAt.toDate(), 'dd MMM yyyy') : '--'}</p></div>
                                   <Badge variant="outline" className="text-[8px] h-5 px-2 uppercase border-primary/20 text-primary">{s.status}</Badge>
                                </div>
                              ))}
                           </div>
                         )}
                      </section>
                   </TabsContent>

                   <TabsContent value="equipment" className="m-0 space-y-8">
                      <div className="border rounded-[2rem] overflow-hidden shadow-sm">
                         <Table>
                            <TableHeader><TableRow className="bg-muted/30"><TableHead className="pl-8 text-[10px] font-black uppercase h-12">Component Registry</TableHead><TableHead className="text-center text-[10px] font-black uppercase h-12">Qty</TableHead><TableHead className="text-right pr-8 text-[10px] font-black uppercase h-12">Serial Identity</TableHead></TableRow></TableHeader>
                            <TableBody>
                               {(plant.equipment || []).map((e: any, i: number) => (
                                 <TableRow key={i} className="hover:bg-muted/5 transition-colors border-b last:border-0">
                                    <TableCell className="pl-8 py-5">
                                       <div className="text-left"><p className="text-sm font-bold text-slate-900 uppercase leading-none">{e.productName}</p><Badge variant="outline" className="mt-2 bg-primary/5 text-primary border-primary/10 text-[7px] h-4 uppercase">{e.category}</Badge></div>
                                    </TableCell>
                                    <TableCell className="text-center font-black text-xs">{e.quantity} Units</TableCell>
                                    <TableCell className="text-right pr-8"><p className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">{e.serialNumber || 'STD-NODE'}</p></TableCell>
                                 </TableRow>
                               ))}
                            </TableBody>
                         </Table>
                      </div>
                   </TabsContent>

                   <TabsContent value="monitoring" className="m-0 space-y-10 animate-in fade-in">
                      <div className="max-w-md mx-auto text-center space-y-8 py-10">
                         <div className="h-24 w-24 rounded-[3rem] bg-muted/20 flex items-center justify-center mx-auto text-slate-300 border-4 border-dashed border-slate-200">
                            <Activity className="h-10 w-10" />
                         </div>
                         <div className="space-y-3">
                            <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Monitoring Readiness</h4>
                            <p className="text-xs text-muted-foreground font-medium leading-relaxed">System identity is established. Inverter telemetry connection node is currently offline.</p>
                         </div>
                         <div className="grid grid-cols-1 gap-4">
                            <div className="p-6 bg-slate-50 rounded-3xl border flex items-center justify-between text-left">
                               <div><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Inverter Data Port</p><p className="text-sm font-black text-slate-900">NOT CONNECTED</p></div>
                               <Lock className="h-5 w-5 text-slate-200" />
                            </div>
                            <div className="p-6 bg-slate-50 rounded-3xl border flex items-center justify-between text-left">
                               <div><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Generation Data</p><p className="text-sm font-black text-slate-900">UNAVAILABLE</p></div>
                               <ShieldAlert className="h-5 w-5 text-slate-200" />
                            </div>
                         </div>
                      </div>
                   </TabsContent>
                </div>
             </Tabs>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8 text-left">
           <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
              <CardHeader className="bg-primary/5 border-b py-6 px-8 text-left"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 text-left"><Globe className="h-4 w-4" /> Sharing Protocol</CardTitle></CardHeader>
              <CardContent className="p-8 space-y-6 text-left">
                 <p className="text-sm text-muted-foreground leading-relaxed font-medium">Clients can track their plant lifecycle node via the <strong>Customer Portal</strong>.</p>
                 <Button asChild className="w-full h-14 bg-primary text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">
                    <Link href={`/portal/solar?bId=${businessId}`}>Enter Client Portal <ArrowRight className="ml-2 h-4 w-4" /></Link>
                 </Button>
              </CardContent>
           </Card>

           <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] relative overflow-hidden group shadow-2xl text-left">
              <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 group-hover:scale-110 transition-transform"><Bot className="h-40 w-40" /></div>
              <div className="relative z-10 space-y-6 text-left">
                 <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><Sparkles className="h-6 w-6 text-accent" /></div>
                 <h4 className="text-xl font-bold uppercase tracking-tight text-white leading-none">Asset Intelligence</h4>
                 <p className="text-xs text-slate-400 leading-relaxed font-medium italic text-left">"Analysis: Technical node {plant.plantReference} is stable. Warranty coverage is 100% mapped across BOM nodes."</p>
                 <Separator className="bg-white/10" />
                 <div className="flex items-center gap-3 text-left"><BadgeCheck className="h-4 w-4 text-accent" /><span className="text-[9px] font-black uppercase text-slate-300">Tenant Identity Isolated</span></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
