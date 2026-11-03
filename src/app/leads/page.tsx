
"use client";

import { useState, useMemo } from "react";
import { 
  Plus, 
  Phone, 
  MessageSquare, 
  Calendar as CalendarIcon, 
  Clock, 
  UserPlus, 
  Search,
  CheckCircle2,
  Zap,
  Target,
  Users,
  Eye,
  MousePointer2,
  BrainCircuit,
  Sparkles,
  SmartphoneNfc,
  Facebook,
  Globe,
  Layout,
  Settings2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  MapPin,
  UserCheck,
  Loader2,
  ArrowRight,
  Notebook,
  ShieldAlert,
  Building,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lead, LeadStatus, LeadSource } from "@/lib/mock-db";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, useUser, useDoc, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { differenceInDays, parseISO } from "date-fns";
import Link from "next/link";

const STAGES: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'new', label: 'New Leads', color: 'bg-blue-500' },
  { id: 'contacted', label: 'Contacted', color: 'bg-orange-500' },
  { id: 'interested', label: 'Interested', color: 'bg-purple-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-yellow-500' },
  { id: 'converted', label: 'Converted', color: 'bg-green-500' },
  { id: 'lost', label: 'Lost', color: 'bg-red-500' },
];

export default function LeadsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);

  const businessId = userProfile?.businessId;
  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  // Fetch Global Limits - Protected by user auth
  const limitsRef = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return doc(firestore, 'system', 'config', 'limits', 'default');
  }, [firestore, user?.uid]);
  const { data: globalLimits } = useDoc<any>(limitsRef);

  const leadsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'leads') : null,
    [firestore, businessId]
  );
  const { data: leadsListData, isLoading: isLeadsLoading } = useCollection<Lead>(leadsQuery);
  const leadsList = leadsListData || [];

  const isLimitReached = useMemo(() => {
    if (!business || !globalLimits) return false;
    if (business.status === 'active' || business.status === 'pro') return false;
    return leadsList.length >= (globalLimits.maxActiveLeads || 20);
  }, [business, globalLimits, leadsList.length]);

  const isTrialExpired = useMemo(() => {
    if (business?.status !== 'trial') return false;
    if (!business?.trialEndDate) return false;
    const endDate = business.trialEndDate?.toDate 
      ? business.trialEndDate.toDate() 
      : (typeof business.trialEndDate === 'string' ? parseISO(business.trialEndDate) : new Date());
    return differenceInDays(endDate, new Date()) < 0;
  }, [business]);

  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isConverting, setIsConverting] = useState(false);

  const filteredLeads = useMemo(() => {
    return leadsList.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.phone.includes(searchTerm));
  }, [leadsList, searchTerm]);

  const handleUpdateLeadContext = (key: string, value: any) => {
    if (!businessId || !selectedLead) return;
    const leadRef = doc(firestore, 'businesses', businessId, 'leads', selectedLead.id);
    updateDocumentNonBlocking(leadRef, { [key]: value });
    setSelectedLead({ ...selectedLead, [key]: value });
    toast({ title: "Updated" });
  };

  const handleConvertToCustomer = async () => {
    if (!businessId || !selectedLead) return;
    setIsConverting(true);
    
    try {
      // UNIFIED ID LOGIC: Use last 10 digits of phone for consistency
      const cleanPhone = selectedLead.phone.replace(/\D/g, '').slice(-10);
      const customerId = `c_${cleanPhone}`;
      const customerRef = doc(firestore, 'businesses', businessId, 'customers', customerId);
      
      // Copy Lead data to new Customer Profile
      setDocumentNonBlocking(customerRef, {
        id: customerId,
        tenantId: businessId,
        name: selectedLead.name,
        phone: selectedLead.phone,
        email: selectedLead.email || "",
        source: selectedLead.source,
        createdAt: new Date().toISOString(),
        customerType: 'Regular',
        creditBalance: 0,
        visitCount: 0,
        totalSpent: 0,
        whatsappOptIn: true,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Mark Lead as Converted
      const leadRef = doc(firestore, 'businesses', businessId, 'leads', selectedLead.id);
      updateDocumentNonBlocking(leadRef, { status: 'converted', updatedAt: serverTimestamp() });

      toast({ title: "Lead Converted", description: `${selectedLead.name} is now a registered customer.` });
      setIsDrawerOpen(false);
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Conversion Failed" });
    } finally {
      setIsConverting(false);
    }
  };

  const handleAddLead = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLeadsLoading || !businessId || isLimitReached || isTrialExpired) return;

    const formData = new FormData(e.currentTarget);
    const leadId = `l${Date.now()}`;
    const newLead: any = {
      id: leadId,
      tenantId: businessId,
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      source: formData.get('source') as LeadSource,
      status: 'new',
      createdAt: new Date().toISOString().split('T')[0],
      intentScore: 50,
    };
    
    setDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'leads', leadId), newLead, { merge: true });
    setIsAddLeadOpen(false);
    toast({ title: "Lead Created" });
  };

  if (isProfileLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 md:space-y-8 pb-10 px-2 sm:px-0 text-left">
      {isTrialExpired && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle className="font-bold">Access Limited</AlertTitle>
          <AlertDescription className="text-xs">
            Trial ended. Read-only mode active. <Link href="/settings/subscription" className="font-bold underline">Upgrade to Pro</Link> to resume leads management.
          </AlertDescription>
        </Alert>
      )}

      {isLimitReached && !isTrialExpired && (
        <Alert className="bg-orange-50 border-orange-200">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="font-bold text-orange-800">Leads Limit Reached</AlertTitle>
          <AlertDescription className="text-xs text-orange-700">
            You've reached your free limit of {globalLimits?.maxActiveLeads || 20} leads. <Link href="/marketplace" className="font-bold underline">Upgrade to Pro</Link> to capture more inquiries.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
            <BrainCircuit className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none">Sales CRM</h2>
            <p className="text-xs md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Handshake Hub</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
            <DialogTrigger asChild>
              <Button disabled={isLimitReached || isTrialExpired} className="bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
                <Plus className="mr-2 h-4 w-4" /> New Lead Node
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden text-left">
              <form onSubmit={handleAddLead}>
                <DialogHeader className="p-8 bg-primary text-white text-left">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20"><UserPlus className="h-5 w-5 text-white" /></div>
                    <DialogTitle className="text-xl">Register New Inquiry</DialogTitle>
                  </div>
                </DialogHeader>
                <div className="p-8 space-y-6">
                  <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Client Name *</Label><Input name="name" required className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner" /></div>
                  <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Contact Number *</Label><Input name="phone" required className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner" /></div>
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Acquisition Source</Label>
                    <Select name="source" defaultValue="Walk-in">
                      <SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue placeholder="Walk-in" /></SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-2xl">
                        <SelectItem value="Walk-in">Walk-in</SelectItem>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        <SelectItem value="Facebook">Facebook Ads</SelectItem>
                        <SelectItem value="Website">Store Website</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="p-8 bg-muted/30 border-t"><Button type="submit" className="w-full h-14 bg-primary font-black uppercase text-xs rounded-2xl shadow-xl">Establish Lead Node</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search name or phone..." className="pl-9 h-11 text-xs rounded-xl bg-white shadow-inner font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide min-h-[600px] px-1">
        {STAGES.map((stage) => {
          const stageLeads = filteredLeads.filter(l => (l.status || 'new') === stage.id);
          return (
            <div key={stage.id} className="w-[320px] shrink-0 space-y-4">
              <div className="flex items-center gap-3 px-3">
                <div className={cn("h-2.5 w-2.5 rounded-full shadow-sm", stage.color)} />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">{stage.label}</h3>
                <Badge variant="secondary" className="text-[9px] h-4 font-black border-none bg-white shadow-sm text-slate-400">{stageLeads.length}</Badge>
              </div>
              <div className="space-y-4 bg-muted/20 p-2.5 rounded-[2.5rem] min-h-[550px] border-2 border-dashed border-muted/50">
                {stageLeads.length === 0 ? (
                  <div className="h-20 flex items-center justify-center opacity-10 italic text-[10px] font-black uppercase tracking-widest">No Traffic</div>
                ) : (
                  stageLeads.map((lead) => (
                    <Card 
                      key={lead.id} 
                      className="border-none shadow-sm hover:shadow-xl cursor-pointer bg-white group transition-all rounded-3xl overflow-hidden" 
                      onClick={() => { setSelectedLead(lead); setIsDrawerOpen(true); }}
                    >
                      <CardContent className="p-5 space-y-4 text-left">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0">
                            <h4 className="text-sm font-black text-slate-900 truncate group-hover:underline uppercase tracking-tight">{lead.name}</h4>
                            <p className="text-[10px] text-muted-foreground font-bold mt-1">{lead.phone}</p>
                          </div>
                          <Badge variant="outline" className="text-[7px] h-4 px-1.5 uppercase font-black border-primary/10 bg-primary/5 text-primary">{lead.source}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-[8px] font-black uppercase text-muted-foreground opacity-60">
                           <div className="flex items-center gap-1.5"><Clock className="h-2.5 w-2.5" /> {lead.createdAt}</div>
                           {lead.intentScore && <div className="flex items-center gap-1.5"><Zap className="h-2.5 w-2.5 text-orange-500 fill-orange-500" /> {lead.intentScore}% Intent</div>}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col border-none shadow-2xl overflow-hidden bg-background">
          {selectedLead && (
            <>
              <div className="p-8 bg-primary text-white shrink-0 relative">
                <div className="absolute top-0 right-0 p-8 opacity-10"><BrainCircuit className="h-40 w-40" /></div>
                <div className="text-left space-y-6 relative z-10">
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20 uppercase text-[9px] font-black px-3 py-1 tracking-widest">INQUIRY: {selectedLead.id.slice(-8).toUpperCase()}</Badge>
                  <div className="flex items-center gap-6">
                    <div className="h-20 w-20 rounded-[1.5rem] bg-white flex items-center justify-center text-primary font-black text-3xl shrink-0 shadow-2xl">{selectedLead.name?.charAt(0)}</div>
                    <div className="space-y-1">
                      <SheetTitle className="text-2xl font-black text-white">{selectedLead.name}</SheetTitle>
                      <p className="text-accent text-[10px] font-bold uppercase tracking-widest">{selectedLead.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-8 scrollbar-hide text-left">
                <div className="space-y-10">
                  <section className="space-y-6">
                     <div className="flex items-center justify-between">
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Layout className="h-4 w-4" /> Pipeline Context</h4>
                       <Badge className="bg-primary/5 text-primary border-primary/20 font-black text-[8px] h-5 px-2 uppercase">{selectedLead.status} NODE</Badge>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 bg-muted/20 rounded-2xl space-y-1">
                           <p className="text-[8px] font-black text-muted-foreground uppercase">Engagement Hub</p>
                           <p className="text-sm font-black text-slate-700">{selectedLead.source} Entry</p>
                        </div>
                        <div className="p-5 bg-muted/20 rounded-2xl space-y-1">
                           <p className="text-[8px] font-black text-muted-foreground uppercase">Intent Logic</p>
                           <p className="text-sm font-black text-orange-600">{selectedLead.intentScore || 50}% Score</p>
                        </div>
                     </div>
                  </section>

                  {selectedLead.status !== 'converted' && (
                    <section className="p-8 bg-green-50 rounded-[2.5rem] border border-green-100 space-y-6 animate-in zoom-in-95">
                       <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-green-600 shadow-lg border border-green-100"><UserPlus className="h-6 w-6" /></div>
                          <div className="text-left">
                             <h4 className="text-sm font-black text-green-800 uppercase tracking-tight">Convert to Customer</h4>
                             <p className="text-[9px] font-bold text-green-600 uppercase mt-0.5 opacity-70">Establish permanent identity node</p>
                          </div>
                       </div>
                       <p className="text-xs text-green-700 leading-relaxed font-medium italic">"Deal finalize hote hi is lead ko registered customer list mein move karein taaki billing node active ho jaye."</p>
                       <Button onClick={handleConvertToCustomer} disabled={isConverting} className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">
                          {isConverting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><RefreshCcw className="mr-2 h-4 w-4" /> Execute Conversion</>}
                       </Button>
                    </section>
                  )}

                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><SmartphoneNfc className="h-4 w-4" /> Smart Nurture</h4>
                    <div className="grid grid-cols-2 gap-4">
                       <Button variant="outline" className="h-12 rounded-xl bg-white font-black uppercase text-[9px] gap-2 border-primary/20 text-primary" onClick={() => window.open(`tel:${selectedLead.phone}`, '_self')}><Phone className="h-3.5 w-3.5" /> Call Node</Button>
                       <Button variant="outline" className="h-12 rounded-xl bg-white font-black uppercase text-[9px] gap-2 border-green-200 text-green-600" onClick={() => window.open(`https://wa.me/${selectedLead.phone.replace(/\D/g, '')}`, '_blank')}><SmartphoneNfc className="h-3.5 w-3.5" /> WhatsApp</Button>
                    </div>
                  </section>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
