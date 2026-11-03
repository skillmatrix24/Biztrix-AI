
"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Receipt, 
  Package, 
  Lightbulb,
  MoreHorizontal,
  Building,
  Users,
  UserCircle,
  Target,
  BookOpenText,
  MessageCircle,
  Headset,
  Ticket,
  Wallet,
  Briefcase,
  Users2,
  ListTodo,
  Settings as SettingsIcon,
  UserCheck,
  ChevronRight,
  ChevronUp,
  Smartphone,
  SmartphoneNfc,
  Zap,
  IdCard,
  MessageSquare,
  ShoppingBag,
  MousePointer2,
  ScanLine,
  Globe,
  Star,
  Heart,
  Layout,
  PlusCircle,
  Tag,
  Gem,
  Grid,
  FileSpreadsheet,
  SearchCode,
  LineChart,
  Sun
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

const ICON_MAP: Record<string, any> = {
  Globe, Zap, Star, Heart, SmartphoneNfc, Layout, PlusCircle, MessageSquare, Package, Building, Wallet, Grid, Sun
};

const MASTER_NAV_REGISTRY: Record<string, { label: string, icon: any, suiteId?: string, addonId?: string }> = {
  "/dashboard": { label: "Home", icon: LayoutDashboard },
  "/daily-entries": { label: "Entries", icon: BookOpenText },
  "/billing": { label: "Billing", icon: Receipt },
  "/quotations": { label: "Offers", icon: FileSpreadsheet },
  "/inventory": { label: "Inventory", icon: Package },
  "/inventory/scanner": { label: "Scanner", icon: ScanLine, suiteId: 'suite_intelligence' },
  "/leads": { label: "Leads", icon: UserCheck },
  "/customers": { label: "Clients", icon: Users },
  "/vendors": { label: "Vendors", icon: Target },
  "/feedback": { label: "Feedback", icon: MessageCircle, addonId: 'feat_feedback' },
  "/complaints": { label: "Support", icon: Headset, suiteId: 'suite_support' },
  "/properties": { label: "Catalog", icon: Building, suiteId: 'suite_property' },
  "/properties/leads": { label: "Target", icon: Target, suiteId: 'suite_property' },
  "/loyalty": { label: "Rewards", icon: Ticket, suiteId: 'suite_loyalty' },
  "/loyalty/members": { label: "Members", icon: Users, suiteId: 'suite_loyalty' },
  "/loyalty/track-member": { label: "Track", icon: SearchCode, suiteId: 'suite_loyalty' },
  "/whatsapp-automation": { label: "Flows", icon: SmartphoneNfc, suiteId: 'suite_growth' },
  "/whatsapp-automation/campaigns": { label: "Campaign", icon: Zap, suiteId: 'suite_growth' },
  "/ai-insights": { label: "Advisor", icon: Lightbulb, suiteId: 'suite_intelligence' },
  "/accounting": { label: "P&L", icon: Wallet, suiteId: 'suite_backoffice' },
  "/projects": { label: "Projects", icon: Briefcase, suiteId: 'suite_backoffice' },
  "/staff": { label: "Team", icon: Users2, suiteId: 'suite_backoffice' },
  "/notes": { label: "Tasks", icon: ListTodo, suiteId: 'suite_backoffice' },
  "/solar": { label: "Solar", icon: Sun, suiteId: 'suite_solar' },
  "/settings": { label: "Settings", icon: SettingsIcon },
  "/profile": { label: "Profile", icon: UserCircle },
  "/my-staff-portal": { label: "Hub", icon: UserCircle }
};

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  
  const businessId = userProfile?.businessId;
  const userRole = (userProfile?.role || 'staff').toLowerCase();

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const activeAddonIds = useMemo(() => business?.activeAddonIds || [], [business]);
  const customNavLinks = useMemo(() => business?.customNavLinks || [], [business]);

  const fullRegistry = useMemo(() => {
    const combined: Record<string, any> = {};
    
    Object.entries(MASTER_NAV_REGISTRY).forEach(([path, config]) => {
      let finalPath = path;
      if (path === '/loyalty/track-member' && businessId) {
        finalPath = `/loyalty/track-member/${businessId}`;
      }
      combined[finalPath] = { ...config, href: finalPath };
    });

    customNavLinks.forEach((cl: any) => {
      combined[cl.id] = { 
        label: cl.label, 
        icon: ICON_MAP[cl.icon] || Globe,
        href: cl.url,
        isCustom: true 
      };
    });
    return combined;
  }, [customNavLinks, businessId]);

  const checkIsLocked = useCallback((item: any) => {
    if (!item) return true;
    if (item.isCustom) return false;
    if (!item.suiteId && !item.addonId) return false;
    const isSuiteActive = item.suiteId && activeAddonIds.includes(item.suiteId);
    const isAddonActive = item.addonId && activeAddonIds.includes(item.addonId);
    return !isSuiteActive && !isAddonActive;
  }, [activeAddonIds]);

  const roleConfig = useMemo(() => business?.mobileLayout?.[userRole] || {}, [business, userRole]);
  const footerStyle = roleConfig.footerStyle || 'solid';
  const centerFloat = roleConfig.centerFloat || false;

  const { footerItems, moreItems } = useMemo(() => {
    const layout = roleConfig;
    const footer = layout?.footer || [];
    const more = layout?.more || [];
    
    // Transform footer paths to dynamic paths if needed (like track-member)
    const normalizedFooter = footer.map((f: string) => (f === '/loyalty/track-member' && businessId) ? `/loyalty/track-member/${businessId}` : f);
    const normalizedMore = more.map((m: string) => (m === '/loyalty/track-member' && businessId) ? `/loyalty/track-member/${businessId}` : m);

    const activeFooterPaths = normalizedFooter.filter((id: string) => !checkIsLocked(fullRegistry[id]));
    const activeMorePaths = normalizedMore.filter((id: string) => !checkIsLocked(fullRegistry[id]));

    if (activeFooterPaths.length === 0) {
      const defaults = userRole === 'agent' 
        ? ["/dashboard", "/properties", "/properties/leads", "/profile"]
        : ["/dashboard", "/billing", "/inventory", "/ai-insights", "/settings"];
      
      const filteredDefaults = defaults.filter(id => !checkIsLocked(fullRegistry[id]));

      return {
        footerItems: filteredDefaults.map(id => ({ ...fullRegistry[id], href: fullRegistry[id].href || id })),
        moreItems: []
      };
    }

    return {
      footerItems: activeFooterPaths.map((id: string) => ({ ...fullRegistry[id], href: fullRegistry[id].href || id })),
      moreItems: activeMorePaths.map((id: string) => ({ ...fullRegistry[id], href: fullRegistry[id].href || id }))
    };
  }, [roleConfig, userRole, activeAddonIds, fullRegistry, businessId]);

  const showMoreButton = moreItems.length > 0 || footerItems.length > 5;
  const displayNav = useMemo(() => {
    if (showMoreButton) return footerItems.slice(0, 4);
    return footerItems.slice(0, 5);
  }, [footerItems, showMoreButton]);

  const styleClasses = {
    solid: "bg-white border-t border-border/50 text-slate-900",
    glass: "bg-white/80 backdrop-blur-lg border-t border-white/20 text-slate-900",
    dark: "bg-slate-900 border-t border-white/5 text-white",
    custom: "" 
  }[footerStyle as 'solid' | 'glass' | 'dark' | 'custom'];

  const customStyle: React.CSSProperties = footerStyle === 'custom' ? {
    background: roleConfig.footerBgType === 'gradient'
      ? `linear-gradient(to bottom, ${roleConfig.footerGradientStart || '#0C83B3'}, ${roleConfig.footerGradientEnd || '#2DD4BF'})`
      : roleConfig.footerSolidColor || '#ffffff',
    color: (roleConfig.footerBgType === 'gradient' || (roleConfig.footerSolidColor && !['#ffffff', '#fff', 'white'].includes(roleConfig.footerSolidColor.toLowerCase()))) ? '#ffffff' : '#0f172a'
  } : {};

  return (
    <nav 
      style={customStyle}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 h-16 flex items-center justify-around px-2 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] md:hidden transition-all duration-500",
        styleClasses
      )}
    >
      {displayNav.map((item, idx) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        const Icon = item.icon || LayoutDashboard;
        const isFloating = centerFloat && idx === 2;

        const fabStyles: React.CSSProperties = isFloating ? {
            background: roleConfig.fabColorType === 'gradient' 
              ? `linear-gradient(to bottom right, ${roleConfig.fabGradientStart || '#0C83B3'}, ${roleConfig.fabGradientEnd || '#2DD4BF'})`
              : roleConfig.fabSolidColor || '#0C83B3',
            borderColor: roleConfig.fabRingColor || (footerStyle === 'dark' ? '#1e293b' : '#ffffff')
        } : {};

        return (
          <Link 
            key={idx} 
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all active:scale-90 relative min-w-0",
              isActive ? (footerStyle === 'solid' || footerStyle === 'glass' ? "text-primary" : "text-white") : (footerStyle === 'solid' || footerStyle === 'glass' ? "text-muted-foreground" : "opacity-40"),
              isFloating && "z-10 overflow-visible"
            )}
          >
            {isFloating ? (
              <div className="flex flex-col items-center justify-end w-full h-full pb-1.5 overflow-visible">
                <div 
                  style={fabStyles}
                  className={cn(
                    "h-14 w-14 rounded-full flex items-center justify-center shadow-2xl absolute -top-8 border-4 transition-all duration-300",
                    isActive ? "text-white scale-110" : "text-white scale-100 opacity-95",
                  )}
                >
                  <Icon className="h-6 w-6 stroke-[2.5px]" />
                </div>
                <span className={cn("text-[9px] font-black uppercase tracking-tighter truncate w-full text-center", isActive ? "opacity-100" : "opacity-60")}>
                  {item.label}
                </span>
              </div>
            ) : (
              <>
                <Icon className={cn("h-5 w-5", isActive ? "stroke-[2.5px]" : "stroke-[1.5px]")} />
                <span className={cn("text-[9px] font-bold uppercase tracking-tighter truncate w-full text-center px-1", isActive ? "opacity-100" : "opacity-60")}>
                  {item.label}
                </span>
                {isActive && (
                  <div className={cn("absolute top-0 h-0.5 w-8 rounded-full", (footerStyle === 'solid' || footerStyle === 'glass') ? "bg-primary" : "bg-white")} />
                )}
              </>
            )}
          </Link>
        );
      })}

      {showMoreButton && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all active:scale-90 relative min-w-0",
              (footerStyle === 'solid' || footerStyle === 'glass') ? "text-muted-foreground" : "text-white opacity-40"
            )}>
              <MoreHorizontal className="h-5 w-5 stroke-[1.5px]" />
              <span className="text-[9px] font-bold uppercase tracking-tighter">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            side="top" 
            align="center" 
            style={customStyle}
            className={cn(
              "w-56 mb-4 rounded-[2rem] border-none shadow-2xl p-2 animate-in slide-in-from-bottom-2 duration-300",
              styleClasses
            )}
          >
            <div className="p-3 border-b border-border/10 mb-2 text-left">
               <p className="text-[8px] font-black uppercase tracking-widest opacity-40">System Node Explorer</p>
            </div>
            <ScrollArea className="h-full max-h-[300px]">
              <div className="grid grid-cols-1 gap-1">
                {[...footerItems.slice(4), ...moreItems].map((item, idx) => (
                  <DropdownMenuItem key={idx} asChild className="p-0 focus:bg-transparent">
                    <Link 
                      href={item.href} 
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-xl transition-all active:scale-95",
                        (footerStyle === 'solid' || footerStyle === 'glass') ? "hover:bg-primary/5" : "hover:bg-white/10"
                      )}
                    >
                       <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shadow-sm border", (footerStyle === 'solid' || footerStyle === 'glass') ? "bg-white text-primary border-border" : "bg-white/10 text-white border-white/10")}>
                          <item.icon className="h-4 w-4" />
                       </div>
                       <span className="text-[10px] font-black uppercase tracking-tight">{item.label}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </nav>
  );
}
