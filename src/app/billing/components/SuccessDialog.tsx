"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileJson,
  Loader2,
  MessageCircle,
  Plus,
  Printer,
  Scissors,
  Truck,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SuccessDialogProps {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  isQuotation: boolean;
  isRewardSyncMode?: boolean;
  lastInvoice: any;
  isDownloading: boolean;
  onPrintAction: (mode: "a4" | "thermal") => void;
  onDownloadPDF: (mode: "a4" | "thermal") => void;
  onStartNewBill: () => void;
  splitInvoices?: any[];
  activeSplitIndex?: number;
  onSelectSplitIndex?: (idx: number) => void;
  onDownloadEWayJson?: () => void;
  onSaveEwbNumber?: (invoiceId: string, ewbNumber: string, validUpto: string) => Promise<void>;
  onGenerateLiveEwb?: (invoiceId: string) => Promise<void>;
  isGspConfigured?: boolean;
  isGeneratingLiveEwb?: boolean;
  onShareWhatsApp?: () => void;
}

export function SuccessDialog({
  isOpen,
  onOpenChange,
  isQuotation,
  isRewardSyncMode,
  lastInvoice,
  isDownloading,
  onPrintAction,
  onDownloadPDF,
  onStartNewBill,
  splitInvoices = [],
  activeSplitIndex = 0,
  onSelectSplitIndex,
  onDownloadEWayJson,
  onSaveEwbNumber,
  onGenerateLiveEwb,
  isGspConfigured = false,
  isGeneratingLiveEwb = false,
  onShareWhatsApp,
}: SuccessDialogProps) {
  const router = useRouter();
  const hasMultipleSplits = splitInvoices.length > 1;
  const [ewbInput, setEwbInput] = useState("");
  const [validUptoInput, setValidUptoInput] = useState("");
  const [isSavingEwb, setIsSavingEwb] = useState(false);

  const showEWayTools = !isQuotation && !isRewardSyncMode && Boolean(lastInvoice?.invoiceId);
  const currentEwbNo = lastInvoice?.ewayBill?.ewbNumber || "";
  const isOver50k = Number(lastInvoice?.totals?.finalPayout || 0) > 50000;

  const handleSaveEwb = async () => {
    if (!onSaveEwbNumber || !lastInvoice?.invoiceId) return;
    const clean = ewbInput.replace(/\D/g, "");
    if (clean.length !== 12) return;
    setIsSavingEwb(true);
    try {
      await onSaveEwbNumber(lastInvoice.invoiceId, clean, validUptoInput.trim());
      setEwbInput("");
      setValidUptoInput("");
    } finally {
      setIsSavingEwb(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[490px] max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 p-0 overflow-hidden text-left bg-white">
        <DialogHeader className="px-6 py-5 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              {hasMultipleSplits ? (
                <Scissors className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">
                {hasMultipleSplits
                  ? `${splitInvoices.length} Split Bills Generated`
                  : isQuotation
                    ? "Quotation Saved"
                    : isRewardSyncMode
                      ? "Rewards Synced"
                      : "Bill Generated Successfully"}
              </DialogTitle>
              <DialogDescription className="text-xs font-mono text-slate-300 mt-0.5">
                Ref: {lastInvoice?.invoiceId || "N/A"} · {lastInvoice?.customerName || "Customer"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          {hasMultipleSplits && onSelectSplitIndex && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">
                Select Split Bill to Print or Download
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {splitInvoices.map((inv, idx) => {
                  const isActive = idx === activeSplitIndex;
                  return (
                    <button
                      key={inv.invoiceId || idx}
                      type="button"
                      onClick={() => onSelectSplitIndex(idx)}
                      className={cn(
                        "rounded-lg border p-2.5 text-left transition-colors",
                        isActive
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-900">
                          Bill #{idx + 1} · {inv.invoiceId}
                        </span>
                        <span className="font-mono tabular-nums text-xs font-extrabold text-slate-900">
                          ₹{Number(inv.totals?.finalPayout || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5">
                        {inv.customerName || "Customer"} · {inv.paymentMode}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              {isQuotation
                ? "Quoted Amount"
                : hasMultipleSplits
                  ? `Bill #${activeSplitIndex + 1} Payable`
                  : "Net Payable"}
            </span>
            <span className="font-mono tabular-nums text-2xl font-extrabold text-slate-900">
              ₹{Number(lastInvoice?.totals?.finalPayout || 0).toLocaleString("en-IN")}
            </span>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-700">Print or Download Document</p>
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                type="button"
                onClick={() => onPrintAction("a4")}
                className="h-11 bg-primary hover:bg-primary/90 rounded-lg text-xs font-semibold text-white"
              >
                <Printer className="mr-1.5 h-4 w-4" />
                Print A4
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onDownloadPDF("a4")}
                disabled={isDownloading}
                className="h-11 rounded-lg border-slate-200 text-xs font-semibold text-slate-800"
              >
                {isDownloading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-4 w-4" />
                )}
                PDF A4
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Button
                type="button"
                onClick={() => onPrintAction("thermal")}
                className="h-11 bg-slate-900 hover:bg-slate-800 rounded-lg text-xs font-semibold text-white"
              >
                <Printer className="mr-1.5 h-4 w-4" />
                Print Receipt
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onDownloadPDF("thermal")}
                disabled={isDownloading}
                className="h-11 rounded-lg border-slate-200 text-xs font-semibold text-slate-800"
              >
                {isDownloading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-4 w-4" />
                )}
                PDF Receipt
              </Button>
            </div>
          </div>

          {showEWayTools && (onDownloadEWayJson || onSaveEwbNumber) && (
            <div
              className={cn(
                "rounded-xl border p-3.5 space-y-3",
                isOver50k && !currentEwbNo
                  ? "border-amber-200 bg-amber-50/70"
                  : "border-slate-200 bg-slate-50/70"
              )}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-slate-700" />
                  <span className="text-xs font-bold text-slate-900">
                    E-Way Bill (NIC Portal)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isGspConfigured && onGenerateLiveEwb && !currentEwbNo && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isGeneratingLiveEwb}
                      onClick={() => onGenerateLiveEwb(lastInvoice.invoiceId)}
                      className="h-7 px-2.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-[11px] font-semibold text-white whitespace-nowrap"
                    >
                      {isGeneratingLiveEwb ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Zap className="mr-1 h-3 w-3" />
                      )}
                      Generate Live EWB
                    </Button>
                  )}
                  {onDownloadEWayJson && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={onDownloadEWayJson}
                      className="h-7 px-2.5 rounded-md bg-white border-slate-200 text-[11px] font-semibold text-slate-800 whitespace-nowrap"
                    >
                      <FileJson className="mr-1 h-3.5 w-3.5 text-primary" />
                      NIC JSON
                    </Button>
                  )}
                </div>
              </div>

              {currentEwbNo ? (
                <p className="text-xs font-mono font-bold text-emerald-700">
                  EWB No: {currentEwbNo}
                  {lastInvoice?.ewayBill?.ewbValidUpto
                    ? ` · Valid: ${lastInvoice.ewayBill.ewbValidUpto}`
                    : ""}
                </p>
              ) : (
                onSaveEwbNumber && (
                  <div className="space-y-2">
                    <div className="flex gap-1.5">
                      <Input
                        maxLength={12}
                        placeholder="Paste 12-digit EWB No."
                        value={ewbInput}
                        onChange={(e) => setEwbInput(e.target.value.replace(/\D/g, "").slice(0, 12))}
                        className="h-8 bg-white font-mono tabular-nums text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={ewbInput.replace(/\D/g, "").length !== 12 || isSavingEwb}
                        onClick={handleSaveEwb}
                        className="h-8 px-3 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shrink-0"
                      >
                        {isSavingEwb ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                      </Button>
                    </div>
                    {ewbInput.length > 0 && (
                      <Input
                        placeholder="Valid upto (optional, e.g. 16/11/2026)"
                        value={validUptoInput}
                        onChange={(e) => setValidUptoInput(e.target.value)}
                        className="h-7 bg-white font-mono text-[11px]"
                      />
                    )}
                  </div>
                )
              )}
            </div>
          )}

          {onShareWhatsApp && lastInvoice && (
            <Button
              type="button"
              variant="outline"
              onClick={onShareWhatsApp}
              className="w-full h-10 rounded-lg border-emerald-200 bg-emerald-50/70 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              <MessageCircle className="mr-1.5 h-4 w-4" />
              Share Bill / Payment Link on WhatsApp
            </Button>
          )}

          <div className="pt-2 border-t border-slate-200 flex items-center gap-2.5">
            <DialogClose asChild>
              <Button
                type="button"
                onClick={onStartNewBill}
                className="flex-1 h-10 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold text-white"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                New Bill
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push(isQuotation ? "/quotations" : "/dashboard")}
                className="h-10 px-3 rounded-lg text-xs font-semibold text-slate-600"
              >
                {isQuotation ? "Quotations" : "Dashboard"}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
