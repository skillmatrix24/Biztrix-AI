"use client";

import {
  ShieldCheck,
  Shield,
  Loader2,
  ChevronRight,
  Info,
  ArrowRight,
  Package,
  Sparkles,
  Printer,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  updateDocumentNonBlocking,
} from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

const WARRANTY_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Active Coverage",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  EXPIRING_SOON: {
    label: "Expiring Soon",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  EXPIRED: {
    label: "Expired",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  CLAIM_OPEN: {
    label: "Open Claim",
    className: "bg-sky-50 text-sky-700 border-sky-200",
  },
};

export default function WarrantyDetailPage(props: { params: { id: string } }) {
  const { id } = props.params;
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const warRef = useMemoFirebase(
    () =>
      businessId && id
        ? doc(firestore, "businesses", businessId, "solarWarranties", id)
        : null,
    [firestore, businessId, id]
  );
  const { data: warranty, isLoading: isWarLoading } = useDoc<any>(warRef);

  const handleUpdateStatus = (status: string) => {
    if (!warRef) return;
    updateDocumentNonBlocking(warRef, { status, updatedAt: serverTimestamp() });
    toast({ title: "Coverage status updated" });
  };

  if (isProfileLoading || isWarLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400 h-8 w-8" />
      </div>
    );
  }

  if (!warranty) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <EmptyStatePanel
          icon={ShieldCheck}
          title="Warranty record not found"
          description="This warranty certificate may have been removed."
          action={
            <Button asChild variant="outline" className="rounded-xl border-slate-200">
              <Link href="/solar/warranties">Back to Warranties</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const sInfo =
    WARRANTY_STATUS_CONFIG[warranty.status] || WARRANTY_STATUS_CONFIG.ACTIVE;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 text-left">
      <PageHeader
        breadcrumb={`Warranty ${warranty.warrantyNumber}`}
        title={warranty.customerName || "Warranty Certificate"}
        description="View covered hardware terms, validity dates, and service claim options."
        backHref="/solar/warranties"
        backLabel="Back to warranties"
        actions={
          <Select value={warranty.status} onValueChange={handleUpdateStatus}>
            <SelectTrigger
              aria-label="Warranty status"
              className={cn("h-10 rounded-xl font-medium w-48 border", sInfo.className)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              {Object.keys(WARRANTY_STATUS_CONFIG).map((s) => (
                <SelectItem key={s} value={s} className="text-sm font-medium">
                  {WARRANTY_STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="bg-slate-900 p-6 sm:p-8 text-white border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  <Shield className="h-6 w-6 text-emerald-300" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    System Coverage Certificate
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Verified by Biztrix AI
                  </p>
                </div>
              </div>
              <div className="sm:text-right space-y-1.5">
                <p className="text-xs text-slate-300">Validity Period</p>
                <p className="text-lg font-bold font-mono tabular-nums text-white">
                  {warranty.startDate} — {warranty.endDate}
                </p>
                <Badge className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-medium">
                  {sInfo.label}
                </Badge>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Covered Components
                  </h3>
                </div>
                {(warranty.coveredComponents || []).length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No component items listed on this certificate.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(warranty.coveredComponents || []).map((comp: any, i: number) => (
                      <div
                        key={i}
                        className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {comp.productName}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {comp.category || "Hardware"}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-white border-slate-200 text-slate-700 font-mono tabular-nums text-xs shrink-0"
                        >
                          {comp.period}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <Separator />

              <section className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" /> Coverage Terms
                </h3>
                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-600 leading-relaxed">
                  Full technical coverage on manufacturing defects and installation
                  workmanship. Excludes damage caused by severe weather events or
                  unauthorized third-party modifications.
                </div>
              </section>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-xs text-slate-600">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Registered to {warranty.customerName}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => window.print()}
                  variant="outline"
                  className="h-10 rounded-xl border-slate-200 bg-white font-medium"
                >
                  <Printer className="mr-2 h-4 w-4" /> Print Certificate
                </Button>
                <Button
                  asChild
                  className="h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl"
                >
                  <Link href="/solar/service/new">Open Service Claim</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <SectionCard title="Related Records">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Installation Record</p>
                <Button
                  asChild
                  variant="link"
                  className="h-auto p-0 font-semibold text-slate-900 text-sm"
                >
                  <Link href={`/solar/installations/${warranty.solarInstallationId}`}>
                    View Site Execution <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              {warranty.solarSystemDesignId && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">System Design</p>
                    <Button
                      asChild
                      variant="link"
                      className="h-auto p-0 font-semibold text-slate-900 text-sm"
                    >
                      <Link href={`/solar/designs/${warranty.solarSystemDesignId}`}>
                        View Technical Design <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </SectionCard>

          <div className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </div>
              <h3 className="text-base font-bold">AMC Renewal Retention</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Warranties nearing expiry can be enrolled into recurring AMC maintenance
              programs through Automated Growth Campaigns.
            </p>
            <Separator className="bg-white/10" />
            <Button
              asChild
              variant="outline"
              className="w-full h-10 bg-white/5 border-white/15 text-white hover:bg-white/10 font-medium rounded-xl"
            >
              <Link href="/loyalty/automation">
                Configure AMC Sequence <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
