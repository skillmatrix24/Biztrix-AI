
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  TrendingUp, 
  PackageCheck, 
  RefreshCcw,
  BrainCircuit,
  Lightbulb,
  ArrowRight,
  AlertTriangle,
  Zap,
  ShoppingBag,
  ArrowUpRight,
  DollarSign,
  LineChart,
  CheckCircle2,
  Clock,
  Send,
  MessageSquare,
  Bot,
  User,
  Users,
  History,
  Target,
  BarChart3,
  TrendingDown,
  Percent,
  ShoppingCart,
  Phone,
  MapPin,
  ListChecks,
  Loader2,
  Search,
  ExternalLink
} from "lucide-react";
import { PageHeader, SectionCard } from "@/components/ui/editorial";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  generatePricingSuggestions, 
  GeneratePricingSuggestionsOutput 
} from "@/ai/flows/generate-pricing-suggestions";
import { 
  optimizeStockReorder, 
  OptimizeStockReorderOutput 
} from "@/ai/flows/optimize-stock-reorder";
import { advisorChat } from "@/ai/flows/advisor-chat-flow";
import { Product, Lead } from "@/lib/mock-db";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell 
} from "recharts";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFirestore, useCollection, useMemoFirebase, useUser, addDocumentNonBlocking, useDoc } from "@/firebase";
import { collection, query, where, orderBy, Timestamp, serverTimestamp, doc, limit } from "firebase/firestore";

const trendData = [
  { name: "Mon", sales: 4000 },
  { name: "Tue", sales: 3000 },
  { name: "Wed", sales: 2000 },
  { name: "Thu", sales: 2780 },
  { name: "Fri", sales: 1890 },
  { name: "Sat", sales: 2390 },
  { name: "Sun", sales: 3490 },
];

type ActionType = 'reorder' | 'discount' | 'whatsapp' | 'report' | 'price' | 'map' | 'plan' | 'navigate';

type MessageAction = {
  label: string;
  type: string;
  route?: string;
  payload?: any;
};

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp?: string;
  createdAt: any;
  data?: any;
  actions?: MessageAction[];
  isPlan?: boolean;
};

export default function AIInsightsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  // Dynamic Profile and Business Resolution
  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);

  const businessId = userProfile?.businessId;
  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  // Real-time Firestore Collections with Dynamic IDs (Bounded with limits)
  const productsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'products'), limit(100)) : null, 
    [firestore, businessId]
  );
  const { data: productListData } = useCollection<Product>(productsQuery);
  const productList = productListData || [];

  const leadsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'leads'), limit(100)) : null, 
    [firestore, businessId]
  );
  const { data: leadsListData } = useCollection<Lead>(leadsQuery);
  const leadsList = leadsListData || [];

  // Chat History Query (Filter: Last 30 days, capped to 50 recent messages)
  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !businessId) return null;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return query(
      collection(firestore, 'businesses', businessId, 'users', user.uid, 'chatMessages'),
      where('createdAt', '>', Timestamp.fromDate(thirtyDaysAgo)),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
  }, [firestore, user?.uid, businessId]);

  const { data: savedMessagesData, isLoading: isHistoryLoading } = useCollection<Message>(messagesQuery);
  const savedMessages = savedMessagesData || [];

  const [pricingLoading, setPricingLoading] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [pricingResult, setPricingResult] = useState<GeneratePricingSuggestionsOutput | null>(null);
  const [stockResult, setStockResult] = useState<OptimizeStockReorderOutput | null>(null);
  
  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [savedMessages, isTyping]);

  const getPricingInsights = async () => {
    if (productList.length === 0) {
      toast({ variant: "destructive", title: "Missing Data", description: "Please add products to your inventory first." });
      return;
    }
    setPricingLoading(true);
    try {
      const result = await generatePricingSuggestions({
        businessGoal: 'maximize profit',
        inventoryData: productList.map(p => ({
          productName: p.name,
          costPerUnit: p.cost,
          currentStock: p.stock
        })),
        salesData: [], 
        customerPurchasingPatterns: [
          { customerSegment: "B2C", averagePurchaseValue: 1500, purchaseFrequency: "monthly", priceSensitivity: "medium" }
        ]
      });
      setPricingResult(result);
      toast({ title: "Analysis Complete", description: "Pricing strategies updated." });
    } finally {
      setPricingLoading(false);
    }
  };

  const getStockInsights = async () => {
    if (productList.length === 0) {
      toast({ variant: "destructive", title: "Missing Data", description: "Please add products to your inventory first." });
      return;
    }
    setStockLoading(true);
    try {
      const result = await optimizeStockReorder({
        analysisPeriodDays: 30,
        historicalSales: [], 
        products: productList.map(p => ({
          productId: p.id,
          productName: p.name,
          currentStock: p.stock,
          costPerUnit: p.cost,
          sellingPricePerUnit: p.price,
          leadTimeDays: 7,
          minStockThreshold: p.minThreshold
        }))
      });
      setStockResult(result);
      toast({ title: "Inventory Optimized", description: "Reorder levels calculated." });
    } finally {
      setStockLoading(false);
    }
  };

  const handleSendMessage = async (text: string = chatInput) => {
    if (!text.trim() || !user?.uid || !businessId) return;

    const messagesRef = collection(firestore, 'businesses', businessId, 'users', user.uid, 'chatMessages');

    // 1. Save User Message to Firestore
    addDocumentNonBlocking(messagesRef, {
      role: 'user',
      content: text,
      createdAt: serverTimestamp(),
    });

    setChatInput("");
    setIsTyping(true);

    try {
      // 2. Call Real Genkit AI Flow with context
      const aiResponse = await advisorChat({
        message: text,
        context: {
          products: productList.map(p => ({ name: p.name, stock: p.stock, price: p.price, minThreshold: p.minThreshold })),
          leads: leadsList.map(l => ({ name: l.name, intentScore: l.intentScore, source: l.source, status: l.status })),
          businessName: business?.name || "Biztrix Store"
        },
        history: savedMessages.slice(-5).map(m => ({ role: m.role, content: m.content }))
      });

      // 3. Save AI Message to Firestore
      addDocumentNonBlocking(messagesRef, {
        role: 'ai',
        content: aiResponse.content,
        createdAt: serverTimestamp(),
        data: aiResponse.data || null,
        actions: aiResponse.actions || [],
      });
    } catch (error) {
      console.error("AI Advisor Error:", error);
      toast({ variant: "destructive", title: "AI Error", description: "Could not reach the Advisor. Please try again." });
    } finally {
      setIsTyping(false);
    }
  };

  const handleAction = (action: MessageAction) => {
    if (action.type === 'plan') {
      getPricingInsights();
      getStockInsights();
    }
    toast({
      title: "Action Triggered",
      description: `Processing ${action.label}...`
    });
  };

  if (isProfileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-xs font-medium text-slate-500">Synchronizing advisor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 text-left">
      <PageHeader
        breadcrumb="Intelligence / Advisor"
        title="Biztrix AI Advisor"
        description="Personalized pricing, inventory reorder, and growth advice based on your business data."
        icon={Sparkles}
        actions={
          <Button
            variant="outline"
            disabled={pricingLoading || stockLoading}
            onClick={() => { getPricingInsights(); getStockInsights(); }}
            className="h-10 px-4 text-xs font-semibold rounded-xl border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
          >
            {pricingLoading || stockLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4 text-primary" />}
            Run Deep Analysis
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col h-[640px]">
            <div className="bg-slate-900 py-4 px-6 border-b border-slate-800 shrink-0 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Advisor Engine</h3>
                  <p className="text-xs text-slate-300">Live inventory, sales & lead context</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-emerald-300">Data Live</span>
              </div>
            </div>

            <div className="flex-1 overflow-hidden p-0 flex flex-col relative">
              <ScrollArea className="flex-1 p-6 h-full">
                <div className="space-y-5 pb-4">
                  {savedMessages.length === 0 && !isHistoryLoading && (
                    <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
                      <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 mb-3">
                        <Bot className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium text-slate-700 leading-relaxed">
                        Namaste! Main Biztrix AI Advisor hoon. Maine aapka sales, inventory aur leads data analyze kar liya hai. Aaj hum kis par focus karein?
                      </p>
                    </div>
                  )}
                  
                  {isHistoryLoading && savedMessages.length === 0 && (
                    <div className="space-y-4">
                      <Skeleton className="h-20 w-3/4 rounded-2xl" />
                      <Skeleton className="h-20 w-3/4 ml-auto rounded-2xl" />
                    </div>
                  )}

                  {savedMessages.map((m) => (
                    <div key={m.id} className={cn(
                      "flex gap-3 max-w-[90%]",
                      m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}>
                      <div className={cn(
                        "h-8 w-8 rounded-lg shrink-0 flex items-center justify-center border",
                        m.role === 'user' ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-700"
                      )}>
                        {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div className="space-y-1.5">
                        <div className={cn(
                          "p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                          m.role === 'user' 
                            ? "bg-slate-900 text-white rounded-tr-none" 
                            : "bg-slate-50 border border-slate-200 rounded-tl-none text-slate-800"
                        )}>
                          {m.content}
                          
                          {m.data && (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className={cn(
                                "p-3 rounded-xl border flex flex-col gap-1",
                                m.role === 'user' ? "bg-white/10 border-white/20" : "bg-white border-slate-200"
                              )}>
                                <p className="text-xs font-medium opacity-70">{m.data.label}</p>
                                <div className="flex items-baseline justify-between">
                                  <span className="text-lg font-mono tabular-nums font-bold">{m.data.metric}</span>
                                  <span className="text-xs font-mono font-semibold text-emerald-600">{m.data.change}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {m.actions && m.actions.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {m.actions.map((action, i) => {
                                const targetRoute = action.route || action.payload?.route;
                                if (targetRoute) {
                                  return (
                                    <Link
                                      key={i}
                                      href={targetRoute}
                                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs"
                                    >
                                      <span>{action.label}</span>
                                      <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                                    </Link>
                                  );
                                }
                                return (
                                  <Button 
                                    key={i} 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 rounded-lg text-xs font-semibold bg-white border-slate-200 text-slate-800 hover:bg-slate-100"
                                    onClick={() => handleAction(action)}
                                  >
                                    {action.type === 'reorder' && <PackageCheck className="mr-1.5 h-3.5 w-3.5" />}
                                    {action.type === 'whatsapp' && <MessageSquare className="mr-1.5 h-3.5 w-3.5" />}
                                    {action.type === 'discount' && <Percent className="mr-1.5 h-3.5 w-3.5" />}
                                    {action.type === 'plan' && <ListChecks className="mr-1.5 h-3.5 w-3.5" />}
                                    {action.type === 'report' && <BarChart3 className="mr-1.5 h-3.5 w-3.5" />}
                                    {action.label}
                                  </Button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <p className={cn("text-xs font-mono tabular-nums text-slate-400", m.role === 'user' ? "text-right" : "text-left")}>
                          {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-3 mr-auto">
                      <div className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center border bg-white border-slate-200">
                        <Bot className="h-4 w-4 text-slate-700" />
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} className="h-2" />
                </div>
              </ScrollArea>

              <div className="px-5 py-2.5 bg-slate-50/70 border-t border-slate-100 flex gap-2 overflow-x-auto scrollbar-hide shrink-0">
                {[
                  { label: "Thermal printer kaise setup karein?", icon: Lightbulb },
                  { label: "Kacha bill kaise banayein?", icon: ShoppingBag },
                  { label: "Kaunsa stock khatam ho raha hai?", icon: AlertTriangle },
                  { label: "Hot leads kaunsi hain?", icon: Users },
                  { label: "Staff payroll aur attendance SOP", icon: ListChecks },
                  { label: "Customer loyalty points kaise chalte hain?", icon: Sparkles },
                ].map((chip, idx) => (
                  <Button 
                    key={idx} 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleSendMessage(chip.label)}
                    className="h-8 rounded-lg text-xs font-medium whitespace-nowrap bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                  >
                    <chip.icon className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> {chip.label}
                  </Button>
                ))}
              </div>

              <div className="p-4 border-t border-slate-200 bg-white shrink-0">
                <div className="relative flex items-center">
                  <Input 
                    placeholder="Ask about stock, margins, or hot leads..." 
                    className="pr-12 h-11 rounded-xl bg-white border-slate-200 text-sm pl-4"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button 
                    size="icon" 
                    aria-label="Send question"
                    className="absolute right-1.5 h-8 w-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white"
                    onClick={() => handleSendMessage()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <SectionCard title="Real-time Pulse" description="Signals from your live business records" bodyClassName="space-y-4">
            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-3">
              <div className="flex gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-emerald-700" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-emerald-900">Conversion Mode</p>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Aapke paas <span className="font-mono font-semibold">{leadsList.filter(l => (l.intentScore || 0) >= 80).length}</span> high-intent leads hain follow-up ke liye.
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={getPricingInsights}
                className="w-full h-8 text-xs font-semibold border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-100 rounded-lg"
              >
                Analyze Margins <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex gap-3">
              <div className="h-9 w-9 rounded-lg bg-slate-200/70 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-slate-700" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-900">CRM Pulse</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Total <span className="font-mono font-semibold">{leadsList.length}</span> active leads monitored across your funnel.
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-3">
              <div className="flex gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-amber-900">Procurement Alert</p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <span className="font-mono font-semibold">{productList.filter(p => p.stock <= p.minThreshold).length}</span> products low-stock threshold par hain.
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={getStockInsights}
                className="w-full h-8 text-xs font-semibold border-amber-200 bg-white text-amber-800 hover:bg-amber-100 rounded-lg"
              >
                Run Reorder Math <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="Growth Velocity" description="Weekly sales momentum">
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} tick={{fill: '#64748b'}} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}} 
                    contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none', fontSize: '12px'}}
                  />
                  <Bar dataKey="sales" radius={[6, 6, 0, 0]}>
                    {trendData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 6 ? '#0f172a' : '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
