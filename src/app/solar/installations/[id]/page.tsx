
"use client";

import { use, useState, useMemo, useEffect, useRef } from "react";
import { 
  ArrowLeft, 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  User, 
  Zap, 
  ShieldCheck, 
  Bot, 
  Loader2, 
  ChevronRight, 
  Target, 
  History, 
  Activity, 
  Settings2, 
  Calculator, 
  Package, 
  Trash2, 
  SmartphoneNfc, 
  Sparkles, 
  BadgeCheck, 
  Layers, 
  Globe, 
  FileText, 
  ListTodo, 
  Trophy, 
  X,
  PlusCircle,
  Users,
  Camera,
  Search,
  Check,
  CheckCheck,
  Smartphone,
  Phone,
  Mail,
  MapPin,
  ClipboardCheck,
  Receipt,
  ShieldAlert,
  Shield,
  Palette,
  ShoppingBasket
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from "@/components/ui/dialog";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection, updateDocumentNonBlocking, addDocumentNonBlocking, runTransaction, setDocumentNonBlocking } from "@/firebase";
import { collection, doc, serverTimestamp, query, where, increment, getDoc, getDocs, limit } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { format, addYears } from "date-fns";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { sendWhatsAppTemplate } from "@/app/actions/whatsapp-actions";

// PHASE 14 MODULAR COMPONENT
import { HandoverCertificate } from "../../components/HandoverCertificate";

const INSTALLATION_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  'READY_TO_SCHEDULE': { label: 'Ready to Schedule', color: 'text-blue-500', bg: 'bg-blue-50', icon: Clock },
  'SCHEDULED': { label: 'Scheduled', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Target },
  'TEAM_ASSIGNED': { label: 'Team Ready', color: 'text-purple-600', bg: 'bg-purple-50', icon: Users },
  'MATERIAL_READY': { label: 'Material Staged', color: 'text-orange-600', bg: 'bg-orange-50', icon: Zap },
  'IN_PROGRESS': { label: 'Under Installation', color: 'text-orange-700', bg: 'bg-orange-100/50', icon: Activity },
  'QUALITY_CHECK': { label: 'Quality Control', color: 'text-pink-600', bg: 'bg-pink-50', icon: ShieldCheck },
  'COMMISSIONING': { label: 'Commissioning', color: 'text-cyan-600', bg: 'bg-cyan-50', icon: Sparkles },
  'HANDED_OVER': { label: 'Completed Node', color: 'text-green-600', bg: 'bg-green-50', icon: BadgeCheck },
};

export default function SolarInstallationDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const installRef = useMemoFirebase(() => 
    businessId && id ? doc(firestore, 'businesses', businessId, 'solarInstallations', id) : null
  , [firestore, businessId, id]);
  const { data: install, isLoading: isInstallLoading } = useDoc<any>(installRef);

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const activeAddonIds = useMemo(() => business?.activeAddonIds || [], [business]);
  const isWhatsappEntitled = activeAddonIds.includes('feat_whatsapp') || activeAddonIds.includes('suite_growth');

  const teamQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null
  , [firestore, businessId]);
  const { data: businessUsers = [] } = useCollection<any>(teamQuery);

  const warrantiesQuery = useMemoFirebase(() => 
    businessId && id ? query(collection(firestore, 'businesses', businessId, 'solarWarranties'), where('solarInstallationId', '==', id)) : null
  , [firestore, businessId, id]);
  const { data: relatedWarranties = [] } = useCollection<any>(warrantiesQuery);

  // FETCH DOCUMENTS FOR THIS INSTALLATION
  const docsQuery = useMemoFirebase(() => 
    businessId && id ? query(collection(firestore, 'businesses', businessId, 'solarDocuments'), where('installationId', '==', id)) : null
  , [firestore, businessId, id]);
  const { data: documents = [] } = useCollection<any>(docsQuery);

  // FETCH PROCUREMENT REQUISITIONS
  const reqsQuery = useMemoFirebase(() => 
    businessId && id ? query(collection(firestore, 'businesses', businessId, 'solarPurchaseRequisitions'), where('installationId', '==', id)) : null
  , [firestore, businessId, id]);
  const { data: requisitions = [] } = useCollection<any>(reqsQuery);

  const [activeTab, setActiveTab] = useState("overview");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isWarrantyLoading, setIsWarrantyLoading] = useState(false);
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [isPlantLoading, setIsPlantLoading] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  const handleUpdateStatus = (status: string) => {
    if (!installRef) return;
    updateDocumentNonBlocking(installRef, { status, updatedAt: serverTimestamp() });
    toast({ title: "Site Status Updated" });
  };

  const handleNotifyCustomer = async () => {
    if (!install || !businessId) return;

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
      const targetPhone = "91" + install.customerPhone.replace(/\D/g, '').slice(-10);
      const res = await sendWhatsAppTemplate(
        businessId,
        { phoneId: waConfig.phoneId, accessToken: waConfig.accessToken },
        targetPhone,
        waConfig.welcomeTemplateName || "hello_world",
        waConfig.welcomeLanguageCode || "en_IN",
        [{
          type: "body",
          parameters: [
            { type: "text", text: install.customerName },
            { type: "text", text: `Your ${install.capacityKw}kW system installation status: ${install.status.replace(/_/g, ' ')}` },
            { type: "text", text: `${window.location.origin}/projects/track/${businessId}/${install.solarInquiryId}` }
          ]
        }]
      );
      if (res.success) toast({ title: "Status Pushed to Client" });
      else toast({ variant: "destructive", title: "Dispatch Failed", description: res.error });
    } finally {
      setIsNotifying(false);
    }
  };

  const handleActivateWarranty = async () => {
    if (!businessId || !install || isWarrantyLoading) return;
    setIsWarrantyLoading(true);
    try {
      const warrantyId = `WAR-${Math.floor(100000 + Math.random() * 900000)}`;
      const startDate = new Date();
      const endDate = addYears(startDate, 5); 

      const components = (install.materials || []).map((m: any) => ({
        productId: m.productId,
        productName: m.productName,
        category: m.category,
        period: m.category === 'Panels' ? '25 Years' : m.category === 'Inverter' ? '5 Years' : '10 Years'
      }));

      const warData = {
        warrantyNumber: warrantyId,
        businessId,
        customerId: install.customerId,
        customerName: install.customerName,
        solarInstallationId: id,
        solarSystemDesignId: install.solarSystemDesignId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        status: 'ACTIVE',
        coveredComponents: components,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const warDocRef = await addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'solarWarranties'), warData);

      // REGISTER WARRANTY DOCUMENT METADATA
      if (warDocRef) {
        addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'solarDocuments'), {
          businessId,
          documentType: 'WARRANTY_CERTIFICATE',
          title: `Warranty Certificate: ${warrantyId}`,
          entityType: 'WARRANTY',
          entityId: warDocRef.id,
          customerId: install.customerId,
          customerName: install.customerName,
          installationId: id,
          visibility: 'CUSTOMER_VISIBLE',
          createdAt: serverTimestamp()
        });
      }

      toast({ title: "Warranty Established", description: `Registry node ${warrantyId} created.` });
      router.push('/solar/warranties');
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Activation Failed" });
    } finally {
      setIsWarrantyLoading(false);
    }
  };

  // PHASE 16: IDEMPOTENT PLANT DEPLOYMENT
  const handleDeployPlant = async () => {
    if (!businessId || !install || isPlantLoading) return;
    setIsPlantLoading(true);

    try {
      const plantsRef = collection(firestore, 'businesses', businessId, 'solarPlants');
      const existingQuery = query(plantsRef, where('installationId', '==', id), limit(1));
      const existingSnap = await getDocs(existingQuery);

      if (!existingSnap.empty) {
        toast({ title: "Node Already Exists", description: "Navigating to existing plant registry." });
        router.push(`/solar/plants/${existingSnap.docs[0].id}`);
        return;
      }

      const plantId = `PLANT-${Math.floor(100000 + Math.random() * 900000)}`;
      const equipment = (install.materials || []).map((m: any) => ({
        productId: m.productId,
        productName: m.productName,
        quantity: m.issued || 0,
        category: m.category || 'General',
        serialNumber: m.specs || ""
      }));

      const plantData = {
        id: plantId,
        businessId,
        plantReference: plantId,
        customerId: install.customerId,
        customerName: install.customerName,
        installationId: id,
        designId: install.solarSystemDesignId || null,
        status: 'ACTIVE',
        installedCapacityKwp: install.capacityKw || 0,
        systemType: install.systemType || 'On-grid',
        commissioningDate: new Date().toISOString().split('T')[0],
        handoverDate: install.handoverDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        monitoringStatus: 'NOT_CONNECTED',
        equipment,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDocumentNonBlocking(plantsRef, plantData);
      toast({ title: "Plant Asset Established", description: `Node ${plantId} initialized in registry.` });
      if (docRef) router.push(`/solar/plants/${docRef.id}`);
    } finally {
      setIsPlantLoading(false);
    }
  };

  const handleHandoverFinalize = async (pdfBase64: string) => {
    if (!businessId || !install) return;
    setIsUpdating(true);
    try {
      // 1. Update Installation Status
      updateDocumentNonBlocking(installRef!, { status: 'HANDED_OVER', handoverDate: new Date().toISOString(), updatedAt: serverTimestamp() });

      // 2. Register Handover Document
      await addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'solarDocuments'), {
        businessId,
        documentType: 'HANDOVER_CERTIFICATE',
        title: `Handover Certificate: ${install.installationNumber}`,
        entityType: 'INSTALLATION',
        entityId: id,
        customerId: install.customerId,
        customerName: install.customerName,
        installationId: id,
        base64: pdfBase64, // Store small PDF as base64 for handover logic
        visibility: 'CUSTOMER_VISIBLE',
        createdAt: serverTimestamp()
      });

      toast({ title: "Handover Sequence Complete", description: "Identity node handed over to client." });
      setIsHandoverOpen(false);
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Handover Failed" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleIssueMaterials = async (componentIdx: number) => {
    if (!installRef || !install || !businessId) return;
    const material = install.materials[componentIdx];
    const qtyToIssue = material.required - (material.issued || 0);

    if (qtyToIssue <= 0) {
      toast({ variant: "destructive", title: "Already Issued", description: "Full quantity for this component is already out." });
      return;
    }

    setIsUpdating(true);
    try {
      const productRef = doc(firestore, 'businesses', businessId, 'products', material.productId);
      
      const result = await runTransaction(firestore, async (transaction) => {
        const productSnap = await transaction.get(productRef);
        const installSnap = await transaction.get(installRef);

        if (!productSnap.exists()) throw new Error("PRODUCT_NOT_FOUND");
        if (!installSnap.exists()) throw new Error("INSTALL_NOT_FOUND");

        const pData = productSnap.data() as any;
        const iData = installSnap.data() as any;

        if (typeof pData.stock !== 'number' || pData.stock < qtyToIssue) throw new Error("INSUFFICIENT_STOCK");

        const newStock = pData.stock - qtyToIssue;
        const currentMaterials = iData.materials || [];
        const updatedMaterials = [...currentMaterials];
        
        updatedMaterials[componentIdx] = { 
          ...updatedMaterials[componentIdx], 
          issued: (updatedMaterials[componentIdx].issued || 0) + qtyToIssue, 
          allocated: (updatedMaterials[componentIdx].allocated || 0) + qtyToIssue,
          unitCostAtIssue: pData.cost || 0
        };

        transaction.update(productRef, { stock: newStock });
        transaction.update(installRef, { materials: updatedMaterials, updatedAt: serverTimestamp() });

        return { productName: pData.name, unitCost: pData.cost || 0, installNum: iData.installationNumber, projId: iData.projectId };
      });

      if (result) {
        addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'cashbook'), {
          businessId, type: 'debit', amount: (result.unitCost || 0) * qtyToIssue,
          particulars: `Material Issue: ${result.productName} for ${result.installNum}`,
          category: 'Purchase', projectId: result.projId, date: new Date().toISOString().split('T')[0], createdAt: serverTimestamp()
        });
        toast({ title: "Materials Dispatched" });
      }
    } catch (error: any) {
    console.error(error);
      toast({ variant: "destructive", title: "Issuance Blocked", description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const currencySymbol = getCurrencySymbol(business?.currency);
  const isHandedOver = install.status === 'HANDED_OVER';
  const hasWarranty = relatedWarranties.length > 0;
  const sInfo = INSTALLATION_STATUS_CONFIG[install.status] || INSTALLATION_STATUS_CONFIG['READY_TO_SCHEDULE'];

  if (isInstallLoading || isProfileLoading) return <div className="min-h-screen flex items-center justify-center opacity-40"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 text-left px-2 sm:px-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4 text-left flex-1 min-w-0">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0"><Link href="/solar/installations"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="text-left flex-1 min-w-0">
             <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary h-5 px-3 mb-1.5 tracking-widest">FIELD NODE: {install.installationNumber}</Badge>
             <h1 className="text-2xl md:text-4xl font-black text-slate-900 leading-none uppercase truncate">{install.customerName}</h1>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {!isHandedOver && install.progress === 100 && (
             <Button onClick={() => setIsHandoverOpen(true)} className="flex-1 md:flex-none h-11 px-6 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl">
               <CheckCircle2 className="mr-2 h-4 w-4" /> Final Handover
             </Button>
          )}
          {isHandedOver && (
            <Button onClick={handleDeployPlant} disabled={isPlantLoading} className="flex-1 md:flex-none h-11 px-6 rounded-xl bg-slate-900 text-accent font-black uppercase text-[10px] tracking-widest shadow-xl border border-white/10">
               {isPlantLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Globe className="h-4 w-4 mr-2" />} Deploy Plant Node
            </Button>
          )}
          <Select value={install.status} onValueChange={handleUpdateStatus}>
             <SelectTrigger className={cn("flex-1 md:flex-none h-11 rounded-xl font-black uppercase text-[10px] tracking-widest w-full md:w-48 shadow-xl", sInfo.bg, sInfo.color)}>
                <SelectValue />
             </SelectTrigger>
             <SelectContent className="rounded-xl border-none shadow-2xl">
                {Object.keys(INSTALLATION_STATUS_CONFIG).map(s => <SelectItem key={s} value={s} className="text-[10px] font-black uppercase">{INSTALLATION_STATUS_CONFIG[s].label}</SelectItem>)}
             </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-8 space-y-10">
          <Card className="border-none shadow-xl bg-white rounded-[3rem] overflow-hidden border">
             <CardHeader className="bg-slate-900 py-10 px-10 text-white relative text-left shrink-0">
                <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12"><Briefcase className="h-48 w-48" /></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
                   <div className="space-y-4 text-left flex-1">
                      <Badge className="bg-primary text-white border-none text-[8px] font-black h-5 px-3 uppercase tracking-[0.2em]">Operational Node v3.5</Badge>
                      <h3 className="text-3xl font-black uppercase leading-none">{install.capacityKw} kWp System</h3>
                      <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Supervisor: {install.supervisorName}</p>
                   </div>
                   <div className="text-right space-y-3">
                      <p className="text-[9px] font-black text-accent uppercase tracking-widest leading-none">Execution Progress</p>
                      <div className="flex items-center gap-4">
                         <Progress value={install.progress || 0} className="h-2 w-32 bg-white/10" />
                         <span className="text-2xl font-black text-white">{install.progress || 0}%</span>
                      </div>
                   </div>
                </div>
             </CardHeader>
             
             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-8 border-b bg-muted/5">
                  <TabsList className="bg-transparent h-14 p-0 gap-8 border-none overflow-x-auto scrollbar-hide flex">
                    <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-14 text-[10px] font-black uppercase tracking-widest px-0">Overview</TabsTrigger>
                    <TabsTrigger value="materials" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-14 text-[10px] font-black uppercase tracking-widest px-0">Materials</TabsTrigger>
                    <TabsTrigger value="documents" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-14 text-[10px] font-black uppercase tracking-widest px-0">Documents ({documents.length})</TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-10 text-left min-h-[400px]">
                   <TabsContent value="overview" className="m-0 space-y-10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
                         <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><MapPin className="h-4 w-4" /> Site Profile</h4>
                            <div className="p-6 bg-muted/10 rounded-[2rem] space-y-4 shadow-inner">
                               <div className="text-left"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Handover Target</p><p className="text-sm font-bold text-slate-800 uppercase">{install.scheduledEndDate || 'ASAP'}</p></div>
                               <div className="text-left"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">System Architecture</p><Badge variant="outline" className="bg-white border-primary/20 text-primary font-black text-[8px] uppercase h-5">{install.systemType}</Badge></div>
                            </div>
                         </div>
                         <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><SmartphoneNfc className="h-4 w-4" /> Team Node</h4>
                            <div className="p-6 bg-muted/20 rounded-[2rem] space-y-3">
                               <p className="text-[8px] font-black uppercase text-muted-foreground opacity-60">Assigned Techs</p>
                               <div className="flex flex-wrap gap-2">
                                  {(install.assignedTeamNames || []).map((name: string) => <Badge key={name} variant="secondary" className="bg-white border-none text-[8px] font-bold h-5 px-2">{name}</Badge>)}
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* PROCUREMENT STATUS SUMMARY */}
                      <section className="space-y-4">
                         <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><ShoppingBasket className="h-4 w-4" /> Supply Chain Pulse</h4>
                            {requisitions.length > 0 && <Badge className="bg-primary text-white border-none text-[8px] font-black h-5 px-2 uppercase">{requisitions.length} POs Linked</Badge>}
                         </div>
                         <div className="p-6 bg-muted/10 rounded-[2rem] border-2 border-dashed border-border flex items-center justify-between group hover:border-primary/20 transition-all">
                            <div className="text-left"><p className="text-sm font-black text-slate-900 uppercase">Material Planning Hub</p><p className="text-[9px] font-bold text-muted-foreground uppercase">Track shortages & incoming goods</p></div>
                            <Button asChild variant="ghost" size="sm" className="h-9 px-6 rounded-xl text-[9px] font-black uppercase text-primary hover:bg-white shadow-sm border border-transparent hover:border-primary/10">
                               <Link href={`/solar/procurement/new?installId=${id}`}>Launch Planner <ChevronRight className="ml-1.5 h-3 w-3" /></Link>
                            </Button>
                         </div>
                      </section>
                   </TabsContent>

                   <TabsContent value="materials" className="m-0 space-y-8">
                      <div className="border rounded-[2rem] overflow-hidden shadow-sm">
                         <Table>
                            <TableHeader><TableRow className="bg-muted/30"><TableHead className="pl-8 text-[10px] font-black uppercase h-12">Component</TableHead><TableHead className="text-center text-[10px] font-black uppercase h-12">Required</TableHead><TableHead className="text-center text-[10px] font-black uppercase h-12">Issued</TableHead><TableHead className="text-right pr-8 h-12 w-32"></TableHead></TableRow></TableHeader>
                            <TableBody>
                               {(install.materials || []).map((m: any, i: number) => {
                                 const isFull = m.issued >= m.required;
                                 return (
                                   <TableRow key={i} className="hover:bg-muted/5 transition-colors border-b last:border-0">
                                      <TableCell className="pl-8 py-5">
                                         <div className="flex flex-col text-left">
                                            <span className="text-sm font-bold text-slate-900 uppercase">{m.productName}</span>
                                            <span className="text-[8px] font-black text-primary/60 uppercase">{m.category}</span>
                                         </div>
                                      </TableCell>
                                      <TableCell className="text-center font-black text-xs">{m.required} {m.unit}</TableCell>
                                      <TableCell className="text-center"><Badge className={cn("text-[9px] font-black uppercase h-5", isFull ? "bg-green-100 text-green-700" : "bg-muted text-slate-400")}>{m.issued || 0} {m.unit}</Badge></TableCell>
                                      <TableCell className="text-right pr-8">{!isFull && <Button size="sm" onClick={() => handleIssueMaterials(i)} disabled={isUpdating} className="h-8 rounded-lg bg-primary text-white text-[8px] font-black uppercase">Issue</Button>}</TableCell>
                                   </TableRow>
                                 );
                               })}
                            </TableBody>
                         </Table>
                      </div>
                   </TabsContent>

                   <TabsContent value="documents" className="m-0 space-y-10 animate-in fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {documents.length === 0 ? (
                          <div className="col-span-full p-20 text-center border-2 border-dashed rounded-[3rem] opacity-30 italic uppercase text-[10px] font-black">No documents registered.</div>
                        ) : documents.map((docItem: any) => (
                          <Card key={docItem.id} className="border-none shadow-sm bg-white rounded-3xl p-5 border group hover:shadow-md transition-all">
                             <div className="flex items-center justify-between mb-4">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner"><FileText className="h-5 w-5" /></div>
                                <Badge className={cn("text-[7px] font-black h-4 uppercase", docItem.visibility === 'CUSTOMER_VISIBLE' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600")}>{docItem.visibility?.replace('_', ' ')}</Badge>
                             </div>
                             <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate mb-1">{docItem.title}</p>
                             <p className="text-[8px] font-bold text-muted-foreground uppercase">{docItem.documentType?.replace(/_/g, ' ')}</p>
                             <div className="mt-4 pt-4 border-t border-muted/50 flex justify-between items-center">
                                <span className="text-[7px] font-black text-slate-300 uppercase">{format(docItem.createdAt?.toDate ? docItem.createdAt.toDate() : new Date(), 'dd MMM yyyy')}</span>
                                <Button variant="ghost" size="sm" className="h-7 text-[8px] font-black uppercase text-primary" onClick={() => window.open(docItem.contentUrl || docItem.base64, '_blank')}>View Node</Button>
                             </div>
                          </Card>
                        ))}
                      </div>
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
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">Notify the customer about the current installation stage.</p>
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
              <CardHeader className="bg-muted/30 border-b py-6 px-8 text-left"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Settings2 className="h-4 w-4" /> Execution Logic</CardTitle></CardHeader>
              <CardContent className="p-8 space-y-6 text-left">
                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-left"><span className="text-[9px] font-bold text-slate-400 uppercase">Field Progress</span><span className="text-xs font-black text-primary">{install.progress || 0}%</span></div>
                    <Progress value={install.progress || 0} className="h-1 bg-primary/10" />
                 </div>
                 <Separator className="opacity-40" />
                 <div className="space-y-4">
                    <div className="flex items-center gap-3 text-left"><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="text-[9px] font-black uppercase text-slate-700">Team Node Linked</span></div>
                    <div className="flex items-center gap-3 text-left"><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="text-[9px] font-black uppercase text-slate-700">BOM Node Locked</span></div>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>

      <Dialog open={isHandoverOpen} onOpenChange={setIsHandoverOpen}>
        <DialogContent className="sm:max-w-[900px] h-[95vh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-3xl flex flex-col">
           <DialogHeader className="p-8 bg-slate-900 text-white shrink-0 text-left">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20"><Palette className="h-6 w-6 text-accent" /></div>
                <div><DialogTitle className="text-xl font-bold">Handover Protocol Node</DialogTitle><p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Reviewing Authorization Blueprint</p></div>
              </div>
           </DialogHeader>
           <div className="flex-1 bg-slate-100 overflow-auto relative py-12 flex justify-center">
              <div className="scale-75 sm:scale-100 origin-top shadow-2xl">
                 <HandoverCertificate install={install} business={business} isPreview />
              </div>
           </div>
           <DialogFooter className="p-8 bg-white border-t flex flex-row gap-4 shrink-0">
              <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold uppercase text-[10px]" onClick={() => setIsHandoverOpen(false)}>Edit Site Data</Button>
              <Button onClick={() => handleHandoverFinalize("DATA_REDACTED_PREVIEW")} className="flex-1 h-14 bg-primary text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Confirm & Authorize Handover</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
