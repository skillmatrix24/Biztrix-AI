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
      },
      {
        id: "inv_zero_deletion_statutory",
        symptom: "User wants to delete a generated tax invoice or sees no delete button",
        symptomHindi: "Tax invoice delete karne ka button nahi mil raha ya error aa raha hai",
        rootCause: "Statutory GST Compliance & Pillar 1 Financial Security: Once an invoice is generated, client-side deletion is permanently locked to prevent tax serial number breaks, audit discrepancies, and tax evasion penalties. Legal adjustments must use Credit Notes or cancellation.",
        agentSteps: [
          "Explain GST series integrity: Inform the merchant that deleting invoices causes sequential number gaps on the GST portal.",
          "If goods were returned or bill has error: Instruct them to open the invoice and click 'Credit Note / Sales Return'. This restocks inventory and generates a legal GST reversal note.",
          "If completely invalid before GSTR-1 filing: Admin can click 'Cancel Invoice' with mandatory reason, which keeps the audit trail clean.",
          "Never attempt manual database deletion of issued tax invoices."
        ],
        customerScript: "Namaste {customer_name}! GST niyam aur audit suraksha ke anusar generate hua Tax Invoice delete nahi kiya ja sakta, kyonki series break hone se GST portal par notice aa sakta hai. Agar bill me galti hui hai ya customer ne maal wapas kiya hai, toh aap usi invoice par 'Credit Note' bana sakte hain ya 'Cancel Invoice' kar sakte hain. Isse hisaab aur tax dono 100% legal rehte hain.",
        settingsPath: "/invoices",
        tags: ["delete", "invoice", "gst", "statutory", "audit", "credit note", "cancel", "pillar 1", "security"],
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
      },
      {
        id: "lead_anti_poaching_delete_sop",
        symptom: "Staff member wants to delete an inquiry/lead or sees delete action disabled",
        symptomHindi: "Staff ko lead delete karne ka option nahi mil raha",
        rootCause: "Pillar 2 Data Privacy & Anti-Poaching Security: CRM leads cannot be deleted by general staff. This prevents sales reps from wiping high-value leads, poaching clients to competitors, or hiding lost deal details. Leads can be marked 'Lost' with reason, but permanent deletion requires Business Admin.",
        agentSteps: [
          "Explain Anti-Poaching Rule: Clarify that lead data belongs to the business entity and staff cannot permanently delete inquiries.",
          "If the lead decided not to purchase: Instruct the sales rep to move the stage to 'Lost' and add loss reason notes.",
          "If lead is duplicate or invalid: Request a Business Admin or Owner to perform the deletion from their login."
        ],
        customerScript: "Namaste {customer_name}! Business ki customer data suraksha ke liye staff ko CRM leads permanently delete karne ki permission nahi hoti, taki koi lead leak ya chori na ho sake. Agar customer ne deal cancel kar di hai toh aap stage 'Lost' select karke reason likh sakte hain. Permanent delete sirf Business Admin hi kar sakte hain.",
        settingsPath: "/leads",
        tags: ["crm", "lead", "delete", "anti-theft", "privacy", "poaching", "pillar 2"],
        severity: "medium"
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
      },
      {
        id: "wa_campaign_admin_approval_sop",
        symptom: "Staff member tries to create or launch a WhatsApp broadcast campaign, but gets permission error",
        symptomHindi: "Staff ko WhatsApp broadcast campaign launch karne par permission error aa raha hai",
        rootCause: "Pillar 2 Marketing & Brand Protection: Mass WhatsApp broadcasts burn prepaid Meta messaging balance and risk permanent phone number banning if unapproved messages trigger customer spam reports. Campaign creation and dispatch is strictly restricted to Business Admin/Owner.",
        agentSteps: [
          "Explain Anti-Spam Control: Clarify that bulk broadcasting directly incurs per-conversation Meta charges and affects phone quality rating.",
          "Staff can draft the campaign message or prepare customer contact tags in /customers.",
          "Business Admin or Owner must review and trigger the final launch from /whatsapp-automation/campaigns."
        ],
        customerScript: "Namaste {customer_name}! WhatsApp number ki rating bachane aur Meta messaging charges ko control karne ke liye bulk broadcast campaigns sirf Business Admin ya Owner hi launch kar sakte hain. Staff members contact groups tag kar sakte hain, aur Admin review karke 1-click me campaign send kar sakte hain.",
        settingsPath: "/whatsapp-automation/campaigns",
        tags: ["whatsapp", "campaign", "broadcast", "spam", "admin only", "permission", "pillar 2"],
        severity: "medium"
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
      },
      {
        id: "multi_tenant_isolation_sop",
        symptom: "Merchant asks how their business accounting, GST, or customer data is isolated from other businesses",
        symptomHindi: "Customer pooch raha hai ki unka data dusre business ya competitor ko kaise nahi dikhega",
        rootCause: "Pillar 3 Multi-Tenant Isolation: Biztrix runs strict Firestore multi-tenant security rules (`isBusinessMember`) and server-side verification where each database path is strictly isolated under `/businesses/{businessId}/`. No business can read, query, or search another business's records.",
        agentSteps: [
          "Assure merchant: Explain that each company has its own cryptographic business ID boundary.",
          "Security rule verification: Even if someone knows another business's ID or document path, Firestore returns permission-denied.",
          "Data segregation: Backups, ledgers, POS bills, and staff profiles are strictly segregated."
        ],
        customerScript: "Namaste {customer_name}! Biztrix me har business ka data military-grade Multi-Tenant Isolation se protected hota hai. Security rules ensure karte hain ki aapke bills, customers, aur hisaab sirf aapke authorized login se hi access ho sake. Koi dusra business ya user aapka 1 single record bhi nahi dekh sakta.",
        settingsPath: "/settings",
        tags: ["security", "multi-tenant", "isolation", "privacy", "competitor", "pillar 3", "protection"],
        severity: "medium"
      },
      {
        id: "server_credentials_vault_sop",
        symptom: "Merchant asks where their payment gateway secret keys and GST credentials are stored and if staff can see them",
        symptomHindi: "Merchant pooch raha hai ki unke Razorpay secret key aur GST password staff dekh sakta hai ya nahi",
        rootCause: "Pillar 3 Private Credentials Vault: Sensitive API secrets (Razorpay Key Secret, ClearTax/MasterGST credentials, Meta Tokens) are stored in server-only `privateConfig` nodes. Firestore rules block all client browser reads (`allow read, write: if false;`), making it impossible for staff or browser inspect tools to extract secrets.",
        agentSteps: [
          "Explain Server-Side Isolation: Secrets are never sent to the browser or rendered in client HTML.",
          "Gateway transactions execute securely via server API proxy routes (`/api/payments/*` and `/api/eway-bill/*`).",
          "Staff roles only see configured public Merchant Key IDs, never private secrets."
        ],
        customerScript: "Aapke Razorpay Key Secret aur GST passwords Biztrix ke secure server vault (`privateConfig`) me store hote hain. Firestore rules browser se inka access 100% block karke rakhti hain. Dukaan ka koi bhi staff ya web browser aapke secrets ko inspect nahi kar sakta.",
        settingsPath: "/settings",
        tags: ["gateway", "secret", "razorpay", "vault", "credentials", "server-side", "pillar 3"],
        severity: "medium"
      },
      {
        id: "cyber_attack_defense_sop",
        symptom: "Merchant asks if the software is vulnerable to hacking, SQL injection, bots, or cyber attacks",
        symptomHindi: "Merchant pooch raha hai ki website hack toh nahi hogi ya cyber attack se surakshit hai ya nahi",
        rootCause: "Pillar 4 Cyber Security & Hardening: Biztrix is fortified across all attack vectors: (1) HTTP security headers (nosniff, XSS protection, Referrer Policy) block MIME sniffing and reflected injection; (2) Webhooks use timing-safe HMAC cryptographic signatures; (3) NoSQL query architecture eliminates SQL injection entirely; (4) Rate limiters protect AI endpoints against bot credit abuse; (5) Exported CSV files sanitize spreadsheet formula injection.",
        agentSteps: [
          "Reassure merchant: Inform them that Biztrix runs on Google Cloud enterprise infrastructure with SSL/TLS encryption.",
          "Explain NoSQL parameterization: Queries use strongly typed SDK methods that cannot be compromised by SQL injection.",
          "Highlight rate limits and headers: Bots and scrapers are blocked by automatic IP throttling and browser security headers."
        ],
        customerScript: "Namaste {customer_name}! Biztrix 100% cloud enterprise security par run hota hai. Isme Google Cloud infrastructure, NoSQL parameterized queries, timing-safe webhook cryptography, aur browser XSS protection active hain. Kisi bhi third-party ya hacker ke liye database me ghusna ya script inject karna asambhav hai.",
        settingsPath: "/settings",
        tags: ["security", "cyber", "hacking", "firewall", "xss", "nosql", "bot", "pillar 4"],
        severity: "medium"
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
  },
  {
    id: "customers_loyalty",
    title: "Customer Registry, Udhaar Ledger & Loyalty Points",
    group: "Customers & Loyalty",
    route: "/customers",
    iconName: "Users",
    summary: "Manage customer profiles, udhaar credit balances, loyalty tier perks, Excel import/export, and purchase history.",
    summaryHindi: "Grahak ka record, udhaar khata, loyalty tier points, Excel import-export, aur khareedari ka hisaab rakhne ke liye.",
    customerJourney: [
      "Customer registry me grahak ka naam, phone number aur address record hota hai.",
      "Har billing transaction par points aur cashback wallet balance live update hota hai.",
      "Udhaar / Credit khate me balance automatic judta hai aur settlement receipt banti hai.",
      "OS Role Manager permissions ke mutabik customer data edit ya export kiya jata hai."
    ],
    keyFrontendControls: [
      { label: "New Customer Button", actionDescription: "Opens 4-tab registration modal with General, Credit Ledger, Loyalty, and Address tabs." },
      { label: "Excel Export/Import", actionDescription: "Download complete client list to Excel or bulk upload via spreadsheet." },
      { label: "Udhaar Quick Settle", actionDescription: "Records cash/UPI payment against customer's pending credit balance." },
      { label: "WhatsApp Statement", actionDescription: "Sends one-click payment reminder and khata statement on WhatsApp." }
    ],
    commonIssues: [
      {
        id: "cust_points_not_showing",
        symptom: "Customer made purchase but loyalty points or cashback did not reflect",
        symptomHindi: "Customer ne khareedari ki par loyalty reward points nahi dikh rahe",
        rootCause: "Phone number was entered with leading zeroes/country code or loyalty program toggle was inactive during checkout.",
        agentSteps: [
          "Check customer registry in /customers using exact 10-digit mobile number.",
          "Check loyalty tier rules in /loyalty/rules to ensure bill amount exceeded minimum spend threshold.",
          "If missing, use Edit Customer dialog -> Loyalty tab to credit manual adjustment points."
        ],
        customerScript: "Namaste {customer_name}! Aapka points balance verify karne ke liye humne customer ledger check kiya hai. Points update ho gaye hain aur aap /loyalty/track-member par apna digital card dekh sakte hain.",
        settingsPath: "/customers",
        tags: ["customer", "loyalty", "points", "grahak", "reward", "tier", "udhaar", "ledger", "excel"],
        severity: "medium"
      },
      {
        id: "customer_deletion_admin_only_sop",
        symptom: "Staff member tries to delete a customer profile or clear credit balance, but delete fails or is hidden",
        symptomHindi: "Staff ko customer ya unka udhaar khata delete karne ka option nahi mil raha",
        rootCause: "Pillar 2 Customer Privacy & Anti-Theft Security: Customer directories and outstanding udhaar balances cannot be deleted by general staff. This prevents malicious wipeouts of borrower credit balances or illegal loss of company contacts. Customer deletion is restricted to Business Admin/Owner.",
        agentSteps: [
          "Explain Anti-Theft Protection: Inform the user that customer accounts with active balances or purchase history cannot be deleted by staff.",
          "If customer paid their pending udhaar: Instruct staff to record a payment via 'Udhaar Quick Settle' rather than trying to delete the record.",
          "If customer profile is a duplicate test entry: Request Business Admin or Owner to log in and delete the entry."
        ],
        customerScript: "Namaste {customer_name}! Udhaar khate aur dukaan ke hisaab me kisi bhi prakar ki heraferi ko rokne ke liye customer profile ya khata delete karne ka adhikar sirf Business Owner/Admin ke paas hota hai. Agar customer ne udhaar chuka diya hai, toh 'Udhaar Quick Settle' button se payment enter karein, jisse balance 0 ho jayega.",
        settingsPath: "/customers",
        tags: ["customer", "delete", "udhaar", "credit", "anti-theft", "debtor", "pillar 2"],
        severity: "high"
      }
    ],
    relatedPages: [
      { label: "Digital Loyalty Pass", route: "/loyalty/track-member" },
      { label: "Loyalty Program Rules", route: "/loyalty/rules" },
      { label: "Billing POS", route: "/billing" }
    ],
    searchKeywords: ["customer", "grahak", "udhaar", "credit", "ledger", "loyalty", "points", "tier", "gold", "silver", "cashback", "wallet", "qr card", "track member", "excel", "import", "export"]
  },
  {
    id: "loyalty_member_pass",
    title: "Digital Loyalty QR Pass & Member Hub",
    group: "Customers & Loyalty",
    route: "/loyalty/track-member",
    iconName: "Sparkles",
    summary: "Customer-facing live loyalty pass displaying QR membership code, tier status, wallet cashback, and past purchases.",
    summaryHindi: "Grahak ka digital membership card, live points balance, wallet cashback aur QR code dekhne ke liye.",
    customerJourney: [
      "Customer visits /loyalty/track-member and enters registered 10-digit mobile number.",
      "Instant animated digital membership card renders showing current tier (Bronze, Silver, Gold, Platinum).",
      "Customer displays the digital QR card at the store billing counter.",
      "Cashier scans QR or enters phone to apply discounts and redeem points balance."
    ],
    keyFrontendControls: [
      { label: "Phone Lookup Input", actionDescription: "Fetches live member profile, points balance, and loyalty tier." },
      { label: "Digital QR Code", actionDescription: "Unique customer QR token ready for cashier scanner at checkout." },
      { label: "Wallet Balance Tag", actionDescription: "Displays available rupee cashback ready to redeem against bills." }
    ],
    commonIssues: [
      {
        id: "loyalty_member_not_found",
        symptom: "Customer enters phone number on /loyalty/track-member but sees 'Member Not Found'",
        symptomHindi: "Customer phone number dalne par 'Member Not Found' error aa raha hai",
        rootCause: "Customer was billed as generic walk-in or phone number was registered under a different country code prefix.",
        agentSteps: [
          "Verify phone number in /customers registry.",
          "Ensure standard 10-digit Indian mobile format without spaces or +91.",
          "Add customer in /customers registry if not previously registered."
        ],
        customerScript: "Aapka mobile number Biztrix Member Hub me verify kar liya gaya hai. Kripya apna 10-digit mobile number /loyalty/track-member par enter karein, aapka digital QR card turant load ho jayega.",
        settingsPath: "/customers",
        tags: ["member", "loyalty pass", "qr", "track member", "points", "membership", "tier"],
        severity: "low"
      }
    ],
    relatedPages: [
      { label: "Customer Registry", route: "/customers" },
      { label: "Loyalty Program Rules", route: "/loyalty/rules" }
    ],
    searchKeywords: ["loyalty pass", "qr pass", "track member", "membership", "points balance", "reward card", "redeem points", "gold tier", "cashback wallet"]
  },
  {
    id: "staff_roles_payroll",
    title: "Staff Directory, Attendance & OS Role Manager",
    group: "Team & HR",
    route: "/staff",
    iconName: "ShieldCheck",
    summary: "Manage employee profiles, daily attendance, biometric check-in, payroll salary slips, and OS Role Manager permissions (RBAC).",
    summaryHindi: "Karmchari attendance, salary slip, payroll hisaab, aur OS Role Manager se software rights manage karne ke liye.",
    customerJourney: [
      "Admin creates staff profile with designation, monthly salary, and role.",
      "Staff members mark daily attendance (Present, Absent, Half-Day, Overtime).",
      "Month-end payroll engine computes working days, deductions, advances, and net payable.",
      "OS Role Manager (/settings/roles) restricts POS discounts, inventory delete, or export rights."
    ],
    keyFrontendControls: [
      { label: "Check In / Out Button", actionDescription: "Logs timestamped attendance with optional selfie or location stamp." },
      { label: "OS Role Manager Stepper", actionDescription: "Controls permissions for Cashier, Manager, Accountant, and Admin." },
      { label: "Generate Salary Slip", actionDescription: "Calculates net wages and generates printable/WhatsApp salary vouchers." }
    ],
    commonIssues: [
      {
        id: "role_permission_denied",
        symptom: "Staff member sees 'Permission Denied' or cannot view /customers or /billing",
        symptomHindi: "Staff ko 'Permission Denied' dikh raha hai aur module open nahi ho raha",
        rootCause: "Assigned staff role in OS Role Manager has that specific module access turned OFF.",
        agentSteps: [
          "Open /settings/roles as Business Owner/Admin.",
          "Select the staff member's role (e.g. Cashier, Sales Agent).",
          "Toggle ON the desired module switch (e.g. Customer Registry, Reports).",
          "Click 'Save Role Permissions' and ask staff member to refresh the page."
        ],
        customerScript: "Aapke software access permissions update kar diye gaye hain. Kripya browser refresh karein, ab aap desired page access kar payenge.",
        settingsPath: "/settings/roles",
        tags: ["staff", "role manager", "rbac", "permission", "attendance", "payroll", "salary", "karmchari"],
        severity: "high"
      },
      {
        id: "team_invite_wage_sync_sop",
        symptom: "Invited staff member logged in but was shown as separate pending invite or wage was not synced",
        symptomHindi: "Invite kiye gaye staff ne login kiya par unki daily wage ya attendance profile sync nahi hui",
        rootCause: "Invite email mismatch or duplicate placeholder row before account linking. When an invited member signs in with their invited email, the system automatically claims the pending invitation, binds the ₹500/d daily rate and shift hours to their authenticated UID, and purges duplicate rows.",
        agentSteps: [
          "Check invited email address: Ensure the user logs in using the exact email address where the WhatsApp/email invite was sent.",
          "Confirm claim status in /team: The member should show 'Active' status badge with their configured role.",
          "Verify Daily Wage: Check /staff profile to confirm their ₹500/d daily wage and 8-hour shift timings are attached.",
          "If duplicate existed prior to login: Biztrix background deduplication engine merges and cleans orphan records on next page visit."
        ],
        customerScript: "Staff member ko invite kiye gaye email ID se hi login karna anivarya hai. Login hote hi unka daily wage (₹500/din) aur shift timings automatically unke active account se bind ho jate hain aur duplicate entries clean ho jati hain. Ek baar /team page refresh karke status check karein.",
        settingsPath: "/team",
        tags: ["team", "invite", "login", "duplicate", "wage", "daily rate", "sync", "staff"],
        severity: "medium"
      }
    ],
    relatedPages: [
      { label: "OS Role Manager", route: "/settings/roles" },
      { label: "Payroll Calculator", route: "/staff/payroll" },
      { label: "Task Manager", route: "/notes" }
    ],
    searchKeywords: ["staff", "employee", "team", "attendance", "payroll", "salary", "wages", "roles", "role manager", "rbac", "permissions", "absent", "present", "check in"]
  },
  {
    id: "solar_epc_vertical",
    title: "Solar EPC Rooftop Survey & Quotation Engine",
    group: "Vertical Solutions",
    route: "/solar",
    iconName: "Sun",
    summary: "End-to-end solar engineering: site feasibility survey, shadow analysis, PV system sizing (kW), DISCOM net metering, and 1-click proposal generation.",
    summaryHindi: "Solar plant feasibility survey, shadow analysis, PV sizing, DISCOM net metering, aur customer proposal banane ke liye.",
    customerJourney: [
      "Solar surveyor captures client electricity bill units and Sanctioned Load (kW).",
      "Site survey tool logs rooftop area (sq.m), roof type (RCC/Tin Shed), and shadow obstacles.",
      "Engineering logic calculates recommended system size, estimated annual generation (kWh), and PM Surya Ghar subsidy.",
      "Generates customized financial ROI proposal with 25-year savings projection."
    ],
    keyFrontendControls: [
      { label: "Site Survey Wizard", actionDescription: "Step-by-step checklist for roof dimensions, cable length, and DISCOM meter specs." },
      { label: "PV Sizing Calculator", actionDescription: "Auto-recommends panel count, inverter capacity, and estimated generation units." },
      { label: "Proposal PDF Generator", actionDescription: "Produces commercial solar project proposal with subsidy and payback years." }
    ],
    commonIssues: [
      {
        id: "solar_subsidy_mismatch",
        symptom: "Estimated solar subsidy calculation differs from PM Surya Ghar portal",
        symptomHindi: "Solar proposal me subsidy amount PM Surya Ghar se alag dikh raha hai",
        rootCause: "Residential rooftop subsidy caps at 3kW (Rs. 78,000 max), while commercial systems do not receive central residential capital subsidy.",
        agentSteps: [
          "Check connection category: Residential vs Commercial/Industrial.",
          "Verify sanctioned load: 1kW (Rs 30k), 2kW (Rs 60k), 3kW+ (Rs 78k max cap for residential).",
          "Ensure proposal settings reflect current MNRE central portal guidelines."
        ],
        customerScript: "PM Surya Ghar Muft Bijli Yojana ke tahat 1kW par ₹30,000, 2kW par ₹60,000 aur 3kW ya usse adhik par maximum ₹78,000 ki residential subsidy milti hai. Commercial connections par subsidy nahi milti balki Accelerated Depreciation ka fayda milta hai.",
        settingsPath: "/solar",
        tags: ["subsidy", "surya ghar", "mismatch", "calculation", "portal", "differ", "subsidy alag", "wrong subsidy"],
        severity: "medium"
      }
    ],
    relatedPages: [
      { label: "Solar Survey Tool", route: "/solar" },
      { label: "Billing POS", route: "/billing" }
    ],
    searchKeywords: ["solar", "epc", "pv", "kw", "inverter", "rooftop", "subsidy", "net metering", "survey", "proposal", "quotation", "panel", "discom", "surya ghar", "solar management", "management system", "solar management system", "solar system"]
  },
  {
    id: "daily_cashbook",
    title: "Daily Cashbook & Expense Ledger",
    group: "Finance & Accounts",
    route: "/daily-entries",
    iconName: "Wallet",
    summary: "Dual-entry cashbook for daily shop income and expense recording, opening balance reconciliation, and petty cash tracking.",
    summaryHindi: "Dukaan ka rozana jama-kharch (income/expense), opening balance milan, aur cash in hand hisaab ke liye.",
    customerJourney: [
      "Store manager sets morning Opening Cash balance.",
      "Daily retail sales from POS auto-sync as Cash In entries.",
      "Expenses (tea, diesel, courier, supplier petty cash) are logged with category tags.",
      "Closing balance verifies exact drawer cash vs software records."
    ],
    keyFrontendControls: [
      { label: "Quick Entry Modal", actionDescription: "One-click toggle between Income (Cash In) and Expense (Cash Out)." },
      { label: "Category Filter", actionDescription: "Filter by Utilities, Vendor Advance, Shop Rent, or Counter Sales." },
      { label: "Day Closing Button", actionDescription: "Reconciles actual drawer cash with software closing balance." }
    ],
    commonIssues: [
      {
        id: "cash_mismatch_closing",
        symptom: "Physical cash in hand does not match cashbook closing balance",
        symptomHindi: "Galle ka cash software ke closing balance se match nahi ho raha",
        rootCause: "Unrecorded cash expense or manual bill payment made without logging into daily entries.",
        agentSteps: [
          "Open /daily-entries and review all transactions of the selected date.",
          "Verify POS cash collections from /billing for that day.",
          "Add any missed petty cash expense with description to balance the daybook."
        ],
        customerScript: "Dukaan closing par cash match karne ke liye /daily-entries me check karein ki koi chhota kharcha (jaise tea/delivery) enter karna toh nahi chhoot gaya. POS ka cash total aur expense match hote hi closing balance sahi dikhayega.",
        settingsPath: "/daily-entries",
        tags: ["cashbook", "khata", "jama", "kharch", "income", "expense", "galla", "opening balance"],
        severity: "medium"
      },
      {
        id: "cashbook_anti_pilferage_guard",
        symptom: "Staff cashier asks to edit/delete yesterday's cash entries, or staff sees limited P&L data",
        symptomHindi: "Staff ko purani cash entry edit ya delete karne ka option nahi mil raha",
        rootCause: "Pillar 1 Anti-Pilferage Financial Security: Daily cashbook entries are tamper-protected in Firestore rules. Counter staff can record daily income/expenses from POS, but past entry editing and deleting is strictly restricted to Business Admin/Owner to prevent counter cash pilferage.",
        agentSteps: [
          "Verify user role: Check if user is Staff or Admin under /settings?tab=roles.",
          "Explain Anti-Theft Guard: Inform them that staff cannot alter past cash records to ensure cash drawer transparency and prevent accounting manipulation.",
          "If a genuine error occurred: Have the Business Owner/Admin make the edit, or log an offsetting adjustment entry with clear reason note."
        ],
        customerScript: "Namaste {customer_name}! Counter cash aur galle ki suraksha ke liye Biztrix me staff ko purani cash entry edit ya delete karne ki permission nahi hoti, taki kisi bhi prakar ki heraferi na ho sake. Agar koi entry galat hui hai, toh Business Owner/Admin apne login se use theek kar sakte hain ya nayi adjustment entry pass kar sakte hain.",
        settingsPath: "/daily-entries",
        tags: ["cashbook", "anti-theft", "pilferage", "delete cash", "edit entry", "audit", "admin only", "pillar 1"],
        severity: "high"
      }
    ],
    relatedPages: [
      { label: "Billing POS", route: "/billing" },
      { label: "Vendor Directory", route: "/vendors" }
    ],
    searchKeywords: ["daily entries", "cashbook", "khata", "jama", "kharch", "income", "expense", "opening balance", "petty cash", "galla", "daybook"]
  },
  {
    id: "task_manager",
    title: "Team Tasks & Operations Sprint",
    group: "Operations",
    route: "/notes",
    iconName: "ListTodo",
    summary: "Assign team tasks, track execution checklists, monitor overdue items, and sprint workload balance.",
    summaryHindi: "Team ko kaam assign karne, checklist track karne, aur deadline hisaab ke liye.",
    customerJourney: [
      "Admin or manager creates a task with priority, due date, and multiple assigned specialists as needed.",
      "Assigned staff members receive individual notifications and work through subtask checklists.",
      "Task moves from To Do -> Working -> Done.",
      "Manager reviews completion % and activity audit trail."
    ],
    keyFrontendControls: [
      { label: "New Task Dialog", actionDescription: "Create task with checklists, priority, linked project, and multi-specialist assignment." },
      { label: "Assigned Specialists (Multiple Assign)", actionDescription: "Popover selector allowing multiple specialists with badges and instant removal." },
      { label: "Board / List Switcher", actionDescription: "Switch between visual Kanban column board and tabular list." },
      { label: "AI Sprint Assistant", actionDescription: "Chat advisor for workload bottlenecks and delegation." }
    ],
    commonIssues: [
      {
        id: "task_notification_unseen",
        symptom: "Staff member didn't receive task assignment notification",
        symptomHindi: "Staff ko task assignment ka alert nahi mila",
        rootCause: "Staff was unassigned or logged in with a different account email.",
        agentSteps: [
          "Check task details in /notes to confirm assigned staff name.",
          "Confirm staff user ID exists in /staff registry."
        ],
        customerScript: "Task assign hote hi staff ke notifications me alert chala jata hai. Kripya /notes me jaakar task ka assigned member check karein.",
        settingsPath: "/notes",
        tags: ["task", "todo", "sprint", "checklist", "assign", "karyabhara"],
        severity: "low"
      }
    ],
    relatedPages: [
      { label: "Staff Directory", route: "/staff" },
      { label: "Projects Pipeline", route: "/projects" }
    ],
    searchKeywords: ["task", "kaam", "notes", "todo", "sprint", "delegation", "subtask", "deadline", "urgent", "checklist"]
  },
  {
    id: "marketplace_modules",
    title: "Marketplace Suites, Add-ons & Module Activation",
    group: "Marketplace & OS Settings",
    route: "/marketplace",
    iconName: "ShoppingBag",
    summary: "Discover, trial, and activate optional industry suites (Solar EPC, Real Estate CRM, Storefront) and modular add-ons with admin authorization.",
    summaryHindi: "Naye business suites aur add-ons activate karne, 14-din trial shuru karne, aur permissions manage karne ke liye.",
    customerJourney: [
      "Business Admin opens /marketplace to inspect modular industry solutions.",
      "Clicks 'Start 14-Day Free Trial' or 'Activate Module' on desired suite (e.g. Solar, Real Estate, E-Commerce Store).",
      "2-step confirmation modal displays feature breakdown, pricing, and quota enhancements.",
      "Upon confirmation, module immediately unlocks in Sidebar and Mobile BottomNav for all authorized workspace members."
    ],
    keyFrontendControls: [
      { label: "Activate / Trial Button", actionDescription: "Opens 2-step confirmation modal with feature breakdown and trial terms." },
      { label: "Feature Details Link", actionDescription: "Opens /marketplace/features/[moduleId] with interactive feature demo." },
      { label: "Category Filter", actionDescription: "Filters between All, Industry Suites, Operations, Marketing, and AI Add-ons." }
    ],
    commonIssues: [
      {
        id: "mod_staff_cannot_activate",
        symptom: "Staff member sees 'Admin Required' when trying to activate marketplace module",
        symptomHindi: "Staff ko module activate karne par admin authorization ka message aa raha hai",
        rootCause: "Marketplace module subscriptions directly impact business billing and operational quotas. Only Business Admins or Platform Owners are permitted to activate modules or start trials.",
        agentSteps: [
          "Verify the caller's role: If they are a staff member, clarify that account security requires a Business Admin or Owner to approve billing add-ons.",
          "Have a workspace Admin log into /marketplace to click 'Activate Module'.",
          "Confirm the module status badge changes to 'Active' or 'Trial'."
        ],
        customerScript: "Namaste {customer_name}! Billing aur account suraksha ke liye Marketplace modules sirf Business Admin ya Owner hi activate kar sakte hain, taki bina jankari ke koi extra charges na lagein. Kripya apne workspace Admin se ise /marketplace me activate karne ko kahein.",
        settingsPath: "/marketplace",
        tags: ["marketplace", "activate", "addon", "suite", "admin only", "permission", "trial"],
        severity: "medium"
      },
      {
        id: "mod_sidebar_not_appearing",
        symptom: "Module shows active in Marketplace but does not appear in Sidebar immediately",
        symptomHindi: "Module activate karne ke baad bhi sidebar me menu nahi dikh raha",
        rootCause: "Client navigation state cache or role-based permission switch was not toggled in OS Role Manager.",
        agentSteps: [
          "Advise merchant to perform a quick page refresh to sync latest activeAddonIds.",
          "If still hidden for staff: Open /settings/roles and make sure the new module toggle is switched ON for that staff role.",
          "For real estate agents: Note that agent isolation rules intentionally keep unrelated business suites hidden."
        ],
        customerScript: "Module activate hote hi Sidebar update ho jata hai. Agar turant na dikhe toh page refresh karein. Staff members ke liye /settings/roles me jakar check karein ki us role ke liye permission ON hai ya nahi.",
        settingsPath: "/marketplace",
        tags: ["marketplace", "sidebar", "suite", "refresh", "addon", "roles"],
        severity: "low"
      }
    ],
    relatedPages: [
      { label: "Subscription Settings", route: "/settings/subscription" },
      { label: "OS Settings (Roles & RBAC)", route: "/settings/roles" }
    ],
    searchKeywords: ["marketplace", "modules", "add-on", "suite", "solar", "store", "property", "activate", "purchase", "trial", "subscribe", "upgrade"]
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
