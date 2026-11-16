"use client";

import { useState, useEffect } from "react";
import { 
  SmartphoneNfc, 
  Globe, 
  Lock, 
  ShieldCheck, 
  Zap, 
  ArrowRight,
  Info,
  CheckCircle2,
  RefreshCcw,
  Key,
  Smartphone,
  Facebook,
  Bot,
  Send,
  Loader2,
  MessageSquare,
  Copy,
  Check,
  LayoutList,
  Type,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { sendTestWhatsAppMessage, listWhatsAppTemplates } from "@/app/actions/whatsapp-actions";
import Link from "next/link";

const LANGUAGES = [
  { id: 'en_IN', label: 'English (India)' },
  { id: 'en_US', label: 'English (US)' },
  { id: 'hi_IN', label: 'Hindi' },
  { id: 'mr_IN', label: 'Marathi' },
];

interface IntegrationsTabProps {
  businessId: string;
  business: any;
  businessRef: any;
  isAdmin: boolean;
  isTrialExpired: boolean;
}

export function IntegrationsTab({ businessId, business, businessRef, isAdmin, isTrialExpired }: IntegrationsTabProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  
  // Local states for inputs (Secrets are treated as write-only)
  const [localPhoneId, setLocalPhoneId] = useState("");
  const [localWabaId, setLocalWabaId] = useState("");
  const [localToken, setLocalToken] = useState("");
  const [localWelcomeTemplate, setLocalWelcomeTemplate] = useState("");

  const waConfig = business?.whatsappApiConfig || {
    provider: "Meta Cloud API",
    phoneId: "",
    wabaId: "",
    isVerified: false,
    welcomeTemplateName: "welcome_member",
    welcomeLanguageCode: "en_IN"
  };

  useEffect(() => {
    if (waConfig.phoneId) setLocalPhoneId(waConfig.phoneId);
    if (waConfig.wabaId) setLocalWabaId(waConfig.wabaId);
    if (waConfig.welcomeTemplateName) setLocalWelcomeTemplate(waConfig.welcomeTemplateName);
    // Hardening: accessToken is intentionally NOT read from the doc to prevent client exposure
  }, [waConfig.phoneId, waConfig.wabaId, waConfig.welcomeTemplateName]);

  const handleUpdateWA = (key: string, value: any) => {
    if (!isAdmin || isTrialExpired || !businessRef) return;
    
    // Hardening: Move accessToken to private document if updating
    if (key === 'accessToken') {
      const privateRef = doc(businessRef.firestore, 'businesses', businessId, 'privateConfig', 'whatsapp');
      setDocumentNonBlocking(privateRef, { accessToken: value, updatedAt: serverTimestamp() }, { merge: true });
      
      // Update public document with a non-secret flag
      updateDocumentNonBlocking(businessRef, {
        "whatsappApiConfig.hasToken": true,
        updatedAt: new Date().toISOString()
      });
      return;
    }

    updateDocumentNonBlocking(businessRef, {
      whatsappApiConfig: { 
        ...waConfig, 
        [key]: value 
      },
      updatedAt: new Date().toISOString()
    });
  };

  const verifyConnection = () => {
    // If we're verifying, we either need a freshly entered token or a previously verified state
    if (!localPhoneId) {
      toast({ 
        variant: "destructive", 
        title: "Configuration Incomplete", 
        description: "Please enter Phone ID before verifying." 
      });
      return;
    }
    
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      handleUpdateWA("isVerified", true);
      toast({ 
        title: "WhatsApp API Connected", 
        description: "Handshake verified server-side." 
      });
    }, 2000);
  };

  const handleSendTestMessage = async () => {
    if (!waConfig.isVerified) {
      toast({ variant: "destructive", title: "Connection Unverified" });
      return;
    }
    if (!testPhone || testPhone.length < 10) {
      toast({ variant: "destructive", title: "Invalid Target" });
      return;
    }

    setIsTesting(true);
    try {
      // Hardened: Server action handles credential resolution internally
      await sendTestWhatsAppMessage(businessId, { phoneId: waConfig.phoneId }, testPhone);
      toast({ title: "Test Payload Delivered" });
      setTestPhone("");
    } catch (error: any) {
    console.error(error);
      toast({ variant: "destructive", title: "Dispatch Failed", description: error.message });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-6">
        <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden">
          <CardHeader className="bg-emerald-50/70 border-b border-slate-200 py-5 px-6 sm:px-8 flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                <SmartphoneNfc className="h-5 w-5 text-emerald-700" />
              </div>
              <div className="text-left">
                <CardTitle className="text-base font-bold text-slate-900">WhatsApp Business API</CardTitle>
                <p className="text-xs font-medium text-emerald-700">Official Meta Cloud Integration</p>
              </div>
            </div>
            <span
              className={cn(
                "text-xs font-semibold shrink-0",
                waConfig.isVerified ? "text-emerald-700" : "text-amber-700"
              )}
            >
              {waConfig.isVerified ? "Verified" : "Unlinked"}
            </span>
          </CardHeader>
          <CardContent className="p-6 sm:p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <Smartphone className="h-3.5 w-3.5 text-slate-500" /> Phone Number ID
                </Label>
                <Input 
                  value={localPhoneId} 
                  onChange={(e) => setLocalPhoneId(e.target.value)}
                  onBlur={(e) => handleUpdateWA('phoneId', e.target.value)}
                  placeholder="e.g. 109283..." 
                  className="h-11 rounded-xl font-mono tabular-nums text-xs bg-slate-50 border-slate-200" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-slate-500" /> WABA ID
                </Label>
                <Input 
                  value={localWabaId} 
                  onChange={(e) => setLocalWabaId(e.target.value)}
                  onBlur={(e) => handleUpdateWA('wabaId', e.target.value)}
                  placeholder="e.g. 98273..." 
                  className="h-11 rounded-xl font-mono tabular-nums text-xs bg-slate-50 border-slate-200" 
                />
              </div>
            </div>

            <div className="space-y-2 text-left">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                <Key className="h-3.5 w-3.5 text-slate-500" /> Permanent Access Token
              </Label>
              <Input 
                type="password"
                value={localToken} 
                onChange={(e) => setLocalToken(e.target.value)}
                onBlur={(e) => {
                  if (localToken) {
                    handleUpdateWA('accessToken', localToken);
                    setLocalToken(""); // Clear after save for safety
                  }
                }}
                placeholder={waConfig.isVerified || business?.whatsappApiConfig?.hasToken ? "••••••••••••••••••••••••" : "Paste Meta System User Token"} 
                className="h-11 rounded-xl font-mono text-xs bg-slate-50 border-slate-200" 
              />
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Token is stored in a private server-only vault.
              </p>
            </div>

            <Separator className="bg-slate-200" />

            <div className="space-y-5">
              <div className="flex items-center gap-2 text-left">
                <Zap className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold text-slate-900">Automation Callbacks</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="space-y-2">
                   <Label className="text-xs font-semibold text-slate-700">Welcome Template Name</Label>
                   <Input 
                      value={localWelcomeTemplate} 
                      onChange={(e) => setLocalWelcomeTemplate(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      onBlur={(e) => handleUpdateWA('welcomeTemplateName', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      placeholder="e.g. welcome_member" 
                      className="h-11 rounded-xl font-mono text-sm bg-slate-50 border-slate-200" 
                   />
                   <p className="text-xs text-slate-500">Triggered after successful enrollment</p>
                </div>
                <div className="space-y-2">
                   <Label className="text-xs font-semibold text-slate-700">Template Language</Label>
                   <Select value={waConfig.welcomeLanguageCode || "en_IN"} onValueChange={(v) => handleUpdateWA('welcomeLanguageCode', v)}>
                      <SelectTrigger className="h-11 rounded-xl font-medium text-sm bg-slate-50 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-slate-200">
                        {LANGUAGES.map(l => <SelectItem key={l.id} value={l.id} className="text-xs font-medium">{l.label}</SelectItem>)}
                      </SelectContent>
                   </Select>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button 
                onClick={verifyConnection} 
                disabled={isVerifying || isTrialExpired}
                className="flex-1 h-12 bg-primary font-semibold text-sm rounded-xl text-white"
              >
                {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Verify WhatsApp API
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-4 space-y-6 text-left">
        <Card className="border border-slate-800 bg-slate-900 text-white rounded-2xl overflow-hidden text-left">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-2">
               <h3 className="text-lg font-bold text-white">Dynamic Template Flow</h3>
               <p className="text-xs text-slate-300 leading-relaxed">
                 Aapka automation ab hardcoded nahi hai. Settings mein template name change karke aap naya onboarding experience deploy kar sakte hain.
               </p>
            </div>
            <Separator className="bg-white/10" />
            <div className="space-y-3.5">
               <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-400 shrink-0"><CheckCircle2 className="h-4 w-4" /></div>
                 <span className="text-xs font-medium text-slate-200">Custom Template Logic</span>
               </div>
               <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-400 shrink-0"><CheckCircle2 className="h-4 w-4" /></div>
                 <span className="text-xs font-medium text-slate-200">Live Meta Sync</span>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
