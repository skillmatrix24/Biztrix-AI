"use client";

import { PieChart as PieChartIcon, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { SectionCard } from "@/components/ui/editorial";

interface ProjectAnalyticsProps {
  stats: any;
  projects: any[];
  getProjectStats: (id: string) => any;
}

export function ProjectAnalytics({
  stats,
  projects,
  getProjectStats,
}: ProjectAnalyticsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <SectionCard
        title="Current Distribution"
        description="Projects grouped by workflow status"
        headerRight={<PieChartIcon className="h-4 w-4 text-slate-500" />}
      >
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.statusDist}
                innerRadius={50}
                outerRadius={74}
                paddingAngle={4}
                dataKey="value"
              >
                {stats.statusDist.map((_entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 1 ? "#0f172a" : index === 3 ? "#10b981" : "#cbd5e1"}
                  />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard
        title="Completion Rates"
        description="Task completion percentage across top projects"
        headerRight={<TrendingUp className="h-4 w-4 text-slate-500" />}
      >
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={projects.slice(0, 5).map((p) => ({
                name: p.title.slice(0, 10),
                prog: getProjectStats(p.id).progress,
              }))}
            >
              <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis hide />
              <RechartsTooltip cursor={{ fill: "transparent" }} />
              <Bar dataKey="prog" radius={[6, 6, 0, 0]} fill="#0f172a" barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
