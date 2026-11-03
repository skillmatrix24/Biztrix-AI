
"use client";

import { use, useState, useMemo } from "react";
import { 
  Wrench, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Zap, 
  Loader2, 
  History, 
  User, 
  Smartphone, 
  ChevronRight, 
  BadgeCheck, 
  Bot, 
  Sparkles, 
  SmartphoneNfc, 
  ClipboardCheck, 
  Package, 
  Trash2, 
  X, 
  Settings2, 
  Calculator, 
  Info,
  Smartphone as PhoneIcon,
  Search,
  Plus,
  Activity,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection, updateDocumentNonBlocking, addDocumentNonBlocking, runTransaction } from "@/firebase";
import { collection, doc, serverTimestamp, query, where, increment, getDoc } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";
import { sendWhatsAppTemplate } from "@/app/actions/whatsapp-actions";

const SERVICE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  'OPEN': { label: 'Ticket Raised', color: 'text-blue-600', bg: 'bg-blue-50', icon: Zap },
  'TRIAGED': { label: 'Triaged', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Info },
  'SCHEDULED': { label: 'Visit Scheduled', color: 'text-purple-600', bg: 'bg-purple-50', icon: Clock },
  'IN_PROGRESS': { label: 'Work Underway', color: 'text-orange-600', bg: 'bg-orange-50', icon: Activity },
  'RESOLVED': { label: 'Resolved Node', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
  'CLOSED': { label: 'Archived Node', color: 'text-slate-500', bg: 'bg-slate-100', icon: BadgeCheck },
};

export default function SolarServiceDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const serviceRef = useMemoFirebase(() => businessId && id ? doc(firestore, 'businesses', businessId, 'solarServiceRequests', id) : null, [firestore, businessId, id]);
  const { data: service, isLoading: isServiceLoading } = useDoc<any>(serviceRef);

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const activeAddonIds = useMemo(() => business?.activeAddonIds || [], [business]);
  const isWhatsappEntitled = activeAddonIds.includes('feat_whatsapp') || activeAddonIds.includes('suite_growth');

  const teamQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null
  , [firestore, businessId]);
  const { data: businessUsers = [] } = useCollection<any>(teamQuery);

  const productsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'products') : null
  , [firestore, businessId]);
  const { data: products = [] } = useCollection<any>(productsQuery);

  const [activeTab, setActiveTab] = useState("overview");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  const handleUpdateStatus = (status: string) => {
    if (!serviceRef) return;
    updateDocumentNonBlocking(serviceRef, { status, updatedAt: serverTimestamp() });
    toast({ title: "Ticket Status Updated" });
  };

  const handleNotifyCustomer = async () => {
    if (!service || !businessId) return;

    if (!isWhatsappEntitled) {
      toast({
        title: "Growth Feature Required",
        description: "Customer WhatsApp notifications require the Growth Suite.",
        action: <Button variant="outline" size="sm" asChild><Link href="/marketplace">Upgrade</Link></Button>
      });
      return;
    }

    const waConfig = business?.whatsappApiConfig;
    if (!waConfig?.isVerified) {
      toast({ variant: "destructive", title: "API Unlinked" });
      return;
    }

    setIsNotifying(true);
    try {
      const targetPhone = "91" + service.customerPhone.replace(/\D/g, '').slice(-10);
      const res = await sendWhatsAppTemplate(
        businessId,
        { phoneId: waConfig.phoneId, accessToken: waConfig.accessToken },
        targetPhone,
        waConfig.welcomeTemplateName || "hello_world", // Reusing generic template for now
        waConfig.welcomeLanguageCode || "en_IN",
        [{
          type: "body",
          parameters: [
            { type: "text", text: service.customerName },
            { type: "text", text: `Your solar service ticket #${id.slice(-6).toUpperCase()} is now: ${service.status}` },
            { type: "text", text: `${window.location.origin}/portal/solar?bId=${businessId}` }
          ]
        }]
      );
      if (res.success) toast({ title: "Notification Dispatched" });
      else toast({ variant: "destructive", title: "Error", description: res.error });
    } finally {
      setIsNotifying(false);
    }
  };

  const handleUpdateAssignee = (userId: string) => {
    if (!serviceRef) return;
    const staff = businessUsers.find((u: any) => u.id === userId);
    updateDocumentNonBlocking(serviceRef, { 
      assignedTo: userId, 
      assignedName: staff?.name || 'Unassigned',
      status: 'SCHEDULED',
      updatedAt: serverTimestamp() 
    });
    toast({ title: "Technician Assigned" });
  };

  const handleUpdateField = (field: string, value: any) => {
    if (!serviceRef) return;
    updateDocumentNonBlocking(serviceRef, { [field]: value, updatedAt: serverTimestamp() });
  };

  const handleIssuePart = async (product: any) => {
    if (!serviceRef || !service || !businessId) return;
    
    setIsUpdating(true);
    try {
      const productRef = doc(firestore, 'businesses', businessId, 'products', product.id);
      
      await runTransaction(firestore, async (transaction) => {
        const productSnap = await transaction.get(productRef);
        if (!productSnap.exists()) throw new Error("PRODUCT_NOT_FOUND");
        
        const pData = productSnap.data() as any;
        if (pData.stock < 1) throw new Error("INSUFFICIENT_STOCK");

        const newStock = pData.stock - 1;
        const currentMaterials = service.materialsUsed || [];
        
        transaction.update(productRef, { stock: newStock });
        transaction.update(serviceRef, { 
          materialsUsed: [...currentMaterials, { productId: product.id, productName: product.name, quantity: 1, timestamp: new Date().toISOString() }],
          updatedAt: serverTimestamp() 
        });

        // Record in cashbook
        const cbRef = doc(collection(firestore, 'businesses', businessId, 'cashbook'));
        transaction.set(cbRef, {
            businessId, type: 'debit', amount: parseFloat(product.price) || 0,
            particulars: `Service Part: ${product.name} (Ticket: ${id.slice(-6).toUpperCase()})`,
            category: 'Other', date: new Date().toISOString().split('T')[0], createdAt: serverTimestamp()
        });
      });

      toast({ title: "Part Dispatched", description: "Inventory node updated atomically." });
    } catch (e: any) {
    console.error(e);
      toast({ variant: "destructive", title: "Dispatch Failed", description: e.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const currencySymbol = getCurrencySymbol(business?.currency);
  if (isServiceLoading) return <div className="min-h-screen flex items-center justify-center opacity-40"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;
  if (!service) return <div className="p-20 text-center"><p className="font-bold">Service node not found.</p><Button asChild variant="outline" className="mt-4"><Link href="/solar/service">Back to Registry</Link></Button></div>;

  const sInfo = SERVICE_STATUS_CONFIG[service.status] || SERVICE_STATUS_CONFIG['OPEN'];

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 text-left px-2 sm:px-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4 text-left flex-1 min-w-0">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0"><Link href="/solar/service"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="text-left flex-1 min-w-0">
             <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary h-5 px-3 mb-1.5 tracking-widest">TICKET NODE: {id.slice(-8).toUpperCase()}</Badge>
             <h1 className="text-2xl md:text-4xl font-black text-slate-900 leading-none uppercase truncate">{service.customerName}</h1>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={service.status} onValueChange={handleUpdateStatus}>
             <SelectTrigger className={cn("flex-1 md:flex-none h-11 rounded-xl font-black uppercase text-[10px] tracking-widest w-full md:w-48 shadow-xl", sInfo.bg, sInfo.color)}>
                <SelectValue />
             </SelectTrigger>
             <SelectContent className="rounded-xl border-none shadow-2xl">
                {Object.keys(SERVICE_STATUS_CONFIG).map(s => <SelectItem key={s} value={s} className="text-[10px] font-black uppercase">{SERVICE_STATUS_CONFIG[s].label}</SelectItem>)}
             </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-8 space-y-12">
          <Card className="border-none shadow-xl bg-white rounded-[3rem] overflow-hidden border">
             <CardHeader className="bg-slate-900 py-10 px-10 text-white relative text-left">
                <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12"><Wrench className="h-48 w-48" /></div>
                <div className="relative z-10 space-y-6">
                   <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner shrink-0"><Bot className="h-7 w-7 text-accent" /></div>
                      <div className="text-left">
                         <h3 className="text-xl font-black uppercase tracking-tight leading-none">{service.category?.replace('_', ' ')}</h3>
                         <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-2">Source: {service.requestSource || 'Manual Node'}</p>
                      </div>
                   </div>
                   <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10 italic text-sm font-medium text-slate-300 leading-relaxed text-left">
                      "{service.description || 'No detailed issue description provided.'}"
                   </div>
                </div>
             </CardHeader>
             
             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-8 border-b bg-muted/5">
                  <TabsList className="bg-transparent h-14 p-0 gap-8 border-none overflow-x-auto scrollbar-hide flex">
                    <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-14 text-[10px] font-black uppercase tracking-widest px-0">Assignment & Ops</TabsTrigger>
                    <TabsTrigger value="materials" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-14 text-[10px] font-black uppercase tracking-widest px-0">Parts & Inventory</TabsTrigger>
                    <TabsTrigger value="warranty" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-14 text-[10px] font-black uppercase tracking-widest px-0">Warranty Logic</TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-10 text-left min-h-[400px]">
                   <TabsContent value="overview" className="m-0 space-y-10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
                         <div className="space-y-3 text-left">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Dispatch Technician</Label>
                            <Select value={service.assignedTo || ""} onValueChange={handleUpdateAssignee}>
                               <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none shadow-inner font-bold"><SelectValue placeholder="Pick Specialist" /></SelectTrigger>
                               <SelectContent className="rounded-xl">
                                  {businessUsers.map((u:any) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>)}
                               </SelectContent>
                            </Select>
                         </div>
                         <div className="space-y-3 text-left">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Target Schedule</Label>
                            <Input type="datetime-local" value={service.scheduledAt || ""} onChange={(e) => handleUpdateField('scheduledAt', e.target.value)} className="h-12 rounded-xl bg-muted/20 border-none shadow-inner font-bold" />
                         </div>
                      </div>
                      <Separator />
                      <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 flex items-start gap-4 shadow-inner text-left">
                         <Info className="h-5 w-5 text-primary opacity-40 mt-0.5" />
                         <div className="space-y-1 text-left">
                            <p className="text-[10px] font-black uppercase text-primary">Technical Nudge</p>
                            <p className="text-[11px] text-primary/70 leading-relaxed font-medium">Verify system monitoring portal if available before dispatching a physical node for performance issues.</p>
                         </div>
                      </div>
                   </TabsContent>

                   <TabsContent value="materials" className="m-0 space-y-10">
                      <div className="flex items-center justify-between px-1">
                        <div className="space-y-1 text-left">
                           <h4 className="text-sm font-black uppercase text-slate-900 tracking-tight">Material Issue Node</h4>
                           <p className="text-[9px] font-bold text-muted-foreground uppercase">Inventory consumed for resolution</p>
                        </div>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[9px] h-6 px-3 uppercase">Hardened Sync</Badge>
                      </div>

                      <div className="space-y-4">
                         {(service.materialsUsed || []).map((m: any, i: number) => (
                           <div key={i} className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center justify-between">
                              <div className="text-left"><p className="text-xs font-bold text-green-900 uppercase">{m.productName}</p><p className="text-[8px] font-medium text-green-600 uppercase">{format(new Date(m.timestamp), 'dd MMM, HH:mm')}</p></div>
                              <Badge className="bg-green-600 text-white border-none text-[8px] font-black h-5 uppercase">ISSUED</Badge>
                           </div>
                         ))}
                      </div>

                      <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-border/50">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-3 block">Link Part from Registry</Label>
                        <div className="relative">
                           <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                           <Input placeholder="Search inventory for replacement parts..." className="h-14 pl-12 rounded-2xl bg-white border-none shadow-md font-bold" />
                           <div className="absolute top-full left-0 right-0 z-50 bg-white border rounded-[1.5rem] mt-2 shadow-2xl overflow-hidden max-h-[300px]">
                              <ScrollArea className="h-full">
                                 {(products || []).filter(p => p.stock > 0).map(p => (
                                    <div key={p.id} className="p-4 hover:bg-primary/5 cursor-pointer flex justify-between items-center border-b last:border-0 text-left" onClick={() => handleIssuePart(p)}>
                                       <div className="text-left">
                                          <p className="text-sm font-bold text-slate-900 uppercase">{p.name}</p>
                                          <p className="text-[8px] font-black text-muted-foreground uppercase">{p.sku} • Stock: {p.stock} {p.unit}</p>
                                       </div>
                                       <Plus className="h-4 w-4 text-primary opacity-30" />
                                    </div>
                                 ))}
                              </ScrollArea>
                           </div>
                        </div>
                      </div>
                   </TabsContent>

                   <TabsContent value="warranty" className="m-0 space-y-8 animate-in fade-in">
                      {service.warrantyId ? (
                        <Card className="border-none shadow-md bg-green-50 rounded-[2rem] p-8 border border-green-100 flex items-center justify-between">
                           <div className="flex items-center gap-4 text-left">
                              <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-green-600 shadow-sm"><ShieldCheck className="h-7 w-7" /></div>
                              <div className="text-left">
                                 <h4 className="text-sm font-black text-green-900 uppercase">Coverage Verified</h4>
                                 <p className="text-[9px] font-bold text-green-600 uppercase tracking-widest mt-1">Registry Node: {service.warrantyId}</p>
                              </div>
                           </div>
                           <Button asChild variant="outline" className="h-10 rounded-xl bg-white border-green-200 text-green-600 font-black text-[9px] uppercase"><Link href={`/solar/warranties/${service.warrantyId}`}>View Certificate</Link></Button>
                        </Card>
                      ) : (
                        <div className="p-16 text-center border-2 border-dashed rounded-[3rem] opacity-30 italic uppercase text-[10px] font-black">
                           No warranty node linked to this ticket.
                        </div>
                      )}
                   </TabsContent>
                </div>
             </Tabs>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8 text-left">
           <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
              <CardHeader className="bg-primary/5 border-b py-6 px-8 text-left">
                 <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <SmartphoneNfc className="h-4 w-4" /> Client Connect
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6 text-left">
                 {isWhatsappEntitled ? (
                   <>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">Notify the customer about the service status.</p>
                    <Button onClick={handleNotifyCustomer} disabled={isNotifying} className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">
                      {isNotifying ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <SmartphoneNfc className="h-4 w-4 mr-2" />}
                      Send Status Update
                    </Button>
                   </>
                 ) : (
                   <div className="space-y-4">
                      <p className="text-xs text-muted-foreground italic">"WhatsApp Automation is available as a separate add-on."</p>
                      <Button asChild variant="outline" className="w-full h-11 rounded-xl border-primary/20 text-primary font-black uppercase text-[9px]">
                        <Link href="/marketplace">Activate Growth Suite <ChevronRight className="ml-1 h-3 w-3" /></Link>
                      </Button>
                   </div>
                 )}
              </CardContent>
           </Card>

           <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
              <CardHeader className="bg-muted/30 border-b py-5 px-6"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Contextual Pulse</CardTitle></CardHeader>
              <CardContent className="p-8 space-y-8 text-left">
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Installation Node</p>
                       <Button asChild variant="link" className="h-auto p-0 font-black text-primary text-[10px] uppercase hover:no-underline"><Link href={`/solar/installations/${service.installationId}`}>View Site Registry <ArrowRight className="ml-1.5 h-3 w-3" /></Link></Button>
                    </div>
                    <Separator />
                    <div className="space-y-1">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inquiry Timeline</p>
                       <p className="text-xs font-bold text-slate-700 uppercase">Registered on {service.createdAt?.toDate ? format(service.createdAt.toDate(), 'dd MMM yyyy') : '--'}</p>
                    </div>
                 </div>
              </CardContent>
           </Card>

           <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] relative overflow-hidden group shadow-2xl text-left">
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:scale-110 transition-transform"><Bot className="h-40 w-40" /></div>
              <div className="relative z-10 space-y-6 text-left">
                 <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><Sparkles className="h-6 w-6 text-accent" /></div>
                 <h4 className="text-xl font-bold uppercase tracking-tight text-white leading-none">AI Resolution</h4>
                 <p className="text-xs text-slate-400 leading-relaxed font-medium italic text-left">"Analysis: Category {service.category} suggests a technical fault node. Dispatching a specialist with AC/DC testing kit recommended."</p>
                 <Separator className="bg-white/10" />
                 <div className="flex items-center gap-3 text-left"><BadgeCheck className="h-4 w-4 text-accent" /><span className="text-[9px] font-black uppercase text-slate-300">Identity Isolated v3.5</span></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
