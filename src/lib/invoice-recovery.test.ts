import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPaymentRecoveryAllocation,
  buildUpiPaymentLink,
  buildWhatsAppChatLink,
  buildWhatsAppInvoiceMessage,
  getInvoiceDueSummary,
  normalizeIndianWhatsAppPhone,
} from "./invoice-recovery";

test("getInvoiceDueSummary accounts for partial payments and credit note returns", () => {
  const inv = {
    invoiceId: "BZ-261114-1001",
    totals: {
      finalPayout: 10000,
      collected: 4000,
      dueAmount: 6000,
    },
    returnedAmount: 1000,
  };

  const summary = getInvoiceDueSummary(inv);
  assert.equal(summary.finalPayout, 10000);
  assert.equal(summary.returnedAmount, 1000);
  assert.equal(summary.netBillAmount, 9000);
  assert.equal(summary.collectedAmount, 4000);
  assert.equal(summary.dueAmount, 5000);
  assert.equal(summary.paymentStatus, "PARTIAL");
});

test("buildPaymentRecoveryAllocation validates bounds and transitions PARTIAL -> PAID", () => {
  const inv = {
    invoiceId: "BZ-261114-1002",
    totals: { finalPayout: 5000, collected: 2000, dueAmount: 3000 },
  };

  const tooHigh = buildPaymentRecoveryAllocation({
    invoice: inv,
    paymentAmount: 4000,
    mode: "UPI",
    isoDate: "2026-11-14",
  });
  assert.equal(tooHigh.valid, false);

  const partial = buildPaymentRecoveryAllocation({
    invoice: inv,
    paymentAmount: 1500,
    mode: "UPI",
    isoDate: "2026-11-14",
    note: "GPay ref 123",
  });
  assert.equal(partial.valid, true);
  assert.equal(partial.collectedAmount, 3500);
  assert.equal(partial.dueAmount, 1500);
  assert.equal(partial.paymentStatus, "PARTIAL");

  const fullClear = buildPaymentRecoveryAllocation({
    invoice: { totals: { finalPayout: 5000, collected: 3500, dueAmount: 1500 } },
    paymentAmount: 1500,
    mode: "Cash",
    isoDate: "2026-11-14",
  });
  assert.equal(fullClear.valid, true);
  assert.equal(fullClear.dueAmount, 0);
  assert.equal(fullClear.paymentStatus, "PAID");
});

test("WhatsApp phone normalization, UPI pay link, and invoice message formatting work accurately", () => {
  assert.equal(normalizeIndianWhatsAppPhone("9876543210"), "919876543210");
  assert.equal(normalizeIndianWhatsAppPhone("09876543210"), "919876543210");
  assert.equal(normalizeIndianWhatsAppPhone("+91 98765-43210"), "919876543210");

  const upi = buildUpiPaymentLink({
    upiId: "apex@okaxis",
    payeeName: "Apex Solar",
    amount: 2500,
    invoiceId: "AS-261114-1234",
  });
  assert.match(upi, /^upi:\/\/pay\?pa=apex%40okaxis/);
  assert.match(upi, /am=2500\.00/);

  const msg = buildWhatsAppInvoiceMessage({
    invoice: {
      invoiceId: "AS-261114-1234",
      date: "14/11/2026",
      customerName: "Rohan Verma",
      items: [{ name: "Inverter 5kW", quantity: 1, price: 25000 }],
      totals: { finalPayout: 29500, collected: 20000, dueAmount: 9500 },
      ewayBill: { ewbNumber: "141000012345" },
    },
    business: { name: "Apex Solar", upiId: "apex@okaxis" },
    customNote: "Please clear due by Friday.",
  });

  assert.match(msg, /AS-261114-1234/);
  assert.match(msg, /Balance Due:\* ₹9,500/);
  assert.match(msg, /E-Way Bill No: 141000012345/);
  assert.match(msg, /Pay Due via UPI:/);

  const link = buildWhatsAppChatLink("9876543210", msg);
  assert.match(link, /^https:\/\/wa\.me\/919876543210\?text=/);
});
