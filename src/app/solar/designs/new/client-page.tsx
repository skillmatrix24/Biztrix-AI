"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import {
  Loader2,
  Settings2,
  CheckCircle2,
  ShieldCheck,
  Plus,
  Trash2,
  Calculator,
  Package,
  ArrowRightLeft,
  Lock,
  Search,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PageHeader,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  useCollection,
  addDocumentNonBlocking,
} from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function NewSolarDesignContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("surveyId");

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const surveyRef = useMemoFirebase(
    () =>
      businessId && surveyId
        ? doc(firestore, "businesses", businessId, "solarSurveys", surveyId)
        : null,
    [firestore, businessId, surveyId]
  );
  const { data: survey, isLoading: isSurveyLoading } = useDoc<any>(surveyRef);

  const productsQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(firestore, "businesses", businessId, "products")
        : null,
    [firestore, businessId]
  );
  const { data: products = [] } = useCollection<any>(productsQuery);

  const [formData, setFormData] = useState<any>({
    capacityKw: "",
    systemType: "On-grid",
    phaseType: "Single Phase",
    hasBattery: false,
    components: [] as any[],
    notes: "",
  });

  const [productSearch, setProductSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (survey) {
      setFormData((prev: any) => ({
        ...prev,
        capacityKw: survey.electrical?.proposedCapacity || "",
        phaseType: survey.electrical?.phaseType || "Single Phase",
      }));
    }
  }, [survey]);

  const filteredProducts = useMemo(() => {
    const active = (products || []).filter((p: any) => p.isActive !== false);
    if (!productSearch.trim()) return active.slice(0, 12);
    const q = productSearch.toLowerCase();
    return active
      .filter(
        (p: any) =>
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [products, productSearch]);

  const addComponent = (product: any) => {
    setFormData((prev: any) => ({
      ...prev,
      components: [
        ...prev.components,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unit: product.unit || "pcs",
          price: product.price || 0,
          gstRate: product.gstRate || 0,
          category: product.category || "Components",
          specs: product.sku || "",
        },
      ],
    }));
    toast({
      title: "Item Added",
      description: `${product.name} added to Bill of Materials.`,
    });
  };

  const removeComponent = (idx: number) => {
    setFormData((prev: any) => ({
      ...prev,
      components: prev.components.filter((_: any, i: number) => i !== idx),
    }));
  };

  const updateComponent = (idx: number, key: string, value: any) => {
    setFormData((prev: any) => {
      const updated = [...prev.components];
      updated[idx] = { ...updated[idx], [key]: value };
      return { ...prev, components: updated };
    });
  };

  const calculatedDcCapacity = useMemo(() => {
    return (formData.components || [])
      .filter(
        (c: any) =>
          c.productName?.toLowerCase().includes("panel") ||
          c.category === "Panels"
      )
      .reduce((sum: number, c: any) => {
        const wattageMatch = c.productName?.match(/(\d+)W/i);
        const wattage = wattageMatch ? parseInt(wattageMatch[1]) : 540;
        return sum + (wattage * c.quantity) / 1000;
      }, 0);
  }, [formData.components]);

  const handleSubmit = async () => {
    if (!businessId || !survey || isSubmitting) return;

    if (survey.status !== "APPROVED") {
      toast({
        variant: "destructive",
        title: "Workflow Error",
        description: "Site survey must be APPROVED before creating a design.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const designRef = collection(
        firestore,
        "businesses",
        businessId,
        "solarSystemDesigns"
      );
      const docRef = await addDocumentNonBlocking(designRef, {
        ...formData,
        businessId,
        solarInquiryId: survey.inquiryId,
        solarSurveyId: survey.id,
        customerId: survey.customerId,
        customerName: survey.customerName,
        calculatedDcKw: calculatedDcCapacity,
        status: "DRAFT",
        version: 1,
        createdBy: user?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "System Design Created",
        description: "Engineering design and BOM saved.",
      });
      router.push(`/solar/designs/${docRef?.id}`);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save system design.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSurveyLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-600 h-8 w-8" />
      </div>
    );
  }

  if (!survey || survey.status !== "APPROVED") {
    return (
      <div className="max-w-xl mx-auto py-16">
        <EmptyStatePanel
          icon={Lock}
          title="Site Survey Approval Required"
          description="An approved site survey is required before engineering design and BOM mapping can begin."
          action={
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={surveyId ? `/solar/surveys/${surveyId}` : "/solar/surveys"}>
                Open Site Survey
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 text-left">
      <PageHeader
        backHref={`/solar/surveys/${surveyId}`}
        backLabel="Back to Site Survey"
        title="System Designer"
        description={`Engineering specification and BOM for ${survey?.customerName}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <SectionCard
            title="Technical Configuration"
            description="Target kW output, architecture, and phase specifications"
            headerRight={
              <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                <Settings2 className="h-4 w-4" />
              </div>
            }
            bodyClassName="space-y-6 text-left"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  Target Capacity (kW)
                </Label>
                <Input
                  type="number"
                  value={formData.capacityKw}
                  onChange={(e) =>
                    setFormData({ ...formData, capacityKw: e.target.value })
                  }
                  className="h-11 rounded-xl font-mono tabular-nums font-bold text-base bg-white border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  System Architecture
                </Label>
                <Select
                  value={formData.systemType}
                  onValueChange={(v) =>
                    setFormData({ ...formData, systemType: v })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl font-medium text-sm border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="On-grid" className="text-sm font-medium">
                      On-grid Net Metering
                    </SelectItem>
                    <SelectItem value="Off-grid" className="text-sm font-medium">
                      Off-grid Storage
                    </SelectItem>
                    <SelectItem value="Hybrid" className="text-sm font-medium">
                      Hybrid System
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  Phase Connection
                </Label>
                <Select
                  value={formData.phaseType}
                  onValueChange={(v) =>
                    setFormData({ ...formData, phaseType: v })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl font-medium text-sm border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem
                      value="Single Phase"
                      className="text-sm font-medium"
                    >
                      Single Phase
                    </SelectItem>
                    <SelectItem
                      value="Three Phase"
                      className="text-sm font-medium"
                    >
                      Three Phase
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="bg-slate-200" />

            <div className="space-y-4 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-700" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Bill of Materials (BOM)
                  </h4>
                </div>
                <Badge
                  variant="outline"
                  className="bg-slate-50 text-slate-700 border-slate-200 text-xs font-mono tabular-nums font-semibold px-2.5 py-0.5 rounded-lg"
                >
                  {formData.components?.length || 0} Selected
                </Badge>
              </div>

              {!formData.components || formData.components.length === 0 ? (
                <EmptyStatePanel
                  icon={Package}
                  title="No components selected yet"
                  description="Pick panels, inverters, and balance-of-system items from your inventory catalog below."
                />
              ) : (
                <div className="space-y-2.5">
                  {formData.components.map((c: any, i: number) => (
                    <div
                      key={i}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {c.productName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {c.category}
                          {c.specs ? ` • ${c.specs}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            aria-label={`Quantity for ${c.productName}`}
                            value={c.quantity}
                            onChange={(e) =>
                              updateComponent(
                                i,
                                "quantity",
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="h-9 w-20 text-center font-mono tabular-nums font-semibold rounded-lg bg-white border-slate-200"
                          />
                          <span className="text-xs font-medium text-slate-600">
                            {c.unit}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${c.productName}`}
                          className="h-9 w-9 text-rose-600 hover:bg-rose-50"
                          onClick={() => removeComponent(i)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <Label className="text-xs font-semibold text-slate-700 block text-left">
                  Add Component from Inventory Catalog
                </Label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    aria-label="Search inventory catalog for solar components"
                    placeholder="Search catalog for panels, inverters, cables..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="h-11 pl-10 rounded-xl bg-white border-slate-200 text-sm"
                  />
                </div>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <ScrollArea className="h-[220px]">
                    {filteredProducts.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No matching products found in catalog.
                      </div>
                    ) : (
                      filteredProducts.map((p: any) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addComponent(p)}
                          className="w-full p-3.5 hover:bg-slate-50 flex justify-between items-center border-b border-slate-100 last:border-0 text-left transition-colors"
                        >
                          <div className="text-left min-w-0 pr-3">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {p.name}
                            </p>
                            <p className="text-xs text-slate-500 font-mono tabular-nums">
                              {p.sku || "No SKU"} • Stock: {p.stock ?? 0}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary shrink-0">
                            <Plus className="h-4 w-4" /> Add
                          </span>
                        </button>
                      ))
                    )}
                  </ScrollArea>
                </div>
              </div>
            </div>

            <Separator className="bg-slate-200" />

            <div className="space-y-1.5 text-left">
              <Label className="text-xs font-medium text-slate-600">
                Engineering Observations
              </Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Notes on cabling, structure height, or string arrangement..."
                className="min-h-[110px] rounded-xl bg-white border-slate-200 p-3.5 text-sm"
              />
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 text-left">
          <div className="rounded-2xl bg-slate-900 text-white p-6 space-y-6 text-left">
            <div className="flex items-center gap-3.5 text-left">
              <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
                <Calculator className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-bold text-white leading-tight">
                  Capacity Calculator
                </h3>
                <p className="text-slate-300 text-xs mt-0.5">
                  DC vs. Inverter AC Sizing
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                <div className="text-left">
                  <p className="text-xs text-slate-400">Total Panel DC</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-amber-400 mt-0.5">
                    {calculatedDcCapacity.toFixed(2)}{" "}
                    <span className="text-xs text-slate-300">kWp</span>
                  </p>
                </div>
                <ArrowRightLeft className="h-5 w-5 text-slate-400" />
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                <div className="text-left">
                  <p className="text-xs text-slate-400">Target Inverter AC</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-white mt-0.5">
                    {formData.capacityKw || "0"}{" "}
                    <span className="text-xs text-slate-300">kW</span>
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <Separator className="bg-white/15" />
            <div className="space-y-2.5 text-left text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Workspace data isolated</span>
              </div>
              <div className="flex items-center gap-2.5">
                <BadgeCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Design stage does not deduct stock</span>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.capacityKw}
              className="w-full h-11 bg-white text-slate-900 hover:bg-slate-100 font-semibold text-sm rounded-xl"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Save System Design"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewSolarDesignPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin h-8 w-8 text-slate-600" />
        </div>
      }
    >
      <NewSolarDesignContent />
    </Suspense>
  );
}
