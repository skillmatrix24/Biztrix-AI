"use client";

import { useState, useMemo } from "react";
import { 
  Zap, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Target, 
  ChevronRight,
  Filter,
  Loader2,
  Activity,
  Smartphone,
  MapPin,
  Calendar,
  Layers,
  ArrowRight
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
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

const SOLAR_STATUSES = [
  { id: 'NEW', label: 'New Inquiry', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'CONTACTED', label: 'Contacted', color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'QUALIFIED', label: 'Qualified', color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'SITE_SURVEY_PENDING', label: 'Survey Pending', color: 'text-orange-700', bg: 'bg-orange-100/50' },
  { id: 'QUOTATION_PENDING', label: 'Quote Pending', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'CONVERTED', label: 'Converted', color: 'text-green-600', bg: 'bg-green-50' },
  { id: 'LOST', label: 'Lost', color: 'text-red-600', bg: 'bg-red-50' },
];

export default function SolarInquiriesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const inquiriesQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'solarInquiries'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: inquiriesData, isLoading: isInquiriesLoading } = useCollection<any>(inquiriesQuery);
  const inquiries = inquiriesData || [];

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredInquiries = useMemo(() => {
    return (inquiries || []).filter(i => {
      const matchesSearch = i.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           i.customerPhone?.includes(searchTerm);
      const matchesStatus = statusFilter === "all" || i.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [inquiries, searchTerm, statusFilter]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  if (isProfileLoading) return <div className="flex items-center justify-center py-20 opacity-40"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20 text-left">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20 shadow-inner">
            <Layers className="h-7 w-7 text-orange-600" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Inquiry Registry</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Solar Technical Pipeline</p>
          </div>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
          <Link href="/solar/inquiries/new"><Plus className="mr-2 h-4 w-4" /> New Inquiry</Link>
        </Button>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
        <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-full md:w-44 rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-primary">
                <SelectValue placeholder="All Lifecycle" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-[10px] font-bold uppercase">All Stages</SelectItem>
                {SOLAR_STATUSES.map(s => <SelectItem key={s.id} value={s.id} className="text-[10px] font-bold uppercase">{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input 
              placeholder="Search customer, phone..." 
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
                <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Customer & Contact</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Property Type</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Required Cap.</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Avg. Bill</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Status</TableHead>
                <TableHead className="text-right pr-8 h-12 w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isInquiriesLoading ? (
                <TableRow><TableCell colSpan={6} className="h-40 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary opacity-20" /></TableCell></TableRow>
              ) : filteredInquiries.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-40 text-center opacity-30 italic text-sm">No solar inquiries found.</TableCell></TableRow>
              ) : (
                filteredInquiries.map((inq: any) => {
                  const s = SOLAR_STATUSES.find(st => st.id === inq.status) || SOLAR_STATUSES[0];
                  return (
                    <TableRow key={inq.id} className="group hover:bg-muted/5 transition-colors border-b cursor-pointer" onClick={() => router.push(`/solar/inquiries/${inq.id}`)}>
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-4 text-left">
                          <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center font-black text-orange-600 text-xs shadow-inner uppercase shrink-0">
                            {inq.customerName?.charAt(0)}
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{inq.customerName}</p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1 flex items-center gap-1"><Smartphone className="h-2.5 w-2.5" /> {inq.customerPhone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-slate-700">{inq.propertyType}</span>
                          <span className="text-[8px] font-black text-muted-foreground uppercase opacity-60 mt-0.5 flex items-center gap-1"><MapPin className="h-2.5 w-2.5 text-primary" /> {inq.location}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black text-sm text-primary">{inq.requiredCapacity || '--'} kW</TableCell>
                      <TableCell className="text-center font-black text-sm text-slate-600">{currencySymbol}{inq.monthlyBill?.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[8px] font-black uppercase h-5 px-2 border-none shadow-sm", s.bg, s.color)}>{s.label}</Badge>
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
