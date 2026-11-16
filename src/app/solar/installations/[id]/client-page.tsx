"use client";

import { useState, useMemo } from "react";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Zap,
  ShieldCheck,
  Loader2,
  ChevronRight,
  Target,
  Activity,
  Settings2,
  SmartphoneNfc,
  Sparkles,
  BadgeCheck,
  Globe,
  FileText,
  Users,
  MapPin,
  ShoppingBasket,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  runTransaction,
} from "@/firebase";
import {
  collection,
  doc,
  serverTimestamp,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { format, addYears } from "date-fns";
import { useRouter } from "next/navigation";
import { sendWhatsAppTemplate } from "@/app/actions/whatsapp-actions";
import { HandoverCertificate } from "../../components/HandoverCertificate";

const INSTALLATION_STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: any }
> = {
  READY_TO_SCHEDULE: {
    label: "Ready to Schedule",
    className: "bg-sky-50 text-sky-700 border-sky-200",
    icon: Clock,
  },
  SCHEDULED: {
    label: "Scheduled",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: Target,
  },
  TEAM_ASSIGNED: {
    label: "Team Ready",
    className: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Users,
  },
  MATERIAL_READY: {
    label: "Material Staged",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Zap,
  },
  IN_PROGRESS: {
    label: "Under Installation",
    className: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Activity,
  },
  QUALITY_CHECK: {
    label: "Quality Control",
    className: "bg-pink-50 text-pink-700 border-pink-200",
    icon: ShieldCheck,
  },
  COMMISSIONING: {
    label: "Commissioning",
    className: "bg-cyan-50 text-cyan-700 border-cyan-200",
    icon: Sparkles,
  },
  HANDED_OVER: {
    label: "Handed Over",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: BadgeCheck,
  },
  ON_HOLD: {
    label: "On Hold",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: Clock,
  },
};

export default function SolarInstallationDetailPage(props: { params: { id: string } }) {
  const { id } = props.params;
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const installRef = useMemoFirebase(
    () =>
      businessId && id
        ? doc(firestore, "businesses", businessId, "solarInstallations", id)
        : null,
    [firestore, businessId, id]
  );
  const { data: install, isLoading: isInstallLoading } = useDoc<any>(installRef);

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const activeAddonIds = useMemo(() => business?.activeAddonIds || [], [business]);
  const isWhatsappEntitled =
    activeAddonIds.includes("feat_whatsapp") || activeAddonIds.includes("suite_growth");

  const warrantiesQuery = useMemoFirebase(
    () =>
      businessId && id
        ? query(
            collection(firestore, "businesses", businessId, "solarWarranties"),
            where("solarInstallationId", "==", id)
          )
        : null,
    [firestore, businessId, id]
  );
  const { data: relatedWarranties = [] } = useCollection<any>(warrantiesQuery);

  const docsQuery = useMemoFirebase(
    () =>
      businessId && id
        ? query(
            collection(firestore, "businesses", businessId, "solarDocuments"),
            where("installationId", "==", id)
          )
        : null,
    [firestore, businessId, id]
  );
  const { data: documents = [] } = useCollection<any>(docsQuery);

  const reqsQuery = useMemoFirebase(
    () =>
      businessId && id
        ? query(
            collection(firestore, "businesses", businessId, "solarPurchaseRequisitions"),
            where("installationId", "==", id)
          )
        : null,
    [firestore, businessId, id]
  );
  const { data: requisitions = [] } = useCollection<any>(reqsQuery);

  const [activeTab, setActiveTab] = useState("overview");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isWarrantyLoading, setIsWarrantyLoading] = useState(false);
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [isPlantLoading, setIsPlantLoading] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  const handleUpdateStatus = (status: string) => {
    if (!installRef) return;
    updateDocumentNonBlocking(installRef, { status, updatedAt: serverTimestamp() });
    toast({ title: "Site status updated" });
  };

  const handleNotifyCustomer = async () => {
    if (!install || !businessId) return;

    if (!isWhatsappEntitled) {
      toast({
        title: "Growth Feature Required",
        description: "Customer WhatsApp notifications require the Growth Suite.",
        action: (
          <Button variant="outline" size="sm" asChild>
            <Link href="/marketplace">Upgrade</Link>
          </Button>
        ),
      });
      return;
    }

    const waConfig = business?.whatsappApiConfig;
    if (!waConfig?.isVerified) {
      toast({ variant: "destructive", title: "API Unlinked" });
      return;
    }

    setIsNotifying(true);
    try {
      const targetPhone = "91" + (install.customerPhone || "").replace(/\D/g, "").slice(-10);
      const res = await sendWhatsAppTemplate(
        businessId,
        { phoneId: waConfig.phoneId, accessToken: waConfig.accessToken },
        targetPhone,
        waConfig.welcomeTemplateName || "hello_world",
        waConfig.welcomeLanguageCode || "en_IN",
        [
          {
            type: "body",
            parameters: [
              { type: "text", text: install.customerName },
              {
                type: "text",
                text: `Your ${install.capacityKw}kW system installation status: ${(
                  install.status || "SCHEDULED"
                ).replace(/_/g, " ")}`,
              },
              {
                type: "text",
                text: `${window.location.origin}/projects/track/${businessId}/${install.solarInquiryId}`,
              },
            ],
          },
        ]
      );
      if (res.success) toast({ title: "Status update sent to client" });
      else toast({ variant: "destructive", title: "Dispatch failed", description: res.error });
    } finally {
      setIsNotifying(false);
    }
  };

  const handleActivateWarranty = async () => {
    if (!businessId || !install || isWarrantyLoading) return;
    setIsWarrantyLoading(true);
    try {
      const warrantyId = `WAR-${Math.floor(100000 + Math.random() * 900000)}`;
      const startDate = new Date();
      const endDate = addYears(startDate, 5);

      const components = (install.materials || []).map((m: any) => ({
        productId: m.productId,
        productName: m.productName,
        category: m.category,
        period:
          m.category === "Panels"
            ? "25 Years"
            : m.category === "Inverter"
              ? "5 Years"
              : "10 Years",
      }));

      const warData = {
        warrantyNumber: warrantyId,
        businessId,
        customerId: install.customerId,
        customerName: install.customerName,
        solarInstallationId: id,
        solarSystemDesignId: install.solarSystemDesignId,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        status: "ACTIVE",
        coveredComponents: components,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const warDocRef = await addDocumentNonBlocking(
        collection(firestore, "businesses", businessId, "solarWarranties"),
        warData
      );

      if (warDocRef) {
        addDocumentNonBlocking(
          collection(firestore, "businesses", businessId, "solarDocuments"),
          {
            businessId,
            documentType: "WARRANTY_CERTIFICATE",
            title: `Warranty Certificate: ${warrantyId}`,
            entityType: "WARRANTY",
            entityId: warDocRef.id,
            customerId: install.customerId,
            customerName: install.customerName,
            installationId: id,
            visibility: "CUSTOMER_VISIBLE",
            createdAt: serverTimestamp(),
          }
        );
      }

      toast({
        title: "Warranty activated",
        description: `Registry record ${warrantyId} created.`,
      });
      router.push("/solar/warranties");
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Activation failed" });
    } finally {
      setIsWarrantyLoading(false);
    }
  };

  const handleDeployPlant = async () => {
    if (!businessId || !install || isPlantLoading) return;
    setIsPlantLoading(true);

    try {
      const plantsRef = collection(firestore, "businesses", businessId, "solarPlants");
      const existingQuery = query(plantsRef, where("installationId", "==", id), limit(1));
      const existingSnap = await getDocs(existingQuery);

      if (!existingSnap.empty) {
        toast({
          title: "Plant record already exists",
          description: "Opening the registered solar plant.",
        });
        router.push(`/solar/plants/${existingSnap.docs[0].id}`);
        return;
      }

      const plantId = `PLANT-${Math.floor(100000 + Math.random() * 900000)}`;
      const equipment = (install.materials || []).map((m: any) => ({
        productId: m.productId,
        productName: m.productName,
        quantity: m.issued || 0,
        category: m.category || "General",
        serialNumber: m.specs || "",
      }));

      const plantData = {
        id: plantId,
        businessId,
        plantReference: plantId,
        customerId: install.customerId,
        customerName: install.customerName,
        installationId: id,
        designId: install.solarSystemDesignId || null,
        status: "ACTIVE",
        installedCapacityKwp: install.capacityKw || 0,
        systemType: install.systemType || "On-grid",
        commissioningDate: new Date().toISOString().split("T")[0],
        handoverDate:
          install.handoverDate?.split("T")[0] || new Date().toISOString().split("T")[0],
        monitoringStatus: "NOT_CONNECTED",
        equipment,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDocumentNonBlocking(plantsRef, plantData);
      toast({
        title: "Plant asset registered",
        description: `Plant ${plantId} initialized in registry.`,
      });
      if (docRef) router.push(`/solar/plants/${docRef.id}`);
    } finally {
      setIsPlantLoading(false);
    }
  };

  const handleHandoverFinalize = async (pdfBase64: string) => {
    if (!businessId || !install || !installRef) return;
    setIsUpdating(true);
    try {
      updateDocumentNonBlocking(installRef, {
        status: "HANDED_OVER",
        handoverDate: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });

      await addDocumentNonBlocking(
        collection(firestore, "businesses", businessId, "solarDocuments"),
        {
          businessId,
          documentType: "HANDOVER_CERTIFICATE",
          title: `Handover Certificate: ${install.installationNumber}`,
          entityType: "INSTALLATION",
          entityId: id,
          customerId: install.customerId,
          customerName: install.customerName,
          installationId: id,
          base64: pdfBase64,
          visibility: "CUSTOMER_VISIBLE",
          createdAt: serverTimestamp(),
        }
      );

      toast({
        title: "Handover complete",
        description: "Site handed over and certificate logged.",
      });
      setIsHandoverOpen(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Handover failed" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleIssueMaterials = async (componentIdx: number) => {
    if (!installRef || !install || !businessId) return;
    const material = install.materials[componentIdx];
    const qtyToIssue = material.required - (material.issued || 0);

    if (qtyToIssue <= 0) {
      toast({
        variant: "destructive",
        title: "Already issued",
        description: "Full quantity for this component is already out.",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const productRef = doc(
        firestore,
        "businesses",
        businessId,
        "products",
        material.productId
      );

      const result = await runTransaction(firestore, async (transaction) => {
        const productSnap = await transaction.get(productRef);
        const installSnap = await transaction.get(installRef);

        if (!productSnap.exists()) throw new Error("PRODUCT_NOT_FOUND");
        if (!installSnap.exists()) throw new Error("INSTALL_NOT_FOUND");

        const pData = productSnap.data() as any;
        const iData = installSnap.data() as any;

        if (typeof pData.stock !== "number" || pData.stock < qtyToIssue)
          throw new Error("INSUFFICIENT_STOCK");

        const newStock = pData.stock - qtyToIssue;
        const currentMaterials = iData.materials || [];
        const updatedMaterials = [...currentMaterials];

        updatedMaterials[componentIdx] = {
          ...updatedMaterials[componentIdx],
          issued: (updatedMaterials[componentIdx].issued || 0) + qtyToIssue,
          allocated: (updatedMaterials[componentIdx].allocated || 0) + qtyToIssue,
          unitCostAtIssue: pData.cost || 0,
        };

        transaction.update(productRef, { stock: newStock });
        transaction.update(installRef, {
          materials: updatedMaterials,
          updatedAt: serverTimestamp(),
        });

        return {
          productName: pData.name,
          unitCost: pData.cost || 0,
          installNum: iData.installationNumber,
          projId: iData.projectId,
        };
      });

      if (result) {
        addDocumentNonBlocking(collection(firestore, "businesses", businessId, "cashbook"), {
          businessId,
          type: "debit",
          amount: (result.unitCost || 0) * qtyToIssue,
          particulars: `Material Issue: ${result.productName} for ${result.installNum}`,
          category: "Purchase",
          projectId: result.projId,
          date: new Date().toISOString().split("T")[0],
          createdAt: serverTimestamp(),
        });
        toast({ title: "Materials dispatched" });
      }
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Issuance blocked",
        description: error.message,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isInstallLoading || isProfileLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400 h-8 w-8" />
      </div>
    );
  }

  if (!install) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <EmptyStatePanel
          icon={Briefcase}
          title="Installation not found"
          description="This field installation record may have been removed."
          action={
            <Button asChild variant="outline" className="rounded-xl border-slate-200">
              <Link href="/solar/installations">Back to Installations</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const isHandedOver = install.status === "HANDED_OVER";
  const hasWarranty = relatedWarranties.length > 0;
  const sInfo =
    INSTALLATION_STATUS_CONFIG[install.status] ||
    INSTALLATION_STATUS_CONFIG.READY_TO_SCHEDULE;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 text-left">
      <PageHeader
        breadcrumb={`Installation ${install.installationNumber}`}
        title={install.customerName || "Installation Site"}
        description="Manage site progress, bill of materials issuance, commissioning, and handover."
        backHref="/solar/installations"
        backLabel="Back to installations"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {!isHandedOver && install.progress === 100 && (
              <Button
                type="button"
                onClick={() => setIsHandoverOpen(true)}
                className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Final Handover
              </Button>
            )}
            {isHandedOver && (
              <Button
                type="button"
                onClick={handleDeployPlant}
                disabled={isPlantLoading}
                className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold"
              >
                {isPlantLoading ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <Globe className="h-4 w-4 mr-2" />
                )}
                Register Solar Plant
              </Button>
            )}
            <Select value={install.status} onValueChange={handleUpdateStatus}>
              <SelectTrigger
                aria-label="Installation status"
                className={cn("h-10 rounded-xl font-medium w-48 border", sInfo.className)}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                {Object.keys(INSTALLATION_STATUS_CONFIG).map((s) => (
                  <SelectItem key={s} value={s} className="text-sm font-medium">
                    {INSTALLATION_STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="bg-slate-900 p-6 sm:p-8 text-white border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
              <div className="space-y-2">
                <Badge className="bg-white/10 text-slate-200 border border-white/15 text-xs font-medium">
                  Field Execution
                </Badge>
                <h2 className="text-2xl sm:text-3xl font-bold font-mono tabular-nums">
                  {install.capacityKw} kWp {install.systemType}
                </h2>
                <p className="text-xs text-slate-300">
                  Supervisor: {install.supervisorName || "Unassigned"}
                </p>
              </div>
              <div className="space-y-2 sm:text-right">
                <p className="text-xs text-slate-300">Execution Progress</p>
                <div className="flex items-center gap-3">
                  <Progress value={install.progress || 0} className="h-2 w-32 bg-white/15" />
                  <span className="text-xl font-bold font-mono tabular-nums text-white">
                    {install.progress || 0}%
                  </span>
                </div>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 border-b border-slate-100 bg-slate-50/50">
                <TabsList className="bg-transparent h-12 p-0 gap-6 border-none overflow-x-auto flex">
                  <TabsTrigger
                    value="overview"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:bg-transparent rounded-none h-12 text-xs font-semibold text-slate-500 px-0"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="materials"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:bg-transparent rounded-none h-12 text-xs font-semibold text-slate-500 px-0"
                  >
                    Materials ({(install.materials || []).length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="documents"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:bg-transparent rounded-none h-12 text-xs font-semibold text-slate-500 px-0"
                  >
                    Documents ({documents.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6 sm:p-8 text-left">
                <TabsContent value="overview" className="m-0 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                      <h3 className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> Site Profile
                      </h3>
                      <div>
                        <p className="text-xs text-slate-500">Handover Target</p>
                        <p className="text-sm font-semibold font-mono tabular-nums text-slate-900 mt-0.5">
                          {install.scheduledEndDate || "As soon as possible"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">System Architecture</p>
                        <Badge
                          variant="outline"
                          className="bg-white border-slate-200 text-slate-800 text-xs font-medium mt-1"
                        >
                          {install.systemType}
                        </Badge>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                      <h3 className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" /> Assigned Technicians
                      </h3>
                      {(install.assignedTeamNames || []).length === 0 ? (
                        <p className="text-xs text-slate-500">No field technicians assigned.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {(install.assignedTeamNames || []).map((name: string) => (
                            <Badge
                              key={name}
                              variant="outline"
                              className="bg-white border-slate-200 text-slate-700 text-xs font-medium"
                            >
                              {name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <ShoppingBasket className="h-3.5 w-3.5" /> Supply Chain & Shortages
                      </h3>
                      {requisitions.length > 0 && (
                        <Badge
                          variant="outline"
                          className="border-slate-200 bg-slate-50 text-slate-700 font-mono tabular-nums text-xs"
                        >
                          {requisitions.length} Purchase Requisitions
                        </Badge>
                      )}
                    </div>
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Material Planning Hub
                        </p>
                        <p className="text-xs text-slate-500">
                          Check component shortages and raise vendor requisitions.
                        </p>
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-slate-200 bg-white font-medium"
                      >
                        <Link href={`/solar/procurement/new?installId=${id}`}>
                          Launch Planner <ChevronRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="materials" className="m-0">
                  {(install.materials || []).length === 0 ? (
                    <EmptyStatePanel
                      icon={ShoppingBasket}
                      title="No BOM components linked"
                      description="This installation has no bill of materials items configured."
                    />
                  ) : (
                    <div className="rounded-xl border border-slate-200 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 border-b border-slate-200">
                            <TableHead className="pl-5 text-xs font-semibold text-slate-600 h-10">
                              Component
                            </TableHead>
                            <TableHead className="text-center text-xs font-semibold text-slate-600 h-10">
                              Required
                            </TableHead>
                            <TableHead className="text-center text-xs font-semibold text-slate-600 h-10">
                              Issued
                            </TableHead>
                            <TableHead className="text-right pr-5 text-xs font-semibold text-slate-600 h-10 w-28">
                              Action
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(install.materials || []).map((m: any, i: number) => {
                            const isFull = (m.issued || 0) >= (m.required || 0);
                            return (
                              <TableRow
                                key={i}
                                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                              >
                                <TableCell className="pl-5 py-3.5">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {m.productName}
                                  </p>
                                  <p className="text-xs text-slate-500">{m.category}</p>
                                </TableCell>
                                <TableCell className="text-center font-mono tabular-nums text-xs font-semibold text-slate-700">
                                  {m.required} {m.unit}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "font-mono tabular-nums text-xs h-6",
                                      isFull
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-slate-100 text-slate-600 border-slate-200"
                                    )}
                                  >
                                    {m.issued || 0} {m.unit}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right pr-5">
                                  {!isFull && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleIssueMaterials(i)}
                                      disabled={isUpdating}
                                      className="h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
                                    >
                                      Issue Stock
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="documents" className="m-0">
                  {documents.length === 0 ? (
                    <EmptyStatePanel
                      icon={FileText}
                      title="No documents registered"
                      description="Handover certificates and warranty documents will appear here automatically."
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {documents.map((docItem: any) => {
                        const docUrl = docItem.contentUrl || docItem.base64;
                        return (
                          <div
                            key={docItem.id}
                            className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between space-y-4"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="h-9 w-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs font-medium",
                                    docItem.visibility === "CUSTOMER_VISIBLE"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                                  )}
                                >
                                  {docItem.visibility?.replace(/_/g, " ") || "Internal"}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {docItem.title}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {docItem.documentType?.replace(/_/g, " ")}
                                </p>
                              </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                              <span className="text-xs font-mono tabular-nums text-slate-500">
                                {format(
                                  docItem.createdAt?.toDate
                                    ? docItem.createdAt.toDate()
                                    : new Date(),
                                  "dd MMM yyyy"
                                )}
                              </span>
                              {docUrl ? (
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-lg border-slate-200 text-xs font-medium"
                                >
                                  <a
                                    href={docUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    View Document
                                  </a>
                                </Button>
                              ) : (
                                <span className="text-xs text-slate-400">Indexed</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <SectionCard title="Client Connect">
            {isWhatsappEntitled ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Notify the customer about the current installation progress via WhatsApp.
                </p>
                <Button
                  type="button"
                  onClick={handleNotifyCustomer}
                  disabled={isNotifying}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
                >
                  {isNotifying ? (
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  ) : (
                    <SmartphoneNfc className="h-4 w-4 mr-2" />
                  )}
                  Send Status Update
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  WhatsApp automation is available in the Growth Suite.
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="w-full h-10 rounded-xl border-slate-200 font-medium"
                >
                  <Link href="/marketplace">
                    Activate Growth Suite <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Execution Summary">
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Field Progress</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {install.progress || 0}%
                  </span>
                </div>
                <Progress value={install.progress || 0} className="h-2 bg-slate-100" />
              </div>

              <Separator />

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Supervisor & team assigned</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Bill of materials linked</span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>
                    {hasWarranty
                      ? "System warranty registered"
                      : "Warranty ready after handover"}
                  </span>
                </div>
              </div>

              {isHandedOver && !hasWarranty && (
                <Button
                  type="button"
                  onClick={handleActivateWarranty}
                  disabled={isWarrantyLoading}
                  variant="outline"
                  className="w-full h-10 rounded-xl border-slate-200 font-medium"
                >
                  {isWarrantyLoading ? (
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 mr-2" />
                  )}
                  Activate System Warranty
                </Button>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      <Dialog open={isHandoverOpen} onOpenChange={setIsHandoverOpen}>
        <DialogContent className="sm:max-w-[900px] h-[90vh] p-0 overflow-hidden rounded-2xl border border-slate-200 flex flex-col">
          <DialogHeader className="px-6 py-5 bg-slate-900 text-white border-b border-slate-800 shrink-0 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <Palette className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Handover Certificate Authorization
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 mt-0.5">
                  Review installation details before finalizing customer handover.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 bg-slate-100 overflow-auto py-8 px-4 flex justify-center">
            <div className="scale-90 sm:scale-100 origin-top">
              <HandoverCertificate install={install} business={business} isPreview />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-white border-t border-slate-200 flex flex-row gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 rounded-xl border-slate-200 font-medium"
              onClick={() => setIsHandoverOpen(false)}
            >
              Back to Site
            </Button>
            <Button
              type="button"
              disabled={isUpdating}
              onClick={() => handleHandoverFinalize("DATA_REDACTED_PREVIEW")}
              className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl"
            >
              {isUpdating && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
              Confirm & Authorize Handover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
