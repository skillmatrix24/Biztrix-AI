
"use client";

import React, { useState, useEffect } from "react";
import { 
  Palette, Upload, Type, Maximize2, SmartphoneNfc, 
  PlusCircle, X, Building, Info, ShieldCheck, Globe, ChevronRight 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const FONT_OPTIONS = [
  { id: 'Mukta', label: 'Mukta (Default)' },
  { id: 'Poppins', label: 'Poppins' },
  { id: 'Inter', label: 'Inter' },
  { id: 'Roboto', label: 'Roboto' },
  { id: 'Montserrat', label: 'Montserrat' },
];

const HighlightedText = ({ text, highlight, color, isGradient, gradientEnd }: any) => {
  if (!highlight || !text || !highlight.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  const highlightStyle: React.CSSProperties = isGradient ? {
    backgroundImage: `linear-gradient(to right, ${color || '#0C83B3'}, ${gradientEnd || '#2DD4BF'})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'inline-block'
  } : { color: color || 'inherit' };
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} style={highlightStyle} className="font-black">{part}</span>
        ) : part
      )}
    </>
  );
};

export function PortalDesignerTab({ config, onUpdate, updateLocal, logoRef, isJoin = false, isAdmin, business }: any) {
  const fontsToLoad = Array.from(new Set([config?.titleFont || 'Mukta', config?.descriptionFont || 'Mukta']));
  const fontUrl = `https://fonts.googleapis.com/css2?family=${fontsToLoad.map(f => f.replace(' ', '+')).join(':wght@400;700;900&family=')}:wght@400;500;700&display=swap`;

  const [localColors, setLocalColors] = useState({
    titleColor: config?.titleHighlightColor || '#0C83B3',
    titleEnd: config?.titleGradientEnd || '#2DD4BF',
    descColor: config?.descriptionHighlightColor || '#0C83B3',
    descEnd: config?.descriptionGradientEnd || '#2DD4BF'
  });

  useEffect(() => {
    setLocalColors({
      titleColor: config?.titleHighlightColor || '#0C83B3',
      titleEnd: config?.titleGradientEnd || '#2DD4BF',
      descColor: config?.descriptionHighlightColor || '#0C83B3',
      descEnd: config?.descriptionGradientEnd || '#2DD4BF'
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
      reader.onloadend = () => { onUpdate({ logoUrl: reader.result as string }); toast({ title: "Portal Logo Uploaded" }); };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start animate-in fade-in">
      <link rel="stylesheet" href={fontUrl} />
      <div className="xl:col-span-8 space-y-8">
        <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden border">
          <CardHeader className={cn("border-b py-6 px-8", isJoin ? "bg-green-50" : "bg-primary/5")}>
            <CardTitle className={cn("text-xs font-black uppercase tracking-widest flex items-center gap-2", isJoin ? "text-green-700" : "text-primary")}>
              <Palette className="h-4 w-4" /> {isJoin ? 'Join Portal Branding & Style' : 'Tracking Page Branding & Style'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <Card className="border p-6 rounded-[2rem] bg-muted/5 text-left">
                <div className="space-y-4 text-left">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Portal Hero Logo</Label>
                  <div 
                    onClick={() => isAdmin && logoRef.current?.click()}
                    className={cn(
                      "h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group",
                      config?.logoUrl ? "border-primary/20 bg-primary/5 p-0 overflow-hidden shadow-inner" : "border-muted-foreground/20 bg-muted/10 hover:border-primary/40 hover:bg-primary/5",
                      !isAdmin && "cursor-not-allowed border-muted"
                    )}
                  >
                    {config?.logoUrl ? <img src={config.logoUrl} className="h-full w-full object-cover" alt="" /> : <><Upload className="h-5 w-5 text-muted-foreground" /><p className="text-[10px] font-bold text-muted-foreground uppercase text-center leading-tight">Click to upload<br/><span className="text-[8px] opacity-60">PNG or SVG</span></p></>}
                  </div>
                  <input type="file" ref={logoRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </div>
              </Card>
              <div className="space-y-8 text-left">
                <div className="space-y-3 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Main Heading</Label><Input defaultValue={config?.title || ""} onBlur={(e) => onUpdate({ title: e.target.value })} placeholder="e.g. Unlock Exclusive Privilege" className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner" /></div>
                <div className="space-y-3 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Hero Description</Label><Textarea defaultValue={config?.description || ""} onBlur={(e) => onUpdate({ description: e.target.value })} className="min-h-[100px] rounded-xl bg-muted/20 border-none shadow-inner p-4 text-xs font-medium" /></div>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8 p-6 bg-muted/10 rounded-[2rem] text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase text-primary ml-1 flex items-center gap-2"><Type className="h-3.5 w-3.5" /> Heading Font</Label><Select value={config?.titleFont || "Mukta"} onValueChange={(v) => updateLocal({ titleFont: v }, true)}><SelectTrigger className="h-11 rounded-xl bg-white border-muted shadow-sm font-bold"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{FONT_OPTIONS.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase text-primary ml-1 flex items-center gap-2"><Maximize2 className="h-3.5 w-3.5" /> Size</Label><div className="flex items-center gap-3"><Slider value={[config?.titleFontSize || 32]} max={80} min={20} step={1} onValueChange={(v) => updateLocal({ titleFontSize: v[0] })} onValueCommit={(v) => { updateLocal({ titleFontSize: v[0] }); onUpdate({ titleFontSize: v[0] }); }} className="flex-1" /><span className="text-[10px] font-black w-8">{config?.titleFontSize || 32}</span></div></div>
                </div>
                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between"><Label className="text-[10px] font-black uppercase text-primary ml-1">Word Highlight (Title)</Label><div className="flex items-center gap-2"><span className="text-[9px] font-bold uppercase opacity-60">Gradient</span><Switch checked={config?.titleHighlightGradient || false} onCheckedChange={(v) => updateLocal({ titleHighlightGradient: v }, true)} className="scale-75 data-[state=checked]:bg-primary" /></div></div>
                  <Input defaultValue={config?.titleHighlightWord || ""} onBlur={(e) => onUpdate({ titleHighlightWord: e.target.value })} placeholder="Word to highlight..." className="h-10 rounded-xl bg-primary/5 border-none text-xs font-bold" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left">
                      <Label className="text-[9px] font-bold uppercase opacity-60 text-left block">{config?.titleHighlightGradient ? 'Start Color' : 'Color'}</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={localColors.titleColor} onChange={(e) => setLocalColors({...localColors, titleColor: e.target.value})} onBlur={(e) => onUpdate({ titleHighlightColor: e.target.value })} className="h-8 w-8 p-1 rounded-md border-none" />
                        <Input value={localColors.titleColor} onChange={(e) => setLocalColors({...localColors, titleColor: e.target.value})} onBlur={(e) => onUpdate({ titleHighlightColor: e.target.value })} className="h-8 flex-1 rounded-md text-[10px] font-mono" />
                      </div>
                    </div>
                    {config?.titleHighlightGradient && (
                      <div className="space-y-1.5 animate-in slide-in-from-left-1 text-left">
                        <Label className="text-[9px] font-bold uppercase opacity-60 text-left block">End Color</Label>
                        <div className="flex gap-2">
                          <Input type="color" value={localColors.titleEnd} onChange={(e) => setLocalColors({...localColors, titleEnd: e.target.value})} onBlur={(e) => onUpdate({ titleGradientEnd: e.target.value })} className="h-8 p-1 rounded-md border-none" />
                          <Input value={localColors.titleEnd} onChange={(e) => setLocalColors({...localColors, titleEnd: e.target.value})} onBlur={(e) => onUpdate({ titleGradientEnd: e.target.value })} className="h-8 flex-1 rounded-md text-[10px] font-mono" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-8 p-6 bg-muted/10 rounded-[2rem] text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase text-primary ml-1 flex items-center gap-2"><Type className="h-3.5 w-3.5" /> Desc Font</Label><Select value={config?.descriptionFont || "Mukta"} onValueChange={(v) => updateLocal({ descriptionFont: v }, true)}><SelectTrigger className="h-11 rounded-xl bg-white border-muted shadow-sm font-bold"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{FONT_OPTIONS.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase text-primary ml-1 flex items-center gap-2"><Maximize2 className="h-3.5 w-3.5" /> Size</Label><div className="flex items-center gap-3"><Slider value={[config?.descriptionFontSize || 16]} max={40} min={12} step={1} onValueChange={(v) => updateLocal({ descriptionFontSize: v[0] })} onValueCommit={(v) => { updateLocal({ descriptionFontSize: v[0] }); onUpdate({ descriptionFontSize: v[0] }); }} className="flex-1" /><span className="text-[10px] font-black w-8">{config?.descriptionFontSize || 16}</span></div></div>
                </div>
                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between"><Label className="text-[10px] font-black uppercase text-primary ml-1">Word Highlight (Desc)</Label><div className="flex items-center gap-2"><span className="text-[9px] font-bold uppercase opacity-60">Gradient</span><Switch checked={config?.descriptionHighlightGradient || false} onCheckedChange={(v) => updateLocal({ descriptionHighlightGradient: v }, true)} className="scale-75 data-[state=checked]:bg-primary" /></div></div>
                  <Input defaultValue={config?.descriptionHighlightWord || ""} onBlur={(e) => onUpdate({ descriptionHighlightWord: e.target.value })} placeholder="Word to highlight..." className="h-10 rounded-xl bg-primary/5 border-none text-xs font-bold" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left">
                      <Label className="text-[9px] font-bold uppercase opacity-60 text-left block">{config?.descriptionHighlightGradient ? 'Start Color' : 'Color'}</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={localColors.descColor} onChange={(e) => setLocalColors({...localColors, descColor: e.target.value})} onBlur={(e) => onUpdate({ descriptionHighlightColor: e.target.value })} className="h-8 w-8 p-1 rounded-md border-none" />
                        <Input value={localColors.descColor} onChange={(e) => setLocalColors({...localColors, descColor: e.target.value})} onBlur={(e) => onUpdate({ descriptionHighlightColor: e.target.value })} className="h-8 flex-1 rounded-md text-[10px] font-mono" />
                      </div>
                    </div>
                    {config?.descriptionHighlightGradient && (
                      <div className="space-y-1.5 animate-in slide-in-from-left-1 text-left">
                        <Label className="text-[9px] font-bold uppercase opacity-60 text-left block">End Color</Label>
                        <div className="flex gap-2">
                          <Input type="color" value={localColors.descEnd} onChange={(e) => setLocalColors({...localColors, descEnd: e.target.value})} onBlur={(e) => onUpdate({ descriptionGradientEnd: e.target.value })} className="h-8 p-1 rounded-md border-none" />
                          <Input value={localColors.descEnd} onChange={(e) => setLocalColors({...localColors, descEnd: e.target.value})} onBlur={(e) => onUpdate({ descriptionGradientEnd: e.target.value })} className="h-8 flex-1 rounded-md text-[10px] font-mono" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-8 text-left"><div className="flex items-center justify-between px-1 text-left"><h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 text-left"><SmartphoneNfc className="h-5 w-5" /> Social & Direct Support</h4></div><div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left"><div className="space-y-3 text-left"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">WhatsApp Business Node</Label><Input defaultValue={config?.supportWhatsapp || ""} onBlur={(e) => onUpdate({ supportWhatsapp: e.target.value.replace(/\D/g, '') })} placeholder="91XXXXXXXX" className="h-12 rounded-xl bg-muted/20 border-none shadow-inner" /></div><div className="space-y-3 text-left"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Instagram URL</Label><Input defaultValue={config?.instagramUrl || ""} onBlur={(e) => onUpdate({ instagramUrl: e.target.value })} placeholder="https://..." className="h-12 rounded-xl bg-muted/20 border-none shadow-inner" /></div><div className="space-y-3 text-left"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Facebook URL</Label><Input defaultValue={config?.facebookUrl || ""} onBlur={(e) => onUpdate({ facebookUrl: e.target.value })} placeholder="https://..." className="h-12 rounded-xl bg-muted/20 border-none shadow-inner" /></div><div className="space-y-3 text-left"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">YouTube URL</Label><Input defaultValue={config?.youtubeUrl || ""} onBlur={(e) => onUpdate({ youtubeUrl: e.target.value })} placeholder="https://..." className="h-12 rounded-xl bg-muted/20 border-none shadow-inner" /></div></div></div>
            <Separator />
            <div className="space-y-6 text-left"><div className="flex items-center justify-between px-1 text-left"><h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 text-left"><PlusCircle className="h-4 w-4" /> Custom Action Buttons</h4><button onClick={() => handleAddCustomButton()} className="text-[8px] font-black uppercase text-primary border border-primary/20 bg-primary/5 px-2 py-0.5 rounded-lg">Add Button</button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{(config?.customButtons || []).map((btn: any, idx: number) => (<div key={idx} className="p-4 bg-muted/10 rounded-2xl border border-transparent hover:border-primary/20 space-y-3 relative group text-left"><Input placeholder="Label" value={btn.label} onChange={(e) => handleUpdateCustomButton(idx, 'label', e.target.value)} className="h-10 rounded-xl font-bold text-xs uppercase" /><Input placeholder="URL" value={btn.url} onChange={(e) => handleUpdateCustomButton(idx, 'url', e.target.value)} className="h-10 rounded-xl text-[10px]" /><button onClick={() => handleRemoveCustomButton(idx)} className="absolute -top-2 -right-2 h-6 w-6 bg-white rounded-full shadow-md text-red-50 text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border"><X className="h-3 w-3" /></button></div>))}</div></div>
            <Separator />
            <div className="space-y-8 text-left"><div className="flex items-center gap-3 px-1 text-left"><Building className="h-5 w-5 text-primary" /> <h4 className="text-[10px] font-black uppercase tracking-widest text-primary text-left">Location & Contact Details</h4></div><div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left"><div className="space-y-3 text-left"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Store Name</Label><Input defaultValue={config?.storeName || business?.name || ""} onBlur={(e) => onUpdate({ storeName: e.target.value })} className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold" /></div><div className="space-y-3 text-left"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Store Phone</Label><Input defaultValue={config?.storePhone || ""} onBlur={(e) => onUpdate({ storePhone: e.target.value })} className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold" /></div><div className="space-y-3 text-left"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Store Email</Label><Input defaultValue={config?.storeEmail || ""} onBlur={(e) => onUpdate({ storeEmail: e.target.value })} className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold" /></div><div className="space-y-3 col-span-1 md:col-span-2 text-left"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Store Address</Label><Textarea defaultValue={config?.storeAddress || ""} onBlur={(e) => onUpdate({ storeAddress: e.target.value })} className="h-20 rounded-xl bg-muted/20 border-none shadow-inner p-3 text-xs" /></div></div></div>
            <Separator />
            <div className="space-y-6 text-left"><Label className="text-[10px] font-black uppercase text-primary ml-1 tracking-[0.2em]">Program Guidelines (Membership Rules)</Label><Textarea defaultValue={config?.rules || ""} onBlur={(e) => onUpdate({ rules: e.target.value })} placeholder="Point 1&#10;Point 2&#10;Point 3" className="min-h-[160px] rounded-2xl bg-muted/20 border-none shadow-inner p-4 text-xs font-medium leading-relaxed" /></div>
          </CardContent>
        </Card>
      </div>
      <div className="xl:col-span-4 sticky top-24">
        <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white space-y-8 shadow-2xl border border-white/5 overflow-hidden text-left">
          <div className="absolute top-0 right-0 p-8 opacity-10"><X className="h-40 w-40" /></div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent text-center relative z-10">{isJoin ? 'Join Portal Preview' : 'Tracking Page Preview'}</p>
          <div className="p-6 bg-white rounded-3xl space-y-6 shadow-inner animate-in zoom-in-95 duration-500 text-left">
            <div className="text-center space-y-4 text-left"><div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto overflow-hidden">{config?.logoUrl ? <img src={config.logoUrl} className="h-full w-full object-cover" alt="" /> : <Building className="h-6 w-6" />}</div><h5 className="text-slate-900 leading-tight" style={{ fontFamily: config?.titleFont || 'Mukta', fontSize: `${(config?.titleFontSize || 32) * 0.4}px` }}><HighlightedText text={config?.title || "HEADING"} highlight={config?.titleHighlightWord} color={config?.titleHighlightColor} isGradient={config?.titleHighlightGradient} gradientEnd={config?.descriptionGradientEnd} /></h5><p className="text-slate-500 leading-tight" style={{ fontFamily: config?.descriptionFont || 'Mukta', fontSize: `${(config?.descriptionFontSize || 16) * 0.6}px` }}><HighlightedText text={config?.description || "Description..."} highlight={config?.descriptionHighlightWord} color={config?.descriptionHighlightColor} isGradient={config?.descriptionHighlightGradient} gradientEnd={config?.descriptionGradientEnd} /></p></div>
            <Separator className="opacity-40" /><div className="flex gap-2">{(config?.customButtons || []).slice(0, 2).map((btn: any, i: number) => (
              <div key={i} className="flex-1 h-8 rounded-lg bg-primary/10 text-primary text-[7px] font-black uppercase flex items-center justify-center border border-primary/10">{btn.label}</div>
            ))}</div>
          </div>
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-3 text-left"><Info className="h-4 w-4 text-accent shrink-0 mt-0.5" /><p className="text-[10px] font-medium text-slate-400 leading-relaxed uppercase italic text-left">Live preview reflects basic layout. Full typography and gradients are applied on the live production node.</p></div>
        </div>
      </div>
    </div>
  );
}
