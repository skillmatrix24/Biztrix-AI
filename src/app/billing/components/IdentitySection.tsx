"use client";

import { Search, Users, Plus, X, Package, ChevronRight, PlusCircle, SmartphoneNfc, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface IdentitySectionProps {
  isRewardSyncMode: boolean;
  selectedCustomer: any;
  setSelectedCustomerId: (id: string) => void;
  customerSearch: string;
  setCustomerSearch: (v: string) => void;
  showCustomerDropdown: boolean;
  setShowCustomerDropdown: (v: boolean) => void;
  customerList: any[];
  isLoyaltyLoading: boolean;
  activeMembership: any;
  productSearch: string;
  setProductSearch: (v: string) => void;
  showProductDropdown: boolean;
  setShowProductDropdown: (v: boolean) => void;
  productList: any[];
  addItem: (p: any) => void;
  setIsAddCustomerOpen: (v: boolean) => void;
  setIsAddProductOpen: (v: boolean) => void;
  isQuotation: boolean;
  externalBillNo: string;
  setExternalBillNo: (v: string) => void;
  manualAmount: string;
  setManualAmount: (v: string) => void;
  currencySymbol: string;
  setAppliedCoupons: (v: any[]) => void;
  setCouponOverrides: (v: any) => void;
  setCouponOverrideReasons: (v: any) => void;
}

export function IdentitySection(props: IdentitySectionProps) {
  const {
    isRewardSyncMode, selectedCustomer, setSelectedCustomerId, customerSearch, setCustomerSearch,
    showCustomerDropdown, setShowCustomerDropdown, customerList, isLoyaltyLoading, activeMembership,
    productSearch, setProductSearch, showProductDropdown, setShowProductDropdown, productList,
    addItem, setIsAddCustomerOpen, setIsAddProductOpen, isQuotation, externalBillNo, setExternalBillNo,
    manualAmount, setManualAmount, currencySymbol, setAppliedCoupons, setCouponOverrides, setCouponOverrideReasons
  } = props;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Card className="shadow-xl border-none bg-white rounded-[1.5rem] sm:rounded-[2rem] relative z-[40]">
        <CardHeader className="py-5 px-6 border-b bg-muted/10 flex flex-row items-center justify-between">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> 1. Customer Identity
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-primary/10 text-primary" onClick={() => setIsAddCustomerOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40" />
            <input 
              placeholder="Search Node..." 
              className="flex h-12 w-full pl-12 text-sm rounded-2xl bg-muted/20 border-none font-bold outline-none focus:ring-2 focus:ring-primary/20" 
              value={customerSearch} 
              onFocus={() => { setShowProductDropdown(false); setShowCustomerDropdown(true); }} 
              onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }} 
            />
            {showCustomerDropdown && (customerList || []).filter(c => (c.name || "").toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone || "").includes(customerSearch)).length > 0 && (
              <div className="absolute top-full left-0 w-full bg-white border rounded-[1.5rem] mt-2 shadow-2xl z-[100] overflow-hidden max-h-[300px] overflow-y-auto">
                {(customerList || []).filter(c => (c.name || "").toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone || "").includes(customerSearch)).slice(0, 20).map(c => (
                  <div key={c.id} className="p-4 hover:bg-primary/5 cursor-pointer flex justify-between items-center border-b last:border-0" onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(""); setShowCustomerDropdown(false); }}>
                    <div className="flex flex-col text-left"><span className="text-sm font-bold">{c.name}</span><span className="text-[10px] opacity-60 font-black">{c.phone}</span></div>
                    <ChevronRight className="h-4 w-4 text-primary/30" />
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedCustomer && (
            <div className="p-5 rounded-3xl border-2 transition-all flex items-center justify-between bg-primary/5 border-primary/20 shadow-inner">
              <div className="flex items-center gap-4 text-left">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center font-black text-white bg-primary">{selectedCustomer.name?.charAt(0)}</div>
                <div className="min-w-0">
                  <p className="text-base font-black text-slate-900 truncate leading-none">{selectedCustomer.name}</p>
                  {isLoyaltyLoading ? <span className="text-[8px] animate-pulse">Syncing...</span> : activeMembership ? <div className="flex items-center gap-2 mt-2"><Badge className="bg-slate-900 text-accent border-none text-[8px] font-black h-4 px-1.5 uppercase tracking-widest">{activeMembership.tier} NODE</Badge><span className="text-[9px] font-bold text-primary uppercase">{activeMembership.rewardPoints} Pts</span></div> : <span className="text-[9px] opacity-40 font-bold uppercase mt-1">Standard Profile</span>}
                </div>
              </div>
              <button onClick={() => { setSelectedCustomerId(""); setAppliedCoupons([]); setCouponOverrides({}); setCouponOverrideReasons({}); }} className="text-muted-foreground hover:text-destructive"><X className="h-5 w-5" /></button>
            </div>
          )}
        </CardContent>
      </Card>

      {isRewardSyncMode ? (
        <Card className="shadow-xl border-none bg-green-50 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-green-200">
            <CardHeader className="py-5 px-6 border-b bg-green-100/50 flex flex-row items-center gap-4">
                <SmartphoneNfc className="h-5 w-5 text-green-600" />
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-green-700">2. External Bill Sync</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6 text-left">
                <div className="space-y-3">
                    <Label className="text-[9px] font-black uppercase text-green-800 ml-1">External Bill Reference (Manual)</Label>
                    <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600 opacity-40" />
                        <input value={externalBillNo} onChange={(e) => setExternalBillNo(e.target.value.toUpperCase())} placeholder="e.g. PP-12345" className="flex h-12 w-full pl-10 rounded-xl bg-white border border-green-200 font-bold outline-none focus:ring-2 focus:ring-green-600/20" />
                    </div>
                </div>
                <div className="space-y-3">
                    <Label className="text-[9px] font-black uppercase text-green-800 ml-1">Total Bill Value ({currencySymbol}) *</Label>
                    <input type="number" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} placeholder="0.00" className="flex h-14 w-full rounded-2xl bg-white border border-green-300 font-black text-2xl text-green-600 text-center outline-none focus:ring-2 focus:ring-green-600/20" />
                </div>
            </CardContent>
        </Card>
      ) : (
        <Card className="shadow-xl border-none bg-white rounded-[1.5rem] sm:rounded-[2rem] relative z-[30]">
            <CardHeader className="py-5 px-6 border-b bg-muted/10 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" /> 2. Product Registry
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-primary/10 text-primary" onClick={() => setIsAddProductOpen(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6 text-left">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40" />
                <input 
                  placeholder="Scan or Search Items..." 
                  className="flex h-12 w-full pl-12 text-sm rounded-xl bg-muted/20 border-none font-bold outline-none focus:ring-2 focus:ring-primary/20" 
                  value={productSearch} 
                  onFocus={() => { setShowCustomerDropdown(false); setShowProductDropdown(true); }} 
                  onChange={(e) => { setProductSearch(e.target.value); setShowProductDropdown(true); }} 
                />
                {showProductDropdown && (productList || []).filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase())).length > 0 && (
                <div className="absolute top-full left-0 w-full bg-white border rounded-[1.5rem] mt-2 shadow-2xl z-[100] overflow-hidden max-h-[300px] overflow-y-auto">
                    {(productList || []).filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 20).map(p => (
                    <div 
                        key={p.id} 
                        className={cn(
                        "p-4 hover:bg-primary/5 cursor-pointer flex justify-between items-center border-b last:border-0",
                        p.stock <= 0 && !isQuotation && "opacity-60 bg-muted/10"
                        )} 
                        onClick={() => addItem(p)}
                    >
                        <div className="flex flex-col text-left">
                          <div className="flex items-center gap-2">
                              <span className="text-sm font-bold">{p.name}</span>
                              {p.stock <= 0 && <Badge variant="destructive" className="h-4 text-[7px] font-black uppercase px-1.5 border-none animate-pulse">Out of Stock</Badge>}
                          </div>
                          <span className="text-[10px] opacity-60 font-black">₹{p.price.toLocaleString()} • Qty: {p.stock}</span>
                        </div>
                        <PlusCircle className={cn("h-5 w-5", p.stock <= 0 && !isQuotation ? "text-muted-foreground/30" : "text-primary/30")} />
                    </div>
                    ))}
                </div>
                )}
            </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
