"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  Zap,
  Loader2,
  Lock,
  Wallet,
  Coins,
  Globe,
  Key,
  SmartphoneNfc,
  Copy,
  Check,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  PageHeader,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import {
  useFirestore,
  useMemoFirebase,
  useUser,
  useDoc,
  setDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase";
import { doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { listGatewayMetadata } from "@/app/actions/p0-migration";

const GATEWAY_TYPES = [
  { id: "STRIPE", name: "Stripe", icon: Globe, color: "text-indigo-600" },
  { id: "RAZORPAY", name: "Razorpay (India)", icon: Zap, color: "text-blue-600" },
  { id: "PAYTM", name: "Paytm Business", icon: Wallet, color: "text-cyan-600" },
  {
    id: "UPI",
    name: "Direct UPI / QR",
    icon: SmartphoneNfc,
    color: "text-emerald-600",
  },
  { id: "MANUAL", name: "Manual / Cash", icon: Coins, color: "text-slate-600" },
];

export default function PaymentGatewaysPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const [gateways, setGateways] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    webhookSecret: `whs_${Math.random().toString(36).substr(2, 12)}`,
  });

  const [isCopied, setIsCopied] = useState(false);

  const webhookUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/api/webhook/razorpay?bId=${businessId}`;
  }, [businessId]);

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast({
      title: "Endpoint Copied",
      description: "Paste this in Razorpay Webhook settings.",
    });
  };

  const handleSave = async () => {
    if (!businessId || !formData.name || !business) return;
    const configId = formData.id || `gw_${Date.now()}`;
    const docRef = doc(
      firestore,
      "businesses",
      businessId,
      "paymentGatewayConfigs",
      configId
    );

    const privateRef = doc(
      firestore,
      "businesses",
      businessId,
      "privateConfig",
      "gateways"
    );
    setDocumentNonBlocking(
      privateRef,
      {
        [configId]: { apiSecret: formData.apiSecret },
      },
      { merge: true }
    );

    const { apiSecret, ...publicData } = formData;

    setDocumentNonBlocking(
      docRef,
      {
        ...publicData,
        id: configId,
        businessId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    setIsAddOpen(false);
    toast({
      title: "Gateway Configured",
      description: `${formData.name} is now ready for settlements.`,
    });
    fetchGateways();
  };

  const handleDelete = (id: string) => {
    if (!businessId) return;
    deleteDocumentNonBlocking(
      doc(firestore, "businesses", businessId, "paymentGatewayConfigs", id)
    );
    toast({ title: "Gateway Removed", variant: "destructive" });
    setGateways((prev) => prev.filter((g) => g.id !== id));
  };

  const handleEdit = (gw: any) => {
    setFormData({
      id: gw.id,
      name: gw.name || "",
      provider: gw.provider || "STRIPE",
      type: gw.type || "CARD",
      isActive: gw.isActive !== false,
      apiKey: gw.apiKey || "",
      apiSecret: "",
      merchantId: gw.merchantId || "",
      webhookSecret:
        gw.webhookSecret || `whs_${Math.random().toString(36).substr(2, 12)}`,
    });
    setIsAddOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900 mb-3" />
        <p className="text-xs font-medium">Loading payment gateways...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 text-left">
      <PageHeader
        title="Payment Gateways"
        description="Configure online checkout providers and automated settlement webhooks."
        breadcrumb="Settings · Payments · Gateways"
        backHref="/settings?tab=payments"
        backLabel="Back to Payment Settings"
        actions={
          <Button
            type="button"
            onClick={() => {
              setFormData({
                id: "",
                name: "",
                provider: "STRIPE",
                type: "CARD",
                isActive: true,
                apiKey: "",
                apiSecret: "",
                merchantId: "",
                webhookSecret: `whs_${Math.random().toString(36).substr(2, 12)}`,
              });
              setIsAddOpen(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 h-10 px-5 text-xs font-semibold rounded-xl text-white whitespace-nowrap shrink-0"
          >
            <Plus className="mr-2 h-3.5 w-3.5" /> Add Payment Gateway
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          {gateways?.length === 0 ? (
            <EmptyStatePanel
              icon={CreditCard}
              title="No active payment gateways"
              description="Connect Stripe, Razorpay, Paytm, or Direct UPI to collect online payments from invoices and payment links."
              action={
                <Button
                  type="button"
                  onClick={() => setIsAddOpen(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-5 rounded-xl text-xs font-semibold"
                >
                  <Plus className="mr-2 h-3.5 w-3.5" /> Add Gateway
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gateways?.map((gw) => {
                const typeInfo =
                  GATEWAY_TYPES.find((t) => t.id === gw.provider) ||
                  GATEWAY_TYPES[0];
                return (
                  <div
                    key={gw.id}
                    className={cn(
                      "rounded-2xl border border-slate-200 bg-white overflow-hidden transition-colors",
                      !gw.isActive && "opacity-60"
                    )}
                  >
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "h-10 w-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0",
                            typeInfo.color
                          )}
                        >
                          <typeInfo.icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {gw.name}
                          </p>
                          <p className="text-xs font-mono text-slate-500">
                            {gw.provider}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${gw.name}`}
                          className="h-8 w-8 rounded-lg text-slate-600 hover:text-slate-900"
                          onClick={() => handleEdit(gw)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${gw.name}`}
                          className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => handleDelete(gw.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="px-5 py-3.5 flex items-center justify-between text-xs">
                      <span
                        className={cn(
                          "font-semibold",
                          gw.isActive ? "text-emerald-700" : "text-slate-500"
                        )}
                      >
                        {gw.isActive ? "Active · Ready" : "Inactive"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Lock className="h-3.5 w-3.5" /> Encrypted
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {gateways?.some((g: any) => g.provider === "RAZORPAY") && (
            <SectionCard
              title="Razorpay Webhook Endpoint"
              description="Configure this callback URL in Razorpay Settings > Webhooks for automatic settlement sync."
              headerRight={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg text-xs font-semibold border-slate-200"
                  onClick={handleCopyWebhook}
                >
                  {isCopied ? (
                    <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {isCopied ? "Copied" : "Copy URL"}
                </Button>
              }
            >
              <div className="flex items-center gap-3 p-3.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs overflow-x-auto">
                <Terminal className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="truncate">{webhookUrl}</span>
              </div>
            </SectionCard>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl bg-slate-900 text-white p-6 space-y-4">
            <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Isolated Secret Vault</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                API secrets are stored in a write-only server vault isolated from client reads. Only public gateway identifiers are shown in the dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl border-slate-200 p-0 overflow-hidden text-left w-[95vw]">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  {formData.id ? "Edit Payment Gateway" : "Add Payment Gateway"}
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  Configure online settlement credentials
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Provider</Label>
              <Select
                value={formData.provider}
                onValueChange={(v) => setFormData({ ...formData, provider: v })}
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {GATEWAY_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs font-medium">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gw-name" className="text-xs font-semibold text-slate-700">
                Display Label
              </Label>
              <Input
                id="gw-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Primary Razorpay"
                className="h-11 rounded-xl bg-white border-slate-200 text-sm"
              />
            </div>

            {formData.provider !== "MANUAL" && (
              <div className="space-y-4 pt-2">
                <Separator className="bg-slate-100" />
                <div className="space-y-1.5">
                  <Label htmlFor="gw-key" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-slate-400" /> API Public Key
                  </Label>
                  <Input
                    id="gw-key"
                    value={formData.apiKey}
                    onChange={(e) =>
                      setFormData({ ...formData, apiKey: e.target.value })
                    }
                    placeholder="rzp_live_..."
                    className="h-11 rounded-xl font-mono text-xs bg-white border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gw-secret" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-slate-400" /> API Secret Key
                  </Label>
                  <Input
                    id="gw-secret"
                    type="password"
                    value={formData.apiSecret}
                    onChange={(e) =>
                      setFormData({ ...formData, apiSecret: e.target.value })
                    }
                    placeholder="••••••••"
                    className="h-11 rounded-xl font-mono text-xs bg-white border-slate-200"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200 flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-10 rounded-xl text-xs font-semibold"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs font-semibold text-white"
              onClick={handleSave}
            >
              <ShieldCheck className="mr-2 h-3.5 w-3.5" /> Save Gateway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
