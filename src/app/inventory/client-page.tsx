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
  deleteMerchantProduct,
  adjustProductStock, 
  fetchStockHistory 
} from "@/app/actions/product-actions";
import { useMarketplaceCatalog } from "@/hooks/use-marketplace-catalog";
import { evaluateCoreQuota } from "@/lib/marketplace-catalog";
import { CoreQuotaBanner } from "@/components/quota-upgrade-banner";
import { PageHeader, KpiStatCard, SectionCard } from "@/components/ui/editorial";

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

  const { limits } = useMarketplaceCatalog();

  const currencySymbol = getCurrencySymbol(business?.currency);
  const dynamicCategories = business?.cashbookCategories || ["Sales", "Expense", "Rent", "Salary", "Purchase", "Utility", "Other"];


  // Safe bounded query (limit 200) to prevent unbounded memory reads
  const productsQuery = useMemoFirebase(() => 
    businessId ? query(
      collection(firestore, 'businesses', businessId, 'products'),
      limit(200)
    ) : null
  , [firestore, businessId]);
  const { data: rawProducts, isLoading } = useCollection<Product>(productsQuery);
  const productList = useMemo(() => (Array.isArray(rawProducts) ? rawProducts : []), [rawProducts]);

  const vendorsQuery = useMemoFirebase(() => businessId ? query(collection(firestore, 'businesses', businessId, 'vendors'), limit(100)) : null, [firestore, businessId]);
  const { data: vendorListData } = useCollection<Vendor>(vendorsQuery);
  const vendorList = vendorListData || [];

  const inventoryQuota = useMemo(
    () => evaluateCoreQuota("inventory", productList.length, { limits, business }),
    [productList.length, limits, business]
  );
  const isLimitReached = inventoryQuota.isReached;

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
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

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
    if (isTrialExpired || inventoryQuota.isLockedByMode) return;
    if (!selectedProduct && isLimitReached) return;
    if (!formName.trim() || !formPrice || !businessId || !user?.uid) {
      toast({ variant: "destructive", title: "Missing Information", description: "Product name and sale price are required." });
      return;
    }

    startFormTransition(async () => {
      const idToken = await user.getIdToken(true);
      
      if (isProfileLoading) {
        toast({ variant: "destructive", title: "Loading Profile", description: "Please wait while your profile loads." });
        return;
      }
      
      if (!businessId) {
        toast({ variant: "destructive", title: "Business Context Missing", description: "Business ID not found in profile." });
        return;
      }

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
      const idToken = await user.getIdToken(true);
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
      const idToken = await user.getIdToken(true);
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

  // Permanent Delete Handler
  const openDeleteDialog = (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    setProductToDelete(p);
    setIsDeleteAlertOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!businessId || !productToDelete || !user?.uid) return;
    startFormTransition(async () => {
      const idToken = await user.getIdToken(true);
      const res = await deleteMerchantProduct({
        userId: user.uid,
        businessId,
        productId: productToDelete.id,
        idToken
      });

      if (res.success) {
        toast({ title: "Product Deleted", description: res.message });
        if (selectedProduct?.id === productToDelete.id) {
          setIsDrawerOpen(false);
          setSelectedProduct(null);
        }
        setIsDeleteAlertOpen(false);
        setProductToDelete(null);
      } else {
        toast({ variant: "destructive", title: "Delete Failed", description: res.error });
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
      const idToken = await user.getIdToken(true);
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
      const idToken = user ? await user.getIdToken() : undefined;
      const res = await fetchStockHistory({ businessId, productId, limitCount: 20, idToken });
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
            Your {limits.trialDurationDays}-day trial has ended. Inventory is currently in read-only mode. <Link href="/settings/subscription" className="font-bold underline">Upgrade now</Link> to resume management.
          </AlertDescription>
        </Alert>
      )}

      {!isTrialExpired && <CoreQuotaBanner quota={inventoryQuota} />}

      {/* Header */}
      <PageHeader
        title="Master Inventory"
        description="Catalog, stock safety thresholds, and storefront catalog controls."
        icon={Package}
        actions={
          <Dialog open={isAddProductOpen} onOpenChange={(o) => { setIsAddProductOpen(o); if(!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button disabled={isTrialExpired || isLimitReached} className="bg-slate-900 hover:bg-slate-800 h-10 px-4 font-semibold text-xs rounded-xl text-white">
                <Plus className="mr-1.5 h-4 w-4" /> Add product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[850px] max-h-[90vh] flex flex-col p-0 overflow-hidden w-[95vw] rounded-2xl border border-slate-200 bg-white">
              <DialogHeader className="p-6 bg-slate-900 text-white text-left shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                    <PlusSquare className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <DialogTitle className="text-lg font-bold tracking-tight">Create catalog product</DialogTitle>
                    <DialogDescription className="text-slate-300 text-xs mt-0.5">
                      Add pricing, storefront visibility, and minimum stock safety thresholds.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
                {renderProductFormBody()}
              </ScrollArea>

              <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200 shrink-0">
                <Button
                  onClick={handleSubmitProduct}
                  disabled={isSubmittingForm}
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 font-semibold text-sm rounded-xl text-white"
                >
                  {isSubmittingForm ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Save product to catalog
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiStatCard
          label="Total Catalog Items"
          value={`${stats.totalItems} SKUs`}
          subtext={`${stats.onlineCatalogCount} visible on storefront`}
          icon={Package}
        />
        <KpiStatCard
          label="Low Stock Alerts"
          value={`${stats.lowStockCount} Products`}
          subtext="Below safety threshold"
          tone={stats.lowStockCount > 0 ? "warning" : "positive"}
          icon={AlertTriangle}
        />
        <KpiStatCard
          label="Out of Stock"
          value={`${stats.outOfStockCount} Depleted`}
          subtext="Cannot fulfill online orders"
          tone={stats.outOfStockCount > 0 ? "danger" : "default"}
          icon={AlertCircle}
        />
        <KpiStatCard
          label="Total Asset Valuation"
          value={`${currencySymbol}${stats.totalValuation.toLocaleString()}`}
          subtext={`${stats.activeItems} active catalog products`}
          tone="dark"
          icon={Coins}
        />
      </div>

      {/* Main Catalog & Inventory Table Card */}
      <SectionCard bodyClassName="p-0">
        {/* Filter Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Search */}
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search product name, SKU, category..."
                className="h-10 pl-10 text-sm bg-white border-slate-200 rounded-xl w-full"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>

            {/* Stock Level Filter */}
            <div className="lg:col-span-2">
              <Select value={stockFilter} onValueChange={(v) => { setStockFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-10 w-full rounded-xl bg-white border-slate-200 text-xs font-medium text-slate-700">
                  <SelectValue placeholder="Stock level" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="all" className="text-xs font-medium">All stock levels</SelectItem>
                  <SelectItem value="in_stock" className="text-xs font-medium text-emerald-700">In stock</SelectItem>
                  <SelectItem value="low" className="text-xs font-medium text-amber-700">Low stock</SelectItem>
                  <SelectItem value="out_of_stock" className="text-xs font-medium text-rose-700">Out of stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="lg:col-span-2">
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-10 w-full rounded-xl bg-white border-slate-200 text-xs font-medium text-slate-700">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="all" className="text-xs font-medium">All categories</SelectItem>
                  {existingCategories.map(cat => (
                    <SelectItem key={cat} value={cat} className="text-xs font-medium">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Storefront Visibility Filter */}
            <div className="lg:col-span-2">
              <Select value={storefrontFilter} onValueChange={(v) => { setStorefrontFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-10 w-full rounded-xl bg-white border-slate-200 text-xs font-medium text-slate-700">
                  <SelectValue placeholder="Storefront" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="all" className="text-xs font-medium">All channels</SelectItem>
                  <SelectItem value="visible" className="text-xs font-medium text-teal-700">Storefront visible</SelectItem>
                  <SelectItem value="featured" className="text-xs font-medium text-slate-900">Featured items</SelectItem>
                  <SelectItem value="bestseller" className="text-xs font-medium text-purple-700">Best sellers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Dropdown */}
            <div className="lg:col-span-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 w-full rounded-xl bg-white border-slate-200 text-xs font-medium text-slate-700">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="newest" className="text-xs font-medium">Newest first</SelectItem>
                  <SelectItem value="name" className="text-xs font-medium">Name (A–Z)</SelectItem>
                  <SelectItem value="stock_low" className="text-xs font-medium">Stock: Low to high</SelectItem>
                  <SelectItem value="stock_high" className="text-xs font-medium">Stock: High to low</SelectItem>
                  <SelectItem value="price_high" className="text-xs font-medium">Price: High to low</SelectItem>
                  <SelectItem value="price_low" className="text-xs font-medium">Price: Low to high</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-slate-50/80 border-b border-slate-200 hover:bg-slate-50/80">
                <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">Product / SKU</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">Category</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-600 h-11">Pricing (MRP / Online)</TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">Stock level</TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">Storefront</TableHead>
                <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-48">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-44 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
                    <span className="text-xs font-medium text-slate-500">Loading master inventory...</span>
                  </TableCell>
                </TableRow>
              ) : paginatedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-44 text-center text-slate-500 text-sm">
                    No products found matching your filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map((product) => {
                  const isLow = product.stock <= product.minThreshold && product.stock > 0;
                  const isOut = product.stock <= 0;
                  const isArchived = Boolean(product.isArchived);

                  return (
                    <TableRow
                      key={product.id}
                      className={cn(
                        "hover:bg-slate-50/80 cursor-pointer group transition-colors border-b border-slate-100",
                        isArchived && "opacity-60 bg-slate-50/50"
                      )}
                      onClick={() => handleSelectProductForDrawer(product)}
                    >
                      {/* Name & SKU */}
                      <TableCell className="pl-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                            {product.images && product.images[0] ? (
                              <img src={product.images[0]} referrerPolicy="no-referrer" alt={product.name} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div className="flex flex-col text-left min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-900 text-sm group-hover:text-slate-950 transition-colors truncate">
                                {product.name}
                              </span>
                              {product.isFeatured && (
                                <span className="inline-flex items-center rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium px-1.5 py-0.5">
                                  <Star className="h-2.5 w-2.5 mr-1 fill-amber-500" /> Featured
                                </span>
                              )}
                              {product.isBestSeller && (
                                <span className="inline-flex items-center rounded-md bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-medium px-1.5 py-0.5">
                                  <Award className="h-2.5 w-2.5 mr-1" /> Best seller
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5 text-xs text-slate-500">
                              <span className="font-mono tabular-nums">
                                SKU: {product.sku}
                              </span>
                              <Separator orientation="vertical" className="h-3" />
                              <span className="font-mono tabular-nums">
                                GST: {product.gstRate}%
                              </span>
                              {isArchived && (
                                <>
                                  <Separator orientation="vertical" className="h-3" />
                                  <span className="font-medium text-rose-600">Archived</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="text-left">
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700">
                          {product.category || "General"}
                        </span>
                      </TableCell>

                      {/* Pricing */}
                      <TableCell className="text-right">
                        <div className="space-y-0.5">
                          <p className="font-mono tabular-nums font-semibold text-sm text-slate-900">
                            {currencySymbol}{product.price.toLocaleString()}
                          </p>
                          {product.onlinePrice !== undefined && product.onlinePrice < product.price && (
                            <p className="text-xs font-mono tabular-nums text-emerald-700 font-medium">
                              Store: {currencySymbol}{product.onlinePrice.toLocaleString()}
                              <span className="ml-1 text-[11px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                {Math.round(((product.price - product.onlinePrice) / product.price) * 100)}% off
                              </span>
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Stock Level */}
                      <TableCell className="px-6 text-center">
                        <div className="space-y-1.5 max-w-[140px] mx-auto">
                          <div className="flex justify-between items-center text-xs font-mono tabular-nums">
                            <span className={cn(
                              "font-semibold",
                              isOut ? "text-rose-700" : isLow ? "text-amber-700" : "text-emerald-700"
                            )}>
                              {product.stock} {product.unit}
                            </span>
                            <span className="text-[11px] text-slate-500">Min: {product.minThreshold}</span>
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
                          <span className="inline-flex items-center rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-xs font-medium px-2 py-0.5">
                            <Eye className="h-3 w-3 mr-1" /> Visible
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-slate-50 text-slate-500 border border-slate-200 text-xs font-medium px-2 py-0.5">
                            <EyeOff className="h-3 w-3 mr-1" /> Hidden
                          </span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs font-medium text-slate-700 border-slate-200 hover:bg-slate-100 rounded-lg"
                            title="Adjust Stock"
                            aria-label={`Adjust stock for ${product.name}`}
                            onClick={(e) => openQuickStockAdjust(e, product)}
                          >
                            <ArrowRightLeft className="h-3 w-3 mr-1" /> Stock
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            title="Edit Product"
                            aria-label={`Edit ${product.name}`}
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
                              aria-label={`Restore ${product.name}`}
                              onClick={() => handleRestoreProduct(product)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-amber-600 hover:bg-amber-50"
                              title="Archive Product"
                              aria-label={`Archive ${product.name}`}
                              onClick={(e) => openArchiveDialog(e, product)}
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50"
                            title="Delete Product Permanently"
                            aria-label={`Delete ${product.name}`}
                            onClick={(e) => openDeleteDialog(e, product)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-slate-500 font-medium tabular-nums">
            Showing <span className="font-semibold text-slate-900">{filteredProducts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">{Math.min(currentPage * pageSize, filteredProducts.length)}</span> of{" "}
            <span className="font-semibold text-slate-900">{filteredProducts.length}</span> items
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-xs font-medium border-slate-200 bg-white"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
            </Button>
            <span className="text-xs font-mono tabular-nums font-medium text-slate-600 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-xs font-medium border-slate-200 bg-white"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            >
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* EDIT PRODUCT DIALOG */}
      <Dialog open={isEditProductOpen} onOpenChange={(o) => { setIsEditProductOpen(o); if(!o) { resetForm(); setSelectedProduct(null); } }}>
        <DialogContent className="sm:max-w-[850px] max-h-[90vh] flex flex-col p-0 overflow-hidden w-[95vw] rounded-2xl border border-slate-200 bg-white">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                <Edit2 className="h-5 w-5 text-white" />
              </div>
              <div className="text-left min-w-0">
                <DialogTitle className="text-lg font-bold tracking-tight truncate">Edit product: {selectedProduct?.name}</DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  Update pricing, storefront toggles, and stock thresholds.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
            {renderProductFormBody()}
          </ScrollArea>

          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200 shrink-0">
            <Button
              onClick={handleSubmitProduct}
              disabled={isSubmittingForm}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 font-semibold text-sm rounded-xl text-white"
            >
              {isSubmittingForm ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Save product changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QUICK STOCK ADJUSTMENT DIALOG */}
      <Dialog open={isStockAdjustOpen} onOpenChange={setIsStockAdjustOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-slate-200 bg-white text-left p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                <ArrowRightLeft className="h-4 w-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">Adjust inventory stock</DialogTitle>
                <DialogDescription className="text-xs text-slate-300 mt-0.5">
                  {adjustTargetProduct?.name} (Current: <span className="font-mono tabular-nums font-semibold text-white">{adjustTargetProduct?.stock} {adjustTargetProduct?.unit}</span>)
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 p-6 text-left">
            {/* Adjustment Type Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Action type</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={adjustType === 'add' ? 'default' : 'outline'}
                  className={cn("h-9 text-xs font-medium rounded-xl", adjustType === 'add' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-slate-200")}
                  onClick={() => setAdjustType('add')}
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add (+)
                </Button>
                <Button
                  type="button"
                  variant={adjustType === 'subtract' ? 'default' : 'outline'}
                  className={cn("h-9 text-xs font-medium rounded-xl", adjustType === 'subtract' ? "bg-rose-600 hover:bg-rose-700 text-white" : "border-slate-200")}
                  onClick={() => setAdjustType('subtract')}
                >
                  <MinusCircle className="h-3.5 w-3.5 mr-1" /> Remove (-)
                </Button>
                <Button
                  type="button"
                  variant={adjustType === 'set' ? 'default' : 'outline'}
                  className={cn("h-9 text-xs font-medium rounded-xl", adjustType === 'set' ? "bg-slate-900 hover:bg-slate-800 text-white" : "border-slate-200")}
                  onClick={() => setAdjustType('set')}
                >
                  Set count (=)
                </Button>
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                {adjustType === 'set' ? 'New exact stock level' : 'Adjustment quantity'}
              </Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 25"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                className="h-10 rounded-xl border-slate-200 text-base font-mono tabular-nums font-semibold"
              />
            </div>

            {/* Projected Result Preview */}
            {adjustQty && !isNaN(parseInt(adjustQty, 10)) && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center">
                <span className="text-slate-600 font-medium">Projected new stock:</span>
                <span className={cn(
                  "font-mono tabular-nums font-bold text-sm",
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
              <Label className="text-xs font-semibold text-slate-700">Reason / audit note</Label>
              <Select value={adjustReason} onValueChange={setAdjustReason}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-medium">
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

          <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-200 gap-2">
            <Button variant="outline" onClick={() => setIsStockAdjustOpen(false)} className="rounded-xl font-medium text-xs border-slate-200">
              Cancel
            </Button>
            <Button
              onClick={handleExecuteStockAdjust}
              disabled={isAdjustingStock}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl"
            >
              {isAdjustingStock ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
              Update stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SAFE ARCHIVE CONFIRMATION ALERT */}
      <AlertDialog open={isArchiveAlertOpen} onOpenChange={setIsArchiveAlertOpen}>
        <AlertDialogContent className="rounded-2xl border border-slate-200 bg-white p-6 text-left">
          <AlertDialogHeader>
            <div className="h-11 w-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-2">
              <Archive className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold tracking-tight text-slate-900">
              Archive product: {productToArchive?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed">
              Archiving hides this product from your live storefront and marks it inactive, while preserving all historical customer orders and reporting data. You can restore it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2 space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Reason for archiving (optional)</Label>
            <Input
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder="e.g. Discontinued model or seasonal rotation"
              className="rounded-xl border-slate-200 text-xs h-10"
            />
          </div>

          <AlertDialogFooter className="mt-4 flex gap-3">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="flex-1 h-10 rounded-xl font-medium text-xs border-slate-200">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={handleConfirmArchive}
                disabled={isSubmittingForm}
                className="flex-1 h-10 rounded-xl font-semibold bg-amber-600 hover:bg-amber-700 text-white border-none text-xs"
              >
                {isSubmittingForm ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Archive className="h-4 w-4 mr-1.5" />}
                Confirm archive
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PERMANENT DELETE CONFIRMATION ALERT */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={(o) => { setIsDeleteAlertOpen(o); if (!o) setProductToDelete(null); }}>
        <AlertDialogContent className="rounded-2xl border border-slate-200 bg-white p-6 text-left">
          <AlertDialogHeader>
            <div className="h-11 w-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-2">
              <Trash2 className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold tracking-tight text-slate-900">
              Delete product: {productToDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed">
              This will permanently remove <span className="font-semibold text-slate-900">{productToDelete?.name}</span> (SKU: <span className="font-mono font-semibold">{productToDelete?.sku}</span>) from Master Inventory and your Online Storefront. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-4 flex gap-3">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="flex-1 h-10 rounded-xl font-medium text-xs border-slate-200">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={handleConfirmDelete}
                disabled={isSubmittingForm}
                className="flex-1 h-10 rounded-xl font-semibold bg-rose-600 hover:bg-rose-700 text-white border-none text-xs"
              >
                {isSubmittingForm ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
                Delete permanently
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PRODUCT DETAIL & AUDIT SLIDE-OVER SHEET */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col border-l border-slate-200 overflow-y-auto bg-slate-50 text-left">
          {selectedProduct && (
            <>
              {/* Header */}
              <div className="p-6 bg-slate-900 text-white shrink-0 relative text-left">
                <div className="flex items-center justify-between pb-3">
                  <span className="inline-flex items-center rounded-md bg-white/10 text-slate-200 border border-white/15 font-mono tabular-nums text-[11px] font-medium px-2.5 py-0.5">
                    ID: {selectedProduct.id}
                  </span>
                  <SheetClose asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Close product details"
                      className="h-8 w-8 text-white/70 hover:text-white rounded-lg"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </SheetClose>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-xl bg-white/10 border border-white/15 overflow-hidden shrink-0 flex items-center justify-center">
                    {selectedProduct.images && selectedProduct.images[0] ? (
                      <img src={selectedProduct.images[0]} referrerPolicy="no-referrer" alt={selectedProduct.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-white/50" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-white tracking-tight truncate">{selectedProduct.name}</h3>
                    <p className="text-xs text-slate-300 font-mono tabular-nums mt-0.5">SKU: {selectedProduct.sku}</p>
                    <div className="flex items-center gap-2 pt-2">
                      <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border", selectedProduct.showOnWebsite ? "bg-teal-500/20 text-teal-200 border-teal-400/30" : "bg-white/10 text-slate-300 border-white/15")}>
                        {selectedProduct.showOnWebsite ? "Online storefront" : "Offline only"}
                      </span>
                      {selectedProduct.isArchived && (
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border bg-rose-500/20 text-rose-200 border-rose-400/30">
                          Archived
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 flex-1">
                {/* Metrics Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <KpiStatCard
                    label="Sale Price (MRP)"
                    value={`${currencySymbol}${selectedProduct.price.toLocaleString()}`}
                    subtext={
                      selectedProduct.onlinePrice !== undefined && selectedProduct.onlinePrice < selectedProduct.price
                        ? `Online: ${currencySymbol}${selectedProduct.onlinePrice.toLocaleString()}`
                        : "Standard catalog price"
                    }
                  />
                  <KpiStatCard
                    label="Current Stock"
                    value={`${selectedProduct.stock} ${selectedProduct.unit}`}
                    subtext={`Safety min: ${selectedProduct.minThreshold}`}
                    tone={selectedProduct.stock <= 0 ? "danger" : selectedProduct.stock <= selectedProduct.minThreshold ? "warning" : "positive"}
                  />
                </div>

                {/* Stock Adjustment Trigger Banner */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Quick stock adjustment</p>
                    <p className="text-xs text-slate-500">Record audited stock additions, deductions, or physical counts</p>
                  </div>
                  <Button
                    size="sm"
                    className="h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shrink-0"
                    onClick={(e) => openQuickStockAdjust(e, selectedProduct)}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" /> Adjust stock
                  </Button>
                </div>

                {/* Technical & Tax Details */}
                <SectionCard title="Technical & tax profile">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-xs font-medium text-slate-500">HSN code</span>
                      <p className="font-mono tabular-nums font-semibold text-slate-900 mt-1">{selectedProduct.hsnCode || "None"}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-xs font-medium text-slate-500">GST slab</span>
                      <p className="font-mono tabular-nums font-semibold text-slate-900 mt-1">{selectedProduct.gstRate}%</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-xs font-medium text-slate-500">Batch number</span>
                      <p className="font-mono tabular-nums font-semibold text-slate-900 mt-1">{selectedProduct.batchNumber || "General"}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-xs font-medium text-slate-500">Expiry date</span>
                      <p className="font-mono tabular-nums font-semibold text-slate-900 mt-1">{selectedProduct.expiryDate || "N/A"}</p>
                    </div>
                  </div>
                </SectionCard>

                {/* Audit Trail: Stock History */}
                <SectionCard title="Stock movement history">
                  {isLoadingAuditLogs ? (
                    <div className="py-6 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
                      <p className="text-xs font-medium text-slate-500 mt-2">Loading audit trail...</p>
                    </div>
                  ) : stockAuditLogs.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">No manual stock adjustments recorded yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {stockAuditLogs.map((log) => {
                        const isPositive = log.delta > 0;
                        const logDate = log.adjustedAt ? new Date(log.adjustedAt) : null;
                        return (
                          <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-start gap-3">
                            <div className="space-y-0.5 text-left">
                              <p className="font-semibold text-slate-900">{log.reason || "Manual adjustment"}</p>
                              <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                                {logDate ? format(logDate, 'dd MMM yyyy, hh:mm a') : 'Recently'}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold font-mono tabular-nums border", isPositive ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200")}>
                                {isPositive ? `+${log.delta}` : `${log.delta}`}
                              </span>
                              <p className="text-[11px] font-mono tabular-nums text-slate-500 mt-0.5">Stock: {log.newStock}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-slate-200 bg-white flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  className="h-10 px-4 rounded-xl font-medium text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                  onClick={(e) => openDeleteDialog(e, selectedProduct)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-10 rounded-xl font-medium text-xs border-slate-200"
                  onClick={() => setIsDrawerOpen(false)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl"
                  onClick={(e) => handleOpenEdit(e, selectedProduct)}
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit product
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
      <div className="p-6 space-y-6 text-left">
        {/* Section 1: Basic Identity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">1. Basic identity</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isAiSuggesting}
              onClick={handleAiSuggest}
              className="h-8 rounded-lg border-slate-200 text-slate-700 text-xs font-medium gap-1.5"
            >
              {isAiSuggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              AI suggest meta
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Product name *</Label>
            <Input
              ref={nameInputRef}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. 550W Mono PERC Solar Panel or Wireless Mouse"
              className="h-10 rounded-xl font-medium text-sm border-slate-200 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">SKU code</Label>
              <Input
                value={formSku}
                onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                placeholder="Auto-generated if empty"
                className="h-10 rounded-xl bg-white border-slate-200 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 text-xs font-medium">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {dynamicCategories.map((c: string) => (
                    <SelectItem key={c} value={c} className="text-xs font-medium">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Unit</Label>
              <Select value={formUnit} onValueChange={setFormUnit}>
                <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {dynamicUnits.map((u: string) => (
                    <SelectItem key={u} value={u} className="text-xs font-medium">{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">GST slab</Label>
              <Select value={formGst} onValueChange={setFormGst}>
                <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {dynamicGstSlabs.map((s: number) => (
                    <SelectItem key={s} value={s.toString()} className="text-xs font-medium">{s}% GST</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator className="bg-slate-200" />

        {/* Section 2: Pricing Strategy & Storefront Controls */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-900">2. Pricing & storefront catalog</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Base price / MRP ({currencySymbol}) *</Label>
              <Input
                type="number"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                className="h-10 rounded-xl bg-white border-slate-200 font-mono tabular-nums font-semibold text-sm"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Online store price ({currencySymbol})</Label>
              <Input
                type="number"
                value={formOnlinePrice}
                onChange={(e) => setFormOnlinePrice(e.target.value)}
                className="h-10 rounded-xl bg-white border-slate-200 font-mono tabular-nums font-semibold text-sm"
                placeholder="Defaults to MRP"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Purchase cost ({currencySymbol})</Label>
              <Input
                type="number"
                value={formCost}
                onChange={(e) => setFormCost(e.target.value)}
                className="h-10 rounded-xl bg-white border-slate-200 font-mono tabular-nums font-semibold text-sm"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Safety stock threshold</Label>
              <Input
                type="number"
                value={formMinThreshold}
                onChange={(e) => setFormMinThreshold(e.target.value)}
                className="h-10 rounded-xl bg-white border-slate-200 font-mono tabular-nums text-sm"
              />
            </div>
          </div>

          {/* Pricing analytics helper */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calculator className="h-4 w-4 text-slate-600" />
                <div>
                  <p className="text-xs font-semibold text-slate-900">Profit margin</p>
                  <p className="text-[11px] text-slate-500">Markup over purchase cost</p>
                </div>
              </div>
              <p className={cn("text-lg font-bold font-mono tabular-nums", formMarginPercent >= 20 ? "text-emerald-700" : "text-amber-700")}>
                {formMarginPercent}%
              </p>
            </div>

            <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Tag className="h-4 w-4 text-emerald-700" />
                <div>
                  <p className="text-xs font-semibold text-emerald-900">Storefront discount</p>
                  <p className="text-[11px] text-emerald-700">Discount off base MRP</p>
                </div>
              </div>
              <p className="text-lg font-bold font-mono tabular-nums text-emerald-700">
                {formDiscountPercent}% off
              </p>
            </div>
          </div>

          {/* Store Builder Catalog Toggles */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <p className="text-xs font-semibold text-slate-700">
              Store builder visibility & badging
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-800">Show on website</span>
                  <p className="text-[11px] text-slate-500">Visible on storefront</p>
                </div>
                <Switch
                  checked={formShowOnWebsite}
                  onCheckedChange={setFormShowOnWebsite}
                  className="data-[state=checked]:bg-teal-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-800">Featured item</span>
                  <p className="text-[11px] text-slate-500">Featured collections</p>
                </div>
                <Switch
                  checked={formIsFeatured}
                  onCheckedChange={setFormIsFeatured}
                  className="data-[state=checked]:bg-amber-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-800">Best seller</span>
                  <p className="text-[11px] text-slate-500">Top-selling badge</p>
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

        <Separator className="bg-slate-200" />

        {/* Section 3: Stock & Logistics */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-900">3. Inventory & supplier</h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {!selectedProduct && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Initial opening stock</Label>
                <Input
                  type="number"
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                  className="h-10 rounded-xl bg-white border-slate-200 font-mono tabular-nums text-sm"
                  placeholder="0"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Primary vendor</Label>
              <Select value={formVendorId} onValueChange={setFormVendorId}>
                <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 text-xs font-medium">
                  <SelectValue placeholder="Pick supplier" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none" className="text-xs font-medium">No vendor</SelectItem>
                  {vendorList.map(v => (
                    <SelectItem key={v.id} value={v.id} className="text-xs font-medium">{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Batch number</Label>
              <Input
                value={formBatchNumber}
                onChange={(e) => setFormBatchNumber(e.target.value.toUpperCase())}
                placeholder="e.g. B-8821"
                className="h-10 rounded-xl bg-white border-slate-200 font-mono text-xs"
              />
            </div>
          </div>
        </div>

        <Separator className="bg-slate-200" />

        {/* Section 4: Images & Description */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-900">4. Media & description</h4>

          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {formImages.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={img} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt={`Product photo ${i + 1}`} />
                  <button
                    type="button"
                    aria-label={`Remove image ${i + 1}`}
                    onClick={() => setFormImages(formImages.filter((_, idx) => idx !== i))}
                    className="absolute top-1.5 right-1.5 h-6 w-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="aspect-square rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-1 hover:bg-slate-100 transition-colors"
              >
                <Upload className="h-4 w-4 text-slate-600" />
                <span className="text-xs font-medium text-slate-600">Upload</span>
              </button>
            </div>
            <input type="file" ref={imageInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold text-slate-700">Product description</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="min-h-[90px] rounded-xl bg-white border-slate-200 p-3 text-sm leading-relaxed"
                placeholder="Product specifications, features, and warranty details..."
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
