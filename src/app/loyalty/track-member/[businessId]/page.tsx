"use client";

import { use, useState, useMemo, useEffect, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useFirestore, useUser, useDoc, useMemoFirebase, useAuth, setupRecaptcha, initiatePhoneSignIn } from "@/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit, documentId } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfirmationResult } from "firebase/auth";
import { toast } from "@/hooks/use-toast";

// Modular Components
import { TrackHeader } from "../components/TrackHeader";
import { SearchNode } from "../components/SearchNode";
import { IdentityGate } from "../components/IdentityGate";
import { OtpNode } from "../components/OtpNode";
import { TrackFooter } from "../components/TrackFooter";

type TrackState = "idle" | "searching" | "verification-gate" | "verifying-otp" | "success" | "not-found";

function TrackMemberContent({ businessId }: { businessId: string }) {
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

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  
  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business, isLoading: isBizLoading } = useDoc<any>(businessRef);

  const configRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId, 'loyaltyConfig', 'main') : null, [firestore, businessId]);
  const { data: portalConfig } = useDoc<any>(configRef);
  
  const isAdminOrStaff = useMemo(() => {
    if (!userProfile) return false;
    const role = (userProfile?.role || '').toLowerCase();
    return (userProfile.businessId === businessId) && (['admin', 'manager', 'staff', 'accountant'].includes(role) || user?.email?.toLowerCase() === 'skillmatrix24@gmail.com');
  }, [userProfile, user, businessId]);

  useEffect(() => {
    if (mIdParam && businessId && !foundMember && state === 'idle') {
      handleAutoFetch(businessId, mIdParam);
    }
  }, [mIdParam, businessId, foundMember, state]);

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
    const input = memberIdInput.trim();
    if (!input || !businessId) return;
    setState("searching");
    
    const cleanDigits = input.replace(/\D/g, '');
    const last10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

    try {
      let snap: any = null;

      if (last10.length >= 10) {
        const possiblePhones = [last10, `91${last10}`, `+91${last10}`];
        const customersRef = collection(firestore, 'businesses', businessId, 'customers');
        
        for (const p of possiblePhones) {
          const q = query(customersRef, where('phone', '==', p), limit(1));
          const s = await getDocs(q);
          if (!s.empty) {
            const customerId = s.docs[0].id;
            const memQuery = query(
              collection(firestore, 'businesses', businessId, 'memberships'),
              where('customerId', '==', customerId),
              limit(1)
            );
            const memSnap = await getDocs(memQuery);
            if (!memSnap.empty) {
              snap = memSnap.docs[0];
              break;
            }
          }
        }
      }

      if (!snap) {
        const possibleIds = [input.toUpperCase(), `mem_c_${last10}`, `mem_c_91${last10}`];
        for (const id of possibleIds) {
          const s = await getDoc(doc(firestore, 'businesses', businessId, 'memberships', id));
          if (s.exists()) {
            snap = s;
            break;
          }
        }
      }

      if (!snap) {
        const cardQuery = query(
          collection(firestore, 'businesses', businessId, 'memberships'),
          where('cardNumber', '==', input.toUpperCase()),
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
        toast({ variant: "destructive", title: "Identity Unknown", description: "No member found in this business registry." });
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

  if (isBizLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>;
  if (!businessId) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 flex flex-col font-body text-left">
      <div id="recaptcha-container"></div>
      <TrackHeader business={business} portalConfig={portalConfig} businessId={businessId} />

      <main className="flex-1 max-w-2xl mx-auto px-4 pt-12 space-y-12 w-full">
        <div className="text-center space-y-4 animate-in fade-in duration-700">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">Identity Access</h2>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-60">Authorize your secure connection</p>
        </div>

        {state === "idle" || state === "searching" || state === "not-found" ? (
          <SearchNode 
            memberIdInput={memberIdInput} 
            setMemberIdInput={setMemberIdInput} 
            onSearch={handleSearch} 
            state={state} 
            isAdminOrStaff={isAdminOrStaff} 
          />
        ) : !confirmationResult ? (
          <IdentityGate 
            foundMember={foundMember} 
            onSendOtp={handleSendOtp} 
            onDirectAccess={() => handleSecureRedirect(foundMember.id)} 
            isAdminOrStaff={isAdminOrStaff} 
            state={state} 
            authError={authError} 
          />
        ) : (
          <OtpNode 
            otp={otp} 
            setOtp={setOtp} 
            onVerify={handleVerifyOtp} 
            onResend={handleSendOtp} 
            onBack={() => setConfirmationResult(null)} 
            isVerifying={state === 'verifying-otp'} 
            phone={foundMember?.phone} 
          />
        )}
      </main>

      <TrackFooter business={business} portalConfig={portalConfig} />
    </div>
  );
}

export default function TrackMemberPage(props: { params: Promise<{ businessId: string }> }) {
  const { businessId } = use(props.params);
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>}>
      <TrackMemberContent businessId={businessId} />
    </Suspense>
  );
}
