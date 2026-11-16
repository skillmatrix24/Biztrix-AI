"use client";

import { useState } from "react";
import {
  Handshake,
  ShieldCheck,
  Loader2,
  History,
  Calculator,
  ArrowRight,
  SmartphoneNfc,
} from "lucide-react";
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
  addDocumentNonBlocking,
} from "@/firebase";
import { doc, serverTimestamp, collection } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";

const COMMISSION_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  CALCULATED: {
    label: "Calculated",
    className: "bg-sky-50 text-sky-700 border-sky-200",
  },
  PENDING_APPROVAL: {
    label: "Reviewing",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  PAYABLE: {
    label: "Ready to Pay",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  PAID: {
    label: "Settled",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

export default function CommissionDetailPage(props: { params: { id: string } }) {
  const { id } = props.params;
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const commRef = useMemoFirebase(
    () =>
      businessId && id
        ? doc(firestore, "businesses", businessId, "solarDealerCommissions", id)
        : null,
    [firestore, businessId, id]
  );
  const { data: commission, isLoading: isCommLoading } = useDoc<any>(commRef);

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpdateStatus = (status: string) => {
    if (!commRef) return;
    updateDocumentNonBlocking(commRef, { status, updatedAt: serverTimestamp() });
    toast({
      title: "Commission updated",
      description: `Status changed to ${status}.`,
    });
  };

  const handleRecordPayout = async () => {
    if (!businessId || !commission || isProcessing) return;

    if (commission.status === "PAID") {
      toast({
        variant: "destructive",
        title: "Already settled",
        description: "This commission record has already been closed.",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const cashbookRef = collection(firestore, "businesses", businessId, "cashbook");

      await addDocumentNonBlocking(cashbookRef, {
        businessId,
        type: "debit",
        amount: parseFloat(commission.amount),
        particulars: `Dealer Payout: ${commission.dealerName} (Ref: ${commission.solarQuotationId})`,
        category: "Other",
        entryBy: userProfile?.name || "Admin",
        date: new Date().toISOString().split("T")[0],
        createdAt: serverTimestamp(),
      });

      updateDocumentNonBlocking(commRef!, {
        status: "PAID",
        paidAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Payout recorded",
        description: "Commission settled and logged to Cashbook.",
      });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Payout failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProfileLoading || isCommLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400 h-8 w-8" />
      </div>
    );
  }

  if (!commission) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <EmptyStatePanel
          icon={Handshake}
          title="Commission record not found"
          description="This commission entry may have been deleted."
          action={
            <Button asChild variant="outline" className="rounded-xl border-slate-200">
              <Link href="/solar/commissions">Back to Commissions</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const currencySymbol = getCurrencySymbol(business?.currency);
  const sInfo =
    COMMISSION_STATUS_CONFIG[commission.status] ||
    COMMISSION_STATUS_CONFIG.CALCULATED;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 text-left">
      <PageHeader
        breadcrumb={`Commission COM-${id.slice(-8).toUpperCase()}`}
        title={commission.dealerName || "Partner Commission"}
        description={`Settlement audit for customer ${commission.customerName || "record"}.`}
        backHref="/solar/commissions"
        backLabel="Back to commissions"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <SectionCard
            title="Calculation Audit"
            description={`Rule: ${commission.commissionType || "Standard"} mode`}
            headerRight={
              <Badge
                variant="outline"
                className={cn("text-xs font-medium h-6 px-2.5", sInfo.className)}
              >
                {sInfo.label}
              </Badge>
            }
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-1">
                  <p className="text-xs text-slate-500">Commission Amount</p>
                  <p className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                    {currencySymbol}
                    {parseFloat(commission.amount || 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-1 sm:text-right">
                  <p className="text-xs text-slate-500">Calculation Basis</p>
                  <p className="text-lg font-semibold text-slate-800">
                    {commission.commissionBase?.replace(/_/g, " ") || "Proposal Total"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" /> Settlement Timeline
                </h3>
                <div className="relative pl-5 space-y-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                  <div className="relative">
                    <div className="absolute -left-[18px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-900 ring-2 ring-white" />
                    <p className="text-xs font-semibold text-slate-900">
                      Commission Calculated
                    </p>
                    <p className="text-xs font-mono tabular-nums text-slate-500">
                      {commission.createdAt?.toDate
                        ? format(commission.createdAt.toDate(), "dd MMM yyyy, HH:mm")
                        : "--"}
                    </p>
                  </div>
                  {commission.paidAt && (
                    <div className="relative">
                      <div className="absolute -left-[18px] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-600 ring-2 ring-white" />
                      <p className="text-xs font-semibold text-slate-900">
                        Settlement Processed
                      </p>
                      <p className="text-xs font-mono tabular-nums text-slate-500">
                        {format(new Date(commission.paidAt), "dd MMM yyyy, HH:mm")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {(commission.status === "PAYABLE" ||
                commission.status === "CALCULATED" ||
                commission.status === "PENDING_APPROVAL" ||
                commission.status === "APPROVED") && (
                <>
                  <Separator />
                  <div className="flex flex-wrap gap-3">
                    {commission.status === "PAYABLE" && (
                      <Button
                        type="button"
                        onClick={handleRecordPayout}
                        disabled={isProcessing}
                        className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
                      >
                        {isProcessing ? (
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        ) : (
                          <SmartphoneNfc className="h-4 w-4 mr-2" />
                        )}
                        Disburse & Record Payout
                      </Button>
                    )}
                    {commission.status === "CALCULATED" && (
                      <Button
                        type="button"
                        onClick={() => handleUpdateStatus("PENDING_APPROVAL")}
                        className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl"
                      >
                        <Calculator className="h-4 w-4 mr-2" />
                        Submit for Approval
                      </Button>
                    )}
                    {commission.status === "PENDING_APPROVAL" && (
                      <>
                        <Button
                          type="button"
                          onClick={() => handleUpdateStatus("REJECTED")}
                          variant="outline"
                          className="flex-1 h-11 rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold"
                        >
                          Reject
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleUpdateStatus("APPROVED")}
                          className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
                        >
                          Approve Commission
                        </Button>
                      </>
                    )}
                    {commission.status === "APPROVED" && (
                      <Button
                        type="button"
                        onClick={() => handleUpdateStatus("PAYABLE")}
                        className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl"
                      >
                        Mark as Payable
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <SectionCard title="Source Reference">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Commercial Proposal</p>
                <Button
                  asChild
                  variant="link"
                  className="h-auto p-0 font-semibold text-slate-900 text-sm"
                >
                  <Link href={`/solar/quotations/${commission.solarQuotationId}`}>
                    View Quotation <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Customer</p>
                <p className="text-sm font-semibold text-slate-900">
                  {commission.customerName}
                </p>
              </div>
            </div>
          </SectionCard>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
            <ShieldCheck className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              Commission records maintain a non-destructive audit trail. Every
              approval and payout is logged for partner reconciliation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
