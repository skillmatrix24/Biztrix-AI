"use client";

import { MapPin, Phone, Mail, ShieldCheck, BadgeCheck } from "lucide-react";

interface TrackFooterProps {
  business: any;
  portalConfig: any;
}

export function TrackFooter({ business, portalConfig }: TrackFooterProps) {
  return (
    <footer className="mt-24 py-16 sm:py-24 bg-white border-t shrink-0">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 sm:gap-16 text-center md:text-left">
        <div className="space-y-6 text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="h-8 w-8 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-sm sm:text-base">B</div>
            <span className="text-xs font-black uppercase tracking-widest text-slate-900">Secure OS Node</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Official identity portal for <strong>{portalConfig?.storeName || business?.name}</strong>.
          </p>
        </div>
        <div className="space-y-6 text-left">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center md:text-left">Node Contact</h4>
          <div className="space-y-4">
            <div className="flex gap-4 items-start justify-center md:justify-start text-left">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-slate-600">{portalConfig?.storeAddress || business?.address || "Location pending"}</p>
            </div>
            <div className="flex gap-4 items-center justify-center md:justify-start text-left">
              <Phone className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs font-bold text-slate-600">{portalConfig?.storePhone || business?.phone || "N/A"}</p>
            </div>
            <div className="flex gap-4 items-center justify-center md:justify-start text-left">
              <Mail className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs font-bold text-slate-600">{portalConfig?.storeEmail || business?.email || "N/A"}</p>
            </div>
          </div>
        </div>
        <div className="space-y-6 text-left">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center md:text-left">Security</h4>
          <div className="p-6 bg-slate-50 rounded-[1.5rem] sm:rounded-3xl border border-border/50 space-y-4">
            <div className="flex items-center gap-3 justify-center md:justify-start"><ShieldCheck className="h-5 w-5 text-green-600" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-900">End-to-End Verified</span></div>
            <div className="flex items-center gap-3 justify-center md:justify-start"><BadgeCheck className="h-5 w-5 text-primary" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-900">Multi-tenant Isolation</span></div>
          </div>
        </div>
      </div>
    </footer>
  );
}
