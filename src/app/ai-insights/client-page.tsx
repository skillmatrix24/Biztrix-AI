
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
  Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
import { collection, query, where, orderBy, Timestamp, serverTimestamp, doc } from "firebase/firestore";

const trendData = [
  { name: "Mon", sales: 4000 },
  { name: "Tue", sales: 3000 },
  { name: "Wed", sales: 2000 },
  { name: "Thu", sales: 2780 },
  { name: "Fri", sales: 1890 },
  { name: "Sat", sales: 2390 },
  { name: "Sun", sales: 3490 },
];

type ActionType = 'reorder' | 'discount' | 'whatsapp' | 'report' | 'price' | 'map' | 'plan';

type MessageAction = {
  label: string;
  type: ActionType;
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

  // Real-time Firestore Collections with Dynamic IDs
  const productsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'products') : null, 
    [firestore, businessId]
  );
  const { data: productListData } = useCollection<Product>(productsQuery);
  const productList = productListData || [];

  const leadsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'leads') : null, 
    [firestore, businessId]
  );
  const { data: leadsListData } = useCollection<Lead>(leadsQuery);
  const leadsList = leadsListData || [];

  // Chat History Query (Filter: Last 30 days)
  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !businessId) return null;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return query(
      collection(firestore, 'businesses', businessId, 'users', user.uid, 'chatMessages'),
      where('createdAt', '>', Timestamp.fromDate(thirtyDaysAgo)),
      orderBy('createdAt', 'asc')
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
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Synchronizing Advisor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">Biztrix AI Advisor</h2>
            <p className="text-xs md:text-sm text-muted-foreground">Personalized business growth engine based on your data.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            disabled={pricingLoading || stockLoading}
            onClick={() => { getPricingInsights(); getStockInsights(); }} 
            className="h-10 text-xs font-bold uppercase tracking-wider border-primary/20 text-primary"
          >
            {pricingLoading || stockLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            Run Deep Analysis
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main AI Interaction Section */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden flex flex-col h-[650px] border">
            <CardHeader className="bg-primary py-4 px-6 border-b shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-white">Advisor Engine</CardTitle>
                    <p className="text-[9px] font-bold text-white/60 uppercase">Powered by Genkit • Live Context</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[9px] font-bold text-white uppercase">Data Live</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 flex flex-col relative">
              <ScrollArea className="flex-1 p-6 h-full">
                <div className="space-y-6 pb-4">
                  {savedMessages.length === 0 && !isHistoryLoading && (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                      <Bot className="h-12 w-12 mb-4" />
                      <p className="text-sm font-bold uppercase tracking-widest">Namaste! Main Biztrix AI Advisor hoon. Maine aapka sales, inventory aur leads data analyze kar liya hai. Aaj hum kis par focus karein?</p>
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
                        "h-8 w-8 rounded-lg shrink-0 flex items-center justify-center border shadow-sm",
                        m.role === 'user' ? "bg-primary/5 border-primary/10" : "bg-white border-muted"
                      )}>
                        {m.role === 'user' ? <User className="h-4 w-4 text-primary" /> : <Bot className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="space-y-2">
                        <div className={cn(
                          "p-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap",
                          m.role === 'user' 
                            ? "bg-primary text-primary-foreground rounded-tr-none" 
                            : "bg-muted/30 border rounded-tl-none text-foreground"
                        )}>
                          {m.content}
                          
                          {m.data && (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className={cn(
                                "p-3 rounded-xl border flex flex-col gap-1",
                                m.role === 'user' ? "bg-white/10 border-white/20" : "bg-white border-muted shadow-sm"
                              )}>
                                <p className="text-[9px] font-bold uppercase opacity-60">{m.data.label}</p>
                                <div className="flex items-baseline justify-between">
                                  <span className="text-lg font-bold">{m.data.metric}</span>
                                  <span className="text-[10px] font-bold text-green-500">{m.data.change}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {m.actions && m.actions.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {m.actions.map((action, i) => (
                                <Button 
                                  key={i} 
                                  variant="secondary" 
                                  size="sm" 
                                  className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-tight shadow-sm bg-white hover:bg-muted"
                                  onClick={() => handleAction(action)}
                                >
                                  {action.type === 'reorder' && <PackageCheck className="mr-1.5 h-3 w-3" />}
                                  {action.type === 'whatsapp' && <MessageSquare className="mr-1.5 h-3 w-3" />}
                                  {action.type === 'discount' && <Percent className="mr-1.5 h-3 w-3" />}
                                  {action.type === 'plan' && <ListChecks className="mr-1.5 h-3 w-3" />}
                                  {action.type === 'report' && <BarChart3 className="mr-1.5 h-3 w-3" />}
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className={cn("text-[9px] font-bold text-muted-foreground uppercase", m.role === 'user' ? "text-right" : "text-left")}>
                          {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-3 mr-auto">
                      <div className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center border shadow-sm bg-white border-muted">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-muted/30 border p-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" />
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:0.2s]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} className="h-2" />
                </div>
              </ScrollArea>

              <div className="px-6 py-3 bg-muted/5 border-t flex gap-2 overflow-x-auto scrollbar-hide shrink-0 backdrop-blur-sm">
                {[
                  { label: "Kaunsa stock khatam ho raha hai?", icon: AlertTriangle },
                  { label: "Sales kaise badhayein?", icon: TrendingUp },
                  { label: "Summary report dikhao", icon: BarChart3 },
                  { label: "Hot leads kaunsi hain?", icon: Users },
                ].map((chip, idx) => (
                  <Button 
                    key={idx} 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleSendMessage(chip.label)}
                    className="h-8 rounded-full text-[10px] font-bold uppercase tracking-tight whitespace-nowrap bg-white hover:bg-primary/5 border-primary/10 text-primary"
                  >
                    <chip.icon className="mr-1.5 h-3 w-3" /> {chip.label}
                  </Button>
                ))}
              </div>

              <div className="p-4 border-t bg-white shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                <div className="relative flex items-center">
                  <Input 
                    placeholder="Specific data puchiye (e.g. 'Wireless Mouse ka stock?' ya 'Sanjay se baat karni hai?')..." 
                    className="pr-12 h-14 rounded-2xl bg-muted/20 border-none shadow-inner text-sm pl-5 focus-visible:ring-primary"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button 
                    size="icon" 
                    className="absolute right-2 h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 shadow-lg"
                    onClick={() => handleSendMessage()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Growth Recommendations & Stats */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden border">
            <CardHeader className="bg-muted/10 border-b py-4 px-6">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4" /> Real-time Pulse
                </CardTitle>
                <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Based on Live Firestore Data</p>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex flex-col gap-3 group hover:shadow-md transition-all">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-xl bg-green-600/10 flex items-center justify-center shrink-0 border border-green-600/20">
                    <Zap className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-green-800">Conversion Mode</p>
                    <p className="text-[10px] text-green-700 leading-relaxed italic">
                      Analysis complete. Aapke paas {leadsList.filter(l => (l.intentScore || 0) >= 80).length} hot prospects hain conversion ke liye.
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={getPricingInsights}
                  className="w-full h-8 text-[9px] font-bold uppercase border-green-200 text-green-700 hover:bg-green-100"
                >
                  Analyze Margins <ArrowRight className="ml-1.5 h-3 w-3" />
                </Button>
              </div>

              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-primary">CRM Pulse</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                      Total {leadsList.length} active leads monitored. High intent scoring active.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-xl bg-orange-600/10 flex items-center justify-center shrink-0 border border-orange-600/20">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-orange-800">Procurement Alert</p>
                    <p className="text-[10px] text-orange-700 leading-relaxed italic">
                      {productList.filter(p => p.stock <= p.minThreshold).length} products critical level par hain. Turant reorder math run karein.
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={getStockInsights}
                  className="w-full h-8 text-[9px] font-bold uppercase border-orange-200 text-orange-700 hover:bg-orange-100"
                >
                  Run Reorder Math <ArrowRight className="ml-1.5 h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Market Velocity Chart */}
          <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden h-[300px] border">
            <CardHeader className="border-b py-4 px-6 bg-muted/5">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Target className="h-4 w-4" /> Growth Velocity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#888888'}} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}} 
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px'}}
                    />
                    <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
                      {trendData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 6 ? 'hsl(var(--accent))' : 'hsl(var(--primary))'} opacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
