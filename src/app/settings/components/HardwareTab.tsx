
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
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

interface HardwareTabProps {
  business: any;
  isAdmin: boolean;
  isTrialExpired: boolean;
  onUpdate: (data: any) => void;
}

export function HardwareTab({ business, isAdmin, isTrialExpired, onUpdate }: HardwareTabProps) {
  const [localFooter, setLocalFooter] = useState("");

  useEffect(() => {
    if (business?.receiptFooter !== undefined) {
      setLocalFooter(business.receiptFooter);
    }
  }, [business?.receiptFooter]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="md:col-span-8 space-y-8">
        <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border">
          <CardHeader className="bg-muted/30 border-b py-6 px-8 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white border shadow-sm flex items-center justify-center">
                <Printer className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary">Receipt Printer</CardTitle>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Thermal or Standard Laser Printing</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="flex items-center justify-between p-5 bg-primary/5 rounded-2xl border border-primary/10">
              <div className="space-y-0.5 text-left">
                <Label className="text-xs font-bold uppercase">Auto-Print Invoices</Label>
                <p className="text-[9px] text-muted-foreground font-medium uppercase">Trigger print window automatically after every sale</p>
              </div>
              <Switch 
                checked={business?.autoPrintReceipt} 
                onCheckedChange={(v) => onUpdate({ autoPrintReceipt: v })} 
                className="scale-75 data-[state=checked]:bg-primary" 
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Printer Class</Label>
                <Select value={business?.printerType || "Thermal"} onValueChange={(v) => onUpdate({ printerType: v })}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none shadow-inner font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-2xl">
                    <SelectItem value="Thermal" className="text-xs font-bold uppercase">Thermal POS Printer</SelectItem>
                    <SelectItem value="Standard" className="text-xs font-bold uppercase">Standard A4 / Inkjet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Paper Dimension</Label>
                <Select value={business?.paperSize || "80mm"} onValueChange={(v) => onUpdate({ paperSize: v })}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none shadow-inner font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-2xl">
                    <SelectItem value="58mm" className="text-xs font-bold uppercase">Thermal (2-inch / 58mm)</SelectItem>
                    <SelectItem value="80mm" className="text-xs font-bold uppercase">Thermal (3-inch / 80mm)</SelectItem>
                    <SelectItem value="A4" className="text-xs font-bold uppercase">A4 Page (Laser/Standard)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 text-left">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Receipt Footer Branding</Label>
              <Input 
                placeholder="e.g. Visit us again! Thank you." 
                value={localFooter}
                onChange={(e) => setLocalFooter(e.target.value)}
                onBlur={(e) => onUpdate({ receiptFooter: e.target.value })}
                className="h-12 rounded-xl bg-muted/20 border-none shadow-inner font-medium"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border">
          <CardHeader className="bg-muted/30 border-b py-6 px-8">
            <div className="flex items-center gap-4 text-left">
              <div className="h-12 w-12 rounded-2xl bg-white border shadow-sm flex items-center justify-center">
                <ScanLine className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary">Scanning Protocol</CardTitle>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Inventory & Billing Input Methods</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-5 bg-muted/20 rounded-2xl border border-transparent hover:border-primary/10 transition-colors">
                <div className="flex items-center gap-3 text-left">
                  <Smartphone className="h-5 w-5 text-primary opacity-60" />
                  <div className="space-y-0.5">
                    <Label className="text-xs font-black uppercase tracking-tight">Camera Scanning</Label>
                    <p className="text-[8px] text-muted-foreground uppercase font-bold">Use Mobile Camera</p>
                  </div>
                </div>
                <Switch 
                  checked={business?.cameraScanEnabled} 
                  onCheckedChange={(v) => onUpdate({ cameraScanEnabled: v })} 
                  className="scale-75 data-[state=checked]:bg-primary" 
                />
              </div>

              <div className="flex items-center justify-between p-5 bg-muted/20 rounded-2xl border border-transparent hover:border-primary/10 transition-colors">
                <div className="flex items-center gap-3 text-left">
                  <Volume2 className="h-5 w-5 text-primary opacity-60" />
                  <div className="space-y-0.5">
                    <Label className="text-xs font-black uppercase tracking-tight">Audio Feedback</Label>
                    <p className="text-[8px] text-muted-foreground uppercase font-bold">Beep on successful scan</p>
                  </div>
                </div>
                <Switch 
                  checked={business?.beepOnScan} 
                  onCheckedChange={(v) => onUpdate({ beepOnScan: v })} 
                  className="scale-75 data-[state=checked]:bg-primary" 
                />
              </div>
            </div>

            <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 space-y-4 shadow-inner text-left">
              <div className="flex items-center gap-3">
                <Usb className="h-4 w-4 text-primary" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">External USB/Bluetooth Mode</h4>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Standard scanners work best in <strong>"Keyboard HID"</strong> mode. Ensure your scanner has the "Enter" suffix enabled to automatically trigger lookups in the POS billing screen.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-4 space-y-6 text-left">
        <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden border">
          <CardHeader className="bg-primary/5 border-b py-5 px-6">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" /> Device Integrity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center gap-4">
              <ShieldCheck className="h-6 w-6 text-green-600" />
              <div className="text-left">
                <p className="text-xs font-bold uppercase text-green-800">Drivers Configured</p>
                <p className="text-[9px] text-green-700 font-bold uppercase opacity-60">Ready for plug-and-play</p>
              </div>
            </div>

            <div className="space-y-4 text-left">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">Implementation Logic</p>
              <div className="flex gap-4">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold shrink-0">1</div>
                <p className="text-[10px] text-slate-600 leading-relaxed font-medium">Use Google Chrome for best results with direct thermal printing.</p>
              </div>
              <div className="flex gap-4">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold shrink-0">2</div>
                <p className="text-[10px] text-slate-600 leading-relaxed font-medium">For Bluetooth scanners, pair device first via OS Bluetooth settings before launching POS.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-slate-900 text-white rounded-3xl overflow-hidden relative group cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <SmartphoneNfc className="h-20 w-20" />
          </div>
          <CardContent className="p-6 space-y-4 relative z-10 text-left">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <Info className="h-5 w-5 text-accent" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-white uppercase tracking-tight">Need POS Peripherals?</p>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed uppercase">
                Contact support for recommended 80mm printers and QR scanners certified for Bill Matrix.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="w-full text-[9px] font-black uppercase text-accent hover:bg-white/10 border-white/10">
              Inquire Now <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
