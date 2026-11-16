"use client";

import { useState, useEffect } from "react";
import {
  User,
  Mail,
  ShieldCheck,
  Building2,
  Calendar,
  Save,
  Loader2,
  UserCircle,
  KeyRound,
  IdCard,
  LogOut,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader, SectionCard } from "@/components/ui/editorial";
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  updateDocumentNonBlocking,
  initiatePasswordReset,
  useAuth,
  initiateSignOut,
} from "@/firebase";
import { doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export default function UserProfilePage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(
    () => (!isUserLoading && user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid, isUserLoading]
  );
  const { data: profile, isLoading: isDocLoading } = useDoc<any>(userProfileRef);

  const businessRef = useMemoFirebase(
    () => (profile?.businessId ? doc(firestore, "businesses", profile.businessId) : null),
    [firestore, profile?.businessId]
  );
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
    initiateSignOut(auth).then(() => router.push("/login"));
  };

  if (isUserLoading || isDocLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900 mb-3" />
        <p className="text-xs font-medium">Loading profile...</p>
      </div>
    );
  }

  const initials =
    profile?.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() ||
    user?.email?.[0].toUpperCase() ||
    "U";

  const roleLabel = profile?.role ? String(profile.role) : "Admin";
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 text-left">
      <PageHeader
        title="My Profile"
        description="Manage your personal identity, business workspace details, and account security."
        breadcrumb="Account · Profile"
        icon={UserCircle}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="h-10 px-4 rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 text-xs font-semibold whitespace-nowrap shrink-0"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign Out
          </Button>
        }
      />

      {/* Identity Overview Strip */}
      <div className="rounded-2xl bg-slate-900 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <Avatar className="h-16 w-16 rounded-2xl border border-white/15 shrink-0">
            <AvatarFallback className="bg-white/10 text-white text-xl font-bold rounded-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1">
            <h2 className="text-xl font-bold text-white truncate">
              {profile?.name || "Workspace User"}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="font-semibold text-emerald-300 capitalize">{roleLabel}</span>
              <span aria-hidden="true">·</span>
              <span>Member since {memberSince}</span>
              {user?.email && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-slate-200 truncate">{user.email}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <p className="text-xs text-slate-400">Account ID</p>
          <p className="text-xs font-mono tabular-nums text-white mt-0.5">
            {user?.uid ? `${user.uid.slice(0, 12)}...` : "N/A"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <SectionCard
            title="Personal Information"
            description="Update your display name used across invoices, leads, and team activity logs."
          >
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <IdCard className="h-3.5 w-3.5 text-slate-400" />
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="h-11 pl-10 rounded-xl bg-white border-slate-200 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-email" className="text-xs font-semibold text-slate-700">
                  Email Address (Primary Identity)
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="profile-email"
                    disabled
                    value={user?.email || ""}
                    className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-mono text-slate-600"
                  />
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <Button
                  type="button"
                  onClick={handleUpdateProfile}
                  disabled={isSaving || !name.trim()}
                  className="h-10 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Profile Changes
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Security & Privacy"
            description="Manage credentials and password recovery for your workspace login."
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-slate-500" />
                  Update Password
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Receive a password reset link at your registered email address.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleResetPassword}
                className="h-10 rounded-xl px-5 text-xs font-semibold border-slate-200 text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                Send Reset Link
              </Button>
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <SectionCard
            title="Business Context"
            description="Active organization and permission scope."
          >
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-slate-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Linked Business</p>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                    {business?.name || "No Business Found"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Access Role</p>
                  <p className="text-sm font-semibold text-slate-900 capitalize mt-0.5">
                    {isDocLoading ? "Loading..." : roleLabel}
                  </p>
                </div>
              </div>

              <Separator className="bg-slate-100" />

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    Member ID
                  </span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {user?.uid ? `${user.uid.slice(0, 8)}...` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Status
                  </span>
                  <span className="font-medium text-emerald-700">Identity Verified</span>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
