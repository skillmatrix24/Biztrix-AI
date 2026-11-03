
"use client";

import { useState } from "react";
import { 
  ScanLine, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ShieldCheck, 
  User, 
  Ticket, 
  Gem, 
  Smartphone,
  Camera,
  History,
  Zap,
  Info,
  ShieldAlert,
  Search,
  Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

type VerifyState = "idle" | "scanning" | "success" | "invalid";

export default function LoyaltyVerifyPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [state, setState] = useState<VerifyState>("idle");
  const [scanValue, setScanValue] = useState("");
  const [verifiedData, setVerifiedData] = useState<any>(null);

  // Resolve Business Context
  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanValue = scanValue.trim();
    if (!cleanValue || !businessId) return;

    setState("scanning");
    
    try {
      // 1. Try search by Doc ID (Existing Logic)
      let targetRef = doc(firestore, 'businesses', businessId, 'memberships', cleanValue);
      let snap = await getDoc(targetRef);
      
      // 2. If not found, try search by Card Number (Universal Engine Logic)
      if (!snap.exists()) {
        const q = query(
          collection(firestore, 'businesses', businessId, 'memberships'),
          where('cardNumber', '==', cleanValue)
        );
        const qSnap = await getDocs(q);
        if (!qSnap.empty) snap = qSnap.docs[0];
      }

      // 3. Try search in Coupons if still not found
      if (!snap.exists()) {
        targetRef = doc(firestore, 'businesses', businessId, 'coupons', cleanValue);
        snap = await getDoc(targetRef);
      }

      if (snap.exists()) {
        const data = snap.data();
        const type = snap.ref.path.includes('memberships') ? 'member' : 'coupon';
        
        // Verification Check
        if (type === 'member' && data.status === 'lost') {
          toast({ variant: "destructive", title: "Security Alert", description: "This card was reported lost." });
          setState("invalid");
          return;
        }

        setVerifiedData({ ...data, type });
        setState("success");
        toast({ title: "Node Verified", description: "Identity recognized by system." });
      } else {
        setState("invalid");
        toast({ variant: "destructive", title: "Invalid Data", description: "This ID/QR is not in your registry." });
      }
    } catch (e) {
      console.error(e);
      setState("idle");
      toast({ variant: "destructive", title: "System Error", description: "Verification failed." });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 md:space-y-8 pb-20 px-2 sm:px-0">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm border border-border/50 shrink-0"><Link href="/loyalty"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">Universal Validator</h2>
          <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Identity & Card Verification</p>
        </div>
      </div>

      {state === "idle" || state === "scanning" || state === "invalid" ? (
        <Card className="border-none shadow-2xl bg-white rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border">
          <CardHeader className="p-6 sm:p-10 text-center space-y-4">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto border border-primary/20 shadow-inner group">
              {state === "scanning" ? <Loader2 className="h-8 w-8 md:h-10 md:w-10 animate-spin text-primary" /> : <ScanLine className="h-8 w-8 md:h-10 md:w-10 text-primary group-hover:scale-110 transition-transform" />}
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl md:text-2xl font-black text-primary uppercase leading-tight">Verify Identity</CardTitle>
              <CardDescription className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Supports Card Numbers, QR Codes or Promo IDs</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6 sm:p-10 pt-0 space-y-8">
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Universal Node Data</Label>
                <div className="flex gap-3">
                  <Input 
                    value={scanValue} 
                    onChange={(e) => setScanValue(e.target.value)}
                    placeholder="Enter Card Number or Scan QR..." 
                    className="h-14 rounded-2xl bg-muted/20 border-none shadow-inner text-base md:text-lg font-mono font-black placeholder:opacity-30" 
                  />
                  <Button type="button" size="icon" className="h-14 w-14 rounded-2xl bg-slate-900 text-white shadow-xl shrink-0"><Camera className="h-6 w-6" /></Button>
                </div>
              </div>
              <Button onClick={handleVerify} disabled={state === "scanning" || !scanValue} className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest text-[10px] md:text-xs rounded-2xl shadow-xl active:scale-95 transition-all">
                Run Integrity Check
              </Button>
            </form>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/10 rounded-2xl border border-transparent flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-[8px] md:text-[9px] font-black uppercase text-slate-500 tracking-tight">Verified Mode</span>
              </div>
              <div className="p-4 bg-muted/10 rounded-2xl border border-transparent flex items-center gap-3">
                <Zap className="h-4 w-4 text-primary shrink-0" />
                <span className="text-[8px] md:text-[9px] font-black uppercase text-slate-500 tracking-tight">Active Node</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-2xl bg-white rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border animate-in zoom-in-95 duration-500">
          <CardHeader className="p-6 sm:p-10 bg-green-600 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><CheckCircle2 className="h-40 w-40" /></div>
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-white flex items-center justify-center mx-auto mb-6 shadow-2xl relative z-10">
              <Check className="h-10 w-10 md:h-12 md:w-12 text-green-600 stroke-[4px]" />
            </div>
            <CardTitle className="text-xl md:text-2xl font-black uppercase relative z-10">Integrity Verified</CardTitle>
            <p className="text-white/60 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1 relative z-10">Identity Node recognized</p>
          </CardHeader>
          <CardContent className="p-6 sm:p-10 space-y-8">
             <div className="p-6 bg-muted/20 rounded-3xl border border-transparent space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm font-black text-xl border shrink-0">
                    {verifiedData.type === 'member' ? <User className="h-6 w-6" /> : <Ticket className="h-6 w-6" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{verifiedData.type === 'member' ? 'Member Node' : 'Coupon Node'}</p>
                    <h3 className="text-base md:text-lg font-black text-slate-900 truncate">{verifiedData.customerName || verifiedData.code}</h3>
                    {verifiedData.cardNumber && <p className="text-[10px] font-mono text-primary font-black uppercase">{verifiedData.cardNumber}</p>}
                  </div>
                </div>
                
                <Separator className="bg-white" />

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Lifecycle Status</p>
                    <Badge className={cn("border-none font-black text-[9px] uppercase mt-1.5", 
                      verifiedData.status === 'active' ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600"
                    )}>{verifiedData.status}</Badge>
                  </div>
                  {verifiedData.tier && (
                    <div>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase">Privilege Level</p>
                      <p className="text-sm font-black text-primary uppercase mt-1 flex items-center gap-1.5"><Gem className="h-3 w-3" /> {verifiedData.tier}</p>
                    </div>
                  )}
                  {(verifiedData.rewardPoints !== undefined) && (
                    <div className="col-span-2 p-4 bg-white rounded-2xl border border-border/50 flex justify-between items-center">
                       <div>
                         <p className="text-[8px] font-bold text-muted-foreground uppercase">Available Rewards</p>
                         <p className="text-lg font-black text-primary">{verifiedData.rewardPoints} Pts | ₹{verifiedData.walletBalance}</p>
                       </div>
                       <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-[9px] font-black uppercase"><Link href={`/billing?customerId=${verifiedData.customerId || verifiedData.id.replace('mem_', '')}`}>Redeem Now</Link></Button>
                    </div>
                  )}
                </div>
             </div>
             
             <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest border-slate-200" onClick={() => { setState("idle"); setVerifiedData(null); setScanValue(""); }}>Clear Buffer</Button>
                <Button className="flex-1 h-14 bg-primary text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all" onClick={() => { setState("idle"); setScanValue(""); }}>Confirm & Close</Button>
             </div>
          </CardContent>
        </Card>
      )}

      <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 flex flex-col items-center gap-4">
        <Info className="h-6 w-6 text-primary opacity-30" />
        <p className="text-[9px] md:text-[10px] text-primary/70 font-black uppercase text-center tracking-tighter leading-relaxed px-4">
          The validation node syncs with the <strong>Master Registry</strong> to verify card status, point balances, and active privileges in real-time.
        </p>
      </div>
    </div>
  );
}
