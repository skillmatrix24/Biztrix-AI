'use client';
import React, { useState, useEffect, useMemo } from "react";
import { Layers, NotebookPen, Settings, Trash2, Plus, BookOpenText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking, useCollection } from "@/firebase";
import { collection, query, serverTimestamp, doc, runTransaction, increment, where, limit, getDocs } from "firebase/firestore";

const FALLBACK_CATEGORIES = ["Sales", "Expense", "Rent", "Salary", "Purchase", "Utility", "Other"];
const DEFAULT_UNITS = ["pcs", "kg", "box", "packet", "unit", "litre", "meter"];
const FALLBACK_PARTICULARS = ["Tea & Snacks", "Conveyance", "Office Cleaning", "Stationery Purchase", "Customer Refund"];

type DraftEntry = { id: string; type: 'credit' | 'debit' | 'nc' | 'due'; particulars: string; rate: string; qty: string; unit: string; amount: number; category: string; addedBy: string; vendorName?: string; remark: string; paymentMethod: string; };

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
    const { data: vendorsData } = useCollection<any>(vendorsQuery);

    const dynamicParticulars = business?.commonParticulars || FALLBACK_PARTICULARS;
    const dynamicUnits = business?.baseUnits || DEFAULT_UNITS;
    const dynamicCategories = business?.cashbookCategories || FALLBACK_CATEGORIES;
    const paymentMethods = business?.paymentModes || ["Cash", "UPI", "Card", "Bank Transfer"];

    const staffQuery = useMemoFirebase(() => businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null, [firestore, businessId]);
    const { data: staffList = [] } = useCollection<any>(staffQuery);

    const [draftEntries, setDraftEntries] = useState<DraftEntry[]>([{ id: '1', type: 'credit', particulars: '', rate: '', qty: '', unit: dynamicUnits[0], amount: 0, category: dynamicCategories[0], addedBy: '', remark: '', paymentMethod: paymentMethods[0] }]);
    const [commonDate, setCommonDate] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    
    useEffect(() => { setCommonDate(new Date().toISOString().split('T')[0]); }, []);

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

    const addRow = () => setDraftEntries([...draftEntries, { id: Date.now().toString(), type: 'credit', particulars: '', rate: '', qty: '', unit: dynamicUnits[0], amount: 0, category: dynamicCategories[0], addedBy: '', remark: '', paymentMethod: paymentMethods[0] }]);
    const removeRow = (id: string) => draftEntries.length > 1 && setDraftEntries(draftEntries.filter(e => e.id !== id));

    const batchStats = useMemo(() => {
        const credit = draftEntries.filter(e => e.type === 'credit').reduce((sum, e) => sum + (e.amount || 0), 0);
        const debit = draftEntries.filter(e => e.type === 'debit').reduce((sum, e) => sum + (e.amount || 0), 0);
        const nc = draftEntries.filter(e => e.type === 'nc').reduce((sum, e) => sum + (e.amount || 0), 0);
        const due = draftEntries.filter(e => e.type === 'due').reduce((sum, e) => sum + (e.amount || 0), 0);
        return { credit, debit, nc, due, net: credit - debit };
    }, [draftEntries]);

    const handleSaveBatch = async () => {
        if (!businessId) return;
        try {
            await runTransaction(firestore, async (transaction) => {
                const entriesRef = collection(firestore, 'businesses', businessId, 'cashbook');
                const productsRef = collection(firestore, 'businesses', businessId, 'products');
                // Helper to find product first
                const findProduct = async (name: string) => {
                    const q = query(productsRef, where('name', '==', name), limit(1));
                    const snapshot = await getDocs(q);
                    return snapshot.empty ? null : snapshot.docs[0];
                };

                for (const entry of draftEntries) {
                    if (!entry.particulars) continue;
                    
                    if (entry.type === 'credit' || entry.type === 'debit') {
                        const productDoc = await findProduct(entry.particulars);
                        if (productDoc) {
                            const productData = productDoc.data();
                            const qty = Number(entry.qty);
                            if (entry.type === 'credit') {
                                if ((productData.stock || 0) < qty) throw new Error(`Insufficient stock for ${entry.particulars}`);
                                transaction.update(productDoc.ref, { stock: increment(-qty) });
                            } else {
                                transaction.update(productDoc.ref, { stock: increment(qty) });
                            }
                        }
                    }
                    transaction.set(doc(entriesRef), { ...entry, businessId, date: commonDate, createdAt: serverTimestamp() });
                }
            });
            toast({ title: "Batch Recorded", description: `Added ${draftEntries.length} entries.` });
            router.push('/daily-entries');
        } catch (error) {
            console.error("Transaction failed:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to record batch." });
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {/* Fixed Header */}
            <header className="bg-primary p-6 text-white flex justify-between items-center shadow-md shrink-0">
                <div className="flex items-center gap-4">
                    <Layers className="h-8 w-8" />
                    <div>
                        <h1 className="text-xl font-bold">Record Cash Entries</h1>
                        <p className="text-xs text-white/70 uppercase tracking-widest">Multi-row rate × quantity booking</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Label className="text-white/70">ENTRY DATE</Label>
                    <input type="date" value={commonDate} onChange={(e) => setCommonDate(e.target.value)} className="bg-white/10 p-2 rounded-lg" />
                </div>
            </header>
            
            {/* Scrollable Content */}
            <ScrollArea className="flex-1">
                <div className="p-6">
                    <div className="grid grid-cols-[80px_1fr_120px_100px_80px_100px_100px_120px_120px_120px_150px_80px] gap-2 mb-4 text-[10px] font-black uppercase text-muted-foreground p-4 bg-white rounded-lg shadow-sm sticky top-0 z-10">
                        <div>Type</div><div>Particulars</div><div>Vendor</div><div>Rate</div><div>Qty</div><div>Unit</div><div>Total</div><div>Category</div><div>Payment</div><div>Added By</div><div>Remark</div><div>Actions</div>
                    </div>
                    {draftEntries.map((entry, idx) => {
                        const filteredParticulars = dynamicParticulars.filter(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
                        return (
                            <div key={entry.id} className="grid grid-cols-[80px_1fr_120px_100px_80px_100px_100px_120px_120px_120px_150px_80px] gap-2 items-center mb-2 bg-white p-2 rounded-lg shadow-sm">
                                <Select value={entry.type} onValueChange={(v: any) => updateRow(entry.id, 'type', v)}>
                                    <SelectTrigger className={cn("w-full text-xs font-bold", entry.type === 'credit' ? "text-green-600 bg-green-50 border-green-200" : entry.type === 'debit' ? "text-destructive bg-red-50 border-red-200" : entry.type === 'nc' ? "text-amber-600 bg-amber-50 border-amber-200" : "text-blue-600 bg-blue-50 border-blue-200")}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="credit">Credit (+)</SelectItem>
                                        <SelectItem value="debit">Debit (-)</SelectItem>
                                        <SelectItem value="nc">NC</SelectItem>
                                        <SelectItem value="due">Due</SelectItem>
                                    </SelectContent>
                                </Select>
                                
                                <div className="relative">
                                    <div className="flex">
                                        <Input 
                                            placeholder="Particulars..." 
                                            value={entry.particulars} 
                                            onChange={(e) => {
                                                updateRow(entry.id, 'particulars', e.target.value);
                                                setSearchTerm(e.target.value);
                                            }} 
                                            className="pr-8"
                                        />
                                        {!dynamicParticulars.includes(entry.particulars) && entry.particulars && (
                                            <Button variant="ghost" size="icon" onClick={async () => {
                                                if (!businessRef || !business) return;
                                                const updatedParticulars = [...(dynamicParticulars || []), entry.particulars];
                                                try {
                                                    await updateDocumentNonBlocking(businessRef, { commonParticulars: updatedParticulars });
                                                    toast({ title: "Added", description: `${entry.particulars} added to master list.` });
                                                } catch (e) {
                                                    console.error("Error updating particulars:", e);
                                                    toast({ variant: "destructive", title: "Error", description: "Failed to add particular." });
                                                }
                                            }}><Plus className="h-4 w-4 text-green-600"/></Button>
                                        )}
                                    </div>
                                    {searchTerm && (
                                        <div className="absolute z-50 w-full bg-white border rounded-md shadow-md mt-1 max-h-40 overflow-y-auto">
                                            {filteredParticulars.length > 0 ? (
                                                filteredParticulars.map(p => (
                                                    <div key={p} className="p-2 cursor-pointer hover:bg-muted" onClick={() => {updateRow(entry.id, 'particulars', p); setSearchTerm('');}}>{p}</div>
                                                ))
                                            ) : (
                                                <div className="p-2 text-xs text-muted-foreground">No matches found</div>
                                            )}
                                            <DropdownMenuSeparator />
                                            <div className="p-2">
                                                <Link href="/settings?tab=master" className="flex items-center text-xs text-primary font-bold"><Settings className="mr-2 h-3 w-3"/> Manage Data</Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="relative">
                                    <Select value={entry.vendorName} onValueChange={(v) => updateRow(entry.id, 'vendorName', v)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select Vendor..." />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-64 overflow-y-auto">
                                            {(vendorsData || []).map((v: any) => (
                                                <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                                            ))}
                                            <SelectSeparator />
                                            <div className="px-2 py-2 text-xs font-bold text-primary hover:bg-muted cursor-pointer flex items-center gap-2" onClick={() => router.push('/vendors')}><Settings className="h-3 w-3" /> Manage Vendors</div>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <Input type="number" placeholder="Rate" value={entry.rate} onChange={(e) => updateRow(entry.id, 'rate', e.target.value)} />
                                <Input type="number" placeholder="Qty" value={entry.qty} onChange={(e) => updateRow(entry.id, 'qty', e.target.value)} />
                                
                                <Select value={entry.unit} onValueChange={(v) => updateRow(entry.id, 'unit', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{dynamicUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}<SelectSeparator /><div className="px-2 py-2 text-xs font-bold text-primary hover:bg-muted cursor-pointer flex items-center gap-2" onClick={() => router.push('/settings?tab=master')}><Settings className="h-3 w-3" /> Manage Units</div></SelectContent>
                                </Select>
                                
                                <div className="font-bold text-center">₹{entry.amount}</div>
                                
                                <Select value={entry.category} onValueChange={(v) => updateRow(entry.id, 'category', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{dynamicCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}<SelectSeparator /><div className="px-2 py-2 text-xs font-bold text-primary hover:bg-muted cursor-pointer flex items-center gap-2" onClick={() => router.push('/settings?tab=master')}><Settings className="h-3 w-3" /> Manage Categories</div></SelectContent>
                                </Select>

                                <Select value={entry.paymentMethod} onValueChange={(v) => updateRow(entry.id, 'paymentMethod', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select Method..." /></SelectTrigger>
                                    <SelectContent className="max-h-64 overflow-y-auto">
                                        {(paymentMethods || []).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                        <SelectSeparator />
                                        <div className="px-2 py-2 text-xs font-bold text-primary hover:bg-muted cursor-pointer flex items-center gap-2" onClick={() => router.push('/settings?tab=payments')}><Settings className="h-3 w-3" /> Manage Methods</div>
                                    </SelectContent>
                                </Select>

                                <Select value={entry.addedBy} onValueChange={(v) => updateRow(entry.id, 'addedBy', v)}>
                                    <SelectTrigger><SelectValue placeholder="Staff..." /></SelectTrigger>
                                    <SelectContent className="max-h-64 overflow-y-auto">
                                        {(staffList || []).map((s: any) => <SelectItem key={s.id} value={s.name || s.email}>{s.name || s.email}</SelectItem>)}
                                        <SelectSeparator />
                                        <div className="px-2 py-2 text-xs font-bold text-primary hover:bg-muted cursor-pointer flex items-center gap-2" onClick={() => router.push('/settings?tab=team')}><Settings className="h-3 w-3" /> Manage Staff</div>
                                    </SelectContent>
                                </Select>

                                <Input placeholder="Remark..." value={entry.remark} onChange={(e) => updateRow(entry.id, 'remark', e.target.value)} />
                                
                                <Button variant="ghost" onClick={() => removeRow(entry.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                        );
                    })}
                    <Button onClick={addRow} variant="outline" className="w-full mt-4"><Plus className="mr-2" /> Add Row</Button>
                </div>
            </ScrollArea>
            
            {/* Fixed Footer */}
            <footer className="bg-white p-6 flex justify-between items-center border-t shadow-inner shrink-0">
                <div className="flex gap-8">
                    <div><p className="text-xs text-muted-foreground">BATCH CREDIT</p><p className="text-xl font-black text-green-600">₹{batchStats.credit}</p></div>
                    <div><p className="text-xs text-muted-foreground">BATCH DEBIT</p><p className="text-xl font-black text-destructive">₹{batchStats.debit}</p></div>
                    <div><p className="text-xs text-muted-foreground">NC TOTAL</p><p className="text-xl font-black text-amber-600">₹{batchStats.nc}</p></div>
                    <div><p className="text-xs text-muted-foreground">DUE TOTAL</p><p className="text-xl font-black text-blue-600">₹{batchStats.due}</p></div>
                    <div><p className="text-xs text-muted-foreground">NET TOTAL</p><p className={cn("text-xl font-black", batchStats.net >= 0 ? "text-primary" : "text-destructive")}>₹{batchStats.net}</p></div>
                </div>
                <Button onClick={handleSaveBatch} className="bg-primary text-white h-12 px-10 rounded-xl font-black">POST BATCH ENTRIES</Button>
            </footer>
        </div>
    );
}
