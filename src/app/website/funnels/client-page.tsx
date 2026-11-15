"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  Layers,
  Layout,
  Loader2,
  MousePointer2,
  Plus,
  Rocket,
  Save,
  ShoppingBag,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
  useUser,
} from "@/firebase";
import { collection, doc, limit, orderBy, query, where } from "firebase/firestore";
import {
  computeFunnelMetrics,
  createFunnelFromTemplate,
  createStoreSection,
  moveStoreSection,
  normalizeAnnouncementBar,
  normalizeFooterConfig,
  normalizeFunnelConfig,
  normalizeStoreCoupons,
  normalizeStoreThemeConfig,
  removeStoreSection,
  resolveFunnelPreviewUrl,
  sanitizeStoreSlug,
  STORE_FUNNEL_TEMPLATES,
  StoreFunnelConfig,
  StoreFunnelGoal,
  StoreFunnelTemplateId,
  StoreSection,
  StoreSectionContent,
  StoreSectionType,
  updateStoreSectionItem,
} from "@/lib/storefront-engine";
import {
  deleteFunnelPage,
  saveFunnelPage,
  syncStorefrontRelays,
} from "@/app/actions/website-actions";
import { AddSectionDialog } from "@/components/website/add-section-dialog";
import { SectionEditDialog } from "@/components/website/section-edit-dialog";
import { StoreSimulator } from "@/components/website/store-simulator";

export default function LandingPageBuilderClient() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isSaving, startSavingTransition] = useTransition();

  // 1. Resolve User & Business Context
  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);
  const currencySymbol = getCurrencySymbol(business?.currency);

  // 2. Fetch Websites Docs (Main Storefront + Funnels)
  const websitesQuery = useMemoFirebase(
    () =>
      businessId ? collection(firestore, "businesses", businessId, "websites") : null,
    [firestore, businessId]
  );
  const { data: websiteDocs = [], isLoading: isWebsitesLoading } =
    useCollection<any>(websitesQuery);

  // 3. Fetch Catalog Products
  const productsQuery = useMemoFirebase(
    () =>
      businessId ? collection(firestore, "businesses", businessId, "products") : null,
    [firestore, businessId]
  );
  const { data: rawProducts = [] } = useCollection<any>(productsQuery);

  // 4. Fetch Attribution Telemetry (Orders, Events, Leads)
  const eventsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "storefront_events"),
            orderBy("createdAt", "desc"),
            limit(150)
          )
        : null,
    [firestore, businessId]
  );
  const { data: rawEvents = [] } = useCollection<any>(eventsQuery);

  const ordersQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "orders"),
            where("source", "==", "storefront"),
            limit(150)
          )
        : null,
    [firestore, businessId]
  );
  const { data: rawOrders = [] } = useCollection<any>(ordersQuery);

  const leadsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "storefront_leads"),
            limit(150)
          )
        : null,
    [firestore, businessId]
  );
  const { data: rawLeads = [] } = useCollection<any>(leadsQuery);

  // Sync relays on mount so funnel leads/orders/views appear immediately
  useEffect(() => {
    if (!businessId || !user?.uid) return;
    let active = true;
    user
      .getIdToken()
      .then((idToken) => {
        if (!active) return;
        syncStorefrontRelays({ businessId, idToken }).catch(() => {});
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [businessId, user]);

  // Derived Main Storefront Config & Catalog
  const mainWebsiteDoc = useMemo(
    () => (websiteDocs || []).find((d: any) => d.id === "main") || {},
    [websiteDocs]
  );

  const funnels: StoreFunnelConfig[] = useMemo(() => {
    return (websiteDocs || [])
      .filter(
        (d: any) =>
          d &&
          d.id !== "main" &&
          d.kind !== "funnel_deleted" &&
          (d.kind === "funnel" || String(d.id || "").startsWith("funnel_"))
      )
      .map((d: any) => normalizeFunnelConfig(d, d.id));
  }, [websiteDocs]);

  const onlineProducts = useMemo(
    () => (rawProducts || []).filter((p: any) => p.showOnWebsite && !p.isArchived),
    [rawProducts]
  );

  // Storefront inherited settings
  const storeName = mainWebsiteDoc.storeName || business?.name || "My Store";
  const storeSlug = mainWebsiteDoc.slug || business?.slug || "";
  const storePrimaryColor = mainWebsiteDoc.primaryColor || "#0C83B3";
  const storeUiStyle = mainWebsiteDoc.uiStyle || "modern";
  const storeThemeConfig = useMemo(
    () => normalizeStoreThemeConfig(mainWebsiteDoc.themeConfig, storeUiStyle),
    [mainWebsiteDoc.themeConfig, storeUiStyle]
  );
  const storeAnnouncementBar = useMemo(
    () => normalizeAnnouncementBar(mainWebsiteDoc.announcementBar),
    [mainWebsiteDoc.announcementBar]
  );
  const storeFooterConfig = useMemo(
    () => normalizeFooterConfig(mainWebsiteDoc.footerConfig),
    [mainWebsiteDoc.footerConfig]
  );
  const storeCoupons = useMemo(
    () => normalizeStoreCoupons(mainWebsiteDoc.coupons),
    [mainWebsiteDoc.coupons]
  );

  // Selected & Draft Funnel State
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  const [draftFunnel, setDraftFunnel] = useState<StoreFunnelConfig | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Dialogs State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTplId, setNewTplId] = useState<StoreFunnelTemplateId>("product_launch");
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newProductId, setNewProductId] = useState("");

  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (funnels.length > 0) {
      const currentExists = selectedFunnelId && funnels.some((f) => f.id === selectedFunnelId);
      const nextTarget = currentExists
        ? funnels.find((f) => f.id === selectedFunnelId)!
        : funnels[0];
      if (!selectedFunnelId || !currentExists) {
        setSelectedFunnelId(nextTarget.id);
        setDraftFunnel(nextTarget);
        setHasUnsavedChanges(false);
      } else if (!hasUnsavedChanges) {
        setDraftFunnel(nextTarget);
      }
    } else if (selectedFunnelId !== null) {
      setSelectedFunnelId(null);
      setDraftFunnel(null);
    }
  }, [funnels, selectedFunnelId, hasUnsavedChanges]);

  // Metrics across all funnels & active funnel
  const metricsByFunnelId = useMemo(() => {
    const map: Record<string, ReturnType<typeof computeFunnelMetrics>> = {};
    for (const f of funnels) {
      map[f.id] = computeFunnelMetrics({
        funnelId: f.id,
        funnelSlug: f.slug,
        events: rawEvents || [],
        orders: rawOrders || [],
        leads: rawLeads || [],
      });
    }
    return map;
  }, [funnels, rawEvents, rawOrders, rawLeads]);

  const aggregateStats = useMemo(() => {
    let totalViews = 0;
    let totalRevenue = 0;
    let totalConversions = 0;
    let publishedCount = 0;
    for (const f of funnels) {
      if (f.status === "published") publishedCount += 1;
      const m = metricsByFunnelId[f.id];
      if (m) {
        totalViews += m.views;
        totalRevenue += m.revenue;
        totalConversions += m.ordersCount + m.leadsCount;
      }
    }
    const convRate =
      totalViews > 0 ? Number(((totalConversions / totalViews) * 100).toFixed(1)) : 0;
    return {
      totalFunnels: funnels.length,
      publishedCount,
      totalViews,
      totalRevenue,
      convRate,
    };
  }, [funnels, metricsByFunnelId]);

  const updateDraft = (updater: (prev: StoreFunnelConfig) => StoreFunnelConfig) => {
    setDraftFunnel((prev) => {
      if (!prev) return prev;
      setHasUnsavedChanges(true);
      return updater(prev);
    });
  };

  const handleCreateFunnel = () => {
    if (!businessId || !user) return;
    const pickedProd = onlineProducts.find((p: any) => p.id === newProductId);
    const created = createFunnelFromTemplate({
      templateId: newTplId,
      name: newName.trim() || undefined,
      slug: newSlug.trim() || undefined,
      targetProductId: newProductId === "none" ? "" : newProductId,
      targetProductName: pickedProd?.name,
    });
    // Avoid slug collision locally before server check
    if (funnels.some((f) => f.slug === created.slug)) {
      created.slug = `${created.slug}-${Math.floor(100 + Math.random() * 900)}`;
    }

    startSavingTransition(async () => {
      const idToken = await user.getIdToken();
      const res = await saveFunnelPage({
        idToken,
        businessId,
        funnel: created,
      });
      if (!res.success || !res.funnel) {
        toast({
          variant: "destructive",
          title: "Could Not Create Funnel",
          description: res.message,
        });
        return;
      }
      setSelectedFunnelId(res.funnel.id);
      setDraftFunnel(res.funnel);
      setHasUnsavedChanges(false);
      setIsCreateOpen(false);
      setNewName("");
      setNewSlug("");
      setNewProductId("");
      toast({
        title: "Sales Funnel Created",
        description: `${res.funnel.name} is ready for customization.`,
      });
    });
  };

  const handleSaveDraft = (overrideStatus?: "draft" | "published") => {
    if (!businessId || !user || !draftFunnel) return;
    const payload: StoreFunnelConfig = {
      ...draftFunnel,
      status: overrideStatus || draftFunnel.status,
    };

    startSavingTransition(async () => {
      const idToken = await user.getIdToken();
      const res = await saveFunnelPage({
        idToken,
        businessId,
        funnel: payload,
      });
      if (!res.success || !res.funnel) {
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: res.message,
        });
        return;
      }
      setDraftFunnel(res.funnel);
      setHasUnsavedChanges(false);
      toast({
        title: overrideStatus === "published" ? "Funnel Published Live" : "Funnel Saved",
        description: res.message,
      });
    });
  };

  const handleCloneFunnel = () => {
    if (!businessId || !user || !draftFunnel) return;
    const clonedId = `funnel_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const cloned: StoreFunnelConfig = {
      ...draftFunnel,
      id: clonedId,
      name: `${draftFunnel.name} (Copy)`,
      slug: sanitizeStoreSlug(`${draftFunnel.slug}-copy-${Math.floor(10 + Math.random() * 89)}`),
      status: "draft",
      sections: draftFunnel.sections.map((s) => ({
        ...s,
        content: { ...s.content },
      })),
    };

    startSavingTransition(async () => {
      const idToken = await user.getIdToken();
      const res = await saveFunnelPage({ idToken, businessId, funnel: cloned });
      if (res.success && res.funnel) {
        setSelectedFunnelId(res.funnel.id);
        setDraftFunnel(res.funnel);
        setHasUnsavedChanges(false);
        toast({
          title: "Funnel Cloned",
          description: `Created draft "${res.funnel.name}".`,
        });
      } else {
        toast({ variant: "destructive", title: "Clone Failed", description: res.message });
      }
    });
  };

  const handleDeleteFunnel = (funnelId: string) => {
    if (!businessId || !user) return;
    startSavingTransition(async () => {
      const idToken = await user.getIdToken();
      const res = await deleteFunnelPage({ idToken, businessId, funnelId });
      if (res.success) {
        if (selectedFunnelId === funnelId) {
          setSelectedFunnelId(null);
          setDraftFunnel(null);
          setHasUnsavedChanges(false);
        }
        toast({ title: "Funnel Deleted", description: res.message });
      } else {
        toast({ variant: "destructive", title: "Delete Failed", description: res.message });
      }
    });
  };

  const editingSection: StoreSection | null = useMemo(() => {
    if (!draftFunnel || !editingSectionId) return null;
    return draftFunnel.sections.find((s) => s.id === editingSectionId) || null;
  }, [draftFunnel, editingSectionId]);

  const effectivePrimaryColor =
    draftFunnel && !draftFunnel.inheritStoreTheme && draftFunnel.accentColorOverride
      ? draftFunnel.accentColorOverride
      : storePrimaryColor;

  const activePreviewUrl = draftFunnel
    ? resolveFunnelPreviewUrl({
        businessId,
        businessSlug: storeSlug,
        funnelId: draftFunnel.id,
        funnelSlug: draftFunnel.slug,
        isPreview: draftFunnel.status !== "published",
      })
    : "/funnel";

  const copyShareUrl = (funnel: StoreFunnelConfig) => {
    const path = resolveFunnelPreviewUrl({
      businessId,
      businessSlug: storeSlug,
      funnelId: funnel.id,
      funnelSlug: funnel.slug,
      isPreview: funnel.status !== "published",
    });
    const fullUrl =
      typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(funnel.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Funnel Link Copied",
      description: "Share this campaign URL on WhatsApp, Instagram Bio, or Meta Ads.",
    });
  };

  if (isProfileLoading || isWebsitesLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-primary mb-3" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Loading Landing Page Builder...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 text-left">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase">
              Store Builder · Sales Funnels
            </Badge>
            <Badge variant="outline" className="text-[10px] font-bold uppercase">
              Inherits Storefront Theme & Checkout
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase">
            Landing Page Builder
          </h1>
          <p className="text-xs text-muted-foreground max-w-2xl">
            High-converting single-product launch pages, combo COD funnels, and lead capture pages — reusing your Storefront Manager theme, coupons, Razorpay, WhatsApp & shipping rules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-bold">
            <Link href="/website">
              <ShoppingBag className="h-3.5 w-3.5 mr-1.5" /> Storefront Settings
            </Link>
          </Button>
          <Button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="rounded-xl text-xs font-black uppercase bg-primary text-white shadow-md"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Create Sales Funnel
          </Button>
        </div>
      </div>

      {/* Funnel KPIs Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                Total Funnels
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {aggregateStats.totalFunnels}
              </p>
              <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
                {aggregateStats.publishedCount} Published Live
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                Funnel Visits
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {aggregateStats.totalViews.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                Tracked per campaign
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <MousePointer2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                Funnel Revenue
              </p>
              <p className="text-2xl font-black text-emerald-700 mt-1 tabular-nums">
                {currencySymbol}
                {aggregateStats.totalRevenue.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                Attributed paid orders
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                Avg Conversion
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                {aggregateStats.convRate}%
              </p>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                Orders + Leads / Visits
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Target className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnels Switcher & Quick Cards */}
      {funnels.length === 0 ? (
        <Card className="border-dashed border-2 bg-white rounded-3xl">
          <CardContent className="p-8 md:p-10 space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Rocket className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-black uppercase text-slate-900">
                Launch Your First High-Converting Sales Funnel
              </h2>
              <p className="text-xs text-muted-foreground">
                Pick a pre-built conversion template below. All Storefront colors, logos, coupons, shipping rules, and Razorpay/COD/WhatsApp settings sync automatically.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {STORE_FUNNEL_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-5 rounded-2xl border bg-slate-50/70 hover:border-primary hover:bg-primary/5 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <Badge className="text-[9px] font-black uppercase bg-slate-900 text-white border-none">
                      {tpl.sectionTypes.length} Funnel Blocks
                    </Badge>
                    <h3 className="text-sm font-black uppercase text-slate-900">
                      {tpl.name}
                    </h3>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {tpl.tagline}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setNewTplId(tpl.id);
                        setNewName(tpl.name);
                        setNewSlug(tpl.defaultSlug);
                        setIsCreateOpen(true);
                      }}
                      className="flex-1 rounded-xl text-[11px] font-black uppercase"
                    >
                      Use Template
                    </Button>
                    <Button asChild type="button" variant="outline" size="sm" className="rounded-xl text-[11px] font-bold">
                      <Link
                        href={resolveFunnelPreviewUrl({
                          businessId,
                          templateId: tpl.id,
                          isPreview: true,
                        })}
                        target="_blank"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Existing Funnels Selector Strip */}
          <div className="flex flex-wrap items-center gap-2.5">
            {funnels.map((f) => {
              const m = metricsByFunnelId[f.id];
              const isSelected = draftFunnel?.id === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setSelectedFunnelId(f.id);
                    setDraftFunnel(f);
                    setHasUnsavedChanges(false);
                  }}
                  className={cn(
                    "px-4 py-2.5 rounded-2xl border text-left transition-all flex items-center gap-3",
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow-lg"
                      : "bg-white text-slate-900 hover:border-primary"
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase truncate max-w-[180px]">
                        {f.name}
                      </span>
                      <Badge
                        className={cn(
                          "text-[8px] font-black uppercase h-4 px-1.5 border-none",
                          f.status === "published"
                            ? "bg-emerald-500 text-white"
                            : isSelected
                              ? "bg-white/20 text-white"
                              : "bg-amber-100 text-amber-800"
                        )}
                      >
                        {f.status}
                      </Badge>
                    </div>
                    <p
                      className={cn(
                        "text-[10px] font-mono mt-0.5",
                        isSelected ? "text-slate-300" : "text-muted-foreground"
                      )}
                    >
                      /{f.slug} · {m?.ordersCount || 0} orders · {m?.views || 0} views
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {draftFunnel && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Left 7 Columns: Funnel Settings + Section Controls */}
              <div className="xl:col-span-7 space-y-6 min-w-0">
                {/* Action Bar & Status */}
                <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden">
                  <CardHeader className="bg-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                        <Flame className="h-4 w-4 text-amber-400" />
                        {draftFunnel.name}
                      </CardTitle>
                      <CardDescription className="text-slate-300 text-[11px]">
                        Public URL slug: <span className="font-mono text-white">/{draftFunnel.slug}</span>
                        {hasUnsavedChanges && " · Unsaved edits pending"}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyShareUrl(draftFunnel)}
                        className="h-8 rounded-xl text-[10px] font-black uppercase bg-white/10 text-white border-white/20 hover:bg-white/20"
                      >
                        {copiedId === draftFunnel.id ? (
                          <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 mr-1" />
                        )}
                        Copy URL
                      </Button>
                      <Button
                        asChild
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-xl text-[10px] font-black uppercase bg-white/10 text-white border-white/20 hover:bg-white/20"
                      >
                        <Link href={activePreviewUrl} target="_blank">
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Live View
                        </Link>
                      </Button>
                      <Button
                        asChild
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-xl text-[10px] font-black uppercase bg-white/10 text-white border-white/20 hover:bg-white/20"
                      >
                        <Link href={`/website/editor/${draftFunnel.id}`}>
                          <Layout className="h-3.5 w-3.5 mr-1" /> Visual Editor
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">
                          Funnel Campaign Name
                        </Label>
                        <Input
                          value={draftFunnel.name}
                          onChange={(e) =>
                            updateDraft((p) => ({ ...p, name: e.target.value }))
                          }
                          className="h-10 rounded-xl font-bold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">
                          Funnel Slug (URL Key)
                        </Label>
                        <Input
                          value={draftFunnel.slug}
                          onChange={(e) =>
                            updateDraft((p) => ({
                              ...p,
                              slug: sanitizeStoreSlug(e.target.value),
                            }))
                          }
                          className="h-10 rounded-xl font-mono text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">
                          Conversion Goal
                        </Label>
                        <Select
                          value={draftFunnel.goal}
                          onValueChange={(v) =>
                            updateDraft((p) => ({
                              ...p,
                              goal: v as StoreFunnelGoal,
                            }))
                          }
                        >
                          <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="direct_checkout">Direct Express Checkout</SelectItem>
                            <SelectItem value="lead_capture">Lead / Callback Capture</SelectItem>
                            <SelectItem value="whatsapp_consult">WhatsApp Consultation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">
                          Hero Target Product
                        </Label>
                        <Select
                          value={draftFunnel.targetProductId || "none"}
                          onValueChange={(v) =>
                            updateDraft((p) => ({
                              ...p,
                              targetProductId: v === "none" ? "" : v,
                            }))
                          }
                        >
                          <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                            <SelectValue placeholder="First online item" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Auto-select First Online Item</SelectItem>
                            {onlineProducts.map((prod: any) => (
                              <SelectItem key={prod.id} value={prod.id}>
                                {prod.name} (₹{prod.onlinePrice ?? prod.price ?? 0})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">
                          Default Promo Coupon
                        </Label>
                        <Select
                          value={draftFunnel.couponCode || "none"}
                          onValueChange={(v) =>
                            updateDraft((p) => ({
                              ...p,
                              couponCode: v === "none" ? "" : v,
                            }))
                          }
                        >
                          <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Auto-Applied Coupon</SelectItem>
                            {storeCoupons
                              .filter((c) => c.active)
                              .map((cpn) => (
                                <SelectItem key={cpn.id} value={cpn.code}>
                                  {cpn.code} (
                                  {cpn.discountType === "percent"
                                    ? `${cpn.discountValue}% OFF`
                                    : `₹${cpn.discountValue} OFF`}
                                  )
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-2xl border bg-slate-50 flex items-center justify-between gap-3">
                        <div>
                          <Label className="text-xs font-black uppercase text-slate-900">
                            Sticky Bottom CTA Bar
                          </Label>
                          <p className="text-[10px] text-muted-foreground">
                            Persistent mobile conversion bar scrolling straight to checkout
                          </p>
                        </div>
                        <Switch
                          checked={draftFunnel.stickyCtaEnabled}
                          onCheckedChange={(v) =>
                            updateDraft((p) => ({ ...p, stickyCtaEnabled: v }))
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">
                          Sticky CTA Button Text
                        </Label>
                        <Input
                          value={draftFunnel.stickyCtaLabel}
                          onChange={(e) =>
                            updateDraft((p) => ({
                              ...p,
                              stickyCtaLabel: e.target.value,
                            }))
                          }
                          placeholder="Claim Launch Offer Now"
                          className="h-10 rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div className="p-3.5 rounded-2xl border bg-slate-50 flex items-center justify-between gap-3">
                        <div>
                          <Label className="text-xs font-black uppercase text-slate-900">
                            Inherit Storefront Theme
                          </Label>
                          <p className="text-[10px] text-muted-foreground">
                            Uses your Storefront primary color, surface & typography
                          </p>
                        </div>
                        <Switch
                          checked={draftFunnel.inheritStoreTheme}
                          onCheckedChange={(v) =>
                            updateDraft((p) => ({ ...p, inheritStoreTheme: v }))
                          }
                        />
                      </div>

                      {!draftFunnel.inheritStoreTheme && (
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground">
                            Campaign Accent Color Override
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={draftFunnel.accentColorOverride || storePrimaryColor}
                              onChange={(e) =>
                                updateDraft((p) => ({
                                  ...p,
                                  accentColorOverride: e.target.value,
                                }))
                              }
                              className="h-10 w-14 p-1 rounded-xl"
                            />
                            <Input
                              value={draftFunnel.accentColorOverride || storePrimaryColor}
                              onChange={(e) =>
                                updateDraft((p) => ({
                                  ...p,
                                  accentColorOverride: e.target.value,
                                }))
                              }
                              className="h-10 rounded-xl font-mono text-xs font-bold uppercase flex-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SEO Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">
                          Funnel Meta Title (SEO)
                        </Label>
                        <Input
                          value={draftFunnel.seoTitle}
                          onChange={(e) =>
                            updateDraft((p) => ({ ...p, seoTitle: e.target.value }))
                          }
                          className="h-9 rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">
                          Funnel Meta Description
                        </Label>
                        <Input
                          value={draftFunnel.seoDescription}
                          onChange={(e) =>
                            updateDraft((p) => ({
                              ...p,
                              seoDescription: e.target.value,
                            }))
                          }
                          className="h-9 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isSaving}
                          onClick={handleCloneFunnel}
                          className="rounded-xl text-xs font-bold"
                        >
                          Clone Funnel
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isSaving}
                          onClick={() => handleDeleteFunnel(draftFunnel.id)}
                          className="rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isSaving}
                          onClick={() => handleSaveDraft("draft")}
                          className="rounded-xl text-xs font-black uppercase"
                        >
                          {isSaving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <Save className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Save Draft
                        </Button>
                        <Button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleSaveDraft("published")}
                          className="rounded-xl text-xs font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                        >
                          {draftFunnel.status === "published"
                            ? "Update Live Funnel"
                            : "Publish Live"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Reused Section & Layout Controls */}
                <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden">
                  <CardHeader className="p-5 border-b flex flex-row items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-black uppercase tracking-tight">
                        Funnel Sections ({draftFunnel.sections.length})
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Reorder, customize copy/pricing tiers/order bump, or add any of the 23 Storefront & Funnel blocks.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setIsAddSectionOpen(true)}
                      className="rounded-xl text-[11px] font-black uppercase shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Section
                    </Button>
                  </CardHeader>

                  <CardContent className="p-4 space-y-2.5">
                    {draftFunnel.sections.map((section, idx) => (
                      <div
                        key={section.id}
                        className={cn(
                          "p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all",
                          section.status === "Active"
                            ? "bg-white border-slate-200"
                            : "bg-slate-50 border-slate-100 opacity-65"
                        )}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono text-muted-foreground">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-black uppercase text-slate-900 truncate">
                              {section.content.title || section.label}
                            </span>
                            <Badge variant="outline" className="text-[9px] font-bold uppercase">
                              {section.type}
                            </Badge>
                          </div>
                          {section.content.subtitle && (
                            <p className="text-[11px] text-muted-foreground truncate max-w-md">
                              {section.content.subtitle}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Move up"
                            disabled={idx === 0}
                            onClick={() =>
                              updateDraft((p) => ({
                                ...p,
                                sections: moveStoreSection(p.sections, section.id, "up"),
                              }))
                            }
                            className="h-8 w-8 rounded-lg"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Move down"
                            disabled={idx === draftFunnel.sections.length - 1}
                            onClick={() =>
                              updateDraft((p) => ({
                                ...p,
                                sections: moveStoreSection(p.sections, section.id, "down"),
                              }))
                            }
                            className="h-8 w-8 rounded-lg"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Toggle visibility"
                            onClick={() =>
                              updateDraft((p) => ({
                                ...p,
                                sections: updateStoreSectionItem(p.sections, section.id, {
                                  status:
                                    section.status === "Active" ? "Inactive" : "Active",
                                }),
                              }))
                            }
                            className="h-8 w-8 rounded-lg"
                          >
                            {section.status === "Active" ? (
                              <Eye className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSectionId(section.id)}
                            className="h-8 px-2.5 rounded-lg text-[10px] font-black uppercase"
                          >
                            <Edit2 className="h-3 w-3 mr-1" /> Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Delete section"
                            onClick={() =>
                              updateDraft((p) => ({
                                ...p,
                                sections: removeStoreSection(p.sections, section.id, {
                                  protectProducts: false,
                                }),
                              }))
                            }
                            className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Right 5 Columns: Live Funnel Simulator */}
              <div className="xl:col-span-5 xl:sticky xl:top-20 space-y-4 min-w-0">
                <StoreSimulator
                  storeName={storeName}
                  logoUrl={mainWebsiteDoc.logoUrl || business?.logoUrl || ""}
                  primaryColor={effectivePrimaryColor}
                  uiStyle={storeUiStyle}
                  codEnabled={mainWebsiteDoc.codEnabled ?? true}
                  whatsappOrderEnabled={mainWebsiteDoc.whatsappOrderEnabled ?? true}
                  sections={draftFunnel.sections}
                  themeConfig={storeThemeConfig}
                  announcementBar={storeAnnouncementBar}
                  footerConfig={storeFooterConfig}
                  sampleProducts={onlineProducts}
                  mode="funnel"
                  stickyCtaLabel={
                    draftFunnel.stickyCtaEnabled ? draftFunnel.stickyCtaLabel : undefined
                  }
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Sales Funnel Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden bg-white text-left">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <DialogTitle className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" /> Create High-Converting Sales Funnel
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs">
              Select a proven conversion template and link a flagship catalog item.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">
                1. Choose Funnel Blueprint Template
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {STORE_FUNNEL_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setNewTplId(tpl.id);
                      if (!newName) setNewName(tpl.name);
                      if (!newSlug) setNewSlug(tpl.defaultSlug);
                    }}
                    className={cn(
                      "p-3.5 rounded-2xl border text-left transition-all space-y-1.5",
                      newTplId === tpl.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <Badge variant="outline" className="text-[8px] font-black uppercase">
                      {tpl.sectionTypes.length} Sections
                    </Badge>
                    <p className="text-xs font-black uppercase text-slate-900 leading-tight">
                      {tpl.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      {tpl.tagline}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  2. Funnel Campaign Name
                </Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Monsoon Mega Launch Offer"
                  className="h-10 rounded-xl font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  3. URL Slug
                </Label>
                <Input
                  value={newSlug}
                  onChange={(e) => setNewSlug(sanitizeStoreSlug(e.target.value))}
                  placeholder="monsoon-mega-offer"
                  className="h-10 rounded-xl font-mono text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">
                4. Link Primary Catalog Product (Optional)
              </Label>
              <Select value={newProductId || "none"} onValueChange={setNewProductId}>
                <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                  <SelectValue placeholder="Choose flagship item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None / General Campaign</SelectItem>
                  {onlineProducts.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (₹{p.onlinePrice ?? p.price ?? 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="p-5 bg-slate-50 border-t gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              onClick={handleCreateFunnel}
              className="rounded-xl text-xs font-black uppercase bg-primary text-white"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Launch Funnel Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reused "+ Add Section" Picker Modal */}
      {draftFunnel && (
        <AddSectionDialog
          open={isAddSectionOpen}
          onOpenChange={setIsAddSectionOpen}
          existingSections={draftFunnel.sections}
          prioritizeFunnel
          onAddSection={(type: StoreSectionType) => {
            const added = createStoreSection(type);
            updateDraft((p) => ({
              ...p,
              sections: [...p.sections, added],
            }));
            toast({
              title: "Block Added",
              description: `${added.label} appended to funnel layout.`,
            });
          }}
        />
      )}

      {/* Reused Section Editor Modal */}
      <SectionEditDialog
        section={editingSection}
        open={Boolean(editingSection)}
        onOpenChange={(open) => {
          if (!open) setEditingSectionId(null);
        }}
        products={onlineProducts}
        onSaveSection={(id: string, patch: { label: string; content: StoreSectionContent }) => {
          updateDraft((p) => ({
            ...p,
            sections: updateStoreSectionItem(p.sections, id, patch),
          }));
        }}
      />
    </div>
  );
}
