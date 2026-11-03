
"use client";

import { use, useState, useMemo } from "react";
import { 
  Headset, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck,
  User, 
  SmartphoneNfc, 
  MessageSquare, 
  History, 
  Zap, 
  ChevronRight, 
  ChevronDown,
  Bot, 
  Loader2, 
  Globe, 
  Star,
  ImageIcon,
  Send,
  Reply,
  ShieldAlert,
  Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp, where, Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { sendWhatsAppTemplate } from "@/app/actions/whatsapp-actions";

const PRIORITY_CONFIG: any = {
  'low': { label: 'Low', color: 'text-slate-600', bg: 'bg-slate-100' },
  'medium': { label: 'Medium', color: 'text-blue-700', bg: 'bg-blue-100/60' },
  'high': { label: 'High', color: 'text-orange-700', bg: 'bg-orange-100/60' },
  'urgent': { label: 'Urgent', color: 'text-red-700', bg: 'bg-red-100/60' },
  'emergency': { label: 'Emergency', color: 'text-red-900', bg: 'bg-red-200' },
};

const STATUS_CONFIG: any = {
  'new': { label: 'New', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', icon: Zap },
  'pending': { label: 'Pending', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100', icon: Clock },
  'in-progress': { label: 'Working', color: 'text-primary', bg: 'bg-primary/5 border-primary/10', icon: Zap },
  'on-hold': { label: 'On Hold', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-100', icon: Clock },
  'waiting-customer': { label: 'Waiting', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100', icon: User },
  'resolved': { label: 'Resolved', color: 'text-green-600', bg: 'bg-green-50 border-green-100', icon: CheckCircle2 },
  'closed': { label: 'Closed', color: 'text-slate-500', bg: 'bg-slate-100 border-slate-200', icon: ShieldCheck },
  'rejected': { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-50 border-red-100', icon: AlertCircle },
};

export default function TicketDetailPage(props: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = use(props.params);
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const ticketRef = useMemoFirebase(() => businessId && ticketId ? doc(firestore, 'businesses', businessId, 'complaints', ticketId) : null, [firestore, businessId, ticketId]);
  const { data: ticket, isLoading: isTicketLoading } = useDoc<any>(ticketRef);

  const teamQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null
  , [firestore, businessId]);
  const { data: teamMembersData } = useCollection<any>(teamQuery);
  const teamMembers = teamMembersData || [];

  const timelineQuery = useMemoFirebase(() => 
    businessId && ticketId ? query(collection(firestore, 'businesses', businessId, 'complaints', ticketId, 'timeline'), orderBy('timestamp', 'desc')) : null
  , [firestore, businessId, ticketId]);
  const { data: timelineData } = useCollection<any>(timelineQuery);
  const timeline = timelineData || [];

  const [replyText, setReplyText] = useState("");

  const handleUpdateTicket = async (updates: any) => {
    if (!businessId || !ticketId) return;
    const docRef = doc(firestore, 'businesses', businessId, 'complaints', ticketId);
    const prevStatus = ticket?.status;
    
    updateDocumentNonBlocking(docRef, { ...updates, updatedAt: serverTimestamp() });
    
    if (updates.status || (updates.assignedTo !== undefined)) {
      addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'complaints', ticketId, 'timeline'), {
        action: updates.status ? `Status changed to ${updates.status}` : `Ticket assignment updated: ${updates.assignedNames || 'Unassigned'}`,
        by: profile?.name || 'System',
        timestamp: new Date().toISOString()
      });
    }

    const waConfig = business?.whatsappApiConfig;
    if (updates.status && updates.status !== prevStatus && waConfig?.isVerified && ticket?.customerPhone) {
      try {
        await sendWhatsAppTemplate(
          { phoneId: waConfig.phoneId, accessToken: waConfig.accessToken },
          ticket.customerPhone,
          "ticket_status_update",
          "en_US",
          [
            { type: "body", parameters: [{ type: "text", text: ticket.ticketId }, { type: "text", text: updates.status }] }
          ]
        );
      } catch (e) {
    console.error(e);
        console.warn("WhatsApp Notify Failed:", e);
      }
    }
    toast({ title: "Node Updated" });
  };

  const toggleAssignee = (userId: string) => {
    const current = Array.isArray(ticket.assignedTo) ? ticket.assignedTo : (typeof ticket.assignedTo === 'string' ? [ticket.assignedTo] : []);
    const isSelected = current.includes(userId);
    const updated = isSelected ? current.filter((id: string) => id !== userId) : [...current, userId];
    
    const assignedNames = teamMembers
      .filter((m: any) => updated.includes(m.id))
      .map((m: any) => m.name)
      .join(', ');

    handleUpdateTicket({ assignedTo: updated, assignedNames });
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !businessId || !ticketId) return;
    const timelineRef = collection(firestore, 'businesses', businessId, 'complaints', ticketId, 'timeline');
    addDocumentNonBlocking(timelineRef, {
      action: replyText,
      by: profile?.name || 'Admin',
      role: 'admin',
      timestamp: new Date().toISOString()
    });
    setReplyText("");
    toast({ title: "Message Dispatched" });
  };

  if (isTicketLoading) return <div className="flex flex-col items-center justify-center py-20 opacity-40"><Loader2 className="h-10 w-10 animate-spin text-primary mb-4" /><p className="text-[10px] font-black uppercase tracking-widest text-primary">Establishing Support Node...</p></div>;
  if (!ticket) return <div className="p-20 text-center space-y-4"><ShieldAlert className="h-10 w-10 mx-auto text-red-500" /><p className="font-bold">Ticket not found.</p><Button asChild variant="outline"><Link href="/complaints">Back to Support Desk</Link></Button></div>;

  const publicTrackUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/complaints/track/${businessId}/${ticket.id}`;

  return (
    <div className="space-y-8 pb-20 text-left max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm border shrink-0"><Link href="/complaints"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div>
          <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary h-5 px-2 mb-1.5">TICKET ID: {ticket.ticketId}</Badge>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">{ticket.subject}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border">
            <CardHeader className="bg-primary py-6 px-8 text-white relative">
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><Headset className="h-40 w-40" /></div>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner shrink-0">
                    <User className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{ticket.customerName}</h3>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{ticket.customerPhone}</p>
                  </div>
                </div>
                <div className="flex flex-row items-center gap-3">
                  <span className="text-[10px] font-bold text-white/60 uppercase">Status:</span>
                  <Select value={ticket.status} onValueChange={(v) => handleUpdateTicket({ status: v })}>
                    <SelectTrigger className="h-9 w-32 rounded-xl bg-white/10 border-white/20 text-white text-[10px] font-black uppercase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      {Object.keys(STATUS_CONFIG).map(s => <SelectItem key={s} value={s} className="text-xs font-bold uppercase">{STATUS_CONFIG[s].label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-muted/20 rounded-3xl space-y-3">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Urgency Priority</Label>
                  <Select value={ticket.priority || "medium"} onValueChange={(v) => handleUpdateTicket({ priority: v })}>
                    <SelectTrigger className="h-10 rounded-2xl bg-white border-none shadow-sm font-black text-xs uppercase w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {Object.keys(PRIORITY_CONFIG).map(p => <SelectItem key={p} value={p} className="text-xs font-bold uppercase">{PRIORITY_CONFIG[p].label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-5 bg-muted/20 rounded-3xl space-y-3">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Team Assignment</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-10 w-full rounded-2xl bg-white border-none shadow-sm font-black text-[10px] uppercase justify-between">
                        {(() => {
                          const assignedIds = Array.isArray(ticket.assignedTo) ? ticket.assignedTo : (typeof ticket.assignedTo === 'string' ? [ticket.assignedTo] : []);
                          return assignedIds.length > 0 ? `${assignedIds.length} Assigned` : 'Pick Members';
                        })()}
                        <ChevronDown className="h-3 w-3 opacity-40" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0 rounded-2xl border-none shadow-2xl overflow-hidden" align="start">
                      <div className="p-4 bg-primary/5 border-b"><p className="text-[9px] font-black uppercase tracking-widest text-primary">Select Specialists</p></div>
                      <ScrollArea className="h-48">
                        <div className="p-2 space-y-1">
                          {teamMembers.map((m: any) => {
                            const assignedIds = Array.isArray(ticket.assignedTo) ? ticket.assignedTo : (typeof ticket.assignedTo === 'string' ? [ticket.assignedTo] : []);
                            return (
                              <div key={m.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-xl transition-all cursor-pointer" onClick={() => toggleAssignee(m.id)}>
                                <Checkbox checked={assignedIds.includes(m.id)} />
                                <div className="min-w-0 text-left"><p className="text-xs font-bold truncate">{m.name}</p><p className="text-[8px] font-bold text-muted-foreground uppercase">{m.role}</p></div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">Issue Description</h4>
                <div className="p-6 bg-muted/20 rounded-[2rem] border-none shadow-inner">
                   <p className="text-sm font-medium text-slate-700 leading-relaxed italic">"{ticket.description}"</p>
                </div>
              </div>

              {ticket.mediaUrls?.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Evidence Attachments</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                     {ticket.mediaUrls.map((url: string, i: number) => (
                       <div key={i} className="aspect-video rounded-xl overflow-hidden border shadow-sm cursor-pointer" onClick={() => window.open(url, '_blank')}>
                         <img src={url} className="w-full h-full object-cover" alt="" />
                       </div>
                     ))}
                  </div>
                </div>
              )}

              {/* MESSAGING INTERFACE */}
              <div className="space-y-6">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Conversation Center</h4>
                 <div className="p-6 bg-slate-900 rounded-[2.5rem] space-y-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><MessageSquare className="h-40 w-40" /></div>
                    <div className="space-y-4 relative z-10">
                       <Textarea 
                         placeholder="Type your reply to the customer..." 
                         value={replyText} 
                         onChange={(e) => setReplyText(e.target.value)}
                         className="bg-white/5 border-white/10 text-white p-4 rounded-2xl text-xs font-medium placeholder:text-white/20 min-h-[100px]"
                       />
                       <Button onClick={handleSendReply} disabled={!replyText.trim()} className="w-full h-12 bg-accent text-primary font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl">
                          <Send className="mr-2 h-4 w-4" /> Dispatch Reply
                       </Button>
                    </div>
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border">
             <CardHeader className="bg-muted/30 border-b py-5 px-8"><CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><History className="h-4 w-4" /> Audit Trail & Logs</CardTitle></CardHeader>
             <CardContent className="p-8">
                <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-8px)] before:w-0.5 before:bg-muted">
                   <div className="relative flex items-center gap-4">
                      <div className="absolute -left-[21px] h-4 w-4 rounded-full bg-white border-2 border-primary z-10" />
                      <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0 shadow-sm"><Zap className="h-4 w-4" /></div>
                      <div>
                        <p className="text-xs font-black text-slate-900 uppercase">Ticket Initialized</p>
                        <p className="text-[8px] font-bold text-muted-foreground uppercase">{ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleString() : 'Recently'}</p>
                      </div>
                   </div>
                   {timeline.map((log: any, i: number) => (
                    <div key={i} className="relative flex items-center gap-4 animate-in slide-in-from-left-2" style={{ animationDelay: `${i * 100}ms` }}>
                       <div className="absolute -left-[21px] h-4 w-4 rounded-full bg-white border-2 border-slate-200 z-10" />
                       <div className="h-9 w-9 rounded-xl bg-muted/20 flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                         {log.role === 'admin' ? <Reply className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4" />}
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

        <div className="lg:col-span-4 space-y-8">
           <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border">
              <CardHeader className="bg-primary/5 border-b py-6 px-8">
                 <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><SmartphoneNfc className="h-4 w-4" /> Quick Connect</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6 text-center">
                 <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-2 text-green-600 border-4 border-white shadow-xl shadow-green-200/50"><SmartphoneNfc className="h-8 w-8" /></div>
                 <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase text-slate-900">WhatsApp Pulse</h4>
                    <p className="text-[10px] text-muted-foreground leading-relaxed uppercase">Connect directly with the customer on WhatsApp.</p>
                 </div>
                 <Button className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs" onClick={() => window.open(`https://wa.me/${ticket.customerPhone.replace(/\D/g, '')}`)}>Launch Chat</Button>
              </CardContent>
           </Card>

           <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden group">
              <CardHeader className="p-8 pb-4">
                 <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner group-hover:scale-110 transition-transform"><Globe className="h-6 w-6 text-accent" /></div>
                 <CardTitle className="text-base font-black uppercase tracking-widest mt-4 leading-none text-white">Tracking Portal</CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-6">
                 <p className="text-xs text-slate-400 leading-relaxed font-medium">This secure link allows the customer to track their resolution progress without logging in.</p>
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-[9px] font-mono text-accent truncate overflow-hidden shadow-inner">{publicTrackUrl}</div>
                 <Button className="w-full h-12 bg-white text-primary font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-accent transition-all" onClick={() => {
                   navigator.clipboard.writeText(publicTrackUrl);
                   toast({ title: "Link Copied" });
                 }}>Copy Tracking URL <ChevronRight className="ml-1 h-3 w-3" /></Button>
              </CardContent>
           </Card>

           <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 flex items-start gap-4">
              <ShieldCheck className="h-6 w-6 text-primary shrink-0 opacity-40" />
              <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">Security Node Active</p>
                 <p className="text-[10px] text-primary/60 leading-relaxed italic mt-1">"This complaint is isolated per tenant and encrypted with bank-grade security protocols."</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
