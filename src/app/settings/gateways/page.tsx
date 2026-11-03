
"use client";

import { useState, useEffect } from "react";
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
  Coins,
  Building2,
  Globe,
  Key,
  Fingerprint,
  SmartphoneNfc,
  Copy,
  Check,
  Terminal,
  Activity
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
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useFirestore, useMemoFirebase, useUser, useDoc, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { listGatewayMetadata } from "@/app/actions/p0-migration";

const GATEWAY_TYPES = [
  { id: "STRIPE", name: "Stripe", icon: Globe, color: "text-indigo-600" },
  { id: "RAZORPAY", name: "Razorpay (India)", icon: Zap, color: "text-blue-600" },
  { id: "PAYTM", name: "Paytm Business", icon: Wallet, color: "text-cyan-600" },
  { id: "UPI", name: "Direct UPI / QR", icon: SmartphoneNfc, color: "text-green-600" },
  { id: "MANUAL", name: "Manual / Cash", icon: Coins, color: "text-slate-600" },
];

export default function PaymentGatewaysPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const [gateways, setGateways] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // HARDENED: Fetch metadata via privileged server action because rules block Client read
  const fetchGateways = async () => {
    if (!businessId) return;
    setIsLoading(true);
    try {
      const data = await listGatewayMetadata(businessId);
      setGateways(data);
    } catch (e) {
    console.error(e);
      console.warn("Gateway metadata sync failed.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGateways();
  }, [businessId]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    provider: "STRIPE",
    type: "CARD",
    isActive: true,
    apiKey: "",
    apiSecret: "",
    merchantId: "",
    webhookSecret: `whs_${Math.random().toString(36).substr(2, 12)}`
  });

  const [isCopied, setIsCopied] = useState(false);

  const webhookUrl = useMemo(() => {
    if (typeof window === 'undefined') return "";
    return `${window.location.origin}/api/webhook/razorpay?bId=${businessId}`;
  }, [businessId]);

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast({ title: "Endpoint Copied", description: "Paste this in Razorpay Webhook settings." });
  };

  const handleSave = async () => {
    if (!businessId || !formData.name || !business) return;
    const configId = formData.id || `gw_${Date.now()}`;
    const docRef = doc(firestore, 'businesses', businessId, 'paymentGatewayConfigs', configId);
    
    // Hardening: Save secret to private node
    const privateRef = doc(firestore, 'businesses', businessId, 'privateConfig', 'gateways');
    setDocumentNonBlocking(privateRef, {
      [configId]: { apiSecret: formData.apiSecret }
    }, { merge: true });

    // Remove secret from public data node
    const { apiSecret, ...publicData } = formData;

    setDocumentNonBlocking(docRef, {
      ...publicData,
      id: configId,
      businessId,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    setIsAddOpen(false);
    toast({ title: "Gateway Configured", description: `${formData.name} node is now live.` });
    fetchGateways(); // Refresh local list
  };

  const handleDelete = (id: string) => {
    if (!businessId) return;
    deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'paymentGatewayConfigs', id));
    toast({ title: "Gateway Removed", variant: "destructive" });
    setGateways(prev => prev.filter(g => g.id !== id));
  };

  const handleEdit = (gw: any) => {
    setFormData({
      id: gw.id,
      name: gw.name || "",
      provider: gw.provider || "STRIPE",
      type: gw.type || "CARD",
      isActive: gw.isActive !== false,
      apiKey: gw.apiKey || "",
      apiSecret: "", // Secret remains write-only for client
      merchantId: gw.merchantId || "",
      webhookSecret: gw.webhookSecret || `whs_${Math.random().toString(36).substr(2, 12)}`
    });
    setIsAddOpen(true);
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 pb-20 text-left px-2 sm:px-0">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Button asChild variant="ghost" size="sm" className="h-8 p-0 hover:bg-transparent">
              <Link href="/settings" className="text-muted-foreground hover:text-primary flex items-center gap-1 group">
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> 
                <span className="text-[10px] font-black uppercase tracking-widest">OS Settings</span>
              </Link>
            </Button>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 leading-none uppercase">Payment Hub</h2>
          <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Settlement Gateways & Nodes</p>
        </div>
        <Button onClick={() => { setFormData({ id: "", name: "", provider: "STRIPE", type: "CARD", isActive: true, apiKey: "", apiSecret: "", merchantId: "", webhookSecret: `whs_${Math.random().toString(36).substr(2, 12)}` }); setIsAddOpen(true); }} className="bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
          <Plus className="mr-2 h-4 w-4" /> Add Payment Node
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gateways?.length === 0 ? (
              <Card className="col-span-full border-2 border-dashed p-12 text-center bg-white rounded-[2.5rem] opacity-30">
                <CreditCard className="h-12 w-12 mx-auto mb-4" />
                <p className="text-sm font-black uppercase tracking-widest">No Active Methods</p>
                <p className="text-[10px] mt-2 font-bold">Configure a gateway to start accepting digital payments.</p>
              </Card>
            ) : (
              gateways?.map((gw) => {
                const typeInfo = GATEWAY_TYPES.find(t => t.id === gw.provider) || GATEWAY_TYPES[0];
                return (
                  <Card key={gw.id} className={cn(
                    "border-none shadow-md bg-white rounded-[2rem] overflow-hidden group hover:shadow-xl transition-all border",
                    !gw.isActive && "opacity-60 grayscale"
                  )}>
                    <CardHeader className="p-6 bg-muted/20 border-b flex flex-row items-center justify-between">
                      <div className="flex items-center gap-4 text-left">
                        <div className={cn("h-10 w-10 rounded-xl bg-white border shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform", typeInfo.color)}>
                          <typeInfo.icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{gw.name}</p>
                          <Badge variant="outline" className="text-[8px] h-4 px-1.5 uppercase font-black border-primary/20 text-primary">{gw.provider}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-primary" onClick={() => handleEdit(gw)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive" onClick={() => handleDelete(gw.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn("h-1.5 w-1.5 rounded-full", gw.isActive ? "bg-green-500 animate-pulse" : "bg-muted")} />
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{gw.isActive ? "NODE LIVE" : "INACTIVE"}</span>
                        </div>
                        <Lock className="h-3.5 w-3.5 text-muted-foreground opacity-20" />
                    </CardContent>
                  </Card>
                );
              })
            )}
          </section>

          {gateways?.some((g:any) => g.provider === 'RAZORPAY') && (
            <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden border">
              <CardHeader className="p-8 pb-4 border-b border-white/5 flex flex-row items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                      <Terminal className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold uppercase tracking-tight">Webhook Node Hub</CardTitle>
                      <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Reliable Settlement Safety Net</p>
                    </div>
                 </div>
                 <Badge className="bg-green-500 text-white border-none text-[8px] font-black h-5 uppercase">Ready to Sync</Badge>
              </CardHeader>
              <CardContent className="p-8 space-y-10">
                 <div className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                       <div className="space-y-1 text-left">
                         <p className="text-[10px] font-black uppercase text-accent tracking-widest leading-none">Global Callback Endpoint</p>
                         <p className="text-[8px] text-slate-400 font-bold uppercase">Configure this in Razorpay &gt; Settings &gt; Webhooks</p>
                       </div>
                       <Button variant="outline" size="sm" className="h-8 rounded-lg text-[8px] font-black uppercase bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={handleCopyWebhook}>
                         {isCopied ? <Check className="mr-1.5 h-3 w-3 text-green-400" /> : <Copy className="mr-1.5 h-3 w-3" />} Copy URL
                       </Button>
                    </div>
                    <div className="p-4 bg-black/30 rounded-xl border border-white/5 text-[10px] font-mono text-slate-300 truncate shadow-inner">{webhookUrl}</div>
                 </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-4 space-y-8 text-left">
           <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden group text-left">
              <CardContent className="p-8 space-y-8">
                 <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner group-hover:scale-110 transition-transform">
                   <ShieldCheck className="h-8 w-8 text-accent fill-accent" />
                 </div>
                 <div className="space-y-3">
                    <h3 className="text-xl font-bold uppercase tracking-tight">Encrypted Payouts</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                      All gateway credentials are encrypted with 256-bit AES at the node level. Secrets are isolated server-side.
                    </p>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden text-left w-[95vw]">
          <DialogHeader className="p-8 bg-primary text-white text-left shrink-0">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight">{formData.id ? 'Modify Node' : 'New Gateway Node'}</DialogTitle>
                <DialogDescription className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-1">Configure digital settlement logic</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Select Provider Node</Label>
              <Select value={formData.provider} onValueChange={(v) => setFormData({...formData, provider: v})}>
                <SelectTrigger className="h-12 rounded-xl border-none bg-muted/20 shadow-inner font-black text-xs uppercase text-left"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  {GATEWAY_TYPES.map(t => <SelectItem key={t.id} value={t.id} className="text-xs font-bold uppercase">{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Friendly Node Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Primary Razorpay" className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner" />
            </div>
            {formData.provider !== 'MANUAL' && (
              <div className="space-y-6 pt-4">
                <Separator className="opacity-40" />
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-2"><Key className="h-3 w-3" /> API Public Key</Label>
                  <Input value={formData.apiKey} onChange={(e) => setFormData({...formData, apiKey: e.target.value})} placeholder="rzp_live_..." className="h-12 rounded-xl font-mono text-xs bg-muted/20 border-none shadow-inner" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-2"><Lock className="h-3 w-3" /> API Secret Key</Label>
                  <Input type="password" value={formData.apiSecret} onChange={(e) => setFormData({...formData, apiSecret: e.target.value})} placeholder="••••••••" className="h-12 rounded-xl font-mono text-xs bg-muted/20 border-none shadow-inner" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="p-8 bg-muted/10 border-t flex-row gap-3">
            <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold uppercase text-[10px]" onClick={() => setIsAddOpen(false)}>Discard</Button>
            <Button className="flex-1 h-14 bg-primary font-black uppercase shadow-xl rounded-2xl text-[10px] tracking-widest text-white" onClick={handleSave}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Deploy Node
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
