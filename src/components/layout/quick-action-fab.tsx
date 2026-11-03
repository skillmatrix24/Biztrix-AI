
"use client";

import { useState, useMemo } from "react";
import { 
  Plus, 
  X, 
  Receipt, 
  UserPlus, 
  ScanLine, 
  Building, 
  Target, 
  Headset, 
  Handshake, 
  PlusCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

const MASTER_FAB_REGISTRY: Record<string, { label: string, icon: any, color: string, suiteId?: string, addonId?: string }> = {
  "/billing": { label: "New Sale", icon: Receipt, color: "bg-primary" },
  "/leads": { label: "New Lead", icon: UserPlus, color: "bg-blue-600" },
  "/complaints/form": { label: "New Ticket", icon: Headset, color: "bg-orange-600", suiteId: 'suite_support' },
  "/inventory/scanner": { label: "Scan Bill", icon: ScanLine, color: "bg-indigo-600", suiteId: 'suite_intelligence' },
  "/properties/new": { label: "New Asset", icon: Building, color: "bg-primary", suiteId: 'suite_property' },
  "/properties/leads/new": { label: "New RE Lead", icon: Target, color: "bg-blue-500", suiteId: 'suite_property' },
  "/payment-requests": { label: "Request Fund", icon: Handshake, color: "bg-green-600", addonId: 'feat_payments' }
};

export function QuickActionFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  
  const businessId = userProfile?.businessId;
  const userRole = (userProfile?.role || 'staff').toLowerCase();

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const activeAddonIds = useMemo(() => business?.activeAddonIds || [], [business]);

  const checkIsLocked = (item: any) => {
    if (!item) return true;
    if (!item.suiteId && !item.addonId) return false;
    return !activeAddonIds.includes(item.suiteId!) && !activeAddonIds.includes(item.addonId!);
  };

  const { dynamicActions, isCentered } = useMemo(() => {
    const roleLayout = business?.mobileLayout?.[userRole];
    const customFab = roleLayout?.fab || [];
    const centered = roleLayout?.fabPosition === 'center';
    
    // Filter out locked items
    const activeFabPaths = customFab.filter((href: string) => !checkIsLocked(MASTER_FAB_REGISTRY[href]));

    if (activeFabPaths.length > 0) {
      return {
        dynamicActions: activeFabPaths.map((href: string) => {
          const meta = MASTER_FAB_REGISTRY[href] || { label: "Action", icon: PlusCircle, color: "bg-primary" };
          return { href, ...meta };
        }),
        isCentered: centered
      };
    }

    // Default Fallbacks
    const defaults = userRole === 'agent' 
      ? [{ label: "New RE Lead", icon: Target, href: "/properties/leads/new", color: "bg-blue-500", suiteId: 'suite_property' }, { label: "New Property", icon: Building, href: "/properties/new", color: "bg-primary", suiteId: 'suite_property' }]
      : [{ label: "New Sale", icon: Receipt, href: "/billing", color: "bg-primary" }, { label: "New Lead", icon: UserPlus, href: "/leads", color: "bg-blue-600" }, { label: "Scan Bill", icon: ScanLine, href: "/inventory/scanner", color: "bg-indigo-600", suiteId: 'suite_intelligence' }];
    
    const filteredDefaults = defaults.filter(item => !checkIsLocked(item));

    return { dynamicActions: filteredDefaults, isCentered: false };
  }, [business?.mobileLayout, userRole, activeAddonIds]);

  if (dynamicActions.length === 0) return null;

  return (
    <div className={cn(
      "fixed z-[60] flex flex-col items-end gap-3 transition-all duration-300",
      isCentered ? "bottom-20 left-1/2 -translate-x-1/2 items-center" : "bottom-20 right-4"
    )}>
      {/* Action Menu */}
      {isOpen && (
        <div className={cn(
          "flex flex-col gap-3 mb-2 animate-in slide-in-from-bottom-4 fade-in duration-200",
          isCentered ? "items-center" : "items-end"
        )}>
          {dynamicActions.map((action: any, i: number) => (
            <div key={i} className={cn("flex items-center gap-3 group", isCentered ? "flex-col-reverse" : "flex-row")}>
              <span className="bg-slate-900 text-white text-[10px] font-black uppercase px-3 py-2 rounded-xl shadow-2xl opacity-95">
                {action.label}
              </span>
              <Link href={action.href} onClick={() => setIsOpen(false)}>
                <Button 
                  size="icon" 
                  className={cn("h-12 w-12 rounded-2xl shadow-2xl text-white", action.color)}
                >
                  <action.icon className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Main Toggle Button */}
      <Button 
        onClick={() => setIsOpen(!isOpen)}
        size="icon" 
        className={cn(
          "h-14 w-14 rounded-full shadow-2xl transition-all duration-300 active:scale-90",
          isOpen ? "bg-slate-900 rotate-0" : "bg-primary shadow-primary/40",
          isCentered && !isOpen && "ring-4 ring-white"
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Plus className="h-7 w-7 text-white" />
        )}
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm -z-10 animate-in fade-in duration-200" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
