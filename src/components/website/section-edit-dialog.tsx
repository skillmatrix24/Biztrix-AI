"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_COMPARISON_ROWS,
  DEFAULT_FAQ_ITEMS,
  DEFAULT_HOW_IT_WORKS_STEPS,
  DEFAULT_PRICING_TIERS,
  DEFAULT_STACK_ITEMS,
  DEFAULT_TRUST_ITEMS,
  FunnelComparisonRow,
  FunnelHowItWorksStep,
  FunnelPricingTier,
  FunnelStackItem,
  StoreFaqItem,
  StoreSection,
  StoreSectionContent,
  StoreTrustItem,
} from "@/lib/storefront-engine";

interface SectionEditDialogProps {
  section: StoreSection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveSection: (
    id: string,
    patch: { label: string; content: StoreSectionContent }
  ) => void;
  products?: Array<{ id: string; name: string; price?: number; onlinePrice?: number }>;
}

export function SectionEditDialog({
  section,
  open,
  onOpenChange,
  onSaveSection,
  products = [],
}: SectionEditDialogProps) {
  const [label, setLabel] = useState("");
  const [content, setContent] = useState<StoreSectionContent>({});

  useEffect(() => {
    if (section && open) {
      setLabel(section.label || "");
      setContent({ ...(section.content || {}) });
    }
  }, [section, open]);

  if (!section) return null;

  const updateField = (key: keyof StoreSectionContent, value: any) => {
    setContent((prev) => ({ ...prev, [key]: value }));
  };

  const trustItems: StoreTrustItem[] =
    Array.isArray(content.trustItems) && content.trustItems.length > 0
      ? content.trustItems
      : DEFAULT_TRUST_ITEMS;

  const faqItems: StoreFaqItem[] =
    Array.isArray(content.faqs) && content.faqs.length > 0
      ? content.faqs
      : DEFAULT_FAQ_ITEMS;

  const painPoints: string[] =
    Array.isArray(content.painPoints) && content.painPoints.length > 0
      ? content.painPoints
      : [
          "Overpriced middleman markups & duplicate stock",
          "Slow shipping without real-time order updates",
          "Unclear warranty or unresponsive post-sale support",
        ];

  const solutionPoints: string[] =
    Array.isArray(content.solutionPoints) && content.solutionPoints.length > 0
      ? content.solutionPoints
      : [
          "100% genuine stock shipped direct from our store desk",
          "Same-day verification with live order tracking",
          "7-day replacement protection & instant WhatsApp help",
        ];

  const comparisonRows: FunnelComparisonRow[] =
    Array.isArray(content.comparisonRows) && content.comparisonRows.length > 0
      ? content.comparisonRows
      : DEFAULT_COMPARISON_ROWS;

  const steps: FunnelHowItWorksStep[] =
    Array.isArray(content.steps) && content.steps.length > 0
      ? content.steps
      : DEFAULT_HOW_IT_WORKS_STEPS;

  const stackItems: FunnelStackItem[] =
    Array.isArray(content.stackItems) && content.stackItems.length > 0
      ? content.stackItems
      : DEFAULT_STACK_ITEMS;

  const pricingTiers: FunnelPricingTier[] =
    Array.isArray(content.pricingTiers) && content.pricingTiers.length > 0
      ? content.pricingTiers
      : DEFAULT_PRICING_TIERS;

  const handleSave = () => {
    onSaveSection(section.id, {
      label: label.trim() || section.label,
      content,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl rounded-3xl p-0 overflow-hidden bg-white">
        <DialogHeader className="p-6 bg-slate-900 text-white text-left">
          <DialogTitle className="text-base font-black uppercase tracking-tight text-white">
            Edit Section: {section.label}
          </DialogTitle>
          <DialogDescription className="text-slate-300 text-xs">
            Customize heading, copy, and display options. Click Save Layout or Publish Store after updating.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4 text-left max-h-[65vh] overflow-y-auto">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground">
              Manager Label
            </Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-10 rounded-xl font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground">
              Section Heading
            </Label>
            <Input
              value={content.title || ""}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder={section.label}
              className="h-10 rounded-xl font-bold"
            />
          </div>

          {section.type === "hero" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Top Eyebrow Badge
                </Label>
                <Input
                  value={content.badgeText || ""}
                  onChange={(e) => updateField("badgeText", e.target.value)}
                  placeholder="Verified Merchant Catalog"
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Hero Subtitle
                </Label>
                <Textarea
                  value={content.subtitle || ""}
                  onChange={(e) => updateField("subtitle", e.target.value)}
                  className="min-h-[80px] rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Primary Button Label
                </Label>
                <Input
                  value={content.cta || ""}
                  onChange={(e) => updateField("cta", e.target.value)}
                  placeholder="Explore Catalog"
                  className="h-10 rounded-xl"
                />
              </div>
            </>
          )}

          {section.type === "timer" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Offer Badge Text
                </Label>
                <Input
                  value={content.discountLabel || ""}
                  onChange={(e) => updateField("discountLabel", e.target.value)}
                  placeholder="EXTRA SAVINGS LIVE"
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Offer Subtitle
                </Label>
                <Textarea
                  value={content.subtitle || ""}
                  onChange={(e) => updateField("subtitle", e.target.value)}
                  className="min-h-[70px] rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Button Label
                </Label>
                <Input
                  value={content.cta || ""}
                  onChange={(e) => updateField("cta", e.target.value)}
                  placeholder="Shop Deal Now"
                  className="h-10 rounded-xl"
                />
              </div>
            </>
          )}

          {(section.type === "featured" ||
            section.type === "products" ||
            section.type === "new_arrivals") && (
            <>
              {section.type === "new_arrivals" && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">
                    Section Subtitle
                  </Label>
                  <Input
                    value={content.subtitle || ""}
                    onChange={(e) => updateField("subtitle", e.target.value)}
                    placeholder="Just added to our online storefront inventory"
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">
                    Max Items Displayed
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={content.limit ?? (section.type === "products" ? 24 : 4)}
                    onChange={(e) =>
                      updateField("limit", Math.max(1, parseInt(e.target.value, 10) || 4))
                    }
                    className="h-10 rounded-xl font-bold"
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-50">
                  <Label className="text-[10px] font-black uppercase text-slate-700">
                    Show Prices
                  </Label>
                  <Switch
                    checked={content.showPricing !== false}
                    onCheckedChange={(checked) => updateField("showPricing", checked)}
                  />
                </div>
              </div>
              {section.type === "new_arrivals" && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">
                    Action Button Label
                  </Label>
                  <Input
                    value={content.cta || ""}
                    onChange={(e) => updateField("cta", e.target.value)}
                    placeholder="View Latest Catalog"
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
              )}
            </>
          )}

          {section.type === "categories" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Section Subtitle
                </Label>
                <Input
                  value={content.subtitle || ""}
                  onChange={(e) => updateField("subtitle", e.target.value)}
                  placeholder="Jump straight to what you need from our curated collections"
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Max Categories Shown
                </Label>
                <Input
                  type="number"
                  min={2}
                  max={12}
                  value={content.limit ?? 6}
                  onChange={(e) =>
                    updateField("limit", Math.max(2, Math.min(12, parseInt(e.target.value, 10) || 6)))
                  }
                  className="h-10 rounded-xl font-bold"
                />
              </div>
            </>
          )}

          {section.type === "trust_strip" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Section Subtitle
                </Label>
                <Input
                  value={content.subtitle || ""}
                  onChange={(e) => updateField("subtitle", e.target.value)}
                  placeholder="Verified merchant promises backed by our store desk"
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <Label className="text-[10px] font-black uppercase text-muted-foreground block">
                Trust & Value Pillars
              </Label>
              <div className="space-y-2.5">
                {trustItems.map((pillar, idx) => (
                  <div key={idx} className="p-3 rounded-xl border bg-slate-50 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        value={pillar.title}
                        onChange={(e) => {
                          const next = trustItems.map((item, i) =>
                            i === idx ? { ...item, title: e.target.value } : item
                          );
                          updateField("trustItems", next);
                        }}
                        placeholder="Pillar Title"
                        className="h-9 rounded-lg bg-white text-xs font-bold sm:col-span-2"
                      />
                      <Select
                        value={pillar.icon || "ShieldCheck"}
                        onValueChange={(v) => {
                          const next = trustItems.map((item, i) =>
                            i === idx ? { ...item, icon: v } : item
                          );
                          updateField("trustItems", next);
                        }}
                      >
                        <SelectTrigger className="h-9 rounded-lg bg-white text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Truck">Delivery</SelectItem>
                          <SelectItem value="ShieldCheck">Warranty / Return</SelectItem>
                          <SelectItem value="BadgeCheck">Authentic</SelectItem>
                          <SelectItem value="Banknote">Payments / COD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      value={pillar.subtitle}
                      onChange={(e) => {
                        const next = trustItems.map((item, i) =>
                          i === idx ? { ...item, subtitle: e.target.value } : item
                        );
                        updateField("trustItems", next);
                      }}
                      placeholder="Short supporting promise..."
                      className="h-8 rounded-lg bg-white text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {section.type === "offers" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Offers Subtitle
                </Label>
                <Textarea
                  value={content.subtitle || ""}
                  onChange={(e) => updateField("subtitle", e.target.value)}
                  className="min-h-[70px] rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Apply Button Label
                </Label>
                <Input
                  value={content.cta || ""}
                  onChange={(e) => updateField("cta", e.target.value)}
                  placeholder="Apply Code"
                  className="h-10 rounded-xl"
                />
              </div>
            </>
          )}

          {section.type === "media_showcase" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Eyebrow Badge
                </Label>
                <Input
                  value={content.badgeText || ""}
                  onChange={(e) => updateField("badgeText", e.target.value)}
                  placeholder="Product Spotlight"
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  YouTube Video URL or Showcase Image URL
                </Label>
                <Input
                  value={content.mediaUrl || ""}
                  onChange={(e) => updateField("mediaUrl", e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or https://.../demo.jpg"
                  className="h-10 rounded-xl font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Walkthrough Story Copy
                </Label>
                <Textarea
                  value={content.body || ""}
                  onChange={(e) => updateField("body", e.target.value)}
                  className="min-h-[90px] rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Button Label
                </Label>
                <Input
                  value={content.cta || ""}
                  onChange={(e) => updateField("cta", e.target.value)}
                  placeholder="Explore Featured Stock"
                  className="h-10 rounded-xl"
                />
              </div>
            </>
          )}

          {section.type === "faq" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  FAQ Subtitle
                </Label>
                <Input
                  value={content.subtitle || ""}
                  onChange={(e) => updateField("subtitle", e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Questions & Answers ({faqItems.length})
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateField("faqs", [
                      ...faqItems,
                      {
                        question: "Do you offer bulk or wholesale pricing?",
                        answer: "Yes, message us on WhatsApp with item quantities for a custom quote.",
                      },
                    ])
                  }
                  className="h-7 px-2.5 rounded-lg text-[10px] font-black uppercase gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Question
                </Button>
              </div>
              <div className="space-y-2.5">
                {faqItems.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl border bg-slate-50 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={item.question}
                        onChange={(e) => {
                          const next = faqItems.map((f, i) =>
                            i === idx ? { ...f, question: e.target.value } : f
                          );
                          updateField("faqs", next);
                        }}
                        placeholder="Question..."
                        className="h-9 rounded-lg bg-white text-xs font-bold flex-1"
                      />
                      {faqItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove FAQ ${idx + 1}`}
                          onClick={() =>
                            updateField(
                              "faqs",
                              faqItems.filter((_, i) => i !== idx)
                            )
                          }
                          className="h-8 w-8 text-rose-500 hover:bg-rose-50 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <Textarea
                      value={item.answer}
                      onChange={(e) => {
                        const next = faqItems.map((f, i) =>
                          i === idx ? { ...f, answer: e.target.value } : f
                        );
                        updateField("faqs", next);
                      }}
                      placeholder="Clear answer..."
                      className="min-h-[60px] rounded-lg bg-white text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {section.type === "store_location" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Subtitle
                </Label>
                <Input
                  value={content.subtitle || ""}
                  onChange={(e) => updateField("subtitle", e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Delivery Zones & Dispatch Coverage
                </Label>
                <Input
                  value={content.deliveryZones || ""}
                  onChange={(e) => updateField("deliveryZones", e.target.value)}
                  placeholder="Local Same-Day Delivery · Pan-India Insured Dispatch"
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Pickup / Storefront Landmark Note
                </Label>
                <Textarea
                  value={content.body || ""}
                  onChange={(e) => updateField("body", e.target.value)}
                  className="min-h-[70px] rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Google Maps Link (Optional)
                </Label>
                <Input
                  value={content.mapUrl || ""}
                  onChange={(e) => updateField("mapUrl", e.target.value)}
                  placeholder="https://maps.google.com/?q=..."
                  className="h-10 rounded-xl font-mono text-xs"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-50">
                <Label className="text-[10px] font-black uppercase text-slate-700">
                  Self-Pickup Available at Counter
                </Label>
                <Switch
                  checked={content.pickupEnabled !== false}
                  onCheckedChange={(checked) => updateField("pickupEnabled", checked)}
                />
              </div>
            </>
          )}

          {section.type === "newsletter" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Alert Badge Text
                </Label>
                <Input
                  value={content.discountLabel || ""}
                  onChange={(e) => updateField("discountLabel", e.target.value)}
                  placeholder="VIP RESTOCK & OFFER ALERTS"
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Opt-in Subtitle
                </Label>
                <Textarea
                  value={content.subtitle || ""}
                  onChange={(e) => updateField("subtitle", e.target.value)}
                  className="min-h-[70px] rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Submit Button Label
                </Label>
                <Input
                  value={content.cta || ""}
                  onChange={(e) => updateField("cta", e.target.value)}
                  placeholder="Notify Me"
                  className="h-10 rounded-xl"
                />
              </div>
            </>
          )}

          {section.type === "about" && (
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">
                Brand Story Copy
              </Label>
              <Textarea
                value={content.body || ""}
                onChange={(e) => updateField("body", e.target.value)}
                className="min-h-[110px] rounded-xl text-xs"
              />
            </div>
          )}

          {(section.type === "testimonials" ||
            section.type === "contact" ||
            section.type === "whatsapp") && (
            <>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Subtitle / Support Copy
                </Label>
                <Textarea
                  value={content.subtitle || ""}
                  onChange={(e) => updateField("subtitle", e.target.value)}
                  className="min-h-[80px] rounded-xl text-xs"
                />
              </div>
              {section.type === "whatsapp" && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">
                    Button Label
                  </Label>
                  <Input
                    value={content.cta || ""}
                    onChange={(e) => updateField("cta", e.target.value)}
                    placeholder="Chat on WhatsApp"
                    className="h-10 rounded-xl"
                  />
                </div>
              )}
            </>
          )}

          {section.type === "problem_solution" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Subtitle
                </Label>
                <Input
                  value={content.subtitle || ""}
                  onChange={(e) => updateField("subtitle", e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border bg-rose-50/50 space-y-2">
                  <Label className="text-[10px] font-black uppercase text-rose-700">
                    Pain Column Heading
                  </Label>
                  <Input
                    value={content.painTitle || ""}
                    onChange={(e) => updateField("painTitle", e.target.value)}
                    placeholder="Common Market Frustrations"
                    className="h-9 rounded-lg bg-white text-xs font-bold"
                  />
                  <Label className="text-[9px] font-bold uppercase text-rose-600 block">
                    Pain Points (one per line)
                  </Label>
                  <Textarea
                    value={painPoints.join("\n")}
                    onChange={(e) =>
                      updateField(
                        "painPoints",
                        e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    className="min-h-[90px] rounded-lg bg-white text-xs"
                  />
                </div>
                <div className="p-3 rounded-xl border bg-emerald-50/50 space-y-2">
                  <Label className="text-[10px] font-black uppercase text-emerald-700">
                    Solution Column Heading
                  </Label>
                  <Input
                    value={content.solutionTitle || ""}
                    onChange={(e) => updateField("solutionTitle", e.target.value)}
                    placeholder="Our Verified Advantage"
                    className="h-9 rounded-lg bg-white text-xs font-bold"
                  />
                  <Label className="text-[9px] font-bold uppercase text-emerald-600 block">
                    Solution Points (one per line)
                  </Label>
                  <Textarea
                    value={solutionPoints.join("\n")}
                    onChange={(e) =>
                      updateField(
                        "solutionPoints",
                        e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    className="min-h-[90px] rounded-lg bg-white text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {section.type === "comparison_table" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">
                    Our Column Label
                  </Label>
                  <Input
                    value={content.usLabel || ""}
                    onChange={(e) => updateField("usLabel", e.target.value)}
                    placeholder="Our Official Store"
                    className="h-9 rounded-xl text-xs font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">
                    Others Column Label
                  </Label>
                  <Input
                    value={content.othersLabel || ""}
                    onChange={(e) => updateField("othersLabel", e.target.value)}
                    placeholder="Generic Marketplaces"
                    className="h-9 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Comparison Rows ({comparisonRows.length})
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateField("comparisonRows", [
                      ...comparisonRows,
                      { feature: "Direct Warranty & Priority Dispatch", us: true, others: false },
                    ])
                  }
                  className="h-7 px-2.5 rounded-lg text-[10px] font-black uppercase gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Row
                </Button>
              </div>
              <div className="space-y-2">
                {comparisonRows.map((row, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl border bg-slate-50 flex items-center gap-2">
                    <Input
                      value={row.feature}
                      onChange={(e) => {
                        const next = comparisonRows.map((r, i) =>
                          i === idx ? { ...r, feature: e.target.value } : r
                        );
                        updateField("comparisonRows", next);
                      }}
                      className="h-8 rounded-lg bg-white text-xs flex-1"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] font-bold uppercase text-emerald-700">Us</span>
                      <Switch
                        checked={row.us}
                        onCheckedChange={(v) => {
                          const next = comparisonRows.map((r, i) =>
                            i === idx ? { ...r, us: v } : r
                          );
                          updateField("comparisonRows", next);
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] font-bold uppercase text-slate-500">Others</span>
                      <Switch
                        checked={row.others}
                        onCheckedChange={(v) => {
                          const next = comparisonRows.map((r, i) =>
                            i === idx ? { ...r, others: v } : r
                          );
                          updateField("comparisonRows", next);
                        }}
                      />
                    </div>
                    {comparisonRows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          updateField(
                            "comparisonRows",
                            comparisonRows.filter((_, i) => i !== idx)
                          )
                        }
                        className="h-7 w-7 text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {section.type === "how_it_works" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Subtitle
                </Label>
                <Input
                  value={content.subtitle || ""}
                  onChange={(e) => updateField("subtitle", e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <Label className="text-[10px] font-black uppercase text-muted-foreground block">
                Steps ({steps.length})
              </Label>
              <div className="space-y-2.5">
                {steps.map((st, idx) => (
                  <div key={idx} className="p-3 rounded-xl border bg-slate-50 space-y-2">
                    <div className="grid grid-cols-4 gap-2">
                      <Input
                        value={st.stepNumber}
                        onChange={(e) => {
                          const next = steps.map((item, i) =>
                            i === idx ? { ...item, stepNumber: e.target.value } : item
                          );
                          updateField("steps", next);
                        }}
                        placeholder="01"
                        className="h-8 rounded-lg bg-white text-xs font-mono font-bold"
                      />
                      <Input
                        value={st.title}
                        onChange={(e) => {
                          const next = steps.map((item, i) =>
                            i === idx ? { ...item, title: e.target.value } : item
                          );
                          updateField("steps", next);
                        }}
                        placeholder="Step Title"
                        className="h-8 rounded-lg bg-white text-xs font-bold col-span-3"
                      />
                    </div>
                    <Input
                      value={st.description}
                      onChange={(e) => {
                        const next = steps.map((item, i) =>
                          i === idx ? { ...item, description: e.target.value } : item
                        );
                        updateField("steps", next);
                      }}
                      placeholder="Short explanation..."
                      className="h-8 rounded-lg bg-white text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {section.type === "offer_stack" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">
                    Total Anchor Value (₹)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={content.regularPrice ?? 2996}
                    onChange={(e) =>
                      updateField("regularPrice", Math.max(0, Number(e.target.value) || 0))
                    }
                    className="h-9 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">
                    Today&apos;s Funnel Offer Price (₹)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={content.offerPrice ?? 999}
                    onChange={(e) =>
                      updateField("offerPrice", Math.max(0, Number(e.target.value) || 0))
                    }
                    className="h-9 rounded-xl font-bold"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Included Value Items ({stackItems.length})
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateField("stackItems", [
                      ...stackItems,
                      { title: "Bonus Accessory / Priority Warranty", value: 299 },
                    ])
                  }
                  className="h-7 px-2.5 rounded-lg text-[10px] font-black uppercase gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {stackItems.map((it, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl border bg-slate-50 flex items-center gap-2">
                    <Input
                      value={it.title}
                      onChange={(e) => {
                        const next = stackItems.map((s, i) =>
                          i === idx ? { ...s, title: e.target.value } : s
                        );
                        updateField("stackItems", next);
                      }}
                      className="h-8 rounded-lg bg-white text-xs flex-1"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={it.value}
                      onChange={(e) => {
                        const next = stackItems.map((s, i) =>
                          i === idx ? { ...s, value: Math.max(0, Number(e.target.value) || 0) } : s
                        );
                        updateField("stackItems", next);
                      }}
                      className="h-8 w-24 rounded-lg bg-white text-xs font-bold"
                    />
                    {stackItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          updateField(
                            "stackItems",
                            stackItems.filter((_, i) => i !== idx)
                          )
                        }
                        className="h-7 w-7 text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Action CTA Button Label
                </Label>
                <Input
                  value={content.cta || ""}
                  onChange={(e) => updateField("cta", e.target.value)}
                  placeholder="Claim This Bundle Now"
                  className="h-9 rounded-xl text-xs font-bold"
                />
              </div>
            </div>
          )}

          {section.type === "pricing_tiers" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Subtitle
                </Label>
                <Input
                  value={content.subtitle || ""}
                  onChange={(e) => updateField("subtitle", e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>
              <Label className="text-[10px] font-black uppercase text-muted-foreground block">
                Package Tiers ({pricingTiers.length})
              </Label>
              <div className="space-y-3">
                {pricingTiers.map((tier, idx) => (
                  <div key={tier.id || idx} className="p-3 rounded-xl border bg-slate-50 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        value={tier.name}
                        onChange={(e) => {
                          const next = pricingTiers.map((t, i) =>
                            i === idx ? { ...t, name: e.target.value } : t
                          );
                          updateField("pricingTiers", next);
                        }}
                        placeholder="Pack Name"
                        className="h-8 rounded-lg bg-white text-xs font-bold sm:col-span-2"
                      />
                      <Input
                        value={tier.badge || ""}
                        onChange={(e) => {
                          const next = pricingTiers.map((t, i) =>
                            i === idx ? { ...t, badge: e.target.value } : t
                          );
                          updateField("pricingTiers", next);
                        }}
                        placeholder="Badge e.g. BEST VALUE"
                        className="h-8 rounded-lg bg-white text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">Price (₹)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={tier.price}
                          onChange={(e) => {
                            const next = pricingTiers.map((t, i) =>
                              i === idx ? { ...t, price: Math.max(0, Number(e.target.value) || 0) } : t
                            );
                            updateField("pricingTiers", next);
                          }}
                          className="h-8 rounded-lg bg-white text-xs font-bold"
                        />
                      </div>
                      <div>
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">MRP (₹)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={tier.compareAtPrice ?? ""}
                          onChange={(e) => {
                            const next = pricingTiers.map((t, i) =>
                              i === idx ? { ...t, compareAtPrice: Math.max(0, Number(e.target.value) || 0) } : t
                            );
                            updateField("pricingTiers", next);
                          }}
                          className="h-8 rounded-lg bg-white text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">Qty Multiplier</Label>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={tier.quantityMultiplier ?? 1}
                          onChange={(e) => {
                            const next = pricingTiers.map((t, i) =>
                              i === idx ? { ...t, quantityMultiplier: Math.max(1, parseInt(e.target.value, 10) || 1) } : t
                            );
                            updateField("pricingTiers", next);
                          }}
                          className="h-8 rounded-lg bg-white text-xs font-bold"
                        />
                      </div>
                    </div>
                    <Input
                      value={tier.cta}
                      onChange={(e) => {
                        const next = pricingTiers.map((t, i) =>
                          i === idx ? { ...t, cta: e.target.value } : t
                        );
                        updateField("pricingTiers", next);
                      }}
                      placeholder="CTA Button Label"
                      className="h-8 rounded-lg bg-white text-xs font-bold"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {section.type === "guarantee_seal" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">
                    Badge / Seal Label
                  </Label>
                  <Input
                    value={content.badgeText || ""}
                    onChange={(e) => updateField("badgeText", e.target.value)}
                    placeholder="100% VERIFIED BUYER PROTECTION"
                    className="h-9 rounded-xl text-xs font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">
                    Guarantee Days
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={content.guaranteeDays ?? 7}
                    onChange={(e) =>
                      updateField("guaranteeDays", Math.max(1, parseInt(e.target.value, 10) || 7))
                    }
                    className="h-9 rounded-xl font-bold"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Guarantee Promise Copy
                </Label>
                <Textarea
                  value={content.body || content.subtitle || ""}
                  onChange={(e) => updateField("body", e.target.value)}
                  className="min-h-[80px] rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          {section.type === "express_checkout" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Checkout Subtitle
                </Label>
                <Input
                  value={content.subtitle || ""}
                  onChange={(e) => updateField("subtitle", e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Confirm Order CTA Label
                </Label>
                <Input
                  value={content.cta || ""}
                  onChange={(e) => updateField("cta", e.target.value)}
                  placeholder="Confirm My Order Now"
                  className="h-9 rounded-xl text-xs font-bold"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border bg-amber-50/70">
                <div>
                  <Label className="text-[10px] font-black uppercase text-amber-900">
                    Enable 1-Click Order Bump
                  </Label>
                  <p className="text-[10px] text-amber-800/80">
                    Show an optional add-on checkbox inside checkout to boost Average Order Value
                  </p>
                </div>
                <Switch
                  checked={content.orderBumpEnabled !== false}
                  onCheckedChange={(v) => updateField("orderBumpEnabled", v)}
                />
              </div>
              {content.orderBumpEnabled !== false && (
                <div className="p-3 rounded-xl border bg-slate-50 space-y-2.5">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground">
                      Order Bump Headline
                    </Label>
                    <Input
                      value={content.orderBumpTitle || ""}
                      onChange={(e) => updateField("orderBumpTitle", e.target.value)}
                      placeholder="YES! Add Priority Care & Express Add-On"
                      className="h-8 rounded-lg bg-white text-xs font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground">
                        Bump Add-On Price (₹)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={content.orderBumpPrice ?? 199}
                        onChange={(e) =>
                          updateField("orderBumpPrice", Math.max(0, Number(e.target.value) || 0))
                        }
                        className="h-8 rounded-lg bg-white text-xs font-bold"
                      />
                    </div>
                    {products.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground">
                          Linked Catalog Add-On Product
                        </Label>
                        <Select
                          value={content.orderBumpProductId || "none"}
                          onValueChange={(v) => updateField("orderBumpProductId", v === "none" ? "" : v)}
                        >
                          <SelectTrigger className="h-8 rounded-lg bg-white text-xs">
                            <SelectValue placeholder="Optional product" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Use Custom Bump Offer</SelectItem>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} (₹{p.onlinePrice ?? p.price ?? 0})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground">
                      Order Bump Short Pitch
                    </Label>
                    <Input
                      value={content.orderBumpDescription || ""}
                      onChange={(e) => updateField("orderBumpDescription", e.target.value)}
                      className="h-8 rounded-lg bg-white text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-5 bg-slate-50 border-t gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl text-xs font-bold">
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} className="rounded-xl text-xs font-black uppercase bg-primary text-white">
            Apply Section Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

