"use client";

import { useState, useMemo } from "react";
import {
  MessageSquare,
  Plus,
  Clock,
  SmartphoneNfc,
  History,
  Users,
  Target,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Lock,
  Send,
  Edit2,
  Trash2,
  Gem,
  ChevronRight,
  Info,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader, SectionCard, EmptyStatePanel } from "@/components/ui/editorial";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase";
import { collection, query, orderBy, doc, serverTimestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { suggestCampaign } from "@/ai/flows/suggest-loyalty-campaign-flow";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const SEGMENTS = [
  { id: "all", label: "All Customers", icon: Users },
  { id: "premium", label: "Premium Users", icon: Gem },
  { id: "inactive", label: "Inactive (30D+)", icon: Clock },
  { id: "expiring", label: "Expiring Soon", icon: Target },
  { id: "birthday_month", label: "Birthday Month", icon: Sparkles },
];

const VARIABLE_GUIDE = [
  { id: "{{name}}", label: "Full Name", desc: "Sanjay Gupta" },
  { id: "{{card_number}}", label: "Member Card ID", desc: "BIZ-GOLD-2026-0013" },
  { id: "{{points}}", label: "Reward Points", desc: "1,240" },
  { id: "{{wallet}}", label: "Cashback Balance", desc: "₹450" },
  { id: "{{event_date}}", label: "Occasion Date", desc: "24th March" },
  { id: "{{track_url}}", label: "Digital Hub Link", desc: "Track Portal" },
];

export default function LoyaltyCampaignsPage() {
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

  const campaignsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "campaigns"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: campaignsRaw, isLoading } = useCollection<any>(campaignsQuery);
  const campaigns = campaignsRaw || [];

  const couponsQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "coupons") : null),
    [firestore, businessId]
  );
  const { data: couponsRaw } = useCollection<any>(couponsQuery);
  const coupons = couponsRaw || [];

  const customersQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "customers") : null),
    [firestore, businessId]
  );
  const { data: customersRaw } = useCollection<any>(customersQuery);
  const customers = customersRaw || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: "",
    segment: "all",
    message: "",
    couponId: "none",
    scheduledAt: "",
  });

  const isWhatsappActive = useMemo(() => {
    return (
      business?.activeAddonIds?.includes("feat_whatsapp") ||
      business?.activeAddonIds?.includes("suite_growth") ||
      business?.status === "pro"
    );
  }, [business]);

  const segmentStats = useMemo(() => {
    if (!customers) return { total: 0, events: 0, premium: 0 };
    const list =
      formData.segment === "all"
        ? customers
        : formData.segment === "premium"
          ? customers.filter((c: any) => c.customerType === "VIP")
          : formData.segment === "birthday_month"
            ? customers.filter((c: any) =>
                c.dob?.includes(`-${new Date().getMonth() + 1}-`)
              )
            : customers;

    return {
      total: list.length,
      events: list.filter((c: any) => (c.events || []).length > 0).length,
      premium: list.filter((c: any) => c.customerType === "VIP").length,
    };
  }, [formData.segment, customers]);

  const handleLaunch = () => {
    if (!formData.title || !formData.message || !businessId) return;

    if (!isWhatsappActive) {
      toast({
        title: "Premium Feature Required",
        description:
          "WhatsApp Automation module is needed to launch broadcasts. Please activate it in the Marketplace.",
        variant: "destructive",
      });
      return;
    }

    if (editingId) {
      const docRef = doc(firestore, "businesses", businessId, "campaigns", editingId);
      updateDocumentNonBlocking(docRef, {
        ...formData,
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Campaign Updated", description: "Changes saved to campaign queue." });
    } else {
      addDocumentNonBlocking(collection(firestore, "businesses", businessId, "campaigns"), {
        ...formData,
        status: "scheduled",
        recipientCount: segmentStats.total,
        createdAt: serverTimestamp(),
      });
      toast({
        title: "Campaign Scheduled",
        description: "Campaign added to broadcast queue.",
      });
    }

    setIsAddOpen(false);
    resetForm();
  };

  const handleEdit = (campaign: any) => {
    setFormData({
      title: campaign.title || "",
      segment: campaign.segment || "all",
      message: campaign.message || "",
      couponId: campaign.couponId || "none",
      scheduledAt: campaign.scheduledAt || "",
    });
    setEditingId(campaign.id);
    setIsAddOpen(true);
  };

  const confirmDelete = () => {
    if (!businessId || !campaignToDelete) return;
    const docRef = doc(firestore, "businesses", businessId, "campaigns", campaignToDelete.id);
    deleteDocumentNonBlocking(docRef);
    setIsDeleteAlertOpen(false);
    setCampaignToDelete(null);
    toast({ title: "Campaign Deleted", variant: "destructive" });
  };

  const resetForm = () => {
    setFormData({
      title: "",
      segment: "all",
      message: "",
      couponId: "none",
      scheduledAt: "",
    });
    setEditingId(null);
  };

  const handleAiMessage = async () => {
    if (!formData.title || !businessId) {
      toast({
        variant: "destructive",
        title: "Title Required",
        description: "Please enter a campaign goal or title first so AI can draft copy.",
      });
      return;
    }
    setIsAiLoading(true);
    try {
      const selectedCoupon = coupons.find((c) => c.id === formData.couponId);
      const result = await suggestCampaign({
        businessName: business?.name || profile?.businessName || "Biztrix Store",
        segment: SEGMENTS.find((s) => s.id === formData.segment)?.label || "Customers",
        goal: formData.title,
        availableOffer: selectedCoupon
          ? `${selectedCoupon.code} (${selectedCoupon.value}${selectedCoupon.type === "percentage" ? "%" : " OFF"})`
          : undefined,
      });

      setFormData({ ...formData, message: result.whatsappMessage });
      toast({
        title: "AI Copy Generated",
        description: "Message tailored for the selected customer segment.",
      });
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "AI Engine Busy",
        description: "Could not generate copy. Try again.",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 text-left">
      <PageHeader
        title="Campaign Center"
        description="Send targeted WhatsApp loyalty broadcasts to member segments."
        breadcrumb="Loyalty / Campaigns"
        backHref="/loyalty"
        backLabel="Back to Loyalty"
        actions={
          <Dialog
            open={isAddOpen}
            onOpenChange={(open) => {
              setIsAddOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold">
                <Plus className="mr-2 h-4 w-4" /> New Sequence
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[960px] rounded-2xl border border-slate-200 p-0 overflow-hidden w-[96vw] flex flex-col lg:flex-row max-h-[92vh]">
              <div className="flex-1 flex flex-col bg-white overflow-hidden">
                <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800 text-left shrink-0">
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                      <SmartphoneNfc className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <DialogTitle className="text-lg font-bold text-white">
                        {editingId ? "Edit Campaign" : "Launch New Campaign"}
                      </DialogTitle>
                      <DialogDescription className="text-slate-300 text-xs mt-0.5">
                        Configure target audience and personalized WhatsApp copy
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-5 pb-4">
                    {!isWhatsappActive && (
                      <Alert className="bg-amber-50 border-amber-200 rounded-xl">
                        <Lock className="h-4 w-4 text-amber-700" />
                        <AlertDescription className="text-xs font-medium text-amber-800">
                          WhatsApp Automation is disabled. Activate the module in Marketplace to
                          dispatch campaigns.
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-1.5 text-left">
                      <Label htmlFor="camp-title" className="text-xs font-semibold text-slate-700">
                        Campaign Goal / Title *
                      </Label>
                      <Input
                        id="camp-title"
                        value={formData.title || ""}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. Birthday Special Wish"
                        className="h-10 rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Target Segment
                        </Label>
                        <Select
                          value={formData.segment}
                          onValueChange={(v) => setFormData({ ...formData, segment: v })}
                        >
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {SEGMENTS.map((s) => (
                              <SelectItem key={s.id} value={s.id} className="text-xs font-medium">
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Attach Coupon Reward
                        </Label>
                        <Select
                          value={formData.couponId}
                          onValueChange={(v) => setFormData({ ...formData, couponId: v })}
                        >
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue placeholder="No Coupon" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="none" className="text-xs font-medium">
                              No Reward
                            </SelectItem>
                            {coupons.map((c: any) => (
                              <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                                {c.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <Label
                          htmlFor="camp-msg"
                          className="text-xs font-semibold text-slate-700"
                        >
                          WhatsApp Message (Personalized) *
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isAiLoading}
                          onClick={handleAiMessage}
                          className="h-8 rounded-lg text-xs font-medium gap-1.5"
                        >
                          {isAiLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          AI Suggest Copy
                        </Button>
                      </div>
                      <Textarea
                        id="camp-msg"
                        value={formData.message || ""}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Hi {{name}}, we have a special gift for your member card {{card_number}}..."
                        className="min-h-[150px] rounded-xl p-3.5 text-sm leading-relaxed"
                      />
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <span className="text-xs text-slate-600">
                          Dynamic variables supported: Name, Card Number, Points, Wallet, Dates
                        </span>
                        <Info className="h-4 w-4 text-slate-400 shrink-0" />
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200 shrink-0">
                  <Button
                    type="button"
                    onClick={handleLaunch}
                    className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isWhatsappActive ? "Schedule & Dispatch Bulk" : "Save Draft"}
                  </Button>
                </DialogFooter>
              </div>

              <div className="hidden lg:flex w-[330px] bg-slate-50 flex-col border-l border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 bg-white shrink-0">
                  <p className="text-xs font-semibold text-slate-700">Segment Intelligence</p>
                </div>
                <ScrollArea className="flex-1 p-5">
                  <div className="space-y-6 text-left">
                    <div className="space-y-2.5">
                      <p className="text-xs font-semibold text-slate-700">Audience Reach</p>
                      <div className="grid grid-cols-1 gap-2.5">
                        <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600">Recipients</span>
                          <span className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                            {segmentStats.total}
                          </span>
                        </div>
                        <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600">VIP Members</span>
                          <span className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                            {segmentStats.premium}
                          </span>
                        </div>
                        <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600">
                            With Special Dates
                          </span>
                          <span className="text-sm font-mono font-bold text-emerald-700 tabular-nums">
                            {segmentStats.events}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2.5">
                      <p className="text-xs font-semibold text-slate-700">Insert Variable</p>
                      <div className="space-y-2">
                        {VARIABLE_GUIDE.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                message: formData.message + " " + v.id,
                              });
                              toast({ title: "Variable Added" });
                            }}
                            className="w-full text-left p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-900 transition-colors"
                          >
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-xs font-semibold font-mono text-slate-900">
                                {v.id}
                              </span>
                              <span className="text-xs text-slate-500">{v.label}</span>
                            </div>
                            <p className="text-xs text-slate-400">Example: {v.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <SectionCard
            title="Sequence History"
            description="Scheduled and sent loyalty broadcast campaigns"
            bodyClassName="p-0"
            headerRight={
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 tabular-nums">
                <History className="h-3.5 w-3.5" />
                {campaigns.length} campaigns
              </div>
            }
          >
            {isLoading ? (
              <div className="py-16 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="p-6">
                <EmptyStatePanel
                  icon={MessageSquare}
                  title="No broadcast campaigns yet"
                  description="Create your first WhatsApp campaign sequence to engage member segments."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[680px]">
                  <TableHeader>
                    <TableRow className="bg-slate-50/70">
                      <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">
                        Campaign
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 h-11">
                        Target Segment
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 h-11 text-center">
                        Status
                      </TableHead>
                      <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                        Recipients
                      </TableHead>
                      <TableHead className="text-right pr-6 h-11 w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((c: any) => (
                      <TableRow key={c.id} className="group hover:bg-slate-50/60 border-b">
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                              <MessageSquare className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 text-left">
                              <span className="text-sm font-semibold text-slate-900 truncate block max-w-[220px]">
                                {c.title}
                              </span>
                              <span className="text-xs text-slate-500 font-mono tabular-nums">
                                {c.createdAt?.toDate
                                  ? format(c.createdAt.toDate(), "dd MMM yyyy")
                                  : "Recently"}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-xs font-medium capitalize border-slate-200 text-slate-700 whitespace-nowrap"
                          >
                            {c.segment?.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={cn(
                              "text-xs font-medium capitalize border",
                              c.status === "sent"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            )}
                          >
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm font-semibold text-slate-900 tabular-nums">
                          {c.recipientCount ?? 0}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit campaign ${c.title}`}
                              className="h-8 w-8 rounded-lg text-slate-600 hover:text-slate-900"
                              onClick={() => handleEdit(c)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete campaign ${c.title}`}
                              className="h-8 w-8 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                              onClick={() => {
                                setCampaignToDelete(c);
                                setIsDeleteAlertOpen(true);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl bg-slate-900 text-white border border-slate-800 p-6 space-y-5 text-left">
            <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold tracking-tight">Personalization Mapping</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Biztrix Growth Engine automatically replaces placeholders like customer name,
                points balance, and digital card numbers for each recipient during dispatch.
              </p>
            </div>
            <Separator className="bg-white/15" />
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <p className="text-xs font-semibold text-white">Dynamic Variables</p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Include <span className="font-mono text-white">{"{{name}}"}</span> and{" "}
                <span className="font-mono text-white">{"{{card_number}}"}</span> to personalize
                every broadcast message.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="w-full h-10 bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl text-xs font-semibold"
            >
              <Link href="/whatsapp-automation/config">
                Update API Config <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-left">
              <p className="text-xs font-semibold text-slate-900">Template Compliance</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ensure your Meta Cloud templates are approved before scheduling bulk loyalty
                campaigns.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-2xl border border-slate-200 p-6">
          <AlertDialogHeader>
            <div className="h-11 w-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-3">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">
              Delete Campaign?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600 leading-relaxed">
              Permanently remove{" "}
              <span className="font-semibold text-slate-900">
                &ldquo;{campaignToDelete?.title}&rdquo;
              </span>{" "}
              from your campaign history?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-3">
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline" className="flex-1 h-10 rounded-xl text-xs">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                onClick={confirmDelete}
                className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                Delete Campaign
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
