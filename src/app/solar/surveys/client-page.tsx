"use client";

import { useState, useMemo } from "react";
import {
  ClipboardCheck,
  Plus,
  Search,
  Loader2,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { collection, query, orderBy, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import Link from "next/link";

const SURVEY_STATUSES = [
  {
    id: "SCHEDULED",
    label: "Scheduled",
    badgeClass: "text-sky-700 bg-sky-50 border-sky-200",
  },
  {
    id: "IN_PROGRESS",
    label: "Field Audit",
    badgeClass: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    id: "COMPLETED",
    label: "Audit Finished",
    badgeClass: "text-purple-700 bg-purple-50 border-purple-200",
  },
  {
    id: "REVIEW_REQUIRED",
    label: "Review Pending",
    badgeClass: "text-indigo-700 bg-indigo-50 border-indigo-200",
  },
  {
    id: "APPROVED",
    label: "Approved",
    badgeClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    id: "CANCELLED",
    label: "Cancelled",
    badgeClass: "text-rose-700 bg-rose-50 border-rose-200",
  },
];

export default function SolarSurveysPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const surveysQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "solarSurveys"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: surveysData, isLoading: isSurveysLoading } =
    useCollection<any>(surveysQuery);
  const surveys = surveysData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredSurveys = useMemo(() => {
    return (surveys || []).filter((s) => {
      const matchesSearch =
        s.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [surveys, searchTerm, statusFilter]);

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
        icon={ClipboardCheck}
        title="Site Surveys"
        description="Rooftop physical audits, shading assessments, and electrical checks"
        actions={
          <Button
            asChild
            className="bg-slate-900 hover:bg-slate-800 h-10 px-5 font-semibold text-sm rounded-xl text-white"
          >
            <Link href="/solar/inquiries">
              <Plus className="mr-2 h-4 w-4" /> Start from Inquiry
            </Link>
          </Button>
        }
      />

      <SectionCard bodyClassName="p-0">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                aria-label="Filter surveys by stage"
                className="h-11 w-full md:w-48 rounded-xl bg-white border-slate-200 text-sm font-medium text-slate-800"
              >
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-sm font-medium">
                  All Stages
                </SelectItem>
                {SURVEY_STATUSES.map((s) => (
                  <SelectItem
                    key={s.id}
                    value={s.id}
                    className="text-sm font-medium"
                  >
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              aria-label="Search surveys by customer or ID"
              placeholder="Search customer, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 pl-10 rounded-xl bg-white border-slate-200 text-sm w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow className="bg-slate-50/70 border-b border-slate-200">
                <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">
                  Survey Record
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">
                  Site & Address
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Status
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">
                  Assigned Specialist
                </TableHead>
                <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-16">
                  Open
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isSurveysLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-500" />
                  </TableCell>
                </TableRow>
              ) : filteredSurveys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-6">
                    <EmptyStatePanel
                      icon={ClipboardCheck}
                      title="No site surveys found"
                      description="Schedule a site survey from any active inquiry to assess rooftop geometry and shading."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredSurveys.map((survey: any) => {
                  const s =
                    SURVEY_STATUSES.find((st) => st.id === survey.status) ||
                    SURVEY_STATUSES[0];
                  return (
                    <TableRow
                      key={survey.id}
                      className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 text-left"
                    >
                      <TableCell className="pl-6 py-4 text-left">
                        <Link
                          href={`/solar/surveys/${survey.id}`}
                          className="flex items-center gap-3.5 text-left group"
                        >
                          <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm shrink-0">
                            {survey.customerName?.charAt(0) || "S"}
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors truncate">
                              {survey.customerName}
                            </p>
                            <p className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                              #{survey.id.slice(-8).toUpperCase()}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-medium text-slate-800">
                            {survey.customerInfo?.siteType || "Residential"}
                          </span>
                          <span className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[220px]">
                              {survey.customerInfo?.siteAddress || "—"}
                            </span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-semibold px-2.5 py-0.5 rounded-lg border",
                            s.badgeClass
                          )}
                        >
                          {s.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-semibold shrink-0">
                            {survey.assignedName?.charAt(0) || "?"}
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            {survey.assignedName || "Unassigned"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-slate-700"
                        >
                          <Link
                            href={`/solar/surveys/${survey.id}`}
                            aria-label={`Open survey for ${survey.customerName}`}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}
