"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import {
  Loader2,
  Search,
  ShieldCheck,
  Package,
  Calculator,
  ChevronRight,
  CheckCircle2,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { PageHeader, SectionCard } from "@/components/ui/editorial";
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  useCollection,
  addDocumentNonBlocking,
} from "@/firebase";
import { collection, doc, serverTimestamp, query, where } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { getCurrencySymbol } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";

function NewSolarProcurementContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const installId = searchParams.get("installId");

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const installsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "solarInstallations"),
            where("status", "!=", "HANDED_OVER")
          )
        : null,
    [firestore, businessId]
  );
  const { data: activeInstalls = [] } = useCollection<any>(installsQuery);

  const vendorsQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "vendors") : null),
    [firestore, businessId]
  );
  const { data: vendors = [] } = useCollection<any>(vendorsQuery);

  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    installationId: installId || "",
    vendorId: "none",
    priority: "medium" as any,
    notes: "",
    items: [] as any[],
  });

  const selectedInstall = useMemo(
    () => (activeInstalls || []).find((inst: any) => inst.id === formData.installationId),
    [activeInstalls, formData.installationId]
  );

  // Planning logic: detect material shortages from installation BOM
  const plannedItems = useMemo(() => {
    if (!selectedInstall) return [];
    return (selectedInstall.materials || [])
      .map((m: any) => {
        const remaining = (m.required || 0) - (m.issued || 0);
        return {
          productId: m.productId,
          productName: m.productName,
          required: m.required,
          issued: m.issued || 0,
          shortage: Math.max(0, remaining),
          planned: Math.max(0, remaining),
          unitCost: m.unitCostAtIssue || 0,
        };
      })
      .filter((m: any) => m.shortage > 0);
  }, [selectedInstall]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, items: plannedItems }));
  }, [plannedItems]);

  const filteredInstalls = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return (activeInstalls || []).slice(0, 5);
    return (activeInstalls || [])
      .filter(
        (i: any) =>
          i.customerName?.toLowerCase().includes(q) ||
          i.installationNumber?.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [activeInstalls, searchTerm]);

  const handleLaunchRequisition = async () => {
    if (!businessId || !formData.installationId || !selectedInstall) return;

    setIsSubmitting(true);
    try {
      const reqRef = collection(
        firestore,
        "businesses",
        businessId,
        "solarPurchaseRequisitions"
      );
      const selectedVendor = vendors.find((v) => v.id === formData.vendorId);

      const totalCost = formData.items.reduce(
        (sum, i) => sum + i.planned * i.unitCost,
        0
      );

      const docRef = await addDocumentNonBlocking(reqRef, {
        ...formData,
        businessId,
        customerName: selectedInstall.customerName,
        installationNumber: selectedInstall.installationNumber,
        vendorName: selectedVendor?.name || "Direct Sourcing",
        status: "DRAFT",
        totalEstimatedCost: totalCost,
        requestedBy: userProfile?.name || "Admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Requisition drafted",
        description: "Purchase requisition created for review.",
      });
      router.push(`/solar/procurement/${docRef?.id}`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Creation failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currencySymbol = getCurrencySymbol(business?.currency);
  const estimatedSpend = formData.items.reduce(
    (sum, i) => sum + i.planned * i.unitCost,
    0
  );

  if (isProfileLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400 h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 text-left">
      <PageHeader
        breadcrumb="Supply Chain Planner"
        title="New Purchase Requisition"
        description="Identify installation material shortages and assign a supplier."
        backHref="/solar/procurement"
        backLabel="Back to procurement"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <SectionCard
            title="Requirement Analysis"
            description="Select an active installation site to calculate BOM material shortages."
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="install-search" className="text-xs font-medium text-slate-700">
                  1. Target Installation Site *
                </Label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="install-search"
                    placeholder="Search customer name or installation ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 text-sm"
                  />
                  {searchTerm.trim() !== "" && (
                    <div className="mt-2 rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
                      {filteredInstalls.length === 0 ? (
                        <p className="p-4 text-xs text-slate-500">
                          No matching active installations found.
                        </p>
                      ) : (
                        filteredInstalls.map((inst: any) => (
                          <button
                            key={inst.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, installationId: inst.id });
                              setSearchTerm("");
                            }}
                            className="w-full p-3.5 hover:bg-slate-50 flex justify-between items-center text-left transition-colors"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {inst.customerName}
                              </p>
                              <p className="text-xs font-mono tabular-nums text-slate-500">
                                {inst.installationNumber} • {inst.status}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedInstall && (
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {selectedInstall.customerName}
                        </p>
                        <p className="text-xs font-mono tabular-nums text-slate-500">
                          {selectedInstall.installationNumber}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-white border-slate-200 text-slate-800 font-mono tabular-nums text-xs"
                    >
                      {selectedInstall.capacityKw} kWp
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600">
                      Detected Material Shortages
                    </p>
                    {plannedItems.length === 0 ? (
                      <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2.5 text-emerald-800">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="text-xs font-medium">
                          All required BOM components are already issued.
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {plannedItems.map((item: any, i: number) => (
                          <div
                            key={i}
                            className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {item.productName}
                              </p>
                              <p className="text-xs font-mono tabular-nums text-slate-500">
                                Shortage: {item.shortage} units
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-xs border-amber-200 text-amber-700 bg-amber-50"
                            >
                              Needs Order
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-600">
                  2. Supplier & Priority
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="vendor-select" className="text-xs font-medium text-slate-700">
                      Primary Vendor
                    </Label>
                    <Select
                      value={formData.vendorId || "none"}
                      onValueChange={(v) => setFormData({ ...formData, vendorId: v })}
                    >
                      <SelectTrigger
                        id="vendor-select"
                        className="h-10 rounded-xl bg-white border-slate-200 text-sm"
                      >
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        <SelectItem value="none">Manual / Spot Purchase</SelectItem>
                        {vendors.map((v: any) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="priority-select" className="text-xs font-medium text-slate-700">
                      Priority Level
                    </Label>
                    <Select
                      value={formData.priority || "medium"}
                      onValueChange={(v: any) => setFormData({ ...formData, priority: v })}
                    >
                      <SelectTrigger
                        id="priority-select"
                        className="h-10 rounded-xl bg-white border-slate-200 text-sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        <SelectItem value="low">Routine</SelectItem>
                        <SelectItem value="medium">Normal</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="req-notes" className="text-xs font-medium text-slate-700">
                    Procurement Notes
                  </Label>
                  <Textarea
                    id="req-notes"
                    value={formData.notes || ""}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Supplier instructions, delivery schedule, or pricing terms..."
                    className="min-h-[100px] rounded-xl bg-slate-50 border-slate-200 text-sm"
                  />
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className="rounded-2xl bg-slate-900 text-white p-6 space-y-5 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <Calculator className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-bold">Order Summary</h3>
                <p className="text-xs text-slate-300">Estimated material spend</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-300">Shortage SKUs</p>
                  <p className="text-xl font-bold font-mono tabular-nums text-white mt-0.5">
                    {formData.items.length}
                  </p>
                </div>
                <Package className="h-5 w-5 text-slate-400" />
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-300">Estimated Cost</p>
                  <p className="text-xl font-bold font-mono tabular-nums text-white mt-0.5">
                    {currencySymbol}
                    {estimatedSpend.toLocaleString()}
                  </p>
                </div>
                <Badge className="bg-white/10 border-white/15 text-slate-200 text-xs font-medium">
                  Estimated
                </Badge>
              </div>
            </div>

            <Separator className="bg-white/10" />

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Synced with installation BOM</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Updates stock on goods receipt</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleLaunchRequisition}
              disabled={isSubmitting || !formData.installationId}
              className="w-full h-11 bg-white text-slate-900 hover:bg-slate-100 font-semibold rounded-xl"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Create Purchase Requisition"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewSolarProcurementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="animate-spin text-slate-400 h-8 w-8" />
        </div>
      }
    >
      <NewSolarProcurementContent />
    </Suspense>
  );
}
