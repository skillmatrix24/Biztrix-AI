
"use client";

import React, { useMemo, useState, useEffect } from "react";
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
  ChevronUp,
  ArrowUp,
  ArrowDown,
  GripVertical,
  X,
  Smartphone as LucideSmartphone,
  Plus,
  Palette,
  CheckCircle2,
  ScanLine,
  Circle as LucideCircle,
  Check,
  UserCircle,
  MoreHorizontal,
  UserPlus,
  LayoutList,
  Info,
  ShieldAlert,
  Lock,
  Link as LinkIcon,
  Star,
  Heart,
  PlusCircle,
  Layout,
  Settings as SettingsIcon,
  Trash2,
  FolderPlus,
  Grid
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { updateDocumentNonBlocking } from "@/firebase";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ICON_PICKER_LIST = [
  { name: "Globe", icon: Globe },
  { name: "Zap", icon: Zap },
  { name: "Star", icon: Star },
  { name: "Heart", icon: Heart },
  { name: "Smartphone", icon: SmartphoneNfc },
  { name: "Layout", icon: Layout },
  { name: "PlusCircle", icon: PlusCircle },
  { name: "MessageSquare", icon: MessageSquare },
  { name: "Package", icon: Package },
  { name: "Building", icon: Building },
  { name: "Wallet", icon: Wallet },
  { name: "Grid", icon: Grid }
];

const NAV_REGISTRY = [
  { id: "/dashboard", label: "Home", icon: LayoutDashboard },
  { id: "/daily-entries", label: "Entries", icon: BookOpenText },
  { id: "/billing", label: "Billing", icon: Receipt },
  { id: "/inventory", label: "Inventory", icon: Package },
  { id: "/inventory/scanner", label: "Scanner", icon: ScanLine, suiteId: 'suite_intelligence' },
  { id: "/leads", label: "Leads", icon: UserCheck },
  { id: "/customers", label: "Clients", icon: Users },
  { id: "/vendors", label: "Vendors", icon: Target },
  { id: "/feedback", label: "Feedback", icon: MessageCircle, addonId: 'feat_feedback' },
  { id: "/complaints", label: "Support", icon: Headset, suiteId: 'suite_support' },
  { id: "/properties", label: "Properties", icon: Building, suiteId: 'suite_property' },
  { id: "/properties/leads", label: "RE Leads", icon: Target, suiteId: 'suite_property' },
  { id: "/properties/rewards", label: "Agent Hub", icon: Trophy, suiteId: 'suite_property' },
  { id: "/loyalty", label: "Rewards", icon: Ticket, suiteId: 'suite_loyalty' },
  { id: "/loyalty/members", label: "Members", icon: Users, suiteId: 'suite_loyalty' },
  { id: "/loyalty/automation", label: "Rule Bot", icon: Zap, suiteId: 'suite_loyalty' },
  { id: "/loyalty/campaigns", label: "Broadcast", icon: MessageSquare, suiteId: 'suite_loyalty' },
  { id: "/loyalty/tiers", label: "Tiers", icon: IdCard, suiteId: 'suite_loyalty' },
  { id: "/loyalty/coupons", label: "Coupons", icon: Ticket, suiteId: 'suite_loyalty' },
  { id: "/whatsapp-automation", label: "WhatsApp", icon: SmartphoneNfc, suiteId: 'suite_growth' },
  { id: "/marketing", label: "Campaigns", icon: Zap, suiteId: 'suite_growth' },
  { id: "/ai-insights", label: "Advisor", icon: Lightbulb, suiteId: 'suite_intelligence' },
  { id: "/accounting", label: "P&L", icon: Wallet, suiteId: 'suite_backoffice' },
  { id: "/projects", label: "Projects", icon: Briefcase, suiteId: 'suite_backoffice' },
  { id: "/staff", label: "Team", icon: Users2, suiteId: 'suite_backoffice' },
  { id: "/notes", label: "Tasks", icon: ListTodo, suiteId: 'suite_backoffice' },
  { id: "/website", label: "Store", icon: ShoppingBag, addonId: 'feat_store' },
  { id: "/website/visitors", label: "Visitors", icon: MousePointer2, addonId: 'feat_store' },
  { id: "/settings", label: "Settings", icon: Settings2 },
  { id: "/profile", label: "Profile", icon: UserCircle },
  { id: "/my-staff-portal", label: "Staff Hub", icon: UserCircle }
];

const UI_STYLES = [
  { id: 'solid', label: 'Solid White', icon: LucideCircle },
  { id: 'glass', label: 'Glass Blur', icon: LucideSmartphone },
  { id: 'dark', label: 'Dark Node', icon: Lock },
  { id: 'custom', label: 'Custom Style', icon: Palette }
];

const MASTER_FAB_REGISTRY: Record<string, { label: string, icon: any, color: string, suiteId?: string, addonId?: string }> = {
  "/billing": { label: "New Sale", icon: Receipt, color: "bg-primary" },
  "/leads": { label: "New Lead", icon: UserPlus, color: "bg-blue-600" },
  "/complaints/form": { label: "New Ticket", icon: Headset, color: "bg-orange-600", suiteId: 'suite_support' },
  "/inventory/scanner": { label: "Scan Bill", icon: ScanLine, color: "bg-indigo-600", suiteId: 'suite_intelligence' },
  "/properties/new": { label: "New Asset", icon: Building, color: "bg-primary", suiteId: 'suite_property' },
  "/properties/leads/new": { label: "New RE Lead", icon: Target, color: "bg-blue-500", suiteId: 'suite_property' },
  "/payment-requests": { label: "Request Fund", icon: Handshake, color: "bg-green-600", addonId: 'feat_payments' }
};

export function MobileUiTab({ business, businessRef, isAdmin }: any) {
  const [activeRole, setActiveRole] = useState<"admin" | "staff" | "agent">("admin");
  
  const activeAddonIds = useMemo(() => business?.activeAddonIds || [], [business]);
  
  const layoutConfig = useMemo(() => {
    const base = business?.mobileLayout || {};
    const defaults = {
      admin: { footer: ["/dashboard", "/billing", "/inventory", "/ai-insights", "/settings"], more: [], fab: ["/billing", "/leads", "/inventory/scanner"], fabPosition: 'right', footerStyle: 'solid', centerFloat: false, fabColorType: 'solid', fabSolidColor: '#0C83B3', fabRingColor: '#ffffff', footerBgType: 'solid', footerSolidColor: '#ffffff' },
      staff: { footer: ["/dashboard", "/billing", "/inventory", "/my-staff-portal"], more: [], fab: ["/billing"], fabPosition: 'right', footerStyle: 'solid', centerFloat: false, fabColorType: 'solid', fabSolidColor: '#0C83B3', fabRingColor: '#ffffff', footerBgType: 'solid', footerSolidColor: '#ffffff' },
      agent: { footer: ["/dashboard", "/properties", "/properties/leads", "/profile"], more: [], fab: ["/properties/leads/new", "/properties/new"], fabPosition: 'right', footerStyle: 'solid', centerFloat: false, fabColorType: 'solid', fabSolidColor: '#0C83B3', fabRingColor: '#ffffff', footerBgType: 'solid', footerSolidColor: '#ffffff' }
    };

    return {
      admin: { ...defaults.admin, ...base.admin },
      staff: { ...defaults.staff, ...base.staff },
      agent: { ...defaults.agent, ...base.agent }
    };
  }, [business?.mobileLayout]);

  const activeRoleLayout = layoutConfig[activeRole];

  // Local buffering for color inputs to prevent Firestore bandwidth exhaustion
  const [localColors, setLocalColors] = useState<any>({});

  useEffect(() => {
    if (activeRoleLayout) {
      setLocalColors({
        footerSolidColor: activeRoleLayout.footerSolidColor || '#ffffff',
        footerGradientStart: activeRoleLayout.footerGradientStart || '#0C83B3',
        footerGradientEnd: activeRoleLayout.footerGradientEnd || '#2DD4BF',
        fabSolidColor: activeRoleLayout.fabSolidColor || '#0C83B3',
        fabGradientStart: activeRoleLayout.fabGradientStart || '#0C83B3',
        fabGradientEnd: activeRoleLayout.fabGradientEnd || '#2DD4BF',
        fabRingColor: activeRoleLayout.fabRingColor || '#ffffff'
      });
    }
  }, [activeRoleLayout]);

  const customNavLinks = useMemo(() => business?.customNavLinks || [], [business]);

  const fullNavRegistry = useMemo(() => {
    const customItems = customNavLinks.map((cl: any) => ({
      id: cl.id,
      href: cl.url,
      label: cl.label,
      icon: (ICON_PICKER_LIST.find(i => i.name === cl.icon)?.icon) || Globe,
      isCustom: true,
    }));
    return [...NAV_REGISTRY, ...customItems];
  }, [customNavLinks]);

  const checkIsLocked = (item: any) => {
    if (!item) return true;
    if (item.isCustom) return false;
    if (!item.suiteId && !item.addonId) return false;
    const isSuiteActive = item.suiteId && activeAddonIds.includes(item.suiteId);
    const isAddonActive = item.addonId && activeAddonIds.includes(item.addonId);
    return !isSuiteActive && !isAddonActive;
  };

  const updateLayout = (role: string, field: string, value: any) => {
    if (!isAdmin || !businessRef) return;
    updateDocumentNonBlocking(businessRef, {
      mobileLayout: { 
        ...layoutConfig, 
        [role]: { ...layoutConfig[role as keyof typeof layoutConfig], [field]: value } 
      }
    });
  };

  const toggleNavItem = (role: string, id: string) => {
    const current = layoutConfig[role as keyof typeof layoutConfig]?.footer || [];
    let updated;
    if (current.includes(id)) {
      updated = current.filter((h: string) => h !== id);
    } else {
      updated = [...current, id];
    }
    updateLayout(role, 'footer', updated);
  };

  const toggleMoreItem = (role: string, id: string) => {
    const current = layoutConfig[role as keyof typeof layoutConfig]?.more || [];
    let updated;
    if (current.includes(id)) {
      updated = current.filter((h: string) => h !== id);
    } else {
      updated = [...current, id];
    }
    updateLayout(role, 'more', updated);
  };

  const moveItem = (role: string, index: number, dir: 'up' | 'down') => {
    const current = [...(layoutConfig[role as keyof typeof layoutConfig]?.footer || [])];
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= current.length) return;
    [current[index], current[target]] = [current[target], current[index]];
    updateLayout(role, 'footer', current);
  };

  const handleAddCustomLink = () => {
    if (!isAdmin || !businessRef) return;
    const current = business?.customNavLinks || [];
    const newLink = { 
        id: `cl_${Date.now()}`, 
        label: "Manual Button", 
        icon: "Globe", 
        url: "/dashboard" 
    };
    updateDocumentNonBlocking(businessRef, { customNavLinks: [...current, newLink] });
    toast({ title: "Custom Node Created" });
  };

  const handleUpdateCustomLink = (id: string, field: string, value: string) => {
    if (!isAdmin || !businessRef) return;
    const current = business?.customNavLinks || [];
    const updated = current.map((cl: any) => cl.id === id ? { ...cl, [field]: value } : cl);
    updateDocumentNonBlocking(businessRef, { customNavLinks: updated });
  };

  const handleRemoveCustomLink = (id: string) => {
    if (!isAdmin || !businessRef) return;
    const current = business?.customNavLinks || [];
    updateDocumentNonBlocking(businessRef, { customNavLinks: current.filter((cl: any) => cl.id !== id) });
    toast({ title: "Node Erased", variant: "destructive" });
  };

  const updateLocalColor = (key: string, value: string) => {
    setLocalColors((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-1 text-left">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner">
            <LucideSmartphone className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 leading-none">Mobile Layout Engine</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-2">Role-Based Customization Hub</p>
          </div>
        </div>
        <Tabs value={activeRole} onValueChange={(v: any) => setActiveRole(v)} className="w-full md:w-auto">
          <TabsList className="bg-white border-2 rounded-2xl h-12 p-1 shadow-sm w-full">
            <TabsTrigger value="admin" className="flex-1 text-[10px] font-black uppercase px-6">Admin View</TabsTrigger>
            <TabsTrigger value="staff" className="flex-1 text-[10px] font-black uppercase px-6">Staff View</TabsTrigger>
            <TabsTrigger value="agent" className="flex-1 text-[10px) font-black uppercase px-6 text-primary">Agent View</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-12 text-left">
          <section className="space-y-6">
             <div className="flex items-center justify-between px-2">
                <div className="space-y-1 text-left">
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <PlusCircle className="h-4 w-4" /> Manual Button Registry
                  </h4>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">Create custom links for missing menus</p>
                </div>
                <Button onClick={handleAddCustomLink} variant="outline" size="sm" className="h-8 rounded-xl text-[9px] font-black uppercase border-primary/20 text-primary bg-white hover:bg-primary/5">
                   <Plus className="h-3 w-3 mr-1.5" /> Create Button
                </Button>
             </div>
             
             <div className="grid grid-cols-1 gap-4">
                {customNavLinks.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed rounded-[2rem] opacity-30">
                    <p className="text-[10px] font-black uppercase tracking-widest">No manual buttons yet</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden sm:grid grid-cols-12 gap-4 px-6 text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                      <div className="col-span-1 text-center">Menu Icon</div>
                      <div className="col-span-4">Button Label</div>
                      <div className="col-span-5">Target Link / URL</div>
                      <div className="col-span-2"></div>
                    </div>
                    {customNavLinks.map((cl: any) => (
                      <Card key={cl.id} className="border-none shadow-sm bg-white rounded-2xl overflow-hidden border">
                        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                          <div className="sm:col-span-1 flex justify-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-muted/20 text-primary">
                                    {(() => {
                                      const Icon = ICON_PICKER_LIST.find(i => i.name === cl.icon)?.icon || Globe;
                                      return <Icon className="h-5 w-5" />;
                                    })()}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56 grid grid-cols-4 p-2 rounded-xl border-none shadow-2xl">
                                  {ICON_PICKER_LIST.map(i => (
                                    <DropdownMenuItem key={i.name} onClick={() => handleUpdateCustomLink(cl.id, 'icon', i.name)} className="flex items-center justify-center p-2 rounded-lg cursor-pointer hover:bg-primary/10">
                                      <i.icon className="h-5 w-5 text-primary" />
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                          </div>
                          <div className="sm:col-span-4 space-y-1">
                              <Label className="sm:hidden text-[8px] font-black uppercase opacity-40 ml-1">Button Label</Label>
                              <Input 
                                defaultValue={cl.label} 
                                onBlur={(e) => handleUpdateCustomLink(cl.id, 'label', e.target.value)} 
                                className="h-10 rounded-xl font-bold text-xs shadow-inner bg-muted/5 border-none" 
                              />
                          </div>
                          <div className="sm:col-span-5 space-y-1">
                              <Label className="sm:hidden text-[8px] font-black uppercase opacity-40 ml-1">Target Link</Label>
                              <div className="relative">
                                <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground opacity-30" />
                                <Input 
                                  defaultValue={cl.url} 
                                  onBlur={(e) => handleUpdateCustomLink(cl.id, 'url', e.target.value)} 
                                  className="h-10 pl-8 rounded-xl text-[10px] font-mono shadow-inner bg-muted/5 border-none" 
                                />
                              </div>
                          </div>
                          <div className="sm:col-span-2 flex justify-end">
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive/40 hover:text-destructive hover:bg-red-50" onClick={() => handleRemoveCustomLink(cl.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
             </div>
          </section>

          <Separator className="opacity-50" />

          <section className="p-8 bg-muted/20 rounded-[2.5rem] space-y-8 border-2 border-dashed border-border/50 text-left">
             <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary">Surface & Architecture</h4>
                </div>
                <Badge variant="outline" className="text-[8px] font-black h-5 uppercase border-primary/20 text-primary bg-white">v3.5 Engine</Badge>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Menu Background Skin</Label>
                   <div className="grid grid-cols-2 gap-2">
                      {UI_STYLES.map(style => {
                        const StyleIcon = style.icon;
                        return (
                          <Button 
                            key={style.id}
                            variant={activeRoleLayout?.footerStyle === style.id ? 'default' : 'outline'}
                            onClick={() => updateLayout(activeRole, 'footerStyle', style.id)}
                            className="h-10 text-[9px] font-black uppercase rounded-xl gap-2"
                          >
                            <StyleIcon className="h-3 w-3" /> {style.label}
                          </Button>
                        );
                      })}
                   </div>
                </div>

                <div className="space-y-3">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Center Node Float</Label>
                   <div className="p-4 bg-white rounded-2xl border shadow-sm flex items-center justify-between">
                      <div className="space-y-0.5">
                         <p className="text-[10px] font-black uppercase text-slate-900">Elevated Center</p>
                         <p className="text-[8px] font-bold text-muted-foreground uppercase">3rd item becomes floating FAB</p>
                      </div>
                      <Switch 
                        checked={!!activeRoleLayout?.centerFloat} 
                        onCheckedChange={(v) => updateLayout(activeRole, 'centerFloat', v)}
                        className="scale-75 data-[state=checked]:bg-primary"
                      />
                   </div>
                </div>
             </div>

             {activeRoleLayout?.footerStyle === 'custom' && (
               <div className="space-y-6 pt-6 border-t border-border/50 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between px-1">
                    <div className="space-y-1 text-left">
                      <h5 className="text-[10px] font-black uppercase text-primary tracking-widest">Footer Custom Colors</h5>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase">Define the navigation bar signature</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-1 rounded-xl border">
                      <button 
                        onClick={() => updateLayout(activeRole, 'footerBgType', 'solid')}
                        className={cn("px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all", activeRoleLayout?.footerBgType !== 'gradient' ? "bg-primary text-white" : "text-slate-400")}
                      >
                        Solid
                      </button>
                      <button 
                        onClick={() => updateLayout(activeRole, 'footerBgType', 'gradient')}
                        className={cn("px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all", activeRoleLayout?.footerBgType === 'gradient' ? "bg-primary text-white" : "text-slate-400")}
                      >
                        Gradient
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {activeRoleLayout?.footerBgType !== 'gradient' ? (
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase opacity-60">Background Color</Label>
                        <div className="flex items-center gap-3">
                          <Input 
                            type="color" 
                            value={localColors.footerSolidColor} 
                            onChange={(e) => updateLocalColor('footerSolidColor', e.target.value)} 
                            onBlur={(e) => updateLayout(activeRole, 'footerSolidColor', e.target.value)}
                            className="h-10 w-16 p-1 rounded-xl cursor-pointer border-none bg-white shadow-sm" 
                          />
                          <Input 
                            value={localColors.footerSolidColor} 
                            onChange={(e) => updateLocalColor('footerSolidColor', e.target.value)}
                            onBlur={(e) => updateLayout(activeRole, 'footerSolidColor', e.target.value)}
                            className="h-10 flex-1 rounded-xl text-xs font-mono font-bold bg-white" 
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label className="text-[9px] font-bold uppercase opacity-60">Gradient Start</Label>
                          <div className="flex items-center gap-3">
                            <Input 
                              type="color" 
                              value={localColors.footerGradientStart} 
                              onChange={(e) => updateLocalColor('footerGradientStart', e.target.value)}
                              onBlur={(e) => updateLayout(activeRole, 'footerGradientStart', e.target.value)}
                              className="h-10 w-16 p-1 rounded-xl cursor-pointer border-none bg-white shadow-sm" 
                            />
                            <Input 
                              value={localColors.footerGradientStart} 
                              onChange={(e) => updateLocalColor('footerGradientStart', e.target.value)}
                              onBlur={(e) => updateLayout(activeRole, 'footerGradientStart', e.target.value)}
                              className="h-10 flex-1 rounded-xl text-xs font-mono font-bold bg-white" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[9px] font-bold uppercase opacity-60">Gradient End</Label>
                          <div className="flex items-center gap-3">
                            <Input 
                              type="color" 
                              value={localColors.footerGradientEnd} 
                              onChange={(e) => updateLocalColor('footerGradientEnd', e.target.value)}
                              onBlur={(e) => updateLayout(activeRole, 'footerGradientEnd', e.target.value)}
                              className="h-10 w-16 p-1 rounded-xl cursor-pointer border-none bg-white shadow-sm" 
                            />
                            <Input 
                              value={localColors.footerGradientEnd} 
                              onChange={(e) => updateLocalColor('footerGradientEnd', e.target.value)}
                              onBlur={(e) => updateLayout(activeRole, 'footerGradientEnd', e.target.value)}
                              className="h-10 flex-1 rounded-xl text-xs font-mono font-bold bg-white" 
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
               </div>
             )}

             {activeRoleLayout?.centerFloat && (
               <div className="space-y-6 pt-6 border-t border-border/50 animate-in slide-in-from-top-2 duration-300 text-left">
                  <div className="flex items-center justify-between px-1">
                    <div className="space-y-1">
                      <h5 className="text-[10px] font-black uppercase text-primary tracking-widest">Floating Node Colors</h5>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase">Single, Gradient & Outer Ring signature</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-1 rounded-xl border">
                      <button 
                        onClick={() => updateLayout(activeRole, 'fabColorType', 'solid')}
                        className={cn("px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all", activeRoleLayout?.fabColorType !== 'gradient' ? "bg-primary text-white" : "text-slate-400")}
                      >
                        Solid
                      </button>
                      <button 
                        onClick={() => updateLayout(activeRole, 'fabColorType', 'gradient')}
                        className={cn("px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all", activeRoleLayout?.fabColorType === 'gradient' ? "bg-primary text-white" : "text-slate-400")}
                      >
                        Gradient
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {activeRoleLayout?.fabColorType !== 'gradient' ? (
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase opacity-60">Primary Color</Label>
                        <div className="flex items-center gap-3">
                          <Input 
                            type="color" 
                            value={localColors.fabSolidColor} 
                            onChange={(e) => updateLocalColor('fabSolidColor', e.target.value)}
                            onBlur={(e) => updateLayout(activeRole, 'fabSolidColor', e.target.value)}
                            className="h-10 w-12 p-1 rounded-xl cursor-pointer border-none bg-white shadow-sm" 
                          />
                          <Input 
                            value={localColors.fabSolidColor} 
                            onChange={(e) => updateLocalColor('fabSolidColor', e.target.value)}
                            onBlur={(e) => updateLayout(activeRole, 'fabSolidColor', e.target.value)}
                            className="h-10 flex-1 rounded-xl text-[10px] font-mono font-bold bg-white" 
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label className="text-[9px] font-bold uppercase opacity-60">Start Color</Label>
                          <div className="flex items-center gap-3">
                            <Input 
                              type="color" 
                              value={localColors.fabGradientStart} 
                              onChange={(e) => updateLocalColor('fabGradientStart', e.target.value)}
                              onBlur={(e) => updateLayout(activeRole, 'fabGradientStart', e.target.value)}
                              className="h-10 w-12 p-1 rounded-xl cursor-pointer border-none bg-white shadow-sm" 
                            />
                            <Input 
                              value={localColors.fabGradientStart} 
                              onChange={(e) => updateLocalColor('fabGradientStart', e.target.value)}
                              onBlur={(e) => updateLayout(activeRole, 'fabGradientStart', e.target.value)}
                              className="h-10 flex-1 rounded-xl text-[10px] font-mono font-bold bg-white" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[9px] font-bold uppercase opacity-60">End Color</Label>
                          <div className="flex items-center gap-3">
                            <Input 
                              type="color" 
                              value={localColors.fabGradientEnd} 
                              onChange={(e) => updateLocalColor('fabGradientEnd', e.target.value)}
                              onBlur={(e) => updateLayout(activeRole, 'fabGradientEnd', e.target.value)}
                              className="h-10 w-12 p-1 rounded-xl cursor-pointer border-none bg-white shadow-sm" 
                            />
                            <Input 
                              value={localColors.fabGradientEnd} 
                              onChange={(e) => updateLocalColor('fabGradientEnd', e.target.value)}
                              onBlur={(e) => updateLayout(activeRole, 'fabGradientEnd', e.target.value)}
                              className="h-10 flex-1 rounded-xl text-[10px] font-mono font-bold bg-white" 
                            />
                          </div>
                        </div>
                      </>
                    )}
                    
                    <div className="space-y-2">
                      <Label className="text-[9px] font-bold uppercase opacity-60">Outer Ring Color</Label>
                      <div className="flex items-center gap-3">
                        <Input 
                          type="color" 
                          value={localColors.fabRingColor} 
                          onChange={(e) => updateLocalColor('fabRingColor', e.target.value)}
                          onBlur={(e) => updateLayout(activeRole, 'fabRingColor', e.target.value)}
                          className="h-10 w-12 p-1 rounded-xl cursor-pointer border-none bg-white shadow-sm" 
                        />
                        <Input 
                          value={localColors.fabRingColor} 
                          onChange={(e) => updateLocalColor('fabRingColor', e.target.value)}
                          onBlur={(e) => updateLayout(activeRole, 'fabRingColor', e.target.value)}
                          className="h-10 flex-1 rounded-xl text-[10px] font-mono font-bold bg-white" 
                        />
                      </div>
                    </div>
                  </div>
               </div>
             )}
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between px-2 text-left">
               <div className="space-y-1">
                 <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                   <LayoutList className="h-4 w-4" /> Primary Navigation
                 </h4>
                 <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">Order determines sequence in mobile footer</p>
               </div>
               <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[8px] font-black h-5 px-2">
                 {activeRoleLayout?.footer?.length || 0}/5 VISIBLE
               </Badge>
            </div>

            <div className="space-y-3">
               {(activeRoleLayout?.footer || []).map((id: string, idx: number) => {
                 const item = fullNavRegistry.find(x => x.id === id);
                 if (!item) return null;
                 const isLocked = checkIsLocked(item);
                 const NavIcon = item.icon;

                 return (
                   <div key={id} className={cn(
                     "p-4 rounded-2xl border-2 shadow-sm flex items-center justify-between animate-in slide-in-from-left-2",
                     isLocked ? "border-red-100 bg-red-50/30 opacity-70" : "border-primary/20 bg-white"
                   )} style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className="flex items-center gap-4">
                         <div className="flex flex-col gap-0.5 text-left">
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-primary/10" onClick={() => moveItem(activeRole, idx, 'up')} disabled={idx === 0}><ArrowUp className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-primary/10" onClick={() => moveItem(activeRole, idx, 'down')} disabled={idx === (activeRoleLayout?.footer?.length - 1)}><ArrowDown className="h-3 w-3" /></Button>
                         </div>
                         <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shadow-inner", isLocked ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary")}>
                            {isLocked ? <Lock className="h-4 w-4" /> : <NavIcon className="h-5 w-5" />}
                         </div>
                         <div className="text-left">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.label}</p>
                              {isLocked && <Badge variant="destructive" className="text-[6px] h-3 px-1 font-black uppercase">Module Locked</Badge>}
                              {item.isCustom && <Badge variant="secondary" className="text-[6px] h-3 px-1 font-black uppercase">Manual</Badge>}
                            </div>
                            <p className="text-[8px] font-mono text-muted-foreground uppercase">{item.href}</p>
                         </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive/40 hover:text-destructive" onClick={() => toggleNavItem(activeRole, id)}><X className="h-5 w-5" /></Button>
                   </div>
                 );
               })}
               <Separator className="my-6 opacity-30" />
               <div className="space-y-4">
                  <p className="text-[9px] font-black uppercase text-muted-foreground ml-2 tracking-widest text-left">Available to Add (Nodes & Manual Buttons)</p>
                  <div className="flex flex-wrap gap-2">
                    {fullNavRegistry.filter(item => !activeRoleLayout?.footer?.includes(item.id)).map(item => {
                       const isLocked = checkIsLocked(item);
                       const RegIcon = item.icon;
                       return (
                        <Badge 
                          key={item.id} 
                          onClick={() => toggleNavItem(activeRole, item.id)}
                          variant="outline" 
                          className={cn(
                            "h-10 px-4 rounded-xl cursor-pointer transition-all gap-2 text-[10px] font-bold uppercase border-border/50 bg-white shadow-sm",
                            isLocked ? "text-red-400 opacity-60 border-red-100 hover:bg-red-50" : "text-slate-600 hover:bg-primary/5 hover:border-primary/20"
                          )}
                        >
                          <RegIcon className="h-3.5 w-3.5 opacity-40" /> {item.label}
                        </Badge>
                       );
                    })}
                  </div>
               </div>
            </div>
          </section>

          <Separator className="opacity-50" />

          <section className="space-y-6">
            <div className="flex items-center justify-between px-2 text-left">
               <div className="space-y-1">
                 <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                   <ChevronUp className="h-4 w-4" /> Drop-up Node Hub
                 </h4>
                 <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">Navigation nodes available in the "More" menu</p>
               </div>
            </div>
            <div className="p-8 bg-muted/20 rounded-[2.5rem] space-y-6 border border-border/50 text-left">
              <div className="flex flex-wrap gap-3">
                {fullNavRegistry.map(item => {
                  const isSelected = activeRoleLayout?.more?.includes(item.id);
                  const isMain = activeRoleLayout?.footer?.includes(item.id);
                  if (isMain) return null;
                  const isLocked = checkIsLocked(item);
                  const HubIcon = item.icon;
                  
                  return (
                    <Badge 
                      key={item.id} 
                      onClick={() => toggleMoreItem(activeRole, item.id)}
                      className={cn(
                        "h-11 px-5 rounded-2xl cursor-pointer transition-all gap-2 text-[11px] font-bold uppercase shadow-sm",
                        isSelected ? "bg-primary text-white border-none scale-105" : "bg-white border-border text-slate-500 hover:border-primary/20",
                        isLocked && !isSelected && "opacity-40 grayscale"
                      )}
                    >
                      <HubIcon className={cn("h-4 w-4", isSelected ? "text-white" : "opacity-40")} /> 
                      {item.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-5 relative flex flex-col items-center">
           <div className="w-full sticky top-24 space-y-8">
              <Card className="border-none shadow-2xl bg-slate-900 rounded-[2.5rem] overflow-hidden p-8 flex flex-col items-center border border-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-accent mb-12 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Node Live Simulator
                </p>
                
                <div className="w-full max-w-[340px] bg-white rounded-[2.5rem] border-[10px] border-slate-800 aspect-[1.1/1] shadow-2xl relative overflow-hidden flex flex-col justify-end group">
                  <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/sim/600/600')] bg-cover opacity-10 grayscale mix-blend-overlay pointer-events-none" />
                  
                  {/* Shortcut FAB Simulation */}
                  <div className={cn(
                    "absolute z-20 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300",
                    activeRoleLayout?.fabPosition === 'center' ? "bottom-24 left-1/2 -translate-x-1/2 items-center" : "bottom-24 right-6 items-end"
                  )}>
                    <div className="p-2 bg-slate-900 text-white text-[8px] font-black uppercase rounded-lg shadow-2xl opacity-90 mb-1">
                      {MASTER_FAB_REGISTRY[activeRoleLayout?.fab?.[0]]?.label || "Shortcut"}
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white shadow-2xl scale-110">
                      <Plus className="h-5 w-5" />
                    </div>
                  </div>

                  {/* SIMULATED FOOTER PREVIEW */}
                  <div 
                    style={(() => {
                      if (activeRoleLayout?.footerStyle !== 'custom') return {};
                      if (activeRoleLayout?.footerBgType === 'gradient') return {
                        background: `linear-gradient(to bottom, ${localColors.footerGradientStart}, ${localColors.footerGradientEnd})`
                      };
                      return { background: localColors.footerSolidColor };
                    })()}
                    className={cn(
                      "h-16 border-t flex items-center justify-around px-2 relative z-10 shrink-0 transition-all duration-500 rounded-b-[1.8rem] overflow-visible",
                      activeRoleLayout?.footerStyle === 'solid' && "bg-white",
                      activeRoleLayout?.footerStyle === 'glass' && "bg-white/80 backdrop-blur-lg",
                      activeRoleLayout?.footerStyle === 'dark' && "bg-slate-900 text-white",
                      (activeRoleLayout?.footerStyle === 'custom' && activeRoleLayout?.footerBgType === 'gradient' || activeRoleLayout?.footerStyle === 'dark') ? "text-white" : "text-slate-900"
                    )}
                  >
                    {(() => {
                      const footer = activeRoleLayout?.footer || [];
                      const more = activeRoleLayout?.more || [];
                      const centerFloat = activeRoleLayout?.centerFloat;
                      
                      const activeFooter = footer.filter(id => fullNavRegistry.find(x => x.id === id));
                      const hasMore = more.length > 0 || activeFooter.length > 5;
                      const displayIds = activeFooter.slice(0, hasMore ? 4 : 5);
                      
                      return (
                        <>
                          {displayIds.map((fid: string, i: number) => {
                              const item = fullNavRegistry.find(x => x.id === fid);
                              if (!item) return null;
                              const isFloating = centerFloat && i === 2;
                              const isSelected = i === 0;
                              const SimIcon = item.icon;

                              const fabStyles: React.CSSProperties = isFloating ? {
                                  background: activeRoleLayout?.fabColorType === 'gradient' 
                                    ? `linear-gradient(to bottom right, ${localColors.fabGradientStart}, ${localColors.fabGradientEnd})`
                                    : localColors.fabSolidColor,
                                  borderColor: localColors.fabRingColor
                              } : {};

                              return (
                                <div key={fid} className={cn(
                                  "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all active:scale-90 relative min-w-0",
                                  isSelected ? "opacity-100" : "opacity-40",
                                  isFloating ? "overflow-visible" : ""
                                )}>
                                  {isFloating ? (
                                    <div className="flex flex-col items-center justify-end w-full h-full pb-1.5 overflow-visible">
                                        <div 
                                          style={fabStyles}
                                          className="h-12 w-12 rounded-full flex items-center justify-center shadow-xl border-[4px] absolute -top-8 scale-110 transition-transform group-hover:scale-125"
                                        >
                                          <SimIcon className="h-6 w-6 text-white" />
                                        </div>
                                        <span className="text-[7px] font-black uppercase text-center truncate w-full mt-3">{item.label}</span>
                                    </div>
                                  ) : (
                                    <>
                                      <SimIcon className="h-5 w-5" />
                                      <span className="text-[7px] font-black uppercase text-center leading-none mt-1 truncate w-full px-1">{item.label}</span>
                                      {isSelected && <div className={cn("absolute top-0 h-0.5 w-8 rounded-full", (activeRoleLayout?.footerStyle === 'dark' || (activeRoleLayout?.footerStyle === 'custom' && activeRoleLayout?.footerBgType === 'gradient')) ? "bg-white" : "bg-primary")} />}
                                    </>
                                  )}
                                </div>
                              );
                          })}
                          {hasMore && (
                            <div className="flex flex-col items-center justify-center gap-1 flex-1 h-full opacity-40 min-w-0">
                                <MoreHorizontal className="h-5 w-5 stroke-[1.5px]" />
                                <span className="text-[7px] font-black uppercase truncate w-full text-center">More</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="mt-12 p-8 bg-white/5 rounded-[2.5rem] border border-white/10 flex items-start gap-4 shadow-inner w-full">
                  <Info className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <p className="text-[11px] font-medium text-slate-400 leading-relaxed uppercase italic text-left">
                    Simulator focuses on the navigation node. Floating button (`overflow-visible`) and bottom corner alignments are precisely rendered.
                  </p>
                </div>
              </Card>
           </div>
        </div>
      </div>
    </div>
  );
}

