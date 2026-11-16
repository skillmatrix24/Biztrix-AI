"use client";

import { useState, useMemo } from "react";
import {
  Ticket,
  Plus,
  Search,
  Trash2,
  Edit2,
  Percent,
  Zap,
  Tag,
  Clock,
  Loader2,
  Check,
  SmartphoneNfc,
  Layers,
  Settings2,
  Info,
  ShieldCheck,
  Sparkles,
  Scissors,
  Palette,
  Eye,
  ListTodo,
  FileText,
  ShieldAlert,
  Layout,
  Save,
  FolderPlus,
  Grid,
  Star,
  Gift,
  Gem,
  ArrowUp,
  ArrowDown,
  Link2,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader, EmptyStatePanel } from "@/components/ui/editorial";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
  setDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
} from "@/firebase";
import { collection, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

const OFFER_TYPES = [
  { id: "percentage", label: "Percentage (%)", icon: Percent, valueLabel: "Discount Percentage", placeholder: "e.g. 10" },
  { id: "fixed", label: "Flat Amount (₹)", icon: Tag, valueLabel: "Flat Discount Value", placeholder: "e.g. 500" },
  { id: "bogo", label: "Buy X Get Y (BOGO)", icon: Layers, valueLabel: "Offer Description", placeholder: "e.g. Buy 1 Get 1" },
  { id: "wallet", label: "Wallet Cashback", icon: Zap, valueLabel: "Cashback Amount", placeholder: "e.g. 50" },
];

const GROUP_ICONS = [
  { id: "Star", icon: Star },
  { id: "Zap", icon: Zap },
  { id: "Gift", icon: Gift },
  { id: "Flame", icon: Sparkles },
  { id: "Ticket", icon: Ticket },
  { id: "Tag", icon: Tag },
  { id: "Gem", icon: Gem },
];

const THEMES: Record<string, { label: string; class: string; accent: string }> = {
  blue: { label: "Indigo Night", class: "bg-gradient-to-br from-blue-600 to-indigo-800", accent: "text-blue-100" },
  purple: { label: "Royal Purple", class: "bg-gradient-to-br from-purple-600 to-pink-700", accent: "text-purple-100" },
  orange: { label: "Sunset Glow", class: "bg-gradient-to-br from-orange-500 to-red-600", accent: "text-orange-100" },
  green: { label: "Emerald Forest", class: "bg-gradient-to-br from-emerald-500 to-teal-700", accent: "text-emerald-100" },
  black: { label: "Carbon Black", class: "bg-gradient-to-br from-slate-800 to-slate-950", accent: "text-slate-300" },
  red: { label: "Crimson Fire", class: "bg-gradient-to-br from-red-600 to-rose-900", accent: "text-red-100" },
  gold: { label: "Golden Luxury", class: "bg-gradient-to-br from-amber-500 to-yellow-700", accent: "text-yellow-100" },
  cyan: { label: "Ocean Cyan", class: "bg-gradient-to-br from-cyan-500 to-blue-700", accent: "text-cyan-100" },
  rose: { label: "Rose Quartz", class: "bg-gradient-to-br from-rose-500 to-pink-600", accent: "text-rose-100" },
  indigo: { label: "Deep Space", class: "bg-gradient-to-br from-indigo-900 to-slate-900", accent: "text-indigo-200" },
};

const CARD_STYLES = [
  { id: "ticket", label: "Classic Ticket", icon: Scissors, desc: "Dashed cut-line layout" },
  { id: "modern", label: "Modern Card", icon: Layout, desc: "Clean top-to-bottom layout" },
  { id: "neon", label: "High Contrast", icon: Zap, desc: "Bold typography focus" },
  { id: "pro", label: "Executive", icon: ShieldCheck, desc: "Structured VIP badge style" },
];

const THEME_LIST = Object.entries(THEMES).map(([id, val]) => ({ id, ...val }));

export default function CouponManagementPage() {
  const firestore = useFirestore();
  const { user } = useUser();

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

  const couponsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(collection(firestore, "businesses", businessId, "coupons"), orderBy("status", "asc"))
        : null,
    [firestore, businessId]
  );
  const { data: couponsData, isLoading } = useCollection<any>(couponsQuery);
  const coupons = couponsData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inspectingCoupon, setInspectingCoupon] = useState<any>(null);

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<any>(null);

  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupIcon, setNewGroupIcon] = useState("Star");

  const [formData, setFormData] = useState({
    code: "",
    type: "percentage",
    value: "10",
    minOrder: "0",
    maxDiscount: "",
    expiryDate: "",
    usageLimit: "0",
    perUserLimit: "1",
    category: "All",
    groupId: "none",
    status: "active",
    theme: "blue",
    cardStyle: "ticket",
    isStackable: false,
    descriptionHeading: "Offer Details",
    rules: "Valid for all customers\nNot applicable with other offers\nManagement decision is final",
  });

  const offerGroups = useMemo(() => business?.offerGroups || [], [business]);

  const filteredCoupons = useMemo(() => {
    return (coupons || []).filter((c: any) =>
      c.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [coupons, searchTerm]);

  const handleSave = () => {
    if (!formData.code || !formData.value || !businessId) {
      toast({
        variant: "destructive",
        title: "Missing Data",
        description: "Promo code and value are required.",
      });
      return;
    }

    setIsSaving(true);
    const couponId = formData.code.toUpperCase();
    const docRef = doc(firestore, "businesses", businessId, "coupons", couponId);

    setDocumentNonBlocking(
      docRef,
      {
        ...formData,
        id: couponId,
        value: formData.type === "bogo" ? formData.value : parseFloat(formData.value),
        minOrder: parseFloat(formData.minOrder) || 0,
        usageLimit: parseInt(formData.usageLimit) || 0,
        perUserLimit: parseInt(formData.perUserLimit) || 1,
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    setTimeout(() => {
      setIsSaving(false);
      setIsAddOpen(false);
      resetFormState();
      toast({
        title: "Offer Saved",
        description: `Code ${couponId} is now available in your loyalty registry.`,
      });
    }, 500);
  };

  const resetFormState = () => {
    setFormData({
      code: "",
      type: "percentage",
      value: "10",
      minOrder: "0",
      maxDiscount: "",
      expiryDate: "",
      usageLimit: "0",
      perUserLimit: "1",
      category: "All",
      groupId: "none",
      status: "active",
      theme: "blue",
      cardStyle: "ticket",
      isStackable: false,
      descriptionHeading: "Offer Details",
      rules: "Valid for all customers\nNot applicable with other offers\nManagement decision is final",
    });
  };

  const handleAddGroup = () => {
    if (!newGroupName.trim() || !businessRef) return;
    const newGroup = {
      id: `gr_${Date.now()}`,
      name: newGroupName.trim(),
      icon: newGroupIcon,
    };
    updateDocumentNonBlocking(businessRef, {
      offerGroups: [...offerGroups, newGroup],
      updatedAt: serverTimestamp(),
    });
    setNewGroupName("");
    toast({ title: "Group Created" });
  };

  const moveGroup = (idx: number, direction: "up" | "down") => {
    if (!businessRef || !offerGroups) return;
    const newGroups = [...offerGroups];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newGroups.length) return;

    [newGroups[idx], newGroups[targetIdx]] = [newGroups[targetIdx], newGroups[idx]];

    updateDocumentNonBlocking(businessRef, {
      offerGroups: newGroups,
      updatedAt: serverTimestamp(),
    });
    toast({ title: "Group Order Updated" });
  };

  const removeGroup = (groupId: string) => {
    if (!businessRef) return;
    updateDocumentNonBlocking(businessRef, {
      offerGroups: offerGroups.filter((g: any) => g.id !== groupId),
      updatedAt: serverTimestamp(),
    });
    toast({ title: "Group Removed" });
  };

  const confirmDelete = () => {
    if (!businessId || !couponToDelete) return;
    deleteDocumentNonBlocking(doc(firestore, "businesses", businessId, "coupons", couponToDelete.id));
    setIsDeleteAlertOpen(false);
    setCouponToDelete(null);
    toast({ title: "Offer Deleted", variant: "destructive" });
  };

  const handleEdit = (gw: any) => {
    setFormData({
      ...gw,
      value: gw.value?.toString() || "0",
      minOrder: gw.minOrder?.toString() || "0",
      usageLimit: gw.usageLimit?.toString() || "0",
      perUserLimit: gw.perUserLimit?.toString() || "1",
      maxDiscount: gw.maxDiscount?.toString() || "",
      groupId: gw.groupId || "none",
      isStackable: !!gw.isStackable,
    });
    setIsAddOpen(true);
  };

  const currencySymbol = getCurrencySymbol(business?.currency || "INR");

  return (
    <div className="space-y-6 pb-20 text-left">
      <PageHeader
        title="Offer & Card Hub"
        description="Design coupon cards, configure redemption limits, and organize offer groups."
        breadcrumb="Loyalty / Coupons"
        backHref="/loyalty"
        backLabel="Back to Loyalty"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsGroupManagerOpen(true)}
              className="h-10 px-4 rounded-xl text-xs font-semibold"
            >
              <FolderPlus className="mr-2 h-4 w-4" /> Manage Groups
            </Button>
            <Dialog
              open={isAddOpen}
              onOpenChange={(o) => {
                setIsAddOpen(o);
                if (!o) resetFormState();
              }}
            >
              <DialogTrigger asChild>
                <Button className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold">
                  <Plus className="mr-2 h-4 w-4" /> Create Offer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[1060px] rounded-2xl border border-slate-200 p-0 overflow-hidden w-[96vw] max-h-[92vh]">
                <div className="flex flex-col lg:flex-row h-full">
                  <div className="flex-1 flex flex-col bg-white overflow-hidden">
                    <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800 text-left shrink-0">
                      <div className="flex items-center gap-3.5">
                        <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                          <Palette className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <DialogTitle className="text-lg font-bold text-white">
                            Offer Card Designer
                          </DialogTitle>
                          <DialogDescription className="text-slate-300 text-xs mt-0.5">
                            Configure discount logic, stacking rules, and card theme
                          </DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                    <ScrollArea className="flex-1 max-h-[64vh] p-6">
                      <div className="space-y-7 pb-4 text-left">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4 text-slate-600" />
                            <h4 className="text-xs font-semibold text-slate-700">Reward Logic</h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="offer-code" className="text-xs font-medium text-slate-600">
                                Promo Code
                              </Label>
                              <Input
                                id="offer-code"
                                value={formData.code}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    code: e.target.value.toUpperCase().replace(/\s+/g, ""),
                                  })
                                }
                                placeholder="e.g. FESTIVE2026"
                                className="h-10 rounded-xl font-mono font-bold tracking-wider"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-slate-600">Offer Group</Label>
                              <Select
                                value={formData.groupId}
                                onValueChange={(v) => setFormData({ ...formData, groupId: v })}
                              >
                                <SelectTrigger className="h-10 rounded-xl">
                                  <SelectValue placeholder="No Group" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="none" className="text-xs font-medium">
                                    No Group (General)
                                  </SelectItem>
                                  {offerGroups.map((g: any) => (
                                    <SelectItem key={g.id} value={g.id} className="text-xs font-medium">
                                      {g.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-slate-600">Benefit Type</Label>
                              <Select
                                value={formData.type}
                                onValueChange={(v) => setFormData({ ...formData, type: v, value: "" })}
                              >
                                <SelectTrigger className="h-10 rounded-xl">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  {OFFER_TYPES.map((t) => (
                                    <SelectItem key={t.id} value={t.id} className="text-xs font-medium">
                                      {t.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="offer-val" className="text-xs font-medium text-slate-600">
                                {OFFER_TYPES.find((t) => t.id === formData.type)?.valueLabel || "Value"}
                              </Label>
                              <Input
                                id="offer-val"
                                type={formData.type === "bogo" ? "text" : "number"}
                                value={formData.value}
                                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                placeholder={OFFER_TYPES.find((t) => t.id === formData.type)?.placeholder}
                                className="h-10 rounded-xl font-mono font-bold"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-slate-600" />
                            <h4 className="text-xs font-semibold text-slate-700">Stacking Rules</h4>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                            <div className="space-y-0.5">
                              <Label htmlFor="stackable-switch" className="text-xs font-semibold text-slate-900 cursor-pointer">
                                Allow Stacking
                              </Label>
                              <p className="text-xs text-slate-500">
                                Can be combined with other stackable offers at billing
                              </p>
                            </div>
                            <Switch
                              id="stackable-switch"
                              checked={formData.isStackable}
                              onCheckedChange={(v) => setFormData({ ...formData, isStackable: v })}
                            />
                          </div>
                          <Alert className="bg-slate-50 border-slate-200 rounded-xl">
                            <Info className="h-4 w-4 text-slate-500" />
                            <AlertDescription className="text-xs text-slate-600">
                              When off, this offer is exclusive and automatically replaces other coupons on the bill.
                            </AlertDescription>
                          </Alert>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-slate-600" />
                            <h4 className="text-xs font-semibold text-slate-700">Card Appearance</h4>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-slate-600">Card Style</Label>
                            <div className="grid grid-cols-2 gap-3">
                              {CARD_STYLES.map((style) => (
                                <button
                                  key={style.id}
                                  type="button"
                                  aria-pressed={formData.cardStyle === style.id}
                                  onClick={() => setFormData({ ...formData, cardStyle: style.id })}
                                  className={cn(
                                    "p-3.5 rounded-xl border text-left flex flex-col gap-1.5 transition-colors",
                                    formData.cardStyle === style.id
                                      ? "border-slate-900 bg-slate-50"
                                      : "border-slate-200 bg-white hover:border-slate-300"
                                  )}
                                >
                                  <style.icon
                                    className={cn(
                                      "h-4 w-4",
                                      formData.cardStyle === style.id ? "text-slate-900" : "text-slate-400"
                                    )}
                                  />
                                  <p className="text-xs font-semibold text-slate-900">{style.label}</p>
                                  <p className="text-xs text-slate-500 leading-snug">{style.desc}</p>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-slate-600">Color Theme</Label>
                            <div className="flex flex-wrap gap-2.5">
                              {THEME_LIST.map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  aria-label={`Select theme ${t.label}`}
                                  aria-pressed={formData.theme === t.id}
                                  onClick={() => setFormData({ ...formData, theme: t.id })}
                                  className={cn(
                                    "h-10 w-10 rounded-full border-2 transition-transform relative overflow-hidden",
                                    t.class,
                                    formData.theme === t.id
                                      ? "border-slate-900 scale-110 ring-2 ring-slate-900/20"
                                      : "border-white opacity-85 hover:opacity-100"
                                  )}
                                  title={t.label}
                                >
                                  {formData.theme === t.id && (
                                    <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-slate-600" />
                            <h4 className="text-xs font-semibold text-slate-700">Validity & Limits</h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="min-spend" className="text-xs font-medium text-slate-600">
                                Min Spend ({currencySymbol})
                              </Label>
                              <Input
                                id="min-spend"
                                type="number"
                                value={formData.minOrder}
                                onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                                className="h-10 rounded-xl font-mono tabular-nums"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="expiry-date" className="text-xs font-medium text-slate-600">
                                Expiry Date
                              </Label>
                              <Input
                                id="expiry-date"
                                type="date"
                                value={formData.expiryDate}
                                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                className="h-10 rounded-xl font-mono"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="usage-limit" className="text-xs font-medium text-slate-600">
                                Global Usage Limit (0 for unlimited)
                              </Label>
                              <Input
                                id="usage-limit"
                                type="number"
                                value={formData.usageLimit}
                                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                                className="h-10 rounded-xl font-mono tabular-nums"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="per-user-limit" className="text-xs font-medium text-slate-600">
                                Per User Limit
                              </Label>
                              <Input
                                id="per-user-limit"
                                type="number"
                                value={formData.perUserLimit}
                                onChange={(e) => setFormData({ ...formData, perUserLimit: e.target.value })}
                                className="h-10 rounded-xl font-mono tabular-nums"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-600" />
                            <h4 className="text-xs font-semibold text-slate-700">Offer Terms</h4>
                          </div>
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="desc-heading" className="text-xs font-medium text-slate-600">
                                Display Heading
                              </Label>
                              <Input
                                id="desc-heading"
                                value={formData.descriptionHeading}
                                onChange={(e) =>
                                  setFormData({ ...formData, descriptionHeading: e.target.value })
                                }
                                className="h-10 rounded-xl"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="offer-rules" className="text-xs font-medium text-slate-600">
                                Terms (Line by line)
                              </Label>
                              <Textarea
                                id="offer-rules"
                                value={formData.rules}
                                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                                className="min-h-[110px] rounded-xl p-3 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                    <div className="p-5 bg-slate-50 border-t border-slate-200 shrink-0">
                      <Button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Offer Card
                      </Button>
                    </div>
                  </div>

                  <div className="hidden lg:flex w-[390px] bg-slate-50 flex-col items-center justify-center p-8 border-l border-slate-200">
                    <div className="w-full space-y-6">
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <Eye className="h-4 w-4" />
                        <p className="text-xs font-semibold">Live Card Preview</p>
                      </div>
                      <CouponPreviewCard
                        data={formData}
                        business={business}
                        currencySymbol={currencySymbol}
                        hideInspectButton
                      />
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search promo code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 pl-10 rounded-xl bg-white"
          />
        </div>
        <p className="text-xs text-slate-500 font-mono tabular-nums">
          {filteredCoupons.length} {filteredCoupons.length === 1 ? "offer" : "offers"}
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-3" />
          <p className="text-xs text-slate-500">Loading offers...</p>
        </div>
      ) : filteredCoupons.length === 0 ? (
        <EmptyStatePanel
          icon={Ticket}
          title="No offers found"
          description="Create your first promotional coupon or loyalty reward card to attach to tiers or share with members."
          action={
            <Button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              <Plus className="mr-2 h-4 w-4" /> Create Offer
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCoupons.map((c: any) => (
            <CouponPreviewCard
              key={c.id}
              data={c}
              business={business}
              currencySymbol={currencySymbol}
              onInspect={() => setInspectingCoupon(c)}
              onEdit={() => handleEdit(c)}
              onDelete={() => {
                setCouponToDelete(c);
                setIsDeleteAlertOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* GROUP MANAGER DIALOG */}
      <Dialog open={isGroupManagerOpen} onOpenChange={setIsGroupManagerOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl border border-slate-200 p-0 overflow-hidden w-[95vw] text-left">
          <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                <Grid className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">Offer Group Hub</DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  Organize your coupon cards into display categories
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <Label htmlFor="new-group-name" className="text-xs font-semibold text-slate-700">
                Add New Group
              </Label>
              <Input
                id="new-group-name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Summer Deals 2026"
                className="h-10 rounded-xl bg-white"
              />
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex gap-1.5 flex-wrap">
                  {GROUP_ICONS.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      aria-label={`Select icon ${i.id}`}
                      aria-pressed={newGroupIcon === i.id}
                      onClick={() => setNewGroupIcon(i.id)}
                      className={cn(
                        "h-8 w-8 rounded-lg border flex items-center justify-center transition-colors",
                        newGroupIcon === i.id
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                      )}
                    >
                      <i.icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
                <Button
                  type="button"
                  onClick={handleAddGroup}
                  className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                >
                  Create
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-xs font-semibold text-slate-700">
                Saved Groups ({offerGroups.length})
              </Label>
              <ScrollArea className="h-60">
                <div className="space-y-2.5 pr-2 text-left">
                  {offerGroups.length === 0 ? (
                    <p className="text-center py-8 text-xs text-slate-400">No groups created yet.</p>
                  ) : (
                    offerGroups.map((g: any, idx: number) => {
                      const IconComp = GROUP_ICONS.find((i) => i.id === g.icon)?.icon || Star;
                      return (
                        <div
                          key={g.id}
                          className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex flex-col gap-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Move ${g.name} up`}
                                className="h-5 w-5 rounded"
                                disabled={idx === 0}
                                onClick={() => moveGroup(idx, "up")}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Move ${g.name} down`}
                                className="h-5 w-5 rounded"
                                disabled={idx === offerGroups.length - 1}
                                onClick={() => moveGroup(idx, "down")}
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                              <IconComp className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-semibold text-slate-900 truncate">{g.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete group ${g.name}`}
                            onClick={() => removeGroup(g.id)}
                            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsGroupManagerOpen(false)}
              className="w-full h-10 rounded-xl text-xs font-semibold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* INSPECTOR DIALOG */}
      <Dialog open={!!inspectingCoupon} onOpenChange={(open) => !open && setInspectingCoupon(null)}>
        <DialogContent className="sm:max-w-[460px] h-[85vh] rounded-2xl border border-slate-200 p-0 overflow-hidden w-[95vw] flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>Offer Details</DialogTitle>
            <DialogDescription>Terms and conditions for this offer card</DialogDescription>
          </DialogHeader>
          {inspectingCoupon && (
            <>
              <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-center shrink-0">
                <div className="w-full max-w-[340px]">
                  <CouponPreviewCard
                    data={inspectingCoupon}
                    business={business}
                    currencySymbol={currencySymbol}
                    hideInspectButton
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-4 text-left">
                  <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-slate-500" />
                    {inspectingCoupon.descriptionHeading || "Offer Rules"}
                  </h4>
                  <ul className="space-y-2.5">
                    {(inspectingCoupon.rules || "")
                      .split("\n")
                      .filter((l: string) => l.trim() !== "")
                      .map((rule: string, i: number) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                          <span>{rule}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </ScrollArea>
              <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200 gap-3 shrink-0 flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-10 rounded-xl text-xs font-semibold"
                  onClick={() => setInspectingCoupon(null)}
                >
                  Close
                </Button>
                <Button
                  asChild
                  className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold gap-2"
                >
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Hi! Checkout this offer: ${inspectingCoupon.code} at ${business?.name || "our store"}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <SmartphoneNfc className="h-4 w-4" /> Send on WhatsApp
                  </a>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-2xl border border-slate-200 p-6 text-left">
          <AlertDialogHeader>
            <div className="h-11 w-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-3">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">Delete Offer?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600 leading-relaxed">
              Permanently remove{" "}
              <span className="font-semibold text-slate-900">
                &ldquo;{couponToDelete?.code}&rdquo;
              </span>{" "}
              from the store registry? Members will no longer be able to redeem this code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-3">
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline" className="flex-1 h-10 rounded-xl text-xs">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                onClick={confirmDelete}
                className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                Delete Offer
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CouponPreviewCard({
  data,
  business,
  currencySymbol,
  onInspect,
  onEdit,
  onDelete,
  member,
  hideInspectButton = false,
}: any) {
  const theme = THEMES[data.theme || "blue"] || THEMES.blue;
  const style = data.cardStyle || "ticket";

  const getFinalExpiry = () => {
    if (member && member.type?.toLowerCase() !== "lifetime" && member.expiryDate) {
      try {
        const d = new Date(member.expiryDate);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (data.expiryDate && data.expiryDate !== "LIFETIME" && data.expiryDate.trim() !== "") {
      try {
        const d = new Date(data.expiryDate);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        }
      } catch (e) {
        console.error(e);
      }
    }
    return "Lifetime";
  };

  const displayExpiry = getFinalExpiry();
  const groupName = business?.offerGroups?.find((g: any) => g.id === data.groupId)?.name || "Promo Offer";
  const benefitLabel =
    data.type === "percentage"
      ? `${data.value}% OFF`
      : data.type === "bogo"
        ? data.value
        : `${currencySymbol}${data.value} FLAT`;
  const usageLabel = `${data.usageCount || 0}/${data.usageLimit || "∞"}`;

  const renderTopContent = () => {
    if (style === "ticket") {
      return (
        <div className="flex justify-between relative z-10 h-full min-h-[96px]">
          <div className="flex-1 pr-4 flex flex-col justify-center text-left min-w-0">
            <div className="flex items-center gap-1.5 text-white/80 mb-1.5">
              <Tag className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-medium truncate">{groupName}</span>
            </div>
            <h3 className="text-xl font-bold font-mono tracking-wider leading-tight truncate">
              {data.code || "CODE"}
            </h3>
            <p className="text-xs font-semibold text-white/90 mt-1.5">{benefitLabel}</p>
          </div>
          <div className="w-[34%] flex flex-col items-center justify-between py-1 border-l border-dashed border-white/30 pl-3 text-center">
            <div>
              <p className="text-xs text-white/75">Used</p>
              <p className="text-xs font-mono font-bold text-white tabular-nums">{usageLabel}</p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-xs font-bold text-white">
              {business?.name?.charAt(0) || "B"}
            </div>
          </div>
        </div>
      );
    }

    if (style === "modern") {
      return (
        <div className="relative z-10 flex flex-col h-full text-left justify-between min-h-[96px]">
          <div className="w-full flex justify-between items-center">
            <Badge className="bg-white/20 text-white border-none text-xs font-medium">
              {data.perUserLimit || 1} / user
            </Badge>
            <div className="h-7 w-7 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-xs font-bold text-white">
              {business?.name?.charAt(0) || "B"}
            </div>
          </div>
          <div className="py-2">
            <p className="text-xs text-white/75">{groupName}</p>
            <h3 className="text-xl font-bold font-mono tracking-wider">{data.code || "CODE"}</h3>
            <p className="text-xs font-semibold text-white/90">{benefitLabel}</p>
          </div>
          <div className="flex justify-between items-center text-xs text-white/75 font-mono tabular-nums">
            <span>Usage: {usageLabel}</span>
            <span>{data.status || "active"}</span>
          </div>
        </div>
      );
    }

    if (style === "neon") {
      return (
        <div className="relative z-10 flex flex-col h-full justify-between text-left min-h-[96px]">
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/80 font-medium">{groupName}</span>
            <span className="px-2 py-0.5 rounded bg-black/30 text-xs font-mono text-white tabular-nums">
              {data.perUserLimit || 1}x limit
            </span>
          </div>
          <div className="mt-2 space-y-1">
            <h3 className="text-2xl font-bold font-mono tracking-tight">{data.code || "CODE"}</h3>
            <p className="text-xs font-semibold text-white/90">{benefitLabel}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative z-10 flex flex-col h-full justify-between text-left min-h-[96px]">
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-1.5 text-white/90">
            <Crown className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{groupName}</span>
          </div>
          <h3 className="text-base font-bold font-mono tracking-wider">{data.code || "CODE"}</h3>
        </div>
        <div className="my-2 p-2.5 rounded-lg bg-black/20 border border-white/15 text-center">
          <p className="text-xs font-bold tracking-wide text-white">{benefitLabel}</p>
        </div>
        <div className="flex justify-between items-center text-xs text-white/80 font-mono tabular-nums">
          <span>{data.perUserLimit || 1} use/user</span>
          <span>Used {usageLabel}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col text-left">
      <div className={cn("p-5 relative text-white min-h-[130px]", theme.class)}>
        {renderTopContent()}
      </div>
      <div className="p-5 space-y-4 bg-white flex-1 flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-500">Min Spend</p>
            <p className="text-lg font-bold font-mono text-slate-900 tabular-nums">
              {currencySymbol}
              {data.minOrder || 0}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-1">Stacking</p>
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-medium",
                data.isStackable
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-600 border-slate-200"
              )}
            >
              {data.isStackable ? "Stackable" : "Exclusive"}
            </Badge>
          </div>
        </div>

        {!hideInspectButton && onInspect && (
          <Button
            type="button"
            variant="outline"
            onClick={onInspect}
            className="w-full h-10 rounded-xl text-xs font-semibold"
          >
            <Info className="h-3.5 w-3.5 mr-1.5" /> Inspect Reward
          </Button>
        )}

        <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-mono tabular-nums">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>{displayExpiry}</span>
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Edit offer ${data.code}`}
                className="h-7 w-7 rounded-lg text-slate-600 hover:text-slate-900"
                onClick={onEdit}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete offer ${data.code}`}
                className="h-7 w-7 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
