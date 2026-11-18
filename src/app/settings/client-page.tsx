"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import {
  Settings,
  ShieldAlert,
  Building2,
  Percent,
  Wallet,
  Users,
  Printer,
  Layers,
  Save,
  Loader2,
  Smartphone,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/editorial";
import {
  useFirestore,
  useDoc,
  useMemoFirebase,
  updateDocumentNonBlocking,
  useUser,
  useCollection,
} from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { getCurrencySymbol } from "@/lib/utils";
import { isStaffAdminRole } from "@/lib/staff-payroll";
import { differenceInDays, parseISO } from "date-fns";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { GeneralTab } from "./components/GeneralTab";
import { MasterDataTab } from "./components/MasterDataTab";
import { TaxGstTab } from "./components/TaxGstTab";
import { PaymentsTab } from "./components/PaymentsTab";
import { UsersTab } from "./components/UsersTab";
import { HardwareTab } from "./components/HardwareTab";
import { MobileUiTab } from "./components/MobileUiTab";
import { BannerTab } from "./components/BannerTab";

function SettingsContent() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const searchParams = useSearchParams();

  const userProfileRef = useMemoFirebase(
    () => (currentUser?.uid ? doc(firestore, "users", currentUser.uid) : null),
    [firestore, currentUser?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);

  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business, isLoading: isBusinessLoading } = useDoc<any>(businessRef);

  const sanitizedBusiness = useMemo(() => {
    if (!business) return null;
    return {
      ...business,
      trialEndDate: business.trialEndDate?.toDate
        ? business.trialEndDate.toDate().toISOString()
        : business.trialEndDate,
    };
  }, [business]);

  const currencySymbol = getCurrencySymbol(sanitizedBusiness?.currency);

  const isAdmin = useMemo(() => {
    return Boolean(
      (currentUser?.uid && business?.ownerId === currentUser.uid) ||
        isStaffAdminRole(userProfile?.role, currentUser?.email)
    );
  }, [userProfile?.role, currentUser?.uid, currentUser?.email, business?.ownerId]);

  const usersQuery = useMemoFirebase(() => {
    if (!businessId || !isAdmin) return null;
    return query(collection(firestore, "users"), where("businessId", "==", businessId));
  }, [firestore, businessId, isAdmin]);
  const { data: businessUsers = [] } = useCollection<any>(usersQuery);

  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "integrations" || tab === "eway") {
      setActiveTab("tax");
    } else if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const isTrialExpired = useMemo(() => {
    if (!sanitizedBusiness) return false;
    const status = (sanitizedBusiness.status || "").toLowerCase();
    if (status === "active" || status === "pro") return false;
    if (status !== "trial") return false;
    if (!sanitizedBusiness.trialEndDate) return false;

    const endDate =
      typeof sanitizedBusiness.trialEndDate === "string"
        ? parseISO(sanitizedBusiness.trialEndDate)
        : new Date(sanitizedBusiness.trialEndDate.seconds * 1000);

    return differenceInDays(endDate, new Date()) < 0;
  }, [sanitizedBusiness]);

  const handleUpdateBusiness = (data: any) => {
    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Authority Required",
        description: "Only admins can modify system core settings.",
      });
      return;
    }
    if (!businessRef) return;
    updateDocumentNonBlocking(businessRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleGlobalSave = () => {
    toast({
      title: "Configuration Saved",
      description: "All business parameters are synced with the cloud.",
    });
  };

  if (isProfileLoading || isBusinessLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900 mb-3" />
        <p className="text-xs font-medium">Loading workspace configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 text-left">
      {isTrialExpired && (
        <Alert className="bg-rose-50 border-rose-200 text-rose-900 rounded-2xl">
          <ShieldAlert className="h-4 w-4 text-rose-700" />
          <AlertTitle className="text-xs font-bold text-rose-900">
            Trial Period Ended
          </AlertTitle>
          <AlertDescription className="text-xs text-rose-800">
            Your free trial has expired and configuration edits are read-only.{" "}
            <Link
              href="/settings/subscription"
              className="font-semibold underline underline-offset-2"
            >
              Manage Subscription
            </Link>{" "}
            to unlock editing.
          </AlertDescription>
        </Alert>
      )}

      <PageHeader
        title="OS Settings"
        description="Configure your business identity, tax & GST defaults, payment options, team access, and POS hardware."
        breadcrumb="Settings · Configuration Hub"
        icon={Settings}
        actions={
          isAdmin ? (
            <Button
              type="button"
              disabled={isTrialExpired}
              onClick={handleGlobalSave}
              className="h-10 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <Save className="mr-2 h-3.5 w-3.5" />
              Save Preferences
            </Button>
          ) : undefined
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-slate-100 border border-slate-200 h-auto p-1 rounded-xl flex overflow-x-auto scrollbar-hide justify-start gap-1">
          <TabsTrigger
            value="general"
            className="text-xs font-semibold px-3.5 py-2 gap-1.5 rounded-lg whitespace-nowrap shrink-0 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <Building2 className="h-3.5 w-3.5" /> General
          </TabsTrigger>
          <TabsTrigger
            value="master"
            className="text-xs font-semibold px-3.5 py-2 gap-1.5 rounded-lg whitespace-nowrap shrink-0 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <Layers className="h-3.5 w-3.5" /> Master Data
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger
                value="tax"
                className="text-xs font-semibold px-3.5 py-2 gap-1.5 rounded-lg whitespace-nowrap shrink-0 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                <Percent className="h-3.5 w-3.5" /> Tax & GST
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="text-xs font-semibold px-3.5 py-2 gap-1.5 rounded-lg whitespace-nowrap shrink-0 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                <Wallet className="h-3.5 w-3.5" /> Payments
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="text-xs font-semibold px-3.5 py-2 gap-1.5 rounded-lg whitespace-nowrap shrink-0 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                <Users className="h-3.5 w-3.5" /> Team
              </TabsTrigger>
              <TabsTrigger
                value="mobile-ui"
                className="text-xs font-semibold px-3.5 py-2 gap-1.5 rounded-lg whitespace-nowrap shrink-0 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                <Smartphone className="h-3.5 w-3.5" /> Mobile UI
              </TabsTrigger>
              <TabsTrigger
                value="banner"
                className="text-xs font-semibold px-3.5 py-2 gap-1.5 rounded-lg whitespace-nowrap shrink-0 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Banner
              </TabsTrigger>
            </>
          )}
          <TabsTrigger
            value="hardware"
            className="text-xs font-semibold px-3.5 py-2 gap-1.5 rounded-lg whitespace-nowrap shrink-0 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" /> Hardware
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-0 outline-none">
          <GeneralTab
            business={sanitizedBusiness}
            isAdmin={isAdmin}
            isTrialExpired={isTrialExpired}
            onUpdate={handleUpdateBusiness}
          />
        </TabsContent>

        <TabsContent value="master" className="mt-0 outline-none">
          <MasterDataTab
            business={sanitizedBusiness}
            businessRef={businessRef}
            isAdmin={isAdmin}
            isTrialExpired={isTrialExpired}
          />
        </TabsContent>

        <TabsContent value="tax" className="mt-0 outline-none">
          <TaxGstTab
            business={sanitizedBusiness}
            businessRef={businessRef}
            isAdmin={isAdmin}
            isTrialExpired={isTrialExpired}
            currencySymbol={currencySymbol}
          />
        </TabsContent>

        <TabsContent value="payments" className="mt-0 outline-none">
          <PaymentsTab
            business={sanitizedBusiness}
            businessRef={businessRef}
            isAdmin={isAdmin}
            isTrialExpired={isTrialExpired}
          />
        </TabsContent>

        <TabsContent value="users" className="mt-0 outline-none">
          <UsersTab
            businessId={businessId}
            business={sanitizedBusiness}
            businessRef={businessRef}
            businessUsers={businessUsers}
            currentUser={currentUser}
            isAdmin={isAdmin}
            isTrialExpired={isTrialExpired}
            currencySymbol={currencySymbol}
          />
        </TabsContent>

        <TabsContent value="mobile-ui" className="mt-0 outline-none">
          <MobileUiTab
            business={sanitizedBusiness}
            businessRef={businessRef}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="banner" className="mt-0 outline-none">
          <BannerTab
            business={sanitizedBusiness}
            businessRef={businessRef}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="hardware" className="mt-0 outline-none">
          <HardwareTab
            business={sanitizedBusiness}
            isAdmin={isAdmin}
            isTrialExpired={isTrialExpired}
            onUpdate={handleUpdateBusiness}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function OSSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-24 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900 mb-3" />
          <p className="text-xs font-medium">Loading settings...</p>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
