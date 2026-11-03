
"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { 
  Plus, 
  Search, 
  Receipt, 
  Ticket, 
  X, 
  ArrowRight, 
  Loader2, 
  Users, 
  Package, 
  CheckCircle2, 
  Printer,
  ChevronRight,
  PlusCircle,
  FileSpreadsheet,
  Eye,
  Bot,
  Download,
  Link as LinkIcon,
  RefreshCcw,
  Zap,
  SmartphoneNfc,
  Hash,
  Sparkles,
  Tag,
  Clock,
  Gem,
  Layout,
  ShieldCheck,
  Crown,
  BadgeCheck,
  Check,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useUser, 
  useDoc, 
  updateDocumentNonBlocking, 
  addDocumentNonBlocking,
  setDocumentNonBlocking,
  commitBatchNonBlocking
} from "@/firebase";
import { collection, serverTimestamp, doc, query, where, getDocs, getDoc, increment, limit, writeBatch, setDoc } from "firebase/firestore";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { calculateGST, Product, Customer, Vendor, processNewInvoice } from "@/lib/mock-db";
import { sendWhatsAppTemplate } from "@/app/actions/whatsapp-actions";

// Modular Components
import { InvoicePrintTemplate } from "./components/InvoicePrintTemplate";
import { ThermalPrintTemplate } from "./components/ThermalPrintTemplate";
import { NewCustomerDialog } from "./components/NewCustomerDialog";
import { QuickProductDialog } from "./components/QuickProductDialog";
import { BillingCartTable } from "./components/BillingCartTable";
import { ReconciliationPanel } from "./components/ReconciliationPanel";
import { RewardCardsSection } from "./components/RewardCardsSection";
import { IdentitySection } from "./components/IdentitySection";

export type BillItem = {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  gstRate: number;
  stock: number;
  itemDiscount: number; 
  rateChangeReason?: string;
};

const DEFAULT_PAYMENT_MODES = ["Cash", "UPI", "Card", "Bank Transfer"];

function BillingContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const incomingCustomerId = searchParams.get('customerId');
  const incomingAmount = searchParams.get('amount');
  const incomingQuoteId = searchParams.get('quoteId');

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);

  const businessId = userProfile?.businessId;
  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business, isLoading: isBusinessLoading } = useDoc<any>(businessRef);

  const [activeMembership, setActiveMembership] = useState<any>(null);
  const [isLoyaltyLoading, setIsLoyaltyLoading] = useState(false);
  const [memberCoupons, setMemberCoupons] = useState<any[]>([]);
  const [customerActivities, setCustomerActivities] = useState<any[]>([]);

  const [isRewardSyncMode, setIsRewardSyncMode] = useState(false);
  const [externalBillNo, setExternalBillNo] = useState("");

  const [isQuotation, setIsQuotation] = useState(false);
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
  const [printMode, setPrintMode] = useState<'a4' | 'thermal'>('a4');

  const [couponOverrides, setCouponOverrides] = useState<Record<string, number>>({});
  const [couponOverrideReasons, setCouponOverrideReasons] = useState<Record<string, string>>({});

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  useEffect(() => {
    if (incomingAmount) setManualAmount(incomingAmount);
    if (incomingCustomerId) setSelectedCustomerId(incomingCustomerId);
  }, [incomingAmount, incomingCustomerId]);

  useEffect(() => {
    async function loadQuote() {
      if (!incomingQuoteId || !businessId) return;
      setIsQuoteLoading(true);
      try {
        const qRef = doc(firestore, 'businesses', businessId, 'quotations', incomingQuoteId);
        const qSnap = await getDoc(qRef);
        if (qSnap.exists()) {
          const qData = qSnap.data();
          setSelectedCustomerId(qData.customerId);
          setItems(qData.items || []);
          setManualDiscount(qData.totals?.manualDiscountApplied || 0);
          setManualAmount(qData.totals?.isOverridden ? qData.totals.grossSubtotal.toString() : "");
          setIsQuotation(true);
          toast({ title: "Quotation Loaded", description: `Recovered node ${qData.quotationId}` });
        }
      } catch (e) {
    console.error(e);
        toast({ variant: "destructive", title: "Load Error" });
      } finally {
        setIsQuoteLoading(false);
      }
    }
    loadQuote();
  }, [incomingQuoteId, businessId, firestore]);

  const configRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId, 'loyaltyConfig', 'main') : null, [firestore, businessId]);
  const { data: portalConfig } = useDoc<any>(configRef);

  const currencySymbol = getCurrencySymbol(business?.currency);
  const gstMode = business?.gstMode || 'exclusive';
  const paymentModes = useMemo(() => business?.paymentModes || DEFAULT_PAYMENT_MODES, [business]);

  const customersQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'customers') : null, [firestore, businessId]);
  const { data: customerListData } = useCollection<Customer>(customersQuery);
  const customerList = customerListData || [];

  const productsQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'products') : null, [firestore, businessId]);
  const { data: productListData } = useCollection<Product>(productsQuery);
  const productList = productListData || [];

  const vendorsQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'vendors') : null, [firestore, businessId]);
  const { data: vendorListData } = useCollection<Vendor>(vendorsQuery);
  const vendorList = vendorListData || [];

  const allMembershipsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'memberships') : null
  , [firestore, businessId]);
  const { data: allMemberships = [] } = useCollection<any>(allMembershipsQuery);

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [items, setItems] = useState<BillItem[]>([]);
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupons, setAppliedCoupons] = useState<any[]>([]);
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const displayCustomerList = useMemo(() => {
    if (!isRewardSyncMode) return customerList;
    return customerList.filter(c => 
      (allMemberships || []).some((m: any) => m.customerId === c.id && m.status === 'active')
    );
  }, [customerList, allMemberships, isRewardSyncMode]);

  useEffect(() => {
    if (isRewardSyncMode && selectedCustomerId) {
      const isMember = (allMemberships || []).some((m: any) => m.customerId === selectedCustomerId && m.status === 'active');
      if (!isMember) {
        setSelectedCustomerId("");
        setAppliedCoupons([]);
        setCouponOverrides({});
        setCouponOverrideReasons({});
        toast({ 
          variant: "destructive", 
          title: "Customer Deselected", 
          description: "Reward Sync requires an active membership node." 
        });
      }
    }
  }, [isRewardSyncMode, selectedCustomerId, allMemberships]);

  const tiersQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'loyaltyTiers') : null, [firestore, businessId]);
  const { data: tiersRaw } = useCollection<any>(tiersQuery);
  const tiers = tiersRaw || [];

  useEffect(() => {
    if (paymentModes.length > 0 && !paymentModes.includes(paymentMode)) {
      setPaymentMode(paymentModes[0]);
    }
  }, [paymentModes, paymentMode]);

  useEffect(() => {
    async function fetchLoyalty() {
      if (!selectedCustomerId || !businessId) {
        setActiveMembership(null); setMemberCoupons([]); setCustomerActivities([]); return;
      }
      setIsLoyaltyLoading(true);
      
      try {
        const memQ = query(collection(firestore, 'businesses', businessId, 'memberships'), where('customerId', '==', selectedCustomerId), where('status', '==', 'active'));
        const memSnap = await getDocs(memQ);
        if (!memSnap.empty) {
          setActiveMembership(memSnap.docs[0].data());
        } else {
          setActiveMembership(null);
        }

        const actQ = query(collection(firestore, 'businesses', businessId, 'loyaltyActivity'), where('customerId', '==', selectedCustomerId));
        const actSnap = await getDocs(actQ);
        setCustomerActivities(actSnap.docs.map(d => ({ ...d.data(), id: d.id })));

        const couponsQ = query(collection(firestore, 'businesses', businessId, 'coupons'), where('status', '==', 'active'));
        const couponsSnap = await getDocs(couponsQ);
        setMemberCoupons(couponsSnap.docs.map(d => ({ ...d.data(), id: d.id })));

      } catch (e) { 
        console.error("Loyalty Fetch Error:", e); 
      } finally { 
        setIsLoyaltyLoading(false); 
      }
    }
    fetchLoyalty();
  }, [selectedCustomerId, businessId, firestore]);

  const selectedCustomer = useMemo(() => customerList.find(c => c.id === selectedCustomerId), [selectedCustomerId, customerList]);

  const isInterState = useMemo(() => {
    if (!selectedCustomer || !business?.state) return false;
    return selectedCustomer.state?.trim().toLowerCase() !== business.state.trim().toLowerCase();
  }, [selectedCustomer, business]);

  const totals = useMemo(() => {
    let itemTotal = 0, taxTotal = 0, cgst = 0, sgst = 0, igst = 0, qtyCount = 0;

    items.forEach(item => {
      const discountedPrice = item.price * (1 - item.itemDiscount / 100);
      const lineAmount = discountedPrice * item.quantity;
      const gstData = calculateGST(lineAmount, item.gstRate, isInterState, gstMode);
      itemTotal += gstData.baseAmount; taxTotal += gstData.gstAmount; cgst += gstData.cgst; sgst += gstData.sgst; igst += gstData.igst; qtyCount += item.quantity;
    });

    const grossSubtotal = (isRewardSyncMode && manualAmount) ? parseFloat(manualAmount) : itemTotal + taxTotal;
    let workingTotal = manualAmount ? parseFloat(manualAmount) : grossSubtotal;
    let isOverridden = !!manualAmount;

    if (isOverridden) {
      if (isRewardSyncMode) {
        taxTotal = 0; cgst = 0; sgst = 0; igst = 0;
        itemTotal = workingTotal;
      } else {
        const overrideTax = calculateGST(workingTotal, parseFloat(manualGstRate), isInterState, gstMode);
        taxTotal = overrideTax.gstAmount; 
        cgst = overrideTax.cgst; 
        sgst = overrideTax.sgst; 
        igst = overrideTax.igst; 
        itemTotal = overrideTax.baseAmount;
        workingTotal = overrideTax.lineTotal;
      }
    }

    const exempt = Math.min(workingTotal, parseFloat(exemptAmount) || 0); workingTotal -= exempt;
    const manualDisc = Math.min(workingTotal, manualDiscount || 0); workingTotal -= manualDisc;
    
    const priority = portalConfig?.discountPriority || "percentage_first";
    let couponDisc = 0;
    
    const percentageCoupons = appliedCoupons.filter(c => c.type === 'percentage');
    const flatCoupons = appliedCoupons.filter(c => c.type === 'fixed' || c.type === 'bogo' || c.type === 'wallet');

    const applyPercentage = (currentVal: number) => {
      return percentageCoupons.reduce((sum, c) => {
        if (couponOverrides[c.code] !== undefined) {
          return sum + couponOverrides[c.code];
        }
        const val = Math.min(currentVal * (c.value / 100), c.maxDiscount || Infinity);
        return sum + val;
      }, 0);
    };

    const applyFlat = () => {
      return flatCoupons.reduce((sum, c) => {
        if (couponOverrides[c.code] !== undefined) {
          return sum + couponOverrides[c.code];
        }
        return sum + (c.type === 'bogo' || c.type === 'wallet' ? 0 : Number(c.value));
      }, 0);
    };

    if (priority === 'percentage_first') {
      const pDisc = applyPercentage(workingTotal);
      couponDisc += pDisc;
      const fDisc = applyFlat();
      couponDisc += fDisc;
    } else {
      const fDisc = applyFlat();
      couponDisc += fDisc;
      const pDisc = applyPercentage(Math.max(0, workingTotal - fDisc));
      couponDisc += pDisc;
    }

    couponDisc = Math.min(workingTotal, couponDisc);
    workingTotal -= couponDisc;

    const adv = Math.min(workingTotal, parseFloat(advanceAmount) || 0); workingTotal -= adv;
    const roundedTotal = Math.round(workingTotal);
    const finalPayout = Math.max(0, roundedTotal);
    const collected = parseFloat(paidAmount) || 0;
    const changeReturn = collected > finalPayout ? (collected - finalPayout) : 0;
    const dueAmount = collected < finalPayout ? (finalPayout - collected) : 0;

    let paymentStatus = "UNPAID";
    if (collected > 0) paymentStatus = collected >= finalPayout ? "PAID" : "PARTIALLY_PAID";

    return { itemTotal, taxTotal, cgst, sgst, igst, grossSubtotal, exemptApplied: exempt, advanceApplied: adv, manualDiscountApplied: manualDisc, couponApplied: couponDisc, finalPayout, collected, changeReturn, dueAmount, paymentStatus, qty: qtyCount, isOverridden, isInterState };
  }, [items, manualAmount, manualGstRate, exemptAmount, advanceAmount, manualDiscount, appliedCoupons, paidAmount, isInterState, gstMode, isRewardSyncMode, portalConfig, couponOverrides]);

  const handleApplyCoupon = async (codeParam?: string) => {
    const code = (codeParam || couponCode).toUpperCase().trim();
    if (!code) return;

    let isAlreadyApplied = false;
    setAppliedCoupons(prev => {
        const found = prev.some(c => c.code === code);
        if (found) {
            isAlreadyApplied = true;
            return prev.filter(c => c.code !== code);
        }
        return prev;
    });

    if (isAlreadyApplied) {
        setCouponOverrides(prev => {
            const next = { ...prev };
            delete next[code];
            return next;
        });
        setCouponOverrideReasons(prev => {
            const next = { ...prev };
            delete next[code];
            return next;
        });
        if (couponCode === code) setCouponCode("");
        toast({ title: "Benefit Removed" });
        return;
    }
    
    const couponRef = doc(firestore, 'businesses', businessId, 'coupons', code);
    const couponSnap = await getDoc(couponRef);
    
    if (couponSnap.exists()) {
      const cData = { ...couponSnap.data(), id: couponSnap.id };
      
      if (cData.status !== 'active') {
        toast({ variant: "destructive", title: "Coupon Expired" });
        return;
      }

      if (cData.usageLimit > 0 && cData.usageCount >= cData.usageLimit) {
        toast({ variant: "destructive", title: "Limit Reached", description: "Campaign has ended." });
        return;
      }

      if (totals.grossSubtotal < (cData.minOrder || 0)) { 
        toast({ variant: "destructive", title: "Min Order Not Met" }); 
        return; 
      }

      const userRedemptions = (customerActivities || []).filter(a => a.type === 'coupon_redeem' && (a.couponCode === code || a.couponId === cData.id));
      if (userRedemptions.length >= (cData.perUserLimit || 1)) {
        toast({ variant: "destructive", title: "Limit Reached", description: "This user has already redeemed this offer." });
        return;
      }

      if (portalConfig?.dailyNodeProtectionEnabled && !cData.isStackable) {
        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setHours(1, 30, 0, 0);
        if (now < cutoff) cutoff.setDate(cutoff.getDate() - 1);
        
        const todayRedemptions = (customerActivities || []).filter(a => {
           if (a.type !== 'coupon_redeem') return false;
           const ts = a.timestamp ? new Date(a.timestamp) : new Date(0);
           return ts >= cutoff;
        });

        const hasExclusiveRedeemedToday = todayRedemptions.some(a => {
           const couponNode = memberCoupons.find(mc => mc.id === a.couponId || mc.code === a.couponCode);
           return couponNode && !couponNode.isStackable;
        });

        if (hasExclusiveRedeemedToday) {
           toast({ variant: "destructive", title: "Daily Limit Node Active", description: "Exclusive reward node already consumed for today (Reset: 1:30 AM)." });
           return;
        }
      }

      const isNewStackable = !!cData.isStackable;
      
      setAppliedCoupons(prev => {
        if (!isNewStackable) {
          const onlyStackables = prev.filter(c => !!c.isStackable);
          return [...onlyStackables, cData];
        } else {
          return [...prev, cData];
        }
      });

      setCouponCode(code); 
      toast({ title: "Benefit Applied" });
    } else {
      toast({ variant: "destructive", title: "Invalid Code" });
    }
  };

  const dispatchWhatsAppBill = async (type: 'pos' | 'sync', payload: any, customerObj: any, currentTotals: any) => {
    // 1. EARLY ENTITLEMENT GATE
    const activeAddonIds = business?.activeAddonIds || [];
    const isEntitled = activeAddonIds.includes('feat_whatsapp') || activeAddonIds.includes('suite_growth');
    if (!isEntitled) return;

    // 2. CONFIG GATE
    const waConfig = business?.whatsappApiConfig;
    if (!waConfig?.isVerified || !customerObj?.phone || !businessId) return;

    const templateName = type === 'pos' ? waConfig.posTemplateName : waConfig.rewardSyncTemplateName;
    const lang = type === 'pos' ? (waConfig.posLanguageCode || 'en_IN') : (waConfig.rewardSyncLanguageCode || 'en_IN');
    if (!templateName) return;

    const cleanPhone = customerObj.phone.replace(/\D/g, '');
    const targetPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const trackUrl = `${window.location.origin}/loyalty/track/${businessId}/mem_c_${cleanPhone.slice(-10)}`;
    const couponsString = appliedCoupons.map(c => c.code).join(", ") || "NONE";
    const totalSavingsValue = currentTotals.couponApplied + (type === 'pos' ? currentTotals.manualDiscountApplied : 0);

    let parameters = [];
    let logMessageText = "";

    if (type === 'pos') {
      parameters = [
        { type: "text", text: customerObj.name },
        { type: "text", text: payload.invoiceId },
        { type: "text", text: `${currencySymbol}${currentTotals.grossSubtotal.toLocaleString()}` },
        { type: "text", text: couponsString },
        { type: "text", text: `${currencySymbol}${totalSavingsValue.toLocaleString()}` },
        { type: "text", text: `${currencySymbol}${currentTotals.finalPayout.toLocaleString()}` },
        { type: "text", text: trackUrl }
      ];
      logMessageText = `📦 POS Bill Node Dispatched: ${payload.invoiceId} (Total: ${currencySymbol}${currentTotals.finalPayout.toLocaleString()})`;
    } else {
      parameters = [
        { type: "text", text: customerObj.name },
        { type: "text", text: payload.externalRef || 'N/A' },
        { type: "text", text: `${currencySymbol}${currentTotals.grossSubtotal.toLocaleString()}` },
        { type: "text", text: `${currencySymbol}${currentTotals.couponApplied.toLocaleString()}` },
        { type: "text", text: `${currencySymbol}${currentTotals.finalPayout.toLocaleString()}` },
        { type: "text", text: trackUrl }
      ];
      logMessageText = `🎁 Reward Sync Node Dispatched (Ref: ${payload.externalRef || 'N/A'}). Saved: ${currencySymbol}${currentTotals.couponApplied.toLocaleString()}`;
    }

    try {
      // Hardened: No longer passing accessToken from client
      await sendWhatsAppTemplate(
        businessId,
        { phoneId: waConfig.phoneId },
        targetPhone,
        templateName,
        lang,
        [{ type: "body", parameters }]
      );

      const chatId = targetPhone;
      const chatRef = doc(firestore, 'businesses', businessId, 'chats', chatId);
      const msgRef = doc(collection(firestore, 'businesses', businessId, 'chats', chatId, 'messages'));

      setDoc(chatRef, {
        id: chatId,
        customerName: customerObj.name,
        lastMessage: logMessageText,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      setDoc(msgRef, {
        text: logMessageText,
        direction: 'outbound',
        type: 'template',
        templateName,
        timestamp: serverTimestamp(),
        status: 'sent'
      });

    } catch (e) {
    console.error(e);
      console.warn("WhatsApp Dispatch Failed:", e);
    }
  };

  const handleDownloadPDF = async (mode: 'a4' | 'thermal') => {
    if (!lastInvoice) return;
    const elementId = mode === 'a4' ? "printable-invoice" : "thermal-printable";
    const element = document.getElementById(elementId);
    
    if (!element) {
      toast({ variant: "destructive", title: "Error", description: "Template node not found." });
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
        width: mode === 'a4' ? 794 : 272, 
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById(elementId);
          if (clonedElement) {
            clonedElement.style.opacity = "1";
            clonedElement.style.visibility = "visible";
            clonedElement.style.position = "absolute";
            clonedElement.style.top = "0";
            clonedElement.style.left = "0";
            clonedElement.style.display = "block";
            if (mode === 'a4') {
              clonedElement.style.width = "210mm";
              clonedElement.style.minHeight = "297mm";
            } else {
              clonedElement.style.width = "72mm";
            }
          }
        }
      });

      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      
      if (mode === 'a4') {
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
        pdf.save(`${lastInvoice.type === 'quotation' ? 'Quotation' : 'Invoice'}_${lastInvoice.invoiceId}.pdf`);
      } else {
        const imgWidth = 72;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [imgWidth, imgHeight] });
        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
        pdf.save(`Receipt_${lastInvoice.invoiceId}.pdf`);
      }
      
      toast({ title: "PDF Generated" });
    } catch (error) {
      console.error("PDF Error:", error);
      toast({ variant: "destructive", title: "Download Failed" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrintAction = (mode: 'a4' | 'thermal') => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!selectedCustomerId || !businessId) return;

    if (isRewardSyncMode && !manualAmount) {
        toast({ variant: "destructive", title: "Sync Data Required", description: "Please enter the Bill Amount." });
        return;
    }

    const overStockItem = items.find(i => i.quantity > i.stock);
    if (!isQuotation && !isRewardSyncMode && overStockItem) {
      toast({ variant: "destructive", title: "Insufficient stock available.", description: `Product: ${overStockItem.name}` });
      return;
    }

    setIsSaving(true);
    const batch = writeBatch(firestore);

    try {
      if (isQuotation) {
        const quoteId = `Q-${Math.floor(1000 + Math.random() * 9000)}`;
        const qRef = doc(firestore, 'businesses', businessId, 'quotations', quoteId);
        
        batch.set(qRef, {
          id: quoteId,
          quotationId: quoteId,
          businessId,
          customerId: selectedCustomerId,
          customerName: selectedCustomer?.name,
          items: items.length > 0 ? items : [{ name: "Manual Quote", quantity: 1, price: parseFloat(manualAmount || '0'), gstRate: parseFloat(manualGstRate) }],
          totals: totals,
          status: 'sent',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });

        setLastInvoice({ 
          invoiceId: quoteId, 
          type: 'quotation', 
          customerName: selectedCustomer?.name, 
          customerPhone: selectedCustomer?.phone, 
          customerAddress: selectedCustomer?.address, 
          customerGstin: selectedCustomer?.gstin, 
          items: items.length > 0 ? items : [{ name: "Manual Quote", quantity: 1, price: parseFloat(manualAmount || '0'), gstRate: parseFloat(manualGstRate) }], 
          totals, 
          date: new Date().toLocaleDateString('en-IN'), 
          paymentMode: 'Draft',
          couponCodes: appliedCoupons.map(c => c.code).join(", ")
        });
        await commitBatchNonBlocking(batch);
        setIsSuccessOpen(true);
      } 
      else if (isRewardSyncMode) {
        const syncId = `SYNC-${Math.floor(1000 + Math.random() * 9000)}`;
        let pointsToEarn = 0;

        if (appliedCoupons.length > 0) {
            appliedCoupons.forEach(c => {
                const couponDocRef = doc(firestore, 'businesses', businessId, 'coupons', c.code);
                batch.update(couponDocRef, { usageCount: increment(1) });
                
                const rewardValue = couponOverrides[c.code] !== undefined 
                  ? couponOverrides[c.code] 
                  : (totals.couponApplied / appliedCoupons.length);

                const activityRef = doc(collection(firestore, 'businesses', businessId, 'loyaltyActivity'));
                batch.set(activityRef, {
                    customerId: selectedCustomerId,
                    customerName: selectedCustomer?.name,
                    type: 'coupon_redeem',
                    couponId: c.id,
                    couponCode: c.code,
                    cashback: rewardValue,
                    timestamp: new Date().toISOString(),
                    description: `Redeemed ${c.code} via Quick Reward Sync (Ref: ${externalBillNo || 'N/A'})`
                });
            });
        }

        if (activeMembership) {
            const tierRef = tiers.find((t: any) => t.name.toLowerCase() === (activeMembership.tier || '').toLowerCase());
            const multiplier = parseFloat(activeMembership.pointsMultiplier ?? tierRef?.pointsMultiplier ?? 1);
            
            pointsToEarn = Math.floor(totals.grossSubtotal * multiplier);
            const memberDocRef = doc(firestore, 'businesses', businessId, 'memberships', activeMembership.id);
            batch.update(memberDocRef, { rewardPoints: increment(pointsToEarn) });
            
            const rewardActivityRef = doc(collection(firestore, 'businesses', businessId, 'loyaltyActivity'));
            batch.set(rewardActivityRef, {
                customerId: activeMembership.customerId,
                customerName: selectedCustomer?.name,
                type: 'purchase_reward',
                points: pointsToEarn,
                invoiceValue: totals.grossSubtotal,
                timestamp: new Date().toISOString(),
                description: `Points earned from bill sync (Ref: ${externalBillNo || 'N/A'})`
            });
        }

        const customerRef = doc(firestore, 'businesses', businessId, 'customers', selectedCustomerId);
        batch.update(customerRef, {
            totalSpent: increment(totals.grossSubtotal),
            visitCount: increment(1),
            lastVisitDate: new Date().toISOString(),
            updatedAt: serverTimestamp()
        });

        const currentInvoice = {
            invoiceId: syncId,
            type: 'sales',
            customerName: selectedCustomer?.name,
            customerPhone: selectedCustomer?.phone,
            totals: totals,
            date: new Date().toLocaleDateString('en-IN'),
            paymentMode: 'Loyalty Sync',
            paymentNote: `Sync Ref: ${externalBillNo}`,
            items: [{ name: `Loyalty Sync: ${externalBillNo || 'Manual'}`, quantity: 1, price: parseFloat(manualAmount), gstRate: parseFloat(manualGstRate) }]
        };
        setLastInvoice(currentInvoice);

        await commitBatchNonBlocking(batch);
        await dispatchWhatsAppBill('sync', { externalRef: externalBillNo, points: pointsToEarn }, selectedCustomer, totals);
        
        setIsSuccessOpen(true);
        setItems([]); setSelectedCustomerId(""); setManualAmount(""); setAppliedCoupons([]); setExternalBillNo("");
      }
      else {
        const result = processNewInvoice({ customerId: selectedCustomerId, items: items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price, gstRate: i.gstRate })), discount: manualDiscount + totals.couponApplied, paymentReceived: totals.collected, paymentMode: paymentMode, isInterState: totals.isInterState });
        
        items.forEach(item => {
          const productRef = doc(firestore, 'businesses', businessId, 'products', item.productId);
          batch.update(productRef, { stock: increment(-item.quantity) });
        });

        const customerRef = doc(firestore, 'businesses', businessId, 'customers', selectedCustomerId);
        batch.update(customerRef, {
          creditBalance: increment(totals.dueAmount),
          totalSpent: increment(totals.grossSubtotal),
          visitCount: increment(1),
          lastVisitDate: new Date().toISOString(),
          updatedAt: serverTimestamp()
        });

        if (incomingQuoteId) {
          const oldQRef = doc(firestore, 'businesses', businessId, 'quotations', incomingQuoteId);
          batch.update(oldQRef, { status: 'converted', updatedAt: serverTimestamp() });
        }

        const particulars = `POS Sale: ${result.invoiceId} - ${selectedCustomer?.name}`;
        if (totals.collected > 0) {
          const cbRef = doc(collection(firestore, 'businesses', businessId, 'cashbook'));
          batch.set(cbRef, {
            businessId,
            type: 'credit',
            amount: totals.collected,
            particulars,
            category: 'Sales',
            entryBy: userProfile?.name || 'System',
            date: new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp(),
            paymentNote: paymentNote || null
          });
        }

        if (appliedCoupons.length > 0) {
          appliedCoupons.forEach(c => {
            const couponDocRef = doc(firestore, 'businesses', businessId, 'coupons', c.code);
            batch.update(couponDocRef, { usageCount: increment(1) });

            const rewardValue = couponOverrides[c.code] !== undefined 
              ? couponOverrides[c.code] 
              : (totals.couponApplied / appliedCoupons.length);

            const activityRef = doc(collection(firestore, 'businesses', businessId, 'loyaltyActivity'));
            batch.set(activityRef, {
              customerId: selectedCustomerId,
              customerName: selectedCustomer?.name,
              type: 'coupon_redeem',
              couponId: c.id,
              couponCode: c.code,
              cashback: rewardValue,
              timestamp: new Date().toISOString(),
              description: `Redeemed ${c.code} at checkout.`
            });
          });
        }

        if (activeMembership) {
          const tierRef = tiers.find((t: any) => t.name.toLowerCase() === (activeMembership.tier || '').toLowerCase());
          const multiplier = parseFloat(activeMembership.pointsMultiplier ?? tierRef?.pointsMultiplier ?? 1);
          
          const pointsToEarn = Math.floor(totals.grossSubtotal * multiplier);
          const memberDocRef = doc(firestore, 'businesses', businessId, 'memberships', activeMembership.id);
          batch.update(memberDocRef, { rewardPoints: increment(pointsToEarn) });
        }

        const finalizedInvoice = { 
          ...result, 
          type: 'sales', 
          customerName: selectedCustomer?.name, 
          customerPhone: selectedCustomer?.phone, 
          customerAddress: selectedCustomer?.address, 
          customerGstin: selectedCustomer?.gstin, 
          items: items.length > 0 ? [...items] : [{ name: particulars, quantity: 1, price: parseFloat(manualAmount || '0'), gstRate: parseFloat(manualGstRate) }], 
          totals: totals, 
          date: new Date().toLocaleDateString('en-IN'), 
          paymentMode: paymentMode, 
          paymentNote: paymentNote,
          couponCodes: appliedCoupons.map(c => c.code).join(", ")
        };
        setLastInvoice(finalizedInvoice);

        await commitBatchNonBlocking(batch);
        await dispatchWhatsAppBill('pos', { invoiceId: result.invoiceId, amount: totals.finalPayout }, selectedCustomer, totals);

        setIsSuccessOpen(true);
        setItems([]); setSelectedCustomerId(""); setPaidAmount(""); 
        setManualDiscount(0); setAppliedCoupons([]); setManualAmount(""); 
        setExemptAmount(""); setAdvanceAmount(""); setPaymentNote(""); 
        setManualOverrideReason(""); setCouponOverrides({}); setCouponOverrideReasons({});
      }
    } catch (error: any) {
    console.error(error); 
      toast({ variant: "destructive", title: "Billing Error", description: error.message }); 
    }
    finally { setIsSaving(false); }
  };

  const addItem = (product: Product) => {
    if (!isQuotation && product.stock <= 0) {
      toast({ variant: "destructive", title: "Insufficient stock available.", description: "This product is currently out of stock." });
      return;
    }

    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      if (!isQuotation && existing.quantity + 1 > existing.stock) {
        toast({ variant: "destructive", title: "Insufficient stock available." });
        return;
      }
      setItems(items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    }
    else setItems([...items, { id: Math.random().toString(36).substr(2, 9), productId: product.id, name: product.name, quantity: 1, price: product.price, gstRate: product.gstRate || 0, stock: product.stock || 0, itemDiscount: 0, rateChangeReason: "" }]);
    setProductSearch(""); setShowProductDropdown(false);
  };

  const handleOpenPreview = () => {
    if (!selectedCustomerId) {
      toast({ variant: "destructive", title: "Identity Required", description: "Please select a customer before previewing." });
      return;
    }
    const previewInvoice = { 
        invoiceId: isQuotation ? "QUOTE_PRV" : (isRewardSyncMode ? "SYNC_PRV" : "POS_PRV"), 
        type: isQuotation ? 'quotation' : 'sales', 
        customerName: selectedCustomer?.name, 
        customerPhone: selectedCustomer?.phone, 
        customerAddress: selectedCustomer?.address, 
        customerGstin: selectedCustomer?.gstin, 
        items: items.length > 0 ? [...items] : [{ name: `Manual Entry: ${manualAmount || '0'}`, quantity: 1, price: parseFloat(manualAmount || '0'), gstRate: parseFloat(manualGstRate) }], 
        totals: totals, 
        date: new Date().toLocaleDateString('en-IN'), 
        paymentMode: isRewardSyncMode ? 'Loyalty Sync' : paymentMode, 
        paymentNote: isRewardSyncMode ? `Sync Ref: ${externalBillNo}` : paymentNote,
        couponCodes: appliedCoupons.map(c => c.code).join(", ")
    };
    setLastInvoice(previewInvoice);
    setIsPreviewOpen(true);
  };

  if (isProfileLoading || isQuoteLoading) return <div className="flex items-center justify-center h-screen text-slate-900"><Loader2 className="animate-spin" /></div>;

  return (
    <div className={cn("space-y-6 pb-24 max-w-[1600px] mx-auto text-left px-4 sm:px-6", printMode === 'thermal' ? 'print-thermal' : 'print-a4')}>
      <div className={cn(printMode !== 'a4' && "print:hidden")}>
        <InvoicePrintTemplate invoice={lastInvoice} business={business} currencySymbol={currencySymbol} />
      </div>
      <div className={cn(printMode !== 'thermal' && "print:hidden")}>
        <ThermalPrintTemplate invoice={lastInvoice} business={business} currencySymbol={currencySymbol} />
      </div>
      
      <div className="print:hidden space-y-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
          <div className="flex items-center gap-4 text-left">
            <div className="h-14 w-14 rounded-[1.5rem] bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
              <Receipt className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 uppercase">Billing Hub</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-2xl border shadow-sm w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <SmartphoneNfc className="h-4 w-4 text-green-600" />
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Reward Sync Only</span>
                </div>
                <Switch checked={isRewardSyncMode} onCheckedChange={(v) => { setIsRewardSyncMode(v); if(v) { setItems([]); setIsQuotation(false); } }} className="data-[state=checked]:bg-green-600 scale-90" />
             </div>

             <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-2xl border shadow-sm w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-orange-600" />
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Quotation</span>
                </div>
                <Switch checked={isQuotation} onCheckedChange={(v) => { setIsQuotation(v); if(v) setIsRewardSyncMode(false); }} className="data-[state=checked]:bg-orange-600 scale-90" />
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-8">
            <IdentitySection 
              isRewardSyncMode={isRewardSyncMode}
              selectedCustomer={selectedCustomer}
              setSelectedCustomerId={setSelectedCustomerId}
              customerSearch={customerSearch}
              setCustomerSearch={setCustomerSearch}
              showCustomerDropdown={showCustomerDropdown}
              setShowCustomerDropdown={setShowCustomerDropdown}
              customerList={displayCustomerList}
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
            />

            {selectedCustomerId && (
              <RewardCardsSection 
                memberCoupons={memberCoupons} 
                appliedCoupons={appliedCoupons} 
                grossSubtotal={totals.grossSubtotal} 
                handleApplyCoupon={handleApplyCoupon} 
                activities={customerActivities}
              />
            )}

            {!isRewardSyncMode && (
                <div className="w-full overflow-x-auto rounded-[1.5rem] sm:rounded-[2rem] border shadow-sm animate-in fade-in">
                    <BillingCartTable items={items} setItems={setItems} isInterState={totals.isInterState} gstMode={gstMode} isQuotation={isQuotation} />
                </div>
            )}
            
            {isRewardSyncMode && (
                <div className="p-8 bg-green-50 rounded-[2rem] border border-dashed border-green-200 text-center animate-in zoom-in-95">
                    <div className="max-w-md mx-auto space-y-4">
                        <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center text-green-600 mx-auto shadow-xl"><SmartphoneNfc className="h-8 w-8" /></div>
                        <h4 className="text-sm font-black uppercase text-green-900">Reward Sync Mode Active</h4>
                        <p className="text-xs text-green-700 leading-relaxed font-medium">In this mode, inventory will not be deducted. Only rewards and loyalty will be tracked. Perform main billing on your primary system.</p>
                    </div>
                </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-8">
            <ReconciliationPanel 
              isRewardSyncMode={isRewardSyncMode}
              selectedCustomerId={selectedCustomerId}
              bestOffer={null} 
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
            />
          </div>
        </div>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[900px] h-[95vh] p-0 overflow-hidden rounded-[2.5rem] sm:rounded-[2.5rem] border-none shadow-2xl flex flex-col bg-white text-left">
           <DialogHeader className="p-6 bg-slate-900 text-white shrink-0 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20"><Eye className="h-5 w-5 text-accent" /></div>
                 <DialogTitle className="text-lg font-black uppercase tracking-widest">Document Audit Preview</DialogTitle>
              </div>
           </DialogHeader>
           <div className="flex-1 bg-slate-100 overflow-auto relative py-12 flex justify-center">
              <div className="scale-75 sm:scale-100 origin-top shadow-2xl">
                 <InvoicePrintTemplate invoice={lastInvoice} business={business} currencySymbol={currencySymbol} isPreview />
              </div>
           </div>
           <DialogFooter className="p-6 bg-white border-t flex flex-row gap-3 shrink-0">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)} className="h-12 rounded-xl font-bold uppercase text-[10px]">Back to Editing</Button>
              <Button onClick={() => { setIsPreviewOpen(false); handleSave(); }} disabled={isSaving} className="flex-1 h-12 bg-primary font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl text-white">
                {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : (isQuotation ? "Confirm Quotation" : "Save & Finalize")}
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] sm:rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden text-left">
          <DialogHeader className="p-10 text-white border-b relative text-left bg-primary">
            <div className="absolute top-0 right-0 p-10 text-white/10"><CheckCircle2 className="h-32 w-32" /></div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">{isQuotation ? 'Quotation Ready' : 'Execution Complete'}</DialogTitle>
          </DialogHeader>
          <div className="p-10 text-center space-y-8">
            <div className="h-28 w-28 rounded-[2rem] bg-green-50 flex items-center justify-center mx-auto border-4 border-white shadow-2xl animate-in zoom-in-50 duration-700"><CheckCircle2 className="h-14 w-14 text-green-600" /></div>
            <div className="space-y-3">
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{isQuotation ? 'Draft Success!' : 'Settlement Success!'}</h3>
              <p className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em]">Logged Node: {lastInvoice?.invoiceId}</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => handlePrintAction('a4')} className="h-16 bg-primary rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-xl transition-all active:scale-95 text-white">
                  <Printer className="h-5 w-5" /> Print A4
                </Button>
                <Button onClick={() => handleDownloadPDF('a4')} disabled={isDownloading} className="h-16 bg-white border-2 border-primary text-primary hover:bg-primary/5 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-xl transition-all active:scale-95">
                  {isDownloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                  PDF A4
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => handlePrintAction('thermal')} className="h-16 bg-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-xl transition-all active:scale-95 text-white">
                  <Printer className="h-5 w-5" /> Print Receipt
                </Button>
                <Button onClick={() => handleDownloadPDF('thermal')} disabled={isDownloading} className="h-16 bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-50 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-xl transition-all active:scale-95">
                  {isDownloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                  PDF Receipt
                </Button>
              </div>
              <DialogClose asChild>
                <Button variant="ghost" onClick={() => router.push(isQuotation ? '/quotations' : '/dashboard')} className="h-12 rounded-xl font-black uppercase text-[10px] tracking-widest opacity-60">Close Node <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </DialogClose>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary opacity-20" /></div>}>
      <BillingContent />
    </Suspense>
  );
}
