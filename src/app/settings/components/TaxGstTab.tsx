"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Percent,
  Zap,
  Calendar,
  Plus,
  X,
  Globe,
  ExternalLink,
  Search,
  CheckCircle2,
  Hash,
  Clock,
  ShieldCheck,
  Info,
  Loader2,
  RefreshCcw,
  Star,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { KpiStatCard, SectionCard } from "@/components/ui/editorial";
import {
  updateDocumentNonBlocking,
  useCollection,
  useMemoFirebase,
  useFirestore,
} from "@/firebase";
import { toast } from "@/hooks/use-toast";
import { subMonths, startOfMonth, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { collection, query, where, Timestamp } from "firebase/firestore";
import { EWayGspConfigPanel } from "@/components/eway/EWayGspConfigPanel";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Chandigarh",
];

interface TaxGstTabProps {
  business: any;
  businessRef: any;
  isAdmin: boolean;
  isTrialExpired: boolean;
  currencySymbol: string;
}

export function TaxGstTab({
  business,
  businessRef,
  isAdmin,
  isTrialExpired,
  currencySymbol,
}: TaxGstTabProps) {
  const firestore = useFirestore();
  const [newGstSlab, setNewGstSlab] = useState("");
  const [newHsnCode, setNewHsnCode] = useState("");
  const [gstTimeFilter, setGstTimeFilter] = useState("thisMonth");
  const [, setIsUpdating] = useState(false);

  const [localGstin, setLocalGstin] = useState("");

  useEffect(() => {
    if (business?.gstin) setLocalGstin(business.gstin);
  }, [business?.gstin]);

  const cashbookQuery = useMemoFirebase(() => {
    if (!business?.id) return null;
    let start = startOfMonth(new Date());
    if (gstTimeFilter === "lastMonth")
      start = startOfMonth(subMonths(new Date(), 1));
    else if (gstTimeFilter === "today") start = startOfDay(new Date());
    else if (gstTimeFilter === "allTime") start = new Date(2000, 0, 1);

    return query(
      collection(firestore, "businesses", business.id, "cashbook"),
      where("createdAt", ">=", Timestamp.fromDate(start))
    );
  }, [firestore, business?.id, gstTimeFilter]);

  const { data: transactions, isLoading: isStatsLoading } =
    useCollection<any>(cashbookQuery);

  const dynamicGstSlabs = business?.gstSlabs || [0, 5, 12, 18, 28];
  const hsnCodes = business?.hsnRegistry || ["8471", "8517", "8544", "9403"];
  const defaultGstRate = business?.defaultGstRate?.toString() || "18";

  const gstSummary = useMemo(() => {
    const list = transactions || [];
    return list.reduce(
      (acc: any, t: any) => {
        if (t.type === "credit" && t.category === "Sales") {
          const amount = parseFloat(t.amount) || 0;
          const rate = parseFloat(t.gstRate) || parseFloat(defaultGstRate);
          const base = amount / (1 + rate / 100);
          const tax = amount - base;

          acc.total += tax;
          if (t.isInterState) {
            acc.igst += tax;
          } else {
            acc.cgst += tax / 2;
            acc.sgst += tax / 2;
          }
        }
        return acc;
      },
      { cgst: 0, sgst: 0, igst: 0, total: 0 }
    );
  }, [transactions, defaultGstRate]);

  const handleUpdateField = (data: any) => {
    if (!isAdmin || !businessRef) return;
    setIsUpdating(true);
    updateDocumentNonBlocking(businessRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    setTimeout(() => {
      setIsUpdating(false);
    }, 400);
  };

  const handleAddGstSlab = () => {
    if (!newGstSlab.trim() || !businessRef) return;
    const slab = parseFloat(newGstSlab);
    if (isNaN(slab)) return;
    if (dynamicGstSlabs.includes(slab)) {
      toast({
        variant: "destructive",
        title: "Duplicate Slab",
        description: `${slab}% already exists.`,
      });
      return;
    }
    const newSlabs = [...dynamicGstSlabs, slab].sort((a, b) => a - b);
    handleUpdateField({ gstSlabs: newSlabs });
    setNewGstSlab("");
    toast({ title: "Slab Added" });
  };

  const removeGstSlab = (slab: number) => {
    if (!businessRef || !isAdmin) return;
    const newSlabs = dynamicGstSlabs.filter((s: number) => s !== slab);
    const updates: any = { gstSlabs: newSlabs };
    if (business?.defaultGstRate === slab) {
      updates.defaultGstRate = newSlabs.length > 0 ? newSlabs[0] : 0;
    }
    handleUpdateField(updates);
    toast({ title: "Slab Removed" });
  };

  const handleAddHsn = () => {
    if (!newHsnCode.trim() || !businessRef) return;
    const cleanCode = newHsnCode.trim();
    if (hsnCodes.includes(cleanCode)) {
      toast({
        variant: "destructive",
        title: "Duplicate",
        description: "HSN already in registry.",
      });
      return;
    }
    const newHsn = [...hsnCodes, cleanCode].sort();
    handleUpdateField({ hsnRegistry: newHsn });
    setNewHsnCode("");
    toast({ title: "HSN Added" });
  };

  const removeHsn = (code: string) => {
    if (!isAdmin) return;
    const newHsn = hsnCodes.filter((c: string) => c !== code);
    handleUpdateField({ hsnRegistry: newHsn });
    toast({ title: "HSN Removed" });
  };

  return (
    <div className="space-y-6 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  GST Liability Summary
                </h3>
                <p className="text-xs text-slate-500">
                  Estimated output tax split across intra-state and inter-state sales.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isStatsLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                )}
                <Select value={gstTimeFilter} onValueChange={setGstTimeFilter}>
                  <SelectTrigger className="h-9 w-44 rounded-xl text-xs font-medium bg-white border-slate-200">
                    <Calendar className="mr-2 h-3.5 w-3.5 text-slate-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="today" className="text-xs">
                      Today
                    </SelectItem>
                    <SelectItem value="thisMonth" className="text-xs">
                      This Month
                    </SelectItem>
                    <SelectItem value="lastMonth" className="text-xs">
                      Last Month
                    </SelectItem>
                    <SelectItem value="customRange" className="text-xs">
                      Custom Range
                    </SelectItem>
                    <SelectItem value="allTime" className="text-xs">
                      All Time
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiStatCard
                label="Total Liability"
                value={`${currencySymbol}${gstSummary.total.toLocaleString()}`}
                icon={Percent}
                tone="dark"
              />
              <KpiStatCard
                label="CGST (Intra)"
                value={`${currencySymbol}${gstSummary.cgst.toLocaleString()}`}
              />
              <KpiStatCard
                label="SGST (Intra)"
                value={`${currencySymbol}${gstSummary.sgst.toLocaleString()}`}
              />
              <KpiStatCard
                label="IGST (Inter)"
                value={`${currencySymbol}${gstSummary.igst.toLocaleString()}`}
                tone="warning"
              />
            </div>
          </div>

          <SectionCard
            title="GST Registration & Tax Rules"
            description="Manage your GSTIN, home state for place-of-supply calculations, and pricing mode."
            headerRight={
              <div className="flex items-center gap-2.5">
                <Label htmlFor="gst-enabled-switch" className="text-xs font-medium text-slate-600">
                  GST Active
                </Label>
                <Switch
                  id="gst-enabled-switch"
                  disabled={!isAdmin || isTrialExpired}
                  checked={!!business?.gstEnabled}
                  onCheckedChange={(v) => handleUpdateField({ gstEnabled: v })}
                />
              </div>
            }
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="biz-gstin" className="text-xs font-semibold text-slate-700">
                    Business GSTIN
                  </Label>
                  <Input
                    id="biz-gstin"
                    disabled={!isAdmin || isTrialExpired}
                    value={localGstin}
                    onChange={(e) => setLocalGstin(e.target.value.toUpperCase())}
                    onBlur={(e) =>
                      handleUpdateField({ gstin: e.target.value.toUpperCase() })
                    }
                    placeholder="27AAAAA0000A1Z5"
                    className="h-11 rounded-xl font-mono text-sm uppercase tracking-wide bg-white border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Home State
                  </Label>
                  <Select
                    disabled={!isAdmin || isTrialExpired}
                    value={business?.state || "Maharashtra"}
                    onValueChange={(v) => handleUpdateField({ state: v })}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 text-sm font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 rounded-xl">
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs font-medium">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="composition-scheme-switch" className="text-xs font-semibold text-slate-900">
                      Composition Scheme Taxpayer
                    </Label>
                    <p className="text-xs text-slate-500">
                      Enable if registered under Composition Scheme without Input Tax Credit (ITC).
                    </p>
                  </div>
                  <Switch
                    id="composition-scheme-switch"
                    disabled={!isAdmin || isTrialExpired}
                    checked={!!business?.isCompositionScheme}
                    onCheckedChange={(v) =>
                      handleUpdateField({ isCompositionScheme: v })
                    }
                  />
                </div>
                {business?.isCompositionScheme && (
                  <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-700">
                    <Info className="h-4 w-4 text-slate-500 shrink-0" />
                    <span>
                      Invoices will automatically generate as &ldquo;Bill of Supply&rdquo; instead of Tax Invoices.
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-semibold text-slate-700">
                  Tax Calculation Mode
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    disabled={!isAdmin || isTrialExpired}
                    onClick={() => handleUpdateField({ gstMode: "exclusive" })}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-colors relative",
                      business?.gstMode !== "inclusive"
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    {business?.gstMode !== "inclusive" && (
                      <CheckCircle2 className="absolute top-3.5 right-3.5 h-4 w-4 text-slate-900" />
                    )}
                    <div className="flex items-center gap-2 mb-1.5">
                      <Zap className="h-4 w-4 text-slate-900" />
                      <span className="text-xs font-bold text-slate-900">
                        Tax Exclusive (Forward)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      GST is added on top of unit price (Base + GST = Net).
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={!isAdmin || isTrialExpired}
                    onClick={() => handleUpdateField({ gstMode: "inclusive" })}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-colors relative",
                      business?.gstMode === "inclusive"
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    {business?.gstMode === "inclusive" && (
                      <CheckCircle2 className="absolute top-3.5 right-3.5 h-4 w-4 text-slate-900" />
                    )}
                    <div className="flex items-center gap-2 mb-1.5">
                      <RefreshCcw className="h-4 w-4 text-slate-900" />
                      <span className="text-xs font-bold text-slate-900">
                        Tax Inclusive (MRP)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Unit price includes GST (Base = Net / (1 + Rate%)).
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SectionCard
              title="HSN Registry"
              description="Saved HSN/SAC codes for quick selection."
              headerRight={<Hash className="h-4 w-4 text-slate-400" />}
            >
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newHsnCode}
                    onChange={(e) => setNewHsnCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddHsn()}
                    placeholder="Enter HSN code"
                    className="h-9 text-xs font-mono rounded-lg bg-white border-slate-200"
                  />
                  <Button
                    type="button"
                    onClick={handleAddHsn}
                    size="icon"
                    aria-label="Add HSN code"
                    className="h-9 w-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {hsnCodes.map((code: string) => (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono text-slate-800"
                    >
                      {code}
                      <button
                        type="button"
                        aria-label={`Remove HSN ${code}`}
                        onClick={() => removeHsn(code)}
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="GST Tax Slabs"
              description="Available tax rates and default POS rate."
              headerRight={<Percent className="h-4 w-4 text-slate-400" />}
            >
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={newGstSlab}
                    onChange={(e) => setNewGstSlab(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddGstSlab()}
                    placeholder="Rate %"
                    className="h-9 text-xs font-mono rounded-lg bg-white border-slate-200"
                  />
                  <Button
                    type="button"
                    onClick={handleAddGstSlab}
                    size="icon"
                    aria-label="Add GST slab"
                    className="h-9 w-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {dynamicGstSlabs.map((slab: number) => {
                    const isDefault = parseFloat(defaultGstRate) === slab;
                    return (
                      <span
                        key={slab}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-medium",
                          isDefault
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-800"
                        )}
                      >
                        {slab}% GST
                        {isDefault && <Star className="h-3 w-3 fill-current" />}
                        <button
                          type="button"
                          aria-label={`Remove ${slab}% GST slab`}
                          onClick={() => removeGstSlab(slab)}
                          className={cn(
                            "transition-colors",
                            isDefault
                              ? "text-slate-300 hover:text-white"
                              : "text-slate-400 hover:text-rose-600"
                          )}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Default POS Slab
                  </Label>
                  <Select
                    disabled={!isAdmin || isTrialExpired}
                    value={defaultGstRate}
                    onValueChange={(v) =>
                      handleUpdateField({ defaultGstRate: parseFloat(v) })
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 font-mono text-xs font-semibold text-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {dynamicGstSlabs.map((slab: number) => (
                        <SelectItem
                          key={slab}
                          value={slab.toString()}
                          className="text-xs font-mono"
                        >
                          {slab}% GST
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SectionCard>
          </div>

          {business?.id && (
            <EWayGspConfigPanel
              businessId={business.id}
              business={business}
              isAdmin={isAdmin}
              isTrialExpired={isTrialExpired}
            />
          )}

          <Alert className="bg-slate-50 border-slate-200 text-slate-800 rounded-2xl">
            <Clock className="h-4 w-4 text-slate-700" />
            <AlertTitle className="text-xs font-bold text-slate-900">
              Monthly Filing Reminder
            </AlertTitle>
            <AlertDescription className="text-xs text-slate-600 leading-relaxed">
              Upload GSTR-1 by the 11th of each month so B2B buyers receive timely Input Tax Credit (ITC) reflection.
            </AlertDescription>
          </Alert>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">
          <SectionCard
            title="Filing Deadlines"
            description="Standard monthly GST return dates."
            headerRight={<Clock className="h-4 w-4 text-slate-400" />}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-900">GSTR-1</p>
                  <p className="text-xs text-slate-500">Outward Supplies</p>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-900">
                  11th monthly
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">GSTR-3B</p>
                  <p className="text-xs text-slate-500">Summary &amp; Tax Payment</p>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-900">
                  20th monthly
                </span>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="GST Reference"
            description="Quick rules and official government links."
            headerRight={<Globe className="h-4 w-4 text-slate-400" />}
          >
            <div className="space-y-5">
              <div className="space-y-2.5 text-xs text-slate-600">
                <p>
                  <strong className="text-slate-900">Intra-state sales:</strong> Split 50/50 into CGST + SGST.
                </p>
                <p>
                  <strong className="text-slate-900">Inter-state sales:</strong> Charged as consolidated IGST.
                </p>
              </div>

              <Separator className="bg-slate-100" />

              <div className="space-y-2.5">
                <Button
                  variant="outline"
                  className="w-full h-10 justify-between rounded-xl border-slate-200 text-slate-800 hover:bg-slate-50 text-xs font-semibold"
                  asChild
                >
                  <a
                    href="https://www.gst.gov.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>Official GST Portal</span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-10 justify-between rounded-xl border-slate-200 text-slate-800 hover:bg-slate-50 text-xs font-semibold"
                  asChild
                >
                  <a
                    href="https://tools.gst.gov.in/hsn-finder"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>HSN Code Finder</span>
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                  </a>
                </Button>
              </div>
            </div>
          </SectionCard>

          <div className="p-6 bg-slate-900 text-white rounded-2xl space-y-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <p className="text-xs font-semibold text-slate-200">
                Ledger Compliance Sync
              </p>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <span className="font-mono font-semibold text-white">
                {(transactions || []).length}
              </span>{" "}
              transactions scanned for the selected period to compute real-time GST liability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
