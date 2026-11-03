
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { 
  Building, 
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
  Building2 as BuildingIcon, 
  Scaling as ScalingIcon, 
  History, 
  Save, 
  Zap, 
  Droplets, 
  Home, 
  X, 
  User, 
  Users, 
  SmartphoneNfc, 
  Share2, 
  ExternalLink, 
  LandPlot, 
  Calculator, 
  Tag, 
  Scaling, 
  ImageIcon, 
  Route, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Briefcase, 
  ShieldCheck, 
  FileText,
  Trees,
  Lock,
  Globe,
  Navigation,
  Scale,
  Droplet,
  Smartphone,
  Check,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  RefreshCcw,
  UserCog,
  Download,
  ChevronLeft,
  Settings,
  Wheat,
  Video,
  ArrowRightLeft,
  ShieldAlert
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription,
  SheetTrigger
} from "@/components/ui/sheet";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useUser, 
  useDoc, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from "@/firebase";
import { collection, query, orderBy, doc, where, serverTimestamp } from "firebase/firestore";
import Link from "next/link";

const DEFAULT_PROPERTY_IMAGE = "https://placehold.co/800x800/0C83B3/white?text=GW7+Properties";
const CLASSIFICATIONS = ["RESIDENTIAL", "COMMERCIAL", "OTHER"];
const PRODUCT_OPTIONS = ["Khet", "Plot", "Building", "Farmhouse", "Chukta"];

function SectionHeader({ icon: Icon, title, sub }: any) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-8 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary leading-none">{title}</h3>
        {sub && <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1 tracking-widest">{sub}</p>}
      </div>
    </div>
  );
}

export default function PropertyManagementPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const editImageInputRef = useRef<HTMLInputElement>(null);

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const isAdmin = useMemo(() => {
    const role = (userProfile?.role || '').toLowerCase();
    return role === 'admin' || user?.email?.toLowerCase() === 'skillmatrix24@gmail.com';
  }, [userProfile, user]);

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const teamQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null
  , [firestore, businessId]);
  const { data: teamMembersRaw } = useCollection<any>(teamQuery);
  
  const teamMembers = useMemo(() => {
    if (!teamMembersRaw) return [];
    const allowedRoles = business?.propertyMemberRoles || [];
    if (allowedRoles.length === 0) return teamMembersRaw;
    return teamMembersRaw.filter((m: any) => {
        const role = (m.role || '').toLowerCase();
        return allowedRoles.some((ar: string) => ar.toLowerCase() === role);
    });
  }, [teamMembersRaw, business?.propertyMemberRoles]);

  const propertiesQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'properties'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
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
    agentId: "all"
  });

  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [propertyToDeleteId, setPropertyToDeleteId] = useState<string | null>(null);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const assetCategories = business?.assetCategories || PRODUCT_OPTIONS;
  const facingDirections = business?.facingDirections || ["East", "West", "North", "South", "North-East", "North-West", "South-East", "South-West"];
  const landTypes = business?.landTypes || ["Khet", "Khar", "Bharri", "FormHouse", "Factory"];
  const soilTypes = business?.soilTypes || ["Bhura Mitti", "Kala Mitti", "Upjau", "Retili"];
  const cropTypes = business?.cropTypes || ["Single Crop", "Double Crop", "Triple Crop", "Dalhan", "Tilhan"];
  const roadTypes = business?.roadTypes || ["Single Road", "Double Road", "Non-Road"];
  const areaUnits = business?.areaUnits || ["sq.ft", "sq.yd", "Acre", "Guntha", "Bigha"];

  const canEditProperty = (prop: any) => {
    if (!user?.uid || !prop) return false;
    return isAdmin || prop.assignedAgentId === user.uid || prop.createdBy === user.uid;
  };

  const canSeeCompanyPrice = (prop: any) => {
    if (!user?.uid || !prop) return false;
    return isAdmin || prop.assignedAgentId === user.uid;
  };

  const filteredProperties = useMemo(() => {
    return (properties || []).filter((p: any) => {
      const title = p.title || p.propertyId || "";
      const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (p.propertyId && p.propertyId.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = filters.type === "all" || p.type === filters.type;
      const matchesClassification = filters.classification === "all" || p.propertyUse === filters.classification;
      const matchesFacing = filters.facing === "all" || p.facing === filters.facing;
      const matchesRoad = filters.roadType === "all" || p.roadType === filters.roadType;
      const matchesAgent = filters.agentId === "all" || p.assignedAgentId === filters.agentId;
      
      const price = parseFloat(p.marketPrice || p.price || 0);
      const matchesMinPrice = filters.minPrice === "" || price >= parseFloat(filters.minPrice);
      const matchesMaxPrice = filters.maxPrice === "" || price <= parseFloat(filters.maxPrice);

      const size = parseFloat(p.size || p.area || 0);
      const matchesMinSize = filters.minSize === "" || size >= parseFloat(filters.minSize);
      const matchesMaxSize = filters.maxSize === "" || size <= parseFloat(filters.maxSize);
      const matchesSizeUnit = filters.sizeUnit === "all" || p.areaUnit === filters.sizeUnit;

      return matchesSearch && matchesType && matchesClassification && matchesFacing && matchesRoad && matchesAgent && matchesMinPrice && matchesMaxPrice && matchesMinSize && matchesMaxSize && matchesSizeUnit;
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
      toast({ variant: "destructive", title: "Export Error", description: "No items available to export." });
      return;
    }

    const headers = ["Asset ID", "Title", "Type", "Classification", "Market Price", "Rate", "Area/Size", "Unit", "Location", "Facing", "Agent"];
    const csvContent = filteredProperties.map((p: any) => [
      p.propertyId || p.id,
      `"${p.title || 'Untitled'}"`,
      p.type || '',
      p.propertyUse || '',
      p.marketPrice || p.price || 0,
      p.marketRate || p.rate || 0,
      p.size || p.area || 0,
      p.areaUnit || '',
      `"${p.village || p.location || 'N/A'}"`,
      p.facing || '',
      `"${p.agentName || 'N/A'}"`
    ].join(',')).join('\n');

    const fullCsv = [headers.join(','), csvContent].join('\n');
    const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `property_catalog_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Export Initiated", description: "Catalog downloaded as CSV." });
  };

  const handleOpenDetail = (prop: any) => {
    setSelectedProperty(prop);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (prop: any) => {
    if (!canEditProperty(prop)) {
      toast({ variant: "destructive", title: "Locked Node", description: "Only assigned agent or admin can edit this profile." });
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
      mapUrl: prop.mapUrl || ""
    });
    setIsEditModalOpen(true);
  };

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditFormData((prev: any) => ({
            ...prev,
            images: [...(prev.images || []), reader.result as string]
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeEditImage = (index: number) => {
    setEditFormData((prev: any) => ({
      ...prev,
      images: prev.images.filter((_: any, i: number) => i !== index)
    }));
  };

  const handleUpdateProperty = () => {
    if (!businessId || !editFormData.id) return;
    const propRef = doc(firestore, 'businesses', businessId, 'properties', editFormData.id);
    const finalData = {
      ...editFormData,
      images: editFormData.images && editFormData.images.length > 0 ? editFormData.images : [DEFAULT_PROPERTY_IMAGE],
      updatedAt: serverTimestamp()
    };
    updateDocumentNonBlocking(propRef, finalData);
    setIsEditModalOpen(false);
    toast({ title: "Asset Updated" });
  };

  const handleDeleteProperty = () => {
    if (!businessId || !propertyToDeleteId) return;
    deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'properties', propertyToDeleteId));
    setIsDeleteConfirmOpen(false);
    setIsDrawerOpen(false);
    toast({ title: "Asset Deleted", variant: "destructive" });
  };

  const openDeleteConfirm = (id: string) => {
    setPropertyToDeleteId(id);
    setIsDeleteConfirmOpen(true);
  };

  const shareOnWhatsApp = (prop: any) => {
    const type = prop.type || 'Plot';
    const config = business?.waMarketingConfigs?.[type];

    if (!config) {
      const message = `🚀 *Property Alert*\n🏡 *${prop.title}*\n💰 Price: ${currencySymbol}${parseFloat(prop.marketPrice || prop.price || 0).toLocaleString()}\n📍 Location: ${prop.village || prop.location}\n🧭 Facing: ${prop.facing}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
      return;
    }

    const toggles = config.toggles || {};
    let msgParts = [];

    if (config.header) msgParts.push(config.header);
    msgParts.push(`🏡 *${prop.title}*`);

    if (toggles.includeId) msgParts.push(`🆔 ID: ${prop.propertyId || prop.id.slice(-6).toUpperCase()}`);
    if (toggles.includeType) msgParts.push(`🏷️ Type: ${prop.type}`);
    if (toggles.includePrice) msgParts.push(`💰 Price: ${currencySymbol}${parseFloat(prop.marketPrice || prop.price || 0).toLocaleString()}`);
    if (toggles.includeFacing) msgParts.push(`🧭 Facing: ${prop.facing}`);
    if (toggles.includeAgent) msgParts.push(`👤 Agent: ${prop.agentName || 'Owner'}`);
    
    if (type === 'Khet' || type === 'Farmhouse') {
      if (toggles.includeSize) msgParts.push(`📐 Size: ${prop.size} ${prop.areaUnit}`);
      if (toggles.includeRate) msgParts.push(`📈 Rate: ${currencySymbol}${prop.marketRate}/${prop.areaUnit}`);
      if (toggles.includeLandType) msgParts.push(`🌱 Land: ${prop.landType}`);
      if (toggles.includeSoilType) msgParts.push(`🧱 Soil: ${prop.soilType}`);
      if (toggles.includeCropType && prop.cropType) msgParts.push(`🌾 Crop: ${prop.cropType}`);
      if (toggles.includeBor) msgParts.push(`🚰 Bor: ${prop.bor}`);
      if (toggles.includeVillage) msgParts.push(`📍 Village: ${prop.village}`);
      if (toggles.includeDistrict) msgParts.push(`🏛️ District: ${prop.district}`);
      if (toggles.includeRoadType) msgParts.push(`🛣️ Road: ${prop.roadType}`);
    }

    if (type === 'Plot') {
      if (toggles.includeArea) msgParts.push(`📐 Area: ${prop.area} ${prop.areaUnit}`);
      if (toggles.includeRate) msgParts.push(`📈 Rate: ${currencySymbol}${prop.marketRate}/${prop.areaUnit}`);
      if (toggles.includeFront) msgParts.push(`📏 Front: ${prop.front}ft`);
      if (toggles.includeDepth) msgParts.push(`📏 Depth: ${prop.depth}ft`);
      if (toggles.includeDiverted) msgParts.push(`📑 Diverted: ${prop.isDiverted ? 'Yes' : 'No'}`);
      if (toggles.includeRoadWidth) msgParts.push(`🛣️ Road Width: ${prop.roadWidth}ft`);
      if (toggles.includeRoadType) msgParts.push(`🛣️ Road Type: ${prop.roadType}`);
    }

    if (type === 'Building') {
      if (toggles.includeBHK) msgParts.push(`🏠 Config: ${prop.bhk}`);
      if (toggles.includeAge) msgParts.push(`🏗️ Age: ${prop.constructionAge} Yrs`);
      if (toggles.includeLocation) msgParts.push(`📍 Location: ${prop.location}`);
      if (toggles.includeRoadWidth) msgParts.push(`🛣️ Road Width: ${prop.roadWidth}ft`);
    }

    if (toggles.includeDescription && prop.description) {
      msgParts.push(`\n📝 *Details:*\n${prop.description}`);
    }

    if (config.footer) msgParts.push(`\n${config.footer}`);

    const finalMsg = msgParts.join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(finalMsg)}`, '_blank');
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
      agentId: "all"
    });
    setSearchTerm("");
  };

  // Internal Filter Panel for re-use
  const FilterPanelContent = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" /> Filter Node
        </h3>
        <button onClick={resetFilters} className="text-[8px] font-black uppercase text-muted-foreground hover:text-primary">
          Reset All
        </button>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground ml-1 flex items-center gap-2">
            <UserCog className="h-3 w-3" /> Property Agent
          </Label>
          <Select value={filters.agentId} onValueChange={(v) => setFilters({...filters, agentId: v})}>
            <SelectTrigger className="h-10 rounded-xl text-[10px] font-bold uppercase bg-white">
              <SelectValue placeholder="All Members" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-[10px] font-bold uppercase">All Members</SelectItem>
              {(teamMembers || []).map((member: any) => (
                <SelectItem key={member.id} value={member.id} className="text-[10px] font-bold uppercase">{member.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground ml-1">Asset Type</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant={filters.type === 'all' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setFilters({...filters, type: 'all'})}
              className="h-8 text-[9px] font-bold uppercase rounded-lg"
            >
              All Types
            </Button>
            {assetCategories.map((type: string) => (
              <Button 
                key={type}
                variant={filters.type === type ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setFilters({...filters, type: type})}
                className="h-8 text-[9px] font-bold uppercase rounded-lg truncate"
              >
                {type}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground ml-1">Price Range ({currencySymbol})</Label>
          <div className="flex items-center gap-2">
            <Input 
              type="number" 
              placeholder="Min" 
              value={filters.minPrice} 
              onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
              className="h-10 rounded-xl text-xs font-bold bg-white"
            />
            <span className="text-muted-foreground opacity-30">—</span>
            <Input 
              type="number" 
              placeholder="Max" 
              value={filters.maxPrice} 
              onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
              className="h-10 rounded-xl text-xs font-bold bg-white"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground ml-1 flex items-center gap-2">
            <ScalingIcon className="h-3 w-3" /> Property Size
          </Label>
          <div className="flex items-center gap-2">
            <Input 
              type="number" 
              placeholder="Min" 
              value={filters.minSize} 
              onChange={(e) => setFilters({...filters, minSize: e.target.value})}
              className="h-10 rounded-xl text-xs font-bold bg-white"
            />
            <span className="text-muted-foreground opacity-30">—</span>
            <Input 
              type="number" 
              placeholder="Max" 
              value={filters.maxSize} 
              onChange={(e) => setFilters({...filters, maxSize: e.target.value})}
              className="h-10 rounded-xl text-xs font-bold bg-white"
            />
          </div>
          <Select value={filters.sizeUnit} onValueChange={(v) => setFilters({...filters, sizeUnit: v})}>
            <SelectTrigger className="h-10 rounded-xl text-[10px] font-bold uppercase bg-white">
              <SelectValue placeholder="All Units" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-[10px] font-bold uppercase">All Units</SelectItem>
              {areaUnits.map((u: string) => <SelectItem key={u} value={u} className="text-[10px] font-bold uppercase">{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground ml-1">Facing</Label>
          <Select value={filters.facing} onValueChange={(v) => setFilters({...filters, facing: v})}>
            <SelectTrigger className="h-10 rounded-xl text-[10px] font-bold uppercase bg-white">
              <SelectValue placeholder="Select Facing" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-[10px] font-bold uppercase">All Directions</SelectItem>
              {facingDirections.map(d => <SelectItem key={d} value={d} className="text-[10px] font-bold uppercase">{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-10 pb-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
            <BuildingIcon className="h-7 w-7 md:h-8 md:w-8 text-primary" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 leading-tight">Property Catalog</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Asset Registry</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button onClick={handleExport} variant="outline" className="flex-1 sm:flex-none h-11 px-6 rounded-xl border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest shadow-sm bg-white">
            <Download className="mr-2 h-4 w-4" /> Export Node
          </Button>
          <Button asChild className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-[0.2em] rounded-xl text-white">
            <Link href="/properties/new"><Plus className="mr-2 h-4 w-4" /> Add Property</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="hidden lg:block lg:col-span-3 space-y-6">
          <Card className="border-none shadow-sm bg-white rounded-[2rem] border border-border/50 p-6 sticky top-24">
            <FilterPanelContent />
          </Card>
        </div>

        <div className="lg:col-span-9 space-y-6">
          <Card className="border-none shadow-md bg-white rounded-[2rem] border border-border/50 overflow-hidden">
            <CardContent className="p-4 md:p-6 space-y-6">
              <div className="flex flex-col xl:flex-row gap-6 items-stretch xl:items-center justify-between">
                <div className="flex items-stretch lg:items-center gap-4 w-full">
                  <div className="bg-muted/30 p-1 rounded-xl flex gap-1 border border-border/50 shadow-inner shrink-0">
                    <Button variant={activeView === 'card' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveView('card')} className="h-8 px-4 text-[10px] font-bold uppercase rounded-lg"><LayoutGrid className="mr-2 h-3.5 w-3.5" /> Grid</Button>
                    <Button variant={activeView === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveView('list')} className="h-8 px-4 text-[10px] font-bold uppercase rounded-lg"><LayoutList className="mr-2 h-3.5 w-3.5" /> List</Button>
                  </div>
                  
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="lg:hidden h-10 px-4 rounded-xl border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest bg-white">
                        <Filter className="mr-2 h-3.5 w-3.5" /> Filters
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[85vh] rounded-t-[2.5rem] border-none shadow-2xl p-0">
                      <SheetHeader className="p-8 bg-primary text-white shrink-0">
                        <SheetTitle className="text-white text-xl">Property Filters</SheetTitle>
                        <SheetDescription className="text-white/60 text-[10px] uppercase font-bold tracking-widest">Fine-tune your asset search</SheetDescription>
                      </SheetHeader>
                      <ScrollArea className="h-full p-8 pb-32">
                        <FilterPanelContent />
                      </ScrollArea>
                    </SheetContent>
                  </Sheet>

                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
                    <Input placeholder="Quick search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 pl-10 rounded-xl bg-muted/20 border-none shadow-inner text-xs font-bold" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="py-20 text-center opacity-30">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest">Accessing Registry...</p>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed opacity-30">
              <Info className="h-10 w-10 mx-auto mb-4" />
              <p className="text-sm font-black uppercase tracking-widest">No assets match your search</p>
            </div>
          ) : activeView === 'card' ? (
            <div className="space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
                {paginatedProperties.map((prop: any) => {
                  const hasAccess = canSeeCompanyPrice(prop);
                  const canEdit = canEditProperty(prop);
                  const displayImg = (prop.images && prop.images.length > 0) ? prop.images[0] : DEFAULT_PROPERTY_IMAGE;
                  
                  return (
                    <Card key={prop.id} className="border-none shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer bg-white rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden border border-border/50 flex flex-col group">
                      <div className="aspect-[4/3] bg-muted relative overflow-hidden cursor-pointer border-b" onClick={() => handleOpenDetail(prop)}>
                        <img src={displayImg} alt={prop.title} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1">
                          <Badge className="bg-slate-900/80 text-white border-none text-[7px] sm:text-[8px] font-black h-3.5 sm:h-4 px-1.5 sm:px-1.5 uppercase backdrop-blur-md">{prop.type}</Badge>
                        </div>
                      </div>
                      <CardContent className="p-3 sm:p-5 space-y-4 flex-1">
                        <div className="space-y-1.5 sm:space-y-1.5 cursor-pointer" onClick={() => handleOpenDetail(prop)}>
                          <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate tracking-tight leading-none">{prop.title}</h3>
                          <div className="flex items-center gap-1 opacity-60">
                            <MapPin className="h-2.5 w-2.5 text-primary" />
                            <span className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase truncate">{prop.village || prop.location || 'Location...'}</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex flex-col">
                            <p className="text-[7px] sm:text-[8px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1"><Globe className="h-2 w-2" /> Market rate</p>
                            <span className="text-sm sm:text-lg font-black text-green-600 leading-none mt-1">{currencySymbol}{parseFloat(prop.marketRate || prop.rate || 0).toLocaleString()}{prop.type !== 'Chukta' && <span className="text-[10px] ml-1">/{prop.areaUnit}</span>}</span>
                          </div>
                          {hasAccess && (
                            <div className="flex flex-col bg-primary/5 p-2 rounded-xl border border-primary/10">
                              <p className="text-[7px] font-black text-primary uppercase tracking-widest flex items-center gap-1"><Lock className="h-2 w-2" /> Co. rate</p>
                              <span className="text-xs font-black text-primary mt-1">{currencySymbol}{parseFloat(prop.companyRate || 0).toLocaleString()}{prop.type !== 'Chukta' && <span className="text-[10px] ml-1">/{prop.areaUnit}</span>}</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-border/50 flex justify-between items-center mt-auto">
                          <span className="text-[8px] font-bold text-muted-foreground uppercase">By: {prop.agentName || 'Open'}</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={(e) => { e.stopPropagation(); shareOnWhatsApp(prop); }}><SmartphoneNfc className="h-3.5 w-3.5" /></Button>
                            {canEdit && <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={(e) => { e.stopPropagation(); handleOpenEdit(prop); }}><Edit2 className="h-3.5 w-3.5" /></Button>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-8">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <Button
                        key={i}
                        variant={currentPage === i + 1 ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "h-10 w-10 rounded-xl text-[10px] font-black",
                          currentPage === i + 1 ? "bg-primary shadow-lg" : "text-muted-foreground"
                        )}
                        onClick={() => setCurrentPage(i + 1)}
                      >
                        {i + 1}
                      </Button>
                    ))}
                  </div>

                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
                <div className="overflow-x-auto">
                  <Table className="min-w-[1000px]">
                    <TableHeader>
                      <TableRow className="bg-muted/10 border-b">
                        <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Asset & Location</TableHead>
                        <TableHead className="text-[10px] font-black uppercase h-12">Market rate</TableHead>
                        <TableHead className="text-[10px] font-black uppercase h-12">Company rate</TableHead>
                        <TableHead className="text-[10px] font-black uppercase h-12 text-center">Type</TableHead>
                        <TableHead className="text-[10px] font-black uppercase h-12">Assigned Agent</TableHead>
                        <TableHead className="text-right pr-8 h-12 w-32"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProperties.map((prop: any) => {
                         const displayImg = (prop.images && prop.images.length > 0) ? prop.images[0] : DEFAULT_PROPERTY_IMAGE;
                         const hasAccess = canSeeCompanyPrice(prop);
                         const canEdit = canEditProperty(prop);
                         
                         return (
                          <TableRow key={prop.id} className="group hover:bg-muted/5 transition-colors border-b" onClick={() => handleOpenDetail(prop)}>
                            <TableCell className="pl-8 py-5">
                              <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0 shadow-sm border border-border/50">
                                  <img src={displayImg} className="h-full w-full object-cover" alt="" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-900 truncate group-hover:underline">{prop.title}</p>
                                  <p className="text-[10px] text-muted-foreground font-bold flex items-center gap-1 mt-0.5"><MapPin className="h-2.5 w-2.5 text-primary" /> {prop.village || prop.location}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-black text-green-600">{currencySymbol}{parseFloat(prop.marketRate || 0).toLocaleString()}</span>
                            </TableCell>
                            <TableCell>
                              {hasAccess ? (
                                <span className="text-sm font-black text-primary">{currencySymbol}{parseFloat(prop.companyRate || 0).toLocaleString()}</span>
                              ) : (
                                <Badge variant="outline" className="text-[7px] font-black h-4 px-1 text-muted-foreground opacity-30"><Lock className="h-2 w-2 mr-1" /> Locked</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[8px] font-black uppercase h-5 px-2">{prop.type}</Badge>
                            </TableCell>
                            <TableCell>
                               <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{prop.agentName || 'Platform'}</span>
                            </TableCell>
                            <TableCell className="pr-8 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-green-600" onClick={(e) => { e.stopPropagation(); shareOnWhatsApp(prop); }}><SmartphoneNfc className="h-4 w-4" /></Button>
                                {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-primary" onClick={(e) => { e.stopPropagation(); handleOpenEdit(prop); }}><Edit2 className="h-4 w-4" /></Button>}
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
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <Button
                        key={i}
                        variant={currentPage === i + 1 ? "default" : "ghost"}
                        size="sm"
                        className={cn("h-10 w-10 rounded-xl text-[10px] font-black", currentPage === i + 1 ? "bg-primary shadow-lg" : "text-muted-foreground")}
                        onClick={() => setCurrentPage(i + 1)}
                      >
                        {i + 1}
                      </Button>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col border-none shadow-2xl overflow-hidden bg-background">
          {selectedProperty && (
            <>
              <div className="p-8 bg-primary text-white shrink-0 relative">
                <div className="absolute top-0 right-0 p-8 opacity-10"><BuildingIcon className="h-40 w-40" /></div>
                <div className="text-left space-y-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-white/10 text-white border-white/20 uppercase text-[9px] font-black px-3 py-1 tracking-widest">
                      ASSET ID: {selectedProperty.propertyId || selectedProperty.id.slice(-6).toUpperCase()}
                    </Badge>
                    <div className="flex gap-2">
                       {canEditProperty(selectedProperty) && (
                         <>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 border-none text-white" onClick={() => handleOpenEdit(selectedProperty)}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 border-none text-white text-destructive" onClick={() => openDeleteConfirm(selectedProperty.id)}><Trash2 className="h-4 w-4" /></Button>
                         </>
                       )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-6 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-md flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold uppercase opacity-60">Market rate</p>
                        <p className="text-3xl font-black">{currencySymbol}{parseFloat(selectedProperty.marketRate || selectedProperty.rate || 0).toLocaleString()}</p>
                      </div>
                      <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                        <BuildingIcon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <SheetTitle className="text-2xl text-white font-black tracking-tight">{selectedProperty.title}</SheetTitle>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-8 scrollbar-hide">
                <div className="space-y-10 pb-10">
                  {/* Financial Difference (Access-wise) */}
                  {canSeeCompanyPrice(selectedProperty) && (
                    <section className="p-6 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/20 space-y-4 animate-in zoom-in-95 duration-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm"><ArrowRightLeft className="h-5 w-5" /></div>
                          <div>
                            <h4 className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">Price Antar (Difference)</h4>
                            <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Calculated Margin Node</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn("text-2xl font-black", (parseFloat(selectedProperty.marketPrice || 0) - parseFloat(selectedProperty.companyPrice || 0)) >= 0 ? "text-green-600" : "text-red-600")}>
                            {currencySymbol}{(parseFloat(selectedProperty.marketPrice || 0) - parseFloat(selectedProperty.companyPrice || 0)).toLocaleString()}
                          </p>
                          <Badge variant="outline" className="text-[7px] font-black uppercase h-4 px-1.5 border-primary/10 bg-white">Internal Only</Badge>
                        </div>
                      </div>
                      <Separator className="opacity-40" />
                      <div className="grid grid-cols-2 gap-4">
                         <div><p className="text-[8px] font-bold text-muted-foreground uppercase mb-0.5">Market Total</p><p className="text-sm font-black text-slate-900">{currencySymbol}{parseFloat(selectedProperty.marketPrice || 0).toLocaleString()}</p></div>
                         <div className="text-right"><p className="text-[8px] font-bold text-muted-foreground uppercase mb-0.5">Company Total</p><p className="text-sm font-black text-primary">{currencySymbol}{parseFloat(selectedProperty.companyPrice || 0).toLocaleString()}</p></div>
                      </div>
                    </section>
                  )}

                  <section>
                    <SectionHeader icon={Info} title="Asset Identity" sub="Registry meta" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 p-6 bg-muted/10 rounded-3xl border">
                      <div><p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Asset Type</p><p className="text-sm font-black text-primary uppercase">{selectedProperty.type}</p></div>
                      <div><p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Facing</p><p className="text-sm font-black text-slate-900 uppercase">{selectedProperty.facing}</p></div>
                      <div><p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Responsible Agent</p><p className="text-sm font-black text-slate-900">{selectedProperty.agentName || 'Owner'}</p></div>
                      <div><p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Sub Agent / Team</p><p className="text-sm font-bold text-slate-700">{selectedProperty.agentSubName || 'N/A'}</p></div>
                      <div className="sm:col-span-2"><p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Location Details</p><p className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> {selectedProperty.village || selectedProperty.location}</p></div>
                      {selectedProperty.district && <div className="sm:col-span-2"><p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">District Node</p><p className="text-sm font-bold text-slate-700">{selectedProperty.district}</p></div>}
                    </div>
                  </section>

                  <Separator className="opacity-50" />

                  <section>
                    <SectionHeader icon={Calculator} title="Technical Specs" sub="Full registry details" />
                    <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                      {selectedProperty.type === 'Plot' && (
                        <>
                          <div><p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Total Area</p><p className="text-sm font-black text-slate-900">{selectedProperty.area} {selectedProperty.areaUnit}</p></div>
                          <div><p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Dimensions (F x D)</p><p className="text-sm font-black text-slate-900">{selectedProperty.front}ft x {selectedProperty.depth}ft</p></div>
                          <div><p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Road Width</p><p className="text-sm font-bold text-slate-700">{selectedProperty.roadWidth} ft</p></div>
                          <div><p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Diverted Status</p><Badge variant="outline" className={cn("text-[8px] font-black h-4 uppercase", selectedProperty.isDiverted ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700")}>{selectedProperty.isDiverted ? 'Yes' : 'No'}</Badge></div>
                        </>
                      )}
                      {(selectedProperty.type === 'Khet' || selectedProperty.type === 'Farmhouse') && (
                        <>
                          <div><p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Total Size</p><p className="text-sm font-black text-slate-900">{selectedProperty.size} {selectedProperty.areaUnit}</p></div>
                          <div><p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Land Type</p><p className="text-sm font-black text-slate-900 uppercase">{selectedProperty.landType}</p></div>
                          <div><p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Soil Quality</p><p className="text-sm font-black text-slate-900 uppercase">{selectedProperty.soilType}</p></div>
                          <div><p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Borewell Count</p><p className="text-sm font-black text-primary">{selectedProperty.bor}</p></div>
                          <div className="col-span-2"><p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Crop Configuration</p><p className="text-sm font-black text-slate-900 uppercase">{selectedProperty.cropType || 'Single Crop'}</p></div>
                        </>
                      )}
                      {selectedProperty.type === 'Building' && (
                        <>
                          <div><p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">BHK Config</p><p className="text-sm font-black text-slate-900">{selectedProperty.bhk}</p></div>
                          <div><p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Age of Const.</p><p className="text-sm font-black text-slate-900">{selectedProperty.constructionAge} Years</p></div>
                        </>
                      )}
                    </div>
                  </section>

                  {selectedProperty.description && (
                    <section>
                      <SectionHeader icon={FileText} title="Special Remarks" sub="Internal notes" />
                      <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <p className="text-xs text-slate-600 leading-relaxed italic">"{selectedProperty.description}"</p>
                      </div>
                    </section>
                  )}
                  
                  {(selectedProperty.videoUrl || selectedProperty.mapUrl) && (
                    <section className="space-y-4">
                      <SectionHeader icon={ExternalLink} title="Documentation & Access" sub="Quick view links" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedProperty.videoUrl && (
                          <Button asChild variant="outline" className="h-12 rounded-xl justify-between px-4 border-primary/20 text-primary hover:bg-primary/5">
                            <a href={selectedProperty.videoUrl} target="_blank" rel="noopener noreferrer">
                              <span className="text-[10px] font-black uppercase flex items-center gap-2"><Video className="h-4 w-4" /> View Video</span>
                              <ExternalLink className="h-3 w-3 opacity-40" />
                            </a>
                          </Button>
                        )}
                        {selectedProperty.mapUrl && (
                          <Button asChild variant="outline" className="h-12 rounded-xl justify-between px-4 border-primary/20 text-primary hover:bg-primary/5">
                            <a href={selectedProperty.mapUrl} target="_blank" rel="noopener noreferrer">
                              <span className="text-[10px] font-black uppercase flex items-center gap-2"><MapPin className="h-4 w-4" /> Live Map</span>
                              <ExternalLink className="h-3 w-3 opacity-40" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </section>
                  )}
                </div>
              </ScrollArea>

              <div className="p-8 border-t bg-muted/20 flex gap-3 shrink-0">
                <Button variant="outline" className="flex-1 h-14 bg-white font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-sm border-slate-200" onClick={() => setIsDrawerOpen(false)}>Close Registry</Button>
                <Button className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white font-black shadow-xl uppercase tracking-widest text-[11px] gap-2 rounded-2xl" onClick={() => shareOnWhatsApp(selectedProperty)}>
                  <SmartphoneNfc className="h-5 w-5" /> Share Catalog
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* EDIT MODAL */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[750px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl w-[95vw]">
          <DialogHeader className="p-8 bg-primary text-white text-left">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0"><Edit2 className="h-6 w-6" /></div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Registry Node</DialogTitle>
                <p className="text-white/60 text-[9px] font-bold uppercase mt-1">Update asset technical specs</p>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] p-8">
            <div className="space-y-12">
              <section>
                <SectionHeader icon={Briefcase} title="1. Identity Updates" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">Asset Name *</Label><Input value={editFormData.title || ""} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className="h-11 rounded-xl font-bold bg-muted/20 border-none shadow-inner" /></div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Assigned Specialist</Label>
                    <Select value={editFormData.agentName || ""} onValueChange={(v) => { const agent = teamMembers.find(m => m.name === v); setEditFormData({...editFormData, agentName: v, assignedAgentId: agent?.id || editFormData.assignedAgentId}); }}>
                      <SelectTrigger className="h-11 rounded-xl font-bold bg-white"><SelectValue placeholder="Pick Owner" /></SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-2xl">
                        {teamMembers.map((m: any) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">Sub Agent / Team</Label><Input value={editFormData.agentSubName || ""} onChange={(e) => setEditFormData({...editFormData, agentSubName: e.target.value})} className="h-11 rounded-xl font-bold bg-muted/20 border-none shadow-inner" /></div>
                </div>
              </section>

              <section>
                <SectionHeader icon={Calculator} title="2. Pricing Refinement" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-green-600">Market rate (Public)</Label><Input type="number" value={editFormData.marketRate || ""} onChange={(e) => setEditFormData({...editFormData, marketRate: e.target.value})} className="h-11 rounded-xl font-bold" /></div>
                  <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-primary">Company rate (Internal)</Label><Input type="number" value={editFormData.companyRate || ""} onChange={(e) => setEditFormData({...editFormData, companyRate: e.target.value})} className="h-11 rounded-xl font-bold bg-primary/5" /></div>
                </div>
              </section>

              <section className="p-6 bg-muted/20 rounded-[2rem] border">
                <SectionHeader icon={Settings} title="3. Technical Parameters" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(editFormData.type === 'Khet' || editFormData.type === 'Farmhouse') && (
                    <>
                      <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">District</Label><Input value={editFormData.district || ""} onChange={(e) => setEditFormData({...editFormData, district: e.target.value})} className="h-11 rounded-xl bg-white shadow-sm" /></div>
                      <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Village</Label><Input value={editFormData.village || ""} onChange={(e) => setEditFormData({...editFormData, village: e.target.value})} className="h-11 rounded-xl bg-white shadow-sm" /></div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold uppercase">Land Type</Label>
                        <Select value={editFormData.landType || "Khet"} onValueChange={(v) => setEditFormData({...editFormData, landType: v})}>
                          <SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">{landTypes.map(l => <SelectItem key={l} value={l} className="text-xs font-bold">{l}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold uppercase">Soil Type</Label>
                        <Select value={editFormData.soilType || "Upjau"} onValueChange={(v) => setEditFormData({...editFormData, soilType: v})}>
                          <SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">{soilTypes.map(l => <SelectItem key={l} value={l} className="text-xs font-bold">{l}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold uppercase">Crop Type</Label>
                        <Select value={editFormData.cropType || "Single Crop"} onValueChange={(v) => setEditFormData({...editFormData, cropType: v})}>
                          <SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">{cropTypes.map(l => <SelectItem key={l} value={l} className="text-xs font-bold">{l}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  {editFormData.type === 'Plot' && (
                    <>
                      <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Area ({editFormData.areaUnit})</Label><Input type="number" value={editFormData.area || ""} onChange={(e) => setEditFormData({...editFormData, area: e.target.value})} className="h-11 rounded-xl bg-white shadow-sm" /></div>
                      <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Front (ft)</Label><Input type="number" value={editFormData.front || ""} onChange={(e) => setEditFormData({...editFormData, front: e.target.value})} className="h-11 rounded-xl bg-white shadow-sm" /></div>
                      <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Depth (ft)</Label><Input type="number" value={editFormData.depth || ""} onChange={(e) => setEditFormData({...editFormData, depth: e.target.value})} className="h-11 rounded-xl bg-white shadow-sm" /></div>
                    </>
                  )}
                </div>
              </section>

              <section>
                <SectionHeader icon={ImageIcon} title="4. Media Documentation" />
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {editFormData.images?.map((img: string, i: number) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden border">
                        <img src={img} className="w-full h-full object-cover" alt="" />
                        <Button variant="destructive" size="icon" className="h-6 w-6 absolute top-1 right-1 rounded-full" onClick={() => removeEditImage(i)}><X className="h-3 w-3" /></Button>
                      </div>
                    ))}
                    <button onClick={() => editImageInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-1 group hover:border-primary/40">
                      <Plus className="h-5 w-5 text-primary" />
                      <span className="text-[8px] font-black uppercase">Add Photo</span>
                    </button>
                    <input type="file" ref={editImageInputRef} className="hidden" accept="image/*" multiple onChange={handleEditImageUpload} />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase opacity-60">Video Link</Label>
                      <Input value={editFormData.videoUrl || ""} onChange={(e) => setEditFormData({...editFormData, videoUrl: e.target.value})} placeholder="YouTube/Drive URL" className="h-10 rounded-xl text-xs bg-muted/20 border-none shadow-inner" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase opacity-60">Google Maps Link</Label>
                      <Input value={editFormData.mapUrl || ""} onChange={(e) => setEditFormData({...editFormData, mapUrl: e.target.value})} placeholder="Location URL" className="h-10 rounded-xl text-xs bg-muted/20 border-none shadow-inner" />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </ScrollArea>
          <DialogFooter className="p-8 bg-muted/10 border-t">
            <Button className="w-full h-14 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl text-white" onClick={handleUpdateProperty}>Commit Registry Updates</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8">
          <AlertDialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-4">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-xl font-black">Erase Registry Node?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-slate-500 leading-relaxed uppercase tracking-tight">
              Permanently remove this asset from your catalog? This action cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex gap-3">
            <AlertDialogCancel asChild><Button variant="outline" className="flex-1 h-12 rounded-xl font-bold uppercase text-[10px]">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction asChild><Button onClick={handleDeleteProperty} className="flex-1 h-12 rounded-xl font-black uppercase bg-destructive hover:bg-destructive/90 text-white border-none shadow-lg text-[10px]">Delete Asset</Button></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
