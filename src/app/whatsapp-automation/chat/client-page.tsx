"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
  Clock,
  SmartphoneNfc,
  Loader2,
  X,
  Check,
  BadgeCheck,
  Paperclip,
  UserCircle,
  Target,
  Layout,
  MapPin,
  ArrowRight,
  CheckCheck,
} from "lucide-react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  useCollection,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from "@/firebase";
import { collection, doc, query, orderBy, limit, serverTimestamp, where } from "firebase/firestore";
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

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const chatsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(collection(firestore, "businesses", businessId, "chats"), orderBy("lastMessageAt", "desc"))
        : null,
    [firestore, businessId]
  );
  const { data: chatsRaw, isLoading: isChatsLoading } = useCollection<any>(chatsQuery);
  const chats = chatsRaw || [];

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  const activeChat = useMemo(() => chats.find((c) => c.id === activeChatId), [chats, activeChatId]);

  const messagesQuery = useMemoFirebase(
    () =>
      businessId && activeChatId
        ? query(collection(firestore, "businesses", businessId, "chats", activeChatId, "messages"), orderBy("timestamp", "asc"))
        : null,
    [firestore, businessId, activeChatId]
  );
  const { data: messagesRaw } = useCollection<any>(messagesQuery);
  const messages = messagesRaw || [];

  useEffect(() => {
    if (!chats.length) return;
    const hasUnread = chats.some((c) => (c.unreadCount || 0) > 0);
    if (hasUnread) {
      if (!audioRef.current) {
        audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
      }
      audioRef.current.volume = 0.4;
      audioRef.current.play().catch((error) => {
        console.error(error);
      });
    }
  }, [chats]);

  const customerQuery = useMemoFirebase(() => {
    if (!businessId || !activeChatId) return null;
    const phone = activeChatId.slice(-10);
    return query(collection(firestore, "businesses", businessId, "customers"), where("phone", "==", phone), limit(1));
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
    return format(date, "hh:mm a");
  };

  const formatHeaderDate = (ts: any) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "dd MMMM yyyy");
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
        const messagesRef = collection(firestore, "businesses", businessId, "chats", activeChatId, "messages");
        const wam_id = res.data?.messages?.[0]?.id || `local_${Date.now()}`;

        await addDocumentNonBlocking(messagesRef, {
          wam_id,
          text: messageText,
          direction: "outbound",
          type: "text",
          timestamp: serverTimestamp(),
          status: "sent",
        });

        updateDocumentNonBlocking(doc(firestore, "businesses", businessId, "chats", activeChatId), {
          lastMessage: messageText,
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
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
        setTemplates(res.templates?.filter((t: any) => t.status === "APPROVED") || []);
      }
    } finally {
      setIsTemplateLoading(false);
    }
  };

  const handleSendTemplate = async (templateName: string) => {
    if (!businessId || !activeChatId) return;
    const waConfig = business?.whatsappApiConfig;
    const template = templates.find((t) => t.name === templateName);

    setIsSending(true);
    try {
      const components = [
        {
          type: "body",
          parameters: [{ type: "text", text: activeChat?.customerName || "Customer" }],
        },
      ];

      const res = await sendWhatsAppTemplate(
        businessId,
        { phoneId: waConfig.phoneId, accessToken: waConfig.accessToken },
        activeChatId,
        templateName,
        template?.language || "en_US",
        components
      );

      if (res.success) {
        const messagesRef = collection(firestore, "businesses", businessId, "chats", activeChatId, "messages");
        const wam_id = res.data?.messages?.[0]?.id || `local_${Date.now()}`;

        await addDocumentNonBlocking(messagesRef, {
          wam_id,
          text: `[Template] ${templateName}`,
          direction: "outbound",
          type: "template",
          templateName,
          timestamp: serverTimestamp(),
          status: "sent",
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

  const filteredChats = chats.filter(
    (c) =>
      (c.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) || c.id.includes(searchTerm)
  );

  const currencySymbol = getCurrencySymbol(business?.currency);

  return (
    <div className="h-[calc(100vh-140px)] -mt-2 flex flex-col md:flex-row gap-5 text-left">
      {/* Sidebar: Conversations */}
      <aside className="w-full md:w-80 lg:w-96 rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-slate-700" /> Conversations
            </h2>
            <Badge className="bg-slate-900 text-white border-none text-[11px] font-mono tabular-nums">
              {chats.length} active
            </Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 rounded-xl bg-slate-50 border-slate-200 text-xs"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="divide-y divide-slate-100">
            {isChatsLoading ? (
              <div className="p-16 flex justify-center">
                <Loader2 className="animate-spin text-slate-400 h-5 w-5" />
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="p-12 text-center space-y-2 text-slate-500">
                <MessageSquare className="h-8 w-8 mx-auto text-slate-300" />
                <p className="text-xs font-medium">No active conversations</p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const lastTime =
                  chat.lastMessageAt && (chat.lastMessageAt.toDate ? chat.lastMessageAt.toDate() : new Date(chat.lastMessageAt));
                const isActive = activeChatId === chat.id;
                return (
                  <button
                    type="button"
                    key={chat.id}
                    onClick={() => {
                      setActiveChatId(chat.id);
                      if (businessId)
                        updateDocumentNonBlocking(doc(firestore, "businesses", businessId, "chats", chat.id), {
                          unreadCount: 0,
                        });
                    }}
                    className={cn(
                      "w-full p-4 flex items-center gap-3.5 text-left transition-colors",
                      isActive ? "bg-slate-100" : "hover:bg-slate-50",
                      (chat.unreadCount || 0) > 0 && !isActive && "bg-emerald-50/50"
                    )}
                  >
                    <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {chat.customerName?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-slate-900 truncate">{chat.customerName}</span>
                        <span className="text-[11px] font-mono tabular-nums text-slate-500 shrink-0">
                          {lastTime ? format(lastTime, "HH:mm") : ""}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "text-xs truncate",
                          (chat.unreadCount || 0) > 0 ? "font-semibold text-slate-900" : "text-slate-500"
                        )}
                      >
                        {chat.lastMessage}
                      </p>
                    </div>
                    {(chat.unreadCount || 0) > 0 && (
                      <Badge className="bg-emerald-600 text-white border-none text-[11px] font-mono tabular-nums h-5 min-w-[20px] flex items-center justify-center rounded-full">
                        {chat.unreadCount}
                      </Badge>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Chat Pane */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {activeChatId ? (
          <div className="h-full rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white px-5 py-4 shrink-0 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center font-bold text-base shrink-0">
                  {activeChat?.customerName?.charAt(0) || "?"}
                </div>
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-bold text-white truncate">{activeChat?.customerName}</h3>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium">
                      Active
                    </Badge>
                  </div>
                  <p className="text-xs font-mono tabular-nums text-slate-300 mt-0.5">{activeChatId}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close conversation"
                className="h-9 w-9 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                onClick={() => setActiveChatId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col bg-[#EFEAE2]">
              <ScrollArea className="flex-1 p-5">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="py-16 text-center text-xs font-medium text-slate-500">
                      Conversation ready. Send a message or approved template below.
                    </div>
                  )}
                  {messages.map((m, i) => {
                    const showDateHeader =
                      i === 0 || formatHeaderDate(messages[i - 1].timestamp) !== formatHeaderDate(m.timestamp);
                    return (
                      <div key={i} className="flex flex-col w-full">
                        {showDateHeader && (
                          <div className="w-full flex justify-center my-4">
                            <span className="bg-white border border-slate-200 text-[11px] font-medium text-slate-600 px-3 py-1 rounded-lg">
                              {formatHeaderDate(m.timestamp)}
                            </span>
                          </div>
                        )}
                        <div
                          className={cn(
                            "flex flex-col max-w-[85%]",
                            m.direction === "outbound" ? "ml-auto items-end" : "mr-auto items-start"
                          )}
                        >
                          <div
                            className={cn(
                              "px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap text-left border",
                              m.direction === "outbound"
                                ? "bg-[#D9FDD3] text-slate-900 rounded-tr-none border-emerald-200"
                                : "bg-white text-slate-900 rounded-tl-none border-slate-200"
                            )}
                          >
                            {m.type === "template" && (
                              <p className="text-[11px] font-semibold text-emerald-800 mb-1 flex items-center gap-1">
                                <BadgeCheck className="h-3.5 w-3.5" /> Official Template
                              </p>
                            )}
                            <p className="text-[13.5px] leading-relaxed">{m.text}</p>
                            <div
                              className={cn(
                                "flex items-center gap-1.5 mt-1.5 text-[11px] font-mono tabular-nums",
                                m.direction === "outbound" ? "justify-end text-emerald-800" : "justify-start text-slate-400"
                              )}
                            >
                              <span>{formatMessageTime(m.timestamp)}</span>
                              {m.direction === "outbound" &&
                                (m.status === "read" ? (
                                  <CheckCheck className="h-3.5 w-3.5 text-sky-600" />
                                ) : m.status === "delivered" ? (
                                  <CheckCheck className="h-3.5 w-3.5" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={scrollRef} className="h-2" />
                </div>
              </ScrollArea>

              <div className="p-3.5 bg-white border-t border-slate-200 shrink-0">
                <div className="flex items-center gap-2.5">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Attach file"
                    className="h-10 w-10 rounded-xl border-slate-200 text-slate-600 shrink-0"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <div className="relative flex-1 flex items-center gap-2">
                    <Input
                      placeholder="Type your response..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      disabled={isSending}
                      className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm"
                    />
                    <Button
                      size="icon"
                      aria-label="Send message"
                      onClick={handleSendMessage}
                      disabled={!inputText.trim() || isSending}
                      className="h-10 w-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shrink-0"
                    >
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleFetchTemplates}
                    className="h-10 px-4 rounded-xl font-semibold text-xs border-slate-200 text-slate-700 shrink-0"
                  >
                    <Layout className="h-4 w-4 mr-1.5" /> Templates
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 rounded-2xl border border-slate-200 bg-white flex flex-col items-center justify-center text-center p-10">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 mb-4">
              <SmartphoneNfc className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">WhatsApp Inbox Ready</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-1.5 leading-relaxed">
              Select a conversation from the left sidebar to view history or reply directly via Meta Cloud API.
            </p>
          </div>
        )}
      </div>

      {/* Customer Context Sidebar */}
      <aside className="hidden xl:flex w-80 flex-col text-left shrink-0 h-full overflow-hidden">
        {activeChatId ? (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden h-full flex flex-col">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-600" /> Customer Profile
              </h3>
            </div>
            <div className="p-5 space-y-5 flex-1 overflow-y-auto scrollbar-hide">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shrink-0">
                  {activeChat?.customerName?.charAt(0) || "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{activeChat?.customerName}</p>
                  <p className="text-xs font-mono tabular-nums text-slate-500 truncate">{activeChatId}</p>
                </div>
              </div>

              {activeCustomer ? (
                <div className="space-y-5">
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[11px] font-medium text-slate-500">Lifetime Spend</p>
                      <p className="text-base font-bold font-mono tabular-nums text-slate-900 mt-1">
                        {currencySymbol}
                        {activeCustomer.totalSpent?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[11px] font-medium text-slate-500">Reward Wallet</p>
                      <p className="text-base font-bold font-mono tabular-nums text-emerald-700 mt-1">
                        {activeCustomer.rewardPoints || 0} pts
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> State
                      </p>
                      <p className="text-xs font-semibold text-slate-800 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                        {activeCustomer.state || "Maharashtra"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5" /> Segment
                      </p>
                      <p className="text-xs font-semibold text-slate-800 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                        {activeCustomer.customerType || "Regular"}
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="outline" className="w-full h-10 rounded-xl text-xs font-semibold border-slate-200">
                    <Link href="/customers">
                      View Customer Directory <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 rounded-xl p-4">
                  <UserCircle className="h-8 w-8 mx-auto text-slate-300" />
                  <p className="text-xs text-slate-500">Customer record not matched in CRM yet.</p>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Meta Cloud encrypted session</span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-900 text-white p-6 space-y-5 h-full">
            <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Messaging Protocol</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Conversations run over the official Meta Cloud API v21.0 and stay isolated per tenant workspace.
              </p>
            </div>
            <Separator className="bg-white/10" />
            <div className="space-y-3 text-xs text-slate-200">
              <div className="flex items-center gap-2.5">
                <BadgeCheck className="h-4 w-4 text-emerald-400" /> End-to-End Business Auth
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-emerald-400" /> 24h Session Window Aware
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Templates Dialog */}
      <Dialog open={isTemplatesOpen} onOpenChange={setIsTemplatesOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl border border-slate-200 p-0 overflow-hidden text-left w-[95vw]">
          <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800 text-left shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                <Layout className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-base font-bold text-white">Approved Meta Templates</DialogTitle>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] p-5">
            <div className="space-y-3">
              {isTemplateLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <Loader2 className="h-7 w-7 animate-spin" />
                  <span className="text-xs font-medium">Loading approved templates...</span>
                </div>
              ) : templates.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">No approved templates found.</div>
              ) : (
                templates.map((t) => (
                  <button
                    type="button"
                    key={t.name}
                    onClick={() => handleSendTemplate(t.name)}
                    className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex justify-between items-center gap-2 mb-1.5">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {t.name?.replace(/_/g, " ")}
                      </span>
                      <Badge variant="outline" className="text-[11px] font-medium border-slate-200 text-slate-600">
                        {t.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      "{t.components?.find((c: any) => c.type === "BODY")?.text || ""}"
                    </p>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsTemplatesOpen(false)} className="w-full h-10 rounded-xl text-xs font-semibold">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
