"use client";

import { useState, useEffect } from "react";
import {
  Printer,
  ScanLine,
  Smartphone,
  Volume2,
  Usb,
  CheckCircle2,
  ShieldCheck,
  Info,
  SmartphoneNfc,
  ArrowRight,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/editorial";
import Link from "next/link";

interface HardwareTabProps {
  business: any;
  isAdmin: boolean;
  isTrialExpired: boolean;
  onUpdate: (data: any) => void;
}

export function HardwareTab({
  business,
  isAdmin,
  isTrialExpired,
  onUpdate,
}: HardwareTabProps) {
  const [localFooter, setLocalFooter] = useState("");

  useEffect(() => {
    if (business?.receiptFooter !== undefined) {
      setLocalFooter(business.receiptFooter);
    }
  }, [business?.receiptFooter]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
      <div className="lg:col-span-8 space-y-6">
        <SectionCard
          title="Receipt Printer"
          description="Thermal POS roll or standard A4 laser printing preferences."
          headerRight={
            <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Printer className="h-4 w-4" />
            </div>
          }
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="space-y-0.5">
                <Label htmlFor="auto-print-switch" className="text-xs font-semibold text-slate-900">
                  Auto-Print Invoices
                </Label>
                <p className="text-xs text-slate-500">
                  Open print dialog automatically after completing a POS sale.
                </p>
              </div>
              <Switch
                id="auto-print-switch"
                disabled={!isAdmin || isTrialExpired}
                checked={!!business?.autoPrintReceipt}
                onCheckedChange={(v) => onUpdate({ autoPrintReceipt: v })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Printer Class</Label>
                <Select
                  disabled={!isAdmin || isTrialExpired}
                  value={business?.printerType || "Thermal"}
                  onValueChange={(v) => onUpdate({ printerType: v })}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 text-sm font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Thermal" className="text-xs font-medium">
                      Thermal POS Printer
                    </SelectItem>
                    <SelectItem value="Standard" className="text-xs font-medium">
                      Standard A4 / Inkjet
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Paper Dimension</Label>
                <Select
                  disabled={!isAdmin || isTrialExpired}
                  value={business?.paperSize || "80mm"}
                  onValueChange={(v) => onUpdate({ paperSize: v })}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 text-sm font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="58mm" className="text-xs font-medium">
                      Thermal (2-inch / 58mm)
                    </SelectItem>
                    <SelectItem value="80mm" className="text-xs font-medium">
                      Thermal (3-inch / 80mm)
                    </SelectItem>
                    <SelectItem value="A4" className="text-xs font-medium">
                      A4 Page (Laser / Standard)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="receipt-footer" className="text-xs font-semibold text-slate-700">
                Receipt Footer Branding
              </Label>
              <Input
                id="receipt-footer"
                disabled={!isAdmin || isTrialExpired}
                placeholder="e.g. Visit us again! Thank you for shopping."
                value={localFooter}
                onChange={(e) => setLocalFooter(e.target.value)}
                onBlur={(e) => onUpdate({ receiptFooter: e.target.value })}
                className="h-11 rounded-xl bg-white border-slate-200 text-sm"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Barcode & QR Scanning"
          description="Inventory lookup and POS billing scanner options."
          headerRight={
            <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <ScanLine className="h-4 w-4" />
            </div>
          }
        >
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 min-w-0">
                  <Smartphone className="h-4 w-4 text-slate-500 shrink-0" />
                  <div className="space-y-0.5 min-w-0">
                    <Label htmlFor="camera-scan-switch" className="text-xs font-semibold text-slate-900">
                      Camera Scanning
                    </Label>
                    <p className="text-xs text-slate-500">Use mobile camera</p>
                  </div>
                </div>
                <Switch
                  id="camera-scan-switch"
                  disabled={!isAdmin || isTrialExpired}
                  checked={!!business?.cameraScanEnabled}
                  onCheckedChange={(v) => onUpdate({ cameraScanEnabled: v })}
                />
              </div>

              <div className="flex items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 min-w-0">
                  <Volume2 className="h-4 w-4 text-slate-500 shrink-0" />
                  <div className="space-y-0.5 min-w-0">
                    <Label htmlFor="beep-scan-switch" className="text-xs font-semibold text-slate-900">
                      Audio Feedback
                    </Label>
                    <p className="text-xs text-slate-500">Beep on barcode match</p>
                  </div>
                </div>
                <Switch
                  id="beep-scan-switch"
                  disabled={!isAdmin || isTrialExpired}
                  checked={!!business?.beepOnScan}
                  onCheckedChange={(v) => onUpdate({ beepOnScan: v })}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <Usb className="h-4 w-4 text-slate-600" />
                External USB / Bluetooth Scanners
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Standard barcode scanners work best in <strong>Keyboard HID</strong> mode with an automatic <strong>Enter</strong> suffix to trigger instant lookups during POS billing.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="lg:col-span-4 space-y-6">
        <SectionCard
          title="Setup Checklist"
          description="Recommended browser & hardware setup."
          headerRight={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-900">Plug-and-Play Ready</p>
                <p className="text-xs text-emerald-700">No extra driver plugin required</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex gap-3">
                <span className="h-5 w-5 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-mono font-semibold text-slate-800 shrink-0">
                  1
                </span>
                <p className="leading-relaxed">
                  Use Google Chrome or Microsoft Edge for reliable direct thermal printing.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="h-5 w-5 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-mono font-semibold text-slate-800 shrink-0">
                  2
                </span>
                <p className="leading-relaxed">
                  Pair Bluetooth scanners via device settings before opening the POS billing screen.
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="rounded-2xl bg-slate-900 text-white p-6 space-y-4">
          <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
            <SmartphoneNfc className="h-5 w-5 text-white" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Need POS Peripherals?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Reach out to support for compatible 80mm thermal printers and wireless barcode scanners.
            </p>
          </div>
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="w-full h-9 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-semibold"
          >
            <Link href="/complaints">
              <Info className="mr-1.5 h-3.5 w-3.5" />
              Contact Support
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
