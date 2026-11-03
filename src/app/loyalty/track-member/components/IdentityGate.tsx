"use client";

import { Lock, Smartphone, Loader2, BadgeCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface IdentityGateProps {
  foundMember: any;
  onSendOtp: () => void;
  onDirectAccess: () => void;
  isAdminOrStaff: boolean;
  state: string;
  authError: string | null;
}

export function IdentityGate({ foundMember, onSendOtp, onDirectAccess, isAdminOrStaff, state, authError }: IdentityGateProps) {
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
        {authError && (
          <Alert variant="destructive" className="rounded-2xl bg-red-50 border-red-100 text-red-600 animate-in slide-in-from-top-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-[10px] font-black uppercase ml-2">{authError}</AlertDescription>
          </Alert>
        )}

        <div className="text-center space-y-8 py-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-600 leading-relaxed uppercase tracking-tight">
              Security Protocol: Verify ownership for member <span className="font-black text-primary">{foundMember?.customerName}</span>.
            </p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Phone node ending in ...{foundMember?.phone?.slice(-4) || 'XXXX'}</p>
          </div>

          <div className="flex flex-col gap-4">
            {isAdminOrStaff && (
              <div className="p-6 bg-green-50 rounded-[2rem] border-2 border-dashed border-green-200 space-y-4">
                 <div className="flex items-center gap-3 justify-center">
                    <BadgeCheck className="h-5 w-5 text-green-600" />
                    <span className="text-[10px] font-black uppercase text-green-700">Admin Bypass Node Active</span>
                 </div>
                 <Button 
                    onClick={onDirectAccess}
                    className="w-full h-14 bg-green-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl hover:bg-green-700 transition-all active:scale-95"
                  >
                    Direct Access (No OTP)
                  </Button>
              </div>
            )}

            <Button 
              onClick={onSendOtp} 
              disabled={state === "verifying-otp"} 
              className={cn(
                "w-full h-16 font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl transition-all active:scale-95",
                isAdminOrStaff ? "bg-white text-primary border-2 border-primary/20 hover:bg-primary/5" : "bg-primary text-white"
              )}
            >
              {state === "verifying-otp" ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify with OTP"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
