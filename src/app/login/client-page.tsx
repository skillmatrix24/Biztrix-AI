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
import { useAuth, useFirestore, initiateEmailSignIn, initiateGoogleSignIn, useUser, setupRecaptcha, initiatePhoneSignIn } from "@/firebase";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
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
  const [mounted, setMounted] = useState(false);
  
  // Phone Auth States
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = (params.get("email") || "").trim();
      if (emailParam) {
        setEmail((prev) => prev || emailParam);
      }
    }
  }, []);

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

    if (existingProfile && businessExists) return;

    const identifier = firebaseUser.email?.toLowerCase() || firebaseUser.phoneNumber;
    if (!identifier) return;

    const invitedQuery = query(
      collection(firestore, 'users'),
      where('email', '==', identifier),
      where('status', '==', 'pending')
    );
    const invitedSnap = await getDocs(invitedQuery);

    if (!invitedSnap.empty) {
      const invitedDoc = invitedSnap.docs[0];
      const invitedProfile = invitedDoc.data();
      const bid = invitedProfile.businessId;

      const profileData = {
        ...invitedProfile,
        id: firebaseUser.uid,
        name: firebaseUser.displayName || invitedProfile.name,
        status: 'active',
        updatedAt: serverTimestamp()
      };

      await setDoc(userDocRef, profileData, { merge: true });
      await setDoc(doc(firestore, 'businesses', bid, 'users', firebaseUser.uid), profileData, { merge: true });
      if (invitedDoc.id !== firebaseUser.uid) {
        await deleteDoc(doc(firestore, 'users', invitedDoc.id)).catch(() => {});
      }
      await deleteDoc(doc(firestore, 'businesses', bid, 'invites', identifier)).catch(() => {});
    } else {
      const tenantId = existingProfile?.businessId || `biz_${Date.now()}`;
      const trialEndDate = addDays(new Date(), 14);

      const profileData = {
        id: firebaseUser.uid,
        businessId: tenantId,
        email: firebaseUser.email?.toLowerCase() || null,
        phone: firebaseUser.phoneNumber || null,
        name: firebaseUser.displayName || "User",
        role: 'admin',
        createdAt: new Date().toISOString(),
        status: 'active',
        dashboardLayout: [
          { id: 'hero', label: 'AI Slate', enabled: true, order: 0 },
          { id: 'pulse', label: 'Daily Pulse', enabled: true, order: 1 },
          { id: 'stats', label: 'Main Stats', enabled: true, order: 2 },
          { id: 'assistant', label: 'AI Assistant', enabled: true, order: 3 },
        ]
      };

      await setDoc(doc(firestore, 'businesses', tenantId), {
        id: tenantId,
        name: `${firebaseUser.displayName || 'My'} Business`,
        ownerId: firebaseUser.uid,
        status: 'trial',
        trialStartDate: serverTimestamp(),
        trialEndDate: trialEndDate,
        createdAt: serverTimestamp(),
        activeAddonIds: []
      }, { merge: true });

      await setDoc(userDocRef, profileData, { merge: true });
      await setDoc(doc(firestore, 'businesses', tenantId, 'users', firebaseUser.uid), profileData, { merge: true });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const cred = await initiateEmailSignIn(auth, email, password);
      await provisionMissingProfile(cred.user);
      router.push("/dashboard");
    } catch (err: any) {
    console.error(err);
      setLoading(false);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setError("Invalid email or password.");
      } else {
        setError(err.message || "An error occurred during sign in.");
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
    try {
      const verifier = setupRecaptcha(auth, 'recaptcha-container');
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const result = await initiatePhoneSignIn(auth, formattedPhone, verifier);
      setConfirmationResult(result);
      setOtpSent(true);
      setTimer(60);
      toast({ title: "OTP Sent", description: "Please check your mobile for the verification code." });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not send OTP. Try again.");
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
    try {
      if (confirmationResult) {
        const cred = await confirmationResult.confirm(otp);
        await provisionMissingProfile(cred.user);
        router.push("/dashboard");
      }
    } catch (err: any) {
    console.error(err);
      setError("Invalid OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await initiateGoogleSignIn(auth);
      await provisionMissingProfile(result.user);
      router.push("/dashboard");
    } catch (err: any) {
    console.error(err);
      setLoading(false);
      if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        return;
      }
      toast({ variant: "destructive", title: "Auth Error", description: "Google login failed." });
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
                <Alert variant="destructive" className="rounded-xl border-destructive/20 bg-destructive/5 mb-6 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
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
                        <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
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
              <Link href="/signup">Create Business Account</Link>
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
