"use client";

import { useState, useTransition } from "react";
import { 
  Globe, 
  ShieldCheck, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  ArrowLeft, 
  Info, 
  Loader2, 
  ShieldAlert, 
  Zap, 
  Lock, 
  Trash2, 
  Save, 
  RefreshCcw, 
  CheckCircle2,
  Clock,
  HelpCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { 
  updateCustomDomain, 
  removeCustomDomain, 
  verifyCustomDomain
} from "@/app/actions/website-actions";

const EXPECTED_CNAME_TARGET = "cname.biztrix.in";

type DomainStatus = "pending" | "verified" | "failed" | "active";

export default function DomainSettingsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [domainInput, setDomainInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isVerifying, startVerifyTransition] = useTransition();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const websiteRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId, 'websites', 'main') : null
  , [firestore, businessId]);
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
          title: "Domain Verified!", 
          description: result.message || "Your custom domain is verified and activated for production routing." 
        });
      } else {
        toast({ 
          title: "Verification Incomplete", 
          description: result.message || "DNS lookup could not verify the CNAME record.", 
          variant: "destructive" 
        });
      }
    });
  };

  const handleRemove = () => {
    if (!businessId) return;
    if (!confirm("Are you sure? This will unlink your custom domain and take it offline.")) return;
    startTransition(async () => {
      const idToken = user ? await user.getIdToken() : undefined;
      const result = await removeCustomDomain({ businessId, idToken });
      if (result.success) {
        toast({ title: "Success", description: result.message });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({ title: "Copied!", description: `${key} value copied to clipboard.` });
  };

  if (isWebsiteLoading) {
    return (
      <div className="flex items-center justify-center py-20 opacity-40">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-10 text-left">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button asChild variant="ghost" size="sm" className="h-8 p-0 hover:bg-transparent">
              <Link href="/website" className="text-muted-foreground hover:text-primary flex items-center gap-1 group">
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> 
                <span className="text-[10px] font-black uppercase tracking-widest">Store Builder</span>
              </Link>
            </Button>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 leading-none uppercase">Custom Domain Hub</h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-1.5 opacity-60">Connect and verify your custom brand domain for production storefront traffic.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 space-y-8">
          {!activeDomain ? (
            <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border animate-in slide-in-from-bottom-4">
              <CardHeader className="bg-primary/5 border-b py-8 px-10">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                  <Globe className="h-5 w-5" /> 1. Link Domain Node
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10 space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Target Domain Name</Label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input 
                      placeholder="e.g. www.yourbrand.com or shop.yourbrand.com" 
                      className="h-14 text-lg rounded-2xl bg-muted/20 border-none shadow-inner font-bold"
                      value={domainInput}
                      onChange={(e) => setDomainInput(e.target.value.toLowerCase())}
                    />
                    <Button 
                      className="h-14 px-10 bg-primary font-black uppercase tracking-[0.15em] text-xs shadow-xl rounded-2xl active:scale-95 transition-all"
                      disabled={isPending || !domainInput.trim()}
                      onClick={handleConnect}
                    >
                      {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Link Node"}
                    </Button>
                  </div>
                  <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter px-1 opacity-60">
                    Connect root domain or subdomain (e.g. shop.yourbrand.com or www.yourbrand.com).
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
              <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border">
                <CardHeader className="bg-primary/5 border-b py-8 px-10 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-black text-primary flex items-center gap-3 uppercase">
                      <Globe className="h-6 w-6" /> {activeDomain}
                    </CardTitle>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Custom Domain Status</p>
                  </div>
                  <Badge 
                    className={cn(
                      "text-[9px] font-black h-6 px-3 uppercase border-none shadow-sm flex items-center gap-1.5",
                      status === "pending" && "bg-amber-100 text-amber-800",
                      isVerified && "bg-emerald-100 text-emerald-800",
                      status === "failed" && "bg-rose-100 text-rose-800",
                    )}
                  >
                    {isVerified ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> VERIFIED
                      </>
                    ) : status === "failed" ? (
                      <>
                        <AlertCircle className="h-3 w-3" /> FAILED
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3" /> PENDING DNS
                      </>
                    )}
                  </Badge>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                  {isVerified ? (
                    <div className="space-y-6">
                      <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                        <div className="h-20 w-20 rounded-[1.5rem] bg-emerald-50 flex items-center justify-center border-4 border-white shadow-xl shadow-emerald-200">
                          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                        </div>
                        <div className="space-y-1.5">
                          <h3 className="text-2xl font-black text-slate-900 uppercase">Domain Verified & Active</h3>
                          <p className="text-xs text-muted-foreground font-medium max-w-md mx-auto">
                            DNS records are verified. Storefront requests to <span className="font-bold text-slate-800">{activeDomain}</span> resolve to your business catalog.
                          </p>
                        </div>
                      </div>

                      <div className="p-5 bg-slate-50 rounded-2xl border space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Verification State</span>
                          <span className="font-black text-emerald-700 uppercase">Production Ready</span>
                        </div>
                        {verifiedAt && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Verified At</span>
                            <span className="font-mono text-slate-700 text-[11px]">
                              {new Date(verifiedAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {lastCheckedAt && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Last DNS Check</span>
                            <span className="font-mono text-slate-500 text-[11px]">
                              {new Date(lastCheckedAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Target Endpoint</span>
                          <code className="text-[11px] font-mono font-bold bg-white px-2 py-0.5 rounded border text-primary">
                            {EXPECTED_CNAME_TARGET}
                          </code>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row gap-4">
                        <Button 
                          variant="outline"
                          className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest border-primary/20 hover:bg-primary/5 active:scale-95 transition-all"
                          onClick={handleVerify}
                          disabled={isVerifying || isPending}
                        >
                          {isVerifying ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <RefreshCcw className="mr-2 h-4 w-4 text-primary" />
                          )}
                          Re-check DNS
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest text-destructive border-destructive/20 hover:bg-rose-50" 
                          onClick={handleRemove}
                          disabled={isPending || isVerifying}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Remove Domain
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {status === "failed" ? (
                        <Alert className="bg-rose-50 border-rose-200 rounded-3xl p-6">
                          <AlertCircle className="h-5 w-5 text-rose-600" />
                          <div className="ml-2">
                            <AlertTitle className="text-sm font-black text-rose-900 uppercase tracking-tight">DNS Verification Failed</AlertTitle>
                            <AlertDescription className="text-xs text-rose-800 font-medium leading-relaxed mt-1">
                              {verificationError || "CNAME lookup failed. Please confirm the DNS record has been created and has propagated."}
                            </AlertDescription>
                            {lastCheckedAt && (
                              <p className="text-[10px] font-mono text-rose-600 mt-2">
                                Last checked: {new Date(lastCheckedAt).toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                        </Alert>
                      ) : (
                        <Alert className="bg-amber-50 border-amber-200 rounded-3xl p-6">
                          <AlertCircle className="h-5 w-5 text-amber-600" />
                          <div className="ml-2">
                            <AlertTitle className="text-sm font-black text-amber-900 uppercase tracking-tight">DNS Handshake Required</AlertTitle>
                            <AlertDescription className="text-xs text-amber-800 font-medium leading-relaxed mt-1">
                              Please update your DNS records at your domain registrar (Hostinger, GoDaddy, Cloudflare, etc.) using the values below, then click &ldquo;Verify DNS Record&rdquo;.
                            </AlertDescription>
                            {lastCheckedAt && (
                              <p className="text-[10px] font-mono text-amber-600 mt-2">
                                Last checked: {new Date(lastCheckedAt).toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                        </Alert>
                      )}

                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">2. Required DNS Records</h4>
                        
                        <div className="border rounded-[2rem] overflow-hidden shadow-inner bg-slate-50">
                          <div className="bg-muted/50 p-4 grid grid-cols-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground border-b">
                            <div className="col-span-1">Type</div>
                            <div className="col-span-1">Host</div>
                            <div className="col-span-2 text-right">Value</div>
                          </div>
                          
                          {/* CNAME Record */}
                          <div className="p-5 grid grid-cols-4 items-center gap-4 text-sm border-b last:border-0 group hover:bg-white transition-all">
                            <div className="col-span-1 font-black uppercase text-[10px] flex items-center gap-1">
                              CNAME <span className="text-[9px] text-primary font-bold">(Required)</span>
                            </div>
                            <div className="col-span-1 font-mono font-bold text-primary">
                              {activeDomain.startsWith("www.") ? "www" : activeDomain.split(".")[0]}
                            </div>
                            <div className="col-span-2 flex items-center justify-end gap-3">
                              <code className="bg-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-black font-mono shadow-sm">
                                {EXPECTED_CNAME_TARGET}
                              </code>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-xl" 
                                onClick={() => copyToClipboard(EXPECTED_CNAME_TARGET, "CNAME")}
                              >
                                {copiedKey === "CNAME" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>

                          {/* A Record */}
                          <div className="p-5 grid grid-cols-4 items-center gap-4 text-sm border-b last:border-0 group hover:bg-white transition-all">
                            <div className="col-span-1 font-black uppercase text-[10px]">A Record</div>
                            <div className="col-span-1 font-mono font-bold text-primary">@</div>
                            <div className="col-span-2 flex items-center justify-end gap-3">
                              <code className="bg-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-black font-mono shadow-sm">CHECK_CONSOLE</code>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-xl" 
                                onClick={() => copyToClipboard("CHECK_CONSOLE", "A Record")}
                              >
                                {copiedKey === "A Record" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 flex flex-col sm:flex-row gap-4">
                        <Button 
                          className="flex-1 bg-primary font-black uppercase tracking-[0.2em] text-xs h-16 shadow-2xl rounded-2xl active:scale-95 transition-all"
                          onClick={handleVerify}
                          disabled={isVerifying || isPending}
                        >
                          {isVerifying ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying DNS...
                            </>
                          ) : (
                            <>
                              <RefreshCcw className="mr-2 h-5 w-5" /> 
                              {status === "failed" ? "Retry Verification" : "Verify DNS Record"}
                            </>
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest text-destructive border-destructive/20 hover:bg-rose-50" 
                          onClick={handleRemove}
                          disabled={isPending || isVerifying}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Remove Domain
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-8">
          <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border text-left">
            <CardHeader className="bg-muted/30 border-b py-6 px-8">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" /> Integration Roadmap
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-slate-900">Provision Node</p>
                    <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                      Enter your domain to link it to your business storefront in the Biztrix registry.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-slate-900">Update DNS Registry</p>
                    <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                      Add the required CNAME record pointing to <span className="font-mono text-primary">{EXPECTED_CNAME_TARGET}</span> at your domain registrar.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-slate-900">Production Routing & SSL</p>
                    <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                      Server-side verification confirms DNS ownership before routing traffic. SSL edge termination is managed via App Hosting custom domain mapping.
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="opacity-50" />

              <div className="p-6 bg-slate-900 rounded-3xl space-y-4 shadow-xl text-left">
                <div className="flex items-center gap-3">
                   <ShieldCheck className="h-5 w-5 text-emerald-400" />
                   <h5 className="text-[10px] font-black uppercase text-white tracking-widest">Phase 4B Verified</h5>
                </div>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed tracking-tight">
                  Server-side DNS verification enforces that only verified custom domains serve production storefront traffic. Cross-tenant isolation is authenticated at every step.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
