
"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface OtpGateProps {
  otp: string;
  setOtp: (v: string) => void;
  onVerify: () => void;
  onResend: () => void;
  isSubmitting: boolean;
  phone: string;
}

export function OtpGate({ otp, setOtp, onVerify, onResend, isSubmitting, phone }: OtpGateProps) {
  return (
    <Card className="border-none shadow-xl bg-white rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden border animate-in slide-in-from-right-10 duration-500 mx-2 text-left">
      <CardHeader className="p-8 sm:p-12 pb-0">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-inner">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-black uppercase tracking-widest text-slate-900 leading-none">Privacy Guard</h3>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 sm:p-12 space-y-10 text-center">
        <Label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.5em]">Enter 6-Digit Code</Label>
        <Input 
          value={otp} 
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
          maxLength={6} 
          placeholder="000000" 
          className="h-20 sm:h-28 text-center text-5xl sm:text-7xl font-black tracking-[0.5em] rounded-[2rem] bg-muted/20 border-none shadow-inner" 
        />
        <div className="flex justify-between px-2">
          <button className="text-[10px] font-bold text-muted-foreground uppercase hover:underline">Edit Details</button>
          <button onClick={onResend} className="text-[10px] font-bold text-primary uppercase hover:underline">Resend OTP</button>
        </div>
        <Button 
          onClick={onVerify} 
          disabled={isSubmitting || otp.length < 6} 
          className="w-full h-16 sm:h-20 bg-green-600 font-black uppercase text-sm tracking-[0.2em] rounded-[2rem] shadow-2xl active:scale-95 transition-all text-white"
        >
          {isSubmitting ? <Loader2 className="h-8 w-8 animate-spin mr-2" /> : "Verify Identity"}
        </Button>
      </CardContent>
    </Card>
  );
}
