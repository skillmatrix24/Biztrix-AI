
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
import { useMarketplaceCatalog } from "@/hooks/use-marketplace-catalog";
import { evaluateCoreQuota } from "@/lib/marketplace-catalog";
import { CoreQuotaBanner } from "@/components/quota-upgrade-banner";

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

  const { limits } = useMarketplaceCatalog();

  const leadsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'leads') : null,
    [firestore, businessId]
  );
  const { data: leadsListData, isLoading: isLeadsLoading } = useCollection<Lead>(leadsQuery);
  const leadsList = leadsListData || [];

  const leadsQuota = useMemo(
    () => evaluateCoreQuota("leads", leadsList.length, { limits, business }),
    [leadsList.length, limits, business]
  );
  const isLimitReached = leadsQuota.isReached;

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

      {!isTrialExpired && <CoreQuotaBanner quota={leadsQuota} />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3.5 text-left">
          <div className="h-11 w-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Command Center / CRM & Leads</p>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">Sales CRM</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
            <DialogTrigger asChild>
              <Button disabled={isLimitReached || isTrialExpired} className="h-10 px-5 text-xs font-semibold rounded-xl">
                <Plus className="mr-1.5 h-4 w-4" /> New Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] rounded-2xl border border-slate-200 bg-white shadow-lg p-0 overflow-hidden text-left">
              <form onSubmit={handleAddLead}>
                <DialogHeader className="p-6 bg-slate-900 text-white text-left">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center"><UserPlus className="h-5 w-5 text-white" /></div>
                    <div>
                      <DialogTitle className="text-lg font-bold text-white">Register New Inquiry</DialogTitle>
                      <DialogDescription className="text-xs text-slate-300">Add a prospect to your sales pipeline.</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="p-6 space-y-4">
                  <div className="space-y-1.5 text-left"><Label className="text-xs font-semibold text-slate-700">Client Name *</Label><Input name="name" required className="h-10 rounded-xl" /></div>
                  <div className="space-y-1.5 text-left"><Label className="text-xs font-semibold text-slate-700">Contact Number *</Label><Input name="phone" required className="h-10 rounded-xl font-mono tabular-nums" /></div>
                  <div className="space-y-1.5 text-left">
                    <Label className="text-xs font-semibold text-slate-700">Acquisition Source</Label>
                    <Select name="source" defaultValue="Walk-in">
                      <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Walk-in" /></SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        <SelectItem value="Walk-in">Walk-in</SelectItem>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        <SelectItem value="Facebook">Facebook Ads</SelectItem>
                        <SelectItem value="Website">Store Website</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200"><Button type="submit" className="w-full h-11 text-xs font-semibold rounded-xl">Save Lead</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative w-full md:w-80">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Search name or phone..." className="pl-10 h-10 text-xs rounded-xl bg-white border-slate-200" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide min-h-[560px]">
        {STAGES.map((stage) => {
          const stageLeads = filteredLeads.filter(l => (l.status || 'new') === stage.id);
          return (
            <div key={stage.id} className="w-[310px] shrink-0 space-y-3">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", stage.color)} />
                  <h3 className="text-xs font-semibold text-slate-800">{stage.label}</h3>
                </div>
                <span className="text-xs font-mono tabular-nums font-semibold text-slate-500">{stageLeads.length}</span>
              </div>
              <div className="space-y-3 bg-slate-100/80 p-2.5 rounded-2xl min-h-[520px] border border-slate-200/80">
                {stageLeads.length === 0 ? (
                  <div className="h-24 flex items-center justify-center text-xs text-slate-400">No leads in stage</div>
                ) : (
                  stageLeads.map((lead) => (
                    <Card 
                      key={lead.id} 
                      className="cursor-pointer bg-white hover:border-slate-300 transition-colors rounded-xl border border-slate-200 overflow-hidden" 
                      onClick={() => { setSelectedLead(lead); setIsDrawerOpen(true); }}
                    >
                      <CardContent className="p-4 space-y-3 text-left">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{lead.name}</h4>
                            <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">{lead.phone}</p>
                          </div>
                          <span className="text-[11px] font-medium text-primary shrink-0">{lead.source}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums pt-1 border-t border-slate-100">
                           <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {lead.createdAt}</div>
                           {lead.intentScore && <div className="flex items-center gap-1 font-medium text-amber-700"><Zap className="h-3 w-3 text-amber-500" /> {lead.intentScore}% Intent</div>}
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
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col border-l border-slate-200 overflow-hidden bg-white">
          {selectedLead && (
            <>
              <div className="p-6 sm:p-8 bg-slate-900 text-white shrink-0">
                <div className="text-left space-y-4">
                  <p className="text-xs font-mono text-slate-400">Inquiry · {selectedLead.id.slice(-8).toUpperCase()}</p>
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center text-white font-bold text-xl shrink-0">{selectedLead.name?.charAt(0)}</div>
                    <div className="space-y-0.5 min-w-0">
                      <SheetTitle className="text-xl font-bold text-white truncate">{selectedLead.name}</SheetTitle>
                      <p className="text-slate-300 text-xs font-mono tabular-nums">{selectedLead.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-6 sm:p-8 scrollbar-hide text-left">
                <div className="space-y-8">
                  <section className="space-y-4">
                     <div className="flex items-center justify-between">
                       <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-2"><Layout className="h-4 w-4 text-primary" /> Pipeline Context</h4>
                       <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 capitalize">{selectedLead.status}</span>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                           <p className="text-xs text-slate-500">Source</p>
                           <p className="text-sm font-semibold text-slate-900">{selectedLead.source}</p>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                           <p className="text-xs text-slate-500">Intent Score</p>
                           <p className="text-sm font-bold font-mono tabular-nums text-amber-700">{selectedLead.intentScore || 50}%</p>
                        </div>
                     </div>
                  </section>

                  {selectedLead.status !== 'converted' && (
                    <section className="p-5 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-4">
                       <div className="flex items-center gap-3.5">
                          <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-emerald-700 border border-emerald-200 shrink-0"><UserPlus className="h-5 w-5" /></div>
                          <div className="text-left">
                             <h4 className="text-sm font-bold text-emerald-950">Convert to Customer</h4>
                             <p className="text-xs text-emerald-700">Create a permanent customer profile for billing.</p>
                          </div>
                       </div>
                       <p className="text-xs text-emerald-800 leading-relaxed">Deal finalize hote hi is lead ko registered customer list mein move karein taaki billing aur ledger active ho jaye.</p>
                       <Button onClick={handleConvertToCustomer} disabled={isConverting} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl">
                          {isConverting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RefreshCw className="mr-2 h-4 w-4" /> Convert Lead</>}
                       </Button>
                    </section>
                  )}

                  <section className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-2"><SmartphoneNfc className="h-4 w-4 text-primary" /> Quick Follow-up</h4>
                    <div className="grid grid-cols-2 gap-3">
                       <Button asChild variant="outline" className="h-10 rounded-xl text-xs gap-2">
                         <a href={`tel:${selectedLead.phone}`}><Phone className="h-3.5 w-3.5" /> Call</a>
                       </Button>
                       <Button asChild variant="outline" className="h-10 rounded-xl text-xs gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                         <a href={`https://wa.me/${(selectedLead.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"><SmartphoneNfc className="h-3.5 w-3.5" /> WhatsApp</a>
                       </Button>
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
