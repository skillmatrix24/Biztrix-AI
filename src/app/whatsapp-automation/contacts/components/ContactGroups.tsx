"use client";

import { useState, useMemo } from "react";
import { 
  Plus, 
  Grid, 
  MoreVertical, 
  Trash2, 
  Edit2, 
  Star, 
  Zap, 
  Gift, 
  Sparkles, 
  Ticket, 
  Tag, 
  Gem, 
  ChevronRight,
  PlusCircle,
  X,
  Target,
  Layout
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const GROUP_ICONS = [
  { id: "Star", icon: Star },
  { id: "Zap", icon: Zap },
  { id: "Gift", icon: Gift },
  { id: "Flame", icon: Sparkles },
  { id: "Ticket", icon: Ticket },
  { id: "Tag", icon: Tag },
  { id: "Gem", icon: Gem },
  { id: "Target", icon: Target },
  { id: "Layout", icon: Layout }
];

export function ContactGroups({ businessId, contacts = [] }: any) {
  const firestore = useFirestore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupIcon, setNewGroupIcon] = useState("Star");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 1. Fetch Groups
  const groupsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'contactGroups'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  
  const { data: groupsRaw, isLoading } = useCollection<any>(groupsQuery);
  const groups = groupsRaw || [];

  const availableTags = useMemo(() => {
    const list = contacts || [];
    return Array.from(new Set(list.flatMap((c: any) => c.tags || [])));
  }, [contacts]);

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || !businessId) return;
    addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'contactGroups'), {
      name: newGroupName.trim(),
      icon: newGroupIcon,
      description: newGroupDesc,
      linkedTags: selectedTags,
      status: 'active',
      createdAt: serverTimestamp()
    });
    setIsAddOpen(false);
    resetForm();
    toast({ title: "Cluster Deployed", description: `Group "${newGroupName}" is now active.` });
  };

  const resetForm = () => {
    setNewGroupName(""); setNewGroupIcon("Star"); setNewGroupDesc(""); setSelectedTags([]);
  };

  const getGroupContactsCount = (group: any) => {
    if (!group.linkedTags || group.linkedTags.length === 0) return 0;
    const list = contacts || [];
    return list.filter((c: any) => 
      (c.tags || []).some((tag: string) => group.linkedTags.includes(tag))
    ).length;
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-1 text-left">
        <div className="space-y-1 text-left">
           <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-3"><Grid className="h-5 w-5" /> Smart Clusters</h3>
           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Group contacts by tags for targeted logic</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="h-10 px-8 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl">
           <PlusCircle className="mr-2 h-4 w-4" /> Create New Cluster
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {groups.length === 0 ? (
          <div className="col-span-full py-40 text-center border-2 border-dashed rounded-[3rem] opacity-30 italic uppercase text-[10px] font-black">
             <Grid className="h-12 w-12 mx-auto mb-4" />
             No contact clusters defined.
          </div>
        ) : (
          groups.map((g: any) => {
            const IconComp = GROUP_ICONS.find(i => i.id === g.icon)?.icon || Star;
            const count = getGroupContactsCount(g);
            return (
              <Card key={g.id} className={cn(
                "border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border group hover:shadow-xl transition-all flex flex-col h-full text-left",
                g.status === 'inactive' && "opacity-60 grayscale"
              )}>
                <CardHeader className="bg-muted/30 border-b py-6 px-8 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="h-12 w-12 rounded-2xl bg-white border shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform"><IconComp className="h-6 w-6" /></div>
                     <div className="text-left"><CardTitle className="text-sm font-black uppercase tracking-tight leading-none mb-1">{g.name}</CardTitle><p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{count} Active Nodes</p></div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-none shadow-2xl p-1.5">
                        <DropdownMenuItem className="text-[10px] font-bold uppercase p-2.5 rounded-lg cursor-pointer" onClick={() => deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'contactGroups', g.id))}><Trash2 className="mr-2 h-3.5 w-3.5" /> Erase Group</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="p-8 space-y-6 flex-1 text-left">
                   <p className="text-xs font-medium text-slate-600 leading-relaxed italic line-clamp-2">"{g.description || 'Targeted segment for campaign logic.'}"</p>
                   <div className="flex flex-wrap gap-1.5">
                      {(g.linkedTags || []).map((tag: string) => <Badge key={tag} variant="secondary" className="bg-primary/5 text-primary border-none text-[7px] font-black uppercase h-4 px-1.5">{tag}</Badge>)}
                   </div>
                </CardContent>
                <CardFooter className="p-6 bg-muted/10 border-t mt-auto">
                   <Button variant="ghost" className="w-full h-9 rounded-xl text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5">Launch Campaign <ChevronRight className="ml-1.5 h-3.5 w-3.5" /></Button>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden text-left w-[95vw]">
           <DialogHeader className="p-8 bg-slate-900 text-white">
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20"><Plus className="h-6 w-6 text-accent" /></div>
                 <div><DialogTitle className="text-xl font-bold uppercase">Define Cluster</DialogTitle><p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Smart Group Registry</p></div>
              </div>
           </DialogHeader>
           <div className="p-8 space-y-8">
              <div className="space-y-4">
                 <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Cluster Name</Label><Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g. VIP Diwali Targets" className="h-12 rounded-xl font-black text-lg bg-muted/20 border-none shadow-inner" /></div>
                 <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Select Identity Icon</Label><div className="flex flex-wrap gap-2">{GROUP_ICONS.map(i => <button key={i.id} onClick={() => setNewGroupIcon(i.id)} className={cn("h-10 w-10 rounded-xl border-2 flex items-center justify-center transition-all", newGroupIcon === i.id ? "bg-primary text-white border-primary shadow-lg" : "bg-white border-border/50 text-slate-400 hover:border-primary/20")}><i.icon className="h-5 w-5" /></button>)}</div></div>
                 <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Description</Label><Textarea value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder="Who is in this group?" className="min-h-[80px] rounded-xl bg-muted/20 border-none shadow-inner p-3 text-xs" /></div>
              </div>
              <Separator />
              <div className="space-y-4">
                 <Label className="text-[10px] font-black uppercase text-primary ml-1">Bind Smart Tags</Label>
                 <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                      <Badge key={tag} onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])} className={cn("h-8 px-4 rounded-xl cursor-pointer transition-all border-2 text-[9px] font-black uppercase", selectedTags.includes(tag) ? "bg-primary text-white border-primary" : "bg-white border-border/50 text-slate-500 hover:border-primary/20")}>{tag}</Badge>
                    ))}
                 </div>
              </div>
           </div>
           <DialogFooter className="p-8 bg-muted/10 border-t"><Button onClick={handleCreateGroup} disabled={!newGroupName} className="w-full h-14 bg-primary font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Deploy Cluster Node</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
