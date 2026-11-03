"use client";

import { useState, useMemo } from "react";
import { 
  MessageSquare, 
  Plus, 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  Clock, 
  Zap, 
  SmartphoneNfc, 
  History, 
  Users, 
  Target, 
  Loader2, 
  ShieldAlert,
  ShieldCheck,
  Bot,
  Sparkles,
  Lock,
  Send,
  MoreVertical,
  Edit2,
  Trash2,
  Gem,
  IdCard,
  Heart,
  Database,
  ChevronRight,
  Info,
  Calendar,
  Wallet,
  Coins
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, doc, serverTimestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { suggestCampaign } from "@/ai/flows/suggest-loyalty-campaign-flow";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const SEGMENTS = [
  { id: 'all', label: 'All Customers', icon: Users },
  { id: 'premium', label: 'Premium Users', icon: Gem },
  { id: 'inactive', label: 'Inactive (30D+)', icon: Clock },
  { id: 'expiring', label: 'Expiring Soon', icon: Target },
  { id: 'birthday_month', label: 'Birthday Month', icon: Sparkles },
];

const VARIABLE_GUIDE = [
  { id: '{{name}}', label: 'Full Name', desc: 'Sanjay Gupta' },
  { id: '{{card_number}}', label: 'Member Card ID', desc: 'BIZ-GOLD-2026-0013' },
  { id: '{{points}}', label: 'Reward Points', desc: '1,240' },
  { id: '{{wallet}}', label: 'Cashback Balance', desc: '₹450' },
  { id: '{{event_date}}', label: 'Occasion Date', desc: '24th March' },
  { id: '{{track_url}}', label: 'Digital Hub Link', desc: 'Track Portal' },
];

export default function LoyaltyCampaignsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const campaignsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'campaigns'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: campaignsRaw, isLoading } = useCollection<any>(campaignsQuery);
  const campaigns = campaignsRaw || [];

  const couponsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'coupons') : null
  , [firestore, businessId]);
  const { data: couponsRaw } = useCollection<any>(couponsQuery);
  const coupons = couponsRaw || [];

  const customersQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'customers') : null
  , [firestore, businessId]);
  const { data: customersRaw } = useCollection<any>(customersQuery);
  const customers = customersRaw || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: "",
    segment: "all",
    message: "",
    couponId: "none",
    scheduledAt: ""
  });

  const isWhatsappActive = useMemo(() => {
    return business?.activeAddonIds?.includes('feat_whatsapp') || business?.activeAddonIds?.includes('suite_growth') || business?.status === 'pro';
  }, [business]);

  const segmentStats = useMemo(() => {
    if (!customers) return { total: 0, events: 0, premium: 0 };
    const list = formData.segment === 'all' ? customers : 
                 formData.segment === 'premium' ? customers.filter((c:any) => c.customerType === 'VIP') :
                 formData.segment === 'birthday_month' ? customers.filter((c:any) => c.dob?.includes(`-${new Date().getMonth() + 1}-`)) : customers;
    
    return {
      total: list.length,
      events: list.filter((c:any) => (c.events || []).length > 0).length,
      premium: list.filter((c:any) => c.customerType === 'VIP').length
    };
  }, [formData.segment, customers]);

  const handleLaunch = () => {
    if (!formData.title || !formData.message || !businessId) return;

    if (!isWhatsappActive) {
      toast({ 
        title: "Premium Feature Required", 
        description: "WhatsApp Automation module is needed to launch broadcasts. Please activate it in the Marketplace.",
        variant: "destructive"
      });
      return;
    }
    
    if (editingId) {
      const docRef = doc(firestore, 'businesses', businessId, 'campaigns', editingId);
      updateDocumentNonBlocking(docRef, {
        ...formData,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Campaign Updated", description: "Changes saved to the sequence node." });
    } else {
      addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'campaigns'), {
        ...formData,
        status: 'scheduled',
        recipientCount: segmentStats.total,
        createdAt: serverTimestamp()
      });
      toast({ title: "Campaign Scheduled", description: "Node added to transmission queue." });
    }

    setIsAddOpen(false);
    resetForm();
  };

  const handleEdit = (campaign: any) => {
    setFormData({
      title: campaign.title || "",
      segment: campaign.segment || "all",
      message: campaign.message || "",
      couponId: campaign.couponId || "none",
      scheduledAt: campaign.scheduledAt || ""
    });
    setEditingId(campaign.id);
    setIsAddOpen(true);
  };

  const confirmDelete = () => {
    if (!businessId || !campaignToDelete) return;
    const docRef = doc(firestore, 'businesses', businessId, 'campaigns', campaignToDelete.id);
    deleteDocumentNonBlocking(docRef);
    setIsDeleteAlertOpen(false);
    setCampaignToDelete(null);
    toast({ title: "Campaign Erased", variant: "destructive" });
  };

  const resetForm = () => {
    setFormData({ title: "", segment: "all", message: "", couponId: "none", scheduledAt: "" });
    setEditingId(null);
  };

  const handleAiMessage = async () => {
    if (!formData.title || !businessId) {
      toast({ variant: "destructive", title: "Identity Required", description: "Please enter a Campaign Goal/Title first so AI can generate context." });
      return;
    }
    setIsAiLoading(true);
    try {
      const selectedCoupon = coupons.find(c => c.id === formData.couponId);
      const result = await suggestCampaign({
        businessName: business?.name || profile?.businessName || "Biztrix Store",
        segment: SEGMENTS.find(s => s.id === formData.segment)?.label || "Customers",
        goal: formData.title,
        availableOffer: selectedCoupon ? `${selectedCoupon.code} (${selectedCoupon.value}${selectedCoupon.type === 'percentage' ? '%' : ' OFF'})` : undefined
      });
      
      setFormData({ ...formData, message: result.whatsappMessage });
      toast({ title: "AI Copy Generated", description: "Message tailored for the target segment with sateek placeholders." });
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "AI Engine Busy", description: "Could not generate copy. Try again." });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-10 pb-20 px-2 sm:px-0 text-left">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm border border-border/50 shrink-0"><Link href="/loyalty"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="text-left">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">Campaign Center</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Bulk Identity Messaging Hub</p>
          </div>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
              <Plus className="mr-2 h-4 w-4" /> New Sequence
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[1000px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden w-[98vw] flex flex-col lg:flex-row max-h-[95vh]">
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              <DialogHeader className="p-6 sm:p-8 bg-slate-900 text-white text-left shrink-0">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
                    <SmartphoneNfc className="h-6 w-6 text-accent" />
                  </div>
                  <div className="text-left">
                    <DialogTitle className="text-xl font-bold">{editingId ? "Edit Campaign Node" : "Launch New Campaign"}</DialogTitle>
                    <DialogDescription className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Bulk data-node broadcast</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <ScrollArea className="flex-1 p-6 sm:p-8">
                <div className="space-y-8 pb-6">
                  {!isWhatsappActive && (
                    <Alert className="bg-orange-50 border-orange-200 rounded-2xl">
                      <Lock className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-[10px] font-black uppercase text-orange-800">WhatsApp Automation is disabled. Requires Premium Module.</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Campaign Goal / Title *</Label>
                    <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="e.g. Birthday Special Wish" className="h-11 rounded-xl font-bold bg-muted/20 border-none shadow-inner" />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Target Segment</Label>
                      <Select value={formData.segment} onValueChange={(v) => setFormData({...formData, segment: v})}>
                        <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl">
                          {SEGMENTS.map(s => <SelectItem key={s.id} value={s.id} className="text-xs font-bold uppercase">{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Attach Coupon Reward</Label>
                      <Select value={formData.couponId} onValueChange={(v) => setFormData({...formData, couponId: v})}>
                        <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue placeholder="No Coupon" /></SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl">
                          <SelectItem value="none" className="text-xs font-bold uppercase">No Reward</SelectItem>
                          {coupons.map((c: any) => <SelectItem key={c.id} value={c.id} className="text-xs font-bold uppercase">{c.code}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">WhatsApp Body (Personalized) *</Label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        disabled={isAiLoading}
                        onClick={handleAiMessage}
                        className="h-8 rounded-xl bg-primary/5 text-primary text-[8px] font-black uppercase hover:bg-primary/10 gap-2 border border-primary/10"
                      >
                        {isAiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        AI Suggest Copy
                      </Button>
                    </div>
                    <Textarea value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} placeholder="Hi {{name}}, we have a special gift for your member card {{card_number}}..." className="min-h-[160px] rounded-2xl bg-muted/20 border-none p-5 text-sm font-medium shadow-inner leading-relaxed" />
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between">
                       <span className="text-[8px] font-black uppercase text-primary tracking-widest">Active Mapping: Name, Card, Points, Dates</span>
                       <Info className="h-3 w-3 text-primary opacity-40" />
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="p-6 sm:p-8 bg-muted/10 border-t shrink-0">
                <Button onClick={handleLaunch} className={cn("w-full h-14 font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl", isWhatsappActive ? "bg-primary" : "bg-slate-700")}>
                  <Send className="mr-2 h-4 w-4" /> {isWhatsappActive ? "Commit & Dispatch Bulk" : "Save Draft Node"}
                </Button>
              </DialogFooter>
            </div>

            <div className="hidden lg:flex w-[350px] bg-slate-50 flex-col border-l overflow-hidden">
               <div className="p-6 border-b flex items-center justify-center bg-white/50 shrink-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Segment Intelligence</p>
               </div>
               <ScrollArea className="flex-1 p-6">
                  <div className="space-y-8 text-left">
                     <div className="space-y-4">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-primary">Node Data Stats</Label>
                        <div className="grid grid-cols-1 gap-3">
                           <div className="p-4 bg-white rounded-2xl border shadow-sm flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Recipients</span>
                              <span className="text-sm font-black text-slate-900">{segmentStats.total}</span>
                           </div>
                           <div className="p-4 bg-white rounded-2xl border shadow-sm flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Premium Nodes</span>
                              <span className="text-sm font-black text-primary">{segmentStats.premium}</span>
                           </div>
                           <div className="p-4 bg-white rounded-2xl border shadow-sm flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Event Enabled</span>
                              <span className="text-sm font-black text-green-600">{segmentStats.events}</span>
                           </div>
                        </div>
                     </div>

                     <Separator className="opacity-40" />

                     <div className="space-y-4">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-primary">Supported Variables</Label>
                        <div className="space-y-2">
                           {VARIABLE_GUIDE.map(v => (
                             <div key={v.id} className="p-3 bg-primary/5 rounded-xl border border-primary/10 group hover:bg-primary/10 transition-all cursor-copy" onClick={() => { setFormData({...formData, message: formData.message + " " + v.id}); toast({title: "Variable Added"}); }}>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[9px] font-black text-primary font-mono">{v.id}</span>
                                  <span className="text-[7px] font-bold text-muted-foreground uppercase">{v.label}</span>
                                </div>
                                <p className="text-[8px] italic text-slate-400">Example: {v.desc}</p>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
           <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
            <CardHeader className="bg-muted/30 border-b py-5 px-6 md:px-8"><CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2"><History className="h-4 w-4" /> Sequence History</CardTitle></CardHeader>
            <div className="overflow-x-auto scrollbar-hide">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Campaign Node</TableHead>
                    <TableHead className="text-[10px] font-black uppercase h-12">Target Segment</TableHead>
                    <TableHead className="text-[10px] font-black uppercase h-12 text-center">Status</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase h-12">Sent Volume</TableHead>
                    <TableHead className="text-right pr-8 h-12 w-32"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary opacity-20" /></TableCell></TableRow>
                  ) : campaigns.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-40 text-center opacity-30 italic text-sm font-black uppercase tracking-widest">No broadcast records.</TableCell></TableRow>
                  ) : campaigns.map((c: any) => (
                    <TableRow key={c.id} className="group hover:bg-muted/5 transition-colors border-b">
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><MessageSquare className="h-4 w-4" /></div>
                          <div className="min-w-0 text-left">
                            <span className="text-sm font-black text-slate-900 truncate block max-w-[200px]">{c.title}</span>
                            <span className="text-[8px] font-bold text-muted-foreground uppercase">{c.createdAt?.toDate ? format(c.createdAt.toDate(), 'dd MMM yyyy') : 'Recently'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 border-primary/20 text-primary whitespace-nowrap">{c.segment?.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "text-[8px] font-black uppercase h-4 px-2 border-none shadow-sm",
                          c.status === 'sent' ? "bg-green-100 text-green-700" : "bg-orange-50 text-orange-600"
                        )}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-black text-xs">{c.recipientCount || '...'}</TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-primary" onClick={() => handleEdit(c)}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive" onClick={() => { setCampaignToDelete(c); setIsDeleteAlertOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden text-left">
              <CardContent className="p-8 space-y-8">
                 <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                    <Sparkles className="h-6 w-6 text-accent fill-accent" />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-xl font-bold uppercase tracking-tight">Bulk Node Mapping</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">Biztrix Growth Engine bulk messaging ke waqt har member ke data points (Points, Card No, Name) ko automatically replace karta hai.</p>
                 </div>
                 <Separator className="bg-white/10" />
                 <div className="space-y-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                       <p className="text-[10px] font-black text-accent uppercase tracking-widest">Personalization Node</p>
                       <p className="text-[9px] text-slate-500 font-medium">Use {"{{name}}"} and {"{{card_number}}"} in every message for 85% higher conversion.</p>
                    </div>
                 </div>
                 <Button asChild variant="outline" className="w-full h-12 bg-white/5 border-white/10 text-white font-black uppercase text-[10px] rounded-xl hover:bg-white/10">
                    <Link href="/whatsapp-automation/config">Update API Config <ChevronRight className="ml-1 h-3 w-3" /></Link>
                 </Button>
              </CardContent>
           </Card>

           <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 flex items-start gap-4">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 opacity-40" />
              <div className="space-y-1 text-left">
                 <p className="text-[10px] font-black uppercase text-primary tracking-widest">Compliance Node</p>
                 <p className="text-[10px] text-primary/60 leading-relaxed italic mt-1">"Ensure your Meta templates are approved before launching bulk sequences to avoid API rejections."</p>
              </div>
           </div>
        </div>
      </div>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-10">
          <AlertDialogHeader>
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-6">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <AlertDialogTitle className="text-2xl font-black">Erase Sequence Node?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-slate-500 leading-relaxed uppercase tracking-tight">
              Permanently remove <span className="font-bold text-slate-900">"{campaignToDelete?.title}"</span> from the logs?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 flex gap-4">
            <AlertDialogCancel asChild><Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold uppercase text-[10px]">Keep Log</Button></AlertDialogCancel>
            <AlertDialogAction asChild><Button onClick={confirmDelete} className="flex-1 h-14 rounded-2xl font-black uppercase bg-destructive hover:bg-destructive/90 text-white border-none shadow-lg text-[10px]">Erase Node</Button></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CouponPublicCard({ data, business, currencySymbol, hideInspectButton = false }: any) {
  return (
    <Card className="border-none shadow-2xl bg-white rounded-[2rem] overflow-hidden border group relative transition-all duration-500 hover:scale-[1.05] flex flex-col h-full text-left">
      <div className={cn("p-8 relative text-white min-h-[160px] bg-primary")}>
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '15px 15px' }} />
        <div className="relative z-10 flex justify-between h-full">
           <div className="flex-1 flex flex-col justify-center">
              <h3 className="text-2xl font-black tracking-widest uppercase">{data.code || 'OFFER'}</h3>
              <p className="text-[11px] font-bold text-accent italic uppercase mt-3">PERSONALIZED NODE</p>
           </div>
           <div className="h-10 w-10 rounded-xl bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-[12px] font-black text-white shadow-inner shrink-0">
            {business?.name?.charAt(0) || 'B'}
          </div>
        </div>
      </div>
      <CardContent className="p-8 space-y-6 bg-white relative z-20 text-left flex-1">
        <p className="text-sm font-medium text-slate-600 leading-relaxed line-clamp-3 italic">"{data.message}"</p>
        <Separator className="opacity-40" />
        <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
           <div className="flex items-center gap-2"><Users className="h-4 w-4 opacity-40" /><span>{data.segment}</span></div>
           <Badge variant="outline" className="text-[8px] h-4 border-primary/20 text-primary uppercase font-black">{data.status}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
