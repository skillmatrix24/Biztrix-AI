"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Loader2, SmartphoneNfc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  commitBatchNonBlocking,
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
  useUser,
} from "@/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import { Customer, Product, Vendor } from "@/lib/mock-db";
import { sendWhatsAppTemplate } from "@/app/actions/whatsapp-actions";
import {
  calculateBillingTotals,
  findBestCouponOffer,
  resolvePaymentModesFromSettings,
  type BillingLineItem,
  type SplitPaymentEntry,
} from "@/lib/billing-engine";
import {
  buildNicEWayBillJson,
  createDefaultEWayDetails,
  downloadNicJsonFile,
  evaluateEWayRequirement,
  extractPincode,
  generateUniqueInvoiceId,
  type EWayBillDetails,
} from "@/lib/eway-bill";

import { InvoicePrintTemplate } from "./components/InvoicePrintTemplate";
import { ThermalPrintTemplate } from "./components/ThermalPrintTemplate";
import { StatusHeader, type BillingMode } from "./components/StatusHeader";
import { IdentitySection } from "./components/IdentitySection";
import { BillingCartTable } from "./components/BillingCartTable";
import { RewardCardsSection } from "./components/RewardCardsSection";
import { ReconciliationPanel } from "./components/ReconciliationPanel";
import { PreviewDialog } from "./components/PreviewDialog";
import { SuccessDialog } from "./components/SuccessDialog";
import { NewCustomerDialog } from "./components/NewCustomerDialog";
import { QuickProductDialog } from "./components/QuickProductDialog";
import { SplitBillDialog, type SplitBillPartPayload } from "./components/SplitBillDialog";
import { EWayBillModal } from "./components/EWayBillModal";
import { WhatsAppShareModal } from "@/app/invoices/components/WhatsAppShareModal";
import { useMarketplaceCatalog } from "@/hooks/use-marketplace-catalog";
import { evaluateCoreQuota, isCreatedInCurrentMonth } from "@/lib/marketplace-catalog";
import { CoreQuotaBanner } from "@/components/quota-upgrade-banner";

export type BillItem = BillingLineItem;

function BillingContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const searchParams = useSearchParams();

  const incomingCustomerId = searchParams.get("customerId");
  const incomingAmount = searchParams.get("amount");
  const incomingQuoteId = searchParams.get("quoteId");
  const incomingProjectId = searchParams.get("projectId");
  const incomingMilestoneId = searchParams.get("milestoneId");

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);

  const businessId = userProfile?.businessId;
  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);
  const { limits } = useMarketplaceCatalog();

  const [activeMembership, setActiveMembership] = useState<any>(null);
  const [isLoyaltyLoading, setIsLoyaltyLoading] = useState(false);
  const [memberCoupons, setMemberCoupons] = useState<any[]>([]);
  const [customerActivities, setCustomerActivities] = useState<any[]>([]);

  const [isRewardSyncMode, setIsRewardSyncMode] = useState(false);
  const [isQuotation, setIsQuotation] = useState(false);
  const [externalBillNo, setExternalBillNo] = useState("");

  const [advanceAmount, setAdvanceAmount] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualOverrideReason, setManualOverrideReason] = useState("");
  const [exemptAmount, setExemptAmount] = useState("");
  const [manualGstRate, setManualGstRate] = useState("18");
  const [paymentNote, setPaymentNote] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [printMode, setPrintMode] = useState<"a4" | "thermal">("a4");

  const [couponOverrides, setCouponOverrides] = useState<Record<string, number>>({});
  const [couponOverrideReasons, setCouponOverrideReasons] = useState<Record<string, string>>({});

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [items, setItems] = useState<BillItem[]>([]);
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupons, setAppliedCoupons] = useState<any[]>([]);
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState<SplitPaymentEntry[]>([]);
  const [isSplitBillOpen, setIsSplitBillOpen] = useState(false);
  const [splitInvoices, setSplitInvoices] = useState<any[]>([]);
  const [activeSplitIndex, setActiveSplitIndex] = useState(0);
  const [ewayDetails, setEwayDetails] = useState<EWayBillDetails>(() =>
    createDefaultEWayDetails()
  );
  const [isEWayModalOpen, setIsEWayModalOpen] = useState(false);
  const [isWhatsAppShareOpen, setIsWhatsAppShareOpen] = useState(false);
  const [isGeneratingLiveEwb, setIsGeneratingLiveEwb] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  useEffect(() => {
    if (incomingAmount) setManualAmount(incomingAmount);
    if (incomingCustomerId) setSelectedCustomerId(incomingCustomerId);
    if (incomingProjectId) {
      setPaymentNote((prev) =>
        prev ||
        (incomingMilestoneId
          ? `Project ${incomingProjectId} · Milestone ${incomingMilestoneId}`
          : `Project ${incomingProjectId}`)
      );
    }
  }, [incomingAmount, incomingCustomerId, incomingProjectId, incomingMilestoneId]);

  useEffect(() => {
    async function loadQuote() {
      if (!incomingQuoteId || !businessId) return;
      setIsQuoteLoading(true);
      try {
        const qRef = doc(firestore, "businesses", businessId, "quotations", incomingQuoteId);
        const qSnap = await getDoc(qRef);
        if (qSnap.exists()) {
          const qData = qSnap.data();
          setSelectedCustomerId(qData.customerId);
          setItems(qData.items || []);
          setManualDiscount(qData.totals?.manualDiscountApplied || 0);
          setManualAmount(
            qData.totals?.isOverridden ? qData.totals.grossSubtotal.toString() : ""
          );
          setIsQuotation(true);
          toast({
            title: "Quotation Loaded",
            description: `Loaded quotation ${qData.quotationId}`,
          });
        }
      } catch (e) {
        console.error(e);
        toast({ variant: "destructive", title: "Failed to load quotation" });
      } finally {
        setIsQuoteLoading(false);
      }
    }
    loadQuote();
  }, [incomingQuoteId, businessId, firestore]);

  const configRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId, "loyaltyConfig", "main") : null),
    [firestore, businessId]
  );
  const { data: portalConfig } = useDoc<any>(configRef);

  const currencySymbol = getCurrencySymbol(business?.currency);
  const gstMode: "inclusive" | "exclusive" =
    business?.gstMode === "inclusive" ? "inclusive" : "exclusive";
  const paymentModes = useMemo(
    () => resolvePaymentModesFromSettings(business?.paymentModes),
    [business?.paymentModes]
  );

  const customersQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "customers") : null),
    [firestore, businessId]
  );
  const { data: customerListData } = useCollection<Customer>(customersQuery);
  const customerList = useMemo(() => customerListData || [], [customerListData]);

  const productsQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "products") : null),
    [firestore, businessId]
  );
  const { data: productListData } = useCollection<Product>(productsQuery);
  const productList = useMemo(() => productListData || [], [productListData]);

  const vendorsQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "vendors") : null),
    [firestore, businessId]
  );
  const { data: vendorListData } = useCollection<Vendor>(vendorsQuery);
  const vendorList = useMemo(() => vendorListData || [], [vendorListData]);

  const allMembershipsQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "memberships") : null),
    [firestore, businessId]
  );
  const { data: allMemberships = [] } = useCollection<any>(allMembershipsQuery);

  const tiersQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "loyaltyTiers") : null),
    [firestore, businessId]
  );
  const { data: tiersRaw } = useCollection<any>(tiersQuery);
  const tiers = tiersRaw || [];

  const recentInvoicesQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "invoices"),
            orderBy("createdAt", "desc"),
            limit(250)
          )
        : null,
    [firestore, businessId]
  );
  const { data: recentInvoicesData } = useCollection<any>(recentInvoicesQuery);

  const recentQuotesQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "quotations"),
            orderBy("createdAt", "desc"),
            limit(250)
          )
        : null,
    [firestore, businessId]
  );
  const { data: recentQuotesData } = useCollection<any>(recentQuotesQuery);

  const monthlyInvoicesCount = useMemo(
    () =>
      (recentInvoicesData || []).filter((inv: any) =>
        isCreatedInCurrentMonth(inv.createdAt || inv.isoDate)
      ).length,
    [recentInvoicesData]
  );

  const monthlyQuotesCount = useMemo(
    () =>
      (recentQuotesData || []).filter((q: any) => isCreatedInCurrentMonth(q.createdAt)).length,
    [recentQuotesData]
  );

  const billingQuota = useMemo(
    () => evaluateCoreQuota("billing", monthlyInvoicesCount, { limits, business }),
    [monthlyInvoicesCount, limits, business]
  );

  const quoteQuota = useMemo(
    () => evaluateCoreQuota("quotations", monthlyQuotesCount, { limits, business }),
    [monthlyQuotesCount, limits, business]
  );

  useEffect(() => {
    if (isRewardSyncMode && selectedCustomerId) {
      const isMember = (allMemberships || []).some(
        (m: any) => m.customerId === selectedCustomerId && m.status === "active"
      );
      if (!isMember) {
        setSelectedCustomerId("");
        setAppliedCoupons([]);
        setCouponOverrides({});
        setCouponOverrideReasons({});
        toast({
          variant: "destructive",
          title: "Customer Deselected",
          description: "Reward Sync requires an active loyalty membership.",
        });
      }
    }
  }, [isRewardSyncMode, selectedCustomerId, allMemberships]);

  useEffect(() => {
    if (paymentModes.length > 0 && !paymentModes.includes(paymentMode)) {
      setPaymentMode(paymentModes[0]);
    }
  }, [paymentModes, paymentMode]);

  useEffect(() => {
    async function fetchLoyalty() {
      if (!selectedCustomerId || !businessId) {
        setActiveMembership(null);
        setMemberCoupons([]);
        setCustomerActivities([]);
        return;
      }
      setIsLoyaltyLoading(true);
      try {
        const memQ = query(
          collection(firestore, "businesses", businessId, "memberships"),
          where("customerId", "==", selectedCustomerId),
          where("status", "==", "active")
        );
        const memSnap = await getDocs(memQ);
        setActiveMembership(!memSnap.empty ? memSnap.docs[0].data() : null);

        const actQ = query(
          collection(firestore, "businesses", businessId, "loyaltyActivity"),
          where("customerId", "==", selectedCustomerId)
        );
        const actSnap = await getDocs(actQ);
        setCustomerActivities(actSnap.docs.map((d) => ({ ...d.data(), id: d.id })));

        const couponsQ = query(
          collection(firestore, "businesses", businessId, "coupons"),
          where("status", "==", "active")
        );
        const couponsSnap = await getDocs(couponsQ);
        setMemberCoupons(couponsSnap.docs.map((d) => ({ ...d.data(), id: d.id })));
      } catch (e) {
        console.error("Loyalty Fetch Error:", e);
      } finally {
        setIsLoyaltyLoading(false);
      }
    }
    fetchLoyalty();
  }, [selectedCustomerId, businessId, firestore]);

  const selectedCustomer = useMemo(
    () => customerList.find((c) => c.id === selectedCustomerId),
    [selectedCustomerId, customerList]
  );

  const isInterState = useMemo(() => {
    if (!selectedCustomer || !business?.state) return false;
    return selectedCustomer.state?.trim().toLowerCase() !== business.state.trim().toLowerCase();
  }, [selectedCustomer, business]);

  const totals = useMemo(
    () =>
      calculateBillingTotals({
        items,
        manualAmount,
        manualGstRate,
        exemptAmount,
        advanceAmount,
        manualDiscount,
        appliedCoupons,
        paidAmount,
        isSplitPayment: !isQuotation && !isRewardSyncMode && isSplitPayment,
        splitPayments,
        isInterState,
        gstMode,
        isRewardSyncMode,
        discountPriority: portalConfig?.discountPriority || "percentage_first",
        couponOverrides,
      }),
    [
      items,
      manualAmount,
      manualGstRate,
      exemptAmount,
      advanceAmount,
      manualDiscount,
      appliedCoupons,
      paidAmount,
      isQuotation,
      isSplitPayment,
      splitPayments,
      isInterState,
      gstMode,
      isRewardSyncMode,
      portalConfig,
      couponOverrides,
    ]
  );

  const bestOffer = useMemo(
    () =>
      findBestCouponOffer(
        memberCoupons,
        customerActivities,
        totals.grossSubtotal,
        appliedCoupons
      ),
    [memberCoupons, customerActivities, totals.grossSubtotal, appliedCoupons]
  );

  const ewayCheck = useMemo(
    () =>
      evaluateEWayRequirement({
        finalPayout: totals.finalPayout,
        isQuotation,
        isRewardSyncMode,
        hasPhysicalGoods: items.length > 0 || Boolean(manualAmount),
      }),
    [totals.finalPayout, isQuotation, isRewardSyncMode, items.length, manualAmount]
  );

  const defaultFromPincode = extractPincode(business?.pincode, business?.address);
  const defaultToPincode = extractPincode(selectedCustomer?.pincode, selectedCustomer?.address);

  useEffect(() => {
    setEwayDetails((prev) => {
      const nextFrom = prev.fromPincode || defaultFromPincode;
      const nextTo = defaultToPincode || prev.toPincode;
      if (nextFrom === prev.fromPincode && nextTo === prev.toPincode) return prev;
      return {
        ...prev,
        fromPincode: nextFrom,
        toPincode: nextTo,
      };
    });
  }, [defaultFromPincode, defaultToPincode]);

  const billingMode: BillingMode = isRewardSyncMode
    ? "reward_sync"
    : isQuotation
      ? "quotation"
      : "pos";

  const handleModeChange = (nextMode: BillingMode) => {
    if (nextMode === "reward_sync") {
      setIsRewardSyncMode(true);
      setIsQuotation(false);
      setIsSplitPayment(false);
      setItems([]);
    } else if (nextMode === "quotation") {
      setIsRewardSyncMode(false);
      setIsQuotation(true);
      setIsSplitPayment(false);
    } else {
      setIsRewardSyncMode(false);
      setIsQuotation(false);
    }
  };

  const handleToggleSplitPayment = (enabled: boolean) => {
    if (enabled && splitPayments.length < 2) {
      const firstMode = paymentModes[0] || "Cash";
      const secondMode = paymentModes.find((m: string) => m !== firstMode) || firstMode;
      const prefillFirst = Math.max(0, parseFloat(paidAmount) || 0);
      const firstAmt =
        prefillFirst > 0 && prefillFirst <= totals.finalPayout
          ? prefillFirst
          : Math.round(totals.finalPayout / 2);
      const secondAmt = Math.max(0, totals.finalPayout - firstAmt);
      setSplitPayments([
        { id: `sp_${Date.now()}_1`, mode: firstMode, amount: String(firstAmt) },
        { id: `sp_${Date.now()}_2`, mode: secondMode, amount: String(secondAmt) },
      ]);
    }
    setIsSplitPayment(enabled);
  };

  const resetBillDraft = () => {
    setItems([]);
    setSelectedCustomerId("");
    setPaidAmount("");
    setIsSplitPayment(false);
    setSplitPayments([]);
    setManualDiscount(0);
    setAppliedCoupons([]);
    setManualAmount("");
    setExemptAmount("");
    setAdvanceAmount("");
    setPaymentNote("");
    setManualOverrideReason("");
    setExternalBillNo("");
    setCouponCode("");
    setCouponOverrides({});
    setCouponOverrideReasons({});
    setEwayDetails(createDefaultEWayDetails({ fromPincode: defaultFromPincode }));
  };

  const handleApplyCoupon = async (codeParam?: string) => {
    const code = (codeParam || couponCode).toUpperCase().trim();
    if (!code || !businessId) return;

    const alreadyApplied = appliedCoupons.some((c) => c.code === code);
    if (alreadyApplied) {
      setAppliedCoupons((prev) => prev.filter((c) => c.code !== code));
      setCouponOverrides((prev) => {
        const next = { ...prev };
        delete next[code];
        return next;
      });
      setCouponOverrideReasons((prev) => {
        const next = { ...prev };
        delete next[code];
        return next;
      });
      if (couponCode === code) setCouponCode("");
      toast({ title: "Coupon Removed" });
      return;
    }

    const couponRef = doc(firestore, "businesses", businessId, "coupons", code);
    const couponSnap = await getDoc(couponRef);

    if (!couponSnap.exists()) {
      toast({ variant: "destructive", title: "Invalid Coupon Code" });
      return;
    }

    const cData: any = { ...couponSnap.data(), id: couponSnap.id };

    if (cData.status !== "active") {
      toast({ variant: "destructive", title: "Coupon Expired" });
      return;
    }
    if (cData.usageLimit > 0 && cData.usageCount >= cData.usageLimit) {
      toast({
        variant: "destructive",
        title: "Limit Reached",
        description: "Campaign redemption limit has been exhausted.",
      });
      return;
    }
    if (totals.grossSubtotal < (cData.minOrder || 0)) {
      toast({ variant: "destructive", title: "Minimum order amount not met" });
      return;
    }

    const userRedemptions = (customerActivities || []).filter(
      (a) => a.type === "coupon_redeem" && (a.couponCode === code || a.couponId === cData.id)
    );
    if (userRedemptions.length >= (cData.perUserLimit || 1)) {
      toast({
        variant: "destructive",
        title: "Limit Reached",
        description: "Customer has already redeemed this offer.",
      });
      return;
    }

    if (portalConfig?.dailyNodeProtectionEnabled && !cData.isStackable) {
      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setHours(1, 30, 0, 0);
      if (now < cutoff) cutoff.setDate(cutoff.getDate() - 1);

      const todayRedemptions = (customerActivities || []).filter((a) => {
        if (a.type !== "coupon_redeem") return false;
        const ts = a.timestamp ? new Date(a.timestamp) : new Date(0);
        return ts >= cutoff;
      });

      const hasExclusiveRedeemedToday = todayRedemptions.some((a) => {
        const couponNode = memberCoupons.find(
          (mc) => mc.id === a.couponId || mc.code === a.couponCode
        );
        return couponNode && !couponNode.isStackable;
      });

      if (hasExclusiveRedeemedToday) {
        toast({
          variant: "destructive",
          title: "Daily Reward Limit Active",
          description: "An exclusive reward was already redeemed today (resets 1:30 AM).",
        });
        return;
      }
    }

    const isNewStackable = !!cData.isStackable;
    setAppliedCoupons((prev) =>
      isNewStackable ? [...prev, cData] : [...prev.filter((c) => !!c.isStackable), cData]
    );
    setCouponCode(code);
    toast({ title: "Coupon Applied" });
  };

  const dispatchWhatsAppBill = async (
    type: "pos" | "sync",
    payload: any,
    customerObj: any,
    currentTotals: any
  ) => {
    const activeAddonIds = business?.activeAddonIds || [];
    const isEntitled =
      activeAddonIds.includes("feat_whatsapp") || activeAddonIds.includes("suite_growth");
    if (!isEntitled) return;

    const waConfig = business?.whatsappApiConfig;
    if (!waConfig?.isVerified || !customerObj?.phone || !businessId) return;

    const templateName =
      type === "pos" ? waConfig.posTemplateName : waConfig.rewardSyncTemplateName;
    const lang =
      type === "pos"
        ? waConfig.posLanguageCode || "en_IN"
        : waConfig.rewardSyncLanguageCode || "en_IN";
    if (!templateName) return;

    const cleanPhone = customerObj.phone.replace(/\D/g, "");
    const targetPhone = cleanPhone.length === 10 ? "91" + cleanPhone : cleanPhone;
    const trackUrl = `${window.location.origin}/loyalty/track/${businessId}/mem_c_${cleanPhone.slice(-10)}`;
    const couponsString = appliedCoupons.map((c) => c.code).join(", ") || "NONE";
    const totalSavingsValue =
      currentTotals.couponApplied +
      (type === "pos" ? currentTotals.manualDiscountApplied : 0);

    let parameters: any[] = [];
    let logMessageText = "";

    if (type === "pos") {
      parameters = [
        { type: "text", text: customerObj.name },
        { type: "text", text: payload.invoiceId },
        { type: "text", text: `${currencySymbol}${currentTotals.grossSubtotal.toLocaleString()}` },
        { type: "text", text: couponsString },
        { type: "text", text: `${currencySymbol}${totalSavingsValue.toLocaleString()}` },
        { type: "text", text: `${currencySymbol}${currentTotals.finalPayout.toLocaleString()}` },
        { type: "text", text: trackUrl },
      ];
      logMessageText = `POS Bill Sent: ${payload.invoiceId} (Total: ${currencySymbol}${currentTotals.finalPayout.toLocaleString()})`;
    } else {
      parameters = [
        { type: "text", text: customerObj.name },
        { type: "text", text: payload.externalRef || "N/A" },
        { type: "text", text: `${currencySymbol}${currentTotals.grossSubtotal.toLocaleString()}` },
        { type: "text", text: `${currencySymbol}${currentTotals.couponApplied.toLocaleString()}` },
        { type: "text", text: `${currencySymbol}${currentTotals.finalPayout.toLocaleString()}` },
        { type: "text", text: trackUrl },
      ];
      logMessageText = `Reward Sync Sent (Ref: ${payload.externalRef || "N/A"}). Saved: ${currencySymbol}${currentTotals.couponApplied.toLocaleString()}`;
    }

    try {
      await sendWhatsAppTemplate(
        businessId,
        { phoneId: waConfig.phoneId },
        targetPhone,
        templateName,
        lang,
        [{ type: "body", parameters }]
      );

      const chatId = targetPhone;
      const chatRef = doc(firestore, "businesses", businessId, "chats", chatId);
      const msgRef = doc(
        collection(firestore, "businesses", businessId, "chats", chatId, "messages")
      );

      setDoc(
        chatRef,
        {
          id: chatId,
          customerName: customerObj.name,
          lastMessage: logMessageText,
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setDoc(msgRef, {
        text: logMessageText,
        direction: "outbound",
        type: "template",
        templateName,
        timestamp: serverTimestamp(),
        status: "sent",
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadPDF = async (mode: "a4" | "thermal") => {
    if (!lastInvoice) return;
    const elementId = mode === "a4" ? "printable-invoice" : "thermal-printable";
    const element = document.getElementById(elementId);

    if (!element) {
      toast({ variant: "destructive", title: "Error", description: "Print template not ready." });
      return;
    }

    setIsDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      window.scrollTo(0, 0);

      const canvas = await html2canvas(element, {
        scale: 2.0,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: mode === "a4" ? 794 : 272,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById(elementId);
          if (clonedElement) {
            clonedElement.style.opacity = "1";
            clonedElement.style.visibility = "visible";
            clonedElement.style.position = "absolute";
            clonedElement.style.top = "0";
            clonedElement.style.left = "0";
            clonedElement.style.display = "block";
            if (mode === "a4") {
              clonedElement.style.width = "210mm";
              clonedElement.style.minHeight = "297mm";
            } else {
              clonedElement.style.width = "72mm";
            }
          }
        },
      });

      const imgData = canvas.toDataURL("image/jpeg", 1.0);

      if (mode === "a4") {
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
        pdf.save(
          `${lastInvoice.type === "quotation" ? "Quotation" : "Invoice"}_${lastInvoice.invoiceId}.pdf`
        );
      } else {
        const imgWidth = 72;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: [imgWidth, imgHeight],
        });
        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
        pdf.save(`Receipt_${lastInvoice.invoiceId}.pdf`);
      }

      toast({ title: "PDF Downloaded" });
    } catch (error) {
      console.error("PDF Error:", error);
      toast({ variant: "destructive", title: "Download Failed" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrintAction = (mode: "a4" | "thermal") => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!selectedCustomerId || !businessId) return;

    if (isQuotation && quoteQuota.isReached) {
      toast({
        variant: "destructive",
        title: quoteQuota.isLockedByMode ? "Module Upgrade Required" : "Monthly Quotation Limit Reached",
        description: quoteQuota.isLockedByMode
          ? `Activate ${quoteQuota.menu.addonLabel} in Marketplace to create quotations.`
          : `Your plan includes ${quoteQuota.limit} quotations/month. Upgrade ${quoteQuota.menu.addonLabel} for unlimited estimates.`,
      });
      return;
    }

    if (!isQuotation && !isRewardSyncMode && billingQuota.isReached) {
      toast({
        variant: "destructive",
        title: billingQuota.isLockedByMode ? "Module Upgrade Required" : "Monthly Invoice Limit Reached",
        description: billingQuota.isLockedByMode
          ? `Activate ${billingQuota.menu.addonLabel} in Marketplace to issue POS invoices.`
          : `Your plan includes ${billingQuota.limit} POS invoices/month. Upgrade ${billingQuota.menu.addonLabel} for unlimited billing.`,
      });
      return;
    }

    if (isRewardSyncMode && !manualAmount) {
      toast({
        variant: "destructive",
        title: "Bill Amount Required",
        description: "Please enter the total bill amount for Reward Sync.",
      });
      return;
    }

    if (!isRewardSyncMode && items.length === 0 && !manualAmount) {
      toast({
        variant: "destructive",
        title: "Bill Is Empty",
        description: "Add at least one item or enter a manual amount.",
      });
      return;
    }

    const overStockItem = items.find((i) => i.quantity > i.stock);
    if (!isQuotation && !isRewardSyncMode && overStockItem) {
      toast({
        variant: "destructive",
        title: "Insufficient stock available.",
        description: `Product: ${overStockItem.name}`,
      });
      return;
    }

    setIsSaving(true);
    const batch = writeBatch(firestore);

    try {
      if (isQuotation) {
        const quoteId = `Q-${Math.floor(1000 + Math.random() * 9000)}`;
        const qRef = doc(firestore, "businesses", businessId, "quotations", quoteId);
        const quoteItems =
          items.length > 0
            ? items
            : [
                {
                  name: "Manual Quote",
                  quantity: 1,
                  price: parseFloat(manualAmount || "0"),
                  gstRate: parseFloat(manualGstRate),
                },
              ];

        batch.set(
          qRef,
          {
            id: quoteId,
            quotationId: quoteId,
            businessId,
            customerId: selectedCustomerId,
            customerName: selectedCustomer?.name,
            items: quoteItems,
            totals,
            status: "sent",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        setSplitInvoices([]);
        setActiveSplitIndex(0);
        setLastInvoice({
          invoiceId: quoteId,
          type: "quotation",
          customerName: selectedCustomer?.name,
          customerPhone: selectedCustomer?.phone,
          customerAddress: selectedCustomer?.address,
          customerGstin: selectedCustomer?.gstin,
          items: quoteItems,
          totals,
          date: new Date().toLocaleDateString("en-IN"),
          paymentMode: "Draft",
          couponCodes: appliedCoupons.map((c) => c.code).join(", "),
        });
        await commitBatchNonBlocking(batch);
        setIsSuccessOpen(true);
      } else if (isRewardSyncMode) {
        const syncId = `SYNC-${Math.floor(1000 + Math.random() * 9000)}`;
        let pointsToEarn = 0;

        if (appliedCoupons.length > 0) {
          appliedCoupons.forEach((c) => {
            const couponDocRef = doc(firestore, "businesses", businessId, "coupons", c.code);
            batch.update(couponDocRef, { usageCount: increment(1) });

            const rewardValue =
              couponOverrides[c.code] !== undefined
                ? couponOverrides[c.code]
                : totals.couponApplied / appliedCoupons.length;

            const activityRef = doc(
              collection(firestore, "businesses", businessId, "loyaltyActivity")
            );
            batch.set(activityRef, {
              customerId: selectedCustomerId,
              customerName: selectedCustomer?.name,
              type: "coupon_redeem",
              couponId: c.id,
              couponCode: c.code,
              cashback: rewardValue,
              timestamp: new Date().toISOString(),
              description: `Redeemed ${c.code} via Reward Sync (Ref: ${externalBillNo || "N/A"})`,
            });
          });
        }

        if (activeMembership) {
          const tierRef = tiers.find(
            (t: any) => t.name.toLowerCase() === (activeMembership.tier || "").toLowerCase()
          );
          const multiplier = parseFloat(
            activeMembership.pointsMultiplier ?? tierRef?.pointsMultiplier ?? 1
          );
          pointsToEarn = Math.floor(totals.grossSubtotal * multiplier);
          const memberDocRef = doc(
            firestore,
            "businesses",
            businessId,
            "memberships",
            activeMembership.id
          );
          batch.update(memberDocRef, { rewardPoints: increment(pointsToEarn) });

          const rewardActivityRef = doc(
            collection(firestore, "businesses", businessId, "loyaltyActivity")
          );
          batch.set(rewardActivityRef, {
            customerId: activeMembership.customerId,
            customerName: selectedCustomer?.name,
            type: "purchase_reward",
            points: pointsToEarn,
            invoiceValue: totals.grossSubtotal,
            timestamp: new Date().toISOString(),
            description: `Points earned from bill sync (Ref: ${externalBillNo || "N/A"})`,
          });
        }

        const customerRef = doc(
          firestore,
          "businesses",
          businessId,
          "customers",
          selectedCustomerId
        );
        batch.update(customerRef, {
          totalSpent: increment(totals.grossSubtotal),
          visitCount: increment(1),
          lastVisitDate: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });

        setSplitInvoices([]);
        setActiveSplitIndex(0);
        setLastInvoice({
          invoiceId: syncId,
          type: "sales",
          customerName: selectedCustomer?.name,
          customerPhone: selectedCustomer?.phone,
          totals,
          date: new Date().toLocaleDateString("en-IN"),
          paymentMode: "Loyalty Sync",
          paymentNote: `Sync Ref: ${externalBillNo}`,
          items: [
            {
              name: `Loyalty Sync: ${externalBillNo || "Manual"}`,
              quantity: 1,
              price: parseFloat(manualAmount),
              gstRate: parseFloat(manualGstRate),
            },
          ],
        });

        await commitBatchNonBlocking(batch);
        await dispatchWhatsAppBill(
          "sync",
          { externalRef: externalBillNo, points: pointsToEarn },
          selectedCustomer,
          totals
        );

        setIsSuccessOpen(true);
        resetBillDraft();
      } else {
        const activeSplits = isSplitPayment
          ? splitPayments
              .map((sp) => ({
                mode: sp.mode,
                amount: Math.max(0, parseFloat(sp.amount) || 0),
              }))
              .filter((sp) => sp.amount > 0)
          : [];
        const resolvedPaymentMode =
          isSplitPayment && activeSplits.length > 0
            ? activeSplits.length === 1
              ? activeSplits[0].mode
              : "Split Payment"
            : paymentMode;

        const invoiceId = generateUniqueInvoiceId(business?.name);
        const todayIso = new Date().toISOString().split("T")[0];
        const todayDisplay = new Date().toLocaleDateString("en-IN");

        items.forEach((item) => {
          const productRef = doc(firestore, "businesses", businessId, "products", item.productId);
          batch.update(productRef, { stock: increment(-item.quantity) });
        });

        const customerRef = doc(
          firestore,
          "businesses",
          businessId,
          "customers",
          selectedCustomerId
        );
        batch.update(customerRef, {
          creditBalance: increment(totals.dueAmount),
          totalSpent: increment(totals.grossSubtotal),
          visitCount: increment(1),
          lastVisitDate: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });

        if (incomingQuoteId) {
          const oldQRef = doc(firestore, "businesses", businessId, "quotations", incomingQuoteId);
          batch.update(oldQRef, { status: "converted", updatedAt: serverTimestamp() });
        }

        const particulars = `POS Sale: ${invoiceId} - ${selectedCustomer?.name || "Customer"}`;
        if (isSplitPayment && activeSplits.length > 0) {
          activeSplits.forEach((sp) => {
            const cbRef = doc(collection(firestore, "businesses", businessId, "cashbook"));
            batch.set(cbRef, {
              businessId,
              type: "credit",
              amount: sp.amount,
              particulars: `POS Sale: ${invoiceId} (${sp.mode}) - ${selectedCustomer?.name || "Customer"}`,
              category: "Sales",
              paymentMode: sp.mode,
              entryBy: userProfile?.name || "System",
              date: todayIso,
              createdAt: serverTimestamp(),
              paymentNote: paymentNote || null,
            });
          });
        } else if (totals.collected > 0) {
          const cbRef = doc(collection(firestore, "businesses", businessId, "cashbook"));
          batch.set(cbRef, {
            businessId,
            type: "credit",
            amount: totals.collected,
            particulars,
            category: "Sales",
            paymentMode: resolvedPaymentMode,
            entryBy: userProfile?.name || "System",
            date: todayIso,
            createdAt: serverTimestamp(),
            paymentNote: paymentNote || null,
          });
        }

        if (appliedCoupons.length > 0) {
          appliedCoupons.forEach((c) => {
            const couponDocRef = doc(firestore, "businesses", businessId, "coupons", c.code);
            batch.update(couponDocRef, { usageCount: increment(1) });

            const rewardValue =
              couponOverrides[c.code] !== undefined
                ? couponOverrides[c.code]
                : totals.couponApplied / appliedCoupons.length;

            const activityRef = doc(
              collection(firestore, "businesses", businessId, "loyaltyActivity")
            );
            batch.set(activityRef, {
              customerId: selectedCustomerId,
              customerName: selectedCustomer?.name,
              type: "coupon_redeem",
              couponId: c.id,
              couponCode: c.code,
              cashback: rewardValue,
              timestamp: new Date().toISOString(),
              description: `Redeemed ${c.code} at checkout.`,
            });
          });
        }

        if (activeMembership) {
          const tierRef = tiers.find(
            (t: any) => t.name.toLowerCase() === (activeMembership.tier || "").toLowerCase()
          );
          const multiplier = parseFloat(
            activeMembership.pointsMultiplier ?? tierRef?.pointsMultiplier ?? 1
          );
          const pointsToEarn = Math.floor(totals.grossSubtotal * multiplier);
          const memberDocRef = doc(
            firestore,
            "businesses",
            businessId,
            "memberships",
            activeMembership.id
          );
          batch.update(memberDocRef, { rewardPoints: increment(pointsToEarn) });
        }

        const finalizedItems =
          items.length > 0
            ? [...items]
            : [
                {
                  id: "manual_1",
                  productId: "manual_entry",
                  name: particulars,
                  hsnCode: "",
                  quantity: 1,
                  price: parseFloat(manualAmount || "0"),
                  gstRate: parseFloat(manualGstRate),
                  stock: 999,
                  itemDiscount: 0,
                },
              ];

        const finalEwayBill: EWayBillDetails = {
          ...ewayDetails,
          enabled: ewayDetails.enabled || ewayCheck.required,
          fromPincode: ewayDetails.fromPincode || defaultFromPincode,
          toPincode: ewayDetails.toPincode || defaultToPincode,
          ewbStatus: ewayDetails.ewbNumber
            ? "GENERATED"
            : ewayDetails.enabled || ewayCheck.required
              ? "PENDING_PORTAL"
              : "NOT_REQUIRED",
        };

        const invoiceDocPayload = {
          id: invoiceId,
          invoiceId,
          businessId,
          type: "sales",
          customerId: selectedCustomerId,
          customerName: selectedCustomer?.name || "Customer",
          customerPhone: selectedCustomer?.phone || "",
          customerAddress: selectedCustomer?.address || "",
          customerState: selectedCustomer?.state || business?.state || "",
          customerGstin: selectedCustomer?.gstin || "",
          items: finalizedItems,
          totals,
          date: todayDisplay,
          isoDate: todayIso,
          paymentMode: resolvedPaymentMode,
          ...(activeSplits.length > 0 ? { splitPayments: activeSplits } : {}),
          paymentNote: paymentNote || "",
          couponCodes: appliedCoupons.map((c) => c.code).join(", "),
          ewayBill: finalEwayBill,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        batch.set(
          doc(firestore, "businesses", businessId, "invoices", invoiceId),
          invoiceDocPayload
        );

        setSplitInvoices([]);
        setActiveSplitIndex(0);
        setLastInvoice(invoiceDocPayload);

        await commitBatchNonBlocking(batch);
        await dispatchWhatsAppBill(
          "pos",
          { invoiceId, amount: totals.finalPayout },
          selectedCustomer,
          totals
        );

        setIsSuccessOpen(true);
        resetBillDraft();
      }
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Billing Error", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenSplitBill = () => {
    if (items.length === 0 && !manualAmount) {
      toast({
        variant: "destructive",
        title: "Bill Is Empty",
        description: "Add at least one item or amount before splitting the bill.",
      });
      return;
    }
    const overStockItem = items.find((i) => i.quantity > i.stock);
    if (overStockItem) {
      toast({
        variant: "destructive",
        title: "Insufficient stock available.",
        description: `Product: ${overStockItem.name}`,
      });
      return;
    }
    setIsSplitBillOpen(true);
  };

  const handleConfirmSplitBill = async (
    parts: SplitBillPartPayload[],
    splitType: "equal" | "items"
  ) => {
    if (isSaving || !businessId || parts.length < 2) return;
    if (
      billingQuota.isReached ||
      (!billingQuota.isUnlocked &&
        billingQuota.limit < 999999 &&
        billingQuota.current + parts.length > billingQuota.limit)
    ) {
      toast({
        variant: "destructive",
        title: billingQuota.isLockedByMode ? "Module Upgrade Required" : "Monthly Invoice Limit Reached",
        description: billingQuota.isLockedByMode
          ? `Activate ${billingQuota.menu.addonLabel} in Marketplace to split POS invoices.`
          : `Splitting into ${parts.length} bills exceeds your ${billingQuota.limit} invoices/month quota.`,
      });
      return;
    }
    const overStockItem = items.find((i) => i.quantity > i.stock);
    if (overStockItem) {
      toast({
        variant: "destructive",
        title: "Insufficient stock available.",
        description: `Product: ${overStockItem.name}`,
      });
      return;
    }

    setIsSaving(true);
    const batch = writeBatch(firestore);

    try {
      // Deduct inventory stock strictly once across original cart items
      items.forEach((item) => {
        if (item.productId && item.productId !== "split_share") {
          const productRef = doc(firestore, "businesses", businessId, "products", item.productId);
          batch.update(productRef, { stock: increment(-item.quantity) });
        }
      });

      // Aggregate per-customer updates so each unique customer document is updated once
      const customerUpdates = new Map<
        string,
        { dueDelta: number; spentDelta: number; visitsDelta: number }
      >();
      parts.forEach((p) => {
        const existing = customerUpdates.get(p.customerId) || {
          dueDelta: 0,
          spentDelta: 0,
          visitsDelta: 0,
        };
        existing.dueDelta += p.totals.dueAmount;
        existing.spentDelta += p.totals.grossSubtotal;
        existing.visitsDelta += 1;
        customerUpdates.set(p.customerId, existing);
      });

      customerUpdates.forEach((agg, custId) => {
        const customerRef = doc(firestore, "businesses", businessId, "customers", custId);
        batch.update(customerRef, {
          creditBalance: increment(agg.dueDelta),
          totalSpent: increment(agg.spentDelta),
          visitCount: increment(agg.visitsDelta),
          lastVisitDate: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });
      });

      if (incomingQuoteId) {
        const oldQRef = doc(firestore, "businesses", businessId, "quotations", incomingQuoteId);
        batch.update(oldQRef, { status: "converted", updatedAt: serverTimestamp() });
      }

      const generatedInvoices: any[] = [];
      const todayIso = new Date().toISOString().split("T")[0];
      const todayDisplay = new Date().toLocaleDateString("en-IN");
      const baseInvoiceId = generateUniqueInvoiceId(business?.name);

      parts.forEach((p, idx) => {
        const partInvoiceId = `${baseInvoiceId.slice(0, 13)}S${idx + 1}`;
        const splitMemo = paymentNote
          ? `${paymentNote} · Split ${idx + 1}/${parts.length} (${splitType})`
          : `Split Bill ${idx + 1}/${parts.length} (${splitType})`;

        if (p.paidAmount > 0) {
          const cbRef = doc(collection(firestore, "businesses", businessId, "cashbook"));
          batch.set(cbRef, {
            businessId,
            type: "credit",
            amount: p.paidAmount,
            particulars: `POS Split (${idx + 1}/${parts.length}): ${partInvoiceId} (${p.paymentMode}) - ${p.customerObj?.name || "Customer"}`,
            category: "Sales",
            paymentMode: p.paymentMode,
            entryBy: userProfile?.name || "System",
            date: todayIso,
            createdAt: serverTimestamp(),
            paymentNote: splitMemo,
          });
        }

        const partRequiresEway = p.totals.finalPayout > 50000;
        const partEwayBill: EWayBillDetails = {
          ...ewayDetails,
          enabled: ewayDetails.enabled || partRequiresEway,
          fromPincode: ewayDetails.fromPincode || defaultFromPincode,
          toPincode:
            extractPincode(p.customerObj?.pincode, p.customerObj?.address) ||
            ewayDetails.toPincode,
          ewbNumber: "",
          ewbDate: "",
          ewbValidUpto: "",
          ewbStatus:
            ewayDetails.enabled || partRequiresEway ? "PENDING_PORTAL" : "NOT_REQUIRED",
        };

        const splitInvoicePayload = {
          id: partInvoiceId,
          invoiceId: partInvoiceId,
          businessId,
          type: "sales",
          customerId: p.customerId,
          customerName: p.customerObj?.name || "Customer",
          customerPhone: p.customerObj?.phone || "",
          customerAddress: p.customerObj?.address || "",
          customerState: p.customerObj?.state || business?.state || "",
          customerGstin: p.customerObj?.gstin || "",
          items: p.items,
          totals: p.totals,
          date: todayDisplay,
          isoDate: todayIso,
          paymentMode: p.paymentMode,
          paymentNote: splitMemo,
          couponCodes: "",
          ewayBill: partEwayBill,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        batch.set(
          doc(firestore, "businesses", businessId, "invoices", partInvoiceId),
          splitInvoicePayload
        );
        generatedInvoices.push(splitInvoicePayload);
      });

      await commitBatchNonBlocking(batch);

      await Promise.allSettled(
        parts.map((p, idx) =>
          p.customerObj?.phone
            ? dispatchWhatsAppBill(
                "pos",
                {
                  invoiceId: generatedInvoices[idx].invoiceId,
                  amount: p.totals.finalPayout,
                },
                p.customerObj,
                p.totals
              )
            : Promise.resolve()
        )
      );

      setSplitInvoices(generatedInvoices);
      setActiveSplitIndex(0);
      setLastInvoice(generatedInvoices[0]);
      setIsSplitBillOpen(false);
      setIsSuccessOpen(true);
      resetBillDraft();
      toast({
        title: `${generatedInvoices.length} Split Bills Generated`,
        description: "Inventory, invoices, and customer balances updated.",
      });
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Split Billing Error", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEwbNumber = async (
    invoiceId: string,
    ewbNumber: string,
    validUpto: string
  ) => {
    if (!businessId || !invoiceId) return;
    const updatedDate = new Date().toLocaleDateString("en-IN");
    await updateDoc(doc(firestore, "businesses", businessId, "invoices", invoiceId), {
      "ewayBill.enabled": true,
      "ewayBill.ewbNumber": ewbNumber,
      "ewayBill.ewbValidUpto": validUpto,
      "ewayBill.ewbDate": updatedDate,
      "ewayBill.ewbStatus": "GENERATED",
      updatedAt: serverTimestamp(),
    });

    setLastInvoice((prev: any) =>
      prev && prev.invoiceId === invoiceId
        ? {
            ...prev,
            ewayBill: {
              ...(prev.ewayBill || {}),
              enabled: true,
              ewbNumber,
              ewbValidUpto: validUpto,
              ewbDate: updatedDate,
              ewbStatus: "GENERATED",
            },
          }
        : prev
    );
    setSplitInvoices((prev) =>
      prev.map((inv) =>
        inv.invoiceId === invoiceId
          ? {
              ...inv,
              ewayBill: {
                ...(inv.ewayBill || {}),
                enabled: true,
                ewbNumber,
                ewbValidUpto: validUpto,
                ewbDate: updatedDate,
                ewbStatus: "GENERATED",
              },
            }
          : inv
      )
    );
    toast({
      title: "E-Way Bill Number Saved",
      description: `EWB ${ewbNumber} linked to ${invoiceId}.`,
    });
  };

  const handleDownloadEWayJson = () => {
    if (!lastInvoice) return;
    const payload = buildNicEWayBillJson([lastInvoice], business);
    downloadNicJsonFile(payload, `EWayBill_${lastInvoice.invoiceId}.json`);
    toast({
      title: "NIC E-Way Bill JSON Downloaded",
      description: "Upload this file on ewaybillgst.gov.in (Generate Bulk) to get your 12-digit EWB No.",
    });
  };

  const handleGenerateLiveEwb = async (invoiceId: string) => {
    if (!businessId || !user || !invoiceId) return;
    setIsGeneratingLiveEwb(true);
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
          ewayDetails: lastInvoice?.ewayBill,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !data?.ewayBill) {
        toast({
          variant: "destructive",
          title: "Live E-Way Generation Failed",
          description: data?.message || "Please check GSP credentials or Part-B details.",
        });
        return;
      }

      const nextEway = data.ewayBill;
      setLastInvoice((prev: any) =>
        prev && prev.invoiceId === invoiceId ? { ...prev, ewayBill: nextEway } : prev
      );
      setSplitInvoices((prev) =>
        prev.map((inv) => (inv.invoiceId === invoiceId ? { ...inv, ewayBill: nextEway } : inv))
      );
      toast({
        title: `Live EWB ${nextEway.ewbNumber} Generated`,
        description: nextEway.ewbValidUpto
          ? `Valid upto ${nextEway.ewbValidUpto}`
          : "Synced to invoice and print templates.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "E-Way API Error",
        description: err?.message || "Could not reach E-Way Bill API.",
      });
    } finally {
      setIsGeneratingLiveEwb(false);
    }
  };

  const addItem = (product: Product) => {
    if (!isQuotation && product.stock <= 0) {
      toast({
        variant: "destructive",
        title: "Insufficient stock available.",
        description: "This product is currently out of stock.",
      });
      return;
    }

    const existing = items.find((i) => i.productId === product.id);
    if (existing) {
      if (!isQuotation && existing.quantity + 1 > existing.stock) {
        toast({ variant: "destructive", title: "Insufficient stock available." });
        return;
      }
      setItems(
        items.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setItems([
        ...items,
        {
          id: Math.random().toString(36).substr(2, 9),
          productId: product.id,
          name: product.name,
          hsnCode: product.hsnCode || "",
          quantity: 1,
          price: product.price,
          originalPrice: product.price,
          gstRate: product.gstRate || 0,
          stock: product.stock || 0,
          itemDiscount: 0,
          rateChangeReason: "",
        },
      ]);
    }
    setProductSearch("");
    setShowProductDropdown(false);
  };

  const handleOpenPreview = () => {
    if (!selectedCustomerId) {
      toast({
        variant: "destructive",
        title: "Customer Required",
        description: "Select a customer before previewing the invoice.",
      });
      return;
    }
    const activeSplits = isSplitPayment
      ? splitPayments
          .map((sp) => ({
            mode: sp.mode,
            amount: Math.max(0, parseFloat(sp.amount) || 0),
          }))
          .filter((sp) => sp.amount > 0)
      : [];
    const resolvedPreviewMode = isRewardSyncMode
      ? "Loyalty Sync"
      : isSplitPayment && activeSplits.length > 0
        ? activeSplits.length === 1
          ? activeSplits[0].mode
          : "Split Payment"
        : paymentMode;

    setLastInvoice({
      invoiceId: isQuotation ? "QUOTE_PREVIEW" : isRewardSyncMode ? "SYNC_PREVIEW" : "POS_PREVIEW",
      type: isQuotation ? "quotation" : "sales",
      customerName: selectedCustomer?.name,
      customerPhone: selectedCustomer?.phone,
      customerAddress: selectedCustomer?.address,
      customerGstin: selectedCustomer?.gstin,
      items:
        items.length > 0
          ? [...items]
          : [
              {
                name: `Manual Entry: ${manualAmount || "0"}`,
                quantity: 1,
                price: parseFloat(manualAmount || "0"),
                gstRate: parseFloat(manualGstRate),
              },
            ],
      totals,
      date: new Date().toLocaleDateString("en-IN"),
      paymentMode: resolvedPreviewMode,
      splitPayments: activeSplits.length > 0 ? activeSplits : undefined,
      paymentNote: isRewardSyncMode ? `Sync Ref: ${externalBillNo}` : paymentNote,
      couponCodes: appliedCoupons.map((c) => c.code).join(", "),
      ewayBill: ewayDetails.enabled ? ewayDetails : undefined,
    });
    setIsPreviewOpen(true);
  };

  if (isProfileLoading || isQuoteLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-slate-900">
        <Loader2 className="animate-spin h-6 w-6 text-primary" />
      </div>
    );
  }

  const hasActiveDraft =
    Boolean(selectedCustomerId) ||
    items.length > 0 ||
    Boolean(manualAmount) ||
    Boolean(paidAmount);

  return (
    <div
      className={cn(
        "space-y-6 pb-20 text-left",
        printMode === "thermal" ? "print-thermal" : "print-a4"
      )}
    >
      <div className={cn(printMode !== "a4" && "print:hidden")}>
        <InvoicePrintTemplate
          invoice={lastInvoice}
          business={business}
          currencySymbol={currencySymbol}
        />
      </div>
      <div className={cn(printMode !== "thermal" && "print:hidden")}>
        <ThermalPrintTemplate
          invoice={lastInvoice}
          business={business}
          currencySymbol={currencySymbol}
        />
      </div>

      <div className="print:hidden space-y-6">
        {!isRewardSyncMode && (
          <CoreQuotaBanner quota={isQuotation ? quoteQuota : billingQuota} />
        )}
        <StatusHeader
          mode={billingMode}
          onModeChange={handleModeChange}
          gstMode={gstMode}
          businessState={business?.state}
          isInterState={isInterState}
          projectId={incomingProjectId}
          hasActiveDraft={hasActiveDraft}
          onResetBill={resetBillDraft}
        />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 space-y-6 min-w-0">
            <IdentitySection
              isRewardSyncMode={isRewardSyncMode}
              selectedCustomer={selectedCustomer}
              setSelectedCustomerId={setSelectedCustomerId}
              customerSearch={customerSearch}
              setCustomerSearch={setCustomerSearch}
              showCustomerDropdown={showCustomerDropdown}
              setShowCustomerDropdown={setShowCustomerDropdown}
              customerList={customerList}
              allMemberships={allMemberships}
              isLoyaltyLoading={isLoyaltyLoading}
              activeMembership={activeMembership}
              productSearch={productSearch}
              setProductSearch={setProductSearch}
              showProductDropdown={showProductDropdown}
              setShowProductDropdown={setShowProductDropdown}
              productList={productList}
              addItem={addItem}
              setIsAddCustomerOpen={setIsAddCustomerOpen}
              setIsAddProductOpen={setIsAddProductOpen}
              isQuotation={isQuotation}
              externalBillNo={externalBillNo}
              setExternalBillNo={setExternalBillNo}
              manualAmount={manualAmount}
              setManualAmount={setManualAmount}
              currencySymbol={currencySymbol}
              setAppliedCoupons={setAppliedCoupons}
              setCouponOverrides={setCouponOverrides}
              setCouponOverrideReasons={setCouponOverrideReasons}
              cartItems={items}
            />

            {selectedCustomerId && (
              <RewardCardsSection
                memberCoupons={memberCoupons}
                appliedCoupons={appliedCoupons}
                grossSubtotal={totals.grossSubtotal}
                handleApplyCoupon={handleApplyCoupon}
                activities={customerActivities}
                currencySymbol={currencySymbol}
              />
            )}

            {!isRewardSyncMode ? (
              <BillingCartTable
                items={items}
                setItems={setItems}
                isInterState={totals.isInterState}
                gstMode={gstMode}
                isQuotation={isQuotation}
                currencySymbol={currencySymbol}
                onOpenSplitBill={handleOpenSplitBill}
              />
            ) : (
              <section className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 p-6 flex items-start gap-3">
                <SmartphoneNfc className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-emerald-950">Reward Sync Mode Active</h3>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Inventory stock is untouched in this mode. Coupons redeemed and loyalty points awarded are synced directly to the customer&apos;s membership profile and WhatsApp tracker.
                  </p>
                </div>
              </section>
            )}

            {(items.length > 0 || Number(manualAmount) > 0) && (
              <div className="xl:hidden rounded-xl border border-slate-800 bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-300 font-medium">
                    {isQuotation ? "Quoted Total" : "Final Payable"} · {totals.qty} qty
                  </p>
                  <p className="font-mono tabular-nums text-lg font-extrabold text-white">
                    {currencySymbol}
                    {totals.finalPayout.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      document
                        .getElementById("billing-reconciliation-panel")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="h-9 px-3 rounded-lg border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white text-xs font-semibold whitespace-nowrap"
                  >
                    Payment Options
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!selectedCustomerId || isSaving}
                    onClick={handleSave}
                    className={cn(
                      "h-9 px-3.5 rounded-lg text-xs font-bold text-white whitespace-nowrap",
                      isQuotation
                        ? "bg-amber-600 hover:bg-amber-700"
                        : isRewardSyncMode
                          ? "bg-emerald-700 hover:bg-emerald-800"
                          : "bg-primary hover:bg-primary/90"
                    )}
                  >
                    {isQuotation
                      ? "Save Quote"
                      : isRewardSyncMode
                        ? "Sync Rewards"
                        : "Complete Sale"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div id="billing-reconciliation-panel" className="xl:col-span-4 min-w-0">
            <ReconciliationPanel
              isRewardSyncMode={isRewardSyncMode}
              selectedCustomerId={selectedCustomerId}
              bestOffer={bestOffer}
              totals={totals}
              manualAmount={manualAmount}
              setManualAmount={setManualAmount}
              manualOverrideReason={manualOverrideReason}
              setManualOverrideReason={setManualOverrideReason}
              manualGstRate={manualGstRate}
              setManualGstRate={setManualGstRate}
              exemptAmount={exemptAmount}
              setExemptAmount={setExemptAmount}
              advanceAmount={advanceAmount}
              setAdvanceAmount={setAdvanceAmount}
              manualDiscount={manualDiscount}
              setManualDiscount={setManualDiscount}
              couponCode={couponCode}
              setCouponCode={setCouponCode}
              handleApplyCoupon={handleApplyCoupon}
              currencySymbol={currencySymbol}
              isQuotation={isQuotation}
              paidAmount={paidAmount}
              setPaidAmount={setPaidAmount}
              paymentMode={paymentMode}
              setPaymentMode={setPaymentMode}
              paymentNote={paymentNote}
              setPaymentNote={setPaymentNote}
              handleOpenPreview={handleOpenPreview}
              handleSave={handleSave}
              appliedCoupons={appliedCoupons}
              isSaving={isSaving}
              paymentModes={paymentModes}
              couponOverrides={couponOverrides}
              setCouponOverrides={setCouponOverrides}
              couponOverrideReasons={couponOverrideReasons}
              setCouponOverrideReasons={setCouponOverrideReasons}
              isSplitPayment={isSplitPayment}
              onToggleSplitPayment={handleToggleSplitPayment}
              splitPayments={splitPayments}
              onChangeSplitPayments={setSplitPayments}
              onOpenSplitBill={handleOpenSplitBill}
              ewayDetails={ewayDetails}
              isEWayRequired={ewayCheck.required}
              onOpenEWayModal={() => setIsEWayModalOpen(true)}
            />
          </div>
        </div>
      </div>

      <PreviewDialog
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        lastInvoice={lastInvoice}
        business={business}
        currencySymbol={currencySymbol}
        isSaving={isSaving}
        isQuotation={isQuotation}
        handleSave={handleSave}
      />

      <NewCustomerDialog
        isOpen={isAddCustomerOpen}
        onOpenChange={setIsAddCustomerOpen}
        onSaveSuccess={setSelectedCustomerId}
        businessId={businessId!}
        currencySymbol={currencySymbol}
        defaultState={business?.defaultState || business?.state}
      />

      <QuickProductDialog
        isOpen={isAddProductOpen}
        onOpenChange={setIsAddProductOpen}
        onSaveSuccess={addItem}
        business={business}
        vendorList={vendorList}
        userProfile={userProfile}
        currencySymbol={currencySymbol}
      />

      <EWayBillModal
        isOpen={isEWayModalOpen}
        onOpenChange={setIsEWayModalOpen}
        details={ewayDetails}
        invoiceTotal={totals.finalPayout}
        currencySymbol={currencySymbol}
        isRequired={ewayCheck.required}
        onSave={(nextDetails) => {
          setEwayDetails(nextDetails);
          setIsEWayModalOpen(false);
        }}
      />

      <SplitBillDialog
        isOpen={isSplitBillOpen}
        onOpenChange={setIsSplitBillOpen}
        items={items}
        customerList={customerList}
        selectedCustomerId={selectedCustomerId}
        businessState={business?.state}
        gstMode={gstMode}
        currencySymbol={currencySymbol}
        paymentModes={paymentModes}
        originalFinalPayout={totals.finalPayout}
        onConfirmSplit={handleConfirmSplitBill}
        isSaving={isSaving}
      />

      <SuccessDialog
        isOpen={isSuccessOpen}
        onOpenChange={setIsSuccessOpen}
        isQuotation={isQuotation}
        isRewardSyncMode={isRewardSyncMode}
        lastInvoice={lastInvoice}
        isDownloading={isDownloading}
        onPrintAction={handlePrintAction}
        onDownloadPDF={handleDownloadPDF}
        onStartNewBill={() => {
          resetBillDraft();
          setSplitInvoices([]);
          setActiveSplitIndex(0);
        }}
        splitInvoices={splitInvoices}
        activeSplitIndex={activeSplitIndex}
        onSelectSplitIndex={(idx) => {
          setActiveSplitIndex(idx);
          if (splitInvoices[idx]) setLastInvoice(splitInvoices[idx]);
        }}
        onDownloadEWayJson={handleDownloadEWayJson}
        onSaveEwbNumber={handleSaveEwbNumber}
        onGenerateLiveEwb={handleGenerateLiveEwb}
        isGspConfigured={Boolean(business?.ewayApiConfig?.isConfigured)}
        isGeneratingLiveEwb={isGeneratingLiveEwb}
        onShareWhatsApp={() => setIsWhatsAppShareOpen(true)}
      />

      {lastInvoice && (
        <WhatsAppShareModal
          isOpen={isWhatsAppShareOpen}
          onOpenChange={setIsWhatsAppShareOpen}
          invoice={lastInvoice}
          business={business}
          businessId={businessId}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-primary h-6 w-6" />
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
