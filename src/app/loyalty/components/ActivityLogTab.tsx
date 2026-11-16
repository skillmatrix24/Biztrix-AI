"use client";

import React, { useState, useMemo } from "react";
import {
  History,
  Gem,
  Ticket,
  Handshake,
  Zap,
  Gift,
  Edit2,
  Trash2,
  Activity,
  TrendingUp,
  Download,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiStatCard, SectionCard, EmptyStatePanel } from "@/components/ui/editorial";
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { doc, collection } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ACTIVITY_TYPES = [
  { id: "all", label: "All Activities" },
  { id: "purchase_reward", label: "Purchase Rewards" },
  { id: "coupon_redeem", label: "Coupon Redemptions" },
  { id: "referral_bonus", label: "Referral Bonus" },
  { id: "profile_bonus", label: "Profile Bonus" },
  { id: "manual_adjustment", label: "Manual Adjustments" },
];

export function ActivityLogTab({ activities, currencySymbol, businessId, profile }: any) {
  const firestore = useFirestore();

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredActivities = useMemo(() => {
    const list = activities || [];
    return list.filter((a: any) => {
      const matchesSearch =
        (a.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.couponCode || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || a.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [activities, searchTerm, typeFilter]);

  const logStats = useMemo(() => {
    if (!filteredActivities) return { totalCount: 0, totalPoints: 0, totalSavings: 0 };
    return filteredActivities.reduce(
      (acc: any, a: any) => {
        acc.totalCount++;
        acc.totalPoints += Number(a.points) || 0;
        acc.totalSavings += Number(a.cashback) || 0;
        return acc;
      },
      { totalCount: 0, totalPoints: 0, totalSavings: 0 }
    );
  }, [filteredActivities]);

  const [isDeleteActivityOpen, setIsDeleteActivityOpen] = useState(false);
  const [isEditActivityOpen, setIsEditActivityOpen] = useState(false);
  const [activityToProcess, setActivityToProcess] = useState<any>(null);
  const [activityReason, setActivityReason] = useState("");
  const [editActivityData, setEditActivityData] = useState({
    points: 0,
    cashback: 0,
    description: "",
  });

  const handleConfirmDeleteActivity = () => {
    if (!businessId || !activityToProcess || !activityReason.trim()) return;

    addDocumentNonBlocking(collection(firestore, "businesses", businessId, "loyaltyActivityLogs"), {
      action: "DELETE",
      activityId: activityToProcess.id || "",
      activityType: activityToProcess.type || "unknown",
      customerName: activityToProcess.customerName || "Unknown Customer",
      reason: activityReason || "No reason provided",
      by: profile?.name || "Admin",
      timestamp: new Date().toISOString(),
    });

    deleteDocumentNonBlocking(doc(firestore, "businesses", businessId, "loyaltyActivity", activityToProcess.id));
    setIsDeleteActivityOpen(false);
    setActivityToProcess(null);
    setActivityReason("");
    toast({ title: "Activity Entry Deleted", variant: "destructive" });
  };

  const handleConfirmEditActivity = () => {
    if (!businessId || !activityToProcess || !activityReason.trim()) return;

    const updateData = {
      points: Number(editActivityData.points),
      cashback: Number(editActivityData.cashback),
      description: editActivityData.description || "",
      editReason: activityReason || "No reason provided",
      lastEditBy: profile?.name || "Admin",
      lastEditAt: new Date().toISOString(),
    };

    updateDocumentNonBlocking(doc(firestore, "businesses", businessId, "loyaltyActivity", activityToProcess.id), updateData);

    addDocumentNonBlocking(collection(firestore, "businesses", businessId, "loyaltyActivityLogs"), {
      action: "EDIT",
      activityId: activityToProcess.id || "",
      oldData: {
        points: activityToProcess.points ?? 0,
        cashback: activityToProcess.cashback ?? 0,
        description: activityToProcess.description ?? "",
      },
      newData: updateData,
      reason: activityReason || "No reason provided",
      by: profile?.name || "Admin",
      timestamp: new Date().toISOString(),
    });

    setIsEditActivityOpen(false);
    setActivityToProcess(null);
    setActivityReason("");
    toast({ title: "Activity Entry Updated" });
  };

  const handleExportCSV = () => {
    if (!filteredActivities || filteredActivities.length === 0) {
      toast({ variant: "destructive", title: "Export Error", description: "No logs found matching current filters." });
      return;
    }

    const headers = [
      "Timestamp",
      "Customer Name",
      "Activity Type",
      "Reward Points (+)",
      "Savings (INR)",
      "Description",
    ];

    const csvRows = filteredActivities.map((a: any) => {
      const date = new Date(a.timestamp).toLocaleString("en-IN");
      return [
        `"${date}"`,
        `"${a.customerName || "N/A"}"`,
        `"${a.type?.replace("_", " ").toUpperCase()}"`,
        a.points || 0,
        a.cashback || 0,
        `"${a.description || ""}"`,
      ].join(",");
    });

    const csvContent = headers.join(",") + "\n" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `loyalty_filtered_logs_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Audit Feed Exported", description: "Filtered results have been downloaded." });
  };

  return (
    <div className="space-y-6 text-left">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiStatCard
          label="Filtered Events"
          value={`${logStats.totalCount} Logs`}
          subtext="Matching current view"
          icon={Activity}
        />
        <KpiStatCard
          label="Rewards Issued"
          value={`${logStats.totalPoints.toLocaleString()} PTS`}
          subtext="Filtered total points"
          icon={Gem}
          tone="positive"
        />
        <KpiStatCard
          label="Savings Impact"
          value={`${currencySymbol}${logStats.totalSavings.toLocaleString()}`}
          subtext="Customer value delivered"
          icon={TrendingUp}
          tone="dark"
        />
      </div>

      <SectionCard
        title="Audit Registry"
        description="Ledger of points earned, redemptions, referrals, and adjustments."
        bodyClassName="p-0"
        headerRight={
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search customer or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 rounded-xl bg-slate-50 border-slate-200 text-xs"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-full sm:w-44 rounded-xl bg-white border-slate-200 text-xs font-medium">
                <Filter className="h-3.5 w-3.5 mr-2 text-slate-400" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {ACTIVITY_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id} className="text-xs">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleExportCSV} variant="outline" size="sm" className="h-9 px-3.5 rounded-xl border-slate-200 text-xs font-semibold gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        }
      >
        {!filteredActivities || filteredActivities.length === 0 ? (
          <div className="p-6">
            <EmptyStatePanel
              icon={History}
              title="No matching activity logs"
              description="Adjust your search query or activity type filter to inspect earlier reward entries."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[880px] text-left">
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200">
                  <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">Customer Activity</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 h-11">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 h-11 text-center">Reward</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 h-11 text-center">Savings</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 h-11 text-right pr-6">Timestamp</TableHead>
                  <TableHead className="w-24 text-right pr-6 text-xs font-semibold text-slate-600 h-11">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.map((a: any) => (
                  <TableRow key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border",
                            a.type === "purchase_reward"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : a.type === "coupon_redeem"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                          )}
                        >
                          {a.type === "purchase_reward" ? (
                            <Gem className="h-4 w-4" />
                          ) : a.type === "coupon_redeem" ? (
                            <Ticket className="h-4 w-4" />
                          ) : a.type === "referral_bonus" ? (
                            <Handshake className="h-4 w-4" />
                          ) : a.type === "profile_bonus" ? (
                            <Zap className="h-4 w-4" />
                          ) : (
                            <Gift className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-slate-900 truncate block max-w-[180px]">
                            {a.customerName}
                          </span>
                          {a.description && (
                            <span className="text-xs text-slate-500 truncate block max-w-[240px]">
                              "{a.description}"
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px] font-medium capitalize border-slate-200 text-slate-700">
                        {a.type?.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums font-semibold text-slate-900 text-xs">
                      +{a.points || 0} pts
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums font-semibold text-emerald-700 text-xs">
                      +{currencySymbol}
                      {a.cashback || 0}
                    </TableCell>
                    <TableCell className="text-right pr-6 text-xs font-mono tabular-nums text-slate-500">
                      {new Date(a.timestamp).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit entry for ${a.customerName || "customer"}`}
                          className="h-8 w-8 rounded-lg text-slate-600 hover:text-slate-900"
                          onClick={() => {
                            setActivityToProcess(a);
                            setEditActivityData({
                              points: a.points || 0,
                              cashback: a.cashback || 0,
                              description: a.description || "",
                            });
                            setActivityReason("");
                            setIsEditActivityOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete entry for ${a.customerName || "customer"}`}
                          className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50"
                          onClick={() => {
                            setActivityToProcess(a);
                            setActivityReason("");
                            setIsDeleteActivityOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* Edit Activity Dialog */}
      <Dialog open={isEditActivityOpen} onOpenChange={setIsEditActivityOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl border border-slate-200 p-0 overflow-hidden text-left w-[95vw]">
          <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800 text-left">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                <Edit2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">Modify Activity Entry</DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  All changes are recorded in the audit log.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Reward Points</Label>
                <Input
                  type="number"
                  value={editActivityData.points ?? ""}
                  onChange={(e) => setEditActivityData({ ...editActivityData, points: parseInt(e.target.value) || 0 })}
                  className="h-10 rounded-xl font-mono tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Savings ({currencySymbol})</Label>
                <Input
                  type="number"
                  value={editActivityData.cashback ?? ""}
                  onChange={(e) =>
                    setEditActivityData({ ...editActivityData, cashback: parseFloat(e.target.value) || 0 })
                  }
                  className="h-10 rounded-xl font-mono tabular-nums"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Description</Label>
              <Input
                value={editActivityData.description || ""}
                onChange={(e) => setEditActivityData({ ...editActivityData, description: e.target.value })}
                className="h-10 rounded-xl"
              />
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Reason for Modification *</Label>
              <Textarea
                value={activityReason || ""}
                onChange={(e) => setActivityReason(e.target.value)}
                placeholder="Explain why this entry is being updated..."
                className="min-h-[80px] rounded-xl text-xs"
              />
            </div>
          </div>
          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-100">
            <Button
              onClick={handleConfirmEditActivity}
              disabled={!activityReason.trim()}
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl"
            >
              Save & Log Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteActivityOpen} onOpenChange={setIsDeleteActivityOpen}>
        <AlertDialogContent className="rounded-2xl border border-slate-200 p-6 text-left">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-lg font-bold text-slate-900">Delete Activity Log?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed">
              This permanently removes the entry from customer history and records your reason in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5 my-3 text-left">
            <Label className="text-xs font-semibold text-rose-700">Deletion Reason *</Label>
            <Textarea
              value={activityReason || ""}
              onChange={(e) => setActivityReason(e.target.value)}
              placeholder="e.g. Data entry error / Duplicate record"
              className="min-h-[90px] rounded-xl text-xs"
            />
          </div>
          <AlertDialogFooter className="gap-2.5">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="flex-1 h-10 rounded-xl text-xs font-semibold">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={handleConfirmDeleteActivity}
                disabled={!activityReason.trim()}
                className="flex-1 h-10 rounded-xl font-semibold bg-rose-600 hover:bg-rose-700 text-white text-xs"
              >
                Delete & Log
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
