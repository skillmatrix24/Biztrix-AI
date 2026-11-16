"use client";

import { useState, useRef } from "react";
import {
  ScanLine,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  User,
  Ticket,
  Gem,
  Camera,
  Zap,
  Info,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PageHeader, SectionCard } from "@/components/ui/editorial";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
  const inputRef = useRef<HTMLInputElement>(null);

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanValue = scanValue.trim();
    if (!cleanValue || !businessId) return;

    setState("scanning");

    try {
      let targetRef = doc(firestore, "businesses", businessId, "memberships", cleanValue);
      let snap = await getDoc(targetRef);

      if (!snap.exists()) {
        const q = query(
          collection(firestore, "businesses", businessId, "memberships"),
          where("cardNumber", "==", cleanValue)
        );
        const qSnap = await getDocs(q);
        if (!qSnap.empty) snap = qSnap.docs[0];
      }

      if (!snap.exists()) {
        targetRef = doc(firestore, "businesses", businessId, "coupons", cleanValue);
        snap = await getDoc(targetRef);
      }

      if (snap.exists()) {
        const data = snap.data();
        const type = snap.ref.path.includes("memberships") ? "member" : "coupon";

        if (type === "member" && data.status === "lost") {
          toast({
            variant: "destructive",
            title: "Security Alert",
            description: "This card was reported lost.",
          });
          setState("invalid");
          return;
        }

        setVerifiedData({ ...data, id: snap.id, type });
        setState("success");
        toast({
          title: "Identity Verified",
          description: "Record found in your store loyalty registry.",
        });
      } else {
        setState("invalid");
        toast({
          variant: "destructive",
          title: "Not Found",
          description: "This card number or coupon code is not in your registry.",
        });
      }
    } catch (e) {
      console.error(e);
      setState("idle");
      toast({
        variant: "destructive",
        title: "System Error",
        description: "Verification failed.",
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 text-left">
      <PageHeader
        title="Universal Validator"
        description="Verify membership card numbers, QR codes, or promo coupon IDs in real time."
        breadcrumb="Loyalty / Verify"
        backHref="/loyalty"
        backLabel="Back to Loyalty"
      />

      {state === "idle" || state === "scanning" || state === "invalid" ? (
        <SectionCard>
          <div className="text-center space-y-3 pb-6 border-b border-slate-100">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-700">
              {state === "scanning" ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <ScanLine className="h-7 w-7" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Verify Member or Coupon</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Supports card numbers, member IDs, or promo codes
              </p>
            </div>
          </div>

          <div className="pt-6 space-y-6">
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scan-code" className="text-xs font-semibold text-slate-700">
                  Card Number or Coupon Code
                </Label>
                <div className="flex gap-2.5">
                  <Input
                    ref={inputRef}
                    id="scan-code"
                    value={scanValue}
                    onChange={(e) => setScanValue(e.target.value)}
                    placeholder="Enter Card Number or Scan QR..."
                    className="h-12 rounded-xl text-base font-mono font-semibold"
                  />
                  <Button
                    type="button"
                    size="icon"
                    aria-label="Focus scanner input"
                    onClick={() => {
                      inputRef.current?.focus();
                      toast({
                        title: "Scanner Input Ready",
                        description: "Scan with a handheld barcode/QR reader or type code.",
                      });
                    }}
                    className="h-12 w-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shrink-0"
                  >
                    <Camera className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={state === "scanning" || !scanValue.trim()}
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl"
              >
                {state === "scanning" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Run Integrity Check
              </Button>
            </form>

            {state === "invalid" && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 text-center">
                No matching active member or coupon found for &ldquo;{scanValue}&rdquo;.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-medium text-slate-700">Registry Verified</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5">
                <Zap className="h-4 w-4 text-slate-700 shrink-0" />
                <span className="text-xs font-medium text-slate-700">Instant Lookup</span>
              </div>
            </div>
          </div>
        </SectionCard>
      ) : (
        <SectionCard bodyClassName="p-0 overflow-hidden">
          <div className="p-8 bg-emerald-600 text-white text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center mx-auto">
              <Check className="h-7 w-7 text-emerald-600 stroke-[3px]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Integrity Verified</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Record confirmed in store loyalty registry
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-5">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                  {verifiedData.type === "member" ? (
                    <User className="h-5 w-5" />
                  ) : (
                    <Ticket className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">
                    {verifiedData.type === "member" ? "Member Profile" : "Offer Coupon"}
                  </p>
                  <h3 className="text-lg font-bold text-slate-900 truncate">
                    {verifiedData.customerName || verifiedData.code}
                  </h3>
                  {verifiedData.cardNumber && (
                    <p className="text-xs font-mono font-semibold text-slate-600">
                      {verifiedData.cardNumber}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Lifecycle Status</p>
                  <Badge
                    className={cn(
                      "mt-1 text-xs font-medium capitalize",
                      verifiedData.status === "active"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    )}
                  >
                    {verifiedData.status}
                  </Badge>
                </div>
                {verifiedData.tier && (
                  <div>
                    <p className="text-xs text-slate-500">Membership Tier</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1 flex items-center gap-1.5">
                      <Gem className="h-3.5 w-3.5 text-slate-600" /> {verifiedData.tier}
                    </p>
                  </div>
                )}
                {verifiedData.rewardPoints !== undefined && (
                  <div className="col-span-2 p-4 bg-white rounded-xl border border-slate-200 flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Available Rewards</p>
                      <p className="text-base font-bold font-mono text-slate-900 tabular-nums mt-0.5">
                        {verifiedData.rewardPoints} Pts · ₹{verifiedData.walletBalance ?? 0}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="h-9 rounded-lg text-xs">
                      <Link
                        href={`/billing?customerId=${verifiedData.customerId || verifiedData.id.replace("mem_", "")}`}
                      >
                        Redeem in POS
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11 rounded-xl text-xs font-semibold"
                onClick={() => {
                  setState("idle");
                  setVerifiedData(null);
                  setScanValue("");
                }}
              >
                Clear & Reset
              </Button>
              <Button
                type="button"
                className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
                onClick={() => {
                  setState("idle");
                  setScanValue("");
                }}
              >
                Verify Another
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
        <Info className="h-4 w-4 text-slate-500 shrink-0" />
        <p className="text-xs text-slate-600 leading-relaxed">
          This validator syncs directly with your store membership and coupon registry in real time
          to verify active status and reward balances.
        </p>
      </div>
    </div>
  );
}
