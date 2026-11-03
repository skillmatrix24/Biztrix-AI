
"use client";

import { useState, useMemo } from "react";
import { 
  Zap, 
  Plus, 
  Ticket, 
  TrendingUp, 
  Clock, 
  Users, 
  Gift, 
  Package, 
  ArrowRight,
  MoreVertical, 
  Edit2, 
  Trash2, 
  Percent, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  ShoppingBag, 
  Target, 
  Bot, 
  Sparkles, 
  Search,
  History,
  ArrowUpRight,
  Database,
  Layers,
  ShieldCheck,
  BadgeCheck,
  RefreshCcw,
  Loader2,
  X,
  SmartphoneNfc,
  PlusSquare,
  Info,
  Download,
  FileSpreadsheet,
  User
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection, setDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp, where, limit } from "firebase/firestore";

const OFFER_TYPES = [
  { id: "percentage", label: "Percentage (%)" },
  { id: "fixed", label: "Flat Amount (₹)" },
];

export default function MarketingPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const couponsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'coupons'), orderBy('code', 'asc')) : null
  , [firestore, businessId]);
  const { data: couponsData, isLoading: isCouponsLoading } = useCollection<any>(couponsQuery);
  const coupons = couponsData || [];

  const activitiesQuery = useMemoFirebase(() => 
    businessId ? query(
      collection(firestore, 'businesses', businessId, 'loyaltyActivity'), 
      where('type', '==', 'coupon_redeem'),
      orderBy('timestamp', 'desc'),
      limit(200)
    ) : null
  , [firestore, businessId]);
  const { data: redemptionsData } = useCollection<any>(activitiesQuery);
  const redemptions = redemptionsData || [];

  const [activeTab, setActiveTab] = useState("coupons");
  const [searchTerm, setSearchTerm] = useState("");
  const [redemptionSearchTerm, setRedemptionSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    type: "percentage",
    value: "10",
    minOrder: "0",
    usageProtocol: "single" as 'single' | 'multiple',
    expiry: "",
    status: "active"
  });

  const [bulkPrefix, setBulkPrefix] = useState("SAVE");
  const [bulkQty, setBulkQty] = useState("10");
  const [isGenerating, setIsGenerating] = useState(false);

  const lastUsageMap = useMemo(() => {
    const map: Record<string, string> = {};
    redemptions.forEach((r: any) => {
      if (r.couponCode && !map[r.couponCode]) {
        map[r.couponCode] = r.customerName;
      }
    });
    return map;
  }, [redemptions]);

  const stats = useMemo(() => {
    const active = coupons.filter(c => c.status === 'active').length;
    const totalRedeemed = redemptions.length;
    const totalSavings = redemptions.reduce((sum: number, r: any) => sum + (parseFloat(r.cashback) || 0), 0);
    return { active, totalRedeemed, totalSavings };
  }, [coupons, redemptions]);

  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => 
      c.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [coupons, searchTerm]);

  const filteredRedemptions = useMemo(() => {
    if (!redemptionSearchTerm.trim()) return redemptions;
    const term = redemptionSearchTerm.toLowerCase();
    return redemptions.filter((r: any) => 
      r.customerName?.toLowerCase().includes(term) || 
      r.couponCode?.toLowerCase().includes(term) ||
      r.customerId?.toLowerCase().includes(term)
    );
  }, [redemptions, redemptionSearchTerm]);

  const handleExportCoupons = () => {
    if (!coupons || coupons.length === 0) {
      toast({ variant: "destructive", title: "No Data", description: "Coupons registry is empty." });
      return;
    }
    const headers = ["Coupon Code", "Type", "Value", "Min Order", "Usage Limit", "Usage Count", "Status", "Expiry", "Last Used By"];
    const csvRows = coupons.map(c => [
      c.code,
      c.type?.toUpperCase(),
      c.value,
      c.minOrder || 0,
      c.usageLimit === 1 ? "Single" : "Multiple",
      c.usageCount || 0,
      c.status?.toUpperCase(),
      c.expiry || "Lifetime",
      `"${lastUsageMap[c.code] || 'N/A'}"`
    ].join(','));
    const csvContent = headers.join(',') + '\n' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `coupons_registry_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    toast({ title: "Registry Exported" });
  };

  const handleExportRedemptions = () => {
    if (!redemptions || redemptions.length === 0) {
      toast({ variant: "destructive", title: "No Data", description: "No redemptions to export." });
      return;
    }
    const headers = ["Customer Name", "Customer ID", "Coupon Code", "Savings", "Timestamp", "Description"];
    const csvRows = redemptions.map(r => [
      `"${r.customerName}"`,
      r.customerId,
      r.couponCode,
      r.cashback || 0,
      `"${new Date(r.timestamp).toLocaleString()}"`,
      `"${r.description || ''}"`
    ].join(','));
    const csvContent = headers.join(',') + '\n' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `redemptions_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    toast({ title: "Feed Exported" });
  };

  const handleSaveCoupon = () => {
    if (!formData.code || !businessId) return;
    const id = formData.code.toUpperCase().replace(/\s+/g, '');
    const docRef = doc(firestore, 'businesses', businessId, 'coupons', id);
    
    setDocumentNonBlocking(docRef, {
      ...formData,
      id,
      code: id,
      value: parseFloat(formData.value),
      minOrder: parseFloat(formData.minOrder) || 0,
      usageLimit: formData.usageProtocol === 'single' ? 1 : 0,
      usageCount: isEditing ? (coupons.find(c => c.id === id)?.usageCount || 0) : 0,
      updatedAt: serverTimestamp(),
      ...(isEditing ? {} : { createdAt: serverTimestamp() })
    }, { merge: true });

    setIsAddOpen(false);
    resetForm();
    toast({ title: isEditing ? "Coupon Modified" : "Coupon Node Active" });
  };

  const handleEdit = (coupon: any) => {
    setFormData({
      code: coupon.code || "",
      type: coupon.type || "percentage",
      value: (coupon.value || 0).toString(),
      minOrder: (coupon.minOrder || 0).toString(),
      usageProtocol: coupon.usageLimit === 1 ? 'single' : 'multiple',
      expiry: coupon.expiry || "",
      status: coupon.status || "active"
    });
    setIsEditing(true);
    setIsAddOpen(true);
  };

  const resetForm = () => {
    setFormData({
      code: "",
      type: "percentage",
      value: "10",
      minOrder: "0",
      usageProtocol: "single",
      expiry: "",
      status: "active"
    });
    setIsEditing(false);
  };

  const handleBulkGenerate = async () => {
    if (!businessId || isGenerating) return;
    setIsGenerating(true);
    const qty = parseInt(bulkQty) || 10;
    
    try {
      for (let i = 0; i < qty; i++) {
        const uniqueId = Math.random().toString(36).substr(2, 6).toUpperCase();
        const code = `${bulkPrefix}-${uniqueId}`;
        const docRef = doc(firestore, 'businesses', businessId, 'coupons', code);
        
        setDocumentNonBlocking(docRef, {
          id: code,
          code: code,
          type: formData.type,
          value: parseFloat(formData.value),
          minOrder: parseFloat(formData.minOrder) || 0,
          usageLimit: formData.usageProtocol === 'single' ? 1 : 0, 
          usageCount: 0,
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      toast({ title: "Bulk Nodes Deployed", description: `${qty} unique codes added to registry.` });
      setIsBulkOpen(false);
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Bulk Error" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!businessId) return;
    deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'coupons', id));
    toast({ title: "Node Erased", variant: "destructive" });
  };

  const handleDeleteRedemption = (id: string) => {
    if (!businessId) return;
    deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'loyaltyActivity', id));
    toast({ title: "Log Entry Removed", description: "Audit trail updated (Usage limits remain active)." });
  };

  if (isProfileLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20 px-2 sm:px-0 text-left">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Marketing Hub</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Revenue & Engagement Matrix</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBulkOpen(true)} className="h-11 px-6 rounded-xl border-primary/20 text-primary font-black uppercase text-[10px] bg-white shadow-sm hover:bg-primary/5">
            <Layers className="mr-2 h-4 w-4" /> Bulk Generator
          </Button>
          <Button onClick={() => { resetForm(); setIsAddOpen(true); }} className="bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
            <Plus className="mr-2 h-4 w-4" /> New Card
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border border-border/50 text-left">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Campaign Nodes</span>
            <Ticket className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.active} Live Cards</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-green-500 text-left">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-green-600">Total Redemptions</span>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-black text-green-700">{stats.totalRedeemed} Success</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-primary text-left">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Value Distributed</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-slate-900">{currencySymbol}{stats.totalSavings.toLocaleString()}</div>
        </Card>
        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6 text-left relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Bot className="h-10 w-10 text-accent" /></div>
          <div className="flex items-center justify-between opacity-40 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-accent">AI ROI INDEX</span>
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <div className="text-2xl font-black text-white">+8.5% Growth</div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border h-14 p-1.5 rounded-2xl shadow-sm mb-10 flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="coupons" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><Ticket className="h-4 w-4" /> Global Registry</TabsTrigger>
          <TabsTrigger value="activity" className="flex-1 text-[10px] font-black uppercase px-8 gap-2 text-green-600"><History className="h-4 w-4" /> Redemption Feed</TabsTrigger>
          <TabsTrigger value="insights" className="flex-1 text-[10px] font-black uppercase px-8 gap-2 text-primary"><Bot className="h-4 w-4" /> Strategy Node</TabsTrigger>
        </TabsList>

        <TabsContent value="coupons" className="m-0 space-y-8 animate-in fade-in">
           <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 text-left">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
                <Input placeholder="Search code..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 pl-10 rounded-xl bg-white border-none shadow-inner text-xs font-bold w-full" />
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handleExportCoupons} variant="outline" size="sm" className="h-10 px-4 rounded-xl border-primary/20 text-primary font-bold uppercase text-[9px] gap-2 bg-white">
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </Button>
                <Badge variant="outline" className="h-6 border-primary/20 text-primary font-black uppercase text-[8px] px-3">{filteredCoupons.length} Active Nodes</Badge>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {isCouponsLoading ? (
                <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-primary/20 h-10 w-10" /></div>
              ) : filteredCoupons.length === 0 ? (
                <div className="col-span-full py-40 text-center border-2 border-dashed rounded-[3rem] opacity-20 italic uppercase text-xs font-black">No matching cards.</div>
              ) : filteredCoupons.map((coupon) => (
                <Card key={coupon.id} className={cn(
                  "border-none shadow-md bg-white rounded-2xl overflow-hidden border group hover:shadow-xl transition-all relative text-left",
                  coupon.status === 'expired' && "opacity-60 grayscale-[0.5]"
                )}>
                  <CardHeader className="bg-primary/5 py-5 px-6 border-b flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-white border shadow-sm flex items-center justify-center group-hover:rotate-12 transition-transform">
                        <Ticket className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-sm font-black text-slate-900 tracking-widest font-mono uppercase">{coupon.code}</CardTitle>
                    </div>
                    <Badge className={cn("text-[8px] font-black uppercase h-5 px-2 border-none shadow-sm", coupon.status === 'active' ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600")}>{coupon.status}</Badge>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6 text-left">
                     <div className="flex justify-between items-end">
                        <div className="space-y-1">
                           <p className="text-[9px] font-black uppercase text-muted-foreground opacity-60">Value Node</p>
                           <p className="text-2xl font-black text-primary">
                             {coupon.type === 'percentage' ? `${coupon.value}% OFF` : `${currencySymbol}${coupon.value} FLAT`}
                           </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black text-muted-foreground uppercase opacity-60 mb-1">Usage Node</p>
                          <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-[8px] font-black h-5 uppercase">{coupon.usageLimit === 1 ? 'Single Use' : `Limit: ${coupon.usageLimit || '∞'}`}</Badge>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400"><span>Usage Velocity</span><span>{coupon.usageCount || 0} / {coupon.usageLimit || '∞'}</span></div>
                        <Progress value={coupon.usageLimit ? (coupon.usageCount / coupon.usageLimit) * 100 : 40} className="h-1 bg-primary/5" />
                        {coupon.usageCount > 0 && lastUsageMap[coupon.code] && (
                          <div className="flex items-center gap-1.5 pt-2">
                             <User className="h-2.5 w-2.5 text-primary opacity-40" />
                             <span className="text-[9px] font-bold text-primary/80 uppercase">Last used by: {lastUsageMap[coupon.code]}</span>
                          </div>
                        )}
                     </div>
                  </CardContent>
                  <CardFooter className="bg-muted/10 p-5 border-t flex justify-between items-center group-hover:bg-muted/20 transition-colors">
                     <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase"><Clock className="h-3.5 w-3.5" /> {coupon.expiry || 'LIFETIME'}</div>
                     <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-primary" onClick={() => handleEdit(coupon)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive" onClick={() => handleDelete(coupon.id)}><Trash2 className="h-4 w-4" /></Button>
                     </div>
                  </CardFooter>
                </Card>
              ))}
           </div>
        </TabsContent>

        <TabsContent value="activity" className="m-0 animate-in fade-in">
           <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2.5rem] border text-left">
              <CardHeader className="bg-green-50 border-b py-6 px-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-left">
                 <div className="space-y-1">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-green-700 flex items-center gap-2"><History className="h-4 w-4" /> Live Redemption Feed</CardTitle>
                    <p className="text-[9px] font-bold text-green-600/70 uppercase">History of successful coupon handshakes</p>
                 </div>
                 <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-green-600 opacity-40" />
                       <Input 
                          placeholder="Search customer or code..." 
                          value={redemptionSearchTerm}
                          onChange={(e) => setRedemptionSearchTerm(e.target.value)}
                          className="h-10 pl-9 rounded-xl bg-white border-green-100 shadow-sm text-xs font-bold" 
                       />
                    </div>
                    <Button onClick={handleExportRedemptions} variant="outline" size="sm" className="h-10 px-4 rounded-xl border-green-200 text-green-600 bg-white shadow-sm font-bold uppercase text-[9px] gap-2 w-full md:w-auto">
                      <FileSpreadsheet className="h-3.5 w-3.5" /> Export Node
                    </Button>
                 </div>
              </CardHeader>
              <div className="overflow-x-auto scrollbar-hide">
                 <Table className="min-w-[1000px]">
                    <TableHeader>
                       <TableRow className="bg-muted/10 border-b">
                          <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Customer Identity</TableHead>
                          <TableHead className="text-[10px] font-black uppercase h-12 text-center">Reward Node</TableHead>
                          <TableHead className="text-[10px] font-black uppercase h-12 text-center">Benefit Applied</TableHead>
                          <TableHead className="text-[10px] font-black uppercase h-12 text-right pr-8">Timestamp</TableHead>
                          <TableHead className="w-16"></TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {(!filteredRedemptions || filteredRedemptions.length === 0) ? <TableRow><TableCell colSpan={5} className="h-60 text-center opacity-30 italic text-sm font-black uppercase">No active redemptions logged.</TableCell></TableRow> : filteredRedemptions.map((r: any) => (
                         <TableRow key={r.id} className="hover:bg-muted/5 transition-colors border-b group">
                            <TableCell className="pl-8 py-5">
                               <div className="flex items-center gap-4 text-left">
                                  <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center font-black text-green-600 text-xs shadow-inner">{(r.customerName || 'U').charAt(0)}</div>
                                  <div className="min-w-0 text-left">
                                     <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{r.customerName}</p>
                                     <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">ID: {r.customerId?.slice(-6).toUpperCase()}</p>
                                  </div>
                               </div>
                            </TableCell>
                            <TableCell className="text-center">
                               <Badge variant="outline" className="h-6 border-primary/20 text-primary font-black uppercase text-[10px] font-mono tracking-widest">{r.couponCode || 'PROMO'}</Badge>
                            </TableCell>
                            <TableCell className="text-center font-black text-sm text-green-600">
                               {currencySymbol}{r.cashback || 0} SAVED
                            </TableCell>
                            <TableCell className="text-right pr-8 text-[10px] font-black text-slate-400 uppercase">
                               {new Date(r.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right pr-4">
                               <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all" onClick={() => handleDeleteRedemption(r.id)} title="Erase Log Entry">
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                            </TableCell>
                         </TableRow>
                       ))}
                    </TableBody>
                 </Table>
              </div>
           </Card>
        </TabsContent>

        <TabsContent value="insights" className="m-0 animate-in fade-in duration-700">
           <div className="max-w-4xl mx-auto space-y-8">
              <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[3rem] p-10 sm:p-14 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 group-hover:scale-110 transition-transform"><Bot className="h-60 w-60" /></div>
                 <div className="relative z-10 space-y-10 text-left">
                    <div className="flex items-center gap-4 text-left">
                       <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><Sparkles className="h-7 w-7 text-accent" /></div>
                       <div className="text-left"><h3 className="text-xl font-bold uppercase tracking-tight">AI Campaign Strategist</h3><p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Cognitive Revenue Node</p></div>
                    </div>
                    <div className="space-y-6 text-left">
                       <p className="text-sm sm:text-xl font-medium leading-relaxed italic text-slate-300">
                         "Aapka current **Conversion Node 8.5%** up hai. Recommendation: Weekend ke liye ek limited 'SINGLE-USE' flat discount card launch karein taaki idle users ko reactivate kiya ja sake."
                       </p>
                       <div className="flex flex-wrap gap-4 pt-4 text-left">
                          <div className="p-5 bg-white/5 rounded-[2rem] border border-white/10 text-left"><p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Target Segment</p><p className="text-base font-black text-accent">Idle Users (30D+)</p></div>
                          <div className="p-5 bg-white/5 rounded-[2rem] border border-white/10 text-left"><p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Benefit Model</p><p className="text-base font-black text-green-400">10% Instant OFF</p></div>
                       </div>
                    </div>
                 </div>
              </Card>
           </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddOpen} onOpenChange={(open) => { if(!open) resetForm(); setIsAddOpen(open); }}>
        <DialogContent className="sm:max-w-[450px] rounded-2.5rem border-none shadow-2xl p-0 overflow-hidden text-left">
          <DialogHeader className="p-8 bg-primary text-white shrink-0 text-left">
             <div className="flex items-center gap-4 text-left">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                  {isEditing ? <Edit2 className="h-7 w-7" /> : <PlusSquare className="h-7 w-7" />}
                </div>
                <DialogTitle className="text-xl font-black">{isEditing ? 'Modify Reward Node' : 'Configure Reward Node'}</DialogTitle>
             </div>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="space-y-1.5 text-left"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Universal Code *</Label><Input value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder="e.g. SAVE20" className="h-12 rounded-xl font-black text-lg tracking-widest shadow-inner border-none bg-muted/20" disabled={isEditing} /></div>
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Type</Label><Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}><SelectTrigger className="h-11 rounded-xl font-bold uppercase"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{OFFER_TYPES.map(t => <SelectItem key={t.id} value={t.id} className="text-xs font-bold uppercase">{t.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Value</Label><Input type="number" value={formData.value} onChange={(e) => setFormData({...formData, value: e.target.value})} className="h-11 rounded-xl font-black" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Min Order ({currencySymbol})</Label><Input type="number" value={formData.minOrder} onChange={(e) => setFormData({...formData, minOrder: e.target.value})} className="h-11 rounded-xl bg-muted/10 font-bold" /></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Expiry Date</Label><Input type="date" value={formData.expiry} onChange={(e) => setFormData({...formData, expiry: e.target.value})} className="h-11 rounded-xl font-bold" /></div>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Usage Protocol</Label>
              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant={formData.usageProtocol === 'single' ? 'default' : 'outline'} 
                  onClick={() => setFormData({...formData, usageProtocol: 'single'})}
                  className="flex-1 h-10 text-[9px] font-black uppercase rounded-xl"
                >Single Use</Button>
                <Button 
                  type="button"
                  variant={formData.usageProtocol === 'multiple' ? 'default' : 'outline'} 
                  onClick={() => setFormData({...formData, usageProtocol: 'multiple'})}
                  className="flex-1 h-10 text-[9px] font-black uppercase rounded-xl"
                >Multiple Use</Button>
              </div>
            </div>
            <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Lifecycle Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                    <SelectTrigger className="h-11 rounded-xl font-bold uppercase"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="active" className="text-xs font-bold uppercase text-green-600">Active Node</SelectItem>
                        <SelectItem value="expired" className="text-xs font-bold uppercase text-red-600">Expired Node</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter className="p-8 bg-muted/10 border-t"><Button onClick={handleSaveCoupon} className="w-full h-14 bg-primary font-black uppercase text-xs rounded-2xl shadow-xl text-white">{isEditing ? 'Commit Node Updates' : 'Deploy Node'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-2.5rem border-none shadow-2xl p-0 overflow-hidden text-left w-[95vw]">
           <DialogHeader className="p-8 bg-slate-900 text-white shrink-0 text-left">
              <div className="flex items-center gap-4 text-left">
                 <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                    <Layers className="h-7 w-7 text-accent" />
                 </div>
                 <div className="text-left">
                    <DialogTitle className="text-xl font-bold uppercase">Bulk Node Generator</DialogTitle>
                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">{bulkQty} Unique Multi-Node Clusters</p>
                 </div>
              </div>
           </DialogHeader>
           <div className="p-8 space-y-8 text-left">
              <div className="grid grid-cols-2 gap-6 text-left">
                 <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase opacity-60 ml-1">Base Prefix</Label><Input value={bulkPrefix} onChange={(e) => setBulkPrefix(e.target.value.toUpperCase())} className="h-11 rounded-xl font-black bg-muted/20 border-none shadow-inner" /></div>
                 <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase opacity-60 ml-1">Quantity Node</Label><Input type="number" value={bulkQty} onChange={(e) => setBulkQty(e.target.value)} className="h-11 rounded-xl font-black bg-muted/20 border-none shadow-inner" /></div>
              </div>

              <div className="grid grid-cols-2 gap-6 text-left">
                 <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase opacity-60 ml-1">Reward Type</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                      <SelectTrigger className="h-11 rounded-xl font-black uppercase"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-2xl">
                        {OFFER_TYPES.map(t => <SelectItem key={t.id} value={t.id} className="text-xs font-bold uppercase">{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase opacity-60 ml-1">Benefit Value</Label><Input type="number" value={formData.value} onChange={(e) => setFormData({...formData, value: e.target.value})} className="h-11 rounded-xl font-black bg-muted/20 border-none shadow-inner" /></div>
              </div>

              <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase opacity-60 ml-1">Min Order Requirement ({currencySymbol})</Label><Input type="number" value={formData.minOrder} onChange={(e) => setFormData({...formData, minOrder: e.target.value})} className="h-12 rounded-xl bg-muted/20 border-none shadow-inner" /></div>

              <div className="space-y-3 text-left">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Usage Protocol</Label>
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant={formData.usageProtocol === 'single' ? 'default' : 'outline'} 
                    onClick={() => setFormData({...formData, usageProtocol: 'single'})}
                    className="flex-1 h-10 text-[9px] font-black uppercase rounded-xl"
                  >Single Use</Button>
                  <Button 
                    type="button"
                    variant={formData.usageProtocol === 'multiple' ? 'default' : 'outline'} 
                    onClick={() => setFormData({...formData, usageProtocol: 'multiple'})}
                    className="flex-1 h-10 text-[9px] font-black uppercase rounded-xl"
                  >Multiple Use</Button>
                </div>
              </div>

              <div className="p-6 bg-slate-900 rounded-[2rem] space-y-4 shadow-inner text-left">
                 <p className="text-[9px] font-black uppercase text-accent tracking-widest">Logic Summary</p>
                 <div className="flex items-center gap-3 text-left"><ShieldCheck className="h-4 w-4 text-accent opacity-60" /><span className="text-[10px] font-bold uppercase text-slate-300">Cluster Type: {formData.usageProtocol === 'single' ? 'SINGLE USE' : 'MULTIPLE USE'}</span></div>
                 <div className="flex items-center gap-3 text-left"><BadgeCheck className="h-4 w-4 text-accent opacity-60" /><span className="text-[10px] font-bold uppercase text-slate-300">Value Node: {formData.type === 'percentage' ? `${formData.value}%` : `${currencySymbol}${formData.value}`} {formData.type === 'percentage' ? 'OFF' : 'FLAT'}</span></div>
                 <div className="flex items-center gap-3 text-left"><Info className="h-4 w-4 text-accent opacity-60" /><span className="text-[10px] font-bold uppercase text-slate-300">Threshold: Min Order {currencySymbol}{formData.minOrder}</span></div>
              </div>
           </div>
           <DialogFooter className="p-8 bg-muted/10 border-t">
              <Button onClick={handleBulkGenerate} disabled={isGenerating} className="w-full h-14 bg-primary font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl text-white">
                 {isGenerating ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />} Execute Batch Generation
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
