"use client";

import { MapPin, Phone, Mail, ShieldCheck, BadgeCheck } from "lucide-react";

interface TrackFooterProps {
  business: any;
  portalConfig: any;
}

export function TrackFooter({ business, portalConfig }: TrackFooterProps) {
  return (
    <footer className="mt-20 py-14 bg-white border-t border-slate-200 shrink-0">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 text-left">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              B
            </div>
            <span className="text-sm font-bold text-slate-900">
              Member Portal
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Official loyalty &amp; rewards portal for{" "}
            <strong>{portalConfig?.storeName || business?.name || "your store"}</strong>.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-500">Contact Us</h4>
          <div className="space-y-2.5">
            <div className="flex gap-3 items-start">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-slate-600">
                {portalConfig?.storeAddress ||
                  business?.address ||
                  "Location pending"}
              </p>
            </div>
            <div className="flex gap-3 items-center">
              <Phone className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs font-medium text-slate-600 font-mono tabular-nums">
                {portalConfig?.storePhone || business?.phone || "N/A"}
              </p>
            </div>
            <div className="flex gap-3 items-center">
              <Mail className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs font-medium text-slate-600">
                {portalConfig?.storeEmail || business?.email || "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-500">
            Trust &amp; Security
          </h4>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-medium text-slate-800">
                OTP Verified Member Access
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-medium text-slate-800">
                Isolated Store Ledger
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
