"use client";

import { UserPlus, Gift, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface IdentityFormProps {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  isOtpSending: boolean;
}

export function IdentityForm({
  formData,
  setFormData,
  onSubmit,
  isOtpSending,
}: IdentityFormProps) {
  return (
    <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden text-left shadow-none">
      <CardHeader className="p-6 sm:p-8 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-primary shrink-0">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              Member Enrollment Details
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify your phone number to activate your membership card.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 sm:p-8">
        <form onSubmit={onSubmit} className="space-y-5 text-left">
          <div className="space-y-1.5">
            <Label
              htmlFor="join-name"
              className="text-xs font-semibold text-slate-700"
            >
              Full Name *
            </Label>
            <Input
              id="join-name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter your full name"
              className="h-12 rounded-xl bg-slate-50 border-slate-200 text-base font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="join-phone"
              className="text-xs font-semibold text-slate-700"
            >
              WhatsApp Mobile Number *
            </Label>
            <Input
              id="join-phone"
              required
              value={formData.phone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  phone: e.target.value.replace(/\D/g, ""),
                })
              }
              placeholder="98XXXXXXXX"
              className="h-12 rounded-xl bg-slate-50 border-slate-200 text-base font-mono tabular-nums tracking-wider"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="join-referral"
              className="text-xs font-semibold text-slate-700"
            >
              Referral Code (Optional)
            </Label>
            <div className="relative">
              <Gift className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="join-referral"
                value={formData.referralId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    referralId: e.target.value.toUpperCase(),
                  })
                }
                placeholder="BIZ-XXXX"
                className="h-12 pl-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-mono font-semibold tracking-wider"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={isOtpSending}
            className="w-full h-12 bg-primary font-semibold text-sm rounded-xl text-white"
          >
            {isOtpSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending OTP...
              </>
            ) : (
              "Send Verification OTP"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
