"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Download,
  FileJson,
  FileSpreadsheet,
  Loader2,
  Receipt,
  Settings,
} from "lucide-react";
import { collection, doc, orderBy, query } from "firebase/firestore";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildGstr1Json,
  buildGstr1SummaryCsv,
  computeGstReportBundle,
  downloadTextFile,
  isValidGstin,
  type GstPeriodFilter,
  type GstPeriodMode,
} from "@/lib/gst-reports";

type GstTab = "gstr3b" | "b2b" | "b2c" | "hsn" | "cdnr";

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentQuarterKey(): string {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()}-Q${q}`;
}

function buildQuarterOptions(): string[] {
  const year = new Date().getFullYear();
  return [
    `${year}-Q1`,
    `${year}-Q2`,
    `${year}-Q3`,
    `${year}-Q4`,
    `${year - 1}-Q4`,
    `${year - 1}-Q3`,
  ];
}

export default function GstReportsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const userProfileRef = useMemoFirebase(
    () =>
      !isUserLoading && user?.uid && !user.isAnonymous
        ? doc(firestore, "users", user.uid)
        : null,
    [firestore, user?.uid, isUserLoading, user?.isAnonymous]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const invoicesQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "invoices"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: rawInvoices, isLoading: isInvoicesLoading } = useCollection<any>(invoicesQuery);

  const creditNotesQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "creditNotes"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: rawCreditNotes, isLoading: isCreditNotesLoading } =
    useCollection<any>(creditNotesQuery);

  const cashbookQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "cashbook"),
            orderBy("date", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: rawCashbook, isLoading: isCashbookLoading } = useCollection<any>(cashbookQuery);

  const [periodMode, setPeriodMode] = useState<GstPeriodMode>("month");
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey);
  const [selectedQuarter, setSelectedQuarter] = useState<string>(getCurrentQuarterKey);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [activeTab, setActiveTab] = useState<GstTab>("gstr3b");

  const quarterOptions = useMemo(() => buildQuarterOptions(), []);
  const currencySymbol = getCurrencySymbol(business?.currency);

  const periodFilter: GstPeriodFilter = useMemo(
    () => ({
      mode: periodMode,
      month: selectedMonth,
      quarter: selectedQuarter,
      startDate,
      endDate,
    }),
    [periodMode, selectedMonth, selectedQuarter, startDate, endDate]
  );

  const report = useMemo(() => {
    return computeGstReportBundle({
      invoices: rawInvoices || [],
      creditNotes: rawCreditNotes || [],
      cashbookEntries: rawCashbook || [],
      business,
      filter: periodFilter,
    });
  }, [rawInvoices, rawCreditNotes, rawCashbook, business, periodFilter]);

  const hasValidBusinessGstin = isValidGstin(business?.gstin);
  const isDataLoading = isInvoicesLoading || isCreditNotesLoading || isCashbookLoading;

  const handleDownloadGstr1Json = () => {
    const payload = buildGstr1Json(report);
    downloadTextFile(
      JSON.stringify(payload, null, 2),
      `GSTR1_${report.supplierGstin || "URP"}_${report.filingPeriodCode}.json`,
      "application/json"
    );
    toast({
      title: `GSTR-1 JSON Exported (${report.filingPeriodCode})`,
      description: "Ready to import in the GST Offline Utility or upload to gst.gov.in.",
    });
  };

  const handleDownloadCsv = () => {
    const csv = buildGstr1SummaryCsv(report);
    downloadTextFile(
      csv,
      `GSTR1_Summary_${report.filingPeriodCode}.csv`,
      "text/csv;charset=utf-8;"
    );
    toast({
      title: "GST Return Summary CSV Exported",
      description: "Includes B2B, B2CS, HSN Table 12, and Credit Notes for your CA.",
    });
  };

  if (isProfileLoading || isUserLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const fmtMoney = (val: number) => `${currencySymbol}${Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* HEADER */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-slate-200 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/accounting" className="inline-flex items-center gap-1 hover:text-slate-900">
              <ArrowLeft className="h-3.5 w-3.5" />
              Accounting Pro
            </Link>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-primary">GST Compliance &amp; Returns</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">
              {hasValidBusinessGstin ? `GSTIN ${report.supplierGstin}` : "GSTIN Not Configured"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            GST Reports (GSTR-1 &amp; GSTR-3B)
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            asChild
            variant="outline"
            className="h-9 px-3.5 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700 whitespace-nowrap"
          >
            <Link href="/invoices">
              <Receipt className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              Manage Invoices &amp; Returns
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadCsv}
            className="h-9 px-3.5 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700 whitespace-nowrap"
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-700" />
            Export CA CSV
          </Button>

          <Button
            type="button"
            onClick={handleDownloadGstr1Json}
            className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-xs font-semibold text-white whitespace-nowrap"
          >
            <FileJson className="mr-1.5 h-3.5 w-3.5" />
            Download GSTR-1 JSON
          </Button>
        </div>
      </header>

      {/* GSTIN SETUP NOTICE (IF MISSING) */}
      {!hasValidBusinessGstin && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Business GSTIN is missing or incomplete</p>
              <p className="text-amber-800/90 mt-0.5">
                Configure your 15-character GSTIN and Home State in Business Settings so GSTR-1 JSON exports carry accurate supplier credentials.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="h-8 px-3 border-amber-300 bg-white text-xs font-semibold text-amber-900 shrink-0">
            <Link href="/settings">
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              Configure GSTIN
            </Link>
          </Button>
        </div>
      )}

      {/* FILING PERIOD CONTROLS */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 mr-1">Filing Period:</span>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            {(
              [
                { id: "month", label: "Monthly" },
                { id: "quarter", label: "Quarterly" },
                { id: "custom", label: "Custom Range" },
                { id: "all", label: "All Time" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPeriodMode(opt.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap",
                  periodMode === opt.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {periodMode === "month" && (
            <Input
              aria-label="Select filing month"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 w-44 text-xs font-mono"
            />
          )}

          {periodMode === "quarter" && (
            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <SelectTrigger className="h-9 w-40 text-xs font-mono font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quarterOptions.map((q) => (
                  <SelectItem key={q} value={q} className="text-xs font-mono">
                    {q}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {periodMode === "custom" && (
            <div className="flex items-center gap-2">
              <Input
                aria-label="Start date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-36 text-xs font-mono"
              />
              <span className="text-xs text-slate-400">to</span>
              <Input
                aria-label="End date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 w-36 text-xs font-mono"
              />
            </div>
          )}

          <span className="text-xs text-slate-500 font-mono">
            Return Period: <strong className="text-slate-800">{report.filingPeriodCode}</strong>
          </span>
        </div>
      </section>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
          <p className="text-xs font-semibold text-slate-500">Outward Taxable Value</p>
          <p className="font-mono tabular-nums text-2xl font-extrabold text-slate-900">
            {fmtMoney(report.gstr3b.outwardTaxableSupplies.taxableValue)}
          </p>
          <p className="text-[11px] text-slate-500">
            {report.invoiceCount} Tax Invoices · {report.b2bInvoices.length} B2B
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
          <p className="text-xs font-semibold text-slate-500">Gross Output GST</p>
          <p className="font-mono tabular-nums text-2xl font-extrabold text-slate-900">
            {fmtMoney(report.gstr3b.outwardTaxableSupplies.totalTax)}
          </p>
          <p className="text-[11px] text-slate-500 font-mono truncate">
            CGST {fmtMoney(report.gstr3b.outwardTaxableSupplies.cgst)} · SGST{" "}
            {fmtMoney(report.gstr3b.outwardTaxableSupplies.sgst)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
          <p className="text-xs font-semibold text-slate-500">Credit Notes &amp; Input ITC</p>
          <p className="font-mono tabular-nums text-2xl font-extrabold text-emerald-700">
            {fmtMoney(
              report.gstr3b.creditNoteAdjustments.totalTax +
                report.gstr3b.eligibleItc.totalItc
            )}
          </p>
          <p className="text-[11px] text-slate-500 font-mono truncate">
            CN Tax {fmtMoney(report.gstr3b.creditNoteAdjustments.totalTax)} · ITC{" "}
            {fmtMoney(report.gstr3b.eligibleItc.totalItc)}
          </p>
        </div>

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-1">
          <p className="text-xs font-semibold text-primary">Net GST Payable (GSTR-3B)</p>
          <p className="font-mono tabular-nums text-2xl font-extrabold text-slate-900">
            {fmtMoney(report.gstr3b.netTaxPayable.total)}
          </p>
          <p className="text-[11px] text-slate-600 font-mono truncate">
            IGST {fmtMoney(report.gstr3b.netTaxPayable.igst)} · C+S{" "}
            {fmtMoney(
              report.gstr3b.netTaxPayable.cgst + report.gstr3b.netTaxPayable.sgst
            )}
          </p>
        </div>
      </div>

      {/* GST SECTION TABS */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 w-fit">
            {(
              [
                { id: "gstr3b", label: "GSTR-3B Summary" },
                { id: "b2b", label: `B2B (${report.b2bInvoices.length})` },
                {
                  id: "b2c",
                  label: `B2C (${report.b2clInvoices.length + report.b2csSummary.length})`,
                },
                { id: "hsn", label: `HSN Table 12 (${report.hsnSummary.length})` },
                { id: "cdnr", label: `Credit Notes (${report.creditNotes.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-500">
            {isDataLoading ? "Syncing ledger..." : `${report.invoiceCount} sales bills analyzed`}
          </p>
        </div>

        {isDataLoading ? (
          <div className="h-52 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : activeTab === "gstr3b" ? (
          <div className="p-5 space-y-6">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-200">
                    <TableHead className="text-xs font-semibold text-slate-700">
                      GSTR-3B Table Section
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">
                      Taxable Value
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">
                      IGST
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">
                      CGST
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">
                      SGST
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">
                      Total Tax
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="font-mono tabular-nums text-xs">
                  <TableRow>
                    <TableCell className="font-sans font-semibold text-slate-900">
                      3.1(a) Outward Taxable Supplies (Gross Sales)
                    </TableCell>
                    <TableCell className="text-right">
                      {fmtMoney(report.gstr3b.outwardTaxableSupplies.taxableValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmtMoney(report.gstr3b.outwardTaxableSupplies.igst)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmtMoney(report.gstr3b.outwardTaxableSupplies.cgst)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmtMoney(report.gstr3b.outwardTaxableSupplies.sgst)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {fmtMoney(report.gstr3b.outwardTaxableSupplies.totalTax)}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-sans font-medium text-amber-800">
                      Less: Credit Notes / Sales Returns Issued
                    </TableCell>
                    <TableCell className="text-right text-amber-800">
                      -{fmtMoney(report.gstr3b.creditNoteAdjustments.taxableValue)}
                    </TableCell>
                    <TableCell className="text-right text-amber-800">
                      -{fmtMoney(report.gstr3b.creditNoteAdjustments.igst)}
                    </TableCell>
                    <TableCell className="text-right text-amber-800">
                      -{fmtMoney(report.gstr3b.creditNoteAdjustments.cgst)}
                    </TableCell>
                    <TableCell className="text-right text-amber-800">
                      -{fmtMoney(report.gstr3b.creditNoteAdjustments.sgst)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-amber-800">
                      -{fmtMoney(report.gstr3b.creditNoteAdjustments.totalTax)}
                    </TableCell>
                  </TableRow>

                  <TableRow className="bg-slate-50/70">
                    <TableCell className="font-sans font-semibold text-slate-900">
                      Net Outward Tax Liability
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {fmtMoney(report.gstr3b.netOutwardLiability.taxableValue)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {fmtMoney(report.gstr3b.netOutwardLiability.igst)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {fmtMoney(report.gstr3b.netOutwardLiability.cgst)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {fmtMoney(report.gstr3b.netOutwardLiability.sgst)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {fmtMoney(report.gstr3b.netOutwardLiability.totalTax)}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-sans font-medium text-emerald-800">
                      4(A) Eligible Input Tax Credit (ITC from {report.gstr3b.eligibleItc.eligibleEntriesCount} Purchase Entries)
                    </TableCell>
                    <TableCell className="text-right text-slate-400">—</TableCell>
                    <TableCell className="text-right text-emerald-700">
                      -{fmtMoney(report.gstr3b.eligibleItc.igst)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-700">
                      -{fmtMoney(report.gstr3b.eligibleItc.cgst)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-700">
                      -{fmtMoney(report.gstr3b.eligibleItc.sgst)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-700">
                      -{fmtMoney(report.gstr3b.eligibleItc.totalItc)}
                    </TableCell>
                  </TableRow>

                  <TableRow className="bg-primary/5 border-t-2 border-primary/20">
                    <TableCell className="font-sans text-sm font-extrabold text-slate-900">
                      6.1 Net GST Payable in Cash
                    </TableCell>
                    <TableCell className="text-right text-slate-400">—</TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {fmtMoney(report.gstr3b.netTaxPayable.igst)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {fmtMoney(report.gstr3b.netTaxPayable.cgst)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {fmtMoney(report.gstr3b.netTaxPayable.sgst)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-extrabold text-primary">
                      {fmtMoney(report.gstr3b.netTaxPayable.total)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-600">
              <span>
                Purchase GST (Input Tax Credit) is pulled automatically from Cashbook Expense/Purchase entries that have a GST Amount recorded.
              </span>
              <Button asChild size="sm" variant="outline" className="h-8 px-3 bg-white text-xs font-semibold shrink-0">
                <Link href="/accounting">Add Purchase ITC Entry</Link>
              </Button>
            </div>
          </div>
        ) : activeTab === "b2b" ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200">
                  <TableHead className="pl-5 text-xs font-semibold text-slate-600">Invoice</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Receiver GSTIN &amp; Name</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">POS</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">Taxable</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">CGST</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">SGST</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">IGST</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right pr-5">Invoice Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.b2bInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-xs text-slate-500">
                      No B2B invoices (with valid 15-char Customer GSTIN) found in this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  report.b2bInvoices.map((row) => (
                    <TableRow key={row.invoiceId} className="border-b border-slate-100">
                      <TableCell className="pl-5 font-mono text-xs">
                        <p className="font-bold text-slate-900">{row.invoiceId}</p>
                        <p className="text-[11px] text-slate-500">{row.displayDate}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-semibold text-slate-900">{row.customerName}</p>
                        <p className="text-[11px] font-mono text-slate-500">{row.customerGstin}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-700">{row.posCode}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs">{fmtMoney(row.taxableValue)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs">{fmtMoney(row.cgst)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs">{fmtMoney(row.sgst)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs">{fmtMoney(row.igst)}</TableCell>
                      <TableCell className="text-right pr-5 font-mono tabular-nums text-xs font-bold text-slate-900">
                        {fmtMoney(row.invoiceValue)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : activeTab === "b2c" ? (
          <div className="p-5 space-y-6">
            {report.b2clInvoices.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-slate-900">
                  B2C Large (Inter-State Invoices &gt; ₹2,50,000)
                </h2>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow className="bg-slate-50/80">
                        <TableHead className="text-xs font-semibold">Invoice</TableHead>
                        <TableHead className="text-xs font-semibold">Customer</TableHead>
                        <TableHead className="text-xs font-semibold">POS</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Taxable Value</TableHead>
                        <TableHead className="text-xs font-semibold text-right">IGST</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Invoice Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="font-mono tabular-nums text-xs">
                      {report.b2clInvoices.map((row) => (
                        <TableRow key={row.invoiceId}>
                          <TableCell className="font-bold text-slate-900">
                            {row.invoiceId} · {row.displayDate}
                          </TableCell>
                          <TableCell className="font-sans">{row.customerName}</TableCell>
                          <TableCell>{row.posCode}</TableCell>
                          <TableCell className="text-right">{fmtMoney(row.taxableValue)}</TableCell>
                          <TableCell className="text-right">{fmtMoney(row.igst)}</TableCell>
                          <TableCell className="text-right font-bold">{fmtMoney(row.invoiceValue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h2 className="text-sm font-bold text-slate-900">
                B2C Small (Consolidated Retail &amp; Unregistered Summary by State &amp; Rate)
              </h2>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="text-xs font-semibold">Supply Type</TableHead>
                      <TableHead className="text-xs font-semibold">Place of Supply</TableHead>
                      <TableHead className="text-xs font-semibold text-right">GST Rate</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Taxable Value</TableHead>
                      <TableHead className="text-xs font-semibold text-right">CGST</TableHead>
                      <TableHead className="text-xs font-semibold text-right">SGST</TableHead>
                      <TableHead className="text-xs font-semibold text-right">IGST</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Invoices</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="font-mono tabular-nums text-xs">
                    {report.b2csSummary.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center font-sans text-slate-500">
                          No B2CS retail invoices recorded for this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.b2csSummary.map((row) => (
                        <TableRow key={`${row.supplyType}-${row.posCode}-${row.rate}`}>
                          <TableCell className="font-semibold">{row.supplyType}</TableCell>
                          <TableCell>State {row.posCode}</TableCell>
                          <TableCell className="text-right">{row.rate}%</TableCell>
                          <TableCell className="text-right">{fmtMoney(row.taxableValue)}</TableCell>
                          <TableCell className="text-right">{fmtMoney(row.cgst)}</TableCell>
                          <TableCell className="text-right">{fmtMoney(row.sgst)}</TableCell>
                          <TableCell className="text-right">{fmtMoney(row.igst)}</TableCell>
                          <TableCell className="text-right">{row.invoiceCount}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : activeTab === "hsn" ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[880px]">
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200">
                  <TableHead className="pl-5 text-xs font-semibold text-slate-600">HSN Code</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Description</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">UQC</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">Qty</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">Rate %</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">Taxable Value</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">CGST</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">SGST</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right pr-5">IGST</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="font-mono tabular-nums text-xs">
                {report.hsnSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center font-sans text-slate-500">
                      No HSN line items found for this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  report.hsnSummary.map((h) => (
                    <TableRow key={`${h.hsnCode}-${h.uqc}-${h.gstRate}`} className="border-b border-slate-100">
                      <TableCell className="pl-5 font-bold text-slate-900">{h.hsnCode}</TableCell>
                      <TableCell className="font-sans text-slate-800 max-w-[220px] truncate">{h.description}</TableCell>
                      <TableCell>{h.uqc}</TableCell>
                      <TableCell className="text-right">{h.totalQuantity}</TableCell>
                      <TableCell className="text-right">{h.gstRate}%</TableCell>
                      <TableCell className="text-right font-semibold">{fmtMoney(h.taxableValue)}</TableCell>
                      <TableCell className="text-right">{fmtMoney(h.cgst)}</TableCell>
                      <TableCell className="text-right">{fmtMoney(h.sgst)}</TableCell>
                      <TableCell className="text-right pr-5">{fmtMoney(h.igst)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[880px]">
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200">
                  <TableHead className="pl-5 text-xs font-semibold text-slate-600">Credit Note</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Orig. Invoice</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Customer / GSTIN</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Reason</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">Taxable Rev.</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">Tax Reversed</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right pr-5">Credit Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.creditNotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-xs text-slate-500">
                      No Credit Notes or Sales Returns issued in this period. You can issue returns from the Invoices &amp; E-Way page.
                    </TableCell>
                  </TableRow>
                ) : (
                  report.creditNotes.map((cn) => (
                    <TableRow key={cn.creditNoteId} className="border-b border-slate-100">
                      <TableCell className="pl-5 font-mono text-xs">
                        <p className="font-bold text-slate-900">{cn.creditNoteId}</p>
                        <p className="text-[11px] text-slate-500">{cn.isoDate}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-700">{cn.originalInvoiceId}</TableCell>
                      <TableCell>
                        <p className="text-xs font-semibold text-slate-900">{cn.customerName}</p>
                        <p className="text-[11px] font-mono text-slate-500">
                          {cn.customerGstin || "Unregistered (URP)"}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        <p>{cn.reason}</p>
                        <p className="text-[11px] text-slate-500">
                          Refund: {cn.refundMode} {cn.restocked ? "· Restocked" : ""}
                        </p>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs">
                        {fmtMoney(cn.taxableValue)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs text-amber-800">
                        {fmtMoney(cn.totalTax)}
                      </TableCell>
                      <TableCell className="text-right pr-5 font-mono tabular-nums text-xs font-bold text-slate-900">
                        {fmtMoney(cn.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Export format adheres to GSTN Offline Utility JSON (v3.1.2) for GSTR-1 B2B, B2CL, B2CS, CDNR &amp; HSN Table 12.
        </span>
        <button
          type="button"
          onClick={handleDownloadGstr1Json}
          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          Download JSON
        </button>
      </div>
    </div>
  );
}
