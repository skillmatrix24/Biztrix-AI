"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  Loader2,
  History,
  Package,
  ArrowRight,
  BadgeCheck,
  XCircle,
  Truck,
  LayoutList,
  FileText,
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
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  updateDocumentNonBlocking,
  runTransaction,
} from "@/firebase";
import { doc, serverTimestamp, collection } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

const REQ_STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: any }
> = {
  DRAFT: {
    label: "Draft",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    className: "bg-sky-50 text-sky-700 border-sky-200",
    icon: CheckCircle2,
  },
  ORDERED: {
    label: "Ordered",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Zap,
  },
  PARTIALLY_RECEIVED: {
    label: "Partial Receipt",
    className: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Package,
  },
  RECEIVED: {
    label: "Fulfilled",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: BadgeCheck,
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-rose-50 text-rose-700 border-rose-200",
    icon: XCircle,
  },
};

export default function SolarProcurementDetailPage(props: { params: { id: string } }) {
  const { id } = props.params;
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;
  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "manager";

  const reqRef = useMemoFirebase(
    () =>
      businessId && id
        ? doc(firestore, "businesses", businessId, "solarPurchaseRequisitions", id)
        : null,
    [firestore, businessId, id]
  );
  const { data: req, isLoading: isReqLoading } = useDoc<any>(reqRef);

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const [isReceiving, setIsReceiving] = useState(false);

  const handleUpdateStatus = (status: string) => {
    if (!reqRef || !isAdmin) return;
    updateDocumentNonBlocking(reqRef, { status, updatedAt: serverTimestamp() });
    toast({
      title: "Status updated",
      description: `Requisition status changed to ${status}.`,
    });
  };

  // Atomic goods receiving transaction
  const handleReceiveGoods = async () => {
    if (!businessId || !req || isReceiving || !reqRef) return;

    if (req.status === "RECEIVED") {
      toast({ variant: "destructive", title: "Already fulfilled" });
      return;
    }

    setIsReceiving(true);
    try {
      await runTransaction(firestore, async (transaction) => {
        const freshReqSnap = await transaction.get(reqRef);
        if (!freshReqSnap.exists()) throw new Error("REQUISITION_NOT_FOUND");
        const freshReq = freshReqSnap.data();

        for (const item of freshReq.items || []) {
          const productRef = doc(
            firestore,
            "businesses",
            businessId,
            "products",
            item.productId
          );
          const productSnap = await transaction.get(productRef);

          if (!productSnap.exists()) continue;
          const pData = productSnap.data();
          const newStock = (pData.stock || 0) + (item.planned || 0);

          transaction.update(productRef, {
            stock: newStock,
            lastPurchasePrice: item.unitCost,
            updatedAt: serverTimestamp(),
          });
        }

        transaction.update(reqRef, {
          status: "RECEIVED",
          receivedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const cbRef = doc(collection(firestore, "businesses", businessId, "cashbook"));
        transaction.set(cbRef, {
          businessId,
          type: "debit",
          amount: freshReq.totalEstimatedCost || 0,
          particulars: `Goods Received: ${freshReq.vendorName} (Req: ${id
            .slice(-6)
            .toUpperCase()})`,
          category: "Purchase",
          entryBy: userProfile?.name || "Admin",
          date: new Date().toISOString().split("T")[0],
          createdAt: serverTimestamp(),
        });
      });

      toast({
        title: "Inventory synced",
        description: "Product stock increased and cashbook ledger updated.",
      });
    } catch (e: any) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Goods receipt failed",
        description: e.message,
      });
    } finally {
      setIsReceiving(false);
    }
  };

  if (isProfileLoading || isReqLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400 h-8 w-8" />
      </div>
    );
  }

  if (!req) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <EmptyStatePanel
          icon={Package}
          title="Requisition not found"
          description="This purchase requisition may have been removed."
          action={
            <Button asChild variant="outline" className="rounded-xl border-slate-200">
              <Link href="/solar/procurement">Back to Procurement</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const sInfo = REQ_STATUS_CONFIG[req.status] || REQ_STATUS_CONFIG.DRAFT;
  const currencySymbol = getCurrencySymbol(business?.currency);
  const isFulfilled = req.status === "RECEIVED";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 text-left">
      <PageHeader
        breadcrumb={`Requisition REQ-${id.slice(-8).toUpperCase()}`}
        title={req.vendorName || "Purchase Requisition"}
        description={`Material sourcing for ${req.customerName || "solar installation"}.`}
        backHref="/solar/procurement"
        backLabel="Back to procurement"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {req.status === "ORDERED" && isAdmin && (
              <Button
                type="button"
                onClick={handleReceiveGoods}
                disabled={isReceiving}
                className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {isReceiving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Package className="mr-2 h-4 w-4" />
                )}
                Record Goods Receipt
              </Button>
            )}
            <Select
              value={req.status}
              onValueChange={handleUpdateStatus}
              disabled={!isAdmin || isFulfilled}
            >
              <SelectTrigger
                aria-label="Requisition status"
                className={cn("h-10 rounded-xl font-medium w-48 border", sInfo.className)}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                {Object.keys(REQ_STATUS_CONFIG).map((s) => (
                  <SelectItem key={s} value={s} className="text-sm font-medium">
                    {REQ_STATUS_CONFIG[s].label}
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
            <div className="bg-slate-900 p-6 sm:p-8 text-white border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  <Truck className="h-6 w-6 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {req.vendorName || "Spot Purchase"}
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">Supply Partner</p>
                </div>
              </div>
              <div className="sm:text-right space-y-1">
                <p className="text-xs text-slate-300">Estimated Total</p>
                <p className="text-3xl font-bold font-mono tabular-nums text-white">
                  {currencySymbol}
                  {parseFloat(req.totalEstimatedCost || 0).toLocaleString()}
                </p>
                <Badge
                  className={cn(
                    "text-xs font-medium",
                    req.status === "RECEIVED"
                      ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"
                      : "bg-white/10 text-slate-200 border border-white/15"
                  )}
                >
                  {sInfo.label}
                </Badge>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <LayoutList className="h-4 w-4 text-slate-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Requested Components
                  </h3>
                </div>
                <div className="rounded-xl border border-slate-200 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 border-b border-slate-200">
                        <TableHead className="pl-5 text-xs font-semibold text-slate-600 h-10">
                          Component
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold text-slate-600 h-10">
                          Quantity
                        </TableHead>
                        <TableHead className="text-right pr-5 text-xs font-semibold text-slate-600 h-10">
                          Unit Rate
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(req.items || []).map((item: any, i: number) => (
                        <TableRow
                          key={i}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                        >
                          <TableCell className="pl-5 py-3.5">
                            <p className="text-sm font-semibold text-slate-900">
                              {item.productName}
                            </p>
                            <p className="text-xs font-mono tabular-nums text-slate-500">
                              SKU ID: {item.productId?.slice(-6).toUpperCase() || "--"}
                            </p>
                          </TableCell>
                          <TableCell className="text-center font-mono tabular-nums text-xs font-semibold text-slate-800">
                            {item.planned} Units
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums font-semibold text-sm text-slate-900 pr-5">
                            {currencySymbol}
                            {parseFloat(item.unitCost || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>

              {req.notes && (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Operational Note
                  </h3>
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 leading-relaxed">
                    {req.notes}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <SectionCard title="Project Trace">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Installation Site</p>
                <Button
                  asChild
                  variant="link"
                  className="h-auto p-0 font-semibold text-slate-900 text-sm"
                >
                  <Link href={`/solar/installations/${req.installationId}`}>
                    View Site Record <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Supplier</p>
                <p className="text-sm font-semibold text-slate-800">
                  {req.vendorName || "Manual Sourcing"}
                </p>
              </div>
            </div>
          </SectionCard>

          <div className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <BadgeCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold">Atomic Goods Receipt</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Recording a goods receipt increases inventory product stock and posts the
              purchase entry to your Cashbook ledger in a single transaction.
            </p>
            <Separator className="bg-white/10" />
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Transactional stock & ledger sync</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
