"use client";

import { useState, useMemo } from "react";
import {
  Users,
  Plus,
  UserPlus,
  Edit2,
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ShieldCheck,
  Trash2,
  DollarSign,
  Send,
  RefreshCw,
  Copy,
  Check,
  Mail,
  MessageSquare,
  KeyRound,
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
import { SectionCard, EmptyStatePanel } from "@/components/ui/editorial";
import {
  useAuth,
  useFirestore,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { collection, deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import {
  buildTeamInviteLinks,
  findMatchingExistingMemberByEmail,
  getDynamicRoleOptions,
  getMemberInviteState,
  parseNonNegativeNumber,
} from "@/lib/staff-payroll";
import Link from "next/link";

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

interface UsersTabProps {
  businessId: string;
  business: any;
  businessRef: any;
  businessUsers: any[];
  currentUser: any;
  isAdmin: boolean;
  isTrialExpired: boolean;
  currencySymbol?: string;
}

interface ShareInviteContext {
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActiveAccount: boolean;
}

export function UsersTab({
  businessId,
  business,
  businessRef,
  businessUsers,
  currentUser,
  isAdmin,
  isTrialExpired,
  currencySymbol: currencySymbolProp,
}: UsersTabProps) {
  const firestore = useFirestore();
  const auth = useAuth();
  const currencySymbol = currencySymbolProp || getCurrencySymbol(business?.currency);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [inviteDialogMode, setInviteDialogMode] = useState<"new" | "existing">("new");
  const [selectedExistingId, setSelectedExistingId] = useState<string>("");

  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isManageRolesOpen, setIsManageRolesOpen] = useState(false);
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

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserAddress, setNewUserAddress] = useState("");
  const [newUserRole, setNewUserRole] = useState("Staff");

  const [dailyRate, setDailyRate] = useState("500");
  const [shiftHours, setShiftHours] = useState("8");
  const [shiftStart, setShiftStart] = useState("09:00 AM");
  const [shiftEnd, setShiftEnd] = useState("06:00 PM");

  const [editDailyRate, setEditDailyRate] = useState("500");
  const [editShiftHours, setEditShiftHours] = useState("8");
  const [editShiftStart, setEditShiftStart] = useState("09:00 AM");
  const [editShiftEnd, setEditShiftEnd] = useState("06:00 PM");

  const [newRoleName, setNewRoleName] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const dynamicRoles = useMemo(
    () => getDynamicRoleOptions(business?.staffRoles, businessUsers),
    [business?.staffRoles, businessUsers]
  );

  // Members eligible for Invite / Re-invite from the "Existing Member" picker
  const invitableExistingMembers = useMemo(
    () => (businessUsers || []).filter((u: any) => u?.id && u.id !== currentUser?.uid),
    [businessUsers, currentUser?.uid]
  );

  const matchedByTypedEmail = useMemo(() => {
    if (inviteDialogMode !== "new") return undefined;
    return findMatchingExistingMemberByEmail(businessUsers || [], newUserEmail);
  }, [inviteDialogMode, businessUsers, newUserEmail]);

  const syncInviteMarker = async (params: {
    email: string;
    previousEmail?: string;
    role: string;
    name: string;
  }) => {
    const cleanEmail = params.email.trim().toLowerCase();
    const prevEmail = (params.previousEmail || "").trim().toLowerCase();
    if (!businessId || !cleanEmail) return;

    if (prevEmail && prevEmail !== cleanEmail) {
      await deleteDoc(doc(firestore, "businesses", businessId, "invites", prevEmail)).catch(
        () => {}
      );
    }

    await setDoc(
      doc(firestore, "businesses", businessId, "invites", cleanEmail),
      {
        email: cleanEmail,
        role: params.role,
        name: params.name,
        businessId,
        businessName: business?.name || "Workspace",
        invitedBy: currentUser?.uid || "",
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch((err) => console.warn("Invite marker sync skipped:", err));
  };

  const applyExistingMemberSelection = (memberId: string) => {
    setSelectedExistingId(memberId);
    const target = (businessUsers || []).find((u: any) => u.id === memberId);
    if (!target) return;
    setNewUserName(target.name || "");
    setNewUserEmail(target.email || "");
    setNewUserPhone(target.phone || "");
    setNewUserAddress(target.address || "");
    setNewUserRole(target.role || "Staff");
    setDailyRate(String(target.dailyRate || 500));
    setShiftHours(String(target.shiftHours || 8));
    if (target.shiftTimings && target.shiftTimings.includes(" - ")) {
      const parts = target.shiftTimings.split(" - ");
      setShiftStart(parts[0]);
      setShiftEnd(parts[1]);
    }
  };

  const resetForm = () => {
    setInviteDialogMode("new");
    setSelectedExistingId("");
    setNewUserName("");
    setNewUserEmail("");
    setNewUserPhone("");
    setNewUserAddress("");
    setNewUserRole("Staff");
    setDailyRate("500");
    setShiftHours("8");
    setShiftStart("09:00 AM");
    setShiftEnd("06:00 PM");
    setShowAdvanced(false);
  };

  const handleSendInviteFromMainDialog = async () => {
    const cleanEmail = newUserEmail.trim().toLowerCase();
    const cleanName = newUserName.trim();
    if (!cleanName || !cleanEmail || !cleanEmail.includes("@") || !businessId) {
      toast({
        variant: "destructive",
        title: "Details required",
        description: "Please enter a valid full name and email address.",
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
      const inviteState = getMemberInviteState(existingTarget, currentUser?.uid);
      // Preserve "active" status for members who already claimed login so active payroll isn't hidden
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

    // Prevent colliding with a different member's email
    const conflict = findMatchingExistingMemberByEmail(businessUsers || [], cleanEmail);
    if (conflict && conflict.id !== reinviteTarget.id) {
      toast({
        variant: "destructive",
        title: "Email already in use",
        description: `${cleanEmail} already belongs to ${conflict.name || "another member"}.`,
      });
      return;
    }

    const inviteState = getMemberInviteState(reinviteTarget, currentUser?.uid);
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

  const handleOpenEdit = (user: any) => {
    setEditingUser({ ...user, _originalEmail: user.email || "" });
    setEditDailyRate(user.dailyRate?.toString() || "500");
    setEditShiftHours(user.shiftHours?.toString() || "8");
    if (user.shiftTimings && user.shiftTimings.includes(" - ")) {
      const parts = user.shiftTimings.split(" - ");
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
    if (!member?.id || member.id === currentUser?.uid) return;
    deleteDocumentNonBlocking(doc(firestore, "users", member.id));
    const cleanEmail = (member.email || "").trim().toLowerCase();
    if (businessId && cleanEmail) {
      deleteDoc(doc(firestore, "businesses", businessId, "invites", cleanEmail)).catch(() => {});
    }
    toast({ title: "Member Removed", variant: "destructive" });
  };

  const handleAddRole = () => {
    if (!newRoleName.trim() || !businessRef) return;
    if (dynamicRoles.some((r) => r.toLowerCase() === newRoleName.trim().toLowerCase())) return;
    updateDocumentNonBlocking(businessRef, {
      staffRoles: [...dynamicRoles, newRoleName.trim()],
    });
    setNewRoleName("");
    toast({ title: "Role Added" });
  };

  const counts = useMemo(() => {
    let active = 0;
    let pending = 0;
    for (const u of businessUsers || []) {
      const st = getMemberInviteState(u, currentUser?.uid);
      if (st.statusLabel === "Active") active += 1;
      else pending += 1;
    }
    return { all: (businessUsers || []).length, active, pending };
  }, [businessUsers, currentUser?.uid]);

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
      const st = getMemberInviteState(u, currentUser?.uid);
      if (statusFilter === "active") return st.statusLabel === "Active";
      return st.statusLabel !== "Active";
    });

    filtered.sort((a: any, b: any) => {
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

    return filtered;
  }, [businessUsers, searchTerm, statusFilter, sortOrder, currentUser?.uid]);

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
    if (!reinviteTarget || !reinviteEmail.trim().includes("@")) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return buildTeamInviteLinks({
      origin,
      email: reinviteEmail,
      name: reinviteTarget.name || "Team Member",
      role: reinviteRole,
      businessName: business?.name || "Workspace",
      phone: reinvitePhone,
    });
  }, [reinviteTarget, reinviteEmail, reinviteRole, reinvitePhone, business?.name]);

  return (
    <div className="space-y-6 text-left">
      <SectionCard
        title="Team Directory"
        description="Manage workspace members, invite or re-invite existing staff, and configure roles & payroll rates."
        headerRight={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsManageRolesOpen(true)}
              className="h-9 rounded-xl text-xs font-semibold border-slate-200 whitespace-nowrap shrink-0"
            >
              Manage Roles
            </Button>
            <Button
              type="button"
              disabled={isTrialExpired}
              onClick={() => {
                resetForm();
                setIsAddUserOpen(true);
              }}
              className="h-9 rounded-xl px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white whitespace-nowrap shrink-0"
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Invite Member
            </Button>
          </div>
        }
        bodyClassName="p-0"
      >
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
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
            <Input
              placeholder="Search by name, email, phone, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 rounded-xl bg-white border-slate-200 text-sm"
            />
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
          <div className="p-6">
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
              const inviteState = getMemberInviteState(u, currentUser?.uid);
              return (
                <div
                  key={u.id}
                  className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
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
                      </div>
                      <p className="text-xs text-slate-500 font-mono truncate mt-0.5">
                        {u.email || u.phone || "No email linked — click Invite to grant login"}
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-center justify-end gap-1.5 shrink-0">
                    {inviteState.canInvite && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isTrialExpired}
                        onClick={() => handleOpenRowInvite(u)}
                        className={cn(
                          "h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0",
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
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={isTrialExpired}
                      aria-label={`Edit ${u.name || "member"}`}
                      className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 hover:text-slate-900"
                      onClick={() => handleOpenEdit(u)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>

                    {u.id !== currentUser?.uid && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={isTrialExpired}
                        aria-label={`Remove ${u.name || "member"}`}
                        className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"
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
                      className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900"
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

      {/* Main Invite Member Dialog (supports both New Member & Existing Member) */}
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
                      const st = getMemberInviteState(m, currentUser?.uid);
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
                  Matches existing member <strong>{matchedByTypedEmail.name}</strong> — sending will
                  re-invite and update their existing record without creating a duplicate.
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
                <div className="grid grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 gap-4">
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
                ? "Send / Resend Invite"
                : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Row-level Invite / Re-invite Existing Member Dialog */}
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
                  <p className="text-xs font-semibold text-slate-700">Quick Share Link</p>
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

      {/* Post-Invite Share Sheet Dialog (Copy Link / WhatsApp / Email / Password Reset) */}
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
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Member already has an active login? Send a password reset email too.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSendingReset}
                    onClick={() => handleSendPasswordReset(shareContext.email)}
                    className="h-8 px-3 rounded-lg text-xs font-semibold text-primary whitespace-nowrap shrink-0"
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
                    <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-2 gap-4">
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

      {/* Role Management Dialog */}
      <Dialog open={isManageRolesOpen} onOpenChange={setIsManageRolesOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl border-slate-200 p-0 overflow-hidden text-left">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">Business Roles</DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  Define custom roles for your team members
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-5 bg-white">
            <div className="flex gap-2">
              <Input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddRole()}
                placeholder="e.g. Supervisor"
                className="h-10 rounded-xl bg-white border-slate-200 text-sm"
              />
              <Button
                type="button"
                aria-label="Add role"
                onClick={handleAddRole}
                className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {dynamicRoles.map((r: string) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800"
                >
                  {r}
                  <button
                    type="button"
                    aria-label={`Remove ${r} role`}
                    onClick={() =>
                      updateDocumentNonBlocking(businessRef, {
                        staffRoles: dynamicRoles.filter((dr: string) => dr !== r),
                      })
                    }
                    className="text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsManageRolesOpen(false)}
              className="w-full h-10 rounded-xl text-xs font-semibold"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
