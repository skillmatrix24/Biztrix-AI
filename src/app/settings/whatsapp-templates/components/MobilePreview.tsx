"use client";

import React from "react";
import { 
  BadgeCheck, 
  Image as ImageLucide, 
  Video, 
  File as FileIcon, 
  MessageSquare, 
  ExternalLink, 
  PhoneCall, 
  Info,
  ChevronLeft,
  Smartphone,
  Phone,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  User,
  Camera
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface MobilePreviewProps {
  designData: any;
  renderPreviewText: (text: string, samples: Record<string, string>) => string;
}

export function MobilePreview({ designData, renderPreviewText }: MobilePreviewProps) {
  return (
    <Card className="border-none shadow-2xl bg-slate-900 rounded-[3.5rem] overflow-hidden p-8 sm:p-12 flex flex-col items-center border border-white/5">
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-accent mb-12 flex items-center gap-2">
        <BadgeCheck className="h-4 w-4" /> Node Live Simulator
      </p>
      
      <div className="w-full max-w-[320px] bg-[#E5DDD5] rounded-[3rem] border-[10px] border-slate-800 aspect-[9/18.5] shadow-2xl relative overflow-hidden flex flex-col group">
        {/* WHATSAPP STATUS BAR */}
        <div className="h-7 bg-slate-800 flex items-center justify-between px-6 pt-1 shrink-0">
          <span className="text-[10px] text-white font-bold">12:30</span>
          <div className="flex items-center gap-1.5 opacity-60">
             <Smartphone className="h-3 w-3 text-white" />
             <div className="h-2.5 w-5 rounded-sm border border-white/40 relative">
               <div className="h-full w-3/4 bg-white" />
             </div>
          </div>
        </div>

        {/* WHATSAPP CHAT HEADER */}
        <div className="h-14 bg-[#075E54] flex items-center justify-between px-3 shrink-0 shadow-md">
           <div className="flex items-center gap-2">
              <ChevronLeft className="h-5 w-5 text-white" />
              <div className="h-9 w-9 rounded-full bg-slate-200 border border-white/10 overflow-hidden flex items-center justify-center">
                 <User className="h-5 w-5 text-slate-400" />
              </div>
              <div className="flex flex-col text-left">
                 <span className="text-[12px] font-bold text-white leading-none">Customer Node</span>
                 <span className="text-[8px] text-white/70 uppercase font-bold mt-1 tracking-widest">Online</span>
              </div>
           </div>
           <div className="flex items-center gap-3 text-white">
              <Video className="h-4 w-4" />
              <Phone className="h-4 w-4" />
              <MoreVertical className="h-4 w-4" />
           </div>
        </div>

        {/* CHAT BACKGROUND PATTERN */}
        <div className="absolute inset-0 top-20 bg-[url('https://picsum.photos/seed/chat-bg/400/800')] opacity-5 pointer-events-none grayscale mix-blend-overlay" />
        
        <ScrollArea className="flex-1 p-3 relative z-10">
          <div className="space-y-4 pt-4">
            <div className="max-w-[95%] bg-white rounded-lg rounded-tl-none shadow-md overflow-hidden animate-in slide-in-from-left-4 duration-500 self-start">
              {/* HEADER SECTION RENDERING */}
              {designData.headerType !== 'NONE' && (
                <div className={cn(
                  "flex items-center justify-center text-slate-400 relative overflow-hidden border-b",
                  designData.headerType === 'TEXT' ? "min-h-[40px] bg-white p-3" : "aspect-[1.9/1] bg-slate-200"
                )}>
                  {designData.headerType === 'TEXT' ? (
                    <p className="text-[11px] font-black text-slate-900 leading-tight uppercase text-left w-full">
                      {renderPreviewText(designData.headerText, designData.headerVariablesSamples) || "HEADER TEXT"}
                    </p>
                  ) : designData.headerType === 'IMAGE' && designData.headerImage ? (
                    <img src={designData.headerImage} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      {designData.headerType === 'IMAGE' ? <ImageLucide className="h-8 w-8 opacity-40" /> : designData.headerType === 'VIDEO' ? <Video className="h-8 w-8 opacity-40" /> : <FileIcon className="h-8 w-8 opacity-40" />}
                      <span className="text-[7px] font-black uppercase opacity-60">MEDIA HUB</span>
                    </div>
                  )}
                </div>
              )}

              {/* BODY SECTION */}
              <div className="p-3 space-y-1.5 text-left">
                <p className="text-[11px] text-slate-800 font-medium leading-[1.4] whitespace-pre-wrap">
                  {renderPreviewText(designData.body, designData.bodyVariablesSamples) || "Body Content Here..."}
                </p>
                {designData.footer && <p className="text-[9px] text-slate-400 mt-2 font-bold leading-tight border-t pt-1.5 border-slate-50 uppercase tracking-tighter">{designData.footer}</p>}
                <div className="flex justify-end mt-1"><span className="text-[7px] text-slate-300 font-bold uppercase tracking-tighter">12:30 PM • ✓✓</span></div>
              </div>

              {/* ACTION BUTTONS (Stacked closely to the bubble) */}
              <div className="bg-white border-t border-slate-50 divide-y divide-slate-50">
                {(designData.buttons || []).map((btn: any) => (
                  <div key={btn.id} className="py-2.5 px-3 text-[10px] font-bold text-[#007AFF] text-center flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                    {btn.type === 'QUICK_REPLY' ? <MessageSquare className="h-3 w-3" /> : btn.type === 'URL' ? <ExternalLink className="h-3 w-3" /> : <PhoneCall className="h-3 w-3" />}
                    {btn.label || "Action Button"}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* WHATSAPP INPUT BAR (Fake) */}
        <div className="h-14 bg-white/95 backdrop-blur-md px-3 flex items-center gap-3 shrink-0 border-t border-slate-200 z-20">
           <div className="h-9 flex-1 bg-slate-100 rounded-full px-4 flex items-center gap-3 text-slate-400">
              <Smile className="h-5 w-5" />
              <span className="text-[11px] font-medium flex-1">Message</span>
              <Paperclip className="h-5 w-5" />
              <Camera className="h-5 w-5" />
           </div>
           <div className="h-9 w-9 rounded-full bg-[#075E54] flex items-center justify-center text-white">
              <Send className="h-4 w-4 ml-0.5" />
           </div>
        </div>
      </div>

      <div className="mt-12 p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4 w-full text-left">
        <div className="flex items-center gap-3">
          <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <h5 className="text-[9px] font-black uppercase text-accent tracking-[0.2em]">Logic Mapping Node</h5>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed font-medium italic">
          Ye preview sateek (precise) tarike se dikhata hai ki actual WhatsApp chat mein message kaisa render hoga. Variables ki jagah aapka bhara hua Sample Content dikhega.
        </p>
      </div>
    </Card>
  );
}
