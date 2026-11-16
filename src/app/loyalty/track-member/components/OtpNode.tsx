"use client";

import { Loader2, Smartphone } from "lucide-react";
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

export function OtpNode({
  otp,
  setOtp,
  onVerify,
  onResend,
  onBack,
  isVerifying,
  phone,
}: OtpNodeProps) {
  return (
    <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden text-left shadow-none">
      <CardHeader className="p-6 sm:p-8 bg-slate-900 text-white text-center border-b border-slate-800">
        <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4 border border-white/15">
          <Smartphone className="h-7 w-7 text-white" />
        </div>
        <CardTitle className="text-xl font-bold">Enter Verification Code</CardTitle>
        {phone && (
          <p className="text-xs text-slate-300 font-mono tabular-nums mt-1">
            Sent to ...{phone.slice(-4)}
          </p>
        )}
      </CardHeader>
      <CardContent className="p-6 sm:p-8 space-y-6">
        <div className="space-y-4 text-center">
          <Label
            htmlFor="track-otp-input"
            className="text-xs font-semibold text-slate-600 block"
          >
            Enter 6-Digit OTP
          </Label>
          <Input
            id="track-otp-input"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
            placeholder="000000"
            className="h-16 text-center text-3xl sm:text-4xl font-bold font-mono tabular-nums tracking-[0.4em] rounded-xl bg-slate-50 border-slate-200"
          />
          <div className="flex justify-between px-1">
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-medium text-slate-600 hover:underline"
            >
              Change Member
            </button>
            <button
              type="button"
              onClick={onResend}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Resend OTP
            </button>
          </div>
        </div>
        <Button
          type="button"
          onClick={onVerify}
          disabled={otp.length < 6 || isVerifying}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl"
        >
          {isVerifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...
            </>
          ) : (
            "Verify & Enter Portal"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
