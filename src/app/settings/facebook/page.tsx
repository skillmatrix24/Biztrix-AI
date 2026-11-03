
"use client";

import { useState } from "react";
import { 
  Facebook, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  MessageSquare, 
  Instagram, 
  RefreshCcw, 
  ArrowLeft,
  ExternalLink,
  Info,
  Lock,
  Zap,
  Settings2,
  Trash2,
  ArrowRight,
  Globe
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ConnectionStatus = "disconnected" | "connecting" | "connected";

export default function FacebookIntegrationPage() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [isSyncing, setIsSyncing] = useState(false);

  const handleConnect = () => {
    setStatus("connecting");
    setTimeout(() => {
      setStatus("connected");
      toast({ title: "Meta Connected", description: "Your Facebook Business assets are now synced." });
    }, 2000);
  };

  const handleDisconnect = () => {
    setStatus("disconnected");
    toast({ title: "Account Unlinked", variant: "destructive", description: "Meta Business access has been revoked." });
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      toast({ title: "Data Synced", description: "Latest leads and messages have been imported." });
    }, 1500);
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Button asChild variant="ghost" size="sm" className="h-8 p-0 hover:bg-transparent">
              <Link href="/dashboard" className="text-muted-foreground hover:text-primary flex items-center gap-1 group">
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> 
                <span className="text-[10px] font-bold uppercase tracking-widest">Settings</span>
              </Link>
            </Button>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#1877F2]/10 flex items-center justify-center border border-[#1877F2]/20">
              <Facebook className="h-6 w-6 text-[#1877F2]" />
            </div>
            Meta Business Integration
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground font-medium">Power your sales with Facebook Ads leads and WhatsApp automation.</p>
        </div>
        {status === "connected" && (
          <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-xl border border-green-100 shadow-sm animate-in fade-in zoom-in duration-300">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Live Sync Active</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Interface */}
        <div className="lg:col-span-8 space-y-6">
          {status === "disconnected" ? (
            <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden border animate-in slide-in-from-bottom-4 duration-500">
              <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-8">
                <div className="relative">
                  <div className="h-24 w-24 rounded-[2rem] bg-[#1877F2]/10 flex items-center justify-center shadow-inner">
                    <Facebook className="h-12 w-12 text-[#1877F2]" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center text-primary">
                    <Lock className="h-4 w-4" />
                  </div>
                </div>
                
                <div className="max-w-md space-y-3">
                  <h3 className="text-2xl font-bold text-primary">Connect Your Facebook Ecosystem</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Instantly sync leads from your Facebook Pages, manage Instagram DM responses, and activate your WhatsApp Business API for automated follow-ups.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                  {[
                    { label: "Leads Sync", icon: Zap, color: "text-orange-500", desc: "Auto-import" },
                    { label: "WhatsApp API", icon: MessageSquare, color: "text-green-500", desc: "Sequence" },
                    { label: "Instagram DM", icon: Instagram, color: "text-[#E4405F]", desc: "Reply Bot" },
                  ].map((f, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-muted/20 border border-muted flex flex-col items-center gap-2 group hover:border-primary/20 transition-all">
                      <f.icon className={cn("h-5 w-5 mb-1", f.color)} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{f.label}</span>
                      <span className="text-[8px] text-muted-foreground uppercase font-medium">{f.desc}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 w-full max-w-sm">
                  <Button 
                    onClick={handleConnect}
                    className="w-full h-14 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl shadow-[#1877F2]/20 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <Facebook className="mr-3 h-5 w-5 fill-current" /> Connect Meta Account
                  </Button>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center justify-center gap-2">
                    <ShieldCheck className="h-3 w-3" /> Meta Verified API Integration • Secure Encryption
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : status === "connecting" ? (
            <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden py-24 flex flex-col items-center justify-center">
              <CardContent className="flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <RefreshCcw className="h-16 w-16 text-[#1877F2] animate-spin" />
                  <Facebook className="h-6 w-6 text-[#1877F2] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-primary">Connecting to Meta...</h3>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest animate-pulse">Establishing Secure Handshake</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {/* Connected State - Management UI */}
              <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden border">
                <CardHeader className="bg-[#1877F2]/5 border-b py-6 px-8 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-white border shadow-sm flex items-center justify-center overflow-hidden">
                      <img src="https://picsum.photos/seed/brand/100/100" alt="Meta Page Logo" className="w-full h-full object-cover" data-ai-hint="company logo" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-primary">Global Tech Hub</CardTitle>
                      <Badge className="bg-green-500/10 text-green-600 border-none text-[8px] font-bold tracking-widest mt-1">VERIFIED BUSINESS</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-9 text-[10px] font-bold uppercase rounded-lg border-muted-foreground/20" onClick={handleSync} disabled={isSyncing}>
                      {isSyncing ? <RefreshCcw className="h-3 w-3 animate-spin mr-2" /> : <RefreshCcw className="h-3 w-3 mr-2" />}
                      Refresh Data
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 text-[10px] font-bold uppercase rounded-lg text-destructive border-destructive/20 hover:bg-destructive/5" onClick={handleDisconnect}>
                      Unlink
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-5 rounded-2xl bg-muted/20 border-none space-y-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <Facebook className="h-5 w-5 text-[#1877F2]" />
                        <Badge className="bg-green-50 text-green-600 border-none text-[8px] font-bold uppercase h-4">Active</Badge>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Facebook Page</p>
                        <p className="text-sm font-bold text-primary">Global Tech Official</p>
                      </div>
                    </div>
                    <div className="p-5 rounded-2xl bg-muted/20 border-none space-y-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <Instagram className="h-5 w-5 text-[#E4405F]" />
                        <Badge className="bg-green-50 text-green-600 border-none text-[8px] font-bold uppercase h-4">Active</Badge>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Instagram Business</p>
                        <p className="text-sm font-bold text-primary">@globaltech_pos</p>
                      </div>
                    </div>
                    <div className="p-5 rounded-2xl bg-muted/20 border-none space-y-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <MessageSquare className="h-5 w-5 text-[#25D366]" />
                        <Badge className="bg-green-50 text-green-600 border-none text-[8px] font-bold uppercase h-4">Linked</Badge>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">WhatsApp API</p>
                        <p className="text-sm font-bold text-primary">+91 98765 43210</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" /> Granular Access Permissions
                      </h4>
                      <Button variant="ghost" size="sm" className="h-7 text-[9px] font-bold text-muted-foreground uppercase">Review on Meta <ExternalLink className="ml-1 h-3 w-3" /></Button>
                    </div>
                    <div className="border rounded-2xl overflow-hidden divide-y bg-muted/5">
                      {[
                        { title: "Manage Lead Ads", desc: "Read and import lead data from active Facebook campaigns", status: true },
                        { title: "WhatsApp Business API", desc: "Send automated follow-up sequences and notifications", status: true },
                        { title: "Read Instagram DMs", desc: "Access messages for centralized customer support", status: true },
                        { title: "Catalog Sync", desc: "Push inventory images to Facebook Commerce Manager", status: false },
                      ].map((perm, i) => (
                        <div key={i} className="p-4 flex items-center justify-between bg-white/50 hover:bg-white transition-colors">
                          <div className="space-y-0.5 max-w-[80%]">
                            <p className="text-xs font-bold text-primary">{perm.title}</p>
                            <p className="text-[10px] text-muted-foreground font-medium">{perm.desc}</p>
                          </div>
                          <Switch checked={perm.status} className="scale-75 data-[state=checked]:bg-primary" />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/10 p-6 border-t flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                    <Info className="h-3.5 w-3.5" /> Data refresh frequency: 15 minutes
                  </div>
                  <Button variant="link" className="text-[10px] font-bold uppercase text-primary h-auto p-0">Detailed Integration Logs</Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </div>

        {/* Sidebar Help / Info */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden border">
            <CardHeader className="bg-muted/30 border-b py-5 px-6">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Info className="h-4 w-4" /> Setup Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-5">
                <div className="flex gap-4">
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold">Meta Business Login</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">Login with an <strong>Admin</strong> account that manages your target Pages.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold">Asset Selection</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">Pick the specific Pages, Instagram accounts, and numbers during the popup.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold">Permissions Grant</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">Approve all scopes to ensure lead flows and automated replies work correctly.</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-3">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" /> Security Focus
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                  "Bill Matrix uses secure OAuth 2.0. We never store your password and only access data needed for your active integrations."
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-slate-900 text-white rounded-3xl overflow-hidden relative group cursor-pointer">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Facebook className="h-20 w-20" />
            </div>
            <CardContent className="p-6 flex items-center gap-4 relative z-10">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                <Globe className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-tight">Enterprise Tier Integration</p>
                <p className="text-[10px] text-white/60 font-medium">Approved Meta App Developer</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
