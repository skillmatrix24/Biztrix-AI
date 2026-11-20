"use client";

import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import {
  Plus,
  X,
  Layers,
  SmartphoneNfc,
  Zap,
  Building2,
  Navigation,
  Droplets,
  Home,
  Users,
  Scale,
  Wallet,
  NotebookPen,
  Route,
  CheckCircle2,
  Trees,
  ShieldCheck,
  Wheat,
  Target,
  IdCard,
  Hash,
  Users2,
  Calendar,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionCard } from "@/components/ui/editorial";
import {
  updateDocumentNonBlocking,
  useMemoFirebase,
  useCollection,
  useFirestore,
  useUser,
} from "@/firebase";
import { collection } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { createMerchantProduct } from "@/app/actions/product-actions";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Chandigarh",
];

interface MasterDataTabProps {
  business: any;
  businessRef: any;
  isAdmin: boolean;
  isTrialExpired: boolean;
}

export function MasterDataTab({
  business,
  businessRef,
  isAdmin,
}: MasterDataTabProps) {
  const firestore = useFirestore();
  const businessId = business?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessRef) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const data = results.data as any[];
        const items = data
          .map((row) => row.name || row.particular)
          .filter(Boolean);

        const current = business?.commonParticulars || [];
        updateDocumentNonBlocking(businessRef, {
          commonParticulars: [...new Set([...current, ...items])],
        });

        toast({
          title: "Import Successful",
          description: `Added ${items.length} items.`,
        });
      },
    });
  };

  const downloadSampleCSV = () => {
    const csvContent =
      "name\nTea & Snacks\nStationery Purchase\nOffice Cleaning";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "particulars_sample.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const { user } = useUser();
  const [isPromoteOpen, setIsPromoteOpen] = useState(false);
  const [promoteItem, setPromoteItem] = useState<string | null>(null);
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductStock, setNewProductStock] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("General");
  const [newCustType, setNewCustType] = useState("");
  const [newCashType, setNewCashType] = useState("");
  const [newCashTypeImpact, setNewCashTypeImpact] = useState("none");
  const [newCashTypeColor, setNewCashTypeColor] = useState(
    JSON.stringify({
      name: "Indigo",
      badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
      dot: "bg-indigo-500",
      border: "border-l-indigo-500",
    })
  );
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

  const [localPrefix, setLocalPrefix] = useState("");
  const [localYear, setLocalYear] = useState("");
  const [localSeq, setLocalSeq] = useState("");

  const [selectedWAType, setSelectedWAType] = useState(
    "Lead/Customer Profile"
  );

  useEffect(() => {
    if (business?.cardConfig) {
      setLocalPrefix(business.cardConfig.prefix || "BIZ");
      setLocalYear(
        business.cardConfig.year?.toString() ||
          new Date().getFullYear().toString()
      );
      setLocalSeq(business.cardConfig.nextSequence?.toString() || "1001");
    }
  }, [business?.cardConfig]);

  const handleAddValue = (
    field: string,
    currentValues: string[],
    newValue: string,
    setter: (v: string) => void
  ) => {
    if (!newValue.trim() || !businessRef) return;
    const cleanValue = newValue.trim();
    const existing = currentValues || [];
    if (existing.includes(cleanValue)) {
      toast({
        variant: "destructive",
        title: "Duplicate",
        description: "Value already exists.",
      });
      return;
    }
    updateDocumentNonBlocking(businessRef, {
      [field]: [...existing, cleanValue],
    });
    setter("");
    toast({ title: "Updated" });
  };

  const removeValue = (
    field: string,
    currentValues: string[],
    value: string
  ) => {
    if (!businessRef || !isAdmin) return;
    const filtered = (currentValues || []).filter((v: string) => v !== value);
    updateDocumentNonBlocking(businessRef, { [field]: filtered });
    toast({ title: "Removed" });
  };

  const updateCardConfig = (key: string, value: any) => {
    if (!businessRef || !isAdmin) return;
    const currentConfig = business?.cardConfig || {
      prefix: "BIZ",
      format: "PREFIX-TIER-YEAR-SEQ",
      nextSequence: 1001,
      year: new Date().getFullYear(),
    };
    updateDocumentNonBlocking(businessRef, {
      cardConfig: { ...currentConfig, [key]: value },
    });
    toast({ title: "Card Config Updated" });
  };

  const updateWAConfig = (key: string, value: any, isToggle = false) => {
    if (!businessRef || !isAdmin) return;
    const allConfigs = business?.waMarketingConfigs || {};
    const currentTypeConfig = allConfigs[selectedWAType] || {
      header:
        selectedWAType === "Lead/Customer Profile"
          ? `📋 *New Lead Enquiry Details*`
          : `🚀 *New ${selectedWAType} Alert!*`,
      footer: "Contact us for more details.",
      toggles: {
        includePrice: true,
        includeId: true,
        includeAgent: true,
        includeType: true,
      },
    };

    const updatedTypeConfig = { ...currentTypeConfig };
    if (isToggle) {
      updatedTypeConfig.toggles = {
        ...(updatedTypeConfig.toggles || {}),
        [key]: value,
      };
    } else {
      updatedTypeConfig[key] = value;
    }

    updateDocumentNonBlocking(businessRef, {
      waMarketingConfigs: {
        ...allConfigs,
        [selectedWAType]: updatedTypeConfig,
      },
    });
  };

  const customerTypes = business?.customerTypes || [
    "Regular",
    "VIP",
    "Wholesale",
    "Risky",
  ];
  const cashbookTypes = business?.cashbookTypes || ["Credit", "Debit"];
  const baseUnits = business?.baseUnits || [
    "pcs",
    "kg",
    "box",
    "packet",
    "unit",
    "litre",
    "meter",
  ];
  const cashbookCategories = business?.cashbookCategories || [
    "Sales",
    "Expense",
    "Rent",
    "Salary",
    "Purchase",
    "Utility",
    "Other",
  ];
  const productsQuery = useMemoFirebase(
    () =>
      businessId ? collection(firestore, "businesses", businessId, "products") : null,
    [firestore, businessId]
  );
  const { data: products } = useCollection<any>(productsQuery);
  const inventoryProductNames = (products || []).map((p: any) => p.name);

  const dynamicCommonParticulars = [
    ...(business?.commonParticulars || [
      "Tea & Snacks",
      "Conveyance",
      "Office Cleaning",
      "Stationery Purchase",
    ]),
    ...inventoryProductNames,
  ];

  const commonParticulars = dynamicCommonParticulars;

  const assetCategories = business?.assetCategories || [
    "Khet",
    "Plot",
    "Building",
    "Farmhouse",
    "Chukta",
  ];
  const bhkConfigs = business?.bhkConfigs || [
    "1 BHK",
    "2 BHK",
    "3 BHK",
    "4 BHK",
  ];
  const facingDirections = business?.facingDirections || [
    "East",
    "West",
    "North",
    "South",
    "North-East",
    "North-West",
    "South-East",
    "South-West",
  ];
  const landTypes = business?.landTypes || [
    "Khet",
    "Khar",
    "Bharri",
    "FormHouse",
    "Factory",
  ];
  const soilTypes = business?.soilTypes || [
    "Bhura Mitti",
    "Kala Mitti",
    "Upjau",
    "Retili",
  ];
  const cropTypes = business?.cropTypes || [
    "Single Crop",
    "Double Crop",
    "Triple Crop",
    "Dalhan",
    "Tilhan",
  ];
  const areaUnits = business?.areaUnits || [
    "sq.ft",
    "sq.yd",
    "Acre",
    "Guntha",
    "Bigha",
  ];
  const socialCategories = business?.socialCategories || [
    "OBC",
    "General",
    "SC",
    "ST",
  ];
  const roadTypes = business?.roadTypes || [
    "Single Road",
    "Double Road",
    "Non-Road",
  ];

  const staffRoles = business?.staffRoles || [
    "Admin",
    "Manager",
    "Staff",
    "Agent",
    "Accountant",
  ];

  const currentWA = business?.waMarketingConfigs?.[selectedWAType] || {
    header:
      selectedWAType === "Lead/Customer Profile"
        ? `📋 *New Lead Enquiry Details*`
        : `🚀 *New ${selectedWAType} Alert!*`,
    footer: "Contact us for more details.",
    toggles: {
      includePrice: true,
      includeId: true,
      includeAgent: true,
      includeType: true,
    },
  };

  const getSmartFields = (type: string) => {
    if (type === "Lead/Customer Profile") {
      return [
        { id: "includeName", label: "Customer Name" },
        { id: "includePhone", label: "Mobile Number" },
        { id: "includeSource", label: "Lead Source" },
        { id: "includeInterest", label: "Property Interest" },
        { id: "includeBudget", label: "Budget Range" },
        { id: "includeLocation", label: "Preferred Location" },
        { id: "includeAgent", label: "Assigned Agent" },
        { id: "includeNotes", label: "Enquiry Notes" },
        { id: "includeStatus", label: "Current Stage" },
      ];
    }
    const common = [
      { id: "includeId", label: "Asset ID" },
      { id: "includeType", label: "Asset Type" },
      { id: "includePrice", label: "Market Price (Public)" },
      { id: "includeFacing", label: "Facing Direction" },
      { id: "includeAgent", label: "Assigned Agent" },
      { id: "includeDescription", label: "Public Description" },
    ];
    if (type === "Khet" || type === "Farmhouse") {
      return [
        ...common,
        { id: "includeSize", label: "Total Size" },
        { id: "includeRate", label: "Rate per Unit" },
      ];
    }
    if (type === "Plot") {
      return [
        ...common,
        { id: "includeArea", label: "Total Area" },
        { id: "includeRate", label: "Rate per SqFt" },
      ];
    }
    return common;
  };

  const handlePromote = async () => {
    if (!businessId || !user || !promoteItem) return;
    const idToken = await user.getIdToken(true);
    const res = await createMerchantProduct({
      userId: user.uid,
      businessId,
      idToken,
      name: promoteItem,
      price: parseFloat(newProductPrice),
      stock: parseInt(newProductStock || "0"),
      category: newProductCategory,
      unit: "pcs",
    });
    if (res.success) {
      const filtered = commonParticulars.filter((p: string) => p !== promoteItem);
      updateDocumentNonBlocking(businessRef, { commonParticulars: filtered });
      setIsPromoteOpen(false);
      setPromoteItem(null);
      setNewProductCategory("General");
      toast({
        title: "Product Created",
        description: "Item promoted to inventory.",
      });
    } else {
      toast({ variant: "destructive", title: "Error", description: res.error });
    }
  };

  return (
    <div className="space-y-8 pb-16 text-left">
      <Dialog open={isPromoteOpen} onOpenChange={setIsPromoteOpen}>
        <DialogContent className="rounded-2xl border-slate-200 p-0 overflow-hidden text-left">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <DialogTitle className="text-lg font-bold text-white">
              Promote &ldquo;{promoteItem}&rdquo; to Inventory
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs mt-0.5">
              Set initial pricing and stock for this catalog product.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="promote-price" className="text-xs font-semibold text-slate-700">
                Sale Price
              </Label>
              <Input
                id="promote-price"
                type="number"
                placeholder="0.00"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
                className="h-10 rounded-xl font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promote-stock" className="text-xs font-semibold text-slate-700">
                Opening Stock
              </Label>
              <Input
                id="promote-stock"
                type="number"
                placeholder="0"
                value={newProductStock}
                onChange={(e) => setNewProductStock(e.target.value)}
                className="h-10 rounded-xl font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Category
              </Label>
              <Select
                value={newProductCategory}
                onValueChange={setNewProductCategory}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {cashbookCategories.map((c: string) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200 flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPromoteOpen(false)}
              className="flex-1 h-10 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handlePromote}
              className="flex-1 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              Promote to Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SectionCard
        title="Bulk Master Data Import"
        description="Upload a CSV with a 'name' or 'particular' column to seed common daily-entry descriptions."
        headerRight={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={downloadSampleCSV}
              variant="outline"
              className="h-9 rounded-xl text-xs font-semibold border-slate-200"
            >
              Download Sample CSV
            </Button>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white"
            >
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              Import Particulars
            </Button>
          </div>
        }
      >
        <p className="text-xs text-slate-500">
          Imported items merge automatically with your existing list without overwriting existing inventory names.
        </p>
      </SectionCard>

      <SectionCard
        title="Membership Card ID Format"
        description="Customize prefix, lifecycle year, and sequential counter for loyalty & member cards."
        headerRight={<IdCard className="h-4 w-4 text-slate-400" />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="card-prefix" className="text-xs font-semibold text-slate-700">
                Card Prefix
              </Label>
              <Input
                id="card-prefix"
                value={localPrefix}
                onChange={(e) =>
                  setLocalPrefix(e.target.value.toUpperCase().replace(/\s+/g, ""))
                }
                onBlur={(e) =>
                  updateCardConfig(
                    "prefix",
                    e.target.value.toUpperCase().replace(/\s+/g, "")
                  )
                }
                placeholder="BIZ"
                className="h-11 rounded-xl font-mono font-semibold text-sm bg-white border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-year" className="text-xs font-semibold text-slate-700">
                Registration Year
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="card-year"
                  type="number"
                  value={localYear}
                  onChange={(e) => setLocalYear(e.target.value)}
                  onBlur={(e) =>
                    updateCardConfig("year", parseInt(e.target.value))
                  }
                  className="h-11 pl-10 rounded-xl font-mono tabular-nums text-sm bg-white border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-seq" className="text-xs font-semibold text-slate-700">
                Next Serial No.
              </Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="card-seq"
                  type="number"
                  value={localSeq}
                  onChange={(e) => setLocalSeq(e.target.value)}
                  onBlur={(e) =>
                    updateCardConfig("nextSequence", parseInt(e.target.value))
                  }
                  className="h-11 pl-10 rounded-xl font-mono tabular-nums text-sm bg-white border-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Preview Format</span>
            </div>
            <p className="text-base font-mono font-bold text-slate-900 break-all">
              {localPrefix || "BIZ"}-[TIER]-{localYear || "2026"}-{localSeq || "1001"}
            </p>
            <p className="text-xs text-slate-500">
              [TIER] updates dynamically per membership level.
            </p>
          </div>
        </div>
      </SectionCard>

      <Separator className="bg-slate-200" />

      {/* Core Business Masters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-slate-700" />
            <h3 className="text-base font-bold text-slate-900">
              Core Business Masters
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">
              Default State:
            </span>
            <Select
              value={business?.defaultState || business?.state || "Maharashtra"}
              onValueChange={(v) =>
                updateDocumentNonBlocking(businessRef, { defaultState: v })
              }
            >
              <SelectTrigger className="h-9 w-44 rounded-xl bg-white border-slate-200 text-xs font-medium">
                <MapPin className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-60">
                {INDIAN_STATES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MasterCard
            title="Customer Types"
            icon={Users}
            items={customerTypes}
            onAdd={(v: string) =>
              handleAddValue("customerTypes", customerTypes, v, setNewCustType)
            }
            onRemove={(v: string) =>
              removeValue("customerTypes", customerTypes, v)
            }
            inputValue={newCustType}
            onInputChange={setNewCustType}
          />
          <MasterCard
            title="Cashbook Types"
            icon={Wallet}
            items={cashbookTypes}
            isComplex={true}
            onAdd={(v: { name: string; impact: string }) => {
              if (!businessRef) return;
              const existing = business?.cashbookTypes || [];
              updateDocumentNonBlocking(businessRef, {
                cashbookTypes: [...existing, v],
              });
              toast({ title: "Updated" });
            }}
            onRemove={(val: { name: string; impact: string }) => {
              if (!businessRef || !isAdmin) return;
              const filtered = (business?.cashbookTypes || []).filter(
                (v: any) => v.name !== val.name
              );
              updateDocumentNonBlocking(businessRef, {
                cashbookTypes: filtered,
              });
              toast({ title: "Removed" });
            }}
            inputValue={newCashType}
            onInputChange={setNewCashType}
            impactValue={newCashTypeImpact}
            onImpactChange={setNewCashTypeImpact}
            colorValue={newCashTypeColor}
            onColorChange={setNewCashTypeColor}
          />
          <MasterCard
            title="Base Units"
            icon={Scale}
            items={baseUnits}
            onAdd={(v: string) =>
              handleAddValue("baseUnits", baseUnits, v, setNewUnitType)
            }
            onRemove={(v: string) => removeValue("baseUnits", baseUnits, v)}
            inputValue={newUnitType}
            onInputChange={setNewUnitType}
          />
          <MasterCard
            title="Cashbook Categories"
            icon={Wallet}
            items={cashbookCategories}
            onAdd={(v: string) =>
              handleAddValue(
                "cashbookCategories",
                cashbookCategories,
                v,
                setNewCashCategory
              )
            }
            onRemove={(v: string) =>
              removeValue("cashbookCategories", cashbookCategories, v)
            }
            inputValue={newCashCategory}
            onInputChange={setNewCashCategory}
          />
          <MasterCard
            title="Common Particulars"
            icon={NotebookPen}
            items={commonParticulars}
            onAdd={(v: string) =>
              handleAddValue(
                "commonParticulars",
                commonParticulars,
                v,
                setNewParticular
              )
            }
            onRemove={(v: string) =>
              removeValue("commonParticulars", commonParticulars, v)
            }
            onPromote={(item: string) => {
              setPromoteItem(item);
              setIsPromoteOpen(true);
            }}
            inputValue={newParticular}
            onInputChange={setNewParticular}
            helperNote="Click ⚡ to convert into an inventory product"
          />
          <MasterCard
            title="Staff Roles"
            icon={Users2}
            items={staffRoles}
            onAdd={(v: string) =>
              handleAddValue("staffRoles", staffRoles, v, setNewStaffRole)
            }
            onRemove={(v: string) => removeValue("staffRoles", staffRoles, v)}
            inputValue={newStaffRole}
            onInputChange={setNewStaffRole}
          />
        </div>
      </div>

      {/* Real Estate Registry Masters */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-700" />
          <h3 className="text-base font-bold text-slate-900">
            Property Registry Masters
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MasterCard
            title="Asset Categories"
            icon={Building2}
            items={assetCategories}
            onAdd={(v: string) =>
              handleAddValue(
                "assetCategories",
                assetCategories,
                v,
                setNewAssetType
              )
            }
            onRemove={(v: string) =>
              removeValue("assetCategories", assetCategories, v)
            }
            inputValue={newAssetType}
            onInputChange={setNewAssetType}
          />
          <MasterCard
            title="BHK Configs"
            icon={Home}
            items={bhkConfigs}
            onAdd={(v: string) =>
              handleAddValue("bhkConfigs", bhkConfigs, v, setNewBhk)
            }
            onRemove={(v: string) => removeValue("bhkConfigs", bhkConfigs, v)}
            inputValue={newBhk}
            onInputChange={setNewBhk}
          />
          <MasterCard
            title="Facing Directions"
            icon={Navigation}
            items={facingDirections}
            onAdd={(v: string) =>
              handleAddValue(
                "facingDirections",
                facingDirections,
                v,
                setNewFacing
              )
            }
            onRemove={(v: string) =>
              removeValue("facingDirections", facingDirections, v)
            }
            inputValue={newFacing}
            onInputChange={setNewFacing}
          />
          <MasterCard
            title="Land Types"
            icon={Trees}
            items={landTypes}
            onAdd={(v: string) =>
              handleAddValue("landTypes", landTypes, v, setNewLandType)
            }
            onRemove={(v: string) => removeValue("landTypes", landTypes, v)}
            inputValue={newLandType}
            onInputChange={setNewLandType}
          />
          <MasterCard
            title="Soil Types"
            icon={Droplets}
            items={soilTypes}
            onAdd={(v: string) =>
              handleAddValue("soilTypes", soilTypes, v, setNewSoilType)
            }
            onRemove={(v: string) => removeValue("soilTypes", soilTypes, v)}
            inputValue={newSoilType}
            onInputChange={setNewSoilType}
          />
          <MasterCard
            title="Crop Types"
            icon={Wheat}
            items={cropTypes}
            onAdd={(v: string) =>
              handleAddValue("cropTypes", cropTypes, v, setNewCropType)
            }
            onRemove={(v: string) => removeValue("cropTypes", cropTypes, v)}
            inputValue={newCropType}
            onInputChange={setNewCropType}
          />
          <MasterCard
            title="Area Units"
            icon={Scale}
            items={areaUnits}
            onAdd={(v: string) =>
              handleAddValue("areaUnits", areaUnits, v, setNewAreaUnit)
            }
            onRemove={(v: string) => removeValue("areaUnits", areaUnits, v)}
            inputValue={newAreaUnit}
            onInputChange={setNewAreaUnit}
          />
          <MasterCard
            title="Social Categories"
            icon={Users}
            items={socialCategories}
            onAdd={(v: string) =>
              handleAddValue(
                "socialCategories",
                socialCategories,
                v,
                setNewSocialCat
              )
            }
            onRemove={(v: string) =>
              removeValue("socialCategories", socialCategories, v)
            }
            inputValue={newSocialCat}
            onInputChange={setNewSocialCat}
          />
          <MasterCard
            title="Road Types"
            icon={Route}
            items={roadTypes}
            onAdd={(v: string) =>
              handleAddValue("roadTypes", roadTypes, v, setNewRoadType)
            }
            onRemove={(v: string) => removeValue("roadTypes", roadTypes, v)}
            inputValue={newRoadType}
            onInputChange={setNewRoadType}
          />
        </div>
      </div>

      {/* WhatsApp Strategy by Type */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SmartphoneNfc className="h-4 w-4 text-slate-700" />
            <h3 className="text-base font-bold text-slate-900">
              WhatsApp Sharing Templates
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">
              Template For:
            </span>
            <Select value={selectedWAType} onValueChange={setSelectedWAType}>
              <SelectTrigger className="h-9 w-52 rounded-xl bg-white border-slate-200 text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="Lead/Customer Profile" className="text-xs font-medium">
                  Lead / Customer Profile
                </SelectItem>
                <Separator className="my-1" />
                {assetCategories.map((cat: string) => (
                  <SelectItem key={cat} value={cat} className="text-xs">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900 text-white p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="wa-header" className="text-xs font-semibold text-slate-300">
                  Message Header
                </Label>
                <Input
                  id="wa-header"
                  defaultValue={currentWA.header}
                  onBlur={(e) => updateWAConfig("header", e.target.value)}
                  className="h-11 bg-white/10 border-white/15 text-white rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wa-footer" className="text-xs font-semibold text-slate-300">
                  Message Footer (CTA)
                </Label>
                <Textarea
                  id="wa-footer"
                  defaultValue={currentWA.footer}
                  onBlur={(e) => updateWAConfig("footer", e.target.value)}
                  className="min-h-[112px] bg-white/10 border-white/15 text-slate-100 rounded-xl p-3 text-xs"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-300">
                  Included Fields ({selectedWAType})
                </p>
                <span className="text-xs text-emerald-300 font-medium">
                  Auto-saved
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {getSmartFields(selectedWAType).map((field) => {
                  const active = !!currentWA.toggles?.[field.id];
                  return (
                    <div
                      key={field.id}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          updateWAConfig(field.id, !active, true);
                        }
                      }}
                      onClick={() =>
                        updateWAConfig(field.id, !active, true)
                      }
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer",
                        active
                          ? "bg-white/10 border-white/25 text-white"
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200"
                      )}
                    >
                      <Checkbox
                        checked={active}
                        onCheckedChange={(val) => updateWAConfig(field.id, !!val, true)}
                        className="border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-slate-900 pointer-events-none"
                      />
                      <span className="text-xs font-medium truncate">
                        {field.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MasterCard({
  title,
  icon: Icon,
  items,
  onAdd,
  onRemove,
  inputValue,
  onInputChange,
  isComplex,
  impactValue,
  onImpactChange,
  colorValue,
  onColorChange,
  onPromote,
  helperNote,
}: any) {
  const colorOptions = [
    {
      name: "Indigo",
      badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
      dot: "bg-indigo-500",
      border: "border-l-indigo-500",
    },
    {
      name: "Rose",
      badge: "bg-rose-50 text-rose-700 border-rose-200",
      dot: "bg-rose-500",
      border: "border-l-rose-500",
    },
    {
      name: "Emerald",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
      border: "border-l-emerald-500",
    },
    {
      name: "Amber",
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
      border: "border-l-amber-500",
    },
    {
      name: "Violet",
      badge: "bg-violet-50 text-violet-700 border-violet-200",
      dot: "bg-violet-500",
      border: "border-l-violet-500",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col h-full text-left space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-slate-500" /> {title}
        </p>
        <span className="text-xs font-mono tabular-nums text-slate-500">
          {items?.length || 0}
        </span>
      </div>

      {helperNote && <p className="text-xs text-slate-500">{helperNote}</p>}

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              onAdd(
                isComplex
                  ? { name: inputValue, impact: impactValue, color: colorValue }
                  : inputValue
              )
            }
            placeholder="Add new..."
            className="h-9 text-xs rounded-lg bg-white border-slate-200"
          />
          <Button
            type="button"
            size="icon"
            aria-label={`Add to ${title}`}
            className="h-9 w-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white shrink-0"
            onClick={() =>
              onAdd(
                isComplex
                  ? { name: inputValue, impact: impactValue, color: colorValue }
                  : inputValue
              )
            }
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {isComplex && (
          <div className="grid grid-cols-2 gap-2">
            <Select value={impactValue} onValueChange={onImpactChange}>
              <SelectTrigger className="h-9 text-xs rounded-lg bg-white border-slate-200">
                <SelectValue placeholder="Impact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="increase">Increase (In)</SelectItem>
                <SelectItem value="decrease">Decrease (Out)</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
            <Select value={colorValue} onValueChange={onColorChange}>
              <SelectTrigger className="h-9 text-xs rounded-lg bg-white border-slate-200">
                <SelectValue placeholder="Color" />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((c) => (
                  <SelectItem key={c.name} value={JSON.stringify(c)}>
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2.5 h-2.5 rounded-full", c.dot)} />
                      {c.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 max-h-[150px]">
        <div className="flex flex-wrap gap-1.5 pr-2">
          {(items || []).map((t: any, idx: number) => {
            const item = typeof t === "string" ? { name: t, impact: "none" } : t;
            return (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800"
              >
                <span>
                  {item.name}
                  {isComplex && (
                    <span className="text-slate-500 ml-1">({item.impact})</span>
                  )}
                </span>
                {onPromote && !isComplex && (
                  <button
                    type="button"
                    aria-label={`Promote ${item.name} to product`}
                    onClick={() => onPromote(item.name)}
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    <Zap className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => onRemove(t)}
                  className="text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
