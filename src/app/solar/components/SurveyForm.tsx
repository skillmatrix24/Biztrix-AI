"use client";

import React, { useState, useRef } from "react";
import {
  Building2,
  Zap,
  Navigation,
  ImageIcon,
  Plus,
  X,
  ShieldCheck,
  Upload,
  Loader2,
  MapPin,
  Scaling,
  Activity,
  Bot,
  UserPlus,
  Phone,
  DollarSign,
} from "lucide-react";
import { Card, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { useFirestore, addDocumentNonBlocking } from "@/firebase";
import { collection, serverTimestamp } from "firebase/firestore";

const SITE_TYPES = ["Residential", "Commercial", "Industrial", "Apartment", "Other"];
const ROOF_TYPES = [
  "Flat Concrete (RCC)",
  "Inclined RCC",
  "Industrial Tin Shade",
  "Asbestos Sheet",
  "Tile Roof",
  "Mangalore Tiles",
  "Open Land",
  "Structure on Pillars",
  "Roof Overhang",
  "Polycarbonate Sheet",
  "Other",
];
const DIRECTIONS = [
  "North",
  "South",
  "East",
  "West",
  "North-East",
  "North-West",
  "South-East",
  "South-West",
];
const SHADING_LEVELS = ["None", "Low", "Moderate", "Severe"];
const PHASE_TYPES = ["Single Phase", "Three Phase"];
const SHIFT_HOURS = ["4", "6", "8", "9", "10", "12"];

interface SurveyFormProps {
  inquiry: any;
  teamMembers: any[];
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function SurveyForm({
  inquiry,
  teamMembers,
  onSubmit,
  isSubmitting,
}: SurveyFormProps) {
  const firestore = useFirestore();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    status: "SCHEDULED",
    surveyDate: new Date().toISOString().split("T")[0],
    assignedTo: "",
    assignedName: "",
    customerInfo: {
      siteAddress: inquiry?.location || "",
      siteType: inquiry?.propertyType || "Residential",
      contactPerson: inquiry?.customerName || "",
      contactPhone: inquiry?.customerPhone || "",
    },
    electrical: {
      connectionType: inquiry?.electricityConnection || "Single Phase",
      sanctionedLoad: "0",
      avgMonthlyUnits: inquiry?.averageMonthlyUnits || "0",
      monthlyBill: inquiry?.monthlyBill || "0",
      phaseType: "Single Phase",
      existingSolar: false,
    },
    rooftop: {
      material: inquiry?.roofType || "Flat Concrete (RCC)",
      totalArea: inquiry?.roofArea || "0",
      usableArea: "0",
      condition: "Good",
      accessibility: "Easy",
    },
    orientation: {
      direction: "South",
      proposedTilt: "15",
      shadingSeverity: "None",
      obstacles: "",
    },
    installConditions: {
      inverterLocation: "Indoor",
      meterLocation: "Main Entrance",
      earthingAvailability: false,
      lightningProtection: false,
      cableDistance: "50",
    },
    media: [] as string[],
    notes: "",
  });

  // Quick Add Specialist State
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    phone: "",
    role: "Staff",
    dailyRate: "500",
    shiftHours: "8",
  });

  const handleUpdate = (section: string, field: string, value: any) => {
    if (section === "root") {
      setFormData((prev) => ({ ...prev, [field]: value }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [section]: { ...(prev as any)[section], [field]: value },
      }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData((prev) => ({
            ...prev,
            media: [...prev.media, reader.result as string],
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleQuickAddStaff = async () => {
    if (!newStaff.name || !newStaff.email || !inquiry.businessId) return;

    const userData = {
      ...newStaff,
      email: newStaff.email.toLowerCase(),
      businessId: inquiry.businessId,
      dailyRate: parseFloat(newStaff.dailyRate) || 500,
      shiftHours: parseInt(newStaff.shiftHours) || 8,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    };

    try {
      const docRef = await addDocumentNonBlocking(
        collection(firestore, "users"),
        userData
      );
      if (docRef) {
        setFormData((prev) => ({
          ...prev,
          assignedTo: docRef.id,
          assignedName: newStaff.name,
        }));
        toast({
          title: "Specialist Registered",
          description: "Survey specialist has been selected for this audit.",
        });
      }
      setIsAddStaffOpen(false);
      setNewStaff({
        name: "",
        email: "",
        phone: "",
        role: "Staff",
        dailyRate: "500",
        shiftHours: "8",
      });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Registration Failed" });
    }
  };

  const SectionTitle = ({
    icon: Icon,
    title,
    sub,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    sub?: string;
  }) => (
    <div className="flex items-center gap-3.5 mb-5 text-left">
      <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-base font-bold text-slate-900 leading-tight">{title}</h3>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );

  return (
    <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-none">
      <div className="p-5 sm:p-8 space-y-8">
        {/* Assignment & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 bg-slate-50 border border-slate-200 p-5 rounded-2xl text-left">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-slate-600">
                Survey Specialist
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAddStaffOpen(true)}
                className="h-6 px-2 text-xs font-semibold text-primary gap-1 hover:bg-primary/5"
              >
                <Plus className="h-3 w-3" /> Add New
              </Button>
            </div>
            <Select
              value={formData.assignedTo}
              onValueChange={(v) => {
                const staff = teamMembers.find((m: any) => m.id === v);
                setFormData({
                  ...formData,
                  assignedTo: v,
                  assignedName: staff?.name || "",
                });
              }}
            >
              <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 font-medium text-sm">
                <SelectValue placeholder="Assign Staff" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {teamMembers.map((m: any) => (
                  <SelectItem key={m.id} value={m.id} className="text-sm font-medium">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">
              Audit Schedule Date
            </Label>
            <Input
              type="date"
              value={formData.surveyDate}
              onChange={(e) => handleUpdate("root", "surveyDate", e.target.value)}
              className="h-11 rounded-xl bg-white border-slate-200 font-mono tabular-nums font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">
              Workflow Stage
            </Label>
            <Select
              value={formData.status}
              onValueChange={(v) => handleUpdate("root", "status", v)}
            >
              <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 font-medium text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="IN_PROGRESS">Field Audit</SelectItem>
                <SelectItem value="COMPLETED">Finished</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator className="bg-slate-200" />

        {/* Section 1: Site Info */}
        <section className="text-left">
          <SectionTitle
            icon={Building2}
            title="1. Site Information"
            sub="Base location and property classification"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Installation Address
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={formData.customerInfo.siteAddress}
                  onChange={(e) =>
                    handleUpdate("customerInfo", "siteAddress", e.target.value)
                  }
                  className="h-11 pl-10 rounded-xl bg-white border-slate-200 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Property Type
              </Label>
              <Select
                value={formData.customerInfo.siteType}
                onValueChange={(v) =>
                  handleUpdate("customerInfo", "siteType", v)
                }
              >
                <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {SITE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Section 2: Electrical */}
        <section className="text-left">
          <SectionTitle
            icon={Zap}
            title="2. Electrical Parameters"
            sub="Grid capacity and existing solar service"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Sanctioned Load (kW)
              </Label>
              <Input
                type="number"
                value={formData.electrical.sanctionedLoad}
                onChange={(e) =>
                  handleUpdate("electrical", "sanctionedLoad", e.target.value)
                }
                className="h-11 rounded-xl bg-white border-slate-200 font-mono tabular-nums font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Phase Protocol
              </Label>
              <Select
                value={formData.electrical.phaseType}
                onValueChange={(v) =>
                  handleUpdate("electrical", "phaseType", v)
                }
              >
                <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {PHASE_TYPES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:mt-6">
              <span className="text-xs font-semibold text-slate-800">
                Existing Solar?
              </span>
              <Switch
                checked={formData.electrical.existingSolar}
                onCheckedChange={(v) =>
                  handleUpdate("electrical", "existingSolar", v)
                }
                aria-label="Existing solar present"
              />
            </div>
          </div>
        </section>

        {/* Section 3: Rooftop */}
        <section className="text-left">
          <SectionTitle
            icon={Scaling}
            title="3. Rooftop Environment"
            sub="Physical area and roof structure audit"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Total Roof Area (Sq.Ft)
              </Label>
              <Input
                type="number"
                value={formData.rooftop.totalArea}
                onChange={(e) =>
                  handleUpdate("rooftop", "totalArea", e.target.value)
                }
                className="h-11 rounded-xl bg-white border-slate-200 font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-primary">
                Usable Panel Area (Sq.Ft)
              </Label>
              <Input
                type="number"
                value={formData.rooftop.usableArea}
                onChange={(e) =>
                  handleUpdate("rooftop", "usableArea", e.target.value)
                }
                className="h-11 rounded-xl bg-primary/5 border-primary/20 font-mono tabular-nums font-bold text-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Roof Material
              </Label>
              <Select
                value={formData.rooftop.material}
                onValueChange={(v) =>
                  handleUpdate("rooftop", "material", v)
                }
              >
                <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {ROOF_TYPES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Section 4: Orientation */}
        <section className="text-left">
          <SectionTitle
            icon={Navigation}
            title="4. Orientation & Shading"
            sub="Irradiance direction and shading assessment"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Panel Orientation
              </Label>
              <Select
                value={formData.orientation.direction}
                onValueChange={(v) =>
                  handleUpdate("orientation", "direction", v)
                }
              >
                <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 font-medium text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {DIRECTIONS.map((d) => (
                    <SelectItem key={d} value={d} className="text-sm font-medium">
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Proposed Tilt (°)
              </Label>
              <Input
                type="number"
                value={formData.orientation.proposedTilt}
                onChange={(e) =>
                  handleUpdate("orientation", "proposedTilt", e.target.value)
                }
                className="h-11 rounded-xl bg-white border-slate-200 font-mono tabular-nums font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Shading Severity
              </Label>
              <Select
                value={formData.orientation.shadingSeverity}
                onValueChange={(v) =>
                  handleUpdate("orientation", "shadingSeverity", v)
                }
              >
                <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 font-medium text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {SHADING_LEVELS.map((l) => (
                    <SelectItem key={l} value={l} className="text-sm font-medium">
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Section 5: Install Conditions */}
        <section className="text-left">
          <SectionTitle
            icon={Activity}
            title="5. Installation Logistics"
            sub="Cabling, inverter placement, and protection equipment"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  Inverter Installation Point
                </Label>
                <Input
                  value={formData.installConditions.inverterLocation}
                  onChange={(e) =>
                    handleUpdate(
                      "installConditions",
                      "inverterLocation",
                      e.target.value
                    )
                  }
                  placeholder="e.g. Ground Floor Stairs"
                  className="h-11 rounded-xl bg-white border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  Approx. DC/AC Cable Run (Ft)
                </Label>
                <Input
                  type="number"
                  value={formData.installConditions.cableDistance}
                  onChange={(e) =>
                    handleUpdate(
                      "installConditions",
                      "cableDistance",
                      e.target.value
                    )
                  }
                  className="h-11 rounded-xl bg-white border-slate-200 font-mono tabular-nums font-medium"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:mt-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-slate-900">
                    Earthing Protocol
                  </p>
                  <p className="text-xs text-slate-500">New earthing setup required?</p>
                </div>
                <Switch
                  checked={formData.installConditions.earthingAvailability}
                  onCheckedChange={(v) =>
                    handleUpdate("installConditions", "earthingAvailability", v)
                  }
                  aria-label="Earthing setup required"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-slate-900">
                    Lightning Arrestor
                  </p>
                  <p className="text-xs text-slate-500">Arrestor kit needed?</p>
                </div>
                <Switch
                  checked={formData.installConditions.lightningProtection}
                  onCheckedChange={(v) =>
                    handleUpdate("installConditions", "lightningProtection", v)
                  }
                  aria-label="Lightning arrestor needed"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Media */}
        <section className="text-left">
          <SectionTitle
            icon={ImageIcon}
            title="6. Site Documentation"
            sub="Visual audit evidence photos"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            {formData.media.map((img, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 group"
              >
                <img
                  src={img}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  alt={`Site evidence ${i + 1}`}
                />
                <button
                  type="button"
                  aria-label={`Remove evidence photo ${i + 1}`}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      media: prev.media.filter((_, idx) => idx !== i),
                    }))
                  }
                  className="absolute top-2 right-2 h-7 w-7 bg-white border border-slate-200 rounded-full flex items-center justify-center text-rose-600 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
            >
              <Upload className="h-5 w-5 text-slate-600" />
              <span className="text-xs font-medium text-slate-600">Upload Photo</span>
            </button>
            <input
              type="file"
              ref={imageInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
            />
          </div>
        </section>

        <Separator className="bg-slate-200" />

        <section className="text-left space-y-2">
          <Label className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" /> Surveyor Summary & Observations
          </Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleUpdate("root", "notes", e.target.value)}
            placeholder="Type any specific site constraints or structural notes..."
            className="min-h-[120px] rounded-xl bg-white border-slate-200 p-4 text-sm"
          />
        </section>
      </div>

      <CardFooter className="p-5 sm:p-8 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-3">
        <Button
          variant="outline"
          asChild
          className="h-11 px-6 rounded-xl font-semibold text-sm border-slate-200 bg-white"
        >
          <Link href="/solar/inquiries">Discard Audit</Link>
        </Button>
        <Button
          onClick={() => onSubmit(formData)}
          disabled={isSubmitting || !formData.assignedTo}
          className="h-11 px-8 bg-slate-900 hover:bg-slate-800 font-semibold text-sm rounded-xl text-white"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="mr-2 h-4 w-4" />
          )}
          Finalize Site Audit
        </Button>
      </CardFooter>

      {/* Quick Add Specialist Dialog */}
      <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl border border-slate-200 p-0 overflow-hidden text-left w-[95vw] bg-white">
          <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Add Specialist
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300">
                  Register a surveyor to assign immediately
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-5">
            <div className="space-y-1.5 text-left">
              <Label className="text-xs font-medium text-slate-600">
                Full Name *
              </Label>
              <Input
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                className="h-11 rounded-xl font-medium bg-white border-slate-200"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <Label className="text-xs font-medium text-slate-600">
                Email Address *
              </Label>
              <Input
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                className="h-11 rounded-xl font-medium bg-white border-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <Label className="text-xs font-medium text-slate-600">
                  Mobile
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={newStaff.phone}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, phone: e.target.value })
                    }
                    placeholder="91XXXXXXXX"
                    className="h-11 pl-9 rounded-xl border-slate-200 font-mono tabular-nums"
                  />
                </div>
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-xs font-medium text-slate-600">
                  System Role
                </Label>
                <Select
                  value={newStaff.role}
                  onValueChange={(v) => setNewStaff({ ...newStaff, role: v })}
                >
                  <SelectTrigger className="h-11 rounded-xl font-medium text-sm border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                    <SelectItem value="Agent">Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator className="bg-slate-200" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <Label className="text-xs font-medium text-slate-600">
                  Daily Rate (₹)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="number"
                    value={newStaff.dailyRate}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, dailyRate: e.target.value })
                    }
                    className="h-11 pl-8 rounded-xl font-mono tabular-nums font-semibold border-slate-200"
                  />
                </div>
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-xs font-medium text-slate-600">
                  Shift Hours
                </Label>
                <Select
                  value={newStaff.shiftHours}
                  onValueChange={(v) =>
                    setNewStaff({ ...newStaff, shiftHours: v })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl font-medium border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {SHIFT_HOURS.map((h) => (
                      <SelectItem key={h} value={h} className="text-sm">
                        {h} Hours
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-200">
            <Button
              onClick={handleQuickAddStaff}
              disabled={!newStaff.name || !newStaff.email}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl"
            >
              Save & Assign Specialist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
