
"use client";

import { Suspense } from "react";
import { ShieldAlert, AlertCircle, ArrowLeft, RotateCcw, SmartphoneNfc } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function FailedContent() {
  const searchParams = useSearchParams();
  const bId = searchParams.get('bId');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8 animate-in zoom-in-95 duration-500">
        <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center mx-auto border-4 border-white shadow-xl">
          <ShieldAlert className="h-10 w-10 text-red-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Payment Failed</h1>
          <p className="text-muted-foreground font-medium">Node synchronization interrupted during transaction.</p>
        </div>

        <Card className="border-none shadow-xl bg-white rounded-[2.5rem] p-8 space-y-6 border">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto opacity-40" />
          <p className="text-sm font-medium text-slate-600 leading-relaxed uppercase tracking-tight">
            Hamare server ko gateway se verification node nahi mila. Kripya apna payment status check karein ya dobara try karein.
          </p>
          <div className="grid grid-cols-1 gap-3">
             <Button asChild className="w-full h-14 bg-primary text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">
                <Link href={bId ? `/loyalty/join/${bId}` : '/'}><RotateCcw className="mr-2 h-4 w-4" /> Retry Enrollment</Link>
             </Button>
             <Button variant="ghost" className="w-full h-14 font-black uppercase text-[10px] tracking-widest text-primary hover:bg-primary/5 rounded-2xl">
                <SmartphoneNfc className="mr-2 h-4 w-4" /> Contact Support
             </Button>
          </div>
        </Card>
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
