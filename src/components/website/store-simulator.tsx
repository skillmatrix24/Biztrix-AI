"use client";

import { useState } from "react";
import {
  Award,
  BadgeCheck,
  Banknote,
  BellRing,
  CheckCircle2,
  ChevronDown,
  Clock,
  Flame,
  Gift,
  HelpCircle,
  Layers,
  LayoutGrid,
  ListChecks,
  MapPin,
  MessageCircle,
  Monitor,
  Package,
  PlayCircle,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Target,
  Ticket,
  Truck,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DEFAULT_FAQ_ITEMS,
  DEFAULT_PRICING_TIERS,
  DEFAULT_TRUST_ITEMS,
  getStoreFontFamilies,
  StoreAnnouncementBar,
  StoreFooterConfig,
  StoreSection,
  StoreThemeConfig,
} from "@/lib/storefront-engine";

interface StoreSimulatorProps {
  storeName: string;
  logoUrl: string;
  primaryColor: string;
  uiStyle: string;
  codEnabled: boolean;
  whatsappOrderEnabled: boolean;
  sections: StoreSection[];
  themeConfig: StoreThemeConfig;
  announcementBar: StoreAnnouncementBar;
  footerConfig: StoreFooterConfig;
  sampleProducts?: Array<{ id: string; name: string; category?: string; price?: number; onlinePrice?: number; images?: string[] }>;
  mode?: "storefront" | "funnel";
  stickyCtaLabel?: string;
}

export function StoreSimulator({
  storeName,
  logoUrl,
  primaryColor,
  uiStyle,
  codEnabled,
  whatsappOrderEnabled,
  sections,
  themeConfig,
  announcementBar,
  footerConfig,
  sampleProducts = [],
  mode = "storefront",
  stickyCtaLabel,
}: StoreSimulatorProps) {
  const [viewport, setViewport] = useState<"mobile" | "desktop">("mobile");
  const fonts = getStoreFontFamilies(themeConfig.fontPair);
  const activeSections = sections.filter((s) => s.status === "Active");

  const isDark = themeConfig.themeSurface === "charcoal";
  const isWarm = themeConfig.themeSurface === "warm_paper";

  const surfaceBg = isDark
    ? "bg-slate-950 text-slate-100"
    : isWarm
      ? "bg-[#FAF8F5] text-stone-900"
      : "bg-slate-50 text-slate-900";

  const headerBg = isDark
    ? "bg-slate-900 border-slate-800 text-white"
    : isWarm
      ? "bg-[#FAF8F5]/95 border-stone-200 text-stone-900"
      : "bg-white border-slate-200 text-slate-900";

  const cardBg = isDark
    ? "bg-slate-900 border-slate-800 text-slate-100"
    : isWarm
      ? "bg-white border-stone-200/80 text-stone-900"
      : "bg-white border-slate-200/80 text-slate-900";

  const radiusClass =
    themeConfig.cardRadius === "sharp"
      ? "rounded-md"
      : themeConfig.cardRadius === "soft"
        ? "rounded-2xl"
        : "rounded-xl";

  const btnRadiusClass =
    themeConfig.buttonStyle === "pill"
      ? "rounded-full"
      : themeConfig.cardRadius === "sharp"
        ? "rounded-md"
        : "rounded-lg";

  const previewItems =
    sampleProducts.length > 0
      ? sampleProducts.slice(0, viewport === "desktop" ? themeConfig.gridColumns : 2)
      : [
          { id: "p1", name: "Signature Item", price: 1299 },
          { id: "p2", name: "Daily Essential", price: 699 },
          { id: "p3", name: "Merchant Pick", price: 899 },
          { id: "p4", name: "Classic Edition", price: 1499 },
        ].slice(0, viewport === "desktop" ? themeConfig.gridColumns : 2);

  return (
    <Card className="border border-slate-200 shadow-none bg-white rounded-2xl overflow-hidden w-full min-w-0">
      <CardHeader className="bg-slate-900 border-b border-slate-800 py-3.5 px-4 sm:px-5 flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap">
          <Monitor className="h-4 w-4 text-accent shrink-0" /> Live Simulator
        </CardTitle>
        <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Mobile simulator view"
            onClick={() => setViewport("mobile")}
            className={cn(
              "h-7 w-7 rounded-lg",
              viewport === "mobile" ? "bg-white text-slate-900" : "text-white/70 hover:text-white"
            )}
          >
            <Smartphone className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Desktop simulator view"
            onClick={() => setViewport("desktop")}
            className={cn(
              "h-7 w-7 rounded-lg",
              viewport === "desktop" ? "bg-white text-slate-900" : "text-white/70 hover:text-white"
            )}
          >
            <Monitor className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-5 bg-slate-100">
        <div
          className={cn(
            "mx-auto border-[6px] border-slate-900 rounded-2xl overflow-hidden flex flex-col relative transition-all min-w-0",
            viewport === "mobile" ? "w-full max-w-[320px] h-[520px]" : "w-full h-[500px]",
            surfaceBg
          )}
          style={{ fontFamily: fonts.bodyFont }}
        >
          {/* Browser / Phone Chrome */}
          <div className="h-5 bg-slate-900 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-white/25" />
              <div className="h-1.5 w-1.5 rounded-full bg-white/25" />
            </div>
            <div className="h-1 w-12 bg-white/15 rounded-full" />
            <span className="text-[11px] font-mono text-white/60 leading-none">{uiStyle}</span>
          </div>

          {/* Announcement Bar Preview */}
          {announcementBar.enabled && announcementBar.text && (
            <div
              className="px-3 py-1.5 text-center text-[11px] font-semibold truncate shrink-0"
              style={{
                backgroundColor: announcementBar.bgColor,
                color: announcementBar.textColor,
              }}
            >
              {announcementBar.text}
              {announcementBar.ctaLabel ? ` · ${announcementBar.ctaLabel} →` : ""}
            </div>
          )}

          {/* Header Preview */}
          <div
            className={cn(
              "px-4 py-3 border-b flex justify-between items-center sticky top-0 z-10 shrink-0",
              headerBg
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              {logoUrl ? (
                <img src={logoUrl} alt={storeName ? `${storeName} logo` : "Store logo"} referrerPolicy="no-referrer" className="h-5 w-5 rounded object-cover shrink-0" />
              ) : (
                <div
                  className="h-5 w-5 rounded flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  {(storeName || "S").charAt(0)}
                </div>
              )}
              <span
                className="text-xs font-bold truncate"
                style={{ fontFamily: fonts.headingFont, color: isDark ? "#FFFFFF" : primaryColor }}
              >
                {storeName || "My Brand"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {codEnabled && <Banknote className="h-3 w-3 text-amber-500" />}
              {whatsappOrderEnabled && <MessageCircle className="h-3 w-3 text-emerald-500" />}
              <ShoppingBag className="h-3.5 w-3.5 opacity-60" />
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full">
            <div className="space-y-3 p-3 min-w-0 w-full">
              {activeSections.map((s) => {
                if (s.type === "hero") {
                  const hasImg = Boolean(themeConfig.heroImageUrl);
                  if (themeConfig.heroLayout === "split_showcase") {
                    return (
                      <div
                        key={s.id}
                        className={cn("p-3 border grid gap-2.5 items-center min-w-0", radiusClass, cardBg, viewport === "desktop" ? "grid-cols-2" : "grid-cols-1")}
                      >
                        <div className="space-y-1.5 text-left min-w-0">
                          <span className="text-[11px] font-semibold opacity-75 block">
                            {s.content.badgeText || "Verified Store"}
                          </span>
                          <p
                            className="text-xs font-bold leading-tight"
                            style={{ fontFamily: fonts.headingFont }}
                          >
                            {s.content.title || storeName || "Your Storefront"}
                          </p>
                          <div
                            className={cn("inline-block px-2.5 py-1 text-[11px] font-semibold text-white", btnRadiusClass)}
                            style={{ backgroundColor: primaryColor }}
                          >
                            {s.content.cta || "Explore"}
                          </div>
                        </div>
                        <div className={cn("aspect-[4/3] overflow-hidden bg-slate-200 flex items-center justify-center", radiusClass)}>
                          {hasImg ? (
                            <img src={themeConfig.heroImageUrl} alt="Storefront hero preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          ) : (
                            <Sparkles className="h-5 w-5 opacity-40" style={{ color: primaryColor }} />
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={s.id}
                      className={cn("relative overflow-hidden p-4 text-white text-left", radiusClass)}
                      style={{ backgroundColor: primaryColor }}
                    >
                      {hasImg && (
                        <>
                          <img
                            src={themeConfig.heroImageUrl}
                            alt="Storefront cover preview"
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/25" />
                        </>
                      )}
                      <div
                        className={cn(
                          "relative z-10 space-y-1.5",
                          themeConfig.heroLayout === "editorial_cover" ? "pt-6 text-left" : "text-center"
                        )}
                      >
                        <p className="text-[11px] font-semibold opacity-90">
                          {s.content.badgeText || "Official Storefront"}
                        </p>
                        <p
                          className="text-sm font-bold leading-tight"
                          style={{ fontFamily: fonts.headingFont }}
                        >
                          {s.content.title || storeName || "Welcome to Store"}
                        </p>
                        <div className="pt-1">
                          <span
                            className={cn(
                              "inline-block px-3 py-1 text-[11px] font-semibold",
                              btnRadiusClass,
                              themeConfig.buttonStyle === "outline"
                                ? "border border-white text-white bg-white/10"
                                : "bg-white text-slate-900"
                            )}
                          >
                            {s.content.cta || "Shop Now"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (s.type === "trust_strip") {
                  const items =
                    Array.isArray(s.content.trustItems) && s.content.trustItems.length > 0
                      ? s.content.trustItems
                      : DEFAULT_TRUST_ITEMS;
                  return (
                    <div key={s.id} className={cn("p-2.5 border space-y-1.5 text-left", radiusClass, cardBg)}>
                      <p className="text-[11px] font-bold" style={{ color: primaryColor }}>
                        {s.content.title || s.label}
                      </p>
                      <div className={cn("grid gap-1.5", viewport === "desktop" ? "grid-cols-4" : "grid-cols-2")}>
                        {items.slice(0, 4).map((item, idx) => (
                          <div key={idx} className={cn("p-1.5 border text-left space-y-0.5 min-w-0", radiusClass, isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-100 bg-slate-50/70")}>
                            {item.icon === "Truck" ? (
                              <Truck className="h-3 w-3" style={{ color: primaryColor }} />
                            ) : item.icon === "Banknote" ? (
                              <Banknote className="h-3 w-3" style={{ color: primaryColor }} />
                            ) : item.icon === "BadgeCheck" ? (
                              <BadgeCheck className="h-3 w-3" style={{ color: primaryColor }} />
                            ) : (
                              <ShieldCheck className="h-3 w-3" style={{ color: primaryColor }} />
                            )}
                            <p className="text-[11px] font-semibold truncate">{item.title}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (s.type === "categories") {
                  const derived = Array.from(
                    new Set(
                      sampleProducts
                        .map((p) => p.category)
                        .filter((c): c is string => Boolean(c && c.trim()))
                    )
                  ).slice(0, 4);
                  const chips = derived.length > 0 ? derived : ["Bestsellers", "New Stock", "Essentials"];
                  return (
                    <div key={s.id} className="space-y-1.5 text-left">
                      <p className="text-[11px] font-bold flex items-center gap-1" style={{ fontFamily: fonts.headingFont }}>
                        <LayoutGrid className="h-3 w-3 shrink-0" style={{ color: primaryColor }} />
                        <span className="truncate">{s.content.title || "Shop by Category"}</span>
                      </p>
                      <div className={cn("grid gap-1.5", viewport === "desktop" ? "grid-cols-3" : "grid-cols-2")}>
                        {chips.map((cat) => (
                          <div key={cat} className={cn("p-2 border text-left min-w-0", radiusClass, cardBg)}>
                            <p className="text-[11px] font-semibold truncate">{cat}</p>
                            <p className="text-[11px] opacity-65 truncate">Browse collection →</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (s.type === "offers") {
                  return (
                    <div key={s.id} className={cn("p-2.5 border text-left space-y-1.5", radiusClass, cardBg)}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-bold flex items-center gap-1" style={{ color: primaryColor }}>
                          <Ticket className="h-3 w-3" />
                          {s.content.title || "Active Offers & Promo Codes"}
                        </p>
                      </div>
                      <div className={cn("p-2 border border-dashed flex items-center justify-between gap-2", radiusClass, isDark ? "border-slate-700 bg-slate-950/60" : "border-slate-300 bg-slate-50")}>
                        <span className="text-[11px] font-mono font-bold tracking-wider">WELCOME10</span>
                        <span className={cn("px-2 py-0.5 text-[11px] font-semibold text-white", btnRadiusClass)} style={{ backgroundColor: primaryColor }}>
                          {s.content.cta || "Apply Code"}
                        </span>
                      </div>
                    </div>
                  );
                }

                if (s.type === "timer") {
                  return (
                    <div
                      key={s.id}
                      className={cn("p-2.5 bg-slate-900 text-white flex items-center justify-between gap-2", radiusClass)}
                    >
                      <div className="min-w-0 text-left">
                        <p className="text-[11px] font-bold truncate">
                          {s.content.title || "Flash Deal"}
                        </p>
                      </div>
                      <div className="text-[11px] font-mono tabular-nums bg-white/10 px-2 py-1 rounded flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3 text-amber-400" /> 05:42:18
                      </div>
                    </div>
                  );
                }

                if (s.type === "products" || s.type === "featured" || s.type === "new_arrivals") {
                  return (
                    <div key={s.id} className="space-y-2 text-left min-w-0">
                      <div className="flex items-center justify-between min-w-0">
                        <p
                          className="text-xs font-bold flex items-center gap-1 truncate"
                          style={{ fontFamily: fonts.headingFont }}
                        >
                          {s.type === "featured" && <Layers className="h-3 w-3 shrink-0" style={{ color: primaryColor }} />}
                          {s.type === "new_arrivals" && <Sparkles className="h-3 w-3 shrink-0" style={{ color: primaryColor }} />}
                          <span className="truncate">{s.content.title || s.label}</span>
                        </p>
                      </div>
                      <div
                        className={cn(
                          "grid gap-2",
                          viewport === "desktop" && themeConfig.gridColumns === 3
                            ? "grid-cols-3"
                            : viewport === "desktop"
                              ? "grid-cols-4"
                              : "grid-cols-2"
                        )}
                      >
                        {previewItems.map((item) => {
                          const itemImages = "images" in item ? item.images : undefined;
                          const itemOnlinePrice = "onlinePrice" in item ? item.onlinePrice : undefined;
                          return (
                            <div key={item.id} className={cn("border p-1.5 space-y-1 min-w-0", radiusClass, cardBg)}>
                              <div className={cn("aspect-square overflow-hidden flex items-center justify-center", isDark ? "bg-slate-800" : "bg-slate-100", radiusClass)}>
                                {itemImages?.[0] ? (
                                  <img src={itemImages[0]} alt={item.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="h-4 w-4 opacity-25" />
                                )}
                              </div>
                              <p className="text-[11px] font-semibold truncate">{item.name}</p>
                              {s.content.showPricing !== false && (
                                <p className="text-[11px] font-bold font-mono tabular-nums truncate" style={{ color: primaryColor }}>
                                  ₹{(itemOnlinePrice ?? item.price ?? 499).toLocaleString()}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                if (s.type === "media_showcase") {
                  return (
                    <div key={s.id} className={cn("p-2.5 border grid gap-2 items-center text-left", radiusClass, cardBg, viewport === "desktop" ? "grid-cols-2" : "grid-cols-1")}>
                      <div className={cn("aspect-video bg-slate-900 text-white flex items-center justify-center gap-1.5", radiusClass)}>
                        <PlayCircle className="h-4 w-4 opacity-90" />
                        <span className="text-[11px] font-semibold">Product Demo</span>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <p className="text-[11px] font-semibold opacity-65">{s.content.badgeText || "Product Spotlight"}</p>
                        <p className="text-xs font-bold truncate">{s.content.title || "See Our Quality Up Close"}</p>
                      </div>
                    </div>
                  );
                }

                if (s.type === "testimonials") {
                  return (
                    <div key={s.id} className={cn("p-2.5 border text-left space-y-1", radiusClass, cardBg)}>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        <Star className="h-3 w-3 fill-current" />
                        <Star className="h-3 w-3 fill-current" />
                        <Star className="h-3 w-3 fill-current" />
                        <Star className="h-3 w-3 fill-current" />
                        <Star className="h-3 w-3 fill-current" />
                      </div>
                      <p className="text-[11px] opacity-85 italic truncate">
                        &ldquo;{s.content.testimonials?.[0]?.quote || "Genuine quality products."}&rdquo;
                      </p>
                    </div>
                  );
                }

                if (s.type === "faq") {
                  const faqs =
                    Array.isArray(s.content.faqs) && s.content.faqs.length > 0
                      ? s.content.faqs
                      : DEFAULT_FAQ_ITEMS;
                  return (
                    <div key={s.id} className={cn("p-2.5 border text-left space-y-1.5", radiusClass, cardBg)}>
                      <p className="text-[11px] font-bold flex items-center gap-1" style={{ color: primaryColor }}>
                        <HelpCircle className="h-3 w-3" />
                        {s.content.title || "Frequently Asked Questions"}
                      </p>
                      {faqs.slice(0, 2).map((faq, idx) => (
                        <div key={idx} className={cn("px-2 py-1 border flex items-center justify-between gap-2 text-[11px] font-medium", radiusClass, isDark ? "border-slate-800" : "border-slate-100")}>
                          <span className="truncate">{faq.question}</span>
                          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
                        </div>
                      ))}
                    </div>
                  );
                }

                if (s.type === "store_location") {
                  return (
                    <div key={s.id} className={cn("p-2.5 border text-left space-y-1", radiusClass, cardBg)}>
                      <p className="text-[11px] font-bold flex items-center gap-1" style={{ color: primaryColor }}>
                        <MapPin className="h-3 w-3" />
                        {s.content.title || "Store Location & Pickup"}
                      </p>
                      <p className="text-[11px] opacity-75 truncate">
                        {s.content.deliveryZones || "Local Same-Day Delivery · Pan-India Insured Dispatch"}
                      </p>
                    </div>
                  );
                }

                if (s.type === "newsletter") {
                  return (
                    <div key={s.id} className="p-2.5 bg-slate-900 text-white rounded-xl text-left space-y-1.5 min-w-0">
                      <p className="text-[11px] font-bold flex items-center gap-1 text-amber-300 truncate">
                        <BellRing className="h-3 w-3 shrink-0" />
                        <span className="truncate">{s.content.title || "Get Early Access to Deals"}</span>
                      </p>
                      <div className={cn("flex gap-1.5 min-w-0", viewport === "desktop" ? "items-center" : "flex-col items-stretch")}>
                        <div className="h-6 flex-1 min-w-0 rounded bg-white/10 px-2 flex items-center text-[11px] text-white/65 truncate">
                          WhatsApp / Email...
                        </div>
                        <span className="px-2 py-1 rounded text-[11px] font-semibold text-white text-center shrink-0" style={{ backgroundColor: primaryColor }}>
                          {s.content.cta || "Notify Me"}
                        </span>
                      </div>
                    </div>
                  );
                }

                if (s.type === "problem_solution") {
                  return (
                    <div key={s.id} className={cn("p-2.5 border grid gap-2 text-left min-w-0", viewport === "desktop" ? "grid-cols-2" : "grid-cols-1", radiusClass, cardBg)}>
                      <div className="p-2 rounded bg-rose-50 text-rose-900 space-y-0.5 min-w-0">
                        <p className="text-[11px] font-bold flex items-center gap-1 truncate">
                          <Target className="h-3 w-3 shrink-0" /> {s.content.painTitle || "Frustrations"}
                        </p>
                        <p className="text-[11px] opacity-85 truncate">• {(s.content.painPoints || ["Middleman markups"])[0]}</p>
                      </div>
                      <div className="p-2 rounded bg-emerald-50 text-emerald-900 space-y-0.5 min-w-0">
                        <p className="text-[11px] font-bold flex items-center gap-1 truncate">
                          <CheckCircle2 className="h-3 w-3 shrink-0" /> {s.content.solutionTitle || "Our Fix"}
                        </p>
                        <p className="text-[11px] opacity-85 truncate">✓ {(s.content.solutionPoints || ["Direct merchant stock"])[0]}</p>
                      </div>
                    </div>
                  );
                }

                if (s.type === "comparison_table") {
                  return (
                    <div key={s.id} className={cn("p-2.5 border text-left space-y-1 min-w-0", radiusClass, cardBg)}>
                      <p className="text-[11px] font-bold flex items-center gap-1 truncate" style={{ color: primaryColor }}>
                        <Scale className="h-3 w-3 shrink-0" /> {s.content.title || "Us vs Others"}
                      </p>
                      <div className="text-[11px] flex items-center justify-between gap-2 border-b pb-0.5 font-semibold min-w-0">
                        <span className="truncate">Verified Quality</span>
                        <span className="text-emerald-600 shrink-0">✓ {s.content.usLabel || "Us"}</span>
                      </div>
                      <div className="text-[11px] flex items-center justify-between gap-2 opacity-80 min-w-0">
                        <span className="truncate">Same-Day Dispatch</span>
                        <span className="text-emerald-600 shrink-0">✓ Yes</span>
                      </div>
                    </div>
                  );
                }

                if (s.type === "how_it_works") {
                  return (
                    <div key={s.id} className={cn("p-2.5 border text-left space-y-1 min-w-0", radiusClass, cardBg)}>
                      <p className="text-[11px] font-bold flex items-center gap-1 truncate" style={{ color: primaryColor }}>
                        <ListChecks className="h-3 w-3 shrink-0" /> {s.content.title || "3 Simple Steps"}
                      </p>
                      <div className={cn("grid gap-1", viewport === "desktop" ? "grid-cols-3" : "grid-cols-1")}>
                        {["01 Select", "02 Order", "03 Delivered"].map((label) => (
                          <div key={label} className="p-1.5 rounded bg-slate-100 text-[11px] font-semibold text-center text-slate-800 truncate min-w-0">
                            {label}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (s.type === "offer_stack") {
                  return (
                    <div key={s.id} className={cn("p-2.5 border-2 text-left space-y-1 min-w-0", radiusClass, cardBg)} style={{ borderColor: primaryColor }}>
                      <p className="text-[11px] font-bold flex items-center gap-1 truncate" style={{ color: primaryColor }}>
                        <Gift className="h-3 w-3 shrink-0" /> {s.content.title || "Bundle Value Stack"}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-bold font-mono tabular-nums">
                        <span className="line-through opacity-50">₹{(s.content.regularPrice ?? 2996).toLocaleString()}</span>
                        <span style={{ color: primaryColor }}>Today ₹{(s.content.offerPrice ?? 999).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                }

                if (s.type === "pricing_tiers") {
                  const tiers = (Array.isArray(s.content.pricingTiers) && s.content.pricingTiers.length > 0
                    ? s.content.pricingTiers
                    : DEFAULT_PRICING_TIERS).slice(0, 3);
                  return (
                    <div key={s.id} className={cn("p-2.5 border text-left space-y-1.5 min-w-0", radiusClass, cardBg)}>
                      <p className="text-[11px] font-bold flex items-center gap-1 truncate" style={{ color: primaryColor }}>
                        <Flame className="h-3 w-3 shrink-0" /> {s.content.title || "Choose Your Package"}
                      </p>
                      <div className={cn("grid gap-1.5", viewport === "desktop" ? "grid-cols-3" : "grid-cols-1")}>
                        {tiers.map((tier) => (
                          <div
                            key={tier.id}
                            className={cn(
                              "p-1.5 rounded border min-w-0",
                              viewport === "desktop" ? "text-center" : "flex items-center justify-between gap-2 text-left",
                              tier.highlight ? "border-primary bg-primary/5" : "border-slate-200"
                            )}
                          >
                            <p className="text-[11px] font-semibold truncate">{tier.name}</p>
                            <p className="text-[11px] font-bold font-mono tabular-nums shrink-0" style={{ color: primaryColor }}>₹{tier.price}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (s.type === "guarantee_seal") {
                  return (
                    <div key={s.id} className="p-2.5 rounded-xl bg-emerald-950 text-white text-left flex items-center gap-2">
                      <Award className="h-4 w-4 text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold truncate">
                          {s.content.guaranteeDays ?? 7}-Day Risk-Free Guarantee
                        </p>
                        <p className="text-[11px] text-emerald-200 truncate">{s.content.title || "Direct Merchant Warranty"}</p>
                      </div>
                    </div>
                  );
                }

                if (s.type === "express_checkout") {
                  return (
                    <div key={s.id} className={cn("p-2.5 border-2 text-left space-y-1.5", radiusClass, cardBg)} style={{ borderColor: primaryColor }}>
                      <p className="text-[11px] font-bold flex items-center gap-1" style={{ color: primaryColor }}>
                        <Zap className="h-3 w-3" /> {s.content.title || "Express Checkout"}
                      </p>
                      {s.content.orderBumpEnabled !== false && (
                        <div className="p-1.5 rounded border border-dashed border-amber-400 bg-amber-50 text-[11px] font-semibold text-amber-900 truncate">
                          + Add Bump (+₹{s.content.orderBumpPrice ?? 199})
                        </div>
                      )}
                      <div className={cn("py-1 text-center text-[11px] font-semibold text-white", btnRadiusClass)} style={{ backgroundColor: primaryColor }}>
                        {s.content.cta || "Confirm Order Now"}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={s.id} className={cn("p-2.5 border text-left", radiusClass, cardBg)}>
                    <p className="text-[11px] font-bold" style={{ color: primaryColor }}>
                      {s.content.title || s.label}
                    </p>
                  </div>
                );
              })}

              {activeSections.length === 0 && (
                <div className="p-8 text-center text-xs opacity-60 italic">
                  No sections active. Enable sections in Layout Controls.
                </div>
              )}

              {/* Footer Preview */}
              <div className={cn("pt-2 border-t text-center space-y-1", isDark ? "border-slate-800" : "border-slate-200")}>
                <p className="text-[11px] opacity-70 truncate">{footerConfig.tagline}</p>
              </div>
            </div>
          </div>

          {mode === "funnel" && stickyCtaLabel && (
            <div className="px-3 py-2 border-t bg-white/95 flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] font-semibold text-slate-700 truncate">
                {storeName || "Special Funnel Offer"}
              </span>
              <span
                className={cn("px-2.5 py-1 text-[11px] font-semibold text-white shrink-0", btnRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                {stickyCtaLabel}
              </span>
            </div>
          )}
        </div>

        <p className="text-xs text-center text-slate-500 font-medium mt-3">
          {viewport === "mobile" ? "Mobile 390px" : `Desktop ${themeConfig.gridColumns}-Col`} · {fonts.label}
        </p>
      </CardContent>
    </Card>
  );
}
