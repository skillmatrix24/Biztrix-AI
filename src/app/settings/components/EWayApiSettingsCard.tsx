"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Shield, ShieldCheck, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/firebase";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  EWAY_GSP_PROVIDERS,
  type EWayApiMode,
  type EWayApiPublicConfig,
  type EWayGspProvider,
} from "@/lib/eway-bill";

interface EWayApiSettingsCardProps {
  businessId: string;
  businessGstin?: string;
  isAdmin: boolean;
}

export function EWayApiSettingsCard({
  businessId,
  businessGstin,
  isAdmin,
}: EWayApiSettingsCardProps) {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [provider, setProvider] = useState<EWayGspProvider>("sandbox");
  const [mode, setMode] = useState<EWayApiMode>("sandbox");
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [nicUsername, setNicUsername] = useState("");

  // Write-only secret inputs (never prefilled from server)
  const [nicPassword, setNicPassword] = useState("");
  const [gspClientId, setGspClientId] = useState("");
  const [gspClientSecret, setGspClientSecret] = useState("");
  const [apiKey, setApiKey] = useState("");

  const [savedStatus, setSavedStatus] = useState<EWayApiPublicConfig | null>(null);

  useEffect(() => {
    let active = true;
    async function loadConfig() {
      if (!businessId || !user) return;
      setIsLoading(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch(
          `/api/eway-bill/config?businessId=${encodeURIComponent(businessId)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (active && res.ok && data?.config) {
          const cfg = data.config as EWayApiPublicConfig;
          setSavedStatus(cfg);
          setProvider(cfg.provider || "sandbox");
          setMode(cfg.mode || "sandbox");
          setCustomEndpoint(cfg.customEndpoint || "");
          setNicUsername(cfg.nicUsername || "");
        }
      } catch (err) {
        console.error("Failed to fetch E-Way API config:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadConfig();
    return () => {
      active = false;
    };
  }, [businessId, user]);

  const selectedProviderMeta =
    EWAY_GSP_PROVIDERS.find((p) => p.id === provider) || EWAY_GSP_PROVIDERS[0];

  const handleSaveConfig = async () => {
    if (!businessId || !user || !isAdmin) return;
    setIsSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/eway-bill/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId,
          provider,
          mode: provider === "sandbox" ? "sandbox" : mode,
          customEndpoint,
          nicUsername,
          nicPassword,
          gspClientId,
          gspClientSecret,
          apiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to update E-Way API settings.");
      }

      setSavedStatus(data.config);
      setNicPassword("");
      setGspClientId("");
      setGspClientSecret("");
      setApiKey("");

      toast({
        title: "E-Way Bill API Configuration Saved",
        description: data.message,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Save GSP Config",
        description: error?.message || "Please verify your credentials and permissions.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border border-slate-200 shadow-sm bg-white rounded-[2rem] overflow-hidden text-left">
      <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-6 px-8 flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
            <Truck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-900">
              Live NIC / GSP E-Way Bill API
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              1-Click EWB Generation, Part-B Vehicle Update &amp; 24-Hour Cancel directly from Invoices
            </p>
          </div>
        </div>

        <span
          className={cn(
            "px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shrink-0",
            (provider === "sandbox" ? "sandbox" : mode) === "live"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          )}
        >
          {(provider === "sandbox" ? "sandbox" : mode) === "live"
            ? "Live GSTN Mode"
            : "Sandbox Mode"}
        </span>
      </CardHeader>

      <CardContent className="p-8 space-y-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Loading vaulted GSP integration status...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">
                  GSP / API Provider
                </Label>
                <Select
                  value={provider}
                  onValueChange={(v: EWayGspProvider) => {
                    setProvider(v);
                    if (v === "sandbox") setMode("sandbox");
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {EWAY_GSP_PROVIDERS.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs font-medium">
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {selectedProviderMeta.description}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">
                  Execution Mode
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("sandbox")}
                    className={cn(
                      "h-10 rounded-xl border text-xs font-semibold transition-colors",
                      mode === "sandbox" || provider === "sandbox"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    Sandbox Test
                  </button>
                  <button
                    type="button"
                    disabled={provider === "sandbox"}
                    onClick={() => setMode("live")}
                    className={cn(
                      "h-10 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-40",
                      mode === "live" && provider !== "sandbox"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    Live GSTN
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  {provider === "sandbox"
                    ? "Built-in Sandbox lets your team test live EWB workflows without paid GSP keys."
                    : mode === "live"
                      ? `Live requests use Supplier GSTIN (${businessGstin || "Not Set"}).`
                      : "Dry-run simulation mode enabled for this provider."}
                </p>
              </div>
            </div>

            {provider !== "sandbox" && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-slate-900">
                      Encrypted Server-Side Credentials Vault
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Stored write-only in Admin Private Vault
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      NIC API Sub-User Username
                    </Label>
                    <Input
                      value={nicUsername}
                      onChange={(e) => setNicUsername(e.target.value)}
                      placeholder="e.g. API_USER_01"
                      className="h-9 bg-white text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>NIC API Password</span>
                      {savedStatus?.hasPassword && (
                        <span className="text-[10px] font-mono text-emerald-700">Saved</span>
                      )}
                    </Label>
                    <Input
                      type="password"
                      value={nicPassword}
                      onChange={(e) => setNicPassword(e.target.value)}
                      placeholder={
                        savedStatus?.hasPassword
                          ? "Leave blank to keep saved password"
                          : "Enter NIC API password"
                      }
                      className="h-9 bg-white text-xs font-mono"
                    />
                  </div>

                  {(provider === "mastergst" || provider === "custom_rest") && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                          <span>GSP Client ID</span>
                          {savedStatus?.hasClientId && (
                            <span className="text-[10px] font-mono text-emerald-700">Saved</span>
                          )}
                        </Label>
                        <Input
                          type="password"
                          value={gspClientId}
                          onChange={(e) => setGspClientId(e.target.value)}
                          placeholder={
                            savedStatus?.hasClientId
                              ? "Leave blank to keep saved Client ID"
                              : "Enter GSP Client ID"
                          }
                          className="h-9 bg-white text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                          <span>GSP Client Secret</span>
                          {savedStatus?.hasClientSecret && (
                            <span className="text-[10px] font-mono text-emerald-700">Saved</span>
                          )}
                        </Label>
                        <Input
                          type="password"
                          value={gspClientSecret}
                          onChange={(e) => setGspClientSecret(e.target.value)}
                          placeholder={
                            savedStatus?.hasClientSecret
                              ? "Leave blank to keep saved Secret"
                              : "Enter GSP Client Secret"
                          }
                          className="h-9 bg-white text-xs font-mono"
                        />
                      </div>
                    </>
                  )}

                  {(provider === "cleartax" || provider === "custom_rest") && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                        <span>
                          {provider === "cleartax" ? "ClearTax Auth Token" : "API Key / Bearer Token"}
                        </span>
                        {savedStatus?.hasApiKey && (
                          <span className="text-[10px] font-mono text-emerald-700">Saved</span>
                        )}
                      </Label>
                      <Input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={
                          savedStatus?.hasApiKey
                            ? "Leave blank to keep saved Token"
                            : "Enter Auth Token / API Key"
                        }
                        className="h-9 bg-white text-xs font-mono"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700">
                      {provider === "custom_rest"
                        ? "Custom GSP Base Endpoint URL (Required)"
                        : "Override GSP Base URL (Optional)"}
                    </Label>
                    <Input
                      value={customEndpoint}
                      onChange={(e) => setCustomEndpoint(e.target.value)}
                      placeholder={
                        provider === "cleartax"
                          ? "https://api-einv.cleartax.in"
                          : provider === "mastergst"
                            ? "https://api.mastergst.com"
                            : "https://your-gsp-proxy.example.com/eway"
                      }
                      className="h-9 bg-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                {savedStatus?.isConfigured ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      Active Config: <strong className="uppercase">{savedStatus.provider}</strong> (
                      {savedStatus.mode.toUpperCase()})
                    </span>
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>Default built-in Sandbox active for immediate testing.</span>
                  </>
                )}
              </div>

              {isAdmin && (
                <Button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveConfig}
                  className="h-9 px-5 rounded-xl bg-primary hover:bg-primary/90 text-xs font-bold text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                      Save GSP Settings
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
