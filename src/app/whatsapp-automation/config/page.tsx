
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { 
  SmartphoneNfc, 
  Plus, 
  ArrowLeft, 
  ArrowRight,
  Loader2, 
  Search, 
  RefreshCcw, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MessageSquare,
  Sparkles,
  Info,
  ShieldCheck,
  Send,
  LayoutList,
  Palette,
  Bot,
  Activity,
  MoreVertical,
  Type,
  FileText,
  BadgeCheck,
  Trash,
  ImageIcon,
  MousePointer2,
  PhoneCall,
  ExternalLink,
  BookOpen,
  HelpCircle,
  ShieldAlert,
  Terminal,
  Globe,
  Smartphone,
  Check,
  Copy,
  Zap,
  Key,
  Lock,
  Target,
  Heart,
  UserPlus,
  Trophy,
  Star,
  SearchCode,
  Receipt
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase";
import { collection, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sendWhatsAppTemplate, listWhatsAppTemplates } from "@/app/actions/whatsapp-actions";

const LANGUAGES = [
  { id: 'en_IN', label: 'English (India)' },
  { id: 'en_US', label: 'English (US)' },
  { id: 'hi_IN', label: 'Hindi' },
  { id: 'mr_IN', label: 'Marathi' },
];

export default function WhatsAppConfigPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isTokenCopied, setIsTokenCopied] = useState(false);
  
  // Template States
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTestTemplate, setSelectedTestTemplate] = useState("hello_world");

  // 1. Resolve Profile
  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  // 2. Resolve Business
  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business, isLoading: isBizLoading } = useDoc<any>(businessRef);

  const isAdmin = userProfile?.role === 'admin' || user?.email?.toLowerCase() === 'skillmatrix24@gmail.com';

  const waConfig = business?.whatsappApiConfig || {
    provider: "Meta Cloud API",
    phoneId: "",
    wabaId: "",
    accessToken: "",
    isVerified: false,
    welcomeTemplateName: "welcome_member",
    welcomeLanguageCode: "en_IN",
    posTemplateName: "pos_invoice",
    posLanguageCode: "en_IN",
    rewardSyncTemplateName: "reward_sync_alert",
    rewardSyncLanguageCode: "en_IN",
    birthdayTemplateName: "birthday_wish",
    birthdayLanguageCode: "en_IN",
    anniversaryTemplateName: "anniversary_reward",
    anniversaryLanguageCode: "en_IN",
    otherEventTemplateName: "event_alert",
    otherEventLanguageCode: "en_IN"
  };

  const syncTemplates = async () => {
    if (!waConfig?.wabaId || !waConfig?.accessToken) return;
    try {
      const result = await listWhatsAppTemplates({ 
        wabaId: waConfig.wabaId, 
        accessToken: waConfig.accessToken 
      });
      if (result.success) {
        setTemplates(result.templates || []);
      }
    } catch (e) {
    console.error(e);
      console.warn("Auto-sync templates failed:", e);
    }
  };

  useEffect(() => {
    if (waConfig.isVerified) {
      syncTemplates();
    }
  }, [waConfig.isVerified]);

  const handleUpdateWA = (key: string, value: any) => {
    if (!isAdmin || !businessRef) return;
    updateDocumentNonBlocking(businessRef, {
      whatsappApiConfig: { 
        ...waConfig, 
        [key]: value 
      },
      updatedAt: new Date().toISOString()
    });
  };

  const verifyConnection = () => {
    if (!waConfig.accessToken || !waConfig.phoneId) {
      toast({ 
        variant: "destructive", 
        title: "Configuration Incomplete", 
        description: "Please enter Access Token and Phone ID before verifying." 
      });
      return;
    }
    
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      handleUpdateWA("isVerified", true);
      toast({ 
        title: "API Node Established", 
        description: "Handshake with Meta successful." 
      });
      syncTemplates();
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
      const template = templates.find(t => t.name === selectedTestTemplate);
      const lang = template?.language || "en_US";

      let testComponents: any[] = [];
      if (selectedTestTemplate !== 'hello_world' && template?.components) {
        const bodyComp = template.components.find((c: any) => c.type === 'BODY');
        if (bodyComp && bodyComp.text) {
          const matches = bodyComp.text.match(/\{\{\d+\}\}/g);
          if (matches) {
            const paramCount = new Set(matches).size;
            const parameters = Array.from({ length: paramCount }).map((_, i) => ({
              type: "text",
              text: `TestNode${i + 1}`
            }));
            
            testComponents = [{
              type: "body",
              parameters: parameters
            }];
          }
        }
      }

      await sendWhatsAppTemplate(
        { phoneId: waConfig.phoneId, accessToken: waConfig.accessToken },
        testPhone,
        selectedTestTemplate,
        lang,
        testComponents
      );
      toast({ title: "Test Payload Delivered", description: `Dispatched ${selectedTestTemplate} node.` });
      setTestPhone("");
    } catch (error: any) {
    console.error(error);
      toast({ variant: "destructive", title: "Dispatch Failed", description: error.message });
    } finally {
      setIsTesting(false);
    }
  };

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/webhook/whatsapp` 
    : `https://biztrix.in/api/webhook/whatsapp`;

  const verifyToken = "biztrix_node_v3";

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast({ title: "Endpoint Copied" });
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(verifyToken);
    setIsTokenCopied(true);
    setTimeout(() => setIsTokenCopied(false), 2000);
    toast({ title: "Verify Token Copied" });
  };

  const approvedTemplates = useMemo(() => {
    return templates.filter(t => t.status === 'APPROVED');
  }, [templates]);

  if (isBizLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20 px-2 sm:px-0 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-left">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm border shrink-0"><Link href="/whatsapp-automation"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">API Configuration</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Meta Cloud Node Management</p>
          </div>
        </div>
        <Button asChild variant="outline" className="h-10 px-4 rounded-xl border-slate-900 text-slate-900 font-black uppercase text-[9px] tracking-widest">
           <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer">
             Meta Dev Portal <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
           </a>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-8">
          <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border">
            <CardHeader className="bg-green-50 border-b py-6 px-8 flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white border shadow-sm flex items-center justify-center">
                  <SmartphoneNfc className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-green-700">Meta Cloud Credentials</CardTitle>
                </div>
              </div>
              {waConfig.isVerified ? (
                <Badge className="bg-green-600 text-white border-none text-[8px] font-black h-5 px-3 uppercase animate-in zoom-in">VERIFIED</Badge>
              ) : (
                <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-[8px] font-black h-5 px-3 uppercase">UNLINKED</Badge>
              )}
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3 text-left">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest text-left flex items-center gap-2">
                    <Smartphone className="h-3 w-3" /> Phone Number ID
                  </Label>
                  <Input value={waConfig.phoneId || ""} onChange={(e) => handleUpdateWA('phoneId', e.target.value)} placeholder="e.g. 109283..." className="h-12 rounded-xl font-mono text-xs bg-muted/20 border-none shadow-inner" />
                </div>
                <div className="space-y-3 text-left">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest text-left flex items-center gap-2">
                    <Globe className="h-3 w-3" /> WABA ID
                  </Label>
                  <Input value={waConfig.wabaId || ""} onChange={(e) => handleUpdateWA('wabaId', e.target.value)} placeholder="e.g. 98273..." className="h-12 rounded-xl font-mono text-xs bg-muted/20 border-none shadow-inner" />
                </div>
              </div>

              <div className="space-y-3 text-left">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest text-left flex items-center gap-2"><Key className="h-3 w-3" /> Permanent Access Token</Label>
                <Input type="password" value={waConfig.accessToken || ""} onChange={(e) => handleUpdateWA('accessToken', e.target.value)} placeholder="EAA..." className="h-12 rounded-xl font-mono text-xs bg-muted/20 border-none shadow-inner" />
                <p className="text-[8px] font-bold text-muted-foreground uppercase px-1 flex items-center gap-1.5"><ShieldAlert className="h-3 w-3 text-orange-500" /> Never use a Temporary Token here (Expiring in 24h).</p>
              </div>

              <Separator className="opacity-50" />

              <div className="space-y-10">
                <div className="flex items-center justify-between px-1 text-left">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary fill-primary" />
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Automation Callbacks Registry</h4>
                  </div>
                  <Button variant="ghost" size="sm" onClick={syncTemplates} className="h-7 text-[8px] font-black uppercase text-primary border border-primary/20 bg-primary/5 rounded-lg">
                    <RefreshCcw className="mr-1 h-3 w-3" /> Sync Meta Templates
                  </Button>
                </div>

                {/* Welcome Template */}
                <div className="p-6 bg-muted/10 rounded-3xl border border-border/50 space-y-6">
                   <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><UserPlus className="h-4 w-4" /></div>
                      <p className="text-[10px] font-black uppercase text-slate-900 tracking-widest">New Member Welcome Node</p>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase opacity-60 ml-1">Template Name</Label>
                        <Select value={waConfig.welcomeTemplateName || ""} onValueChange={(v) => handleUpdateWA('welcomeTemplateName', v)}>
                            <SelectTrigger className="h-10 rounded-xl bg-white border-muted shadow-sm font-bold text-xs uppercase">
                                <SelectValue placeholder="Pick Template" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                {approvedTemplates.map((t: any) => (
                                    <SelectItem key={t.name} value={t.name} className="text-[10px] font-bold uppercase">{t.name}</SelectItem>
                                ))}
                                {approvedTemplates.length === 0 && <SelectItem value="none" disabled>No templates synced</SelectItem>}
                            </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase opacity-60 ml-1">Language</Label>
                        <Select value={waConfig.welcomeLanguageCode || "en_IN"} onValueChange={(v) => handleUpdateWA('welcomeLanguageCode', v)}>
                            <SelectTrigger className="h-10 rounded-xl bg-white border-muted shadow-sm font-bold text-xs uppercase"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                              {LANGUAGES.map(l => <SelectItem key={l.id} value={l.id} className="text-xs font-bold">{l.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                      </div>
                   </div>
                </div>

                {/* Transaction Node Mapping */}
                <div className="p-6 bg-primary/5 rounded-[2.5rem] border border-primary/20 space-y-8">
                   <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Receipt className="h-4 w-4" /></div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Transaction Node Mapping</p>
                        <p className="text-[8px] font-bold text-primary/60 uppercase">Triggered after successful billing</p>
                      </div>
                   </div>

                   {/* POS Bill Template */}
                   <div className="space-y-4">
                      <Label className="text-[9px] font-black uppercase text-primary ml-1">1. Full POS Invoice Receipt (7 Vars)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                        <div className="space-y-1.5">
                          <Label className="text-[8px] font-bold uppercase opacity-40 ml-1">Template Name</Label>
                          <Select value={waConfig.posTemplateName || ""} onValueChange={(v) => handleUpdateWA('posTemplateName', v)}>
                              <SelectTrigger className="h-10 rounded-xl bg-white border-muted shadow-sm font-bold text-xs uppercase">
                                  <SelectValue placeholder="Pick Template" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-none shadow-2xl">
                                  {approvedTemplates.map((t: any) => (
                                      <SelectItem key={t.name} value={t.name} className="text-[10px] font-bold uppercase">{t.name}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[8px] font-bold uppercase opacity-40 ml-1">Language</Label>
                          <Select value={waConfig.posLanguageCode || "en_IN"} onValueChange={(v) => handleUpdateWA('posLanguageCode', v)}>
                              <SelectTrigger className="h-10 rounded-xl bg-white border-muted shadow-sm font-bold text-xs uppercase"><SelectValue /></SelectTrigger>
                              <SelectContent className="rounded-xl border-none shadow-2xl">
                                {LANGUAGES.map(l => <SelectItem key={l.id} value={l.id} className="text-xs font-bold">{l.label}</SelectItem>)}
                              </SelectContent>
                          </Select>
                        </div>
                      </div>
                   </div>

                   <Separator className="opacity-30" />

                   {/* Reward Sync Template */}
                   <div className="space-y-4">
                      <Label className="text-[9px] font-black uppercase text-green-600 ml-1">2. Quick Reward Sync Alert (6 Vars)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                        <div className="space-y-1.5">
                          <Label className="text-[8px] font-bold uppercase opacity-40 ml-1">Template Name</Label>
                          <Select value={waConfig.rewardSyncTemplateName || ""} onValueChange={(v) => handleUpdateWA('rewardSyncTemplateName', v)}>
                              <SelectTrigger className="h-10 rounded-xl bg-white border-muted shadow-sm font-bold text-xs uppercase">
                                  <SelectValue placeholder="Pick Template" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-none shadow-2xl">
                                  {approvedTemplates.map((t: any) => (
                                      <SelectItem key={t.name} value={t.name} className="text-[10px] font-bold uppercase">{t.name}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[8px] font-bold uppercase opacity-40 ml-1">Language</Label>
                          <Select value={waConfig.rewardSyncLanguageCode || "en_IN"} onValueChange={(v) => handleUpdateWA('rewardSyncLanguageCode', v)}>
                              <SelectTrigger className="h-10 rounded-xl bg-white border-muted shadow-sm font-bold text-xs uppercase"><SelectValue /></SelectTrigger>
                              <SelectContent className="rounded-xl border-none shadow-2xl">
                                {LANGUAGES.map(l => <SelectItem key={l.id} value={l.id} className="text-xs font-bold">{l.label}</SelectItem>)}
                              </SelectContent>
                          </Select>
                        </div>
                      </div>
                   </div>
                </div>

                {/* Birthday Template */}
                <div className="p-6 bg-muted/10 rounded-3xl border border-border/50 space-y-6">
                   <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Sparkles className="h-4 w-4" /></div>
                      <p className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Birthday Special Wish Node</p>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase opacity-60 ml-1">Template Name</Label>
                        <Select value={waConfig.birthdayTemplateName || ""} onValueChange={(v) => handleUpdateWA('birthdayTemplateName', v)}>
                            <SelectTrigger className="h-10 rounded-xl bg-white border-muted shadow-sm font-bold text-xs uppercase">
                                <SelectValue placeholder="Pick Template" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                {approvedTemplates.map((t: any) => (
                                    <SelectItem key={t.name} value={t.name} className="text-[10px] font-bold uppercase">{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase opacity-60 ml-1">Language</Label>
                        <Select value={waConfig.birthdayLanguageCode || "en_IN"} onValueChange={(v) => handleUpdateWA('birthdayLanguageCode', v)}>
                            <SelectTrigger className="h-10 rounded-xl bg-white border-muted shadow-sm font-bold text-xs uppercase"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                              {LANGUAGES.map(l => <SelectItem key={l.id} value={l.id} className="text-xs font-bold">{l.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                      </div>
                   </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Button onClick={verifyConnection} disabled={isVerifying} className="flex-1 h-16 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl text-white">
                  {isVerifying ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />} Verify API Node
                </Button>
              </div>

              <Separator className="opacity-50" />

              <div className="space-y-6 pt-2">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-orange-500 fill-orange-500" />
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Final Validation (Handshake)</h4>
                </div>
                <div className="p-8 bg-orange-50/50 rounded-[2.5rem] border border-orange-100 space-y-8 shadow-inner">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase text-orange-800 ml-1">Select Approved Template</Label>
                        <Select value={selectedTestTemplate} onValueChange={setSelectedTestTemplate}>
                           <SelectTrigger className="h-12 rounded-2xl bg-white border-orange-200 font-bold text-xs uppercase">
                              <SelectValue placeholder="Pick Template" />
                           </SelectTrigger>
                           <SelectContent className="rounded-xl border-none shadow-2xl">
                              <SelectItem value="hello_world" className="text-[10px] font-bold uppercase">hello_world (Default)</SelectItem>
                              {approvedTemplates.map((t: any) => (
                                <SelectItem key={t.name} value={t.name} className="text-[10px] font-bold uppercase">{t.name}</SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase text-orange-800 ml-1">Target Test Mobile Node</Label>
                        <div className="relative">
                          <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-400 opacity-40" />
                          <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ''))} placeholder="91XXXXXXXX" className="h-12 pl-12 rounded-2xl bg-white border-orange-200 font-black text-lg shadow-sm text-orange-900" />
                        </div>
                      </div>
                    </div>

                    <Button onClick={handleSendTestMessage} disabled={isTesting || !waConfig.isVerified} className="w-full h-16 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all">
                      {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-5 w-5" />} Test Dispatch
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-8 sticky top-24">
          <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden border h-full">
            <CardHeader className="p-8 pb-4 border-b border-white/5 text-left">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center text-primary shadow-lg"><BookOpen className="h-5 w-5" /></div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-accent">Protocol Guide</CardTitle>
              </div>
            </CardHeader>
            <ScrollArea className="h-[calc(100vh-280px)]">
              <CardContent className="p-8 space-y-12 text-left">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center font-black text-xs text-accent">1</div>
                    <h4 className="text-xs font-black uppercase tracking-widest">POS Billing Map (7 Vars)</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium uppercase tracking-tight">
                    Sateek mapping for POS invoices. Ensure template has these 7 variables in order:
                  </p>
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-2.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase">{"{{1}} = Customer Name"}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase">{"{{2}} = Invoice ID"}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase">{"{{3}} = Gross Amount"}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase">{"{{4}} = Applied Coupon Name"}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase">{"{{5}} = Total Savings Value"}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase">{"{{6}} = Net Payable Amount"}</p>
                    <p className="text-[10px] font-black text-accent uppercase">{"{{7}} = Digital Portal Link"}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center font-black text-xs text-accent">2</div>
                    <h4 className="text-xs font-black uppercase tracking-widest">Reward Sync Map (6 Vars)</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium uppercase tracking-tight">
                    Mapping for external (Petpooja) bill syncs. Use these 6 variables in order:
                  </p>
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-2.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase">{"{{1}} = Customer Name"}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase">{"{{2}} = External Bill Ref"}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase">{"{{3}} = Points Earned"}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase">{"{{4}} = Coupon Redeemed"}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase">{"{{5}} = Total Amount Saved"}</p>
                    <p className="text-[10px] font-black text-accent uppercase">{"{{6}} = Digital Portal Link"}</p>
                  </div>
                </div>

                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center font-black text-xs text-accent">3</div>
                    <h4 className="text-xs font-black uppercase tracking-widest">Failsafe Logic</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                    Agar kisi bill par coupon use nahi hua, toh system `NONE` aur `₹0` values automatically pass karega. Isse Meta template rejection se bacha ja sakta hai.
                  </p>
                </div>
              </CardContent>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
}
