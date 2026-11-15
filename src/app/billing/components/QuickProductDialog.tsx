"use client";

import { useState } from "react";
import { Calculator, Package, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  addDocumentNonBlocking,
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  useFirestore,
} from "@/firebase";
import { collection, doc, increment, serverTimestamp } from "firebase/firestore";
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

export function QuickProductDialog({
  isOpen,
  onOpenChange,
  onSaveSuccess,
  business,
  vendorList,
  userProfile,
  currencySymbol,
}: QuickProductDialogProps) {
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
      stock: parseInt(newProdStock, 10) || 0,
      minThreshold: 5,
      gstRate: parseInt(newProdGst, 10),
      isActive: true,
      unit: newProdUnit,
      vendorId: newProdVendorId !== "none" ? newProdVendorId : null,
      vendorName:
        newProdVendorId !== "none"
          ? vendorList?.find((v: any) => v.id === newProdVendorId)?.name || null
          : null,
      updatedAt: serverTimestamp(),
    };

    setDocumentNonBlocking(
      doc(firestore, "businesses", business.id, "products", productId),
      product,
      { merge: true }
    );

    if (newProdVendorId !== "none" && parseInt(newProdStock, 10) > 0) {
      const totalCost = cost * parseInt(newProdStock, 10);
      addDocumentNonBlocking(collection(firestore, "businesses", business.id, "cashbook"), {
        businessId: business.id,
        vendorId: newProdVendorId,
        vendorName: product.vendorName,
        type: "credit",
        amount: totalCost,
        particulars: `Opening Stock: ${newProdName} (${newProdStock} ${newProdUnit})`,
        category: "Purchase",
        entryBy: userProfile?.name || "Admin",
        date: new Date().toISOString().split("T")[0],
        createdAt: serverTimestamp(),
      });

      updateDocumentNonBlocking(
        doc(firestore, "businesses", business.id, "vendors", newProdVendorId),
        {
          totalPurchase: increment(totalCost),
          pendingBalance: increment(totalCost),
          lastPurchaseDate: new Date().toISOString().split("T")[0],
          updatedAt: serverTimestamp(),
        }
      );
    }

    onSaveSuccess(product);
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setNewProdName("");
    setNewProdPrice("");
    setNewProdStock("");
    setNewProdSku("");
    setNewProdVendorId("none");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl w-[95vw] z-[200] bg-white">
        <DialogHeader className="px-6 py-5 bg-slate-900 text-white text-left shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">Quick Product Entry</DialogTitle>
              <DialogDescription className="text-slate-300 text-xs mt-0.5">
                Add a new SKU to inventory and insert directly into this bill
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-1.5 text-left">
            <Label className="text-xs font-semibold text-slate-700">Product Name *</Label>
            <Input
              value={newProdName}
              onChange={(e) => setNewProdName(e.target.value)}
              placeholder="e.g. Solar Inverter 3kW"
              className="h-10 rounded-lg font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 text-left">
              <Label className="text-xs font-semibold text-slate-700">
                Selling Price ({currencySymbol}) *
              </Label>
              <Input
                type="number"
                value={newProdPrice}
                onChange={(e) => setNewProdPrice(e.target.value)}
                className="h-10 rounded-lg font-mono tabular-nums font-bold text-primary"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <Label className="text-xs font-semibold text-slate-700">Opening Stock</Label>
              <Input
                type="number"
                value={newProdStock}
                onChange={(e) => setNewProdStock(e.target.value)}
                className="h-10 rounded-lg font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <Label className="text-xs font-semibold text-slate-700">Unit</Label>
              <Select value={newProdUnit} onValueChange={setNewProdUnit}>
                <SelectTrigger className="h-10 rounded-lg font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[300]">
                  {(business?.baseUnits || ["pcs", "kg"]).map((u: string) => (
                    <SelectItem key={u} value={u} className="text-xs font-medium uppercase">
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <Label className="text-xs font-semibold text-slate-700">
              Default Supplier / Vendor
            </Label>
            <Select value={newProdVendorId} onValueChange={setNewProdVendorId}>
              <SelectTrigger className="h-10 rounded-lg font-medium text-left">
                <SelectValue placeholder="Pick Vendor (Optional)" />
              </SelectTrigger>
              <SelectContent className="z-[300]">
                <SelectItem value="none" className="text-xs font-medium">
                  No Vendor Linked
                </SelectItem>
                {(vendorList || []).map((v: any) => (
                  <SelectItem key={v.id} value={v.id} className="text-xs font-medium">
                    {v.name}
                  </SelectItem>
                ))}
                <SelectSeparator />
                <div className="p-1">
                  <Button asChild variant="ghost" className="w-full h-8 justify-start gap-2 text-xs text-primary">
                    <Link href="/vendors">
                      <Plus className="h-3.5 w-3.5" /> Open Vendor Directory
                    </Link>
                  </Button>
                </div>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 text-left">
              <Label className="text-xs font-semibold text-slate-700">GST Slab</Label>
              <Select value={newProdGst} onValueChange={setNewProdGst}>
                <SelectTrigger className="h-10 rounded-lg font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[300]">
                  {[0, 5, 12, 18, 28].map((s) => (
                    <SelectItem key={s} value={s.toString()} className="text-xs font-mono">
                      {s}% GST
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 text-left">
              <Label className="text-xs font-semibold text-slate-700">HSN/SAC Code</Label>
              <Input
                value={newProdHsn}
                onChange={(e) => setNewProdHsn(e.target.value)}
                className="h-10 rounded-lg font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <Label className="text-xs font-semibold text-slate-700">SKU (Optional)</Label>
              <Input
                value={newProdSku}
                onChange={(e) => setNewProdSku(e.target.value.toUpperCase())}
                className="h-10 rounded-lg font-mono text-xs"
              />
            </div>
          </div>

          {parseFloat(newProdPrice) > 0 && parseInt(newProdStock, 10) > 0 && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-left">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Calculator className="h-4 w-4 text-primary" />
                <span>Opening Stock Retail Value</span>
              </div>
              <p className="font-mono tabular-nums text-base font-bold text-slate-900">
                {currencySymbol}
                {(parseFloat(newProdPrice) * parseInt(newProdStock, 10)).toLocaleString("en-IN")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-row gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 rounded-lg text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!newProdName || !newProdPrice}
            onClick={handleSaveProduct}
            className="flex-1 h-10 bg-primary hover:bg-primary/90 text-xs font-bold rounded-lg text-white"
          >
            Save &amp; Add to Bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}