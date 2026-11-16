"use client";

import { Suspense } from "react";
import { XCircle, ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function CancelledContent() {
  const searchParams = useSearchParams();
  const bId = searchParams.get("bId");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto">
          <XCircle className="h-8 w-8 text-slate-500" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payment Cancelled</h1>
          <p className="text-sm text-slate-600">
            The payment gateway window was closed before checkout completed.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            Your transaction was closed manually. Complete the enrollment payment to activate your
            digital membership card.
          </p>
          <div className="grid grid-cols-1 gap-2.5">
            <Button
              asChild
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
            >
              <Link href={bId ? `/loyalty/join/${bId}` : "/loyalty/track-member"}>
                <Zap className="mr-2 h-4 w-4" /> Resume Enrollment
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full h-11 text-xs font-semibold rounded-xl"
            >
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Return to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentCancelledPage() {
  return (
    <Suspense fallback={null}>
      <CancelledContent />
    </Suspense>
  );
}
