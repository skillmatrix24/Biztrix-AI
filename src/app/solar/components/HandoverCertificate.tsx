"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { BadgeCheck, ShieldCheck, Sun } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface HandoverCertificateProps {
  install: any;
  business: any;
  isPreview?: boolean;
}

export function HandoverCertificate({
  install,
  business,
  isPreview,
}: HandoverCertificateProps) {
  if (!install) return null;

  return (
    <div
      id={isPreview ? undefined : "handover-printable"}
      className={cn(
        "bg-white text-slate-900 text-[11px] leading-tight mx-auto flex flex-col relative",
        isPreview
          ? "block border border-slate-200"
          : "fixed opacity-0 pointer-events-none -z-[100] left-[-9999px] top-0 print:!static print:!opacity-100 print:!flex"
      )}
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "20mm",
        boxSizing: "border-box",
      }}
    >
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          #handover-printable {
            display: flex !important;
            position: absolute !important;
            left: 0;
            top: 0;
            padding: 20mm !important;
          }
        }
      `}</style>

      {/* HEADER SECTION */}
      <div className="flex justify-between items-start mb-10 text-left">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 border-2 border-slate-900 flex items-center justify-center shrink-0 overflow-hidden rounded-2xl bg-white">
            {business?.logoUrl ? (
              <img
                src={business.logoUrl}
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain p-2"
                alt={business?.name || "Company logo"}
              />
            ) : (
              <Sun className="h-10 w-10 text-primary" />
            )}
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold uppercase tracking-tight text-slate-900 leading-none">
              {business?.name || "SOLAR SOLUTIONS"}
            </h1>
            <div className="text-[10px] font-semibold text-slate-500 space-y-1 leading-none">
              <p>{business?.address || "Registered Business Address"}</p>
              <p>
                GST:{" "}
                <span className="text-slate-900 font-mono">
                  {business?.gstin || "N/A"}
                </span>{" "}
                • Phone:{" "}
                <span className="text-slate-900 font-mono">
                  {business?.phone}
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="px-5 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-[0.25em] rounded-md mb-3">
            HANDOVER CERTIFICATE
          </div>
          <p className="text-[10px] font-semibold text-slate-500 font-mono tabular-nums">
            Ref: {install.installationNumber}
          </p>
          <p className="text-[10px] font-semibold text-slate-500 font-mono tabular-nums mt-1">
            Date: {new Date().toLocaleDateString("en-IN")}
          </p>
        </div>
      </div>

      <Separator className="bg-slate-900 h-[1.5pt] mb-10" />

      {/* RECIPIENT SECTION */}
      <div className="grid grid-cols-2 gap-12 mb-12 text-left">
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase text-primary tracking-wider border-b border-primary/20 pb-1.5 w-fit pr-8">
            CLIENT DETAILS
          </p>
          <div className="space-y-1">
            <h2 className="text-lg font-bold uppercase text-slate-900 leading-none">
              {install.customerName}
            </h2>
            <p className="text-[11px] font-semibold font-mono text-slate-600 leading-relaxed max-w-[280px]">
              {install.customerPhone}
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase text-primary tracking-wider border-b border-primary/20 pb-1.5 w-fit pr-8 ml-auto">
            SYSTEM SPECIFICATIONS
          </p>
          <div className="text-right space-y-1">
            <p className="text-lg font-bold text-slate-900 uppercase leading-none font-mono tabular-nums">
              {install.capacityKw} kWp {install.systemType}
            </p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase">
              Status:{" "}
              <span className="text-emerald-700 font-bold">
                VERIFIED &amp; COMMISSIONED
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* TECHNICAL MANIFEST */}
      <div className="space-y-4 mb-12 text-left">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
          Bill of Materials (Installed Equipment)
        </h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-3 text-[10px] font-bold uppercase border border-slate-200">
                #
              </th>
              <th className="p-3 text-[10px] font-bold uppercase border border-slate-200">
                Component Description
              </th>
              <th className="p-3 text-center text-[10px] font-bold uppercase border border-slate-200">
                Quantity
              </th>
              <th className="p-3 text-right text-[10px] font-bold uppercase border border-slate-200">
                Specification / Serial
              </th>
            </tr>
          </thead>
          <tbody>
            {(install.materials || []).map((m: any, i: number) => (
              <tr key={i}>
                <td className="p-3 border border-slate-200 font-bold font-mono text-slate-500">
                  {i + 1}
                </td>
                <td className="p-3 border border-slate-200 font-bold uppercase text-slate-900">
                  {m.productName}
                </td>
                <td className="p-3 border border-slate-200 text-center font-bold font-mono tabular-nums">
                  {m.issued} {m.unit}
                </td>
                <td className="p-3 border border-slate-200 text-right font-mono text-[10px] text-slate-600 uppercase">
                  {m.specs || "Standard Spec"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DECLARATION SECTION */}
      <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 mb-12 text-left">
        <div className="flex gap-4 items-start text-left mb-6">
          <ShieldCheck className="h-6 w-6 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase text-slate-900">
              Certificate of Completion &amp; Handover
            </h4>
            <p className="text-xs font-medium text-slate-600 leading-relaxed">
              This document verifies that the solar power system described above
              has been successfully installed, tested, and commissioned per
              engineering standards. The system is operational and officially
              handed over to the client.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-[10px] font-semibold uppercase text-slate-700">
                Commissioning Audit Verified
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-[10px] font-semibold uppercase text-slate-700">
                Workmanship Quality Passed
              </span>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-[10px] font-semibold uppercase text-slate-700">
                Digital Tracking Activated
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-[10px] font-semibold uppercase text-slate-700">
                Client Portal Access Enabled
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SIGNATURES */}
      <div className="mt-auto pt-20 flex justify-between items-end px-10 pb-10 text-center">
        <div className="space-y-3 w-56">
          <div className="h-0.5 w-full bg-slate-300" />
          <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
            Client Sign-off
          </p>
        </div>
        <div className="space-y-3 w-56">
          <div className="h-0.5 w-full bg-slate-900" />
          <p className="text-[10px] font-bold uppercase text-slate-900 tracking-wider">
            Authorized Specialist
          </p>
        </div>
      </div>

      <div className="border-t border-dashed border-slate-300 pt-4 text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">
          VERIFIED DIGITAL HANDOVER • BIZTRIX AI
        </p>
      </div>
    </div>
  );
}
