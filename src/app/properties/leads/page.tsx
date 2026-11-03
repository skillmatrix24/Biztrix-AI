
"use client";

import { useState, useMemo } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  SmartphoneNfc, 
  Loader2, 
  Edit2, 
  Trash2, 
  LayoutList, 
  LayoutGrid, 
  Target, 
  ChevronRight, 
  ShieldCheck, 
  Zap, 
  Info, 
  User, 
  CheckCircle2, 
  Building, 
  Briefcase, 
  DollarSign, 
  Clock, 
  X, 
  Lock, 
  MessageCircle, 
  Bell, 
  AlertTriangle, 
  ArrowRight, 
  Calculator, 
  Tag, 
  MapPin, 
  Calendar, 
  Save, 
  Scale, 
  Navigation, 
  Smartphone, 
  Phone, 
  Mail, 
  UserPlus, 
  Columns, 
  Share2 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useUser, 
  useDoc, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking, 
  addDocumentNonBlocking 
} from "@/firebase";
import { collection, query, orderBy, doc, where, serverTimestamp, getDoc } from "firebase/firestore";
import Link from "next/link";
import { calculateGST, Product, Customer, Vendor, processNewInvoice } from "@/lib/mock-db";

const STAGES = [
  { id: 'new', label: 'Fresh Inquiry', color: 'bg-blue-500', bg: 'bg-blue-50/50', border: 'border-blue-100', text: 'text-blue-700' },
  { id: 'contacted', label: 'Call Done', color: 'bg-orange-500', bg: 'bg-orange-50/50', border: 'border-orange-100', text: 'text-orange-700' },
  { id: 'site-visit', label: 'Site Visit', color: 'bg-purple-500', bg: 'bg-purple-50/50', border: 'border-purple-100', text: 'text-purple-700' },
  { id: 'negotiation', label: 'Negotiating', color: 'bg-yellow-500', bg: 'bg-yellow-50/50', border: 'border-yellow-100', text: 'text-yellow-700' },
  { id: 'won', label: 'Deal Closed', color: 'bg-green-500', bg: 'bg-green-50/50', border: 'border-green-100', text: 'text-green-700' },
];

const maskName = (name: string) => {
  if (!name) return "";
  if (name.length <= 2) return name;
  const first = name[0];
  const last = name[name.length - 1];
  return `${first}***${last}`;
};

const maskPhone = (phone: string) => {
  if (!phone) return "";
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 5) return phone;
  const first = clean.substring(0, 2);
  const last = clean.substring(clean.length - 2);
  return `${first}******${last}`;
};

function SectionHeader({ icon: Icon, title }: any) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-8 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{title}</h3>
    </div>
  );
}

export default function RealEstateLeadsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const isAdmin = useMemo(() => {
    const role = (userProfile?.role || '').toLowerCase();
    return role === 'admin' || user?.email?.toLowerCase() === 'skillmatrix24@gmail.com';
  }, [userProfile, user]);

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const teamQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null
  , [firestore, businessId]);
  const { data: teamMembersRaw } = useCollection<any>(teamQuery);
  
  const teamMembers = useMemo(() => {
    if (!teamMembersRaw) return [];
    const allowedRoles = business?.propertyMemberRoles || [];
    if (allowedRoles.length === 0) return teamMembersRaw;
    return teamMembersRaw.filter((m: any) => {
      const role = (m.role || '').toLowerCase();
      return allowedRoles.some((ar: string) => ar.toLowerCase() === role);
    });
  }, [teamMembersRaw, business?.propertyMemberRoles]);

  const leadsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'realEstateLeads'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: leadsData, isLoading: isLeadsLoading } = useCollection<any>(leadsQuery);
  const leads = leadsData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [activeStage, setActiveStage] = useState("all");
  const [activeView, setActiveView] = useState<"board" | "grid" | "list">("grid");
  
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  
  const [isDeleteAlertOpen, setIsDeleteOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<any>(null);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const name = l.name || "";
      const phone = l.phone || "";
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || phone.includes(searchTerm);
      const matchesStage = activeStage === "all" || (l.leadStage || 'new') === activeStage;
      return matchesSearch && matchesStage;
    });
  }, [leads, searchTerm, activeStage]);

  const generateLeadMessage = (lead: any) => {
    const config = business?.waMarketingConfigs?.['Lead/Customer Profile'];
    if (config) {
      const toggles = config.toggles || {};
      let msgParts = [];

      if (config.header) msgParts.push(config.header);
      
      if (toggles.includeName) msgParts.push(`👤 Client: ${lead.name}`);
      if (toggles.includePhone) msgParts.push(`📱 Phone: ${lead.phone}`);
      if (toggles.includeSource) msgParts.push(`📢 Source: ${lead.source}`);
      if (toggles.includeInterest) msgParts.push(`🏠 Interest: ${lead.propertyTypeInterest}`);
      if (toggles.includeBudget) msgParts.push(`💰 Budget: ${currencySymbol}${parseFloat(lead.budgetMax || 0).toLocaleString()}`);
      if (toggles.includeLocation) msgParts.push(`📍 Location: ${lead.location || lead.village || 'N/A'}`);
      if (toggles.includeAgent) msgParts.push(`👤 Agent: ${lead.agentName || 'Owner'}`);
      if (toggles.includeStatus) msgParts.push(`📊 Stage: ${STAGES.find(s => s.id === (lead.leadStage || 'new'))?.label}`);
      
      if (toggles.includeNotes && lead.notes) {
        msgParts.push(`\n📝 *Remarks:*\n${lead.notes}`);
      }

      if (config.footer) msgParts.push(`\n${config.footer}`);

      return msgParts.join('\n');
    }

    return `🚀 *Inquiry Update*\nClient: ${lead.name}\nInterest: ${lead.propertyTypeInterest}\nBudget Max: ${currencySymbol}${parseFloat(lead.budgetMax || 0).toLocaleString()}\n📍 Location: ${lead.location || 'N/A'}`;
  };

  const handleWhatsAppAction = async (e: React.MouseEvent, lead: any) => {
    e.stopPropagation();
    if (!businessId || !user?.uid) return;

    const isOwner = lead.assignedAgentId === user?.uid;
    const shouldMask = !isAdmin && !isOwner;

    if (shouldMask) {
      const ownerAgent = teamMembers.find(m => m.id === lead.assignedAgentId);
      if (ownerAgent?.phone) {
        const message = `Hi ${ownerAgent.name}, I noticed you are managing the lead *${maskName(lead.name)}*. I have some updates/queries regarding this customer. Can we discuss?`;
        window.open(`https://wa.me/${ownerAgent.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
      } else {
        toast({ variant: "destructive", title: "Contact Failed", description: "Lead owner's contact info is not available." });
      }
      return;
    }

    const finalMsg = generateLeadMessage(lead);
    window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(finalMsg)}`, '_blank');
  };

  const handleUniversalShare = (e: React.MouseEvent, lead: any) => {
    e.stopPropagation();
    const finalMsg = generateLeadMessage(lead);
    window.open(`https://wa.me/?text=${encodeURIComponent(finalMsg)}`, '_blank');
    toast({ title: "Forward Node", description: "Select contact to share full profile." });
  };

  const handleCallAction = (e: React.MouseEvent, lead: any) => {
    e.stopPropagation();
    const isOwner = lead.assignedAgentId === user?.uid;
    const shouldMask = !isAdmin && !isOwner;

    if (shouldMask) {
      const ownerAgent = teamMembers.find(m => m.id === lead.assignedAgentId);
      if (ownerAgent?.phone) {
        window.open(`tel:${ownerAgent.phone.replace(/\D/g, '')}`, '_self');
        toast({ title: "Routing Call", description: `Calling Owner Agent: ${ownerAgent.name}` });
      } else {
        toast({ variant: "destructive", title: "Contact Failed", description: "Lead owner's phone number is missing." });
      }
    } else {
      window.open(`tel:${lead.phone.replace(/\D/g, '')}`, '_self');
    }
  };

  const handleOpenDetail = (lead: any) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, lead: any) => {
    e.stopPropagation();
    const shouldMask = !isAdmin && lead.assignedAgentId !== user?.uid;
    if (shouldMask) {
      toast({ variant: "destructive", title: "Access Denied", description: "Only assigned agent or admin can edit this node." });
      return;
    }
    setEditFormData({ ...lead });
    setIsEditModalOpen(true);
  };

  const handleUpdateFullLead = () => {
    if (!businessId || !editFormData.id) return;
    const leadRef = doc(firestore, 'businesses', businessId, 'realEstateLeads', editFormData.id);
    updateDocumentNonBlocking(leadRef, { ...editFormData, updatedAt: serverTimestamp() });
    setIsEditModalOpen(false);
    toast({ title: "Profile Updated" });
  };

  const openDeleteAlert = (e: React.MouseEvent, lead: any) => {
    e.stopPropagation();
    if (!isAdmin) return;
    setLeadToDelete(lead);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!businessId || !leadToDelete) return;
    deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'realEstateLeads', leadToDelete.id));
    setIsDeleteOpen(false);
    toast({ title: "Lead Erased", variant: "destructive" });
  };

  const filteredLeadsList = filteredLeads;

  return (
    <div className="space-y-6 md:space-y-10 pb-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
            <Target className="h-7 w-7 md:h-8 md:w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 leading-tight">Customer Enquiries</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Lead Registry Node</p>
          </div>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-[0.2em] rounded-xl text-white">
          <Link href="/properties/leads/new"><UserPlus className="mr-2 h-4 w-4" /> Register Customer</Link>
        </Button>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row items-center justify-between gap-6 px-1">
          <div className="flex items-stretch lg:items-center gap-4 w-full xl:w-auto">
            <div className="bg-white border rounded-xl p-1 shadow-sm flex shrink-0">
              <Button variant={activeView === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveView('grid')} className="h-8 px-4 text-[10px] font-bold uppercase rounded-lg"><LayoutGrid className="mr-2 h-3.5 w-3.5" /> Grid</Button>
              <Button variant={activeView === 'board' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveView('board')} className="h-8 px-4 text-[10px] font-bold uppercase rounded-lg"><Columns className="mr-2 h-3.5 w-3.5" /> Board</Button>
              <Button variant={activeView === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveView('list')} className="h-8 px-4 text-[10px] font-bold uppercase rounded-lg"><LayoutList className="mr-2 h-3.5 w-3.5" /> List</Button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 lg:flex-none">
              <Button variant={activeStage === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setActiveStage('all')} className="h-8 px-4 text-[10px] font-bold uppercase rounded-lg whitespace-nowrap">All Stages</Button>
              {STAGES.map(s => (
                <Button key={s.id} variant={activeStage === s.id ? 'default' : 'outline'} size="sm" onClick={() => setActiveStage(s.id)} className="h-8 px-4 text-[10px] font-bold uppercase rounded-lg whitespace-nowrap">{s.label}</Button>
              ))}
            </div>
          </div>
          <div className="relative w-full xl:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input placeholder="Search name or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 pl-10 rounded-xl bg-white border-none shadow-inner text-xs font-bold" />
          </div>
        </div>

        {activeView === 'board' && (
          <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide min-h-[600px] -mx-4 px-4 sm:mx-0 sm:px-0">
            {STAGES.map((stage) => {
              const stageLeads = filteredLeadsList.filter(l => (l.leadStage || 'new') === stage.id);
              return (
                <div key={stage.id} className="w-[300px] sm:w-[340px] shrink-0 space-y-4">
                  <div className="flex items-center justify-between px-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-2.5 w-2.5 rounded-full shadow-sm", stage.color)} />
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">{stage.label}</h3>
                      <Badge variant="secondary" className="text-[9px] h-4 py-0 font-bold px-1.5 border-none bg-white shadow-sm text-slate-400">{stageLeads.length}</Badge>
                    </div>
                  </div>
                  <div className={cn("space-y-4 p-2.5 rounded-[2rem] min-h-[550px] transition-all border border-transparent shadow-inner", stage.bg, stage.border)}>
                    {stageLeads.length === 0 ? (
                      <div className="h-20 border-2 border-dashed border-slate-200/50 rounded-2xl flex items-center justify-center opacity-20 italic text-[10px] uppercase font-bold text-center">No Leads</div>
                    ) : (
                      stageLeads.map(lead => (
                        <LeadCard 
                          key={lead.id} 
                          lead={lead} 
                          currentUser={user}
                          isAdmin={isAdmin}
                          teamMembers={teamMembers}
                          currencySymbol={currencySymbol} 
                          onWhatsApp={(e) => handleWhatsAppAction(e, lead)} 
                          onUniversalShare={(e) => handleUniversalShare(e, lead)}
                          onCall={(e) => handleCallAction(e, lead)}
                          onEdit={(e) => handleOpenEdit(e, lead)} 
                          onClick={() => handleOpenDetail(lead)} 
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeView === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
            {filteredLeadsList.length === 0 ? (
              <div className="col-span-full py-40 text-center opacity-30 italic text-sm font-black uppercase tracking-widest">No matching leads found.</div>
            ) : (
              filteredLeadsList.map(lead => (
                <LeadCard 
                  key={lead.id} 
                  lead={lead} 
                  currentUser={user}
                  isAdmin={isAdmin}
                  teamMembers={teamMembers}
                  currencySymbol={currencySymbol} 
                  onWhatsApp={(e) => handleWhatsAppAction(e, lead)} 
                  onUniversalShare={(e) => handleUniversalShare(e, lead)}
                  onCall={(e) => handleCallAction(e, lead)}
                  onEdit={(e) => handleOpenEdit(e, lead)} 
                  onClick={() => handleOpenDetail(lead)} 
                  showStage
                />
              ))
            )}
          </div>
        )}

        {activeView === 'list' && (
          <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border border-border/50">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10 border-b">
                    <TableHead className="text-[10px] font-black uppercase pl-8 h-12">Customer Identity</TableHead>
                    <TableHead className="text-[10px] font-black uppercase h-12">Requirement Profile</TableHead>
                    <TableHead className="text-[10px] font-black uppercase h-12 text-center">Current Stage</TableHead>
                    <TableHead className="text-right pr-8 h-12 w-48"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeadsList.map((lead: any) => {
                    const isOwner = lead.assignedAgentId === user?.uid;
                    const shouldMask = !isAdmin && !isOwner;
                    const displayName = shouldMask ? maskName(lead.name) : lead.name;
                    const displayPhone = shouldMask ? maskPhone(lead.phone) : lead.phone;

                    return (
                      <TableRow key={lead.id} className="group hover:bg-muted/5 transition-colors cursor-pointer border-b" onClick={() => handleOpenDetail(lead)}>
                        <TableCell className="pl-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-xs uppercase shadow-inner">
                              {displayName?.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-900 truncate group-hover:underline">{displayName}</p>
                              <p className="text-[10px] text-muted-foreground font-bold">{displayPhone}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-primary flex items-center gap-1.5"><Building className="h-3 w-3 opacity-40" /> {lead.propertyTypeInterest}</span>
                            <span className="text-[9px] font-black text-muted-foreground uppercase opacity-60 mt-0.5">Max Budget: {currencySymbol}{parseFloat(lead.budgetMax || 0).toLocaleString()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn("text-[8px] font-black uppercase h-4 px-1.5 border-none shadow-sm", STAGES.find(s => s.id === (lead.leadStage || 'new'))?.color || 'bg-slate-400')}>
                            {STAGES.find(s => s.id === (lead.leadStage || 'new'))?.label || 'New'}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-8 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-green-600 hover:bg-green-50" onClick={(e) => handleWhatsAppAction(e, lead)}><SmartphoneNfc className="h-4 w-4" /></Button>
                            {!shouldMask && <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-blue-600 hover:bg-blue-50" onClick={(e) => handleUniversalShare(e, lead)}><Share2 className="h-4 w-4" /></Button>}
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-primary hover:bg-primary/5" onClick={(e) => handleOpenEdit(e, lead)}><Edit2 className="h-4 w-4" /></Button>
                            {isAdmin && <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/5" onClick={(e) => openDeleteAlert(e, lead)}><Trash2 className="h-4 w-4" /></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col border-none shadow-2xl overflow-hidden bg-background">
          {selectedLead && (
            <>
              {(() => {
                const isOwner = selectedLead.assignedAgentId === user?.uid;
                const shouldMask = !isAdmin && !isOwner;
                const displayName = shouldMask ? maskName(selectedLead.name) : selectedLead.name;
                const displayPhone = shouldMask ? maskPhone(selectedLead.phone) : selectedLead.phone;

                return (
                  <>
                    <div className="p-8 bg-primary text-white shrink-0 relative">
                      <div className="absolute top-0 right-0 p-8 opacity-10"><Target className="h-40 w-40" /></div>
                      <div className="text-left space-y-6 relative z-10">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="bg-white/10 text-white border-white/20 uppercase text-[9px] font-black px-3 py-1 tracking-widest">ENQUIRY: {selectedLead.id.slice(-8).toUpperCase()}</Badge>
                          {!shouldMask && (
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20" onClick={(e) => handleUniversalShare(e, selectedLead)}><Share2 className="h-4 w-4 text-white" /></Button>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20" onClick={(e) => handleOpenEdit(e, selectedLead)}><Edit2 className="h-4 w-4 text-white" /></Button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="h-20 w-20 rounded-[1.5rem] bg-white flex items-center justify-center text-primary font-black text-3xl shrink-0 shadow-2xl">
                            {displayName?.charAt(0)}
                          </div>
                          <div className="space-y-1">
                            <h2 className="text-2xl font-black text-white">{displayName}</h2>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-white/20 text-white border-none font-black text-[9px] uppercase h-5 px-2">{STAGES.find(s => s.id === (selectedLead.leadStage || 'new'))?.label}</Badge>
                              <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">• Agent: {selectedLead.agentName || 'Owner'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <ScrollArea className="flex-1 p-8 scrollbar-hide">
                      <div className="space-y-10">
                        <section className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Smartphone className="h-4 w-4" /> Client Contact</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-muted/20 rounded-2xl border border-border/30">
                              <p className="text-[8px] font-bold text-muted-foreground uppercase">WhatsApp Number</p>
                              <p className="text-xs font-black text-slate-900 mt-1">{displayPhone}</p>
                            </div>
                            <div className="p-4 bg-muted/20 rounded-2xl border border-border/30">
                              <p className="text-[8px] font-bold text-muted-foreground uppercase">Social Profile</p>
                              <p className="text-xs font-black text-slate-900 mt-1">{selectedLead.category || 'General'}</p>
                            </div>
                          </div>
                        </section>

                        <Separator />

                        <section className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Calculator className="h-4 w-4" /> Interest Parameters</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 bg-primary/5 rounded-3xl border border-primary/20 space-y-1">
                              <p className="text-[8px] font-bold text-muted-foreground uppercase">Interest Tier</p>
                              <p className="text-lg font-black text-primary">{selectedLead.propertyTypeInterest}</p>
                              <p className="text-[7px] font-black text-primary/60 uppercase">{selectedLead.classification}</p>
                            </div>
                            <div className="p-5 bg-green-50 rounded-3xl border border-green-200 space-y-1">
                              <p className="text-[8px] font-bold text-muted-foreground uppercase">Max Budget</p>
                              <p className="text-lg font-black text-green-700">{currencySymbol}{parseFloat(selectedLead.budgetMax || 0).toLocaleString()}</p>
                              <p className="text-[7px] font-black text-green-600/60 uppercase">Min: {currencySymbol}{parseFloat(selectedLead.budgetMin || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        </section>

                        <section className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><LayoutList className="h-4 w-4" /> Technical Profile</h4>
                          <div className="grid grid-cols-3 gap-3">
                            {selectedLead.facing && <div className="p-3 bg-muted/10 rounded-xl text-center"><p className="text-[7px] font-bold text-muted-foreground uppercase mb-1">Facing</p><p className="text-[10px] font-black">{selectedLead.facing}</p></div>}
                            {selectedLead.roadType && <div className="p-3 bg-muted/10 rounded-xl text-center"><p className="text-[7px] font-bold text-muted-foreground uppercase mb-1">Road</p><p className="text-[10px] font-black">{selectedLead.roadType}</p></div>}
                            {selectedLead.area && <div className="p-3 bg-muted/10 rounded-xl text-center"><p className="text-[7px] font-bold text-muted-foreground uppercase mb-1">Area</p><p className="text-[10px] font-black">{selectedLead.area} {selectedLead.areaUnit}</p></div>}
                          </div>
                        </section>

                        {!shouldMask && selectedLead.notes && (
                          <section className="space-y-2">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Registry Remarks</p>
                            <div className="p-4 bg-muted/20 rounded-2xl border border-transparent italic">
                              <p className="text-sm text-slate-600 leading-relaxed">"{selectedLead.notes}"</p>
                            </div>
                          </section>
                        )}
                      </div>
                    </ScrollArea>

                    <div className="p-8 border-t bg-muted/20 flex gap-3 shrink-0">
                      <Button variant="outline" className="flex-1 h-14 bg-white font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-sm border-slate-200" onClick={() => setIsDrawerOpen(false)}>Close Registry</Button>
                      <Button className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white font-black shadow-xl uppercase tracking-widest text-[11px] gap-2 rounded-2xl" onClick={(e) => handleWhatsAppAction(e, selectedLead)}>
                        <SmartphoneNfc className="h-5 w-5" /> Execute Response
                      </Button>
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* EDIT MODAL */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[750px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl w-[95vw]">
          <DialogHeader className="p-8 bg-primary text-white">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20"><Edit2 className="h-6 w-6" /></div>
              <div>
                <DialogTitle className="text-xl font-black">Edit Customer Profile</DialogTitle>
                <p className="text-white/60 text-[9px] font-bold uppercase mt-1">Lead node modification</p>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] p-8">
            <div className="space-y-12">
              <section>
                <SectionHeader icon={User} title="1. Basic Customer Profile" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">Full Name *</Label><Input value={editFormData.name || ""} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className="h-11 rounded-xl font-bold bg-muted/20 border-none shadow-inner" /></div>
                  <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">WhatsApp *</Label><Input value={editFormData.phone || ""} onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})} className="h-11 rounded-xl bg-muted/20 border-none shadow-inner" /></div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-primary ml-1">Assigned Agent</Label>
                    <Select value={editFormData.agentName || ""} onValueChange={(v) => { const agent = teamMembers.find(m => m.name === v); setEditFormData({...editFormData, agentName: v, assignedAgentId: agent?.id || editFormData.assignedAgentId}); }}>
                      <SelectTrigger className="h-11 rounded-xl bg-white border-primary/20 shadow-sm font-black text-primary">
                        <SelectValue placeholder="Select Owner" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {teamMembers.map((m: any) => (
                          <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <section>
                <SectionHeader icon={Briefcase} title="2. Lifecycle Management" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Lifecycle Stage</Label>
                    <Select value={editFormData.leadStage || "new"} onValueChange={(v) => setEditFormData({...editFormData, leadStage: v})}>
                      <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none shadow-inner font-black"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {STAGES.map(s => <SelectItem key={s.id} value={s.id} className="text-xs font-bold">{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
            </div>
          </ScrollArea>
          <DialogFooter className="p-8 bg-muted/10 border-t"><Button className="w-full h-14 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl text-white" onClick={handleUpdateFullLead}>Commit Registry Updates</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8">
          <AlertDialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-xl font-black">Erase Lead Registry?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-slate-500 leading-relaxed">
              Are you sure you want to permanently remove <span className="font-bold text-slate-900">"{leadToDelete?.name}"</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex gap-3">
            <AlertDialogCancel asChild><Button variant="outline" className="flex-1 h-12 rounded-xl font-bold uppercase">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction asChild><Button onClick={confirmDelete} className="flex-1 h-12 rounded-xl font-black uppercase bg-destructive hover:bg-destructive/90 text-white border-none shadow-lg">Erase Now</Button></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LeadCard({ lead, currentUser, isAdmin, teamMembers, currencySymbol, onWhatsApp, onUniversalShare, onCall, onEdit, onClick, showStage = false }: any) {
  const stage = STAGES.find(s => s.id === (lead.leadStage || 'new'));
  const isOwner = lead.assignedAgentId === currentUser?.uid;
  const shouldMask = !isAdmin && !isOwner;

  const displayName = shouldMask ? maskName(lead.name) : lead.name;
  const displayPhone = shouldMask ? maskPhone(lead.phone) : lead.phone;
  
  return (
    <Card 
      className="border-none shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer bg-white group overflow-hidden rounded-[1.5rem] relative border-l-4 border-l-primary flex flex-col"
      onClick={onClick}
    >
      <CardContent className="p-5 space-y-4 flex-1 pb-2">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <h4 className="text-sm font-black text-slate-900 truncate tracking-tight leading-none mb-1">{displayName}</h4>
            <div className="flex items-center gap-1.5 opacity-60">
              <Phone className="h-2.5 w-2.5" />
              <p className="text-[9px] font-bold text-muted-foreground truncate">{displayPhone}</p>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {!shouldMask && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-lg text-blue-600 hover:bg-blue-50" 
                onClick={onUniversalShare}
                title="Universal Share Details"
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {!shouldMask && <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-primary hover:bg-primary/5" onClick={onEdit}><Edit2 className="h-3.5 w-3.5" /></Button>}
            {isAdmin && <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/5" onClick={(e) => onEdit(e)}><Trash2 className="h-3.5 w-3.5" /></Button>}
            {shouldMask && <Lock className="h-4 w-4 text-muted-foreground opacity-20 mr-1 mt-1" />}
          </div>
        </div>

        <div className="p-4 bg-muted/40 rounded-2xl space-y-3 shadow-inner border border-white/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[7px] font-black uppercase h-4 px-1.5 bg-white border-primary/10 text-primary">{lead.propertyTypeInterest}</Badge>
              {showStage && (
                <Badge className={cn("text-[7px] font-black uppercase h-4 px-1.5 border-none", stage?.color)}>
                  {stage?.label}
                </Badge>
              )}
            </div>
            <span className="text-[10px] font-black text-slate-900">{currencySymbol}{parseFloat(lead.budgetMax || 0).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[8px] font-bold text-muted-foreground uppercase truncate">
            <MapPin className="h-2.5 w-2.5 text-primary opacity-40" /> {lead.village || lead.location || 'Location Pending'}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[8px] font-black uppercase shadow-sm border border-primary/5" title={`Agent: ${lead.agentName || 'Owner'}`}>
              {(lead.agentName || 'O').charAt(0)}
            </div>
            <span className="text-[8px] font-black text-slate-500 uppercase truncate max-w-[80px]">{lead.agentName || 'Owner'}</span>
          </div>
          <span className="text-[8px] font-black text-slate-300 uppercase">{new Date(lead.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
        </div>
      </CardContent>

      <div className="grid grid-cols-2 border-t border-muted/50 bg-white">
        <Button 
          variant="ghost" 
          className="h-11 rounded-none border-r border-muted/50 text-[10px] font-black uppercase text-primary hover:bg-primary/5 gap-2"
          onClick={onCall}
        >
          <Phone className="h-3.5 w-3.5" /> Call {shouldMask ? 'Owner' : ''}
        </Button>
        <Button 
          variant="ghost" 
          className="h-11 rounded-none text-[10px] font-black uppercase text-green-600 hover:bg-green-50 gap-2"
          onClick={onWhatsApp}
        >
          <SmartphoneNfc className="h-3.5 w-3.5" /> WhatsApp {shouldMask ? 'Owner' : ''}
        </Button>
      </div>
    </Card>
  );
}
