import { calculateGST } from "./mock-db";
import { formatNicDate, resolveGstStateCode } from "./eway-bill";

export type GstPeriodMode = "month" | "quarter" | "custom" | "all";

export interface GstPeriodFilter {
  mode: GstPeriodMode;
  month?: string; // YYYY-MM
  quarter?: string; // e.g. "2026-Q3" (calendar quarter YYYY-Q1..Q4) or FY format
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export interface GstTaxTotals {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
  invoiceValue: number;
}

export interface GstRateBucket {
  rate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

export interface GstB2BInvoiceRow {
  invoiceId: string;
  isoDate: string;
  displayDate: string;
  customerName: string;
  customerGstin: string;
  posCode: string; // 2-digit state code e.g. "27"
  isInterState: boolean;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  invoiceValue: number;
  rateBuckets: GstRateBucket[];
}

export interface GstB2CLRow {
  invoiceId: string;
  isoDate: string;
  displayDate: string;
  customerName: string;
  posCode: string;
  taxableValue: number;
  igst: number;
  invoiceValue: number;
  rateBuckets: GstRateBucket[];
}

export interface GstB2CSRow {
  supplyType: "INTRA" | "INTER";
  posCode: string;
  rate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  invoiceCount: number;
}

export interface GstHsnRow {
  hsnCode: string;
  description: string;
  uqc: string;
  gstRate: number;
  totalQuantity: number;
  totalValue: number;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
}

export interface GstCreditNoteRow {
  creditNoteId: string;
  originalInvoiceId: string;
  originalInvoiceDate: string;
  isoDate: string;
  customerName: string;
  customerGstin: string;
  posCode: string;
  isInterState: boolean;
  reason: string;
  refundMode: string;
  restocked: boolean;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  totalAmount: number;
  rateBuckets: GstRateBucket[];
}

export interface GstItcSummary {
  igst: number;
  cgst: number;
  sgst: number;
  totalItc: number;
  eligibleEntriesCount: number;
}

export interface Gstr3BSummary {
  outwardTaxableSupplies: GstTaxTotals;
  creditNoteAdjustments: GstTaxTotals;
  netOutwardLiability: GstTaxTotals;
  eligibleItc: GstItcSummary;
  netTaxPayable: {
    igst: number;
    cgst: number;
    sgst: number;
    total: number;
  };
}

export interface GstReportBundle {
  supplierGstin: string;
  supplierStateCode: string;
  filingPeriodCode: string; // MMYYYY
  invoiceCount: number;
  b2bInvoices: GstB2BInvoiceRow[];
  b2clInvoices: GstB2CLRow[];
  b2csSummary: GstB2CSRow[];
  hsnSummary: GstHsnRow[];
  creditNotes: GstCreditNoteRow[];
  gstr3b: Gstr3BSummary;
}

const GSTIN_REGEX = /^[0-9]{2}[A-Z0-9]{13}$/;
export const B2CL_THRESHOLD = 250000;

export function isValidGstin(gstin?: string): boolean {
  return GSTIN_REGEX.test(String(gstin || "").trim().toUpperCase());
}

export function padStateCode(code: number | string): string {
  const num = Number.parseInt(String(code || "27"), 10);
  const safe = Number.isNaN(num) || num < 1 || num > 38 ? 27 : num;
  return String(safe).padStart(2, "0");
}

export function round2(val: number): number {
  return Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;
}

/**
 * Extracts YYYY-MM-DD from an invoice, credit note, or cashbook entry safely.
 */
export function resolveIsoDate(record: any): string {
  const rawIso = String(record?.isoDate || record?.date || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(rawIso)) {
    return rawIso.slice(0, 10);
  }
  // Handle DD/MM/YYYY
  const dmy = rawIso.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  if (record?.createdAt?.toDate) {
    return record.createdAt.toDate().toISOString().slice(0, 10);
  }
  if (typeof record?.createdAt === "string" && /^\d{4}-\d{2}-\d{2}/.test(record.createdAt)) {
    return record.createdAt.slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export function getQuarterDateRange(quarterKey: string): { start: string; end: string } | null {
  // Expected format: YYYY-Q1 .. YYYY-Q4 (calendar quarters)
  const match = String(quarterKey || "").match(/^(\d{4})-Q([1-4])$/);
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  const q = Number.parseInt(match[2], 10);
  const startMonth = (q - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const lastDay = new Date(year, endMonth, 0).getDate();
  return {
    start: `${year}-${String(startMonth).padStart(2, "0")}-01`,
    end: `${year}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function isIsoDateInGstPeriod(isoDate: string, filter: GstPeriodFilter): boolean {
  if (!isoDate || filter.mode === "all") return true;

  if (filter.mode === "month" && filter.month) {
    return isoDate.startsWith(filter.month);
  }

  if (filter.mode === "quarter" && filter.quarter) {
    const range = getQuarterDateRange(filter.quarter);
    if (!range) return true;
    return isoDate >= range.start && isoDate <= range.end;
  }

  if (filter.mode === "custom") {
    if (filter.startDate && isoDate < filter.startDate) return false;
    if (filter.endDate && isoDate > filter.endDate) return false;
    return true;
  }

  return true;
}

export function resolveFilingPeriodCode(filter: GstPeriodFilter, referenceDate = new Date()): string {
  if (filter.mode === "month" && filter.month && /^\d{4}-\d{2}$/.test(filter.month)) {
    const [yyyy, mm] = filter.month.split("-");
    return `${mm}${yyyy}`;
  }
  if (filter.mode === "quarter" && filter.quarter) {
    const range = getQuarterDateRange(filter.quarter);
    if (range) {
      const [yyyy, mm] = range.end.split("-");
      return `${mm}${yyyy}`;
    }
  }
  if (filter.mode === "custom" && filter.endDate && /^\d{4}-\d{2}-\d{2}$/.test(filter.endDate)) {
    const [yyyy, mm] = filter.endDate.split("-");
    return `${mm}${yyyy}`;
  }
  const mm = String(referenceDate.getMonth() + 1).padStart(2, "0");
  const yyyy = referenceDate.getFullYear();
  return `${mm}${yyyy}`;
}

export function generateCreditNoteId(now = new Date()): string {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  // 14 chars <= 16 char GST portal doc limit
  return `CN-${yy}${mm}${dd}-${rand}`;
}

export interface ComputedInvoiceGst {
  invoiceId: string;
  isoDate: string;
  displayDate: string;
  customerName: string;
  customerGstin: string;
  posCode: string;
  isInterState: boolean;
  classification: "B2B" | "B2CL" | "B2CS";
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  invoiceValue: number;
  rateBuckets: GstRateBucket[];
  lineDetails: Array<{
    hsnCode: string;
    description: string;
    uqc: string;
    quantity: number;
    gstRate: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalValue: number;
  }>;
}

export function computeInvoiceGstBreakdown(inv: any, business: any): ComputedInvoiceGst {
  const gstMode: "inclusive" | "exclusive" =
    business?.gstMode === "inclusive" ? "inclusive" : "exclusive";
  const supplierGstin = String(business?.gstin || "").trim().toUpperCase();
  const supplierStateCode = padStateCode(resolveGstStateCode(business?.state, supplierGstin));

  const customerGstinRaw = String(inv?.customerGstin || "").trim().toUpperCase();
  const validCustomerGstin = isValidGstin(customerGstinRaw) ? customerGstinRaw : "";
  const posCode = padStateCode(
    resolveGstStateCode(inv?.customerState || business?.state, validCustomerGstin)
  );

  const isInterState =
    inv?.totals?.isInterState !== undefined
      ? Boolean(inv.totals.isInterState)
      : posCode !== supplierStateCode;

  interface RawLineCalc {
    hsnCode: string;
    description: string;
    uqc: string;
    quantity: number;
    gstRate: number;
    baseAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    lineTotal: number;
  }

  const rawItems = Array.isArray(inv?.items) ? inv.items : [];
  const rawLineCalculations: RawLineCalc[] = rawItems.map((item: any): RawLineCalc => {
    const qty = Math.max(0, Number(item.quantity || 0));
    const unitPrice = Number(item.price || 0) * (1 - Number(item.itemDiscount || 0) / 100);
    const grossLine = unitPrice * qty;
    const gstRate = Number(item.gstRate || 0);
    const gstData = calculateGST(grossLine, gstRate, isInterState, gstMode);
    const hsnDigits = String(item.hsnCode || "").replace(/\D/g, "");
    return {
      hsnCode: hsnDigits || "9999",
      description: String(item.name || "Goods").trim(),
      uqc: String(item.unit || "NOS").toUpperCase().slice(0, 3) || "NOS",
      quantity: qty,
      gstRate,
      baseAmount: gstData.baseAmount,
      cgst: gstData.cgst,
      sgst: gstData.sgst,
      igst: gstData.igst,
      lineTotal: gstData.lineTotal,
    };
  });

  const rawBaseSum = rawLineCalculations.reduce((s, x) => s + x.baseAmount, 0);
  const rawTaxSum = rawLineCalculations.reduce((s, x) => s + x.cgst + x.sgst + x.igst, 0);

  const storedItemTotal =
    inv?.totals?.itemTotal !== undefined ? Number(inv.totals.itemTotal) : rawBaseSum;
  const storedTaxTotal =
    inv?.totals?.taxTotal !== undefined ? Number(inv.totals.taxTotal) : rawTaxSum;
  const storedFinalPayout =
    inv?.totals?.finalPayout !== undefined
      ? Number(inv.totals.finalPayout)
      : storedItemTotal + storedTaxTotal;

  // Scale line items proportionally if invoice-level manual/coupon discounts shifted taxable base
  const baseScale = rawBaseSum > 0 ? storedItemTotal / rawBaseSum : 1;
  const taxScale = rawTaxSum > 0 ? storedTaxTotal / rawTaxSum : 1;

  const bucketMap = new Map<number, GstRateBucket>();
  const lineDetails = rawLineCalculations.map((line) => {
    const taxableValue = round2(line.baseAmount * baseScale);
    const cgst = round2(line.cgst * taxScale);
    const sgst = round2(line.sgst * taxScale);
    const igst = round2(line.igst * taxScale);
    const totalValue = round2(taxableValue + cgst + sgst + igst);

    const existing = bucketMap.get(line.gstRate) || {
      rate: line.gstRate,
      taxableValue: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0,
    };
    existing.taxableValue = round2(existing.taxableValue + taxableValue);
    existing.cgst = round2(existing.cgst + cgst);
    existing.sgst = round2(existing.sgst + sgst);
    existing.igst = round2(existing.igst + igst);
    existing.totalTax = round2(existing.cgst + existing.sgst + existing.igst);
    bucketMap.set(line.gstRate, existing);

    return {
      hsnCode: line.hsnCode,
      description: line.description,
      uqc: line.uqc,
      quantity: line.quantity,
      gstRate: line.gstRate,
      taxableValue,
      cgst,
      sgst,
      igst,
      totalValue,
    };
  });

  // Fallback bucket if items were missing on legacy record
  if (bucketMap.size === 0 && storedItemTotal > 0) {
    const approxRate =
      storedItemTotal > 0 ? Math.round((storedTaxTotal / storedItemTotal) * 100) : 0;
    const cgst = isInterState ? 0 : round2(storedTaxTotal / 2);
    const sgst = isInterState ? 0 : round2(storedTaxTotal / 2);
    const igst = isInterState ? round2(storedTaxTotal) : 0;
    bucketMap.set(approxRate, {
      rate: approxRate,
      taxableValue: round2(storedItemTotal),
      cgst,
      sgst,
      igst,
      totalTax: round2(cgst + sgst + igst),
    });
  }

  const taxableValue = round2(storedItemTotal);
  const cgst = round2(
    inv?.totals?.cgst !== undefined
      ? Number(inv.totals.cgst)
      : Array.from(bucketMap.values()).reduce((s, b) => s + b.cgst, 0)
  );
  const sgst = round2(
    inv?.totals?.sgst !== undefined
      ? Number(inv.totals.sgst)
      : Array.from(bucketMap.values()).reduce((s, b) => s + b.sgst, 0)
  );
  const igst = round2(
    inv?.totals?.igst !== undefined
      ? Number(inv.totals.igst)
      : Array.from(bucketMap.values()).reduce((s, b) => s + b.igst, 0)
  );
  const totalTax = round2(cgst + sgst + igst);
  const invoiceValue = round2(storedFinalPayout);

  let classification: "B2B" | "B2CL" | "B2CS" = "B2CS";
  if (validCustomerGstin) {
    classification = "B2B";
  } else if (isInterState && invoiceValue > B2CL_THRESHOLD) {
    classification = "B2CL";
  }

  const isoDate = resolveIsoDate(inv);

  return {
    invoiceId: String(inv?.invoiceId || inv?.id || ""),
    isoDate,
    displayDate: formatNicDate(isoDate),
    customerName: String(inv?.customerName || "Walk-in Customer"),
    customerGstin: validCustomerGstin,
    posCode,
    isInterState,
    classification,
    taxableValue,
    cgst,
    sgst,
    igst,
    totalTax,
    invoiceValue,
    rateBuckets: Array.from(bucketMap.values()).sort((a, b) => a.rate - b.rate),
    lineDetails,
  };
}

export function computeCreditNoteBreakdown(params: {
  invoice: any;
  business: any;
  returnQuantities: Record<number, number>; // index -> qty to return
  reason: string;
  refundMode: string;
  restocked: boolean;
  creditNoteId?: string;
  isoDate?: string;
}): {
  creditNoteId: string;
  originalInvoiceId: string;
  originalInvoiceDate: string;
  isoDate: string;
  customerId: string;
  customerName: string;
  customerGstin: string;
  posCode: string;
  isInterState: boolean;
  reason: string;
  refundMode: string;
  restocked: boolean;
  items: Array<{
    productId: string;
    name: string;
    hsnCode: string;
    quantity: number;
    unitPrice: number;
    gstRate: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalAmount: number;
  }>;
  totals: GstTaxTotals;
  rateBuckets: GstRateBucket[];
  isFullReturn: boolean;
} {
  const { invoice, business, returnQuantities, reason, refundMode, restocked } = params;
  const gstMode: "inclusive" | "exclusive" =
    business?.gstMode === "inclusive" ? "inclusive" : "exclusive";
  const supplierStateCode = padStateCode(resolveGstStateCode(business?.state, business?.gstin));
  const customerGstin = isValidGstin(invoice?.customerGstin)
    ? String(invoice.customerGstin).trim().toUpperCase()
    : "";
  const posCode = padStateCode(
    resolveGstStateCode(invoice?.customerState || business?.state, customerGstin)
  );
  const isInterState =
    invoice?.totals?.isInterState !== undefined
      ? Boolean(invoice.totals.isInterState)
      : posCode !== supplierStateCode;

  const origItems = Array.isArray(invoice?.items) ? invoice.items : [];
  const computedItems: Array<{
    productId: string;
    name: string;
    hsnCode: string;
    quantity: number;
    unitPrice: number;
    gstRate: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalAmount: number;
  }> = [];

  const bucketMap = new Map<number, GstRateBucket>();
  let totalOrigQty = 0;
  let totalReturnQty = 0;

  origItems.forEach((item: any, idx: number) => {
    const origQty = Math.max(0, Number(item.quantity || 0));
    totalOrigQty += origQty;
    const reqQty = Math.max(0, Math.min(origQty, Number(returnQuantities[idx] || 0)));
    totalReturnQty += reqQty;
    if (reqQty <= 0) return;

    const unitPrice = Number(item.price || 0) * (1 - Number(item.itemDiscount || 0) / 100);
    const grossReturn = unitPrice * reqQty;
    const gstRate = Number(item.gstRate || 0);
    const gstData = calculateGST(grossReturn, gstRate, isInterState, gstMode);

    const taxableValue = round2(gstData.baseAmount);
    const cgst = round2(gstData.cgst);
    const sgst = round2(gstData.sgst);
    const igst = round2(gstData.igst);
    const totalAmount = round2(taxableValue + cgst + sgst + igst);

    const existing = bucketMap.get(gstRate) || {
      rate: gstRate,
      taxableValue: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0,
    };
    existing.taxableValue = round2(existing.taxableValue + taxableValue);
    existing.cgst = round2(existing.cgst + cgst);
    existing.sgst = round2(existing.sgst + sgst);
    existing.igst = round2(existing.igst + igst);
    existing.totalTax = round2(existing.cgst + existing.sgst + existing.igst);
    bucketMap.set(gstRate, existing);

    computedItems.push({
      productId: String(item.productId || "manual_entry"),
      name: String(item.name || "Returned Item"),
      hsnCode: String(item.hsnCode || "").replace(/\D/g, "") || "9999",
      quantity: reqQty,
      unitPrice: round2(unitPrice),
      gstRate,
      taxableValue,
      cgst,
      sgst,
      igst,
      totalAmount,
    });
  });

  const taxableValue = round2(computedItems.reduce((s, it) => s + it.taxableValue, 0));
  const cgst = round2(computedItems.reduce((s, it) => s + it.cgst, 0));
  const sgst = round2(computedItems.reduce((s, it) => s + it.sgst, 0));
  const igst = round2(computedItems.reduce((s, it) => s + it.igst, 0));
  const totalTax = round2(cgst + sgst + igst);
  const invoiceValue = round2(taxableValue + totalTax);

  return {
    creditNoteId: params.creditNoteId || generateCreditNoteId(),
    originalInvoiceId: String(invoice?.invoiceId || invoice?.id || ""),
    originalInvoiceDate: resolveIsoDate(invoice),
    isoDate: params.isoDate || new Date().toISOString().slice(0, 10),
    customerId: String(invoice?.customerId || ""),
    customerName: String(invoice?.customerName || "Customer"),
    customerGstin,
    posCode,
    isInterState,
    reason: reason || "Sales Return",
    refundMode: refundMode || "Cash",
    restocked: Boolean(restocked),
    items: computedItems,
    totals: {
      taxableValue,
      cgst,
      sgst,
      igst,
      cess: 0,
      totalTax,
      invoiceValue,
    },
    rateBuckets: Array.from(bucketMap.values()).sort((a, b) => a.rate - b.rate),
    isFullReturn: totalOrigQty > 0 && totalReturnQty >= totalOrigQty,
  };
}

export function computeGstReportBundle(params: {
  invoices: any[];
  creditNotes: any[];
  cashbookEntries: any[];
  business: any;
  filter: GstPeriodFilter;
}): GstReportBundle {
  const { invoices, creditNotes, cashbookEntries, business, filter } = params;
  const supplierGstin = String(business?.gstin || "").trim().toUpperCase();
  const supplierStateCode = padStateCode(resolveGstStateCode(business?.state, supplierGstin));
  const filingPeriodCode = resolveFilingPeriodCode(filter);

  const periodInvoices = (invoices || []).filter((inv) => {
    if (!inv || inv.type === "quotation" || inv.status === "cancelled") return false;
    return isIsoDateInGstPeriod(resolveIsoDate(inv), filter);
  });

  const periodCreditNotes = (creditNotes || []).filter((cn) => {
    if (!cn) return false;
    return isIsoDateInGstPeriod(resolveIsoDate(cn), filter);
  });

  const b2bInvoices: GstB2BInvoiceRow[] = [];
  const b2clInvoices: GstB2CLRow[] = [];
  const b2csMap = new Map<string, GstB2CSRow>();
  const hsnMap = new Map<string, GstHsnRow>();

  const outwardTotals: GstTaxTotals = {
    taxableValue: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    totalTax: 0,
    invoiceValue: 0,
  };

  for (const inv of periodInvoices) {
    const parsed = computeInvoiceGstBreakdown(inv, business);

    outwardTotals.taxableValue = round2(outwardTotals.taxableValue + parsed.taxableValue);
    outwardTotals.cgst = round2(outwardTotals.cgst + parsed.cgst);
    outwardTotals.sgst = round2(outwardTotals.sgst + parsed.sgst);
    outwardTotals.igst = round2(outwardTotals.igst + parsed.igst);
    outwardTotals.totalTax = round2(outwardTotals.totalTax + parsed.totalTax);
    outwardTotals.invoiceValue = round2(outwardTotals.invoiceValue + parsed.invoiceValue);

    if (parsed.classification === "B2B") {
      b2bInvoices.push({
        invoiceId: parsed.invoiceId,
        isoDate: parsed.isoDate,
        displayDate: parsed.displayDate,
        customerName: parsed.customerName,
        customerGstin: parsed.customerGstin,
        posCode: parsed.posCode,
        isInterState: parsed.isInterState,
        taxableValue: parsed.taxableValue,
        cgst: parsed.cgst,
        sgst: parsed.sgst,
        igst: parsed.igst,
        totalTax: parsed.totalTax,
        invoiceValue: parsed.invoiceValue,
        rateBuckets: parsed.rateBuckets,
      });
    } else if (parsed.classification === "B2CL") {
      b2clInvoices.push({
        invoiceId: parsed.invoiceId,
        isoDate: parsed.isoDate,
        displayDate: parsed.displayDate,
        customerName: parsed.customerName,
        posCode: parsed.posCode,
        taxableValue: parsed.taxableValue,
        igst: parsed.igst,
        invoiceValue: parsed.invoiceValue,
        rateBuckets: parsed.rateBuckets,
      });
    } else {
      for (const bucket of parsed.rateBuckets) {
        const supplyType = parsed.isInterState ? "INTER" : "INTRA";
        const key = `${supplyType}:${parsed.posCode}:${bucket.rate}`;
        const existing = b2csMap.get(key) || {
          supplyType,
          posCode: parsed.posCode,
          rate: bucket.rate,
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          totalTax: 0,
          invoiceCount: 0,
        };
        existing.taxableValue = round2(existing.taxableValue + bucket.taxableValue);
        existing.cgst = round2(existing.cgst + bucket.cgst);
        existing.sgst = round2(existing.sgst + bucket.sgst);
        existing.igst = round2(existing.igst + bucket.igst);
        existing.totalTax = round2(existing.totalTax + bucket.totalTax);
        existing.invoiceCount += 1;
        b2csMap.set(key, existing);
      }
    }

    for (const line of parsed.lineDetails) {
      const hsnKey = `${line.hsnCode}:${line.uqc}:${line.gstRate}`;
      const existing = hsnMap.get(hsnKey) || {
        hsnCode: line.hsnCode,
        description: line.description,
        uqc: line.uqc,
        gstRate: line.gstRate,
        totalQuantity: 0,
        totalValue: 0,
        taxableValue: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
      };
      existing.totalQuantity = round2(existing.totalQuantity + line.quantity);
      existing.totalValue = round2(existing.totalValue + line.totalValue);
      existing.taxableValue = round2(existing.taxableValue + line.taxableValue);
      existing.igst = round2(existing.igst + line.igst);
      existing.cgst = round2(existing.cgst + line.cgst);
      existing.sgst = round2(existing.sgst + line.sgst);
      hsnMap.set(hsnKey, existing);
    }
  }

  const cnTotals: GstTaxTotals = {
    taxableValue: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    totalTax: 0,
    invoiceValue: 0,
  };

  const creditNoteRows: GstCreditNoteRow[] = periodCreditNotes.map((cn) => {
    const t = cn.totals || {};
    const taxableValue = round2(Number(t.taxableValue || 0));
    const cgst = round2(Number(t.cgst || 0));
    const sgst = round2(Number(t.sgst || 0));
    const igst = round2(Number(t.igst || 0));
    const totalTax = round2(Number(t.totalTax !== undefined ? t.totalTax : cgst + sgst + igst));
    const totalAmount = round2(
      Number(t.invoiceValue !== undefined ? t.invoiceValue : taxableValue + totalTax)
    );

    cnTotals.taxableValue = round2(cnTotals.taxableValue + taxableValue);
    cnTotals.cgst = round2(cnTotals.cgst + cgst);
    cnTotals.sgst = round2(cnTotals.sgst + sgst);
    cnTotals.igst = round2(cnTotals.igst + igst);
    cnTotals.totalTax = round2(cnTotals.totalTax + totalTax);
    cnTotals.invoiceValue = round2(cnTotals.invoiceValue + totalAmount);

    return {
      creditNoteId: String(cn.creditNoteId || cn.id || ""),
      originalInvoiceId: String(cn.originalInvoiceId || ""),
      originalInvoiceDate: String(cn.originalInvoiceDate || resolveIsoDate(cn)),
      isoDate: resolveIsoDate(cn),
      customerName: String(cn.customerName || "Customer"),
      customerGstin: isValidGstin(cn.customerGstin) ? String(cn.customerGstin).toUpperCase() : "",
      posCode: padStateCode(cn.posCode || supplierStateCode),
      isInterState: Boolean(cn.isInterState),
      reason: String(cn.reason || "Sales Return"),
      refundMode: String(cn.refundMode || "Cash"),
      restocked: Boolean(cn.restocked),
      taxableValue,
      cgst,
      sgst,
      igst,
      totalTax,
      totalAmount,
      rateBuckets: Array.isArray(cn.rateBuckets) ? cn.rateBuckets : [],
    };
  });

  // Eligible ITC from Cashbook Debit entries with gstAmount / gstRate
  const eligibleItc: GstItcSummary = {
    igst: 0,
    cgst: 0,
    sgst: 0,
    totalItc: 0,
    eligibleEntriesCount: 0,
  };

  for (const entry of cashbookEntries || []) {
    if (!entry || entry.type !== "debit") continue;
    if (!isIsoDateInGstPeriod(resolveIsoDate(entry), filter)) continue;

    const explicitGst = Number(entry.gstAmount || 0);
    if (explicitGst <= 0) continue;

    eligibleItc.eligibleEntriesCount += 1;
    const isInterPurchase =
      entry.itcType === "igst" ||
      (isValidGstin(entry.vendorGstin) &&
        String(entry.vendorGstin).slice(0, 2) !== supplierStateCode);

    if (isInterPurchase) {
      eligibleItc.igst = round2(eligibleItc.igst + explicitGst);
    } else {
      const half = round2(explicitGst / 2);
      eligibleItc.cgst = round2(eligibleItc.cgst + half);
      eligibleItc.sgst = round2(eligibleItc.sgst + (explicitGst - half));
    }
    eligibleItc.totalItc = round2(eligibleItc.igst + eligibleItc.cgst + eligibleItc.sgst);
  }

  const netOutwardLiability: GstTaxTotals = {
    taxableValue: round2(Math.max(0, outwardTotals.taxableValue - cnTotals.taxableValue)),
    cgst: round2(Math.max(0, outwardTotals.cgst - cnTotals.cgst)),
    sgst: round2(Math.max(0, outwardTotals.sgst - cnTotals.sgst)),
    igst: round2(Math.max(0, outwardTotals.igst - cnTotals.igst)),
    cess: 0,
    totalTax: round2(Math.max(0, outwardTotals.totalTax - cnTotals.totalTax)),
    invoiceValue: round2(Math.max(0, outwardTotals.invoiceValue - cnTotals.invoiceValue)),
  };

  const netIgstPayable = round2(Math.max(0, netOutwardLiability.igst - eligibleItc.igst));
  const netCgstPayable = round2(Math.max(0, netOutwardLiability.cgst - eligibleItc.cgst));
  const netSgstPayable = round2(Math.max(0, netOutwardLiability.sgst - eligibleItc.sgst));

  return {
    supplierGstin,
    supplierStateCode,
    filingPeriodCode,
    invoiceCount: periodInvoices.length,
    b2bInvoices,
    b2clInvoices,
    b2csSummary: Array.from(b2csMap.values()).sort(
      (a, b) => a.posCode.localeCompare(b.posCode) || a.rate - b.rate
    ),
    hsnSummary: Array.from(hsnMap.values()).sort(
      (a, b) => b.taxableValue - a.taxableValue || a.hsnCode.localeCompare(b.hsnCode)
    ),
    creditNotes: creditNoteRows,
    gstr3b: {
      outwardTaxableSupplies: outwardTotals,
      creditNoteAdjustments: cnTotals,
      netOutwardLiability,
      eligibleItc,
      netTaxPayable: {
        igst: netIgstPayable,
        cgst: netCgstPayable,
        sgst: netSgstPayable,
        total: round2(netIgstPayable + netCgstPayable + netSgstPayable),
      },
    },
  };
}

/**
 * Generates official Indian GST Portal (GSTN Offline Utility) GSTR-1 JSON payload.
 */
export function buildGstr1Json(bundle: GstReportBundle) {
  // Group B2B invoices by receiver GSTIN (ctin)
  const b2bByCtin = new Map<string, any[]>();
  for (const row of bundle.b2bInvoices) {
    const itms = row.rateBuckets.map((b, idx) => ({
      num: (idx + 1) * 100 + Math.round(b.rate),
      itm_det: {
        txval: b.taxableValue,
        rt: b.rate,
        ...(row.isInterState
          ? { iamt: b.igst }
          : { camt: b.cgst, samt: b.sgst }),
        csamt: 0,
      },
    }));

    const list = b2bByCtin.get(row.customerGstin) || [];
    list.push({
      inum: row.invoiceId.slice(0, 16),
      idt: formatNicDate(row.isoDate).replace(/\//g, "-"),
      val: row.invoiceValue,
      pos: row.posCode,
      rchrg: "N",
      inv_typ: "R",
      itms,
    });
    b2bByCtin.set(row.customerGstin, list);
  }

  const b2b = Array.from(b2bByCtin.entries()).map(([ctin, inv]) => ({
    ctin,
    inv,
  }));

  // Group B2CL by place of supply
  const b2clByPos = new Map<string, any[]>();
  for (const row of bundle.b2clInvoices) {
    const list = b2clByPos.get(row.posCode) || [];
    list.push({
      inum: row.invoiceId.slice(0, 16),
      idt: formatNicDate(row.isoDate).replace(/\//g, "-"),
      val: row.invoiceValue,
      itms: row.rateBuckets.map((b, idx) => ({
        num: (idx + 1) * 100 + Math.round(b.rate),
        itm_det: {
          txval: b.taxableValue,
          rt: b.rate,
          iamt: b.igst,
          csamt: 0,
        },
      })),
    });
    b2clByPos.set(row.posCode, list);
  }
  const b2cl = Array.from(b2clByPos.entries()).map(([pos, inv]) => ({
    pos,
    inv,
  }));

  const b2cs = bundle.b2csSummary.map((row) => ({
    sply_ty: row.supplyType,
    pos: row.posCode,
    typ: "OE",
    rt: row.rate,
    txval: row.taxableValue,
    ...(row.supplyType === "INTER"
      ? { iamt: row.igst }
      : { camt: row.cgst, samt: row.sgst }),
    csamt: 0,
  }));

  // Group B2B Credit Notes (CDNR) by ctin
  const cdnrByCtin = new Map<string, any[]>();
  const cdnur: any[] = [];

  for (const cn of bundle.creditNotes) {
    const ntEntry = {
      ntty: "C",
      nt_num: cn.creditNoteId.slice(0, 16),
      nt_dt: formatNicDate(cn.isoDate).replace(/\//g, "-"),
      val: cn.totalAmount,
      pos: cn.posCode,
      rchrg: "N",
      inv_typ: "R",
      itms: (cn.rateBuckets.length > 0
        ? cn.rateBuckets
        : [
            {
              rate: cn.taxableValue > 0 ? Math.round((cn.totalTax / cn.taxableValue) * 100) : 0,
              taxableValue: cn.taxableValue,
              cgst: cn.cgst,
              sgst: cn.sgst,
              igst: cn.igst,
              totalTax: cn.totalTax,
            },
          ]
      ).map((b, idx) => ({
        num: (idx + 1) * 100 + Math.round(b.rate),
        itm_det: {
          txval: b.taxableValue,
          rt: b.rate,
          ...(cn.isInterState ? { iamt: b.igst } : { camt: b.cgst, samt: b.sgst }),
          csamt: 0,
        },
      })),
    };

    if (cn.customerGstin) {
      const list = cdnrByCtin.get(cn.customerGstin) || [];
      list.push(ntEntry);
      cdnrByCtin.set(cn.customerGstin, list);
    } else if (cn.isInterState && cn.totalAmount > B2CL_THRESHOLD) {
      cdnur.push({
        typ: "B2CL",
        ntty: "C",
        nt_num: cn.creditNoteId.slice(0, 16),
        nt_dt: formatNicDate(cn.isoDate).replace(/\//g, "-"),
        val: cn.totalAmount,
        pos: cn.posCode,
        itms: ntEntry.itms,
      });
    }
  }

  const cdnr = Array.from(cdnrByCtin.entries()).map(([ctin, nt]) => ({
    ctin,
    nt,
  }));

  const hsnData = bundle.hsnSummary.map((row, idx) => ({
    num: idx + 1,
    hsn_sc: row.hsnCode,
    desc: row.description.slice(0, 30),
    uqc: row.uqc,
    qty: row.totalQuantity,
    rt: row.gstRate,
    val: row.totalValue,
    txval: row.taxableValue,
    iamt: row.igst,
    camt: row.cgst,
    samt: row.sgst,
    csamt: 0,
  }));

  return {
    gstin: bundle.supplierGstin || "URP",
    fp: bundle.filingPeriodCode,
    version: "GST3.1.2",
    hash: "hash",
    b2b,
    b2cl,
    b2cs,
    cdnr,
    cdnur,
    hsn: {
      data: hsnData,
    },
  };
}

function escapeCsv(val: unknown): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildGstr1SummaryCsv(bundle: GstReportBundle): string {
  const lines: string[] = [];

  lines.push("SECTION,GSTR-1 SUMMARY REPORT");
  lines.push(`Supplier GSTIN,${escapeCsv(bundle.supplierGstin || "Not Configured")}`);
  lines.push(`Filing Period (MMYYYY),${escapeCsv(bundle.filingPeriodCode)}`);
  lines.push("");

  lines.push("B2B INVOICES (REGISTERED CUSTOMERS)");
  lines.push("Invoice No,Date,Customer Name,Customer GSTIN,POS Code,Taxable Value,CGST,SGST,IGST,Total Tax,Invoice Value");
  for (const r of bundle.b2bInvoices) {
    lines.push(
      [
        r.invoiceId,
        r.isoDate,
        r.customerName,
        r.customerGstin,
        r.posCode,
        r.taxableValue,
        r.cgst,
        r.sgst,
        r.igst,
        r.totalTax,
        r.invoiceValue,
      ]
        .map(escapeCsv)
        .join(",")
    );
  }
  lines.push("");

  lines.push("B2CS SUMMARY (UNREGISTERED / RETAIL CONSOLIDATED)");
  lines.push("Supply Type,POS Code,GST Rate %,Taxable Value,CGST,SGST,IGST,Total Tax,Invoices");
  for (const r of bundle.b2csSummary) {
    lines.push(
      [
        r.supplyType,
        r.posCode,
        r.rate,
        r.taxableValue,
        r.cgst,
        r.sgst,
        r.igst,
        r.totalTax,
        r.invoiceCount,
      ]
        .map(escapeCsv)
        .join(",")
    );
  }
  lines.push("");

  lines.push("HSN SUMMARY (GSTR-1 TABLE 12)");
  lines.push("HSN Code,Description,UQC,GST Rate %,Quantity,Total Value,Taxable Value,CGST,SGST,IGST");
  for (const h of bundle.hsnSummary) {
    lines.push(
      [
        h.hsnCode,
        h.description,
        h.uqc,
        h.gstRate,
        h.totalQuantity,
        h.totalValue,
        h.taxableValue,
        h.cgst,
        h.sgst,
        h.igst,
      ]
        .map(escapeCsv)
        .join(",")
    );
  }
  lines.push("");

  lines.push("CREDIT NOTES / SALES RETURNS");
  lines.push("Credit Note No,Date,Original Invoice,Customer Name,Customer GSTIN,Reason,Taxable Value,CGST,SGST,IGST,Total Refund");
  for (const cn of bundle.creditNotes) {
    lines.push(
      [
        cn.creditNoteId,
        cn.isoDate,
        cn.originalInvoiceId,
        cn.customerName,
        cn.customerGstin || "URP",
        cn.reason,
        cn.taxableValue,
        cn.cgst,
        cn.sgst,
        cn.igst,
        cn.totalAmount,
      ]
        .map(escapeCsv)
        .join(",")
    );
  }

  return lines.join("\n");
}

export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
