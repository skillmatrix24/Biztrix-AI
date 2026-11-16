"use client";

import { useState, useMemo } from "react";
import {
  Wrench,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  Loader2,
  ChevronRight,
  BadgeCheck,
  Bot,
  Sparkles,
  SmartphoneNfc,
  Search,
  Plus,
  Activity,
  ArrowRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PageHeader,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  useCollection,
  updateDocumentNonBlocking,
  runTransaction,
} from "@/firebase";
import { collection, doc, serverTimestamp, query, where } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";
import { sendWhatsAppTemplate } from "@/app/actions/whatsapp-actions";

const SERVICE_STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: any }
> = {
  OPEN: {
    label: "Ticket Raised",
    className: "bg-sky-50 text-sky-700 border-sky-200",
    icon: Zap,
  },
  TRIAGED: {
    label: "Triaged",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: Info,
  },
  SCHEDULED: {
    label: "Visit Scheduled",
    className: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Clock,
  },
  IN_PROGRESS: {
    label: "Work Underway",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Activity,
  },
  RESOLVED: {
    label: "Resolved",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  CLOSED: {
    label: "Closed",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: BadgeCheck,
  },
};

export default function SolarServiceDetailPage(props: { params: { id: string } }) {
  const { id } = props.params;
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const serviceRef = useMemoFirebase(
    () =>
      businessId && id
        ? doc(firestore, "businesses", businessId, "solarServiceRequests", id)
        : null,
    [firestore, businessId, id]
  );
  const { data: service, isLoading: isServiceLoading } = useDoc<any>(serviceRef);

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const activeAddonIds = useMemo(() => business?.activeAddonIds || [], [business]);
  const isWhatsappEntitled =
    activeAddonIds.includes("feat_whatsapp") || activeAddonIds.includes("suite_growth");

  const teamQuery = useMemoFirebase(
    () => (businessId ? query(collection(firestore, "users"), where("businessId", "==", businessId)) : null),
    [firestore, businessId]
  );
  const { data: businessUsers = [] } = useCollection<any>(teamQuery);

  const productsQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "products") : null),
    [firestore, businessId]
  );
  const { data: products = [] } = useCollection<any>(productsQuery);

  const [activeTab, setActiveTab] = useState("overview");
  const [partSearch, setPartSearch] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  const inStockProducts = useMemo(() => {
    const q = partSearch.trim().toLowerCase();
    return (products || []).filter((p: any) => {
      if ((p.stock || 0) <= 0) return false;
      if (!q) return true;
      return (
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
      );
    });
  }, [products, partSearch]);

  const handleUpdateStatus = (status: string) => {
    if (!serviceRef) return;
    updateDocumentNonBlocking(serviceRef, { status, updatedAt: serverTimestamp() });
    toast({ title: "Ticket status updated" });
  };

  const handleNotifyCustomer = async () => {
    if (!service || !businessId) return;

    if (!isWhatsappEntitled) {
      toast({
        title: "Growth Feature Required",
        description: "Customer WhatsApp notifications require the Growth Suite.",
        action: (
          <Button variant="outline" size="sm" asChild>
            <Link href="/marketplace">Upgrade</Link>
          </Button>
        ),
      });
      return;
    }

    const waConfig = business?.whatsappApiConfig;
    if (!waConfig?.isVerified) {
      toast({ variant: "destructive", title: "API Unlinked" });
      return;
    }

    setIsNotifying(true);
    try {
      const targetPhone = "91" + (service.customerPhone || "").replace(/\D/g, "").slice(-10);
      const res = await sendWhatsAppTemplate(
        businessId,
        { phoneId: waConfig.phoneId, accessToken: waConfig.accessToken },
        targetPhone,
        waConfig.welcomeTemplateName || "hello_world",
        waConfig.welcomeLanguageCode || "en_IN",
        [
          {
            type: "body",
            parameters: [
              { type: "text", text: service.customerName },
              {
                type: "text",
                text: `Your solar service ticket #${id
                  .slice(-6)
                  .toUpperCase()} is now: ${service.status}`,
              },
              {
                type: "text",
                text: `${window.location.origin}/portal/solar?bId=${businessId}`,
              },
            ],
          },
        ]
      );
      if (res.success) toast({ title: "Notification sent" });
      else toast({ variant: "destructive", title: "Dispatch failed", description: res.error });
    } finally {
      setIsNotifying(false);
    }
  };

  const handleUpdateAssignee = (userId: string) => {
    if (!serviceRef) return;
    const staff = businessUsers.find((u: any) => u.id === userId);
    updateDocumentNonBlocking(serviceRef, {
      assignedTo: userId,
      assignedName: staff?.name || "Unassigned",
      status: "SCHEDULED",
      updatedAt: serverTimestamp(),
    });
    toast({ title: "Technician assigned" });
  };

  const handleUpdateField = (field: string, value: any) => {
    if (!serviceRef) return;
    updateDocumentNonBlocking(serviceRef, { [field]: value, updatedAt: serverTimestamp() });
  };

  const handleIssuePart = async (product: any) => {
    if (!serviceRef || !service || !businessId || isUpdating) return;

    setIsUpdating(true);
    try {
      const productRef = doc(firestore, "businesses", businessId, "products", product.id);

      await runTransaction(firestore, async (transaction) => {
        const productSnap = await transaction.get(productRef);
        if (!productSnap.exists()) throw new Error("PRODUCT_NOT_FOUND");

        const pData = productSnap.data() as any;
        if ((pData.stock || 0) < 1) throw new Error("INSUFFICIENT_STOCK");

        const newStock = pData.stock - 1;
        const currentMaterials = service.materialsUsed || [];

        transaction.update(productRef, { stock: newStock });
        transaction.update(serviceRef, {
          materialsUsed: [
            ...currentMaterials,
            {
              productId: product.id,
              productName: product.name,
              quantity: 1,
              timestamp: new Date().toISOString(),
            },
          ],
          updatedAt: serverTimestamp(),
        });

        const cbRef = doc(collection(firestore, "businesses", businessId, "cashbook"));
        transaction.set(cbRef, {
          businessId,
          type: "debit",
          amount: parseFloat(product.price) || 0,
          particulars: `Service Part: ${product.name} (Ticket: ${id
            .slice(-6)
            .toUpperCase()})`,
          category: "Other",
          date: new Date().toISOString().split("T")[0],
          createdAt: serverTimestamp(),
        });
      });

      toast({
        title: "Part issued",
        description: "Inventory stock and ticket usage updated.",
      });
    } catch (e: any) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Dispatch failed",
        description: e.message,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const currencySymbol = getCurrencySymbol(business?.currency);

  if (isProfileLoading || isServiceLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400 h-8 w-8" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <EmptyStatePanel
          icon={Wrench}
          title="Service ticket not found"
          description="This service request may have been removed."
          action={
            <Button asChild variant="outline" className="rounded-xl border-slate-200">
              <Link href="/solar/service">Back to Service Desk</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const sInfo = SERVICE_STATUS_CONFIG[service.status] || SERVICE_STATUS_CONFIG.OPEN;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 text-left">
      <PageHeader
        breadcrumb={`Ticket TCK-${id.slice(-8).toUpperCase()}`}
        title={service.customerName || "Service Ticket"}
        description="Assign technicians, log replacement inventory parts, and resolve customer issues."
        backHref="/solar/service"
        backLabel="Back to service desk"
        actions={
          <Select value={service.status} onValueChange={handleUpdateStatus}>
            <SelectTrigger
              aria-label="Ticket status"
              className={cn("h-10 rounded-xl font-medium w-48 border", sInfo.className)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              {Object.keys(SERVICE_STATUS_CONFIG).map((s) => (
                <SelectItem key={s} value={s} className="text-sm font-medium">
                  {SERVICE_STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="bg-slate-900 p-6 sm:p-8 text-white border-b border-slate-800 space-y-5">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  <Wrench className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {service.category?.replace(/_/g, " ") || "Service Request"}
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Source: {service.requestSource || "Portal"}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-sm text-slate-200 leading-relaxed">
                {service.description || "No detailed issue description provided."}
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 border-b border-slate-100 bg-slate-50/50">
                <TabsList className="bg-transparent h-12 p-0 gap-6 border-none overflow-x-auto flex">
                  <TabsTrigger
                    value="overview"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:bg-transparent rounded-none h-12 text-xs font-semibold text-slate-500 px-0"
                  >
                    Assignment & Schedule
                  </TabsTrigger>
                  <TabsTrigger
                    value="materials"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:bg-transparent rounded-none h-12 text-xs font-semibold text-slate-500 px-0"
                  >
                    Parts & Inventory ({(service.materialsUsed || []).length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="warranty"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:bg-transparent rounded-none h-12 text-xs font-semibold text-slate-500 px-0"
                  >
                    Warranty Coverage
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6 sm:p-8 text-left">
                <TabsContent value="overview" className="m-0 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="tech-assignee" className="text-xs font-medium text-slate-700">
                        Assigned Technician
                      </Label>
                      <Select
                        value={service.assignedTo || ""}
                        onValueChange={handleUpdateAssignee}
                      >
                        <SelectTrigger
                          id="tech-assignee"
                          className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm"
                        >
                          <SelectValue placeholder="Select specialist" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          {businessUsers.map((u: any) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} ({u.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="visit-schedule" className="text-xs font-medium text-slate-700">
                        Scheduled Visit Date & Time
                      </Label>
                      <Input
                        id="visit-schedule"
                        type="datetime-local"
                        value={service.scheduledAt || ""}
                        onChange={(e) => handleUpdateField("scheduledAt", e.target.value)}
                        className="h-10 rounded-xl bg-slate-50 border-slate-200 font-mono tabular-nums text-sm"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                    <Info className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-900">
                        Pre-Dispatch Check
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Verify inverter fault codes or monitoring telemetry before dispatching
                        a field team for generation drop issues.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="materials" className="m-0 space-y-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Replacement Parts Issued
                      </h3>
                      <p className="text-xs text-slate-500">
                        Inventory items consumed while resolving this ticket.
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-slate-50 border-slate-200 text-slate-700 text-xs font-medium"
                    >
                      Atomic Stock Sync
                    </Badge>
                  </div>

                  {(service.materialsUsed || []).length > 0 && (
                    <div className="space-y-2">
                      {(service.materialsUsed || []).map((m: any, i: number) => (
                        <div
                          key={i}
                          className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-semibold text-emerald-950">
                              {m.productName}
                            </p>
                            <p className="text-xs font-mono tabular-nums text-emerald-700">
                              {m.timestamp
                                ? format(new Date(m.timestamp), "dd MMM yyyy, HH:mm")
                                : "Issued"}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="bg-white border-emerald-200 text-emerald-700 text-xs font-medium"
                          >
                            Issued ({m.quantity || 1})
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <Label htmlFor="part-search" className="text-xs font-semibold text-slate-700 block">
                      Issue Replacement Part from Inventory
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="part-search"
                        value={partSearch}
                        onChange={(e) => setPartSearch(e.target.value)}
                        placeholder="Search inventory by part name or SKU..."
                        className="h-10 pl-9 rounded-xl bg-white border-slate-200 text-sm"
                      />
                    </div>
                    <ScrollArea className="h-56 rounded-xl border border-slate-200 bg-white">
                      {inStockProducts.length === 0 ? (
                        <p className="p-6 text-center text-xs text-slate-500">
                          No matching in-stock inventory items found.
                        </p>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {inStockProducts.map((p: any) => (
                            <button
                              key={p.id}
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleIssuePart(p)}
                              className="w-full p-3.5 hover:bg-slate-50 flex justify-between items-center text-left transition-colors disabled:opacity-50"
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {p.name}
                                </p>
                                <p className="text-xs font-mono tabular-nums text-slate-500">
                                  {p.sku || "No SKU"} • Stock: {p.stock} {p.unit || "pcs"} •{" "}
                                  {currencySymbol}
                                  {parseFloat(p.price || 0).toLocaleString()}
                                </p>
                              </div>
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                                <Plus className="h-3.5 w-3.5" /> Issue 1
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="warranty" className="m-0">
                  {service.warrantyId ? (
                    <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="h-11 w-11 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                          <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-emerald-950">
                            Warranty Coverage Verified
                          </h3>
                          <p className="text-xs font-mono tabular-nums text-emerald-700 mt-0.5">
                            Certificate ID: {service.warrantyId}
                          </p>
                        </div>
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        className="h-10 rounded-xl bg-white border-emerald-200 text-emerald-800 font-medium"
                      >
                        <Link href={`/solar/warranties/${service.warrantyId}`}>
                          View Certificate
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <EmptyStatePanel
                      icon={ShieldCheck}
                      title="No warranty linked"
                      description="This service ticket is not associated with an active warranty certificate."
                    />
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <SectionCard title="Client Connect">
            {isWhatsappEntitled ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Send a real-time ticket status update to the customer on WhatsApp.
                </p>
                <Button
                  type="button"
                  onClick={handleNotifyCustomer}
                  disabled={isNotifying}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
                >
                  {isNotifying ? (
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  ) : (
                    <SmartphoneNfc className="h-4 w-4 mr-2" />
                  )}
                  Send Status Update
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  WhatsApp automation is available in the Growth Suite.
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="w-full h-10 rounded-xl border-slate-200 font-medium"
                >
                  <Link href="/marketplace">
                    Activate Growth Suite <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Ticket Context">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Linked Installation</p>
                <Button
                  asChild
                  variant="link"
                  className="h-auto p-0 font-semibold text-slate-900 text-sm"
                >
                  <Link href={`/solar/installations/${service.installationId}`}>
                    View Site Record <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Logged Date</p>
                <p className="text-sm font-mono tabular-nums font-medium text-slate-800">
                  {service.createdAt?.toDate
                    ? format(service.createdAt.toDate(), "dd MMM yyyy")
                    : "--"}
                </p>
              </div>
            </div>
          </SectionCard>

          <div className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </div>
              <h3 className="text-base font-bold">Resolution Guidance</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Category {service.category?.replace(/_/g, " ") || "service"} requires field
              diagnostics. Dispatch a specialist equipped with an AC/DC multimeter and
              isolation testing kit.
            </p>
            <Separator className="bg-white/10" />
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Bot className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Service SLA & parts trace active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
