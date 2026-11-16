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

export function JoinHeader({
  business,
  portalConfig,
  businessId,
  step,
  setStep,
}: JoinHeaderProps) {
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
          <span className="text-sm sm:text-base font-bold text-slate-900 truncate max-w-[180px]">
            {portalConfig?.storeName || business?.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {step !== "browse" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep("browse")}
              className="h-9 rounded-xl text-xs font-semibold text-slate-600 px-3"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />{" "}
              <span className="hidden sm:inline">Back</span>
            </Button>
          )}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 rounded-xl text-xs font-semibold text-primary border-slate-200 gap-2 px-3"
          >
            <Link href={`/loyalty/track-member/${businessId}`}>
              <SearchCode className="h-4 w-4" />{" "}
              <span className="hidden sm:inline">Member Login</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
