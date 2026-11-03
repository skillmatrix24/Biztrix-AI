
"use client";

import { use, Suspense } from "react";
import { CheckCircle2, IdCard, Receipt, ArrowRight, SmartphoneNfc, Globe, Share2, Printer, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
  const id = searchParams.get('id');
  const bId = searchParams.get('bId');

  const memberRef = useMemoFirebase(() => id && bId ? doc(firestore, 'businesses', bId, 'memberships', id) : null, [firestore, id, bId]);
  const { data: member, isLoading } = useDoc<any>(memberRef);

  const businessRef = useMemoFirebase(() => bId ? doc(firestore, 'businesses', bId) : null, [firestore, bId]);
  const { data: business } = useDoc<any>(businessRef);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  const trackUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/loyalty/track/${bId}/${id}`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-10 animate-in zoom-in-95 duration-700">
        <div className="space-y-6">
          <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center mx-auto border-4 border-white shadow-2xl shadow-green-200">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Activation Success!</h1>
            <p className="text-muted-foreground font-medium">Identity node established. Welcome to the Club.</p>
          </div>
        </div>

        <Card className="border-none shadow-2xl bg-white rounded-[3rem] overflow-hidden border">
          <div className="p-10 bg-slate-900 text-white text-left relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10"><IdCard className="h-32 w-32" /></div>
             <div className="relative z-10 space-y-4">
                <Badge className="bg-primary text-white border-none text-[8px] font-black h-5 px-3 uppercase tracking-widest">DIGITAL IDENTITY</Badge>
                <h3 className="text-2xl font-bold">{member?.customerName}</h3>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                   <p className="text-[7px] font-black uppercase text-accent mb-1 tracking-widest">Card Serial Code</p>
                   <p className="text-sm font-mono font-black tracking-widest uppercase">{member?.cardNumber}</p>
                </div>
             </div>
          </div>
          <CardContent className="p-10 space-y-6 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Loyalty Tier</span>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black h-6 uppercase">{member?.tier}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Rewards</span>
              <span className="text-sm font-black text-slate-900">0 Points / ₹0 Wallet</span>
            </div>
            <Separator />
            <div className="space-y-4">
               <p className="text-[9px] font-black uppercase text-primary tracking-widest flex items-center gap-2"><Globe className="h-4 w-4" /> Personal Tracking Hub</p>
               <div className="p-3 bg-muted/20 rounded-xl border text-[8px] font-mono truncate">{trackUrl}</div>
               <Button className="w-full h-14 bg-primary text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl" asChild>
                  <Link href={trackUrl}>Open Performance Node <ArrowRight className="ml-2 h-4 w-4" /></Link>
               </Button>
            </div>
          </CardContent>
          <CardFooter className="p-6 bg-muted/10 border-t flex flex-row gap-3">
             <Button variant="outline" className="flex-1 h-10 rounded-xl font-bold uppercase text-[9px]" onClick={() => window.print()}><Printer className="h-3.5 w-3.5 mr-1.5" /> Print Slip</Button>
             <Button variant="outline" className="flex-1 h-10 rounded-xl font-bold uppercase text-[9px]" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('My new membership: ' + trackUrl)}`, '_blank')}><Share2 className="h-3.5 w-3.5 mr-1.5" /> Share</Button>
          </CardFooter>
        </Card>

        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.3em]">Verified by Biztrix AI OS Node</p>
      </div>
    </div>
  );
}

export default function MembershipSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
