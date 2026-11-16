"use client";

import { useState, useMemo } from "react";
import {
  Bot,
  Sparkles,
  Loader2,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  History,
  ArrowRight,
  Calculator,
  Briefcase,
  Gem,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  PageHeader,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  useCollection,
} from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  solarIntelligence,
  SolarIntelligenceOutput,
} from "@/ai/flows/solar-intelligence-flow";

const CATEGORY_TITLES: Record<string, string> = {
  sales: "Sales & Conversion",
  operations: "Operations & Delivery",
  financials: "Financial Health",
  dealer: "Partner & Dealer Network",
};

export default function SolarAiInsightsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  // Context collections
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
        ? collection(firestore, "businesses", businessId, "quotations")
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

  const commissionsQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(
            firestore,
            "businesses",
            businessId,
            "solarDealerCommissions"
          )
        : null,
    [firestore, businessId]
  );
  const { data: commissions = [] } = useCollection<any>(commissionsQuery);

  const warrantiesQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(firestore, "businesses", businessId, "solarWarranties")
        : null,
    [firestore, businessId]
  );
  const { data: warranties = [] } = useCollection<any>(warrantiesQuery);

  const [isGenerating, setIsGenerating] = useState(false);
  const [insight, setInsight] = useState<SolarIntelligenceOutput | null>(null);

  const handleGenerate = async () => {
    if (!businessId) return;
    setIsGenerating(true);
    try {
      const result = await solarIntelligence({
        businessName: userProfile?.businessName || "Our Solar Business",
        metrics: {
          inquiries: {
            total: inquiries.length,
            new: inquiries.filter((i) => i.status === "NEW").length,
            qualified: inquiries.filter((i) => i.status === "QUALIFIED").length,
            lost: inquiries.filter((i) => i.status === "LOST").length,
          },
          surveys: {
            total: surveys.length,
            pending: surveys.filter((s) => s.status !== "APPROVED").length,
            approved: surveys.filter((s) => s.status === "APPROVED").length,
          },
          designs: {
            total: designs.length,
            approved: designs.filter((d) => d.status === "APPROVED").length,
          },
          quotes: {
            total: solarQuotes.length,
            accepted: solarQuotes.filter((q) => q.status === "converted")
              .length,
            pendingValue: solarQuotes
              .filter((q) => q.status === "sent")
              .reduce((sum, q) => sum + (q.totals?.finalPayout || 0), 0),
            acceptedValue: solarQuotes
              .filter((q) => q.status === "converted")
              .reduce((sum, q) => sum + (q.totals?.finalPayout || 0), 0),
          },
          installations: {
            total: installations.length,
            active: installations.filter((i) => i.status !== "HANDED_OVER")
              .length,
            completed: installations.filter((i) => i.status === "HANDED_OVER")
              .length,
            totalKw: installations
              .filter((i) => i.status === "HANDED_OVER")
              .reduce((sum, i) => sum + (parseFloat(i.capacityKw) || 0), 0),
          },
          commissions: {
            pending: commissions.filter((c) => c.status !== "PAID").length,
            paid: commissions.filter((c) => c.status === "PAID").length,
          },
          warranties: {
            active: warranties.filter((w) => w.status === "ACTIVE").length,
            claims: 0,
          },
        },
      });
      setInsight(result);
      toast({
        title: "Intelligence Synced",
        description: "Solar strategy analysis completed.",
      });
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Analysis Unavailable",
        description: "Could not complete the strategy analysis right now.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 text-left">
      <PageHeader
        backHref="/solar"
        backLabel="Back to Solar Workspace"
        title="Intelligence Command"
        description="Strategic review of your solar funnel, installations, and partner network"
        actions={
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-slate-900 hover:bg-slate-800 h-11 px-6 rounded-xl font-semibold text-sm text-white"
          >
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Run Deep Strategy Scan
          </Button>
        }
      />

      {!insight && !isGenerating && (
        <EmptyStatePanel
          icon={Bot}
          title="Ready to analyze your solar pipeline"
          description="Scan your live inquiries, site surveys, quotations, and active installations to generate prioritized recommendations."
          action={
            <Button
              onClick={handleGenerate}
              variant="outline"
              className="h-11 px-6 rounded-xl font-semibold text-sm border-slate-200 bg-white text-slate-900"
            >
              Start Analyzing <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          }
          className="bg-white border-solid py-14"
        />
      )}

      {isGenerating && (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 px-6 flex flex-col items-center justify-center space-y-5 text-center">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-900" />
          </div>
          <div className="space-y-1.5">
            <p className="text-base font-bold text-slate-900">
              Analyzing Solar Operations...
            </p>
            <p className="text-xs text-slate-500">
              Evaluating inquiries, designs, quotations, and installation metrics
            </p>
          </div>
        </div>
      )}

      {insight && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {/* Management Summary */}
            <div className="rounded-2xl bg-slate-900 text-white p-6 sm:p-8 space-y-6 text-left">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">
                    Management Brief
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Executive Summary
                  </p>
                </div>
              </div>
              <p className="text-base sm:text-lg font-medium leading-relaxed text-slate-100">
                &ldquo;{insight.summary}&rdquo;
              </p>
              <Separator className="bg-white/15" />
              <div className="flex items-center gap-2.5 text-xs font-medium text-slate-300">
                <BadgeCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Verified against live business records</span>
              </div>
            </div>

            {/* Detailed Categories */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {Object.entries(insight.categories).map(([key, value]) => {
                const Icon =
                  key === "sales"
                    ? TrendingUp
                    : key === "operations"
                      ? Briefcase
                      : key === "financials"
                        ? Calculator
                        : Gem;
                return (
                  <SectionCard
                    key={key}
                    title={CATEGORY_TITLES[key] || key}
                    headerRight={
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-semibold border rounded-lg px-2.5 py-0.5 capitalize",
                          value.confidence === "high"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        )}
                      >
                        {value.confidence} confidence
                      </Badge>
                    }
                    className="flex flex-col"
                    bodyClassName="space-y-4 flex-1"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <Icon className="h-4 w-4 text-slate-700" />
                      <span>Domain insight</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 leading-snug">
                      &ldquo;{value.insight}&rdquo;
                    </p>
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <p className="text-xs font-medium text-slate-500">
                        Supporting Metrics
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed tabular-nums">
                        {value.support}
                      </p>
                    </div>
                    <Separator className="bg-slate-100" />
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Recommended Action
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {value.recommendation}
                      </p>
                    </div>
                  </SectionCard>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6 text-left">
            <SectionCard
              title="Analysis Scope"
              headerRight={<History className="h-4 w-4 text-slate-500" />}
              bodyClassName="space-y-5"
            >
              <div className="flex gap-3.5 items-start">
                <div className="h-6 w-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-mono font-bold text-xs shrink-0">
                  1
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    Tenant Isolation
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Analysis context is strictly limited to your authorized
                    business workspace records.
                  </p>
                </div>
              </div>
              <div className="flex gap-3.5 items-start">
                <div className="h-6 w-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-mono font-bold text-xs shrink-0">
                  2
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    Data Grounding
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Metrics are computed from your Inquiries, Quotes, Surveys,
                    and Installations registry.
                  </p>
                </div>
              </div>
            </SectionCard>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3 text-left">
              <ShieldCheck className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-900">
                  Read-Only Guardrail
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Insights are strictly read-only. No automated database writes
                  or transaction changes are executed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
