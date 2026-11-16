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
  onEditDetails?: () => void;
  isSubmitting: boolean;
  phone: string;
}

export function OtpGate({
  otp,
  setOtp,
  onVerify,
  onResend,
  onEditDetails,
  isSubmitting,
  phone,
}: OtpGateProps) {
  return (
    <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden text-left shadow-none">
      <CardHeader className="p-6 sm:p-8 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-primary shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              Phone Verification
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
              Sent to {phone || "your mobile number"}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 sm:p-8 space-y-6 text-center">
        <div className="space-y-2">
          <Label
            htmlFor="join-otp-input"
            className="text-xs font-semibold text-slate-600 block"
          >
            Enter 6-Digit Verification Code
          </Label>
          <Input
            id="join-otp-input"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
            placeholder="000000"
            className="h-16 text-center text-3xl sm:text-4xl font-bold font-mono tabular-nums tracking-[0.4em] rounded-xl bg-slate-50 border-slate-200"
          />
        </div>
        <div className="flex justify-between px-1">
          {onEditDetails ? (
            <button
              type="button"
              onClick={onEditDetails}
              className="text-xs font-medium text-slate-600 hover:underline"
            >
              Edit Details
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onResend}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Resend OTP
          </button>
        </div>
        <Button
          type="button"
          onClick={onVerify}
          disabled={isSubmitting || otp.length < 6}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-semibold text-sm rounded-xl text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...
            </>
          ) : (
            "Verify & Continue"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
