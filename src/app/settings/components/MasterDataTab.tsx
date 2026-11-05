
"use client";

import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import { 
  Plus, 
  X, 
  Layers, 
  SmartphoneNfc, 
  Zap,
  Tag,
  Building2,
  Navigation,
  Droplets,
  Home,
  Users,
  Scale,
  Wallet,
  NotebookPen,
  Smartphone,
  Route,
  CheckCircle2,
  Info,
  Trees,
  Settings2,
  Lock,
  Globe,
  ShieldCheck,
  Palmtree,
  Wheat,
  Target,
  IdCard,
  Hash,
  Users2,
  Calendar,
  MapPin
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateDocumentNonBlocking } from "@/firebase";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Chandigarh"
];

interface MasterDataTabProps {
  business: any;
  businessRef: any;
  isAdmin: boolean;
  isTrialExpired: boolean;
}

export function MasterDataTab({ business, businessRef, isAdmin, isTrialExpired }: MasterDataTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessRef) return;
    
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const data = results.data as any[];
        const items = data.map(row => row.name || row.particular).filter(Boolean);
        
        const current = business?.commonParticulars || [];
        updateDocumentNonBlocking(businessRef, { commonParticulars: [...new Set([...current, ...items])] });
        
        toast({ title: "Import Successful", description: `Added ${items.length} items.` });
      }
    });
  };

  const downloadSampleCSV = () => {
    const csvContent = "name\nTea & Snacks\nStationery Purchase\nOffice Cleaning";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'particulars_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const [newCustType, setNewCustType] = useState("");
  const [newCashType, setNewCashType] = useState("");
  const [newUnitType, setNewUnitType] = useState("");
  const [newCashCategory, setNewCashCategory] = useState("");
  const [newParticular, setNewParticular] = useState("");
  const [newAssetType, setNewAssetType] = useState("");
  const [newBhk, setNewBhk] = useState("");
  const [newFacing, setNewFacing] = useState("");
  const [newLandType, setNewLandType] = useState("");
  const [newSoilType, setNewSoilType] = useState("");
  const [newCropType, setNewCropType] = useState("");
  const [newAreaUnit, setNewAreaUnit] = useState("");
  const [newSocialCat, setNewSocialCat] = useState("");
  const [newRoadType, setNewRoadType] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("");

  // Card Config Buffering
  const [localPrefix, setLocalPrefix] = useState("");
  const [localYear, setLocalYear] = useState("");
  const [localSeq, setLocalSeq] = useState("");

  // WhatsApp Strategy State
  const [selectedWAType, setSelectedWAType] = useState("Lead/Customer Profile");

  useEffect(() => {
    if (business?.cardConfig) {
      setLocalPrefix(business.cardConfig.prefix || "BIZ");
      setLocalYear(business.cardConfig.year?.toString() || new Date().getFullYear().toString());
      setLocalSeq(business.cardConfig.nextSequence?.toString() || "1001");
    }
  }, [business?.cardConfig]);

  const handleAddValue = (field: string, currentValues: string[], newValue: string, setter: (v: string) => void) => {
    if (!newValue.trim() || !businessRef) return;
    const cleanValue = newValue.trim();
    const existing = currentValues || [];
    if (existing.includes(cleanValue)) {
      toast({ variant: "destructive", title: "Duplicate", description: "Value already exists." });
      return;
    }
    updateDocumentNonBlocking(businessRef, { [field]: [...existing, cleanValue] });
    setter("");
    toast({ title: "Updated" });
  };

  const removeValue = (field: string, currentValues: string[], value: string) => {
    if (!businessRef || !isAdmin) return;
    const filtered = (currentValues || []).filter((v: string) => v !== value);
    updateDocumentNonBlocking(businessRef, { [field]: filtered });
    toast({ title: "Removed" });
  };

  const updateCardConfig = (key: string, value: any) => {
    if (!businessRef || !isAdmin) return;
    const currentConfig = business?.cardConfig || { prefix: "BIZ", format: "PREFIX-TIER-YEAR-SEQ", nextSequence: 1001, year: new Date().getFullYear() };
    updateDocumentNonBlocking(businessRef, { 
      cardConfig: { ...currentConfig, [key]: value } 
    });
    toast({ title: "Card Config Updated" });
  };

  const updateWAConfig = (key: string, value: any, isToggle = false) => {
    if (!businessRef || !isAdmin) return;
    const allConfigs = business?.waMarketingConfigs || {};
    const currentTypeConfig = allConfigs[selectedWAType] || {
      header: selectedWAType === 'Lead/Customer Profile' ? `📋 *New Lead Enquiry Details*` : `🚀 *New ${selectedWAType} Alert!*`,
      footer: "Contact us for more details.",
      toggles: {
        includePrice: true,
        includeId: true,
        includeAgent: true,
        includeType: true
      }
    };

    const updatedTypeConfig = { ...currentTypeConfig };
    if (isToggle) {
      updatedTypeConfig.toggles = { 
        ...(updatedTypeConfig.toggles || {}), 
        [key]: value 
      };
    } else {
      updatedTypeConfig[key] = value;
    }

    updateDocumentNonBlocking(businessRef, {
      waMarketingConfigs: {
        ...allConfigs,
        [selectedWAType]: updatedTypeConfig
      }
    });
  };

  const customerTypes = business?.customerTypes || ["Regular", "VIP", "Wholesale", "Risky"];
  const cashbookTypes = business?.cashbookTypes || ["Credit", "Debit"];
  const baseUnits = business?.baseUnits || ["pcs", "kg", "box", "packet", "unit", "litre", "meter"];
  const cashbookCategories = business?.cashbookCategories || ["Sales", "Expense", "Rent", "Salary", "Purchase", "Utility", "Other"];
  const commonParticulars = business?.commonParticulars || ["Tea & Snacks", "Conveyance", "Office Cleaning", "Stationery Purchase"];
  
  const assetCategories = business?.assetCategories || ["Khet", "Plot", "Building", "Farmhouse", "Chukta"];
  const bhkConfigs = business?.bhkConfigs || ["1 BHK", "2 BHK", "3 BHK", "4 BHK"];
  const facingDirections = business?.facingDirections || ["East", "West", "North", "South", "North-East", "North-West", "South-East", "South-West"];
  const landTypes = business?.landTypes || ["Khet", "Khar", "Bharri", "FormHouse", "Factory"];
  const soilTypes = business?.soilTypes || ["Bhura Mitti", "Kala Mitti", "Upjau", "Retili"];
  const cropTypes = business?.cropTypes || ["Single Crop", "Double Crop", "Triple Crop", "Dalhan", "Tilhan"];
  const areaUnits = business?.areaUnits || ["sq.ft", "sq.yd", "Acre", "Guntha", "Bigha"];
  const socialCategories = business?.socialCategories || ["OBC", "General", "SC", "ST"];
  const roadTypes = business?.roadTypes || ["Single Road", "Double Road", "Non-Road"];

  const staffRoles = business?.staffRoles || ["Admin", "Manager", "Staff", "Agent", "Accountant"];
  
  const currentWA = (business?.waMarketingConfigs?.[selectedWAType]) || {
    header: selectedWAType === 'Lead/Customer Profile' ? `📋 *New Lead Enquiry Details*` : `🚀 *New ${selectedWAType} Alert!*`,
    footer: "Contact us for more details.",
    toggles: {
      includePrice: true,
      includeId: true,
      includeAgent: true,
      includeType: true
    }
  };

  const getSmartFields = (type: string) => {
    if (type === 'Lead/Customer Profile') {
      return [
        { id: 'includeName', label: 'Customer Name' },
        { id: 'includePhone', label: 'Mobile Number' },
        { id: 'includeSource', label: 'Lead Source' },
        { id: 'includeInterest', label: 'Property Interest' },
        { id: 'includeBudget', label: 'Budget Range' },
        { id: 'includeLocation', label: 'Preferred Location' },
        { id: 'includeAgent', label: 'Assigned Agent' },
        { id: 'includeNotes', label: 'Enquiry Notes' },
        { id: 'includeStatus', label: 'Current Stage' }
      ];
    }
    const common = [
      { id: 'includeId', label: 'Asset ID' },
      { id: 'includeType', label: 'Asset Type' },
      { id: 'includePrice', label: 'Market Price (Public)' },
      { id: 'includeFacing', label: 'Facing Direction' },
      { id: 'includeAgent', label: 'Assigned Agent' },
      { id: 'includeDescription', label: 'Public Description' }
    ];
    if (type === 'Khet' || type === 'Farmhouse') {
      return [...common, { id: 'includeSize', label: 'Total Size' }, { id: 'includeRate', label: 'Rate per Unit' }];
    }
    if (type === 'Plot') {
      return [...common, { id: 'includeArea', label: 'Total Area' }, { id: 'includeRate', label: 'Rate per SqFt' }];
    }
    return common;
  };

  return (
    <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      <Card className="border-none shadow-md bg-white rounded-2xl p-6 border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <Layers className="h-4 w-4" /> Bulk Master Data Import
          </CardTitle>
          <div className="flex gap-4 items-center">
            <p className="text-[10px] text-muted-foreground">Upload CSV (columns: name or particular)</p>
            <Button onClick={downloadSampleCSV} variant="outline" className="h-9 rounded-xl text-[10px] font-bold uppercase">Download Sample</Button>
            <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <Button onClick={() => fileInputRef.current?.click()} className="h-9 rounded-xl text-[10px] font-bold uppercase bg-slate-900 text-white">Import Particulars</Button>
          </div>
        </div>
      </Card>
      
      {/* SECTION 0: UNIVERSAL MEMBERSHIP CARD CONFIG */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 px-1 text-left">
          <IdCard className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary">Universal Identity Engine</h3>
        </div>
        <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border p-8 sm:p-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-3 text-left">
                 <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Card Prefix</Label>
                 <Input 
                   value={localPrefix} 
                   onChange={(e) => setLocalPrefix(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                   onBlur={(e) => updateCardConfig('prefix', e.target.value.toUpperCase().replace(/\s+/g, ''))}
                   placeholder="BIZ"
                   className="h-12 rounded-xl font-black text-lg bg-muted/20 border-none shadow-inner"
                 />
                 <p className="text-[8px] font-bold text-muted-foreground uppercase px-1">Identity Head</p>
              </div>
              <div className="space-y-3 text-left">
                 <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Registration Year</Label>
                 <div className="relative">
                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40" />
                   <Input 
                     type="number"
                     value={localYear} 
                     onChange={(e) => setLocalYear(e.target.value)}
                     onBlur={(e) => updateCardConfig('year', parseInt(e.target.value))}
                     className="h-12 pl-10 rounded-xl font-black text-lg bg-muted/20 border-none shadow-inner"
                   />
                 </div>
                 <p className="text-[8px] font-bold text-muted-foreground uppercase px-1">Lifecycle Year</p>
              </div>
              <div className="space-y-3 text-left">
                 <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Next Serial No.</Label>
                 <div className="relative">
                   <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40" />
                   <Input 
                     type="number"
                     value={localSeq} 
                     onChange={(e) => setLocalSeq(e.target.value)}
                     onBlur={(e) => updateCardConfig('nextSequence', parseInt(e.target.value))}
                     className="h-12 pl-10 rounded-xl font-black text-lg bg-muted/20 border-none shadow-inner"
                   />
                 </div>
                 <p className="text-[8px] font-bold text-muted-foreground uppercase px-1">Starting point</p>
              </div>
            </div>
            
            <div className="md:col-span-4 h-full flex items-center">
              <div className="w-full p-8 bg-primary/5 rounded-[2.5rem] border-2 border-dashed border-primary/20 flex flex-col justify-center gap-4 relative overflow-hidden group text-left">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><CheckCircle2 className="h-12 w-12" /></div>
                <div className="flex items-center gap-2 relative z-10">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Sample Generation</span>
                </div>
                <p className="text-xl font-mono font-black text-primary tracking-[0.1em] break-all relative z-10 drop-shadow-sm">
                  {localPrefix || 'BIZ'}-[TIER]-{localYear || '2026'}-{localSeq || '1001'}
                </p>
                <div className="p-2 bg-white rounded-lg border border-primary/10 shadow-sm relative z-10 text-center">
                   <p className="text-[7px] font-black text-muted-foreground uppercase leading-none">Placeholder [TIER] is dynamic based on membership level</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Separator className="opacity-50" />

      {/* SECTION 1: CORE BUSINESS MASTERS */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-1 text-left">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary">Core Business Masters</h3>
          </div>
          <div className="flex items-center gap-3 bg-primary/5 p-1 rounded-xl border border-primary/10">
            <span className="text-[9px] font-black text-primary uppercase pl-3">Default Registry State:</span>
            <Select value={business?.defaultState || business?.state || "Maharashtra"} onValueChange={(v) => updateDocumentNonBlocking(businessRef, { defaultState: v })}>
              <SelectTrigger className="h-8 w-40 rounded-lg border-none bg-white shadow-sm font-black text-[10px] uppercase">
                <MapPin className="h-3 w-3 mr-2 opacity-40" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-2xl max-h-60">
                {INDIAN_STATES.map(s => <SelectItem key={s} value={s} className="text-[10px] font-bold uppercase">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MasterCard title="Customer Types" icon={Users} items={customerTypes} field="customerTypes" onAdd={(v: string) => handleAddValue('customerTypes', customerTypes, v, setNewCustType)} onRemove={(v: string) => removeValue('customerTypes', customerTypes, v)} inputValue={newCustType} onInputChange={setNewCustType} />
          <MasterCard title="Cashbook Types" icon={Wallet} items={cashbookTypes} field="cashbookTypes" onAdd={(v: string) => handleAddValue('cashbookTypes', cashbookTypes, v, setNewCashType)} onRemove={(v: string) => removeValue('cashbookTypes', cashbookTypes, v)} inputValue={newCashType} onInputChange={setNewCashType} />
          <MasterCard title="Base Units" icon={Scale} items={baseUnits} field="baseUnits" onAdd={(v: string) => handleAddValue('baseUnits', baseUnits, v, setNewUnitType)} onRemove={(v: string) => removeValue('baseUnits', baseUnits, v)} inputValue={newUnitType} onInputChange={setNewUnitType} />
          <MasterCard title="Cashbook Categories" icon={Wallet} items={cashbookCategories} field="cashbookCategories" onAdd={(v: string) => handleAddValue('cashbookCategories', cashbookCategories, v, setNewCashCategory)} onRemove={(v: string) => removeValue('cashbookCategories', cashbookCategories, v)} inputValue={newCashCategory} onInputChange={setNewCashCategory} />
          <MasterCard title="Common Particulars" icon={NotebookPen} items={commonParticulars} field="commonParticulars" onAdd={(v: string) => handleAddValue('commonParticulars', commonParticulars, v, setNewParticular)} onRemove={(v: string) => removeValue('commonParticulars', commonParticulars, v)} inputValue={newParticular} onInputChange={setNewParticular} />
          <MasterCard title="Staff Roles" icon={Users2} items={staffRoles} field="staffRoles" onAdd={(v: string) => handleAddValue('staffRoles', staffRoles, v, setNewStaffRole)} onRemove={(v: string) => removeValue('staffRoles', staffRoles, v)} inputValue={newStaffRole} onInputChange={setNewStaffRole} />
        </div>
      </div>

      {/* SECTION 2: REAL ESTATE REGISTRY MASTERS */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 px-1 text-left">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary">Property Registry Masters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <MasterCard title="Asset Categories" icon={Building2} items={assetCategories} field="assetCategories" onAdd={(v: string) => handleAddValue('assetCategories', assetCategories, v, setNewAssetType)} onRemove={(v: string) => removeValue('assetCategories', assetCategories, v)} inputValue={newAssetType} onInputChange={setNewAssetType} />
          <MasterCard title="BHK Configs" icon={Home} items={bhkConfigs} field="bhkConfigs" onAdd={(v: string) => handleAddValue('bhkConfigs', bhkConfigs, v, setNewBhk)} onRemove={(v: string) => removeValue('bhkConfigs', bhkConfigs, v)} inputValue={newBhk} onInputChange={setNewBhk} />
          <MasterCard title="Facing Directions" icon={Navigation} items={facingDirections} field="facingDirections" onAdd={(v: string) => handleAddValue('facingDirections', facingDirections, v, setNewFacing)} onRemove={(v: string) => removeValue('facingDirections', facingDirections, v)} inputValue={newFacing} onInputChange={setNewFacing} />
          <MasterCard title="Land Types" icon={Trees} items={landTypes} field="landTypes" onAdd={(v: string) => handleAddValue('landTypes', landTypes, v, setNewLandType)} onRemove={(v: string) => removeValue('landTypes', landTypes, v)} inputValue={newLandType} onInputChange={setNewLandType} />
          <MasterCard title="Soil Types" icon={Droplets} items={soilTypes} field="soilTypes" onAdd={(v: string) => handleAddValue('soilTypes', soilTypes, v, setNewSoilType)} onRemove={(v: string) => removeValue('soilTypes', soilTypes, v)} inputValue={newSoilType} onInputChange={setNewSoilType} />
          <MasterCard title="Crop Types" icon={Wheat} items={cropTypes} field="cropTypes" onAdd={(v: string) => handleAddValue('cropTypes', cropTypes, v, setNewCropType)} onRemove={(v: string) => removeValue('cropTypes', cropTypes, v)} inputValue={newCropType} onInputChange={setNewCropType} />
          <MasterCard title="Area Units" icon={Scale} items={areaUnits} field="areaUnits" onAdd={(v: string) => handleAddValue('areaUnits', areaUnits, v, setNewAreaUnit)} onRemove={(v: string) => removeValue('areaUnits', areaUnits, v)} inputValue={newAreaUnit} onInputChange={setNewAreaUnit} />
          <MasterCard title="Social Categories" icon={Users} items={socialCategories} field="socialCategories" onAdd={(v: string) => handleAddValue('socialCategories', socialCategories, v, setNewSocialCat)} onRemove={(v: string) => removeValue('socialCategories', socialCategories, v)} inputValue={newSocialCat} onInputChange={setNewSocialCat} />
          <MasterCard title="Road Types" icon={Route} items={roadTypes} field="roadTypes" onAdd={(v: string) => handleAddValue('roadTypes', roadTypes, v, setNewRoadType)} onRemove={(v: string) => removeValue('roadTypes', roadTypes, v)} inputValue={newRoadType} onInputChange={setNewRoadType} />
        </div>
      </div>

      {/* SECTION 3: WHATSAPP STRATEGY BY PROPERTY TYPE */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 text-left">
          <div className="flex items-center gap-2">
            <SmartphoneNfc className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary">WhatsApp Marketing Strategy</h3>
          </div>
          <div className="flex items-center gap-3 bg-primary/5 p-1 rounded-xl border border-primary/10 w-full sm:w-auto">
            <span className="text-[9px] font-black text-primary uppercase pl-3">Strategy For:</span>
            <Select value={selectedWAType} onValueChange={setSelectedWAType}>
              <SelectTrigger className="h-8 flex-1 sm:w-48 rounded-lg border-none bg-white shadow-sm font-black text-[10px] uppercase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-2xl">
                <SelectItem value="Lead/Customer Profile" className="text-[10px] font-bold uppercase text-primary flex items-center gap-2">
                   <Target className="h-3 w-3 mr-2" /> Lead/Customer Profile
                </SelectItem>
                <Separator className="my-1" />
                {assetCategories.map((cat: string) => (
                  <SelectItem key={cat} value={cat} className="text-[10px] font-bold uppercase">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden p-8 sm:p-12 transition-all">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="space-y-3 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Message Header</Label>
                <Input 
                  defaultValue={currentWA.header} 
                  onBlur={(e) => updateWAConfig('header', e.target.value)} 
                  className="h-12 bg-white/5 border-white/10 text-accent font-black rounded-xl" 
                />
              </div>
              <div className="space-y-3 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Message Footer (CTA)</Label>
                <Textarea 
                  defaultValue={currentWA.footer} 
                  onBlur={(e) => updateWAConfig('footer', e.target.value)} 
                  className="min-h-[120px] bg-white/5 border-white/10 text-slate-300 rounded-2xl p-4 text-xs font-medium" 
                />
              </div>
            </div>

            <div className="space-y-8 text-left">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Smart Fields Toggle ({selectedWAType})</p>
                <Badge className="bg-accent text-primary border-none font-black text-[8px] h-4 uppercase">Direct Sync</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {getSmartFields(selectedWAType).map((field) => (
                  <div 
                    key={field.id} 
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border transition-all group cursor-pointer",
                      currentWA.toggles?.[field.id] ? "bg-white/10 border-accent/20 shadow-inner" : "bg-white/5 border-white/5 opacity-60"
                    )}
                    onClick={() => updateWAConfig(field.id, !currentWA.toggles?.[field.id], true)}
                  >
                    <Checkbox 
                      checked={currentWA.toggles?.[field.id]} 
                      className="border-white/20 data-[state=checked]:bg-accent data-[state=checked]:text-primary" 
                    />
                    <span className="text-[10px] font-black uppercase text-slate-300 group-hover:text-white truncate">{field.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function MasterCard({ title, icon: Icon, items, onAdd, onRemove, inputValue, onInputChange }: any) {
  return (
    <Card className="border-none shadow-md bg-white rounded-2xl border p-5 flex flex-col h-full hover:shadow-lg transition-all group text-left">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-primary" /> {title}
        </p>
        <Badge variant="secondary" className="h-4 text-[8px] bg-primary/5 text-primary border-none">{items?.length || 0}</Badge>
      </div>
      <div className="flex gap-2 mb-4">
        <Input 
          value={inputValue} 
          onChange={(e) => onInputChange(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && onAdd(inputValue)}
          placeholder="New..." 
          className="h-9 text-xs rounded-xl bg-muted/20 border-none shadow-inner" 
        />
        <Button size="icon" className="h-9 w-9 rounded-xl shadow-md shrink-0" onClick={() => onAdd(inputValue)}><Plus className="h-4 w-4" /></Button>
      </div>
      <ScrollArea className="flex-1 max-h-[150px]">
        <div className="flex flex-wrap gap-2 pr-2">
          {(items || []).map((t: string) => (
            <Badge key={t} variant="secondary" className="h-7 px-3 rounded-lg text-[9px] uppercase font-bold bg-slate-50 border-slate-100 gap-2 group/item">
              {t}
              <button onClick={() => onRemove(t)} className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover/item:opacity-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
