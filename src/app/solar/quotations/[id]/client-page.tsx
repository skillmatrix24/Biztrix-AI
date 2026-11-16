"use client";

import { useState, useMemo } from "react";
import {
  CheckCircle2,
  Loader2,
  History,
  Printer,
  SmartphoneNfc,
  ChevronRight,
  Info,
  Briefcase,
  Receipt,
  Sun,
  LayoutList,
  ArrowRight,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  updateDocumentNonBlocking,
} from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { sendWhatsAppTemplate } from "@/app/actions/whatsapp-actions";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700 border-slate-200" },
  sent: { label: "Active Proposal", className: "bg-sky-50 text-sky-700 border-sky-200" },
  converted: { label: "Accepted", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", className: "bg-rose-50 text-rose-700 border-rose-200" },
  expired: { label: "Expired", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default function SolarQuotationDetailPage(props: { params: { id: string } }) {
  const { id } = props.params;
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const quoteRef = useMemoFirebase(
    () => (businessId && id ? doc(firestore, "businesses", businessId, "quotations", id) : null),
    [firestore, businessId, id]
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

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const activeAddonIds = useMemo(() => business?.activeAddonIds || [], [business]);
  const isWhatsappEntitled =
    activeAddonIds.includes("feat_whatsapp") || activeAddonIds.includes("suite_growth");

  const [isQuoting, setIsQuoting] = useState(false);

  const handleUpdateStatus = (status: string) => {
    if (!quoteRef) return;
    updateDocumentNonBlocking(quoteRef, { status, updatedAt: serverTimestamp() });
    toast({ title: "Quotation status updated" });
  };

  const handleWhatsAppShare = async () => {
    if (!quote || !business || !businessId) return;

    if (!isWhatsappEntitled) {
      toast({
        title: "WhatsApp Add-on Required",
        description: "Automated messaging requires the Growth Suite or WhatsApp module.",
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
      toast({
        variant: "destructive",
        title: "API Unlinked",
        description: "Please verify your Meta API connection in Settings.",
      });
      return;
    }

    setIsQuoting(true);
    try {
      const templateName = waConfig.posTemplateName || "hello_world";
      const targetPhone = "91" + (quote.customerPhone || "").replace(/\D/g, "").slice(-10);

      const components = [
        {
          type: "body",
          parameters: [
            { type: "text", text: quote.customerName },
            { type: "text", text: quote.quotationId },
            { type: "text", text: `${currencySymbol}${quote.totals?.finalPayout?.toLocaleString()}` },
            { type: "text", text: "SOLAR PROPOSAL" },
            { type: "text", text: "N/A" },
            { type: "text", text: `${currencySymbol}${quote.totals?.finalPayout?.toLocaleString()}` },
            { type: "text", text: `${window.location.origin}/projects/track/${businessId}/${quote.solarInquiryId}` },
          ],
        },
      ];

      const res = await sendWhatsAppTemplate(
        businessId,
        { phoneId: waConfig.phoneId, accessToken: waConfig.accessToken },
        targetPhone,
        templateName,
        waConfig.posLanguageCode || "en_IN",
        components
      );

      if (res.success) toast({ title: "Proposal dispatched" });
      else toast({ variant: "destructive", title: "Meta rejection", description: res.error });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Dispatch failed" });
    } finally {
      setIsQuoting(false);
    }
  };

  if (isProfileLoading || isQuoteLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400 h-8 w-8" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <EmptyStatePanel
          icon={Receipt}
          title="Proposal not found"
          description="This solar proposal may have been deleted or moved."
          action={
            <Button asChild variant="outline" className="rounded-xl border-slate-200">
              <Link href="/solar/quotations">Back to Proposals</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const currencySymbol = getCurrencySymbol(business?.currency);
  const sInfo = STATUS_CONFIG[quote.status] || STATUS_CONFIG.draft;
  const isAccepted = quote.status === "converted";
  const grossExclTax = (quote.totals?.grossSubtotal || 0) - (quote.totals?.taxTotal || 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 text-left">
      <PageHeader
        breadcrumb={`Proposal ${quote.quotationId}`}
        title={quote.customerName || "Commercial Proposal"}
        description="Review system bill of materials, tax totals, and client approval status."
        backHref="/solar/quotations"
        backLabel="Back to proposals"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {isAccepted && (
              <Button
                asChild
                className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <Link href={`/solar/installations/new?quoteId=${id}`}>
                  <Briefcase className="mr-2 h-4 w-4" /> Initiate Installation
                </Link>
              </Button>
            )}
            <Button
              type="button"
              onClick={() => window.print()}
              variant="outline"
              className="h-10 rounded-xl border-slate-200 bg-white font-medium"
            >
              <Printer className="h-4 w-4 mr-2" /> Print PDF
            </Button>
            <Select value={quote.status} onValueChange={handleUpdateStatus}>
              <SelectTrigger
                aria-label="Proposal status"
                className={cn("h-10 rounded-xl font-medium w-44 border", sInfo.className)}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                {Object.keys(STATUS_CONFIG).map((s) => (
                  <SelectItem key={s} value={s} className="text-sm font-medium">
                    {STATUS_CONFIG[s].label}
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
            <div className="p-6 sm:p-8 bg-slate-900 text-white border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 overflow-hidden">
                  {business?.logoUrl ? (
                    <img
                      src={business.logoUrl}
                      alt={business?.name || "Business logo"}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <Sun className="h-7 w-7 text-amber-300" />
                  )}
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white">
                    {business?.name || "Solar EPC Division"}
                  </h2>
                  <p className="text-xs font-mono tabular-nums text-slate-300">
                    GSTIN: {business?.gstin || "Unregistered"}
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right space-y-1.5">
                <p className="text-xs font-medium text-slate-300">Grand Total</p>
                <p className="text-3xl sm:text-4xl font-bold font-mono tabular-nums tracking-tight text-white">
                  {currencySymbol}
                  {(quote.totals?.finalPayout || 0).toLocaleString()}
                </p>
                <Badge className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-medium">
                  Commercial Verified
                </Badge>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <p className="text-xs font-semibold text-slate-500">Client Details</p>
                  <h3 className="text-base font-bold text-slate-900">{quote.customerName}</h3>
                  <p className="text-xs font-mono tabular-nums text-slate-600 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {quote.customerPhone || "No phone"}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {quote.customerAddress || "Address in Registry"}
                  </p>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:text-right">
                  <p className="text-xs font-semibold text-slate-500">Technical Summary</p>
                  <p className="text-base font-bold font-mono tabular-nums text-slate-900">
                    {design?.capacityKw || "--"} kW {design?.systemType || "Solar System"}
                  </p>
                  <p className="text-xs text-slate-600">
                    Phase: {design?.phaseType || "--"}
                  </p>
                  <p className="text-xs font-mono tabular-nums text-slate-500">
                    Design ID: {design?.id?.slice(-6).toUpperCase() || "MANUAL"}
                  </p>
                </div>
              </div>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <LayoutList className="h-4 w-4 text-slate-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Bill of Materials & Services
                  </h3>
                </div>
                <div className="rounded-xl border border-slate-200 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 border-b border-slate-200">
                        <TableHead className="pl-5 text-xs font-semibold text-slate-600 h-10">
                          Particulars
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold text-slate-600 h-10">
                          Qty
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-600 h-10">
                          Rate
                        </TableHead>
                        <TableHead className="text-right pr-5 text-xs font-semibold text-slate-600 h-10">
                          Subtotal
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(quote.items || []).map((item: any, i: number) => (
                        <TableRow
                          key={i}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                        >
                          <TableCell className="pl-5 py-3.5">
                            <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                            <p className="text-xs font-mono tabular-nums text-slate-500">
                              {item.gstRate}% GST
                            </p>
                          </TableCell>
                          <TableCell className="text-center font-mono tabular-nums text-xs font-semibold text-slate-700">
                            {item.quantity} {item.unit || "pcs"}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-xs text-slate-600">
                            {currencySymbol}
                            {parseFloat(item.price || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums font-semibold text-sm text-slate-900 pr-5">
                            {currencySymbol}
                            {(item.quantity * item.price).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>

              <div className="flex flex-col md:flex-row justify-between items-start gap-6 pt-2">
                <div className="flex-1 w-full rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-5 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-700">
                    Terms & Validity
                  </h4>
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Validity: 15 days from generation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>50% advance payment with confirmed order</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Inventory reserved upon booking confirmation</span>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-80 space-y-3">
                  <div className="flex justify-between items-center px-2 text-sm">
                    <span className="text-slate-500">Taxable Subtotal</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {currencySymbol}
                      {grossExclTax.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-2 text-sm">
                    <span className="text-slate-500">GST Tax</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      +{currencySymbol}
                      {(quote.totals?.taxTotal || 0).toLocaleString()}
                    </span>
                  </div>
                  <Separator />
                  <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">Final Net Payable</span>
                    <span className="text-xl font-bold font-mono tabular-nums">
                      {currencySymbol}
                      {(quote.totals?.finalPayout || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-10 flex justify-between items-end border-t border-dashed border-slate-200 px-4">
                <div className="text-center space-y-2 w-40">
                  <div className="h-px w-full bg-slate-200" />
                  <p className="text-xs text-slate-500">Customer Signature</p>
                </div>
                <div className="text-center space-y-2 w-40">
                  <div className="h-px w-full bg-slate-900" />
                  <p className="text-xs font-medium text-slate-900">Authorized Specialist</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">Verified Proposal • Biztrix AI</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <SectionCard title="Related Records">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">System Design</p>
                <Button
                  asChild
                  variant="link"
                  className="h-auto p-0 font-semibold text-slate-900 text-sm"
                >
                  <Link href={`/solar/designs/${quote.solarSystemDesignId}`}>
                    View Technical Design <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Lead Inquiry</p>
                <Button
                  asChild
                  variant="link"
                  className="h-auto p-0 font-semibold text-slate-900 text-sm"
                >
                  <Link href={`/solar/inquiries/${quote.solarInquiryId}`}>
                    View Inquiry Record <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </SectionCard>

          <div
            className={cn(
              "p-6 rounded-2xl border space-y-4 text-left",
              isWhatsappEntitled
                ? "bg-slate-900 text-white border-slate-800"
                : "bg-white border-slate-200"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center border",
                  isWhatsappEntitled
                    ? "bg-white/10 border-white/15 text-white"
                    : "bg-slate-100 border-slate-200 text-slate-700"
                )}
              >
                <SmartphoneNfc className="h-5 w-5" />
              </div>
              <h3
                className={cn(
                  "text-base font-bold",
                  isWhatsappEntitled ? "text-white" : "text-slate-900"
                )}
              >
                Share Proposal
              </h3>
            </div>

            {isWhatsappEntitled ? (
              <>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Send an official WhatsApp summary and tracking link directly to the client.
                </p>
                <Button
                  type="button"
                  onClick={handleWhatsAppShare}
                  disabled={isQuoting}
                  className="w-full h-11 bg-white text-slate-900 hover:bg-slate-100 font-semibold rounded-xl"
                >
                  {isQuoting ? (
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  ) : (
                    <History className="h-4 w-4 mr-2" />
                  )}
                  Send WhatsApp Dispatch
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Automated WhatsApp updates are available in the Growth Suite.
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="w-full h-10 rounded-xl border-slate-200 font-medium"
                >
                  <Link href="/marketplace">
                    Enable WhatsApp Add-on <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {!isAccepted && (
            <SectionCard title="Acceptance Guidance">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                  <Info className="h-4 w-4" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  When the customer accepts this proposal, switch the status to{" "}
                  <strong className="text-slate-900">Accepted</strong> to unlock the
                  installation scheduling workflow.
                </p>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
