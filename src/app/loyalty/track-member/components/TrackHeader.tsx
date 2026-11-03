"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TrackHeaderProps {
  business: any;
  portalConfig: any;
  businessId: string;
}

export function TrackHeader({ business, portalConfig, businessId }: TrackHeaderProps) {
  const portalLogo = portalConfig?.logoUrl || business?.logoUrl;

  return (
    <header className="sticky top-0 z-50 bg-white border-b h-16 sm:h-20 flex items-center shadow-sm">
      <div className="max-w-6xl mx-auto px-4 w-full flex items-center justify-between text-left">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 text-left">
          <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-border/10 shrink-0 overflow-hidden">
            {portalLogo ? (
              <img src={portalLogo} className="h-full w-full object-cover" alt="Logo" />
            ) : (
              <div className="h-full w-full bg-primary flex items-center justify-center text-white font-black text-sm">
                {business?.name?.charAt(0) || "B"}
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-base font-black text-slate-900 truncate leading-none">
              {portalConfig?.storeName || business?.name || "Member Portal"}
            </span>
            <span className="text-[9px] sm:text-[10px] font-black text-green-600 flex items-center gap-1.5 uppercase tracking-widest mt-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Identity Node
            </span>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm" className="h-9 rounded-xl text-[10px] font-black uppercase text-primary px-3">
          <Link href={`/loyalty/join/${businessId}`}><ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back</Link>
        </Button>
      </div>
    </header>
  );
}
