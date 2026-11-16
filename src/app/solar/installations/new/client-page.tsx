"use client";

import { useState, useMemo, Suspense } from "react";
import {
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Briefcase,
  Users,
  Zap,
  Lock,
  Plus,
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
import { collection, doc, serverTimestamp, query, where } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function NewInstallationContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get("quoteId");

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

  const quoteRef = useMemoFirebase(
    () => (businessId && quoteId ? doc(firestore, "businesses", businessId, "quotations", quoteId) : null),
    [firestore, businessId, quoteId]
  );
  const { data: quote, isLoading: isQuoteLoading } = useDoc<any>(quoteRef);

  const designRef = useMemoFirebase(
    () =>
      businessId && quote?.solarSystemDesignId
        ? doc(firestore, "businesses", businessId, "solarSystemDesigns", quote.solarSystemDesignId)
        : null,
    [firestore, businessId, quote?.solarSystemDesignId]
  );
  const { data: design } = useDoc<any>(designRef);

  const teamQuery = useMemoFirebase(
    () => (businessId ? query(collection(firestore, "users"), where("businessId", "==", businessId)) : null),
    [firestore, businessId]
  );
  const { data: teamMembers = [] } = useCollection<any>(teamQuery);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    scheduledStartDate: new Date().toISOString().split("T")[0],
    scheduledEndDate: "",
    supervisorId: "",
    teamIds: [] as string[],
    siteNotes: "",
  });

  const isEligible = useMemo(() => quote?.status === "converted", [quote]);
  const currencySymbol = getCurrencySymbol(business?.currency);

  const handleLaunch = async () => {
    if (!businessId || !quote || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const installationsRef = collection(
        firestore,
        "businesses",
        businessId,
        "solarInstallations"
      );
      const projectsRef = collection(firestore, "businesses", businessId, "projects");
      const installNum = `INST-${Math.floor(100000 + Math.random() * 900000)}`;

      // 1. Create Baseline Project Record for Task Tracking
      const projectDocRef = await addDocumentNonBlocking(projectsRef, {
        title: `Installation: ${quote.customerName}`,
        description: `Field execution for ${design?.capacityKw}kW ${design?.systemType} system.`,
        status: "in-progress",
        deadline: formData.scheduledEndDate || formData.scheduledStartDate,
        clientId: quote.customerId,
        clientName: quote.customerName,
        clientType: "customer",
        team: [formData.supervisorId, ...formData.teamIds].filter(Boolean),
        businessId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Map BOM to Allocation Materials
      const materials = (design?.components || []).map((c: any) => ({
        ...c,
        required: c.quantity,
        allocated: 0,
        issued: 0,
        consumed: 0,
        returned: 0,
      }));

      // 3. Create Solar Installation Record
      const installDocRef = await addDocumentNonBlocking(installationsRef, {
        ...formData,
        installationNumber: installNum,
        projectId: projectDocRef?.id || null,
        solarQuotationId: quoteId,
        solarSystemDesignId: quote.solarSystemDesignId,
        solarInquiryId: quote.solarInquiryId,
        solarSurveyId: quote.solarSurveyId,
        customerId: quote.customerId,
        customerName: quote.customerName,
        customerPhone: quote.customerPhone || "",
        capacityKw: design?.capacityKw || 0,
        systemType: design?.systemType || "On-grid",
        materials,
        status: "READY_TO_SCHEDULE",
        progress: 0,
        businessId,
        assignedTeamNames: teamMembers
          .filter((m) => formData.teamIds.includes(m.id))
          .map((m) => m.name),
        supervisorName:
          teamMembers.find((m) => m.id === formData.supervisorId)?.name || "Unassigned",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 4. Initialize Core Roadmap Tasks
      if (projectDocRef) {
        const tasksRef = collection(firestore, "businesses", businessId, "tasks");
        const coreTasks = [
          { title: "Structure Fixing & Alignment", section: "Execution", priority: "high" },
          { title: "Panel Mounting & Inter-connection", section: "Execution", priority: "high" },
          { title: "Inverter & Protection System Mounting", section: "Execution", priority: "medium" },
          { title: "AC/DC Cabling & Earthing Check", section: "Execution", priority: "medium" },
        ];

        for (const t of coreTasks) {
          await addDocumentNonBlocking(tasksRef, {
            ...t,
            status: "pending",
            projectId: projectDocRef.id,
            projectName: `Installation: ${quote.customerName}`,
            assignedTo: formData.supervisorId || "",
            assignedName:
              teamMembers.find((m) => m.id === formData.supervisorId)?.name || "Unassigned",
            businessId,
            createdAt: serverTimestamp(),
          });
        }
      }

      toast({
        title: "Installation initialized",
        description: `Installation ${installNum} is ready for scheduling.`,
      });
      router.push(`/solar/installations/${installDocRef?.id}`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Initialization failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isProfileLoading || isQuoteLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400 h-8 w-8" />
      </div>
    );
  }

  if (!isEligible) {
    return (
      <div className="max-w-3xl mx-auto py-16">
        <EmptyStatePanel
          icon={Lock}
          title="Workflow Blocked"
          description="An installation can only be initialized from an accepted quotation."
          action={
            <Button asChild variant="outline" className="rounded-xl border-slate-200">
              <Link href="/solar/quotations">Back to Proposals</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const fieldTechnicians = teamMembers.filter(
    (m) =>
      (m.role || "").toLowerCase().includes("staff") ||
      (m.role || "").toLowerCase().includes("agent")
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 text-left">
      <PageHeader
        breadcrumb="Field Execution Setup"
        title="Initiate Installation"
        description={`Scheduling site execution for ${quote.customerName}`}
        backHref={`/solar/quotations/${quoteId}`}
        backLabel="Back to proposal"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <SectionCard
            title="Field Operations Configuration"
            description="Set target schedule dates, supervisor, and field technician crew."
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="planned-start" className="text-xs font-medium text-slate-700">
                    Planned Start Date
                  </Label>
                  <Input
                    id="planned-start"
                    type="date"
                    value={formData.scheduledStartDate || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledStartDate: e.target.value })
                    }
                    className="h-10 rounded-xl bg-slate-50 border-slate-200 font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="target-end" className="text-xs font-medium text-slate-700">
                    Target Completion Date
                  </Label>
                  <Input
                    id="target-end"
                    type="date"
                    value={formData.scheduledEndDate || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledEndDate: e.target.value })
                    }
                    className="h-10 rounded-xl bg-slate-50 border-slate-200 font-mono tabular-nums"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <Users className="h-4 w-4 text-slate-600" />
                  <h3 className="text-sm font-bold">Team Assignment</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="supervisor-select" className="text-xs font-medium text-slate-700">
                      Site Supervisor / PM
                    </Label>
                    <Select
                      value={formData.supervisorId || ""}
                      onValueChange={(v) => setFormData({ ...formData, supervisorId: v })}
                    >
                      <SelectTrigger
                        id="supervisor-select"
                        className="h-10 rounded-xl bg-white border-slate-200 text-sm"
                      >
                        <SelectValue placeholder="Select supervisor" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        {teamMembers.map((m: any) => (
                          <SelectItem key={m.id} value={m.id} className="text-sm">
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-700">
                    Field Technicians
                  </Label>
                  {fieldTechnicians.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No staff or field agent users found in your workspace.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {fieldTechnicians.map((m) => {
                        const selected = formData.teamIds.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                teamIds: prev.teamIds.includes(m.id)
                                  ? prev.teamIds.filter((id) => id !== m.id)
                                  : [...prev.teamIds, m.id],
                              }))
                            }
                            className={cn(
                              "h-9 px-3.5 rounded-xl border text-xs font-medium transition-colors",
                              selected
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                            )}
                          >
                            {m.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label htmlFor="site-notes" className="text-xs font-medium text-slate-700">
                  Site Instructions & Field Notes
                </Label>
                <Textarea
                  id="site-notes"
                  value={formData.siteNotes || ""}
                  onChange={(e) => setFormData({ ...formData, siteNotes: e.target.value })}
                  placeholder="Structural warnings, roof height constraints, or access instructions..."
                  className="min-h-[110px] rounded-xl bg-slate-50 border-slate-200 text-sm"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleLaunch}
                  disabled={isSubmitting || !formData.supervisorId}
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  ) : (
                    <Briefcase className="h-4 w-4 mr-2" />
                  )}
                  Launch Installation Schedule
                </Button>
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
                <h3 className="text-base font-bold">Automatic Resource Sync</h3>
                <p className="text-xs text-slate-300">Linked to design BOM</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-300">BOM Components</p>
                  <p className="text-xl font-bold font-mono tabular-nums text-white mt-0.5">
                    {design?.components?.length || 0}
                  </p>
                </div>
                <Plus className="h-5 w-5 text-slate-400" />
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-300">Project Value</p>
                  <p className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
                    {currencySymbol}
                    {(quote.totals?.finalPayout || 0).toLocaleString()}
                  </p>
                </div>
                <Badge className="bg-white/10 border-white/15 text-slate-200 text-xs font-medium">
                  Confirmed
                </Badge>
              </div>
            </div>

            <Separator className="bg-white/10" />

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Workspace-scoped material allocation</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Core execution checklist auto-created</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewSolarInstallationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="animate-spin text-slate-400 h-8 w-8" />
        </div>
      }
    >
      <NewInstallationContent />
    </Suspense>
  );
}
