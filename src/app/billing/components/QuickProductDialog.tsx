"use client";

import { useState } from "react";
import { Package, Calculator, Truck, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectSeparator } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useFirestore, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { doc, collection, serverTimestamp, increment } from "firebase/firestore";
import { Product } from "@/lib/mock-db";
import Link from "next/link";

interface QuickProductDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveSuccess: (product: any) => void;
  business: any;
  vendorList: any[];
  userProfile: any;
  currencySymbol: string;
}

export function QuickProductDialog({ isOpen, onOpenChange, onSaveSuccess, business, vendorList, userProfile, currencySymbol }: QuickProductDialogProps) {
  const firestore = useFirestore();
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdStock, setNewProdStock] = useState("");
  const [newProdSku, setNewProdSku] = useState("");
  const [newProdGst, setNewProdGst] = useState("18");
  const [newProdHsn, setNewProdHsn] = useState("");
  const [newProdUnit, setNewProdUnit] = useState("pcs");
  const [newProdVendorId, setNewProdVendorId] = useState("none");

  const handleSaveProduct = () => {
    if (!newProdName || !newProdPrice || !business?.id) return;
    const productId = `p${Date.now()}`;
    const cost = parseFloat(newProdPrice) * 0.8;
    const product: any = { 
      id: productId, 
      tenantId: business.id, 
      name: newProdName, 
      sku: newProdSku || `SKU-${Date.now().toString().slice(-4)}`, 
      barcode: "", 
      hsnCode: newProdHsn, 
      price: parseFloat(newProdPrice), 
      cost: cost, 
      stock: parseInt(newProdStock) || 0, 
      minThreshold: 5, 
      gstRate: parseInt(newProdGst), 
      isActive: true, 
      unit: newProdUnit,
      vendorId: newProdVendorId !== "none" ? newProdVendorId : null,
      vendorName: newProdVendorId !== "none" ? (vendorList?.find((v: any) => v.id === newProdVendorId)?.name || null) : null,
      updatedAt: serverTimestamp()
    };
    
    setDocumentNonBlocking(doc(firestore, 'businesses', business.id, 'products', productId), product, { merge: true });

    if (newProdVendorId !== "none" && parseInt(newProdStock) > 0) {
      const totalCost = cost * parseInt(newProdStock);
      addDocumentNonBlocking(collection(firestore, 'businesses', business.id, 'cashbook'), {
        businessId: business.id,
        vendorId: newProdVendorId,
        vendorName: product.vendorName,
        type: 'credit',
        amount: totalCost,
        particulars: `Opening Stock: ${newProdName} (${newProdStock} ${newProdUnit})`,
        category: 'Purchase',
        entryBy: userProfile?.name || 'Admin',
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });

      updateDocumentNonBlocking(doc(firestore, 'businesses', business.id, 'vendors', newProdVendorId), {
        totalPurchase: increment(totalCost),
        pendingBalance: increment(totalCost),
        lastPurchaseDate: new Date().toISOString().split('T')[0],
        updatedAt: serverTimestamp()
      });
    }

    onSaveSuccess(product); 
    onOpenChange(false); 
    resetForm();
  };

  const resetForm = () => {
    setNewProdName(""); setNewProdPrice(""); setNewProdStock(""); setNewProdSku("");
    setNewProdVendorId("none");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl w-[95vw] z-[200]">
        <DialogHeader className="p-8 bg-slate-900 text-white text-left shrink-0">
          <div className="flex items-center gap-4"><div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><Package className="h-6 w-6 text-accent" /></div><div><DialogTitle className="text-xl font-black">Quick Product Entry</DialogTitle><p className="text-white/40 text-[9px] font-bold uppercase mt-1">Updating Catalog In-stream</p></div></div>
        </DialogHeader>
        <div className="p-8 space-y-6">
          <div className="space-y-1.5 text-left"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Particulars / Name *</Label><Input value={newProdName} onChange={(e)=>setNewProdName(e.target.value)} className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-1.5 text-left"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Rate {currencySymbol} *</Label><Input type="number" value={newProdPrice} onChange={(e)=>setNewProdPrice(e.target.value)} className="h-12 rounded-xl font-black text-primary bg-primary/5 border-none shadow-inner" /></div>
            <div className="space-y-1.5 text-left"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Opening Stock</Label><Input type="number" value={newProdStock} onChange={(e)=>setNewProdStock(e.target.value)} className="h-12 rounded-xl bg-muted/20 border-none shadow-inner" /></div>
            <div className="space-y-1.5 text-left"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Unit</Label><Select value={newProdUnit} onValueChange={setNewProdUnit}><SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{(business?.baseUnits || ["pcs", "kg"]).map((u:string)=><SelectItem key={u} value={u} className="text-xs font-bold uppercase">{u}</SelectItem>)}</SelectContent></Select></div>
          </div>
          
          <div className="space-y-1.5 text-left">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Default Supplier / Vendor</Label>
            <Select value={newProdVendorId} onValueChange={setNewProdVendorId}>
              <SelectTrigger className="h-12 rounded-xl font-bold bg-muted/10 border-none shadow-sm text-left">
                <SelectValue placeholder="Pick Vendor (Optional)" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-2xl">
                <SelectItem value="none" className="text-xs font-bold uppercase">No Vendor Linked</SelectItem>
                {(vendorList || []).map((v: any) => (
                  <SelectItem key={v.id} value={v.id} className="text-xs font-bold uppercase">{v.name}</SelectItem>
                ))}
                <SelectSeparator />
                <div className="p-1">
                  <Button asChild variant="ghost" className="w-full h-8 justify-start gap-2 text-[9px] font-black uppercase text-primary hover:bg-primary/5">
                    <Link href="/vendors"><Plus className="h-3 w-3 mr-1" /> Partner Directory</Link>
                  </Button>
                </div>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5 text-left"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Tax Slab (%)</Label><Select value={newProdGst} onValueChange={setNewProdGst}><SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{[0,5,12,18,28].map(s=><SelectItem key={s} value={s.toString()} className="text-xs font-bold">{s}% GST</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5 text-left"><Label className="text-[10px] font-bold uppercase text-muted-foreground">HSN/SAC Code</Label><Input value={newProdHsn} onChange={(e)=>setNewProdHsn(e.target.value)} className="h-12 rounded-xl bg-muted/20 border-none shadow-inner" /></div>
          </div>
          <div className="space-y-1.5 text-left"><Label className="text-[10px] font-bold uppercase text-muted-foreground">SKU (Optional)</Label><Input value={newProdSku} onChange={(e)=>setNewProdSku(e.target.value.toUpperCase())} className="h-12 rounded-xl font-mono text-sm shadow-inner" /></div>
          {(parseFloat(newProdPrice) > 0 && parseInt(newProdStock) > 0) && (
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between animate-in fade-in slide-in-from-top-2 text-left">
              <div className="flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /><span className="text-[10px] font-bold uppercase text-muted-foreground">Stock Valuation</span></div>
              <div className="text-right"><p className="text-xl font-bold text-primary">{currencySymbol}{(parseFloat(newProdPrice) * parseInt(newProdStock)).toLocaleString()}</p></div>
            </div>
          )}
        </div>
        <DialogFooter className="p-8 bg-muted/10 border-t"><Button onClick={handleSaveProduct} className="w-full h-14 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl text-white">Commit & Add to Cart</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}