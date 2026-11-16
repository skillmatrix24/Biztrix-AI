"use client";

import { useState } from "react";
import {
  Settings2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  Sparkles,
  Loader2,
  Activity,
  Calculator,
  FileSpreadsheet,
  History,
  Package,
  ArrowRight,
  BadgeCheck,
  FileText,
} from "lucide-react";
import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
} from "@/firebase";
import { doc, serverTimestamp, collection } from "firebase/firestore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageHeader,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

const DESIGN_STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: any }
> = {
  DRAFT: {
    label: "Draft Mode",
    badgeClass: "text-slate-700 bg-slate-100 border-slate-200",
    icon: Clock,
  },
  IN_REVIEW: {
    label: "Tech Review",
    badgeClass: "text-amber-700 bg-amber-50 border-amber-200",
    icon: Activity,
  },
  APPROVED: {
    label: "Approved",
    badgeClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
    icon: CheckCircle2,
  },
  REVISION_REQUIRED: {
    label: "Revision Required",
    badgeClass: "text-rose-700 bg-rose-50 border-rose-200",
    icon: History,
  },
  ARCHIVED: {
    label: "Archived",
    badgeClass: "text-slate-500 bg-slate-100 border-slate-200",
    icon: Zap,
  },
};

export default function SolarDesignDetailPage(props: {
  params: { id: string };
}) {
  const { id } = props.params;
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const designRef = useMemoFirebase(
    () =>
      businessId && id
        ? doc(firestore, "businesses", businessId, "solarSystemDesigns", id)
        : null,
    [firestore, businessId, id]
  );
  const { data: design, isLoading: isDesignLoading } = useDoc<any>(designRef);

  const [isQuoting, setIsQuoting] = useState(false);

  const handleUpdateStatus = (status: string) => {
    if (!designRef) return;
    updateDocumentNonBlocking(designRef, {
      status,
      updatedAt: serverTimestamp(),
    });
    toast({ title: "Design Status Updated" });
  };

  const handleGenerateQuotation = async () => {
    if (!businessId || !design || isQuoting) return;
    setIsQuoting(true);
    try {
      const quotesRef = collection(
        firestore,
        "businesses",
        businessId,
        "quotations"
      );
      const quoteId = `SOLAR-Q-${Math.floor(1000 + Math.random() * 9000)}`;

      const items = (design.components || []).map((c: any) => ({
        productId: c.productId,
        name: c.productName,
        quantity: c.quantity,
        price: c.price,
        gstRate: c.gstRate || 0,
        unit: c.unit || "pcs",
      }));

      const subtotal = items.reduce(
        (sum: number, i: any) => sum + i.price * i.quantity,
        0
      );
      const taxTotal = items.reduce(
        (sum: number, i: any) => sum + i.price * i.quantity * (i.gstRate / 100),
        0
      );

      const newQuoteData = {
        id: quoteId,
        quotationId: quoteId,
        businessId,
        customerId: design.customerId,
        customerName: design.customerName,
        solarInquiryId: design.solarInquiryId,
        solarSurveyId: design.solarSurveyId,
        solarSystemDesignId: design.id,
        items,
        totals: {
          grossSubtotal: subtotal + taxTotal,
          taxTotal: taxTotal,
          finalPayout: Math.round(subtotal + taxTotal),
        },
        status: "sent",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDocumentNonBlocking(quotesRef, newQuoteData);
      toast({
        title: "Quotation Created",
        description: `Proposal ${quoteId} generated from design.`,
      });
      router.push(`/solar/quotations`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Failed to Create Quotation" });
    } finally {
      setIsQuoting(false);
    }
  };

  if (isDesignLoading || isProfileLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-600 h-8 w-8" />
      </div>
    );
  }

  if (!design) {
    return (
      <div className="max-w-xl mx-auto py-16">
        <EmptyStatePanel
          icon={Settings2}
          title="System Design Not Found"
          description="This design record may have been removed or belongs to another workspace."
          action={
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/solar/designs">Back to Registry</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const sInfo =
    DESIGN_STATUS_CONFIG[design.status] || DESIGN_STATUS_CONFIG.DRAFT;
  const isApproved = design.status === "APPROVED";

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24 text-left">
      <PageHeader
        backHref="/solar/designs"
        backLabel="Back to Designs"
        breadcrumb={`Design #${id.slice(-8).toUpperCase()}`}
        title={design.customerName}
        actions={
          <Select value={design.status} onValueChange={handleUpdateStatus}>
            <SelectTrigger
              aria-label="Update system design status"
              className={cn(
                "h-10 rounded-xl font-semibold text-sm w-full md:w-48 border",
                sInfo.badgeClass
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {Object.keys(DESIGN_STATUS_CONFIG).map((s) => (
                <SelectItem key={s} value={s} className="text-sm font-medium">
                  {DESIGN_STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="bg-slate-900 p-6 sm:p-8 text-white text-left space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
                  <Settings2 className="h-6 w-6 text-amber-400" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold leading-tight">
                    System Specification Summary
                  </h2>
                  <p className="text-slate-300 text-xs font-mono tabular-nums mt-1">
                    Revision {design.version || 1}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-left">
                  <p className="text-xs text-slate-400 mb-1">System Capacity</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-white">
                    {design.capacityKw}{" "}
                    <span className="text-sm font-normal text-slate-300">
                      kW
                    </span>
                  </p>
                  <Badge
                    variant="outline"
                    className="mt-2 bg-white/10 text-slate-200 border-white/15 text-xs font-medium px-2 py-0"
                  >
                    {design.systemType}
                  </Badge>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-left">
                  <p className="text-xs text-slate-400 mb-1">Electrical Grid</p>
                  <p className="text-lg font-bold text-white">
                    {design.phaseType}
                  </p>
                  <p className="text-xs text-slate-300 font-mono tabular-nums mt-1.5">
                    Created:{" "}
                    {design.createdAt?.toDate
                      ? format(design.createdAt.toDate(), "dd MMM yyyy")
                      : "--"}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-8 text-left">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-left">
                  <Package className="h-4 w-4 text-slate-700" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Technical Bill of Materials (BOM)
                  </h3>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 border-b border-slate-200">
                        <TableHead className="pl-5 text-xs font-semibold text-slate-600 h-11">
                          Component
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                          Qty
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                          Unit
                        </TableHead>
                        <TableHead className="text-right pr-5 text-xs font-semibold text-slate-600 h-11">
                          SKU / Spec
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(design.components || []).length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="p-6 text-center text-xs text-slate-500"
                          >
                            No components listed in this BOM.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (design.components || []).map((c: any, i: number) => (
                          <TableRow
                            key={i}
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors"
                          >
                            <TableCell className="pl-5 py-3.5">
                              <span className="text-sm font-semibold text-slate-900">
                                {c.productName}
                              </span>
                            </TableCell>
                            <TableCell className="text-center font-mono tabular-nums font-semibold text-sm text-slate-900">
                              {c.quantity}
                            </TableCell>
                            <TableCell className="text-center text-xs font-medium text-slate-600">
                              {c.unit}
                            </TableCell>
                            <TableCell className="text-right pr-5">
                              <Badge
                                variant="outline"
                                className="text-xs font-mono border-slate-200 text-slate-600"
                              >
                                {c.specs || "Std Spec"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </section>

              <Separator className="bg-slate-200" />

              <section className="space-y-4 text-left">
                <div className="flex items-center gap-2 text-left">
                  <Calculator className="h-4 w-4 text-slate-700" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Engineering Sizing Check
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-left">
                    <p className="text-xs text-slate-500">
                      Calculated Panel DC Capacity
                    </p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                      {design.calculatedDcKw?.toFixed(2) || "0.00"}{" "}
                      <span className="text-sm font-normal text-slate-500">
                        kWp
                      </span>
                    </p>
                  </div>
                  <div className="p-5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1 text-left">
                    <p className="text-xs text-emerald-700">
                      Inverter Target Capacity
                    </p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-emerald-800">
                      {design.capacityKw}{" "}
                      <span className="text-sm font-normal text-emerald-700">
                        kW
                      </span>
                    </p>
                  </div>
                </div>
              </section>

              {design.notes && (
                <section className="space-y-2.5">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-700" /> Engineering
                    Notes
                  </h3>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 leading-relaxed text-left">
                    {design.notes}
                  </div>
                </section>
              )}
            </div>

            <CardFooter className="bg-slate-50 p-6 border-t border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-left">
                <ShieldCheck className="h-7 w-7 text-emerald-600 shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-900">
                    Verified Engineering Baseline
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ready for quotation generation once approved
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 md:flex-none h-10 px-4 rounded-xl font-semibold text-sm border-slate-200 bg-white"
                  onClick={() => window.print()}
                >
                  Technical Print
                </Button>
                {design.status !== "APPROVED" && (
                  <Button
                    type="button"
                    onClick={() => handleUpdateStatus("APPROVED")}
                    className="flex-1 md:flex-none h-10 px-5 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold text-sm text-white"
                  >
                    Approve Design
                  </Button>
                )}
                {isApproved && (
                  <Button
                    type="button"
                    onClick={handleGenerateQuotation}
                    disabled={isQuoting}
                    className="flex-1 md:flex-none h-10 px-5 bg-slate-900 hover:bg-slate-800 rounded-xl font-semibold text-sm text-white"
                  >
                    {isQuoting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                    )}
                    Generate Solar Proposal
                  </Button>
                )}
              </div>
            </CardFooter>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 text-left">
          <SectionCard
            title="Related Records"
            headerRight={<History className="h-4 w-4 text-slate-500" />}
            bodyClassName="space-y-4"
          >
            <div className="space-y-1.5">
              <p className="text-xs text-slate-500">Site Survey</p>
              <Button
                asChild
                variant="outline"
                className="w-full h-10 rounded-xl font-semibold text-sm justify-between"
              >
                <Link href={`/solar/surveys/${design.solarSurveyId}`}>
                  View Site Survey <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <Separator className="bg-slate-200" />
            <div className="space-y-1.5">
              <p className="text-xs text-slate-500">Customer Inquiry</p>
              <Button
                asChild
                variant="outline"
                className="w-full h-10 rounded-xl font-semibold text-sm justify-between"
              >
                <Link href={`/solar/inquiries/${design.solarInquiryId}`}>
                  Open Inquiry Details <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </SectionCard>

          <div className="p-6 bg-slate-900 text-white rounded-2xl space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-base font-bold text-white">
                Proposal Workflow
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Once approved, click Generate Solar Proposal to populate quotation
              line items and tax rates automatically from this BOM.
            </p>
            <Separator className="bg-white/15" />
            <div className="flex items-center gap-2 text-xs text-emerald-300">
              <BadgeCheck className="h-4 w-4 shrink-0" />
              <span>Workspace Records Isolated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
