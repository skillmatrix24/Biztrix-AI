
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  BookOpenText, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Search,
  Filter,
  Trash2,
  AlertCircle,
  Tag,
  Loader2,
  X,
  User,
  PlusCircle,
  Calculator,
  Layers,
  Edit2,
  Save,
  Calendar,
  ChevronDown,
  ListTree,
  NotebookPen,
  Settings,
  MessageSquare,
  ChevronUp,
  CornerDownRight,
  Layout,
  Calendar as CalendarIcon,
  FileText,
  Clock
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CustomDateRangePicker } from "@/components/ui/custom-date-range";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  SelectSeparator
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, serverTimestamp, doc, where, limit, runTransaction, increment } from "firebase/firestore";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfDay, endOfDay, subMonths } from "date-fns";
import { DateRange } from "react-day-picker";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";

const entrySchema = z.object({
  type: z.enum(['credit', 'debit', 'nc', 'due']),
  particulars: z.string().min(1, "Particulars are required"),
  rate: z.coerce.number().min(0, "Rate must be positive"),
  qty: z.coerce.number().min(0, "Quantity must be positive"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  category: z.string().min(1, "Category is required"),
});

const FALLBACK_CATEGORIES = ["Sales", "Expense", "Rent", "Salary", "Purchase", "Utility", "Other"];
const DEFAULT_UNITS = ["pcs", "kg", "box", "packet", "unit", "litre", "meter"];
const FALLBACK_PARTICULARS = ["Tea & Snacks", "Conveyance", "Office Cleaning", "Stationery Purchase", "Customer Refund"];

type DateFilterType = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'all' | 'custom';

type DraftEntry = {
  id: string;
  type: 'credit' | 'debit' | 'nc' | 'due';
  particulars: string;
  rate: string;
  qty: string;
  unit: string;
  amount: number; 
  category: string;
  entryBy: string;
  vendorName?: string;
  notes: string;
};

export default function DailyEntriesPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  // Dynamic Business Resolution
  const userProfileRef = useMemoFirebase(() => 
    !isUserLoading && user?.uid && !user.isAnonymous ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid, isUserLoading, user?.isAnonymous]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);
  
  const currencySymbol = getCurrencySymbol(business?.currency);
  const dynamicUnits = business?.baseUnits || DEFAULT_UNITS;
  const dynamicCategories = business?.cashbookCategories || FALLBACK_CATEGORIES;
  const dynamicParticulars = business?.commonParticulars || FALLBACK_PARTICULARS;

  const isPinned = useMemo(() => {
    const layout = (userProfile?.dashboardLayout as any[]) || [];
    return layout.find(w => w.id === 'pulse')?.enabled ?? true;
  }, [userProfile]);

  const toggleDashboardPin = () => {
    if (!userProfileRef || !userProfile) return;
    const currentLayout = [...(userProfile.dashboardLayout || [])];
    const newLayout = currentLayout.map(w => w.id === 'pulse' ? { ...w, enabled: !w.enabled } : w);
    updateDocumentNonBlocking(userProfileRef, { dashboardLayout: newLayout });
    toast({ title: isPinned ? "Unpinned" : "Pinned", description: `Daily Pulse widget ${isPinned ? 'removed from' : 'added to'} Dashboard.` });
  };

  const vendorsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'vendors') : null
  , [firestore, businessId]);

  const { data: vendorsDataRaw } = useCollection<any>(vendorsQuery);
  const vendorsData = vendorsDataRaw || [];

  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorPhone, setNewVendorPhone] = useState("");

  const staffQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null
  , [firestore, businessId]);
  const { data: staffListData } = useCollection<any>(staffQuery);
  const staffList = staffListData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [pageLimit, setPageLimit] = useState(20);
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);

  // Real-time Firestore Connection
  const entriesQuery = useMemoFirebase(() => {
    if (!businessId) return null;
    return query(
      collection(firestore, 'businesses', businessId, 'cashbook'),
      orderBy('createdAt', 'desc'),
      limit(pageLimit)
    );
  }, [firestore, businessId, pageLimit]);
  const { data: entriesData, isLoading: isEntriesLoading } = useCollection<any>(entriesQuery);
  const entries = entriesData || [];

  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  
  const [commonDate, setCommonDate] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<DraftEntry | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [expandedReportRows, setExpandedReportRows] = useState<Record<string, boolean>>({});
  const [draftEntries, setDraftEntries] = useState<DraftEntry[]>([
    { id: '1', type: 'credit', particulars: '', rate: '', qty: '', unit: dynamicUnits[0] || 'pcs', amount: 0, category: dynamicCategories[0] || 'Sales', entryBy: 'Owner', notes: '' }
  ]);

  useEffect(() => {
    setCommonDate(new Date().toISOString().split('T')[0]);
  }, []);

  const isDateInRange = (dateStr: string, range: DateFilterType) => {
    if (!dateStr) return false;
    const entryDate = parseISO(dateStr);
    const now = new Date();
    
    switch (range) {
      case 'today':
        return dateStr === now.toISOString().split('T')[0];
      case 'yesterday':
        const yesterday = subDays(now, 1).toISOString().split('T')[0];
        return dateStr === yesterday;
      case 'last7':
        return isWithinInterval(entryDate, { start: startOfDay(subDays(now, 7)), end: endOfDay(now) });
      case 'last30':
        return isWithinInterval(entryDate, { start: startOfDay(subDays(now, 30)), end: endOfDay(now) });
      case 'thisMonth':
        return isWithinInterval(entryDate, { start: startOfMonth(now), end: endOfMonth(now) });
      case 'lastMonth':
        return isWithinInterval(entryDate, { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) });
      case 'all':
        return true;
      case 'custom':
        if (!customDateRange?.from || !customDateRange?.to) return true;
        return isWithinInterval(entryDate, { start: startOfDay(customDateRange.from), end: endOfDay(customDateRange.to) });
      default:
        return true;
    }
  };

  const batchStats = useMemo(() => {
    const credit = draftEntries
      .filter(e => e.type === 'credit')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const debit = draftEntries
      .filter(e => e.type === 'debit')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    return { credit, debit, net: credit - debit };
  }, [draftEntries]);

  const filteredEntries = useMemo(() => {
    let list = entries || [];
    list = list.filter(e => {
      const matchesSearch = e.category?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           e.particulars?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           e.entryBy?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = isDateInRange(e.date, dateFilter);
      return matchesSearch && matchesDate;
    });

    if (sortConfig) {
      list.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        
        if (sortConfig.key === 'amount') {
            valA = parseFloat(valA) || 0;
            valB = parseFloat(valB) || 0;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [entries, searchTerm, dateFilter, sortConfig]);

  const stats = useMemo(() => {
    const list = entries || [];
    const periodEntries = list.filter(e => isDateInRange(e.date, dateFilter));
    
    const credit = periodEntries
      .filter(e => e.type === 'credit')
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    
    const debit = periodEntries
      .filter(e => e.type === 'debit')
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    return {
      periodCredit: credit,
      periodDebit: debit,
      periodNC: periodEntries
        .filter(e => e.type === 'nc')
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0),
      periodDue: periodEntries
        .filter(e => e.type === 'due')
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0),
      netBalance: credit - debit,
      openingBalance: business?.openingBalance || 0,
      currentBalance: (business?.openingBalance || 0) + (credit - debit)
    };
  }, [entries, dateFilter, business?.openingBalance]);

  const addRow = () => {
    setDraftEntries([...draftEntries, { 
      id: Date.now().toString(), 
      type: 'credit', 
      particulars: '', 
      rate: '', 
      qty: '', 
      unit: dynamicUnits[0] || 'pcs', 
      amount: 0, 
      category: dynamicCategories[0] || 'Sales', 
      entryBy: 'Owner',
      notes: ''
    }]);
  };

  const removeRow = (id: string) => {
    if (draftEntries.length === 1) return;
    setDraftEntries(draftEntries.filter(e => e.id !== id));
  };

  const updateRow = (id: string, key: keyof DraftEntry, value: any) => {
    setDraftEntries(draftEntries.map(e => {
      if (e.id === id) {
        const updated = { ...e, [key]: value };
        if (key === 'rate' || key === 'qty') {
          const r = parseFloat(key === 'rate' ? value : e.rate) || 0;
          const q = parseFloat(key === 'qty' ? value : e.qty) || 0;
          updated.amount = r * q;
        }
        return updated;
      }
      return e;
    }));
  };

  const toggleRowNote = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleReportNote = (id: string) => {
    setExpandedReportRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveBatch = async () => {
    if (!businessId) return;
    
    const validEntries = [];
    for (const entry of draftEntries) {
        if (!entry.particulars && entry.amount === 0) continue; 
        
        const result = entrySchema.safeParse(entry);
        if (!result.success) {
            toast({ variant: "destructive", title: "Validation Error", description: `${entry.particulars || 'Entry'}: ${result.error.errors[0].message}` });
            return;
        }
        validEntries.push(result.data);
    }

    if (validEntries.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Please fill at least one complete entry." });
      return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const entriesRef = collection(firestore, 'businesses', businessId, 'cashbook');
            const productsRef = collection(firestore, 'businesses', businessId, 'products');
            
            for (const entry of validEntries) {
                // Find matching product
                const q = query(productsRef, where('name', '==', entry.particulars), limit(1));
                const querySnapshot = await transaction.get(q);
                
                if (!querySnapshot.empty) {
                    const productDoc = querySnapshot.docs[0];
                    const productData = productDoc.data();
                    const qty = Number(entry.qty);
                    
                    if (entry.type === 'credit') { // Sale
                        if ((productData.stock || 0) < qty) {
                            throw new Error(`Insufficient stock for ${entry.particulars}`);
                        }
                        transaction.update(productDoc.ref, { stock: increment(-qty) });
                    } else { // Purchase
                        transaction.update(productDoc.ref, { stock: increment(qty) });
                    }
                }
            }

            validEntries.forEach(entry => {
                transaction.set(doc(entriesRef), {
                    ...entry,
                    businessId,
                    entryBy: 'Owner',
                    notes: "",
                    date: commonDate,
                    createdAt: serverTimestamp()
                });
            });
        });
        setIsAddOpen(false);
        resetForm();
        toast({ title: "Batch Recorded", description: `Added ${validEntries.length} entries and updated stock.` });
    } catch (error) {
        console.error("Transaction failed:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to record batch. Please check stock levels." });
    }
  };

  const resetForm = () => {
    setDraftEntries([{ id: '1', type: 'credit', particulars: '', rate: '', qty: '', unit: dynamicUnits[0] || 'pcs', amount: 0, category: dynamicCategories[0] || 'Sales', entryBy: 'Owner', notes: '' }]);
    setExpandedRows({});
  };

  const handleDelete = () => {
    if (!deleteTarget || !businessId) return;
    const docRef = doc(firestore, 'businesses', businessId, 'cashbook', deleteTarget);
    deleteDocumentNonBlocking(docRef);
    setDeleteTarget(null);
    toast({ title: "Deleted", description: "Entry removed successfully." });
  };

  const handleUpdate = () => {
    if (!editTarget || !businessId) return;

    const result = entrySchema.safeParse(editTarget);
    if (!result.success) {
        toast({ variant: "destructive", title: "Validation Error", description: result.error.errors[0].message });
        return;
    }
    
    const docRef = doc(firestore, 'businesses', businessId, 'cashbook', editTarget.id);
    updateDocumentNonBlocking(docRef, {
        ...result.data,
        notes: editTarget.notes || "",
    });
    setEditTarget(null);
    toast({ title: "Updated", description: "Entry updated successfully." });
  };

  const handleExport = () => {
    if (filteredEntries.length === 0) return;
    const headers = ["Date", "Type", "Particulars", "Vendor", "Rate", "Qty", "Unit", "Total", "Category", "Payment", "Added By", "Remark"];
    const csvContent = [
      headers.join(","),
      ...filteredEntries.map(e => [
        e.date,
        e.type,
        `"${e.particulars.replace(/"/g, '""')}"`,
        `"${(e.vendorName || '-').replace(/"/g, '""')}"`,
        e.rate,
        e.qty,
        e.unit || '-',
        e.amount,
        e.category,
        e.paymentMethod || '-',
        e.addedBy || e.entryBy || 'Owner',
        `"${(e.remark || e.notes || '').replace(/"/g, '""')}"`
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashbook_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Data exported to CSV successfully." });
  };

  const getDateLabel = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today': return now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      case 'yesterday': return 'Yesterday';
      case 'last7': return 'Last 7 Days';
      case 'last30': return 'Last 30 Days';
      case 'thisMonth': return 'This Month';
      case 'lastMonth': return 'Last Month';
      case 'all': return 'Full History';
      case 'custom': return customDateRange?.from ? `${customDateRange.from.toLocaleDateString('en-IN', {day:'numeric', month:'short'})} - ${customDateRange.to?.toLocaleDateString('en-IN', {day:'numeric', month:'short'}) || '...'}` : 'Select Range';
      default: return 'Filter Date';
    }
  };

  if (isProfileLoading || isUserLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      {/* Page Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
            <BookOpenText className="h-7 w-7 md:h-8 md:w-8 text-primary" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 leading-none">Daily Cash Book</h2>
              <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border shadow-sm shrink-0">
                <Layout className="h-3 w-3 text-muted-foreground" />
                <Switch checked={isPinned} onCheckedChange={toggleDashboardPin} className="scale-[0.6] data-[state=checked]:bg-primary" />
              </div>
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-black tracking-widest mt-1">Multi-Line Inflow & Outflow</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-3 flex-1 sm:flex-none">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex-1 sm:flex-none h-11 px-4 font-black text-[10px] uppercase tracking-wider bg-white shadow-sm border-primary/10 text-primary rounded-xl">
                    <Calendar className="mr-2 h-3.5 w-3.5" /> {getDateLabel()} <ChevronDown className="ml-auto h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl border-none shadow-2xl p-1">
                  <DropdownMenuLabel className="text-[8px] font-black uppercase tracking-widest p-2 opacity-40">Select Window</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setDateFilter('today')} className="text-xs font-bold uppercase p-3 cursor-pointer rounded-xl">Today</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDateFilter('yesterday')} className="text-xs font-bold uppercase p-3 cursor-pointer rounded-xl">Yesterday</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDateFilter('last7')} className="text-xs font-bold uppercase p-3 cursor-pointer rounded-xl">Last 7 Days</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDateFilter('last30')} className="text-xs font-bold uppercase p-3 cursor-pointer rounded-xl">Last 30 Days</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDateFilter('thisMonth')} className="text-xs font-bold uppercase p-3 cursor-pointer rounded-xl">This Month</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDateFilter('lastMonth')} className="text-xs font-bold uppercase p-3 cursor-pointer rounded-xl">Last Month</DropdownMenuItem>
                  <Separator className="my-1" />
                  <DropdownMenuItem onClick={() => setDateFilter('all')} className="text-xs font-bold uppercase p-3 cursor-pointer text-primary rounded-xl">Full History</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="h-11 px-4 font-black text-[10px] uppercase tracking-wider bg-white shadow-sm border-primary/10 text-primary rounded-xl">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" /> Range <ChevronDown className="ml-2 h-3.5 w-3.5" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <CustomDateRangePicker
                        value={{
                            startDate: customDateRange?.from || new Date(),
                            endDate: customDateRange?.to || new Date(),
                            key: 'selection'
                        }}
                        onChange={(range) => {
                            setCustomDateRange({ from: range.startDate, to: range.endDate });
                            if (range.startDate && range.endDate) setDateFilter('custom');
                        }}
                    />
                </PopoverContent>
              </Popover>

              <Button variant="outline" onClick={handleExport} className="h-11 px-4 font-black text-[10px] uppercase tracking-wider bg-white shadow-sm border-primary/10 text-primary rounded-xl">
                  <FileText className="mr-2 h-3.5 w-3.5" /> Export
              </Button>

              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <Link href="/batch-entry" passHref>
                  <Button className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 shadow-xl h-11 px-6 font-black uppercase text-[10px] tracking-[0.1em] rounded-xl text-white">
                    <Plus className="mr-2 h-4 w-4" /> Batch Entry
                  </Button>
                </Link>
                <DialogContent className="max-w-[95vw] lg:max-w-[1400px] rounded-[2rem] md:rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden flex flex-col h-[90vh]">
                  <DialogHeader className="p-4 md:p-6 bg-primary text-white shrink-0">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0 shadow-inner">
                          <Layers className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <div>
                          <DialogTitle className="text-lg md:text-xl font-bold">Record Cash Entries</DialogTitle>
                          <DialogDescription className="text-white/70 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1">Multi-row rate × quantity booking</DialogDescription>
                        </div>
                      </div>
                      <div className="space-y-1.5 w-full md:w-auto">
                        <Label className="text-[9px] md:text-[10px] font-bold uppercase text-white/70 ml-1">Entry Date</Label>
                        <input type="date" value={commonDate} onChange={(e) => setCommonDate(e.target.value)} className="h-9 w-full md:w-40 bg-white/10 border border-white/20 rounded-xl px-3 text-white text-xs font-bold outline-none focus:bg-white/20" />
                      </div>
                    </div>
                  </DialogHeader>
                  
                  <ScrollArea className="flex-1 overflow-y-auto">
                    <div className="p-4 lg:p-0 min-h-full pb-10">
                      <div className="hidden lg:grid grid-cols-[100px_1fr_120px_100px_120px_120px_140px_140px_140px_100px] gap-2 p-4 bg-muted/50 sticky top-0 z-10 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                        <div>Type</div>
                        <div>Particulars</div>
                        <div className="text-center">Vendor</div>
                        <div className="text-center">Rate ({currencySymbol})</div>
                        <div className="text-center">Qty</div>
                        <div>Unit</div>
                        <div className="text-center">Total ({currencySymbol})</div>
                        <div>Category</div>
                        <div>By</div>
                        <div>Actions</div>
                      </div>

                      <div className="divide-y divide-border">
                        {draftEntries.map((entry, idx) => (
                          <div key={entry.id} className="group/row">
                            <div className="p-4 lg:p-3 lg:grid lg:grid-cols-[100px_1fr_120px_120px_100px_120px_140px_140px_140px_100px] lg:gap-2 items-center hover:bg-muted/5 transition-all">
                              <div className="lg:hidden flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-[8px] font-black uppercase bg-primary/10 text-primary border-none h-4">Entry #{idx + 1}</Badge>
                                  <div className={cn("h-1.5 w-1.5 rounded-full", entry.type === 'credit' ? "bg-green-500" : "bg-red-500")} />
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/5 rounded-full" onClick={() => removeRow(entry.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 lg:contents gap-x-3 gap-y-4">
                                <div className="col-span-2 lg:col-span-1">
                                  <Label className="lg:hidden text-[9px] font-black uppercase text-muted-foreground mb-1 block">Flow Type</Label>
                                  <Select value={entry.type} onValueChange={(v: any) => updateRow(entry.id, 'type', v)}>
                                    <SelectTrigger className={cn("h-10 border-none shadow-sm text-[10px] font-black uppercase rounded-xl", entry.type === 'credit' ? "text-green-600 bg-green-50" : entry.type === 'debit' ? "text-destructive bg-red-50" : entry.type === 'nc' ? "text-amber-600 bg-amber-50" : "text-blue-600 bg-blue-50")}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-none shadow-2xl">
                                      <SelectItem value="credit" className="text-[10px] font-bold uppercase text-green-600">Credit (+)</SelectItem>
                                      <SelectItem value="debit" className="text-[10px] font-bold uppercase text-destructive">Debit (-)</SelectItem>
                                      <SelectItem value="nc" className="text-[10px] font-bold uppercase text-amber-600">NC (Not Chargeable)</SelectItem>
                                      <SelectItem value="due" className="text-[10px] font-bold uppercase text-blue-600">Due Payment</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="col-span-2 lg:col-span-1">
                                  <Label className="lg:hidden text-[9px] font-black uppercase text-muted-foreground mb-1 block">Particulars</Label>
                                  <div className="relative">
                                    <Input 
                                      placeholder="Description..." 
                                      value={entry.particulars || ""} 
                                      onChange={(e) => updateRow(entry.id, 'particulars', e.target.value)}
                                      className="h-10 text-xs border-none bg-muted/20 font-bold rounded-xl pr-10 shadow-inner"
                                    />
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 absolute right-1 top-1 opacity-40 hover:opacity-100">
                                          <NotebookPen className="h-3.5 w-3.5 text-primary" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-64 rounded-2xl border-none shadow-2xl p-1">
                                        <DropdownMenuLabel className="text-[8px] font-black uppercase tracking-widest p-2 opacity-40">Quick Selection</DropdownMenuLabel>
                                        <ScrollArea className="h-48">
                                          {(dynamicParticulars || []).map((p: string) => (
                                            <DropdownMenuItem key={p} onClick={() => updateRow(entry.id, 'particulars', p)} className="text-xs font-bold uppercase p-2.5 rounded-xl cursor-pointer">
                                              {p}
                                            </DropdownMenuItem>
                                          ))}
                                        </ScrollArea>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild className="p-0">
                                          <Link href="/settings?tab=master" className="flex items-center gap-2 p-2.5 text-[10px] font-black uppercase text-primary hover:bg-primary/5 cursor-pointer">
                                            <Settings className="h-3 w-3" /> Manage Particulars
                                          </Link>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>

                                {entry.type === 'debit' ? (
                                  <div className="col-span-2 lg:col-span-1">
                                    <Label className="lg:hidden text-[9px] font-black uppercase text-muted-foreground mb-1 block">Vendor</Label>
                                    <Select value={entry.vendorName} onValueChange={(v) => updateRow(entry.id, 'vendorName', v)}>
                                      <SelectTrigger className="h-10 text-[10px] font-bold uppercase border-none bg-muted/20 rounded-xl shadow-sm"><SelectValue placeholder="Select Vendor"/></SelectTrigger>
                                      <SelectContent className="rounded-xl">
                                        {(vendorsData || []).map((vendor: any) => <SelectItem key={vendor.id} value={vendor.name} className="text-[10px] uppercase font-bold">{vendor.name}</SelectItem>)}
                                        <SelectSeparator />
                                        <Button variant="ghost" className="w-full h-8 justify-start gap-2 text-[9px] font-black uppercase text-primary hover:bg-primary/5" onClick={() => setIsAddVendorOpen(true)}>
                                          <PlusCircle className="h-3 w-3 mr-1" /> Add New Vendor
                                        </Button>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                ) : (
                                  <div className="hidden lg:block"></div>
                                )}

                                <div className="space-y-1">
                                  <Label className="lg:hidden text-[9px] font-black uppercase text-muted-foreground mb-1 block">Rate ({currencySymbol})</Label>
                                  <Input type="number" placeholder="0" value={entry.rate || ""} onChange={(e) => updateRow(entry.id, 'rate', e.target.value)} className="h-10 text-sm font-black border-none bg-primary/5 text-primary text-center rounded-xl shadow-inner" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="lg:hidden text-[9px] font-black uppercase text-muted-foreground mb-1 block">Qty</Label>
                                  <Input type="number" placeholder="0" value={entry.qty || ""} onChange={(e) => updateRow(entry.id, 'qty', e.target.value)} className="h-10 text-sm font-black border-none bg-muted/20 text-center rounded-xl shadow-inner" />
                                </div>

                                <div className="space-y-1">
                                  <Label className="lg:hidden text-[9px] font-black uppercase text-muted-foreground mb-1 block">Unit</Label>
                                  <Select value={entry.unit} onValueChange={(v) => updateRow(entry.id, 'unit', v)}>
                                    <SelectTrigger className="h-10 text-[10px] font-black uppercase border-none bg-muted/20 rounded-xl shadow-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                      {(dynamicUnits || []).map((u: string) => <SelectItem key={u} value={u} className="text-[10px] uppercase font-bold">{u}</SelectItem>)}
                                      <SelectSeparator />
                                      <div className="p-1">
                                        <Button asChild variant="ghost" className="w-full h-8 justify-start gap-2 text-[9px] font-black uppercase text-primary hover:bg-primary/5">
                                          <Link href="/settings?tab=master"><Settings className="h-3 w-3 mr-1" /> Manage Units</Link>
                                        </Button>
                                      </div>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="lg:hidden text-[9px] font-black uppercase text-muted-foreground mb-1 block">Total ({currencySymbol})</Label>
                                  <div className="h-10 flex items-center justify-center text-xs font-black bg-primary/10 rounded-xl text-primary border border-primary/10 shadow-inner">
                                    {currencySymbol}{entry.amount.toLocaleString()}
                                  </div>
                                </div>

                                <div className="col-span-1 lg:col-span-1">
                                  <Label className="lg:hidden text-[9px] font-black uppercase text-muted-foreground mb-1 block">Category</Label>
                                  <Select value={entry.category} onValueChange={(v) => updateRow(entry.id, 'category', v)}>
                                    <SelectTrigger className="h-10 text-[10px] font-bold uppercase border-none bg-muted/20 rounded-xl shadow-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                      {(dynamicCategories || []).map((cat: string) => <SelectItem key={cat} value={cat} className="text-[10px] uppercase font-bold">{cat}</SelectItem>)}
                                      <SelectSeparator />
                                      <div className="p-1">
                                        <Button asChild variant="ghost" className="w-full h-8 justify-start gap-2 text-[9px] font-black uppercase text-primary hover:bg-primary/5">
                                          <Link href="/settings?tab=master"><Settings className="h-3 w-3 mr-1" /> Manage Categories</Link>
                                        </Button>
                                      </div>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="col-span-1 lg:col-span-1">
                                  <Label className="lg:hidden text-[9px] font-black uppercase text-muted-foreground mb-1 block">By</Label>
                                  <Select value={entry.entryBy} onValueChange={(v) => updateRow(entry.id, 'entryBy', v)}>
                                    <SelectTrigger className="h-10 text-[10px] font-bold uppercase border-none bg-muted/20 rounded-xl shadow-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                      <SelectItem value="Owner" className="text-[10px] uppercase font-bold">Owner</SelectItem>
                                      {(staffList || []).map((staff: any) => (
                                        <SelectItem key={staff.id} value={staff.name} className="text-[10px] uppercase font-bold">{staff.name}</SelectItem>
                                      ))}
                                      <SelectSeparator />
                                      <div className="p-1">
                                        <Button asChild variant="ghost" className="w-full h-8 justify-start gap-2 text-[9px] font-black uppercase text-primary hover:bg-primary/5">
                                          <Link href="/settings?tab=users"><Settings className="h-3 w-3 mr-1" /> Manage Team</Link>
                                        </Button>
                                      </div>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="flex items-center justify-center gap-2 col-span-2 lg:col-span-1">
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={() => toggleRowNote(entry.id)}
                                    className={cn("h-9 w-9 rounded-xl border-none shadow-sm", expandedRows[entry.id] ? "bg-primary text-white" : "bg-muted/30 text-muted-foreground")}
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="hidden lg:flex h-9 w-9 text-destructive/40 hover:text-destructive hover:bg-destructive/5 rounded-xl opacity-0 group-hover/row:opacity-100 transition-all" onClick={() => removeRow(entry.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {expandedRows[entry.id] && (
                              <div className="px-4 lg:px-8 py-4 bg-muted/10 animate-in slide-in-from-top-2 duration-200">
                                <div className="space-y-2">
                                  <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Internal Note / Remark (Optional)</Label>
                                  <Textarea 
                                    placeholder="Type any extra details or remarks here..." 
                                    value={entry.notes || ""}
                                    onChange={(e) => updateRow(entry.id, 'notes', e.target.value)}
                                    className="h-20 rounded-xl bg-white border-none shadow-inner text-xs font-bold p-4"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="p-6 border-t bg-muted/5 flex justify-center">
                        <Button variant="outline" size="sm" className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary shadow-sm hover:bg-primary/5" onClick={addRow}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Row
                        </Button>
                      </div>
                    </div>
                  </ScrollArea>

                  <div className="bg-muted/30 p-4 md:p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-t shrink-0 z-20">
                    <div className="flex gap-6 md:gap-10 overflow-x-auto scrollbar-hide w-full sm:w-auto px-2">
                      <div className="space-y-0.5 shrink-0">
                        <p className="text-[8px] md:text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Batch Credit</p>
                        <p className="text-lg md:text-xl font-black text-green-600">{currencySymbol}{batchStats.credit.toLocaleString()}</p>
                      </div>
                      <div className="space-y-0.5 shrink-0">
                        <p className="text-[8px] md:text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Batch Debit</p>
                        <p className="text-lg md:text-xl font-black text-destructive">{currencySymbol}{batchStats.debit.toLocaleString()}</p>
                      </div>
                      <div className="space-y-0.5 shrink-0">
                        <p className="text-[8px] md:text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Net Total</p>
                        <p className={cn("text-lg md:text-xl font-black", batchStats.net >= 0 ? "text-primary" : "text-destructive")}>{currencySymbol}{batchStats.net.toLocaleString()}</p>
                      </div>
                    </div>
                    <Button className="h-12 w-full md:w-auto px-12 bg-primary font-black uppercase text-xs tracking-widest shadow-xl rounded-2xl active:scale-95 transition-all" onClick={handleSaveBatch}>
                      Post Batch Entries
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search descriptions..." className="h-11 pl-10 text-xs bg-white border-none shadow-inner rounded-xl w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-none shadow-sm bg-white rounded-2xl p-6 border-l-4 border-l-slate-500 relative overflow-hidden group">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Opening Balance</p>
          <div className="text-2xl md:text-3xl font-black text-slate-600">{currencySymbol}{stats.openingBalance.toLocaleString()}</div>
        </Card>
        
        <Card className="border-none shadow-sm bg-white rounded-2xl p-6 border-l-4 border-l-purple-500 relative overflow-hidden group">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Current Balance</p>
          <div className="text-2xl md:text-3xl font-black text-purple-600">{currencySymbol}{stats.currentBalance.toLocaleString()}</div>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl p-6 border-l-4 border-l-amber-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><AlertCircle className="h-10 w-10 text-amber-600" /></div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Period NC</p>
          <div className="text-2xl md:text-3xl font-black text-amber-600">{currencySymbol}{stats.periodNC.toLocaleString()}</div>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl p-6 border-l-4 border-l-blue-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Clock className="h-10 w-10 text-blue-600" /></div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Period Due</p>
          <div className="text-2xl md:text-3xl font-black text-blue-600">{currencySymbol}{stats.periodDue.toLocaleString()}</div>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl p-6 border-l-4 border-l-green-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp className="h-10 w-10 text-green-600" /></div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Period Cash In</p>
          <div className="text-2xl md:text-3xl font-black text-green-600">{currencySymbol}{stats.periodCredit.toLocaleString()}</div>
        </Card>
        
        <Card className="border-none shadow-sm bg-white rounded-2xl p-6 border-l-4 border-l-destructive relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><TrendingDown className="h-10 w-10 text-destructive" /></div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Period Cash Out</p>
          <div className="text-2xl md:text-3xl font-black text-destructive">{currencySymbol}{stats.periodDebit.toLocaleString()}</div>
        </Card>
        
        <Card className={cn(
          "p-6 rounded-2xl border-l-4 shadow-sm relative overflow-hidden group",
          stats.netBalance >= 0 ? "border-l-primary bg-primary/5" : "border-l-destructive bg-destructive/5"
        )}>
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Wallet className="h-10 w-10 text-primary" /></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Net Balance</p>
          <div className={cn("text-2xl md:text-3xl font-black", stats.netBalance >= 0 ? "text-primary" : "text-destructive")}>
            {currencySymbol}{stats.netBalance.toLocaleString()}
          </div>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
        <div className="hidden md:block">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow className="bg-muted/10">
                <TableHead className="text-[10px] font-black uppercase pl-8 h-12">Type</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Date</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Particulars</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Vendor</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12 text-right">Rate</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12 text-right">Qty</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Unit</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12 text-right">Total</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Category</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Payment</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Added By</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Remark</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isEntriesLoading ? (
                <TableRow><TableCell colSpan={6} className="h-40 text-center opacity-40"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filteredEntries.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-40 text-center opacity-40 uppercase text-[10px] font-black italic tracking-widest">No entries found for this window.</TableCell></TableRow>
              ) : (
                filteredEntries.map((entry) => (
                  <React.Fragment key={entry.id}>
                    <TableRow 
                      className="group hover:bg-muted/5 transition-colors cursor-pointer"
                      onClick={() => toggleReportNote(entry.id)}
                    >
                      <TableCell className="pl-8 py-5">
                        <Badge className={cn("text-[8px] font-black uppercase", entry.type === 'credit' ? "bg-green-100 text-green-700" : entry.type === 'debit' ? "bg-red-100 text-red-700" : entry.type === 'nc' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")}>{entry.type}</Badge>
                      </TableCell>
                      <TableCell className="text-[10px] font-black text-slate-400 uppercase">{new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</TableCell>
                      <TableCell className="text-sm font-bold text-slate-900">{entry.particulars}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-600">{entry.vendorName || '-'}</TableCell>
                      <TableCell className="text-right text-xs font-medium text-slate-500">{entry.rate}</TableCell>
                      <TableCell className="text-right text-xs font-medium text-slate-500">{entry.qty}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-600">{entry.unit || '-'}</TableCell>
                      <TableCell className="text-right font-black text-sm">{currencySymbol}{entry.amount.toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 border-primary/10 text-primary bg-primary/5">{entry.category}</Badge></TableCell>
                      <TableCell className="text-xs font-bold text-slate-600">{entry.paymentMethod || '-'}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-600">{entry.addedBy || entry.entryBy || 'Owner'}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-600 truncate max-w-[100px]">{entry.remark || entry.notes || '-'}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-full" onClick={() => setEditTarget({...entry, rate: entry.rate.toString(), qty: entry.qty.toString()})}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-full" onClick={() => setDeleteTarget(entry.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedReportRows[entry.id] && entry.notes && (
                      <TableRow className="bg-muted/5 animate-in slide-in-from-top-1">
                        <TableCell colSpan={6} className="pl-12 py-4">
                          <div className="flex items-start gap-3">
                            <CornerDownRight className="h-4 w-4 text-primary/40 mt-0.5" />
                            <div className="p-4 bg-white rounded-2xl border shadow-sm max-w-2xl">
                              <p className="text-[9px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Entry Remark</p>
                              <p className="text-xs font-bold text-slate-600 leading-relaxed italic">"{entry.notes}"</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
          <div className="p-4 flex justify-center">
            <Button variant="outline" onClick={() => setPageLimit(prev => prev + 20)} className="rounded-xl font-black uppercase tracking-widest text-xs">Load More</Button>
          </div>
        </div>

        <div className="md:hidden divide-y divide-border">
          {isEntriesLoading ? (
            <div className="p-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-20 text-center opacity-30 text-[10px] font-black uppercase italic tracking-widest">No matching records</div>
          ) : (
            filteredEntries.map((entry) => (
              <div 
                key={entry.id} 
                className="p-5 space-y-4 hover:bg-muted/5 transition-colors cursor-pointer"
                onClick={() => toggleReportNote(entry.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-8 w-8 rounded-xl flex items-center justify-center shrink-0",
                      entry.type === 'credit' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                    )}>
                      {entry.type === 'credit' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate">{entry.particulars}</p>
                        {entry.notes && <Badge variant="secondary" className="h-3 text-[6px] font-black px-1 uppercase">Note</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-black text-muted-foreground uppercase">{new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                        <Separator orientation="vertical" className="h-2" />
                        <span className="text-[9px] font-black text-muted-foreground uppercase">{entry.category}</span>
                      </div>
                    </div>
                  </div>
                  <p className={cn("text-lg font-black", entry.type === 'credit' ? "text-green-600" : "text-destructive")}>
                    {entry.type === 'credit' ? '+' : '-'} {currencySymbol}{entry.amount.toLocaleString()}
                  </p>
                </div>
                
                {expandedReportRows[entry.id] && entry.notes && (
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 animate-in zoom-in-95">
                    <p className="text-[8px] font-black uppercase text-primary mb-1 tracking-widest">Remark</p>
                    <p className="text-xs font-bold text-slate-600 leading-relaxed">"{entry.notes}"</p>
                  </div>
                )}

                <div className="flex items-center justify-between bg-muted/20 p-2.5 rounded-xl border border-transparent">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Rate: {currencySymbol}{entry.rate} × {entry.qty} {entry.unit}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase">By: {entry.entryBy || 'Owner'}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-full" onClick={() => setDeleteTarget(entry.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-full" onClick={() => setEditTarget({...entry, rate: entry.rate.toString(), qty: entry.qty.toString()})}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
          <div className="p-4">
              <Button variant="outline" onClick={() => setPageLimit(prev => prev + 20)} className="w-full rounded-xl font-black uppercase tracking-widest text-xs">Load More</Button>
          </div>
        </div>
      </Card>
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black uppercase tracking-widest text-lg">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-muted-foreground">This action cannot be undone. Are you sure you want to permanently remove this entry?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-black uppercase tracking-widest">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 rounded-xl font-black uppercase tracking-widest">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="rounded-2xl border-none shadow-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-widest text-lg">Edit Entry</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label>Particulars</Label>
                <Input value={editTarget.particulars} onChange={(e) => setEditTarget({...editTarget, particulars: e.target.value})} className="rounded-xl"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label>Rate</Label>
                    <Input type="number" value={editTarget.rate} onChange={(e) => {
                        const rate = parseFloat(e.target.value) || 0;
                        const qty = parseFloat(editTarget.qty) || 0;
                        setEditTarget({...editTarget, rate: e.target.value, amount: rate * qty});
                    }} className="rounded-xl"/>
                </div>
                <div className="space-y-1.5">
                    <Label>Qty</Label>
                    <Input type="number" value={editTarget.qty} onChange={(e) => {
                        const rate = parseFloat(editTarget.rate) || 0;
                        const qty = parseFloat(e.target.value) || 0;
                        setEditTarget({...editTarget, qty: e.target.value, amount: rate * qty});
                    }} className="rounded-xl"/>
                </div>
              </div>
               <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={editTarget.notes} onChange={(e) => setEditTarget({...editTarget, notes: e.target.value})} className="rounded-xl"/>
              </div>
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setEditTarget(null)} className="rounded-xl font-black uppercase tracking-widest">Cancel</Button>
            <Button onClick={handleUpdate} className="bg-primary hover:bg-primary/90 rounded-xl font-black uppercase tracking-widest">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddVendorOpen} onOpenChange={setIsAddVendorOpen}>
        <DialogContent className="rounded-2xl border-none shadow-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-widest text-lg">Register Supplier Node</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="space-y-1.5"><Label>Full Name *</Label><Input value={newVendorName} onChange={(e) => setNewVendorName(e.target.value)} className="rounded-xl"/></div>
            <div className="space-y-1.5"><Label>WhatsApp *</Label><Input value={newVendorPhone} onChange={(e) => setNewVendorPhone(e.target.value)} className="rounded-xl"/></div>
            <div className="space-y-1.5"><Label>Business Identity</Label><Input placeholder="Business Name" className="rounded-xl"/></div>
            <div className="space-y-1.5"><Label>GSTIN</Label><Input placeholder="GSTIN" className="rounded-xl"/></div>
            <div className="col-span-2 space-y-1.5"><Label>Billing Address</Label><Textarea placeholder="Address" className="rounded-xl"/></div>
            <div className="col-span-2 space-y-1.5"><Label>Opening Dues (₹)</Label><Input type="number" defaultValue="0" className="rounded-xl"/></div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
                if(!businessId || !newVendorName) return;
                addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'vendors'), {
                    name: newVendorName,
                    phone: newVendorPhone,
                    createdAt: serverTimestamp()
                });
                setIsAddVendorOpen(false);
                setNewVendorName("");
                setNewVendorPhone("");
                toast({ title: "Vendor Added", description: `${newVendorName} added successfully.` });
            }} className="w-full bg-primary hover:bg-primary/90 rounded-xl font-black uppercase tracking-widest h-12">ESTABLISH SUPPLY NODE</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
