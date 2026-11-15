import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGstr1Json,
  buildGstr1SummaryCsv,
  computeCreditNoteBreakdown,
  computeGstReportBundle,
  isIsoDateInGstPeriod,
  isValidGstin,
} from "./gst-reports";

const sampleBusiness = {
  name: "Apex Solar Solutions",
  gstin: "27AABCU9603R1ZM",
  state: "Maharashtra",
  gstMode: "exclusive",
};

const sampleInvoices = [
  // 1. B2B Intra-state (Maharashtra -> Maharashtra, 18% GST)
  {
    invoiceId: "AS-261114-1001",
    isoDate: "2026-11-10",
    type: "sales",
    customerName: "Kiran Traders Pvt Ltd",
    customerGstin: "27AAACK1234A1Z5",
    customerState: "Maharashtra",
    items: [
      {
        productId: "p1",
        name: "540W Mono Solar Panel",
        hsnCode: "8541",
        quantity: 2,
        price: 15000,
        gstRate: 18,
        unit: "NOS",
      },
    ],
    totals: {
      itemTotal: 30000,
      taxTotal: 5400,
      cgst: 2700,
      sgst: 2700,
      igst: 0,
      isInterState: false,
      finalPayout: 35400,
    },
  },
  // 2. B2CL Inter-state Unregistered (> ₹2,50,000, Maharashtra -> Gujarat, 18% IGST)
  {
    invoiceId: "AS-261114-1002",
    isoDate: "2026-11-11",
    type: "sales",
    customerName: "Gujarat Infra Co",
    customerGstin: "",
    customerState: "Gujarat",
    items: [
      {
        productId: "p2",
        name: "10kW Hybrid Inverter",
        hsnCode: "8504",
        quantity: 3,
        price: 100000,
        gstRate: 18,
        unit: "NOS",
      },
    ],
    totals: {
      itemTotal: 300000,
      taxTotal: 54000,
      cgst: 0,
      sgst: 0,
      igst: 54000,
      isInterState: true,
      finalPayout: 354000,
    },
  },
  // 3. B2CS Retail Intra-state (Maharashtra, 5% GST)
  {
    invoiceId: "AS-261114-1003",
    isoDate: "2026-11-12",
    type: "sales",
    customerName: "Ramesh Kumar",
    customerGstin: "",
    customerState: "Maharashtra",
    items: [
      {
        productId: "p3",
        name: "DC Cable Roll",
        hsnCode: "8544",
        quantity: 4,
        price: 1000,
        gstRate: 5,
        unit: "NOS",
      },
    ],
    totals: {
      itemTotal: 4000,
      taxTotal: 200,
      cgst: 100,
      sgst: 100,
      igst: 0,
      isInterState: false,
      finalPayout: 4200,
    },
  },
  // 4. Quotation (must be excluded from GST returns)
  {
    invoiceId: "QT-261114-9999",
    isoDate: "2026-11-12",
    type: "quotation",
    customerName: "Draft Lead",
    items: [{ name: "Test", quantity: 1, price: 50000, gstRate: 18 }],
    totals: { itemTotal: 50000, taxTotal: 9000, finalPayout: 59000 },
  },
];

test("isValidGstin and period filtering accurately validate GSTIN and monthly/quarterly/custom windows", () => {
  assert.equal(isValidGstin("27AABCU9603R1ZM"), true);
  assert.equal(isValidGstin("URP"), false);
  assert.equal(isIsoDateInGstPeriod("2026-11-10", { mode: "month", month: "2026-11" }), true);
  assert.equal(isIsoDateInGstPeriod("2026-10-31", { mode: "month", month: "2026-11" }), false);
  assert.equal(isIsoDateInGstPeriod("2026-11-10", { mode: "quarter", quarter: "2026-Q4" }), true);
  assert.equal(
    isIsoDateInGstPeriod("2026-11-10", {
      mode: "custom",
      startDate: "2026-11-01",
      endDate: "2026-11-15",
    }),
    true
  );
});

test("computeGstReportBundle classifies B2B, B2CL, B2CS, HSN, Credit Notes, and GSTR-3B Net Tax Payable", () => {
  const creditNote = computeCreditNoteBreakdown({
    invoice: sampleInvoices[0],
    business: sampleBusiness,
    returnQuantities: { 0: 1 }, // return 1 of 2 panels (15000 + 2700 GST)
    reason: "Damaged in transit",
    refundMode: "Bank",
    restocked: false,
    creditNoteId: "CN-261114-0001",
    isoDate: "2026-11-13",
  });

  assert.equal(creditNote.totals.taxableValue, 15000);
  assert.equal(creditNote.totals.cgst, 1350);
  assert.equal(creditNote.totals.sgst, 1350);
  assert.equal(creditNote.totals.invoiceValue, 17700);
  assert.equal(creditNote.isFullReturn, false);

  const cashbookEntries = [
    {
      type: "debit",
      date: "2026-11-05",
      category: "Purchase",
      amount: 11800,
      gstAmount: 1800,
      vendorGstin: "27AAAVV1111A1Z1",
    },
    {
      type: "debit",
      date: "2026-11-06",
      category: "Purchase",
      amount: 11800,
      gstAmount: 1800,
      vendorGstin: "24AAAVV2222B1Z2", // Inter-state vendor -> IGST ITC
    },
  ];

  const bundle = computeGstReportBundle({
    invoices: sampleInvoices,
    creditNotes: [creditNote],
    cashbookEntries,
    business: sampleBusiness,
    filter: { mode: "month", month: "2026-11" },
  });

  assert.equal(bundle.invoiceCount, 3);
  assert.equal(bundle.b2bInvoices.length, 1);
  assert.equal(bundle.b2clInvoices.length, 1);
  assert.equal(bundle.b2csSummary.length, 1);
  assert.equal(bundle.hsnSummary.length, 3);

  // Gross outward = 30k + 300k + 4k = 334,000 taxable; tax = 5400 + 54000 + 200 = 59,600
  assert.equal(bundle.gstr3b.outwardTaxableSupplies.taxableValue, 334000);
  assert.equal(bundle.gstr3b.outwardTaxableSupplies.cgst, 2800);
  assert.equal(bundle.gstr3b.outwardTaxableSupplies.sgst, 2800);
  assert.equal(bundle.gstr3b.outwardTaxableSupplies.igst, 54000);

  // After Credit Note (-15,000 taxable, -1350 CGST, -1350 SGST)
  assert.equal(bundle.gstr3b.netOutwardLiability.taxableValue, 319000);
  assert.equal(bundle.gstr3b.netOutwardLiability.cgst, 1450);
  assert.equal(bundle.gstr3b.netOutwardLiability.sgst, 1450);
  assert.equal(bundle.gstr3b.netOutwardLiability.igst, 54000);

  // ITC: Intra 1800 -> 900 CGST + 900 SGST; Inter 1800 -> 1800 IGST
  assert.equal(bundle.gstr3b.eligibleItc.cgst, 900);
  assert.equal(bundle.gstr3b.eligibleItc.sgst, 900);
  assert.equal(bundle.gstr3b.eligibleItc.igst, 1800);

  // Net Payable: CGST 550, SGST 550, IGST 52200 => Total 53300
  assert.equal(bundle.gstr3b.netTaxPayable.cgst, 550);
  assert.equal(bundle.gstr3b.netTaxPayable.sgst, 550);
  assert.equal(bundle.gstr3b.netTaxPayable.igst, 52200);
  assert.equal(bundle.gstr3b.netTaxPayable.total, 53300);
});

test("buildGstr1Json and buildGstr1SummaryCsv produce GSTN-compliant JSON sections and CSV output", () => {
  const bundle = computeGstReportBundle({
    invoices: sampleInvoices,
    creditNotes: [],
    cashbookEntries: [],
    business: sampleBusiness,
    filter: { mode: "month", month: "2026-11" },
  });

  const gstr1 = buildGstr1Json(bundle);
  assert.equal(gstr1.gstin, "27AABCU9603R1ZM");
  assert.equal(gstr1.fp, "112026");
  assert.equal(gstr1.b2b.length, 1);
  assert.equal(gstr1.b2b[0].ctin, "27AAACK1234A1Z5");
  assert.equal(gstr1.b2b[0].inv[0].inum, "AS-261114-1001");
  assert.equal(gstr1.b2cl.length, 1);
  assert.equal(gstr1.b2cl[0].pos, "24");
  assert.equal(gstr1.b2cs.length, 1);
  assert.equal(gstr1.b2cs[0].sply_ty, "INTRA");
  assert.equal(gstr1.hsn.data.length, 3);

  const csv = buildGstr1SummaryCsv(bundle);
  assert.match(csv, /27AABCU9603R1ZM/);
  assert.match(csv, /AS-261114-1001/);
  assert.match(csv, /8541/);
});
