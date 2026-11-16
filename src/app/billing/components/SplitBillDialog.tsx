"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Scissors, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  buildSplitBillItemsForBucket,
  calculateBillingTotals,
  computeEqualSplitShares,
  getItemAllocationStatus,
  type BillingLineItem,
} from "@/lib/billing-engine";

export interface SplitBillPartPayload {
  partIndex: number;
  customerId: string;
  customerObj: any;
  items: BillingLineItem[];
  totals: ReturnType<typeof calculateBillingTotals>;
  paymentMode: string;
  paidAmount: number;
}

interface SplitBillDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  items: BillingLineItem[];
  customerList: any[];
  selectedCustomerId: string;
  businessState?: string;
  gstMode: "inclusive" | "exclusive";
  currencySymbol: string;
  paymentModes: string[];
  originalFinalPayout: number;
  onConfirmSplit: (parts: SplitBillPartPayload[], splitType: "equal" | "items") => Promise<void>;
  isSaving: boolean;
}

export function SplitBillDialog({
  isOpen,
  onOpenChange,
  items,
  customerList,
  selectedCustomerId,
  businessState,
  gstMode,
  currencySymbol,
  paymentModes,
  originalFinalPayout,
  onConfirmSplit,
  isSaving,
}: SplitBillDialogProps) {
  const [splitType, setSplitType] = useState<"equal" | "items">(
    items.length > 0 ? "equal" : "equal"
  );
  const [partCount, setPartCount] = useState<number>(2);
  const [partConfigs, setPartConfigs] = useState<
    Array<{ customerId: string; paymentMode: string; paidAmount: string }>
  >([]);
  const [allocations, setAllocations] = useState<Record<string, number[]>>({});

  // Re-initialize cleanly whenever opened or partCount changes
  useEffect(() => {
    if (!isOpen) return;

    const activeCustomers = (customerList || []).filter((c) => !c?.isArchived);
    const fallbackCustomer = selectedCustomerId || activeCustomers[0]?.id || "";
    const defaultMode = paymentModes[0] || "UPI";
    const equalShares = computeEqualSplitShares(originalFinalPayout, partCount);

    setPartConfigs(
      Array.from({ length: partCount }, (_, idx) => ({
        customerId: idx === 0 ? fallbackCustomer : fallbackCustomer,
        paymentMode: defaultMode,
        paidAmount: String(equalShares[idx] ?? 0),
      }))
    );

    const initialAllocs: Record<string, number[]> = {};
    for (const item of items) {
      const row = Array.from({ length: partCount }, (_, idx) =>
        idx === 0 ? item.quantity : 0
      );
      initialAllocs[item.id] = row;
    }
    setAllocations(initialAllocs);
  }, [isOpen, partCount, items, selectedCustomerId, customerList, paymentModes, originalFinalPayout]);

  // Keep paid amounts aligned when allocations change in item split mode
  const syncPaidAmountsToItems = (nextAllocs: Record<string, number[]>) => {
    setPartConfigs((prev) =>
      prev.map((cfg, idx) => {
        const bucketItems = buildSplitBillItemsForBucket(items, nextAllocs, idx);
        const cust = customerList.find((c) => c.id === cfg.customerId);
        const isInterState =
          Boolean(cust?.state && businessState) &&
          cust.state.trim().toLowerCase() !== businessState!.trim().toLowerCase();
        const nextTotal = calculateBillingTotals({
          items: bucketItems,
          appliedCoupons: [],
          isInterState,
          gstMode,
        }).finalPayout;
        return { ...cfg, paidAmount: String(nextTotal) };
      })
    );
  };

  const handleSplitTypeChange = (nextType: "equal" | "items") => {
    setSplitType(nextType);
    if (nextType === "equal") {
      const shares = computeEqualSplitShares(originalFinalPayout, partCount);
      setPartConfigs((prev) =>
        prev.map((cfg, idx) => ({ ...cfg, paidAmount: String(shares[idx] ?? 0) }))
      );
    } else {
      syncPaidAmountsToItems(allocations);
    }
  };

  // Keep item-mode summaries computed
  const itemBucketSummaries = useMemo(() => {
    return Array.from({ length: partCount }, (_, idx) => {
      const bucketItems = buildSplitBillItemsForBucket(items, allocations, idx);
      const cust = customerList.find((c) => c.id === partConfigs[idx]?.customerId);
      const isInterState =
        Boolean(cust?.state && businessState) &&
        cust.state.trim().toLowerCase() !== businessState!.trim().toLowerCase();

      const totals = calculateBillingTotals({
        items: bucketItems,
        appliedCoupons: [],
        isInterState,
        gstMode,
        paidAmount: partConfigs[idx]?.paidAmount || "0",
      });

      return { bucketItems, totals, cust };
    });
  }, [partCount, items, allocations, customerList, partConfigs, businessState, gstMode]);

  const equalShares = useMemo(
    () => computeEqualSplitShares(originalFinalPayout, partCount),
    [originalFinalPayout, partCount]
  );

  const unallocatedItemsCount = useMemo(() => {
    if (splitType !== "items") return 0;
    return items.filter(
      (item) =>
        !getItemAllocationStatus(item.quantity, allocations[item.id] || []).isComplete
    ).length;
  }, [splitType, items, allocations]);

  const canSubmit = useMemo(() => {
    if (isSaving) return false;
    if (partConfigs.length !== partCount) return false;
    if (partConfigs.some((p) => !p.customerId)) return false;
    if (splitType === "items") {
      if (items.length === 0 || unallocatedItemsCount > 0) return false;
      // Also ensure no empty split bill exists (or at least 2 parts have items)
      const nonEmptyParts = itemBucketSummaries.filter((s) => s.bucketItems.length > 0).length;
      if (nonEmptyParts < 2) return false;
    }
    return true;
  }, [isSaving, partConfigs, partCount, splitType, items.length, unallocatedItemsCount, itemBucketSummaries]);

  const updateAllocationQty = (itemId: string, maxQty: number, bucketIdx: number, nextQty: number) => {
    const cleanNext = Math.max(0, Math.min(maxQty, Math.floor(nextQty || 0)));
    const currentRow = [...(allocations[itemId] || Array(partCount).fill(0))];
    currentRow[bucketIdx] = cleanNext;
    const nextAllocs = { ...allocations, [itemId]: currentRow };
    setAllocations(nextAllocs);
    syncPaidAmountsToItems(nextAllocs);
  };

  const handleConfirm = async () => {
    if (!canSubmit) return;

    const payloads: SplitBillPartPayload[] = [];
    for (let idx = 0; idx < partCount; idx++) {
      const cfg = partConfigs[idx];
      const cust = customerList.find((c) => c.id === cfg.customerId);

      if (splitType === "equal") {
        const shareAmt = equalShares[idx] || 0;
        const paid = Math.max(0, parseFloat(cfg.paidAmount) || 0);
        const isInterState =
          Boolean(cust?.state && businessState) &&
          cust.state.trim().toLowerCase() !== businessState!.trim().toLowerCase();

        const totals = calculateBillingTotals({
          items: [],
          manualAmount: String(shareAmt),
          manualGstRate: "0",
          appliedCoupons: [],
          isInterState,
          gstMode: "inclusive",
          paidAmount: String(paid),
        });

        payloads.push({
          partIndex: idx,
          customerId: cfg.customerId,
          customerObj: cust,
          items: [
            {
              id: `split_eq_${idx}`,
              productId: "split_share",
              name: `Split Share ${idx + 1} of ${partCount}`,
              quantity: 1,
              price: shareAmt,
              gstRate: 0,
              stock: 999,
              itemDiscount: 0,
            },
          ],
          totals,
          paymentMode: cfg.paymentMode,
          paidAmount: paid,
        });
      } else {
        const summary = itemBucketSummaries[idx];
        if (!summary || summary.bucketItems.length === 0) continue;
        const paid = Math.max(0, parseFloat(cfg.paidAmount) || 0);
        payloads.push({
          partIndex: idx,
          customerId: cfg.customerId,
          customerObj: cust,
          items: summary.bucketItems,
          totals: summary.totals,
          paymentMode: cfg.paymentMode,
          paidAmount: paid,
        });
      }
    }

    await onConfirmSplit(payloads, splitType);
  };

  const activeCustomers = useMemo(
    () => (customerList || []).filter((c) => !c?.isArchived),
    [customerList]
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[820px] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-slate-200 w-[95vw] bg-white text-left">
        <DialogHeader className="px-6 py-5 bg-slate-900 text-white shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Scissors className="h-5 w-5 text-sky-300" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Split Bill Into Multiple Invoices
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5 font-mono tabular-nums">
                  Original Total: {currencySymbol}
                  {originalFinalPayout.toLocaleString("en-IN")} · {items.length} cart item
                  {items.length === 1 ? "" : "s"}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* SPLIT STRATEGY & PART COUNT */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div
              role="tablist"
              aria-label="Split strategy"
              className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 w-fit"
            >
              <button
                type="button"
                role="tab"
                aria-selected={splitType === "equal"}
                onClick={() => handleSplitTypeChange("equal")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                  splitType === "equal"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Equal Split (÷ N)
              </button>
              <button
                type="button"
                role="tab"
                disabled={items.length === 0}
                aria-selected={splitType === "items"}
                onClick={() => handleSplitTypeChange("items")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-40",
                  splitType === "items"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Split by Items
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold text-slate-700">Number of Bills:</Label>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
                {[2, 3, 4, 5].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setPartCount(count)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-colors",
                      partCount === count
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ITEM-WISE ALLOCATION GRID */}
          {splitType === "items" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-800">
                  Assign Item Quantities to Each Bill
                </p>
                {unallocatedItemsCount > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {unallocatedItemsCount} item{unallocatedItemsCount === 1 ? "" : "s"} still need full qty assignment
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    All quantities assigned
                  </span>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                      <th className="py-2.5 px-3">Item (Total Qty)</th>
                      {Array.from({ length: partCount }, (_, idx) => (
                        <th key={idx} className="py-2.5 px-2 text-center">
                          Bill #{idx + 1}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => {
                      const row = allocations[item.id] || Array(partCount).fill(0);
                      const status = getItemAllocationStatus(item.quantity, row);
                      return (
                        <tr key={item.id}>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {item.name}{" "}
                            <span className="font-mono tabular-nums text-slate-500">
                              (×{item.quantity})
                            </span>
                          </td>
                          {Array.from({ length: partCount }, (_, idx) => (
                            <td key={idx} className="py-2 px-2 text-center">
                              <Input
                                type="number"
                                min={0}
                                max={item.quantity}
                                aria-label={`${item.name} quantity for Bill ${idx + 1}`}
                                value={row[idx] ?? 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  updateAllocationQty(
                                    item.id,
                                    item.quantity,
                                    idx,
                                    Number.isNaN(val) ? 0 : val
                                  );
                                }}
                                className="h-8 w-16 mx-auto text-center font-mono tabular-nums text-xs"
                              />
                            </td>
                          ))}
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold whitespace-nowrap">
                            {status.isComplete ? (
                              <span className="text-emerald-700">OK</span>
                            ) : status.remaining > 0 ? (
                              <span className="text-amber-700">+{status.remaining} left</span>
                            ) : (
                              <span className="text-red-700">
                                {Math.abs(status.remaining)} over
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INDIVIDUAL SPLIT BILL CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {partConfigs.map((cfg, idx) => {
              const targetTotal =
                splitType === "equal"
                  ? equalShares[idx] || 0
                  : itemBucketSummaries[idx]?.totals.finalPayout || 0;
              const paid = Math.max(0, parseFloat(cfg.paidAmount) || 0);
              const due = Math.max(0, targetTotal - paid);

              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      Split Bill #{idx + 1}
                    </span>
                    <span className="font-mono tabular-nums text-base font-extrabold text-slate-900">
                      {currencySymbol}
                      {targetTotal.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-slate-600">
                      Assign Customer *
                    </Label>
                    <Select
                      value={cfg.customerId}
                      onValueChange={(val) =>
                        setPartConfigs((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, customerId: val } : p))
                        )
                      }
                    >
                      <SelectTrigger className="h-9 bg-white text-xs font-medium">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent className="z-[300]">
                        {activeCustomers.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">
                            {c.name} ({c.phone || "No phone"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-slate-600">
                        Payment Mode
                      </Label>
                      <Select
                        value={cfg.paymentMode}
                        onValueChange={(val) =>
                          setPartConfigs((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, paymentMode: val } : p))
                          )
                        }
                      >
                        <SelectTrigger className="h-9 bg-white text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[300]">
                          {paymentModes.map((mode) => (
                            <SelectItem key={mode} value={mode} className="text-xs">
                              {mode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-semibold text-slate-600">
                          Paid ({currencySymbol})
                        </Label>
                        <button
                          type="button"
                          onClick={() =>
                            setPartConfigs((prev) =>
                              prev.map((p, i) =>
                                i === idx ? { ...p, paidAmount: String(targetTotal) } : p
                              )
                            )
                          }
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Match Total
                        </button>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        value={cfg.paidAmount}
                        onChange={(e) =>
                          setPartConfigs((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, paidAmount: e.target.value } : p
                            )
                          )
                        }
                        className="h-9 bg-white font-mono tabular-nums text-xs font-bold"
                      />
                    </div>
                  </div>

                  {due > 0 && (
                    <p className="text-[11px] font-mono tabular-nums text-red-700 font-semibold">
                      Remaining Udhaar: {currencySymbol}
                      {due.toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-row items-center justify-between gap-3 shrink-0">
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
            disabled={!canSubmit}
            onClick={handleConfirm}
            className="h-10 px-5 bg-primary hover:bg-primary/90 text-xs font-bold rounded-lg text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Split Bills...
              </>
            ) : (
              `Generate ${splitType === "items" ? itemBucketSummaries.filter((s) => s.bucketItems.length > 0).length : partCount} Split Bills`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
