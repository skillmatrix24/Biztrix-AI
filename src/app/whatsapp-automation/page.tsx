
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { 
  SmartphoneNfc, 
  Zap, 
  Clock, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  ArrowRight,
  Smartphone,
  Send,
  Loader2, 
  LayoutList, 
  Bot, 
  Sparkles, 
  ChevronRight, 
  X,
  PhoneCall,
  ExternalLink,
  Lock,
  Info,
  Settings2,
  Heart,
  Target,
  Trophy,
  UserPlus,
  Gem,
  Gift,
  Search,
  History,
  Activity,
  Palette,
  ShieldCheck,
  Type,
  KeyRound,
  MoreVertical,
  AlertCircle,
  Play,
  RotateCcw,
  ArrowRightLeft,
  Settings as SettingsIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp, where } from "firebase/firestore";
import Link from "next/link";
import { format } from "date-fns";
import { suggestAutomationTemplate } from "@/ai/flows/suggest-automation-template";

type ButtonAction = {
  id: string;
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  label: string;
  value?: string;
};

type Step = {
  id: string;
  day: number;
  label: string;
  template: string;
  isActive: boolean;
  buttons?: ButtonAction[];
};

type KeywordTrigger = {
  id: string;
  keywords: string;
  matchType: 'exact' | 'contains';
  template: string;
  isEnabled: boolean;
  buttons?: ButtonAction[];
};

const TRIGGER_TYPES = [
  { id: 'birthday', label: 'Birthday Wish', icon: Sparkles, desc: 'Send a gift on their special day' },
  { id: 'anniversary', label: 'Anniversary', icon: Heart, desc: 'Celebratory reward sequence' },
  { id: 'high_value_bill', label: 'High Value Bill', icon: Zap, desc: 'Instantly reward big spenders', hasThreshold: true },
  { id: 'points_milestone', label: 'Points Milestone', icon: Trophy, desc: 'Alert on reaching point targets', hasThreshold: true },
  { id: 'expiry_alert', label: 'Card Expiry', icon: Clock, desc: 'Nudge before membership ends' },
  { id: 'conversion', label: 'Join Nudge', icon: UserPlus, desc: 'Convert non-members after sale' },
];

export default function WhatsAppAutomationPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  // Timeline Data
  const stepsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'whatsappFollowups'), orderBy('day', 'asc')) : null
  , [firestore, businessId]);
  const { data: stepsRaw } = useCollection<Step>(stepsQuery);
  const steps = stepsRaw || [];

  // Triggers Data
  const triggersQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'whatsappTriggers') : null
  , [firestore, businessId]);
  const { data: triggersRaw } = useCollection<any>(triggersQuery);
  const triggers = triggersRaw || [];

  // Keywords Data
  const keywordsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'whatsappKeywords') : null
  , [firestore, businessId]);
  const { data: keywordsRaw } = useCollection<KeywordTrigger>(keywordsQuery);
  const keywordResponders = keywordsRaw || [];

  const [activeTab, setActiveTab] = useState("timeline");
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [editingTrigger, setEditingTrigger] = useState<any>(null);
  const [editingKeyword, setEditingKeyword] = useState<KeywordTrigger | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [previewNode, setPreviewNode] = useState<any>(null);

  // Form States
  const [newStep, setNewStep] = useState({ day: 1, label: "", template: "" });
  const [newKeyword, setNewKeyword] = useState({ keywords: "", template: "" });

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simInput, setSimInput] = useState("");
  const [simMessages, setSimMessages] = useState<any[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'timeline' && steps.length > 0) setPreviewNode(steps[0]);
    else if (activeTab === 'triggers' && triggers.length > 0) setPreviewNode(triggers[0]);
    else if (activeTab === 'keywords' && keywordResponders.length > 0) setPreviewNode(keywordResponders[0]);
  }, [activeTab, steps, triggers, keywordResponders]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [simMessages, isBotTyping]);

  const handleToggleGlobal = (val: boolean) => {
    if (!businessRef) return;
    updateDocumentNonBlocking(businessRef, { whatsappEnabled: val });
    toast({ title: val ? "Flows Online" : "Automation Muted" });
  };

  const handleSaveStep = () => {
    if (!businessId || !editingStep) return;
    const docRef = doc(firestore, 'businesses', businessId, 'whatsappFollowups', editingStep.id);
    updateDocumentNonBlocking(docRef, { ...editingStep, updatedAt: serverTimestamp() });
    setEditingStep(null);
    toast({ title: "Timeline Stage Saved" });
  };

  const handleSaveTrigger = () => {
    if (!businessId || !editingTrigger) return;
    const docRef = doc(firestore, 'businesses', businessId, 'whatsappTriggers', editingTrigger.id);
    setDocumentNonBlocking(docRef, { ...editingTrigger, updatedAt: serverTimestamp() }, { merge: true });
    setEditingTrigger(null);
    toast({ title: "Trigger Botflow Saved" });
  };

  const handleSaveKeyword = () => {
    if (!businessId || !editingKeyword) return;
    const docRef = doc(firestore, 'businesses', businessId, 'whatsappKeywords', editingKeyword.id);
    updateDocumentNonBlocking(docRef, { ...editingKeyword, updatedAt: serverTimestamp() });
    setEditingKeyword(null);
    toast({ title: "Keyword Node Updated" });
  };

  const handleAddStep = () => {
    if (!businessId || !newStep.label) return;
    addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'whatsappFollowups'), {
      ...newStep,
      isActive: true,
      buttons: [],
      createdAt: serverTimestamp()
    });
    setIsAdding(false);
    setNewStep({ day: 1, label: "", template: "" });
    toast({ title: "Stage Added" });
  };

  const handleAddKeyword = () => {
    if (!businessId || !newKeyword.keywords) return;
    addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'whatsappKeywords'), {
      ...newKeyword,
      matchType: "exact",
      isEnabled: true,
      buttons: [],
      createdAt: serverTimestamp()
    });
    setIsAddingKeyword(false);
    setNewKeyword({ keywords: "", template: "" });
    toast({ title: "Keyword Responder Active" });
  };

  const handleDeleteStep = (id: string) => {
    if (!businessId) return;
    deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'whatsappFollowups', id));
    toast({ title: "Stage Removed", variant: "destructive" });
  };

  const handleDeleteKeyword = (id: string) => {
    if (!businessId) return;
    deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'whatsappKeywords', id));
    toast({ title: "Keyword Removed", variant: "destructive" });
  };

  const handleAiTriggerTemplate = async (trigger: any) => {
    if (!trigger) return;
    setIsAiLoading(true);
    try {
      const result = await suggestAutomationTemplate({
        businessName: business?.name || profile?.businessName || "Our Store",
        ruleType: trigger.type,
      });
      setEditingTrigger({ ...trigger, template: result.template });
      toast({ title: "AI Draft Ready" });
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "AI Error" });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simInput.trim()) return;

    const userText = simInput.trim();
    const userMsg = { role: 'user', text: userText, time: format(new Date(), 'HH:mm') };
    setSimMessages(prev => [...prev, userMsg]);
    const input = userText.toLowerCase();
    setSimInput("");
    setIsBotTyping(true);

    setTimeout(() => {
      // Improved Match Logic: Scan all keywords in all responders
      const match = keywordResponders.find(kr => {
        if (!kr.isEnabled) return false;
        const kwArray = kr.keywords.toLowerCase().split(',').map(k => k.trim()).filter(Boolean);
        
        if (kr.matchType === 'exact') {
          return kwArray.includes(input);
        } else {
          return kwArray.some(k => input.includes(k));
        }
      });

      if (match) {
        setSimMessages(prev => [...prev, { 
          role: 'bot', 
          text: match.template, 
          buttons: match.buttons || [], 
          time: format(new Date(), 'HH:mm') 
        }]);
      } else {
        setSimMessages(prev => [...prev, { 
          role: 'bot', 
          text: "Namaste! Main aapka Biztrix Assistant hoon. Maine aapka message nahi samjha. Kya main aapki kisi aur cheez mein madad kar sakta hoon?", 
          time: format(new Date(), 'HH:mm') 
        }]);
      }
      setIsBotTyping(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 md:space-y-10 pb-20 px-2 sm:px-0 text-left">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-green-50 flex items-center justify-center shrink-0 border border-green-100 shadow-inner">
            <SmartphoneNfc className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">Advanced Nurturing</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Real-time Automation Node</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-xl border shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Automation Mode</span>
            <Switch checked={!!business?.whatsappEnabled} onCheckedChange={handleToggleGlobal} className="data-[state=checked]:bg-green-600 scale-75" />
          </div>
          <Button asChild variant="outline" className="h-10 px-4 rounded-xl border-primary/20 text-primary font-black uppercase text-[9px]">
            <Link href="/whatsapp-automation/config"><SettingsIcon className="mr-2 h-4 w-4" /> Config</Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border h-14 p-1.5 rounded-2xl shadow-sm mb-10 flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="timeline" className="flex-1 text-[10px] font-black uppercase px-6 gap-2"><LayoutList className="h-4 w-4" /> Sequence Timeline</TabsTrigger>
          <TabsTrigger value="triggers" className="flex-1 text-[10px] font-black uppercase px-6 gap-2"><Zap className="h-4 w-4" /> Event Triggers</TabsTrigger>
          <TabsTrigger value="keywords" className="flex-1 text-[10px] font-black uppercase px-6 gap-2 text-primary"><KeyRound className="h-4 w-4" /> Keyword Responders</TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1 text-[10px] font-black uppercase px-6 gap-2"><Activity className="h-4 w-4" /> Telemetry</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-10">
            <TabsContent value="timeline" className="m-0 space-y-8 animate-in fade-in">
              <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border">
                <CardHeader className="bg-primary/5 border-b py-6 px-8 flex justify-between items-center">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><Clock className="h-4 w-4" /> Follow-up Sequence</CardTitle>
                  <Button onClick={() => setIsAdding(true)} size="sm" className="h-8 px-4 rounded-xl text-[9px] font-black uppercase shadow-lg"><Plus className="mr-1.5 h-3.5 w-3.5" /> Add Stage</Button>
                </CardHeader>
                <CardContent className="p-8">
                  {steps.length === 0 ? <div className="p-20 text-center border-2 border-dashed rounded-[3rem] opacity-30 italic uppercase text-[10px] font-black">No stages configured.</div> : (
                    <div className="relative space-y-8 before:absolute before:left-[19px] before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-muted">
                      {steps.map((step, idx) => (
                        <div key={step.id} className="relative pl-12 group animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                          <div className={cn("absolute left-0 top-1 h-10 w-10 rounded-full border-4 border-white flex items-center justify-center shadow-lg z-10 transition-all", step.isActive ? "bg-green-600 text-white" : "bg-slate-300 text-white")}><span className="text-[10px] font-black">{step.day}</span></div>
                          <div className={cn("p-6 rounded-[2rem] border transition-all cursor-pointer bg-white", previewNode?.id === step.id ? "ring-2 ring-primary border-primary/20 shadow-xl" : "hover:border-primary/20 shadow-sm")} onClick={() => { setPreviewNode(step); setIsSimulating(false); }}>
                            <div className="flex items-center justify-between mb-4"><h4 className="font-black text-slate-900 uppercase text-xs tracking-tight">{step.label}</h4><div className="flex gap-2"><Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-primary" onClick={(e) => { e.stopPropagation(); setEditingStep(step); }}><Edit2 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteStep(step.id); }}><Trash2 className="h-4 w-4" /></Button></div></div>
                            <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic truncate">"{step.template}"</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="triggers" className="m-0 space-y-8 animate-in fade-in">
              <div className="grid grid-cols-1 gap-6">
                {TRIGGER_TYPES.map((type) => {
                  const rule = triggers.find((t: any) => t.type === type.id);
                  const Icon = type.icon;
                  return (
                    <Card key={type.id} className={cn("border-none shadow-md bg-white rounded-[2rem] overflow-hidden border transition-all", rule?.isEnabled ? "ring-2 ring-primary/10 shadow-xl" : "opacity-70 grayscale-[0.3]")}>
                      <CardHeader className="bg-muted/30 border-b py-6 px-8 flex flex-row items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner shrink-0", rule?.isEnabled ? "bg-primary text-white" : "bg-white text-muted-foreground border")}><Icon className="h-6 w-6" /></div>
                            <div><div className="flex items-center gap-2"><CardTitle className="text-base font-black uppercase tracking-tight">{type.label}</CardTitle>{rule?.isEnabled && <Badge className="bg-green-50 text-white border-none text-[7px] font-black h-4 px-1.5 uppercase">Active</Badge>}</div><CardDescription className="text-[9px] font-bold uppercase tracking-widest">{type.desc}</CardDescription></div>
                         </div>
                         <Switch checked={!!rule?.isEnabled} onCheckedChange={(v) => { if (!businessId) return; const docRef = doc(firestore, 'businesses', businessId, 'whatsappTriggers', type.id); if (!rule) setDocumentNonBlocking(docRef, { id: type.id, type: type.id, label: type.label, template: "Hi {{name}}!", isEnabled: true, createdAt: serverTimestamp() }, { merge: true }); else updateDocumentNonBlocking(docRef, { isEnabled: v }); }} className="data-[state=checked]:bg-primary scale-110" />
                      </CardHeader>
                      {rule?.isEnabled && (
                        <CardContent className="p-8 space-y-6 animate-in slide-in-from-top-2" onClick={() => { setPreviewNode(rule); setIsSimulating(false); }}>
                           <div className="p-5 bg-muted/20 rounded-2xl border-none shadow-inner text-xs font-medium text-slate-600 leading-relaxed italic cursor-pointer">"{rule.template}"</div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="keywords" className="m-0 space-y-8 animate-in fade-in">
              <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border">
                <CardHeader className="bg-muted/30 border-b py-6 px-8 flex justify-between items-center">
                  <div className="flex items-center gap-3"><KeyRound className="h-5 w-5 text-primary" /><CardTitle className="text-xs font-black uppercase tracking-widest text-primary">Inbound Keywords</CardTitle></div>
                  <Button onClick={() => setIsAddingKeyword(true)} size="sm" className="h-8 px-4 rounded-xl text-[9px] font-black uppercase shadow-lg"><Plus className="mr-1.5 h-3.5 w-3.5" /> New Node</Button>
                </CardHeader>
                <CardContent className="p-0">
                   {keywordResponders.length === 0 ? <div className="p-20 text-center opacity-30 italic text-sm font-black uppercase">No keyword responders.</div> : (
                     <div className="divide-y">
                       {keywordResponders.map((kw) => (
                         <div key={kw.id} className={cn("p-6 flex items-center justify-between hover:bg-muted/5 transition-all cursor-pointer", previewNode?.id === kw.id && "bg-primary/5 ring-1 ring-inset ring-primary/20")} onClick={() => { setPreviewNode(kw); setIsSimulating(false); }}>
                            <div className="flex items-center gap-4">
                               <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><Type className="h-5 w-5" /></div>
                               <div className="min-w-0"><div className="flex items-center gap-2"><p className="text-sm font-black text-slate-900 truncate">{kw.keywords}</p><Badge variant="outline" className="text-[7px] font-black uppercase border-primary/20 text-primary h-4">{kw.matchType}</Badge></div><p className="text-[10px] text-muted-foreground line-clamp-1 mt-1">Reply: "{kw.template}"</p></div>
                            </div>
                            <div className="flex items-center gap-2">
                               <Switch checked={kw.isEnabled} onCheckedChange={(v) => businessId && updateDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'whatsappKeywords', kw.id), { isEnabled: v })} className="scale-75 data-[state=checked]:bg-green-600" />
                               <DropdownMenu>
                                 <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                 <DropdownMenuContent align="end" className="rounded-xl border-none shadow-2xl p-1.5">
                                    <DropdownMenuItem className="text-[10px] font-bold uppercase p-2.5 rounded-lg cursor-pointer" onClick={() => setEditingKeyword(kw)}><Edit2 className="mr-2 h-3.5 w-3.5" /> Edit Node</DropdownMenuItem>
                                    <DropdownMenuItem className="text-[10px] font-bold uppercase p-2.5 rounded-lg cursor-pointer text-destructive focus:text-destructive" onClick={() => handleDeleteKeyword(kw.id)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Node</DropdownMenuItem>
                                 </DropdownMenuContent>
                               </DropdownMenu>
                            </div>
                         </div>
                       ))}
                     </div>
                   )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="analytics" className="m-0 animate-in fade-in">
                <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border">
                  <CardHeader className="bg-muted/30 border-b py-5 px-8">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" /> Node Telemetry
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-20 text-center opacity-30 italic text-sm font-black uppercase tracking-widest">
                      <ShieldCheck className="h-12 w-12 mx-auto mb-4" /> 
                      No synchronization errors detected. Your node health is 100%.
                  </CardContent>
                </Card>
            </TabsContent>
          </div>

          <div className="lg:col-span-5 space-y-8 sticky top-24">
            <Card className="border-none shadow-2xl bg-slate-900 rounded-[3.5rem] overflow-hidden p-8 sm:p-10 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-8">
                 <p className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">Real-time Node Preview</p>
                 <div className="flex items-center gap-2 bg-white/5 p-1 px-3 rounded-full border border-white/10">
                    <span className="text-[8px] font-black text-slate-400 uppercase">Simulator</span>
                    <Switch checked={isSimulating} onCheckedChange={setIsSimulating} className="scale-75 data-[state=checked]:bg-accent" />
                 </div>
              </div>

              <div className="w-full max-w-[300px] bg-slate-100 rounded-[3rem] border-[10px] border-slate-800 aspect-[9/18.5] shadow-2xl relative overflow-hidden flex flex-col">
                <div className="h-10 bg-slate-800 flex items-center justify-between px-8 pt-3 shrink-0">
                  <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-white/40" /><div className="h-1.5 w-1.5 rounded-full bg-white/40" /></div>
                  <div className="h-2.5 w-14 rounded-full bg-slate-700" />
                  <div className="h-1.5 w-3 rounded-full bg-white/40" />
                </div>
                <div className="flex-1 bg-[url('https://picsum.photos/seed/wa/400/800')] bg-cover opacity-10 absolute inset-0 grayscale" />
                
                <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
                   {!isSimulating ? (
                     <div className="flex-1 p-5 flex flex-col">
                        <div className="max-w-[90%] bg-white rounded-2xl rounded-tl-none shadow-md p-4 animate-in slide-in-from-left-2 duration-500 self-start">
                          <p className="text-[11px] text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{previewNode ? previewNode.template.replace(/\{\{\w+\}\}/g, '_____') : "Select a node..."}</p>
                          <div className="flex justify-end mt-1"><span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">12:30 PM • ✓✓</span></div>
                        </div>
                        <div className="mt-auto space-y-2 pb-4">
                          {(previewNode?.buttons || []).map((btn: any) => (
                            <div key={btn.id} className="p-3 bg-white/90 backdrop-blur-md rounded-2xl border border-white/40 text-[9px] font-black uppercase text-primary text-center shadow-sm flex items-center justify-center gap-2">
                               {btn.type === 'QUICK_REPLY' ? <MessageSquare className="h-3 w-3" /> : btn.type === 'URL' ? <ExternalLink className="h-3 w-3" /> : <PhoneCall className="h-3 w-3" />}
                               {btn.label}
                            </div>
                          ))}
                        </div>
                     </div>
                   ) : (
                     <div className="flex-1 flex flex-col h-full bg-[#E5DDD5]">
                        <ScrollArea className="flex-1 p-4">
                           <div className="space-y-4">
                              {simMessages.map((m, i) => (
                                <div key={i} className={cn("max-w-[85%] p-3 rounded-2xl shadow-sm text-[11px] leading-tight animate-in slide-in-from-bottom-2", m.role === 'user' ? "bg-green-100 self-end ml-auto rounded-tr-none text-green-900 font-bold" : "bg-white self-start rounded-tl-none text-slate-700 font-medium")}>
                                   <p>{m.text}</p>
                                   {m.buttons && m.buttons.length > 0 && (
                                     <div className="mt-4 space-y-1.5">
                                       {m.buttons.map((b: any) => <div key={b.id} className="p-2 bg-slate-50 rounded-lg text-center font-black uppercase text-[8px] border text-primary">{b.label}</div>)}
                                     </div>
                                   )}
                                   <div className="flex justify-end mt-1"><span className="text-[7px] opacity-40 uppercase">{m.time}</span></div>
                                </div>
                              ))}
                              {isBotTyping && <div className="bg-white p-2 rounded-xl rounded-tl-none w-12 flex justify-center gap-1 shadow-sm"><div className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" /><div className="h-1 w-1 bg-slate-400 rounded-full animate-bounce delay-100" /><div className="h-1 w-1 bg-slate-400 rounded-full animate-bounce delay-200" /></div>}
                              <div ref={scrollRef} />
                           </div>
                        </ScrollArea>
                        <form onSubmit={handleSimulate} className="p-3 bg-white border-t flex gap-2 shrink-0">
                           <Input value={simInput} onChange={(e) => setSimInput(e.target.value)} placeholder="Type a keyword (e.g. Hi)..." className="h-9 rounded-xl text-[10px] font-bold border-none bg-muted/20 shadow-inner" />
                           <Button type="submit" size="icon" className="h-9 w-9 rounded-xl shrink-0"><Send className="h-4 w-4" /></Button>
                        </form>
                     </div>
                   )}
                </div>
              </div>
              
              <div className="mt-10 p-5 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-4">
                <Info className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <p className="text-[9px] font-medium text-slate-400 leading-relaxed uppercase italic">
                  Bot Flow uses official Meta Components. Interactive buttons increase CTR (Click-Through Rate) by up to 3X.
                </p>
              </div>

              <Card className="border-none shadow-lg bg-white rounded-[2.5rem] overflow-hidden border mt-6">
                <CardHeader className="bg-muted/30 border-b py-5 px-6"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Settings2 className="h-4 w-4" /> Safety Protocol</CardTitle></CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl border border-orange-100 shadow-sm">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-black uppercase text-orange-800">Spam Mitigation</Label>
                        <p className="text-[8px] text-orange-700/70 font-bold uppercase">Rate limit: 1 msg / 5 sec</p>
                      </div>
                      <Switch defaultChecked className="scale-75 data-[state=checked]:bg-orange-600" />
                    </div>
                </CardContent>
              </Card>
            </Card>
          </div>
        </div>
      </Tabs>

      {/* DIALOGS */}
      <BotflowDialog isOpen={!!editingStep} onOpenChange={(o: boolean) => !o && setEditingStep(null)} node={editingStep} onSave={handleSaveStep} onUpdate={setEditingStep} />
      <BotflowDialog isOpen={!!editingTrigger} onOpenChange={(o: boolean) => !o && setEditingTrigger(null)} node={editingTrigger} onSave={handleSaveTrigger} onUpdate={setEditingTrigger} onAiSuggest={() => handleAiTriggerTemplate(editingTrigger)} isAiLoading={isAiLoading} />
      <BotflowDialog isOpen={!!editingKeyword} onOpenChange={(o: boolean) => !o && setEditingKeyword(null)} node={editingKeyword} onSave={handleSaveKeyword} onUpdate={setEditingKeyword} isKeyword />
      
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl">
          <DialogHeader><DialogTitle>Add Stage</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Day Offset</Label><Input type="number" value={newStep.day} onChange={(e) => setNewStep({...newStep, day: parseInt(e.target.value)})} /></div>
              <div><Label>Label</Label><Input value={newStep.label} onChange={(e) => setNewStep({...newStep, label: e.target.value})} /></div>
            </div>
            <div><Label>Message</Label><Textarea value={newStep.template} onChange={(e) => setNewStep({...newStep, template: e.target.value})} /></div>
          </div>
          <DialogFooter><Button onClick={handleAddStep} className="w-full">Initialize Stage</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddingKeyword} onOpenChange={setIsAddingKeyword}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl">
          <DialogHeader><DialogTitle>New Keyword Node</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Keywords (Comma separated)</Label><Input value={newKeyword.keywords} onChange={(e) => setNewKeyword({...newKeyword, keywords: e.target.value})} placeholder="e.g. hi, hello, namaste" /></div>
            <div><Label>Reply Template</Label><Textarea value={newKeyword.template} onChange={(e) => setNewKeyword({...newKeyword, template: e.target.value})} /></div>
          </div>
          <DialogFooter><Button onClick={handleAddKeyword} className="w-full">Activate Node</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BotflowDialog({ isOpen, onOpenChange, node, onSave, onUpdate, isKeyword = false, onAiSuggest, isAiLoading }: any) {
  if (!node) return null;
  const addBtn = () => { const newBtn: ButtonAction = { id: `btn_${Date.now()}`, type: 'QUICK_REPLY', label: 'Click Me' }; onUpdate({ ...node, buttons: [...(node.buttons || []), newBtn] }); };
  const removeBtn = (id: string) => { onUpdate({ ...node, buttons: (node.buttons || []).filter((b: any) => b.id !== id) }); };
  const updateBtn = (id: string, key: string, value: any) => { onUpdate({ ...node, buttons: (node.buttons || []).map((b: any) => b.id === id ? { ...b, [key]: value } : b) }); };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden text-left">
        <DialogHeader className="p-8 bg-slate-900 text-white text-left shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><Edit2 className="h-6 w-6 text-accent" /></div>
            <div><DialogTitle className="text-xl">Edit {isKeyword ? 'Keyword' : 'Botflow'} Node</DialogTitle><DialogDescription className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Configure logic & content</DialogDescription></div>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="p-8 space-y-10">
            {isKeyword && (
              <div className="space-y-4"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Trigger Keywords</Label><Input value={node.keywords} onChange={(e) => onUpdate({...node, keywords: e.target.value})} className="h-12 rounded-xl font-black bg-muted/20 border-none shadow-inner" /></div>
            )}
            <div className="space-y-4">
               <div className="flex items-center justify-between px-1"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Message Content</Label>{onAiSuggest && (<Button variant="ghost" size="sm" disabled={isAiLoading} onClick={onAiSuggest} className="h-6 text-[8px] font-black uppercase text-primary gap-1.5 hover:bg-primary/5">{isAiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3.5 w-3.5" />} AI Draft</Button>)}</div>
               <Textarea value={node.template} onChange={(e) => onUpdate({...node, template: e.target.value})} className="min-h-[140px] rounded-2xl bg-muted/20 border-none p-5 text-sm font-medium shadow-inner" />
            </div>
            <div className="space-y-6">
               <div className="flex items-center justify-between px-1"><Label className="text-[10px] font-black uppercase text-primary tracking-widest">Bot Actions (Buttons)</Label><Button variant="ghost" size="sm" className="h-6 text-[8px] font-black uppercase text-primary" onClick={addBtn}>+ Add Button</Button></div>
               <div className="space-y-4">
                  {(node.buttons || []).length === 0 ? <div className="py-10 text-center opacity-30 border-2 border-dashed rounded-2xl text-[9px] font-black uppercase tracking-widest">No buttons defined</div> : (node.buttons || []).map((btn: any) => (
                    <div key={btn.id} className="p-5 bg-muted/20 rounded-2xl border border-transparent space-y-4 relative group">
                       <div className="grid grid-cols-2 gap-4"><Select value={btn.type} onValueChange={(v) => updateBtn(btn.id, 'type', v)}><SelectTrigger className="h-10 rounded-xl bg-white text-[10px] font-bold uppercase"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl border-none shadow-2xl"><SelectItem value="QUICK_REPLY" className="text-[10px] font-bold uppercase">Quick Reply</SelectItem><SelectItem value="URL" className="text-[10px] font-bold uppercase">Website Link</SelectItem><SelectItem value="PHONE_NUMBER" className="text-[10px] font-bold uppercase">Call Agent</SelectItem></SelectContent></Select><Input placeholder="Button Label" value={btn.label} onChange={(e) => updateBtn(btn.id, 'label', e.target.value)} className="h-10 rounded-xl bg-white font-black text-[10px] uppercase" /></div>
                       {btn.type !== 'QUICK_REPLY' && <Input placeholder={btn.type === 'URL' ? 'https://...' : '91XXXXXXXX'} value={btn.value || ""} onChange={(e) => updateBtn(btn.id, 'value', e.target.value)} className="h-9 rounded-xl bg-white font-mono text-[10px]" />}
                       <button onClick={() => removeBtn(btn.id)} className="absolute -top-2 -right-2 h-6 w-6 bg-white rounded-full shadow-md text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="p-8 bg-muted/10 border-t flex flex-row gap-3 shrink-0"><DialogClose asChild><Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold uppercase text-[10px]">Discard</Button></DialogClose><Button onClick={onSave} className="flex-1 h-14 bg-primary font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Commit Node</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
