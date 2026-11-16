"use client";

import { useMemo } from "react";
import {
  LineChart as LineChartIcon,
  Target,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Bot,
  Loader2,
  Zap,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  PageHeader,
  KpiStatCard,
  SectionCard,
} from "@/components/ui/editorial";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { getCurrencySymbol } from "@/lib/utils";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
} from "@/firebase";
import { collection, query, orderBy, doc, where } from "firebase/firestore";
import Link from "next/link";

export default function SolarAnalyticsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const inquiriesQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(firestore, "businesses", businessId, "solarInquiries")
        : null,
    [firestore, businessId]
  );
  const { data: inquiries = [] } = useCollection<any>(inquiriesQuery);

  const surveysQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(firestore, "businesses", businessId, "solarSurveys")
        : null,
    [firestore, businessId]
  );
  const { data: surveys = [] } = useCollection<any>(surveysQuery);

  const designsQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(firestore, "businesses", businessId, "solarSystemDesigns")
        : null,
    [firestore, businessId]
  );
  const { data: designs = [] } = useCollection<any>(designsQuery);

  const quotesQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "quotations"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: allQuotes = [] } = useCollection<any>(quotesQuery);
  const solarQuotes = useMemo(
    () => (allQuotes || []).filter((q: any) => q.solarSystemDesignId),
    [allQuotes]
  );

  const installationsQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(firestore, "businesses", businessId, "solarInstallations")
        : null,
    [firestore, businessId]
  );
  const { data: installations = [] } = useCollection<any>(installationsQuery);

  const cashbookQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "cashbook"),
            where("category", "==", "Sales")
          )
        : null,
    [firestore, businessId]
  );
  const { data: transactions = [] } = useCollection<any>(cashbookQuery);

  const currencySymbol = getCurrencySymbol(business?.currency);

  const stats = useMemo(() => {
    const totalInq = (inquiries || []).length || 0;
    const totalSurveys = (surveys || []).length || 0;
    const totalDesigns = (designs || []).length || 0;
    const totalQuotes = (solarQuotes || []).length || 0;
    const totalInstalls = (installations || []).length || 0;

    const funnelData = [
      { name: "Inquiries", value: totalInq, color: "#0f172a" },
      { name: "Surveys", value: totalSurveys, color: "#1e293b" },
      { name: "Designs", value: totalDesigns, color: "#334155" },
      { name: "Quotes", value: totalQuotes, color: "#475569" },
      { name: "Projects", value: totalInstalls, color: "#059669" },
    ];

    const acceptedQuotes = (solarQuotes || []).filter(
      (q) => q.status === "converted"
    );
    const totalAcceptedValue = acceptedQuotes.reduce(
      (sum, q) => sum + (q.totals?.finalPayout || 0),
      0
    );
    const totalCollected = (transactions || []).reduce(
      (sum, t) => sum + (parseFloat(t.amount) || 0),
      0
    );

    const installedKw = (installations || [])
      .filter((i) => i.status === "HANDED_OVER")
      .reduce((sum, i) => sum + (parseFloat(i.capacityKw) || 0), 0);

    return {
      funnelData,
      totalAcceptedValue,
      totalCollected,
      installedKw,
      totalInq,
    };
  }, [inquiries, surveys, designs, solarQuotes, installations, transactions]);

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-slate-600 h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 text-left">
      <PageHeader
        icon={LineChartIcon}
        title="Solar Analytics"
        description="Conversion funnel, collections, and commissioned kWp capacity"
        actions={
          <Button
            asChild
            variant="outline"
            className="h-10 px-5 rounded-xl border-slate-200 text-slate-900 font-semibold text-sm bg-white"
          >
            <Link href="/solar/ai-insights">
              <Sparkles className="mr-2 h-4 w-4 text-primary" /> AI Strategy Hub
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiStatCard
          label="Accepted Order Value"
          value={`${currencySymbol}${stats.totalAcceptedValue.toLocaleString()}`}
          icon={TrendingUp}
        />
        <KpiStatCard
          label="Collected Amount"
          value={`${currencySymbol}${stats.totalCollected.toLocaleString()}`}
          icon={DollarSign}
          tone="positive"
        />
        <KpiStatCard
          label="Installed Capacity"
          value={`${stats.installedKw} kWp`}
          icon={Zap}
          tone="warning"
        />
        <KpiStatCard
          label="Funnel Throughput"
          value={`${stats.totalInq > 0 ? Math.round((installations.length / stats.totalInq) * 100) : 0}%`}
          icon={Target}
          tone="dark"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <SectionCard
            title="Sales Conversion Funnel"
            description="Volume across pipeline stages from lead inquiry to installation"
            headerRight={<Target className="h-4 w-4 text-slate-500" />}
            bodyClassName="p-6 h-[380px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.funnelData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                  width={84}
                />
                <Tooltip cursor={{ fill: "rgba(15, 23, 42, 0.04)" }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={36}>
                  {stats.funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        <div className="lg:col-span-4 space-y-6 text-left">
          <div className="rounded-2xl bg-slate-900 text-white p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-base font-bold text-white">Strategy Pulse</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Current lead-to-survey conversion rate sits at{" "}
              <strong className="font-mono tabular-nums text-white">
                {stats.totalInq > 0
                  ? Math.round((surveys.length / stats.totalInq) * 100)
                  : 0}
                %
              </strong>{" "}
              based on recorded inquiries and site surveys.
            </p>
            <Separator className="bg-white/15" />
            <Button
              asChild
              className="w-full h-11 bg-white text-slate-900 hover:bg-slate-100 font-semibold text-sm rounded-xl"
            >
              <Link href="/solar/ai-insights">
                Generate Detailed Insights{" "}
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3 text-left">
            <ShieldCheck className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              Metrics reflect live order value and collected cashbook entries.
              Accrued revenue recognition schedules are not included here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
