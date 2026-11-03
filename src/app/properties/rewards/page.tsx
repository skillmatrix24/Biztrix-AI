"use client";

import { useMemo } from "react";
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Users, 
  Crown, 
  Loader2, 
  LayoutList,
  Users2,
  Building
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useUser, 
  useDoc 
} from "@/firebase";
import { collection, query, doc, where } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";

export default function AgentPerformancePage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const currencySymbol = getCurrencySymbol(business?.currency);
  
  const teamQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null
  , [firestore, businessId]);
  const { data: teamMembers, isLoading: isTeamLoading } = useCollection<any>(teamQuery);

  const propertiesQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'properties') : null
  , [firestore, businessId]);
  const { data: properties = [] } = useCollection<any>(propertiesQuery);

  const leadsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'realEstateLeads') : null
  , [firestore, businessId]);
  const { data: reLeads = [] } = useCollection<any>(leadsQuery);

  const leaderboard = useMemo(() => {
    const agents = (teamMembers || []).filter((u: any) => (u.role || '').toLowerCase() === 'agent');
    return agents.map(agent => {
      const assignedAssets = (properties || []).filter((p: any) => p.assignedAgentId === agent.id).length;
      const activeLeads = (reLeads || []).filter((l: any) => l.assignedAgentId === agent.id).length;
      const totalSales = (agent.totalSales || 0);
      return {
        id: agent.id,
        agentName: agent.name || agent.email,
        totalSales,
        assignedAssets,
        activeLeads,
        conversionRate: 15 // Mocked for UI
      };
    }).sort((a, b) => b.totalSales - a.totalSales);
  }, [teamMembers, properties, reLeads]);

  const globalStats = useMemo(() => ({
    totalAgents: leaderboard.length,
    totalPlatformSales: leaderboard.reduce((sum: number, a: any) => sum + (a.totalSales || 0), 0),
  }), [leaderboard]);

  if (isProfileLoading || isTeamLoading) return (
    <div className="flex flex-col items-center justify-center py-20 opacity-40">
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
      <p className="text-xs font-bold uppercase tracking-widest text-primary">Establishing Performance Feed...</p>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 pb-10 px-2 sm:px-0">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center shrink-0 border border-yellow-500/20 shadow-inner">
            <Trophy className="h-6 w-6 md:h-8 md:w-8 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-xl md:text-3xl font-black tracking-tight text-slate-900 leading-tight">Performance & Rewards</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Team Sales Index</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border shadow-sm w-fit">
          <Users2 className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{globalStats.totalAgents} Specialists</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card className="border-none shadow-sm bg-white rounded-2xl p-6 border-border/50">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest">Volume</span>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{currencySymbol}{globalStats.totalPlatformSales.toLocaleString()}</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-2xl p-6 border-l-4 border-l-primary">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest">Target</span>
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-slate-900">85% Hit</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            {leaderboard.slice(0, 3).map((agent: any, i: number) => (
              <Card key={agent.id} className={cn("border-none shadow-md bg-white rounded-3xl overflow-hidden relative group transition-all", i === 0 ? "ring-2 ring-yellow-500" : "")}>
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <div className={cn("h-16 w-16 rounded-[1.5rem] flex items-center justify-center font-black text-xl shadow-lg border-4 border-white", i === 0 ? "bg-yellow-500 text-white" : "bg-slate-200 text-slate-600")}>
                      {agent.agentName?.charAt(0)}
                    </div>
                    {i === 0 && <Crown className="absolute -top-3 -right-3 h-6 w-6 text-yellow-500" />}
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Rank #{i + 1}</p>
                    <h3 className="font-bold text-slate-900 truncate max-w-[150px]">{agent.agentName}</h3>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl font-black text-primary">{currencySymbol}{agent.totalSales?.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border">
            <CardHeader className="bg-muted/30 border-b py-5 px-6"><CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2"><LayoutList className="h-4 w-4" /> Agent Metrics Index</CardTitle></CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Specialist</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center h-12">Pipeline</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center h-12">Success Rate</TableHead>
                    <TableHead className="text-right pr-8 text-[10px] font-black uppercase h-12">Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry: any, idx: number) => (
                    <TableRow key={entry.id} className="group hover:bg-muted/5 transition-colors">
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-black text-slate-400 w-4">#{idx + 1}</span>
                          <span className="text-sm font-bold text-slate-900">{entry.agentName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-1 justify-center">
                          <Badge className="bg-blue-50 text-blue-700 h-4 text-[7px] border-none uppercase">A: {entry.assignedAssets}</Badge>
                          <Badge className="bg-orange-50 text-orange-700 h-4 text-[7px] border-none uppercase">C: {entry.activeLeads}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] font-bold text-primary">{entry.conversionRate}%</span>
                          <Progress value={entry.conversionRate} className="h-0.5 w-10" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <span className="text-sm font-black text-primary">{currencySymbol}{entry.totalSales?.toLocaleString()}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card className="border-none shadow-md bg-slate-900 text-white rounded-[2rem] overflow-hidden border">
            <CardHeader className="p-8 pb-4"><CardTitle className="text-sm font-black uppercase tracking-widest text-accent">Marketplace Rules</CardTitle></CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              <p className="text-xs text-slate-400 leading-relaxed italic">"Performance index is calculated based on active listings in the Property Catalog and customers in the deal pipeline."</p>
              <Separator className="bg-white/10" />
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded bg-white/10 flex items-center justify-center"><Building className="h-3 w-3 text-accent" /></div>
                  <span className="text-[10px] font-black uppercase tracking-tight">Catalog Sync: Active</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded bg-white/10 flex items-center justify-center"><Target className="h-3 w-3 text-accent" /></div>
                  <span className="text-[10px] font-black uppercase tracking-tight">Lead Match: Automatic</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
