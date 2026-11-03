
"use client";

import { Clock, Globe, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.status !== 'completed';
  
  // Calculate if there are UNREAD client requests
  const unreadRequests = (project as any).clientRequests?.filter((r: any) => !r.isRead).length || 0;

  return (
    <Card 
      className={cn(
        "border-none shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group bg-white overflow-hidden rounded-2xl relative",
        isOverdue ? "ring-1 ring-red-500/30" : "hover:ring-1 hover:ring-primary/20"
      )}
      onClick={onClick}
    >
      {/* Notification Dot for UNREAD Client Messages */}
      {unreadRequests > 0 && (
        <div className="absolute top-3 right-3 z-10">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
          </span>
        </div>
      )}

      <CardContent className="p-5 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1 min-w-0">
            <h4 className="text-sm font-bold text-primary truncate tracking-tight">{project.title}</h4>
            <div className="flex items-center gap-2">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter truncate">{project.clientName}</p>
              {project.sharePublic && <Globe className="h-2.5 w-2.5 text-green-600 shrink-0" />}
            </div>
          </div>
          <div className="flex -space-x-1 shrink-0">
            {(project.team || []).slice(0, 2).map((tid, i) => (
              <div key={i} className="h-6 w-6 rounded-md border-2 border-white bg-primary text-white flex items-center justify-center text-[8px] font-bold uppercase">
                {tid.charAt(0)}
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-widest">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-primary">{stats.progress}%</span>
          </div>
          <Progress value={stats.progress} className="h-1 rounded-full" />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-muted/50">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-muted-foreground uppercase">{stats.total} Tasks</span>
            {unreadRequests > 0 && (
              <Badge variant="secondary" className="bg-red-50 text-red-600 border-none text-[7px] h-3.5 px-1 font-bold">
                {unreadRequests} NEW
              </Badge>
            )}
          </div>
          <div className={cn(
            "flex items-center gap-1 text-[9px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded",
            isOverdue ? "text-red-600 bg-red-50" : "text-muted-foreground bg-muted/30"
          )}>
            <Clock className="h-3 w-3" /> {project.deadline ? project.deadline.split('-').slice(1).reverse().join('/') : 'Soon'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
