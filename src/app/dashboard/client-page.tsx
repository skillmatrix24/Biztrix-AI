"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";
import { getCurrencySymbol } from "@/lib/utils";
import {
  useFirestore,
  useDoc,
  useMemoFirebase,
  useCollection,
  useUser,
} from "@/firebase";
import { collection, doc, query, where, orderBy, limit } from "firebase/firestore";
import { getMorningBrief, MorningBriefOutput } from "@/ai/flows/morning-brief-flow";
import { AllInOneReportDashboard } from "@/components/dashboard/AllInOneReportDashboard";

export default function AICommandDashboard() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);

  const businessId = useMemo(() => userProfile?.businessId, [userProfile?.businessId]);
  const isProfileValid = useMemo(
    () => Boolean(userProfile && businessId && !user?.isAnonymous),
    [userProfile, businessId, user?.isAnonymous]
  );

  const businessRef = useMemoFirebase(
    () => (isProfileValid ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId, isProfileValid]
  );
  const { data: business, isLoading: isBusinessLoading } = useDoc<any>(businessRef);

  const activeAddonIds: string[] = useMemo(() => business?.activeAddonIds || [], [business]);
  const isPro = (business?.status || "").toLowerCase() === "pro";
  const hasSolar = isPro || activeAddonIds.includes("suite_solar");
  const hasProperty =
    isPro ||
    activeAddonIds.includes("suite_property") ||
    activeAddonIds.includes("feat_realestate_catalog");

  // CORE & OPERATIONS REPORT COLLECTIONS
  const customersQuery = useMemoFirebase(
    () => (isProfileValid ? collection(firestore, "businesses", businessId, "customers") : null),
    [firestore, businessId, isProfileValid]
  );
  const { data: customersDataRaw } = useCollection<any>(customersQuery);
  const customersData = useMemo(() => customersDataRaw || [], [customersDataRaw]);

  const vendorsQuery = useMemoFirebase(
    () => (isProfileValid ? collection(firestore, "businesses", businessId, "vendors") : null),
    [firestore, businessId, isProfileValid]
  );
  const { data: vendorsDataRaw } = useCollection<any>(vendorsQuery);
  const vendorsData = useMemo(() => vendorsDataRaw || [], [vendorsDataRaw]);

  const cashbookQuery = useMemoFirebase(() => {
    if (!isProfileValid) return null;
    return query(
      collection(firestore, "businesses", businessId, "cashbook"),
      orderBy("date", "desc"),
      limit(250)
    );
  }, [firestore, businessId, isProfileValid]);
  const { data: cashbookDataRaw } = useCollection<any>(cashbookQuery);
  const cashbookData = useMemo(() => cashbookDataRaw || [], [cashbookDataRaw]);

  const productsQuery = useMemoFirebase(
    () => (isProfileValid ? collection(firestore, "businesses", businessId, "products") : null),
    [firestore, businessId, isProfileValid]
  );
  const { data: productsDataRaw } = useCollection<any>(productsQuery);
  const productsData = useMemo(() => productsDataRaw || [], [productsDataRaw]);

  const leadsQuery = useMemoFirebase(
    () => (isProfileValid ? collection(firestore, "businesses", businessId, "leads") : null),
    [firestore, businessId, isProfileValid]
  );
  const { data: leadsDataRaw } = useCollection<any>(leadsQuery);
  const leadsData = useMemo(() => leadsDataRaw || [], [leadsDataRaw]);

  const quotationsQuery = useMemoFirebase(
    () => (isProfileValid ? collection(firestore, "businesses", businessId, "quotations") : null),
    [firestore, businessId, isProfileValid]
  );
  const { data: quotationsDataRaw } = useCollection<any>(quotationsQuery);
  const quotationsData = useMemo(() => quotationsDataRaw || [], [quotationsDataRaw]);

  const ordersQuery = useMemoFirebase(() => {
    if (!isProfileValid) return null;
    return query(collection(firestore, "businesses", businessId, "orders"), limit(150));
  }, [firestore, businessId, isProfileValid]);
  const { data: ordersDataRaw } = useCollection<any>(ordersQuery);
  const ordersData = useMemo(() => ordersDataRaw || [], [ordersDataRaw]);

  const tasksQuery = useMemoFirebase(
    () =>
      isProfileValid
        ? query(
            collection(firestore, "businesses", businessId, "tasks"),
            where("status", "!=", "completed"),
            limit(50)
          )
        : null,
    [firestore, businessId, isProfileValid]
  );
  const { data: tasksDataRaw } = useCollection<any>(tasksQuery);
  const tasksData = useMemo(() => tasksDataRaw || [], [tasksDataRaw]);

  const complaintsQuery = useMemoFirebase(
    () => (isProfileValid ? collection(firestore, "businesses", businessId, "complaints") : null),
    [firestore, businessId, isProfileValid]
  );
  const { data: complaintsDataRaw } = useCollection<any>(complaintsQuery);
  const complaintsData = useMemo(() => complaintsDataRaw || [], [complaintsDataRaw]);

  const membershipsQuery = useMemoFirebase(
    () => (isProfileValid ? collection(firestore, "businesses", businessId, "memberships") : null),
    [firestore, businessId, isProfileValid]
  );
  const { data: membershipsDataRaw } = useCollection<any>(membershipsQuery);
  const membershipsData = useMemo(() => membershipsDataRaw || [], [membershipsDataRaw]);

  // CONDITIONAL VERTICAL REPORT COLLECTIONS (SOLAR & PROPERTY)
  const solarInquiriesQuery = useMemoFirebase(
    () =>
      isProfileValid && hasSolar
        ? collection(firestore, "businesses", businessId, "solarInquiries")
        : null,
    [firestore, businessId, isProfileValid, hasSolar]
  );
  const { data: solarInquiriesRaw } = useCollection<any>(solarInquiriesQuery);

  const solarInstallationsQuery = useMemoFirebase(
    () =>
      isProfileValid && hasSolar
        ? collection(firestore, "businesses", businessId, "solarInstallations")
        : null,
    [firestore, businessId, isProfileValid, hasSolar]
  );
  const { data: solarInstallationsRaw } = useCollection<any>(solarInstallationsQuery);

  const propertiesQuery = useMemoFirebase(
    () =>
      isProfileValid && hasProperty
        ? collection(firestore, "businesses", businessId, "properties")
        : null,
    [firestore, businessId, isProfileValid, hasProperty]
  );
  const { data: propertiesRaw } = useCollection<any>(propertiesQuery);

  const realEstateLeadsQuery = useMemoFirebase(
    () =>
      isProfileValid && hasProperty
        ? collection(firestore, "businesses", businessId, "realEstateLeads")
        : null,
    [firestore, businessId, isProfileValid, hasProperty]
  );
  const { data: realEstateLeadsRaw } = useCollection<any>(realEstateLeadsQuery);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const totalUdhaar = useMemo(
    () =>
      customersData.reduce(
        (sum: number, c: any) => sum + (Number.parseFloat(String(c?.creditBalance ?? 0)) || 0),
        0
      ),
    [customersData]
  );

  // --- MORNING BRIEF LOGIC ---
  const [brief, setBrief] = useState<MorningBriefOutput | null>(null);
  const [isBriefLoading, setIsBriefLoading] = useState(false);
  const [isBriefDismissed, setIsBriefDismissed] = useState(false);
  const hasAutoFetchedBrief = useRef(false);

  const fetchBrief = useCallback(async () => {
    if (!isProfileValid || !business) return;
    setIsBriefLoading(true);
    try {
      const result = await getMorningBrief({
        businessName: business.name,
        userName: userProfile?.name,
        activeAddonIds,
        context: {
          tasks: tasksData
            .filter((t: any) => t.priority === "high" || t.priority === "urgent")
            .map((t: any) => ({ title: t.title, assignedName: t.assignedName })),
          lowStockItems: productsData
            .filter((p: any) => !p.isArchived && p.stock <= p.minThreshold)
            .map((p: any) => ({ name: p.name, stock: p.stock, unit: p.unit })),
          hotLeads: leadsData
            .filter((l: any) => (l.intentScore || 0) >= 80)
            .map((l: any) => ({ name: l.name, intentScore: l.intentScore })),
          pendingPayments: totalUdhaar,
          ongoingProjects: [],
        },
      });
      setBrief(result);
    } catch (e) {
      console.error("Briefing Error:", e);
    } finally {
      setIsBriefLoading(false);
    }
  }, [
    isProfileValid,
    business,
    userProfile?.name,
    activeAddonIds,
    tasksData,
    productsData,
    leadsData,
    totalUdhaar,
  ]);

  useEffect(() => {
    if (isProfileValid && business && !hasAutoFetchedBrief.current) {
      hasAutoFetchedBrief.current = true;
      fetchBrief();
    }
  }, [isProfileValid, business, fetchBrief]);

  if (isUserLoading || isProfileLoading || isBusinessLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-xs font-semibold text-slate-600">Loading all-in-one executive report...</p>
      </div>
    );
  }

  return (
    <AllInOneReportDashboard
      businessName={business?.name || "Biztrix Workspace"}
      userName={userProfile?.name || ""}
      currencySymbol={currencySymbol}
      businessStatus={business?.status}
      activeAddonIds={activeAddonIds}
      cashbook={cashbookData}
      orders={ordersData}
      products={productsData}
      customers={customersData}
      vendors={vendorsData}
      leads={leadsData}
      quotations={quotationsData}
      tasks={tasksData}
      complaints={complaintsData}
      memberships={membershipsData}
      solarInquiries={solarInquiriesRaw || []}
      solarInstallations={solarInstallationsRaw || []}
      properties={propertiesRaw || []}
      realEstateLeads={realEstateLeadsRaw || []}
      brief={brief}
      isBriefLoading={isBriefLoading}
      isBriefDismissed={isBriefDismissed}
      onRefreshBrief={fetchBrief}
      onDismissBrief={setIsBriefDismissed}
    />
  );
}
