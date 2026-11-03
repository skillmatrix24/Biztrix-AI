"use client";

import { useState, useMemo, useRef, useEffect, useTransition } from "react";
import { 
  Search, 
  Plus, 
  Filter, 
  Package,
  TrendingUp,
  AlertTriangle,
  Download,
  Upload,
  BarChart3,
  History,
  Edit2, 
  Trash2, 
  Info,
  MoreVertical,
  PlusCircle,
  MinusCircle,
  Barcode,
  ImageIcon,
  Tag,
  Monitor,
  Layout,
  ChevronDown,
  ChevronUp,
  Settings,
  Scale,
  RefreshCw,
  Layers,
  Check,
  ArrowRightLeft,
  Settings2,
  PlusSquare,
  ScanLine,
  Sparkles,
  Camera,
  Star,
  Award,
  X,
  Loader2,
  Calculator,
  Coins,
  ShieldAlert,
  ShieldCheck,
  Hash,
  AlertCircle,
  Truck,
  Video,
  Wand2,
  Eye,
  EyeOff,
  Archive,
  RotateCcw,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  SelectSeparator
} from "@/components/ui/select";
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Product, Vendor } from "@/lib/mock-db";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import Link from "next/link";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useUser, 
  useDoc
} from "@/firebase";
import { collection, doc, query, orderBy, limit } from "firebase/firestore";
import { differenceInDays, parseISO, format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { suggestProductMeta } from "@/ai/flows/suggest-product-meta";
import { 
  createMerchantProduct, 
  updateMerchantProduct, 
  archiveMerchantProduct, 
  restoreMerchantProduct, 
  adjustProductStock, 
  fetchStockHistory 
} from "@/app/actions/product-actions";

const DEFAULT_UNITS = ["pcs", "kg", "box", "packet", "unit", "litre", "meter"];
const DEFAULT_GST_SLABS = [0, 5, 12, 18, 28];
const DEFAULT_HSN = ["8471", "8517", "8544", "9403"];
const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500KB
const DEFAULT_PRODUCT_IMAGE = "https://placehold.co/800x800/0C83B3/white?text=Biztrix+OS";

export default function InventoryPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);

  const businessId = userProfile?.businessId;
  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const limitsRef = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return doc(firestore, 'system', 'config', 'limits', 'default');
  }, [firestore, user?.uid]);
  const { data: globalLimits } = useDoc<any>(limitsRef);

  const currencySymbol = getCurrencySymbol(business?.currency);

  // Safe bounded query (limit 200) to prevent unbounded memory reads
  const productsQuery = useMemoFirebase(() => 
    businessId ? query(
      collection(firestore, 'businesses', businessId, 'products'),
      limit(200)
    ) : null
  , [firestore, businessId]);
  const { data: rawProducts, isLoading } = useCollection<Product>(productsQuery);
  const productList = useMemo(() => (Array.isArray(rawProducts) ? rawProducts : []), [rawProducts]);

  const vendorsQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'vendors') : null, [firestore, businessId]);
  const { data: vendorListData } = useCollection<Vendor>(vendorsQuery);
  const vendorList = vendorListData || [];

  const isLimitReached = useMemo(() => {
    if (!business || !globalLimits) return false;
    if (business.status === 'active' || business.status === 'pro') return false;
    return productList.length >= (globalLimits.maxProducts || 50);
  }, [business, globalLimits, productList.length]);

  const isTrialExpired = useMemo(() => {
    if (business?.status !== 'trial') return false;
    if (!business?.trialEndDate) return false;
    
    const endDate = business.trialEndDate?.toDate 
      ? business.trialEndDate.toDate() 
      : (typeof business.trialEndDate === 'string' ? parseISO(business.trialEndDate) : new Date());
      
    return differenceInDays(endDate, new Date()) < 0;
  }, [business]);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // 'all' | 'in_stock' | 'low' | 'out_of_stock'
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'archived'
  const [storefrontFilter, setStorefrontFilter] = useState("all"); // 'all' | 'visible' | 'featured' | 'bestseller'
  const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'name' | 'stock_high' | 'stock_low' | 'price_high'
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & Drawers
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isArchiveAlertOpen, setIsArchiveAlertOpen] = useState(false);
  const [productToArchive, setProductToArchive] = useState<Product | null>(null);
  const [archiveReason, setArchiveReason] = useState("");

  // Stock Adjustment Dialog State
  const [isStockAdjustOpen, setIsStockAdjustOpen] = useState(false);
  const [adjustTargetProduct, setAdjustTargetProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract' | 'set'>('add');
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("Received shipment / restock");
  const [isAdjustingStock, startStockAdjustTransition] = useTransition();

  // Stock History Drawer Tab State
  const [stockAuditLogs, setStockAuditLogs] = useState<any[]>([]);
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(false);

  // Product Form States (Add / Edit)
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formUnit, setFormUnit] = useState("pcs");
  const [formGst, setFormGst] = useState("18");
  const [formHsn, setFormHsn] = useState("");
  const [formCost, setFormCost] = useState("");
  const [formPrice, setFormPrice] = useState(""); // Base MRP
  const [formOnlinePrice, setFormOnlinePrice] = useState(""); // Storefront price
  const [formStock, setFormStock] = useState("");
  const [formMinThreshold, setFormMinThreshold] = useState("5");
  const [formVendorId, setFormVendorId] = useState("none");
  const [formDescription, setFormDescription] = useState("");
  const [formBatchNumber, setFormBatchNumber] = useState("");
  const [formExpiryDate, setFormExpiryDate] = useState("");
  const [formVideoUrl, setFormVideoUrl] = useState("");
  const [formImages, setFormImages] = useState<string[]>([]);
  
  // Storefront catalog controls
  const [formShowOnWebsite, setFormShowOnWebsite] = useState(false);
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formIsBestSeller, setFormIsBestSeller] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);

  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [isSubmittingForm, startFormTransition] = useTransition();

  const nameInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Focus and default GST
  useEffect(() => {
    if (isAddProductOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
      if (business?.defaultGstRate) {
        setFormGst(business.defaultGstRate.toString());
      }
    }
  }, [isAddProductOpen, business?.defaultGstRate]);

  // Dynamic Category Extraction from existing products
  const existingCategories = useMemo(() => {
    const set = new Set<string>(["General", "Electronics", "Solar", "Accessories", "Hardware", "Services"]);
    productList.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [productList]);

  // Comprehensive Filtering & Sorting Logic
  const filteredProducts = useMemo(() => {
    return productList
      .filter(p => {
        // Search Filter (Name, SKU, Description, Category)
        const term = searchTerm.toLowerCase().trim();
        const matchesSearch = !term || 
          p.name.toLowerCase().includes(term) ||
          (p.sku || "").toLowerCase().includes(term) ||
          (p.category || "").toLowerCase().includes(term) ||
          (p.description || "").toLowerCase().includes(term);

        if (!matchesSearch) return false;

        // Stock Filter
        if (stockFilter === "low") {
          if (!(p.stock <= p.minThreshold && p.stock > 0)) return false;
        } else if (stockFilter === "out_of_stock") {
          if (p.stock > 0) return false;
        } else if (stockFilter === "in_stock") {
          if (p.stock <= p.minThreshold) return false;
        }

        // Category Filter
        if (categoryFilter !== "all" && p.category !== categoryFilter) {
          return false;
        }

        // Active / Archived Filter
        if (statusFilter === "active" && (p.isArchived || !p.isActive)) return false;
        if (statusFilter === "archived" && !p.isArchived) return false;

        // Storefront Visibility Filter
        if (storefrontFilter === "visible" && !p.showOnWebsite) return false;
        if (storefrontFilter === "featured" && !p.isFeatured) return false;
        if (storefrontFilter === "bestseller" && !p.isBestSeller) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        } else if (sortBy === "stock_high") {
          return (b.stock || 0) - (a.stock || 0);
        } else if (sortBy === "stock_low") {
          return (a.stock || 0) - (b.stock || 0);
        } else if (sortBy === "price_high") {
          return (b.price || 0) - (a.price || 0);
        } else if (sortBy === "price_low") {
          return (a.price || 0) - (b.price || 0);
        } else {
          // Default: newest first or ID
          return (b.id || "").localeCompare(a.id || "");
        }
      });
  }, [productList, searchTerm, stockFilter, categoryFilter, statusFilter, storefrontFilter, sortBy]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Overall Inventory Registry Metrics
  const stats = useMemo(() => {
    const totalItems = productList.length;
    const activeItems = productList.filter(p => !p.isArchived && p.isActive).length;
    const lowStockCount = productList.filter(p => !p.isArchived && p.stock <= p.minThreshold && p.stock > 0).length;
    const outOfStockCount = productList.filter(p => !p.isArchived && p.stock <= 0).length;
    const totalValuation = productList.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0);
    const onlineCatalogCount = productList.filter(p => !p.isArchived && p.showOnWebsite).length;

    return { totalItems, activeItems, lowStockCount, outOfStockCount, totalValuation, onlineCatalogCount };
  }, [productList]);

  // Computed Form Margin
  const formMarginPercent = useMemo(() => {
    const cost = parseFloat(formCost) || 0;
    const price = parseFloat(formPrice) || 0;
    if (cost === 0 || price === 0) return 0;
    return Math.round(((price - cost) / cost) * 100);
  }, [formCost, formPrice]);

  // Computed Form Discount
  const formDiscountPercent = useMemo(() => {
    const base = parseFloat(formPrice) || 0;
    const online = parseFloat(formOnlinePrice) || 0;
    if (base > online && base > 0 && online > 0) {
      return Math.round(((base - online) / base) * 100);
    }
    return 0;
  }, [formPrice, formOnlinePrice]);

  const handleAiSuggest = async () => {
    if (!formName.trim()) {
      toast({ variant: "destructive", title: "Product Name Missing", description: "Please enter a name first." });
      return;
    }
    setIsAiSuggesting(true);
    try {
      const result = await suggestProductMeta({ productName: formName });
      setFormHsn(result.hsnCode);
      setFormGst(result.gstRate.toString());
      setFormDescription(result.description);
      toast({ title: "AI Meta Suggested", description: "HSN, GST slab, and description auto-populated." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "AI Suggestion Failed", description: "Please enter manually." });
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          toast({ variant: "destructive", title: "Image Too Large", description: `${file.name} exceeds 500KB. Please compress before upload.` });
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormSku("");
    setFormCategory("General");
    setFormPrice("");
    setFormOnlinePrice("");
    setFormCost("");
    setFormStock("");
    setFormMinThreshold("5");
    setFormUnit("pcs");
    setFormGst(business?.defaultGstRate?.toString() || "18");
    setFormHsn("");
    setFormVendorId("none");
    setFormDescription("");
    setFormBatchNumber("");
    setFormExpiryDate("");
    setFormVideoUrl("");
    setFormImages([]);
    setFormShowOnWebsite(false);
    setFormIsFeatured(false);
    setFormIsBestSeller(false);
    setFormIsActive(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    setSelectedProduct(p);
    setFormName(p.name);
    setFormSku(p.sku);
    setFormCategory(p.category || "General");
    setFormPrice(p.price.toString());
    setFormOnlinePrice((p.onlinePrice !== undefined ? p.onlinePrice : p.price).toString());
    setFormCost(p.cost?.toString() || "");
    setFormStock(p.stock.toString());
    setFormMinThreshold(p.minThreshold.toString());
    setFormUnit(p.unit || "pcs");
    setFormGst(p.gstRate.toString());
    setFormHsn(p.hsnCode || "");
    setFormVendorId(p.vendorId || "none");
    setFormDescription(p.description || "");
    setFormBatchNumber(p.batchNumber || "");
    setFormExpiryDate(p.expiryDate || "");
    setFormVideoUrl(p.videoUrl || "");
    setFormImages(p.images && p.images.length > 0 ? p.images : []);
    setFormShowOnWebsite(Boolean(p.showOnWebsite));
    setFormIsFeatured(Boolean(p.isFeatured));
    setFormIsBestSeller(Boolean(p.isBestSeller));
    setFormIsActive(p.isActive !== undefined ? Boolean(p.isActive) : true);
    setIsEditProductOpen(true);
  };

  // Submit Product (Create or Update via Server Actions)
  const handleSubmitProduct = () => {
    if (isTrialExpired || isLimitReached) return;
    if (!formName.trim() || !formPrice || !businessId || !user?.uid) {
      toast({ variant: "destructive", title: "Missing Information", description: "Product name and sale price are required." });
      return;
    }

    startFormTransition(async () => {
      const idToken = await user.getIdToken();

      if (selectedProduct) {
        // UPDATE EXISTING PRODUCT
        const res = await updateMerchantProduct({
          userId: user.uid,
          businessId,
          productId: selectedProduct.id,
          idToken,
          name: formName.trim(),
          sku: formSku.trim(),
          category: formCategory.trim(),
          price: parseFloat(formPrice),
          onlinePrice: formOnlinePrice ? parseFloat(formOnlinePrice) : parseFloat(formPrice),
          cost: formCost ? parseFloat(formCost) : undefined,
          minThreshold: parseInt(formMinThreshold, 10),
          gstRate: parseFloat(formGst),
          unit: formUnit,
          hsnCode: formHsn.trim(),
          vendorId: formVendorId !== "none" ? formVendorId : undefined,
          vendorName: formVendorId !== "none" ? (vendorList.find((v: any) => v.id === formVendorId)?.name || "") : undefined,
          description: formDescription.trim(),
          batchNumber: formBatchNumber.trim(),
          expiryDate: formExpiryDate.trim(),
          videoUrl: formVideoUrl.trim(),
          images: formImages.length > 0 ? formImages : [DEFAULT_PRODUCT_IMAGE],
          showOnWebsite: formShowOnWebsite,
          isFeatured: formIsFeatured,
          isBestSeller: formIsBestSeller,
          isActive: formIsActive
        });

        if (res.success) {
          toast({ title: "Product Updated", description: res.message });
          setIsEditProductOpen(false);
          resetForm();
          setSelectedProduct(null);
        } else {
          toast({ variant: "destructive", title: "Update Failed", description: res.error });
        }
      } else {
        // CREATE NEW PRODUCT
        const res = await createMerchantProduct({
          userId: user.uid,
          businessId,
          idToken,
          name: formName.trim(),
          sku: formSku.trim(),
          category: formCategory.trim(),
          price: parseFloat(formPrice),
          onlinePrice: formOnlinePrice ? parseFloat(formOnlinePrice) : parseFloat(formPrice),
          cost: formCost ? parseFloat(formCost) : undefined,
          stock: parseInt(formStock || "0", 10),
          minThreshold: parseInt(formMinThreshold, 10),
          gstRate: parseFloat(formGst),
          unit: formUnit,
          hsnCode: formHsn.trim(),
          vendorId: formVendorId !== "none" ? formVendorId : undefined,
          vendorName: formVendorId !== "none" ? (vendorList.find((v: any) => v.id === formVendorId)?.name || "") : undefined,
          description: formDescription.trim(),
          batchNumber: formBatchNumber.trim(),
          expiryDate: formExpiryDate.trim(),
          videoUrl: formVideoUrl.trim(),
          images: formImages.length > 0 ? formImages : [DEFAULT_PRODUCT_IMAGE],
          showOnWebsite: formShowOnWebsite,
          isFeatured: formIsFeatured,
          isBestSeller: formIsBestSeller,
          isActive: formIsActive
        });

        if (res.success) {
          toast({ title: "Product Created", description: res.message });
          setIsAddProductOpen(false);
          resetForm();
          setSelectedProduct(null);
        } else {
          toast({ variant: "destructive", title: "Creation Failed", description: res.error });
        }
      }
    });
  };

  // Safe Archiving Handler
  const openArchiveDialog = (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    setProductToArchive(p);
    setArchiveReason("Archived by merchant");
    setIsArchiveAlertOpen(true);
  };

  const handleConfirmArchive = () => {
    if (!businessId || !productToArchive || !user?.uid) return;
    startFormTransition(async () => {
      const idToken = await user.getIdToken();
      const res = await archiveMerchantProduct({
        userId: user.uid,
        businessId,
        productId: productToArchive.id,
        reason: archiveReason.trim() || "Archived by merchant",
        idToken
      });

      if (res.success) {
        toast({ title: "Product Archived", description: res.message });
        setIsArchiveAlertOpen(false);
        setProductToArchive(null);
        setIsDrawerOpen(false);
      } else {
        toast({ variant: "destructive", title: "Archiving Failed", description: res.error });
      }
    });
  };

  const handleRestoreProduct = (p: Product) => {
    if (!businessId || !user?.uid) return;
    startFormTransition(async () => {
      const idToken = await user.getIdToken();
      const res = await restoreMerchantProduct({
        userId: user.uid,
        businessId,
        productId: p.id,
        idToken
      });

      if (res.success) {
        toast({ title: "Product Restored", description: res.message });
        if (selectedProduct?.id === p.id) {
          setIsDrawerOpen(false);
          setSelectedProduct(null);
        }
      } else {
        toast({ variant: "destructive", title: "Restore Failed", description: res.error });
      }
    });
  };

  // Quick Stock Adjustment Dialog Trigger
  const openQuickStockAdjust = (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    setAdjustTargetProduct(p);
    setAdjustType('add');
    setAdjustQty("");
    setAdjustReason("Received shipment / restock");
    setIsStockAdjustOpen(true);
  };

  const handleExecuteStockAdjust = () => {
    if (!businessId || !adjustTargetProduct || !user?.uid) return;
    const qty = parseInt(adjustQty, 10);
    if (isNaN(qty) || qty <= 0) {
      toast({ variant: "destructive", title: "Invalid Quantity", description: "Please enter a positive whole number." });
      return;
    }

    startStockAdjustTransition(async () => {
      const idToken = await user.getIdToken();
      const res = await adjustProductStock({
        userId: user.uid,
        businessId,
        productId: adjustTargetProduct.id,
        adjustmentType: adjustType,
        quantity: qty,
        reason: adjustReason.trim() || "Manual merchant stock adjustment",
        idToken
      });

      if (res.success) {
        toast({ title: "Stock Updated", description: res.message });
        setIsStockAdjustOpen(false);
        setAdjustTargetProduct(null);
        // Refresh audit logs if drawer is open for this product
        if (selectedProduct?.id === adjustTargetProduct.id) {
          loadStockAudit(adjustTargetProduct.id);
        }
      } else {
        toast({ variant: "destructive", title: "Adjustment Rejected", description: res.error });
      }
    });
  };

  // Load Stock History for Drawer
  const loadStockAudit = async (productId: string) => {
    if (!businessId) return;
    setIsLoadingAuditLogs(true);
    try {
      const res = await fetchStockHistory({ businessId, productId, limitCount: 20 });
      if (res.success) {
        setStockAuditLogs(res.history);
      }
    } finally {
      setIsLoadingAuditLogs(false);
    }
  };

  const handleSelectProductForDrawer = (p: Product) => {
    setSelectedProduct(p);
    setIsDrawerOpen(true);
    loadStockAudit(p.id);
  };

  const dynamicUnits = business?.baseUnits || DEFAULT_UNITS;
  const dynamicGstSlabs = business?.gstSlabs || DEFAULT_GST_SLABS;

  return (
    <div className="space-y-6 md:space-y-8 pb-10 text-left">
      {isTrialExpired && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle className="font-bold">Trial Expired</AlertTitle>
          <AlertDescription className="text-xs">
            Your 14-day trial has ended. Inventory is currently in read-only mode. <Link href="/settings/subscription" className="font-bold underline">Upgrade now</Link> to resume management.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
            <Package className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Master Inventory</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">
              Catalog, Stock Safety & Storefront Controls
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isAddProductOpen} onOpenChange={(o) => { setIsAddProductOpen(o); if(!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button disabled={isTrialExpired || isLimitReached} className="bg-primary hover:bg-primary/90 shadow-xl h-11 px-6 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
                <Plus className="mr-1.5 h-4 w-4" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[850px] p-0 overflow-hidden w-[95vw] rounded-3xl border-none shadow-2xl">
              <DialogHeader className="p-6 md:p-8 bg-primary text-white text-left shrink-0">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                    <PlusSquare className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <DialogTitle className="text-xl font-black uppercase">Create Catalog Product</DialogTitle>
                    <DialogDescription className="text-white/80 text-[10px] font-bold uppercase tracking-widest mt-1">
                      Authoritative Ledger • Storefront Visibility • Safe Stock Thresholds
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="max-h-[75vh]">
                {renderProductFormBody()}
              </ScrollArea>

              <DialogFooter className="p-6 bg-muted/10 border-t">
                <Button 
                  onClick={handleSubmitProduct} 
                  disabled={isSubmittingForm} 
                  className="w-full h-14 bg-primary font-black uppercase text-xs tracking-wider rounded-xl shadow-xl text-white"
                >
                  {isSubmittingForm ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Save Product to Catalog
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border border-border/50 text-left">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Catalog Items</p>
          <div className="text-2xl font-black text-slate-900">{stats.totalItems} SKUs</div>
          <p className="text-[10px] text-muted-foreground font-semibold mt-1">
            <span className="text-primary font-bold">{stats.onlineCatalogCount}</span> visible on storefront
          </p>
        </Card>

        <Card className={cn(
          "border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 text-left transition-all", 
          stats.lowStockCount > 0 ? "border-l-amber-500 bg-amber-50/40" : "border-l-emerald-500"
        )}>
          <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", stats.lowStockCount > 0 ? "text-amber-700 font-bold" : "text-muted-foreground")}>
            Low Stock Alerts
          </p>
          <div className={cn("text-2xl font-black", stats.lowStockCount > 0 ? "text-amber-800" : "text-slate-900")}>
            {stats.lowStockCount} Products
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold mt-1">Below safety threshold</p>
        </Card>

        <Card className={cn(
          "border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 text-left transition-all", 
          stats.outOfStockCount > 0 ? "border-l-rose-500 bg-rose-50/40" : "border-l-indigo-500"
        )}>
          <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", stats.outOfStockCount > 0 ? "text-rose-700 font-bold" : "text-indigo-600")}>
            Out of Stock
          </p>
          <div className={cn("text-2xl font-black", stats.outOfStockCount > 0 ? "text-rose-800" : "text-indigo-900")}>
            {stats.outOfStockCount} Depleted
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold mt-1">Cannot fulfill online orders</p>
        </Card>

        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6 text-left">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Asset Valuation</p>
          <div className="text-2xl font-black text-white">{currencySymbol}{stats.totalValuation.toLocaleString()}</div>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">{stats.activeItems} active catalog products</p>
        </Card>
      </div>

      {/* Main Catalog & Inventory Table Card */}
      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border text-left">
        {/* Filter Controls Bar */}
        <div className="p-5 border-b bg-muted/20 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Search */}
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
              <Input 
                placeholder="Search product name, SKU, category..." 
                className="h-11 pl-10 text-xs bg-white border-none shadow-inner rounded-xl w-full font-bold" 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              />
            </div>

            {/* Stock Level Filter */}
            <div className="lg:col-span-2">
              <Select value={stockFilter} onValueChange={(v) => { setStockFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-11 w-full rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-primary">
                  <SelectValue placeholder="Stock Level" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-[10px] font-bold uppercase">All Stock Levels</SelectItem>
                  <SelectItem value="in_stock" className="text-[10px] font-bold uppercase text-emerald-700">In Stock</SelectItem>
                  <SelectItem value="low" className="text-[10px] font-bold uppercase text-amber-700">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock" className="text-[10px] font-bold uppercase text-rose-700">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="lg:col-span-2">
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-11 w-full rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-slate-700">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-[10px] font-bold uppercase">All Categories</SelectItem>
                  {existingCategories.map(cat => (
                    <SelectItem key={cat} value={cat} className="text-[10px] font-bold uppercase">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Storefront Visibility Filter */}
            <div className="lg:col-span-2">
              <Select value={storefrontFilter} onValueChange={(v) => { setStorefrontFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-11 w-full rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-slate-700">
                  <SelectValue placeholder="Storefront" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="text-[10px] font-bold uppercase">All Channels</SelectItem>
                  <SelectItem value="visible" className="text-[10px] font-bold uppercase text-teal-700">Storefront Visible</SelectItem>
                  <SelectItem value="featured" className="text-[10px] font-bold uppercase text-primary">Featured Items</SelectItem>
                  <SelectItem value="bestseller" className="text-[10px] font-bold uppercase text-purple-700">Best Sellers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Dropdown */}
            <div className="lg:col-span-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-11 w-full rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase text-slate-700">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="newest" className="text-[10px] font-bold uppercase">Newest First</SelectItem>
                  <SelectItem value="name" className="text-[10px] font-bold uppercase">Name (A-Z)</SelectItem>
                  <SelectItem value="stock_low" className="text-[10px] font-bold uppercase">Stock: Low to High</SelectItem>
                  <SelectItem value="stock_high" className="text-[10px] font-bold uppercase">Stock: High to Low</SelectItem>
                  <SelectItem value="price_high" className="text-[10px] font-bold uppercase">Price: High to Low</SelectItem>
                  <SelectItem value="price_low" className="text-[10px] font-bold uppercase">Price: Low to High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-[1050px]">
            <TableHeader>
              <TableRow className="bg-muted/10 border-b">
                <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Product / SKU</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Category</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase h-12">Pricing (MRP / Online)</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Stock Level</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Storefront</TableHead>
                <TableHead className="text-right pr-8 text-[10px] font-black uppercase h-12 w-48">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-44 text-center">
                    <Loader2 className="h-7 w-7 animate-spin mx-auto mb-2 text-primary opacity-30" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Master Inventory...</span>
                  </TableCell>
                </TableRow>
              ) : paginatedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-44 text-center opacity-40 italic text-sm">
                    No products found matching your filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map((product) => {
                  const isLow = product.stock <= product.minThreshold && product.stock > 0;
                  const isOut = product.stock <= 0;
                  const isArchived = Boolean(product.isArchived);
                  const effectiveOnlinePrice = product.onlinePrice !== undefined ? product.onlinePrice : product.price;

                  return (
                    <TableRow 
                      key={product.id} 
                      className={cn(
                        "hover:bg-muted/5 cursor-pointer group transition-colors border-b",
                        isArchived && "opacity-60 bg-slate-50/50"
                      )} 
                      onClick={() => handleSelectProductForDrawer(product)}
                    >
                      {/* Name & SKU */}
                      <TableCell className="pl-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-xl bg-slate-100 overflow-hidden shrink-0 border shadow-inner flex items-center justify-center">
                            {product.images && product.images[0] ? (
                              <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-5 w-5 text-muted-foreground opacity-40" />
                            )}
                          </div>
                          <div className="flex flex-col text-left min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-sm group-hover:text-primary transition-colors truncate uppercase tracking-tight">
                                {product.name}
                              </span>
                              {product.isFeatured && (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[8px] font-black px-1.5 py-0 h-4">
                                  <Star className="h-2.5 w-2.5 mr-0.5 fill-amber-500" /> Featured
                                </Badge>
                              )}
                              {product.isBestSeller && (
                                <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[8px] font-black px-1.5 py-0 h-4">
                                  <Award className="h-2.5 w-2.5 mr-0.5" /> Best Seller
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              <span className="text-[9px] text-muted-foreground font-mono font-bold uppercase tracking-wider">
                                SKU: {product.sku}
                              </span>
                              <Separator orientation="vertical" className="h-2.5" />
                              <span className="text-[9px] font-bold text-muted-foreground uppercase">
                                GST: {product.gstRate}%
                              </span>
                              {isArchived && (
                                <>
                                  <Separator orientation="vertical" className="h-2.5" />
                                  <span className="text-[8px] font-black text-rose-600 uppercase">Archived</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="text-left">
                        <Badge variant="outline" className="text-[9px] font-black uppercase bg-slate-50 border-slate-200 text-slate-700">
                          {product.category || "General"}
                        </Badge>
                      </TableCell>

                      {/* Pricing */}
                      <TableCell className="text-right">
                        <div className="space-y-0.5">
                          <p className="font-black text-sm text-slate-900">
                            {currencySymbol}{product.price.toLocaleString()}
                          </p>
                          {product.onlinePrice !== undefined && product.onlinePrice < product.price && (
                            <p className="text-[10px] text-emerald-600 font-bold">
                              Store: {currencySymbol}{product.onlinePrice.toLocaleString()} 
                              <span className="ml-1 text-[8px] bg-emerald-50 px-1 rounded border border-emerald-200">
                                {Math.round(((product.price - product.onlinePrice) / product.price) * 100)}% off
                              </span>
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Stock Level */}
                      <TableCell className="px-6 text-center">
                        <div className="space-y-1.5 max-w-[140px] mx-auto">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className={cn(
                              isOut ? "text-rose-700 font-bold" : isLow ? "text-amber-700 font-bold" : "text-emerald-700"
                            )}>
                              {product.stock} {product.unit}
                            </span>
                            <span className="text-[9px] text-muted-foreground opacity-60">Min: {product.minThreshold}</span>
                          </div>
                          <Progress 
                            value={isOut ? 0 : Math.min((product.stock / Math.max(1, product.minThreshold * 3)) * 100, 100)} 
                            className={cn(
                              "h-1.5", 
                              isOut ? "bg-rose-100 [&>div]:bg-rose-600" : isLow ? "bg-amber-100 [&>div]:bg-amber-500" : "bg-emerald-100 [&>div]:bg-emerald-600"
                            )} 
                          />
                        </div>
                      </TableCell>

                      {/* Storefront Status */}
                      <TableCell className="text-center">
                        {product.showOnWebsite ? (
                          <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-[8px] font-black uppercase h-5 px-2">
                            <Eye className="h-2.5 w-2.5 mr-1" /> Visible
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 border-slate-200 text-[8px] font-black uppercase h-5 px-2">
                            <EyeOff className="h-2.5 w-2.5 mr-1" /> Hidden
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-8" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Stock Adjust button */}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-2.5 text-[9px] font-black uppercase text-primary border-primary/20 hover:bg-primary/5 rounded-lg"
                            title="Adjust Stock"
                            onClick={(e) => openQuickStockAdjust(e, product)}
                          >
                            <ArrowRightLeft className="h-3 w-3 mr-1" /> Stock
                          </Button>

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg text-slate-600 hover:bg-slate-100" 
                            onClick={(e) => handleOpenEdit(e, product)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>

                          {isArchived ? (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-50" 
                              title="Restore Product"
                              onClick={() => handleRestoreProduct(product)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-50" 
                              title="Archive Product"
                              onClick={(e) => openArchiveDialog(e, product)}
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Bounded Pagination Footer */}
        <div className="p-4 border-t bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-muted-foreground font-semibold text-[11px]">
            Showing <span className="font-bold text-slate-900">{filteredProducts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-bold text-slate-900">{Math.min(currentPage * pageSize, filteredProducts.length)}</span> of{" "}
            <span className="font-bold text-slate-900">{filteredProducts.length}</span> items
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-xs font-bold"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="text-[11px] font-mono font-bold px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-xs font-bold"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* EDIT PRODUCT DIALOG */}
      <Dialog open={isEditProductOpen} onOpenChange={(o) => { setIsEditProductOpen(o); if(!o) { resetForm(); setSelectedProduct(null); } }}>
        <DialogContent className="sm:max-w-[850px] p-0 overflow-hidden w-[95vw] rounded-3xl border-none shadow-2xl">
          <DialogHeader className="p-6 md:p-8 bg-slate-900 text-white text-left shrink-0">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                <Edit2 className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-black uppercase">Edit Product: {selectedProduct?.name}</DialogTitle>
                <DialogDescription className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">
                  Pricing • Storefront Toggles • Inventory Safety
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[75vh]">
            {renderProductFormBody()}
          </ScrollArea>

          <DialogFooter className="p-6 bg-muted/10 border-t">
            <Button 
              onClick={handleSubmitProduct} 
              disabled={isSubmittingForm} 
              className="w-full h-14 bg-primary font-black uppercase text-xs tracking-wider rounded-xl shadow-xl text-white"
            >
              {isSubmittingForm ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Update Product Ledger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QUICK STOCK ADJUSTMENT DIALOG */}
      <Dialog open={isStockAdjustOpen} onOpenChange={setIsStockAdjustOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white text-left p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-primary" /> Adjust Inventory Stock
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {adjustTargetProduct?.name} (Current: <span className="font-bold text-slate-900">{adjustTargetProduct?.stock} {adjustTargetProduct?.unit}</span>)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-left">
            {/* Adjustment Type Selector */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Action Type</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  type="button" 
                  variant={adjustType === 'add' ? 'default' : 'outline'} 
                  className={cn("h-9 text-xs font-black uppercase rounded-xl", adjustType === 'add' && "bg-emerald-600 hover:bg-emerald-700")}
                  onClick={() => setAdjustType('add')}
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add (+)
                </Button>
                <Button 
                  type="button" 
                  variant={adjustType === 'subtract' ? 'default' : 'outline'} 
                  className={cn("h-9 text-xs font-black uppercase rounded-xl", adjustType === 'subtract' && "bg-rose-600 hover:bg-rose-700")}
                  onClick={() => setAdjustType('subtract')}
                >
                  <MinusCircle className="h-3.5 w-3.5 mr-1" /> Remove (-)
                </Button>
                <Button 
                  type="button" 
                  variant={adjustType === 'set' ? 'default' : 'outline'} 
                  className={cn("h-9 text-xs font-black uppercase rounded-xl", adjustType === 'set' && "bg-primary")}
                  onClick={() => setAdjustType('set')}
                >
                  Set Count (=)
                </Button>
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">
                {adjustType === 'set' ? 'New Exact Stock Level' : 'Adjustment Quantity'}
              </Label>
              <Input 
                type="number" 
                min="1" 
                placeholder="e.g. 25" 
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                className="h-11 rounded-xl text-base font-black"
              />
            </div>

            {/* Projected Result Preview */}
            {adjustQty && !isNaN(parseInt(adjustQty, 10)) && (
              <div className="p-3 bg-muted/20 rounded-xl text-xs flex justify-between items-center">
                <span className="text-muted-foreground font-semibold">Projected New Stock:</span>
                <span className={cn(
                  "font-black text-sm",
                  (() => {
                    const current = adjustTargetProduct?.stock || 0;
                    const val = parseInt(adjustQty, 10);
                    let projected = current;
                    if (adjustType === 'add') projected = current + val;
                    if (adjustType === 'subtract') projected = current - val;
                    if (adjustType === 'set') projected = val;
                    return projected < 0 ? "text-rose-600" : "text-emerald-700";
                  })()
                )}>
                  {(() => {
                    const current = adjustTargetProduct?.stock || 0;
                    const val = parseInt(adjustQty, 10);
                    let projected = current;
                    if (adjustType === 'add') projected = current + val;
                    if (adjustType === 'subtract') projected = current - val;
                    if (adjustType === 'set') projected = val;
                    return `${projected} ${adjustTargetProduct?.unit || 'pcs'}`;
                  })()}
                </span>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Reason / Audit Note</Label>
              <Select value={adjustReason} onValueChange={setAdjustReason}>
                <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Received shipment / restock" className="text-xs">Received shipment / restock</SelectItem>
                  <SelectItem value="Physical inventory count / audit" className="text-xs">Physical inventory count / audit</SelectItem>
                  <SelectItem value="Damaged goods / breakage" className="text-xs">Damaged goods / breakage</SelectItem>
                  <SelectItem value="Customer return / replenishment" className="text-xs">Customer return / replenishment</SelectItem>
                  <SelectItem value="Internal usage / transfer" className="text-xs">Internal usage / transfer</SelectItem>
                  <SelectItem value="Other manual adjustment" className="text-xs">Other manual adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsStockAdjustOpen(false)} className="rounded-xl font-black uppercase text-[10px]">
              Cancel
            </Button>
            <Button 
              onClick={handleExecuteStockAdjust} 
              disabled={isAdjustingStock}
              className="bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] rounded-xl shadow-md"
            >
              {isAdjustingStock ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
              Commit Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SAFE ARCHIVE CONFIRMATION ALERT */}
      <AlertDialog open={isArchiveAlertOpen} onOpenChange={setIsArchiveAlertOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8 text-left">
          <AlertDialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 mb-2">
              <Archive className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900">
              Archive Product: {productToArchive?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Archiving hides this product from your live storefront and marks it inactive, but preserves all historical customer orders and reporting data. You can restore this product at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2 space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground">Reason for Archiving (Optional)</Label>
            <Input 
              value={archiveReason} 
              onChange={(e) => setArchiveReason(e.target.value)} 
              placeholder="e.g. Discontinued model or seasonal rotation" 
              className="rounded-xl text-xs h-10"
            />
          </div>

          <AlertDialogFooter className="mt-4 flex gap-3">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold uppercase text-[10px]">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button 
                onClick={handleConfirmArchive} 
                disabled={isSubmittingForm}
                className="flex-1 h-11 rounded-xl font-black uppercase bg-amber-600 hover:bg-amber-700 text-white border-none shadow-lg text-[10px]"
              >
                {isSubmittingForm ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Archive className="h-4 w-4 mr-1" />}
                Confirm Archive
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PRODUCT DETAIL & AUDIT SLIDE-OVER SHEET */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col border-none shadow-2xl overflow-y-auto bg-slate-50 text-left">
          {selectedProduct && (
            <>
              {/* Header */}
              <div className="p-6 bg-slate-900 text-white shrink-0 relative text-left">
                <div className="flex items-center justify-between pb-3">
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20 uppercase text-[9px] font-black px-2.5 py-0.5 rounded-full">
                    ID: {selectedProduct.id}
                  </Badge>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white rounded-full">
                      <X className="h-5 w-5" />
                    </Button>
                  </SheetClose>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/20 overflow-hidden shrink-0 flex items-center justify-center">
                    {selectedProduct.images && selectedProduct.images[0] ? (
                      <img src={selectedProduct.images[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-8 w-8 text-white/50" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight truncate">{selectedProduct.name}</h3>
                    <p className="text-[10px] text-white/60 font-mono mt-0.5">SKU: {selectedProduct.sku}</p>
                    <div className="flex items-center gap-2 pt-2">
                      <Badge className={cn("text-[8px] font-black uppercase", selectedProduct.showOnWebsite ? "bg-teal-500/20 text-teal-300 border-teal-500/30" : "bg-slate-700 text-slate-300")}>
                        {selectedProduct.showOnWebsite ? "Online Storefront" : "Offline Only"}
                      </Badge>
                      {selectedProduct.isArchived && (
                        <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[8px] font-black uppercase">
                          Archived
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 flex-1">
                {/* Metrics Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-2xl border shadow-sm space-y-1">
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Sale Price (MRP)</span>
                    <p className="text-xl font-black text-slate-900">{currencySymbol}{selectedProduct.price.toLocaleString()}</p>
                    {selectedProduct.onlinePrice !== undefined && selectedProduct.onlinePrice < selectedProduct.price && (
                      <p className="text-[10px] font-bold text-emerald-600">Online: {currencySymbol}{selectedProduct.onlinePrice.toLocaleString()}</p>
                    )}
                  </div>

                  <div className="p-4 bg-white rounded-2xl border shadow-sm space-y-1">
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Current Stock</span>
                    <p className={cn("text-xl font-black", selectedProduct.stock <= 0 ? "text-rose-600" : selectedProduct.stock <= selectedProduct.minThreshold ? "text-amber-600" : "text-emerald-700")}>
                      {selectedProduct.stock} {selectedProduct.unit}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Safety Min: {selectedProduct.minThreshold}</p>
                  </div>
                </div>

                {/* Stock Adjustment Trigger Banner */}
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase text-primary">Quick Stock Mutation</p>
                    <p className="text-[10px] text-muted-foreground">Perform audited inventory adjustments</p>
                  </div>
                  <Button 
                    size="sm" 
                    className="h-8 bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] rounded-xl shadow-sm"
                    onClick={(e) => openQuickStockAdjust(e, selectedProduct)}
                  >
                    <ArrowRightLeft className="h-3 w-3 mr-1" /> Adjust Stock
                  </Button>
                </div>

                {/* Technical Node Details */}
                <Card className="border-none shadow-sm bg-white rounded-2xl p-5 border space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Technical & Tax Profile
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border">
                      <span className="text-[9px] font-black uppercase text-muted-foreground">HSN Code</span>
                      <p className="font-mono font-bold text-slate-800">{selectedProduct.hsnCode || "None"}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border">
                      <span className="text-[9px] font-black uppercase text-muted-foreground">GST Slab</span>
                      <p className="font-bold text-slate-800">{selectedProduct.gstRate}%</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border">
                      <span className="text-[9px] font-black uppercase text-muted-foreground">Batch Number</span>
                      <p className="font-mono font-bold text-slate-800">{selectedProduct.batchNumber || "General"}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border">
                      <span className="text-[9px] font-black uppercase text-muted-foreground">Expiry Date</span>
                      <p className="font-bold text-slate-800">{selectedProduct.expiryDate || "N/A"}</p>
                    </div>
                  </div>
                </Card>

                {/* Audit Trail: Stock History */}
                <Card className="border-none shadow-sm bg-white rounded-2xl p-5 border space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-primary" /> Stock Movement History
                  </p>

                  {isLoadingAuditLogs ? (
                    <div className="py-6 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary opacity-40" />
                      <p className="text-[10px] font-bold text-muted-foreground mt-2">Loading audit trail...</p>
                    </div>
                  ) : stockAuditLogs.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">No manual stock adjustments recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {stockAuditLogs.map((log) => {
                        const isPositive = log.delta > 0;
                        const logDate = log.adjustedAt ? new Date(log.adjustedAt) : null;
                        return (
                          <div key={log.id} className="p-3 rounded-xl bg-slate-50 border text-xs flex justify-between items-start">
                            <div className="space-y-0.5 text-left">
                              <p className="font-bold text-slate-800">{log.reason || "Manual adjustment"}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {logDate ? format(logDate, 'dd MMM yyyy, hh:mm a') : 'Recently'}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge className={cn("text-[9px] font-black font-mono", isPositive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>
                                {isPositive ? `+${log.delta}` : `${log.delta}`}
                              </Badge>
                              <p className="text-[9px] text-muted-foreground mt-0.5">Stock: {log.newStock}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t bg-white flex gap-2 shrink-0">
                <Button 
                  variant="outline" 
                  className="flex-1 h-11 rounded-xl font-black uppercase text-[10px]" 
                  onClick={() => setIsDrawerOpen(false)}
                >
                  Close
                </Button>
                <Button 
                  className="flex-1 h-11 bg-primary text-white font-black uppercase text-[10px] rounded-xl shadow-md"
                  onClick={(e) => handleOpenEdit(e, selectedProduct)}
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit Product
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );

  // Helper renderer for Product Add / Edit Form
  function renderProductFormBody() {
    return (
      <div className="p-6 md:p-8 space-y-8 text-left">
        {/* Section 1: Basic Identity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
              1. Basic Identity
            </Label>
            <Button 
              variant="ghost" 
              size="sm" 
              disabled={isAiSuggesting} 
              onClick={handleAiSuggest} 
              className="h-8 rounded-xl bg-primary/5 text-primary text-[9px] font-black uppercase gap-1.5 border border-primary/10"
            >
              {isAiSuggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              AI Suggest Meta
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase ml-1 opacity-70">Product Name *</Label>
            <Input 
              ref={nameInputRef} 
              value={formName} 
              onChange={(e) => setFormName(e.target.value)} 
              placeholder="e.g. 550W Mono PERC Solar Panel or Wireless Mouse" 
              className="h-12 rounded-xl font-black text-base border-none bg-muted/20 shadow-inner" 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase ml-1 opacity-60">SKU Code</Label>
              <Input 
                value={formSku} 
                onChange={(e) => setFormSku(e.target.value.toUpperCase())} 
                placeholder="Auto-generated if empty" 
                className="h-11 rounded-xl bg-muted/20 border-none font-mono text-xs font-bold" 
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase ml-1 opacity-60">Category</Label>
              <Input 
                value={formCategory} 
                onChange={(e) => setFormCategory(e.target.value)} 
                placeholder="e.g. Solar, Hardware" 
                className="h-11 rounded-xl bg-muted/20 border-none text-xs font-bold" 
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase ml-1 opacity-60">Unit</Label>
              <Select value={formUnit} onValueChange={setFormUnit}>
                <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none font-bold uppercase text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {dynamicUnits.map((u: string) => (
                    <SelectItem key={u} value={u} className="text-[10px] font-bold uppercase">{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase ml-1 opacity-60">GST Slab</Label>
              <Select value={formGst} onValueChange={setFormGst}>
                <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none font-bold text-[10px] uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {dynamicGstSlabs.map((s: number) => (
                    <SelectItem key={s} value={s.toString()} className="text-[10px] font-bold">{s}% GST</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Section 2: Pricing Strategy & Storefront Controls */}
        <div className="space-y-4">
          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
            2. Pricing & Storefront Catalog
          </Label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-800 ml-1">Base Price / MRP ({currencySymbol}) *</Label>
              <Input 
                type="number" 
                value={formPrice} 
                onChange={(e) => setFormPrice(e.target.value)} 
                className="h-12 rounded-xl bg-slate-50 border-none font-black text-lg" 
                placeholder="0.00" 
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-primary ml-1">Online Store Price ({currencySymbol})</Label>
              <Input 
                type="number" 
                value={formOnlinePrice} 
                onChange={(e) => setFormOnlinePrice(e.target.value)} 
                className="h-12 rounded-xl bg-primary/5 text-primary border-none font-black text-lg" 
                placeholder="Defaults to MRP" 
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-red-600 ml-1">Purchase Cost ({currencySymbol})</Label>
              <Input 
                type="number" 
                value={formCost} 
                onChange={(e) => setFormCost(e.target.value)} 
                className="h-12 rounded-xl bg-red-50 text-red-700 border-none font-black text-lg" 
                placeholder="0.00" 
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase ml-1 opacity-60">Safety Stock Threshold</Label>
              <Input 
                type="number" 
                value={formMinThreshold} 
                onChange={(e) => setFormMinThreshold(e.target.value)} 
                className="h-12 rounded-xl bg-muted/20 border-none font-bold" 
              />
            </div>
          </div>

          {/* Pricing analytics helper */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calculator className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-[10px] font-black uppercase text-primary">Profit Margin</p>
                  <p className="text-[9px] text-muted-foreground">Markup over purchase cost</p>
                </div>
              </div>
              <p className={cn("text-xl font-black", formMarginPercent >= 20 ? "text-green-600" : "text-amber-600")}>
                {formMarginPercent}%
              </p>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tag className="h-5 w-5 text-emerald-700" />
                <div>
                  <p className="text-[10px] font-black uppercase text-emerald-800">Storefront Discount</p>
                  <p className="text-[9px] text-muted-foreground">Discount off base MRP</p>
                </div>
              </div>
              <p className="text-xl font-black text-emerald-700">
                {formDiscountPercent}% OFF
              </p>
            </div>
          </div>

          {/* Store Builder Catalog Toggles */}
          <div className="p-5 bg-slate-50 rounded-2xl border space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
              Store Builder Visibility & Badging
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800">Show On Website</span>
                  <p className="text-[9px] text-muted-foreground">Visible on online storefront</p>
                </div>
                <Switch 
                  checked={formShowOnWebsite} 
                  onCheckedChange={setFormShowOnWebsite} 
                  className="data-[state=checked]:bg-teal-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-xl border">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800">Featured Item</span>
                  <p className="text-[9px] text-muted-foreground">Show in featured collections</p>
                </div>
                <Switch 
                  checked={formIsFeatured} 
                  onCheckedChange={setFormIsFeatured} 
                  className="data-[state=checked]:bg-amber-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-xl border">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800">Best Seller</span>
                  <p className="text-[9px] text-muted-foreground">Highlight as top-selling</p>
                </div>
                <Switch 
                  checked={formIsBestSeller} 
                  onCheckedChange={setFormIsBestSeller} 
                  className="data-[state=checked]:bg-purple-600"
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Section 3: Stock & Logistics */}
        <div className="space-y-4">
          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
            3. Inventory & Supplier
          </Label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {!selectedProduct && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase ml-1 opacity-70">Initial Opening Stock</Label>
                <Input 
                  type="number" 
                  value={formStock} 
                  onChange={(e) => setFormStock(e.target.value)} 
                  className="h-11 rounded-xl bg-muted/20 border-none font-bold text-base" 
                  placeholder="0"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase ml-1 opacity-60">Primary Vendor</Label>
              <Select value={formVendorId} onValueChange={setFormVendorId}>
                <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none font-bold uppercase text-[10px]">
                  <SelectValue placeholder="Pick Supplier" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none" className="text-[10px] font-bold uppercase">No Vendor</SelectItem>
                  {vendorList.map(v => (
                    <SelectItem key={v.id} value={v.id} className="text-[10px] font-bold uppercase">{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase ml-1 opacity-60">Batch Number</Label>
              <Input 
                value={formBatchNumber} 
                onChange={(e) => setFormBatchNumber(e.target.value.toUpperCase())} 
                placeholder="e.g. B-8821" 
                className="h-11 rounded-xl bg-muted/20 border-none font-mono text-xs" 
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Section 4: Images & Description */}
        <div className="space-y-4">
          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
            4. Media & Description
          </Label>

          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {formImages.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border group shadow-sm">
                  <img src={img} className="w-full h-full object-cover" alt="" />
                  <button 
                    type="button"
                    onClick={() => setFormImages(formImages.filter((_, idx) => idx !== i))} 
                    className="absolute top-1 right-1 h-6 w-6 bg-white/90 rounded-full flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button 
                type="button"
                onClick={() => imageInputRef.current?.click()} 
                className="aspect-square rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-1 hover:bg-primary/10 transition-all"
              >
                <Upload className="h-5 w-5 text-primary" />
                <span className="text-[8px] font-black uppercase text-primary/70">Upload</span>
              </button>
            </div>
            <input type="file" ref={imageInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />

            <div className="space-y-1.5 pt-2">
              <Label className="text-[10px] font-bold uppercase ml-1 opacity-60">Product Description</Label>
              <Textarea 
                value={formDescription} 
                onChange={(e) => setFormDescription(e.target.value)} 
                className="min-h-[90px] rounded-xl bg-muted/20 border-none shadow-inner p-3 text-xs leading-relaxed" 
                placeholder="Product specifications, features, and warranty details..." 
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
