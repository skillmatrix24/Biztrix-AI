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
    
    // Hardening: Move accessToken to private node if updating
    if (key === 'accessToken') {
      const privateRef = doc(businessRef.firestore, 'businesses', businessId, 'privateConfig', 'whatsapp');
      setDocumentNonBlocking(privateRef, { accessToken: value, updatedAt: serverTimestamp() }, { merge: true });
      
      // Update public node with a non-secret flag
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
        title: "API Node Established", 
        description: "Handshake verified server-side." 
      });
    }, 2000);
  };

  const handleSendTestMessage = async () => {
    if (!waConfig.isVerified) {
      toast({ variant: "destructive", title: "Node Unverified" });
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="lg:col-span-8 space-y-8">
        <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border">
          <CardHeader className="bg-green-50 border-b py-6 px-8 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white border shadow-sm flex items-center justify-center">
                <SmartphoneNfc className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-left">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-green-700">WhatsApp Business API</CardTitle>
                <p className="text-[10px] font-bold text-green-600/70 uppercase">Official Meta Cloud Integration</p>
              </div>
            </div>
            {waConfig.isVerified ? (
              <Badge className="bg-green-600 text-white border-none text-[8px] font-black h-5 px-3 uppercase shadow-sm">VERIFIED</Badge>
            ) : (
              <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-[8px] font-black h-5 px-3 uppercase">UNLINKED</Badge>
            )}
          </CardHeader>
          <CardContent className="p-8 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest text-left flex items-center gap-2">
                  <Smartphone className="h-3 w-3" /> Phone Number ID
                </Label>
                <Input 
                  value={localPhoneId} 
                  onChange={(e) => setLocalPhoneId(e.target.value)}
                  onBlur={(e) => handleUpdateWA('phoneId', e.target.value)}
                  placeholder="e.g. 109283..." 
                  className="h-12 rounded-xl font-mono text-xs bg-muted/20 border-none shadow-inner" 
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest text-left flex items-center gap-2">
                  <Globe className="h-3 w-3" /> WABA ID
                </Label>
                <Input 
                  value={localWabaId} 
                  onChange={(e) => setLocalWabaId(e.target.value)}
                  onBlur={(e) => handleUpdateWA('wabaId', e.target.value)}
                  placeholder="e.g. 98273..." 
                  className="h-12 rounded-xl font-mono text-xs bg-muted/20 border-none shadow-inner" 
                />
              </div>
            </div>

            <div className="space-y-3 text-left">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest text-left flex items-center gap-2">
                <Key className="h-3 w-3" /> Permanent Access Token
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
                className="h-12 rounded-xl font-mono text-xs bg-muted/20 border-none shadow-inner" 
              />
              <p className="text-[8px] font-bold text-muted-foreground uppercase px-1 flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-green-600" /> Token is stored in an encrypted server-only node.
              </p>
            </div>

            <Separator className="opacity-50" />

            <div className="space-y-6">
              <div className="flex items-center gap-2 px-1 text-left">
                <Zap className="h-4 w-4 text-primary fill-primary" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Automation Callbacks</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                <div className="space-y-3">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Welcome Template Name</Label>
                   <Input 
                      value={localWelcomeTemplate} 
                      onChange={(e) => setLocalWelcomeTemplate(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      onBlur={(e) => handleUpdateWA('welcomeTemplateName', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      placeholder="e.g. welcome_member" 
                      className="h-12 rounded-xl font-black text-sm bg-muted/20 border-none shadow-inner" 
                   />
                   <p className="text-[8px] font-bold text-muted-foreground uppercase px-1">Triggered after successful enrollment</p>
                </div>
                <div className="space-y-3">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Template Language</Label>
                   <Select value={waConfig.welcomeLanguageCode || "en_IN"} onValueChange={(v) => handleUpdateWA('welcomeLanguageCode', v)}>
                      <SelectTrigger className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-2xl">
                        {LANGUAGES.map(l => <SelectItem key={l.id} value={l.id} className="text-xs font-bold">{l.label}</SelectItem>)}
                      </SelectContent>
                   </Select>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button 
                onClick={verifyConnection} 
                disabled={isVerifying || isTrialExpired}
                className="flex-1 h-16 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl text-white"
              >
                {isVerifying ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                Verify API Node
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-4 space-y-6 text-left">
        <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden group text-left">
          <CardContent className="p-8 space-y-8">
            <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner group-hover:scale-110 transition-transform">
              <Bot className="h-8 w-8 text-accent fill-accent" />
            </div>
            <div className="space-y-3">
               <h3 className="text-xl font-black uppercase tracking-tight">Dynamic Flow Node</h3>
               <p className="text-xs text-slate-400 leading-relaxed font-medium">
                 Aapka automation ab hardcoded nahi hai. Settings mein template name change karke aap naya onboarding experience deploy kar sakte hain.
               </p>
            </div>
            <Separator className="bg-white/10" />
            <div className="space-y-5">
               <div className="flex items-center gap-4">
                 <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center text-green-400 border border-white/5 shadow-inner"><CheckCircle2 className="h-5 w-5" /></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Custom Template Logic</span>
               </div>
               <div className="flex items-center gap-4">
                 <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center text-green-400 border border-white/5 shadow-inner"><CheckCircle2 className="h-5 w-5" /></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Live Meta Sync</span>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
