"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Sun,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  FileText,
  SmartphoneNfc,
  LogOut,
  Eye,
  ImageIcon,
  Globe,
  Target,
  BadgeCheck,
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SectionCard, EmptyStatePanel } from "@/components/ui/editorial";
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  useCollection,
  initiateSignOut,
  useAuth,
} from "@/firebase";
import {
  collection,
  doc,
  query,
  where,
  getDocs,
  limit,
  orderBy,
} from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function SolarCustomerDashboard() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bIdFromUrl = searchParams.get("bId");

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push(`/portal/solar/login?bId=${bIdFromUrl || ""}`);
    }
  }, [user, isUserLoading, router, bIdFromUrl]);

  const customerPhone = useMemo(
    () => user?.phoneNumber?.replace("+91", "") || "",
    [user]
  );

  const [businessId, setBusinessId] = useState<string | null>(bIdFromUrl);
  const [customer, setCustomer] = useState<any>(null);
  const [isIdentityLoading, setIsIdentityLoading] = useState(true);

  useEffect(() => {
    async function resolveIdentity() {
      if (!customerPhone) return;
      setIsIdentityLoading(true);
      try {
        const businessesSnap = await getDocs(collection(firestore, "businesses"));
        for (const bizDoc of businessesSnap.docs) {
          const custQuery = query(
            collection(firestore, "businesses", bizDoc.id, "customers"),
            where("phone", "==", customerPhone),
            limit(1)
          );
          const custSnap = await getDocs(custQuery);
          if (!custSnap.empty) {
            setBusinessId(bizDoc.id);
            setCustomer({ ...custSnap.docs[0].data(), id: custSnap.docs[0].id });
            break;
          }
        }
      } catch (e) {
        console.error("Identity lookup failed", e);
      } finally {
        setIsIdentityLoading(false);
      }
    }
    if (user && !isUserLoading) resolveIdentity();
  }, [customerPhone, user, isUserLoading, firestore]);

  const installationsQuery = useMemoFirebase(
    () =>
      businessId && customer?.id
        ? query(
            collection(
              firestore,
              "businesses",
              businessId,
              "solarInstallations"
            ),
            where("customerId", "==", customer.id)
          )
        : null,
    [firestore, businessId, customer?.id]
  );
  const { data: installations = [] } = useCollection<any>(installationsQuery);

  const plantsQuery = useMemoFirebase(
    () =>
      businessId && customer?.id
        ? query(
            collection(firestore, "businesses", businessId, "solarPlants"),
            where("customerId", "==", customer.id)
          )
        : null,
    [firestore, businessId, customer?.id]
  );
  const { data: plants = [] } = useCollection<any>(plantsQuery);

  const docsQuery = useMemoFirebase(
    () =>
      businessId && customer?.id
        ? query(
            collection(firestore, "businesses", businessId, "solarDocuments"),
            where("customerId", "==", customer.id),
            where("visibility", "==", "CUSTOMER_VISIBLE"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId, customer?.id]
  );
  const { data: documents = [] } = useCollection<any>(docsQuery);

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const activeInstall = installations[0] || null;
  const activePlant = plants[0] || null;

  const handleLogout = () => {
    initiateSignOut(auth).then(() => router.push("/"));
  };

  if (isUserLoading || isIdentityLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const supportHref = `https://wa.me/${business?.phone?.replace(/\D/g, "") || ""}`;

  return (
    <div className="space-y-8 pb-24 text-left">
      <header className="bg-white border-b border-slate-200 h-16 sm:h-20 flex items-center sticky top-0 z-50 px-4">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between text-left">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
              {business?.logoUrl ? (
                <img
                  src={business.logoUrl}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain p-1"
                  alt={business?.name || "Solar partner logo"}
                />
              ) : (
                <div className="h-full w-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                  {business?.name?.charAt(0) || "S"}
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-900 truncate leading-tight">
                {business?.name || "Solar Customer Portal"}
              </span>
              <span className="text-xs font-medium text-emerald-700 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Client Portal
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-9 rounded-xl text-red-600 hover:bg-red-50 font-semibold text-xs gap-2"
          >
            <LogOut className="h-4 w-4" />{" "}
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1 text-left">
            <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              Namaste, {customer?.name || "Customer"}
            </h1>
            <p className="text-sm text-slate-600">
              Track your solar installation, certificates, and support requests.
            </p>
          </div>
          {activePlant && (
            <div className="px-5 py-3.5 rounded-2xl bg-slate-900 text-white flex items-center gap-3.5 border border-slate-800">
              <Globe className="h-6 w-6 text-emerald-400 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-medium text-slate-300">
                  Active Solar Plant
                </p>
                <p className="text-base font-bold font-mono tabular-nums">
                  {activePlant.installedCapacityKwp} kWp Connected
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            {activePlant && (
              <SectionCard
                title="Solar System Profile"
                description="Commissioned plant specifications and hardware overview."
                headerRight={
                  <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <Sun className="h-5 w-5" />
                  </div>
                }
                bodyClassName="p-0"
              >
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      System Type
                    </p>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      {activePlant.systemType}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Installed Capacity
                    </p>
                    <p className="text-xl font-bold text-primary font-mono tabular-nums mt-1">
                      {activePlant.installedCapacityKwp} kWp
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Monitoring Status
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "mt-1.5 h-6 px-3 text-xs font-medium",
                        activePlant.monitoringStatus === "READY"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      )}
                    >
                      {activePlant.monitoringStatus?.replace(/_/g, " ") ||
                        "Not Connected"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Asset Reference
                    </p>
                    <p className="text-sm font-mono font-semibold text-slate-700 mt-1 tabular-nums">
                      {activePlant.plantReference}
                    </p>
                  </div>
                </div>
                <CardFooter className="bg-slate-50/70 p-6 border-t border-slate-200 flex flex-col items-start gap-2.5">
                  <p className="text-xs font-semibold text-slate-600">
                    Registered Equipment
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(activePlant.equipment || []).map((e: any, i: number) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-white border-slate-200 text-xs font-medium text-slate-800 h-6 px-2.5"
                      >
                        {e.productName}
                      </Badge>
                    ))}
                  </div>
                </CardFooter>
              </SectionCard>
            )}

            {activeInstall && !activePlant && (
              <SectionCard
                title="Project Progress"
                description="Current installation milestone status."
                headerRight={
                  <Badge
                    variant="outline"
                    className="bg-slate-50 text-primary border-slate-200 font-semibold text-xs px-3 h-6"
                  >
                    {activeInstall.status?.replace(/_/g, " ")}
                  </Badge>
                }
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                    <span className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" /> Installation
                      Progress
                    </span>
                    <span className="text-primary font-mono tabular-nums">
                      {activeInstall.progress || 0}% Complete
                    </span>
                  </div>
                  <Progress
                    value={activeInstall.progress || 0}
                    className="h-2.5 bg-slate-100"
                  />
                </div>
              </SectionCard>
            )}

            <SectionCard
              title="System Certificates & Documents"
              description="Handover certificates, inspection photos, and warranty files."
              headerRight={
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-xl text-xs font-semibold border-slate-200"
                >
                  <Link href={`/portal/solar/service/new?bId=${businessId || ""}`}>
                    Request Service
                  </Link>
                </Button>
              }
            >
              {documents.length === 0 ? (
                <EmptyStatePanel
                  icon={FileText}
                  title="No Shared Documents Yet"
                  description="Technical certificates and handover photos will appear here once published by your installer."
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {documents.map((d: any) => (
                    <Card
                      key={d.id}
                      className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-none hover:border-slate-300 transition-colors"
                    >
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-primary">
                            {d.documentType === "INSTALLATION_PHOTO" ? (
                              <ImageIcon className="h-5 w-5" />
                            ) : (
                              <FileText className="h-5 w-5" />
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs h-5 px-2 font-medium"
                          >
                            Verified
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {d.title}
                          </p>
                          <p className="text-xs text-slate-500 capitalize mt-0.5">
                            {d.documentType?.replace(/_/g, " ").toLowerCase()}
                          </p>
                        </div>
                        <Button
                          asChild
                          variant="outline"
                          className="w-full h-10 rounded-xl border-slate-200 text-primary text-xs font-semibold hover:bg-slate-50"
                        >
                          <a
                            href={d.contentUrl || d.base64}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {d.documentType?.includes("CERTIFICATE") ? (
                              <ShieldCheck className="h-4 w-4 mr-2" />
                            ) : (
                              <Eye className="h-4 w-4 mr-2" />
                            )}
                            View Document
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="lg:col-span-4 space-y-6 text-left">
            <Card className="border border-slate-800 bg-slate-900 text-white rounded-2xl overflow-hidden shadow-none">
              <CardHeader className="p-6 pb-4">
                <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold mt-3 text-white">
                  Verified Account
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-400">Registered Phone</p>
                    <p className="text-sm font-bold font-mono tabular-nums text-white mt-0.5">
                      {customerPhone || "Verified"}
                    </p>
                  </div>
                  <BadgeCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                </div>
              </CardContent>
            </Card>

            <SectionCard title="Need Assistance?">
              <div className="space-y-4">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Our technical team is available 10 AM to 7 PM. Open a ticket
                  or message us directly on WhatsApp.
                </p>
                <div className="space-y-2.5">
                  <Button
                    asChild
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl"
                  >
                    <a
                      href={supportHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <SmartphoneNfc className="h-4 w-4 mr-2" /> Message on
                      WhatsApp
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-11 border-slate-200 text-slate-800 font-semibold text-xs rounded-xl"
                  >
                    <Link
                      href={`/portal/solar/service/new?bId=${businessId || ""}`}
                    >
                      Raise Service Ticket
                    </Link>
                  </Button>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </main>
    </div>
  );
}
