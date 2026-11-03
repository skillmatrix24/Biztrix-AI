
"use client";

import React, { useMemo } from "react";
import { 
  Palette, 
  PlusCircle, 
  Image as ImageLucide, 
  Video, 
  File as FileIcon, 
  FileText, 
  Plus, 
  X, 
  MousePointer2, 
  ExternalLink, 
  PhoneCall, 
  Globe, 
  Zap, 
  Sparkles,
  Upload,
  Loader2,
  ShieldCheck,
  History as HistoryIcon,
  Bot,
  BookOpen
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { MobilePreview } from "./MobilePreview";

const VARIABLE_PROTOCOL = [
  { id: '{{1}}', label: 'Customer Name' },
  { id: '{{2}}', label: 'ID / Identifier' },
  { id: '{{3}}', label: 'Value / Reward' },
  { id: '{{4}}', label: 'Tracking URL' },
];

interface VisualDesignerProps {
  designData: any;
  setDesignData: (data: any) => void;
  isSubmitting: boolean;
  waConfig: any;
  onDeploy: () => void;
}

export function VisualDesigner({ 
  designData, 
  setDesignData, 
  isSubmitting, 
  waConfig, 
  onDeploy
}: VisualDesignerProps) {
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const detectVariables = (text: string) => {
    const matches = text.match(/\{\{\d+\}\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches)).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''));
      const numB = parseInt(b.replace(/\D/g, ''));
      return numA - numB;
    });
  };

  const headerVariables = useMemo(() => detectVariables(designData.headerText || ""), [designData.headerText]);
  const bodyVariables = useMemo(() => detectVariables(designData.body || ""), [designData.body]);

  const approvalProbability = useMemo(() => {
    let score = 15;
    if (designData.name?.length > 3) score += 15;
    if (designData.body?.length > 20) score += 20;
    
    const allVars = [...headerVariables, ...bodyVariables];
    const samplesCount = Object.keys({ ...designData.headerVariablesSamples, ...designData.bodyVariablesSamples }).length;
    
    if (allVars.length > 0) {
      if (samplesCount === allVars.length) score += 30;
      else if (samplesCount > 0) score += 10;
    } else {
      score += 30;
    }

    if (designData.footer) score += 10;
    if (designData.buttons?.length > 0) score += 10;

    return Math.min(score, 100);
  }, [designData, headerVariables, bodyVariables]);

  const insertVariable = (target: 'body' | 'header') => {
    const hVars = detectVariables(designData.headerText || "");
    const bVars = detectVariables(designData.body || "");
    const allVars = Array.from(new Set([...hVars, ...bVars]));
    
    const nums = allVars.map(v => parseInt(v.replace(/\D/g, ''))).filter(n => !isNaN(n));
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    
    if (target === 'body') {
      setDesignData({ ...designData, body: (designData.body || "") + ` {{${nextNum}}}` });
    } else {
      setDesignData({ ...designData, headerText: (designData.headerText || "") + ` {{${nextNum}}}` });
    }
  };

  const updateSample = (v: string, value: string, isHeader: boolean) => {
    if (isHeader) {
      setDesignData({ ...designData, headerVariablesSamples: { ...designData.headerVariablesSamples, [v]: value } });
    } else {
      setDesignData({ ...designData, bodyVariablesSamples: { ...designData.bodyVariablesSamples, [v]: value } });
    }
  };

  const addDesignButton = () => {
    if (designData.buttons?.length >= 10) return;
    const newBtn = { id: `btn_${Date.now()}`, type: 'QUICK_REPLY', label: 'Action Label' };
    setDesignData({ ...designData, buttons: [...(designData.buttons || []), newBtn] });
  };

  const renderPreviewText = (text: string, samples: Record<string, string>) => {
    let result = text || "";
    Object.entries(samples).forEach(([v, val]) => {
      result = result.replace(new RegExp(`\\${v}`, 'g'), val || v);
    });
    return result;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
      <div className="lg:col-span-7 space-y-8">
        <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border flex flex-col h-[800px]">
          <CardHeader className="bg-primary/5 border-b py-6 px-8 flex justify-between items-center text-left shrink-0">
            <div className="flex items-center gap-4 text-left">
              <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm"><Palette className="h-6 w-6" /></div>
              <div className="text-left">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-primary leading-none">Meta Template Designer</CardTitle>
                <p className="text-[9px] font-bold text-muted-foreground uppercase mt-2">v3.5 Advanced Logic Node</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
               <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Approval Probability</span>
               <div className="flex items-center gap-3">
                  <div className="h-2 w-24 bg-muted rounded-full overflow-hidden shrink-0">
                    <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${approvalProbability}%` }} />
                  </div>
                  <span className="text-xs font-black text-green-600">{approvalProbability}%</span>
               </div>
            </div>
          </CardHeader>
          
          <ScrollArea className="flex-1">
            <CardContent className="p-8 space-y-12">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2 text-left">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Template Name (Slug) *</Label>
                  <Input value={designData.name} onChange={(e) => setDesignData({...designData, name: e.target.value.toLowerCase().replace(/\s+/g, '_')})} placeholder="e.g. festive_offer" className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner" />
                </div>
                <div className="space-y-2 text-left">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Meta Category</Label>
                  <Select value={designData.category} onValueChange={(v: any) => setDesignData({...designData, category: v})}>
                    <SelectTrigger className="h-12 rounded-xl font-black text-[10px] uppercase bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      <SelectItem value="MARKETING" className="text-[10px] font-bold uppercase text-orange-600">Marketing</SelectItem>
                      <SelectItem value="UTILITY" className="text-[10px] font-bold uppercase text-primary">Utility</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 text-left">
                  <Label className="text-[10px) font-black uppercase text-muted-foreground ml-1">Language</Label>
                  <Select value={designData.language} onValueChange={(v) => setDesignData({...designData, language: v})}>
                    <SelectTrigger className="h-12 rounded-xl font-black text-[10px] uppercase bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="en_US" className="text-[10px] font-bold uppercase">English (US)</SelectItem>
                      <SelectItem value="hi_IN" className="text-[10px] font-bold uppercase">Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Variable Mapping Quick Bar */}
              <div className="p-5 bg-slate-900 rounded-3xl space-y-4">
                 <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                    <BookOpen className="h-3 w-3" /> Mapping Protocol Reference
                 </p>
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {VARIABLE_PROTOCOL.map(v => (
                      <div key={v.id} className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-left">
                         <p className="text-xs font-black text-accent font-mono leading-none">{v.id}</p>
                         <p className="text-[7px] font-bold text-slate-400 uppercase mt-1 leading-none">{v.label}</p>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="p-6 bg-muted/20 rounded-[2rem] space-y-6 text-left border-2 border-dashed border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ImageLucide className="h-4 w-4 text-primary" />
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Message Header Type</Label>
                  </div>
                  <Select value={designData.headerType} onValueChange={(v: any) => setDesignData({...designData, headerType: v, headerText: "", headerImage: ""})}>
                    <SelectTrigger className="h-9 w-40 rounded-xl text-[10px] font-black uppercase bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="NONE" className="text-[9px] font-black uppercase">No Header</SelectItem>
                      <SelectItem value="TEXT" className="text-[9px] font-black uppercase">Text Headline</SelectItem>
                      <SelectItem value="IMAGE" className="text-[9px] font-black uppercase">Rich Image</SelectItem>
                      <SelectItem value="VIDEO" className="text-[9px] font-black uppercase">Video Content</SelectItem>
                      <SelectItem value="DOCUMENT" className="text-[9px] font-black uppercase">PDF Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {designData.headerType === 'TEXT' && (
                  <div className="space-y-3 animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center px-1">
                      <Label className="text-[9px] font-black uppercase text-slate-400">Headline Content</Label>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[7px] font-black uppercase border border-primary/20" onClick={() => insertVariable('header')}>+ Add Variable</Button>
                    </div>
                    <Input value={designData.headerText} onChange={(e) => setDesignData({...designData, headerText: e.target.value})} placeholder="e.g. Welcome to {{1}}!" className="h-12 rounded-xl bg-white font-black" />
                  </div>
                )}

                {(designData.headerType === 'IMAGE' || designData.headerType === 'VIDEO' || designData.headerType === 'DOCUMENT') && (
                  <div className="space-y-4 animate-in slide-in-from-top-2">
                    <div onClick={() => fileInputRef.current?.click()} className={cn("h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer bg-white group hover:border-primary/40", designData.headerImage && "border-primary/20 bg-primary/5 p-0 overflow-hidden shadow-inner")}>
                      {designData.headerImage ? (
                        designData.headerType === 'IMAGE' ? (
                          <img src={designData.headerImage} className="h-full w-full object-cover" alt="" />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            {designData.headerType === 'VIDEO' ? <Video className="h-8 w-8 text-primary" /> : <FileIcon className="h-8 w-8 text-primary" />}
                            <span className="text-[9px] font-black uppercase text-primary">Media Loaded</span>
                          </div>
                        )
                      ) : (
                        <>
                          <Upload className="h-7 w-7 text-slate-300 group-hover:text-primary transition-colors" />
                          <p className="text-[9px] font-black uppercase text-slate-400 group-hover:text-primary">Click to Upload {designData.headerType}</p>
                        </>
                      )}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept={designData.headerType === 'IMAGE' ? "image/*" : designData.headerType === 'VIDEO' ? "video/*" : ".pdf"} onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setDesignData({ ...designData, headerImage: reader.result as string });
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-primary" />
                    <Label className="text-[10px] font-black uppercase tracking-widest">Template Logic Body *</Label>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 rounded-lg text-[8px] font-black uppercase gap-1.5 border-primary/20 text-primary bg-white shadow-sm" onClick={() => insertVariable('body')}>
                    <PlusCircle className="h-3 w-3" /> Insert Variable
                  </Button>
                </div>
                <Textarea value={designData.body} onChange={(e) => setDesignData({...designData, body: e.target.value})} placeholder="Hi {{1}}, thank you for choosing {{2}}!" className="min-h-[160px] rounded-[2rem] bg-muted/20 border-none shadow-inner p-6 text-sm font-medium leading-relaxed" />
              </div>

              {(headerVariables.length > 0 || bodyVariables.length > 0) && (
                <div className="space-y-6 p-8 bg-primary/5 rounded-[2.5rem] border border-primary/20 animate-in zoom-in-95">
                  <div className="flex items-center gap-3 mb-2">
                    <Sparkles className="h-5 w-5 text-primary fill-primary" />
                    <h5 className="text-[10px] font-black uppercase text-primary tracking-widest">Sample Content Hub (Mandatory)</h5>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {headerVariables.map((v) => (
                      <div key={v} className="space-y-1.5 text-left">
                        <Label className="text-[9px] font-black uppercase text-primary/60 ml-1">Header Example {v}</Label>
                        <Input value={designData.headerVariablesSamples[v] || ""} onChange={(e) => updateSample(v, e.target.value, true)} placeholder="Sample value" className="h-10 rounded-xl bg-white border-none shadow-sm text-xs font-bold" />
                      </div>
                    ))}
                    {bodyVariables.map((v) => (
                      <div key={v} className="space-y-1.5 text-left">
                        <Label className="text-[9px] font-black uppercase text-primary/60 ml-1">Body Example {v}</Label>
                        <Input value={designData.bodyVariablesSamples[v] || ""} onChange={(e) => updateSample(v, e.target.value, false)} placeholder="Sample value" className="h-10 rounded-xl bg-white border-none shadow-sm text-xs font-bold" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4 text-left">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-2"><HistoryIcon className="h-3 w-3" /> Footer (Optional)</Label>
                  <Input value={designData.footer} onChange={(e) => setDesignData({...designData, footer: e.target.value})} placeholder="e.g. Press STOP to opt-out" className="h-11 rounded-xl bg-muted/10 border-none shadow-inner text-xs" />
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase text-primary ml-1 flex items-center gap-2"><MousePointer2 className="h-4 w-4" /> Button Matrix</Label>
                    <button type="button" className="text-[8px] font-black uppercase text-primary border border-primary/20 bg-primary/5 px-2 py-0.5 rounded-lg" onClick={addDesignButton}>+ Add Action</button>
                  </div>
                  <div className="space-y-3">
                    {(designData.buttons || []).map((btn: any) => (
                      <div key={btn.id} className="p-4 bg-muted/20 rounded-2xl border border-transparent space-y-4 relative group text-left">
                        <div className="grid grid-cols-2 gap-3">
                          <Select value={btn.type} onValueChange={(v: any) => setDesignData({...designData, buttons: designData.buttons.map((b:any) => b.id === btn.id ? {...b, type: v} : b)})}>
                            <SelectTrigger className="h-9 rounded-xl text-[9px] font-black uppercase bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                              <SelectItem value="QUICK_REPLY" className="text-[10px] font-bold uppercase">Quick Reply</SelectItem>
                              <SelectItem value="URL" className="text-[10px] font-bold uppercase">Website Link</SelectItem>
                              <SelectItem value="PHONE_NUMBER" className="text-[10px] font-bold uppercase">Phone Call</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input placeholder="Label" value={btn.label} onChange={(e) => setDesignData({...designData, buttons: designData.buttons.map((b:any) => b.id === btn.id ? {...b, label: e.target.value} : b)})} className="h-10 rounded-xl bg-white font-black text-[10px] uppercase" />
                        </div>
                        {btn.type !== 'QUICK_REPLY' && <Input placeholder={btn.type === 'URL' ? 'https://...' : '91XXXXXXXX'} value={btn.value || ""} onChange={(e) => setDesignData({...designData, buttons: designData.buttons.map((b:any) => b.id === btn.id ? {...b, value: e.target.value} : b)})} className="h-9 rounded-xl bg-white font-mono text-[9px]" />}
                        <button onClick={() => setDesignData({...designData, buttons: designData.buttons.filter((b:any) => b.id !== btn.id)})} className="absolute -top-2 -right-2 h-6 w-6 bg-white rounded-full shadow-lg text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 border transition-all"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </ScrollArea>
          <CardFooter className="p-8 bg-muted/10 border-t shrink-0">
            <Button onClick={onDeploy} disabled={isSubmitting || !waConfig?.isVerified} className="w-full h-16 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl text-white">
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
              Deploy to Meta Cloud API
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="lg:col-span-5 space-y-8 sticky top-24">
        <MobilePreview designData={designData} renderPreviewText={renderPreviewText} />
      </div>
    </div>
  );
}
