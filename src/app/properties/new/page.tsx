
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { 
  ArrowLeft, 
  Building2, 
  LandPlot, 
  Home, 
  ShieldCheck, 
  Zap,
  Save, 
  Loader2, 
  MapPin, 
  Briefcase, 
  Scaling, 
  Droplets, 
  PlusSquare, 
  ImageIcon, 
  FileText, 
  Hash, 
  Upload,
  User,
  Users,
  Navigation,
  Scale,
  Calculator,
  Tag,
  Info,
  X,
  Plus,
  Route,
  Trees,
  Lock,
  Globe,
  Wheat,
  Video,
  ExternalLink,
  ArrowRightLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFirestore, useUser, useDoc, useMemoFirebase, addDocumentNonBlocking, useCollection } from "@/firebase";
import { doc, collection, serverTimestamp, query, where } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";

const PRODUCT_OPTIONS = ["Khet", "Plot", "Building", "Farmhouse", "Chukta"];
const CLASSIFICATIONS = ["RESIDENTIAL", "COMMERCIAL", "OTHER"];
const DEFAULT_PROPERTY_IMAGE = "https://placehold.co/800x800/0C83B3/white?text=GW7+Properties";

export default function NewPropertyEntryPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const teamQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null
  , [firestore, businessId]);
  const { data: teamMembersRaw = [] } = useCollection<any>(teamQuery);
  
  const teamMembers = useMemo(() => {
    if (!teamMembersRaw) return [];
    const allowedRoles = business?.propertyMemberRoles || [];
    if (allowedRoles.length === 0) return teamMembersRaw;
    return teamMembersRaw.filter((m: any) => {
        const role = (m.role || '').toLowerCase();
        return allowedRoles.some((ar: string) => ar.toLowerCase() === role);
    });
  }, [teamMembersRaw, business?.propertyMemberRoles]);

  const assetCategories = business?.assetCategories || PRODUCT_OPTIONS;
  const bhkConfigs = business?.bhkConfigs || ["1 BHK", "2 BHK", "3 BHK", "4 BHK"];
  const facingDirections = business?.facingDirections || ["East", "West", "North", "South", "North-East", "North-West", "South-East", "South-West"];
  const landTypes = business?.landTypes || ["Khet", "Khar", "Bharri", "FormHouse", "Factory"];
  const soilTypes = business?.soilTypes || ["Bhura Mitti", "Kala Mitti", "Upjau", "Retili"];
  const cropTypes = business?.cropTypes || ["Single Crop", "Double Crop", "Triple Crop", "Dalhan", "Tilhan"];
  const socialCategories = business?.socialCategories || ["OBC", "General", "SC", "ST"];
  const roadTypes = business?.roadTypes || ["Single Road", "Double Road", "Non-Road"];
  const areaUnits = business?.areaUnits || ["sq.ft", "sq.yd", "Acre", "Guntha", "Bigha"];

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<any>({
    title: "",
    agentName: "",
    agentSubName: "",
    visitorName: "",
    facing: "East",
    type: "Plot",
    propertyUse: "RESIDENTIAL",
    category: "General",
    marketRate: "",
    companyRate: "",
    marketPrice: "",
    companyPrice: "",
    images: [],
    videoUrl: "",
    mapUrl: "",
    description: "",
    district: "",
    village: "",
    size: "",
    roadType: "Single Road",
    front: "",
    depth: "",
    bor: "0",
    landType: "Khet",
    soilType: "Upjau",
    cropType: "Single Crop",
    area: "",
    areaUnit: "sq.ft",
    isDiverted: false,
    roadWidth: "",
    location: "",
    bhk: "2 BHK",
    constructionAge: "",
    hasElectricity: false
  });

  const currencySymbol = getCurrencySymbol(business?.currency);

  useEffect(() => {
    const marketRateVal = parseFloat(formData.marketRate) || 0;
    const companyRateVal = parseFloat(formData.companyRate) || 0;
    
    if (formData.type === 'Khet' || formData.type === 'Farmhouse') {
      const sizeVal = parseFloat(formData.size) || 0;
      setFormData(prev => ({ 
        ...prev, 
        marketPrice: (marketRateVal * sizeVal).toString(),
        companyPrice: (companyRateVal * sizeVal).toString()
      }));
    } else if (formData.type === 'Plot') {
      const areaVal = parseFloat(formData.area) || 0;
      setFormData(prev => ({ 
        ...prev, 
        marketPrice: (marketRateVal * areaVal).toString(),
        companyPrice: (companyRateVal * areaVal).toString()
      }));
    } else if (formData.type === 'Building' || formData.type === 'Chukta') {
      setFormData(prev => ({ 
        ...prev, 
        marketPrice: marketRateVal.toString(),
        companyPrice: companyRateVal.toString()
      }));
    }
  }, [formData.type, formData.marketRate, formData.companyRate, formData.size, formData.area]);

  const priceDiff = useMemo(() => {
    const m = parseFloat(formData.marketPrice) || 0;
    const c = parseFloat(formData.companyPrice) || 0;
    return m - c;
  }, [formData.marketPrice, formData.companyPrice]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({
            ...prev,
            images: [...(prev.images || []), reader.result as string]
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    if (!businessId || !formData.title || !formData.marketPrice || !user?.uid) {
      toast({ variant: "destructive", title: "Missing Info", description: "Property Name and Market Price are mandatory." });
      return;
    }

    const selectedAgent = teamMembers.find(m => m.name === formData.agentName);
    setIsSubmitting(true);
    const finalImages = formData.images && formData.images.length > 0 ? formData.images : [DEFAULT_PROPERTY_IMAGE];

    addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'properties'), {
      ...formData,
      images: finalImages,
      businessId,
      assignedAgentId: selectedAgent?.id || user.uid,
      createdBy: user.uid,
      status: 'available',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      propertyId: `PROP-${Math.floor(100000 + Math.random() * 900000)}`
    }).then(() => {
      toast({ title: "Asset Registered" });
      router.push("/properties");
    }).catch((error) => {
    console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Could not save asset." });
    }).finally(() => setIsSubmitting(false));
  };

  const SectionHeader = ({ icon: Icon, title, sub }: any) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-8 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary leading-none">{title}</h3>
        {sub && <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1 tracking-widest">{sub}</p>}
      </div>
    </div>
  );

  const isFixedMode = formData.type === 'Building' || formData.type === 'Chukta';

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-20 px-2 sm:px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0"><Link href="/properties"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Register Asset</h1>
        </div>
        <Button onClick={handleSave} disabled={isSubmitting} className="h-10 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg bg-primary text-white w-full sm:w-auto">
          {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          Save Asset
        </Button>
      </div>

      <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden border">
        <CardHeader className="bg-primary/5 border-b py-8 px-6 sm:px-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shrink-0">
              <PlusSquare className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg font-black uppercase tracking-tight text-primary">Property Registry</CardTitle>
              <CardDescription className="text-[9px] font-bold uppercase tracking-widest mt-1">Unified Node Config</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 sm:p-10 space-y-12">
          <section>
            <SectionHeader icon={Briefcase} title="1. [COMMON] Information" sub="Core attribution" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2 col-span-1 sm:col-span-2 lg:col-span-4">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Property Title / Name *</Label>
                <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="e.g. Green Valley Farmhouse" className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Responsible Agent</Label>
                <Select value={formData.agentName} onValueChange={(v) => setFormData({...formData, agentName: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-white border-muted shadow-sm font-bold"><SelectValue placeholder="Pick Agent" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {teamMembers.map((m: any) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Sub Agent (Manual)</Label>
                <Input value={formData.agentSubName} onChange={(e) => setFormData({...formData, agentSubName: e.target.value})} placeholder="Sub Agent Name" className="h-12 rounded-xl bg-muted/20 border-none shadow-inner" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Visitor Name</Label>
                <Input value={formData.visitorName} onChange={(e) => setFormData({...formData, visitorName: e.target.value})} placeholder="Direct or Lead Name" className="h-12 rounded-xl bg-muted/20 border-none shadow-inner font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Facing Direction</Label>
                <Select value={formData.facing} onValueChange={(v) => setFormData({...formData, facing: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-white border-muted shadow-sm font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">{(facingDirections || []).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Property Type *</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-white border-muted shadow-sm font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">{(assetCategories || []).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Property Use</Label>
                <Select value={formData.propertyUse} onValueChange={(v) => setFormData({...formData, propertyUse: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-white border-muted shadow-sm font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">{(CLASSIFICATIONS || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-white border-muted shadow-sm font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">{(socialCategories || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <Separator className="opacity-50" />

          {/* Pricing & Dimensions */}
          <section className="p-6 sm:p-8 bg-muted/10 rounded-[2.5rem] border border-border/50">
            <SectionHeader icon={Calculator} title="2. Pricing & Dimensions" sub="Market vs Company Tiers" />
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                {!isFixedMode ? (
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-primary ml-1">
                      {(formData.type === 'Khet' || formData.type === 'Farmhouse') ? 'Total Size *' : 'Total Area *'}
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Scaling className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40" />
                        <Input 
                          type="number" 
                          value={(formData.type === 'Khet' || formData.type === 'Farmhouse') ? formData.size : formData.area} 
                          onChange={(e) => setFormData({...formData, [(formData.type === 'Khet' || formData.type === 'Farmhouse') ? 'size' : 'area']: e.target.value})} 
                          className="h-14 pl-12 rounded-2xl bg-white border-none shadow-sm font-bold text-lg" 
                        />
                      </div>
                      <div className="w-24">
                        <Select value={formData.areaUnit} onValueChange={(v) => setFormData({...formData, areaUnit: v})}>
                          <SelectTrigger className="h-14 rounded-2xl bg-white border-none shadow-sm font-black text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {areaUnits.map((u: string) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : <div className="hidden md:block" />}

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-green-600 ml-1 flex items-center gap-2">
                    <Globe className="h-3 w-3" /> {formData.type === 'Chukta' ? 'Fixed Market Rate' : 'Market Rate (Public)'}
                  </Label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600 opacity-40" />
                    <Input type="number" value={formData.marketRate} onChange={(e) => setFormData({...formData, marketRate: e.target.value})} className="h-14 pl-12 rounded-2xl bg-white border-none shadow-sm font-bold text-lg" placeholder="0.00" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-green-600 ml-1">Calculated Market Price</Label>
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-green-600 text-lg">{currencySymbol}</div>
                    <Input 
                      type="number" 
                      value={formData.marketPrice} 
                      readOnly={!isFixedMode}
                      onChange={(e) => isFixedMode && setFormData({...formData, marketPrice: e.target.value})}
                      className="h-14 pl-10 pr-16 rounded-2xl font-black text-xl bg-slate-900 text-green-400 border-none shadow-2xl" 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2"><Badge className="bg-green-500 text-white border-none text-[8px] font-black px-2 h-5">AUTO</Badge></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4 border-t border-dashed border-border/50">
                <div className="hidden md:block" />
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-primary ml-1 flex items-center gap-2">
                    <Lock className="h-3 w-3" /> {formData.type === 'Chukta' ? 'Fixed Company Rate' : 'Company Rate (Internal)'}
                  </Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40" />
                    <Input type="number" value={formData.companyRate} onChange={(e) => setFormData({...formData, companyRate: e.target.value})} className="h-14 pl-12 rounded-2xl bg-white border-none shadow-sm font-bold text-lg" placeholder="0.00" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-primary ml-1">Calculated Company Price</Label>
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-primary text-lg">{currencySymbol}</div>
                    <Input 
                      type="number" 
                      value={formData.companyPrice} 
                      readOnly={!isFixedMode}
                      onChange={(e) => isFixedMode && setFormData({...formData, companyPrice: e.target.value})}
                      className="h-14 pl-10 pr-16 rounded-2xl font-black text-xl bg-slate-100 text-primary border-none shadow-inner" 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2"><Badge className="bg-primary text-white border-none text-[8px] font-black px-2 h-5">AUTO</Badge></div>
                  </div>
                </div>
              </div>

              {(parseFloat(formData.marketPrice) > 0 && parseFloat(formData.companyPrice) > 0) && (
                <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/20 animate-in zoom-in-95 duration-500 gap-4 mt-6">
                   <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-primary shadow-lg"><ArrowRightLeft className="h-6 w-6" /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-primary tracking-widest">Price Antar (Difference)</p>
                        <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">Calculated system margin</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className={cn("text-2xl font-black", priceDiff >= 0 ? "text-green-600" : "text-red-600")}>
                        {priceDiff >= 0 ? '+' : ''} {currencySymbol}{priceDiff.toLocaleString()}
                      </p>
                      <Badge variant="outline" className="text-[7px] font-black uppercase border-primary/10 bg-white">System Verified Node</Badge>
                   </div>
                </div>
              )}
            </div>
          </section>

          {/* Technical Specs Sections */}
          {(formData.type === 'Khet' || formData.type === 'Farmhouse') && (
            <section className={cn("p-6 sm:p-8 rounded-[2.5rem] border", formData.type === 'Khet' ? "bg-green-50 border-green-100" : "bg-amber-50 border-amber-100")}>
              <SectionHeader icon={formData.type === 'Khet' ? Droplets : Trees} title={`[TECHNICAL] ${formData.type} Specs`} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">District</Label><Input value={formData.district} onChange={(e) => setFormData({...formData, district: e.target.value})} className="h-11 rounded-xl bg-white shadow-sm" /></div>
                <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Village / Location</Label><Input value={formData.village || formData.location} onChange={(e) => setFormData({...formData, village: e.target.value, location: e.target.value})} className="h-11 rounded-xl bg-white shadow-sm" /></div>
                <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Road Access</Label><Select value={formData.roadType} onValueChange={(v) => setFormData({...formData, roadType: v})}><SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{roadTypes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Front (Ft)</Label><Input value={formData.front} onChange={(e) => setFormData({...formData, front: e.target.value})} className="h-11 rounded-xl bg-white shadow-sm" /></div>
                <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Borewell Count</Label><Input type="number" value={formData.bor} onChange={(e) => setFormData({...formData, bor: e.target.value})} className="h-11 rounded-xl bg-white shadow-sm" /></div>
                
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase">Land Type</Label>
                  <Select value={formData.landType} onValueChange={(v) => setFormData({...formData, landType: v})}>
                    <SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">{landTypes.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase">Soil Type</Label>
                  <Select value={formData.soilType} onValueChange={(v) => setFormData({...formData, soilType: v})}>
                    <SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">{soilTypes.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase flex items-center gap-1.5"><Wheat className="h-3 w-3" /> Crop Type</Label>
                  <Select value={formData.cropType} onValueChange={(v) => setFormData({...formData, cropType: v})}>
                    <SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">{cropTypes.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {formData.type === 'Farmhouse' && (
                  <>
                    <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">BHK (If Structure)</Label><Select value={formData.bhk} onValueChange={(v) => setFormData({...formData, bhk: v})}><SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{(bhkConfigs || []).map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-100 mt-5"><Label className="text-[9px] font-black uppercase text-amber-900">Electricity Avail.</Label><Switch checked={formData.hasElectricity} onCheckedChange={(v) => setFormData({...formData, hasElectricity: v})} className="scale-75 data-[state=checked]:bg-amber-600" /></div>
                  </>
                )}
              </div>
            </section>
          )}

          {formData.type === 'Plot' && (
            <section className="p-6 sm:p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100">
              <SectionHeader icon={LandPlot} title="[TECHNICAL] Plot Specs" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-blue-100 shadow-sm"><Label className="text-xs font-black uppercase text-blue-900">Is Diverted?</Label><Switch checked={formData.isDiverted} onCheckedChange={(v) => setFormData({...formData, isDiverted: v})} className="scale-90 data-[state=checked]:bg-blue-600" /></div>
                <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Road Width (ft)</Label><Input value={formData.roadWidth} onChange={(e) => setFormData({...formData, roadWidth: e.target.value})} className="h-11 rounded-xl bg-white shadow-sm" /></div>
                <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Road Type</Label><Select value={formData.roadType} onValueChange={(v) => setFormData({...formData, roadType: v})}><SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{roadTypes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Front (Ft)</Label><Input value={formData.front} onChange={(e) => setFormData({...formData, front: e.target.value})} className="h-11 rounded-xl bg-white shadow-sm" /></div>
                <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Depth (Ft)</Label><Input value={formData.depth} onChange={(e) => setFormData({...formData, depth: e.target.value})} className="h-11 rounded-xl bg-white shadow-sm" /></div>
              </div>
            </section>
          )}

          {formData.type === 'Building' && (
            <section className="p-6 sm:p-8 bg-orange-50 rounded-[2.5rem] border border-orange-100">
              <SectionHeader icon={Home} title="[TECHNICAL] Building Specs" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Exact Location</Label><Input value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="h-11 rounded-xl bg-white shadow-sm" /></div>
                <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">BHK Configuration</Label><Select value={formData.bhk} onValueChange={(v) => setFormData({...formData, bhk: v})}><SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{(bhkConfigs || []).map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Construction Age</Label><Input value={formData.constructionAge} onChange={(e) => setFormData({...formData, constructionAge: e.target.value})} className="h-11 rounded-xl bg-white shadow-sm" /></div>
                <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Road Width (ft)</Label><Input value={formData.roadWidth} onChange={(e) => setFormData({...formData, roadWidth: e.target.value})} className="h-11 rounded-xl bg-white shadow-sm" /></div>
              </div>
            </section>
          )}

          {/* Media Assets */}
          <section className="space-y-10">
            <SectionHeader icon={ImageIcon} title="3. Media Assets & External Links" sub="Visual documentation" />
            
            <div className="space-y-6">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Photo Documentation</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                {formData.images?.map((img: string, i: number) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group border border-border/50 shadow-sm">
                    <img src={img} className="w-full h-full object-cover" alt={`Asset ${i}`} />
                    <Button variant="destructive" size="icon" onClick={() => removeImage(i)} className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></Button>
                  </div>
                ))}
                <button type="button" onClick={() => imageInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-2 hover:bg-primary/10 hover:border-primary/40 transition-all group">
                  <Plus className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-black uppercase text-primary/60">Add Photo</span>
                </button>
              </div>
              <input type="file" ref={imageInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-2">
                  <Video className="h-3.5 w-3.5 text-primary" /> Video Link (YouTube/Drive)
                </Label>
                <Input 
                  value={formData.videoUrl} 
                  onChange={(e) => setFormData({...formData, videoUrl: e.target.value})} 
                  placeholder="Paste URL here..." 
                  className="h-12 rounded-xl bg-muted/20 border-none shadow-inner text-xs font-bold" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-2">
                  <ExternalLink className="h-3.5 w-3.5 text-primary" /> Google Maps Link
                </Label>
                <Input 
                  value={formData.mapUrl} 
                  onChange={(e) => setFormData({...formData, mapUrl: e.target.value})} 
                  placeholder="Paste Google Maps URL here..." 
                  className="h-12 rounded-xl bg-muted/20 border-none shadow-inner text-xs font-bold" 
                />
              </div>
            </div>

            <div className="space-y-2 mt-8">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Registry Remarks</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Special features, legal status, etc." className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner p-4 text-xs" />
            </div>
          </section>
        </CardContent>

        <CardFooter className="p-8 sm:p-12 bg-muted/10 border-t flex justify-end">
          <Button onClick={handleSave} disabled={isSubmitting} className="h-14 px-12 bg-primary font-black uppercase text-xs tracking-widest shadow-2xl rounded-2xl text-white">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Register Asset Node
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

