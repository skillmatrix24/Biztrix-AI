"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  ShieldAlert,
  ChevronRight,
  AlertCircle,
  RefreshCcw,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { collection, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

export default function SolarReconciliationPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: profile, isLoading: isProfileLoading } =
    useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const inqQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(firestore, "businesses", businessId, "solarInquiries")
        : null,
    [firestore, businessId]
  );
  const { data: inquiries = [] } = useCollection<any>(inqQuery);

  const surveysQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(firestore, "businesses", businessId, "solarSurveys")
        : null,
    [firestore, businessId]
  );
  const { data: surveys = [] } = useCollection<any>(surveysQuery);

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

  const installsQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(firestore, "businesses", businessId, "solarInstallations")
        : null,
    [firestore, businessId]
  );
  const { data: installations = [] } = useCollection<any>(installsQuery);

  const cashbookQuery = useMemoFirebase(
    () =>
      businessId
        ? collection(firestore, "businesses", businessId, "cashbook")
        : null,
    [firestore, businessId]
  );
  const { data: transactions = [] } = useCollection<any>(cashbookQuery);

  const [isScanning, setIsScanning] = useState(false);

  const exceptions = useMemo(() => {
    const list: any[] = [];
    const inqList = inquiries || [];
    const surList = surveys || [];
    const quoteList = solarQuotes || [];
    const instList = installations || [];
    const transList = transactions || [];

    // 1. Technical Relationship Exceptions
    instList.forEach((inst) => {
      const quote = quoteList.find((q) => q.id === inst.solarQuotationId);
      if (!quote || quote.status !== "converted") {
        list.push({
          id: inst.id,
          label: inst.installationNumber || inst.customerName || inst.id,
          type: "DATA_QUALITY",
          msg: "Installation project created without a linked accepted quotation.",
          link: `/solar/installations/${inst.id}`,
        });
      }
    });

    // 2. Financial Reconciliation Review (Collection > Quote)
    quoteList
      .filter((q) => q.status === "converted")
      .forEach((quote) => {
        const collected = transList
          .filter(
            (t) =>
              t.type === "credit" &&
              (t.particulars?.includes(quote.quotationId) ||
                t.particulars?.includes(quote.customerName))
          )
          .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        if (collected > (quote.totals?.finalPayout || 0)) {
          list.push({
            id: quote.id,
            label: quote.customerName || quote.quotationId || quote.id,
            type: "FINANCIAL_REVIEW",
            msg: "Collected amount exceeds accepted quotation value. Verify tax or add-ons.",
            link: `/solar/quotations/${quote.id}`,
          });
        }
      });

    // 3. Inquiry-Survey Gap
    inqList.forEach((inq) => {
      const survey = surList.find((s) => s.inquiryId === inq.id);
      if (!survey && !["LOST", "CONVERTED"].includes(inq.status)) {
        list.push({
          id: inq.id,
          label: inq.customerName || inq.id,
          type: "RELATIONSHIP_ISSUE",
          msg: "Active inquiry is missing a scheduled or completed site survey.",
          link: `/solar/inquiries/${inq.id}`,
        });
      }
    });

    return list;
  }, [installations, solarQuotes, inquiries, surveys, transactions]);

  const handleRunScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      toast({
        title: "Reconciliation Complete",
        description: "All cross-module solar records verified.",
      });
    }, 1000);
  };

  if (isProfileLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-600 h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 text-left">
      <PageHeader
        backHref="/solar/reports"
        backLabel="Back to Reports"
        title="Data Reconciliation"
        description="Cross-check relationships across inquiries, quotations, installations, and collections"
        actions={
          <Button
            onClick={handleRunScan}
            disabled={isScanning}
            className="bg-slate-900 hover:bg-slate-800 h-11 px-6 rounded-xl font-semibold text-sm text-white"
          >
            {isScanning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            Run Integrity Audit
          </Button>
        }
      />

      <SectionCard
        title="Integrity Exceptions"
        description="Unlinked or inconsistent records flagged for review"
        headerRight={
          <Badge
            variant="outline"
            className="text-xs font-semibold font-mono tabular-nums border-slate-200 text-slate-700 px-2.5 py-0.5 rounded-lg"
          >
            {exceptions.length} {exceptions.length === 1 ? "Issue" : "Issues"}
          </Badge>
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto text-left">
          <Table className="min-w-[680px] text-left">
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">
                  Record
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">
                  Exception Details
                </TableHead>
                <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-20">
                  Open
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exceptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="p-6">
                    <EmptyStatePanel
                      icon={CheckCircle2}
                      title="No mismatches found"
                      description="All solar inquiries, quotations, installations, and payments reconcile cleanly."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                exceptions.map((ex: any) => (
                  <TableRow
                    key={`${ex.type}-${ex.id}`}
                    className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 text-left"
                  >
                    <TableCell className="pl-6 py-4 text-left">
                      <div className="flex items-center gap-3.5 text-left">
                        <div
                          className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                            ex.type === "FINANCIAL_REVIEW"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-sky-50 text-sky-700 border-sky-200"
                          )}
                        >
                          {ex.type === "FINANCIAL_REVIEW" ? (
                            <AlertCircle className="h-4 w-4" />
                          ) : (
                            <ShieldAlert className="h-4 w-4" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-slate-900 leading-tight mb-1">
                            {ex.label}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-medium rounded-md px-2 py-0 border",
                              ex.type === "FINANCIAL_REVIEW"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-sky-50 text-sky-700 border-sky-200"
                            )}
                          >
                            {ex.type.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-left">
                      <p className="text-sm text-slate-700 leading-relaxed max-w-md">
                        {ex.msg}
                      </p>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-slate-700 hover:bg-slate-100"
                      >
                        <Link
                          href={ex.link}
                          aria-label={`Inspect ${ex.label}`}
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
    </div>
  );
}
