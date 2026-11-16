"use client";

import { useState, useMemo, Suspense } from "react";
import {
  Loader2,
  Search,
  ShieldCheck,
  Zap,
  CheckCircle2,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
import { useRouter } from "next/navigation";
import { addYears, parseISO, format } from "date-fns";

const AMC_PLANS = [
  { id: "silver", label: "Silver (Cleaning Only)", price: "2500", visits: 2 },
  { id: "gold", label: "Gold (Quarterly Visit)", price: "5000", visits: 4 },
  { id: "platinum", label: "Platinum (Full Coverage)", price: "9000", visits: 6 },
];

function NewSolarAmcContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

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
  const currencySymbol = getCurrencySymbol(business?.currency);

  const installationsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "solarInstallations"),
            where("status", "==", "HANDED_OVER")
          )
        : null,
    [firestore, businessId]
  );
  const { data: activeInstalls = [] } = useCollection<any>(installationsQuery);

  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    installationId: "",
    planId: "gold",
    startDate: new Date().toISOString().split("T")[0],
    amount: "5000",
    frequency: "QUARTERLY",
    billingReference: "",
    notes: "",
  });

  const selectedInstall = useMemo(
    () => (activeInstalls || []).find((inst: any) => inst.id === formData.installationId),
    [activeInstalls, formData.installationId]
  );

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

  const handleCreate = async () => {
    if (!businessId || !formData.installationId || !selectedInstall) {
      toast({
        variant: "destructive",
        title: "Site required",
        description: "Select a handed-over installation first.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const amcRef = collection(
        firestore,
        "businesses",
        businessId,
        "solarAmcContracts"
      );
      const contractNum = `AMC-${Math.floor(100000 + Math.random() * 900000)}`;
      const startDate = new Date(formData.startDate);
      const endDate = addYears(startDate, 1);

      await addDocumentNonBlocking(amcRef, {
        ...formData,
        contractNumber: contractNum,
        businessId,
        customerId: selectedInstall.customerId,
        customerName: selectedInstall.customerName,
        customerPhone: selectedInstall.customerPhone || "",
        endDate: endDate.toISOString().split("T")[0],
        status: "ACTIVE",
        planName: AMC_PLANS.find((p) => p.id === formData.planId)?.label || "Custom",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "AMC contract created",
        description: `Contract ${contractNum} is now active.`,
      });
      router.push("/solar/amc");
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Creation failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

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
        breadcrumb="Maintenance Setup"
        title="New AMC Contract"
        description="Configure a recurring maintenance contract for a completed solar installation."
        backHref="/solar/amc"
        backLabel="Back to AMC contracts"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <SectionCard
            title="Contract Details"
            description="Associate this AMC with a handed-over site and choose a service plan."
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amc-site-search" className="text-xs font-medium text-slate-700">
                  Handed-Over Installation *
                </Label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="amc-site-search"
                    placeholder="Search client or installation number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 text-sm"
                  />
                  {searchTerm.trim() !== "" && (
                    <div className="mt-2 rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
                      {filteredInstalls.length === 0 ? (
                        <p className="p-4 text-xs text-slate-500">
                          No matching handed-over installations found.
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
                                {inst.installationNumber}
                              </p>
                            </div>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedInstall && (
                <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white border border-emerald-200 flex items-center justify-center font-semibold text-emerald-700">
                      {selectedInstall.customerName?.charAt(0) || "S"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {selectedInstall.customerName}
                      </p>
                      <p className="text-xs font-mono tabular-nums text-emerald-700">
                        Linked Site: {selectedInstall.installationNumber}
                      </p>
                    </div>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="amc-plan" className="text-xs font-medium text-slate-700">
                    Service Plan
                  </Label>
                  <Select
                    value={formData.planId}
                    onValueChange={(v) => {
                      const plan = AMC_PLANS.find((p) => p.id === v);
                      setFormData({
                        ...formData,
                        planId: v,
                        amount: plan?.price || "0",
                      });
                    }}
                  >
                    <SelectTrigger
                      id="amc-plan"
                      className="h-10 rounded-xl bg-white border-slate-200 text-sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      {AMC_PLANS.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-sm">
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="amc-frequency" className="text-xs font-medium text-slate-700">
                    Visit Frequency
                  </Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(v) => setFormData({ ...formData, frequency: v })}
                  >
                    <SelectTrigger
                      id="amc-frequency"
                      className="h-10 rounded-xl bg-white border-slate-200 text-sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      <SelectItem value="QUARTERLY">Quarterly (4/yr)</SelectItem>
                      <SelectItem value="HALF_YEARLY">Half-Yearly (2/yr)</SelectItem>
                      <SelectItem value="MONTHLY">Monthly (12/yr)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="amc-amount" className="text-xs font-medium text-slate-700">
                    Annual Contract Value
                  </Label>
                  <Input
                    id="amc-amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="h-10 rounded-xl bg-slate-50 border-slate-200 font-mono tabular-nums font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="amc-start" className="text-xs font-medium text-slate-700">
                    Start Date
                  </Label>
                  <Input
                    id="amc-start"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="h-10 rounded-xl bg-slate-50 border-slate-200 font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="amc-notes" className="text-xs font-medium text-slate-700">
                  Scope & Notes
                </Label>
                <Textarea
                  id="amc-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Coverage details, exclusions, or special client requests..."
                  className="min-h-[110px] rounded-xl bg-slate-50 border-slate-200 text-sm"
                />
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className="rounded-2xl bg-slate-900 text-white p-6 space-y-5 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-bold">Contract Summary</h3>
                <p className="text-xs text-slate-300">12-month maintenance term</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-300">Renewal Date</p>
                  <p className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
                    {formData.startDate
                      ? format(addYears(parseISO(formData.startDate), 1), "dd MMM yyyy")
                      : "--"}
                  </p>
                </div>
                <RefreshCcw className="h-5 w-5 text-slate-400" />
              </div>

              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-300">Billed Amount</p>
                  <p className="text-xl font-bold font-mono tabular-nums text-white mt-0.5">
                    {currencySymbol}
                    {parseFloat(formData.amount || "0").toLocaleString()}
                  </p>
                </div>
                <Badge className="bg-white/10 border-white/15 text-slate-200 text-xs font-medium">
                  Annual
                </Badge>
              </div>
            </div>

            <Separator className="bg-white/10" />

            <Button
              type="button"
              onClick={handleCreate}
              disabled={isSubmitting || !formData.installationId}
              className="w-full h-11 bg-white text-slate-900 hover:bg-slate-100 font-semibold rounded-xl"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Activate AMC Contract"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewSolarAmcPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="animate-spin text-slate-400 h-8 w-8" />
        </div>
      }
    >
      <NewSolarAmcContent />
    </Suspense>
  );
}