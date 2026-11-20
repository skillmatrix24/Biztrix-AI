"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Plus,
  X,
  Users,
  Check,
  Lock,
  ArrowRight,
  Info,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/editorial";
import { updateDocumentNonBlocking } from "@/firebase";
import { toast } from "@/hooks/use-toast";
import {
  getDynamicRoleOptions,
  DEFAULT_RBAC_MATRIX,
  isRbacRoleLocked,
  normalizeRoleKey,
  resolveEffectivePermission,
  updateRbacPermission,
  RbacMatrixStore,
} from "@/lib/staff-payroll";
import { cn } from "@/lib/utils";

interface RolesTabProps {
  business: any;
  businessRef: any;
  businessUsers: any[];
  isAdmin: boolean;
  isTrialExpired: boolean;
}

export function RolesTab({
  business,
  businessRef,
  businessUsers = [],
  isAdmin,
  isTrialExpired,
}: RolesTabProps) {
  const [newRoleName, setNewRoleName] = useState("");
  const [moduleSearch, setModuleSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isResetting, setIsResetting] = useState(false);

  // Dynamic roles defined by user/system
  const dynamicRoles = useMemo(
    () => getDynamicRoleOptions(business?.staffRoles),
    [business?.staffRoles]
  );

  // Active role columns to render in matrix
  const roleColumns = useMemo(() => {
    return dynamicRoles.map((roleName) => {
      const key = normalizeRoleKey(roleName);
      return {
        key,
        label: roleName,
        isAdmin: key === "admin",
      };
    });
  }, [dynamicRoles]);

  // Member count per role
  const roleMemberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of businessUsers || []) {
      const role = String(u.role || "Staff").trim();
      counts[role] = (counts[role] || 0) + 1;
    }
    return counts;
  }, [businessUsers]);

  // Saved custom matrix from business document
  const savedMatrix = (business?.rbacMatrix || null) as RbacMatrixStore | null;
  const hasCustomOverrides = Boolean(
    savedMatrix && Object.keys(savedMatrix).length > 0
  );

  // Handle adding custom operational role
  const handleAddRole = () => {
    if (!isAdmin || isTrialExpired) return;
    const clean = newRoleName.trim();
    if (!clean || !businessRef) return;
    if (dynamicRoles.some((r) => r.toLowerCase() === clean.toLowerCase())) {
      toast({
        variant: "destructive",
        title: "Role already exists",
        description: `"${clean}" is already defined.`,
      });
      return;
    }
    updateDocumentNonBlocking(businessRef, {
      staffRoles: [...dynamicRoles, clean],
    });
    setNewRoleName("");
    toast({ title: "Role Added", description: `"${clean}" role created.` });
  };

  // Handle removing custom operational role
  const handleRemoveRole = (roleToRemove: string) => {
    if (!isAdmin || isTrialExpired || !businessRef) return;
    const count = roleMemberCounts[roleToRemove] || 0;
    if (count > 0) {
      toast({
        variant: "destructive",
        title: "Role currently assigned",
        description: `${count} team member${count === 1 ? " is" : "s are"} currently assigned to "${roleToRemove}". Reassign them before removing this role.`,
      });
      return;
    }
    updateDocumentNonBlocking(businessRef, {
      staffRoles: dynamicRoles.filter((r) => r !== roleToRemove),
    });
    toast({ title: "Role Removed", description: `"${roleToRemove}" removed.` });
  };

  // Handle manual toggle of role permission
  const handleTogglePermission = (
    moduleName: string,
    roleKey: string,
    roleLabel: string
  ) => {
    if (!isAdmin || isTrialExpired || !businessRef) {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "Only business owners or administrators can edit operational role access.",
      });
      return;
    }

    if (isRbacRoleLocked(moduleName, roleKey)) {
      toast({
        title: "Admin Lockout Protection",
        description: "Admin must retain permanent access to this module to prevent business lockout.",
      });
      return;
    }

    const currentAccess = resolveEffectivePermission(savedMatrix, moduleName, roleKey);
    const nextAccess = !currentAccess;

    const nextMatrix = updateRbacPermission(
      savedMatrix,
      moduleName,
      roleKey,
      nextAccess
    );

    updateDocumentNonBlocking(businessRef, {
      rbacMatrix: nextMatrix,
    });

    toast({
      title: nextAccess ? "Access Granted" : "Access Revoked",
      description: `${roleLabel} access for "${moduleName}" is now ${nextAccess ? "Allowed" : "Restricted"}.`,
    });
  };

  // Handle reset to default system matrix
  const handleResetDefaults = () => {
    if (!isAdmin || isTrialExpired || !businessRef) return;
    setIsResetting(true);
    updateDocumentNonBlocking(businessRef, {
      rbacMatrix: null,
    });
    setTimeout(() => {
      setIsResetting(false);
      toast({
        title: "Reset to Default Policy",
        description: "All role operational permissions have been restored to Biztrix default settings.",
      });
    }, 200);
  };

  // Filter modules by search and category
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const rule of DEFAULT_RBAC_MATRIX) {
      if (rule.category) set.add(rule.category);
    }
    return ["all", ...Array.from(set)];
  }, []);

  const filteredRules = useMemo(() => {
    const q = moduleSearch.toLowerCase().trim();
    return DEFAULT_RBAC_MATRIX.filter((rule) => {
      const matchesCategory =
        selectedCategory === "all" || rule.category === selectedCategory;
      const matchesQuery =
        !q ||
        rule.module.toLowerCase().includes(q) ||
        (rule.description && rule.description.toLowerCase().includes(q)) ||
        (rule.category && rule.category.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [moduleSearch, selectedCategory]);

  return (
    <div className="space-y-6 text-left">
      {/* Banner linking to Team Directory */}
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-white border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-indigo-950">
              Manage Team Members & WhatsApp Invites
            </h4>
            <p className="text-xs text-indigo-800 mt-0.5 leading-relaxed">
              Looking to invite staff, export/import CSVs, or send WhatsApp onboarding links? Member
              directory has its own dedicated page.
            </p>
          </div>
        </div>
        <Button
          asChild
          className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Link href="/team">
            Open Team Directory <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {/* Role Definitions Section */}
      <SectionCard
        title="Workspace Role Definitions"
        description="Define custom operational roles for your team. Roles define title badges, payroll records, and system access boundaries."
      >
        <div className="space-y-4">
          <div className="flex gap-2 max-w-md">
            <Input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddRole()}
              placeholder="e.g. Supervisor, Cashier, Field Agent"
              disabled={!isAdmin || isTrialExpired}
              className="h-10 rounded-xl bg-white border border-slate-300 text-slate-900 shadow-sm text-sm placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus-visible:border-slate-900 focus-visible:ring-1 focus-visible:ring-slate-900 focus-visible:outline-none transition-all disabled:opacity-50 disabled:bg-slate-50 disabled:border-slate-200"
            />
            <Button
              type="button"
              disabled={!newRoleName.trim() || !isAdmin || isTrialExpired}
              onClick={handleAddRole}
              className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shrink-0"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Role
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {dynamicRoles.map((r: string) => {
              const assignedCount = roleMemberCounts[r] || 0;
              const isDefaultProtected = ["Admin", "Manager", "Staff"].includes(r);
              return (
                <div
                  key={r}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 shadow-sm"
                >
                  <span className="font-semibold text-slate-900">{r}</span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {assignedCount} member{assignedCount === 1 ? "" : "s"}
                  </span>
                  {!isDefaultProtected && isAdmin && !isTrialExpired && (
                    <button
                      type="button"
                      aria-label={`Remove ${r} role`}
                      onClick={() => handleRemoveRole(r)}
                      className="text-slate-400 hover:text-rose-600 transition-colors ml-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </SectionCard>

      {/* Role-Based Access Control (RBAC) Matrix with Manual Check/Uncheck Editing */}
      <SectionCard
        title="Role-Wise Operational Access"
        description="Har role ke liye modules ka access manually check ya uncheck karke customize karein. Changes instant auto-save hote hain."
        headerRight={
          <div className="flex items-center gap-2">
            {hasCustomOverrides && (
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[11px] font-medium px-2 py-0.5">
                Custom Policy Active
              </Badge>
            )}
            {hasCustomOverrides && isAdmin && !isTrialExpired && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isResetting}
                onClick={handleResetDefaults}
                className="h-8 px-2.5 rounded-lg border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset Defaults
              </Button>
            )}
          </div>
        }
        bodyClassName="p-0"
      >
        {/* Controls Toolbar: Search & Category Chips */}
        <div className="p-3.5 sm:p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={moduleSearch}
              onChange={(e) => setModuleSearch(e.target.value)}
              placeholder="Search business modules..."
              className="pl-8 h-8 rounded-lg bg-white border-slate-200 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 shrink-0 mr-1" />
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap",
                  selectedCategory === cat
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                {cat === "all" ? "All Modules" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Matrix Table */}
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-3.5 px-4 sm:px-6 min-w-[240px] sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                  Business Module
                </th>
                {roleColumns.map((col) => (
                  <th key={col.key} className="py-3 px-3 text-center whitespace-nowrap min-w-[95px]">
                    <div className="flex flex-col items-center">
                      <span className="text-slate-900 font-bold">{col.label}</span>
                      {col.isAdmin && (
                        <span className="text-[10px] text-slate-400 font-normal">Super Admin</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRules.length === 0 ? (
                <tr>
                  <td
                    colSpan={roleColumns.length + 1}
                    className="py-8 text-center text-slate-500 text-xs"
                  >
                    No modules match &quot;{moduleSearch}&quot;
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => (
                  <tr key={rule.module} className="group hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 sm:px-6 sticky left-0 bg-white group-hover:bg-slate-50/90 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] transition-colors">
                      <div className="flex items-start gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900">{rule.module}</span>
                            {rule.category && (
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold">
                                {rule.category}
                              </span>
                            )}
                          </div>
                          {rule.description && (
                            <p className="text-[11px] text-slate-500 leading-normal line-clamp-1">
                              {rule.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {roleColumns.map((col) => {
                      const hasAccess = resolveEffectivePermission(
                        savedMatrix,
                        rule.module,
                        col.key
                      );
                      const isLocked = isRbacRoleLocked(rule.module, col.key);
                      const isDisabled = isLocked || !isAdmin || isTrialExpired;

                      return (
                        <td key={col.key} className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={hasAccess}
                            disabled={isDisabled}
                            onClick={() =>
                              handleTogglePermission(rule.module, col.key, col.label)
                            }
                            title={
                              isLocked
                                ? "Admin lockout protection: Cannot be revoked"
                                : `${col.label}: Click to ${hasAccess ? "Revoke" : "Grant"} access to ${rule.module}`
                            }
                            className={cn(
                              "mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all cursor-pointer shadow-xs",
                              hasAccess
                                ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 hover:scale-105 active:scale-95"
                                : "bg-slate-100 border-slate-300 text-slate-500 hover:border-slate-500 hover:bg-slate-200 hover:text-slate-900 hover:scale-105 active:scale-95",
                              isLocked &&
                                "cursor-not-allowed bg-emerald-700 border-emerald-800 text-white opacity-95 hover:scale-100 shadow-none",
                              (!isAdmin || isTrialExpired) &&
                                !isLocked &&
                                "cursor-not-allowed opacity-50 hover:scale-100"
                            )}
                          >
                            {hasAccess ? (
                              <Check className="h-4 w-4 stroke-[3]" />
                            ) : isLocked ? (
                              <Lock className="h-3.5 w-3.5 text-white stroke-[2.5]" />
                            ) : (
                              <X className="h-4 w-4 stroke-[2.5] text-slate-500" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Matrix Legend & Guidance Bar */}
        <div className="p-3 sm:p-4 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 border-2 border-emerald-600 text-white shadow-xs">
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </span>
              <span className="text-slate-800 font-semibold">Access Allowed</span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-100 text-slate-600 shadow-xs">
                <X className="h-3.5 w-3.5 stroke-[2.5]" />
              </span>
              <span className="text-slate-800 font-semibold">Access Restricted</span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 border-2 border-emerald-800 text-white shadow-xs">
                <Lock className="h-3 w-3 stroke-[2.5]" />
              </span>
              <span className="text-slate-800 font-semibold">Admin Protected</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Info className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span>Click any circle to instantly grant or revoke module access.</span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
