"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import {
  UserPlus,
  CheckCircle2,
  SmartphoneNfc,
  ShieldCheck,
  Sparkles,
  Loader2,
  Gift,
  Star,
  Info,
  Heart,
  CreditCard,
  ListTodo,
  MapPin,
  Mail,
  Phone,
  BadgeCheck,
  Ticket,
  Clock,
  Check,
  Flame,
  Crown,
  Tag,
  X,
  FileText,
  Grid,
  SearchCode,
  AlertTriangle,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useFirestore,
  useDoc,
  useMemoFirebase,
  useCollection,
  useAuth,
  setupRecaptcha,
  initiatePhoneSignIn,
} from "@/firebase";
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  getDocs,
  limit,
  getDoc,
} from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { calculateGST } from "@/lib/mock-db";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { ConfirmationResult } from "firebase/auth";
import { useSearchParams, useRouter } from "next/navigation";
import Script from "next/script";
import { getPublicBusinessNode } from "@/app/actions/p0-migration";

const THEME_STYLES: Record<string, string> = {
  blue: "bg-gradient-to-br from-blue-600 to-indigo-800",
  purple: "bg-gradient-to-br from-purple-600 to-pink-700",
  orange: "bg-gradient-to-br from-orange-500 to-red-600",
  green: "bg-gradient-to-br from-emerald-600 to-teal-800",
  black: "bg-gradient-to-br from-slate-800 to-slate-950",
  red: "bg-gradient-to-br from-red-600 to-rose-900",
  gold: "bg-gradient-to-br from-amber-500 to-amber-700",
  cyan: "bg-gradient-to-br from-cyan-600 to-blue-800",
  rose: "bg-gradient-to-br from-rose-500 to-pink-700",
  indigo: "bg-gradient-to-br from-indigo-800 to-slate-900",
};

const GROUP_ICONS: Record<string, any> = {
  Star,
  Zap,
  Gift,
  Flame,
  Ticket,
  Tag,
  Gem: Star,
  Grid,
};

const HighlightedText = ({
  text,
  highlight,
  color,
  isGradient,
  gradientEnd,
}: {
  text: string;
  highlight?: string;
  color?: string;
  isGradient?: boolean;
  gradientEnd?: string;
}) => {
  if (!highlight || !text || !highlight.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${highlight})`, "gi"));
  const highlightStyle: React.CSSProperties = isGradient
    ? {
        backgroundImage: `linear-gradient(to right, ${color || "#0C83B3"}, ${gradientEnd || "#2DD4BF"})`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        display: "inline-block",
      }
    : {
        color: color || "inherit",
      };
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} style={highlightStyle} className="font-bold">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

function JoinContent({ businessId: paramId }: { businessId: string }) {
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralIdFromUrl = searchParams.get("ref");

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [business, setBusiness] = useState<any>(null);
  const [isBizLoading, setIsBizLoading] = useState(true);

  useEffect(() => {
    async function resolveId() {
      if (!paramId) return;
      setIsBizLoading(true);
      try {
        let actualId = paramId;
        if (!paramId.startsWith("biz_")) {
          const q = query(
            collection(firestore, "businesses"),
            where("slug", "==", paramId.toLowerCase()),
            limit(1)
          );
          const snap = await getDocs(q);
          if (!snap.empty) actualId = snap.docs[0].id;
        }

        setBusinessId(actualId);
        const node = await getPublicBusinessNode(actualId);
        setBusiness(node);
      } catch (e) {
        console.error(e);
      } finally {
        setIsBizLoading(false);
      }
    }
    resolveId();
  }, [paramId, firestore]);

  const configRef = useMemoFirebase(
    () =>
      businessId
        ? doc(firestore, "businesses", businessId, "loyaltyJoinConfig", "main")
        : null,
    [firestore, businessId]
  );
  const { data: portalConfig, isLoading: isConfigLoading } =
    useDoc<any>(configRef);

  const tiersQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(firestore, "businesses", businessId, "loyaltyTiers")
        : null,
    [firestore, businessId]
  );
  const { data: tiersRaw } = useCollection<any>(tiersQuery);

  const tiers = useMemo(() => {
    if (!tiersRaw) return [];
    return tiersRaw
      .filter((t: any) => (t.status || "").toLowerCase() === "active")
      .sort((a: any, b: any) => (a.minSpend || 0) - (b.minSpend || 0));
  }, [tiersRaw]);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    referralId: referralIdFromUrl || "",
    selectedTierId: "",
  });

  const [step, setStep] = useState<"browse" | "details" | "verify" | "payment">(
    "browse"
  );
  const [otp, setOtp] = useState("");
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inspectingTier, setInspectingTier] = useState<any>(null);
  const [inspectingCoupon, setInspectingCoupon] = useState<any>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [existingMember, setExistingMember] = useState<any>(null);

  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false);
  const [validCouponCode, setValidCouponCode] = useState("");

  useEffect(() => {
    if (tiers.length > 0 && !formData.selectedTierId) {
      setFormData((prev) => ({ ...prev, selectedTierId: tiers[0].id }));
    }
  }, [tiers, formData.selectedTierId]);

  useEffect(() => {
    if (!businessId || !pendingOrderId) return;

    const orderRef = doc(
      firestore,
      "businesses",
      businessId,
      "orders",
      pendingOrderId
    );
    const unsubscribe = onSnapshot(orderRef, (snap) => {
      const data = snap.data();
      if (data?.status === "paid") {
        const cleanPhone = formData.phone.replace(/\D/g, "").slice(-10);
        const membershipId = `mem_c_${cleanPhone}`;
        router.push(`/loyalty/success?id=${membershipId}&bId=${businessId}`);
      }
    });

    return () => unsubscribe();
  }, [businessId, pendingOrderId, firestore, router, formData.phone]);

  const selectedTierData = useMemo(() => {
    return (
      (tiers || []).find((t: any) => t.id === formData.selectedTierId) || null
    );
  }, [formData.selectedTierId, tiers]);

  const allActiveCouponsQuery = useMemoFirebase(() => {
    if (!businessId) return null;
    return query(
      collection(firestore, "businesses", businessId, "coupons"),
      where("status", "==", "active")
    );
  }, [firestore, businessId]);
  const { data: allActiveCoupons } = useCollection<any>(allActiveCouponsQuery);

  const bundledCoupons = useMemo(() => {
    if (!allActiveCoupons || !selectedTierData?.linkedCouponIds) return [];
    return allActiveCoupons.filter((c) =>
      selectedTierData.linkedCouponIds.includes(c.id)
    );
  }, [allActiveCoupons, selectedTierData?.linkedCouponIds]);

  const groupedCoupons = useMemo(() => {
    const groups: Record<string, any[]> = {};
    bundledCoupons.forEach((c) => {
      const gId = c.groupId || "none";
      if (!groups[gId]) groups[gId] = [];
      groups[gId].push(c);
    });
    return groups;
  }, [bundledCoupons]);

  const offerGroups = useMemo(() => business?.offerGroups || [], [business]);

  const selectedTierGST = useMemo(() => {
    if (!selectedTierData || !business) return null;
    const rawBase = parseFloat(selectedTierData.minSpend) || 0;
    const base = Math.max(0, rawBase - appliedDiscount);
    const rate =
      selectedTierData.gstRate !== undefined &&
      selectedTierData.gstRate !== null
        ? parseFloat(selectedTierData.gstRate)
        : parseFloat(business.defaultGstRate) || 18;

    const mode = business.gstMode || "exclusive";
    return calculateGST(base, rate, false, mode);
  }, [selectedTierData, business, appliedDiscount]);

  const handleSelectTier = (tierId: string) => {
    setFormData((prev) => ({ ...prev, selectedTierId: tierId }));
    setStep("details");
    setAppliedDiscount(0);
    setValidCouponCode("");
    setTimeout(() => {
      const element = document.getElementById("join-membership-section");
      if (element)
        element.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleApplyPromo = async () => {
    if (!couponCode.trim() || !businessId || !selectedTierData) return;
    setIsVerifyingCoupon(true);
    try {
      const cRef = doc(
        firestore,
        "businesses",
        businessId,
        "coupons",
        couponCode.toUpperCase()
      );
      const cSnap = await getDoc(cRef);
      if (cSnap.exists()) {
        const cData = cSnap.data();
        const tierBase = parseFloat(selectedTierData.minSpend) || 0;

        if (cData.status !== "active") {
          toast({ variant: "destructive", title: "Coupon Expired" });
        } else if (tierBase < (cData.minOrder || 0)) {
          toast({
            variant: "destructive",
            title: "Minimum Order Not Met",
            description: `Requires ₹${cData.minOrder} minimum value.`,
          });
        } else {
          let discount = 0;
          if (cData.type === "percentage") {
            discount = tierBase * (parseFloat(cData.value) / 100);
            if (cData.maxDiscount)
              discount = Math.min(discount, parseFloat(cData.maxDiscount));
          } else if (cData.type === "fixed") {
            discount = parseFloat(cData.value);
          }
          setAppliedDiscount(discount);
          setValidCouponCode(cData.code);
          toast({
            title: "Promo Applied",
            description: `You saved ₹${discount.toLocaleString()}!`,
          });
        }
      } else {
        toast({ variant: "destructive", title: "Invalid Promo Code" });
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Validation Error" });
    } finally {
      setIsVerifyingCoupon(false);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name || !formData.phone || formData.phone.length < 10) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Name and a valid 10-digit mobile number are required.",
      });
      return;
    }

    setIsOtpSending(true);
    setExistingMember(null);

    try {
      const cleanPhone = formData.phone.replace(/\D/g, "").slice(-10);
      const custQuery = query(
        collection(firestore, "businesses", businessId!, "customers"),
        where("phone", "==", cleanPhone),
        limit(1)
      );
      const custSnap = await getDocs(custQuery);

      if (!custSnap.empty) {
        const customerId = custSnap.docs[0].id;
        const memRef = doc(
          firestore,
          "businesses",
          businessId!,
          "memberships",
          `mem_${customerId}`
        );
        const memSnap = await getDoc(memRef);
        if (memSnap.exists() && memSnap.data().status === "active") {
          setExistingMember(memSnap.data());
          setIsOtpSending(false);
          toast({
            variant: "destructive",
            title: "Already a Member",
            description: "An active membership already exists for this number.",
          });
          return;
        }
      }

      const verifier = setupRecaptcha(auth, "recaptcha-container");
      if (!verifier) throw new Error("Verification system offline.");

      const formattedPhone = formData.phone.startsWith("+")
        ? formData.phone
        : `+91${formData.phone}`;
      const result = await initiatePhoneSignIn(auth, formattedPhone, verifier);
      setConfirmationResult(result);
      setStep("verify");
      toast({ title: "OTP Sent" });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Verification Busy",
        description: err.message || "Failed to send OTP.",
      });
    } finally {
      setIsOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !confirmationResult) return;
    setIsSubmitting(true);
    try {
      await confirmationResult.confirm(otp);
      setStep("payment");
      toast({ title: "Phone Verified" });
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Invalid OTP" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitiatePayment = async () => {
    setIsSubmitting(true);
    try {
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          tierId: formData.selectedTierId,
          name: formData.name,
          phone: formData.phone,
          couponCode: validCouponCode,
          referralCode: formData.referralId,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.message);

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: business?.name || "Membership Portal",
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
          const verifyResult = await verifyRes.json();
          if (verifyResult.success) {
            const cleanPhone = formData.phone.replace(/\D/g, "").slice(-10);
            const mId = `mem_c_${cleanPhone}`;
            router.push(`/loyalty/success?id=${mId}&bId=${businessId}`);
          } else {
            toast({
              variant: "destructive",
              title: "Verification Failed",
              description: verifyResult.message,
            });
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: formData.name,
          contact: formData.phone,
        },
        theme: { color: selectedTierData?.color || "#0C83B3" },
        modal: {
          ondismiss: () => {
            setIsSubmitting(false);
            setPendingOrderId(null);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: err.message,
      });
      setIsSubmitting(false);
    }
  };

  const titleFont = portalConfig?.titleFont || "Mukta";
  const descFont = portalConfig?.descriptionFont || "Mukta";
  const titleSize = portalConfig?.titleFontSize
    ? `${portalConfig.titleFontSize}px`
    : "36px";
  const descSize = portalConfig?.descriptionFontSize
    ? `${portalConfig.descriptionFontSize}px`
    : "16px";
  const fontUrl = `https://fonts.googleapis.com/css2?family=${titleFont.replace(" ", "+")}:wght@400;700;900&family=${descFont.replace(" ", "+")}:wght@400;500;700&display=swap`;

  const currencySymbol = getCurrencySymbol(business?.currency || "INR");

  const inquireWhatsAppHref = useMemo(() => {
    if (!inspectingCoupon) return "#";
    const msg = `Namaste! I want to inquire about the offer *${inspectingCoupon.code}* seen on your join portal at ${business?.name || "Store"}.`;
    return `https://wa.me/${business?.phone?.replace(/\D/g, "") || ""}?text=${encodeURIComponent(msg)}`;
  }, [inspectingCoupon, business]);

  if (isBizLoading || isConfigLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />
      <div className="min-h-screen bg-slate-50 pb-20 font-body text-left">
        <link rel="stylesheet" href={fontUrl} />
        <div id="recaptcha-container" />

        <header className="sticky top-0 z-50 bg-white border-b border-slate-200 h-16 sm:h-20 flex items-center">
          <div className="max-w-6xl mx-auto px-4 w-full flex items-center justify-between gap-4 text-left">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 sm:h-11 sm:w-11 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
                {portalConfig?.logoUrl ? (
                  <img
                    src={portalConfig.logoUrl}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    alt={portalConfig?.storeName || business?.name || "Store logo"}
                  />
                ) : (
                  <div className="h-full w-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                    {business?.name?.charAt(0) || "B"}
                  </div>
                )}
              </div>
              <span className="text-sm sm:text-base font-bold text-slate-900 truncate max-w-[180px]">
                {portalConfig?.storeName || business?.name}
              </span>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 rounded-xl text-xs font-semibold text-primary border-slate-200 gap-2 px-3"
            >
              <Link href={`/loyalty/track-member/${paramId}`}>
                <SearchCode className="h-4 w-4" />{" "}
                <span className="hidden sm:inline">Member Login</span>
              </Link>
            </Button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 pt-8 space-y-14">
          <div className="text-center space-y-6 py-4 sm:py-8">
            <div className="flex flex-col items-center gap-5">
              <div className="h-20 w-20 sm:h-24 sm:w-24 bg-white rounded-2xl flex items-center justify-center border border-slate-200 overflow-hidden">
                {portalConfig?.logoUrl ? (
                  <img
                    src={portalConfig.logoUrl}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    alt={portalConfig?.storeName || business?.name || "Store logo"}
                  />
                ) : (
                  <div className="h-full w-full bg-primary flex items-center justify-center text-white font-bold text-3xl">
                    {business?.name?.charAt(0) || "B"}
                  </div>
                )}
              </div>
              <Badge
                variant="outline"
                className="h-7 px-4 border-slate-300 bg-slate-900 text-white text-xs font-semibold rounded-full"
              >
                Official Membership Portal
              </Badge>
            </div>
            <div className="space-y-3 px-2 max-w-3xl mx-auto">
              <h1
                className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight"
                style={{ fontFamily: titleFont, fontSize: titleSize }}
              >
                <HighlightedText
                  text={portalConfig?.title || "Unlock Exclusive Membership Privileges"}
                  highlight={portalConfig?.titleHighlightWord}
                  color={portalConfig?.titleHighlightColor}
                  isGradient={portalConfig?.titleHighlightGradient}
                  gradientEnd={portalConfig?.titleGradientEnd}
                />
              </h1>
              <p
                className="text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto text-sm sm:text-base"
                style={{ fontFamily: descFont, fontSize: descSize }}
              >
                <HighlightedText
                  text={
                    portalConfig?.description ||
                    "Join our loyalty program to earn reward points, instant cashback, and member-only offers."
                  }
                  highlight={portalConfig?.descriptionHighlightWord}
                  color={portalConfig?.descriptionHighlightColor}
                  isGradient={portalConfig?.descriptionHighlightGradient}
                  gradientEnd={portalConfig?.descriptionGradientEnd}
                />
              </p>
            </div>
          </div>

          <section className="space-y-6">
            <div className="text-center space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Available Membership Plans
              </h2>
              <p className="text-sm text-slate-500">
                Choose a membership card to unlock rewards and welcome coupons.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
              {tiers.map((tier: any) => {
                const isSelected = formData.selectedTierId === tier.id;
                return (
                  <Card
                    key={tier.id}
                    className={cn(
                      "bg-white rounded-2xl overflow-hidden border transition-colors flex flex-col h-full shadow-none",
                      isSelected
                        ? "border-primary ring-2 ring-primary/15"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div
                      className="p-6 text-white flex flex-col justify-between min-h-[168px]"
                      style={{ backgroundColor: tier.color || "#0C83B3" }}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="space-y-1">
                          <Badge className="bg-white/20 text-white border-none text-xs font-medium px-2.5 h-5">
                            Membership
                          </Badge>
                          <h3 className="text-xl font-bold tracking-tight">
                            {tier.name}
                          </h3>
                        </div>
                        <Crown
                          className={cn(
                            "h-7 w-7 shrink-0",
                            isSelected ? "text-white" : "text-white/50"
                          )}
                        />
                      </div>
                      <div className="flex justify-between items-end pt-4">
                        <div>
                          <p className="text-xs text-white/75">
                            Membership Fee
                          </p>
                          <p className="text-2xl font-bold font-mono tabular-nums">
                            {currencySymbol}
                            {parseFloat(tier.minSpend || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-white/80">+ GST extra</p>
                        </div>
                        <div className="h-9 w-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                          <SmartphoneNfc className="h-4 w-4" />
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-6 space-y-5 flex-1 flex flex-col text-left">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-xs font-medium text-slate-500">
                            Rewards
                          </p>
                          <p className="text-sm font-bold text-primary font-mono tabular-nums mt-0.5">
                            {tier.pointsMultiplier}x Points
                          </p>
                        </div>
                        <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 text-center">
                          <p className="text-xs font-medium text-emerald-700">
                            Cashback
                          </p>
                          <p className="text-sm font-bold text-emerald-800 font-mono tabular-nums mt-0.5">
                            {tier.cashbackPercent}% Back
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4 flex-1 text-left">
                        <div className="space-y-2.5">
                          <h4 className="text-xs font-semibold text-slate-500">
                            Included Privileges
                          </h4>
                          {(tier.benefits || [])
                            .slice(0, 4)
                            .map((benefit: string, i: number) => (
                              <div key={i} className="flex gap-2.5 items-start">
                                <BadgeCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span className="text-xs font-medium text-slate-700 leading-snug">
                                  {benefit}
                                </span>
                              </div>
                            ))}
                        </div>

                        {tier.linkedCouponIds?.length > 0 && (
                          <div className="pt-3 border-t border-dashed border-slate-200">
                            <Badge className="bg-slate-900 text-white border-none text-xs font-medium h-6 px-3">
                              <Ticket className="h-3.5 w-3.5 mr-1.5" />{" "}
                              {tier.linkedCouponIds.length} Welcome Coupons
                            </Badge>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setInspectingTier(tier)}
                          className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1.5"
                        >
                          <Info className="h-3.5 w-3.5" /> View Full Details
                        </button>
                      </div>

                      <Button
                        type="button"
                        onClick={() => handleSelectTier(tier.id)}
                        className={cn(
                          "w-full h-11 rounded-xl font-semibold text-xs transition-colors",
                          isSelected
                            ? "bg-primary text-white"
                            : "bg-slate-100 text-slate-800 hover:bg-primary hover:text-white"
                        )}
                      >
                        {isSelected ? "Selected Plan" : "Join Membership"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {bundledCoupons && bundledCoupons.length > 0 && (
            <section className="space-y-8 text-left">
              <div className="text-center space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Included Welcome Rewards
                </h2>
                <p className="text-sm text-slate-500">
                  Unlocked automatically with your{" "}
                  <span className="font-semibold text-slate-700">
                    {selectedTierData?.name}
                  </span>{" "}
                  membership
                </p>
              </div>

              <div className="space-y-10">
                {offerGroups.length > 0 &&
                Object.keys(groupedCoupons).some((k) => k !== "none") ? (
                  offerGroups.map((group: any) => {
                    const groupCoupons = groupedCoupons[group.id];
                    if (!groupCoupons || groupCoupons.length === 0) return null;
                    const IconComp = GROUP_ICONS[group.icon] || Star;
                    return (
                      <div key={group.id} className="space-y-4 text-left">
                        <div className="flex items-center gap-3.5">
                          <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary shrink-0 border border-slate-200">
                            <IconComp className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900 leading-none">
                              {group.name}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                              {groupCoupons.length} reward card
                              {groupCoupons.length === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {groupCoupons.map((c: any) => (
                            <CouponPublicCard
                              key={c.id}
                              data={c}
                              business={business}
                              currencySymbol={currencySymbol}
                              onInspect={setInspectingCoupon}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bundledCoupons.map((c: any) => (
                      <CouponPublicCard
                        key={c.id}
                        data={c}
                        business={business}
                        currencySymbol={currencySymbol}
                        onInspect={setInspectingCoupon}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          <div
            id="join-membership-section"
            className="max-w-2xl mx-auto w-full scroll-mt-24"
          >
            {existingMember && (
              <Card className="bg-white rounded-2xl p-6 sm:p-8 mb-6 border border-orange-300 shadow-none">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-11 w-11 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-slate-900">
                      Existing Membership Found
                    </h3>
                    <p className="text-xs text-slate-500">
                      This mobile number is already enrolled.
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed text-left mb-6">
                  Mobile number{" "}
                  <strong className="font-mono tabular-nums">
                    {formData.phone}
                  </strong>{" "}
                  is already linked to an active membership. You can sign in
                  directly to view your points and coupons.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <Button
                    asChild
                    className="h-11 rounded-xl bg-primary text-white font-semibold text-xs"
                  >
                    <Link href={`/loyalty/track-member/${paramId}`}>
                      Go to Member Portal
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setExistingMember(null)}
                    className="h-11 rounded-xl font-semibold text-xs border-slate-200"
                  >
                    Use Another Number
                  </Button>
                </div>
              </Card>
            )}

            {!existingMember && (step === "details" || step === "browse") && (
              <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden text-left shadow-none">
                <CardHeader className="p-6 sm:p-8 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-primary shrink-0">
                      <UserPlus className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight">
                        Member Enrollment
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Selected tier:{" "}
                        <span className="font-semibold text-slate-700">
                          {selectedTierData?.name || "Choose above"}
                        </span>
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-8">
                  <form onSubmit={handleSendOtp} className="space-y-5 text-left">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="enroll-name"
                        className="text-xs font-semibold text-slate-700"
                      >
                        Full Name *
                      </Label>
                      <Input
                        id="enroll-name"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Enter your full name"
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 text-base font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="enroll-phone"
                        className="text-xs font-semibold text-slate-700"
                      >
                        WhatsApp Mobile Number *
                      </Label>
                      <Input
                        id="enroll-phone"
                        required
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            phone: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        placeholder="98XXXXXXXX"
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 text-base font-mono tabular-nums tracking-wider"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="enroll-referral"
                        className="text-xs font-semibold text-slate-700"
                      >
                        Referral Code (Optional)
                      </Label>
                      <div className="relative">
                        <Gift className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="enroll-referral"
                          value={formData.referralId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              referralId: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder="BIZ-XXXX"
                          className="h-12 pl-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-mono font-semibold tracking-wider"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={isOtpSending}
                      className="w-full h-12 bg-primary font-semibold text-sm rounded-xl text-white"
                    >
                      {isOtpSending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending
                          OTP...
                        </>
                      ) : (
                        "Send Verification OTP"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {step === "verify" && (
              <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden text-left shadow-none">
                <CardHeader className="p-6 sm:p-8 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-primary shrink-0">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight">
                        Phone Verification
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                        Sent to {formData.phone}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 space-y-6 text-center">
                  <div className="space-y-2">
                    <Label
                      htmlFor="enroll-otp"
                      className="text-xs font-semibold text-slate-600 block"
                    >
                      Enter 6-Digit Code
                    </Label>
                    <Input
                      id="enroll-otp"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, ""))
                      }
                      maxLength={6}
                      placeholder="000000"
                      className="h-16 text-center text-3xl sm:text-4xl font-bold font-mono tabular-nums tracking-[0.4em] rounded-xl bg-slate-50 border-slate-200"
                    />
                  </div>
                  <div className="flex justify-between px-1">
                    <button
                      type="button"
                      onClick={() => setStep("details")}
                      className="text-xs font-medium text-slate-600 hover:underline"
                    >
                      Edit Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Resend OTP
                    </button>
                  </div>
                  <Button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={isSubmitting || otp.length < 6}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-semibold text-sm rounded-xl text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />{" "}
                        Verifying...
                      </>
                    ) : (
                      "Verify & Continue"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === "payment" && (
              <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden text-left shadow-none">
                <CardHeader className="p-6 sm:p-8 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-primary shrink-0">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight">
                        Checkout Summary
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Selected:{" "}
                        <span className="font-semibold text-slate-700">
                          {selectedTierData?.name}
                        </span>
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="checkout-promo"
                        className="text-xs font-semibold text-slate-700"
                      >
                        Apply Promo Code
                      </Label>
                      {validCouponCode && (
                        <Badge className="bg-emerald-600 text-white text-xs font-medium px-2.5 h-5 border-none">
                          Applied
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2.5">
                      <Input
                        id="checkout-promo"
                        value={couponCode}
                        onChange={(e) =>
                          setCouponCode(e.target.value.toUpperCase())
                        }
                        disabled={isVerifyingCoupon || !!validCouponCode}
                        placeholder="CODE"
                        className="h-11 rounded-xl bg-slate-50 border-slate-200 font-mono font-semibold uppercase tracking-wider"
                      />
                      {validCouponCode ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="Clear promo code"
                          className="h-11 w-11 rounded-xl border-red-200 text-red-600 hover:bg-red-50 shrink-0"
                          onClick={() => {
                            setValidCouponCode("");
                            setAppliedDiscount(0);
                            setCouponCode("");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={handleApplyPromo}
                          disabled={isVerifyingCoupon || !couponCode}
                          className="h-11 px-5 rounded-xl bg-primary font-semibold text-xs shrink-0"
                        >
                          {isVerifyingCoupon ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Apply"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 bg-slate-900 text-white rounded-2xl space-y-3 text-center">
                    <p className="text-xs font-medium text-slate-300">
                      Total Payable (Incl. GST)
                    </p>

                    <div className="space-y-1.5">
                      {appliedDiscount > 0 && (
                        <p className="text-lg font-semibold line-through text-slate-400 font-mono tabular-nums">
                          {currencySymbol}
                          {Math.round(
                            parseFloat(selectedTierData?.minSpend || 0) *
                              (1 +
                                parseFloat(business?.defaultGstRate || 18) /
                                  100)
                          ).toLocaleString()}
                        </p>
                      )}
                      <h3 className="text-4xl sm:text-5xl font-bold tracking-tight font-mono tabular-nums">
                        {currencySymbol}
                        {selectedTierGST?.lineTotal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </h3>
                      {appliedDiscount > 0 && (
                        <Badge className="bg-emerald-600 text-white border-none text-xs font-medium px-3 py-0.5 mt-1">
                          Saved {currencySymbol}
                          {appliedDiscount.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleInitiatePayment}
                    disabled={isSubmitting}
                    className="w-full h-12 bg-primary hover:bg-primary/90 font-semibold text-sm rounded-xl text-white"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 mr-2" />
                    )}
                    Finalize & Pay
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {(portalConfig?.rules || business?.loyaltyRules) && (
            <section className="space-y-6 pb-8 text-left">
              <div className="text-center space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Program Guidelines
                </h2>
              </div>
              <Card className="max-w-4xl mx-auto border border-slate-200 bg-white rounded-2xl overflow-hidden p-6 sm:p-8 shadow-none">
                <div className="space-y-5 text-left">
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-primary shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">
                        Membership Rules & Policy
                      </h4>
                      <p className="text-xs text-slate-500">
                        Terms and conditions for reward accrual and benefits
                      </p>
                    </div>
                  </div>
                  <Separator className="bg-slate-200" />
                  <div className="space-y-3">
                    {(
                      portalConfig?.rules ||
                      business?.loyaltyRules ||
                      "Standard program rules apply."
                    )
                      .split("\n")
                      .filter((l: string) => l.trim() !== "")
                      .map((rule: string, i: number) => (
                        <div
                          key={i}
                          className="flex gap-3.5 items-start p-3 rounded-xl bg-slate-50/70 border border-slate-100"
                        >
                          <div className="h-6 w-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-primary shrink-0 font-mono tabular-nums">
                            {i + 1}
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed flex-1">
                            {rule}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              </Card>
            </section>
          )}
        </main>

        <footer className="mt-16 py-14 bg-white border-t border-slate-200 text-left px-4">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  B
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Official Loyalty Portal
                  </p>
                  <p className="text-xs text-slate-500">
                    Membership program by{" "}
                    <span className="font-semibold text-slate-700">
                      {business?.name}
                    </span>
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                © 2026 Biztrix AI • Verified Checkout & Enrollment
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500">
                  Store Address
                </h4>
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-slate-700 leading-relaxed">
                    {portalConfig?.storeAddress ||
                      business?.address ||
                      "Location pending"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500">
                  Contact Us
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-primary shrink-0" />
                    <a
                      href={`tel:${portalConfig?.storePhone || business?.phone}`}
                      className="text-xs font-semibold font-mono tabular-nums text-slate-900 hover:underline"
                    >
                      {portalConfig?.storePhone || business?.phone || "N/A"}
                    </a>
                  </div>
                  {portalConfig?.storeEmail && (
                    <div className="flex items-center gap-2.5">
                      <Mail className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs font-medium text-slate-600">
                        {portalConfig.storeEmail}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500">
                  Trust & Security
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-medium text-slate-700">
                      OTP Verified Enrollment
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-slate-700">
                      Encrypted Checkout Gateway
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </footer>

        {/* Inspect Tier Dialog */}
        <Dialog
          open={!!inspectingTier}
          onOpenChange={(open) => !open && setInspectingTier(null)}
        >
          <DialogContent className="sm:max-w-[460px] h-[88vh] rounded-2xl border border-slate-200 p-0 overflow-hidden w-[95vw] flex flex-col text-left">
            <DialogHeader className="sr-only">
              <DialogTitle>Tier Details</DialogTitle>
              <DialogDescription>Membership plan benefits</DialogDescription>
            </DialogHeader>
            {inspectingTier && (
              <>
                <div
                  className="p-6 sm:p-8 text-white shrink-0"
                  style={{
                    backgroundColor: inspectingTier.color || "#0C83B3",
                  }}
                >
                  <Badge className="bg-white/20 text-white border-none text-xs font-medium px-3 h-6 rounded-full mb-3">
                    Membership Tier
                  </Badge>
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {inspectingTier.name}
                  </h3>
                </div>
                <ScrollArea className="flex-1 p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <p className="text-xs font-medium text-slate-500">
                        Rewards
                      </p>
                      <p className="text-lg font-bold text-primary font-mono tabular-nums mt-0.5">
                        {inspectingTier.pointsMultiplier}x Points
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center">
                      <p className="text-xs font-medium text-emerald-700">
                        Cashback
                      </p>
                      <p className="text-lg font-bold text-emerald-800 font-mono tabular-nums mt-0.5">
                        {inspectingTier.cashbackPercent}% Back
                      </p>
                    </div>
                  </div>
                  <Separator className="mb-6 bg-slate-200" />
                  <div className="space-y-4 text-left">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" /> Included
                      Privileges
                    </h4>
                    <div className="space-y-3 text-left">
                      {(inspectingTier.benefits || []).map(
                        (benefit: string, i: number) => (
                          <div key={i} className="flex gap-3 items-start">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-700">{benefit}</p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl font-semibold text-xs flex-1"
                    onClick={() => setInspectingTier(null)}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const id = inspectingTier.id;
                      setInspectingTier(null);
                      handleSelectTier(id);
                    }}
                    className="h-11 bg-primary font-semibold text-xs rounded-xl text-white flex-1"
                  >
                    Join This Membership
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Inspect Coupon Dialog */}
        <Dialog
          open={!!inspectingCoupon}
          onOpenChange={(open) => !open && setInspectingCoupon(null)}
        >
          <DialogContent className="sm:max-w-[460px] h-[88vh] rounded-2xl border border-slate-200 p-0 overflow-hidden w-[95vw] flex flex-col text-left">
            <DialogHeader className="sr-only">
              <DialogTitle>Offer Details</DialogTitle>
              <DialogDescription>Coupon rules and inquiry</DialogDescription>
            </DialogHeader>
            {inspectingCoupon && (
              <>
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-center shrink-0">
                  <div className="w-full max-w-[340px]">
                    <CouponPublicCard
                      data={inspectingCoupon}
                      business={business}
                      currencySymbol={currencySymbol}
                      hideInspectButton
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-4 text-left">
                    <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                      <ListTodo className="h-4 w-4" />{" "}
                      {inspectingCoupon.descriptionHeading || "Offer Rules"}
                    </h4>
                    <div className="space-y-3">
                      {(
                        inspectingCoupon.rules ||
                        "Standard coupon terms apply."
                      )
                        .split("\n")
                        .filter((l: string) => l.trim() !== "")
                        .map((rule: string, i: number) => (
                          <div key={i} className="flex gap-3 items-start">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                            <p className="text-sm text-slate-700 leading-relaxed flex-1">
                              {rule}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200 flex flex-row gap-3 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-11 rounded-xl font-semibold text-xs"
                    onClick={() => setInspectingCoupon(null)}
                  >
                    Close
                  </Button>
                  <Button
                    asChild
                    className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold text-xs gap-2 text-white"
                  >
                    <a
                      href={inquireWhatsAppHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <SmartphoneNfc className="h-4 w-4" /> Inquire on WhatsApp
                    </a>
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

function CouponPublicCard({
  data,
  business,
  currencySymbol,
  hideInspectButton = false,
  onInspect,
}: any) {
  const themeClass = THEME_STYLES[data.theme || "blue"] || THEME_STYLES.blue;
  const usageLabel = `${data.usageCount || 0} / ${data.usageLimit || "∞"}`;
  const groupName =
    business?.offerGroups?.find((g: any) => g.id === data.groupId)?.name ||
    "Promo Code";

  return (
    <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden flex flex-col h-full text-left shadow-none hover:border-slate-300 transition-colors">
      <div
        className={cn(
          "p-6 relative text-white min-h-[144px] flex justify-between items-stretch gap-3",
          themeClass
        )}
      >
        <div className="flex-1 min-w-0 pr-3 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-white/75 mb-2">
            <Tag className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-medium truncate">{groupName}</span>
          </div>
          <h3 className="text-xl font-bold tracking-wider leading-none truncate font-mono">
            {data.code || "CODE"}
          </h3>
          <p className="text-sm font-semibold text-white/90 mt-2.5">
            {data.type === "percentage"
              ? `${data.value}% Off`
              : data.type === "bogo"
                ? data.value
                : `${currencySymbol}${data.value} Flat Off`}
          </p>
        </div>
        <div className="w-[32%] flex flex-col items-center justify-between py-1 pl-3 border-l border-dashed border-white/30 shrink-0 text-center">
          <div>
            <p className="text-[11px] font-medium text-white/70">Claims</p>
            <p className="text-xs font-semibold text-white font-mono tabular-nums mt-0.5">
              {usageLabel}
            </p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-black/20 border border-white/15 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {business?.name?.charAt(0) || "B"}
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-4 bg-white text-left flex-1 flex flex-col justify-between">
        <div className="flex justify-between items-center gap-4">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-slate-500">Min Spend</p>
            <p className="text-lg font-bold text-slate-900 font-mono tabular-nums">
              {currencySymbol}
              {data.minOrder || 0}
            </p>
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-xs font-medium text-slate-500">Usage Limit</p>
            <p className="text-sm font-bold text-primary font-mono tabular-nums">
              0 / {data.perUserLimit || 1}
            </p>
          </div>
        </div>

        {!hideInspectButton && (
          <Button
            type="button"
            variant="outline"
            className="w-full h-10 rounded-xl font-semibold text-xs border-slate-200 text-primary hover:bg-primary/5"
            onClick={() => onInspect?.(data)}
          >
            <Info className="h-4 w-4 mr-2" /> Inspect Reward
          </Button>
        )}

        <div className="space-y-3">
          <Separator className="bg-slate-100" />
          <div className="flex justify-between items-center text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-medium text-slate-700">Active Offer</span>
            </div>
            <Badge
              variant="outline"
              className="text-xs h-5 border-slate-200 text-primary font-medium"
            >
              Eligible
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoyaltyJoinPage(props: {
  params: { businessId: string };
}) {
  const { businessId } = props.params;
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <JoinContent businessId={businessId} />
    </Suspense>
  );
}
