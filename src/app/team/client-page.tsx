"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Edit2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ShieldCheck,
  Trash2,
  Send,
  RefreshCw,
  Copy,
  Check,
  Mail,
  MessageSquare,
  KeyRound,
  Download,
  CloudUpload,
  DollarSign,
  Loader2,
  Search,
  CheckCircle2,
  Clock,
  Briefcase,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { PageHeader, KpiStatCard, SectionCard, EmptyStatePanel } from "@/components/ui/editorial";
import {
  useAuth,
  useFirestore,
  useUser,
  useDoc,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  commitBatchNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import {
  buildTeamDirectoryCsv,
  buildTeamInviteLinks,
  findMatchingExistingMemberByEmail,
  getDynamicRoleOptions,
  getMemberInviteState,
  isStaffAdminRole,
  parseNonNegativeNumber,
  type TeamMemberCsvDraft,
} from "@/lib/staff-payroll";
import { TeamImportDialog } from "@/app/settings/components/TeamImportDialog";
import { differenceInDays, parseISO } from "date-fns";

const SHIFT_HOURS = ["4", "6", "8", "9", "10", "12"];
const TIME_SLOTS = [
  "08:00 AM",
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
  "07:00 PM",
  "08:00 PM",
  "09:00 PM",
];

interface ShareInviteContext {
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActiveAccount: boolean;
}

export default function TeamClientPage() {
  const firestore = useFirestore();
  const auth = useAuth();
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
  const { data: business, isLoading: isBusinessLoading } = useDoc<any>(businessRef);

  const isAdmin = useMemo(() => {
    return Boolean(
      (user?.uid && business?.ownerId === user.uid) ||
        isStaffAdminRole(userProfile?.role, user?.email)
    );
  }, [userProfile?.role, user?.uid, user?.email, business?.ownerId]);

  const usersQuery = useMemoFirebase(() => {
    if (!businessId) return null;
    return query(collection(firestore, "users"), where("businessId", "==", businessId));
  }, [firestore, businessId]);
  const { data: businessUsers = [], isLoading: isUsersLoading } = useCollection<any>(usersQuery);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const isTrialExpired = useMemo(() => {
    if (!business) return false;
    const status = (business.status || "").toLowerCase();
    if (status === "active" || status === "pro") return false;
    if (status !== "trial") return false;
    if (!business.trialEndDate) return false;
    const endDate =
      typeof business.trialEndDate === "string"
        ? parseISO(business.trialEndDate)
        : business.trialEndDate.seconds
          ? new Date(business.trialEndDate.seconds * 1000)
          : new Date();
    return differenceInDays(endDate, new Date()) < 0;
  }, [business]);

  // Modal states
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [inviteDialogMode, setInviteDialogMode] = useState<"new" | "existing">("new");
  const [selectedExistingId, setSelectedExistingId] = useState<string>("");

  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showEditAdvanced, setShowEditAdvanced] = useState(false);

  // Dedicated Invite / Re-invite dialog for an existing row + post-send share state
  const [reinviteTarget, setReinviteTarget] = useState<any>(null);
  const [reinviteEmail, setReinviteEmail] = useState("");
  const [reinvitePhone, setReinvitePhone] = useState("");
  const [reinviteRole, setReinviteRole] = useState("Staff");
  const [shareContext, setShareContext] = useState<ShareInviteContext | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Add user form state
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserAddress, setNewUserAddress] = useState("");
  const [newUserRole, setNewUserRole] = useState("Staff");
  const [dailyRate, setDailyRate] = useState("500");
  const [shiftHours, setShiftHours] = useState("8");
  const [shiftStart, setShiftStart] = useState("09:00 AM");
  const [shiftEnd, setShiftEnd] = useState("06:00 PM");

  // Edit user state
  const [editDailyRate, setEditDailyRate] = useState("500");
  const [editShiftHours, setEditShiftHours] = useState("8");
  const [editShiftStart, setEditShiftStart] = useState("09:00 AM");
  const [editShiftEnd, setEditShiftEnd] = useState("06:00 PM");

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const dynamicRoles = useMemo(
    () => getDynamicRoleOptions(business?.staffRoles),
    [business?.staffRoles]
  );

  const resetForm = () => {
    setNewUserName("");
    setNewUserEmail("");
    setNewUserPhone("");
    setNewUserAddress("");
    setNewUserRole(dynamicRoles[0] || "Staff");
    setDailyRate("500");
    setShiftHours("8");
    setShiftStart("09:00 AM");
    setShiftEnd("06:00 PM");
    setShowAdvanced(false);
    setInviteDialogMode("new");
    setSelectedExistingId("");
  };

  const invitableExistingMembers = useMemo(() => {
    return (businessUsers || []).filter((u: any) => {
      if (u.id === user?.uid) return false;
      const st = getMemberInviteState(u, user?.uid);
      return st.canInvite;
    });
  }, [businessUsers, user?.uid]);

  const applyExistingMemberSelection = (memberId: string) => {
    setSelectedExistingId(memberId);
    const m = (businessUsers || []).find((u: any) => u.id === memberId);
    if (!m) return;
    setNewUserName(m.name || "");
    setNewUserEmail(m.email || "");
    setNewUserPhone(m.phone || "");
    setNewUserAddress(m.address || "");
    setNewUserRole(m.role || "Staff");
    if (m.dailyRate !== undefined && m.dailyRate !== null) setDailyRate(String(m.dailyRate));
    if (m.shiftHours) setShiftHours(String(m.shiftHours));
    if (m.shiftTimings && m.shiftTimings.includes(" - ")) {
      const parts = m.shiftTimings.split(" - ");
      setShiftStart(parts[0]);
      setShiftEnd(parts[1]);
    }
  };

  const matchedByTypedEmail = useMemo(() => {
    if (!newUserEmail.trim().includes("@")) return null;
    return findMatchingExistingMemberByEmail(businessUsers || [], newUserEmail);
  }, [businessUsers, newUserEmail]);

  const syncInviteMarker = async (params: {
    email: string;
    previousEmail?: string;
    role: string;
    name: string;
  }) => {
    if (!businessId || !isAdmin) return;
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanPrev = (params.previousEmail || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) return;

    if (cleanPrev && cleanPrev !== cleanEmail) {
      deleteDoc(doc(firestore, "businesses", businessId, "invites", cleanPrev)).catch(() => {});
    }

    const inviteRef = doc(firestore, "businesses", businessId, "invites", cleanEmail);
    await setDoc(
      inviteRef,
      {
        businessId,
        businessName: business?.name || "Workspace",
        email: cleanEmail,
        name: params.name.trim(),
        role: params.role || "Staff",
        invitedBy: user?.uid || "",
        status: "pending",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const handleSendInviteFromMainDialog = async () => {
    if (!businessId || !isAdmin || isTrialExpired) return;

    const cleanName = newUserName.trim();
    const cleanEmail = newUserEmail.trim().toLowerCase();
    if (!cleanName) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please enter the team member's full name.",
      });
      return;
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast({
        variant: "destructive",
        title: "Valid email required",
        description: "Please enter an email address so the member can claim their login.",
      });
      return;
    }

    const existingTarget =
      inviteDialogMode === "existing"
        ? (businessUsers || []).find((u: any) => u.id === selectedExistingId)
        : matchedByTypedEmail;

    if (inviteDialogMode === "existing" && !existingTarget) {
      toast({
        variant: "destructive",
        title: "Select a member",
        description: "Choose an existing team member from the list first.",
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const rateNum = parseNonNegativeNumber(dailyRate) || 500;
    const hoursNum = Number.parseInt(shiftHours, 10) || 8;
    const timingsStr = `${shiftStart} - ${shiftEnd}`;

    if (existingTarget) {
      const inviteState = getMemberInviteState(existingTarget, user?.uid);
      const nextStatus =
        !inviteState.isPending && inviteState.hasEmail && existingTarget.status === "active"
          ? "active"
          : "pending";

      updateDocumentNonBlocking(doc(firestore, "users", existingTarget.id), {
        name: cleanName,
        email: cleanEmail,
        phone: newUserPhone.trim(),
        address: newUserAddress.trim(),
        role: newUserRole,
        dailyRate: rateNum,
        shiftHours: hoursNum,
        shiftTimings: timingsStr,
        status: nextStatus,
        invitedAt: existingTarget.invitedAt || nowIso,
        resentAt: nowIso,
        inviteCount: (Number(existingTarget.inviteCount) || 0) + 1,
        updatedAt: serverTimestamp(),
      });

      await syncInviteMarker({
        email: cleanEmail,
        previousEmail: existingTarget.email,
        role: newUserRole,
        name: cleanName,
      });

      setIsAddUserOpen(false);
      setCopiedLink(false);
      setShareContext({
        name: cleanName,
        email: cleanEmail,
        phone: newUserPhone.trim(),
        role: newUserRole,
        isActiveAccount: nextStatus === "active",
      });
      resetForm();
      toast({
        title: inviteState.hasEmail ? "Invitation Resent" : "Invitation Created",
        description: `${cleanName} (${cleanEmail}) is ready to join the workspace.`,
      });
      return;
    }

    const userData = {
      name: cleanName,
      email: cleanEmail,
      phone: newUserPhone.trim(),
      address: newUserAddress.trim(),
      role: newUserRole,
      businessId,
      businessName: business?.name || "Business",
      dailyRate: rateNum,
      shiftHours: hoursNum,
      shiftTimings: timingsStr,
      createdAt: nowIso,
      invitedAt: nowIso,
      inviteCount: 1,
      status: "pending",
      dashboardLayout: [
        { id: "hero", label: "AI Slate", enabled: true, order: 0 },
        { id: "pulse", label: "Daily Pulse", enabled: true, order: 1 },
        { id: "stats", label: "Main Stats", enabled: true, order: 2 },
        { id: "assistant", label: "AI Assistant", enabled: true, order: 3 },
      ],
    };

    addDocumentNonBlocking(collection(firestore, "users"), userData);
    await syncInviteMarker({
      email: cleanEmail,
      role: newUserRole,
      name: cleanName,
    });

    setIsAddUserOpen(false);
    setCopiedLink(false);
    setShareContext({
      name: cleanName,
      email: cleanEmail,
      phone: newUserPhone.trim(),
      role: newUserRole,
      isActiveAccount: false,
    });
    resetForm();
    toast({
      title: "Invite Sent",
      description: `${cleanName} has been invited to the workspace.`,
    });
  };

  const handleOpenRowInvite = (member: any) => {
    setReinviteTarget(member);
    setReinviteEmail(member.email || "");
    setReinvitePhone(member.phone || "");
    setReinviteRole(member.role || "Staff");
    setCopiedLink(false);
  };

  const handleConfirmRowInvite = async () => {
    if (!reinviteTarget || !businessId || !isAdmin) return;
    const cleanEmail = reinviteEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast({
        variant: "destructive",
        title: "Valid email required",
        description: "Enter an email address so the member can claim workspace access.",
      });
      return;
    }

    const conflict = findMatchingExistingMemberByEmail(businessUsers || [], cleanEmail);
    if (conflict && conflict.id !== reinviteTarget.id) {
      toast({
        variant: "destructive",
        title: "Email already in use",
        description: `${cleanEmail} already belongs to ${conflict.name || "another member"}.`,
      });
      return;
    }

    const inviteState = getMemberInviteState(reinviteTarget, user?.uid);
    const nowIso = new Date().toISOString();
    const isAlreadyActive =
      !inviteState.isPending && inviteState.hasEmail && reinviteTarget.status === "active";
    const nextStatus = isAlreadyActive ? "active" : "pending";

    updateDocumentNonBlocking(doc(firestore, "users", reinviteTarget.id), {
      email: cleanEmail,
      phone: reinvitePhone.trim(),
      role: reinviteRole,
      status: nextStatus,
      invitedAt: reinviteTarget.invitedAt || nowIso,
      resentAt: nowIso,
      inviteCount: (Number(reinviteTarget.inviteCount) || 0) + 1,
      updatedAt: serverTimestamp(),
    });

    await syncInviteMarker({
      email: cleanEmail,
      previousEmail: reinviteTarget.email,
      role: reinviteRole,
      name: reinviteTarget.name || "Team Member",
    });

    const targetName = reinviteTarget.name || "Team Member";
    setReinviteTarget(null);
    setCopiedLink(false);
    setShareContext({
      name: targetName,
      email: cleanEmail,
      phone: reinvitePhone.trim(),
      role: reinviteRole,
      isActiveAccount: isAlreadyActive,
    });

    toast({
      title: inviteState.hasEmail ? "Re-invite Sent" : "Invite Created",
      description: `Workspace invitation updated for ${targetName} (${cleanEmail}).`,
    });
  };

  const handleCopyInviteUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast({
        title: "Invite Link Copied",
        description: "Share this link with your team member on WhatsApp, SMS, or Email.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Please select and copy the invite link manually.",
      });
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    if (!email) return;
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Password Reset Email Sent",
        description: `Reset instructions sent to ${email}.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Could not send reset email",
        description:
          err?.code === "auth/user-not-found"
            ? "This member has not created a password yet — share the Invite Link so they can sign up."
            : err?.message || "Failed to send password reset email.",
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleOpenEdit = (targetUser: any) => {
    setEditingUser({ ...targetUser, _originalEmail: targetUser.email || "" });
    setEditDailyRate(targetUser.dailyRate?.toString() || "500");
    setEditShiftHours(targetUser.shiftHours?.toString() || "8");
    if (targetUser.shiftTimings && targetUser.shiftTimings.includes(" - ")) {
      const parts = targetUser.shiftTimings.split(" - ");
      setEditShiftStart(parts[0]);
      setEditShiftEnd(parts[1]);
    } else {
      setEditShiftStart("09:00 AM");
      setEditShiftEnd("06:00 PM");
    }
    setShowEditAdvanced(false);
    setIsEditUserOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !isAdmin) return;
    const cleanEmail = (editingUser.email || "").trim().toLowerCase();

    if (cleanEmail) {
      const conflict = findMatchingExistingMemberByEmail(businessUsers || [], cleanEmail);
      if (conflict && conflict.id !== editingUser.id) {
        toast({
          variant: "destructive",
          title: "Email already in use",
          description: `${cleanEmail} belongs to ${conflict.name || "another member"}.`,
        });
        return;
      }
    }

    const userRef = doc(firestore, "users", editingUser.id);
    updateDocumentNonBlocking(userRef, {
      name: (editingUser.name || "").trim(),
      email: cleanEmail,
      role: editingUser.role,
      phone: (editingUser.phone || "").trim(),
      address: editingUser.address || "",
      dailyRate: parseNonNegativeNumber(editDailyRate) || 500,
      shiftHours: Number.parseInt(editShiftHours, 10) || 8,
      shiftTimings: `${editShiftStart} - ${editShiftEnd}`,
      updatedAt: serverTimestamp(),
    });

    if (cleanEmail && (editingUser.status === "pending" || editingUser._originalEmail !== cleanEmail)) {
      await syncInviteMarker({
        email: cleanEmail,
        previousEmail: editingUser._originalEmail,
        role: editingUser.role || "Staff",
        name: editingUser.name || "Team Member",
      });
    }

    setIsEditUserOpen(false);
    toast({ title: "Profile Updated" });
  };

  const handleDeleteUser = (member: any) => {
    if (!member?.id || member.id === user?.uid) return;
    deleteDocumentNonBlocking(doc(firestore, "users", member.id));
    const cleanEmail = (member.email || "").trim().toLowerCase();
    if (businessId && cleanEmail) {
      deleteDoc(doc(firestore, "businesses", businessId, "invites", cleanEmail)).catch(() => {});
    }
    toast({ title: "Member Removed", variant: "destructive" });
  };

  const handleExportMembersCsv = () => {
    const sourceList = processedUsers.length > 0 ? processedUsers : businessUsers || [];
    if (sourceList.length === 0) {
      toast({
        title: "No members to export",
        description: "Add or invite team members first.",
      });
      return;
    }
    const csv = buildTeamDirectoryCsv(sourceList);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `team-members-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: "Team CSV Exported",
      description: `Downloaded ${sourceList.length} team member record${
        sourceList.length === 1 ? "" : "s"
      }.`,
    });
  };

  const handleBatchImportMembers = async (rows: TeamMemberCsvDraft[]) => {
    if (!businessId || !isAdmin || rows.length === 0) return;
    const nowIso = new Date().toISOString();
    let batch = writeBatch(firestore);
    let ops = 0;

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const userDocRef = doc(collection(firestore, "users"));
      batch.set(userDocRef, {
        name: row.name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        role: row.role || "Staff",
        businessId,
        businessName: business?.name || "Business",
        dailyRate: row.dailyRate,
        shiftHours: row.shiftHours,
        shiftTimings: row.shiftTimings,
        createdAt: nowIso,
        invitedAt: nowIso,
        inviteCount: 1,
        status: "pending",
        dashboardLayout: [
          { id: "hero", label: "AI Slate", enabled: true, order: 0 },
          { id: "pulse", label: "Daily Pulse", enabled: true, order: 1 },
          { id: "stats", label: "Main Stats", enabled: true, order: 2 },
          { id: "assistant", label: "AI Assistant", enabled: true, order: 3 },
        ],
        updatedAt: serverTimestamp(),
      });
      ops += 1;

      if (row.email && row.email.includes("@")) {
        const inviteRef = doc(firestore, "businesses", businessId, "invites", row.email);
        batch.set(
          inviteRef,
          {
            businessId,
            businessName: business?.name || "Workspace",
            email: row.email,
            name: row.name,
            role: row.role || "Staff",
            invitedBy: user?.uid || "",
            status: "pending",
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        ops += 1;
      }

      if (ops >= 380) {
        await commitBatchNonBlocking(batch);
        batch = writeBatch(firestore);
        ops = 0;
      }
    }

    if (ops > 0) {
      await commitBatchNonBlocking(batch);
    }

    toast({
      title: "Team Members Imported",
      description: `Added ${rows.length} member${rows.length === 1 ? "" : "s"} to Team Directory. You can now send invites on WhatsApp or Email.`,
    });
  };

  const counts = useMemo(() => {
    let active = 0;
    let pending = 0;
    for (const u of businessUsers || []) {
      const st = getMemberInviteState(u, user?.uid);
      if (st.statusLabel === "Active") active += 1;
      else pending += 1;
    }
    return { all: (businessUsers || []).length, active, pending };
  }, [businessUsers, user?.uid]);

  const processedUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = (businessUsers || []).filter((u: any) => {
      const matchesQuery =
        !q ||
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q) ||
        (u.role || "").toLowerCase().includes(q);
      if (!matchesQuery) return false;

      if (statusFilter === "all") return true;
      const st = getMemberInviteState(u, user?.uid);
      if (statusFilter === "active") return st.statusLabel === "Active";
      return st.statusLabel !== "Active";
    });

    filtered.sort((a: any, b: any) => {
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

    return filtered;
  }, [businessUsers, searchTerm, statusFilter, sortOrder, user?.uid]);

  const shareLinks = useMemo(() => {
    if (!shareContext) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return buildTeamInviteLinks({
      origin,
      email: shareContext.email,
      name: shareContext.name,
      role: shareContext.role,
      businessName: business?.name || "Workspace",
      phone: shareContext.phone,
    });
  }, [shareContext, business?.name]);

  const reinvitePreviewLinks = useMemo(() => {
    if (!reinviteTarget) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return buildTeamInviteLinks({
      origin,
      email: reinviteEmail.trim().includes("@") ? reinviteEmail : "",
      name: reinviteTarget.name || "Team Member",
      role: reinviteRole,
      businessName: business?.name || "Workspace",
      phone: reinvitePhone,
    });
  }, [reinviteTarget, reinviteEmail, reinviteRole, reinvitePhone, business?.name]);

  const mainDialogWhatsappPreview = useMemo(() => {
    if (!newUserName.trim() && !newUserEmail.trim() && !newUserPhone.trim()) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return buildTeamInviteLinks({
      origin,
      email: newUserEmail.trim().includes("@") ? newUserEmail : "",
      name: newUserName.trim() || "Team Member",
      role: newUserRole,
      businessName: business?.name || "Workspace",
      phone: newUserPhone,
    });
  }, [newUserName, newUserEmail, newUserPhone, newUserRole, business?.name]);

  const originForLinks = typeof window !== "undefined" ? window.location.origin : "";

  if (isProfileLoading || isBusinessLoading || isUsersLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400 mb-2" />
        <p className="text-xs font-medium">Loading team directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-left min-w-0">
      {isTrialExpired && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-center gap-3 text-rose-900 text-xs">
          <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
          <p>
            Workspace trial period ended. Read-only mode active.{" "}
            <Link href="/settings/subscription" className="font-bold underline">
              Upgrade subscription
            </Link>{" "}
            to invite or modify team members.
          </p>
        </div>
      )}

      <PageHeader
        breadcrumb="Command Center / Team"
        title="Team Directory"
        description="Manage workspace members, mobile logins, WhatsApp invites, and bulk CSV export/import."
        icon={Users}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              variant="outline"
              className="h-10 px-3.5 rounded-xl text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 whitespace-nowrap shrink-0"
            >
              <Link href="/settings?tab=roles">
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                Roles & Access
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleExportMembersCsv}
              className="h-10 px-3.5 rounded-xl text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 whitespace-nowrap shrink-0"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isTrialExpired || !isAdmin}
              onClick={() => setIsImportOpen(true)}
              className="h-10 px-3.5 rounded-xl text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 whitespace-nowrap shrink-0"
            >
              <CloudUpload className="mr-1.5 h-3.5 w-3.5" />
              Import CSV
            </Button>
            <Button
              type="button"
              disabled={isTrialExpired || !isAdmin}
              onClick={() => {
                resetForm();
                setIsAddUserOpen(true);
              }}
              className="h-10 px-4 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white whitespace-nowrap shrink-0"
            >
              <UserPlus className="mr-1.5 h-4 w-4" />
              Invite Member
            </Button>
          </div>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <KpiStatCard
          icon={Users}
          label="Total Team Members"
          value={counts.all}
          subtext="Configured across roles"
          tone="default"
        />
        <KpiStatCard
          icon={CheckCircle2}
          label="Active Logins"
          value={counts.active}
          subtext="Workspace sign-in active"
          tone="positive"
        />
        <KpiStatCard
          icon={Clock}
          label="Pending Invites"
          value={counts.pending}
          subtext="Unclaimed invitations"
          tone={counts.pending > 0 ? "warning" : "default"}
        />
        <KpiStatCard
          icon={Briefcase}
          label="Defined Roles"
          value={dynamicRoles.length}
          subtext="Configured in OS Settings"
          tone="default"
        />
      </div>

      {/* Directory Table / List Card */}
      <SectionCard
        title="Workspace Members"
        description="Search members, check claim status, send 1-click WhatsApp invites, and manage roles."
        bodyClassName="p-0"
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl max-w-full overflow-x-auto scrollbar-hide w-full sm:w-fit">
            {(
              [
                { id: "all", label: `All (${counts.all})` },
                { id: "active", label: `Active (${counts.active})` },
                { id: "pending", label: `Pending / Uninvited (${counts.pending})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0",
                  statusFilter === tab.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 flex-1 lg:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, email, phone, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-white border-slate-200 text-xs"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              aria-label={`Sort members ${sortOrder === "asc" ? "descending" : "ascending"}`}
              onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
              className="h-10 rounded-xl px-3 border-slate-200 shrink-0"
            >
              {sortOrder === "asc" ? (
                <ChevronUp className="h-4 w-4 text-slate-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-600" />
              )}
            </Button>
          </div>
        </div>

        {processedUsers.length === 0 ? (
          <div className="p-8">
            <EmptyStatePanel
              icon={Users}
              title="No team members found"
              description={
                searchTerm || statusFilter !== "all"
                  ? "No team members match your current filter."
                  : "Invite staff members, managers, or agents to collaborate in this workspace."
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {processedUsers.map((u: any) => {
              const inviteState = getMemberInviteState(u, user?.uid);
              return (
                <div
                  key={u.id}
                  className="px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <Link
                    href={`/staff/${u.id}`}
                    className="flex items-center gap-3.5 min-w-0 group flex-1"
                  >
                    <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {u.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        <p className="text-sm font-semibold text-slate-900 group-hover:underline truncate">
                          {u.name || "Pending Invite"}
                        </p>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="font-medium text-slate-600">{u.role || "Staff"}</span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span
                          className={cn(
                            "font-semibold",
                            inviteState.statusLabel === "Active"
                              ? "text-emerald-700"
                              : inviteState.statusLabel === "Pending invite"
                                ? "text-amber-700"
                                : "text-slate-500"
                          )}
                        >
                          {inviteState.isSelf ? "You (Active)" : inviteState.statusLabel}
                        </span>
                        {Number(u.inviteCount) > 1 && inviteState.isPending && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="font-mono tabular-nums text-slate-500">
                              Sent {u.inviteCount}x
                            </span>
                          </>
                        )}
                        {u.dailyRate !== undefined && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="font-mono tabular-nums text-slate-500">
                              {currencySymbol}
                              {u.dailyRate}/d
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono truncate mt-0.5">
                        {u.email || u.phone || "No email linked — click Invite to grant login"}
                      </p>
                    </div>
                  </Link>

                  <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0 pt-1 md:pt-0 border-t border-slate-100 md:border-t-0">
                    {inviteState.canInvite && (
                      <>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-9 md:h-8 px-2.5 rounded-lg text-xs font-semibold border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100/80 whitespace-nowrap shrink-0"
                        >
                          <a
                            href={
                              buildTeamInviteLinks({
                                origin: originForLinks,
                                email: u.email || "",
                                name: u.name || "Team Member",
                                role: u.role || "Staff",
                                businessName: business?.name || "Workspace",
                                phone: u.phone || "",
                              }).whatsappUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              if (u.email && isAdmin) {
                                syncInviteMarker({
                                  email: u.email,
                                  role: u.role || "Staff",
                                  name: u.name || "Team Member",
                                }).catch(() => {});
                              }
                            }}
                          >
                            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isTrialExpired}
                          onClick={() => handleOpenRowInvite(u)}
                          className={cn(
                            "h-9 md:h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0",
                            inviteState.actionLabel === "Invite"
                              ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
                              : inviteState.isPending
                                ? "border-amber-200 bg-amber-50/60 text-amber-900 hover:bg-amber-100/70"
                                : "border-slate-200 text-slate-700 hover:text-slate-900"
                          )}
                        >
                          {inviteState.actionLabel === "Invite" ? (
                            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                          ) : (
                            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          {inviteState.actionLabel}
                        </Button>
                      </>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={isTrialExpired}
                      aria-label={`Edit ${u.name || "member"}`}
                      className="h-9 w-9 md:h-8 md:w-8 rounded-lg border-slate-200 text-slate-600 hover:text-slate-900"
                      onClick={() => handleOpenEdit(u)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>

                    {u.id !== user?.uid && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={isTrialExpired}
                        aria-label={`Remove ${u.name || "member"}`}
                        className="h-9 w-9 md:h-8 md:w-8 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => handleDeleteUser(u)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      aria-label={`Open ${u.name || "member"} profile`}
                      className="h-9 w-9 md:h-8 md:w-8 rounded-lg text-slate-500 hover:text-slate-900"
                    >
                      <Link href={`/staff/${u.id}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Main Invite Member Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-[540px] rounded-2xl border-slate-200 p-0 overflow-hidden text-left">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Invite Team Member
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  Invite a new person or re-invite an existing member from your directory.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4 max-h-[68vh] overflow-y-auto bg-white">
            {invitableExistingMembers.length > 0 && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setInviteDialogMode("new");
                    setSelectedExistingId("");
                  }}
                  className={cn(
                    "flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap",
                    inviteDialogMode === "new"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  New Member
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInviteDialogMode("existing");
                    if (!selectedExistingId && invitableExistingMembers[0]?.id) {
                      applyExistingMemberSelection(invitableExistingMembers[0].id);
                    }
                  }}
                  className={cn(
                    "flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap",
                    inviteDialogMode === "existing"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Existing Member ({invitableExistingMembers.length})
                </button>
              </div>
            )}

            {inviteDialogMode === "existing" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Select Existing Member
                </Label>
                <Select value={selectedExistingId} onValueChange={applyExistingMemberSelection}>
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium">
                    <SelectValue placeholder="Choose team member..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {invitableExistingMembers.map((m: any) => {
                      const st = getMemberInviteState(m, user?.uid);
                      return (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                          {m.name || "Unnamed"} · {m.role || "Staff"} ({st.statusLabel})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="new-user-name" className="text-xs font-semibold text-slate-700">
                Full Name
              </Label>
              <Input
                id="new-user-name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                className="h-11 rounded-xl bg-white border-slate-200 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-user-email" className="text-xs font-semibold text-slate-700">
                Email Address (for Workspace Login)
              </Label>
              <Input
                id="new-user-email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="aarav@company.com"
                className="h-11 rounded-xl bg-white border-slate-200 text-sm"
              />
              {matchedByTypedEmail && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Matches existing member <strong>{matchedByTypedEmail.name}</strong> — saving will
                  re-invite and update their existing record.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-user-phone" className="text-xs font-semibold text-slate-700">
                  Mobile Number
                </Label>
                <Input
                  id="new-user-phone"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="h-11 rounded-xl bg-white border-slate-200 text-sm font-mono tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Role</Label>
                <Select value={newUserRole} onValueChange={setNewUserRole}>
                  <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {dynamicRoles.map((r: string) => (
                      <SelectItem key={r} value={r} className="text-xs font-medium">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="bg-slate-100" />

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline"
            >
              {showAdvanced
                ? "Hide Payroll & Shift Settings"
                : "Configure Payroll & Shift Settings"}
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", showAdvanced && "rotate-180")}
              />
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="daily-rate" className="text-xs font-semibold text-slate-700">
                      Daily Rate ({currencySymbol})
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        id="daily-rate"
                        type="number"
                        min="0"
                        value={dailyRate}
                        onChange={(e) => setDailyRate(e.target.value)}
                        className="h-10 pl-8 rounded-xl bg-white border-slate-200 text-sm font-mono tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Shift Hours</Label>
                    <Select value={shiftHours} onValueChange={setShiftHours}>
                      <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {SHIFT_HOURS.map((h) => (
                          <SelectItem key={h} value={h} className="text-xs font-mono">
                            {h} Hours
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Shift Start</Label>
                    <Select value={shiftStart} onValueChange={setShiftStart}>
                      <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 text-xs font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {TIME_SLOTS.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs font-mono">
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Shift End</Label>
                    <Select value={shiftEnd} onValueChange={setShiftEnd}>
                      <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 text-xs font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {TIME_SLOTS.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs font-mono">
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {mainDialogWhatsappPreview && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-emerald-950">WhatsApp Invite Ready</p>
                  <p className="text-[11px] text-emerald-800">
                    Save the invite first or send the join link straight to{" "}
                    {newUserPhone.trim() || "WhatsApp"}.
                  </p>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 rounded-lg border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100 text-xs font-semibold whitespace-nowrap shrink-0 self-start sm:self-auto"
                >
                  <a
                    href={mainDialogWhatsappPreview.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                    Invite via WhatsApp
                  </a>
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200 flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddUserOpen(false)}
              className="flex-1 h-10 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSendInviteFromMainDialog}
              className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {inviteDialogMode === "existing" || matchedByTypedEmail
                ? "Save & Share Invite"
                : "Create & Share Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Row-level Invite / Re-invite Dialog */}
      <Dialog
        open={Boolean(reinviteTarget)}
        onOpenChange={(open) => !open && setReinviteTarget(null)}
      >
        <DialogContent className="sm:max-w-[500px] rounded-2xl border-slate-200 p-0 overflow-hidden text-left">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
                <RefreshCw className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  {reinviteTarget?.email ? "Re-invite" : "Invite"} {reinviteTarget?.name || "Member"}
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  Refresh workspace invitation access and share the sign-in link via WhatsApp or Email.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {reinviteTarget && (
            <div className="p-6 space-y-4 bg-white">
              <div className="space-y-1.5">
                <Label htmlFor="reinvite-email" className="text-xs font-semibold text-slate-700">
                  Login Email Address
                </Label>
                <Input
                  id="reinvite-email"
                  type="email"
                  value={reinviteEmail}
                  onChange={(e) => setReinviteEmail(e.target.value)}
                  placeholder="member@company.com"
                  className="h-11 rounded-xl bg-white border-slate-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reinvite-phone" className="text-xs font-semibold text-slate-700">
                    WhatsApp / Mobile Number
                  </Label>
                  <Input
                    id="reinvite-phone"
                    value={reinvitePhone}
                    onChange={(e) => setReinvitePhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="h-11 rounded-xl bg-white border-slate-200 text-sm font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Workspace Role</Label>
                  <Select value={reinviteRole} onValueChange={setReinviteRole}>
                    <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {dynamicRoles.map((r: string) => (
                        <SelectItem key={r} value={r} className="text-xs font-medium">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {reinvitePreviewLinks && (
                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <p className="text-xs font-semibold text-slate-700">Quick Share & WhatsApp Invite</p>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={reinvitePreviewLinks.inviteUrl}
                      className="h-9 rounded-lg bg-slate-50 border-slate-200 text-xs font-mono text-slate-600"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyInviteUrl(reinvitePreviewLinks.inviteUrl)}
                      className="h-9 px-3 rounded-lg border-slate-200 text-xs font-semibold shrink-0"
                    >
                      {copiedLink ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-9 rounded-lg border-emerald-200 bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100/80 text-xs font-semibold"
                  >
                    <a
                      href={reinvitePreviewLinks.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                      Send Invite Directly on WhatsApp
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200 flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReinviteTarget(null)}
              className="flex-1 h-10 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmRowInvite}
              className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {reinviteTarget?.email ? "Resend Invitation" : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post-Invite Share Sheet Dialog */}
      <Dialog open={Boolean(shareContext)} onOpenChange={(open) => !open && setShareContext(null)}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl border-slate-200 p-0 overflow-hidden text-left">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
                <Check className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Invitation Ready for {shareContext?.name}
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  Share the workspace join link directly so {shareContext?.name} can sign in immediately.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {shareContext && shareLinks && (
            <div className="p-6 space-y-4 bg-white">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Direct Workspace Invite Link
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={shareLinks.inviteUrl}
                    className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-mono text-slate-700"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCopyInviteUrl(shareLinks.inviteUrl)}
                    className="h-10 px-3.5 rounded-xl border-slate-200 text-xs font-semibold whitespace-nowrap shrink-0"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-xl border-emerald-200 bg-emerald-50/60 text-emerald-900 hover:bg-emerald-100/70 text-xs font-semibold"
                >
                  <a href={shareLinks.whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                    Send on WhatsApp
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-xl border-slate-200 text-slate-800 hover:bg-slate-50 text-xs font-semibold"
                >
                  <a href={shareLinks.mailtoUrl}>
                    <Mail className="mr-1.5 h-3.5 w-3.5" />
                    Send via Email
                  </a>
                </Button>
              </div>

              {shareContext.isActiveAccount && (
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <p className="text-xs text-slate-500">
                    Member already has an active login? Send a password reset email too.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSendingReset}
                    onClick={() => handleSendPasswordReset(shareContext.email)}
                    className="h-8 px-3 rounded-lg text-xs font-semibold text-primary whitespace-nowrap shrink-0 self-start sm:self-auto"
                  >
                    <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                    Reset Password
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200">
            <Button
              type="button"
              onClick={() => setShareContext(null)}
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[540px] rounded-2xl border-slate-200 p-0 overflow-hidden text-left">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 shrink-0">
                <Edit2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Edit Team Member
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  Update contact details, login email, role permissions, and payroll rate.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto bg-white">
            {editingUser && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-name" className="text-xs font-semibold text-slate-700">
                    Full Name
                  </Label>
                  <Input
                    id="edit-user-name"
                    value={editingUser.name || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="h-11 rounded-xl bg-white border-slate-200 text-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-email" className="text-xs font-semibold text-slate-700">
                    Email Address
                  </Label>
                  <Input
                    id="edit-user-email"
                    type="email"
                    value={editingUser.email || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    placeholder="member@company.com"
                    className="h-11 rounded-xl bg-white border-slate-200 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-user-phone" className="text-xs font-semibold text-slate-700">
                      Mobile Number
                    </Label>
                    <Input
                      id="edit-user-phone"
                      value={editingUser.phone || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                      className="h-11 rounded-xl bg-white border-slate-200 text-sm font-mono tabular-nums"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">System Role</Label>
                    <Select
                      value={editingUser.role || "Staff"}
                      onValueChange={(v) => setEditingUser({ ...editingUser, role: v })}
                    >
                      <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 text-sm font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {dynamicRoles.map((r: string) => (
                          <SelectItem key={r} value={r} className="text-xs font-medium">
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="bg-slate-100" />

                <button
                  type="button"
                  onClick={() => setShowEditAdvanced(!showEditAdvanced)}
                  className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline"
                >
                  {showEditAdvanced
                    ? "Hide Payroll & Shift Settings"
                    : "Update Payroll & Shift Settings"}
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      showEditAdvanced && "rotate-180"
                    )}
                  />
                </button>

                {showEditAdvanced && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="edit-daily-rate"
                          className="text-xs font-semibold text-slate-700"
                        >
                          Daily Rate ({currencySymbol})
                        </Label>
                        <Input
                          id="edit-daily-rate"
                          type="number"
                          min="0"
                          value={editDailyRate}
                          onChange={(e) => setEditDailyRate(e.target.value)}
                          className="h-10 rounded-xl bg-white border-slate-200 text-sm font-mono tabular-nums"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Shift Hours</Label>
                        <Select value={editShiftHours} onValueChange={setEditShiftHours}>
                          <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {SHIFT_HOURS.map((h) => (
                              <SelectItem key={h} value={h} className="text-xs font-mono">
                                {h} Hours
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Shift Start</Label>
                        <Select value={editShiftStart} onValueChange={setEditShiftStart}>
                          <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 text-xs font-mono">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {TIME_SLOTS.map((t) => (
                              <SelectItem key={t} value={t} className="text-xs font-mono">
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Shift End</Label>
                        <Select value={editShiftEnd} onValueChange={setEditShiftEnd}>
                          <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 text-xs font-mono">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {TIME_SLOTS.map((t) => (
                              <SelectItem key={t} value={t} className="text-xs font-mono">
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="p-5 bg-slate-50 border-t border-slate-200 flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditUserOpen(false)}
              className="flex-1 h-10 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdateUser}
              className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk CSV Import Members Dialog */}
      <TeamImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        existingMembers={businessUsers || []}
        currencySymbol={currencySymbol}
        onConfirmImport={handleBatchImportMembers}
      />
    </div>
  );
}
