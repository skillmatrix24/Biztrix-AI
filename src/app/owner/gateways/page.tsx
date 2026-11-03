
"use client";

import { useState } from "react";
import { 
  CreditCard, 
  Plus, 
  Edit2, 
  Trash2, 
  ShieldCheck, 
  Zap, 
  ArrowLeft,
  Info,
  CheckCircle2,
  Loader2,
  Lock,
  Wallet,
  Globe,
  Key,
  Fingerprint,
  SmartphoneNfc
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Separator } from "@/components/ui/separator";
import { useFirestore, useCollection, useMemoFirebase, useUser, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";

const GATEWAY_TYPES = [
  { id: "STRIPE", name: "Stripe", icon: Globe, color: "text-indigo-600" },
  { id: "RAZORPAY", name: "Razorpay (India)", icon: Zap, color: "text-blue-600" },
  { id: "PAYPAL", name: "PayPal", icon: Wallet, color: "text-blue-800" },
  { id: "PAYTM", name: "Paytm", icon: SmartphoneNfc, color: "text-cyan-600" },
];

export default function PlatformGatewaysPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const isPlatformOwner = user?.email?.toLowerCase() === 'skillmatrix24@gmail.com'; 

  const gatewaysQuery = useMemoFirebase(() => 
    isPlatformOwner ? collection(firestore, 'system', 'config', 'gateways') : null
  , [firestore, isPlatformOwner]);
  
  const { data: gateways, isLoading } = useCollection<any>(gatewaysQuery);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    provider: "STRIPE",
    isActive: true,
    apiKey: "",
    apiSecret: "",
    merchantId: ""
  });

  const handleSave = () => {
    if (!formData.name || !formData.id) {
      toast({ variant: "destructive", title: "Missing Info", description: "ID and Name are required." });
      return;
    }
    
    const docRef = doc(firestore, 'system', 'config', 'gateways', formData.id);
    setDocumentNonBlocking(docRef, {
      ...formData,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    setIsAddOpen(false);
    toast({ title: "Gateway Configured", description: `${formData.name} is now global.` });
  };

  const handleDelete = (id: string) => {
    deleteDocumentNonBlocking(doc(firestore, 'system', 'config', 'gateways', id));
    toast({ title: "Gateway Removed", variant: "destructive" });
  };

  const handleEdit = (gw: any) => {
    setFormData(gw);
    setIsAddOpen(true);
  };

  if (!isPlatformOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <ShieldCheck className="h-12 w-12 mb-4 text-muted-foreground" />
        <p className="text-sm font-bold uppercase tracking-widest">Restricted Area</p>
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
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            Platform Gateways
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase font-black tracking-widest">Global Billing Configuration</p>
        </div>
        <Button onClick={() => { setFormData({ id: `gw_${Date.now()}`, name: "", provider: "STRIPE", isActive: true, apiKey: "", apiSecret: "", merchantId: "" }); setIsAddOpen(true); }} className="bg-primary h-10 px-6 font-bold uppercase text-[10px] tracking-widest rounded-xl shadow-lg">
          <Plus className="mr-2 h-4 w-4" /> Add Global Gateway
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gateways?.length === 0 ? (
          <Card className="col-span-full border-2 border-dashed p-12 text-center opacity-40">
            <CreditCard className="h-12 w-12 mx-auto mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest">No Global Methods</p>
            <p className="text-xs mt-2">Marketplace billing will require at least one active gateway.</p>
          </Card>
        ) : (
          gateways?.map((gw) => {
            const typeInfo = GATEWAY_TYPES.find(t => t.id === gw.provider) || GATEWAY_TYPES[0];
            return (
              <Card key={gw.id} className={cn(
                "border-none shadow-md bg-white rounded-3xl overflow-hidden group hover:shadow-xl transition-all border",
                !gw.isActive && "opacity-60 grayscale"
              )}>
                <CardHeader className="p-6 bg-muted/30 border-b flex flex-row items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("h-10 w-10 rounded-xl bg-white border shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform", typeInfo.color)}>
                      <typeInfo.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary">{gw.name}</p>
                      <Badge variant="outline" className="text-[8px] h-4 px-1.5 uppercase font-bold border-primary/20">{gw.provider}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleEdit(gw)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(gw.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("h-2 w-2 rounded-full", gw.isActive ? "bg-green-500 animate-pulse" : "bg-muted")} />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{gw.isActive ? "System Live" : "Draft Mode"}</span>
                    </div>
                    <Lock className="h-3 w-3 text-muted-foreground opacity-40" />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-8 bg-primary text-white">
            <DialogTitle className="text-xl">Platform Gateway Config</DialogTitle>
            <DialogDescription className="text-white/70 text-xs font-bold uppercase tracking-widest">Global billing engine for SaaS revenue</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-5 max-h-[60vh] overflow-y-auto scrollbar-hide">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Gateway ID (Slug)</Label>
              <Input value={formData.id} onChange={(e) => setFormData({...formData, id: e.target.value.toLowerCase().replace(/\s+/g, '_')})} placeholder="stripe_main" className="h-11 rounded-xl font-mono text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Provider</Label>
              <Select value={formData.provider} onValueChange={(v) => setFormData({...formData, provider: v})}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {GATEWAY_TYPES.map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-xs font-bold">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Internal Label</Label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Primary SaaS Stripe" className="h-11 rounded-xl font-bold" />
            </div>

            <div className="space-y-4 pt-2">
              <Separator />
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <Key className="h-3 w-3" /> API Key / Publishable Key
                </Label>
                <Input value={formData.apiKey} onChange={(e) => setFormData({...formData, apiKey: e.target.value})} placeholder="pk_live_..." className="h-11 rounded-xl font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <Lock className="h-3 w-3" /> API Secret / Private Key
                </Label>
                <Input type="password" value={formData.apiSecret} onChange={(e) => setFormData({...formData, apiSecret: e.target.value})} placeholder="sk_live_..." className="h-11 rounded-xl font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <Fingerprint className="h-3 w-3" /> Merchant ID / Account ID
                </Label>
                <Input value={formData.merchantId} onChange={(e) => setFormData({...formData, merchantId: e.target.value})} placeholder="e.g. acct_12345" className="h-11 rounded-xl font-mono text-xs" />
              </div>
            </div>

            <div className="p-4 bg-muted/30 rounded-2xl flex items-center justify-between mt-4">
              <Label className="text-[10px] font-bold uppercase">System Active</Label>
              <Switch checked={formData.isActive} onCheckedChange={(v) => setFormData({...formData, isActive: v})} className="scale-75 data-[state=checked]:bg-primary" />
            </div>
          </div>
          <DialogFooter className="p-8 bg-muted/10 border-t flex-row gap-3">
            <Button variant="outline" className="flex-1 h-12 rounded-xl text-xs font-bold uppercase" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button className="flex-1 h-12 rounded-xl bg-primary font-bold shadow-lg uppercase text-xs tracking-widest text-white" onClick={handleSave}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Deploy Gateway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
