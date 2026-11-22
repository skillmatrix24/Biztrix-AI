"use client";

import { useMemo, useRef, useState } from "react";
import {
  CloudUpload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  RefreshCw,
  Loader2,
  X,
  Upload,
  AlertTriangle,
  Info,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  parseCustomerSpreadsheet,
  downloadCustomerSampleExcel,
  downloadCustomerSampleCsv,
  CustomerImportRow,
  CustomerParseResult,
} from "@/lib/customer-import-export";
import { Customer } from "@/lib/mock-db";
import { cn } from "@/lib/utils";

interface CustomerImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCustomers: Customer[];
  remainingQuota: number | null; // null = unlimited
  onConfirmImport: (rows: CustomerImportRow[], updateExisting: boolean) => Promise<void> | void;
}

export function CustomerImportDialog({
  open,
  onOpenChange,
  existingCustomers,
  remainingQuota,
  onConfirmImport,
}: CustomerImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [parseResult, setParseResult] = useState<CustomerParseResult | null>(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Parse uploaded file
  const handleProcessFile = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();

    const isTextFile = file.name.endsWith(".csv") || file.type.includes("text") || file.type.includes("csv");

    if (isTextFile) {
      reader.onload = (e) => {
        const text = String(e.target?.result || "");
        const res = parseCustomerSpreadsheet(text, existingCustomers);
        setParseResult(res);
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (buffer) {
          const res = parseCustomerSpreadsheet(buffer, existingCustomers);
          setParseResult(res);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleProcessFile(file);
  };

  // Parse pasted text
  const handlePastedTextChange = (text: string) => {
    setPastedText(text);
    if (!text.trim()) {
      setParseResult(null);
      return;
    }
    const res = parseCustomerSpreadsheet(text, existingCustomers);
    setParseResult(res);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPastedText("");
    setParseResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      handleClear();
    }
    onOpenChange(val);
  };

  // Calculate importable rows based on options and quota
  const importableRows = useMemo(() => {
    if (!parseResult) return [];
    let list: CustomerImportRow[] = [...parseResult.validNew];
    if (updateExisting) {
      list = [...list, ...parseResult.validExisting];
    }
    if (remainingQuota !== null && remainingQuota >= 0) {
      // Quota applies strictly to new customers, while updating existing does not consume new quota
      const allowedNew = parseResult.validNew.slice(0, remainingQuota);
      return updateExisting ? [...allowedNew, ...parseResult.validExisting] : allowedNew;
    }
    return list;
  }, [parseResult, updateExisting, remainingQuota]);

  const quotaExceededCount = useMemo(() => {
    if (!parseResult || remainingQuota === null) return 0;
    return Math.max(0, parseResult.validNew.length - remainingQuota);
  }, [parseResult, remainingQuota]);

  const handleSubmit = async () => {
    if (importableRows.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirmImport(importableRows, updateExisting);
      handleClear();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-[700px] max-h-[calc(100dvh-2rem)] rounded-2xl border border-slate-300 bg-white p-0 overflow-hidden flex flex-col text-left shadow-xl">
        <DialogHeader className="px-5 py-4 sm:px-6 sm:py-5 bg-slate-900 text-white shrink-0 pr-12 text-left">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
              <FileSpreadsheet className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white">
                Import Customers from Excel / CSV
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300">
                Bulk upload customer directory with automatic phone deduplication &amp; format mapping.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4">
          {/* Sample Templates Download Strip */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-xl border border-slate-300 bg-slate-50/90 p-3 shadow-xs">
            <div className="text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Need the correct column format?</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Columns: Customer Name, Phone, Email, Company, Classification, Address, State, GSTIN, Opening Balance
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadCustomerSampleExcel}
                className="h-8 text-xs font-semibold rounded-lg border-slate-300 bg-white shadow-xs hover:border-slate-400 text-slate-700 flex-1 sm:flex-initial"
              >
                <Download className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                Sample .xlsx
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadCustomerSampleCsv}
                className="h-8 text-xs font-semibold rounded-lg border-slate-300 bg-white shadow-xs hover:border-slate-400 text-slate-700 flex-1 sm:flex-initial"
              >
                <Download className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                Sample .csv
              </Button>
            </div>
          </div>

          {/* Mode Tabs: File Upload vs Paste Table */}
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
            <TabsList className="grid grid-cols-2 w-full h-10 rounded-xl bg-slate-100 p-1 border border-slate-200">
              <TabsTrigger
                value="file"
                className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Upload Spreadsheet File
              </TabsTrigger>
              <TabsTrigger
                value="paste"
                className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Paste CSV or Table Data
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="pt-3 m-0 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {!selectedFile ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all",
                    isDragging
                      ? "border-primary bg-primary/5 scale-[0.99]"
                      : "border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400"
                  )}
                >
                  <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mb-3 border border-slate-200">
                    <CloudUpload className="h-6 w-6 text-slate-700" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    Click to browse or drag &amp; drop your file here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports Microsoft Excel (<span className="font-mono">.xlsx</span>, <span className="font-mono">.xls</span>) and Comma-Separated Values (<span className="font-mono">.csv</span>)
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-300 bg-white shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB · Spreadsheet ready
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 text-xs font-medium text-slate-700 hover:text-slate-900"
                    >
                      Change File
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="paste" className="pt-3 m-0 space-y-2">
              <Label className="text-xs font-semibold text-slate-700">
                Paste copied rows from Google Sheets or Excel:
              </Label>
              <Textarea
                value={pastedText}
                onChange={(e) => handlePastedTextChange(e.target.value)}
                placeholder="Name, Phone, Email, Business, Type, Address, State, GSTIN, OpeningBalance&#10;Rahul Sharma, 9876543210, rahul@example.com, Sharma Traders, Regular, Pune, Maharashtra, 27AABCU9603R1ZN, 0"
                className="min-h-[140px] font-mono text-xs leading-relaxed rounded-xl border-slate-300 shadow-xs focus-visible:ring-slate-900"
              />
            </TabsContent>
          </Tabs>

          {/* Parse Results & Validation Breakdown */}
          {parseResult && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-emerald-950">New Customers</span>
                  </div>
                  <Badge variant="outline" className="border-emerald-300 bg-white font-mono font-bold text-emerald-800 text-xs">
                    {parseResult.validNew.length}
                  </Badge>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="text-xs font-semibold text-blue-950">Existing to Update</span>
                  </div>
                  <Badge variant="outline" className="border-blue-300 bg-white font-mono font-bold text-blue-800 text-xs">
                    {parseResult.validExisting.length}
                  </Badge>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-xs font-semibold text-amber-950">Invalid / Skipped</span>
                  </div>
                  <Badge variant="outline" className="border-amber-300 bg-white font-mono font-bold text-amber-800 text-xs">
                    {parseResult.invalid.length}
                  </Badge>
                </div>
              </div>

              {/* Duplicate behavior toggle */}
              {parseResult.validExisting.length > 0 && (
                <div className="flex items-center space-x-2.5 p-3 rounded-xl border border-slate-300 bg-white shadow-xs">
                  <Checkbox
                    id="update-existing"
                    checked={updateExisting}
                    onCheckedChange={(checked) => setUpdateExisting(Boolean(checked))}
                  />
                  <Label
                    htmlFor="update-existing"
                    className="text-xs text-slate-700 font-medium cursor-pointer"
                  >
                    Update existing customers ({parseResult.validExisting.length}) if their mobile phone matches
                  </Label>
                </div>
              )}

              {/* Quota limit warning */}
              {quotaExceededCount > 0 && (
                <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Customer Quota Notice:</span>
                    <p className="mt-0.5 text-red-800">
                      Your current plan allows {remainingQuota} more new customer profiles. The first {remainingQuota} will be imported, and {quotaExceededCount} profiles exceed the quota.
                    </p>
                  </div>
                </div>
              )}

              {/* Invalid Rows Details */}
              {parseResult.invalid.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                    <Info className="h-3.5 w-3.5" />
                    <span>Skipped Rows ({parseResult.invalid.length}):</span>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] text-amber-800 font-mono">
                    {parseResult.invalid.slice(0, 10).map((inv, i) => (
                      <div key={i} className="truncate">
                        Row {inv.rowNumber}: {inv.reason} {inv.name ? `(${inv.name})` : ""}
                      </div>
                    ))}
                    {parseResult.invalid.length > 10 && (
                      <div className="text-amber-700 italic">
                        ...and {parseResult.invalid.length - 10} more rows skipped.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Preview Table of mapped columns */}
              {parseResult.previewRows.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Data Preview (First {parseResult.previewRows.length} rows):</span>
                    <span className="text-[11px] font-normal text-slate-500 font-mono">
                      Total: {importableRows.length} will be imported
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-300 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-300 bg-slate-50 text-[11px] font-semibold text-slate-600">
                            <th className="py-2 px-3">Name</th>
                            <th className="py-2 px-3">Phone</th>
                            <th className="py-2 px-3">Type</th>
                            <th className="py-2 px-3">Company</th>
                            <th className="py-2 px-3">State</th>
                            <th className="py-2 px-3 text-right">Balance</th>
                            <th className="py-2 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {parseResult.previewRows.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">
                                {row.name}
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">
                                {row.phone}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                  {row.customerType}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-600 truncate max-w-[120px]">
                                {row.businessName || "—"}
                              </td>
                              <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                                {row.state || "—"}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                                ₹{row.openingBalance.toLocaleString("en-IN")}
                              </td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                {row.isExisting ? (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-blue-300 text-blue-700 bg-blue-50 font-normal">
                                    Update
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-300 text-emerald-700 bg-emerald-50 font-normal">
                                    New
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 sm:p-5 bg-slate-50 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 order-2 sm:order-1 text-center sm:text-left">
            {importableRows.length > 0 ? (
              <span className="font-semibold text-slate-900">
                Ready to commit {importableRows.length} customer records
              </span>
            ) : (
              <span>Select or drop a valid spreadsheet to continue</span>
            )}
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto order-1 sm:order-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
              className="h-10 px-4 rounded-xl border-slate-300 text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-400 w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={importableRows.length === 0 || isSubmitting}
              className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing Customers...
                </>
              ) : (
                <>
                  <Upload className="mr-1.5 h-4 w-4" />
                  Import {importableRows.length > 0 ? `${importableRows.length} ` : ""}Customers
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
