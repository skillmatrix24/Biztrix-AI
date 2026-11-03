"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Zap, 
  Plus, 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  Clock, 
  SmartphoneNfc, 
  History, 
  Users, 
  Target, 
  Loader2, 
  ShieldCheck, 
  Bot, 
  Sparkles, 
  Send, 
  MessageSquare, 
  TrendingUp, 
  ChevronRight,
  Trash2,
  Edit2,
  Grid,
  Database,
  LineChart,
  Target as TargetIcon,
  BadgeCheck,
  Calendar,
  AlertTriangle,
  ShieldAlert,
  CalendarDays,
  RefreshCcw,
  Receipt
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp, where, getDocs, limit } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { format, isAfter, parseISO } from "date-fns";
import { suggestCampaign } from "@/ai/flows/suggest-loyalty-campaign-flow";
import { listWhatsAppTemplates, sendWhatsAppTemplate } from "@/app/actions/whatsapp-actions";

/**
 * Helper to ensure phone number has international country code (91 for India)
 */
function formatPhoneForMeta(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) clean = clean.substring(1);
  if (clean.length === 10) return `91${clean}`;
  return clean;
}

export default function CampaignHubPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  // 1. Fetch Campaigns
  const campaignsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'campaigns'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: campaignsRaw, isLoading: isCampaignsLoading } = useCollection<any>(campaignsQuery);
  const campaigns = campaignsRaw || [];

  // 2. Fetch Contact Groups for Audience Targeting
  const groupsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'contactGroups'), orderBy('name', 'asc')) : null
  , [firestore, businessId]);
  const { data: groupsRaw } = useCollection<any>(groupsQuery);
  const groups = groupsRaw || [];

  // 3. Form State
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isMetaSyncing, setIsMetaSyncing] = useState(false);
  const [metaTemplates, setMetaTemplates] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    targetGroupId: "all",
    templateName: "",
    message: "", 
    scheduledAt: "",
  });

  const isWhatsappActive = useMemo(() => {
    return business?.activeAddonIds?.includes('suite_growth') || business?.status === 'pro';
  }, [business]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const filteredCampaigns = useMemo(() => {
    return (campaigns || []).filter((c: any) => 
      c.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [campaigns, searchTerm]);

  const dynamicStats = useMemo(() => {
    const list = campaigns || [];
    const totalRecipients = list.reduce((sum, c) => sum + (Number(c.recipientCount) || 0), 0);
    const sentCampaignsCount = list.filter(c => c.status === 'sent').length;
    const deliveryRate = list.length > 0 ? Math.round((sentCampaignsCount / list.length) * 100) : 0;
    
    const lastCampaign = list[0];
    const lastDate = lastCampaign?.createdAt?.toDate ? format(lastCampaign.createdAt.toDate(), 'dd MMM') : "No History";

    return {
      totalRecipients,
      deliveryRate: list.length > 0 ? deliveryRate : 100, 
      activeSegments: (groups || []).length,
      lastDate
    };
  }, [campaigns, groups]);

  const fetchMetaTemplates = async () => {
    const waConfig = business?.whatsappApiConfig;
    if (!waConfig?.isVerified || !businessId) return;
    setIsMetaSyncing(true);
    try {
      const res = await listWhatsAppTemplates(businessId, { wabaId: waConfig.wabaId, accessToken: waConfig.accessToken });
      if (res.success) setMetaTemplates(res.templates?.filter((t: any) => t.status === 'APPROVED') || []);
    } catch (e) {
    console.error(e);
      console.warn("Meta Sync Error:", e);
    } finally {
      setIsMetaSyncing(false);
    }
  };

  useEffect(() => {
    if (isAddOpen && business?.whatsappApiConfig?.isVerified) {
      fetchMetaTemplates();
    }
  }, [isAddOpen, business?.whatsappApiConfig?.isVerified]);

  const handleAiMessage = async () => {
    if (!formData.title || !businessId) {
      toast({ variant: "destructive", title: "Missing Goal", description: "Please enter a Campaign Title/Goal first." });
      return;
    }
    setIsAiLoading(true);
    try {
      const selectedGroup = (groups || []).find(g => g.id === formData.targetGroupId);
      const result = await suggestCampaign({
        businessName: business?.name || "Our Store",
        segment: selectedGroup?.name || "All Customers",
        goal: formData.title
      });
      setFormData({ ...formData, message: result.whatsappMessage });
      toast({ title: "AI Copy Ready", description: "Check placeholders in designer." });
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "AI Busy" });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleLaunch = async () => {
    if (!formData.title || !businessId || !formData.templateName) {
        toast({ variant: "destructive", title: "Form Incomplete", description: "Title and Template are required." });
        return;
    }

    if (!isWhatsappActive) {
      toast({ variant: "destructive", title: "Premium Required", description: "WhatsApp module is not active." });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Resolve Recipient Nodes from Global Contacts
      const contactsRef = collection(firestore, 'businesses', businessId, 'globalContacts');
      let recipientDocs: any[] = [];
      
      if (formData.targetGroupId === 'all') {
        const allSnap = await getDocs(contactsRef);
        recipientDocs = allSnap.docs;
      } else {
        const selectedGroup = (groups || []).find(g => g.id === formData.targetGroupId);
        if (selectedGroup) {
          const groupQuery = query(contactsRef, where('groups', 'array-contains', selectedGroup.name));
          const groupSnap = await getDocs(groupQuery);
          recipientDocs = groupSnap.docs;
        }
      }
      
      const finalCount = recipientDocs.length;
      if (finalCount === 0) {
        toast({ variant: "destructive", title: "Audience Empty", description: "Selected group has no contacts. Please sync Hub Registry first." });
        setIsSubmitting(false);
        return;
      }

      const scheduledDate = formData.scheduledAt ? parseISO(formData.scheduledAt) : null;
      const isScheduled = scheduledDate && isAfter(scheduledDate, new Date());

      // 2. Perform Bulk Dispatch if not scheduled
      if (!isScheduled) {
        const waConfig = business?.whatsappApiConfig;
        const template = metaTemplates.find(t => t.name === formData.templateName);
        const lang = template?.language || "en_US";

        toast({ title: "Dispatching Nodes", description: `Starting transmission to ${finalCount} contacts...` });

        for (const rDoc of recipientDocs) {
          const contact = rDoc.data();
          if (!contact.phone) continue;

          const targetPhone = formatPhoneForMeta(contact.phone);
          const trackUrl = `${window.location.origin}/loyalty/track/${businessId}/mem_c_${targetPhone.slice(-10)}`;

          // Robust Parameter Mapping: Supports templates needing multiple variables
          const components = [{
            type: "body",
            parameters: [
              { type: "text", text: contact.name || "Customer" },
              { type: "text", text: contact.phone || "N/A" },
              { type: "text", text: trackUrl }
            ]
          }];

          try {
            await sendWhatsAppTemplate(
              businessId,
              { phoneId: waConfig.phoneId, accessToken: waConfig.accessToken },
              targetPhone,
              formData.templateName,
              lang,
              components
            );
            successCount++;
          } catch (e) {
    console.error(e);
            failCount++;
            console.warn(`Node ${contact.phone} failed:`, e);
          }
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // 3. Save Campaign Log
      const campaignRef = collection(firestore, 'businesses', businessId, 'campaigns');
      await addDocumentNonBlocking(campaignRef, {
        ...formData,
        status: isScheduled ? 'scheduled' : 'sent',
        recipientCount: finalCount,
        createdAt: serverTimestamp()
      });

      toast({ 
        title: isScheduled ? "Campaign Scheduled" : "Campaign Finished", 
        description: isScheduled ? "Execution node locked." : `Successfully processed ${finalCount} recipients.` 
      });
      setIsAddOpen(false);
      setFormData({ title: "", targetGroupId: "all", templateName: "", message: "", scheduledAt: "" });
    } catch (e) {
      console.error("Campaign Launch Failure:", e);
      toast({ variant: "destructive", title: "Dispatch Error", description: "Meta connection failed." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-10 pb-20 px-2 sm:px-0 text-left">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
            <Zap className="h-7 w-7" />
          </div>
          <div className="text-left">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Campaign Hub</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Verified Bulk Transmission Node</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button asChild variant="outline" className="h-10 px-4 rounded-xl border-primary/20 text-primary font-black uppercase text-[9px] bg-white shadow-sm">
             <Link href="/whatsapp-automation/contacts"><Users className="mr-2 h-4 w-4" /> Manage Audience</Link>
           </Button>
           <Button onClick={() => setIsAddOpen(true)} className="bg-primary hover:bg-primary/90 shadow-xl h-10 px-6 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
             <Plus className="mr-2 h-4 w-4" /> New Sequence
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-primary text-left">
           <div className="flex items-center justify-between opacity-60 mb-1"><span className="text-[10px] font-black uppercase tracking-widest">Total Volume</span><Send className="h-4 w-4 text-primary" /></div>
           <div className="text-2xl font-black text-slate-900">{dynamicStats.totalRecipients.toLocaleString()} Nodes</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-green-500 text-left">
           <div className="flex items-center justify-between opacity-60 mb-1"><span className="text-[10px] font-black uppercase tracking-widest">Node Health</span><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
           <div className="text-2xl font-black text-green-700">{dynamicStats.deliveryRate}% Success</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-orange-500 text-left">
           <div className="flex items-center justify-between opacity-60 mb-1"><span className="text-[10px] font-black uppercase tracking-widest">Active Segments</span><Grid className="h-4 w-4 text-orange-600" /></div>
           <div className="text-2xl font-black text-orange-700">{dynamicStats.activeSegments} Clusters</div>
        </Card>
        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6 text-left">
           <div className="flex items-center justify-between opacity-40 mb-1"><span className="text-[10px] font-black text-accent uppercase tracking-widest">Last Broadcast</span><Clock className="h-4 w-4 text-accent" /></div>
           <div className="text-2xl font-black text-white">{dynamicStats.lastDate}</div>
        </Card>
      </div>

      <div className="space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-1">
           <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2"><History className="h-4 w-4" /> Transmission Registry</h3>
           <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
              <Input placeholder="Search campaigns..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 pl-10 rounded-xl bg-white border-none shadow-inner text-xs font-bold w-full" />
            </div>
        </div>

        <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2.5rem] border w-full">
          <div className="overflow-x-auto scrollbar-hide">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-muted/10">
                  <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Campaign Title</TableHead>
                  <TableHead className="text-[10px] font-black uppercase h-12">Template</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase h-12">No. of Contacts</TableHead>
                  <TableHead className="text-[10px] font-black uppercase h-12">Created At</TableHead>
                  <TableHead className="text-[10px] font-black uppercase h-12">Schedule At</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase h-12">Status</TableHead>
                  <TableHead className="text-right pr-8 h-12 w-32">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isCampaignsLoading ? (
                  <TableRow><TableCell colSpan={7} className="h-60 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary opacity-20" /></TableCell></TableRow>
                ) : filteredCampaigns.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-60 text-center opacity-30 italic text-sm font-black uppercase">No broadcast history found.</TableCell></TableRow>
                ) : (
                  filteredCampaigns.map((c: any) => (
                    <TableRow key={c.id} className="group hover:bg-muted/5 transition-colors border-b">
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><MessageSquare className="h-4 w-4" /></div>
                          <span className="text-sm font-black text-slate-900 truncate block max-w-[200px] uppercase tracking-tight">{c.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                         <Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 border-primary/20 text-primary font-mono tracking-tighter">{c.templateName || '---'}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-black text-xs">{c.recipientCount || '0'}</TableCell>
                      <TableCell>
                         <span className="text-[10px] font-bold text-slate-500 uppercase">{c.createdAt?.toDate ? format(c.createdAt.toDate(), 'dd MMM yyyy, HH:mm') : 'Recently'}</span>
                      </TableCell>
                      <TableCell>
                         {c.scheduledAt ? (
                           <span className="text-[10px] font-black text-orange-600 uppercase flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> {format(parseISO(c.scheduledAt), 'dd MMM, HH:mm')}</span>
                         ) : (
                           <span className="text-[9px] font-bold text-slate-300 uppercase italic">Instant Node</span>
                         )}
                      </TableCell>
                      <TableCell className="text-center">
                         <Badge className={cn("text-[8px] font-black uppercase h-4 px-2 border-none shadow-sm", 
                           c.status === 'sent' ? "bg-green-100 text-green-700" : 
                           c.status === 'scheduled' ? "bg-orange-100 text-orange-700" :
                           "bg-red-50 text-red-600")}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                         <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive/40 hover:text-destructive transition-all" onClick={() => deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId!, 'campaigns', c.id))}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
         <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden text-left h-full">
            <CardContent className="p-8 space-y-8">
               <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                  <Sparkles className="h-6 w-6 text-accent fill-accent" />
               </div>
               <div className="space-y-2">
                  <h3 className="text-xl font-bold uppercase tracking-tight">Verified Protocol</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">Biztrix Growth Engine ensuring every campaign follows Meta's opt-in logic to minimize block risk.</p>
               </div>
               <Separator className="bg-white/10" />
               <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center text-green-400 border border-white/5 shadow-inner"><BadgeCheck className="h-5 w-5" /></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Meta API Verified flow</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center text-green-400 border border-white/5 shadow-inner"><Bot className="h-5 w-5" /></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">AI personalizer active</span>
                  </div>
               </div>
            </CardContent>
         </Card>

         <div className="p-8 bg-orange-50 rounded-[2.5rem] border border-orange-100 flex items-start gap-5 h-full">
            <AlertTriangle className="h-6 w-6 text-orange-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-left">
               <p className="text-xs font-black uppercase text-orange-900 tracking-widest">Spam Guard Active</p>
               <p className="text-sm text-orange-800/70 leading-relaxed font-medium italic mt-2">
                 "Campaigns are staggered by 5 seconds per node automatically to keep your WABA score high. Avoid sending more than 1000 messages in a single burst for new accounts."
               </p>
            </div>
         </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[800px] rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden w-[98vw] max-h-[95vh] flex flex-col lg:flex-row text-left">
           <div className="flex-1 flex flex-col bg-white overflow-hidden">
              <DialogHeader className="p-6 sm:p-8 bg-slate-900 text-white text-left shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20"><Zap className="h-6 w-6 text-accent" /></div>
                    <div><DialogTitle className="text-xl font-bold uppercase">Configure Sequence</DialogTitle><p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Targeting & Schedule logic</p></div>
                 </div>
              </DialogHeader>
              <ScrollArea className="flex-1">
                 <div className="p-6 sm:p-8 space-y-10 pb-20">
                    <div className="space-y-4">
                       <div className="flex items-center justify-between">
                         <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Campaign Title / Internal Note *</Label>
                         <Badge variant="outline" className="text-[7px] font-black uppercase border-green-200 text-green-600 bg-green-50">Secure Sequence</Badge>
                       </div>
                       <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="e.g. Diwali Premium Blast 2026" className="h-12 rounded-xl font-black text-lg bg-muted/20 border-none shadow-inner" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Target Cluster</Label>
                          <Select value={formData.targetGroupId} onValueChange={(v) => setFormData({...formData, targetGroupId: v})}>
                             <SelectTrigger className="h-11 rounded-xl bg-white font-bold text-xs uppercase"><SelectValue placeholder="Select Group" /></SelectTrigger>
                             <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="all" className="text-[10px] font-bold uppercase">All Contacts</SelectItem>
                                {(groups || []).map(g => <SelectItem key={g.id} value={g.id} className="text-[10px] font-bold uppercase">{g.name}</SelectItem>)}
                             </SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-2">
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-[10px] font-black uppercase text-primary ml-1">Approved Template</Label>
                            {isMetaSyncing && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                          </div>
                          <Select value={formData.templateName} onValueChange={(v) => setFormData({...formData, templateName: v})}>
                             <SelectTrigger className="h-11 rounded-xl bg-primary/5 border-primary/10 font-black text-[10px] uppercase text-primary"><SelectValue placeholder="Pick Meta Node..." /></SelectTrigger>
                             <SelectContent className="rounded-xl border-none shadow-2xl">
                                {metaTemplates.length === 0 ? <SelectItem value="none" disabled>No approved nodes found</SelectItem> : metaTemplates.map(t => <SelectItem key={t.name} value={t.name} className="text-[10px] font-bold uppercase">{t.name}</SelectItem>)}
                             </SelectContent>
                          </Select>
                       </div>
                    </div>

                    <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100 space-y-4">
                       <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-orange-600" />
                          <Label className="text-[10px] font-black uppercase text-orange-800">Sequence Schedule</Label>
                       </div>
                       <Input 
                          type="datetime-local" 
                          value={formData.scheduledAt} 
                          onChange={(e) => setFormData({...formData, scheduledAt: e.target.value})}
                          className="h-12 rounded-xl bg-white border-orange-200 font-bold text-xs text-orange-900" 
                       />
                       <p className="text-[8px] font-bold text-orange-600/60 uppercase px-1">Leave empty for instant dispatch.</p>
                    </div>

                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Message Body (Personalization Context)</Label>
                          <Button variant="ghost" size="sm" onClick={handleAiMessage} disabled={isAiLoading} className="h-7 rounded-xl bg-primary/5 text-primary text-[8px] font-black uppercase border border-primary/10 gap-1.5">{isAiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 fill-current" />} AI Contextual Draft</Button>
                       </div>
                       <Textarea value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} placeholder="Hi {{name}}, we have a special reward for you..." className="min-h-[140px] rounded-2xl bg-muted/20 border-none shadow-inner p-5 text-sm font-medium leading-relaxed" />
                    </div>
                 </div>
              </ScrollArea>
              <DialogFooter className="p-8 bg-muted/10 border-t shrink-0">
                 <Button onClick={handleLaunch} disabled={isSubmitting || !formData.title || !formData.templateName} className="w-full h-16 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl text-white">
                   {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <Send className="h-5 w-5 mr-3" />}
                   Commit & Deploy Sequence
                 </Button>
              </DialogFooter>
           </div>

           <div className="hidden lg:flex w-[300px] bg-slate-50 flex-col border-l overflow-hidden">
              <div className="p-6 bg-white/50 border-b flex items-center justify-center shrink-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mapping Hub</p>
              </div>
              <ScrollArea className="flex-1 p-6">
                 <div className="space-y-8 text-left">
                    <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase">Supported Placeholder Protocol:</p>
                    <div className="space-y-3">
                       {[
                         { id: '{{1}}', label: 'Customer Name' },
                         { id: '{{2}}', label: 'Mobile Number' },
                         { id: '{{3}}', label: 'Tracking URL' },
                       ].map(v => (
                         <div key={v.id} className="p-3 bg-white rounded-xl border shadow-sm group hover:border-primary/40 transition-all cursor-copy" onClick={() => { setFormData({...formData, message: formData.message + " " + v.id}); toast({title:"Variable Mapped"}); }}>
                            <p className="text-[10px] font-black text-primary font-mono">{v.id}</p>
                            <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">{v.label}</p>
                         </div>
                       ))}
                    </div>
                    <Separator className="opacity-40" />
                    <div className="p-6 bg-slate-900 rounded-3xl text-white text-left space-y-4">
                       <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" /><span className="text-[9px] font-black uppercase text-accent">Safe Mode</span></div>
                       <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                         "To prevent number blocks, Biztrix staggered sending logic uses high-quality approved templates with personalized context."
                       </p>
                    </div>
                 </div>
              </ScrollArea>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
