
"use client";

import { CreditCard, Wallet, Plus, SmartphoneNfc, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateDocumentNonBlocking } from "@/firebase";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import Link from "next/link";

interface PaymentsTabProps {
  business: any;
  businessRef: any;
  isAdmin: boolean;
  isTrialExpired: boolean;
}

export function PaymentsTab({ business, businessRef, isAdmin, isTrialExpired }: PaymentsTabProps) {
  const [newMode, setNewMode] = useState("");
  const dynamicModes = business?.paymentModes || ["Cash", "UPI", "Card", "Bank Transfer"];

  const handleAddMode = () => {
    if (!newMode.trim() || !businessRef) return;
    if (dynamicModes.includes(newMode.trim())) return;
    updateDocumentNonBlocking(businessRef, { paymentModes: [...dynamicModes, newMode.trim()] });
    setNewMode("");
    toast({ title: "Payment Mode Added" });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="md:col-span-8 space-y-6">
        <Card className="border-none shadow-md bg-white rounded-2xl border">
          <CardHeader className="bg-primary/5 border-b py-5 px-6">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> POS Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex gap-2">
              <Input placeholder="e.g. PhonePe / Sodexo" value={newMode} onChange={(e) => setNewMode(e.target.value)} className="h-11 rounded-xl" />
              <Button disabled={isTrialExpired} onClick={handleAddMode} className="h-11 px-4 rounded-xl"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {dynamicModes.map((m: string) => (
                <Badge key={m} variant="secondary" className="h-9 px-4 rounded-xl text-xs font-bold uppercase bg-muted text-primary border-none">{m}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-slate-900 text-white rounded-3xl overflow-hidden group">
          <CardContent className="p-8 flex items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20 group-hover:scale-110 transition-transform">
                <SmartphoneNfc className="h-7 w-7 text-accent" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold uppercase tracking-tight">Payment Gateways</h3>
                <p className="text-[10px] text-slate-400 font-medium">Connect Stripe, Razorpay or Paytm for automated collections.</p>
              </div>
            </div>
            <Button asChild className="bg-accent text-primary h-11 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl">
              <Link href="/settings/gateways">Configure Gateways <ArrowRight className="ml-2 h-3.5 w-3.5" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
