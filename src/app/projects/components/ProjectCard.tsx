"use client";

import { Clock, Globe, AlertCircle, CheckCircle2, User, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Project } from "@/lib/mock-db";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  planning: { label: "Planning", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  "in-progress": { label: "In Progress", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  "on-hold": { label: "On Hold", color: "text-slate-700", bg: "bg-slate-100 border-slate-200" },
  completed: { label: "Completed", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  cancelled: { label: "Cancelled", color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
};

interface ProjectCardProps {
  project: Project;
  stats: { progress: number; total: number; completed?: number };
  onClick: () => void;
  businessUsers?: any[];
}

export function ProjectCard({ project, stats, onClick, businessUsers = [] }: ProjectCardProps) {
  const isOverdue = Boolean(
    project.deadline &&
    new Date(project.deadline) < new Date() &&
    project.status !== "completed"
  );

  const unreadRequests =
    (project as any).clientRequests?.filter((r: any) => !r.isRead).length || 0;

  const statusInfo = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;

  const teamMembers = (project.team || []).map((memberId: string) => {
    const user = businessUsers.find((u: any) => u.id === memberId);
    return {
      id: memberId,
      name: user?.name || user?.email || "Team Member",
      initial: (user?.name || user?.email || "M").charAt(0).toUpperCase(),
    };
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border bg-white p-5 space-y-4 transition-all duration-200 relative shadow-xs hover:shadow-md group",
        isOverdue ? "border-rose-400 ring-1 ring-rose-300/70" : "border-slate-300 hover:border-slate-400"
      )}
    >
      {unreadRequests > 0 && (
        <span
          className="absolute top-3.5 right-3.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-4 ring-rose-100"
          title={`${unreadRequests} unread client requests`}
        />
      )}

      {/* Header: Title + Status Badge */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3 pr-2">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors truncate">
              {project.title}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium text-slate-600 truncate max-w-[180px]">
                {project.clientName || "Direct Client"}
              </span>
              {project.sharePublic && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                  <Globe className="h-2.5 w-2.5" /> Portal
                </span>
              )}
            </div>
          </div>

          <Badge
            variant="outline"
            className={cn("text-xs font-semibold px-2 py-0.5 shrink-0 border", statusInfo.bg, statusInfo.color)}
          >
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      {/* Progress Section */}
      <div className="space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-600">Deliverables Progress</span>
          <span className="font-mono tabular-nums text-slate-900 font-bold">{stats.progress}%</span>
        </div>
        <Progress value={stats.progress} className="h-2 rounded-full bg-slate-200/80" />
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums pt-0.5">
          <span>{stats.total} total deliverables</span>
          {isOverdue && (
            <span className="text-rose-600 font-bold flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Past Deadline
            </span>
          )}
        </div>
      </div>

      {/* Footer: Team Avatars + Target Date */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          {teamMembers.length > 0 ? (
            <div className="flex -space-x-1.5">
              {teamMembers.slice(0, 3).map((m, i) => (
                <div
                  key={i}
                  title={m.name}
                  className="h-6 w-6 rounded-full border-2 border-white bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shadow-xs"
                >
                  {m.initial}
                </div>
              ))}
              {teamMembers.length > 3 && (
                <div className="h-6 w-6 rounded-full border-2 border-white bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                  +{teamMembers.length - 3}
                </div>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <User className="h-3 w-3 text-slate-400" /> Unassigned
            </span>
          )}

          {unreadRequests > 0 && (
            <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] h-5 px-1.5 font-semibold">
              {unreadRequests} inquiry
            </Badge>
          )}
        </div>

        <div
          className={cn(
            "flex items-center gap-1.5 text-xs font-mono tabular-nums font-semibold px-2 py-1 rounded-lg border",
            isOverdue
              ? "text-rose-700 bg-rose-50 border-rose-200"
              : "text-slate-700 bg-slate-50 border-slate-200"
          )}
        >
          <Clock className="h-3 w-3 shrink-0" />
          <span>{project.deadline || "No deadline"}</span>
        </div>
      </div>
    </button>
  );
}
