"use client";

import { useState } from "react";
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
  Globe,
  Key,
  Fingerprint,
  SmartphoneNfc,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { PageHeader, EmptyStatePanel } from "@/components/ui/editorial";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  setDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const GATEWAY_TYPES = [
  { id: "STRIPE", name: "Stripe", icon: Globe, color: "text-indigo-600" },
  {
    id: "RAZORPAY",
    name: "Razorpay (India)",
    icon: Zap,
    color: "text-sky-600",
  },
  { id: "PAYPAL", name: "PayPal", icon: Wallet, color: "text-blue-700" },
  {
    id: "PAYTM",
    name: "Paytm",
    icon: SmartphoneNfc,
    color: "text-cyan-600",
  },
];

export default function PlatformGatewaysPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const isPlatformOwner =
    user?.email?.toLowerCase() === "skillmatrix24@gmail.com";

  const gatewaysQuery = useMemoFirebase(
    () =>
      isPlatformOwner
        ? collection(firestore, "system", "config", "gateways")
        : null,
    [firestore, isPlatformOwner]
  );

  const { data: gateways, isLoading } = useCollection<any>(gatewaysQuery);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    provider: "STRIPE",
    isActive: true,
    apiKey: "",
    apiSecret: "",
    merchantId: "",
  });

  const handleSave = () => {
    if (!formData.name || !formData.id) {
      toast({
        variant: "destructive",
        title: "Missing Info",
        description: "ID and Name are required.",
      });
      return;
    }

    const docRef = doc(firestore, "system", "config", "gateways", formData.id);
    setDocumentNonBlocking(
      docRef,
      {
        ...formData,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    setIsAddOpen(false);
    toast({
      title: "Gateway Configured",
      description: `${formData.name} saved to platform gateways.`,
    });
  };

  const handleDelete = (id: string) => {
    deleteDocumentNonBlocking(
      doc(firestore, "system", "config", "gateways", id)
    );
    toast({ title: "Gateway Removed", variant: "destructive" });
  };

  const handleEdit = (gw: any) => {
    setFormData(gw);
    setIsAddOpen(true);
  };

  if (!isPlatformOwner) {
    return (
      <div className="max-w-lg mx-auto py-16">
        <EmptyStatePanel
          icon={ShieldCheck}
          title="Restricted Access"
          description="Only platform owners can manage global billing gateways."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin h-6 w-6 text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 text-left">
      <PageHeader
        title="Platform Gateways"
        description="Configure global payment processors used for marketplace subscriptions and SaaS billing."
        breadcrumb="Owner Console / Gateways"
        icon={CreditCard}
        actions={
          <Button
            onClick={() => {
              setFormData({
                id: `gw_${Date.now()}`,
                name: "",
                provider: "STRIPE",
                isActive: true,
                apiKey: "",
                apiSecret: "",
                merchantId: "",
              });
              setIsAddOpen(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 h-10 px-5 font-semibold text-xs rounded-xl text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Global Gateway
          </Button>
        }
      />

      {!gateways || gateways.length === 0 ? (
        <EmptyStatePanel
          icon={CreditCard}
          title="No Global Gateways Configured"
          description="Marketplace billing requires at least one active payment processor."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {gateways.map((gw) => {
            const typeInfo =
              GATEWAY_TYPES.find((t) => t.id === gw.provider) ||
              GATEWAY_TYPES[0];
            return (
              <div
                key={gw.id}
                className={cn(
                  "rounded-2xl border border-slate-200 bg-white overflow-hidden",
                  !gw.isActive && "opacity-65"
                )}
              >
                <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0",
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
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${gw.name}`}
                      className="h-8 w-8 rounded-lg text-slate-600 hover:text-slate-900"
                      onClick={() => handleEdit(gw)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${gw.name}`}
                      className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50"
                      onClick={() => handleDelete(gw.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-5 flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
                      gw.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {gw.isActive ? "Active" : "Inactive"}
                  </span>
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl border border-slate-200 p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <DialogTitle className="text-lg font-bold">
              Platform Gateway Configuration
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs mt-0.5">
              Configure API credentials for global subscription billing
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Gateway ID (Slug)
              </Label>
              <Input
                value={formData.id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    id: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                  })
                }
                placeholder="stripe_main"
                className="h-11 rounded-xl font-mono text-xs border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Provider
              </Label>
              <Select
                value={formData.provider}
                onValueChange={(v) => setFormData({ ...formData, provider: v })}
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  {GATEWAY_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Display Name
              </Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Primary SaaS Stripe"
                className="h-11 rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-4 border-t border-slate-200 pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-slate-400" /> API Key /
                  Publishable Key
                </Label>
                <Input
                  value={formData.apiKey}
                  onChange={(e) =>
                    setFormData({ ...formData, apiKey: e.target.value })
                  }
                  placeholder="pk_live_..."
                  className="h-11 rounded-xl font-mono text-xs border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-slate-400" /> API Secret /
                  Private Key
                </Label>
                <Input
                  type="password"
                  value={formData.apiSecret}
                  onChange={(e) =>
                    setFormData({ ...formData, apiSecret: e.target.value })
                  }
                  placeholder="sk_live_..."
                  className="h-11 rounded-xl font-mono text-xs border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Fingerprint className="h-3.5 w-3.5 text-slate-400" />{" "}
                  Merchant / Account ID
                </Label>
                <Input
                  value={formData.merchantId}
                  onChange={(e) =>
                    setFormData({ ...formData, merchantId: e.target.value })
                  }
                  placeholder="e.g. acct_12345"
                  className="h-11 rounded-xl font-mono text-xs border-slate-200"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <Label
                htmlFor="gateway-active"
                className="text-xs font-semibold text-slate-700"
              >
                Gateway Active
              </Label>
              <Switch
                id="gateway-active"
                checked={formData.isActive}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, isActive: v })
                }
              />
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-200 flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-xl text-xs font-semibold border-slate-200"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white"
              onClick={handleSave}
            >
              <ShieldCheck className="mr-1.5 h-4 w-4" /> Save Gateway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
