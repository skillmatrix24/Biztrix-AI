import test from "node:test";
import assert from "node:assert/strict";
import {
  buildNicCancelEwbPayload,
  buildNicEWayBillJson,
  buildNicGeneratePayload,
  buildNicVehicleUpdatePayload,
  createDefaultEWayDetails,
  evaluateEWayRequirement,
  extractPincode,
  formatNicDate,
  generateUniqueInvoiceId,
  getGspIntegrationGuide,
  parseNicGspResponse,
  resolveGspEndpoints,
  resolveGstStateCode,
  validateEWayBillDetails,
  validateGspConfigInput,
  validateInvoiceForLiveEwb,
} from "./eway-bill";

test("evaluateEWayRequirement triggers strictly for physical POS bills exceeding ₹50,000", () => {
  assert.equal(
    evaluateEWayRequirement({ finalPayout: 50000, isQuotation: false }).required,
    false
  );
  assert.equal(
    evaluateEWayRequirement({ finalPayout: 50001, isQuotation: false }).required,
    true
  );
  assert.equal(
    evaluateEWayRequirement({ finalPayout: 95000, isQuotation: true }).required,
    false
  );
  assert.equal(
    evaluateEWayRequirement({ finalPayout: 95000, isRewardSyncMode: true }).required,
    false
  );
});

test("resolveGstStateCode prioritizes GSTIN prefix and maps state names case-insensitively", () => {
  assert.equal(resolveGstStateCode("Maharashtra", "27AABCU9603R1ZM"), 27);
  assert.equal(resolveGstStateCode("uttar pradesh", ""), 9);
  assert.equal(resolveGstStateCode("New Delhi", ""), 7);
  assert.equal(resolveGstStateCode("", "29AABCU9603R1ZM"), 29);
});

test("validateEWayBillDetails validates vehicle number, transporter GSTIN, pincodes, and 12-digit EWB No", () => {
  const validDetails = {
    ...createDefaultEWayDetails({ enabled: true, fromPincode: "400001", toPincode: "411001" }),
    vehicleNo: "MH 12 AB 1234",
    transDistance: "150",
    ewbNumber: "141009912345",
  };
  const ok = validateEWayBillDetails(validDetails);
  assert.equal(ok.valid, true);
  assert.equal(ok.errors.length, 0);

  const badDetails = {
    ...validDetails,
    vehicleNo: "INVALID!",
    toPincode: "123",
    ewbNumber: "12345",
  };
  const fail = validateEWayBillDetails(badDetails);
  assert.equal(fail.valid, false);
  assert.equal(fail.errors.length, 3);
});

test("extractPincode and generateUniqueInvoiceId adhere to Indian PIN and <=16 char NIC docNo constraints", () => {
  assert.equal(extractPincode("", "Plot 12, Sector 18, Gurugram 122015"), "122015");
  assert.equal(extractPincode("400001", "Fallback 110001"), "400001");

  const docNo = generateUniqueInvoiceId("SkillMatrix Solar Solutions", new Date("2026-11-14T10:00:00Z"));
  assert.ok(docNo.length <= 16, `docNo too long: ${docNo}`);
  assert.match(docNo, /^[A-Z0-9-]+$/);
  assert.equal(formatNicDate("2026-11-14"), "14/11/2026");
});

test("buildNicEWayBillJson generates compliant CGST/SGST and IGST NIC billLists payloads", () => {
  const business = {
    name: "Biztrix Electronics",
    gstin: "27AABCU9603R1ZM",
    state: "Maharashtra",
    address: "Andheri East, Mumbai 400069",
    gstMode: "exclusive",
  };

  const interStateInvoice = {
    invoiceId: "BE-261114-1024",
    isoDate: "2026-11-14",
    customerName: "Apex Distributors",
    customerGstin: "07AABCA1234E1Z5",
    customerState: "Delhi",
    customerAddress: "Okhla Phase 2, New Delhi 110020",
    items: [
      {
        name: "5kW Solar Inverter",
        hsnCode: "85044090",
        quantity: 2,
        price: 30000,
        gstRate: 18,
        itemDiscount: 0,
      },
    ],
    totals: {
      itemTotal: 60000,
      cgst: 0,
      sgst: 0,
      igst: 10800,
      finalPayout: 70800,
      isInterState: true,
    },
    ewayBill: {
      ...createDefaultEWayDetails({ enabled: true, fromPincode: "400069", toPincode: "110020" }),
      vehicleNo: "MH02DE4321",
      transDistance: "1400",
      transporterName: "SafeExpress Logistics",
    },
  };

  const json = buildNicEWayBillJson([interStateInvoice], business);
  assert.equal(json.version, "1.0.0420");
  assert.equal(json.billLists.length, 1);

  const bill = json.billLists[0];
  assert.equal(bill.docNo, "BE-261114-1024");
  assert.equal(bill.docDate, "14/11/2026");
  assert.equal(bill.fromStateCode, 27);
  assert.equal(bill.toStateCode, 7);
  assert.equal(bill.fromPincode, 400069);
  assert.equal(bill.toPincode, 110020);
  assert.equal(bill.totInvValue, 70800);
  assert.equal(bill.igstValue, 10800);
  assert.equal(bill.vehicleNo, "MH02DE4321");
  assert.equal(bill.mainHsnCode, 85044090);
  assert.equal(bill.itemList[0].igstRate, 18);
  assert.equal(bill.itemList[0].cgstRate, 0);
});

test("resolveGspEndpoints resolves MasterGST, ClearTax, and Custom URLs accurately", () => {
  const mg = resolveGspEndpoints({ provider: "mastergst", environment: "sandbox" });
  assert.match(mg.generateUrl, /mastergst\.com.*genewaybill$/);
  assert.equal(mg.authStyle, "nic_token");

  const ct = resolveGspEndpoints({ provider: "cleartax", environment: "production" });
  assert.equal(ct.generateUrl, "https://api.clear.in/einv/v2/eWayBill/generate");
  assert.equal(ct.cancelUrl, "https://api.clear.in/einv/v2/eWayBill/cancel");

  const custom = resolveGspEndpoints({
    provider: "custom",
    customAuthUrl: "https://gsp.example.in/auth/",
    customBaseUrl: "https://gsp.example.in/eway/",
  });
  assert.equal(custom.authUrl, "https://gsp.example.in/auth");
  assert.equal(custom.updateVehicleUrl, "https://gsp.example.in/eway/vehewb");
});

test("validateGspConfigInput checks GSTIN format and required credentials per provider", () => {
  const bad = validateGspConfigInput({
    provider: "mastergst",
    gstin: "INVALID",
    gstUsername: "",
  });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.length >= 4);

  const ok = validateGspConfigInput({
    provider: "mastergst",
    gstin: "27AABCU9603R1ZM",
    gstUsername: "biztrix_api",
    clientId: "cid_123",
    clientSecret: "sec_123",
    gstPassword: "pwd",
  });
  assert.equal(ok.valid, true);

  const okClear = validateGspConfigInput({
    provider: "cleartax",
    gstin: "27AABCU9603R1ZM",
    apiKey: "ct_live_token",
  });
  assert.equal(okClear.valid, true);
});

test("validateInvoiceForLiveEwb and NIC action payload builders enforce required fields", () => {
  const business = {
    name: "Biztrix Solar",
    gstin: "27AABCU9603R1ZM",
    state: "Maharashtra",
    address: "Pune 411001",
    gstMode: "exclusive",
  };
  const invoice = {
    invoiceId: "BS-261114-5001",
    isoDate: "2026-11-14",
    customerName: "Kiran Traders",
    customerAddress: "Nashik 422001",
    items: [{ name: "Panel", hsnCode: "85414011", quantity: 5, price: 12000, gstRate: 18 }],
    totals: { itemTotal: 60000, cgst: 5400, sgst: 5400, igst: 0, finalPayout: 70800 },
    ewayBill: { ...createDefaultEWayDetails({ enabled: true }), vehicleNo: "MH12CD9876" },
  };

  const preflight = validateInvoiceForLiveEwb(invoice, business);
  assert.equal(preflight.valid, true);
  assert.equal(preflight.mergedDetails.fromPincode, "411001");
  assert.equal(preflight.mergedDetails.toPincode, "422001");

  const genPayload = buildNicGeneratePayload(invoice, business);
  assert.equal(genPayload.docNo, "BS-261114-5001");
  assert.equal(genPayload.vehicleNo, "MH12CD9876");

  const vehPayload = buildNicVehicleUpdatePayload({
    ewbNo: "141009912345",
    vehicleNo: "mh 14 xy 4321",
    fromPlace: "Pune",
    fromState: 27,
    reasonCode: "1",
    reasonRem: "Break down",
    transDocNo: "LR-45",
    transDocDate: "2026-11-14",
  });
  assert.equal(vehPayload.ewbNo, 141009912345);
  assert.equal(vehPayload.vehicleNo, "MH14XY4321");
  assert.equal(vehPayload.transDocDate, "14/11/2026");

  const cancelPayload = buildNicCancelEwbPayload({
    ewbNo: "141009912345",
    cancelRsnCode: "2",
    cancelRmrk: "Order cancelled by buyer",
  });
  assert.equal(cancelPayload.ewbNo, 141009912345);
  assert.equal(cancelPayload.cancelRsnCode, 2);
});

test("parseNicGspResponse normalizes MasterGST/NIC success, ClearTax success, and error responses", () => {
  const nicSuccess = parseNicGspResponse({
    status_cd: "1",
    data: {
      ewayBillNo: 181002345678,
      ewayBillDate: "14/11/2026 04:30:00 PM",
      validUpto: "16/11/2026 11:59:00 PM",
    },
  });
  assert.equal(nicSuccess.ok, true);
  assert.equal(nicSuccess.ewbNumber, "181002345678");
  assert.equal(nicSuccess.ewbValidUpto, "16/11/2026 11:59:00 PM");

  const ctSuccess = parseNicGspResponse({
    govt_response: {
      Success: "Y",
      ewbNumber: "191009988776",
      ewbDate: "14/11/2026",
      ewbValidTill: "15/11/2026",
    },
  });
  assert.equal(ctSuccess.ok, true);
  assert.equal(ctSuccess.ewbNumber, "191009988776");

  const failResp = parseNicGspResponse({
    status_cd: "0",
    error: { error_cd: "204", message: "Invalid Vehicle Number" },
  });
  assert.equal(failResp.ok, false);
  assert.equal(failResp.errorCode, "204");
  assert.equal(failResp.errorMessage, "Invalid Vehicle Number");
});

test("getGspIntegrationGuide returns tailored 4-step admin instructions for each GSP provider", () => {
  const providers = ["mastergst", "cleartax", "nic_direct", "custom"] as const;
  for (const provider of providers) {
    const guide = getGspIntegrationGuide(provider);
    assert.equal(guide.steps.length, 4);
    assert.ok(guide.requiredCredentials.length >= 2);
    assert.ok(guide.checklist.length >= 4);
    assert.match(guide.nicPortalUrl, /^https:\/\/ewaybillgst\.gov\.in/);
  }
  assert.match(getGspIntegrationGuide("cleartax").requiredCredentials.join(" "), /Auth Token/i);
  assert.match(getGspIntegrationGuide("custom").requiredCredentials.join(" "), /Custom Auth/i);
});

