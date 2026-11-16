"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  MousePointer2,
  Users,
  MessageCircle,
  Eye,
  ArrowUpRight,
  Zap,
  AlertCircle,
  Monitor,
  Smartphone,
  Search,
  Star,
  ShoppingBag,
  ExternalLink,
  Loader2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { collection, doc, query, where, orderBy, limit } from "firebase/firestore";
import Link from "next/link";
import {
  computeFunnelMetrics,
  computeStorefrontFunnelMetrics,
  isValidGa4MeasurementId,
  isValidMetaPixelId,
  normalizeFunnelConfig,
  normalizeStoreTrackingConfig,
  resolveFunnelPreviewUrl,
  resolveStorePreviewUrl,
} from "@/lib/storefront-engine";
import { syncStorefrontRelays } from "@/app/actions/website-actions";
import {
  PageHeader,
  KpiStatCard,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";

type SessionAgg = {
  id: string;
  sessionId: string;
  device: "mobile" | "desktop";
  lastActive: string;
  lastActiveMs: number;
  duration: string;
  pageViews: number;
  productsViewed: string[];
  status: "browsing" | "left" | "converted";
  intentScore: number;
};

export default function VisitorInsightsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);

  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const websiteRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId, "websites", "main") : null),
    [firestore, businessId]
  );
  const { data: websiteData } = useDoc<any>(websiteRef);

  const eventsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "storefront_events"),
            orderBy("createdAt", "desc"),
            limit(100)
          )
        : null,
    [firestore, businessId]
  );
  const { data: rawEvents = [], isLoading: isEventsLoading } = useCollection<any>(eventsQuery);
  const events = useMemo(() => (Array.isArray(rawEvents) ? rawEvents : []), [rawEvents]);

  const ordersQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "orders"),
            where("source", "==", "storefront"),
            limit(100)
          )
        : null,
    [firestore, businessId]
  );
  const { data: rawOrders = [] } = useCollection<any>(ordersQuery);
  const orders = useMemo(() => (Array.isArray(rawOrders) ? rawOrders : []), [rawOrders]);

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

  const websitesQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "websites"),
            where("kind", "==", "funnel"),
            limit(30)
          )
        : null,
    [firestore, businessId]
  );
  const { data: rawFunnels = [] } = useCollection<any>(websitesQuery);

  const leadsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(collection(firestore, "businesses", businessId, "storefront_leads"), limit(100))
        : null,
    [firestore, businessId]
  );
  const { data: rawLeads = [] } = useCollection<any>(leadsQuery);

  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"today" | "7days" | "30days" | "all">("all");

  const isDateWithinRange = useCallback(
    (dateObj: any) => {
      if (dateFilter === "all") return true;
      if (!dateObj) return false;
      const date = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
      const now = new Date();
      if (dateFilter === "today") {
        return date.toDateString() === now.toDateString();
      } else if (dateFilter === "7days") {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date >= sevenDaysAgo;
      } else if (dateFilter === "30days") {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return date >= thirtyDaysAgo;
      }
      return true;
    },
    [dateFilter]
  );

  const filteredEvents = useMemo(() => {
    return events.filter((e) => isDateWithinRange(e.createdAt || e.clientTimestamp));
  }, [events, isDateWithinRange]);

  const paidOrders = useMemo(() => {
    return orders.filter((o: any) => {
      const isPaid = ["paid", "processing", "shipped", "delivered"].includes(o.status);
      return isPaid && isDateWithinRange(o.createdAt);
    });
  }, [orders, isDateWithinRange]);

  const paidOrderIds = useMemo(() => {
    return new Set(paidOrders.map((o: any) => o.id));
  }, [paidOrders]);

  const visitorSessions: SessionAgg[] = useMemo(() => {
    const sessionMap = new Map<
      string,
      {
        sessionId: string;
        device: "mobile" | "desktop";
        firstTimestamp: number;
        lastTimestamp: number;
        events: any[];
        products: Set<string>;
        hasPurchase: boolean;
        hasCheckout: boolean;
        hasAddToCart: boolean;
        hasWhatsApp: boolean;
      }
    >();

    filteredEvents.forEach((e) => {
      const sId = e.sessionId || "anon";
      const ts = e.createdAt?.toDate
        ? e.createdAt.toDate().getTime()
        : e.clientTimestamp
          ? new Date(e.clientTimestamp).getTime()
          : Date.now();

      let sess = sessionMap.get(sId);
      if (!sess) {
        sess = {
          sessionId: sId,
          device: e.device === "mobile" ? "mobile" : "desktop",
          firstTimestamp: ts,
          lastTimestamp: ts,
          events: [],
          products: new Set(),
          hasPurchase: false,
          hasCheckout: false,
          hasAddToCart: false,
          hasWhatsApp: false,
        };
        sessionMap.set(sId, sess);
      }

      sess.events.push(e);
      if (ts < sess.firstTimestamp) sess.firstTimestamp = ts;
      if (ts > sess.lastTimestamp) sess.lastTimestamp = ts;

      if (e.eventName === "product_view" && e.data?.name) {
        sess.products.add(e.data.name);
      }
      if (e.eventName === "add_to_cart") {
        sess.hasAddToCart = true;
        if (e.data?.name) sess.products.add(e.data.name);
      }
      if (e.eventName === "begin_checkout") sess.hasCheckout = true;
      if (e.eventName === "whatsapp_order_click") sess.hasWhatsApp = true;
      if (
        e.eventName === "purchase" &&
        (e.data?.orderId ? paidOrderIds.has(e.data.orderId) : true)
      ) {
        sess.hasPurchase = true;
      }
    });

    const now = Date.now();
    const result: SessionAgg[] = [];

    sessionMap.forEach((sess, sId) => {
      const durationSeconds = Math.max(
        0,
        Math.floor((sess.lastTimestamp - sess.firstTimestamp) / 1000)
      );
      const durationMinutes = Math.floor(durationSeconds / 60);
      const durationStr = durationMinutes > 0 ? `${durationMinutes}m` : `${durationSeconds}s`;

      const diffFromNowMinutes = Math.floor((now - sess.lastTimestamp) / (1000 * 60));
      let lastActiveStr = "Just now";
      if (diffFromNowMinutes >= 60 * 24) {
        lastActiveStr = `${Math.floor(diffFromNowMinutes / (60 * 24))}d ago`;
      } else if (diffFromNowMinutes >= 60) {
        lastActiveStr = `${Math.floor(diffFromNowMinutes / 60)}h ago`;
      } else if (diffFromNowMinutes >= 1) {
        lastActiveStr = `${diffFromNowMinutes}m ago`;
      }

      let status: "browsing" | "left" | "converted" = "left";
      if (sess.hasPurchase) {
        status = "converted";
      } else if (diffFromNowMinutes < 15) {
        status = "browsing";
      }

      let intent = 15;
      intent += Math.min(30, sess.products.size * 15);
      if (sess.hasAddToCart) intent += 25;
      if (sess.hasWhatsApp) intent += 20;
      if (sess.hasCheckout) intent += 25;
      if (sess.hasPurchase) intent = 100;
      intent = Math.min(100, Math.max(10, intent));

      result.push({
        id: sId,
        sessionId: sId.length > 12 ? `${sId.slice(0, 4)}...${sId.slice(-4)}` : sId,
        device: sess.device,
        lastActive: lastActiveStr,
        lastActiveMs: sess.lastTimestamp,
        duration: durationStr,
        pageViews: sess.events.length,
        productsViewed: Array.from(sess.products),
        status,
        intentScore: intent,
      });
    });

    return result.sort((a, b) => b.lastActiveMs - a.lastActiveMs);
  }, [filteredEvents, paidOrderIds]);

  const activeNowCount = useMemo(() => {
    return visitorSessions.filter((s) => s.status === "browsing").length;
  }, [visitorSessions]);

  const trendingProducts = useMemo(() => {
    const productStats = new Map<string, { name: string; views: number; addToCart: number }>();

    filteredEvents.forEach((e) => {
      const pName = e.data?.name;
      if (!pName) return;

      let stat = productStats.get(pName);
      if (!stat) {
        stat = { name: pName, views: 0, addToCart: 0 };
        productStats.set(pName, stat);
      }

      if (e.eventName === "product_view") stat.views += 1;
      if (e.eventName === "add_to_cart") stat.addToCart += 1;
    });

    const list = Array.from(productStats.values());
    list.sort((a, b) => b.views + b.addToCart * 2 - (a.views + a.addToCart * 2));
    return list.slice(0, 5);
  }, [filteredEvents]);

  const funnelMetrics = useMemo(
    () => computeStorefrontFunnelMetrics(filteredEvents, paidOrders),
    [filteredEvents, paidOrders]
  );

  const salesFunnelRows = useMemo(() => {
    const funnelDocs = Array.isArray(rawFunnels) ? rawFunnels : [];
    const leadsList = Array.isArray(rawLeads) ? rawLeads : [];
    return funnelDocs.map((docItem: any) => {
      const cfg = normalizeFunnelConfig(docItem, docItem.id);
      const metrics = computeFunnelMetrics({
        funnelId: cfg.id,
        funnelSlug: cfg.slug,
        events: filteredEvents,
        orders,
        leads: leadsList,
      });
      return { cfg, metrics };
    });
  }, [rawFunnels, rawLeads, filteredEvents, orders]);

  const trackingConfig = useMemo(
    () => normalizeStoreTrackingConfig(websiteData?.trackingConfig),
    [websiteData?.trackingConfig]
  );
  const hasActivePixel =
    isValidGa4MeasurementId(trackingConfig.ga4MeasurementId) ||
    isValidMetaPixelId(trackingConfig.metaPixelId);

  const stats = useMemo(() => {
    const todayVisitors = visitorSessions.length;
    const totalPageViews = funnelMetrics.storefrontViews + funnelMetrics.productViews;
    const whatsappClicks = funnelMetrics.whatsappClicks;
    const paidRevenue = funnelMetrics.paidRevenue;
    const conversionRate = funnelMetrics.overallConversionRate.toFixed(1);

    return {
      activeNow: activeNowCount,
      todayVisitors,
      totalPageViews,
      whatsappClicks,
      paidRevenue,
      conversionRate,
    };
  }, [visitorSessions, funnelMetrics, activeNowCount]);

  const filteredSessions = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return visitorSessions;
    return visitorSessions.filter(
      (s) =>
        s.sessionId.toLowerCase().includes(term) ||
        s.productsViewed.some((p) => p.toLowerCase().includes(term))
    );
  }, [visitorSessions, searchTerm]);

  const getIntentColor = (score: number) => {
    if (score >= 80) return "text-rose-700 bg-rose-50 border-rose-200";
    if (score >= 40) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-sky-700 bg-sky-50 border-sky-200";
  };

  const getIntentLabel = (score: number) => {
    if (score >= 80) return "High Intent";
    if (score >= 40) return "Warm";
    return "Browsing";
  };

  const currencySymbol = getCurrencySymbol(business?.currency);
  const storeSlug = websiteData?.slug || business?.slug || "";
  const publicStoreUrl = resolveStorePreviewUrl({
    slug: storeSlug,
    businessId,
    isPreview: websiteData?.status !== "published",
  });

  if (isProfileLoading || (businessId && isEventsLoading)) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-700 opacity-60" />
      </div>
    );
  }

  if (!businessId) {
    return (
      <EmptyStatePanel
        icon={AlertCircle}
        title="Business Profile Required"
        description="Please log in with an active business profile to access storefront visitor insights."
      />
    );
  }

  return (
    <div className="space-y-6 pb-12 text-left">
      <PageHeader
        breadcrumb="Store Builder · Analytics"
        title="Visitor Insights"
        description="Real-time storefront traffic, shopper intent, and funnel conversion metrics."
        backHref="/website"
        backLabel="Back to Storefront Manager"
        icon={MousePointer2}
        actions={
          <>
            <Select value={dateFilter} onValueChange={(val: any) => setDateFilter(val)}>
              <SelectTrigger className="w-[145px] h-10 text-xs font-medium bg-white border-slate-200 rounded-xl">
                <Calendar className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="today" className="text-xs">
                  Today
                </SelectItem>
                <SelectItem value="7days" className="text-xs">
                  Last 7 Days
                </SelectItem>
                <SelectItem value="30days" className="text-xs">
                  Last 30 Days
                </SelectItem>
                <SelectItem value="all" className="text-xs">
                  All Time
                </SelectItem>
              </SelectContent>
            </Select>

            <Badge
              variant="outline"
              className={cn(
                "h-10 px-3.5 font-semibold text-xs gap-2 font-mono tabular-nums rounded-xl",
                stats.activeNow > 0
                  ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                  : "border-slate-200 text-slate-600 bg-white"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  stats.activeNow > 0 ? "bg-emerald-600" : "bg-slate-400"
                )}
              />
              {stats.activeNow} Live {stats.activeNow === 1 ? "Visitor" : "Visitors"}
            </Badge>

            <Button
              asChild
              variant="outline"
              className="h-10 px-4 rounded-xl border-slate-200 bg-white text-xs font-semibold"
            >
              <Link href={publicStoreUrl} target="_blank">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Visit Store
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiStatCard
          label="Store Visitors"
          value={stats.todayVisitors}
          subtext="Unique shopper sessions"
          icon={Users}
        />
        <KpiStatCard
          label="Total Page Views"
          value={stats.totalPageViews}
          subtext="Storefront & item views"
          icon={Eye}
        />
        <KpiStatCard
          label="WhatsApp Inquiries"
          value={stats.whatsappClicks}
          subtext="Direct chat clicks"
          icon={MessageCircle}
          tone="positive"
        />
        <KpiStatCard
          label="Paid Orders"
          value={paidOrders.length}
          subtext={`${currencySymbol}${stats.paidRevenue.toLocaleString()} settled`}
          icon={ShoppingBag}
          tone="dark"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <SectionCard
          className="lg:col-span-8"
          title="Storefront Conversion Funnel"
          description="Step-by-step shopper journey from store landing to paid checkout."
          headerRight={
            <div className="text-right font-mono tabular-nums">
              <p className="text-[11px] text-slate-500">AOV · Conversion</p>
              <p className="text-xs font-semibold text-slate-900">
                {currencySymbol}
                {funnelMetrics.averageOrderValue.toLocaleString()} ·{" "}
                {funnelMetrics.overallConversionRate}%
              </p>
            </div>
          }
        >
          <div className="space-y-3.5">
            {(() => {
              const steps = [
                { label: "Storefront Views", value: funnelMetrics.storefrontViews },
                { label: "Product Views", value: funnelMetrics.productViews },
                { label: "Added to Bag", value: funnelMetrics.addToCarts },
                { label: "Started Checkout", value: funnelMetrics.beginCheckouts },
                { label: "Paid Orders", value: funnelMetrics.paidOrders },
              ];
              const maxStep = Math.max(1, ...steps.map((s) => s.value));
              return steps.map((step) => {
                const widthPct = Math.round((step.value / maxStep) * 100);
                return (
                  <div key={step.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-700">{step.label}</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-900">
                        {step.value}
                      </span>
                    </div>
                    <Progress value={widthPct} className="h-2" />
                  </div>
                );
              });
            })()}
          </div>
        </SectionCard>

        <SectionCard className="lg:col-span-4" title="Audience & Promo Signals">
          <div className="space-y-5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-medium font-mono tabular-nums">
                <span className="flex items-center gap-1.5 font-sans text-slate-700">
                  <Smartphone className="h-3.5 w-3.5 text-slate-500" /> Mobile (
                  {funnelMetrics.deviceBreakdown.mobileSessions})
                </span>
                <span>{funnelMetrics.deviceBreakdown.mobilePercent}%</span>
              </div>
              <Progress value={funnelMetrics.deviceBreakdown.mobilePercent} className="h-2" />
              <div className="flex items-center justify-between text-xs font-medium font-mono tabular-nums pt-1">
                <span className="flex items-center gap-1.5 font-sans text-slate-700">
                  <Monitor className="h-3.5 w-3.5 text-slate-500" /> Desktop (
                  {funnelMetrics.deviceBreakdown.desktopSessions})
                </span>
                <span>{funnelMetrics.deviceBreakdown.desktopPercent}%</span>
              </div>
              <Progress value={funnelMetrics.deviceBreakdown.desktopPercent} className="h-2" />
            </div>

            <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-3 font-mono tabular-nums">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-sans text-slate-500">Cart-to-Order</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  {funnelMetrics.cartToOrderRate}%
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-sans text-slate-500">Promo Orders</p>
                <p className="text-lg font-bold text-emerald-700 mt-0.5">
                  {funnelMetrics.couponOrdersCount}
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Sales Funnel Performance"
        description="Per-funnel traffic, checkout starts, captured leads, orders & conversion rate."
        headerRight={
          <Button asChild variant="outline" size="sm" className="h-9 rounded-xl text-xs font-semibold">
            <Link href="/website/funnels">Manage Funnels</Link>
          </Button>
        }
        bodyClassName="p-0"
      >
        {salesFunnelRows.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No sales funnels created yet. Launch one from{" "}
            <Link href="/website/funnels" className="font-semibold text-slate-900 underline">
              Landing Page Builder
            </Link>{" "}
            to track funnel conversion rates here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200">
                  <TableHead className="text-xs font-semibold text-slate-600 pl-6 h-11">
                    Funnel Campaign
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-center h-11">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right h-11">
                    Visits
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right h-11">
                    Checkouts
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right h-11">
                    Orders
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right h-11">
                    Leads
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right h-11">
                    Revenue
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right pr-6 h-11">
                    Conv %
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesFunnelRows.map(({ cfg, metrics }) => (
                  <TableRow key={cfg.id} className="hover:bg-slate-50/70 border-b border-slate-100">
                    <TableCell className="pl-6 py-3.5">
                      <div className="flex flex-col">
                        <Link
                          href={resolveFunnelPreviewUrl({
                            businessId,
                            businessSlug: storeSlug,
                            funnelId: cfg.id,
                            funnelSlug: cfg.slug,
                            isPreview: cfg.status !== "published",
                          })}
                          target="_blank"
                          className="text-xs font-semibold text-slate-900 hover:underline flex items-center gap-1"
                        >
                          {cfg.name} <ExternalLink className="h-3 w-3 text-slate-400" />
                        </Link>
                        <span className="text-xs font-mono text-slate-500">
                          /funnel?fSlug={cfg.slug}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] font-semibold capitalize",
                          cfg.status === "published"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        )}
                      >
                        {cfg.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono tabular-nums font-medium">
                      {metrics.views}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono tabular-nums font-medium">
                      {metrics.checkoutsStarted}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono tabular-nums font-medium">
                      {metrics.ordersCount}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono tabular-nums font-medium">
                      {metrics.leadsCount}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono tabular-nums font-semibold text-slate-900">
                      {currencySymbol}
                      {metrics.revenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right pr-6 text-xs font-mono tabular-nums font-semibold text-emerald-700">
                      {metrics.conversionRate}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <SectionCard
            title="Live Traffic Feed"
            headerRight={
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-slate-500" />
                <div className="relative w-52">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter sessions..."
                    className="pl-8 h-9 text-xs bg-white border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            }
            bodyClassName="p-0"
          >
            {filteredSessions.length === 0 ? (
              <div className="p-6">
                <EmptyStatePanel
                  icon={MousePointer2}
                  title="No storefront sessions recorded yet"
                  description="Share your storefront link with shoppers to view live visitor sessions and conversion intent."
                  action={
                    <Button asChild variant="outline" size="sm" className="rounded-xl text-xs">
                      <Link href={publicStoreUrl} target="_blank">
                        Open Storefront <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 border-b border-slate-200">
                      <TableHead className="text-xs font-semibold text-slate-600 pl-6 h-11">
                        Visitor / Session
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center h-11">
                        Status
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center h-11">
                        Intent Score
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-right pr-6 h-11">
                        Activity
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.map((v) => (
                      <TableRow
                        key={v.id}
                        className="hover:bg-slate-50/70 transition-colors border-b border-slate-100"
                      >
                        <TableCell className="pl-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                              {v.device === "mobile" ? (
                                <Smartphone className="h-4 w-4 text-slate-700" />
                              ) : (
                                <Monitor className="h-4 w-4 text-slate-700" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-slate-900 font-mono">
                                {v.sessionId}
                              </span>
                              <span className="text-xs text-slate-500">{v.lastActive}</span>
                              {v.productsViewed.length > 0 && (
                                <span className="text-xs text-slate-600 truncate max-w-[200px] mt-0.5">
                                  {v.productsViewed.join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[11px] font-semibold capitalize",
                              v.status === "browsing"
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                : v.status === "converted"
                                  ? "text-sky-700 bg-sky-50 border-sky-200"
                                  : "text-slate-600 bg-slate-100 border-slate-200"
                            )}
                          >
                            {v.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[11px] font-semibold font-mono tabular-nums",
                                getIntentColor(v.intentScore)
                              )}
                            >
                              {getIntentLabel(v.intentScore)} ({v.intentScore})
                            </Badge>
                            <Progress value={v.intentScore} className="h-1 w-16" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex flex-col font-mono tabular-nums">
                            <span className="text-xs font-semibold text-slate-900">
                              {v.pageViews} {v.pageViews === 1 ? "Action" : "Actions"}
                            </span>
                            <span className="text-xs text-slate-500">{v.duration} active</span>
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

        <div className="lg:col-span-4 space-y-6">
          <SectionCard
            title="Trending Products"
            description="Most engaged catalog items"
            headerRight={<Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
            bodyClassName="p-0"
          >
            {trendingProducts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No product interactions logged in this period.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {trendingProducts.map((p, i) => (
                  <div
                    key={i}
                    className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-mono font-semibold text-xs text-slate-700 shrink-0">
                        #{i + 1}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-slate-900 truncate max-w-[160px]">
                          {p.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {p.addToCart > 0 ? `${p.addToCart} in cart` : "Viewed"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono tabular-nums">
                      <p className="text-xs font-semibold text-slate-900">{p.views}</p>
                      <p className="text-[11px] text-slate-500">Views</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="p-3 bg-slate-50 border-t border-slate-200">
              <Button
                asChild
                variant="ghost"
                className="w-full text-xs font-semibold text-slate-700"
              >
                <Link href="/website">
                  Manage Catalog <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            title="Top Shopper Searches"
            description="Queries typed in your storefront search bar"
            bodyClassName="p-0"
          >
            {funnelMetrics.topSearchQueries.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No customer searches logged in this date range.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {funnelMetrics.topSearchQueries.map((sq) => (
                  <div
                    key={sq.query}
                    className="px-5 py-3 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        &ldquo;{sq.query}&rdquo;
                      </p>
                      {sq.zeroResults > 0 && (
                        <p className="text-xs font-medium text-amber-700">
                          {sq.zeroResults} zero-result{" "}
                          {sq.zeroResults === 1 ? "lookup" : "lookups"}
                        </p>
                      )}
                    </div>
                    <span className="font-mono font-semibold text-slate-600 tabular-nums shrink-0">
                      {sq.count}×
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <div className="rounded-2xl border border-slate-200 bg-slate-900 text-white p-5 flex items-start gap-3.5">
            <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-white">
                {hasActivePixel ? "External Pixels Connected" : "Ad Pixel Integration"}
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                {hasActivePixel
                  ? `Live tracking active (${[
                      isValidGa4MeasurementId(trackingConfig.ga4MeasurementId) ? "GA4" : null,
                      isValidMetaPixelId(trackingConfig.metaPixelId) ? "Meta Pixel" : null,
                    ]
                      .filter(Boolean)
                      .join(" + ")}). Storefront events forward automatically.`
                  : "Connect your GA4 Measurement ID or Meta Pixel ID in Storefront Manager → SEO & Social."}
              </p>
              <Button
                asChild
                variant="link"
                className="h-auto p-0 text-xs font-semibold text-white underline"
              >
                <Link href="/website">Configure Pixels →</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
