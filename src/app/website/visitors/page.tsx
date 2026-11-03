"use client";

import { useState, useMemo } from "react";
import { 
  MousePointer2, 
  Users, 
  MessageCircle, 
  TrendingUp, 
  Clock, 
  Eye, 
  ArrowUpRight,
  Zap,
  Package,
  History,
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  Monitor,
  Smartphone,
  Search,
  Filter,
  Star,
  ShoppingBag,
  ExternalLink,
  Loader2,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { collection, doc, query, where, orderBy, limit } from "firebase/firestore";
import Link from "next/link";

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
  intentScore: number; // 0-100
};

export default function VisitorInsightsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  // 1. Authoritative User & Tenant Resolution
  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);

  const businessId = userProfile?.businessId;

  // 2. Fetch Business Metadata (Currency, Store info)
  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const websiteRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId, 'websites', 'main') : null
  , [firestore, businessId]);
  const { data: websiteData } = useDoc<any>(websiteRef);

  // 3. Safe Bounded Query: Recent Storefront Telemetry Events (limit 100)
  const eventsQuery = useMemoFirebase(() => 
    businessId ? query(
      collection(firestore, 'businesses', businessId, 'storefront_events'),
      orderBy('createdAt', 'desc'),
      limit(100)
    ) : null
  , [firestore, businessId]);
  const { data: rawEvents = [], isLoading: isEventsLoading } = useCollection<any>(eventsQuery);
  const events = useMemo(() => (Array.isArray(rawEvents) ? rawEvents : []), [rawEvents]);

  // 4. Safe Bounded Query: Storefront Orders (limit 100)
  const ordersQuery = useMemoFirebase(() => 
    businessId ? query(
      collection(firestore, 'businesses', businessId, 'orders'),
      where('source', '==', 'storefront'),
      orderBy('createdAt', 'desc'),
      limit(100)
    ) : null
  , [firestore, businessId]);
  const { data: rawOrders = [], isLoading: isOrdersLoading } = useCollection<any>(ordersQuery);
  const orders = useMemo(() => (Array.isArray(rawOrders) ? rawOrders : []), [rawOrders]);

  // 5. Query Active Catalog Products
  const productsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'products') : null
  , [firestore, businessId]);
  const { data: dbProducts = [] } = useCollection<any>(productsQuery);

  // 6. UI Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"today" | "7days" | "30days" | "all">("all");

  // Date Filter Logic (Helper)
  const isDateWithinRange = (dateObj: any) => {
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
  };

  // Filtered Events according to selected date boundary
  const filteredEvents = useMemo(() => {
    return events.filter(e => isDateWithinRange(e.createdAt || e.clientTimestamp));
  }, [events, dateFilter]);

  // Authoritative Paid Orders: Excludes created, payment_captured_unsettled, cancelled, refunded
  const paidOrders = useMemo(() => {
    return orders.filter((o: any) => {
      const isPaid = ['paid', 'processing', 'shipped', 'delivered'].includes(o.status);
      return isPaid && isDateWithinRange(o.createdAt);
    });
  }, [orders, dateFilter]);

  // Paid Order IDs for session conversion matching
  const paidOrderIds = useMemo(() => {
    return new Set(paidOrders.map((o: any) => o.id));
  }, [paidOrders]);

  // Group events by sessionId into real Visitor Sessions
  const visitorSessions: SessionAgg[] = useMemo(() => {
    const sessionMap = new Map<string, {
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
    }>();

    filteredEvents.forEach(e => {
      const sId = e.sessionId || "anon";
      const ts = e.createdAt?.toDate ? e.createdAt.toDate().getTime() : (e.clientTimestamp ? new Date(e.clientTimestamp).getTime() : Date.now());
      
      let sess = sessionMap.get(sId);
      if (!sess) {
        sess = {
          sessionId: sId,
          device: (e.device === 'mobile' ? 'mobile' : 'desktop'),
          firstTimestamp: ts,
          lastTimestamp: ts,
          events: [],
          products: new Set(),
          hasPurchase: false,
          hasCheckout: false,
          hasAddToCart: false,
          hasWhatsApp: false
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
      if (e.eventName === "purchase" && (e.data?.orderId ? paidOrderIds.has(e.data.orderId) : true)) {
        sess.hasPurchase = true;
      }
    });

    const now = Date.now();
    const result: SessionAgg[] = [];

    sessionMap.forEach((sess, sId) => {
      const durationSeconds = Math.max(0, Math.floor((sess.lastTimestamp - sess.firstTimestamp) / 1000));
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

      // Real status calculation
      let status: "browsing" | "left" | "converted" = "left";
      if (sess.hasPurchase) {
        status = "converted";
      } else if (diffFromNowMinutes < 15) {
        status = "browsing";
      }

      // Calculated Intent Score (0-100)
      let intent = 15; // base view intent
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
        intentScore: intent
      });
    });

    return result.sort((a, b) => b.lastActiveMs - a.lastActiveMs);
  }, [filteredEvents, paidOrderIds]);

  // Live active visitors (active in last 15 minutes)
  const activeNowCount = useMemo(() => {
    return visitorSessions.filter(s => s.status === 'browsing').length;
  }, [visitorSessions]);

  // Aggregate Trending Products from real telemetry
  const trendingProducts = useMemo(() => {
    const productStats = new Map<string, { name: string; views: number; addToCart: number }>();

    filteredEvents.forEach(e => {
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
    list.sort((a, b) => (b.views + b.addToCart * 2) - (a.views + a.addToCart * 2));
    return list.slice(0, 5);
  }, [filteredEvents]);

  // Core KPI Calculations
  const stats = useMemo(() => {
    const todayVisitors = visitorSessions.length;
    const totalPageViews = filteredEvents.filter(e => e.eventName === "storefront_view" || e.eventName === "product_view").length;
    const whatsappClicks = filteredEvents.filter(e => e.eventName === "whatsapp_order_click").length;
    const paidRevenue = paidOrders.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
    const conversionRate = todayVisitors > 0 ? ((paidOrders.length / todayVisitors) * 100).toFixed(1) : "0.0";

    return {
      activeNow: activeNowCount,
      todayVisitors,
      totalPageViews,
      whatsappClicks,
      paidRevenue,
      conversionRate
    };
  }, [visitorSessions, filteredEvents, paidOrders, activeNowCount]);

  // Search filtered session list
  const filteredSessions = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return visitorSessions;
    return visitorSessions.filter(s => 
      s.sessionId.toLowerCase().includes(term) ||
      s.productsViewed.some(p => p.toLowerCase().includes(term))
    );
  }, [visitorSessions, searchTerm]);

  const getIntentColor = (score: number) => {
    if (score >= 80) return "text-red-600 bg-red-50 border-red-100";
    if (score >= 40) return "text-orange-600 bg-orange-50 border-orange-100";
    return "text-blue-600 bg-blue-50 border-blue-100";
  };

  const getIntentLabel = (score: number) => {
    if (score >= 80) return "HIGH INTENT";
    if (score >= 40) return "WARM";
    return "COLD";
  };

  const currencySymbol = getCurrencySymbol(business?.currency);
  const storeSlug = websiteData?.slug || "";
  const publicStoreUrl = storeSlug ? `/shop?slug=${storeSlug}` : "/shop";

  if (isProfileLoading || (businessId && isEventsLoading)) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-40" />
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border shadow-sm space-y-4">
        <AlertCircle className="h-10 w-10 text-orange-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Tenant Account Required</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Please log in with an active business profile to access storefront telemetry insights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
            <MousePointer2 className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">Visitor Insights</h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              Real-time storefront telemetry, shopper intent, and conversion intelligence.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filter selector */}
          <Select value={dateFilter} onValueChange={(val: any) => setDateFilter(val)}>
            <SelectTrigger className="w-[140px] h-9 text-xs font-bold bg-white">
              <Calendar className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today" className="text-xs font-medium">Today</SelectItem>
              <SelectItem value="7days" className="text-xs font-medium">Last 7 Days</SelectItem>
              <SelectItem value="30days" className="text-xs font-medium">Last 30 Days</SelectItem>
              <SelectItem value="all" className="text-xs font-medium">All Time</SelectItem>
            </SelectContent>
          </Select>

          {/* Live Visitor status badge */}
          <Badge variant="outline" className={cn(
            "h-9 px-4 font-bold gap-2",
            stats.activeNow > 0 ? "border-green-200 text-green-600 bg-green-50" : "border-slate-200 text-slate-600 bg-slate-50"
          )}>
            <div className={cn("h-2 w-2 rounded-full", stats.activeNow > 0 ? "bg-green-500 animate-pulse" : "bg-slate-400")} />
            {stats.activeNow} LIVE {stats.activeNow === 1 ? 'VISITOR' : 'VISITORS'}
          </Badge>

          {/* Storefront Link */}
          <Button asChild variant="outline" size="sm" className="h-9 text-xs font-bold bg-white">
            <Link href={publicStoreUrl} target="_blank">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Visit Store
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Real-Time KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm bg-white rounded-xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between pb-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Store Visitors</p>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">{stats.todayVisitors}</span>
              <span className="text-[10px] text-muted-foreground font-semibold">unique sessions</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between pb-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Page Views</p>
              <Eye className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">{stats.totalPageViews}</span>
              <span className="text-[10px] text-muted-foreground font-semibold">store & item views</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between pb-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">WhatsApp Inquiries</p>
              <MessageCircle className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-600">{stats.whatsappClicks}</span>
              <span className="text-[10px] text-muted-foreground font-semibold">chat clicks</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between pb-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Paid Orders</p>
              <ShoppingBag className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">{paidOrders.length}</span>
              <span className="text-[10px] text-primary font-bold">({currencySymbol}{stats.paidRevenue.toLocaleString()})</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Live Visitor Feed */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden border">
            <CardHeader className="bg-muted/30 border-b py-4 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Zap className="h-4 w-4" /> Live Traffic Feed
              </CardTitle>
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter sessions..." 
                  className="pl-9 h-8 text-[10px] bg-white border-none shadow-inner" 
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10">
                      <TableHead className="text-[10px] font-bold uppercase pl-6">Visitor / Session</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">Status</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">Intent Score</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-right pr-6">Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <MousePointer2 className="h-8 w-8 text-muted-foreground/30" />
                            <p className="text-xs font-semibold text-muted-foreground">No storefront sessions recorded yet</p>
                            <p className="text-[10px] text-muted-foreground max-w-xs">
                              Share your storefront link with shoppers to begin seeing live visitor activity and conversion analytics.
                            </p>
                            <Button asChild variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase mt-2">
                              <Link href={publicStoreUrl} target="_blank">Open Storefront <ExternalLink className="ml-1 h-3 w-3" /></Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSessions.map((v) => (
                        <TableRow key={v.id} className="group hover:bg-muted/5 transition-colors">
                          <TableCell className="pl-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                                {v.device === 'mobile' ? <Smartphone className="h-4 w-4 text-primary" /> : <Monitor className="h-4 w-4 text-primary" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-primary font-mono">{v.sessionId}</span>
                                <span className="text-[9px] text-muted-foreground font-semibold uppercase">{v.lastActive}</span>
                                {v.productsViewed.length > 0 && (
                                  <span className="text-[10px] text-slate-600 truncate max-w-[200px] mt-0.5">
                                    {v.productsViewed.join(", ")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cn(
                              "text-[8px] h-4 py-0 font-bold uppercase",
                              v.status === 'browsing' ? "text-green-600 bg-green-50 border-green-200" : 
                              v.status === 'converted' ? "text-primary bg-primary/10 border-primary/20" : "text-muted-foreground"
                            )}>
                              {v.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Badge className={cn("text-[8px] h-4 py-0 font-bold border-none", getIntentColor(v.intentScore))}>
                                {getIntentLabel(v.intentScore)} ({v.intentScore})
                              </Badge>
                              <Progress value={v.intentScore} className="h-1 w-16" />
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold">{v.pageViews} {v.pageViews === 1 ? 'Action' : 'Actions'}</span>
                              <span className="text-[9px] text-muted-foreground font-medium">{v.duration} active</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Most Interested Products */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden border">
            <CardHeader className="bg-primary py-5 px-6">
              <CardTitle className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Star className="h-4 w-4 fill-accent text-accent" /> Trending Products
              </CardTitle>
              <p className="text-white/70 text-[9px] font-bold uppercase tracking-tighter">
                Most engaged catalog items
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {trendingProducts.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground italic">
                  No product interactions logged in this period.
                </div>
              ) : (
                <div className="divide-y">
                  {trendingProducts.map((p, i) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/5 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                          #{i + 1}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-primary truncate max-w-[160px]">{p.name}</span>
                          <span className="text-[9px] text-muted-foreground font-semibold">
                            {p.addToCart > 0 ? `${p.addToCart} in cart` : "Viewed"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-primary">{p.views}</p>
                        <p className="text-[8px] font-bold text-muted-foreground uppercase">Views</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-muted/10 p-4 border-t">
              <Button asChild variant="ghost" className="w-full text-[10px] font-bold uppercase text-primary hover:bg-primary/5">
                <Link href="/website">Manage Catalog <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-none shadow-md bg-accent/10 border-accent/20 rounded-2xl overflow-hidden">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-primary uppercase">Conversion Engine</p>
                <p className="text-[10px] text-primary/70 leading-relaxed italic">
                  Storefront events are isolated per tenant and synchronized in real-time with Meta & Google Pixels.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
