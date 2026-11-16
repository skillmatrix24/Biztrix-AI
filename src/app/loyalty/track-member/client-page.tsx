"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import {
  SearchCode,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  ArrowRight,
  MapPin,
  Mail,
  Phone,
  BadgeCheck,
  AlertCircle,
  Lock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  useAuth,
  setupRecaptcha,
  initiatePhoneSignIn,
} from "@/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfirmationResult } from "firebase/auth";

type TrackState =
  | "idle"
  | "searching"
  | "verification-gate"
  | "verifying-otp"
  | "success"
  | "not-found";

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
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const mIdParam = searchParams.get("mId");
  const bIdParam = searchParams.get("bId");

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = bIdParam || userProfile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const configRef = useMemoFirebase(
    () =>
      businessId
        ? doc(firestore, "businesses", businessId, "loyaltyConfig", "main")
        : null,
    [firestore, businessId]
  );
  const { data: portalConfig } = useDoc<any>(configRef);

  const isAdminOrStaff = useMemo(() => {
    const role = (userProfile?.role || "").toLowerCase();
    return (
      ["admin", "manager", "staff", "accountant"].includes(role) ||
      user?.email?.toLowerCase() === "skillmatrix24@gmail.com"
    );
  }, [userProfile, user]);

  useEffect(() => {
    if (mIdParam && bIdParam && !foundMember && state === "idle") {
      handleAutoFetch(bIdParam, mIdParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mIdParam, bIdParam, foundMember, state]);

  const handleAutoFetch = async (bid: string, mid: string) => {
    setState("searching");
    try {
      const docRef = doc(firestore, "businesses", bid, "memberships", mid);
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
    if (!cleanId) return;
    if (!businessId) {
      toast({
        variant: "destructive",
        title: "Store Context Required",
        description:
          "Please use your store-specific portal link or sign in first.",
      });
      return;
    }
    setState("searching");

    try {
      let snap: any = null;

      const isPhoneInput = /^\d{10}$/.test(cleanId);
      if (isPhoneInput) {
        try {
          const custQuery = query(
            collection(firestore, "businesses", businessId, "customers"),
            where("phone", "==", cleanId),
            limit(1)
          );
          const custSnap = await getDocs(custQuery);

          if (!custSnap.empty) {
            const customerId = custSnap.docs[0].id;
            const memQuery = query(
              collection(firestore, "businesses", businessId, "memberships"),
              where("customerId", "==", customerId),
              limit(1)
            );
            const memSnap = await getDocs(memQuery);
            if (!memSnap.empty) snap = memSnap.docs[0];
          }
        } catch {
          // Public customers list is restricted; fall back to mem_c_<phone> lookup
        }

        if (!snap) {
          const phoneMemSnap = await getDoc(
            doc(
              firestore,
              "businesses",
              businessId,
              "memberships",
              `mem_c_${cleanId}`
            )
          );
          if (phoneMemSnap.exists()) snap = phoneMemSnap;
        }
      }

      if (!snap) {
        const targetRef = doc(
          firestore,
          "businesses",
          businessId,
          "memberships",
          cleanId
        );
        const directSnap = await getDoc(targetRef);
        if (directSnap.exists()) snap = directSnap;
      }

      if (!snap) {
        const cardQuery = query(
          collection(firestore, "businesses", businessId, "memberships"),
          where("cardNumber", "==", cleanId),
          limit(1)
        );
        const cardSnap = await getDocs(cardQuery);
        if (!cardSnap.empty) snap = cardSnap.docs[0];
      }

      if (snap && snap.exists()) {
        const memberData = snap.data();
        setFoundMember({ ...memberData, id: snap.id });
        setState("verification-gate");
        toast({ title: "Membership Found" });
      } else {
        setState("not-found");
        toast({
          variant: "destructive",
          title: "Member Not Found",
          description: "No membership found with this ID or mobile number.",
        });
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
      const custRef = doc(
        firestore,
        "businesses",
        businessId,
        "customers",
        foundMember.customerId
      );
      const custSnap = await getDoc(custRef);
      const customer = custSnap.data();
      if (!customer?.phone) {
        toast({
          variant: "destructive",
          title: "Phone Missing",
          description: "No registered phone number found for this member.",
        });
        setState("verification-gate");
        return;
      }
      const verifier = setupRecaptcha(auth, "recaptcha-container");
      const phone = customer.phone.startsWith("+")
        ? customer.phone
        : `+91${customer.phone}`;
      const result = await initiatePhoneSignIn(auth, phone, verifier);
      setConfirmationResult(result);
      setState("verification-gate");
      toast({ title: "OTP Sent" });
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
    if (typeof window !== "undefined") {
      localStorage.setItem(`verified_session_${mId}`, Date.now().toString());
    }
    setState("success");
    router.push(`/loyalty/track/${businessId}/${mId}`);
  };

  const portalLogo = portalConfig?.logoUrl || business?.logoUrl;

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-16 overflow-x-hidden flex flex-col text-left">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 h-16 sm:h-20 flex items-center">
        <div className="max-w-6xl mx-auto px-4 w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 text-left">
            <div className="h-10 w-10 sm:h-11 sm:w-11 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
              {portalLogo ? (
                <img
                  src={portalLogo}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain p-1"
                  alt={portalConfig?.storeName || business?.name || "Store logo"}
                />
              ) : (
                <div className="h-full w-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                  {business?.name?.charAt(0) || "B"}
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm sm:text-base font-bold text-slate-900 truncate leading-tight">
                {portalConfig?.storeName || business?.name || "Member Portal"}
              </span>
              <span className="text-xs font-medium text-emerald-700 mt-0.5">
                Verified Member Lookup
              </span>
            </div>
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

      <main className="flex-1 max-w-xl mx-auto px-4 pt-10 space-y-8 w-full">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Member Portal Access
          </h1>
          <p className="text-sm text-slate-500">
            Verify your card or phone number to view points, cashback, and
            offers.
          </p>
        </div>

        <div id="recaptcha-container" />

        {state === "idle" || state === "searching" || state === "not-found" ? (
          <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-none">
            <CardHeader className="p-6 sm:p-8 text-center space-y-3 bg-slate-900 text-white border-b border-slate-800">
              <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto border border-white/15">
                {state === "searching" ? (
                  <Loader2 className="h-7 w-7 animate-spin text-white" />
                ) : (
                  <SearchCode className="h-7 w-7 text-white" />
                )}
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl sm:text-2xl font-bold">
                  Find Your Membership
                </CardTitle>
                <CardDescription className="text-slate-300 text-xs">
                  Enter your 10-digit mobile number or membership card ID
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-6">
              <form onSubmit={handleSearch} className="space-y-5 text-left">
                <div className="space-y-2">
                  <Label
                    htmlFor="lookup-member-input"
                    className="text-xs font-semibold text-slate-700 block"
                  >
                    Registered Mobile or Card ID
                  </Label>
                  <div className="flex gap-2.5">
                    <Input
                      id="lookup-member-input"
                      value={memberIdInput}
                      onChange={(e) =>
                        setMemberIdInput(e.target.value.toUpperCase())
                      }
                      placeholder="Card ID or 10-digit Mobile"
                      className="h-12 rounded-xl bg-slate-50 border-slate-200 text-base font-medium font-mono tabular-nums"
                    />
                    <Button
                      type="submit"
                      aria-label="Run member lookup"
                      disabled={state === "searching" || !memberIdInput}
                      size="icon"
                      className="h-12 w-12 rounded-xl bg-primary text-white shrink-0"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {state === "not-found" && (
                  <Alert className="bg-red-50 border-red-200 rounded-xl text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs font-medium ml-1">
                      No active member found with this mobile number or card ID.
                    </AlertDescription>
                  </Alert>
                )}

                {isAdminOrStaff && (
                  <div className="p-5 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <p className="text-xs font-bold text-slate-900">
                        Signed-in Staff Access
                      </p>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      You can pick any customer directly from the Member
                      Registry without entering a card ID.
                    </p>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full h-10 bg-white text-primary border-slate-200 font-semibold text-xs rounded-xl"
                    >
                      <Link href="/loyalty/members">
                        Open Member Registry{" "}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={state === "searching" || !memberIdInput}
                  className="w-full h-12 bg-primary text-white font-semibold text-xs rounded-xl"
                >
                  {state === "searching" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />{" "}
                      Searching...
                    </>
                  ) : (
                    "Find Membership"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : state === "verification-gate" || state === "verifying-otp" ? (
          <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-none">
            <CardHeader className="p-6 sm:p-8 bg-slate-900 text-white text-center border-b border-slate-800">
              <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4 border border-white/15">
                <Smartphone className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-xl font-bold">
                Member Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-6">
              {authError && (
                <Alert
                  variant="destructive"
                  className="rounded-xl bg-red-50 border-red-200 text-red-700"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs font-medium ml-1">
                    {authError}
                  </AlertDescription>
                </Alert>
              )}

              {!confirmationResult ? (
                <div className="text-center space-y-6 py-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">
                      Verify ownership for member{" "}
                      <span className="font-bold text-primary">
                        {foundMember?.customerName}
                      </span>
                      .
                    </p>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      Registered phone ending in ...
                      {foundMember?.phone?.slice(-4) || "XXXX"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {isAdminOrStaff && (
                      <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
                        <div className="flex items-center gap-2 justify-center text-emerald-800">
                          <BadgeCheck className="h-4 w-4 text-emerald-600" />
                          <span className="text-xs font-semibold">
                            Staff Verification Shortcut Active
                          </span>
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleSecureRedirect(foundMember.id)}
                          className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl"
                        >
                          Open Member Portal Directly
                        </Button>
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={state === "verifying-otp"}
                      className={cn(
                        "w-full h-12 font-semibold text-xs rounded-xl",
                        isAdminOrStaff
                          ? "bg-white text-primary border border-slate-200 hover:bg-slate-50"
                          : "bg-primary text-white"
                      )}
                    >
                      {state === "verifying-otp" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />{" "}
                          Sending OTP...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" /> Send Verification
                          OTP
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-4 text-center">
                    <Label
                      htmlFor="lookup-otp-input"
                      className="text-xs font-semibold text-slate-600 block"
                    >
                      Enter 6-Digit OTP
                    </Label>
                    <Input
                      id="lookup-otp-input"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      maxLength={6}
                      placeholder="000000"
                      className="h-16 text-center text-3xl sm:text-4xl font-bold font-mono tabular-nums tracking-[0.4em] rounded-xl bg-slate-50 border-slate-200"
                    />
                    <div className="flex justify-between px-1">
                      <button
                        type="button"
                        onClick={() => setConfirmationResult(null)}
                        className="text-xs font-medium text-slate-600 hover:underline"
                      >
                        Change Member
                      </button>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Resend OTP
                      </button>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otp.length < 6 || state === "verifying-otp"}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl"
                  >
                    {state === "verifying-otp" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />{" "}
                        Verifying...
                      </>
                    ) : (
                      "Verify & Enter Portal"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="py-16 text-center space-y-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-xs font-semibold">Opening Member Portal...</p>
          </div>
        )}
      </main>

      <footer className="mt-20 py-14 bg-white border-t border-slate-200 shrink-0">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 text-left">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                B
              </div>
              <span className="text-sm font-bold text-slate-900">
                Member Portal
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Official loyalty &amp; rewards portal for{" "}
              <strong>{portalConfig?.storeName || business?.name || "your store"}</strong>.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-500">Contact Us</h4>
            <div className="space-y-2.5">
              <div className="flex gap-3 items-start">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-slate-600">
                  {portalConfig?.storeAddress ||
                    business?.address ||
                    "Location pending"}
                </p>
              </div>
              <div className="flex gap-3 items-center">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs font-medium text-slate-600 font-mono tabular-nums">
                  {portalConfig?.storePhone || business?.phone || "N/A"}
                </p>
              </div>
              <div className="flex gap-3 items-center">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs font-medium text-slate-600">
                  {portalConfig?.storeEmail || business?.email || "N/A"}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-500">
              Trust &amp; Security
            </h4>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-medium text-slate-800">
                  OTP Verified Member Access
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-medium text-slate-800">
                  Isolated Store Ledger
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function TrackMemberPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <TrackMemberContent />
    </Suspense>
  );
}
