"use client";

import { Eye, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InvoicePrintTemplate } from "./InvoicePrintTemplate";

interface PreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  lastInvoice: any;
  business: any;
  currencySymbol: string;
  isSaving: boolean;
  isQuotation?: boolean;
  handleSave: () => void;
}

export function PreviewDialog({
  isOpen,
  onOpenChange,
  lastInvoice,
  business,
  currencySymbol,
  isSaving,
  isQuotation,
  handleSave,
}: PreviewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] h-[90vh] max-h-[90vh] p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl flex flex-col bg-white text-left">
        <DialogHeader className="px-6 py-4 bg-slate-900 text-white shrink-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Eye className="h-4 w-4 text-sky-300 shrink-0" />
            <DialogTitle className="text-base font-bold text-white">
              {isQuotation ? "Quotation Preview" : "Tax Invoice Preview"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-slate-100 overflow-auto py-8 px-4 flex justify-center">
          <div className="scale-75 sm:scale-95 origin-top shadow-lg">
            <InvoicePrintTemplate
              invoice={lastInvoice}
              business={business}
              currencySymbol={currencySymbol}
              isPreview
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-white border-t border-slate-200 flex flex-row gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 rounded-lg text-xs font-semibold"
          >
            Back to Edit
          </Button>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              handleSave();
            }}
            disabled={isSaving}
            className="flex-1 h-10 bg-primary hover:bg-primary/90 text-xs font-bold rounded-lg text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Saving...
              </>
            ) : isQuotation ? (
              "Confirm & Save Quotation"
            ) : (
              "Confirm & Complete Sale"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
