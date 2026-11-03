
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
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { 
  useFirestore, 
  useDoc, 
  useMemoFirebase, 
  updateDocumentNonBlocking, 
  useUser, 
  useCollection 
} from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { getCurrencySymbol } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// Tab Components
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

  // 1. Resolve Profile
  const userProfileRef = useMemoFirebase(() => 
    currentUser?.uid ? doc(firestore, 'users', currentUser.uid) : null
  , [firestore, currentUser?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);

  const businessId = userProfile?.businessId;

  // 2. Resolve Business
  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business, isLoading: isBusinessLoading } = useDoc<any>(businessRef);

  const sanitizedBusiness = useMemo(() => {
    if (!business) return null;
    return {
      ...business,
      trialEndDate: business.trialEndDate?.toDate ? business.trialEndDate.toDate().toISOString() : business.trialEndDate,
    };
  }, [business]);

  const currencySymbol = getCurrencySymbol(sanitizedBusiness?.currency);
  
  const isAdmin = useMemo(() => {
    const role = (userProfile?.role || '').toLowerCase();
    return role === 'admin' || currentUser?.email?.toLowerCase() === 'skillmatrix24@gmail.com';
  }, [userProfile, currentUser]);

  // 3. Resolve Team
  const usersQuery = useMemoFirebase(() => {
    if (!businessId || !isAdmin) return null;
    return query(collection(firestore, 'users'), where('businessId', '==', businessId));
  }, [firestore, businessId, isAdmin]);
  const { data: businessUsers = [] } = useCollection<any>(usersQuery);

  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== 'integrations') setActiveTab(tab);
  }, [searchParams]);
  
  const isTrialExpired = useMemo(() => {
    if (!sanitizedBusiness) return false;
    const status = (sanitizedBusiness.status || '').toLowerCase();
    if (status === 'active' || status === 'pro') return false;
    if (status !== 'trial') return false;
    if (!sanitizedBusiness.trialEndDate) return false;
    
    const endDate = typeof sanitizedBusiness.trialEndDate === 'string' ? parseISO(sanitizedBusiness.trialEndDate) : new Date(sanitizedBusiness.trialEndDate.seconds * 1000);
      
    return differenceInDays(endDate, new Date()) < 0;
  }, [sanitizedBusiness]);

  const handleUpdateBusiness = (data: any) => {
    if (!isAdmin) {
      toast({ variant: "destructive", title: "Authority Required", description: "Only admins can modify system core settings." });
      return;
    }
    if (!businessRef) return;
    updateDocumentNonBlocking(businessRef, { ...data, updatedAt: new Date().toISOString() });
  };

  const handleGlobalSave = () => {
    toast({ title: "Configuration Secure", description: "All business parameters are synced with cloud." });
  };

  if (isProfileLoading || isBusinessLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Synchronizing Master Config...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      {isTrialExpired && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 rounded-2xl border-2">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle className="font-black uppercase text-[10px] tracking-widest">Operational Lock Active</AlertTitle>
          <AlertDescription className="text-xs font-medium">
            Your free trial has ended. Critical settings are in read-only mode. <Link href="/settings/subscription" className="font-bold underline decoration-2 underline-offset-2">Upgrade to Basic/Pro</Link> to resume.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-[1.5rem] bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
            <Settings className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 leading-tight">OS Management</h2>
            <p className="text-xs md:text-sm text-muted-foreground uppercase font-black tracking-[0.1em] mt-1 opacity-60">System Configuration Hub</p>
          </div>
        </div>
        {isAdmin && (
          <Button 
            disabled={isTrialExpired}
            onClick={handleGlobalSave} 
            className="bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-[0.15em] rounded-xl active:scale-95 transition-all"
          >
            <Save className="mr-2 h-4 w-4" /> Finalize Changes
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border h-14 p-1.5 rounded-2xl shadow-sm mb-10 flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="general" className="flex-1 text-[10px] font-black uppercase px-6 gap-2"><Building2 className="h-4 w-4" /> General</TabsTrigger>
          <TabsTrigger value="master" className="flex-1 text-[10px] font-black uppercase px-6 gap-2"><Layers className="h-4 w-4" /> Master Data</TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="tax" className="flex-1 text-[10px] font-black uppercase px-6 gap-2"><Percent className="h-4 w-4" /> Tax & GST</TabsTrigger>
              <TabsTrigger value="payments" className="flex-1 text-[10px] font-black uppercase px-6 gap-2"><Wallet className="h-4 w-4" /> Payments</TabsTrigger>
              <TabsTrigger value="users" className="flex-1 text-[10px] font-black uppercase px-6 gap-2"><Users className="h-4 w-4" /> Team</TabsTrigger>
              <TabsTrigger value="mobile-ui" className="flex-1 text-[10px] font-black uppercase px-6 gap-2 text-primary"><Smartphone className="h-4 w-4" /> Mobile UI</TabsTrigger>
              <TabsTrigger value="banner" className="flex-1 text-[10px] font-black uppercase px-6 gap-2"><AlertTriangle className="h-4 w-4" /> Banner</TabsTrigger>
            </>
          )}
          <TabsTrigger value="hardware" className="flex-1 text-[10px] font-black uppercase px-6 gap-2"><Printer className="h-4 w-4" /> Hardware</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-0 outline-none">
          <GeneralTab business={sanitizedBusiness} isAdmin={isAdmin} isTrialExpired={isTrialExpired} onUpdate={handleUpdateBusiness} />
        </TabsContent>

        <TabsContent value="master" className="mt-0 outline-none">
          <MasterDataTab business={sanitizedBusiness} businessRef={businessRef} isAdmin={isAdmin} isTrialExpired={isTrialExpired} />
        </TabsContent>

        <TabsContent value="tax" className="mt-0 outline-none">
          <TaxGstTab business={sanitizedBusiness} businessRef={businessRef} isAdmin={isAdmin} isTrialExpired={isTrialExpired} currencySymbol={currencySymbol} />
        </TabsContent>

        <TabsContent value="payments" className="mt-0 outline-none">
          <PaymentsTab business={sanitizedBusiness} businessRef={businessRef} isAdmin={isAdmin} isTrialExpired={isTrialExpired} />
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
          />
        </TabsContent>

        <TabsContent value="mobile-ui" className="mt-0 outline-none">
          <MobileUiTab business={sanitizedBusiness} businessRef={businessRef} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="banner" className="mt-0 outline-none">
          <BannerTab business={sanitizedBusiness} businessRef={businessRef} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="hardware" className="mt-0 outline-none">
          <HardwareTab business={sanitizedBusiness} isAdmin={isAdmin} isTrialExpired={isTrialExpired} onUpdate={handleUpdateBusiness} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function OSSettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Synchronizing Workspace...</p>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
