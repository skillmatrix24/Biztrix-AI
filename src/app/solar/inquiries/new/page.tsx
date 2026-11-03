
"use client";

import { use, useState, useMemo, useEffect, Suspense } from "react";
import { 
  Plus, 
  ArrowLeft, 
  Save, 
  Loader2, 
  Search, 
  User, 
  Zap, 
  Sun,
  ClipboardCheck,
  SearchCode,
  ChevronRight,
  Info,
  Handshake,
  ShieldCheck,
  Users,
  CheckCircle2,
  UserPlus,
  Truck,
  X,
  LayoutList,
  Building2,
  Scaling,
  MapPin
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection, addDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase";
import { collection, doc, serverTimestamp, query, orderBy, where, getDocs, limit, getDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSolarNotification } from "@/firebase/solar-notifications";
import { NewCustomerDialog } from "@/app/billing/components/NewCustomerDialog";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Chandigarh"
];

const LEAD_SOURCES = [
  "Walk-in", 
  "WhatsApp", 
  "Facebook", 
  "Instagram", 
  "Website", 
  "Referral", 
  "Cold Call", 
  "Exhibition", 
  "Newspaper",
  "Other"
];

function NewSolarInquiryContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const incomingInquiryId = searchParams.get('inquiryId');

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const leadsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'leads'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: leadsData } = useCollection<any>(leadsQuery);
  const leads = leadsData || [];

  const customersQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'customers'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: customersData } = useCollection<any>(customersQuery);
  const customers = customersData || [];

  const vendorsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'vendors') : null
  , [firestore, businessId]);
  const { data: vendorsData } = useCollection<any>(vendorsQuery);
  const vendors = vendorsData || [];

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const [formData, setFormData] = useState({
    sourceType: 'lead' as 'lead' | 'customer',
    sourceId: "",
    dealerId: "none",
    propertyType: "Residential",
    electricityConnection: "Single Phase",
    averageMonthlyUnits: "",
    monthlyBill: "",
    requiredCapacity: "",
    roofType: "Concrete (RCC)",
    roofArea: "",
    location: "",
    notes: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Quick Add Modal States
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);

  // New Lead Form State
  const [newLeadData, setNewLeadData] = useState({
    name: "",
    phone: "",
    source: "Walk-in" as any,
    notes: ""
  });

  // New Vendor Form State
  const [newVendorData, setNewVendorData] = useState({
    name: "",
    phone: "",
    email: "",
    businessName: "",
    gstin: "",
    address: "",
    city: "",
    state: "Maharashtra",
    pincode: "",
    openingBalance: "0"
  });

  const filteredSources = useMemo(() => {
    const list = formData.sourceType === 'lead' ? (leads || []) : (customers || []);
    if (!searchTerm) {
      return list.slice(0, 10);
    }
    return list.filter((s: any) => 
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.phone?.includes(searchTerm)
    ).slice(0, 10);
  }, [leads, customers, formData.sourceType, searchTerm]);

  const selectedSourceData = useMemo(() => {
    const list = (formData.sourceType === 'lead' ? leads : customers) || [];
    return list.find((s: any) => s.id === formData.sourceId) || null;
  }, [leads, customers, formData.sourceId, formData.sourceType]);

  const dealers = useMemo(() => {
    return (vendors || []).filter((v: any) => (v.status === 'Active' || v.status === 'Active Node'));
  }, [vendors]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const handleQuickAddLead = async () => {
    if (!businessId || !newLeadData.name || !newLeadData.phone) return;
    const leadId = `l${Date.now()}`;
    const leadRef = doc(firestore, 'businesses', businessId, 'leads', leadId);
    
    await setDocumentNonBlocking(leadRef, {
      ...newLeadData,
      id: leadId,
      tenantId: businessId,
      status: 'new',
      createdAt: new Date().toISOString().split('T')[0],
      intentScore: 50,
      updatedAt: serverTimestamp()
    }, { merge: true });

    setFormData(prev => ({ ...prev, sourceId: leadId }));
    setIsAddLeadOpen(false);
    setNewLeadData({ name: "", phone: "", source: "Walk-in", notes: "" });
    toast({ title: "Lead Added", description: "Node created and auto-selected." });
  };

  const handleQuickAddVendor = async () => {
    if (!businessId || !newVendorData.name || !newVendorData.phone) return;
    const vendorId = `v${Date.now()}`;
    const vendorRef = doc(firestore, 'businesses', businessId, 'vendors', vendorId);
    
    await setDocumentNonBlocking(vendorRef, {
      ...newVendorData,
      id: vendorId,
      tenantId: businessId,
      totalPurchase: 0,
      paidAmount: 0,
      pendingBalance: parseFloat(newVendorData.openingBalance) || 0,
      status: 'Active',
      lastPurchaseDate: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    setFormData(prev => ({ ...prev, dealerId: vendorId }));
    setIsAddVendorOpen(false);
    setNewVendorData({
      name: "", phone: "", email: "", businessName: "", gstin: "",
      address: "", city: "", state: business?.defaultState || business?.state || "Maharashtra", pincode: "", openingBalance: "0"
    });
    toast({ title: "Dealer Registered", description: "Supply node created and auto-selected." });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !formData.sourceId || !selectedSourceData) {
      toast({ variant: "destructive", title: "Missing Source", description: "Please select a Lead or Customer first." });
      return;
    }

    setIsSubmitting(true);
    try {
      const inquiryRef = collection(firestore, 'businesses', businessId, 'solarInquiries');
      
      const selectedDealer = dealers.find(d => d.id === formData.dealerId);

      const docRef = await addDocumentNonBlocking(inquiryRef, {
        ...formData,
        customerName: selectedSourceData.name,
        customerPhone: selectedSourceData.phone,
        customerId: formData.sourceType === 'customer' ? formData.sourceId : null,
        leadId: formData.sourceType === 'lead' ? formData.sourceId : null,
        dealerName: selectedDealer?.name || null,
        status: 'NEW',
        assignedTo: user?.uid,
        assignedName: userProfile?.name || "Admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (business?.ownerId && docRef) {
        createSolarNotification(firestore, {
          businessId,
          recipientId: business.ownerId,
          title: "New Solar Inquiry",
          message: `${selectedSourceData.name} requested a ${formData.requiredCapacity}kW system.`,
          type: 'solar_alert',
          severity: 'INFO',
          entityType: 'SOLAR_INQUIRY',
          entityId: docRef.id
        });
      }

      toast({ title: "Inquiry Established", description: "Technical data node synchronized." });
      router.push("/solar/inquiries");
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Error", description: "Could not establish technical node." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isProfileLoading) return <div className="flex items-center justify-center py-20 opacity-40"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 px-2 sm:px-4 text-left">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0"><Link href="/solar/inquiries"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div className="text-left">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Initialize Inquiry</h1>
          <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1.5 opacity-60">Technical Requirement Capture</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border">
          <CardHeader className="bg-primary/5 border-b py-8 px-10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shrink-0">
                <Users className="h-6 w-6" />
              </div>
              <div className="text-left">
                <CardTitle className="text-lg font-black uppercase tracking-tight text-primary">1. Identity & Attribution</CardTitle>
                <CardDescription className="text-[9px] font-bold uppercase tracking-widest">Connect to existing CRM data and Partners</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <div className="flex flex-col sm:flex-row gap-6">
               <div className="w-full sm:w-48 space-y-2 text-left">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Source Type</Label>
                  <Select value={formData.sourceType} onValueChange={(v: any) => { setFormData({...formData, sourceType: v, sourceId: ""}); setSearchTerm(""); }}>
                    <SelectTrigger className="h-12 rounded-2xl bg-white border-muted font-black text-[10px] uppercase"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="lead" className="text-[10px] font-bold uppercase">From CRM Leads</SelectItem>
                      <SelectItem value="customer" className="text-[10px] font-bold uppercase">From Customers</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div className="flex-1 space-y-2 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Search & Select *</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => formData.sourceType === 'lead' ? setIsAddLeadOpen(true) : setIsAddCustomerOpen(true)}
                      className="h-6 px-2 text-[8px] font-black uppercase text-primary gap-1 hover:bg-primary/5"
                    >
                      <Plus className="h-2.5 w-2.5" /> Add {formData.sourceType === 'lead' ? 'Lead' : 'Customer'}
                    </Button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-30" />
                    <Input 
                      placeholder={`Find ${formData.sourceType === 'lead' ? 'Lead' : 'Customer'}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-12 pl-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"
                    />
                    {searchTerm && (
                      <div className="absolute top-full left-0 w-full bg-white border rounded-2xl mt-2 shadow-2xl z-50 overflow-hidden">
                        {(filteredSources || []).map(s => (
                          <div 
                            key={s.id} 
                            onClick={() => { setFormData({...formData, sourceId: s.id}); setSearchTerm(""); }}
                            className="p-4 hover:bg-primary/5 cursor-pointer flex justify-between items-center border-b last:border-0 text-left"
                          >
                            <div className="text-left"><p className="text-sm font-bold">{s.name}</p><p className="text-[10px] font-bold text-muted-foreground uppercase">{s.phone}</p></div>
                            <ChevronRight className="h-4 w-4 text-primary opacity-20" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
               </div>
            </div>

            <div className="space-y-2 text-left">
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-2">
                   <Handshake className="h-4 w-4 text-primary" /> Dealer / Partner Attribution (Optional)
                </Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsAddVendorOpen(true)}
                  className="h-6 px-2 text-[8px] font-black uppercase text-primary gap-1 hover:bg-primary/5"
                >
                  <Plus className="h-2.5 w-2.5" /> Add Dealer
                </Button>
              </div>
              <Select value={formData.dealerId} onValueChange={(v) => setFormData({...formData, dealerId: v})}>
                <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold">
                  <SelectValue placeholder="No Dealer (Direct)" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="none" className="text-[10px] font-bold uppercase">No Dealer (Direct)</SelectItem>
                  {(dealers || []).map(d => <SelectItem key={d.id} value={d.id} className="text-xs font-bold uppercase">{d.name} ({d.businessName || 'Indiv.'})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedSourceData && (
              <div className="p-6 bg-primary/5 rounded-3xl border-2 border-dashed border-primary/20 flex items-center justify-between animate-in zoom-in-95 text-left">
                <div className="flex items-center gap-4 text-left">
                  <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg">{selectedSourceData.name?.charAt(0)}</div>
                  <div className="text-left">
                    <h4 className="text-lg font-black text-slate-900 leading-none uppercase">{selectedSourceData.name}</h4>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">{selectedSourceData.phone}</p>
                  </div>
                </div>
                <ShieldCheck className="h-8 w-8 text-primary opacity-40" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border">
          <CardHeader className="bg-orange-500/5 border-b py-8 px-10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-lg shrink-0">
                <Zap className="h-6 w-6" />
              </div>
              <div className="text-left">
                <CardTitle className="text-lg font-black uppercase tracking-tight text-orange-700">2. Solar Requirement</CardTitle>
                <p className="text-orange-600/60 text-[9px] font-bold uppercase tracking-widest mt-1">Technical Parameters & Load</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-10 space-y-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Property Classification</Label>
                <Select value={formData.propertyType} onValueChange={(v) => setFormData({...formData, propertyType: v})}>
                  <SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {["Residential", "Commercial", "Industrial", "Agricultural", "Other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Electricity Connection Type</Label>
                <Select value={formData.electricityConnection} onValueChange={(v) => setFormData({...formData, electricityConnection: v})}>
                  <SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {["Single Phase", "Three Phase", "High Tension (HT)"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Avg. Monthly Units (kWh)</Label>
                <div className="relative">
                   <LayoutList className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-30" />
                   <Input type="number" value={formData.averageMonthlyUnits} onChange={(e) => setFormData({...formData, averageMonthlyUnits: e.target.value})} className="h-12 pl-12 rounded-xl bg-muted/20 border-none shadow-inner font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Avg. Monthly Bill ({currencySymbol})</Label>
                <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">{currencySymbol}</div>
                   <Input type="number" value={formData.monthlyBill} onChange={(e) => setFormData({...formData, monthlyBill: e.target.value})} className="h-12 pl-10 rounded-xl bg-muted/20 border-none shadow-inner font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-primary ml-1">Required Capacity (kW)</Label>
                <div className="relative">
                   <Zap className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40" />
                   <Input type="number" value={formData.requiredCapacity} onChange={(e) => setFormData({...formData, requiredCapacity: e.target.value})} className="h-12 pl-12 rounded-xl bg-primary/5 border-none shadow-inner font-black text-primary text-lg" placeholder="0.0" />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-8 text-left">
              <div className="flex items-center gap-2">
                 <Building2 className="h-4 w-4 text-primary" />
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Roof & Installation Node</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Roof Type</Label>
                    <Select value={formData.roofType} onValueChange={(v) => setFormData({...formData, roofType: v})}>
                      <SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {["Concrete (RCC)", "Tin Shade", "Asbestos Sheet", "Tile Roof", "Open Ground", "Other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Approx. Roof Area (sq.ft)</Label>
                    <div className="relative">
                       <Scaling className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-30" />
                       <Input type="number" value={formData.roofArea} onChange={(e) => setFormData({...formData, roofArea: e.target.value})} className="h-12 pl-12 rounded-xl bg-muted/20 border-none shadow-inner font-bold" />
                    </div>
                 </div>
              </div>
              <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Installation Location / Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 h-4 w-4 text-muted-foreground opacity-30" />
                  <Textarea value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="min-h-[100px] pl-12 rounded-2xl bg-muted/20 border-none shadow-inner p-4 text-sm font-medium" placeholder="Full address of site..." />
                </div>
              </div>
              <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Technical Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner p-4 text-sm font-medium" placeholder="Orientation, shading concerns, structure height, etc." />
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-10 bg-muted/10 border-t flex justify-end">
             <Button type="submit" disabled={isSubmitting || !formData.sourceId} className="w-full sm:w-auto h-16 px-14 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all text-white">
               {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : <CheckCircle2 className="h-6 w-6 mr-3" />}
               Initialize Technical Node
             </Button>
          </CardFooter>
        </Card>
      </form>

      {/* QUICK ADD LEAD DIALOG */}
      <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
         <DialogContent className="sm:max-w-[450px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden text-left">
            <DialogHeader className="p-8 bg-primary text-white">
               <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20"><UserPlus className="h-5 w-5 text-white" /></div>
                  <DialogTitle>Quick Lead Entry</DialogTitle>
               </div>
            </DialogHeader>
            <div className="p-8 space-y-6">
               <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Name *</Label><Input value={newLeadData.name} onChange={(e) => setNewLeadData({...newLeadData, name: e.target.value})} className="h-11 rounded-xl" /></div>
               <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Phone *</Label><Input value={newLeadData.phone} onChange={(e) => setNewLeadData({...newLeadData, phone: e.target.value.replace(/\D/g, '')})} className="h-11 rounded-xl" placeholder="91XXXXXXXX" /></div>
               <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase">Source</Label>
                  <Select value={newLeadData.source} onValueChange={(v) => setNewLeadData({...newLeadData, source: v})}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
               </div>
               <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Notes</Label><Textarea value={newLeadData.notes} onChange={(e) => setNewLeadData({...newLeadData, notes: e.target.value})} className="h-20 rounded-xl" /></div>
            </div>
            <DialogFooter className="p-8 bg-muted/10 border-t">
               <Button onClick={handleQuickAddLead} disabled={!newLeadData.name || !newLeadData.phone} className="w-full h-14 bg-primary font-black uppercase text-xs rounded-2xl shadow-xl">Establish Lead Node</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* QUICK ADD CUSTOMER DIALOG */}
      <NewCustomerDialog isOpen={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen} onSaveSuccess={(cid) => { setFormData({...formData, sourceId: cid}); setIsAddCustomerOpen(false); }} businessId={businessId!} currencySymbol={currencySymbol} />

      {/* QUICK ADD DEALER/VENDOR DIALOG */}
      <Dialog open={isAddVendorOpen} onOpenChange={setIsAddVendorOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left w-[95vw]">
          <DialogHeader className="p-8 bg-slate-900 text-white text-left">
            <div className="flex items-center gap-4">
               <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                  <Truck className="h-6 w-6 text-accent" />
               </div>
               <div>
                  <DialogTitle className="text-xl">Register Dealer Node</DialogTitle>
                  <DialogDescription className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Identity & Global Parameters</DialogDescription>
               </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Full Name *</Label><Input value={newVendorData.name} onChange={(e) => setNewVendorData({...newVendorData, name: e.target.value})} className="h-12 rounded-xl font-bold bg-muted/20 border-none" /></div>
               <div className="space-y-1.5"><Label className="text-[10px) font-bold uppercase text-muted-foreground">WhatsApp *</Label><Input value={newVendorData.phone} onChange={(e) => setNewVendorData({...newVendorData, phone: e.target.value.replace(/\D/g, '')})} placeholder="91XXXXXXXX" className="h-12 rounded-xl font-bold bg-muted/20 border-none" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Business Identity</Label><Input value={newVendorData.businessName} onChange={(e) => setNewVendorData({...newVendorData, businessName: e.target.value})} className="h-12 rounded-xl bg-muted/20 border-none" /></div>
               <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground">GSTIN</Label><Input value={newVendorData.gstin} onChange={(e) => setNewVendorData({...newVendorData, gstin: e.target.value.toUpperCase()})} className="h-12 rounded-xl font-mono uppercase bg-muted/20 border-none" /></div>
            </div>
            <div className="space-y-1.5 text-left">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">State Registry</Label>
              <Select value={newVendorData.state} onValueChange={(v) => setNewVendorData({...newVendorData, state: v})}>
                <SelectTrigger className="h-12 rounded-xl bg-white border-muted shadow-sm font-bold text-xs uppercase"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl max-h-40 border-none shadow-2xl">
                  {INDIAN_STATES.map(s => <SelectItem key={s} value={s} className="text-xs font-bold uppercase">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Billing Address</Label><Textarea value={newVendorData.address} onChange={(e) => setNewVendorData({...newVendorData, address: e.target.value})} className="h-20 rounded-xl bg-muted/20 border-none text-xs" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Opening Dues ({currencySymbol})</Label><Input type="number" value={newVendorData.openingBalance} onChange={(e) => setNewVendorData({...newVendorData, openingBalance: e.target.value})} className="h-12 rounded-xl bg-red-50 text-red-600 border-none font-bold" /></div>
            </div>
          </div>
          <DialogFooter className="p-8 bg-muted/10 border-t">
            <Button onClick={handleQuickAddVendor} disabled={!newVendorData.name || !newVendorData.phone} className="w-full h-14 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">Establish Dealer Node</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function NewSolarInquiryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary opacity-20" /></div>}>
      <NewSolarInquiryContent />
    </Suspense>
  );
}
