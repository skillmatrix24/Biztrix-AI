
"use client";

import { useState, useMemo } from "react";
import { 
  Ticket, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  ArrowLeft, 
  Percent, 
  Zap, 
  Tag, 
  Calendar, 
  Clock, 
  History, 
  Loader2,
  Filter,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  SmartphoneNfc,
  Layers,
  Settings2,
  Info,
  ShieldCheck,
  Sparkles,
  Scissors,
  Palette,
  Eye,
  ChevronRight,
  ListTodo,
  FileText,
  ShieldAlert,
  X,
  Diamond,
  Crown,
  Layout,
  Save,
  FolderPlus,
  Grid,
  Star,
  Gift,
  Gem,
  ArrowUp,
  ArrowDown,
  Link2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

const OFFER_TYPES = [
  { id: "percentage", label: "Percentage (%)", icon: Percent, valueLabel: "Discount Percentage", placeholder: "e.g. 10" },
  { id: "fixed", label: "Flat Amount (₹)", icon: Tag, valueLabel: "Flat Discount Value", placeholder: "e.g. 500" },
  { id: "bogo", label: "Buy X Get Y (BOGO)", icon: Layers, valueLabel: "Offer Description", placeholder: "e.g. Buy 1 Get 1" },
  { id: "wallet", label: "Wallet Cashback", icon: Zap, valueLabel: "Cashback Amount", placeholder: "e.g. 50" },
];

const GROUP_ICONS = [
  { id: "Star", icon: Star },
  { id: "Zap", icon: Zap },
  { id: "Gift", icon: Gift },
  { id: "Flame", icon: Sparkles },
  { id: "Ticket", icon: Ticket },
  { id: "Tag", icon: Tag },
  { id: "Gem", icon: Gem }
];

const THEMES: Record<string, { label: string, class: string, accent: string }> = {
  blue: { label: 'Indigo Night', class: 'bg-gradient-to-br from-blue-600 to-indigo-800', accent: 'text-blue-100' },
  purple: { label: 'Royal Purple', class: 'bg-gradient-to-br from-purple-600 to-pink-700', accent: 'text-purple-100' },
  orange: { label: 'Sunset Glow', class: 'bg-gradient-to-br from-orange-500 to-red-600', accent: 'text-orange-100' },
  green: { label: 'Emerald Forest', class: 'bg-gradient-to-br from-emerald-500 to-teal-700', accent: 'text-emerald-100' },
  black: { label: 'Carbon Black', class: 'bg-gradient-to-br from-slate-800 to-black', accent: 'text-slate-300' },
  red: { label: 'Crimson Fire', class: 'bg-gradient-to-br from-red-600 to-rose-900', accent: 'text-red-100' },
  gold: { label: 'Golden Luxury', class: 'bg-gradient-to-br from-amber-400 via-amber-600 to-yellow-800', accent: 'text-yellow-100' },
  cyan: { label: 'Ocean Cyan', class: 'bg-gradient-to-br from-cyan-500 to-blue-700', accent: 'text-cyan-100' },
  rose: { label: 'Rose Quartz', class: 'bg-gradient-to-br from-rose-400 to-pink-600', accent: 'text-rose-100' },
  indigo: { label: 'Deep Space', class: 'bg-gradient-to-br from-indigo-900 to-slate-900', accent: 'text-indigo-200' },
};

const CARD_STYLES = [
  { id: 'ticket', label: 'Classic Ticket', icon: Scissors, desc: 'Original design with dashed cut-line' },
  { id: 'modern', label: 'Modern Glass', icon: Layout, desc: 'Clean edges with frosted glass effects' },
  { id: 'neon', label: 'Neon Glow', icon: Zap, desc: 'Vibrant borders and high-energy feel' },
  { id: 'pro', label: 'Elite Solid', icon: ShieldCheck, desc: 'Sophisticated layout for premium tiers' }
];

const THEME_LIST = Object.entries(THEMES).map(([id, val]) => ({ id, ...val }));

export default function CouponManagementPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const couponsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'coupons'), orderBy('status', 'asc')) : null
  , [firestore, businessId]);
  const { data: couponsData, isLoading } = useCollection<any>(couponsQuery);
  const coupons = couponsData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inspectingCoupon, setInspectingCoupon] = useState<any>(null);
  
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<any>(null);

  // Group Management State
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupIcon, setNewGroupIcon] = useState("Star");

  const [formData, setFormData] = useState({
    code: "",
    type: "percentage",
    value: "10",
    minOrder: "0",
    maxDiscount: "",
    expiryDate: "",
    usageLimit: "0",
    perUserLimit: "1",
    category: "All",
    groupId: "none",
    status: "active",
    theme: "blue",
    cardStyle: "ticket",
    isStackable: false,
    descriptionHeading: "Offer Details",
    rules: "Valid for all customers\nNot applicable with other offers\nManagement decision is final"
  });

  const offerGroups = useMemo(() => business?.offerGroups || [], [business]);

  const filteredCoupons = useMemo(() => {
    return (coupons || []).filter((c: any) => c.code?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [coupons, searchTerm]);

  const handleSave = () => {
    if (!formData.code || !formData.value || !businessId) {
      toast({ variant: "destructive", title: "Missing Data", description: "Code and Value are required." });
      return;
    }

    setIsSaving(true);
    const couponId = formData.code.toUpperCase();
    const docRef = doc(firestore, 'businesses', businessId, 'coupons', couponId);
    
    setDocumentNonBlocking(docRef, {
      ...formData,
      id: couponId,
      value: formData.type === 'bogo' ? formData.value : parseFloat(formData.value),
      minOrder: parseFloat(formData.minOrder) || 0,
      usageLimit: parseInt(formData.usageLimit) || 0, 
      perUserLimit: parseInt(formData.perUserLimit) || 1,
      maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
      updatedAt: serverTimestamp()
    }, { merge: true });

    setTimeout(() => {
      setIsSaving(false);
      setIsAddOpen(false);
      resetFormState();
      toast({ title: "Campaign Ready", description: `Universal code ${formData.code} is now active.` });
    }, 500);
  };

  const resetFormState = () => {
    setFormData({
      code: "",
      type: "percentage",
      value: "10",
      minOrder: "0",
      maxDiscount: "",
      expiryDate: "",
      usageLimit: "0",
      perUserLimit: "1",
      category: "All",
      groupId: "none",
      status: "active",
      theme: "blue",
      cardStyle: "ticket",
      isStackable: false,
      descriptionHeading: "Offer Details",
      rules: "Valid for all customers\nNot applicable with other offers\nManagement decision is final"
    });
  };

  const handleAddGroup = () => {
    if (!newGroupName.trim() || !businessRef) return;
    const newGroup = {
      id: `gr_${Date.now()}`,
      name: newGroupName.trim(),
      icon: newGroupIcon
    };
    updateDocumentNonBlocking(businessRef, {
      offerGroups: [...offerGroups, newGroup],
      updatedAt: serverTimestamp()
    });
    setNewGroupName("");
    toast({ title: "Group Created" });
  };

  const moveGroup = (idx: number, direction: 'up' | 'down') => {
    if (!businessRef || !offerGroups) return;
    const newGroups = [...offerGroups];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newGroups.length) return;
    
    [newGroups[idx], newGroups[targetIdx]] = [newGroups[targetIdx], newGroups[idx]];
    
    updateDocumentNonBlocking(businessRef, {
      offerGroups: newGroups,
      updatedAt: serverTimestamp()
    });
    toast({ title: "Sequence Updated" });
  };

  const removeGroup = (groupId: string) => {
    if (!businessRef) return;
    updateDocumentNonBlocking(businessRef, {
      offerGroups: offerGroups.filter((g: any) => g.id !== groupId),
      updatedAt: serverTimestamp()
    });
    toast({ title: "Group Removed" });
  };

  const confirmDelete = () => {
    if (!businessId || !couponToDelete) return;
    deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'coupons', couponToDelete.id));
    setIsDeleteAlertOpen(false);
    setCouponToDelete(null);
    toast({ title: "Offer Removed", variant: "destructive" });
  };

  const handleEdit = (e: React.MouseEvent, gw: any) => {
    e.stopPropagation();
    setFormData({
      ...gw,
      value: gw.value?.toString() || "0",
      minOrder: gw.minOrder?.toString() || "0",
      usageLimit: gw.usageLimit?.toString() || "0",
      perUserLimit: gw.perUserLimit?.toString() || "1",
      maxDiscount: gw.maxDiscount?.toString() || "",
      groupId: gw.groupId || "none",
      isStackable: !!gw.isStackable
    });
    setIsAddOpen(true);
  };

  const currencySymbol = getCurrencySymbol(business?.currency || "INR");

  return (
    <div className="space-y-6 md:space-y-10 pb-20 px-2 sm:px-0">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm border border-border/50 shrink-0"><Link href="/loyalty"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">Offer & Card Hub</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Visual Designer & Node Management</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setIsGroupManagerOpen(true)} className="flex-1 sm:flex-none h-11 px-6 font-black uppercase text-[10px] tracking-widest rounded-xl border-primary/20 text-primary bg-white shadow-sm hover:bg-primary/5">
            <FolderPlus className="mr-2 h-4 w-4" /> Manage Groups
          </Button>
          <Dialog open={isAddOpen} onOpenChange={(o) => { setIsAddOpen(o); if(!o) resetFormState(); }}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
                <Plus className="mr-2 h-4 w-4" /> Designer Studio
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[1100px] rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden w-[98vw] max-h-[95vh]">
              <div className="flex flex-col lg:flex-row h-full">
                <div className="flex-1 flex flex-col bg-white overflow-hidden">
                  <DialogHeader className="p-8 bg-slate-900 text-white text-left shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
                        <Palette className="h-8 w-8 text-accent" />
                      </div>
                      <div>
                        <DialogTitle className="text-xl font-bold">Offer Card Designer</DialogTitle>
                        <DialogDescription className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Logic, Layout & Themes</DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>
                  <ScrollArea className="flex-1 max-h-[65vh] p-8">
                    <div className="space-y-12 pb-6 text-left">
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 px-1">
                          <Settings2 className="h-4 w-4 text-primary" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Reward Logic</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Promo Code</Label>
                            <Input value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '')})} placeholder="e.g. FESTIVE2026" className="h-12 rounded-xl font-black text-lg tracking-widest bg-muted/20 border-none shadow-inner" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Manual Group</Label>
                            <Select value={formData.groupId} onValueChange={(v) => setFormData({...formData, groupId: v})}>
                              <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue placeholder="No Group" /></SelectTrigger>
                              <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="none" className="text-xs font-bold uppercase">No Group (General)</SelectItem>
                                {offerGroups.map((g: any) => <SelectItem key={g.id} value={g.id} className="text-xs font-bold uppercase">{g.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase">Benefit Type</Label>
                            <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v, value: ""})}>
                              <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                              <SelectContent className="rounded-xl border-none shadow-2xl">
                                {OFFER_TYPES.map(t => <SelectItem key={t.id} value={t.id} className="text-xs font-bold uppercase">{t.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase">{OFFER_TYPES.find(t => t.id === formData.type)?.valueLabel || "Value"}</Label>
                            <Input type={formData.type === 'bogo' ? 'text' : 'number'} value={formData.value} onChange={(e) => setFormData({...formData, value: e.target.value})} placeholder={OFFER_TYPES.find(t => t.id === formData.type)?.placeholder} className="h-11 rounded-xl font-black text-lg" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-3 px-1">
                          <Link2 className="h-4 w-4 text-primary" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Stacking Protocol</h4>
                        </div>
                        <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/20 flex items-center justify-between group transition-all">
                           <div className="space-y-1">
                              <Label className="text-xs font-black uppercase tracking-tight text-primary">Allow Stacking</Label>
                              <p className="text-[9px] text-muted-foreground font-bold uppercase leading-tight">Can be used with other "Stackable" offers</p>
                           </div>
                           <Switch checked={formData.isStackable} onCheckedChange={(v) => setFormData({...formData, isStackable: v})} className="data-[state=checked]:bg-primary" />
                        </div>
                        <Alert className="bg-muted/30 border-none rounded-2xl">
                           <Info className="h-4 w-4 text-primary" />
                           <AlertDescription className="text-[9px] font-bold uppercase text-muted-foreground">
                              Agar "Off" hai, toh ye Exclusive card hoga. Billing ke waqt ye doosre cards ko remove kar dega.
                           </AlertDescription>
                        </Alert>
                      </div>

                      <div className="space-y-8">
                         <div className="flex items-center gap-3 px-1">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Visual Architecture</h4>
                        </div>
                        
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Select Card Style</Label>
                          <div className="grid grid-cols-2 gap-4">
                             {CARD_STYLES.map(style => (
                               <div 
                                 key={style.id} 
                                 onClick={() => setFormData({...formData, cardStyle: style.id})}
                                 className={cn(
                                   "p-4 rounded-2xl border-2 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all",
                                   formData.cardStyle === style.id ? "border-primary bg-primary/5 shadow-inner" : "border-border/50 bg-white hover:border-primary/20"
                                 )}
                               >
                                 <style.icon className={cn("h-5 w-5", formData.cardStyle === style.id ? "text-primary" : "text-slate-400")} />
                                 <div className="space-y-1">
                                   <p className="text-[9px] font-black uppercase tracking-tight">{style.label}</p>
                                   <p className="text-xs font-medium text-slate-400 leading-none">{style.desc}</p>
                                 </div>
                               </div>
                             ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Select Theme Flavor</Label>
                          <div className="flex flex-wrap gap-3">
                            {THEME_LIST.map(t => (
                              <button 
                                key={t.id} 
                                type="button"
                                onClick={() => setFormData({...formData, theme: t.id})}
                                className={cn(
                                  "h-11 w-11 rounded-full border-4 transition-all relative overflow-hidden",
                                  t.class,
                                  formData.theme === t.id ? "border-slate-900 scale-125 shadow-xl ring-2 ring-primary/20" : "border-white shadow-sm opacity-80"
                                )}
                                title={t.label}
                              >
                                {formData.theme === t.id && <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-3 px-1">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Validity & Guardrails</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase">Min Spend ({currencySymbol})</Label>
                            <Input type="number" value={formData.minOrder} onChange={(e) => setFormData({...formData, minOrder: e.target.value})} className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase">Expiry Window</Label>
                            <Input type="date" value={formData.expiryDate} onChange={(e) => setFormData({...formData, expiryDate: e.target.value})} className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase">Global Usage Limit (0 for ∞)</Label>
                            <Input type="number" value={formData.usageLimit} onChange={(e) => setFormData({...formData, usageLimit: e.target.value})} className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase">Per User Limit</Label>
                            <Input type="number" value={formData.perUserLimit} onChange={(e) => setFormData({...formData, perUserLimit: e.target.value})} className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-3 px-1">
                          <FileText className="h-4 w-4 text-primary" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Fine Print</h4>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase">Display Heading</Label>
                            <Input value={formData.descriptionHeading} onChange={(e) => setFormData({...formData, descriptionHeading: e.target.value})} className="h-11 rounded-xl font-bold" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase">Terms (Line by Line)</Label>
                            <Textarea value={formData.rules} onChange={(e) => setFormData({...formData, rules: e.target.value})} className="min-h-[120px] rounded-2xl bg-muted/20 border-none p-4 text-xs font-medium" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                  <div className="p-8 bg-muted/10 border-t shrink-0">
                    <Button onClick={handleSave} disabled={isSaving} className="w-full h-16 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">
                      {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Establish Card Node
                    </Button>
                  </div>
                </div>

                <div className="hidden lg:flex w-[420px] bg-slate-50 flex-col items-center justify-center p-10 border-l border-border/50 relative overflow-y-auto">
                  <div className="absolute top-10 left-10 text-slate-300">
                    <Eye className="h-4 w-4" />
                  </div>
                  <div className="w-full space-y-10 animate-in fade-in zoom-in-95 duration-500">
                    <div className="text-center space-y-1">
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Card Inspector</p>
                       <p className="text-[8px] font-bold text-primary uppercase">v2.5 Dynamic Render</p>
                    </div>
                    
                    <CouponPreviewCard data={formData} business={business} currencySymbol={currencySymbol} hideInspectButton />
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
        {isLoading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-40">
             <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
             <p className="text-[10px] font-black uppercase tracking-widest">Accessing Node Registry...</p>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="col-span-full py-40 text-center space-y-6 opacity-30 italic text-sm font-black uppercase tracking-widest border-2 border-dashed rounded-[3rem]">
             <Ticket className="h-12 w-12 mx-auto" />
             <p className="text-sm font-black uppercase tracking-widest">No deployed offer nodes.</p>
          </div>
        ) : filteredCoupons.map((c: any) => (
          <div key={c.id} onClick={() => setInspectingCoupon(c)} className="cursor-pointer group animate-in fade-in duration-500">
             <CouponPreviewCard data={c} business={business} currencySymbol={currencySymbol} isCompact onEdit={(e) => handleEdit(e, c)} onDelete={() => { setCouponToDelete(c); setIsDeleteAlertOpen(true); }} />
          </div>
        ))}
      </div>

      {/* GROUP MANAGER DIALOG */}
      <Dialog open={isGroupManagerOpen} onOpenChange={setIsGroupManagerOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2.5rem border-none shadow-2xl p-0 overflow-hidden w-[95vw] text-left">
           <DialogHeader className="p-8 bg-slate-900 text-white">
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                   <Grid className="h-6 w-6 text-accent" />
                 </div>
                 <div>
                   <DialogTitle className="text-xl font-bold">Offer Group Hub</DialogTitle>
                   <DialogDescription className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Categorize your cards manually</DialogDescription>
                 </div>
              </div>
           </DialogHeader>
           <div className="p-8 space-y-8">
              <div className="p-6 bg-muted/20 rounded-3xl space-y-4">
                 <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Add New Group</Label>
                 <div className="flex flex-col gap-3">
                    <Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g. Summer Deals 2026" className="h-11 rounded-xl font-bold bg-white" />
                    <div className="flex items-center justify-between gap-3">
                       <div className="flex gap-2">
                         {GROUP_ICONS.map((i) => (
                           <button 
                             key={i.id} 
                             onClick={() => setNewGroupIcon(i.id)}
                             className={cn(
                               "h-9 w-9 rounded-xl border-2 flex items-center justify-center transition-all",
                               newGroupIcon === i.id ? "bg-primary text-white border-primary shadow-lg" : "bg-white border-border/50 text-slate-400 hover:border-primary/20"
                             )}
                           >
                             <i.icon className="h-4 w-4" />
                           </button>
                         ))}
                       </div>
                       <Button onClick={handleAddGroup} className="h-9 px-6 font-black uppercase text-[9px] rounded-xl shadow-lg">Create</Button>
                    </div>
                 </div>
              </div>
              <Separator />
              <div className="space-y-4">
                 <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Current Clusters & Sequence</Label>
                 <ScrollArea className="h-64">
                    <div className="space-y-3 pr-2 text-left">
                       {offerGroups.length === 0 ? <p className="text-center py-10 opacity-30 text-xs italic">No manual groups defined.</p> : offerGroups.map((g: any, idx: number) => {
                          const IconComp = GROUP_ICONS.find(i => i.id === g.icon)?.icon || Star;
                          return (
                            <div key={g.id} className="p-4 bg-white rounded-2xl border shadow-sm flex items-center justify-between group">
                               <div className="flex items-center gap-3">
                                 <div className="flex flex-col gap-0.5 text-left">
                                   <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-primary/10" disabled={idx === 0} onClick={() => moveGroup(idx, 'up')}>
                                     <ArrowUp className="h-3 w-3" />
                                   </Button>
                                   <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-primary/10" disabled={idx === offerGroups.length - 1} onClick={() => moveGroup(idx, 'down')}>
                                     <ArrowDown className="h-3 w-3" />
                                   </Button>
                                 </div>
                                 <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><IconComp className="h-4 w-4" /></div>
                                 <span className="text-sm font-bold text-slate-900 uppercase tracking-tight">{g.name}</span>
                               </div>
                               <Button variant="ghost" size="icon" onClick={() => removeGroup(g.id)} className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          );
                       })}
                    </div>
                 </ScrollArea>
              </div>
           </div>
           <DialogFooter className="p-6 bg-muted/10 border-t">
              <Button variant="ghost" onClick={() => setIsGroupManagerOpen(false)} className="w-full text-[10px] font-black uppercase tracking-widest">Close Hub</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!inspectingCoupon} onOpenChange={(open) => !open && setInspectingCoupon(null)}>
        <DialogContent className="sm:max-w-[450px] h-[90vh] rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden w-[95vw] flex flex-col">
          <DialogHeader className="sr-only"><DialogTitle>Card Inspector</DialogTitle><DialogDescription>Details</DialogDescription></DialogHeader>
          {inspectingCoupon && (
            <>
              <div className="p-8 sm:p-10 bg-slate-50 flex justify-center shrink-0">
                 <div className="w-full max-w-[320px] scale-90 sm:scale-100">
                    <CouponPreviewCard data={inspectingCoupon} business={business} currencySymbol={currencySymbol} isCompact hideInspectButton />
                 </div>
              </div>
              <div className="relative flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-8 sm:p-10 space-y-6 text-left pb-20">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><ListTodo className="h-4 w-4" /> {inspectingCoupon.descriptionHeading || 'Offer Rules'}</h4>
                    <div className="space-y-4 pl-1 pb-10">
                      {(inspectingCoupon.rules || "").split('\n').filter((l:string) => l.trim() !== "").map((rule: string, i: number) => (
                        <div key={i} className="flex gap-4">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <p className="text-sm font-bold text-slate-600 leading-relaxed uppercase tracking-tight text-left">{rule}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
                {/* Visual hint for more content */}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
              </div>
              <DialogFooter className="p-8 bg-muted/10 border-t gap-3 shrink-0 flex-row">
                <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold uppercase text-[10px]" onClick={() => setInspectingCoupon(null)}>Close</Button>
                <Button className="flex-1 h-14 bg-green-600 hover:bg-green-700 rounded-2xl font-bold uppercase text-[10px] gap-2 shadow-xl text-white" onClick={() => window.open(`https://wa.me/?text=Hi! Checkout this offer: ${inspectingCoupon.code} at ${business?.name}`, '_blank')}>
                   <SmartphoneNfc className="h-4 w-4" /> Send Card
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-10 text-left">
          <AlertDialogHeader>
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-6">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <AlertDialogTitle className="text-2xl font-black">Erase Offer Node?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-slate-500 leading-relaxed uppercase tracking-tight">
              Permanently remove <span className="font-bold text-slate-900">"{couponToDelete?.code}"</span> from the global registry? This will disable the card for all members.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 flex gap-4">
            <AlertDialogCancel asChild><Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold uppercase text-[10px]">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction asChild><Button onClick={() => confirmDelete()} className="flex-1 h-14 rounded-2xl font-black uppercase bg-destructive hover:bg-destructive/90 text-white border-none shadow-lg text-[10px]">Erase Now</Button></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CouponPreviewCard({ data, business, currencySymbol, isCompact = false, onEdit, onDelete, member, hideInspectButton = false }: any) {
  const theme = THEMES[data.theme || 'blue'] || THEMES.blue;
  const style = data.cardStyle || 'ticket';

  const getFinalExpiry = () => {
    if (member && member.type?.toLowerCase() !== 'lifetime' && member.expiryDate) {
      try {
        const d = new Date(member.expiryDate);
        if (!isNaN(d.getTime())) return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch (e) {
    console.error(e);}
    }

    if (data.expiryDate && data.expiryDate !== 'LIFETIME' && data.expiryDate.trim() !== '') {
      try {
        const d = new Date(data.expiryDate);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      } catch (e) {
    console.error(e);}
    }
    return 'LIFETIME';
  };

  const displayExpiry = getFinalExpiry();

  const renderTopContent = () => {
    const usageLabel = `${data.usageCount || 0}/${data.usageLimit || '∞'}`;
    
    if (style === 'ticket') {
      return (
        <div className="flex justify-between relative z-10 h-full min-h-[100px]">
          <div className="flex-1 pr-4 flex flex-col justify-center text-left">
            <div className="flex items-center gap-1.5 opacity-60 mb-2">
              <Tag className="h-3.5 w-3.5" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                {business?.offerGroups?.find((g: any) => g.id === data.groupId)?.name || 'PROMO CODE'}
              </span>
            </div>
            <h3 className="text-2xl font-black tracking-widest leading-none truncate drop-shadow-lg">{data.code || 'CODE'}</h3>
            <p className="text-[10px] font-bold text-accent italic uppercase mt-2">
              {data.type === 'percentage' ? `${data.value}% OFF` : data.type === 'bogo' ? data.value : `${currencySymbol}${data.value} FLAT`}
            </p>
          </div>

          <div className="w-[32%] flex flex-col items-center justify-between py-1 border-l-2 border-dashed border-white/30 pl-2 text-center">
            <div className="text-center">
              <p className="text-[7px] font-black uppercase opacity-60 tracking-tighter">GLOBAL LOG</p>
              <p className="text-[10px] font-black text-white">{usageLabel}</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-[12px] font-black uppercase text-white shadow-inner">
              {business?.name?.charAt(0) || 'B'}
            </div>
          </div>
        </div>
      );
    }

    if (style === 'modern') {
      return (
        <div className="relative z-10 flex flex-col h-full text-left">
           <div className="w-full flex justify-between items-center mb-2">
              <Badge className="bg-white/20 text-white border-none text-[8px] font-black h-4 uppercase">{data.perUserLimit || 1} USER LIMIT</Badge>
              <div className="h-7 w-7 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-[10px] font-black text-white">{business?.name?.charAt(0) || 'B'}</div>
           </div>
           <div className="flex flex-col items-start gap-1 py-2 flex-1 justify-center">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60">
                {business?.offerGroups?.find((g: any) => g.id === data.groupId)?.name || 'EXCLUSIVE ACCESS'}
              </p>
              <h3 className="text-xl font-black tracking-widest">{data.code || 'CODE'}</h3>
              <p className="text-[9px] font-bold text-accent uppercase">{data.type === 'percentage' ? `${data.value}% OFF` : data.type === 'bogo' ? data.value : `₹${data.value} FLAT`}</p>
           </div>
           <div className="w-full flex justify-between items-center opacity-60 text-[7px] font-black uppercase tracking-widest">
              <span>Usage: {usageLabel}</span>
              <span>v2.5 Stable Node</span>
           </div>
        </div>
      );
    }

    if (style === 'neon') {
      return (
        <div className="relative z-10 flex flex-col h-full justify-between text-left">
           <div className="flex justify-end">
              <div className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[7px] font-black uppercase tracking-widest text-white">
                USER LIMIT: {data.perUserLimit || 1}
              </div>
           </div>
           <div className="mt-auto space-y-1">
              <h3 className="text-2xl font-black tracking-tighter italic drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{data.code || 'CODE'}</h3>
              <div className="flex items-center gap-2">
                 <Badge className="bg-primary text-white border-none text-[8px] font-black h-3.5 px-1 uppercase tracking-tighter">
                   {business?.offerGroups?.find((g: any) => g.id === data.groupId)?.name || 'REWARD NODE'}
                 </Badge>
                 <span className="text-[8px] font-black text-accent uppercase">{data.type === 'percentage' ? `${data.value}% OFF` : data.type === 'bogo' ? data.value : `₹${data.value} FLAT`}</span>
              </div>
           </div>
           <div className="absolute top-1/2 right-0 -translate-y-1/2 -rotate-90 origin-right opacity-30">
              <span className="text-[7px] font-black uppercase tracking-[0.4em] whitespace-nowrap text-white">GLOBAL: {usageLabel}</span>
           </div>
        </div>
      );
    }

    if (style === 'pro') {
      return (
        <div className="relative z-10 flex flex-col h-full text-left">
           <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                 <p className="text-[7px] font-black uppercase tracking-widest opacity-60">IDENTITY NODE</p>
                 <div className="flex items-center gap-1.5">
                    <Crown className="h-3 w-3 text-accent" />
                    <span className="text-[8px] font-black uppercase">{business?.offerGroups?.find((g: any) => g.id === data.groupId)?.name || 'PLATFORM ELITE'}</span>
                 </div>
              </div>
              <h3 className="text-lg font-black tracking-widest text-right">{data.code || 'CODE'}</h3>
           </div>
           <div className="flex-1 flex flex-col justify-center my-2">
              <div className="p-3 rounded-xl bg-black/20 border border-white/10 backdrop-blur-md text-center">
                 <p className="text-[10px] font-black uppercase tracking-widest text-accent">
                   {data.type === 'percentage' ? `${data.value}% OFF REWARD` : data.type === 'bogo' ? data.value : `${currencySymbol}${data.value} FLAT DISCOUNT`}
                 </p>
              </div>
           </div>
           <div className="flex justify-between items-end pt-1 text-white">
              <div className="space-y-0.5 text-left">
                 <p className="text-[6px] font-black uppercase opacity-60">USER LIMIT</p>
                 <p className="text-[9px] font-black uppercase">{data.perUserLimit || 1} Uses</p>
              </div>
              <div className="text-right space-y-0.5">
                 <p className="text-[6px] font-black uppercase opacity-60">GLOBAL LOG</p>
                 <p className="text-[9px] font-black uppercase">{usageLabel}</p>
              </div>
           </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={cn(
      "border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border group relative transition-all duration-500",
      style === 'modern' && "backdrop-blur-xl border-white/20",
      style === 'neon' && "ring-1 ring-primary/40 shadow-[0_0_15px_rgba(var(--primary),0.2)]",
      style === 'pro' && "border-2 border-slate-900 shadow-2xl"
    )}>
      {/* TOP PART (COLORED) */}
      <div className={cn("p-8 relative text-white transition-all duration-500 min-h-[140px]", theme.class)}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '15px 15px' }} />
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-white/10 blur-[80px]" />
          <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-white/5 blur-[80px]" />
        </div>

        {style === 'ticket' && (
          <>
            <div className="absolute -top-4 right-[32%] -translate-x-1/2 h-8 w-8 bg-slate-50 rounded-full z-20 shadow-inner" />
            <div className="absolute -bottom-4 right-[32%] -translate-x-1/2 h-8 w-8 bg-white rounded-full z-20 shadow-inner" />
          </>
        )}

        {renderTopContent()}
      </div>

      <CardContent className="p-8 space-y-6 bg-white relative z-20 text-left">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">MIN SPEND</p>
            <p className="text-xl font-black text-slate-900">{currencySymbol}{data.minOrder || 0}</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">STAKING</p>
            <Badge variant={data.isStackable ? "secondary" : "outline"} className={cn("text-[8px] font-black uppercase h-5 px-2 border-none shadow-sm", data.isStackable ? "bg-green-50 text-green-700" : "bg-muted text-slate-400")}>
               {data.isStackable ? 'STACKABLE' : 'EXCLUSIVE'}
            </Badge>
          </div>
        </div>

        {!hideInspectButton && (
          <Button variant="ghost" className="w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] border-2 border-dashed border-primary/20 text-primary hover:bg-primary/5 transition-all">
            <Info className="h-4 w-4 mr-2" /> Inspect Reward
          </Button>
        )}

        <Separator className="opacity-40" />

        <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
           <div className="flex items-center gap-2">
             <Clock className="h-4 w-4 opacity-40" />
             <span className={cn(displayExpiry === 'LIFETIME' ? 'text-slate-400' : 'text-primary font-bold')}>{displayExpiry}</span>
           </div>
           <div className="flex gap-2">
             {onEdit && <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={onEdit}><Edit2 className="h-3.5 w-3.5" /></Button>}
             {onDelete && <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>}
             <Badge variant="outline" className="text-[8px] h-4 border-primary/20 text-primary uppercase font-black">Authorized Node</Badge>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}

