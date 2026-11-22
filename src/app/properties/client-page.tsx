"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Building2 as BuildingIcon,
  Plus,
  Search,
  MapPin,
  Edit2,
  Trash2,
  Loader2,
  LayoutGrid,
  LayoutList,
  ChevronRight,
  Info,
  Scaling as ScalingIcon,
  X,
  SmartphoneNfc,
  ExternalLink,
  Calculator,
  Briefcase,
  Lock,
  Globe,
  Filter,
  SlidersHorizontal,
  UserCog,
  Download,
  ChevronLeft,
  Settings,
  Video,
  ArrowRightLeft,
  ShieldAlert,
  ImageIcon,
  FileText,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  PageHeader,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase";
import {
  collection,
  query,
  orderBy,
  doc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import Link from "next/link";

const PRODUCT_OPTIONS = ["Khet", "Plot", "Building", "Farmhouse", "Chukta"];

function ModalSectionHeader({
  icon: Icon,
  title,
  sub,
}: {
  icon: any;
  title: string;
  sub?: string;
}) {
  return (
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
}

export default function PropertyManagementPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const editImageInputRef = useRef<HTMLInputElement>(null);

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const isAdmin = useMemo(() => {
    const role = (userProfile?.role || "").toLowerCase();
    return (
      role === "admin" ||
      user?.email?.toLowerCase() === "skillmatrix24@gmail.com"
    );
  }, [userProfile, user]);

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
  const { data: teamMembersRaw } = useCollection<any>(teamQuery);

  const teamMembers = useMemo(() => {
    if (!teamMembersRaw) return [];
    const allowedRoles = business?.propertyMemberRoles || [];
    if (allowedRoles.length === 0) return teamMembersRaw;
    return teamMembersRaw.filter((m: any) => {
      const role = (m.role || "").toLowerCase();
      return allowedRoles.some((ar: string) => ar.toLowerCase() === role);
    });
  }, [teamMembersRaw, business?.propertyMemberRoles]);

  const propertiesQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "properties"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: properties = [], isLoading } = useCollection<any>(propertiesQuery);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState<"card" | "list">("card");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const [filters, setFilters] = useState({
    type: "all",
    classification: "all",
    minPrice: "",
    maxPrice: "",
    minSize: "",
    maxSize: "",
    sizeUnit: "all",
    facing: "all",
    roadType: "all",
    agentId: "all",
  });

  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [propertyToDeleteId, setPropertyToDeleteId] = useState<string | null>(
    null
  );

  const currencySymbol = getCurrencySymbol(business?.currency);

  const assetCategories: string[] =
    business?.assetCategories || PRODUCT_OPTIONS;
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
  const areaUnits: string[] = business?.areaUnits || [
    "sq.ft",
    "sq.yd",
    "Acre",
    "Guntha",
    "Bigha",
  ];

  const canEditProperty = (prop: any) => {
    if (!user?.uid || !prop) return false;
    return (
      isAdmin ||
      prop.assignedAgentId === user.uid ||
      prop.createdBy === user.uid
    );
  };

  const canSeeCompanyPrice = (prop: any) => {
    if (!user?.uid || !prop) return false;
    return isAdmin || prop.assignedAgentId === user.uid;
  };

  const filteredProperties = useMemo(() => {
    return (properties || []).filter((p: any) => {
      const title = p.title || p.propertyId || "";
      const matchesSearch =
        title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.propertyId &&
          p.propertyId.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = filters.type === "all" || p.type === filters.type;
      const matchesClassification =
        filters.classification === "all" ||
        p.propertyUse === filters.classification;
      const matchesFacing =
        filters.facing === "all" || p.facing === filters.facing;
      const matchesRoad =
        filters.roadType === "all" || p.roadType === filters.roadType;
      const matchesAgent =
        filters.agentId === "all" || p.assignedAgentId === filters.agentId;

      const price = parseFloat(p.marketPrice || p.price || 0);
      const matchesMinPrice =
        filters.minPrice === "" || price >= parseFloat(filters.minPrice);
      const matchesMaxPrice =
        filters.maxPrice === "" || price <= parseFloat(filters.maxPrice);

      const size = parseFloat(p.size || p.area || 0);
      const matchesMinSize =
        filters.minSize === "" || size >= parseFloat(filters.minSize);
      const matchesMaxSize =
        filters.maxSize === "" || size <= parseFloat(filters.maxSize);
      const matchesSizeUnit =
        filters.sizeUnit === "all" || p.areaUnit === filters.sizeUnit;

      return (
        matchesSearch &&
        matchesType &&
        matchesClassification &&
        matchesFacing &&
        matchesRoad &&
        matchesAgent &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesMinSize &&
        matchesMaxSize &&
        matchesSizeUnit
      );
    });
  }, [properties, searchTerm, filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
  const paginatedProperties = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProperties.slice(start, start + itemsPerPage);
  }, [filteredProperties, currentPage]);

  const handleExport = () => {
    if (!filteredProperties || filteredProperties.length === 0) {
      toast({
        variant: "destructive",
        title: "Export Error",
        description: "No items available to export.",
      });
      return;
    }

    const headers = [
      "Asset ID",
      "Title",
      "Type",
      "Classification",
      "Market Price",
      "Rate",
      "Area/Size",
      "Unit",
      "Location",
      "Facing",
      "Agent",
    ];
    const csvContent = filteredProperties
      .map((p: any) =>
        [
          p.propertyId || p.id,
          `"${p.title || "Untitled"}"`,
          p.type || "",
          p.propertyUse || "",
          p.marketPrice || p.price || 0,
          p.marketRate || p.rate || 0,
          p.size || p.area || 0,
          p.areaUnit || "",
          `"${p.village || p.location || "N/A"}"`,
          p.facing || "",
          `"${p.agentName || "N/A"}"`,
        ].join(",")
      )
      .join("\n");

    const fullCsv = [headers.join(","), csvContent].join("\n");
    const blob = new Blob([fullCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `property_catalog_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Export Ready", description: "Catalog downloaded as CSV." });
  };

  const handleOpenDetail = (prop: any) => {
    setSelectedProperty(prop);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (prop: any) => {
    if (!canEditProperty(prop)) {
      toast({
        variant: "destructive",
        title: "Access Restricted",
        description: "Only assigned agent or admin can edit this listing.",
      });
      return;
    }
    setEditFormData({
      ...prop,
      images: prop.images || [],
      depth: prop.depth || "",
      front: prop.front || "",
      areaUnit: prop.areaUnit || "sq.ft",
      marketRate: prop.marketRate || prop.rate || "",
      companyRate: prop.companyRate || "",
      marketPrice: prop.marketPrice || prop.price || "",
      companyPrice: prop.companyPrice || "",
      facing: prop.facing || "East",
      propertyUse: prop.propertyUse || "RESIDENTIAL",
      category: prop.category || "General",
      landType: prop.landType || "Khet",
      soilType: prop.soilType || "Upjau",
      cropType: prop.cropType || "Single Crop",
      videoUrl: prop.videoUrl || "",
      mapUrl: prop.mapUrl || "",
    });
    setIsEditModalOpen(true);
  };

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditFormData((prev: any) => ({
            ...prev,
            images: [...(prev.images || []), reader.result as string],
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeEditImage = (index: number) => {
    setEditFormData((prev: any) => ({
      ...prev,
      images: prev.images.filter((_: any, i: number) => i !== index),
    }));
  };

  const handleUpdateProperty = () => {
    if (!businessId || !editFormData.id) return;
    const propRef = doc(
      firestore,
      "businesses",
      businessId,
      "properties",
      editFormData.id
    );
    const finalData = {
      ...editFormData,
      images: editFormData.images || [],
      updatedAt: serverTimestamp(),
    };
    updateDocumentNonBlocking(propRef, finalData);
    setIsEditModalOpen(false);
    toast({ title: "Asset Updated" });
  };

  const handleDeleteProperty = () => {
    if (!businessId || !propertyToDeleteId) return;
    deleteDocumentNonBlocking(
      doc(firestore, "businesses", businessId, "properties", propertyToDeleteId)
    );
    setIsDeleteConfirmOpen(false);
    setIsDrawerOpen(false);
    toast({ title: "Asset Deleted", variant: "destructive" });
  };

  const openDeleteConfirm = (id: string) => {
    setPropertyToDeleteId(id);
    setIsDeleteConfirmOpen(true);
  };

  const getWhatsAppShareUrl = (prop: any) => {
    const type = prop.type || "Plot";
    const config = business?.waMarketingConfigs?.[type];

    if (!config) {
      const message = `Property Alert\n*${prop.title}*\nPrice: ${currencySymbol}${parseFloat(
        prop.marketPrice || prop.price || 0
      ).toLocaleString()}\nLocation: ${
        prop.village || prop.location || "N/A"
      }\nFacing: ${prop.facing || "N/A"}`;
      return `https://wa.me/?text=${encodeURIComponent(message)}`;
    }

    const toggles = config.toggles || {};
    const msgParts: string[] = [];

    if (config.header) msgParts.push(config.header);
    msgParts.push(`*${prop.title}*`);

    if (toggles.includeId)
      msgParts.push(
        `ID: ${prop.propertyId || prop.id.slice(-6).toUpperCase()}`
      );
    if (toggles.includeType) msgParts.push(`Type: ${prop.type}`);
    if (toggles.includePrice)
      msgParts.push(
        `Price: ${currencySymbol}${parseFloat(
          prop.marketPrice || prop.price || 0
        ).toLocaleString()}`
      );
    if (toggles.includeFacing) msgParts.push(`Facing: ${prop.facing}`);
    if (toggles.includeAgent)
      msgParts.push(`Agent: ${prop.agentName || "Owner"}`);

    if (type === "Khet" || type === "Farmhouse") {
      if (toggles.includeSize)
        msgParts.push(`Size: ${prop.size} ${prop.areaUnit}`);
      if (toggles.includeRate)
        msgParts.push(
          `Rate: ${currencySymbol}${prop.marketRate}/${prop.areaUnit}`
        );
      if (toggles.includeLandType) msgParts.push(`Land: ${prop.landType}`);
      if (toggles.includeSoilType) msgParts.push(`Soil: ${prop.soilType}`);
      if (toggles.includeCropType && prop.cropType)
        msgParts.push(`Crop: ${prop.cropType}`);
      if (toggles.includeBor) msgParts.push(`Borewell: ${prop.bor}`);
      if (toggles.includeVillage) msgParts.push(`Village: ${prop.village}`);
      if (toggles.includeDistrict) msgParts.push(`District: ${prop.district}`);
      if (toggles.includeRoadType) msgParts.push(`Road: ${prop.roadType}`);
    }

    if (type === "Plot") {
      if (toggles.includeArea)
        msgParts.push(`Area: ${prop.area} ${prop.areaUnit}`);
      if (toggles.includeRate)
        msgParts.push(
          `Rate: ${currencySymbol}${prop.marketRate}/${prop.areaUnit}`
        );
      if (toggles.includeFront) msgParts.push(`Front: ${prop.front}ft`);
      if (toggles.includeDepth) msgParts.push(`Depth: ${prop.depth}ft`);
      if (toggles.includeDiverted)
        msgParts.push(`Diverted: ${prop.isDiverted ? "Yes" : "No"}`);
      if (toggles.includeRoadWidth)
        msgParts.push(`Road Width: ${prop.roadWidth}ft`);
      if (toggles.includeRoadType) msgParts.push(`Road Type: ${prop.roadType}`);
    }

    if (type === "Building") {
      if (toggles.includeBHK) msgParts.push(`Config: ${prop.bhk}`);
      if (toggles.includeAge)
        msgParts.push(`Age: ${prop.constructionAge} Yrs`);
      if (toggles.includeLocation) msgParts.push(`Location: ${prop.location}`);
      if (toggles.includeRoadWidth)
        msgParts.push(`Road Width: ${prop.roadWidth}ft`);
    }

    if (toggles.includeDescription && prop.description) {
      msgParts.push(`\n*Details:*\n${prop.description}`);
    }

    if (config.footer) msgParts.push(`\n${config.footer}`);

    return `https://wa.me/?text=${encodeURIComponent(msgParts.join("\n"))}`;
  };

  const resetFilters = () => {
    setFilters({
      type: "all",
      classification: "all",
      minPrice: "",
      maxPrice: "",
      minSize: "",
      maxSize: "",
      sizeUnit: "all",
      facing: "all",
      roadType: "all",
      agentId: "all",
    });
    setSearchTerm("");
  };

  const isFiltered = Boolean(
    filters.type !== "all" ||
    filters.agentId !== "all" ||
    filters.facing !== "all" ||
    filters.sizeUnit !== "all" ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.minSize ||
    filters.maxSize ||
    searchTerm
  );

  const renderFilterPanel = () => (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <SlidersHorizontal className="h-4 w-4 text-slate-600" /> Filters
        </h3>
        <button
          type="button"
          onClick={resetFilters}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          Reset All
        </button>
      </div>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <UserCog className="h-3.5 w-3.5 text-slate-500" /> Property Agent
          </Label>
          <Select
            value={filters.agentId}
            onValueChange={(v) => setFilters({ ...filters, agentId: v })}
          >
            <SelectTrigger className="h-10 rounded-xl border border-slate-300 bg-white text-xs font-medium shadow-xs hover:border-slate-400">
              <SelectValue placeholder="All Members" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-slate-300 shadow-md">
              <SelectItem value="all" className="text-xs font-medium">
                All Members
              </SelectItem>
              {(teamMembers || []).map((member: any) => (
                <SelectItem key={member.id} value={member.id} className="text-xs">
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">
            Asset Type
          </Label>
          <Select
            value={filters.type}
            onValueChange={(v) => setFilters({ ...filters, type: v })}
          >
            <SelectTrigger className="h-10 rounded-xl border border-slate-300 bg-white text-xs font-medium shadow-xs hover:border-slate-400">
              <SelectValue placeholder="All Asset Types" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-slate-300 shadow-md">
              <SelectItem value="all" className="text-xs font-medium">
                All Types
              </SelectItem>
              {assetCategories.map((type: string) => (
                <SelectItem key={type} value={type} className="text-xs">
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">
            Price Range ({currencySymbol})
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) =>
                setFilters({ ...filters, minPrice: e.target.value })
              }
              className="h-10 rounded-xl border border-slate-300 bg-white text-xs shadow-xs hover:border-slate-400 focus-visible:ring-1 focus-visible:ring-slate-900"
            />
            <span className="text-slate-400 font-bold">-</span>
            <Input
              type="number"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) =>
                setFilters({ ...filters, maxPrice: e.target.value })
              }
              className="h-10 rounded-xl border border-slate-300 bg-white text-xs shadow-xs hover:border-slate-400 focus-visible:ring-1 focus-visible:ring-slate-900"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <ScalingIcon className="h-3.5 w-3.5 text-slate-500" /> Property Size
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.minSize}
              onChange={(e) =>
                setFilters({ ...filters, minSize: e.target.value })
              }
              className="h-10 rounded-xl border border-slate-300 bg-white text-xs shadow-xs hover:border-slate-400 focus-visible:ring-1 focus-visible:ring-slate-900"
            />
            <span className="text-slate-400 font-bold">-</span>
            <Input
              type="number"
              placeholder="Max"
              value={filters.maxSize}
              onChange={(e) =>
                setFilters({ ...filters, maxSize: e.target.value })
              }
              className="h-10 rounded-xl border border-slate-300 bg-white text-xs shadow-xs hover:border-slate-400 focus-visible:ring-1 focus-visible:ring-slate-900"
            />
          </div>
          <Select
            value={filters.sizeUnit}
            onValueChange={(v) => setFilters({ ...filters, sizeUnit: v })}
          >
            <SelectTrigger className="h-10 rounded-xl border border-slate-300 bg-white text-xs shadow-xs hover:border-slate-400">
              <SelectValue placeholder="All Units" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-slate-300 shadow-md">
              <SelectItem value="all" className="text-xs font-medium">
                All Units
              </SelectItem>
              {areaUnits.map((u: string) => (
                <SelectItem key={u} value={u} className="text-xs">
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Facing</Label>
          <Select
            value={filters.facing}
            onValueChange={(v) => setFilters({ ...filters, facing: v })}
          >
            <SelectTrigger className="h-10 rounded-xl border border-slate-300 bg-white text-xs shadow-xs hover:border-slate-400">
              <SelectValue placeholder="Select Facing" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-slate-300 shadow-md">
              <SelectItem value="all" className="text-xs font-medium">
                All Directions
              </SelectItem>
              {facingDirections.map((d) => (
                <SelectItem key={d} value={d} className="text-xs">
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const getValidImage = (prop: any) => {
    const first = prop?.images?.[0];
    if (!first || typeof first !== "string" || first.includes("placehold.co")) {
      return null;
    }
    return first;
  };

  return (
    <div className="space-y-6 pb-16 text-left">
      <PageHeader
        breadcrumb="Real Estate CRM"
        title="Property Catalog"
        description="Manage listed plots, agricultural land, farmhouses, and buildings."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleExport}
              variant="outline"
              className="h-10 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-400"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
            <Button
              asChild
              className="h-10 rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 shadow-xs"
            >
              <Link href="/properties/new">
                <Plus className="mr-1.5 h-4 w-4" /> Add Property
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="hidden lg:col-span-3 lg:block">
          <SectionCard className="sticky top-24">{renderFilterPanel()}</SectionCard>
        </div>

        <div className="space-y-5 lg:col-span-9">
          <Card className="rounded-2xl border border-slate-300 bg-white p-4 shadow-xs">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex shrink-0 gap-1 rounded-xl border border-slate-300 bg-slate-100/90 p-1 shadow-xs">
                    <Button
                      type="button"
                      variant={activeView === "card" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setActiveView("card")}
                      className="h-8 rounded-lg px-3 text-xs font-semibold"
                    >
                      <LayoutGrid className="mr-1.5 h-3.5 w-3.5" /> Grid
                    </Button>
                    <Button
                      type="button"
                      variant={activeView === "list" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setActiveView("list")}
                      className="h-8 rounded-lg px-3 text-xs font-semibold"
                    >
                      <LayoutList className="mr-1.5 h-3.5 w-3.5" /> List
                    </Button>
                  </div>

                  {/* Asset Type Dropdown Filter */}
                  <div className="w-full sm:w-44">
                    <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
                      <SelectTrigger className="h-10 rounded-xl border border-slate-300 bg-white text-xs font-semibold shadow-xs hover:border-slate-400 focus:ring-1 focus:ring-slate-900">
                        <BuildingIcon className="mr-2 h-3.5 w-3.5 text-slate-600 shrink-0" />
                        <SelectValue placeholder="All Asset Types" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-slate-300 shadow-md">
                        <SelectItem value="all" className="text-xs font-medium">All Types</SelectItem>
                        {assetCategories.map((type: string) => (
                          <SelectItem key={type} value={type} className="text-xs">
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Property Agent Dropdown Filter */}
                  <div className="w-full sm:w-44">
                    <Select value={filters.agentId} onValueChange={(v) => setFilters({ ...filters, agentId: v })}>
                      <SelectTrigger className="h-10 rounded-xl border border-slate-300 bg-white text-xs font-semibold shadow-xs hover:border-slate-400 focus:ring-1 focus:ring-slate-900">
                        <UserCog className="mr-2 h-3.5 w-3.5 text-slate-600 shrink-0" />
                        <SelectValue placeholder="All Agents" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-slate-300 shadow-md">
                        <SelectItem value="all" className="text-xs font-medium">All Agents</SelectItem>
                        {(teamMembers || []).map((member: any) => (
                          <SelectItem key={member.id} value={member.id} className="text-xs">
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-10 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-400"
                      >
                        <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" /> All Filters
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
                      <SheetHeader className="border-b border-slate-800 bg-slate-900 p-6 text-left text-white">
                        <SheetTitle className="text-lg font-semibold text-white">
                          Property Filters
                        </SheetTitle>
                        <SheetDescription className="text-xs text-slate-300">
                          Refine listings by type, price, size, facing, and agent
                        </SheetDescription>
                      </SheetHeader>
                      <ScrollArea className="h-full p-6 pb-28">
                        {renderFilterPanel()}
                      </ScrollArea>
                    </SheetContent>
                  </Sheet>

                  {isFiltered && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={resetFilters}
                      className="h-10 px-3 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" /> Clear
                    </Button>
                  )}
                </div>

                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search by title, location, or asset ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 rounded-xl border border-slate-300 bg-white pl-9 text-xs shadow-xs hover:border-slate-400 focus-visible:ring-1 focus-visible:ring-slate-900"
                  />
                </div>
              </div>
            </div>
          </Card>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-slate-400" />
              <p className="text-xs font-medium text-slate-500">
                Loading properties...
              </p>
            </div>
          ) : filteredProperties.length === 0 ? (
            <EmptyStatePanel
              icon={Info}
              title="No matching properties"
              description="Adjust your filters or add a new property listing."
              action={
                <Button asChild size="sm" className="rounded-xl">
                  <Link href="/properties/new">Add Property</Link>
                </Button>
              }
            />
          ) : activeView === "card" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {paginatedProperties.map((prop: any) => {
                  const hasAccess = canSeeCompanyPrice(prop);
                  const canEdit = canEditProperty(prop);
                  const validImg = getValidImage(prop);

                  return (
                    <Card
                      key={prop.id}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white transition-all shadow-xs hover:shadow-md hover:border-slate-400"
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(prop)}
                        className="relative aspect-[4/3] w-full overflow-hidden border-b border-slate-200 bg-slate-100 text-left"
                      >
                        {validImg ? (
                          <img
                            src={validImg}
                            referrerPolicy="no-referrer"
                            alt={prop.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                            <BuildingIcon className="h-8 w-8" />
                            <span className="text-xs font-medium">
                              {prop.type || "Property"}
                            </span>
                          </div>
                        )}
                        <div className="absolute left-3 top-3">
                          <Badge className="border-none bg-slate-900/85 text-[11px] font-medium text-white shadow-xs">
                            {prop.type}
                          </Badge>
                        </div>
                      </button>

                      <CardContent className="flex flex-1 flex-col space-y-3 p-4">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(prop)}
                          className="space-y-1 text-left"
                        >
                          <h3 className="truncate text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">
                            {prop.title}
                          </h3>
                          <div className="flex items-center gap-1 text-slate-500">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate text-xs">
                              {prop.village || prop.location || "Location pending"}
                            </span>
                          </div>
                        </button>

                        <div className="space-y-2">
                          <div>
                            <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                              <Globe className="h-3 w-3" /> Market Rate
                            </p>
                            <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-emerald-700">
                              {currencySymbol}
                              {parseFloat(
                                prop.marketRate || prop.rate || 0
                              ).toLocaleString()}
                              {prop.type !== "Chukta" && (
                                <span className="ml-1 text-xs font-normal text-slate-500">
                                  /{prop.areaUnit}
                                </span>
                              )}
                            </p>
                          </div>

                          {hasAccess && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                              <p className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
                                <Lock className="h-3 w-3" /> Company Rate
                              </p>
                              <p className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-slate-900">
                                {currencySymbol}
                                {parseFloat(
                                  prop.companyRate || 0
                                ).toLocaleString()}
                                {prop.type !== "Chukta" && (
                                  <span className="ml-1 text-[11px] font-normal text-slate-500">
                                    /{prop.areaUnit}
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-auto flex items-center justify-between border-t border-slate-200 pt-3">
                          <span className="text-xs text-slate-600 font-medium truncate max-w-[140px]">
                            Agent: {prop.agentName || "Open"}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              aria-label={`Share ${prop.title} on WhatsApp`}
                              className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-50"
                            >
                              <a
                                href={getWhatsAppShareUrl(prop)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <SmartphoneNfc className="h-4 w-4" />
                              </a>
                            </Button>
                            {canEdit && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Edit ${prop.title}`}
                                className="h-8 w-8 rounded-lg text-slate-600 hover:bg-slate-100"
                                onClick={() => handleOpenEdit(prop)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Previous page"
                    className="h-9 w-9 rounded-xl border border-slate-300 shadow-xs"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <Button
                      key={i}
                      type="button"
                      variant={currentPage === i + 1 ? "default" : "outline"}
                      size="sm"
                      className="h-9 w-9 rounded-xl font-mono text-xs border border-slate-300 shadow-xs"
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Next page"
                    className="h-9 w-9 rounded-xl border border-slate-300 shadow-xs"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Card className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <Table className="min-w-[820px]">
                    <TableHeader>
                      <TableRow className="border-b border-slate-200 bg-slate-100">
                        <TableHead className="h-11 pl-6 text-xs font-bold text-slate-800">
                          Asset & Location
                        </TableHead>
                        <TableHead className="h-11 text-xs font-bold text-slate-800">
                          Market Rate
                        </TableHead>
                        <TableHead className="h-11 text-xs font-bold text-slate-800">
                          Company Rate
                        </TableHead>
                        <TableHead className="h-11 text-center text-xs font-bold text-slate-800">
                          Type
                        </TableHead>
                        <TableHead className="h-11 text-xs font-bold text-slate-800">
                          Assigned Agent
                        </TableHead>
                        <TableHead className="h-11 w-28 pr-6 text-right text-xs font-bold text-slate-800">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProperties.map((prop: any) => {
                        const validImg = getValidImage(prop);
                        const hasAccess = canSeeCompanyPrice(prop);
                        const canEdit = canEditProperty(prop);

                        return (
                          <TableRow
                            key={prop.id}
                            className="cursor-pointer border-b border-slate-200/80 transition-colors hover:bg-slate-50/70"
                            onClick={() => handleOpenDetail(prop)}
                          >
                            <TableCell className="py-4 pl-6">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-300 bg-slate-100 text-slate-400">
                                  {validImg ? (
                                    <img
                                      src={validImg}
                                      referrerPolicy="no-referrer"
                                      className="h-full w-full object-cover"
                                      alt={prop.title}
                                    />
                                  ) : (
                                    <BuildingIcon className="h-4 w-4" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {prop.title}
                                  </p>
                                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                                    <MapPin className="h-3 w-3" />{" "}
                                    {prop.village || prop.location || "N/A"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm font-semibold tabular-nums text-emerald-700">
                                {currencySymbol}
                                {parseFloat(
                                  prop.marketRate || 0
                                ).toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              {hasAccess ? (
                                <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                                  {currencySymbol}
                                  {parseFloat(
                                    prop.companyRate || 0
                                  ).toLocaleString()}
                                </span>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="rounded-md text-xs font-medium text-slate-400"
                                >
                                  <Lock className="mr-1 h-3 w-3" /> Restricted
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="secondary"
                                className="rounded-md bg-slate-100 text-xs font-medium text-slate-700"
                              >
                                {prop.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-medium text-slate-700">
                                {prop.agentName || "Open"}
                              </span>
                            </TableCell>
                            <TableCell
                              className="pr-6 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex justify-end gap-1">
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Share ${prop.title}`}
                                  className="h-8 w-8 rounded-lg text-emerald-600"
                                >
                                  <a
                                    href={getWhatsAppShareUrl(prop)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <SmartphoneNfc className="h-4 w-4" />
                                  </a>
                                </Button>
                                {canEdit && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Edit ${prop.title}`}
                                    className="h-8 w-8 rounded-lg text-slate-600"
                                    onClick={() => handleOpenEdit(prop)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Previous page"
                    className="h-9 w-9 rounded-xl"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <Button
                      key={i}
                      type="button"
                      variant={currentPage === i + 1 ? "default" : "ghost"}
                      size="sm"
                      className="h-9 w-9 rounded-xl font-mono text-xs"
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Next page"
                    className="h-9 w-9 rounded-xl"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail Sheet */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-xl">
          {selectedProperty && (
            <>
              <div className="shrink-0 border-b border-slate-800 bg-slate-900 p-6 text-white">
                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="rounded-md border-white/20 bg-white/10 font-mono text-xs text-white"
                    >
                      ASSET ID:{" "}
                      {selectedProperty.propertyId ||
                        selectedProperty.id.slice(-6).toUpperCase()}
                    </Badge>
                    {canEditProperty(selectedProperty) && (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Edit property"
                          className="h-8 w-8 rounded-lg bg-white/10 text-white hover:bg-white/20"
                          onClick={() => handleOpenEdit(selectedProperty)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Delete property"
                          className="h-8 w-8 rounded-lg bg-white/10 text-red-300 hover:bg-white/20"
                          onClick={() => openDeleteConfirm(selectedProperty.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/15 bg-white/10 p-4">
                    <div>
                      <p className="text-xs text-slate-300">Market Rate</p>
                      <p className="font-mono text-2xl font-bold tabular-nums text-white">
                        {currencySymbol}
                        {parseFloat(
                          selectedProperty.marketRate ||
                            selectedProperty.rate ||
                            0
                        ).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                      <BuildingIcon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <SheetTitle className="text-xl font-semibold text-white">
                    {selectedProperty.title}
                  </SheetTitle>
                </div>
              </div>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6 pb-8">
                  {canSeeCompanyPrice(selectedProperty) && (
                    <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                            <ArrowRightLeft className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900">
                              Price Margin (Antar)
                            </h4>
                            <p className="text-xs text-slate-500">
                              Market vs Company Total
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={cn(
                              "font-mono text-xl font-bold tabular-nums",
                              parseFloat(selectedProperty.marketPrice || 0) -
                                parseFloat(selectedProperty.companyPrice || 0) >=
                                0
                                ? "text-emerald-700"
                                : "text-red-600"
                            )}
                          >
                            {currencySymbol}
                            {(
                              parseFloat(selectedProperty.marketPrice || 0) -
                              parseFloat(selectedProperty.companyPrice || 0)
                            ).toLocaleString()}
                          </p>
                          <Badge variant="outline" className="rounded-md text-[11px]">
                            Internal Only
                          </Badge>
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-500">Market Total</p>
                          <p className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                            {currencySymbol}
                            {parseFloat(
                              selectedProperty.marketPrice || 0
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Company Total</p>
                          <p className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                            {currencySymbol}
                            {parseFloat(
                              selectedProperty.companyPrice || 0
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </section>
                  )}

                  <section>
                    <ModalSectionHeader
                      icon={Info}
                      title="Asset Identity"
                      sub="Listing ownership and location"
                    />
                    <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-slate-500">Asset Type</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {selectedProperty.type}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Facing</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {selectedProperty.facing}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Responsible Agent</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {selectedProperty.agentName || "Owner"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Sub Agent</p>
                        <p className="text-sm font-medium text-slate-700">
                          {selectedProperty.agentSubName || "N/A"}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs text-slate-500">Location</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-slate-800">
                          <MapPin className="h-3.5 w-3.5 text-slate-500" />{" "}
                          {selectedProperty.village ||
                            selectedProperty.location ||
                            "N/A"}
                        </p>
                      </div>
                      {selectedProperty.district && (
                        <div className="sm:col-span-2">
                          <p className="text-xs text-slate-500">District</p>
                          <p className="text-sm font-medium text-slate-800">
                            {selectedProperty.district}
                          </p>
                        </div>
                      )}
                    </div>
                  </section>

                  <section>
                    <ModalSectionHeader
                      icon={Calculator}
                      title="Technical Specifications"
                      sub="Dimensions and site profile"
                    />
                    <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 p-4">
                      {selectedProperty.type === "Plot" && (
                        <>
                          <div>
                            <p className="text-xs text-slate-500">Total Area</p>
                            <p className="font-mono text-sm font-semibold text-slate-900">
                              {selectedProperty.area} {selectedProperty.areaUnit}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Dimensions</p>
                            <p className="font-mono text-sm font-semibold text-slate-900">
                              {selectedProperty.front}ft x{" "}
                              {selectedProperty.depth}ft
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Road Width</p>
                            <p className="font-mono text-sm font-medium text-slate-800">
                              {selectedProperty.roadWidth} ft
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Diverted</p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "mt-0.5 rounded-md text-xs",
                                selectedProperty.isDiverted
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                              )}
                            >
                              {selectedProperty.isDiverted ? "Yes" : "No"}
                            </Badge>
                          </div>
                        </>
                      )}
                      {(selectedProperty.type === "Khet" ||
                        selectedProperty.type === "Farmhouse") && (
                        <>
                          <div>
                            <p className="text-xs text-slate-500">Total Size</p>
                            <p className="font-mono text-sm font-semibold text-slate-900">
                              {selectedProperty.size} {selectedProperty.areaUnit}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Land Type</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {selectedProperty.landType}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Soil Quality</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {selectedProperty.soilType}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Borewells</p>
                            <p className="font-mono text-sm font-semibold text-slate-900">
                              {selectedProperty.bor}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-slate-500">
                              Crop Configuration
                            </p>
                            <p className="text-sm font-semibold text-slate-900">
                              {selectedProperty.cropType || "Single Crop"}
                            </p>
                          </div>
                        </>
                      )}
                      {selectedProperty.type === "Building" && (
                        <>
                          <div>
                            <p className="text-xs text-slate-500">BHK Config</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {selectedProperty.bhk}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">
                              Construction Age
                            </p>
                            <p className="font-mono text-sm font-semibold text-slate-900">
                              {selectedProperty.constructionAge} Years
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </section>

                  {selectedProperty.description && (
                    <section>
                      <ModalSectionHeader
                        icon={FileText}
                        title="Special Remarks"
                      />
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs leading-relaxed text-slate-700">
                          &ldquo;{selectedProperty.description}&rdquo;
                        </p>
                      </div>
                    </section>
                  )}

                  {(selectedProperty.videoUrl || selectedProperty.mapUrl) && (
                    <section>
                      <ModalSectionHeader
                        icon={ExternalLink}
                        title="Media & Map Links"
                      />
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {selectedProperty.videoUrl && (
                          <Button
                            asChild
                            variant="outline"
                            className="h-10 justify-between rounded-xl px-4 text-xs"
                          >
                            <a
                              href={selectedProperty.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <span className="flex items-center gap-2 font-medium">
                                <Video className="h-4 w-4" /> View Video
                              </span>
                              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                            </a>
                          </Button>
                        )}
                        {selectedProperty.mapUrl && (
                          <Button
                            asChild
                            variant="outline"
                            className="h-10 justify-between rounded-xl px-4 text-xs"
                          >
                            <a
                              href={selectedProperty.mapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <span className="flex items-center gap-2 font-medium">
                                <MapPin className="h-4 w-4" /> Open Map
                              </span>
                              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </section>
                  )}
                </div>
              </ScrollArea>

              <div className="flex shrink-0 gap-3 border-t border-slate-100 bg-slate-50/70 p-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1 rounded-xl bg-white text-xs font-semibold"
                  onClick={() => setIsDrawerOpen(false)}
                >
                  Close
                </Button>
                <Button
                  asChild
                  className="h-10 flex-1 gap-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <a
                    href={getWhatsAppShareUrl(selectedProperty)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <SmartphoneNfc className="h-4 w-4" /> Share on WhatsApp
                  </a>
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="w-[95vw] overflow-hidden rounded-2xl border-slate-200 p-0 sm:max-w-[750px]">
          <DialogHeader className="border-b border-slate-800 bg-slate-900 p-6 text-left text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                <Edit2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-white">
                  Edit Property Listing
                </DialogTitle>
                <p className="text-xs text-slate-300">
                  Update property pricing, assignment, and technical parameters
                </p>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] p-6">
            <div className="space-y-8">
              <section>
                <ModalSectionHeader icon={Briefcase} title="1. Identity Updates" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Property Title *
                    </Label>
                    <Input
                      value={editFormData.title || ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          title: e.target.value,
                        })
                      }
                      className="h-10 rounded-xl border-slate-200 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Assigned Agent
                    </Label>
                    <Select
                      value={editFormData.agentName || ""}
                      onValueChange={(v) => {
                        const agent = teamMembers.find((m) => m.name === v);
                        setEditFormData({
                          ...editFormData,
                          agentName: v,
                          assignedAgentId:
                            agent?.id || editFormData.assignedAgentId,
                        });
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs">
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
                      Sub Agent
                    </Label>
                    <Input
                      value={editFormData.agentSubName || ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          agentSubName: e.target.value,
                        })
                      }
                      className="h-10 rounded-xl border-slate-200 text-sm"
                    />
                  </div>
                </div>
              </section>

              <section>
                <ModalSectionHeader
                  icon={Calculator}
                  title="2. Pricing Refinement"
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-emerald-700">
                      Market Rate (Public)
                    </Label>
                    <Input
                      type="number"
                      value={editFormData.marketRate || ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          marketRate: e.target.value,
                        })
                      }
                      className="h-10 rounded-xl font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Company Rate (Internal)
                    </Label>
                    <Input
                      type="number"
                      value={editFormData.companyRate || ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          companyRate: e.target.value,
                        })
                      }
                      className="h-10 rounded-xl bg-slate-50 font-mono text-sm"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <ModalSectionHeader
                  icon={Settings}
                  title="3. Technical Parameters"
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(editFormData.type === "Khet" ||
                    editFormData.type === "Farmhouse") && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-700">
                          District
                        </Label>
                        <Input
                          value={editFormData.district || ""}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              district: e.target.value,
                            })
                          }
                          className="h-10 rounded-xl bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-700">
                          Village
                        </Label>
                        <Input
                          value={editFormData.village || ""}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              village: e.target.value,
                            })
                          }
                          className="h-10 rounded-xl bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-700">
                          Land Type
                        </Label>
                        <Select
                          value={editFormData.landType || "Khet"}
                          onValueChange={(v) =>
                            setEditFormData({ ...editFormData, landType: v })
                          }
                        >
                          <SelectTrigger className="h-10 rounded-xl bg-white text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {landTypes.map((l) => (
                              <SelectItem key={l} value={l} className="text-xs">
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
                          value={editFormData.soilType || "Upjau"}
                          onValueChange={(v) =>
                            setEditFormData({ ...editFormData, soilType: v })
                          }
                        >
                          <SelectTrigger className="h-10 rounded-xl bg-white text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {soilTypes.map((l) => (
                              <SelectItem key={l} value={l} className="text-xs">
                                {l}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-700">
                          Crop Type
                        </Label>
                        <Select
                          value={editFormData.cropType || "Single Crop"}
                          onValueChange={(v) =>
                            setEditFormData({ ...editFormData, cropType: v })
                          }
                        >
                          <SelectTrigger className="h-10 rounded-xl bg-white text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {cropTypes.map((l) => (
                              <SelectItem key={l} value={l} className="text-xs">
                                {l}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  {editFormData.type === "Plot" && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-700">
                          Area ({editFormData.areaUnit})
                        </Label>
                        <Input
                          type="number"
                          value={editFormData.area || ""}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              area: e.target.value,
                            })
                          }
                          className="h-10 rounded-xl bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-700">
                          Front (ft)
                        </Label>
                        <Input
                          type="number"
                          value={editFormData.front || ""}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              front: e.target.value,
                            })
                          }
                          className="h-10 rounded-xl bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-700">
                          Depth (ft)
                        </Label>
                        <Input
                          type="number"
                          value={editFormData.depth || ""}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              depth: e.target.value,
                            })
                          }
                          className="h-10 rounded-xl bg-white"
                        />
                      </div>
                    </>
                  )}
                </div>
              </section>

              <section>
                <ModalSectionHeader
                  icon={ImageIcon}
                  title="4. Media Documentation"
                />
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {editFormData.images?.map((img: string, i: number) => (
                      <div
                        key={i}
                        className="relative aspect-square overflow-hidden rounded-xl border border-slate-200"
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
                          className="absolute right-1.5 top-1.5 h-6 w-6 rounded-full"
                          onClick={() => removeEditImage(i)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => editImageInputRef.current?.click()}
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-slate-400"
                    >
                      <Plus className="h-5 w-5 text-slate-600" />
                      <span className="text-xs font-medium text-slate-600">
                        Add Photo
                      </span>
                    </button>
                    <input
                      type="file"
                      ref={editImageInputRef}
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleEditImageUpload}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Video Link
                      </Label>
                      <Input
                        value={editFormData.videoUrl || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            videoUrl: e.target.value,
                          })
                        }
                        placeholder="YouTube/Drive URL"
                        className="h-10 rounded-xl text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Google Maps Link
                      </Label>
                      <Input
                        value={editFormData.mapUrl || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            mapUrl: e.target.value,
                          })
                        }
                        placeholder="Location URL"
                        className="h-10 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </ScrollArea>

          <DialogFooter className="border-t border-slate-100 bg-slate-50/70 p-5">
            <Button
              type="button"
              className="h-10 w-full rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
              onClick={handleUpdateProperty}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
      >
        <AlertDialogContent className="rounded-2xl border-slate-200 p-6">
          <AlertDialogHeader>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-lg font-semibold text-slate-900">
              Delete Property Listing?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600">
              Permanently remove this asset from your property catalog? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-3">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="h-10 flex-1 rounded-xl text-xs">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={handleDeleteProperty}
                className="h-10 flex-1 rounded-xl bg-red-600 text-xs text-white hover:bg-red-700"
              >
                Delete Property
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
