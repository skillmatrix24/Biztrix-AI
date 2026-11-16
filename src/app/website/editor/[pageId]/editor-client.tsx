"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  Save,
  Eye,
  Plus,
  GripVertical,
  Trash2,
  Settings2,
  Layout,
  Type,
  ShoppingCart,
  MessageSquare,
  ArrowUp,
  ArrowDown,
  Monitor,
  Smartphone,
  Loader2,
  Clock,
  Layers,
  CheckCircle2,
  MessageCircle,
  Star,
  ShieldCheck,
  LayoutGrid,
  Sparkles,
  Ticket,
  PlayCircle,
  HelpCircle,
  Building2,
  MapPin,
  BellRing,
  Award,
  Globe,
  ShoppingBag,
  ChevronDown,
  Target,
  Scale,
  ListChecks,
  Gift,
  Flame,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  setDocumentNonBlocking,
  useCollection,
} from "@/firebase";
import { doc, serverTimestamp, collection } from "firebase/firestore";
import {
  createStoreSection,
  DEFAULT_COMPARISON_ROWS,
  DEFAULT_FAQ_ITEMS,
  DEFAULT_HOW_IT_WORKS_STEPS,
  DEFAULT_PRICING_TIERS,
  DEFAULT_STACK_ITEMS,
  DEFAULT_TRUST_ITEMS,
  getStoreFontFamilies,
  moveStoreSection,
  normalizeStoreSections,
  normalizeStoreThemeConfig,
  removeStoreSection,
  resolveFunnelPreviewUrl,
  resolveStorePreviewUrl,
  STORE_SECTION_CATALOG,
  StoreButtonStyle,
  StoreFontPair,
  StoreHeroLayout,
  StoreSection,
  StoreSectionType,
  StoreThemeConfig,
  StoreThemeSurface,
  StoreUiStyle,
} from "@/lib/storefront-engine";

const EDITOR_ICON_MAP: Record<string, any> = {
  Globe,
  ShieldCheck,
  LayoutGrid,
  Layers,
  Sparkles,
  Ticket,
  Clock,
  ShoppingBag,
  PlayCircle,
  CheckCircle2,
  HelpCircle,
  Building2,
  MapPin,
  BellRing,
  MessageSquare,
  MessageCircle,
  Target,
  Scale,
  ListChecks,
  Gift,
  Flame,
  Award,
  Zap,
};

export function PageEditorClient({ pageId }: { pageId: string }) {
  const firestore = useFirestore();
  const { user } = useUser();

  const isFunnel = Boolean(pageId && pageId.startsWith("funnel_"));
  const targetDocId = pageId && pageId !== "home" && pageId !== "main" ? pageId : "main";

  // 1. Resolve Profile & Business Context
  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  // 2. Reference the Target Website / Funnel Document & Main Storefront Config
  const websiteRef = useMemoFirebase(
    () =>
      businessId ? doc(firestore, "businesses", businessId, "websites", targetDocId) : null,
    [firestore, businessId, targetDocId]
  );
  const { data: websiteData, isLoading: isWebsiteLoading } = useDoc<any>(websiteRef);

  const mainWebsiteRef = useMemoFirebase(
    () =>
      businessId && isFunnel
        ? doc(firestore, "businesses", businessId, "websites", "main")
        : null,
    [firestore, businessId, isFunnel]
  );
  const { data: mainWebsiteData } = useDoc<any>(mainWebsiteRef);

  // 2.1 Fetch Real-time Catalog
  const productsQuery = useMemoFirebase(
    () =>
      businessId ? collection(firestore, "businesses", businessId, "products") : null,
    [firestore, businessId]
  );
  const { data: dbProducts } = useCollection<any>(productsQuery);

  const [sections, setSections] = useState<StoreSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"section" | "theme">("section");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);

  // 3. Load & Normalize Existing Sections on Mount
  useEffect(() => {
    if (!isWebsiteLoading && !hasInitialLoaded) {
      const normalized = normalizeStoreSections(websiteData?.sections, {
        requireCatalogGrid: !isFunnel,
      });
      setSections(normalized);
      setHasInitialLoaded(true);
      if (normalized.length > 0) {
        setActiveSectionId(normalized[0].id);
      }
    }
  }, [websiteData, isWebsiteLoading, hasInitialLoaded, isFunnel]);

  const effectiveBrand = isFunnel ? mainWebsiteData || websiteData : websiteData;

  const previewUrl = useMemo(
    () =>
      isFunnel
        ? resolveFunnelPreviewUrl({
            businessId,
            businessSlug: mainWebsiteData?.slug,
            funnelId: targetDocId,
            funnelSlug: websiteData?.slug,
            isPreview: true,
          })
        : resolveStorePreviewUrl({
            slug: websiteData?.slug,
            businessId,
            isPreview: true,
          }),
    [isFunnel, businessId, mainWebsiteData?.slug, targetDocId, websiteData?.slug]
  );

  const currentUiStyle: StoreUiStyle = (effectiveBrand?.uiStyle || "modern") as StoreUiStyle;
  const currentPrimaryColor =
    (isFunnel && websiteData?.inheritStoreTheme === false && websiteData?.accentColorOverride) ||
    effectiveBrand?.primaryColor ||
    "#0C83B3";
  const currentThemeConfig: StoreThemeConfig = useMemo(
    () => normalizeStoreThemeConfig(effectiveBrand?.themeConfig, currentUiStyle),
    [effectiveBrand?.themeConfig, currentUiStyle]
  );
  const currentFonts = useMemo(
    () => getStoreFontFamilies(currentThemeConfig.fontPair),
    [currentThemeConfig.fontPair]
  );

  // 4. Persistence Layer Helper (always writes unified StoreSection schema)
  const persistSections = (updatedSections: StoreSection[]) => {
    if (!websiteRef || !businessId) return;
    setDocumentNonBlocking(
      websiteRef,
      {
        sections: updatedSections,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const persistUiStyle = (style: StoreUiStyle) => {
    if (!websiteRef || !businessId) return;
    setDocumentNonBlocking(
      websiteRef,
      {
        uiStyle: style,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    toast({
      title: "UI Style Updated",
      description: `Storefront design switched to ${style.toUpperCase()}.`,
    });
  };

  const persistThemeConfig = (patch: Partial<StoreThemeConfig>) => {
    if (!websiteRef || !businessId) return;
    const nextConfig = normalizeStoreThemeConfig(
      { ...currentThemeConfig, ...patch },
      currentUiStyle
    );
    setDocumentNonBlocking(
      websiteRef,
      {
        themeConfig: nextConfig,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const updateActiveSectionContent = (key: string, value: any) => {
    if (!activeSectionId) return;
    const updated = sections.map((s) =>
      s.id === activeSectionId
        ? {
            ...s,
            label: key === "title" && value ? String(value) : s.label,
            content: { ...s.content, [key]: value },
          }
        : s
    );
    setSections(updated);
    persistSections(updated);
  };

  const toggleSectionActive = (id: string) => {
    const updated: StoreSection[] = sections.map((s) =>
      s.id === id
        ? { ...s, status: s.status === "Active" ? "Inactive" : "Active" }
        : s
    );
    setSections(updated);
    persistSections(updated);
  };

  const moveSection = (id: string, dir: "up" | "down") => {
    const newSections = moveStoreSection(sections, id, dir);
    setSections(newSections);
    persistSections(newSections);
  };

  const addSection = (type: StoreSectionType) => {
    const newSection = createStoreSection(type);
    const updated = [...sections, newSection];
    setSections(updated);
    setActiveSectionId(newSection.id);
    persistSections(updated);
    toast({
      title: "Section Added",
      description: `${newSection.label} added to your storefront layout.`,
    });
  };

  const removeSection = (id: string) => {
    const target = sections.find((s) => s.id === id);
    if (
      !isFunnel &&
      target?.type === "products" &&
      sections.filter((s) => s.type === "products").length <= 1
    ) {
      toast({
        variant: "destructive",
        title: "Core Catalog Required",
        description: "Keep at least one Catalog Grid section in your storefront layout.",
      });
      return;
    }
    const updated = removeStoreSection(sections, id, { protectProducts: !isFunnel });
    setSections(updated);
    if (activeSectionId === id) {
      setActiveSectionId(updated[0]?.id || null);
    }
    persistSections(updated);
  };

  const activeSection = sections.find((s) => s.id === activeSectionId) || null;
  const activeOnlineProducts = useMemo(
    () => (dbProducts || []).filter((p: any) => p.showOnWebsite && !p.isArchived),
    [dbProducts]
  );

  if (isProfileLoading || isWebsiteLoading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-xs font-semibold text-primary">
          Loading Visual Editor...
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50 overflow-hidden">
      {/* Editor Header */}
      <header className="min-h-14 py-2 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2 px-4 shrink-0">
        <div className="flex items-center gap-4 text-left">
          <Button asChild variant="ghost" size="sm" className="h-8">
            <Link href={isFunnel ? "/website/funnels" : "/website"}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex flex-col text-left">
            <span className="text-sm font-bold text-slate-900">
              {isFunnel ? "Sales Funnel Visual Editor" : "Visual Store Editor"}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {websiteData?.name || effectiveBrand?.storeName || "Main Store"} · Page: <span className="font-mono">{pageId}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <Button
            variant={previewMode === "desktop" ? "secondary" : "ghost"}
            size="icon"
            aria-label="Desktop Preview"
            className="h-8 w-8 rounded-md"
            onClick={() => setPreviewMode("desktop")}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant={previewMode === "mobile" ? "secondary" : "ghost"}
            size="icon"
            aria-label="Mobile Preview"
            className="h-8 w-8 rounded-md"
            onClick={() => setPreviewMode("mobile")}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-semibold capitalize px-2.5 py-1 rounded-md border",
              websiteData?.status === "published"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-50 text-slate-600 border-slate-200"
            )}
          >
            {websiteData?.status || "Draft"}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs font-semibold rounded-xl border-slate-200"
            onClick={() => {
              if (!websiteRef) return;
              const newStatus =
                websiteData?.status === "published" ? "draft" : "published";
              setDocumentNonBlocking(
                websiteRef,
                { status: newStatus, sections, updatedAt: serverTimestamp() },
                { merge: true }
              );
              toast({
                title: `Store ${newStatus === "published" ? "Published" : "Unpublished"}`,
                description: `Your storefront is now ${newStatus}.`,
              });
            }}
          >
            {websiteData?.status === "published" ? "Unpublish" : "Publish"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs font-semibold rounded-xl border-slate-200"
            asChild
          >
            <Link href={previewUrl} target="_blank">
              <Eye className="mr-2 h-3.5 w-3.5" /> Preview
            </Link>
          </Button>
          <Button
            className="bg-primary h-9 text-xs font-semibold rounded-xl"
            onClick={() => {
              persistSections(sections);
              toast({
                title: "Layout Saved",
                description: "All section updates are synchronized with your live storefront.",
              });
            }}
          >
            <Save className="mr-2 h-3.5 w-3.5" /> Save Changes
          </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden min-h-0">
        {/* Left Sidebar: Section List */}
        <div className="w-full lg:w-68 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/60 flex flex-col shrink-0 text-left max-h-64 lg:max-h-none">
          <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
            <h3 className="text-xs font-semibold text-slate-600 tabular-nums">
              Page Sections ({sections.filter((s) => s.status === "Active").length}/{sections.length})
            </h3>
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Add Section"
                  className="h-7 w-7 rounded-lg border-slate-200 text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 sm:w-96 p-0 text-left flex flex-col">
                <SheetHeader className="p-6 border-b border-slate-200 text-left shrink-0">
                  <SheetTitle className="text-base font-bold text-slate-900">
                    Add Storefront &amp; Funnel Section
                  </SheetTitle>
                  <SheetDescription className="text-xs text-slate-500">
                    Select any of the {STORE_SECTION_CATALOG.length} storefront &amp; conversion blocks to append to your layout.
                  </SheetDescription>
                </SheetHeader>
                <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto flex-1">
                  {STORE_SECTION_CATALOG.map((entry) => {
                    const IconComp = EDITOR_ICON_MAP[entry.iconName] || Layout;
                    return (
                      <Button
                        key={entry.type}
                        variant="outline"
                        className="h-24 p-3 flex-col gap-1.5 rounded-xl border-slate-200 hover:border-primary/40 hover:bg-primary/5 text-center"
                        onClick={() => addSection(entry.type)}
                      >
                        <IconComp className="h-5 w-5 text-primary shrink-0" />
                        <span className="text-xs font-semibold leading-tight line-clamp-2 text-slate-800">
                          {entry.label}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {sections.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs font-medium">
                No sections yet.
              </div>
            ) : (
              sections.map((s, idx) => (
                <div
                  key={s.id}
                  className={cn(
                    "p-3 rounded-xl border group cursor-pointer transition-colors",
                    activeSectionId === s.id
                      ? "bg-primary text-white border-primary"
                      : "bg-white border-slate-200 hover:border-primary/50",
                    s.status === "Inactive" && activeSectionId !== s.id && "opacity-60"
                  )}
                  onClick={() => setActiveSectionId(s.id)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono capitalize opacity-80">
                        {s.type.replace(/_/g, " ")}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={cn(
                          "font-semibold",
                          s.status === "Active"
                            ? activeSectionId === s.id
                              ? "text-white"
                              : "text-emerald-700"
                            : activeSectionId === s.id
                              ? "text-white/75"
                              : "text-slate-500"
                        )}
                      >
                        {s.status}
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Move section up"
                        className="h-5 w-5 p-0 hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSection(s.id, "up");
                        }}
                        disabled={idx === 0}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Move section down"
                        className="h-5 w-5 p-0 hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSection(s.id, "down");
                        }}
                        disabled={idx === sections.length - 1}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete section"
                        className="h-5 w-5 p-0 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSection(s.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-3 w-3 opacity-50 shrink-0" />
                    <span className="text-xs font-semibold truncate">
                      {s.content.title || s.label}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center: Live Preview Canvas */}
        <div className="flex-1 bg-slate-100/80 p-3 sm:p-6 md:p-8 overflow-y-auto overflow-x-hidden flex justify-center min-w-0">
          <div
            className={cn(
              "transition-all overflow-y-auto overflow-x-hidden border-2 border-slate-800 rounded-2xl min-w-0",
              currentThemeConfig.themeSurface === "charcoal"
                ? "bg-slate-950 text-slate-100"
                : currentThemeConfig.themeSurface === "warm_paper"
                  ? "bg-[#FAF8F5] text-stone-900"
                  : "bg-white text-slate-900",
              previewMode === "desktop" ? "w-full max-w-5xl" : "w-full max-w-[375px] h-[680px]"
            )}
            style={{ fontFamily: currentFonts.bodyFont }}
          >
            {/* Storefront Header Preview */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10 text-left">
              <div className="flex items-center gap-2">
                {effectiveBrand?.logoUrl ? (
                  <img
                    src={effectiveBrand.logoUrl}
                    alt={effectiveBrand?.storeName || "Store Logo"}
                    referrerPolicy="no-referrer"
                    className="h-6 w-6 rounded-md object-cover border border-slate-200"
                  />
                ) : (
                  <div
                    className="h-6 w-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: currentPrimaryColor }}
                  >
                    {(effectiveBrand?.storeName || "S").charAt(0)}
                  </div>
                )}
                <span
                  className="font-bold text-sm"
                  style={{ color: currentPrimaryColor }}
                >
                  {effectiveBrand?.storeName || "My Brand"}
                </span>
              </div>
              <span className="text-xs font-medium text-slate-500 capitalize">
                {isFunnel ? "Funnel Canvas" : `Style: ${currentUiStyle}`}
              </span>
            </div>

            <div className="space-y-0">
              {sections
                .filter((s) => s.status === "Active")
                .map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setActiveSectionId(s.id)}
                    className={cn(
                      "border border-transparent transition-colors cursor-pointer min-w-0",
                      previewMode === "desktop" ? "p-6 md:p-8" : "p-4",
                      activeSectionId === s.id ? "border-primary/40 bg-primary/5" : ""
                    )}
                  >
                    {s.type === "hero" && (
                      <div
                        className={cn(
                          "text-center space-y-3 rounded-2xl min-w-0",
                          previewMode === "desktop" ? "py-10 px-6" : "py-7 px-4",
                          currentUiStyle === "minimal"
                            ? "bg-slate-50 border border-slate-200 text-slate-900"
                            : "text-white"
                        )}
                        style={
                          currentUiStyle === "minimal"
                            ? {}
                            : { backgroundColor: currentPrimaryColor }
                        }
                      >
                        <p className="text-xs font-semibold opacity-90">
                          {s.content.badgeText || "Verified Merchant Catalog"}
                        </p>
                        <h1 className={cn("font-bold tracking-tight", previewMode === "desktop" ? "text-2xl md:text-3xl" : "text-xl")}>
                          {s.content.title || websiteData?.storeName || "Welcome to Our Store"}
                        </h1>
                        <p className="text-xs opacity-85 max-w-lg mx-auto">
                          {s.content.subtitle}
                        </p>
                        <Button
                          size="sm"
                          className="rounded-xl px-6 bg-white text-slate-900 hover:bg-slate-100 font-semibold text-xs"
                        >
                          {s.content.cta || "Explore Catalog"}
                        </Button>
                      </div>
                    )}

                    {s.type === "timer" && (
                      <div
                        className={cn(
                          "bg-slate-900 text-white rounded-2xl flex justify-between gap-4 min-w-0",
                          previewMode === "desktop" ? "p-6 flex-col sm:flex-row items-center" : "p-4 flex-col items-start"
                        )}
                      >
                        <div className="text-left space-y-1 min-w-0">
                          <span
                            className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-md text-white"
                            style={{ backgroundColor: currentPrimaryColor }}
                          >
                            {s.content.discountLabel || "Flash Sale Live"}
                          </span>
                          <h3 className="text-base font-bold">
                            {s.content.title || "Limited-Time Storefront Offer"}
                          </h3>
                          <p className="text-xs text-slate-300">
                            {s.content.subtitle}
                          </p>
                        </div>
                        <div className="font-mono tabular-nums text-sm font-bold px-4 py-2 rounded-xl bg-white/10 shrink-0">
                          05h : 42m : 18s
                        </div>
                      </div>
                    )}

                    {(s.type === "products" || s.type === "featured" || s.type === "new_arrivals") && (
                      <div className="space-y-5">
                        <h2 className="text-lg font-bold text-center text-slate-900">
                          {s.content.title ||
                            (s.type === "featured"
                              ? "Featured Picks"
                              : s.type === "new_arrivals"
                                ? "New Arrivals"
                                : "Our Catalog")}
                        </h2>
                        <div className={cn("grid gap-4", previewMode === "desktop" ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "grid-cols-2")}>
                          {(() => {
                            const limitCount = Math.max(
                              1,
                              Number(s.content.limit) || 4
                            );
                            const itemsToRender =
                              activeOnlineProducts.length > 0
                                ? activeOnlineProducts.slice(0, Math.min(4, limitCount))
                                : Array.from({ length: Math.min(4, limitCount) });

                            return itemsToRender.map((p: any, i: number) => (
                              <div
                                key={p?.id || i}
                                className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2 text-left min-w-0"
                              >
                                <div className="aspect-square rounded-lg bg-slate-100 overflow-hidden">
                                  {p?.images?.[0] ? (
                                    <img
                                      src={p.images[0]}
                                      alt={p.name || `Product ${i + 1}`}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-medium text-slate-400">
                                      Product Item
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs font-semibold truncate text-slate-900">
                                  {p?.name || `Sample Item ${i + 1}`}
                                </p>
                                {s.content.showPricing !== false && (
                                  <p
                                    className="text-xs font-bold font-mono tabular-nums"
                                    style={{ color: currentPrimaryColor }}
                                  >
                                    ₹{(p?.onlinePrice ?? p?.price ?? 499).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}

                    {s.type === "trust_strip" && (
                      <div className="space-y-4">
                        <h2 className="text-base font-bold text-center text-slate-900">
                          {s.content.title || "Why Shop Direct With Us"}
                        </h2>
                        <div className={cn("grid gap-3", previewMode === "desktop" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2")}>
                          {(Array.isArray(s.content.trustItems) && s.content.trustItems.length > 0
                            ? s.content.trustItems
                            : DEFAULT_TRUST_ITEMS
                          ).map((item, idx) => (
                            <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-left space-y-1 min-w-0">
                              <ShieldCheck className="h-4 w-4" style={{ color: currentPrimaryColor }} />
                              <p className="text-xs font-bold text-slate-900 truncate">{item.title}</p>
                              <p className="text-xs text-slate-600 line-clamp-2">{item.subtitle}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {s.type === "categories" && (
                      <div className="space-y-4">
                        <h2 className="text-base font-bold text-center text-slate-900">
                          {s.content.title || "Shop by Category"}
                        </h2>
                        <div className={cn("grid gap-3", previewMode === "desktop" ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")}>
                          {["Bestsellers", "New Drops", "Daily Essentials"].map((cat) => (
                            <div key={cat} className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-left space-y-1 min-w-0">
                              <LayoutGrid className="h-4 w-4" style={{ color: currentPrimaryColor }} />
                              <p className="text-xs font-bold text-slate-900 truncate">{cat}</p>
                              <p className="text-xs text-slate-500 truncate">Filter live catalog</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {s.type === "offers" && (
                      <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3 text-left">
                        <h2 className="text-base font-bold flex items-center gap-2 text-slate-900">
                          <Ticket className="h-4 w-4 shrink-0" style={{ color: currentPrimaryColor }} />
                          {s.content.title || "Active Offers & Promo Codes"}
                        </h2>
                        <p className="text-xs text-slate-600">
                          {s.content.subtitle || "Displays active storefront coupons for 1-click Copy & Apply."}
                        </p>
                      </div>
                    )}

                    {s.type === "media_showcase" && (
                      <div className={cn("grid gap-4 items-center p-5 rounded-2xl border border-slate-200 bg-slate-50 text-left", previewMode === "desktop" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                        <div className="aspect-video rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center gap-2">
                          <PlayCircle className="h-8 w-8 opacity-90" />
                          <span className="text-xs font-semibold">
                            {s.content.mediaUrl ? "Media Linked" : "Demo Video / Photo"}
                          </span>
                        </div>
                        <div className="space-y-2 min-w-0">
                          <p className="text-xs font-semibold text-primary">
                            {s.content.badgeText || "Product Spotlight"}
                          </p>
                          <h3 className="text-base font-bold text-slate-900">
                            {s.content.title || "See Our Quality Up Close"}
                          </h3>
                          <p className="text-xs text-slate-600 line-clamp-3">
                            {s.content.body || s.content.subtitle}
                          </p>
                        </div>
                      </div>
                    )}

                    {s.type === "testimonials" && (
                      <div className="space-y-4">
                        <h2 className="text-lg font-bold text-center text-slate-900">
                          {s.content.title || "Trusted by Verified Buyers"}
                        </h2>
                        <div className={cn("grid gap-3", previewMode === "desktop" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                          {(s.content.testimonials || []).slice(0, 2).map((t, i) => (
                            <div
                              key={i}
                              className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-left space-y-2"
                            >
                              <div className="flex gap-1 text-amber-500">
                                <Star className="h-3 w-3 fill-current" />
                                <Star className="h-3 w-3 fill-current" />
                                <Star className="h-3 w-3 fill-current" />
                                <Star className="h-3 w-3 fill-current" />
                                <Star className="h-3 w-3 fill-current" />
                              </div>
                              <p className="text-xs text-slate-600 italic">
                                &ldquo;{t.quote}&rdquo;
                              </p>
                              <p className="text-xs font-semibold text-slate-900">
                                — {t.name}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {s.type === "faq" && (
                      <div className="space-y-3 text-left">
                        <h2 className="text-base font-bold text-center text-slate-900">
                          {s.content.title || "Frequently Asked Questions"}
                        </h2>
                        {(Array.isArray(s.content.faqs) && s.content.faqs.length > 0
                          ? s.content.faqs
                          : DEFAULT_FAQ_ITEMS
                        )
                          .slice(0, 3)
                          .map((faq, idx) => (
                            <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                              <span className="text-xs font-semibold text-slate-900">{faq.question}</span>
                              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                            </div>
                          ))}
                      </div>
                    )}

                    {s.type === "store_location" && (
                      <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 text-left space-y-2">
                        <h2 className="text-base font-bold flex items-center gap-2 text-slate-900">
                          <MapPin className="h-4 w-4" style={{ color: currentPrimaryColor }} />
                          {s.content.title || "Visit Our Store & Dispatch Desk"}
                        </h2>
                        <p className="text-xs text-slate-600">
                          {s.content.deliveryZones || "Local Same-Day Delivery · Pan-India Insured Dispatch"}
                        </p>
                      </div>
                    )}

                    {s.type === "newsletter" && (
                      <div className="py-6 px-6 bg-slate-900 text-white rounded-2xl text-left space-y-2">
                        <p className="text-xs font-medium text-slate-300">
                          {s.content.discountLabel || "VIP Restock & Offer Alerts"}
                        </p>
                        <h2 className="text-base font-bold">
                          {s.content.title || "Get Early Access to New Drops & Promo Codes"}
                        </h2>
                        <p className="text-xs text-slate-300">
                          {s.content.subtitle || "Shopper opt-in banner connected to Customer CRM"}
                        </p>
                      </div>
                    )}

                    {s.type === "about" && (
                      <div className="py-6 px-6 bg-slate-900 text-white rounded-2xl text-left space-y-2">
                        <h2 className="text-lg font-bold">
                          {s.content.title || "Direct From the Merchant"}
                        </h2>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {s.content.body ||
                            "We deliver authentic, quality-checked products directly from our store inventory."}
                        </p>
                      </div>
                    )}

                    {(s.type === "contact" || s.type === "whatsapp") && (
                      <div className="py-6 px-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                        <h2 className="text-base font-bold text-emerald-950">
                          {s.content.title || "Reach Out Directly"}
                        </h2>
                        <p className="text-xs text-emerald-800">
                          {s.content.subtitle ||
                            effectiveBrand?.contactPhone ||
                            "Instant WhatsApp & Phone Support"}
                        </p>
                      </div>
                    )}

                    {s.type === "problem_solution" && (
                      <div className="space-y-4 text-left">
                        <h2 className="text-base font-bold text-center text-slate-900">
                          {s.content.title || "Why Switch From Ordinary Alternatives"}
                        </h2>
                        <div className={cn("grid gap-3", previewMode === "desktop" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 space-y-2 min-w-0">
                            <p className="text-xs font-bold text-rose-900">
                              {s.content.painTitle || "Common Market Frustrations"}
                            </p>
                            <ul className="space-y-1 text-xs text-rose-800">
                              {(s.content.painPoints || ["Middleman markups", "Delayed updates"]).slice(0, 3).map((pt, i) => (
                                <li key={i}>• {pt}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 space-y-2 min-w-0">
                            <p className="text-xs font-bold text-emerald-900">
                              {s.content.solutionTitle || "Our Verified Advantage"}
                            </p>
                            <ul className="space-y-1 text-xs text-emerald-800">
                              {(s.content.solutionPoints || ["Direct merchant stock", "Fast dispatch"]).slice(0, 3).map((pt, i) => (
                                <li key={i}>✓ {pt}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {s.type === "comparison_table" && (
                      <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3 text-left">
                        <h2 className="text-base font-bold text-center text-slate-900">
                          {s.content.title || "Compare Before You Buy"}
                        </h2>
                        <div className="space-y-1.5">
                          {(s.content.comparisonRows || DEFAULT_COMPARISON_ROWS).slice(0, 4).map((row, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2 text-xs min-w-0">
                              <span className="font-semibold text-slate-800 truncate">{row.feature}</span>
                              <div className="flex items-center gap-3 font-semibold shrink-0">
                                <span className="text-emerald-600">{row.us ? "✓ Us" : "✕"}</span>
                                <span className="text-slate-400">{row.others ? "✓" : "✕ Others"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {s.type === "how_it_works" && (
                      <div className="space-y-4 text-left">
                        <h2 className="text-base font-bold text-center text-slate-900">
                          {s.content.title || "How Your Order Works in 3 Steps"}
                        </h2>
                        <div className={cn("grid gap-3", previewMode === "desktop" ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1")}>
                          {(s.content.steps || DEFAULT_HOW_IT_WORKS_STEPS).map((step, idx) => (
                            <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1 min-w-0">
                              <span className="text-xs font-mono tabular-nums font-semibold" style={{ color: currentPrimaryColor }}>
                                Step {step.stepNumber}
                              </span>
                              <p className="text-xs font-bold text-slate-900">{step.title}</p>
                              <p className="text-xs text-slate-600">{step.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {s.type === "offer_stack" && (
                      <div className="p-5 sm:p-6 rounded-2xl border-2 bg-white space-y-3 text-left" style={{ borderColor: currentPrimaryColor }}>
                        <h2 className="text-base font-bold text-slate-900">
                          {s.content.title || "Everything Included in Today's Offer"}
                        </h2>
                        <div className="space-y-1.5">
                          {(s.content.stackItems || DEFAULT_STACK_ITEMS).map((item, idx) => (
                            <div key={idx} className="flex justify-between gap-2 text-xs border-b border-dashed border-slate-200 pb-1 min-w-0">
                              <span className="font-semibold text-slate-700 truncate">✓ {item.title}</span>
                              <span className="font-mono tabular-nums text-slate-500 shrink-0">₹{item.value}</span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs line-through text-slate-400 font-medium font-mono tabular-nums">
                            Total Value: ₹{(s.content.regularPrice ?? 2996).toLocaleString()}
                          </span>
                          <span className="text-base font-bold font-mono tabular-nums" style={{ color: currentPrimaryColor }}>
                            Today Only: ₹{(s.content.offerPrice ?? 999).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {s.type === "pricing_tiers" && (
                      <div className="space-y-4 text-left">
                        <h2 className="text-base font-bold text-center text-slate-900">
                          {s.content.title || "Choose Your Combo & Save"}
                        </h2>
                        <div className={cn("grid gap-3", previewMode === "desktop" ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1")}>
                          {(s.content.pricingTiers || DEFAULT_PRICING_TIERS).map((tier) => (
                            <div
                              key={tier.id}
                              className={cn(
                                "p-4 rounded-xl border space-y-1.5",
                                tier.highlight ? "border-2 bg-primary/5 border-primary" : "bg-slate-50 border-slate-200"
                              )}
                            >
                              {tier.badge && (
                                <p className="text-xs font-semibold text-primary">{tier.badge}</p>
                              )}
                              <p className="text-xs font-bold text-slate-900">{tier.name}</p>
                              <p className="text-lg font-bold font-mono tabular-nums" style={{ color: currentPrimaryColor }}>
                                ₹{tier.price.toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {s.type === "guarantee_seal" && (
                      <div className="p-5 rounded-2xl bg-emerald-950 text-white flex items-center gap-4 text-left">
                        <Award className="h-10 w-10 text-amber-400 shrink-0" />
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-amber-300 font-mono tabular-nums">
                            {s.content.guaranteeDays ?? 7}-Day Protection
                          </p>
                          <h3 className="text-base font-bold">{s.content.title || "Zero-Risk Merchant Guarantee"}</h3>
                          <p className="text-xs text-emerald-200 line-clamp-2">{s.content.body || s.content.subtitle}</p>
                        </div>
                      </div>
                    )}

                    {s.type === "express_checkout" && (
                      <div className="p-6 rounded-2xl border-2 bg-slate-50 space-y-3 text-left" style={{ borderColor: currentPrimaryColor }}>
                        <h2 className="text-base font-bold flex items-center gap-2 text-slate-900">
                          <Zap className="h-4 w-4" style={{ color: currentPrimaryColor }} />
                          {s.content.title || "Complete Your Express Order"}
                        </h2>
                        {s.content.orderBumpEnabled !== false && (
                          <div className="p-3 rounded-xl border border-dashed border-amber-400 bg-amber-50 text-xs font-semibold text-amber-900 tabular-nums">
                            ☑ {s.content.orderBumpTitle || "Add Express Order Bump"} (+₹{s.content.orderBumpPrice ?? 199})
                          </div>
                        )}
                        <div className="py-2.5 px-4 rounded-xl text-center text-xs font-semibold text-white" style={{ backgroundColor: currentPrimaryColor }}>
                          {s.content.cta || "Confirm My Order Now"}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 font-medium">
              © {new Date().getFullYear()} {websiteData?.storeName || "Brand"}.
            </div>
          </div>
        </div>

        {/* Right Sidebar: Contextual Editor */}
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white flex flex-col shrink-0 text-left">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" /> Section Settings
            </h3>
            {activeSection && (
              <span className="text-xs font-mono text-slate-500 capitalize">
                {activeSection.type.replace(/_/g, " ")}
              </span>
            )}
          </div>

          {activeSection ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <Button
                  variant={activeTab === "section" ? "secondary" : "ghost"}
                  size="sm"
                  className="flex-1 h-8 text-xs font-semibold rounded-lg"
                  onClick={() => setActiveTab("section")}
                >
                  Section Content
                </Button>
                <Button
                  variant={activeTab === "theme" ? "secondary" : "ghost"}
                  size="sm"
                  className="flex-1 h-8 text-xs font-semibold rounded-lg"
                  onClick={() => setActiveTab("theme")}
                >
                  Theme &amp; Style
                </Button>
              </div>

              {activeTab === "theme" ? (
                <div className="space-y-5">
                  <div className="space-y-2 text-left">
                    <Label className="text-xs font-semibold text-slate-600 ml-1">
                      Primary Brand Color
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={currentPrimaryColor}
                        onChange={(e) =>
                          websiteRef &&
                          setDocumentNonBlocking(
                            websiteRef,
                            { primaryColor: e.target.value, updatedAt: serverTimestamp() },
                            { merge: true }
                          )
                        }
                        className="h-11 w-14 p-1 rounded-xl cursor-pointer"
                      />
                      <Input
                        value={currentPrimaryColor}
                        onChange={(e) =>
                          websiteRef &&
                          setDocumentNonBlocking(
                            websiteRef,
                            { primaryColor: e.target.value, updatedAt: serverTimestamp() },
                            { merge: true }
                          )
                        }
                        className="text-sm font-mono font-bold h-11 rounded-xl flex-1 uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <Label className="text-xs font-semibold text-slate-600 ml-1">
                      UI Layout Style
                    </Label>
                    <div className="grid grid-cols-1 gap-2">
                      {(["modern", "minimal", "classic"] as StoreUiStyle[]).map((st) => (
                        <Button
                          key={st}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => persistUiStyle(st)}
                          className={cn(
                            "h-10 text-xs font-semibold capitalize justify-between px-4 rounded-xl",
                            currentUiStyle === st
                              ? "bg-primary/10 border-primary text-primary"
                              : "text-slate-600 border-slate-200"
                          )}
                        >
                          <span>{st} Style</span>
                          {currentUiStyle === st && (
                            <span className="text-xs font-semibold text-primary">
                              Active
                            </span>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <Label className="text-xs font-semibold text-slate-600 ml-1">
                      Hero Layout
                    </Label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {(
                        [
                          { id: "classic_banner", label: "Classic Centered Banner" },
                          { id: "split_showcase", label: "Split Showcase" },
                          { id: "editorial_cover", label: "Editorial Cover" },
                        ] as Array<{ id: StoreHeroLayout; label: string }>
                      ).map((hl) => (
                        <Button
                          key={hl.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => persistThemeConfig({ heroLayout: hl.id })}
                          className={cn(
                            "h-9 text-xs font-medium justify-start px-3 rounded-xl",
                            currentThemeConfig.heroLayout === hl.id
                              ? "bg-primary/10 border-primary text-primary"
                              : "text-slate-600 border-slate-200"
                          )}
                        >
                          {hl.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <Label className="text-xs font-semibold text-slate-600 ml-1">
                      Typography Pairing
                    </Label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {(
                        [
                          { id: "jakarta", label: "Plus Jakarta + DM Sans" },
                          { id: "playfair", label: "Playfair Display + Jakarta" },
                          { id: "outfit", label: "Outfit + Manrope" },
                        ] as Array<{ id: StoreFontPair; label: string }>
                      ).map((fp) => (
                        <Button
                          key={fp.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => persistThemeConfig({ fontPair: fp.id })}
                          className={cn(
                            "h-9 text-xs font-medium justify-start px-3 rounded-xl",
                            currentThemeConfig.fontPair === fp.id
                              ? "bg-primary/10 border-primary text-primary"
                              : "text-slate-600 border-slate-200"
                          )}
                        >
                          {fp.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <Label className="text-xs font-semibold text-slate-600 ml-1">
                      Surface Palette &amp; Button Shape
                    </Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: "light", label: "Light" },
                          { id: "warm_paper", label: "Warm" },
                          { id: "charcoal", label: "Dark" },
                        ] as Array<{ id: StoreThemeSurface; label: string }>
                      ).map((sf) => (
                        <Button
                          key={sf.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => persistThemeConfig({ themeSurface: sf.id })}
                          className={cn(
                            "h-8 text-xs font-medium rounded-lg",
                            currentThemeConfig.themeSurface === sf.id
                              ? "bg-primary/10 border-primary text-primary"
                              : "text-slate-600 border-slate-200"
                          )}
                        >
                          {sf.label}
                        </Button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      {(
                        [
                          { id: "solid", label: "Solid" },
                          { id: "pill", label: "Pill" },
                          { id: "outline", label: "Outline" },
                        ] as Array<{ id: StoreButtonStyle; label: string }>
                      ).map((bs) => (
                        <Button
                          key={bs.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => persistThemeConfig({ buttonStyle: bs.id })}
                          className={cn(
                            "h-8 text-xs font-medium rounded-lg",
                            currentThemeConfig.buttonStyle === bs.id
                              ? "bg-primary/10 border-primary text-primary"
                              : "text-slate-600 border-slate-200"
                          )}
                        >
                          {bs.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Active Visibility Toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <Label className="text-xs font-semibold text-slate-900">
                        Visible on Storefront
                      </Label>
                      <p className="text-xs text-slate-500">
                        Status: {activeSection.status}
                      </p>
                    </div>
                    <Switch
                      checked={activeSection.status === "Active"}
                      onCheckedChange={() => toggleSectionActive(activeSection.id)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  {/* Common Title Input */}
                  <div className="space-y-2 text-left">
                    <Label className="text-xs font-semibold text-slate-600 ml-1">
                      Section Heading
                    </Label>
                    <Input
                      value={activeSection.content.title || ""}
                      onChange={(e) =>
                        updateActiveSectionContent("title", e.target.value)
                      }
                      placeholder={activeSection.label}
                      className="text-sm font-medium h-11 rounded-xl"
                    />
                  </div>

                  {activeSection.type === "hero" && (
                    <>
                      <div className="space-y-2 text-left">
                        <Label className="text-xs font-semibold text-slate-600 ml-1">
                          Top Label
                        </Label>
                        <Input
                          value={activeSection.content.badgeText || ""}
                          onChange={(e) =>
                            updateActiveSectionContent("badgeText", e.target.value)
                          }
                          placeholder="Verified Merchant Catalog"
                          className="text-xs font-medium h-10 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <Label className="text-xs font-semibold text-slate-600 ml-1">
                          Sub-heading
                        </Label>
                        <Textarea
                          value={activeSection.content.subtitle || ""}
                          onChange={(e) =>
                            updateActiveSectionContent("subtitle", e.target.value)
                          }
                          className="text-xs min-h-[90px] rounded-xl bg-slate-50"
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <Label className="text-xs font-semibold text-slate-600 ml-1">
                          Primary CTA Button
                        </Label>
                        <Input
                          value={activeSection.content.cta || ""}
                          onChange={(e) =>
                            updateActiveSectionContent("cta", e.target.value)
                          }
                          className="text-sm rounded-xl h-10"
                          placeholder="e.g. Explore Catalog"
                        />
                      </div>
                    </>
                  )}

                  {activeSection.type === "timer" && (
                    <>
                      <div className="space-y-2 text-left">
                        <Label className="text-xs font-semibold text-slate-600 ml-1">
                          Offer Badge Text
                        </Label>
                        <Input
                          value={activeSection.content.discountLabel || ""}
                          onChange={(e) =>
                            updateActiveSectionContent("discountLabel", e.target.value)
                          }
                          placeholder="Flash Sale Live"
                          className="text-xs font-medium h-10 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <Label className="text-xs font-semibold text-slate-600 ml-1">
                          Offer Description
                        </Label>
                        <Textarea
                          value={activeSection.content.subtitle || ""}
                          onChange={(e) =>
                            updateActiveSectionContent("subtitle", e.target.value)
                          }
                          className="text-xs min-h-[80px] rounded-xl bg-slate-50"
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <Label className="text-xs font-semibold text-slate-600 ml-1">
                          CTA Button Label
                        </Label>
                        <Input
                          value={activeSection.content.cta || ""}
                          onChange={(e) =>
                            updateActiveSectionContent("cta", e.target.value)
                          }
                          className="text-xs font-medium h-10 rounded-xl"
                        />
                      </div>
                    </>
                  )}

                  {(activeSection.type === "products" ||
                    activeSection.type === "featured" ||
                    activeSection.type === "new_arrivals") && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="space-y-0.5 text-left">
                          <Label className="text-xs font-semibold text-slate-900">
                            Show Pricing
                          </Label>
                          <p className="text-xs text-slate-500">
                            Display item rates
                          </p>
                        </div>
                        <Switch
                          checked={activeSection.content.showPricing !== false}
                          onCheckedChange={(checked) =>
                            updateActiveSectionContent("showPricing", checked)
                          }
                          className="scale-90 data-[state=checked]:bg-primary"
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <Label className="text-xs font-semibold text-slate-600 ml-1">
                          Max Items Shown
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={activeSection.content.limit ?? (activeSection.type === "products" ? 24 : 4)}
                          onChange={(e) =>
                            updateActiveSectionContent(
                              "limit",
                              Math.max(1, parseInt(e.target.value, 10) || 4)
                            )
                          }
                          className="text-sm font-mono tabular-nums font-bold h-10 rounded-xl bg-slate-50"
                        />
                      </div>
                      {activeSection.type === "new_arrivals" && (
                        <>
                          <div className="space-y-2 text-left">
                            <Label className="text-xs font-semibold text-slate-600 ml-1">
                              Subtitle
                            </Label>
                            <Input
                              value={activeSection.content.subtitle || ""}
                              onChange={(e) =>
                                updateActiveSectionContent("subtitle", e.target.value)
                              }
                              className="text-xs rounded-xl h-10"
                            />
                          </div>
                          <div className="space-y-2 text-left">
                            <Label className="text-xs font-semibold text-slate-600 ml-1">
                              CTA Button Label
                            </Label>
                            <Input
                              value={activeSection.content.cta || ""}
                              onChange={(e) =>
                                updateActiveSectionContent("cta", e.target.value)
                              }
                              className="text-xs rounded-xl h-10"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {activeSection.type === "categories" && (
                    <div className="space-y-4">
                      <div className="space-y-2 text-left">
                        <Label className="text-xs font-semibold text-slate-600 ml-1">
                          Subtitle
                        </Label>
                        <Input
                          value={activeSection.content.subtitle || ""}
                          onChange={(e) =>
                            updateActiveSectionContent("subtitle", e.target.value)
                          }
                          className="text-xs rounded-xl h-10"
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <Label className="text-xs font-semibold text-slate-600 ml-1">
                          Max Categories Shown
                        </Label>
                        <Input
                          type="number"
                          min={2}
                          max={12}
                          value={activeSection.content.limit ?? 6}
                          onChange={(e) =>
                            updateActiveSectionContent(
                              "limit",
                              Math.max(2, parseInt(e.target.value, 10) || 6)
                            )
                          }
                          className="text-sm font-mono tabular-nums font-bold h-10 rounded-xl bg-slate-50"
                        />
                      </div>
                    </div>
                  )}

                  {activeSection.type === "media_showcase" && (
                    <div className="space-y-4">
                      <div className="space-y-2 text-left">
                        <Label className="text-xs font-semibold text-slate-600 ml-1">
                          Spotlight Label
                        </Label>
                        <Input
                          value={activeSection.content.badgeText || ""}
                          onChange={(e) =>
                            updateActiveSectionContent("badgeText", e.target.value)
                          }
                          className="text-xs font-medium h-10 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <Label className="text-xs font-semibold text-slate-600 ml-1">
                          YouTube or Image URL
                        </Label>
                        <Input
                          value={activeSection.content.mediaUrl || ""}
                          onChange={(e) =>
                            updateActiveSectionContent("mediaUrl", e.target.value)
                          }
                          placeholder="https://youtube.com/watch?v=... or image URL"
                          className="text-xs font-mono h-10 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <Label className="text-xs font-semibold text-slate-600 ml-1">
                          Story Description
                        </Label>
                        <Textarea
                          value={activeSection.content.body || ""}
                          onChange={(e) =>
                            updateActiveSectionContent("body", e.target.value)
                          }
                          className="text-xs min-h-[80px] rounded-xl bg-slate-50"
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <Label className="text-xs font-semibold text-slate-600 ml-1">
                          CTA Button Label
                        </Label>
                        <Input
                          value={activeSection.content.cta || ""}
                          onChange={(e) =>
                            updateActiveSectionContent("cta", e.target.value)
                          }
                          className="text-xs font-medium h-10 rounded-xl"
                        />
                      </div>
                    </div>
                  )}

                  {activeSection.type === "store_location" && (
                    <div className="space-y-4">
                      <div className="space-y-2 text-left">
                        <Label className="text-xs font-semibold text-slate-600 ml-1">
                          Delivery Zones Summary
                        </Label>
                        <Input
                          value={activeSection.content.deliveryZones || ""}
                          onChange={(e) =>
                            updateActiveSectionContent("deliveryZones", e.target.value)
                          }
                          className="text-xs rounded-xl h-10"
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <Label className="text-xs font-semibold text-slate-600 ml-1">
                          Google Maps Link (Optional)
                        </Label>
                        <Input
                          value={activeSection.content.mapUrl || ""}
                          onChange={(e) =>
                            updateActiveSectionContent("mapUrl", e.target.value)
                          }
                          placeholder="https://maps.google.com/..."
                          className="text-xs font-mono h-10 rounded-xl"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                        <Label className="text-xs font-semibold text-slate-900">
                          Self-Pickup Enabled
                        </Label>
                        <Switch
                          checked={activeSection.content.pickupEnabled !== false}
                          onCheckedChange={(checked) =>
                            updateActiveSectionContent("pickupEnabled", checked)
                          }
                          className="scale-90 data-[state=checked]:bg-primary"
                        />
                      </div>
                    </div>
                  )}

                  {(activeSection.type === "offers" || activeSection.type === "newsletter") && (
                    <div className="space-y-4">
                      {activeSection.type === "newsletter" && (
                        <div className="space-y-2 text-left">
                          <Label className="text-xs font-semibold text-slate-600 ml-1">
                            Highlight Label
                          </Label>
                          <Input
                            value={activeSection.content.discountLabel || ""}
                            onChange={(e) =>
                              updateActiveSectionContent("discountLabel", e.target.value)
                            }
                            className="text-xs font-medium h-10 rounded-xl"
                          />
                        </div>
                      )}
                      <div className="space-y-2 text-left">
                        <Label className="text-xs font-semibold text-slate-600 ml-1">
                          Subtitle
                        </Label>
                        <Textarea
                          value={activeSection.content.subtitle || ""}
                          onChange={(e) =>
                            updateActiveSectionContent("subtitle", e.target.value)
                          }
                          className="text-xs min-h-[70px] rounded-xl bg-slate-50"
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <Label className="text-xs font-semibold text-slate-600 ml-1">
                          CTA Button Label
                        </Label>
                        <Input
                          value={activeSection.content.cta || ""}
                          onChange={(e) =>
                            updateActiveSectionContent("cta", e.target.value)
                          }
                          className="text-xs font-medium h-10 rounded-xl"
                        />
                      </div>
                    </div>
                  )}

                  {(activeSection.type === "trust_strip" || activeSection.type === "faq") && (
                    <div className="space-y-3">
                      <div className="space-y-2 text-left">
                        <Label className="text-xs font-semibold text-slate-600 ml-1">
                          Subtitle
                        </Label>
                        <Input
                          value={activeSection.content.subtitle || ""}
                          onChange={(e) =>
                            updateActiveSectionContent("subtitle", e.target.value)
                          }
                          className="text-xs rounded-xl h-10"
                        />
                      </div>
                      <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 p-3 rounded-xl leading-relaxed">
                        Customize individual {activeSection.type === "faq" ? "FAQ questions & answers" : "trust pillars"} in Storefront Manager → Design &amp; Theme → Section &amp; Layout Controls.
                      </p>
                    </div>
                  )}

                  {activeSection.type === "about" && (
                    <div className="space-y-2 text-left">
                      <Label className="text-xs font-semibold text-slate-600 ml-1">
                        Brand Story / Description
                      </Label>
                      <Textarea
                        value={activeSection.content.body || ""}
                        onChange={(e) =>
                          updateActiveSectionContent("body", e.target.value)
                        }
                        placeholder="Describe your store quality guarantee, history, and customer commitment..."
                        className="text-xs min-h-[120px] rounded-xl bg-slate-50 leading-relaxed"
                      />
                    </div>
                  )}

                  {(activeSection.type === "contact" ||
                    activeSection.type === "whatsapp" ||
                    activeSection.type === "testimonials") && (
                    <div className="space-y-2 text-left">
                      <Label className="text-xs font-semibold text-slate-600 ml-1">
                        Subtitle / Support Note
                      </Label>
                      <Textarea
                        value={activeSection.content.subtitle || ""}
                        onChange={(e) =>
                          updateActiveSectionContent("subtitle", e.target.value)
                        }
                        className="text-xs min-h-[80px] rounded-xl bg-slate-50"
                      />
                    </div>
                  )}

                  {(activeSection.type === "problem_solution" ||
                    activeSection.type === "comparison_table" ||
                    activeSection.type === "how_it_works" ||
                    activeSection.type === "offer_stack" ||
                    activeSection.type === "pricing_tiers" ||
                    activeSection.type === "guarantee_seal" ||
                    activeSection.type === "express_checkout") && (
                    <div className="space-y-3">
                      <div className="space-y-2 text-left">
                        <Label className="text-xs font-semibold text-slate-600 ml-1">
                          Subtitle
                        </Label>
                        <Textarea
                          value={activeSection.content.subtitle || ""}
                          onChange={(e) =>
                            updateActiveSectionContent("subtitle", e.target.value)
                          }
                          className="text-xs min-h-[70px] rounded-xl bg-slate-50"
                        />
                      </div>
                      {activeSection.type === "offer_stack" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs font-semibold text-slate-600">Anchor Value (₹)</Label>
                            <Input
                              type="number"
                              value={activeSection.content.regularPrice ?? 2996}
                              onChange={(e) => updateActiveSectionContent("regularPrice", Math.max(0, Number(e.target.value) || 0))}
                              className="h-9 text-xs font-mono tabular-nums font-bold rounded-xl"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold text-slate-600">Offer Price (₹)</Label>
                            <Input
                              type="number"
                              value={activeSection.content.offerPrice ?? 999}
                              onChange={(e) => updateActiveSectionContent("offerPrice", Math.max(0, Number(e.target.value) || 0))}
                              className="h-9 text-xs font-mono tabular-nums font-bold rounded-xl"
                            />
                          </div>
                        </div>
                      )}
                      {activeSection.type === "guarantee_seal" && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-600">Guarantee Days</Label>
                          <Input
                            type="number"
                            min={1}
                            value={activeSection.content.guaranteeDays ?? 7}
                            onChange={(e) => updateActiveSectionContent("guaranteeDays", Math.max(1, parseInt(e.target.value, 10) || 7))}
                            className="h-9 text-xs font-mono tabular-nums font-bold rounded-xl"
                          />
                        </div>
                      )}
                      {activeSection.type === "express_checkout" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                            <Label className="text-xs font-semibold text-slate-800">Order Bump Enabled</Label>
                            <Switch
                              checked={activeSection.content.orderBumpEnabled !== false}
                              onCheckedChange={(v) => updateActiveSectionContent("orderBumpEnabled", v)}
                            />
                          </div>
                          <Input
                            value={activeSection.content.orderBumpTitle || ""}
                            onChange={(e) => updateActiveSectionContent("orderBumpTitle", e.target.value)}
                            placeholder="Order Bump Headline"
                            className="h-9 text-xs font-medium rounded-xl"
                          />
                          <Input
                            type="number"
                            value={activeSection.content.orderBumpPrice ?? 199}
                            onChange={(e) => updateActiveSectionContent("orderBumpPrice", Math.max(0, Number(e.target.value) || 0))}
                            placeholder="Bump Price (₹)"
                            className="h-9 text-xs font-mono tabular-nums font-bold rounded-xl"
                          />
                        </div>
                      )}
                      <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 p-3 rounded-xl leading-relaxed">
                        Edit individual rows, pricing tiers, stack items &amp; pain points inside Landing Page Builder → Edit Section modal.
                      </p>
                    </div>
                  )}

                  <div className="pt-5 border-t border-slate-200">
                    <h4 className="text-xs font-semibold text-slate-600 mb-3">
                      Global Design Style
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {(["modern", "minimal", "classic"] as StoreUiStyle[]).map((st) => (
                        <Button
                          key={st}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => persistUiStyle(st)}
                          className={cn(
                            "h-9 text-xs font-semibold capitalize",
                            currentUiStyle === st
                              ? "bg-primary/10 border-primary text-primary"
                              : "text-slate-600 border-slate-200"
                          )}
                        >
                          {st}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-5">
                <Layout className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">
                Select a section from the left panel to edit its content.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
