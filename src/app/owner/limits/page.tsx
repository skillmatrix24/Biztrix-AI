
"use client";

import { useState, useEffect } from "react";
import { 
  Activity, 
  Save, 
  Loader2, 
  ShieldCheck, 
  Info, 
  Zap, 
  DatabaseZap,
  Receipt,
  Package,
  Target,
  Users,
  Truck,
  BookOpenText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirestore, useDoc, useMemoFirebase, useUser, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const DEFAULT_LIMITS = {
  maxMonthlyInvoices: 50,
  maxProducts: 30,
  maxActiveLeads: 20,
  maxCustomers: 50,
  maxVendors: 10,
  maxMonthlyEntries: 100
};

export default function PlatformLimitsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const isPlatformOwner = user?.email?.toLowerCase() === 'skillmatrix24@gmail.com'; 

  const limitsRef = useMemoFirebase(() => 
    isPlatformOwner ? doc(firestore, 'system', 'config', 'limits', 'default') : null
  , [firestore, isPlatformOwner]);
  
  const { data: serverLimits, isLoading } = useDoc<any>(limitsRef);

  const [formData, setFormData] = useState(DEFAULT_LIMITS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (serverLimits) {
      setFormData({
        maxMonthlyInvoices: serverLimits.maxMonthlyInvoices || 50,
        maxProducts: serverLimits.maxProducts || 30,
        maxActiveLeads: serverLimits.maxActiveLeads || 20,
        maxCustomers: serverLimits.maxCustomers || 50,
        maxVendors: serverLimits.maxVendors || 10,
        maxMonthlyEntries: serverLimits.maxMonthlyEntries || 100
      });
    }
  }, [serverLimits]);

  const handleSave = () => {
    if (!limitsRef || !isPlatformOwner) return;
    setIsSaving(true);
    
    setDocumentNonBlocking(limitsRef, {
      ...formData,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.uid
    }, { merge: true });

    setTimeout(() => {
      setIsSaving(false);
      toast({ title: "Global Limits Updated", description: "Default usage caps have been synchronized." });
    }, 500);
  };

  const resetToDefaults = () => {
    setFormData(DEFAULT_LIMITS);
    toast({ title: "Local Reset", description: "Fields reset to standard defaults." });
  };

  if (!isPlatformOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <ShieldCheck className="h-12 w-12 mb-4 text-muted-foreground" />
        <p className="text-sm font-bold uppercase tracking-widest">Owner Authorization Required</p>
      </div>
    );
  }

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            System Usage Limits
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase font-black tracking-widest">Global Free-Tier Configuration</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults} className="h-10 px-4 font-bold uppercase text-[10px] tracking-widest border-primary/20 text-primary">
            <DatabaseZap className="mr-2 h-4 w-4" /> Reset Fields
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary h-10 px-8 font-bold uppercase text-[10px] tracking-widest rounded-xl shadow-lg text-white">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Global Defaults
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-8 space-y-6">
          <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden border">
            <CardHeader className="bg-muted/30 border-b py-6 px-8">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Zap className="h-4 w-4" /> Default Feature Caps
              </CardTitle>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">These limits apply to all new businesses automatically</p>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <LimitField 
                  icon={Receipt} 
                  label="Monthly Invoices" 
                  value={formData.maxMonthlyInvoices} 
                  onChange={(v) => setFormData({...formData, maxMonthlyInvoices: parseInt(v)})} 
                />
                <LimitField 
                  icon={Package} 
                  label="Master Products" 
                  value={formData.maxProducts} 
                  onChange={(v) => setFormData({...formData, maxProducts: parseInt(v)})} 
                />
                <LimitField 
                  icon={Target} 
                  label="Active Leads" 
                  value={formData.maxActiveLeads} 
                  onChange={(v) => setFormData({...formData, maxActiveLeads: parseInt(v)})} 
                />
                <LimitField 
                  icon={Users} 
                  label="Customer Profiles" 
                  value={formData.maxCustomers} 
                  onChange={(v) => setFormData({...formData, maxCustomers: parseInt(v)})} 
                />
                <LimitField 
                  icon={Truck} 
                  label="Vendor Profiles" 
                  value={formData.maxVendors} 
                  onChange={(v) => setFormData({...formData, maxVendors: parseInt(v)})} 
                />
                <LimitField 
                  icon={BookOpenText} 
                  label="Monthly Cashbook Entries" 
                  value={formData.maxMonthlyEntries} 
                  onChange={(v) => setFormData({...formData, maxMonthlyEntries: parseInt(v)})} 
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 p-6 border-t">
               <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground font-medium leading-relaxed uppercase tracking-tight">
                    Setting a limit to 0 will disable naya entry creation for that feature. Use large numbers (e.g. 999999) for practically unlimited access.
                  </p>
               </div>
            </CardFooter>
          </Card>
        </div>

        <div className="md:col-span-4 space-y-6">
          <Card className="border-none shadow-md bg-slate-900 text-white rounded-3xl overflow-hidden group">
            <CardContent className="p-8 space-y-6">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                <ShieldCheck className="h-6 w-6 text-accent" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Admin Protocol</h3>
                <p className="text-xs text-slate-400 leading-relaxed uppercase font-bold tracking-tight">System Global Overrides</p>
              </div>
              <div className="pt-4 space-y-4">
                <div className="flex gap-4">
                  <div className="h-6 w-6 rounded-full bg-white/10 text-accent flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                  <p className="text-[10px] text-slate-300 leading-relaxed font-medium">Any changes here will affect <strong>ALL Free Tier</strong> businesses immediately.</p>
                </div>
                <div className="flex gap-4">
                  <div className="h-6 w-6 rounded-full bg-white/10 text-accent flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                  <p className="text-[10px] text-slate-300 leading-relaxed font-medium">Businesses on "ACTIVE" or "PRO" status will ignore these global defaults.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LimitField({ icon: Icon, label, value, onChange }: any) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{label}</Label>
      </div>
      <Input 
        type="number" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-xl bg-muted/20 border-none shadow-inner font-black text-lg text-primary" 
      />
    </div>
  );
}
