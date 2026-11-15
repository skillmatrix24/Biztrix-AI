"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Banknote, Loader2 } from "lucide-react";
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
import {
  buildPaymentRecoveryAllocation,
  getInvoiceDueSummary,
  type InvoicePaymentHistoryEntry,
} from "@/lib/invoice-recovery";

interface CollectPaymentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
  currencySymbol: string;
  paymentModes: string[];
  recordedBy: string;
  isSaving?: boolean;
  onConfirm: (
    allocation: ReturnType<typeof buildPaymentRecoveryAllocation>
  ) => Promise<void> | void;
}

export function CollectPaymentModal({
  isOpen,
  onOpenChange,
  invoice,
  currencySymbol,
  paymentModes,
  recordedBy,
  isSaving,
  onConfirm,
}: CollectPaymentModalProps) {
  const dueSummary = useMemo(() => getInvoiceDueSummary(invoice), [invoice]);
  const modes = useMemo(
    () => (paymentModes.length > 0 ? paymentModes : ["Cash", "UPI", "Bank", "Card"]),
    [paymentModes]
  );

  const [amountInput, setAmountInput] = useState("");
  const [mode, setMode] = useState(modes[0] || "Cash");
  const [isoDate, setIsoDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setAmountInput(dueSummary.dueAmount > 0 ? String(dueSummary.dueAmount) : "");
    setMode(modes[0] || "Cash");
    setIsoDate(new Date().toISOString().slice(0, 10));
    setNote("");
  }, [isOpen, dueSummary.dueAmount, modes]);

  const parsedAmount = Number.parseFloat(amountInput) || 0;
  const allocation = useMemo(
    () =>
      buildPaymentRecoveryAllocation({
        invoice,
        paymentAmount: parsedAmount,
        mode,
        isoDate,
        note,
        recordedBy,
      }),
    [invoice, parsedAmount, mode, isoDate, note, recordedBy]
  );

  const history: InvoicePaymentHistoryEntry[] = Array.isArray(invoice?.paymentHistory)
    ? invoice.paymentHistory
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 p-0 text-left">
        <DialogHeader className="px-6 py-5 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Collect Due Payment
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Invoice{" "}
                <span className="font-mono font-semibold text-slate-700">
                  {invoice?.invoiceId || invoice?.id}
                </span>{" "}
                · {invoice?.customerName || "Customer"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* BILL SUMMARY */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Net Invoice Value</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {currencySymbol}
                {dueSummary.netBillAmount.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Already Collected</span>
              <span className="font-mono tabular-nums font-semibold text-emerald-700">
                {currencySymbol}
                {dueSummary.collectedAmount.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">Pending Due (Udhaar)</span>
              <span className="text-lg font-mono tabular-nums font-extrabold text-amber-800">
                {currencySymbol}
                {dueSummary.dueAmount.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* AMOUNT + FULL DUE SHORTCUT */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="collect-amount" className="text-xs font-semibold text-slate-700">
                Amount Received ({currencySymbol})
              </Label>
              <button
                type="button"
                onClick={() => setAmountInput(String(dueSummary.dueAmount))}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Fill Full Due ({currencySymbol}
                {dueSummary.dueAmount.toLocaleString("en-IN")})
              </button>
            </div>
            <Input
              id="collect-amount"
              type="number"
              min="1"
              max={dueSummary.dueAmount}
              step="0.01"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="h-11 font-mono text-base font-bold"
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Payment Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="h-10 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modes.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="collect-date" className="text-xs font-semibold text-slate-700">
                Collection Date
              </Label>
              <Input
                id="collect-date"
                type="date"
                value={isoDate}
                onChange={(e) => setIsoDate(e.target.value)}
                className="h-10 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="collect-note" className="text-xs font-semibold text-slate-700">
              Reference / Note (Optional)
            </Label>
            <Input
              id="collect-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., UPI Ref #40291 or Cash settled"
              className="h-10 text-xs"
            />
          </div>

          {!allocation.valid && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{allocation.error}</span>
            </div>
          )}

          {allocation.valid && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 flex items-center justify-between text-xs text-emerald-900">
              <span>Remaining Due After Payment</span>
              <span className="font-mono tabular-nums font-bold">
                {currencySymbol}
                {allocation.dueAmount.toLocaleString("en-IN")} ({allocation.paymentStatus})
              </span>
            </div>
          )}

          {history.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-700">
                Previous Recoveries ({history.length})
              </p>
              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                {history.map((h, i) => (
                  <div
                    key={`${h.recordedAt}-${i}`}
                    className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 rounded-md px-3 py-1.5"
                  >
                    <span>
                      {h.isoDate} · {h.mode}
                      {h.note ? ` · ${h.note}` : ""}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {currencySymbol}
                      {Number(h.amount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
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
            disabled={!allocation.valid || isSaving}
            onClick={() => onConfirm(allocation)}
            className="h-10 px-5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Recording...
              </>
            ) : (
              "Confirm Payment Collection"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
