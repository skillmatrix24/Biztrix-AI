"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TrackHeaderProps {
  business: any;
  portalConfig: any;
  businessId: string;
}

export function TrackHeader({
  business,
  portalConfig,
  businessId,
}: TrackHeaderProps) {
  const portalLogo = portalConfig?.logoUrl || business?.logoUrl;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 h-16 sm:h-20 flex items-center">
      <div className="max-w-6xl mx-auto px-4 w-full flex items-center justify-between gap-4 text-left">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 sm:h-11 sm:w-11 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
            {portalLogo ? (
              <img
                src={portalLogo}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                alt={portalConfig?.storeName || business?.name || "Store logo"}
              />
            ) : (
              <div className="h-full w-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                {business?.name?.charAt(0) || "B"}
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-base font-bold text-slate-900 truncate leading-tight">
              {portalConfig?.storeName || business?.name || "Member Portal"}
            </span>
            <span className="text-xs font-medium text-emerald-700 mt-0.5">
              Verified Member Portal
            </span>
          </div>
        </div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-9 rounded-xl text-xs font-semibold text-primary px-3"
        >
          <Link href={`/loyalty/join/${businessId}`}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </Link>
        </Button>
      </div>
    </header>
  );
}
