"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/firebase";
import { toast } from "@/hooks/use-toast";
import {
  GSP_PROVIDER_PRESETS,
  getGspIntegrationGuide,
  type GspEnvironment,
  type GspProviderId,
  type PublicEWayApiConfig,
} from "@/lib/eway-bill";

interface EWayGspConfigPanelProps {
  businessId: string;
  business: any;
  isAdmin: boolean;
  isTrialExpired?: boolean;
  onSaved?: (config: PublicEWayApiConfig) => void;
}

export function EWayGspConfigPanel({
  businessId,
  business,
  isAdmin,
  isTrialExpired = false,
  onSaved,
}: EWayGspConfigPanelProps) {
  const { user } = useUser();

  const existingPublic = (business?.ewayApiConfig || {}) as Partial<PublicEWayApiConfig>;

  const [provider, setProvider] = useState<GspProviderId>(
    existingPublic.provider || "mastergst"
  );
  const [environment, setEnvironment] = useState<GspEnvironment>(
    existingPublic.environment || "sandbox"
  );
  const [gstin, setGstin] = useState(existingPublic.gstin || business?.gstin || "");
  const [gstUsername, setGstUsername] = useState(existingPublic.gstUsername || "");
  const [gstPassword, setGstPassword] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [customAuthUrl, setCustomAuthUrl] = useState(existingPublic.customAuthUrl || "");
  const [customBaseUrl, setCustomBaseUrl] = useState(existingPublic.customBaseUrl || "");

  const [serverConfig, setServerConfig] = useState<Partial<PublicEWayApiConfig>>(existingPublic);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showGuide, setShowGuide] = useState(!existingPublic.isConfigured);

  useEffect(() => {
    if (!businessId || !user) return;
    let active = true;
    const loadConfig = async () => {
      setIsLoadingStatus(true);
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
          setServerConfig(data.config);
          setProvider(data.config.provider || "mastergst");
          setEnvironment(data.config.environment || "sandbox");
          setGstin(data.config.gstin || business?.gstin || "");
          setGstUsername(data.config.gstUsername || "");
          setCustomAuthUrl(data.config.customAuthUrl || "");
          setCustomBaseUrl(data.config.customBaseUrl || "");
        }
      } catch {
        // Silently fall back to public metadata from business doc
      } finally {
        if (active) setIsLoadingStatus(false);
      }
    };
    loadConfig();
    return () => {
      active = false;
    };
  }, [businessId, user, business?.gstin]);

  const preset = GSP_PROVIDER_PRESETS[provider];
  const guide = getGspIntegrationGuide(provider);
  const isClearTax = provider === "cleartax";
  const isCustom = provider === "custom";
  const isConfigured = Boolean(serverConfig.isConfigured || existingPublic.isConfigured);

  const handleSave = async (testHandshake: boolean) => {
    if (!businessId || !user || !isAdmin || isTrialExpired) return;
    setErrorMsg("");
    if (testHandshake) setIsTesting(true);
    else setIsSaving(true);

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
          environment,
          gstin: gstin.trim().toUpperCase(),
          gstUsername: gstUsername.trim(),
          gstPassword: gstPassword.trim(),
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
          apiKey: apiKey.trim(),
          customAuthUrl: customAuthUrl.trim(),
          customBaseUrl: customBaseUrl.trim(),
          testHandshake,
        }),
      });
      const data = await res.json();
      if (data?.config) {
        setServerConfig(data.config);
      }

      if (!res.ok || !data?.success) {
        const msg = data?.message || "Failed to save GSP API settings.";
        setErrorMsg(msg);
        toast({
          variant: "destructive",
          title: testHandshake ? "GSP Auth Check Failed" : "GSP Configuration Error",
          description: msg,
        });
        return;
      }

      // Clear write-only secret inputs from browser memory once saved
      setGstPassword("");
      setClientId("");
      setClientSecret("");
      setApiKey("");

      toast({
        title: testHandshake ? "GSP Connected & Verified" : "GSP Credentials Saved",
        description: data.message,
      });
      if (data.config && onSaved) {
        onSaved(data.config);
      }
    } catch (err: any) {
      const msg = err?.message || "Network error while saving GSP settings.";
      setErrorMsg(msg);
      toast({ variant: "destructive", title: "Request Failed", description: msg });
    } finally {
      setIsSaving(false);
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!businessId || !user || !isAdmin || isTrialExpired) return;
    setIsRemoving(true);
    setErrorMsg("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/eway-bill/config?businessId=${encodeURIComponent(businessId)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Could not clear GSP credentials.");
      }
      setServerConfig({ isConfigured: false, provider, environment });
      toast({ title: "GSP API Disconnected", description: "NIC JSON export remains active." });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Disconnect Failed",
        description: err?.message || "Please try again.",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div
      id="eway-gsp-config"
      className="rounded-2xl border border-slate-200 bg-white overflow-hidden text-left"
    >
      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Live E-Way Bill GSP API Integration
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate 12-digit EWB, update Part-B vehicle, or cancel directly via NIC GSP.
            </p>
          </div>
        </div>

        <div className="text-xs font-medium text-slate-600 flex flex-wrap items-center gap-3 shrink-0">
          {isLoadingStatus ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
          ) : isConfigured ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Connected · {GSP_PROVIDER_PRESETS[provider]?.label.split(" ")[0]} ({environment})
            </span>
          ) : (
            <span className="text-amber-700 font-semibold">Not Configured (JSON Export Only)</span>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={showGuide}
            onClick={() => setShowGuide((prev) => !prev)}
            className="h-8 px-3 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            <BookOpen className="mr-1.5 h-3.5 w-3.5 text-primary" />
            {showGuide ? "Hide Setup Guide" : "Setup Guide"}
            {showGuide ? (
              <ChevronUp className="ml-1.5 h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="ml-1.5 h-3.5 w-3.5 text-slate-400" />
            )}
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {showGuide && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Admin Integration Guide — {guide.providerName}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Required: {guide.requiredCredentials.join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <a
                  href={guide.nicPortalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  NIC EWB Portal
                  <ExternalLink className="h-3 w-3" />
                </a>
                {guide.portalUrl !== guide.nicPortalUrl && (
                  <a
                    href={guide.portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    {guide.portalLabel}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {guide.steps.map((step) => (
                <div key={step.stepNumber} className="space-y-1">
                  <p className="text-xs font-bold text-slate-900">
                    <span className="font-mono text-primary mr-1.5">{step.stepNumber}.</span>
                    {step.title}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.detail}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-3 space-y-1.5">
              <p className="text-xs font-semibold text-slate-800">
                Pre-Flight Checklist (Go-Live se pehle verify karein)
              </p>
              <ul className="space-y-1 text-xs text-slate-600 list-disc pl-4">
                {guide.checklist.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">GSP Provider</Label>
            <Select
              value={provider}
              onValueChange={(v: GspProviderId) => setProvider(v)}
              disabled={!isAdmin || isTrialExpired}
            >
              <SelectTrigger className="h-9 text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[300]">
                {Object.entries(GSP_PROVIDER_PRESETS).map(([id, item]) => (
                  <SelectItem key={id} value={id} className="text-xs">
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Environment</Label>
            <Select
              value={environment}
              onValueChange={(v: GspEnvironment) => setEnvironment(v)}
              disabled={!isAdmin || isTrialExpired}
            >
              <SelectTrigger className="h-9 text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[300]">
                <SelectItem value="sandbox" className="text-xs">
                  Sandbox / Testing
                </SelectItem>
                <SelectItem value="production" className="text-xs">
                  Production (Live NIC)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Business GSTIN</Label>
            <Input
              maxLength={15}
              value={gstin}
              disabled={!isAdmin || isTrialExpired}
              onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="27AABCU9603R1ZM"
              className="h-9 font-mono uppercase text-xs"
            />
          </div>
        </div>

        <p className="text-xs text-slate-500">{preset?.description}</p>

        {isClearTax ? (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              ClearTax Auth Token (Write-only)
            </Label>
            <Input
              type="password"
              disabled={!isAdmin || isTrialExpired}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                serverConfig.hasApiKey
                  ? "•••••••••••• (Stored securely — paste only to replace)"
                  : "Paste x-cleartax-auth-token"
              }
              className="h-9 font-mono text-xs"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                NIC / EWB Portal API Username
              </Label>
              <Input
                disabled={!isAdmin || isTrialExpired}
                value={gstUsername}
                onChange={(e) => setGstUsername(e.target.value)}
                placeholder="e.g. API_USER_01"
                className="h-9 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                NIC / EWB Portal API Password
              </Label>
              <Input
                type="password"
                disabled={!isAdmin || isTrialExpired}
                value={gstPassword}
                onChange={(e) => setGstPassword(e.target.value)}
                placeholder={
                  serverConfig.hasPassword
                    ? "•••••••••••• (Stored — leave blank to keep)"
                    : "Enter EWB API sub-user password"
                }
                className="h-9 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">GSP Client ID</Label>
              <Input
                type="password"
                disabled={!isAdmin || isTrialExpired}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder={
                  serverConfig.hasClientId
                    ? "•••••••••••• (Stored — leave blank to keep)"
                    : "Enter GSP Client ID"
                }
                className="h-9 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">GSP Client Secret</Label>
              <Input
                type="password"
                disabled={!isAdmin || isTrialExpired}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={
                  serverConfig.hasClientSecret
                    ? "•••••••••••• (Stored — leave blank to keep)"
                    : "Enter GSP Client Secret"
                }
                className="h-9 font-mono text-xs"
              />
            </div>
          </div>
        )}

        {(isCustom || customAuthUrl || customBaseUrl) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Custom Auth URL (Optional Override)
              </Label>
              <Input
                disabled={!isAdmin || isTrialExpired}
                value={customAuthUrl}
                onChange={(e) => setCustomAuthUrl(e.target.value)}
                placeholder="https://gsp.example.in/v1.03/authenticate"
                className="h-9 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Custom EWB Base URL (Optional Override)
              </Label>
              <Input
                disabled={!isAdmin || isTrialExpired}
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
                placeholder="https://gsp.example.in/v1.03/ewayapi"
                className="h-9 font-mono text-xs"
              />
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 pt-1">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
            Secrets are write-only and stored server-side inside privateConfig.
          </span>
          {serverConfig.lastTestedAt && (
            <span className="font-mono text-[11px] text-slate-500">
              {serverConfig.lastStatusMessage || "Last check recorded"}
            </span>
          )}
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div>
              {isConfigured && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isRemoving || isSaving || isTesting || isTrialExpired}
                  onClick={handleDisconnect}
                  className="h-9 px-3 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {isRemoving ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Disconnect
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving || isTesting || isTrialExpired}
                onClick={() => handleSave(true)}
                className="h-9 px-4 rounded-lg border-slate-200 text-xs font-semibold text-slate-800"
              >
                {isTesting ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <KeyRound className="mr-1.5 h-3.5 w-3.5 text-primary" />
                )}
                Test &amp; Save Auth
              </Button>
              <Button
                type="button"
                disabled={isSaving || isTesting || isTrialExpired}
                onClick={() => handleSave(false)}
                className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-xs font-semibold text-white"
              >
                {isSaving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                )}
                Save Credentials
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface EWayGspConfigModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  business: any;
  isAdmin: boolean;
  onSaved?: (config: PublicEWayApiConfig) => void;
}

export function EWayGspConfigModal({
  isOpen,
  onOpenChange,
  businessId,
  business,
  isAdmin,
  onSaved,
}: EWayGspConfigModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[740px] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <DialogHeader className="sr-only">
          <DialogTitle>Live E-Way Bill GSP API Configuration</DialogTitle>
          <DialogDescription>
            Configure your GSP provider credentials for 1-click live E-Way Bill generation.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0">
          <EWayGspConfigPanel
            businessId={businessId}
            business={business}
            isAdmin={isAdmin}
            onSaved={(cfg) => {
              onSaved?.(cfg);
              onOpenChange(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
