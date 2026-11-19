"use client";

import { Suspense, useRef, useState, useMemo, useEffect } from "react";
import {
  UserPlus,
  Users,
  Save,
  Loader2,
  Briefcase,
  Zap,
  MapPin,
  Home,
  Trees,
  LandPlot,
  Wheat,
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
import { useRouter, useSearchParams } from "next/navigation";
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
  getDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { getCurrencySymbol } from "@/lib/utils";

const PRODUCT_OPTIONS = ["Khet", "Plot", "Building", "Farmhouse", "Chukta"];
const CLASSIFICATIONS = ["RESIDENTIAL", "COMMERCIAL"];

function NewCustomerEntryContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const incomingLeadId = searchParams.get("leadId");
  const hydratedLeadIdRef = useRef<string | null>(null);

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
    return teamMembersRaw.filter((m: any) => allowedRoles.includes(m.role));
  }, [teamMembersRaw, business?.propertyMemberRoles]);

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
  const areaUnits: string[] = business?.areaUnits || [
    "sq.ft",
    "sq.yd",
    "Acre",
    "Guntha",
    "Bigha",
  ];
  const bhkConfigs: string[] = business?.bhkConfigs || [
    "1 BHK",
    "2 BHK",
    "3 BHK",
    "4 BHK",
  ];

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<any>({
    name: "",
    phone: "",
    location: "",
    category: "General",
    classification: "RESIDENTIAL",
    budgetMin: "",
    budgetMax: "",
    agentName: "",
    agentSubName: "",
    visitorName: "",
    propertyTypeInterest: "Plot",
    size: "",
    area: "",
    areaUnit: "sq.ft",
    roadType: "Single Road",
    facing: "East",
    bhk: "2 BHK",
    district: "",
    village: "",
    landType: "Khet",
    soilType: "Upjau",
    cropType: "Single Crop",
    front: "",
    depth: "",
    roadWidth: "",
    isDiverted: false,
    constructionAge: "",
    notes: "",
  });

  useEffect(() => {
    if (business) {
      setFormData((prev: any) => ({
        ...prev,
        state: business.defaultState || business.state || "Maharashtra",
      }));
    }
  }, [business]);

  useEffect(() => {
    async function hydrateFromCrmLead() {
      if (!incomingLeadId || !businessId) return;
      if (hydratedLeadIdRef.current === incomingLeadId) return;
      try {
        const snap = await getDoc(doc(firestore, "businesses", businessId, "leads", incomingLeadId));
        if (!snap.exists()) return;
        hydratedLeadIdRef.current = incomingLeadId;
        const leadData = snap.data();
        setFormData((prev: any) => ({
          ...prev,
          name: prev.name || leadData.name || "",
          phone: prev.phone || leadData.phone || "",
          location: prev.location || leadData.location || "",
          budgetMax: prev.budgetMax || (leadData.budget ? String(leadData.budget) : ""),
          notes: prev.notes || leadData.notes || leadData.interest || "",
        }));
        toast({
          title: "CRM Lead Loaded",
          description: `Prefilled property enquiry for ${leadData.name || "prospect"}.`,
        });
      } catch (e) {
        console.error("CRM Property Lead Prefill Error:", e);
      }
    }
    hydrateFromCrmLead();
  }, [incomingLeadId, businessId, firestore]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const handleSave = () => {
    if (!businessId || !formData.name || !formData.phone || !user?.uid) {
      toast({
        variant: "destructive",
        title: "Missing Info",
        description: "Name and Phone are mandatory.",
      });
      return;
    }

    setIsSubmitting(true);

    const selectedAgent = (teamMembers || []).find(
      (m: any) => m.name === formData.agentName
    );

    addDocumentNonBlocking(
      collection(firestore, "businesses", businessId, "realEstateLeads"),
      {
        ...formData,
        ...(incomingLeadId ? { crmLeadId: incomingLeadId } : {}),
        businessId,
        assignedAgentId: selectedAgent?.id || user.uid,
        createdBy: user.uid,
        leadStage: "new",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    )
      .then(() => {
        toast({
          title: "Customer Registered",
          description: "Lead ownership established.",
        });
        router.push("/properties/leads");
      })
      .catch((error) => {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not save enquiry.",
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const renderSectionHeader = (Icon: any, title: string) => (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20 text-left">
      <PageHeader
        breadcrumb="Real Estate CRM"
        title="Register Customer"
        description="Capture buyer requirements, budget range, and agent assignment."
        backHref="/properties/leads"
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
            Save Enquiry
          </Button>
        }
      />

      <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Customer Onboarding Details
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Ownership attribution & property interest criteria
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 p-6">
          <section>
            {renderSectionHeader(Users, "1. Customer Profile")}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Customer Name *
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Full Name"
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  WhatsApp Number *
                </Label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="91XXXXXXXX"
                  className="h-10 rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Preferred Location
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="Area / Village / City"
                    className="h-10 rounded-xl pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Social Category
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    setFormData({ ...formData, category: v })
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl bg-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {socialCategories.map((c: string) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Min Budget ({currencySymbol})
                </Label>
                <Input
                  type="number"
                  value={formData.budgetMin}
                  onChange={(e) =>
                    setFormData({ ...formData, budgetMin: e.target.value })
                  }
                  className="h-10 rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Max Budget ({currencySymbol})
                </Label>
                <Input
                  type="number"
                  value={formData.budgetMax}
                  onChange={(e) =>
                    setFormData({ ...formData, budgetMax: e.target.value })
                  }
                  className="h-10 rounded-xl font-mono font-semibold"
                />
              </div>
            </div>
          </section>

          <Separator />

          <section>
            {renderSectionHeader(
              Briefcase,
              "2. Internal Attribution & Ownership"
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Assigned Agent *
                </Label>
                <Select
                  value={formData.agentName}
                  onValueChange={(v) =>
                    setFormData({ ...formData, agentName: v })
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl bg-white text-xs font-medium">
                    <SelectValue placeholder="Select Owner" />
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
                  Sub Agent (Manual Entry)
                </Label>
                <Input
                  value={formData.agentSubName}
                  onChange={(e) =>
                    setFormData({ ...formData, agentSubName: e.target.value })
                  }
                  placeholder="Sub Agent Name"
                  className="h-10 rounded-xl"
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
                  placeholder="Direct Name"
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-5">
            {renderSectionHeader(Zap, "3. Property Interest Details")}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Property Type Interest *
                </Label>
                <Select
                  value={formData.propertyTypeInterest}
                  onValueChange={(v) =>
                    setFormData({ ...formData, propertyTypeInterest: v })
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl bg-white text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Preferred Classification
                </Label>
                <Select
                  value={formData.classification}
                  onValueChange={(v) =>
                    setFormData({ ...formData, classification: v })
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl bg-white text-xs">
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
                  Facing Preference
                </Label>
                <Select
                  value={formData.facing}
                  onValueChange={(v) => setFormData({ ...formData, facing: v })}
                >
                  <SelectTrigger className="h-10 rounded-xl bg-white text-xs">
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
            </div>

            {(formData.propertyTypeInterest === "Khet" ||
              formData.propertyTypeInterest === "Farmhouse") && (
              <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
                <div className="flex items-center gap-2">
                  <Trees className="h-4 w-4 text-emerald-700" />
                  <span className="text-xs font-semibold text-emerald-900">
                    Land / Soil Interest Criteria
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-700">
                      Size Required
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={formData.size}
                        onChange={(e) =>
                          setFormData({ ...formData, size: e.target.value })
                        }
                        className="h-10 rounded-xl bg-white font-mono"
                        placeholder="0.00"
                      />
                      <Select
                        value={formData.areaUnit}
                        onValueChange={(v) =>
                          setFormData({ ...formData, areaUnit: v })
                        }
                      >
                        <SelectTrigger className="h-10 w-24 rounded-xl bg-white text-xs">
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
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-700">
                      District Pref.
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
                      Village Pref.
                    </Label>
                    <Input
                      value={formData.village}
                      onChange={(e) =>
                        setFormData({ ...formData, village: e.target.value })
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
                      Land Type Pref.
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
                      Soil Type Pref.
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
                      <Wheat className="h-3.5 w-3.5" /> Crop Interest
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
                  {formData.propertyTypeInterest === "Farmhouse" && (
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-700">
                        Rooms (BHK)
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
                  )}
                </div>
              </div>
            )}

            {formData.propertyTypeInterest === "Plot" && (
              <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/50 p-5">
                <div className="flex items-center gap-2">
                  <LandPlot className="h-4 w-4 text-blue-700" />
                  <span className="text-xs font-semibold text-blue-900">
                    Plot Interest Criteria
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-700">
                      Area Required
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={formData.area}
                        onChange={(e) =>
                          setFormData({ ...formData, area: e.target.value })
                        }
                        className="h-10 rounded-xl bg-white font-mono"
                        placeholder="0.00"
                      />
                      <Select
                        value={formData.areaUnit}
                        onValueChange={(v) =>
                          setFormData({ ...formData, areaUnit: v })
                        }
                      >
                        <SelectTrigger className="h-10 w-24 rounded-xl bg-white text-xs">
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
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-700">
                      Min Frontage (Ft)
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
                      Min Depth (Ft)
                    </Label>
                    <Input
                      value={formData.depth}
                      onChange={(e) =>
                        setFormData({ ...formData, depth: e.target.value })
                      }
                      className="h-10 rounded-xl bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-700">
                      Preferred Road
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
                  <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-white px-4 py-2.5 sm:mt-5">
                    <Label className="text-xs font-semibold text-slate-900">
                      Diverted Plots Only?
                    </Label>
                    <Switch
                      aria-label="Toggle diverted plots only"
                      checked={formData.isDiverted}
                      onCheckedChange={(v) =>
                        setFormData({ ...formData, isDiverted: v })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.propertyTypeInterest === "Building" && (
              <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-5">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-amber-700" />
                  <span className="text-xs font-semibold text-amber-900">
                    Building / Home Criteria
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-700">
                      BHK Configuration
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
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-700">
                      Max Construction Age (Yrs)
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
                      Preferred Road Width
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
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Remarks
              </Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Any specific requirements mentioned by the customer..."
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
            Register Customer Enquiry
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function NewCustomerEntryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      }
    >
      <NewCustomerEntryContent />
    </Suspense>
  );
}
