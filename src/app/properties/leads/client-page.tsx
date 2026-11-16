"use client";

import { useState, useMemo } from "react";
import {
  Search,
  SmartphoneNfc,
  Edit2,
  Trash2,
  LayoutList,
  LayoutGrid,
  Target,
  User,
  Building,
  Briefcase,
  Lock,
  AlertTriangle,
  Calculator,
  MapPin,
  Smartphone,
  Phone,
  UserPlus,
  Columns,
  Share2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageHeader,
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

const STAGES = [
  {
    id: "new",
    label: "Fresh Inquiry",
    dot: "bg-blue-600",
    bg: "bg-blue-50/40",
    border: "border-blue-200",
    badge: "bg-blue-50 text-blue-700",
  },
  {
    id: "contacted",
    label: "Call Done",
    dot: "bg-amber-500",
    bg: "bg-amber-50/40",
    border: "border-amber-200",
    badge: "bg-amber-50 text-amber-700",
  },
  {
    id: "site-visit",
    label: "Site Visit",
    dot: "bg-purple-600",
    bg: "bg-purple-50/40",
    border: "border-purple-200",
    badge: "bg-purple-50 text-purple-700",
  },
  {
    id: "negotiation",
    label: "Negotiating",
    dot: "bg-orange-500",
    bg: "bg-orange-50/40",
    border: "border-orange-200",
    badge: "bg-orange-50 text-orange-700",
  },
  {
    id: "won",
    label: "Deal Closed",
    dot: "bg-emerald-600",
    bg: "bg-emerald-50/40",
    border: "border-emerald-200",
    badge: "bg-emerald-50 text-emerald-700",
  },
];

const maskName = (name: string) => {
  if (!name) return "";
  if (name.length <= 2) return name;
  return `${name[0]}***${name[name.length - 1]}`;
};

const maskPhone = (phone: string) => {
  if (!phone) return "";
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 5) return phone;
  return `${clean.substring(0, 2)}******${clean.substring(clean.length - 2)}`;
};

function ModalSectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    </div>
  );
}

export default function RealEstateLeadsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

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

  const leadsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "realEstateLeads"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: leadsData } = useCollection<any>(leadsQuery);
  const leads = leadsData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [activeStage, setActiveStage] = useState("all");
  const [activeView, setActiveView] = useState<"board" | "grid" | "list">(
    "grid"
  );

  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});

  const [isDeleteAlertOpen, setIsDeleteOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<any>(null);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const name = l.name || "";
      const phone = l.phone || "";
      const matchesSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        phone.includes(searchTerm);
      const matchesStage =
        activeStage === "all" || (l.leadStage || "new") === activeStage;
      return matchesSearch && matchesStage;
    });
  }, [leads, searchTerm, activeStage]);

  const generateLeadMessage = (lead: any) => {
    const config = business?.waMarketingConfigs?.["Lead/Customer Profile"];
    if (config) {
      const toggles = config.toggles || {};
      const msgParts: string[] = [];

      if (config.header) msgParts.push(config.header);
      if (toggles.includeName) msgParts.push(`Client: ${lead.name}`);
      if (toggles.includePhone) msgParts.push(`Phone: ${lead.phone}`);
      if (toggles.includeSource) msgParts.push(`Source: ${lead.source}`);
      if (toggles.includeInterest)
        msgParts.push(`Interest: ${lead.propertyTypeInterest}`);
      if (toggles.includeBudget)
        msgParts.push(
          `Budget: ${currencySymbol}${parseFloat(
            lead.budgetMax || 0
          ).toLocaleString()}`
        );
      if (toggles.includeLocation)
        msgParts.push(`Location: ${lead.location || lead.village || "N/A"}`);
      if (toggles.includeAgent)
        msgParts.push(`Agent: ${lead.agentName || "Owner"}`);
      if (toggles.includeStatus)
        msgParts.push(
          `Stage: ${
            STAGES.find((s) => s.id === (lead.leadStage || "new"))?.label
          }`
        );
      if (toggles.includeNotes && lead.notes) {
        msgParts.push(`\n*Remarks:*\n${lead.notes}`);
      }
      if (config.footer) msgParts.push(`\n${config.footer}`);
      return msgParts.join("\n");
    }

    return `Inquiry Update\nClient: ${lead.name}\nInterest: ${
      lead.propertyTypeInterest
    }\nBudget Max: ${currencySymbol}${parseFloat(
      lead.budgetMax || 0
    ).toLocaleString()}\nLocation: ${lead.location || "N/A"}`;
  };

  const getWhatsAppActionHref = (lead: any) => {
    const isOwner = lead.assignedAgentId === user?.uid;
    const shouldMask = !isAdmin && !isOwner;

    if (shouldMask) {
      const ownerAgent = teamMembers.find((m) => m.id === lead.assignedAgentId);
      if (ownerAgent?.phone) {
        const message = `Hi ${ownerAgent.name}, I noticed you are managing the lead *${maskName(
          lead.name
        )}*. I have some updates/queries regarding this customer. Can we discuss?`;
        return `https://wa.me/${ownerAgent.phone.replace(
          /\D/g,
          ""
        )}?text=${encodeURIComponent(message)}`;
      }
      return null;
    }

    const finalMsg = generateLeadMessage(lead);
    return `https://wa.me/${(lead.phone || "").replace(
      /\D/g,
      ""
    )}?text=${encodeURIComponent(finalMsg)}`;
  };

  const getUniversalShareHref = (lead: any) => {
    const finalMsg = generateLeadMessage(lead);
    return `https://wa.me/?text=${encodeURIComponent(finalMsg)}`;
  };

  const getCallActionHref = (lead: any) => {
    const isOwner = lead.assignedAgentId === user?.uid;
    const shouldMask = !isAdmin && !isOwner;

    if (shouldMask) {
      const ownerAgent = teamMembers.find((m) => m.id === lead.assignedAgentId);
      if (ownerAgent?.phone) {
        return `tel:${ownerAgent.phone.replace(/\D/g, "")}`;
      }
      return null;
    }

    return lead.phone ? `tel:${lead.phone.replace(/\D/g, "")}` : null;
  };

  const handleOpenDetail = (lead: any) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, lead: any) => {
    e.stopPropagation();
    const shouldMask = !isAdmin && lead.assignedAgentId !== user?.uid;
    if (shouldMask) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only the assigned agent or an admin can edit this lead.",
      });
      return;
    }
    setEditFormData({ ...lead });
    setIsEditModalOpen(true);
  };

  const handleUpdateFullLead = () => {
    if (!businessId || !editFormData.id) return;
    const leadRef = doc(
      firestore,
      "businesses",
      businessId,
      "realEstateLeads",
      editFormData.id
    );
    updateDocumentNonBlocking(leadRef, {
      ...editFormData,
      updatedAt: serverTimestamp(),
    });
    setIsEditModalOpen(false);
    toast({ title: "Lead Updated" });
  };

  const openDeleteAlert = (e: React.MouseEvent, lead: any) => {
    e.stopPropagation();
    if (!isAdmin) return;
    setLeadToDelete(lead);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!businessId || !leadToDelete) return;
    deleteDocumentNonBlocking(
      doc(
        firestore,
        "businesses",
        businessId,
        "realEstateLeads",
        leadToDelete.id
      )
    );
    setIsDeleteOpen(false);
    toast({ title: "Lead Deleted", variant: "destructive" });
  };

  return (
    <div className="space-y-6 pb-16 text-left">
      <PageHeader
        breadcrumb="Real Estate CRM"
        title="Customer Enquiries"
        description="Track buyer inquiries, site visits, and agent ownership across deal stages."
        actions={
          <Button
            asChild
            className="h-9 rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Link href="/properties/leads/new">
              <UserPlus className="mr-1.5 h-4 w-4" /> Register Customer
            </Link>
          </Button>
        }
      />

      <div className="space-y-5">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto">
            <div className="flex shrink-0 rounded-xl border border-slate-200 bg-white p-1">
              <Button
                type="button"
                variant={activeView === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveView("grid")}
                className="h-8 rounded-lg px-3 text-xs font-medium"
              >
                <LayoutGrid className="mr-1.5 h-3.5 w-3.5" /> Grid
              </Button>
              <Button
                type="button"
                variant={activeView === "board" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveView("board")}
                className="h-8 rounded-lg px-3 text-xs font-medium"
              >
                <Columns className="mr-1.5 h-3.5 w-3.5" /> Board
              </Button>
              <Button
                type="button"
                variant={activeView === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveView("list")}
                className="h-8 rounded-lg px-3 text-xs font-medium"
              >
                <LayoutList className="mr-1.5 h-3.5 w-3.5" /> List
              </Button>
            </div>

            <div className="flex flex-1 items-center gap-1.5 overflow-x-auto scrollbar-hide">
              <Button
                type="button"
                variant={activeStage === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveStage("all")}
                className="h-8 rounded-lg px-3 text-xs font-medium whitespace-nowrap"
              >
                All Stages
              </Button>
              {STAGES.map((s) => (
                <Button
                  type="button"
                  key={s.id}
                  variant={activeStage === s.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveStage(s.id)}
                  className="h-8 rounded-lg px-3 text-xs font-medium whitespace-nowrap"
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="relative w-full xl:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 rounded-xl border-slate-200 bg-white pl-9 text-xs"
            />
          </div>
        </div>

        {activeView === "board" && (
          <div className="flex min-h-[560px] gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {STAGES.map((stage) => {
              const stageLeads = filteredLeads.filter(
                (l) => (l.leadStage || "new") === stage.id
              );
              return (
                <div key={stage.id} className="w-[300px] shrink-0 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn("h-2.5 w-2.5 rounded-full", stage.dot)}
                      />
                      <h3 className="text-xs font-semibold text-slate-700">
                        {stage.label}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="rounded-md font-mono text-[11px]"
                      >
                        {stageLeads.length}
                      </Badge>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "min-h-[500px] space-y-3 rounded-2xl border p-2.5",
                      stage.bg,
                      stage.border
                    )}
                  >
                    {stageLeads.length === 0 ? (
                      <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400">
                        No leads
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          currentUser={user}
                          isAdmin={isAdmin}
                          currencySymbol={currencySymbol}
                          waHref={getWhatsAppActionHref(lead)}
                          shareHref={getUniversalShareHref(lead)}
                          callHref={getCallActionHref(lead)}
                          onEdit={(e: any) => handleOpenEdit(e, lead)}
                          onDelete={(e: any) => openDeleteAlert(e, lead)}
                          onClick={() => handleOpenDetail(lead)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeView === "grid" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredLeads.length === 0 ? (
              <div className="col-span-full">
                <EmptyStatePanel
                  icon={Target}
                  title="No matching customer leads"
                  description="Register a new buyer inquiry or clear your stage filter."
                  action={
                    <Button asChild size="sm" className="rounded-xl">
                      <Link href="/properties/leads/new">Register Customer</Link>
                    </Button>
                  }
                />
              </div>
            ) : (
              filteredLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  currentUser={user}
                  isAdmin={isAdmin}
                  currencySymbol={currencySymbol}
                  waHref={getWhatsAppActionHref(lead)}
                  shareHref={getUniversalShareHref(lead)}
                  callHref={getCallActionHref(lead)}
                  onEdit={(e: any) => handleOpenEdit(e, lead)}
                  onDelete={(e: any) => openDeleteAlert(e, lead)}
                  onClick={() => handleOpenDetail(lead)}
                  showStage
                />
              ))
            )}
          </div>
        )}

        {activeView === "list" && (
          <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <Table className="min-w-[740px]">
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/70">
                    <TableHead className="h-11 pl-6 text-xs font-semibold text-slate-600">
                      Customer
                    </TableHead>
                    <TableHead className="h-11 text-xs font-semibold text-slate-600">
                      Requirement
                    </TableHead>
                    <TableHead className="h-11 text-center text-xs font-semibold text-slate-600">
                      Stage
                    </TableHead>
                    <TableHead className="h-11 w-40 pr-6 text-right text-xs font-semibold text-slate-600">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead: any) => {
                    const isOwner = lead.assignedAgentId === user?.uid;
                    const shouldMask = !isAdmin && !isOwner;
                    const displayName = shouldMask
                      ? maskName(lead.name)
                      : lead.name;
                    const displayPhone = shouldMask
                      ? maskPhone(lead.phone)
                      : lead.phone;
                    const stageObj = STAGES.find(
                      (s) => s.id === (lead.leadStage || "new")
                    );
                    const waHref = getWhatsAppActionHref(lead);

                    return (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer border-slate-100 transition-colors hover:bg-slate-50/60"
                        onClick={() => handleOpenDetail(lead)}
                      >
                        <TableCell className="py-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
                              {displayName?.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {displayName}
                              </p>
                              <p className="font-mono text-xs text-slate-500">
                                {displayPhone}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                              <Building className="h-3.5 w-3.5 text-slate-400" />{" "}
                              {lead.propertyTypeInterest}
                            </span>
                            <span className="mt-0.5 font-mono text-xs text-slate-500">
                              Max: {currencySymbol}
                              {parseFloat(lead.budgetMax || 0).toLocaleString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={cn(
                              "rounded-md border-none text-xs font-medium",
                              stageObj?.badge || "bg-slate-100 text-slate-700"
                            )}
                          >
                            {stageObj?.label || "New"}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="pr-6 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-end gap-1">
                            {waHref ? (
                              <Button
                                asChild
                                variant="ghost"
                                size="icon"
                                aria-label={`WhatsApp ${displayName}`}
                                className="h-8 w-8 rounded-lg text-emerald-600"
                              >
                                <a
                                  href={waHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <SmartphoneNfc className="h-4 w-4" />
                                </a>
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`WhatsApp ${displayName}`}
                                className="h-8 w-8 rounded-lg text-emerald-600"
                                onClick={() =>
                                  toast({
                                    variant: "destructive",
                                    title: "Contact Missing",
                                    description:
                                      "Lead owner's phone info is unavailable.",
                                  })
                                }
                              >
                                <SmartphoneNfc className="h-4 w-4" />
                              </Button>
                            )}
                            {!shouldMask && (
                              <Button
                                asChild
                                variant="ghost"
                                size="icon"
                                aria-label={`Share ${displayName}`}
                                className="h-8 w-8 rounded-lg text-blue-600"
                              >
                                <a
                                  href={getUniversalShareHref(lead)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Share2 className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${displayName}`}
                              className="h-8 w-8 rounded-lg text-slate-600"
                              onClick={(e) => handleOpenEdit(e, lead)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Delete ${displayName}`}
                                className="h-8 w-8 rounded-lg text-red-600"
                                onClick={(e) => openDeleteAlert(e, lead)}
                              >
                                <Trash2 className="h-4 w-4" />
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
        )}
      </div>

      {/* Lead Detail Sheet */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-xl">
          {selectedLead &&
            (() => {
              const isOwner = selectedLead.assignedAgentId === user?.uid;
              const shouldMask = !isAdmin && !isOwner;
              const displayName = shouldMask
                ? maskName(selectedLead.name)
                : selectedLead.name;
              const displayPhone = shouldMask
                ? maskPhone(selectedLead.phone)
                : selectedLead.phone;
              const stageObj = STAGES.find(
                (s) => s.id === (selectedLead.leadStage || "new")
              );
              const waHref = getWhatsAppActionHref(selectedLead);

              return (
                <>
                  <div className="shrink-0 border-b border-slate-800 bg-slate-900 p-6 text-white">
                    <div className="space-y-4 text-left">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className="rounded-md border-white/20 bg-white/10 font-mono text-xs text-white"
                        >
                          ENQUIRY: {selectedLead.id.slice(-8).toUpperCase()}
                        </Badge>
                        {!shouldMask && (
                          <div className="flex gap-2">
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              aria-label="Share lead"
                              className="h-8 w-8 rounded-lg bg-white/10 text-white hover:bg-white/20"
                            >
                              <a
                                href={getUniversalShareHref(selectedLead)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Share2 className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Edit lead"
                              className="h-8 w-8 rounded-lg bg-white/10 text-white hover:bg-white/20"
                              onClick={(e) => handleOpenEdit(e, selectedLead)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-xl font-bold text-slate-900">
                          {displayName?.charAt(0)}
                        </div>
                        <div className="space-y-1">
                          <h2 className="text-xl font-semibold text-white">
                            {displayName}
                          </h2>
                          <div className="flex items-center gap-2">
                            <Badge className="border-none bg-white/20 text-xs font-medium text-white">
                              {stageObj?.label || "New"}
                            </Badge>
                            <span className="text-xs text-slate-300">
                              Agent: {selectedLead.agentName || "Owner"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6">
                      <section className="space-y-3">
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <Smartphone className="h-4 w-4 text-slate-600" /> Client Contact
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                            <p className="text-xs text-slate-500">WhatsApp Number</p>
                            <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">
                              {displayPhone}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                            <p className="text-xs text-slate-500">Category</p>
                            <p className="mt-0.5 text-sm font-semibold text-slate-900">
                              {selectedLead.category || "General"}
                            </p>
                          </div>
                        </div>
                      </section>

                      <Separator />

                      <section className="space-y-3">
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <Calculator className="h-4 w-4 text-slate-600" /> Interest & Budget
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs text-slate-500">Property Type</p>
                            <p className="mt-0.5 text-base font-semibold text-slate-900">
                              {selectedLead.propertyTypeInterest}
                            </p>
                            <p className="text-xs text-slate-500">
                              {selectedLead.classification}
                            </p>
                          </div>
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                            <p className="text-xs text-emerald-700">Max Budget</p>
                            <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-emerald-800">
                              {currencySymbol}
                              {parseFloat(
                                selectedLead.budgetMax || 0
                              ).toLocaleString()}
                            </p>
                            <p className="font-mono text-xs text-emerald-700">
                              Min: {currencySymbol}
                              {parseFloat(
                                selectedLead.budgetMin || 0
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-3">
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <LayoutList className="h-4 w-4 text-slate-600" /> Technical Preferences
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          {selectedLead.facing && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                              <p className="text-xs text-slate-500">Facing</p>
                              <p className="mt-0.5 text-xs font-semibold text-slate-900">
                                {selectedLead.facing}
                              </p>
                            </div>
                          )}
                          {selectedLead.roadType && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                              <p className="text-xs text-slate-500">Road</p>
                              <p className="mt-0.5 text-xs font-semibold text-slate-900">
                                {selectedLead.roadType}
                              </p>
                            </div>
                          )}
                          {selectedLead.area && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                              <p className="text-xs text-slate-500">Area</p>
                              <p className="mt-0.5 font-mono text-xs font-semibold text-slate-900">
                                {selectedLead.area} {selectedLead.areaUnit}
                              </p>
                            </div>
                          )}
                        </div>
                      </section>

                      {!shouldMask && selectedLead.notes && (
                        <section className="space-y-2">
                          <p className="text-xs font-semibold text-slate-700">
                            Remarks
                          </p>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs leading-relaxed text-slate-700">
                              &ldquo;{selectedLead.notes}&rdquo;
                            </p>
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
                    {waHref ? (
                      <Button
                        asChild
                        className="h-10 flex-1 gap-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <a
                          href={waHref}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <SmartphoneNfc className="h-4 w-4" /> Message on WhatsApp
                        </a>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        className="h-10 flex-1 gap-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
                        onClick={() =>
                          toast({
                            variant: "destructive",
                            title: "Contact Missing",
                            description: "Owner phone number is unavailable.",
                          })
                        }
                      >
                        <SmartphoneNfc className="h-4 w-4" /> Message on WhatsApp
                      </Button>
                    )}
                  </div>
                </>
              );
            })()}
        </SheetContent>
      </Sheet>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="w-[95vw] overflow-hidden rounded-2xl border-slate-200 p-0 sm:max-w-[700px]">
          <DialogHeader className="border-b border-slate-800 bg-slate-900 p-6 text-left text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                <Edit2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-white">
                  Edit Customer Profile
                </DialogTitle>
                <p className="text-xs text-slate-300">
                  Update customer details, agent ownership, and stage
                </p>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] p-6">
            <div className="space-y-6">
              <section>
                <ModalSectionHeader icon={User} title="1. Customer Profile" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Full Name *
                    </Label>
                    <Input
                      value={editFormData.name || ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          name: e.target.value,
                        })
                      }
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      WhatsApp *
                    </Label>
                    <Input
                      value={editFormData.phone || ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          phone: e.target.value,
                        })
                      }
                      className="h-10 rounded-xl font-mono"
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
                      <SelectTrigger className="h-10 rounded-xl bg-white text-xs">
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
                </div>
              </section>

              <section>
                <ModalSectionHeader
                  icon={Briefcase}
                  title="2. Pipeline Stage"
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Lifecycle Stage
                    </Label>
                    <Select
                      value={editFormData.leadStage || "new"}
                      onValueChange={(v) =>
                        setEditFormData({ ...editFormData, leadStage: v })
                      }
                    >
                      <SelectTrigger className="h-10 rounded-xl bg-white text-xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
            </div>
          </ScrollArea>

          <DialogFooter className="border-t border-slate-100 bg-slate-50/70 p-5">
            <Button
              type="button"
              className="h-10 w-full rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
              onClick={handleUpdateFullLead}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="rounded-2xl border-slate-200 p-6">
          <AlertDialogHeader>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-lg font-semibold text-slate-900">
              Delete Lead?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600">
              Are you sure you want to permanently remove{" "}
              <span className="font-semibold text-slate-900">
                &ldquo;{leadToDelete?.name}&rdquo;
              </span>
              ?
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
                onClick={confirmDelete}
                className="h-10 flex-1 rounded-xl bg-red-600 text-xs text-white hover:bg-red-700"
              >
                Delete Lead
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LeadCard({
  lead,
  currentUser,
  isAdmin,
  currencySymbol,
  waHref,
  shareHref,
  callHref,
  onEdit,
  onDelete,
  onClick,
  showStage = false,
}: any) {
  const stage = STAGES.find((s) => s.id === (lead.leadStage || "new"));
  const isOwner = lead.assignedAgentId === currentUser?.uid;
  const shouldMask = !isAdmin && !isOwner;

  const displayName = shouldMask ? maskName(lead.name) : lead.name;
  const displayPhone = shouldMask ? maskPhone(lead.phone) : lead.phone;

  return (
    <Card className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors hover:border-slate-300">
      <CardContent
        className="flex-1 cursor-pointer space-y-3 p-4"
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-0.5">
            <h4 className="truncate text-sm font-semibold text-slate-900">
              {displayName}
            </h4>
            <div className="flex items-center gap-1.5 text-slate-500">
              <Phone className="h-3 w-3 shrink-0" />
              <p className="truncate font-mono text-xs">{displayPhone}</p>
            </div>
          </div>

          <div
            className="flex shrink-0 items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {!shouldMask && (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  aria-label={`Share ${displayName}`}
                  className="h-7 w-7 rounded-lg text-blue-600 hover:bg-blue-50"
                >
                  <a href={shareHref} target="_blank" rel="noopener noreferrer">
                    <Share2 className="h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${displayName}`}
                  className="h-7 w-7 rounded-lg text-slate-600 hover:bg-slate-100"
                  onClick={onEdit}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {isAdmin && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete ${displayName}`}
                className="h-7 w-7 rounded-lg text-red-600 hover:bg-red-50"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {shouldMask && <Lock className="h-3.5 w-3.5 text-slate-400" />}
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className="rounded-md bg-white text-[11px] font-medium text-slate-700"
              >
                {lead.propertyTypeInterest}
              </Badge>
              {showStage && (
                <Badge
                  className={cn(
                    "rounded-md border-none text-[11px] font-medium",
                    stage?.badge || "bg-slate-100 text-slate-700"
                  )}
                >
                  {stage?.label}
                </Badge>
              )}
            </div>
            <span className="font-mono text-xs font-bold tabular-nums text-slate-900">
              {currencySymbol}
              {parseFloat(lead.budgetMax || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5 truncate text-xs text-slate-500">
            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />{" "}
            {lead.village || lead.location || "Location pending"}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-[11px] font-semibold text-slate-700">
              {(lead.agentName || "O").charAt(0)}
            </div>
            <span className="max-w-[90px] truncate text-xs text-slate-600">
              {lead.agentName || "Owner"}
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            {new Date(lead.createdAt || Date.now()).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
            })}
          </span>
        </div>
      </CardContent>

      <div
        className="grid grid-cols-2 border-t border-slate-100 bg-slate-50/50"
        onClick={(e) => e.stopPropagation()}
      >
        {callHref ? (
          <Button
            asChild
            variant="ghost"
            className="h-10 gap-1.5 rounded-none border-r border-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <a href={callHref}>
              <Phone className="h-3.5 w-3.5" /> Call{" "}
              {shouldMask ? "Owner" : ""}
            </a>
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="h-10 gap-1.5 rounded-none border-r border-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            onClick={() =>
              toast({
                variant: "destructive",
                title: "Contact Missing",
                description: "Phone number is not available.",
              })
            }
          >
            <Phone className="h-3.5 w-3.5" /> Call{" "}
            {shouldMask ? "Owner" : ""}
          </Button>
        )}

        {waHref ? (
          <Button
            asChild
            variant="ghost"
            className="h-10 gap-1.5 rounded-none text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <SmartphoneNfc className="h-3.5 w-3.5" /> WhatsApp{" "}
              {shouldMask ? "Owner" : ""}
            </a>
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="h-10 gap-1.5 rounded-none text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
            onClick={() =>
              toast({
                variant: "destructive",
                title: "Contact Missing",
                description: "Owner WhatsApp info is unavailable.",
              })
            }
          >
            <SmartphoneNfc className="h-3.5 w-3.5" /> WhatsApp{" "}
            {shouldMask ? "Owner" : ""}
          </Button>
        )}
      </div>
    </Card>
  );
}
