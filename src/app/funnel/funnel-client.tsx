"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Banknote,
  BellRing,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  Flame,
  Gift,
  HelpCircle,
  Layers,
  ListChecks,
  Loader2,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Minus,
  PackageCheck,
  Phone,
  PlayCircle,
  Plus,
  Receipt,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Target,
  Ticket,
  Truck,
  XCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/firebase";
import { cn, getCurrencySymbol } from "@/lib/utils";
import {
  buildGoogleMapsPlaceUrl,
  buildWhatsAppUrl,
  computeFreeShippingProgress,
  computeStoreOrderPricing,
  DEFAULT_COMPARISON_ROWS,
  DEFAULT_FAQ_ITEMS,
  DEFAULT_HOW_IT_WORKS_STEPS,
  DEFAULT_PRICING_TIERS,
  DEFAULT_STACK_ITEMS,
  DEFAULT_TRUST_ITEMS,
  deriveStorefrontCategorySummaries,
  evaluateCouponDiscount,
  extractYouTubeVideoId,
  FunnelPricingTier,
  getProductGalleryImages,
  getStoreFontFamilies,
  isValidGa4MeasurementId,
  isValidMetaPixelId,
  normalizeAnnouncementBar,
  normalizeFooterConfig,
  normalizeStoreCoupons,
  normalizeStorePolicyConfig,
  normalizeStoreShippingConfig,
  normalizeStoreThemeConfig,
  normalizeStoreTrackingConfig,
  resolveMerchantWhatsAppPhone,
  resolveStorePreviewUrl,
  sanitizeCouponCode,
  StoreFunnelConfig,
  StoreSection,
} from "@/lib/storefront-engine";
import { ProductSeoData } from "@/lib/storefront-seo";
import {
  createStorefrontOrder,
  recordStorefrontEvent,
  StorePaymentMethod,
  subscribeStorefrontLead,
  validateStorefrontCoupon,
} from "@/app/actions/storefront-actions";

interface FunnelClientProps {
  businessId: string | null;
  initialBusiness: Record<string, any> | null;
  funnel: StoreFunnelConfig | null;
  storeSettings: Record<string, any> | null;
  initialProducts: ProductSeoData[];
  isPreview: boolean;
  isPubliclyVisible: boolean;
}

function openExternalLinkSafely(url: string) {
  if (!url || typeof document === "undefined") return;
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function FunnelClient({
  businessId,
  initialBusiness,
  funnel,
  storeSettings,
  initialProducts,
  isPreview,
  isPubliclyVisible,
}: FunnelClientProps) {
  const { toast } = useToast();
  const { user } = useUser();

  const safeProducts = useMemo(
    () => (Array.isArray(initialProducts) ? initialProducts.filter((p) => !p.isArchived) : []),
    [initialProducts]
  );

  const normalizedStore = useMemo(() => {
    const raw = storeSettings || {};
    return {
      storeName: raw.storeName || initialBusiness?.name || "Direct Store",
      slug: raw.slug || initialBusiness?.slug || "",
      logoUrl: raw.logoUrl || initialBusiness?.logoUrl || "",
      primaryColor: raw.primaryColor || "#0C83B3",
      uiStyle: raw.uiStyle || "modern",
      contactPhone: raw.contactPhone || initialBusiness?.phone || "",
      contactEmail: raw.contactEmail || initialBusiness?.email || "",
      storeAddress: raw.storeAddress || initialBusiness?.address || "",
      whatsappOrderEnabled: raw.whatsappOrderEnabled ?? true,
      codEnabled: raw.codEnabled ?? true,
      showDiscount: raw.showDiscount ?? true,
      coupons: normalizeStoreCoupons(raw.coupons),
      shippingConfig: normalizeStoreShippingConfig(raw.shippingConfig),
      themeConfig: normalizeStoreThemeConfig(raw.themeConfig, raw.uiStyle),
      announcementBar: normalizeAnnouncementBar(raw.announcementBar),
      footerConfig: normalizeFooterConfig(raw.footerConfig),
      trackingConfig: normalizeStoreTrackingConfig(raw.trackingConfig),
      policyConfig: normalizeStorePolicyConfig(raw.policyConfig),
    };
  }, [storeSettings, initialBusiness]);

  const accentColor = useMemo(() => {
    if (funnel && !funnel.inheritStoreTheme && funnel.accentColorOverride) {
      return funnel.accentColorOverride;
    }
    return normalizedStore.primaryColor || "#0C83B3";
  }, [funnel, normalizedStore.primaryColor]);

  const themeConfig = normalizedStore.themeConfig;
  const fontInfo = useMemo(
    () => getStoreFontFamilies(themeConfig.fontPair),
    [themeConfig.fontPair]
  );

  const radiusClass =
    themeConfig.cardRadius === "sharp"
      ? "rounded-none"
      : themeConfig.cardRadius === "soft"
        ? "rounded-2xl"
        : "rounded-lg";

  const buttonShapeClass =
    themeConfig.buttonStyle === "pill"
      ? "rounded-full"
      : themeConfig.cardRadius === "sharp"
        ? "rounded-none"
        : "rounded-xl";

  const isCharcoal = themeConfig.themeSurface === "charcoal";
  const surfaceBgClass = isCharcoal
    ? "bg-slate-950 text-slate-100"
    : (themeConfig.themeSurface as string) === "warm"
      ? "bg-[#FCF9F4] text-slate-900"
      : "bg-slate-50 text-slate-900";

  const cardSurfaceClass = isCharcoal
    ? "bg-slate-900 border-slate-800 text-slate-100"
    : "bg-white border-slate-200/80 text-slate-900";

  const mutedTextClass = isCharcoal ? "text-slate-400" : "text-slate-600";

  const currencySymbol = getCurrencySymbol(initialBusiness?.currency);
  const merchantWaDigits = resolveMerchantWhatsAppPhone({
    contactPhone: normalizedStore.contactPhone,
    businessPhone: initialBusiness?.phone,
  });

  const activeSections = useMemo(
    () => (funnel?.sections || []).filter((s) => s.status === "Active"),
    [funnel?.sections]
  );

  const expressCheckoutSection = useMemo(
    () => activeSections.find((s) => s.type === "express_checkout"),
    [activeSections]
  );

  const offerStackSection = useMemo(
    () => activeSections.find((s) => s.type === "offer_stack"),
    [activeSections]
  );

  // Resolve Target Product & Order Bump Product from real catalog
  const defaultTargetProduct = useMemo(() => {
    if (funnel?.targetProductId) {
      const matched = safeProducts.find((p) => p.id === funnel.targetProductId);
      if (matched) return matched;
    }
    return safeProducts.find((p) => p.stock > 0) || safeProducts[0] || null;
  }, [funnel?.targetProductId, safeProducts]);

  const [selectedProductId, setSelectedProductId] = useState<string>(
    defaultTargetProduct?.id || ""
  );

  useEffect(() => {
    if (defaultTargetProduct?.id && !selectedProductId) {
      setSelectedProductId(defaultTargetProduct.id);
    }
  }, [defaultTargetProduct?.id, selectedProductId]);

  const selectedProduct = useMemo(() => {
    return (
      safeProducts.find((p) => p.id === selectedProductId) || defaultTargetProduct
    );
  }, [safeProducts, selectedProductId, defaultTargetProduct]);

  const orderBumpProduct = useMemo(() => {
    const configuredId =
      expressCheckoutSection?.content?.orderBumpProductId ||
      funnel?.orderBumpProductId ||
      "";
    if (configuredId) {
      const match = safeProducts.find((p) => p.id === configuredId);
      if (match) return match;
    }
    return null;
  }, [expressCheckoutSection?.content?.orderBumpProductId, funnel?.orderBumpProductId, safeProducts]);

  // Checkout / Order Bump / Pricing Tier State
  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const [selectedTier, setSelectedTier] = useState<FunnelPricingTier | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [orderBumpChecked, setOrderBumpChecked] = useState<boolean>(false);

  const [couponInput, setCouponInput] = useState<string>(funnel?.couponCode || "");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<StorePaymentMethod>(
    normalizedStore.codEnabled ? "COD" : "ONLINE"
  );
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderId: string;
    totalAmount: number;
    paymentLabel: string;
  } | null>(null);

  // Interactive UI state (FAQ accordion, Countdown, Lead Form, Policy Dialog)
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [leadName, setLeadName] = useState("");
  const [leadContact, setLeadContact] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadSuccessMsg, setLeadSuccessMsg] = useState<string | null>(null);
  const [activePolicyModal, setActivePolicyModal] = useState<
    "shipping" | "returns" | "privacy" | null
  >(null);

  // Countdown tick for Flash Sale Timer
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [fallbackDeadlineMs] = useState<number>(() => Date.now() + 12 * 3600 * 1000);
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Session ID + Initial Page View Telemetry
  const [sessionId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const existing = sessionStorage.getItem("biztrix_funnel_session");
      if (existing) return existing;
      const fresh = `fnl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      sessionStorage.setItem("biztrix_funnel_session", fresh);
      return fresh;
    }
    return `fnl_${Date.now()}`;
  });

  useEffect(() => {
    if (!businessId || !funnel || !isPubliclyVisible) return;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    recordStorefrontEvent({
      businessId,
      eventName: "page_view",
      sessionId,
      device: isMobile ? "mobile" : "desktop",
      funnelId: funnel.id,
      funnelSlug: funnel.slug,
      data: {
        funnelName: funnel.name,
        templateId: funnel.templateId,
      },
    }).catch(() => {});
  }, [businessId, funnel, isPubliclyVisible, sessionId]);

  // Auto-apply default funnel coupon if valid
  useEffect(() => {
    if (!funnel?.couponCode || appliedCouponCode) return;
    const basePrice = Number(
      selectedProduct?.onlinePrice ??
        selectedProduct?.price ??
        offerStackSection?.content?.offerPrice ??
        999
    );
    const localEval = evaluateCouponDiscount({
      coupons: normalizedStore.coupons,
      code: funnel.couponCode,
      subtotal: basePrice * quantity,
    });
    if (localEval.valid && localEval.coupon) {
      setAppliedCouponCode(localEval.coupon.code);
      setCouponInput(localEval.coupon.code);
      setCouponFeedback({ ok: true, text: localEval.message });
    }
  }, [
    funnel?.couponCode,
    appliedCouponCode,
    normalizedStore.coupons,
    selectedProduct,
    offerStackSection?.content?.offerPrice,
    quantity,
  ]);

  // Effective Unit & Line Prices
  const effectiveUnitPrice = useMemo(() => {
    if (selectedProduct) {
      const online =
        selectedProduct.onlinePrice !== undefined && selectedProduct.onlinePrice !== null
          ? Number(selectedProduct.onlinePrice)
          : Number(selectedProduct.price) || 0;
      return Math.max(0, online);
    }
    if (offerStackSection?.content?.offerPrice) {
      return Number(offerStackSection.content.offerPrice);
    }
    return 999;
  }, [selectedProduct, offerStackSection]);

  const effectiveBumpPrice = useMemo(() => {
    if (orderBumpProduct) {
      return Number(
        orderBumpProduct.onlinePrice !== undefined && orderBumpProduct.onlinePrice !== null
          ? orderBumpProduct.onlinePrice
          : orderBumpProduct.price || 0
      );
    }
    return Number(expressCheckoutSection?.content?.orderBumpPrice ?? 199);
  }, [orderBumpProduct, expressCheckoutSection?.content?.orderBumpPrice]);

  const mainLineSubtotal = useMemo(() => {
    if (
      selectedTier &&
      quantity === Math.max(1, selectedTier.quantityMultiplier || 1)
    ) {
      return Math.max(0, Number(selectedTier.price) || effectiveUnitPrice * quantity);
    }
    return Math.max(0, effectiveUnitPrice * quantity);
  }, [selectedTier, quantity, effectiveUnitPrice]);

  const bumpLineAmount = orderBumpChecked ? Math.max(0, effectiveBumpPrice) : 0;
  const checkoutSubtotal = mainLineSubtotal + bumpLineAmount;

  const checkoutPricing = useMemo(
    () =>
      computeStoreOrderPricing({
        subtotal: checkoutSubtotal,
        coupons: normalizedStore.coupons,
        couponCode: appliedCouponCode,
        shippingConfig: normalizedStore.shippingConfig,
        paymentMethod,
      }),
    [
      checkoutSubtotal,
      normalizedStore.coupons,
      appliedCouponCode,
      normalizedStore.shippingConfig,
      paymentMethod,
    ]
  );

  const freeShippingProgress = useMemo(
    () =>
      computeFreeShippingProgress(
        Math.max(0, checkoutSubtotal - checkoutPricing.discountAmount),
        normalizedStore.shippingConfig
      ),
    [checkoutSubtotal, checkoutPricing.discountAmount, normalizedStore.shippingConfig]
  );

  const scrollToConversionTarget = () => {
    if (typeof document === "undefined") return;
    const checkoutEl = document.getElementById("funnel-checkout");
    const leadEl = document.getElementById("funnel-lead");
    const target = checkoutEl || leadEl;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSelectTier = (tier: FunnelPricingTier) => {
    const qty = Math.max(1, tier.quantityMultiplier || 1);
    setSelectedTierId(tier.id);
    setSelectedTier(tier);
    setQuantity(qty);
    toast({
      title: `${tier.name} Selected`,
      description: `Express Checkout updated (${qty}x pack · ${currencySymbol}${tier.price.toLocaleString()}).`,
    });
    if (typeof document !== "undefined") {
      document.getElementById("funnel-checkout")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const handleApplyCoupon = async (overrideCode?: string) => {
    const clean = sanitizeCouponCode(overrideCode ?? couponInput);
    if (!clean) {
      setCouponFeedback({ ok: false, text: "Enter a promo code first." });
      return;
    }
    setIsApplyingCoupon(true);
    try {
      const localEval = evaluateCouponDiscount({
        coupons: normalizedStore.coupons,
        code: clean,
        subtotal: checkoutSubtotal,
      });
      if (businessId) {
        const res = await validateStorefrontCoupon({
          businessId,
          code: clean,
          subtotal: checkoutSubtotal,
        });
        if (res.valid && res.code) {
          setAppliedCouponCode(res.code);
          setCouponInput(res.code);
          setCouponFeedback({ ok: true, text: res.message });
          setIsApplyingCoupon(false);
          return;
        }
        if (!localEval.valid) {
          setAppliedCouponCode(null);
          setCouponFeedback({ ok: false, text: res.message || localEval.message });
          setIsApplyingCoupon(false);
          return;
        }
      }

      if (localEval.valid && localEval.coupon) {
        setAppliedCouponCode(localEval.coupon.code);
        setCouponInput(localEval.coupon.code);
        setCouponFeedback({ ok: true, text: localEval.message });
      } else {
        setAppliedCouponCode(null);
        setCouponFeedback({ ok: false, text: localEval.message });
      }
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handlePlaceFunnelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !funnel) return;

    if (!customerInfo.name.trim() || customerInfo.phone.replace(/\D/g, "").length < 10) {
      toast({
        variant: "destructive",
        title: "Details Required",
        description: "Please enter your full name and a valid 10-digit WhatsApp/mobile number.",
      });
      return;
    }

    if (paymentMethod === "COD" && !customerInfo.address.trim()) {
      toast({
        variant: "destructive",
        title: "Delivery Address Required",
        description: "Please enter your complete street address & pincode for delivery.",
      });
      return;
    }

    if (!selectedProduct) {
      toast({
        variant: "destructive",
        title: "Product Unavailable",
        description:
          "Merchant has not linked an active online product to this funnel yet. Try WhatsApp inquiry below.",
      });
      return;
    }

    const orderItems: Array<{ productId: string; quantity: number }> = [
      { productId: selectedProduct.id, quantity },
    ];
    if (orderBumpChecked && orderBumpProduct && orderBumpProduct.id !== selectedProduct.id) {
      orderItems.push({ productId: orderBumpProduct.id, quantity: 1 });
    } else if (orderBumpChecked && orderBumpProduct && orderBumpProduct.id === selectedProduct.id) {
      orderItems[0].quantity += 1;
    }

    setIsPlacingOrder(true);
    try {
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      recordStorefrontEvent({
        businessId,
        eventName: "begin_checkout",
        sessionId,
        device: isMobile ? "mobile" : "desktop",
        funnelId: funnel.id,
        funnelSlug: funnel.slug,
        data: {
          productId: selectedProduct.id,
          quantity,
          orderBumpAdded: orderBumpChecked,
          paymentMethod,
        },
      }).catch(() => {});

      const idToken = user ? await user.getIdToken() : undefined;
      const result = await createStorefrontOrder({
        businessId,
        customerData: customerInfo,
        items: orderItems,
        paymentMethod,
        couponCode: checkoutPricing.appliedCouponCode || undefined,
        funnelId: funnel.id,
        funnelSlug: funnel.slug,
        isPreview,
        idToken,
      });

      if (!result.success || !result.orderId) {
        toast({
          variant: "destructive",
          title: "Order Failed",
          description: result.error || "Could not complete checkout. Please try again.",
        });
        setIsPlacingOrder(false);
        return;
      }

      const bizOrderId = result.orderId;
      const serverTotal = result.totalAmount ?? checkoutPricing.grandTotal;

      if (paymentMethod === "COD") {
        setConfirmedOrder({
          orderId: bizOrderId,
          totalAmount: serverTotal,
          paymentLabel: "Cash on Delivery",
        });
        toast({
          title: "Order Confirmed!",
          description: `Order ${bizOrderId} has been locked for dispatch.`,
        });
        setIsPlacingOrder(false);
        return;
      }

      if (paymentMethod === "WHATSAPP") {
        recordStorefrontEvent({
          businessId,
          eventName: "whatsapp_order_click",
          sessionId,
          device: isMobile ? "mobile" : "desktop",
          funnelId: funnel.id,
          funnelSlug: funnel.slug,
          data: { orderId: bizOrderId, amount: serverTotal },
        }).catch(() => {});

        const msg = [
          `Hello ${normalizedStore.storeName}!`,
          `I placed an order via *${funnel.name}*:`,
          `Order ID: *${bizOrderId}*`,
          `Item: ${selectedProduct.name} x ${quantity}${orderBumpChecked ? ` + Order Bump` : ""}`,
          `Estimated Total: ${currencySymbol}${serverTotal.toLocaleString()}`,
          `Name: ${customerInfo.name}`,
          `Phone: ${customerInfo.phone}`,
          customerInfo.address ? `Address: ${customerInfo.address}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        openExternalLinkSafely(buildWhatsAppUrl(merchantWaDigits, msg));
        setConfirmedOrder({
          orderId: bizOrderId,
          totalAmount: serverTotal,
          paymentLabel: "WhatsApp Direct Order",
        });
        setIsPlacingOrder(false);
        return;
      }

      // Online Razorpay Flow
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
        if (normalizedStore.codEnabled) setPaymentMethod("COD");
        toast({
          variant: "destructive",
          title: "Online Gateway Unavailable",
          description:
            payData.message ||
            "Online gateway is not configured yet. Please select Cash on Delivery or WhatsApp.",
        });
        setIsPlacingOrder(false);
        return;
      }

      const options = {
        key: payData.keyId,
        amount: payData.amount,
        currency: payData.currency,
        name: normalizedStore.storeName,
        description: `${funnel.name} · ${bizOrderId}`,
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
              recordStorefrontEvent({
                businessId,
                eventName: "purchase",
                sessionId,
                funnelId: funnel.id,
                funnelSlug: funnel.slug,
                data: {
                  orderId: bizOrderId,
                  amount: serverTotal,
                  currency: initialBusiness?.currency || "INR",
                },
              }).catch(() => {});
              setConfirmedOrder({
                orderId: bizOrderId,
                totalAmount: serverTotal,
                paymentLabel: "Online Paid (Razorpay)",
              });
              toast({
                title: "Payment Verified!",
                description: `Order ${bizOrderId} confirmed.`,
              });
            } else {
              toast({
                variant: "destructive",
                title: "Verification Failed",
                description: verifyData.message || "Payment verification failed.",
              });
            }
          } catch {
            toast({ variant: "destructive", title: "Payment Verification Error" });
          } finally {
            setIsPlacingOrder(false);
          }
        },
        prefill: {
          name: customerInfo.name,
          email: customerInfo.email,
          contact: customerInfo.phone,
        },
        theme: { color: accentColor },
        modal: {
          ondismiss: () => setIsPlacingOrder(false),
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch {
      toast({ variant: "destructive", title: "Checkout Error" });
      setIsPlacingOrder(false);
    }
  };

  const handleSubmitLead = async (e: React.FormEvent, sourceSectionId: string) => {
    e.preventDefault();
    if (!businessId || !funnel) return;
    setIsSubmittingLead(true);
    try {
      const res = await subscribeStorefrontLead({
        businessId,
        name: leadName,
        contact: leadContact,
        sourceSectionId,
        funnelId: funnel.id,
        funnelSlug: funnel.slug,
      });
      if (res.success) {
        setLeadSuccessMsg(res.message);
        setLeadName("");
        setLeadContact("");
        toast({ title: "Subscribed!", description: res.message });
      } else {
        toast({
          variant: "destructive",
          title: "Check Details",
          description: res.message,
        });
      }
    } finally {
      setIsSubmittingLead(false);
    }
  };

  // Offline / Unavailable State
  if (!businessId || !funnel || !isPubliclyVisible) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <Card className="max-w-md w-full border shadow-sm">
          <CardContent className="p-8 space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
              <Store className="h-7 w-7 text-slate-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Funnel Page Unavailable
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              This campaign page is either still in draft mode or does not match an active merchant funnel.
            </p>
            {businessId && (
              <Button asChild variant="outline" className="w-full font-bold">
                <Link href={resolveStorePreviewUrl({ businessId, isPreview })}>
                  Visit Main Storefront
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const storeHomeUrl = resolveStorePreviewUrl({
    slug: normalizedStore.slug,
    businessId,
    isPreview,
  });

  const targetGallery = getProductGalleryImages(selectedProduct);
  const heroPrimaryImg = themeConfig.heroImageUrl || targetGallery[0] || normalizedStore.logoUrl;

  const hasValidGa4 = isValidGa4MeasurementId(normalizedStore.trackingConfig.ga4MeasurementId);
  const hasValidMeta = isValidMetaPixelId(normalizedStore.trackingConfig.metaPixelId);

  return (
    <div
      className={cn("min-h-screen overflow-x-hidden pb-24", surfaceBgClass)}
      style={{ fontFamily: fontInfo.bodyFont }}
    >
      {/* External Tracking Pixels inherited from Storefront Manager */}
      {hasValidGa4 && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${normalizedStore.trackingConfig.ga4MeasurementId}`}
            strategy="afterInteractive"
          />
          <Script id="funnel-ga4" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${normalizedStore.trackingConfig.ga4MeasurementId}');`}
          </Script>
        </>
      )}
      {hasValidMeta && (
        <Script id="funnel-meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js'); fbq('init', '${normalizedStore.trackingConfig.metaPixelId}'); fbq('track', 'PageView');`}
        </Script>
      )}

      {/* Optional Store Announcement Strip */}
      {normalizedStore.announcementBar.enabled && normalizedStore.announcementBar.text && (
        <div
          className="px-4 py-2 text-center text-xs font-bold"
          style={{
            backgroundColor: normalizedStore.announcementBar.bgColor,
            color: normalizedStore.announcementBar.textColor,
          }}
        >
          <span>{normalizedStore.announcementBar.text}</span>
          {normalizedStore.announcementBar.ctaLabel && (
            <button
              type="button"
              onClick={scrollToConversionTarget}
              className="ml-2 underline font-black"
            >
              {normalizedStore.announcementBar.ctaLabel}
            </button>
          )}
        </div>
      )}

      {/* Distraction-Free Funnel Top Bar */}
      <header
        className={cn(
          "sticky top-0 z-40 border-b backdrop-blur-md",
          isCharcoal ? "bg-slate-950/90 border-slate-800" : "bg-white/95 border-slate-200/80"
        )}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {normalizedStore.logoUrl ? (
              <img
                src={normalizedStore.logoUrl}
                alt={normalizedStore.storeName}
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-lg object-cover border shrink-0 bg-white"
              />
            ) : (
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
                style={{ backgroundColor: accentColor }}
              >
                {normalizedStore.storeName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{normalizedStore.storeName}</p>
              <p className={cn("text-xs font-medium truncate", mutedTextClass)}>
                {isPreview ? "Preview Mode · Verified Store" : "Official Direct Offer"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {funnel.couponCode && (
              <span
                className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md border border-dashed text-xs font-mono font-semibold"
                style={{ borderColor: accentColor, color: accentColor }}
              >
                Code: {funnel.couponCode}
              </span>
            )}
            <Button
              type="button"
              size="sm"
              onClick={scrollToConversionTarget}
              className={cn("text-white font-semibold text-xs px-4 h-9", buttonShapeClass)}
              style={{ backgroundColor: accentColor }}
            >
              {funnel.stickyCtaLabel || "Claim Offer"}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Funnel Sections */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-10 sm:space-y-14">
        {activeSections.map((section: StoreSection) => {
          const c = section.content || {};

          // 1. HERO
          if (section.type === "hero") {
            return (
              <section
                key={section.id}
                className={cn(
                  "overflow-hidden border p-6 sm:p-10",
                  radiusClass,
                  isCharcoal
                    ? "bg-slate-900 border-slate-800"
                    : "bg-white border-slate-200"
                )}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  <div className="md:col-span-7 space-y-5 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: isCharcoal ? "#94A3B8" : accentColor }}>
                      {c.badgeText || "Exclusive Direct Offer"}
                    </p>

                    <h1
                      className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]"
                      style={{ fontFamily: fontInfo.headingFont }}
                    >
                      {c.title || funnel.name}
                    </h1>

                    <p className={cn("text-sm sm:text-base leading-relaxed", mutedTextClass)}>
                      {c.subtitle ||
                        `Order directly from ${normalizedStore.storeName} with fast dispatch, verified stock, and risk-free replacement backing.`}
                    </p>

                    {selectedProduct && (
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <span className="text-2xl font-bold font-mono tabular-nums" style={{ color: accentColor }}>
                          {currencySymbol}
                          {effectiveUnitPrice.toLocaleString()}
                        </span>
                        {Number(selectedProduct.price) > effectiveUnitPrice && (
                          <span className={cn("text-base line-through font-semibold font-mono tabular-nums", mutedTextClass)}>
                            {currencySymbol}
                            {Number(selectedProduct.price).toLocaleString()}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-emerald-700">
                          In Stock · Ready to Ship
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <Button
                        type="button"
                        size="lg"
                        onClick={scrollToConversionTarget}
                        className={cn(
                          "text-white font-semibold text-sm px-7 h-12",
                          buttonShapeClass
                        )}
                        style={{ backgroundColor: accentColor }}
                      >
                        {c.cta || funnel.stickyCtaLabel || "Claim Offer Now"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>

                      {normalizedStore.codEnabled && (
                        <div className={cn("flex items-center gap-1.5 text-xs font-semibold", mutedTextClass)}>
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          COD & UPI Available
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-5">
                    {heroPrimaryImg ? (
                      <div className={cn("overflow-hidden border bg-slate-100 aspect-square", radiusClass)}>
                        <img
                          src={heroPrimaryImg}
                          alt={selectedProduct?.name || funnel.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "aspect-square flex flex-col items-center justify-center p-8 text-center text-white",
                          radiusClass
                        )}
                        style={{ backgroundColor: accentColor }}
                      >
                        <PackageCheck className="h-14 w-14 mb-3 opacity-90" />
                        <p className="text-lg font-black">{normalizedStore.storeName}</p>
                        <p className="text-xs opacity-85 mt-1">Direct-to-Doorstep Verified Store</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          }

          // 2. TRUST STRIP
          if (section.type === "trust_strip") {
            const items =
              c.trustItems && c.trustItems.length > 0 ? c.trustItems : DEFAULT_TRUST_ITEMS;
            return (
              <section key={section.id} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {items.map((item, idx) => (
                    <Card key={idx} className={cn("border shadow-sm", radiusClass, cardSurfaceClass)}>
                      <CardContent className="p-4 flex items-start gap-3">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white"
                          style={{ backgroundColor: accentColor }}
                        >
                          {idx === 0 ? (
                            <Truck className="h-5 w-5" />
                          ) : idx === 1 ? (
                            <ShieldCheck className="h-5 w-5" />
                          ) : idx === 2 ? (
                            <BadgeCheck className="h-5 w-5" />
                          ) : (
                            <Banknote className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black">{item.title}</p>
                          <p className={cn("text-[11px] mt-0.5 leading-snug", mutedTextClass)}>
                            {item.subtitle}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          }

          // 3. PROBLEM -> SOLUTION SPLIT
          if (section.type === "problem_solution") {
            const pains =
              c.painPoints && c.painPoints.length > 0
                ? c.painPoints
                : [
                    "Delayed shipping with zero tracking visibility",
                    "No proper GST invoice or warranty claim support",
                    "Inconsistent quality from unverified resellers",
                  ];
            const solutions =
              c.solutionPoints && c.solutionPoints.length > 0
                ? c.solutionPoints
                : [
                    "Direct genuine stock dispatched fast from our store desk",
                    "Itemized GST bill + 7-day replacement protection",
                    "Bundle pricing with instant COD & Razorpay UPI",
                  ];

            return (
              <section key={section.id} className="space-y-5">
                <div className="text-center max-w-2xl mx-auto space-y-2">
                  <p className="text-xs font-semibold" style={{ color: isCharcoal ? "#94A3B8" : accentColor }}>
                    {c.badgeText || "Why Switch Today"}
                  </p>
                  <h2
                    className="text-2xl sm:text-3xl font-bold tracking-tight"
                    style={{ fontFamily: fontInfo.headingFont }}
                  >
                    {c.title || "Stop Overpaying for Unverified Alternatives"}
                  </h2>
                  {c.subtitle && <p className={cn("text-sm", mutedTextClass)}>{c.subtitle}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Card className={cn("border-rose-200 bg-rose-50/70 text-slate-900 shadow-none", radiusClass)}>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                        <XCircle className="h-5 w-5" />
                        {c.painTitle || "Common Frustrations Elsewhere"}
                      </div>
                      <ul className="space-y-3">
                        {pains.map((pt, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 font-medium">
                            <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className={cn("border-emerald-200 bg-emerald-50/80 text-slate-900 shadow-none", radiusClass)}>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        {c.solutionTitle || "What You Get With Us"}
                      </div>
                      <ul className="space-y-3">
                        {solutions.map((pt, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-800 font-semibold">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </section>
            );
          }

          // 4. US VS OTHERS COMPARISON TABLE
          if (section.type === "comparison_table") {
            const rows =
              c.comparisonRows && c.comparisonRows.length > 0
                ? c.comparisonRows
                : DEFAULT_COMPARISON_ROWS;
            return (
              <section key={section.id} className="space-y-5">
                <div className="text-center max-w-2xl mx-auto space-y-2">
                  <p className="text-xs font-semibold" style={{ color: isCharcoal ? "#94A3B8" : accentColor }}>
                    {c.badgeText || "Side-by-Side Proof"}
                  </p>
                  <h2
                    className="text-2xl sm:text-3xl font-bold tracking-tight"
                    style={{ fontFamily: fontInfo.headingFont }}
                  >
                    {c.title || "How Our Direct Offer Compares"}
                  </h2>
                  {c.subtitle && <p className={cn("text-sm", mutedTextClass)}>{c.subtitle}</p>}
                </div>

                <Card className={cn("overflow-hidden border shadow-none", radiusClass, cardSurfaceClass)}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={isCharcoal ? "bg-slate-800/80 border-b border-slate-700" : "bg-slate-100/80 border-b"}>
                          <th className="p-4 text-xs font-bold">Feature / Promise</th>
                          <th
                            className="p-4 text-xs font-bold text-center text-white"
                            style={{ backgroundColor: accentColor }}
                          >
                            {c.usLabel || normalizedStore.storeName}
                          </th>
                          <th className="p-4 text-xs font-bold text-center opacity-70">
                            {c.othersLabel || "Typical Sellers"}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70">
                        {rows.map((r, idx) => (
                          <tr key={idx}>
                            <td className="p-4 text-xs sm:text-sm font-semibold">{r.feature}</td>
                            <td className="p-4 text-center">
                              {r.us ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto" />
                              ) : (
                                <XCircle className="h-5 w-5 text-rose-500 mx-auto" />
                              )}
                            </td>
                            <td className="p-4 text-center">
                              {r.others ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto" />
                              ) : (
                                <XCircle className="h-5 w-5 text-rose-400 mx-auto" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </section>
            );
          }

          // 5. HOW IT WORKS
          if (section.type === "how_it_works") {
            const steps =
              c.steps && c.steps.length > 0 ? c.steps : DEFAULT_HOW_IT_WORKS_STEPS;
            return (
              <section key={section.id} className="space-y-6">
                <div className="text-center max-w-2xl mx-auto space-y-2">
                  <p className="text-xs font-semibold" style={{ color: isCharcoal ? "#94A3B8" : accentColor }}>
                    {c.badgeText || "Simple 3-Step Process"}
                  </p>
                  <h2
                    className="text-2xl sm:text-3xl font-bold tracking-tight"
                    style={{ fontFamily: fontInfo.headingFont }}
                  >
                    {c.title || "From Click to Doorstep in 3 Easy Steps"}
                  </h2>
                  {c.subtitle && <p className={cn("text-sm", mutedTextClass)}>{c.subtitle}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {steps.map((st, idx) => (
                    <Card key={idx} className={cn("border shadow-none", radiusClass, cardSurfaceClass)}>
                      <CardContent className="p-6 space-y-3">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-mono font-bold text-sm"
                          style={{ backgroundColor: accentColor }}
                        >
                          {st.stepNumber || `0${idx + 1}`}
                        </div>
                        <h3 className="text-base font-bold">{st.title}</h3>
                        <p className={cn("text-xs sm:text-sm leading-relaxed", mutedTextClass)}>
                          {st.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          }

          // 6. OFFER VALUE STACK
          if (section.type === "offer_stack") {
            const stack =
              c.stackItems && c.stackItems.length > 0 ? c.stackItems : DEFAULT_STACK_ITEMS;
            const totalWorth =
              Number(c.regularPrice) ||
              stack.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
            const dealPrice = Number(c.offerPrice) || effectiveUnitPrice;
            const saveAmount = Math.max(0, totalWorth - dealPrice);

            return (
              <section key={section.id}>
                <Card
                  className={cn(
                    "border-2 shadow-none overflow-hidden",
                    radiusClass,
                    cardSurfaceClass
                  )}
                  style={{ borderColor: accentColor }}
                >
                  <div
                    className="p-5 sm:p-6 text-white text-center space-y-1"
                    style={{ backgroundColor: accentColor }}
                  >
                    <p className="text-xs font-semibold opacity-90">
                      {c.badgeText || "Limited Bundle Value"}
                    </p>
                    <h2
                      className="text-2xl sm:text-3xl font-bold"
                      style={{ fontFamily: fontInfo.headingFont }}
                    >
                      {c.title || "Everything Included in Today's Offer"}
                    </h2>
                  </div>

                  <CardContent className="p-6 sm:p-8 space-y-6">
                    <div className="divide-y divide-slate-200/70">
                      {stack.map((item, idx) => (
                        <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                            <span className="text-sm font-bold">{item.title}</span>
                          </div>
                          <span className={cn("text-xs sm:text-sm font-black shrink-0 tabular-nums", mutedTextClass)}>
                            Value: {currencySymbol}
                            {(Number(item.value) || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 text-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-600 uppercase">
                          Total Real Value:{" "}
                          <span className="line-through text-rose-600">
                            {currencySymbol}
                            {totalWorth.toLocaleString()}
                          </span>
                        </p>
                        <p className="text-2xl sm:text-3xl font-black text-slate-950 mt-0.5">
                          Today Only: {currencySymbol}
                          {dealPrice.toLocaleString()}
                        </p>
                        {saveAmount > 0 && (
                          <p className="text-xs font-black text-emerald-700 mt-1">
                            You Save {currencySymbol}
                            {saveAmount.toLocaleString()} Instant Discount
                          </p>
                        )}
                      </div>

                      <Button
                        type="button"
                        size="lg"
                        onClick={scrollToConversionTarget}
                        className={cn("text-white font-black h-12 px-7 shadow-md", buttonShapeClass)}
                        style={{ backgroundColor: accentColor }}
                      >
                        {c.cta || "Lock This Offer Price"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </section>
            );
          }

          // 7. 1-CLICK PRICING TIERS
          if (section.type === "pricing_tiers") {
            const tiers =
              c.pricingTiers && c.pricingTiers.length > 0
                ? c.pricingTiers
                : DEFAULT_PRICING_TIERS;
            return (
              <section key={section.id} className="space-y-6">
                <div className="text-center max-w-2xl mx-auto space-y-2">
                  <p className="text-xs font-semibold" style={{ color: isCharcoal ? "#94A3B8" : accentColor }}>
                    {c.badgeText || "Choose Your Pack"}
                  </p>
                  <h2
                    className="text-2xl sm:text-3xl font-bold tracking-tight"
                    style={{ fontFamily: fontInfo.headingFont }}
                  >
                    {c.title || "Pick the Bundle That Saves You Most"}
                  </h2>
                  {c.subtitle && <p className={cn("text-sm", mutedTextClass)}>{c.subtitle}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {tiers.map((tier) => {
                    const isSelected = selectedTierId === tier.id;
                    return (
                      <Card
                        key={tier.id}
                        className={cn(
                          "border-2 transition-colors flex flex-col justify-between shadow-none",
                          radiusClass,
                          cardSurfaceClass
                        )}
                        style={{
                          borderColor: isSelected
                            ? accentColor
                            : tier.highlight
                              ? accentColor
                              : undefined,
                        }}
                      >
                        <CardContent className="p-6 space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-base font-bold">{tier.name}</span>
                            {tier.badge && (
                              <Badge
                                className="text-xs font-semibold text-white border-none"
                                style={{ backgroundColor: accentColor }}
                              >
                                {tier.badge}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-baseline gap-2.5">
                            <span className="text-3xl font-bold font-mono tabular-nums" style={{ color: accentColor }}>
                              {currencySymbol}
                              {Number(tier.price).toLocaleString()}
                            </span>
                            {tier.compareAtPrice && Number(tier.compareAtPrice) > Number(tier.price) && (
                              <span className={cn("text-sm line-through font-semibold font-mono tabular-nums", mutedTextClass)}>
                                {currencySymbol}
                                {Number(tier.compareAtPrice).toLocaleString()}
                              </span>
                            )}
                          </div>

                          <ul className="space-y-2 pt-2">
                            {tier.features.map((feat, fIdx) => (
                              <li key={fIdx} className="flex items-start gap-2 text-xs font-semibold">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>

                        <div className="p-6 pt-0">
                          <Button
                            type="button"
                            onClick={() => handleSelectTier(tier)}
                            className={cn(
                              "w-full font-semibold text-xs h-11",
                              buttonShapeClass,
                              isSelected || tier.highlight ? "text-white" : ""
                            )}
                            variant={isSelected || tier.highlight ? "default" : "outline"}
                            style={
                              isSelected || tier.highlight
                                ? { backgroundColor: accentColor }
                                : undefined
                            }
                          >
                            {isSelected ? "Selected Pack · Go to Checkout" : tier.cta || "Select Pack"}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          }

          // 8. GUARANTEE SEAL
          if (section.type === "guarantee_seal") {
            const days = c.guaranteeDays || 7;
            return (
              <section key={section.id}>
                <Card
                  className={cn(
                    "border border-emerald-200 bg-emerald-50/70 text-slate-900 shadow-none",
                    radiusClass
                  )}
                >
                  <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                    <div className="h-20 w-20 rounded-full bg-emerald-600 text-white flex flex-col items-center justify-center shrink-0">
                      <Award className="h-7 w-7" />
                      <span className="text-xs font-mono font-bold tabular-nums">{days}-Day</span>
                    </div>
                    <div className="space-y-2 flex-1">
                      <p className="text-xs font-semibold text-emerald-800">
                        {c.badgeText || "100% Risk-Free Promise"}
                      </p>
                      <h3 className="text-xl font-bold text-slate-950">
                        {c.title || `${days}-Day Ironclad Replacement & Quality Guarantee`}
                      </h3>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {c.body ||
                          `Order with complete peace of mind. Eligible items receive quick ${days}-day replacement & store desk support.`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </section>
            );
          }

          // 9. INLINE EXPRESS CHECKOUT + 1-CLICK ORDER BUMP
          if (section.type === "express_checkout") {
            return (
              <section key={section.id} id="funnel-checkout" className="scroll-mt-20">
                <Card
                  className={cn(
                    "border-2 shadow-none overflow-hidden",
                    radiusClass,
                    cardSurfaceClass
                  )}
                  style={{ borderColor: accentColor }}
                >
                  <div
                    className="px-6 py-4 text-white flex flex-wrap items-center justify-between gap-3"
                    style={{ backgroundColor: accentColor }}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      <div>
                        <p className="text-xs font-semibold opacity-90">
                          {c.badgeText || "Express 30-Sec Checkout"}
                        </p>
                        <h2 className="text-lg sm:text-xl font-bold">
                          {c.title || "Complete Your Order & Claim Instant Dispatch"}
                        </h2>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold opacity-95">
                      <Lock className="h-4 w-4" /> Encrypted Direct Store Checkout
                    </div>
                  </div>

                  <CardContent className="p-6 sm:p-8">
                    {confirmedOrder ? (
                      <div className="text-center py-8 space-y-4 max-w-md mx-auto">
                        <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                          <CheckCircle2 className="h-9 w-9" />
                        </div>
                        <h3 className="text-2xl font-black">Order Confirmed!</h3>
                        <p className={cn("text-sm", mutedTextClass)}>
                          Thank you! Your order <strong>{confirmedOrder.orderId}</strong> via{" "}
                          <strong>{confirmedOrder.paymentLabel}</strong> is logged for{" "}
                          <strong>
                            {currencySymbol}
                            {confirmedOrder.totalAmount.toLocaleString()}
                          </strong>
                          .
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 pt-2">
                          <Button asChild variant="outline" className="font-bold">
                            <Link href={storeHomeUrl}>Browse Full Store</Link>
                          </Button>
                          {merchantWaDigits && (
                            <Button
                              type="button"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              onClick={() =>
                                openExternalLinkSafely(
                                  buildWhatsAppUrl(
                                    merchantWaDigits,
                                    `Hi ${normalizedStore.storeName}, following up on my funnel order ${confirmedOrder.orderId}.`
                                  )
                                )
                              }
                            >
                              <MessageCircle className="h-4 w-4 mr-1.5" /> Track on WhatsApp
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handlePlaceFunnelOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left: Customer Details + Payment Selector */}
                        <div className="lg:col-span-7 space-y-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold">Full Name *</Label>
                              <Input
                                required
                                value={customerInfo.name}
                                onChange={(e) =>
                                  setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))
                                }
                                placeholder="e.g. Aarav Sharma"
                                className="h-11 bg-white text-slate-900"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold">WhatsApp / Mobile Number *</Label>
                              <Input
                                required
                                type="tel"
                                value={customerInfo.phone}
                                onChange={(e) =>
                                  setCustomerInfo((prev) => ({ ...prev, phone: e.target.value }))
                                }
                                placeholder="10-digit mobile number"
                                className="h-11 bg-white text-slate-900"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Full Delivery Address & Pincode *</Label>
                            <Textarea
                              rows={2}
                              value={customerInfo.address}
                              onChange={(e) =>
                                setCustomerInfo((prev) => ({ ...prev, address: e.target.value }))
                              }
                              placeholder="House No, Street, Area, City, State & Pincode"
                              className="bg-white text-slate-900"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Email Address (Optional for receipt)</Label>
                            <Input
                              type="email"
                              value={customerInfo.email}
                              onChange={(e) =>
                                setCustomerInfo((prev) => ({ ...prev, email: e.target.value }))
                              }
                              placeholder="you@example.com"
                              className="h-10 bg-white text-slate-900"
                            />
                          </div>

                          {/* Payment Method */}
                          <div className="space-y-2 pt-1">
                            <Label className="text-xs font-bold">Select Payment Method</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              {normalizedStore.codEnabled && (
                                <button
                                  type="button"
                                  onClick={() => setPaymentMethod("COD")}
                                  className={cn(
                                    "p-3 rounded-xl border text-left transition-all",
                                    paymentMethod === "COD"
                                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                                      : "bg-white text-slate-800 border-slate-200"
                                  )}
                                >
                                  <div className="flex items-center gap-2 font-semibold text-xs text-slate-900">
                                    <Banknote className="h-4 w-4 text-amber-600" /> Cash on Delivery
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Pay at doorstep
                                  </p>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setPaymentMethod("ONLINE")}
                                className={cn(
                                  "p-3 rounded-xl border text-left transition-all",
                                  paymentMethod === "ONLINE"
                                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                                    : "bg-white text-slate-800 border-slate-200"
                                )}
                              >
                                <div className="flex items-center gap-2 font-semibold text-xs text-slate-900">
                                  <CreditCard className="h-4 w-4 text-primary" /> UPI / Cards
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Instant Razorpay pay
                                </p>
                              </button>

                              {normalizedStore.whatsappOrderEnabled && (
                                <button
                                  type="button"
                                  onClick={() => setPaymentMethod("WHATSAPP")}
                                  className={cn(
                                    "p-3 rounded-xl border text-left transition-all",
                                    paymentMethod === "WHATSAPP"
                                      ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                                      : "bg-white text-slate-800 border-slate-200"
                                  )}
                                >
                                  <div className="flex items-center gap-2 font-semibold text-xs text-slate-900">
                                    <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp Order
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Confirm on chat
                                  </p>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Order Summary + Qty + Order Bump + Promo Code */}
                        <div className="lg:col-span-5 space-y-4">
                          <div className="p-4 rounded-xl border bg-slate-50 text-slate-900 space-y-4">
                            {/* Selected Item & Quantity Stepper */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-black truncate">
                                  {selectedTier
                                    ? `${selectedTier.name} (${selectedProduct?.name || funnel.name})`
                                    : selectedProduct?.name || funnel.name}
                                </p>
                                <p className="text-[11px] text-slate-500 font-semibold">
                                  {currencySymbol}
                                  {effectiveUnitPrice.toLocaleString()} / unit
                                </p>
                              </div>
                              <div className="flex items-center border rounded-lg bg-white shrink-0">
                                <button
                                  type="button"
                                  aria-label="Decrease quantity"
                                  onClick={() => {
                                    setSelectedTier(null);
                                    setSelectedTierId("");
                                    setQuantity((q) => Math.max(1, q - 1));
                                  }}
                                  className="h-8 w-8 flex items-center justify-center hover:bg-slate-100"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="w-8 text-center text-xs font-black tabular-nums">
                                  {quantity}
                                </span>
                                <button
                                  type="button"
                                  aria-label="Increase quantity"
                                  onClick={() => {
                                    setSelectedTier(null);
                                    setSelectedTierId("");
                                    setQuantity((q) => Math.min(20, q + 1));
                                  }}
                                  className="h-8 w-8 flex items-center justify-center hover:bg-slate-100"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* 1-Click Order Bump */}
                            {c.orderBumpEnabled !== false && (
                              <label className="block p-3.5 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50/90 cursor-pointer space-y-1">
                                <div className="flex items-start gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={orderBumpChecked}
                                    onChange={(e) => setOrderBumpChecked(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 accent-amber-600"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-semibold text-amber-950">
                                        {c.orderBumpTitle || "YES! Add Priority Care & Bonus Add-On"}
                                      </span>
                                      <span className="text-xs font-mono font-bold tabular-nums text-amber-950 shrink-0">
                                        +{currencySymbol}
                                        {effectiveBumpPrice.toLocaleString()}
                                      </span>
                                    </div>
                                    <p className="text-xs text-amber-900/80 mt-0.5 leading-snug">
                                      {c.orderBumpDescription ||
                                        "One-time exclusive add-on shipped inside the same parcel."}
                                    </p>
                                  </div>
                                </div>
                              </label>
                            )}

                            {/* Promo Code Input */}
                            <div className="space-y-1.5">
                              <div className="flex gap-2">
                                <Input
                                  value={couponInput}
                                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                  placeholder="Promo / Coupon code"
                                  className="h-9 text-xs font-mono bg-white"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={isApplyingCoupon}
                                  onClick={() => handleApplyCoupon()}
                                  className="h-9 px-3 text-xs font-semibold shrink-0"
                                >
                                  {isApplyingCoupon ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    "Apply"
                                  )}
                                </Button>
                              </div>
                              {couponFeedback && (
                                <p
                                  className={cn(
                                    "text-xs font-semibold",
                                    couponFeedback.ok ? "text-emerald-700" : "text-rose-600"
                                  )}
                                >
                                  {couponFeedback.text}
                                </p>
                              )}
                            </div>

                            {/* Free Shipping Progress */}
                            {freeShippingProgress.hasThreshold && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs font-semibold text-slate-600">
                                  <span>
                                    {freeShippingProgress.qualified
                                      ? "Free Delivery Unlocked!"
                                      : `Add ${currencySymbol}${freeShippingProgress.remainingAmount.toLocaleString()} more for Free Delivery`}
                                  </span>
                                  <span className="font-mono tabular-nums">{freeShippingProgress.progressPercent}%</span>
                                </div>
                                <Progress value={freeShippingProgress.progressPercent} className="h-1.5" />
                              </div>
                            )}

                            {/* Totals */}
                            <div className="border-t pt-3 space-y-1.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Subtotal</span>
                                <span className="font-bold font-mono tabular-nums">
                                  {currencySymbol}
                                  {checkoutPricing.subtotal.toLocaleString()}
                                </span>
                              </div>
                              {checkoutPricing.discountAmount > 0 && (
                                <div className="flex justify-between text-emerald-700 font-bold">
                                  <span>Promo Discount ({checkoutPricing.appliedCouponCode})</span>
                                  <span className="font-mono tabular-nums">
                                    -{currencySymbol}
                                    {checkoutPricing.discountAmount.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {checkoutPricing.shippingFee > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Shipping</span>
                                  <span className="font-bold font-mono tabular-nums">
                                    {currencySymbol}
                                    {checkoutPricing.shippingFee.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {checkoutPricing.codFee > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-slate-600">COD Handling</span>
                                  <span className="font-bold font-mono tabular-nums">
                                    {currencySymbol}
                                    {checkoutPricing.codFee.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between items-baseline border-t pt-2.5 text-base font-bold text-slate-950">
                                <span>Total Payable</span>
                                <span className="font-mono tabular-nums" style={{ color: accentColor }}>
                                  {currencySymbol}
                                  {checkoutPricing.grandTotal.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <Button
                              type="submit"
                              size="lg"
                              disabled={isPlacingOrder}
                              className={cn(
                                "w-full text-white font-semibold h-12 text-sm",
                                buttonShapeClass
                              )}
                              style={{ backgroundColor: accentColor }}
                            >
                              {isPlacingOrder ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                              )}
                              {c.cta || "Confirm My Order Now"}
                            </Button>
                          </div>
                        </div>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </section>
            );
          }

          // 10. FLASH SALE TIMER
          if (section.type === "timer") {
            const targetMs = c.endTimeIso
              ? new Date(c.endTimeIso).getTime() || fallbackDeadlineMs
              : fallbackDeadlineMs;
            const remainingSec = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
            const hrs = String(Math.floor(remainingSec / 3600)).padStart(2, "0");
            const mins = String(Math.floor((remainingSec % 3600) / 60)).padStart(2, "0");
            const secs = String(remainingSec % 60).padStart(2, "0");

            return (
              <section key={section.id}>
                <Card
                  className={cn("border-none text-white shadow-none", radiusClass)}
                  style={{ backgroundColor: accentColor }}
                >
                  <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-1.5 text-center md:text-left">
                      <p className="text-xs font-semibold text-white/90 flex items-center justify-center md:justify-start gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> {c.discountLabel || "Flash Deal Live"}
                      </p>
                      <h2 className="text-xl sm:text-2xl font-bold">
                        {c.title || "Limited-Time Funnel Pricing"}
                      </h2>
                      {c.subtitle && <p className="text-xs sm:text-sm opacity-90">{c.subtitle}</p>}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {[{ v: hrs, l: "Hrs" }, { v: mins, l: "Min" }, { v: secs, l: "Sec" }].map(
                        (box) => (
                          <div
                            key={box.l}
                            className="bg-white/15 backdrop-blur-sm rounded-xl px-3.5 py-2 text-center min-w-[60px]"
                          >
                            <p className="text-xl font-bold font-mono tabular-nums">{box.v}</p>
                            <p className="text-xs font-medium opacity-85">{box.l}</p>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              </section>
            );
          }

          // 11. LIVE COUPONS & OFFERS
          if (section.type === "offers") {
            const activeCoupons = normalizedStore.coupons.filter((cp) => cp.active);
            return (
              <section key={section.id} className="space-y-4">
                <div className="text-center max-w-xl mx-auto space-y-1">
                  <h2
                    className="text-xl sm:text-2xl font-bold"
                    style={{ fontFamily: fontInfo.headingFont }}
                  >
                    {c.title || "Active Offers & Promo Codes"}
                  </h2>
                  {c.subtitle && <p className={cn("text-xs sm:text-sm", mutedTextClass)}>{c.subtitle}</p>}
                </div>

                {activeCoupons.length === 0 ? (
                  <Card className={cn("border border-dashed p-5 text-center text-xs shadow-none", radiusClass, cardSurfaceClass)}>
                    <Ticket className="h-6 w-6 mx-auto mb-1 opacity-50" />
                    Direct bundle savings already active on this funnel!
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeCoupons.map((cp) => (
                      <Card key={cp.id} className={cn("border shadow-none", radiusClass, cardSurfaceClass)}>
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded-md font-mono font-bold text-xs text-white" style={{ backgroundColor: accentColor }}>
                              {cp.code}
                            </span>
                            <p className="text-xs font-bold mt-1.5">
                              {cp.discountType === "percent"
                                ? `${cp.discountValue}% OFF`
                                : `Flat ${currencySymbol}${cp.discountValue} OFF`}
                            </p>
                            {cp.minOrderAmount > 0 && (
                              <p className={cn("text-xs font-mono tabular-nums", mutedTextClass)}>
                                Min order {currencySymbol}
                                {cp.minOrderAmount.toLocaleString()}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="font-semibold text-xs"
                            onClick={() => {
                              handleApplyCoupon(cp.code);
                              scrollToConversionTarget();
                            }}
                          >
                            Apply
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            );
          }

          // 12. MEDIA SHOWCASE (YOUTUBE / PRODUCT REEL)
          if (section.type === "media_showcase") {
            const ytId = extractYouTubeVideoId(c.mediaUrl);
            return (
              <section key={section.id}>
                <Card className={cn("border shadow-none overflow-hidden", radiusClass, cardSurfaceClass)}>
                  <CardContent className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-6 space-y-3">
                      <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: isCharcoal ? "#94A3B8" : accentColor }}>
                        <PlayCircle className="h-3.5 w-3.5" />
                        {c.badgeText || "Product Demo"}
                      </p>
                      <h2
                        className="text-2xl font-bold"
                        style={{ fontFamily: fontInfo.headingFont }}
                      >
                        {c.title || "See Our Quality Up Close"}
                      </h2>
                      <p className={cn("text-sm leading-relaxed", mutedTextClass)}>
                        {c.body || c.subtitle || "Multi-point quality verified directly at our dispatch desk."}
                      </p>
                      <Button
                        type="button"
                        onClick={scrollToConversionTarget}
                        className={cn("text-white font-semibold text-xs h-10 px-5", buttonShapeClass)}
                        style={{ backgroundColor: accentColor }}
                      >
                        {c.cta || "Claim Offer"} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="md:col-span-6">
                      {ytId ? (
                        <div className={cn("aspect-video overflow-hidden border bg-black", radiusClass)}>
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                            title={c.title || "Product Demo"}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : heroPrimaryImg ? (
                        <div className={cn("aspect-video overflow-hidden border bg-slate-100", radiusClass)}>
                          <img
                            src={heroPrimaryImg}
                            alt={c.title || "Showcase"}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </section>
            );
          }

          // 13. TESTIMONIALS
          if (section.type === "testimonials") {
            const reviews = c.testimonials || [];
            return (
              <section key={section.id} className="space-y-5">
                <div className="text-center max-w-2xl mx-auto space-y-1">
                  <h2
                    className="text-2xl sm:text-3xl font-bold"
                    style={{ fontFamily: fontInfo.headingFont }}
                  >
                    {c.title || "Trusted by Verified Buyers"}
                  </h2>
                  {c.subtitle && <p className={cn("text-sm", mutedTextClass)}>{c.subtitle}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {reviews.map((rev, idx) => (
                    <Card key={idx} className={cn("border shadow-none", radiusClass, cardSurfaceClass)}>
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: rev.rating || 5 }).map((_, sIdx) => (
                            <Star key={sIdx} className="h-4 w-4 fill-amber-400" />
                          ))}
                        </div>
                        <p className="text-sm italic leading-relaxed">&ldquo;{rev.quote}&rdquo;</p>
                        <div className="pt-1">
                          <p className="text-xs font-bold">{rev.name}</p>
                          {rev.role && (
                            <p className={cn("text-xs font-medium", mutedTextClass)}>
                              {rev.role}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          }

          // 14. FAQ ACCORDION
          if (section.type === "faq") {
            const faqs = c.faqs && c.faqs.length > 0 ? c.faqs : DEFAULT_FAQ_ITEMS;
            return (
              <section key={section.id} className="space-y-5 max-w-3xl mx-auto">
                <div className="text-center space-y-1">
                  <h2
                    className="text-2xl sm:text-3xl font-bold"
                    style={{ fontFamily: fontInfo.headingFont }}
                  >
                    {c.title || "Frequently Asked Questions"}
                  </h2>
                  {c.subtitle && <p className={cn("text-sm", mutedTextClass)}>{c.subtitle}</p>}
                </div>

                <div className="space-y-2.5">
                  {faqs.map((faq, idx) => {
                    const isOpen = openFaqIdx === idx;
                    return (
                      <Card key={idx} className={cn("border shadow-none", radiusClass, cardSurfaceClass)}>
                        <button
                          type="button"
                          onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                          className="w-full p-4 text-left flex items-center justify-between gap-3 font-semibold text-sm"
                        >
                          <span>{faq.question}</span>
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4 shrink-0 opacity-70" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                          )}
                        </button>
                        {isOpen && (
                          <div className={cn("px-4 pb-4 text-xs sm:text-sm leading-relaxed", mutedTextClass)}>
                            {faq.answer}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          }

          // 15. VIP LEAD CAPTURE / NEWSLETTER
          if (section.type === "newsletter") {
            return (
              <section key={section.id} id="funnel-lead" className="scroll-mt-20">
                <Card
                  className={cn("border-2 shadow-none", radiusClass, cardSurfaceClass)}
                  style={{ borderColor: accentColor }}
                >
                  <CardContent className="p-6 sm:p-8 max-w-2xl mx-auto text-center space-y-4">
                    <p className="text-xs font-semibold flex items-center justify-center gap-1.5" style={{ color: isCharcoal ? "#94A3B8" : accentColor }}>
                      <BellRing className="h-3.5 w-3.5" />
                      {c.discountLabel || "Priority Callback & VIP Access"}
                    </p>
                    <h2
                      className="text-2xl sm:text-3xl font-bold"
                      style={{ fontFamily: fontInfo.headingFont }}
                    >
                      {c.title || "Request Instant Callback & Exclusive Deal"}
                    </h2>
                    <p className={cn("text-sm", mutedTextClass)}>
                      {c.subtitle || "Enter your name and WhatsApp/email below — our desk will reach out with your personalized offer."}
                    </p>

                    {leadSuccessMsg ? (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-5 w-5" /> {leadSuccessMsg}
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => handleSubmitLead(e, section.id)}
                        className="flex flex-col sm:flex-row gap-3 pt-2"
                      >
                        <Input
                          required
                          value={leadName}
                          onChange={(e) => setLeadName(e.target.value)}
                          placeholder="Your Full Name"
                          className="h-11 bg-white text-slate-900"
                        />
                        <Input
                          required
                          value={leadContact}
                          onChange={(e) => setLeadContact(e.target.value)}
                          placeholder="10-digit WhatsApp or Email"
                          className="h-11 bg-white text-slate-900"
                        />
                        <Button
                          type="submit"
                          disabled={isSubmittingLead}
                          className={cn("text-white font-semibold h-11 px-6 shrink-0", buttonShapeClass)}
                          style={{ backgroundColor: accentColor }}
                        >
                          {isSubmittingLead ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            c.cta || "Notify Me"
                          )}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </section>
            );
          }

          // 16. SHARED PRODUCT SHOWCASES (featured / new_arrivals / products)
          if (
            section.type === "featured" ||
            section.type === "new_arrivals" ||
            section.type === "products"
          ) {
            const items = safeProducts.slice(0, c.limit || 4);
            if (items.length === 0) return null;
            return (
              <section key={section.id} className="space-y-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: fontInfo.headingFont }}>
                      {c.title || section.label}
                    </h2>
                    {c.subtitle && <p className={cn("text-xs sm:text-sm", mutedTextClass)}>{c.subtitle}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {items.map((p) => {
                    const pImg = getProductGalleryImages(p)[0];
                    const effPrice = Number(p.onlinePrice ?? p.price ?? 0);
                    const isActivePick = selectedProduct?.id === p.id;
                    return (
                      <Card
                        key={p.id}
                        className={cn(
                          "border shadow-none overflow-hidden flex flex-col justify-between",
                          radiusClass,
                          cardSurfaceClass,
                          isActivePick ? "ring-2 ring-primary" : ""
                        )}
                      >
                        <div>
                          <div className="aspect-square bg-slate-100 overflow-hidden">
                            {pImg ? (
                              <img src={pImg} alt={p.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <ShoppingBag className="h-8 w-8" />
                              </div>
                            )}
                          </div>
                          <div className="p-4 space-y-1">
                            <p className="text-xs font-semibold truncate">{p.name}</p>
                            {c.showPricing !== false && (
                              <p className="text-sm font-bold font-mono tabular-nums" style={{ color: accentColor }}>
                                {currencySymbol}
                                {effPrice.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="p-4 pt-0">
                          <Button
                            type="button"
                            size="sm"
                            variant={isActivePick ? "default" : "outline"}
                            className="w-full text-xs font-semibold"
                            onClick={() => {
                              setSelectedProductId(p.id);
                              setSelectedTier(null);
                              setSelectedTierId("");
                              scrollToConversionTarget();
                            }}
                          >
                            {isActivePick ? "Selected in Checkout" : "Select for Offer"}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          }

          // 17. CATEGORIES
          if (section.type === "categories") {
            const cats = deriveStorefrontCategorySummaries(safeProducts, c.limit || 6);
            if (cats.length === 0) return null;
            return (
              <section key={section.id} className="space-y-4">
                <h2 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: fontInfo.headingFont }}>
                  {c.title || "Shop by Category"}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {cats.map((cat) => (
                    <Card key={cat.name} className={cn("border shadow-none p-3 text-center", radiusClass, cardSurfaceClass)}>
                      <p className="text-xs font-bold truncate">{cat.name}</p>
                      <p className={cn("text-xs font-mono tabular-nums mt-0.5", mutedTextClass)}>
                        {cat.count} items · From {currencySymbol}
                        {cat.minPrice.toLocaleString()}
                      </p>
                    </Card>
                  ))}
                </div>
              </section>
            );
          }

          // 18. STORE LOCATION / ABOUT / CONTACT / WHATSAPP
          if (section.type === "store_location") {
            const mapHref = buildGoogleMapsPlaceUrl(
              c.mapUrl,
              normalizedStore.storeAddress,
              normalizedStore.storeName
            );
            return (
              <section key={section.id}>
                <Card className={cn("border shadow-none", radiusClass, cardSurfaceClass)}>
                  <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-base">
                        <MapPin className="h-5 w-5" style={{ color: accentColor }} />
                        {c.title || "Store Dispatch & Pickup Desk"}
                      </div>
                      <p className={cn("text-xs sm:text-sm", mutedTextClass)}>
                        {normalizedStore.storeAddress || c.body || "Verified dispatch hub"}
                      </p>
                      {c.deliveryZones && (
                        <p className="text-xs font-semibold text-emerald-700">{c.deliveryZones}</p>
                      )}
                    </div>
                    <Button asChild variant="outline" className="font-semibold text-xs shrink-0">
                      <a href={mapHref} target="_blank" rel="noopener noreferrer">
                        {c.cta || "Get Directions"} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </section>
            );
          }

          if (section.type === "whatsapp" || section.type === "contact") {
            return (
              <section key={section.id}>
                <Card className={cn("border shadow-none", radiusClass, cardSurfaceClass)}>
                  <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <h3 className="text-lg font-bold">{c.title || "Prefer Direct WhatsApp Assistance?"}</h3>
                      <p className={cn("text-xs sm:text-sm", mutedTextClass)}>
                        {c.subtitle || `Connect directly with ${normalizedStore.storeName} support desk.`}
                      </p>
                    </div>
                    {merchantWaDigits && (
                      <Button
                        type="button"
                        onClick={() =>
                          openExternalLinkSafely(
                            buildWhatsAppUrl(
                              merchantWaDigits,
                              `Hi ${normalizedStore.storeName}, I have a question about ${funnel.name}.`
                            )
                          )
                        }
                        className={cn("bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shrink-0", buttonShapeClass)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1.5" />
                        {c.cta || "Chat on WhatsApp"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </section>
            );
          }

          // Fallback for about
          return (
            <section key={section.id}>
              <Card className={cn("border shadow-none", radiusClass, cardSurfaceClass)}>
                <CardContent className="p-6 space-y-2 text-center">
                  <h3 className="text-lg font-bold">{c.title || section.label}</h3>
                  <p className={cn("text-sm max-w-2xl mx-auto", mutedTextClass)}>
                    {c.body || c.subtitle}
                  </p>
                </CardContent>
              </Card>
            </section>
          );
        })}
      </main>

      {/* Clean Funnel Footer + Policy Modals */}
      <footer className={cn("border-t py-8 px-4", isCharcoal ? "border-slate-800 bg-slate-900" : "bg-white border-slate-200")}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-center sm:text-left">
            <p className="font-bold">{normalizedStore.storeName}</p>
            <p className={mutedTextClass}>{normalizedStore.footerConfig.tagline}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 font-semibold">
            <button type="button" onClick={() => setActivePolicyModal("shipping")} className="hover:underline">
              Shipping Policy
            </button>
            <button type="button" onClick={() => setActivePolicyModal("returns")} className="hover:underline">
              Return Guarantee
            </button>
            <button type="button" onClick={() => setActivePolicyModal("privacy")} className="hover:underline">
              Privacy Policy
            </button>
            <Link href={storeHomeUrl} className="hover:underline font-bold" style={{ color: accentColor }}>
              Full Storefront
            </Link>
          </div>
        </div>
      </footer>

      {/* Sticky Bottom Conversion CTA Bar */}
      {funnel.stickyCtaEnabled && (
        <div
          className={cn(
            "fixed bottom-0 inset-x-0 z-40 border-t px-4 py-3 backdrop-blur-md",
            isCharcoal ? "bg-slate-950/95 border-slate-800" : "bg-white/95 border-slate-200"
          )}
        >
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">{selectedProduct?.name || funnel.name}</p>
              <p className="text-xs font-bold font-mono tabular-nums" style={{ color: accentColor }}>
                {currencySymbol}
                {checkoutPricing.grandTotal.toLocaleString()}
                {normalizedStore.codEnabled ? " · COD Available" : ""}
              </p>
            </div>
            <Button
              type="button"
              onClick={scrollToConversionTarget}
              className={cn("text-white font-semibold text-xs sm:text-sm h-10 px-6 shrink-0", buttonShapeClass)}
              style={{ backgroundColor: accentColor }}
            >
              {funnel.stickyCtaLabel || "Claim Offer"}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Store Policy Modal */}
      <Dialog
        open={Boolean(activePolicyModal)}
        onOpenChange={(open) => !open && setActivePolicyModal(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black">
              {activePolicyModal === "shipping"
                ? "Shipping & Dispatch Policy"
                : activePolicyModal === "returns"
                  ? "Return & Replacement Policy"
                  : "Privacy Policy"}
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {activePolicyModal === "shipping"
              ? normalizedStore.policyConfig.shippingPolicy
              : activePolicyModal === "returns"
                ? normalizedStore.policyConfig.returnPolicy
                : normalizedStore.policyConfig.privacyPolicy}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
