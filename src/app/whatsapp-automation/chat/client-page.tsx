"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  Search, 
  Send, 
  User, 
  Bot, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  SmartphoneNfc, 
  Loader2, 
  Plus, 
  ChevronRight, 
  X,
  Smartphone,
  Check,
  History,
  Info,
  BadgeCheck,
  Zap,
  MoreVertical,
  Paperclip,
  Smile,
  ImageIcon,
  Video,
  FileText,
  UserCircle,
  Gem,
  Wallet,
  Target,
  PhoneCall,
  Layout,
  MapPin,
  ArrowRight,
  CalendarDays,
  Volume2,
  CheckCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy, limit, serverTimestamp, where, getDocs } from "firebase/firestore";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { sendWhatsAppText, sendWhatsAppTemplate, listWhatsAppTemplates } from "@/app/actions/whatsapp-actions";
import Link from "next/link";

export default function WhatsAppChatPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  // 1. Chats List Query
  const chatsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'chats'), orderBy('lastMessageAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: chatsRaw, isLoading: isChatsLoading } = useCollection<any>(chatsQuery);
  const chats = chatsRaw || [];

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  const activeChat = useMemo(() => chats.find(c => c.id === activeChatId), [chats, activeChatId]);

  // 2. Messages Query for active chat
  const messagesQuery = useMemoFirebase(() => 
    businessId && activeChatId ? query(collection(firestore, 'businesses', businessId, 'chats', activeChatId, 'messages'), orderBy('timestamp', 'asc')) : null
  , [firestore, businessId, activeChatId]);
  const { data: messagesRaw } = useCollection<any>(messagesQuery);
  const messages = messagesRaw || [];

  // Audio Alert Logic
  useEffect(() => {
    if (!chats.length) return;
    const hasUnread = chats.some(c => (c.unreadCount || 0) > 0);
    if (hasUnread) {
      if (!audioRef.current) {
        audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
      }
      audioRef.current.volume = 0.4;
      audioRef.current.play().catch((error) => {
    console.error(error);});
    }
  }, [chats]);

  // 3. Customer Info for context
  const customerQuery = useMemoFirebase(() => {
    if (!businessId || !activeChatId) return null;
    const phone = activeChatId.slice(-10);
    return query(collection(firestore, 'businesses', businessId, 'customers'), where('phone', '==', phone), limit(1));
  }, [firestore, businessId, activeChatId]);
  const { data: customersData } = useCollection<any>(customerQuery);
  const activeCustomer = customersData?.[0] || null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const formatMessageTime = (ts: any) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return format(date, 'hh:mm a');
  };

  const formatHeaderDate = (ts: any) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    if (isToday(date)) return "TODAY";
    if (isYesterday(date)) return "YESTERDAY";
    return format(date, 'dd MMMM yyyy').toUpperCase();
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !businessId || !activeChatId) return;
    const waConfig = business?.whatsappApiConfig;
    if (!waConfig?.isVerified) {
      toast({ variant: "destructive", title: "API Unverified", description: "Meta connection is required." });
      return;
    }

    setIsSending(true);
    const messageText = inputText.trim();
    try {
      const res = await sendWhatsAppText(
        businessId,
        { phoneId: waConfig.phoneId, accessToken: waConfig.accessToken },
        activeChatId,
        messageText
      );

      if (res.success) {
        const messagesRef = collection(firestore, 'businesses', businessId, 'chats', activeChatId, 'messages');
        const wam_id = res.data?.messages?.[0]?.id || `local_${Date.now()}`;

        await addDocumentNonBlocking(messagesRef, {
          wam_id: wam_id,
          text: messageText,
          direction: 'outbound',
          type: 'text',
          timestamp: serverTimestamp(),
          status: 'sent'
        });

        updateDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'chats', activeChatId), {
          lastMessage: messageText,
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        setInputText("");
      } else {
        toast({ variant: "destructive", title: "API Rejection", description: res.error });
      }
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Dispatch Failed" });
    } finally {
      setIsSending(false);
    }
  };

  const handleFetchTemplates = async () => {
    const waConfig = business?.whatsappApiConfig;
    if (!waConfig?.isVerified || !businessId) {
      toast({ variant: "destructive", title: "API Required", description: "Configure WhatsApp API in Settings." });
      return;
    }
    setIsTemplatesOpen(true);
    setIsTemplateLoading(true);
    try {
      const res = await listWhatsAppTemplates(businessId, { wabaId: waConfig.wabaId, accessToken: waConfig.accessToken });
      if (res.success) {
        setTemplates(res.templates?.filter((t: any) => t.status === 'APPROVED') || []);
      }
    } finally {
      setIsTemplateLoading(false);
    }
  };

  const handleSendTemplate = async (templateName: string) => {
    if (!businessId || !activeChatId) return;
    const waConfig = business?.whatsappApiConfig;
    const template = templates.find(t => t.name === templateName);
    
    setIsSending(true);
    try {
      const components = [{
        type: "body",
        parameters: [{ type: "text", text: activeChat?.customerName || "Customer" }]
      }];

      const res = await sendWhatsAppTemplate(
        businessId,
        { phoneId: waConfig.phoneId, accessToken: waConfig.accessToken },
        activeChatId,
        templateName,
        template?.language || "en_US",
        components
      );

      if (res.success) {
        const messagesRef = collection(firestore, 'businesses', businessId, 'chats', activeChatId, 'messages');
        const wam_id = res.data?.messages?.[0]?.id || `local_${Date.now()}`;

        await addDocumentNonBlocking(messagesRef, {
          wam_id: wam_id,
          text: `[Template Node] ${templateName}`,
          direction: 'outbound',
          type: 'template',
          templateName: templateName,
          timestamp: serverTimestamp(),
          status: 'sent'
        });
        setIsTemplatesOpen(false);
        toast({ title: "Template Dispatched" });
      } else {
        toast({ variant: "destructive", title: "Meta Rejection", description: res.error });
      }
    } finally {
      setIsSending(false);
    }
  };

  const filteredChats = chats.filter(c => 
    (c.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.includes(searchTerm)
  );

  const currencySymbol = getCurrencySymbol(business?.currency);

  return (
    <div className="h-[calc(100vh-140px)] -mt-4 flex flex-col md:flex-row gap-6 animate-in fade-in duration-500 text-left">
      {/* Sidebar: Chats List */}
      <Card className="w-full md:w-80 lg:w-96 border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden flex flex-col border shrink-0">
        <CardHeader className="p-6 bg-muted/30 border-b shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Message Nodes
            </h3>
            <Badge className="bg-primary text-white border-none text-[8px] font-black px-2 h-5 uppercase">
              {chats.length} Active
            </Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input 
              placeholder="Search identity..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 pl-10 rounded-xl bg-white border-none shadow-inner text-xs font-bold" 
            />
          </div>
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="divide-y">
            {isChatsLoading ? (
              <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary opacity-20" /></div>
            ) : filteredChats.length === 0 ? (
              <div className="p-20 text-center space-y-4 opacity-30">
                 <MessageSquare className="h-12 w-12 mx-auto" />
                 <p className="text-[10px] font-black uppercase tracking-widest">No active communication nodes</p>
              </div>
            ) : filteredChats.map(chat => {
              const lastTime = chat.lastMessageAt && (chat.lastMessageAt.toDate ? chat.lastMessageAt.toDate() : new Date(chat.lastMessageAt));
              return (
                <div 
                  key={chat.id} 
                  onClick={() => { setActiveChatId(chat.id); if(businessId) updateDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'chats', chat.id), { unreadCount: 0 }); }}
                  className={cn(
                    "p-5 flex items-center gap-4 cursor-pointer transition-all hover:bg-primary/5 border-l-4",
                    activeChatId === chat.id ? "bg-primary/5 border-l-primary shadow-inner" : "border-l-transparent",
                    (chat.unreadCount || 0) > 0 && "bg-green-50/40"
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="h-12 w-12 rounded-2xl bg-muted/30 flex items-center justify-center font-black text-primary shadow-inner text-lg uppercase">
                      {chat.customerName?.charAt(0)}
                    </div>
                    {(chat.unreadCount || 0) > 0 && <div className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white animate-pulse" />}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="text-sm font-black text-slate-900 truncate uppercase tracking-tight leading-none">{chat.customerName}</span>
                      <span className={cn("text-[7px] font-black uppercase tracking-tighter", lastTime && isToday(lastTime) ? "text-primary" : "text-slate-400")}>
                        {lastTime ? format(lastTime, 'HH:mm') : ""}
                      </span>
                    </div>
                    <p className={cn("text-[10px] truncate leading-relaxed", (chat.unreadCount || 0) > 0 ? "font-bold text-slate-900" : "text-muted-foreground")}>
                      {chat.lastMessage}
                    </p>
                  </div>
                  {(chat.unreadCount || 0) > 0 && (
                    <Badge className="bg-green-500 text-white border-none text-[8px] font-black h-4 min-w-[1rem] flex items-center justify-center rounded-full shadow-sm">
                      {chat.unreadCount}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      {/* Main Chat Pane */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {activeChatId ? (
          <Card className="h-full border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden flex flex-col border relative">
            <CardHeader className="bg-[#075E54] text-white p-6 shrink-0 flex flex-row items-center justify-between border-b border-white/10 relative z-30 shadow-md">
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center font-black text-xl border border-white/10 shadow-inner">
                    {activeChat?.customerName?.charAt(0)}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-3">
                       <h3 className="text-base font-black uppercase tracking-tight leading-none">{activeChat?.customerName}</h3>
                       <Badge className="bg-green-400 text-green-900 border-none text-[7px] font-black h-4 px-1.5 shadow-sm">SESSION ACTIVE</Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                       <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                       <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest leading-none">IDENTITY: {activeChatId}</p>
                    </div>
                  </div>
               </div>
               <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-white/40 hover:text-white" onClick={() => setActiveChatId(null)}><X className="h-5 w-5" /></Button>
               </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0 flex flex-col relative bg-[#E5DDD5] z-10">
               <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/chat-bg/600/1200')] opacity-[0.07] grayscale pointer-events-none z-0" />
               <ScrollArea className="flex-1 p-6 relative z-10">
                  <div className="space-y-6">
                    {messages.length === 0 && (
                      <div className="p-20 text-center opacity-30 italic text-sm font-bold uppercase tracking-widest">
                        Node Established. Say Namaste!
                      </div>
                    )}
                    {messages.map((m, i) => {
                      const showDateHeader = i === 0 || formatHeaderDate(messages[i-1].timestamp) !== formatHeaderDate(m.timestamp);
                      return (
                        <div key={i} className="flex flex-col w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                          {showDateHeader && (
                            <div className="w-full flex justify-center my-8">
                              <Badge variant="outline" className="bg-white/80 backdrop-blur-md border-none text-[8px] font-black uppercase text-slate-500 px-6 h-6 shadow-sm">{formatHeaderDate(m.timestamp)}</Badge>
                            </div>
                          )}
                          <div className={cn(
                            "flex flex-col max-w-[85%] relative",
                            m.direction === 'outbound' ? "ml-auto items-end" : "mr-auto items-start"
                          )}>
                            <div className={cn(
                              "p-4 rounded-[1.2rem] shadow-sm text-sm leading-relaxed whitespace-pre-wrap text-left relative transition-all",
                              m.direction === 'outbound' 
                                ? "bg-[#DCF8C6] text-slate-800 rounded-tr-none border-b border-green-200" 
                                : "bg-white text-slate-800 rounded-tl-none border-b border-slate-200"
                            )}>
                              {m.type === 'template' && (
                                <p className="text-[7px] font-black text-green-700 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                  <BadgeCheck className="h-2.5 w-2.5" /> OFFICIAL TEMPLATE NODE
                                </p>
                              )}
                              <p className="font-medium text-[13.5px] leading-[1.4]">{m.text}</p>
                              <div className={cn(
                                "flex items-center gap-1.5 mt-2 opacity-60 text-[7px] font-black uppercase",
                                m.direction === 'outbound' ? "justify-end text-green-800" : "justify-start text-slate-400"
                              )}>
                                 <span>{formatMessageTime(m.timestamp)}</span>
                                 {m.direction === 'outbound' && (
                                   m.status === 'read' ? <CheckCheck className="h-3 w-3 text-blue-500" /> : 
                                   m.status === 'delivered' ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
                                 )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={scrollRef} className="h-4" />
                  </div>
               </ScrollArea>

               <div className="p-4 bg-[#F0F2F5] border-t relative z-20 shadow-inner shrink-0">
                  <div className="flex gap-3">
                     <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-white text-muted-foreground hover:text-primary transition-all border shadow-sm shrink-0"><Paperclip className="h-5 w-5" /></Button>
                     <div className="relative flex-1">
                        <Input 
                          placeholder="Type your response..." 
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          disabled={isSending}
                          className="h-12 rounded-full bg-white border-none shadow-sm pr-12 text-sm font-bold pl-6 focus-visible:ring-primary placeholder:text-slate-400" 
                        />
                        <Button 
                          size="icon" 
                          onClick={handleSendMessage}
                          disabled={!inputText.trim() || isSending}
                          className="absolute right-1 top-1 h-10 w-10 rounded-full bg-[#075E54] hover:bg-[#128C7E] text-white shadow-lg active:scale-90 transition-transform"
                        >
                           {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
                        </Button>
                     </div>
                     <Button 
                       variant="outline"
                       onClick={handleFetchTemplates}
                       className="h-12 px-6 rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg bg-white border-primary/20 text-primary transition-all shrink-0"
                     >
                       <Layout className="h-4 w-4 mr-2" /> Templates
                     </Button>
                  </div>
               </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex-1 border-none shadow-sm bg-white rounded-[3rem] border flex flex-col items-center justify-center text-center p-12">
             <div className="h-32 w-32 rounded-[3rem] bg-primary/5 flex items-center justify-center text-primary mb-8 animate-pulse border-2 border-dashed border-primary/10">
               <SmartphoneNfc className="h-12 w-12 opacity-20" />
             </div>
             <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Communication Node Ready</h3>
             <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-4 leading-relaxed font-medium">Select an active contact node from the registry to establish a secure real-time connection.</p>
          </Card>
        )}
      </div>

      {/* Identity Context Sidebar */}
      <div className="hidden xl:flex w-80 flex-col gap-6 text-left shrink-0 h-full overflow-hidden">
        {activeChatId ? (
          <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border animate-in slide-in-from-right-4 duration-500 h-full flex flex-col">
            <CardHeader className="bg-primary/5 border-b py-6 px-8 text-left">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                <BadgeCheck className="h-4 w-4" /> Identity Node Verified
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8 text-left flex-1 overflow-y-auto scrollbar-hide">
               <div className="space-y-4">
                  <div className="flex items-center gap-4 text-left">
                     <div className="h-16 w-16 rounded-[1.5rem] bg-primary flex items-center justify-center text-white font-black shadow-xl text-2xl uppercase">{activeChat?.customerName?.charAt(0)}</div>
                     <div className="min-w-0 text-left">
                        <p className="text-lg font-black text-slate-900 truncate uppercase tracking-tight leading-none mb-1.5">{activeChat?.customerName}</p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{activeChatId}</p>
                     </div>
                  </div>
               </div>

               {activeCustomer ? (
                 <div className="space-y-10 animate-in fade-in text-left">
                    <Separator className="opacity-40" />
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-5 bg-muted/30 rounded-2xl space-y-1 text-left shadow-inner border border-transparent">
                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter opacity-60">LTV Value</p>
                          <p className="text-lg font-black text-primary">{currencySymbol}{activeCustomer.totalSpent?.toLocaleString() || 0}</p>
                       </div>
                       <div className="p-5 bg-muted/30 rounded-2xl space-y-1 text-left shadow-inner border border-transparent">
                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter opacity-60">Wallet Node</p>
                          <p className="text-lg font-black text-green-600">{activeCustomer.rewardPoints || 0} <span className="text-[8px] font-bold">PTS</span></p>
                       </div>
                    </div>
                    <div className="space-y-6">
                       <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-2"><MapPin className="h-3 w-3" /> State Registry</p>
                          <Badge variant="outline" className="h-6 w-full justify-start bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-bold uppercase">{activeCustomer.state || 'Maharashtra'}</Badge>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-2"><Target className="h-3 w-3" /> Classification</p>
                          <Badge className="h-6 w-full justify-start bg-primary text-white border-none text-[10px] font-black uppercase">{activeCustomer.customerType || 'REGULAR'}</Badge>
                       </div>
                    </div>
                    <Button asChild variant="outline" className="w-full h-14 rounded-2xl text-[10px] font-black uppercase border-primary/20 text-primary shadow-sm hover:bg-primary/5 transition-all">
                       <Link href={`/customers`}>Profile Audit Node <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                 </div>
               ) : (
                 <div className="py-20 text-center space-y-6 opacity-30 border-2 border-dashed rounded-[2.5rem] animate-in zoom-in-95">
                    <UserCircle className="h-12 w-12 mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-widest px-6 leading-relaxed">Identity metadata not available in registry.</p>
                 </div>
               )}
            </CardContent>
            <CardFooter className="p-8 bg-muted/20 border-t">
               <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-green-600 opacity-60" />
                  <p className="text-[8px] font-black uppercase text-slate-500">256-bit Encrypted Handshake</p>
               </div>
            </CardFooter>
          </Card>
        ) : (
          <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden border p-8 space-y-8 text-left h-full">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><ShieldCheck className="h-6 w-6 text-accent" /></div>
            <div className="space-y-2">
               <h3 className="text-xl font-bold uppercase tracking-tight leading-none text-white">System Protocol</h3>
               <p className="text-xs text-slate-400 leading-relaxed font-medium">All communication nodes follow official Meta Cloud API v21.0 logic. Sessions are isolated per tenant ID.</p>
            </div>
            <Separator className="bg-white/10" />
            <div className="space-y-6">
               <div className="flex items-center gap-4">
                 <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center text-green-400 border border-white/5 shadow-inner"><BadgeCheck className="h-5 w-5" /></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">PCI SECURED NODE</span>
               </div>
               <div className="flex items-center gap-4">
                 <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center text-green-400 border border-white/5 shadow-inner"><Clock className="h-5 w-5" /></div>
                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">SESSION AUDIT ON</span>
               </div>
            </div>
          </Card>
        )}
      </div>

      {/* Templates Hub Dialog */}
      <Dialog open={isTemplatesOpen} onOpenChange={setIsTemplatesOpen}>
         <DialogContent className="sm:max-w-[500px] rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden text-left w-[95vw]">
            <DialogHeader className="p-8 bg-slate-900 text-white text-left shrink-0">
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><Layout className="h-6 w-6 text-accent" /></div>
                  <DialogTitle className="text-xl font-bold uppercase">Meta Approved Nodes</DialogTitle>
               </div>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] p-8">
               <div className="space-y-4 pb-10">
                  {isTemplateLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-40">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Polling Meta Registry...</span>
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="py-20 text-center opacity-30 italic text-xs uppercase font-black">No approved templates found.</div>
                  ) : templates.map(t => (
                    <div 
                      key={t.name} 
                      onClick={() => handleSendTemplate(t.name)}
                      className="p-6 rounded-[2rem] border-2 border-border/40 bg-white hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group shadow-sm"
                    >
                       <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-black text-slate-900 group-hover:text-primary uppercase tracking-tight truncate max-w-[200px]">{t.name?.replace(/_/g, ' ')}</span>
                          <Badge variant="outline" className="text-[7px] font-black h-4 px-1.5 uppercase border-primary/20 text-primary">{t.category}</Badge>
                       </div>
                       <p className="text-[10.5px] text-muted-foreground line-clamp-2 leading-relaxed italic font-medium">"{t.components?.find((c:any)=>c.type==='BODY')?.text || ''}"</p>
                    </div>
                  ))}
               </div>
            </ScrollArea>
            <DialogFooter className="p-8 bg-muted/10 border-t"><Button variant="ghost" onClick={() => setIsTemplatesOpen(false)} className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest">Close Hub</Button></DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
