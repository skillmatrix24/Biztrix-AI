
"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Search, 
  SmartphoneNfc, 
  Edit2, 
  Trash2, 
  MoreVertical, 
  Send, 
  MapPin, 
  ChevronRight,
  Loader2, 
  X, 
  CheckCircle2, 
  Tag, 
  Zap, 
  Trash, 
  ArrowRight, 
  ShieldCheck, 
  BadgeCheck, 
  ChevronDown, 
  FolderPlus, 
  Users, 
  Grid, 
  Settings2, 
  Download, 
  Plus,
  Type,
  FileText
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator, 
  DropdownMenuLabel 
} from "@/components/ui/dropdown-menu";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { 
  useFirestore, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking, 
  addDocumentNonBlocking, 
  setDocumentNonBlocking, 
  useCollection, 
  useMemoFirebase 
} from "@/firebase";
import { collection, doc, serverTimestamp, query, orderBy, writeBatch } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { listWhatsAppTemplates, sendWhatsAppTemplate } from "@/app/actions/whatsapp-actions";

/**
 * Helper to ensure phone number has international country code (91 for India)
 */
function formatPhoneForMeta(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) clean = clean.substring(1);
  if (clean.length === 10) return `91${clean}`;
  return clean;
}

export function ContactRegistry({ contacts = [], businessId, business }: any) {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Dialog States
  const [editingContact, setEditingContact] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);

  // Group Action States
  const [isGroupActionOpen, setIsGroupActionOpen] = useState(false);
  const [groupActionType, setGroupActionType] = useState<'create' | 'add'>('add');
  const [targetGroupName, setTargetGroupName] = useState("");
  const [targetGroupId, setTargetGroupId] = useState("");

  // Fetch Groups for "Add to Existing"
  const groupsRawQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'contactGroups'), orderBy('name', 'asc')) : null
  , [firestore, businessId]);
  const { data: groupsRaw } = useCollection<any>(groupsRawQuery);
  const groups = groupsRaw || [];

  const filteredContacts = useMemo(() => {
    const list = contacts || [];
    if (!searchTerm.trim()) return list;
    return list.filter((c: any) => 
      (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.phone || "").includes(searchTerm)
    );
  }, [contacts, searchTerm]);

  const toggleSelectAll = () => {
    if (filteredContacts.length === 0) return;
    const allFilteredIds = filteredContacts.map((c: any) => c.id);
    const allSelectedInVisible = allFilteredIds.every(id => selectedIds.includes(id));

    if (allSelectedInVisible) {
      setSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleOpenEdit = (contact: any) => {
    const tagsStr = (contact.tags || []).join(", ");
    const groupsStr = (contact.groups || []).join(", ");
    setEditingContact({ 
      ...contact,
      tagsInput: tagsStr,
      groupsInput: groupsStr
    });
    setIsEditOpen(true);
  };

  const handleUpdateContact = async () => {
    if (!businessId || !editingContact) return;
    const oldId = editingContact.id;
    const newPhone = editingContact.phone.trim();
    
    if (!newPhone) {
      toast({ variant: "destructive", title: "Error", description: "Phone number is required." });
      return;
    }

    const finalTags = (editingContact.tagsInput || "").split(',').map((s: string) => s.trim()).filter(Boolean);
    const finalGroups = (editingContact.groupsInput || "").split(',').map((s: string) => s.trim()).filter(Boolean);

    const updateData = {
      name: editingContact.name,
      phone: newPhone,
      email: editingContact.email || "",
      city: editingContact.city || "",
      tags: finalTags,
      groups: finalGroups,
      updatedAt: serverTimestamp()
    };

    if (oldId !== newPhone) {
      const newRef = doc(firestore, 'businesses', businessId, 'globalContacts', newPhone);
      setDocumentNonBlocking(newRef, { ...updateData, id: newPhone, createdAt: editingContact.createdAt || serverTimestamp() }, { merge: true });
      deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'globalContacts', oldId));
      toast({ title: "Identity Re-mapped" });
    } else {
      updateDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'globalContacts', oldId), updateData);
      toast({ title: "Node Updated" });
    }

    setIsEditOpen(false);
    setTimeout(() => {
      setEditingContact(null);
    }, 150);
  };

  const handleOpenBulkTemplate = async () => {
    const waConfig = business?.whatsappApiConfig;
    if (!waConfig?.isVerified) {
      toast({ variant: "destructive", title: "API Locked", description: "Meta connection is required." });
      return;
    }
    setIsTemplateDialogOpen(true);
    if (templates.length === 0) {
      setIsTemplateLoading(true);
      try {
        const res = await listWhatsAppTemplates({ wabaId: waConfig.wabaId, accessToken: waConfig.accessToken });
        if (res.success) setTemplates(res.templates || []);
      } finally {
        setIsTemplateLoading(false);
      }
    }
  };

  const handleSendBulkTemplates = async () => {
    const waConfig = business?.whatsappApiConfig;
    if (!waConfig?.isVerified || selectedIds.length === 0 || !selectedTemplateName) return;

    setIsTemplateLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const template = templates.find(t => t.name === selectedTemplateName);
      const lang = template?.language || "en_US";

      for (const id of selectedIds) {
        const contact = filteredContacts.find((c: any) => c.id === id);
        if (contact?.phone) {
          const targetPhone = formatPhoneForMeta(contact.phone);
          const trackUrl = `${window.location.origin}/loyalty/track/${businessId}/mem_c_${targetPhone.slice(-10)}`;
          
          const components = [{
            type: "body",
            parameters: [
              { type: "text", text: contact.name || "Customer" },
              { type: "text", text: contact.phone || "N/A" },
              { type: "text", text: trackUrl }
            ]
          }];

          try {
            await sendWhatsAppTemplate(
              { phoneId: waConfig.phoneId, accessToken: waConfig.accessToken },
              targetPhone,
              selectedTemplateName,
              lang,
              components
            );
            successCount++;
          } catch (e) {
            failCount++;
            console.error(`Dispatch failed for ${id}`, e);
          }
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }

      toast({ 
        title: "Bulk Dispatch Complete", 
        description: `Delivered: ${successCount}, Failed: ${failCount}.` 
      });
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "System Error", description: "Internal dispatch loop crashed." });
    } finally {
      setIsTemplateLoading(false);
      setIsTemplateDialogOpen(false);
      setTimeout(() => {
        setSelectedIds([]);
        setSelectedTemplateName("");
      }, 150);
    }
  };

  const handleGroupAction = async () => {
    if (!businessId || selectedIds.length === 0) return;

    const batch = writeBatch(firestore);
    let gName = targetGroupName.trim();

    if (groupActionType === 'create') {
      if (!gName) return;
      const gid = gName.toLowerCase().replace(/\s+/g, '_');
      const groupRef = doc(firestore, 'businesses', businessId, 'contactGroups', gid);
      batch.set(groupRef, { id: gid, name: gName, icon: 'Users', status: 'active', createdAt: serverTimestamp() }, { merge: true });
    } else {
      if (!targetGroupId) return;
      const group = groups.find(g => g.id === targetGroupId);
      if (!group) return;
      gName = group.name;
    }

    selectedIds.forEach(id => {
      const cRef = doc(firestore, 'businesses', businessId, 'globalContacts', id);
      const contact = filteredContacts.find(c => c.id === id);
      const currentGroups = contact?.groups || [];
      if (!currentGroups.includes(gName)) {
        batch.update(cRef, { groups: [...currentGroups, gName] });
      }
    });

    try {
      await batch.commit();
      toast({ title: "Registry Updated", description: `Group mapping applied to ${selectedIds.length} nodes.` });
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Update Failed" });
    }

    setIsGroupActionOpen(false);
    setTimeout(() => {
      setSelectedIds([]);
      setTargetGroupName("");
      setTargetGroupId("");
    }, 150);
  };

  const isAllSelected = useMemo(() => {
    if (filteredContacts.length === 0) return false;
    return filteredContacts.every(c => selectedIds.includes(c.id));
  }, [filteredContacts, selectedIds]);

  return (
    <div className="space-y-6 relative pb-10 text-left">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between px-1">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input placeholder="Search name or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 pl-10 rounded-xl bg-white border-none shadow-inner text-xs font-bold w-full" />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={selectedIds.length === 0} className="h-11 px-6 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl gap-2 transition-all">
                <Zap className={cn("h-4 w-4", selectedIds.length > 0 && "fill-current")} />
                Actions {selectedIds.length > 0 && `(${selectedIds.length})`}
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl border-none shadow-2xl p-2 animate-in slide-in-from-top-2">
              <DropdownMenuLabel className="text-[8px] font-black uppercase tracking-widest p-2 opacity-40">Bulk Logic</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleOpenBulkTemplate} className="p-3 rounded-xl cursor-pointer hover:bg-primary/5 gap-3">
                <SmartphoneNfc className="h-4 w-4 text-green-600" />
                <span className="text-[10px] font-black uppercase">Send Template</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setGroupActionType('add'); setIsGroupActionOpen(true); }} className="p-3 rounded-xl cursor-pointer hover:bg-primary/5 gap-3">
                <Grid className="h-4 w-4 text-blue-600" />
                <span className="text-[10px] font-black uppercase">Assign Group</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setGroupActionType('create'); setIsGroupActionOpen(true); }} className="p-3 rounded-xl cursor-pointer hover:bg-primary/5 gap-3">
                <FolderPlus className="h-4 w-4 text-orange-600" />
                <span className="text-[10px] font-black uppercase">Create Group</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { selectedIds.forEach(id => deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId!, 'globalContacts', id))); setSelectedIds([]); toast({title:"Nodes Erased"}); }} className="p-3 rounded-xl cursor-pointer text-destructive hover:bg-destructive/5 gap-3 focus:text-destructive">
                <Trash2 className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase">Erase Selection</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-3">
           <Badge variant="outline" className="h-6 border-primary/20 text-primary font-black uppercase text-[8px] px-3">{filteredContacts.length} Nodes</Badge>
           {selectedIds.length > 0 && <Badge className="bg-green-500 text-white border-none text-[8px] font-black h-6 px-3 uppercase animate-in zoom-in">{selectedIds.length} Picked</Badge>}
        </div>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-muted/10 border-b">
                <TableHead className="w-12 pl-6">
                  <Checkbox checked={isAllSelected} onCheckedChange={toggleSelectAll} className="data-[state=checked]:bg-primary" />
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Identity</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Source</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Location</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Clusters</TableHead>
                <TableHead className="text-right pr-8 h-12 w-48"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-60 text-center opacity-30 italic text-sm font-black uppercase">Registry is clear.</TableCell></TableRow>
              ) : filteredContacts.map((c: any) => {
                const isSelected = selectedIds.includes(c.id);
                return (
                  <TableRow key={c.id} className={cn("group transition-colors border-b cursor-pointer", isSelected ? "bg-primary/5" : "hover:bg-muted/5")}>
                    <TableCell className="pl-6" onClick={(e) => { e.stopPropagation(); toggleSelectOne(c.id); }}>
                      <Checkbox 
                        checked={isSelected} 
                        className="data-[state=checked]:bg-primary pointer-events-none" 
                      />
                    </TableCell>
                    <TableCell className="py-5" onClick={() => handleOpenEdit(c)}>
                      <div className="flex items-center gap-4 text-left">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-xs shrink-0">{c.name?.charAt(0)}</div>
                        <div className="min-w-0 text-left">
                          <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{c.name}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{c.phone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => handleOpenEdit(c)}>
                      <Badge variant="outline" className={cn("text-[8px] font-black uppercase h-4 px-1.5 border-none shadow-sm", c.source === 'member' ? "bg-primary text-white" : "bg-muted text-slate-600")}>{c.source || 'customer'}</Badge>
                    </TableCell>
                    <TableCell onClick={() => handleOpenEdit(c)}><div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase"><MapPin className="h-3 w-3 opacity-30" /> {c.city || 'Global'}</div></TableCell>
                    <TableCell onClick={() => handleOpenEdit(c)}>
                      <div className="flex gap-1">
                        {(c.groups || []).slice(0, 2).map((g: string) => <Badge key={g} variant="secondary" className="bg-orange-50 text-orange-600 border-none text-[7px] font-black uppercase h-4 px-1.5">{g}</Badge>)}
                        {(c.groups || []).length > 2 && <span className="text-[7px] font-black opacity-30">+{c.groups.length - 2}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-green-600" onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${formatPhoneForMeta(c.phone)}`); }}><SmartphoneNfc className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-primary" onClick={(e) => { e.stopPropagation(); handleOpenEdit(c); }}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive" onClick={(e) => { e.stopPropagation(); deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId!, 'globalContacts', c.id)); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit Identity Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden text-left w-[95vw]">
          <DialogHeader className="p-8 bg-primary text-white text-left shrink-0">
             <div className="flex items-center gap-4 text-left">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><Edit2 className="h-6 w-6 text-white" /></div>
                <DialogTitle className="text-xl font-black uppercase">Modify Identity Node</DialogTitle>
             </div>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Full Name</Label><Input value={editingContact?.name || ""} onChange={(e) => setEditingContact({...editingContact, name: e.target.value})} className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold" /></div>
                <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">WhatsApp Identity *</Label><Input value={editingContact?.phone || ""} onChange={(e) => setEditingContact({...editingContact, phone: e.target.value.replace(/\D/g, '')})} className="h-11 rounded-xl bg-primary/5 border-none shadow-inner font-black text-lg text-primary" /></div>
                <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Email Address</Label><Input value={editingContact?.email || ""} onChange={(e) => setEditingContact({...editingContact, email: e.target.value})} className="h-11 rounded-xl bg-muted/20 border-none" /></div>
                <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">City / Region</Label><Input value={editingContact?.city || ""} onChange={(e) => setEditingContact({...editingContact, city: e.target.value})} className="h-11 rounded-xl bg-muted/20 border-none" /></div>
                <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase text-primary ml-1">Smart Tags (Comma Separated)</Label><Input value={editingContact?.tagsInput || ""} onChange={(e) => setEditingContact({...editingContact, tagsInput: e.target.value})} className="h-11 rounded-xl bg-primary/5 border-none font-bold" /></div>
                <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase text-orange-600 ml-1">Group Clusters (Comma Separated)</Label><Input value={editingContact?.groupsInput || ""} onChange={(e) => setEditingContact({...editingContact, groupsInput: e.target.value})} className="h-11 rounded-xl bg-orange-50 border-none font-bold" /></div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-8 bg-muted/10 border-t"><Button onClick={handleUpdateContact} className="w-full h-14 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">Commit Updates</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Action Dialog */}
      <Dialog open={isGroupActionOpen} onOpenChange={setIsGroupActionOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2.5rem border-none shadow-2xl p-0 overflow-hidden text-left w-[95vw]">
           <DialogHeader className="p-8 bg-slate-900 text-white text-left shrink-0">
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                    {groupActionType === 'create' ? <FolderPlus className="h-6 w-6 text-accent" /> : <Grid className="h-6 w-6 text-accent" />}
                 </div>
                 <div>
                    <DialogTitle className="text-xl font-bold uppercase">{groupActionType === 'create' ? 'New Cluster' : 'Assign to Group'}</DialogTitle>
                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">{selectedIds.length} Nodes Selected</p>
                 </div>
              </div>
           </DialogHeader>
           <div className="p-8 space-y-8">
              {groupActionType === 'create' ? (
                <div className="space-y-3 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Group Name</Label><Input value={targetGroupName} onChange={(e) => setTargetGroupName(e.target.value)} className="h-12 rounded-xl font-black text-lg bg-muted/20 border-none" /></div>
              ) : (
                <div className="space-y-3 text-left">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Select Group</Label>
                   <Select value={targetGroupId} onValueChange={setTargetGroupId}>
                      <SelectTrigger className="h-12 rounded-xl border-none bg-muted/20 shadow-inner font-bold"><SelectValue placeholder="Pick Destination..." /></SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-2xl">
                        {groups.length === 0 ? <SelectItem value="none" disabled>No groups defined</SelectItem> : groups.map(g => <SelectItem key={g.id} value={g.id} className="text-[10px] font-bold uppercase">{g.name}</SelectItem>)}
                      </SelectContent>
                   </Select>
                </div>
              )}
           </div>
           <DialogFooter className="p-8 bg-muted/10 border-t"><Button onClick={handleGroupAction} className="w-full h-14 bg-primary font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Execute Mapping</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dispatch Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden text-left w-[95vw]">
          <DialogHeader className="p-8 bg-slate-900 text-white text-left shrink-0">
            <div className="flex items-center gap-4 text-left">
               <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20"><Send className="h-6 w-6 text-accent" /></div>
               <div>
                  <DialogTitle className="text-xl font-black uppercase tracking-tight">Bulk Meta Dispatch</DialogTitle>
                  <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">{selectedIds.length} Recipient Nodes Targeted</p>
               </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-8">
             <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                   <ShieldCheck className="h-5 w-5 text-primary" />
                   <p className="text-[10px] font-black uppercase text-primary">Compliance Protocol</p>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed italic">"Select an approved template. System will automatically map recipient names before dispatch."</p>
             </div>
             <div className="space-y-3 text-left">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Pick Approved Template</Label>
                <Select value={selectedTemplateName} onValueChange={setSelectedTemplateName}>
                   <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none shadow-inner font-black text-xs uppercase"><SelectValue placeholder="Pick Meta Node..." /></SelectTrigger>
                   <SelectContent className="rounded-xl border-none shadow-2xl">
                      {templates.length === 0 ? <SelectItem value="none" disabled>No templates synced</SelectItem> : templates.map(t => <SelectItem key={t.name} value={t.name} className="text-[10px] font-bold uppercase">{t.name}</SelectItem>)}
                   </SelectContent>
                </Select>
                {isTemplateLoading && <div className="flex items-center gap-2 mt-4 ml-1 animate-pulse"><Loader2 className="h-3 w-3 animate-spin text-primary" /><span className="text-[8px] font-bold text-primary uppercase">Synchronizing Meta Cloud...</span></div>}
             </div>
          </div>
          <DialogFooter className="p-8 bg-muted/10 border-t">
            <Button onClick={handleSendBulkTemplates} disabled={isTemplateLoading || !selectedTemplateName} className="w-full h-14 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl text-white">
               Start Bulk Transmission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
