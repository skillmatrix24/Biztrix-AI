"use client";

import { useState, useEffect } from "react";
import { 
  Bot, 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  LayoutDashboard, 
  Home,
  Smartphone,
  CheckCircle2,
  RefreshCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useFirestore, initiateEmailSignIn, initiateGoogleSignIn, checkRedirectAuthResult, useUser, setupRecaptcha, initiatePhoneSignIn } from "@/firebase";
import { doc, getDoc, setDoc, serverTimestamp, collection, collectionGroup, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { addDays } from "date-fns";
import { ConfirmationResult } from "firebase/auth";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.1409 17.64 11.8459 17.64 9.20455Z" fill="#4285F4"/>
    <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
    <path d="M5.03591 10.71C4.85591 10.17 4.75364 9.59318 4.75364 9C4.75364 8.40682 4.85591 7.83 5.03591 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L5.03591 10.71Z" fill="#FBBC05"/>
    <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L5.03591 7.29C5.74364 5.16273 7.72773 3.57955 9 3.57955Z" fill="#EA4335"/>
  </svg>
);

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCredentialError, setIsCredentialError] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Phone Auth States
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [inviteInfo, setInviteInfo] = useState<{
    bid?: string;
    role?: string;
    email?: string;
    name?: string;
    businessName?: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = (params.get("email") || "").trim();
      const bidParam = (params.get("bid") || params.get("businessId") || "").trim();
      const roleParam = (params.get("role") || "").trim();
      const nameParam = (params.get("name") || "").trim();
      const bizParam = (params.get("business") || "").trim();
      const isInvite = params.get("invite") === "1" || Boolean(bidParam);

      if (emailParam) {
        setEmail((prev) => prev || emailParam);
      }

      if (isInvite || bidParam) {
        const payload = {
          bid: bidParam,
          role: roleParam || "Staff",
          email: emailParam,
          name: nameParam,
          businessName: bizParam,
        };
        setInviteInfo(payload);
        try {
          localStorage.setItem("biztrix_pending_invite", JSON.stringify(payload));
          sessionStorage.setItem("biztrix_pending_invite", JSON.stringify(payload));
        } catch (_) {}
      } else {
        try {
          const rawStored = localStorage.getItem("biztrix_pending_invite") || sessionStorage.getItem("biztrix_pending_invite");
          if (rawStored) {
            const parsed = JSON.parse(rawStored);
            if (parsed?.bid) {
              setInviteInfo(parsed);
              if (parsed.email) setEmail((prev) => prev || parsed.email);
            }
          }
        } catch (_) {}
      }
    }

    // Handle Google redirect auth return
    if (auth) {
      checkRedirectAuthResult(auth).then(async (result) => {
        if (result && result.user) {
          setLoading(true);
          await provisionMissingProfile(result.user);
          router.push("/dashboard");
        }
      }).catch((redirectErr) => {
        console.warn("Redirect sign-in notice:", redirectErr);
      });
    }
  }, [auth]);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const provisionMissingProfile = async (firebaseUser: any) => {
    const userDocRef = doc(firestore, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userDocRef);
    const existingProfile = userSnap.exists() ? userSnap.data() : null;

    let businessExists = false;
    if (existingProfile?.businessId) {
      const bizSnap = await getDoc(doc(firestore, 'businesses', existingProfile.businessId));
      businessExists = bizSnap.exists();
    }

    const identifier = (firebaseUser.email || '').toLowerCase().trim() || firebaseUser.phoneNumber;
    if (!identifier) return;

    let invitedProfile: any = null;
    let bid: string | null = null;
    let invitedDocId: string | null = null;

    // Check URL parameters & local storage for explicit workspace invite target
    let targetBidFromUrl = '';
    let targetRoleFromUrl = '';
    let targetBizNameFromUrl = '';
    let targetNameFromUrl = '';

    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      targetBidFromUrl = (p.get('bid') || p.get('businessId') || '').trim();
      targetRoleFromUrl = (p.get('role') || '').trim();
      targetBizNameFromUrl = (p.get('business') || '').trim();
      targetNameFromUrl = (p.get('name') || '').trim();

      if (!targetBidFromUrl) {
        try {
          const rawStored = localStorage.getItem('biztrix_pending_invite') || sessionStorage.getItem('biztrix_pending_invite');
          if (rawStored) {
            const parsed = JSON.parse(rawStored);
            if (parsed?.bid) {
              targetBidFromUrl = parsed.bid;
              targetRoleFromUrl = parsed.role || targetRoleFromUrl;
              targetBizNameFromUrl = parsed.businessName || targetBizNameFromUrl;
              targetNameFromUrl = parsed.name || targetNameFromUrl;
            }
          }
        } catch (_) {}
      }
    }

    // 1. Direct root invite registry lookup: /invites/{identifier}
    try {
      const rootInvRef = doc(firestore, 'invites', identifier);
      const rootInvSnap = await getDoc(rootInvRef);
      if (rootInvSnap.exists()) {
        const invData = rootInvSnap.data();
        bid = invData.businessId;
        invitedProfile = {
          businessId: bid,
          businessName: invData.businessName || targetBizNameFromUrl || 'Workspace',
          name: invData.name || targetNameFromUrl || firebaseUser.displayName || 'Team Member',
          role: invData.role || targetRoleFromUrl || 'Staff',
          email: identifier,
          phone: invData.phone || firebaseUser.phoneNumber || null,
        };
      }
    } catch (rErr) {
      console.warn('Root invite lookup notice:', rErr);
    }

    // 2. Direct check on targetBidFromUrl
    if (!invitedProfile && targetBidFromUrl) {
      try {
        const invRef = doc(firestore, 'businesses', targetBidFromUrl, 'invites', identifier);
        const invSnap = await getDoc(invRef);
        if (invSnap.exists()) {
          const invData = invSnap.data();
          bid = targetBidFromUrl;
          invitedProfile = {
            businessId: targetBidFromUrl,
            businessName: invData.businessName || targetBizNameFromUrl || 'Workspace',
            name: invData.name || targetNameFromUrl || firebaseUser.displayName || 'Team Member',
            role: invData.role || targetRoleFromUrl || 'Staff',
            email: identifier,
            phone: invData.phone || firebaseUser.phoneNumber || null,
          };
        } else {
          const bSnap = await getDoc(doc(firestore, 'businesses', targetBidFromUrl));
          if (bSnap.exists()) {
            bid = targetBidFromUrl;
            invitedProfile = {
              businessId: targetBidFromUrl,
              businessName: bSnap.data()?.name || targetBizNameFromUrl || 'Workspace',
              name: targetNameFromUrl || firebaseUser.displayName || 'Team Member',
              role: targetRoleFromUrl || 'Staff',
              email: identifier,
              phone: firebaseUser.phoneNumber || null,
            };
          }
        }
      } catch (dErr) {
        console.warn('Login direct workspace lookup notice:', dErr);
      }
    }

    // 2. Query users collection for pending profile
    if (!invitedProfile) {
      try {
        const invitedQuery = query(
          collection(firestore, 'users'),
          where('email', '==', identifier)
        );
        const invitedSnap = await getDocs(invitedQuery);
        const pendingDoc = invitedSnap.docs.find(
          (d) => d.data().status === 'pending' || (d.id !== firebaseUser.uid && d.data().businessId)
        );
        if (pendingDoc) {
          invitedDocId = pendingDoc.id;
          const pData = pendingDoc.data();
          bid = pData.businessId;
          invitedProfile = {
            ...pData,
            role: pData.role || 'Staff',
            email: identifier,
          };
        }
      } catch (uErr) {
        console.warn('Pending user lookup notice:', uErr);
      }
    }

    // 3. Scan businesses for matching invite marker
    if (!invitedProfile) {
      try {
        const bizListSnap = await getDocs(collection(firestore, 'businesses'));
        for (const b of bizListSnap.docs) {
          try {
            const invSnap = await getDoc(doc(firestore, 'businesses', b.id, 'invites', identifier));
            if (invSnap.exists()) {
              const invData = invSnap.data();
              bid = b.id;
              invitedProfile = {
                businessId: b.id,
                businessName: invData.businessName || b.data()?.name || 'Workspace',
                name: invData.name || firebaseUser.displayName || 'Team Member',
                role: invData.role || 'Staff',
                email: identifier,
                phone: invData.phone || firebaseUser.phoneNumber || null,
              };
              break;
            }
          } catch (_) {}
        }
      } catch (bErr) {
        console.warn('Businesses invite scan notice:', bErr);
      }
    }

    // 4. Fallback to collectionGroup('invites')
    if (!invitedProfile) {
      try {
        const groupQuery = query(
          collectionGroup(firestore, 'invites'),
          where('email', '==', identifier)
        );
        const groupSnap = await getDocs(groupQuery);
        if (!groupSnap.empty) {
          const invDoc = groupSnap.docs[0];
          const invData = invDoc.data();
          bid = invData.businessId;
          invitedProfile = {
            businessId: bid,
            businessName: invData.businessName || 'Workspace',
            name: invData.name || firebaseUser.displayName || 'Team Member',
            role: invData.role || 'Staff',
            email: identifier,
            phone: invData.phone || firebaseUser.phoneNumber || null,
          };
        }
      } catch (gErr) {
        console.warn('Group invites lookup notice:', gErr);
      }
    }

    // If an invite was found, attach or re-link member to the inviting business
    if (invitedProfile && bid) {
      const assignedRole = invitedProfile.role || 'Staff';
      const profileData = {
        ...invitedProfile,
        id: firebaseUser.uid,
        name: firebaseUser.displayName || invitedProfile.name || 'Team Member',
        email: identifier,
        phone: firebaseUser.phoneNumber || invitedProfile.phone || null,
        businessId: bid,
        businessName: invitedProfile.businessName || 'Workspace',
        role: assignedRole,
        status: 'active',
        claimedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(userDocRef, profileData, { merge: true });
      await setDoc(doc(firestore, 'businesses', bid, 'users', firebaseUser.uid), profileData, { merge: true });
      if (invitedDocId && invitedDocId !== firebaseUser.uid) {
        await deleteDoc(doc(firestore, 'users', invitedDocId)).catch(() => {});
      }
      await setDoc(
        doc(firestore, 'businesses', bid, 'invites', identifier),
        {
          status: 'claimed',
          claimedBy: firebaseUser.uid,
          claimedAt: serverTimestamp(),
          role: assignedRole,
        },
        { merge: true }
      ).catch(() => {});
      await setDoc(
        doc(firestore, 'invites', identifier),
        {
          status: 'claimed',
          claimedBy: firebaseUser.uid,
          claimedAt: serverTimestamp(),
          role: assignedRole,
        },
        { merge: true }
      ).catch(() => {});

      try {
        localStorage.removeItem('biztrix_pending_invite');
        sessionStorage.removeItem('biztrix_pending_invite');
      } catch (_) {}

      return;
    }

    // If already has an existing valid business profile and no invite was found, keep as-is
    if (existingProfile && businessExists && !targetBidFromUrl) return;

    // If an explicit invite workspace was targeted, bind to that workspace with assigned role
    if (targetBidFromUrl) {
      const assignedRole = targetRoleFromUrl || 'Staff';
      const profileData = {
        id: firebaseUser.uid,
        businessId: targetBidFromUrl,
        businessName: targetBizNameFromUrl || 'Workspace',
        email: identifier,
        phone: firebaseUser.phoneNumber || null,
        name: firebaseUser.displayName || targetNameFromUrl || 'Team Member',
        role: assignedRole,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userDocRef, profileData, { merge: true });
      await setDoc(doc(firestore, 'businesses', targetBidFromUrl, 'users', firebaseUser.uid), profileData, { merge: true });
      try {
        localStorage.removeItem('biztrix_pending_invite');
        sessionStorage.removeItem('biztrix_pending_invite');
      } catch (_) {}
      return;
    }

    // Standard new individual business creation (only when no invite was ever targeted)
    const tenantId = existingProfile?.businessId || `biz_${Date.now()}`;
    const trialEndDate = addDays(new Date(), 14);

    const profileData = {
      id: firebaseUser.uid,
      businessId: tenantId,
      email: firebaseUser.email?.toLowerCase() || null,
      phone: firebaseUser.phoneNumber || null,
      name: firebaseUser.displayName || 'User',
      role: 'admin',
      createdAt: new Date().toISOString(),
      status: 'active',
      dashboardLayout: [
        { id: 'hero', label: 'AI Slate', enabled: true, order: 0 },
        { id: 'pulse', label: 'Daily Pulse', enabled: true, order: 1 },
        { id: 'stats', label: 'Main Stats', enabled: true, order: 2 },
        { id: 'assistant', label: 'AI Assistant', enabled: true, order: 3 },
      ],
    };

    await setDoc(
      doc(firestore, 'businesses', tenantId),
      {
        id: tenantId,
        name: `${firebaseUser.displayName || 'My'} Business`,
        ownerId: firebaseUser.uid,
        status: 'trial',
        trialStartDate: serverTimestamp(),
        trialEndDate: trialEndDate,
        createdAt: serverTimestamp(),
        activeAddonIds: [],
      },
      { merge: true }
    );

    await setDoc(userDocRef, profileData, { merge: true });
    await setDoc(doc(firestore, 'businesses', tenantId, 'users', firebaseUser.uid), profileData, { merge: true });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setIsCredentialError(false);

    try {
      const cred = await initiateEmailSignIn(auth, email, password);
      await provisionMissingProfile(cred.user);
      router.push("/dashboard");
    } catch (err: any) {
      console.warn("Sign-in attempt notice:", err?.code || err?.message);
      setLoading(false);
      const errCode = err?.code;
      if (
        errCode === "auth/invalid-credential" ||
        errCode === "auth/user-not-found" ||
        errCode === "auth/wrong-password"
      ) {
        setIsCredentialError(true);
        setError("Invalid email or password. If you received a team invitation, please create your account or use 'Sign in with Google' with your invited email.");
      } else if (errCode === "auth/too-many-requests") {
        setError("Access temporarily blocked due to multiple attempts. Please wait a few minutes or reset your password.");
      } else if (errCode === "auth/user-disabled") {
        setError("This account has been disabled. Please contact your workspace administrator.");
      } else if (errCode === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError(err?.message || "An error occurred during sign in.");
      }
    }
  };

  const handleRequestOtp = async () => {
    if (!phone || phone.length < 10) {
      toast({ variant: "destructive", title: "Invalid Number", description: "Please enter a valid 10-digit mobile number." });
      return;
    }
    
    setLoading(true);
    setError(null);
    setIsCredentialError(false);
    try {
      const verifier = setupRecaptcha(auth, 'recaptcha-container');
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const result = await initiatePhoneSignIn(auth, formattedPhone, verifier);
      setConfirmationResult(result);
      setOtpSent(true);
      setTimer(60);
      toast({ title: "OTP Sent", description: "Please check your mobile for the verification code." });
    } catch (err: any) {
      console.warn("Phone OTP request notice:", err?.code || err?.message);
      setError(err?.message || "Could not send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast({ variant: "destructive", title: "Invalid OTP", description: "Please enter the 6-digit code." });
      return;
    }

    setLoading(true);
    setIsCredentialError(false);
    try {
      if (confirmationResult) {
        const cred = await confirmationResult.confirm(otp);
        await provisionMissingProfile(cred.user);
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.warn("Phone OTP verification notice:", err?.code || err?.message);
      setError("Invalid OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await initiateGoogleSignIn(auth);
      if (!result) {
        // Redirect flow started or handled
        return;
      }
      await provisionMissingProfile(result.user);
      router.push("/dashboard");
    } catch (err: any) {
      console.warn("Google login notification:", err?.code || err?.message);
      setLoading(false);
      if (err?.code === 'auth/cancelled-popup-request' || err?.code === 'auth/popup-closed-by-user') {
        return;
      }
      if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked') || err?.message?.includes('_open')) {
        setError("Browser popup block hai. Kripya browser me popups allow karein ya Email / Mobile OTP se login karein.");
        toast({
          variant: "destructive",
          title: "Popup Blocked",
          description: "Google popup was blocked. Please allow popups or use Email / Phone OTP.",
        });
        return;
      }
      setError(err?.message || "Google sign in failed. Please try again or use Email / Phone.");
      toast({ variant: "destructive", title: "Auth Error", description: "Google login failed. Try email or phone." });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col items-center justify-center p-4">
      <div id="recaptcha-container"></div>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-105">
              <Bot className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">Biztrix AI</span>
          </Link>
          <h1 className="text-xl font-semibold text-slate-900 mt-4 tracking-tight">Workspace Sign In</h1>
          <p className="text-sm text-slate-500">Sign in to access your business workspace.</p>
        </div>

        {inviteInfo && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-950 space-y-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Team Workspace Invitation</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              You are invited to join <strong className="font-semibold text-emerald-950">{inviteInfo.businessName || "Workspace"}</strong> as <strong className="font-semibold text-emerald-950">{inviteInfo.role || "Staff"}</strong>.
            </p>
            <div className="text-[11px] text-emerald-700 bg-white/70 border border-emerald-200/60 rounded-xl p-2.5 flex items-center justify-between gap-2">
              <span>First time joining? Create password:</span>
              <Link
                href={
                  typeof window !== "undefined" && window.location.search
                    ? `/signup${window.location.search}`
                    : `/signup?invite=1&email=${encodeURIComponent(inviteInfo.email || email)}&bid=${encodeURIComponent(inviteInfo.bid || "")}&role=${encodeURIComponent(inviteInfo.role || "Staff")}&business=${encodeURIComponent(inviteInfo.businessName || "")}`
                }
                className="font-semibold text-emerald-800 hover:text-emerald-950 underline shrink-0 inline-flex items-center gap-1"
              >
                Accept Invite <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}

        <Card className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-none">
          <Tabs defaultValue="email" className="w-full">
            <CardHeader className="bg-slate-50/80 border-b border-slate-200 p-3">
              <TabsList className="grid w-full grid-cols-2 bg-slate-200/60 p-1 rounded-xl h-11">
                <TabsTrigger value="email" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg text-xs font-semibold h-9">
                  <Mail className="w-3.5 h-3.5 mr-2" /> Email
                </TabsTrigger>
                <TabsTrigger value="phone" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg text-xs font-semibold h-9">
                  <Smartphone className="w-3.5 h-3.5 mr-2" /> Phone
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              {error && (
                <Alert variant="destructive" className="rounded-xl border-destructive/20 bg-destructive/5 mb-6 animate-in fade-in slide-in-from-top-2 flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <AlertDescription className="text-xs font-medium leading-relaxed">{error}</AlertDescription>
                    {isCredentialError && (
                      <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-destructive/15">
                        <Link 
                          href={
                            typeof window !== "undefined" && window.location.search
                              ? `/signup${window.location.search}`
                              : email
                                ? `/signup?email=${encodeURIComponent(email)}&invite=1${inviteInfo?.bid ? `&bid=${encodeURIComponent(inviteInfo.bid)}&role=${encodeURIComponent(inviteInfo.role || 'Staff')}` : ''}`
                                : "/signup"
                          }
                          className="inline-flex items-center text-[11px] font-semibold text-primary hover:underline gap-1"
                        >
                          <ArrowRight className="h-3 w-3" /> Set up password / Accept invite
                        </Link>
                        <span className="text-slate-300">·</span>
                        <Link 
                          href={email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password"}
                          className="inline-flex items-center text-[11px] font-semibold text-slate-600 hover:text-slate-900 gap-1"
                        >
                          Forgot password?
                        </Link>
                      </div>
                    )}
                  </div>
                </Alert>
              )}

              <TabsContent value="email" className="m-0">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="name@company.com" 
                          required 
                          className="h-11 pl-10 rounded-xl bg-white border-slate-200 text-sm"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-xs font-semibold text-slate-700">Password</Label>
                        <Link 
                          href={email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password"} 
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                          id="password" 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          required 
                          className="h-11 pl-10 pr-11 rounded-xl bg-white border-slate-200 text-sm"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button 
                          type="button"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm transition-colors"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      <span className="flex items-center gap-2">Sign In <ArrowRight className="h-4 w-4" /></span>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="phone" className="m-0">
                <div className="space-y-5">
                  {!otpSent ? (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">Mobile Number</Label>
                        <div className="relative">
                          <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm font-mono font-semibold text-slate-500">+91</span>
                          <Input 
                            id="phone" 
                            type="tel" 
                            placeholder="9876543210" 
                            maxLength={10}
                            className="h-11 pl-20 rounded-xl bg-white border-slate-200 text-sm font-mono tabular-nums tracking-wide"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={handleRequestOtp}
                        disabled={loading || phone.length < 10}
                        className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm transition-colors"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Verification Code"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in zoom-in-95">
                      <div className="space-y-2 text-center">
                        <Label htmlFor="otp" className="text-xs font-semibold text-slate-700">Enter 6-Digit OTP</Label>
                        <Input 
                          id="otp" 
                          type="text" 
                          placeholder="000000" 
                          maxLength={6}
                          className="h-12 rounded-xl bg-white border-slate-200 text-xl font-mono font-bold text-center tracking-[0.4em] focus:ring-primary"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        />
                        <div className="flex items-center justify-between px-1">
                          <p className="text-xs text-slate-500 font-mono tabular-nums">Sent to +91 {phone}</p>
                          <button 
                            type="button"
                            disabled={timer > 0 || loading}
                            onClick={handleRequestOtp}
                            className="text-xs font-semibold text-primary hover:underline disabled:opacity-40"
                          >
                            {timer > 0 ? `Resend in ${timer}s` : "Resend Code"}
                          </button>
                        </div>
                      </div>
                      <Button 
                        onClick={handleVerifyOtp}
                        disabled={loading || otp.length !== 6}
                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                          <span className="flex items-center gap-2">Verify & Sign In <CheckCircle2 className="h-4 w-4" /></span>
                        )}
                      </Button>
                      <button 
                        type="button"
                        onClick={() => { setOtpSent(false); setOtp(""); }}
                        className="w-full text-xs font-medium text-slate-500 flex items-center justify-center gap-1.5 hover:text-slate-900 transition-colors"
                      >
                        <RefreshCcw className="w-3.5 h-3.5" /> Change Number
                      </button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs font-medium">
                  <span className="bg-white px-3 text-slate-400">or continue with</span>
                </div>
              </div>

              <Button 
                type="button"
                variant="outline" 
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full h-11 rounded-xl border-slate-200 hover:bg-slate-50 font-semibold text-xs gap-2.5 text-slate-800"
              >
                <GoogleIcon />
                Sign in with Google
              </Button>
            </CardContent>
          </Tabs>
          <CardFooter className="p-6 sm:p-8 pt-0 flex flex-col gap-3">
            <div className="flex items-center gap-3 w-full">
              <Separator className="flex-1" />
              <span className="text-xs font-medium text-slate-400">New here?</span>
              <Separator className="flex-1" />
            </div>
            <Button asChild variant="outline" className="w-full h-11 rounded-xl border-slate-200 text-slate-800 hover:bg-slate-50 font-semibold text-xs">
              <Link
                href={
                  typeof window !== "undefined" && window.location.search
                    ? `/signup${window.location.search}`
                    : email
                      ? `/signup?email=${encodeURIComponent(email)}`
                      : "/signup"
                }
              >
                Create Business Account / Accept Invite
              </Link>
            </Button>

            <div className={mounted && user ? "grid grid-cols-2 gap-3 w-full" : "flex justify-center w-full"}>
              <Button asChild variant="ghost" className="h-9 rounded-xl text-slate-600 font-medium text-xs hover:bg-slate-100 hover:text-slate-900">
                <Link href="/">
                  <Home className="mr-2 h-3.5 w-3.5" /> Back to Home
                </Link>
              </Button>
              {mounted && user && (
                <Button asChild variant="ghost" className="h-9 rounded-xl text-primary font-medium text-xs hover:bg-primary/5">
                  <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 h-3.5 w-3.5" /> Dashboard
                  </Link>
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>

        <div className="text-center">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Bank-grade 256-bit SSL Encryption
          </p>
        </div>
      </div>
    </div>
  );
}
