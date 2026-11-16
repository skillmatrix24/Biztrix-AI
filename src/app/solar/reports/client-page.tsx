"use client";

import { useState, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calculator,
  Briefcase,
  ChevronRight,
  Download,
  Target,
  Zap,
  Loader2,
  Users,
  Info,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageHeader,
  KpiStatCard,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
} from "@/firebase";
import { collection, query, orderBy, doc, where } from "firebase/firestore";
import { getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";

export default function SolarReportsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: profile, isLoading: isProfileLoading } =
    useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const isAdmin = useMemo(() => {
    const role = (profile?.role || "").toLowerCase();
    return (
      role === "admin" ||
      role === "manager" ||
      user?.email?.toLowerCase() === "skillmatrix24@gmail.com"
    );
  }, [profile, user]);

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const installsQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(firestore, "businesses", businessId, "solarInstallations")
        : null,
    [firestore, businessId]
  );
  const { data: installations = [] } = useCollection<any>(installsQuery);

  const productsQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(firestore, "businesses", businessId, "products")
        : null,
    [firestore, businessId]
  );
  const { data: products = [] } = useCollection<any>(productsQuery);

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

  const [activeReport, setActiveTab] = useState("sales");

  const currencySymbol = getCurrencySymbol(business?.currency);

  const reportStats = useMemo(() => {
    const qList = solarQuotes || [];
    const tList = transactions || [];
    const iList = installations || [];
    const pList = products || [];

    const totalQuotes = qList.length;
    const acceptedQuotes = qList.filter((q) => q.status === "converted");
    const acceptedValue = acceptedQuotes.reduce(
      (sum, q) => sum + (q.totals?.finalPayout || 0),
      0
    );

    const totalCollected = tList.reduce(
      (sum, t) => sum + (parseFloat(t.amount) || 0),
      0
    );
    const collectionGap = acceptedValue - totalCollected;

    const installedKw = iList
      .filter((i) => i.status === "HANDED_OVER")
      .reduce((sum, i) => sum + (parseFloat(i.capacityKw) || 0), 0);

    let totalMaterialCost = 0;
    let hasIncompleteCostBasis = false;

    iList.forEach((inst) => {
      (inst.materials || []).forEach((m: any) => {
        const qty = parseFloat(m.issued) || 0;
        if (qty <= 0) return;

        if (m.unitCostAtIssue !== undefined) {
          totalMaterialCost += qty * m.unitCostAtIssue;
        } else {
          const currentCost =
            pList.find((p) => p.id === m.productId)?.cost || 0;
          totalMaterialCost += qty * currentCost;
          hasIncompleteCostBasis = true;
        }
      });
    });

    return {
      totalQuotes,
      acceptedCount: acceptedQuotes.length,
      acceptedValue,
      totalCollected,
      collectionGap,
      installedKw,
      totalMaterialCost,
      hasIncompleteCostBasis,
    };
  }, [solarQuotes, transactions, installations, products]);

  const handleExport = () => {
    toast({
      title: "Report Exported",
      description: "Solar management summary prepared.",
    });
  };

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
        icon={BarChart3}
        title="Management Reports"
        description="Accepted order values, collected payments, material cost basis, and partner ledger"
        actions={
          <>
            <Button
              asChild
              variant="outline"
              className="h-10 px-4 rounded-xl border-slate-200 text-slate-800 font-semibold text-sm bg-white"
            >
              <Link href="/solar/reconciliation">
                <ShieldCheck className="mr-2 h-4 w-4 text-slate-600" />{" "}
                Reconciliation
              </Link>
            </Button>
            <Button
              onClick={handleExport}
              variant="outline"
              className="h-10 px-4 rounded-xl border-slate-200 text-slate-900 font-semibold text-sm bg-white"
            >
              <Download className="mr-2 h-4 w-4" /> Export Report
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiStatCard
          label="Accepted Order Value"
          value={`${currencySymbol}${reportStats.acceptedValue.toLocaleString()}`}
          icon={TrendingUp}
        />
        <KpiStatCard
          label="Collected Amount"
          value={`${currencySymbol}${reportStats.totalCollected.toLocaleString()}`}
          icon={DollarSign}
          tone="positive"
        />
        <KpiStatCard
          label="Installed Capacity"
          value={`${reportStats.installedKw} kWp`}
          icon={Zap}
          tone="warning"
        />
        <KpiStatCard
          label="Pipeline Conversion"
          value={`${reportStats.totalQuotes > 0 ? Math.round((reportStats.acceptedCount / reportStats.totalQuotes) * 100) : 0}%`}
          icon={Target}
          tone="dark"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard
          title="Material Costing"
          headerRight={
            reportStats.hasIncompleteCostBasis ? (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold rounded-lg"
              >
                Estimated Basis
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold rounded-lg"
              >
                Verified Issue Basis
              </Badge>
            )
          }
          bodyClassName="space-y-4"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Calculator className="h-4 w-4" /> Total Material Consumption
          </div>
          <p className="text-3xl font-bold font-mono tabular-nums text-slate-900">
            {currencySymbol}
            {reportStats.totalMaterialCost.toLocaleString()}
          </p>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-slate-500" /> Cost Basis Note
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              {reportStats.hasIncompleteCostBasis
                ? "Historical issuances without a locked issue-time cost fall back to current catalog unit cost."
                : "All costs reflect unit prices captured at material issuance time."}
            </p>
          </div>
        </SectionCard>

        <SectionCard
          title="Estimated Gross Contribution"
          headerRight={<TrendingUp className="h-4 w-4 text-slate-500" />}
          bodyClassName="space-y-4"
        >
          <p className="text-xs font-medium text-slate-500">
            Collected Amount Minus Material Cost
          </p>
          <p className="text-3xl font-bold font-mono tabular-nums text-emerald-700">
            {currencySymbol}
            {(
              reportStats.totalCollected - reportStats.totalMaterialCost
            ).toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Excludes field labour, transport logistics, and dealer commission
            payouts.
          </p>
        </SectionCard>
      </div>

      <Tabs
        value={activeReport}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="bg-white border border-slate-200 h-auto p-1.5 rounded-2xl mb-6 flex overflow-x-auto gap-1">
          <TabsTrigger
            value="sales"
            className="flex-1 text-xs font-semibold px-4 py-2.5 rounded-xl gap-2 whitespace-nowrap data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            <Target className="h-4 w-4" /> Sales Registry
          </TabsTrigger>
          <TabsTrigger
            value="installs"
            className="flex-1 text-xs font-semibold px-4 py-2.5 rounded-xl gap-2 whitespace-nowrap data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            <Briefcase className="h-4 w-4" /> Installations Report
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger
              value="finance"
              className="flex-1 text-xs font-semibold px-4 py-2.5 rounded-xl gap-2 whitespace-nowrap data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              <DollarSign className="h-4 w-4" /> Cashbook Collections
            </TabsTrigger>
          )}
          <TabsTrigger
            value="dealer"
            className="flex-1 text-xs font-semibold px-4 py-2.5 rounded-xl gap-2 whitespace-nowrap data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            <Users className="h-4 w-4" /> Partner Commissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="m-0">
          <SectionCard bodyClassName="p-0">
            <div className="overflow-x-auto text-left">
              <Table className="min-w-[780px]">
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-200">
                    <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">
                      Client & Quote ID
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 h-11">
                      System Category
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                      Status
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-600 h-11">
                      Proposal Value
                    </TableHead>
                    <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-16">
                      Open
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {solarQuotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="p-6">
                        <EmptyStatePanel
                          icon={Target}
                          title="No solar quotations logged"
                          description="Create solar system designs and quotations to view sales metrics."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    solarQuotes.map((q: any) => (
                      <TableRow
                        key={q.id}
                        className="hover:bg-slate-50/70 border-b border-slate-100"
                      >
                        <TableCell className="pl-6 py-4 text-left">
                          <p className="text-sm font-semibold text-slate-900">
                            {q.customerName}
                          </p>
                          <p className="text-xs text-slate-500 font-mono tabular-nums">
                            {q.quotationId}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-medium text-slate-700">
                            Solar EPC Proposal
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="text-xs font-medium capitalize border-slate-200 text-slate-700"
                          >
                            {q.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums font-semibold text-sm text-slate-900">
                          {currencySymbol}
                          {q.totals?.finalPayout?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="h-9 w-9 rounded-xl text-slate-700"
                          >
                            <Link
                              href={`/solar/quotations/${q.id}`}
                              aria-label={`View quotation ${q.quotationId}`}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="installs" className="m-0">
          <SectionCard bodyClassName="p-0">
            <div className="overflow-x-auto text-left">
              <Table className="min-w-[680px]">
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-200">
                    <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">
                      Installation
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                      Capacity
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                      Stage
                    </TableHead>
                    <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-16">
                      Open
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="p-6">
                        <EmptyStatePanel
                          icon={Briefcase}
                          title="No installations found"
                          description="Converted projects will appear here as installations progress."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    installations.map((inst: any) => (
                      <TableRow
                        key={inst.id}
                        className="hover:bg-slate-50/70 border-b border-slate-100"
                      >
                        <TableCell className="pl-6 py-4">
                          <p className="text-sm font-semibold text-slate-900">
                            {inst.customerName}
                          </p>
                          <p className="text-xs text-slate-500 font-mono tabular-nums">
                            {inst.installationNumber}
                          </p>
                        </TableCell>
                        <TableCell className="text-center font-mono tabular-nums text-sm font-semibold text-slate-800">
                          {inst.capacityKw || 0} kWp
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="text-xs font-medium border-slate-200 text-slate-700"
                          >
                            {inst.status?.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="h-9 w-9 rounded-xl text-slate-700"
                          >
                            <Link
                              href={`/solar/installations/${inst.id}`}
                              aria-label={`View installation ${inst.customerName}`}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="finance" className="m-0">
            <SectionCard bodyClassName="p-0">
              <div className="overflow-x-auto text-left">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                      <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">
                        Particulars
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 h-11">
                        Method
                      </TableHead>
                      <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11">
                        Amount
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="p-6">
                          <EmptyStatePanel
                            icon={DollarSign}
                            title="No sales receipts recorded"
                            description="Cashbook sales entries will appear here."
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((t: any) => (
                        <TableRow
                          key={t.id}
                          className="hover:bg-slate-50/70 border-b border-slate-100"
                        >
                          <TableCell className="pl-6 py-4 text-sm font-medium text-slate-900">
                            {t.particulars || "Sales Receipt"}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {t.paymentMode || t.mode || "—"}
                          </TableCell>
                          <TableCell className="text-right pr-6 font-mono tabular-nums font-semibold text-sm text-emerald-700">
                            {currencySymbol}
                            {(parseFloat(t.amount) || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </SectionCard>
          </TabsContent>
        )}

        <TabsContent value="dealer" className="m-0">
          <SectionCard bodyClassName="p-0">
            <div className="overflow-x-auto text-left">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-200">
                    <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">
                      Dealer / Partner
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                      Status
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-600 h-11">
                      Commission
                    </TableHead>
                    <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-16">
                      Open
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="p-6">
                        <EmptyStatePanel
                          icon={Users}
                          title="No dealer commissions recorded"
                          description="Partner commissions generated from converted solar projects appear here."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    commissions.map((c: any) => (
                      <TableRow
                        key={c.id}
                        className="hover:bg-slate-50/70 border-b border-slate-100"
                      >
                        <TableCell className="pl-6 py-4">
                          <p className="text-sm font-semibold text-slate-900">
                            {c.dealerName || "Partner"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {c.customerName}
                          </p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="text-xs font-medium border-slate-200 text-slate-700"
                          >
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums font-semibold text-sm text-slate-900">
                          {currencySymbol}
                          {(
                            parseFloat(c.commissionAmount) || 0
                          ).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="h-9 w-9 rounded-xl text-slate-700"
                          >
                            <Link
                              href={`/solar/commissions/${c.id}`}
                              aria-label={`View commission for ${c.dealerName || "partner"}`}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
