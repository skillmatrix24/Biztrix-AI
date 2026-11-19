"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildSampleTeamMembersCsvTemplate,
  parseTeamMembersCsvImport,
  type TeamMemberCsvDraft,
} from "@/lib/staff-payroll";
import { toast } from "@/hooks/use-toast";

interface TeamImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingMembers: any[];
  currencySymbol: string;
  onConfirmImport: (rows: TeamMemberCsvDraft[]) => Promise<void>;
}

export function TeamImportDialog({
  open,
  onOpenChange,
  existingMembers,
  currencySymbol,
  onConfirmImport,
}: TeamImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const parseResult = useMemo(
    () => parseTeamMembersCsvImport(csvText, existingMembers),
    [csvText, existingMembers]
  );

  const handleDownloadSample = () => {
    const csv = buildSampleTeamMembersCsvTemplate();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "team-members-sample.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Sample CSV Downloaded" });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result || ""));
    };
    reader.readAsText(file);
  };

  const handleResetAndClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCsvText("");
      setFileName("");
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (parseResult.valid.length === 0 || isImporting) return;
    setIsImporting(true);
    try {
      await onConfirmImport(parseResult.valid);
      setCsvText("");
      setFileName("");
      onOpenChange(false);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleResetAndClose}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl border-slate-200 p-0 overflow-hidden text-left">
        <DialogHeader className="p-6 bg-slate-900 text-white text-left">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
              <CloudUpload className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">
                Import Team Members (CSV)
              </DialogTitle>
              <DialogDescription className="text-slate-300 text-xs mt-0.5">
                Upload a CSV file or paste rows to bulk-add pending staff & sync invite links.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 max-h-[68vh] overflow-y-auto bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileSpreadsheet className="h-4 w-4 text-slate-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {fileName || "Upload a .csv file or download template"}
                </p>
                <p className="text-[11px] text-slate-500">
                  Columns: Name, Email, Phone, Role, Daily Rate, Shift Hours, Shift Timings, Address
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadSample}
                className="h-8 px-3 rounded-lg text-xs font-semibold bg-white border-slate-200 whitespace-nowrap"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Template
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 px-3 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white whitespace-nowrap"
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Choose CSV
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="team-csv-paste" className="text-xs font-semibold text-slate-700">
              Or Paste CSV Data Directly
            </Label>
            <Textarea
              id="team-csv-paste"
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"Name,Email,Phone,Role,Daily Rate\nAarav Sharma,aarav@company.com,9876543210,Manager,900"}
              className="rounded-xl text-xs font-mono bg-white border-slate-200 resize-y"
            />
          </div>

          {(parseResult.valid.length > 0 || parseResult.skipped.length > 0) && (
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 tabular-nums">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {parseResult.valid.length} ready to import
                </span>
                {parseResult.skipped.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 tabular-nums">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {parseResult.skipped.length} skipped (duplicates or invalid)
                  </span>
                )}
              </div>

              {parseResult.valid.length > 0 && (
                <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-44 overflow-y-auto">
                  {parseResult.valid.slice(0, 12).map((row, idx) => (
                    <div
                      key={`${row.email || row.phone}_${idx}`}
                      className="px-3.5 py-2 flex items-center justify-between gap-2 text-xs bg-white"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {row.name}{" "}
                          <span className="font-normal text-slate-500">· {row.role}</span>
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 truncate">
                          {[row.email, row.phone].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <span className="text-xs font-mono tabular-nums font-semibold text-slate-700 shrink-0">
                        {currencySymbol}
                        {row.dailyRate}/d
                      </span>
                    </div>
                  ))}
                  {parseResult.valid.length > 12 && (
                    <div className="px-3.5 py-2 text-[11px] text-slate-500 bg-slate-50 text-center">
                      +{parseResult.valid.length - 12} more valid members ready
                    </div>
                  )}
                </div>
              )}

              {parseResult.skipped.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-1 max-h-28 overflow-y-auto">
                  {parseResult.skipped.slice(0, 8).map((sk) => (
                    <p key={sk.rowNumber} className="text-[11px] text-amber-900">
                      <span className="font-mono font-semibold">Row {sk.rowNumber}</span>
                      {sk.name ? ` (${sk.name})` : ""}: {sk.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200 flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleResetAndClose(false)}
            className="flex-1 h-10 rounded-xl text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={parseResult.valid.length === 0 || isImporting}
            onClick={handleSubmit}
            className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold tabular-nums"
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CloudUpload className="mr-1.5 h-3.5 w-3.5" />
                Import {parseResult.valid.length || ""} Member
                {parseResult.valid.length === 1 ? "" : "s"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
