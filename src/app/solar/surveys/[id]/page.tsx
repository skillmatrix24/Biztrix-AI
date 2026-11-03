"use client";

import { use, useState, useMemo, useEffect } from "react";
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
  MapPin,
  ClipboardCheck,
  History,
  FileText,
  Calculator,
  Trees,
  Scaling,
  Droplets,
  Navigation,
  Edit2,
  Trash2,
  Check,
  Settings2,
  ArrowRight,
  Building2,
  BadgeCheck,
  X,
  AlertCircle,
  ImageIcon,
  Calendar,
  ZapOff,
  Target,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp, where, Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'low': { label: 'Low', color: 'text-slate-600', bg: 'bg-slate-100' },
  'medium': { label: 'Medium', color: 'text-blue-700', bg: 'bg-blue-100/60' },
  'high': { label: 'High', color: 'text-orange-700', bg: 'bg-orange-100/60' },
  'urgent': { label: 'Urgent', color: 'text-red-700', bg: 'bg-red-100/60' },
  'emergency': { label: 'Emergency', color: 'text-red-900', bg: 'bg-red-200' },
};

const SURVEY_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  'SCHEDULED': { label: 'Scheduled', color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
  'IN_PROGRESS': { label: 'Field Audit', color: 'text-orange-600', bg: 'bg-orange-50', icon: Activity },
  'COMPLETED': { label: 'Audit Finished', color: 'text-purple-600', bg: 'bg-purple-50', icon: ClipboardCheck },
  'REVIEW_REQUIRED': { label: 'Review Pending', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Info },
  'APPROVED': { label: 'Approved', color: 'text-green-600', bg: 'bg-green-50', icon: BadgeCheck },
  'CANCELLED': { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-50', icon: X },
};

export default function SolarSurveyDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const surveyRef = useMemoFirebase(() => 
    businessId && id ? doc(firestore, 'businesses', businessId, 'solarSurveys', id) : null
  , [firestore, businessId, id]);
  const { data: survey, isLoading: isSurveyLoading } = useDoc<any>(surveyRef);

  const teamQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null
  , [firestore, businessId]);
  const { data: teamMembersRaw } = useCollection<any>(teamQuery);
  const teamMembers = teamMembersRaw || [];

  const timelineQuery = useMemoFirebase(() => 
    businessId && id ? query(collection(firestore, 'businesses', businessId, 'solarSurveys', id, 'timeline'), orderBy('timestamp', 'desc')) : null
  , [firestore, businessId, id]);
  const { data: timelineData } = useCollection<any>(timelineQuery);
  const timeline = timelineData || [];

  const handleUpdateField = (updates: any) => {
    if (!surveyRef) return;
    updateDocumentNonBlocking(surveyRef, { ...updates, updatedAt: serverTimestamp() });
    toast({ title: "Survey Updated" });
  };

  const handleUpdateStatus = (status: string) => {
    if (!surveyRef) return;
    updateDocumentNonBlocking(surveyRef, { status, updatedAt: serverTimestamp() });
    
    // Auto-update Inquiry stage if approved
    if (status === 'APPROVED' && survey.inquiryId) {
      const inqRef = doc(firestore, 'businesses', businessId!, 'solarInquiries', survey.inquiryId);
      updateDocumentNonBlocking(inqRef, { status: 'SITE_SURVEY_DONE', updatedAt: serverTimestamp() });
    }

    // Log to timeline
    addDocumentNonBlocking(collection(firestore, 'businesses', businessId!, 'solarSurveys', id, 'timeline'), {
      action: `Status changed to ${status}`,
      by: userProfile?.name || 'System',
      timestamp: new Date().toISOString()
    });
    
    toast({ title: "Node Status Updated", description: `Survey is now ${status}.` });
  };

  if (isSurveyLoading || isProfileLoading) return <div className="flex flex-col items-center justify-center py-20 opacity-40 min-h-screen"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;
  if (!survey) return <div className="p-20 text-center"><p className="font-bold">Audit node not found.</p><Button asChild variant="outline" className="mt-4"><Link href="/solar/surveys">Back to Hub</Link></Button></div>;

  const sInfo = SURVEY_STATUS_CONFIG[survey.status] || SURVEY_STATUS_CONFIG['SCHEDULED'];
  const isApproved = survey.status === 'APPROVED';

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 text-left px-2 sm:px-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4 text-left flex-1 min-w-0">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0"><Link href="/solar/surveys"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="text-left min-w-0 flex-1">
             <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary h-5 px-3 mb-1.5 tracking-widest">AUDIT REPORT: {id.slice(-8).toUpperCase()}</Badge>
             <h1 className="text-2xl md:text-4xl font-black text-slate-900 leading-none uppercase truncate">{survey.customerName}</h1>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={survey.status} onValueChange={handleUpdateStatus}>
             <SelectTrigger className={cn("h-11 rounded-xl font-black uppercase text-[10px] tracking-widest w-full md:w-48", sInfo.bg, sInfo.color)}>
                <SelectValue />
             </SelectTrigger>
             <SelectContent className="rounded-xl border-none shadow-2xl">
                {Object.keys(SURVEY_STATUS_CONFIG).map(s => <SelectItem key={s} value={s} className="text-[10px] font-black uppercase">{SURVEY_STATUS_CONFIG[s].label}</SelectItem>)}
             </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-8 space-y-12">
          <Card className="border-none shadow-xl bg-white rounded-[3rem] overflow-hidden border">
            <CardHeader className="bg-slate-900 py-10 px-10 text-white relative text-left">
               <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12"><ClipboardCheck className="h-48 w-48" /></div>
               <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-4">
                     <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner shrink-0"><Sun className="h-7 w-7 text-accent" /></div>
                     <div className="text-left">
                        <h3 className="text-xl font-black uppercase tracking-tight">Technical Assessment Manifest</h3>
                        <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Verified Audit Data Node v3.5</p>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                     <div className="p-5 bg-white/5 rounded-2xl border border-white/10 text-left">
                        <p className="text-[9px] font-black uppercase text-slate-400 mb-1.5">Site Identification</p>
                        <p className="text-sm font-bold leading-relaxed">{survey.customerInfo?.siteAddress}</p>
                        <Badge variant="outline" className="mt-3 bg-white/10 text-accent border-none font-black text-[7px] h-4 uppercase">{survey.customerInfo?.siteType}</Badge>
                     </div>
                     <div className="p-5 bg-white/5 rounded-2xl border border-white/10 text-left">
                        <p className="text-[9px] font-black uppercase text-slate-400 mb-1.5">Assigned Auditor</p>
                        <p className="text-sm font-black text-white uppercase">{survey.assignedName}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-2">Audit Date: {survey.surveyDate}</p>
                     </div>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-8 sm:p-12 space-y-16 text-left">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="p-5 bg-muted/20 rounded-3xl space-y-3 text-left">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Urgency Priority</Label>
                    <Select value={survey.priority || "medium"} onValueChange={(v) => handleUpdateField({ priority: v })}>
                      <SelectTrigger className="h-10 rounded-2xl bg-white border-none shadow-sm font-black text-xs uppercase w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {Object.keys(PRIORITY_CONFIG).map(p => <SelectItem key={p} value={p} className="text-xs font-bold uppercase">{PRIORITY_CONFIG[p].label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-5 bg-muted/20 rounded-3xl space-y-3 text-left">
                     <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Auditor Identity</Label>
                     <Select value={survey.assignedTo || ""} onValueChange={(v) => {
                       const staff = teamMembers.find(m => m.id === v);
                       handleUpdateField({ assignedTo: v, assignedName: staff?.name || 'Unassigned' });
                     }}>
                        <SelectTrigger className="h-10 rounded-2xl bg-white border-none shadow-sm font-black text-xs uppercase w-full"><SelectValue placeholder="Pick Specialist" /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                           {teamMembers.map(m => <SelectItem key={m.id} value={m.id} className="text-xs font-bold uppercase">{m.name}</SelectItem>)}
                        </SelectContent>
                     </Select>
                  </div>
               </div>

               <section className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1">
                    <Activity className="h-4 w-4" /> Timeline Matrix
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     {[
                       { id: 'deadline', lab: 'Target Deadline', val: survey.surveyDate || 'ASAP', icon: Calendar },
                       { id: 'init', lab: 'Initialized On', val: survey.createdAt?.toDate ? format(survey.createdAt.toDate(), 'dd MMM yy') : 'Recently', icon: Clock },
                       { id: 'sync', lab: 'Last Sync', val: survey.updatedAt?.toDate ? format(survey.updatedAt.toDate(), 'HH:mm') : '--:--', icon: Zap }
                     ].map((item) => (
                       <div key={item.id} className="p-5 bg-muted/20 rounded-2xl border border-transparent flex flex-col gap-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase">{item.lab}</p>
                          <div className="flex items-center justify-between">
                             <p className="text-sm font-bold text-slate-700">{item.val}</p>
                             <item.icon className="h-3.5 w-3.5 text-primary opacity-20" />
                          </div>
                       </div>
                     ))}
                  </div>
               </section>

               <Separator className="opacity-40" />

               <section className="space-y-8">
                  <div className="flex items-center gap-3 px-1 text-left">
                     <Zap className="h-5 w-5 text-primary" />
                     <h4 className="text-xs font-black uppercase tracking-widest text-primary">Electrical Grid Infrastructure</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-left">
                     {[
                       { id: 'phase', lab: 'Phase Type', val: survey.electrical?.phaseType || '--' },
                       { id: 'conn', lab: 'Conn. Type', val: survey.electrical?.connectionType || '--' },
                       { id: 'load', lab: 'Sanc. Load', val: `${survey.electrical?.sanctionedLoad} kW` },
                       { id: 'units', lab: 'Avg. Units', val: `${survey.electrical?.avgMonthlyUnits} kWh` }
                     ].map((item) => (
                       <div key={item.id} className="space-y-1.5">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{item.lab}</p>
                          <p className="text-sm font-black text-slate-900 uppercase">{item.val}</p>
                       </div>
                     ))}
                  </div>
               </section>

               <Separator className="opacity-40" />

               <section className="space-y-8 text-left">
                  <div className="flex items-center gap-3 px-1 text-left">
                     <Building2 className="h-5 w-5 text-primary" />
                     <h4 className="text-xs font-black uppercase tracking-widest text-primary">Rooftop Physical Registry</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
                     <div><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Roof Material</p><p className="text-sm font-black text-slate-900 uppercase">{survey.rooftop?.material}</p></div>
                     <div><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total Area</p><p className="text-sm font-black text-slate-900">{survey.rooftop?.totalArea} Sq.Ft</p></div>
                     <div><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Usable Node</p><p className="text-sm font-black text-green-600">{survey.rooftop?.usableArea} Sq.Ft</p></div>
                     <div><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Accessibility</p><p className="text-sm font-black text-slate-900 uppercase">{survey.rooftop?.accessibility}</p></div>
                     <div><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Condition</p><p className="text-sm font-black text-slate-900 uppercase">{survey.rooftop?.condition}</p></div>
                  </div>
               </section>

               <Separator className="opacity-40" />

               <section className="space-y-8 text-left">
                  <div className="flex items-center gap-3 px-1 text-left">
                     <Navigation className="h-5 w-5 text-primary" />
                     <h4 className="text-xs font-black uppercase tracking-widest text-primary">Orientation & Shading Hub</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                     {[
                        { id: 'orientation', lab: 'Primary Heading', val: survey.orientation?.direction },
                        { id: 'tilt', lab: 'Proposed Tilt', val: `${survey.orientation?.proposedTilt}°` }
                     ].map((item) => (
                        <div key={item.id} className="p-6 bg-slate-50 rounded-[2.5rem] border-none shadow-inner space-y-6">
                           <div className="flex justify-between items-center text-left">
                              <span className="text-[9px] font-black text-slate-400 uppercase">{item.lab}</span>
                              <Badge variant="outline" className="bg-white border-primary/20 text-primary font-black text-[8px] h-5 px-3 uppercase">{item.val}</Badge>
                           </div>
                        </div>
                     ))}
                     <div className={cn("p-6 rounded-[2.5rem] border-none shadow-inner space-y-6", survey.orientation?.shadingSeverity === 'None' ? 'bg-green-50' : 'bg-red-50')}>
                        <div className="flex justify-between items-center text-left">
                           <span className={cn("text-[9px] font-black uppercase", survey.orientation?.shadingSeverity === 'None' ? "text-green-600" : "text-red-600")}>Shading Severity</span>
                           <Badge className={cn("border-none text-[8px] font-black h-5 uppercase px-3", survey.orientation?.shadingSeverity === 'None' ? "bg-green-600 text-white" : "bg-red-600 text-white")}>{survey.orientation?.shadingSeverity}</Badge>
                        </div>
                        <p className="text-[10px] font-medium text-slate-500 italic">Obstacles: {survey.orientation?.obstacles || 'None recorded.'}</p>
                     </div>
                  </div>
               </section>

               {survey.media?.length > 0 && (
                 <section className="space-y-8 text-left">
                   <div className="flex items-center gap-3 px-1 text-left">
                     <ImageIcon className="h-5 w-5 text-primary" />
                     <h4 className="text-xs font-black uppercase tracking-widest text-primary">Media Node Evidence</h4>
                   </div>
                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {survey.media.map((img: string, i: number) => (
                        <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-border/50 shadow-sm cursor-pointer hover:ring-2 ring-primary/20 transition-all" onClick={() => window.open(img, '_blank')}>
                           <img src={img} className="w-full h-full object-cover" alt={`Evidence ${i}`} />
                        </div>
                      ))}
                   </div>
                 </section>
               )}
            </CardContent>
            <CardFooter className="bg-muted/10 p-10 border-t flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="flex items-center gap-4 text-left">
                  <ShieldCheck className="h-10 w-10 text-green-600 opacity-40 shrink-0" />
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-900 uppercase leading-none">Security Verified Node</p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Audit established on {survey.createdAt?.toDate ? format(survey.createdAt.toDate(), 'dd MMM yyyy, HH:mm') : 'Recently'}</p>
                  </div>
               </div>
               <div className="flex gap-3 w-full md:w-auto">
                 <Button variant="outline" className="flex-1 md:flex-none h-12 rounded-xl font-black uppercase text-[10px] tracking-widest" onClick={() => window.print()}>Generate PDF Report</Button>
                 {survey.status !== 'APPROVED' && (
                    <Button onClick={() => handleUpdateStatus('APPROVED')} className="flex-1 md:flex-none h-12 bg-green-600 hover:bg-green-700 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl text-white">Approve Technical Node</Button>
                 )}
                 {isApproved && (
                    <Button asChild className="flex-1 md:flex-none h-12 bg-primary rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl text-white">
                      <Link href={`/solar/designs/new?surveyId=${id}`}><Settings2 className="h-4 w-4 mr-2" /> Create System Design</Link>
                    </Button>
                 )}
               </div>
            </CardFooter>
          </Card>

          <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
             <CardHeader className="bg-muted/30 border-b py-5 px-8"><CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><History className="h-4 w-4" /> Audit Trail & Logs</CardTitle></CardHeader>
             <CardContent className="p-8">
                <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-8px)] before:w-0.5 before:bg-muted">
                   <div className="relative flex items-center gap-4">
                      <div className="absolute -left-[21px] h-4 w-4 rounded-full bg-white border-2 border-primary z-10" />
                      <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0 shadow-sm"><Zap className="h-4 w-4" /></div>
                      <div className="text-left">
                        <p className="text-xs font-black text-slate-900 uppercase">Audit Node Initialized</p>
                        <p className="text-[8px] font-bold text-muted-foreground uppercase">{survey.createdAt?.toDate ? format(survey.createdAt.toDate(), 'dd MMM yyyy, HH:mm') : 'Recently'}</p>
                      </div>
                   </div>
                   {timeline.map((log: any, i: number) => (
                    <div key={i} className="relative flex items-center gap-4 animate-in slide-in-from-left-2" style={{ animationDelay: `${i * 100}ms` }}>
                       <div className="absolute -left-[21px] h-4 w-4 rounded-full bg-white border-2 border-slate-200 z-10" />
                       <div className="h-9 w-9 rounded-xl bg-muted/20 flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                         {log.action?.includes('Status') ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4" />}
                       </div>
                       <div className="text-left">
                         <p className="text-xs font-bold text-slate-600 leading-relaxed uppercase">{log.action}</p>
                         <p className="text-[8px] font-bold text-muted-foreground uppercase">{log.by} • {new Date(log.timestamp).toLocaleString()}</p>
                       </div>
                    </div>
                  ))}
                </div>
             </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8 text-left">
           <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
              <CardHeader className="bg-primary/5 border-b py-6 px-8 text-left"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><History className="h-4 w-4" /> Node Context</CardTitle></CardHeader>
              <CardContent className="p-8 space-y-8 text-left">
                 <div className="space-y-4">
                    <div className="space-y-1 text-left">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inquiry Source</p>
                       <Button asChild variant="link" className="h-auto p-0 font-black text-primary text-xs uppercase hover:no-underline"><Link href={`/solar/inquiries/${survey.inquiryId}`}>Open Inquiry Node <ArrowRight className="ml-1.5 h-3 w-3" /></Link></Button>
                    </div>
                 </div>
              </CardContent>
           </Card>

           <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] relative overflow-hidden group shadow-2xl text-left">
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:scale-110 transition-transform"><Bot className="h-40 w-40" /></div>
              <CardHeader className="p-0 mb-6 relative z-10">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><Sparkles className="h-6 w-6 text-accent" /></div>
                <CardTitle className="text-base font-black uppercase tracking-widest mt-4 text-white leading-none">Cognitive Flow</CardTitle>
              </CardHeader>
              <div className="relative z-10 space-y-6">
                 <p className="text-xs text-slate-400 leading-relaxed font-medium italic text-left">
                    {isApproved 
                      ? "Analysis: Technical node verified. System Design is now unlocked to map components and engineering constraints."
                      : "Analysis: Technical data is complete. Recommended next node: **Approve Audit** to establish technical baseline."}
                 </p>
                 <Separator className="bg-white/10" />
                 <div className="flex items-center gap-3 text-left"><BadgeCheck className="h-4 w-4 text-accent" /><span className="text-[9px] font-black uppercase text-slate-300">Data Node Locked</span></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
