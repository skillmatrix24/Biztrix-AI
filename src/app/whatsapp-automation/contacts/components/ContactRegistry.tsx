"use client";

import { useState, useMemo } from "react";
import {
  Search,
  SmartphoneNfc,
  Edit2,
  Trash2,
  MapPin,
  Loader2,
  Zap,
  ShieldCheck,
  ChevronDown,
  FolderPlus,
  Grid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SectionCard, EmptyStatePanel } from "@/components/ui/editorial";
import { cn } from "@/lib/utils";
import {
  useFirestore,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  setDocumentNonBlocking,
  useCollection,
  useMemoFirebase,
} from "@/firebase";
import { collection, doc, serverTimestamp, query, orderBy, writeBatch } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { listWhatsAppTemplates, sendWhatsAppTemplate } from "@/app/actions/whatsapp-actions";
import { Users, Send } from "lucide-react";

function formatPhoneForMeta(phone: string): string {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) clean = clean.substring(1);
  if (clean.length === 10) return `91${clean}`;
  return clean;
}

export function ContactRegistry({ contacts = [], businessId, business }: any) {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [editingContact, setEditingContact] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);

  const [isGroupActionOpen, setIsGroupActionOpen] = useState(false);
  const [groupActionType, setGroupActionType] = useState<"create" | "add">("add");
  const [targetGroupName, setTargetGroupName] = useState("");
  const [targetGroupId, setTargetGroupId] = useState("");

  const groupsRawQuery = useMemoFirebase(
    () =>
      businessId
        ? query(collection(firestore, "businesses", businessId, "contactGroups"), orderBy("name", "asc"))
        : null,
    [firestore, businessId]
  );
  const { data: groupsRaw } = useCollection<any>(groupsRawQuery);
  const groups = groupsRaw || [];

  const filteredContacts = useMemo<any[]>(() => {
    const list = contacts || [];
    if (!searchTerm.trim()) return list;
    return list.filter(
      (c: any) =>
        (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone || "").includes(searchTerm)
    );
  }, [contacts, searchTerm]);

  const toggleSelectAll = () => {
    if (filteredContacts.length === 0) return;
    const allFilteredIds: string[] = filteredContacts.map((c: any) => c.id);
    const allSelectedInVisible = allFilteredIds.every((id: string) => selectedIds.includes(id));

    if (allSelectedInVisible) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleOpenEdit = (contact: any) => {
    const tagsStr = (contact.tags || []).join(", ");
    const groupsStr = (contact.groups || []).join(", ");
    setEditingContact({
      ...contact,
      tagsInput: tagsStr,
      groupsInput: groupsStr,
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

    const finalTags = (editingContact.tagsInput || "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
    const finalGroups = (editingContact.groupsInput || "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);

    const updateData = {
      name: editingContact.name,
      phone: newPhone,
      email: editingContact.email || "",
      city: editingContact.city || "",
      tags: finalTags,
      groups: finalGroups,
      updatedAt: serverTimestamp(),
    };

    if (oldId !== newPhone) {
      const newRef = doc(firestore, "businesses", businessId, "globalContacts", newPhone);
      setDocumentNonBlocking(
        newRef,
        { ...updateData, id: newPhone, createdAt: editingContact.createdAt || serverTimestamp() },
        { merge: true }
      );
      deleteDocumentNonBlocking(doc(firestore, "businesses", businessId, "globalContacts", oldId));
      toast({ title: "Contact Re-mapped" });
    } else {
      updateDocumentNonBlocking(doc(firestore, "businesses", businessId, "globalContacts", oldId), updateData);
      toast({ title: "Contact Updated" });
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
        const res = await listWhatsAppTemplates(businessId, { wabaId: waConfig.wabaId, accessToken: waConfig.accessToken });
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
      const template = templates.find((t) => t.name === selectedTemplateName);
      const lang = template?.language || "en_US";

      for (const id of selectedIds) {
        const contact = filteredContacts.find((c: any) => c.id === id);
        if (contact?.phone) {
          const targetPhone = formatPhoneForMeta(contact.phone);
          const trackUrl = `${window.location.origin}/loyalty/track/${businessId}/mem_c_${targetPhone.slice(-10)}`;

          const components = [
            {
              type: "body",
              parameters: [
                { type: "text", text: contact.name || "Customer" },
                { type: "text", text: contact.phone || "N/A" },
                { type: "text", text: trackUrl },
              ],
            },
          ];

          try {
            await sendWhatsAppTemplate(
              businessId,
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
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }

      toast({
        title: "Bulk Dispatch Complete",
        description: `Delivered: ${successCount}, Failed: ${failCount}.`,
      });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "System Error", description: "Dispatch loop failed." });
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

    if (groupActionType === "create") {
      if (!gName) return;
      const gid = gName.toLowerCase().replace(/\s+/g, "_");
      const groupRef = doc(firestore, "businesses", businessId, "contactGroups", gid);
      batch.set(
        groupRef,
        { id: gid, name: gName, icon: "Users", status: "active", createdAt: serverTimestamp() },
        { merge: true }
      );
    } else {
      if (!targetGroupId) return;
      const group = groups.find((g) => g.id === targetGroupId);
      if (!group) return;
      gName = group.name;
    }

    selectedIds.forEach((id) => {
      const cRef = doc(firestore, "businesses", businessId, "globalContacts", id);
      const contact = filteredContacts.find((c) => c.id === id);
      const currentGroups = contact?.groups || [];
      if (!currentGroups.includes(gName)) {
        batch.update(cRef, { groups: [...currentGroups, gName] });
      }
    });

    try {
      await batch.commit();
      toast({ title: "Registry Updated", description: `Group assigned to ${selectedIds.length} contacts.` });
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
    return filteredContacts.every((c) => selectedIds.includes(c.id));
  }, [filteredContacts, selectedIds]);

  return (
    <div className="space-y-5 relative pb-10 text-left">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 pl-9 rounded-xl bg-white border-slate-200 text-xs"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={selectedIds.length === 0}
                className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs gap-2"
              >
                <Zap className="h-4 w-4" />
                Actions {selectedIds.length > 0 && `(${selectedIds.length})`}
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl border-slate-200 p-1.5">
              <DropdownMenuLabel className="text-xs font-semibold text-slate-500 px-2 py-1.5">
                Bulk Actions
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={handleOpenBulkTemplate} className="p-2.5 rounded-lg cursor-pointer gap-2.5 text-xs font-medium">
                <SmartphoneNfc className="h-4 w-4 text-emerald-600" />
                Send Template
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setGroupActionType("add");
                  setIsGroupActionOpen(true);
                }}
                className="p-2.5 rounded-lg cursor-pointer gap-2.5 text-xs font-medium"
              >
                <Grid className="h-4 w-4 text-sky-600" />
                Assign Group
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setGroupActionType("create");
                  setIsGroupActionOpen(true);
                }}
                className="p-2.5 rounded-lg cursor-pointer gap-2.5 text-xs font-medium"
              >
                <FolderPlus className="h-4 w-4 text-amber-600" />
                Create Group
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  selectedIds.forEach((id) =>
                    deleteDocumentNonBlocking(doc(firestore, "businesses", businessId!, "globalContacts", id))
                  );
                  setSelectedIds([]);
                  toast({ title: "Selected Contacts Deleted" });
                }}
                className="p-2.5 rounded-lg cursor-pointer text-rose-600 focus:text-rose-600 gap-2.5 text-xs font-medium"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-slate-200 bg-white text-slate-700 font-mono text-xs tabular-nums">
            {filteredContacts.length} contacts
          </Badge>
          {selectedIds.length > 0 && (
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-xs tabular-nums">
              {selectedIds.length} selected
            </Badge>
          )}
        </div>
      </div>

      <SectionCard bodyClassName="p-0">
        {filteredContacts.length === 0 ? (
          <div className="p-6">
            <EmptyStatePanel
              icon={Users}
              title="No contacts found"
              description="Sync customers & loyalty members or upload a CSV to populate your audience registry."
            />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200">
                  <TableHead className="w-12 pl-5">
                    <Checkbox
                      aria-label="Select all contacts"
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                      className="data-[state=checked]:bg-slate-900"
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 h-11">Contact</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 h-11">Source</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 h-11">Location</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 h-11">Groups</TableHead>
                  <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-36">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((c: any) => {
                  const isSelected = selectedIds.includes(c.id);
                  return (
                    <TableRow
                      key={c.id}
                      className={cn(
                        "transition-colors border-b border-slate-100",
                        isSelected ? "bg-slate-50" : "hover:bg-slate-50/60"
                      )}
                    >
                      <TableCell className="pl-5">
                        <Checkbox
                          aria-label={`Select contact ${c.name || c.phone}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectOne(c.id)}
                          className="data-[state=checked]:bg-slate-900"
                        />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="flex items-center gap-3 text-left"
                        >
                          <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                            {c.name?.charAt(0) || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                            <p className="text-xs font-mono tabular-nums text-slate-500">{c.phone}</p>
                          </div>
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] font-medium capitalize",
                            c.source === "member"
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          )}
                        >
                          {c.source || "customer"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" /> {c.city || "Global"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          {(c.groups || []).slice(0, 2).map((g: string) => (
                            <Badge key={g} variant="secondary" className="bg-amber-50 text-amber-800 border border-amber-200 text-[11px]">
                              {g}
                            </Badge>
                          ))}
                          {(c.groups || []).length > 2 && (
                            <span className="text-[11px] font-mono text-slate-400">+{c.groups.length - 2}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1">
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            aria-label={`Message ${c.name || c.phone} on WhatsApp`}
                            className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-50"
                          >
                            <a
                              href={`https://wa.me/${formatPhoneForMeta(c.phone || "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <SmartphoneNfc className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${c.name || c.phone}`}
                            className="h-8 w-8 rounded-lg text-slate-600 hover:text-slate-900"
                            onClick={() => handleOpenEdit(c)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${c.name || c.phone}`}
                            className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50"
                            onClick={() =>
                              deleteDocumentNonBlocking(doc(firestore, "businesses", businessId!, "globalContacts", c.id))
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* Edit Contact Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl border border-slate-200 p-0 overflow-hidden text-left w-[95vw]">
          <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800 text-left shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                <Edit2 className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-base font-bold text-white">Edit Contact</DialogTitle>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Full Name</Label>
                <Input
                  value={editingContact?.name || ""}
                  onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">WhatsApp Number *</Label>
                <Input
                  value={editingContact?.phone || ""}
                  onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value.replace(/\D/g, "") })}
                  className="h-10 rounded-xl font-mono tabular-nums font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Email Address</Label>
                <Input
                  value={editingContact?.email || ""}
                  onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">City / Region</Label>
                <Input
                  value={editingContact?.city || ""}
                  onChange={(e) => setEditingContact({ ...editingContact, city: e.target.value })}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Tags (comma separated)</Label>
                <Input
                  value={editingContact?.tagsInput || ""}
                  onChange={(e) => setEditingContact({ ...editingContact, tagsInput: e.target.value })}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Groups (comma separated)</Label>
                <Input
                  value={editingContact?.groupsInput || ""}
                  onChange={(e) => setEditingContact({ ...editingContact, groupsInput: e.target.value })}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-100">
            <Button
              onClick={handleUpdateContact}
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Action Dialog */}
      <Dialog open={isGroupActionOpen} onOpenChange={setIsGroupActionOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl border border-slate-200 p-0 overflow-hidden text-left w-[95vw]">
          <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800 text-left shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                {groupActionType === "create" ? (
                  <FolderPlus className="h-5 w-5 text-white" />
                ) : (
                  <Grid className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">
                  {groupActionType === "create" ? "New Group" : "Assign to Group"}
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5 font-mono tabular-nums">
                  {selectedIds.length} contacts selected
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-4">
            {groupActionType === "create" ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Group Name</Label>
                <Input
                  value={targetGroupName || ""}
                  onChange={(e) => setTargetGroupName(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Select Group</Label>
                <Select value={targetGroupId} onValueChange={setTargetGroupId}>
                  <SelectTrigger className="h-10 rounded-xl bg-white text-xs font-medium">
                    <SelectValue placeholder="Choose destination group..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {groups.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No groups defined
                      </SelectItem>
                    ) : (
                      groups.map((g) => (
                        <SelectItem key={g.id} value={g.id} className="text-xs">
                          {g.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-100">
            <Button
              onClick={handleGroupAction}
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl"
            >
              Apply Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Template Dispatch Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl border border-slate-200 p-0 overflow-hidden text-left w-[95vw]">
          <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800 text-left shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                <Send className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">Bulk Template Dispatch</DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5 font-mono tabular-nums">
                  {selectedIds.length} recipients targeted
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-5">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Compliance Notice
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Select an approved Meta template. Customer name, phone, and portal link will map automatically.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Approved Template</Label>
              <Select value={selectedTemplateName} onValueChange={setSelectedTemplateName}>
                <SelectTrigger className="h-10 rounded-xl bg-white text-xs font-medium">
                  <SelectValue placeholder="Pick template..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {templates.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No templates synced
                    </SelectItem>
                  ) : (
                    templates.map((t) => (
                      <SelectItem key={t.name} value={t.name} className="text-xs font-mono">
                        {t.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {isTemplateLoading && (
                <div className="flex items-center gap-2 pt-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Loading Meta templates...</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-100">
            <Button
              onClick={handleSendBulkTemplates}
              disabled={isTemplateLoading || !selectedTemplateName}
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl"
            >
              Send Bulk Messages
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
