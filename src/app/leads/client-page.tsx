"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BrainCircuit,
  CalendarClock,
  CloudUpload,
  Columns3,
  Download,
  Flame,
  LayoutList,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  TrendingUp,
  Wallet,
} from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiStatCard, PageHeader } from "@/components/ui/editorial";
import { CoreQuotaBanner } from "@/components/quota-upgrade-banner";
import { useMarketplaceCatalog } from "@/hooks/use-marketplace-catalog";
import { evaluateCoreQuota } from "@/lib/marketplace-catalog";
import {
  CRM_PRIORITIES,
  CRM_SOURCES,
  CRM_STAGES,
  buildCrmLeadFromStorefrontPayload,
  buildFollowUpTaskPayload,
  calculateLeadIntentScore,
  computeCrmPipelineStats,
  createLeadActivityEntry,
  exportLeadsToCsv,
  filterAndSortLeads,
  getLeadFollowUpTaskId,
  getTodayLocalYmd,
  prependLeadActivity,
  resolveCrmLeadIdForStorefrontLead,
  type LeadFilterState,
  type LeadSortOption,
  type ParsedCsvLeadDraft,
} from "@/lib/crm-engine";
import { syncStorefrontRelays } from "@/app/actions/website-actions";
import {
  type Customer,
  type Lead,
  type LeadActivityType,
  type LeadPriority,
  type LeadSource,
  type LeadStatus,
  type Product,
} from "@/lib/mock-db";
import { cn, getCurrencySymbol, normalizePhoneNumber } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  addDocumentNonBlocking,
  commitBatchNonBlocking,
  deleteDocumentNonBlocking,
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
  useUser,
} from "@/firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { differenceInDays, parseISO } from "date-fns";

import { LeadFormDialog, type LeadFormSubmitPayload } from "./components/LeadFormDialog";
import { LeadImportDialog } from "./components/LeadImportDialog";
import { LeadDetailSheet } from "./components/LeadDetailSheet";
import {
  LeadsFollowUpView,
  LeadsKanbanView,
  LeadsTableView,
} from "./components/LeadsViews";

type CrmViewMode = "kanban" | "table" | "followups";

export default function LeadsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);

  const businessId = userProfile?.businessId;
  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const { limits } = useMarketplaceCatalog();

  const leadsQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "leads") : null),
    [firestore, businessId]
  );
  const { data: leadsListData, isLoading: isLeadsLoading } = useCollection<Lead>(leadsQuery);
  const leadsList = useMemo(() => leadsListData || [], [leadsListData]);

  const customersQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "customers") : null),
    [firestore, businessId]
  );
  const { data: customersData } = useCollection<Customer>(customersQuery);
  const customersList = useMemo(() => customersData || [], [customersData]);

  const productsQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "products") : null),
    [firestore, businessId]
  );
  const { data: productsData } = useCollection<Product>(productsQuery);
  const productsList = useMemo(() => productsData || [], [productsData]);

  const staffQuery = useMemoFirebase(
    () =>
      businessId && user?.uid && !user.isAnonymous
        ? query(collection(firestore, "users"), where("businessId", "==", businessId))
        : null,
    [firestore, businessId, user?.uid, user?.isAnonymous]
  );
  const { data: staffRaw } = useCollection<any>(staffQuery);

  const staffMembers = useMemo(() => {
    const raw = staffRaw || [];
    return raw
      .filter((m: any) => m && m.id && m.status !== "disabled")
      .map((m: any) => ({
        id: String(m.id),
        name: String(m.name || m.displayName || m.email || "Team Member"),
        role: m.role ? String(m.role) : undefined,
        email: m.email ? String(m.email) : undefined,
      }));
  }, [staffRaw]);

  const quotationsQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "quotations") : null),
    [firestore, businessId]
  );
  const { data: quotationsData } = useCollection<any>(quotationsQuery);
  const quotationsList = useMemo(() => quotationsData || [], [quotationsData]);

  const projectsQuery = useMemoFirebase(
    () => (businessId ? collection(firestore, "businesses", businessId, "projects") : null),
    [firestore, businessId]
  );
  const { data: projectsData } = useCollection<any>(projectsQuery);
  const projectsList = useMemo(() => projectsData || [], [projectsData]);

  const syncedBusinessRef = useRef<string | null>(null);

  // Auto-sync storefront & funnel relays + promote any unpromoted storefront_leads into CRM leads
  useEffect(() => {
    if (!businessId || !user || user.isAnonymous || isLeadsLoading) return;
    if (syncedBusinessRef.current === businessId) return;
    syncedBusinessRef.current = businessId;

    let cancelled = false;
    (async () => {
      try {
        const idToken = await user.getIdToken().catch(() => undefined);
        await syncStorefrontRelays({ businessId, idToken }).catch(() => {});

        const sfSnap = await getDocs(
          collection(firestore, "businesses", businessId, "storefront_leads")
        );
        if (cancelled || sfSnap.empty) return;

        const existingIds = new Set(leadsList.map((l) => l.id));
        const existingPhones = new Set(
          leadsList
            .map((l) => normalizePhoneNumber(l.phone || ""))
            .filter((p) => p.length >= 10)
        );

        const batch = writeBatch(firestore);
        let promotedCount = 0;

        for (const sfDoc of sfSnap.docs) {
          const sfData = sfDoc.data() || {};
          const crmId = resolveCrmLeadIdForStorefrontLead(sfDoc.id);
          if (existingIds.has(crmId)) continue;

          const phoneNorm = normalizePhoneNumber(sfData.phone || "");
          if (phoneNorm.length >= 10 && existingPhones.has(phoneNorm)) continue;

          const crmPayload = buildCrmLeadFromStorefrontPayload({
            businessId,
            storefrontLeadId: sfDoc.id,
            name: sfData.name || sfData.customerName,
            phone: sfData.phone,
            email: sfData.email,
            interest: sfData.interest,
            message: sfData.message,
            source: sfData.source,
            funnelName: sfData.funnelName,
            budget: sfData.budget,
            location: sfData.location,
            todayYmd: getTodayLocalYmd(),
          });

          batch.set(
            doc(firestore, "businesses", businessId, "leads", crmId),
            {
              ...crmPayload,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          existingIds.add(crmId);
          if (phoneNorm.length >= 10) existingPhones.add(phoneNorm);
          promotedCount += 1;
          if (promotedCount >= 200) break;
        }

        if (promotedCount > 0 && !cancelled) {
          await commitBatchNonBlocking(batch);
          toast({
            title: "Website & Funnel Leads Synced",
            description: `Imported ${promotedCount} new inbound storefront inquiry${
              promotedCount === 1 ? "" : "ies"
            } into Sales CRM.`,
          });
        }
      } catch (err) {
        console.error("Storefront CRM sync error:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [businessId, user, isLeadsLoading, firestore, leadsList]);

  const hasSolarSuite = useMemo(() => {
    const addons: string[] = Array.isArray(business?.enabledAddons) ? business.enabledAddons : [];
    const mods: string[] = Array.isArray(business?.activeModules) ? business.activeModules : [];
    return (
      addons.includes("suite_solar") ||
      mods.includes("solar") ||
      business?.industrySuite === "solar"
    );
  }, [business]);

  const hasPropertySuite = useMemo(() => {
    const addons: string[] = Array.isArray(business?.enabledAddons) ? business.enabledAddons : [];
    const mods: string[] = Array.isArray(business?.activeModules) ? business.activeModules : [];
    return (
      addons.includes("suite_property") ||
      mods.includes("properties") ||
      business?.industrySuite === "property" ||
      business?.industrySuite === "real_estate"
    );
  }, [business]);

  const todayYmd = useMemo(() => getTodayLocalYmd(), []);
  const currencySymbol = getCurrencySymbol(business?.currency);
  const actorName =
    userProfile?.name || user?.displayName || user?.email?.split("@")[0] || "Team";

  const pipelineStats = useMemo(
    () => computeCrmPipelineStats(leadsList, todayYmd),
    [leadsList, todayYmd]
  );

  // Active Pipeline Quota fix: count only open pipeline leads (!converted && !lost)
  const leadsQuota = useMemo(
    () => evaluateCoreQuota("leads", pipelineStats.activeLeadsCount, { limits, business }),
    [pipelineStats.activeLeadsCount, limits, business]
  );
  const isLimitReached = leadsQuota.isReached;
  const remainingQuota = leadsQuota.isUnlimited
    ? null
    : Math.max(0, leadsQuota.limit - pipelineStats.activeLeadsCount);

  const isTrialExpired = useMemo(() => {
    if (business?.status !== "trial") return false;
    if (!business?.trialEndDate) return false;
    const endDate = business.trialEndDate?.toDate
      ? business.trialEndDate.toDate()
      : typeof business.trialEndDate === "string"
        ? parseISO(business.trialEndDate)
        : new Date();
    return differenceInDays(endDate, new Date()) < 0;
  }, [business]);

  // UI View & Filter State
  const [viewMode, setViewMode] = useState<CrmViewMode>("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<LeadFilterState["stage"]>("all");
  const [sourceFilter, setSourceFilter] = useState<LeadFilterState["source"]>("all");
  const [priorityFilter, setPriorityFilter] = useState<LeadFilterState["priority"]>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [followUpFilter, setFollowUpFilter] = useState<LeadFilterState["followUp"]>("all");
  const [sortBy, setSortBy] = useState<LeadSortOption>("newest");

  // Modal & Drawer State
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [leadPendingDelete, setLeadPendingDelete] = useState<Lead | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const selectedLead = useMemo(
    () => (selectedLeadId ? leadsList.find((l) => l.id === selectedLeadId) || null : null),
    [leadsList, selectedLeadId]
  );

  const linkedQuotations = useMemo(() => {
    if (!selectedLead) return [];
    return quotationsList.filter(
      (q: any) =>
        q.leadId === selectedLead.id ||
        (selectedLead.convertedCustomerId && q.customerId === selectedLead.convertedCustomerId)
    );
  }, [quotationsList, selectedLead]);

  const linkedProjects = useMemo(() => {
    if (!selectedLead) return [];
    return projectsList.filter(
      (p: any) =>
        p.leadId === selectedLead.id ||
        p.clientId === selectedLead.id ||
        (selectedLead.convertedCustomerId && p.clientId === selectedLead.convertedCustomerId)
    );
  }, [projectsList, selectedLead]);

  const activeFilters: LeadFilterState = useMemo(
    () => ({
      search: searchTerm,
      stage: viewMode === "kanban" ? "all" : stageFilter,
      source: sourceFilter,
      priority: priorityFilter,
      assignee: assigneeFilter,
      followUp: followUpFilter,
      sortBy,
      currentUserId: user?.uid,
    }),
    [
      searchTerm,
      viewMode,
      stageFilter,
      sourceFilter,
      priorityFilter,
      assigneeFilter,
      followUpFilter,
      sortBy,
      user?.uid,
    ]
  );

  const filteredLeads = useMemo(
    () => filterAndSortLeads(leadsList, activeFilters, todayYmd),
    [leadsList, activeFilters, todayYmd]
  );

  const hasAnyActiveFilter =
    Boolean(searchTerm.trim()) ||
    (viewMode !== "kanban" && stageFilter !== "all") ||
    sourceFilter !== "all" ||
    priorityFilter !== "all" ||
    assigneeFilter !== "all" ||
    followUpFilter !== "all" ||
    sortBy !== "newest";

  const resetFilters = () => {
    setSearchTerm("");
    setStageFilter("all");
    setSourceFilter("all");
    setPriorityFilter("all");
    setAssigneeFilter("all");
    setFollowUpFilter("all");
    setSortBy("newest");
  };

  const handleOpenNewLead = () => {
    setEditingLead(null);
    setIsFormOpen(true);
  };

  const handleOpenEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setIsFormOpen(true);
  };

  const handleInspectLead = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    setIsDrawerOpen(true);
  };

  const notifyAssignedMember = (recipientId: string, leadName: string, leadId: string) => {
    if (!businessId || !recipientId || recipientId === user?.uid) return;
    const notificationsRef = collection(firestore, "businesses", businessId, "notifications");
    addDocumentNonBlocking(notificationsRef, {
      businessId,
      recipientId,
      leadId,
      title: "New Sales Lead Assigned",
      message: `${actorName} assigned inquiry "${leadName}" to you in Sales CRM.`,
      type: "message",
      isRead: false,
      createdAt: serverTimestamp(),
    });
  };

  const syncLeadFollowUpTask = (leadData: {
    id: string;
    name: string;
    phone?: string;
    interest?: string;
    priority?: LeadPriority;
    status?: LeadStatus;
    followUpDate?: string;
    followUpTime?: string;
    assignedTo?: string;
    assignedName?: string;
  }) => {
    if (!businessId) return;
    const taskId = getLeadFollowUpTaskId(leadData.id);
    const taskRef = doc(firestore, "businesses", businessId, "tasks", taskId);
    const isClosed = leadData.status === "converted" || leadData.status === "lost";

    if (isClosed || !leadData.followUpDate?.trim()) {
      updateDoc(taskRef, {
        status: "completed",
        updatedAt: serverTimestamp(),
      }).catch(() => {});
      return;
    }

    const payload = buildFollowUpTaskPayload({
      lead: leadData,
      fallbackAssigneeId: user?.uid || "",
      fallbackAssigneeName: actorName,
    });
    setDocumentNonBlocking(
      taskRef,
      {
        ...payload,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const handleSubmitLead = (payload: LeadFormSubmitPayload, existing: Lead | null) => {
    if (!businessId || isTrialExpired) return;

    if (!existing && isLimitReached) {
      toast({
        variant: "destructive",
        title: "Active Lead Limit Reached",
        description: "Close/convert existing open leads or upgrade your plan to add more.",
      });
      return;
    }

    if (existing) {
      const changes: string[] = [];
      if (existing.status !== payload.status) {
        changes.push(`stage -> ${payload.status}`);
      }
      if ((existing.budget || 0) !== payload.budget) {
        changes.push(`value -> ${currencySymbol}${payload.budget.toLocaleString("en-IN")}`);
      }
      if ((existing.followUpDate || "") !== payload.followUpDate && payload.followUpDate) {
        changes.push(`follow-up -> ${payload.followUpDate}`);
      }

      const activityEntry = createLeadActivityEntry(
        existing.status !== payload.status ? "stage_change" : "note",
        changes.length > 0
          ? `Updated lead details (${changes.join(", ")})`
          : "Updated lead profile & qualification details",
        actorName
      );

      const updatedActivities = prependLeadActivity(existing.activities, activityEntry);
      const leadRef = doc(firestore, "businesses", businessId, "leads", existing.id);

      updateDocumentNonBlocking(leadRef, {
        ...payload,
        activities: updatedActivities,
        updatedAt: serverTimestamp(),
      });

      syncLeadFollowUpTask({
        id: existing.id,
        ...payload,
      });

      if (payload.assignedTo && payload.assignedTo !== existing.assignedTo) {
        notifyAssignedMember(payload.assignedTo, payload.name, existing.id);
      }

      setIsFormOpen(false);
      setEditingLead(null);
      toast({ title: "Lead Updated", description: `${payload.name} saved.` });
      return;
    }

    const leadId = `l_${Date.now()}`;
    const createdEntry = createLeadActivityEntry(
      "created",
      `Inquiry registered via ${payload.source}${
        payload.budget > 0
          ? ` (${currencySymbol}${payload.budget.toLocaleString("en-IN")})`
          : ""
      }`,
      actorName
    );

    const newLeadDoc = {
      id: leadId,
      tenantId: businessId,
      ...payload,
      createdAt: todayYmd,
      activities: [createdEntry],
      updatedAt: serverTimestamp(),
    };

    setDocumentNonBlocking(
      doc(firestore, "businesses", businessId, "leads", leadId),
      newLeadDoc,
      { merge: true }
    );

    if (payload.followUpDate) {
      syncLeadFollowUpTask({
        id: leadId,
        ...payload,
      });
    }

    if (payload.assignedTo) {
      notifyAssignedMember(payload.assignedTo, payload.name, leadId);
    }

    setIsFormOpen(false);
    toast({
      title: "Lead Added to Pipeline",
      description: `${payload.name} added in ${payload.status} stage.`,
    });
  };

  const handleChangeStage = (lead: Lead, nextStage: LeadStatus, lostReason?: string) => {
    if (!businessId || isTrialExpired || lead.status === nextStage) return;

    const nextIntent = calculateLeadIntentScore(
      { ...lead, status: nextStage, lostReason: lostReason || lead.lostReason },
      todayYmd
    );

    const stageLabel =
      CRM_STAGES.find((s) => s.id === nextStage)?.label || nextStage;
    const entry = createLeadActivityEntry(
      "stage_change",
      `Moved pipeline stage to ${stageLabel}${lostReason ? ` · Reason: ${lostReason}` : ""}`,
      actorName
    );

    const leadRef = doc(firestore, "businesses", businessId, "leads", lead.id);
    updateDocumentNonBlocking(leadRef, {
      status: nextStage,
      intentScore: nextIntent,
      ...(nextStage === "lost" && lostReason ? { lostReason } : {}),
      activities: prependLeadActivity(lead.activities, entry),
      updatedAt: serverTimestamp(),
    });

    if (nextStage === "converted" || nextStage === "lost") {
      syncLeadFollowUpTask({ ...lead, status: nextStage });
    }

    toast({
      title: "Stage Updated",
      description: `${lead.name} moved to ${stageLabel}.`,
    });
  };

  const handleAssignStaff = (lead: Lead, staffId: string, staffName: string) => {
    if (!businessId || isTrialExpired) return;
    const entry = createLeadActivityEntry(
      "note",
      staffId ? `Assigned lead to ${staffName}` : "Cleared lead representative assignment",
      actorName
    );

    const leadRef = doc(firestore, "businesses", businessId, "leads", lead.id);
    updateDocumentNonBlocking(leadRef, {
      assignedTo: staffId,
      assignedName: staffName,
      activities: prependLeadActivity(lead.activities, entry),
      updatedAt: serverTimestamp(),
    });

    if (lead.followUpDate) {
      syncLeadFollowUpTask({ ...lead, assignedTo: staffId, assignedName: staffName });
    }

    if (staffId) {
      notifyAssignedMember(staffId, lead.name, lead.id);
    }

    toast({
      title: staffId ? "Representative Assigned" : "Assignment Cleared",
      description: staffId ? `${lead.name} assigned to ${staffName}.` : undefined,
    });
  };

  const handleScheduleFollowUp = (lead: Lead, date: string, time: string) => {
    if (!businessId || isTrialExpired) return;

    const nextIntent = calculateLeadIntentScore(
      { ...lead, followUpDate: date, followUpTime: time },
      todayYmd
    );
    const entry = createLeadActivityEntry(
      "followup",
      date
        ? `Scheduled next follow-up for ${date}${time ? ` at ${time}` : ""}`
        : "Cleared scheduled follow-up date",
      actorName
    );

    const leadRef = doc(firestore, "businesses", businessId, "leads", lead.id);
    updateDocumentNonBlocking(leadRef, {
      followUpDate: date,
      followUpTime: time,
      intentScore: nextIntent,
      activities: prependLeadActivity(lead.activities, entry),
      updatedAt: serverTimestamp(),
    });

    syncLeadFollowUpTask({
      ...lead,
      followUpDate: date,
      followUpTime: time,
    });

    toast({
      title: date ? "Follow-up Scheduled & Synced" : "Follow-up Cleared",
      description: date
        ? `Callback set for ${date}${time ? ` (${time})` : ""} and synced to Task Manager.`
        : undefined,
    });
  };

  const handleLogActivity = (lead: Lead, type: LeadActivityType, description: string) => {
    if (!businessId || isTrialExpired) return;
    const entry = createLeadActivityEntry(type, description, actorName);
    const updatedActivities = prependLeadActivity(lead.activities, entry);
    const nextIntent = calculateLeadIntentScore(
      { ...lead, activities: updatedActivities },
      todayYmd
    );

    const leadRef = doc(firestore, "businesses", businessId, "leads", lead.id);
    updateDocumentNonBlocking(leadRef, {
      activities: updatedActivities,
      intentScore: nextIntent,
      updatedAt: serverTimestamp(),
    });

    if (type === "note") {
      toast({ title: "Activity Logged" });
    }
  };

  const handleConfirmDeleteLead = () => {
    if (!businessId || !leadPendingDelete || isTrialExpired) return;
    const target = leadPendingDelete;
    deleteDocumentNonBlocking(doc(firestore, "businesses", businessId, "leads", target.id));
    if (selectedLeadId === target.id) {
      setIsDrawerOpen(false);
      setSelectedLeadId(null);
    }
    setLeadPendingDelete(null);
    toast({
      variant: "destructive",
      title: "Lead Removed",
      description: `${target.name} removed from Sales CRM.`,
    });
  };

  const handleConvertToCustomer = async (lead: Lead) => {
    if (!businessId || isTrialExpired) return;
    setIsConverting(true);

    try {
      const normalized = normalizePhoneNumber(lead.phone);
      const customerId = normalized.length >= 10 ? `c_${normalized}` : `c_${lead.id}`;
      const customerRef = doc(firestore, "businesses", businessId, "customers", customerId);

      setDocumentNonBlocking(
        customerRef,
        {
          id: customerId,
          tenantId: businessId,
          name: lead.name,
          phone: lead.phone,
          normalizedPhone: normalized || lead.phone,
          email: lead.email || "",
          businessName: lead.companyName || "",
          gstin: lead.gstin || "",
          city: lead.location || "",
          address: lead.location || "",
          notes: lead.notes || "",
          source: lead.source,
          createdAt: new Date().toISOString(),
          customerType: lead.companyName || lead.gstin ? "B2B" : "Regular",
          creditBalance: 0,
          whatsappOptIn: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      const entry = createLeadActivityEntry(
        "stage_change",
        `Converted lead to permanent Customer profile (${customerId})`,
        actorName
      );

      const leadRef = doc(firestore, "businesses", businessId, "leads", lead.id);
      updateDocumentNonBlocking(leadRef, {
        status: "converted",
        intentScore: 100,
        convertedCustomerId: customerId,
        activities: prependLeadActivity(lead.activities, entry),
        updatedAt: serverTimestamp(),
      });

      syncLeadFollowUpTask({ ...lead, status: "converted" });

      toast({
        title: "Lead Converted to Customer",
        description: `${lead.name} is now active in your Customer Registry.`,
      });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Conversion Failed" });
    } finally {
      setIsConverting(false);
    }
  };

  const handleExportCsv = () => {
    if (filteredLeads.length === 0) {
      toast({ title: "Nothing to export", description: "No leads match current filters." });
      return;
    }
    const csv = exportLeadsToCsv(filteredLeads, todayYmd);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `crm-leads-${todayYmd}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: "CSV Exported",
      description: `Downloaded ${filteredLeads.length} lead record${
        filteredLeads.length === 1 ? "" : "s"
      }.`,
    });
  };

  const handleBatchImportCsv = async (rows: ParsedCsvLeadDraft[]) => {
    if (!businessId || rows.length === 0 || isTrialExpired) return;
    let batch = writeBatch(firestore);
    let ops = 0;

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const leadId = `l_${Date.now()}_${i}`;
      const score = calculateLeadIntentScore(
        {
          status: row.status,
          priority: row.priority,
          source: row.source,
          budget: row.budget,
          email: row.email,
          companyName: row.companyName,
          interest: row.interest,
          followUpDate: row.followUpDate,
        },
        todayYmd
      );

      const entry = createLeadActivityEntry(
        "created",
        `Imported from CSV batch (${row.source})`,
        actorName
      );

      const ref = doc(firestore, "businesses", businessId, "leads", leadId);
      batch.set(
        ref,
        {
          id: leadId,
          tenantId: businessId,
          name: row.name,
          phone: row.phone,
          normalizedPhone: row.normalizedPhone,
          email: row.email || "",
          companyName: row.companyName || "",
          source: row.source,
          status: row.status,
          priority: row.priority,
          budget: row.budget,
          interest: row.interest || "",
          location: row.location || "",
          followUpDate: row.followUpDate || "",
          notes: row.notes || "",
          intentScore: score,
          createdAt: todayYmd,
          activities: [entry],
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      ops += 1;
      if (ops >= 400) {
        await commitBatchNonBlocking(batch);
        batch = writeBatch(firestore);
        ops = 0;
      }
    }

    if (ops > 0) {
      await commitBatchNonBlocking(batch);
    }

    toast({
      title: "Leads Imported",
      description: `${rows.length} inquiry record${rows.length === 1 ? "" : "s"} added to CRM.`,
    });
  };

  if (isProfileLoading || isLeadsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 text-left min-w-0">
      {isTrialExpired && (
        <Alert variant="destructive" className="bg-rose-50 border-rose-200 rounded-2xl">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle className="font-bold">Access Limited</AlertTitle>
          <AlertDescription className="text-xs">
            Trial ended. Read-only mode active.{" "}
            <Link href="/settings/subscription" className="font-bold underline">
              Upgrade Plan
            </Link>{" "}
            to resume CRM edits.
          </AlertDescription>
        </Alert>
      )}

      {!isTrialExpired && <CoreQuotaBanner quota={leadsQuota} />}

      <PageHeader
        breadcrumb="Command Center / CRM & Leads"
        title="Sales CRM & Pipeline"
        description="Qualify inbound inquiries, track deal values, schedule callbacks, and convert won prospects into customers."
        icon={BrainCircuit}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleExportCsv}
              className="h-10 px-3.5 text-xs font-semibold rounded-xl bg-white whitespace-nowrap"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isLimitReached || isTrialExpired}
              onClick={() => setIsImportOpen(true)}
              className="h-10 px-3.5 text-xs font-semibold rounded-xl bg-white whitespace-nowrap"
            >
              <CloudUpload className="mr-1.5 h-3.5 w-3.5" /> Import CSV
            </Button>
            <Button
              type="button"
              disabled={isLimitReached || isTrialExpired}
              onClick={handleOpenNewLead}
              className="h-10 px-4 text-xs font-semibold rounded-xl whitespace-nowrap"
            >
              <Plus className="mr-1.5 h-4 w-4" /> New Lead
            </Button>
          </>
        }
      />

      {/* Executive KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiStatCard
          tone="dark"
          icon={Wallet}
          label="Open Pipeline Value"
          value={`${currencySymbol}${pipelineStats.openPipelineWorth.toLocaleString("en-IN")}`}
          subtext={`${pipelineStats.activeLeadsCount} active · Forecast ${currencySymbol}${pipelineStats.weightedForecastWorth.toLocaleString("en-IN")}`}
        />
        <KpiStatCard
          tone={pipelineStats.hotLeadsCount > 0 ? "warning" : "default"}
          icon={Flame}
          label="High-Intent Prospects"
          value={`${pipelineStats.hotLeadsCount} Hot`}
          subtext="Priority Hot or ≥ 75% intent score"
        />
        <KpiStatCard
          tone={
            pipelineStats.overdueFollowUpsCount > 0
              ? "danger"
              : pipelineStats.todayFollowUpsCount > 0
                ? "warning"
                : "default"
          }
          icon={CalendarClock}
          label="Follow-up Queue"
          value={`${pipelineStats.dueOrOverdueCount} Due`}
          subtext={`${pipelineStats.overdueFollowUpsCount} overdue · ${pipelineStats.todayFollowUpsCount} today · ${pipelineStats.unscheduledOpenCount} unscheduled`}
        />
        <KpiStatCard
          tone="positive"
          icon={TrendingUp}
          label="Pipeline Win Rate"
          value={`${pipelineStats.winRatePercent}%`}
          subtext={`${pipelineStats.convertedCount} won (${currencySymbol}${pipelineStats.convertedWorth.toLocaleString("en-IN")}) · ${pipelineStats.lostCount} lost`}
        />
      </div>

      {/* Workspace View Switcher & Smart Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Segmented View Mode Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-auto overflow-x-auto scrollbar-hide">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex-1 sm:flex-initial",
                viewMode === "kanban"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Columns3 className="h-3.5 w-3.5" /> Kanban Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex-1 sm:flex-initial",
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <LayoutList className="h-3.5 w-3.5" /> Table Registry
            </button>
            <button
              type="button"
              onClick={() => setViewMode("followups")}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex-1 sm:flex-initial tabular-nums",
                viewMode === "followups"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <CalendarClock className="h-3.5 w-3.5" /> Follow-ups (
              {pipelineStats.dueOrOverdueCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search name, phone, company, item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 text-xs rounded-xl bg-slate-50/70 border-slate-200 focus:bg-white"
            />
          </div>
        </div>

        {/* Secondary Filter Strip */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {viewMode !== "kanban" && (
            <Select
              value={stageFilter}
              onValueChange={(v) => setStageFilter(v as LeadFilterState["stage"])}
            >
              <SelectTrigger className="h-9 w-full sm:w-[148px] rounded-xl text-xs font-medium bg-white">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="open">Open Pipeline Only</SelectItem>
                {CRM_STAGES.map((st) => (
                  <SelectItem key={st.id} value={st.id}>
                    {st.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select
            value={sourceFilter}
            onValueChange={(v) => setSourceFilter(v as LeadFilterState["source"])}
          >
            <SelectTrigger className="h-9 w-[calc(50%-0.25rem)] sm:w-[140px] rounded-xl text-xs font-medium bg-white">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">All Sources</SelectItem>
              {CRM_SOURCES.map((src) => (
                <SelectItem key={src} value={src}>
                  {src}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={priorityFilter}
            onValueChange={(v) => setPriorityFilter(v as LeadFilterState["priority"])}
          >
            <SelectTrigger className="h-9 w-[calc(50%-0.25rem)] sm:w-[136px] rounded-xl text-xs font-medium bg-white">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">All Priorities</SelectItem>
              {CRM_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p} Priority
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="h-9 w-[calc(50%-0.25rem)] sm:w-[160px] rounded-xl text-xs font-medium bg-white">
              <SelectValue placeholder="All Representatives" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">All Representatives</SelectItem>
              <SelectItem value="mine">My Assigned Leads</SelectItem>
              <SelectItem value="unassigned">Unassigned Only</SelectItem>
              {staffMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={followUpFilter}
            onValueChange={(v) => setFollowUpFilter(v as LeadFilterState["followUp"])}
          >
            <SelectTrigger className="h-9 w-[calc(50%-0.25rem)] sm:w-[162px] rounded-xl text-xs font-medium bg-white">
              <SelectValue placeholder="All Schedules" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">All Follow-ups</SelectItem>
              <SelectItem value="due_or_overdue">Due Today & Overdue</SelectItem>
              <SelectItem value="overdue">Overdue Only</SelectItem>
              <SelectItem value="today">Due Today</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="unscheduled">Unscheduled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as LeadSortOption)}>
            <SelectTrigger className="h-9 w-full sm:w-[162px] rounded-xl text-xs font-medium bg-white">
              <SelectValue placeholder="Sort order" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="newest">Sort: Newest First</SelectItem>
              <SelectItem value="intent_desc">Sort: Highest Intent</SelectItem>
              <SelectItem value="value_desc">Sort: Deal Value</SelectItem>
              <SelectItem value="followup_asc">Sort: Next Follow-up</SelectItem>
            </SelectContent>
          </Select>

          {hasAnyActiveFilter && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 px-3 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 whitespace-nowrap"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* Active Workspace View */}
      {viewMode === "kanban" && (
        <LeadsKanbanView
          leads={filteredLeads}
          todayYmd={todayYmd}
          currencySymbol={currencySymbol}
          isReadOnly={isTrialExpired}
          onSelectLead={handleInspectLead}
          onChangeStage={(lead, nextStage) => handleChangeStage(lead, nextStage)}
          onQuickSnoozeFollowUp={(lead, nextDate) =>
            handleScheduleFollowUp(lead, nextDate, lead.followUpTime || "11:00")
          }
          onLogOutreach={handleLogActivity}
          onOpenNewLead={handleOpenNewLead}
        />
      )}

      {viewMode === "table" && (
        <LeadsTableView
          leads={filteredLeads}
          todayYmd={todayYmd}
          currencySymbol={currencySymbol}
          isReadOnly={isTrialExpired}
          onSelectLead={handleInspectLead}
          onChangeStage={(lead, nextStage) => handleChangeStage(lead, nextStage)}
          onQuickSnoozeFollowUp={(lead, nextDate) =>
            handleScheduleFollowUp(lead, nextDate, lead.followUpTime || "11:00")
          }
          onLogOutreach={handleLogActivity}
          onOpenNewLead={handleOpenNewLead}
        />
      )}

      {viewMode === "followups" && (
        <LeadsFollowUpView
          leads={filteredLeads}
          todayYmd={todayYmd}
          currencySymbol={currencySymbol}
          isReadOnly={isTrialExpired}
          onSelectLead={handleInspectLead}
          onChangeStage={(lead, nextStage) => handleChangeStage(lead, nextStage)}
          onQuickSnoozeFollowUp={(lead, nextDate) =>
            handleScheduleFollowUp(lead, nextDate, lead.followUpTime || "11:00")
          }
          onLogOutreach={handleLogActivity}
          onOpenNewLead={handleOpenNewLead}
        />
      )}

      {/* Create & Edit Lead Modal */}
      <LeadFormDialog
        open={isFormOpen}
        onOpenChange={(val) => {
          setIsFormOpen(val);
          if (!val) setEditingLead(null);
        }}
        editingLead={editingLead}
        existingLeads={leadsList}
        customers={customersList}
        products={productsList}
        staffMembers={staffMembers}
        currencySymbol={currencySymbol}
        currentUserId={user?.uid}
        onSubmitLead={handleSubmitLead}
        onInspectExistingLead={handleInspectLead}
      />

      {/* Bulk CSV Import Modal */}
      <LeadImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        existingLeads={leadsList}
        remainingQuota={remainingQuota}
        onConfirmImport={handleBatchImportCsv}
      />

      {/* 360-Degree Lead Detail Drawer */}
      <LeadDetailSheet
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        lead={selectedLead}
        staffMembers={staffMembers}
        currencySymbol={currencySymbol}
        businessName={business?.name}
        isReadOnly={isTrialExpired}
        isConverting={isConverting}
        linkedQuotations={linkedQuotations}
        linkedProjects={linkedProjects}
        hasSolarSuite={hasSolarSuite}
        hasPropertySuite={hasPropertySuite}
        onChangeStage={handleChangeStage}
        onAssignStaff={handleAssignStaff}
        onScheduleFollowUp={handleScheduleFollowUp}
        onLogActivity={handleLogActivity}
        onEditLead={(lead) => {
          setIsDrawerOpen(false);
          handleOpenEditLead(lead);
        }}
        onRequestDeleteLead={(lead) => setLeadPendingDelete(lead)}
        onConvertToCustomer={handleConvertToCustomer}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={Boolean(leadPendingDelete)}
        onOpenChange={(val) => {
          if (!val) setLeadPendingDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl border border-slate-200 bg-white text-left">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900">
              Delete Lead from Pipeline?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed">
              This will permanently remove{" "}
              <strong className="text-slate-900">{leadPendingDelete?.name}</strong> and its
              logged timeline history from Sales CRM.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9 rounded-xl text-xs font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteLead}
              className="h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              Delete Lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
