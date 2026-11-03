"use client";

import { useState, useMemo } from "react";
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Filter, 
  Loader2, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  MapPin, 
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  MoreVertical,
  Trash2,
  Edit2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, doc, where } from "firebase/firestore";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

const SURVEY_STATUSES = [
  { id: 'SCHEDULED', label: 'Scheduled', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'IN_PROGRESS', label: 'Field Audit', color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'COMPLETED', label: 'Audit Finished', color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'REVIEW_REQUIRED', label: 'Review Pending', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'APPROVED', label: 'Approved', color: 'text-green-600', bg: 'bg-green-50' },
  { id: 'CANCELLED', label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-50' },
];

export default function SolarSurveysPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const surveysQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarSurveys'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: surveysData, isLoading: isSurveysLoading } = useCollection<any>(surveysQuery);
  const surveys = surveysData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredSurveys = useMemo(() => {
    return (surveys || []).filter(s => {
      const matchesSearch = s.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           s.id?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [surveys, searchTerm, statusFilter]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!businessId) return;
    deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'solarSurveys', id));
    toast({ title: "Node Erased", variant: "destructive" });
  };

  if (isProfileLoading) return <div className="flex items-center justify-center py-20 opacity-40"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20 text-left px-2 sm:px-0">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
            <ClipboardCheck className="h-7 w-7 md:h-8 md:w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Site Surveys</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Technical Audit Hub</p>
          </div>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
          <Link href="/solar/inquiries"><Plus className="mr-2 h-4 w-4" /> Start from Inquiry</Link>
        </Button>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
        <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-full md:w-44 rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-primary text-left">
                <SelectValue placeholder="All Lifecycle" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-[10px] font-bold uppercase">All Stages</SelectItem>
                {SURVEY_STATUSES.map(s => <SelectItem key={s.id} value={s.id} className="text-[10px] font-bold uppercase">{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input 
              placeholder="Search customer, ID..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="h-11 pl-10 rounded-xl bg-white border-none shadow-inner text-xs font-bold w-full" 
            />
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-muted/10 border-b">
                <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Audit Node</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Site Logic</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Assigned Specialist</TableHead>
                <TableHead className="text-right pr-8 h-12 w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isSurveysLoading ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary opacity-20" /></TableCell></TableRow>
              ) : filteredSurveys.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center opacity-30 italic text-sm font-black uppercase tracking-widest">No surveys found.</TableCell></TableRow>
              ) : (
                filteredSurveys.map((survey: any) => {
                  const s = SURVEY_STATUSES.find(st => st.id === survey.status) || SURVEY_STATUSES[0];
                  return (
                    <TableRow key={survey.id} className="group hover:bg-muted/5 transition-colors border-b cursor-pointer text-left" onClick={() => router.push(`/solar/surveys/${survey.id}`)}>
                      <TableCell className="pl-8 py-5 text-left">
                        <div className="flex items-center gap-4 text-left">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-xs shadow-inner uppercase shrink-0">
                            S
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{survey.customerName}</p>
                            <p className="text-[9px] font-mono text-primary/60 uppercase tracking-widest mt-1">ID: {survey.id.slice(-8).toUpperCase()}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-slate-700 uppercase">{survey.customerInfo?.siteType || 'N/A'} Node</span>
                          <span className="text-[8px] font-black text-muted-foreground uppercase opacity-60 mt-0.5 flex items-center gap-1"><MapPin className="h-2.5 w-2.5 text-primary" /> {survey.customerInfo?.siteAddress}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[8px] font-black uppercase h-5 px-2 border-none shadow-sm", s.bg, s.color)}>{s.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <div className="h-7 w-7 rounded-lg bg-primary/5 flex items-center justify-center text-primary text-[10px] font-black border">{survey.assignedName?.charAt(0)}</div>
                           <span className="text-xs font-bold text-slate-600">{survey.assignedName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <ChevronRight className="h-4 w-4 text-primary opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
