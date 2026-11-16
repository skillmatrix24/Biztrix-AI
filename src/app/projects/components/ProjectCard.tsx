"use client";

import { Clock, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Project } from "@/lib/mock-db";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
  stats: { progress: number; total: number };
  onClick: () => void;
}

export function ProjectCard({ project, stats, onClick }: ProjectCardProps) {
  const isOverdue =
    project.deadline &&
    new Date(project.deadline) < new Date() &&
    project.status !== "completed";

  const unreadRequests =
    (project as any).clientRequests?.filter((r: any) => !r.isRead).length || 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border bg-white p-4 space-y-3.5 transition-colors relative hover:bg-slate-50/70",
        isOverdue ? "border-rose-200" : "border-slate-200"
      )}
    >
      {unreadRequests > 0 && (
        <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-rose-500" />
      )}

      <div className="flex justify-between items-start gap-3">
        <div className="space-y-0.5 min-w-0">
          <h4 className="text-sm font-semibold text-slate-900 truncate">
            {project.title}
          </h4>
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-slate-500 truncate">{project.clientName}</p>
            {project.sharePublic && (
              <Globe className="h-3 w-3 text-emerald-600 shrink-0" />
            )}
          </div>
        </div>
        <div className="flex -space-x-1 shrink-0">
          {(project.team || []).slice(0, 2).map((tid, i) => (
            <div
              key={i}
              className="h-6 w-6 rounded-md border border-white bg-slate-900 text-white flex items-center justify-center text-[11px] font-semibold"
            >
              {tid.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-slate-500">Progress</span>
          <span className="font-mono tabular-nums text-slate-900">{stats.progress}%</span>
        </div>
        <Progress value={stats.progress} className="h-1.5 rounded-full" />
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {stats.total} Tasks
          </span>
          {unreadRequests > 0 && (
            <Badge
              variant="secondary"
              className="bg-rose-50 text-rose-700 border-none text-[11px] h-5 px-1.5"
            >
              {unreadRequests} new
            </Badge>
          )}
        </div>
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-mono tabular-nums px-2 py-0.5 rounded-md",
            isOverdue
              ? "text-rose-700 bg-rose-50"
              : "text-slate-600 bg-slate-100"
          )}
        >
          <Clock className="h-3 w-3" />
          {project.deadline
            ? project.deadline.split("-").slice(1).reverse().join("/")
            : "Soon"}
        </div>
      </div>
    </button>
  );
}
