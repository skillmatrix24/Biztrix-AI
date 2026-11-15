
"use client";

import { useState, useMemo } from "react";
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Trash2, 
  Plus, 
  Loader2, 
  ChevronRight, 
  ArrowLeft,
  Calendar,
  User,
  ShieldCheck,
  Tag,
  ClipboardCheck,
  Settings2,
  BadgeCheck,
  SmartphoneNfc,
  Info,
  Clock,
  LayoutList
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
import { collection, query, orderBy, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

const DOC_TYPES = [
  { id: "SITE_SURVEY_REPORT", label: "Survey Report" },
  { id: "SYSTEM_DESIGN", label: "Design Blueprint" },
  { id: "QUOTATION", label: "Solar Proposal" },
  { id: "HANDOVER_CERTIFICATE", label: "Handover Cert" },
  { id: "WARRANTY_CERTIFICATE", label: "Warranty Node" },
  { id: "INSTALLATION_PHOTO", label: "Field Photo" },
  { id: "CUSTOMER_DOCUMENT", label: "Identity Proof" },
];

export default function SolarDocumentHubPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const docsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarDocuments'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: documentsData, isLoading: isDocsLoading } = useCollection<any>(docsQuery);
  const documents = documentsData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredDocs = useMemo(() => {
    return (documents || []).filter((d: any) => {
      const matchesSearch = d.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           d.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || d.documentType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [documents, searchTerm, typeFilter]);

  const handleDelete = (id: string) => {
    if (!businessId) return;
    deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'solarDocuments', id));
    toast({ title: "Node Erased", variant: "destructive" });
  };

  if (isProfileLoading) return <div className="min-h-screen flex items-center justify-center opacity-40"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20 text-left px-2 sm:px-0">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Document Registry</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Verified Asset Hub v1.0</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-border/50 text-left">
            <div className="flex items-center justify-between opacity-60 mb-1"><span className="text-[10px] font-black uppercase tracking-widest">Total Assets</span><LayoutList className="h-4 w-4" /></div>
            <div className="text-2xl font-black text-slate-900">{documents.length} Nodes</div>
         </Card>
         <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-green-500 text-left">
            <div className="flex items-center justify-between opacity-60 mb-1"><span className="text-[10px] font-black uppercase tracking-widest text-green-600">Customer Visible</span><BadgeCheck className="h-4 w-4 text-green-600" /></div>
            <div className="text-2xl font-black text-green-700">{documents.filter(d => d.visibility === 'CUSTOMER_VISIBLE').length} Shared</div>
         </Card>
         <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6 text-left">
            <div className="flex items-center justify-between opacity-40 mb-1"><span className="text-[10px] font-black uppercase tracking-widest text-accent">Node Health</span><ShieldCheck className="h-4 w-4 text-accent" /></div>
            <div className="text-2xl font-black text-white">100% Secured</div>
         </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
        <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="flex items-center gap-3 w-full md:w-auto">
             <Select value={typeFilter} onValueChange={setTypeFilter}>
               <SelectTrigger className="h-11 w-full md:w-48 rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-primary text-left">
                 <Filter className="h-3.5 w-3.5 mr-2 opacity-40" />
                 <SelectValue placeholder="All Asset Types" />
               </SelectTrigger>
               <SelectContent className="rounded-xl border-none shadow-2xl">
                 <SelectItem value="all" className="text-[10px] font-bold uppercase">Full Registry</SelectItem>
                 {DOC_TYPES.map(t => <SelectItem key={t.id} value={t.id} className="text-[10px] font-bold uppercase">{t.label}</SelectItem>)}
               </SelectContent>
             </Select>
           </div>
           <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input placeholder="Search title or customer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 pl-10 rounded-xl bg-white border-none shadow-inner text-xs font-bold w-full" />
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-muted/10 border-b">
                <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Document Node</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Associated Entity</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Visibility</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Added On</TableHead>
                <TableHead className="text-right pr-8 h-12 w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isDocsLoading ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary opacity-20" /></TableCell></TableRow>
              ) : filteredDocs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center opacity-30 italic text-sm">No documents found in registry.</TableCell></TableRow>
              ) : (
                filteredDocs.map((docItem: any) => (
                  <TableRow key={docItem.id} className="group hover:bg-muted/5 transition-colors border-b">
                    <TableCell className="pl-8 py-5 text-left">
                      <div className="flex items-center gap-4 text-left">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-xs shadow-inner uppercase shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none mb-1.5">{docItem.title}</p>
                          <Badge variant="outline" className="text-[7px] font-black uppercase h-4 px-1.5 border-primary/20 text-primary">{docItem.documentType?.replace(/_/g, ' ')}</Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                       <p className="text-xs font-bold text-slate-700 uppercase">{docItem.customerName}</p>
                       <p className="text-[8px] font-black text-muted-foreground uppercase opacity-40">{docItem.entityType}: {docItem.entityId?.slice(-6).toUpperCase()}</p>
                    </TableCell>
                    <TableCell className="text-center">
                       <Badge className={cn("text-[8px] font-black uppercase h-5 px-3 border-none shadow-sm", docItem.visibility === 'CUSTOMER_VISIBLE' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>
                         {docItem.visibility === 'CUSTOMER_VISIBLE' ? 'Public Node' : 'Internal Node'}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                       <span className="text-[10px] font-bold text-slate-400 uppercase">{docItem.createdAt?.toDate ? format(docItem.createdAt.toDate(), 'dd MMM yyyy') : '--'}</span>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-primary" onClick={() => window.open(docItem.contentUrl || docItem.base64, '_blank')}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive" onClick={() => handleDelete(docItem.id)}><Trash2 className="h-4 w-4" /></Button>
                       </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
