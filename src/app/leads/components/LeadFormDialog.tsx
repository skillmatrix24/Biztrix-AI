"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Package,
  Search,
  UserCheck,
  UserPlus,
  Edit2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  CRM_LOST_REASONS,
  CRM_PRIORITIES,
  CRM_SOURCES,
  CRM_STAGES,
  addDaysToYmd,
  calculateLeadIntentScore,
  findDuplicatePhoneMatch,
  getTodayLocalYmd,
  normalizeLeadPriority,
} from "@/lib/crm-engine";
import {
  type Customer,
  type Lead,
  type LeadPriority,
  type LeadSource,
  type LeadStatus,
  type Product,
} from "@/lib/mock-db";
import { cn, normalizePhoneNumber } from "@/lib/utils";

export interface LeadFormSubmitPayload {
  name: string;
  phone: string;
  normalizedPhone: string;
  email: string;
  companyName: string;
  gstin: string;
  location: string;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  budget: number;
  interest: string;
  interestedProductIds: string[];
  viewedProducts: string[];
  assignedTo: string;
  assignedName: string;
  followUpDate: string;
  followUpTime: string;
  lostReason: string;
  notes: string;
  intentScore: number;
}

interface StaffOption {
  id: string;
  name: string;
  role?: string;
  email?: string;
}

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingLead: Lead | null;
  existingLeads: Lead[];
  customers: Customer[];
  products: Product[];
  staffMembers: StaffOption[];
  currencySymbol: string;
  currentUserId?: string;
  onSubmitLead: (payload: LeadFormSubmitPayload, editingLead: Lead | null) => void;
  onInspectExistingLead?: (lead: Lead) => void;
}

export function LeadFormDialog({
  open,
  onOpenChange,
  editingLead,
  existingLeads,
  customers,
  products,
  staffMembers,
  currencySymbol,
  currentUserId,
  onSubmitLead,
  onInspectExistingLead,
}: LeadFormDialogProps) {
  const todayYmd = useMemo(() => getTodayLocalYmd(), []);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");
  const [location, setLocation] = useState("");
  const [source, setSource] = useState<LeadSource>("Walk-in");
  const [status, setStatus] = useState<LeadStatus>("new");
  const [priority, setPriority] = useState<LeadPriority>("Warm");
  const [budgetStr, setBudgetStr] = useState("");
  const [interest, setInterest] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("unassigned");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [lostReason, setLostReason] = useState(CRM_LOST_REASONS[0]);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setProductSearch("");

    if (editingLead) {
      setName(editingLead.name || "");
      setPhone(editingLead.phone || "");
      setEmail(editingLead.email || "");
      setCompanyName(editingLead.companyName || "");
      setGstin(editingLead.gstin || "");
      setLocation(editingLead.location || "");
      setSource(
        CRM_SOURCES.includes(editingLead.source) ? editingLead.source : "Walk-in"
      );
      setStatus(editingLead.status || "new");
      setPriority(normalizeLeadPriority(editingLead.priority, editingLead.intentScore));
      setBudgetStr(editingLead.budget ? String(editingLead.budget) : "");
      setInterest(editingLead.interest || "");

      if (Array.isArray(editingLead.interestedProductIds) && editingLead.interestedProductIds.length > 0) {
        setSelectedProductIds(editingLead.interestedProductIds);
      } else if (Array.isArray(editingLead.viewedProducts) && editingLead.viewedProducts.length > 0) {
        const matchedIds = products
          .filter((p) => editingLead.viewedProducts?.includes(p.name))
          .map((p) => p.id);
        setSelectedProductIds(matchedIds);
      } else {
        setSelectedProductIds([]);
      }

      setAssignedTo(editingLead.assignedTo || "unassigned");
      setFollowUpDate(editingLead.followUpDate || "");
      setFollowUpTime(editingLead.followUpTime || "");
      setLostReason(editingLead.lostReason || CRM_LOST_REASONS[0]);
      setNotes(editingLead.notes || "");
    } else {
      setName("");
      setPhone("");
      setEmail("");
      setCompanyName("");
      setGstin("");
      setLocation("");
      setSource("Walk-in");
      setStatus("new");
      setPriority("Warm");
      setBudgetStr("");
      setInterest("");
      setSelectedProductIds([]);
      setAssignedTo(currentUserId && staffMembers.some((s) => s.id === currentUserId) ? currentUserId : "unassigned");
      setFollowUpDate(addDaysToYmd(todayYmd, 1));
      setFollowUpTime("11:00");
      setLostReason(CRM_LOST_REASONS[0]);
      setNotes("");
    }
  }, [open, editingLead, currentUserId, staffMembers, products, todayYmd]);

  const activeProducts = useMemo(
    () => products.filter((p) => !p.isArchived && p.isActive !== false),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const list = q
      ? activeProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.sku && p.sku.toLowerCase().includes(q)) ||
            (p.category && p.category.toLowerCase().includes(q))
        )
      : activeProducts;
    return list.slice(0, 24);
  }, [activeProducts, productSearch]);

  const selectedProductNames = useMemo(() => {
    const idSet = new Set(selectedProductIds);
    return activeProducts.filter((p) => idSet.has(p.id)).map((p) => p.name);
  }, [activeProducts, selectedProductIds]);

  const selectedProductsSum = useMemo(() => {
    const idSet = new Set(selectedProductIds);
    return Math.round(
      activeProducts
        .filter((p) => idSet.has(p.id))
        .reduce((sum, p) => sum + (Number(p.price) || 0), 0)
    );
  }, [activeProducts, selectedProductIds]);

  const duplicateCheck = useMemo(
    () => findDuplicatePhoneMatch(phone, existingLeads, customers, editingLead?.id),
    [phone, existingLeads, customers, editingLead?.id]
  );

  const previewIntentScore = useMemo(() => {
    return calculateLeadIntentScore(
      {
        status,
        priority,
        source,
        budget: Number(budgetStr) || 0,
        email,
        companyName,
        gstin,
        interest,
        interestedProductIds: selectedProductIds,
        viewedProducts: selectedProductNames,
        followUpDate,
        activities: editingLead?.activities || [],
      },
      todayYmd
    );
  }, [
    status,
    priority,
    source,
    budgetStr,
    email,
    companyName,
    gstin,
    interest,
    selectedProductIds,
    selectedProductNames,
    followUpDate,
    editingLead?.activities,
    todayYmd,
  ]);

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const digits = phone.replace(/\D/g, "");

    if (!trimmedName) {
      setFormError("Please enter the client's name.");
      return;
    }
    if (digits.length < 7) {
      setFormError("Please enter a valid contact phone number (at least 7 digits).");
      return;
    }
    if (status === "lost" && !lostReason.trim()) {
      setFormError("Please select or enter a reason for marking this lead as Lost.");
      return;
    }

    const assignedMember =
      assignedTo && assignedTo !== "unassigned"
        ? staffMembers.find((s) => s.id === assignedTo)
        : undefined;

    const cleanBudget = Math.max(0, Math.round(Number(budgetStr) || 0));

    onSubmitLead(
      {
        name: trimmedName,
        phone: phone.trim(),
        normalizedPhone: normalizePhoneNumber(phone),
        email: email.trim(),
        companyName: companyName.trim(),
        gstin: gstin.trim().toUpperCase(),
        location: location.trim(),
        source,
        status,
        priority,
        budget: cleanBudget,
        interest: interest.trim(),
        interestedProductIds: selectedProductIds,
        viewedProducts: selectedProductNames,
        assignedTo: assignedMember ? assignedMember.id : "",
        assignedName: assignedMember ? assignedMember.name : "",
        followUpDate: followUpDate.trim(),
        followUpTime: followUpTime.trim(),
        lostReason: status === "lost" ? lostReason.trim() : "",
        notes: notes.trim(),
        intentScore: previewIntentScore,
      },
      editingLead
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-[660px] max-h-[calc(100dvh-2rem)] rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden flex flex-col text-left">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
          <DialogHeader className="px-5 py-4 sm:px-6 sm:py-5 bg-slate-900 text-white shrink-0 pr-12 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                {editingLead ? (
                  <Edit2 className="h-4 w-4 text-white" />
                ) : (
                  <UserPlus className="h-5 w-5 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-bold text-white truncate">
                  {editingLead ? "Edit Lead Details" : "Register Sales Inquiry"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300">
                  {editingLead
                    ? "Update pipeline stage, deal value, product interest, or follow-up schedule."
                    : "Capture buyer details, expected deal value, interested items, and follow-up date."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-5">
            {formError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800 font-medium">
                {formError}
              </div>
            )}

            {(duplicateCheck.existingLead || duplicateCheck.existingCustomer) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1 min-w-0 flex-1">
                    {duplicateCheck.existingLead && (
                      <p className="text-xs text-amber-950 leading-relaxed">
                        Phone <span className="font-mono font-semibold">{duplicateCheck.normalizedPhone}</span> matches an existing lead:{" "}
                        <span className="font-semibold">{duplicateCheck.existingLead.name}</span>{" "}
                        ({duplicateCheck.existingLead.status}).
                      </p>
                    )}
                    {duplicateCheck.existingCustomer && (
                      <p className="text-xs text-amber-900 leading-relaxed flex items-center gap-1.5 flex-wrap">
                        <UserCheck className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                        Already registered in Customers as{" "}
                        <span className="font-semibold">{duplicateCheck.existingCustomer.name}</span>.
                      </p>
                    )}
                  </div>
                </div>
                {duplicateCheck.existingLead && onInspectExistingLead && (
                  <div className="pl-6">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onOpenChange(false);
                        onInspectExistingLead(duplicateCheck.existingLead!);
                      }}
                      className="h-8 px-3 text-xs font-semibold rounded-lg border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
                    >
                      Open Existing Lead Instead
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Section 1: Contact & Firm */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-800">Contact & Organization</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="lead-name" className="text-xs font-medium text-slate-700">
                    Client Name *
                  </Label>
                  <Input
                    id="lead-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rajesh Verma"
                    required
                    className="h-10 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-phone" className="text-xs font-medium text-slate-700">
                    Phone / WhatsApp *
                  </Label>
                  <Input
                    id="lead-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    required
                    className="h-10 rounded-xl text-sm font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-email" className="text-xs font-medium text-slate-700">
                    Email Address
                  </Label>
                  <Input
                    id="lead-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@company.com"
                    className="h-10 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-location" className="text-xs font-medium text-slate-700">
                    City / Area
                  </Label>
                  <Input
                    id="lead-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Indiranagar, Bengaluru"
                    className="h-10 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-company" className="text-xs font-medium text-slate-700">
                    Company / Business Name
                  </Label>
                  <Input
                    id="lead-company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Optional B2B firm name"
                    className="h-10 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-gstin" className="text-xs font-medium text-slate-700">
                    GSTIN (Optional)
                  </Label>
                  <Input
                    id="lead-gstin"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    maxLength={15}
                    placeholder="27AAAAA0000A1Z5"
                    className="h-10 rounded-xl text-sm font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Pipeline Qualification */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-800">Pipeline & Deal Qualification</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Pipeline Stage</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
                    <SelectTrigger className="h-10 rounded-xl text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      {CRM_STAGES.map((st) => (
                        <SelectItem key={st.id} value={st.id}>
                          {st.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Lead Priority</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as LeadPriority)}>
                    <SelectTrigger className="h-10 rounded-xl text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      {CRM_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p} Priority
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Source Channel</Label>
                  <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
                    <SelectTrigger className="h-10 rounded-xl text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      {CRM_SOURCES.map((src) => (
                        <SelectItem key={src} value={src}>
                          {src}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {status === "lost" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-rose-700">Lost Reason *</Label>
                  <Select value={lostReason} onValueChange={setLostReason}>
                    <SelectTrigger className="h-10 rounded-xl text-xs font-medium border-rose-200 bg-rose-50/40">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      {CRM_LOST_REASONS.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="lead-budget" className="text-xs font-medium text-slate-700">
                      Expected Deal Value ({currencySymbol})
                    </Label>
                    {selectedProductsSum > 0 && Number(budgetStr || 0) !== selectedProductsSum && (
                      <button
                        type="button"
                        onClick={() => setBudgetStr(String(selectedProductsSum))}
                        className="text-[11px] font-semibold text-primary hover:underline whitespace-nowrap"
                      >
                        Use items sum ({currencySymbol}
                        {selectedProductsSum.toLocaleString("en-IN")})
                      </button>
                    )}
                  </div>
                  <Input
                    id="lead-budget"
                    type="number"
                    min={0}
                    step="1"
                    value={budgetStr}
                    onChange={(e) => setBudgetStr(e.target.value)}
                    placeholder="0"
                    className="h-10 rounded-xl text-sm font-mono tabular-nums"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Assigned Team Member</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger className="h-10 rounded-xl text-xs font-medium">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {staffMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                          {member.role ? ` · ${member.role}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section 3: Interested Products & Requirement */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-800">
                  Product / Service Interest
                </p>
                {selectedProductIds.length > 0 && (
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    {selectedProductIds.length} selected
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-interest" className="text-xs font-medium text-slate-700">
                  Requirement Summary
                </Label>
                <Input
                  id="lead-interest"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  placeholder="e.g. 10 office chairs + installation, or custom AMC package"
                  className="h-10 rounded-xl text-sm"
                />
              </div>

              {activeProducts.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2.5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Attach catalog products (search name or SKU)..."
                      className="pl-8 h-8 text-xs rounded-lg bg-white border-slate-200"
                    />
                  </div>
                  <div className="max-h-32 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
                    {filteredProducts.map((prod) => {
                      const isChecked = selectedProductIds.includes(prod.id);
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => toggleProduct(prod.id)}
                          className={cn(
                            "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-left text-xs transition-colors",
                            isChecked
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          )}
                        >
                          <span className="flex items-center gap-1.5 min-w-0 truncate">
                            {isChecked ? (
                              <Check className="h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate font-medium">{prod.name}</span>
                          </span>
                          <span
                            className={cn(
                              "font-mono tabular-nums text-[11px] shrink-0",
                              isChecked ? "text-slate-200" : "text-slate-500"
                            )}
                          >
                            {currencySymbol}
                            {Math.round(Number(prod.price) || 0).toLocaleString("en-IN")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Next Follow-up & Notes */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-800">Follow-up Schedule & Notes</p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFollowUpDate(todayYmd)}
                    className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowUpDate(addDaysToYmd(todayYmd, 1))}
                    className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowUpDate(addDaysToYmd(todayYmd, 3))}
                    className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap"
                  >
                    +3 Days
                  </button>
                  {followUpDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setFollowUpDate("");
                        setFollowUpTime("");
                      }}
                      className="px-2 py-1 rounded-md text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors whitespace-nowrap"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="lead-followup-date" className="text-xs font-medium text-slate-700">
                    Next Follow-up Date
                  </Label>
                  <Input
                    id="lead-followup-date"
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="h-10 rounded-xl text-sm font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-followup-time" className="text-xs font-medium text-slate-700">
                    Preferred Time
                  </Label>
                  <Input
                    id="lead-followup-time"
                    type="time"
                    value={followUpTime}
                    onChange={(e) => setFollowUpTime(e.target.value)}
                    className="h-10 rounded-xl text-sm font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-notes" className="text-xs font-medium text-slate-700">
                  Sales Notes & Context
                </Label>
                <Textarea
                  id="lead-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Key objections, pricing terms discussed, site address, or decision timeline..."
                  className="rounded-xl text-sm resize-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="px-5 py-3.5 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-200 shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-slate-600">
              Calculated Intent:{" "}
              <span className="font-mono tabular-nums font-bold text-slate-900">
                {previewIntentScore}%
              </span>
            </p>
            <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-10 px-4 text-xs font-semibold rounded-xl flex-1 sm:flex-initial"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 text-xs font-semibold rounded-xl flex-1 sm:flex-initial"
              >
                {editingLead ? "Save Changes" : "Save Lead"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
