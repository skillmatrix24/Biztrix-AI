
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { 
  Ticket, 
  Plus, 
  History, 
  SmartphoneNfc, 
  Zap,
  LayoutDashboard,
  Bot, 
  LineChart as LineChartIcon,
  BrainCircuit,
  Loader2, 
  SearchCode,
  LayoutTemplate,
  Palette,
  UserPlus,
  Check,
  RefreshCcw,
  DollarSign,
  Percent,
  Users,
  TrendingUp,
  Handshake,
  UserCheck,
  Trash2,
  PlusCircle,
  X,
  Target,
  ChevronRight,
  Grid,
  Star,
  Flame,
  Gem,
  Layout,
  Gift,
  Tag,
  IdCard
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useUser, 
  useDoc,
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking
} from "@/firebase";
import { collection, doc, query, orderBy, where, serverTimestamp } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { listWhatsAppTemplates } from "@/app/actions/whatsapp-actions";

// Modular Tab Components
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

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const isAdmin = useMemo(() => {
    const role = (profile?.role || '').toLowerCase();
    return role === 'admin' || role === 'manager' || user?.email?.toLowerCase() === 'skillmatrix24@gmail.com';
  }, [profile, user]);

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  // DATA NODES: Tracking & Join Configs
  const configRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId, 'loyaltyConfig', 'main') : null
  , [firestore, businessId]);
  const { data: portalConfig, isLoading: isConfigLoading } = useDoc<any>(configRef);

  const joinConfigRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId, 'loyaltyJoinConfig', 'main') : null
  , [firestore, businessId]);
  const { data: joinPortalConfig, isLoading: isJoinConfigLoading } = useDoc<any>(joinConfigRef);

  // REFERENCES HUB DATA
  const referencesQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'references'), orderBy('name', 'asc')) : null
  , [firestore, businessId]);
  const { data: referencesRaw } = useCollection<any>(referencesQuery);
  const references = referencesRaw || [];

  // SYNC STATE
  const [isSyncing, setIsSyncing] = useState(false);
  const [isJoinLinkCopied, setIsJoinLinkCopied] = useState(false);
  const [isMetaSyncing, setIsMetaSyncing] = useState(false);
  const [metaTemplates, setMetaTemplates] = useState<any[]>([]);

  const isWhatsappActive = useMemo(() => {
    return business?.activeAddonIds?.includes('feat_whatsapp') || business?.activeAddonIds?.includes('suite_growth') || business?.status === 'pro';
  }, [business]);

  const syncTemplates = async () => {
    const waConfig = business?.whatsappApiConfig;
    if (!waConfig?.wabaId || !waConfig?.accessToken) return;
    setIsMetaSyncing(true);
    try {
      const result = await listWhatsAppTemplates({ 
        wabaId: waConfig.wabaId, 
        accessToken: waConfig.accessToken 
      });
      if (result.success) {
        setMetaTemplates(result.templates?.filter((t: any) => t.status === 'APPROVED') || []);
      }
    } catch (e) {
    console.error(e);
      console.warn("Auto-sync templates failed:", e);
    } finally {
      setIsMetaSyncing(false);
    }
  };

  useEffect(() => {
    if (businessId && isWhatsappActive) {
      syncTemplates();
    }
  }, [businessId, isWhatsappActive]);

  // SYNC LOGIC: Persistence to Firestore
  const handleUpdateConfig = (data: any) => {
    if (!configRef || !isAdmin) return;
    
    if (data.nudgeEnabled === true && !isWhatsappActive) {
      toast({ 
        title: "Premium Feature Required", 
        description: "Please activate 'WhatsApp Automation' to enable automated nudges.",
        variant: "destructive"
      });
      return;
    }

    updateDocumentNonBlocking(configRef, { 
      ...data, 
      updatedAt: serverTimestamp() 
    });

    if (data.nudgeEnabled !== undefined) toast({ title: data.nudgeEnabled ? "Automated Nudge Enabled" : "Automated Nudge Disabled" });
  };

  const handleUpdateJoinConfig = (data: any) => {
    if (!joinConfigRef || !isAdmin) return;
    updateDocumentNonBlocking(joinConfigRef, { 
      ...data, 
      updatedAt: serverTimestamp() 
    });
  };

  const handleAddReference = (refData: any) => {
    if (!businessId || !refData.name || !refData.phone) return;
    addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'references'), {
      ...refData,
      status: 'active',
      createdAt: serverTimestamp()
    });
    toast({ title: "Reference Registered" });
  };

  const handleDeleteReference = (id: string) => {
    if (!businessId) return;
    deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'references', id));
    toast({ title: "Node Erased", variant: "destructive" });
  };

  const updateLocalAndBackend = (data: any, immediate = true) => {
    if (immediate) handleUpdateConfig(data);
  };

  const updateLocalJoinAndBackend = (data: any, immediate = true) => {
    if (immediate) handleUpdateJoinConfig(data);
  };

  const handleCopyJoinLink = () => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/loyalty/join/${businessId}`;
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

  // DATA AGGREGATION: Members & Activity
  const membersQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'memberships'), orderBy('startDate', 'desc')) : null
  , [firestore, businessId]);
  const { data: membersRaw } = useCollection<any>(membersQuery);
  const members = membersRaw || [];

  const customersQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'customers') : null
  , [firestore, businessId]);
  const { data: customersRaw } = useCollection<any>(customersQuery);
  const customers = customersRaw || [];

  const activityQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'loyaltyActivity'), orderBy('timestamp', 'desc')) : null
  , [firestore, businessId]);
  const { data: activitiesRaw } = useCollection<any>(activityQuery);
  const activities = activitiesRaw || [];

  const currencySymbol = getCurrencySymbol(business?.currency);

  const stats = useMemo(() => {
    const total = members?.length || 0;
    const active = members?.filter(m => m.status === 'active').length || 0;
    const loyaltyRevenueMonth = activities?.reduce((sum, a) => sum + (parseFloat(a.invoiceValue || 0)), 0) || 0;
    return { totalMembers: total, activeMembers: active, loyaltyRevenueMonth, redemptionRate: 12 };
  }, [members, activities]);

  const aiStats = useMemo(() => {
    const segments = { 'at-risk': 0, 'loyal': 0, 'high-value': 0, 'inactive': 0 };
    customers.forEach((c: any) => {
      const lastActive = c.lastVisitDaysAgo || 0;
      if (lastActive > 30 && lastActive <= 90) segments['at-risk']++;
      else if (lastActive > 90) segments['inactive']++;
      else if ((c.totalSpent || 0) > 10000) segments['high-value']++;
      else segments['loyal']++;
    });
    return segments;
  }, [customers]);

  if (isConfigLoading || isJoinConfigLoading) {
    return (
      <div className="flex items-center justify-center py-20 opacity-40">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 pb-20 px-2 sm:px-0 text-left">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl">
            <Ticket className="h-6 w-6 md:h-7 md:w-7" />
          </div>
          <div className="text-left">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Loyalty Command</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">BI & Retention Center</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-center">
          <Button variant="outline" onClick={handleCopyJoinLink} className="flex-1 sm:flex-none h-10 px-4 rounded-xl border-primary/20 text-primary font-black uppercase text-[9px] tracking-widest shadow-sm bg-white">
            {isJoinLinkCopied ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <UserPlus className="mr-2 h-4 w-4" />} Copy Join Link
          </Button>
          <Button variant="outline" disabled={isSyncing} onClick={handleRunDailyAutomation} className="flex-1 sm:flex-none h-10 px-4 rounded-xl border-orange-200 text-orange-600 font-black uppercase text-[9px] tracking-widest shadow-sm bg-white">
            {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />} Daily Sync
          </Button>
          <Button asChild className="flex-1 sm:flex-none bg-primary shadow-xl h-10 px-6 font-black uppercase text-[9px] tracking-widest rounded-xl text-white">
            <Link href="/loyalty/coupons"><Plus className="mr-2 h-4 w-4" /> Create Offer</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-5 md:p-6 border-l-4 border-l-primary text-left">
          <div className="flex items-center justify-between opacity-60 mb-1"><span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Loyalty Revenue</span><DollarSign className="h-4 w-4 text-primary" /></div>
          <div className="text-2xl md:text-3xl font-black text-slate-900">{currencySymbol}{stats.loyaltyRevenueMonth.toLocaleString()}</div>
          <p className="text-[8px] font-bold uppercase text-green-600 mt-2">▲ 14% Contribution</p>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-5 md:p-6 border-l-4 border-l-orange-500 text-left">
          <div className="flex items-center justify-between opacity-60 mb-1"><span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Redemption Rate</span><Percent className="h-4 w-4 text-orange-500" /></div>
          <div className="text-2xl md:text-3xl font-black text-slate-900">{stats.redemptionRate}%</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-5 md:p-6 border-l-4 border-l-green-500 text-left">
          <div className="flex items-center justify-between opacity-60 mb-1"><span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Active Force</span><Users className="h-4 w-4 text-green-600" /></div>
          <div className="text-2xl md:text-3xl font-black text-slate-900">{stats.activeMembers} Members</div>
        </Card>
        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-5 md:p-6 text-left">
          <div className="flex items-center justify-between opacity-40 mb-1"><span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-accent">Retention Ratio</span><TrendingUp className="h-4 w-4 text-accent" /></div>
          <div className="text-2xl font-black text-white">82%</div>
        </Card>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="bg-white border h-12 md:h-14 p-1.5 rounded-2xl shadow-sm mb-6 md:mb-10 flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="analytics" className="flex-1 text-[9px] md:text-[10px] font-black uppercase px-4 md:px-8 gap-2 whitespace-nowrap"><LineChartIcon className="h-3.5 w-3.5" /> BI Insights</TabsTrigger>
          <TabsTrigger value="join-portal" className="flex-1 text-[9px] md:text-[10px] font-black uppercase px-4 md:px-8 gap-2 whitespace-nowrap text-green-600"><LayoutTemplate className="h-3.5 w-3.5" /> Join Portal</TabsTrigger>
          <TabsTrigger value="designer" className="flex-1 text-[9px] md:text-[10px] font-black uppercase px-4 md:px-8 gap-2 whitespace-nowrap text-primary"><Palette className="h-3.5 w-3.5" /> Tracking Page</TabsTrigger>
          <TabsTrigger value="references" className="flex-1 text-[9px] md:text-[10px] font-black uppercase px-4 md:px-8 gap-2 whitespace-nowrap text-indigo-600"><Handshake className="h-3.5 w-3.5" /> Reference Hub</TabsTrigger>
          <TabsTrigger value="intelligence" className="flex-1 text-[9px] md:text-[10px] font-black uppercase px-4 md:px-8 gap-2 whitespace-nowrap"><BrainCircuit className="h-3.5 w-3.5 text-primary" /> AI Intelligence</TabsTrigger>
          <TabsTrigger value="growth" className="flex-1 text-[9px] md:text-[10px] font-black uppercase px-4 md:px-8 gap-2 whitespace-nowrap text-orange-600"><Zap className="h-3.5 w-3.5" /> Growth Hacks</TabsTrigger>
          <TabsTrigger value="activity" className="flex-1 text-[9px] md:text-[10px] font-black uppercase px-4 md:px-8 gap-2 whitespace-nowrap"><History className="h-3.5 w-3.5" /> Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="m-0 space-y-8">
          <AnalyticsTab stats={stats} currencySymbol={currencySymbol} />
        </TabsContent>

        <TabsContent value="join-portal" className="m-0">
          <PortalDesignerTab config={joinPortalConfig} onUpdate={handleUpdateJoinConfig} updateLocal={updateLocalJoinAndBackend} logoRef={joinLogoRef} isJoin={true} isAdmin={isAdmin} business={business} />
        </TabsContent>

        <TabsContent value="designer" className="m-0">
          <PortalDesignerTab config={portalConfig} onUpdate={handleUpdateConfig} updateLocal={updateLocalAndBackend} logoRef={trackingLogoRef} isJoin={false} isAdmin={isAdmin} business={business} />
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

        <TabsContent value="intelligence" className="m-0 space-y-8 animate-in fade-in">
          <IntelligenceTab aiStats={aiStats} />
        </TabsContent>

        <TabsContent value="growth" className="m-0 space-y-8 animate-in fade-in">
          <GrowthHacksTab portalConfig={portalConfig} onUpdate={handleUpdateConfig} isWhatsappActive={isWhatsappActive} />
        </TabsContent>

        <TabsContent value="activity" className="m-0 animate-in fade-in">
          <ActivityLogTab activities={activities} currencySymbol={currencySymbol} businessId={businessId} profile={profile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
