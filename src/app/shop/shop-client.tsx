"use client";

import { useState, useMemo, useEffect } from "react";
import Script from "next/script";
import {
  Search,
  ShoppingBag,
  MessageCircle,
  MapPin,
  Clock,
  Star,
  ArrowRight,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  Eye,
  ImageIcon,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  Zap,
  Info,
  BadgeCheck,
  User,
  Smartphone,
  Mail,
  Share2,
  Flame,
  AlertTriangle,
  Phone,
  Package,
  Banknote,
  CreditCard,
  Quote,
  Ticket,
  Truck,
  PackageCheck,
  ArrowUpDown,
  SlidersHorizontal,
  Instagram,
  Facebook,
  Youtube,
  ShieldCheck,
  Heart,
  FileText,
  History,
  LayoutGrid,
  PlayCircle,
  HelpCircle,
  ChevronDown,
  BellRing,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useDoc,
  useUser,
} from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import {
  createStorefrontOrder,
  StorePaymentMethod,
  subscribeStorefrontLead,
  trackStorefrontOrder,
  validateStorefrontCoupon,
} from "@/app/actions/storefront-actions";
import { trackStorefrontEvent } from "@/lib/storefront-tracking";
import { ProductSeoData, StorefrontSeoData } from "@/lib/storefront-seo";
import {
  buildGoogleMapsPlaceUrl,
  buildWhatsAppUrl,
  computeFreeShippingProgress,
  computeStoreOrderPricing,
  DEFAULT_FAQ_ITEMS,
  DEFAULT_TRUST_ITEMS,
  deriveStorefrontCategorySummaries,
  evaluateCouponDiscount,
  extractYouTubeVideoId,
  getProductGalleryImages,
  getStoreFontFamilies,
  isValidGa4MeasurementId,
  isValidMetaPixelId,
  matchesTrackOrderQuery,
  normalizeAnnouncementBar,
  normalizeFooterConfig,
  normalizeStoreCoupons,
  normalizeStorePolicyConfig,
  normalizeStoreSections,
  normalizeStoreShippingConfig,
  normalizeStoreThemeConfig,
  normalizeStoreTrackingConfig,
  reconcilePersistedCart,
  resolveMerchantWhatsAppPhone,
  sanitizeCouponCode,
  sortAndFilterStoreProducts,
  StoreSection,
  StoreSortOption,
  StoreUiStyle,
  toggleWishlistId,
  TrackedOrderSummary,
  updateRecentlyViewedIds,
} from "@/lib/storefront-engine";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  sku?: string;
}

interface ShopClientProps {
  initialBusiness: any;
  businessId: string | null;
  initialProductId?: string | null;
  initialSeoData?: StorefrontSeoData | null;
  initialProducts?: ProductSeoData[];
  isPreview?: boolean;
}

const LOCAL_STORAGE_KEY_CUSTOMER = "biztrix_checkout_customer";

function openExternalSafe(url: string) {
  if (typeof document === "undefined") return;
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function ShopClient({
  initialBusiness,
  businessId,
  initialProductId,
  initialSeoData,
  initialProducts = [],
  isPreview = false,
}: ShopClientProps) {
  const firestore = useFirestore();
  const { user } = useUser();

  // 1. Fetch Store Configuration Document
  const websiteRef = useMemoFirebase(
    () =>
      businessId ? doc(firestore, "businesses", businessId, "websites", "main") : null,
    [firestore, businessId]
  );
  const { data: websiteData } = useDoc<any>(websiteRef);

  // 2. Fetch Real-time Public Catalog (strictly filtered by showOnWebsite == true per Firestore security rules)
  const productsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "products"),
            where("showOnWebsite", "==", true)
          )
        : null,
    [firestore, businessId]
  );
  const { data: dbProducts, isLoading: isProductsLoading } = useCollection<any>(productsQuery);

  const catalogProducts = useMemo(() => {
    const source =
      !isProductsLoading && Array.isArray(dbProducts)
        ? dbProducts
        : initialProducts.length > 0
          ? initialProducts
          : dbProducts || [];
    return (source || []).filter((p: any) => p.showOnWebsite && !p.isArchived);
  }, [dbProducts, isProductsLoading, initialProducts]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<StoreSortOption>("featured");
  const [inStockOnly, setInStockOnly] = useState(false);

  // UI & Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    initialProductId || null
  );
  const [activeGalleryIdx, setActiveGalleryIdx] = useState(0);
  const [brokenImageUrls, setBrokenImageUrls] = useState<Record<string, boolean>>({});
  const [isAnnouncementDismissed, setIsAnnouncementDismissed] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Phase 3 Retention & Policy Modals State
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [recentProductIds, setRecentProductIds] = useState<string[]>([]);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [policyModalTab, setPolicyModalTab] = useState<"shipping" | "return" | "privacy" | null>(null);
  const [isCartHydrated, setIsCartHydrated] = useState(false);
  const [isRetentionHydrated, setIsRetentionHydrated] = useState(false);

  // Promo Coupon State
  const [couponInput, setCouponInput] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Track Order Modal State
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackOrderIdInput, setTrackOrderIdInput] = useState("");
  const [trackPhoneInput, setTrackPhoneInput] = useState("");
  const [isTrackingOrder, setIsTrackingOrder] = useState(false);
  const [trackOrderError, setTrackOrderError] = useState<string | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrderSummary | null>(null);

  // Checkout Process State
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "info" | "success">("cart");
  const [paymentMethod, setPaymentMethod] = useState<StorePaymentMethod>("ONLINE");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const [confirmedPaymentLabel, setConfirmedPaymentLabel] = useState<string>("");
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  // Phase 4 Interactive Sections State (FAQ Accordion, Offers, VIP Deal Alerts)
  const [openFaqKey, setOpenFaqKey] = useState<string | null>(null);
  const [copiedOfferCode, setCopiedOfferCode] = useState<string | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadContact, setLeadContact] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadFeedback, setLeadFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Resolved Brand & Layout Settings
  const primaryColor =
    websiteData?.primaryColor || initialSeoData?.primaryColor || "#0C83B3";
  const uiStyle: StoreUiStyle = (websiteData?.uiStyle ||
    initialSeoData?.uiStyle ||
    initialBusiness?.websiteConfig?.uiStyle ||
    "modern") as StoreUiStyle;
  const storeDisplayName =
    websiteData?.storeName ||
    initialSeoData?.storeName ||
    initialBusiness?.name ||
    "Online Store";
  const logoUrl =
    websiteData?.logoUrl ||
    initialSeoData?.logoUrl ||
    initialBusiness?.logoUrl ||
    "";
  const currencySymbol = getCurrencySymbol(initialBusiness?.currency);
  const whatsappOrderEnabled =
    websiteData?.whatsappOrderEnabled ??
    initialSeoData?.whatsappOrderEnabled ??
    true;
  const codEnabled =
    websiteData?.codEnabled ??
    initialSeoData?.codEnabled ??
    initialBusiness?.websiteConfig?.codEnabled ??
    true;
  const showDiscount =
    websiteData?.showDiscount ?? initialSeoData?.showDiscount ?? true;

  const merchantPhoneDisplay =
    websiteData?.contactPhone ||
    initialSeoData?.contactPhone ||
    initialBusiness?.phone ||
    "";
  const merchantEmailDisplay =
    websiteData?.contactEmail ||
    initialSeoData?.contactEmail ||
    initialBusiness?.email ||
    "";
  const merchantAddressDisplay =
    websiteData?.storeAddress ||
    initialSeoData?.storeAddress ||
    initialBusiness?.address ||
    "Official Business Location";

  const merchantWaDigits = useMemo(
    () =>
      resolveMerchantWhatsAppPhone({
        contactPhone: websiteData?.contactPhone || initialSeoData?.contactPhone,
        businessPhone: initialBusiness?.phone,
      }),
    [websiteData?.contactPhone, initialSeoData?.contactPhone, initialBusiness?.phone]
  );

  const activeSections = useMemo(() => {
    const raw =
      websiteData?.sections ??
      initialSeoData?.sections ??
      initialBusiness?.websiteConfig?.sections;
    return normalizeStoreSections(raw).filter((s) => s.status === "Active");
  }, [
    websiteData?.sections,
    initialSeoData?.sections,
    initialBusiness?.websiteConfig?.sections,
  ]);

  const storeCoupons = useMemo(
    () => normalizeStoreCoupons(websiteData?.coupons ?? initialSeoData?.coupons),
    [websiteData?.coupons, initialSeoData?.coupons]
  );

  const shippingConfig = useMemo(
    () =>
      normalizeStoreShippingConfig(
        websiteData?.shippingConfig ?? initialSeoData?.shippingConfig
      ),
    [websiteData?.shippingConfig, initialSeoData?.shippingConfig]
  );

  const themeConfig = useMemo(
    () =>
      normalizeStoreThemeConfig(
        websiteData?.themeConfig ?? initialSeoData?.themeConfig,
        uiStyle
      ),
    [websiteData?.themeConfig, initialSeoData?.themeConfig, uiStyle]
  );

  const announcementBar = useMemo(
    () =>
      normalizeAnnouncementBar(
        websiteData?.announcementBar ?? initialSeoData?.announcementBar
      ),
    [websiteData?.announcementBar, initialSeoData?.announcementBar]
  );

  const footerConfig = useMemo(
    () =>
      normalizeFooterConfig(
        websiteData?.footerConfig ?? initialSeoData?.footerConfig
      ),
    [websiteData?.footerConfig, initialSeoData?.footerConfig]
  );

  const trackingConfig = useMemo(
    () =>
      normalizeStoreTrackingConfig(
        websiteData?.trackingConfig ?? initialSeoData?.trackingConfig
      ),
    [websiteData?.trackingConfig, initialSeoData?.trackingConfig]
  );

  const policyConfig = useMemo(
    () =>
      normalizeStorePolicyConfig(
        websiteData?.policyConfig ?? initialSeoData?.policyConfig
      ),
    [websiteData?.policyConfig, initialSeoData?.policyConfig]
  );

  const storeFonts = useMemo(
    () => getStoreFontFamilies(themeConfig.fontPair),
    [themeConfig.fontPair]
  );

  const isDarkSurface = themeConfig.themeSurface === "charcoal";
  const isWarmSurface = themeConfig.themeSurface === "warm_paper";

  const markImageBroken = (url?: string) => {
    if (!url) return;
    setBrokenImageUrls((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  };

  const hasTimerSection = useMemo(
    () => activeSections.some((s) => s.type === "timer"),
    [activeSections]
  );

  const [countdownText, setCountdownText] = useState("05h : 42m : 18s");

  useEffect(() => {
    if (!hasTimerSection) return;
    const updateClock = () => {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const diffSec = Math.max(0, Math.floor((endOfDay.getTime() - now.getTime()) / 1000));
      const hrs = String(Math.floor(diffSec / 3600)).padStart(2, "0");
      const mins = String(Math.floor((diffSec % 3600) / 60)).padStart(2, "0");
      const secs = String(diffSec % 60).padStart(2, "0");
      setCountdownText(`${hrs}h : ${mins}m : ${secs}s`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [hasTimerSection]);

  // Load saved customer info from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_CUSTOMER);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCustomerInfo((prev) => ({
          ...prev,
          name: parsed.name || prev.name,
          phone: parsed.phone || prev.phone,
          email: parsed.email || prev.email,
          address: parsed.address || prev.address,
        }));
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
    }
  }, [initialProductId]);

  useEffect(() => {
    setActiveGalleryIdx(0);
  }, [selectedProductId]);

  const categories = useMemo(() => {
    const base = ["All"];
    const fromProducts = Array.from(
      new Set(
        catalogProducts
          .filter((p: any) => p.category)
          .map((p: any) => p.category)
      )
    );
    return [...base, ...fromProducts];
  }, [catalogProducts]);

  const filteredProducts = useMemo(() => {
    return sortAndFilterStoreProducts(catalogProducts, {
      searchQuery,
      category: selectedCategory,
      inStockOnly,
      sortBy,
    });
  }, [catalogProducts, searchQuery, selectedCategory, inStockOnly, sortBy]);

  const featuredProducts = useMemo(() => {
    const flagged = catalogProducts.filter((p: any) => p.isFeatured || p.isBestSeller);
    return flagged.length > 0 ? flagged : catalogProducts.slice(0, 4);
  }, [catalogProducts]);

  const viewingProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return catalogProducts.find((p: any) => p.id === selectedProductId) || null;
  }, [selectedProductId, catalogProducts]);

  // Hydrate Wishlist & Recently Viewed per tenant
  useEffect(() => {
    if (!businessId || typeof window === "undefined") return;
    try {
      const savedWish = localStorage.getItem(`biztrix_wishlist_${businessId}`);
      if (savedWish) {
        const parsedWish = JSON.parse(savedWish);
        if (Array.isArray(parsedWish)) setWishlistIds(parsedWish.map(String));
      }
      const savedRecent = localStorage.getItem(`biztrix_recent_${businessId}`);
      if (savedRecent) {
        const parsedRecent = JSON.parse(savedRecent);
        if (Array.isArray(parsedRecent)) setRecentProductIds(parsedRecent.map(String));
      }
    } catch {
      // Ignore storage read errors
    } finally {
      setIsRetentionHydrated(true);
    }
  }, [businessId]);

  useEffect(() => {
    if (!businessId || !isRetentionHydrated || typeof window === "undefined") return;
    try {
      localStorage.setItem(`biztrix_wishlist_${businessId}`, JSON.stringify(wishlistIds));
    } catch {
      // Ignore storage write errors
    }
  }, [businessId, isRetentionHydrated, wishlistIds]);

  useEffect(() => {
    if (!businessId || !isRetentionHydrated || typeof window === "undefined") return;
    try {
      localStorage.setItem(`biztrix_recent_${businessId}`, JSON.stringify(recentProductIds));
    } catch {
      // Ignore storage write errors
    }
  }, [businessId, isRetentionHydrated, recentProductIds]);

  // Hydrate Persistent Bag as soon as catalog is available (works with SSR initialProducts too)
  useEffect(() => {
    if (!businessId || isCartHydrated || catalogProducts.length === 0) return;
    try {
      const rawCart = localStorage.getItem(`biztrix_cart_${businessId}`);
      if (rawCart) {
        const parsed = JSON.parse(rawCart);
        const reconciled = reconcilePersistedCart<CartItem>(parsed, catalogProducts);
        if (reconciled.length > 0) {
          setCart((prev) => (prev.length > 0 ? prev : reconciled));
        }
      }
    } catch {
      // Ignore storage read errors
    } finally {
      setIsCartHydrated(true);
    }
  }, [businessId, isCartHydrated, catalogProducts]);

  // Persist Bag changes per tenant
  useEffect(() => {
    if (!businessId || !isCartHydrated || typeof window === "undefined") return;
    try {
      localStorage.setItem(`biztrix_cart_${businessId}`, JSON.stringify(cart));
    } catch {
      // Ignore storage write errors
    }
  }, [businessId, isCartHydrated, cart]);

  const wishlistProducts = useMemo(() => {
    if (wishlistIds.length === 0) return [];
    const byId = new Map(catalogProducts.map((p: any) => [String(p.id), p]));
    return wishlistIds.map((id) => byId.get(id)).filter(Boolean) as any[];
  }, [wishlistIds, catalogProducts]);

  const recentlyViewedProducts = useMemo(() => {
    if (recentProductIds.length === 0) return [];
    const byId = new Map(catalogProducts.map((p: any) => [String(p.id), p]));
    return recentProductIds
      .filter((id) => id !== selectedProductId)
      .map((id) => byId.get(id))
      .filter(Boolean)
      .slice(0, 4) as any[];
  }, [recentProductIds, catalogProducts, selectedProductId]);

  const handleToggleWishlist = (product: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!product?.id) return;
    const isAlreadySaved = wishlistIds.includes(product.id);
    setWishlistIds((prev) => toggleWishlistId(prev, product.id));
    toast({
      title: isAlreadySaved ? "Removed from Saved" : "Saved to Wishlist",
      description: isAlreadySaved
        ? `${product.name} removed from your saved list.`
        : `${product.name} bookmarked for quick checkout.`,
    });
  };

  // Track product view + record in Recently Viewed when product modal opens
  useEffect(() => {
    if (viewingProduct && businessId) {
      setRecentProductIds((prev) => updateRecentlyViewedIds(prev, viewingProduct.id, 6));
      trackStorefrontEvent({
        businessId,
        eventName: "product_view",
        data: {
          id: viewingProduct.id,
          name: viewingProduct.name,
          price: viewingProduct.onlinePrice ?? viewingProduct.price ?? 0,
          currency: initialBusiness?.currency || "INR",
          category: viewingProduct.category || "General",
        },
      });
    }
  }, [viewingProduct?.id, businessId, initialBusiness?.currency]);

  // Track initial storefront view on mount
  useEffect(() => {
    if (businessId && initialBusiness) {
      trackStorefrontEvent({
        businessId,
        eventName: "storefront_view",
        data: {
          storeName: storeDisplayName,
          currency: initialBusiness?.currency || "INR",
        },
      });
    }
  }, [businessId, Boolean(initialBusiness), storeDisplayName, initialBusiness?.currency]);

  // Debounced search telemetry
  useEffect(() => {
    const q = searchQuery.trim();
    if (!businessId || q.length < 2) return;
    const timer = setTimeout(() => {
      trackStorefrontEvent({
        businessId,
        eventName: "search",
        data: {
          query: q,
          resultsCount: filteredProducts.length,
        },
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery, businessId, filteredProducts.length]);

  // --- CART LOGIC ---
  const addToCart = (product: any, openDrawer = false) => {
    const price =
      product.onlinePrice !== undefined && product.onlinePrice !== null
        ? product.onlinePrice
        : product.price || 0;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price,
          quantity: 1,
          image: product.images?.[0],
          sku: product.sku,
        },
      ];
    });

    if (businessId) {
      trackStorefrontEvent({
        businessId,
        eventName: "add_to_cart",
        data: {
          id: product.id,
          name: product.name,
          price,
          quantity: 1,
          currency: initialBusiness?.currency || "INR",
        },
      });
    }

    toast({ title: "Added to Bag", description: `${product.name} is in your cart.` });

    if (openDrawer) {
      setIsCartOpen(true);
    }
  };

  const handleBuyNow = (product: any) => {
    addToCart(product, false);
    setCheckoutStep("info");
    setIsCartOpen(true);
    setSelectedProductId(null);

    if (businessId) {
      trackStorefrontEvent({
        businessId,
        eventName: "begin_checkout",
        data: {
          totalPrice:
            product.onlinePrice !== undefined && product.onlinePrice !== null
              ? product.onlinePrice
              : product.price || 0,
          totalItems: 1,
          currency: initialBusiness?.currency || "INR",
        },
      });
    }
  };

  const updateCartQty = (id: string, delta: number) => {
    const item = cart.find((i) => i.id === id);
    if (businessId && item && delta < 0 && item.quantity + delta <= 0) {
      trackStorefrontEvent({
        businessId,
        eventName: "remove_from_cart",
        data: {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          currency: initialBusiness?.currency || "INR",
        },
      });
    }

    setCart((prev) =>
      prev
        .map((it) => {
          if (it.id === id) {
            return { ...it, quantity: Math.max(0, it.quantity + delta) };
          }
          return it;
        })
        .filter((it) => it.quantity > 0)
    );
  };

  const cartStats = useMemo(() => {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { totalItems, totalPrice };
  }, [cart]);

  const cartPricing = useMemo(
    () =>
      computeStoreOrderPricing({
        subtotal: cartStats.totalPrice,
        coupons: storeCoupons,
        couponCode: appliedCouponCode,
        shippingConfig,
        paymentMethod: checkoutStep === "info" ? paymentMethod : "ONLINE",
      }),
    [
      cartStats.totalPrice,
      storeCoupons,
      appliedCouponCode,
      shippingConfig,
      checkoutStep,
      paymentMethod,
    ]
  );

  const shippingProgress = useMemo(() => {
    const netSubtotal = Math.max(0, cartStats.totalPrice - cartPricing.discountAmount);
    return computeFreeShippingProgress(netSubtotal, shippingConfig);
  }, [cartStats.totalPrice, cartPricing.discountAmount, shippingConfig]);

  useEffect(() => {
    if (cartStats.totalItems === 0 && appliedCouponCode) {
      setAppliedCouponCode(null);
      setCouponInput("");
      setCouponFeedback(null);
    } else if (
      cartStats.totalPrice > 0 &&
      appliedCouponCode &&
      !cartPricing.appliedCouponCode
    ) {
      setAppliedCouponCode(null);
      setCouponFeedback({
        type: "error",
        text: cartPricing.couponMessage || "Applied coupon is no longer valid for this cart.",
      });
    }
  }, [
    cartStats.totalItems,
    cartStats.totalPrice,
    appliedCouponCode,
    cartPricing.appliedCouponCode,
    cartPricing.couponMessage,
  ]);

  const handleApplyCoupon = async () => {
    const clean = sanitizeCouponCode(couponInput);
    if (!clean) {
      setCouponFeedback({ type: "error", text: "Please enter a promo code." });
      return;
    }
    if (!businessId) return;

    setIsApplyingCoupon(true);
    try {
      const idToken = user ? await user.getIdToken() : undefined;
      const res = await validateStorefrontCoupon({
        businessId,
        code: clean,
        subtotal: cartStats.totalPrice,
        idToken,
      });

      if (res.valid && res.code) {
        setAppliedCouponCode(res.code);
        setCouponInput(res.code);
        setCouponFeedback({ type: "success", text: res.message });
      } else {
        // Check local SSR/hydrated coupons if server snapshot lagged behind
        const localEval = evaluateCouponDiscount({
          coupons: storeCoupons,
          code: clean,
          subtotal: cartStats.totalPrice,
        });
        if (localEval.valid && localEval.coupon) {
          setAppliedCouponCode(localEval.coupon.code);
          setCouponInput(localEval.coupon.code);
          setCouponFeedback({ type: "success", text: localEval.message });
        } else {
          setAppliedCouponCode(null);
          setCouponFeedback({
            type: "error",
            text: res.message || localEval.message || "Invalid promo code.",
          });
        }
      }
    } catch {
      const localEval = evaluateCouponDiscount({
        coupons: storeCoupons,
        code: clean,
        subtotal: cartStats.totalPrice,
      });
      if (localEval.valid && localEval.coupon) {
        setAppliedCouponCode(localEval.coupon.code);
        setCouponInput(localEval.coupon.code);
        setCouponFeedback({ type: "success", text: localEval.message });
      } else {
        setCouponFeedback({
          type: "error",
          text: localEval.message || "Could not verify promo code.",
        });
      }
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCouponCode(null);
    setCouponInput("");
    setCouponFeedback(null);
  };

  const saveLocalRecentOrder = (
    orderId: string,
    status: string,
    method: StorePaymentMethod
  ) => {
    if (!businessId) return;
    try {
      const storageKey = `biztrix_recent_orders_${businessId}`;
      const existingRaw = localStorage.getItem(storageKey);
      const existing: Array<{ phone: string; summary: TrackedOrderSummary }> =
        existingRaw ? JSON.parse(existingRaw) : [];

      const summary: TrackedOrderSummary = {
        orderId,
        status,
        paymentMethod: method,
        settlementStatus:
          method === "COD"
            ? "cod_pending"
            : method === "WHATSAPP"
              ? "whatsapp_pending"
              : "paid",
        customerFirstName: customerInfo.name.trim().split(/\s+/)[0] || "Customer",
        subtotal: cartPricing.subtotal,
        discountAmount: cartPricing.discountAmount,
        couponCode: cartPricing.appliedCouponCode,
        shippingFee: cartPricing.shippingFee,
        codFee: cartPricing.codFee,
        totalAmount: cartPricing.grandTotal,
        trackingNumber: null,
        courierName: null,
        items: cart.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          lineTotal: item.price * item.quantity,
        })),
        statusHistory: [
          {
            status,
            changedAt: new Date().toISOString(),
            note: `${method} order submitted from storefront.`,
          },
        ],
        createdAtIso: new Date().toISOString(),
      };

      const next = [
        { phone: customerInfo.phone.trim(), summary },
        ...existing.filter((e) => e.summary.orderId !== orderId),
      ].slice(0, 10);
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  };

  const handleTrackOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!businessId) return;

    const cleanId = trackOrderIdInput.trim();
    const cleanPhone = trackPhoneInput.trim();
    if (!cleanId || cleanPhone.replace(/\D/g, "").length < 6) {
      setTrackOrderError(
        "Enter your Order ID (e.g. ORD-...) and the phone number used at checkout."
      );
      setTrackedOrder(null);
      return;
    }

    setIsTrackingOrder(true);
    setTrackOrderError(null);
    try {
      const idToken = user ? await user.getIdToken() : undefined;
      const res = await trackStorefrontOrder({
        businessId,
        orderId: cleanId,
        phone: cleanPhone,
        idToken,
      });
      if (res.success && res.order) {
        setTrackedOrder(res.order);
      } else {
        // Fallback for unauthenticated preview sessions where orders cannot be read via public REST
        let localMatch: TrackedOrderSummary | null = null;
        if (res.previewLimited) {
          try {
            const raw = localStorage.getItem(`biztrix_recent_orders_${businessId}`);
            const entries: Array<{ phone: string; summary: TrackedOrderSummary }> =
              raw ? JSON.parse(raw) : [];
            const found = entries.find((entry) =>
              matchesTrackOrderQuery({
                orderId: entry.summary.orderId,
                orderPhone: entry.phone,
                queryOrderId: cleanId,
                queryPhone: cleanPhone,
              })
            );
            if (found) localMatch = found.summary;
          } catch {
            // Ignore
          }
        }
        if (localMatch) {
          setTrackedOrder(localMatch);
        } else {
          setTrackedOrder(null);
          setTrackOrderError(
            res.error || "No matching order found. Please check your Order ID and phone."
          );
        }
      }
    } catch {
      setTrackedOrder(null);
      setTrackOrderError("Unable to look up order status right now. Please try again.");
    } finally {
      setIsTrackingOrder(false);
    }
  };

  const handleProceedToInfo = (preferredMethod?: StorePaymentMethod) => {
    if (preferredMethod) {
      setPaymentMethod(preferredMethod);
    }
    setCheckoutStep("info");
    if (businessId) {
      trackStorefrontEvent({
        businessId,
        eventName: "begin_checkout",
        data: {
          totalItems: cartStats.totalItems,
          totalPrice: cartPricing.grandTotal,
          currency: initialBusiness?.currency || "INR",
        },
      });
    }
  };

  // --- SOCIAL SHARING ENGINE ---
  const handleShareStore = async () => {
    const shareUrl = window.location.href;
    const shareText = `Check out ${storeDisplayName} for genuine products and direct ordering!`;

    if (businessId) {
      trackStorefrontEvent({
        businessId,
        eventName: "product_share",
        data: {
          context: "store_share",
          storeName: storeDisplayName,
          currency: initialBusiness?.currency || "INR",
        },
      });
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: storeDisplayName,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Store Link Copied",
        description: "Share this link with your friends and customers.",
      });
    } catch {
      openExternalSafe(buildWhatsAppUrl("", `${shareText} ${shareUrl}`));
    }
  };

  const handleShareProduct = async (product: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const price =
      product.onlinePrice !== undefined && product.onlinePrice !== null
        ? product.onlinePrice
        : product.price || 0;
    const urlObj = new URL(window.location.href);
    urlObj.searchParams.set("pId", product.id);
    const productUrl = urlObj.toString();
    const shareText = `*${product.name}* at ${storeDisplayName} for only ${currencySymbol}${price.toLocaleString()}! Order online:`;

    if (businessId) {
      trackStorefrontEvent({
        businessId,
        eventName: "product_share",
        data: {
          id: product.id,
          name: product.name,
          price,
          currency: initialBusiness?.currency || "INR",
        },
      });
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product.name} | ${storeDisplayName}`,
          text: `${product.name} (${currencySymbol}${price.toLocaleString()})`,
          url: productUrl,
        });
        return;
      } catch {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(productUrl);
      toast({
        title: "Product Link Copied",
        description: `${product.name} link copied to clipboard!`,
      });
    } catch {
      openExternalSafe(buildWhatsAppUrl("", `${shareText} ${productUrl}`));
    }
  };

  const buildOrderWhatsAppMessage = (orderId?: string) => {
    let message = `*NAMASTE! NEW ORDER REQUEST*\n`;
    if (orderId) {
      message += `*Order ID:* ${orderId}\n`;
    }
    message += `━━━━━━━━━━━━━━━━\n`;
    cart.forEach((item) => {
      message += `• ${item.name} (x${item.quantity}) - ${currencySymbol}${(
        item.price * item.quantity
      ).toLocaleString()}\n`;
    });
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `*Total Items:* ${cartStats.totalItems}\n`;
    message += `*Subtotal:* ${currencySymbol}${cartPricing.subtotal.toLocaleString()}\n`;
    if (cartPricing.discountAmount > 0 && cartPricing.appliedCouponCode) {
      message += `*Coupon (${cartPricing.appliedCouponCode}):* -${currencySymbol}${cartPricing.discountAmount.toLocaleString()}\n`;
    }
    if (cartPricing.shippingFee > 0) {
      message += `*Shipping:* ${currencySymbol}${cartPricing.shippingFee.toLocaleString()}\n`;
    } else if (shippingConfig.shippingFee > 0 || shippingConfig.freeShippingThreshold > 0) {
      message += `*Shipping:* FREE\n`;
    }
    message += `*Grand Total:* ${currencySymbol}${cartPricing.grandTotal.toLocaleString()}\n\n`;
    if (customerInfo.name) {
      message += `*Customer:* ${customerInfo.name}\n`;
      message += `*Phone:* ${customerInfo.phone}\n`;
      if (customerInfo.address) {
        message += `*Delivery Address:* ${customerInfo.address}\n\n`;
      }
    }
    message += `Kripya mera order confirm karein.`;
    return message;
  };

  // --- ORDER EXECUTION (ONLINE / COD / WHATSAPP) ---
  const handlePlaceOrder = async () => {
    if (!businessId || cart.length === 0) return;

    if (!customerInfo.name.trim() || customerInfo.phone.trim().length < 10) {
      toast({
        variant: "destructive",
        title: "Details Required",
        description: "Please enter your full name and a valid 10-digit mobile number.",
      });
      return;
    }

    if (paymentMethod === "COD" && !customerInfo.address.trim()) {
      toast({
        variant: "destructive",
        title: "Delivery Address Required",
        description: "Please provide your full delivery address for Cash on Delivery.",
      });
      return;
    }

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_CUSTOMER, JSON.stringify(customerInfo));
    } catch {
      // Ignore
    }

    setIsPlacingOrder(true);
    try {
      const idToken = user ? await user.getIdToken() : undefined;

      // 1. Create Authoritative Server-Validated Order
      const result = await createStorefrontOrder({
        businessId,
        customerData: customerInfo,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        paymentMethod,
        couponCode: cartPricing.appliedCouponCode || undefined,
        isPreview,
        idToken,
      });

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Order Failed",
          description: result.error || "Please try again.",
        });
        setIsPlacingOrder(false);
        return;
      }

      const bizOrderId = result.orderId!;
      const finalOrderTotal = result.totalAmount ?? cartPricing.grandTotal;

      // 2A. Cash on Delivery Path
      if (paymentMethod === "COD") {
        saveLocalRecentOrder(bizOrderId, result.status || "processing", "COD");
        setConfirmedOrderId(bizOrderId);
        setConfirmedPaymentLabel("Cash on Delivery");
        setCheckoutStep("success");
        setCart([]);
        handleRemoveCoupon();
        toast({
          title: "COD Order Confirmed!",
          description: `Order ${bizOrderId} has been placed.`,
        });
        setIsPlacingOrder(false);
        return;
      }

      // 2B. WhatsApp Checkout Path (saves order in Store Orders + opens WhatsApp chat)
      if (paymentMethod === "WHATSAPP") {
        saveLocalRecentOrder(bizOrderId, result.status || "created", "WHATSAPP");
        trackStorefrontEvent({
          businessId,
          eventName: "whatsapp_order_click",
          data: {
            context: "checkout_order",
            orderId: bizOrderId,
            totalItems: cartStats.totalItems,
            totalPrice: finalOrderTotal,
            currency: initialBusiness?.currency || "INR",
          },
        });

        const waUrl = buildWhatsAppUrl(
          merchantWaDigits,
          buildOrderWhatsAppMessage(bizOrderId)
        );
        openExternalSafe(waUrl);

        setConfirmedOrderId(bizOrderId);
        setConfirmedPaymentLabel("WhatsApp Direct Order");
        setCheckoutStep("success");
        setCart([]);
        handleRemoveCoupon();
        toast({
          title: "Order Logged & Sent to WhatsApp",
          description: `Order ${bizOrderId} saved. Complete confirmation in WhatsApp.`,
        });
        setIsPlacingOrder(false);
        return;
      }

      // 2C. Online Gateway Path (Razorpay)
      const payRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          orderId: bizOrderId,
          name: customerInfo.name,
          phone: customerInfo.phone,
        }),
      });

      const payData = await payRes.json();
      if (!payData.success) {
        if (codEnabled) {
          setPaymentMethod("COD");
        } else if (whatsappOrderEnabled) {
          setPaymentMethod("WHATSAPP");
        }
        toast({
          variant: "destructive",
          title: "Online Gateway Unavailable",
          description:
            payData.message ||
            "Online gateway is not active yet. Please place your order using Cash on Delivery or WhatsApp.",
        });
        setIsPlacingOrder(false);
        return;
      }

      const options = {
        key: payData.keyId,
        amount: payData.amount,
        currency: payData.currency,
        name: storeDisplayName,
        description: `Order ${bizOrderId}`,
        order_id: payData.orderId,
        handler: async (response: any) => {
          setIsPlacingOrder(true);
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...response,
                businessId,
                orderId: bizOrderId,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              saveLocalRecentOrder(bizOrderId, "paid", "ONLINE");
              setConfirmedOrderId(bizOrderId);
              setConfirmedPaymentLabel("Online Paid (Razorpay)");
              setCheckoutStep("success");

              trackStorefrontEvent({
                businessId,
                eventName: "purchase",
                data: {
                  orderId: bizOrderId,
                  amount: finalOrderTotal,
                  currency: initialBusiness?.currency || "INR",
                },
              });

              setCart([]);
              handleRemoveCoupon();
              toast({
                title: "Payment Successful",
                description: "Order has been confirmed.",
              });
            } else {
              toast({
                variant: "destructive",
                title: "Verification Failed",
                description: verifyData.message,
              });
            }
          } catch (err) {
            console.error(err);
            toast({ variant: "destructive", title: "Verification Error" });
          } finally {
            setIsPlacingOrder(false);
          }
        },
        prefill: {
          name: customerInfo.name,
          email: customerInfo.email,
          contact: customerInfo.phone,
        },
        theme: { color: primaryColor },
        modal: {
          ondismiss: () => {
            setIsPlacingOrder(false);
            toast({
              title: "Payment Pending",
              description: "Your order is saved. You can retry payment or switch to COD.",
            });
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Network Error" });
      setIsPlacingOrder(false);
    }
  };

  const handleOrderOnWhatsAppDirect = (product: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const price =
      product.onlinePrice !== undefined && product.onlinePrice !== null
        ? product.onlinePrice
        : product.price || 0;

    if (businessId) {
      trackStorefrontEvent({
        businessId,
        eventName: "whatsapp_order_click",
        data: {
          context: "direct_product",
          id: product.id,
          name: product.name,
          price,
          currency: initialBusiness?.currency || "INR",
        },
      });
    }

    const message = `*NAMASTE! PRODUCT INQUIRY*\n━━━━━━━━━━━━━━━━\n*Item:* ${
      product.name
    }\n*Price:* ${currencySymbol}${price.toLocaleString()}\n*SKU:* ${
      product.sku || "N/A"
    }\n\nKripya is product ke availability aur delivery details confirm karein.`;
    openExternalSafe(buildWhatsAppUrl(merchantWaDigits, message));
  };

  const scrollToCatalog = () => {
    const el = document.getElementById("store-catalog");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleApplyOfferCode = async (rawCode: string) => {
    const clean = sanitizeCouponCode(rawCode);
    if (!clean) return;

    try {
      await navigator.clipboard.writeText(clean);
    } catch {
      // Ignore clipboard failures in restricted environments
    }

    setCopiedOfferCode(clean);
    setCouponInput(clean);
    setTimeout(() => {
      setCopiedOfferCode((prev) => (prev === clean ? null : prev));
    }, 2500);

    if (cartStats.totalItems === 0 || !businessId) {
      toast({
        title: `Code "${clean}" Copied`,
        description: "Add items to your bag and apply this code at checkout.",
      });
      scrollToCatalog();
      return;
    }

    setIsApplyingCoupon(true);
    try {
      const idToken = user ? await user.getIdToken() : undefined;
      const res = await validateStorefrontCoupon({
        businessId,
        code: clean,
        subtotal: cartStats.totalPrice,
        idToken,
      });

      if (res.valid && res.code) {
        setAppliedCouponCode(res.code);
        setCouponFeedback({ type: "success", text: res.message });
        toast({ title: `Applied "${res.code}"`, description: res.message });
        setIsCartOpen(true);
      } else {
        const localEval = evaluateCouponDiscount({
          coupons: storeCoupons,
          code: clean,
          subtotal: cartStats.totalPrice,
        });
        if (localEval.valid && localEval.coupon) {
          setAppliedCouponCode(localEval.coupon.code);
          setCouponFeedback({ type: "success", text: localEval.message });
          toast({ title: `Applied "${localEval.coupon.code}"`, description: localEval.message });
          setIsCartOpen(true);
        } else {
          setCouponFeedback({
            type: "error",
            text: res.message || localEval.message || "Add qualifying items to apply code.",
          });
          toast({
            title: `Code "${clean}" Copied`,
            description: res.message || localEval.message || "Ready to use in your bag.",
          });
        }
      }
    } catch {
      toast({
        title: `Code "${clean}" Copied`,
        description: "Paste it inside your Shopping Bag to claim savings.",
      });
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent, sourceSectionId: string) => {
    e.preventDefault();
    if (!businessId) return;

    setLeadFeedback(null);
    setIsSubmittingLead(true);
    try {
      const idToken = user ? await user.getIdToken() : undefined;
      const result = await subscribeStorefrontLead({
        businessId,
        name: leadName,
        contact: leadContact,
        sourceSectionId,
        idToken,
      });

      if (result.success) {
        setLeadFeedback({ type: "success", text: result.message });
        setLeadName("");
        setLeadContact("");
        toast({
          title: "Subscribed to Store Alerts",
          description: result.message,
        });
      } else {
        setLeadFeedback({ type: "error", text: result.message });
      }
    } catch {
      setLeadFeedback({
        type: "error",
        text: "Unable to save alert right now. Please try again.",
      });
    } finally {
      setIsSubmittingLead(false);
    }
  };

  // UI Style Tokens (Flat Single-Elevation Editorial Surface Tokens)
  const cardRadiusClass =
    themeConfig.cardRadius === "sharp"
      ? "rounded-lg"
      : "rounded-2xl";

  const cardSurfaceClass = isDarkSurface
    ? "bg-slate-900 border border-slate-800 text-slate-100 hover:border-slate-700"
    : isWarmSurface
      ? uiStyle === "minimal"
        ? "bg-white border border-stone-200 hover:border-stone-900"
        : "bg-white border border-stone-200/80 hover:border-stone-300"
      : uiStyle === "minimal"
        ? "bg-white border border-slate-200 hover:border-slate-900"
        : "bg-white border border-slate-200 hover:border-slate-300";

  const buttonRadiusClass =
    themeConfig.buttonStyle === "pill"
      ? "rounded-full"
      : themeConfig.cardRadius === "sharp"
        ? "rounded-md"
        : "rounded-xl";

  const catalogGridClass =
    themeConfig.gridColumns === 3
      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6";

  const renderProductCard = (p: any, showPricing = true) => {
    const basePrice = p.price || 0;
    const onlinePrice =
      p.onlinePrice !== undefined && p.onlinePrice !== null ? p.onlinePrice : basePrice;
    const hasDiscount = onlinePrice < basePrice;
    const discountPercent =
      hasDiscount && basePrice > 0
        ? Math.round(((basePrice - onlinePrice) / basePrice) * 100)
        : 0;
    const isLowStock = p.stock > 0 && p.stock <= (p.minThreshold || 2);
    const isOutOfStock = p.stock <= 0;
    const productGallery = getProductGalleryImages(p);
    const primaryImage = productGallery[0];
    const hasValidImage = Boolean(primaryImage && !brokenImageUrls[primaryImage]);

    return (
      <Card
        key={p.id}
        className={cn(
          "group transition-colors duration-200 overflow-hidden flex flex-col text-left shadow-none",
          cardRadiusClass,
          cardSurfaceClass
        )}
      >
        <div
          className={cn(
            "relative aspect-square overflow-hidden cursor-pointer flex items-center justify-center",
            isDarkSurface ? "bg-slate-800" : isWarmSurface ? "bg-stone-100" : "bg-slate-100"
          )}
          onClick={() => setSelectedProductId(p.id)}
        >
          {hasValidImage ? (
            <img
              src={primaryImage}
              alt={p.name}
              referrerPolicy="no-referrer"
              onError={() => markImageBroken(primaryImage)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center p-6 text-center gap-2"
              style={{
                background: isDarkSurface
                  ? `linear-gradient(135deg, ${primaryColor}28, #0f172a)`
                  : `linear-gradient(135deg, ${primaryColor}14, ${primaryColor}06)`,
              }}
            >
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: primaryColor }}
              >
                {p.name?.charAt(0) || "P"}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isDarkSurface ? "text-slate-400" : "text-slate-500"
                )}
              >
                {p.category || "Catalog Item"}
              </span>
            </div>
          )}

          <div className="absolute top-3 left-3">
            {isOutOfStock ? (
              <Badge className="bg-slate-900 text-white border-none text-xs font-semibold px-2.5 py-0.5 rounded-md">
                Waitlist Only
              </Badge>
            ) : isLowStock ? (
              <Badge className="bg-amber-600 text-white border-none text-xs font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Only {p.stock} Left
              </Badge>
            ) : p.isBestSeller ? (
              <Badge className="bg-orange-600 text-white border-none text-xs font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                <Flame className="h-3 w-3 fill-current" /> Best Seller
              </Badge>
            ) : p.isFeatured ? (
              <Badge
                className="text-white border-none text-xs font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1"
                style={{ backgroundColor: primaryColor }}
              >
                <Star className="h-3 w-3 fill-current" /> Featured
              </Badge>
            ) : (
              <Badge className="bg-emerald-600 text-white border-none text-xs font-semibold px-2.5 py-0.5 rounded-md">
                In Stock
              </Badge>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={
              wishlistIds.includes(p.id)
                ? `Remove ${p.name} from saved items`
                : `Save ${p.name} to wishlist`
            }
            onClick={(e) => handleToggleWishlist(p, e)}
            className={cn(
              "absolute top-3 right-3 h-8 w-8 rounded-full border transition-colors",
              wishlistIds.includes(p.id)
                ? "bg-rose-500 border-rose-500 text-white hover:bg-rose-600"
                : "bg-white/95 border-slate-200 text-slate-700 hover:bg-white"
            )}
          >
            <Heart
              className={cn(
                "h-3.5 w-3.5",
                wishlistIds.includes(p.id) && "fill-current"
              )}
            />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label={`Share ${p.name}`}
            className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-white/95 border border-slate-200 text-slate-700 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
            title="Share Product"
            onClick={(e) => handleShareProduct(p, e)}
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <CardContent className="p-5 flex-1 flex flex-col justify-between text-left space-y-3">
          <div
            className="cursor-pointer space-y-1.5"
            onClick={() => setSelectedProductId(p.id)}
          >
            <p
              className={cn(
                "text-xs font-medium truncate",
                isDarkSurface ? "text-slate-400" : "text-slate-500"
              )}
            >
              {p.category || "General"}
              {p.sku ? ` · ${p.sku}` : ""}
            </p>
            <h3
              className={cn(
                "text-base font-semibold transition-colors line-clamp-2 leading-snug min-h-[2.75rem]",
                isDarkSurface
                  ? "text-white group-hover:text-sky-300"
                  : "text-slate-900 group-hover:text-primary"
              )}
              style={{ fontFamily: storeFonts.headingFont }}
            >
              {p.name}
            </h3>

            {showPricing && (
              <div className="flex items-baseline gap-2 pt-1 flex-wrap">
                <span
                  className="text-lg font-bold font-mono tabular-nums"
                  style={{ color: isDarkSurface ? "#FFFFFF" : primaryColor }}
                >
                  {currencySymbol}
                  {onlinePrice.toLocaleString()}
                </span>
                {hasDiscount && showDiscount && (
                  <span
                    className={cn(
                      "text-xs line-through font-medium font-mono tabular-nums",
                      isDarkSurface ? "text-slate-400" : "text-muted-foreground"
                    )}
                  >
                    {currencySymbol}
                    {basePrice.toLocaleString()}
                  </span>
                )}
                {hasDiscount && showDiscount && discountPercent > 0 && (
                  <span className="text-xs font-semibold text-rose-600 font-mono tabular-nums">
                    {discountPercent}% off
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={themeConfig.buttonStyle === "outline" ? "outline" : "default"}
                className={cn(
                  "w-full font-semibold h-10 text-xs gap-1.5 transition-colors",
                  buttonRadiusClass,
                  themeConfig.buttonStyle === "outline" ? "bg-transparent border-2" : "text-white"
                )}
                style={
                  themeConfig.buttonStyle === "outline"
                    ? { borderColor: primaryColor, color: isDarkSurface ? "#FFFFFF" : primaryColor }
                    : { backgroundColor: primaryColor }
                }
                disabled={isOutOfStock}
                onClick={() => addToCart(p)}
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
              <Button
                className={cn(
                  "w-full font-semibold h-10 text-xs gap-1.5 transition-colors",
                  buttonRadiusClass,
                  isDarkSurface
                    ? "bg-white text-slate-900 hover:bg-slate-200"
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                )}
                disabled={isOutOfStock}
                onClick={() => handleBuyNow(p)}
              >
                <Zap className="h-3.5 w-3.5 fill-current" /> Buy Now
              </Button>
            </div>

            {whatsappOrderEnabled && (
              <Button
                variant="outline"
                className={cn(
                  "w-full h-9 text-xs font-semibold gap-1.5",
                  buttonRadiusClass,
                  isDarkSurface
                    ? "text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border-emerald-800"
                    : "text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 border-emerald-200"
                )}
                onClick={(e) => handleOrderOnWhatsAppDirect(p, e)}
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Order
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!initialBusiness) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 space-y-4">
          <div className="h-12 w-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-6 w-6 text-rose-600" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Storefront Not Found
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              The requested storefront could not be located or is currently unpublished.
            </p>
          </div>
          <Button asChild variant="outline" className="mt-2 rounded-xl font-semibold text-xs">
            <Link href="/">Back to Platform</Link>
          </Button>
        </div>
      </div>
    );
  }

  const renderSection = (section: StoreSection) => {
    switch (section.type) {
      case "hero": {
        const heroHeading = section.content.title?.trim() || storeDisplayName;
        const heroSub =
          section.content.subtitle?.trim() ||
          websiteData?.seoDescription ||
          "Browse our authentic catalog and place direct orders with secure online payment, Cash on Delivery, or WhatsApp.";
        const heroCta = section.content.cta?.trim() || "Explore Catalog";
        const badgeText = section.content.badgeText?.trim() || "Verified Merchant Catalog";
        const heroImg = themeConfig.heroImageUrl && !brokenImageUrls[themeConfig.heroImageUrl]
          ? themeConfig.heroImageUrl
          : "";
        const showcaseFallbackImg =
          !heroImg && featuredProducts[0]?.images?.[0] && !brokenImageUrls[featuredProducts[0].images[0]]
            ? featuredProducts[0].images[0]
            : "";

        if (themeConfig.heroLayout === "split_showcase") {
          return (
            <section
              key={section.id}
              className={cn(
                "border-b py-12 md:py-16 px-4",
                isDarkSurface
                  ? "bg-slate-900/70 border-slate-800 text-white"
                  : isWarmSurface
                    ? "bg-[#F4EFE7] border-stone-200 text-stone-900"
                    : "bg-white border-slate-200 text-slate-900"
              )}
            >
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center text-left">
                <div className="lg:col-span-7 space-y-5">
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      isDarkSurface ? "text-slate-300" : "text-slate-600"
                    )}
                  >
                    {badgeText}
                  </p>
                  <h1
                    className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.08]"
                    style={{ fontFamily: storeFonts.headingFont }}
                  >
                    {heroHeading}
                  </h1>
                  <p
                    className={cn(
                      "text-sm md:text-base max-w-xl font-medium leading-relaxed",
                      isDarkSurface ? "text-slate-300" : "text-slate-600"
                    )}
                  >
                    {heroSub}
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <Button
                      onClick={scrollToCatalog}
                      className={cn(
                        "h-11 px-6 text-white text-xs font-semibold",
                        buttonRadiusClass
                      )}
                      style={{ backgroundColor: primaryColor }}
                    >
                      {heroCta} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-11 px-5 text-xs font-semibold",
                        buttonRadiusClass,
                        isDarkSurface ? "border-slate-700 text-white hover:bg-slate-800" : "border-slate-300"
                      )}
                      onClick={handleShareStore}
                    >
                      <Share2 className="mr-2 h-3.5 w-3.5" /> Share Store
                    </Button>
                  </div>
                </div>
                <div className="lg:col-span-5">
                  <div
                    className={cn(
                      "aspect-[4/3] overflow-hidden border flex items-center justify-center relative",
                      cardRadiusClass,
                      isDarkSurface ? "border-slate-800 bg-slate-800" : "border-slate-200 bg-slate-100"
                    )}
                  >
                    {heroImg || showcaseFallbackImg ? (
                      <img
                        src={heroImg || showcaseFallbackImg}
                        alt={heroHeading}
                        referrerPolicy="no-referrer"
                        onError={() => markImageBroken(heroImg || showcaseFallbackImg)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex flex-col items-center justify-center p-8 text-white text-center gap-3"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <ShoppingBag className="h-14 w-14 opacity-90" />
                        <span
                          className="text-lg font-bold tracking-tight"
                          style={{ fontFamily: storeFonts.headingFont }}
                        >
                          {storeDisplayName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        }

        if (themeConfig.heroLayout === "editorial_cover") {
          return (
            <section
              key={section.id}
              className="relative overflow-hidden min-h-[340px] md:min-h-[420px] flex items-end py-12 md:py-16 px-4 text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {heroImg ? (
                <img
                  src={heroImg}
                  alt={heroHeading}
                  referrerPolicy="no-referrer"
                  onError={() => markImageBroken(heroImg)}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />
              <div className="max-w-7xl mx-auto w-full relative z-10 text-left space-y-4">
                <p className="text-xs font-semibold text-white/85">
                  {badgeText}
                </p>
                <h1
                  className="text-3xl md:text-5xl font-bold text-white tracking-tight max-w-3xl"
                  style={{ fontFamily: storeFonts.headingFont }}
                >
                  {heroHeading}
                </h1>
                <p className="text-white/90 text-sm md:text-base max-w-xl font-medium">
                  {heroSub}
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Button
                    onClick={scrollToCatalog}
                    className={cn(
                      "bg-white text-slate-900 hover:bg-slate-100 text-xs font-semibold h-11 px-6 gap-2",
                      buttonRadiusClass
                    )}
                  >
                    {heroCta} <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className={cn(
                      "bg-white/10 hover:bg-white/20 border-white/30 text-white text-xs font-semibold h-11 px-5 gap-2",
                      buttonRadiusClass
                    )}
                    onClick={handleShareStore}
                  >
                    <Share2 className="h-4 w-4" /> Share Store
                  </Button>
                </div>
              </div>
            </section>
          );
        }

        if (uiStyle === "minimal" && !heroImg) {
          return (
            <section
              key={section.id}
              className={cn(
                "border-b py-14 px-4",
                isDarkSurface
                  ? "bg-slate-900 border-slate-800 text-white"
                  : isWarmSurface
                    ? "bg-[#F4EFE7] border-stone-200 text-stone-900"
                    : "bg-white border-slate-200 text-slate-900"
              )}
            >
              <div className="max-w-7xl mx-auto text-center space-y-5">
                <p
                  className={cn(
                    "text-xs font-semibold",
                    isDarkSurface ? "text-slate-300" : "text-slate-600"
                  )}
                >
                  {badgeText}
                </p>
                <h1
                  className="text-3xl md:text-5xl font-bold tracking-tight"
                  style={{ fontFamily: storeFonts.headingFont }}
                >
                  {heroHeading}
                </h1>
                <p
                  className={cn(
                    "text-sm md:text-base max-w-xl mx-auto font-medium",
                    isDarkSurface ? "text-slate-300" : "text-slate-600"
                  )}
                >
                  {heroSub}
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    onClick={scrollToCatalog}
                    className={cn(
                      "h-11 px-6 text-white text-xs font-semibold",
                      buttonRadiusClass
                    )}
                    style={{ backgroundColor: primaryColor }}
                  >
                    {heroCta} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-11 px-5 text-xs font-semibold",
                      buttonRadiusClass,
                      isDarkSurface ? "border-slate-700 text-white hover:bg-slate-800" : "border-slate-300"
                    )}
                    onClick={handleShareStore}
                  >
                    <Share2 className="mr-2 h-3.5 w-3.5" /> Share Store
                  </Button>
                </div>
              </div>
            </section>
          );
        }

        return (
          <section
            key={section.id}
            className="relative overflow-hidden py-16 px-4 text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {heroImg ? (
              <>
                <img
                  src={heroImg}
                  alt={heroHeading}
                  referrerPolicy="no-referrer"
                  onError={() => markImageBroken(heroImg)}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/50 to-black/75" />
              </>
            ) : (
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 pointer-events-none">
                <ShoppingBag className="h-52 w-52 text-white" />
              </div>
            )}
            <div className="max-w-7xl mx-auto relative z-10 text-center space-y-4">
              <p className="text-xs font-semibold text-white/85">
                {badgeText}
              </p>
              <h1
                className="text-3xl md:text-5xl font-bold text-white tracking-tight"
                style={{ fontFamily: storeFonts.headingFont }}
              >
                {heroHeading}
              </h1>
              <p className="text-white/90 text-sm md:text-base max-w-xl mx-auto font-medium">
                {heroSub}
              </p>
              <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                <Button
                  size="sm"
                  onClick={scrollToCatalog}
                  className={cn(
                    "bg-white text-slate-900 hover:bg-slate-100 text-xs font-semibold h-10 px-6 gap-2",
                    buttonRadiusClass
                  )}
                >
                  {heroCta} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "bg-white/10 hover:bg-white/20 border-white/25 text-white text-xs font-semibold h-10 px-4 gap-2",
                    buttonRadiusClass
                  )}
                  onClick={handleShareStore}
                >
                  <Share2 className="h-3.5 w-3.5" /> Share Store
                </Button>
              </div>
            </div>
          </section>
        );
      }

      case "timer": {
        return (
          <section key={section.id} className="max-w-7xl mx-auto px-4 pt-8">
            <div
              className={cn(
                "bg-slate-900 text-white p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800",
                cardRadiusClass
              )}
            >
              <div className="space-y-1.5 text-center md:text-left">
                <Badge
                  className="border-none text-xs font-semibold px-3 py-1 text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {section.content.discountLabel || "Flash Sale Live"}
                </Badge>
                <h2
                  className="text-xl md:text-2xl font-bold tracking-tight"
                  style={{ fontFamily: storeFonts.headingFont }}
                >
                  {section.content.title || "Limited-Time Storefront Offer"}
                </h2>
                <p className="text-xs text-slate-300 font-medium">
                  {section.content.subtitle ||
                    "Order before the timer ends to claim special online pricing."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="px-5 py-3 rounded-2xl bg-white/10 border border-white/15 font-mono tabular-nums text-lg md:text-xl font-bold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-400" />
                  <span>{countdownText}</span>
                </div>
                <Button
                  onClick={scrollToCatalog}
                  className={cn(
                    "h-12 px-6 text-white font-semibold text-xs",
                    buttonRadiusClass
                  )}
                  style={{ backgroundColor: primaryColor }}
                >
                  {section.content.cta || "Shop Deal"}
                </Button>
              </div>
            </div>
          </section>
        );
      }

      case "featured": {
        if (featuredProducts.length === 0) return null;
        const limitCount = Math.max(1, Number(section.content.limit) || 4);
        const items = featuredProducts.slice(0, limitCount);
        const showSpotlightRow = items.length === 1;
        const featuredGridClass =
          items.length === 2
            ? "grid grid-cols-1 sm:grid-cols-2 gap-6"
            : items.length === 3
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              : catalogGridClass;

        return (
          <section key={section.id} className="max-w-7xl mx-auto px-4 pt-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 px-1 gap-2 text-left">
              <div>
                <p
                  className="text-xs font-semibold mb-1"
                  style={{ color: isDarkSurface ? "#94A3B8" : primaryColor }}
                >
                  Curated Spotlight
                </p>
                <h2
                  className={cn(
                    "text-xl md:text-2xl font-bold tracking-tight",
                    isDarkSurface ? "text-white" : "text-slate-900"
                  )}
                  style={{ fontFamily: storeFonts.headingFont }}
                >
                  {section.content.title || "Featured Picks & Best Sellers"}
                </h2>
                {section.content.subtitle && (
                  <p
                    className={cn(
                      "text-xs font-medium mt-0.5",
                      isDarkSurface ? "text-slate-400" : "text-muted-foreground"
                    )}
                  >
                    {section.content.subtitle}
                  </p>
                )}
              </div>
            </div>

            {showSpotlightRow ? (
              (() => {
                const p = items[0];
                const basePrice = p.price || 0;
                const onlinePrice =
                  p.onlinePrice !== undefined && p.onlinePrice !== null
                    ? p.onlinePrice
                    : basePrice;
                const hasDiscount = onlinePrice < basePrice;
                const isOutOfStock = p.stock <= 0;
                const isLowStock = p.stock > 0 && p.stock <= (p.minThreshold || 2);
                const spotlightGallery = getProductGalleryImages(p);
                const spotlightImg = spotlightGallery[0];
                const hasValidSpotlightImg = Boolean(
                  spotlightImg && !brokenImageUrls[spotlightImg]
                );

                return (
                  <Card
                    className={cn(
                      "overflow-hidden grid grid-cols-1 md:grid-cols-12 text-left shadow-none",
                      cardRadiusClass,
                      cardSurfaceClass
                    )}
                  >
                    <div
                      onClick={() => setSelectedProductId(p.id)}
                      className={cn(
                        "md:col-span-5 aspect-[4/3] md:aspect-auto md:min-h-[260px] relative overflow-hidden cursor-pointer flex items-center justify-center",
                        isDarkSurface
                          ? "bg-slate-800"
                          : isWarmSurface
                            ? "bg-stone-100"
                            : "bg-slate-100"
                      )}
                    >
                      {hasValidSpotlightImg ? (
                        <img
                          src={spotlightImg}
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          onError={() => markImageBroken(spotlightImg)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex flex-col items-center justify-center p-8 text-center gap-2.5"
                          style={{
                            background: isDarkSurface
                              ? `linear-gradient(135deg, ${primaryColor}30, #0f172a)`
                              : `linear-gradient(135deg, ${primaryColor}16, ${primaryColor}06)`,
                          }}
                        >
                          <div
                            className="h-16 w-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {p.name?.charAt(0) || "P"}
                          </div>
                          <span className="text-xs font-medium opacity-70">
                            {p.category || "Spotlight Pick"}
                          </span>
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <Badge
                          className="text-white border-none text-xs font-semibold px-2.5 py-0.5 rounded-md"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {isOutOfStock
                            ? "Waitlist Only"
                            : isLowStock
                              ? `Only ${p.stock} Left`
                              : p.isBestSeller
                                ? "Best Seller"
                                : "Featured Pick"}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={
                          wishlistIds.includes(p.id)
                            ? `Remove ${p.name} from saved items`
                            : `Save ${p.name} to wishlist`
                        }
                        onClick={(e) => handleToggleWishlist(p, e)}
                        className={cn(
                          "absolute top-3 right-3 h-8 w-8 rounded-full border transition-colors",
                          wishlistIds.includes(p.id)
                            ? "bg-rose-500 border-rose-500 text-white hover:bg-rose-600"
                            : "bg-white/95 border-slate-200 text-slate-700 hover:bg-white"
                        )}
                      >
                        <Heart
                          className={cn(
                            "h-3.5 w-3.5",
                            wishlistIds.includes(p.id) && "fill-current"
                          )}
                        />
                      </Button>
                    </div>

                    <CardContent className="md:col-span-7 p-6 md:p-8 flex flex-col justify-between space-y-5">
                      <div
                        className="space-y-2.5 cursor-pointer"
                        onClick={() => setSelectedProductId(p.id)}
                      >
                        <p className="text-xs font-medium opacity-70">
                          {p.category || "General"}
                          {p.sku ? ` · ${p.sku}` : ""}
                        </p>
                        <h3
                          className={cn(
                            "text-xl md:text-2xl font-bold tracking-tight",
                            isDarkSurface ? "text-white" : "text-slate-900"
                          )}
                          style={{ fontFamily: storeFonts.headingFont }}
                        >
                          {p.name}
                        </h3>
                        <p
                          className={cn(
                            "text-xs sm:text-sm leading-relaxed line-clamp-3",
                            isDarkSurface ? "text-slate-300" : "text-slate-600"
                          )}
                        >
                          {p.description ||
                            "Handpicked directly from our live merchant catalog with instant checkout and doorstep dispatch."}
                        </p>
                      </div>

                      <div className="space-y-4">
                        {section.content.showPricing !== false && (
                          <div className="flex items-baseline gap-2.5">
                            <span
                              className="text-2xl font-bold font-mono tabular-nums"
                              style={{ color: isDarkSurface ? "#FFFFFF" : primaryColor }}
                            >
                              {currencySymbol}
                              {onlinePrice.toLocaleString()}
                            </span>
                            {hasDiscount && showDiscount && (
                              <span className="text-sm line-through opacity-55 font-medium font-mono tabular-nums">
                                {currencySymbol}
                                {basePrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2.5">
                          <Button
                            variant={
                              themeConfig.buttonStyle === "outline" ? "outline" : "default"
                            }
                            className={cn(
                              "h-11 px-6 font-semibold text-xs gap-1.5",
                              buttonRadiusClass,
                              themeConfig.buttonStyle === "outline"
                                ? "bg-transparent border-2"
                                : "text-white"
                            )}
                            style={
                              themeConfig.buttonStyle === "outline"
                                ? {
                                    borderColor: primaryColor,
                                    color: isDarkSurface ? "#FFFFFF" : primaryColor,
                                  }
                                : { backgroundColor: primaryColor }
                            }
                            disabled={isOutOfStock}
                            onClick={() => addToCart(p)}
                          >
                            <Plus className="h-4 w-4" /> Add to Bag
                          </Button>
                          <Button
                            className={cn(
                              "h-11 px-6 font-semibold text-xs gap-1.5",
                              buttonRadiusClass,
                              isDarkSurface
                                ? "bg-white text-slate-900 hover:bg-slate-200"
                                : "bg-slate-900 hover:bg-slate-800 text-white"
                            )}
                            disabled={isOutOfStock}
                            onClick={() => handleBuyNow(p)}
                          >
                            <Zap className="h-4 w-4 fill-current" /> Buy Now
                          </Button>
                          {whatsappOrderEnabled && (
                            <Button
                              variant="outline"
                              className={cn(
                                "h-11 px-4 text-xs font-semibold gap-1.5",
                                buttonRadiusClass,
                                isDarkSurface
                                  ? "text-emerald-300 bg-emerald-950/50 border-emerald-800"
                                  : "text-emerald-700 bg-emerald-50 border-emerald-200"
                              )}
                              onClick={(e) => handleOrderOnWhatsAppDirect(p, e)}
                            >
                              <MessageCircle className="h-4 w-4" /> WhatsApp
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()
            ) : (
              <div className={featuredGridClass}>
                {items.map((p: any) =>
                  renderProductCard(p, section.content.showPricing !== false)
                )}
              </div>
            )}
          </section>
        );
      }

      case "products": {
        const limitCount = Math.max(1, Number(section.content.limit) || 24);
        const visibleCatalog = filteredProducts.slice(0, limitCount);
        return (
          <div key={section.id} id="store-catalog">
            {/* Search and Category Filter Card */}
            <section className="max-w-7xl mx-auto px-4 pt-10">
              <Card
                className={cn(
                  "overflow-hidden shadow-none",
                  cardRadiusClass,
                  isDarkSurface
                    ? "bg-slate-900 border border-slate-800 text-white"
                    : "bg-white border border-slate-200"
                )}
              >
                <CardContent className="p-6 md:p-8 space-y-5">
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search
                        className={cn(
                          "absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 opacity-45",
                          isDarkSurface ? "text-slate-300" : "text-muted-foreground"
                        )}
                      />
                      <Input
                        aria-label="Search store catalog"
                        placeholder="Search products by name, SKU, or category..."
                        className={cn(
                          "h-12 md:h-14 pl-12 pr-4 rounded-xl text-sm font-medium border",
                          isDarkSurface
                            ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                            : "bg-slate-50 border-slate-200 text-slate-900"
                        )}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:flex items-center gap-2.5 shrink-0">
                      <Select
                        value={sortBy}
                        onValueChange={(val) => setSortBy(val as StoreSortOption)}
                      >
                        <SelectTrigger
                          aria-label="Sort products"
                          className={cn(
                            "h-12 md:h-14 w-full sm:w-[190px] rounded-xl border font-semibold text-xs whitespace-nowrap",
                            isDarkSurface
                              ? "bg-slate-800 border-slate-700 text-white"
                              : "bg-slate-50 border-slate-200 text-slate-900"
                          )}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
                            <SelectValue placeholder="Sort by" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="featured">Featured First</SelectItem>
                          <SelectItem value="price_asc">Price: Low to High</SelectItem>
                          <SelectItem value="price_desc">Price: High to Low</SelectItem>
                          <SelectItem value="newest">Newest Arrivals</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant={inStockOnly ? "default" : "outline"}
                        aria-pressed={inStockOnly}
                        onClick={() => setInStockOnly((prev) => !prev)}
                        style={inStockOnly ? { backgroundColor: primaryColor } : {}}
                        className={cn(
                          "h-12 md:h-14 w-full sm:w-auto px-4 rounded-xl text-xs font-semibold gap-2 shrink-0 whitespace-nowrap",
                          inStockOnly
                            ? "text-white"
                            : isDarkSurface
                              ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                        <span>In Stock Only</span>
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {categories.map((cat) => (
                      <Button
                        key={cat}
                        variant={selectedCategory === cat ? "default" : "outline"}
                        onClick={() => setSelectedCategory(cat)}
                        style={
                          selectedCategory === cat ? { backgroundColor: primaryColor } : {}
                        }
                        className={cn(
                          "rounded-lg h-9 px-4 text-xs font-semibold transition-colors shrink-0",
                          selectedCategory === cat
                            ? "text-white border-transparent"
                            : isDarkSurface
                              ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                              : "bg-white border-slate-200 text-slate-700"
                        )}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            <main className="max-w-7xl mx-auto px-4 py-12">
              <div className="flex items-center justify-between mb-8 px-2 text-left">
                <h2
                  className={cn(
                    "text-xl font-bold flex items-center gap-2 tracking-tight",
                    isDarkSurface ? "text-white" : "text-slate-900"
                  )}
                  style={{ fontFamily: storeFonts.headingFont }}
                >
                  {section.content.title || "Our Catalog"}{" "}
                  <span
                    className={cn(
                      "font-medium text-xs font-mono tabular-nums",
                      isDarkSurface ? "text-slate-400" : "text-muted-foreground"
                    )}
                  >
                    ({filteredProducts.length} Products)
                  </span>
                </h2>
              </div>

              {visibleCatalog.length === 0 ? (
                <div
                  className={cn(
                    "text-center py-20 space-y-4 rounded-2xl border border-dashed",
                    isDarkSurface
                      ? "bg-slate-900 border-slate-700 text-slate-300"
                      : "bg-white border-slate-200"
                  )}
                >
                  <ShoppingBag className="h-12 w-12 mx-auto text-slate-400" />
                  <p className="text-base font-semibold">
                    {catalogProducts.length === 0
                      ? "Catalog Coming Soon"
                      : "No products match your filters"}
                  </p>
                  {(searchQuery || selectedCategory !== "All" || inStockOnly) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("All");
                        setInStockOnly(false);
                      }}
                      className="rounded-xl text-xs font-semibold"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className={catalogGridClass}>
                  {visibleCatalog.map((p: any) =>
                    renderProductCard(p, section.content.showPricing !== false)
                  )}
                </div>
              )}
            </main>
          </div>
        );
      }

      case "testimonials": {
        const items =
          Array.isArray(section.content.testimonials) &&
          section.content.testimonials.length > 0
            ? section.content.testimonials
            : [
                {
                  name: "Verified Buyer",
                  role: "Repeat Customer",
                  quote:
                    "Genuine products, accurate pricing, and quick order updates right on WhatsApp.",
                  rating: 5,
                },
                {
                  name: "Direct Store Client",
                  role: "Online Order",
                  quote:
                    "Smooth ordering flow and reliable doorstep delivery directly from the store.",
                  rating: 5,
                },
                {
                  name: "Local Shopper",
                  role: "Verified Order",
                  quote:
                    "Great packaging and authentic stock availability every time.",
                  rating: 5,
                },
              ];

        return (
          <section key={section.id} className="max-w-7xl mx-auto px-4 py-12 text-left">
            <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
              <p
                className="text-xs font-semibold"
                style={{ color: isDarkSurface ? "#94A3B8" : primaryColor }}
              >
                Customer Reviews
              </p>
              <h2
                className={cn(
                  "text-2xl md:text-3xl font-bold tracking-tight",
                  isDarkSurface ? "text-white" : "text-slate-900"
                )}
                style={{ fontFamily: storeFonts.headingFont }}
              >
                {section.content.title || "Trusted by Verified Buyers"}
              </h2>
              {section.content.subtitle && (
                <p
                  className={cn(
                    "text-xs font-medium",
                    isDarkSurface ? "text-slate-400" : "text-muted-foreground"
                  )}
                >
                  {section.content.subtitle}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {items.map((item, idx) => (
                <Card
                  key={idx}
                  className={cn("p-6 space-y-4 text-left shadow-none", cardRadiusClass, cardSurfaceClass)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: item.rating || 5 }).map((_, starIdx) => (
                        <Star key={starIdx} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                    <Quote className={cn("h-5 w-5", isDarkSurface ? "text-slate-700" : "text-slate-200")} />
                  </div>
                  <p
                    className={cn(
                      "text-xs sm:text-sm font-medium leading-relaxed",
                      isDarkSurface ? "text-slate-300" : "text-slate-600"
                    )}
                  >
                    &ldquo;{item.quote}&rdquo;
                  </p>
                  <div
                    className={cn(
                      "pt-2 border-t flex items-center justify-between",
                      isDarkSurface && "border-slate-800"
                    )}
                  >
                    <div>
                      <p
                        className={cn(
                          "text-xs font-semibold",
                          isDarkSurface ? "text-white" : "text-slate-900"
                        )}
                      >
                        {item.name}
                      </p>
                      {item.role && (
                        <p
                          className={cn(
                            "text-xs font-medium",
                            isDarkSurface ? "text-slate-400" : "text-muted-foreground"
                          )}
                        >
                          {item.role}
                        </p>
                      )}
                    </div>
                    <BadgeCheck className="h-4 w-4 text-emerald-500" />
                  </div>
                </Card>
              ))}
            </div>
          </section>
        );
      }

      case "whatsapp": {
        if (!whatsappOrderEnabled) return null;
        const quickMsg = `Namaste ${storeDisplayName}! Mujhe aapke online store se order / inquiry karni hai.`;
        const waHref = buildWhatsAppUrl(merchantWaDigits, quickMsg);
        return (
          <section key={section.id} className="max-w-7xl mx-auto px-4 py-8">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-left">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-emerald-950">
                  {section.content.title || "Prefer Ordering on WhatsApp?"}
                </h3>
                <p className="text-xs text-emerald-800 font-medium">
                  {section.content.subtitle ||
                    "Chat directly with our store desk for bulk inquiries or assisted ordering."}
                </p>
              </div>
              <Button
                asChild
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-11 px-6 rounded-xl shrink-0"
              >
                <a href={waHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {section.content.cta || "Chat on WhatsApp"}
                </a>
              </Button>
            </div>
          </section>
        );
      }

      case "trust_strip": {
        const items =
          Array.isArray(section.content.trustItems) &&
          section.content.trustItems.length > 0
            ? section.content.trustItems
            : DEFAULT_TRUST_ITEMS;

        const renderTrustIcon = (iconName?: string) => {
          const iconClass = "h-5 w-5 shrink-0";
          if (iconName === "Truck") return <Truck className={iconClass} style={{ color: primaryColor }} />;
          if (iconName === "Banknote") return <Banknote className={iconClass} style={{ color: primaryColor }} />;
          if (iconName === "BadgeCheck") return <BadgeCheck className={iconClass} style={{ color: primaryColor }} />;
          if (iconName === "Clock") return <Clock className={iconClass} style={{ color: primaryColor }} />;
          if (iconName === "PackageCheck") return <PackageCheck className={iconClass} style={{ color: primaryColor }} />;
          return <ShieldCheck className={iconClass} style={{ color: primaryColor }} />;
        };

        return (
          <section key={section.id} className="max-w-7xl mx-auto px-4 pt-10 text-left">
            {section.content.title && (
              <div className="mb-5 px-1">
                <h2
                  className={cn(
                    "text-lg md:text-xl font-bold tracking-tight",
                    isDarkSurface ? "text-white" : "text-slate-900"
                  )}
                  style={{ fontFamily: storeFonts.headingFont }}
                >
                  {section.content.title}
                </h2>
                {section.content.subtitle && (
                  <p className={cn("text-xs mt-0.5", isDarkSurface ? "text-slate-400" : "text-muted-foreground")}>
                    {section.content.subtitle}
                  </p>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-5 flex items-start gap-3.5 transition-colors",
                    cardRadiusClass,
                    cardSurfaceClass
                  )}
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                      isDarkSurface ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200/80"
                    )}
                  >
                    {renderTrustIcon(item.icon)}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-xs font-semibold",
                        isDarkSurface ? "text-white" : "text-slate-900"
                      )}
                    >
                      {item.title}
                    </p>
                    <p
                      className={cn(
                        "text-xs leading-snug mt-0.5",
                        isDarkSurface ? "text-slate-400" : "text-slate-600"
                      )}
                    >
                      {item.subtitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      }

      case "categories": {
        const limitCount = Math.max(2, Number(section.content.limit) || 6);
        const categorySummaries = deriveStorefrontCategorySummaries(
          catalogProducts,
          limitCount
        );
        if (categorySummaries.length === 0) return null;

        return (
          <section key={section.id} className="max-w-7xl mx-auto px-4 pt-12 text-left">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 px-1 gap-2">
              <div>
                <p
                  className="text-xs font-semibold mb-1"
                  style={{ color: isDarkSurface ? "#94A3B8" : primaryColor }}
                >
                  Browse Collections
                </p>
                <h2
                  className={cn(
                    "text-xl md:text-2xl font-bold tracking-tight",
                    isDarkSurface ? "text-white" : "text-slate-900"
                  )}
                  style={{ fontFamily: storeFonts.headingFont }}
                >
                  {section.content.title || "Shop by Category"}
                </h2>
                {section.content.subtitle && (
                  <p className={cn("text-xs mt-0.5", isDarkSurface ? "text-slate-400" : "text-muted-foreground")}>
                    {section.content.subtitle}
                  </p>
                )}
              </div>
              {selectedCategory !== "All" && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("All");
                    scrollToCatalog();
                  }}
                  className="text-xs font-semibold underline underline-offset-4 self-start sm:self-auto"
                  style={{ color: isDarkSurface ? "#FFFFFF" : primaryColor }}
                >
                  Show All Categories
                </button>
              )}
            </div>

            <div
              className={cn(
                "grid gap-4",
                categorySummaries.length === 1
                  ? "grid-cols-1 max-w-md"
                  : categorySummaries.length === 2
                    ? "grid-cols-1 sm:grid-cols-2"
                    : categorySummaries.length === 3
                      ? "grid-cols-1 sm:grid-cols-3"
                      : categorySummaries.length === 4
                        ? "grid-cols-2 lg:grid-cols-4"
                        : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
              )}
            >
              {categorySummaries.map((cat) => {
                const targetCategory = categories.includes(cat.name) ? cat.name : "All";
                const isSelected = selectedCategory === cat.name;
                const hasImg = Boolean(cat.imageUrl && !brokenImageUrls[cat.imageUrl]);
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(targetCategory);
                      scrollToCatalog();
                    }}
                    style={
                      isSelected
                        ? { borderColor: primaryColor, boxShadow: `0 0 0 1px ${primaryColor}` }
                        : undefined
                    }
                    className={cn(
                      "group text-left overflow-hidden flex flex-col transition-colors border",
                      cardRadiusClass,
                      isDarkSurface
                        ? "bg-slate-900 border-slate-800 hover:border-slate-600 text-white"
                        : "bg-white border-slate-200 hover:border-slate-400 text-slate-900"
                    )}
                  >
                    <div
                      className={cn(
                        "aspect-[4/3] w-full overflow-hidden flex items-center justify-center",
                        isDarkSurface ? "bg-slate-800" : "bg-slate-100"
                      )}
                    >
                      {hasImg && cat.imageUrl ? (
                        <img
                          src={cat.imageUrl}
                          alt={cat.name}
                          referrerPolicy="no-referrer"
                          onError={() => markImageBroken(cat.imageUrl!)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <LayoutGrid className="h-7 w-7 opacity-35" style={{ color: primaryColor }} />
                      )}
                    </div>
                    <div className="p-3.5 space-y-1 w-full">
                      <p className="text-xs font-semibold truncate">{cat.name}</p>
                      <p
                        className={cn(
                          "text-xs font-medium font-mono tabular-nums truncate",
                          isDarkSurface ? "text-slate-400" : "text-slate-500"
                        )}
                      >
                        {cat.count} {cat.count === 1 ? "Item" : "Items"}
                        {cat.minPrice > 0
                          ? ` · From ${currencySymbol}${cat.minPrice.toLocaleString()}`
                          : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      }

      case "new_arrivals": {
        const limitCount = Math.max(1, Number(section.content.limit) || 4);
        const newestItems = sortAndFilterStoreProducts(catalogProducts, {
          sortBy: "newest",
        }).slice(0, limitCount);
        if (newestItems.length === 0) return null;

        const rowGridClass =
          newestItems.length === 2
            ? "grid grid-cols-1 sm:grid-cols-2 gap-6"
            : newestItems.length === 3
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              : catalogGridClass;

        return (
          <section key={section.id} className="max-w-7xl mx-auto px-4 pt-12 text-left">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 px-1 gap-3">
              <div>
                <p
                  className="text-xs font-semibold mb-1 flex items-center gap-1.5"
                  style={{ color: isDarkSurface ? "#94A3B8" : primaryColor }}
                >
                  <Sparkles className="h-3.5 w-3.5" /> Fresh Inventory Drops
                </p>
                <h2
                  className={cn(
                    "text-xl md:text-2xl font-bold tracking-tight",
                    isDarkSurface ? "text-white" : "text-slate-900"
                  )}
                  style={{ fontFamily: storeFonts.headingFont }}
                >
                  {section.content.title || "New Arrivals & Fresh Stock"}
                </h2>
                {section.content.subtitle && (
                  <p className={cn("text-xs mt-0.5", isDarkSurface ? "text-slate-400" : "text-muted-foreground")}>
                    {section.content.subtitle}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory("All");
                  setSortBy("newest");
                  scrollToCatalog();
                }}
                className={cn(
                  "h-9 px-4 text-xs font-semibold gap-1.5 self-start sm:self-auto",
                  buttonRadiusClass,
                  isDarkSurface
                    ? "border-slate-700 bg-slate-900 text-white hover:bg-slate-800"
                    : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                )}
              >
                {section.content.cta || "View Latest Catalog"} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className={rowGridClass}>
              {newestItems.map((p: any) =>
                renderProductCard(p, section.content.showPricing !== false)
              )}
            </div>
          </section>
        );
      }

      case "offers": {
        const nowMs = Date.now();
        const activeCoupons = storeCoupons.filter((c) => {
          if (!c.active) return false;
          if (!c.expiresAt) return true;
          const expStr = /^\d{4}-\d{2}-\d{2}$/.test(c.expiresAt)
            ? `${c.expiresAt}T23:59:59.999Z`
            : c.expiresAt;
          const expMs = new Date(expStr).getTime();
          return !Number.isFinite(expMs) || nowMs <= expMs;
        });

        if (activeCoupons.length === 0 && !isPreview) return null;

        return (
          <section key={section.id} className="max-w-7xl mx-auto px-4 pt-10 text-left">
            <div
              className={cn(
                "p-6 md:p-8 border space-y-5",
                cardRadiusClass,
                isDarkSurface
                  ? "bg-slate-900 border-slate-800 text-white"
                  : isWarmSurface
                    ? "bg-[#F4EFE7] border-stone-200 text-stone-900"
                    : "bg-white border-slate-200 text-slate-900"
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p
                    className="text-xs font-semibold mb-1 flex items-center gap-1.5"
                    style={{ color: isDarkSurface ? "#94A3B8" : primaryColor }}
                  >
                    <Ticket className="h-3.5 w-3.5" /> Direct Checkout Savings
                  </p>
                  <h2
                    className="text-xl md:text-2xl font-bold tracking-tight"
                    style={{ fontFamily: storeFonts.headingFont }}
                  >
                    {section.content.title || "Active Offers & Promo Codes"}
                  </h2>
                  {section.content.subtitle && (
                    <p className={cn("text-xs mt-0.5", isDarkSurface ? "text-slate-400" : "text-muted-foreground")}>
                      {section.content.subtitle}
                    </p>
                  )}
                </div>
              </div>

              {activeCoupons.length === 0 ? (
                <div className="p-4 rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500">
                  Preview Notice: No active promo coupons yet. Add coupons under Storefront Manager → Core Config to show live savings cards here.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeCoupons.map((cpn) => {
                    const isCopiedNow = copiedOfferCode === cpn.code;
                    const savingLabel =
                      cpn.discountType === "percent"
                        ? `${cpn.discountValue}% OFF`
                        : `${currencySymbol}${cpn.discountValue.toLocaleString()} OFF`;
                    return (
                      <div
                        key={cpn.id}
                        className={cn(
                          "p-5 border border-dashed flex flex-col justify-between gap-4",
                          cardRadiusClass,
                          isDarkSurface
                            ? "bg-slate-950/70 border-slate-700"
                            : "bg-slate-50/70 border-slate-300"
                        )}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="text-xs font-bold font-mono tabular-nums"
                              style={{ color: primaryColor }}
                            >
                              {savingLabel}
                            </span>
                            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md border bg-white text-slate-900">
                              {cpn.code}
                            </span>
                          </div>
                          {cpn.description && (
                            <p className={cn("text-xs font-medium", isDarkSurface ? "text-slate-300" : "text-slate-700")}>
                              {cpn.description}
                            </p>
                          )}
                          <p className={cn("text-xs font-medium font-mono tabular-nums", isDarkSurface ? "text-slate-400" : "text-slate-500")}>
                            {cpn.minOrderAmount > 0
                              ? `Min. order ${currencySymbol}${cpn.minOrderAmount.toLocaleString()}`
                              : "No minimum order"}
                            {cpn.maxDiscount
                              ? ` · Up to ${currencySymbol}${cpn.maxDiscount.toLocaleString()}`
                              : ""}
                            {cpn.expiresAt ? ` · Valid till ${cpn.expiresAt}` : ""}
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleApplyOfferCode(cpn.code)}
                          style={{ backgroundColor: primaryColor }}
                          className={cn(
                            "w-full h-10 text-white text-xs font-semibold gap-1.5",
                            buttonRadiusClass
                          )}
                        >
                          {isCopiedNow ? (
                            <>
                              <Check className="h-3.5 w-3.5" /> Code Copied & Ready
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" /> {section.content.cta || "Copy & Apply"}
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );
      }

      case "media_showcase": {
        const rawMediaUrl = String(section.content.mediaUrl || "").trim();
        const youtubeId = extractYouTubeVideoId(rawMediaUrl);
        const validImageUrl =
          !youtubeId && rawMediaUrl && !brokenImageUrls[rawMediaUrl]
            ? rawMediaUrl
            : !youtubeId &&
                featuredProducts[0]?.images?.[0] &&
                !brokenImageUrls[featuredProducts[0].images[0]]
              ? featuredProducts[0].images[0]
              : "";

        return (
          <section key={section.id} className="max-w-7xl mx-auto px-4 pt-12 text-left">
            <div
              className={cn(
                "overflow-hidden grid grid-cols-1 lg:grid-cols-12 border",
                cardRadiusClass,
                cardSurfaceClass
              )}
            >
              <div className="lg:col-span-6 bg-slate-950 relative aspect-video lg:aspect-auto lg:min-h-[320px] flex items-center justify-center overflow-hidden">
                {youtubeId ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
                    title={section.content.title || "Product Demo Video"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full min-h-[240px] border-0"
                  />
                ) : validImageUrl ? (
                  <img
                    src={validImageUrl}
                    alt={section.content.title || storeDisplayName}
                    referrerPolicy="no-referrer"
                    onError={() => markImageBroken(validImageUrl)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center p-8 text-white text-center gap-3"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                    }}
                  >
                    <PlayCircle className="h-14 w-14 opacity-90" />
                    <span className="text-xs font-medium opacity-85">
                      {section.content.badgeText || "Product Walkthrough"}
                    </span>
                  </div>
                )}
              </div>

              <div className="lg:col-span-6 p-7 md:p-10 flex flex-col justify-center space-y-4">
                <p
                  className="text-xs font-medium"
                  style={{ color: isDarkSurface ? "#94A3B8" : primaryColor }}
                >
                  {section.content.badgeText || "Product Spotlight"}
                </p>
                <h2
                  className={cn(
                    "text-2xl md:text-3xl font-semibold tracking-tight leading-tight",
                    isDarkSurface ? "text-white" : "text-slate-900"
                  )}
                  style={{ fontFamily: storeFonts.headingFont }}
                >
                  {section.content.title || "See Our Quality Up Close"}
                </h2>
                {section.content.subtitle && (
                  <p className={cn("text-sm font-medium", isDarkSurface ? "text-slate-200" : "text-slate-700")}>
                    {section.content.subtitle}
                  </p>
                )}
                {section.content.body && (
                  <p className={cn("text-sm leading-relaxed", isDarkSurface ? "text-slate-400" : "text-slate-600")}>
                    {section.content.body}
                  </p>
                )}
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={scrollToCatalog}
                    style={{ backgroundColor: primaryColor }}
                    className={cn(
                      "h-11 px-6 text-white text-sm font-semibold gap-2",
                      buttonRadiusClass
                    )}
                  >
                    {section.content.cta || "Explore Featured Stock"} <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </section>
        );
      }

      case "faq": {
        const faqs =
          Array.isArray(section.content.faqs) && section.content.faqs.length > 0
            ? section.content.faqs
            : DEFAULT_FAQ_ITEMS;

        return (
          <section key={section.id} className="max-w-4xl mx-auto px-4 py-12 text-left">
            <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
              <p
                className="text-xs font-medium flex items-center justify-center gap-1.5"
                style={{ color: isDarkSurface ? "#94A3B8" : primaryColor }}
              >
                <HelpCircle className="h-3.5 w-3.5" /> Store Support & Answers
              </p>
              <h2
                className={cn(
                  "text-2xl md:text-3xl font-semibold tracking-tight",
                  isDarkSurface ? "text-white" : "text-slate-900"
                )}
                style={{ fontFamily: storeFonts.headingFont }}
              >
                {section.content.title || "Frequently Asked Questions"}
              </h2>
              {section.content.subtitle && (
                <p className={cn("text-xs font-medium", isDarkSurface ? "text-slate-400" : "text-muted-foreground")}>
                  {section.content.subtitle}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const key = `${section.id}_${idx}`;
                const isOpen = openFaqKey === key || (openFaqKey === null && idx === 0);
                return (
                  <div
                    key={key}
                    className={cn("border overflow-hidden transition-all", cardRadiusClass, cardSurfaceClass)}
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqKey(isOpen ? "__none__" : key)}
                      className="w-full p-5 flex items-center justify-between gap-4 text-left"
                    >
                      <span
                        className={cn(
                          "text-sm font-semibold tracking-tight",
                          isDarkSurface ? "text-white" : "text-slate-900"
                        )}
                      >
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-200",
                          isOpen && "rotate-180",
                          isDarkSurface ? "text-slate-400" : "text-slate-500"
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div
                        className={cn(
                          "px-5 pb-5 pt-1 text-sm leading-relaxed border-t",
                          isDarkSurface ? "text-slate-300 border-slate-800" : "text-slate-600 border-slate-100"
                        )}
                      >
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      }

      case "store_location": {
        const mapsHref = buildGoogleMapsPlaceUrl(
          section.content.mapUrl,
          merchantAddressDisplay,
          storeDisplayName
        );
        const pickupEnabled = section.content.pickupEnabled !== false;

        return (
          <section key={section.id} className="max-w-7xl mx-auto px-4 pt-10 text-left">
            <div
              className={cn(
                "p-6 md:p-10 border grid grid-cols-1 lg:grid-cols-12 gap-8 items-center",
                cardRadiusClass,
                cardSurfaceClass
              )}
            >
              <div className="lg:col-span-7 space-y-4">
                <p
                  className="text-xs font-medium flex items-center gap-1.5"
                  style={{ color: isDarkSurface ? "#94A3B8" : primaryColor }}
                >
                  <MapPin className="h-3.5 w-3.5" /> Storefront & Dispatch Desk
                </p>
                <h2
                  className={cn(
                    "text-2xl md:text-3xl font-semibold tracking-tight",
                    isDarkSurface ? "text-white" : "text-slate-900"
                  )}
                  style={{ fontFamily: storeFonts.headingFont }}
                >
                  {section.content.title || "Visit Our Store & Dispatch Desk"}
                </h2>
                {section.content.subtitle && (
                  <p className={cn("text-sm", isDarkSurface ? "text-slate-300" : "text-slate-600")}>
                    {section.content.subtitle}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div
                    className={cn(
                      "p-4 rounded-xl border space-y-1",
                      isDarkSurface ? "bg-slate-800/70 border-slate-700" : "bg-slate-50 border-slate-200/70"
                    )}
                  >
                    <p className="text-xs font-medium opacity-70">
                      Delivery Coverage
                    </p>
                    <p className="text-xs font-semibold leading-snug">
                      {section.content.deliveryZones || "Local Same-Day Delivery · Pan-India Insured Dispatch"}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "p-4 rounded-xl border space-y-1",
                      isDarkSurface ? "bg-slate-800/70 border-slate-700" : "bg-slate-50 border-slate-200/70"
                    )}
                  >
                    <p className="text-xs font-medium opacity-70">
                      Counter Self-Pickup
                    </p>
                    <p className="text-xs font-semibold leading-snug">
                      {pickupEnabled
                        ? "Available during business hours"
                        : "Online Delivery Dispatch Only"}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "lg:col-span-5 p-6 rounded-xl border space-y-4",
                  isDarkSurface ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                )}
              >
                <div className="space-y-2.5 text-xs">
                  <p className="flex items-start gap-2.5 font-medium">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" style={{ color: primaryColor }} />
                    <span>{merchantAddressDisplay}</span>
                  </p>
                  {policyConfig.supportHours && (
                    <p className="flex items-center gap-2.5 font-medium">
                      <Clock className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                      <span>{policyConfig.supportHours}</span>
                    </p>
                  )}
                  {merchantPhoneDisplay && (
                    <p className="flex items-center gap-2.5 font-medium font-mono tabular-nums">
                      <Phone className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                      <a href={`tel:${merchantPhoneDisplay}`} className="hover:underline">
                        {merchantPhoneDisplay}
                      </a>
                    </p>
                  )}
                </div>
                {section.content.body && (
                  <p className={cn("text-xs leading-relaxed", isDarkSurface ? "text-slate-400" : "text-slate-600")}>
                    {section.content.body}
                  </p>
                )}
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <Button
                    asChild
                    style={{ backgroundColor: primaryColor }}
                    className={cn(
                      "flex-1 h-10 text-white text-xs font-semibold gap-1.5",
                      buttonRadiusClass
                    )}
                  >
                    <a href={mapsHref} target="_blank" rel="noopener noreferrer">
                      <MapPin className="h-3.5 w-3.5" /> {section.content.cta || "Get Directions"}
                    </a>
                  </Button>
                  {whatsappOrderEnabled && merchantWaDigits && (
                    <Button
                      asChild
                      variant="outline"
                      className={cn(
                        "h-10 px-4 text-xs font-medium gap-1.5 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100",
                        buttonRadiusClass
                      )}
                    >
                      <a
                        href={buildWhatsAppUrl(
                          merchantWaDigits,
                          `Namaste ${storeDisplayName}! Store pickup / delivery zone ke baare me puchhna tha.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> Ask Desk
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      }

      case "newsletter": {
        return (
          <section key={section.id} className="max-w-7xl mx-auto px-4 pt-10 text-left">
            <div className={cn("bg-slate-900 text-white p-7 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border border-slate-800", cardRadiusClass)}>
              <div className="lg:col-span-6 space-y-2.5">
                <p className="text-xs font-medium text-amber-300 flex items-center gap-1.5">
                  <BellRing className="h-3.5 w-3.5" />
                  {section.content.discountLabel || "Restock & Offer Alerts"}
                </p>
                <h2
                  className="text-2xl md:text-3xl font-semibold tracking-tight"
                  style={{ fontFamily: storeFonts.headingFont }}
                >
                  {section.content.title || "Get Early Access to New Drops & Promo Codes"}
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                  {section.content.subtitle ||
                    "Join our store alert list for restock updates, festival discounts, and subscriber-only codes."}
                </p>
              </div>

              <form
                onSubmit={(e) => handleLeadSubmit(e, section.id)}
                className="lg:col-span-6 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    aria-label="Your Name"
                    placeholder="Your Name"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    disabled={isSubmittingLead}
                    className="h-11 rounded-xl bg-white/10 border-white/15 text-white placeholder:text-slate-400 text-sm"
                  />
                  <Input
                    aria-label="WhatsApp Number or Email"
                    placeholder="10-digit WhatsApp or Email"
                    value={leadContact}
                    onChange={(e) => setLeadContact(e.target.value)}
                    disabled={isSubmittingLead}
                    className="h-11 rounded-xl bg-white/10 border-white/15 text-white placeholder:text-slate-400 text-sm"
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <Button
                    type="submit"
                    disabled={isSubmittingLead}
                    style={{ backgroundColor: primaryColor }}
                    className={cn(
                      "h-11 px-7 text-white text-sm font-semibold gap-2 shrink-0",
                      buttonRadiusClass
                    )}
                  >
                    {isSubmittingLead ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BellRing className="h-4 w-4" />
                    )}
                    {section.content.cta || "Notify Me"}
                  </Button>
                  <p className="text-xs text-slate-400">
                    Direct store alerts only · No spam
                  </p>
                </div>
                {leadFeedback && (
                  <p
                    role="status"
                    className={cn(
                      "text-xs font-medium px-3.5 py-2 rounded-xl",
                      leadFeedback.type === "success"
                        ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"
                        : "bg-rose-500/20 text-rose-200 border border-rose-400/30"
                    )}
                  >
                    {leadFeedback.text}
                  </p>
                )}
              </form>
            </div>
          </section>
        );
      }

      case "about":
      case "contact": {
        return (
          <section
            key={section.id}
            className="bg-slate-900 py-16 text-white overflow-hidden relative mt-8"
          >
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center text-left">
              <div className="space-y-6 text-left">
                <p className="text-xs font-medium text-slate-300">
                  Direct Consumer Guarantee
                </p>
                <h2 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight text-balance">
                  {section.content.title || "Genuine Products. Direct From the Merchant."}
                </h2>
                {section.content.body && (
                  <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                    {section.content.body}
                  </p>
                )}
                <div className="grid gap-3 pt-2">
                  {[
                    {
                      title: "Flexible Checkout Options",
                      desc: codEnabled
                        ? "Pay securely online, choose Cash on Delivery, or confirm on WhatsApp."
                        : "Verified digital payments and direct merchant order confirmation.",
                      icon: Zap,
                    },
                    {
                      title: "Verified Merchant Storefront",
                      desc: "Every order is logged directly with the store desk for fast dispatch.",
                      icon: BadgeCheck,
                    },
                    {
                      title: "Live Inventory Sync",
                      desc: "Real-time stock availability directly from our store warehouse.",
                      icon: Package,
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/10 text-left"
                    >
                      <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                        <item.icon className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-white">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 sm:p-10 rounded-2xl text-slate-900 border border-slate-200 text-left space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={storeDisplayName}
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-semibold text-lg shrink-0"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {storeDisplayName.charAt(0)}
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-xs font-medium text-slate-500">
                      About Merchant
                    </p>
                    <p className="text-base font-semibold text-slate-900">{storeDisplayName}</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                  <p className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 shrink-0 text-primary mt-1" />
                    <span>{merchantAddressDisplay}</span>
                  </p>
                  {merchantPhoneDisplay && (
                    <p className="flex items-center gap-2.5 font-mono tabular-nums">
                      <Phone className="h-4 w-4 shrink-0 text-primary" />
                      <span>{merchantPhoneDisplay}</span>
                    </p>
                  )}
                  {merchantEmailDisplay && (
                    <p className="flex items-center gap-2.5">
                      <Mail className="h-4 w-4 shrink-0 text-primary" />
                      <span>{merchantEmailDisplay}</span>
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Button
                    className="w-full h-11 rounded-xl text-white font-semibold text-xs"
                    style={{ backgroundColor: primaryColor }}
                    onClick={handleShareStore}
                  >
                    <Share2 className="h-4 w-4 mr-2" /> Share Store
                  </Button>
                  {whatsappOrderEnabled && merchantWaDigits && (
                    <Button
                      asChild
                      variant="outline"
                      className="w-full h-11 rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold text-xs"
                    >
                      <a
                        href={buildWhatsAppUrl(
                          merchantWaDigits,
                          `Namaste ${storeDisplayName}!`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp Desk
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      }

      default:
        return null;
    }
  };

  const hasGa4Pixel = !isPreview && isValidGa4MeasurementId(trackingConfig.ga4MeasurementId);
  const hasMetaPixel = !isPreview && isValidMetaPixelId(trackingConfig.metaPixelId);

  return (
    <div
      className={cn(
        "min-h-screen text-left transition-colors duration-200",
        isDarkSurface
          ? "bg-slate-950 text-slate-100"
          : isWarmSurface
            ? "bg-[#FAF8F5] text-stone-900"
            : "bg-slate-50 text-slate-900"
      )}
      style={{ fontFamily: storeFonts.bodyFont }}
    >
      {/* Dynamic Google Analytics 4 Tag */}
      {hasGa4Pixel && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${trackingConfig.ga4MeasurementId}`}
            strategy="afterInteractive"
          />
          <Script id="biztrix-ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${trackingConfig.ga4MeasurementId}');`}
          </Script>
        </>
      )}

      {/* Dynamic Meta Pixel Tag */}
      {hasMetaPixel && (
        <Script id="biztrix-meta-pixel-init" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js'); fbq('init', '${trackingConfig.metaPixelId}'); fbq('track', 'PageView');`}
        </Script>
      )}
      {/* Top Announcement Bar */}
      {announcementBar.enabled && announcementBar.text && !isAnnouncementDismissed && (
        <div
          className="px-4 py-1.5 text-center text-[11px] font-bold flex items-center justify-center gap-3 relative"
          style={{
            backgroundColor: announcementBar.bgColor,
            color: announcementBar.textColor,
          }}
        >
          <span className="truncate">{announcementBar.text}</span>
          {announcementBar.ctaLabel && announcementBar.ctaUrl && (
            announcementBar.ctaUrl.startsWith("#") ? (
              <button
                type="button"
                onClick={scrollToCatalog}
                className="underline underline-offset-2 font-semibold text-xs shrink-0"
              >
                {announcementBar.ctaLabel}
              </button>
            ) : (
              <a
                href={announcementBar.ctaUrl}
                target={announcementBar.ctaUrl.startsWith("http") ? "_blank" : undefined}
                rel={announcementBar.ctaUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                className="underline underline-offset-2 font-semibold text-xs shrink-0"
              >
                {announcementBar.ctaLabel}
              </a>
            )
          )}
          <button
            type="button"
            aria-label="Dismiss announcement"
            onClick={() => setIsAnnouncementDismissed(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-75 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Merchant Preview Banner */}
      {isPreview && (
        <div className="bg-slate-900 text-white px-4 py-2 text-center text-xs font-medium flex items-center justify-center gap-2">
          <Eye className="h-3.5 w-3.5 text-amber-400" />
          <span>Storefront Preview Mode — Visible via Merchant Preview Link</span>
        </div>
      )}

      {/* Navigation Header */}
      <header
        className={cn(
          "sticky top-0 z-50 backdrop-blur-md border-b",
          isDarkSurface
            ? "bg-slate-900/95 border-slate-800 text-white"
            : isWarmSurface
              ? "bg-[#FAF8F5]/95 border-stone-200 text-stone-900"
              : "bg-white/95 border-slate-200 text-slate-900"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={storeDisplayName}
                referrerPolicy="no-referrer"
                className="h-10 w-10 rounded-xl object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-semibold text-lg shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                {storeDisplayName.charAt(0)}
              </div>
            )}
            <span
              className={cn(
                "text-base font-bold leading-none tracking-tight whitespace-nowrap truncate",
                isDarkSurface ? "text-white" : "text-slate-900"
              )}
              style={{ fontFamily: storeFonts.headingFont }}
            >
              {storeDisplayName}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              aria-label="Track Order"
              className={cn(
                "h-10 rounded-lg font-medium text-xs gap-1.5 px-3.5 whitespace-nowrap",
                isDarkSurface
                  ? "border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
              onClick={() => {
                setTrackOrderError(null);
                setIsTrackModalOpen(true);
              }}
            >
              <PackageCheck className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Track Order</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Open Saved Items"
              className={cn(
                "relative h-10 w-10 rounded-lg",
                isDarkSurface
                  ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
              title="Saved Items"
              onClick={() => setIsWishlistOpen(true)}
            >
              <Heart className={cn("h-4 w-4", wishlistProducts.length > 0 && "fill-rose-500 text-rose-500")} />
              {wishlistProducts.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 rounded-full bg-rose-600 text-white border-2 border-white text-[11px] font-semibold font-mono tabular-nums flex items-center justify-center">
                  {wishlistProducts.length}
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Share Store"
              className={cn(
                "h-10 w-10 rounded-lg",
                isDarkSurface
                  ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
              title="Share Store"
              onClick={handleShareStore}
            >
              <Share2 className="h-4 w-4" />
            </Button>

            {/* Shopping Bag Drawer */}
            <Sheet
              open={isCartOpen}
              onOpenChange={(open) => {
                setIsCartOpen(open);
                if (!open) setCheckoutStep("cart");
              }}
            >
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open Shopping Bag"
                  className={cn(
                    "relative h-10 w-10 rounded-lg",
                    isDarkSurface
                      ? "bg-slate-800 text-white hover:bg-slate-700"
                      : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                  )}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartStats.totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 rounded-full bg-red-600 text-white border-2 border-white text-[11px] font-semibold font-mono tabular-nums flex items-center justify-center">
                      {cartStats.totalItems}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md p-0 flex flex-col border-l border-slate-200 bg-white text-left">
                <SheetHeader className="p-6 bg-slate-900 text-white shrink-0 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="h-5 w-5 text-accent" />
                      <SheetTitle className="text-white text-lg font-semibold tracking-tight">
                        {checkoutStep === "info"
                          ? "Delivery & Payment"
                          : checkoutStep === "success"
                            ? "Order Confirmed"
                            : "Shopping Bag"}
                      </SheetTitle>
                    </div>
                    {checkoutStep === "info" && (
                      <button
                        type="button"
                        onClick={() => setCheckoutStep("cart")}
                        className="h-8 px-3 text-xs font-medium text-accent border border-accent/30 rounded-lg hover:bg-accent/10"
                      >
                        Back to Bag
                      </button>
                    )}
                  </div>
                  <SheetDescription className="text-slate-400 text-xs mt-1">
                    Direct Secure Storefront Checkout
                  </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                  {checkoutStep === "success" ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                      <div className="h-20 w-20 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-200">
                        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-slate-900">
                          Order Confirmed
                        </h3>
                        <p className="text-sm text-slate-600 px-2">
                          Thank you for ordering from {storeDisplayName}. Your order has been registered with the store.
                        </p>
                      </div>
                      <Card className="w-full bg-slate-50 border border-slate-200 p-5 rounded-xl text-left space-y-2.5">
                        <div>
                          <p className="text-xs font-medium text-slate-500">
                            Confirmation Order ID
                          </p>
                          <p className="text-base font-mono tabular-nums font-semibold text-primary">
                            {confirmedOrderId}
                          </p>
                        </div>
                        {confirmedPaymentLabel && (
                          <div>
                            <p className="text-xs font-medium text-slate-500">
                              Checkout Mode
                            </p>
                            <p className="text-sm font-semibold text-slate-800">
                              {confirmedPaymentLabel}
                            </p>
                          </div>
                        )}
                      </Card>
                      <div className="flex flex-col gap-2.5 w-full">
                        {confirmedOrderId && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setTrackOrderIdInput(confirmedOrderId);
                              setTrackPhoneInput(customerInfo.phone);
                              setTrackedOrder(null);
                              setTrackOrderError(null);
                              setIsCartOpen(false);
                              setIsTrackModalOpen(true);
                            }}
                            className="w-full h-11 rounded-xl font-medium text-sm gap-2"
                          >
                            <PackageCheck className="h-4 w-4" /> Track This Order
                          </Button>
                        )}
                        <SheetClose asChild>
                          <Button className="w-full h-12 bg-slate-900 text-white font-semibold text-sm rounded-xl">
                            Continue Shopping
                          </Button>
                        </SheetClose>
                      </div>
                    </div>
                  ) : checkoutStep === "info" ? (
                    <ScrollArea className="flex-1 p-6">
                      <div className="space-y-6 pb-8">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            <h4 className="text-xs font-semibold text-slate-900">
                              1. Customer Details
                            </h4>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-slate-600 ml-1">
                                Full Name *
                              </Label>
                              <Input
                                value={customerInfo.name}
                                onChange={(e) =>
                                  setCustomerInfo({ ...customerInfo, name: e.target.value })
                                }
                                placeholder="e.g. Priya Patel"
                                className="h-11 rounded-xl bg-slate-50 border-slate-200 font-medium text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-slate-600 ml-1">
                                WhatsApp Mobile *
                              </Label>
                              <div className="relative">
                                <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                  value={customerInfo.phone}
                                  onChange={(e) =>
                                    setCustomerInfo({
                                      ...customerInfo,
                                      phone: e.target.value.replace(/\D/g, ""),
                                    })
                                  }
                                  placeholder="9876543210"
                                  className="h-11 pl-11 rounded-xl bg-slate-50 border-slate-200 font-mono tabular-nums text-sm"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-slate-600 ml-1">
                                Email Address (Optional)
                              </Label>
                              <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                  value={customerInfo.email}
                                  onChange={(e) =>
                                    setCustomerInfo({
                                      ...customerInfo,
                                      email: e.target.value,
                                    })
                                  }
                                  placeholder="customer@example.com"
                                  className="h-11 pl-11 rounded-xl bg-slate-50 border-slate-200 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <h4 className="text-xs font-semibold text-slate-900">
                              2. Delivery Address {paymentMethod === "COD" ? "*" : ""}
                            </h4>
                          </div>
                          <Textarea
                            value={customerInfo.address}
                            onChange={(e) =>
                              setCustomerInfo({ ...customerInfo, address: e.target.value })
                            }
                            placeholder="Flat / House No, Building, Landmark, Locality, Pincode..."
                            className="min-h-[84px] rounded-xl bg-slate-50 border-slate-200 p-3.5 text-sm leading-relaxed"
                          />
                        </div>

                        <Separator />

                        {/* Payment Method Selector */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-primary" />
                            <h4 className="text-xs font-semibold text-slate-900">
                              3. Select Payment Mode
                            </h4>
                          </div>
                          <div className="grid grid-cols-1 gap-2.5">
                            <button
                              type="button"
                              onClick={() => setPaymentMethod("ONLINE")}
                              className={cn(
                                "p-3.5 rounded-xl border text-left flex items-center justify-between transition-colors",
                                paymentMethod === "ONLINE"
                                  ? "border-primary bg-primary/5"
                                  : "border-slate-200 bg-white hover:bg-slate-50"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <CreditCard className="h-4 w-4 text-primary shrink-0" />
                                <div>
                                  <p className="text-xs font-semibold text-slate-900">
                                    Pay Online (UPI / Cards)
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Instant verified payment via Razorpay
                                  </p>
                                </div>
                              </div>
                              <div
                                className={cn(
                                  "h-4 w-4 rounded-full border-2",
                                  paymentMethod === "ONLINE"
                                    ? "border-primary bg-primary"
                                    : "border-slate-300"
                                )}
                              />
                            </button>

                            {codEnabled && (
                              <button
                                type="button"
                                onClick={() => setPaymentMethod("COD")}
                                className={cn(
                                  "p-3.5 rounded-xl border text-left flex items-center justify-between transition-colors",
                                  paymentMethod === "COD"
                                    ? "border-amber-600 bg-amber-50/60"
                                    : "border-slate-200 bg-white hover:bg-slate-50"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <Banknote className="h-4 w-4 text-amber-600 shrink-0" />
                                  <div>
                                    <p className="text-xs font-semibold text-slate-900">
                                      Cash on Delivery (COD)
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Pay cash or UPI upon doorstep delivery
                                      {shippingConfig.codFee > 0
                                        ? ` (+${currencySymbol}${shippingConfig.codFee.toLocaleString()} handling fee)`
                                        : ""}
                                    </p>
                                  </div>
                                </div>
                                <div
                                  className={cn(
                                    "h-4 w-4 rounded-full border-2",
                                    paymentMethod === "COD"
                                      ? "border-amber-600 bg-amber-600"
                                      : "border-slate-300"
                                  )}
                                />
                              </button>
                            )}

                            {whatsappOrderEnabled && (
                              <button
                                type="button"
                                onClick={() => setPaymentMethod("WHATSAPP")}
                                className={cn(
                                  "p-3.5 rounded-xl border text-left flex items-center justify-between transition-colors",
                                  paymentMethod === "WHATSAPP"
                                    ? "border-emerald-600 bg-emerald-50/70"
                                    : "border-slate-200 bg-white hover:bg-slate-50"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <MessageCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                                  <div>
                                    <p className="text-xs font-semibold text-slate-900">
                                      Order via WhatsApp
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Logs order & opens direct merchant WhatsApp chat
                                    </p>
                                  </div>
                                </div>
                                <div
                                  className={cn(
                                    "h-4 w-4 rounded-full border-2",
                                    paymentMethod === "WHATSAPP"
                                      ? "border-emerald-600 bg-emerald-600"
                                      : "border-slate-300"
                                  )}
                                />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  ) : cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3 opacity-60">
                      <ShoppingBag className="h-12 w-12 text-slate-400" />
                      <p className="text-sm font-medium text-slate-600 leading-relaxed">
                        Your bag is empty.
                        <br />
                        Browse our catalog to add items.
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="flex-1 p-6">
                      <div className="space-y-4">
                        {shippingProgress.hasThreshold && (
                          <div
                            className={cn(
                              "p-3.5 rounded-xl border space-y-2 text-left",
                              shippingProgress.qualified
                                ? "bg-emerald-50 border-emerald-200"
                                : "bg-blue-50/70 border-blue-200"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                              <span className="flex items-center gap-1.5 text-slate-800">
                                <Truck
                                  className={cn(
                                    "h-4 w-4 shrink-0",
                                    shippingProgress.qualified
                                      ? "text-emerald-600"
                                      : "text-blue-600"
                                  )}
                                />
                                {shippingProgress.qualified
                                  ? "You unlocked free delivery"
                                  : `Add ${currencySymbol}${shippingProgress.remainingAmount.toLocaleString()} more for free delivery`}
                              </span>
                              <span className="text-xs font-mono tabular-nums text-slate-500">
                                {shippingProgress.progressPercent}%
                              </span>
                            </div>
                            <Progress
                              value={shippingProgress.progressPercent}
                              className="h-2"
                            />
                          </div>
                        )}

                        {cart.map((item) => (
                          <div
                            key={item.id}
                            className="flex gap-4 group p-3 rounded-xl bg-slate-50 border border-slate-200 text-left"
                          >
                            <div className="h-16 w-16 rounded-lg overflow-hidden bg-white shrink-0 border border-slate-200">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  referrerPolicy="no-referrer"
                                  className="h-full w-full object-cover"
                                  alt={item.name}
                                />
                              ) : (
                                <ImageIcon className="h-full w-full p-4 opacity-20" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-2 text-left">
                              <div className="flex justify-between items-start gap-2">
                                <h4 className="text-sm font-semibold text-slate-900 leading-tight line-clamp-1">
                                  {item.name}
                                </h4>
                                <button
                                  type="button"
                                  aria-label={`Remove ${item.name}`}
                                  onClick={() => updateCartQty(item.id, -item.quantity)}
                                  className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200">
                                  <button
                                    type="button"
                                    aria-label={`Decrease quantity of ${item.name}`}
                                    onClick={() => updateCartQty(item.id, -1)}
                                    className="h-6 w-6 rounded-md hover:bg-slate-100 flex items-center justify-center"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="text-xs font-semibold font-mono tabular-nums w-6 text-center">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    aria-label={`Increase quantity of ${item.name}`}
                                    onClick={() => updateCartQty(item.id, 1)}
                                    className="h-6 w-6 rounded-md hover:bg-slate-100 flex items-center justify-center"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                                <span className="text-sm font-bold font-mono tabular-nums text-primary">
                                  {currencySymbol}
                                  {(item.price * item.quantity).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Promo Code Box */}
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                              <Ticket className="h-3.5 w-3.5 text-primary" /> Promo Code
                            </span>
                            {cartPricing.appliedCouponCode && (
                              <button
                                type="button"
                                onClick={handleRemoveCoupon}
                                className="text-xs font-medium text-red-600 hover:underline"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          {cartPricing.appliedCouponCode ? (
                            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                              <span className="text-xs font-mono font-semibold text-emerald-800">
                                {cartPricing.appliedCouponCode}
                              </span>
                              <span className="text-xs font-semibold font-mono tabular-nums text-emerald-700">
                                -{currencySymbol}
                                {cartPricing.discountAmount.toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Input
                                aria-label="Promo code"
                                value={couponInput}
                                onChange={(e) =>
                                  setCouponInput(sanitizeCouponCode(e.target.value))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleApplyCoupon();
                                  }
                                }}
                                placeholder="Enter coupon code"
                                className="h-10 bg-white rounded-xl font-mono text-xs font-semibold uppercase"
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={isApplyingCoupon}
                                onClick={handleApplyCoupon}
                                className="h-10 px-4 rounded-xl text-xs font-medium shrink-0"
                              >
                                {isApplyingCoupon ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  "Apply"
                                )}
                              </Button>
                            </div>
                          )}
                          {couponFeedback && (
                            <p
                              className={cn(
                                "text-xs font-medium",
                                couponFeedback.type === "success"
                                  ? "text-emerald-700"
                                  : "text-red-600"
                              )}
                            >
                              {couponFeedback.text}
                            </p>
                          )}
                        </div>
                      </div>
                    </ScrollArea>
                  )}
                </div>

                {cart.length > 0 && checkoutStep !== "success" && (
                  <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4 shrink-0">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium text-slate-600">
                        <span>Items Subtotal ({cartStats.totalItems})</span>
                        <span className="font-mono tabular-nums">
                          {currencySymbol}
                          {cartPricing.subtotal.toLocaleString()}
                        </span>
                      </div>
                      {cartPricing.discountAmount > 0 && (
                        <div className="flex justify-between text-xs font-medium text-emerald-700">
                          <span>
                            Promo Discount ({cartPricing.appliedCouponCode})
                          </span>
                          <span className="font-mono tabular-nums">
                            -{currencySymbol}
                            {cartPricing.discountAmount.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {(shippingConfig.shippingFee > 0 ||
                        shippingConfig.freeShippingThreshold > 0) && (
                        <div className="flex justify-between text-xs font-medium text-slate-600">
                          <span>Shipping</span>
                          <span
                            className={cn(
                              "font-mono tabular-nums",
                              cartPricing.shippingFee === 0 && "text-emerald-700 font-semibold"
                            )}
                          >
                            {cartPricing.shippingFee === 0
                              ? "FREE"
                              : `${currencySymbol}${cartPricing.shippingFee.toLocaleString()}`}
                          </span>
                        </div>
                      )}
                      {checkoutStep === "info" &&
                        paymentMethod === "COD" &&
                        cartPricing.codFee > 0 && (
                          <div className="flex justify-between text-xs font-medium text-slate-600">
                            <span>COD Handling Fee</span>
                            <span className="font-mono tabular-nums">
                              {currencySymbol}
                              {cartPricing.codFee.toLocaleString()}
                            </span>
                          </div>
                        )}
                      <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                        <span>Order Total</span>
                        <span className="font-mono tabular-nums">
                          {currencySymbol}
                          {cartPricing.grandTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {checkoutStep === "cart" ? (
                        <>
                          <Button
                            onClick={() => handleProceedToInfo("ONLINE")}
                            className="w-full h-12 text-white font-semibold text-sm rounded-xl transition-colors"
                            style={{ backgroundColor: primaryColor }}
                          >
                            Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                          {whatsappOrderEnabled && (
                            <Button
                              variant="outline"
                              onClick={() => handleProceedToInfo("WHATSAPP")}
                              className="w-full h-11 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 font-semibold text-xs gap-2 rounded-xl"
                            >
                              <MessageCircle className="h-4 w-4" /> Checkout via WhatsApp
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          onClick={handlePlaceOrder}
                          disabled={
                            isPlacingOrder ||
                            !customerInfo.name.trim() ||
                            customerInfo.phone.trim().length < 10
                          }
                          className="w-full h-12 text-white font-semibold text-sm rounded-xl transition-colors font-mono tabular-nums"
                          style={{
                            backgroundColor:
                              paymentMethod === "WHATSAPP"
                                ? "#059669"
                                : primaryColor,
                          }}
                        >
                          {isPlacingOrder ? (
                            <Loader2 className="animate-spin h-5 w-5 mr-2" />
                          ) : paymentMethod === "WHATSAPP" ? (
                            <MessageCircle className="h-5 w-5 mr-2" />
                          ) : paymentMethod === "COD" ? (
                            <Banknote className="h-5 w-5 mr-2" />
                          ) : (
                            <Zap className="h-5 w-5 mr-2 fill-current" />
                          )}
                          {paymentMethod === "COD"
                            ? `Place COD Order (${currencySymbol}${cartPricing.grandTotal.toLocaleString()})`
                            : paymentMethod === "WHATSAPP"
                              ? `Send Order on WhatsApp (${currencySymbol}${cartPricing.grandTotal.toLocaleString()})`
                              : `Pay & Place Order (${currencySymbol}${cartPricing.grandTotal.toLocaleString()})`}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Dynamic Storefront Sections Rendered in Configured Order */}
      {activeSections.map((section) => renderSection(section))}

      {/* Recently Viewed Products Strip */}
      {recentlyViewedProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-12 pt-2">
          <div className="flex items-center justify-between mb-5 px-1">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <h2
                className={cn(
                  "text-lg font-semibold tracking-tight",
                  isDarkSurface ? "text-white" : "text-slate-900"
                )}
                style={{ fontFamily: storeFonts.headingFont }}
              >
                Recently Viewed
              </h2>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Pick up where you left off
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {recentlyViewedProducts.map((item: any) => {
              const img = getProductGalleryImages(item).find((u) => !brokenImageUrls[u]) || "";
              const itemPrice = item.onlinePrice ?? item.price ?? 0;
              return (
                <Card
                  key={item.id}
                  onClick={() => setSelectedProductId(item.id)}
                  className={cn(
                    "cursor-pointer overflow-hidden p-3 flex items-center gap-3 transition-colors",
                    cardRadiusClass,
                    cardSurfaceClass
                  )}
                >
                  <div className="h-14 w-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                    {img ? (
                      <img
                        src={img}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        onError={() => markImageBroken(img)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span
                        className="h-full w-full flex items-center justify-center font-semibold text-white text-sm"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {item.name?.charAt(0) || "P"}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <p
                      className={cn(
                        "text-sm font-semibold truncate",
                        isDarkSurface ? "text-white" : "text-slate-900"
                      )}
                    >
                      {item.name}
                    </p>
                    <p
                      className="text-xs font-bold mt-0.5 font-mono tabular-nums"
                      style={{ color: isDarkSurface ? "#93C5FD" : primaryColor }}
                    >
                      {currencySymbol}
                      {itemPrice.toLocaleString()}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer
        className={cn(
          "border-t py-12 text-left",
          isDarkSurface
            ? "bg-slate-900 border-slate-800 text-slate-200"
            : isWarmSurface
              ? "bg-[#F4EFE7] border-stone-200 text-stone-800"
              : "bg-white border-slate-200 text-slate-800"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 space-y-8">
          {footerConfig.showTrustHighlights && footerConfig.trustHighlights.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b border-current/10">
              {footerConfig.trustHighlights.map((highlight, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold">{highlight}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-md">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={storeDisplayName}
                    referrerPolicy="no-referrer"
                    className="h-8 w-8 rounded-lg object-cover border border-slate-200"
                  />
                ) : (
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {storeDisplayName.charAt(0)}
                  </div>
                )}
                <span
                  className="font-semibold text-sm"
                  style={{ fontFamily: storeFonts.headingFont }}
                >
                  {storeDisplayName}
                </span>
              </div>
              <p className="text-xs opacity-75 leading-relaxed">{footerConfig.tagline}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setTrackOrderError(null);
                  setIsTrackModalOpen(true);
                }}
                className={cn(
                  "h-9 text-xs font-medium gap-1.5",
                  buttonRadiusClass,
                  isDarkSurface ? "border-slate-700 bg-slate-800 text-white" : ""
                )}
              >
                <PackageCheck className="h-3.5 w-3.5" /> Track Order
              </Button>
              {footerConfig.instagramUrl && (
                <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-full" aria-label="Instagram">
                  <a href={footerConfig.instagramUrl} target="_blank" rel="noopener noreferrer">
                    <Instagram className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {footerConfig.facebookUrl && (
                <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-full" aria-label="Facebook">
                  <a href={footerConfig.facebookUrl} target="_blank" rel="noopener noreferrer">
                    <Facebook className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {footerConfig.youtubeUrl && (
                <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-full" aria-label="YouTube">
                  <a href={footerConfig.youtubeUrl} target="_blank" rel="noopener noreferrer">
                    <Youtube className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-current/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs opacity-80">
            <span>
              © {new Date().getFullYear()} {storeDisplayName}. All Rights Reserved.
            </span>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setPolicyModalTab("shipping")}
                className="hover:underline underline-offset-2"
              >
                Shipping Policy
              </button>
              <button
                type="button"
                onClick={() => setPolicyModalTab("return")}
                className="hover:underline underline-offset-2"
              >
                Returns &amp; Refunds
              </button>
              <button
                type="button"
                onClick={() => setPolicyModalTab("privacy")}
                className="hover:underline underline-offset-2"
              >
                Privacy &amp; Terms
              </button>
              {merchantPhoneDisplay && (
                <span className="font-mono tabular-nums">Desk: {merchantPhoneDisplay}</span>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* --- PRODUCT DETAIL OVERLAY SHEET --- */}
      <Sheet
        open={Boolean(selectedProductId)}
        onOpenChange={(o) => !o && setSelectedProductId(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl p-0 flex flex-col border-l border-slate-200 bg-white text-left"
        >
          {viewingProduct ? (
            <>
              <SheetHeader className="p-6 md:p-8 bg-slate-900 text-white shrink-0 relative text-left">
                <div className="flex justify-between items-center mb-5">
                  <span className="text-xs font-mono tabular-nums text-slate-300">
                    SKU: {viewingProduct.sku || viewingProduct.id.slice(-6).toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={
                        wishlistIds.includes(viewingProduct.id)
                          ? `Remove ${viewingProduct.name} from saved items`
                          : `Save ${viewingProduct.name} to wishlist`
                      }
                      className={cn(
                        "h-9 w-9 rounded-full",
                        wishlistIds.includes(viewingProduct.id)
                          ? "bg-rose-500 text-white hover:bg-rose-600"
                          : "bg-white/10 text-white hover:bg-white/20"
                      )}
                      onClick={(e) => handleToggleWishlist(viewingProduct, e)}
                    >
                      <Heart
                        className={cn(
                          "h-4 w-4",
                          wishlistIds.includes(viewingProduct.id) && "fill-current"
                        )}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Share Product"
                      className="h-9 w-9 rounded-full bg-white/10 text-white hover:bg-white/20"
                      title="Share Product"
                      onClick={(e) => handleShareProduct(viewingProduct, e)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <SheetClose className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20">
                      <X className="h-5 w-5" />
                    </SheetClose>
                  </div>
                </div>
                <div className="flex items-center gap-4 relative z-10 text-left">
                  <div className="h-14 w-14 rounded-xl bg-white flex items-center justify-center text-primary font-semibold text-xl shrink-0">
                    {viewingProduct.name?.charAt(0)}
                  </div>
                  <div className="space-y-1 text-left min-w-0">
                    <SheetTitle
                      className="text-xl sm:text-2xl font-semibold text-white tracking-tight leading-tight"
                      style={{ fontFamily: storeFonts.headingFont }}
                    >
                      {viewingProduct.name}
                    </SheetTitle>
                    <p className="text-slate-300 text-xs font-medium">
                      {viewingProduct.category || "General"}
                    </p>
                  </div>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1">
                <div className="p-6 md:p-8 space-y-6 text-left">
                  {(() => {
                    const gallery = getProductGalleryImages(viewingProduct).filter(
                      (imgUrl) => !brokenImageUrls[imgUrl]
                    );
                    const currentImg =
                      gallery[Math.min(activeGalleryIdx, Math.max(0, gallery.length - 1))] || "";

                    return (
                      <div className="space-y-3">
                        <div className="aspect-[1.5/1] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                          {currentImg ? (
                            <img
                              src={currentImg}
                              referrerPolicy="no-referrer"
                              onError={() => markImageBroken(currentImg)}
                              className="h-full w-full object-cover"
                              alt={viewingProduct.name}
                            />
                          ) : (
                            <div
                              className="h-full w-full flex flex-col items-center justify-center gap-3 p-8 text-center"
                              style={{
                                background: `linear-gradient(135deg, ${primaryColor}18, ${primaryColor}08)`,
                              }}
                            >
                              <div
                                className="h-20 w-20 rounded-2xl flex items-center justify-center text-white font-semibold text-3xl"
                                style={{ backgroundColor: primaryColor }}
                              >
                                {viewingProduct.name?.charAt(0) || "P"}
                              </div>
                              <p className="text-xs font-medium text-slate-600">
                                {viewingProduct.category || "Official Product"}
                              </p>
                            </div>
                          )}
                        </div>
                        {gallery.length > 1 && (
                          <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                            {gallery.map((imgUrl, idx) => (
                              <button
                                key={imgUrl}
                                type="button"
                                aria-label={`View image ${idx + 1} of ${viewingProduct.name}`}
                                onClick={() => setActiveGalleryIdx(idx)}
                                className={cn(
                                  "h-16 w-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all",
                                  idx === activeGalleryIdx
                                    ? "ring-2 ring-offset-1"
                                    : "border-slate-200 opacity-70 hover:opacity-100"
                                )}
                                style={
                                  idx === activeGalleryIdx
                                    ? { borderColor: primaryColor }
                                    : undefined
                                }
                              >
                                <img
                                  src={imgUrl}
                                  alt={`${viewingProduct.name} view ${idx + 1}`}
                                  referrerPolicy="no-referrer"
                                  onError={() => markImageBroken(imgUrl)}
                                  className="h-full w-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-center text-left">
                      <p className="text-xs font-medium text-slate-500">
                        Online Price
                      </p>
                      <p className="text-2xl font-bold font-mono tabular-nums text-primary mt-1">
                        {currencySymbol}
                        {(
                          viewingProduct.onlinePrice ?? viewingProduct.price
                        ).toLocaleString()}
                      </p>
                      {viewingProduct.onlinePrice !== undefined &&
                        viewingProduct.onlinePrice < viewingProduct.price &&
                        showDiscount && (
                          <p className="text-xs text-slate-500 line-through font-mono tabular-nums mt-0.5">
                            {currencySymbol}
                            {viewingProduct.price.toLocaleString()}
                          </p>
                        )}
                    </div>
                    <div className="p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-center text-left">
                      <p className="text-xs font-medium text-slate-500">
                        Stock Availability
                      </p>
                      <span
                        className={cn(
                          "w-fit inline-flex items-center rounded-md text-xs font-semibold font-mono tabular-nums px-2.5 py-1 mt-2",
                          viewingProduct.stock > (viewingProduct.minThreshold || 2)
                            ? "bg-emerald-100 text-emerald-800"
                            : viewingProduct.stock > 0
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-200 text-slate-700"
                        )}
                      >
                        {viewingProduct.stock > 0
                          ? `${viewingProduct.stock} ${viewingProduct.stock === 1 ? "Unit" : "Units"} in Stock`
                          : "Waitlist Only"}
                      </span>
                    </div>
                  </div>

                  <Separator className="opacity-40" />

                  <div className="space-y-3 text-left">
                    <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" /> Description & Specs
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed text-left whitespace-pre-line">
                      {viewingProduct.description ||
                        "Official product specifications verified by the merchant. Contact us via WhatsApp for instant inquiries."}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1 text-left">
                      <span className="text-xs font-medium text-slate-500">
                        Product SKU
                      </span>
                      <span className="text-xs font-mono tabular-nums font-semibold text-slate-900">
                        {viewingProduct.sku || "N/A"}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1 text-left">
                      <span className="text-xs font-medium text-slate-500">
                        Category
                      </span>
                      <span className="text-xs font-semibold text-slate-900">
                        {viewingProduct.category || "General"}
                      </span>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <SheetFooter className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
                <Button
                  className="flex-1 h-12 bg-primary text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                  style={{ backgroundColor: primaryColor }}
                  disabled={viewingProduct.stock <= 0}
                  onClick={() => {
                    addToCart(viewingProduct);
                    setSelectedProductId(null);
                  }}
                >
                  <Plus className="h-4 w-4" /> Add to Bag
                </Button>
                <Button
                  className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                  disabled={viewingProduct.stock <= 0}
                  onClick={() => handleBuyNow(viewingProduct)}
                >
                  <Zap className="h-4 w-4 fill-current" /> Buy Now
                </Button>
                {whatsappOrderEnabled && (
                  <Button
                    variant="outline"
                    aria-label="Order on WhatsApp"
                    className="h-12 w-12 rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors shrink-0"
                    title="Order on WhatsApp"
                    onClick={(e) => handleOrderOnWhatsAppDirect(viewingProduct, e)}
                  >
                    <MessageCircle className="h-5 w-5" />
                  </Button>
                )}
              </SheetFooter>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-20 opacity-30">
              <Loader2 className="animate-spin h-10 w-10 text-primary" />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* --- TRACK ORDER MODAL --- */}
      <Dialog open={isTrackModalOpen} onOpenChange={setIsTrackModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-0 overflow-hidden bg-white [&>button]:text-white [&>button]:opacity-85 [&>button]:hover:opacity-100">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <DialogTitle className="text-lg font-semibold tracking-tight flex items-center gap-2 text-white">
              <PackageCheck className="h-5 w-5 text-accent" /> Track Your Order
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs">
              Enter your Order ID (full or last 8 characters) and the checkout phone number.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-5 text-left max-h-[75vh] overflow-y-auto">
            <form onSubmit={handleTrackOrder} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="track-order-id"
                    className="text-xs font-medium text-slate-600"
                  >
                    Order ID *
                  </Label>
                  <Input
                    id="track-order-id"
                    value={trackOrderIdInput}
                    onChange={(e) => setTrackOrderIdInput(e.target.value)}
                    placeholder="ORD-1775660965-4821"
                    className="h-11 rounded-xl font-mono tabular-nums text-xs font-semibold uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="track-order-phone"
                    className="text-xs font-medium text-slate-600"
                  >
                    Checkout Phone *
                  </Label>
                  <Input
                    id="track-order-phone"
                    value={trackPhoneInput}
                    onChange={(e) =>
                      setTrackPhoneInput(e.target.value.replace(/[^\d+\s-]/g, ""))
                    }
                    placeholder="9876543210"
                    className="h-11 rounded-xl font-mono tabular-nums text-xs font-semibold"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={isTrackingOrder}
                style={{ backgroundColor: primaryColor }}
                className="w-full h-11 rounded-xl text-white font-semibold text-sm"
              >
                {isTrackingOrder ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Check Order Status
              </Button>
            </form>

            {trackOrderError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{trackOrderError}</span>
              </div>
            )}

            {trackedOrder && (
              <div className="space-y-4 pt-2 border-t border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Order Reference
                    </p>
                    <p className="text-sm font-mono tabular-nums font-semibold text-slate-900">
                      {trackedOrder.orderId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="text-slate-600">{trackedOrder.paymentMethod}</span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span
                      className={cn(
                        "font-semibold",
                        trackedOrder.status === "delivered"
                          ? "text-emerald-700"
                          : trackedOrder.status === "cancelled" ||
                              trackedOrder.status === "refunded"
                            ? "text-red-700"
                            : "text-blue-700"
                      )}
                    >
                      {trackedOrder.status}
                    </span>
                  </div>
                </div>

                {/* Progress Stepper */}
                {trackedOrder.status === "cancelled" ||
                trackedOrder.status === "refunded" ? (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800">
                    This order is currently marked as {trackedOrder.status}.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: "created", label: "Placed" },
                      { key: "processing", label: "Packed" },
                      { key: "shipped", label: "Shipped" },
                      { key: "delivered", label: "Delivered" },
                    ].map((step, idx) => {
                      const orderRank: Record<string, number> = {
                        created: 0,
                        paid: 0,
                        processing: 1,
                        shipped: 2,
                        delivered: 3,
                      };
                      const currentRank =
                        orderRank[trackedOrder.status.toLowerCase()] ?? 0;
                      const done = idx <= currentRank;
                      return (
                        <div
                          key={step.key}
                          className={cn(
                            "p-2.5 rounded-xl border text-center space-y-1",
                            done
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                              : "bg-slate-50 border-slate-200 text-slate-400"
                          )}
                        >
                          <CheckCircle2
                            className={cn(
                              "h-4 w-4 mx-auto",
                              done ? "text-emerald-600" : "text-slate-300"
                            )}
                          />
                          <p className="text-xs font-medium">{step.label}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(trackedOrder.courierName || trackedOrder.trackingNumber) && (
                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Truck className="h-4 w-4 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-blue-900">
                          {trackedOrder.courierName || "Courier Dispatch"}
                        </p>
                        <p className="text-xs font-mono tabular-nums font-medium text-blue-700">
                          {trackedOrder.trackingNumber || "Awaiting AWB"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <p className="text-xs font-medium text-slate-500">
                    Items & Summary
                  </p>
                  <div className="space-y-1 text-xs">
                    {trackedOrder.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between font-medium">
                        <span>
                          {it.name} × {it.quantity}
                        </span>
                        <span className="font-mono tabular-nums font-semibold">
                          {currencySymbol}
                          {it.lineTotal.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="space-y-1 text-xs">
                    {trackedOrder.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>
                          Discount
                          {trackedOrder.couponCode ? ` (${trackedOrder.couponCode})` : ""}
                        </span>
                        <span className="font-mono tabular-nums">
                          -{currencySymbol}
                          {trackedOrder.discountAmount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {trackedOrder.shippingFee > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Shipping</span>
                        <span className="font-mono tabular-nums">
                          {currencySymbol}
                          {trackedOrder.shippingFee.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {trackedOrder.codFee > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>COD Fee</span>
                        <span className="font-mono tabular-nums">
                          {currencySymbol}
                          {trackedOrder.codFee.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-slate-900 pt-1">
                      <span>Total Amount</span>
                      <span className="font-mono tabular-nums">
                        {currencySymbol}
                        {trackedOrder.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {trackedOrder.statusHistory.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-slate-500">
                      Timeline Updates
                    </p>
                    <div className="space-y-1.5">
                      {trackedOrder.statusHistory.map((h, i) => (
                        <div
                          key={i}
                          className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 flex justify-between gap-2"
                        >
                          <span className="font-medium text-slate-700">
                            <span className="font-semibold text-primary">{h.status}</span>
                            {h.note ? ` — ${h.note}` : ""}
                          </span>
                          {h.changedAt && (
                            <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                              {new Date(h.changedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* --- SAVED ITEMS / WISHLIST DRAWER --- */}
      <Sheet open={isWishlistOpen} onOpenChange={setIsWishlistOpen}>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col border-l border-slate-200 bg-white text-left">
          <SheetHeader className="p-6 bg-slate-900 text-white shrink-0 text-left">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-rose-400 fill-current" />
              <SheetTitle className="text-white text-lg font-semibold tracking-tight font-mono tabular-nums">
                Saved Items ({wishlistProducts.length})
              </SheetTitle>
            </div>
            <SheetDescription className="text-slate-400 text-xs mt-1">
              Bookmark favorites and move them to your bag anytime
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 p-6">
            {wishlistProducts.length === 0 ? (
              <div className="py-16 text-center space-y-3 opacity-70">
                <Heart className="h-12 w-12 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">
                  No saved items yet
                </p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Tap the heart icon on any product card to save it here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {wishlistProducts.map((p: any) => {
                  const pImg = getProductGalleryImages(p)[0] || "";
                  const pPrice = p.onlinePrice ?? p.price ?? 0;
                  const out = (p.stock || 0) <= 0;
                  return (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3.5 text-left"
                    >
                      <div
                        onClick={() => {
                          setIsWishlistOpen(false);
                          setSelectedProductId(p.id);
                        }}
                        className="h-16 w-16 rounded-lg overflow-hidden bg-slate-200 shrink-0 cursor-pointer flex items-center justify-center"
                      >
                        {pImg && !brokenImageUrls[pImg] ? (
                          <img
                            src={pImg}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            onError={() => markImageBroken(pImg)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span
                            className="h-full w-full flex items-center justify-center font-semibold text-white text-base"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {p.name?.charAt(0) || "P"}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {p.name}
                        </p>
                        <p className="text-xs font-bold font-mono tabular-nums" style={{ color: primaryColor }}>
                          {currencySymbol}
                          {pPrice.toLocaleString()}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            disabled={out}
                            onClick={() => addToCart(p, true)}
                            style={{ backgroundColor: primaryColor }}
                            className="h-8 px-3 text-xs font-medium text-white rounded-lg"
                          >
                            {out ? "Out of Stock" : "Add to Bag"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleWishlist(p)}
                            className="h-8 px-2 text-xs font-medium text-rose-600"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* --- STORE POLICIES & SUPPORT MODAL --- */}
      <Dialog
        open={Boolean(policyModalTab)}
        onOpenChange={(open) => !open && setPolicyModalTab(null)}
      >
        <DialogContent className="sm:max-w-lg rounded-2xl p-0 overflow-hidden bg-white [&>button]:text-white [&>button]:opacity-85 [&>button]:hover:opacity-100">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <DialogTitle className="text-lg font-semibold tracking-tight flex items-center gap-2 text-white">
              <FileText className="h-5 w-5 text-accent" /> {storeDisplayName} Policies
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs">
              Support Hours: {policyConfig.supportHours}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-5 text-left">
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "shipping" as const, label: "Shipping" },
                { id: "return" as const, label: "Returns" },
                { id: "privacy" as const, label: "Privacy" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPolicyModalTab(tab.id)}
                  className={cn(
                    "h-9 rounded-xl text-xs font-medium border transition-colors",
                    policyModalTab === tab.id
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {policyModalTab === "shipping"
                ? policyConfig.shippingPolicy
                : policyModalTab === "return"
                  ? policyConfig.returnPolicy
                  : policyConfig.privacyPolicy}
            </div>

            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 font-medium font-mono tabular-nums">
              {merchantPhoneDisplay && <span>Phone: {merchantPhoneDisplay}</span>}
              {merchantEmailDisplay && <span>Email: {merchantEmailDisplay}</span>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
