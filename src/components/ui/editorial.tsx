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
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 text-left",
        className
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0">
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
              "h-11 w-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0",
              iconClassName
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 space-y-0.5">
          {breadcrumb && (
            <p className="text-xs font-medium text-slate-500 truncate">{breadcrumb}</p>
          )}
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900 truncate">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{description}</p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>
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
        "rounded-2xl bg-slate-900 text-white p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 text-left",
        className
      )}
    >
      <div className="space-y-3 min-w-0">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="min-w-0">
            {subtitle && (
              <p className="text-xs font-medium text-slate-300 truncate">{subtitle}</p>
            )}
            <h2 className="text-lg font-bold text-white truncate">{title}</h2>
          </div>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed max-w-3xl">{description}</p>
      </div>

      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
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
        "rounded-2xl border p-5 text-left space-y-2 transition-colors",
        isDark
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-900",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            "text-xs font-medium",
            isDark ? "text-slate-300" : "text-slate-500"
          )}
        >
          {label}
        </p>
        {Icon && (
          <div
            className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
              isDark ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div
        className={cn(
          "text-2xl font-bold tracking-tight tabular-nums font-mono",
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
            "text-xs tabular-nums",
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
        "rounded-2xl border border-slate-200 bg-white overflow-hidden text-left",
        className
      )}
    >
      {(title || headerRight) && (
        <div className="px-5 py-4 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            {title && (
              <h3 className="text-base font-bold text-slate-900 truncate">{title}</h3>
            )}
            {description && (
              <p className="text-xs text-slate-500">{description}</p>
            )}
          </div>
          {headerRight && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">{headerRight}</div>
          )}
        </div>
      )}
      <div className={cn("p-5 sm:p-6", bodyClassName)}>{children}</div>
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
        "rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 sm:p-10 text-center flex flex-col items-center justify-center space-y-3",
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
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
