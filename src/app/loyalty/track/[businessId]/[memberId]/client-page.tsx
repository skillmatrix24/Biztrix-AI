"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Loader2,
  SmartphoneNfc,
  Sparkles,
  Trophy,
  Wallet,
  Ticket,
  FileText,
  Instagram,
  Facebook,
  Youtube,
  Heart,
  ListTodo,
  Handshake,
  History,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { KpiStatCard } from "@/components/ui/editorial";
import { cn, getCurrencySymbol } from "@/lib/utils";
import {
  useFirestore,
  useDoc,
  useMemoFirebase,
  useCollection,
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  useUser,
} from "@/firebase";
import {
  collection,
  doc,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  increment,
} from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getPublicBusinessNode } from "@/app/actions/p0-migration";

import { ProfileCard } from "../../components/ProfileCard";
import { RewardsTab } from "../../components/RewardsTab";
import { OccasionsTab } from "../../components/OccasionsTab";
import { ReferralTab } from "../../components/ReferralTab";
import { HistoryTab } from "../../components/HistoryTab";
import { GuidelinesTab } from "../../components/GuidelinesTab";
import { CouponPublicCard } from "../../components/CouponPublicCard";

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

export default function MemberPublicPortal(props: {
  params: { businessId: string; memberId: string };
}) {
  const { businessId: paramId, memberId } = props.params;
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const [accessVerified, setAccessVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReferralCopied, setIsReferralCopied] = useState(false);
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
      } finally {
        setIsBizLoading(false);
      }
    }
    resolveId();
  }, [paramId, firestore]);

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile } = useDoc<any>(userProfileRef);

  const isAdminOrStaff = useMemo(() => {
    const role = (userProfile?.role || "").toLowerCase();
    return (
      userProfile?.businessId === businessId &&
      (["admin", "manager", "staff", "agent", "accountant"].includes(role) ||
        user?.email?.toLowerCase() === "skillmatrix24@gmail.com")
    );
  }, [userProfile, user, businessId]);

  useEffect(() => {
    if (typeof window !== "undefined" && businessId) {
      const sessionToken = localStorage.getItem(
        `verified_session_${memberId}`
      );
      if (isAdminOrStaff || sessionToken) setAccessVerified(true);
      else router.push(`/loyalty/track-member/${businessId}?mId=${memberId}`);
    }
  }, [isAdminOrStaff, memberId, businessId, router]);

  const memberRef = useMemoFirebase(
    () =>
      businessId && memberId
        ? doc(firestore, "businesses", businessId, "memberships", memberId)
        : null,
    [firestore, businessId, memberId]
  );
  const { data: member, isLoading: isMemberLoading } = useDoc<any>(memberRef);

  const customerRef = useMemoFirebase(
    () =>
      businessId && member?.customerId
        ? doc(
            firestore,
            "businesses",
            businessId,
            "customers",
            member.customerId
          )
        : null,
    [firestore, businessId, member?.customerId]
  );
  const { data: customer } = useDoc<any>(customerRef);

  const configRef = useMemoFirebase(
    () =>
      businessId
        ? doc(firestore, "businesses", businessId, "loyaltyConfig", "main")
        : null,
    [firestore, businessId]
  );
  const { data: portalConfig } = useDoc<any>(configRef);

  const offerGroups = useMemo(() => business?.offerGroups || [], [business]);

  const activityQuery = useMemoFirebase(
    () =>
      businessId && member?.customerId
        ? query(
            collection(
              firestore,
              "businesses",
              businessId,
              "loyaltyActivity"
            ),
            where("customerId", "==", member.customerId),
            orderBy("timestamp", "desc")
          )
        : null,
    [firestore, businessId, member?.customerId]
  );
  const { data: activitiesRaw } = useCollection<any>(activityQuery);
  const activities = activitiesRaw || [];

  const allActiveCouponsQuery = useMemoFirebase(() => {
    if (!businessId) return null;
    return query(
      collection(firestore, "businesses", businessId, "coupons"),
      where("status", "==", "active")
    );
  }, [firestore, businessId]);
  const { data: allActiveCoupons } = useCollection<any>(allActiveCouponsQuery);

  const tierId = member?.tier?.toLowerCase();
  const tierDocRef = useMemoFirebase(
    () =>
      businessId && tierId
        ? doc(firestore, "businesses", businessId, "loyaltyTiers", tierId)
        : null,
    [firestore, businessId, tierId]
  );
  const { data: tierData } = useDoc<any>(tierDocRef);

  const bundledCoupons = useMemo(() => {
    if (!allActiveCoupons || !tierData?.linkedCouponIds) return [];
    return allActiveCoupons.filter((c) =>
      tierData.linkedCouponIds.includes(c.id)
    );
  }, [allActiveCoupons, tierData?.linkedCouponIds]);

  const groupedCoupons = useMemo(() => {
    const groups: Record<string, any[]> = {};
    bundledCoupons.forEach((c) => {
      const gId = c.groupId || "none";
      if (!groups[gId]) groups[gId] = [];
      groups[gId].push(c);
    });
    return groups;
  }, [bundledCoupons]);

  const leaderboardQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "memberships"),
            orderBy("referralCount", "desc"),
            limit(10)
          )
        : null,
    [firestore, businessId]
  );
  const { data: topReferrersRaw } = useCollection<any>(leaderboardQuery);
  const topReferrers = topReferrersRaw || [];

  const totalCouponSavings = useMemo(() => {
    return activities
      .filter((a) => a.type === "coupon_redeem")
      .reduce((sum, a) => sum + (parseFloat(a.cashback) || 0), 0);
  }, [activities]);

  const [inspectingCoupon, setInspectingCoupon] = useState<any>(null);
  const [isAddEventOpen, setIsAddOpen] = useState(false);
  const [eventData, setEventData] = useState({
    label: "",
    type: "birthday",
    date: "",
    phone: "",
  });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [isProfileCompletionOpen, setIsProfileCompletionOpen] = useState(false);
  const [profileCompletionData, setProfileCompletionData] = useState({
    dob: "",
    anniversaryDate: "",
    email: "",
    city: "",
  });

  const isProfileIncomplete = useMemo(() => {
    if (!customer) return false;
    return !customer.dob || !customer.anniversaryDate;
  }, [customer]);

  const cardThemeColor = useMemo(() => {
    if (!member) return "#0C83B3";
    const tier = (member.tier || "").toLowerCase();
    if (tier === "gold") return "#d97706";
    if (tier === "platinum" || tier === "elite") return "#1e293b";
    if (tier === "vip" || tier === "legend") return "#6d28d9";
    return "#0C83B3";
  }, [member]);

  const currencySymbol = getCurrencySymbol(business?.currency || "INR");

  const referralLink = useMemo(() => {
    if (typeof window === "undefined" || !member?.cardNumber) return "";
    return `${window.location.origin}/loyalty/join/${business?.slug || businessId}?ref=${member.cardNumber}`;
  }, [member?.cardNumber, businessId, business?.slug]);

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setIsReferralCopied(true);
    setTimeout(() => setIsReferralCopied(false), 2000);
    toast({ title: "Referral Link Copied" });
  };

  const handleCompleteProfile = async () => {
    if (!customerRef || !memberRef || !businessId) return;
    setIsSubmitting(true);
    try {
      const bonusPoints = portalConfig?.profileBonusPoints || 0;
      updateDocumentNonBlocking(customerRef, {
        ...profileCompletionData,
        profileBonusClaimed: true,
        updatedAt: serverTimestamp(),
      });
      if (!customer?.profileBonusClaimed && bonusPoints > 0) {
        updateDocumentNonBlocking(memberRef, {
          rewardPoints: increment(bonusPoints),
        });
        addDocumentNonBlocking(
          collection(firestore, "businesses", businessId, "loyaltyActivity"),
          {
            customerId: member.customerId,
            customerName: member.customerName,
            type: "profile_bonus",
            points: bonusPoints,
            timestamp: new Date().toISOString(),
            description: "Bonus for profile completion",
          }
        );
      }
      setIsProfileCompletionOpen(false);
      toast({
        title: "Profile Completed",
        description: `You earned ${bonusPoints} points!`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditEvent = (ev: any) => {
    setEventData({
      label: ev.label,
      type: ev.type,
      date: ev.date,
      phone: ev.phone || "",
    });
    setEditingEventId(ev.id);
    setIsAddOpen(true);
  };

  const handleDeleteEvent = (id: string) => {
    if (!customerRef || !customer) return;
    const updatedEvents = (customer.events || []).filter(
      (e: any) => e.id !== id
    );
    updateDocumentNonBlocking(customerRef, {
      events: updatedEvents,
      updatedAt: serverTimestamp(),
    });
    toast({ title: "Occasion Removed", variant: "destructive" });
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

  const inspectingUsed = useMemo(() => {
    if (!inspectingCoupon) return false;
    const count = (activities || []).filter(
      (a: any) =>
        a.type === "coupon_redeem" && a.couponId === inspectingCoupon.id
    ).length;
    return count >= (inspectingCoupon.perUserLimit || 1);
  }, [activities, inspectingCoupon]);

  const redeemWhatsAppHref = useMemo(() => {
    if (!inspectingCoupon) return "#";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const msg = `Namaste! I want to redeem offer *${inspectingCoupon.code}* associated with my Member ID *${member?.cardNumber || member?.id?.slice(-6).toUpperCase()}*. Here is my portal: ${origin}/loyalty/track/${business?.slug || businessId}/${memberId}`;
    return `https://wa.me/${business?.phone?.replace(/\D/g, "") || ""}?text=${encodeURIComponent(msg)}`;
  }, [inspectingCoupon, member, business, businessId, memberId]);

  if (isMemberLoading || isBizLoading || !accessVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const portalLogo = portalConfig?.logoUrl || business?.logoUrl;

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-16 overflow-x-hidden text-left">
      <link rel="stylesheet" href={fontUrl} />

      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 h-16 sm:h-20 flex items-center">
        <div className="max-w-6xl mx-auto px-4 w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 text-left">
            <div className="h-10 w-10 sm:h-11 sm:w-11 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
              {portalLogo ? (
                <img
                  src={portalLogo}
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
            <span className="text-sm sm:text-base font-bold text-slate-900 truncate max-w-[200px]">
              {portalConfig?.storeName || business?.name}
            </span>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-9 rounded-xl text-xs font-semibold text-primary px-3"
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-8 space-y-10">
        <div className="text-center space-y-6 py-4 sm:py-8">
          <div className="flex flex-col items-center gap-5">
            <div className="h-20 w-20 sm:h-24 sm:w-24 bg-white rounded-2xl flex items-center justify-center border border-slate-200 overflow-hidden">
              {portalLogo ? (
                <img
                  src={portalLogo}
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
              className="h-7 px-3.5 border-slate-200 bg-white text-primary text-xs font-semibold rounded-full"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Exclusive Member Portal
            </Badge>
          </div>
          <div className="space-y-3 px-2 max-w-3xl mx-auto">
            <h1
              className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight"
              style={{ fontFamily: titleFont, fontSize: titleSize }}
            >
              <HighlightedText
                text={portalConfig?.title || "My Membership"}
                highlight={portalConfig?.titleHighlightWord}
                color={portalConfig?.titleHighlightColor}
                isGradient={portalConfig?.titleHighlightGradient}
                gradientEnd={portalConfig?.titleGradientEnd}
              />
            </h1>
            <p
              className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed"
              style={{ fontFamily: descFont, fontSize: descSize }}
            >
              <HighlightedText
                text={
                  portalConfig?.description ||
                  "Track rewards, cashback credits, and exclusive member offers in real time."
                }
                highlight={portalConfig?.descriptionHighlightWord}
                color={portalConfig?.descriptionHighlightColor}
                isGradient={portalConfig?.descriptionHighlightGradient}
                gradientEnd={portalConfig?.descriptionGradientEnd}
              />
            </p>
          </div>
        </div>

        {isProfileIncomplete && (
          <div className="border border-orange-200 bg-orange-50 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-left">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="h-12 w-12 rounded-xl bg-white border border-orange-200 flex items-center justify-center text-orange-600 shrink-0">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Complete Your Profile for Bonus Points
                </h3>
                <p className="text-sm text-slate-600 mt-0.5">
                  Add your birthday and anniversary to unlock{" "}
                  <span className="font-semibold font-mono tabular-nums">
                    {portalConfig?.profileBonusPoints || 50} points
                  </span>
                  .
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => setIsProfileCompletionOpen(true)}
              className="h-11 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs w-full md:w-auto"
            >
              Complete Profile
            </Button>
          </div>
        )}

        <ProfileCard
          member={member}
          cardThemeColor={cardThemeColor}
          currencySymbol={currencySymbol}
        />

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-left">
          <KpiStatCard
            label="Reward Points"
            value={`${member?.rewardPoints?.toLocaleString() || 0} pts`}
            icon={Trophy}
            subtext="Redeemable on your next billing visit"
          />
          <KpiStatCard
            label="Cashback Balance"
            value={`${currencySymbol}${member?.walletBalance?.toLocaleString() || 0}`}
            icon={Wallet}
            tone="positive"
            subtext="Direct cashback earned from transactions"
          />
          <KpiStatCard
            label="Total Savings"
            value={`${currencySymbol}${totalCouponSavings.toLocaleString()}`}
            icon={Ticket}
            tone="warning"
            subtext="Cumulative savings unlocked via offers"
          />
        </section>

        <Tabs defaultValue="rewards" className="w-full">
          <TabsList className="bg-white border border-slate-200 h-auto p-1.5 rounded-2xl mb-8 grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            <TabsTrigger
              value="rewards"
              className="text-xs font-semibold px-2 py-2.5 rounded-xl gap-1.5"
            >
              <Ticket className="h-4 w-4" /> Offers
            </TabsTrigger>
            <TabsTrigger
              value="occasions"
              className="text-xs font-semibold px-2 py-2.5 rounded-xl gap-1.5"
            >
              <Heart className="h-4 w-4" /> Occasions
            </TabsTrigger>
            <TabsTrigger
              value="referral"
              className="text-xs font-semibold px-2 py-2.5 rounded-xl gap-1.5"
            >
              <Handshake className="h-4 w-4" /> Refer
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="text-xs font-semibold px-2 py-2.5 rounded-xl gap-1.5"
            >
              <History className="h-4 w-4" /> History
            </TabsTrigger>
            <TabsTrigger
              value="guidelines"
              className="text-xs font-semibold px-2 py-2.5 rounded-xl gap-1.5"
            >
              <FileText className="h-4 w-4" /> Rules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rewards" className="m-0">
            <RewardsTab
              bundledCoupons={bundledCoupons}
              groupedCoupons={groupedCoupons}
              offerGroups={offerGroups}
              business={business}
              currencySymbol={currencySymbol}
              member={member}
              activities={activities}
              onInspect={setInspectingCoupon}
            />
          </TabsContent>
          <TabsContent value="occasions" className="m-0">
            <OccasionsTab
              events={customer?.events || []}
              onAdd={() => {
                setEditingEventId(null);
                setEventData({ label: "", type: "birthday", date: "", phone: "" });
                setIsAddOpen(true);
              }}
              onEdit={handleOpenEditEvent}
              onDelete={handleDeleteEvent}
            />
          </TabsContent>
          <TabsContent value="referral" className="m-0">
            <ReferralTab
              member={member}
              business={business}
              currencySymbol={currencySymbol}
              referralLink={referralLink}
              isReferralCopied={isReferralCopied}
              topReferrers={topReferrers}
              onCopy={handleCopyReferral}
            />
          </TabsContent>
          <TabsContent value="history" className="m-0">
            <HistoryTab
              activities={activities}
              currencySymbol={currencySymbol}
            />
          </TabsContent>
          <TabsContent value="guidelines" className="m-0">
            <GuidelinesTab
              rules={portalConfig?.rules || business?.loyaltyRules}
            />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mt-20 py-14 bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 flex flex-col gap-10 text-left">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                  B
                </div>
                <span className="text-sm font-bold text-slate-900">
                  Secure Member Portal
                </span>
              </div>
              <p className="text-sm text-slate-600 max-w-md">
                Official membership portal for{" "}
                <strong>{portalConfig?.storeName || business?.name || "your store"}</strong>.
                Powered by Biztrix AI.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {portalConfig?.customButtons?.map((btn: any, i: number) => (
                <Button
                  key={i}
                  asChild
                  variant="outline"
                  className="h-10 rounded-xl px-5 text-xs font-semibold border-slate-200 text-primary hover:bg-slate-50"
                >
                  <a href={btn.url} target="_blank" rel="noopener noreferrer">
                    {btn.label}
                  </a>
                </Button>
              ))}
            </div>

            <div className="flex gap-3">
              {portalConfig?.instagramUrl && (
                <a
                  href={portalConfig.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {portalConfig?.facebookUrl && (
                <a
                  href={portalConfig.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary transition-colors"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {portalConfig?.youtubeUrl && (
                <a
                  href={portalConfig.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary transition-colors"
                >
                  <Youtube className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-3 items-start">
              <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-slate-600">
                {portalConfig?.storeAddress ||
                  business?.address ||
                  "Location pending"}
              </p>
            </div>
            <div className="flex gap-3 items-center">
              <Phone className="h-5 w-5 text-primary shrink-0" />
              <p className="text-xs font-medium text-slate-600 font-mono tabular-nums">
                {portalConfig?.storePhone || business?.phone || "N/A"}
              </p>
            </div>
            <div className="flex gap-3 items-center">
              <Mail className="h-5 w-5 text-primary shrink-0" />
              <p className="text-xs font-medium text-slate-600">
                {portalConfig?.storeEmail || business?.email || "N/A"}
              </p>
            </div>
          </div>

          <Separator className="bg-slate-200" />
          <p className="text-xs font-medium text-slate-500 text-center">
            © 2026 Biztrix AI • Verified Member Experience
          </p>
        </div>
      </footer>

      {/* Inspect Coupon Dialog */}
      <Dialog
        open={!!inspectingCoupon}
        onOpenChange={(open) => !open && setInspectingCoupon(null)}
      >
        <DialogContent className="sm:max-w-[460px] h-[88vh] rounded-2xl border border-slate-200 p-0 overflow-hidden w-[95vw] flex flex-col text-left">
          <DialogHeader className="sr-only">
            <DialogTitle>Offer Details</DialogTitle>
            <DialogDescription>Coupon rules and redemption</DialogDescription>
          </DialogHeader>
          {inspectingCoupon && (
            <>
              <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-center shrink-0">
                <div className="w-full max-w-[360px]">
                  <CouponPublicCard
                    data={inspectingCoupon}
                    business={business}
                    currencySymbol={currencySymbol}
                    member={member}
                    activities={activities}
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
                    {(inspectingCoupon.rules || "Standard coupon terms apply.")
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
                {inspectingUsed ? (
                  <Button
                    type="button"
                    disabled
                    className="flex-1 h-11 rounded-xl font-semibold text-xs bg-slate-300 text-slate-600 cursor-not-allowed gap-2"
                  >
                    <SmartphoneNfc className="h-4 w-4" /> Already Used
                  </Button>
                ) : (
                  <Button
                    asChild
                    className="flex-1 h-11 rounded-xl font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    <a
                      href={redeemWhatsAppHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <SmartphoneNfc className="h-4 w-4" /> Redeem via WhatsApp
                    </a>
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Occasion Dialog */}
      <Dialog open={isAddEventOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl border border-slate-200 p-0 overflow-hidden text-left w-[95vw]">
          <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  {editingEventId ? "Edit Occasion" : "Record Occasion"}
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  Save special dates for automated reward reminders.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-5">
            <div className="space-y-1.5 text-left">
              <Label className="text-xs font-semibold text-slate-700">
                Event Label
              </Label>
              <Input
                value={eventData.label}
                onChange={(e) =>
                  setEventData({ ...eventData, label: e.target.value })
                }
                placeholder="e.g. Wedding Anniversary"
                className="h-11 rounded-xl bg-slate-50 border-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <Label className="text-xs font-semibold text-slate-700">
                  Event Type
                </Label>
                <Select
                  value={eventData.type}
                  onValueChange={(v) =>
                    setEventData({ ...eventData, type: v })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="anniversary">Anniversary</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-xs font-semibold text-slate-700">
                  Date
                </Label>
                <Input
                  type="date"
                  value={eventData.date}
                  onChange={(e) =>
                    setEventData({ ...eventData, date: e.target.value })
                  }
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-mono tabular-nums"
                />
              </div>
            </div>
            <div className="space-y-1.5 text-left">
              <Label className="text-xs font-semibold text-slate-700">
                WhatsApp Number (Optional)
              </Label>
              <Input
                value={eventData.phone}
                onChange={(e) =>
                  setEventData({
                    ...eventData,
                    phone: e.target.value.replace(/\D/g, ""),
                  })
                }
                placeholder="91XXXXXXXXXX"
                className="h-11 rounded-xl bg-slate-50 border-slate-200 font-mono tabular-nums"
              />
            </div>
          </div>
          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200">
            <Button
              type="button"
              onClick={() => {
                if (!customerRef || !customer) return;
                const newEv = {
                  ...eventData,
                  id: editingEventId || `ev_${Date.now()}`,
                };
                const currentEvents = customer.events || [];
                const updatedEvents = editingEventId
                  ? currentEvents.map((e: any) =>
                      e.id === editingEventId ? newEv : e
                    )
                  : [...currentEvents, newEv];
                updateDocumentNonBlocking(customerRef, {
                  events: updatedEvents,
                  updatedAt: serverTimestamp(),
                });
                setIsAddOpen(false);
                setEditingEventId(null);
                setEventData({
                  label: "",
                  type: "birthday",
                  date: "",
                  phone: "",
                });
                toast({ title: "Occasion Saved" });
              }}
              disabled={!eventData.label || !eventData.date}
              className="w-full h-11 bg-primary font-semibold text-xs rounded-xl text-white"
            >
              Save Occasion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Profile Dialog */}
      <Dialog
        open={isProfileCompletionOpen}
        onOpenChange={setIsProfileCompletionOpen}
      >
        <DialogContent className="sm:max-w-[460px] rounded-2xl border border-slate-200 p-0 overflow-hidden text-left w-[95vw]">
          <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Complete Your Profile
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  Earn {portalConfig?.profileBonusPoints || 50} bonus loyalty
                  points.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Birth Date
                </Label>
                <Input
                  type="date"
                  value={profileCompletionData.dob}
                  onChange={(e) =>
                    setProfileCompletionData({
                      ...profileCompletionData,
                      dob: e.target.value,
                    })
                  }
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-mono tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Anniversary
                </Label>
                <Input
                  type="date"
                  value={profileCompletionData.anniversaryDate}
                  onChange={(e) =>
                    setProfileCompletionData({
                      ...profileCompletionData,
                      anniversaryDate: e.target.value,
                    })
                  }
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-mono tabular-nums"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Email Address
              </Label>
              <Input
                type="email"
                value={profileCompletionData.email}
                onChange={(e) =>
                  setProfileCompletionData({
                    ...profileCompletionData,
                    email: e.target.value,
                  })
                }
                placeholder="you@example.com"
                className="h-11 rounded-xl bg-slate-50 border-slate-200"
              />
            </div>
          </div>
          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200">
            <Button
              type="button"
              onClick={handleCompleteProfile}
              disabled={isSubmitting || !profileCompletionData.dob}
              className="w-full h-11 bg-primary font-semibold text-xs rounded-xl text-white"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Claim Bonus Points
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
