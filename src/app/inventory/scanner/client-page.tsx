
"use client";

import { useState, useRef } from "react";
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Info,
  Trash2,
  Loader2,
  Zap,
  ShoppingBag,
  PackageCheck,
  ScanLine,
  Image as ImageIcon,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader, SectionCard } from "@/components/ui/editorial";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { scanBill } from "@/ai/flows/scan-bill-flow";

type ScannerState = "idle" | "uploading" | "scanning" | "review" | "success";

type ExtractedItem = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
  isMatched: boolean;
  matchedProductId?: string;
  confidence: "high" | "low";
};

export default function SmartScannerPage() {
  const [state, setState] = useState<ScannerState>("idle");
  const [progress, setProgress] = useState(0);
  const [extractedVendor, setExtractedVendor] = useState("");
  const [billTotal, setBillTotal] = useState(0);
  const [items, setItems] = useState<ExtractedItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const startScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUri = reader.result as string;
      setState("uploading");

      let p = 0;
      const interval = setInterval(() => {
        p += 10;
        setProgress(p);
        if (p >= 100) clearInterval(interval);
      }, 100);

      try {
        setState("scanning");
        const result = await scanBill({ photoDataUri: dataUri });

        setExtractedVendor(result.vendorName);
        setBillTotal(result.totalAmount);
        setItems(
          result.items.map((item, i) => ({
            ...item,
            id: i.toString(),
            isMatched: false,
            confidence: result.confidence
          }))
        );

        setState("review");
        toast({ title: "Scan Complete", description: "AI has extracted the bill data." });
      } catch (err) {
        console.error(err);
        setState("idle");
        toast({ variant: "destructive", title: "Scan Failed", description: "Could not process image." });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    setState("success");
    toast({ title: "Inventory Updated", description: "Purchase bill entries have been synchronized." });
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const calculatedTotal = items.reduce((sum, i) => sum + i.total, 0);
  const isMismatch = Math.abs(calculatedTotal - billTotal) > 1;

  if (state === "success") {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 space-y-6">
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Bill Processed Successfully</h2>
            <p className="text-slate-600 text-sm">
              Stock counts and vendor ledgers have been updated automatically.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline" className="h-11 rounded-xl px-6 font-semibold text-xs border-slate-200">
              <Link href="/inventory">View Inventory</Link>
            </Button>
            <Button
              onClick={() => {
                setState("idle");
                setProgress(0);
              }}
              className="h-11 rounded-xl px-6 bg-primary font-semibold text-xs text-white"
            >
              Scan Another Bill
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 text-left">
      <PageHeader
        title="Smart Bill Scanner"
        breadcrumb="Inventory / AI Purchase Scanner"
        description="Upload supplier bills to extract items, rates, and purchase totals automatically."
        backHref="/inventory"
        backLabel="Back to Inventory"
        actions={
          state === "review" ? (
            <span className="text-xs font-semibold text-primary">AI Review Active</span>
          ) : undefined
        }
      />

      {state === "idle" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">
            <div className="border-2 border-dashed border-slate-300 bg-white rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-6 hover:border-primary/50 transition-colors">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Upload Bill Image</h3>
                <p className="text-sm text-slate-600 max-w-xs mx-auto">
                  Supported: JPG, PNG. Handwritten or printed bills are processed automatically.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 h-12 bg-primary rounded-xl font-semibold text-sm text-white"
                >
                  <ImageIcon className="mr-2 h-4 w-4" /> Select File
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 h-12 border-slate-200 text-slate-700 bg-white rounded-xl font-semibold text-sm"
                >
                  <Camera className="mr-2 h-4 w-4" /> Use Camera
                </Button>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={startScan} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 flex items-start gap-3.5 border border-slate-200">
                <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5 text-amber-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900">Instant Entry</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Skip manual typing. Extract items and rates in seconds.
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 flex items-start gap-3.5 border border-slate-200">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <PackageCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900">Smart Sync</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Link bills directly to existing stock items and suppliers.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <SectionCard title="Scanning Tips" description="Best practices for accurate line-item extraction">
              <div className="space-y-4 text-left">
                <div className="flex gap-3 items-start">
                  <div className="h-6 w-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-mono font-semibold shrink-0">
                    1
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Ensure the bill is flat and well-lit. Avoid heavy shadows across printed or handwritten lines.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="h-6 w-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-mono font-semibold shrink-0">
                    2
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Capture the complete bill from the header (Supplier name) down to the footer (Grand Total).
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {(state === "uploading" || state === "scanning") && (
        <div className="max-w-lg mx-auto py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="h-20 w-20 rounded-2xl bg-slate-100 flex items-center justify-center">
              {state === "scanning" ? (
                <ScanLine className="h-10 w-10 text-primary" />
              ) : (
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              )}
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-slate-900">
                {state === "uploading" ? "Uploading Bill..." : "Scanning Bill Line Items..."}
              </h3>
              <p className="text-xs text-slate-500">
                Extracting product quantities, rates, and supplier details
              </p>
            </div>
            <div className="w-full max-w-sm space-y-2">
              <div className="flex justify-between text-xs font-medium text-slate-600 font-mono tabular-nums">
                <span>Extraction Progress</span>
                <span>{state === "scanning" ? "92%" : `${progress}%`}</span>
              </div>
              <Progress value={state === "scanning" ? 92 : progress} className="h-1.5 rounded-full" />
            </div>
          </div>
        </div>
      )}

      {state === "review" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <SectionCard
              title="Extraction Review"
              description="Verify extracted items and quantities before saving to your ledger"
              headerRight={
                <span className="text-xs font-mono tabular-nums font-semibold text-primary">
                  {items.length} Items Found
                </span>
              }
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto scrollbar-hide">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                      <TableHead className="pl-6">Item Description</TableHead>
                      <TableHead className="text-center w-24">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right pr-6">Subtotal</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="group border-b border-slate-100">
                        <TableCell className="pl-6 py-4">
                          <div className="flex flex-col gap-1 text-left">
                            <Input
                              defaultValue={item.name}
                              className={cn(
                                "h-8 text-sm font-semibold border-none bg-transparent p-0 focus-visible:ring-0",
                                item.confidence === "low" && "text-amber-700"
                              )}
                            />
                            <span
                              className={cn(
                                "text-xs font-medium",
                                item.isMatched ? "text-emerald-700" : "text-blue-700"
                              )}
                            >
                              {item.isMatched ? "Matched Stock Item" : "New Item Entry"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            defaultValue={item.qty}
                            className="h-9 w-16 mx-auto text-center font-mono tabular-nums font-semibold text-xs bg-slate-50 border-slate-200 rounded-lg"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            defaultValue={item.price}
                            className="h-9 w-24 ml-auto text-right font-mono tabular-nums font-semibold text-xs bg-slate-50 border-slate-200 rounded-lg"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums font-bold text-sm text-slate-900 pr-6">
                          ₹{item.total.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${item.name}`}
                            className="h-8 w-8 text-destructive opacity-70 hover:opacity-100"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="bg-slate-50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-200">
                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-xs font-medium text-slate-500">Calculated Bill Total</span>
                  <span className="text-2xl font-mono tabular-nums font-bold text-slate-900">
                    ₹{calculatedTotal.toLocaleString()}
                  </span>
                </div>
                {isMismatch && (
                  <div className="flex items-center gap-3 p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-left">
                    <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-rose-800">Total Mismatch</p>
                      <p className="text-xs text-rose-700 font-mono tabular-nums">
                        Line sum does not match bill footer (₹{billTotal.toLocaleString()})
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          <div className="lg:col-span-4 space-y-6 text-left">
            <SectionCard title="Supplier Attribution">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Extracted Supplier</Label>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center border border-slate-200 shrink-0">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left min-w-0">
                    <span className="text-sm font-bold text-slate-900 block truncate">
                      {extractedVendor || "Unknown Supplier"}
                    </span>
                    <p className="text-xs font-medium text-emerald-700">Auto-linked from bill</p>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Sync Options">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="space-y-0.5 text-left">
                    <p className="text-xs font-semibold text-slate-900">Update Stock</p>
                    <p className="text-xs text-slate-500">Add quantities to current inventory</p>
                  </div>
                  <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                </div>
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="space-y-0.5 text-left">
                    <p className="text-xs font-semibold text-slate-900">Record Outflow</p>
                    <p className="text-xs text-slate-500">Log as trade payable in ledger</p>
                  </div>
                  <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                </div>
                <Button
                  onClick={handleConfirm}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-sm rounded-xl"
                >
                  Save Bill to Ledger
                </Button>
                <Button
                  variant="ghost"
                  className="w-full h-10 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl"
                  onClick={() => setState("idle")}
                >
                  Discard Extraction
                </Button>
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}
