"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ShieldCheck,
  Loader2,
  Building2,
  Mail,
  Edit2,
  Trash2,
  UserPlus,
  UserCog,
  ChevronRight,
  Gem,
  Globe,
  Building,
  ShieldAlert,
  BoxSelect,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  PageHeader,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  setDocumentNonBlocking,
  useDoc,
} from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { bundles, individuals } from "@/app/marketplace/data";

const rolesList = ["owner", "admin", "manager", "staff", "agent", "accountant"];

export default function GlobalUserManagementPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const isPlatformOwner =
    user?.email?.toLowerCase() === "skillmatrix24@gmail.com";

  const myProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: myProfile } = useDoc<any>(myProfileRef);
  const myRole = myProfile?.role || "staff";

  const canManage =
    isPlatformOwner || myRole === "owner" || myRole === "admin";

  const usersQuery = useMemoFirebase(
    () => (canManage ? collection(firestore, "users") : null),
    [firestore, canManage]
  );
  const { data: users, isLoading: usersLoading } =
    useCollection<any>(usersQuery);

  const businessesQuery = useMemoFirebase(
    () => (isPlatformOwner ? collection(firestore, "businesses") : null),
    [firestore, isPlatformOwner]
  );
  const { data: businesses } = useCollection<any>(businessesQuery);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("leaders");
  const [selectedOwner, setSelectedOwner] = useState<any>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [userToProcess, setUserToProcess] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "admin",
    businessId: "",
    status: "active",
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];

    return users.filter((u: any) => {
      const r = (u.role || "").toLowerCase();
      if (roleFilter === "leaders") {
        if (r !== "admin" && r !== "owner") return false;
      } else if (roleFilter === "owner") {
        if (r !== "owner") return false;
      } else if (roleFilter === "admin") {
        if (r !== "admin") return false;
      }

      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;

      return (
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.businessId || "").toLowerCase().includes(q) ||
        r.includes(q)
      );
    });
  }, [users, searchTerm, roleFilter]);

  const handleOpenAdd = () => {
    setFormData({
      name: "",
      email: "",
      role: "admin",
      businessId: "",
      status: "active",
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, u: any) => {
    e.stopPropagation();
    setUserToProcess(u);
    setFormData({
      name: u.name || "",
      email: u.email || "",
      role: u.role || "admin",
      businessId: u.businessId || "",
      status: u.status || "active",
    });
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (e: React.MouseEvent, u: any) => {
    e.stopPropagation();
    setUserToProcess(u);
    setIsDeleteAlertOpen(true);
  };

  const handleAddUser = () => {
    if (!formData.email || !formData.name) {
      toast({
        variant: "destructive",
        title: "Missing Data",
        description: "Email and Name are required.",
      });
      return;
    }
    const userId = `u_${Date.now()}`;
    const userRef = doc(firestore, "users", userId);
    setDocumentNonBlocking(
      userRef,
      {
        ...formData,
        id: userId,
        createdAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    setIsAddModalOpen(false);
    toast({
      title: "User Added",
      description: "Profile registered in platform directory.",
    });
  };

  const handleUpdateUser = () => {
    if (!userToProcess) return;
    const userRef = doc(firestore, "users", userToProcess.id);
    updateDocumentNonBlocking(userRef, {
      ...formData,
      updatedAt: serverTimestamp(),
    });
    setIsEditModalOpen(false);
    toast({ title: "User Updated" });
  };

  const confirmDelete = () => {
    if (!userToProcess) return;
    if (userToProcess.id === user?.uid) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You cannot delete your own session.",
      });
      return;
    }
    const userRef = doc(firestore, "users", userToProcess.id);
    deleteDocumentNonBlocking(userRef);
    setIsDeleteAlertOpen(false);
    toast({ title: "User Deleted", variant: "destructive" });
  };

  const handleInspect = (u: any) => {
    setSelectedOwner(u);
    let biz = businesses?.find((b: any) => b.id === u.businessId);
    if (!biz && u.id) {
      biz = businesses?.find(
        (b: any) =>
          b.ownerId === u.id ||
          (u.email && b.email?.toLowerCase() === u.email.toLowerCase())
      );
    }
    setSelectedBusiness(biz || null);
    setIsDetailOpen(true);
  };

  const handleToggleModule = (moduleId: string) => {
    if (!selectedBusiness || !isPlatformOwner) return;

    const currentAddons = selectedBusiness.activeAddonIds || [];
    const isCurrentlyActive = currentAddons.includes(moduleId);

    const newAddons = isCurrentlyActive
      ? currentAddons.filter((id: string) => id !== moduleId)
      : [...currentAddons, moduleId];

    const bizRef = doc(firestore, "businesses", selectedBusiness.id);
    updateDocumentNonBlocking(bizRef, {
      activeAddonIds: newAddons,
      updatedAt: serverTimestamp(),
    });

    setSelectedBusiness({ ...selectedBusiness, activeAddonIds: newAddons });
    toast({
      title: isCurrentlyActive ? "Module Revoked" : "Module Activated",
      description: `Active add-ons updated for ${selectedBusiness.name || "workspace"}.`,
    });
  };

  const handleUpdateBusinessStatus = (newStatus: string) => {
    if (!selectedBusiness || !isPlatformOwner) return;

    const bizRef = doc(firestore, "businesses", selectedBusiness.id);
    updateDocumentNonBlocking(bizRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });

    setSelectedBusiness({ ...selectedBusiness, status: newStatus });
    toast({
      title: "Business Status Updated",
      description: `Workspace is now ${newStatus}.`,
    });
  };

  if (!canManage) {
    return (
      <div className="max-w-lg mx-auto py-16">
        <EmptyStatePanel
          icon={ShieldCheck}
          title="Access Restricted"
          description="Admin role permissions are required to manage platform users."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 text-left">
      <PageHeader
        title="Platform Users"
        description="Manage workspace owners, account statuses, and module entitlements."
        breadcrumb="Owner Console / Users"
        icon={UserCog}
        actions={
          <Button
            onClick={handleOpenAdd}
            className="bg-slate-900 hover:bg-slate-800 h-10 px-5 rounded-xl font-semibold text-xs text-white"
          >
            <UserPlus className="mr-2 h-4 w-4" /> Add Global User
          </Button>
        }
      />

      <SectionCard
        title="Business Owners & Administrators"
        description={`${filteredUsers.length} user records matching criteria`}
        headerRight={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-9 w-full sm:w-48 rounded-xl text-xs font-semibold bg-slate-50 border-slate-200">
                <SelectValue placeholder="Role Filter" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="leaders">Owners & Admins</SelectItem>
                <SelectItem value="owner">Owners Only</SelectItem>
                <SelectItem value="admin">Admins Only</SelectItem>
                <SelectItem value="all">All Registered Users</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search name, email, or workspace..."
                className="pl-9 h-9 text-xs rounded-xl bg-slate-50 border-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        }
      >
        <div className="overflow-x-auto -mx-6 -my-5">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="text-xs font-semibold text-slate-700 pl-6 h-11">
                  User Identity
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-700 h-11">
                  Workspace
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-700 h-11 text-center">
                  Status
                </TableHead>
                <TableHead className="text-right pr-6 h-11 text-xs font-semibold text-slate-700">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center">
                    <Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-40 text-center text-sm text-slate-500"
                  >
                    No matching business owners found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u: any) => {
                  const business = businesses?.find(
                    (b: any) => b.id === u.businessId
                  );
                  return (
                    <TableRow
                      key={u.id}
                      className="group hover:bg-slate-50/80 border-b border-slate-200 last:border-0"
                    >
                      <TableCell className="pl-6 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleInspect(u)}
                          className="flex items-center gap-3 text-left w-full"
                        >
                          <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                            {u.name?.charAt(0) || u.email?.charAt(0) || "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {u.name || "Unnamed"}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {u.email}
                            </p>
                          </div>
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />{" "}
                            {business?.name || "Unlinked Workspace"}
                          </span>
                          <span className="text-xs text-slate-500 capitalize">
                            {u.role}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold capitalize",
                            u.status === "suspended"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-emerald-50 text-emerald-700"
                          )}
                        >
                          {u.status || "active"}
                        </span>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex justify-end items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${u.name || u.email}`}
                            className="h-8 w-8 rounded-lg text-slate-600 hover:text-slate-900"
                            onClick={(e) => handleOpenEdit(e, u)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${u.name || u.email}`}
                            className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50"
                            onClick={(e) => handleOpenDelete(e, u)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Inspect workspace for ${u.name || u.email}`}
                            className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900"
                            onClick={() => handleInspect(u)}
                          >
                            <ChevronRight className="h-4 w-4" />
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
      </SectionCard>

      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col border-l border-slate-200 overflow-hidden bg-white">
          {selectedOwner && (
            <>
              <SheetHeader className="p-6 sm:p-8 bg-slate-900 text-white shrink-0 text-left">
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center rounded-lg bg-white/10 border border-white/15 px-2.5 py-1 text-xs font-mono font-semibold text-white">
                    ID: {selectedOwner.id.slice(-8).toUpperCase()}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit user profile"
                    className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                    onClick={(e) => handleOpenEdit(e, selectedOwner)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-4 pt-3">
                  <div className="h-14 w-14 rounded-xl bg-white flex items-center justify-center text-slate-900 font-bold text-xl shrink-0">
                    {selectedOwner.name?.charAt(0) || "U"}
                  </div>
                  <div className="min-w-0">
                    <SheetTitle className="text-xl font-bold text-white truncate">
                      {selectedOwner.name}
                    </SheetTitle>
                    <p className="text-xs text-slate-300 mt-0.5 truncate">
                      {selectedOwner.email}
                    </p>
                  </div>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1 p-6 sm:p-8">
                <div className="space-y-8">
                  {!selectedBusiness ? (
                    <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                        No Linked Business Workspace
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        This user account currently has no active business workspace record linked ({selectedOwner.businessId || "no ID assigned"}). Modules and add-ons are managed at the business workspace level. Once a workspace is assigned, you can toggle all business suites and individual add-on tools here.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                          <Building className="h-4 w-4 text-slate-500" /> Linked
                          Workspace & Plan Status
                        </h4>
                        <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                          <div className="flex justify-between items-center gap-4">
                            <span className="text-xs font-medium text-slate-500">
                              Business Name
                            </span>
                            <span className="text-sm font-bold text-slate-900">
                              {selectedBusiness?.name || "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center gap-4 border-t border-slate-200 pt-4">
                            <div>
                              <span className="text-xs font-semibold text-slate-700">
                                Account Tier Status
                              </span>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Switch to Active or Pro to remove limits
                              </p>
                            </div>
                            <Select
                              value={selectedBusiness?.status || "trial"}
                              onValueChange={handleUpdateBusinessStatus}
                            >
                              <SelectTrigger className="h-9 w-36 rounded-xl text-xs font-semibold bg-white border-slate-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-slate-200">
                                <SelectItem value="trial">Trial</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                          <Gem className="h-4 w-4 text-slate-500" /> Suite Bundles
                        </h4>
                        <div className="grid grid-cols-1 gap-2.5">
                          {bundles.map((module: any) => {
                            const isActive =
                              selectedBusiness?.activeAddonIds?.includes(module.id);
                            return (
                              <div
                                key={module.id}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === " " || e.key === "Enter") {
                                    e.preventDefault();
                                    handleToggleModule(module.id);
                                  }
                                }}
                                onClick={() => handleToggleModule(module.id)}
                                className={cn(
                                  "w-full p-4 rounded-xl border text-left transition-colors flex items-center justify-between gap-4 cursor-pointer",
                                  isActive
                                    ? "border-slate-900 bg-slate-50"
                                    : "bg-white border-slate-200 hover:bg-slate-50/70"
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <Checkbox
                                    checked={!!isActive}
                                    onCheckedChange={() => handleToggleModule(module.id)}
                                    aria-hidden="true"
                                    tabIndex={-1}
                                  />
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900">
                                      {module.name}
                                    </p>
                                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                      {module.description}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-bold font-mono tabular-nums text-slate-900">
                                    ₹{module.price}
                                  </p>
                                  <p className="text-xs text-slate-500">/mo</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                          <BoxSelect className="h-4 w-4 text-slate-500" />{" "}
                          Individual Modules
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {individuals.map((module: any) => {
                            const isActive =
                              selectedBusiness?.activeAddonIds?.includes(module.id);
                            return (
                              <div
                                key={module.id}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === " " || e.key === "Enter") {
                                    e.preventDefault();
                                    handleToggleModule(module.id);
                                  }
                                }}
                                onClick={() => handleToggleModule(module.id)}
                                className={cn(
                                  "p-3.5 rounded-xl border text-left transition-colors flex items-center gap-3 cursor-pointer",
                                  isActive
                                    ? "bg-slate-50 border-slate-900"
                                    : "bg-white border-slate-200 hover:bg-slate-50/70"
                                )}
                              >
                                <Checkbox
                                  checked={!!isActive}
                                  onCheckedChange={() => handleToggleModule(module.id)}
                                  aria-hidden="true"
                                  tabIndex={-1}
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-900 truncate">
                                    {module.name}
                                  </p>
                                  <p className="text-xs font-mono tabular-nums text-slate-500">
                                    ₹{module.price}/mo
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-3 pb-4">
                    <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-slate-500" /> Account
                      Metadata
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-500">System Role</p>
                        <p className="text-sm font-semibold capitalize text-slate-900 mt-0.5">
                          {selectedOwner.role}
                        </p>
                      </div>
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-500">Account Status</p>
                        <p className="text-sm font-semibold capitalize text-slate-900 mt-0.5">
                          {selectedOwner.status || "Active"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-11 bg-white border-slate-200 font-semibold text-xs rounded-xl"
                  onClick={() => setIsDetailOpen(false)}
                >
                  Close
                </Button>
                <Button
                  asChild
                  className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs gap-2 rounded-xl"
                >
                  <a href={`mailto:${selectedOwner.email}`}>
                    <Mail className="h-4 w-4" /> Email Owner
                  </a>
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog
        open={isAddModalOpen || isEditModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden rounded-2xl border border-slate-200 w-[95vw]">
          <DialogHeader className="p-6 bg-slate-900 text-white text-left">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                {isEditModalOpen ? (
                  <Edit2 className="h-5 w-5" />
                ) : (
                  <UserPlus className="h-5 w-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  {isEditModalOpen ? "Edit User Profile" : "Add Global User"}
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  Cross-tenant user profile management
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Full Name
              </Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="h-11 rounded-xl bg-slate-50 border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Email Address
              </Label>
              <Input
                value={formData.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: e.target.value.toLowerCase(),
                  })
                }
                disabled={isEditModalOpen}
                className="h-11 rounded-xl bg-slate-50 border-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  System Role
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData({ ...formData, role: v })}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {rolesList.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Account Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Workspace ID
              </Label>
              <Input
                value={formData.businessId}
                onChange={(e) =>
                  setFormData({ ...formData, businessId: e.target.value })
                }
                placeholder="e.g. biz_12345"
                className="h-11 rounded-xl font-mono text-xs bg-slate-50 border-slate-200"
              />
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-200">
            <Button
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl"
              onClick={isEditModalOpen ? handleUpdateUser : handleAddUser}
            >
              {isEditModalOpen ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-2xl border border-slate-200 p-6">
          <AlertDialogHeader>
            <div className="h-11 w-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-3">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">
              Delete User Profile?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">
                &ldquo;{userToProcess?.name}&rdquo;
              </span>
              ? This removes their Firestore user document while keeping their
              authentication record intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-3">
            <AlertDialogCancel asChild>
              <Button
                variant="outline"
                className="flex-1 h-10 rounded-xl border-slate-200"
              >
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={confirmDelete}
                className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white border-none"
              >
                Delete User
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
