"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Users,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  Loader2,
  UserPlus,
  ShieldCheck,
  SmartphoneNfc,
  CreditCard,
  Receipt,
  AlertCircle,
  RefreshCcw,
  ShieldAlert,
  IdCard,
  Layout,
  ExternalLink,
  AlertTriangle,
  UserCheck,
  Gem,
  Download,
  TrendingUp,
  Handshake,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PageHeader,
  KpiStatCard,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  addDocumentNonBlocking,
} from "@/firebase";
import {
  collection,
  doc,
  serverTimestamp,
  query,
  where,
  getCountFromServer,
  orderBy,
} from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { NewCustomerDialog } from "@/app/billing/components/NewCustomerDialog";
import Script from "next/script";
import {
  sendWhatsAppTemplate,
  sendMemberVerificationOtpAction,
} from "@/app/actions/whatsapp-actions";
import { calculateGST } from "@/lib/mock-db";

const TIERS_LIST = ["Silver", "Gold", "Platinum", "VIP", "Elite", "Legend"];
const MEMBERSHIP_TYPES = ["Monthly", "Quarterly", "Yearly", "Lifetime", "Trial"];
const REGISTRATION_TYPES = ["Online", "Manual", "Gifted", "Discounted"];
const DEFAULT_PAYMENT_MODES = ["Cash", "UPI", "Card", "Bank Transfer"];

function formatPhoneForMeta(phone: string): string {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) clean = clean.substring(1);
  if (clean.length === 10) return `91${clean}`;
  return clean;
}

export default function MembershipsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const membersQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "memberships"),
            orderBy("startDate", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: membersRaw, isLoading } = useCollection<any>(membersQuery);
  const members = membersRaw || [];

  const customersQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "customers") : null),
    [firestore, businessId]
  );
  const { data: customersRaw } = useCollection<any>(customersQuery);
  const customers = customersRaw || [];

  const tiersQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "loyaltyTiers") : null),
    [firestore, businessId]
  );
  const { data: tiersRaw } = useCollection<any>(tiersQuery);

  const tiers = useMemo(() => {
    if (!tiersRaw) return [];
    return tiersRaw
      .filter((t: any) => (t.status || "").toLowerCase() === "active")
      .sort((a: any, b: any) => (a.minSpend || 0) - (b.minSpend || 0));
  }, [tiersRaw]);

  const referencesQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "references"),
            where("status", "==", "active")
          )
        : null,
    [firestore, businessId]
  );
  const { data: referencesRaw } = useCollection<any>(referencesQuery);
  const references = referencesRaw || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "incomplete">("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<any>(null);

  const [isEditMemberOpen, setIsEditMemberOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<any>(null);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [waFallbackLink, setWaFallbackLink] = useState("");
  const [otpDeliveryError, setOtpDeliveryError] = useState("");

  const isAdminOrStaff = useMemo(() => {
    const role = (userProfile?.role || "").toLowerCase();
    return (
      userProfile?.businessId === businessId &&
      (["admin", "manager", "staff", "agent", "accountant"].includes(role) ||
        user?.email?.toLowerCase() === "skillmatrix24@gmail.com")
    );
  }, [userProfile, user, businessId]);

  const paymentModes = useMemo(
    () => business?.paymentModes || DEFAULT_PAYMENT_MODES,
    [business]
  );

  const eligibleCustomers = useMemo(() => {
    return (customers || []).filter((c) => {
      const existingMember = (members || []).find((m) => m.customerId === c.id);
      if (!existingMember) return true;
      return (existingMember.status || "").toLowerCase() !== "active";
    });
  }, [customers, members]);

  const [formData, setFormData] = useState({
    customerId: "",
    type: "Yearly",
    tier: "Gold",
    walletBalance: "0",
    rewardPoints: "0",
    expiryDate: "",
    manualCardNumber: "",
    paymentMode: "Cash",
    paidAmount: "",
    isGift: false,
    isDiscount: false,
    onboardingNote: "",
    referenceId: "",
    onboardedBy: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOnlinePayment = useMemo(() => {
    const mode = (formData.paymentMode || "").toLowerCase();
    return mode === "online" || mode === "razorpay" || mode === "upi";
  }, [formData.paymentMode]);

  useEffect(() => {
    if (userProfile?.name && !formData.onboardedBy) {
      setFormData((prev) => ({ ...prev, onboardedBy: userProfile.name }));
    }
  }, [userProfile?.name]);

  const resetForm = () => {
    setFormData({
      customerId: "",
      type: "Yearly",
      tier: "Gold",
      walletBalance: "0",
      rewardPoints: "0",
      expiryDate: "",
      manualCardNumber: "",
      paymentMode: "Cash",
      paidAmount: "",
      isGift: false,
      isDiscount: false,
      onboardingNote: "",
      referenceId: "",
      onboardedBy: userProfile?.name || "",
    });
    setOtpSent(false);
    setOtp("");
    setGeneratedOtp("");
    setIsVerified(false);
    setWaFallbackLink("");
    setOtpDeliveryError("");
  };

  const selectedTierObj = useMemo(
    () => tiers.find((t) => t.name === formData.tier),
    [formData.tier, tiers]
  );

  useEffect(() => {
    if (selectedTierObj && business) {
      const mode = business.gstMode || "exclusive";
      const breakdown = calculateGST(
        selectedTierObj.minSpend || 0,
        selectedTierObj.gstRate || 0,
        false,
        mode
      );
      setFormData((prev) => ({ ...prev, paidAmount: breakdown.lineTotal.toString() }));
    }
  }, [selectedTierObj, business]);

  const currencySymbol = getCurrencySymbol(business?.currency || "INR");

  const filteredMembers = useMemo(() => {
    let list = (members || []).filter((m: any) => {
      const cust = customers.find((c) => c.id === m.customerId);
      const search = searchTerm.toLowerCase();
      const matchesName = m.customerName?.toLowerCase().includes(search);
      const matchesCard = m.cardNumber?.toLowerCase().includes(search);
      const matchesPhone = cust?.phone?.includes(search);
      const matchesStatus = statusFilter === "all" || m.status === statusFilter;
      const matchesTier = tierFilter === "all" || m.tier === tierFilter;
      return (matchesName || matchesCard || matchesPhone) && matchesStatus && matchesTier;
    });

    if (filterMode === "incomplete") {
      list = list.filter((m) => {
        const cust = customers.find((c) => c.id === m.customerId);
        return !cust?.dob || !cust?.anniversaryDate;
      });
    }

    return list;
  }, [members, searchTerm, filterMode, customers, statusFilter, tierFilter]);

  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => m.status === "active").length;
    const highValue = members.filter((m) => (m.rewardPoints || 0) > 1000).length;
    const totalRevenue = members.reduce((sum, m) => sum + (parseFloat(m.paidAmount) || 0), 0);
    const expiring = members.filter((m) => {
      if (!m.expiryDate) return false;
      const diff = new Date(m.expiryDate).getTime() - new Date().getTime();
      return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
    }).length;

    return { total, active, highValue, expiring, totalRevenue };
  }, [members]);

  const handleSendOtp = async () => {
    if (!formData.customerId || !businessId) {
      toast({
        variant: "destructive",
        title: "Customer Required",
        description: "Please select a customer first.",
      });
      return;
    }

    const customer = customers.find((c: any) => c.id === formData.customerId);
    if (!customer?.phone) {
      toast({
        variant: "destructive",
        title: "Missing Phone Number",
        description: "Customer phone number not found in registry.",
      });
      return;
    }

    setIsOtpLoading(true);
    setOtpDeliveryError("");
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);

      const res = await sendMemberVerificationOtpAction(
        businessId,
        customer.phone,
        customer.name,
        code
      );

      setOtpSent(true);
      if (res.waLink) setWaFallbackLink(res.waLink);

      if (res.success) {
        toast({
          title: "OTP Sent",
          description: `Verification code sent to ${customer.phone} via WhatsApp.`,
        });
      } else {
        setOtpDeliveryError(res.error || "WhatsApp delivery failed");
        toast({
          variant: "destructive",
          title: "WhatsApp Dispatch Alert",
          description:
            res.error ||
            "Could not deliver via Meta Cloud API. Use WhatsApp Web link or Staff Override below.",
        });
      }
    } catch (e: any) {
      console.error(e);
      setOtpDeliveryError(e.message || "Failed to dispatch verification code.");
      toast({
        variant: "destructive",
        title: "Gateway Error",
        description: e.message || "Failed to dispatch verification code.",
      });
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !generatedOtp) return;
    setIsOtpLoading(true);

    if (otp === generatedOtp) {
      setIsVerified(true);
      toast({ title: "Identity Confirmed", description: "OTP verification successful." });
    } else {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "The verification code does not match.",
      });
    }
    setIsOtpLoading(false);
  };

  const handleOnboard = async () => {
    if (!formData.customerId || !businessId || !isVerified) {
      toast({
        variant: "destructive",
        title: "Verification Required",
        description: "Please verify mobile identity before issuing card.",
      });
      return;
    }

    if (isOnlinePayment) {
      handleInitiatePayment();
      return;
    }

    setIsSubmitting(true);
    try {
      let finalCardNumber = formData.manualCardNumber.trim().toUpperCase();

      if (!finalCardNumber) {
        const coll = collection(firestore, "businesses", businessId, "memberships");
        const snapshot = await getCountFromServer(coll);
        const nextSeq = snapshot.data().count + 1;
        const formattedSeq = nextSeq < 10 ? `0${nextSeq}` : nextSeq.toString();

        const config = business?.cardConfig || { prefix: "BIZ" };
        finalCardNumber = `${config.prefix}-${formData.tier.toUpperCase()}-${new Date().getFullYear()}-${formattedSeq}`;
      }

      const customer = customers.find((c: any) => c.id === formData.customerId);
      const tierObj = tiers.find(
        (t: any) => t.name.toLowerCase() === formData.tier.toLowerCase()
      );

      const memberId = `mem_${formData.customerId}`;
      const regType = formData.isGift
        ? "Gifted"
        : formData.isDiscount
          ? "Discounted"
          : "Manual";

      const memberData = {
        ...formData,
        id: memberId,
        customerId: formData.customerId,
        customerName: customer?.name || "Member",
        status: "active",
        registrationType: regType,
        startDate: new Date().toISOString(),
        walletBalance: parseFloat(formData.walletBalance) || 0,
        rewardPoints: parseInt(formData.rewardPoints) || 0,
        pointsMultiplier: parseFloat(tierObj?.pointsMultiplier) || 1,
        cashbackPercent: parseFloat(tierObj?.cashbackPercent) || 0,
        createdAt: serverTimestamp(),
        sharePublic: true,
        cardNumber: finalCardNumber,
        cardIssuedAt: new Date().toISOString(),
        isVerified: true,
        paidAmount: parseFloat(formData.paidAmount) || 0,
      };

      const docRef = doc(firestore, "businesses", businessId, "memberships", memberId);
      await setDocumentNonBlocking(docRef, memberData, { merge: true });

      if (!formData.isGift && parseFloat(formData.paidAmount) > 0) {
        const cashbookRef = collection(firestore, "businesses", businessId, "cashbook");
        await addDocumentNonBlocking(cashbookRef, {
          businessId,
          type: "credit",
          amount: parseFloat(formData.paidAmount),
          particulars: `Membership Onboarding: ${customer?.name} (${formData.tier})`,
          category: "Sales",
          mode: formData.paymentMode,
          entryBy: formData.onboardedBy || userProfile?.name || "Admin",
          date: new Date().toISOString().split("T")[0],
          createdAt: serverTimestamp(),
        });
      }

      if (formData.isGift && formData.referenceId && business?.defaultReferenceTemplate) {
        const refObj = (references || []).find((r) => r.id === formData.referenceId);
        const waConfig = business?.whatsappApiConfig;

        if (refObj?.phone && waConfig?.isVerified) {
          const targetPhone = formatPhoneForMeta(refObj.phone);
          const components = [
            {
              type: "body",
              parameters: [
                { type: "text", text: refObj.name },
                { type: "text", text: customer?.name || "Client" },
                { type: "text", text: formData.tier },
                { type: "text", text: business?.name || "Our Store" },
                { type: "text", text: refObj.role || "Partner" },
              ],
            },
          ];

          sendWhatsAppTemplate(
            businessId,
            { phoneId: waConfig.phoneId, accessToken: waConfig.accessToken },
            targetPhone,
            business.defaultReferenceTemplate,
            "en_IN",
            components
          ).catch((e) => {
            console.error(e);
            console.warn("Reference Notify Failed:", e);
          });
        }
      }

      const waConfig = business?.whatsappApiConfig;
      if (waConfig?.isVerified && customer?.phone) {
        const targetPhone = formatPhoneForMeta(customer.phone);
        const trackUrl = `${window.location.origin}/loyalty/track/${businessId}/${memberId}`;
        const templateName = waConfig.welcomeTemplateName || "welcome_member";
        const lang = waConfig.welcomeLanguageCode || "en_IN";

        const components = [
          {
            type: "body",
            parameters: [
              { type: "text", text: customer.name },
              { type: "text", text: finalCardNumber },
              { type: "text", text: trackUrl },
            ],
          },
        ];

        try {
          await sendWhatsAppTemplate(
            businessId,
            { phoneId: waConfig.phoneId, accessToken: waConfig.accessToken },
            targetPhone,
            templateName,
            lang,
            components
          );
        } catch (e: any) {
          console.error(e);
          console.warn("WhatsApp welcome failed:", e);
        }
      }

      setIsAddOpen(false);
      resetForm();
      toast({ title: "Member Active", description: `Issued Card: ${finalCardNumber}.` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitiatePayment = async () => {
    const customer = customers.find((c: any) => c.id === formData.customerId);
    const tierObj = tiers.find(
      (t: any) => t.name.toLowerCase() === formData.tier.toLowerCase()
    );

    if (!tierObj || !customer) {
      toast({
        variant: "destructive",
        title: "Config Error",
        description: "Selected tier or customer not found.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          tierId: tierObj.id,
          name: customer.name,
          phone: customer.phone,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.message);

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: business?.name || "Membership Hub",
        order_id: orderData.orderId,
        handler: async (response: any) => {
          setIsSubmitting(true);
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...response,
              businessId,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            toast({ title: "Payment Verified", description: "Membership activated." });
            setIsAddOpen(false);
            resetForm();
          } else {
            toast({
              variant: "destructive",
              title: "Verification Failed",
              description: verifyData.message,
            });
          }
          setIsSubmitting(false);
        },
        prefill: {
          name: customer.name,
          contact: customer.phone,
        },
        theme: { color: tierObj.color || "#0f172a" },
        modal: {
          ondismiss: () => setIsSubmitting(false),
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Payment Error", description: err.message });
      setIsSubmitting(false);
    }
  };

  const handleUpdateMember = () => {
    if (!businessId || !memberToEdit) return;
    const docRef = doc(firestore, "businesses", businessId, "memberships", memberToEdit.id);
    updateDocumentNonBlocking(docRef, {
      tier: memberToEdit.tier || "Gold",
      type: memberToEdit.type || "Yearly",
      registrationType: memberToEdit.registrationType || "Manual",
      cardNumber: (memberToEdit.cardNumber || "").trim().toUpperCase(),
      walletBalance: parseFloat(memberToEdit.walletBalance) || 0,
      rewardPoints: parseInt(memberToEdit.rewardPoints) || 0,
      paidAmount: parseFloat(memberToEdit.paidAmount) || 0,
      pointsMultiplier: parseFloat(memberToEdit.pointsMultiplier) || 1,
      cashbackPercent: parseFloat(memberToEdit.cashbackPercent) || 0,
      expiryDate: memberToEdit.expiryDate || "",
      status: memberToEdit.status || "active",
      referenceId: memberToEdit.referenceId || "",
      onboardedBy: memberToEdit.onboardedBy || "",
      updatedAt: serverTimestamp(),
    });
    setIsEditMemberOpen(false);
    toast({ title: "Membership Updated" });
  };

  const handleOpenEdit = (m: any) => {
    setMemberToEdit({ ...m });
    setIsEditMemberOpen(true);
  };

  const openDeleteConfirm = (e: React.MouseEvent, m: any) => {
    e.stopPropagation();
    setMemberToDelete(m);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = () => {
    if (!businessId || !memberToDelete) return;
    const docRef = doc(firestore, "businesses", businessId, "memberships", memberToDelete.id);
    deleteDocumentNonBlocking(docRef);
    setIsDeleteAlertOpen(false);
    setMemberToDelete(null);
    setIsDrawerOpen(false);
    toast({ title: "Member Removed", variant: "destructive" });
  };

  const handleExportCSV = () => {
    if (!filteredMembers || filteredMembers.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "Nothing to export based on filters.",
      });
      return;
    }

    const headers = [
      "SN.",
      "Name",
      "Mobile",
      "Card Number",
      "Membership Tier",
      "Registry Type",
      "Reference Partner",
      "Onboarded By",
      "Paid Amount",
      "Wallet Balance",
      "Reward Points",
      "Status",
      "Onboarding Date",
    ];

    const csvRows = filteredMembers.map((m: any, index: number) => {
      const cust = (customers || []).find((c) => c.id === m.customerId) || {};
      const refName =
        (references || []).find((r) => r.id === m.referenceId)?.name || "Direct";
      return [
        index + 1,
        `"${m.customerName || "N/A"}"`,
        `"${cust.phone || "N/A"}"`,
        `"${m.cardNumber || "N/A"}"`,
        `"${m.tier || "N/A"}"`,
        `"${m.registrationType || "Manual"}"`,
        `"${refName}"`,
        `"${m.onboardedBy || "N/A"}"`,
        m.paidAmount || 0,
        m.walletBalance || 0,
        m.rewardPoints || 0,
        `"${m.status || "Active"}"`,
        `"${m.startDate || ""}"`,
      ].join(",");
    });

    const csvContent = headers.join(",") + "\n" + csvRows.join("\n");
    const fileName = `member_registry_${new Date().toISOString().split("T")[0]}.csv`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.click();
    toast({ title: "Registry Exported" });
  };

  const isAutoAmount =
    formData.paymentMode.toLowerCase() === "online" ||
    formData.paymentMode.toLowerCase() === "upi" ||
    formData.paymentMode.toLowerCase() === "razorpay";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-slate-400 h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-left">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <PageHeader
        title="Member Registry"
        description="Onboard loyalty members, manage tiers, verify mobile OTPs, and issue digital cards."
        breadcrumb="Loyalty / Members"
        backHref="/loyalty"
        backLabel="Back to Loyalty"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleExportCSV}
              variant="outline"
              className="h-10 px-4 rounded-xl text-xs font-semibold"
            >
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Dialog
              open={isAddOpen}
              onOpenChange={(o) => {
                setIsAddOpen(o);
                if (!o) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold">
                  <UserPlus className="mr-2 h-4 w-4" /> Onboard Member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden rounded-2xl border border-slate-200 w-[95vw] text-left">
                <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800 text-left shrink-0">
                  <div className="flex items-center gap-3.5 text-left">
                    <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                      <UserPlus className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <DialogTitle className="text-lg font-bold text-white">
                        Issue Membership Card
                      </DialogTitle>
                      <DialogDescription className="text-slate-300 text-xs mt-0.5">
                        Verify customer identity and activate their digital loyalty card
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <ScrollArea className="max-h-[64vh]">
                  <div className="p-6 space-y-5 text-left">
                    <div className="space-y-1.5 text-left">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700">
                          Select Customer
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsNewCustomerOpen(true)}
                          className="h-7 px-2.5 text-xs font-medium text-slate-700 gap-1"
                        >
                          <UserPlus className="h-3.5 w-3.5" /> Add New Customer
                        </Button>
                      </div>
                      <Select
                        value={formData.customerId}
                        onValueChange={(v) => setFormData({ ...formData, customerId: v })}
                      >
                        <SelectTrigger className="h-10 rounded-xl text-left">
                          <SelectValue placeholder="Choose customer..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl z-[300]">
                          {eligibleCustomers.map((c: any) => (
                            <SelectItem key={c.id} value={c.id} className="text-sm font-medium">
                              {c.name} ({c.phone})
                            </SelectItem>
                          ))}
                          {eligibleCustomers.length === 0 && (
                            <SelectItem value="none" disabled>
                              All customers are active members
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-slate-700" />
                          <span className="text-xs font-semibold text-slate-700">
                            Mobile Verification
                          </span>
                        </div>
                        {isVerified && (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                            Confirmed
                          </Badge>
                        )}
                      </div>

                      {!otpSent ? (
                        <Button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isOtpLoading || !formData.customerId || isVerified}
                          variant="outline"
                          className="w-full h-10 rounded-xl bg-white text-xs font-semibold"
                        >
                          {isOtpLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <SmartphoneNfc className="h-4 w-4 mr-2" />
                          )}
                          Send OTP via WhatsApp
                        </Button>
                      ) : !isVerified ? (
                        <div className="space-y-3 text-center">
                          <Label
                            htmlFor="member-otp-input"
                            className="text-xs font-medium text-slate-600 block"
                          >
                            Enter 6-Digit Verification Code
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="member-otp-input"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                              maxLength={6}
                              placeholder="------"
                              className="h-10 rounded-xl bg-white text-center font-mono font-bold tracking-widest text-base flex-1"
                            />
                            <Button
                              type="button"
                              onClick={handleVerifyOtp}
                              disabled={isOtpLoading || otp.length < 6}
                              className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                            >
                              {isOtpLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                "Verify"
                              )}
                            </Button>
                          </div>

                          {otpDeliveryError && (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-left space-y-1">
                              <p className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                WhatsApp Dispatch Notice
                              </p>
                              <p className="text-xs text-amber-800 leading-snug break-words">
                                {otpDeliveryError}
                              </p>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                            {waFallbackLink && (
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 rounded-lg text-emerald-700 border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 font-medium text-xs gap-1.5"
                              >
                                <a
                                  href={waFallbackLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <MessageCircle className="h-3.5 w-3.5 text-emerald-600" /> Send via
                                  WhatsApp Web
                                </a>
                              </Button>
                            )}

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleSendOtp}
                              disabled={isOtpLoading}
                              className="h-8 px-2.5 text-xs font-medium text-slate-700 ml-auto"
                            >
                              {isOtpLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <RefreshCcw className="h-3 w-3 mr-1" />
                              )}
                              Resend OTP
                            </Button>
                          </div>

                          {isAdminOrStaff && generatedOtp && (
                            <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                              <div className="text-left">
                                <p className="text-xs text-slate-500">Staff Override Code</p>
                                <p className="text-sm font-mono font-bold text-slate-900 tracking-wider">
                                  {generatedOtp}
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setOtp(generatedOtp);
                                  setIsVerified(true);
                                  toast({
                                    title: "Staff Override Verified",
                                    description: "Identity confirmed via staff authorization.",
                                  });
                                }}
                                className="h-8 px-3 text-xs font-semibold rounded-lg"
                              >
                                Auto-Fill & Verify
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 p-2.5 bg-emerald-600 rounded-xl text-white">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs font-semibold">Identity Verified</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 text-left">
                      <Label
                        htmlFor="manual-card-no"
                        className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                      >
                        <IdCard className="h-3.5 w-3.5 text-slate-500" /> Card Number (optional)
                      </Label>
                      <Input
                        id="manual-card-no"
                        value={formData.manualCardNumber || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, manualCardNumber: e.target.value })
                        }
                        placeholder="Auto-generated if left blank"
                        className="h-10 rounded-xl font-mono font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-600">Tier Level</Label>
                        <Select
                          value={formData.tier}
                          onValueChange={(v) => setFormData({ ...formData, tier: v })}
                        >
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl z-[300]">
                            {TIERS_LIST.map((t) => (
                              <SelectItem key={t} value={t} className="text-xs font-medium">
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-600">Plan Cycle</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(v) => setFormData({ ...formData, type: v })}
                        >
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl z-[300]">
                            {MEMBERSHIP_TYPES.map((t) => (
                              <SelectItem key={t} value={t} className="text-xs font-medium">
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5 text-slate-500" /> Settlement Method
                        </Label>
                        <Select
                          value={formData.paymentMode}
                          onValueChange={(v) => setFormData({ ...formData, paymentMode: v })}
                        >
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue placeholder="Method" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl z-[300]">
                            {paymentModes.map((m: string) => (
                              <SelectItem key={m} value={m} className="text-xs font-medium">
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="paid-amount"
                          className="text-xs font-medium text-slate-600"
                        >
                          Payment Amount ({currencySymbol})
                        </Label>
                        <Input
                          id="paid-amount"
                          type="number"
                          value={formData.paidAmount}
                          readOnly={isAutoAmount}
                          onChange={(e) =>
                            setFormData({ ...formData, paidAmount: e.target.value })
                          }
                          className={cn(
                            "h-10 rounded-xl font-mono font-bold tabular-nums",
                            isAutoAmount && "bg-slate-50 text-slate-600"
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="open-wallet"
                          className="text-xs font-medium text-slate-600"
                        >
                          Opening Wallet (₹)
                        </Label>
                        <Input
                          id="open-wallet"
                          type="number"
                          value={formData.walletBalance}
                          onChange={(e) =>
                            setFormData({ ...formData, walletBalance: e.target.value })
                          }
                          className="h-10 rounded-xl font-mono tabular-nums"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="open-points"
                          className="text-xs font-medium text-slate-600"
                        >
                          Opening Points
                        </Label>
                        <Input
                          id="open-points"
                          type="number"
                          value={formData.rewardPoints}
                          onChange={(e) =>
                            setFormData({ ...formData, rewardPoints: e.target.value })
                          }
                          className="h-10 rounded-xl font-mono tabular-nums"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-left">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <Label
                            htmlFor="gift-switch"
                            className="text-xs font-semibold text-slate-900 cursor-pointer"
                          >
                            Gift Card
                          </Label>
                          <p className="text-xs text-slate-500">Complimentary</p>
                        </div>
                        <Switch
                          id="gift-switch"
                          checked={formData.isGift}
                          onCheckedChange={(v) => setFormData({ ...formData, isGift: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <Label
                            htmlFor="disc-switch"
                            className="text-xs font-semibold text-slate-900 cursor-pointer"
                          >
                            Special Disc.
                          </Label>
                          <p className="text-xs text-slate-500">Rate override</p>
                        </div>
                        <Switch
                          id="disc-switch"
                          checked={formData.isDiscount}
                          onCheckedChange={(v) => setFormData({ ...formData, isDiscount: v })}
                        />
                      </div>
                    </div>

                    {formData.isGift && (
                      <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-left">
                        <div className="flex items-center gap-2">
                          <Handshake className="h-4 w-4 text-slate-600" />
                          <Label className="text-xs font-semibold text-slate-700">
                            Gift Reference Partner
                          </Label>
                        </div>
                        <Select
                          value={formData.referenceId}
                          onValueChange={(v) => setFormData({ ...formData, referenceId: v })}
                        >
                          <SelectTrigger className="h-10 rounded-xl bg-white">
                            <SelectValue placeholder="Choose Reference..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl z-[300]">
                            {references.map((r: any) => (
                              <SelectItem key={r.id} value={r.id} className="text-xs">
                                {r.name} ({r.role})
                              </SelectItem>
                            ))}
                            {references.length === 0 && (
                              <SelectItem value="none" disabled>
                                No partners in registry
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <Separator />
                    <div className="space-y-1.5 text-left">
                      <Label
                        htmlFor="onboarded-by"
                        className="text-xs font-medium text-slate-600 flex items-center gap-1.5"
                      >
                        <UserCheck className="h-3.5 w-3.5 text-slate-500" /> Registered By
                      </Label>
                      <Input
                        id="onboarded-by"
                        value={formData.onboardedBy}
                        onChange={(e) =>
                          setFormData({ ...formData, onboardedBy: e.target.value })
                        }
                        placeholder="Staff Name"
                        className="h-10 rounded-xl"
                      />
                    </div>

                    {(formData.isGift || formData.isDiscount) && (
                      <div className="space-y-1.5 text-left">
                        <Label
                          htmlFor="onboard-note"
                          className="text-xs font-medium text-slate-600"
                        >
                          Onboarding Note
                        </Label>
                        <Textarea
                          id="onboard-note"
                          value={formData.onboardingNote}
                          onChange={(e) =>
                            setFormData({ ...formData, onboardingNote: e.target.value })
                          }
                          placeholder="Reason for complimentary or discounted card..."
                          className="min-h-[84px] rounded-xl p-3 text-sm"
                        />
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200 shrink-0">
                  <Button
                    type="button"
                    onClick={handleOnboard}
                    disabled={isSubmitting || !formData.customerId || !isVerified}
                    className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : isOnlinePayment ? (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" /> Proceed to Payment
                      </>
                    ) : (
                      "Issue Digital Card"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiStatCard
          label="Total Members"
          value={stats.total}
          subtext="Registered profiles"
          icon={Users}
        />
        <KpiStatCard
          label="Active Members"
          value={stats.active}
          subtext="Valid memberships"
          icon={CheckCircle2}
          tone="positive"
        />
        <KpiStatCard
          label="Membership Revenue"
          value={`${currencySymbol}${stats.totalRevenue.toLocaleString()}`}
          subtext="Collected enrollment fees"
          icon={TrendingUp}
        />
        <KpiStatCard
          label="High Value"
          value={stats.highValue}
          subtext="1,000+ reward points"
          icon={Gem}
          tone="dark"
        />
      </div>

      <SectionCard
        title="Member Directory"
        description="Search, filter, edit, or open customer digital card portals."
        bodyClassName="p-0"
      >
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <Select value={filterMode} onValueChange={(v: any) => setFilterMode(v)}>
              <SelectTrigger
                aria-label="Filter profile completeness"
                className="h-10 w-full sm:w-44 rounded-xl bg-white text-xs font-medium"
              >
                <SelectValue placeholder="All Members" />
              </SelectTrigger>
              <SelectContent className="rounded-xl z-[300]">
                <SelectItem value="all" className="text-xs font-medium">
                  All Identities
                </SelectItem>
                <SelectItem value="incomplete" className="text-xs font-medium text-amber-700">
                  Missing DOB / Anniversary
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2.5">
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger
                  aria-label="Filter by tier"
                  className="h-10 flex-1 sm:w-32 rounded-xl bg-white text-xs font-medium"
                >
                  <SelectValue placeholder="All Tiers" />
                </SelectTrigger>
                <SelectContent className="rounded-xl z-[300]">
                  <SelectItem value="all" className="text-xs font-medium">
                    All Tiers
                  </SelectItem>
                  {TIERS_LIST.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs font-medium">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  aria-label="Filter by status"
                  className="h-10 flex-1 sm:w-32 rounded-xl bg-white text-xs font-medium"
                >
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl z-[300]">
                  <SelectItem value="all" className="text-xs font-medium">
                    All Status
                  </SelectItem>
                  <SelectItem value="active" className="text-xs font-medium text-emerald-700">
                    Active
                  </SelectItem>
                  <SelectItem value="expired" className="text-xs font-medium text-rose-700">
                    Expired
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative flex-1 w-full xl:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search name, phone or card ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 pl-10 rounded-xl bg-white text-sm w-full"
            />
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="p-6">
            <EmptyStatePanel
              icon={Users}
              title="No members match these filters"
              description="Adjust your search query or onboard a new loyalty member."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow className="bg-slate-50/60">
                  <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">
                    Member
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 h-11">Tier</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 h-11">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 h-11">
                    Reference
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-600 h-11">
                    Paid
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-600 h-11">
                    Wallet
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-600 h-11">
                    Points
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                    Status
                  </TableHead>
                  <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-40">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((m: any) => {
                  const cust = (customers || []).find((c) => c.id === m.customerId);
                  const isNeedInfo = !cust?.dob || !cust?.anniversaryDate;
                  const ref = (references || []).find((r) => r.id === m.referenceId);

                  return (
                    <TableRow
                      key={m.id}
                      className="group hover:bg-slate-50/70 transition-colors border-b"
                    >
                      <TableCell className="pl-6 py-3.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMember(m);
                            setIsDrawerOpen(true);
                          }}
                          className="flex items-center gap-3 text-left group/btn"
                        >
                          <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                            {m.customerName?.charAt(0) || "M"}
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-slate-900 group-hover/btn:underline truncate">
                                {m.customerName}
                              </span>
                              {isNeedInfo && (
                                <span title="DOB or Anniversary missing">
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-mono text-slate-500 truncate">
                              {m.cardNumber}
                            </p>
                          </div>
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-xs font-medium border-slate-200 text-slate-700"
                        >
                          {m.tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-xs font-medium border",
                            m.registrationType === "Online"
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : m.registrationType === "Gifted"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : m.registrationType === "Discounted"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-50 text-slate-700 border-slate-200"
                          )}
                        >
                          {m.registrationType || "Manual"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium text-slate-600">
                          {ref ? ref.name : "Direct"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-slate-900 tabular-nums">
                        ₹{m.paidAmount?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-emerald-700 tabular-nums">
                        ₹{m.walletBalance?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-slate-900 tabular-nums">
                        {m.rewardPoints?.toLocaleString() || 0} Pts
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={cn(
                            "text-xs font-medium capitalize border",
                            m.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          )}
                        >
                          {m.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1">
                          {isAdminOrStaff && businessId && (
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-slate-600 hover:text-slate-900"
                            >
                              <Link
                                href={`/loyalty/track/${businessId}/${m.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Open portal for ${m.customerName}`}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit membership for ${m.customerName}`}
                            className="h-8 w-8 rounded-lg text-slate-600 hover:text-slate-900"
                            onClick={() => handleOpenEdit(m)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete membership for ${m.customerName}`}
                            className="h-8 w-8 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                            onClick={(e) => openDeleteConfirm(e, m)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* MEMBER DETAIL DRAWER */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col border-l border-slate-200 overflow-hidden bg-white text-left">
          <SheetHeader className="sr-only">
            <SheetTitle>{selectedMember?.customerName || "Member Profile"}</SheetTitle>
            <SheetDescription>
              View digital member card details and rewards balance.
            </SheetDescription>
          </SheetHeader>
          {selectedMember && (
            <>
              <div className="p-6 bg-slate-900 text-white border-b border-slate-800 shrink-0 text-left">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-white/15 text-white border-white/20 font-mono text-xs">
                      ID: {selectedMember.id.slice(-8).toUpperCase()}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${selectedMember.customerName}`}
                      className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                      onClick={() => handleOpenEdit(selectedMember)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-white flex items-center justify-center text-slate-900 font-bold text-xl shrink-0">
                      {selectedMember.customerName?.charAt(0) || "M"}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h3 className="text-xl font-bold text-white truncate">
                        {selectedMember.customerName}
                      </h3>
                      <p className="text-slate-300 text-xs font-mono">
                        {selectedMember.cardNumber} · {selectedMember.tier}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <ScrollArea className="flex-1 p-6 text-left">
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Layout className="h-4 w-4 text-slate-500" />
                    <h4 className="text-xs font-semibold text-slate-700">Rewards Summary</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <p className="text-xs text-slate-500">Reward Points</p>
                      <p className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                        {selectedMember.rewardPoints?.toLocaleString() || 0} Pts
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <p className="text-xs text-slate-500">Cashback Balance</p>
                      <p className="text-xl font-bold font-mono text-emerald-700 tabular-nums">
                        ₹{selectedMember.walletBalance?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <div className="p-5 border-t border-slate-200 bg-slate-50 flex gap-3 shrink-0">
                <Button
                  asChild
                  className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold gap-2 rounded-xl"
                >
                  <Link href={`/billing?customerId=${selectedMember.customerId}`}>
                    <Receipt className="h-4 w-4" /> New POS Bill
                  </Link>
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* EDIT MEMBER DIALOG */}
      <Dialog open={isEditMemberOpen} onOpenChange={setIsEditMemberOpen}>
        <DialogContent className="sm:max-w-[540px] rounded-2xl border border-slate-200 p-0 overflow-hidden text-left w-[95vw]">
          <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800 text-left shrink-0">
            <div className="flex items-center gap-3.5 text-left">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <Edit2 className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-lg font-bold text-white">
                  Edit Membership
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  Update card serial, balances, tier privileges, and status
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-6 space-y-5 text-left">
              {memberToEdit && (
                <>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="edit-card-no"
                      className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                    >
                      <IdCard className="h-3.5 w-3.5 text-slate-500" /> Card Number
                    </Label>
                    <Input
                      id="edit-card-no"
                      value={memberToEdit.cardNumber || ""}
                      onChange={(e) =>
                        setMemberToEdit({ ...memberToEdit, cardNumber: e.target.value })
                      }
                      className="h-10 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Tier Level</Label>
                      <Select
                        value={memberToEdit.tier || "Gold"}
                        onValueChange={(v) => setMemberToEdit({ ...memberToEdit, tier: v })}
                      >
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue placeholder="Select Tier" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl z-[300]">
                          {TIERS_LIST.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs font-medium">
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Registry Type</Label>
                      <Select
                        value={memberToEdit.registrationType || "Manual"}
                        onValueChange={(v) =>
                          setMemberToEdit({ ...memberToEdit, registrationType: v })
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {REGISTRATION_TYPES.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs font-medium">
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Plan Cycle</Label>
                      <Select
                        value={memberToEdit.type || "Yearly"}
                        onValueChange={(v) => setMemberToEdit({ ...memberToEdit, type: v })}
                      >
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {MEMBERSHIP_TYPES.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs font-medium">
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Status</Label>
                      <Select
                        value={memberToEdit.status || "active"}
                        onValueChange={(v) => setMemberToEdit({ ...memberToEdit, status: v })}
                      >
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="active" className="text-xs font-medium text-emerald-700">
                            Active
                          </SelectItem>
                          <SelectItem value="suspended" className="text-xs font-medium text-rose-700">
                            Suspended
                          </SelectItem>
                          <SelectItem value="lost" className="text-xs font-medium text-rose-700">
                            Lost
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="edit-paid"
                        className="text-xs font-medium text-slate-600"
                      >
                        Paid Amount ({currencySymbol})
                      </Label>
                      <Input
                        id="edit-paid"
                        type="number"
                        value={memberToEdit.paidAmount || 0}
                        onChange={(e) =>
                          setMemberToEdit({ ...memberToEdit, paidAmount: e.target.value })
                        }
                        className="h-10 rounded-xl font-mono tabular-nums"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="edit-wallet"
                        className="text-xs font-medium text-slate-600"
                      >
                        Wallet (₹)
                      </Label>
                      <Input
                        id="edit-wallet"
                        type="number"
                        value={memberToEdit.walletBalance || 0}
                        onChange={(e) =>
                          setMemberToEdit({ ...memberToEdit, walletBalance: e.target.value })
                        }
                        className="h-10 rounded-xl font-mono tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="edit-pts"
                        className="text-xs font-medium text-slate-600"
                      >
                        Reward Points
                      </Label>
                      <Input
                        id="edit-pts"
                        type="number"
                        value={memberToEdit.rewardPoints || 0}
                        onChange={(e) =>
                          setMemberToEdit({ ...memberToEdit, rewardPoints: e.target.value })
                        }
                        className="h-10 rounded-xl font-mono tabular-nums"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="edit-expiry"
                        className="text-xs font-medium text-slate-600"
                      >
                        Expiry Date
                      </Label>
                      <Input
                        id="edit-expiry"
                        type="date"
                        value={memberToEdit.expiryDate || ""}
                        onChange={(e) =>
                          setMemberToEdit({ ...memberToEdit, expiryDate: e.target.value })
                        }
                        className="h-10 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="edit-mult"
                        className="text-xs font-medium text-slate-600"
                      >
                        Multiplier (x)
                      </Label>
                      <Input
                        id="edit-mult"
                        type="number"
                        step="0.1"
                        value={memberToEdit.pointsMultiplier || 1}
                        onChange={(e) =>
                          setMemberToEdit({
                            ...memberToEdit,
                            pointsMultiplier: e.target.value,
                          })
                        }
                        className="h-10 rounded-xl font-mono tabular-nums"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="edit-cb"
                        className="text-xs font-medium text-slate-600"
                      >
                        Cashback (%)
                      </Label>
                      <Input
                        id="edit-cb"
                        type="number"
                        value={memberToEdit.cashbackPercent || 0}
                        onChange={(e) =>
                          setMemberToEdit({
                            ...memberToEdit,
                            cashbackPercent: e.target.value,
                          })
                        }
                        className="h-10 rounded-xl font-mono tabular-nums"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Handshake className="h-3.5 w-3.5 text-slate-500" /> Reference Partner
                    </Label>
                    <Select
                      value={memberToEdit.referenceId || "none"}
                      onValueChange={(v) =>
                        setMemberToEdit({
                          ...memberToEdit,
                          referenceId: v === "none" ? "" : v,
                        })
                      }
                    >
                      <SelectTrigger className="h-10 rounded-xl bg-white">
                        <SelectValue placeholder="No Reference" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl z-[300]">
                        <SelectItem value="none" className="text-xs font-medium">
                          Direct (No Reference)
                        </SelectItem>
                        {references.map((r: any) => (
                          <SelectItem key={r.id} value={r.id} className="text-xs">
                            {r.name} ({r.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="edit-staff"
                      className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-slate-500" /> Registered By
                    </Label>
                    <Input
                      id="edit-staff"
                      value={memberToEdit.onboardedBy || ""}
                      onChange={(e) =>
                        setMemberToEdit({ ...memberToEdit, onboardedBy: e.target.value })
                      }
                      className="h-10 rounded-xl"
                    />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200">
            <Button
              type="button"
              onClick={handleUpdateMember}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-2xl border border-slate-200 p-6 text-left w-[92vw] sm:w-full">
          <AlertDialogHeader>
            <div className="h-11 w-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-3">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">
              Delete Membership?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600 leading-relaxed text-left">
              Are you sure you want to permanently remove{" "}
              <span className="font-semibold text-slate-900">
                &ldquo;{memberToDelete?.customerName}&rdquo;
              </span>
              ? This will revoke their digital card and accumulated points/wallet balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col sm:flex-row gap-3">
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline" className="flex-1 h-10 rounded-xl text-xs">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                onClick={confirmDelete}
                className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                Delete Member
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <NewCustomerDialog
        isOpen={isNewCustomerOpen}
        onOpenChange={setIsNewCustomerOpen}
        onSaveSuccess={(cid) => {
          setFormData({ ...formData, customerId: cid });
          setIsNewCustomerOpen(false);
        }}
        businessId={businessId!}
        currencySymbol={currencySymbol}
        defaultState={business?.defaultState || business?.state}
      />
    </div>
  );
}
