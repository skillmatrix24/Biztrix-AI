
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
  ShieldAlert,
  Activity,
  Coins,
  TrendingUp,
  Clock,
  Download,
  Search,
  Filter
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { doc, collection, serverTimestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ACTIVITY_TYPES = [
  { id: 'all', label: 'All Activities' },
  { id: 'purchase_reward', label: 'Purchase Rewards' },
  { id: 'coupon_redeem', label: 'Coupon Redemptions' },
  { id: 'referral_bonus', label: 'Referral Bonus' },
  { id: 'profile_bonus', label: 'Profile Bonus' },
  { id: 'manual_adjustment', label: 'Manual Adjustments' },
];

export function ActivityLogTab({ activities, currencySymbol, businessId, profile }: any) {
  const firestore = useFirestore();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredActivities = useMemo(() => {
    const list = activities || [];
    return list.filter((a: any) => {
      const matchesSearch = (a.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (a.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (a.couponCode || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || a.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [activities, searchTerm, typeFilter]);

  // Activity Summary Stats (Synchronized with filters)
  const logStats = useMemo(() => {
    if (!filteredActivities) return { totalCount: 0, totalPoints: 0, totalSavings: 0 };
    return filteredActivities.reduce((acc: any, a: any) => {
      acc.totalCount++;
      acc.totalPoints += (Number(a.points) || 0);
      acc.totalSavings += (Number(a.cashback) || 0);
      return acc;
    }, { totalCount: 0, totalPoints: 0, totalSavings: 0 });
  }, [filteredActivities]);

  // Activity Modification States
  const [isDeleteActivityOpen, setIsDeleteActivityOpen] = useState(false);
  const [isEditActivityOpen, setIsEditActivityOpen] = useState(false);
  const [activityToProcess, setActivityToProcess] = useState<any>(null);
  const [activityReason, setActivityReason] = useState("");
  const [editActivityData, setEditActivityData] = useState({
    points: 0,
    cashback: 0,
    description: ""
  });

  const handleConfirmDeleteActivity = () => {
    if (!businessId || !activityToProcess || !activityReason.trim()) return;
    
    // Fallback logic for undefined values
    addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'loyaltyActivityLogs'), {
      action: 'DELETE',
      activityId: activityToProcess.id || "",
      activityType: activityToProcess.type || "unknown",
      customerName: activityToProcess.customerName || "Unknown Customer",
      reason: activityReason || "No reason provided",
      by: profile?.name || 'Admin',
      timestamp: new Date().toISOString()
    });

    deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'loyaltyActivity', activityToProcess.id));
    setIsDeleteActivityOpen(false);
    setActivityToProcess(null);
    setActivityReason("");
    toast({ title: "Activity Node Erased", variant: "destructive" });
  };

  const handleConfirmEditActivity = () => {
    if (!businessId || !activityToProcess || !activityReason.trim()) return;

    const updateData = {
      points: Number(editActivityData.points),
      cashback: Number(editActivityData.cashback),
      description: editActivityData.description || "",
      editReason: activityReason || "No reason provided",
      lastEditBy: profile?.name || 'Admin',
      lastEditAt: new Date().toISOString()
    };

    updateDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'loyaltyActivity', activityToProcess.id), updateData);
    
    // Fallback logic for undefined values to prevent Firebase invalid data error
    addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'loyaltyActivityLogs'), {
      action: 'EDIT',
      activityId: activityToProcess.id || "",
      oldData: { 
        points: activityToProcess.points ?? 0, 
        cashback: activityToProcess.cashback ?? 0, 
        description: activityToProcess.description ?? "" 
      },
      newData: updateData,
      reason: activityReason || "No reason provided",
      by: profile?.name || 'Admin',
      timestamp: new Date().toISOString()
    });

    setIsEditActivityOpen(false);
    setActivityToProcess(null);
    setActivityReason("");
    toast({ title: "Activity Node Updated" });
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
      "Savings (₹)",
      "Description"
    ];

    const csvRows = filteredActivities.map((a: any) => {
      const date = new Date(a.timestamp).toLocaleString('en-IN');
      return [
        `"${date}"`,
        `"${a.customerName || 'N/A'}"`,
        `"${a.type?.replace('_', ' ').toUpperCase()}"`,
        a.points || 0,
        a.cashback || 0,
        `"${a.description || ''}"`
      ].join(',');
    });

    const csvContent = headers.join(',') + '\n' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `loyalty_filtered_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Audit Feed Exported", description: "Filtered results have been downloaded." });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ACTIVITY DASHBOARD SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border border-border/50 text-left relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Activity className="h-10 w-10 text-primary" /></div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Activity Nodes</p>
          <div className="text-2xl font-black text-slate-900">{logStats.totalCount} Logs</div>
          <p className="text-[8px] font-bold uppercase text-primary mt-2">Current View Stats</p>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border border-border/50 text-left relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Gem className="h-10 w-10 text-primary" /></div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Rewards Issued</p>
          <div className="text-2xl font-black text-primary">{logStats.totalPoints.toLocaleString()} <span className="text-xs font-bold opacity-40">PTS</span></div>
          <p className="text-[8px] font-bold uppercase text-green-600 mt-2">Filtered Total</p>
        </Card>
        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6 text-left relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp className="h-10 w-10 text-accent" /></div>
          <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">Savings Impact</p>
          <div className="text-2xl font-black text-white">{currencySymbol}{logStats.totalSavings.toLocaleString()}</div>
          <p className="text-[8px] font-bold uppercase text-slate-400 mt-2">Customer Value Generated</p>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2.5rem] border text-left">
        <CardHeader className="bg-muted/10 border-b py-6 px-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-left">
          <div className="space-y-1">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 text-left">
              <History className="h-4 w-4" /> Audit Registry
            </CardTitle>
            <p className="text-[9px] font-bold text-muted-foreground uppercase">Real-time ledger of reward handshakes</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
              <Input 
                placeholder="Search customer or code..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 pl-9 rounded-xl bg-white border-none shadow-inner text-xs font-bold" 
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
               <SelectTrigger className="h-10 w-full sm:w-44 rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase">
                  <Filter className="h-3.5 w-3.5 mr-2 opacity-40" />
                  <SelectValue placeholder="All Types" />
               </SelectTrigger>
               <SelectContent className="rounded-xl border-none shadow-2xl">
                  {ACTIVITY_TYPES.map(type => (
                    <SelectItem key={type.id} value={type.id} className="text-[10px] font-bold uppercase">{type.label}</SelectItem>
                  ))}
               </SelectContent>
            </Select>
            <Button onClick={handleExportCSV} variant="outline" size="sm" className="h-10 px-4 rounded-xl border-primary/20 text-primary font-black uppercase text-[9px] gap-2 bg-white shadow-sm hover:bg-primary/5">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto text-left">
          <Table className="min-w-[1000px] text-left">
            <TableHeader className="text-left">
              <TableRow className="bg-muted/10 text-left">
                <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Customer Activity</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Action Node</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12 text-center">Reward (+)</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12 text-center">Savings (+)</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12 text-right pr-8">Timestamp</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-left">
              {(!filteredActivities || filteredActivities.length === 0) ? (
                <TableRow><TableCell colSpan={6} className="h-60 text-center opacity-30 italic text-sm font-black uppercase tracking-widest">No matching activities found.</TableCell></TableRow>
              ) : (
                filteredActivities.map((a: any) => (
                  <TableRow key={a.id} className="border-b last:border-0 hover:bg-muted/5 transition-colors group text-left">
                    <TableCell className="pl-8 py-5">
                      <div className="flex items-center gap-4 text-left">
                        <div className={cn(
                          "h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center font-black text-primary text-[10px] uppercase shrink-0 shadow-inner",
                          a.type === 'purchase_reward' ? "bg-green-50" : a.type === 'coupon_redeem' ? "bg-orange-50" : "bg-primary/5"
                        )}>
                          {a.type === 'purchase_reward' ? <Gem className="h-5 w-5" /> : 
                           a.type === 'coupon_redeem' ? <Ticket className="h-5 w-5" /> : 
                           a.type === 'referral_bonus' ? <Handshake className="h-5 w-5" /> : 
                           a.type === 'profile_bonus' ? <Zap className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 text-left">
                          <span className="text-sm font-black text-slate-900 truncate block max-w-[150px] uppercase tracking-tight">{a.customerName}</span>
                          {a.description && <span className="text-[8px] font-medium text-slate-400 uppercase tracking-tighter truncate block max-w-[200px] mt-0.5">"{a.description}"</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 border-primary/20 text-primary">{a.type?.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-black text-primary text-xs">+{a.points || 0} Pts</TableCell>
                    <TableCell className="text-center font-black text-green-600 text-xs">+{currencySymbol}{a.cashback || 0}</TableCell>
                    <TableCell className="text-right pr-8 text-[10px] font-black text-slate-400 uppercase">
                      {new Date(a.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short' , year: 'numeric' , hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-primary hover:bg-primary/5 shadow-sm" onClick={() => { setActivityToProcess(a); setEditActivityData({ points: a.points || 0, cashback: a.cashback || 0, description: a.description || "" }); setActivityReason(""); setIsEditActivityOpen(true); }}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive hover:bg-red-50 shadow-sm" onClick={() => { setActivityToProcess(a); setActivityReason(""); setIsDeleteActivityOpen(true); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ACTIVITY EDIT DIALOG */}
      <Dialog open={isEditActivityOpen} onOpenChange={setIsEditActivityOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden text-left w-[95vw]">
           <DialogHeader className="p-8 bg-primary text-white text-left">
              <div className="flex items-center gap-4 text-left">
                 <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                    <Edit2 className="h-6 w-6 text-white" />
                 </div>
                 <div className="text-left">
                    <DialogTitle className="text-xl font-bold uppercase">Modify Activity Node</DialogTitle>
                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Audit Protocol Required</p>
                 </div>
              </div>
           </DialogHeader>
           <div className="p-8 space-y-6 text-left">
              <div className="grid grid-cols-2 gap-4 text-left">
                 <div className="space-y-1.5 text-left"><Label className="text-[10px] font-bold uppercase">Reward Points</Label><Input type="number" value={editActivityData.points} onChange={(e) => setEditActivityData({...editActivityData, points: parseInt(e.target.value) || 0})} className="h-11 rounded-xl font-black bg-muted/20 border-none shadow-inner" /></div>
                 <div className="space-y-1.5 text-left"><Label className="text-[10px] font-bold uppercase">Savings ({currencySymbol})</Label><Input type="number" value={editActivityData.cashback} onChange={(e) => setEditActivityData({...editActivityData, cashback: parseFloat(e.target.value) || 0})} className="h-11 rounded-xl font-black bg-muted/20 border-none shadow-inner" /></div>
              </div>
              <div className="space-y-1.5 text-left"><Label className="text-[10px] font-bold uppercase">Activity Description</Label><Input value={editActivityData.description} onChange={(e) => setEditActivityData({...editActivityData, description: e.target.value})} className="h-11 rounded-xl font-bold bg-muted/20 border-none shadow-inner" /></div>
              <Separator className="opacity-40" />
              <div className="space-y-2 text-left">
                 <Label className="text-[10px] font-black uppercase text-primary ml-1">Reason for Modification *</Label>
                 <Textarea value={activityReason} onChange={(e) => setActivityReason(e.target.value)} placeholder="Explain why this node is being updated..." className="min-h-[80px] rounded-xl bg-muted/20 border-none shadow-inner p-4 text-xs font-bold" />
              </div>
           </div>
           <DialogFooter className="p-8 bg-muted/10 border-t">
              <Button onClick={handleConfirmEditActivity} disabled={!activityReason.trim()} className="w-full h-14 bg-primary font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Update & Log Node</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ACTIVITY DELETE ALERT */}
      <AlertDialog open={isDeleteActivityOpen} onOpenChange={setIsDeleteActivityOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-10 text-left">
           <AlertDialogHeader className="text-left">
              <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-6 shadow-inner">
                 <Trash2 className="h-8 w-8" />
              </div>
              <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-left">Erase Activity Log?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium text-slate-500 leading-relaxed uppercase tracking-tight mb-4 text-left">
                 Permanently remove this entry from the audit feed? Action will be recorded in system logs.
              </AlertDialogDescription>
           </AlertDialogHeader>
           <div className="space-y-4 my-6 text-left">
              <Label className="text-[10px] font-black uppercase text-destructive ml-1">Mandatory Deletion Reason *</Label>
              <Textarea value={activityReason} onChange={(e) => setActivityReason(e.target.value)} placeholder="e.g. Data entry error / Duplicate record" className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner p-4 text-xs font-bold" />
           </div>
           <AlertDialogFooter className="gap-4 text-left">
              <AlertDialogCancel asChild><Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold uppercase text-[10px]">Cancel</Button></AlertDialogCancel>
              <AlertDialogAction asChild><Button onClick={handleConfirmDeleteActivity} disabled={!activityReason.trim()} className="flex-1 h-14 rounded-2xl font-black uppercase bg-destructive hover:bg-destructive/90 text-white border-none shadow-lg text-[10px]">Erase & Log</Button></AlertDialogAction>
           </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

