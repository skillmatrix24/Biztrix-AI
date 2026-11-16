"use client";

import { Lock, Smartphone, Loader2, BadgeCheck, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface IdentityGateProps {
  foundMember: any;
  onSendOtp: () => void;
  onDirectAccess: () => void;
  isAdminOrStaff: boolean;
  state: string;
  authError: string | null;
}

export function IdentityGate({
  foundMember,
  onSendOtp,
  onDirectAccess,
  isAdminOrStaff,
  state,
  authError,
}: IdentityGateProps) {
  return (
    <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden text-left shadow-none">
      <CardHeader className="p-6 sm:p-8 bg-slate-900 text-white text-center border-b border-slate-800">
        <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4 border border-white/15">
          <Smartphone className="h-7 w-7 text-white" />
        </div>
        <CardTitle className="text-xl font-bold">Member Verification</CardTitle>
      </CardHeader>
      <CardContent className="p-6 sm:p-8 space-y-6">
        {authError && (
          <Alert
            variant="destructive"
            className="rounded-xl bg-red-50 border-red-200 text-red-700"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs font-medium ml-1">
              {authError}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-center space-y-6 py-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700 leading-relaxed">
              Verify ownership for member{" "}
              <span className="font-bold text-primary">
                {foundMember?.customerName}
              </span>
              .
            </p>
            <p className="text-xs text-slate-500 font-mono tabular-nums">
              Registered phone ending in ...
              {foundMember?.phone?.slice(-4) || "XXXX"}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {isAdminOrStaff && (
              <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2 justify-center text-emerald-800">
                  <BadgeCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-semibold">
                    Staff Verification Shortcut Active
                  </span>
                </div>
                <Button
                  type="button"
                  onClick={onDirectAccess}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl"
                >
                  Open Member Portal Directly
                </Button>
              </div>
            )}

            <Button
              type="button"
              onClick={onSendOtp}
              disabled={state === "verifying-otp"}
              className={cn(
                "w-full h-12 font-semibold text-xs rounded-xl",
                isAdminOrStaff
                  ? "bg-white text-primary border border-slate-200 hover:bg-slate-50"
                  : "bg-primary text-white"
              )}
            >
              {state === "verifying-otp" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending
                  OTP...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" /> Send Verification OTP
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
