
"use client";

import { use, useState, useEffect, useMemo, useRef } from "react";
import { 
  Headset, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  User, 
  Bot, 
  History, 
  ShieldCheck, 
  Building2, 
  Star, 
  Send, 
  SmartphoneNfc, 
  Loader2, 
  Reply, 
  Info, 
  ExternalLink, 
  ChevronRight, 
  BadgeCheck, 
  Zap, 
  Activity, 
  Phone, 
  MessageSquare, 
  AlertTriangle, 
  ShieldAlert, 
  Smartphone, 
  ImageIcon, 
  X, 
  Lock, 
  MessageCircle, 
  PhoneCall, 
  Users,
  LayoutList,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking, useCollection, addDocumentNonBlocking } from "@/firebase";
import { doc, serverTimestamp, collection, query, orderBy, where, getDoc, getDocs, limit } from "firebase/firestore";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

const STATUS_CONFIG: any = {
  'new': { label: 'Raised', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', icon: Zap },
  'pending': { label: 'In Queue', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100', icon: Clock },
  'in-progress': { label: 'Specialist Working', color: 'text-primary', bg: 'bg-primary/5 border-primary/10', icon: Activity },
  'on-hold': { label: 'Hold', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-100', icon: Clock },
  'waiting-customer': { label: 'Action Needed', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100', icon: User },
  'resolved': { label: 'Resolved', color: 'text-green-600', bg: 'bg-green-50 border-green-100', icon: CheckCircle2 },
  'closed': { label: 'Case Closed', color: 'text-slate-500', bg: 'bg-slate-100 border-slate-200', icon: ShieldCheck },
  'rejected': { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-50 border-red-100', icon: AlertTriangle },
};

export default function PublicProjectTrackingPage(props: { params: Promise<{ businessId: string, ticketId: string }> }) {
  const { businessId: paramId, ticketId } = use(props.params);
  const firestore = useFirestore();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [verifyPhone, setVerifyPhone] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Chat/Request State
  const [chatRequest, setChatRequest] = useState("");
  const [isSubmittingChat, setIsSubmittingChat] = useState(false);

  // Feedback State
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // ID Resolver Effect
  useEffect(() => {
    async function resolveId() {
      if (!paramId) return;
      if (paramId.startsWith('biz_')) {
        setBusinessId(paramId);
      } else {
        const q = query(collection(firestore, 'businesses'), where('slug', '==', paramId.toLowerCase()), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) setBusinessId(snap.docs[0].id);
        else setBusinessId(paramId);
      }
    }
    resolveId();
  }, [paramId, firestore]);

  // Ticket Fetcher Effect
  useEffect(() => {
    async function findTicket() {
      if (!businessId || !ticketId) return;
      const docRef = doc(firestore, 'businesses', businessId, 'complaints', ticketId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setTicket({ ...snap.data(), id: snap.id });
      }
      setIsSearching(false);
    }
    if (businessId) findTicket();
  }, [businessId, ticketId, firestore]);

  const handleVerify = () => {
    if (!ticket) return;
    setIsVerifying(true);
    // Simple verification check against registered phone
    if (ticket.customerPhone.includes(verifyPhone) && verifyPhone.length >= 4) {
      setIsVerified(true);
      toast({ title: "Access Granted" });
    } else {
      toast({ variant: "destructive", title: "Verification Failed", description: "Phone number mismatch." });
    }
    setIsVerifying(false);
  };

  const bizRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(bizRef);

  const timelineQuery = useMemoFirebase(() => 
    businessId && ticket?.id ? query(collection(firestore, 'businesses', businessId, 'complaints', ticket.id, 'timeline'), orderBy('timestamp', 'asc')) : null
  , [firestore, businessId, ticket?.id]);
  const { data: timelineData } = useCollection<any>(timelineQuery);
  const timeline = timelineData || [];

  const assignedUsersQuery = useMemoFirebase(() => {
    if (!businessId || !ticket) return null;
    const ids = Array.isArray(ticket.assignedTo) ? ticket.assignedTo : (typeof ticket.assignedTo === 'string' ? [ticket.assignedTo] : []);
    if (ids.length === 0) return null;
    return query(collection(firestore, 'users'), where('id', 'in', ids));
  }, [firestore, businessId, ticket?.assignedTo]);
  const { data: assignedMembersData } = useCollection<any>(assignedUsersQuery);
  const assignedMembers = assignedMembersData || [];

  const handleFeedbackSubmit = () => {
    if (!rating || !ticket || !businessId) return;
    setIsSubmittingFeedback(true);
    const docRef = doc(firestore, 'businesses', businessId, 'complaints', ticket.id);
    updateDocumentNonBlocking(docRef, {
      rating,
      feedback: feedbackText,
      feedbackAt: new Date().toISOString()
    });
    setTicket({...ticket, rating, feedback: feedbackText});
    setIsSubmittingFeedback(false);
    toast({ title: "Thank You!", description: "Feedback node registered." });
  };

  const handleSubmitChat = () => {
    if (!chatRequest.trim() || !businessId || !ticket) return;
    setIsSubmittingChat(true);
    
    const timelineRef = collection(firestore, 'businesses', businessId, 'complaints', ticket.id, 'timeline');
    addDocumentNonBlocking(timelineRef, {
      action: chatRequest,
      by: ticket.customerName || 'Customer',
      role: 'customer',
      timestamp: new Date().toISOString()
    });

    const assignedIds = Array.isArray(ticket.assignedTo) ? ticket.assignedTo : (typeof ticket.assignedTo === 'string' ? [ticket.assignedTo] : []);
    if (assignedIds.length > 0) {
      assignedIds.forEach((uid: string) => {
        if (!uid) return;
        addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'notifications'), {
          businessId,
          recipientId: uid,
          title: `Update on Ticket ${ticket.ticketId}`,
          message: `${ticket.customerName}: ${chatRequest.substring(0, 50)}...`,
          type: 'message',
          isRead: false,
          createdAt: serverTimestamp()
        });
      });
    }

    setChatRequest("");
    setIsSubmittingChat(false);
    toast({ title: "Message Sent" });
  };

  if (isSearching) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>;
  if (!ticket) return <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center"><ShieldAlert className="h-8 w-8 text-red-600 mb-6" /><h1 className="text-2xl font-bold">Ticket Not Found</h1><Button asChild variant="outline" className="mt-4"><Link href="/">Return Home</Link></Button></div>;

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
         <Card className="max-w-md w-full border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 sm:p-10 bg-slate-900 text-white">
               <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6"><Lock className="h-8 w-8 text-accent" /></div>
               <CardTitle className="text-xl font-black uppercase text-white">Secure Access Node</CardTitle>
               <CardDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Verify Identity to track Ticket {ticket.ticketId}</CardDescription>
            </CardHeader>
            <CardContent className="p-8 sm:p-10 space-y-6 text-left">
               <div className="space-y-3 text-left">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Enter Registered Phone</Label>
                  <Input type="tel" value={verifyPhone} onChange={(e) => setVerifyPhone(e.target.value)} placeholder="91XXXXXXXX" className="h-14 rounded-2xl bg-muted/20 border-none shadow-inner text-lg font-black text-center" />
               </div>
               <Button onClick={handleVerify} disabled={isVerifying || verifyPhone.length < 4} className="w-full h-16 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl text-white">
                 {isVerifying ? <Loader2 className="animate-spin h-5 w-5" /> : "Verify Identity"}
               </Button>
            </CardContent>
         </Card>
      </div>
    );
  }

  const sInfo = STATUS_CONFIG[ticket.status || 'new'];
  const canGiveFeedback = (ticket.status === 'resolved' || ticket.status === 'closed') && !ticket.rating;

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-20 overflow-x-hidden text-left">
      <header className="sticky top-0 z-50 bg-white border-b h-16 sm:h-20 flex items-center shadow-sm">
        <div className="max-w-6xl mx-auto px-4 w-full flex items-center justify-between text-left">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 text-left">
             <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-border/10 shrink-0 overflow-hidden text-left">
                {business?.logoUrl ? <img src={business.logoUrl} className="h-full w-full object-cover p-1" alt="" /> : <div className="h-full w-full bg-primary flex items-center justify-center text-white font-black text-xs sm:text-sm">{business?.name?.charAt(0) || 'B'}</div>}
             </div>
             <div className="flex flex-col min-w-0 text-left">
                <span className="text-sm sm:text-base font-black text-slate-900 truncate leading-none">{business?.name}</span>
                <span className="text-[8px] sm:text-[9px] font-bold text-primary uppercase tracking-widest mt-2 block">Support Tracking Node</span>
             </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-8 rounded-xl text-[9px] font-black uppercase text-primary px-3">
            <Link href="/"><ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> <span className="hidden sm:inline">Back</span></Link>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 md:pt-12 space-y-10 md:space-y-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-8 text-left">
           <div className="space-y-2 w-full md:w-auto text-left">
              <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary h-5 px-3">Ticket ID: {ticket.ticketId}</Badge>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight uppercase">{ticket.subject}</h1>
              <div className="flex items-center gap-3 flex-wrap text-left mt-2">
                <p className="text-xs md:text-sm text-muted-foreground font-medium flex items-center gap-2"><User className="h-3.5 w-3.5" /> Filed by {ticket.customerName}</p>
                <Separator orientation="vertical" className="h-3 hidden sm:block" />
                <p className="text-[10px] font-black uppercase text-primary tracking-widest">{ticket.category}</p>
              </div>
           </div>
           <div className={cn("w-full md:w-auto px-6 md:px-8 py-4 md:py-5 rounded-[2rem] border-2 flex items-center gap-4 md:gap-5 transition-all shadow-xl", sInfo.bg)}>
              <sInfo.icon className={cn("h-6 w-6 md:h-7 md:w-7", sInfo.color)} />
              <div className="text-left">
                <p className="text-[9px] font-black uppercase text-muted-foreground opacity-60 tracking-widest">Live Status</p>
                <p className={cn("text-lg font-black leading-none mt-1", sInfo.color)}>{sInfo.label}</p>
              </div>
           </div>
        </div>

        {canGiveFeedback && (
          <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] p-6 sm:p-10 space-y-8 animate-in slide-in-from-top-4 duration-700 text-left">
             <div className="flex items-center gap-4 text-left">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0"><Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-accent" /></div>
                <div className="text-left">
                   <h3 className="text-lg md:text-xl font-bold uppercase tracking-tight text-white">How did we do?</h3>
                   <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">Share your satisfaction score</p>
                </div>
             </div>
             <div className="space-y-6 text-center">
                <div className="flex justify-center gap-2 sm:gap-3 text-left">
                   {[1,2,3,4,5].map(v => (
                     <button key={v} onClick={() => setRating(v)} className={cn("h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center transition-all", rating >= v ? "bg-accent text-primary scale-110 shadow-lg" : "bg-white/10 text-white/40 hover:bg-white/20")}>
                        <Star className={cn("h-5 w-5 sm:h-6 sm:w-6", rating >= v && "fill-current")} />
                     </button>
                   ))}
                </div>
                <Textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Type a quick review (optional)..." className="bg-white/5 border-white/10 text-white p-4 rounded-2xl text-sm font-medium" />
                <Button onClick={handleFeedbackSubmit} disabled={!rating || isSubmittingFeedback} className="w-full h-14 bg-accent text-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">
                   {isSubmittingFeedback ? <Loader2 className="animate-spin h-5 w-5" /> : "Deploy Feedback Node"}
                </Button>
             </div>
          </Card>
        )}

        <Tabs defaultValue="feed" className="w-full">
           <TabsList className="bg-white border h-14 p-1.5 rounded-2xl shadow-sm mb-10 flex overflow-x-auto scrollbar-hide">
              <TabsTrigger value="feed" className="flex-1 text-[10px] font-black uppercase px-6 gap-2"><MessageSquare className="h-4 w-4" /> Live Resolution</TabsTrigger>
              <TabsTrigger value="info" className="flex-1 text-[10px] font-black uppercase px-6 gap-2"><LayoutList className="h-4 w-4" /> Details & Media</TabsTrigger>
              <TabsTrigger value="team" className="flex-1 text-[10px] font-black uppercase px-6 gap-2"><Users className="h-4 w-4" /> Assigned Team</TabsTrigger>
           </TabsList>

           <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start text-left">
              <div className="lg:col-span-8">
                 <TabsContent value="feed" className="m-0 space-y-6">
                    <div className="flex flex-col gap-6 text-left">
                       <div className="space-y-8 max-h-[500px] overflow-y-auto px-2 scrollbar-hide flex flex-col text-left">
                          {/* INITIAL TICKET BODY */}
                          <div className="flex items-start gap-4 text-left animate-in fade-in slide-in-from-left-2">
                             <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] shrink-0">{ticket.customerName?.charAt(0)}</div>
                             <div className="space-y-2 max-w-[85%] text-left">
                                <div className="p-5 bg-white border border-border/50 rounded-[2rem] rounded-tl-none shadow-sm text-left">
                                   <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1.5">Original Request</p>
                                   <p className="text-sm font-bold text-slate-700 leading-relaxed italic text-left">"{ticket.description}"</p>
                                </div>
                             </div>
                          </div>

                          {/* TIMELINE LOGS & CHAT */}
                          {timeline.map((log: any, i: number) => {
                             const isAdminRole = log.role === 'admin';
                             return (
                               <div key={i} className={cn("flex gap-4", isAdminRole ? "flex-row" : "flex-row-reverse")}>
                                  <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center font-black text-[10px] shrink-0 shadow-sm", isAdminRole ? "bg-slate-900 text-white" : "bg-primary/10 text-primary")}>
                                     {isAdminRole ? <Bot className="h-4 w-4 text-accent" /> : log.by?.charAt(0)}
                                  </div>
                                  <div className={cn("space-y-1.5 max-w-[85%]", isAdminRole ? "text-left" : "text-right")}>
                                     <div className={cn("p-4 rounded-3xl shadow-md border text-left", isAdminRole ? "bg-slate-900 text-white border-slate-800 rounded-tl-none" : "bg-white border-border/50 rounded-tr-none")}>
                                        {isAdminRole && <p className="text-[7px] font-black text-accent uppercase tracking-widest mb-1.5 flex items-center gap-1 text-left"><BadgeCheck className="h-2.5 w-2.5" /> Specialist Response</p>}
                                        <p className="text-sm font-bold leading-relaxed text-left">{log.action}</p>
                                     </div>
                                     <p className="text-[8px] font-black text-slate-400 uppercase px-2 text-left">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                  </div>
                               </div>
                             );
                          })}
                       </div>

                       <div className="p-6 bg-white border rounded-[2.5rem] shadow-xl space-y-4 text-left mt-4">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest text-left block">Message Specialist Team</Label>
                          <div className="relative text-left">
                             <Textarea 
                               placeholder="Need to add more details? Write here..." 
                               value={chatRequest} 
                               onChange={(e) => setChatRequest(e.target.value)}
                               className="min-h-[100px] rounded-[1.5rem] border-none bg-muted/20 shadow-inner p-4 text-sm font-bold pr-14"
                             />
                             <Button 
                               onClick={handleSubmitChat} 
                               disabled={!chatRequest.trim() || isSubmittingChat}
                               className="absolute bottom-3 right-3 h-10 w-10 rounded-xl bg-primary text-white shadow-lg active:scale-95 transition-all"
                             >
                                {isSubmittingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                             </Button>
                          </div>
                       </div>
                    </div>
                 </TabsContent>

                 <TabsContent value="info" className="m-0 space-y-10 animate-in fade-in">
                    <section className="space-y-6">
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1"><Info className="h-4 w-4" /> Issue Parameters</h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-6 bg-white rounded-3xl border shadow-sm space-y-1">
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Category Node</p>
                             <p className="text-sm font-black text-slate-900 uppercase">{ticket.category}</p>
                          </div>
                          <div className="p-6 bg-white rounded-3xl border shadow-sm space-y-1">
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Target Branch</p>
                             <p className="text-sm font-black text-slate-900 uppercase">{ticket.branchLocation || 'Main Hub'}</p>
                          </div>
                       </div>
                    </section>

                    {ticket.mediaUrls?.length > 0 && (
                      <section className="space-y-4 text-left">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1"><ImageIcon className="h-4 w-4" /> Evidence Documentation</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                           {ticket.mediaUrls.map((url: string, i: number) => (
                             <div key={i} className="aspect-video rounded-[1.5rem] overflow-hidden border shadow-sm cursor-pointer hover:ring-2 ring-primary/20 transition-all" onClick={() => window.open(url, '_blank')}>
                               <img src={url} className="w-full h-full object-cover" alt="Attachment" />
                             </div>
                           ))}
                        </div>
                      </section>
                    )}
                 </TabsContent>

                 <TabsContent value="team" className="m-0 space-y-8 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                        {assignedMembers.length === 0 ? (
                          <div className="col-span-full p-20 text-center border-2 border-dashed rounded-[3rem] opacity-20 italic font-black uppercase text-[10px]">Specialist selection in progress.</div>
                        ) : assignedMembers.map((member: any) => (
                          <Card key={member.id} className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden group hover:shadow-xl transition-all border border-border/50 text-left">
                            <CardContent className="p-6 space-y-5 text-left">
                              <div className="flex items-center gap-4 text-left">
                                 <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl shadow-inner border">{member.name?.charAt(0)}</div>
                                 <div className="min-w-0 flex-1 text-left">
                                    <p className="text-sm font-black text-slate-900 truncate">{member.name}</p>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{member.role || 'Resolution Specialist'}</p>
                                 </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-left">
                                 <Button variant="outline" size="sm" className="h-10 rounded-xl border-primary/20 text-primary text-[10px] font-bold uppercase gap-2 hover:bg-primary/5" onClick={() => window.open(`tel:${member.phone?.replace(/\D/g, '')}`, '_self')}>
                                    <PhoneCall className="h-3.5 w-3.5" /> Call Node
                                 </Button>
                                 <Button variant="outline" size="sm" className="h-10 rounded-xl border-green-200 text-green-600 text-[10px] font-bold uppercase gap-2 hover:bg-green-50" onClick={() => window.open(`https://wa.me/${member.phone?.replace(/\D/g, '')}`, '_blank')}>
                                    <SmartphoneNfc className="h-3.5 w-3.5" /> WhatsApp
                                 </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                 </TabsContent>
              </div>

              <div className="lg:col-span-4 space-y-8 text-left">
                 <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden group mx-2 lg:mx-0 text-left relative">
                    <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 group-hover:scale-110 transition-transform"><MessageSquare className="h-40 w-40" /></div>
                    <CardHeader className="p-8 pb-4 text-left relative z-10">
                       <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner text-white"><MessageSquare className="h-6 w-6 text-accent" /></div>
                       <CardTitle className="text-base font-black uppercase tracking-widest mt-4 leading-none text-white">Direct Escalation Hub</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 space-y-6 text-left relative z-10">
                       <p className="text-xs text-slate-400 leading-relaxed font-medium">Connect with our central resolution desk for critical updates or general billing queries.</p>
                       <Button className="w-full h-14 bg-white text-primary font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-accent transition-colors shadow-2xl" onClick={() => window.open(`https://wa.me/${business?.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi! Need urgent update on Ticket ${ticket.ticketId}`)}`)}>
                          Connect with Hub <ChevronRight className="ml-1 h-4 w-4" />
                       </Button>
                    </CardContent>
                 </Card>

                 <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 flex items-start gap-4 mx-2 lg:mx-0 text-left">
                    <ShieldCheck className="h-5 w-5 text-primary shrink-0 opacity-40" />
                    <div className="space-y-1 text-left">
                       <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">Privacy Guard Active</p>
                       <p className="text-[10px] text-primary/60 leading-relaxed italic mt-1">"Your data is secure and only accessible by assigned resolution specialists."</p>
                    </div>
                 </div>
              </div>
           </div>
        </Tabs>
      </main>

      <footer className="mt-20 md:mt-32 py-12 md:py-16 bg-white border-t text-center px-4">
         <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3"><div className="h-8 w-8 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-sm">B</div><span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Biztrix AI OS Node</span></div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Secured Multi-tenant Connection • Verified v3.5</p>
         </div>
      </footer>
    </div>
  );
}
