"use client";

import { useState, useTransition } from "react";
import {
  Globe,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  Info,
  Loader2,
  Trash2,
  RefreshCcw,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import {
  updateCustomDomain,
  removeCustomDomain,
  verifyCustomDomain,
} from "@/app/actions/website-actions";
import { PageHeader, SectionCard } from "@/components/ui/editorial";

const EXPECTED_CNAME_TARGET = "cname.biztrix.in";

type DomainStatus = "pending" | "verified" | "failed" | "active";

export default function DomainSettingsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [domainInput, setDomainInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isVerifying, startVerifyTransition] = useTransition();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const websiteRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId, "websites", "main") : null),
    [firestore, businessId]
  );
  const { data: websiteData, isLoading: isWebsiteLoading } = useDoc<any>(websiteRef);

  const activeDomain = websiteData?.customDomain;
  const status: DomainStatus = websiteData?.customDomainStatus || "pending";
  const verifiedAt = websiteData?.customDomainVerifiedAt;
  const lastCheckedAt = websiteData?.customDomainLastCheckedAt;
  const verificationError = websiteData?.customDomainVerificationError;

  const isVerified = status === "verified" || status === "active";

  const handleConnect = () => {
    if (!businessId) return;
    startTransition(async () => {
      const idToken = user ? await user.getIdToken() : undefined;
      const result = await updateCustomDomain({ businessId, domain: domainInput, idToken });
      if (result.success) {
        toast({ title: "Success", description: result.message });
        setDomainInput("");
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  const handleVerify = () => {
    if (!businessId) return;
    startVerifyTransition(async () => {
      const idToken = user ? await user.getIdToken() : undefined;
      const result = await verifyCustomDomain({ idToken, businessId });
      if (result.success) {
        toast({
          title: "Domain Verified",
          description:
            result.message ||
            "Your custom domain is verified and activated for production routing.",
        });
      } else {
        toast({
          title: "Verification Incomplete",
          description: result.message || "DNS lookup could not verify the CNAME record.",
          variant: "destructive",
        });
      }
    });
  };

  const executeRemoveDomain = () => {
    if (!businessId) return;
    startTransition(async () => {
      const idToken = user ? await user.getIdToken() : undefined;
      const result = await removeCustomDomain({ businessId, idToken });
      if (result.success) {
        toast({ title: "Domain Unlinked", description: result.message });
        setRemoveConfirmOpen(false);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({ title: "Copied", description: `${key} value copied to clipboard.` });
  };

  if (isWebsiteLoading) {
    return (
      <div className="flex items-center justify-center py-20 opacity-50">
        <Loader2 className="animate-spin text-slate-700 h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 text-left">
      <PageHeader
        breadcrumb="Store Builder · Domains"
        title="Custom Domain Hub"
        description="Connect and verify your custom brand domain for live storefront traffic."
        backHref="/website"
        backLabel="Back to Store Builder"
        icon={Globe}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          {!activeDomain ? (
            <SectionCard
              title="1. Link Custom Domain"
              description="Point your storefront URL to a domain or subdomain you own."
            >
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-slate-700">
                  Target Domain Name
                </Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="e.g. www.yourbrand.com or shop.yourbrand.com"
                    className="h-11 rounded-xl border-slate-200 bg-white font-mono text-sm"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value.toLowerCase())}
                  />
                  <Button
                    type="button"
                    className="h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shrink-0"
                    disabled={isPending || !domainInput.trim()}
                    onClick={handleConnect}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Connect Domain"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Supports root domains or subdomains (e.g. shop.yourbrand.com or
                  www.yourbrand.com).
                </p>
              </div>
            </SectionCard>
          ) : (
            <SectionCard
              title={activeDomain}
              description="Custom Domain Status"
              headerRight={
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-semibold px-2.5 py-0.5 flex items-center gap-1.5",
                    status === "pending" && "bg-amber-50 text-amber-800 border-amber-200",
                    isVerified && "bg-emerald-50 text-emerald-800 border-emerald-200",
                    status === "failed" && "bg-rose-50 text-rose-800 border-rose-200"
                  )}
                >
                  {isVerified ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                    </>
                  ) : status === "failed" ? (
                    <>
                      <AlertCircle className="h-3.5 w-3.5" /> Failed
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5" /> Pending DNS
                    </>
                  )}
                </Badge>
              }
            >
              {isVerified ? (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center py-4 text-center space-y-3">
                    <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                      <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-slate-900">
                        Domain Verified & Active
                      </h3>
                      <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                        DNS records are verified. Storefront requests to{" "}
                        <span className="font-mono font-semibold text-slate-900">
                          {activeDomain}
                        </span>{" "}
                        resolve to your catalog.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Verification State</span>
                      <span className="font-semibold text-emerald-700">Production Ready</span>
                    </div>
                    {verifiedAt && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Verified At</span>
                        <span className="font-mono tabular-nums text-slate-700">
                          {new Date(verifiedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {lastCheckedAt && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Last DNS Check</span>
                        <span className="font-mono tabular-nums text-slate-500">
                          {new Date(lastCheckedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Target Endpoint</span>
                      <code className="font-mono font-semibold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-900">
                        {EXPECTED_CNAME_TARGET}
                      </code>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-10 rounded-xl font-semibold text-xs border-slate-200"
                      onClick={handleVerify}
                      disabled={isVerifying || isPending}
                    >
                      {isVerifying ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="mr-2 h-4 w-4" />
                      )}
                      Re-check DNS
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-10 rounded-xl font-semibold text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={() => setRemoveConfirmOpen(true)}
                      disabled={isPending || isVerifying}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Remove Domain
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {status === "failed" ? (
                    <Alert className="bg-rose-50 border-rose-200 rounded-xl p-4">
                      <AlertCircle className="h-4 w-4 text-rose-600" />
                      <div className="ml-2">
                        <AlertTitle className="text-sm font-bold text-rose-900">
                          DNS Verification Failed
                        </AlertTitle>
                        <AlertDescription className="text-xs text-rose-800 leading-relaxed mt-1">
                          {verificationError ||
                            "CNAME lookup failed. Confirm the DNS record has been created and propagated."}
                        </AlertDescription>
                        {lastCheckedAt && (
                          <p className="text-xs font-mono text-rose-600 mt-1.5">
                            Last checked: {new Date(lastCheckedAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </Alert>
                  ) : (
                    <Alert className="bg-amber-50 border-amber-200 rounded-xl p-4">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <div className="ml-2">
                        <AlertTitle className="text-sm font-bold text-amber-900">
                          DNS Handshake Required
                        </AlertTitle>
                        <AlertDescription className="text-xs text-amber-800 leading-relaxed mt-1">
                          Update your DNS records at your domain registrar (Hostinger,
                          GoDaddy, Cloudflare, etc.) using the values below, then click
                          Verify DNS Record.
                        </AlertDescription>
                        {lastCheckedAt && (
                          <p className="text-xs font-mono text-amber-700 mt-1.5">
                            Last checked: {new Date(lastCheckedAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </Alert>
                  )}

                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-700">
                      2. Required DNS Records
                    </h4>

                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                      <div className="bg-slate-100 px-4 py-2.5 grid grid-cols-4 text-xs font-semibold text-slate-600 border-b border-slate-200">
                        <div className="col-span-1">Type</div>
                        <div className="col-span-1">Host</div>
                        <div className="col-span-2 text-right">Value</div>
                      </div>

                      <div className="p-4 grid grid-cols-4 items-center gap-3 text-xs border-b border-slate-200 bg-white">
                        <div className="col-span-1 font-semibold text-slate-900">
                          CNAME <span className="text-slate-500 font-normal">(Req)</span>
                        </div>
                        <div className="col-span-1 font-mono font-semibold text-slate-900">
                          {activeDomain.startsWith("www.")
                            ? "www"
                            : activeDomain.split(".")[0]}
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <code className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-900">
                            {EXPECTED_CNAME_TARGET}
                          </code>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Copy CNAME target"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => copyToClipboard(EXPECTED_CNAME_TARGET, "CNAME")}
                          >
                            {copiedKey === "CNAME" ? (
                              <Check className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="p-4 grid grid-cols-4 items-center gap-3 text-xs bg-white">
                        <div className="col-span-1 font-semibold text-slate-900">
                          ALIAS <span className="text-slate-500 font-normal">(Root @)</span>
                        </div>
                        <div className="col-span-1 font-mono font-semibold text-slate-900">@</div>
                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <code className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-900">
                            {EXPECTED_CNAME_TARGET}
                          </code>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Copy ALIAS target"
                            className="h-8 w-8 rounded-lg"
                            onClick={() =>
                              copyToClipboard(EXPECTED_CNAME_TARGET, "ALIAS Target")
                            }
                          >
                            {copiedKey === "ALIAS Target" ? (
                              <Check className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      Using Cloudflare, Route53, or Namecheap? Enable CNAME Flattening on{" "}
                      <code className="font-mono text-slate-900">@</code> pointing to{" "}
                      <code className="font-mono text-slate-900">{EXPECTED_CNAME_TARGET}</code>
                      , or forward <code className="font-mono">@</code> to{" "}
                      <code className="font-mono">
                        www.{activeDomain.replace(/^www\./, "")}
                      </code>
                      .
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      type="button"
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs h-11 rounded-xl"
                      onClick={handleVerify}
                      disabled={isVerifying || isPending}
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying DNS...
                        </>
                      ) : (
                        <>
                          <RefreshCcw className="mr-2 h-4 w-4" />
                          {status === "failed" ? "Retry Verification" : "Verify DNS Record"}
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-11 rounded-xl font-semibold text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={() => setRemoveConfirmOpen(true)}
                      disabled={isPending || isVerifying}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Remove Domain
                    </Button>
                  </div>
                </div>
              )}
            </SectionCard>
          )}
        </div>

        <div className="lg:col-span-5 space-y-6">
          <SectionCard
            title="Integration Roadmap"
            headerRight={<Info className="h-4 w-4 text-slate-400" />}
          >
            <div className="space-y-5">
              <div className="flex gap-3.5">
                <div className="h-7 w-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 flex items-center justify-center text-xs font-mono font-semibold shrink-0">
                  1
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">Register Domain</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Enter your domain to link it to your business storefront in the registry.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5">
                <div className="h-7 w-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 flex items-center justify-center text-xs font-mono font-semibold shrink-0">
                  2
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">Update DNS Registry</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Add the required CNAME record pointing to{" "}
                    <span className="font-mono text-slate-900">{EXPECTED_CNAME_TARGET}</span>{" "}
                    at your registrar.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5">
                <div className="h-7 w-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 flex items-center justify-center text-xs font-mono font-semibold shrink-0">
                  3
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    Production Routing & SSL
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Server-side verification confirms DNS ownership before routing storefront
                    traffic over SSL.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <h5 className="text-xs font-semibold text-white">Verified Domain Routing</h5>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Only verified custom domains serve production storefront traffic with strict
                  cross-tenant isolation.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Activation & Propagation Timeline"
            headerRight={<Clock className="h-4 w-4 text-primary" />}
          >
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <Zap className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Platform Subdomain</span>
                  </div>
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-mono text-[10px]">
                    Instant ~ 30 mins
                  </Badge>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  <strong>In-App / Direct Store Link:</strong> Active immediately (0 seconds).<br />
                  <strong>Global Internet Subdomain (*.biztrix.in):</strong> Takes <strong>10 to 30 minutes</strong> for worldwide ISP DNS caches (Jio, Airtel, Google DNS) to refresh.
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-blue-900">
                    <Globe className="h-3.5 w-3.5 text-blue-600" />
                    <span>Custom Domain (CNAME)</span>
                  </div>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 font-mono text-[10px]">
                    15 mins ~ 24 hrs
                  </Badge>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  <strong>DNS Propagation:</strong> Typically resolves within <strong>15 to 30 minutes</strong> on Cloudflare/GoDaddy, or up to 24 hours depending on registrar TTL settings.<br />
                  <strong>Automatic SSL (HTTPS):</strong> Auto-issued within <strong>5 to 15 minutes</strong> after DNS verification succeeds.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2 text-slate-600 text-[11px] leading-relaxed">
                <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Merchant Guarantee:</strong> DNS propagation ke dauran aapka business rukta nahi hai! Aap Storefront Manager se <strong>Open Live Store / App Preview</strong> link se turant live orders receive kar sakte hain.
                </span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <Dialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden text-left">
          <DialogHeader className="p-5 bg-slate-900 text-white text-left">
            <DialogTitle className="text-base font-bold text-white">
              Unlink Custom Domain?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 leading-relaxed">
              This will disconnect{" "}
              <span className="font-mono font-semibold text-white">{activeDomain}</span> from
              your storefront routing. Your store remains accessible via its default link.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemoveConfirmOpen(false)}
              className="rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={executeRemoveDomain}
              disabled={isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1.5" />
              )}
              Confirm Unlink
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
