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
  Camera,
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
    <Card className="flex flex-col items-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
      <p className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
        <BadgeCheck className="h-4 w-4" /> Live Mobile Preview
      </p>

      <div className="relative flex aspect-[9/18] w-full max-w-[300px] flex-col overflow-hidden rounded-2xl border-[6px] border-slate-800 bg-[#E5DDD5]">
        {/* Status bar */}
        <div className="flex h-6 shrink-0 items-center justify-between bg-slate-800 px-4">
          <span className="font-mono text-[11px] font-semibold text-white">12:30</span>
          <div className="flex items-center gap-1.5 opacity-70">
            <Smartphone className="h-3 w-3 text-white" />
            <div className="relative h-2.5 w-4 rounded-sm border border-white/50">
              <div className="h-full w-3/4 bg-white" />
            </div>
          </div>
        </div>

        {/* Chat header */}
        <div className="flex h-12 shrink-0 items-center justify-between bg-[#075E54] px-3">
          <div className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4 text-white" />
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-slate-200">
              <User className="h-4 w-4 text-slate-500" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold leading-none text-white">
                Customer
              </span>
              <span className="mt-0.5 text-[11px] text-white/75">Online</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-white">
            <Video className="h-3.5 w-3.5" />
            <Phone className="h-3.5 w-3.5" />
            <MoreVertical className="h-3.5 w-3.5" />
          </div>
        </div>

        <ScrollArea className="relative z-10 flex-1 p-3">
          <div className="space-y-3 pt-2">
            <div className="max-w-[95%] self-start overflow-hidden rounded-lg rounded-tl-none border border-slate-200 bg-white">
              {designData.headerType !== "NONE" && (
                <div
                  className={cn(
                    "relative flex items-center justify-center overflow-hidden border-b border-slate-100 text-slate-400",
                    designData.headerType === "TEXT"
                      ? "min-h-[38px] bg-white p-3"
                      : "aspect-[1.9/1] bg-slate-100"
                  )}
                >
                  {designData.headerType === "TEXT" ? (
                    <p className="w-full text-left text-xs font-bold leading-tight text-slate-900">
                      {renderPreviewText(
                        designData.headerText,
                        designData.headerVariablesSamples
                      ) || "Header text"}
                    </p>
                  ) : designData.headerType === "IMAGE" &&
                    designData.headerImage ? (
                    <img
                      src={designData.headerImage}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                      alt="Template header preview"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      {designData.headerType === "IMAGE" ? (
                        <ImageLucide className="h-7 w-7 opacity-40" />
                      ) : designData.headerType === "VIDEO" ? (
                        <Video className="h-7 w-7 opacity-40" />
                      ) : (
                        <FileIcon className="h-7 w-7 opacity-40" />
                      )}
                      <span className="text-[11px] font-semibold opacity-65">
                        Media Preview
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5 p-3 text-left">
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-800">
                  {renderPreviewText(
                    designData.body,
                    designData.bodyVariablesSamples
                  ) || "Body content here..."}
                </p>
                {designData.footer && (
                  <p className="mt-2 border-t border-slate-100 pt-1.5 text-[11px] font-medium leading-tight text-slate-400">
                    {designData.footer}
                  </p>
                )}
                <div className="mt-1 flex justify-end">
                  <span className="font-mono text-[11px] text-slate-400">
                    12:30 PM
                  </span>
                </div>
              </div>

              {(designData.buttons || []).length > 0 && (
                <div className="divide-y divide-slate-100 border-t border-slate-100 bg-white">
                  {(designData.buttons || []).map((btn: any) => (
                    <div
                      key={btn.id}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-center text-[11px] font-semibold text-[#007AFF]"
                    >
                      {btn.type === "QUICK_REPLY" ? (
                        <MessageSquare className="h-3 w-3" />
                      ) : btn.type === "URL" ? (
                        <ExternalLink className="h-3 w-3" />
                      ) : (
                        <PhoneCall className="h-3 w-3" />
                      )}
                      {btn.label || "Action Button"}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Bottom input mock */}
        <div className="z-20 flex h-12 shrink-0 items-center gap-2 border-t border-slate-200 bg-white px-2.5">
          <div className="flex h-8 flex-1 items-center gap-2 rounded-full bg-slate-100 px-3 text-slate-400">
            <Smile className="h-4 w-4" />
            <span className="flex-1 text-[11px]">Message</span>
            <Paperclip className="h-4 w-4" />
            <Camera className="h-4 w-4" />
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#075E54] text-white">
            <Send className="ml-0.5 h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      <div className="mt-6 w-full space-y-2 rounded-xl border border-white/10 bg-white/5 p-4 text-left">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-emerald-400" />
          <h5 className="text-xs font-semibold text-white">Variable Mapping</h5>
        </div>
        <p className="text-xs leading-relaxed text-slate-300">
          Preview renders how your message will appear in WhatsApp chat using the sample values you provide.
        </p>
      </div>
    </Card>
  );
}
