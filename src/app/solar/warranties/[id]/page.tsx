
"use client";

import { use, useState, useMemo } from "react";
import { 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  User, 
  Shield, 
  Bot, 
  Loader2, 
  SmartphoneNfc, 
  History, 
  ChevronRight, 
  BadgeCheck, 
  Info, 
  Tag, 
  FileText, 
  Calculator, 
  Settings2, 
  Target, 
  Briefcase, 
  Smartphone,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  PlusCircle,
  X,
  Plus,
  ArrowRight,
  Package,
  Sparkles
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";

const WARRANTY_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'ACTIVE': { label: 'Active Coverage', color: 'text-green-600', bg: 'bg-green-50' },
  'EXPIRING_SOON': { label: 'Expiring Soon', color: 'text-orange-600', bg: 'bg-orange-50' },
  'EXPIRED': { label: 'Expired Node', color: 'text-red-600', bg: 'bg-red-50' },
  'CLAIM_OPEN': { label: 'Open Claim', color: 'text-blue-600', bg: 'bg-blue-50' },
};

export default function WarrantyDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const warRef = useMemoFirebase(() => businessId && id ? doc(firestore, 'businesses', businessId, 'solarWarranties', id) : null, [firestore, businessId, id]);
  const { data: warranty, isLoading: isWarLoading } = useDoc<any>(warRef);

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const handleUpdateStatus = (status: string) => {
    if (!warRef) return;
    updateDocumentNonBlocking(warRef, { status, updatedAt: serverTimestamp() });
    toast({ title: "Coverage Updated" });
  };

  if (isWarLoading) return <div className="min-h-screen flex items-center justify-center opacity-40"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;
  if (!warranty) return <div className="p-20 text-center space-y-4">No warranty record found.</div>;

  const sInfo = WARRANTY_STATUS_CONFIG[warranty.status] || WARRANTY_STATUS_CONFIG['ACTIVE'];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 text-left px-2 sm:px-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4 text-left flex-1 min-w-0">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm border border-border/50 shrink-0"><Link href="/solar/warranties"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="text-left flex-1 min-w-0">
             <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary h-5 px-3 mb-1.5 tracking-widest">WARRANTY NODE: {warranty.warrantyNumber}</Badge>
             <h1 className="text-2xl md:text-4xl font-black text-slate-900 leading-none uppercase truncate">{warranty.customerName}</h1>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={warranty.status} onValueChange={handleUpdateStatus}>
             <SelectTrigger className={cn("flex-1 md:flex-none h-11 rounded-xl font-black uppercase text-[10px] tracking-widest w-full md:w-48 shadow-xl", sInfo.bg, sInfo.color)}>
                <SelectValue />
             </SelectTrigger>
             <SelectContent className="rounded-xl border-none shadow-2xl">
                {Object.keys(WARRANTY_STATUS_CONFIG).map(s => <SelectItem key={s} value={s} className="text-[10px] font-black uppercase">{WARRANTY_STATUS_CONFIG[s].label}</SelectItem>)}
             </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-8 space-y-12">
          {/* WARRANTY CARD VIEW */}
          <Card className="border-none shadow-2xl bg-white rounded-[3rem] overflow-hidden border">
             <CardHeader className="bg-slate-900 py-12 px-10 text-white relative text-left shrink-0">
                <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12"><ShieldCheck className="h-64 w-64" /></div>
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-10">
                   <div className="space-y-6 flex-1 text-left">
                     <div className="h-16 w-16 rounded-[1.5rem] bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                        <Shield className="h-8 w-8 text-accent" />
                     </div>
                     <div className="text-left">
                        <h3 className="text-2xl font-black uppercase tracking-tight leading-none">Security Coverage Node</h3>
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] mt-3">Verified by Biztrix OS v3.5</p>
                     </div>
                   </div>
                   <div className="text-left sm:text-right space-y-2">
                      <p className="text-[11px] font-black text-accent uppercase tracking-widest leading-none mb-1">Validity Node</p>
                      <p className="text-2xl font-black text-white">{warranty.startDate} — {warranty.endDate}</p>
                      <Badge className="bg-green-500 text-white border-none text-[8px] font-black px-3 h-5 uppercase">PROTECTION ACTIVE</Badge>
                   </div>
                </div>
             </CardHeader>
             
             <CardContent className="p-8 sm:p-12 space-y-12 text-left">
                {/* COVERED COMPONENTS */}
                <section className="space-y-8">
                   <div className="flex items-center gap-3 px-1">
                      <Package className="h-5 w-5 text-primary" />
                      <h4 className="text-xs font-black uppercase tracking-widest text-primary leading-none">Covered Components Matrix</h4>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(warranty.coveredComponents || []).map((comp: any, i: number) => (
                        <div key={i} className="p-6 bg-muted/20 rounded-[2rem] border border-transparent hover:border-primary/20 transition-all group flex items-center justify-between text-left">
                           <div className="min-w-0 text-left">
                              <p className="text-[11px] font-black text-slate-900 uppercase truncate">{comp.productName}</p>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">{comp.category} Node</p>
                           </div>
                           <Badge variant="outline" className="bg-white border-primary/20 text-primary font-black text-[7px] h-4 px-2 uppercase">{comp.period}</Badge>
                        </div>
                      ))}
                   </div>
                </section>

                <Separator className="opacity-40" />

                <section className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1"><Info className="h-4 w-4" /> Coverage Details</h4>
                   <div className="p-8 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/10 italic text-sm font-medium text-slate-600 leading-relaxed text-left">
                      "Full technical coverage on manufacturing defects and installation workmanship. Excludes damage due to natural disasters or external interference."
                   </div>
                </section>
             </CardContent>
             <CardFooter className="bg-muted/10 p-8 sm:p-12 border-t flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 text-left">
                   <ShieldCheck className="h-10 w-10 text-green-600 opacity-40" />
                   <div className="text-left">
                     <p className="text-[10px] font-black text-slate-900 uppercase leading-none tracking-tight">Identity Secured</p>
                     <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Tenant isolated warranty node</p>
                   </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                   <Button variant="outline" className="flex-1 sm:flex-none h-12 rounded-xl font-black uppercase text-[10px] tracking-widest">Generate Certificate</Button>
                   <Button className="flex-1 sm:flex-none h-12 bg-primary text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl">Open Claim Hub</Button>
                </div>
             </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8 text-left">
           <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border text-left">
              <CardHeader className="bg-primary/5 border-b py-6 px-8 text-left"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Contextual Links</CardTitle></CardHeader>
              <CardContent className="p-8 space-y-8 text-left">
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Installation Node</p>
                       <Button asChild variant="link" className="h-auto p-0 font-black text-primary text-[10px] uppercase hover:no-underline"><Link href={`/solar/installations/${warranty.solarInstallationId}`}>View Execution Registry <ArrowRight className="ml-1.5 h-3 w-3" /></Link></Button>
                    </div>
                    <Separator />
                    <div className="space-y-1">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Technical Design</p>
                       <Button asChild variant="link" className="h-auto p-0 font-black text-primary text-[10px] uppercase hover:no-underline"><Link href={`/solar/designs/${warranty.solarSystemDesignId}`}>View Engineering Node <ArrowRight className="ml-1.5 h-3 w-3" /></Link></Button>
                    </div>
                 </div>
              </CardContent>
           </Card>

           <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:scale-110 transition-transform"><Bot className="h-40 w-40" /></div>
              <div className="relative z-10 space-y-6">
                 <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><Sparkles className="h-6 w-6 text-accent" /></div>
                 <h4 className="text-xl font-bold uppercase tracking-tight text-white leading-none">Retention Node</h4>
                 <p className="text-xs text-slate-400 leading-relaxed font-medium italic">"Proactive monitoring: Warranty nodes nearing expiry can be targeted for AMC conversion via the **Growth Engine**."</p>
                 <Separator className="bg-white/10" />
                 <Button asChild variant="outline" className="w-full h-12 bg-white/5 border-white/10 text-white font-black uppercase text-[10px] rounded-xl hover:bg-white/10">
                    <Link href="/loyalty/automation">Configure AMC Sequence <ChevronRight className="ml-1 h-3 w-3" /></Link>
                 </Button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
