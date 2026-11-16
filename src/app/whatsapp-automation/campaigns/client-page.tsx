"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Zap,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Users,
  Loader2,
  ShieldCheck,
  Bot,
  Sparkles,
  Send,
  MessageSquare,
  Trash2,
  Grid,
  BadgeCheck,
  AlertTriangle,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  PageHeader,
  KpiStatCard,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp, where, getDocs } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format, isAfter, parseISO } from "date-fns";
import { suggestCampaign } from "@/ai/flows/suggest-loyalty-campaign-flow";
import { listWhatsAppTemplates, sendWhatsAppTemplate } from "@/app/actions/whatsapp-actions";

function formatPhoneForMeta(phone: string): string {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) clean = clean.substring(1);
  if (clean.length === 10) return `91${clean}`;
  return clean;
}

export default function CampaignHubPage() {
  const firestore = useFirestore();
  const { user } = useUser();

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
  const { data: business } = useDoc<any>(businessRef);

  const campaignsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(collection(firestore, "businesses", businessId, "campaigns"), orderBy("createdAt", "desc"))
        : null,
    [firestore, businessId]
  );
  const { data: campaignsRaw, isLoading: isCampaignsLoading } = useCollection<any>(campaignsQuery);
  const campaigns = campaignsRaw || [];

  const groupsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(collection(firestore, "businesses", businessId, "contactGroups"), orderBy("name", "asc"))
        : null,
    [firestore, businessId]
  );
  const { data: groupsRaw } = useCollection<any>(groupsQuery);
  const groups = groupsRaw || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isMetaSyncing, setIsMetaSyncing] = useState(false);
  const [metaTemplates, setMetaTemplates] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    targetGroupId: "all",
    templateName: "",
    message: "",
    scheduledAt: "",
  });

  const isWhatsappActive = useMemo(() => {
    return business?.activeAddonIds?.includes("suite_growth") || business?.status === "pro";
  }, [business]);

  const filteredCampaigns = useMemo(() => {
    return (campaigns || []).filter((c: any) =>
      c.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [campaigns, searchTerm]);

  const dynamicStats = useMemo(() => {
    const list = campaigns || [];
    const totalRecipients = list.reduce((sum, c) => sum + (Number(c.recipientCount) || 0), 0);
    const sentCampaignsCount = list.filter((c) => c.status === "sent").length;
    const deliveryRate = list.length > 0 ? Math.round((sentCampaignsCount / list.length) * 100) : 0;

    const lastCampaign = list[0];
    const lastDate = lastCampaign?.createdAt?.toDate
      ? format(lastCampaign.createdAt.toDate(), "dd MMM")
      : "No History";

    return {
      totalRecipients,
      deliveryRate: list.length > 0 ? deliveryRate : 100,
      activeSegments: (groups || []).length,
      lastDate,
    };
  }, [campaigns, groups]);

  const fetchMetaTemplates = async () => {
    const waConfig = business?.whatsappApiConfig;
    if (!waConfig?.isVerified || !businessId) return;
    setIsMetaSyncing(true);
    try {
      const res = await listWhatsAppTemplates(businessId, {
        wabaId: waConfig.wabaId,
        accessToken: waConfig.accessToken,
      });
      if (res.success) setMetaTemplates(res.templates?.filter((t: any) => t.status === "APPROVED") || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsMetaSyncing(false);
    }
  };

  useEffect(() => {
    if (isAddOpen && business?.whatsappApiConfig?.isVerified) {
      fetchMetaTemplates();
    }
  }, [isAddOpen, business?.whatsappApiConfig?.isVerified]);

  const handleAiMessage = async () => {
    if (!formData.title || !businessId) {
      toast({
        variant: "destructive",
        title: "Missing Goal",
        description: "Please enter a Campaign Title/Goal first.",
      });
      return;
    }
    setIsAiLoading(true);
    try {
      const selectedGroup = (groups || []).find((g) => g.id === formData.targetGroupId);
      const result = await suggestCampaign({
        businessName: business?.name || "Our Store",
        segment: selectedGroup?.name || "All Customers",
        goal: formData.title,
      });
      setFormData({ ...formData, message: result.whatsappMessage });
      toast({ title: "AI Copy Ready", description: "Check placeholders before launching." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "AI Busy" });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleLaunch = async () => {
    if (!formData.title || !businessId || !formData.templateName) {
      toast({
        variant: "destructive",
        title: "Form Incomplete",
        description: "Title and Template are required.",
      });
      return;
    }

    if (!isWhatsappActive) {
      toast({
        variant: "destructive",
        title: "Premium Required",
        description: "WhatsApp module is not active.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const contactsRef = collection(firestore, "businesses", businessId, "globalContacts");
      let recipientDocs: any[] = [];

      if (formData.targetGroupId === "all") {
        const allSnap = await getDocs(contactsRef);
        recipientDocs = allSnap.docs;
      } else {
        const selectedGroup = (groups || []).find((g) => g.id === formData.targetGroupId);
        if (selectedGroup) {
          const groupQuery = query(contactsRef, where("groups", "array-contains", selectedGroup.name));
          const groupSnap = await getDocs(groupQuery);
          recipientDocs = groupSnap.docs;
        }
      }

      const finalCount = recipientDocs.length;
      if (finalCount === 0) {
        toast({
          variant: "destructive",
          title: "Audience Empty",
          description: "Selected group has no contacts. Please sync Contact Registry first.",
        });
        setIsSubmitting(false);
        return;
      }

      const scheduledDate = formData.scheduledAt ? parseISO(formData.scheduledAt) : null;
      const isScheduled = scheduledDate && isAfter(scheduledDate, new Date());

      let successCount = 0;
      let failCount = 0;
      if (!isScheduled) {
        const waConfig = business?.whatsappApiConfig;
        const template = metaTemplates.find((t) => t.name === formData.templateName);
        const lang = template?.language || "en_US";

        toast({
          title: "Dispatching Messages",
          description: `Starting transmission to ${finalCount} contacts...`,
        });

        for (const rDoc of recipientDocs) {
          const contact = rDoc.data();
          if (!contact.phone) continue;

          const targetPhone = formatPhoneForMeta(contact.phone);
          const trackUrl = `${window.location.origin}/loyalty/track/${businessId}/mem_c_${targetPhone.slice(-10)}`;

          const components = [
            {
              type: "body",
              parameters: [
                { type: "text", text: contact.name || "Customer" },
                { type: "text", text: contact.phone || "N/A" },
                { type: "text", text: trackUrl },
              ],
            },
          ];

          try {
            await sendWhatsAppTemplate(
              businessId,
              { phoneId: waConfig.phoneId, accessToken: waConfig.accessToken },
              targetPhone,
              formData.templateName,
              lang,
              components
            );
            successCount++;
          } catch (e) {
            console.error(e);
            failCount++;
          }
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      const campaignRef = collection(firestore, "businesses", businessId, "campaigns");
      await addDocumentNonBlocking(campaignRef, {
        ...formData,
        status: isScheduled ? "scheduled" : "sent",
        recipientCount: finalCount,
        createdAt: serverTimestamp(),
      });

      toast({
        title: isScheduled ? "Campaign Scheduled" : "Campaign Finished",
        description: isScheduled
          ? "Execution schedule locked."
          : `Processed ${finalCount} recipients (${successCount} sent, ${failCount} failed).`,
      });
      setIsAddOpen(false);
      setFormData({ title: "", targetGroupId: "all", templateName: "", message: "", scheduledAt: "" });
    } catch (e) {
      console.error("Campaign Launch Failure:", e);
      toast({ variant: "destructive", title: "Dispatch Error", description: "Meta connection failed." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 text-left">
      <PageHeader
        breadcrumb="WhatsApp Cloud · Broadcasts"
        title="Campaign Hub"
        description="Launch bulk WhatsApp template campaigns across audience clusters with staggered Meta API safety."
        icon={Zap}
        actions={
          <div className="flex flex-wrap gap-2.5">
            <Button asChild variant="outline" className="h-10 px-4 rounded-xl border-slate-200 bg-white text-slate-700 font-semibold text-xs">
              <Link href="/whatsapp-automation/contacts">
                <Users className="mr-2 h-4 w-4" /> Manage Audience
              </Link>
            </Button>
            <Button
              onClick={() => setIsAddOpen(true)}
              className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs"
            >
              <Plus className="mr-2 h-4 w-4" /> New Campaign
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiStatCard
          label="Total Recipients"
          value={dynamicStats.totalRecipients.toLocaleString()}
          subtext="Messages dispatched"
          icon={Send}
        />
        <KpiStatCard
          label="Delivery Rate"
          value={`${dynamicStats.deliveryRate}%`}
          subtext="Campaign completion"
          icon={CheckCircle2}
          tone="positive"
        />
        <KpiStatCard
          label="Active Segments"
          value={dynamicStats.activeSegments}
          subtext="Audience clusters"
          icon={Grid}
          tone="warning"
        />
        <KpiStatCard
          label="Last Broadcast"
          value={dynamicStats.lastDate}
          subtext="Most recent campaign"
          icon={Clock}
          tone="dark"
        />
      </div>

      <SectionCard
        title="Transmission History"
        description="Log of past and scheduled WhatsApp template broadcasts."
        bodyClassName="p-0"
        headerRight={
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 rounded-xl bg-slate-50 border-slate-200 text-xs"
            />
          </div>
        }
      >
        {isCampaignsLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="animate-spin h-6 w-6 text-slate-400" />
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-6">
            <EmptyStatePanel
              icon={MessageSquare}
              title="No broadcast history found"
              description="Create a new campaign to broadcast an approved Meta template to your contact segments."
            />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <Table className="w-full min-w-[760px]">
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200">
                  <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">Campaign Title</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 h-11">Template</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">Contacts</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 h-11">Created At</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 h-11">Schedule At</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">Status</TableHead>
                  <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-24">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((c: any) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/60 border-b border-slate-100">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold text-slate-900 truncate block max-w-[200px]">
                          {c.title}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px] font-mono border-slate-200 text-slate-700">
                        {c.templateName || "---"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono font-semibold text-xs tabular-nums">
                      {c.recipientCount || "0"}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        {c.createdAt?.toDate ? format(c.createdAt.toDate(), "dd MMM yyyy, HH:mm") : "Recently"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {c.scheduledAt ? (
                        <span className="text-xs font-mono tabular-nums font-medium text-amber-700 flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" /> {format(parseISO(c.scheduledAt), "dd MMM, HH:mm")}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Instant</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={cn(
                          "text-[11px] font-semibold capitalize border",
                          c.status === "sent"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : c.status === "scheduled"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                        )}
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete campaign ${c.title}`}
                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        onClick={() => deleteDocumentNonBlocking(doc(firestore, "businesses", businessId!, "campaigns", c.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="rounded-2xl bg-slate-900 text-white p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-base font-bold text-white">Verified Compliance Protocol</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every broadcast enforces Meta Cloud opt-in standards and approved template variable mapping to minimize account block risk.
            </p>
          </div>
          <Separator className="bg-white/10" />
          <div className="flex flex-wrap gap-4 text-xs text-slate-200">
            <span className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-emerald-400" /> Meta API Verified
            </span>
            <span className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-emerald-400" /> AI Copy Assistant
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 flex items-start gap-4">
          <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-left">
            <h4 className="text-sm font-bold text-amber-950">Spam Guard Active</h4>
            <p className="text-xs text-amber-900 leading-relaxed">
              Broadcast messages are automatically staggered to keep your WABA quality rating green. Avoid sending over 1,000 messages in a single burst on newly verified numbers.
            </p>
          </div>
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[820px] rounded-2xl border border-slate-200 p-0 overflow-hidden w-[96vw] max-h-[92vh] flex flex-col lg:flex-row text-left">
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800 text-left shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-white">Configure Broadcast Campaign</DialogTitle>
                  <DialogDescription className="text-slate-300 text-xs mt-0.5">
                    Target audience cluster, approved template, and schedule.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                <div className="space-y-1.5">
                  <Label htmlFor="camp-title" className="text-xs font-semibold text-slate-700">Campaign Title *</Label>
                  <Input
                    id="camp-title"
                    value={formData.title || ""}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Diwali Festive Offer 2026"
                    className="h-11 rounded-xl font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Target Audience</Label>
                    <Select value={formData.targetGroupId} onValueChange={(v) => setFormData({ ...formData, targetGroupId: v })}>
                      <SelectTrigger className="h-10 rounded-xl bg-white text-xs font-medium">
                        <SelectValue placeholder="Select Group" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all" className="text-xs">All Contacts</SelectItem>
                        {(groups || []).map((g) => (
                          <SelectItem key={g.id} value={g.id} className="text-xs">{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700">Approved Template *</Label>
                      {isMetaSyncing && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
                    </div>
                    <Select value={formData.templateName} onValueChange={(v) => setFormData({ ...formData, templateName: v })}>
                      <SelectTrigger className="h-10 rounded-xl bg-white text-xs font-medium">
                        <SelectValue placeholder="Pick Meta template..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {metaTemplates.length === 0 ? (
                          <SelectItem value="none" disabled>No approved templates found</SelectItem>
                        ) : (
                          metaTemplates.map((t) => (
                            <SelectItem key={t.name} value={t.name} className="text-xs font-mono">
                              {t.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-amber-700" />
                    <Label htmlFor="camp-schedule" className="text-xs font-semibold text-amber-900">
                      Schedule Date & Time (Optional)
                    </Label>
                  </div>
                  <Input
                    id="camp-schedule"
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    className="h-10 rounded-xl bg-white border-amber-200 font-mono text-xs"
                  />
                  <p className="text-[11px] text-amber-700">Leave blank to dispatch immediately.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="camp-msg" className="text-xs font-semibold text-slate-700">Personalization Context</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAiMessage}
                      disabled={isAiLoading}
                      className="h-8 rounded-lg text-xs font-semibold gap-1.5"
                    >
                      {isAiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      AI Draft
                    </Button>
                  </div>
                  <Textarea
                    id="camp-msg"
                    value={formData.message || ""}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Hi {{1}}, we have a special reward waiting for you..."
                    className="min-h-[120px] rounded-xl text-sm leading-relaxed"
                  />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="p-5 bg-slate-50 border-t border-slate-100 shrink-0">
              <Button
                onClick={handleLaunch}
                disabled={isSubmitting || !formData.title || !formData.templateName}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Launch Campaign
              </Button>
            </DialogFooter>
          </div>

          <div className="hidden lg:flex w-[280px] bg-slate-50 flex-col border-l border-slate-200 overflow-hidden">
            <div className="p-5 bg-white border-b border-slate-200 shrink-0">
              <p className="text-xs font-semibold text-slate-900">Variable Mapping</p>
            </div>
            <ScrollArea className="flex-1 p-5">
              <div className="space-y-5 text-left">
                <p className="text-xs text-slate-500">Click a placeholder to insert it into your message:</p>
                <div className="space-y-2.5">
                  {[
                    { id: "{{1}}", label: "Customer Name" },
                    { id: "{{2}}", label: "Mobile Number" },
                    { id: "{{3}}", label: "Tracking URL" },
                  ].map((v) => (
                    <button
                      type="button"
                      key={v.id}
                      onClick={() => {
                        setFormData({ ...formData, message: formData.message + " " + v.id });
                        toast({ title: "Variable Mapped" });
                      }}
                      className="w-full text-left p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-400 transition-colors"
                    >
                      <p className="text-xs font-bold text-slate-900 font-mono">{v.id}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{v.label}</p>
                    </button>
                  ))}
                </div>
                <Separator />
                <div className="p-4 bg-slate-900 rounded-xl text-white space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <ShieldCheck className="h-4 w-4" /> Safe Dispatch
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Staggered delivery keeps your WhatsApp quality rating healthy across large audiences.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
