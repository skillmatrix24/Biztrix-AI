import * as XLSX from "xlsx";
import { format } from "date-fns";
import { Customer } from "@/lib/mock-db";
import { normalizePhoneNumber } from "@/lib/utils";

export interface CustomerImportRow {
  name: string;
  phone: string;
  normalizedPhone: string;
  email: string;
  businessName: string;
  customerType: "Regular" | "VIP" | "Wholesale" | "Risky" | "B2B";
  address: string;
  state: string;
  gstin: string;
  openingBalance: number;
  notes: string;
  isExisting: boolean;
  existingCustomerId?: string;
  rowNumber: number;
}

export interface CustomerInvalidRow {
  rowNumber: number;
  name?: string;
  phone?: string;
  reason: string;
  raw: Record<string, any>;
}

export interface CustomerParseResult {
  totalRows: number;
  validNew: CustomerImportRow[];
  validExisting: CustomerImportRow[];
  invalid: CustomerInvalidRow[];
  previewRows: CustomerImportRow[];
}

const VALID_TYPES = ["Regular", "VIP", "Wholesale", "Risky", "B2B"] as const;

function normalizeHeaderKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function mapRowData(row: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = {};

  for (const [key, value] of Object.entries(row)) {
    const norm = normalizeHeaderKey(key);

    if (["name", "customername", "fullname", "clientname", "customer"].includes(norm)) {
      mapped.name = value;
    } else if (
      ["phone", "phonenumber", "mobile", "mobilenumber", "contact", "contactnumber", "whatsapp", "whatsappnumber"].includes(norm)
    ) {
      mapped.phone = value;
    } else if (["email", "emailaddress", "emailid"].includes(norm)) {
      mapped.email = value;
    } else if (
      ["businessname", "company", "companyname", "firm", "firmname", "organization", "business"].includes(norm)
    ) {
      mapped.businessName = value;
    } else if (["customertype", "type", "category", "classification", "segment"].includes(norm)) {
      mapped.customerType = value;
    } else if (["address", "deliveryaddress", "billingaddress", "street", "location"].includes(norm)) {
      mapped.address = value;
    } else if (["state", "province", "region"].includes(norm)) {
      mapped.state = value;
    } else if (["gstin", "gst", "gstnumber", "taxid"].includes(norm)) {
      mapped.gstin = value;
    } else if (
      ["openingbalance", "balance", "creditbalance", "udhaar", "initialbalance", "credit"].includes(norm)
    ) {
      mapped.openingBalance = value;
    } else if (["notes", "note", "internalnotes", "remarks", "comment", "comments"].includes(norm)) {
      mapped.notes = value;
    }
  }

  return mapped;
}

/**
 * Parses an Excel binary ArrayBuffer or raw CSV text into validated Customer rows
 */
export function parseCustomerSpreadsheet(
  data: ArrayBuffer | string,
  existingCustomers: Customer[]
): CustomerParseResult {
  let rawRows: Record<string, any>[] = [];

  try {
    if (typeof data === "string") {
      const workbook = XLSX.read(data, { type: "string" });
      const firstSheetName = workbook.SheetNames[0];
      if (firstSheetName) {
        rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[firstSheetName], { defval: "" });
      }
    } else {
      const workbook = XLSX.read(new Uint8Array(data), { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (firstSheetName) {
        rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[firstSheetName], { defval: "" });
      }
    }
  } catch (err) {
    console.error("Error reading spreadsheet with XLSX:", err);
    return {
      totalRows: 0,
      validNew: [],
      validExisting: [],
      invalid: [{ rowNumber: 1, reason: "Unable to parse file. Please verify file format.", raw: {} }],
      previewRows: [],
    };
  }

  // Build quick map of existing customer phone numbers
  const existingPhoneMap = new Map<string, Customer>();
  existingCustomers.forEach((c) => {
    if (c.phone) {
      const clean = normalizePhoneNumber(c.phone);
      if (clean) existingPhoneMap.set(clean, c);
    }
  });

  const validNew: CustomerImportRow[] = [];
  const validExisting: CustomerImportRow[] = [];
  const invalid: CustomerInvalidRow[] = [];

  // Track phones inside the current import batch to prevent duplicates inside the batch
  const seenBatchPhones = new Set<string>();

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-indexed including header
    const mapped = mapRowData(row);

    const name = String(mapped.name ?? "").trim();
    const rawPhone = String(mapped.phone ?? "").trim();

    if (!name && !rawPhone) {
      // Empty row, ignore
      return;
    }

    if (!name) {
      invalid.push({
        rowNumber: rowNum,
        phone: rawPhone,
        reason: "Customer name is missing.",
        raw: row,
      });
      return;
    }

    const cleanPhone = normalizePhoneNumber(rawPhone);
    if (!cleanPhone || cleanPhone.length < 10) {
      invalid.push({
        rowNumber: rowNum,
        name,
        phone: rawPhone,
        reason: "Valid 10-digit mobile phone number is required.",
        raw: row,
      });
      return;
    }

    if (seenBatchPhones.has(cleanPhone)) {
      invalid.push({
        rowNumber: rowNum,
        name,
        phone: rawPhone,
        reason: "Duplicate phone number found in this import batch.",
        raw: row,
      });
      return;
    }
    seenBatchPhones.add(cleanPhone);

    // Normalize customer type
    let customerType: "Regular" | "VIP" | "Wholesale" | "Risky" | "B2B" = "Regular";
    const rawType = String(mapped.customerType ?? "").trim();
    const matchedType = VALID_TYPES.find((t) => t.toLowerCase() === rawType.toLowerCase());
    if (matchedType) {
      customerType = matchedType;
    }

    const email = String(mapped.email ?? "").trim();
    const businessName = String(mapped.businessName ?? "").trim();
    const address = String(mapped.address ?? "").trim();
    const state = String(mapped.state ?? "").trim() || "Maharashtra";
    const gstin = String(mapped.gstin ?? "").trim().toUpperCase();
    const notes = String(mapped.notes ?? "").trim();

    const parsedBalance = parseFloat(String(mapped.openingBalance ?? "0").replace(/[^0-9.-]/g, ""));
    const openingBalance = isNaN(parsedBalance) ? 0 : parsedBalance;

    const existingMatch = existingPhoneMap.get(cleanPhone);

    const parsedRow: CustomerImportRow = {
      name,
      phone: rawPhone.length === 10 ? rawPhone : cleanPhone,
      normalizedPhone: cleanPhone,
      email,
      businessName,
      customerType,
      address,
      state,
      gstin,
      openingBalance,
      notes,
      isExisting: Boolean(existingMatch),
      existingCustomerId: existingMatch?.id,
      rowNumber: rowNum,
    };

    if (existingMatch) {
      validExisting.push(parsedRow);
    } else {
      validNew.push(parsedRow);
    }
  });

  const previewRows = [...validNew, ...validExisting].slice(0, 5);

  return {
    totalRows: validNew.length + validExisting.length + invalid.length,
    validNew,
    validExisting,
    invalid,
    previewRows,
  };
}

/**
 * Downloads a sample Excel file (.xlsx) with pre-filled sample customers
 */
export function downloadCustomerSampleExcel(): void {
  const sampleHeaders = [
    "Customer Name",
    "Mobile Phone",
    "Email Address",
    "Company / Business Name",
    "Customer Type",
    "Address",
    "State",
    "GSTIN",
    "Opening Balance",
    "Internal Notes",
  ];

  const sampleRows = [
    [
      "Rahul Sharma",
      "9876543210",
      "rahul.sharma@example.com",
      "Sharma Traders",
      "Regular",
      "Shop 14, MG Road Market, Pune",
      "Maharashtra",
      "27AABCU9603R1ZN",
      "0",
      "Prompt payer, preferred delivery morning 10 AM",
    ],
    [
      "Priya Patel",
      "9823456789",
      "priya@patelenterprises.com",
      "Patel Enterprises",
      "VIP",
      "Plot 42, GIDC Industrial Estate, Surat",
      "Gujarat",
      "24AAACP1234Q1Z5",
      "15000",
      "Key account. High volume repeat orders.",
    ],
    [
      "Vikram Malhotra",
      "9911223344",
      "vikram@malhotratech.in",
      "Malhotra Hardware & Tools",
      "Wholesale",
      "88 Bada Bazar, Chandni Chowk, Delhi",
      "Delhi",
      "07AABCM5678R1ZX",
      "50000",
      "30-day net credit agreement.",
    ],
    [
      "Sunita Deshmukh",
      "9765432109",
      "sunita.d@gmail.com",
      "",
      "Regular",
      "Flat 402, Green Acres, Baner, Pune",
      "Maharashtra",
      "",
      "0",
      "Walk-in residential customer.",
    ],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([sampleHeaders, ...sampleRows]);

  // Set column widths for readability
  worksheet["!cols"] = [
    { wch: 22 }, // Customer Name
    { wch: 16 }, // Mobile Phone
    { wch: 26 }, // Email
    { wch: 24 }, // Company
    { wch: 15 }, // Customer Type
    { wch: 35 }, // Address
    { wch: 18 }, // State
    { wch: 20 }, // GSTIN
    { wch: 16 }, // Opening Balance
    { wch: 40 }, // Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

  XLSX.writeFile(workbook, "customers_sample_template.xlsx");
}

/**
 * Downloads a sample CSV file (.csv)
 */
export function downloadCustomerSampleCsv(): void {
  const csvContent = [
    "Customer Name,Mobile Phone,Email Address,Company / Business Name,Customer Type,Address,State,GSTIN,Opening Balance,Internal Notes",
    '"Rahul Sharma","9876543210","rahul.sharma@example.com","Sharma Traders","Regular","Shop 14, MG Road Market, Pune","Maharashtra","27AABCU9603R1ZN",0,"Prompt payer, preferred delivery morning"',
    '"Priya Patel","9823456789","priya@patelenterprises.com","Patel Enterprises","VIP","Plot 42, GIDC Industrial Estate, Surat","Gujarat","24AAACP1234Q1Z5",15000,"Key account. High volume repeat orders."',
    '"Vikram Malhotra","9911223344","vikram@malhotratech.in","Malhotra Hardware & Tools","Wholesale","88 Bada Bazar, Delhi","Delhi","07AABCM5678R1ZX",50000,"30-day net credit agreement."',
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "customers_sample_template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports customers list to an Excel (.xlsx) workbook
 */
export function exportCustomersToExcel(params: {
  customers: Customer[];
  ordersByCustomer?: Map<string, any>;
  businessName?: string;
  currencySymbol?: string;
}): void {
  const { customers, ordersByCustomer, businessName = "Biztrix", currencySymbol = "₹" } = params;
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const headers = [
    "Customer ID",
    "Customer Name",
    "Mobile Phone",
    "Email Address",
    "Company / Business Name",
    "Classification",
    "Address",
    "State",
    "GSTIN",
    `Outstanding Balance (${currencySymbol})`,
    "Total Orders",
    `Total Paid (${currencySymbol})`,
    "Last Order Date",
    "Loyalty Tier",
    "Reward Points",
    "Internal Notes",
    "Created Date",
  ];

  const rows = customers.map((c) => {
    const cleanPhone = c.phone ? normalizePhoneNumber(c.phone) : null;
    const byId = ordersByCustomer?.get(c.id);
    const byPhone = cleanPhone ? ordersByCustomer?.get(`phone_${cleanPhone}`) : null;

    const totalOrders = Math.max(byId?.totalOrders || 0, byPhone?.totalOrders || 0);
    const totalSpent = Math.max(byId?.totalSpent || 0, byPhone?.totalSpent || 0);
    const lastOrderDate = byId?.lastOrderDate || byPhone?.lastOrderDate || c.lastOrderDate || "";

    const createdDate = c.createdAt
      ? typeof (c.createdAt as any)?.toDate === "function"
        ? format((c.createdAt as any).toDate(), "yyyy-MM-dd")
        : String(c.createdAt).slice(0, 10)
      : "";

    return [
      c.id,
      c.name || "",
      c.phone || "",
      c.email || "",
      c.businessName || "",
      c.customerType || "Regular",
      c.address || "",
      c.state || "",
      c.gstin || "",
      Number(c.creditBalance || 0),
      totalOrders,
      totalSpent,
      lastOrderDate ? String(lastOrderDate).slice(0, 10) : "",
      c.loyaltyTier || "Standard",
      Number(c.rewardPoints || 0),
      c.notes || "",
      createdDate,
    ];
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  worksheet["!cols"] = [
    { wch: 18 }, // Customer ID
    { wch: 22 }, // Customer Name
    { wch: 16 }, // Mobile Phone
    { wch: 24 }, // Email Address
    { wch: 24 }, // Company
    { wch: 16 }, // Classification
    { wch: 32 }, // Address
    { wch: 16 }, // State
    { wch: 18 }, // GSTIN
    { wch: 18 }, // Outstanding Balance
    { wch: 14 }, // Total Orders
    { wch: 16 }, // Total Paid
    { wch: 16 }, // Last Order Date
    { wch: 14 }, // Loyalty Tier
    { wch: 14 }, // Reward Points
    { wch: 30 }, // Internal Notes
    { wch: 14 }, // Created Date
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

  const safeName = businessName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  XLSX.writeFile(workbook, `customers_${safeName}_${todayStr}.xlsx`);
}

/**
 * Exports customers list to a CSV file
 */
export function exportCustomersToCsv(params: {
  customers: Customer[];
  ordersByCustomer?: Map<string, any>;
  businessName?: string;
  currencySymbol?: string;
}): void {
  const { customers, ordersByCustomer, businessName = "Biztrix", currencySymbol = "₹" } = params;
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const headers = [
    "Customer ID",
    "Customer Name",
    "Mobile Phone",
    "Email Address",
    "Company / Business Name",
    "Classification",
    "Address",
    "State",
    "GSTIN",
    `Outstanding Balance (${currencySymbol})`,
    "Total Orders",
    `Total Paid (${currencySymbol})`,
    "Last Order Date",
    "Loyalty Tier",
    "Reward Points",
    "Internal Notes",
    "Created Date",
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const csvRows = [headers.map(escapeCsv).join(",")];

  customers.forEach((c) => {
    const cleanPhone = c.phone ? normalizePhoneNumber(c.phone) : null;
    const byId = ordersByCustomer?.get(c.id);
    const byPhone = cleanPhone ? ordersByCustomer?.get(`phone_${cleanPhone}`) : null;

    const totalOrders = Math.max(byId?.totalOrders || 0, byPhone?.totalOrders || 0);
    const totalSpent = Math.max(byId?.totalSpent || 0, byPhone?.totalSpent || 0);
    const lastOrderDate = byId?.lastOrderDate || byPhone?.lastOrderDate || c.lastOrderDate || "";

    const createdDate = c.createdAt
      ? typeof (c.createdAt as any)?.toDate === "function"
        ? format((c.createdAt as any).toDate(), "yyyy-MM-dd")
        : String(c.createdAt).slice(0, 10)
      : "";

    const row = [
      c.id,
      c.name || "",
      c.phone || "",
      c.email || "",
      c.businessName || "",
      c.customerType || "Regular",
      c.address || "",
      c.state || "",
      c.gstin || "",
      Number(c.creditBalance || 0),
      totalOrders,
      totalSpent,
      lastOrderDate ? String(lastOrderDate).slice(0, 10) : "",
      c.loyaltyTier || "Standard",
      Number(c.rewardPoints || 0),
      c.notes || "",
      createdDate,
    ];

    csvRows.push(row.map(escapeCsv).join(","));
  });

  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeName = businessName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  link.download = `customers_${safeName}_${todayStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
