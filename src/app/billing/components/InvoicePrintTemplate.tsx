
"use client";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { calculateGST } from "@/lib/mock-db";

interface InvoicePrintTemplateProps {
  invoice: any;
  business: any;
  currencySymbol: string;
  isPreview?: boolean;
}

/**
 * PRODUCTION SAFE A4 TEMPLATE - ALIGNMENT OPTIMIZED V8.5
 * Focus: Strict Line-Height, Lighter Grid, and Full Reconciliation Data.
 */
export function InvoicePrintTemplate({ invoice, business, currencySymbol, isPreview }: InvoicePrintTemplateProps) {
  if (!invoice) return null;

  const isQuotation = invoice.type === 'quotation';
  const isSyncMode = invoice.paymentMode === 'Loyalty Sync';
  const isBillOfSupply = business?.isCompositionScheme;
  const t = invoice.totals || {};
  const gstMode = business?.gstMode || 'exclusive';
  const isInterState = t.isInterState;

  // Unified Constants
  const PAGE_PADDING = "15mm";
  const PAGE_WIDTH = "210mm";
  const PAGE_MIN_HEIGHT = "297mm";

  return (
    <div 
      id={isPreview ? undefined : "printable-invoice"} 
      className={cn(
        "bg-white text-black text-[12px] leading-none mx-auto flex flex-col relative",
        isPreview ? "block shadow-2xl" : "fixed opacity-0 pointer-events-none -z-[100] left-[-9999px] top-0 print:!static print:!opacity-100 print:!flex"
      )}
      style={{ 
        width: PAGE_WIDTH, 
        minHeight: PAGE_MIN_HEIGHT,
        padding: PAGE_PADDING,
        boxSizing: 'border-box',
      }}
    >
      <style jsx global>{`
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 0; 
          }
          html, body {
            height: auto;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible !important;
            color: #000 !important;
            border-color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-invoice {
            display: flex !important;
            flex-direction: column !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 auto !important;
            padding: 15mm !important;
            width: 210mm !important;
            min-height: 297mm !important;
            background: white !important;
            z-index: 9999 !important;
          }
        }
        
        .invoice-grid-table {
          width: 100%;
          border-collapse: collapse;
          border: 1.5pt solid #000 !important;
        }
        .invoice-grid-table th {
          background-color: #f8fafc !important;
          border: 0.5pt solid #e2e8f0 !important;
          padding: 12px 8px;
          font-weight: 900;
          text-transform: uppercase;
          font-size: 10px;
          text-align: center;
          vertical-align: middle !important;
          line-height: 1 !important;
        }
        .invoice-grid-table td {
          border: 0.5pt solid #e2e8f0 !important;
          padding: 10px 8px !important;
          font-weight: 700;
          font-size: 10px;
          vertical-align: middle !important;
          text-align: center;
          line-height: 1 !important;
        }
        .page-break-avoid {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .badge-hardened {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          line-height: 1 !important;
          padding: 0 12px !important;
          height: 24px !important;
        }
      `}</style>
      
      {/* 1. HEADER SECTION */}
      <div className="flex justify-between items-center mb-6 text-left pt-[10px]">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 border-2 border-black flex items-center justify-center shrink-0 overflow-hidden rounded-xl bg-white">
              {business?.logoUrl ? (
                <img src={business.logoUrl} className="h-full w-full object-contain p-1" alt="Logo" />
              ) : (
                <span className="text-lg font-black uppercase leading-none">Logo</span>
              )}
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-black uppercase leading-none text-black tracking-tight">{business?.name || 'BUSINESS NAME'}</h1>
            <div className="text-[9px] space-y-0.5 font-bold text-black opacity-80 uppercase leading-none">
                <p>{business?.address || 'Business Address Registration'}</p>
                {!isSyncMode && <p>GSTIN: <span className="font-black">{business?.gstin || 'N/A'}</span></p>}
                <p>Phone: <span className="font-black">{business?.phone || 'N/A'}</span></p>
            </div>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <div 
            className="px-5 mb-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-md badge-hardened" 
            style={{ backgroundColor: '#000', color: '#fff' }}
          >
            {isQuotation ? 'QUOTATION' : isSyncMode ? 'LOYALTY SYNC' : (isBillOfSupply ? 'BILL OF SUPPLY' : 'TAX INVOICE')}
          </div>
          <div className="space-y-1 text-right text-[10px] leading-none font-bold uppercase">
              <p>Ref: <span className="font-black">{invoice.invoiceId}</span></p>
              <p>Date: <span className="font-black">{invoice.date}</span></p>
          </div>
        </div>
      </div>

      <Separator className="bg-black h-[1pt] mb-6" />

      {/* 2. RECIPIENT & DETAILS SECTION */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div className="text-left space-y-3">
          <p className="text-[8px] font-black uppercase text-black tracking-[0.2em] border-b border-black/20 pb-1 w-fit pr-6 leading-none">BILLING TO</p>
          <div className="space-y-1.5">
            <h2 className="text-sm font-black text-black uppercase tracking-tight leading-none">{invoice.customerName}</h2>
            <div className="text-[9px] font-bold text-black space-y-1 leading-none opacity-80 uppercase">
                <p className="max-w-[240px] leading-tight">{invoice.customerAddress || 'No Address Provided'}</p>
                <p>Contact: <span className="font-black">{invoice.customerPhone}</span></p>
                {!isSyncMode && invoice.customerGstin && <p>GSTIN: <span className="font-black">{invoice.customerGstin}</span></p>}
            </div>
          </div>
        </div>
        <div className="text-left space-y-3">
          <p className="text-[8px] font-black uppercase text-black tracking-[0.2em] border-b border-black/20 pb-1 w-fit pr-6 leading-none">EXECUTION NODE</p>
          <div className="text-[9px] font-bold text-black space-y-2 uppercase leading-none">
              <div className="flex justify-between max-w-[220px]"><span>Method:</span> <span className="font-black">{invoice.paymentMode || 'Cash'}</span></div>
              <div className="flex justify-between max-w-[220px]"><span>Place of Supply:</span> <span className="font-black">{business?.state || 'Local'}</span></div>
              <div className="flex justify-between items-center max-w-[220px]">
                <span>Status:</span> 
                <div className="px-3 py-1 border border-black rounded text-[7px] font-black uppercase badge-hardened">
                  {invoice.totals?.paymentStatus || 'SETTLED'}
                </div>
              </div>
          </div>
        </div>
      </div>

      {/* 3. ITEM TABLE */}
      <div className="mb-6">
        <table className="invoice-grid-table">
          <thead>
            <tr>
              <th className="w-10">#</th>
              <th className="text-left">Particulars / Description</th>
              <th className="w-16">Qty</th>
              <th className="w-24">Rate</th>
              {!isSyncMode && <th className="w-16">GST%</th>}
              <th className="w-32 text-right pr-4">Amount (Incl)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item: any, i: number) => {
              const discountedPrice = item.price * (1 - (item.itemDiscount || 0) / 100);
              const lineAmount = discountedPrice * item.quantity;
              const gstData = calculateGST(lineAmount, item.gstRate, isInterState, gstMode);
              return (
                <tr key={i}>
                  <td className="text-center">{i + 1}</td>
                  <td className="uppercase text-left font-black">{item.name}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-center">{item.price.toLocaleString()}</td>
                  {!isSyncMode && <td className="text-center">{item.gstRate}%</td>}
                  <td className="text-right font-black pr-4">
                    {isSyncMode ? lineAmount.toLocaleString() : gstData.lineTotal.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 4. SUMMARY SECTION */}
      <div className="page-break-avoid mb-10">
        <div className="flex flex-row justify-between items-stretch gap-8">
          {/* Left Column: Tax & Notes */}
          <div className="w-[55%] flex flex-col gap-6">
            {!isSyncMode && (
              <div className="p-5 border-2 border-black rounded-2xl space-y-3 text-left">
                <h4 className="text-[8px] font-black uppercase tracking-[0.15em] text-black border-b border-black pb-1.5 mb-1 leading-none">GST LIABILITY REGISTRY</h4>
                <div className="text-[9px] font-bold space-y-2 text-black uppercase leading-none">
                    {isInterState ? (
                      <div className="flex justify-between"><span>IGST (Integrated)</span><span className="font-black">{currencySymbol}{t.igst?.toLocaleString()}</span></div>
                    ) : (
                      <>
                        <div className="flex justify-between"><span>CGST (Central Tax)</span><span className="font-black">{currencySymbol}{t.cgst?.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>SGST (State Tax)</span><span className="font-black">{currencySymbol}{t.sgst?.toLocaleString()}</span></div>
                      </>
                    )}
                    <div className="flex justify-between font-black text-black pt-2 border-t border-black/10"><span>Total Tax Node</span><span>₹{t.taxTotal?.toLocaleString()}</span></div>
                </div>
              </div>
            )}

            {invoice.paymentNote && (
              <div className="p-5 border-2 border-black rounded-2xl space-y-2 text-left">
                <h4 className="text-[8px] font-black uppercase tracking-[0.15em] text-black border-b border-black pb-1.5 mb-1 leading-none">MEMO / BILL NOTES</h4>
                <p className="text-[9px] font-bold text-black italic uppercase leading-relaxed">"{invoice.paymentNote}"</p>
              </div>
            )}

            <div className="p-5 border-2 border-black rounded-2xl space-y-2 text-left">
              <h4 className="text-[8px] font-black uppercase tracking-[0.15em] text-black border-b border-black pb-1.5 mb-1 leading-none">SETTLEMENT DETAILS</h4>
              <div className="text-[9px] font-bold space-y-1.5 text-black uppercase leading-none">
                  <p className="font-black mb-1 leading-none">{business?.bankDetails?.accountName || business?.name}</p>
                  <p>Bank: <span className="font-black">{business?.bankDetails?.bankName || 'N/A'}</span></p>
                  <p>A/c No: <span className="font-black">{business?.bankDetails?.accountNumber || 'N/A'}</span></p>
                  <p>IFSC Code: <span className="font-black">{business?.bankDetails?.ifsc || 'N/A'}</span></p>
              </div>
            </div>
          </div>

          {/* Right Column: Reconciliation & Net Payable */}
          <div className="w-[40%] flex flex-col gap-6">
            <div className="p-6 border-2 border-black rounded-[2.5rem] bg-white flex flex-col justify-center text-left">
              <div className="space-y-4 w-full">
                <div className="flex justify-between text-[10px] font-black text-black uppercase leading-none">
                    <span className="opacity-60">Gross Subtotal</span>
                    <span>₹{t.grossSubtotal?.toLocaleString()}</span>
                </div>
                
                {t.manualDiscountApplied > 0 && (
                  <div className="flex justify-between text-[10px] font-black text-red-600 uppercase leading-none">
                      <span className="opacity-60">Manual Discount</span>
                      <span>- ₹{t.manualDiscountApplied?.toLocaleString()}</span>
                  </div>
                )}

                {t.couponApplied > 0 && (
                  <div className="flex justify-between text-[10px] font-black text-red-600 uppercase leading-none">
                      <span className="opacity-60">Offer {invoice.couponCodes ? `(${invoice.couponCodes})` : ''}</span>
                      <span>- ₹{t.couponApplied?.toLocaleString()}</span>
                  </div>
                )}

                {!isSyncMode && t.advanceApplied > 0 && (
                  <div className="flex justify-between text-[10px] font-black text-green-600 uppercase leading-none">
                      <span className="opacity-60">Advance Payment</span>
                      <span>- ₹{t.advanceApplied?.toLocaleString()}</span>
                  </div>
                )}

                <Separator className="bg-black/20" />
                
                <div className="flex flex-col items-center py-2">
                    <p className="text-[9px] font-black uppercase text-black mb-3 opacity-60 leading-none tracking-widest">FINAL PAYABLE</p>
                    <div className="text-4xl font-black tracking-tighter text-black leading-none">
                      ₹{t.finalPayout?.toLocaleString()}
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. SIGNATURES & FOOTER */}
      <div className="mt-auto pb-4 page-break-avoid">
        <div className="flex justify-between items-end px-12 mb-12">
          <div className="text-center space-y-2 w-48">
              <div className="h-0.5 w-full bg-black" />
              <p className="text-[9px] font-black uppercase text-black tracking-widest leading-none">Receiver Auth</p>
          </div>
          <div className="text-center space-y-2 w-48">
              <div className="h-0.5 w-full bg-black" />
              <p className="text-[9px] font-black uppercase text-black tracking-widest leading-none">Authorized Node</p>
          </div>
        </div>

        <div className="border-t border-dashed border-black mx-auto opacity-30 mb-4" style={{ width: '170mm' }} />
        <div className="text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-black opacity-50 leading-none">
            SECURED DOCUMENT • VERIFIED BY BIZTRIX AI OPERATING SYSTEM V3.5
          </p>
        </div>
      </div>
    </div>
  );
}
