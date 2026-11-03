"use client";

import { useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Receipt, 
  Package, 
  Users, 
  Truck,
  ListTodo,
  Zap, 
  ShoppingBag, 
  Lightbulb, 
  Globe, 
  Settings as SettingsIcon, 
  UserCheck, 
  MousePointer2, 
  SmartphoneNfc, 
  Wallet, 
  Users2, 
  Briefcase, 
  Bot, 
  ShoppingBasket, 
  Coins, 
  ShieldCheck, 
  BookOpenText, 
  Clock, 
  KeyRound, 
  UserCog, 
  Handshake, 
  Building, 
  Target, 
  Trophy, 
  Activity, 
  MessageCircle, 
  Sparkles, 
  Ticket, 
  Gem, 
  MessageSquare, 
  IdCard, 
  Settings2, 
  SearchCode,
  ChevronRight,
  Headset,
  Layers,
  FileSpreadsheet,
  Users as UsersIcon,
  LineChart,
  Sun,
  LayoutList,
  ClipboardCheck,
  Settings2 as EngineeringIcon,
  Shield,
  Wrench,
  ShieldAlert,
  BarChart3,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { differenceInDays, parseISO } from "date-fns";

// Fallback logic for when icon components are not found
const UserCheckIcon = Users;

// CORE / FREE ITEMS
const mainItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Daily Entries", href: "/daily-entries", icon: BookOpenText },
  { label: "Billing (POS)", href: "/billing", icon: Receipt },
  { label: "Quotations", href: "/quotations", icon: FileSpreadsheet },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "CRM & Leads", href: "/leads", icon: UserCheckIcon },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Vendors", href: "/vendors", icon: Truck },
];

// SOLAR MANAGEMENT
const solarItems = [
  { label: "Control Hub", href: "/solar/operations", icon: LayoutDashboard, suiteId: 'suite_solar' },
  { label: "Plants Registry", href: "/solar/plants", icon: Globe, suiteId: 'suite_solar' },
  { label: "Inquiries", href: "/solar/inquiries", icon: LayoutList, suiteId: 'suite_solar' },
  { label: "Site Surveys", href: "/solar/surveys", icon: ClipboardCheck, suiteId: 'suite_solar' },
  { label: "System Designs", href: "/solar/designs", icon: EngineeringIcon, suiteId: 'suite_solar' },
  { label: "Solar Quotations", href: "/solar/quotations", icon: FileSpreadsheet, suiteId: 'suite_solar' },
  { label: "Field Installations", href: "/solar/installations", icon: Briefcase, suiteId: 'suite_solar' },
  { label: "Procurement Hub", href: "/solar/procurement", icon: ShoppingBasket, suiteId: 'suite_solar' },
  { label: "Partner Commissions", href: "/solar/commissions", icon: Handshake, suiteId: 'suite_solar' },
  { label: "Warranty Ledger", href: "/solar/warranties", icon: Shield, suiteId: 'suite_solar' },
  { label: "Service Tickets", href: "/solar/service", icon: Wrench, suiteId: 'suite_solar' },
  { label: "AMC Contracts", href: "/solar/amc", icon: ShieldAlert, suiteId: 'suite_solar' },
  { label: "Document Hub", href: "/solar/documents", icon: FileText, suiteId: 'suite_solar' },
  { label: "Reports", href: "/solar/reports", icon: BarChart3, suiteId: 'suite_solar' },
  { label: "BI Analytics", href: "/solar/analytics", icon: LineChart, suiteId: 'suite_solar' },
  { label: "AI Insights", href: "/solar/ai-insights", icon: Sparkles, suiteId: 'suite_solar' },
];

// ENGAGEMENT MODULE
const engagementItems = [
  { label: "Customer Feedback", href: "/feedback", icon: MessageCircle, addonId: 'feat_feedback' },
  { label: "Support Desk", href: "/complaints", icon: Headset, suiteId: 'suite_support' },
];

const ownerItems = [
  { label: "Overview", href: "/owner", icon: ShieldCheck },
  { label: "Platform Blueprint", href: "/owner/blueprint", icon: Layers },
  { label: "System Limits", href: "/owner/limits", icon: Activity },
  { label: "Modules", href: "/owner/marketplace", icon: ShoppingBasket },
  { label: "Gateways", href: "/owner/gateways", icon: KeyRound },
  { label: "Global Users", href: "/owner/users", icon: UserCog },
];

const propertyItems = [
  { label: "Property Catalog", href: "/properties", icon: Building, suiteId: 'suite_property', addonId: 'feat_realestate_catalog' },
  { label: "Real Estate Customers", href: "/properties/leads", icon: Target, suiteId: 'suite_property' },
  { label: "Agent Performance", href: "/properties/rewards", icon: Trophy, suiteId: 'suite_property' },
];

const growthItems = [
  { label: "Chat Hub", href: "/whatsapp-automation/chat", icon: MessageSquare, suiteId: 'suite_growth' },
  { label: "Contact Hub", href: "/whatsapp-automation/contacts", icon: UsersIcon, suiteId: 'suite_growth' },
  { label: "API Configuration", href: "/whatsapp-automation/config", icon: SettingsIcon, suiteId: 'suite_growth' },
  { label: "Campaigns", href: "/whatsapp-automation/campaigns", icon: Zap, suiteId: 'suite_growth' },
  { label: "WhatsApp Flows", href: "/whatsapp-automation", icon: SmartphoneNfc, suiteId: 'suite_growth', addonId: 'feat_whatsapp' },
  { label: "Template Hub", href: "/settings/whatsapp-templates", icon: MessageSquare, suiteId: 'suite_growth' },
  { label: "Analytics & ROI", href: "/marketing", icon: LineChart, suiteId: 'suite_growth' },
];

const intelligenceItems = [
  { label: "AI Advisor", href: "/ai-insights", icon: Lightbulb, suiteId: 'suite_intelligence', addonId: 'feat_intelligence' },
];

const backOfficeItems = [
  { label: "Accounting Pro", href: "/accounting", icon: Wallet, suiteId: 'suite_backoffice', addonId: 'feat_accounting' },
  { label: "Fixed Expenses", href: "/fixed-expenses", icon: Coins },
  { label: "Payment Requests", href: "/payment-requests", icon: Handshake, addonId: 'feat_payments' },
  { label: "Projects", href: "/projects", icon: Briefcase, suiteId: 'suite_backoffice', addonId: 'feat_projects' },
  { label: "Staff & Payroll", href: "/staff", icon: Users2, suiteId: 'suite_backoffice', addonId: 'feat_staff' },
  { label: "Task Manager", href: "/notes", icon: ListTodo, suiteId: 'suite_backoffice' },
];

const storeItems = [
  { label: "Storefront Manager", href: "/website", icon: ShoppingBag, addonId: 'feat_store' },
  { label: "Store Orders", href: "/website/orders", icon: Receipt, addonId: 'feat_store' },
  { label: "Visitor Insights", href: "/website/visitors", icon: MousePointer2, addonId: 'feat_store' },
];

export function SidebarNav() {
  const { isMobile, setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const firestore = useFirestore();
  const { user } = useUser();
  const activeItemRef = useRef<HTMLAnchorElement>(null);

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);

  const businessId = userProfile?.businessId;
  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const globalBrandingRef = useMemoFirebase(() => doc(firestore, 'system', 'config', 'branding', 'main'), [firestore]);
  const { data: globalBranding } = useDoc<any>(globalBrandingRef);

  const isPlatformOwner = user?.email?.toLowerCase() === 'skillmatrix24@gmail.com'; 
  const activeAddonIds = useMemo(() => business?.activeAddonIds || [], [business]);
  
  const userRole = (userProfile?.role || '').toLowerCase();
  const isAgent = userRole === 'agent';

  // DYNAMIC LOYALTY ITEMS WITH BUSINESS ID
  const dynamicLoyaltyItems = useMemo(() => {
    return [
      { label: "Loyalty Command", href: "/loyalty", icon: LayoutDashboard, suiteId: 'suite_loyalty' },
      { label: "Track Member", href: businessId ? `/loyalty/track-member/${businessId}` : "/loyalty/track-member", icon: SearchCode, suiteId: 'suite_loyalty' },
      { label: "Offer Hub", href: "/loyalty/coupons", icon: Ticket, suiteId: 'suite_loyalty' },
      { label: "Member Registry", href: "/loyalty/members", icon: Users, suiteId: 'suite_loyalty' },
      { label: "Manage Tiers", href: "/loyalty/tiers", icon: IdCard, suiteId: 'suite_loyalty' },
      { label: "Automation Rules", href: "/loyalty/automation", icon: Zap, suiteId: 'suite_loyalty' },
      { label: "Campaign Center", href: "/loyalty/campaigns", icon: MessageSquare, suiteId: 'suite_loyalty' },
    ];
  }, [businessId]);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [pathname]);

  const isTrialExpired = useMemo(() => {
    if (!business) return false;
    const status = (business.status || '').toLowerCase();
    if (status === 'active' || status === 'pro') return false;
    if (status !== 'trial') return false;
    if (!business.trialEndDate) return false;
    
    const endDate = business.trialEndDate?.toDate 
      ? business.trialEndDate.toDate() 
      : (typeof business.trialEndDate === 'string' ? parseISO(business.trialEndDate) : new Date());
      
    return differenceInDays(endDate, new Date()) < 0;
  }, [business]);

  const activeLogo = useMemo(() => {
    const isBrandingPro = business?.activeAddonIds?.includes('feat_branding') || business?.status === 'pro';
    return (isBrandingPro && business?.faviconUrl) ? business.faviconUrl : globalBranding?.faviconUrl;
  }, [business, globalBranding]);

  const activeLogoPublic = useMemo(() => {
    const isBrandingPro = business?.activeAddonIds?.includes('feat_branding') || business?.status === 'pro';
    return (isBrandingPro && business?.logoUrl) ? business.logoUrl : globalBranding?.logoUrl;
  }, [business, globalBranding]);

  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const getModuleState = (suiteId?: string, addonId?: string) => {
    if (!suiteId && !addonId) return isTrialExpired ? 'expired' : 'active';
    const isSuiteActive = suiteId && activeAddonIds.includes(suiteId);
    const isAddonActive = addonId && activeAddonIds.includes(addonId);
    if (isSuiteActive || isAddonActive) {
      return isTrialExpired ? 'expired' : 'active';
    }
    return 'locked';
  };

  const NavGroup = ({ label, items, hideForAgent = false }: { label: string, items: any[], hideForAgent?: boolean }) => {
    if (isAgent && hideForAgent) return null;
    
    const activatedItems = items.filter(item => {
      const state = getModuleState(item.suiteId, item.addonId);
      return state !== 'locked';
    });

    const roleFilteredItems = isAgent 
      ? activatedItems.filter(item => ['Dashboard', 'Property Catalog', 'Real Estate Customers', 'Agent Performance'].includes(item.label))
      : activatedItems;

    if (roleFilteredItems.length === 0) return null;

    return (
      <SidebarGroup>
        <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1 px-4">
          {label}
        </SidebarGroupLabel>
        <SidebarMenu className="px-2">
          {roleFilteredItems.map((item) => {
            const state = getModuleState(item.suiteId, item.addonId);
            const isExpired = state === 'expired';
            
            const isExactMatch = pathname === item.href;
            const isSubMatch = pathname.startsWith(item.href + '/') && !activatedItems.some(other => other.href !== item.href && pathname.startsWith(other.href));
            const isActive = isExactMatch || isSubMatch;

            let href = item.href;
            if (isExpired) href = `/settings/subscription`;
            
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                  onClick={closeOnMobile}
                  className={cn(
                    "transition-all h-10 rounded-xl px-4 font-medium",
                    isActive 
                      ? "bg-primary text-white font-bold shadow-md shadow-primary/20 scale-[1.02]" 
                      : "text-slate-600 hover:text-primary hover:bg-primary/5",
                    isExpired && "opacity-60 grayscale-[0.5]"
                  )}
                >
                  <Link href={href} ref={isActive ? activeItemRef : null}>
                    {isExpired ? (
                      <div className="flex items-center gap-3 w-full">
                        <Clock className="h-4 w-4 text-red-500" />
                        <span className="text-xs font-medium">{item.label}</span>
                        <Badge className="ml-auto text-[7px] h-3.5 px-1 font-black bg-red-100 text-red-600 border-none">EXPIRED</Badge>
                      </div>
                    ) : (
                      <>
                        <item.icon className={cn("h-4.5 w-4.5 shrink-0", isActive ? "text-white" : "text-slate-500")} />
                        <span className="text-xs">{item.label}</span>
                        {isActive && !isMobile && <ChevronRight className="ml-auto h-3 w-3 opacity-50" />}
                      </>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="hidden md:flex border-r border-border/50 bg-white">
      <SidebarHeader className="border-b px-6 py-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-md border border-border/50 shrink-0 overflow-hidden group-data-[collapsible=icon]:mx-auto transition-transform hover:scale-105">
            {activeLogoPublic ? (
              <img src={activeLogoPublic} className="h-full w-full object-contain" alt="Logo" />
            ) : (
              <div className="h-full w-full bg-primary flex items-center justify-center text-white font-black text-xl">
                {business?.name?.charAt(0) || "B"}
              </div>
            )}
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden min-w-0">
            <span className="text-lg tracking-tight leading-none text-primary font-black uppercase truncate max-w-[140px]">
              {business?.name || "Biztrix AI"}
            </span>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5 truncate">Modern Business OS</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="scrollbar-hide py-6 space-y-1 overflow-y-auto text-left">
        {isPlatformOwner && !isAgent && (
          <SidebarGroup>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1 px-4">Platform Master</SidebarGroupLabel>
            <SidebarMenu className="px-2">
              {ownerItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive} 
                      tooltip={item.label} 
                      onClick={closeOnMobile} 
                      className={cn(
                        "transition-all h-10 rounded-xl px-4",
                        isActive ? "bg-primary text-white font-bold shadow-md shadow-primary/20" : ""
                      )}
                    >
                      <Link href={item.href} ref={isActive ? activeItemRef : null}>
                        <item.icon className={cn("h-4 w-4", isActive ? "text-white" : "")} />
                        <span className="text-xs font-bold">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}

        <NavGroup label="Command Center" items={mainItems} />
        <NavGroup label="Solar Management" items={solarItems} hideForAgent />
        <NavGroup label="Engagement" items={engagementItems} hideForAgent />
        <NavGroup label="Loyalty & Rewards" items={dynamicLoyaltyItems} hideForAgent />
        <NavGroup label="Real Estate" items={propertyItems} />
        <NavGroup label="Growth Engine" items={growthItems} hideForAgent />
        <NavGroup label="Intelligence" items={intelligenceItems} hideForAgent />
        <NavGroup label="Back Office" items={backOfficeItems} hideForAgent />
        <NavGroup label="Store Builder" items={storeItems} hideForAgent />
        
        {!isAgent && (
          <SidebarGroup className="mt-4">
            <SidebarMenu className="px-2">
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Marketplace" onClick={closeOnMobile}>
                  <Link href="/marketplace" className={cn(
                    "rounded-2xl h-11 border border-primary/10 px-4 group transition-all",
                    pathname === '/marketplace' ? "bg-primary text-white shadow-lg" : "bg-primary/5 text-primary hover:bg-primary/10"
                  )}>
                    <ShoppingBasket className={cn("h-4.5 w-4.5", pathname === '/marketplace' ? "text-white" : "group-hover:scale-110 transition-transform")} />
                    <span className="text-xs font-black uppercase tracking-tight">Marketplace</span>
                    {pathname !== '/marketplace' && <Badge className="ml-auto bg-primary text-white text-[8px] h-4 border-none shadow-sm px-1.5">NEW</Badge>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-6 bg-slate-50/50 space-y-4">
        <div className="group-data-[collapsible=icon]:hidden">
          <div className="p-3 rounded-2xl bg-white border border-border shadow-sm flex items-center gap-3">
             <div className="h-7 w-7 rounded-xl bg-primary flex items-center justify-center text-white shadow-inner">
                <span className="text-xs font-black">B</span>
             </div>
             <div className="text-left">
                <p className="text-[8px] font-black text-primary uppercase tracking-widest opacity-60">Status</p>
                <p className="text-[10px] font-black text-slate-900 uppercase">AI Protected</p>
             </div>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              tooltip="Settings" 
              onClick={closeOnMobile}
              className={cn(
                "h-10 rounded-xl px-4 transition-all font-medium",
                (pathname === '/settings' || pathname === '/profile') ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-600 hover:text-primary"
              )}
            >
              <Link href={isAgent ? "/profile" : "/settings"}>
                <SettingsIcon className={cn("h-4 w-4", (pathname === '/settings' || pathname === '/profile') ? "text-white" : "")} />
                <span className="text-xs">{isAgent ? "My Profile" : "OS Settings"}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
