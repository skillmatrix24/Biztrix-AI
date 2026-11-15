"use client";

import { useState, useMemo, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Globe, 
  Edit2, 
  Eye, 
  Trash2, 
  ExternalLink, 
  Search,
  Monitor,
  Smartphone,
  CheckCircle2,
  Clock,
  Settings,
  ShoppingBag,
  Copy,
  Check,
  TrendingUp,
  Layout,
  Tag,
  MonitorSmartphone,
  MousePointer2,
  Package,
  EyeOff,
  Zap,
  ArrowRight,
  Palette,
  MessageCircle,
  MessageSquare,
  SmartphoneNfc,
  LineChart,
  Target,
  Sparkles,
  Layers,
  ImageIcon,
  Building2,
  Star,
  Flame,
  Percent,
  Loader2,
  ShieldCheck,
  ChevronRight,
  Bot,
  BadgeCheck,
  Save,
  Lock,
  X,
  PlusSquare,
  Info,
  Receipt,
  Banknote,
  Upload,
  AlertCircle,
  Truck,
  Ticket,
  ArrowUp,
  ArrowDown,
  Type,
  Megaphone,
  Instagram,
  Facebook,
  Youtube,
  Activity,
  BarChart3,
  FileText,
  LayoutGrid,
  PlayCircle,
  HelpCircle,
  MapPin,
  BellRing
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection, setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc, serverTimestamp, query, where, orderBy, limit } from "firebase/firestore";
import {
  updateCustomDomain,
  removeCustomDomain,
  saveStorefrontConfig,
  syncStorefrontRelays,
} from "@/app/actions/website-actions";
import {
  computeStorefrontFunnelMetrics,
  computeStoreIntegrityAudit,
  createStoreSection,
  DEFAULT_ANNOUNCEMENT_BAR,
  DEFAULT_STORE_FOOTER_CONFIG,
  DEFAULT_STORE_POLICY_CONFIG,
  DEFAULT_STORE_SECTIONS,
  DEFAULT_STORE_SHIPPING_CONFIG,
  DEFAULT_STORE_THEME_CONFIG,
  DEFAULT_STORE_TRACKING_CONFIG,
  generateStorefrontActionInsights,
  isValidGa4MeasurementId,
  isValidMetaPixelId,
  moveStoreSection,
  normalizeAnnouncementBar,
  normalizeFooterConfig,
  normalizeStoreCoupons,
  normalizeStorePolicyConfig,
  normalizeStoreSections,
  normalizeStoreShippingConfig,
  normalizeStoreThemeConfig,
  normalizeStoreTrackingConfig,
  removeStoreSection,
  resolveStorePreviewUrl,
  sanitizeCouponCode,
  sanitizeGa4MeasurementId,
  sanitizeGoogleSiteVerification,
  sanitizeMetaPixelId,
  sanitizeStoreSlug,
  StoreAnnouncementBar,
  StoreButtonStyle,
  StoreCornerRadius,
  StoreCoupon,
  StoreCouponDiscountType,
  StoreFontPair,
  StoreFooterConfig,
  StoreGridColumns,
  StoreHeroLayout,
  StorePolicyConfig,
  StoreSection,
  StoreSectionContent,
  StoreSectionType,
  StoreShippingConfig,
  StoreThemeConfig,
  StoreThemeSurface,
  StoreTrackingConfig,
  updateStoreSectionItem,
} from "@/lib/storefront-engine";
import { StoreSimulator } from "@/components/website/store-simulator";
import { SectionEditDialog } from "@/components/website/section-edit-dialog";
import { AddSectionDialog } from "@/components/website/add-section-dialog";

const ICON_MAP: Record<string, any> = {
  Globe,
  Layers,
  Clock,
  CheckCircle2,
  ShoppingBag,
  Building2,
  MessageSquare,
  MessageCircle,
  ShieldCheck,
  LayoutGrid,
  Sparkles,
  Ticket,
  PlayCircle,
  HelpCircle,
  MapPin,
  BellRing,
};

const COLOR_PALETTES = [
  { name: "Biztrix Cyan", value: "#0C83B3" },
  { name: "Emerald Green", value: "#10B981" },
  { name: "Royal Indigo", value: "#6366F1" },
  { name: "Purple Violet", value: "#8B5CF6" },
  { name: "Crimson Rose", value: "#F43F5E" },
  { name: "Amber Gold", value: "#F59E0B" },
  { name: "Slate Charcoal", value: "#0F172A" },
];

async function compressImageFileToDataUrl(file: File, maxDim: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result || ""));
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png", 0.9));
      };
      img.onerror = () => reject(new Error("Invalid image file"));
      img.src = String(reader.result || "");
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function EcommerceManagerPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);

  const businessId = userProfile?.businessId;
  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const websiteRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId, 'websites', 'main') : null
  , [firestore, businessId]);
  const { data: websiteData, isLoading: isWebsiteLoading } = useDoc<any>(websiteRef);

  const productsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'products') : null
  , [firestore, businessId]);
  const { data: dbProducts = [], isLoading: isProductsLoading } = useCollection<any>(productsQuery);

  const ordersQuery = useMemoFirebase(() => 
    businessId ? query(
      collection(firestore, 'businesses', businessId, 'orders'), 
      where('source', '==', 'storefront'),
      limit(100)
    ) : null
  , [firestore, businessId]);
  const { data: rawOrders = [] } = useCollection<any>(ordersQuery);
  const orders = useMemo(() => {
    const list = Array.isArray(rawOrders) ? [...rawOrders] : [];
    return list.sort((a: any, b: any) => {
      const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return tB - tA;
    });
  }, [rawOrders]);

  const paidOrders = useMemo(() => 
    orders.filter((o: any) => ['paid', 'processing', 'shipped', 'delivered'].includes(o.status))
  , [orders]);

  const eventsQuery = useMemoFirebase(() =>
    businessId ? query(
      collection(firestore, 'businesses', businessId, 'storefront_events'),
      orderBy('createdAt', 'desc'),
      limit(100)
    ) : null
  , [firestore, businessId]);
  const { data: rawStoreEvents = [] } = useCollection<any>(eventsQuery);
  const storeEvents = useMemo(() => (Array.isArray(rawStoreEvents) ? rawStoreEvents : []), [rawStoreEvents]);

  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isSaving, setIsSaving] = useState(false);
  const [searchCatalog, setSearchCatalog] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);
  const heroImageInputRef = useRef<HTMLInputElement | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  
  // Theme & Design State
  const [primaryColor, setPrimaryColor] = useState("#0C83B3");
  const [uiStyle, setUiStyle] = useState("modern");
  const [whatsappOrderEnabled, setWhatsappOrderEnabled] = useState(true);
  const [codEnabled, setCodEnabled] = useState(true);
  const [showDiscount, setShowDiscount] = useState(true);
  const [logoUrl, setLogoUrl] = useState("");
  const [sections, setSections] = useState<StoreSection[]>(DEFAULT_STORE_SECTIONS);
  const [themeConfig, setThemeConfig] = useState<StoreThemeConfig>(DEFAULT_STORE_THEME_CONFIG);
  const [announcementBar, setAnnouncementBar] = useState<StoreAnnouncementBar>(DEFAULT_ANNOUNCEMENT_BAR);
  const [footerConfig, setFooterConfig] = useState<StoreFooterConfig>(DEFAULT_STORE_FOOTER_CONFIG);
  const [trackingConfig, setTrackingConfig] = useState<StoreTrackingConfig>(DEFAULT_STORE_TRACKING_CONFIG);
  const [policyConfig, setPolicyConfig] = useState<StorePolicyConfig>(DEFAULT_STORE_POLICY_CONFIG);

  // Settings State
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [isPending, startTransition] = useTransition();

  // Phase 8: Storefront SEO & Social Sharing State
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [socialShareImage, setSocialShareImage] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");

  // Phase 1 Conversion Boost: Shipping Rules & Promo Coupons
  const [shippingConfig, setShippingConfig] = useState<StoreShippingConfig>(
    DEFAULT_STORE_SHIPPING_CONFIG
  );
  const [coupons, setCoupons] = useState<StoreCoupon[]>([]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponType, setNewCouponType] = useState<StoreCouponDiscountType>("percent");
  const [newCouponValue, setNewCouponValue] = useState("10");
  const [newCouponMinOrder, setNewCouponMinOrder] = useState("0");
  const [newCouponMaxDiscount, setNewCouponMaxDiscount] = useState("");
  const [newCouponExpiry, setNewCouponExpiry] = useState("");

  // Sync preview relay notifications (orders & events) on merchant load
  useEffect(() => {
    if (!businessId || !user) return;
    let cancelled = false;
    user.getIdToken().then((idToken) => {
      if (!cancelled) {
        syncStorefrontRelays({ businessId, idToken }).catch(() => {});
      }
    });
    return () => {
      cancelled = true;
    };
  }, [businessId, user?.uid]);

  // Sync state from Firestore
  useEffect(() => {
    if (websiteData) {
      setPrimaryColor(websiteData.primaryColor || "#0C83B3");
      setUiStyle(websiteData.uiStyle || "modern");
      setWhatsappOrderEnabled(websiteData.whatsappOrderEnabled ?? true);
      setCodEnabled(websiteData.codEnabled ?? true);
      setShowDiscount(websiteData.showDiscount ?? true);
      setStoreName(websiteData.storeName || business?.name || "");
      setSlug(websiteData.slug || business?.slug || "");
      setContactEmail(websiteData.contactEmail || business?.email || "");
      setContactPhone(websiteData.contactPhone || business?.phone || "");
      setStoreAddress(websiteData.storeAddress || business?.address || "");
      setCustomDomain(websiteData.customDomain || "");
      setSeoTitle(websiteData.seoTitle || "");
      setSeoDescription(websiteData.seoDescription || "");
      setSeoKeywords(websiteData.seoKeywords || "");
      setOgTitle(websiteData.ogTitle || "");
      setOgDescription(websiteData.ogDescription || "");
      setOgImage(websiteData.ogImage || "");
      setSocialShareImage(websiteData.socialShareImage || "");
      setFaviconUrl(websiteData.faviconUrl || business?.faviconUrl || "");
      setLogoUrl(websiteData.logoUrl || business?.logoUrl || "");
      setSections(normalizeStoreSections(websiteData.sections));
      setCoupons(normalizeStoreCoupons(websiteData.coupons));
      setShippingConfig(normalizeStoreShippingConfig(websiteData.shippingConfig));
      setThemeConfig(normalizeStoreThemeConfig(websiteData.themeConfig, websiteData.uiStyle));
      setAnnouncementBar(normalizeAnnouncementBar(websiteData.announcementBar));
      setFooterConfig(normalizeFooterConfig(websiteData.footerConfig));
      setTrackingConfig(normalizeStoreTrackingConfig(websiteData.trackingConfig));
      setPolicyConfig(normalizeStorePolicyConfig(websiteData.policyConfig));
    } else if (business) {
      setStoreName(business.name || "");
      setSlug(business.slug || "");
      setContactEmail(business.email || "");
      setContactPhone(business.phone || "");
      setStoreAddress(business.address || "");
      setLogoUrl(business.logoUrl || "");
      setFaviconUrl(business.faviconUrl || "");
    }
  }, [websiteData, business]);

  const onlineProductsCount = useMemo(() => 
    (dbProducts || []).filter(p => p.showOnWebsite && !p.isArchived).length, 
  [dbProducts]);

  const previewStoreUrl = useMemo(
    () =>
      resolveStorePreviewUrl({
        slug: slug || business?.slug,
        businessId,
        isPreview: websiteData?.status !== "published",
      }),
    [slug, business?.slug, businessId, websiteData?.status]
  );

  const integrityReport = useMemo(
    () =>
      computeStoreIntegrityAudit({
        storeName: storeName || business?.name,
        slug: slug || business?.slug,
        logoUrl,
        primaryColor,
        onlineProductsCount,
        whatsappOrderEnabled,
        codEnabled,
        contactPhone: contactPhone || business?.phone,
        seoTitle,
        seoDescription,
        websiteStatus: websiteData?.status,
      }),
    [
      storeName,
      business?.name,
      slug,
      business?.slug,
      logoUrl,
      primaryColor,
      onlineProductsCount,
      whatsappOrderEnabled,
      codEnabled,
      contactPhone,
      business?.phone,
      seoTitle,
      seoDescription,
      websiteData?.status,
    ]
  );

  const funnelMetrics = useMemo(
    () => computeStorefrontFunnelMetrics(storeEvents, paidOrders),
    [storeEvents, paidOrders]
  );

  const actionInsights = useMemo(
    () =>
      generateStorefrontActionInsights({
        websiteStatus: websiteData?.status,
        onlineProductsCount,
        activeCouponsCount: coupons.filter((c) => c.active).length,
        freeShippingThreshold: shippingConfig.freeShippingThreshold,
        heroLayout: themeConfig.heroLayout,
        heroImageUrl: themeConfig.heroImageUrl,
        trackingConfig,
        seoTitle,
        seoDescription,
        funnel: funnelMetrics,
      }),
    [
      websiteData?.status,
      onlineProductsCount,
      coupons,
      shippingConfig.freeShippingThreshold,
      themeConfig.heroLayout,
      themeConfig.heroImageUrl,
      trackingConfig,
      seoTitle,
      seoDescription,
      funnelMetrics,
    ]
  );

  const filteredCatalogProducts = useMemo(() => {
    const list = dbProducts || [];
    if (!searchCatalog.trim()) return list;
    const q = searchCatalog.toLowerCase();
    return list.filter((p: any) => 
      p.name?.toLowerCase().includes(q) || 
      p.sku?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  }, [dbProducts, searchCatalog]);

  const handleBrandImageUpload = async (
    file: File | undefined,
    kind: "logo" | "favicon" | "hero"
  ) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please choose a PNG, JPG, SVG, or WebP image.",
      });
      return;
    }
    try {
      const dataUrl = await compressImageFileToDataUrl(
        file,
        kind === "hero" ? 1200 : kind === "logo" ? 256 : 64
      );
      if (kind === "logo") {
        setLogoUrl(dataUrl);
        toast({
          title: "Logo Ready",
          description: "Click Save Theme or Publish Store to apply your new logo.",
        });
      } else if (kind === "hero") {
        setThemeConfig((prev) => ({ ...prev, heroImageUrl: dataUrl }));
        toast({
          title: "Hero Banner Ready",
          description: "Click Save Theme or Publish Store to apply your new hero banner.",
        });
      } else {
        setFaviconUrl(dataUrl);
        toast({
          title: "Favicon Ready",
          description: "Click Save Theme or Publish Store to apply your new favicon.",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Could not process the selected image file.",
      });
    }
  };

  const handleCopyLink = () => {
    const cleanSlug = sanitizeStoreSlug(slug || business?.slug || "");
    const shareTarget = websiteData?.customDomain
      ? `https://${websiteData.customDomain}`
      : cleanSlug
        ? `https://${cleanSlug}.biztrix.in`
        : `${window.location.origin}${previewStoreUrl}`;
    navigator.clipboard.writeText(shareTarget);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast({ title: "Link Copied", description: "Store URL is ready to share." });
  };

  const handleSave = async (targetStatus: 'draft' | 'published') => {
    if (!businessId || !websiteRef) return;
    setIsSaving(true);

    const cleanSlug = sanitizeStoreSlug(slug);
    const normalizedSections = normalizeStoreSections(sections);

    try {
      const idToken = user ? await user.getIdToken() : undefined;
      const result = await saveStorefrontConfig({
        businessId,
        idToken,
        config: {
          primaryColor,
          uiStyle,
          whatsappOrderEnabled,
          codEnabled,
          showDiscount,
          storeName,
          slug: cleanSlug,
          logoUrl,
          faviconUrl,
          contactEmail,
          contactPhone,
          storeAddress,
          sections: normalizedSections,
          seoTitle: seoTitle.trim(),
          seoDescription: seoDescription.trim(),
          seoKeywords: seoKeywords.trim(),
          ogTitle: ogTitle.trim(),
          ogDescription: ogDescription.trim(),
          ogImage: ogImage.trim(),
          socialShareImage: socialShareImage.trim() || ogImage.trim(),
          coupons: normalizeStoreCoupons(coupons),
          shippingConfig: normalizeStoreShippingConfig(shippingConfig),
          themeConfig: normalizeStoreThemeConfig(themeConfig, uiStyle),
          announcementBar: normalizeAnnouncementBar(announcementBar),
          footerConfig: normalizeFooterConfig(footerConfig),
          trackingConfig: normalizeStoreTrackingConfig(trackingConfig),
          policyConfig: normalizeStorePolicyConfig(policyConfig),
          status: targetStatus,
        },
      });

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Save Rejected",
          description: result.message,
        });
        setIsSaving(false);
        return;
      }

      if (result.slug !== undefined) {
        setSlug(result.slug);
      }

      toast({
        title: targetStatus === 'published' ? "Site Published" : "Draft Saved",
        description: result.message,
      });
    } catch {
      // Fallback to client SDK merge if offline
      setDocumentNonBlocking(websiteRef, {
        primaryColor,
        uiStyle,
        whatsappOrderEnabled,
        codEnabled,
        showDiscount,
        storeName,
        slug: cleanSlug,
        logoUrl,
        faviconUrl,
        contactEmail,
        contactPhone,
        storeAddress,
        sections: normalizedSections,
        coupons: normalizeStoreCoupons(coupons),
        shippingConfig: normalizeStoreShippingConfig(shippingConfig),
        themeConfig: normalizeStoreThemeConfig(themeConfig, uiStyle),
        announcementBar: normalizeAnnouncementBar(announcementBar),
        footerConfig: normalizeFooterConfig(footerConfig),
        trackingConfig: normalizeStoreTrackingConfig(trackingConfig),
        policyConfig: normalizeStorePolicyConfig(policyConfig),
        seoTitle: seoTitle.trim(),
        seoDescription: seoDescription.trim(),
        seoKeywords: seoKeywords.trim(),
        ogTitle: ogTitle.trim(),
        ogDescription: ogDescription.trim(),
        ogImage: ogImage.trim(),
        socialShareImage: socialShareImage.trim() || ogImage.trim(),
        updatedAt: serverTimestamp(),
        status: targetStatus,
      }, { merge: true });
      toast({
        title: targetStatus === 'published' ? "Site Published" : "Draft Saved",
        description: "Changes queued to your storefront configuration.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCustomDomain = () => {
    startTransition(async () => {
      if (!businessId) return;
      const idToken = user ? await user.getIdToken() : undefined;
      const result = await updateCustomDomain(businessId, customDomain, idToken);
      if (result.success) {
        toast({ title: "Success", description: result.message });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  const handleRemoveCustomDomain = () => {
    startTransition(async () => {
      if (!businessId) return;
      const idToken = user ? await user.getIdToken() : undefined;
      const result = await removeCustomDomain(businessId, idToken);
      if (result.success) {
        setCustomDomain("");
        toast({ title: "Success", description: result.message });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  const toggleProductAttr = (productId: string, key: 'showOnWebsite' | 'isFeatured' | 'isBestSeller') => {
    if (!businessId) return;
    const productRef = doc(firestore, 'businesses', businessId, 'products', productId);
    const product = (dbProducts || []).find((p: any) => p.id === productId);
    if (!product) return;

    updateDocumentNonBlocking(productRef, { 
      [key]: !product[key],
      updatedAt: serverTimestamp()
    });
    
    toast({ title: "Attribute Updated", description: "Product node synchronized." });
  };

  const toggleSection = (id: string) => {
    const updated: StoreSection[] = sections.map((s) =>
      s.id === id ? { ...s, status: s.status === "Active" ? "Inactive" : "Active" } : s
    );
    setSections(updated);
    toast({ title: "Section Toggled", description: "Remember to Save or Publish changes." });
  };

  const handleMoveSection = (id: string, direction: "up" | "down") => {
    setSections((prev) => moveStoreSection(prev, id, direction));
  };

  const handleUpdateSectionInline = (
    id: string,
    patch: { label: string; content: StoreSectionContent }
  ) => {
    setSections((prev) => updateStoreSectionItem(prev, id, patch));
    toast({
      title: "Section Updated",
      description: "Click Save Layout or Publish Store to sync changes.",
    });
  };

  const handleAddSection = (type: StoreSectionType) => {
    const newSection = createStoreSection(type);
    setSections((prev) => [...prev, newSection]);
    setEditingSectionId(newSection.id);
    toast({
      title: "Section Added",
      description: `${newSection.label} added to your layout. Customize it and click Save Layout or Publish Store.`,
    });
  };

  const handleRemoveSection = (id: string) => {
    const target = sections.find((s) => s.id === id);
    if (!target) return;
    if (
      target.type === "products" &&
      sections.filter((s) => s.type === "products").length <= 1
    ) {
      toast({
        variant: "destructive",
        title: "Core Catalog Required",
        description: "Keep at least one Catalog Grid section active or toggle its visibility instead.",
      });
      return;
    }
    setSections((prev) => removeStoreSection(prev, id));
    if (editingSectionId === id) {
      setEditingSectionId(null);
    }
    toast({
      title: "Section Removed",
      description: `${target.label} removed from your layout. Click Save Layout to apply.`,
    });
  };

  const productsSectionCount = useMemo(
    () => sections.filter((s) => s.type === "products").length,
    [sections]
  );

  const editingSection = useMemo(
    () => sections.find((s) => s.id === editingSectionId) || null,
    [sections, editingSectionId]
  );

  const onlinePreviewProducts = useMemo(
    () => (dbProducts || []).filter((p: any) => p.showOnWebsite && !p.isArchived),
    [dbProducts]
  );

  const currencySymbol = getCurrencySymbol(business?.currency);

  return (
    <div className="space-y-6 md:space-y-8 pb-10 text-left">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1 text-left">
          <div className="flex items-center gap-4 text-left">
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
              <MonitorSmartphone className="h-7 w-7 text-primary" />
            </div>
            <div className="text-left">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Storefront Manager</h2>
              <p className="text-[10px] md:text-sm text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-60">Storefront Control Node & Design Hub</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="h-10 text-[10px] font-black uppercase tracking-widest shadow-sm bg-white">
              <Link href={previewStoreUrl} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" /> Live Preview
              </Link>
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleSave('draft')}
              disabled={isSaving || isPending}
              className="h-10 text-[10px] font-black uppercase tracking-widest px-6 shadow-sm bg-white border-primary/20 text-primary"
            >
              {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />} 
              Save Draft
            </Button>
            <Button 
              onClick={() => handleSave('published')}
              disabled={isSaving || isPending}
              className="bg-primary hover:bg-primary/90 shadow-xl h-10 text-[10px] font-black uppercase tracking-widest px-8 text-white active:scale-95 transition-all"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4 fill-current" />} 
              Publish Store
            </Button>
          </div>
        </div>

        {/* Global Store Stats Top Bar */}
        <Card className="border-none shadow-md bg-white overflow-hidden rounded-[2rem] border">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
              <div className="p-6 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center border border-green-100 shrink-0">
                  <Globe className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Public Domain</p>
                  <p className="text-sm font-black text-primary truncate uppercase">{websiteData?.customDomain || (slug ? `${slug}.biztrix.in` : 'mystore.biztrix.in')}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={handleCopyLink}>
                  {isCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="p-6 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10 shrink-0">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Digital Visibility</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-slate-900">{onlineProductsCount} Items Online</span>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest",
                      websiteData?.status === 'published' ? "text-green-600" : "text-orange-600"
                    )}>
                      {websiteData?.status === 'published' ? 'Live' : 'Draft'}
                    </span>
                  </div>
                </div>
              </div>
              <Link href="/website/orders" className="p-6 flex items-center justify-between hover:bg-muted/5 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100 shrink-0">
                    <ShoppingBag className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Active Orders</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-black text-slate-900">{(orders || []).filter(o => o.status === 'paid' || o.status === 'payment_captured_unsettled').length}</span>
                      <span className="text-[9px] text-muted-foreground font-bold uppercase">Ready</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-all" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border h-14 p-1.5 rounded-2xl shadow-sm mb-10 flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="overview" className="flex-1 text-[10px] font-black uppercase px-6 gap-2"><LineChart className="h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="design" className="flex-1 text-[10px] font-black uppercase px-6 gap-2"><Palette className="h-4 w-4" /> Design & Theme</TabsTrigger>
          <TabsTrigger value="catalog" className="flex-1 text-[10px] font-black uppercase px-6 gap-2"><Layers className="h-4 w-4" /> Catalog Control</TabsTrigger>
          <TabsTrigger value="seo" className="flex-1 text-[10px] font-black uppercase px-6 gap-2 text-primary font-black"><Sparkles className="h-4 w-4" /> SEO & Social</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 text-[10px] font-black uppercase px-6 gap-2"><Settings className="h-4 w-4" /> Core Config</TabsTrigger>
        </TabsList>

        {/* 1. OVERVIEW TAB: Store statistics, storefront information, save draft / publish store controls */}
        <TabsContent value="overview" className="space-y-8 animate-in fade-in">
          {/* Storefront Control & Quick Publish Hub */}
          <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border text-left">
            <CardHeader className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-8 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-3">
                    <Badge className={cn(
                      "text-[9px] font-black uppercase px-3 py-1 border-none",
                      websiteData?.status === 'published' ? "bg-green-500 text-white" : "bg-orange-500 text-white"
                    )}>
                      {websiteData?.status === 'published' ? '● Live Storefront' : '● Draft Mode'}
                    </Badge>
                    <span className="text-[10px] font-mono text-slate-400">
                      ID: {businessId ? businessId.slice(-8).toUpperCase() : 'PENDING'}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                    {storeName || business?.name || 'Storefront Hub'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Globe className="h-3.5 w-3.5 text-accent" />
                    <span>Public URL:</span>
                    <Link 
                      href={previewStoreUrl} 
                      target="_blank" 
                      className="font-mono text-accent hover:underline font-bold"
                    >
                      {websiteData?.customDomain || (slug ? `${slug}.biztrix.in` : businessId ? `shop?bId=${businessId}` : 'mystore.biztrix.in')}
                    </Link>
                  </div>
                </div>
                
                {/* Save Draft / Publish Store Controls */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button asChild variant="outline" size="sm" className="h-10 text-[10px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 text-white border-white/20">
                    <Link href={previewStoreUrl} target="_blank">
                      <ExternalLink className="mr-2 h-3.5 w-3.5" /> Preview
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSave('draft')}
                    disabled={isSaving || isPending}
                    className="h-10 text-[10px] font-black uppercase tracking-widest bg-white text-slate-900 hover:bg-slate-100 border-none shadow-sm px-5"
                  >
                    {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5 text-primary" />}
                    Save Draft
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleSave('published')}
                    disabled={isSaving || isPending}
                    className="h-10 text-[10px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white shadow-xl border-none px-6 active:scale-95 transition-all"
                  >
                    {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-2 h-3.5 w-3.5 fill-current" />}
                    Publish Store
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                <div className="p-5 rounded-2xl bg-muted/20 border border-muted/30">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Catalog Online</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{onlineProductsCount} <span className="text-xs text-muted-foreground font-normal">/ {(dbProducts || []).length} items</span></p>
                </div>
                <div className="p-5 rounded-2xl bg-muted/20 border border-muted/30">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Active Sections</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{sections.filter(s => s.status === 'Active').length} <span className="text-xs text-muted-foreground font-normal">/ {sections.length}</span></p>
                </div>
                <div className="p-5 rounded-2xl bg-muted/20 border border-muted/30">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Total Paid Orders</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{paidOrders.length} <span className="text-xs text-muted-foreground font-normal">/ {orders.length} total</span></p>
                </div>
                <div className="p-5 rounded-2xl bg-muted/20 border border-muted/30">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Design Style</p>
                  <p className="text-sm font-black text-primary uppercase mt-2 flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border shadow-sm shrink-0" style={{ backgroundColor: primaryColor }} />
                    <span className="truncate">{uiStyle}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left">
            <div className="lg:col-span-8 space-y-8">
              <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border">
                <CardHeader className="bg-primary/5 border-b py-6 px-8 flex flex-row justify-between items-center text-left gap-4">
                  <div className="space-y-1 text-left">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" /> Funnel & Merchandising Diagnostics
                    </CardTitle>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      Live telemetry & storefront configuration checks
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase bg-white">
                    <Link href="/website/visitors">
                      Visitor Funnel <ChevronRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                    <div className="p-4 rounded-2xl bg-slate-50 border">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Sessions</p>
                      <p className="text-xl font-black text-slate-900 mt-0.5 tabular-nums">
                        {funnelMetrics.uniqueSessions}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Add-to-Bag Rate</p>
                      <p className="text-xl font-black text-slate-900 mt-0.5 tabular-nums">
                        {funnelMetrics.viewToCartRate}%
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Conversion Rate</p>
                      <p className="text-xl font-black text-primary mt-0.5 tabular-nums">
                        {funnelMetrics.overallConversionRate}%
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Avg Order Value</p>
                      <p className="text-xl font-black text-slate-900 mt-0.5 tabular-nums">
                        {currencySymbol}{funnelMetrics.averageOrderValue.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {actionInsights.map((insight) => (
                      <div
                        key={insight.id}
                        className={cn(
                          "p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left",
                          insight.severity === "warning"
                            ? "bg-amber-50/70 border-amber-200"
                            : insight.severity === "healthy"
                              ? "bg-emerald-50/70 border-emerald-200"
                              : "bg-slate-50 border-slate-200"
                        )}
                      >
                        <div className="flex items-start gap-3.5">
                          <div
                            className={cn(
                              "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border",
                              insight.severity === "warning"
                                ? "bg-amber-100 border-amber-200 text-amber-700"
                                : insight.severity === "healthy"
                                  ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                                  : "bg-primary/10 border-primary/20 text-primary"
                            )}
                          >
                            {insight.severity === "healthy" ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Target className="h-4 w-4" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-black text-slate-900 uppercase tracking-tight">
                                {insight.title}
                              </p>
                              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-white border text-slate-600">
                                {insight.metricTag}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {insight.description}
                            </p>
                          </div>
                        </div>
                        {insight.targetTab !== "overview" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveTab(insight.targetTab)}
                            className="h-9 px-4 text-[10px] font-black uppercase rounded-xl shrink-0 bg-white"
                          >
                            Configure <ChevronRight className="ml-1 h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2.5rem] border text-left">
                <CardHeader className="bg-muted/30 border-b py-6 px-8 flex justify-between items-center">
                   <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Receipt className="h-4 w-4" /> Recent Order Nodes</CardTitle>
                   <Button asChild variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase text-primary">
                      <Link href="/website/orders">View All Orders <ChevronRight className="ml-1 h-3 w-3" /></Link>
                   </Button>
                </CardHeader>
                <div className="overflow-x-auto">
                   <Table>
                      <TableHeader><TableRow className="bg-muted/10"><TableHead className="pl-8 text-[9px] font-black uppercase h-10">Order ID</TableHead><TableHead className="text-[9px] font-black uppercase h-10">Customer</TableHead><TableHead className="text-center text-[9px] font-black uppercase h-10">Status</TableHead><TableHead className="text-right pr-8 text-[9px] font-black uppercase h-10">Amount</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {(!orders || orders.length === 0) ? <TableRow><TableCell colSpan={4} className="h-40 text-center opacity-30 italic text-sm">No storefront orders yet.</TableCell></TableRow> : orders.slice(0, 5).map(o => (
                          <TableRow key={o.id} className="hover:bg-muted/5 border-b last:border-0 cursor-pointer" onClick={() => router.push('/website/orders')}>
                             <TableCell className="pl-8 py-4"><span className="text-[10px] font-mono font-black text-slate-900">{o.id.slice(-8).toUpperCase()}</span></TableCell>
                             <TableCell><span className="text-xs font-bold text-slate-700">{o.customerData?.name || 'Client'}</span></TableCell>
                             <TableCell className="text-center"><Badge variant="outline" className="text-[7px] h-4 border-none bg-primary/5 text-primary uppercase font-black">{o.status}</Badge></TableCell>
                             <TableCell className="text-right pr-8 font-black text-xs">{currencySymbol}{o.amount?.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                   </Table>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-8">
              <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden group">
                <CardHeader className="p-8 pb-4 border-b border-white/5 text-left">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-accent">Store Integrity</CardTitle>
                    <ShieldCheck className="h-4 w-4 text-accent" />
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8 text-left">
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="h-28 w-28 rounded-full border-8 border-accent/20 flex items-center justify-center shadow-2xl relative overflow-hidden">
                       <div className="absolute inset-0 bg-accent/5 animate-pulse" />
                       <span className="text-3xl font-black text-accent relative z-10">{integrityReport.score}%</span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-6 text-accent">Deployment Readiness</p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-tight">
                      <span className="opacity-60 text-slate-400">SEO Sync</span>
                      <span className={integrityReport.seoScore >= 80 ? "text-green-400" : "text-amber-400"}>
                        {integrityReport.seoScore}%
                      </span>
                    </div>
                    <Progress value={integrityReport.seoScore} className="h-1 bg-white/10" />
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-tight">
                      <span className="opacity-60 text-slate-400">Catalog Readiness</span>
                      <span className={integrityReport.catalogScore >= 70 ? "text-green-400" : "text-amber-400"}>
                        {integrityReport.catalogScore}%
                      </span>
                    </div>
                    <Progress value={integrityReport.catalogScore} className="h-1 bg-white/10" />
                  </div>
                </CardContent>
                <CardFooter className="bg-white/5 p-6 border-t border-white/10">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setAuditOpen(true)}
                    className="w-full text-[10px] font-black uppercase tracking-widest text-accent hover:bg-white/10"
                  >
                    Run Registry Audit <ChevronRight className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 2. DESIGN & THEME TAB: primary color control, UI style control, WhatsApp order toggle, showDiscount toggle, section/layout controls & theme persistence */}
        <TabsContent value="design" className="space-y-8 animate-in fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start text-left">
            <div className="lg:col-span-8 space-y-10 min-w-0">
              {/* Brand & Theme Node */}
              <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border text-left">
                <CardHeader className="bg-primary/5 border-b py-6 px-8 flex flex-row items-center justify-between text-left">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-3">
                    <Palette className="h-5 w-5" /> Brand Identity & Color Theme
                  </CardTitle>
                  <Button 
                    size="sm"
                    onClick={() => handleSave(websiteData?.status || 'draft')}
                    disabled={isSaving || isPending}
                    className="h-8 text-[9px] font-black uppercase bg-primary hover:bg-primary/90 text-white rounded-xl shadow-sm px-4"
                  >
                    {isSaving ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Save className="mr-1.5 h-3 w-3" />}
                    Save Theme
                  </Button>
                </CardHeader>
                <CardContent className="p-8 sm:p-10 space-y-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                    <div className="space-y-3 text-left">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Store Primary Logo</Label>
                        {logoUrl && (
                          <button
                            type="button"
                            onClick={() => setLogoUrl("")}
                            className="text-[9px] font-black uppercase text-rose-600 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          handleBrandImageUpload(e.target.files?.[0], "logo");
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="w-full h-36 border-4 border-dashed border-muted rounded-[2rem] flex flex-col items-center justify-center bg-muted/10 group hover:border-primary/40 transition-all cursor-pointer shadow-inner overflow-hidden relative"
                      >
                        {logoUrl ? (
                          <img src={logoUrl} alt="Store Logo" className="h-24 w-24 object-contain rounded-xl" />
                        ) : (
                          <>
                            <Upload className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span className="text-[9px] font-black text-muted-foreground uppercase mt-3 tracking-widest">Upload PNG / SVG / WebP</span>
                          </>
                        )}
                      </button>
                      <Input
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="Or paste logo image URL..."
                        className="h-10 rounded-xl bg-muted/20 border-none text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-3 text-left">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Browser Tab Node (Favicon)</Label>
                        {faviconUrl && (
                          <button
                            type="button"
                            onClick={() => setFaviconUrl("")}
                            className="text-[9px] font-black uppercase text-rose-600 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        ref={faviconInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          handleBrandImageUpload(e.target.files?.[0], "favicon");
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => faviconInputRef.current?.click()}
                        className="w-full h-36 border-4 border-dashed border-muted rounded-[2rem] flex flex-col items-center justify-center bg-muted/10 group hover:border-primary/40 transition-all cursor-pointer shadow-inner overflow-hidden relative"
                      >
                        {faviconUrl ? (
                          <img src={faviconUrl} alt="Store Favicon" className="h-14 w-14 object-contain rounded-lg" />
                        ) : (
                          <>
                            <ImageIcon className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span className="text-[9px] font-black text-muted-foreground uppercase mt-3 tracking-widest">Upload Square 64x64</span>
                          </>
                        )}
                      </button>
                      <Input
                        value={faviconUrl}
                        onChange={(e) => setFaviconUrl(e.target.value)}
                        placeholder="Or paste favicon URL..."
                        className="h-10 rounded-xl bg-muted/20 border-none text-xs font-mono"
                      />
                    </div>
                  </div>
                  
                  <Separator className="opacity-40" />

                  {/* Primary Color & UI Style Controls */}
                  <div className="space-y-8 text-left">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2 px-1"><Layout className="h-4 w-4" /> Global Theme Logic</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                      <div className="space-y-3">
                        <Label className="text-[11px] font-black uppercase text-muted-foreground ml-1">Primary Color Control</Label>
                        <div className="flex gap-4 p-2 bg-muted/20 rounded-2xl border border-transparent shadow-inner">
                          <Input 
                            type="color" 
                            value={primaryColor} 
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="h-12 w-20 p-1.5 rounded-xl border-none cursor-pointer bg-white"
                          />
                          <Input 
                            value={primaryColor} 
                            onChange={(e) => setPrimaryColor(e.target.value)} 
                            className="h-12 flex-1 rounded-xl font-mono font-black text-lg bg-white border-none shadow-sm uppercase" 
                          />
                        </div>

                        {/* Preset Color Swatches */}
                        <div className="flex items-center gap-2 pt-2 flex-wrap">
                          {COLOR_PALETTES.map((palette) => (
                            <button
                              key={palette.value}
                              type="button"
                              onClick={() => setPrimaryColor(palette.value)}
                              title={palette.name}
                              className={cn(
                                "h-7 w-7 rounded-xl transition-all border-2 flex items-center justify-center shadow-sm",
                                primaryColor.toLowerCase() === palette.value.toLowerCase() ? "border-slate-900 scale-110 shadow-md" : "border-transparent hover:scale-105"
                              )}
                              style={{ backgroundColor: palette.value }}
                            >
                              {primaryColor.toLowerCase() === palette.value.toLowerCase() && (
                                <Check className="h-3.5 w-3.5 text-white" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-[11px] font-black uppercase text-muted-foreground ml-1">UI Style Control</Label>
                        <Select value={uiStyle} onValueChange={setUiStyle}>
                          <SelectTrigger className="h-12 rounded-2xl font-black text-xs uppercase bg-muted/20 border-none shadow-inner text-left"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-2xl border-none shadow-2xl">
                            <SelectItem value="modern" className="text-xs font-bold uppercase">Modern Glass Node</SelectItem>
                            <SelectItem value="minimal" className="text-xs font-bold uppercase">Minimal High-Contrast</SelectItem>
                            <SelectItem value="classic" className="text-xs font-bold uppercase">Classic Retail</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight mt-1.5 ml-1">Controls card elevation, corners, and glassmorphism styling</p>
                      </div>
                    </div>
                  </div>

                  <Separator className="opacity-40" />

                  {/* Phase 2: Hero Layout, Banner Image & Typography Presets */}
                  <div className="space-y-6 text-left">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2 px-1">
                      <Type className="h-4 w-4" /> Hero Visuals, Surface & Typography
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">
                            Hero Banner Image
                          </Label>
                          {themeConfig.heroImageUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setThemeConfig((prev) => ({ ...prev, heroImageUrl: "" }))
                              }
                              className="text-[9px] font-black uppercase text-rose-600 hover:underline"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <input
                          ref={heroImageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            handleBrandImageUpload(e.target.files?.[0], "hero");
                            e.target.value = "";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => heroImageInputRef.current?.click()}
                          className="w-full h-32 border-2 border-dashed border-muted rounded-2xl flex flex-col items-center justify-center bg-muted/10 group hover:border-primary/40 transition-all cursor-pointer overflow-hidden relative"
                        >
                          {themeConfig.heroImageUrl ? (
                            <img
                              src={themeConfig.heroImageUrl}
                              alt="Hero Banner"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <>
                              <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                              <span className="text-[9px] font-black text-muted-foreground uppercase mt-2 tracking-widest">
                                Upload 16:9 Banner (Optional)
                              </span>
                            </>
                          )}
                        </button>
                        <Input
                          value={themeConfig.heroImageUrl}
                          onChange={(e) =>
                            setThemeConfig((prev) => ({
                              ...prev,
                              heroImageUrl: e.target.value,
                            }))
                          }
                          placeholder="Or paste hero banner image URL..."
                          className="h-9 rounded-xl bg-muted/20 border-none text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">
                            Hero Layout Style
                          </Label>
                          <Select
                            value={themeConfig.heroLayout}
                            onValueChange={(v) =>
                              setThemeConfig((prev) => ({
                                ...prev,
                                heroLayout: v as StoreHeroLayout,
                              }))
                            }
                          >
                            <SelectTrigger className="h-11 rounded-xl font-bold text-xs uppercase bg-muted/20 border-none shadow-inner">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="classic_banner" className="text-xs font-bold uppercase">
                                Classic Centered Banner
                              </SelectItem>
                              <SelectItem value="split_showcase" className="text-xs font-bold uppercase">
                                Split Asymmetric Showcase
                              </SelectItem>
                              <SelectItem value="editorial_cover" className="text-xs font-bold uppercase">
                                Editorial Image Cover
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">
                            Typography Pairing
                          </Label>
                          <Select
                            value={themeConfig.fontPair}
                            onValueChange={(v) =>
                              setThemeConfig((prev) => ({
                                ...prev,
                                fontPair: v as StoreFontPair,
                              }))
                            }
                          >
                            <SelectTrigger className="h-11 rounded-xl font-bold text-xs uppercase bg-muted/20 border-none shadow-inner">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="jakarta" className="text-xs font-bold uppercase">
                                Plus Jakarta + DM Sans (Modern)
                              </SelectItem>
                              <SelectItem value="playfair" className="text-xs font-bold uppercase">
                                Playfair Display + Jakarta (Boutique)
                              </SelectItem>
                              <SelectItem value="outfit" className="text-xs font-bold uppercase">
                                Outfit + Manrope (Bold Retail)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">
                          Surface Mode
                        </Label>
                        <Select
                          value={themeConfig.themeSurface}
                          onValueChange={(v) =>
                            setThemeConfig((prev) => ({
                              ...prev,
                              themeSurface: v as StoreThemeSurface,
                            }))
                          }
                        >
                          <SelectTrigger className="h-10 rounded-xl font-bold text-xs uppercase bg-muted/20 border-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Crisp Light</SelectItem>
                            <SelectItem value="warm_paper">Warm Paper</SelectItem>
                            <SelectItem value="charcoal">Charcoal Dark</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">
                          Card Corners
                        </Label>
                        <Select
                          value={themeConfig.cardRadius}
                          onValueChange={(v) =>
                            setThemeConfig((prev) => ({
                              ...prev,
                              cardRadius: v as StoreCornerRadius,
                            }))
                          }
                        >
                          <SelectTrigger className="h-10 rounded-xl font-bold text-xs uppercase bg-muted/20 border-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sharp">Sharp</SelectItem>
                            <SelectItem value="rounded">Rounded</SelectItem>
                            <SelectItem value="soft">Soft Pill</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">
                          Button Shape
                        </Label>
                        <Select
                          value={themeConfig.buttonStyle}
                          onValueChange={(v) =>
                            setThemeConfig((prev) => ({
                              ...prev,
                              buttonStyle: v as StoreButtonStyle,
                            }))
                          }
                        >
                          <SelectTrigger className="h-10 rounded-xl font-bold text-xs uppercase bg-muted/20 border-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="solid">Solid Block</SelectItem>
                            <SelectItem value="pill">Capsule Pill</SelectItem>
                            <SelectItem value="outline">Sharp Outline</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">
                          Desktop Grid
                        </Label>
                        <Select
                          value={String(themeConfig.gridColumns)}
                          onValueChange={(v) =>
                            setThemeConfig((prev) => ({
                              ...prev,
                              gridColumns: (Number(v) === 3 ? 3 : 4) as StoreGridColumns,
                            }))
                          }
                        >
                          <SelectTrigger className="h-10 rounded-xl font-bold text-xs uppercase bg-muted/20 border-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="4">4 Columns</SelectItem>
                            <SelectItem value="3">3 Columns</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator className="opacity-40" />

                  {/* WhatsApp Order & Show Discount Toggles */}
                  <div className="space-y-6 text-left">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2 px-1">
                      <SmartphoneNfc className="h-4 w-4" /> Ordering & Discount Logic
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div className="flex items-center justify-between p-5 bg-green-50/70 rounded-[2rem] border border-green-100 shadow-sm transition-all group hover:bg-green-50">
                        <div className="space-y-1 text-left pr-3">
                          <Label className="text-xs font-black text-green-900 flex items-center gap-2 uppercase tracking-tight">
                            <MessageSquare className="h-4 w-4 text-green-600 shrink-0" /> WhatsApp Order
                          </Label>
                          <p className="text-[9px] text-green-700/80 font-bold uppercase tracking-wider">
                            Direct checkout on WhatsApp
                          </p>
                        </div>
                        <Switch 
                          checked={whatsappOrderEnabled} 
                          onCheckedChange={setWhatsappOrderEnabled} 
                          className="data-[state=checked]:bg-green-600 shadow-sm" 
                        />
                      </div>

                      <div className="flex items-center justify-between p-5 bg-amber-50/70 rounded-[2rem] border border-amber-100 shadow-sm transition-all group hover:bg-amber-50">
                        <div className="space-y-1 text-left pr-3">
                          <Label className="text-xs font-black text-amber-900 flex items-center gap-2 uppercase tracking-tight">
                            <Banknote className="h-4 w-4 text-amber-600 shrink-0" /> Cash on Delivery
                          </Label>
                          <p className="text-[9px] text-amber-700/80 font-bold uppercase tracking-wider">
                            Allow doorstep COD orders
                          </p>
                        </div>
                        <Switch 
                          checked={codEnabled} 
                          onCheckedChange={setCodEnabled} 
                          className="data-[state=checked]:bg-amber-600 shadow-sm" 
                        />
                      </div>

                      <div className="flex items-center justify-between p-5 bg-primary/5 rounded-[2rem] border border-primary/10 transition-all group hover:bg-primary/10">
                        <div className="space-y-1 text-left pr-3">
                          <Label className="text-xs font-black text-primary flex items-center gap-2 uppercase tracking-tight">
                            <Percent className="h-4 w-4 shrink-0" /> Show Discounts
                          </Label>
                          <p className="text-[9px] font-bold text-primary/60 uppercase tracking-wider">
                            Strike-through MRP & % off
                          </p>
                        </div>
                        <Switch 
                          checked={showDiscount} 
                          onCheckedChange={setShowDiscount} 
                          className="data-[state=checked]:bg-primary shadow-sm" 
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Announcement Bar Builder */}
              <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border text-left">
                <CardHeader className="bg-amber-50/60 border-b py-5 px-8 flex flex-row items-center justify-between text-left">
                  <div className="space-y-0.5">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-amber-900 flex items-center gap-2.5">
                      <Megaphone className="h-4 w-4 text-amber-600" /> Top Announcement Bar
                    </CardTitle>
                    <p className="text-[9px] font-bold text-amber-800/70 uppercase">
                      Highlight festival offers, coupon codes, or free delivery notices above your navbar
                    </p>
                  </div>
                  <Switch
                    checked={announcementBar.enabled}
                    onCheckedChange={(checked) =>
                      setAnnouncementBar((prev) => ({ ...prev, enabled: checked }))
                    }
                    className="data-[state=checked]:bg-amber-600"
                  />
                </CardHeader>
                <CardContent className="p-8 space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">
                      Banner Message
                    </Label>
                    <Input
                      value={announcementBar.text}
                      onChange={(e) =>
                        setAnnouncementBar((prev) => ({ ...prev, text: e.target.value }))
                      }
                      placeholder="e.g. Use code WELCOME10 for 10% OFF your first order!"
                      className="h-11 rounded-xl bg-muted/20 border-none font-semibold text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="space-y-1.5 sm:col-span-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">
                        Link Text
                      </Label>
                      <Input
                        value={announcementBar.ctaLabel}
                        onChange={(e) =>
                          setAnnouncementBar((prev) => ({ ...prev, ctaLabel: e.target.value }))
                        }
                        placeholder="Shop Now"
                        className="h-10 rounded-xl bg-muted/20 border-none text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">
                        Link Target
                      </Label>
                      <Input
                        value={announcementBar.ctaUrl}
                        onChange={(e) =>
                          setAnnouncementBar((prev) => ({ ...prev, ctaUrl: e.target.value }))
                        }
                        placeholder="#store-catalog"
                        className="h-10 rounded-xl bg-muted/20 border-none text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">
                        Bar Fill
                      </Label>
                      <Input
                        type="color"
                        value={announcementBar.bgColor}
                        onChange={(e) =>
                          setAnnouncementBar((prev) => ({ ...prev, bgColor: e.target.value }))
                        }
                        className="h-10 w-full p-1 rounded-xl cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">
                        Text Color
                      </Label>
                      <Input
                        type="color"
                        value={announcementBar.textColor}
                        onChange={(e) =>
                          setAnnouncementBar((prev) => ({ ...prev, textColor: e.target.value }))
                        }
                        className="h-10 w-full p-1 rounded-xl cursor-pointer"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 4. Section/Layout Controls: Reorder, Toggle, Inline Edit, Visual Editor */}
              <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border text-left">
                <CardHeader className="bg-muted/30 border-b py-6 px-8 flex flex-row flex-wrap items-center justify-between gap-3 text-left">
                  <div className="space-y-1">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-3">
                      <Layout className="h-4 w-4" /> Section & Layout Controls
                    </CardTitle>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Add professional blocks, reorder, toggle visibility, or edit storefront section copy directly</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setAddSectionOpen(true)}
                      className="h-8 text-[9px] font-black uppercase rounded-xl bg-primary text-white gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Section
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => handleSave(websiteData?.status || 'draft')}
                      disabled={isSaving || isPending}
                      className="h-8 text-[9px] font-black uppercase rounded-xl border-primary/20 text-primary"
                    >
                      Save Layout
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {sections.map((section, idx) => {
                      const IconComp = ICON_MAP[section.iconName] || Globe;
                      const isSoleProducts =
                        section.type === "products" && productsSectionCount <= 1;
                      return (
                        <div key={section.id} className="p-5 sm:px-6 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 hover:bg-muted/5 transition-all text-left">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="flex flex-col gap-1 shrink-0">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={`Move ${section.label} up`}
                                disabled={idx === 0}
                                onClick={() => handleMoveSection(section.id, "up")}
                                className="h-6 w-6 rounded-md"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={`Move ${section.label} down`}
                                disabled={idx === sections.length - 1}
                                onClick={() => handleMoveSection(section.id, "down")}
                                className="h-6 w-6 rounded-md"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="h-11 w-11 rounded-2xl bg-muted/30 flex items-center justify-center shadow-inner shrink-0">
                              <IconComp className="h-5 w-5 text-slate-500" />
                            </div>
                            <div className="text-left min-w-0">
                              <span className="text-sm font-black text-slate-900 uppercase tracking-tight block truncate">
                                {section.content.title || section.label}
                              </span>
                              <span className="text-[9px] font-mono text-muted-foreground uppercase">
                                {section.type} · #{idx + 1}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0 ml-auto">
                            <Badge variant={section.status === 'Active' ? 'secondary' : 'outline'} className={cn("text-[8px] uppercase font-black h-5 px-3 border-none shadow-sm", section.status === 'Active' ? "bg-green-100 text-green-700" : "bg-muted text-slate-400")}>
                              {section.status}
                            </Badge>
                            <Switch 
                              checked={section.status === 'Active'} 
                              onCheckedChange={() => toggleSection(section.id)} 
                              className="scale-90 data-[state=checked]:bg-primary" 
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingSectionId(section.id)}
                              className="h-8 px-3 rounded-xl text-[10px] font-black uppercase gap-1.5"
                            >
                              <Edit2 className="h-3 w-3" /> Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={isSoleProducts}
                              aria-label={`Remove ${section.label}`}
                              title={isSoleProducts ? "Core Catalog Grid cannot be deleted" : `Remove ${section.label}`}
                              onClick={() => handleRemoveSection(section.id)}
                              className={cn(
                                "h-8 w-8 rounded-xl",
                                isSoleProducts
                                  ? "opacity-25 cursor-not-allowed"
                                  : "text-rose-500 hover:bg-rose-50"
                              )}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-xl" title="Open Full Visual Editor">
                              <Link href="/website/editor/main">
                                <Settings className="h-4 w-4 text-muted-foreground opacity-60 hover:opacity-100" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Social Links & Footer Trust Builder */}
              <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border text-left">
                <CardHeader className="bg-slate-50 border-b py-5 px-8 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2.5">
                      <Globe className="h-4 w-4 text-primary" /> Social Links & Footer Builder
                    </CardTitle>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">
                      Displayed in your public storefront footer with direct merchant links
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-[9px] font-black uppercase text-slate-600">
                      Trust Strip
                    </Label>
                    <Switch
                      checked={footerConfig.showTrustHighlights}
                      onCheckedChange={(checked) =>
                        setFooterConfig((prev) => ({ ...prev, showTrustHighlights: checked }))
                      }
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">
                      Footer Store Tagline
                    </Label>
                    <Input
                      value={footerConfig.tagline}
                      onChange={(e) =>
                        setFooterConfig((prev) => ({ ...prev, tagline: e.target.value }))
                      }
                      placeholder="Genuine quality products delivered directly from our store desk."
                      className="h-11 rounded-xl bg-muted/20 border-none text-xs font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                        <Instagram className="h-3.5 w-3.5 text-pink-600" /> Instagram URL
                      </Label>
                      <Input
                        value={footerConfig.instagramUrl}
                        onChange={(e) =>
                          setFooterConfig((prev) => ({ ...prev, instagramUrl: e.target.value }))
                        }
                        placeholder="https://instagram.com/..."
                        className="h-10 rounded-xl bg-muted/20 border-none text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                        <Facebook className="h-3.5 w-3.5 text-blue-600" /> Facebook URL
                      </Label>
                      <Input
                        value={footerConfig.facebookUrl}
                        onChange={(e) =>
                          setFooterConfig((prev) => ({ ...prev, facebookUrl: e.target.value }))
                        }
                        placeholder="https://facebook.com/..."
                        className="h-10 rounded-xl bg-muted/20 border-none text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                        <Youtube className="h-3.5 w-3.5 text-red-600" /> YouTube URL
                      </Label>
                      <Input
                        value={footerConfig.youtubeUrl}
                        onChange={(e) =>
                          setFooterConfig((prev) => ({ ...prev, youtubeUrl: e.target.value }))
                        }
                        placeholder="https://youtube.com/..."
                        className="h-10 rounded-xl bg-muted/20 border-none text-xs font-mono"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/20 p-5 border-t flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSave(websiteData?.status || "draft")}
                    disabled={isSaving || isPending}
                    className="h-9 px-5 rounded-xl bg-primary text-white text-[10px] font-black uppercase"
                  >
                    {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                    Save Design & Layout
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Live Simulator Node */}
            <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-24 min-w-0">
              <StoreSimulator
                storeName={storeName || business?.name || "My Brand"}
                logoUrl={logoUrl}
                primaryColor={primaryColor}
                uiStyle={uiStyle}
                codEnabled={codEnabled}
                whatsappOrderEnabled={whatsappOrderEnabled}
                sections={sections}
                themeConfig={themeConfig}
                announcementBar={announcementBar}
                footerConfig={footerConfig}
                sampleProducts={onlinePreviewProducts}
              />
            </div>
          </div>

          <SectionEditDialog
            section={editingSection}
            open={Boolean(editingSection)}
            onOpenChange={(open) => {
              if (!open) setEditingSectionId(null);
            }}
            onSaveSection={handleUpdateSectionInline}
          />
          <AddSectionDialog
            open={addSectionOpen}
            onOpenChange={setAddSectionOpen}
            existingSections={sections}
            onAddSection={handleAddSection}
          />
        </TabsContent>

        {/* 3. CATALOG CONTROL TAB: product attribute controls, showOnWebsite, price/discount controls, toggleProductAttr */}
        <TabsContent value="catalog" className="space-y-8 animate-in fade-in">
          <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2.5rem] border text-left">
            <CardHeader className="bg-muted/30 border-b py-6 px-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-left">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-3"><Layers className="h-5 w-5" /> Online Catalog Node</CardTitle>
                <p className="text-[9px] font-bold text-muted-foreground uppercase mt-2 tracking-widest">
                  Manage product visibility (showOnWebsite), online prices, discount indicators, and marketing attributes
                </p>
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
                  <Input 
                    value={searchCatalog}
                    onChange={(e) => setSearchCatalog(e.target.value)}
                    placeholder="Search SKU or Name..." 
                    className="pl-10 h-11 text-xs rounded-xl shadow-inner bg-white border-none" 
                  />
                </div>
                {searchCatalog && (
                  <Button variant="ghost" size="sm" onClick={() => setSearchCatalog("")} className="h-10 text-xs">
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>

            <div className="p-4 px-8 bg-muted/10 border-b flex items-center justify-between text-xs font-bold text-muted-foreground uppercase">
              <span>Showing {filteredCatalogProducts.length} of {(dbProducts || []).length} Inventory Items</span>
              <span className="text-green-700 font-black">{onlineProductsCount} Products Online</span>
            </div>

            <div className="overflow-x-auto scrollbar-hide">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow className="bg-muted/10 border-b">
                    <TableHead className="text-[10px] font-black uppercase h-14 pl-10">Product Entity</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center h-14">Base / MRP Price</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center h-14">Online Price (Sale)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center h-14">Store Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center h-14">Featured</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center h-14">Best Seller</TableHead>
                    <TableHead className="text-right pr-10 h-14 w-32"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCatalogProducts.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="h-60 text-center opacity-30 italic text-sm font-black uppercase">No inventory nodes found in registry.</TableCell></TableRow>
                  ) : (
                    filteredCatalogProducts.map((p) => {
                      const basePrice = p.price || 0;
                      const onlinePrice = p.onlinePrice !== undefined && p.onlinePrice !== null ? p.onlinePrice : basePrice;
                      const hasDiscount = onlinePrice < basePrice;
                      const discountPercent = hasDiscount && basePrice > 0 ? Math.round(((basePrice - onlinePrice) / basePrice) * 100) : 0;

                      return (
                        <TableRow key={p.id} className="group hover:bg-muted/5 transition-colors border-b">
                          <TableCell className="pl-10 py-6">
                            <div className="flex items-center gap-5 text-left">
                              <div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center font-black text-primary text-xl border shadow-inner shrink-0">
                                 {p.name?.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight leading-none mb-1.5">{p.name}</p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[7px] font-mono h-4 border-primary/20 text-primary uppercase">SKU: {p.sku || 'N/A'}</Badge>
                                  {p.category && (
                                    <span className="text-[8px] font-bold text-muted-foreground uppercase">{p.category}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Base / MRP Price */}
                          <TableCell className="text-center font-bold text-xs text-slate-600">
                            <span>{currencySymbol}{basePrice.toLocaleString()}</span>
                          </TableCell>

                          {/* Online Sale Price & Discount Controls */}
                          <TableCell className="text-center">
                            <div className="inline-flex flex-col items-center gap-1.5">
                              <div className="inline-flex items-center gap-2 bg-primary/5 p-1 rounded-xl border border-primary/10">
                                <span className="text-[9px] font-black text-primary ml-2">{currencySymbol}</span>
                                <Input 
                                  type="number" 
                                  defaultValue={onlinePrice} 
                                  onBlur={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val) && businessId) {
                                      updateDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'products', p.id), { 
                                        onlinePrice: val,
                                        updatedAt: serverTimestamp() 
                                      });
                                      toast({ title: "Price Updated", description: `${p.name} online price set to ${currencySymbol}${val}` });
                                    }
                                  }}
                                  className="h-8 w-24 text-center text-xs font-black border-none bg-transparent focus-visible:ring-0"
                                />
                              </div>
                              {hasDiscount && (
                                <Badge className="bg-red-50 text-red-600 border border-red-200 text-[8px] font-black px-2 py-0">
                                  {discountPercent}% OFF
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* Store Status (showOnWebsite toggle) */}
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-2">
                               <Switch 
                                 checked={!!p.showOnWebsite} 
                                 onCheckedChange={() => toggleProductAttr(p.id, 'showOnWebsite')}
                                 className="scale-90 data-[state=checked]:bg-green-600" 
                               />
                               <span className={cn("text-[7px] font-black uppercase tracking-widest", p.showOnWebsite ? "text-green-600" : "text-slate-400")}>
                                 {p.showOnWebsite ? 'VISIBLE' : 'HIDDEN'}
                               </span>
                            </div>
                          </TableCell>

                          {/* Featured Attribute */}
                          <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Toggle Featured status"
                              className={cn("h-10 w-10 rounded-2xl transition-all", p.isFeatured ? "text-primary bg-primary/10 shadow-inner" : "text-slate-200")}
                              onClick={() => toggleProductAttr(p.id, 'isFeatured')}
                            >
                              <Star className={cn("h-5 w-5", p.isFeatured && "fill-current text-primary")} />
                            </Button>
                          </TableCell>

                          {/* Best Seller Attribute */}
                          <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Toggle Best Seller status"
                              className={cn("h-10 w-10 rounded-2xl transition-all", p.isBestSeller ? "text-orange-500 bg-orange-50 shadow-inner" : "text-slate-200")}
                              onClick={() => toggleProductAttr(p.id, 'isBestSeller')}
                            >
                              <Flame className={cn("h-5 w-5", p.isBestSeller && "fill-current text-orange-500")} />
                            </Button>
                          </TableCell>

                          <TableCell className="text-right pr-10">
                             <Button variant="ghost" size="icon" asChild className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Link href={`/inventory?id=${p.id}`}><ChevronRight className="h-4 w-4" /></Link></Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* 4. PHASE 8: STOREFRONT SEO & SOCIAL SHARING TAB */}
        <TabsContent value="seo" className="space-y-8 animate-in fade-in text-left">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start text-left">
            {/* Left Column: Metadata & OpenGraph Inputs */}
            <div className="space-y-8 text-left">
              <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border text-left">
                <CardHeader className="bg-muted/30 border-b py-6 px-8 text-left">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-3">
                    <Sparkles className="h-5 w-5" /> 1. Search Engine Optimization (SEO)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6 text-left">
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Page Title Tag (Meta Title)</Label>
                      <span className={cn("text-[9px] font-mono font-bold", seoTitle.length > 60 ? "text-amber-600" : "text-slate-400")}>
                        {seoTitle.length}/60 chars
                      </span>
                    </div>
                    <Input 
                      value={seoTitle} 
                      onChange={(e) => setSeoTitle(e.target.value)} 
                      placeholder={storeName ? `${storeName} – Official Online Store` : "Brand Name – Online Store"}
                      className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner" 
                    />
                    <p className="text-[8px] font-bold text-muted-foreground uppercase px-1">Ideal length: 30-60 characters for maximum search visibility.</p>
                  </div>

                  <div className="space-y-2 text-left">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Meta Description</Label>
                      <span className={cn("text-[9px] font-mono font-bold", seoDescription.length > 160 ? "text-amber-600" : "text-slate-400")}>
                        {seoDescription.length}/160 chars
                      </span>
                    </div>
                    <Textarea 
                      value={seoDescription} 
                      onChange={(e) => setSeoDescription(e.target.value)} 
                      placeholder="Browse our official product catalog and order online with fast, secure delivery..." 
                      className="min-h-[90px] rounded-2xl bg-muted/20 border-none shadow-inner p-4 text-xs font-medium leading-relaxed" 
                    />
                    <p className="text-[8px] font-bold text-muted-foreground uppercase px-1">Ideal length: 120-160 characters. Appears directly in Google snippets.</p>
                  </div>

                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Search Keywords (Comma Separated)</Label>
                    <Input 
                      value={seoKeywords} 
                      onChange={(e) => setSeoKeywords(e.target.value)} 
                      placeholder="e.g. organic groceries, pure ghee, online delivery Mumbai" 
                      className="h-12 rounded-xl bg-muted/20 border-none shadow-inner text-xs font-medium" 
                    />
                  </div>

                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Store Favicon URL</Label>
                    <Input 
                      value={faviconUrl} 
                      onChange={(e) => setFaviconUrl(e.target.value)} 
                      placeholder="https://example.com/favicon.png" 
                      className="h-12 rounded-xl font-mono text-xs bg-muted/20 border-none shadow-inner" 
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border text-left">
                <CardHeader className="bg-blue-50/50 border-b py-6 px-8 text-left">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-blue-700 flex items-center gap-3">
                    <Globe className="h-5 w-5" /> 2. Social Sharing & Open Graph
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6 text-left">
                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Social Share Card Title (og:title)</Label>
                    <Input 
                      value={ogTitle} 
                      onChange={(e) => setOgTitle(e.target.value)} 
                      placeholder={seoTitle || storeName || "Brand Store"} 
                      className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner" 
                    />
                  </div>

                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Social Card Description (og:description)</Label>
                    <Textarea 
                      value={ogDescription} 
                      onChange={(e) => setOgDescription(e.target.value)} 
                      placeholder={seoDescription || "Check out our latest products and place orders online."} 
                      className="min-h-[80px] rounded-2xl bg-muted/20 border-none shadow-inner p-4 text-xs font-medium leading-relaxed" 
                    />
                  </div>

                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Social Share Image URL (1200x630 Recommended)</Label>
                    <Input 
                      value={ogImage} 
                      onChange={(e) => { setOgImage(e.target.value); setSocialShareImage(e.target.value); }} 
                      placeholder="https://example.com/images/store-banner.jpg" 
                      className="h-12 rounded-xl font-mono text-xs bg-muted/20 border-none shadow-inner" 
                    />
                    <p className="text-[8px] font-bold text-muted-foreground uppercase px-1">Displayed when sharing on WhatsApp, Facebook, LinkedIn, X.</p>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/20 p-6 border-t flex justify-end">
                  <Button 
                    onClick={() => handleSave(websiteData?.status || 'draft')}
                    disabled={isSaving || isPending}
                    className="h-11 text-[10px] font-black uppercase tracking-widest px-8 bg-primary text-white rounded-xl shadow-lg"
                  >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save SEO Settings
                  </Button>
                </CardFooter>
              </Card>

              <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border text-left">
                <CardHeader className="bg-slate-900 text-white border-b py-6 px-8 text-left">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-3">
                    <Activity className="h-5 w-5 text-accent" /> 3. Analytics Pixels & Search Verification
                  </CardTitle>
                  <p className="text-[10px] text-slate-300 mt-1">
                    Automatically inject Google Analytics 4 and Meta Pixel tags onto your live storefront.
                  </p>
                </CardHeader>
                <CardContent className="p-8 space-y-5 text-left">
                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">
                        Google Analytics 4 Measurement ID
                      </Label>
                      {trackingConfig.ga4MeasurementId && (
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase",
                            isValidGa4MeasurementId(trackingConfig.ga4MeasurementId)
                              ? "text-emerald-600"
                              : "text-amber-600"
                          )}
                        >
                          {isValidGa4MeasurementId(trackingConfig.ga4MeasurementId)
                            ? "Valid ID"
                            : "Use G-XXXXXXXXXX"}
                        </span>
                      )}
                    </div>
                    <Input
                      value={trackingConfig.ga4MeasurementId}
                      onChange={(e) =>
                        setTrackingConfig((prev) => ({
                          ...prev,
                          ga4MeasurementId: sanitizeGa4MeasurementId(e.target.value),
                        }))
                      }
                      placeholder="G-XXXXXXXXXX"
                      className="h-12 rounded-xl font-mono text-xs font-bold bg-muted/20 border-none shadow-inner uppercase"
                    />
                  </div>

                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">
                        Meta (Facebook) Pixel ID
                      </Label>
                      {trackingConfig.metaPixelId && (
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase",
                            isValidMetaPixelId(trackingConfig.metaPixelId)
                              ? "text-emerald-600"
                              : "text-amber-600"
                          )}
                        >
                          {isValidMetaPixelId(trackingConfig.metaPixelId)
                            ? "Valid Pixel"
                            : "Enter 10-20 digits"}
                        </span>
                      )}
                    </div>
                    <Input
                      value={trackingConfig.metaPixelId}
                      onChange={(e) =>
                        setTrackingConfig((prev) => ({
                          ...prev,
                          metaPixelId: sanitizeMetaPixelId(e.target.value),
                        }))
                      }
                      placeholder="123456789012345"
                      className="h-12 rounded-xl font-mono text-xs font-bold bg-muted/20 border-none shadow-inner"
                    />
                  </div>

                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">
                      Google Search Console Verification Code
                    </Label>
                    <Input
                      value={trackingConfig.googleSiteVerification}
                      onChange={(e) =>
                        setTrackingConfig((prev) => ({
                          ...prev,
                          googleSiteVerification: sanitizeGoogleSiteVerification(e.target.value),
                        }))
                      }
                      placeholder="Paste verification content token or full <meta> tag"
                      className="h-12 rounded-xl font-mono text-xs bg-muted/20 border-none shadow-inner"
                    />
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/20 p-6 border-t flex justify-end">
                  <Button
                    type="button"
                    onClick={() => handleSave(websiteData?.status || 'draft')}
                    disabled={isSaving || isPending}
                    className="h-11 text-[10px] font-black uppercase tracking-widest px-8 bg-slate-900 text-white rounded-xl shadow-lg"
                  >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Tracking & Pixels
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Right Column: Live Real-time Search & Social Simulators */}
            <div className="space-y-8 text-left">
              {/* Google Search Result Preview */}
              <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border text-left">
                <CardHeader className="bg-muted/30 border-b py-6 px-8 text-left">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-3">
                    <Search className="h-5 w-5 text-primary" /> Live Google Search Result Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-4 text-left">
                  <div className="p-6 rounded-2xl bg-white border shadow-sm font-sans space-y-1.5 text-left">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                        {faviconUrl ? <img src={faviconUrl} alt="" className="h-4 w-4 rounded-full" /> : <Globe className="h-3 w-3 text-primary" />}
                      </div>
                      <span className="font-mono text-[11px] text-slate-800 truncate">
                        https://{customDomain || (slug ? `${slug}.biztrix.in` : "mystore.biztrix.in")}/shop
                      </span>
                    </div>
                    <h3 className="text-base text-blue-700 hover:underline cursor-pointer font-medium line-clamp-1 leading-snug">
                      {seoTitle || (storeName ? `${storeName} – Official Online Store` : "Online Store – Shop Genuine Products")}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {seoDescription || "Browse our official product catalog and order online with fast, secure delivery and verified payment."}
                    </p>
                  </div>
                  <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider text-center">
                    Rendered dynamically for Google, Bing, and Search Engine Crawlers
                  </p>
                </CardContent>
              </Card>

              {/* Social Media Share Preview (WhatsApp / Facebook Card) */}
              <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border text-left">
                <CardHeader className="bg-emerald-50/50 border-b py-6 px-8 text-left">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-800 flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-emerald-600" /> WhatsApp & Social Card Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-4 text-left">
                  <div className="rounded-2xl border overflow-hidden bg-slate-50 shadow-sm max-w-sm mx-auto text-left">
                    <div className="aspect-[1.91/1] bg-slate-200 relative overflow-hidden flex items-center justify-center">
                      {ogImage ? (
                        <img src={ogImage} alt="Social Preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                          <ImageIcon className="h-10 w-10 opacity-30 mb-2" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">No Social Image Provided</span>
                          <span className="text-[8px] opacity-60">Add a 1200x630 banner URL for best presentation</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 bg-white space-y-1 text-left">
                      <p className="text-[9px] font-mono uppercase text-slate-400">
                        {customDomain || (slug ? `${slug}.biztrix.in` : "biztrix.in")}
                      </p>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1 leading-snug">
                        {ogTitle || seoTitle || storeName || "Store Official Page"}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {ogDescription || seoDescription || "Browse catalog and place orders directly with the merchant."}
                      </p>
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider text-center">
                    Accurate representation when shared on WhatsApp, Facebook, iMessage, and X
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 5. SETTINGS / CORE CONFIG TAB: Preserves all Identity, Ordering Sync & Phase 4A Custom Domain Controls */}
        <TabsContent value="settings" className="space-y-8 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start text-left">
            <div className="space-y-10">
               <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border text-left">
                <CardHeader className="bg-muted/30 border-b py-6 px-8 text-left">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-3">
                    <Building2 className="h-5 w-5" /> 1. Store Public Identity
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8 text-left">
                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Store Front Display Name</Label>
                    <Input value={storeName || ""} onChange={(e) => setStoreName(e.target.value)} className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner" />
                  </div>
                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-primary ml-1 tracking-widest flex items-center gap-2">
                      <Globe className="h-4 w-4" /> Store Subdomain (Slug)
                    </Label>
                    <div className="flex gap-2">
                      <Input 
                        value={slug} 
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} 
                        placeholder="e.g. your-brand" 
                        className="h-12 rounded-xl font-black bg-muted/20 border-none shadow-inner flex-1" 
                      />
                      <div className="h-12 px-4 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-400">.biztrix.in</div>
                    </div>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase px-1">This defines your public URL: {slug || '...'}.biztrix.in</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Customer Support Email</Label>
                      <Input value={contactEmail || ""} onChange={(e) => setContactEmail(e.target.value.toLowerCase())} placeholder="support@brand.com" className="h-12 rounded-xl bg-muted/20 border-none shadow-inner" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Public Contact Node</Label>
                      <Input value={contactPhone || ""} onChange={(e) => setContactPhone(e.target.value)} className="h-12 rounded-xl bg-muted/20 border-none shadow-inner" />
                    </div>
                  </div>
                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Official Address Registry</Label>
                    <Textarea value={storeAddress || ""} onChange={(e) => setStoreAddress(e.target.value)} className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner p-5 text-sm" />
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 p-6 border-t flex justify-end">
                  <Button 
                    onClick={() => handleSave(websiteData?.status || 'draft')}
                    disabled={isSaving || isPending}
                    className="h-10 text-[10px] font-black uppercase tracking-widest px-6 bg-primary text-white"
                  >
                    {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
                    Save Identity
                  </Button>
                </CardFooter>
              </Card>

              {/* 3. Custom Domain (Phase 4A) */}
              <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border text-left">
                <CardHeader className="bg-blue-50 border-b py-6 px-8 text-left flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-blue-700 flex items-center gap-3">
                    <Lock className="h-5 w-5" /> 3. Custom Domain (Phase 4A)
                  </CardTitle>
                  <Button asChild variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase text-blue-700">
                    <Link href="/website/domains">DNS Hub <ChevronRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-8 space-y-6 text-left">
                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Enter your custom domain</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={customDomain} 
                        onChange={(e) => setCustomDomain(e.target.value.toLowerCase())} 
                        placeholder="e.g. yourbrand.com" 
                        className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner flex-1"
                        disabled={isPending}
                      />
                    </div>
                     <p className="text-[8px] font-bold text-muted-foreground uppercase px-1">Do not include http:// or https://</p>
                  </div>

                  {websiteData?.customDomain && (
                    <div className="p-4 bg-muted/40 rounded-xl border border-dashed space-y-3">
                      <div className="flex items-center justify-between">
                         <p className="text-xs font-bold uppercase text-slate-600">Current Domain: <span className="text-primary">{websiteData.customDomain}</span></p>
                         <Badge className={cn(
                           "text-[8px] uppercase font-black",
                           websiteData.customDomainStatus === 'pending' && "bg-orange-100 text-orange-700",
                           websiteData.customDomainStatus === 'active' && "bg-green-100 text-green-700",
                         )}>
                           {websiteData.customDomainStatus}
                         </Badge>
                      </div>
                      {websiteData.customDomainStatus === 'pending' && (
                         <div className="text-xs text-slate-500 bg-white p-3 rounded-lg border">
                           <p className="font-bold mb-2 text-primary">Action Required:</p>
                           <p>To verify your domain, create a CNAME record in your DNS provider settings pointing to <code className="text-xs bg-muted p-1 rounded-md font-mono">cname.biztrix.in</code>.</p>
                           <p className="mt-2 text-[10px] italic">Verification is automatic but may take up to 24 hours. The real provisioning is pending and will be implemented in the next phase.</p>
                         </div>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="bg-muted/30 p-4 border-t flex justify-end gap-2">
                   {websiteData?.customDomain && (
                     <Button variant="destructive" onClick={handleRemoveCustomDomain} disabled={isPending} className="text-xs h-9">
                       {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                       Remove
                     </Button>
                   )}
                   <Button onClick={handleSaveCustomDomain} disabled={isPending} className="text-xs h-9">
                     {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                     Save Domain
                   </Button>
                </CardFooter>
              </Card>

              {/* 4. Store Policies & Buyer Trust */}
              <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border text-left">
                <CardHeader className="bg-slate-50 border-b py-6 px-8 text-left">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" /> 4. Store Policies & Support Hours
                  </CardTitle>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                    Shown in your storefront footer & buyer trust modal.
                  </p>
                </CardHeader>
                <CardContent className="p-8 space-y-5 text-left">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">
                      Customer Support Hours
                    </Label>
                    <Input
                      value={policyConfig.supportHours}
                      onChange={(e) =>
                        setPolicyConfig((prev) => ({ ...prev, supportHours: e.target.value }))
                      }
                      placeholder="Mon - Sat, 10:00 AM - 7:00 PM IST"
                      className="h-11 rounded-xl font-bold text-xs bg-muted/20 border-none shadow-inner"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">
                      Shipping & Dispatch Policy
                    </Label>
                    <Textarea
                      value={policyConfig.shippingPolicy}
                      onChange={(e) =>
                        setPolicyConfig((prev) => ({ ...prev, shippingPolicy: e.target.value }))
                      }
                      className="min-h-[80px] rounded-2xl bg-muted/20 border-none shadow-inner p-3.5 text-xs leading-relaxed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">
                      Returns & Refund Policy
                    </Label>
                    <Textarea
                      value={policyConfig.returnPolicy}
                      onChange={(e) =>
                        setPolicyConfig((prev) => ({ ...prev, returnPolicy: e.target.value }))
                      }
                      className="min-h-[80px] rounded-2xl bg-muted/20 border-none shadow-inner p-3.5 text-xs leading-relaxed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">
                      Privacy & Terms Notice
                    </Label>
                    <Textarea
                      value={policyConfig.privacyPolicy}
                      onChange={(e) =>
                        setPolicyConfig((prev) => ({ ...prev, privacyPolicy: e.target.value }))
                      }
                      className="min-h-[80px] rounded-2xl bg-muted/20 border-none shadow-inner p-3.5 text-xs leading-relaxed"
                    />
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 p-6 border-t flex justify-end">
                  <Button
                    type="button"
                    onClick={() => handleSave(websiteData?.status || 'draft')}
                    disabled={isSaving || isPending}
                    className="h-10 text-[10px] font-black uppercase tracking-widest px-6 bg-slate-900 text-white"
                  >
                    {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
                    Save Store Policies
                  </Button>
                </CardFooter>
              </Card>
            </div>

            <div className="space-y-10">
              <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border text-left">
                <CardHeader className="bg-green-50 border-b py-6 px-8 text-left">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-green-700 flex items-center gap-3">
                    <SmartphoneNfc className="h-5 w-5" /> 2. Ordering & Logic Sync
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6 text-left">
                  <div className="flex items-center justify-between p-6 bg-green-100/30 rounded-[2rem] border border-green-100 shadow-sm transition-all group hover:bg-green-100/50">
                    <div className="space-y-1.5 text-left">
                      <Label className="text-sm font-black text-green-900 flex items-center gap-2 uppercase tracking-tight">
                        <MessageSquare className="h-4 w-4" /> WhatsApp Checkout Node
                      </Label>
                      <p className="text-[9px] text-green-700/70 font-bold uppercase tracking-widest">Orders are transmitted to your business WA</p>
                    </div>
                    <Switch checked={whatsappOrderEnabled} onCheckedChange={setWhatsappOrderEnabled} className="scale-110 data-[state=checked]:bg-green-600 shadow-lg" />
                  </div>

                  <div className="flex items-center justify-between p-6 bg-amber-50/60 rounded-[2rem] border border-amber-100 shadow-sm transition-all group hover:bg-amber-50">
                    <div className="space-y-1.5 text-left">
                      <Label className="text-sm font-black text-amber-900 flex items-center gap-2 uppercase tracking-tight">
                        <Banknote className="h-4 w-4" /> Cash on Delivery (COD)
                      </Label>
                      <p className="text-[9px] text-amber-700/70 font-bold uppercase tracking-widest">Allow shoppers to place COD orders on storefront</p>
                    </div>
                    <Switch checked={codEnabled} onCheckedChange={setCodEnabled} className="scale-110 data-[state=checked]:bg-amber-600 shadow-lg" />
                  </div>

                  <div className="flex items-center justify-between p-6 bg-primary/5 rounded-[2rem] border border-primary/10 transition-all group hover:bg-primary/10">
                    <div className="space-y-1.5 text-left">
                      <Label className="text-sm font-black text-primary flex items-center gap-2 uppercase tracking-tight">
                        <Percent className="h-4 w-4" /> Transparent Discounts
                      </Label>
                      <p className="text-[9px] font-bold text-primary/40 uppercase tracking-widest">Show strike-through pricing and % saved</p>
                    </div>
                    <Switch checked={showDiscount} onCheckedChange={setShowDiscount} className="scale-110 data-[state=checked]:bg-primary shadow-lg" />
                  </div>

                  <Separator className="opacity-50" />

                  {/* Shipping & COD Fee Rules */}
                  <div className="space-y-4 text-left">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-primary" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">
                        Shipping & COD Handling Rules
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">
                          Shipping Fee ({currencySymbol})
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={shippingConfig.shippingFee}
                          onChange={(e) =>
                            setShippingConfig((prev) => ({
                              ...prev,
                              shippingFee: Math.max(0, Number(e.target.value) || 0),
                            }))
                          }
                          className="h-11 rounded-xl font-black bg-muted/20 border-none shadow-inner"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">
                          Free Above ({currencySymbol})
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={shippingConfig.freeShippingThreshold}
                          onChange={(e) =>
                            setShippingConfig((prev) => ({
                              ...prev,
                              freeShippingThreshold: Math.max(0, Number(e.target.value) || 0),
                            }))
                          }
                          className="h-11 rounded-xl font-black bg-muted/20 border-none shadow-inner"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">
                          COD Extra Fee ({currencySymbol})
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={shippingConfig.codFee}
                          onChange={(e) =>
                            setShippingConfig((prev) => ({
                              ...prev,
                              codFee: Math.max(0, Number(e.target.value) || 0),
                            }))
                          }
                          className="h-11 rounded-xl font-black bg-muted/20 border-none shadow-inner"
                        />
                      </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground font-semibold">
                      Set &ldquo;Free Above&rdquo; to show a live Free Delivery Progress Bar in the customer&apos;s shopping bag. Leave 0 for free shipping on all orders.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 p-6 border-t flex justify-end">
                  <Button
                    type="button"
                    onClick={() => handleSave(websiteData?.status || 'draft')}
                    disabled={isSaving || isPending}
                    className="h-10 text-[10px] font-black uppercase tracking-widest px-6 bg-primary text-white"
                  >
                    {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
                    Save Ordering & Shipping
                  </Button>
                </CardFooter>
              </Card>

              {/* Promo Coupon Codes Manager */}
              <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border text-left">
                <CardHeader className="bg-purple-50/70 border-b py-6 px-8 flex flex-row items-center justify-between text-left">
                  <div>
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-purple-800 flex items-center gap-3">
                      <Ticket className="h-5 w-5 text-purple-600" /> 4. Promo Coupons & Offers
                    </CardTitle>
                    <p className="text-[9px] font-bold text-purple-700/70 uppercase mt-1">
                      Create checkout discount codes validated securely on the server
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-white border-purple-200 text-purple-700 font-black text-[9px] uppercase">
                    {coupons.filter((c) => c.active).length} Active
                  </Badge>
                </CardHeader>
                <CardContent className="p-8 space-y-6 text-left">
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground">
                          Coupon Code *
                        </Label>
                        <Input
                          value={newCouponCode}
                          onChange={(e) => setNewCouponCode(sanitizeCouponCode(e.target.value))}
                          placeholder="e.g. WELCOME10"
                          className="h-10 rounded-xl bg-white font-mono font-black uppercase"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground">
                          Discount Type
                        </Label>
                        <Select
                          value={newCouponType}
                          onValueChange={(v) => setNewCouponType(v as StoreCouponDiscountType)}
                        >
                          <SelectTrigger className="h-10 rounded-xl bg-white text-xs font-bold uppercase">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">Percentage (% OFF)</SelectItem>
                            <SelectItem value="flat">Flat Amount ({currencySymbol} OFF)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground">
                          Value ({newCouponType === "percent" ? "%" : currencySymbol})
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          value={newCouponValue}
                          onChange={(e) => setNewCouponValue(e.target.value)}
                          className="h-10 rounded-xl bg-white font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground">
                          Min Order ({currencySymbol})
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={newCouponMinOrder}
                          onChange={(e) => setNewCouponMinOrder(e.target.value)}
                          className="h-10 rounded-xl bg-white font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground">
                          Max Cap ({currencySymbol})
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Optional"
                          disabled={newCouponType === "flat"}
                          value={newCouponMaxDiscount}
                          onChange={(e) => setNewCouponMaxDiscount(e.target.value)}
                          className="h-10 rounded-xl bg-white font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground">
                          Expiry Date
                        </Label>
                        <Input
                          type="date"
                          value={newCouponExpiry}
                          onChange={(e) => setNewCouponExpiry(e.target.value)}
                          className="h-10 rounded-xl bg-white text-xs font-bold"
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const clean = sanitizeCouponCode(newCouponCode);
                        const val = Math.max(0, Number(newCouponValue) || 0);
                        if (!clean || val <= 0) {
                          toast({
                            variant: "destructive",
                            title: "Invalid Coupon",
                            description: "Enter a valid coupon code and positive discount value.",
                          });
                          return;
                        }
                        if (coupons.some((c) => c.code === clean)) {
                          toast({
                            variant: "destructive",
                            title: "Duplicate Code",
                            description: `Coupon "${clean}" already exists.`,
                          });
                          return;
                        }
                        const created: StoreCoupon = {
                          id: `cpn_${Date.now()}`,
                          code: clean,
                          discountType: newCouponType,
                          discountValue: newCouponType === "percent" ? Math.min(100, val) : val,
                          minOrderAmount: Math.max(0, Number(newCouponMinOrder) || 0),
                          ...(newCouponType === "percent" && Number(newCouponMaxDiscount) > 0
                            ? { maxDiscount: Number(newCouponMaxDiscount) }
                            : {}),
                          ...(newCouponExpiry ? { expiresAt: newCouponExpiry } : {}),
                          active: true,
                        };
                        setCoupons((prev) => [created, ...prev]);
                        setNewCouponCode("");
                        setNewCouponMaxDiscount("");
                        setNewCouponExpiry("");
                        toast({
                          title: "Coupon Added",
                          description: `Click "Save Coupons" to push ${clean} live to your storefront.`,
                        });
                      }}
                      className="w-full h-10 rounded-xl border-purple-200 bg-white text-purple-800 hover:bg-purple-50 text-[10px] font-black uppercase tracking-wider"
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Coupon to Storefront
                    </Button>
                  </div>

                  {coupons.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground italic border border-dashed rounded-2xl">
                      No promo coupons configured yet. Add your first code above (e.g. WELCOME10).
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {coupons.map((cpn) => (
                        <div
                          key={cpn.id}
                          className="p-4 rounded-2xl border bg-white flex items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5 text-left min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-black text-xs text-slate-900 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-lg">
                                {cpn.code}
                              </span>
                              <Badge className="bg-emerald-50 text-emerald-700 border-none text-[9px] font-black">
                                {cpn.discountType === "percent"
                                  ? `${cpn.discountValue}% OFF`
                                  : `${currencySymbol}${cpn.discountValue} OFF`}
                              </Badge>
                              {cpn.minOrderAmount > 0 && (
                                <span className="text-[10px] text-muted-foreground font-bold">
                                  Min {currencySymbol}{cpn.minOrderAmount}
                                </span>
                              )}
                              {cpn.maxDiscount && (
                                <span className="text-[10px] text-muted-foreground font-bold">
                                  Cap {currencySymbol}{cpn.maxDiscount}
                                </span>
                              )}
                              {cpn.expiresAt && (
                                <span className="text-[10px] text-amber-700 font-bold">
                                  Exp {cpn.expiresAt}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Switch
                              checked={cpn.active}
                              onCheckedChange={(checked) =>
                                setCoupons((prev) =>
                                  prev.map((item) =>
                                    item.id === cpn.id ? { ...item, active: checked } : item
                                  )
                                )
                              }
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete coupon ${cpn.code}`}
                              onClick={() =>
                                setCoupons((prev) => prev.filter((item) => item.id !== cpn.id))
                              }
                              className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-xl"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="bg-muted/30 p-6 border-t flex justify-end">
                  <Button
                    type="button"
                    onClick={() => handleSave(websiteData?.status || 'draft')}
                    disabled={isSaving || isPending}
                    className="h-10 text-[10px] font-black uppercase tracking-widest px-6 bg-purple-700 hover:bg-purple-800 text-white"
                  >
                    {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
                    Save Coupons & Rules
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>

      </Tabs>

      {/* Store Integrity & Deployment Readiness Audit Modal */}
      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl bg-white text-left">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Store Readiness Audit ({integrityReport.score}%)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Real-time verification of your storefront identity, catalog, checkout channels, and SEO metadata.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {integrityReport.checks.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "p-3.5 rounded-2xl border flex items-start justify-between gap-3",
                  item.passed
                    ? "bg-emerald-50/50 border-emerald-200"
                    : "bg-amber-50/50 border-amber-200"
                )}
              >
                <div className="flex items-start gap-2.5 text-left">
                  {item.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <p className="text-xs font-black uppercase text-slate-900">
                      {item.label} <span className="text-[10px] font-mono text-muted-foreground">({item.weight} pts)</span>
                    </p>
                    <p className="text-[11px] text-slate-600 leading-snug">{item.detail}</p>
                  </div>
                </div>
                {!item.passed && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setActiveTab(item.targetTab);
                      setAuditOpen(false);
                    }}
                    className="h-8 text-[9px] font-black uppercase rounded-xl shrink-0 border-amber-300 text-amber-900 hover:bg-amber-100"
                  >
                    Fix Now
                  </Button>
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAuditOpen(false)}
              className="rounded-xl text-xs font-black uppercase"
            >
              Close
            </Button>
            <Button asChild className="rounded-xl text-xs font-black uppercase bg-primary text-white">
              <Link href={previewStoreUrl} target="_blank">
                Open Live Preview <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
