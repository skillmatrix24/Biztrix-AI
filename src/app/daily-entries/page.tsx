
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
import { collection, query, orderBy, serverTimestamp, doc, where, limit, runTransaction, increment, getDocs, DocumentReference } from "firebase/firestore";
import { Separator } from "@/components/ui/separator";
import { calculateGst } from "@/lib/gst-logic";
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
  unit: z.string().optional(),
  vendorName: z.string().optional(),
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
  const dynamicUnits: string[] = business?.baseUnits || DEFAULT_UNITS;
  const dynamicCategories: string[] = business?.cashbookCategories || FALLBACK_CATEGORIES;
  const dynamicParticulars: string[] = business?.commonParticulars || FALLBACK_PARTICULARS;

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

  const [filters, setFilters] = useState({
    dateRange: 'today' as DateFilterType,
    particulars: '',
    vendor: 'all',
    category: 'all',
    addedBy: 'all',
    type: 'all',
    minRate: '',
    maxRate: '',
    customDateRange: { from: undefined, to: undefined } as { from: Date | undefined; to: Date | undefined }
  });
  
  const [pageLimit, setPageLimit] = useState(20);
  const [isAddOpen, setIsAddOpen] = useState(false);
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
        if (!filters.customDateRange?.from || !filters.customDateRange?.to) return true;
        return isWithinInterval(entryDate, { start: startOfDay(filters.customDateRange.from), end: endOfDay(filters.customDateRange.to) });
      default:
        return true;
    }
  };

  // Historical data for balance calculation
  const historicalEntriesQuery = useMemoFirebase(() => {
    if (!businessId) return null;
    return query(
      collection(firestore, 'businesses', businessId, 'cashbook'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, businessId]);
  const { data: historicalEntriesData } = useCollection<any>(historicalEntriesQuery);
  const historicalEntries = historicalEntriesData || [];

  const [commonDate, setCommonDate] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<DraftEntry | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [expandedReportRows, setExpandedReportRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCommonDate(new Date().toISOString().split('T')[0]);
  }, []);

  const [draftEntries, setDraftEntries] = useState<DraftEntry[]>([
    { id: '1', type: 'credit', particulars: '', rate: '', qty: '', unit: dynamicUnits[0] || 'pcs', amount: 0, category: dynamicCategories[0] || 'Sales', entryBy: 'Owner', notes: '' }
  ]);

  const filteredEntries = useMemo(() => {
    let list = entries || [];
    list = list.filter(e => {
      const matchesDate = isDateInRange(e.date, filters.dateRange);
      const matchesParticulars = e.particulars?.toLowerCase().includes(filters.particulars.toLowerCase());
      const matchesVendor = filters.vendor === 'all' || e.vendorName === filters.vendor;
      const matchesCategory = filters.category === 'all' || e.category === filters.category;
      const matchesAddedBy = filters.addedBy === 'all' || (e.entryBy || e.addedBy) === filters.addedBy;
      const matchesType = filters.type === 'all' || e.type === filters.type;
      const matchesRate = 
        (filters.minRate === '' || parseFloat(e.rate) >= parseFloat(filters.minRate)) &&
        (filters.maxRate === '' || parseFloat(e.rate) <= parseFloat(filters.maxRate));
      
      return matchesDate && matchesParticulars && matchesVendor && matchesCategory && matchesAddedBy && matchesType && matchesRate;
    });

    if (sortConfig) {
      list.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        
        if (sortConfig.key === 'amount' || sortConfig.key === 'rate') {
            valA = parseFloat(valA) || 0;
            valB = parseFloat(valB) || 0;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [entries, filters, sortConfig]);

  const stats = useMemo(() => {
    const list = entries || [];
    const historicalList = historicalEntries || [];
    const now = new Date();
    
    // Determine the start date of the filter
    let filterStart: Date;
    switch (filters.dateRange) {
      case 'today': filterStart = startOfDay(now); break;
      case 'yesterday': filterStart = startOfDay(subDays(now, 1)); break;
      case 'last7': filterStart = startOfDay(subDays(now, 7)); break;
      case 'last30': filterStart = startOfDay(subDays(now, 30)); break;
      case 'thisMonth': filterStart = startOfMonth(now); break;
      case 'lastMonth': filterStart = startOfMonth(subMonths(now, 1)); break;
      case 'custom': filterStart = filters.customDateRange?.from ? startOfDay(filters.customDateRange.from) : new Date(0); break;
      case 'all': filterStart = new Date(0); break;
      default: filterStart = new Date(0);
    }

    // Calculate sum of all transactions before the filter start
    const historicalBalance = historicalList.reduce((sum, e) => {
      if (!e.date) return sum;
      const entryDate = parseISO(e.date);
      // Use the set opening balance date as the baseline, if not set use filter start
      const balanceStartDate = business?.openingBalanceDate ? parseISO(business.openingBalanceDate) : new Date(0);
      
      if (entryDate >= balanceStartDate && entryDate < filterStart) {
        const amount = parseFloat(e.amount) || 0;
        return e.type === 'credit' ? sum + amount : e.type === 'debit' ? sum - amount : sum;
      }
      return sum;
    }, 0);

    const periodEntries = list.filter(e => isDateInRange(e.date, filters.dateRange));
    
    const credit = periodEntries
      .filter(e => e.type === 'credit')
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    
    const debit = periodEntries
      .filter(e => e.type === 'debit')
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    const opening = (business?.openingBalance || 0) + historicalBalance;

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
      openingBalance: opening,
      currentBalance: opening + (credit - debit)
    };
  }, [entries, historicalEntries, filters.dateRange, filters.customDateRange, business?.openingBalance, business?.openingBalanceDate]);

  const batchStats = useMemo(() => {
    const credit = draftEntries.filter(e => e.type === 'credit').reduce((sum, e) => sum + (e.amount || 0), 0);
    const debit = draftEntries.filter(e => e.type === 'debit').reduce((sum, e) => sum + (e.amount || 0), 0);
    const nc = draftEntries.filter(e => e.type === 'nc').reduce((sum, e) => sum + (e.amount || 0), 0);
    const due = draftEntries.filter(e => e.type === 'due').reduce((sum, e) => sum + (e.amount || 0), 0);
    return { credit, debit, nc, due, net: credit - debit };
  }, [draftEntries]);

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
    
    const validEntries: z.infer<typeof entrySchema>[] = [];
    for (const entry of draftEntries) {
        if (!entry.particulars && entry.amount === 0) continue; 
        
        const result = entrySchema.safeParse(entry);
        if (!result.success) {
            toast({ variant: "destructive", title: "Validation Error", description: `${entry.particulars || 'Entry'}: ${result.error.issues[0]?.message || 'Invalid entry'}` });
            return;
        }
        validEntries.push(result.data);
    }

    if (validEntries.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Please fill at least one complete entry." });
      return;
    }

    try {
        const productsRef = collection(firestore, 'businesses', businessId, 'products');
        const productRefMap = new Map<string, DocumentReference>();
        for (const entry of validEntries) {
            if (!productRefMap.has(entry.particulars)) {
                const q = query(productsRef, where('name', '==', entry.particulars), limit(1));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    productRefMap.set(entry.particulars, querySnapshot.docs[0].ref);
                }
            }
        }

        await runTransaction(firestore, async (transaction) => {
            const entriesRef = collection(firestore, 'businesses', businessId, 'cashbook');
            const productSnapshots = new Map<string, { ref: DocumentReference; stock: number }>();

            for (const [particulars, prodRef] of productRefMap.entries()) {
                const prodSnap = await transaction.get(prodRef);
                if (prodSnap.exists()) {
                    const pData = prodSnap.data();
                    productSnapshots.set(particulars, { ref: prodRef, stock: Number(pData.stock) || 0 });
                }
            }

            for (const entry of validEntries) {
                const prodInfo = productSnapshots.get(entry.particulars);
                if (prodInfo) {
                    const qty = Number(entry.qty);
                    if (entry.type === 'credit') { // Sale
                        if (prodInfo.stock < qty) {
                            throw new Error(`Insufficient stock for ${entry.particulars}`);
                        }
                        prodInfo.stock -= qty;
                        transaction.update(prodInfo.ref, { stock: increment(-qty) });
                    } else { // Purchase
                        prodInfo.stock += qty;
                        transaction.update(prodInfo.ref, { stock: increment(qty) });
                    }
                }
            }

            // Fetch vendor info to determine state for tax calc
            const vendorNames = validEntries.map(e => e.vendorName).filter(Boolean) as string[];
            const vendorDocs = await getDocs(query(collection(firestore, 'businesses', businessId, 'vendors'), where('name', 'in', vendorNames)));
            const vendorMap = new Map();
            vendorDocs.forEach(doc => vendorMap.set(doc.data().name, doc.data()));

            validEntries.forEach(entry => {
                const vendor = vendorMap.get(entry.vendorName);
                const partyState = vendor?.state || business?.state || "Maharashtra";

                const gstResult = calculateGst(
                    entry.amount,
                    entry.gstRate || 0,
                    business?.gstMode || 'exclusive',
                    business?.state || "Maharashtra",
                    partyState
                );

                transaction.set(doc(entriesRef), {
                    ...entry,
                    ...gstResult,
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
        toast({ variant: "destructive", title: "Validation Error", description: result.error.issues[0]?.message || "Invalid entry" });
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
    switch (filters.dateRange) {
      case 'today': return now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      case 'yesterday': return 'Yesterday';
      case 'last7': return 'Last 7 Days';
      case 'last30': return 'Last 30 Days';
      case 'thisMonth': return 'This Month';
      case 'lastMonth': return 'Last Month';
      case 'all': return 'Full History';
      case 'custom': return filters.customDateRange?.from ? `${filters.customDateRange.from.toLocaleDateString('en-IN', {day:'numeric', month:'short'})} - ${filters.customDateRange.to?.toLocaleDateString('en-IN', {day:'numeric', month:'short'}) || '...'}` : 'Select Range';
      default: return 'Filter Date';
    }
  };

  if (isProfileLoading || isUserLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      {/* Page Header */}
      <div className="flex flex-col gap-6">
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
        
        <div className="flex flex-wrap items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-11 px-4 font-black text-[10px] uppercase tracking-wider bg-white shadow-sm border-primary/10 text-primary rounded-xl">
                  <span className="flex items-center truncate"><Calendar className="mr-2 h-3.5 w-3.5 shrink-0" /> <span className="truncate">{getDateLabel()}</span></span>
                  <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 rounded-2xl border-none shadow-2xl p-1">
                <DropdownMenuLabel className="text-[8px] font-black uppercase tracking-widest p-2 opacity-40">Select Window</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setFilters(p => ({...p, dateRange: 'today'}))} className="text-xs font-bold uppercase p-3 cursor-pointer rounded-xl">Today</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilters(p => ({...p, dateRange: 'yesterday'}))} className="text-xs font-bold uppercase p-3 cursor-pointer rounded-xl">Yesterday</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilters(p => ({...p, dateRange: 'last7'}))} className="text-xs font-bold uppercase p-3 cursor-pointer rounded-xl">Last 7 Days</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilters(p => ({...p, dateRange: 'last30'}))} className="text-xs font-bold uppercase p-3 cursor-pointer rounded-xl">Last 30 Days</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilters(p => ({...p, dateRange: 'thisMonth'}))} className="text-xs font-bold uppercase p-3 cursor-pointer rounded-xl">This Month</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilters(p => ({...p, dateRange: 'lastMonth'}))} className="text-xs font-bold uppercase p-3 cursor-pointer rounded-xl">Last Month</DropdownMenuItem>
                <Separator className="my-1" />
                <DropdownMenuItem onClick={() => setFilters(p => ({...p, dateRange: 'all'}))} className="text-xs font-bold uppercase p-3 cursor-pointer text-primary rounded-xl">Full History</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 px-4 font-black text-[10px] uppercase tracking-wider bg-white shadow-sm border-primary/10 text-primary rounded-xl">
                  <span className="flex items-center"><CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" /> Range</span>
                  <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CustomDateRangePicker
                  value={{
                    startDate: filters.customDateRange?.from || new Date(),
                    endDate: filters.customDateRange?.to || new Date(),
                    key: 'selection'
                  }}
                  onChange={(range) => {
                    setFilters(p => ({...p, customDateRange: { from: range.startDate, to: range.endDate }, dateRange: 'custom'}));
                  }}
                />
              </PopoverContent>
            </Popover>

            <Button variant="outline" onClick={handleExport} className="h-11 px-4 font-black text-[10px] uppercase tracking-wider bg-white shadow-sm border-primary/10 text-primary rounded-xl">
              <FileText className="mr-2 h-3.5 w-3.5 shrink-0" /> Export
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 px-4 font-black text-[10px] uppercase tracking-wider bg-white shadow-sm border-primary/10 text-primary rounded-xl">
                  <Filter className="mr-2 h-3.5 w-3.5" /> Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 rounded-2xl border-none shadow-2xl p-5 space-y-4" align="start">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground">Particulars Search</Label>
                  <Input placeholder="Search..." value={filters.particulars} onChange={(e) => setFilters(p => ({...p, particulars: e.target.value}))} className="h-9 rounded-xl text-xs font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground">Type</Label>
                    <Select value={filters.type} onValueChange={(v) => setFilters(p => ({...p, type: v}))}>
                      <SelectTrigger className="h-9 text-xs font-bold rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl"><SelectItem value="all">All</SelectItem><SelectItem value="credit">Credit</SelectItem><SelectItem value="debit">Debit</SelectItem><SelectItem value="nc">NC</SelectItem><SelectItem value="due">Due</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground">Vendor</Label>
                    <Select value={filters.vendor} onValueChange={(v) => setFilters(p => ({...p, vendor: v}))}>
                      <SelectTrigger className="h-9 text-xs font-bold rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl"><SelectItem value="all">All</SelectItem>{(vendorsData || []).map(v => <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground">Category</Label>
                  <Select value={filters.category} onValueChange={(v) => setFilters(p => ({...p, category: v}))}>
                    <SelectTrigger className="h-9 text-xs font-bold rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl"><SelectItem value="all">All</SelectItem>{dynamicCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground">Min Rate</Label>
                    <Input type="number" placeholder="0" value={filters.minRate} onChange={(e) => setFilters(p => ({...p, minRate: e.target.value}))} className="h-9 rounded-xl text-xs font-bold" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground">Max Rate</Label>
                    <Input type="number" placeholder="0" value={filters.maxRate} onChange={(e) => setFilters(p => ({...p, maxRate: e.target.value}))} className="h-9 rounded-xl text-xs font-bold" />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Link href="/batch-entry" passHref>
              <Button className="bg-primary hover:bg-primary/90 shadow-xl h-11 px-6 font-black uppercase text-[10px] tracking-[0.1em] rounded-xl text-white">
                <Plus className="mr-2 h-4 w-4" /> Batch Entry
              </Button>
            </Link>
            </div>
            

          </div>


      <div className="grid gap-2.5 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm bg-white rounded-2xl p-3.5 sm:p-5 border-l-4 border-l-slate-500 relative overflow-hidden group">
          <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 truncate">Opening Balance</p>
          <div className="text-lg sm:text-2xl md:text-3xl font-black text-slate-600 truncate">{currencySymbol}{stats.openingBalance.toLocaleString()}</div>
        </Card>
        
        <Card className="border-none shadow-sm bg-white rounded-2xl p-3.5 sm:p-5 border-l-4 border-l-purple-500 relative overflow-hidden group">
          <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 truncate">Current Balance</p>
          <div className="text-lg sm:text-2xl md:text-3xl font-black text-purple-600 truncate">{currencySymbol}{stats.currentBalance.toLocaleString()}</div>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl p-3.5 sm:p-5 border-l-4 border-l-green-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" /></div>
          <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 truncate">Period Cash In</p>
          <div className="text-lg sm:text-2xl md:text-3xl font-black text-green-600 truncate">{currencySymbol}{stats.periodCredit.toLocaleString()}</div>
        </Card>
        
        <Card className="border-none shadow-sm bg-white rounded-2xl p-3.5 sm:p-5 border-l-4 border-l-destructive relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform"><TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-destructive" /></div>
          <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 truncate">Period Cash Out</p>
          <div className="text-lg sm:text-2xl md:text-3xl font-black text-destructive truncate">{currencySymbol}{stats.periodDebit.toLocaleString()}</div>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl p-3.5 sm:p-5 border-l-4 border-l-amber-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform"><AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600" /></div>
          <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 truncate">Period NC</p>
          <div className="text-lg sm:text-2xl md:text-3xl font-black text-amber-600 truncate">{currencySymbol}{stats.periodNC.toLocaleString()}</div>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl p-3.5 sm:p-5 border-l-4 border-l-blue-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform"><Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" /></div>
          <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 truncate">Period Due</p>
          <div className="text-lg sm:text-2xl md:text-3xl font-black text-blue-600 truncate">{currencySymbol}{stats.periodDue.toLocaleString()}</div>
        </Card>
        
        <Card className={cn(
          "col-span-2 p-3.5 sm:p-5 rounded-2xl border-l-4 shadow-sm relative overflow-hidden group",
          stats.netBalance >= 0 ? "border-l-primary bg-primary/5" : "border-l-destructive bg-destructive/5"
        )}>
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform"><Wallet className="h-6 w-6 sm:h-8 sm:w-8 text-primary" /></div>
          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary mb-1 truncate">Net Balance</p>
          <div className={cn("text-lg sm:text-2xl md:text-3xl font-black truncate", stats.netBalance >= 0 ? "text-primary" : "text-destructive")}>
            {currencySymbol}{stats.netBalance.toLocaleString()}
          </div>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
        <div className="hidden md:block overflow-x-auto w-full">
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
                <TableHead className="text-[10px] font-black uppercase h-12 text-right">GST %</TableHead>
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
                <TableRow><TableCell colSpan={14} className="h-40 text-center opacity-40"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filteredEntries.length === 0 ? (
                <TableRow><TableCell colSpan={14} className="h-40 text-center opacity-40 uppercase text-[10px] font-black italic tracking-widest">No entries found for this window.</TableCell></TableRow>
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
                      <TableCell className="text-right text-xs font-medium text-slate-500">{entry.gstRate || 0}%</TableCell>
                      <TableCell className="text-right font-black text-sm">{currencySymbol}{entry.amount.toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 border-primary/10 text-primary bg-primary/5">{entry.category}</Badge></TableCell>
                      <TableCell className="text-xs font-bold text-slate-600">{entry.paymentMethod || '-'}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-600">{entry.addedBy || entry.entryBy || 'Owner'}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-600 truncate max-w-[100px]">{entry.remark || entry.notes || '-'}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-full" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditTarget({...entry, rate: (entry.rate ?? 0).toString(), qty: (entry.qty ?? 0).toString()});
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-full" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(entry.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedReportRows[entry.id] && entry.notes && (
                      <TableRow className="bg-muted/5 animate-in slide-in-from-top-1">
                        <TableCell colSpan={13} className="pl-12 py-4">
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
          <div className="p-4 flex justify-center border-t">
            <Button variant="outline" onClick={() => setPageLimit(prev => prev + 20)} className="rounded-xl font-black uppercase tracking-widest text-xs">Load More</Button>
          </div>
        </div>

        <div className="md:hidden divide-y divide-border">
          {isEntriesLoading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Cash Book...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-16 text-center opacity-40 text-xs font-black uppercase italic tracking-widest">
              No matching records found
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isCredit = entry.type === 'credit';
              const isDebit = entry.type === 'debit';
              const isNC = entry.type === 'nc';
              const isDue = entry.type === 'due';

              return (
                <div 
                  key={entry.id} 
                  className="p-4 space-y-3 hover:bg-muted/5 transition-colors cursor-pointer bg-white active:bg-muted/10"
                  onClick={() => toggleReportNote(entry.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border",
                        isCredit && "bg-emerald-50 text-emerald-600 border-emerald-200/50",
                        isDebit && "bg-rose-50 text-rose-600 border-rose-200/50",
                        isNC && "bg-amber-50 text-amber-600 border-amber-200/50",
                        isDue && "bg-blue-50 text-blue-600 border-blue-200/50"
                      )}>
                        {isCredit && <ArrowUpRight className="h-4 w-4" />}
                        {isDebit && <ArrowDownLeft className="h-4 w-4" />}
                        {isNC && <FileText className="h-4 w-4" />}
                        {isDue && <Clock className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-slate-900 truncate block">
                            {entry.particulars}
                          </span>
                          {(entry.notes || entry.remark) && (
                            <Badge variant="secondary" className="h-4 text-[7px] font-black px-1 uppercase bg-primary/10 text-primary">
                              Note
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[9px] font-black text-muted-foreground uppercase">
                          <span>{new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          <span className="opacity-40">•</span>
                          <span>{entry.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={cn(
                        "text-base font-black tracking-tight",
                        isCredit && "text-emerald-600",
                        isDebit && "text-rose-600",
                        isNC && "text-amber-600",
                        isDue && "text-blue-600"
                      )}>
                        {isCredit ? '+' : isDebit ? '-' : ''} {currencySymbol}{entry.amount.toLocaleString()}
                      </p>
                      <Badge className={cn(
                        "text-[7px] font-black uppercase mt-0.5 h-4 px-1.5 border-none",
                        isCredit && "bg-emerald-100 text-emerald-700",
                        isDebit && "bg-rose-100 text-rose-700",
                        isNC && "bg-amber-100 text-amber-700",
                        isDue && "bg-blue-100 text-blue-700"
                      )}>
                        {entry.type}
                      </Badge>
                    </div>
                  </div>

                  {/* Vendor & Payment Badges if available */}
                  {(entry.vendorName || entry.paymentMethod) && (
                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      {entry.vendorName && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[9px] font-bold">
                          <span className="text-slate-400 font-medium">Vendor:</span> {entry.vendorName}
                        </div>
                      )}
                      {entry.paymentMethod && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[9px] font-bold">
                          <span className="text-slate-400 font-medium">Pay:</span> {entry.paymentMethod}
                        </div>
                      )}
                      {(entry.gstRate || 0) > 0 && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[9px] font-bold">
                          <span className="text-primary/70 font-medium">GST:</span> {entry.gstRate}%
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expanded Note preview if toggled */}
                  {expandedReportRows[entry.id] && (entry.notes || entry.remark) && (
                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 animate-in zoom-in-95">
                      <p className="text-[8px] font-black uppercase text-primary mb-1 tracking-widest flex items-center gap-1">
                        <MessageSquare className="h-2.5 w-2.5" /> Remark / Note
                      </p>
                      <p className="text-xs font-semibold text-slate-700 leading-relaxed italic">
                        "{entry.notes || entry.remark}"
                      </p>
                    </div>
                  )}

                  {/* Bottom Strip: Rate x Qty + Creator + Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[10px]">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">
                        Rate: {currencySymbol}{entry.rate} × {entry.qty} {entry.unit || 'units'}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">
                        By: {entry.addedBy || entry.entryBy || 'Owner'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-bold"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditTarget({...entry, rate: (entry.rate ?? 0).toString(), qty: (entry.qty ?? 0).toString()});
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(entry.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div className="p-4 bg-slate-50/50">
            <Button variant="outline" onClick={() => setPageLimit(prev => prev + 20)} className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-xs bg-white shadow-sm">
              Load More Entries
            </Button>
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
        <DialogContent className="rounded-2xl border-none shadow-2xl max-w-lg w-[95vw] sm:w-full p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-widest text-base sm:text-lg">Edit Entry</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4 pt-2 sm:pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-500">Particulars</Label>
                <Input value={editTarget.particulars || ""} onChange={(e) => setEditTarget({...editTarget, particulars: e.target.value})} className="rounded-xl h-11"/>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-500">Rate ({currencySymbol})</Label>
                  <Input type="number" value={editTarget.rate || ""} onChange={(e) => {
                    const rate = parseFloat(e.target.value) || 0;
                    const qty = parseFloat(editTarget.qty) || 0;
                    setEditTarget({...editTarget, rate: e.target.value, amount: rate * qty});
                  }} className="rounded-xl h-11"/>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-500">Quantity</Label>
                  <Input type="number" value={editTarget.qty || ""} onChange={(e) => {
                    const rate = parseFloat(editTarget.rate) || 0;
                    const qty = parseFloat(e.target.value) || 0;
                    setEditTarget({...editTarget, qty: e.target.value, amount: rate * qty});
                  }} className="rounded-xl h-11"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-500">Type</Label>
                  <Select value={editTarget.type} onValueChange={(v) => setEditTarget({...editTarget, type: v as any})}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Credit (+)</SelectItem>
                      <SelectItem value="debit">Debit (-)</SelectItem>
                      <SelectItem value="nc">NC (Free)</SelectItem>
                      <SelectItem value="due">Due Pay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-500">Category</Label>
                  <Select value={editTarget.category} onValueChange={(v) => setEditTarget({...editTarget, category: v})}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {dynamicCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-500">Unit</Label>
                  <Select value={editTarget.unit} onValueChange={(v) => setEditTarget({...editTarget, unit: v})}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {dynamicUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-500">Vendor</Label>
                  <Select value={editTarget.vendorName || "none"} onValueChange={(v) => setEditTarget({...editTarget, vendorName: v === "none" ? "" : v})}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {vendorsData.map((v: any) => <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-500">Notes / Remarks</Label>
                <Textarea value={editTarget.notes || ""} onChange={(e) => setEditTarget({...editTarget, notes: e.target.value})} className="rounded-xl min-h-[80px]"/>
              </div>
            </div>
          )}
          <DialogFooter className="pt-3 sm:pt-4 flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setEditTarget(null)} className="rounded-xl font-black uppercase tracking-widest w-full sm:w-auto h-11">Cancel</Button>
            <Button onClick={handleUpdate} className="bg-primary hover:bg-primary/90 rounded-xl font-black uppercase tracking-widest w-full sm:w-auto h-11">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddVendorOpen} onOpenChange={setIsAddVendorOpen}>
        <DialogContent className="rounded-2xl border-none shadow-2xl max-w-lg w-[95vw] sm:w-full p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-widest text-base sm:text-lg">Register Supplier Node</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2 sm:pt-4">
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase text-slate-500">Full Name *</Label><Input value={newVendorName || ""} onChange={(e) => setNewVendorName(e.target.value)} className="rounded-xl h-11"/></div>
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase text-slate-500">WhatsApp *</Label><Input value={newVendorPhone || ""} onChange={(e) => setNewVendorPhone(e.target.value)} className="rounded-xl h-11"/></div>
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase text-slate-500">Business Identity</Label><Input placeholder="Business Name" className="rounded-xl h-11"/></div>
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase text-slate-500">GSTIN</Label><Input placeholder="GSTIN" className="rounded-xl h-11"/></div>
            <div className="col-span-1 sm:col-span-2 space-y-1.5"><Label className="text-xs font-bold uppercase text-slate-500">Billing Address</Label><Textarea placeholder="Address" className="rounded-xl"/></div>
            <div className="col-span-1 sm:col-span-2 space-y-1.5"><Label className="text-xs font-bold uppercase text-slate-500">Opening Dues (₹)</Label><Input type="number" defaultValue="0" className="rounded-xl h-11"/></div>
          </div>
          <DialogFooter className="pt-3">
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
