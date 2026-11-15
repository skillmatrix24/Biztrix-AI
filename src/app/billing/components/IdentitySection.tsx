"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  Hash,
  Package,
  Plus,
  Search,
  SmartphoneNfc,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { filterBillingCustomers, filterCatalogProducts } from "@/lib/billing-engine";

interface IdentitySectionProps {
  isRewardSyncMode: boolean;
  selectedCustomer: any;
  setSelectedCustomerId: (id: string) => void;
  customerSearch: string;
  setCustomerSearch: (v: string) => void;
  showCustomerDropdown: boolean;
  setShowCustomerDropdown: (v: boolean) => void;
  customerList: any[];
  allMemberships: any[];
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
  cartItems?: Array<{ productId: string; quantity: number }>;
}

export function IdentitySection(props: IdentitySectionProps) {
  const {
    isRewardSyncMode,
    selectedCustomer,
    setSelectedCustomerId,
    customerSearch,
    setCustomerSearch,
    showCustomerDropdown,
    setShowCustomerDropdown,
    customerList,
    allMemberships,
    isLoyaltyLoading,
    activeMembership,
    productSearch,
    setProductSearch,
    showProductDropdown,
    setShowProductDropdown,
    productList,
    addItem,
    setIsAddCustomerOpen,
    setIsAddProductOpen,
    isQuotation,
    externalBillNo,
    setExternalBillNo,
    manualAmount,
    setManualAmount,
    currencySymbol,
    setAppliedCoupons,
    setCouponOverrides,
    setCouponOverrideReasons,
    cartItems = [],
  } = props;

  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const matchingCustomers = useMemo(
    () =>
      filterBillingCustomers(
        customerList,
        allMemberships,
        customerSearch,
        isRewardSyncMode
      ).slice(0, 12),
    [customerList, allMemberships, customerSearch, isRewardSyncMode]
  );

  const productCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const p of productList || []) {
      if (!p?.isArchived && p?.category) cats.add(String(p.category));
    }
    return ["ALL", ...Array.from(cats).slice(0, 6)];
  }, [productList]);

  const matchingProducts = useMemo(
    () => filterCatalogProducts(productList, productSearch, selectedCategory),
    [productList, productSearch, selectedCategory]
  );

  const cartQtyByProductId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cartItems) {
      map[item.productId] = (map[item.productId] || 0) + item.quantity;
    }
    return map;
  }, [cartItems]);

  const handleProductKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && matchingProducts.length > 0) {
      e.preventDefault();
      const q = productSearch.trim().toLowerCase();
      const exactMatch =
        matchingProducts.find(
          (p) =>
            (p.barcode && String(p.barcode).toLowerCase() === q) ||
            (p.sku && String(p.sku).toLowerCase() === q)
        ) || matchingProducts[0];
      if (exactMatch) addItem(exactMatch);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. CUSTOMER SELECTION BAR */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary shrink-0" />
            <h2 className="text-sm font-bold text-slate-900">1. Customer</h2>
            {isRewardSyncMode && (
              <span className="text-xs text-emerald-700 font-medium">
                · Active loyalty members only
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAddCustomerOpen(true)}
            className="h-8 px-3 rounded-lg border-slate-200 text-xs font-semibold text-primary whitespace-nowrap shrink-0"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            New Customer
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className={cn("relative", selectedCustomer ? "lg:col-span-6" : "lg:col-span-12")}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder={
                isRewardSyncMode
                  ? "Search active member by name or 10-digit phone..."
                  : "Search customer by name, phone, or GSTIN..."
              }
              aria-label="Search customer"
              className="h-10 pl-9 text-sm rounded-lg border-slate-200 bg-slate-50/70"
              value={customerSearch}
              onFocus={() => {
                setShowProductDropdown(false);
                setShowCustomerDropdown(true);
              }}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setShowCustomerDropdown(true);
              }}
            />

            {showCustomerDropdown && (
              <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-xl mt-1.5 shadow-lg z-40 max-h-64 overflow-y-auto divide-y divide-slate-100">
                {matchingCustomers.length === 0 ? (
                  <div className="p-4 text-xs text-slate-500 flex items-center justify-between gap-3">
                    <span>No matching customers found.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomerDropdown(false);
                        setIsAddCustomerOpen(true);
                      }}
                      className="font-semibold text-primary hover:underline shrink-0"
                    >
                      + Add Customer
                    </button>
                  </div>
                ) : (
                  matchingCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full px-4 py-2.5 hover:bg-slate-50 text-left flex items-center justify-between gap-3 transition-colors"
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setCustomerSearch("");
                        setShowCustomerDropdown(false);
                      }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                        <p className="text-xs font-mono tabular-nums text-slate-500">
                          {c.phone || "No phone"}
                          {Number(c.creditBalance || 0) > 0
                            ? ` · Due ${currencySymbol}${Number(c.creditBalance).toLocaleString("en-IN")}`
                            : ""}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {selectedCustomer && (
            <div className="lg:col-span-6 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {(selectedCustomer.name || "C").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {selectedCustomer.name}
                    </p>
                    {selectedCustomer.state && (
                      <span className="text-xs text-slate-500 truncate hidden sm:inline">
                        · {selectedCustomer.state}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-mono tabular-nums">
                    <span>{selectedCustomer.phone}</span>
                    {Number(selectedCustomer.creditBalance || 0) > 0 && (
                      <span className="text-red-700 font-semibold">
                        · Udhaar {currencySymbol}
                        {Number(selectedCustomer.creditBalance).toLocaleString("en-IN")}
                      </span>
                    )}
                    {isLoyaltyLoading ? (
                      <span className="font-sans text-slate-500">· Syncing loyalty...</span>
                    ) : activeMembership ? (
                      <span className="font-sans text-primary font-semibold">
                        · {activeMembership.tier} ({activeMembership.rewardPoints || 0} pts)
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <button
                type="button"
                aria-label="Clear selected customer"
                onClick={() => {
                  setSelectedCustomerId("");
                  setAppliedCoupons([]);
                  setCouponOverrides({});
                  setCouponOverrideReasons({});
                }}
                className="h-8 w-8 rounded-md text-slate-400 hover:text-red-600 hover:bg-white flex items-center justify-center shrink-0 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 2. PRODUCT CATALOG OR EXTERNAL REWARD SYNC */}
      {isRewardSyncMode ? (
        <section className="rounded-xl border border-emerald-200 bg-white p-5 space-y-4">
          <div className="flex items-center gap-2">
            <SmartphoneNfc className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-900">2. External Bill Sync Details</h2>
          </div>
          <p className="text-xs text-slate-600">
            Inventory will not be deducted. Enter the external POS bill reference and gross amount to apply coupons and award loyalty points.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                External Bill Reference
              </Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  value={externalBillNo}
                  onChange={(e) => setExternalBillNo(e.target.value.toUpperCase())}
                  placeholder="e.g. POS-12345"
                  className="h-10 pl-9 font-mono text-sm rounded-lg border-slate-200 bg-slate-50/70"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Total Bill Value ({currencySymbol}) *
              </Label>
              <Input
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="0.00"
                className="h-10 font-mono tabular-nums text-base font-bold text-emerald-700 rounded-lg border-slate-200 bg-slate-50/70"
              />
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary shrink-0" />
              <h2 className="text-sm font-bold text-slate-900">2. Product Catalog</h2>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                · {matchingProducts.length} SKUs
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddProductOpen(true)}
              className="h-8 px-3 rounded-lg border-slate-200 text-xs font-semibold text-primary whitespace-nowrap shrink-0"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Quick Product
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Scan barcode, SKU, or search product name (press Enter to add)..."
                aria-label="Search or scan product"
                className="h-10 pl-9 text-sm rounded-lg border-slate-200 bg-slate-50/70"
                value={productSearch}
                onFocus={() => {
                  setShowCustomerDropdown(false);
                  setShowProductDropdown(true);
                }}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowProductDropdown(true);
                }}
                onKeyDown={handleProductKeyDown}
              />
              {productSearch && (
                <button
                  type="button"
                  aria-label="Clear product search"
                  onClick={() => setProductSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {productCategories.length > 1 && (
              <div
                role="tablist"
                aria-label="Filter product category"
                className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 overflow-x-auto scrollbar-hide shrink-0"
              >
                {productCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={selectedCategory === cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors",
                      selectedCategory === cat
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {cat === "ALL" ? "All Items" : cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* QUICK-PICK PRODUCT GRID */}
          {matchingProducts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-700">No matching products found</p>
              <p className="text-xs text-slate-500">
                Try another keyword or create a quick catalog entry to add directly to this bill.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddProductOpen(true)}
                className="h-8 text-xs bg-white"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add New Product
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
              {matchingProducts.slice(0, 18).map((p) => {
                const stock = Number(p.stock || 0);
                const inCartQty = cartQtyByProductId[p.id] || 0;
                const isOut = stock <= 0;
                const isDisabled = isOut && !isQuotation;

                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => addItem(p)}
                    className={cn(
                      "text-left rounded-lg border p-3 transition-colors flex flex-col justify-between gap-2",
                      inCartQty > 0
                        ? "border-primary bg-primary/[0.04]"
                        : isDisabled
                          ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                          : "border-slate-200 bg-white hover:border-primary/50 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 line-clamp-1">{p.name}</p>
                      {inCartQty > 0 && (
                        <span className="font-mono tabular-nums text-[11px] font-bold text-primary shrink-0">
                          ×{inCartQty}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums">
                      <span className="font-bold text-slate-900">
                        {currencySymbol}
                        {Number(p.price || 0).toLocaleString("en-IN")}
                      </span>
                      <span
                        className={cn(
                          "font-sans text-[11px] font-medium",
                          isOut
                            ? isQuotation
                              ? "text-amber-700"
                              : "text-red-700"
                            : stock <= Number(p.minThreshold || 5)
                              ? "text-amber-700"
                              : "text-slate-500"
                        )}
                      >
                        {isOut ? (isQuotation ? "Quote only" : "Out of stock") : `Stock: ${stock}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
