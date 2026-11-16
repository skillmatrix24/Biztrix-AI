"use client";

import { useState } from "react";
import {
  Facebook,
  ShieldCheck,
  MessageSquare,
  Instagram,
  RefreshCcw,
  ExternalLink,
  Info,
  Lock,
  Zap,
  Globe,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader, SectionCard } from "@/components/ui/editorial";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ConnectionStatus = "disconnected" | "connecting" | "connected";

export default function FacebookIntegrationPage() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [isSyncing, setIsSyncing] = useState(false);
  const [permissions, setPermissions] = useState([
    {
      title: "Manage Lead Ads",
      desc: "Read and import lead data from active Facebook campaigns",
      status: true,
    },
    {
      title: "WhatsApp Business API",
      desc: "Send automated follow-up sequences and notifications",
      status: true,
    },
    {
      title: "Read Instagram DMs",
      desc: "Access messages for centralized customer support",
      status: true,
    },
    {
      title: "Catalog Sync",
      desc: "Push product images to Facebook Commerce Manager",
      status: false,
    },
  ]);

  const handleConnect = () => {
    setStatus("connecting");
    setTimeout(() => {
      setStatus("connected");
      toast({
        title: "Meta Connected",
        description: "Your Facebook Business assets are now synced.",
      });
    }, 1500);
  };

  const handleDisconnect = () => {
    setStatus("disconnected");
    toast({
      title: "Account Unlinked",
      variant: "destructive",
      description: "Meta Business access has been revoked.",
    });
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      toast({
        title: "Data Synced",
        description: "Latest leads and messages have been imported.",
      });
    }, 1200);
  };

  const togglePermission = (idx: number, next: boolean) => {
    setPermissions((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, status: next } : p))
    );
  };

  return (
    <div className="space-y-6 pb-16 text-left">
      <PageHeader
        title="Meta Business Integration"
        description="Connect Facebook Lead Ads, Instagram Messaging, and WhatsApp Business API."
        breadcrumb="Settings / Meta Business"
        backHref="/settings"
        backLabel="Back to Settings"
        actions={
          status === "connected" ? (
            <span className="inline-flex items-center rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              Live Sync Connected
            </span>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          {status === "disconnected" ? (
            <SectionCard>
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative">
                  <div className="h-20 w-20 rounded-2xl bg-[#1877F2]/10 border border-[#1877F2]/20 flex items-center justify-center">
                    <Facebook className="h-10 w-10 text-[#1877F2]" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                    <Lock className="h-4 w-4" />
                  </div>
                </div>

                <div className="max-w-md space-y-2">
                  <h3 className="text-xl font-bold text-slate-900">
                    Connect Your Facebook Ecosystem
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Instantly import leads from Facebook Pages, manage Instagram
                    DM replies, and connect your WhatsApp Business API for
                    automated follow-ups.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                  {[
                    {
                      label: "Leads Sync",
                      icon: Zap,
                      color: "text-amber-600",
                      desc: "Auto-import forms",
                    },
                    {
                      label: "WhatsApp API",
                      icon: MessageSquare,
                      color: "text-emerald-600",
                      desc: "Automated sequences",
                    },
                    {
                      label: "Instagram DM",
                      icon: Instagram,
                      color: "text-rose-600",
                      desc: "Unified inbox",
                    },
                  ].map((f, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center gap-1.5"
                    >
                      <f.icon className={cn("h-5 w-5", f.color)} />
                      <span className="text-xs font-bold text-slate-900">
                        {f.label}
                      </span>
                      <span className="text-xs text-slate-500">{f.desc}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 w-full max-w-sm">
                  <Button
                    onClick={handleConnect}
                    className="w-full h-11 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl font-semibold text-sm"
                  >
                    <Facebook className="mr-2 h-4 w-4" /> Connect Meta Account
                  </Button>
                  <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />{" "}
                    Meta OAuth 2.0 · Encrypted Connection
                  </p>
                </div>
              </div>
            </SectionCard>
          ) : status === "connecting" ? (
            <SectionCard>
              <div className="py-16 flex flex-col items-center justify-center space-y-4">
                <RefreshCcw className="h-10 w-10 text-[#1877F2] animate-spin" />
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">
                    Connecting to Meta...
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verifying Business Manager permissions
                  </p>
                </div>
              </div>
            </SectionCard>
          ) : (
            <SectionCard
              title="Global Tech Hub"
              description="Verified Meta Business Manager connection"
              headerRight={
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs font-semibold rounded-xl border-slate-200"
                    onClick={handleSync}
                    disabled={isSyncing}
                  >
                    <RefreshCcw
                      className={cn(
                        "h-3.5 w-3.5 mr-1.5",
                        isSyncing && "animate-spin"
                      )}
                    />
                    Refresh Data
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs font-semibold rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50"
                    onClick={handleDisconnect}
                  >
                    Unlink
                  </Button>
                </div>
              }
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <Facebook className="h-5 w-5 text-[#1877F2]" />
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        Active
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Facebook Page</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        Global Tech Official
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <Instagram className="h-5 w-5 text-[#E4405F]" />
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        Active
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">
                        Instagram Business
                      </p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        @globaltech_pos
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <MessageSquare className="h-5 w-5 text-[#25D366]" />
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        Linked
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">WhatsApp API</p>
                      <p className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                        +91 98765 43210
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-slate-500" /> Access
                      Permissions
                    </h4>
                    <a
                      href="https://business.facebook.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                    >
                      Review on Meta <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
                    {permissions.map((perm, i) => (
                      <div
                        key={i}
                        className="p-4 flex items-center justify-between bg-white"
                      >
                        <div className="space-y-0.5 pr-4">
                          <p className="text-sm font-semibold text-slate-900">
                            {perm.title}
                          </p>
                          <p className="text-xs text-slate-500">{perm.desc}</p>
                        </div>
                        <Switch
                          checked={perm.status}
                          aria-label={perm.title}
                          onCheckedChange={(v) => togglePermission(i, v)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" /> Sync interval: 15 minutes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> Meta Business Suite
                  </span>
                </div>
              </div>
            </SectionCard>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <SectionCard
            title="Setup Guide"
            headerRight={<Info className="h-4 w-4 text-slate-400" />}
          >
            <div className="space-y-5">
              <div className="flex gap-3.5">
                <div className="h-6 w-6 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                  1
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900">
                    Meta Business Login
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sign in with an Admin account that manages your target
                    Facebook Pages.
                  </p>
                </div>
              </div>
              <div className="flex gap-3.5">
                <div className="h-6 w-6 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                  2
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900">
                    Asset Selection
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Select the Pages, Instagram accounts, and WhatsApp numbers
                    you want to connect.
                  </p>
                </div>
              </div>
              <div className="flex gap-3.5">
                <div className="h-6 w-6 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                  3
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900">
                    Grant Scopes
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Approve required scopes so Lead Ads and automated replies
                    sync reliably.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> OAuth 2.0
                  Security
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Biztrix AI never stores your Meta password and only requests
                  scopes required for active integrations.
                </p>
              </div>
            </div>
          </SectionCard>

          <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                Meta Cloud API Integration
              </p>
              <p className="text-xs text-slate-300">
                Real-time lead capture & messaging
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
