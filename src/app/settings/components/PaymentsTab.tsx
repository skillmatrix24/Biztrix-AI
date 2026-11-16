"use client";

import { CreditCard, Plus, SmartphoneNfc, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateDocumentNonBlocking } from "@/firebase";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/editorial";
import { useState } from "react";
import Link from "next/link";

interface PaymentsTabProps {
  business: any;
  businessRef: any;
  isAdmin: boolean;
  isTrialExpired: boolean;
}

export function PaymentsTab({
  business,
  businessRef,
  isTrialExpired,
}: PaymentsTabProps) {
  const [newMode, setNewMode] = useState("");
  const dynamicModes = business?.paymentModes || [
    "Cash",
    "UPI",
    "Card",
    "Bank Transfer",
  ];

  const handleAddMode = () => {
    if (!newMode.trim() || !businessRef) return;
    if (dynamicModes.includes(newMode.trim())) return;
    updateDocumentNonBlocking(businessRef, {
      paymentModes: [...dynamicModes, newMode.trim()],
    });
    setNewMode("");
    toast({ title: "Payment Mode Added" });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
      <div className="lg:col-span-8 space-y-6">
        <SectionCard
          title="POS Payment Methods"
          description="Accepted offline and manual payment labels available at checkout."
          headerRight={<CreditCard className="h-4 w-4 text-slate-500" />}
        >
          <div className="space-y-5">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. PhonePe, Sodexo, Cheque"
                value={newMode}
                onChange={(e) => setNewMode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddMode()}
                className="h-10 rounded-xl bg-white border-slate-200 text-sm"
              />
              <Button
                type="button"
                disabled={isTrialExpired || !newMode.trim()}
                onClick={handleAddMode}
                aria-label="Add payment method"
                className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white whitespace-nowrap shrink-0"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Method
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {dynamicModes.map((m: string) => (
                <span
                  key={m}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </SectionCard>

        <div className="rounded-2xl bg-slate-900 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <SmartphoneNfc className="h-5 w-5 text-white" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Online Payment Gateways</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect Stripe, Razorpay, or Paytm Business for automated payment links and settlement tracking.
              </p>
            </div>
          </div>
          <Button
            asChild
            className="bg-white text-slate-900 hover:bg-slate-100 h-10 px-5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0"
          >
            <Link href="/settings/gateways">
              Configure Gateways <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
