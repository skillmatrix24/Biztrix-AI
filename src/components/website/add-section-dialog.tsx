"use client";

import {
  Award,
  BadgeCheck,
  BellRing,
  Building2,
  CheckCircle2,
  Clock,
  Flame,
  Gift,
  Globe,
  HelpCircle,
  Layers,
  LayoutGrid,
  ListChecks,
  MapPin,
  MessageCircle,
  MessageSquare,
  PlayCircle,
  Plus,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Target,
  Ticket,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  STORE_SECTION_CATALOG,
  StoreSection,
  StoreSectionType,
} from "@/lib/storefront-engine";

const SECTION_ICON_MAP: Record<string, any> = {
  Globe,
  ShieldCheck,
  LayoutGrid,
  Layers,
  Sparkles,
  Ticket,
  Clock,
  ShoppingBag,
  PlayCircle,
  CheckCircle2,
  HelpCircle,
  Building2,
  MapPin,
  BellRing,
  MessageSquare,
  MessageCircle,
  BadgeCheck,
  Target,
  Scale,
  ListChecks,
  Gift,
  Flame,
  Award,
  Zap,
};

interface AddSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSections: StoreSection[];
  onAddSection: (type: StoreSectionType) => void;
  prioritizeFunnel?: boolean;
}

const GROUP_LABELS: Array<{
  id: "funnel" | "merchandising" | "trust_conversion" | "core";
  title: string;
  subtitle: string;
}> = [
  {
    id: "funnel",
    title: "Sales Funnel Conversion Blocks",
    subtitle: "High-converting campaign blocks: Problem/Solution, Comparison, Value Stack, Pricing Tiers & Express Checkout",
  },
  {
    id: "merchandising",
    title: "Merchandising & Discovery",
    subtitle: "Help shoppers browse categories, new arrivals, and product demos",
  },
  {
    id: "trust_conversion",
    title: "Trust, Offers & Lead Capture",
    subtitle: "Boost conversion with USPs, active coupons, FAQs, store pickup & VIP alerts",
  },
  {
    id: "core",
    title: "Core Storefront Blocks",
    subtitle: "Hero banners, catalog grids, brand story, and support channels",
  },
];

export function AddSectionDialog({
  open,
  onOpenChange,
  existingSections,
  onAddSection,
  prioritizeFunnel = false,
}: AddSectionDialogProps) {
  const countByType = existingSections.reduce<Record<string, number>>((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {});

  const orderedGroups = prioritizeFunnel
    ? GROUP_LABELS
    : [
        ...GROUP_LABELS.filter((g) => g.id !== "funnel"),
        ...GROUP_LABELS.filter((g) => g.id === "funnel"),
      ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl rounded-2xl p-0 overflow-hidden bg-white text-left border border-slate-200">
        <DialogHeader className="p-6 bg-slate-900 text-white text-left">
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="h-4 w-4 text-accent" />{" "}
            {prioritizeFunnel ? "Add Funnel & Storefront Block" : "Add Storefront Section"}
          </DialogTitle>
          <DialogDescription className="text-slate-300 text-xs">
            Choose any of the {STORE_SECTION_CATALOG.length} storefront & sales funnel blocks below to append it to your layout.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {orderedGroups.map((group) => {
            const entries = STORE_SECTION_CATALOG.filter((item) => item.group === group.id);
            return (
              <div key={group.id} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      {group.title}
                      {group.id === "funnel" && (
                        <Badge variant="secondary" className="bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold rounded-md">
                          Funnel Pro
                        </Badge>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">{group.subtitle}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {entries.map((entry) => {
                    const IconComp = SECTION_ICON_MAP[entry.iconName] || Globe;
                    const count = countByType[entry.type] || 0;
                    return (
                      <button
                        key={entry.type}
                        type="button"
                        onClick={() => {
                          onAddSection(entry.type);
                          onOpenChange(false);
                        }}
                        className="p-4 rounded-2xl border border-slate-200 hover:border-primary hover:bg-primary/5 transition-colors text-left flex items-start justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors">
                            <IconComp className="h-5 w-5 text-slate-600 group-hover:text-primary" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900">
                                {entry.label}
                              </span>
                              {count > 0 && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono tabular-nums">
                                  {count} Added
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 leading-snug">
                              {entry.description}
                            </p>
                          </div>
                        </div>
                        <span className="h-7 w-7 rounded-lg bg-slate-100 group-hover:bg-primary group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                          <Plus className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-slate-50 border-t flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs font-bold"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
