"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  LandPlot,
  Home,
  ShieldCheck,
  Save,
  Loader2,
  Briefcase,
  Scaling,
  Droplets,
  PlusSquare,
  ImageIcon,
  Upload,
  Calculator,
  Tag,
  X,
  Plus,
  Trees,
  Lock,
  Globe,
  Wheat,
  Video,
  ExternalLink,
  ArrowRightLeft,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/ui/editorial";
import { useRouter } from "next/navigation";
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  addDocumentNonBlocking,
  useCollection,
} from "@/firebase";
import {
  doc,
  collection,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";

const PRODUCT_OPTIONS = ["Khet", "Plot", "Building", "Farmhouse", "Chukta"];
const CLASSIFICATIONS = ["RESIDENTIAL", "COMMERCIAL", "OTHER"];

export default function NewPropertyEntryPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const teamQuery = useMemoFirebase(
    () =>
      businessId
        ? query(collection(firestore, "users"), where("businessId", "==", businessId))
        : null,
    [firestore, businessId]
  );
  const { data: teamMembersRaw = [] } = useCollection<any>(teamQuery);

  const teamMembers = useMemo(() => {
    if (!teamMembersRaw) return [];
    const allowedRoles = business?.propertyMemberRoles || [];
    if (allowedRoles.length === 0) return teamMembersRaw;
    return teamMembersRaw.filter((m: any) => {
      const role = (m.role || "").toLowerCase();
      return allowedRoles.some((ar: string) => ar.toLowerCase() === role);
    });
  }, [teamMembersRaw, business?.propertyMemberRoles]);

  const assetCategories: string[] =
    business?.assetCategories || PRODUCT_OPTIONS;
  const bhkConfigs: string[] = business?.bhkConfigs || [
    "1 BHK",
    "2 BHK",
    "3 BHK",
    "4 BHK",
  ];
  const facingDirections: string[] = business?.facingDirections || [
    "East",
    "West",
    "North",
    "South",
    "North-East",
    "North-West",
    "South-East",
    "South-West",
  ];
  const landTypes: string[] = business?.landTypes || [
    "Khet",
    "Khar",
    "Bharri",
    "FormHouse",
    "Factory",
  ];
  const soilTypes: string[] = business?.soilTypes || [
    "Bhura Mitti",
    "Kala Mitti",
    "Upjau",
    "Retili",
  ];
  const cropTypes: string[] = business?.cropTypes || [
    "Single Crop",
    "Double Crop",
    "Triple Crop",
    "Dalhan",
    "Tilhan",
  ];
  const socialCategories: string[] = business?.socialCategories || [
    "OBC",
    "General",
    "SC",
    "ST",
  ];
  const roadTypes: string[] = business?.roadTypes || [
    "Single Road",
    "Double Road",
    "Non-Road",
  ];
  const areaUnits: string[] = business?.areaUnits || [
    "sq.ft",
    "sq.yd",
    "Acre",
    "Guntha",
    "Bigha",
  ];

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<Record<string, any>>({
    title: "",
    agentName: "",
    agentSubName: "",
    visitorName: "",
    facing: "East",
    type: "Plot",
    propertyUse: "RESIDENTIAL",
    category: "General",
    marketRate: "",
    companyRate: "",
    marketPrice: "",
    companyPrice: "",
    images: [],
    videoUrl: "",
    mapUrl: "",
    description: "",
    district: "",
    village: "",
    size: "",
    roadType: "Single Road",
    front: "",
    depth: "",
    bor: "0",
    landType: "Khet",
    soilType: "Upjau",
    cropType: "Single Crop",
    area: "",
    areaUnit: "sq.ft",
    isDiverted: false,
    roadWidth: "",
    location: "",
    bhk: "2 BHK",
    constructionAge: "",
    hasElectricity: false,
  });

  const currencySymbol = getCurrencySymbol(business?.currency);

  useEffect(() => {
    const marketRateVal = parseFloat(formData.marketRate) || 0;
    const companyRateVal = parseFloat(formData.companyRate) || 0;

    if (formData.type === "Khet" || formData.type === "Farmhouse") {
      const sizeVal = parseFloat(formData.size) || 0;
      setFormData((prev) => ({
        ...prev,
        marketPrice: (marketRateVal * sizeVal).toString(),
        companyPrice: (companyRateVal * sizeVal).toString(),
      }));
    } else if (formData.type === "Plot") {
      const areaVal = parseFloat(formData.area) || 0;
      setFormData((prev) => ({
        ...prev,
        marketPrice: (marketRateVal * areaVal).toString(),
        companyPrice: (companyRateVal * areaVal).toString(),
      }));
    } else if (formData.type === "Building" || formData.type === "Chukta") {
      setFormData((prev) => ({
        ...prev,
        marketPrice: marketRateVal.toString(),
        companyPrice: companyRateVal.toString(),
      }));
    }
  }, [
    formData.type,
    formData.marketRate,
    formData.companyRate,
    formData.size,
    formData.area,
  ]);

  const priceDiff = useMemo(() => {
    const m = parseFloat(formData.marketPrice) || 0;
    const c = parseFloat(formData.companyPrice) || 0;
    return m - c;
  }, [formData.marketPrice, formData.companyPrice]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData((prev) => ({
            ...prev,
            images: [...(prev.images || []), reader.result as string],
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_: any, i: number) => i !== index),
    }));
  };

  const handleSave = () => {
    if (!businessId || !formData.title || !formData.marketPrice || !user?.uid) {
      toast({
        variant: "destructive",
        title: "Missing Info",
        description: "Property Name and Market Price are mandatory.",
      });
      return;
    }

    const selectedAgent = teamMembers.find((m) => m.name === formData.agentName);
    setIsSubmitting(true);

    addDocumentNonBlocking(
      collection(firestore, "businesses", businessId, "properties"),
      {
        ...formData,
        images: formData.images || [],
        businessId,
        assignedAgentId: selectedAgent?.id || user.uid,
        createdBy: user.uid,
        status: "available",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        propertyId: `PROP-${Math.floor(100000 + Math.random() * 900000)}`,
      }
    )
      .then(() => {
        toast({ title: "Property Registered" });
        router.push("/properties");
      })
      .catch((error) => {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not save property.",
        });
      })
      .finally(() => setIsSubmitting(false));
  };

  const renderSectionHeader = (
    Icon: any,
    title: string,
    sub?: string
  ) => (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );

  const isFixedMode =
    formData.type === "Building" || formData.type === "Chukta";

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20 text-left">
      <PageHeader
        breadcrumb="Real Estate CRM"
        title="Register Property"
        description="Add a new listing with pricing, dimensions, and documentation."
        backHref="/properties"
        actions={
          <Button
            onClick={handleSave}
            disabled={isSubmitting}
            className="h-9 rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
          >
            {isSubmitting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save Property
          </Button>
        }
      />

      <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <PlusSquare className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Property Details
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Core attribution, market vs company rates, and site media
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 p-6">
          <section>
            {renderSectionHeader(Briefcase, "1. General Information", "Core attribution and classification")}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="col-span-1 space-y-1.5 sm:col-span-2 lg:col-span-4">
                <Label className="text-xs font-semibold text-slate-700">
                  Property Title / Name *
                </Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g. Green Valley Farmhouse"
                  className="h-10 rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Responsible Agent
                </Label>
                <Select
                  value={formData.agentName}
                  onValueChange={(v) =>
                    setFormData({ ...formData, agentName: v })
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium">
                    <SelectValue placeholder="Pick Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((m: any) => (
                      <SelectItem key={m.id} value={m.name}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Sub Agent (Manual)
                </Label>
                <Input
                  value={formData.agentSubName}
                  onChange={(e) =>
                    setFormData({ ...formData, agentSubName: e.target.value })
                  }
                  placeholder="Sub Agent Name"
                  className="h-10 rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Visitor Name
                </Label>
                <Input
                  value={formData.visitorName}
                  onChange={(e) =>
                    setFormData({ ...formData, visitorName: e.target.value })
                  }
                  placeholder="Direct or Lead Name"
                  className="h-10 rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Facing Direction
                </Label>
                <Select
                  value={formData.facing}
                  onValueChange={(v) => setFormData({ ...formData, facing: v })}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(facingDirections || []).map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Property Type *
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(assetCategories || []).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Property Use
                </Label>
                <Select
                  value={formData.propertyUse}
                  onValueChange={(v) =>
                    setFormData({ ...formData, propertyUse: v })
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSIFICATIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Category
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    setFormData({ ...formData, category: v })
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(socialCategories || []).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <Separator />

          {/* Pricing & Dimensions */}
          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
            {renderSectionHeader(
              Calculator,
              "2. Pricing & Dimensions",
              "Market rate vs internal company valuation"
            )}
            <div className="space-y-6">
              <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
                {!isFixedMode ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      {formData.type === "Khet" || formData.type === "Farmhouse"
                        ? "Total Size *"
                        : "Total Area *"}
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Scaling className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="number"
                          value={
                            formData.type === "Khet" ||
                            formData.type === "Farmhouse"
                              ? formData.size
                              : formData.area
                          }
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              [formData.type === "Khet" ||
                              formData.type === "Farmhouse"
                                ? "size"
                                : "area"]: e.target.value,
                            })
                          }
                          className="h-11 rounded-xl border-slate-200 bg-white pl-9 font-mono text-sm font-semibold"
                        />
                      </div>
                      <div className="w-24">
                        <Select
                          value={formData.areaUnit}
                          onValueChange={(v) =>
                            setFormData({ ...formData, areaUnit: v })
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-xs font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {areaUnits.map((u: string) => (
                              <SelectItem key={u} value={u}>
                                {u}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="hidden md:block" />
                )}

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <Globe className="h-3.5 w-3.5" />{" "}
                    {formData.type === "Chukta"
                      ? "Fixed Market Rate"
                      : "Market Rate (Public)"}
                  </Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600 opacity-60" />
                    <Input
                      type="number"
                      value={formData.marketRate}
                      onChange={(e) =>
                        setFormData({ ...formData, marketRate: e.target.value })
                      }
                      className="h-11 rounded-xl border-slate-200 bg-white pl-9 font-mono text-sm font-semibold"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-emerald-700">
                    Calculated Market Price
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-emerald-400">
                      {currencySymbol}
                    </div>
                    <Input
                      type="number"
                      value={formData.marketPrice}
                      readOnly={!isFixedMode}
                      onChange={(e) =>
                        isFixedMode &&
                        setFormData({
                          ...formData,
                          marketPrice: e.target.value,
                        })
                      }
                      className="h-11 rounded-xl border-slate-800 bg-slate-900 pl-8 pr-16 font-mono text-base font-bold text-emerald-400"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <Badge className="border-none bg-emerald-600 text-[11px] font-semibold text-white">
                        AUTO
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 items-end gap-4 border-t border-dashed border-slate-200 pt-4 md:grid-cols-3">
                <div className="hidden md:block" />
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Lock className="h-3.5 w-3.5" />{" "}
                    {formData.type === "Chukta"
                      ? "Fixed Company Rate"
                      : "Company Rate (Internal)"}
                  </Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="number"
                      value={formData.companyRate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          companyRate: e.target.value,
                        })
                      }
                      className="h-11 rounded-xl border-slate-200 bg-white pl-9 font-mono text-sm font-semibold"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Calculated Company Price
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-slate-700">
                      {currencySymbol}
                    </div>
                    <Input
                      type="number"
                      value={formData.companyPrice}
                      readOnly={!isFixedMode}
                      onChange={(e) =>
                        isFixedMode &&
                        setFormData({
                          ...formData,
                          companyPrice: e.target.value,
                        })
                      }
                      className="h-11 rounded-xl border-slate-200 bg-white pl-8 pr-16 font-mono text-base font-bold text-slate-900"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <Badge
                        variant="secondary"
                        className="text-[11px] font-semibold"
                      >
                        AUTO
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {parseFloat(formData.marketPrice) > 0 &&
                parseFloat(formData.companyPrice) > 0 && (
                  <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
                        <ArrowRightLeft className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          Price Margin (Antar)
                        </p>
                        <p className="text-xs text-slate-500">
                          Calculated internal spread
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "font-mono text-xl font-bold tabular-nums",
                          priceDiff >= 0 ? "text-emerald-700" : "text-red-600"
                        )}
                      >
                        {priceDiff >= 0 ? "+" : ""}
                        {currencySymbol}
                        {priceDiff.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
            </div>
          </section>

          {/* Technical Specs Sections */}
          {(formData.type === "Khet" || formData.type === "Farmhouse") && (
            <section
              className={cn(
                "rounded-xl border p-5",
                formData.type === "Khet"
                  ? "border-emerald-200 bg-emerald-50/50"
                  : "border-amber-200 bg-amber-50/50"
              )}
            >
              {renderSectionHeader(
                formData.type === "Khet" ? Droplets : Trees,
                `${formData.type} Specifications`
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    District
                  </Label>
                  <Input
                    value={formData.district}
                    onChange={(e) =>
                      setFormData({ ...formData, district: e.target.value })
                    }
                    className="h-10 rounded-xl bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Village / Location
                  </Label>
                  <Input
                    value={formData.village || formData.location}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        village: e.target.value,
                        location: e.target.value,
                      })
                    }
                    className="h-10 rounded-xl bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Road Access
                  </Label>
                  <Select
                    value={formData.roadType}
                    onValueChange={(v) =>
                      setFormData({ ...formData, roadType: v })
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roadTypes.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Front (Ft)
                  </Label>
                  <Input
                    value={formData.front}
                    onChange={(e) =>
                      setFormData({ ...formData, front: e.target.value })
                    }
                    className="h-10 rounded-xl bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Borewell Count
                  </Label>
                  <Input
                    type="number"
                    value={formData.bor}
                    onChange={(e) =>
                      setFormData({ ...formData, bor: e.target.value })
                    }
                    className="h-10 rounded-xl bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Land Type
                  </Label>
                  <Select
                    value={formData.landType}
                    onValueChange={(v) =>
                      setFormData({ ...formData, landType: v })
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {landTypes.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Soil Type
                  </Label>
                  <Select
                    value={formData.soilType}
                    onValueChange={(v) =>
                      setFormData({ ...formData, soilType: v })
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {soilTypes.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-xs font-medium text-slate-700">
                    <Wheat className="h-3.5 w-3.5" /> Crop Type
                  </Label>
                  <Select
                    value={formData.cropType}
                    onValueChange={(v) =>
                      setFormData({ ...formData, cropType: v })
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cropTypes.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.type === "Farmhouse" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-700">
                        BHK (If Structure)
                      </Label>
                      <Select
                        value={formData.bhk}
                        onValueChange={(v) =>
                          setFormData({ ...formData, bhk: v })
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-white text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {bhkConfigs.map((b) => (
                            <SelectItem key={b} value={b}>
                              {b}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-white p-3">
                      <Label className="text-xs font-semibold text-amber-900">
                        Electricity Available
                      </Label>
                      <Switch
                        aria-label="Toggle electricity available"
                        checked={formData.hasElectricity}
                        onCheckedChange={(v) =>
                          setFormData({ ...formData, hasElectricity: v })
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {formData.type === "Plot" && (
            <section className="rounded-xl border border-blue-200 bg-blue-50/50 p-5">
              {renderSectionHeader(LandPlot, "Plot Specifications")}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-white px-4 py-3">
                  <Label className="text-xs font-semibold text-slate-900">
                    Is Diverted?
                  </Label>
                  <Switch
                    aria-label="Toggle plot diverted status"
                    checked={formData.isDiverted}
                    onCheckedChange={(v) =>
                      setFormData({ ...formData, isDiverted: v })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Road Width (ft)
                  </Label>
                  <Input
                    value={formData.roadWidth}
                    onChange={(e) =>
                      setFormData({ ...formData, roadWidth: e.target.value })
                    }
                    className="h-10 rounded-xl bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Road Type
                  </Label>
                  <Select
                    value={formData.roadType}
                    onValueChange={(v) =>
                      setFormData({ ...formData, roadType: v })
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roadTypes.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Front (Ft)
                  </Label>
                  <Input
                    value={formData.front}
                    onChange={(e) =>
                      setFormData({ ...formData, front: e.target.value })
                    }
                    className="h-10 rounded-xl bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Depth (Ft)
                  </Label>
                  <Input
                    value={formData.depth}
                    onChange={(e) =>
                      setFormData({ ...formData, depth: e.target.value })
                    }
                    className="h-10 rounded-xl bg-white"
                  />
                </div>
              </div>
            </section>
          )}

          {formData.type === "Building" && (
            <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
              {renderSectionHeader(Home, "Building Specifications")}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Exact Location
                  </Label>
                  <Input
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="h-10 rounded-xl bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    BHK Configuration
                  </Label>
                  <Select
                    value={formData.bhk}
                    onValueChange={(v) => setFormData({ ...formData, bhk: v })}
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {bhkConfigs.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Construction Age
                  </Label>
                  <Input
                    value={formData.constructionAge}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        constructionAge: e.target.value,
                      })
                    }
                    className="h-10 rounded-xl bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Road Width (ft)
                  </Label>
                  <Input
                    value={formData.roadWidth}
                    onChange={(e) =>
                      setFormData({ ...formData, roadWidth: e.target.value })
                    }
                    className="h-10 rounded-xl bg-white"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Media Assets */}
          <section className="space-y-6">
            {renderSectionHeader(
              ImageIcon,
              "3. Media Assets & External Links",
              "Photos, video walk-throughs, and map coordinates"
            )}

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">
                Photo Documentation
              </Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                {formData.images?.map((img: string, i: number) => (
                  <div
                    key={i}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200"
                  >
                    <img
                      src={img}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                      alt={`Property photo ${i + 1}`}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      aria-label={`Remove photo ${i + 1}`}
                      onClick={() => removeImage(i)}
                      className="absolute right-1.5 top-1.5 h-6 w-6 rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-slate-400 hover:bg-slate-100"
                >
                  <Plus className="h-5 w-5 text-slate-600" />
                  <span className="text-xs font-medium text-slate-600">
                    Add Photo
                  </span>
                </button>
              </div>
              <input
                type="file"
                ref={imageInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Video className="h-3.5 w-3.5 text-slate-500" /> Video Link
                  (YouTube/Drive)
                </Label>
                <Input
                  value={formData.videoUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, videoUrl: e.target.value })
                  }
                  placeholder="Paste URL here..."
                  className="h-10 rounded-xl border-slate-200 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <ExternalLink className="h-3.5 w-3.5 text-slate-500" /> Google
                  Maps Link
                </Label>
                <Input
                  value={formData.mapUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, mapUrl: e.target.value })
                  }
                  placeholder="Paste Google Maps URL here..."
                  className="h-10 rounded-xl border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Registry Remarks
              </Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Special features, legal status, or site access notes..."
                className="min-h-[96px] rounded-xl border-slate-200 p-3 text-sm"
              />
            </div>
          </section>
        </CardContent>

        <CardFooter className="flex justify-end border-t border-slate-100 bg-slate-50/70 p-6">
          <Button
            onClick={handleSave}
            disabled={isSubmitting}
            className="h-11 rounded-xl bg-slate-900 px-8 text-xs font-semibold text-white hover:bg-slate-800"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Register Property
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
