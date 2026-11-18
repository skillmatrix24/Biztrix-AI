
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
import { PageHeader, KpiStatCard, SectionCard, EmptyStatePanel } from "@/components/ui/editorial";
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

  if (isProfileLoading || isProjectsLoading) return <div className="flex flex-col items-center justify-center py-20 opacity-60"><Loader2 className="h-8 w-8 animate-spin text-primary mb-3" /><p className="text-xs font-medium text-slate-600">Loading projects...</p></div>;

  return (
    <div className="space-y-6 pb-20 text-left">
      <PageHeader
        breadcrumb="Back Office / Delivery"
        title="Project Manager"
        description="Coordinate client delivery, milestones, tasks, and team utilization."
        icon={Briefcase}
        actions={
          <AddProjectDialog 
            isOpen={isAddOpen} 
            onOpenChange={setIsAddOpen} 
            onSubmit={handleAddProject} 
            customersList={customersList} 
            leadsList={leadsList} 
            businessUsers={businessUsers} 
          />
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <KpiStatCard label="Total Projects" value={stats.total} icon={Briefcase} />
        <KpiStatCard label="In Progress" value={stats.active} icon={Timer} tone="warning" />
        <KpiStatCard label="Completed" value={stats.completed} icon={CheckCircle2} tone="positive" />
        <KpiStatCard label="Delayed" value={stats.delayed} icon={AlertCircle} tone="danger" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-9 space-y-6 min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
              <TabsList className="bg-white border border-slate-200 h-11 p-1 rounded-xl w-full xl:w-auto overflow-x-auto scrollbar-hide flex">
                <TabsTrigger value="board" className="flex-1 text-xs font-semibold px-5 rounded-lg gap-2 whitespace-nowrap">
                  <FolderKanban className="h-4 w-4" /> Board
                </TabsTrigger>
                <TabsTrigger value="list" className="flex-1 text-xs font-semibold px-5 rounded-lg gap-2 whitespace-nowrap">
                  <LayoutList className="h-4 w-4" /> Table
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex-1 text-xs font-semibold px-5 rounded-lg gap-2 whitespace-nowrap">
                  <BarChart3 className="h-4 w-4" /> Analytics
                </TabsTrigger>
              </TabsList>
              <div className="relative w-full xl:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search project or client..." 
                  className="h-10 pl-9 text-xs bg-white border-slate-200 rounded-xl w-full" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
            </div>

            <TabsContent value="board" className="mt-0 outline-none space-y-8">
              {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map((status) => {
                const statusProjects = filteredProjects.filter(p => p.status === status);
                if (statusProjects.length === 0) return null;

                return (
                  <div key={status} className="space-y-4 text-left">
                    <div className="flex items-center gap-3 px-1">
                      <div className={cn("h-2.5 w-2.5 rounded-full", STATUS_CONFIG[status].color.replace('text-', 'bg-'))} />
                      <h3 className="text-xs font-semibold text-slate-700">{STATUS_CONFIG[status].label}</h3>
                      <Badge variant="secondary" className="text-xs font-mono tabular-nums px-2 h-5 bg-slate-100 text-slate-600">{statusProjects.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {statusProjects.map(p => (
                          <ProjectCard key={p.id} project={p} stats={getProjectStats(p.id)} onClick={() => handleNavigateToProject(p.id)} />
                        ))}
                    </div>
                  </div>
                );
              })}
              {filteredProjects.length === 0 && (
                <EmptyStatePanel
                  icon={Briefcase}
                  title="No projects in registry"
                  description="Launch a new project to start organizing client milestones and tasks."
                />
              )}
            </TabsContent>

            <TabsContent value="list" className="mt-0 outline-none">
              <SectionCard title="Project Registry" description="Click any project to manage milestones and deliverables" bodyClassName="p-0">
                <div className="overflow-x-auto scrollbar-hide">
                  <Table className="min-w-[900px]">
                    <TableHeader>
                      <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                        <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">Project Name</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 h-11">Client</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 text-center h-11">Status</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 text-center h-11">Progress</TableHead>
                        <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11">Target Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProjects.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="p-8">
                            <EmptyStatePanel icon={Briefcase} title="No matching projects" description="Try another search query or launch a new project." />
                          </TableCell>
                        </TableRow>
                      ) : filteredProjects.map(p => {
                        const projStats = getProjectStats(p.id);
                        const statusInfo = STATUS_CONFIG[p.status] || STATUS_CONFIG['planning'];
                        return (
                          <TableRow key={p.id} className="group hover:bg-slate-50/60 transition-colors cursor-pointer" onClick={() => handleNavigateToProject(p.id)}>
                            <TableCell className="pl-6 py-4">
                              <span className="text-sm font-semibold text-slate-900 group-hover:text-primary group-hover:underline">{p.title}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-slate-800">{p.clientName}</span>
                                <span className="text-xs text-slate-500 capitalize">{p.clientType}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={cn("text-xs font-medium mx-auto", statusInfo.bg, statusInfo.color)}>
                                {statusInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-mono tabular-nums font-semibold text-slate-700">{projStats.progress}%</span>
                                <Progress value={projStats.progress} className="h-1.5 w-20" />
                              </div>
                            </TableCell>
                            <TableCell className="pr-6 text-right text-xs font-mono tabular-nums text-slate-500">{p.deadline || '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </SectionCard>
            </TabsContent>

            <TabsContent value="analytics" className="mt-0 outline-none">
              <ProjectAnalytics stats={stats} projects={projects} getProjectStats={getProjectStats} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="xl:col-span-3 space-y-6 text-left min-w-0">
          <div className="rounded-2xl bg-slate-900 text-white p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <Sparkles className="h-4 w-4" /> AI Manager Tips
            </div>
            <div className="p-4 bg-white/10 rounded-xl border border-white/10">
              <p className="text-xs leading-relaxed text-slate-200">
                Looks like <strong className="font-mono tabular-nums">{stats.delayed}</strong> projects are past target deadline. Try reassigning open tasks to balance team load.
              </p>
            </div>
            <Button asChild variant="ghost" className="w-full justify-between h-10 px-4 bg-white/10 hover:bg-white/15 text-xs font-semibold rounded-xl text-white">
              <Link href="/notes">
                Open Task Board <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          <SectionCard title="Team Roster" description="Active staff members" bodyClassName="p-2">
            <div className="space-y-1">
              {businessUsers.slice(0, 6).map((u, i) => (
                <div key={i} className="p-3 rounded-xl flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center font-semibold text-slate-700 text-xs shrink-0">
                    {u.name?.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">{u.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{u.role}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2 pt-3 border-t border-slate-100 mt-2">
              <Button asChild variant="ghost" className="w-full h-9 text-xs font-semibold text-primary">
                <Link href="/staff">View Complete Team</Link>
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
