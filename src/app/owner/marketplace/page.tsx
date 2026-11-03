
"use client";

import { useState } from "react";
import { 
  ShoppingBasket, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  Zap, 
  ShieldCheck, 
  SmartphoneNfc, 
  ScanLine, 
  ShoppingBag, 
  Briefcase, 
  Wallet, 
  Users2, 
  ListTodo, 
  Facebook, 
  Bot, 
  Lightbulb, 
  X, 
  Loader2, 
  Layers, 
  Star, 
  Gem, 
  DatabaseZap,
  ListPlus,
  Handshake,
  Building,
  MessageCircle,
  Palette,
  Ticket,
  Headset,
  Sun
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const icons: Record<string, any> = {
  Lightbulb, SmartphoneNfc, Wallet, Briefcase, Users2, ListTodo, Zap, ShoppingBag, Facebook, ScanLine, Bot, Layers, Gem, Handshake, Building, MessageCircle, Palette, Ticket, Headset, Sun
};

const CATEGORIES = ["Bundles", "Intelligence", "Operations", "Store Builder", "Engagement", "Connectivity", "Real Estate", "Branding", "Support", "Energy"];

const DEFAULT_SEED_DATA = [
  { 
    id: 'suite_growth', 
    name: 'Growth Suite', 
    description: 'WhatsApp Automation, Marketing Tools & CRM Pulse.', 
    price: '999', 
    icon: 'Zap', 
    category: 'Bundles', 
    isTrialAvailable: true, 
    isActive: true, 
    isPopular: true,
    inclusions: "Automated WhatsApp Follow-ups, Marketing Campaign ROI Tracking, Lead Intent Scoring (AI), Customer Re-engagement Bot"
  },
  { 
    id: 'suite_solar', 
    name: 'Solar Business OS', 
    description: 'Complete Solar lifecycle from Inquiry to Asset Monitoring Readiness.', 
    price: '1999', 
    icon: 'Sun', 
    category: 'Bundles', 
    isTrialAvailable: true, 
    isActive: true,
    inclusions: "Technical BOM, Atomic Inventory Issue, Handover Certificates, Asset Registry"
  },
  { 
    id: 'suite_property', 
    name: 'Property Pro Suite', 
    description: 'Advanced Property Catalog, Lead Site-Visits & Agent Rewards.', 
    price: '1499', 
    icon: 'Building', 
    category: 'Bundles', 
    isTrialAvailable: true, 
    isActive: true,
    inclusions: "Property Catalog Management, Site-Visit Scheduling, Agent Commission Tracking, Real Estate Lead Insights"
  },
  { 
    id: 'suite_intelligence', 
    name: 'Intelligence Suite', 
    description: 'Gemini Advisor, AI Bill Scanner & Smart Insights.', 
    price: '1499', 
    icon: 'Bot', 
    category: 'Bundles', 
    isTrialAvailable: true, 
    isActive: true,
    inclusions: "Gemini AI Business Advisor, OCR Bill & Invoice Scanner, Smart Inventory Reorder Math, Customer Payment Risk Analysis"
  },
  { 
    id: 'suite_backoffice', 
    name: 'Back Office Pro', 
    description: 'Accounting, Staff Payroll, Project & Task Suite.', 
    price: '1299', 
    icon: 'Briefcase', 
    category: 'Bundles', 
    isTrialAvailable: true, 
    isActive: true,
    inclusions: "Advanced P&L & Accounting, Staff Biometrics & Payroll, Project Milestone Tracking, Team Task Dashboard"
  },
  { 
    id: 'suite_loyalty', 
    name: 'Loyalty & Membership Suite', 
    description: 'Advanced Coupon Engine, Digital Membership Cards & Reward Wallets.', 
    price: '899', 
    icon: 'Ticket', 
    category: 'Bundles', 
    isTrialAvailable: true, 
    isActive: true,
    inclusions: "Multi-type Coupon Engine, Digital Membership Cards, Reward Points Wallet, QR Verification Node, Automated Expiry Alerts"
  },
  { 
    id: 'suite_support', 
    name: 'Customer Support Pro', 
    description: 'Complaint Tracking, Ticketing System & Satisfaction Analytics.', 
    price: '699', 
    icon: 'Headset', 
    category: 'Bundles', 
    isTrialAvailable: true, 
    isActive: true,
    inclusions: "Multi-channel Ticketing, Team Assignment Logic, Status Tracking Portals, WhatsApp Resolution Alerts, CSAT Ratings"
  },
  { id: 'feat_branding', name: 'Custom Branding Pro', description: 'Unlock Business Logo & Favicon upload to personalize your OS.', price: '299', icon: 'Palette', category: 'Branding', isTrialAvailable: true, isActive: true, inclusions: "Custom Business Logo, Browser Favicon Sync, Sidebar Branding, Public Portal Customization" },
  { id: 'feat_whatsapp', name: 'WhatsApp Automation', description: 'Automated follow-ups & official API sequences.', price: '499', icon: 'SmartphoneNfc', category: 'Intelligence', isTrialAvailable: true, isActive: true },
  { id: 'feat_intelligence', name: 'AI Advisor Pro', description: 'Deep business analytics and growth math.', price: '399', icon: 'Lightbulb', category: 'Intelligence', isTrialAvailable: true, isActive: true },
  { id: 'feat_projects', name: 'Project Suite', description: 'Manage milestones & scaling controls.', price: '399', icon: 'Layers', category: 'Operations', isTrialAvailable: true, isActive: true },
  { id: 'feat_feedback', name: 'Customer Feedback System', description: 'Dynamic forms & response center for CSAT.', price: '299', icon: 'MessageCircle', category: 'Engagement', isTrialAvailable: true, isActive: true },
  { id: 'feat_staff', name: 'Staff Management', description: 'Payroll & biometric tracking.', price: '299', icon: 'Users2', category: 'Operations', isTrialAvailable: true, isActive: true },
  { id: 'feat_store', name: 'Store Builder', description: 'Full online storefront with custom domain.', price: '799', icon: 'ShoppingBag', category: 'Store Builder', isTrialAvailable: true, isActive: true },
];

export default function OwnerMarketplaceManager() {
  const firestore = useFirestore();
  const featuresQuery = useMemoFirebase(() => collection(firestore, 'system', 'config', 'marketplace'), [firestore]);
  const { data: featuresData, isLoading } = useCollection<any>(featuresQuery);
  const features = featuresData || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    price: "499",
    category: "Intelligence",
    icon: "Bot",
    isTrialAvailable: true,
    isActive: true,
    isPopular: false,
    inclusions: ""
  });

  const handleSeedDefaults = () => {
    DEFAULT_SEED_DATA.forEach(module => {
      const docRef = doc(firestore, 'system', 'config', 'marketplace', module.id);
      setDocumentNonBlocking(docRef, { ...module, updatedAt: new Date().toISOString() }, { merge: true });
    });
    toast({ title: "Modules Seeded" });
  };

  const handleSave = () => {
    if (!formData.id || !formData.name) return;
    const docRef = doc(firestore, 'system', 'config', 'marketplace', formData.id);
    setDocumentNonBlocking(docRef, { ...formData, updatedAt: new Date().toISOString() }, { merge: true });
    setIsAddOpen(false);
    setEditingId(null);
    toast({ title: "Module Updated" });
  };

  const handleEdit = (feature: any) => {
    setFormData({ ...feature, inclusions: feature.inclusions || "" });
    setEditingId(feature.id);
    setIsAddOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteDocumentNonBlocking(doc(firestore, 'system', 'config', 'marketplace', id));
    toast({ title: "Module Deleted", variant: "destructive" });
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20"><ShoppingBasket className="h-7 w-7 text-primary" /></div>
          <div><h2 className="text-2xl font-bold text-primary">Marketplace Management</h2><p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Platform Modules</p></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeedDefaults} className="h-10 px-4 font-bold uppercase text-[10px] tracking-widest border-primary/20 text-primary"><DatabaseZap className="mr-2 h-4 w-4" /> Seed Defaults</Button>
          <Button onClick={() => { setFormData({ id: `feat_${Date.now()}`, name: "", description: "", price: "499", category: "Operations", icon: "Bot", isTrialAvailable: true, isActive: true, isPopular: false, inclusions: "" }); setEditingId(null); setIsAddOpen(true); }} className="bg-primary h-10 px-6 font-bold uppercase text-[10px] tracking-widest shadow-lg text-white"><Plus className="mr-2 h-4 w-4" /> New Module</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f) => {
          const IconComp = icons[f.icon] || Bot;
          return (
            <Card key={f.id} className={cn("border-none shadow-md bg-white rounded-3xl overflow-hidden group hover:shadow-xl transition-all border", !f.isActive && "opacity-60 grayscale")}>
              <CardHeader className="p-6 bg-muted/30 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white border shadow-sm flex items-center justify-center"><IconComp className="h-5 w-5" /></div>
                  <div><p className="text-sm font-bold text-primary">{f.name}</p><Badge variant="outline" className="text-[8px] h-4 px-1.5 uppercase font-bold border-primary/20">{f.category}</Badge></div>
                </div>
                <div className="flex gap-1"><Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleEdit(f)}><Edit2 className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
              </CardHeader>
              <CardContent className="p-6 space-y-4"><p className="text-xs text-muted-foreground line-clamp-2 h-10">{f.description}</p><div className="flex items-baseline justify-between"><div className="flex items-baseline gap-1"><span className="text-xl font-bold text-primary">₹{f.price}</span><span className="text-[9px] font-bold text-muted-foreground uppercase">/mo</span></div>{f.isPopular && <Badge className="bg-primary text-white text-[7px] font-bold uppercase h-4">Popular</Badge>}</div></CardContent>
            </Card>
          );
        })}
      </div>
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-8 bg-primary text-white"><DialogTitle className="text-xl">Configure Module</DialogTitle></DialogHeader>
          <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Internal Slug</Label><Input value={formData.id} onChange={(e) => setFormData({...formData, id: e.target.value})} disabled={!!editingId} className="h-11 rounded-xl" /></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Icon</Label><Select value={formData.icon} onValueChange={(v) => setFormData({...formData, icon: v})}><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{Object.keys(icons).map(i => <SelectItem key={i} value={i} className="text-xs font-bold uppercase">{i}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Display Name</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="h-11 rounded-xl font-bold" /></div>
            <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="h-20 rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Price (₹)</Label><Input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="h-11 rounded-xl" /></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Category</Label><Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{CATEGORIES.map(cat => <SelectItem key={cat} value={cat} className="text-xs font-bold uppercase">{cat}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter className="p-8 bg-muted/10 border-t"><Button className="w-full h-14 bg-primary font-black uppercase text-xs" onClick={handleSave}>Save Module</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
