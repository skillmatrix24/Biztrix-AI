"use client";

import { Suspense } from "react";
import { CheckCircle2, IdCard, ArrowRight, Globe, Share2, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const id = searchParams.get("id");
  const bId = searchParams.get("bId");

  const memberRef = useMemoFirebase(
    () => (id && bId ? doc(firestore, "businesses", bId, "memberships", id) : null),
    [firestore, id, bId]
  );
  const { data: member, isLoading } = useDoc<any>(memberRef);

  const businessRef = useMemoFirebase(
    () => (bId ? doc(firestore, "businesses", bId) : null),
    [firestore, bId]
  );
  const { data: business } = useDoc<any>(businessRef);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const trackPath = bId && id ? `/loyalty/track/${bId}/${id}` : "/loyalty/track-member";
  const trackUrl = `${origin}${trackPath}`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Activation Complete
            </h1>
            <p className="text-sm text-slate-600">
              Your digital membership card is active for{" "}
              <span className="font-semibold text-slate-900">{business?.name || "the store"}</span>.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden text-left">
          <div className="p-6 bg-slate-900 text-white relative">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 min-w-0">
                <span className="inline-block text-xs font-medium text-slate-300">
                  Digital Membership Card
                </span>
                <h2 className="text-xl font-bold truncate">
                  {member?.customerName || "Valued Member"}
                </h2>
              </div>
              <IdCard className="h-7 w-7 text-white/30 shrink-0" />
            </div>
            <div className="mt-4 p-3 bg-white/10 rounded-xl border border-white/15">
              <p className="text-xs text-slate-300">Card Serial Code</p>
              <p className="text-sm font-mono font-bold tracking-wider text-white mt-0.5">
                {member?.cardNumber || "Pending"}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Loyalty Tier</span>
              <Badge
                variant="outline"
                className="bg-slate-50 text-slate-900 border-slate-200 font-semibold"
              >
                {member?.tier || "Standard"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Current Balance</span>
              <span className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                {member?.rewardPoints ?? 0} Points · ₹{member?.walletBalance ?? 0} Wallet
              </span>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-slate-500" /> Personal Member Hub
              </p>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-600 truncate">
                {trackUrl}
              </div>
              <Button
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
                asChild
              >
                <Link href={trackPath}>
                  Open Member Hub <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-10 rounded-xl text-xs font-semibold bg-white"
              onClick={() => window.print()}
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Print Slip
            </Button>
            <Button
              asChild
              variant="outline"
              className="flex-1 h-10 rounded-xl text-xs font-semibold bg-white"
            >
              <a
                href={`https://wa.me/?text=${encodeURIComponent("My new membership: " + trackUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share
              </a>
            </Button>
          </div>
        </div>

        <p className="text-xs text-slate-500">Verified by Biztrix AI</p>
      </div>
    </div>
  );
}

export default function MembershipSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
