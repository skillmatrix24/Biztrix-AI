
"use client";

import { Suspense } from "react";
import { XCircle, ArrowLeft, Zap, SmartphoneNfc } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function CancelledContent() {
  const searchParams = useSearchParams();
  const bId = searchParams.get('bId');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8 animate-in zoom-in-95 duration-500">
        <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto border-4 border-white shadow-lg">
          <XCircle className="h-10 w-10 text-slate-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Session Ended</h1>
          <p className="text-muted-foreground font-medium">The payment gateway window was dismissed.</p>
        </div>

        <Card className="border-none shadow-xl bg-white rounded-[2.5rem] p-8 space-y-6 border">
          <p className="text-sm font-medium text-slate-600 leading-relaxed uppercase tracking-tight">
            Transaction node was closed manually. Aapka account activate karne ke liye payment purn (complete) karna zaroori hai.
          </p>
          <div className="grid grid-cols-1 gap-3">
             <Button asChild className="w-full h-14 bg-primary text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">
                <Link href={`/loyalty/join/${bId}`}><Zap className="mr-2 h-4 w-4 fill-current" /> Resume Enrollment</Link>
             </Button>
             <Button asChild variant="ghost" className="w-full h-14 font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-50 rounded-2xl">
                <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Return to Home</Link>
             </Button>
          </div>
        </Card>
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
