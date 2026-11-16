"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  ArrowRight,
  Loader2,
  Sparkles,
  DatabaseZap,
  BadgeCheck,
  Ticket,
  Crown,
  Power,
  SmartphoneNfc,
  Type,
  Calculator,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, EmptyStatePanel } from "@/components/ui/editorial";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
  setDocumentNonBlocking,
} from "@/firebase";
import { collection, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { calculateGST } from "@/lib/mock-db";
import { ScrollArea } from "@/components/ui/scroll-area";

const DEFAULT_TIERS = [
  {
    id: "silver",
    name: "Silver",
    minSpend: 0,
    pointsMultiplier: 1,
    cashbackPercent: 0,
    color: "#64748b",
    status: "active",
    benefits: ["Basic Rewards", "Email Support"],
    linkedCouponIds: [],
    gstRate: 18,
  },
  {
    id: "gold",
    name: "Gold",
    minSpend: 5000,
    pointsMultiplier: 1.2,
    cashbackPercent: 1,
    color: "#d97706",
    status: "active",
    benefits: ["1.2x Points", "Birthday Bonus", "Priority Service"],
    linkedCouponIds: [],
    gstRate: 18,
  },
  {
    id: "platinum",
    name: "Platinum",
    minSpend: 15000,
    pointsMultiplier: 1.5,
    cashbackPercent: 2,
    color: "#334155",
    status: "active",
    benefits: ["1.5x Points", "2% Cashback", "Exclusive Previews", "Dedicated Manager"],
    linkedCouponIds: [],
    gstRate: 18,
  },
  {
    id: "vip",
    name: "VIP",
    minSpend: 50000,
    pointsMultiplier: 2,
    cashbackPercent: 5,
    color: "#6d28d9",
    status: "active",
    benefits: ["2x Points", "5% Cashback", "Home Visit Service", "Voucher Bundles"],
    linkedCouponIds: [],
    gstRate: 18,
  },
  {
    id: "elite",
    name: "Elite",
    minSpend: 100000,
    pointsMultiplier: 2.5,
    cashbackPercent: 7,
    color: "#be185d",
    status: "active",
    benefits: ["2.5x Points", "7% Cashback", "Global Access", "Luxury Lounge"],
    linkedCouponIds: [],
    gstRate: 18,
  },
  {
    id: "legend",
    name: "Legend",
    minSpend: 250000,
    pointsMultiplier: 3,
    cashbackPercent: 10,
    color: "#0f172a",
    status: "active",
    benefits: ["3x Points", "10% Cashback", "Lifetime Warranty", "Founder Circle Access"],
    linkedCouponIds: [],
    gstRate: 18,
  },
];

const DEFAULT_GST_SLABS = [0, 5, 12, 18, 28];

export default function LoyaltyTiersPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const tiersQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "loyaltyTiers"),
            orderBy("minSpend", "asc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: tiersRaw, isLoading } = useCollection<any>(tiersQuery);
  const tiers = tiersRaw || [];

  const couponsQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "coupons") : null),
    [firestore, businessId]
  );
  const { data: couponsRaw } = useCollection<any>(couponsQuery);
  const coupons = couponsRaw || [];

  const [editingTier, setEditingTier] = useState<any>(null);
  const [newBenefit, setNewBenefit] = useState("");

  const dynamicGstSlabs = business?.gstSlabs || DEFAULT_GST_SLABS;

  const handleSeedDefaults = () => {
    if (!businessId) return;
    DEFAULT_TIERS.forEach((tier) => {
      const docRef = doc(firestore, "businesses", businessId, "loyaltyTiers", tier.id);
      setDocumentNonBlocking(docRef, { ...tier, createdAt: serverTimestamp() }, { merge: true });
    });
    toast({
      title: "Tiers Initialized",
      description: "Default membership structure has been deployed.",
    });
  };

  const handleSaveTier = () => {
    if (!businessId || !editingTier) return;
    const docRef = doc(firestore, "businesses", businessId, "loyaltyTiers", editingTier.id);
    setDocumentNonBlocking(
      docRef,
      { ...editingTier, updatedAt: serverTimestamp() },
      { merge: true }
    );
    setEditingTier(null);
    toast({ title: "Membership Tier Updated" });
  };

  const addBenefit = () => {
    if (!newBenefit.trim() || !editingTier) return;
    setEditingTier({
      ...editingTier,
      benefits: [...(editingTier.benefits || []), newBenefit.trim()],
    });
    setNewBenefit("");
  };

  const removeBenefit = (index: number) => {
    if (!editingTier) return;
    setEditingTier({
      ...editingTier,
      benefits: editingTier.benefits.filter((_: any, i: number) => i !== index),
    });
  };

  const toggleCoupon = (couponId: string) => {
    if (!editingTier) return;
    const current = editingTier.linkedCouponIds || [];
    const updated = current.includes(couponId)
      ? current.filter((id: string) => id !== couponId)
      : [...current, couponId];
    setEditingTier({ ...editingTier, linkedCouponIds: updated });
  };

  const currencySymbol = getCurrencySymbol(business?.currency || "INR");

  const gstBreakdown = useMemo(() => {
    if (!editingTier) return null;
    const amount = parseFloat(editingTier.minSpend) || 0;
    const rate = parseFloat(editingTier.gstRate) || 0;
    return calculateGST(amount, rate, false, "exclusive");
  }, [editingTier?.minSpend, editingTier?.gstRate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-left">
      <PageHeader
        title="Tier Privilege Manager"
        description="Configure membership levels, entry fees, GST slabs, and bundled offers."
        breadcrumb="Loyalty / Tiers"
        backHref="/loyalty"
        backLabel="Back to Loyalty"
        actions={
          <Button
            type="button"
            onClick={handleSeedDefaults}
            variant="outline"
            className="h-10 px-4 rounded-xl text-xs font-semibold"
          >
            <DatabaseZap className="mr-2 h-4 w-4" /> Reset / Seed Defaults
          </Button>
        }
      />

      {tiers.length === 0 ? (
        <EmptyStatePanel
          icon={Crown}
          title="No loyalty tiers configured"
          description="Deploy the default 6-tier membership structure or customize privileges and pricing."
          action={
            <Button
              type="button"
              onClick={handleSeedDefaults}
              className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              <DatabaseZap className="mr-2 h-4 w-4" /> Seed Default Tiers
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={cn(
                "rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col transition-colors",
                tier.status !== "active" && "opacity-70"
              )}
            >
              <div
                className="p-6 text-white relative overflow-hidden shrink-0 aspect-[1.85/1] flex flex-col justify-between"
                style={{ backgroundColor: tier.color || "#0f172a" }}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-1 min-w-0">
                    <span className="inline-block text-xs font-medium text-white/80">
                      {tier.status === "active" ? "Active Tier" : "Hidden Tier"}
                    </span>
                    <h3 className="text-xl font-bold tracking-tight truncate">{tier.name}</h3>
                  </div>
                  <Crown className="h-6 w-6 text-white/40 shrink-0" />
                </div>
                <div className="flex justify-between items-end pt-4 border-t border-white/15">
                  <div>
                    <p className="text-xs text-white/75">Entry Fee (Incl. GST)</p>
                    <p className="text-xl font-bold font-mono tabular-nums">
                      {currencySymbol}
                      {Math.round(
                        (tier.minSpend || 0) * (1 + (tier.gstRate || 0) / 100)
                      ).toLocaleString()}
                    </p>
                  </div>
                  <div className="h-9 w-9 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center">
                    <SmartphoneNfc className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="p-5 flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <p className="text-xs text-slate-500">Multiplier</p>
                    <p className="text-base font-bold font-mono text-slate-900 tabular-nums mt-0.5">
                      {tier.pointsMultiplier || 1}x
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <p className="text-xs text-slate-500">Cashback</p>
                    <p className="text-base font-bold font-mono text-emerald-700 tabular-nums mt-0.5">
                      {tier.cashbackPercent || 0}%
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-slate-500" /> Benefits
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {tier.linkedCouponIds?.length > 0 && (
                      <Badge className="bg-slate-900 text-white text-xs font-medium">
                        {tier.linkedCouponIds.length} Offers
                      </Badge>
                    )}
                    {(tier.benefits || []).slice(0, 3).map((b: string, i: number) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-slate-50 text-slate-700 border-slate-200 text-xs font-medium"
                      >
                        {b}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTier(tier)}
                  className="w-full h-10 rounded-xl text-xs font-semibold bg-white"
                >
                  Configure Tier <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editingTier} onOpenChange={(open) => !open && setEditingTier(null)}>
        <DialogContent className="sm:max-w-[1060px] h-[90vh] rounded-2xl border border-slate-200 p-0 overflow-hidden w-[96vw] flex flex-col">
          <div className="flex flex-col lg:flex-row h-full overflow-hidden">
            <div className="flex-1 flex flex-col bg-white overflow-hidden lg:border-r border-slate-200">
              <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800 text-left shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                    <BadgeCheck className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <DialogTitle className="text-lg font-bold text-white">
                        {editingTier?.name} Configuration
                      </DialogTitle>
                      <Badge
                        className={cn(
                          "text-xs font-medium capitalize",
                          editingTier?.status === "active"
                            ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"
                            : "bg-rose-500/20 text-rose-200 border border-rose-400/30"
                        )}
                      >
                        {editingTier?.status}
                      </Badge>
                    </div>
                    <DialogDescription className="text-slate-300 text-xs mt-0.5">
                      Adjust pricing, GST slab, multipliers, and bundled coupon offers
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6 pb-8">
                  {editingTier && (
                    <>
                      <section className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                        <div className="flex items-center gap-2">
                          <Power className="h-4 w-4 text-slate-600" />
                          <h4 className="text-xs font-semibold text-slate-700">
                            Tier Visibility & Accent Color
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-slate-600">
                              Availability
                            </Label>
                            <Select
                              value={editingTier.status || "active"}
                              onValueChange={(v) =>
                                setEditingTier({ ...editingTier, status: v })
                              }
                            >
                              <SelectTrigger className="h-10 rounded-xl bg-white text-xs font-semibold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem
                                  value="active"
                                  className="text-xs font-medium text-emerald-700"
                                >
                                  Active (Public)
                                </SelectItem>
                                <SelectItem
                                  value="inactive"
                                  className="text-xs font-medium text-rose-700"
                                >
                                  Inactive (Hidden)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="tier-color"
                              className="text-xs font-medium text-slate-600"
                            >
                              Card Color
                            </Label>
                            <div className="flex items-center gap-3">
                              <Input
                                id="tier-color"
                                type="color"
                                value={editingTier.color}
                                onChange={(e) =>
                                  setEditingTier({ ...editingTier, color: e.target.value })
                                }
                                className="h-10 w-16 rounded-xl p-1 cursor-pointer bg-white"
                              />
                              <span className="text-xs font-mono text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                {editingTier.color}
                              </span>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Type className="h-4 w-4 text-slate-600" />
                          <Label
                            htmlFor="tier-name"
                            className="text-xs font-semibold text-slate-700"
                          >
                            Membership Card Name
                          </Label>
                        </div>
                        <Input
                          id="tier-name"
                          value={editingTier.name}
                          onChange={(e) =>
                            setEditingTier({ ...editingTier, name: e.target.value })
                          }
                          placeholder="e.g. Platinum Plus"
                          className="h-11 rounded-xl font-semibold text-base"
                        />
                        <p className="text-xs text-slate-500">
                          Displayed on the digital membership card and enrollment page.
                        </p>
                      </section>

                      <Separator />

                      <section className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-4 w-4 text-slate-600" />
                          <h4 className="text-xs font-semibold text-slate-700">
                            Pricing & GST Configuration
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="tier-entry-fee"
                              className="text-xs font-medium text-slate-600"
                            >
                              Base Entry Fee ({currencySymbol})
                            </Label>
                            <Input
                              id="tier-entry-fee"
                              type="number"
                              value={editingTier.minSpend || 0}
                              onChange={(e) =>
                                setEditingTier({
                                  ...editingTier,
                                  minSpend: parseInt(e.target.value) || 0,
                                })
                              }
                              className="h-11 rounded-xl font-mono font-bold text-base tabular-nums"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-slate-600">
                              GST Slab (%)
                            </Label>
                            <Select
                              value={editingTier.gstRate?.toString() || "0"}
                              onValueChange={(v) =>
                                setEditingTier({ ...editingTier, gstRate: parseInt(v) })
                              }
                            >
                              <SelectTrigger className="h-11 rounded-xl font-mono font-semibold">
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

                        {gstBreakdown && (
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-slate-700">
                                Exclusive GST Calculation
                              </p>
                              <span className="text-xs font-mono text-slate-500">
                                {editingTier.gstRate || 0}% slab
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-slate-500">Base Cost</p>
                                <p className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                                  {currencySymbol}
                                  {gstBreakdown.baseAmount.toLocaleString()}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-slate-500">
                                  GST ({editingTier.gstRate}%)
                                </p>
                                <p className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                                  +{currencySymbol}
                                  {gstBreakdown.gstAmount.toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-500">Total Payable</p>
                                <p className="text-sm font-mono font-bold text-emerald-700 tabular-nums">
                                  {currencySymbol}
                                  {gstBreakdown.lineTotal.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </section>

                      <Separator />

                      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="tier-multiplier"
                            className="text-xs font-semibold text-slate-700"
                          >
                            Points Multiplier
                          </Label>
                          <Input
                            id="tier-multiplier"
                            type="number"
                            step="0.1"
                            value={editingTier.pointsMultiplier || 1}
                            onChange={(e) =>
                              setEditingTier({
                                ...editingTier,
                                pointsMultiplier: parseFloat(e.target.value) || 1,
                              })
                            }
                            className="h-10 rounded-xl font-mono font-semibold tabular-nums"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="tier-cashback"
                            className="text-xs font-semibold text-slate-700"
                          >
                            Cashback %
                          </Label>
                          <Input
                            id="tier-cashback"
                            type="number"
                            value={editingTier.cashbackPercent || 0}
                            onChange={(e) =>
                              setEditingTier({
                                ...editingTier,
                                cashbackPercent: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="h-10 rounded-xl font-mono font-semibold tabular-nums"
                          />
                        </div>
                      </section>

                      <Separator />

                      <section className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Ticket className="h-4 w-4 text-slate-500" /> Linked Offer Cards
                          </h4>
                          <span className="text-xs text-slate-500 font-mono tabular-nums">
                            {editingTier.linkedCouponIds?.length || 0} bundled
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {coupons.map((c: any) => {
                            const isSelected = editingTier.linkedCouponIds?.includes(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                aria-pressed={!!isSelected}
                                onClick={() => toggleCoupon(c.id)}
                                className={cn(
                                  "p-3.5 rounded-xl border text-left transition-colors flex items-center gap-3",
                                  isSelected
                                    ? "border-slate-900 bg-slate-50"
                                    : "border-slate-200 bg-white hover:border-slate-300"
                                )}
                              >
                                <div
                                  className={cn(
                                    "h-5 w-5 rounded border flex items-center justify-center shrink-0",
                                    isSelected
                                      ? "bg-slate-900 border-slate-900 text-white"
                                      : "bg-white border-slate-300"
                                  )}
                                >
                                  {isSelected && <Check className="h-3.5 w-3.5" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold font-mono text-slate-900 truncate">
                                    {c.code}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {c.type === "percentage"
                                      ? `${c.value}% OFF`
                                      : `₹${c.value} FLAT`}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </section>

                      <Separator />

                      <section className="space-y-3">
                        <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-slate-500" /> Benefit Highlights
                        </h4>
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g. Free Home Delivery"
                            value={newBenefit}
                            onChange={(e) => setNewBenefit(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addBenefit()}
                            className="h-10 rounded-xl"
                          />
                          <Button
                            type="button"
                            onClick={addBenefit}
                            size="icon"
                            aria-label="Add benefit"
                            className="h-10 w-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shrink-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {(editingTier.benefits || []).map((b: string, i: number) => (
                            <div
                              key={i}
                              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2"
                            >
                              <span className="text-xs font-medium text-slate-700 truncate">
                                {b}
                              </span>
                              <button
                                type="button"
                                aria-label={`Remove benefit ${b}`}
                                onClick={() => removeBenefit(i)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </section>
                    </>
                  )}
                </div>
              </ScrollArea>

              <div className="p-5 bg-slate-50 border-t border-slate-200 flex gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTier(null)}
                  className="flex-1 h-11 rounded-xl text-xs font-semibold"
                >
                  Discard
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveTier}
                  className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
                >
                  Save Updates
                </Button>
              </div>
            </div>

            <div className="hidden lg:flex w-[390px] bg-slate-50 flex-col overflow-hidden">
              <div className="px-6 py-4 bg-white border-b border-slate-200 shrink-0">
                <p className="text-xs font-semibold text-slate-700">Live Card Preview</p>
              </div>
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6 pb-8 text-left">
                  {editingTier && (
                    <>
                      <div
                        className="w-full aspect-[1.8/1] rounded-2xl p-6 flex flex-col justify-between text-white border border-black/10"
                        style={{ backgroundColor: editingTier.color || "#0f172a" }}
                      >
                        <div className="flex justify-between items-start">
                          <Badge className="bg-white/20 text-white border-none text-xs font-medium">
                            {editingTier.name}
                          </Badge>
                          <Crown className="h-6 w-6 text-white/40" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold tracking-tight">
                            {editingTier.name} Privilege
                          </h3>
                          <p className="text-xs text-white/75 mt-0.5">
                            Digital Membership Card
                          </p>
                        </div>
                        <div className="flex justify-between items-end border-t border-white/20 pt-3">
                          <div className="min-w-0">
                            <p className="text-xs text-white/70">Serial Preview</p>
                            <div className="font-mono text-xs font-semibold tracking-wider text-white truncate">
                              BIZ-{editingTier.name.toUpperCase().replace(/\s+/g, "")}-0001
                            </div>
                          </div>
                          <div className="h-8 w-8 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center">
                            <SmartphoneNfc className="h-4 w-4" />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-slate-700">
                          Bundled Reward Cards ({editingTier.linkedCouponIds?.length || 0})
                        </p>
                        <div className="space-y-3">
                          {(editingTier.linkedCouponIds || []).map((cid: string) => {
                            const c = coupons.find((x) => x.id === cid);
                            if (!c) return null;
                            return (
                              <div
                                key={cid}
                                className={cn(
                                  "rounded-xl p-4 flex items-center justify-between text-white",
                                  c.theme === "orange"
                                    ? "bg-orange-600"
                                    : c.theme === "green"
                                      ? "bg-emerald-600"
                                      : "bg-slate-900"
                                )}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 text-white/75 text-xs mb-0.5">
                                    <Ticket className="h-3.5 w-3.5" />
                                    <span>
                                      {c.groupId !== "none"
                                        ? business?.offerGroups?.find(
                                            (g: any) => g.id === c.groupId
                                          )?.name
                                        : "Offer"}
                                    </span>
                                  </div>
                                  <div className="text-base font-bold font-mono">
                                    {c.type === "percentage"
                                      ? `${c.value}% OFF`
                                      : `₹${c.value} FLAT`}
                                  </div>
                                </div>
                                <div className="bg-black/25 px-2.5 py-1 rounded-lg font-mono text-xs font-semibold">
                                  {c.code}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
