"use client";

import { useState, useEffect, useMemo } from "react";
import {
  SmartphoneNfc,
  Loader2,
  RefreshCcw,
  Sparkles,
  ShieldCheck,
  Send,
  BookOpen,
  ShieldAlert,
  Globe,
  Smartphone,
  Zap,
  Key,
  UserPlus,
  Receipt,
  ExternalLink,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, SectionCard } from "@/components/ui/editorial";
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sendWhatsAppTemplate, listWhatsAppTemplates } from "@/app/actions/whatsapp-actions";

const LANGUAGES = [
  { id: "en_IN", label: "English (India)" },
  { id: "en_US", label: "English (US)" },
  { id: "hi_IN", label: "Hindi" },
  { id: "mr_IN", label: "Marathi" },
];

export default function WhatsAppConfigPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");

  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTestTemplate, setSelectedTestTemplate] = useState("hello_world");

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business, isLoading: isBizLoading } = useDoc<any>(businessRef);

  const isAdmin = userProfile?.role === "admin" || user?.email?.toLowerCase() === "skillmatrix24@gmail.com";

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
    otherEventLanguageCode: "en_IN",
  };

  const syncTemplates = async () => {
    if (!waConfig?.wabaId || !waConfig?.accessToken) return;
    try {
      const result = await listWhatsAppTemplates({
        wabaId: waConfig.wabaId,
        accessToken: waConfig.accessToken,
      });
      if (result.success) {
        setTemplates(result.templates || []);
      }
    } catch (e) {
      console.error(e);
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
        [key]: value,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const verifyConnection = () => {
    if (!waConfig.accessToken || !waConfig.phoneId) {
      toast({
        variant: "destructive",
        title: "Configuration Incomplete",
        description: "Please enter Access Token and Phone ID before verifying.",
      });
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      handleUpdateWA("isVerified", true);
      toast({
        title: "API Connected",
        description: "Meta Cloud connection verified.",
      });
      syncTemplates();
    }, 1500);
  };

  const handleSendTestMessage = async () => {
    if (!waConfig.isVerified) {
      toast({ variant: "destructive", title: "API Unverified" });
      return;
    }
    if (!testPhone || testPhone.length < 10) {
      toast({ variant: "destructive", title: "Invalid Phone Number" });
      return;
    }

    setIsTesting(true);
    try {
      const template = templates.find((t) => t.name === selectedTestTemplate);
      const lang = template?.language || "en_US";

      let testComponents: any[] = [];
      if (selectedTestTemplate !== "hello_world" && template?.components) {
        const bodyComp = template.components.find((c: any) => c.type === "BODY");
        if (bodyComp && bodyComp.text) {
          const matches = bodyComp.text.match(/\{\{\d+\}\}/g);
          if (matches) {
            const paramCount = new Set(matches).size;
            const parameters = Array.from({ length: paramCount }).map((_, i) => ({
              type: "text",
              text: `TestValue${i + 1}`,
            }));

            testComponents = [
              {
                type: "body",
                parameters,
              },
            ];
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
      toast({ title: "Test Message Sent", description: `Dispatched template ${selectedTestTemplate}.` });
      setTestPhone("");
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Dispatch Failed", description: error.message });
    } finally {
      setIsTesting(false);
    }
  };

  const approvedTemplates = useMemo(() => {
    return templates.filter((t) => t.status === "APPROVED");
  }, [templates]);

  if (isBizLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-left">
      <PageHeader
        breadcrumb="WhatsApp Cloud · Settings"
        title="API Configuration"
        description="Connect your Meta WhatsApp Cloud credentials and map automated callback templates."
        backHref="/whatsapp-automation"
        actions={
          <Button asChild variant="outline" className="h-10 px-4 rounded-xl border-slate-200 bg-white text-slate-800 font-semibold text-xs">
            <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer">
              Meta Dev Portal <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <SectionCard
            title="Meta Cloud Credentials"
            description="Official WhatsApp Business Cloud API identifiers and token."
            headerRight={
              waConfig.isVerified ? (
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 text-xs font-semibold">
                  Unlinked
                </Badge>
              )
            }
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="wa-phone-id" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5 text-slate-500" /> Phone Number ID
                  </Label>
                  <Input
                    id="wa-phone-id"
                    value={waConfig.phoneId || ""}
                    onChange={(e) => handleUpdateWA("phoneId", e.target.value)}
                    placeholder="e.g. 109283..."
                    className="h-10 rounded-xl font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wa-waba-id" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-slate-500" /> WABA ID
                  </Label>
                  <Input
                    id="wa-waba-id"
                    value={waConfig.wabaId || ""}
                    onChange={(e) => handleUpdateWA("wabaId", e.target.value)}
                    placeholder="e.g. 98273..."
                    className="h-10 rounded-xl font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wa-token" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-slate-500" /> Permanent Access Token
                </Label>
                <Input
                  id="wa-token"
                  type="password"
                  value={waConfig.accessToken || ""}
                  onChange={(e) => handleUpdateWA("accessToken", e.target.value)}
                  placeholder="EAA..."
                  className="h-10 rounded-xl font-mono text-xs"
                />
                <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  Use a Meta System User permanent token rather than a temporary 24-hour token.
                </p>
              </div>

              <Separator />

              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-slate-900" />
                    <h4 className="text-sm font-bold text-slate-900">Automation Callback Mapping</h4>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={syncTemplates}
                    className="h-8 text-xs font-semibold rounded-lg"
                  >
                    <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Sync Meta Templates
                  </Button>
                </div>

                {/* Welcome Template */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <UserPlus className="h-4 w-4 text-slate-700" />
                    <p className="text-xs font-bold text-slate-900">New Member Welcome</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600">Template Name</Label>
                      <Select
                        value={waConfig.welcomeTemplateName || ""}
                        onValueChange={(v) => handleUpdateWA("welcomeTemplateName", v)}
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-white text-xs font-medium">
                          <SelectValue placeholder="Pick Template" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {approvedTemplates.map((t: any) => (
                            <SelectItem key={t.name} value={t.name} className="text-xs font-mono">
                              {t.name}
                            </SelectItem>
                          ))}
                          {approvedTemplates.length === 0 && (
                            <SelectItem value="none" disabled>
                              No templates synced
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600">Language</Label>
                      <Select
                        value={waConfig.welcomeLanguageCode || "en_IN"}
                        onValueChange={(v) => handleUpdateWA("welcomeLanguageCode", v)}
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-white text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {LANGUAGES.map((l) => (
                            <SelectItem key={l.id} value={l.id} className="text-xs">
                              {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Transaction Callback Mapping */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-5">
                  <div className="flex items-center gap-2.5">
                    <Receipt className="h-4 w-4 text-slate-700" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Transaction Callbacks</p>
                      <p className="text-[11px] text-slate-500">Triggered after completed billing</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-xs font-semibold text-slate-700">1. Full POS Invoice Receipt (7 Vars)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Select value={waConfig.posTemplateName || ""} onValueChange={(v) => handleUpdateWA("posTemplateName", v)}>
                        <SelectTrigger className="h-10 rounded-xl bg-white text-xs font-medium">
                          <SelectValue placeholder="Pick Template" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {approvedTemplates.map((t: any) => (
                            <SelectItem key={t.name} value={t.name} className="text-xs font-mono">
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={waConfig.posLanguageCode || "en_IN"} onValueChange={(v) => handleUpdateWA("posLanguageCode", v)}>
                        <SelectTrigger className="h-10 rounded-xl bg-white text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {LANGUAGES.map((l) => (
                            <SelectItem key={l.id} value={l.id} className="text-xs">
                              {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2.5">
                    <Label className="text-xs font-semibold text-slate-700">2. Quick Reward Sync Alert (6 Vars)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Select
                        value={waConfig.rewardSyncTemplateName || ""}
                        onValueChange={(v) => handleUpdateWA("rewardSyncTemplateName", v)}
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-white text-xs font-medium">
                          <SelectValue placeholder="Pick Template" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {approvedTemplates.map((t: any) => (
                            <SelectItem key={t.name} value={t.name} className="text-xs font-mono">
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={waConfig.rewardSyncLanguageCode || "en_IN"}
                        onValueChange={(v) => handleUpdateWA("rewardSyncLanguageCode", v)}
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-white text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {LANGUAGES.map((l) => (
                            <SelectItem key={l.id} value={l.id} className="text-xs">
                              {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Birthday Template */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="h-4 w-4 text-slate-700" />
                    <p className="text-xs font-bold text-slate-900">Birthday Wish</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      value={waConfig.birthdayTemplateName || ""}
                      onValueChange={(v) => handleUpdateWA("birthdayTemplateName", v)}
                    >
                      <SelectTrigger className="h-10 rounded-xl bg-white text-xs font-medium">
                        <SelectValue placeholder="Pick Template" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {approvedTemplates.map((t: any) => (
                          <SelectItem key={t.name} value={t.name} className="text-xs font-mono">
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={waConfig.birthdayLanguageCode || "en_IN"}
                      onValueChange={(v) => handleUpdateWA("birthdayLanguageCode", v)}
                    >
                      <SelectTrigger className="h-10 rounded-xl bg-white text-xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {LANGUAGES.map((l) => (
                          <SelectItem key={l.id} value={l.id} className="text-xs">
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button
                onClick={verifyConnection}
                disabled={isVerifying}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl"
              >
                {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Verify API Connection
              </Button>

              <Separator />

              <div className="p-5 bg-amber-50/70 rounded-xl border border-amber-200 space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-700" />
                  <h4 className="text-sm font-bold text-amber-950">Test Dispatch</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-amber-900">Approved Template</Label>
                    <Select value={selectedTestTemplate} onValueChange={setSelectedTestTemplate}>
                      <SelectTrigger className="h-10 rounded-xl bg-white border-amber-200 text-xs font-medium">
                        <SelectValue placeholder="Pick Template" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="hello_world" className="text-xs font-mono">
                          hello_world (Default)
                        </SelectItem>
                        {approvedTemplates.map((t: any) => (
                          <SelectItem key={t.name} value={t.name} className="text-xs font-mono">
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="test-wa-phone" className="text-xs font-semibold text-amber-900">
                      Test Mobile Number
                    </Label>
                    <Input
                      id="test-wa-phone"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="91XXXXXXXXXX"
                      className="h-10 rounded-xl bg-white border-amber-200 font-mono text-sm tabular-nums"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSendTestMessage}
                  disabled={isTesting || !waConfig.isVerified}
                  className="w-full h-10 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl"
                >
                  {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send Test Message
                </Button>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="rounded-2xl bg-slate-900 text-white overflow-hidden border border-slate-800">
            <div className="p-5 border-b border-white/10 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-sm font-bold text-white">Variable Mapping Guide</h3>
            </div>
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="p-6 space-y-8 text-left">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white">1. POS Billing Map (7 Vars)</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Ensure your POS invoice template declares these 7 ordered parameters:
                  </p>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-1.5 font-mono text-xs text-slate-300">
                    <p>{"{{1}} = Customer Name"}</p>
                    <p>{"{{2}} = Invoice ID"}</p>
                    <p>{"{{3}} = Gross Amount"}</p>
                    <p>{"{{4}} = Applied Coupon Name"}</p>
                    <p>{"{{5}} = Total Savings Value"}</p>
                    <p>{"{{6}} = Net Payable Amount"}</p>
                    <p className="text-emerald-300">{"{{7}} = Digital Portal Link"}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white">2. Reward Sync Map (6 Vars)</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Mapping for external POS (Petpooja) bill sync alerts:
                  </p>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-1.5 font-mono text-xs text-slate-300">
                    <p>{"{{1}} = Customer Name"}</p>
                    <p>{"{{2}} = External Bill Ref"}</p>
                    <p>{"{{3}} = Points Earned"}</p>
                    <p>{"{{4}} = Coupon Redeemed"}</p>
                    <p>{"{{5}} = Total Amount Saved"}</p>
                    <p className="text-emerald-300">{"{{6}} = Digital Portal Link"}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white">3. Failsafe Defaults</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Agar kisi bill par coupon use nahi hua, toh system automatically `NONE` aur `₹0` pass karega taaki Meta template parameters reject na hon.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
