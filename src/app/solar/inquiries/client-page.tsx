"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  ChevronRight,
  Loader2,
  Smartphone,
  MapPin,
  Layers,
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
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";

const SOLAR_STATUSES = [
  {
    id: "NEW",
    label: "New Inquiry",
    badgeClass: "text-sky-700 bg-sky-50 border-sky-200",
  },
  {
    id: "CONTACTED",
    label: "Contacted",
    badgeClass: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    id: "QUALIFIED",
    label: "Qualified",
    badgeClass: "text-purple-700 bg-purple-50 border-purple-200",
  },
  {
    id: "SITE_SURVEY_PENDING",
    label: "Survey Pending",
    badgeClass: "text-orange-700 bg-orange-50 border-orange-200",
  },
  {
    id: "QUOTATION_PENDING",
    label: "Quote Pending",
    badgeClass: "text-indigo-700 bg-indigo-50 border-indigo-200",
  },
  {
    id: "CONVERTED",
    label: "Converted",
    badgeClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    id: "LOST",
    label: "Lost",
    badgeClass: "text-rose-700 bg-rose-50 border-rose-200",
  },
];

export default function SolarInquiriesPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const inquiriesQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "solarInquiries"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: inquiriesData, isLoading: isInquiriesLoading } =
    useCollection<any>(inquiriesQuery);
  const inquiries = inquiriesData || [];

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredInquiries = useMemo(() => {
    return (inquiries || []).filter((i) => {
      const matchesSearch =
        i.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.customerPhone?.includes(searchTerm);
      const matchesStatus =
        statusFilter === "all" || i.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [inquiries, searchTerm, statusFilter]);

  const currencySymbol = getCurrencySymbol(business?.currency);

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
        icon={Layers}
        title="Inquiry Registry"
        description="Capture solar leads, track utility requirements, and launch site surveys"
        actions={
          <Button
            asChild
            className="bg-slate-900 hover:bg-slate-800 h-10 px-5 font-semibold text-sm rounded-xl text-white"
          >
            <Link href="/solar/inquiries/new">
              <Plus className="mr-2 h-4 w-4" /> New Inquiry
            </Link>
          </Button>
        }
      />

      <SectionCard bodyClassName="p-0">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                aria-label="Filter inquiries by stage"
                className="h-11 w-full md:w-48 rounded-xl bg-white border-slate-200 text-sm font-medium text-slate-800"
              >
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-sm font-medium">
                  All Stages
                </SelectItem>
                {SOLAR_STATUSES.map((s) => (
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
              aria-label="Search inquiries by customer name or phone"
              placeholder="Search customer, phone..."
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
                  Customer & Contact
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">
                  Property & Site
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Required Capacity
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Avg. Bill
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
              {isInquiriesLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-500" />
                  </TableCell>
                </TableRow>
              ) : filteredInquiries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-6">
                    <EmptyStatePanel
                      icon={Layers}
                      title="No solar inquiries found"
                      description="Create a new inquiry to start site survey and system design tracking."
                      action={
                        <Button asChild size="sm" className="rounded-xl">
                          <Link href="/solar/inquiries/new">New Inquiry</Link>
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredInquiries.map((inq: any) => {
                  const s =
                    SOLAR_STATUSES.find((st) => st.id === inq.status) ||
                    SOLAR_STATUSES[0];
                  return (
                    <TableRow
                      key={inq.id}
                      className="hover:bg-slate-50/70 transition-colors border-b border-slate-100"
                    >
                      <TableCell className="pl-6 py-4">
                        <Link
                          href={`/solar/inquiries/${inq.id}`}
                          className="flex items-center gap-3.5 text-left group"
                        >
                          <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center font-bold text-amber-700 text-sm shrink-0">
                            {inq.customerName?.charAt(0) || "I"}
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors truncate">
                              {inq.customerName}
                            </p>
                            <p className="text-xs font-mono tabular-nums text-slate-500 mt-0.5 flex items-center gap-1">
                              <Smartphone className="h-3 w-3" />{" "}
                              {inq.customerPhone}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-medium text-slate-800">
                            {inq.propertyType}
                          </span>
                          <span className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[200px]">
                              {inq.location || "—"}
                            </span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums font-semibold text-sm text-slate-900">
                        {inq.requiredCapacity || "--"} kW
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums font-medium text-sm text-slate-700">
                        {inq.monthlyBill
                          ? `${currencySymbol}${inq.monthlyBill.toLocaleString()}`
                          : "--"}
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
                      <TableCell className="text-right pr-6">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-slate-700"
                        >
                          <Link
                            href={`/solar/inquiries/${inq.id}`}
                            aria-label={`Open inquiry for ${inq.customerName}`}
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
