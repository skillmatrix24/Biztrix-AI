"use client";

import { useState, useMemo } from "react";
import { Plus, Zap, Sparkles, Loader2, Check, X, Search, Merge, Edit2, Save, Trash2, ChevronDown, SmartphoneNfc, UserPlus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { suggestProjectTasks } from "@/ai/flows/suggest-project-tasks";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

interface AddProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  customersList: any[];
  leadsList: any[];
  businessUsers: any[];
}

interface TempTask {
  id: string;
  title: string;
  description: string;
  section: string;
  priority: 'high' | 'medium' | 'low';
}

export function AddProjectDialog({ 
  isOpen, 
  onOpenChange, 
  onSubmit, 
  customersList, 
  leadsList, 
  businessUsers 
}: AddProjectDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    clientType: "customer" as 'customer' | 'lead',
    clientId: "",
    deadline: "",
    team: [] as string[]
  });

  const [deepResearch, setDeepResearch] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState<TempTask[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [whatsAppSync, setWhatsAppSync] = useState(true);

  const handleSuggestTasks = async () => {
    if (!formData.title.trim()) {
      toast({ variant: "destructive", title: "Project Name Required", description: "Please enter a project name first." });
      return;
    }
    setIsAiLoading(true);
    try {
      const result = await suggestProjectTasks({ 
        title: formData.title, 
        description: formData.description,
        deepResearch
      });
      const tasksWithIds = result.tasks.map(t => ({ ...t, id: Math.random().toString(36).substr(2, 9) }));
      setSuggestedTasks(tasksWithIds);
      setSelectedTaskIds(tasksWithIds.map(t => t.id));
      toast({ title: "Tasks Generated", description: `AI suggested ${result.tasks.length} tasks.` });
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "AI Error", description: "Could not generate suggestions." });
    } finally {
      setIsAiLoading(false);
    }
  };

  const toggleTask = (id: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTaskIds.length === suggestedTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(suggestedTasks.map(t => t.id));
    }
  };

  const handleMergeSelected = () => {
    if (selectedTaskIds.length < 2) return;

    const tasksToMerge = suggestedTasks.filter(t => selectedTaskIds.includes(t.id));
    const mergedTask: TempTask = {
      id: Math.random().toString(36).substr(2, 9),
      title: "Merged: " + tasksToMerge[0].title,
      description: tasksToMerge.map(t => `• ${t.title}: ${t.description}`).join('\n'),
      section: tasksToMerge[0].section,
      priority: tasksToMerge.some(t => t.priority === 'high') ? 'high' : 'medium'
    };

    const remainingTasks = suggestedTasks.filter(t => !selectedTaskIds.includes(t.id));
    setSuggestedTasks([...remainingTasks, mergedTask]);
    setSelectedTaskIds([mergedTask.id]);
    setEditingTaskId(mergedTask.id);
    toast({ title: "Tasks Merged" });
  };

  const handleUpdateTask = (id: string, updates: Partial<TempTask>) => {
    setSuggestedTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const removeTask = (id: string) => {
    setSuggestedTasks(prev => prev.filter(t => t.id !== id));
    setSelectedTaskIds(prev => prev.filter(i => i !== id));
  };

  const handleSubmit = () => {
    const finalTasks = suggestedTasks
      .filter(t => selectedTaskIds.includes(t.id))
      .map(t => ({ 
        ...t, 
        dueDate: formData.deadline || new Date().toISOString().split('T')[0],
        remindWhatsApp: whatsAppSync
      }));
    
    onSubmit({ ...formData, initialTasks: finalTasks });
    setFormData({ title: "", description: "", clientType: "customer", clientId: "", deadline: "", team: [] });
    setSuggestedTasks([]);
    setSelectedTaskIds([]);
    setDeepResearch(false);
  };

  const isFormValid = useMemo(() => {
    return formData.title.trim().length > 0 && 
           formData.clientId.length > 0 && 
           formData.deadline.length > 0 &&
           formData.team.length > 0;
  }, [formData]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, TempTask[]> = {};
    suggestedTasks.forEach(t => {
      const sec = t.section || "General";
      if (!groups[sec]) groups[sec] = [];
      groups[sec].push(t);
    });
    return groups;
  }, [suggestedTasks]);

  const activeClientList = useMemo(() => {
    return formData.clientType === 'customer' ? (customersList || []) : (leadsList || []);
  }, [formData.clientType, customersList, leadsList]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-xl h-10 px-6 font-bold uppercase text-[10px] tracking-widest rounded-xl">
          <Plus className="mr-2 h-4 w-4" /> New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden w-[95vw] sm:w-full">
        <DialogHeader className="p-6 sm:p-8 bg-primary text-white">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
              <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl">Launch New Project</DialogTitle>
              <DialogDescription className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Plan execution with AI</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="p-6 sm:p-8 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Project Name *</Label>
                <Input 
                  placeholder="e.g. Office Renovation" 
                  value={formData.title} 
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                  className="h-11 rounded-xl text-sm font-bold" 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Description</Label>
                <Textarea 
                  placeholder="Details for AI context..." 
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                  className="min-h-[80px] rounded-xl bg-muted/20 border-none shadow-inner p-4 text-xs" 
                />
              </div>
            </div>

            {/* AI Task Generator Area */}
            <div className="p-1 rounded-2xl bg-muted/30 border border-border/50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-2">
                  <Switch 
                    id="deep-research" 
                    checked={deepResearch} 
                    onCheckedChange={setDeepResearch} 
                    className="data-[state=checked]:bg-primary scale-75"
                  />
                  <Label htmlFor="deep-research" className="text-[10px] font-bold uppercase cursor-pointer">Deep Research</Label>
                </div>
                <Button 
                  type="button"
                  disabled={isAiLoading || !formData.title.trim()}
                  onClick={handleSuggestTasks}
                  className="h-9 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold uppercase text-[9px] tracking-widest shadow-lg w-full sm:w-auto"
                >
                  {isAiLoading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                  Generate Tasks
                </Button>
              </div>

              {suggestedTasks.length > 0 && (
                <div className="p-4 pt-0 space-y-4 animate-in fade-in slide-in-from-top-2">
                  <Separator className="bg-border/50" />
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <Sparkles className="h-3 w-3 fill-primary" /> AI Suggestions
                    </h4>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-[9px] font-bold uppercase" onClick={toggleSelectAll}>Toggle All</Button>
                      {selectedTaskIds.length >= 2 && <Button variant="secondary" size="sm" onClick={handleMergeSelected} className="h-7 text-[9px] font-bold uppercase bg-orange-100 text-orange-700">Merge</Button>}
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                    {Object.entries(groupedTasks).map(([section, tasks]) => (
                      <div key={section} className="space-y-2">
                        <span className="text-[8px] font-black uppercase text-muted-foreground px-1">{section}</span>
                        <div className="space-y-2">
                          {tasks.map((task) => (
                            <div 
                              key={task.id} 
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-xl border transition-all",
                                selectedTaskIds.includes(task.id) ? "bg-white border-primary/30" : "bg-white/50 opacity-60"
                              )}
                            >
                              <Checkbox checked={selectedTaskIds.includes(task.id)} onCheckedChange={() => toggleTask(task.id)} className="mt-1" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-primary truncate">{task.title}</p>
                                <p className="text-[9px] text-muted-foreground line-clamp-1">{task.description}</p>
                              </div>
                              <Badge className={cn("text-[7px] uppercase h-4 px-1 shrink-0", task.priority === 'high' ? "bg-red-500" : "bg-blue-500")}>{task.priority}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Client Identity *</Label>
                <Select value={formData.clientId} onValueChange={(v) => setFormData({ ...formData, clientId: v })}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Pick Client" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {activeClientList.map(item => <SelectItem key={item.id} value={item.id} className="text-xs">{item.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Deadline *</Label>
                <Input type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} className="h-11 rounded-xl" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Assign Responsible Staff *</Label>
              <Select value={formData.team[0] || ""} onValueChange={(v) => setFormData({ ...formData, team: [v] })}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Staff" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {businessUsers.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name} ({s.role})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="p-6 sm:p-8 bg-muted/10 border-t flex flex-row gap-3">
          <Button variant="outline" className="flex-1 h-12 rounded-xl text-xs font-bold uppercase" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="flex-1 h-12 bg-primary font-bold uppercase text-xs shadow-xl rounded-xl" onClick={handleSubmit} disabled={!isFormValid}>Deploy Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
