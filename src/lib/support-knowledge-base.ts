/**
 * Support Knowledge Base & Agent SOP Engine for Biztrix AI
 *
 * Integrates with platform-blueprint.ts to provide:
 * 1. Page-by-page frontend customer flows
 * 2. Common customer issues and symptoms
 * 3. Step-by-step Agent SOP (Standard Operating Procedures)
 * 4. Canned WhatsApp/SMS scripts ready to send with 1-click
 * 5. Instant search across all modules, errors, and keywords
 */

export interface SupportIssueSOP {
  id: string;
  symptom: string;
  symptomHindi: string;
  rootCause: string;
  agentSteps: string[];
  customerScript: string;
  settingsPath?: string;
  tags: string[];
  severity: "low" | "medium" | "high" | "critical";
}

export interface SupportPageGuide {
  id: string;
  title: string;
  group: string;
  route: string;
  iconName: string;
  summary: string;
  summaryHindi: string;
  customerJourney: string[];
  keyFrontendControls: { label: string; actionDescription: string }[];
  commonIssues: SupportIssueSOP[];
  relatedPages: { label: string; route: string }[];
  searchKeywords: string[];
}

export const SUPPORT_KNOWLEDGE_BASE: SupportPageGuide[] = [
  {
    id: "billing_pos",
    title: "Billing (POS) Counter Checkout",
    group: "Sales & Billing",
    route: "/billing",
    iconName: "Receipt",
    summary: "Instant retail POS billing with barcode scanner, split payments, and thermal receipts.",
    summaryHindi: "Dukaan counter par tezi se bill banane, barcode scan karne, aur thermal print nikalne ke liye.",
    customerJourney: [
      "Customer counter par aata hai aur items select karta hai.",
      "Cashier barcode scan karta hai ya product name search karke add karta hai.",
      "Customer phone number enter karke existing loyalty points ya discount apply kiya jata hai.",
      "Payment method select hota hai (Cash, UPI QR, Card, ya Split).",
      "Instant 'Pay & Print' button daba kar thermal receipt nikali jati hai ya WhatsApp bill bheja jata hai."
    ],
    keyFrontendControls: [
      { label: "Barcode Input Box", actionDescription: "Press F2 or barcode scanner trigger to auto-focus and add SKU." },
      { label: "Customer Phone Tag", actionDescription: "Enter 10-digit phone to auto-fetch past name, ledger, and loyalty points." },
      { label: "Dynamic UPI QR", actionDescription: "Shows instant BharatQR on screen with exact invoice amount." },
      { label: "Split Payment Toggle", actionDescription: "Allows paying part in Cash and remaining balance via Online/UPI." },
      { label: "Print Receipt Button", actionDescription: "Sends formatted ESC/POS thermal payload to configured printer." }
    ],
    commonIssues: [
      {
        id: "pos_printer_blank",
        symptom: "Thermal printer blank paper ejects or text is cut off on sides",
        symptomHindi: "Thermal printer se blank panna nikal raha hai ya side se text kat raha hai",
        rootCause: "Printer paper width mismatch (58mm vs 80mm) or incorrect USB/Bluetooth driver paper size in browser print dialog.",
        agentSteps: [
          "Ask customer to check their paper roll: 2-inch (58mm) or 3-inch (80mm).",
          "Instruct user to navigate to: Settings -> Hardware & Print Settings.",
          "Select the exact paper size (e.g. 80mm Thermal Receipt).",
          "In Chrome Print Dialog, make sure Margins are set to 'None' and Scale is 'Default'."
        ],
        customerScript: "Namaste {customer_name}! Aapke thermal printer me paper width 80mm select karni hogi. Kripya Biztrix me Settings > Hardware me jaakar Paper Size 80mm select karein aur print dialog me Margin 'None' karein. Fir bhi dikkat aaye toh batayein.",
        settingsPath: "/settings",
        tags: ["printer", "thermal", "print", "blank", "receipt", "hardware", "58mm", "80mm"],
        severity: "medium"
      },
      {
        id: "pos_upi_qr_mismatch",
        symptom: "Customer scans UPI QR but sees wrong merchant name or payment fails",
        symptomHindi: "UPI QR scan karne par dukaan ka naam galat aa raha hai ya payment nahi ho rahi",
        rootCause: "Merchant VPA (UPI ID) configured in Settings -> Payment Gateways is invalid or inactive.",
        agentSteps: [
          "Ask customer to verify their bank UPI ID (e.g. merchant@icici / 9876543210@paytm).",
          "Guide user to: Settings -> Payment Gateway Configs.",
          "Update Merchant UPI VPA and save changes.",
          "Generate a test bill of Rs. 1 to verify scanner name."
        ],
        customerScript: "Aapke POS QR code ka UPI ID update karna hoga. Settings > Payment Gateways me jakar apna verified UPI ID (jaise yourname@upi) verify karke Save karein. Iske baad QR code sahi naam se scan hoga.",
        settingsPath: "/settings",
        tags: ["upi", "qr", "payment", "vpa", "scanner", "pos"],
        severity: "high"
      },
      {
        id: "pos_stock_not_deducting",
        symptom: "POS bill made successfully but product stock count did not reduce",
        symptomHindi: "Bill ban gaya par product ka stock kam nahi hua",
        rootCause: "Product in Inventory is marked with 'Track Inventory: Disabled' or draft transaction sync.",
        agentSteps: [
          "Check product master in /inventory.",
          "Ensure 'Track Inventory' toggle is enabled on the product.",
          "If billing was completed offline, check if browser was reconnected so offline sync completes."
        ],
        customerScript: "Kripya Inventory me jakar us item par edit click karein aur check karein ki 'Track Inventory' toggle ON hai ya nahi. Track Inventory ON hone par har bill ke sath stock automatically ghat jata hai.",
        settingsPath: "/inventory",
        tags: ["stock", "inventory", "pos", "deduct", "count"],
        severity: "medium"
      }
    ],
    relatedPages: [
      { label: "Invoices Ledger", route: "/invoices" },
      { label: "Inventory Stock", route: "/inventory" },
      { label: "Hardware Settings", route: "/settings" }
    ],
    searchKeywords: ["billing", "pos", "counter", "bill", "thermal", "printer", "barcode", "upi", "qr", "cash", "discount", "receipt"]
  },
  {
    id: "invoices_b2b",
    title: "Invoices, Receipts & E-Way Bills",
    group: "Sales & Billing",
    route: "/invoices",
    iconName: "FileText",
    summary: "B2B/B2C GST-compliant tax invoices, PDF downloads, and E-Way bill generation.",
    summaryHindi: "B2B aur B2C GST tax invoice banane, PDF download karne, aur E-Way bill generate karne ke liye.",
    customerJourney: [
      "User opens /invoices and clicks 'Create New Invoice'.",
      "Selects buyer party (auto-populates GSTIN and billing address).",
      "Adds line items with HSN/SAC codes, quantities, and GST rates.",
      "System auto-calculates Subtotal, CGST/SGST (intra-state) or IGST (inter-state), and Round-off.",
      "Clicks 'Save & Generate Invoice'; can download PDF, share WhatsApp link, or generate E-Way bill."
    ],
    keyFrontendControls: [
      { label: "Buyer GSTIN Auto-Fill", actionDescription: "Fetches legal trade name and registered address via GSTIN." },
      { label: "State of Supply Toggle", actionDescription: "Switches tax computation between intra-state (CGST+SGST) and inter-state (IGST)." },
      { label: "E-Way Bill Action Button", actionDescription: "Prepares compliant transporter JSON / summary for bills > Rs. 50,000." },
      { label: "WhatsApp Invoice Dispatch", actionDescription: "Sends direct wa.me link with invoice number, amount, and secure PDF link." }
    ],
    commonIssues: [
      {
        id: "inv_igst_cgst_confusion",
        symptom: "IGST is applied instead of CGST/SGST (or vice versa)",
        symptomHindi: "IGST lag raha hai jabki CGST/SGST lagna chahiye (ya ulta)",
        rootCause: "Buyer party's State code differs from Seller Business State in profile settings.",
        agentSteps: [
          "Check Seller State under Settings -> Business Profile.",
          "Check Customer/Buyer State in Customers -> Edit Customer.",
          "If both states are the same (e.g. Rajasthan to Rajasthan), CGST + SGST will apply.",
          "If different (e.g. Rajasthan to Maharashtra), IGST will apply automatically."
        ],
        customerScript: "Namaste {customer_name}! GST niyam ke anusar: Agar buyer aur seller ka state ek hi hai toh CGST+SGST lagta hai, aur dusre state me IGST. Kripya customer profile me State check karein ki sahi select hai ya nahi.",
        settingsPath: "/settings",
        tags: ["gst", "igst", "cgst", "sgst", "state", "tax", "invoice"],
        severity: "medium"
      },
      {
        id: "inv_pdf_download_fails",
        symptom: "Clicking 'Download PDF' shows loading spinner but file does not download",
        symptomHindi: "Download PDF click karne par file download nahi ho rahi",
        rootCause: "Browser pop-up blocker is preventing blob download, or unstable internet connection.",
        agentSteps: [
          "Check if browser URL bar has a blocked pop-up icon.",
          "Guide customer to allow pop-ups for Biztrix site.",
          "Alternatively, click 'Print' or 'Share WhatsApp' to send PDF link directly to customer phone."
        ],
        customerScript: "Aapke browser ne download pop-up ko block kiya ho sakta hai. URL bar me right side me Pop-up Blocked icon par click karke 'Always allow' karein, ya fir Invoice par Print button dabakar 'Save as PDF' kar lein.",
        settingsPath: "/invoices",
        tags: ["pdf", "download", "invoice", "print", "popup"],
        severity: "low"
      },
      {
        id: "inv_eway_mandatory_fields",
        symptom: "E-Way bill button shows 'Missing Transporter / Vehicle Details'",
        symptomHindi: "E-Way bill generate karne par transporter ya gaadi number missing ka error aata hai",
        rootCause: "Government e-way bill rules require Distance (KM), Transporter ID, or Vehicle Number for consignments above Rs. 50,000.",
        agentSteps: [
          "Open the target invoice.",
          "Click 'E-Way Bill Details' section.",
          "Enter approx transport distance in KM and vehicle number (e.g. RJ14AB1234).",
          "Click Save to generate the E-Way bill manifest."
        ],
        customerScript: "E-Way bill banane ke liye 50,000 se upar ke bill par gaadi number (Vehicle No) ya Transporter ID aur approx Distance (KM) bharna anivarya hota hai. Invoice me 'E-Way Bill Details' me gaadi number enter karke submit karein.",
        settingsPath: "/invoices",
        tags: ["eway", "transport", "vehicle", "gst", "consignment", "b2b"],
        severity: "high"
      }
    ],
    relatedPages: [
      { label: "GST Accounting Ledger", route: "/accounting/gst" },
      { label: "Customer Master", route: "/customers" },
      { label: "Quotations", route: "/quotations" }
    ],
    searchKeywords: ["invoice", "tax", "gst", "b2b", "b2c", "eway", "pdf", "cgst", "sgst", "igst", "hsn", "credit note", "receipt"]
  },
  {
    id: "inventory_management",
    title: "Inventory, Stock Adjustments & Low Stock",
    group: "Operations & Stock",
    route: "/inventory",
    iconName: "Package",
    summary: "Track stock counts, batch numbers, cost/sale prices, and automatic low-stock reorder warnings.",
    summaryHindi: "Dukaan ka stock track karne, naye item jodne, aur maal khatam hone ke alert dekhne ke liye.",
    customerJourney: [
      "User opens /inventory to see current stock on hand and valuation.",
      "Clicks 'Add Product' to enter Item Name, SKU/Barcode, Cost, Price, and Tax rate.",
      "Performs 'Stock In' when fresh shipment arrives from supplier.",
      "System automatically deducts quantity on every POS bill or Invoice.",
      "Low stock badge shows when stock falls below minimum threshold."
    ],
    keyFrontendControls: [
      { label: "Quick Stock In (+)", actionDescription: "Instantly adds shipment units to existing on-hand stock." },
      { label: "Stock Adjustment (-)", actionDescription: "Records wastage, expired items, or damaged stock with reason." },
      { label: "Low Stock Filter Pill", actionDescription: "Filters products at or below their reorder threshold." },
      { label: "Barcode Generator", actionDescription: "Prints barcode sticker labels for retail packaging." }
    ],
    commonIssues: [
      {
        id: "inv_negative_stock_error",
        symptom: "Cannot save bill or transaction: 'Negative stock not permitted'",
        symptomHindi: "Bill save nahi ho raha: Negative stock allow nahi hai ka error aa raha hai",
        rootCause: "Database security integrity rule prevents selling more units than currently recorded in stock.",
        agentSteps: [
          "Inform customer that Biztrix prevents negative stock to protect accounting integrity.",
          "Ask customer to do a quick 'Stock In' in /inventory with the physical quantity present in shop.",
          "Once stock is updated, retry the bill."
        ],
        customerScript: "Namaste! Hamare system me negative stock allow nahi hai taaki hisaab-kitab galat na ho. Kripya pehle /inventory me jakar us item par '+' (Stock In) karke quantity daal lein, fir bill turant ban jayega.",
        settingsPath: "/inventory",
        tags: ["stock", "negative", "inventory", "quantity", "stock-in"],
        severity: "high"
      },
      {
        id: "inv_bulk_upload_csv",
        symptom: "CSV bulk upload fails or columns are mismatched",
        symptomHindi: "Excel/CSV se product upload karne par error aa raha hai",
        rootCause: "Column headers in uploaded CSV do not match standard template format.",
        agentSteps: [
          "Instruct customer to download the 'Sample CSV Template' from the import dialog.",
          "Ensure mandatory columns (name, price, stock) are filled without special currency characters.",
          "Re-upload in UTF-8 format."
        ],
        customerScript: "Kripya upload dialog me 'Download Sample CSV' par click karein aur usi format me apne product copy karein. Currency symbol (Rs/₹) mat likhein, sirf number likhein. Fir upload karein.",
        settingsPath: "/inventory",
        tags: ["csv", "excel", "bulk", "upload", "import", "products"],
        severity: "medium"
      }
    ],
    relatedPages: [
      { label: "Billing POS", route: "/billing" },
      { label: "Vendors & Purchases", route: "/vendors" }
    ],
    searchKeywords: ["inventory", "stock", "sku", "barcode", "products", "low stock", "cost price", "valuation", "stock in"]
  },
  {
    id: "crm_leads",
    title: "Sales CRM & Lead Pipeline",
    group: "CRM & Leads",
    route: "/leads",
    iconName: "UserCheck",
    summary: "Capture inquiries, track lead stages from New to Won, and schedule follow-up reminders.",
    summaryHindi: "Customer ki inquiry manage karne, follow-up lene, aur lead ko customer me convert karne ke liye.",
    customerJourney: [
      "New inquiry comes from Website storefront, WhatsApp bot, or manual entry.",
      "Agent views lead in /leads Kanban or List view.",
      "Updates stage: New -> Contacted -> Qualified -> Proposal Sent -> Won / Lost.",
      "Adds follow-up notes and sets date reminder.",
      "On winning deal, 1-click converts Lead into permanent Customer and drafts invoice."
    ],
    keyFrontendControls: [
      { label: "Add Lead Dialog", actionDescription: "Quickly captures contact name, phone, budget, and source." },
      { label: "Kanban Drag-and-Drop", actionDescription: "Moves lead between sales stages visually." },
      { label: "WhatsApp Chat Action", actionDescription: "Opens direct WhatsApp conversation with personalized greeting." },
      { label: "Convert to Customer", actionDescription: "Creates profile in Customer master and closes the lead." }
    ],
    commonIssues: [
      {
        id: "crm_lead_not_visible_staff",
        symptom: "Staff member cannot see leads assigned to other team members",
        symptomHindi: "Staff member ko doosron ki leads nahi dikh rahi hain",
        rootCause: "Role-based access control (RBAC) policy restricts staff to their own assigned leads.",
        agentSteps: [
          "Check user role in Settings -> Team.",
          "If user needs to see all business leads, upgrade their role to 'Manager' or 'Admin'.",
          "Alternatively, go to Settings -> Operational Access and enable 'View All CRM Leads'."
        ],
        customerScript: "Staff level ke users ko privacy ke liye sirf unki apni assigned leads dikhti hain. Agar unhe sabhi leads dikhani hain toh Business Admin / Manager role assign karein ya Settings > Roles me jakar permission update karein.",
        settingsPath: "/team",
        tags: ["crm", "leads", "permission", "staff", "role", "visibility"],
        severity: "low"
      }
    ],
    relatedPages: [
      { label: "Customer Master", route: "/customers" },
      { label: "WhatsApp Automation", route: "/whatsapp-automation/chat" }
    ],
    searchKeywords: ["crm", "leads", "pipeline", "inquiry", "followup", "sales", "prospects", "deal"]
  },
  {
    id: "attendance_payroll",
    title: "Staff Attendance & Daily Entries",
    group: "Team & HR",
    route: "/attendance",
    iconName: "BookOpenText",
    summary: "Mark daily staff presence (Present, Half-Day, Absent, OT) and record immediate cash wage advances.",
    summaryHindi: "Staff ki daily hajri lagane (Present, Half-Day, OT) aur roj ke daily karcha/advance hisaab ke liye.",
    customerJourney: [
      "User opens /attendance at the start or end of workday.",
      "Clicks status on staff cards: Present (Full Day), Half Day, Absent, or Leave.",
      "Enters overtime hours or allowance if applicable.",
      "If worker takes cash advance today, clicks 'Pay Today' to record cash payment.",
      "Monthly wage ledger updates automatically without double-counting."
    ],
    keyFrontendControls: [
      { label: "Present / Half-Day / Absent Toggles", actionDescription: "1-tap attendance marking with instant wage accrual calculation." },
      { label: "OT / Allowance Input", actionDescription: "Adds hourly overtime earnings to staff's daily accrual." },
      { label: "Pay Today Action", actionDescription: "Records standalone cash advance and links to business Cashbook." },
      { label: "Calendar Date Navigator", actionDescription: "Allows navigating to previous dates to correct back-dated attendance." }
    ],
    commonIssues: [
      {
        id: "att_ot_on_unmarked",
        symptom: "Cannot add Overtime / Allowance on a staff member: 'Please mark status first'",
        symptomHindi: "OT ya allowance add nahi ho raha: Pehle Present ya Half Day select karne ko bolta hai",
        rootCause: "System prevents adding overtime on Absent or unmarked employees for payroll integrity.",
        agentSteps: [
          "Instruct customer to first click 'Present' or 'Half Day' for that worker.",
          "Once marked present, enter the Overtime hours.",
          "The system will calculate regular wage + overtime wage accurately."
        ],
        customerScript: "Overtime add karne ke liye pehle worker ko 'Present' ya 'Half Day' mark karna anivarya hai. Absent worker par OT nahi lag sakta. Pehle Present mark karein, fir OT hours daalein.",
        settingsPath: "/attendance",
        tags: ["attendance", "ot", "overtime", "payroll", "staff", "present"],
        severity: "low"
      },
      {
        id: "att_double_counting_wages",
        symptom: "Customer thinks daily earnings and cash paid are double counting in summary",
        symptomHindi: "Customer ko lagta hai salary aur cash paid do baar jod raha hai",
        rootCause: "Customer confusing 'Accrued Wages' (money earned by worker) with 'Cash Paid' (money handed over in cash).",
        agentSteps: [
          "Explain the difference to customer: 'Earned' is what worker worked for; 'Paid' is what was physically paid.",
          "Remaining balance = Earned minus Paid.",
          "Show them the Net Balance column in /team payroll tab."
        ],
        customerScript: "Daily stats me 'Earned Wages' ka matlab hai kitna kaam hua, aur 'Cash Paid' ka matlab hai kitna paisa cash diya gaya. Net salary hamesha (Earned - Paid) calculate hoti hai, koi double counting nahi hoti.",
        settingsPath: "/team",
        tags: ["payroll", "wage", "double-counting", "salary", "attendance"],
        severity: "low"
      }
    ],
    relatedPages: [
      { label: "Team Directory & Payroll", route: "/team" },
      { label: "Cashbook Entries", route: "/daily-entries" }
    ],
    searchKeywords: ["attendance", "staff", "salary", "overtime", "wages", "hajri", "half day", "daily entries", "advance"]
  },
  {
    id: "online_storefront",
    title: "Online Storefront Designer & Catalog",
    group: "Store & Funnels",
    route: "/website",
    iconName: "Globe",
    summary: "Visual store designer, custom store slug, banner customization, and WhatsApp direct ordering.",
    summaryHindi: "Apni online dukaan ka design banane, photo lagane, aur WhatsApp ordering chalu karne ke liye.",
    customerJourney: [
      "User opens /website visual designer.",
      "Chooses store name, slug (e.g. biztrix.in/store/mybrand), and contact phone.",
      "Customizes Hero Banner, Announcement bar, and Category layout.",
      "Toggles products from Inventory to appear on live storefront.",
      "Publishes store and shares link on social media and WhatsApp."
    ],
    keyFrontendControls: [
      { label: "Website Status Toggle", actionDescription: "Toggles store between 'Draft' and 'Published' live status." },
      { label: "Store Slug Input", actionDescription: "Configures clean SEO-friendly public store URL." },
      { label: "WhatsApp Order Button Setup", actionDescription: "Directs customer shopping cart straight to merchant's WhatsApp." },
      { label: "Section Reorder Handles", actionDescription: "Drag and drop to rearrange banners, grids, and customer reviews." }
    ],
    commonIssues: [
      {
        id: "web_store_shows_draft",
        symptom: "Public store link shows 'Store Under Maintenance' or 'Draft'",
        symptomHindi: "Website link kholne par 'Store Draft' ya 'Under Maintenance' dikha raha hai",
        rootCause: "Website status toggle in /website is set to 'Draft' instead of 'Published'.",
        agentSteps: [
          "Guide user to: Online Store -> /website.",
          "Check top right toggle 'Website Status'.",
          "Flip it to 'Published' and click 'Save Changes'.",
          "Refresh public store link in incognito tab."
        ],
        customerScript: "Aapka store abhi 'Draft' mode me save hai. Kripya /website me jakar top-right me 'Website Status' ko 'Published' karein aur Save karein. Iske baad aapki website live ho jayegi.",
        settingsPath: "/website",
        tags: ["website", "store", "draft", "published", "404", "maintenance", "slug"],
        severity: "medium"
      },
      {
        id: "web_products_not_showing",
        symptom: "Added new product in inventory but it does not appear on the website catalog",
        symptomHindi: "Naya product inventory me daala par website par show nahi ho raha",
        rootCause: "Product master has 'Show on Website' toggle set to OFF or stock is 0 with out-of-stock hiding enabled.",
        agentSteps: [
          "Open /inventory and click Edit on the missing product.",
          "Enable 'Show on Website' toggle.",
          "Verify the product has a category assigned and image uploaded.",
          "Save product."
        ],
        customerScript: "Product ko website par dikhane ke liye /inventory me us product par edit click karein aur 'Show on Website' ka switch ON karein. Iske sath hi ek product photo zaroor upload karein.",
        settingsPath: "/inventory",
        tags: ["products", "catalog", "website", "inventory", "missing"],
        severity: "low"
      }
    ],
    relatedPages: [
      { label: "Inventory Products", route: "/inventory" },
      { label: "Sales Funnels", route: "/funnel" }
    ],
    searchKeywords: ["website", "storefront", "online store", "catalog", "e-commerce", "domain", "slug", "banner", "cart", "orders"]
  },
  {
    id: "whatsapp_automation_hub",
    title: "WhatsApp Automation & Meta Cloud API",
    group: "WhatsApp & Marketing",
    route: "/whatsapp-automation",
    iconName: "SmartphoneNfc",
    summary: "Meta WhatsApp Cloud API integration, broadcast campaigns, template syncing, and auto-responders.",
    summaryHindi: "Meta WhatsApp API connect karne, automatic message bhejane, aur broadcast campaign chalane ke liye.",
    customerJourney: [
      "User opens /whatsapp-automation/config to link Meta WABA ID, Phone ID, and System User Token.",
      "Verifies connection to fetch green 'Connected' badge.",
      "Syncs approved WhatsApp message templates from Meta Business Manager.",
      "Sets up automated keyword triggers (e.g. 'MENU' sends catalog, 'BILL' sends invoice).",
      "Launches broadcast campaign to customer contact lists."
    ],
    keyFrontendControls: [
      { label: "Meta API Connection Card", actionDescription: "Enters Phone Number ID, WABA ID, and permanent System User Access Token." },
      { label: "Sync Templates Action", actionDescription: "Fetches live approved templates directly from Meta Graph API v21." },
      { label: "Keyword Auto-Responder", actionDescription: "Maps incoming customer keywords to automated text or interactive buttons." },
      { label: "Campaign Dispatcher", actionDescription: "Broadcasts personalized WhatsApp template with variable mapping to contact tags." }
    ],
    commonIssues: [
      {
        id: "wa_token_expired_190",
        symptom: "Sending fails with 'Error 190: Access token has expired' or 'Error 131030'",
        symptomHindi: "WhatsApp message send nahi ho raha: Token expired ka error aa raha hai",
        rootCause: "User used a temporary 24-hour developer token instead of a permanent System User Token from Meta Business Manager.",
        agentSteps: [
          "Instruct customer that Meta requires a permanent 'System User' token.",
          "Guide user to Meta Business Suite -> System Users.",
          "Generate token with 'whatsapp_business_messaging' and 'whatsapp_business_management' permissions.",
          "Paste new token in /whatsapp-automation/config and click Save."
        ],
        customerScript: "Namaste! Meta Graph API ka 24-ghante wala temporary token expire ho gaya hai. Aapko Meta Business Manager me jakar System User ka permanent token generate karke /whatsapp-automation/config me paste karna hoga. Hamari team help kar sakti hai.",
        settingsPath: "/whatsapp-automation/config",
        tags: ["whatsapp", "meta", "token", "error 190", "expired", "waba", "api"],
        severity: "critical"
      },
      {
        id: "wa_template_rejected",
        symptom: "WhatsApp template status in Meta is 'REJECTED'",
        symptomHindi: "Meta ne WhatsApp message template ko REJECT kar diya",
        rootCause: "Template text contains spam words, missing variable samples, or incorrect category (Marketing vs Utility).",
        agentSteps: [
          "Review template text in /settings/whatsapp-templates.",
          "Ensure every variable {{1}}, {{2}} has valid sample values provided.",
          "Select correct Category (e.g. Order updates should be UTILITY, not MARKETING).",
          "Avoid excessive emojis or ALL CAPS in template text."
        ],
        customerScript: "Meta template reject hone ka mukhya kaaran hota hai: Variable samples ka na hona ya galat category. Template me {{1}}, {{2}} ke sath sample example likhein aur category 'Utility' select karke dobara submit karein.",
        settingsPath: "/settings/whatsapp-templates",
        tags: ["template", "rejected", "meta", "whatsapp", "broadcast"],
        severity: "high"
      }
    ],
    relatedPages: [
      { label: "WhatsApp Chat Hub", route: "/whatsapp-automation/chat" },
      { label: "Campaigns", route: "/whatsapp-automation/campaigns" },
      { label: "Template Hub", route: "/settings/whatsapp-templates" }
    ],
    searchKeywords: ["whatsapp", "meta", "cloud api", "waba", "campaign", "broadcast", "templates", "auto-reply", "chatbot"]
  },
  {
    id: "complaints_support_desk",
    title: "Customer Support Desk & Complaints",
    group: "Customer Care",
    route: "/complaints",
    iconName: "Headset",
    summary: "Receive incoming complaints, track resolution SLA, assign agents, and share live tracking links.",
    summaryHindi: "Customer ki shikayate darj karne, ticket assign karne, aur WhatsApp par solution bhejne ke liye.",
    customerJourney: [
      "Customer files ticket via public form `/complaints/form/[businessId]` or support phone.",
      "Ticket arrives in /complaints queue with Priority (Low, Medium, High, Emergency).",
      "Agent reviews ticket description, assigns owner, and moves status to 'Working'.",
      "Agent enters resolution notes in timeline and sends WhatsApp update to customer.",
      "Customer views live status on tracking page `/complaints/track/[businessId]/[ticketId]`."
    ],
    keyFrontendControls: [
      { label: "Ticket Status Selector", actionDescription: "Changes ticket state: New, Working, Waiting, Resolved, Closed." },
      { label: "Assign Agent Dropdown", actionDescription: "Assigns ticket to designated team member." },
      { label: "Copy Public Tracking Link", actionDescription: "Copies public self-service URL to share with client." },
      { label: "Timeline Resolution Logger", actionDescription: "Records immutable timestamps of all agent actions and notes." }
    ],
    commonIssues: [
      {
        id: "comp_tracking_link_lost",
        symptom: "Customer says they lost their ticket tracking link",
        symptomHindi: "Customer bol raha hai unka complaint tracking link kho gaya",
        rootCause: "Customer did not save SMS/WhatsApp message containing the tracking URL.",
        agentSteps: [
          "Search customer phone number in /complaints.",
          "Open the active ticket.",
          "Click 'Copy Tracking Link' button in header.",
          "Send link directly to customer WhatsApp via 1-click button."
        ],
        customerScript: "Namaste {customer_name}! Aapka complaint ticket ID #{ticket_id} hai. Aap is link par click karke live status aur agent notes dekh sakte hain: {tracking_url}",
        settingsPath: "/complaints",
        tags: ["ticket", "complaint", "tracking", "link", "status", "support"],
        severity: "low"
      }
    ],
    relatedPages: [
      { label: "Feedback & Reviews", route: "/feedback" },
      { label: "Customer Master", route: "/customers" }
    ],
    searchKeywords: ["complaints", "tickets", "support", "customer care", "tracking", "resolution", "sla", "agent"]
  },
  {
    id: "settings_profile_hardware",
    title: "Business Settings, Profile & Hardware",
    group: "System & Settings",
    route: "/settings",
    iconName: "Settings",
    summary: "Business profile, GSTIN registration, invoice numbering prefix, thermal printers, and payment gateways.",
    summaryHindi: "Dukaan ka naam, GST number, bill prefix, thermal printer setup, aur UPI account set karne ke liye.",
    customerJourney: [
      "User opens /settings to configure business basics.",
      "Fills Business Trade Name, Phone, Email, GSTIN, and Registered Address.",
      "Sets Bill Numbering Prefix (e.g. INV-2026/001).",
      "Configures thermal printer in Hardware tab.",
      "Saves changes to update all future invoices and store receipts."
    ],
    keyFrontendControls: [
      { label: "Business Profile Tab", actionDescription: "Updates official branding, logo, GSTIN, and state." },
      { label: "Hardware & Printer Tab", actionDescription: "Configures thermal printer paper size, margins, and auto-cut." },
      { label: "Invoice Customization", actionDescription: "Sets custom terms & conditions, bank account details for RTGS/NEFT." },
      { label: "Payment Gateways", actionDescription: "Links Razorpay keys, Cashfree, or direct BharatPe/PhonePe UPI." }
    ],
    commonIssues: [
      {
        id: "set_bank_details_missing_bill",
        symptom: "Bank Account / IFSC details not showing at the bottom of the printed invoice",
        symptomHindi: "Bill ke niche bank account number aur IFSC code print nahi ho raha",
        rootCause: "Bank details in Settings -> Invoice Customization are left empty.",
        agentSteps: [
          "Guide user to: Settings -> Invoice Customization Tab.",
          "Enter Bank Name, Account Number, IFSC Code, and Branch.",
          "Click Save. All subsequent invoices will display these bank details."
        ],
        customerScript: "Bill par bank details dikhane ke liye: Settings > Invoice Customization me jakar Bank Name, Account Number, aur IFSC code bharkar Save karein. Agle har bill par ye automatic print hoga.",
        settingsPath: "/settings",
        tags: ["settings", "bank", "ifsc", "invoice", "print", "account"],
        severity: "low"
      }
    ],
    relatedPages: [
      { label: "Billing POS", route: "/billing" },
      { label: "Invoices Ledger", route: "/invoices" }
    ],
    searchKeywords: ["settings", "profile", "gstin", "bank", "hardware", "printer", "prefix", "invoice format", "logo"]
  },
  {
    id: "real_estate_suite",
    title: "Real Estate & Land Asset Pro Suite",
    group: "Property Management",
    route: "/properties",
    iconName: "Building",
    summary: "Complete land asset catalog (Khet, Plot, Building, Farmhouse), unit conversions (Acre, Guntha, Bigha), CRM buyer pipeline, and agent performance leaderboard.",
    summaryHindi: "Zameen, plot, khet aur building catalog, area units (Acre, Bigha, Guntha), buyer leads pipeline aur agent leaderboard management.",
    customerJourney: [
      "Property agent ya admin '/properties/new' par jakar nayi property register karta hai (Khet, Plot, Farmhouse, ya Building).",
      "Indian unit select hota hai (sq.ft, sq.yd, Guntha, Acre, ya Bigha) aur rate per unit daalne par total market price automatic calculate hota hai.",
      "Property details drawer se 1-click WhatsApp brochure link generate karke interested customer ko bheji jaati hai.",
      "Buyer enquiry '/properties/leads' CRM pipeline me aati hai (Fresh Inquiry -> Call Done -> Site Visit -> Negotiating -> Deal Closed).",
      "Agent isolation activate hota hai: dusre agents ko customer ka phone number aur name masked (R***a, 98******10) dikhta hai taaki deal safe rahe.",
      "Deal close hone par '/properties/rewards' leaderboard me agent ka conversion rate aur sales volume live update hota hai."
    ],
    keyFrontendControls: [
      { label: "Indian Unit Selector", actionDescription: "Switches calculations between sq.ft, sq.yd, Guntha, Acre, and Bigha." },
      { label: "WhatsApp Asset Share", actionDescription: "Prepares detailed formatted property specs (borewell, soil, crop, road width, facing) to send on WhatsApp." },
      { label: "Client Privacy Masking", actionDescription: "Hides customer phone number and full name from unauthorized agents while allowing the assigned agent or admin full access." },
      { label: "Lead Stage Stepper", actionDescription: "Transitions deal from Fresh Inquiry to Site Visit and Closed Won." },
      { label: "Agent Leaderboard", actionDescription: "Calculates conversion rate % and total sales volume ranking." }
    ],
    commonIssues: [
      {
        id: "re_phone_masked",
        symptom: "Agent sees client phone as 98******10 and cannot call directly",
        symptomHindi: "Agent ko customer ka phone number 98******10 masked dikh raha hai aur direct call nahi ho raha",
        rootCause: "Agent isolation and lead confidentiality rule is active. Only the assigned agent or Admin can view unmasked customer details.",
        agentSteps: [
          "Check which agent is assigned to this lead.",
          "If the calling agent needs to collaborate, they can click the WhatsApp button to message the assigned agent directly.",
          "If the lead should be assigned to this agent, an Admin can change the Assigned Agent in '/properties/leads' edit modal."
        ],
        customerScript: "Namaste! Ye security feature hai taaki har agent ki customer leads safe rahein. Agar ye lead aapko assign honi chahiye toh aapke business Admin se lead re-assign karwayein ya assigned agent se discuss karein.",
        settingsPath: "/properties/leads",
        tags: ["real estate", "mask", "phone", "confidentiality", "agent", "privacy", "crm"],
        severity: "medium"
      },
      {
        id: "re_unit_rate_calculation",
        symptom: "Total price calculation seems incorrect when switching between Acre and sq.ft",
        symptomHindi: "Acre aur sq.ft me switch karne par total price calculation samajh nahi aa raha",
        rootCause: "In Khet/Farmhouse, Rate is calculated per Acre/Bigha, whereas in Plots, Rate is typically per sq.ft or sq.yd.",
        agentSteps: [
          "Check property type: Khet, Farmhouse, or Plot.",
          "Confirm the entered rate: if size is 2 Acres, rate should be Price per Acre (e.g. Rs 15,00,000 / Acre gives Rs 30,00,000 total).",
          "For Plots, check Front x Depth dimensions and enter Rate per sq.ft.",
          "The system will automatically multiply Rate x Size to generate the market price."
        ],
        customerScript: "Real estate catalog me Khet aur Farmhouse ke liye rate per Acre/Bigha daalein (jaise 15 Lakh per Acre). Plot ke liye rate per sq.ft daalein. System automatically size se multiply karke sahi total price calculate kar dega.",
        settingsPath: "/properties/new",
        tags: ["acre", "guntha", "bigha", "sqft", "unit", "calculation", "rate", "price"],
        severity: "low"
      }
    ],
    relatedPages: [
      { label: "Property Catalog", route: "/properties" },
      { label: "Customer Enquiries CRM", route: "/properties/leads" },
      { label: "Agent Performance", route: "/properties/rewards" }
    ],
    searchKeywords: ["property", "real estate", "khet", "plot", "building", "farmhouse", "acre", "guntha", "bigha", "agent", "crm", "lead", "masking"]
  }
];

/**
 * Fast search across Support Knowledge Base (by title, symptoms, root cause, tags, and keywords)
 */
export function searchSupportKnowledge(queryText: string, groupFilter?: string): SupportPageGuide[] {
  const cleanQuery = String(queryText || "").trim().toLowerCase();

  let list = SUPPORT_KNOWLEDGE_BASE;
  if (groupFilter && groupFilter !== "all") {
    list = list.filter((item) => item.group.toLowerCase() === groupFilter.toLowerCase());
  }

  if (!cleanQuery) return list;

  return list.filter((guide) => {
    if (guide.title.toLowerCase().includes(cleanQuery)) return true;
    if (guide.summary.toLowerCase().includes(cleanQuery)) return true;
    if (guide.summaryHindi.toLowerCase().includes(cleanQuery)) return true;
    if (guide.route.toLowerCase().includes(cleanQuery)) return true;
    if (guide.searchKeywords.some((kw) => kw.toLowerCase().includes(cleanQuery))) return true;

    // Search inside issues
    return guide.commonIssues.some((issue) => {
      return (
        issue.symptom.toLowerCase().includes(cleanQuery) ||
        issue.symptomHindi.toLowerCase().includes(cleanQuery) ||
        issue.rootCause.toLowerCase().includes(cleanQuery) ||
        issue.tags.some((tag) => tag.toLowerCase().includes(cleanQuery)) ||
        issue.agentSteps.some((step) => step.toLowerCase().includes(cleanQuery))
      );
    });
  });
}

/**
 * Searches across all individual common issues directly (Problem Finder view)
 */
export interface FlatIssueResult {
  issue: SupportIssueSOP;
  guideTitle: string;
  guideRoute: string;
  guideGroup: string;
}

export function searchAllCommonIssues(queryText: string): FlatIssueResult[] {
  const cleanQuery = String(queryText || "").trim().toLowerCase();
  const results: FlatIssueResult[] = [];

  for (const guide of SUPPORT_KNOWLEDGE_BASE) {
    for (const issue of guide.commonIssues) {
      if (!cleanQuery) {
        results.push({
          issue,
          guideTitle: guide.title,
          guideRoute: guide.route,
          guideGroup: guide.group,
        });
        continue;
      }

      const match =
        issue.symptom.toLowerCase().includes(cleanQuery) ||
        issue.symptomHindi.toLowerCase().includes(cleanQuery) ||
        issue.rootCause.toLowerCase().includes(cleanQuery) ||
        guide.title.toLowerCase().includes(cleanQuery) ||
        issue.tags.some((t) => t.toLowerCase().includes(cleanQuery)) ||
        issue.agentSteps.some((s) => s.toLowerCase().includes(cleanQuery));

      if (match) {
        results.push({
          issue,
          guideTitle: guide.title,
          guideRoute: guide.route,
          guideGroup: guide.group,
        });
      }
    }
  }

  return results;
}

/**
 * Formats a canned customer reply text with replacements
 */
export function formatCustomerScript(
  scriptTemplate: string,
  variables: { customerName?: string; ticketId?: string; trackingUrl?: string }
): string {
  let result = scriptTemplate;
  const name = variables.customerName || "Sir/Madam";
  result = result.replace(/\{customer_name\}/g, name);
  if (variables.ticketId) {
    result = result.replace(/\{ticket_id\}/g, variables.ticketId);
  }
  if (variables.trackingUrl) {
    result = result.replace(/\{tracking_url\}/g, variables.trackingUrl);
  }
  return result;
}

/**
 * Returns distinct groups available in knowledge base
 */
export function getSupportGroups(): string[] {
  const set = new Set<string>();
  for (const g of SUPPORT_KNOWLEDGE_BASE) {
    set.add(g.group);
  }
  return Array.from(set);
}
