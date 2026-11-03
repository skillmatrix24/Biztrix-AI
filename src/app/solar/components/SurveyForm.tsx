
"use client";

import React, { useState, useRef } from "react";
import { 
  Building2, 
  Zap, 
  Navigation, 
  Calculator, 
  ImageIcon, 
  FileText, 
  Plus, 
  X, 
  SmartphoneNfc, 
  ShieldCheck, 
  Upload, 
  Loader2,
  MapPin,
  Scaling,
  Activity,
  Bot,
  UserPlus,
  Mail,
  Phone,
  Clock,
  DollarSign
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { useFirestore, addDocumentNonBlocking } from "@/firebase";
import { collection, serverTimestamp } from "firebase/firestore";

const SITE_TYPES = ["Residential", "Commercial", "Industrial", "Apartment", "Other"];
const ROOF_TYPES = [
  "Flat Concrete (RCC)", 
  "Inclined RCC", 
  "Industrial Tin Shade", 
  "Asbestos Sheet", 
  "Tile Roof", 
  "Mangalore Tiles", 
  "Open Land", 
  "Structure on Pillars", 
  "Roof Overhang",
  "Polycarbonate Sheet",
  "Other"
];
const DIRECTIONS = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"];
const SHADING_LEVELS = ["None", "Low", "Moderate", "Severe"];
const PHASE_TYPES = ["Single Phase", "Three Phase"];
const SHIFT_HOURS = ["4", "6", "8", "9", "10", "12"];

interface SurveyFormProps {
  inquiry: any;
  teamMembers: any[];
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function SurveyForm({ inquiry, teamMembers, onSubmit, isSubmitting }: SurveyFormProps) {
  const firestore = useFirestore();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    status: "SCHEDULED",
    surveyDate: new Date().toISOString().split('T')[0],
    assignedTo: "",
    assignedName: "",
    customerInfo: {
      siteAddress: inquiry?.location || "",
      siteType: inquiry?.propertyType || "Residential",
      contactPerson: inquiry?.customerName || "",
      contactPhone: inquiry?.customerPhone || ""
    },
    electrical: {
      connectionType: inquiry?.electricityConnection || "Single Phase",
      sanctionedLoad: "0",
      avgMonthlyUnits: inquiry?.averageMonthlyUnits || "0",
      monthlyBill: inquiry?.monthlyBill || "0",
      phaseType: "Single Phase",
      existingSolar: false
    },
    rooftop: {
      material: inquiry?.roofType || "Flat Concrete (RCC)",
      totalArea: inquiry?.roofArea || "0",
      usableArea: "0",
      condition: "Good",
      accessibility: "Easy"
    },
    orientation: {
      direction: "South",
      proposedTilt: "15",
      shadingSeverity: "None",
      obstacles: ""
    },
    installConditions: {
      inverterLocation: "Indoor",
      meterLocation: "Main Entrance",
      earthingAvailability: false,
      lightningProtection: false,
      cableDistance: "50"
    },
    media: [] as string[],
    notes: ""
  });

  // Quick Add Specialist State
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    phone: "",
    role: "Staff",
    dailyRate: "500",
    shiftHours: "8"
  });

  const handleUpdate = (section: string, field: string, value: any) => {
    if (section === 'root') {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setFormData(prev => ({
        ...prev,
        [section]: { ...(prev as any)[section], [field]: value }
      }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({
            ...prev,
            media: [...prev.media, reader.result as string]
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleQuickAddStaff = async () => {
    if (!newStaff.name || !newStaff.email || !inquiry.businessId) return;
    
    const userData = {
      ...newStaff,
      email: newStaff.email.toLowerCase(),
      businessId: inquiry.businessId,
      dailyRate: parseFloat(newStaff.dailyRate) || 500,
      shiftHours: parseInt(newStaff.shiftHours) || 8,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: serverTimestamp()
    };

    try {
      const docRef = await addDocumentNonBlocking(collection(firestore, 'users'), userData);
      if (docRef) {
        setFormData(prev => ({ ...prev, assignedTo: docRef.id, assignedName: newStaff.name }));
        toast({ title: "Specialist Registered", description: "Identity node auto-selected for audit." });
      }
      setIsAddStaffOpen(false);
      setNewStaff({ name: "", email: "", phone: "", role: "Staff", dailyRate: "500", shiftHours: "8" });
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Registration Failed" });
    }
  };

  const SectionTitle = ({ icon: Icon, title, sub }: any) => (
    <div className="flex items-center gap-4 mb-8 text-left">
       <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-sm">
          <Icon className="h-5 w-5" />
       </div>
       <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 leading-none">{title}</h3>
          {sub && <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1.5">{sub}</p>}
       </div>
    </div>
  );

  return (
    <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden border">
       <div className="p-8 sm:p-12 space-y-12">
          {/* ASSIGNMENT & STATUS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-muted/10 p-6 rounded-[2rem] text-left">
             <div className="space-y-1.5">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Survey specialist</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsAddStaffOpen(true)}
                    className="h-6 px-2 text-[8px] font-black uppercase text-primary gap-1 hover:bg-primary/5"
                  >
                    <Plus className="h-2.5 w-2.5" /> Add New
                  </Button>
                </div>
                <Select value={formData.assignedTo} onValueChange={(v) => {
                  const staff = teamMembers.find((m:any) => m.id === v);
                  setFormData({...formData, assignedTo: v, assignedName: staff?.name || ""});
                }}>
                   <SelectTrigger className="h-11 rounded-xl bg-white border-muted font-bold text-xs uppercase"><SelectValue placeholder="Assign Staff" /></SelectTrigger>
                   <SelectContent className="rounded-xl">{teamMembers.map((m: any) => <SelectItem key={m.id} value={m.id} className="text-xs font-bold uppercase">{m.name}</SelectItem>)}</SelectContent>
                </Select>
             </div>
             <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Audit Schedule</Label>
                <Input type="date" value={formData.surveyDate} onChange={(e) => handleUpdate('root', 'surveyDate', e.target.value)} className="h-11 rounded-xl bg-white font-bold" />
             </div>
             <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Workflow Stage</Label>
                <Select value={formData.status} onValueChange={(v) => handleUpdate('root', 'status', v)}>
                   <SelectTrigger className="h-11 rounded-xl bg-white border-muted font-bold text-xs uppercase"><SelectValue /></SelectTrigger>
                   <SelectContent className="rounded-xl">
                      <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                      <SelectItem value="IN_PROGRESS">Field Audit</SelectItem>
                      <SelectItem value="COMPLETED">Finished</SelectItem>
                   </SelectContent>
                </Select>
             </div>
          </div>

          <Separator className="opacity-40" />

          {/* SECTION 1: SITE INFO */}
          <section className="text-left">
             <SectionTitle icon={Building2} title="1. Site Information" sub="Base node identifying geography" />
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Installation Address</Label>
                   <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40" />
                      <Input value={formData.customerInfo.siteAddress} onChange={(e) => handleUpdate('customerInfo', 'siteAddress', e.target.value)} className="h-12 pl-10 rounded-xl bg-muted/20 border-none shadow-inner font-medium text-sm" />
                   </div>
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Property Type</Label>
                   <Select value={formData.customerInfo.siteType} onValueChange={(v) => handleUpdate('customerInfo', 'siteType', v)}>
                      <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none shadow-inner font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">{SITE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                   </Select>
                </div>
             </div>
          </section>

          {/* SECTION 2: ELECTRICAL */}
          <section className="text-left">
             <SectionTitle icon={Zap} title="2. Electrical Parameters" sub="Grid capacity & usage logic" />
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Sanctioned Load (kW)</Label><Input type="number" value={formData.electrical.sanctionedLoad} onChange={(e) => handleUpdate('electrical', 'sanctionedLoad', e.target.value)} className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-black" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Phase Protocol</Label><Select value={formData.electrical.phaseType} onValueChange={(v) => handleUpdate('electrical', 'phaseType', v)}><SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{PHASE_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl mt-5"><span className="text-[10px] font-black uppercase text-slate-900">Existing Solar?</span><Switch checked={formData.electrical.existingSolar} onCheckedChange={(v) => handleUpdate('electrical', 'existingSolar', v)} className="scale-75 data-[state=checked]:bg-primary" /></div>
             </div>
          </section>

          {/* SECTION 3: ROOFTOP */}
          <section className="text-left">
             <SectionTitle icon={Scaling} title="3. Rooftop Environment" sub="Physical area & material audit" />
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Total Roof Area (Sq.Ft)</Label><Input type="number" value={formData.rooftop.totalArea} onChange={(e) => handleUpdate('rooftop', 'totalArea', e.target.value)} className="h-11 rounded-xl bg-muted/20 border-none shadow-inner" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-primary ml-1">Usable Panel Area (Sq.Ft)</Label><Input type="number" value={formData.rooftop.usableArea} onChange={(e) => handleUpdate('rooftop', 'usableArea', e.target.value)} className="h-11 rounded-xl bg-primary/5 border-none shadow-inner font-black text-primary" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Roof Material</Label><Select value={formData.rooftop.material} onValueChange={(v) => handleUpdate('rooftop', 'material', v)}><SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{ROOF_TYPES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
             </div>
          </section>

          {/* SECTION 4: ORIENTATION */}
          <section className="text-left">
             <SectionTitle icon={Navigation} title="4. Orientation & Shading" sub="Irradiance optimization nodes" />
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Panel Orientation</Label><Select value={formData.orientation.direction} onValueChange={(v) => handleUpdate('orientation', 'direction', v)}><SelectTrigger className="h-11 rounded-xl bg-white border-muted font-bold text-xs uppercase"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{DIRECTIONS.map(d => <SelectItem key={d} value={d} className="text-xs uppercase font-bold">{d}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Proposed Tilt (°)</Label><Input type="number" value={formData.orientation.proposedTilt} onChange={(e) => handleUpdate('orientation', 'proposedTilt', e.target.value)} className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-black" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Shading Severity</Label><Select value={formData.orientation.shadingSeverity} onValueChange={(v) => handleUpdate('orientation', 'shadingSeverity', v)}><SelectTrigger className="h-11 rounded-xl bg-white border-muted font-bold text-xs uppercase"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{SHADING_LEVELS.map(l => <SelectItem key={l} value={l} className="text-xs font-bold uppercase">{l}</SelectItem>)}</SelectContent></Select></div>
             </div>
          </section>

          {/* SECTION 5: INSTALL CONDITIONS */}
          <section className="text-left">
             <SectionTitle icon={Activity} title="5. Installation Logistics" sub="Cabling & Placement conditions" />
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase text-slate-400">Inverter Installation Point</Label><Input value={formData.installConditions.inverterLocation} onChange={(e) => handleUpdate('installConditions', 'inverterLocation', e.target.value)} placeholder="e.g. Ground Floor Stairs" className="h-11 rounded-xl bg-muted/10" /></div>
                   <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase text-slate-400">Approx. DC/AC Cable Node (Ft)</Label><Input type="number" value={formData.installConditions.cableDistance} onChange={(e) => handleUpdate('installConditions', 'cableDistance', e.target.value)} className="h-11 rounded-xl bg-muted/10 font-bold" /></div>
                </div>
                <div className="grid grid-cols-1 gap-3 mt-4 sm:mt-5">
                   <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10 transition-all">
                      <div className="space-y-0.5"><p className="text-[10px] font-black uppercase text-primary">Earthing Protocol</p><p className="text-[7px] font-bold text-primary/60">New setup required?</p></div>
                      <Switch checked={formData.installConditions.earthingAvailability} onCheckedChange={(v) => handleUpdate('installConditions', 'earthingAvailability', v)} className="scale-75 data-[state=checked]:bg-primary" />
                   </div>
                   <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10 transition-all">
                      <div className="space-y-0.5"><p className="text-[10px] font-black uppercase text-primary">Lightning Arrestor</p><p className="text-[7px] font-bold text-primary/60">Arrestor kit needed?</p></div>
                      <Switch checked={formData.installConditions.lightningProtection} onCheckedChange={(v) => handleUpdate('installConditions', 'lightningProtection', v)} className="scale-75 data-[state=checked]:bg-primary" />
                   </div>
                </div>
             </div>
          </section>

          {/* SECTION 6: MEDIA */}
          <section className="text-left">
             <SectionTitle icon={ImageIcon} title="6. Site Documentation" sub="Visual audit evidence" />
             <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                {formData.media.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border group shadow-sm">
                    <img src={img} className="w-full h-full object-cover" alt={`Evidence ${i}`} />
                    <button onClick={() => setFormData(prev => ({...prev, media: prev.media.filter((_, idx) => idx !== i)}))} className="absolute top-1 right-1 h-6 w-6 bg-white/80 rounded-full flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"><X className="h-3 w-3" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => imageInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-2 hover:bg-primary/10 transition-all group">
                   <Upload className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                   <span className="text-[8px] font-black uppercase text-primary/60">Upload Photo</span>
                </button>
                <input type="file" ref={imageInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
             </div>
          </section>

          <Separator className="opacity-40" />

          <section className="text-left space-y-4">
             <Label className="text-[10px] font-black uppercase text-primary ml-1 flex items-center gap-2"><Bot className="h-4 w-4" /> Surveyor's Summary & Observations</Label>
             <Textarea value={formData.notes} onChange={(e) => handleUpdate('root', 'notes', e.target.value)} placeholder="Type any specific site constraints or structural warnings..." className="min-h-[120px] rounded-[2rem] bg-muted/10 border-none shadow-inner p-6 text-sm font-medium italic" />
          </section>
       </div>
       
       <CardFooter className="p-8 sm:p-12 bg-muted/10 border-t flex justify-end gap-3">
          <Button variant="outline" asChild className="h-14 px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest"><Link href="/solar/inquiries">Discard Audit</Link></Button>
          <Button onClick={() => onSubmit(formData)} disabled={isSubmitting || !formData.assignedTo} className="h-14 px-14 bg-primary hover:bg-primary/90 font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl active:scale-95 transition-all text-white">
             {isSubmitting ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-3 h-5 w-5" />}
             Finalize Site Audit Node
          </Button>
       </CardFooter>

       {/* QUICK ADD SPECIALIST DIALOG */}
       <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
         <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden text-left w-[95vw]">
            <DialogHeader className="p-8 bg-primary text-white">
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20"><UserPlus className="h-6 w-6 text-white" /></div>
                  <DialogTitle className="text-xl font-black uppercase">Add Specialist</DialogTitle>
               </div>
            </DialogHeader>
            <div className="p-8 space-y-6">
               <div className="space-y-1.5 text-left"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Full Name *</Label><Input value={newStaff.name} onChange={(e) => setNewStaff({...newStaff, name: e.target.value})} className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner" /></div>
               <div className="space-y-1.5 text-left"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Email Node *</Label><Input value={newStaff.email} onChange={(e) => setNewStaff({...newStaff, email: e.target.value})} className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner" /></div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Mobile</Label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" /><Input value={newStaff.phone} onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})} placeholder="91XXXXXXXX" className="h-11 pl-9 rounded-xl" /></div></div>
                  <div className="space-y-1.5 text-left">
                     <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">System Role</Label>
                     <Select value={newStaff.role} onValueChange={(v) => setNewStaff({...newStaff, role: v})}>
                        <SelectTrigger className="h-11 rounded-xl font-bold text-xs uppercase"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl"><SelectItem value="Admin">Admin</SelectItem><SelectItem value="Manager">Manager</SelectItem><SelectItem value="Staff">Staff</SelectItem><SelectItem value="Agent">Agent</SelectItem></SelectContent>
                     </Select>
                  </div>
               </div>
               <Separator />
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                     <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Daily Rate (₹)</Label>
                     <div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" /><Input type="number" value={newStaff.dailyRate} onChange={(e) => setNewStaff({...newStaff, dailyRate: e.target.value})} className="h-11 pl-8 rounded-xl font-black text-primary bg-primary/5 border-none shadow-inner" /></div>
                  </div>
                  <div className="space-y-1.5 text-left">
                     <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Shift Hours</Label>
                     <Select value={newStaff.shiftHours} onValueChange={(v) => setNewStaff({...newStaff, shiftHours: v})}>
                        <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">{SHIFT_HOURS.map(h => <SelectItem key={h} value={h} className="text-xs">{h} Hours</SelectItem>)}</SelectContent>
                     </Select>
                  </div>
               </div>
            </div>
            <DialogFooter className="p-8 bg-muted/10 border-t">
               <Button onClick={handleQuickAddStaff} disabled={!newStaff.name || !newStaff.email} className="w-full h-14 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">Commit Identity Node</Button>
            </DialogFooter>
         </DialogContent>
       </Dialog>
    </Card>
  );
}

