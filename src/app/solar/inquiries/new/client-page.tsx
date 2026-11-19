"use client";

import { useEffect, useRef, useState, useMemo, Suspense } from "react";
import {
  Plus,
  Loader2,
  Search,
  Zap,
  ChevronRight,
  Handshake,
  ShieldCheck,
  Users,
  CheckCircle2,
  UserPlus,
  Truck,
  LayoutList,
  Building2,
  Scaling,
  MapPin,
} from "lucide-react";
import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { PageHeader, SectionCard } from "@/components/ui/editorial";
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  useCollection,
  addDocumentNonBlocking,
  setDocumentNonBlocking,
} from "@/firebase";
import {
  collection,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { getCurrencySymbol } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { createSolarNotification } from "@/firebase/solar-notifications";
import { NewCustomerDialog } from "@/app/billing/components/NewCustomerDialog";

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

const LEAD_SOURCES = [
  "Walk-in",
  "WhatsApp",
  "Facebook",
  "Instagram",
  "Website",
  "Referral",
  "Cold Call",
  "Exhibition",
  "Newspaper",
  "Other",
];

function NewSolarInquiryContent() {
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
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const leadsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "leads"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: leadsData } = useCollection<any>(leadsQuery);
  const leads = leadsData || [];

  const customersQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "customers"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: customersData } = useCollection<any>(customersQuery);
  const customers = customersData || [];

  const vendorsQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(firestore, "businesses", businessId, "vendors")
        : null,
    [firestore, businessId]
  );
  const { data: vendorsData } = useCollection<any>(vendorsQuery);
  const vendors = vendorsData || [];

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const [formData, setFormData] = useState({
    sourceType: "lead" as "lead" | "customer",
    sourceId: "",
    dealerId: "none",
    propertyType: "Residential",
    electricityConnection: "Single Phase",
    averageMonthlyUnits: "",
    monthlyBill: "",
    requiredCapacity: "",
    roofType: "Concrete (RCC)",
    roofArea: "",
    location: "",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!incomingLeadId || hydratedLeadIdRef.current === incomingLeadId) return;
    const matched = leads.find((l: any) => l.id === incomingLeadId);
    if (!matched) return;
    hydratedLeadIdRef.current = incomingLeadId;
    setFormData((prev) => ({
      ...prev,
      sourceType: "lead",
      sourceId: matched.id,
      location: prev.location || matched.location || "",
      notes: prev.notes || matched.notes || matched.interest || "",
    }));
    toast({
      title: "CRM Lead Selected",
      description: `Prefilled Solar Inquiry for ${matched.name}.`,
    });
  }, [incomingLeadId, leads]);

  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);

  const [newLeadData, setNewLeadData] = useState({
    name: "",
    phone: "",
    source: "Walk-in" as any,
    notes: "",
  });

  const [newVendorData, setNewVendorData] = useState({
    name: "",
    phone: "",
    email: "",
    businessName: "",
    gstin: "",
    address: "",
    city: "",
    state: "Maharashtra",
    pincode: "",
    openingBalance: "0",
  });

  const filteredSources = useMemo(() => {
    const list =
      formData.sourceType === "lead" ? leads || [] : customers || [];
    if (!searchTerm) {
      return list.slice(0, 10);
    }
    return list
      .filter(
        (s: any) =>
          s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.phone?.includes(searchTerm)
      )
      .slice(0, 10);
  }, [leads, customers, formData.sourceType, searchTerm]);

  const selectedSourceData = useMemo(() => {
    const list = (formData.sourceType === "lead" ? leads : customers) || [];
    return list.find((s: any) => s.id === formData.sourceId) || null;
  }, [leads, customers, formData.sourceId, formData.sourceType]);

  const dealers = useMemo(() => {
    return (vendors || []).filter(
      (v: any) => v.status === "Active" || v.status === "Active Node"
    );
  }, [vendors]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const handleQuickAddLead = async () => {
    if (!businessId || !newLeadData.name || !newLeadData.phone) return;
    const leadId = `l${Date.now()}`;
    const leadRef = doc(firestore, "businesses", businessId, "leads", leadId);

    await setDocumentNonBlocking(
      leadRef,
      {
        ...newLeadData,
        id: leadId,
        tenantId: businessId,
        status: "new",
        createdAt: new Date().toISOString().split("T")[0],
        intentScore: 50,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    setFormData((prev) => ({ ...prev, sourceId: leadId }));
    setIsAddLeadOpen(false);
    setNewLeadData({ name: "", phone: "", source: "Walk-in", notes: "" });
    toast({
      title: "Lead Added",
      description: "CRM lead created and selected.",
    });
  };

  const handleQuickAddVendor = async () => {
    if (!businessId || !newVendorData.name || !newVendorData.phone) return;
    const vendorId = `v${Date.now()}`;
    const vendorRef = doc(
      firestore,
      "businesses",
      businessId,
      "vendors",
      vendorId
    );

    await setDocumentNonBlocking(
      vendorRef,
      {
        ...newVendorData,
        id: vendorId,
        tenantId: businessId,
        totalPurchase: 0,
        paidAmount: 0,
        pendingBalance: parseFloat(newVendorData.openingBalance) || 0,
        status: "Active",
        lastPurchaseDate: new Date().toISOString().split("T")[0],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    setFormData((prev) => ({ ...prev, dealerId: vendorId }));
    setIsAddVendorOpen(false);
    setNewVendorData({
      name: "",
      phone: "",
      email: "",
      businessName: "",
      gstin: "",
      address: "",
      city: "",
      state: business?.defaultState || business?.state || "Maharashtra",
      pincode: "",
      openingBalance: "0",
    });
    toast({
      title: "Dealer Registered",
      description: "Partner record created and selected.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !formData.sourceId || !selectedSourceData) {
      toast({
        variant: "destructive",
        title: "Missing Source",
        description: "Please select a Lead or Customer first.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const inquiryRef = collection(
        firestore,
        "businesses",
        businessId,
        "solarInquiries"
      );

      const selectedDealer = dealers.find((d) => d.id === formData.dealerId);

      const docRef = await addDocumentNonBlocking(inquiryRef, {
        ...formData,
        customerName: selectedSourceData.name,
        customerPhone: selectedSourceData.phone,
        customerId: formData.sourceType === "customer" ? formData.sourceId : null,
        leadId: formData.sourceType === "lead" ? formData.sourceId : null,
        dealerName: selectedDealer?.name || null,
        status: "NEW",
        assignedTo: user?.uid,
        assignedName: userProfile?.name || "Admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (business?.ownerId && docRef) {
        createSolarNotification(firestore, {
          businessId,
          recipientId: business.ownerId,
          title: "New Solar Inquiry",
          message: `${selectedSourceData.name} requested a ${formData.requiredCapacity}kW system.`,
          type: "solar_alert",
          severity: "INFO",
          entityType: "SOLAR_INQUIRY",
          entityId: docRef.id,
        });
      }

      toast({
        title: "Inquiry Created",
        description: "Solar technical inquiry saved to registry.",
      });
      router.push("/solar/inquiries");
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save solar inquiry.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-slate-600 h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 text-left">
      <PageHeader
        backHref="/solar/inquiries"
        backLabel="Back to Inquiries"
        title="Initialize Inquiry"
        description="Capture customer utility details, solar capacity targets, and partner attribution"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <SectionCard
          title="1. Identity & Partner Attribution"
          description="Link this technical inquiry to an existing CRM lead or customer"
          headerRight={
            <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          }
          bodyClassName="space-y-6"
        >
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="w-full sm:w-52 space-y-1.5 text-left">
              <Label className="text-xs font-medium text-slate-600">
                Source Type
              </Label>
              <Select
                value={formData.sourceType || ""}
                onValueChange={(v: any) => {
                  setFormData({ ...formData, sourceType: v, sourceId: "" });
                  setSearchTerm("");
                }}
              >
                <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 font-medium text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="lead" className="text-sm font-medium">
                    From CRM Leads
                  </SelectItem>
                  <SelectItem value="customer" className="text-sm font-medium">
                    From Customers
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-slate-600">
                  Search & Select *
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    formData.sourceType === "lead"
                      ? setIsAddLeadOpen(true)
                      : setIsAddCustomerOpen(true)
                  }
                  className="h-6 px-2 text-xs font-semibold text-primary gap-1 hover:bg-primary/5"
                >
                  <Plus className="h-3 w-3" /> Add{" "}
                  {formData.sourceType === "lead" ? "Lead" : "Customer"}
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={`Find ${formData.sourceType === "lead" ? "Lead" : "Customer"} by name or phone...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 pl-10 rounded-xl bg-white border-slate-200 text-sm"
                />
                {searchTerm && (
                  <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-xl mt-1.5 z-50 overflow-hidden shadow-md">
                    {(filteredSources || []).length === 0 ? (
                      <div className="p-4 text-xs text-slate-500 text-center">
                        No matching{" "}
                        {formData.sourceType === "lead" ? "leads" : "customers"}{" "}
                        found.
                      </div>
                    ) : (
                      (filteredSources || []).map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, sourceId: s.id });
                            setSearchTerm("");
                          }}
                          className="w-full p-3.5 hover:bg-slate-50 flex justify-between items-center border-b border-slate-100 last:border-0 text-left transition-colors"
                        >
                          <div className="text-left">
                            <p className="text-sm font-semibold text-slate-900">
                              {s.name}
                            </p>
                            <p className="text-xs font-mono tabular-nums text-slate-500">
                              {s.phone}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <Handshake className="h-4 w-4 text-slate-600" /> Dealer /
                Partner Attribution (Optional)
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAddVendorOpen(true)}
                className="h-6 px-2 text-xs font-semibold text-primary gap-1 hover:bg-primary/5"
              >
                <Plus className="h-3 w-3" /> Add Dealer
              </Button>
            </div>
            <Select
              value={formData.dealerId || ""}
              onValueChange={(v) => setFormData({ ...formData, dealerId: v })}
            >
              <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 font-medium">
                <SelectValue placeholder="No Dealer (Direct)" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="none" className="text-sm font-medium">
                  No Dealer (Direct)
                </SelectItem>
                {(dealers || []).map((d) => (
                  <SelectItem
                    key={d.id}
                    value={d.id}
                    className="text-sm font-medium"
                  >
                    {d.name} ({d.businessName || "Individual"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSourceData && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-left">
              <div className="flex items-center gap-3.5 text-left">
                <div className="h-11 w-11 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-base shrink-0">
                  {selectedSourceData.name?.charAt(0)}
                </div>
                <div className="text-left">
                  <h4 className="text-base font-bold text-slate-900 leading-tight">
                    {selectedSourceData.name}
                  </h4>
                  <p className="text-xs font-mono tabular-nums text-slate-600 mt-0.5">
                    {selectedSourceData.phone}
                  </p>
                </div>
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="2. Solar Requirement & Site Details"
          description="Electricity connection, monthly bill, and roof specifications"
          headerRight={
            <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
              <Zap className="h-4 w-4" />
            </div>
          }
          bodyClassName="p-0"
        >
          <div className="p-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  Property Classification
                </Label>
                <Select
                  value={formData.propertyType || ""}
                  onValueChange={(v) =>
                    setFormData({ ...formData, propertyType: v })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {[
                      "Residential",
                      "Commercial",
                      "Industrial",
                      "Agricultural",
                      "Other",
                    ].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  Electricity Connection Type
                </Label>
                <Select
                  value={formData.electricityConnection || ""}
                  onValueChange={(v) =>
                    setFormData({ ...formData, electricityConnection: v })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {[
                      "Single Phase",
                      "Three Phase",
                      "High Tension (HT)",
                    ].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  Avg. Monthly Units (kWh)
                </Label>
                <div className="relative">
                  <LayoutList className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="number"
                    value={formData.averageMonthlyUnits || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        averageMonthlyUnits: e.target.value,
                      })
                    }
                    className="h-11 pl-10 rounded-xl bg-white border-slate-200 font-mono tabular-nums"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  Avg. Monthly Bill ({currencySymbol})
                </Label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-slate-400">
                    {currencySymbol}
                  </div>
                  <Input
                    type="number"
                    value={formData.monthlyBill || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, monthlyBill: e.target.value })
                    }
                    className="h-11 pl-9 rounded-xl bg-white border-slate-200 font-mono tabular-nums"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-primary">
                  Required Capacity (kW)
                </Label>
                <div className="relative">
                  <Zap className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input
                    type="number"
                    value={formData.requiredCapacity || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requiredCapacity: e.target.value,
                      })
                    }
                    className="h-11 pl-10 rounded-xl bg-primary/5 border-primary/20 font-mono tabular-nums font-bold text-primary text-base"
                    placeholder="0.0"
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-slate-200" />

            <div className="space-y-5 text-left">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-700" />
                <h4 className="text-sm font-bold text-slate-900">
                  Roof & Installation Details
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">
                    Roof Type
                  </Label>
                  <Select
                    value={formData.roofType || ""}
                    onValueChange={(v) =>
                      setFormData({ ...formData, roofType: v })
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {[
                        "Concrete (RCC)",
                        "Tin Shade",
                        "Asbestos Sheet",
                        "Tile Roof",
                        "Open Ground",
                        "Other",
                      ].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">
                    Approx. Roof Area (sq.ft)
                  </Label>
                  <div className="relative">
                    <Scaling className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="number"
                      value={formData.roofArea || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, roofArea: e.target.value })
                      }
                      className="h-11 pl-10 rounded-xl bg-white border-slate-200 font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-xs font-medium text-slate-600">
                  Installation Location / Address
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <Textarea
                    value={formData.location || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="min-h-[96px] pl-10 rounded-xl bg-white border-slate-200 p-3 text-sm"
                    placeholder="Full address of site..."
                  />
                </div>
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-xs font-medium text-slate-600">
                  Technical Notes
                </Label>
                <Textarea
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="min-h-[96px] rounded-xl bg-white border-slate-200 p-3 text-sm"
                  placeholder="Orientation, shading concerns, structure height, etc."
                />
              </div>
            </div>
          </div>

          <CardFooter className="p-5 sm:p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || !formData.sourceId}
              className="w-full sm:w-auto h-11 px-8 bg-slate-900 hover:bg-slate-800 font-semibold text-sm rounded-xl text-white"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Create Solar Inquiry
            </Button>
          </CardFooter>
        </SectionCard>
      </form>

      {/* Quick Add Lead Dialog */}
      <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl border border-slate-200 p-0 overflow-hidden text-left bg-white">
          <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Quick Lead Entry
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300">
                  Add a CRM lead and select for this inquiry
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Name *
              </Label>
              <Input
                value={newLeadData.name || ""}
                onChange={(e) =>
                  setNewLeadData({ ...newLeadData, name: e.target.value })
                }
                className="h-11 rounded-xl border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Phone *
              </Label>
              <Input
                value={newLeadData.phone || ""}
                onChange={(e) =>
                  setNewLeadData({
                    ...newLeadData,
                    phone: e.target.value.replace(/\D/g, ""),
                  })
                }
                className="h-11 rounded-xl border-slate-200 font-mono tabular-nums"
                placeholder="91XXXXXXXX"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Source
              </Label>
              <Select
                value={newLeadData.source || ""}
                onValueChange={(v) =>
                  setNewLeadData({ ...newLeadData, source: v })
                }
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Notes
              </Label>
              <Textarea
                value={newLeadData.notes || ""}
                onChange={(e) =>
                  setNewLeadData({ ...newLeadData, notes: e.target.value })
                }
                className="h-20 rounded-xl border-slate-200"
              />
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-200">
            <Button
              onClick={handleQuickAddLead}
              disabled={!newLeadData.name || !newLeadData.phone}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl"
            >
              Add Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Customer Dialog */}
      <NewCustomerDialog
        isOpen={isAddCustomerOpen}
        onOpenChange={setIsAddCustomerOpen}
        onSaveSuccess={(cid) => {
          setFormData({ ...formData, sourceId: cid });
          setIsAddCustomerOpen(false);
        }}
        businessId={businessId!}
        currencySymbol={currencySymbol}
      />

      {/* Quick Add Dealer/Vendor Dialog */}
      <Dialog open={isAddVendorOpen} onOpenChange={setIsAddVendorOpen}>
        <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden rounded-2xl border border-slate-200 text-left w-[95vw] bg-white">
          <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800 text-left">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
                <Truck className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Register Dealer Partner
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 mt-0.5">
                  Contact details and billing address
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  Full Name *
                </Label>
                <Input
                  value={newVendorData.name || ""}
                  onChange={(e) =>
                    setNewVendorData({ ...newVendorData, name: e.target.value })
                  }
                  className="h-11 rounded-xl border-slate-200 font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  WhatsApp *
                </Label>
                <Input
                  value={newVendorData.phone || ""}
                  onChange={(e) =>
                    setNewVendorData({
                      ...newVendorData,
                      phone: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  placeholder="91XXXXXXXX"
                  className="h-11 rounded-xl border-slate-200 font-mono tabular-nums"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  Business Name
                </Label>
                <Input
                  value={newVendorData.businessName || ""}
                  onChange={(e) =>
                    setNewVendorData({
                      ...newVendorData,
                      businessName: e.target.value,
                    })
                  }
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  GSTIN
                </Label>
                <Input
                  value={newVendorData.gstin || ""}
                  onChange={(e) =>
                    setNewVendorData({
                      ...newVendorData,
                      gstin: e.target.value.toUpperCase(),
                    })
                  }
                  className="h-11 rounded-xl font-mono uppercase border-slate-200"
                />
              </div>
            </div>
            <div className="space-y-1.5 text-left">
              <Label className="text-xs font-medium text-slate-600">
                State
              </Label>
              <Select
                value={newVendorData.state || ""}
                onValueChange={(v) =>
                  setNewVendorData({ ...newVendorData, state: v })
                }
              >
                <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 font-medium text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-48">
                  {INDIAN_STATES.map((s) => (
                    <SelectItem key={s} value={s} className="text-sm">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Billing Address
              </Label>
              <Textarea
                value={newVendorData.address || ""}
                onChange={(e) =>
                  setNewVendorData({
                    ...newVendorData,
                    address: e.target.value,
                  })
                }
                className="h-20 rounded-xl border-slate-200 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  Opening Dues ({currencySymbol})
                </Label>
                <Input
                  type="number"
                  value={newVendorData.openingBalance || ""}
                  onChange={(e) =>
                    setNewVendorData({
                      ...newVendorData,
                      openingBalance: e.target.value,
                    })
                  }
                  className="h-11 rounded-xl bg-rose-50/50 text-rose-700 border-rose-200 font-mono tabular-nums font-semibold"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-200">
            <Button
              onClick={handleQuickAddVendor}
              disabled={!newVendorData.name || !newVendorData.phone}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl"
            >
              Save Dealer Partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function NewSolarInquiryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-slate-600 h-8 w-8" />
        </div>
      }
    >
      <NewSolarInquiryContent />
    </Suspense>
  );
}
