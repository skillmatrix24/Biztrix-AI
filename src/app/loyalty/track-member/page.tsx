
"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { 
  SearchCode, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ShieldCheck, 
  User, 
  Smartphone,
  ChevronRight,
  Gem,
  ArrowRight,
  ShieldAlert,
  Info,
  Check,
  MapPin,
  Mail,
  Phone,
  BadgeCheck,
  AlertCircle,
  RefreshCcw,
  Lock,
  UserCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { useFirestore, useUser, useDoc, useMemoFirebase, useAuth, setupRecaptcha, initiatePhoneSignIn } from "@/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfirmationResult } from "firebase/auth";

type TrackState = "idle" | "searching" | "verification-gate" | "verifying-otp" | "success" | "not-found";

function TrackMemberContent() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, setState] = useState<TrackState>("idle");
  const [memberIdInput, setMemberIdInput] = useState("");
  const [otp, setOtp] = useState("");
  const [foundMember, setFoundMember] = useState<any>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const mIdParam = searchParams.get('mId');
  const bIdParam = searchParams.get('bId');

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = bIdParam || userProfile?.businessId;

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business, isLoading: isBizLoading } = useDoc<any>(businessRef);

  const configRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId, 'loyaltyConfig', 'main') : null, [firestore, businessId]);
  const { data: portalConfig } = useDoc<any>(configRef);
  
  const isAdminOrStaff = useMemo(() => {
    const role = (userProfile?.role || '').toLowerCase();
    return ['admin', 'manager', 'staff', 'accountant'].includes(role) || user?.email?.toLowerCase() === 'skillmatrix24@gmail.com';
  }, [userProfile, user]);

  useEffect(() => {
    if (mIdParam && bIdParam && !foundMember && state === 'idle') {
      handleAutoFetch(bIdParam, mIdParam);
    }
  }, [mIdParam, bIdParam, foundMember, state]);

  const handleAutoFetch = async (bid: string, mid: string) => {
    setState("searching");
    try {
      const docRef = doc(firestore, 'businesses', bid, 'memberships', mid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setFoundMember({ ...snap.data(), id: snap.id });
        setState("verification-gate");
      } else {
        setState("not-found");
      }
    } catch (e) {
    console.error(e);
      setState("idle");
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = memberIdInput.trim().toUpperCase();
    if (!cleanId || !businessId) return;
    setState("searching");
    
    try {
      let snap: any = null;

      const isPhoneInput = /^\d{10}$/.test(cleanId);
      if (isPhoneInput) {
        const custQuery = query(
          collection(firestore, 'businesses', businessId, 'customers'),
          where('phone', '==', cleanId),
          limit(1)
        );
        const custSnap = await getDocs(custQuery);
        
        if (!custSnap.empty) {
          const customerId = custSnap.docs[0].id;
          const memQuery = query(
            collection(firestore, 'businesses', businessId, 'memberships'),
            where('customerId', '==', customerId),
            limit(1)
          );
          const memSnap = await getDocs(memQuery);
          if (!memSnap.empty) snap = memSnap.docs[0];
        }
      }

      if (!snap) {
        let targetRef = doc(firestore, 'businesses', businessId, 'memberships', cleanId);
        let directSnap = await getDoc(targetRef);
        if (directSnap.exists()) snap = directSnap;
      }

      if (!snap) {
        const cardQuery = query(
          collection(firestore, 'businesses', businessId, 'memberships'),
          where('cardNumber', '==', cleanId),
          limit(1)
        );
        const cardSnap = await getDocs(cardQuery);
        if (!cardSnap.empty) snap = cardSnap.docs[0];
      }

      if (snap && snap.exists()) {
        const memberData = snap.data();
        setFoundMember({ ...memberData, id: snap.id });
        setState("verification-gate");
        toast({ title: "Identity Located" });
      } else {
        setState("not-found");
        toast({ variant: "destructive", title: "Identity Unknown", description: "No member found with this ID or Mobile Number." });
      }
    } catch (e) {
      console.error(e);
      setState("idle");
      toast({ variant: "destructive", title: "Search Error" });
    }
  };

  const handleSendOtp = async () => {
    if (!foundMember?.customerId || !auth || !businessId) return;
    setState("verifying-otp");
    setAuthError(null);
    try {
      const custRef = doc(firestore, 'businesses', businessId, 'customers', foundMember.customerId);
      const custSnap = await getDoc(custRef);
      const customer = custSnap.data();
      if (!customer?.phone) {
        toast({ variant: "destructive", title: "Privacy Error", description: "No registered phone number found." });
        setState("verification-gate");
        return;
      }
      const verifier = setupRecaptcha(auth, 'recaptcha-container');
      const phone = customer.phone.startsWith('+') ? customer.phone : `+91${customer.phone}`;
      const result = await initiatePhoneSignIn(auth, phone, verifier);
      setConfirmationResult(result);
      setState("verification-gate");
      toast({ title: "OTP Transmitted" });
    } catch (err: any) {
    console.error(err);
      setAuthError(err.message || "Failed to send OTP.");
      setState("verification-gate");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !confirmationResult) return;
    setState("verifying-otp");
    setAuthError(null);
    try {
      await confirmationResult.confirm(otp);
      handleSecureRedirect(foundMember.id);
      toast({ title: "Access Granted" });
    } catch (e: any) {
    console.error(e);
      setAuthError(e.message || "Invalid OTP code.");
      setState("verification-gate");
    }
  };

  const handleSecureRedirect = (mId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`verified_session_${mId}`, Date.now().toString());
    }
    setState("success");
    router.push(`/loyalty/track/${businessId}/${mId}`);
  };

  const portalLogo = portalConfig?.logoUrl || business?.logoUrl;

  return (
    <>
      <div className="min-h-screen bg-slate-50 font-body pb-20 overflow-x-hidden flex flex-col text-left">
        <header className="sticky top-0 z-50 bg-white border-b h-16 sm:h-20 flex items-center shadow-sm">
          <div className="max-w-6xl mx-auto px-4 w-full flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 text-left">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-border/10 shrink-0 overflow-hidden">
                {portalLogo ? <img src={portalLogo} className="h-full w-full object-contain p-1" alt="Logo" /> : <div className="h-full w-full bg-primary flex items-center justify-center text-white font-black text-sm">{business?.name?.charAt(0) || "B"}</div>}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm sm:text-base font-black text-slate-900 truncate leading-none">{portalConfig?.storeName || business?.name || "Member Portal"}</span>
                <span className="text-[9px] sm:text-[10px] font-black text-green-600 flex items-center gap-1.5 uppercase tracking-widest mt-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Identity Node
                </span>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-9 rounded-xl text-[10px] font-black uppercase text-primary px-3">
              <Link href="/"><ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back</Link>
            </Button>
          </div>
        </header>

        <main className="flex-1 max-w-2xl mx-auto px-4 pt-12 space-y-12 w-full">
          <div className="text-center space-y-4 animate-in fade-in duration-700">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">Identity Access</h2>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-60">Authorize your secure connection</p>
          </div>

          <div id="recaptcha-container"></div>

          {state === "idle" || state === "searching" || state === "not-found" ? (
            <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden border mx-2">
              <CardHeader className="p-8 sm:p-12 text-center space-y-4 bg-primary text-white">
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-3xl bg-white/10 flex items-center justify-center mx-auto border border-white/20 shadow-inner group">
                  {state === "searching" ? <Loader2 className="h-8 w-8 md:h-10 md:w-10 animate-spin text-accent" /> : <SearchCode className="h-8 w-8 md:h-10 md:w-10 text-primary group-hover:scale-110 transition-transform" />}
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-black uppercase tracking-tight">Identity Search</CardTitle>
                  <CardDescription className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Mobile Number or Card ID</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-8 sm:p-12 space-y-8">
                <form onSubmit={handleSearch} className="space-y-6 text-left">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest text-left block">Registered Identity Node</Label>
                    <div className="flex gap-3">
                      <Input value={memberIdInput} onChange={(e) => setMemberIdInput(e.target.value.toUpperCase())} placeholder="Card ID or Mobile Number" className="h-14 rounded-2xl bg-muted/20 border-none shadow-inner text-base font-bold placeholder:opacity-30" />
                      <Button type="submit" disabled={state === "searching" || !memberIdInput} size="icon" className="h-14 w-14 rounded-2xl bg-primary text-white shadow-xl shrink-0"><ChevronRight className="h-6 w-6" /></Button>
                    </div>
                  </div>
                  {state === "not-found" && (
                    <Alert className="bg-red-50 border-red-100 rounded-2xl text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-[10px] font-black uppercase ml-2 text-left">No active member node found with this input.</AlertDescription>
                    </Alert>
                  )}

                  {isAdminOrStaff && (
                    <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-primary/20 flex flex-col gap-4 animate-in zoom-in-95">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            <p className="text-[10px] font-black uppercase text-primary">Logged-in Administrator</p>
                        </div>
                        <p className="text-[9px] text-muted-foreground font-medium leading-relaxed">Aap bina card ID ke directly Member Registry se kisi ko bhi pick kar sakte hain.</p>
                        <Button asChild variant="outline" className="w-full h-12 bg-white text-primary border-primary/20 font-black uppercase text-[9px] rounded-xl shadow-sm">
                            <Link href="/loyalty/members">Go to Member Registry <ArrowRight className="ml-2 h-3.5 w-3.5" /></Link>
                        </Button>
                    </div>
                  )}

                  <Button onClick={handleSearch} disabled={state === "searching" || !memberIdInput} className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl">Run Registry Check</Button>
                </form>
              </CardContent>
            </Card>
          ) : state === "verification-gate" || state === "verifying-otp" ? (
            <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden border animate-in zoom-in-95 duration-500 mx-2">
              <CardHeader className="p-8 sm:p-12 bg-slate-900 text-white text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12"><Lock className="h-40 w-40" /></div>
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6 border border-white/10 relative z-10">
                  <Smartphone className="h-8 w-8 md:h-10 md:w-10 text-accent" />
                </div>
                <CardTitle className="text-xl md:text-2xl font-black uppercase relative z-10">Identity Gate</CardTitle>
              </CardHeader>
              <CardContent className="p-8 sm:p-12 space-y-8">
                {authError && (
                  <Alert variant="destructive" className="rounded-2xl bg-red-50 border-red-100 text-red-600 animate-in slide-in-from-top-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-[10px] font-black uppercase ml-2">{authError}</AlertDescription>
                  </Alert>
                )}

                {!confirmationResult ? (
                  <div className="text-center space-y-8 py-6">
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-slate-600 leading-relaxed uppercase tracking-tight">
                        Security Protocol: Verify ownership for member <span className="font-black text-primary">{foundMember?.customerName}</span>.
                      </p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">Phone node ending in ...{foundMember?.phone?.slice(-4) || 'XXXX'}</p>
                    </div>

                    <div className="flex flex-col gap-4">
                      {isAdminOrStaff && (
                        <div className="p-6 bg-green-50 rounded-[2rem] border-2 border-dashed border-green-200 space-y-4">
                           <div className="flex items-center gap-3 justify-center">
                              <BadgeCheck className="h-5 w-5 text-green-600" />
                              <span className="text-[10px] font-black uppercase text-green-700">Admin Bypass Node Active</span>
                           </div>
                           <Button 
                              onClick={() => handleSecureRedirect(foundMember.id)}
                              className="w-full h-14 bg-green-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl hover:bg-green-700 transition-all active:scale-95"
                            >
                              Direct Access (No OTP)
                            </Button>
                        </div>
                      )}

                      <Button 
                        onClick={handleSendOtp} 
                        disabled={state === "verifying-otp"} 
                        className={cn(
                          "w-full h-16 font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl transition-all active:scale-95",
                          isAdminOrStaff ? "bg-white text-primary border-2 border-primary/20 hover:bg-primary/5" : "bg-primary text-white"
                        )}
                      >
                        {state === "verifying-otp" ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify with OTP"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-4 text-center">
                      <Label className="text-[10px] font-black uppercase text-center block tracking-[0.4em] text-muted-foreground">Enter 6-Digit OTP</Label>
                      <Input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} maxLength={6} placeholder="000000" className="h-16 sm:h-20 text-center text-3xl sm:text-5xl font-black tracking-[0.5em] rounded-2xl bg-muted/20 border-none shadow-inner" />
                      <div className="flex justify-between px-1">
                        <button onClick={() => setConfirmationResult(null)} className="text-[9px] font-bold text-muted-foreground uppercase hover:underline">Change Identity</button>
                        <button onClick={handleSendOtp} className="text-[9px] font-bold text-primary uppercase hover:underline">Resend OTP</button>
                      </div>
                    </div>
                    <Button onClick={handleVerifyOtp} disabled={otp.length < 6 || state === "verifying-otp"} className="w-full h-16 bg-green-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl">
                      {state === "verifying-otp" ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : "Authorize & Enter"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : <div className="py-20 text-center space-y-4 opacity-40"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /><p className="text-[10px] font-black uppercase tracking-widest text-center">Opening Secure Portal...</p></div>}
        </main>

        <footer className="mt-24 py-16 sm:py-24 bg-white border-t shrink-0">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 sm:gap-16 text-center md:text-left">
            <div className="space-y-6 text-left">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <div className="h-8 w-8 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-sm sm:text-base">B</div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-900">Secure OS Node</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">Official identity portal for <strong>{portalConfig?.storeName || business?.name}</strong>.</p>
            </div>
            <div className="space-y-6 text-left">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center md:text-left">Node Contact</h4>
              <div className="space-y-4">
                <div className="flex gap-4 items-start justify-center md:justify-start text-left"><MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" /><p className="text-xs font-bold text-slate-600">{portalConfig?.storeAddress || business?.address || "Location pending"}</p></div>
                <div className="flex gap-4 items-center justify-center md:justify-start text-left"><Phone className="h-4 w-4 text-primary shrink-0" /><p className="text-xs font-bold text-slate-600">{portalConfig?.storePhone || business?.phone || "N/A"}</p></div>
                <div className="flex gap-4 items-center justify-center md:justify-start text-left"><Mail className="h-4 w-4 text-primary shrink-0" /><p className="text-xs font-bold text-slate-600">{portalConfig?.storeEmail || business?.email || "N/A"}</p></div>
              </div>
            </div>
            <div className="space-y-6 text-left">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center md:text-left">Security</h4>
              <div className="p-6 bg-slate-50 rounded-[1.5rem] sm:rounded-3xl border border-border/50 space-y-4">
                <div className="flex items-center gap-3 justify-center md:justify-start"><ShieldCheck className="h-5 w-5 text-green-600" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-900">End-to-End Verified</span></div>
                <div className="flex items-center gap-3 justify-center md:justify-start"><BadgeCheck className="h-5 w-5 text-primary" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-900">Multi-tenant Isolation</span></div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export default function TrackMemberPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>}>
      <TrackMemberContent />
    </Suspense>
  );
}
