
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { BadgeCheck, ShieldCheck, Sun, Zap, Info, Landmark } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface HandoverCertificateProps {
  install: any;
  business: any;
  isPreview?: boolean;
}

export function HandoverCertificate({ install, business, isPreview }: HandoverCertificateProps) {
  if (!install) return null;

  return (
    <div 
      id={isPreview ? undefined : "handover-printable"}
      className={cn(
        "bg-white text-slate-900 text-[11px] leading-tight mx-auto flex flex-col relative",
        isPreview ? "block shadow-2xl" : "fixed opacity-0 pointer-events-none -z-[100] left-[-9999px] top-0 print:!static print:!opacity-100 print:!flex"
      )}
      style={{ width: "210mm", minHeight: "297mm", padding: "20mm", boxSizing: 'border-box' }}
    >
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0 !important; padding: 0 !important; }
          #handover-printable { display: flex !important; position: absolute !important; left: 0; top: 0; padding: 20mm !important; }
        }
      `}</style>

      {/* HEADER SECTION */}
      <div className="flex justify-between items-start mb-10 text-left">
        <div className="flex items-center gap-6">
           <div className="h-20 w-20 border-2 border-slate-900 flex items-center justify-center shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm">
              {business?.logoUrl ? <img src={business.logoUrl} className="h-full w-full object-contain p-2" /> : <Sun className="h-10 w-10 text-primary" />}
           </div>
           <div className="space-y-2">
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-none">{business?.name || 'SOLAR SOLUTIONS'}</h1>
              <div className="text-[9px] font-bold text-slate-500 space-y-1 uppercase leading-none">
                 <p>{business?.address || 'Business Hub Location Node'}</p>
                 <p>GST: <span className="text-slate-900">{business?.gstin || 'N/A'}</span> • Phone: <span className="text-slate-900">{business?.phone}</span></p>
              </div>
           </div>
        </div>
        <div className="text-right flex flex-col items-end">
           <div className="px-5 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-md mb-3">HANDOVER CERTIFICATE</div>
           <p className="text-[9px] font-black uppercase text-slate-400">Node: {install.installationNumber}</p>
           <p className="text-[9px] font-black uppercase text-slate-400 mt-1">Date: {new Date().toLocaleDateString('en-IN')}</p>
        </div>
      </div>

      <Separator className="bg-slate-900 h-[1.5pt] mb-10" />

      {/* RECIPIENT NODE */}
      <div className="grid grid-cols-2 gap-12 mb-12 text-left">
         <div className="space-y-4">
            <p className="text-[9px] font-black uppercase text-primary tracking-[0.2em] border-b border-primary/20 pb-1.5 w-fit pr-8">CLIENT IDENTITY</p>
            <div className="space-y-1">
               <h2 className="text-lg font-black uppercase text-slate-900 leading-none">{install.customerName}</h2>
               <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed max-w-[280px]">{install.customerPhone}</p>
            </div>
         </div>
         <div className="space-y-4">
            <p className="text-[9px] font-black uppercase text-primary tracking-[0.2em] border-b border-primary/20 pb-1.5 w-fit pr-8 ml-auto">SYSTEM ARCHITECTURE</p>
            <div className="text-right space-y-1">
               <p className="text-lg font-black text-slate-900 uppercase leading-none">{install.capacityKw} kWp {install.systemType}</p>
               <p className="text-[10px] font-bold text-slate-500 uppercase">Status: <span className="text-green-600">VERIFIED & COMMISSIONED</span></p>
            </div>
         </div>
      </div>

      {/* TECHNICAL MANIFEST */}
      <div className="space-y-6 mb-12 text-left">
         <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b pb-2">Technical Manifest (BOM Nodes)</h3>
         <table className="w-full text-left border-collapse">
            <thead>
               <tr className="bg-slate-50">
                  <th className="p-3 text-[9px] font-black uppercase border">#</th>
                  <th className="p-3 text-[9px] font-black uppercase border">Component Description</th>
                  <th className="p-3 text-center text-[9px] font-black uppercase border">Quantity</th>
                  <th className="p-3 text-right text-[9px] font-black uppercase border">Identity Node (Serial)</th>
               </tr>
            </thead>
            <tbody>
               {(install.materials || []).map((m: any, i: number) => (
                 <tr key={i}>
                    <td className="p-3 border font-black text-slate-400">{i + 1}</td>
                    <td className="p-3 border font-black uppercase text-slate-900">{m.productName}</td>
                    <td className="p-3 border text-center font-black">{m.issued} {m.unit}</td>
                    <td className="p-3 border text-right font-mono text-[9px] text-slate-400 uppercase">{m.specs || 'Std Node'}</td>
                 </tr>
               ))}
            </tbody>
         </table>
      </div>

      {/* DECLARATION SECTION */}
      <div className="p-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 mb-12 text-left">
         <div className="flex gap-4 items-start text-left mb-6">
            <ShieldCheck className="h-6 w-6 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
               <h4 className="text-[11px] font-black uppercase text-slate-900">Certificate of Completion & Handover</h4>
               <p className="text-xs font-medium text-slate-500 leading-relaxed uppercase tracking-tight">
                 This document verifies that the solar power system described above has been successfully installed, 
                 tested, and commissioned per engineering standards. The technical node is now 100% operational 
                 and possession is handed over to the client.
               </p>
            </div>
         </div>
         <div className="grid grid-cols-2 gap-10">
            <div className="space-y-3">
               <div className="flex items-center gap-3"><BadgeCheck className="h-3.5 w-3.5 text-green-600" /><span className="text-[9px] font-bold uppercase text-slate-700">Commissioning Node Verified</span></div>
               <div className="flex items-center gap-3"><BadgeCheck className="h-3.5 w-3.5 text-green-600" /><span className="text-[9px] font-bold uppercase text-slate-700">Workmanship Quality Audit Passed</span></div>
            </div>
            <div className="space-y-3">
               <div className="flex items-center gap-3"><BadgeCheck className="h-3.5 w-3.5 text-green-600" /><span className="text-[9px] font-bold uppercase text-slate-700">Digital Tracking Node Activated</span></div>
               <div className="flex items-center gap-3"><BadgeCheck className="h-3.5 w-3.5 text-green-600" /><span className="text-[9px] font-bold uppercase text-slate-700">Owner Portal Access Established</span></div>
            </div>
         </div>
      </div>

      {/* SIGNATURES */}
      <div className="mt-auto pt-20 flex justify-between items-end px-10 pb-10 text-center">
         <div className="space-y-3 w-56">
            <div className="h-0.5 w-full bg-slate-200" />
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Client Sign-off</p>
         </div>
         <div className="space-y-3 w-56">
            <div className="h-0.5 w-full bg-slate-900" />
            <p className="text-[9px] font-black uppercase text-slate-900 tracking-widest">Authorized Specialist</p>
         </div>
      </div>

      <div className="border-t border-dashed border-slate-200 pt-4 text-center">
         <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-300">SECURE DIGITAL NODE • VERIFIED BY BIZTRIX AI v3.5</p>
      </div>
    </div>
  );
}
