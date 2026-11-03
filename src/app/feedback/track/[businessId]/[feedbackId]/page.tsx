
"use client";

import { use, useState, useEffect } from "react";
import { 
  MessageSquare, 
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
  BadgeCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

export default function CustomerFeedbackTrackPage(props: { params: Promise<{ businessId: string, feedbackId: string }> }) {
  const { businessId, feedbackId } = use(props.params);
  const firestore = useFirestore();

  // 1. Fetch Feedback Record
  const feedbackRef = useMemoFirebase(() => 
    businessId && feedbackId ? doc(firestore, 'businesses', businessId, 'feedback', feedbackId) : null
  , [firestore, businessId, feedbackId]);
  const { data: feedback, isLoading: isFeedbackLoading, error } = useDoc<any>(feedbackRef);

  // 2. Fetch Business Info
  const bizRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(bizRef);

  // 3. Fetch Feedback Hub Config
  const configRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId, 'feedbackConfig', 'main') : null, [firestore, businessId]);
  const { data: formConfig } = useDoc<any>(configRef);

  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  const STATUS_CONFIG: any = {
    'new': { label: 'Submitted', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', icon: Clock },
    'pending': { label: 'Under Review', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100', icon: History },
    'resolved': { label: 'Resolved', color: 'text-green-600', bg: 'bg-green-50 border-green-100', icon: CheckCircle2 },
    'closed': { label: 'Closed', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-100', icon: ShieldCheck },
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !feedback || !businessId) return;
    setIsReplying(true);
    
    const newReply = {
      text: replyText,
      author: feedback.customerName,
      timestamp: new Date().toISOString(),
      role: 'customer'
    };

    updateDocumentNonBlocking(feedbackRef!, {
      replies: [...(feedback.replies || []), newReply],
      updatedAt: serverTimestamp()
    });

    setReplyText("");
    setIsReplying(false);
    toast({ title: "Reply Sent", description: "The team has been notified." });
  };

  const handleWhatsAppSupport = () => {
    const whatsapp = formConfig?.supportWhatsapp || business?.phone?.replace(/\D/g, '') || "";
    if (!whatsapp) {
      toast({ variant: "destructive", title: "Contact Unavailable", description: "The business has not configured a support number." });
      return;
    }
    const msg = `Namaste! I need assistance with my feedback ticket: ${feedbackId.slice(-8).toUpperCase()}`;
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (isFeedbackLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>;
  if (error || !feedback) return <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center"><h2 className="text-xl font-bold">Feedback Ticket Not Found</h2><Button asChild variant="outline" className="mt-4"><Link href="/">Return Home</Link></Button></div>;

  const statusInfo = STATUS_CONFIG[feedback.status || 'new'];

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-20 overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
             <div className="h-12 w-12 sm:h-14 sm:w-14 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-border/10 shrink-0 overflow-hidden">
                {business?.logoUrl ? (
                  <img src={business.logoUrl} className="h-full w-full object-cover" alt="Logo" />
                ) : (
                  <div className="h-full w-full bg-primary flex items-center justify-center text-white font-black text-sm sm:text-base">
                    {business?.name?.charAt(0) || "B"}
                  </div>
                )}
             </div>
             <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-black text-slate-900 block leading-none truncate">{business?.name}</span>
                <span className="text-[8px] sm:text-[9px] font-bold text-primary uppercase tracking-widest mt-1.5 block">
                   Feedback Status Portal
                </span>
             </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-10 text-[10px] font-black uppercase text-primary">
            <Link href="/"><ArrowLeft className="h-3.5 w-3.5 mr-2" /> Home</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-12 space-y-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
           <div className="space-y-2">
              <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary h-5 px-3">Ticket ID: {feedbackId.slice(-8).toUpperCase()}</Badge>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Track Your Feedback</h1>
              <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                <User className="h-3.5 w-3.5" /> Filed by {feedback.customerName}
              </p>
           </div>
           <div className={cn("px-6 py-4 rounded-3xl border-2 flex items-center gap-4 transition-all shadow-sm", statusInfo.bg)}>
              <statusInfo.icon className={cn("h-6 w-6", statusInfo.color)} />
              <div>
                <p className="text-[9px] font-black uppercase text-muted-foreground opacity-60">Ticket Status</p>
                <p className={cn("text-lg font-black leading-none", statusInfo.color)}>{statusInfo.label}</p>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
           <div className="lg:col-span-8 space-y-10">
              <section className="space-y-6">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-primary">Conversation History</h3>
                </div>

                <div className="space-y-8">
                  {/* The Original Submission */}
                  <div className="flex gap-4">
                     <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary text-xs shrink-0">{feedback.customerName?.charAt(0)}</div>
                     <div className="flex-1 space-y-2">
                        <div className="p-8 bg-white rounded-[2.5rem] rounded-tl-none border border-border/50 shadow-sm space-y-6">
                           <div className="flex items-center justify-between">
                              <Badge className="bg-primary/5 text-primary border-none text-[8px] font-bold h-4 px-2 uppercase">{feedback.category || 'General'}</Badge>
                              <div className="flex items-center gap-1.5 text-yellow-400">
                                 <span className="text-xs font-black text-yellow-600">{feedback.rating} / 5</span>
                                 <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                      <div key={i} className="relative h-3.5 w-3.5">
                                        <Star className="absolute inset-0 h-full w-full text-muted/20 border-muted/20" />
                                        {feedback.rating >= i - 0.5 && (
                                          <Star 
                                            className="absolute inset-0 h-full w-full fill-yellow-400 text-yellow-400"
                                            style={{ clipPath: feedback.rating === i - 0.5 ? 'polygon(0 0, 50% 0, 50% 100%, 0% 100%)' : 'none' }}
                                          />
                                        )}
                                      </div>
                                    ))}
                                 </div>
                              </div>
                           </div>
                           <div className="grid grid-cols-1 gap-6">
                              {Object.entries(feedback.data || {}).map(([key, value]: [string, any]) => (
                                <div key={key} className="space-y-1">
                                  <p className="text-[9px] font-black text-primary/40 uppercase tracking-widest">{key}</p>
                                  <p className="text-sm font-bold text-slate-700">{Array.isArray(value) ? value.join(', ') : value.toString()}</p>
                                </div>
                              ))}
                           </div>
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase px-4">{feedback.createdAt?.toDate ? feedback.createdAt.toDate().toLocaleString() : 'Submitted'}</p>
                     </div>
                  </div>

                  {/* Replies Thread */}
                  {(feedback.replies || []).map((reply: any, i: number) => (
                    <div key={i} className={cn("flex gap-4", reply.role === 'admin' ? "flex-row-reverse" : "")}>
                       <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-lg", reply.role === 'admin' ? "bg-slate-900 text-white" : "bg-primary/10 text-primary")}>
                          {reply.role === 'admin' ? <Bot className="h-5 w-5" /> : reply.author?.charAt(0)}
                       </div>
                       <div className={cn("flex-1 space-y-2", reply.role === 'admin' ? "text-right" : "")}>
                          <div className={cn("p-6 rounded-3xl border shadow-md inline-block max-w-[90%]", reply.role === 'admin' ? "bg-slate-900 text-white border-slate-800 rounded-tr-none" : "bg-white border-border/40 rounded-tl-none")}>
                             {reply.role === 'admin' && <p className="text-[8px] font-black text-accent uppercase tracking-widest mb-2 flex items-center gap-1 justify-end"><BadgeCheck className="h-3 3" /> Official Team Response</p>}
                             <p className="text-sm font-medium leading-relaxed">{reply.text}</p>
                          </div>
                          <p className="text-[9px] font-black text-slate-400 uppercase px-4">{new Date(reply.timestamp).toLocaleString()}</p>
                       </div>
                    </div>
                  ))}
                </div>

                {/* Reply Interface */}
                {feedback.status !== 'closed' && (
                  <div className="pt-10">
                    <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden border">
                       <CardContent className="p-6 sm:p-8 space-y-4">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Type your follow-up...</Label>
                          <div className="relative">
                            <Textarea 
                              placeholder="Need to add more details? Write here..." 
                              value={replyText} 
                              onChange={(e) => setReplyText(e.target.value)}
                              className="min-h-[120px] rounded-2xl bg-muted/20 border-none shadow-inner p-4 text-sm font-bold pr-14"
                            />
                            <Button 
                              onClick={handleSendReply}
                              disabled={!replyText.trim() || isReplying}
                              className="absolute bottom-3 right-3 h-10 w-10 rounded-xl bg-primary text-white shadow-lg"
                            >
                              {isReplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                          </div>
                       </CardContent>
                    </Card>
                  </div>
                )}
              </section>
           </div>

           <div className="lg:col-span-4 space-y-8">
              <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border">
                 <CardHeader className="bg-muted/30 border-b py-6 px-8">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><SmartphoneNfc className="h-4 w-4" /> Need Immediate Help?</CardTitle>
                 </CardHeader>
                 <CardContent className="p-8 space-y-6 text-center">
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">Our support node is active. For critical escalations, connect via WhatsApp.</p>
                    <Button 
                      onClick={handleWhatsAppSupport}
                      variant="outline" 
                      className="w-full h-14 rounded-2xl border-green-200 text-green-600 bg-green-50/50 hover:bg-green-100 font-black uppercase text-[10px] tracking-widest shadow-sm"
                    >
                       Launch WhatsApp Chat
                    </Button>
                 </CardContent>
              </Card>

              <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white space-y-6 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck className="h-24 w-24" /></div>
                 <div className="flex items-center gap-3 relative z-10">
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                       <Star className="h-5 w-5 text-yellow-400" />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-widest">Our Promise</p>
                 </div>
                 <p className="text-xs text-slate-400 leading-relaxed font-medium relative z-10 italic">
                   "Every feedback node is analyzed by our team to improve {business?.name || 'our service'}. We value your trust."
                 </p>
              </div>
           </div>
        </div>
      </main>

      <footer className="mt-20 py-12 bg-white border-t text-center">
         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Biztrix Feedback Node • Encrypted Connection</p>
      </footer>
    </div>
  );
}
