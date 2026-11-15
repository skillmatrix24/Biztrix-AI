"use client";

import { useState, useMemo } from "react";
import { 
  Bot, 
  Smartphone, 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  const businessId = searchParams.get('bId');

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast({ variant: "destructive", title: "Invalid Number" });
      return;
    }

    setLoading(true);
    try {
      const verifier = setupRecaptcha(auth, 'recaptcha-container');
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const result = await initiatePhoneSignIn(auth, formattedPhone, verifier);
      setConfirmationResult(result);
      setStep('otp');
      toast({ title: "OTP Sent" });
    } catch (err: any) {
    console.error(err);
      toast({ variant: "destructive", title: "Auth Error", description: err.message });
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
      router.push(`/portal/solar?bId=${businessId || ''}`);
      toast({ title: "Welcome!", description: "Identity node verified." });
    } catch (err) {
    console.error(err);
      toast({ variant: "destructive", title: "Invalid OTP" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div id="recaptcha-container"></div>
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 bg-primary rounded-[1.5rem] flex items-center justify-center mx-auto text-white shadow-2xl">
            <Bot className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Solar Portal</h1>
          <p className="text-sm text-muted-foreground font-medium">Verify your identity to track your installation.</p>
        </div>

        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="bg-primary/5 border-b p-8">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm border">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="text-left">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Identity Check</CardTitle>
                <CardDescription className="text-[9px] font-bold uppercase tracking-tighter">Secure Phone Authentication</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            {step === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-6 text-left">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Registered Mobile Number</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">+91</span>
                    <Input 
                      type="tel" 
                      placeholder="9876543210" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="h-14 pl-12 rounded-2xl bg-muted/20 border-none shadow-inner text-lg font-black tracking-widest" 
                    />
                  </div>
                </div>
                <Button disabled={loading || phone.length < 10} className="w-full h-14 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Send Access Code"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-6 text-left">
                <div className="space-y-2 text-center">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.4em]">Enter 6-Digit Code</Label>
                  <Input 
                    type="text" 
                    maxLength={6}
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="h-20 text-center text-5xl font-black rounded-2xl bg-muted/20 border-none shadow-inner tracking-[0.4em]" 
                  />
                  <button type="button" onClick={() => setStep('phone')} className="text-[10px] font-bold text-primary uppercase mt-4 hover:underline">Change Number</button>
                </div>
                <Button disabled={loading || otp.length < 6} className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Verify & Enter"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-3 opacity-40">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Encrypted Identity Node v3.5</span>
        </div>
      </div>
    </div>
  );
}