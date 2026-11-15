"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, ArrowUpRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CoreQuotaEvaluation } from "@/lib/marketplace-catalog";
import { cn } from "@/lib/utils";

interface CoreQuotaBannerProps {
  quota: CoreQuotaEvaluation;
  className?: string;
}

export function CoreQuotaBanner({ quota, className }: CoreQuotaBannerProps) {
  if (quota.isUnlocked && !quota.isReached) {
    return null;
  }

  const nearLimit =
    !quota.isLockedByMode &&
    !quota.isReached &&
    quota.limit > 0 &&
    quota.limit < 999999 &&
    quota.current >= Math.max(1, Math.floor(quota.limit * 0.8));

  if (!quota.isLockedByMode && !quota.isReached && !nearLimit) {
    return null;
  }

  const isHardBlocked = quota.isLockedByMode || quota.isReached;
  const Icon = quota.isLockedByMode ? Lock : AlertCircle;

  const headline = quota.isLockedByMode
    ? `${quota.menu.label} requires ${quota.menu.addonLabel}`
    : quota.isReached
      ? `${quota.menu.label} quota reached (${quota.current.toLocaleString()} / ${quota.limit.toLocaleString()} ${quota.menu.quotaUnit})`
      : `${quota.remaining.toLocaleString()} ${quota.menu.quotaUnit} remaining on Free Core OS (${quota.current.toLocaleString()} / ${quota.limit.toLocaleString()})`;

  const description = quota.isLockedByMode
    ? `Activate ${quota.menu.addonLabel} or ${quota.menu.suiteLabel} in Marketplace to unlock this workspace.`
    : quota.isUnlocked
      ? `You have reached the monthly module allowance of ${quota.limit.toLocaleString()} ${quota.menu.quotaUnit}.`
      : `Upgrade to ${quota.menu.addonLabel} or ${quota.menu.suiteLabel} for unlimited ${quota.menu.label.toLowerCase()} capacity.`;

  return (
    <div
      role="status"
      className={cn(
        "rounded-2xl border px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left",
        isHardBlocked
          ? "border-amber-200 bg-amber-50/80 text-amber-950"
          : "border-slate-200 bg-slate-50/80 text-slate-900",
        className
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 mt-0.5",
            isHardBlocked ? "text-amber-700" : "text-slate-600"
          )}
        />
        <div className="space-y-0.5 min-w-0">
          <p className="text-xs sm:text-sm font-semibold tabular-nums">{headline}</p>
          <p
            className={cn(
              "text-xs leading-relaxed",
              isHardBlocked ? "text-amber-800" : "text-slate-600"
            )}
          >
            {description}
          </p>
        </div>
      </div>

      <Button
        asChild
        size="sm"
        variant={isHardBlocked ? "default" : "outline"}
        className="h-9 rounded-xl px-4 text-xs font-semibold whitespace-nowrap shrink-0"
      >
        <Link href={`/marketplace/features/${quota.menu.addonId}`}>
          Unlock Unlimited
          <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
