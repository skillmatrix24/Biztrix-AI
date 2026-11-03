
"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  UserPlus, 
  ArrowLeft, 
  Users, 
  Save, 
  Loader2, 
  Briefcase, 
  Zap,
  Building,
  SmartphoneNfc,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Scaling,
  Navigation,
  Scale,
  Route,
  Home,
  Trees,
  Droplets,
  LandPlot,
  Wheat
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { getCurrencySymbol } from "@/lib/utils";

const PRODUCT_OPTIONS = ["Khet", "Plot", "Building", "Farmhouse", "Chukta"];
const CLASSIFICATIONS = ["RESIDENTIAL", "COMMERCIAL"];

export default function NewCustomerEntryPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const teamQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null
  , [firestore, businessId]);
  const { data: teamMembersRaw = [] } = useCollection<any>(teamQuery);
  
  const teamMembers = useMemo(() => {
    if (!teamMembersRaw) return [];
    const allowedRoles = business?.propertyMemberRoles || [];
    if (allowedRoles.length === 0) return teamMembersRaw;
    return teamMembersRaw.filter((m: any) => allowedRoles.includes(m.role));
  }, [teamMembersRaw, business?.propertyMemberRoles]);

  const facingDirections = business?.facingDirections || ["East", "West", "North", "South", "North-East", "North-West", "South-East", "South-West"];
  const socialCategories = business?.socialCategories || ["OBC", "General", "SC", "ST"];
  const roadTypes = business?.roadTypes || ["Single Road", "Double Road", "Non-Road"];
  const landTypes = business?.landTypes || ["Khet", "Khar", "Bharri", "FormHouse", "Factory"];
  const soilTypes = business?.soilTypes || ["Bhura Mitti", "Kala Mitti", "Upjau", "Retili"];
  const cropTypes = business?.cropTypes || ["Single Crop", "Double Crop", "Triple Crop", "Dalhan", "Tilhan"];
  const areaUnits = business?.areaUnits || ["sq.ft", "sq.yd", "Acre", "Guntha", "Bigha"];
  const bhkConfigs = business?.bhkConfigs || ["1 BHK", "2 BHK", "3 BHK", "4 BHK"];

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<any>({
    name: "",
    phone: "",
    location: "",
    category: "General",
    classification: "RESIDENTIAL",
    budgetMin: "",
    budgetMax: "",
    agentName: "",
    agentSubName: "",
    visitorName: "",
    propertyTypeInterest: "Plot",
    size: "",
    area: "",
    areaUnit: "sq.ft",
    roadType: "Single Road",
    facing: "East",
    bhk: "2 BHK",
    district: "",
    village: "",
    landType: "Khet",
    soilType: "Upjau",
    cropType: "Single Crop",
    front: "",
    depth: "",
    roadWidth: "",
    isDiverted: false,
    constructionAge: "",
    notes: ""
  });

  // Apply default state from business config
  useEffect(() => {
    if (business) {
      setFormData((prev: any) => ({ ...prev, state: business.defaultState || business.state || "Maharashtra" }));
    }
  }, [business]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const handleSave = () => {
    if (!businessId || !formData.name || !formData.phone || !user?.uid) {
      toast({ variant: "destructive", title: "Missing Info", description: "Name and Phone are mandatory." });
      return;
    }

    setIsSubmitting(true);
    
    const selectedAgent = (teamMembers || []).find((m: any) => m.name === formData.agentName);

    addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'realEstateLeads'), {
      ...formData,
      businessId,
      assignedAgentId: selectedAgent?.id || user.uid,
      createdBy: user.uid,
      leadStage: 'new',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).then(() => {
      toast({ title: "Customer Registered", description: "Lead ownership established." });
      router.push("/properties/leads");
    }).catch((error) => {
    console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Could not save enquiry." });
    }).finally(() => {
      setIsSubmitting(false);
    });
  };

  const SectionHeader = ({ icon: Icon, title }: any) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-8 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{title}</h3>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-20 px-2 sm:px-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0"><Link href="/properties/leads"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Register Customer</h1>
            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mt-0.5 opacity-60">Lead Registry</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSubmitting} className="w-full sm:w-auto bg-primary h-10 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg text-white">
          {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          Save Enquiry
        </Button>
      </div>

      <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden border">
        <CardHeader className="bg-primary/5 border-b py-8 px-6 sm:px-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shrink-0">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg font-black uppercase tracking-tight text-primary">Onboarding Details</CardTitle>
              <CardDescription className="text-[9px] font-bold uppercase tracking-widest">Ownership & Interest Profiles</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 sm:p-10 space-y-12">
          <section>
            <SectionHeader icon={Users} title="1. Basic Customer Profile" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Customer Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Full Name" className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">WhatsApp Number *</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="91XXXXXXXX" className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Preferred Location (Manual)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-40" />
                  <Input value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="Area / Village / City" className="h-12 pl-9 rounded-xl font-bold bg-muted/20 border-none shadow-inner" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Social Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-white border-muted shadow-sm font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {socialCategories.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Min Budget ({currencySymbol})</Label>
                <Input type="number" value={formData.budgetMin} onChange={(e) => setFormData({...formData, budgetMin: e.target.value})} className="h-12 rounded-xl bg-muted/20 border-none shadow-inner" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Max Budget ({currencySymbol})</Label>
                <Input type="number" value={formData.budgetMax} onChange={(e) => setFormData({...formData, budgetMax: e.target.value})} className="h-12 rounded-xl bg-primary/5 border-none shadow-inner font-black" />
              </div>
            </div>
          </section>

          <Separator className="opacity-50" />

          <section>
            <SectionHeader icon={Briefcase} title="2. Internal Attribution & Ownership" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-primary ml-1">Assigned Agent *</Label>
                <Select value={formData.agentName} onValueChange={(v) => setFormData({...formData, agentName: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-white border-primary/20 shadow-sm font-black text-primary">
                    <SelectValue placeholder="Select Owner" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {teamMembers.map((m: any) => (
                      <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Sub Agent (Manual Entry)</Label>
                <Input value={formData.agentSubName} onChange={(e) => setFormData({...formData, agentSubName: e.target.value})} placeholder="Sub Agent Name" className="h-12 rounded-xl bg-muted/20 border-none shadow-inner font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Visitor Name</Label>
                <Input value={formData.visitorName} onChange={(e) => setFormData({...formData, visitorName: e.target.value})} placeholder="Direct Name" className="h-12 rounded-xl bg-muted/20 border-none shadow-inner font-bold" />
              </div>
            </div>
          </section>

          <Separator className="opacity-50" />

          <section className="space-y-8">
            <SectionHeader icon={Zap} title="3. Product Interest Details" />
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary ml-1">Property Type Interest *</Label>
                  <Select value={formData.propertyTypeInterest} onValueChange={(v) => setFormData({...formData, propertyTypeInterest: v})}>
                    <SelectTrigger className="h-12 rounded-xl bg-primary/5 border-primary/20 font-black text-primary"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {PRODUCT_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Preferred Classification</Label>
                  <Select value={formData.classification} onValueChange={(v) => setFormData({...formData, classification: v})}>
                    <SelectTrigger className="h-12 rounded-xl bg-white border-muted shadow-sm font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">{CLASSIFICATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Facing Preference</Label>
                  <Select value={formData.facing} onValueChange={(v) => setFormData({...formData, facing: v})}>
                    <SelectTrigger className="h-12 rounded-xl bg-white border-muted shadow-sm font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">{(facingDirections || []).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {(formData.propertyTypeInterest === 'Khet' || formData.propertyTypeInterest === 'Farmhouse') && (
                <div className="p-6 sm:p-8 bg-green-50 rounded-[2rem] border border-green-100 space-y-6 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Trees className="h-4 w-4 text-green-600" />
                    <span className="text-[10px] font-black uppercase text-green-700 tracking-widest">Land/Soil Interest Criteria</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold uppercase">Size Required</Label>
                      <div className="flex gap-2">
                        <Input type="number" value={formData.size} onChange={(e) => setFormData({...formData, size: e.target.value})} className="h-11 rounded-xl bg-white" placeholder="0.00" />
                        <Select value={formData.areaUnit} onValueChange={(v) => setFormData({...formData, areaUnit: v})}>
                          <SelectTrigger className="h-11 w-24 rounded-xl bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent>{areaUnits.map((u: string) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">District Pref.</Label><Input value={formData.district} onChange={(e) => setFormData({...formData, district: e.target.value})} className="h-11 rounded-xl bg-white" /></div>
                    <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Village Pref.</Label><Input value={formData.village} onChange={(e) => setFormData({...formData, village: e.target.value})} className="h-11 rounded-xl bg-white" /></div>
                    <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Road Access</Label><Select value={formData.roadType} onValueChange={(v) => setFormData({...formData, roadType: v})}><SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent>{roadTypes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Land Type Pref.</Label><Select value={formData.landType} onValueChange={(v) => setFormData({...formData, landType: v})}><SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent>{landTypes.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Soil Type Pref.</Label><Select value={formData.soilType} onValueChange={(v) => setFormData({...formData, soilType: v})}><SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent>{soilTypes.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold uppercase flex items-center gap-1.5"><Wheat className="h-3 w-3" /> Crop Interest</Label>
                      <Select value={formData.cropType} onValueChange={(v) => setFormData({...formData, cropType: v})}>
                        <SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>{cropTypes.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {formData.propertyTypeInterest === 'Farmhouse' && (
                      <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Rooms (BHK)</Label><Select value={formData.bhk} onValueChange={(v) => setFormData({...formData, bhk: v})}><SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent>{bhkConfigs.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></div>
                    )}
                  </div>
                </div>
              )}

              {formData.propertyTypeInterest === 'Plot' && (
                <div className="p-6 sm:p-8 bg-blue-50 rounded-[2rem] border border-blue-100 space-y-6 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-2">
                    <LandPlot className="h-4 w-4 text-blue-600" />
                    <span className="text-[10px] font-black uppercase text-blue-700 tracking-widest">Plot Interest Criteria</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold uppercase">Area Required</Label>
                      <div className="flex gap-2">
                        <Input type="number" value={formData.area} onChange={(e) => setFormData({...formData, area: e.target.value})} className="h-11 rounded-xl bg-white" placeholder="0.00" />
                        <Select value={formData.areaUnit} onValueChange={(v) => setFormData({...formData, areaUnit: v})}>
                          <SelectTrigger className="h-11 w-24 rounded-xl bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent>{areaUnits.map((u: string) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Min Frontage (Ft)</Label><Input value={formData.front} onChange={(e) => setFormData({...formData, front: e.target.value})} className="h-11 rounded-xl bg-white" /></div>
                    <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Min Depth (Ft)</Label><Input value={formData.depth} onChange={(e) => setFormData({...formData, depth: e.target.value})} className="h-11 rounded-xl bg-white" /></div>
                    <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Preferred Road</Label><Select value={formData.roadType} onValueChange={(v) => setFormData({...formData, roadType: v})}><SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent>{roadTypes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
                    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-blue-100 mt-5"><Label className="text-[9px] font-black uppercase text-blue-900">Diverted Plots Only?</Label><Switch checked={formData.isDiverted} onCheckedChange={(v) => setFormData({...formData, isDiverted: v})} className="scale-75 data-[state=checked]:bg-blue-600" /></div>
                  </div>
                </div>
              )}

              {formData.propertyTypeInterest === 'Building' && (
                <div className="p-6 sm:p-8 bg-orange-50 rounded-[2rem] border border-orange-100 space-y-6 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="h-4 w-4 text-orange-600" />
                    <span className="text-[10px] font-black uppercase text-orange-700 tracking-widest">Building / Home Criteria</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">BHK Configuration</Label><Select value={formData.bhk} onValueChange={(v) => setFormData({...formData, bhk: v})}><SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent>{bhkConfigs.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Max Construction Age (Yrs)</Label><Input value={formData.constructionAge} onChange={(e) => setFormData({...formData, constructionAge: e.target.value})} className="h-11 rounded-xl bg-white" /></div>
                    <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Preferred Road Width</Label><Input value={formData.roadWidth} onChange={(e) => setFormData({...formData, roadWidth: e.target.value})} className="h-11 rounded-xl bg-white" /></div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Registry Remarks</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Any specific requirements mentioned by the customer..." className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner p-4 text-xs" />
              </div>
            </div>
          </section>
        </CardContent>

        <CardFooter className="p-8 sm:p-12 bg-muted/10 border-t flex justify-end">
          <Button onClick={handleSave} disabled={isSubmitting} className="h-14 px-12 bg-primary font-black uppercase text-xs tracking-widest shadow-2xl rounded-2xl text-white">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Register Enquiry Node
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
