"use client";

import { Loader2, Lock, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface OtpNodeProps {
  otp: string;
  setOtp: (v: string) => void;
  onVerify: () => void;
  onResend: () => void;
  onBack: () => void;
  isVerifying: boolean;
  phone: string;
}

export function OtpNode({ otp, setOtp, onVerify, onResend, onBack, isVerifying, phone }: OtpNodeProps) {
  return (
    <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden border animate-in zoom-in-95 duration-500 mx-2 text-left">
      <CardHeader className="p-8 sm:p-12 bg-slate-900 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12"><Lock className="h-40 w-40" /></div>
        <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6 border border-white/10 relative z-10">
          <Smartphone className="h-8 w-8 md:h-10 md:w-10 text-accent" />
        </div>
        <CardTitle className="text-xl md:text-2xl font-black uppercase relative z-10">Identity Gate</CardTitle>
      </CardHeader>
      <CardContent className="p-8 sm:p-12 space-y-8">
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-4 text-center">
            <Label className="text-[10px] font-black uppercase text-center block tracking-[0.4em] text-muted-foreground">Enter 6-Digit OTP</Label>
            <Input 
              value={otp} 
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
              maxLength={6} 
              placeholder="000000" 
              className="h-16 sm:h-20 text-center text-3xl sm:text-5xl font-black tracking-[0.5em] rounded-2xl bg-muted/20 border-none shadow-inner" 
            />
            <div className="flex justify-between px-1">
              <button onClick={onBack} className="text-[9px] font-bold text-muted-foreground uppercase hover:underline">Change Identity</button>
              <button onClick={onResend} className="text-[9px] font-bold text-primary uppercase hover:underline">Resend OTP</button>
            </div>
          </div>
          <Button onClick={onVerify} disabled={otp.length < 6 || isVerifying} className="w-full h-16 bg-green-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl">
            {isVerifying ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : "Authorize & Enter"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
