
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
  Sparkles,
  Eye,
  EyeOff,
  LayoutDashboard,
  Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useFirestore, initiateEmailSignUp, initiateGoogleSignIn, useUser } from "@/firebase";
import { doc, setDoc, getDoc, getDocs, collection, query, where, serverTimestamp } from "firebase/firestore";
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

  useEffect(() => {
    setMounted(true);
  }, []);

  const provisionUser = async (uid: string, email: string, name: string, businessName: string) => {
    const userDocRef = doc(firestore, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    const existingProfile = userSnap.exists() ? userSnap.data() : null;

    // Check if business exists
    let businessExists = false;
    if (existingProfile?.businessId) {
      const bizSnap = await getDoc(doc(firestore, 'businesses', existingProfile.businessId));
      businessExists = bizSnap.exists();
    }

    if (existingProfile && businessExists) return;

    const invitedUsersQuery = query(
      collection(firestore, 'users'), 
      where('email', '==', email.toLowerCase()),
      where('status', '==', 'pending')
    );
    const invitedSnap = await getDocs(invitedUsersQuery);

    if (!invitedSnap.empty) {
      const invitedProfile = invitedSnap.docs[0].data();
      const bid = invitedProfile.businessId;
      const profileData = {
        ...invitedProfile,
        id: uid,
        name: name || invitedProfile.name,
        status: 'active',
        updatedAt: serverTimestamp()
      };
      await setDoc(userDocRef, profileData, { merge: true });
      await setDoc(doc(firestore, 'businesses', bid, 'users', uid), profileData, { merge: true });
    } else {
      const tenantId = existingProfile?.businessId || `biz_${Date.now()}`;
      const trialEndDate = addDays(new Date(), 14);

      const profileData = {
        id: uid,
        businessId: tenantId,
        email: email.toLowerCase(),
        name: name,
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

      // 1. Root Business first to satisfy rules
      await setDoc(doc(firestore, 'businesses', tenantId), {
        id: tenantId,
        name: businessName || `${name}'s Business`,
        ownerId: uid,
        status: 'trial',
        trialStartDate: serverTimestamp(),
        trialEndDate: trialEndDate,
        createdAt: serverTimestamp(),
        activeAddonIds: []
      }, { merge: true });

      // 2. Global Profile
      await setDoc(userDocRef, profileData, { merge: true });

      // 3. Membership Link
      await setDoc(doc(firestore, 'businesses', tenantId, 'users', uid), profileData, { merge: true });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userCredential = await initiateEmailSignUp(auth, formData.email, formData.password);
      await provisionUser(userCredential.user.uid, formData.email, formData.name, formData.businessName);
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create account.");
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      const result = await initiateGoogleSignIn(auth);
      const googleUser = result.user;
      await provisionUser(
        googleUser.uid, 
        googleUser.email || "", 
        googleUser.displayName || "User", 
        formData.businessName || `${googleUser.displayName || 'My'} Business`
      );
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Auth Error", description: "Google signup failed." });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
        
        <div className="hidden md:flex md:col-span-2 flex-col space-y-8">
          <div className="space-y-4">
            <Link href="/" className="inline-flex">
              <div className="h-14 w-14 bg-primary rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl hover:scale-105 transition-transform">
                <Bot className="h-8 w-8" />
              </div>
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Scale your business on <span className="text-primary">Autopilot.</span></h1>
          </div>
          
          <div className="space-y-4">
            {[
              { icon: Zap, text: "AI-Powered Billing" },
              { icon: Sparkles, text: "Real-time P&L" },
              { icon: CheckCircle2, text: "14-Day Free Trial" }
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm font-bold text-slate-600 uppercase tracking-wider">
                <f.icon className="h-4 w-4 text-primary" /> {f.text}
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-3">
          <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
            <CardHeader className="bg-primary py-6 sm:py-8 text-center text-white">
              <CardTitle className="text-xl font-bold">Start Your Business</CardTitle>
              <CardDescription className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1">Unified Operating System</CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 pb-4">
              <form onSubmit={handleSignup} className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="rounded-xl border-destructive/20 bg-destructive/5">
                    <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name" className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="signup-name"
                        placeholder="John Doe" 
                        required 
                        className="h-11 pl-10 rounded-xl bg-muted/20 border-none shadow-inner"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-biz" className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Business Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="signup-biz"
                        placeholder="Acme Solutions" 
                        className="h-11 pl-10 rounded-xl bg-muted/20 border-none shadow-inner"
                        value={formData.businessName}
                        onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="signup-email"
                      type="email" 
                      placeholder="john@company.com" 
                      required 
                      className="h-11 pl-10 rounded-xl bg-muted/20 border-none shadow-inner"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Secure Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="signup-password"
                      type={showPassword ? "text" : "password"} 
                      placeholder="Min. 8 characters" 
                      required 
                      minLength={8}
                      className="h-11 pl-11 pr-12 rounded-xl bg-muted/20 border-none shadow-inner text-sm"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all mt-4"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <span className="flex items-center gap-2">Join Business OS <ArrowRight className="h-4 w-4" /></span>
                  )}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold">
                  <span className="bg-white px-4 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button 
                type="button"
                variant="outline" 
                onClick={handleGoogleSignup}
                disabled={loading}
                className="w-full h-12 rounded-xl border-primary/10 hover:bg-primary/5 font-bold text-xs gap-3 shadow-sm mb-4"
              >
                <GoogleIcon />
                Sign up with Gmail
              </Button>
            </CardContent>
            <CardFooter className="p-6 sm:p-8 pt-0 flex flex-col gap-4">
              <div className="flex justify-center w-full">
                <p className="text-xs text-muted-foreground">
                  Already registered? <Link href="/login" className="font-bold text-primary hover:underline uppercase tracking-tight">Sign In Here</Link>
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 w-full">
                <Button asChild variant="ghost" className="h-10 rounded-xl text-primary font-bold uppercase text-[9px] tracking-widest hover:bg-primary/5">
                  <Link href="/">
                    <Home className="mr-2 h-3.5 w-3.5" /> Home
                  </Link>
                </Button>
                {mounted && user && (
                  <Button asChild variant="ghost" className="h-10 rounded-xl text-primary font-bold uppercase text-[9px] tracking-widest hover:bg-primary/5">
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
