"use client";

import { useState, useEffect } from "react";
import {
  Bot,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  User,
  Building2,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Eye,
  EyeOff,
  LayoutDashboard,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useAuth,
  useFirestore,
  initiateEmailSignUp,
  initiateGoogleSignIn,
  checkRedirectAuthResult,
  useUser,
} from "@/firebase";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { addDays } from "date-fns";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.1409 17.64 11.8459 17.64 9.20455Z" fill="#4285F4"/>
    <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
    <path d="M5.03591 10.71C4.85591 10.17 4.75364 9.59318 4.75364 9C4.75364 8.40682 4.85591 7.83 5.03591 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L5.03591 10.71Z" fill="#FBBC05"/>
    <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L5.03591 7.29C5.74364 5.16273 7.72773 3.57955 9 3.57955Z" fill="#EA4335"/>
  </svg>
);

export default function SignupPage() {
  const auth = useAuth();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    businessName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isInviteFlow, setIsInviteFlow] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const inviteFlag = params.get("invite") === "1";
      const emailParam = (params.get("email") || "").trim();
      const nameParam = (params.get("name") || "").trim();
      const bizParam = (params.get("business") || "").trim();
      if (inviteFlag || emailParam || nameParam || bizParam) {
        setIsInviteFlow(inviteFlag || Boolean(emailParam));
        setFormData((prev) => ({
          ...prev,
          email: emailParam || prev.email,
          name: nameParam || prev.name,
          businessName: bizParam || prev.businessName,
        }));
      }
    }

    if (auth) {
      checkRedirectAuthResult(auth).then(async (result) => {
        if (result && result.user) {
          setLoading(true);
          const googleUser = result.user;
          await provisionUser(
            googleUser.uid,
            googleUser.email || "",
            googleUser.displayName || "User",
            formData.businessName || `${googleUser.displayName || "My"} Business`
          );
          router.push("/dashboard");
        }
      }).catch((redirectErr) => {
        console.warn("Redirect sign-up notice:", redirectErr);
      });
    }
  }, [auth]);

  const provisionUser = async (
    uid: string,
    email: string,
    name: string,
    businessName: string
  ) => {
    const userDocRef = doc(firestore, "users", uid);
    const userSnap = await getDoc(userDocRef);
    const existingProfile = userSnap.exists() ? userSnap.data() : null;

    let businessExists = false;
    if (existingProfile?.businessId) {
      const bizSnap = await getDoc(
        doc(firestore, "businesses", existingProfile.businessId)
      );
      businessExists = bizSnap.exists();
    }

    if (existingProfile && businessExists) return;

    const invitedUsersQuery = query(
      collection(firestore, "users"),
      where("email", "==", email.toLowerCase()),
      where("status", "==", "pending")
    );
    const invitedSnap = await getDocs(invitedUsersQuery);

    if (!invitedSnap.empty) {
      const invitedDoc = invitedSnap.docs[0];
      const invitedProfile = invitedDoc.data();
      const bid = invitedProfile.businessId;
      const profileData = {
        ...invitedProfile,
        id: uid,
        name: name || invitedProfile.name,
        status: "active",
        updatedAt: serverTimestamp(),
      };
      await setDoc(userDocRef, profileData, { merge: true });
      await setDoc(
        doc(firestore, "businesses", bid, "users", uid),
        profileData,
        { merge: true }
      );
      if (invitedDoc.id !== uid) {
        await deleteDoc(doc(firestore, "users", invitedDoc.id)).catch(() => {});
      }
      await deleteDoc(
        doc(firestore, "businesses", bid, "invites", email.toLowerCase())
      ).catch(() => {});
    } else {
      const tenantId = existingProfile?.businessId || `biz_${Date.now()}`;
      const trialEndDate = addDays(new Date(), 14);

      const profileData = {
        id: uid,
        businessId: tenantId,
        email: email.toLowerCase(),
        name: name,
        role: "admin",
        createdAt: new Date().toISOString(),
        status: "active",
        dashboardLayout: [
          { id: "hero", label: "AI Slate", enabled: true, order: 0 },
          { id: "pulse", label: "Daily Pulse", enabled: true, order: 1 },
          { id: "stats", label: "Main Stats", enabled: true, order: 2 },
          { id: "assistant", label: "AI Assistant", enabled: true, order: 3 },
        ],
      };

      await setDoc(
        doc(firestore, "businesses", tenantId),
        {
          id: tenantId,
          name: businessName || `${name}'s Business`,
          ownerId: uid,
          status: "trial",
          trialStartDate: serverTimestamp(),
          trialEndDate: trialEndDate,
          createdAt: serverTimestamp(),
          activeAddonIds: [],
        },
        { merge: true }
      );

      await setDoc(userDocRef, profileData, { merge: true });
      await setDoc(
        doc(firestore, "businesses", tenantId, "users", uid),
        profileData,
        { merge: true }
      );
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userCredential = await initiateEmailSignUp(
        auth,
        formData.email,
        formData.password
      );
      await provisionUser(
        userCredential.user.uid,
        formData.email,
        formData.name,
        formData.businessName
      );
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create account.");
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await initiateGoogleSignIn(auth);
      if (!result) {
        // Redirect flow in progress
        return;
      }
      const googleUser = result.user;
      await provisionUser(
        googleUser.uid,
        googleUser.email || "",
        googleUser.displayName || "User",
        formData.businessName || `${googleUser.displayName || "My"} Business`
      );
      router.push("/dashboard");
    } catch (err: any) {
      console.warn("Google signup notification:", err?.code || err?.message);
      setLoading(false);
      if (
        err.code === "auth/cancelled-popup-request" ||
        err.code === "auth/popup-closed-by-user"
      ) {
        return;
      }
      if (err.code === "auth/popup-blocked" || err?.message?.includes("popup-blocked") || err?.message?.includes("_open")) {
        setError("Browser popup block hai. Kripya browser me popups allow karein ya email/password se create karein.");
        toast({
          variant: "destructive",
          title: "Popup Blocked",
          description: "Google popup was blocked. Please allow popups or use email & password.",
        });
        return;
      }
      setError(err?.message || "Google signup failed. Please try email & password.");
      toast({
        variant: "destructive",
        title: "Auth Error",
        description: err?.message || "Google signup failed.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Editorial Brand Column */}
        <div className="hidden md:flex md:col-span-5 flex-col space-y-6 text-left">
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-105">
                <Bot className="h-5 w-5" />
              </div>
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                Biztrix AI
              </span>
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight text-balance">
              Run your entire business from one clear workspace.
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Billing, GST reporting, inventory control, leads, and customer support ready out of the box.
            </p>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-200">
            {[
              { icon: Zap, text: "Fast POS billing & GST invoices" },
              { icon: CheckCircle2, text: "14-day free trial on all modules" },
              { icon: ShieldCheck, text: "Isolated multi-tenant cloud workspace" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <f.icon className="h-4 w-4 text-slate-900" />
                </div>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Form Card */}
        <div className="md:col-span-7 w-full">
          <div className="md:hidden text-center space-y-2 mb-6">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                <Bot className="h-5 w-5" />
              </div>
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                Biztrix AI
              </span>
            </Link>
            <h1 className="text-xl font-semibold text-slate-900 mt-3 tracking-tight">
              Create Business Account
            </h1>
            <p className="text-sm text-slate-500">
              Launch your workspace in under a minute.
            </p>
          </div>

          <Card className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-none">
            <CardHeader className="bg-slate-900 text-white p-6 text-left">
              <h2 className="text-lg font-bold tracking-tight">
                {isInviteFlow ? "Accept Workspace Invitation" : "Start Your Business"}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {isInviteFlow
                  ? `Set your password or sign in with Google to join ${formData.businessName || "your team workspace"}`
                  : "Core Business OS is free forever · Pro modules include a 14-day trial"}
              </p>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 pb-4">
              <form onSubmit={handleSignup} className="space-y-4">
                {error && (
                  <Alert
                    variant="destructive"
                    className="rounded-xl border-rose-200 bg-rose-50 text-rose-900"
                  >
                    <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <Label htmlFor="signup-name" className="text-xs font-semibold text-slate-700">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="signup-name"
                        placeholder="John Doe"
                        required
                        className="h-11 pl-10 rounded-xl bg-white border-slate-200 text-sm"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <Label htmlFor="signup-biz" className="text-xs font-semibold text-slate-700">
                      Business Name
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="signup-biz"
                        placeholder="Acme Solutions"
                        className="h-11 pl-10 rounded-xl bg-white border-slate-200 text-sm"
                        value={formData.businessName}
                        onChange={(e) =>
                          setFormData({ ...formData, businessName: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <Label htmlFor="signup-email" className="text-xs font-semibold text-slate-700">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="john@company.com"
                      required
                      className="h-11 pl-10 rounded-xl bg-white border-slate-200 text-sm"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <Label htmlFor="signup-password" className="text-xs font-semibold text-slate-700">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 8 characters"
                      required
                      minLength={8}
                      className="h-11 pl-10 pr-11 rounded-xl bg-white border-slate-200 text-sm"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm transition-colors mt-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      {isInviteFlow ? "Accept Invite & Join" : "Create Workspace"}{" "}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>

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
                onClick={handleGoogleSignup}
                disabled={loading}
                className="w-full h-11 rounded-xl border-slate-200 hover:bg-slate-50 font-semibold text-xs gap-2.5 text-slate-800"
              >
                <GoogleIcon />
                Sign up with Google
              </Button>
            </CardContent>

            <CardFooter className="p-6 sm:p-8 pt-2 flex flex-col gap-3">
              <p className="text-xs text-slate-500 text-center">
                Already have an account?{" "}
                <Link
                  href={
                    formData.email
                      ? `/login?email=${encodeURIComponent(formData.email)}`
                      : "/login"
                  }
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </Link>
              </p>

              <div
                className={
                  mounted && user
                    ? "grid grid-cols-2 gap-3 w-full"
                    : "flex justify-center w-full"
                }
              >
                <Button
                  asChild
                  variant="ghost"
                  className="h-9 rounded-xl text-slate-600 font-medium text-xs hover:bg-slate-100 hover:text-slate-900"
                >
                  <Link href="/">
                    <Home className="mr-2 h-3.5 w-3.5" /> Back to Home
                  </Link>
                </Button>
                {mounted && user && (
                  <Button
                    asChild
                    variant="ghost"
                    className="h-9 rounded-xl text-primary font-medium text-xs hover:bg-primary/5"
                  >
                    <Link href="/dashboard">
                      <LayoutDashboard className="mr-2 h-3.5 w-3.5" /> Dashboard
                    </Link>
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
