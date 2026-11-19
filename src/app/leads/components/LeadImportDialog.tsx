"use client";

import { useMemo, useRef, useState } from "react";
import { CloudUpload, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildSampleLeadsCsvTemplate,
  parseLeadsCsvImport,
  type ParsedCsvLeadDraft,
} from "@/lib/crm-engine";
import { type Lead } from "@/lib/mock-db";

interface LeadImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingLeads: Lead[];
  remainingQuota: number | null; // null = unlimited
  onConfirmImport: (rows: ParsedCsvLeadDraft[]) => Promise<void> | void;
}

export function LeadImportDialog({
  open,
  onOpenChange,
  existingLeads,
  remainingQuota,
  onConfirmImport,
}: LeadImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [csvText, setCsvText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parseResult = useMemo(() => {
    if (!csvText.trim()) return null;
    return parseLeadsCsvImport(csvText, existingLeads);
  }, [csvText, existingLeads]);

  const importableRows = useMemo(() => {
    if (!parseResult) return [];
    if (remainingQuota === null) return parseResult.validRows;
    return parseResult.validRows.slice(0, Math.max(0, remainingQuota));
  }, [parseResult, remainingQuota]);

  const handleDownloadSample = () => {
    const csv = buildSampleLeadsCsvTemplate();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "leads-import-sample.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCsvText(reader.result);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (importableRows.length === 0) return;
    setIsSubmitting(true);
    try {
      await onConfirmImport(importableRows);
      setCsvText("");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) setCsvText("");
        onOpenChange(val);
      }}
    >
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-[560px] max-h-[calc(100dvh-2rem)] rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden flex flex-col text-left">
        <DialogHeader className="px-5 py-4 sm:px-6 sm:py-5 bg-slate-900 text-white shrink-0 pr-12 text-left">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <CloudUpload className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white">
                Import Leads from CSV
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300">
                Bulk upload inquiries with automatic phone deduplication and stage mapping.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
            <div className="text-xs text-slate-600">
              Required columns: <span className="font-semibold text-slate-900">Name, Phone</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadSample}
              className="h-8 px-3 text-xs font-semibold rounded-lg bg-white"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Sample CSV
            </Button>
          </div>

          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-11 rounded-xl border-dashed border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4 text-slate-500" /> Choose CSV File from Device
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="csv-paste-area" className="text-xs font-medium text-slate-700">
              Or Paste CSV Rows
            </Label>
            <Textarea
              id="csv-paste-area"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={5}
              placeholder={"Name,Phone,Source,Stage,Priority,DealValue\nAmit Verma,9876543210,WhatsApp,new,Hot,25000"}
              className="rounded-xl text-xs font-mono resize-none"
            />
          </div>

          {parseResult && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-emerald-700 tabular-nums">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {importableRows.length} valid lead{importableRows.length === 1 ? "" : "s"} ready
                </span>
                {parseResult.skippedRows.length > 0 && (
                  <span className="flex items-center gap-1.5 font-medium text-amber-700 tabular-nums">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {parseResult.skippedRows.length} skipped
                  </span>
                )}
              </div>

              {remainingQuota !== null && parseResult.validRows.length > remainingQuota && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  Active pipeline quota allows importing {Math.max(0, remainingQuota)} of{" "}
                  {parseResult.validRows.length} valid rows on your current plan.
                </p>
              )}

              {parseResult.skippedRows.length > 0 && (
                <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] text-slate-600 border-t border-slate-200 pt-2">
                  {parseResult.skippedRows.slice(0, 10).map((skip, idx) => (
                    <p key={idx} className="truncate">
                      Row {skip.rowNumber}
                      {skip.rawName ? ` (${skip.rawName})` : ""}: {skip.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-5 py-3.5 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-200 shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 text-xs font-semibold rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={importableRows.length === 0 || isSubmitting}
            onClick={handleImport}
            className="h-10 px-5 text-xs font-semibold rounded-xl"
          >
            {isSubmitting
              ? "Importing..."
              : `Import ${importableRows.length} Lead${importableRows.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
