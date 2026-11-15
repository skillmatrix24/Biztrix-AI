import { round2 } from "./gst-reports";

export interface InvoiceDueSummary {
  finalPayout: number;
  returnedAmount: number;
  netBillAmount: number;
  collectedAmount: number;
  dueAmount: number;
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID";
}

export interface InvoicePaymentHistoryEntry {
  amount: number;
  mode: string;
  isoDate: string;
  note: string;
  recordedBy: string;
  recordedAt: string;
}

export function getInvoiceDueSummary(invoice: any): InvoiceDueSummary {
  const finalPayout = round2(Math.max(0, Number(invoice?.totals?.finalPayout || 0)));
  const returnedAmount = round2(Math.max(0, Number(invoice?.returnedAmount || 0)));
  const netBillAmount = round2(Math.max(0, finalPayout - returnedAmount));

  const storedCollected = Number(invoice?.totals?.collected);
  const storedDue = Number(invoice?.totals?.dueAmount);

  let collectedAmount = 0;
  if (!Number.isNaN(storedCollected) && invoice?.totals?.collected !== undefined) {
    collectedAmount = round2(Math.max(0, storedCollected));
  } else if (!Number.isNaN(storedDue) && invoice?.totals?.dueAmount !== undefined) {
    collectedAmount = round2(Math.max(0, finalPayout - storedDue));
  } else {
    collectedAmount = finalPayout;
  }

  const dueAmount = round2(Math.max(0, netBillAmount - collectedAmount));

  let paymentStatus: "PAID" | "PARTIAL" | "UNPAID" = "PAID";
  if (dueAmount > 0.01) {
    paymentStatus = collectedAmount > 0.01 ? "PARTIAL" : "UNPAID";
  }

  return {
    finalPayout,
    returnedAmount,
    netBillAmount,
    collectedAmount,
    dueAmount,
    paymentStatus,
  };
}

export function normalizeIndianWhatsAppPhone(phone?: string): string {
  let clean = String(phone || "").replace(/\D/g, "");
  if (!clean) return "";
  if (clean.startsWith("0") && clean.length === 11) {
    clean = clean.slice(1);
  }
  if (clean.length === 10) {
    return `91${clean}`;
  }
  return clean;
}

export function buildUpiPaymentLink(params: {
  upiId?: string;
  payeeName?: string;
  amount: number;
  invoiceId: string;
}): string {
  const pa = String(params.upiId || "").trim();
  if (!pa || !pa.includes("@") || params.amount <= 0) return "";
  const pn = encodeURIComponent(String(params.payeeName || "Merchant").slice(0, 50));
  const am = round2(params.amount).toFixed(2);
  const tn = encodeURIComponent(`Invoice ${params.invoiceId}`);
  return `upi://pay?pa=${encodeURIComponent(pa)}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
}

export function buildWhatsAppInvoiceMessage(params: {
  invoice: any;
  business: any;
  currencySymbol?: string;
  customNote?: string;
}): string {
  const { invoice, business, currencySymbol = "₹", customNote } = params;
  const bizName = String(business?.name || "Our Store").trim();
  const invoiceId = String(invoice?.invoiceId || invoice?.id || "INV");
  const dateStr = String(invoice?.date || invoice?.isoDate || "");
  const customerName = String(invoice?.customerName || "Valued Customer").trim();
  const dueInfo = getInvoiceDueSummary(invoice);
  const items = Array.isArray(invoice?.items) ? invoice.items : [];

  const lines: string[] = [];
  lines.push(`*${bizName}*`);
  lines.push(`Tax Invoice: *${invoiceId}*${dateStr ? ` (${dateStr})` : ""}`);
  lines.push(`Hello ${customerName},`);
  lines.push("");

  if (items.length > 0) {
    lines.push("*Items:*");
    items.slice(0, 6).forEach((it: any) => {
      const qty = Number(it.quantity || 1);
      const price = Number(it.price || 0);
      lines.push(`• ${it.name || "Item"} x${qty} — ${currencySymbol}${(qty * price).toLocaleString("en-IN")}`);
    });
    if (items.length > 6) {
      lines.push(`• ...and ${items.length - 6} more item(s)`);
    }
    lines.push("");
  }

  lines.push(`*Bill Total:* ${currencySymbol}${dueInfo.netBillAmount.toLocaleString("en-IN")}`);
  lines.push(`*Paid:* ${currencySymbol}${dueInfo.collectedAmount.toLocaleString("en-IN")}`);

  if (dueInfo.dueAmount > 0) {
    lines.push(`*Balance Due:* ${currencySymbol}${dueInfo.dueAmount.toLocaleString("en-IN")}`);
    const upiLink = buildUpiPaymentLink({
      upiId: business?.upiId,
      payeeName: bizName,
      amount: dueInfo.dueAmount,
      invoiceId,
    });
    if (upiLink) {
      lines.push(`Pay Due via UPI: ${upiLink}`);
    } else if (business?.upiId) {
      lines.push(`UPI ID: ${business.upiId}`);
    }
  } else {
    lines.push("*Status:* Paid in Full");
  }

  const ewbNo = invoice?.ewayBill?.ewbNumber;
  if (ewbNo) {
    lines.push(`E-Way Bill No: ${ewbNo}`);
  }

  if (customNote?.trim()) {
    lines.push("");
    lines.push(customNote.trim());
  }

  lines.push("");
  lines.push(`Thank you for shopping with ${bizName}.`);
  return lines.join("\n");
}

export function buildWhatsAppChatLink(phone: string, message: string): string {
  const normalized = normalizeIndianWhatsAppPhone(phone);
  const encoded = encodeURIComponent(message);
  return normalized ? `https://wa.me/${normalized}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

export function buildPaymentRecoveryAllocation(params: {
  invoice: any;
  paymentAmount: number;
  mode: string;
  isoDate: string;
  note?: string;
  recordedBy?: string;
}): {
  valid: boolean;
  error?: string;
  collectedAmount: number;
  dueAmount: number;
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID";
  appliedAmount: number;
  historyEntry?: InvoicePaymentHistoryEntry;
} {
  const summary = getInvoiceDueSummary(params.invoice);
  const amount = round2(Number(params.paymentAmount || 0));

  if (summary.dueAmount <= 0) {
    return {
      valid: false,
      error: "This invoice has no pending due balance.",
      collectedAmount: summary.collectedAmount,
      dueAmount: 0,
      paymentStatus: "PAID",
      appliedAmount: 0,
    };
  }

  if (Number.isNaN(amount) || amount <= 0) {
    return {
      valid: false,
      error: "Enter a payment amount greater than 0.",
      collectedAmount: summary.collectedAmount,
      dueAmount: summary.dueAmount,
      paymentStatus: summary.paymentStatus,
      appliedAmount: 0,
    };
  }

  if (amount > summary.dueAmount + 0.01) {
    return {
      valid: false,
      error: `Amount cannot exceed pending due of ${summary.dueAmount.toLocaleString("en-IN")}.`,
      collectedAmount: summary.collectedAmount,
      dueAmount: summary.dueAmount,
      paymentStatus: summary.paymentStatus,
      appliedAmount: 0,
    };
  }

  const appliedAmount = Math.min(amount, summary.dueAmount);
  const nextCollected = round2(summary.collectedAmount + appliedAmount);
  const nextDue = round2(Math.max(0, summary.netBillAmount - nextCollected));
  const nextStatus: "PAID" | "PARTIAL" | "UNPAID" = nextDue > 0.01 ? "PARTIAL" : "PAID";

  return {
    valid: true,
    collectedAmount: nextCollected,
    dueAmount: nextDue,
    paymentStatus: nextStatus,
    appliedAmount,
    historyEntry: {
      amount: appliedAmount,
      mode: params.mode || "Cash",
      isoDate: params.isoDate || new Date().toISOString().slice(0, 10),
      note: String(params.note || "").trim(),
      recordedBy: params.recordedBy || "Admin",
      recordedAt: new Date().toISOString(),
    },
  };
}
