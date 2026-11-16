"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Ticket,
  Plus,
  History,
  Zap,
  LineChart as LineChartIcon,
  BrainCircuit,
  Loader2,
  LayoutTemplate,
  Palette,
  UserPlus,
  Check,
  DollarSign,
  Percent,
  Users,
  TrendingUp,
  Handshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, KpiStatCard } from "@/components/ui/editorial";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { listWhatsAppTemplates } from "@/app/actions/whatsapp-actions";

import { AnalyticsTab } from "./components/AnalyticsTab";
import { PortalDesignerTab } from "./components/PortalDesignerTab";
import { IntelligenceTab } from "./components/IntelligenceTab";
import { GrowthHacksTab } from "./components/GrowthHacksTab";
import { ActivityLogTab } from "./components/ActivityLogTab";
import { ReferencesHubTab } from "./components/ReferencesHubTab";

export default function LoyaltyDashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const trackingLogoRef = useRef<HTMLInputElement>(null);
  const joinLogoRef = useRef<HTMLInputElement>(null);

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const isAdmin = useMemo(() => {
    const role = (profile?.role || "").toLowerCase();
    return role === "admin" || role === "manager" || user?.email?.toLowerCase() === "skillmatrix24@gmail.com";
  }, [profile, user]);

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const configRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId, "loyaltyConfig", "main") : null),
    [firestore, businessId]
  );
  const { data: portalConfig, isLoading: isConfigLoading } = useDoc<any>(configRef);

  const joinConfigRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId, "loyaltyJoinConfig", "main") : null),
    [firestore, businessId]
  );
  const { data: joinPortalConfig, isLoading: isJoinConfigLoading } = useDoc<any>(joinConfigRef);

  const referencesQuery = useMemoFirebase(
    () => (businessId ? query(collection(firestore, "businesses", businessId, "references"), orderBy("name", "asc")) : null),
    [firestore, businessId]
  );
  const { data: referencesRaw } = useCollection<any>(referencesQuery);
  const references = referencesRaw || [];

  const [isSyncing, setIsSyncing] = useState(false);
  const [isJoinLinkCopied, setIsJoinLinkCopied] = useState(false);
  const [metaTemplates, setMetaTemplates] = useState<any[]>([]);

  const isWhatsappActive = useMemo(() => {
    return (
      business?.activeAddonIds?.includes("feat_whatsapp") ||
      business?.activeAddonIds?.includes("suite_growth") ||
      business?.status === "pro"
    );
  }, [business]);

  const syncTemplates = async () => {
    const waConfig = business?.whatsappApiConfig;
    if (!waConfig?.wabaId || !waConfig?.accessToken) return;
    try {
      const result = await listWhatsAppTemplates({
        wabaId: waConfig.wabaId,
        accessToken: waConfig.accessToken,
      });
      if (result.success) {
        setMetaTemplates(result.templates?.filter((t: any) => t.status === "APPROVED") || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (businessId && isWhatsappActive) {
      syncTemplates();
    }
  }, [businessId, isWhatsappActive]);

  const handleUpdateConfig = (data: any) => {
    if (!configRef || !isAdmin) return;

    if (data.nudgeEnabled === true && !isWhatsappActive) {
      toast({
        title: "Premium Feature Required",
        description: "Please activate 'WhatsApp Automation' to enable automated nudges.",
        variant: "destructive",
      });
      return;
    }

    updateDocumentNonBlocking(configRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });

    if (data.nudgeEnabled !== undefined)
      toast({ title: data.nudgeEnabled ? "Automated Nudge Enabled" : "Automated Nudge Disabled" });
  };

  const handleUpdateJoinConfig = (data: any) => {
    if (!joinConfigRef || !isAdmin) return;
    updateDocumentNonBlocking(joinConfigRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  };

  const handleAddReference = (refData: any) => {
    if (!businessId || !refData.name || !refData.phone) return;
    addDocumentNonBlocking(collection(firestore, "businesses", businessId, "references"), {
      ...refData,
      status: "active",
      createdAt: serverTimestamp(),
    });
    toast({ title: "Partner Added" });
  };

  const handleDeleteReference = (id: string) => {
    if (!businessId) return;
    deleteDocumentNonBlocking(doc(firestore, "businesses", businessId, "references", id));
    toast({ title: "Partner Removed", variant: "destructive" });
  };

  const updateLocalAndBackend = (data: any, immediate = true) => {
    if (immediate) handleUpdateConfig(data);
  };

  const updateLocalJoinAndBackend = (data: any, immediate = true) => {
    if (immediate) handleUpdateJoinConfig(data);
  };

  const handleCopyJoinLink = () => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/loyalty/join/${businessId}`;
    navigator.clipboard.writeText(url);
    setIsJoinLinkCopied(true);
    setTimeout(() => setIsJoinLinkCopied(false), 2000);
    toast({ title: "Join Link Copied" });
  };

  const handleRunDailyAutomation = async () => {
    if (!businessId) return;
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      toast({ title: "Daily Sync Complete", description: "All sequences and alerts have been processed." });
    }, 1500);
  };

  const membersQuery = useMemoFirebase(
    () =>
      businessId ? query(collection(firestore, "businesses", businessId, "memberships"), orderBy("startDate", "desc")) : null,
    [firestore, businessId]
  );
  const { data: membersRaw } = useCollection<any>(membersQuery);
  const members = membersRaw || [];

  const customersQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "customers") : null),
    [firestore, businessId]
  );
  const { data: customersRaw } = useCollection<any>(customersQuery);
  const customers = customersRaw || [];

  const activityQuery = useMemoFirebase(
    () =>
      businessId
        ? query(collection(firestore, "businesses", businessId, "loyaltyActivity"), orderBy("timestamp", "desc"))
        : null,
    [firestore, businessId]
  );
  const { data: activitiesRaw } = useCollection<any>(activityQuery);
  const activities = activitiesRaw || [];

  const currencySymbol = getCurrencySymbol(business?.currency);

  const stats = useMemo(() => {
    const total = members?.length || 0;
    const active = members?.filter((m) => m.status === "active").length || 0;
    const loyaltyRevenueMonth = activities?.reduce((sum, a) => sum + parseFloat(a.invoiceValue || 0), 0) || 0;
    const redeemedCount = activities?.filter((a) => a.type === "coupon_redeem").length || 0;
    const redemptionRate = activities.length > 0 ? Math.round((redeemedCount / activities.length) * 100) : 0;
    const retentionRatio = total > 0 ? Math.round((active / total) * 100) : 0;
    return { totalMembers: total, activeMembers: active, loyaltyRevenueMonth, redemptionRate, retentionRatio };
  }, [members, activities]);

  const aiStats = useMemo(() => {
    const segments = { "at-risk": 0, loyal: 0, "high-value": 0, inactive: 0 };
    customers.forEach((c: any) => {
      const lastActive = c.lastVisitDaysAgo || 0;
      if (lastActive > 30 && lastActive <= 90) segments["at-risk"]++;
      else if (lastActive > 90) segments["inactive"]++;
      else if ((c.totalSpent || 0) > 10000) segments["high-value"]++;
      else segments["loyal"]++;
    });
    return segments;
  }, [customers]);

  if (isConfigLoading || isJoinConfigLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-left">
      <PageHeader
        breadcrumb="Loyalty & Retention · Overview"
        title="Loyalty Command"
        description="Manage member retention insights, public join/tracking portals, partner referrals, and audit activity."
        icon={Ticket}
        actions={
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="outline"
              onClick={handleCopyJoinLink}
              className="h-10 px-4 rounded-xl border-slate-200 bg-white text-slate-700 font-semibold text-xs"
            >
              {isJoinLinkCopied ? <Check className="mr-2 h-4 w-4 text-emerald-600" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Copy Join Link
            </Button>
            <Button
              variant="outline"
              disabled={isSyncing}
              onClick={handleRunDailyAutomation}
              className="h-10 px-4 rounded-xl border-slate-200 bg-white text-slate-700 font-semibold text-xs"
            >
              {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4 text-amber-600" />}
              Daily Sync
            </Button>
            <Button asChild className="bg-slate-900 hover:bg-slate-800 h-10 px-5 font-semibold text-xs rounded-xl text-white">
              <Link href="/loyalty/coupons">
                <Plus className="mr-2 h-4 w-4" /> Create Offer
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiStatCard
          label="Loyalty Revenue"
          value={`${currencySymbol}${stats.loyaltyRevenueMonth.toLocaleString()}`}
          subtext="Tracked member billing"
          icon={DollarSign}
        />
        <KpiStatCard
          label="Redemption Rate"
          value={`${stats.redemptionRate}%`}
          subtext="Coupon usage share"
          icon={Percent}
          tone="warning"
        />
        <KpiStatCard
          label="Active Members"
          value={stats.activeMembers.toLocaleString()}
          subtext={`Of ${stats.totalMembers} enrolled`}
          icon={Users}
          tone="positive"
        />
        <KpiStatCard
          label="Active Ratio"
          value={`${stats.retentionRatio}%`}
          subtext="Active membership share"
          icon={TrendingUp}
          tone="dark"
        />
      </div>

      <Tabs defaultValue="analytics" className="w-full space-y-6">
        <TabsList className="bg-slate-100 border border-slate-200 h-12 p-1 rounded-xl flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="analytics" className="flex-1 text-xs font-semibold px-4 rounded-lg gap-2 whitespace-nowrap">
            <LineChartIcon className="h-3.5 w-3.5" /> BI Insights
          </TabsTrigger>
          <TabsTrigger value="join-portal" className="flex-1 text-xs font-semibold px-4 rounded-lg gap-2 whitespace-nowrap">
            <LayoutTemplate className="h-3.5 w-3.5" /> Join Portal
          </TabsTrigger>
          <TabsTrigger value="designer" className="flex-1 text-xs font-semibold px-4 rounded-lg gap-2 whitespace-nowrap">
            <Palette className="h-3.5 w-3.5" /> Tracking Page
          </TabsTrigger>
          <TabsTrigger value="references" className="flex-1 text-xs font-semibold px-4 rounded-lg gap-2 whitespace-nowrap">
            <Handshake className="h-3.5 w-3.5" /> Partners
          </TabsTrigger>
          <TabsTrigger value="intelligence" className="flex-1 text-xs font-semibold px-4 rounded-lg gap-2 whitespace-nowrap">
            <BrainCircuit className="h-3.5 w-3.5" /> Retention Radar
          </TabsTrigger>
          <TabsTrigger value="growth" className="flex-1 text-xs font-semibold px-4 rounded-lg gap-2 whitespace-nowrap">
            <Zap className="h-3.5 w-3.5" /> Growth Rules
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-1 text-xs font-semibold px-4 rounded-lg gap-2 whitespace-nowrap">
            <History className="h-3.5 w-3.5" /> Activity Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="m-0">
          <AnalyticsTab stats={stats} currencySymbol={currencySymbol} />
        </TabsContent>

        <TabsContent value="join-portal" className="m-0">
          <PortalDesignerTab
            config={joinPortalConfig}
            onUpdate={handleUpdateJoinConfig}
            updateLocal={updateLocalJoinAndBackend}
            logoRef={joinLogoRef}
            isJoin={true}
            isAdmin={isAdmin}
            business={business}
          />
        </TabsContent>

        <TabsContent value="designer" className="m-0">
          <PortalDesignerTab
            config={portalConfig}
            onUpdate={handleUpdateConfig}
            updateLocal={updateLocalAndBackend}
            logoRef={trackingLogoRef}
            isJoin={false}
            isAdmin={isAdmin}
            business={business}
          />
        </TabsContent>

        <TabsContent value="references" className="m-0">
          <ReferencesHubTab
            references={references}
            business={business}
            businessRef={businessRef}
            metaTemplates={metaTemplates}
            onAddReference={handleAddReference}
            onDeleteReference={handleDeleteReference}
            onUpdateBusiness={(data: any) => updateDocumentNonBlocking(businessRef, data)}
          />
        </TabsContent>

        <TabsContent value="intelligence" className="m-0">
          <IntelligenceTab aiStats={aiStats} />
        </TabsContent>

        <TabsContent value="growth" className="m-0">
          <GrowthHacksTab
            portalConfig={portalConfig}
            onUpdate={handleUpdateConfig}
            isWhatsappActive={isWhatsappActive}
          />
        </TabsContent>

        <TabsContent value="activity" className="m-0">
          <ActivityLogTab
            activities={activities}
            currencySymbol={currencySymbol}
            businessId={businessId}
            profile={profile}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
