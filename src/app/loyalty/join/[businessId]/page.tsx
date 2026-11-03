
"use client";

import React, { use, useState, useMemo, useEffect, Suspense } from "react";
import { 
  Gem, 
  UserPlus, 
  ArrowRight, 
  CheckCircle2, 
  SmartphoneNfc, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  Loader2, 
  Gift,
  Star,
  Info,
  ChevronRight,
  Smartphone,
  Heart,
  CreditCard,
  Wallet,
  Globe,
  ListTodo,
  TrendingUp,
  Percent,
  MapPin,
  Mail,
  Phone,
  BadgeCheck,
  Ticket,
  Clock,
  Layout,
  Check,
  ArrowLeft,
  Flame,
  Crown,
  Lock,
  Layers,
  Calculator,
  QrCode,
  ShieldAlert,
  Tag,
  Circle,
  X,
  FileText,
  AlertCircle,
  Grid,
  SearchCode,
  CreditCard as CardIcon,
  Banknote,
  Smartphone as PhoneIcon,
  Verified,
  Upload,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFirestore, useDoc, useMemoFirebase, useCollection, useAuth, setupRecaptcha, initiatePhoneSignIn } from "@/firebase";
import { collection, doc, query, where, onSnapshot, getDocs, limit, getDoc, serverTimestamp } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { calculateGST } from "@/lib/mock-db";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { ConfirmationResult } from "firebase/auth";
import { useSearchParams, useRouter } from "next/navigation";
import Script from "next/script";
import { getPublicBusinessNode } from "@/app/actions/p0-migration";

const THEME_STYLES: Record<string, string> = {
  blue: 'bg-gradient-to-br from-blue-600 to-indigo-800',
  purple: 'bg-gradient-to-br from-purple-600 to-pink-700',
  orange: 'bg-gradient-to-br from-orange-500 to-red-600',
  green: 'bg-gradient-to-br from-emerald-500 to-teal-700',
  black: 'bg-gradient-to-br from-slate-800 to-black',
  red: 'bg-gradient-to-br from-red-600 to-rose-900',
  gold: 'bg-gradient-to-br from-amber-400 via-amber-600 to-yellow-800',
  cyan: 'bg-gradient-to-br from-cyan-500 to-blue-700',
  rose: 'bg-gradient-to-br from-rose-400 to-pink-600',
  indigo: 'bg-gradient-to-br from-indigo-900 to-slate-900',
};

const GROUP_ICONS: Record<string, any> = {
  Star, Zap, Gift, Flame, Ticket, Tag, Gem, Grid
};

const HighlightedText = ({ 
  text, 
  highlight, 
  color,
  isGradient,
  gradientEnd
}: { 
  text: string, 
  highlight?: string, 
  color?: string,
  isGradient?: boolean,
  gradientEnd?: string
}) => {
  if (!highlight || !text || !highlight.trim()) return <>{text}</>;
  const parts = text.split(new RegExp( `(${highlight})`, 'gi'));
  const highlightStyle: React.CSSProperties = isGradient ? {
    backgroundImage: `linear-gradient(to right, ${color || '#0C83B3'}, ${gradientEnd || '#2DD4BF'})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'inline-block'
  } : {
    color: color || 'inherit'
  };
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} style={highlightStyle} className="font-black">
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
  const referralIdFromUrl = searchParams.get('ref');

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [business, setBusiness] = useState<any>(null);
  const [isBizLoading, setIsBizLoading] = useState(true);

  // HARDENED: Business resolution via privileged server action
  useEffect(() => {
    async function resolveId() {
      if (!paramId) return;
      setIsBizLoading(true);
      try {
        let actualId = paramId;
        if (!paramId.startsWith('biz_')) {
          const q = query(collection(firestore, 'businesses'), where('slug', '==', paramId.toLowerCase()), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) actualId = snap.docs[0].id;
        }
        
        setBusinessId(actualId);
        const node = await getPublicBusinessNode(actualId);
        setBusiness(node);
      } catch (e) {
    console.error(e);
        console.warn("Public identity sync failed.");
      } finally {
        setIsBizLoading(false);
      }
    }
    resolveId();
  }, [paramId, firestore]);

  const configRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId, 'loyaltyJoinConfig', 'main') : null, [firestore, businessId]);
  const { data: portalConfig, isLoading: isConfigLoading } = useDoc<any>(configRef);

  const tiersQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'loyaltyTiers') : null, [firestore, businessId]);
  const { data: tiersRaw } = useCollection<any>(tiersQuery);
  
  const tiers = useMemo(() => {
    if (!tiersRaw) return [];
    return tiersRaw
      .filter((t: any) => (t.status || '').toLowerCase() === 'active')
      .sort((a: any, b: any) => (a.minSpend || 0) - (b.minSpend || 0));
  }, [tiersRaw]);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    referralId: referralIdFromUrl || "",
    selectedTierId: "",
  });
  
  const [step, setStep] = useState<'browse' | 'details' | 'verify' | 'payment'>('browse');
  const [otp, setOtp] = useState("");
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
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
      setFormData(prev => ({ ...prev, selectedTierId: tiers[0].id }));
    }
  }, [tiers]);

  // REAL-TIME ACTIVATION LISTENER
  useEffect(() => {
    if (!businessId || !pendingOrderId) return;

    const orderRef = doc(firestore, 'businesses', businessId, 'orders', pendingOrderId);
    const unsubscribe = onSnapshot(orderRef, (snap) => {
      const data = snap.data();
      if (data?.status === 'paid') {
        const cleanPhone = formData.phone.replace(/\D/g, '').slice(-10);
        const membershipId = `mem_c_${cleanPhone}`;
        router.push(`/loyalty/success?id=${membershipId}&bId=${businessId}`);
      }
    });

    return () => unsubscribe();
  }, [businessId, pendingOrderId, firestore, router, formData.phone]);

  const selectedTierData = useMemo(() => {
    return (tiers || []).find((t: any) => t.id === formData.selectedTierId) || null;
  }, [formData.selectedTierId, tiers]);

  const allActiveCouponsQuery = useMemoFirebase(() => {
    if (!businessId) return null;
    return query(collection(firestore, 'businesses', businessId, 'coupons'), where('status', '==', 'active'));
  }, [firestore, businessId]);
  const { data: allActiveCoupons } = useCollection<any>(allActiveCouponsQuery);

  const bundledCoupons = useMemo(() => {
    if (!allActiveCoupons || !selectedTierData?.linkedCouponIds) return [];
    return allActiveCoupons.filter(c => selectedTierData.linkedCouponIds.includes(c.id));
  }, [allActiveCoupons, selectedTierData?.linkedCouponIds]);

  const groupedCoupons = useMemo(() => {
    const groups: Record<string, any[]> = {};
    bundledCoupons.forEach(c => {
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
    const rate = (selectedTierData.gstRate !== undefined && selectedTierData.gstRate !== null) 
      ? parseFloat(selectedTierData.gstRate) 
      : (parseFloat(business.defaultGstRate) || 18);
    
    const mode = business.gstMode || 'exclusive';
    return calculateGST(base, rate, false, mode);
  }, [selectedTierData, business, appliedDiscount]);

  const handleSelectTier = (tierId: string) => {
    setFormData(prev => ({ ...prev, selectedTierId: tierId }));
    setStep('details');
    setAppliedDiscount(0);
    setValidCouponCode("");
    setTimeout(() => {
      const element = document.getElementById("join-membership-section");
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleApplyPromo = async () => {
    if (!couponCode.trim() || !businessId || !selectedTierData) return;
    setIsVerifyingCoupon(true);
    try {
      const cRef = doc(firestore, 'businesses', businessId, 'coupons', couponCode.toUpperCase());
      const cSnap = await getDoc(cRef);
      if (cSnap.exists()) {
        const cData = cSnap.data();
        const tierBase = parseFloat(selectedTierData.minSpend) || 0;
        
        if (cData.status !== 'active') {
           toast({ variant: "destructive", title: "Coupon Expired" });
        } else if (tierBase < (cData.minOrder || 0)) {
           toast({ variant: "destructive", title: "Min Order Not Met", description: `Requires ₹${cData.minOrder} value.` });
        } else {
           let discount = 0;
           if (cData.type === 'percentage') {
              discount = (tierBase * (parseFloat(cData.value) / 100));
              if (cData.maxDiscount) discount = Math.min(discount, parseFloat(cData.maxDiscount));
           } else if (cData.type === 'fixed') {
              discount = parseFloat(cData.value);
           }
           setAppliedDiscount(discount);
           setValidCouponCode(cData.code);
           toast({ title: "Promo Applied", description: `You saved ₹${discount.toLocaleString()}!` });
        }
      } else {
        toast({ variant: "destructive", title: "Invalid Code" });
      }
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Validation Error" });
    } finally {
      setIsVerifyingCoupon(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || formData.phone.length < 10) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Name and a valid 10-digit number are required." });
      return;
    }
    
    setIsOtpSending(true);
    setExistingMember(null);

    try {
      const cleanPhone = formData.phone.replace(/\D/g, '').slice(-10);
      const custQuery = query(collection(firestore, 'businesses', businessId!, 'customers'), where('phone', '==', cleanPhone), limit(1));
      const custSnap = await getDocs(custQuery);
      
      if (!custSnap.empty) {
        const customerId = custSnap.docs[0].id;
        const memRef = doc(firestore, 'businesses', businessId!, 'memberships', `mem_${customerId}`);
        const memSnap = await getDoc(memRef);
        if (memSnap.exists() && memSnap.data().status === 'active') {
          setExistingMember(memSnap.data());
          setIsOtpSending(false);
          toast({ variant: "destructive", title: "Identity Collision", description: "Aap pehle se member hain!" });
          return;
        }
      }

      const verifier = setupRecaptcha(auth, 'recaptcha-container');
      if (!verifier) throw new Error("Verification system offline.");

      const formattedPhone = formData.phone.startsWith('+') ? formData.phone : `+91${formData.phone}`;
      const result = await initiatePhoneSignIn(auth, formattedPhone, verifier);
      setConfirmationResult(result);
      setStep('verify');
      toast({ title: "OTP Sent" });
    } catch (err: any) {
    console.error(err);
      toast({ variant: "destructive", title: "Gateway Busy", description: err.message || "Failed to send OTP." });
    } finally {
      setIsOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !confirmationResult) return;
    setIsSubmitting(true);
    try {
      await confirmationResult.confirm(otp);
      setStep('payment');
      toast({ title: "Identity Verified" });
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
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          tierId: formData.selectedTierId,
          name: formData.name,
          phone: formData.phone,
          couponCode: validCouponCode,
          referralCode: formData.referralId
        })
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
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...response,
              businessId
            })
          });
          const verifyResult = await verifyRes.json();
          if (verifyResult.success) {
            // SUCCESS REDIRECT (Secondary trigger if onSnapshot is slow)
            const cleanPhone = formData.phone.replace(/\D/g, '').slice(-10);
            const mId = `mem_c_${cleanPhone}`;
            router.push(`/loyalty/success?id=${mId}&bId=${businessId}`);
          } else {
            toast({ variant: "destructive", title: "Verification Failed", description: verifyResult.message });
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
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
    console.error(err);
      toast({ variant: "destructive", title: "Payment Error", description: err.message });
      setIsSubmitting(false);
    }
  };

  const titleFont = portalConfig?.titleFont || 'Mukta';
  const descFont = portalConfig?.descriptionFont || 'Mukta';
  const titleSize = portalConfig?.titleFontSize ? `${portalConfig.titleFontSize}px` : "32px";
  const descSize = portalConfig?.descriptionFontSize ? `${portalConfig.descriptionFontSize}px` : "16px";
  const fontUrl = `https://fonts.googleapis.com/css2?family=${titleFont.replace(' ', '+')}:wght@400;700;900&family=${descFont.replace(' ', '+')}:wght@400;500;700&display=swap`;

  const currencySymbol = getCurrencySymbol(business?.currency || "INR");

  if (isBizLoading || isConfigLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>;

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <div className="min-h-screen bg-slate-50 pb-20 font-body text-left">
        <link rel="stylesheet" href={fontUrl} />
        <div id="recaptcha-container"></div>
        <header className="sticky top-0 z-50 bg-white border-b h-16 sm:h-20 flex items-center shadow-sm">
          <div className="max-w-6xl mx-auto px-4 w-full flex items-center justify-between text-left">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 text-left">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-border/10 shrink-0 overflow-hidden text-left">
                {portalConfig?.logoUrl ? <img src={portalConfig.logoUrl} className="h-full w-full object-cover" alt="" /> : <div className="h-full w-full bg-primary flex items-center justify-center text-white font-black text-sm sm:text-base">{business?.name?.charAt(0) || "B"}</div>}
              </div>
              <span className="text-sm font-black text-slate-900 uppercase tracking-tighter truncate max-w-[150px]">
                {portalConfig?.storeName || business?.name}
              </span>
            </div>
            <Button asChild variant="ghost" className="h-9 rounded-xl text-[10px] font-black uppercase text-primary gap-2 px-3">
              <Link href={`/loyalty/track-member/${paramId}`}><SearchCode className="h-4 w-4" /> <span className="hidden sm:inline">Member Login</span></Link>
            </Button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 pt-8 space-y-12 sm:space-y-24">
          <div className="text-center space-y-10 py-6 sm:py-12 animate-in fade-in duration-1000 text-left sm:text-center">
            <div className="flex flex-col items-center gap-8 sm:gap-10">
              <div className="relative h-24 w-24 sm:h-32 sm:w-32 bg-white rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-border/10 overflow-hidden">
                {portalConfig?.logoUrl ? <img src={portalConfig.logoUrl} className="h-full w-full object-cover" alt="Logo" /> : <div className="h-full w-full bg-primary flex items-center justify-center text-white font-black text-2xl sm:text-4xl">{business?.name?.charAt(0) || "B"}</div>}
              </div>
              <Badge variant="outline" className="h-7 sm:h-8 px-5 border-slate-900 bg-slate-900 text-white text-[9px] sm:text-[11px] font-black uppercase tracking-[0.3em] rounded-full">Official Enrollment Portal</Badge>
            </div>
            <div className="space-y-6 sm:space-y-8 px-2 max-w-4xl mx-auto text-left sm:text-center">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]" style={{ fontFamily: titleFont, fontSize: titleSize }}>
                <HighlightedText text={portalConfig?.title || "Unlock Exclusive Privilege"} highlight={portalConfig?.titleHighlightWord} color={portalConfig?.titleHighlightColor} isGradient={portalConfig?.titleHighlightGradient} gradientEnd={portalConfig?.titleGradientEnd} />
              </h1>
              <p className="text-slate-500 font-medium leading-relaxed px-4 opacity-80 text-sm sm:text-lg" style={{ fontFamily: descFont, fontSize: descSize }}>
                <HighlightedText text={portalConfig?.description || "Join our community hub to earn reward points and track active cashback."} highlight={portalConfig?.descriptionHighlightWord} color={portalConfig?.descriptionHighlightColor} isGradient={portalConfig?.descriptionHighlightGradient} gradientEnd={portalConfig?.descriptionGradientEnd} />
              </p>
            </div>
          </div>

          <section className="space-y-10">
            <div className="flex flex-col items-center text-center space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-widest">Available Membership Cards</h2>
              <div className="h-1 w-20 bg-primary rounded-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
              {tiers.map((tier: any) => {
                const breakdown = calculateGST(tier.minSpend || 0, tier.gstRate || 0, false, business?.gstMode || 'exclusive');
                return (
                  <Card key={tier.id} className={cn("border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden border-4 transition-all flex flex-col h-full", formData.selectedTierId === tier.id ? "border-primary ring-8 ring-primary/5 scale-[1.02]" : "border-transparent")}>
                    <div className="p-8 text-white relative overflow-hidden shrink-0 aspect-[1.8/1] flex flex-col justify-between" style={{ backgroundColor: tier.color || '#0C83B3' }}>
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />
                        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-white/20 blur-[60px]" />
                      </div>
                      <div className="relative z-10 flex justify-between items-start">
                        <div className="space-y-1">
                          <Badge className="bg-white/20 text-white border-none text-[8px] font-black px-2 h-4 uppercase tracking-widest">MEMBERSHIP</Badge>
                          <h3 className="text-2xl font-black uppercase tracking-tight">{tier.name}</h3>
                        </div>
                        <Crown className={cn("h-10 w-10", formData.selectedTierId === tier.id ? "text-white" : "text-white/30")} />
                      </div>
                      <div className="relative z-10 flex justify-between items-end pt-4">
                         <div className="space-y-1">
                            <p className="text-[7px] font-black uppercase opacity-60">Membership Fee</p>
                            <p className="text-2xl font-black">{currencySymbol}{parseFloat(tier.minSpend || 0).toLocaleString()}</p>
                            <p className="text-[8px] font-black uppercase text-accent leading-none">+ GST EXTRA</p>
                         </div>
                         <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md">
                            <SmartphoneNfc className="h-5 w-5" />
                         </div>
                      </div>
                    </div>

                    <CardContent className="p-8 space-y-8 flex-1 flex flex-col text-left">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-center">
                          <p className="text-[7px] font-black uppercase text-primary/60 mb-1">Rewards</p>
                          <p className="text-sm font-black text-primary">{tier.pointsMultiplier}X Points</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-2xl border border-green-100 text-center">
                          <p className="text-[7px] font-black uppercase text-green-600/60 mb-1">Cashback</p>
                          <p className="text-sm font-black text-green-700">{tier.cashbackPercent}% Back</p>
                        </div>
                      </div>
                      <div className="space-y-6 flex-1 text-left">
                        <div className="space-y-4 text-left">
                          <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Included Privileges</h4>
                          {(tier.benefits || []).slice(0, 4).map((benefit: string, i: number) => (
                            <div key={i} className="flex gap-3 items-center"><BadgeCheck className="h-4 w-4 text-green-500 shrink-0" /><span className="text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-tight">{benefit}</span></div>
                          ))}
                        </div>

                        {tier.linkedCouponIds?.length > 0 && (
                          <div className="space-y-4 pt-2 border-t border-dashed text-left">
                             <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Included Offers</h4>
                             <div className="flex flex-wrap gap-2">
                                <Badge className="bg-slate-900 text-accent border-none text-[8px] font-black h-5 px-3 uppercase tracking-widest">
                                  <Ticket className="h-3 w-3 mr-1.5" /> {tier.linkedCouponIds.length} WELCOME CARDS
                                </Badge>
                             </div>
                          </div>
                        )}

                        <button onClick={() => setInspectingTier(tier)} className="h-8 px-0 text-[9px] font-black uppercase text-primary hover:bg-transparent hover:underline flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> View Full Details</button>
                      </div>
                      <Button onClick={() => handleSelectTier(tier.id)} className={cn("w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl mt-6 transition-all", formData.selectedTierId === tier.id ? "bg-primary text-white scale-105" : "bg-muted text-muted-foreground hover:bg-primary hover:text-white")}>Join Membership</Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {bundledCoupons && bundledCoupons.length > 0 && (
            <section className="space-y-16 animate-in fade-in duration-1000 px-2 text-left">
              <div className="flex flex-col items-center text-center space-y-4">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-widest">Included Welcome Rewards</h2>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-widest">Unlock these exclusive cards with your {selectedTierData?.name} membership</p>
                <div className="h-1 w-20 bg-primary rounded-full" />
              </div>

              <div className="space-y-20">
                {offerGroups.length > 0 ? (
                  offerGroups.map((group: any) => {
                    const groupCoupons = groupedCoupons[group.id];
                    if (!groupCoupons || groupCoupons.length === 0) return null;
                    const IconComp = GROUP_ICONS[group.icon] || Star;
                    return (
                      <div key={group.id} className="space-y-10 text-left">
                        <div className="flex items-center gap-4 text-left px-2">
                          <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shrink-0 border border-primary/10 shadow-inner">
                            <IconComp className="h-6 w-6" />
                          </div>
                          <div className="text-left">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">{group.name}</h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">{groupCoupons.length} Exclusive Reward Cards</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                          {groupCoupons.map((c: any) => (
                            <div key={c.id} onClick={() => setInspectingCoupon(c)} className="cursor-pointer">
                              <CouponPublicCard data={c} business={business} currencySymbol={currencySymbol} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {bundledCoupons.map((c: any) => (
                      <div key={c.id} onClick={() => setInspectingCoupon(c)} className="cursor-pointer h-full">
                        <CouponPublicCard data={c} business={business} currencySymbol={currencySymbol} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          <div id="join-membership-section" className="max-w-3xl mx-auto w-full scroll-mt-24">
            {existingMember && (
              <Card className="border-none shadow-2xl bg-white rounded-[2rem] p-8 mb-8 border-2 border-orange-500 animate-in zoom-in-95">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600"><AlertTriangle className="h-6 w-6" /></div>
                    <div className="text-left">
                       <h3 className="text-xl font-black text-slate-900 uppercase">Aap Pehle Se Member Hain!</h3>
                       <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Identity Collision Protected</p>
                    </div>
                 </div>
                 <p className="text-sm text-slate-600 leading-relaxed text-left mb-8 font-medium">
                   Namaste! Aapka mobile number <strong>{formData.phone}</strong> hamare database mein pehle se hi ek active membership se juda hua hai. Aap turant login karke apne rewards aur cashback check kar sakte hain.
                 </p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <Button asChild className="h-14 rounded-2xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl">
                       <Link href={`/loyalty/track-member/${paramId}`}>Enter Tracking Portal</Link>
                    </Button>
                    <Button variant="ghost" onClick={() => setExistingMember(null)} className="h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest opacity-60">Use Different Number</Button>
                 </div>
              </Card>
            )}

            {!existingMember && (step === 'details' || step === 'browse') && (
              <Card className="border-none shadow-xl bg-white rounded-[2rem] sm:rounded-[3rem] overflow-hidden border animate-in slide-in-from-bottom-10 duration-700 mx-2 text-left">
                <CardHeader className="p-8 sm:p-12 pb-0">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-inner">
                      <UserPlus className="h-6 w-6 sm:h-7 sm:w-7" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-base sm:text-xl font-black uppercase tracking-widest text-slate-900 leading-none">Join Now Section</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mt-2 tracking-widest opacity-60">Identity Establishment</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 sm:p-12 space-y-8">
                  <form onSubmit={handleSendOtp} className="space-y-6 text-left">
                    <div className="space-y-2 text-left"><Label className="text-[11px] font-black uppercase text-slate-500 ml-1">Legal Full Name *</Label><Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="h-14 sm:h-16 rounded-2xl font-black bg-muted/20 border-none shadow-inner text-lg sm:text-xl" /></div>
                    <div className="space-y-2 text-left"><Label className="text-[11px] font-black uppercase text-slate-500 ml-1">WhatsApp Identity *</Label><Input required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} placeholder="91XXXXXXXX" className="h-14 sm:h-16 rounded-2xl font-black bg-muted/20 border-none shadow-inner text-lg sm:text-xl tracking-[0.2em]" /></div>
                    <div className="space-y-2 text-left">
                       <Label className="text-[11px] font-black uppercase text-slate-500 ml-1">Referral Code (Optional)</Label>
                       <div className="relative">
                          <Gift className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary opacity-40" />
                          <Input value={formData.referralId} onChange={(e) => setFormData({...formData, referralId: e.target.value.toUpperCase()})} placeholder="BIZ-XXXX" className="h-14 sm:h-16 pl-12 rounded-2xl font-black bg-primary/5 border-none shadow-inner text-lg tracking-widest" />
                       </div>
                    </div>
                    <Button type="submit" disabled={isOtpSending} className="w-full h-16 sm:h-20 bg-primary font-black uppercase text-xs sm:text-sm tracking-[0.2em] rounded-2xl sm:rounded-[2rem] shadow-2xl active:scale-95 transition-all text-white">{isOtpSending ? <Loader2 className="h-8 w-8 animate-spin" /> : "Transmit Secure OTP"}</Button>
                  </form>
                </CardContent>
              </Card>
            )}
            {step === 'verify' && (
              <Card className="border-none shadow-xl bg-white rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden border animate-in slide-in-from-right-10 duration-500 mx-2 text-left">
                <CardHeader className="p-8 sm:p-12 pb-0"><div className="flex items-center gap-4 mb-8"><div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-inner"><ShieldCheck className="h-7 w-7" /></div><div className="text-left"><h3 className="text-base font-black uppercase tracking-widest text-slate-900 leading-none">Privacy Guard</h3></div></div></CardHeader>
                <CardContent className="p-8 sm:p-12 space-y-10 text-center">
                  <Label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.5em]">Enter 6-Digit Code</Label>
                  <Input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} maxLength={6} placeholder="000000" className="h-20 sm:h-28 text-center text-5xl sm:text-7xl font-black tracking-[0.5em] rounded-[2rem] bg-muted/20 border-none shadow-inner" />
                  <div className="flex justify-between px-2">
                    <button onClick={() => setStep('details')} className="text-[10px] font-bold text-muted-foreground uppercase hover:underline">Edit Details</button>
                    <button onClick={handleSendOtp} className="text-[10px] font-bold text-primary uppercase hover:underline">Resend OTP</button>
                  </div>
                  <Button onClick={handleVerifyOtp} disabled={isSubmitting || otp.length < 6} className="w-full h-16 sm:h-20 bg-green-600 font-black uppercase text-sm tracking-[0.2em] rounded-[2rem] shadow-2xl active:scale-95 transition-all text-white">{isSubmitting ? <Loader2 className="h-8 w-8 animate-spin mr-2" /> : "Verify Identity"}</Button>
                </CardContent>
              </Card>
            )}
            {step === 'payment' && (
              <Card className="border-none shadow-xl bg-white rounded-[3rem] overflow-hidden border animate-in slide-in-from-right-10 duration-500 mx-2 text-left">
                <CardHeader className="p-8 sm:p-12 pb-0">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-inner">
                      <CreditCard className="h-7 w-7" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-base sm:text-xl font-black uppercase tracking-[0.3em] text-slate-900 leading-none">Checkout Summary</h3>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase mt-2">Selected: {selectedTierData?.name} Node</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 sm:p-12 space-y-10">
                    <div className="space-y-6">
                       <div className="flex items-center justify-between px-1">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Apply Promo Code</Label>
                          {validCouponCode && <Badge className="bg-green-500 text-white text-[8px] font-black h-4 px-2 uppercase">Node Active</Badge>}
                       </div>
                       <div className="flex gap-3">
                          <Input 
                            value={couponCode} 
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            disabled={isVerifyingCoupon || !!validCouponCode}
                            placeholder="CODE" 
                            className="h-12 rounded-xl bg-muted/20 border-none shadow-inner font-black uppercase tracking-widest text-center" 
                          />
                          {validCouponCode ? (
                            <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-red-200 text-red-500" onClick={() => { setValidCouponCode(""); setAppliedDiscount(0); setCouponCode(""); }}>
                               <X className="h-5 w-5" />
                            </Button>
                          ) : (
                            <Button onClick={handleApplyPromo} disabled={isVerifyingCoupon || !couponCode} className="h-12 px-6 rounded-xl bg-primary font-black uppercase text-[10px]">
                               {isVerifyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                            </Button>
                          )}
                       </div>
                    </div>

                    <div className="p-10 sm:p-16 bg-slate-900 text-white rounded-[3rem] space-y-6 relative overflow-hidden shadow-2xl text-center">
                       <div className="absolute top-0 right-0 p-4 opacity-5"><Zap className="h-60 w-60" /></div>
                       <p className="text-[11px] text-accent font-black uppercase tracking-[0.5em] relative z-10">Total Pay Node</p>
                       
                       <div className="space-y-2 relative z-10">
                          {appliedDiscount > 0 && (
                            <div className="flex items-center justify-center gap-3 opacity-40">
                               <p className="text-2xl font-black line-through">{currencySymbol}{Math.round((parseFloat(selectedTierData?.minSpend || 0) * (1 + (parseFloat(business?.defaultGstRate || 18)/100)))).toLocaleString()}</p>
                            </div>
                          )}
                          <h3 className="text-5xl sm:text-8xl font-black tracking-tighter">{currencySymbol}{selectedTierGST?.lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                          {appliedDiscount > 0 && (
                             <Badge className="bg-green-500 text-white border-none text-[8px] font-black h-5 px-2 uppercase animate-bounce">SAVED {currencySymbol}{appliedDiscount.toLocaleString()}</Badge>
                          )}
                       </div>
                    </div>

                    <Button onClick={handleInitiatePayment} disabled={isSubmitting} className="w-full h-16 sm:h-24 bg-primary hover:bg-primary/90 font-black uppercase text-sm sm:text-base tracking-[0.3em] rounded-2xl sm:rounded-[2rem] shadow-2xl active:scale-95 transition-all text-white">
                      {isSubmitting ? <Loader2 className="h-8 w-8 mr-3 animate-spin" /> : <ShieldCheck className="h-8 w-8 mr-3" />}
                      Finalize & Pay
                    </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {(portalConfig?.rules || business?.loyaltyRules) && (
            <section className="space-y-10 animate-in fade-in duration-1000 pb-10 px-2 text-left">
              <div className="flex flex-col items-center text-center space-y-4">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-widest">Program Guidelines</h2>
                <div className="h-1 w-20 bg-primary rounded-full" />
              </div>
              <Card className="max-w-4xl mx-auto border-none shadow-xl bg-white rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border p-6 sm:p-12">
                <div className="space-y-8 text-left">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><FileText className="h-6 w-6" /></div>
                      <div className="text-left">
                        <h4 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-widest">Membership Rules & Policy</h4>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Terms and conditions for reward accrual</p>
                      </div>
                    </div>
                    <Separator className="opacity-40" />
                    <div className="space-y-6">
                      {(portalConfig?.rules || business?.loyaltyRules || "Standard program rules apply.").split('\n').filter((l: string) => l.trim() !== '').map((rule: string, i: number) => (
                        <div key={i} className="flex gap-4 sm:gap-5 group text-left">
                          <div className="h-6 w-6 rounded-full bg-slate-50 border border-border flex items-center justify-center text-[10px] font-black text-primary shrink-0 transition-all group-hover:bg-primary group-hover:text-white group-hover:scale-110">{i + 1}</div>
                          <p className="text-xs sm:text-sm font-medium text-slate-600 leading-relaxed uppercase tracking-tight text-left">{rule}</p>
                        </div>
                      ))}
                    </div>
                </div>
              </Card>
            </section>
          )}
        </main>

        <footer className="mt-20 py-16 sm:py-24 bg-white border-t text-center px-4">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center justify-center gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-sm sm:text-xl shadow-xl">B</div>
                <span className="text-sm sm:text-lg font-black uppercase tracking-[0.3em] text-slate-900">SECURE OS NODE</span>
              </div>
              <p className="text-[10px] sm:text-sm font-bold text-slate-500 uppercase tracking-widest leading-relaxed max-w-2xl text-center">
                OFFICIAL MEMBERSHIP PORTAL FOR <span className="text-slate-900">{business?.name}</span>.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 sm:gap-16">
              <div className="space-y-6 text-left">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center md:text-left">LOCATE NODE</h4>
                <div className="flex items-center justify-center gap-4 text-center max-w-xs mx-auto text-left">
                  <MapPin className="h-5 w-5 text-primary shrink-0" />
                  <p className="text-[10px] sm:text-xs font-bold text-slate-700 leading-relaxed uppercase">
                    {portalConfig?.storeAddress || business?.address || "Location pending"}
                  </p>
                </div>
              </div>

              <div className="space-y-6 text-left">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-center md:text-left">CONNECT NODE</h4>
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3">
                     <Phone className="h-4 w-4 text-primary shrink-0" />
                     <a href={`tel:${portalConfig?.storePhone || business?.phone}`} className="text-xs sm:text-sm font-black text-slate-900 border-b-2 border-slate-900 pb-0.5">
                       {portalConfig?.storePhone || business?.phone}
                     </a>
                  </div>
                  {portalConfig?.storeEmail && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-[10px] font-bold text-slate-600 uppercase">{portalConfig.storeEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6 text-left">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-center md:text-left">TRUST NODE</h4>
                <div className="flex flex-col items-center gap-4">
                   <div className="flex items-center gap-2 text-left"><ShieldCheck className="h-4 w-4 text-green-600" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-900">VERIFIED OS v3.5</span></div>
                   <div className="flex items-center gap-2 text-left"><BadgeCheck className="h-4 w-4 text-primary" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-900">ENCRYPTED PORT</span></div>
                </div>
              </div>
            </div>
          </div>
        </footer>

        <Dialog open={!!inspectingTier} onOpenChange={(open) => !open && setInspectingTier(null)}>
          <DialogContent className="sm:max-w-[450px] h-[90vh] rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden w-[95vw] flex flex-col text-left">
            <DialogHeader className="sr-only"><DialogTitle>Tier Details</DialogTitle></DialogHeader>
            {inspectingTier && (
              <>
                <div className="p-10 text-white relative overflow-hidden shrink-0" style={{ backgroundColor: inspectingTier.color || '#0C83B3' }}>
                  <Crown className="absolute top-0 right-0 p-8 opacity-10 rotate-12 h-48 w-48" />
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20 uppercase text-[9px] font-black px-3 h-5 rounded-full mb-6">IDENTITY TIER</Badge>
                  <h3 className="text-4xl font-black uppercase tracking-tight">{inspectingTier.name}</h3>
                </div>
                <ScrollArea className="flex-1 p-10 space-y-10">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-5 rounded-[2rem] bg-primary/5 border border-primary/10 text-center"><p className="text-[10px] font-black uppercase text-primary/60 mb-1">Rewards</p><p className="text-xl font-black text-primary">{inspectingTier.pointsMultiplier}X Points</p></div>
                    <div className="p-5 rounded-[2rem] bg-green-50 border border-green-100 text-center"><p className="text-[10px] font-black uppercase text-green-600/60 mb-1">Cashback</p><p className="text-xl font-black text-green-700">{inspectingTier.cashbackPercent}% Back</p></div>
                  </div>
                  <Separator />
                  <div className="space-y-8 text-left">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Included Privileges</h4>
                    <div className="space-y-5 text-left">
                      {(inspectingTier.benefits || []).map((benefit: string, i: number) => (
                        <div key={i} className="flex gap-5 items-start">
                          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                          <p className="text-sm font-bold text-slate-700 uppercase tracking-tight">{benefit}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter className="p-8 sm:p-10 bg-muted/10 border-t flex flex-col gap-3">
                   <Button onClick={() => handleSelectTier(inspectingTier.id)} className="w-full h-16 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl text-white">Join This Membership</Button>
                   <Button variant="ghost" className="w-full h-10 rounded-xl font-bold uppercase text-[10px]" onClick={() => setInspectingTier(null)}>Close Detail</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!inspectingCoupon} onOpenChange={(open) => !open && setInspectingCoupon(null)}>
          <DialogContent className="sm:max-w-[450px] h-[90vh] rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden w-[95vw] flex flex-col text-left">
            <DialogHeader className="sr-only"><DialogTitle>Offer Node</DialogTitle><DialogDescription>Details</DialogDescription></DialogHeader>
            {inspectingCoupon && (
              <>
                <div className="p-8 sm:p-10 bg-slate-50 flex justify-center shrink-0">
                   <div className="w-full max-w-[320px] scale-90 sm:scale-100">
                      <CouponPublicCard data={inspectingCoupon} business={business} currencySymbol={currencySymbol} hideInspectButton />
                   </div>
                </div>
                <div className="relative flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-8 sm:p-10 space-y-6 text-left pb-20">
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><ListTodo className="h-4 w-4" /> {inspectingCoupon.descriptionHeading || 'Offer Rules'}</h4>
                      <div className="space-y-4 pl-1 pb-10 text-left">
                        {(inspectingCoupon.rules || "").split('\n').filter((l:string) => l.trim() !== "").map((rule: string, i: number) => (
                          <div key={i} className="flex gap-4 text-left">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                            <p className="text-sm font-bold text-slate-600 leading-relaxed uppercase tracking-tight text-left">{rule}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ScrollArea>
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
                </div>
                <DialogFooter className="p-6 bg-muted/10 border-t flex flex-row gap-3 shrink-0">
                  <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold uppercase text-[10px]" onClick={() => setInspectingCoupon(null)}>Close</Button>
                  <Button className="flex-1 h-12 bg-green-600 hover:bg-green-700 rounded-xl font-bold uppercase text-[10px] gap-2 shadow-lg text-white" onClick={() => {
                    const msg = `Namaste! I want to inquire about the offer *${inspectingCoupon.code}* seen on your join portal at ${business?.name}.`;
                    window.open(`https://wa.me/${business?.phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(msg)}`, '_blank');
                  }}><SmartphoneNfc className="h-4 w-4" /> Inquire</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

function CouponPublicCard({ data, business, currencySymbol, hideInspectButton = false, onInspect }: any) {
  const themeClass = THEME_STYLES[data.theme || 'blue'] || THEME_STYLES.blue;

  const renderTopContent = () => {
    const usageLabel = `${data.usageCount || 0} / ${data.usageLimit || '∞'}`;
    return (
      <div className="flex justify-between relative z-10 h-full min-h-[110px] text-left">
        <div className="flex-1 min-w-0 pr-4 flex flex-col justify-center text-left">
          <div className="flex items-center gap-1.5 opacity-60 mb-2 sm:mb-3 text-left">
            <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] truncate text-left">
              {business?.offerGroups?.find((g: any) => g.id === data.groupId)?.name || 'PROMO CODE'}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black tracking-widest leading-none truncate drop-shadow-lg text-left">{data.code || 'CODE'}</h3>
          <p className="text-[10px] sm:text-[11px] font-bold text-accent italic uppercase mt-3 sm:mt-4 text-left">
            {data.type === 'percentage' ? `${data.value}% OFF` : data.type === 'bogo' ? data.value : `${currencySymbol}${data.value} FLAT`}
          </p>
        </div>
        <div className="w-[32%] flex flex-col items-center justify-between py-1 pl-2 border-l-2 border-dashed border-white/30 shrink-0 text-center">
          <div className="text-center">
            <p className="text-[7px] font-black uppercase opacity-60 tracking-tighter text-center">GLOBAL LOG</p>
            <p className="text-[10px] font-black text-white text-center">{usageLabel}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-[12px] font-black text-white shadow-inner shrink-0 mx-auto">
            {business?.name?.charAt(0) || 'B'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-none shadow-2xl bg-white rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border group relative transition-all duration-500 hover:scale-[1.02] flex flex-col h-full text-left">
      <div className={cn("p-6 sm:p-8 relative text-white min-h-[160px]", themeClass)}>
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '15px 15px' }} />
        <div className="absolute -top-4 right-[32%] -translate-x-1/2 h-8 w-8 bg-slate-50 rounded-full z-20 shadow-inner" />
        <div className="absolute -bottom-4 right-[32%] -translate-x-1/2 h-8 w-8 bg-white rounded-full z-20 shadow-inner" />
        {renderTopContent()}
      </div>
      <CardContent className="p-6 sm:p-8 space-y-6 bg-white relative z-20 text-left flex-1">
        <div className="flex justify-between items-center text-left">
          <div className="space-y-1 text-left"><p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest text-left">MIN SPEND</p><p className="text-lg sm:text-xl font-black text-slate-900 text-left">{currencySymbol}{data.minOrder || 0}</p></div>
          <div className="text-right space-y-1"><p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest text-right">LIMIT</p><p className="text-xs sm:text-sm font-black text-primary uppercase text-right">0 / {data.perUserLimit || 1}</p></div>
        </div>
        
        {!hideInspectButton && (
          <Button variant="ghost" className="w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] border-2 border-dashed border-primary/20 text-primary hover:bg-primary/5 transition-all" onClick={() => onInspect?.(data)}>
            <Info className="h-4 w-4 mr-2" /> INSPECT REWARD
          </Button>
        )}

        <Separator className="opacity-40" />

        <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 text-left">
           <div className="flex items-center gap-2 text-left">
             <Clock className="h-4 w-4 opacity-40" />
             <span className="text-primary font-bold uppercase text-left">Active Node</span>
           </div>
           <Badge variant="outline" className="text-[8px] h-4 border-primary/20 text-primary uppercase font-black">Authorized</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoyaltyJoinPage(props: { params: Promise<{ businessId: string }> }) {
  const { businessId } = use(props.params);
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary opacity-20" /></div>}>
      <JoinContent businessId={businessId} />
    </Suspense>
  );
}
