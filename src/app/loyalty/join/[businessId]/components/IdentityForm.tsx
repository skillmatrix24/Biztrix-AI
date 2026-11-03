
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

export function IdentityForm({ formData, setFormData, onSubmit, isOtpSending }: IdentityFormProps) {
  return (
    <Card className="border-none shadow-xl bg-white rounded-[2rem] sm:rounded-[3rem] overflow-hidden border animate-in slide-in-from-bottom-10 duration-700 mx-2 text-left">
      <CardHeader className="p-8 sm:p-12 pb-0">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-inner">
            <UserPlus className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div className="text-left">
            <h3 className="text-base sm:text-xl font-black uppercase tracking-widest text-slate-900 leading-none">Join Now Section</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-2 tracking-widest opacity-60">Identity Establishment</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 sm:p-12 space-y-8">
        <form onSubmit={onSubmit} className="space-y-6 text-left">
          <div className="space-y-2 text-left">
            <Label className="text-[11px] font-black uppercase text-slate-500 ml-1">Legal Full Name *</Label>
            <Input 
              required 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
              className="h-14 sm:h-16 rounded-2xl font-black bg-muted/20 border-none shadow-inner text-lg sm:text-xl" 
            />
          </div>
          <div className="space-y-2 text-left">
            <Label className="text-[11px] font-black uppercase text-slate-500 ml-1">WhatsApp Identity *</Label>
            <Input 
              required 
              value={formData.phone} 
              onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} 
              placeholder="91XXXXXXXX" 
              className="h-14 sm:h-16 rounded-2xl font-black bg-muted/20 border-none shadow-inner text-lg sm:text-xl tracking-[0.2em]" 
            />
          </div>
          <div className="space-y-2 text-left">
             <Label className="text-[11px] font-black uppercase text-slate-500 ml-1">Referral Code (Optional)</Label>
             <div className="relative">
                <Gift className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary opacity-40" />
                <Input 
                  value={formData.referralId} 
                  onChange={(e) => setFormData({...formData, referralId: e.target.value.toUpperCase()})} 
                  placeholder="BIZ-XXXX" 
                  className="h-14 sm:h-16 pl-12 rounded-2xl font-black bg-primary/5 border-none shadow-inner text-lg tracking-widest" 
                />
             </div>
          </div>
          <Button 
            type="submit" 
            disabled={isOtpSending} 
            className="w-full h-16 sm:h-20 bg-primary font-black uppercase text-xs sm:text-sm tracking-[0.2em] rounded-2xl sm:rounded-[2rem] shadow-2xl active:scale-95 transition-all text-white"
          >
            {isOtpSending ? <Loader2 className="h-8 w-8 animate-spin" /> : "Transmit Secure OTP"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
