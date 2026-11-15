"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Loader2, PackageCheck, AlertCircle } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { computeCreditNoteBreakdown } from "@/lib/gst-reports";

const RETURN_REASONS = [
  "Sales Return",
  "Defective / Damaged Goods",
  "Post-Sale Discount",
  "Rate / Quantity Difference",
  "Order Cancelled After Dispatch",
];

interface CreditNoteModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
  business: any;
  currencySymbol: string;
  paymentModes: string[];
  isSaving?: boolean;
  onConfirm: (payload: ReturnType<typeof computeCreditNoteBreakdown>) => Promise<void> | void;
}

export function CreditNoteModal({
  isOpen,
  onOpenChange,
  invoice,
  business,
  currencySymbol,
  paymentModes,
  isSaving,
  onConfirm,
}: CreditNoteModalProps) {
  const items = useMemo(
    () => (Array.isArray(invoice?.items) ? invoice.items : []),
    [invoice]
  );

  const [returnQtyByIdx, setReturnQtyByIdx] = useState<Record<number, number>>({});
  const [reason, setReason] = useState<string>(RETURN_REASONS[0]);
  const [refundMode, setRefundMode] = useState<string>("Cash");
  const [restockInventory, setRestockInventory] = useState<boolean>(true);
  const [issueDate, setIssueDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!isOpen) return;
    const initial: Record<number, number> = {};
    items.forEach((it: any, idx: number) => {
      initial[idx] = Math.max(0, Number(it.quantity || 0));
    });
    setReturnQtyByIdx(initial);
    setReason(RETURN_REASONS[0]);
    setRefundMode(paymentModes[0] || "Cash");
    setRestockInventory(true);
    setIssueDate(new Date().toISOString().slice(0, 10));
  }, [isOpen, items, paymentModes]);

  const preview = useMemo(() => {
    return computeCreditNoteBreakdown({
      invoice,
      business,
      returnQuantities: returnQtyByIdx,
      reason,
      refundMode,
      restocked: restockInventory,
      isoDate: issueDate,
    });
  }, [invoice, business, returnQtyByIdx, reason, refundMode, restockInventory, issueDate]);

  const hasValidReturn = preview.items.length > 0 && preview.totals.invoiceValue > 0;
  const refundOptions = useMemo(() => {
    const base = paymentModes.length > 0 ? paymentModes : ["Cash", "UPI", "Bank", "Card"];
    return Array.from(new Set([...base, "Customer Credit"]));
  }, [paymentModes]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[660px] max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 p-0 text-left">
        <DialogHeader className="px-6 py-5 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Issue Credit Note / Sales Return
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Original Invoice <span className="font-mono font-semibold text-slate-700">{invoice?.invoiceId || invoice?.id}</span> ·{" "}
                {invoice?.customerName || "Customer"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* LINE ITEMS RETURN QUANTITIES */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700">
                Select Items &amp; Return Quantities
              </Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const full: Record<number, number> = {};
                    items.forEach((it: any, idx: number) => {
                      full[idx] = Math.max(0, Number(it.quantity || 0));
                    });
                    setReturnQtyByIdx(full);
                  }}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setReturnQtyByIdx({})}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              {items.map((item: any, idx: number) => {
                const maxQty = Math.max(0, Number(item.quantity || 0));
                const currentQty = returnQtyByIdx[idx] ?? 0;
                return (
                  <div
                    key={`${item.productId || idx}-${idx}`}
                    className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {item.name || "Item"}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        Billed Qty: {maxQty} · Rate: {currencySymbol}
                        {Number(item.price || 0).toLocaleString("en-IN")} · GST {Number(item.gstRate || 0)}%
                        {item.hsnCode ? ` · HSN ${item.hsnCode}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Label htmlFor={`cn-qty-${idx}`} className="text-xs text-slate-500">
                        Return Qty
                      </Label>
                      <Input
                        id={`cn-qty-${idx}`}
                        type="number"
                        min={0}
                        max={maxQty}
                        step="1"
                        value={currentQty}
                        onChange={(e) => {
                          const parsed = Math.max(
                            0,
                            Math.min(maxQty, Number.parseFloat(e.target.value) || 0)
                          );
                          setReturnQtyByIdx((prev) => ({ ...prev, [idx]: parsed }));
                        }}
                        className="h-9 w-24 font-mono text-right font-semibold"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CREDIT NOTE METADATA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Return Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="h-10 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Refund / Adjustment Mode</Label>
              <Select value={refundMode} onValueChange={setRefundMode}>
                <SelectTrigger className="h-10 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {refundOptions.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cn-issue-date" className="text-xs font-semibold text-slate-700">
                Credit Note Date
              </Label>
              <Input
                id="cn-issue-date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="h-10 text-xs font-mono"
              />
            </div>
          </div>

          {/* RESTOCK INVENTORY TOGGLE */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <div className="flex items-center gap-3">
              <PackageCheck className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-900">Restock Returned Items</p>
                <p className="text-[11px] text-slate-500">
                  Automatically add returned quantities back to product inventory stock.
                </p>
              </div>
            </div>
            <Switch checked={restockInventory} onCheckedChange={setRestockInventory} />
          </div>

          {/* LIVE GST REVERSAL SUMMARY */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Taxable Value Reversal</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {currencySymbol}
                {preview.totals.taxableValue.toLocaleString("en-IN")}
              </span>
            </div>
            {preview.isInterState ? (
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>IGST Reversal</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {currencySymbol}
                  {preview.totals.igst.toLocaleString("en-IN")}
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>CGST Reversal</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {currencySymbol}
                    {preview.totals.cgst.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>SGST Reversal</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {currencySymbol}
                    {preview.totals.sgst.toLocaleString("en-IN")}
                  </span>
                </div>
              </>
            )}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">
                Total Credit Note Value ({preview.isFullReturn ? "Full Return" : "Partial"})
              </span>
              <span className="text-lg font-mono tabular-nums font-extrabold text-amber-800">
                {currencySymbol}
                {preview.totals.invoiceValue.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {!hasValidReturn && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Set at least 1 returned item quantity to issue a Credit Note.</span>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!hasValidReturn || isSaving}
            onClick={() => onConfirm(preview)}
            className="h-10 px-5 text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Issuing...
              </>
            ) : (
              "Confirm Credit Note"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
