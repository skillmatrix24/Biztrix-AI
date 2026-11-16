"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  LayoutDashboard,
  Receipt,
  Package,
  Users,
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
  Headset,
  BookOpenText,
  UserCircle,
  Handshake,
  Building,
  Target,
  Trophy,
  MessageCircle,
  Ticket,
  MessageSquare,
  IdCard,
  Settings2,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  X,
  Smartphone as LucideSmartphone,
  Plus,
  Palette,
  ScanLine,
  Circle as LucideCircle,
  MoreHorizontal,
  UserPlus,
  LayoutList,
  Info,
  ShieldCheck,
  Lock,
  Link as LinkIcon,
  Star,
  Heart,
  PlusCircle,
  Layout,
  Trash2,
  Grid,
  Eye,
  EyeOff,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/editorial";
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
  { name: "Grid", icon: Grid },
];

const NAV_REGISTRY = [
  { id: "/dashboard", label: "Home", icon: LayoutDashboard },
  { id: "/daily-entries", label: "Entries", icon: BookOpenText },
  { id: "/billing", label: "Billing", icon: Receipt },
  { id: "/inventory", label: "Inventory", icon: Package },
  {
    id: "/inventory/scanner",
    label: "Scanner",
    icon: ScanLine,
    suiteId: "suite_intelligence",
  },
  { id: "/leads", label: "Leads", icon: UserCheck },
  { id: "/customers", label: "Clients", icon: Users },
  { id: "/vendors", label: "Vendors", icon: Target },
  {
    id: "/feedback",
    label: "Feedback",
    icon: MessageCircle,
    addonId: "feat_feedback",
  },
  {
    id: "/complaints",
    label: "Support",
    icon: Headset,
    suiteId: "suite_support",
  },
  {
    id: "/properties",
    label: "Properties",
    icon: Building,
    suiteId: "suite_property",
  },
  {
    id: "/properties/leads",
    label: "RE Leads",
    icon: Target,
    suiteId: "suite_property",
  },
  {
    id: "/properties/rewards",
    label: "Agent Hub",
    icon: Trophy,
    suiteId: "suite_property",
  },
  {
    id: "/loyalty",
    label: "Rewards",
    icon: Ticket,
    suiteId: "suite_loyalty",
  },
  {
    id: "/loyalty/members",
    label: "Members",
    icon: Users,
    suiteId: "suite_loyalty",
  },
  {
    id: "/loyalty/automation",
    label: "Rule Bot",
    icon: Zap,
    suiteId: "suite_loyalty",
  },
  {
    id: "/loyalty/campaigns",
    label: "Broadcast",
    icon: MessageSquare,
    suiteId: "suite_loyalty",
  },
  { id: "/loyalty/tiers", label: "Tiers", icon: IdCard, suiteId: "suite_loyalty" },
  {
    id: "/loyalty/coupons",
    label: "Coupons",
    icon: Ticket,
    suiteId: "suite_loyalty",
  },
  {
    id: "/whatsapp-automation",
    label: "WhatsApp",
    icon: SmartphoneNfc,
    suiteId: "suite_growth",
  },
  { id: "/marketing", label: "Campaigns", icon: Zap, suiteId: "suite_growth" },
  {
    id: "/ai-insights",
    label: "Advisor",
    icon: Lightbulb,
    suiteId: "suite_intelligence",
  },
  {
    id: "/accounting",
    label: "P&L",
    icon: Wallet,
    suiteId: "suite_backoffice",
  },
  {
    id: "/projects",
    label: "Projects",
    icon: Briefcase,
    suiteId: "suite_backoffice",
  },
  { id: "/staff", label: "Team", icon: Users2, suiteId: "suite_backoffice" },
  { id: "/notes", label: "Tasks", icon: ListTodo, suiteId: "suite_backoffice" },
  { id: "/website", label: "Store", icon: ShoppingBag, addonId: "feat_store" },
  {
    id: "/website/visitors",
    label: "Visitors",
    icon: MousePointer2,
    addonId: "feat_store",
  },
  { id: "/settings", label: "Settings", icon: Settings2 },
  { id: "/profile", label: "Profile", icon: UserCircle },
  { id: "/my-staff-portal", label: "Staff Hub", icon: UserCircle },
];

const UI_STYLES = [
  { id: "solid", label: "Solid White", icon: LucideCircle },
  { id: "glass", label: "Glass Blur", icon: LucideSmartphone },
  { id: "dark", label: "Dark Bar", icon: Lock },
  { id: "custom", label: "Custom Colors", icon: Palette },
];

const MASTER_FAB_REGISTRY: Record<
  string,
  { label: string; icon: any; color: string; suiteId?: string; addonId?: string }
> = {
  "/billing": { label: "New Sale", icon: Receipt, color: "bg-primary" },
  "/leads": { label: "New Lead", icon: UserPlus, color: "bg-blue-600" },
  "/complaints/form": {
    label: "New Ticket",
    icon: Headset,
    color: "bg-orange-600",
    suiteId: "suite_support",
  },
  "/inventory/scanner": {
    label: "Scan Bill",
    icon: ScanLine,
    color: "bg-indigo-600",
    suiteId: "suite_intelligence",
  },
  "/properties/new": {
    label: "New Asset",
    icon: Building,
    color: "bg-primary",
    suiteId: "suite_property",
  },
  "/properties/leads/new": {
    label: "New RE Lead",
    icon: Target,
    color: "bg-blue-500",
    suiteId: "suite_property",
  },
  "/payment-requests": {
    label: "Request Fund",
    icon: Handshake,
    color: "bg-green-600",
    addonId: "feat_payments",
  },
};

export function MobileUiTab({ business, businessRef, isAdmin }: any) {
  const [activeRole, setActiveRole] = useState<"admin" | "staff" | "agent">(
    "admin"
  );

  const activeAddonIds = useMemo(
    () => business?.activeAddonIds || [],
    [business]
  );

  const layoutConfig = useMemo(() => {
    const base = business?.mobileLayout || {};
    const defaults = {
      admin: {
        showFooter: true,
        footer: [
          "/dashboard",
          "/billing",
          "/inventory",
          "/ai-insights",
          "/settings",
        ],
        more: [],
        fab: ["/billing", "/leads", "/inventory/scanner"],
        fabPosition: "right",
        footerStyle: "solid",
        centerFloat: false,
        fabColorType: "solid",
        fabSolidColor: "#0C83B3",
        fabRingColor: "#ffffff",
        footerBgType: "solid",
        footerSolidColor: "#ffffff",
      },
      staff: {
        showFooter: true,
        footer: ["/dashboard", "/billing", "/inventory", "/my-staff-portal"],
        more: [],
        fab: ["/billing"],
        fabPosition: "right",
        footerStyle: "solid",
        centerFloat: false,
        fabColorType: "solid",
        fabSolidColor: "#0C83B3",
        fabRingColor: "#ffffff",
        footerBgType: "solid",
        footerSolidColor: "#ffffff",
      },
      agent: {
        showFooter: true,
        footer: ["/dashboard", "/properties", "/properties/leads", "/profile"],
        more: [],
        fab: ["/properties/leads/new", "/properties/new"],
        fabPosition: "right",
        footerStyle: "solid",
        centerFloat: false,
        fabColorType: "solid",
        fabSolidColor: "#0C83B3",
        fabRingColor: "#ffffff",
        footerBgType: "solid",
        footerSolidColor: "#ffffff",
      },
    };

    return {
      admin: { ...defaults.admin, ...base.admin },
      staff: { ...defaults.staff, ...base.staff },
      agent: { ...defaults.agent, ...base.agent },
    };
  }, [business?.mobileLayout]);

  const activeRoleLayout = layoutConfig[activeRole];

  const [localColors, setLocalColors] = useState<any>({
    footerSolidColor: "#ffffff",
    footerGradientStart: "#0C83B3",
    footerGradientEnd: "#2DD4BF",
    fabSolidColor: "#0C83B3",
    fabGradientStart: "#0C83B3",
    fabGradientEnd: "#2DD4BF",
    fabRingColor: "#ffffff",
  });

  useEffect(() => {
    if (activeRoleLayout) {
      setLocalColors({
        footerSolidColor: activeRoleLayout.footerSolidColor || "#ffffff",
        footerGradientStart: activeRoleLayout.footerGradientStart || "#0C83B3",
        footerGradientEnd: activeRoleLayout.footerGradientEnd || "#2DD4BF",
        fabSolidColor: activeRoleLayout.fabSolidColor || "#0C83B3",
        fabGradientStart: activeRoleLayout.fabGradientStart || "#0C83B3",
        fabGradientEnd: activeRoleLayout.fabGradientEnd || "#2DD4BF",
        fabRingColor: activeRoleLayout.fabRingColor || "#ffffff",
      });
    }
  }, [activeRoleLayout]);

  const customNavLinks = useMemo(() => business?.customNavLinks || [], [business]);

  const fullNavRegistry = useMemo(() => {
    const customItems = customNavLinks.map((cl: any) => ({
      id: cl.id,
      href: cl.url,
      label: cl.label,
      icon: ICON_PICKER_LIST.find((i) => i.name === cl.icon)?.icon || Globe,
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
        [role]: {
          ...layoutConfig[role as keyof typeof layoutConfig],
          [field]: value,
        },
      },
    });
  };

  const handleToggleAllRolesFooter = (checked: boolean) => {
    if (!isAdmin || !businessRef) return;
    updateDocumentNonBlocking(businessRef, {
      mobileLayout: {
        ...layoutConfig,
        admin: { ...layoutConfig.admin, showFooter: checked },
        staff: { ...layoutConfig.staff, showFooter: checked },
        agent: { ...layoutConfig.agent, showFooter: checked },
      },
    });
    toast({
      title: checked
        ? "Footer Menu Enabled for All Roles"
        : "Footer Menu Disabled for All Roles",
      description: checked
        ? "Mobile bottom navigation is now enabled for Admin, Staff, and Agent views."
        : "Mobile bottom navigation is now hidden across all roles.",
    });
  };

  const toggleNavItem = (role: string, id: string) => {
    const current = layoutConfig[role as keyof typeof layoutConfig]?.footer || [];
    const updated = current.includes(id)
      ? current.filter((h: string) => h !== id)
      : [...current, id];
    updateLayout(role, "footer", updated);
  };

  const toggleMoreItem = (role: string, id: string) => {
    const current = layoutConfig[role as keyof typeof layoutConfig]?.more || [];
    const updated = current.includes(id)
      ? current.filter((h: string) => h !== id)
      : [...current, id];
    updateLayout(role, "more", updated);
  };

  const moveItem = (role: string, index: number, dir: "up" | "down") => {
    const current = [
      ...(layoutConfig[role as keyof typeof layoutConfig]?.footer || []),
    ];
    const target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= current.length) return;
    [current[index], current[target]] = [current[target], current[index]];
    updateLayout(role, "footer", current);
  };

  const handleAddCustomLink = () => {
    if (!isAdmin || !businessRef) return;
    const current = business?.customNavLinks || [];
    const newLink = {
      id: `cl_${Date.now()}`,
      label: "Custom Button",
      icon: "Globe",
      url: "/dashboard",
    };
    updateDocumentNonBlocking(businessRef, {
      customNavLinks: [...current, newLink],
    });
    toast({ title: "Custom Button Added" });
  };

  const handleUpdateCustomLink = (id: string, field: string, value: string) => {
    if (!isAdmin || !businessRef) return;
    const current = business?.customNavLinks || [];
    const updated = current.map((cl: any) =>
      cl.id === id ? { ...cl, [field]: value } : cl
    );
    updateDocumentNonBlocking(businessRef, { customNavLinks: updated });
  };

  const handleRemoveCustomLink = (id: string) => {
    if (!isAdmin || !businessRef) return;
    const current = business?.customNavLinks || [];
    updateDocumentNonBlocking(businessRef, {
      customNavLinks: current.filter((cl: any) => cl.id !== id),
    });
    toast({ title: "Custom Button Removed", variant: "destructive" });
  };

  const updateLocalColor = (key: string, value: string) => {
    setLocalColors((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <LucideSmartphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Mobile Navigation &amp; Footer Layout
            </h3>
            <p className="text-xs text-slate-500">
              Customize bottom navigation items, custom links, and theme style per role.
            </p>
          </div>
        </div>

        <Tabs
          value={activeRole}
          onValueChange={(v: any) => setActiveRole(v)}
          className="w-full md:w-auto"
        >
          <TabsList className="bg-slate-100 border border-slate-200 rounded-xl h-auto p-1 w-full md:w-auto flex">
            <TabsTrigger
              value="admin"
              className="flex-1 text-xs font-semibold px-4 py-1.5 rounded-lg whitespace-nowrap"
            >
              Admin View
            </TabsTrigger>
            <TabsTrigger
              value="staff"
              className="flex-1 text-xs font-semibold px-4 py-1.5 rounded-lg whitespace-nowrap"
            >
              Staff View
            </TabsTrigger>
            <TabsTrigger
              value="agent"
              className="flex-1 text-xs font-semibold px-4 py-1.5 rounded-lg whitespace-nowrap"
            >
              Agent View
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <SectionCard
            title="Custom Shortcuts"
            description="Create custom quick links to add to the mobile footer bar."
            headerRight={
              <Button
                type="button"
                onClick={handleAddCustomLink}
                variant="outline"
                size="sm"
                className="h-9 rounded-xl text-xs font-semibold border-slate-200 whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Custom Button
              </Button>
            }
          >
            {customNavLinks.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/70">
                <p className="text-xs text-slate-500">
                  No custom buttons created yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {customNavLinks.map((cl: any) => (
                  <div
                    key={cl.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                  >
                    <div className="sm:col-span-1 flex justify-start sm:justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label={`Choose icon for ${cl.label}`}
                            className="h-9 w-9 rounded-lg border-slate-200 bg-white text-slate-800"
                          >
                            {(() => {
                              const Icon =
                                ICON_PICKER_LIST.find((i) => i.name === cl.icon)
                                  ?.icon || Globe;
                              return <Icon className="h-4 w-4" />;
                            })()}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 grid grid-cols-4 p-2 rounded-xl">
                          {ICON_PICKER_LIST.map((i) => (
                            <DropdownMenuItem
                              key={i.name}
                              onClick={() =>
                                handleUpdateCustomLink(cl.id, "icon", i.name)
                              }
                              className="flex items-center justify-center p-2 rounded-lg cursor-pointer"
                            >
                              <i.icon className="h-4 w-4 text-slate-700" />
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="sm:col-span-4">
                      <Input
                        defaultValue={cl.label}
                        aria-label="Button label"
                        onBlur={(e) =>
                          handleUpdateCustomLink(cl.id, "label", e.target.value)
                        }
                        className="h-9 rounded-lg text-xs font-medium bg-white border-slate-200"
                      />
                    </div>
                    <div className="sm:col-span-5 relative">
                      <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        defaultValue={cl.url}
                        aria-label="Target URL"
                        onBlur={(e) =>
                          handleUpdateCustomLink(cl.id, "url", e.target.value)
                        }
                        className="h-9 pl-8 rounded-lg text-xs font-mono bg-white border-slate-200"
                      />
                    </div>
                    <div className="sm:col-span-2 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${cl.label}`}
                        className="h-9 w-9 rounded-lg text-rose-600 hover:bg-rose-50"
                        onClick={() => handleRemoveCustomLink(cl.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Footer Bar Appearance"
            description="Control visibility, background style, and floating center button options."
            headerRight={<Palette className="h-4 w-4 text-slate-400" />}
          >
            <div className="space-y-5">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                        activeRoleLayout?.showFooter !== false
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      )}
                    >
                      {activeRoleLayout?.showFooter !== false ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Mobile Footer Menu ({activeRole})
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {activeRoleLayout?.showFooter !== false
                          ? `Visible on mobile for ${activeRole} accounts.`
                          : `Hidden on mobile for ${activeRole} accounts.`}
                      </p>
                    </div>
                  </div>
                  <Switch
                    aria-label={`Toggle mobile footer menu for ${activeRole}`}
                    checked={activeRoleLayout?.showFooter !== false}
                    onCheckedChange={(checked) =>
                      updateLayout(activeRole, "showFooter", checked)
                    }
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 font-medium">
                    Apply to all roles:
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleAllRolesFooter(true)}
                      className="h-8 text-xs font-semibold text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                    >
                      Enable All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleAllRolesFooter(false)}
                      className="h-8 text-xs font-semibold text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100 rounded-lg"
                    >
                      Disable All
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Bar Surface Style
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {UI_STYLES.map((style) => {
                      const StyleIcon = style.icon;
                      const active = activeRoleLayout?.footerStyle === style.id;
                      return (
                        <Button
                          key={style.id}
                          type="button"
                          variant={active ? "default" : "outline"}
                          onClick={() =>
                            updateLayout(activeRole, "footerStyle", style.id)
                          }
                          className={cn(
                            "h-9 text-xs font-semibold rounded-xl gap-1.5",
                            active
                              ? "bg-slate-900 hover:bg-slate-800 text-white"
                              : "border-slate-200"
                          )}
                        >
                          <StyleIcon className="h-3.5 w-3.5" /> {style.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Elevated Center Button
                  </Label>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-slate-900">
                        Center Action Highlight
                      </p>
                      <p className="text-xs text-slate-500">
                        3rd item displays as an elevated circle
                      </p>
                    </div>
                    <Switch
                      aria-label="Toggle elevated center button"
                      checked={!!activeRoleLayout?.centerFloat}
                      onCheckedChange={(v) =>
                        updateLayout(activeRole, "centerFloat", v)
                      }
                    />
                  </div>
                </div>
              </div>

              {activeRoleLayout?.footerStyle === "custom" && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900">
                      Footer Background Colors
                    </h5>
                    <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() =>
                          updateLayout(activeRole, "footerBgType", "solid")
                        }
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                          activeRoleLayout?.footerBgType !== "gradient"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-600"
                        )}
                      >
                        Solid
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateLayout(activeRole, "footerBgType", "gradient")
                        }
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                          activeRoleLayout?.footerBgType === "gradient"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-600"
                        )}
                      >
                        Gradient
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeRoleLayout?.footerBgType !== "gradient" ? (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-600">
                          Background Color
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            aria-label="Footer background color picker"
                            value={localColors.footerSolidColor || "#ffffff"}
                            onChange={(e) =>
                              updateLocalColor(
                                "footerSolidColor",
                                e.target.value
                              )
                            }
                            onBlur={(e) =>
                              updateLayout(
                                activeRole,
                                "footerSolidColor",
                                e.target.value
                              )
                            }
                            className="h-9 w-12 p-1 rounded-lg cursor-pointer"
                          />
                          <Input
                            value={localColors.footerSolidColor || "#ffffff"}
                            aria-label="Footer background color hex"
                            onChange={(e) =>
                              updateLocalColor(
                                "footerSolidColor",
                                e.target.value
                              )
                            }
                            onBlur={(e) =>
                              updateLayout(
                                activeRole,
                                "footerSolidColor",
                                e.target.value
                              )
                            }
                            className="h-9 flex-1 rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-600">
                            Gradient Start
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              aria-label="Gradient start color picker"
                              value={
                                localColors.footerGradientStart || "#0C83B3"
                              }
                              onChange={(e) =>
                                updateLocalColor(
                                  "footerGradientStart",
                                  e.target.value
                                )
                              }
                              onBlur={(e) =>
                                updateLayout(
                                  activeRole,
                                  "footerGradientStart",
                                  e.target.value
                                )
                              }
                              className="h-9 w-12 p-1 rounded-lg cursor-pointer"
                            />
                            <Input
                              value={
                                localColors.footerGradientStart || "#0C83B3"
                              }
                              aria-label="Gradient start color hex"
                              onChange={(e) =>
                                updateLocalColor(
                                  "footerGradientStart",
                                  e.target.value
                                )
                              }
                              onBlur={(e) =>
                                updateLayout(
                                  activeRole,
                                  "footerGradientStart",
                                  e.target.value
                                )
                              }
                              className="h-9 flex-1 rounded-lg text-xs font-mono"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-600">
                            Gradient End
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              aria-label="Gradient end color picker"
                              value={localColors.footerGradientEnd || "#2DD4BF"}
                              onChange={(e) =>
                                updateLocalColor(
                                  "footerGradientEnd",
                                  e.target.value
                                )
                              }
                              onBlur={(e) =>
                                updateLayout(
                                  activeRole,
                                  "footerGradientEnd",
                                  e.target.value
                                )
                              }
                              className="h-9 w-12 p-1 rounded-lg cursor-pointer"
                            />
                            <Input
                              value={localColors.footerGradientEnd || "#2DD4BF"}
                              aria-label="Gradient end color hex"
                              onChange={(e) =>
                                updateLocalColor(
                                  "footerGradientEnd",
                                  e.target.value
                                )
                              }
                              onBlur={(e) =>
                                updateLayout(
                                  activeRole,
                                  "footerGradientEnd",
                                  e.target.value
                                )
                              }
                              className="h-9 flex-1 rounded-lg text-xs font-mono"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeRoleLayout?.centerFloat && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900">
                      Floating Button Colors
                    </h5>
                    <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() =>
                          updateLayout(activeRole, "fabColorType", "solid")
                        }
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                          activeRoleLayout?.fabColorType !== "gradient"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-600"
                        )}
                      >
                        Solid
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateLayout(activeRole, "fabColorType", "gradient")
                        }
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                          activeRoleLayout?.fabColorType === "gradient"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-600"
                        )}
                      >
                        Gradient
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {activeRoleLayout?.fabColorType !== "gradient" ? (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-600">
                          Primary Color
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            aria-label="Floating button primary color picker"
                            value={localColors.fabSolidColor || "#0C83B3"}
                            onChange={(e) =>
                              updateLocalColor("fabSolidColor", e.target.value)
                            }
                            onBlur={(e) =>
                              updateLayout(
                                activeRole,
                                "fabSolidColor",
                                e.target.value
                              )
                            }
                            className="h-9 w-11 p-1 rounded-lg cursor-pointer"
                          />
                          <Input
                            value={localColors.fabSolidColor || "#0C83B3"}
                            aria-label="Floating button primary color hex"
                            onChange={(e) =>
                              updateLocalColor("fabSolidColor", e.target.value)
                            }
                            onBlur={(e) =>
                              updateLayout(
                                activeRole,
                                "fabSolidColor",
                                e.target.value
                              )
                            }
                            className="h-9 flex-1 rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-600">
                            Start Color
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              aria-label="Floating button start color picker"
                              value={localColors.fabGradientStart || "#0C83B3"}
                              onChange={(e) =>
                                updateLocalColor(
                                  "fabGradientStart",
                                  e.target.value
                                )
                              }
                              onBlur={(e) =>
                                updateLayout(
                                  activeRole,
                                  "fabGradientStart",
                                  e.target.value
                                )
                              }
                              className="h-9 w-11 p-1 rounded-lg cursor-pointer"
                            />
                            <Input
                              value={localColors.fabGradientStart || "#0C83B3"}
                              aria-label="Floating button start color hex"
                              onChange={(e) =>
                                updateLocalColor(
                                  "fabGradientStart",
                                  e.target.value
                                )
                              }
                              onBlur={(e) =>
                                updateLayout(
                                  activeRole,
                                  "fabGradientStart",
                                  e.target.value
                                )
                              }
                              className="h-9 flex-1 rounded-lg text-xs font-mono"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-600">
                            End Color
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              aria-label="Floating button end color picker"
                              value={localColors.fabGradientEnd || "#2DD4BF"}
                              onChange={(e) =>
                                updateLocalColor(
                                  "fabGradientEnd",
                                  e.target.value
                                )
                              }
                              onBlur={(e) =>
                                updateLayout(
                                  activeRole,
                                  "fabGradientEnd",
                                  e.target.value
                                )
                              }
                              className="h-9 w-11 p-1 rounded-lg cursor-pointer"
                            />
                            <Input
                              value={localColors.fabGradientEnd || "#2DD4BF"}
                              aria-label="Floating button end color hex"
                              onChange={(e) =>
                                updateLocalColor(
                                  "fabGradientEnd",
                                  e.target.value
                                )
                              }
                              onBlur={(e) =>
                                updateLayout(
                                  activeRole,
                                  "fabGradientEnd",
                                  e.target.value
                                )
                              }
                              className="h-9 flex-1 rounded-lg text-xs font-mono"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600">
                        Outer Ring Color
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          aria-label="Floating button outer ring color picker"
                          value={localColors.fabRingColor || "#ffffff"}
                          onChange={(e) =>
                            updateLocalColor("fabRingColor", e.target.value)
                          }
                          onBlur={(e) =>
                            updateLayout(
                              activeRole,
                              "fabRingColor",
                              e.target.value
                            )
                          }
                          className="h-9 w-11 p-1 rounded-lg cursor-pointer"
                        />
                        <Input
                          value={localColors.fabRingColor || "#ffffff"}
                          aria-label="Floating button outer ring color hex"
                          onChange={(e) =>
                            updateLocalColor("fabRingColor", e.target.value)
                          }
                          onBlur={(e) =>
                            updateLayout(
                              activeRole,
                              "fabRingColor",
                              e.target.value
                            )
                          }
                          className="h-9 flex-1 rounded-lg text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Primary Bottom Navigation"
            description="Order determines left-to-right display in the mobile footer."
            headerRight={
              <span className="text-xs font-mono tabular-nums font-semibold text-slate-700">
                {activeRoleLayout?.footer?.length || 0}/5 visible
              </span>
            }
          >
            <div className="space-y-3">
              {(activeRoleLayout?.footer || []).map(
                (id: string, idx: number) => {
                  const item = fullNavRegistry.find((x) => x.id === id);
                  if (!item) return null;
                  const isLocked = checkIsLocked(item);
                  const NavIcon = item.icon;

                  return (
                    <div
                      key={id}
                      className={cn(
                        "p-3.5 rounded-xl border flex items-center justify-between gap-3",
                        isLocked
                          ? "border-rose-200 bg-rose-50/40 opacity-80"
                          : "border-slate-200 bg-white"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Move ${item.label} up`}
                            className="h-6 w-6 rounded-md"
                            onClick={() => moveItem(activeRole, idx, "up")}
                            disabled={idx === 0}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Move ${item.label} down`}
                            className="h-6 w-6 rounded-md"
                            onClick={() => moveItem(activeRole, idx, "down")}
                            disabled={
                              idx === activeRoleLayout?.footer?.length - 1
                            }
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <div
                          className={cn(
                            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                            isLocked
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-100 text-slate-800"
                          )}
                        >
                          {isLocked ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <NavIcon className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {item.label}
                            </p>
                            {isLocked && (
                              <span className="text-xs font-medium text-rose-700">
                                · Module locked
                              </span>
                            )}
                            {item.isCustom && (
                              <span className="text-xs font-medium text-slate-500">
                                · Custom
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono text-slate-500 truncate">
                            {item.href || item.id}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${item.label} from footer`}
                        className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50 shrink-0"
                        onClick={() => toggleNavItem(activeRole, id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                }
              )}

              <Separator className="my-4 bg-slate-100" />

              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-slate-600">
                  Available Items to Add
                </p>
                <div className="flex flex-wrap gap-2">
                  {fullNavRegistry
                    .filter(
                      (item) => !activeRoleLayout?.footer?.includes(item.id)
                    )
                    .map((item) => {
                      const isLocked = checkIsLocked(item);
                      const RegIcon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleNavItem(activeRole, item.id)}
                          className={cn(
                            "inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-medium transition-colors",
                            isLocked
                              ? "text-rose-700 border-rose-200 bg-rose-50/50 hover:bg-rose-50"
                              : "text-slate-700 border-slate-200 bg-white hover:bg-slate-50"
                          )}
                        >
                          <RegIcon className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="More Drawer Links"
            description="Items displayed inside the expandable 'More' sheet on mobile."
            headerRight={<ChevronUp className="h-4 w-4 text-slate-400" />}
          >
            <div className="flex flex-wrap gap-2">
              {fullNavRegistry.map((item) => {
                const isSelected = activeRoleLayout?.more?.includes(item.id);
                const isMain = activeRoleLayout?.footer?.includes(item.id);
                if (isMain) return null;
                const isLocked = checkIsLocked(item);
                const HubIcon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleMoreItem(activeRole, item.id)}
                    className={cn(
                      "inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border text-xs font-medium transition-colors",
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
                      isLocked && !isSelected && "opacity-55"
                    )}
                  >
                    <HubIcon
                      className={cn(
                        "h-3.5 w-3.5",
                        isSelected ? "text-white" : "text-slate-400"
                      )}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </SectionCard>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 rounded-2xl bg-slate-900 p-6 sm:p-8 flex flex-col items-center space-y-6 text-white">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Mobile Footer Preview ({activeRole})</span>
            </div>

            <div className="w-full max-w-[320px] bg-slate-50 rounded-2xl border-4 border-slate-800 aspect-[1.15/1] relative overflow-hidden flex flex-col justify-end">
              <div
                className={cn(
                  "absolute z-20 flex flex-col gap-2",
                  activeRoleLayout?.fabPosition === "center"
                    ? "bottom-20 left-1/2 -translate-x-1/2 items-center"
                    : "bottom-20 right-4 items-end"
                )}
              >
                <div className="px-2.5 py-1 bg-slate-900 text-white text-xs font-medium rounded-lg">
                  {MASTER_FAB_REGISTRY[activeRoleLayout?.fab?.[0]]?.label ||
                    "Shortcut"}
                </div>
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white">
                  <Plus className="h-5 w-5" />
                </div>
              </div>

              {activeRoleLayout?.showFooter === false ? (
                <div className="h-16 border-t border-slate-200 flex items-center justify-center gap-2 px-4 relative z-10 shrink-0 bg-slate-100 text-slate-500 text-xs font-medium">
                  <EyeOff className="h-4 w-4 text-slate-400" />
                  <span>Footer Menu Hidden</span>
                </div>
              ) : (
                <div
                  style={(() => {
                    if (activeRoleLayout?.footerStyle !== "custom") return {};
                    if (activeRoleLayout?.footerBgType === "gradient")
                      return {
                        background: `linear-gradient(to bottom, ${localColors.footerGradientStart}, ${localColors.footerGradientEnd})`,
                      };
                    return { background: localColors.footerSolidColor };
                  })()}
                  className={cn(
                    "h-16 border-t border-slate-200 flex items-center justify-around px-2 relative z-10 shrink-0 transition-colors overflow-visible",
                    activeRoleLayout?.footerStyle === "solid" && "bg-white",
                    activeRoleLayout?.footerStyle === "glass" &&
                      "bg-white/85 backdrop-blur-lg",
                    activeRoleLayout?.footerStyle === "dark" &&
                      "bg-slate-900 text-white border-slate-800",
                    activeRoleLayout?.footerStyle === "custom" &&
                      activeRoleLayout?.footerBgType === "gradient"
                      ? "text-white"
                      : activeRoleLayout?.footerStyle === "dark"
                        ? "text-white"
                        : "text-slate-900"
                  )}
                >
                  {(() => {
                    const footer = activeRoleLayout?.footer || [];
                    const more = activeRoleLayout?.more || [];
                    const centerFloat = activeRoleLayout?.centerFloat;

                    const activeFooter = footer.filter((id: string) =>
                      fullNavRegistry.find((x) => x.id === id)
                    );
                    const hasMore = more.length > 0 || activeFooter.length > 5;
                    const displayIds = activeFooter.slice(0, hasMore ? 4 : 5);

                    return (
                      <>
                        {displayIds.map((fid: string, i: number) => {
                          const item = fullNavRegistry.find(
                            (x) => x.id === fid
                          );
                          if (!item) return null;
                          const isFloating = centerFloat && i === 2;
                          const isSelected = i === 0;
                          const SimIcon = item.icon;

                          const fabStyles: React.CSSProperties = isFloating
                            ? {
                                background:
                                  activeRoleLayout?.fabColorType === "gradient"
                                    ? `linear-gradient(to bottom right, ${localColors.fabGradientStart}, ${localColors.fabGradientEnd})`
                                    : localColors.fabSolidColor,
                                borderColor: localColors.fabRingColor,
                              }
                            : {};

                          return (
                            <div
                              key={fid}
                              className={cn(
                                "flex flex-col items-center justify-center gap-1 flex-1 h-full relative min-w-0",
                                isSelected ? "opacity-100" : "opacity-55",
                                isFloating ? "overflow-visible" : ""
                              )}
                            >
                              {isFloating ? (
                                <div className="flex flex-col items-center justify-end w-full h-full pb-1.5 overflow-visible">
                                  <div
                                    style={fabStyles}
                                    className="h-11 w-11 rounded-full flex items-center justify-center border-[3px] absolute -top-6"
                                  >
                                    <SimIcon className="h-5 w-5 text-white" />
                                  </div>
                                  <span className="text-[11px] font-semibold text-center truncate w-full mt-3">
                                    {item.label}
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <SimIcon className="h-4 w-4" />
                                  <span className="text-[11px] font-medium text-center leading-none truncate w-full px-1">
                                    {item.label}
                                  </span>
                                  {isSelected && (
                                    <div
                                      className={cn(
                                        "absolute top-0 h-0.5 w-7 rounded-full",
                                        activeRoleLayout?.footerStyle ===
                                          "dark" ||
                                          (activeRoleLayout?.footerStyle ===
                                            "custom" &&
                                            activeRoleLayout?.footerBgType ===
                                              "gradient")
                                          ? "bg-white"
                                          : "bg-slate-900"
                                      )}
                                    />
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                        {hasMore && (
                          <div className="flex flex-col items-center justify-center gap-1 flex-1 h-full opacity-55 min-w-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="text-[11px] font-medium truncate w-full text-center">
                              More
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="p-4 bg-white/10 rounded-xl border border-white/15 flex items-start gap-3 w-full text-left">
              <Info className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 leading-relaxed">
                Changes save automatically per role and update the bottom navigation bar across mobile viewports.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
