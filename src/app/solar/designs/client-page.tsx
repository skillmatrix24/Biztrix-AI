"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  ChevronRight,
  Loader2,
  Settings2,
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
import { format } from "date-fns";

const DESIGN_STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  DRAFT: {
    label: "Draft",
    badgeClass: "text-slate-600 bg-slate-100 border-slate-200",
  },
  IN_REVIEW: {
    label: "Technical Review",
    badgeClass: "text-amber-700 bg-amber-50 border-amber-200",
  },
  APPROVED: {
    label: "Approved Design",
    badgeClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  REVISION_REQUIRED: {
    label: "Revision Needed",
    badgeClass: "text-rose-700 bg-rose-50 border-rose-200",
  },
};

export default function SolarDesignsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const designsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(
              firestore,
              "businesses",
              businessId,
              "solarSystemDesigns"
            ),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: designsData, isLoading: isDesignsLoading } =
    useCollection<any>(designsQuery);
  const designs = designsData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredDesigns = useMemo(() => {
    return (designs || []).filter((d) => {
      const matchesSearch =
        d.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.id?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [designs, searchTerm, statusFilter]);

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
        icon={Settings2}
        title="Engineering Registry"
        description="Solar system designs, inverter sizing, and component Bills of Materials"
        actions={
          <Button
            asChild
            className="bg-slate-900 hover:bg-slate-800 h-10 px-5 font-semibold text-sm rounded-xl text-white"
          >
            <Link href="/solar/surveys">
              <Plus className="mr-2 h-4 w-4" /> Design from Survey
            </Link>
          </Button>
        }
      />

      <SectionCard bodyClassName="p-0">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                aria-label="Filter designs by status"
                className="h-11 w-full md:w-48 rounded-xl bg-white border-slate-200 text-sm font-medium text-slate-800"
              >
                <SelectValue placeholder="All Designs" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-sm font-medium">
                  All Designs
                </SelectItem>
                {Object.keys(DESIGN_STATUS_CONFIG).map((s) => (
                  <SelectItem key={s} value={s} className="text-sm font-medium">
                    {DESIGN_STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              aria-label="Search designs by customer or ID"
              placeholder="Search customer, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 pl-10 rounded-xl bg-white border-slate-200 text-sm w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[780px]">
            <TableHeader>
              <TableRow className="bg-slate-50/70 border-b border-slate-200">
                <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">
                  System Design
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">
                  Capacity & Type
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Status
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">
                  Last Update
                </TableHead>
                <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-16">
                  Open
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isDesignsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-500" />
                  </TableCell>
                </TableRow>
              ) : filteredDesigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-6">
                    <EmptyStatePanel
                      icon={Settings2}
                      title="No system designs found"
                      description="Approve a site survey first to build a solar engineering design and BOM."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredDesigns.map((d: any) => {
                  const s =
                    DESIGN_STATUS_CONFIG[d.status] ||
                    DESIGN_STATUS_CONFIG.DRAFT;
                  return (
                    <TableRow
                      key={d.id}
                      className="hover:bg-slate-50/70 transition-colors border-b border-slate-100"
                    >
                      <TableCell className="pl-6 py-4 text-left">
                        <Link
                          href={`/solar/designs/${d.id}`}
                          className="flex items-center gap-3.5 text-left group"
                        >
                          <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm shrink-0">
                            {d.customerName?.charAt(0) || "D"}
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors truncate">
                              {d.customerName}
                            </p>
                            <p className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                              #{d.id.slice(-8).toUpperCase()}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-mono tabular-nums font-semibold text-slate-900">
                            {d.capacityKw} kW
                          </span>
                          <span className="text-xs text-slate-500 mt-0.5">
                            {d.systemType}
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
                        <span className="text-xs font-mono tabular-nums text-slate-600">
                          {d.updatedAt?.toDate
                            ? format(d.updatedAt.toDate(), "dd MMM, HH:mm")
                            : "Recently"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-slate-700"
                        >
                          <Link
                            href={`/solar/designs/${d.id}`}
                            aria-label={`Open system design for ${d.customerName}`}
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
