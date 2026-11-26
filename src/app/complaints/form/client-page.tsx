"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Headset, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function GenericComplaintFormRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bIdParam = searchParams.get("bId") || searchParams.get("businessId");
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userDocRef);

  const [inputCode, setInputCode] = useState("");
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (bIdParam) {
      router.replace(`/complaints/form/${bIdParam}`);
      return;
    }
    if (!isUserLoading && !isProfileLoading) {
      if (userProfile?.businessId) {
        router.replace(`/complaints/form/${userProfile.businessId}`);
        return;
      }
      setHasChecked(true);
    }
  }, [bIdParam, userProfile?.businessId, isUserLoading, isProfileLoading, router]);

  if (!hasChecked && (isUserLoading || isProfileLoading || bIdParam)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          <p className="text-xs font-medium text-slate-500">Opening support desk...</p>
        </div>
      </div>
    );
  }

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim();
    if (clean) {
      router.push(`/complaints/form/${clean}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
      <div className="max-w-md w-full space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm text-left">
        <div className="h-12 w-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
          <Headset className="h-6 w-6 text-orange-600" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Customer Support Portal</h1>
          <p className="text-xs text-slate-600">
            File a complaint, report a service issue, or request assistance from your provider.
          </p>
        </div>

        <form onSubmit={handleLookup} className="space-y-3 pt-2">
          <label className="text-xs font-semibold text-slate-700 block">
            Enter Business Code / Identifier
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. your-business-id"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="text-xs font-mono h-10 rounded-xl"
              required
            />
            <Button type="submit" className="h-10 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs shrink-0">
              Continue <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
          <p className="text-[11px] text-slate-400">
            If you received a direct link via SMS or WhatsApp, please open that URL directly.
          </p>
        </form>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Are you a team member?</span>
          <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs font-semibold text-slate-800">
            <Link href="/complaints">Staff Support Desk →</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
