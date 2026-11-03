"use client";

import { useState } from "react";
import { CheckCircle2, Printer, Download, ArrowRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface SuccessDialogProps {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  isQuotation: boolean;
  lastInvoice: any;
}

export function SuccessDialog({ isOpen, onOpenChange, isQuotation, lastInvoice }: SuccessDialogProps) {
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!lastInvoice) return;
    const element = document.getElementById("printable-invoice");
    if (!element) {
      toast({ variant: "destructive", title: "Error", description: "Template node not found." });
      return;
    }

    setIsDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(element, {
        scale: 2.0, 
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      pdf.save(`${isQuotation ? 'Quotation' : 'Invoice'}_${lastInvoice.invoiceId}.pdf`);
      
      toast({ title: "PDF Generated" });
    } catch (error) {
    console.error(error);
      toast({ variant: "destructive", title: "Download Failed" });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] sm:rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden text-left">
        <DialogHeader className="p-10 text-white border-b relative text-left bg-primary">
          <div className="absolute top-0 right-0 p-10 text-white/10"><CheckCircle2 className="h-32 w-32" /></div>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">{isQuotation ? 'Quotation Ready' : 'Execution Complete'}</DialogTitle>
        </DialogHeader>
        <div className="p-10 text-center space-y-8">
          <div className="h-28 w-28 rounded-[2rem] bg-green-50 flex items-center justify-center mx-auto border-4 border-white shadow-2xl animate-in zoom-in-50 duration-700">
            <CheckCircle2 className="h-14 w-14 text-green-600" />
          </div>
          <div className="space-y-3">
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{isQuotation ? 'Draft Success!' : 'Settlement Success!'}</h3>
            <p className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em]">Logged Node: {lastInvoice?.invoiceId}</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Button onClick={() => window.print()} className="h-16 bg-primary rounded-2xl font-black text-sm uppercase tracking-widest gap-3 shadow-2xl text-white">
              <Printer className="h-6 w-6" /> Print A4 Document
            </Button>
            <Button 
              onClick={handleDownloadPDF} 
              disabled={isDownloading}
              className="h-16 bg-white border-2 border-primary text-primary hover:bg-primary/5 rounded-2xl font-black text-sm uppercase tracking-widest gap-3 shadow-xl"
            >
              {isDownloading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Download className="h-6 w-6" />}
              Download PDF
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" onClick={() => router.push(isQuotation ? '/quotations' : '/dashboard')} className="h-12 rounded-xl font-black uppercase text-[10px] tracking-widest opacity-60">Close Node <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
