
"use client";

import { useState, useMemo } from "react";
import { 
  IdCard, 
  Plus, 
  ArrowLeft, 
  ArrowRight,
  Save, 
  Loader2, 
  Zap, 
  Star, 
  CheckCircle2, 
  Trash2, 
  PlusCircle, 
  X,
  Palette,
  Sparkles,
  DatabaseZap,
  Target,
  BadgeCheck,
  ShieldCheck,
  Gem,
  Info,
  ListTodo,
  Ticket,
  Percent,
  Tag,
  Layers,
  Clock,
  Crown,
  ToggleLeft,
  Power,
  SmartphoneNfc,
  Type,
  Calculator
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { calculateGST } from "@/lib/mock-db";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";

const DEFAULT_TIERS = [
  { id: 'silver', name: 'Silver', minSpend: 0, pointsMultiplier: 1, cashbackPercent: 0, color: '#94a3b8', status: 'active', benefits: ["Basic Rewards", "Email Support"], linkedCouponIds: [], gstRate: 18 },
  { id: 'gold', name: 'Gold', minSpend: 5000, pointsMultiplier: 1.2, cashbackPercent: 1, color: '#f59e0b', status: 'active', benefits: ["1.2x Points", "Birthday Bonus", "Priority Service"], linkedCouponIds: [], gstRate: 18 },
  { id: 'platinum', name: 'Platinum', minSpend: 15000, pointsMultiplier: 1.5, cashbackPercent: 2, color: '#334155', status: 'active', benefits: ["1.5x Points", "2% Cashback", "Exclusive Previews", "Dedicated Manager"], linkedCouponIds: [], gstRate: 18 },
  { id: 'vip', name: 'VIP', minSpend: 50000, pointsMultiplier: 2, cashbackPercent: 5, color: '#7c3aed', status: 'active', benefits: ["2x Points", "5% Cashback", "Home Visit Service", "Voucher Bundles"], linkedCouponIds: [], gstRate: 18 },
  { id: 'elite', name: 'Elite', minSpend: 100000, pointsMultiplier: 2.5, cashbackPercent: 7, color: '#db2777', status: 'active', benefits: ["2.5x Points", "7% Cashback", "Global Access", "Luxury Lounge"], linkedCouponIds: [], gstRate: 18 },
  { id: 'legend', name: 'Legend', minSpend: 250000, pointsMultiplier: 3, cashbackPercent: 10, color: '#000000', status: 'active', benefits: ["3x Points", "10% Cashback", "Lifetime Warranty", "Founder Circle Access"], linkedCouponIds: [], gstRate: 18 },
];

const DEFAULT_GST_SLABS = [0, 5, 12, 18, 28];

export default function LoyaltyTiersPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const tiersQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'loyaltyTiers'), orderBy('minSpend', 'asc')) : null
  , [firestore, businessId]);
  const { data: tiersRaw, isLoading } = useCollection<any>(tiersQuery);
  const tiers = tiersRaw || [];

  const couponsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'coupons') : null
  , [firestore, businessId]);
  const { data: couponsRaw } = useCollection<any>(couponsQuery);
  const coupons = couponsRaw || [];

  const [editingTier, setEditingTier] = useState<any>(null);
  const [newBenefit, setNewBenefit] = useState("");

  const dynamicGstSlabs = business?.gstSlabs || DEFAULT_GST_SLABS;

  const handleSeedDefaults = () => {
    if (!businessId) return;
    DEFAULT_TIERS.forEach(tier => {
      const docRef = doc(firestore, 'businesses', businessId, 'loyaltyTiers', tier.id);
      setDocumentNonBlocking(docRef, { ...tier, createdAt: serverTimestamp() }, { merge: true });
    });
    toast({ title: "Tiers Initialized", description: "Default membership structure has been deployed." });
  };

  const handleSaveTier = () => {
    if (!businessId || !editingTier) return;
    const docRef = doc(firestore, 'businesses', businessId, 'loyaltyTiers', editingTier.id);
    setDocumentNonBlocking(docRef, { ...editingTier, updatedAt: serverTimestamp() }, { merge: true });
    setEditingTier(null);
    toast({ title: "Tier Node Updated" });
  };

  const addBenefit = () => {
    if (!newBenefit.trim() || !editingTier) return;
    setEditingTier({ ...editingTier, benefits: [...(editingTier.benefits || []), newBenefit.trim()] });
    setNewBenefit("");
  };

  const removeBenefit = (index: number) => {
    if (!editingTier) return;
    setEditingTier({ ...editingTier, benefits: editingTier.benefits.filter((_: any, i: number) => i !== index) });
  };

  const toggleCoupon = (couponId: string) => {
    if (!editingTier) return;
    const current = editingTier.linkedCouponIds || [];
    const updated = current.includes(couponId) ? current.filter((id: string) => id !== couponId) : [...current, couponId];
    setEditingTier({ ...editingTier, linkedCouponIds: updated });
  };

  const currencySymbol = getCurrencySymbol(business?.currency || "INR");

  const gstBreakdown = useMemo(() => {
    if (!editingTier) return null;
    const amount = parseFloat(editingTier.minSpend) || 0;
    const rate = parseFloat(editingTier.gstRate) || 0;
    // For Tiers, we usually assume Base + GST = Total (Exclusive mode)
    return calculateGST(amount, rate, false, 'exclusive');
  }, [editingTier?.minSpend, editingTier?.gstRate]);

  if (isLoading) return <div className="flex items-center justify-center py-20 opacity-40"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20 px-2 sm:px-0">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm border border-border/50 shrink-0"><Link href="/loyalty"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">Tier Privilege Manager</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1.5 opacity-60">Bundle Benefits & Lifecycle Control</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button onClick={handleSeedDefaults} variant="outline" className="h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl border-primary/20 text-primary bg-white hover:bg-primary/5">
            <DatabaseZap className="mr-2 h-4 w-4" /> Reset/Seed Defaults
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tiers.map((tier) => (
          <Card key={tier.id} className={cn(
            "border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border-4 transition-all flex flex-col cursor-pointer",
            tier.status === 'active' ? "border-primary/10 hover:border-primary/20 shadow-xl" : "opacity-60 grayscale-[0.5]"
          )} onClick={() => setEditingTier(tier)}>
            {/* REDESIGNED CARD PREVIEW */}
            <div className="p-8 text-white relative overflow-hidden shrink-0 aspect-[1.8/1] flex flex-col justify-between" style={{ backgroundColor: tier.color || '#0C83B3' }}>
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />
                <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-white/20 blur-[60px]" />
              </div>
              <div className="relative z-10 flex justify-between items-start">
                <div className="space-y-1">
                  <Badge className="bg-white/20 text-white border-none text-[8px] font-black px-3 h-5 uppercase tracking-widest">TIER NODE</Badge>
                  <h3 className="text-xl font-black uppercase tracking-tight">{tier.name}</h3>
                </div>
                <Crown className="h-8 w-8 text-white/30" />
              </div>
              <div className="relative z-10 flex justify-between items-end pt-4">
                 <div className="space-y-1">
                    <p className="text-[7px] font-black uppercase opacity-60">Entry Fee (Incl. GST)</p>
                    <p className="text-xl font-black">
                      {currencySymbol}{Math.round((tier.minSpend || 0) * (1 + (tier.gstRate || 0)/100)).toLocaleString()}
                    </p>
                 </div>
                 <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md">
                    <SmartphoneNfc className="h-5 w-5" />
                 </div>
              </div>
            </div>

            <CardContent className="p-8 pt-0 flex-1 space-y-6 mt-6">
               <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-muted/20 rounded-2xl text-center">
                    <p className="text-[8px] font-black text-muted-foreground uppercase mb-0.5">Multiplier</p>
                    <p className="text-base font-black text-primary">{tier.pointsMultiplier || 1}x</p>
                  </div>
                  <div className="p-4 bg-muted/20 rounded-2xl text-center">
                    <p className="text-[8px] font-black text-muted-foreground uppercase mb-0.5">Cashback</p>
                    <p className="text-base font-black text-green-600">{tier.cashbackPercent || 0}%</p>
                  </div>
               </div>
               <div className="space-y-3">
                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Sparkles className="h-3 w-3" /> Benefits</p>
                 <div className="flex flex-wrap gap-2">
                    {tier.linkedCouponIds?.length > 0 && <Badge className="bg-primary text-white text-[7px] font-black h-4 px-2 uppercase shadow-sm">{tier.linkedCouponIds.length} OFFERS</Badge>}
                    {(tier.benefits || []).slice(0, 2).map((b: string, i: number) => <Badge key={i} variant="secondary" className="bg-slate-50 text-slate-600 border-none text-[8px] font-bold h-4 px-2 uppercase">{b}</Badge>)}
                 </div>
               </div>
            </CardContent>
            <CardFooter className="p-6 border-t bg-muted/5">
               <Button variant="ghost" className="w-full h-10 rounded-xl text-[10px] font-black uppercase text-primary hover:bg-primary/10 transition-all">Configure Tier Node <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={!!editingTier} onOpenChange={(open) => !open && setEditingTier(null)}>
        <DialogContent className="sm:max-w-[1100px] h-[90vh] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden w-[98vw] flex flex-col">
          <div className="flex flex-col lg:flex-row h-full overflow-hidden">
            {/* Left: Editor Area */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden border-r">
              <DialogHeader className="p-8 bg-slate-900 text-white text-left shrink-0">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-xl border border-white/20 shrink-0" style={{ backgroundColor: editingTier?.color ? `${editingTier.color}30` : '#333', color: editingTier?.color || '#fff' }}>
                    <BadgeCheck className="h-8 w-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <DialogTitle className="text-2xl font-black">{editingTier?.name} Configuration</DialogTitle>
                      <Badge className={cn("border-none text-[8px] font-black uppercase h-5", editingTier?.status === 'active' ? "bg-green-50 text-white" : "bg-red-50 text-white")}>{editingTier?.status}</Badge>
                    </div>
                    <DialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Adjust logic & bundled offers</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 p-8">
                <div className="space-y-10 pb-10">
                  {editingTier && (
                    <>
                      <section className="p-6 bg-muted/10 rounded-[2rem] border-2 border-dashed space-y-6">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                             <Power className="h-4 w-4 text-primary" />
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Tier Lifecycle Status</h4>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Current Availability</Label>
                            <Select value={editingTier.status || "active"} onValueChange={(v) => setEditingTier({...editingTier, status: v})}>
                              <SelectTrigger className={cn(
                                "h-11 rounded-xl font-black text-[10px] uppercase shadow-sm border-none",
                                editingTier.status === 'active' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                              )}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="active" className="text-[10px] font-bold uppercase text-green-600">Active (Public)</SelectItem>
                                <SelectItem value="inactive" className="text-[10px] font-bold uppercase text-red-600">Inactive (Hidden)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Visual Signature</Label>
                             <div className="flex items-center gap-3">
                                <Input type="color" value={editingTier.color} onChange={(e) => setEditingTier({...editingTier, color: e.target.value})} className="h-11 w-20 rounded-xl p-1 border-none cursor-pointer shadow-inner bg-muted/20" />
                                <div className="text-[9px] font-black uppercase text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10">{editingTier.color}</div>
                             </div>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-6">
                        <div className="flex items-center gap-2 px-1">
                          <Type className="h-4 w-4 text-primary" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Identity Branding</h4>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Membership Card Name</Label>
                          <Input 
                            value={editingTier.name} 
                            onChange={(e) => setEditingTier({...editingTier, name: e.target.value})} 
                            placeholder="e.g. Platinum Plus" 
                            className="h-12 rounded-xl font-black text-lg bg-muted/20 border-none shadow-inner" 
                          />
                          <p className="text-[8px] font-bold text-muted-foreground uppercase px-1">This name appears on the Digital Membership Card.</p>
                        </div>
                      </section>

                      <Separator />

                      <section className="space-y-8">
                        <div className="flex items-center gap-2 px-1">
                          <Calculator className="h-4 w-4 text-primary" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Pricing & Tax Node</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Base Entry Fee ({currencySymbol})</Label>
                            <Input 
                              type="number" 
                              value={editingTier.minSpend || 0} 
                              onChange={(e) => setEditingTier({...editingTier, minSpend: parseInt(e.target.value) || 0})} 
                              className="h-12 rounded-xl font-black text-xl bg-muted/20 border-none shadow-inner" 
                            />
                            <p className="text-[8px] font-bold text-muted-foreground uppercase px-1">Minimum purchase or enrollment cost</p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">GST Slab (%)</Label>
                            <Select value={editingTier.gstRate?.toString() || "0"} onValueChange={(v) => setEditingTier({...editingTier, gstRate: parseInt(v)})}>
                              <SelectTrigger className="h-12 rounded-xl font-black bg-muted/20 border-none shadow-inner">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {dynamicGstSlabs.map((slab: number) => (
                                  <SelectItem key={slab} value={slab.toString()} className="text-xs font-bold">{slab}% GST</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {gstBreakdown && (
                          <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/20 space-y-4 animate-in zoom-in-95 duration-500">
                             <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black uppercase text-primary tracking-widest">Tax Breakdown</p>
                                  <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">Verified Node Calculation</p>
                                </div>
                                <Badge variant="outline" className="bg-white text-primary border-primary/10 text-[8px] font-black h-5 uppercase">EXCLUSIVE MODE</Badge>
                             </div>
                             <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                   <p className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter">Base Cost</p>
                                   <p className="text-sm font-black text-slate-700">{currencySymbol}{gstBreakdown.baseAmount.toLocaleString()}</p>
                                </div>
                                <div className="space-y-1 text-center">
                                   <p className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter">GST ({editingTier.gstRate}%)</p>
                                   <p className="text-sm font-black text-primary">+{currencySymbol}{gstBreakdown.gstAmount.toLocaleString()}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                   <p className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter">Total Payable</p>
                                   <p className="text-sm font-black text-green-600">{currencySymbol}{gstBreakdown.lineTotal.toLocaleString()}</p>
                                </div>
                             </div>
                          </div>
                        )}
                      </section>

                      <Separator />

                      <section className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Points Multiplier</Label>
                          <Input type="number" step="0.1" value={editingTier.pointsMultiplier || 1} onChange={(e) => setEditingTier({...editingTier, pointsMultiplier: parseFloat(e.target.value) || 1})} className="h-11 rounded-xl font-bold bg-muted/20 border-none shadow-inner" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Cashback %</Label>
                          <Input type="number" value={editingTier.cashbackPercent || 0} onChange={(e) => setEditingTier({...editingTier, cashbackPercent: parseFloat(e.target.value) || 0})} className="h-11 rounded-xl font-bold bg-muted/20 border-none shadow-inner" />
                        </div>
                      </section>

                      <Separator />

                      <section className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Ticket className="h-4 w-4" /> Link Offer Cards</h4>
                          <span className="text-[8px] font-bold text-muted-foreground uppercase">{editingTier.linkedCouponIds?.length || 0} cards bundled</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           {coupons.map((c: any) => {
                             const isSelected = editingTier.linkedCouponIds?.includes(c.id);
                             return (
                               <div key={c.id} onClick={() => toggleCoupon(c.id)} className={cn("p-4 rounded-3xl border-2 transition-all cursor-pointer group flex items-center justify-between", isSelected ? "border-primary bg-primary/5 shadow-inner" : "border-border/50 bg-white opacity-60 hover:opacity-100")}>
                                 <div className="flex items-center gap-3">
                                   <Checkbox checked={isSelected} className="data-[state=checked]:bg-primary" />
                                   <div className="min-w-0">
                                     <p className="text-xs font-black text-slate-900">{c.code}</p>
                                     <p className="text-[8px] font-bold text-muted-foreground uppercase">{c.type === 'percentage' ? `${c.value}% OFF` : `₹${c.value} FLAT`}</p>
                                   </div>
                                 </div>
                               </div>
                             );
                           })}
                        </div>
                      </section>

                      <Separator />

                      <section className="space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Sparkles className="h-4 w-4" /> Benefit Bundle (Text)</h4>
                        <div className="flex gap-2">
                           <Input placeholder="e.g. Free Home Delivery" value={newBenefit} onChange={(e) => setNewBenefit(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addBenefit()} className="h-11 rounded-xl font-bold" />
                           <Button onClick={addBenefit} size="icon" className="h-11 w-11 rounded-xl shrink-0"><Plus className="h-4 w-4" /></Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(editingTier.benefits || []).map((b: string, i: number) => (
                            <div key={i} className="p-4 bg-muted/20 rounded-2xl flex items-center justify-between group">
                              <span className="text-xs font-bold text-slate-700">{b}</span>
                              <button onClick={() => removeBenefit(i)} className="text-destructive opacity-40 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
                            </div>
                          ))}
                        </div>
                      </section>
                    </>
                  )}
                </div>
              </ScrollArea>
              
              <div className="p-8 bg-muted/10 border-t flex flex-row gap-3 shrink-0">
                <Button variant="outline" onClick={() => setEditingTier(null)} className="flex-1 h-14 rounded-2xl font-bold uppercase text-[10px]">Discard</Button>
                <Button onClick={handleSaveTier} className="flex-1 h-14 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">Commit Updates</Button>
              </div>
            </div>

            {/* Right: Preview Area */}
            <div className="hidden lg:flex w-[420px] bg-slate-50 flex-col border-l overflow-hidden">
              <div className="p-6 bg-white/50 border-b flex items-center justify-center shrink-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identity Preview</p>
              </div>
              <ScrollArea className="flex-1 p-8">
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-10 text-left">
                  {editingTier && (
                    <>
                      <div className="relative w-full aspect-[1.8/1] rounded-[2.5rem] overflow-hidden p-8 flex flex-col justify-between text-white shadow-2xl transition-all" style={{ backgroundColor: editingTier.color || '#333' }}>
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                          <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />
                          <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-white/20 blur-[60px]" />
                        </div>
                        <div className="relative z-10 flex justify-between items-start">
                          <Badge className="bg-white/20 text-white border-none text-[8px] font-black px-3 h-5 uppercase tracking-[0.2em] backdrop-blur-md">{editingTier.name} Node</Badge>
                          <Crown className="h-8 w-8 text-white/40" />
                        </div>
                        <div className="relative z-10">
                          <h3 className="text-2xl font-black tracking-tight uppercase leading-none">{editingTier.name} PRIVILEGE</h3>
                          <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-2">Verified Membership Node</p>
                        </div>
                        <div className="relative z-10 flex justify-between items-end border-t border-white/20 pt-4">
                           <div className="min-w-0">
                              <p className="text-[7px] font-bold text-white/40 uppercase tracking-widest">Serial Code</p>
                              <div className="bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 font-mono text-[9px] font-black tracking-widest text-accent truncate">BIZ-{editingTier.name.toUpperCase().replace(/\s+/g, '')}-0001</div>
                           </div>
                           <div className="h-8 w-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                              <SmartphoneNfc className="h-4 w-4" />
                           </div>
                        </div>
                      </div>

                      <Separator className="opacity-40" />

                      <div className="space-y-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Bundled Reward Cards</p>
                        <div className="space-y-4">
                          {(editingTier.linkedCouponIds || []).map((cid: string) => {
                            const c = coupons.find(x => x.id === cid);
                            if (!c) return null;
                            return (
                              <div key={cid} className={cn("relative w-full aspect-[2.6/1] rounded-3xl overflow-hidden p-6 flex flex-col justify-between text-white shadow-xl animate-in slide-in-from-right-4 duration-500", c.theme === 'orange' ? 'bg-orange-600' : c.theme === 'green' ? 'bg-emerald-600' : 'bg-primary')}>
                                  <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '10px 10px' }} />
                                  <div className="absolute top-0 right-[35%] bottom-0 border-l-2 border-dashed border-white/20 z-10" />
                                  <div className="absolute -top-3 right-[35%] -translate-x-1/2 h-6 w-6 bg-slate-50 rounded-full z-20" />
                                  <div className="absolute -bottom-3 right-[35%] -translate-x-1/2 h-6 w-6 bg-slate-50 rounded-full z-20" />
                                  <div className="relative z-10 flex-1 pr-[38%] flex flex-col justify-center">
                                    <div className="flex items-center gap-1.5 opacity-60 mb-1"><Ticket className="h-3 w-3" /><span className="text-[7px] font-black uppercase tracking-[0.2em]">{c.groupId !== 'none' ? business?.offerGroups?.find((g:any)=>g.id === c.groupId)?.name : 'OFFER'}</span></div>
                                    <div className="text-xl font-black tracking-tighter">{c.type === 'percentage' ? `${c.value}% OFF` : `₹${c.value} FLAT`}</div>
                                  </div>
                                  <div className="absolute top-0 right-0 bottom-0 w-[35%] flex flex-col items-center justify-center p-2 z-10">
                                    <p className="text-[7px] font-black uppercase opacity-60">CODE</p>
                                    <div className="bg-black/20 backdrop-blur-md px-2 py-1 rounded-lg font-mono text-[10px] font-black mt-1 uppercase text-accent">{c.code}</div>
                                  </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

