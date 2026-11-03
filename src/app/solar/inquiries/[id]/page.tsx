
"use client";

import { use, useState, useMemo } from "react";
import { 
  Sun, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  User, 
  Zap, 
  Activity, 
  ShieldCheck,
  Bot, 
  Loader2, 
  Smartphone,
  ChevronRight,
  Info,
  Building2,
  Scaling,
  MapPin,
  Target,
  FileText,
  Calculator,
  Calendar,
  AlertTriangle,
  History,
  ClipboardCheck,
  ClipboardList,
  Settings2,
  FileSpreadsheet,
  Handshake,
  BadgeCheck,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking, useCollection, addDocumentNonBlocking } from "@/firebase";
import { collection, doc, serverTimestamp, query, where } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";

const SOLAR_STATUSES: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  'NEW': { label: 'New Inquiry', color: 'text-blue-600', bg: 'bg-blue-50', icon: Zap },
  'CONTACTED': { label: 'Contacted', color: 'text-orange-600', bg: 'bg-orange-50', icon: Clock },
  'QUALIFIED': { label: 'Qualified', color: 'text-purple-600', bg: 'bg-purple-50', icon: Target },
  'SITE_SURVEY_PENDING': { label: 'Survey Pending', color: 'text-orange-700', bg: 'bg-orange-100/50', icon: Activity },
  'QUOTATION_PENDING': { label: 'Quote Pending', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: FileText },
  'CONVERTED': { label: 'Converted', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
  'LOST': { label: 'Lost', color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle },
};

const SURVEY_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'SCHEDULED': { label: 'Scheduled', color: 'text-blue-600', bg: 'bg-blue-50' },
  'IN_PROGRESS': { label: 'Field Audit', color: 'text-orange-600', bg: 'bg-orange-50' },
  'COMPLETED': { label: 'Audit Finished', color: 'text-purple-600', bg: 'bg-purple-50' },
  'REVIEW_REQUIRED': { label: 'Review Pending', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  'APPROVED': { label: 'Approved', color: 'text-green-600', bg: 'bg-green-50' },
  'CANCELLED': { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-50' },
};

export default function SolarInquiryDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const inquiryRef = useMemoFirebase(() => 
    businessId && id ? doc(firestore, 'businesses', businessId, 'solarInquiries', id) : null
  , [firestore, businessId, id]);
  const { data: inquiry, isLoading: isInquiryLoading } = useDoc<any>(inquiryRef);

  const surveysQuery = useMemoFirebase(() => 
    businessId && id ? query(collection(firestore, 'businesses', businessId, 'solarSurveys'), where('inquiryId', '==', id)) : null
  , [firestore, businessId, id]);
  const { data: surveysData } = useCollection<any>(surveysQuery);
  const relatedSurveys = surveysData || [];

  const designsQuery = useMemoFirebase(() => 
    businessId && id ? query(collection(firestore, 'businesses', businessId, 'solarSystemDesigns'), where('solarInquiryId', '==', id)) : null
  , [firestore, businessId, id]);
  const { data: designsData } = useCollection<any>(designsQuery);
  const relatedDesigns = designsData || [];

  const quotesQuery = useMemoFirebase(() => 
    businessId && id ? query(collection(firestore, 'businesses', businessId, 'quotations'), where('solarInquiryId', '==', id)) : null
  , [firestore, businessId, id]);
  const { data: quotesData } = useCollection<any>(quotesQuery);
  const relatedQuotes = quotesData || [];

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const teamQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null
  , [firestore, businessId]);
  const { data: teamMembersData } = useCollection<any>(teamQuery);
  const teamMembers = teamMembersData || [];

  const handleUpdateStatus = (status: string) => {
    if (!inquiryRef) return;
    updateDocumentNonBlocking(inquiryRef, { status, updatedAt: serverTimestamp() });
    toast({ title: "Lifecycle Updated", description: `Status changed to ${status}.` });
  };

  const handleUpdateAssignee = (userId: string) => {
    if (!inquiryRef) return;
    const staff = teamMembers.find((u: any) => u.id === userId);
    updateDocumentNonBlocking(inquiryRef, { 
      assignedTo: userId, 
      assignedName: staff?.name || "Admin",
      updatedAt: serverTimestamp() 
    });
    toast({ title: "Specialist Assigned", description: `Task node given to ${staff?.name}.` });
  };

  if (isInquiryLoading || isProfileLoading) return <div className="flex flex-col items-center justify-center py-20 opacity-40"><Loader2 className="animate-spin text-primary mb-4" /><p className="text-[10px] font-black uppercase tracking-widest text-primary">Synchronizing Node...</p></div>;
  if (!inquiry) return <div className="p-20 text-center space-y-4"><AlertTriangle className="h-10 w-10 mx-auto text-red-500" /><p className="font-bold">Inquiry not found.</p><Button asChild variant="outline"><Link href="/solar/inquiries">Back to Registry</Link></Button></div>;

  const currencySymbol = getCurrencySymbol(business?.currency);
  const activeSurvey = relatedSurveys.length > 0 ? relatedSurveys[0] : null;
  const activeDesign = relatedDesigns.length > 0 ? relatedDesigns[0] : null;
  const activeQuote = relatedQuotes.length > 0 ? relatedQuotes[0] : null;

  return (
    <div className="space-y-8 pb-20 text-left max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm border shrink-0"><Link href="/solar/inquiries"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div className="text-left">
          <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary h-5 px-3 mb-1.5 tracking-widest">INQUIRY NODE: {id.slice(-8).toUpperCase()}</Badge>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">{inquiry.customerName}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border">
            <CardHeader className="bg-slate-900 py-8 px-10 text-white relative text-left">
              <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12"><Sun className="h-48 w-48" /></div>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-5 text-left">
                  <div className="h-16 w-16 rounded-3xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner shrink-0">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black uppercase leading-tight">{inquiry.customerName}</h3>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center gap-2"><Smartphone className="h-3 w-3" /> {inquiry.customerPhone}</p>
                    {inquiry.dealerName && <Badge variant="outline" className="mt-2 bg-accent/20 border-accent/40 text-accent font-black text-[7px] uppercase px-2 h-4">Dealer: {inquiry.dealerName}</Badge>}
                  </div>
                </div>
                <div className="flex flex-row items-center gap-3 bg-white/10 p-2 rounded-2xl border border-white/20">
                  <span className="text-[10px] font-black text-white/60 uppercase ml-2">Stage:</span>
                  <Select value={inquiry.status} onValueChange={handleUpdateStatus}>
                    <SelectTrigger className="h-9 w-40 rounded-xl bg-white/10 border-white/20 text-white text-[10px] font-black uppercase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      {Object.keys(SOLAR_STATUSES).map(s => <SelectItem key={s} value={s} className="text-[10px] font-black uppercase">{SOLAR_STATUSES[s].label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 space-y-12">
              {/* SURVEY INTEGRATION NODE */}
              <section className="space-y-4">
                 <div className="flex items-center gap-3 px-1 text-left">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Technical Site Assessment</h4>
                 </div>
                 {activeSurvey ? (
                   <Card className="border-none shadow-sm bg-primary/5 rounded-[2rem] p-6 border border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4 text-left">
                        <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm">
                           <ClipboardList className="h-6 w-6" />
                        </div>
                        <div className="text-left">
                           <div className="flex items-center gap-2">
                             <p className="text-sm font-black text-slate-900 uppercase">Assessment Active</p>
                             <Badge className={cn("text-[7px] font-black uppercase h-4", SURVEY_STATUS_CONFIG[activeSurvey.status]?.bg, SURVEY_STATUS_CONFIG[activeSurvey.status]?.color)}>
                               {SURVEY_STATUS_CONFIG[activeSurvey.status]?.label || activeSurvey.status}
                             </Badge>
                           </div>
                           <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Surveyor: {activeSurvey.assignedName}</p>
                        </div>
                      </div>
                      <Button asChild className="h-10 px-6 rounded-xl bg-primary font-black uppercase text-[9px] tracking-widest">
                         <Link href={`/solar/surveys/${activeSurvey.id}`}>Open Report <ChevronRight className="ml-1.5 h-3 w-3" /></Link>
                      </Button>
                   </Card>
                 ) : (
                   <div className="p-8 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center text-center space-y-6 bg-slate-50/50 group hover:border-primary/20 transition-all">
                      <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center text-slate-300 shadow-inner group-hover:text-primary transition-colors"><ClipboardCheck className="h-7 w-7" /></div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">No site survey node found</p>
                        <p className="text-[9px] font-medium text-slate-400 max-w-[200px] uppercase">Initialize technical audit to proceed to system design</p>
                      </div>
                      <Button asChild className="h-11 px-8 rounded-xl bg-primary text-white font-black uppercase text-[9px] tracking-widest shadow-lg">
                        <Link href={`/solar/surveys/new?inquiryId=${id}`}>Launch Site Survey</Link>
                      </Button>
                   </div>
                 )}
              </section>

              {/* ENGINEERING & PROPOSAL NODE */}
              <section className="space-y-4">
                 <div className="flex items-center gap-3 px-1 text-left">
                    <Settings2 className="h-4 w-4 text-primary" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Engineering & Proposal</h4>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {activeDesign ? (
                     <Card className="p-5 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-between">
                        <div className="text-left">
                           <p className="text-[10px] font-black uppercase text-orange-600 tracking-widest">System Design</p>
                           <p className="text-sm font-black text-slate-900 mt-1">{activeDesign.capacityKw} kW Node</p>
                        </div>
                        <Button asChild variant="ghost" size="icon" className="text-orange-600"><Link href={`/solar/designs/${activeDesign.id}`}><ChevronRight className="h-5 w-5" /></Link></Button>
                     </Card>
                   ) : (
                     <div className="p-5 rounded-2xl border border-dashed opacity-40 flex items-center justify-center">
                        <span className="text-[8px] font-black uppercase">Design Pending</span>
                     </div>
                   )}

                   {activeQuote ? (
                     <Card className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                        <div className="text-left">
                           <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Solar Quotation</p>
                           <p className="text-sm font-black text-slate-900 mt-1">₹{activeQuote.totals?.finalPayout?.toLocaleString()}</p>
                        </div>
                        <Button asChild variant="ghost" size="icon" className="text-indigo-600"><Link href={`/solar/quotations/${activeQuote.id}`}><ChevronRight className="h-5 w-5" /></Link></Button>
                     </Card>
                   ) : (
                     <div className="p-5 rounded-2xl border border-dashed opacity-40 flex items-center justify-center">
                        <span className="text-[8px] font-black uppercase">Proposal Pending</span>
                     </div>
                   )}
                 </div>
              </section>

              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 flex flex-col gap-2">
                   <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Required Capacity</p>
                   <p className="text-3xl font-black text-primary">{inquiry.requiredCapacity || '--'} <span className="text-xs">kW</span></p>
                </div>
                <div className="p-6 bg-muted/20 rounded-[2rem] border border-transparent space-y-1">
                   <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Team Attribution</p>
                   <Select value={inquiry.assignedTo || ""} onValueChange={handleUpdateAssignee}>
                    <SelectTrigger className="h-10 border-none bg-white rounded-xl shadow-sm text-[10px] font-black uppercase text-left">
                      <SelectValue placeholder="Pick Specialist" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {teamMembers.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1"><Calculator className="h-4 w-4" /> Technical Profile</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <div className="p-5 bg-muted/10 rounded-2xl flex items-center justify-between text-left">
                      <div className="space-y-1"><p className="text-[8px] font-black text-muted-foreground uppercase">Property Type</p><p className="text-xs font-bold uppercase">{inquiry.propertyType}</p></div>
                      <Building2 className="h-4 w-4 text-primary opacity-20" />
                   </div>
                   <div className="p-5 bg-muted/10 rounded-2xl flex items-center justify-between text-left">
                      <div className="space-y-1"><p className="text-[8px] font-black text-muted-foreground uppercase">Connection</p><p className="text-xs font-bold uppercase">{inquiry.electricityConnection}</p></div>
                      <Zap className="h-4 w-4 text-primary opacity-20" />
                   </div>
                   <div className="p-5 bg-muted/10 rounded-2xl flex items-center justify-between text-left">
                      <div className="space-y-1"><p className="text-[8px] font-black text-muted-foreground uppercase">Avg Monthly Bill</p><p className="text-xs font-black">{currencySymbol}{inquiry.monthlyBill?.toLocaleString()}</p></div>
                      <span className="text-[9px] font-black text-primary/40 uppercase">FINANCE</span>
                   </div>
                   <div className="p-5 bg-muted/10 rounded-2xl flex items-center justify-between text-left">
                      <div className="space-y-1"><p className="text-[8px] font-black text-muted-foreground uppercase">Roof Type</p><p className="text-xs font-bold uppercase">{inquiry.roofType}</p></div>
                      <div className="text-[9px] font-black text-primary/40 uppercase">SITE</div>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8 text-left">
           <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
              <CardHeader className="bg-primary/5 border-b py-6 px-8 text-left">
                 <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><History className="h-4 w-4" /> Registry Pulse</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8 text-left">
                 <div className="space-y-1.5 text-left">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Initialized On</p>
                    <p className="text-sm font-bold text-slate-900">{inquiry.createdAt?.toDate ? format(inquiry.createdAt.toDate(), 'dd MMM yyyy') : 'Recently'}</p>
                 </div>
                 <Separator />
                 <div className="space-y-1.5 text-left">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Channel Partner</p>
                    <div className="flex items-center gap-2 text-primary font-black text-xs uppercase"><Handshake className="h-3.5 w-3.5" /> {inquiry.dealerName || "Direct Site Node"}</div>
                 </div>
                 <Separator />
                 <div className="space-y-4">
                    <Button asChild variant="outline" className="w-full h-12 rounded-xl text-[10px] font-black uppercase border-primary/20 text-primary gap-2 bg-white shadow-sm">
                      {inquiry.leadId ? (
                        <Link href={`/leads?id=${inquiry.leadId}`}><Target className="h-4 w-4" /> View CRM Lead</Link>
                      ) : (
                        <Link href={`/customers?id=${inquiry.customerId}`}><User className="h-4 w-4" /> View Customer</Link>
                      )}
                    </Button>
                 </div>
              </CardContent>
           </Card>

           <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] relative overflow-hidden group shadow-2xl text-left">
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:scale-110 transition-transform"><Bot className="h-40 w-40" /></div>
              <CardHeader className="p-0 mb-6 relative z-10">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><Sparkles className="h-6 w-6 text-accent" /></div>
                <CardTitle className="text-base font-black uppercase tracking-widest mt-4 text-white leading-none">Cognitive Flow</CardTitle>
              </CardHeader>
              <div className="relative z-10 space-y-6 text-left">
                 <p className="text-xs text-slate-400 leading-relaxed font-medium italic text-left">"Analysis: High potential node detected. Proceeding with technical audit ensures 99% accuracy in system design."</p>
                 <Separator className="bg-white/10" />
                 <div className="flex items-center gap-3 text-left"><BadgeCheck className="h-4 w-4 text-accent" /><span className="text-[9px] font-black uppercase text-slate-300">Tenant Isolation v3.5 Active</span></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
