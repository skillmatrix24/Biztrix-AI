
"use client";

import { useState, useMemo } from "react";
import { 
  Briefcase, 
  Search, 
  LayoutList, 
  FolderKanban, 
  CheckCircle2, 
  Clock, 
  Users, 
  ChevronRight, 
  AlertCircle, 
  BarChart3, 
  Zap, 
  Sparkles, 
  Timer, 
  Loader2,
  ShieldAlert
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Project, ProjectStatus, Task, Customer, Lead } from "@/lib/mock-db";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  useUser, 
  useDoc 
} from "@/firebase";
import { collection, query, where, orderBy, doc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Sub-components
import { ProjectCard } from "./components/ProjectCard";
import { AddProjectDialog } from "./components/AddProjectDialog";
import { ProjectAnalytics } from "./components/ProjectAnalytics";

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  'planning': { label: 'Planning', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
  'in-progress': { label: 'Working', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
  'on-hold': { label: 'On Hold', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-100' },
  'completed': { label: 'Done', color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
  'cancelled': { label: 'Closed', color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
};

export default function ProjectsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const projectsQuery = useMemoFirebase(() => businessId ? query(collection(firestore, 'businesses', businessId, 'projects'), orderBy('createdAt', 'desc')) : null, [firestore, businessId]);
  const { data: projectsData, isLoading: isProjectsLoading } = useCollection<Project>(projectsQuery);
  const projects = projectsData || [];

  const tasksQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'tasks') : null, [firestore, businessId]);
  const { data: tasksData } = useCollection<Task>(tasksQuery);
  const tasks = tasksData || [];

  const staffQuery = useMemoFirebase(() => businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null, [firestore, businessId]);
  const { data: businessUsersData } = useCollection<any>(staffQuery);
  const businessUsers = businessUsersData || [];

  const customersQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'customers') : null, [firestore, businessId]);
  const { data: customersListData } = useCollection<Customer>(customersQuery);
  const customersList = customersListData || [];

  const leadsQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'leads') : null, [firestore, businessId]);
  const { data: leadsListData } = useCollection<Lead>(leadsQuery);
  const leadsList = leadsListData || [];

  const [activeTab, setActiveTab] = useState("board");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const filteredProjects = useMemo(() => projects.filter(p => p.title?.toLowerCase().includes(searchTerm.toLowerCase()) || p.clientName?.toLowerCase().includes(searchTerm.toLowerCase())), [projects, searchTerm]);

  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(p => p.status === 'in-progress').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const delayed = projects.filter(p => p.status !== 'completed' && p.deadline && new Date(p.deadline) < new Date()).length;
    const statusDist = (Object.keys(STATUS_CONFIG) as ProjectStatus[]).map(s => ({ name: STATUS_CONFIG[s].label, value: projects.filter(p => p.status === s).length }));
    return { total, active, completed, delayed, statusDist };
  }, [projects]);

  const getProjectStats = (projectId: string) => {
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    const completed = projectTasks.filter(t => t.status === 'completed').length;
    const total = projectTasks.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, progress };
  };

  const handleAddProject = (formData: any) => {
    if (!businessId || !user?.uid) return;
    const { initialTasks, ...projectData } = formData;
    const sourceList = projectData.clientType === 'customer' ? customersList : leadsList;
    const client = sourceList.find(c => c.id === projectData.clientId);
    
    const projectsRef = collection(firestore, 'businesses', businessId, 'projects');
    const tasksRef = collection(firestore, 'businesses', businessId, 'tasks');
    const notificationsRef = collection(firestore, 'businesses', businessId, 'notifications');

    addDocumentNonBlocking(projectsRef, { 
      ...projectData, 
      status: 'planning', 
      clientName: client?.name || 'No Client', 
      sharePublic: false, 
      createdAt: serverTimestamp(), 
      updatedAt: serverTimestamp() 
    }).then((docRef) => {
      if (!docRef) return;

      // NOTIFICATION: Trigger project involvement alert for the team
      if (projectData.team && projectData.team.length > 0) {
        projectData.team.forEach((memberId: string) => {
          addDocumentNonBlocking(notificationsRef, {
            businessId,
            recipientId: memberId,
            projectId: docRef.id,
            title: "Added to Project",
            message: `You have been assigned to project: ${projectData.title}`,
            type: 'message',
            isRead: false,
            createdAt: serverTimestamp()
          });
        });
      }

      if (initialTasks && initialTasks.length > 0) {
        initialTasks.forEach((task: any) => {
          addDocumentNonBlocking(tasksRef, {
            ...task,
            projectId: docRef.id,
            assignedTo: projectData.team[0] || '',
            assignedName: businessUsers.find(u => u.id === projectData.team[0])?.name || 'Unassigned',
            status: 'pending',
            remindWhatsApp: true,
            repeat: 'none',
            createdAt: serverTimestamp()
          });
        });
      }
    });

    setIsAddOpen(false);
    toast({ title: "Project Launched", description: `${initialTasks?.length || 0} tasks initialized with AI.` });
  };

  const handleNavigateToProject = (id: string) => {
    router.push(`/projects/${id}`);
  };

  if (isProfileLoading || isProjectsLoading) return <div className="flex flex-col items-center justify-center py-20 opacity-40"><Loader2 className="h-10 w-10 animate-spin text-primary mb-4" /><p className="text-xs font-bold uppercase tracking-widest text-primary">Loading Projects...</p></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-xl shadow-primary/10 border border-primary/20">
            <Briefcase className="h-6 w-6 text-white" />
          </div>
          <div className="text-left">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 leading-none uppercase">Project Manager</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground font-medium uppercase mt-1 tracking-widest opacity-60">Team Delivery OS</p>
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <AddProjectDialog 
            isOpen={isAddOpen} 
            onOpenChange={setIsAddOpen} 
            onSubmit={handleAddProject} 
            customersList={customersList} 
            leadsList={leadsList} 
            businessUsers={businessUsers} 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {[
          { label: "Total Nodes", value: stats.total, icon: Briefcase, color: "text-primary", bg: "bg-primary/5" },
          { label: "Working", value: stats.active, icon: Timer, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Closed", value: stats.completed, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "Delayed", value: stats.delayed, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
        ].map((s, i) => (
          <Card key={i} className={cn("border-none shadow-sm rounded-2xl overflow-hidden group hover:shadow-md transition-all text-left", s.bg)}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                <s.icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", s.color)} />
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-9 space-y-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col xl:flex-row items-center justify-between gap-6 mb-8 px-1">
              <TabsList className="bg-white border h-12 p-1.5 rounded-xl shadow-sm w-full xl:w-auto overflow-x-auto scrollbar-hide flex">
                <TabsTrigger value="board" className="flex-1 text-[9px] sm:text-[10px] font-black uppercase px-6 gap-2 whitespace-nowrap">
                  <FolderKanban className="h-3.5 w-3.5" /> Board
                </TabsTrigger>
                <TabsTrigger value="list" className="flex-1 text-[9px] sm:text-[10px] font-black uppercase px-6 gap-2 whitespace-nowrap">
                  <LayoutList className="h-3.5 w-3.5" /> Table
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex-1 text-[9px] sm:text-[10px] font-black uppercase px-6 gap-2 whitespace-nowrap">
                  <BarChart3 className="h-3.5 w-3.5" /> Analytics
                </TabsTrigger>
              </TabsList>
              <div className="relative w-full xl:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-40" />
                <Input 
                  placeholder="Search project name..." 
                  className="h-11 pl-10 text-xs bg-white border-none shadow-inner rounded-xl w-full font-bold" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
            </div>

            <TabsContent value="board" className="mt-0 outline-none space-y-12">
              {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map((status) => {
                const statusProjects = filteredProjects.filter(p => p.status === status);
                if (statusProjects.length === 0) return null;

                return (
                  <div key={status} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 text-left px-1">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-4">
                        <div className={cn("h-2.5 w-2.5 rounded-full shadow-sm", STATUS_CONFIG[status].color.replace('text-', 'bg-'))} />
                        <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-500">{STATUS_CONFIG[status].label}</h3>
                        <Badge variant="secondary" className="text-[9px] h-4 py-0 font-bold px-2 border-none bg-muted text-slate-400">{statusProjects.length}</Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {statusProjects.map(p => (
                          <ProjectCard key={p.id} project={p} stats={getProjectStats(p.id)} onClick={() => handleNavigateToProject(p.id)} />
                        ))}
                    </div>
                    <div className="py-4 flex items-center gap-4 opacity-10">
                      <div className="h-[2px] bg-primary flex-1" />
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <div className="h-[2px] bg-primary flex-1" />
                    </div>
                  </div>
                );
              })}
              {filteredProjects.length === 0 && (
                <div className="py-40 text-center bg-white rounded-[2.5rem] border border-dashed opacity-30">
                  <Briefcase className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-sm font-black uppercase tracking-widest">No projects in registry.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="list" className="mt-0 outline-none">
              <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border border-border/50 text-left">
                <div className="overflow-x-auto scrollbar-hide">
                  <Table className="min-w-[1000px]">
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Project Name</TableHead>
                        <TableHead className="text-[10px] font-black uppercase h-12">Client Identity</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-center h-12">Current Status</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-center h-12">Progress</TableHead>
                        <TableHead className="text-right pr-8 text-[10px] font-black uppercase h-12">Target Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProjects.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="h-40 text-center opacity-30 italic text-sm uppercase">Registry is empty.</TableCell></TableRow>
                      ) : filteredProjects.map(p => {
                        const stats = getProjectStats(p.id);
                        const statusInfo = STATUS_CONFIG[p.status] || STATUS_CONFIG['planning'];
                        return (
                          <TableRow key={p.id} className="group hover:bg-muted/5 transition-colors cursor-pointer border-b" onClick={() => handleNavigateToProject(p.id)}>
                            <TableCell className="pl-8 py-5">
                              <span className="text-sm font-bold text-primary group-hover:underline uppercase tracking-tight">{p.title}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-700">{p.clientName}</span>
                                <span className="text-[8px] font-black uppercase opacity-40">{p.clientType} Node</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={cn("text-[8px] h-4 w-fit px-2 uppercase font-black border-none mx-auto shadow-sm", statusInfo.bg, statusInfo.color)}>
                                {statusInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-black text-primary">{stats.progress}%</span>
                                <Progress value={stats.progress} className="h-1 w-20" />
                              </div>
                            </TableCell>
                            <TableCell className="pr-8 text-right text-xs font-black text-slate-400 uppercase">{p.deadline || '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="mt-0 outline-none">
              <ProjectAnalytics stats={stats} projects={projects} getProjectStats={getProjectStats} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-3 space-y-8 text-left">
          <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2rem] overflow-hidden border">
            <CardHeader className="bg-white/5 border-b border-white/5 py-6 px-8 text-left">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                <Sparkles className="h-4 w-4 fill-accent" /> AI Manager Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md text-left">
                <p className="text-xs leading-relaxed italic text-slate-300">
                  "Looks like <strong>{stats.delayed} projects</strong> are running late. Try assigning more specialists to clear the backlog."
                </p>
              </div>
              <Button variant="ghost" className="w-full justify-between h-12 px-6 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase rounded-2xl border border-white/10 transition-all">
                Optimize Schedule <ChevronRight className="h-4 w-4 text-accent" />
              </Button>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border border-border/50">
            <CardHeader className="bg-muted/30 border-b py-5 px-8 text-left">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                <Users className="h-4 w-4" /> Team Roster
              </CardTitle>
            </CardHeader>
            <div className="p-2 space-y-1">
              {businessUsers.slice(0, 6).map((u, i) => (
                <div key={i} className="p-4 rounded-2xl flex items-center gap-4 hover:bg-muted/5 transition-all group">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-xs uppercase shadow-inner border border-primary/5 transition-transform group-hover:scale-105">
                    {u.name?.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tight">{u.name}</p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase mt-0.5">{u.role}</p>
                  </div>
                  <ChevronRight className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
              ))}
            </div>
            <CardFooter className="p-4 border-t bg-muted/5">
              <Button asChild variant="ghost" className="w-full h-9 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-transparent">
                <Link href="/staff">View Complete Team</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
