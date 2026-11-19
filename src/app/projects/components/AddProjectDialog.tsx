"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus, Zap, Sparkles, Loader2 } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { suggestProjectTasks } from "@/ai/flows/suggest-project-tasks";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface AddProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  customersList: any[];
  leadsList: any[];
  businessUsers: any[];
  initialLead?: any | null;
}

interface TempTask {
  id: string;
  title: string;
  description: string;
  section: string;
  priority: "high" | "medium" | "low";
}

export function AddProjectDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  customersList,
  leadsList,
  businessUsers,
  initialLead,
}: AddProjectDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    clientType: "customer" as "customer" | "lead",
    clientId: "",
    deadline: "",
    team: [] as string[],
  });

  useEffect(() => {
    if (!isOpen || !initialLead) return;
    setFormData((prev) => ({
      ...prev,
      title:
        prev.title ||
        `${initialLead.name || "Client"}${initialLead.interest ? ` — ${initialLead.interest}` : " Project"}`,
      description: prev.description || initialLead.notes || initialLead.interest || "",
      clientType: initialLead.convertedCustomerId ? "customer" : "lead",
      clientId: initialLead.convertedCustomerId || initialLead.id || "",
      team:
        prev.team.length > 0
          ? prev.team
          : initialLead.assignedTo
            ? [initialLead.assignedTo]
            : [],
    }));
  }, [isOpen, initialLead]);

  const [deepResearch, setDeepResearch] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState<TempTask[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [whatsAppSync] = useState(true);

  const handleSuggestTasks = async () => {
    if (!formData.title.trim()) {
      toast({
        variant: "destructive",
        title: "Project Name Required",
        description: "Please enter a project name first.",
      });
      return;
    }
    setIsAiLoading(true);
    try {
      const result = await suggestProjectTasks({
        title: formData.title,
        description: formData.description,
        deepResearch,
      });
      const tasksWithIds = result.tasks.map((t) => ({
        ...t,
        id: Math.random().toString(36).substr(2, 9),
      }));
      setSuggestedTasks(tasksWithIds);
      setSelectedTaskIds(tasksWithIds.map((t) => t.id));
      toast({
        title: "Tasks Generated",
        description: `Suggested ${result.tasks.length} tasks.`,
      });
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "Could not generate suggestions.",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const toggleTask = (id: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTaskIds.length === suggestedTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(suggestedTasks.map((t) => t.id));
    }
  };

  const handleMergeSelected = () => {
    if (selectedTaskIds.length < 2) return;

    const tasksToMerge = suggestedTasks.filter((t) => selectedTaskIds.includes(t.id));
    const mergedTask: TempTask = {
      id: Math.random().toString(36).substr(2, 9),
      title: "Merged: " + tasksToMerge[0].title,
      description: tasksToMerge.map((t) => `• ${t.title}: ${t.description}`).join("\n"),
      section: tasksToMerge[0].section,
      priority: tasksToMerge.some((t) => t.priority === "high") ? "high" : "medium",
    };

    const remainingTasks = suggestedTasks.filter((t) => !selectedTaskIds.includes(t.id));
    setSuggestedTasks([...remainingTasks, mergedTask]);
    setSelectedTaskIds([mergedTask.id]);
    toast({ title: "Tasks Merged" });
  };

  const handleSubmit = () => {
    const finalTasks = suggestedTasks
      .filter((t) => selectedTaskIds.includes(t.id))
      .map((t) => ({
        ...t,
        dueDate: formData.deadline || new Date().toISOString().split("T")[0],
        remindWhatsApp: whatsAppSync,
      }));

    onSubmit({ ...formData, initialTasks: finalTasks });
    setFormData({
      title: "",
      description: "",
      clientType: "customer",
      clientId: "",
      deadline: "",
      team: [],
    });
    setSuggestedTasks([]);
    setSelectedTaskIds([]);
    setDeepResearch(false);
  };

  const isFormValid = useMemo(() => {
    return (
      formData.title.trim().length > 0 &&
      formData.clientId.length > 0 &&
      formData.deadline.length > 0 &&
      formData.team.length > 0
    );
  }, [formData]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, TempTask[]> = {};
    suggestedTasks.forEach((t) => {
      const sec = t.section || "General";
      if (!groups[sec]) groups[sec] = [];
      groups[sec].push(t);
    });
    return groups;
  }, [suggestedTasks]);

  const activeClientList = useMemo(() => {
    return formData.clientType === "customer" ? customersList || [] : leadsList || [];
  }, [formData.clientType, customersList, leadsList]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white h-10 px-4 font-semibold text-xs rounded-xl gap-2">
          <Plus className="h-4 w-4" /> New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[680px] rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden w-[95vw] sm:w-full">
        <DialogHeader className="p-6 bg-slate-900 text-white text-left">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">
                Create New Project
              </DialogTitle>
              <DialogDescription className="text-slate-300 text-xs mt-0.5">
                Link a client, deadline, team owner, and optional starter checklist.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5 max-h-[62vh] overflow-y-auto">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Project Name *</Label>
              <Input
                placeholder="e.g. Office Renovation"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="h-10 rounded-xl border-slate-200 bg-white text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Description</Label>
              <Textarea
                placeholder="Scope, key milestones, or client notes..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="min-h-[84px] rounded-xl border-slate-200 bg-white p-3.5 text-sm"
              />
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Switch
                  id="deep-research"
                  checked={deepResearch}
                  onCheckedChange={setDeepResearch}
                />
                <Label htmlFor="deep-research" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Detailed Task Breakdown
                </Label>
              </div>
              <Button
                type="button"
                disabled={isAiLoading || !formData.title.trim()}
                onClick={handleSuggestTasks}
                variant="outline"
                className="h-9 rounded-xl border-slate-200 bg-white text-slate-900 font-semibold text-xs gap-1.5 w-full sm:w-auto"
              >
                {isAiLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                )}
                Suggest Starter Tasks
              </Button>
            </div>

            {suggestedTasks.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Suggested Tasks
                  </h4>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs font-medium"
                      onClick={toggleSelectAll}
                    >
                      Toggle All
                    </Button>
                    {selectedTaskIds.length >= 2 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleMergeSelected}
                        className="h-7 text-xs font-medium bg-amber-100 text-amber-800"
                      >
                        Merge Selected
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                  {Object.entries(groupedTasks).map(([section, tasks]) => (
                    <div key={section} className="space-y-1.5">
                      <p className="text-xs font-semibold text-slate-500">{section}</p>
                      <div className="space-y-2">
                        {tasks.map((task) => (
                          <div
                            key={task.id}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-xl border transition-colors",
                              selectedTaskIds.includes(task.id)
                                ? "bg-white border-slate-300"
                                : "bg-white/60 border-slate-200 opacity-60"
                            )}
                          >
                            <Checkbox
                              checked={selectedTaskIds.includes(task.id)}
                              onCheckedChange={() => toggleTask(task.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {task.title}
                              </p>
                              <p className="text-xs text-slate-500 line-clamp-1">
                                {task.description}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[11px] capitalize shrink-0",
                                task.priority === "high"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              )}
                            >
                              {task.priority}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Client *</Label>
              <Select
                value={formData.clientId}
                onValueChange={(v) => setFormData({ ...formData, clientId: v })}
              >
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm">
                  <SelectValue placeholder="Pick Client" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {activeClientList.map((item) => (
                    <SelectItem key={item.id} value={item.id} className="text-xs">
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Deadline *</Label>
              <Input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="h-10 rounded-xl border-slate-200 bg-white font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Assign Responsible Staff *
            </Label>
            <Select
              value={formData.team[0] || ""}
              onValueChange={(v) => setFormData({ ...formData, team: [v] })}
            >
              <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm">
                <SelectValue placeholder="Select Staff" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {businessUsers.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.name} ({s.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200 flex flex-row gap-2.5">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-10 rounded-xl text-xs font-semibold"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl"
            onClick={handleSubmit}
            disabled={!isFormValid}
          >
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
