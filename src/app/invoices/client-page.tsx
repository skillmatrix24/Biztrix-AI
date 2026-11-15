"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  BarChart3,
  CheckSquare,
  ExternalLink,
  FileJson,
  FileText,
  KeyRound,
  Loader2,
  MessageCircle,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Search,
  Square,
  Truck,
  Zap,
} from "lucide-react";
import {
  arrayUnion,
  collection,
  doc,
  increment,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildNicEWayBillJson,
  createDefaultEWayDetails,
  downloadNicJsonFile,
  extractPincode,
  getEWayModeLabel,
  type EWayBillDetails,
} from "@/lib/eway-bill";
import { InvoicePrintTemplate } from "@/app/billing/components/InvoicePrintTemplate";
import { ThermalPrintTemplate } from "@/app/billing/components/ThermalPrintTemplate";
import { EWayBillModal } from "@/app/billing/components/EWayBillModal";
import { EWayGspConfigModal } from "@/components/eway/EWayGspConfigPanel";
import { CreditNoteModal } from "./components/CreditNoteModal";
import { CollectPaymentModal } from "./components/CollectPaymentModal";
import { WhatsAppShareModal } from "./components/WhatsAppShareModal";
import type { computeCreditNoteBreakdown } from "@/lib/gst-reports";
import {
  buildPaymentRecoveryAllocation,
  getInvoiceDueSummary,
} from "@/lib/invoice-recovery";

type FilterTab = "all" | "due" | "pending" | "generated";

export default function InvoicesAndEWayPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

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
  const invoices = useMemo(() => rawInvoices || [], [rawInvoices]);

  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [isSavingEWay, setIsSavingEWay] = useState(false);

  const [returningInvoice, setReturningInvoice] = useState<any>(null);
  const [isSavingCreditNote, setIsSavingCreditNote] = useState(false);

  const [collectingInvoice, setCollectingInvoice] = useState<any>(null);
  const [isCollectingPayment, setIsCollectingPayment] = useState(false);

  const [sharingInvoice, setSharingInvoice] = useState<any>(null);
  const [isGspConfigOpen, setIsGspConfigOpen] = useState(false);
  const [liveBusyInvoiceId, setLiveBusyInvoiceId] = useState<string | null>(null);
  const [isRunningApiAction, setIsRunningApiAction] = useState(false);

  const [activePrintInvoice, setActivePrintInvoice] = useState<any>(null);
  const [printMode, setPrintMode] = useState<"a4" | "thermal">("a4");

  const currencySymbol = getCurrencySymbol(business?.currency);
  const isAdmin = useMemo(() => {
    const role = String(profile?.role || "").toLowerCase();
    return (
      ["admin", "owner", "manager"].includes(role) ||
      user?.email?.toLowerCase() === "skillmatrix24@gmail.com"
    );
  }, [profile?.role, user?.email]);
  const isGspConfigured = Boolean(business?.ewayApiConfig?.isConfigured);

  const paymentModes: string[] = useMemo(
    () =>
      Array.isArray(business?.paymentModes) && business.paymentModes.length > 0
        ? business.paymentModes
        : ["Cash", "UPI", "Bank", "Card"],
    [business]
  );

  const stats = useMemo(() => {
    let totalValue = 0;
    let totalDueValue = 0;
    let dueCount = 0;
    let pendingCount = 0;
    let generatedCount = 0;

    for (const inv of invoices) {
      const amount = Number(inv?.totals?.finalPayout || 0);
      totalValue += amount;
      const dueInfo = getInvoiceDueSummary(inv);
      if (dueInfo.dueAmount > 0.01) {
        totalDueValue += dueInfo.dueAmount;
        dueCount += 1;
      }
      const isCancelled = inv?.ewayBill?.ewbStatus === "CANCELLED";
      const hasActiveEwb = Boolean(inv?.ewayBill?.ewbNumber) && !isCancelled;
      const isPending =
        !hasActiveEwb &&
        !isCancelled &&
        (inv?.ewayBill?.ewbStatus === "PENDING_PORTAL" || amount > 50000);
      if (hasActiveEwb) generatedCount += 1;
      else if (isPending) pendingCount += 1;
    }

    return {
      totalCount: invoices.length,
      totalValue,
      totalDueValue,
      dueCount,
      pendingCount,
      generatedCount,
    };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return invoices.filter((inv) => {
      const amount = Number(inv?.totals?.finalPayout || 0);
      const dueInfo = getInvoiceDueSummary(inv);
      const isCancelled = inv?.ewayBill?.ewbStatus === "CANCELLED";
      const hasActiveEwb = Boolean(inv?.ewayBill?.ewbNumber) && !isCancelled;
      const isPending =
        !hasActiveEwb &&
        !isCancelled &&
        (inv?.ewayBill?.ewbStatus === "PENDING_PORTAL" || amount > 50000);

      if (filterTab === "due" && dueInfo.dueAmount <= 0.01) return false;
      if (filterTab === "pending" && !isPending) return false;
      if (filterTab === "generated" && !hasActiveEwb) return false;

      if (!q) return true;
      const haystack = `${inv.invoiceId || ""} ${inv.customerName || ""} ${
        inv.customerPhone || ""
      } ${inv.customerGstin || ""} ${inv.ewayBill?.vehicleNo || ""} ${
        inv.ewayBill?.ewbNumber || ""
      }`.toLowerCase();
      return haystack.includes(q);
    });
  }, [invoices, filterTab, searchTerm]);

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredInvoices.map((inv) => inv.invoiceId || inv.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds(Array.from(new Set([...selectedIds, ...visibleIds])));
    }
  };

  const handleDownloadJsonForInvoices = (targetInvoices: any[], label: string) => {
    if (targetInvoices.length === 0) return;
    const payload = buildNicEWayBillJson(targetInvoices, business);
    downloadNicJsonFile(payload, label);
    toast({
      title: `NIC E-Way JSON Exported (${targetInvoices.length})`,
      description: "Upload on ewaybillgst.gov.in → e-Waybill → Generate Bulk.",
    });
  };

  const handleSaveEWayModal = async (nextDetails: EWayBillDetails) => {
    if (!businessId || !editingInvoice) return;
    const docId = editingInvoice.id || editingInvoice.invoiceId;
    setIsSavingEWay(true);
    try {
      await updateDoc(doc(firestore, "businesses", businessId, "invoices", docId), {
        ewayBill: {
          ...nextDetails,
          ewbDate: nextDetails.ewbNumber
            ? nextDetails.ewbDate || new Date().toLocaleDateString("en-IN")
            : "",
        },
        updatedAt: serverTimestamp(),
      });
      toast({
        title: nextDetails.ewbNumber
          ? `EWB ${nextDetails.ewbNumber} Saved`
          : "Dispatch & Transport Details Updated",
      });
      setEditingInvoice(null);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Failed to Update E-Way Bill",
        description: error?.message || "Please try again.",
      });
    } finally {
      setIsSavingEWay(false);
    }
  };

  const handleGenerateLiveEwbForInvoice = async (
    targetInvoice: any,
    overrideDetails?: EWayBillDetails
  ) => {
    if (!businessId || !user || !targetInvoice) return;
    const invoiceId = targetInvoice.id || targetInvoice.invoiceId;
    setLiveBusyInvoiceId(invoiceId);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/eway-bill/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId,
          invoiceId,
          ewayDetails: overrideDetails || targetInvoice.ewayBill,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        if (data?.code === "VALIDATION_FAILED" && !overrideDetails) {
          setEditingInvoice(targetInvoice);
          toast({
            variant: "destructive",
            title: "Complete Part-B Details First",
            description: data.message,
          });
          return;
        }
        if (data?.code === "GSP_NOT_CONFIGURED") {
          setIsGspConfigOpen(true);
        }
        toast({
          variant: "destructive",
          title: "Live E-Way Generation Failed",
          description: data?.message || "Check Part-B details and GSP credentials.",
        });
        return;
      }

      toast({
        title: `Live EWB ${data.ewayBill.ewbNumber} Generated`,
        description: data.ewayBill.ewbValidUpto
          ? `Valid upto ${data.ewayBill.ewbValidUpto}`
          : "E-Way Bill saved to invoice.",
      });
      setEditingInvoice(null);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "E-Way API Error",
        description: err?.message || "Network error while generating E-Way Bill.",
      });
    } finally {
      setLiveBusyInvoiceId(null);
    }
  };

  const handleRunLiveEwbAction = async (
    action: "UPDATE_VEHICLE" | "CANCEL_EWB",
    payload: Record<string, any>
  ) => {
    if (!businessId || !user || !editingInvoice) return;
    const invoiceId = editingInvoice.id || editingInvoice.invoiceId;
    setIsRunningApiAction(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/eway-bill/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ businessId, invoiceId, action, payload }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        toast({
          variant: "destructive",
          title: action === "CANCEL_EWB" ? "EWB Cancellation Failed" : "Vehicle Update Failed",
          description: data?.message || "GSP API returned an error.",
        });
        return;
      }
      toast({
        title: action === "CANCEL_EWB" ? "E-Way Bill Cancelled" : "Part-B Vehicle Updated",
        description: data.message,
      });
      setEditingInvoice(null);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "GSP API Action Failed",
        description: err?.message || "Please verify connectivity and try again.",
      });
    } finally {
      setIsRunningApiAction(false);
    }
  };

  const handlePrintInvoice = (inv: any, mode: "a4" | "thermal") => {
    setActivePrintInvoice(inv);
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 120);
  };

  const handleConfirmCreditNote = async (
    payload: ReturnType<typeof computeCreditNoteBreakdown>
  ) => {
    if (!businessId || !returningInvoice) return;
    const invDocId = returningInvoice.id || returningInvoice.invoiceId;
    setIsSavingCreditNote(true);
    try {
      const batch = writeBatch(firestore);

      const cnRef = doc(
        firestore,
        "businesses",
        businessId,
        "creditNotes",
        payload.creditNoteId
      );
      batch.set(cnRef, {
        id: payload.creditNoteId,
        businessId,
        creditNoteId: payload.creditNoteId,
        originalInvoiceId: payload.originalInvoiceId,
        originalInvoiceDate: payload.originalInvoiceDate,
        isoDate: payload.isoDate,
        customerId: payload.customerId,
        customerName: payload.customerName,
        customerGstin: payload.customerGstin,
        posCode: payload.posCode,
        isInterState: payload.isInterState,
        reason: payload.reason,
        refundMode: payload.refundMode,
        restocked: payload.restocked,
        items: payload.items,
        totals: payload.totals,
        rateBuckets: payload.rateBuckets,
        createdBy: profile?.name || "Admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const invRef = doc(firestore, "businesses", businessId, "invoices", invDocId);
      batch.update(invRef, {
        creditNoteStatus: payload.isFullReturn ? "FULL_RETURN" : "PARTIAL_RETURN",
        returnedAmount: increment(payload.totals.invoiceValue),
        creditNoteCount: increment(1),
        lastCreditNoteId: payload.creditNoteId,
        updatedAt: serverTimestamp(),
      });

      if (payload.restocked) {
        for (const item of payload.items) {
          if (item.productId && item.productId !== "manual_entry" && item.quantity > 0) {
            const prodRef = doc(
              firestore,
              "businesses",
              businessId,
              "products",
              item.productId
            );
            batch.update(prodRef, { stock: increment(item.quantity) });
          }
        }
      }

      if (payload.refundMode === "Customer Credit" && payload.customerId) {
        const custRef = doc(
          firestore,
          "businesses",
          businessId,
          "customers",
          payload.customerId
        );
        batch.update(custRef, {
          creditBalance: increment(-payload.totals.invoiceValue),
          updatedAt: serverTimestamp(),
        });
      } else if (payload.totals.invoiceValue > 0) {
        const cbRef = doc(collection(firestore, "businesses", businessId, "cashbook"));
        batch.set(cbRef, {
          businessId,
          type: "debit",
          amount: payload.totals.invoiceValue,
          particulars: `Credit Note ${payload.creditNoteId} (Ref: ${payload.originalInvoiceId}) - ${payload.customerName}`,
          category: "Refund",
          paymentMode: payload.refundMode,
          mode: payload.refundMode,
          entryBy: profile?.name || "Admin",
          date: payload.isoDate,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();
      toast({
        title: `Credit Note ${payload.creditNoteId} Issued`,
        description: `${currencySymbol}${payload.totals.invoiceValue.toLocaleString("en-IN")} reversed for ${payload.originalInvoiceId}.`,
      });
      setReturningInvoice(null);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Failed to Issue Credit Note",
        description: error?.message || "Please verify permissions and try again.",
      });
    } finally {
      setIsSavingCreditNote(false);
    }
  };

  const handleConfirmCollectPayment = async (
    allocation: ReturnType<typeof buildPaymentRecoveryAllocation>
  ) => {
    if (!businessId || !collectingInvoice || !allocation.valid || !allocation.historyEntry) return;
    const invDocId = collectingInvoice.id || collectingInvoice.invoiceId;
    setIsCollectingPayment(true);
    try {
      const batch = writeBatch(firestore);
      const invRef = doc(firestore, "businesses", businessId, "invoices", invDocId);

      batch.update(invRef, {
        "totals.collected": allocation.collectedAmount,
        "totals.dueAmount": allocation.dueAmount,
        paymentStatus: allocation.paymentStatus,
        recoveryPaidAmount: increment(allocation.appliedAmount),
        paymentHistory: arrayUnion(allocation.historyEntry),
        updatedAt: serverTimestamp(),
      });

      const cbRef = doc(collection(firestore, "businesses", businessId, "cashbook"));
      batch.set(cbRef, {
        businessId,
        type: "credit",
        amount: allocation.appliedAmount,
        particulars: `Due Recovery: ${collectingInvoice.invoiceId || invDocId} (${allocation.historyEntry.mode}) - ${collectingInvoice.customerName || "Customer"}`,
        category: "Sales Recovery",
        paymentMode: allocation.historyEntry.mode,
        mode: allocation.historyEntry.mode,
        entryBy: profile?.name || "Admin",
        date: allocation.historyEntry.isoDate,
        paymentNote: allocation.historyEntry.note || null,
        createdAt: serverTimestamp(),
      });

      if (collectingInvoice.customerId && collectingInvoice.customerId !== "walkin") {
        const custRef = doc(
          firestore,
          "businesses",
          businessId,
          "customers",
          collectingInvoice.customerId
        );
        batch.update(custRef, {
          creditBalance: increment(-allocation.appliedAmount),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      toast({
        title: `Collected ${currencySymbol}${allocation.appliedAmount.toLocaleString("en-IN")}`,
        description:
          allocation.dueAmount > 0
            ? `Remaining due: ${currencySymbol}${allocation.dueAmount.toLocaleString("en-IN")}`
            : `Invoice ${collectingInvoice.invoiceId || invDocId} is now Paid in Full.`,
      });
      setCollectingInvoice(null);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Payment Collection Failed",
        description: error?.message || "Please verify permissions and try again.",
      });
    } finally {
      setIsCollectingPayment(false);
    }
  };

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const allVisibleSelected =
    filteredInvoices.length > 0 &&
    filteredInvoices.every((inv) => selectedIds.includes(inv.invoiceId || inv.id));

  return (
    <div
      className={cn(
        "space-y-6 pb-20 text-left",
        printMode === "thermal" ? "print-thermal" : "print-a4"
      )}
    >
      <div className={cn(printMode !== "a4" && "print:hidden")}>
        <InvoicePrintTemplate
          invoice={activePrintInvoice}
          business={business}
          currencySymbol={currencySymbol}
        />
      </div>
      <div className={cn(printMode !== "thermal" && "print:hidden")}>
        <ThermalPrintTemplate
          invoice={activePrintInvoice}
          business={business}
          currencySymbol={currencySymbol}
        />
      </div>

      <div className="print:hidden space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-slate-200 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-primary">GST Compliance &amp; Dispatch</span>
              <span aria-hidden="true">/</span>
              <span>NIC Portal Bulk JSON &amp; EWB Tracking</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Invoices &amp; E-Way Bills
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsGspConfigOpen(true)}
              className="h-9 px-3 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:text-primary whitespace-nowrap"
            >
              <KeyRound className="mr-1.5 h-3.5 w-3.5 text-primary" />
              {isGspConfigured ? "GSP API Connected" : "Setup GSP API"}
            </Button>

            <a
              href="https://ewaybillgst.gov.in"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:text-primary whitespace-nowrap"
            >
              GST E-Way Portal
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            {selectedIds.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const selectedInvs = invoices.filter((inv) =>
                    selectedIds.includes(inv.invoiceId || inv.id)
                  );
                  handleDownloadJsonForInvoices(
                    selectedInvs,
                    `EWayBill_Bulk_${selectedInvs.length}_Invoices.json`
                  );
                }}
                className="h-9 px-3.5 rounded-lg border-primary/30 bg-primary/5 text-xs font-semibold text-primary whitespace-nowrap"
              >
                <FileJson className="mr-1.5 h-3.5 w-3.5" />
                Export Selected JSON ({selectedIds.length})
              </Button>
            )}

            <Button
              asChild
              variant="outline"
              className="h-9 px-3.5 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:text-primary whitespace-nowrap"
            >
              <Link href="/accounting/gst">
                <BarChart3 className="mr-1.5 h-3.5 w-3.5 text-primary" />
                GST &amp; GSTR-1 Reports
              </Link>
            </Button>

            <Button asChild className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-xs font-semibold text-white whitespace-nowrap">
              <Link href="/billing">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New Bill
              </Link>
            </Button>
          </div>
        </header>

        {/* KPI OVERVIEW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
            <p className="text-xs font-semibold text-slate-500">Saved Tax Invoices</p>
            <p className="font-mono tabular-nums text-2xl font-extrabold text-slate-900">
              {stats.totalCount}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
            <p className="text-xs font-semibold text-slate-500">Total Billed Value</p>
            <p className="font-mono tabular-nums text-2xl font-extrabold text-slate-900">
              {currencySymbol}
              {stats.totalValue.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 space-y-1">
            <p className="text-xs font-semibold text-rose-800">
              Pending Due ({stats.dueCount})
            </p>
            <p className="font-mono tabular-nums text-2xl font-extrabold text-rose-900">
              {currencySymbol}
              {stats.totalDueValue.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-1">
            <p className="text-xs font-semibold text-amber-800">EWB Pending (&gt;₹50k)</p>
            <p className="font-mono tabular-nums text-2xl font-extrabold text-amber-900">
              {stats.pendingCount}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-1">
            <p className="text-xs font-semibold text-emerald-800">EWB Generated</p>
            <p className="font-mono tabular-nums text-2xl font-extrabold text-emerald-900">
              {stats.generatedCount}
            </p>
          </div>
        </div>

        {/* TABLE CONTAINER */}
        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 w-fit">
              {(
                [
                  { id: "all", label: `All (${stats.totalCount})` },
                  { id: "due", label: `Due / Udhaar (${stats.dueCount})` },
                  { id: "pending", label: `EWB Pending (${stats.pendingCount})` },
                  { id: "generated", label: `EWB Ready (${stats.generatedCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTab(tab.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap",
                    filterTab === tab.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search invoice, customer, vehicle, EWB..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 text-xs bg-slate-50/70 border-slate-200"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[920px]">
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200">
                  <TableHead className="w-10 pl-4">
                    <button
                      type="button"
                      aria-label="Select all visible invoices"
                      onClick={toggleSelectAllVisible}
                      className="text-slate-500 hover:text-slate-900 flex items-center justify-center"
                    >
                      {allVisibleSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Invoice</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Customer</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">
                    Net Amount
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">
                    E-Way Bill &amp; Part-B
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right pr-5">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isInvoicesLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-500">
                        <FileText className="h-7 w-7 text-slate-400" />
                        <p className="text-sm font-semibold text-slate-700">
                          No invoices match your filter
                        </p>
                        <p className="text-xs">
                          Complete a POS sale in Billing Hub to automatically store GST invoices here.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((inv) => {
                    const rowId = inv.invoiceId || inv.id;
                    const isChecked = selectedIds.includes(rowId);
                    const amount = Number(inv?.totals?.finalPayout || 0);
                    const dueInfo = getInvoiceDueSummary(inv);
                    const eway = inv?.ewayBill || {};
                    const isCancelled = eway.ewbStatus === "CANCELLED";
                    const hasActiveEwb = Boolean(eway.ewbNumber) && !isCancelled;
                    const isPending =
                      !hasActiveEwb &&
                      !isCancelled &&
                      (eway.ewbStatus === "PENDING_PORTAL" || amount > 50000);

                    return (
                      <TableRow
                        key={rowId}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                      >
                        <TableCell className="pl-4">
                          <button
                            type="button"
                            aria-label={`Select invoice ${rowId}`}
                            onClick={() => toggleSelectId(rowId)}
                            className="text-slate-500 hover:text-slate-900 flex items-center justify-center"
                          >
                            {isChecked ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>

                        <TableCell>
                          <p className="font-mono text-xs font-bold text-slate-900">{rowId}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {inv.date || inv.isoDate || "N/A"} · {inv.paymentMode || "Cash"}
                          </p>
                          {inv.creditNoteStatus && (
                            <p className="text-[11px] font-medium text-amber-700">
                              {inv.creditNoteStatus === "FULL_RETURN"
                                ? "Full Credit Note Issued"
                                : `Partial Return (${currencySymbol}${Number(
                                    inv.returnedAmount || 0
                                  ).toLocaleString("en-IN")})`}
                            </p>
                          )}
                        </TableCell>

                        <TableCell>
                          <p className="text-xs font-semibold text-slate-900">
                            {inv.customerName || "Walk-in Customer"}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {inv.customerGstin
                              ? `GSTIN: ${inv.customerGstin}`
                              : inv.customerState || "Unregistered (URP)"}
                          </p>
                        </TableCell>

                        <TableCell className="text-right font-mono tabular-nums">
                          <p className="text-sm font-bold text-slate-900">
                            {currencySymbol}
                            {amount.toLocaleString("en-IN")}
                          </p>
                          {dueInfo.dueAmount > 0.01 ? (
                            <p className="text-[11px] font-semibold text-rose-700">
                              Due: {currencySymbol}
                              {dueInfo.dueAmount.toLocaleString("en-IN")}
                            </p>
                          ) : (
                            <p className="text-[11px] text-emerald-700">
                              Paid{Number(inv?.totals?.taxTotal || 0) > 0
                                ? ` · GST ${currencySymbol}${Number(
                                    inv.totals.taxTotal
                                  ).toLocaleString("en-IN")}`
                                : ""}
                            </p>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="space-y-0.5">
                            {isCancelled ? (
                              <p className="text-xs font-mono font-semibold text-rose-700">
                                EWB Cancelled{eway.ewbNumber ? ` (${eway.ewbNumber})` : ""}
                              </p>
                            ) : hasActiveEwb ? (
                              <p className="text-xs font-mono font-bold text-emerald-700">
                                EWB: {eway.ewbNumber}
                              </p>
                            ) : isPending ? (
                              <p className="text-xs font-semibold text-amber-700">
                                EWB Pending (&gt;₹50,000)
                              </p>
                            ) : (
                              <p className="text-xs text-slate-500">Optional (&le;₹50,000)</p>
                            )}

                            {(eway.vehicleNo || eway.transporterName || eway.ewbValidUpto) && (
                              <p className="text-[11px] text-slate-600 font-mono truncate max-w-[240px]">
                                {getEWayModeLabel(eway.transMode)}
                                {eway.vehicleNo ? ` · ${eway.vehicleNo}` : ""}
                                {eway.transporterName ? ` · ${eway.transporterName}` : ""}
                                {eway.ewbValidUpto ? ` · Valid: ${eway.ewbValidUpto}` : ""}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right pr-5">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {dueInfo.dueAmount > 0.01 && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                title="Collect Pending Udhaar / Due Payment"
                                onClick={() => setCollectingInvoice(inv)}
                                className="h-8 px-2.5 rounded-md border-emerald-200 bg-emerald-50/70 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 whitespace-nowrap"
                              >
                                <Banknote className="mr-1 h-3.5 w-3.5" />
                                Collect
                              </Button>
                            )}

                            {isGspConfigured && isPending && (
                              <Button
                                type="button"
                                size="sm"
                                disabled={liveBusyInvoiceId === rowId}
                                title="Generate Live E-Way Bill via GSP API"
                                onClick={() => handleGenerateLiveEwbForInvoice(inv)}
                                className="h-8 px-2.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold text-white whitespace-nowrap"
                              >
                                {liveBusyInvoiceId === rowId ? (
                                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Zap className="mr-1 h-3.5 w-3.5" />
                                )}
                                Live EWB
                              </Button>
                            )}

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingInvoice(inv)}
                              className="h-8 px-2.5 rounded-md border-slate-200 text-xs font-semibold text-slate-700 whitespace-nowrap"
                            >
                              <Truck className="mr-1 h-3.5 w-3.5" />
                              {hasActiveEwb || isCancelled ? "EWB" : "Add EWB"}
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              title="Download NIC E-Way Bill JSON"
                              onClick={() =>
                                handleDownloadJsonForInvoices([inv], `EWayBill_${rowId}.json`)
                              }
                              className="h-8 px-2.5 rounded-md border-slate-200 text-xs font-semibold text-slate-700 whitespace-nowrap"
                            >
                              <FileJson className="mr-1 h-3.5 w-3.5 text-primary" />
                              JSON
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={inv.creditNoteStatus === "FULL_RETURN"}
                              title="Issue Credit Note / Sales Return"
                              onClick={() => setReturningInvoice(inv)}
                              className="h-8 px-2.5 rounded-md border-slate-200 text-xs font-semibold text-slate-700 whitespace-nowrap"
                            >
                              <RotateCcw className="mr-1 h-3.5 w-3.5 text-amber-700" />
                              Return
                            </Button>

                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title="Share Bill / Due Reminder on WhatsApp"
                              onClick={() => setSharingInvoice(inv)}
                              className="h-8 w-8 rounded-md text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title="Print A4 Tax Invoice"
                              onClick={() => handlePrintInvoice(inv, "a4")}
                              className="h-8 w-8 rounded-md text-slate-600 hover:text-slate-900"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title="Print Thermal Receipt"
                              onClick={() => handlePrintInvoice(inv, "thermal")}
                              className="h-8 w-8 rounded-md text-slate-600 hover:text-slate-900"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      {editingInvoice && (
        <EWayBillModal
          isOpen={Boolean(editingInvoice)}
          onOpenChange={(open) => {
            if (!open) setEditingInvoice(null);
          }}
          details={
            editingInvoice.ewayBill ||
            createDefaultEWayDetails({
              enabled: true,
              fromPincode: extractPincode(business?.pincode, business?.address),
              toPincode: extractPincode("", editingInvoice.customerAddress),
            })
          }
          invoiceTotal={Number(editingInvoice?.totals?.finalPayout || 0)}
          currencySymbol={currencySymbol}
          isRequired={Number(editingInvoice?.totals?.finalPayout || 0) > 50000}
          invoiceId={editingInvoice.invoiceId || editingInvoice.id}
          isSaving={isSavingEWay}
          isGspConfigured={isGspConfigured}
          isGeneratingLive={
            liveBusyInvoiceId === (editingInvoice.invoiceId || editingInvoice.id)
          }
          isRunningApiAction={isRunningApiAction}
          onSave={handleSaveEWayModal}
          onGenerateLiveEwb={(draft) => handleGenerateLiveEwbForInvoice(editingInvoice, draft)}
          onUpdateVehicleApi={(params) => handleRunLiveEwbAction("UPDATE_VEHICLE", params)}
          onCancelEwbApi={(params) => handleRunLiveEwbAction("CANCEL_EWB", params)}
          onOpenGspSettings={() => {
            setEditingInvoice(null);
            setIsGspConfigOpen(true);
          }}
        />
      )}

      {businessId && (
        <EWayGspConfigModal
          isOpen={isGspConfigOpen}
          onOpenChange={setIsGspConfigOpen}
          businessId={businessId}
          business={business}
          isAdmin={isAdmin}
        />
      )}

      {returningInvoice && (
        <CreditNoteModal
          isOpen={Boolean(returningInvoice)}
          onOpenChange={(open) => {
            if (!open) setReturningInvoice(null);
          }}
          invoice={returningInvoice}
          business={business}
          currencySymbol={currencySymbol}
          paymentModes={paymentModes}
          isSaving={isSavingCreditNote}
          onConfirm={handleConfirmCreditNote}
        />
      )}

      {collectingInvoice && (
        <CollectPaymentModal
          isOpen={Boolean(collectingInvoice)}
          onOpenChange={(open) => {
            if (!open) setCollectingInvoice(null);
          }}
          invoice={collectingInvoice}
          currencySymbol={currencySymbol}
          paymentModes={paymentModes}
          recordedBy={profile?.name || "Admin"}
          isSaving={isCollectingPayment}
          onConfirm={handleConfirmCollectPayment}
        />
      )}

      {sharingInvoice && (
        <WhatsAppShareModal
          isOpen={Boolean(sharingInvoice)}
          onOpenChange={(open) => {
            if (!open) setSharingInvoice(null);
          }}
          invoice={sharingInvoice}
          business={business}
          businessId={businessId}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
}
