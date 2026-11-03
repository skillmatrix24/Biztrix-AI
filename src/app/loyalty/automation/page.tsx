"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Zap, 
  Plus, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  SmartphoneNfc, 
  History, 
  Settings2,
  Bell,
  Sparkles,
  Ticket,
  ChevronRight,
  ShieldCheck,
  Loader2,
  ToggleLeft,
  Info,
  Target,
  TrendingUp,
  ArrowUpRight,
  MessageSquare,
  Bot,
  Trash2,
  PlusCircle,
  X,
  LayoutList,
  Edit2,
  IdCard,
  Heart,
  Star,
  UserPlus,
  Gift,
  Lock,
  Terminal,
  Settings as SettingsIcon,
  BadgeCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { suggestAutomationSequence } from "@/ai/flows/suggest-automation-sequence";
import { listWhatsAppTemplates } from "@/app/actions/whatsapp-actions";

const AUTOMATION_TYPES = [
  { id: 'first_purchase', label: 'First Purchase Welcome', icon: UserPlus, desc: 'Onboarding sequence for brand new customers' },
  { id: 'member_conversion', label: 'Member Conversion', icon: Gift, desc: 'Targeted offers for non-members to join loyalty' },
  { id: 'birthday', label: 'Birthday Surprise', icon: Sparkles, desc: 'Engagement sequence on customer birth date' },
  { id: 'anniversary', label: 'Anniversary Special', icon: Heart, desc: 'Reward sequence for marriage or partnership dates' },
  { id: 'special_event', label: 'Custom Special Day', icon: Star, desc: 'Triggers for manually added family events' },
  { id: 'high_value_bill', label: 'High Value Reward', icon: Zap, desc: 'Instantly reward big spenders', hasThreshold: true },
  { id: 'points_milestone', label: 'Point Milestone', icon: Target, desc: 'Alert on reaching point targets', hasThreshold: true },
  { id: 'expiry', label: 'Membership Expiry', icon: Clock, desc: 'Sequence leading up to & after plan ends' },
  { id: 'inactive', label: 'Inactive Retention', icon: ShieldCheck, desc: 'Win-back sequence for long-term absence' },
];

const VARIABLE_HELPERS = [
  { id: '{{name}}', label: 'Customer Name' },
  { id: '{{points}}', label: 'Reward Points' },
  { id: '{{wallet}}', label: 'Cashback Balance' },
  { id: '{{track_url}}', label: 'Digital Card Link' },
  { id: '{{coupon_code}}', label: 'Reward Code' },
  { id: '{{card_number}}', label: 'Membership ID' },
  { id: '{{business_name}}', label: 'Store Name' }
];

export default function LoyaltyAutomationPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const automationQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'loyaltyAutomation'), orderBy('type', 'asc')) : null
  , [firestore, businessId]);
  const { data: automationsData, isLoading } = useCollection<any>(automationQuery);
  const automations = automationsData || [];

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const [isAiLoading, setIsAiLoading] = useState<Record<string, boolean>>({});
  const [metaTemplates, setTemplates] = useState<any[]>([]);

  const isWhatsappActive = useMemo(() => {
    return business?.activeAddonIds?.includes('feat_whatsapp') || business?.activeAddonIds?.includes('suite_growth') || business?.status === 'pro';
  }, [business]);

  // Fetch Meta Templates for Mapping
  useEffect(() => {
    const waConfig = business?.whatsappApiConfig;
    if (waConfig?.isVerified && waConfig?.wabaId && businessId) {
      // Hardened: listWhatsAppTemplates now resolves accessToken server-side
      listWhatsAppTemplates(businessId, { wabaId: waConfig.wabaId })
        .then(res => setTemplates(res.templates || []))
        .catch((error) => { console.error(error); });
    }
  }, [business?.whatsappApiConfig, businessId]);

  const handleToggle = (id: string, current: boolean) => {
    if (!businessId) return;
    const docRef = doc(firestore, 'businesses', businessId, 'loyaltyAutomation', id);
    updateDocumentNonBlocking(docRef, { isEnabled: !current, updatedAt: serverTimestamp() });
    toast({ title: current ? "Rule Deactivated" : "Rule Activated" });
  };

  const handleUpdateRule = (id: string, field: string, value: any) => {
    if (!businessId) return;
    const docRef = doc(firestore, 'businesses', businessId, 'loyaltyAutomation', id);
    updateDocumentNonBlocking(docRef, { [field]: value, updatedAt: serverTimestamp() });
  };

  const handleAddStage = (typeId: string) => {
    if (!businessId) return;
    const rule = automations.find((a: any) => a.id === typeId);
    const stages = rule?.stages || [];
    const newStage = {
      id: `st_${Date.now()}`,
      days: 0,
      template: "Namaste {{name}}!",
      isMetaTemplate: false,
      metaTemplateName: "",
      parameters: ["{{name}}", "{{track_url}}"]
    };
    handleUpdateRule(typeId, 'stages', [...stages, newStage]);
  };

  const removeStage = (typeId: string, stageId: string) => {
    const rule = automations.find((a: any) => a.id === typeId);
    const updated = (rule?.stages || []).filter((s: any) => s.id !== stageId);
    handleUpdateRule(typeId, 'stages', updated);
  };

  const updateStage = (typeId: string, stageId: string, field: string, value: any) => {
    const rule = automations.find((a: any) => a.id === typeId);
    const updated = (rule?.stages || []).map((s: any) => s.id === stageId ? { ...s, [field]: value } : s);
    handleUpdateRule(typeId, 'stages', updated);
  };

  const handleAiSequence = async (typeId: string) => {
    if (!businessId) return;
    setIsAiLoading(prev => ({ ...prev, [typeId]: true }));
    try {
      const result = await suggestAutomationSequence({
        businessName: business?.name || "Biztrix Store",
        ruleType: typeId,
      });
      const newStages = result.stages.map(s => ({
        id: `st_${Math.random().toString(36).substr(2, 9)}`,
        days: s.days,
        template: s.template,
        isMetaTemplate: false,
        metaTemplateName: "",
        parameters: ["{{name}}", "{{track_url}}"]
      }));
      handleUpdateRule(typeId, 'stages', newStages);
      toast({ title: "AI Sequence Ready" });
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "AI Error" });
    } finally {
      setIsAiLoading(prev => ({ ...prev, [typeId]: false }));
    }
  };

  const initializeRule = (typeId: string) => {
    if (!businessId) return;
    const docRef = doc(firestore, 'businesses', businessId, 'loyaltyAutomation', typeId);
    const defaults = {
      id: typeId, type: typeId, isEnabled: false, thresholdValue: 0, whatsappNotify: false,
      stages: [{ id: `st_init`, days: 0, template: "Namaste {{name}}!", isMetaTemplate: false, parameters: ["{{name}}"] }],
      createdAt: serverTimestamp()
    };
    setDocumentNonBlocking(docRef, defaults, { merge: true });
    toast({ title: "Sequence Initialized" });
  };

  if (isLoading) return <div className="py-20 text-center opacity-40"><Loader2 className="animate-spin h-10 w-10 mx-auto text-primary" /></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20 px-2 sm:px-0 text-left">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm border shrink-0"><Link href="/loyalty"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Automation Roadmap</h2>
          <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1.5 opacity-60">Phase 4: Multi-Step Logic Hub</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          {AUTOMATION_TYPES.map((type) => {
            const rule = automations.find((a: any) => a.id === type.id);
            const Icon = type.icon;
            const stages = rule?.stages || [];
            
            return (
              <Card key={type.id} className={cn(
                "border-none shadow-md bg-white rounded-[2rem] overflow-hidden border transition-all",
                rule?.isEnabled ? "ring-2 ring-primary/20 shadow-xl" : "opacity-80 grayscale-[0.2]"
              )}>
                <CardHeader className="p-6 md:p-8 bg-muted/20 border-b flex flex-row items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner shrink-0", rule?.isEnabled ? "bg-primary text-white" : "bg-white text-muted-foreground border")}><Icon className="h-6 w-6" /></div>
                    <div className="min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base md:text-xl font-black uppercase tracking-tight truncate">{type.label}</CardTitle>
                        {rule?.isEnabled && <Badge className="bg-green-50 text-white border-none text-[7px] font-black h-4 px-1.5 uppercase">Active</Badge>}
                      </div>
                      <CardDescription className="text-[9px] font-bold uppercase tracking-widest">{type.desc}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {rule ? <Switch checked={rule.isEnabled} onCheckedChange={() => handleToggle(rule.id, rule.isEnabled)} className="data-[state=checked]:bg-primary scale-110" /> : <Button onClick={() => initializeRule(type.id)} variant="outline" size="sm" className="h-9 px-6 text-[10px] font-black uppercase rounded-xl">Init Node</Button>}
                  </div>
                </CardHeader>
                
                {rule && rule.isEnabled && (
                  <CardContent className="p-6 md:p-10 space-y-12 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-8">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <LayoutList className="h-4 w-4 text-primary" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Sequence Timeline</h4>
                        </div>
                        <div className="flex gap-2">
                           <Button variant="ghost" size="sm" disabled={isAiLoading[type.id]} onClick={() => handleAiSequence(type.id)} className="h-8 rounded-xl bg-primary/5 text-primary text-[8px] font-black uppercase gap-1.5">{isAiLoading[type.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3.5 w-3.5" />} AI Suggest</Button>
                           <Button onClick={() => handleAddStage(type.id)} variant="outline" size="sm" className="h-8 rounded-xl text-[9px] font-black uppercase"><Plus className="h-3 w-3 mr-1" /> Add Step</Button>
                        </div>
                      </div>

                      <div className="relative space-y-10 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
                        {stages.map((stage: any, sIdx: number) => (
                          <div key={stage.id} className="relative pl-12">
                            <div className="absolute left-0 top-1 h-10 w-10 rounded-full border-4 border-white bg-slate-900 text-white flex items-center justify-center shadow-lg z-10 font-black text-[10px]">{sIdx + 1}</div>
                            <div className="p-6 rounded-[2rem] bg-slate-50 border border-border/50 space-y-6 text-left">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                <div className="flex items-center gap-6 w-full sm:w-auto">
                                   <div className="space-y-1"><Label className="text-[8px] font-black uppercase text-muted-foreground ml-1">Offset Days</Label><Input type="number" value={stage.days} onChange={(e) => updateStage(rule.id, stage.id, 'days', parseInt(e.target.value))} className="h-9 w-20 rounded-lg font-black text-center" /></div>
                                   <div className="flex items-center gap-3 bg-white p-2 px-3 rounded-xl border">
                                      <span className="text-[8px] font-black uppercase text-primary">Meta Template Mode</span>
                                      <Switch checked={!!stage.isMetaTemplate} onCheckedChange={(v) => updateStage(rule.id, stage.id, 'isMetaTemplate', v)} className="scale-75 data-[state=checked]:bg-primary" />
                                   </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/40 hover:text-destructive" onClick={() => removeStage(rule.id, stage.id)}><Trash2 className="h-4 w-4" /></Button>
                              </div>

                              {stage.isMetaTemplate ? (
                                <div className="space-y-6 p-6 bg-primary/5 rounded-2xl border border-primary/10 animate-in slide-in-from-top-2">
                                   <div className="space-y-2">
                                      <Label className="text-[9px] font-black uppercase text-primary">Select Approved Template</Label>
                                      <Select value={stage.metaTemplateName || ""} onValueChange={(v) => updateStage(rule.id, stage.id, 'metaTemplateName', v)}>
                                        <SelectTrigger className="h-11 rounded-xl bg-white font-bold text-xs"><SelectValue placeholder="Pick Meta Node..." /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                          {metaTemplates.length === 0 ? <SelectItem value="none" disabled>No templates synced</SelectItem> : metaTemplates.map(t => <SelectItem key={t.name} value={t.name} className="text-[10px] font-bold uppercase">{t.name}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                   </div>
                                   <div className="space-y-4">
                                      <div className="flex items-center justify-between"><Label className="text-[9px] font-black uppercase text-primary">Parameter Mapping</Label><Badge variant="outline" className="text-[6px] h-3 px-1 border-primary/20 text-primary">{"MAP {{1}}, {{2}}..."}</Badge></div>
                                      <div className="grid grid-cols-1 gap-2">
                                        {(stage.parameters || ["{{name}}", "{{track_url}}"]).map((p: string, pIdx: number) => (
                                          <div key={pIdx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-border/50">
                                            <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center font-black text-[9px] text-primary">P{pIdx+1}</div>
                                            <Select value={p} onValueChange={(v) => { const updated = [...stage.parameters]; updated[pIdx] = v; updateStage(rule.id, stage.id, 'parameters', updated); }}>
                                              <SelectTrigger className="h-8 border-none bg-transparent font-bold text-[10px] uppercase shadow-none"><SelectValue /></SelectTrigger>
                                              <SelectContent className="rounded-xl">{VARIABLE_HELPERS.map(vh => <SelectItem key={vh.id} value={vh.id} className="text-[10px] font-bold uppercase">{vh.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                          </div>
                                        ))}
                                      </div>
                                   </div>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Free-form Session Template</Label>
                                    <div className="flex flex-wrap gap-1">
                                      {VARIABLE_HELPERS.map(v => <button key={v.id} onClick={() => updateStage(rule.id, stage.id, 'template', (stage.template || "") + " " + v.id)} className="text-[6px] font-black bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded uppercase hover:bg-primary hover:text-white transition-colors">{v.id}</button>)}
                                    </div>
                                  </div>
                                  <Textarea value={stage.template || ""} onChange={(e) => updateStage(rule.id, stage.id, 'template', e.target.value)} className="min-h-[100px] rounded-2xl bg-white border-none shadow-inner p-4 text-xs font-medium" />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className={cn("flex flex-col sm:flex-row items-center justify-between p-6 rounded-[2rem] border gap-6 transition-all", isWhatsappActive ? "bg-green-50 border-green-100 shadow-sm" : "bg-muted/30 opacity-60")}>
                      <div className="flex items-center gap-4 text-left">
                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0", isWhatsappActive ? "bg-green-600" : "bg-slate-400")}><SmartphoneNfc className="h-6 w-6" /></div>
                        <div className="text-left"><p className="text-xs font-black uppercase">WhatsApp Dispatch Switch</p><p className="text-[9px] font-bold uppercase opacity-60">{isWhatsappActive ? 'Live Syncing with Meta API' : 'Activation Pending'}</p></div>
                      </div>
                      <div className="flex items-center gap-4"><span className="text-[9px] font-black uppercase tracking-widest">{rule.whatsappNotify ? 'ACTIVE' : 'MUTED'}</span><Switch checked={!!rule.whatsappNotify} onCheckedChange={(v) => handleUpdateRule(rule.id, 'whatsappNotify', v)} className={cn("scale-110", isWhatsappActive ? "data-[state=checked]:bg-green-600" : "")} /></div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        <div className="lg:col-span-4 space-y-8">
           <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden sticky top-24 text-left">
              <CardContent className="p-8 space-y-8">
                 <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><Sparkles className="h-6 w-6 text-accent fill-accent" /></div>
                 <div className="space-y-2">
                    <h3 className="text-xl font-bold uppercase tracking-tight">The Mapping Logic</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">Meta Cloud API Outbound communication ke liye approved templates maangta hai. Humara <strong>Mapping Hub</strong> Biztrix ke live data ko Meta ke positional parameters se sateek (precise) tarike se link karta hai.</p>
                 </div>
                 <Separator className="bg-white/10" />
                 <div className="space-y-6">
                    <div className="flex items-start gap-4">
                       <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10"><BadgeCheck className="h-4 w-4 text-accent" /></div>
                       <div><p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Compliance Node</p><p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed">Humesha hara (approved) template hi use karein taaki quality rating thik rahe.</p></div>
                    </div>
                    <div className="flex items-start gap-4">
                       <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10"><SmartphoneNfc className="h-4 w-4 text-accent" /></div>
                       <div><p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Fail-safe Logic</p><p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed">Agar template approved nahi hai, toh system automation ko temporarily hold kar dega.</p></div>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
