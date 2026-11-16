"use client";

import { Suspense } from "react";
import { ShieldAlert, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function FailedContent() {
  const searchParams = useSearchParams();
  const bId = searchParams.get("bId");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="h-16 w-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto">
          <ShieldAlert className="h-8 w-8 text-rose-600" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payment Failed</h1>
          <p className="text-sm text-slate-600">
            Payment verification could not be completed.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            We did not receive a confirmed settlement signal from the payment gateway. Please check
            your bank statement or retry enrollment.
          </p>
          <div className="grid grid-cols-1 gap-2.5">
            <Button
              asChild
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
            >
              <Link href={bId ? `/loyalty/join/${bId}` : "/"}>
                <RotateCcw className="mr-2 h-4 w-4" /> Retry Enrollment
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full h-11 text-xs font-semibold rounded-xl"
            >
              <Link href={bId ? `/loyalty/track-member/${bId}` : "/loyalty/track-member"}>
                <Search className="mr-2 h-4 w-4" /> Member Lookup Portal
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={null}>
      <FailedContent />
    </Suspense>
  );
}
