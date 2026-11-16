"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Grid,
  MoreVertical,
  Trash2,
  Star,
  Zap,
  Gift,
  Sparkles,
  Ticket,
  Tag,
  Gem,
  ChevronRight,
  PlusCircle,
  Target,
  Layout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { EmptyStatePanel } from "@/components/ui/editorial";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase";
import { collection, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";

const GROUP_ICONS = [
  { id: "Star", icon: Star },
  { id: "Zap", icon: Zap },
  { id: "Gift", icon: Gift },
  { id: "Flame", icon: Sparkles },
  { id: "Ticket", icon: Ticket },
  { id: "Tag", icon: Tag },
  { id: "Gem", icon: Gem },
  { id: "Target", icon: Target },
  { id: "Layout", icon: Layout },
];

export function ContactGroups({ businessId, contacts = [] }: any) {
  const firestore = useFirestore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupIcon, setNewGroupIcon] = useState("Star");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const groupsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(collection(firestore, "businesses", businessId, "contactGroups"), orderBy("createdAt", "desc"))
        : null,
    [firestore, businessId]
  );

  const { data: groupsRaw } = useCollection<any>(groupsQuery);
  const groups = groupsRaw || [];

  const availableTags = useMemo<string[]>(() => {
    const list = contacts || [];
    return Array.from(new Set(list.flatMap((c: any) => (c.tags || []) as string[])));
  }, [contacts]);

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || !businessId) return;
    addDocumentNonBlocking(collection(firestore, "businesses", businessId, "contactGroups"), {
      name: newGroupName.trim(),
      icon: newGroupIcon,
      description: newGroupDesc,
      linkedTags: selectedTags,
      status: "active",
      createdAt: serverTimestamp(),
    });
    setIsAddOpen(false);
    resetForm();
    toast({ title: "Group Created", description: `Audience group "${newGroupName}" is now active.` });
  };

  const resetForm = () => {
    setNewGroupName("");
    setNewGroupIcon("Star");
    setNewGroupDesc("");
    setSelectedTags([]);
  };

  const getGroupContactsCount = (group: any) => {
    if (!group.linkedTags || group.linkedTags.length === 0) return 0;
    const list = contacts || [];
    return list.filter((c: any) => (c.tags || []).some((tag: string) => group.linkedTags.includes(tag))).length;
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Grid className="h-4 w-4 text-slate-700" /> Audience Groups
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Segment contacts by tags for targeted WhatsApp campaigns.</p>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Create Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <EmptyStatePanel
          icon={Grid}
          title="No audience groups defined"
          description="Create a contact group to target specific tags during broadcast campaigns."
          action={
            <Button
              onClick={() => setIsAddOpen(true)}
              className="h-9 px-4 rounded-xl bg-slate-900 text-white font-semibold text-xs"
            >
              Create First Group
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((g: any) => {
            const IconComp = GROUP_ICONS.find((i) => i.id === g.icon)?.icon || Star;
            const count = getGroupContactsCount(g);
            return (
              <div
                key={g.id}
                className={cn(
                  "rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col h-full text-left",
                  g.status === "inactive" && "opacity-65"
                )}
              >
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                      <IconComp className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{g.name}</h4>
                      <p className="text-xs font-mono tabular-nums text-slate-500">{count} contacts</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Actions for group ${g.name}`} className="h-8 w-8 rounded-lg">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-slate-200 p-1">
                      <DropdownMenuItem
                        className="text-xs font-medium p-2 rounded-lg cursor-pointer text-rose-600 focus:text-rose-600"
                        onClick={() => deleteDocumentNonBlocking(doc(firestore, "businesses", businessId, "contactGroups", g.id))}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Group
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="p-5 space-y-3 flex-1">
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {g.description || "Targeted audience segment for campaign broadcasts."}
                  </p>
                  {(g.linkedTags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(g.linkedTags || []).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 mt-auto">
                  <Button asChild variant="ghost" className="w-full h-9 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-100">
                    <Link href="/whatsapp-automation/campaigns">
                      Launch Campaign <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl border border-slate-200 p-0 overflow-hidden text-left w-[95vw]">
          <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">Create Audience Group</DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  Organize contacts by tags for quick campaign selection.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="group-name" className="text-xs font-semibold text-slate-700">Group Name</Label>
              <Input
                id="group-name"
                value={newGroupName || ""}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. VIP Diwali Buyers"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Icon</Label>
              <div className="flex flex-wrap gap-2">
                {GROUP_ICONS.map((i) => (
                  <button
                    type="button"
                    key={i.id}
                    aria-label={`Select icon ${i.id}`}
                    aria-pressed={newGroupIcon === i.id}
                    onClick={() => setNewGroupIcon(i.id)}
                    className={cn(
                      "h-10 w-10 rounded-xl border flex items-center justify-center transition-colors",
                      newGroupIcon === i.id
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-400"
                    )}
                  >
                    <i.icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="group-desc" className="text-xs font-semibold text-slate-700">Description</Label>
              <Textarea
                id="group-desc"
                value={newGroupDesc || ""}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="Who belongs in this group?"
                className="min-h-[80px] rounded-xl text-xs"
              />
            </div>
            {availableTags.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Link Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => {
                      const active = selectedTags.includes(tag);
                      return (
                        <button
                          type="button"
                          key={tag}
                          aria-pressed={active}
                          onClick={() =>
                            setSelectedTags((prev) =>
                              prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                            )
                          }
                          className={cn(
                            "h-8 px-3 rounded-lg border text-xs font-medium transition-colors",
                            active
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                          )}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-100">
            <Button
              onClick={handleCreateGroup}
              disabled={!newGroupName}
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl"
            >
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
