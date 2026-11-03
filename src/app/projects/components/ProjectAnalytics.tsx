
"use client";

import { PieChart as PieChartIcon, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  Cell,
  PieChart,
  Pie
} from "recharts";

interface ProjectAnalyticsProps {
  stats: any;
  projects: any[];
  getProjectStats: (id: string) => any;
}

export function ProjectAnalytics({ stats, projects, getProjectStats }: ProjectAnalyticsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden border">
        <CardHeader className="bg-muted/30 border-b py-5">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" /> Current Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.statusDist}
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
              >
                {stats.statusDist.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={index === 1 ? '#0C83B3' : index === 3 ? '#22c55e' : '#e2e8f0'} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden border">
        <CardHeader className="bg-muted/30 border-b py-5">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Completion Rates
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projects.slice(0, 5).map(p => ({ name: p.title.slice(0, 8), prog: getProjectStats(p.id).progress }))}>
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis hide />
              <RechartsTooltip cursor={{fill: 'transparent'}} />
              <Bar dataKey="prog" radius={[4, 4, 0, 0]} fill="#0C83B3" barSize={25} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
