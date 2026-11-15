"use client";

import { Separator } from "@/components/ui/separator";
import { calculateGST } from "@/lib/mock-db";
import { formatSplitPaymentSummary } from "@/lib/billing-engine";

interface ThermalPrintTemplateProps {
  invoice: any;
  business: any;
  currencySymbol: string;
}

/**
 * PRODUCTION SAFE THERMAL TEMPLATE (58mm/80mm)
 */
export function ThermalPrintTemplate({
  invoice,
  business,
  currencySymbol,
}: ThermalPrintTemplateProps) {
  if (!invoice) return null;

  const t = invoice.totals || {};
  const gstMode = business?.gstMode || "exclusive";
  const isInterState = Boolean(t.isInterState);
  const splitText =
    Array.isArray(invoice.splitPayments) && invoice.splitPayments.length > 0
      ? formatSplitPaymentSummary(invoice.splitPayments, currencySymbol)
      : "";

  return (
    <div
      id="thermal-printable"
      className="bg-white text-black text-[10px] leading-tight mx-auto flex flex-col p-2 fixed opacity-0 pointer-events-none -z-[100] left-[-9999px] top-0 print:!static print:!opacity-100 print:!flex w-[72mm]"
    >
      <style jsx global>{`
        @media print {
          .print-thermal {
            width: 72mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-thermal * {
            visibility: hidden;
          }
          #thermal-printable,
          #thermal-printable * {
            visibility: visible !important;
          }
        }
      `}</style>

      <div className="text-center space-y-1 mb-4">
        <h1 className="text-sm font-black uppercase">{business?.name}</h1>
        <p className="text-[8px] uppercase">{business?.address}</p>
        <p className="text-[8px] font-bold">GST: {business?.gstin || "N/A"}</p>
        <p className="text-[8px]">Ph: {business?.phone}</p>
      </div>

      <Separator className="bg-black mb-2" />

      <div className="flex justify-between text-[8px] font-bold uppercase mb-2">
        <span>No: {invoice.invoiceId}</span>
        <span>{invoice.date}</span>
      </div>

      <div className="space-y-1 mb-3">
        <p className="text-[8px] font-black uppercase">Customer: {invoice.customerName}</p>
        <p className="text-[8px] uppercase">
          Mode: {splitText || invoice.paymentMode || "Cash"}
        </p>
      </div>

      <Separator className="bg-black h-[0.5pt] mb-2" />

      <div className="space-y-2 mb-4">
        {invoice.items?.map((item: any, i: number) => {
          const discountedPrice = item.price * (1 - (item.itemDiscount || 0) / 100);
          const rawTotal = discountedPrice * (item.quantity || 1);
          const computedTotal =
            item.lineTotal !== undefined
              ? item.lineTotal
              : calculateGST(rawTotal, item.gstRate || 0, isInterState, gstMode).lineTotal;
          return (
            <div key={i} className="flex justify-between items-start">
              <div className="flex-1 pr-2">
                <p className="font-bold uppercase">{item.name}</p>
                <p className="text-[8px] opacity-60">
                  {item.quantity} x {currencySymbol}
                  {item.price}
                </p>
              </div>
              <span className="font-black">
                {currencySymbol}
                {Number(computedTotal || 0).toLocaleString("en-IN")}
              </span>
            </div>
          );
        })}
      </div>

      <Separator className="bg-black h-[0.5pt] mb-2" />

      <div className="space-y-1 text-right">
        <div className="flex justify-between text-[8px] font-bold uppercase">
          <span>Subtotal</span>
          <span>
            {currencySymbol}
            {Number(t.grossSubtotal || 0).toLocaleString("en-IN")}
          </span>
        </div>
        {(t.couponApplied > 0 || t.manualDiscountApplied > 0) && (
          <div className="flex justify-between text-[8px] font-bold uppercase text-red-600">
            <span>Discount</span>
            <span>
              - {currencySymbol}
              {Number((t.couponApplied || 0) + (t.manualDiscountApplied || 0)).toLocaleString(
                "en-IN"
              )}
            </span>
          </div>
        )}
        <div className="flex justify-between text-xs font-black uppercase border-t pt-1 border-black mt-2">
          <span>TOTAL</span>
          <span>
            {currencySymbol}
            {Number(t.finalPayout || 0).toLocaleString("en-IN")}
          </span>
        </div>
        {t.dueAmount > 0 && (
          <div className="flex justify-between text-[8px] font-bold uppercase">
            <span>Balance Due</span>
            <span>
              {currencySymbol}
              {Number(t.dueAmount || 0).toLocaleString("en-IN")}
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 text-center space-y-1">
        <p className="text-[8px] font-black uppercase tracking-widest">Thank you! Visit Again</p>
        <p className="text-[6px] opacity-40">Powered by Biztrix AI</p>
      </div>
    </div>
  );
}
