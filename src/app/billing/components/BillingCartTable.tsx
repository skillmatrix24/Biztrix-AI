"use client";

import { useState } from "react";
import { AlertTriangle, Minus, Plus, Scissors, ShoppingCart, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateGST } from "@/lib/mock-db";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { BillingLineItem } from "@/lib/billing-engine";

interface BillingCartTableProps {
  items: BillingLineItem[];
  setItems: (items: BillingLineItem[]) => void;
  isInterState: boolean;
  gstMode: "inclusive" | "exclusive";
  isQuotation?: boolean;
  currencySymbol?: string;
  onOpenSplitBill?: () => void;
}

export function BillingCartTable({
  items,
  setItems,
  isInterState,
  gstMode,
  isQuotation,
  currencySymbol = "₹",
  onOpenSplitBill,
}: BillingCartTableProps) {
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  const updateQty = (item: BillingLineItem, nextQty: number) => {
    if (nextQty <= 0) {
      setItems(items.filter((i) => i.id !== item.id));
      return;
    }
    if (!isQuotation && nextQty > item.stock) {
      toast({
        variant: "destructive",
        title: "Insufficient stock available.",
        description: `Only ${item.stock} units in stock for ${item.name}.`,
      });
      return;
    }
    setItems(items.map((i) => (i.id === item.id ? { ...i, quantity: nextQty } : i)));
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-bold text-slate-900">3. Bill Line Items</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {items.length} line{items.length === 1 ? "" : "s"} ·{" "}
            {items.reduce((sum, i) => sum + i.quantity, 0)} qty
          </span>
          {!isQuotation && items.length > 0 && onOpenSplitBill && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenSplitBill}
              className="h-7 px-2.5 rounded-md border-slate-200 text-xs font-semibold text-slate-700 hover:text-primary whitespace-nowrap"
            >
              <Scissors className="mr-1.5 h-3.5 w-3.5" />
              Split Bill
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[740px] w-full">
          <TableHeader>
            <TableRow className="bg-slate-50/80 border-b border-slate-200 hover:bg-slate-50/80">
              <TableHead className="px-5 h-10 text-xs font-semibold text-slate-600 text-left">
                Item Description
              </TableHead>
              <TableHead className="w-36 text-center h-10 text-xs font-semibold text-slate-600">
                Quantity
              </TableHead>
              <TableHead className="w-24 text-center h-10 text-xs font-semibold text-slate-600">
                Disc %
              </TableHead>
              <TableHead className="w-32 text-right h-10 text-xs font-semibold text-slate-600">
                Rate ({currencySymbol})
              </TableHead>
              <TableHead className="w-32 text-right pr-5 h-10 text-xs font-semibold text-slate-600">
                Line Total
              </TableHead>
              <TableHead className="w-12 h-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 px-5 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                    <ShoppingCart className="h-7 w-7 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700">No items in this bill yet</p>
                    <p className="text-xs text-slate-500">
                      Click any product card above or search by name/SKU to start billing.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const discountedPrice = item.price * (1 - (item.itemDiscount || 0) / 100);
                const lineAmount = discountedPrice * item.quantity;
                const gstData = calculateGST(lineAmount, item.gstRate || 0, isInterState, gstMode);
                const isOutOfStock = item.quantity > item.stock;
                const isRateEdited =
                  item.originalPrice !== undefined && item.price !== item.originalPrice;
                const showReasonInput =
                  expandedNoteId === item.id || isRateEdited || Boolean(item.rateChangeReason);

                return (
                  <TableRow
                    key={item.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                  >
                    <TableCell className="px-5 py-3 text-left align-top">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900 leading-snug">
                          {item.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                          <span>{item.gstRate}% GST</span>
                          <span aria-hidden="true">·</span>
                          <span>Stock: {item.stock}</span>
                          {isOutOfStock && (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-sans font-semibold">
                              <AlertTriangle className="h-3 w-3" />
                              {isQuotation ? "Quote Only" : "Exceeds stock"}
                            </span>
                          )}
                          {!showReasonInput && (
                            <button
                              type="button"
                              onClick={() => setExpandedNoteId(item.id)}
                              className="font-sans text-primary hover:underline ml-1"
                            >
                              + Rate note
                            </button>
                          )}
                        </div>

                        {showReasonInput && (
                          <Input
                            placeholder="Reason for price adjustment..."
                            value={item.rateChangeReason || ""}
                            onChange={(e) =>
                              setItems(
                                items.map((i) =>
                                  i.id === item.id
                                    ? { ...i, rateChangeReason: e.target.value }
                                    : i
                                )
                              )
                            }
                            className="h-7 mt-1.5 max-w-xs text-xs bg-slate-50 border-slate-200 rounded-md"
                          />
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 text-center align-top">
                      <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Decrease quantity of ${item.name}`}
                          className="h-7 w-7 rounded-md text-slate-600 hover:text-slate-900"
                          onClick={() => updateQty(item, item.quantity - 1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <input
                          type="number"
                          min={1}
                          aria-label={`Quantity for ${item.name}`}
                          value={item.quantity}
                          onChange={(e) => {
                            const parsed = parseInt(e.target.value, 10);
                            if (!Number.isNaN(parsed)) updateQty(item, parsed);
                          }}
                          className="w-10 text-center font-mono tabular-nums text-sm font-bold text-slate-900 bg-transparent outline-none"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Increase quantity of ${item.name}`}
                          className="h-7 w-7 rounded-md text-slate-600 hover:text-slate-900"
                          onClick={() => updateQty(item, item.quantity + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>

                    <TableCell className="py-3 text-center align-top">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        aria-label={`Discount percent for ${item.name}`}
                        value={item.itemDiscount}
                        onChange={(e) => {
                          const val = Math.min(
                            100,
                            Math.max(0, parseFloat(e.target.value) || 0)
                          );
                          setItems(
                            items.map((i) =>
                              i.id === item.id ? { ...i, itemDiscount: val } : i
                            )
                          );
                        }}
                        className="h-8 w-16 mx-auto text-center font-mono tabular-nums text-xs font-semibold bg-slate-50 border-slate-200 rounded-md"
                      />
                    </TableCell>

                    <TableCell className="py-3 text-right align-top">
                      <Input
                        type="number"
                        min={0}
                        aria-label={`Unit rate for ${item.name}`}
                        value={item.price}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          setItems(
                            items.map((i) => (i.id === item.id ? { ...i, price: val } : i))
                          );
                        }}
                        className={cn(
                          "h-8 w-24 ml-auto text-right font-mono tabular-nums text-xs font-bold rounded-md",
                          isRateEdited
                            ? "border-amber-300 bg-amber-50/70 text-amber-900"
                            : "border-slate-200 bg-slate-50 text-slate-900"
                        )}
                      />
                    </TableCell>

                    <TableCell className="py-3 pr-5 text-right align-top font-mono tabular-nums">
                      <p className="text-sm font-bold text-slate-900">
                        {currencySymbol}
                        {gstData.lineTotal.toLocaleString("en-IN")}
                      </p>
                      {gstData.gstAmount > 0 && (
                        <p className="text-[11px] text-slate-500">
                          Tax {currencySymbol}
                          {gstData.gstAmount.toLocaleString("en-IN")}
                        </p>
                      )}
                    </TableCell>

                    <TableCell className="py-3 pr-4 text-right align-top">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => setItems(items.filter((i) => i.id !== item.id))}
                        className="h-8 w-8 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
