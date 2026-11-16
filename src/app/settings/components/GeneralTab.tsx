"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import {
  Building2,
  CheckCircle2,
  ImageIcon,
  Upload,
  ShieldCheck,
  Zap,
  Lock,
  Landmark,
  CreditCard,
  Hash,
  Info,
  MapPin,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui/editorial";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface GeneralTabProps {
  business: any;
  isAdmin: boolean;
  isTrialExpired: boolean;
  onUpdate: (data: any) => void;
}

export function GeneralTab({
  business,
  isAdmin,
  isTrialExpired,
  onUpdate,
}: GeneralTabProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const [localName, setLocalName] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  const [localPhone, setLocalPhone] = useState("");
  const [localBank, setLocalBank] = useState({
    accountName: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
  });

  useEffect(() => {
    if (business?.name) setLocalName(business.name);
    if (business?.address) setLocalAddress(business.address);
    if (business?.phone) setLocalPhone(business.phone);
    if (business?.bankDetails) {
      setLocalBank({
        accountName: business.bankDetails.accountName || "",
        bankName: business.bankDetails.bankName || "",
        accountNumber: business.bankDetails.accountNumber || "",
        ifsc: business.bankDetails.ifsc || "",
      });
    }
  }, [business]);

  const isBrandingActive = useMemo(() => {
    return (
      business?.activeAddonIds?.includes("feat_branding") ||
      business?.status === "pro"
    );
  }, [business]);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: "logoUrl" | "faviconUrl"
  ) => {
    if (!isBrandingActive) return;
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please upload an image smaller than 500KB.",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate({ [key]: reader.result as string });
        toast({ title: "Branding Updated" });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateBank = () => {
    onUpdate({ bankDetails: localBank });
    toast({ title: "Bank Details Updated" });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
      <div className="lg:col-span-8 space-y-6">
        <SectionCard
          title="Identity & Locale"
          description="Core company name, opening balance, default currency, and official billing address."
          headerRight={
            <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Building2 className="h-4 w-4" />
            </div>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="biz-legal-name" className="text-xs font-semibold text-slate-700">
                Business Legal Name
              </Label>
              <Input
                id="biz-legal-name"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                onBlur={(e) => onUpdate({ name: e.target.value })}
                disabled={!isAdmin || isTrialExpired}
                className="h-11 rounded-xl bg-white border-slate-200 text-sm font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="opening-balance" className="text-xs font-semibold text-slate-700">
                Opening Balance
              </Label>
              <Input
                id="opening-balance"
                type="number"
                value={business?.openingBalance || 0}
                onChange={(e) =>
                  onUpdate({ openingBalance: parseFloat(e.target.value) || 0 })
                }
                disabled={!isAdmin || isTrialExpired}
                className="h-11 rounded-xl bg-white border-slate-200 text-sm font-mono tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="opening-balance-date" className="text-xs font-semibold text-slate-700">
                Opening Balance Date
              </Label>
              <Input
                id="opening-balance-date"
                type="date"
                value={
                  business?.openingBalanceDate ||
                  new Date().toISOString().split("T")[0]
                }
                onChange={(e) =>
                  onUpdate({ openingBalanceDate: e.target.value })
                }
                disabled={!isAdmin || isTrialExpired}
                className="h-11 rounded-xl bg-white border-slate-200 text-sm font-mono tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-phone" className="text-xs font-semibold text-slate-700">
                Contact Phone (Global)
              </Label>
              <Input
                id="contact-phone"
                value={localPhone}
                onChange={(e) => setLocalPhone(e.target.value)}
                onBlur={(e) => onUpdate({ phone: e.target.value })}
                disabled={!isAdmin || isTrialExpired}
                className="h-11 rounded-xl bg-white border-slate-200 text-sm font-mono tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Default Currency
              </Label>
              <Select
                value={business?.currency || "INR"}
                onValueChange={(v) => onUpdate({ currency: v })}
                disabled={!isAdmin || isTrialExpired}
              >
                <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 text-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="INR" className="text-xs font-medium">
                    ₹ Indian Rupee (INR)
                  </SelectItem>
                  <SelectItem value="USD" className="text-xs font-medium">
                    $ US Dollar (USD)
                  </SelectItem>
                  <SelectItem value="EUR" className="text-xs font-medium">
                    € Euro (EUR)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="billing-address" className="text-xs font-semibold text-slate-700">
                Official Billing Address
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <Textarea
                  id="billing-address"
                  value={localAddress}
                  onChange={(e) => setLocalAddress(e.target.value)}
                  onBlur={(e) => onUpdate({ address: e.target.value })}
                  disabled={!isAdmin || isTrialExpired}
                  placeholder="Enter full business address for invoices"
                  className="min-h-[96px] pl-10 rounded-xl bg-white border-slate-200 text-sm"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Bank & Settlement Account"
          description="Displayed on A4 tax invoices for direct NEFT/RTGS/IMPS transfers."
          headerRight={
            <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Landmark className="h-4 w-4" />
            </div>
          }
        >
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="bank-account-name" className="text-xs font-semibold text-slate-700">
                  Beneficiary Name
                </Label>
                <Input
                  id="bank-account-name"
                  value={localBank.accountName}
                  onChange={(e) =>
                    setLocalBank({ ...localBank, accountName: e.target.value })
                  }
                  onBlur={handleUpdateBank}
                  className="h-11 rounded-xl bg-white border-slate-200 text-sm"
                  placeholder="Official Name for Payment"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank-name" className="text-xs font-semibold text-slate-700">
                  Bank Name
                </Label>
                <Input
                  id="bank-name"
                  value={localBank.bankName}
                  onChange={(e) =>
                    setLocalBank({ ...localBank, bankName: e.target.value })
                  }
                  onBlur={handleUpdateBank}
                  className="h-11 rounded-xl bg-white border-slate-200 text-sm"
                  placeholder="e.g. State Bank of India"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank-account-number" className="text-xs font-semibold text-slate-700">
                  Account Number
                </Label>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="bank-account-number"
                    value={localBank.accountNumber}
                    onChange={(e) =>
                      setLocalBank({
                        ...localBank,
                        accountNumber: e.target.value,
                      })
                    }
                    onBlur={handleUpdateBank}
                    className="h-11 pl-10 rounded-xl bg-white border-slate-200 text-sm font-mono tabular-nums"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank-ifsc" className="text-xs font-semibold text-slate-700">
                  IFSC Code
                </Label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="bank-ifsc"
                    value={localBank.ifsc}
                    onChange={(e) =>
                      setLocalBank({
                        ...localBank,
                        ifsc: e.target.value.toUpperCase(),
                      })
                    }
                    onBlur={handleUpdateBank}
                    className="h-11 pl-10 rounded-xl bg-white border-slate-200 text-sm font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                These details are automatically included in your printed and PDF A4 invoices.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Branding Assets"
          description="Custom company logo and browser favicon for invoices and storefront."
          headerRight={
            <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <ImageIcon className="h-4 w-4" />
            </div>
          }
          className="relative"
        >
          {!isBrandingActive && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Custom Branding Add-on</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Unlock custom logo and favicon uploads across invoices and portals.
                  </p>
                </div>
              </div>
              <Button
                asChild
                size="sm"
                className="bg-white text-slate-900 hover:bg-slate-100 h-9 px-4 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0"
              >
                <Link href="/marketplace">Upgrade Plan</Link>
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Main Logo</Label>
              <button
                type="button"
                disabled={!isBrandingActive || isTrialExpired}
                onClick={() =>
                  isBrandingActive &&
                  !isTrialExpired &&
                  logoInputRef.current?.click()
                }
                className={cn(
                  "w-full h-32 rounded-xl border border-dashed flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
                  business?.logoUrl
                    ? "border-slate-300 bg-slate-50 p-3"
                    : "border-slate-200 bg-slate-50/70 hover:bg-slate-50"
                )}
              >
                {business?.logoUrl ? (
                  <img
                    src={business.logoUrl}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-contain"
                    alt="Business Logo"
                  />
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-slate-400" />
                    <span className="text-xs font-medium text-slate-600">
                      Upload Logo (max 500KB)
                    </span>
                  </>
                )}
              </button>
              <input
                type="file"
                ref={logoInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, "logoUrl")}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Favicon</Label>
              <button
                type="button"
                disabled={!isBrandingActive || isTrialExpired}
                onClick={() =>
                  isBrandingActive &&
                  !isTrialExpired &&
                  faviconInputRef.current?.click()
                }
                className={cn(
                  "w-full h-32 rounded-xl border border-dashed flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
                  business?.faviconUrl
                    ? "border-slate-300 bg-slate-50 p-6"
                    : "border-slate-200 bg-slate-50/70 hover:bg-slate-50"
                )}
              >
                {business?.faviconUrl ? (
                  <img
                    src={business.faviconUrl}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-contain"
                    alt="Business Favicon"
                  />
                ) : (
                  <>
                    <Zap className="h-5 w-5 text-slate-400" />
                    <span className="text-xs font-medium text-slate-600">
                      Upload Favicon (max 500KB)
                    </span>
                  </>
                )}
              </button>
              <input
                type="file"
                ref={faviconInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, "faviconUrl")}
              />
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="lg:col-span-4 space-y-6">
        <SectionCard
          title="Invoice Readiness"
          description="Verification summary for customer-facing tax documents."
          headerRight={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
        >
          <div className="space-y-3 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Business name, billing address, and bank account details sync directly to all A4 PDF invoices and quotations.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Opening balance and currency settings apply immediately across your daily ledger and P&amp;L reports.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
