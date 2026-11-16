"use client";

import { useState, useMemo, Suspense } from "react";
import {
  Loader2,
  Search,
  ShieldCheck,
  ChevronRight,
  Info,
  Plus,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { collection, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { id: "GENERAL_SERVICE", label: "General Service" },
  { id: "SYSTEM_FAULT", label: "System Fault" },
  { id: "PANEL_ISSUE", label: "Panel Issue" },
  { id: "INVERTER_ISSUE", label: "Inverter Issue" },
  { id: "BATTERY_ISSUE", label: "Battery Issue" },
  { id: "AMC_SERVICE", label: "AMC Scheduled Visit" },
  { id: "WARRANTY_CLAIM", label: "Warranty Claim" },
];

function NewSolarServiceContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const installationsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "solarInstallations"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: installations = [] } = useCollection<any>(installationsQuery);

  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    installationId: "",
    category: "GENERAL_SERVICE",
    description: "",
    requestSource: "Portal",
    priority: "medium",
    scheduledAt: "",
  });

  const selectedInstallation = useMemo(
    () => (installations || []).find((inst: any) => inst.id === formData.installationId),
    [installations, formData.installationId]
  );

  const filteredInstallations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return (installations || []).slice(0, 5);
    return (installations || [])
      .filter(
        (i: any) =>
          i.customerName?.toLowerCase().includes(q) ||
          i.installationNumber?.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [installations, searchTerm]);

  const handleCreate = async () => {
    if (!businessId || !formData.installationId || !selectedInstallation) {
      toast({
        variant: "destructive",
        title: "Installation required",
        description: "Please select an installation record first.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const serviceRef = collection(
        firestore,
        "businesses",
        businessId,
        "solarServiceRequests"
      );

      const docRef = await addDocumentNonBlocking(serviceRef, {
        ...formData,
        businessId,
        customerId: selectedInstallation.customerId,
        customerName: selectedInstallation.customerName,
        customerPhone: selectedInstallation.customerPhone || "",
        warrantyId: selectedInstallation.activeWarrantyId || null,
        status: "OPEN",
        assignedTo: "",
        assignedName: "Unassigned",
        materialsUsed: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Ticket created",
        description: "Support request has been logged.",
      });
      router.push(`/solar/service/${docRef?.id}`);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to register service ticket.",
      });
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
        breadcrumb="After-Sales Support"
        title="Open Service Ticket"
        description="Link a technical support or maintenance request to a customer installation."
        backHref="/solar/service"
        backLabel="Back to service desk"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <SectionCard
            title="Ticket Details"
            description="Search for the installation site and describe the reported issue."
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="install-lookup" className="text-xs font-medium text-slate-700">
                  Installation Record *
                </Label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="install-lookup"
                    placeholder="Find customer name or installation ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 text-sm"
                  />
                  {searchTerm.trim() !== "" && (
                    <div className="mt-2 rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
                      {filteredInstallations.length === 0 ? (
                        <p className="p-4 text-xs text-slate-500">
                          No matching installations found.
                        </p>
                      ) : (
                        filteredInstallations.map((inst: any) => (
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
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedInstallation && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-semibold">
                      {selectedInstallation.customerName?.charAt(0) || "S"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {selectedInstallation.customerName}
                      </p>
                      <p className="text-xs font-mono tabular-nums text-slate-500">
                        {selectedInstallation.installationNumber}
                      </p>
                    </div>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="service-category" className="text-xs font-medium text-slate-700">
                    Service Category
                  </Label>
                  <Select
                    value={formData.category || "GENERAL_SERVICE"}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger
                      id="service-category"
                      className="h-10 rounded-xl bg-white border-slate-200 text-sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="text-sm">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="service-priority" className="text-xs font-medium text-slate-700">
                    Priority
                  </Label>
                  <Select
                    value={formData.priority || "medium"}
                    onValueChange={(v) => setFormData({ ...formData, priority: v })}
                  >
                    <SelectTrigger
                      id="service-priority"
                      className="h-10 rounded-xl bg-white border-slate-200 text-sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="issue-desc" className="text-xs font-medium text-slate-700">
                  Issue Description *
                </Label>
                <Textarea
                  id="issue-desc"
                  required
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe the fault, inverter alert code, or service request..."
                  className="min-h-[120px] rounded-xl bg-slate-50 border-slate-200 text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={isSubmitting || !formData.installationId}
                  className="w-full sm:w-auto h-11 px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Create Service Ticket
                </Button>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-4">
          <div className="rounded-2xl bg-slate-900 text-white p-6 space-y-5 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <Info className="h-5 w-5 text-amber-300" />
              </div>
              <h3 className="text-base font-bold">Service Workflow</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Once logged, tickets can be assigned to field technicians and linked to
              warranty coverage or replacement parts inventory.
            </p>
            <Separator className="bg-white/10" />
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Linked to site warranty coverage</span>
              </div>
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Atomic spare parts stock issuance</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewSolarServicePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="animate-spin text-slate-400 h-8 w-8" />
        </div>
      }
    >
      <NewSolarServiceContent />
    </Suspense>
  );
}