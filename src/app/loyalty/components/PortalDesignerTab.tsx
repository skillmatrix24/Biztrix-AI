"use client";

import React, { useState, useEffect } from "react";
import {
  Palette,
  Upload,
  Type,
  Maximize2,
  SmartphoneNfc,
  PlusCircle,
  X,
  Building,
  Info,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/editorial";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const FONT_OPTIONS = [
  { id: "Mukta", label: "Mukta (Default)" },
  { id: "Poppins", label: "Poppins" },
  { id: "Inter", label: "Inter" },
  { id: "Roboto", label: "Roboto" },
  { id: "Montserrat", label: "Montserrat" },
];

const HighlightedText = ({ text, highlight, color, isGradient, gradientEnd }: any) => {
  if (!highlight || !text || !highlight.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${highlight})`, "gi"));
  const highlightStyle: React.CSSProperties = isGradient
    ? {
        backgroundImage: `linear-gradient(to right, ${color || "#0C83B3"}, ${gradientEnd || "#2DD4BF"})`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        display: "inline-block",
      }
    : { color: color || "inherit" };
  return (
    <>
      {parts.map((part: string, i: number) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} style={highlightStyle} className="font-bold">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

export function PortalDesignerTab({ config, onUpdate, updateLocal, logoRef, isJoin = false, isAdmin, business }: any) {
  const fontsToLoad = Array.from(new Set([config?.titleFont || "Mukta", config?.descriptionFont || "Mukta"]));
  const fontUrl = `https://fonts.googleapis.com/css2?family=${fontsToLoad
    .map((f) => f.replace(" ", "+"))
    .join(":wght@400;700;900&family=")}:wght@400;500;700&display=swap`;

  const [localColors, setLocalColors] = useState({
    titleColor: config?.titleHighlightColor || "#0C83B3",
    titleEnd: config?.titleGradientEnd || "#2DD4BF",
    descColor: config?.descriptionHighlightColor || "#0C83B3",
    descEnd: config?.descriptionGradientEnd || "#2DD4BF",
  });

  useEffect(() => {
    setLocalColors({
      titleColor: config?.titleHighlightColor || "#0C83B3",
      titleEnd: config?.titleGradientEnd || "#2DD4BF",
      descColor: config?.descriptionHighlightColor || "#0C83B3",
      descEnd: config?.descriptionGradientEnd || "#2DD4BF",
    });
  }, [config]);

  const handleAddCustomButton = () => {
    const currentButtons = config?.customButtons || [];
    onUpdate({ customButtons: [...currentButtons, { label: "New Button", url: "" }] });
    toast({ title: "New Button Added" });
  };

  const handleRemoveCustomButton = (index: number) => {
    const currentButtons = config?.customButtons || [];
    onUpdate({ customButtons: currentButtons.filter((_: any, i: number) => i !== index) });
    toast({ title: "Button Removed" });
  };

  const handleUpdateCustomButton = (index: number, key: string, value: string) => {
    const currentButtons = [...(config?.customButtons || [])];
    currentButtons[index] = { ...currentButtons[index], [key]: value };
    onUpdate({ customButtons: currentButtons });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast({ variant: "destructive", title: "File too large", description: "Logo must be under 500KB." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate({ logoUrl: reader.result as string });
        toast({ title: "Portal Logo Uploaded" });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <link rel="stylesheet" href={fontUrl} />
      <div className="xl:col-span-8 space-y-6">
        <SectionCard
          title={isJoin ? "Join Portal Branding & Style" : "Tracking Page Branding & Style"}
          description="Customize typography, logo, social links, custom CTAs, and store contact details."
        >
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2 text-left">
                <Label className="text-xs font-semibold text-slate-700">Portal Hero Logo</Label>
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => isAdmin && logoRef.current?.click()}
                  className={cn(
                    "w-full h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors overflow-hidden",
                    config?.logoUrl
                      ? "border-slate-300 bg-slate-50 p-0"
                      : "border-slate-200 bg-slate-50 hover:border-slate-400",
                    !isAdmin && "cursor-not-allowed opacity-60"
                  )}
                >
                  {config?.logoUrl ? (
                    <img src={config.logoUrl} referrerPolicy="no-referrer" className="h-full w-full object-cover" alt="Portal Logo" />
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-slate-500" />
                      <span className="text-xs font-medium text-slate-600">Upload PNG or SVG logo</span>
                    </>
                  )}
                </button>
                <input type="file" ref={logoRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </div>

              <div className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Main Heading</Label>
                  <Input
                    defaultValue={config?.title || ""}
                    onBlur={(e) => onUpdate({ title: e.target.value })}
                    placeholder="e.g. Unlock Exclusive Privilege"
                    className="h-10 rounded-xl font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Hero Description</Label>
                  <Textarea
                    defaultValue={config?.description || ""}
                    onBlur={(e) => onUpdate({ description: e.target.value })}
                    className="min-h-[90px] rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-5 p-5 bg-slate-50 rounded-2xl border border-slate-200 text-left">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Type className="h-3.5 w-3.5" /> Heading Font
                    </Label>
                    <Select value={config?.titleFont || "Mukta"} onValueChange={(v) => updateLocal({ titleFont: v }, true)}>
                      <SelectTrigger className="h-10 rounded-xl bg-white text-xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {FONT_OPTIONS.map((f) => (
                          <SelectItem key={f.id} value={f.id} className="text-xs">
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Maximize2 className="h-3.5 w-3.5" /> Size
                    </Label>
                    <div className="flex items-center gap-2.5 h-10">
                      <Slider
                        value={[config?.titleFontSize || 32]}
                        max={80}
                        min={20}
                        step={1}
                        onValueChange={(v) => updateLocal({ titleFontSize: v[0] })}
                        onValueCommit={(v) => {
                          updateLocal({ titleFontSize: v[0] });
                          onUpdate({ titleFontSize: v[0] });
                        }}
                        className="flex-1"
                      />
                      <span className="text-xs font-mono tabular-nums font-bold w-7 text-right">
                        {config?.titleFontSize || 32}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700">Title Word Highlight</Label>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="title-grad-toggle" className="text-xs text-slate-500 cursor-pointer">Gradient</Label>
                      <Switch
                        id="title-grad-toggle"
                        checked={config?.titleHighlightGradient || false}
                        onCheckedChange={(v) => updateLocal({ titleHighlightGradient: v }, true)}
                      />
                    </div>
                  </div>
                  <Input
                    defaultValue={config?.titleHighlightWord || ""}
                    onBlur={(e) => onUpdate({ titleHighlightWord: e.target.value })}
                    placeholder="Word to highlight..."
                    className="h-9 rounded-xl bg-white text-xs"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-500">
                        {config?.titleHighlightGradient ? "Start Color" : "Color"}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={localColors.titleColor}
                          onChange={(e) => setLocalColors({ ...localColors, titleColor: e.target.value })}
                          onBlur={(e) => onUpdate({ titleHighlightColor: e.target.value })}
                          className="h-8 w-8 p-0.5 rounded-lg"
                        />
                        <Input
                          value={localColors.titleColor}
                          onChange={(e) => setLocalColors({ ...localColors, titleColor: e.target.value })}
                          onBlur={(e) => onUpdate({ titleHighlightColor: e.target.value })}
                          className="h-8 flex-1 rounded-lg text-xs font-mono bg-white"
                        />
                      </div>
                    </div>
                    {config?.titleHighlightGradient && (
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">End Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={localColors.titleEnd}
                            onChange={(e) => setLocalColors({ ...localColors, titleEnd: e.target.value })}
                            onBlur={(e) => onUpdate({ titleGradientEnd: e.target.value })}
                            className="h-8 w-8 p-0.5 rounded-lg"
                          />
                          <Input
                            value={localColors.titleEnd}
                            onChange={(e) => setLocalColors({ ...localColors, titleEnd: e.target.value })}
                            onBlur={(e) => onUpdate({ titleGradientEnd: e.target.value })}
                            className="h-8 flex-1 rounded-lg text-xs font-mono bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-5 bg-slate-50 rounded-2xl border border-slate-200 text-left">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Type className="h-3.5 w-3.5" /> Body Font
                    </Label>
                    <Select
                      value={config?.descriptionFont || "Mukta"}
                      onValueChange={(v) => updateLocal({ descriptionFont: v }, true)}
                    >
                      <SelectTrigger className="h-10 rounded-xl bg-white text-xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {FONT_OPTIONS.map((f) => (
                          <SelectItem key={f.id} value={f.id} className="text-xs">
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Maximize2 className="h-3.5 w-3.5" /> Size
                    </Label>
                    <div className="flex items-center gap-2.5 h-10">
                      <Slider
                        value={[config?.descriptionFontSize || 16]}
                        max={40}
                        min={12}
                        step={1}
                        onValueChange={(v) => updateLocal({ descriptionFontSize: v[0] })}
                        onValueCommit={(v) => {
                          updateLocal({ descriptionFontSize: v[0] });
                          onUpdate({ descriptionFontSize: v[0] });
                        }}
                        className="flex-1"
                      />
                      <span className="text-xs font-mono tabular-nums font-bold w-7 text-right">
                        {config?.descriptionFontSize || 16}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700">Body Word Highlight</Label>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="desc-grad-toggle" className="text-xs text-slate-500 cursor-pointer">Gradient</Label>
                      <Switch
                        id="desc-grad-toggle"
                        checked={config?.descriptionHighlightGradient || false}
                        onCheckedChange={(v) => updateLocal({ descriptionHighlightGradient: v }, true)}
                      />
                    </div>
                  </div>
                  <Input
                    defaultValue={config?.descriptionHighlightWord || ""}
                    onBlur={(e) => onUpdate({ descriptionHighlightWord: e.target.value })}
                    placeholder="Word to highlight..."
                    className="h-9 rounded-xl bg-white text-xs"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-500">
                        {config?.descriptionHighlightGradient ? "Start Color" : "Color"}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={localColors.descColor || "#0C83B3"}
                          onChange={(e) => setLocalColors({ ...localColors, descColor: e.target.value })}
                          onBlur={(e) => onUpdate({ descriptionHighlightColor: e.target.value })}
                          className="h-8 w-8 p-0.5 rounded-lg"
                        />
                        <Input
                          value={localColors.descColor || "#0C83B3"}
                          onChange={(e) => setLocalColors({ ...localColors, descColor: e.target.value })}
                          onBlur={(e) => onUpdate({ descriptionHighlightColor: e.target.value })}
                          className="h-8 flex-1 rounded-lg text-xs font-mono bg-white"
                        />
                      </div>
                    </div>
                    {config?.descriptionHighlightGradient && (
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">End Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={localColors.descEnd || "#2DD4BF"}
                            onChange={(e) => setLocalColors({ ...localColors, descEnd: e.target.value })}
                            onBlur={(e) => onUpdate({ descriptionGradientEnd: e.target.value })}
                            className="h-8 w-8 p-0.5 rounded-lg"
                          />
                          <Input
                            value={localColors.descEnd || "#2DD4BF"}
                            onChange={(e) => setLocalColors({ ...localColors, descEnd: e.target.value })}
                            onBlur={(e) => onUpdate({ descriptionGradientEnd: e.target.value })}
                            className="h-8 flex-1 rounded-lg text-xs font-mono bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4 text-left">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <SmartphoneNfc className="h-4 w-4 text-slate-700" /> Social & Direct Support
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">WhatsApp Support Number</Label>
                  <Input
                    defaultValue={config?.supportWhatsapp || ""}
                    onBlur={(e) => onUpdate({ supportWhatsapp: e.target.value.replace(/\D/g, "") })}
                    placeholder="91XXXXXXXXXX"
                    className="h-10 rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Instagram URL</Label>
                  <Input
                    defaultValue={config?.instagramUrl || ""}
                    onBlur={(e) => onUpdate({ instagramUrl: e.target.value })}
                    placeholder="https://..."
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Facebook URL</Label>
                  <Input
                    defaultValue={config?.facebookUrl || ""}
                    onBlur={(e) => onUpdate({ facebookUrl: e.target.value })}
                    placeholder="https://..."
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">YouTube URL</Label>
                  <Input
                    defaultValue={config?.youtubeUrl || ""}
                    onBlur={(e) => onUpdate({ youtubeUrl: e.target.value })}
                    placeholder="https://..."
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4 text-left">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PlusCircle className="h-4 w-4 text-slate-700" /> Custom Action Buttons
                </h4>
                <Button type="button" variant="outline" size="sm" onClick={handleAddCustomButton} className="h-8 rounded-lg text-xs font-semibold">
                  Add Button
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(config?.customButtons || []).map((btn: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 relative">
                    <Input
                      placeholder="Label"
                      value={btn.label || ""}
                      onChange={(e) => handleUpdateCustomButton(idx, "label", e.target.value)}
                      className="h-9 rounded-lg bg-white text-xs font-medium pr-8"
                    />
                    <Input
                      placeholder="https://..."
                      value={btn.url || ""}
                      onChange={(e) => handleUpdateCustomButton(idx, "url", e.target.value)}
                      className="h-9 rounded-lg bg-white text-xs font-mono"
                    />
                    <button
                      type="button"
                      aria-label={`Remove button ${btn.label || idx + 1}`}
                      onClick={() => handleRemoveCustomButton(idx)}
                      className="absolute top-2.5 right-2.5 h-6 w-6 bg-white rounded-md border border-slate-200 text-rose-600 flex items-center justify-center hover:bg-rose-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-4 text-left">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building className="h-4 w-4 text-slate-700" /> Location & Contact Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Store Name</Label>
                  <Input
                    defaultValue={config?.storeName || business?.name || ""}
                    onBlur={(e) => onUpdate({ storeName: e.target.value })}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Store Phone</Label>
                  <Input
                    defaultValue={config?.storePhone || ""}
                    onBlur={(e) => onUpdate({ storePhone: e.target.value })}
                    className="h-10 rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Store Email</Label>
                  <Input
                    defaultValue={config?.storeEmail || ""}
                    onBlur={(e) => onUpdate({ storeEmail: e.target.value })}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Store Address</Label>
                  <Textarea
                    defaultValue={config?.storeAddress || ""}
                    onBlur={(e) => onUpdate({ storeAddress: e.target.value })}
                    className="h-20 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-left">
              <Label className="text-xs font-semibold text-slate-700">Program Guidelines (one per line)</Label>
              <Textarea
                defaultValue={config?.rules || ""}
                onBlur={(e) => onUpdate({ rules: e.target.value })}
                placeholder="Point 1&#10;Point 2&#10;Point 3"
                className="min-h-[140px] rounded-xl text-xs leading-relaxed"
              />
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="xl:col-span-4 xl:sticky xl:top-24">
        <div className="p-6 bg-slate-900 rounded-2xl text-white space-y-5 border border-slate-800 text-left">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Palette className="h-4 w-4 text-emerald-400" />
            <span>{isJoin ? "Join Portal Preview" : "Tracking Page Preview"}</span>
          </div>

          <div className="p-5 bg-white rounded-xl space-y-4 text-left">
            <div className="text-center space-y-3">
              <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 mx-auto overflow-hidden border border-slate-200">
                {config?.logoUrl ? (
                  <img src={config.logoUrl} referrerPolicy="no-referrer" className="h-full w-full object-cover" alt="Logo preview" />
                ) : (
                  <Building className="h-5 w-5" />
                )}
              </div>
              <h5
                className="text-slate-900 leading-tight font-bold"
                style={{ fontFamily: config?.titleFont || "Mukta", fontSize: `${(config?.titleFontSize || 32) * 0.45}px` }}
              >
                <HighlightedText
                  text={config?.title || "Unlock Exclusive Rewards"}
                  highlight={config?.titleHighlightWord}
                  color={config?.titleHighlightColor}
                  isGradient={config?.titleHighlightGradient}
                  gradientEnd={config?.titleGradientEnd}
                />
              </h5>
              <p
                className="text-slate-500 leading-snug"
                style={{
                  fontFamily: config?.descriptionFont || "Mukta",
                  fontSize: `${(config?.descriptionFontSize || 16) * 0.72}px`,
                }}
              >
                <HighlightedText
                  text={config?.description || "Earn points, unlock member offers, and track every visit."}
                  highlight={config?.descriptionHighlightWord}
                  color={config?.descriptionHighlightColor}
                  isGradient={config?.descriptionHighlightGradient}
                  gradientEnd={config?.descriptionGradientEnd}
                />
              </p>
            </div>
            {(config?.customButtons || []).length > 0 && (
              <>
                <Separator />
                <div className="flex gap-2">
                  {(config?.customButtons || []).slice(0, 2).map((btn: any, i: number) => (
                    <div
                      key={i}
                      className="flex-1 h-8 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-semibold flex items-center justify-center border border-slate-200 truncate px-2"
                    >
                      {btn.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-start gap-3">
            <Info className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 leading-relaxed">
              Live portal visitors see full typography weights and highlight gradients configured above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
