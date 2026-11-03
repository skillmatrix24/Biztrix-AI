
"use client";

import { useState, useMemo } from "react";
import { 
  Users, 
  Search, 
  ShieldCheck, 
  Loader2, 
  Building2, 
  Mail, 
  Phone, 
  ArrowUpRight,
  MoreVertical,
  Edit2, 
  Trash2, 
  UserCheck, 
  UserPlus,
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Filter, 
  UserCog, 
  Crown, 
  ChevronRight, 
  Gem, 
  Zap, 
  Bot, 
  Sparkles, 
  SmartphoneNfc, 
  Briefcase, 
  Layers, 
  ArrowRight, 
  Info, 
  Globe, 
  RefreshCcw, 
  CreditCard, 
  History, 
  Database, 
  Building, 
  Handshake,
  ShieldAlert,
  Plus,
  ShoppingBasket,
  BoxSelect,
  Save
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useFirestore, useCollection, useMemoFirebase, useUser, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useDoc } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Centralized Data Import from Marketplace Logic Hub
import { bundles, individuals } from "@/app/marketplace/data";

const rolesList = ["admin", "manager", "staff", "agent", "accountant"];

export default function GlobalUserManagementPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const isPlatformOwner = user?.email?.toLowerCase() === 'skillmatrix24@gmail.com'; 

  // Fetch All Users
  const usersQuery = useMemoFirebase(() => 
    isPlatformOwner ? collection(firestore, 'users') : null
  , [firestore, isPlatformOwner]);
  const { data: users, isLoading: usersLoading } = useCollection<any>(usersQuery);

  // Fetch All Businesses
  const businessesQuery = useMemoFirebase(() => 
    isPlatformOwner ? collection(firestore, 'businesses') : null
  , [firestore, isPlatformOwner]);
  const { data: businesses, isLoading: bizLoading } = useCollection<any>(businessesQuery);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOwner, setSelectedOwner] = useState<any>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // CRUD States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [userToProcess, setUserToProcess] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "admin",
    businessId: "",
    status: "active"
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    // Filter for only 'admin' role users globally
    const adminUsers = users.filter((u: any) => (u.role || '').toLowerCase() === 'admin');

    return adminUsers.filter(u => 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.businessId?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleOpenAdd = () => {
    setFormData({ name: "", email: "", role: "admin", businessId: "", status: "active" });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, u: any) => {
    e.stopPropagation();
    setUserToProcess(u);
    setFormData({
      name: u.name || "",
      email: u.email || "",
      role: u.role || "admin",
      businessId: u.businessId || "",
      status: u.status || "active"
    });
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (e: React.MouseEvent, u: any) => {
    e.stopPropagation();
    setUserToProcess(u);
    setIsDeleteAlertOpen(true);
  };

  const handleAddUser = () => {
    if (!formData.email || !formData.name) {
      toast({ variant: "destructive", title: "Missing Data", description: "Email and Name are required." });
      return;
    }
    const userId = `u_${Date.now()}`;
    const userRef = doc(firestore, 'users', userId);
    setDocumentNonBlocking(userRef, {
      ...formData,
      id: userId,
      createdAt: new Date().toISOString(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    setIsAddModalOpen(false);
    toast({ title: "User Added", description: "Identity node created globally." });
  };

  const handleUpdateUser = () => {
    if (!userToProcess) return;
    const userRef = doc(firestore, 'users', userToProcess.id);
    updateDocumentNonBlocking(userRef, {
      ...formData,
      updatedAt: serverTimestamp()
    });
    setIsEditModalOpen(false);
    toast({ title: "User Updated" });
  };

  const confirmDelete = () => {
    if (!userToProcess) return;
    if (userToProcess.id === user?.uid) {
      toast({ variant: "destructive", title: "Error", description: "You cannot delete your own session." });
      return;
    }
    const userRef = doc(firestore, 'users', userToProcess.id);
    deleteDocumentNonBlocking(userRef);
    setIsDeleteAlertOpen(false);
    toast({ title: "User Deleted", variant: "destructive" });
  };

  const handleInspect = (u: any) => {
    setSelectedOwner(u);
    const biz = businesses?.find((b: any) => b.id === u.businessId);
    setSelectedBusiness(biz || null);
    setIsDetailOpen(true);
  };

  const handleToggleModule = (moduleId: string) => {
    if (!selectedBusiness || !isPlatformOwner) return;
    
    const currentAddons = selectedBusiness.activeAddonIds || [];
    const isCurrentlyActive = currentAddons.includes(moduleId);
    
    const newAddons = isCurrentlyActive 
      ? currentAddons.filter((id: string) => id !== moduleId)
      : [...currentAddons, moduleId];

    const bizRef = doc(firestore, 'businesses', selectedBusiness.id);
    updateDocumentNonBlocking(bizRef, { 
      activeAddonIds: newAddons,
      updatedAt: serverTimestamp() 
    });
    
    setSelectedBusiness({ ...selectedBusiness, activeAddonIds: newAddons });
    toast({ title: isCurrentlyActive ? "Module Revoked" : "Module Activated" });
  };

  const handleUpdateBusinessStatus = (newStatus: string) => {
    if (!selectedBusiness || !isPlatformOwner) return;
    
    const bizRef = doc(firestore, 'businesses', selectedBusiness.id);
    updateDocumentNonBlocking(bizRef, { 
      status: newStatus,
      updatedAt: serverTimestamp() 
    });
    
    setSelectedBusiness({ ...selectedBusiness, status: newStatus });
    toast({ title: "Business Status Updated", description: `Tenant is now ${newStatus}.` });
  };

  if (!isPlatformOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <ShieldCheck className="h-12 w-12 mb-4 text-muted-foreground" />
        <p className="text-sm font-bold uppercase tracking-widest text-center px-4 text-slate-900">Authorized Master Node Access Only</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <UserCog className="h-6 w-6 text-primary" />
            </div>
            Global Identity Hub
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground uppercase font-black tracking-widest">Platform-wide User Registry</p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/90 h-11 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/10 text-white">
          <UserPlus className="mr-2 h-4 w-4" /> Add Global User
        </Button>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border border-border/50">
        <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-bold uppercase h-9 px-4">
              Super-Admin Mode • Business Owners List
            </Badge>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input 
              placeholder="Search by name, email or ID..." 
              className="pl-9 h-11 text-xs rounded-xl bg-white shadow-inner" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 border-b">
                <TableHead className="text-[10px] font-black uppercase pl-8 h-12">User Identity</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Business Link</TableHead>
                <TableHead className="text-[10px) font-black uppercase h-12 text-center">Status</TableHead>
                <TableHead className="text-right pr-8 h-12 w-48"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading ? (
                <TableRow><TableCell colSpan={4} className="h-40 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-40 text-center opacity-30 italic text-xs font-black uppercase tracking-widest">No matching Admin nodes found.</TableCell></TableRow>
              ) : filteredUsers.map((u: any) => {
                const business = businesses?.find((b: any) => b.id === u.businessId);
                return (
                  <TableRow key={u.id} className="group hover:bg-muted/5 transition-colors cursor-pointer border-b" onClick={() => handleInspect(u)}>
                    <TableCell className="pl-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-xs uppercase shadow-inner">
                          {u.name?.charAt(0) || u.email?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 truncate">{u.name || "N/A"}</p>
                          <p className="text-[10px] text-muted-foreground font-bold truncate">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-primary flex items-center gap-1.5 truncate">
                          <Building2 className="h-3 w-3 opacity-40" /> {business?.name || "No Business Link"}
                        </span>
                        <Badge variant="outline" className="w-fit text-[7px] font-black mt-1 border-primary/10 text-primary h-3.5 px-1 uppercase">{u.role}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn(
                        "text-[8px] font-black uppercase h-4 px-1.5 border-none",
                        u.status === 'suspended' ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                      )}>
                        {u.status || 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-primary" onClick={(e) => handleOpenEdit(e, u)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive" onClick={(e) => handleOpenDelete(e, u)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <ChevronRight className="h-4 w-4 ml-2 opacity-20" />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col border-none shadow-2xl overflow-hidden bg-background">
          {selectedOwner && (
            <>
              <SheetHeader className="p-8 bg-slate-900 text-white shrink-0 relative">
                <div className="absolute top-0 right-0 p-8 opacity-10"><UserCog className="h-40 w-40" /></div>
                <div className="text-left space-y-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-white/10 text-white border-white/20 uppercase text-[9px] font-black px-3 py-1 tracking-widest">IDENTITY: {selectedOwner.id.slice(-8).toUpperCase()}</Badge>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 border-none text-white" onClick={(e) => handleOpenEdit(e, selectedOwner)}><Edit2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="h-20 w-20 rounded-[1.5rem] bg-white flex items-center justify-center text-primary font-black text-3xl shrink-0 shadow-2xl">
                      {selectedOwner.name?.charAt(0)}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <SheetTitle className="text-2xl font-black text-white truncate">{selectedOwner.name}</SheetTitle>
                      <p className="text-accent text-[10px] font-bold uppercase tracking-widest">{selectedOwner.email}</p>
                    </div>
                  </div>
                </div>
              </SheetHeader>
              
              <ScrollArea className="flex-1 p-8 scrollbar-hide">
                <div className="space-y-10">
                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Building className="h-4 w-4" /> Linked Tenant & Payout Status</h4>
                    <div className="p-6 bg-muted/20 rounded-3xl border border-border/50 space-y-6">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Business Name</span>
                        <span className="text-sm font-bold text-slate-900">{selectedBusiness?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">Revenue Tier Status</span>
                          <p className="text-[8px] text-primary font-bold uppercase italic">Set status to 'Active' to lift Trial limits</p>
                        </div>
                        <Select value={selectedBusiness?.status || "trial"} onValueChange={handleUpdateBusinessStatus}>
                          <SelectTrigger className={cn(
                            "h-9 w-32 rounded-xl text-[10px] font-black uppercase border-none shadow-sm",
                            (selectedBusiness?.status || '').toLowerCase() === 'active' ? "bg-green-100 text-green-700" : "bg-orange-50 text-orange-600"
                          )}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-none shadow-2xl">
                            <SelectItem value="trial" className="text-[10px] font-bold uppercase">Trial Node</SelectItem>
                            <SelectItem value="active" className="text-[10px] font-bold uppercase text-green-600">Active Node</SelectItem>
                            <SelectItem value="pro" className="text-[10px] font-bold uppercase text-primary">Pro Node</SelectItem>
                            <SelectItem value="suspended" className="text-[10px] font-bold uppercase text-red-600">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </section>

                  {/* REVENUE BUNDLES (COMBOS) */}
                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <Gem className="h-4 w-4" /> Revenue Bundles (Combos)
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {bundles.map((module: any) => {
                        const isActive = selectedBusiness?.activeAddonIds?.includes(module.id);
                        return (
                          <div key={module.id} className={cn(
                            "p-5 rounded-3xl border-2 transition-all flex items-center justify-between group cursor-pointer",
                            isActive ? "border-primary bg-primary/5 shadow-inner" : "bg-white border-border/50 opacity-60"
                          )} onClick={() => handleToggleModule(module.id)}>
                            <div className="flex items-center gap-4">
                              <Checkbox checked={isActive} onCheckedChange={() => handleToggleModule(module.id)} className="data-[state=checked]:bg-primary" />
                              <div className="min-w-0">
                                <p className="text-sm font-black text-slate-900">{module.name}</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase leading-tight mt-1">{module.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-black text-primary">₹{module.price}</p>
                              <p className="text-[7px] font-bold uppercase opacity-40">Monthly</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* INDIVIDUAL ADD-ONS */}
                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <BoxSelect className="h-4 w-4" /> Individual Add-ons
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {individuals.map((module: any) => {
                        const isActive = selectedBusiness?.activeAddonIds?.includes(module.id);
                        return (
                          <div key={module.id} className={cn(
                            "p-4 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer",
                            isActive ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-white border-border/50 opacity-60"
                          )} onClick={() => handleToggleModule(module.id)}>
                            <div className="flex items-center gap-3">
                              <Checkbox checked={isActive} onCheckedChange={() => handleToggleModule(module.id)} className="data-[state=checked]:bg-primary" />
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold text-slate-900 truncate">{module.name}</p>
                                <p className="text-[8px] font-black text-primary uppercase">₹{module.price}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="space-y-4 pb-10">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Globe className="h-4 w-4" /> Global Meta</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/10 rounded-2xl border border-border/30">
                        <p className="text-[8px] font-bold text-muted-foreground uppercase">System Role</p>
                        <p className="text-xs font-black uppercase text-primary mt-1">{selectedOwner.role}</p>
                      </div>
                      <div className="p-4 bg-muted/10 rounded-2xl border border-border/30">
                        <p className="text-[8px] font-bold text-muted-foreground uppercase">Identity Status</p>
                        <p className="text-xs font-black uppercase text-slate-700 mt-1">{selectedOwner.status || 'Active'}</p>
                      </div>
                    </div>
                  </section>
                </div>
              </ScrollArea>

              <div className="p-8 border-t bg-muted/20 flex gap-3">
                <Button variant="outline" className="flex-1 h-14 bg-white font-black uppercase text-[10px] rounded-2xl shadow-sm" onClick={() => setIsDetailOpen(false)}>Close Inspector</Button>
                <Button className="flex-1 h-14 bg-primary font-black shadow-xl uppercase tracking-widest text-[10px] gap-2 rounded-2xl text-white" onClick={() => window.open(`mailto:${selectedOwner.email}`)}>
                  <Mail className="h-4 w-4" /> Official Email
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={(open) => { if(!open) { setIsAddModalOpen(false); setIsEditModalOpen(false); } }}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl w-[95vw]">
          <DialogHeader className="p-8 bg-primary text-white">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                {isEditModalOpen ? <Edit2 className="h-6 w-6" /> : <UserPlus className="h-6 w-6" />}
              </div>
              <div>
                <DialogTitle className="text-xl font-black">{isEditModalOpen ? 'Edit Global Identity' : 'Register Global Identity'}</DialogTitle>
                <DialogDescription className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-1">Cross-tenant profile management</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Full Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Email (Primary ID)</Label>
              <Input value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value.toLowerCase()})} disabled={isEditModalOpen} className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">System Role</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                  <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-2xl">
                    {rolesList.map(r => <SelectItem key={r} value={r} className="text-xs uppercase font-bold">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Node Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-2xl">
                    <SelectItem value="active" className="text-xs font-bold uppercase">Active</SelectItem>
                    <SelectItem value="suspended" className="text-xs font-bold uppercase text-red-600">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Manual Tenant Binding (ID)</Label>
              <Input value={formData.businessId} onChange={(e) => setFormData({...formData, businessId: e.target.value})} placeholder="e.g. biz_12345" className="h-12 rounded-xl font-mono text-xs bg-muted/20 border-none shadow-inner" />
            </div>
          </div>
          <DialogFooter className="p-8 bg-muted/10 border-t">
            <Button className="w-full h-14 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl text-white" onClick={isEditModalOpen ? handleUpdateUser : handleAddUser}>
              {isEditModalOpen ? 'Commit Update' : 'Initialize Identity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8">
          <AlertDialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-4">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-xl font-black">Erase Identity?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-slate-500 leading-relaxed">
              Are you sure you want to permanently delete <span className="font-bold text-slate-900">"{userToProcess?.name}"</span>? 
              This will only remove their Firestore node, not their Auth account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex gap-3">
            <AlertDialogCancel asChild><Button variant="outline" className="flex-1 h-12 rounded-xl font-bold uppercase">Keep Identity</Button></AlertDialogCancel>
            <AlertDialogAction asChild><Button onClick={confirmDelete} className="flex-1 h-12 rounded-xl font-black uppercase bg-destructive hover:bg-destructive/90 text-white border-none shadow-lg">Erase Now</Button></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
