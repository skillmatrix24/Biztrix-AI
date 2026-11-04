
"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Building2, Globe, CheckCircle2, ImageIcon, Upload, X, ShieldCheck, Zap, Lock, Sparkles, ArrowRight, Wallet, Landmark, CreditCard, Hash, Info, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

interface GeneralTabProps {
  business: any;
  isAdmin: boolean;
  isTrialExpired: boolean;
  onUpdate: (data: any) => void;
}

export function GeneralTab({ business, isAdmin, isTrialExpired, onUpdate }: GeneralTabProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  
  // Local state to prevent keystroke-level writes
  const [localName, setLocalName] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  const [localPhone, setLocalPhone] = useState("");
  const [localBank, setLocalBank] = useState({
    accountName: "",
    bankName: "",
    accountNumber: "",
    ifsc: ""
  });

  useEffect(() => {
    if (business?.name) setLocalName(business.name);
    if (business?.address) setLocalAddress(business.address);
    if (business?.phone) setLocalPhone(business.phone);
    if (business?.bankDetails) {
      setLocalBank({
        accountName: business.bankDetails.accountName || "",
        bankName: business.bankDetails.bankName || "",
        accountNumber: business.bankDetails.accountNumber || "",
        ifsc: business.bankDetails.ifsc || ""
      });
    }
  }, [business]);

  const isBrandingActive = useMemo(() => {
    return business?.activeAddonIds?.includes('feat_branding') || business?.status === 'pro';
  }, [business]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, key: 'logoUrl' | 'faviconUrl') => {
    if (!isBrandingActive) return;
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast({ variant: "destructive", title: "File too large", description: "Please upload an image smaller than 500KB." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate({ [key]: reader.result as string });
        toast({ title: "Branding Updated" });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateBank = () => {
    onUpdate({ bankDetails: localBank });
    toast({ title: "Financial Node Updated" });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="lg:col-span-8 space-y-8">
        <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden border">
          <CardHeader className="bg-primary/5 border-b py-5 px-6">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2 text-left">
              <Building2 className="h-4 w-4" /> Identity & Locale
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5 text-left col-span-1 sm:col-span-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Business Legal Name</Label>
                <Input 
                  value={localName} 
                  onChange={(e) => setLocalName(e.target.value)}
                  onBlur={(e) => onUpdate({ name: e.target.value })}
                  disabled={!isAdmin || isTrialExpired}
                  className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner"
                />
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Opening Balance</Label>
                <Input 
                  type="number"
                  value={business?.openingBalance || 0}
                  onChange={(e) => onUpdate({ openingBalance: parseFloat(e.target.value) || 0 })}
                  disabled={!isAdmin || isTrialExpired}
                  className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner"
                />
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Opening Balance Date</Label>
                <Input 
                  type="date"
                  value={business?.openingBalanceDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => onUpdate({ openingBalanceDate: e.target.value })}
                  disabled={!isAdmin || isTrialExpired}
                  className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner"
                />
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Contact Phone (Global)</Label>
                <Input 
                  value={localPhone} 
                  onChange={(e) => setLocalPhone(e.target.value)}
                  onBlur={(e) => onUpdate({ phone: e.target.value })}
                  disabled={!isAdmin || isTrialExpired}
                  className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner"
                />
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Default Currency</Label>
                <Select 
                  value={business?.currency || "INR"} 
                  onValueChange={(v) => onUpdate({ currency: v })}
                  disabled={!isAdmin || isTrialExpired}
                >
                  <SelectTrigger className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="INR" className="text-xs font-bold">₹ Indian Rupee (INR)</SelectItem>
                    <SelectItem value="USD" className="text-xs font-bold">$ US Dollar (USD)</SelectItem>
                    <SelectItem value="EUR" className="text-xs font-bold">€ Euro (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 text-left col-span-1 sm:col-span-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Official Billing Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-4 h-4 w-4 text-muted-foreground opacity-30" />
                  <Textarea 
                    value={localAddress} 
                    onChange={(e) => setLocalAddress(e.target.value)}
                    onBlur={(e) => onUpdate({ address: e.target.value })}
                    disabled={!isAdmin || isTrialExpired}
                    placeholder="Enter full business address for invoices"
                    className="min-h-[100px] pl-10 rounded-xl font-medium bg-muted/20 border-none shadow-inner"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BANK DETAILS SECTION */}
        <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden border">
          <CardHeader className="bg-muted/30 border-b py-5 px-6">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2 text-left">
              <Landmark className="h-4 w-4" /> Bank & Financial Node
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Beneficiary Name</Label>
                <Input 
                  value={localBank.accountName} 
                  onChange={(e) => setLocalBank({...localBank, accountName: e.target.value})}
                  onBlur={handleUpdateBank}
                  className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner"
                  placeholder="Official Name for Payment"
                />
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Bank Name</Label>
                <Input 
                  value={localBank.bankName} 
                  onChange={(e) => setLocalBank({...localBank, bankName: e.target.value})}
                  onBlur={handleUpdateBank}
                  className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner"
                  placeholder="e.g. State Bank of India"
                />
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Account Number</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-30" />
                  <Input 
                    value={localBank.accountNumber} 
                    onChange={(e) => setLocalBank({...localBank, accountNumber: e.target.value})}
                    onBlur={handleUpdateBank}
                    className="h-12 pl-10 rounded-xl font-bold bg-muted/20 border-none shadow-inner"
                  />
                </div>
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">IFSC Code</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-30" />
                  <Input 
                    value={localBank.ifsc} 
                    onChange={(e) => setLocalBank({...localBank, ifsc: e.target.value.toUpperCase()})}
                    onBlur={handleUpdateBank}
                    className="h-12 pl-10 rounded-xl font-black uppercase bg-muted/20 border-none shadow-inner"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-3">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[9px] text-primary/70 font-bold uppercase leading-relaxed">Ye details aapke A4 Invoice print mein automatically shamil ho jayenge taaki payments sateek tarike se transfer hon.</p>
            </div>
          </CardContent>
        </Card>

        {/* Branding Section */}
        <Card className={cn("border-none shadow-md bg-white rounded-2xl overflow-hidden border relative", !isBrandingActive && "opacity-90")}>
          {!isBrandingActive && (
            <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
              <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-4 shadow-xl"><Lock className="h-6 w-6" /></div>
              <h3 className="text-lg font-bold text-slate-900">Custom Branding Pro</h3>
              <p className="text-xs text-slate-600 max-w-xs mx-auto mb-6">Unlock Logo & Favicon upload to personalize your OS.</p>
              <Button asChild className="bg-primary h-10 px-8 rounded-xl font-bold uppercase text-[10px]"><Link href="/marketplace">Upgrade Node</Link></Button>
            </div>
          )}
          <CardHeader className="bg-muted/30 border-b py-5 px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2 text-left"><ImageIcon className="h-4 w-4" /> Branding Assets</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              <div className="space-y-4 text-left">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Main Logo</Label>
                <div onClick={() => isBrandingActive && !isTrialExpired && logoInputRef.current?.click()} className={cn("h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer", business?.logoUrl ? "border-primary/20 bg-primary/5 p-2" : "border-muted-foreground/20 bg-muted/10")}>
                  {business?.logoUrl ? <img src={business.logoUrl} className="h-full w-full object-contain" alt="" /> : <><Upload className="h-5 w-5 text-muted-foreground" /><p className="text-[10px] font-bold text-muted-foreground uppercase">Upload Logo</p></>}
                </div>
                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logoUrl')} />
              </div>
              <div className="space-y-4 text-left">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Favicon</Label>
                <div onClick={() => isBrandingActive && !isTrialExpired && faviconInputRef.current?.click()} className={cn("h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer", business?.faviconUrl ? "border-primary/20 bg-primary/5 p-8" : "border-muted-foreground/20 bg-muted/10")}>
                  {business?.faviconUrl ? <img src={business.faviconUrl} className="h-full w-full object-contain" alt="" /> : <><Zap className="h-5 w-5 text-muted-foreground" /><p className="text-[10px] font-bold text-muted-foreground uppercase">Upload Favicon</p></>}
                </div>
                <input type="file" ref={faviconInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'faviconUrl')} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-4 space-y-6">
        <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden border">
          <CardHeader className="bg-primary/5 border-b py-5 px-6">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-600" /> Professional Node
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6 text-center">
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary mx-auto shadow-sm"><CheckCircle2 className="h-5 w-5" /></div>
              <h4 className="text-xs font-bold uppercase">Ready for A4 Prints</h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">Aapke bank aur identity details digital tax invoices mein sateek (precise) tarike se sync ho chuke hain.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
