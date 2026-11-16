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
  useFirestore,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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

const DEFAULT_ROLES = ["Admin", "Manager", "Staff", "Agent", "Accountant"];

interface UsersTabProps {
  businessId: string;
  business: any;
  businessRef: any;
  businessUsers: any[];
  currentUser: any;
  isAdmin: boolean;
  isTrialExpired: boolean;
}

export function UsersTab({
  businessId,
  business,
  businessRef,
  businessUsers,
  currentUser,
  isAdmin,
  isTrialExpired,
}: UsersTabProps) {
  const firestore = useFirestore();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isManageRolesOpen, setIsManageRolesOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showEditAdvanced, setShowEditAdvanced] = useState(false);

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

  const dynamicRoles = business?.staffRoles || DEFAULT_ROLES;

  const handleAddUser = () => {
    if (!newUserName || !newUserEmail || !businessId) return;
    const usersRef = collection(firestore, "users");

    const userData = {
      name: newUserName,
      email: newUserEmail.toLowerCase(),
      phone: newUserPhone,
      address: newUserAddress,
      role: newUserRole,
      businessId: businessId,
      businessName: business?.name || "Business",
      dailyRate: parseFloat(dailyRate) || 500,
      shiftHours: parseInt(shiftHours) || 8,
      shiftTimings: `${shiftStart} - ${shiftEnd}`,
      createdAt: new Date().toISOString(),
      status: "pending",
      dashboardLayout: [
        { id: "hero", label: "AI Slate", enabled: true, order: 0 },
        { id: "pulse", label: "Daily Pulse", enabled: true, order: 1 },
        { id: "stats", label: "Main Stats", enabled: true, order: 2 },
        { id: "assistant", label: "AI Assistant", enabled: true, order: 3 },
      ],
    };

    addDocumentNonBlocking(usersRef, userData);
    setDoc(
      doc(
        firestore,
        "businesses",
        businessId,
        "invites",
        newUserEmail.toLowerCase().trim()
      ),
      {
        email: newUserEmail.toLowerCase().trim(),
        role: newUserRole,
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch((err) => console.warn("Invite marker sync skipped:", err));
    setIsAddUserOpen(false);
    resetForm();
    toast({
      title: "Invite Sent",
      description: `${newUserName} has been invited to the workspace.`,
    });
  };

  const resetForm = () => {
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

  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setEditDailyRate(user.dailyRate?.toString() || "500");
    setEditShiftHours(user.shiftHours?.toString() || "8");
    if (user.shiftTimings && user.shiftTimings.includes(" - ")) {
      const parts = user.shiftTimings.split(" - ");
      setEditShiftStart(parts[0]);
      setEditShiftEnd(parts[1]);
    }
    setShowEditAdvanced(false);
    setIsEditUserOpen(true);
  };

  const handleUpdateUser = () => {
    if (!editingUser || !isAdmin) return;
    const userRef = doc(firestore, "users", editingUser.id);
    updateDocumentNonBlocking(userRef, {
      name: editingUser.name,
      role: editingUser.role,
      phone: editingUser.phone,
      address: editingUser.address,
      dailyRate: parseFloat(editDailyRate) || 500,
      shiftHours: parseInt(editShiftHours) || 8,
      shiftTimings: `${editShiftStart} - ${editShiftEnd}`,
      updatedAt: serverTimestamp(),
    });
    setIsEditUserOpen(false);
    toast({ title: "Profile Updated" });
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser?.uid) return;
    deleteDocumentNonBlocking(doc(firestore, "users", id));
    toast({ title: "Member Removed", variant: "destructive" });
  };

  const handleAddRole = () => {
    if (!newRoleName.trim() || !businessRef) return;
    if (dynamicRoles.includes(newRoleName.trim())) return;
    updateDocumentNonBlocking(businessRef, {
      staffRoles: [...dynamicRoles, newRoleName.trim()],
    });
    setNewRoleName("");
    toast({ title: "Role Added" });
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const processedUsers = useMemo(() => {
    const filtered = businessUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      return sortOrder === "asc"
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });

    return filtered;
  }, [businessUsers, searchTerm, sortOrder]);

  return (
    <div className="space-y-6 text-left">
      <SectionCard
        title="Team Directory"
        description="Manage workspace members, roles, shift hours, and payroll rates."
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
              onClick={() => setIsAddUserOpen(true)}
              className="h-9 rounded-xl px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white whitespace-nowrap shrink-0"
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Invite Member
            </Button>
          </div>
        }
        bodyClassName="p-0"
      >
        <div className="p-5 sm:p-6 border-b border-slate-100 flex gap-2">
          <Input
            placeholder="Search team members by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 rounded-xl bg-white border-slate-200 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            aria-label={`Sort members ${sortOrder === "asc" ? "descending" : "ascending"}`}
            onClick={() =>
              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
            }
            className="h-10 rounded-xl px-3 border-slate-200 shrink-0"
          >
            {sortOrder === "asc" ? (
              <ChevronUp className="h-4 w-4 text-slate-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-600" />
            )}
          </Button>
        </div>

        {processedUsers.length === 0 ? (
          <div className="p-6">
            <EmptyStatePanel
              icon={Users}
              title="No team members found"
              description={
                searchTerm
                  ? "No team members match your search query."
                  : "Invite staff members, managers, or agents to collaborate in this workspace."
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {processedUsers.map((u: any) => (
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
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 group-hover:underline truncate">
                        {u.name || "Pending Invite"}
                      </p>
                      <span className="text-xs font-medium text-slate-500">
                        · {u.role || "Staff"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono truncate">
                      {u.email}
                    </p>
                  </div>
                </Link>

                <div className="flex items-center justify-end gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
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
                      aria-label={`Remove ${u.name || "member"}`}
                      className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => handleDeleteUser(u.id)}
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
            ))}
          </div>
        )}
      </SectionCard>

      {/* Add User Dialog */}
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
                  Send a workspace invitation and configure role &amp; shift defaults.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
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
                Email Address
              </Label>
              <Input
                id="new-user-email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="aarav@company.com"
                className="h-11 rounded-xl bg-white border-slate-200 text-sm"
              />
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
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  showAdvanced && "rotate-180"
                )}
              />
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="daily-rate" className="text-xs font-semibold text-slate-700">
                      Daily Rate (₹)
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        id="daily-rate"
                        type="number"
                        value={dailyRate}
                        onChange={(e) => setDailyRate(e.target.value)}
                        className="h-10 pl-8 rounded-xl bg-white border-slate-200 text-sm font-mono tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Shift Hours
                    </Label>
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
                    <Label className="text-xs font-semibold text-slate-700">
                      Shift Start
                    </Label>
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
                    <Label className="text-xs font-semibold text-slate-700">
                      Shift End
                    </Label>
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
              onClick={handleAddUser}
              className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
            >
              Send Invitation
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
                  Update contact details, role permissions, and payroll rate.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            {editingUser && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-name" className="text-xs font-semibold text-slate-700">
                    Full Name
                  </Label>
                  <Input
                    id="edit-user-name"
                    value={editingUser.name || ""}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, name: e.target.value })
                    }
                    className="h-11 rounded-xl bg-white border-slate-200 text-sm font-medium"
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
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          phone: e.target.value,
                        })
                      }
                      className="h-11 rounded-xl bg-white border-slate-200 text-sm font-mono tabular-nums"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      System Role
                    </Label>
                    <Select
                      value={editingUser.role}
                      onValueChange={(v) =>
                        setEditingUser({ ...editingUser, role: v })
                      }
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
                  <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-daily-rate" className="text-xs font-semibold text-slate-700">
                          Daily Rate (₹)
                        </Label>
                        <Input
                          id="edit-daily-rate"
                          type="number"
                          value={editDailyRate}
                          onChange={(e) => setEditDailyRate(e.target.value)}
                          className="h-10 rounded-xl bg-white border-slate-200 text-sm font-mono tabular-nums"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Shift Hours
                        </Label>
                        <Select
                          value={editShiftHours}
                          onValueChange={setEditShiftHours}
                        >
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
                        <Label className="text-xs font-semibold text-slate-700">
                          Shift Start
                        </Label>
                        <Select
                          value={editShiftStart}
                          onValueChange={setEditShiftStart}
                        >
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
                        <Label className="text-xs font-semibold text-slate-700">
                          Shift End
                        </Label>
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
                <DialogTitle className="text-lg font-bold text-white">
                  Business Roles
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  Define custom roles for your team members
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-5">
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
