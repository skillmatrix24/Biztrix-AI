
"use client";

import { useState, useEffect } from "react";
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Building2, 
  Calendar, 
  Lock, 
  Save, 
  Loader2, 
  UserCircle,
  KeyRound,
  IdCard,
  LogOut,
  BadgeCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  useFirestore, 
  useUser, 
  useDoc, 
  useMemoFirebase, 
  updateDocumentNonBlocking, 
  initiatePasswordReset,
  useAuth,
  initiateSignOut
} from "@/firebase";
import { doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export default function UserProfilePage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  // Load Firestore User Profile - Only when Auth is ready
  const userProfileRef = useMemoFirebase(() => 
    !isUserLoading && user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid, isUserLoading]);
  const { data: profile, isLoading: isDocLoading } = useDoc<any>(userProfileRef);

  // Load Business Context
  const businessRef = useMemoFirebase(() => 
    profile?.businessId ? doc(firestore, 'businesses', profile.businessId) : null
  , [firestore, profile?.businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile]);

  const handleUpdateProfile = () => {
    if (!userProfileRef || !name.trim()) return;
    setIsSaving(true);
    updateDocumentNonBlocking(userProfileRef, { name: name.trim() });
    setTimeout(() => {
      setIsSaving(false);
      toast({ title: "Profile Updated", description: "Your changes have been saved." });
    }, 500);
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    try {
      await initiatePasswordReset(auth, user.email);
      toast({ title: "Email Sent", description: "Password reset link sent to your email." });
    } catch (e: any) {
    console.error(e);
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleLogout = () => {
    initiateSignOut(auth).then(() => router.push('/login'));
  };

  // Wait for both Auth and Doc to load to prevent permission glitches
  if (isUserLoading || isDocLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Loading Profile...</p>
      </div>
    );
  }

  const initials = profile?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || user?.email?.[0].toUpperCase() || 'U';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      {/* 1. Profile Header Hero */}
      <div className="relative h-40 rounded-[2.5rem] bg-slate-900 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <UserCircle className="h-48 w-48 text-white" />
        </div>
        <div className="absolute -bottom-16 left-10 flex items-end gap-6">
          <Avatar className="h-32 w-32 rounded-[2rem] border-8 border-background shadow-xl">
            <AvatarFallback className="bg-primary text-white text-4xl font-black">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="mb-4 space-y-1">
            <h1 className="text-2xl font-bold text-white md:text-slate-900 md:dark:text-white drop-shadow-sm md:drop-shadow-none">
              {profile?.name || "User Name"}
            </h1>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-500 text-white border-none uppercase text-[9px] font-bold px-2 h-4">
                {isDocLoading ? "Resolving..." : (profile?.role || "ADMIN")}
              </Badge>
              <span className="text-xs text-white/60 md:text-muted-foreground font-medium">
                Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'recently'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-12 grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left: Main Form */}
        <div className="md:col-span-8 space-y-6">
          <Card className="border-none shadow-md rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border">
            <CardHeader className="bg-muted/30 border-b py-5">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <IdCard className="h-4 w-4" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      className="h-12 pl-10 rounded-xl bg-muted/20 border-none shadow-inner text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 opacity-70">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Email Address (Primary Identity)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      disabled 
                      value={user?.email || ""} 
                      className="h-12 pl-10 rounded-xl bg-muted/40 border-none shadow-none text-sm"
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleUpdateProfile} 
                disabled={isSaving}
                className="w-full h-12 bg-primary hover:bg-primary/90 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-xl"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save Profile Changes</>}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border">
            <CardHeader className="bg-muted/30 border-b py-5">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <KeyRound className="h-4 w-4" /> Security & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-muted/20 rounded-2xl border border-muted-foreground/10">
                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-sm font-bold text-primary uppercase tracking-tight">Update Password</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed uppercase">Securely change your command access credentials.</p>
                </div>
                <Button variant="outline" onClick={handleResetPassword} className="h-10 rounded-xl px-6 text-[10px] font-bold uppercase border-primary/20 text-primary hover:bg-primary/5 shadow-sm">
                  Send Reset Link
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Sidebar Info */}
        <div className="md:col-span-4 space-y-6">
          <Card className="border-none shadow-md rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border">
            <CardHeader className="bg-primary/5 border-b py-5 px-6">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Business Context
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-muted/20 border border-muted flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white border shadow-sm flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Linked Business</p>
                    <p className="text-sm font-bold text-primary truncate">{business?.name || "No Business Found"}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white border shadow-sm flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Authority Level</p>
                    <p className="text-sm font-bold text-primary uppercase">
                      {isDocLoading ? "PENDING..." : (profile?.role || "ADMIN")}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                  <Calendar className="h-3.5 w-3.5" /> Account ID: {user?.uid.slice(0, 8)}...
                </div>
                <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                  <BadgeCheck className="h-3.5 w-3.5 text-blue-500" /> Identity Verified
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 p-4 border-t">
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="w-full h-10 rounded-xl text-destructive hover:bg-destructive/5 font-bold uppercase text-[10px] tracking-widest"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" /> Sign Out from Device
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
