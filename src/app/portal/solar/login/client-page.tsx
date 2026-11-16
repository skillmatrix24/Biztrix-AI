"use client";

import { useState } from "react";
import { Smartphone, ShieldCheck, Loader2, Sun } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, setupRecaptcha, initiatePhoneSignIn } from "@/firebase";
import { toast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfirmationResult } from "firebase/auth";

export default function SolarPortalLoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get("bId");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast({ variant: "destructive", title: "Invalid Mobile Number" });
      return;
    }

    setLoading(true);
    try {
      const verifier = setupRecaptcha(auth, "recaptcha-container");
      const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
      const result = await initiatePhoneSignIn(auth, formattedPhone, verifier);
      setConfirmationResult(result);
      setStep("otp");
      toast({ title: "OTP Sent" });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !confirmationResult) return;

    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
      router.push(`/portal/solar?bId=${businessId || ""}`);
      toast({ title: "Welcome!", description: "Phone number verified." });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Invalid OTP" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div id="recaptcha-container" />
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="h-14 w-14 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto text-white border border-slate-800">
            <Sun className="h-7 w-7 text-amber-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Solar Client Portal
          </h1>
          <p className="text-sm text-slate-600">
            Sign in with your registered mobile number to track your
            installation.
          </p>
        </div>

        <Card className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-none">
          <CardHeader className="bg-slate-900 text-white border-b border-slate-800 p-6">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="text-left">
                <CardTitle className="text-base font-bold text-white">
                  Phone Verification
                </CardTitle>
                <CardDescription className="text-xs text-slate-300">
                  One-time password authentication
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {step === "phone" ? (
              <form onSubmit={handleSendOtp} className="space-y-5 text-left">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="solar-portal-phone"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Registered Mobile Number
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-slate-500 font-mono text-sm">
                      +91
                    </span>
                    <Input
                      id="solar-portal-phone"
                      type="tel"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value.replace(/\D/g, ""))
                      }
                      className="h-12 pl-12 rounded-xl bg-slate-50 border-slate-200 text-base font-semibold font-mono tabular-nums tracking-wider"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading || phone.length < 10}
                  className="w-full h-11 bg-primary font-semibold text-xs rounded-xl"
                >
                  {loading ? (
                    <Loader2 className="animate-spin h-4 w-4" />
                  ) : (
                    "Send Access Code"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5 text-left">
                <div className="space-y-2 text-center">
                  <Label
                    htmlFor="solar-portal-otp"
                    className="text-xs font-semibold text-slate-600 block"
                  >
                    Enter 6-Digit Code
                  </Label>
                  <Input
                    id="solar-portal-otp"
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="h-16 text-center text-3xl font-bold rounded-xl bg-slate-50 border-slate-200 font-mono tabular-nums tracking-[0.4em]"
                  />
                  <button
                    type="button"
                    onClick={() => setStep("phone")}
                    className="text-xs font-semibold text-primary mt-2 hover:underline"
                  >
                    Change Number
                  </button>
                </div>
                <Button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl"
                >
                  {loading ? (
                    <Loader2 className="animate-spin h-4 w-4" />
                  ) : (
                    "Verify & Enter Portal"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2 text-slate-500">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-xs font-medium">
            Encrypted OTP Session • Biztrix AI
          </span>
        </div>
      </div>
    </div>
  );
}