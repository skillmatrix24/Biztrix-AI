
"use client";

import { useState, useRef } from "react";
import { 
  Camera, 
  Upload, 
  Sparkles, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Trash2,
  RefreshCw,
  Plus,
  Loader2,
  Zap,
  ShoppingBag,
  PackageCheck,
  ScanLine,
  Image as ImageIcon,
  ArrowRightLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
      
      // Artificial UI Progress
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
        setItems(result.items.map((item, i) => ({
          ...item,
          id: i.toString(),
          isMatched: false,
          confidence: result.confidence
        })));
        
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
    setItems(items.filter(i => i.id !== id));
  };

  const calculatedTotal = items.reduce((sum, i) => sum + i.total, 0);
  const isMismatch = Math.abs(calculatedTotal - billTotal) > 1;

  if (state === "success") {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-6">
        <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto border-4 border-white shadow-xl">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-primary">Bill Processed Successfully!</h2>
          <p className="text-muted-foreground text-sm">Stock counts and vendor ledgers have been updated automatically.</p>
        </div>
        <div className="pt-6 flex gap-3 justify-center">
          <Button asChild variant="outline" className="h-11 rounded-xl px-8 font-bold uppercase text-[10px] tracking-widest">
            <Link href="/inventory">View Inventory</Link>
          </Button>
          <Button onClick={() => { setState("idle"); setProgress(0); }} className="h-11 rounded-xl px-8 bg-primary font-bold uppercase text-[10px] tracking-widest shadow-lg text-white">
            Scan Another Bill
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-10 px-2 sm:px-0 text-left">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-primary/5">
            <Link href="/inventory"><ArrowLeft className="h-5 w-5 text-muted-foreground" /></Link>
          </Button>
          <div className="text-left">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
              <ScanLine className="h-7 w-7" /> Smart Bill Scanner
            </h2>
            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground uppercase font-black tracking-widest opacity-60">AI-powered purchase entry node</p>
          </div>
        </div>
        {state === "review" && (
          <Badge variant="outline" className="h-8 px-3 border-primary/20 text-primary font-bold gap-2 bg-primary/5 uppercase text-[9px] tracking-widest">
            <Sparkles className="h-3.5 w-3.5" /> PRO AI Active
          </Badge>
        )}
      </div>

      {state === "idle" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-2 border-dashed border-primary/20 bg-primary/5 rounded-[2.5rem] overflow-hidden group hover:border-primary/40 transition-all">
              <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-8">
                <div className="h-24 w-24 rounded-[2rem] bg-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <Upload className="h-12 w-12 text-primary" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-primary uppercase tracking-tight">Upload Bill Image</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto font-medium">Supported: JPG, PNG. Handwritten or printed bills are processed by Gemini AI.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                  <Button onClick={() => fileInputRef.current?.click()} className="flex-1 h-14 bg-primary rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl text-white">
                    <ImageIcon className="mr-2 h-4 w-4" /> Select File
                  </Button>
                  <Button variant="outline" className="flex-1 h-14 border-primary/20 text-primary bg-white rounded-2xl font-black text-xs uppercase tracking-widest">
                    <Camera className="mr-2 h-4 w-4" /> Use Camera
                  </Button>
                </div>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={startScan} />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-none shadow-sm bg-white rounded-2xl p-6 flex items-start gap-4 border">
                <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold uppercase tracking-tight">Instant Entry</p>
                  <p className="text-[10px] text-muted-foreground">Skip typing. Let AI extract items and prices in seconds.</p>
                </div>
              </Card>
              <Card className="border-none shadow-sm bg-white rounded-2xl p-6 flex items-start gap-4 border">
                <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <PackageCheck className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold uppercase tracking-tight">Smart Sync</p>
                  <p className="text-[10px] text-muted-foreground">Automatically link bills to existing stock and vendors.</p>
                </div>
              </Card>
            </div>
          </div>

          <div className="lg:col-span-5">
            <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border">
              <CardHeader className="bg-muted/30 border-b py-6 px-8">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Info className="h-4 w-4" /> Scanning Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6 text-left">
                <div className="flex gap-4">
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed uppercase font-bold">Ensure the bill is flat and well-lit. Avoid shadows across the text.</p>
                </div>
                <div className="flex gap-4">
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed uppercase font-bold">Capture the entire bill from header (Vendor name) to footer (Total Amount).</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {(state === "uploading" || state === "scanning") && (
        <div className="max-w-2xl mx-auto py-20 space-y-8">
          <div className="relative flex flex-col items-center justify-center space-y-6">
            <div className="h-32 w-32 rounded-[2rem] bg-primary/5 flex items-center justify-center relative overflow-hidden">
              {state === "scanning" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="h-1 w-full bg-primary/40 animate-pulse top-0 absolute" />
                  <div className="h-1 w-full bg-primary/40 animate-pulse top-1/4 absolute" />
                  <div className="h-1 w-full bg-primary/40 animate-pulse top-1/2 absolute" />
                  <div className="h-1 w-full bg-primary/40 animate-pulse top-3/4 absolute" />
                  <ScanLine className="h-12 w-12 text-primary animate-bounce" />
                </div>
              ) : (
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              )}
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black text-primary uppercase">
                {state === "uploading" ? "Uploading Node..." : "AI Intelligence Scanning..."}
              </h3>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] animate-pulse">
                Parsing bill logic & data node extraction
              </p>
            </div>
            <div className="w-full max-w-sm space-y-2">
              <div className="flex justify-between text-[9px] font-black text-primary uppercase">
                <span>PHASE: EXTRACTION</span>
                <span>{state === "scanning" ? "92%" : `${progress}%`}</span>
              </div>
              <Progress value={state === "scanning" ? 92 : progress} className="h-1.5 rounded-full" />
            </div>
          </div>
        </div>
      )}

      {state === "review" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border">
              <CardHeader className="bg-primary py-6 px-8 flex flex-row items-center justify-between border-b">
                <div className="space-y-1 text-left">
                  <CardTitle className="text-white text-lg font-black uppercase tracking-tight">Extraction Review</CardTitle>
                  <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest">Verify AI findings before committing to ledger</p>
                </div>
                <Badge className="bg-white/20 text-white border-none uppercase text-[10px] font-black px-3 h-6">
                  {items.length} Nodes Found
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto scrollbar-hide">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 border-b">
                        <TableHead className="text-[10px] font-black uppercase pl-8 h-12">Item Description</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-center w-24">Qty</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-right">Rate</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-right pr-8">Subtotal</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id} className="group hover:bg-muted/5 transition-colors border-b">
                          <TableCell className="pl-8 py-5">
                            <div className="flex flex-col gap-1.5 text-left">
                              <Input 
                                defaultValue={item.name} 
                                className={cn(
                                  "h-8 text-sm font-black border-none bg-transparent p-0 focus-visible:ring-0 uppercase tracking-tight",
                                  item.confidence === 'low' && "text-orange-600"
                                )}
                              />
                              <div className="flex items-center gap-2">
                                {item.isMatched ? (
                                  <Badge variant="outline" className="text-[7px] h-4 px-1.5 font-black border-green-200 text-green-600 bg-green-50 uppercase">Linked Node</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[7px] h-4 px-1.5 font-black border-blue-200 text-blue-600 bg-blue-50 uppercase">New Entry</Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Input defaultValue={item.qty} className="h-9 w-16 mx-auto text-center font-black text-xs bg-muted/20 border-none rounded-xl shadow-inner" />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input defaultValue={item.price} className="h-9 w-24 ml-auto text-right font-black text-xs bg-muted/20 border-none rounded-xl shadow-inner" />
                          </TableCell>
                          <TableCell className="text-right font-black text-sm text-primary pr-8">
                            ₹{item.total.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100" onClick={() => removeItem(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/10 p-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-t">
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Calculated Node Total</span>
                  <span className="text-3xl font-black text-primary">₹{calculatedTotal.toLocaleString()}</span>
                </div>
                {isMismatch && (
                  <div className="flex items-center gap-4 p-4 bg-red-50 rounded-2xl border border-red-100 animate-pulse text-left">
                    <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-red-800 uppercase tracking-widest">Sum Mismatch</p>
                      <p className="text-[9px] text-red-600 font-bold uppercase">Items total doesn't match bill footer (₹{billTotal})</p>
                    </div>
                  </div>
                )}
              </CardFooter>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-6 text-left">
            <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border">
              <CardHeader className="bg-primary/5 border-b py-6 px-8 text-left">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Vendor Attribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Extracted Source</Label>
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center border shadow-sm"><ShoppingBag className="h-5 w-5 text-primary" /></div>
                      <div className="text-left">
                        <span className="text-sm font-black text-primary uppercase">{extractedVendor || "Unknown Supplier"}</span>
                        <p className="text-[8px] font-bold text-green-600 uppercase tracking-tighter">AI Node Auto-Linked</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border">
              <CardHeader className="bg-muted/30 border-b py-6 px-8 text-left">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Commit Sequence
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl shadow-inner border border-transparent hover:border-primary/10 transition-all">
                  <div className="space-y-0.5 text-left">
                    <p className="text-xs font-black uppercase text-slate-900 leading-none">Update Stock</p>
                    <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">Add qty to current registry</p>
                  </div>
                  <Switch defaultChecked className="scale-75 data-[state=checked]:bg-primary" />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl shadow-inner border border-transparent hover:border-primary/10 transition-all">
                  <div className="space-y-0.5 text-left">
                    <p className="text-xs font-black uppercase text-slate-900 leading-none">Record Outflow</p>
                    <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">Log as trade payable</p>
                  </div>
                  <Switch defaultChecked className="scale-75 data-[state=checked]:bg-primary" />
                </div>
              </CardContent>
              <CardFooter className="p-8 pt-0">
                <Button onClick={handleConfirm} className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl rounded-2xl active:scale-95 transition-all">
                  Commit Node to Ledger
                </Button>
              </CardFooter>

              <Button variant="ghost" className="w-full h-10 text-[9px] font-black uppercase text-destructive/40 hover:text-destructive hover:bg-red-50 rounded-xl" onClick={() => setState("idle")}>
                Discard Extraction Buffer
              </Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
