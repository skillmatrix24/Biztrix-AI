import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: string;
  backHref?: string;
  backLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  backHref,
  backLabel = "Back",
  icon: Icon,
  iconClassName,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3.5 md:flex-row md:items-start lg:items-center md:justify-between border-b border-slate-200 pb-4 sm:pb-5 text-left min-w-0",
        className
      )}
    >
      <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
        {backHref && (
          <Button
            asChild
            variant="outline"
            size="icon"
            aria-label={backLabel}
            className="h-10 w-10 rounded-xl bg-white border-slate-200 shrink-0"
          >
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4 text-slate-700" />
            </Link>
          </Button>
        )}
        {Icon && !backHref && (
          <div
            className={cn(
              "h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5 sm:mt-0",
              iconClassName
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-0.5">
          {breadcrumb && (
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
              {breadcrumb}
            </p>
          )}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 break-words leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-words">
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto md:justify-end min-w-0 [&>div]:max-w-full">
          {actions}
        </div>
      )}
    </div>
  );
}

interface OverviewBannerProps {
  title: string;
  subtitle?: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  rightSlot?: React.ReactNode;
  className?: string;
}

export function OverviewBanner({
  title,
  subtitle,
  description,
  icon: Icon,
  rightSlot,
  className,
}: OverviewBannerProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-slate-900 text-white p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-5 text-left min-w-0 overflow-hidden",
        className
      )}
    >
      <div className="space-y-2.5 sm:space-y-3 min-w-0 flex-1">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          {Icon && (
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {subtitle && (
              <p className="text-xs font-medium text-slate-300 truncate">{subtitle}</p>
            )}
            <h2 className="text-base sm:text-lg font-bold text-white break-words leading-snug">
              {title}
            </h2>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-3xl break-words">
          {description}
        </p>
      </div>

      {rightSlot && (
        <div className="w-full lg:w-auto shrink-0 flex flex-wrap items-center gap-2.5">
          {rightSlot}
        </div>
      )}
    </div>
  );
}

interface KpiStatCardProps {
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "default" | "dark" | "positive" | "warning" | "danger";
  className?: string;
}

export function KpiStatCard({
  label,
  value,
  subtext,
  icon: Icon,
  tone = "default",
  className,
}: KpiStatCardProps) {
  const isDark = tone === "dark";
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 sm:p-5 text-left space-y-1.5 sm:space-y-2 transition-all duration-200 min-w-0 overflow-hidden shadow-xs",
        isDark
          ? "border-slate-900 bg-slate-900 text-white"
          : tone === "warning"
            ? "border-amber-300 bg-amber-50/40 text-slate-900 hover:border-amber-400"
            : tone === "danger"
              ? "border-rose-300 bg-rose-50/40 text-slate-900 hover:border-rose-400"
              : tone === "positive"
                ? "border-emerald-300 bg-emerald-50/40 text-slate-900 hover:border-emerald-400"
                : "border-slate-300 bg-white text-slate-900 hover:border-slate-400",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <p
          className={cn(
            "text-xs font-semibold leading-snug break-words min-w-0",
            isDark ? "text-slate-300" : "text-slate-600"
          )}
        >
          {label}
        </p>
        {Icon && (
          <div
            className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border",
              isDark
                ? "bg-white/10 text-white border-white/10"
                : tone === "warning"
                  ? "bg-amber-100/80 text-amber-800 border-amber-200"
                  : tone === "danger"
                    ? "bg-rose-100/80 text-rose-800 border-rose-200"
                    : tone === "positive"
                      ? "bg-emerald-100/80 text-emerald-800 border-emerald-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div
        className={cn(
          "text-lg sm:text-xl xl:text-2xl font-bold tracking-tight tabular-nums font-mono break-words leading-tight min-w-0",
          isDark
            ? "text-white"
            : tone === "positive"
              ? "text-emerald-700"
              : tone === "warning"
                ? "text-amber-700"
                : tone === "danger"
                  ? "text-rose-700"
                  : "text-slate-900"
        )}
      >
        {value}
      </div>
      {subtext && (
        <p
          className={cn(
            "text-[11px] sm:text-xs tabular-nums leading-relaxed break-words",
            isDark ? "text-slate-300" : "text-slate-500"
          )}
        >
          {subtext}
        </p>
      )}
    </div>
  );
}

interface SectionCardProps {
  title?: string;
  description?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function SectionCard({
  title,
  description,
  headerRight,
  children,
  className,
  bodyClassName,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-300 bg-white overflow-hidden text-left min-w-0 max-w-full shadow-xs",
        className
      )}
    >
      {(title || headerRight) && (
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 min-w-0">
          <div className="space-y-0.5 min-w-0 flex-1">
            {title && (
              <h3 className="text-sm sm:text-base font-bold text-slate-900 break-words leading-snug">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-xs text-slate-500 leading-relaxed break-words">
                {description}
              </p>
            )}
          </div>
          {headerRight && (
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:justify-end min-w-0">
              {headerRight}
            </div>
          )}
        </div>
      )}
      <div className={cn("p-4 sm:p-6 min-w-0", bodyClassName)}>{children}</div>
    </section>
  );
}

interface EmptyStatePanelProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyStatePanel({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStatePanelProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 sm:p-10 text-center flex flex-col items-center justify-center space-y-3",
        className
      )}
    >
      {Icon && (
        <div className="h-11 w-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="space-y-1 max-w-md">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      </div>
      {action && <div className="pt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
