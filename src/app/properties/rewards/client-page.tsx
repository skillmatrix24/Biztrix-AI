"use client";

import { useMemo } from "react";
import {
  Target,
  TrendingUp,
  Crown,
  Loader2,
  LayoutList,
  Users2,
  Building,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  PageHeader,
  KpiStatCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
} from "@/firebase";
import { collection, query, doc, where } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";

export default function AgentPerformancePage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const teamQuery = useMemoFirebase(
    () =>
      businessId
        ? query(collection(firestore, "users"), where("businessId", "==", businessId))
        : null,
    [firestore, businessId]
  );
  const { data: teamMembers, isLoading: isTeamLoading } =
    useCollection<any>(teamQuery);

  const propertiesQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(firestore, "businesses", businessId, "properties")
        : null,
    [firestore, businessId]
  );
  const { data: properties = [] } = useCollection<any>(propertiesQuery);

  const leadsQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(firestore, "businesses", businessId, "realEstateLeads")
        : null,
    [firestore, businessId]
  );
  const { data: reLeads = [] } = useCollection<any>(leadsQuery);

  const leaderboard = useMemo(() => {
    const agents = (teamMembers || []).filter(
      (u: any) => (u.role || "").toLowerCase() === "agent"
    );
    return agents
      .map((agent) => {
        const assignedAssets = (properties || []).filter(
          (p: any) => p.assignedAgentId === agent.id
        ).length;
        const activeLeads = (reLeads || []).filter(
          (l: any) => l.assignedAgentId === agent.id
        ).length;
        const totalSales = agent.totalSales || 0;
        const closedDeals = (reLeads || []).filter(
          (l: any) =>
            l.assignedAgentId === agent.id && l.leadStage === "won"
        ).length;
        const conversionRate =
          activeLeads > 0 ? Math.round((closedDeals / activeLeads) * 100) : 0;

        return {
          id: agent.id,
          agentName: agent.name || agent.email,
          totalSales,
          assignedAssets,
          activeLeads,
          conversionRate,
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales);
  }, [teamMembers, properties, reLeads]);

  const globalStats = useMemo(
    () => ({
      totalAgents: leaderboard.length,
      totalPlatformSales: leaderboard.reduce(
        (sum: number, a: any) => sum + (a.totalSales || 0),
        0
      ),
      avgConversion:
        leaderboard.length > 0
          ? Math.round(
              leaderboard.reduce(
                (sum: number, a: any) => sum + a.conversionRate,
                0
              ) / leaderboard.length
            )
          : 0,
    }),
    [leaderboard]
  );

  if (isProfileLoading || isTeamLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-slate-400" />
        <p className="text-xs font-medium text-slate-500">
          Loading team performance metrics...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 text-left">
      <PageHeader
        breadcrumb="Real Estate CRM"
        title="Performance & Rewards"
        description="Agent leaderboard tracking active listings, customer leads, and closed deal volume."
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700">
            <Users2 className="h-4 w-4 text-slate-500" />
            <span className="font-mono">{globalStats.totalAgents}</span> Agents
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiStatCard
          label="Total Sales Volume"
          value={`${currencySymbol}${globalStats.totalPlatformSales.toLocaleString()}`}
          icon={TrendingUp}
          tone="positive"
        />
        <KpiStatCard
          label="Average Conversion Rate"
          value={`${globalStats.avgConversion}%`}
          icon={Target}
        />
        <KpiStatCard
          label="Active Property Agents"
          value={globalStats.totalAgents}
          icon={Users2}
          tone="dark"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {leaderboard.length === 0 ? (
            <EmptyStatePanel
              icon={Users2}
              title="No agents registered yet"
              description="Team members with the Agent role appear here with live property and lead counts."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {leaderboard.slice(0, 3).map((agent: any, i: number) => (
                  <Card
                    key={agent.id}
                    className={cn(
                      "rounded-2xl border bg-white",
                      i === 0 ? "border-amber-400" : "border-slate-200"
                    )}
                  >
                    <CardContent className="flex flex-col items-center space-y-3 p-5 text-center">
                      <div className="relative">
                        <div
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-xl text-base font-bold",
                            i === 0
                              ? "bg-amber-500 text-white"
                              : "bg-slate-100 text-slate-700"
                          )}
                        >
                          {agent.agentName?.charAt(0)}
                        </div>
                        {i === 0 && (
                          <Crown className="absolute -right-2 -top-2 h-5 w-5 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-mono text-xs text-slate-500">
                          Rank #{i + 1}
                        </p>
                        <h3 className="max-w-[160px] truncate text-sm font-semibold text-slate-900">
                          {agent.agentName}
                        </h3>
                      </div>
                      <p className="font-mono text-lg font-bold tabular-nums text-slate-900">
                        {currencySymbol}
                        {agent.totalSales?.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <LayoutList className="h-4 w-4 text-slate-600" /> Agent Metrics Index
                  </CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-100 bg-slate-50/40">
                        <TableHead className="h-11 pl-6 text-xs font-semibold text-slate-600">
                          Agent
                        </TableHead>
                        <TableHead className="h-11 text-center text-xs font-semibold text-slate-600">
                          Pipeline
                        </TableHead>
                        <TableHead className="h-11 text-center text-xs font-semibold text-slate-600">
                          Conversion
                        </TableHead>
                        <TableHead className="h-11 pr-6 text-right text-xs font-semibold text-slate-600">
                          Sales Volume
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map((entry: any, idx: number) => (
                        <TableRow
                          key={entry.id}
                          className="border-slate-100 hover:bg-slate-50/60"
                        >
                          <TableCell className="py-4 pl-6">
                            <div className="flex items-center gap-3">
                              <span className="w-6 font-mono text-xs text-slate-400">
                                #{idx + 1}
                              </span>
                              <span className="text-sm font-semibold text-slate-900">
                                {entry.agentName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1.5">
                              <Badge className="border-none bg-blue-50 text-xs font-medium text-blue-700">
                                Listings: {entry.assignedAssets}
                              </Badge>
                              <Badge className="border-none bg-amber-50 text-xs font-medium text-amber-700">
                                Leads: {entry.activeLeads}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-mono text-xs font-semibold text-slate-800">
                                {entry.conversionRate}%
                              </span>
                              <Progress
                                value={entry.conversionRate}
                                className="h-1 w-14"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                              {currencySymbol}
                              {entry.totalSales?.toLocaleString()}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </>
          )}
        </div>

        <div className="lg:col-span-4">
          <Card className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-white">
            <CardHeader className="p-6 pb-3">
              <CardTitle className="text-sm font-semibold text-white">
                Scoring Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6 pt-0">
              <p className="text-xs leading-relaxed text-slate-300">
                Performance metrics are computed live from assigned property listings and closed deals in the real estate lead pipeline.
              </p>
              <Separator className="bg-white/10" />
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
                    <Building className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <span className="text-xs font-medium text-slate-200">
                    Catalog Sync: Live
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
                    <Target className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <span className="text-xs font-medium text-slate-200">
                    Lead Conversion: Automated
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
