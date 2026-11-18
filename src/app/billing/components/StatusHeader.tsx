"use client";

import { FileSpreadsheet, Receipt, RotateCcw, SmartphoneNfc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BillingMode = "pos" | "quotation" | "reward_sync";

interface StatusHeaderProps {
  mode: BillingMode;
  onModeChange: (mode: BillingMode) => void;
  gstMode: string;
  businessState?: string;
  isInterState?: boolean;
  projectId?: string | null;
  hasActiveDraft?: boolean;
  onResetBill?: () => void;
}

const MODE_TABS: Array<{
  id: BillingMode;
  label: string;
  icon: typeof Receipt;
}> = [
  { id: "pos", label: "POS Sale", icon: Receipt },
  { id: "quotation", label: "Quotation", icon: FileSpreadsheet },
  { id: "reward_sync", label: "Reward Sync", icon: SmartphoneNfc },
];

export function StatusHeader({
  mode,
  onModeChange,
  gstMode,
  businessState,
  isInterState,
  projectId,
  hasActiveDraft,
  onResetBill,
}: StatusHeaderProps) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-slate-200 pb-5">
      <div className="space-y-1 text-left">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-primary">Billing &amp; Checkout</span>
          <span aria-hidden="true">/</span>
          <span>
            {mode === "quotation"
              ? "Quotation Builder"
              : mode === "reward_sync"
                ? "External Loyalty Sync"
                : "GST Point of Sale"}
          </span>
          {mode !== "reward_sync" && (
            <>
              <span aria-hidden="true">·</span>
              <span className="capitalize">Tax: {gstMode || "exclusive"}</span>
              <span aria-hidden="true">·</span>
              <span>
                {isInterState ? "IGST (Inter-state)" : `CGST + SGST (${businessState || "Local"})`}
              </span>
            </>
          )}
          {projectId && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-slate-700">Project Milestone Linked</span>
            </>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Billing Hub
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 max-w-full">
        <div
          role="tablist"
          aria-label="Billing mode"
          className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 max-w-full overflow-x-auto scrollbar-hide"
        >
          {MODE_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onModeChange(tab.id)}
                className={cn(
                  "px-3 py-2 sm:py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5",
                  active
                    ? tab.id === "quotation"
                      ? "bg-amber-600 text-white shadow-sm"
                      : tab.id === "reward_sync"
                        ? "bg-emerald-700 text-white shadow-sm"
                        : "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {hasActiveDraft && onResetBill && (
          <Button
            type="button"
            variant="outline"
            onClick={onResetBill}
            className="h-9 px-3 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:text-red-700 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Clear Bill
          </Button>
        )}
      </div>
    </header>
  );
}
