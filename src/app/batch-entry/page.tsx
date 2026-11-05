'use client';

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Layers, 
  ArrowLeft, 
  Settings, 
  Trash2, 
  Plus, 
  Search, 
  Copy, 
  Calendar, 
  Check, 
  LayoutGrid, 
  Table as TableIcon, 
  Loader2, 
  Building2, 
  CreditCard, 
  User, 
  Tag, 
  FileText,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking, useCollection } from "@/firebase";
import { collection, query, serverTimestamp, doc, runTransaction, increment, where, limit, getDocs } from "firebase/firestore";
import { calculateGst } from "@/lib/gst-logic";

const FALLBACK_CATEGORIES = ["Sales", "Expense", "Rent", "Salary", "Purchase", "Utility", "Other"];
const DEFAULT_UNITS = ["pcs", "kg", "box", "packet", "unit", "litre", "meter"];
const FALLBACK_PARTICULARS = ["Tea & Snacks", "Conveyance", "Office Cleaning", "Stationery Purchase", "Customer Refund"];

type EntryType = 'credit' | 'debit' | 'nc' | 'due';

type DraftEntry = { 
  id: string; 
  type: EntryType; 
  particulars: string; 
  rate: string; 
  qty: string; 
  unit: string; 
  amount: number; 
  category: string; 
  addedBy: string; 
  vendorName?: string; 
  remark: string; 
  paymentMethod: string;
  gstRate?: number;
  taxAmount?: number;
  staffId?: string;
};

export default function BatchEntryPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);
  
  const vendorsQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'vendors') : null, [firestore, businessId]);
  const { data: vendorsData = [] } = useCollection<any>(vendorsQuery);

  const dynamicParticulars = business?.commonParticulars || FALLBACK_PARTICULARS;
  
  const dynamicUnits = business?.baseUnits || DEFAULT_UNITS;
  const dynamicCategories = business?.cashbookCategories || FALLBACK_CATEGORIES;
  const paymentMethods = business?.paymentModes || ["Cash", "UPI", "Card", "Bank Transfer"];
  const currencySymbol = business?.currencySymbol || business?.currency || '₹';

  const staffQuery = useMemoFirebase(() => businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null, [firestore, businessId]);
  const { data: staffList = [] } = useCollection<any>(staffQuery);
  
  const allParticulars = useMemo(() => {
    const list = [...dynamicParticulars];
    staffList.forEach((s: any) => {
        list.push(`${s.name} [${s.role || 'Staff'}]`);
    });
    return list;
  }, [dynamicParticulars, staffList]);

  const [draftEntries, setDraftEntries] = useState<DraftEntry[]>([
    { 
      id: '1', 
      type: 'credit', 
      particulars: '', 
      rate: '', 
      qty: '', 
      unit: dynamicUnits[0] || 'pcs', 
      amount: 0, 
      category: dynamicCategories[0] || 'Sales', 
      addedBy: '', 
      remark: '', 
      paymentMethod: paymentMethods[0] || 'Cash' 
    }
  ]);
  const [commonDate, setCommonDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [activeSearchRowId, setActiveSearchRowId] = useState<string | null>(null);
  const [rowSearchTerms, setRowSearchTerms] = useState<Record<string, string>>({});

  useEffect(() => { 
    setCommonDate(new Date().toISOString().split('T')[0]); 
  }, []);

  // Update dynamic units/categories when business loads if first row still has default
  useEffect(() => {
    if (dynamicUnits.length > 0 && dynamicCategories.length > 0 && paymentMethods.length > 0) {
      setDraftEntries(prev => prev.map(entry => ({
        ...entry,
        unit: entry.unit || dynamicUnits[0],
        category: entry.category || dynamicCategories[0],
        paymentMethod: entry.paymentMethod || paymentMethods[0]
      })));
    }
  }, [business]);

  const updateRow = (id: string, key: keyof DraftEntry, value: any) => {
    setDraftEntries(prev => prev.map(e => {
      if (e.id === id) {
        const updated = { ...e, [key]: value };
        if (key === 'rate' || key === 'qty') {
          const r = parseFloat(key === 'rate' ? value : e.rate) || 0;
          const q = parseFloat(key === 'qty' ? value : e.qty) || 0;
          updated.amount = Math.round(r * q * 100) / 100;
        }
        return updated;
      }
      return e;
    }));
  };

  const addRow = () => {
    const newEntry: DraftEntry = { 
      id: Date.now().toString(), 
      type: 'credit', 
      particulars: '', 
      rate: '', 
      qty: '', 
      unit: dynamicUnits[0] || 'pcs', 
      amount: 0, 
      category: dynamicCategories[0] || 'Sales', 
      addedBy: userProfile?.name || '', 
      remark: '', 
      paymentMethod: paymentMethods[0] || 'Cash',
      staffId: ''
    };
    setDraftEntries(prev => [...prev, newEntry]);
  };

  const duplicateRow = (entry: DraftEntry) => {
    const duplicated: DraftEntry = {
      ...entry,
      id: Date.now().toString(),
      remark: entry.remark ? `${entry.remark} (Copy)` : ''
    };
    setDraftEntries(prev => [...prev, duplicated]);
    toast({ title: "Entry Duplicated", description: "Copied entry values to a new row." });
  };

  const removeRow = (id: string) => {
    if (draftEntries.length > 1) {
      setDraftEntries(prev => prev.filter(e => e.id !== id));
    } else {
      toast({ title: "Cannot Remove", description: "At least one row is required." });
    }
  };

  const batchStats = useMemo(() => {
    const credit = draftEntries.filter(e => e.type === 'credit').reduce((sum, e) => sum + (e.amount || 0), 0);
    const debit = draftEntries.filter(e => e.type === 'debit').reduce((sum, e) => sum + (e.amount || 0), 0);
    const nc = draftEntries.filter(e => e.type === 'nc').reduce((sum, e) => sum + (e.amount || 0), 0);
    const due = draftEntries.filter(e => e.type === 'due').reduce((sum, e) => sum + (e.amount || 0), 0);
    return { credit, debit, nc, due, net: credit - debit };
  }, [draftEntries]);

  const handleSaveBatch = async () => {
    if (!businessId) {
      toast({ variant: "destructive", title: "Error", description: "Business account not loaded yet." });
      return;
    }

    const validEntries = draftEntries.filter(e => e.particulars.trim().length > 0);
    if (validEntries.length === 0) {
      toast({ variant: "destructive", title: "Missing Particulars", description: "Please enter particulars for at least one entry." });
      return;
    }

    setIsSubmitting(true);
    try {
      await runTransaction(firestore, async (transaction) => {
        const entriesRef = collection(firestore, 'businesses', businessId, 'cashbook');
        const productsRef = collection(firestore, 'businesses', businessId, 'products');

        const findProduct = async (name: string) => {
          const q = query(productsRef, where('name', '==', name), limit(1));
          const snapshot = await getDocs(q);
          return snapshot.empty ? null : snapshot.docs[0];
        };

        for (const entry of validEntries) {
          const vendor = vendorsData.find(v => v.name === entry.vendorName);
          const partyState = vendor?.state || business?.state || "Maharashtra";
          
          const gstResult = calculateGst(
            entry.amount,
            entry.gstRate || 0,
            business?.gstMode || 'exclusive',
            business?.state || "Maharashtra",
            partyState
          );

          if (entry.type === 'credit' || entry.type === 'debit') {
            const productDoc = await findProduct(entry.particulars);
            if (productDoc) {
              const productData = productDoc.data();
              const qty = Number(entry.qty) || 0;
              if (qty > 0) {
                if (entry.type === 'credit') {
                  if ((productData.stock || 0) < qty) {
                    throw new Error(`Insufficient stock for ${entry.particulars}. Available: ${productData.stock || 0}`);
                  }
                  transaction.update(productDoc.ref, { stock: increment(-qty) });
                } else {
                  transaction.update(productDoc.ref, { stock: increment(qty) });
                }
              }
            }
          }

          transaction.set(doc(entriesRef), {
            ...entry,
            ...gstResult,
            businessId,
            date: commonDate || new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp()
          });

          if (entry.category === 'Salary' && entry.staffId) {
            transaction.set(doc(collection(firestore, 'businesses', businessId, 'staffSettlements')), {
                staffId: entry.staffId,
                amount: entry.amount,
                date: commonDate || new Date().toISOString().split('T')[0],
                createdAt: serverTimestamp(),
                entryType: 'salary'
            });
          }
        }
      });

      toast({ 
        title: "Entries Recorded Successfully", 
        description: `Successfully added ${validEntries.length} cash entries.` 
      });
      router.push('/daily-entries');
    } catch (error: any) {
      console.error("Batch Transaction failed:", error);
      toast({ 
        variant: "destructive", 
        title: "Record Failed", 
        description: error?.message || "Failed to record cash entries." 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddQuickParticular = async (particularName: string) => {
    if (!businessRef || !business || !particularName.trim()) return;
    const currentList = dynamicParticulars || [];
    if (currentList.includes(particularName.trim())) return;
    const updatedParticulars = [...currentList, particularName.trim()];
    try {
      await updateDocumentNonBlocking(businessRef, { commonParticulars: updatedParticulars });
      toast({ title: "Master Item Added", description: `"${particularName}" added to master particulars list.` });
    } catch (e) {
      console.error("Error updating particulars:", e);
      toast({ variant: "destructive", title: "Error", description: "Failed to add particular." });
    }
  };

  const getTypeStyle = (type: EntryType) => {
    switch (type) {
      case 'credit':
        return {
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Credit (+)',
          accentBorder: 'border-l-emerald-500'
        };
      case 'debit':
        return {
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          label: 'Debit (-)',
          accentBorder: 'border-l-rose-500'
        };
      case 'nc':
        return {
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          label: 'NC (Free)',
          accentBorder: 'border-l-amber-500'
        };
      case 'due':
        return {
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
          label: 'Due Pay',
          accentBorder: 'border-l-blue-500'
        };
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] flex flex-col bg-slate-50/70 text-slate-900">
      {/* Responsive Header */}
      <header className="bg-primary text-white shadow-md shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left: Back button + Title */}
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => router.push('/daily-entries')}
                className="text-white hover:bg-white/15 h-9 w-9 sm:h-10 sm:w-10 rounded-xl shrink-0"
                title="Back to Daily Entries"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shrink-0 shadow-inner">
                  <Layers className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base sm:text-xl font-bold tracking-tight">Record Cash Entries</h1>
                    <Badge variant="secondary" className="bg-white/20 text-white border-none text-[9px] font-black uppercase px-2 py-0.5 hidden sm:inline-flex">
                      Batch Entry
                    </Badge>
                  </div>
                  <p className="text-[10px] sm:text-xs text-white/80 font-medium">
                    Multi-row rate × quantity cash booking
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Date Picker + View Mode Switcher */}
            <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end">
              {/* Date Input */}
              <div className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl px-2.5 sm:px-3 py-1.5 transition-colors">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/80 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/70 hidden md:inline">Date:</span>
                <input 
                  type="date" 
                  value={commonDate} 
                  onChange={(e) => setCommonDate(e.target.value)} 
                  className="bg-transparent text-white text-xs sm:text-sm font-semibold outline-none cursor-pointer"
                />
              </div>

              {/* View Mode Toggle (Cards vs Table) */}
              <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/15">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                    viewMode === 'cards' 
                      ? "bg-white text-primary shadow-sm" 
                      : "text-white/80 hover:text-white"
                  )}
                  title="Card View (Optimized for Mobile/Tablet)"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase hidden sm:inline">Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                    viewMode === 'table' 
                      ? "bg-white text-primary shadow-sm" 
                      : "text-white/80 hover:text-white"
                  )}
                  title="Table View (Optimized for Wide Screens)"
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase hidden sm:inline">Table</span>
                </button>
              </div>

              {/* Mobile quick add button */}
              <Button 
                onClick={addRow}
                size="sm"
                className="bg-white text-primary hover:bg-white/90 font-bold text-xs h-8 sm:h-9 px-3 rounded-xl shadow-sm sm:hidden"
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 space-y-4">
        {/* Helper Banner for quick instructions */}
        <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-3 sm:p-4 flex items-start sm:items-center justify-between gap-3 text-blue-950">
          <div className="flex items-start sm:items-center gap-2.5">
            <Info className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-xs">
              <span className="font-bold">Tip: </span> 
              Type any item name or description; rate × quantity automatically computes the row total. Stock updates automatically if item exists in inventory.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/daily-entries" className="text-[11px] font-bold text-primary hover:underline hidden sm:inline">
              Daily Cash Book →
            </Link>
          </div>
        </div>

        {/* View Mode 1: Responsive Cards View (Mobile & Tablet Friendly) */}
        {viewMode === 'cards' && (
          <div className="space-y-4">
            {draftEntries.map((entry, idx) => {
              const typeMeta = getTypeStyle(entry.type);
              const searchVal = rowSearchTerms[entry.id] || '';
              const filteredParticulars = allParticulars.filter((p: string) => 
                p.toLowerCase().includes(searchVal.toLowerCase())
              );
              const isSearchOpen = activeSearchRowId === entry.id && searchVal.length > 0;

              return (
                <div 
                  key={entry.id}
                  className={cn(
                    "bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-visible transition-all hover:shadow-md border-l-4",
                    typeMeta.accentBorder
                  )}
                >
                  {/* Card Header */}
                  <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs font-bold text-slate-700 bg-white">
                        #{idx + 1}
                      </Badge>

                      {/* Type Selector (Pills) */}
                      <div className="flex items-center bg-slate-200/60 p-0.5 rounded-xl">
                        {(['credit', 'debit', 'nc', 'due'] as EntryType[]).map((t) => {
                          const isActive = entry.type === t;
                          let activeBg = "bg-primary text-white";
                          if (t === 'credit') activeBg = "bg-emerald-600 text-white";
                          if (t === 'debit') activeBg = "bg-rose-600 text-white";
                          if (t === 'nc') activeBg = "bg-amber-600 text-white";
                          if (t === 'due') activeBg = "bg-blue-600 text-white";

                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => updateRow(entry.id, 'type', t)}
                              className={cn(
                                "px-2 py-1 text-[10px] sm:text-xs font-bold uppercase rounded-lg transition-all",
                                isActive ? `${activeBg} shadow-sm` : "text-slate-600 hover:text-slate-900"
                              )}
                            >
                              {t === 'credit' ? 'Credit (+)' : t === 'debit' ? 'Debit (-)' : t === 'nc' ? 'NC' : 'Due'}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Amount preview & row actions */}
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none">Row Total</span>
                        <span className={cn(
                          "text-base sm:text-lg font-black tracking-tight",
                          entry.type === 'credit' ? "text-emerald-600" : entry.type === 'debit' ? "text-rose-600" : entry.type === 'nc' ? "text-amber-600" : "text-blue-600"
                        )}>
                          {currencySymbol}{entry.amount.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => duplicateRow(entry)}
                          className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                          title="Duplicate row"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(entry.id)}
                          disabled={draftEntries.length <= 1}
                          className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-30"
                          title="Delete row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {/* Card Body: Responsive form fields */}
                  <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                    {/* Row 1: Particulars & Vendor */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                      {/* Particulars input with autocomplete */}
                      <div className="space-y-1.5 relative">
                        {/* ... label ... */}
                        <div className="relative">
                          <Input 
                            placeholder="Particulars (e.g., Tea & Snacks) or Member Name (e.g., Khoman Sahu)..." 
                            value={entry.particulars} 
                            onChange={(e) => {
                              updateRow(entry.id, 'particulars', e.target.value);
                              setRowSearchTerms(prev => ({ ...prev, [entry.id]: e.target.value }));
                              setActiveSearchRowId(entry.id);
                            }}
                            onFocus={() => {
                              setActiveSearchRowId(entry.id);
                              setRowSearchTerms(prev => ({ ...prev, [entry.id]: entry.particulars || '' }));
                            }}
                            className="pr-10 text-xs sm:text-sm font-medium h-10 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white"
                          />
                          {entry.particulars && !dynamicParticulars.includes(entry.particulars) && !entry.particulars.endsWith(" [Staff]") && (
                            <button
                              type="button"
                              onClick={() => handleAddQuickParticular(entry.particulars)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600 hover:bg-emerald-50 p-1 rounded-md transition-colors"
                              title="Add to Master Particulars"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {isSearchOpen && (
                          <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                            <div className="p-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 border-b">
                              Suggested Particulars
                            </div>
                            {filteredParticulars.length > 0 ? (
                              filteredParticulars.map((item: string) => (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => {
                                    const suffixMatch = item.match(/ \[(.+)\]$/);
                                    const isStaff = !!suffixMatch;
                                    const name = isStaff ? item.replace(/ \[(.+)\]$/, "") : item;
                                    const staff = isStaff ? staffList.find((s: any) => s.name === name) : null;
                                    
                                    updateRow(entry.id, 'particulars', name);
                                    if (isStaff && staff) {
                                        updateRow(entry.id, 'staffId', staff.id);
                                        updateRow(entry.id, 'category', 'Salary');
                                    }
                                    setActiveSearchRowId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-primary/5 hover:text-primary transition-colors flex items-center justify-between"
                                >
                                  <span>{item}</span>
                                  <span className="text-[9px] text-slate-400">Select</span>
                                </button>
                              ))
                            ) : (
                              <div className="p-3 text-xs text-slate-500 text-center">
                                No exact matches. Click <span className="font-bold text-emerald-600">+</span> to save as master particular.
                              </div>
                            )}
                            <div className="p-2 border-t bg-slate-50 flex items-center justify-between">
                              <Link href="/settings?tab=master" className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                                <Settings className="h-3 w-3" /> Manage Master Particulars
                              </Link>
                              <button
                                type="button"
                                onClick={() => setActiveSearchRowId(null)}
                                className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Vendor Selector */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-slate-400" /> Vendor / Supplier
                          </Label>
                          <Link href="/vendors" className="text-[10px] font-bold text-primary hover:underline">
                            + Vendors
                          </Link>
                        </div>
                        <Select 
                          value={entry.vendorName || "none"} 
                          onValueChange={(v) => updateRow(entry.id, 'vendorName', v === "none" ? "" : v)}
                        >
                          <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl bg-slate-50/50 border-slate-200">
                            <SelectValue placeholder="Select Vendor (Optional)" />
                          </SelectTrigger>
                          <SelectContent className="max-h-64 rounded-xl shadow-xl">
                            <SelectItem value="none" className="text-xs text-slate-400 italic">None / General</SelectItem>
                            {(vendorsData || []).map((v: any) => (
                              <SelectItem key={v.id} value={v.name} className="text-xs font-semibold">{v.name}</SelectItem>
                            ))}
                            <SelectSeparator />
                            <div 
                              className="px-2 py-2 text-xs font-bold text-primary hover:bg-muted cursor-pointer flex items-center gap-2" 
                              onClick={() => router.push('/vendors')}
                            >
                              <Settings className="h-3 w-3" /> Manage Vendors Directory
                            </div>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Row 2: Rate, Quantity, Unit, GST, and Calculated Total */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                          Rate ({currencySymbol})
                        </Label>
                        <Input 
                          type="number" 
                          step="any"
                          placeholder="0.00" 
                          value={entry.rate} 
                          onChange={(e) => updateRow(entry.id, 'rate', e.target.value)} 
                          className="h-10 text-xs sm:text-sm font-semibold rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white text-right"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                          Qty
                        </Label>
                        <Input 
                          type="number" 
                          step="any"
                          placeholder="0" 
                          value={entry.qty} 
                          onChange={(e) => updateRow(entry.id, 'qty', e.target.value)} 
                          className="h-10 text-xs sm:text-sm font-semibold rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white text-right"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                          Unit
                        </Label>
                        <Select value={entry.unit} onValueChange={(v) => updateRow(entry.id, 'unit', v)}>
                          <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl bg-slate-50/50 border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl">
                            {dynamicUnits.map((u: string) => (
                              <SelectItem key={u} value={u} className="text-xs font-semibold">{u}</SelectItem>
                            ))}
                            <SelectSeparator />
                            <div 
                              className="px-2 py-2 text-xs font-bold text-primary hover:bg-muted cursor-pointer flex items-center gap-2" 
                              onClick={() => router.push('/settings?tab=master')}
                            >
                              <Settings className="h-3 w-3" /> Manage Units
                            </div>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                          GST %
                        </Label>
                        <Select value={(entry.gstRate || 0).toString()} onValueChange={(v) => updateRow(entry.id, 'gstRate', parseFloat(v))}>
                          <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl bg-slate-50/50 border-slate-200">
                            <SelectValue placeholder="0%" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl">
                            {(business?.gstSlabs || [0, 5, 12, 18, 28]).map((slab: number) => (
                              <SelectItem key={slab} value={slab.toString()} className="text-xs font-semibold">{slab}%</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                          Total Amount
                        </Label>
                        <div className="h-10 px-3 flex items-center justify-end rounded-xl bg-slate-100 text-slate-800 font-black text-sm border border-slate-200">
                          {currencySymbol}{entry.amount.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Category, Payment Mode, Staff, and Remark */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                          <Tag className="h-2.5 w-2.5 text-slate-400" /> Category
                        </Label>
                        <Select value={entry.category} onValueChange={(v) => updateRow(entry.id, 'category', v)}>
                          <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl bg-slate-50/50 border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl">
                            {dynamicCategories.map((c: string) => (
                              <SelectItem key={c} value={c} className="text-xs font-semibold">{c}</SelectItem>
                            ))}
                            <SelectSeparator />
                            <div 
                              className="px-2 py-2 text-xs font-bold text-primary hover:bg-muted cursor-pointer flex items-center gap-2" 
                              onClick={() => router.push('/settings?tab=master')}
                            >
                              <Settings className="h-3 w-3" /> Manage Categories
                            </div>
                          </SelectContent>
                        </Select>
                      </div>

                      {entry.category === 'Salary' && (
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                <User className="h-2.5 w-2.5 text-slate-400" /> Staff Member
                            </Label>
                            <Select value={entry.staffId || ""} onValueChange={(v) => updateRow(entry.id, 'staffId', v)}>
                                <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl bg-slate-50/50 border-slate-200">
                                    <SelectValue placeholder="Select Staff..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl shadow-xl">
                                    {staffList.map((s: any) => (
                                        <SelectItem key={s.id} value={s.id} className="text-xs font-semibold">{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                      )}

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                          <CreditCard className="h-2.5 w-2.5 text-slate-400" /> Payment Mode
                        </Label>
                        <Select value={entry.paymentMethod} onValueChange={(v) => updateRow(entry.id, 'paymentMethod', v)}>
                          <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl bg-slate-50/50 border-slate-200">
                            <SelectValue placeholder="Payment Mode" />
                          </SelectTrigger>
                          <SelectContent className="max-h-64 rounded-xl shadow-xl">
                            {(paymentMethods || []).map((p: string) => (
                              <SelectItem key={p} value={p} className="text-xs font-semibold">{p}</SelectItem>
                            ))}
                            <SelectSeparator />
                            <div 
                              className="px-2 py-2 text-xs font-bold text-primary hover:bg-muted cursor-pointer flex items-center gap-2" 
                              onClick={() => router.push('/settings?tab=payments')}
                            >
                              <Settings className="h-3 w-3" /> Manage Payment Modes
                            </div>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                          <User className="h-2.5 w-2.5 text-slate-400" /> Added By / Staff
                        </Label>
                        <Select value={entry.addedBy || "Owner"} onValueChange={(v) => updateRow(entry.id, 'addedBy', v)}>
                          <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl bg-slate-50/50 border-slate-200">
                            <SelectValue placeholder="Staff..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-64 rounded-xl shadow-xl">
                            <SelectItem value="Owner" className="text-xs font-semibold">Owner / Admin</SelectItem>
                            {(staffList || []).map((s: any) => (
                              <SelectItem key={s.id} value={s.name || s.email} className="text-xs font-semibold">
                                {s.name || s.email}
                              </SelectItem>
                            ))}
                            <SelectSeparator />
                            <div 
                              className="px-2 py-2 text-xs font-bold text-primary hover:bg-muted cursor-pointer flex items-center gap-2" 
                              onClick={() => router.push('/settings?tab=team')}
                            >
                              <Settings className="h-3 w-3" /> Manage Staff Members
                            </div>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                          <FileText className="h-2.5 w-2.5 text-slate-400" /> Remark / Note
                        </Label>
                        <Input 
                          placeholder="Optional note..." 
                          value={entry.remark} 
                          onChange={(e) => updateRow(entry.id, 'remark', e.target.value)} 
                          className="h-10 text-xs sm:text-sm rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View Mode 2: Spreadsheet Table View (Horizontal scroll container for wide screens) */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
            <div className="overflow-visible">
              <table className="w-full text-left border-collapse min-w-[1300px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3 w-28">Type</th>
                    <th className="p-3 min-w-[220px]">Particulars</th>
                    <th className="p-3 w-36">Vendor</th>
                    <th className="p-3 w-24 text-right">Rate ({currencySymbol})</th>
                    <th className="p-3 w-20 text-right">Qty</th>
                    <th className="p-3 w-24">Unit</th>
                    <th className="p-3 w-24 text-right">GST %</th>
                    <th className="p-3 w-28 text-right">Total ({currencySymbol})</th>
                    <th className="p-3 w-32">Category</th>
                    <th className="p-3 w-32">Payment</th>
                    <th className="p-3 w-32">Staff</th>
                    <th className="p-3 min-w-[150px]">Remark</th>
                    <th className="p-3 w-20 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {draftEntries.map((entry, idx) => {
                    const searchVal = rowSearchTerms[entry.id] || '';
                    const filteredParticulars = allParticulars.filter((p: string) => 
                      p.toLowerCase().includes(searchVal.toLowerCase())
                    );
                    const isSearchOpen = activeSearchRowId === entry.id && searchVal.length > 0;

                    return (
                      <tr key={entry.id} className="bg-white hover:bg-slate-50/70 transition-colors">
                        <td className="p-2.5 text-center font-mono font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="p-2.5">
                          <Select value={entry.type} onValueChange={(v: any) => updateRow(entry.id, 'type', v)}>
                            <SelectTrigger className={cn(
                              "h-9 text-xs font-bold rounded-lg border-none shadow-none",
                              entry.type === 'credit' ? "bg-emerald-50 text-emerald-700" :
                              entry.type === 'debit' ? "bg-rose-50 text-rose-700" :
                              entry.type === 'nc' ? "bg-amber-50 text-amber-700" :
                              "bg-blue-50 text-blue-700"
                            )}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl">
                              <SelectItem value="credit" className="text-emerald-700 font-bold">Credit (+)</SelectItem>
                              <SelectItem value="debit" className="text-rose-700 font-bold">Debit (-)</SelectItem>
                              <SelectItem value="nc" className="text-amber-700 font-bold">NC (Free)</SelectItem>
                              <SelectItem value="due" className="text-blue-700 font-bold">Due Pay</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2.5 relative">
                          <div className="relative">
                            <Input 
                              placeholder="Particulars..." 
                              value={entry.particulars} 
                              onChange={(e) => {
                                updateRow(entry.id, 'particulars', e.target.value);
                                setRowSearchTerms(prev => ({ ...prev, [entry.id]: e.target.value }));
                                setActiveSearchRowId(entry.id);
                              }}
                              onFocus={() => {
                                setActiveSearchRowId(entry.id);
                                setRowSearchTerms(prev => ({ ...prev, [entry.id]: entry.particulars || '' }));
                              }}
                              className="h-9 text-xs rounded-lg pr-7"
                            />
                            {entry.particulars && !dynamicParticulars.includes(entry.particulars) && (
                              <button 
                                type="button" 
                                onClick={() => handleAddQuickParticular(entry.particulars)}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-emerald-600 hover:bg-emerald-50 p-0.5 rounded"
                                title="Add to Master"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          {isSearchOpen && (
                            <div className="absolute left-0 right-0 z-[100] mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto w-full">
                              {filteredParticulars.length > 0 ? (
                                filteredParticulars.map((item: string) => (
                                  <div 
                                    key={item} 
                                    onClick={() => {
                                      const suffixMatch = item.match(/ \[(.+)\]$/);
                                      const isStaff = !!suffixMatch;
                                      const name = isStaff ? item.replace(/ \[(.+)\]$/, "") : item;
                                      const staff = isStaff ? staffList.find((s: any) => s.name === name) : null;
                                      
                                      updateRow(entry.id, 'particulars', name);
                                      if (isStaff && staff) {
                                          updateRow(entry.id, 'staffId', staff.id);
                                          updateRow(entry.id, 'category', 'Salary');
                                      }
                                      setActiveSearchRowId(null);
                                    }}
                                    className="px-3 py-2 text-xs hover:bg-primary/5 cursor-pointer border-b"
                                  >
                                    {item}
                                  </div>
                                ))
                              ) : (
                                <div className="p-2 text-[10px] text-slate-400 italic text-center">No matches</div>
                              )}
                              <Link href="/settings?tab=master" className="flex items-center gap-2 p-2.5 text-[10px] font-black uppercase text-primary hover:bg-primary/5 cursor-pointer border-t">
                                <Settings className="h-3 w-3" /> Manage Particulars
                              </Link>
                            </div>
                          )}

                        </td>
                        <td className="p-2.5">
                          <Select value={entry.vendorName || "none"} onValueChange={(v) => updateRow(entry.id, 'vendorName', v === "none" ? "" : v)}>
                            <SelectTrigger className="h-9 text-xs rounded-lg">
                              <SelectValue placeholder="Vendor..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-60 rounded-xl shadow-xl">
                              <SelectItem value="none" className="text-xs text-slate-400 italic">None</SelectItem>
                              {(vendorsData || []).map((v: any) => (
                                <SelectItem key={v.id} value={v.name} className="text-xs">{v.name}</SelectItem>
                              ))}
                              <SelectSeparator />
                              <div 
                                className="px-2 py-2 text-xs font-bold text-primary hover:bg-muted cursor-pointer flex items-center gap-2" 
                                onClick={() => router.push('/vendors')}
                              >
                                <Settings className="h-3 w-3" /> Manage Vendors
                              </div>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2.5">
                          <Input 
                            type="number" 
                            step="any"
                            placeholder="0" 
                            value={entry.rate} 
                            onChange={(e) => updateRow(entry.id, 'rate', e.target.value)} 
                            className="h-9 w-24 text-xs font-semibold text-right rounded-lg"
                          />
                        </td>
                        <td className="p-2.5">
                          <Input 
                            type="number" 
                            step="any"
                            placeholder="1" 
                            value={entry.qty} 
                            onChange={(e) => updateRow(entry.id, 'qty', e.target.value)} 
                            className="h-9 w-20 text-xs font-semibold text-right rounded-lg"
                          />
                        </td>
                        <td className="p-2.5">
                          <Select value={entry.unit} onValueChange={(v) => updateRow(entry.id, 'unit', v)}>
                            <SelectTrigger className="h-9 text-xs rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl">
                              {dynamicUnits.map((u: string) => (
                                <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
                              ))}
                              <SelectSeparator />
                              <div 
                                className="px-2 py-2 text-xs font-bold text-primary hover:bg-muted cursor-pointer flex items-center gap-2" 
                                onClick={() => router.push('/settings?tab=master')}
                              >
                                <Settings className="h-3 w-3" /> Manage Units
                              </div>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2.5">
                          <Select value={(entry.gstRate || 0).toString()} onValueChange={(v) => updateRow(entry.id, 'gstRate', parseFloat(v))}>
                             <SelectTrigger className="h-9 w-20 text-xs font-semibold rounded-lg">
                               <SelectValue placeholder="0%" />
                             </SelectTrigger>
                             <SelectContent className="max-h-60 rounded-xl shadow-xl">
                                {(business?.gstSlabs || [0, 5, 12, 18, 28]).map((slab: number) => (
                                  <SelectItem key={slab} value={slab.toString()} className="text-xs font-semibold">{slab}%</SelectItem>
                                ))}
                             </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2.5 text-right font-black text-slate-800">
                          {currencySymbol}{entry.amount.toLocaleString()}
                        </td>
                        <td className="p-2.5">
                          <Select value={entry.category} onValueChange={(v) => updateRow(entry.id, 'category', v)}>
                            <SelectTrigger className="h-9 text-xs rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl">
                              {dynamicCategories.map((c: string) => (
                                <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                              ))}
                              <SelectSeparator />
                              <div 
                                className="px-2 py-2 text-xs font-bold text-primary hover:bg-muted cursor-pointer flex items-center gap-2" 
                                onClick={() => router.push('/settings?tab=master')}
                              >
                                <Settings className="h-3 w-3" /> Manage Categories
                              </div>
                            </SelectContent>
                          </Select>
                          {entry.category === 'Salary' && (
                              <Select value={entry.staffId || ""} onValueChange={(v) => updateRow(entry.id, 'staffId', v)}>
                                  <SelectTrigger className="h-9 mt-1 text-xs rounded-lg w-full">
                                      <SelectValue placeholder="Staff..." />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl shadow-xl">
                                      {staffList.map((s: any) => (
                                          <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                                      ))}
                                  </SelectContent>
                              </Select>
                          )}
                        </td>
                        <td className="p-2.5">
                          <Select value={entry.paymentMethod} onValueChange={(v) => updateRow(entry.id, 'paymentMethod', v)}>
                            <SelectTrigger className="h-9 text-xs rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl">
                              {(paymentMethods || []).map((p: string) => (
                                <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                              ))}
                              <SelectSeparator />
                              <div 
                                className="px-2 py-2 text-xs font-bold text-primary hover:bg-muted cursor-pointer flex items-center gap-2" 
                                onClick={() => router.push('/settings?tab=payments')}
                              >
                                <Settings className="h-3 w-3" /> Manage Payments
                              </div>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2.5">
                          <Select value={entry.addedBy || "Owner"} onValueChange={(v) => updateRow(entry.id, 'addedBy', v)}>
                            <SelectTrigger className="h-9 text-xs rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl">
                              <SelectItem value="Owner" className="text-xs font-semibold">Owner</SelectItem>
                              {(staffList || []).map((s: any) => (
                                <SelectItem key={s.id} value={s.name || s.email} className="text-xs">{s.name || s.email}</SelectItem>
                              ))}
                              <SelectSeparator />
                              <div 
                                className="px-2 py-2 text-xs font-bold text-primary hover:bg-muted cursor-pointer flex items-center gap-2" 
                                onClick={() => router.push('/settings?tab=team')}
                              >
                                <Settings className="h-3 w-3" /> Manage Team
                              </div>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2.5">
                          <Input 
                            placeholder="Remark..." 
                            value={entry.remark} 
                            onChange={(e) => updateRow(entry.id, 'remark', e.target.value)} 
                            className="h-9 text-xs rounded-lg"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => duplicateRow(entry)} 
                              className="h-7 w-7 text-slate-400 hover:text-slate-700 rounded-md"
                              title="Duplicate"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeRow(entry.id)} 
                              disabled={draftEntries.length <= 1}
                              className="h-7 w-7 text-rose-400 hover:text-rose-600 rounded-md disabled:opacity-30"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Row Button */}
        <div className="pt-2">
          <Button 
            onClick={addRow} 
            variant="outline" 
            className="w-full h-11 border-dashed border-2 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary font-bold text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Another Entry (Row #{draftEntries.length + 1})
          </Button>
        </div>
      </main>

      {/* Persistent Footer */}
      <footer className="shrink-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-2xl p-3 sm:p-4 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
          {/* Summary Statistics Cards (Responsive Grid on Mobile) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 w-full md:w-auto">
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2 sm:p-2.5 text-center">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 block">Batch Credit</span>
              <span className="text-sm sm:text-base font-black text-emerald-700">{currencySymbol}{batchStats.credit.toLocaleString()}</span>
            </div>
            <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-2 sm:p-2.5 text-center">
              <span className="text-[9px] font-black uppercase tracking-wider text-rose-700 block">Batch Debit</span>
              <span className="text-sm sm:text-base font-black text-rose-700">{currencySymbol}{batchStats.debit.toLocaleString()}</span>
            </div>
            <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-2 sm:p-2.5 text-center hidden sm:block">
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 block">NC Total</span>
              <span className="text-sm sm:text-base font-black text-amber-700">{currencySymbol}{batchStats.nc.toLocaleString()}</span>
            </div>
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-2 sm:p-2.5 text-center hidden sm:block">
              <span className="text-[9px] font-black uppercase tracking-wider text-blue-700 block">Due Total</span>
              <span className="text-sm sm:text-base font-black text-blue-700">{currencySymbol}{batchStats.due.toLocaleString()}</span>
            </div>
            <div className={cn(
              "col-span-2 sm:col-span-1 rounded-xl p-2 sm:p-2.5 text-center border",
              batchStats.net >= 0 ? "bg-primary/10 border-primary/20 text-primary" : "bg-rose-100/60 border-rose-300 text-rose-700"
            )}>
              <span className="text-[9px] font-black uppercase tracking-wider block opacity-80">Net Total</span>
              <span className="text-sm sm:text-base font-black">{currencySymbol}{batchStats.net.toLocaleString()}</span>
            </div>
          </div>

          {/* Action Button: Post Batch Entries */}
          <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
            <Button
              onClick={handleSaveBatch}
              disabled={isSubmitting}
              className="w-full md:w-auto min-w-[200px] h-11 sm:h-12 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recording Entries...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Post {draftEntries.filter(e => e.particulars.trim().length > 0).length} Entries ({currencySymbol}{batchStats.net.toLocaleString()})
                </>
              )}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
