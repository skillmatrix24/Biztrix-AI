"use client";

import { SearchCode, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface JoinHeaderProps {
  business: any;
  portalConfig: any;
  businessId: string;
  step: string;
  setStep: (step: any) => void;
}

export function JoinHeader({ business, portalConfig, businessId, step, setStep }: JoinHeaderProps) {
  const portalLogo = portalConfig?.logoUrl || business?.logoUrl;

  return (
    <header className="sticky top-0 z-50 bg-white border-b h-16 sm:h-20 flex items-center shadow-sm">
      <div className="max-w-6xl mx-auto px-4 w-full flex items-center justify-between text-left">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 text-left">
          <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-border/10 shrink-0 overflow-hidden text-left">
            {portalLogo ? (
              <img src={portalLogo} className="h-full w-full object-cover" alt="Logo" />
            ) : (
              <div className="h-full w-full bg-primary flex items-center justify-center text-white font-black text-sm">
                {business?.name?.charAt(0) || "B"}
              </div>
            )}
          </div>
          <span className="text-sm font-black text-slate-900 uppercase tracking-tighter truncate max-w-[150px]">
            {portalConfig?.storeName || business?.name}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {step !== 'browse' && (
            <Button variant="ghost" size="sm" onClick={() => setStep('browse')} className="h-9 rounded-xl text-[10px] font-black uppercase text-muted-foreground px-3">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> <span className="hidden sm:inline">Back</span>
            </Button>
          )}
          <Button asChild variant="ghost" className="h-9 rounded-xl text-[10px] font-black uppercase text-primary gap-2 px-3">
            <Link href={`/loyalty/track-member/${businessId}`}>
              <SearchCode className="h-4 w-4" /> <span className="hidden sm:inline">Member Login</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
