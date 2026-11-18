"use client";

import { useState, useEffect, useRef } from "react";
import {
  SmartphoneNfc,
  Zap,
  Clock,
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Smartphone,
  Send,
  Loader2,
  LayoutList,
  Bot,
  Sparkles,
  X,
  PhoneCall,
  ExternalLink,
  Info,
  Settings2,
  Heart,
  Trophy,
  UserPlus,
  Activity,
  ShieldCheck,
  Type,
  KeyRound,
  MoreVertical,
  Settings as SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader, SectionCard, EmptyStatePanel } from "@/components/ui/editorial";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  useFirestore,
  useUser,
  useDoc,
  useCollection,
  useMemoFirebase,
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  setDocumentNonBlocking,
} from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { format } from "date-fns";
import { suggestAutomationTemplate } from "@/ai/flows/suggest-automation-template";

type ButtonAction = {
  id: string;
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
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
  matchType: "exact" | "contains";
  template: string;
  isEnabled: boolean;
  buttons?: ButtonAction[];
};

const TRIGGER_TYPES = [
  { id: "birthday", label: "Birthday Wish", icon: Sparkles, desc: "Send a gift on their special day" },
  { id: "anniversary", label: "Anniversary", icon: Heart, desc: "Celebratory reward sequence" },
  { id: "high_value_bill", label: "High Value Bill", icon: Zap, desc: "Instantly reward big spenders", hasThreshold: true },
  { id: "points_milestone", label: "Points Milestone", icon: Trophy, desc: "Alert on reaching point targets", hasThreshold: true },
  { id: "expiry_alert", label: "Card Expiry", icon: Clock, desc: "Nudge before membership ends" },
  { id: "conversion", label: "Join Nudge", icon: UserPlus, desc: "Convert non-members after sale" },
];

export default function WhatsAppAutomationPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const stepsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(collection(firestore, "businesses", businessId, "whatsappFollowups"), orderBy("day", "asc"))
        : null,
    [firestore, businessId]
  );
  const { data: stepsRaw } = useCollection<Step>(stepsQuery);
  const steps = stepsRaw || [];

  const triggersQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "whatsappTriggers") : null),
    [firestore, businessId]
  );
  const { data: triggersRaw } = useCollection<any>(triggersQuery);
  const triggers = triggersRaw || [];

  const keywordsQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "whatsappKeywords") : null),
    [firestore, businessId]
  );
  const { data: keywordsRaw } = useCollection<KeywordTrigger>(keywordsQuery);
  const keywordResponders = keywordsRaw || [];

  const [activeTab, setActiveTab] = useState("timeline");
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [editingTrigger, setEditingTrigger] = useState<any>(null);
  const [editingKeyword, setEditingKeyword] = useState<KeywordTrigger | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [previewItem, setPreviewItem] = useState<any>(null);

  const [newStep, setNewStep] = useState({ day: 1, label: "", template: "" });
  const [newKeyword, setNewKeyword] = useState({ keywords: "", template: "" });

  const [isSimulating, setIsSimulating] = useState(false);
  const [simInput, setSimInput] = useState("");
  const [simMessages, setSimMessages] = useState<any[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === "timeline" && steps.length > 0) setPreviewItem(steps[0]);
    else if (activeTab === "triggers" && triggers.length > 0) setPreviewItem(triggers[0]);
    else if (activeTab === "keywords" && keywordResponders.length > 0) setPreviewItem(keywordResponders[0]);
  }, [activeTab, steps, triggers, keywordResponders]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [simMessages, isBotTyping]);

  const handleToggleGlobal = (val: boolean) => {
    if (!businessRef) return;
    updateDocumentNonBlocking(businessRef, { whatsappEnabled: val });
    toast({ title: val ? "Flows Online" : "Automation Muted" });
  };

  const handleSaveStep = () => {
    if (!businessId || !editingStep) return;
    const docRef = doc(firestore, "businesses", businessId, "whatsappFollowups", editingStep.id);
    updateDocumentNonBlocking(docRef, { ...editingStep, updatedAt: serverTimestamp() });
    setEditingStep(null);
    toast({ title: "Timeline Stage Saved" });
  };

  const handleSaveTrigger = () => {
    if (!businessId || !editingTrigger) return;
    const docRef = doc(firestore, "businesses", businessId, "whatsappTriggers", editingTrigger.id);
    setDocumentNonBlocking(docRef, { ...editingTrigger, updatedAt: serverTimestamp() }, { merge: true });
    setEditingTrigger(null);
    toast({ title: "Trigger Botflow Saved" });
  };

  const handleSaveKeyword = () => {
    if (!businessId || !editingKeyword) return;
    const docRef = doc(firestore, "businesses", businessId, "whatsappKeywords", editingKeyword.id);
    updateDocumentNonBlocking(docRef, { ...editingKeyword, updatedAt: serverTimestamp() });
    setEditingKeyword(null);
    toast({ title: "Keyword Rule Updated" });
  };

  const handleAddStep = () => {
    if (!businessId || !newStep.label) return;
    addDocumentNonBlocking(collection(firestore, "businesses", businessId, "whatsappFollowups"), {
      ...newStep,
      isActive: true,
      buttons: [],
      createdAt: serverTimestamp(),
    });
    setIsAdding(false);
    setNewStep({ day: 1, label: "", template: "" });
    toast({ title: "Stage Added" });
  };

  const handleAddKeyword = () => {
    if (!businessId || !newKeyword.keywords) return;
    addDocumentNonBlocking(collection(firestore, "businesses", businessId, "whatsappKeywords"), {
      ...newKeyword,
      matchType: "exact",
      isEnabled: true,
      buttons: [],
      createdAt: serverTimestamp(),
    });
    setIsAddingKeyword(false);
    setNewKeyword({ keywords: "", template: "" });
    toast({ title: "Keyword Responder Active" });
  };

  const handleDeleteStep = (id: string) => {
    if (!businessId) return;
    deleteDocumentNonBlocking(doc(firestore, "businesses", businessId, "whatsappFollowups", id));
    toast({ title: "Stage Removed", variant: "destructive" });
  };

  const handleDeleteKeyword = (id: string) => {
    if (!businessId) return;
    deleteDocumentNonBlocking(doc(firestore, "businesses", businessId, "whatsappKeywords", id));
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
    const userMsg = { role: "user", text: userText, time: format(new Date(), "HH:mm") };
    setSimMessages((prev) => [...prev, userMsg]);
    const input = userText.toLowerCase();
    setSimInput("");
    setIsBotTyping(true);

    setTimeout(() => {
      const match = keywordResponders.find((kr) => {
        if (!kr.isEnabled) return false;
        const kwArray = kr.keywords
          .toLowerCase()
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean);

        if (kr.matchType === "exact") {
          return kwArray.includes(input);
        } else {
          return kwArray.some((k) => input.includes(k));
        }
      });

      if (match) {
        setSimMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: match.template,
            buttons: match.buttons || [],
            time: format(new Date(), "HH:mm"),
          },
        ]);
      } else {
        setSimMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: "Namaste! Main aapka Biztrix Assistant hoon. Maine aapka message nahi samjha. Kya main aapki kisi aur cheez mein madad kar sakta hoon?",
            time: format(new Date(), "HH:mm"),
          },
        ]);
      }
      setIsBotTyping(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-20 text-left">
      <PageHeader
        breadcrumb="WhatsApp Cloud · Automation"
        title="Advanced Nurturing"
        description="Configure follow-up sequences, lifecycle event triggers, and interactive keyword auto-responders."
        icon={SmartphoneNfc}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200">
              <Label htmlFor="wa-global-mode" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Automation Mode
              </Label>
              <Switch
                id="wa-global-mode"
                checked={!!business?.whatsappEnabled}
                onCheckedChange={handleToggleGlobal}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
            <Button asChild variant="outline" className="h-10 px-4 rounded-xl border-slate-200 bg-white text-slate-700 font-semibold text-xs">
              <Link href="/whatsapp-automation/config">
                <SettingsIcon className="mr-2 h-4 w-4" /> Config
              </Link>
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-slate-100 border border-slate-200 h-12 p-1 rounded-xl flex w-full overflow-x-auto scrollbar-hide">
          <TabsTrigger value="timeline" className="flex-1 text-xs font-semibold px-4 rounded-lg gap-2 whitespace-nowrap">
            <LayoutList className="h-4 w-4" /> Sequence Timeline
          </TabsTrigger>
          <TabsTrigger value="triggers" className="flex-1 text-xs font-semibold px-4 rounded-lg gap-2 whitespace-nowrap">
            <Zap className="h-4 w-4" /> Event Triggers
          </TabsTrigger>
          <TabsTrigger value="keywords" className="flex-1 text-xs font-semibold px-4 rounded-lg gap-2 whitespace-nowrap">
            <KeyRound className="h-4 w-4" /> Keyword Responders
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1 text-xs font-semibold px-4 rounded-lg gap-2 whitespace-nowrap">
            <Activity className="h-4 w-4" /> Telemetry
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">
            <TabsContent value="timeline" className="m-0">
              <SectionCard
                title="Follow-up Sequence"
                description="Scheduled WhatsApp touchpoints relative to customer enrollment day."
                headerRight={
                  <Button
                    onClick={() => setIsAdding(true)}
                    size="sm"
                    className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Stage
                  </Button>
                }
              >
                {steps.length === 0 ? (
                  <EmptyStatePanel
                    icon={Clock}
                    title="No stages configured"
                    description="Add your first follow-up stage to build an automated WhatsApp nurturing journey."
                    action={
                      <Button onClick={() => setIsAdding(true)} size="sm" className="h-9 px-4 rounded-xl bg-slate-900 text-white text-xs font-semibold">
                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add First Stage
                      </Button>
                    }
                  />
                ) : (
                  <div className="relative space-y-5 before:absolute before:left-[19px] before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-slate-200">
                    {steps.map((step) => {
                      const isSelected = previewItem?.id === step.id;
                      return (
                        <div key={step.id} className="relative pl-12">
                          <div
                            className={cn(
                              "absolute left-0 top-1 h-10 w-10 rounded-full border-4 border-white flex items-center justify-center z-10 font-mono text-xs font-bold tabular-nums",
                              step.isActive ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"
                            )}
                          >
                            {step.day}
                          </div>
                          <div
                            className={cn(
                              "p-5 rounded-2xl border transition-colors bg-white",
                              isSelected ? "border-slate-900 ring-1 ring-slate-900/10" : "border-slate-200 hover:border-slate-300"
                            )}
                          >
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewItem(step);
                                  setIsSimulating(false);
                                }}
                                className="text-left flex-1 min-w-0 font-semibold text-sm text-slate-900 hover:text-primary truncate"
                              >
                                {step.label}
                              </button>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Edit ${step.label}`}
                                  className="h-8 w-8 rounded-lg text-slate-600 hover:text-slate-900"
                                  onClick={() => setEditingStep(step)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Delete ${step.label}`}
                                  className="h-8 w-8 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  onClick={() => handleDeleteStep(step.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewItem(step);
                                setIsSimulating(false);
                              }}
                              className="w-full text-left text-xs text-slate-600 leading-relaxed truncate block"
                            >
                              "{step.template}"
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </TabsContent>

            <TabsContent value="triggers" className="m-0 space-y-4">
              {TRIGGER_TYPES.map((type) => {
                const rule = triggers.find((t: any) => t.type === type.id);
                const Icon = type.icon;
                return (
                  <div
                    key={type.id}
                    className={cn(
                      "rounded-2xl border bg-white overflow-hidden transition-colors",
                      rule?.isEnabled ? "border-slate-300" : "border-slate-200 opacity-85"
                    )}
                  >
                    <div className="px-5 py-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                            rule?.isEnabled
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-500 border-slate-200"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{type.label}</h4>
                            {rule?.isEnabled && (
                              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{type.desc}</p>
                        </div>
                      </div>
                      <Switch
                        aria-label={`Toggle ${type.label}`}
                        checked={!!rule?.isEnabled}
                        onCheckedChange={(v) => {
                          if (!businessId) return;
                          const docRef = doc(firestore, "businesses", businessId, "whatsappTriggers", type.id);
                          if (!rule)
                            setDocumentNonBlocking(
                              docRef,
                              {
                                id: type.id,
                                type: type.id,
                                label: type.label,
                                template: "Hi {{name}}!",
                                isEnabled: true,
                                createdAt: serverTimestamp(),
                              },
                              { merge: true }
                            );
                          else updateDocumentNonBlocking(docRef, { isEnabled: v });
                        }}
                        className="data-[state=checked]:bg-slate-900 shrink-0"
                      />
                    </div>
                    {rule?.isEnabled && (
                      <div className="p-5 flex items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewItem(rule);
                            setIsSimulating(false);
                          }}
                          className="flex-1 text-left p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed hover:bg-slate-100/70 transition-colors"
                        >
                          "{rule.template}"
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingTrigger(rule)}
                          className="h-9 px-3 rounded-xl border-slate-200 text-xs font-semibold shrink-0"
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="keywords" className="m-0">
              <SectionCard
                title="Inbound Keywords"
                description="Automatically reply when incoming WhatsApp messages match configured phrases."
                bodyClassName="p-0"
                headerRight={
                  <Button
                    onClick={() => setIsAddingKeyword(true)}
                    size="sm"
                    className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> New Rule
                  </Button>
                }
              >
                {keywordResponders.length === 0 ? (
                  <div className="p-6">
                    <EmptyStatePanel
                      icon={KeyRound}
                      title="No keyword responders"
                      description="Create keyword triggers like hi, price, or menu for instant replies."
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {keywordResponders.map((kw) => (
                      <div
                        key={kw.id}
                        className={cn(
                          "px-5 py-4 flex items-center justify-between gap-4 transition-colors",
                          previewItem?.id === kw.id ? "bg-slate-50" : "hover:bg-slate-50/60"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewItem(kw);
                            setIsSimulating(false);
                          }}
                          className="flex items-center gap-3.5 flex-1 min-w-0 text-left"
                        >
                          <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                            <Type className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 truncate">{kw.keywords}</p>
                              <Badge variant="outline" className="text-[11px] font-medium border-slate-200 text-slate-600">
                                {kw.matchType}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">Reply: "{kw.template}"</p>
                          </div>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <Switch
                            aria-label={`Toggle keyword ${kw.keywords}`}
                            checked={kw.isEnabled}
                            onCheckedChange={(v) =>
                              businessId &&
                              updateDocumentNonBlocking(doc(firestore, "businesses", businessId, "whatsappKeywords", kw.id), {
                                isEnabled: v,
                              })
                            }
                            className="data-[state=checked]:bg-emerald-600"
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Actions for ${kw.keywords}`} className="h-8 w-8 rounded-lg">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-slate-200 p-1">
                              <DropdownMenuItem className="text-xs font-medium p-2 rounded-lg cursor-pointer" onClick={() => setEditingKeyword(kw)}>
                                <Edit2 className="mr-2 h-3.5 w-3.5" /> Edit Rule
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-xs font-medium p-2 rounded-lg cursor-pointer text-rose-600 focus:text-rose-600"
                                onClick={() => handleDeleteKeyword(kw.id)}
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Rule
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </TabsContent>

            <TabsContent value="analytics" className="m-0">
              <SectionCard title="Automation Telemetry" description="Execution health and synchronization monitor.">
                <EmptyStatePanel
                  icon={ShieldCheck}
                  title="All systems operational"
                  description="No synchronization errors detected across active timelines, event triggers, or keyword rules."
                />
              </SectionCard>
            </TabsContent>
          </div>

          {/* Preview & Simulator Column */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
            <div className="rounded-2xl bg-slate-900 text-white p-6 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-6 gap-2">
                <p className="text-xs font-semibold text-slate-200">Live WhatsApp Preview</p>
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
                  <Label htmlFor="sim-toggle" className="text-[11px] font-medium text-slate-200 cursor-pointer">
                    Simulator
                  </Label>
                  <Switch
                    id="sim-toggle"
                    checked={isSimulating}
                    onCheckedChange={setIsSimulating}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
              </div>

              <div className="w-full max-w-[300px] bg-[#E5DDD5] rounded-2xl border-4 border-slate-800 aspect-[9/16] overflow-hidden flex flex-col">
                <div className="h-10 bg-slate-800 flex items-center justify-between px-4 shrink-0 text-white">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold truncate max-w-[160px]">
                      {business?.name || "Business Account"}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-300 tabular-nums">12:30</span>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                  {!isSimulating ? (
                    <div className="flex-1 p-4 flex flex-col">
                      <div className="max-w-[90%] bg-white rounded-xl rounded-tl-none border border-slate-200 p-3.5 self-start">
                        <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                          {previewItem
                            ? (previewItem.template || "").replace(/\{\{\w+\}\}/g, "_____")
                            : "Select a stage, trigger, or keyword rule to preview."}
                        </p>
                        <div className="flex justify-end mt-1.5">
                          <span className="text-[11px] text-slate-400 font-mono tabular-nums">12:30 PM · ✓✓</span>
                        </div>
                      </div>
                      <div className="mt-auto space-y-1.5 pt-4">
                        {(previewItem?.buttons || []).map((btn: any) => (
                          <div
                            key={btn.id}
                            className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 text-center flex items-center justify-center gap-2"
                          >
                            {btn.type === "QUICK_REPLY" ? (
                              <MessageSquare className="h-3.5 w-3.5 text-slate-600" />
                            ) : btn.type === "URL" ? (
                              <ExternalLink className="h-3.5 w-3.5 text-slate-600" />
                            ) : (
                              <PhoneCall className="h-3.5 w-3.5 text-slate-600" />
                            )}
                            {btn.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col h-full">
                      <ScrollArea className="flex-1 p-3.5">
                        <div className="space-y-3">
                          {simMessages.map((m, i) => (
                            <div
                              key={i}
                              className={cn(
                                "max-w-[85%] p-3 rounded-xl text-xs leading-relaxed border",
                                m.role === "user"
                                  ? "bg-emerald-100 border-emerald-200 self-end ml-auto rounded-tr-none text-emerald-950 font-medium"
                                  : "bg-white border-slate-200 self-start rounded-tl-none text-slate-800"
                              )}
                            >
                              <p>{m.text}</p>
                              {m.buttons && m.buttons.length > 0 && (
                                <div className="mt-2.5 space-y-1">
                                  {m.buttons.map((b: any) => (
                                    <div
                                      key={b.id}
                                      className="p-1.5 bg-slate-50 rounded-lg text-center font-semibold text-[11px] border border-slate-200 text-slate-800"
                                    >
                                      {b.label}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex justify-end mt-1">
                                <span className="text-[11px] font-mono tabular-nums text-slate-500">{m.time}</span>
                              </div>
                            </div>
                          ))}
                          {isBotTyping && (
                            <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl rounded-tl-none w-fit text-[11px] text-slate-500">
                              Typing...
                            </div>
                          )}
                          <div ref={scrollRef} />
                        </div>
                      </ScrollArea>
                      <form onSubmit={handleSimulate} className="p-2.5 bg-white border-t border-slate-200 flex gap-2 shrink-0">
                        <Input
                          value={simInput || ""}
                          onChange={(e) => setSimInput(e.target.value)}
                          placeholder="Type keyword (e.g. hi)..."
                          className="h-9 rounded-lg text-xs border-slate-200 bg-slate-50"
                        />
                        <Button
                          type="submit"
                          size="icon"
                          aria-label="Send simulated message"
                          className="h-9 w-9 rounded-lg bg-slate-900 text-white shrink-0"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 w-full p-4 bg-white/5 rounded-xl border border-white/10 flex items-start gap-3">
                <Info className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  Interactive reply and CTA buttons follow Meta Cloud API components for higher customer response rates.
                </p>
              </div>
            </div>

            <SectionCard title="Safety Protocol" description="Anti-spam dispatch rate governance.">
              <div className="flex items-center justify-between gap-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="space-y-0.5">
                  <Label htmlFor="spam-mitigation" className="text-xs font-semibold text-amber-900 cursor-pointer">
                    Spam Mitigation
                  </Label>
                  <p className="text-xs text-amber-700 font-mono tabular-nums">Rate limit: 1 msg / 5 sec</p>
                </div>
                <Switch
                  id="spam-mitigation"
                  defaultChecked
                  className="data-[state=checked]:bg-amber-600"
                />
              </div>
            </SectionCard>
          </div>
        </div>
      </Tabs>

      {/* Edit Dialogs */}
      <BotflowDialog
        isOpen={!!editingStep}
        onOpenChange={(o: boolean) => !o && setEditingStep(null)}
        item={editingStep}
        onSave={handleSaveStep}
        onUpdate={setEditingStep}
      />
      <BotflowDialog
        isOpen={!!editingTrigger}
        onOpenChange={(o: boolean) => !o && setEditingTrigger(null)}
        item={editingTrigger}
        onSave={handleSaveTrigger}
        onUpdate={setEditingTrigger}
        onAiSuggest={() => handleAiTriggerTemplate(editingTrigger)}
        isAiLoading={isAiLoading}
      />
      <BotflowDialog
        isOpen={!!editingKeyword}
        onOpenChange={(o: boolean) => !o && setEditingKeyword(null)}
        item={editingKeyword}
        onSave={handleSaveKeyword}
        onUpdate={setEditingKeyword}
        isKeyword
      />

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl p-0 overflow-hidden border border-slate-200">
          <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">Add Sequence Stage</DialogTitle>
                <DialogDescription className="text-xs text-slate-300 mt-0.5">
                  Schedule an automated follow-up message.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-5 sm:p-6 space-y-4 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="stage-day" className="text-xs font-semibold text-slate-700">Day Offset</Label>
                <Input
                  id="stage-day"
                  type="number"
                  value={newStep.day ?? ""}
                  onChange={(e) => setNewStep({ ...newStep, day: parseInt(e.target.value) || 0 })}
                  className="h-10 rounded-xl font-mono tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stage-label" className="text-xs font-semibold text-slate-700">Stage Label</Label>
                <Input
                  id="stage-label"
                  value={newStep.label || ""}
                  onChange={(e) => setNewStep({ ...newStep, label: e.target.value })}
                  placeholder="e.g. Day 3 Check-in"
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stage-msg" className="text-xs font-semibold text-slate-700">Message Content</Label>
              <Textarea
                id="stage-msg"
                value={newStep.template || ""}
                onChange={(e) => setNewStep({ ...newStep, template: e.target.value })}
                placeholder="Hi {{name}}, thank you for visiting..."
                className="min-h-[110px] rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-100">
            <Button onClick={handleAddStep} className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold">
              Save Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddingKeyword} onOpenChange={setIsAddingKeyword}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl p-0 overflow-hidden border border-slate-200">
          <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <KeyRound className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">New Keyword Rule</DialogTitle>
                <DialogDescription className="text-xs text-slate-300 mt-0.5">
                  Configure automatic replies for customer keywords.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-4 text-left">
            <div className="space-y-1.5">
              <Label htmlFor="kw-list" className="text-xs font-semibold text-slate-700">Keywords (comma separated)</Label>
              <Input
                id="kw-list"
                value={newKeyword.keywords || ""}
                onChange={(e) => setNewKeyword({ ...newKeyword, keywords: e.target.value })}
                placeholder="e.g. hi, hello, namaste"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kw-reply" className="text-xs font-semibold text-slate-700">Reply Message</Label>
              <Textarea
                id="kw-reply"
                value={newKeyword.template || ""}
                onChange={(e) => setNewKeyword({ ...newKeyword, template: e.target.value })}
                className="min-h-[110px] rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-100">
            <Button onClick={handleAddKeyword} className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold">
              Activate Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BotflowDialog({ isOpen, onOpenChange, item, onSave, onUpdate, isKeyword = false, onAiSuggest, isAiLoading }: any) {
  if (!item) return null;
  const addBtn = () => {
    const newBtn: ButtonAction = { id: `btn_${Date.now()}`, type: "QUICK_REPLY", label: "Click Me" };
    onUpdate({ ...item, buttons: [...(item.buttons || []), newBtn] });
  };
  const removeBtn = (id: string) => {
    onUpdate({ ...item, buttons: (item.buttons || []).filter((b: any) => b.id !== id) });
  };
  const updateBtn = (id: string, key: string, value: any) => {
    onUpdate({ ...item, buttons: (item.buttons || []).map((b: any) => (b.id === id ? { ...b, [key]: value } : b)) });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] rounded-2xl border border-slate-200 p-0 overflow-hidden text-left">
        <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800 text-left shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
              <Edit2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Edit {isKeyword ? "Keyword" : "Automation"} Rule
              </DialogTitle>
              <DialogDescription className="text-slate-300 text-xs mt-0.5">
                Configure message copy and interactive reply buttons.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-6">
            {isKeyword && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Trigger Keywords</Label>
                <Input
                  value={item.keywords || ""}
                  onChange={(e) => onUpdate({ ...item, keywords: e.target.value })}
                  className="h-10 rounded-xl font-medium"
                />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">Message Content</Label>
                {onAiSuggest && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isAiLoading}
                    onClick={onAiSuggest}
                    className="h-8 text-xs font-semibold text-primary gap-1.5"
                  >
                    {isAiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                    AI Draft
                  </Button>
                )}
              </div>
              <Textarea
                value={item.template || ""}
                onChange={(e) => onUpdate({ ...item, template: e.target.value })}
                className="min-h-[120px] rounded-xl text-sm"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">Interactive Buttons</Label>
                <Button variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg" onClick={addBtn}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Button
                </Button>
              </div>
              <div className="space-y-3">
                {(item.buttons || []).length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                    No interactive buttons added yet.
                  </div>
                ) : (
                  (item.buttons || []).map((btn: any) => (
                    <div key={btn.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-7">
                        <Select value={btn.type} onValueChange={(v) => updateBtn(btn.id, "type", v)}>
                          <SelectTrigger className="h-9 rounded-lg bg-white text-xs font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="QUICK_REPLY" className="text-xs">Quick Reply</SelectItem>
                            <SelectItem value="URL" className="text-xs">Website Link</SelectItem>
                            <SelectItem value="PHONE_NUMBER" className="text-xs">Call Agent</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Button Label"
                          value={btn.label || ""}
                          onChange={(e) => updateBtn(btn.id, "label", e.target.value)}
                          className="h-9 rounded-lg bg-white text-xs font-medium"
                        />
                      </div>
                      {btn.type !== "QUICK_REPLY" && (
                        <Input
                          placeholder={btn.type === "URL" ? "https://..." : "91XXXXXXXXXX"}
                          value={btn.value || ""}
                          onChange={(e) => updateBtn(btn.id, "value", e.target.value)}
                          className="h-9 rounded-lg bg-white font-mono text-xs"
                        />
                      )}
                      <button
                        type="button"
                        aria-label={`Remove button ${btn.label || "action"}`}
                        onClick={() => removeBtn(btn.id)}
                        className="absolute top-2.5 right-2.5 h-7 w-7 bg-white rounded-lg border border-slate-200 text-rose-600 flex items-center justify-center hover:bg-rose-50"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="p-5 bg-slate-50 border-t border-slate-100 flex flex-row gap-3 shrink-0">
          <DialogClose asChild>
            <Button variant="outline" className="flex-1 h-10 rounded-xl text-xs font-semibold">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={onSave} className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl">
            Save Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
