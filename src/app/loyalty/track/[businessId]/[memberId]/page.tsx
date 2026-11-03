
"use client";

import { use, useState, useEffect, useMemo, useRef } from "react";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  User, 
  Bot, 
  ShieldCheck, 
  Star, 
  SmartphoneNfc, 
  Loader2, 
  Reply, 
  Info, 
  ExternalLink, 
  ChevronRight, 
  BadgeCheck, 
  Zap,
  Trophy,
  Wallet,
  Ticket,
  Sparkles,
  Gift,
  PlusCircle,
  Calendar,
  Globe,
  FileText,
  Instagram,
  Facebook,
  Youtube,
  Heart,
  ListTodo,
  Handshake,
  History,
  TrendingUp,
  ArrowRight,
  Gem,
  Layout,
  X,
  Link as LinkIcon,
  Phone,
  Mail,
  MapPin,
  Tag
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from "@/components/ui/dialog";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { 
  useFirestore, 
  useDoc, 
  useMemoFirebase, 
  useCollection, 
  updateDocumentNonBlocking, 
  addDocumentNonBlocking, 
  useUser 
} from "@/firebase";
import { collection, doc, serverTimestamp, query, where, orderBy, getDocs, limit, increment } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { getPublicBusinessNode } from "@/app/actions/p0-migration";

// Modular Components
import { ProfileCard } from "../../components/ProfileCard";
import { RewardsTab } from "../../components/RewardsTab";
import { OccasionsTab } from "../../components/OccasionsTab";
import { ReferralTab } from "../../components/ReferralTab";
import { HistoryTab } from "../../components/HistoryTab";
import { GuidelinesTab } from "../../components/GuidelinesTab";

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

export default function MemberPublicPortal(props: { params: Promise<{ businessId: string, memberId: string }> }) {
  const { businessId: paramId, memberId } = use(props.params);
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  
  const [accessVerified, setAccessVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReferralCopied, setIsReferralCopied] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [business, setBusiness] = useState<any>(null);
  const [isBizLoading, setIsBizLoading] = useState(true);

  // HARDENED: ID Resolver & Business Node Fetcher (Privileged)
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
      } finally {
        setIsBizLoading(false);
      }
    }
    resolveId();
  }, [paramId, firestore]);

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);

  const isAdminOrStaff = useMemo(() => {
    const role = (userProfile?.role || '').toLowerCase();
    return (userProfile?.businessId === businessId) && (['admin', 'manager', 'staff', 'agent', 'accountant'].includes(role) || user?.email?.toLowerCase() === 'skillmatrix24@gmail.com');
  }, [userProfile, user, businessId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && businessId) {
      const sessionToken = localStorage.getItem(`verified_session_${memberId}`);
      if (isAdminOrStaff || sessionToken) setAccessVerified(true);
      else router.push(`/loyalty/track-member/${businessId}?mId=${memberId}`);
    }
  }, [isAdminOrStaff, memberId, businessId, router]);

  // Core Data Fetchers
  const memberRef = useMemoFirebase(() => businessId && memberId ? doc(firestore, 'businesses', businessId, 'memberships', memberId) : null, [firestore, businessId, memberId]);
  const { data: member, isLoading: isMemberLoading } = useDoc<any>(memberRef);

  const customerRef = useMemoFirebase(() => businessId && member?.customerId ? doc(firestore, 'businesses', businessId, 'customers', member.customerId) : null, [firestore, businessId, member?.customerId]);
  const { data: customer } = useDoc<any>(customerRef);

  const configRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId, 'loyaltyConfig', 'main') : null, [firestore, businessId]);
  const { data: portalConfig } = useDoc<any>(configRef);

  const offerGroups = useMemo(() => business?.offerGroups || [], [business]);

  const activityQuery = useMemoFirebase(() => businessId && member?.customerId ? query(collection(firestore, 'businesses', businessId, 'loyaltyActivity'), where('customerId', '==', member.customerId), orderBy('timestamp', 'desc')) : null, [firestore, businessId, member?.customerId]);
  const { data: activitiesRaw } = useCollection<any>(activityQuery);
  const activities = activitiesRaw || [];

  const allActiveCouponsQuery = useMemoFirebase(() => {
    if (!businessId) return null;
    return query(collection(firestore, 'businesses', businessId, 'coupons'), where('status', '==', 'active'));
  }, [firestore, businessId]);
  const { data: allActiveCoupons } = useCollection<any>(allActiveCouponsQuery);

  const tierId = member?.tier?.toLowerCase();
  const tierDocRef = useMemoFirebase(() => businessId && tierId ? doc(firestore, 'businesses', businessId, 'loyaltyTiers', tierId) : null, [firestore, businessId, tierId]);
  const { data: tierData } = useDoc<any>(tierDocRef);

  const bundledCoupons = useMemo(() => {
    if (!allActiveCoupons || !tierData?.linkedCouponIds) return [];
    return allActiveCoupons.filter(c => tierData.linkedCouponIds.includes(c.id));
  }, [allActiveCoupons, tierData?.linkedCouponIds]);

  const groupedCoupons = useMemo(() => {
    const groups: Record<string, any[]> = {};
    bundledCoupons.forEach(c => {
      const gId = c.groupId || "none";
      if (!groups[gId]) groups[gId] = [];
      groups[gId].push(c);
    });
    return groups;
  }, [bundledCoupons]);

  const leaderboardQuery = useMemoFirebase(() => businessId ? query(collection(firestore, 'businesses', businessId, 'memberships'), orderBy('referralCount', 'desc'), limit(10)) : null, [firestore, businessId]);
  const { data: topReferrersRaw } = useCollection<any>(leaderboardQuery);
  const topReferrers = topReferrersRaw || [];

  const totalCouponSavings = useMemo(() => {
    return activities
      .filter(a => a.type === 'coupon_redeem')
      .reduce((sum, a) => sum + (parseFloat(a.cashback) || 0), 0);
  }, [activities]);

  const [inspectingCoupon, setInspectingCoupon] = useState<any>(null);
  const [isAddEventOpen, setIsAddOpen] = useState(false);
  const [eventData, setEventData] = useState({ label: "", type: "birthday", date: "", phone: "" });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [isProfileCompletionOpen, setIsProfileCompletionOpen] = useState(false);
  const [profileCompletionData, setProfileCompletionData] = useState({ dob: "", anniversaryDate: "", email: "", city: "" });

  const isProfileIncomplete = useMemo(() => {
    if (!customer) return false;
    return !customer.dob || !customer.anniversaryDate;
  }, [customer]);

  const cardThemeColor = useMemo(() => {
    if (!member) return '#0C83B3';
    const tier = (member.tier || '').toLowerCase();
    if (tier === 'gold') return '#f59e0b'; 
    if (tier === 'platinum' || tier === 'elite') return '#1e293b';
    if (tier === 'vip' || tier === 'legend') return '#7c3aed';
    return '#0C83B3';
  }, [member?.tier]);

  const currencySymbol = getCurrencySymbol(business?.currency || "INR");

  const referralLink = useMemo(() => {
    if (typeof window === 'undefined' || !member?.cardNumber) return "";
    return `${window.location.origin}/loyalty/join/${business?.slug || businessId}?ref=${member.cardNumber}`;
  }, [member?.cardNumber, businessId, business?.slug]);

  const handleShareReferral = () => {
    const msg = `Namaste! Join the ${business?.name || 'Store'} Loyalty Program and unlock exclusive rewards instantly! Use my link to join: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

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
      updateDocumentNonBlocking(customerRef, { ...profileCompletionData, profileBonusClaimed: true, updatedAt: serverTimestamp() });
      if (!customer?.profileBonusClaimed && bonusPoints > 0) {
        updateDocumentNonBlocking(memberRef, { rewardPoints: increment(bonusPoints) });
        addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'loyaltyActivity'), {
          customerId: member.customerId, customerName: member.customerName, type: 'profile_bonus', points: bonusPoints, timestamp: new Date().toISOString(), description: "Bonus for profile completion"
        });
      }
      setIsProfileCompletionOpen(false);
      toast({ title: "Profile Completed", description: `You earned ${bonusPoints} points!` });
    } finally { setIsSubmitting(false); }
  };

  const handleOpenEditEvent = (ev: any) => {
    setEventData({ label: ev.label, type: ev.type, date: ev.date, phone: ev.phone || "" });
    setEditingEventId(ev.id);
    setIsAddOpen(true);
  };

  const handleDeleteEvent = (id: string) => {
    if (!customerRef || !customer) return;
    const updatedEvents = (customer.events || []).filter((e: any) => e.id !== id);
    updateDocumentNonBlocking(customerRef, { events: updatedEvents, updatedAt: serverTimestamp() });
    toast({ title: "Occasion Erased", variant: "destructive" });
  };

  // Branding Logic Node
  const titleFont = portalConfig?.titleFont || 'Mukta';
  const descFont = portalConfig?.descriptionFont || 'Mukta';
  const titleSize = portalConfig?.titleFontSize ? `${portalConfig.titleFontSize}px` : "32px";
  const descSize = portalConfig?.descriptionFontSize ? `${portalConfig.descriptionFontSize}px` : "16px";
  const fontUrl = `https://fonts.googleapis.com/css2?family=${titleFont.replace(' ', '+')}:wght@400;700;900&family=${descFont.replace(' ', '+')}:wght@400;500;700&display=swap`;

  if (isMemberLoading || isBizLoading || !accessVerified) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-20 overflow-x-hidden text-left">
      <link rel="stylesheet" href={fontUrl} />
      
      <header className="sticky top-0 z-50 bg-white border-b h-16 sm:h-20 flex items-center shadow-sm">
        <div className="max-w-6xl mx-auto px-4 w-full flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 text-left">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-border/10 shrink-0 overflow-hidden text-left">
              {(portalConfig?.logoUrl || business?.logoUrl) ? <img src={portalConfig?.logoUrl || business.logoUrl} className="h-full w-full object-cover" alt="Logo" /> : <div className="h-full w-full bg-primary flex items-center justify-center text-white font-black text-sm">{business?.name?.charAt(0) || "B"}</div>}
            </div>
            <span className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tighter truncate max-w-[150px]">
              {portalConfig?.storeName || business?.name}
            </span>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-9 rounded-xl text-[10px] font-black uppercase text-primary px-3">
            <Link href="/"><ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-8 space-y-10 sm:space-y-16">
        <div className="text-center space-y-10 py-6 sm:py-12 animate-in fade-in duration-1000 text-left sm:text-center">
           <div className="flex flex-col items-center gap-8">
              <div className="relative h-24 w-24 sm:h-32 sm:w-32 bg-white rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-border/10 overflow-hidden">
                {(portalConfig?.logoUrl || business?.logoUrl) ? <img src={portalConfig?.logoUrl || business.logoUrl} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-primary flex items-center justify-center text-white font-black text-4xl">{business?.name?.charAt(0)}</div>}
              </div>
              <Badge variant="outline" className="h-6 px-4 border-primary/20 bg-primary/5 text-primary text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-2 fill-current" /> EXCLUSIVE REWARDS PORTAL
              </Badge>
           </div>
           <div className="space-y-6 px-2 max-w-4xl mx-auto text-left sm:text-center">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 leading-[1.1]" style={{ fontFamily: titleFont, fontSize: titleSize }}>
                <HighlightedText text={portalConfig?.title || "My Membership Node"} highlight={portalConfig?.titleHighlightWord} color={portalConfig?.titleHighlightColor} isGradient={portalConfig?.titleHighlightGradient} gradientEnd={portalConfig?.titleGradientEnd} />
              </h1>
              <p className="text-muted-foreground font-medium text-sm sm:text-base md:text-lg" style={{ fontFamily: descFont, fontSize: descSize }}>
                <HighlightedText text={portalConfig?.description || "Track rewards and exclusive member offers in real-time."} highlight={portalConfig?.descriptionHighlightWord} color={portalConfig?.descriptionHighlightColor} isGradient={portalConfig?.descriptionHighlightGradient} gradientEnd={portalConfig?.descriptionGradientEnd} />
              </p>
           </div>
        </div>

        {isProfileIncomplete && (
          <Card className="border-none shadow-2xl bg-orange-500 text-white rounded-[2rem] p-6 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative text-left mx-2 sm:mx-0">
             <div className="flex flex-col sm:flex-row items-center gap-6 text-center md:text-left">
                <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center text-orange-600 shrink-0"><Sparkles className="h-7 w-7" /></div>
                <div className="text-left"><h3 className="text-lg sm:text-2xl font-black uppercase">Unlock Bonus Rewards!</h3><p className="text-[11px] font-bold opacity-80">Complete profile to win {portalConfig?.profileBonusPoints || 50} points.</p></div>
             </div>
             <Button onClick={() => setIsProfileCompletionOpen(true)} className="h-12 px-8 rounded-xl bg-white text-orange-600 hover:bg-orange-50 font-black uppercase text-[10px] w-full md:w-auto shadow-xl">Complete Now</Button>
          </Card>
        )}

        <ProfileCard member={member} cardThemeColor={cardThemeColor} currencySymbol={currencySymbol} />

        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700 px-2 text-left">
             <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden border group transition-all hover:scale-[1.02]">
                <div className="p-6 sm:p-8 flex items-center gap-6">
                   <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl sm:rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:rotate-12 transition-transform duration-500 shadow-inner">
                      <Trophy className="h-6 w-6 sm:h-9 w-9" />
                   </div>
                   <div className="space-y-0.5 text-left">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">My Reward Points</p>
                      <p className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">{member?.rewardPoints?.toLocaleString() || 0} <span className="text-[9px] opacity-30 font-bold uppercase tracking-tighter">pts</span></p>
                   </div>
                </div>
                <div className="px-6 sm:px-8 pb-6 sm:pb-8 text-left border-t pt-4 sm:pt-6 bg-muted/5">
                   <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase leading-relaxed">Redeem points for discounts on your next billing session.</p>
                </div>
             </Card>

             <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden border group transition-all hover:scale-[1.02]">
                <div className="p-6 sm:p-8 flex items-center gap-6">
                   <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl sm:rounded-[1.5rem] bg-green-50 flex items-center justify-center text-green-600 shrink-0 group-hover:rotate-12 transition-transform duration-500 shadow-inner">
                      <Wallet className="h-6 w-6 sm:h-9 w-9" />
                   </div>
                   <div className="space-y-0.5 text-left">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">My Cashback Card</p>
                      <p className="text-2xl sm:text-3xl font-black text-green-600 leading-none">{currencySymbol}{member?.walletBalance?.toLocaleString() || 0}</p>
                   </div>
                </div>
                <div className="px-6 sm:px-8 pb-6 sm:pb-8 text-left border-t pt-4 sm:pt-6 bg-muted/5">
                   <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase leading-relaxed">Direct cashback earned from previous transactions.</p>
                </div>
             </Card>

             <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden border group transition-all hover:scale-[1.02]">
                <div className="p-6 sm:p-8 flex items-center gap-6">
                   <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl sm:rounded-[1.5rem] bg-orange-50 flex items-center justify-center text-orange-600 shrink-0 group-hover:rotate-12 transition-transform duration-500 shadow-inner">
                      <Ticket className="h-6 w-6 sm:h-9 w-9" />
                   </div>
                   <div className="space-y-0.5 text-left">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">My Total Savings</p>
                      <p className="text-2xl sm:text-3xl font-black text-orange-600 leading-none">{currencySymbol}{totalCouponSavings.toLocaleString()}</p>
                   </div>
                </div>
                <div className="px-6 sm:px-8 pb-6 sm:pb-8 text-left border-t pt-4 sm:pt-6 bg-muted/5">
                   <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase leading-relaxed">Cumulative benefits unlocked via promo codes.</p>
                </div>
             </Card>
          </section>

        <Tabs defaultValue="rewards" className="w-full">
          <TabsList className="bg-white border h-auto p-1.5 rounded-2xl shadow-sm mb-10 grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            <TabsTrigger value="rewards" className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-3 gap-2"><Ticket className="h-3.5 w-3.5" /> Offers</TabsTrigger>
            <TabsTrigger value="occasions" className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-3 gap-2"><Heart className="h-3.5 w-3.5" /> Occasions</TabsTrigger>
            <TabsTrigger value="referral" className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-3 gap-2"><Handshake className="h-3.5 w-3.5" /> Refer</TabsTrigger>
            <TabsTrigger value="history" className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-3 gap-2"><History className="h-3.5 w-3.5" /> History</TabsTrigger>
            <TabsTrigger value="guidelines" className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-3 gap-2"><FileText className="h-3.5 w-3.5" /> Rules</TabsTrigger>
          </TabsList>

          <TabsContent value="rewards" className="m-0"><RewardsTab bundledCoupons={bundledCoupons} groupedCoupons={groupedCoupons} offerGroups={offerGroups} business={business} currencySymbol={currencySymbol} member={member} activities={activities} onInspect={setInspectingCoupon} /></TabsContent>
          <TabsContent value="occasions" className="m-0"><OccasionsTab events={customer?.events || []} onAdd={() => setIsAddOpen(true)} onEdit={handleOpenEditEvent} onDelete={handleDeleteEvent} /></TabsContent>
          <TabsContent value="referral" className="m-0"><ReferralTab member={member} business={business} currencySymbol={currencySymbol} referralLink={referralLink} isReferralCopied={isReferralCopied} topReferrers={topReferrers} onShare={handleShareReferral} onCopy={handleCopyReferral} /></TabsContent>
          <TabsContent value="history" className="m-0"><HistoryTab activities={activities} currencySymbol={currencySymbol} /></TabsContent>
          <TabsContent value="guidelines" className="m-0"><GuidelinesTab rules={portalConfig?.rules || business?.loyaltyRules} /></TabsContent>
        </Tabs>
      </main>

      <footer className="mt-24 py-16 sm:py-24 bg-white border-t">
        <div className="max-w-6xl mx-auto px-4 flex flex-col items-center gap-12 text-center">
          <div className="flex flex-col md:flex-row items-center justify-between w-full gap-8">
            <div className="flex flex-col items-center md:items-start gap-4 text-left">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-lg">B</div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Secure OS Node</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-sm text-center md:text-left">
                Official identity portal for <strong>{portalConfig?.storeName || business?.name}</strong>. Built on the Biztrix AI ecosystem.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3">
               {portalConfig?.customButtons?.map((btn: any, i: number) => (
                 <Button key={i} asChild variant="outline" className="h-10 rounded-xl px-6 text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary shadow-sm hover:bg-primary/5">
                   <a href={btn.url} target="_blank" rel="noopener noreferrer">{btn.label}</a>
                 </Button>
               ))}
            </div>

            <div className="flex gap-4">
               {portalConfig?.instagramUrl && <a href={portalConfig.instagramUrl} target="_blank" className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary transition-all border"><Instagram className="h-5 w-5" /></a>}
               {portalConfig?.facebookUrl && <a href={portalConfig.facebookUrl} target="_blank" className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary transition-all border"><Facebook className="h-5 w-5" /></a>}
               {portalConfig?.youtubeUrl && <a href={portalConfig.youtubeUrl} target="_blank" className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary transition-all border"><Youtube className="h-5 w-5" /></a>}
            </div>
          </div>

          <div className="space-y-6 text-left w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex gap-4 items-start text-left">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-slate-600">{portalConfig?.storeAddress || business?.address || "Location pending"}</p>
              </div>
              <div className="flex gap-4 items-center text-left">
                <Phone className="h-5 w-5 text-primary shrink-0" />
                <p className="text-xs font-bold text-slate-600">{portalConfig?.storePhone || business?.phone || "N/A"}</p>
              </div>
              <div className="flex gap-4 items-center text-left">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <p className="text-xs font-bold text-slate-600">{portalConfig?.storeEmail || business?.email || "N/A"}</p>
              </div>
            </div>
          </div>

          <Separator className="opacity-50" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">© 2026 Biztrix AI • Secured Multi-tenant Connection</p>
        </div>
      </footer>

      {/* DIALOGS */}
      <Dialog open={!!inspectingCoupon} onOpenChange={(open) => !open && setInspectingCoupon(null)}>
        <DialogContent className="sm:max-w-[450px] h-[90vh] rounded-[2.5rem] sm:rounded-[3.5rem] border-none shadow-3xl p-0 overflow-hidden w-[95vw] flex flex-col text-left">
          <DialogHeader className="sr-only"><DialogTitle>Offer Node</DialogTitle><DialogDescription>Details</DialogDescription></DialogHeader>
          {inspectingCoupon && (
            <>
              <div className="p-6 sm:p-12 bg-slate-50 flex justify-center shrink-0">
                 <div className="w-full max-w-[340px] scale-90 sm:scale-105">
                    <CouponPublicCard data={inspectingCoupon} business={business} currencySymbol={currencySymbol} member={member} activities={activities} hideInspectButton />
                 </div>
              </div>
              <div className="relative flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-8 sm:p-14 space-y-6 sm:space-y-8 text-left pb-20">
                    <h4 className="text-[10px] sm:text-sm font-black uppercase tracking-widest text-primary flex items-center gap-3 text-left"><ListTodo className="h-4 w-4 sm:h-5 sm:w-5" /> {inspectingCoupon.descriptionHeading || 'Offer Rules'}</h4>
                    <div className="space-y-4 sm:space-y-6 pl-1 pb-12 text-left">
                      {(inspectingCoupon.rules || "").split('\n').filter((l:string) => l.trim() !== "").map((rule: string, i: number) => (
                        <div key={i} className="flex gap-4 sm:gap-5 text-left">
                          <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-primary mt-1.5 sm:mt-2 shrink-0" />
                          <p className="text-xs sm:text-base font-bold text-slate-600 leading-relaxed uppercase tracking-tight text-left flex-1">{rule}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
                <div className="absolute bottom-0 left-0 right-0 h-12 sm:h-16 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
              </div>
              <DialogFooter className="p-4 sm:p-8 bg-muted/10 border-t flex flex-row gap-3 sm:gap-4 shrink-0">
                <Button variant="outline" className="flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl font-bold uppercase text-[9px] sm:text-[10px]" onClick={() => setInspectingCoupon(null)}>Close Hub</Button>
                <Button 
                  className={cn(
                    "flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-[10px] gap-2 shadow-2xl text-white transition-all active:scale-95",
                    (activities?.filter((a:any) => a.type === 'coupon_redeem' && a.couponId === inspectingCoupon.id).length >= (inspectingCoupon.perUserLimit || 1)) 
                      ? "bg-slate-400 cursor-not-allowed" 
                      : "bg-green-600 hover:bg-green-700"
                  )}
                  disabled={activities?.filter((a:any) => a.type === 'coupon_redeem' && a.couponId === inspectingCoupon.id).length >= (inspectingCoupon.perUserLimit || 1)}
                  onClick={() => {
                    const msg = `Namaste! I want to redeem offer *${inspectingCoupon.code}* associated with my Member ID *${member?.cardNumber || member?.id.slice(-6).toUpperCase()}*. Here is my portal: ${window.location.origin}/loyalty/track/${business?.slug || businessId}/${memberId}`;
                    window.open(`https://wa.me/${business?.phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                >
                  <SmartphoneNfc className="h-4 w-4 sm:h-5 sm:w-5" /> 
                  {(activities?.filter((a:any) => a.type === 'coupon_redeem' && a.couponId === inspectingCoupon.id).length >= (inspectingCoupon.perUserLimit || 1)) ? 'ALREADY USED' : 'Redeem Node'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAddEventOpen} onOpenChange={setIsAddOpen}>
         <DialogContent className="sm:max-w-[420px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden text-left w-[95vw]">
            <DialogHeader className="p-8 bg-slate-900 text-white">
               <DialogTitle className="text-xl font-bold uppercase">Record Occasion</DialogTitle>
               <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Nurturing Registry Node</p>
            </DialogHeader>
            <div className="p-8 space-y-6">
               <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Event Label</Label><Input value={eventData.label} onChange={(e) => setEventData({...eventData, label: e.target.value})} placeholder="e.g. My Anniversary" className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner" /></div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Event Type</Label><Select value={eventData.type} onValueChange={(v) => setEventData({...eventData, type: v})}><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="birthday" className="text-xs font-bold uppercase">Birthday</SelectItem><SelectItem value="anniversary" className="text-xs font-bold uppercase">Anniversary</SelectItem><SelectItem value="other" className="text-xs font-bold uppercase">Other</SelectItem></SelectContent></Select></div>
                  <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Select Date</Label><Input type="date" value={eventData.date} onChange={(e) => setEventData({...eventData, date: e.target.value})} className="h-11 rounded-xl font-bold" /></div>
               </div>
               <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">WhatsApp Node (Optional)</Label><Input value={eventData.phone} onChange={(e) => setEventData({...eventData, phone: e.target.value.replace(/\D/g, '')})} placeholder="91XXXXXXXX" className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold" /></div>
            </div>
            <DialogFooter className="p-8 bg-muted/10 border-t"><Button onClick={() => {
              if(!customerRef || !customer) return;
              const newEv = { ...eventData, id: editingEventId || `ev_${Date.now()}` };
              const currentEvents = customer.events || [];
              const updatedEvents = editingEventId ? currentEvents.map((e: any) => e.id === editingEventId ? newEv : e) : [...currentEvents, newEv];
              updateDocumentNonBlocking(customerRef, { events: updatedEvents, updatedAt: serverTimestamp() });
              setIsAddOpen(false); setEditingEventId(null); setEventData({label:"", type:"birthday", date:"", phone:""});
              toast({ title: "Occasion Saved" });
            }} disabled={!eventData.label || !eventData.date} className="w-full h-14 bg-primary font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Commit Node</Button></DialogFooter>
         </DialogContent>
      </Dialog>

      <Dialog open={isProfileCompletionOpen} onOpenChange={setIsProfileCompletionOpen}>
         <DialogContent className="sm:max-w-[450px] rounded-[3rem] border-none shadow-3xl p-0 overflow-hidden text-left w-[95vw]">
            <DialogHeader className="p-10 bg-primary text-white">
               <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner"><Sparkles className="h-8 w-8 text-accent" /></div>
                  <DialogTitle className="text-2xl font-black uppercase leading-tight tracking-tight">Complete Profile & Win!</DialogTitle>
               </div>
            </DialogHeader>
            <div className="p-10 space-y-8">
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Birth Date</Label><Input type="date" value={profileCompletionData.dob} onChange={(e) => setProfileCompletionData({...profileCompletionData, dob: e.target.value})} className="h-12 rounded-xl bg-muted/20 border-none shadow-inner font-bold" /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Anniversary</Label><Input type="date" value={profileCompletionData.anniversaryDate} onChange={(e) => setProfileCompletionData({...profileCompletionData, anniversaryDate: e.target.value})} className="h-12 rounded-xl bg-muted/20 border-none shadow-inner font-bold" /></div>
               </div>
               <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Email Address</Label><Input type="email" value={profileCompletionData.email} onChange={(e) => setProfileCompletionData({...profileCompletionData, email: e.target.value})} className="h-12 rounded-xl bg-muted/20 border-none shadow-inner font-bold" /></div>
            </div>
            <DialogFooter className="p-10 bg-muted/10 border-t"><Button onClick={handleCompleteProfile} disabled={isSubmitting || !profileCompletionData.dob} className="w-full h-16 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">Claim Bonus Points</Button></DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}

function CouponPublicCard({ data, business, currencySymbol, member, activities, hideInspectButton = false }: any) {
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

  const themeClass = THEME_STYLES[data.theme || 'blue'] || THEME_STYLES.blue;
  const redemptionCount = (activities || []).filter((a: any) => a.type === 'coupon_redeem' && a.couponId === data.id).length;
  const isUsed = redemptionCount >= (data.perUserLimit || 1);

  const displayExpiry = useMemo(() => {
    const rawDate = data.expiryDate || member?.expiryDate;
    if (!rawDate || rawDate === 'LIFETIME') return 'LIFETIME';
    try {
      const d = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
      if (d && !isNaN(d.getTime())) return format(d, 'dd MMM yyyy').toUpperCase();
    } catch (e) {
    console.error(e);}
    return 'LIFETIME';
  }, [data.expiryDate, member?.expiryDate]);

  const renderTopContent = () => {
    const usageLabel = `${data.usageCount || 0} / ${data.usageLimit || '∞'}`;
    return (
      <div className="flex justify-between relative z-10 h-full min-h-[110px] text-left">
        <div className="flex-1 min-w-0 pr-4 flex flex-col justify-center text-left">
          <div className="flex items-center gap-1.5 opacity-60 mb-2 sm:mb-3 text-left">
            <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.25em] truncate text-left">
              {business?.offerGroups?.find((g: any) => g.id === data.groupId)?.name || 'REWARD NODE'}
            </span>
          </div>
          <h3 className="text-xl sm:text-3xl font-black tracking-widest leading-none truncate drop-shadow-2xl text-left">{data.code || 'CODE'}</h3>
          <p className="text-[9px] sm:text-[13px] font-bold text-accent italic uppercase mt-3 sm:mt-4 text-left">
            {data.type === 'percentage' ? `${data.value}% OFF` : data.type === 'bogo' ? data.value : `${currencySymbol}${data.value} FLAT`}
          </p>
        </div>
        <div className="w-[34%] flex flex-col items-center justify-between py-1.5 sm:py-2 pl-2 sm:pl-3 border-l-2 border-dashed border-white/30 shrink-0 text-center">
          <div className="text-center">
            <p className="text-[6px] sm:text-[8px] font-black uppercase opacity-60 tracking-tighter text-center">GLOBAL LOG</p>
            <p className="text-[10px] sm:text-[12px] font-black text-white text-center leading-none mt-0.5 sm:mt-1">{usageLabel}</p>
          </div>
          <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-xs sm:text-[14px] font-black text-white shadow-inner shrink-0 mx-auto">
            {business?.name?.charAt(0) || 'B'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={cn(
      "border-none shadow-2xl bg-white rounded-[2rem] sm:rounded-[3rem] overflow-hidden border group relative transition-all duration-700 flex flex-col h-full text-left",
      isUsed ? "opacity-60 grayscale-[0.5]" : "hover:scale-[1.05] hover:shadow-primary/20"
    )}>
      <div className={cn("p-6 sm:p-10 relative text-white min-h-[160px] sm:min-h-[180px]", themeClass)}>
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '15px 15px' }} />
        <div className="absolute -top-4 right-[34%] -translate-x-1/2 h-8 w-8 bg-slate-50 rounded-full z-20 shadow-inner" />
        <div className="absolute -bottom-4 right-[34%] -translate-x-1/2 h-8 w-8 bg-white rounded-full z-20 shadow-inner" />
        {renderTopContent()}
      </div>
      <CardContent className="p-6 sm:p-10 space-y-6 sm:space-y-8 bg-white relative z-20 text-left flex-1">
        <div className="flex justify-between items-center text-left">
          <div className="space-y-1 text-left">
            <p className="text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-widest text-left leading-none">MIN SPEND</p>
            <p className="text-lg sm:text-2xl font-black text-slate-900 text-left leading-none">{currencySymbol}{data.minOrder || 0}</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-widest text-right leading-none">MY USAGE</p>
            <p className={cn("text-xs sm:text-lg font-black uppercase text-right leading-none", isUsed ? "text-green-600" : "text-primary")}>
              {redemptionCount} / {data.perUserLimit || 1}
            </p>
          </div>
        </div>
        
        {!hideInspectButton && (
          <Button 
            disabled={isUsed}
            variant="ghost" 
            className={cn(
              "w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-[0.2em] border-2 border-dashed transition-all duration-300",
              isUsed ? "bg-slate-50 border-slate-200 text-slate-400" : "border-primary/20 text-primary hover:bg-primary/5 shadow-sm"
            )}
          >
            {isUsed ? <BadgeCheck className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-green-600" /> : <Info className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />} 
            {isUsed ? 'CLAIMED & USED' : 'INSPECT REWARD'}
          </Button>
        )}

        <Separator className="opacity-40" />

        <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 text-left">
           <div className="flex items-center gap-2 sm:gap-3 text-left">
             <Clock className="h-4 w-4 sm:h-5 sm:w-5 opacity-40" />
             <span className="text-primary font-black text-left">{displayExpiry}</span>
           </div>
           <Badge variant="outline" className={cn("text-[7px] sm:text-[8px] h-4 sm:h-5 px-2 sm:px-3 border-primary/20 uppercase font-black tracking-widest rounded-full", isUsed ? "bg-green-100 text-green-700" : "bg-primary/5 text-primary")}>
              {isUsed ? 'REDEEMED' : 'AUTHORIZED'}
           </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
