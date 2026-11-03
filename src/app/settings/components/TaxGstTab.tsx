
"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Percent, 
  Zap, 
  Calendar, 
  ArrowRight, 
  History, 
  Plus, 
  X, 
  Globe, 
  ExternalLink, 
  Search, 
  CheckCircle2,
  AlertCircle,
  Hash,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  Info,
  Scale,
  Star,
  Loader2,
  RefreshCcw,
  LayoutList,
  Target,
  FileText,
  SearchCode
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { updateDocumentNonBlocking, useCollection, useMemoFirebase, useFirestore } from "@/firebase";
import { toast } from "@/hooks/use-toast";
import { 
  subMonths, 
  startOfMonth,
  format,
  startOfDay
} from "date-fns";
import { cn } from "@/lib/utils";
import { collection, query, where, Timestamp } from "firebase/firestore";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Chandigarh"
];

interface TaxGstTabProps {
  business: any;
  businessRef: any;
  isAdmin: boolean;
  isTrialExpired: boolean;
  currencySymbol: string;
}

export function TaxGstTab({ business, businessRef, isAdmin, isTrialExpired, currencySymbol }: TaxGstTabProps) {
  const firestore = useFirestore();
  const [newGstSlab, setNewGstSlab] = useState("");
  const [newHsnCode, setNewHsnCode] = useState("");
  const [gstTimeFilter, setGstTimeFilter] = useState("thisMonth");
  const [isUpdating, setIsUpdating] = useState(false);

  // Local state for GSTIN to optimize write bandwidth
  const [localGstin, setLocalGstin] = useState("");

  useEffect(() => {
    if (business?.gstin) setLocalGstin(business.gstin);
  }, [business?.gstin]);

  // Fetch real-time Cashbook for tax stats based on current businessId
  const cashbookQuery = useMemoFirebase(() => {
    if (!business?.id) return null;
    let start = startOfMonth(new Date());
    if (gstTimeFilter === 'lastMonth') start = startOfMonth(subMonths(new Date(), 1));
    else if (gstTimeFilter === 'today') start = startOfDay(new Date());
    else if (gstTimeFilter === 'allTime') start = new Date(2000, 0, 1);
    
    return query(
      collection(firestore, 'businesses', business.id, 'cashbook'),
      where('createdAt', '>=', Timestamp.fromDate(start))
    );
  }, [firestore, business?.id, gstTimeFilter]);

  const { data: transactions, isLoading: isStatsLoading } = useCollection<any>(cashbookQuery);

  const dynamicGstSlabs = business?.gstSlabs || [0, 5, 12, 18, 28];
  const hsnCodes = business?.hsnRegistry || ["8471", "8517", "8544", "9403"];
  const defaultGstRate = business?.defaultGstRate?.toString() || "18";

  const gstSummary = useMemo(() => {
    const list = transactions || [];
    return list.reduce((acc: any, t: any) => {
      if (t.type === 'credit' && t.category === 'Sales') {
        const amount = parseFloat(t.amount) || 0;
        const rate = parseFloat(t.gstRate) || parseFloat(defaultGstRate);
        const base = amount / (1 + (rate / 100));
        const tax = amount - base;
        
        acc.total += tax;
        if (t.isInterState) {
          acc.igst += tax;
        } else {
          acc.cgst += tax / 2;
          acc.sgst += tax / 2;
        }
      }
      return acc;
    }, { cgst: 0, sgst: 0, igst: 0, total: 0 });
  }, [transactions, defaultGstRate]);

  const handleUpdateField = (data: any) => {
    if (!isAdmin || !businessRef) return;
    setIsUpdating(true);
    updateDocumentNonBlocking(businessRef, { ...data, updatedAt: new Date().toISOString() });
    setTimeout(() => {
      setIsUpdating(false);
    }, 400);
  };

  const handleAddGstSlab = () => {
    if (!newGstSlab.trim() || !businessRef) return;
    const slab = parseFloat(newGstSlab);
    if (isNaN(slab)) return;
    if (dynamicGstSlabs.includes(slab)) {
      toast({ variant: "destructive", title: "Duplicate Slab", description: `${slab}% already exists.` });
      return;
    }
    const newSlabs = [...dynamicGstSlabs, slab].sort((a, b) => a - b);
    handleUpdateField({ gstSlabs: newSlabs });
    setNewGstSlab("");
    toast({ title: "Slab Added" });
  };

  const removeGstSlab = (slab: number) => {
    if (!businessRef || !isAdmin) return;
    const newSlabs = dynamicGstSlabs.filter((s: number) => s !== slab);
    const updates: any = { gstSlabs: newSlabs };
    if (business?.defaultGstRate === slab) {
      updates.defaultGstRate = newSlabs.length > 0 ? newSlabs[0] : 0;
    }
    handleUpdateField(updates);
    toast({ title: "Slab Removed" });
  };

  const handleAddHsn = () => {
    if (!newHsnCode.trim() || !businessRef) return;
    const cleanCode = newHsnCode.trim();
    if (hsnCodes.includes(cleanCode)) {
      toast({ variant: "destructive", title: "Duplicate", description: "HSN already in registry." });
      return;
    }
    const newHsn = [...hsnCodes, cleanCode].sort();
    handleUpdateField({ hsnRegistry: newHsn });
    setNewHsnCode("");
    toast({ title: "HSN Linked" });
  };

  const removeHsn = (code: string) => {
    if (!isAdmin) return;
    const newHsn = hsnCodes.filter((c: string) => c !== code);
    handleUpdateField({ hsnRegistry: newHsn });
    toast({ title: "HSN Unlinked" });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column: Core Configuration */}
        <div className="lg:col-span-8 space-y-10">
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-1 text-left">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary fill-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Tenant Liability Node</h3>
              </div>
              <div className="flex items-center gap-3">
                {isStatsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary opacity-40" />}
                <Select value={gstTimeFilter} onValueChange={setGstTimeFilter}>
                  <SelectTrigger className="h-10 w-48 rounded-xl text-[10px] font-black uppercase bg-white border-primary/20 shadow-sm">
                    <Calendar className="mr-2 h-4 w-4 opacity-40 text-primary" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-2xl">
                    <SelectItem value="today" className="text-[10px] font-bold uppercase">Today</SelectItem>
                    <SelectItem value="thisMonth" className="text-[10px] font-bold uppercase">This Month</SelectItem>
                    <SelectItem value="lastMonth" className="text-[10px] font-bold uppercase">Last Month</SelectItem>
                    <SelectItem value="customRange" className="text-[10px] font-bold uppercase">Custom Range</SelectItem>
                    <SelectItem value="allTime" className="text-[10px] font-bold uppercase">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 bg-slate-900 text-white rounded-[1.5rem] shadow-lg relative overflow-hidden group border-none text-left">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform"><Percent className="h-8 w-8 text-primary" /></div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Liability</p>
                <div className="text-xl font-black text-accent">{currencySymbol}{gstSummary.total.toLocaleString()}</div>
              </Card>
              <Card className="p-5 bg-white rounded-[1.5rem] shadow-sm border border-border/50 text-left">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">CGST (Intra)</p>
                <div className="text-xl font-black text-slate-700">{currencySymbol}{gstSummary.cgst.toLocaleString()}</div>
              </Card>
              <Card className="p-5 bg-white rounded-[1.5rem] shadow-sm border border-border/50 text-left">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">SGST (Intra)</p>
                <div className="text-xl font-black text-slate-700">{currencySymbol}{gstSummary.sgst.toLocaleString()}</div>
              </Card>
              <Card className="p-5 bg-white rounded-[1.5rem] shadow-sm border border-border/50 border-l-4 border-l-orange-500 text-left">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">IGST (Inter)</p>
                <div className="text-xl font-black text-orange-600">{currencySymbol}{gstSummary.igst.toLocaleString()}</div>
              </Card>
            </div>
          </section>

          <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border">
            <CardHeader className="bg-primary/5 border-b py-6 px-8 flex flex-row items-center justify-between text-left">
              <div className="flex items-center gap-4 text-left">
                <div className="h-12 w-12 rounded-2xl bg-white border shadow-sm flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary">Compliance Control Hub</CardTitle>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Unified GSTIN & Logic Mapping</p>
                </div>
              </div>
              <Switch 
                checked={business?.gstEnabled} 
                onCheckedChange={(v) => handleUpdateField({ gstEnabled: v })} 
                className="data-[state=checked]:bg-primary" 
              />
            </CardHeader>
            <CardContent className="p-8 space-y-10 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2 text-left">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Business GSTIN</Label>
                  <Input 
                    value={localGstin} 
                    onChange={(e) => setLocalGstin(e.target.value.toUpperCase())}
                    onBlur={(e) => handleUpdateField({ gstin: e.target.value.toUpperCase() })} 
                    placeholder="27AAAAA0000A1Z5" 
                    className="h-12 rounded-xl font-mono text-lg uppercase tracking-wider bg-muted/20 border-none shadow-inner" 
                  />
                </div>
                <div className="space-y-2 text-left">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">State Registry</Label>
                  <Select value={business?.state || "Maharashtra"} onValueChange={(v) => handleUpdateField({ state: v })}>
                    <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none shadow-inner font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 rounded-xl border-none shadow-2xl">
                      {INDIAN_STATES.map(s => <SelectItem key={s} value={s} className="text-xs font-bold">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-6 bg-accent/10 border border-accent/20 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 text-left">
                    <Label className="text-xs font-black uppercase tracking-tight text-primary">Composition Scheme Node</Label>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">Required if you pay fixed percentage tax without ITC.</p>
                  </div>
                  <Switch 
                    checked={!!business?.isCompositionScheme} 
                    onCheckedChange={(v) => handleUpdateField({ isCompositionScheme: v })}
                    className="scale-75 data-[state=checked]:bg-primary"
                  />
                </div>
                {business?.isCompositionScheme && (
                  <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl animate-in zoom-in-95">
                    <Info className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-[9px] font-black text-primary uppercase leading-tight">System will now trigger "Bill of Supply" instead of Tax Invoices.</span>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] px-1">Calculation Logic</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={() => handleUpdateField({ gstMode: 'exclusive' })} 
                    className={cn(
                      "p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden group", 
                      business?.gstMode !== 'inclusive' ? "border-primary bg-primary/5" : "border-muted bg-white hover:border-primary/20"
                    )}
                  >
                    {business?.gstMode !== 'inclusive' && <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-primary animate-in zoom-in" />}
                    <div className="flex items-center gap-3 mb-3">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="text-xs font-black uppercase tracking-tight">Forward (Exclusive)</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">Tax is added to base price. (Base + GST = Net)</p>
                  </button>
                  <button 
                    onClick={() => handleUpdateField({ gstMode: 'inclusive' })} 
                    className={cn(
                      "p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden group", 
                      business?.gstMode === 'inclusive' ? "border-primary bg-primary/5" : "border-muted bg-white hover:border-primary/20"
                    )}
                  >
                    {business?.gstMode === 'inclusive' && <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-primary animate-in zoom-in" />}
                    <div className="flex items-center gap-3 mb-3">
                      <RefreshCcw className="h-4 w-4 text-primary" />
                      <span className="text-xs font-black uppercase tracking-tight">Backward (Inclusive)</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">Price includes tax. (Base = Net / (1 + Rate%))</p>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
              <CardHeader className="bg-muted/30 border-b py-5 px-6 flex justify-between items-center">
                 <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Hash className="h-4 w-4" /> HSN Registry</CardTitle>
                 <div className="flex gap-1.5">
                    <Input value={newHsnCode} onChange={(e) => setNewHsnCode(e.target.value)} placeholder="Code" className="h-8 w-20 text-[10px] rounded-lg" />
                    <Button onClick={handleAddHsn} size="icon" className="h-8 w-8 rounded-lg"><Plus className="h-3.5 w-3.5" /></Button>
                 </div>
              </CardHeader>
              <CardContent className="p-6">
                 <div className="flex flex-wrap gap-2">
                    {hsnCodes.map((code: string) => (
                      <Badge key={code} variant="secondary" className="h-7 px-2 rounded-lg bg-muted/40 border-none text-[9px] font-black uppercase flex items-center gap-2 group">
                        {code}
                        <button onClick={() => removeHsn(code)} className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                 </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
              <CardHeader className="bg-muted/30 border-b py-5 px-6 flex justify-between items-center">
                 <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Percent className="h-4 w-4" /> Tax Slabs</CardTitle>
                 <div className="flex gap-1.5">
                    <Input type="number" value={newGstSlab} onChange={(e) => setNewGstSlab(e.target.value)} placeholder="%" className="h-8 w-16 text-[10px] rounded-lg text-center" />
                    <Button onClick={handleAddGstSlab} size="icon" className="h-8 w-8 rounded-lg"><Plus className="h-3.5 w-3.5" /></Button>
                 </div>
              </CardHeader>
              <CardContent className="p-6">
                 <div className="flex flex-wrap gap-2">
                    {dynamicGstSlabs.map((slab: number) => (
                      <Badge key={slab} className={cn(
                        "h-7 px-2 rounded-lg border-none text-[9px] font-black uppercase flex items-center gap-2 group transition-all",
                        parseFloat(defaultGstRate) === slab ? "bg-primary text-white shadow-md" : "bg-muted/40 text-slate-500"
                      )}>
                        {slab}% GST
                        {parseFloat(defaultGstRate) === slab && <Star className="h-2.5 w-2.5 fill-current" />}
                        <button onClick={() => removeGstSlab(slab)} className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                 </div>
                 <div className="mt-6 space-y-2 text-left">
                    <Label className="text-[8px] font-black uppercase text-muted-foreground">Default POS Slab</Label>
                    <Select value={defaultGstRate} onValueChange={(v) => handleUpdateField({ defaultGstRate: parseFloat(v) })}>
                      <SelectTrigger className="h-9 rounded-xl bg-primary/5 border-none font-black text-xs text-primary"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-2xl">
                        {dynamicGstSlabs.map((slab: number) => <SelectItem key={slab} value={slab.toString()} className="text-[10px] font-bold">{slab}% GST</SelectItem>)}
                      </SelectContent>
                    </Select>
                 </div>
              </CardContent>
            </Card>
          </div>

          <Alert className="bg-blue-50 border-blue-100 rounded-[2rem] p-8 text-left">
             <Clock className="h-6 w-6 text-primary" />
             <div className="ml-4 space-y-1">
                <AlertTitle className="text-sm font-black uppercase text-primary tracking-widest">FILING PROTOCOL</AlertTitle>
                <AlertDescription className="text-xs text-slate-500 italic font-medium leading-relaxed">
                   "Ensure GSTR-1 is uploaded by the 11th of each month to keep your customers' ITC eligibility valid."
                </AlertDescription>
             </div>
          </Alert>
        </div>

        {/* Right Column: Deadlines & Resources */}
        <div className="md:col-span-4 space-y-8 text-left">
           <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border">
              <CardHeader className="bg-muted/30 border-b py-5 px-8">
                 <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Clock className="h-4 w-4" /> FILING DEADLINES
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                 <div className="flex items-center justify-between group">
                    <div className="space-y-0.5">
                       <p className="text-xs font-black text-slate-900 uppercase">GSTR-1</p>
                       <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Outward Supplies</p>
                    </div>
                    <Badge className="bg-primary text-white border-none font-black text-[8px] h-6 px-3 rounded-full shadow-lg">11th Each Month</Badge>
                 </div>
                 <div className="flex items-center justify-between group">
                    <div className="space-y-0.5">
                       <p className="text-xs font-black text-slate-900 uppercase">GSTR-3B</p>
                       <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Summary & Payment</p>
                    </div>
                    <Badge className="bg-primary text-white border-none font-black text-[8px] h-6 px-3 rounded-full shadow-lg">20th Each Month</Badge>
                 </div>
              </CardContent>
           </Card>

           <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border">
              <CardHeader className="bg-muted/30 border-b py-5 px-8">
                 <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Globe className="h-4 w-4" /> GST RESOURCE CENTER
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                 <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-4">COMPLIANCE GUIDE</p>
                    <div className="flex items-center gap-3">
                       <div className="h-2 w-2 rounded-full bg-primary" />
                       <p className="text-[10px] font-bold text-slate-600 uppercase"><span className="font-black text-slate-900">Intra-state:</span> CGST + SGST split 50/50.</p>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="h-2 w-2 rounded-full bg-orange-500" />
                       <p className="text-[10px] font-bold text-slate-600 uppercase"><span className="font-black text-slate-900">Inter-state:</span> Full IGST value applied.</p>
                    </div>
                 </div>
                 
                 <Separator className="opacity-40" />

                 <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-4">GOVERNMENT SHORTCUTS</p>
                    <Button variant="outline" className="w-full h-12 justify-between rounded-xl border-primary/10 text-slate-700 hover:bg-primary/5" asChild>
                       <a href="https://www.gst.gov.in/" target="_blank" rel="noreferrer">
                          <span className="text-[10px] font-black uppercase tracking-tight">OFFICIAL GST PORTAL</span>
                          <ExternalLink className="h-3.5 w-3.5 opacity-40" />
                       </a>
                    </Button>
                    <Button variant="outline" className="w-full h-12 justify-between rounded-xl border-primary/10 text-slate-700 hover:bg-primary/5" asChild>
                       <a href="https://tools.gst.gov.in/hsn-finder" target="_blank" rel="noreferrer">
                          <span className="text-[10px] font-black uppercase tracking-tight">HSN CODE FINDER</span>
                          <Search className="h-3.5 w-3.5 opacity-40" />
                       </a>
                    </Button>
                 </div>
              </CardContent>
           </Card>

           <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 group-hover:scale-110 transition-transform"><RefreshCcw className="h-40 w-40" /></div>
              <div className="relative z-10 space-y-4 text-left">
                 <div className="flex items-center gap-3">
                    <RefreshCcw className="h-5 w-5 text-accent" />
                    <p className="text-[10px] font-black uppercase text-accent tracking-widest">Compliance Pulse</p>
                 </div>
                 <p className="text-xs text-slate-400 font-medium leading-relaxed italic">"Aapke business node par **{(transactions || []).length} transactions** scan huye hain. Tax calculation automatic aur compliant hai."</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
