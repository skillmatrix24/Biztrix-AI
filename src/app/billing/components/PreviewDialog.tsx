
"use client";

import { Eye, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InvoicePrintTemplate } from "./InvoicePrintTemplate";
import { cn } from "@/lib/utils";

interface PreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  lastInvoice: any;
  business: any;
  currencySymbol: string;
  isSaving: boolean;
  handleSave: () => void;
}

export function PreviewDialog({ isOpen, onOpenChange, lastInvoice, business, currencySymbol, isSaving, handleSave }: PreviewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] h-[95vh] p-0 overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border-none shadow-2xl flex flex-col bg-white text-left">
         <DialogHeader className="p-6 bg-slate-900 text-white shrink-0 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                 <Eye className="h-5 w-5 text-accent" />
               </div>
               <DialogTitle className="text-lg font-black uppercase tracking-widest text-white">Document Audit Preview</DialogTitle>
            </div>
         </DialogHeader>
         <div className="flex-1 bg-slate-100 overflow-auto relative">
            <div className="py-8 sm:py-12 flex justify-center items-start min-h-full">
              <div className={cn("bg-white shadow-2xl border border-border/50 origin-top transition-transform duration-300 scale-[0.45] xs:scale-[0.55] sm:scale-[0.75] md:scale-100")}>
                 <InvoicePrintTemplate invoice={lastInvoice} business={business} currencySymbol={currencySymbol} isPreview />
              </div>
            </div>
         </div>
         <DialogFooter className="p-6 bg-white border-t flex flex-row gap-3 shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-12 rounded-xl font-bold uppercase text-[10px]">Back to Editing</Button>
            <Button onClick={() => { onOpenChange(false); handleSave(); }} disabled={isSaving} className="flex-1 h-12 bg-primary font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl text-white">
              {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Save & Finalize"}
            </Button>
         </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
