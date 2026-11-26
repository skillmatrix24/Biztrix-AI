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
  UserPlus, 
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
  LifeBuoy,
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
  FileText,
  Percent,
  Trash2
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
import { useMarketplaceCatalog } from "@/hooks/use-marketplace-catalog";
import { resolveCoreMenuState } from "@/lib/marketplace-catalog";
import { resolveEffectivePermission, isStaffAdminRole } from "@/lib/staff-payroll";
import { doc } from "firebase/firestore";
import { differenceInDays, parseISO } from "date-fns";

// Fallback logic for when icon components are not found
const UserCheckIcon = Users;

// CORE / FREE ITEMS
const mainItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Daily Entries", href: "/daily-entries", icon: BookOpenText },
  { label: "Billing (POS)", href: "/billing", icon: Receipt },
  { label: "Invoices & E-Way", href: "/invoices", icon: FileText },
  { label: "GST & GSTR-1", href: "/accounting/gst", icon: Percent },
  { label: "Quotations", href: "/quotations", icon: FileSpreadsheet },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "CRM & Leads", href: "/leads", icon: UserCheckIcon },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Vendors", href: "/vendors", icon: Truck },
  { label: "Team Directory", href: "/team", icon: UserPlus },
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
  { label: "Customer Care Hub", href: "/support", icon: LifeBuoy, suiteId: 'suite_support' },
  { label: "Customer Feedback", href: "/feedback", icon: MessageCircle, addonId: 'feat_feedback' },
  { label: "Support Desk", href: "/complaints", icon: Headset, suiteId: 'suite_support' },
];

const ownerItems = [
  { label: "Overview", href: "/owner", icon: ShieldCheck },
  { label: "Platform Blueprint", href: "/owner/blueprint", icon: Layers },
  { label: "Plans & Limits", href: "/owner/limits", icon: Activity },
  { label: "Gateways", href: "/owner/gateways", icon: KeyRound },
  { label: "Global Users", href: "/owner/users", icon: UserCog },
  { label: "Database Cleanup", href: "/owner/cleanup", icon: Trash2 },
];

const propertyItems = [
  { label: "Property Catalog", href: "/properties", icon: Building, suiteId: 'suite_property', addonId: 'feat_re_catalog', altAddonId: 'feat_realestate_catalog' },
  { label: "Real Estate Customers", href: "/properties/leads", icon: Target, suiteId: 'suite_property' },
  { label: "Agent Performance", href: "/properties/rewards", icon: Trophy, suiteId: 'suite_property' },
];

const growthItems = [
  { label: "Chat Hub", href: "/whatsapp-automation/chat", icon: MessageSquare, suiteId: 'suite_growth' },
  { label: "Contact Hub", href: "/whatsapp-automation/contacts", icon: UsersIcon, suiteId: 'suite_growth' },
  { label: "API Configuration", href: "/whatsapp-automation/config", icon: SettingsIcon, suiteId: 'suite_growth' },
  { label: "Campaigns", href: "/whatsapp-automation/campaigns", icon: Zap, suiteId: 'suite_growth', addonId: 'feat_meta' },
  { label: "WhatsApp Flows", href: "/whatsapp-automation", icon: SmartphoneNfc, suiteId: 'suite_growth', addonId: 'feat_whatsapp' },
  { label: "Template Hub", href: "/settings/whatsapp-templates", icon: MessageSquare, suiteId: 'suite_growth' },
  { label: "Analytics & ROI", href: "/marketing", icon: LineChart, suiteId: 'suite_growth', addonId: 'feat_marketing_roi' },
];

const intelligenceItems = [
  { label: "AI Advisor", href: "/ai-insights", icon: Lightbulb, suiteId: 'suite_intelligence', addonId: 'feat_intelligence' },
];

const backOfficeItems = [
  { label: "Accounting Pro", href: "/accounting", icon: Wallet, suiteId: 'suite_backoffice', addonId: 'feat_accounting' },
  { label: "Fixed Expenses", href: "/fixed-expenses", icon: Coins },
  { label: "Payment Requests", href: "/payment-requests", icon: Handshake, suiteId: 'suite_backoffice', addonId: 'feat_payments' },
  { label: "Projects", href: "/projects", icon: Briefcase, suiteId: 'suite_backoffice', addonId: 'feat_projects' },
  { label: "Staff & Payroll", href: "/staff", icon: Users2, suiteId: 'suite_backoffice', addonId: 'feat_staff' },
  { label: "Task Manager", href: "/notes", icon: ListTodo, suiteId: 'suite_backoffice', addonId: 'feat_tasks' },
];

const storeItems = [
  { label: "Storefront Manager", href: "/website", icon: ShoppingBag, addonId: 'feat_store' },
  { label: "Landing Page Builder", href: "/website/funnels", icon: Sparkles, addonId: 'feat_store' },
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

  const globalBrandingRef = useMemoFirebase(() => 
    user?.uid && !user.isAnonymous ? doc(firestore, 'system', 'config', 'branding', 'main') : null
  , [firestore, user?.uid, user?.isAnonymous]);
  const { data: globalBranding } = useDoc<any>(globalBrandingRef);

  const { limits } = useMarketplaceCatalog();
  const isPlatformOwner = user?.email?.toLowerCase() === 'skillmatrix24@gmail.com'; 
  const activeAddonIds = useMemo(() => business?.activeAddonIds || [], [business]);
  
  const userRole = (userProfile?.role || '').toLowerCase();
  const isAdmin = useMemo(() => {
    return Boolean(
      (user?.uid && business?.ownerId === user.uid) ||
      isStaffAdminRole(userProfile?.role, user?.email)
    );
  }, [userProfile?.role, user?.uid, user?.email, business?.ownerId]);
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

  const getModuleState = (
    suiteId?: string,
    addonId?: string,
    altAddonId?: string,
    itemHref?: string
  ) => {
    if (!suiteId && !addonId && !altAddonId) {
      if (itemHref) {
        return resolveCoreMenuState(itemHref, { limits, business });
      }
      return isTrialExpired ? 'expired' : 'active';
    }
    const isMasterEnterpriseActive = activeAddonIds.includes('suite_enterprise');
    const isComboActive =
      (activeAddonIds.includes('suite_ecommerce') && (suiteId === 'suite_growth' || addonId === 'feat_store' || addonId === 'feat_whatsapp' || addonId === 'feat_marketing_roi' || addonId === 'feat_scan')) ||
      (activeAddonIds.includes('suite_operations') && (addonId === 'feat_staff' || addonId === 'feat_tasks' || addonId === 'feat_payments')) ||
      (activeAddonIds.includes('suite_finance') && (addonId === 'feat_accounting' || addonId === 'feat_eway_gst' || addonId === 'feat_billing_pro' || addonId === 'feat_scan'));

    const isSuiteActive = suiteId && activeAddonIds.includes(suiteId);
    const isAddonActive = (addonId && activeAddonIds.includes(addonId)) || (altAddonId && activeAddonIds.includes(altAddonId));
    if (isMasterEnterpriseActive || isSuiteActive || isAddonActive || isComboActive || (business?.status || '').toLowerCase() === 'pro') {
      return isTrialExpired ? 'expired' : 'active';
    }
    return 'locked';
  };

  const NavGroup = ({ label, items, hideForAgent = false }: { label: string, items: any[], hideForAgent?: boolean }) => {
    if (isAgent && hideForAgent) return null;
    
    const activatedItems = items.filter(item => {
      const state = getModuleState(item.suiteId, item.addonId, item.altAddonId, item.href);
      return state !== 'locked' && state !== 'hidden';
    });

    const roleFilteredItems = activatedItems.filter((item) => {
      if (isAdmin) return true;
      if (isAgent) {
        return ['Dashboard', 'Property Catalog', 'Real Estate Customers', 'Agent Performance'].includes(item.label);
      }
      
      const role = userRole || 'staff';
      const rbac = business?.rbacMatrix;

      if (item.href === '/dashboard') return true;
      if (item.href.startsWith('/billing')) return resolveEffectivePermission(rbac, "Billing (POS) & Invoice Checkout", role);
      if (item.href.startsWith('/invoices')) return resolveEffectivePermission(rbac, "Invoices, Receipts & E-Way Bills", role);
      if (item.href.startsWith('/accounting/gst')) return resolveEffectivePermission(rbac, "Invoices, Receipts & E-Way Bills", role);
      if (item.href.startsWith('/quotations')) return resolveEffectivePermission(rbac, "Quotations & Estimates", role);
      if (item.href.startsWith('/inventory')) return resolveEffectivePermission(rbac, "Inventory & Stock Adjustments", role);
      if (item.href.startsWith('/leads')) return resolveEffectivePermission(rbac, "Sales CRM & Lead Pipeline", role);
      if (item.href.startsWith('/customers') || item.href.startsWith('/vendors')) {
        return resolveEffectivePermission(rbac, "Customer & Vendor Directories", role);
      }
      if (item.href.startsWith('/daily-entries')) return resolveEffectivePermission(rbac, "Staff Attendance & Daily Entries", role);
      if (item.href.startsWith('/team')) return resolveEffectivePermission(rbac, "Staff Payroll & Wage Payouts", role);
      if (item.href.startsWith('/accounting')) return resolveEffectivePermission(rbac, "Accounting, Ledgers & Cashbook", role);
      if (item.href.startsWith('/settings')) return resolveEffectivePermission(rbac, "OS Settings & Role Configuration", role);

      return true;
    });

    if (roleFilteredItems.length === 0) return null;

    return (
      <SidebarGroup>
        <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-[11px] font-semibold text-slate-500 mb-1 px-3">
          {label}
        </SidebarGroupLabel>
        <SidebarMenu className="px-2 space-y-0.5">
          {roleFilteredItems.map((item) => {
            const state = getModuleState(item.suiteId, item.addonId, item.altAddonId, item.href);
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
                    "transition-colors h-9 rounded-xl px-3 font-medium",
                    isActive 
                      ? "bg-slate-900 text-white font-semibold hover:bg-slate-900 hover:text-white" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                    isExpired && "opacity-60 grayscale-[0.5]"
                  )}
                >
                  <Link href={href} ref={isActive ? activeItemRef : null}>
                    {isExpired ? (
                      <div className="flex items-center gap-2.5 w-full">
                        <Clock className="h-4 w-4 text-rose-500" />
                        <span className="text-xs font-medium">{item.label}</span>
                        <span className="ml-auto text-xs font-semibold text-rose-600">Expired</span>
                      </div>
                    ) : (
                      <>
                        <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-slate-500")} />
                        <span className="text-xs">{item.label}</span>
                        {isActive && !isMobile && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-60" />}
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
    <Sidebar variant="sidebar" collapsible="icon" className="hidden lg:flex border-r border-slate-200 bg-white">
      <SidebarHeader className="border-b border-slate-200 px-5 py-4 sm:py-5 pr-12 lg:pr-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 shrink-0 overflow-hidden group-data-[collapsible=icon]:mx-auto">
            {activeLogoPublic ? (
              <img src={activeLogoPublic} referrerPolicy="no-referrer" className="h-full w-full object-contain" alt="Business Logo" />
            ) : (
              <div className="h-full w-full bg-slate-900 flex items-center justify-center text-white font-bold text-base">
                {business?.name?.charAt(0) || "B"}
              </div>
            )}
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden min-w-0">
            <span className="text-sm font-bold tracking-tight leading-tight text-slate-900 truncate max-w-[150px]">
              {business?.name || "Biztrix AI"}
            </span>
            <span className="text-xs text-slate-500 mt-0.5 truncate">Business OS</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="scrollbar-hide py-4 space-y-1 overflow-y-auto text-left">
        {isPlatformOwner && !isAgent && (
          <SidebarGroup>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-[11px] font-semibold text-slate-500 mb-1 px-3">Platform Master</SidebarGroupLabel>
            <SidebarMenu className="px-2 space-y-0.5">
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
                        "transition-colors h-9 rounded-xl px-3 font-medium",
                        isActive ? "bg-slate-900 text-white font-semibold hover:bg-slate-900 hover:text-white" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      )}
                    >
                      <Link href={item.href} ref={isActive ? activeItemRef : null}>
                        <item.icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-500")} />
                        <span className="text-xs">{item.label}</span>
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
          <SidebarGroup className="mt-2">
            <SidebarMenu className="px-2">
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Marketplace" onClick={closeOnMobile}>
                  <Link href="/marketplace" className={cn(
                    "rounded-xl h-10 border px-3 group transition-colors",
                    pathname === '/marketplace' ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
                  )}>
                    <ShoppingBasket className={cn("h-4 w-4", pathname === '/marketplace' ? "text-white" : "text-primary")} />
                    <span className="text-xs font-semibold">Marketplace</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200 p-4 bg-white space-y-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              tooltip="Settings" 
              onClick={closeOnMobile}
              className={cn(
                "h-9 rounded-xl px-3 transition-colors font-medium",
                (pathname === '/settings' || pathname === '/profile') ? "bg-slate-900 text-white font-semibold hover:bg-slate-900 hover:text-white" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <Link href={isAgent ? "/profile" : "/settings"}>
                <SettingsIcon className={cn("h-4 w-4", (pathname === '/settings' || pathname === '/profile') ? "text-white" : "text-slate-500")} />
                <span className="text-xs">{isAgent ? "My Profile" : "OS Settings"}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
