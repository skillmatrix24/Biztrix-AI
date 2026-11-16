"use client";

import { useState, useMemo } from "react";
import {
  FileText,
  Search,
  Filter,
  Eye,
  Trash2,
  Loader2,
  ShieldCheck,
  BadgeCheck,
  LayoutList,
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
  deleteDocumentNonBlocking,
} from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

const DOC_TYPES = [
  { id: "SITE_SURVEY_REPORT", label: "Survey Report" },
  { id: "SYSTEM_DESIGN", label: "Design Blueprint" },
  { id: "QUOTATION", label: "Solar Proposal" },
  { id: "HANDOVER_CERTIFICATE", label: "Handover Cert" },
  { id: "WARRANTY_CERTIFICATE", label: "Warranty Certificate" },
  { id: "INSTALLATION_PHOTO", label: "Field Photo" },
  { id: "CUSTOMER_DOCUMENT", label: "Identity Proof" },
];

export default function SolarDocumentHubPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: profile, isLoading: isProfileLoading } =
    useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const docsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "solarDocuments"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: documentsData, isLoading: isDocsLoading } =
    useCollection<any>(docsQuery);
  const documents = documentsData || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredDocs = useMemo(() => {
    return (documents || []).filter((d: any) => {
      const matchesSearch =
        d.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType =
        typeFilter === "all" || d.documentType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [documents, searchTerm, typeFilter]);

  const handleDelete = (id: string) => {
    if (!businessId) return;
    deleteDocumentNonBlocking(
      doc(firestore, "businesses", businessId, "solarDocuments", id)
    );
    toast({ title: "Document Removed", variant: "destructive" });
  };

  if (isProfileLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-600 h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 text-left">
      <PageHeader
        icon={FileText}
        title="Document Registry"
        description="Verified engineering files, customer proofs, and handover certificates"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <KpiStatCard
          label="Total Documents"
          value={documents.length}
          subtext="Stored records"
          icon={LayoutList}
        />
        <KpiStatCard
          label="Customer Visible"
          value={
            documents.filter((d) => d.visibility === "CUSTOMER_VISIBLE").length
          }
          subtext="Shared with portal users"
          icon={BadgeCheck}
          tone="positive"
        />
        <KpiStatCard
          label="Registry Integrity"
          value="100% Secured"
          subtext="Scoped to workspace"
          icon={ShieldCheck}
          tone="dark"
        />
      </div>

      <SectionCard bodyClassName="p-0">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger
                aria-label="Filter by document type"
                className="h-11 w-full md:w-56 rounded-xl bg-white border-slate-200 text-sm font-medium text-slate-800"
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  <SelectValue placeholder="All Document Types" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-sm font-medium">
                  All Document Types
                </SelectItem>
                {DOC_TYPES.map((t) => (
                  <SelectItem
                    key={t.id}
                    value={t.id}
                    className="text-sm font-medium"
                  >
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              aria-label="Search documents by title or customer"
              placeholder="Search title or customer..."
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
                  Document
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 h-11">
                  Associated Customer
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Visibility
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-11">
                  Added On
                </TableHead>
                <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-32">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isDocsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-500" />
                  </TableCell>
                </TableRow>
              ) : filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-6">
                    <EmptyStatePanel
                      icon={FileText}
                      title="No documents found"
                      description="Upload project files or generate surveys, designs, and certificates to populate the registry."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((docItem: any) => {
                  const viewHref = docItem.contentUrl || docItem.base64;
                  return (
                    <TableRow
                      key={docItem.id}
                      className="hover:bg-slate-50/70 transition-colors border-b border-slate-100"
                    >
                      <TableCell className="pl-6 py-4 text-left">
                        <div className="flex items-center gap-3.5 text-left">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-semibold text-slate-900 leading-tight mb-1">
                              {docItem.title}
                            </p>
                            <Badge
                              variant="outline"
                              className="text-xs font-medium border-slate-200 text-slate-600 rounded-md px-2 py-0"
                            >
                              {docItem.documentType?.replace(/_/g, " ")}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-slate-800">
                          {docItem.customerName || "—"}
                        </p>
                        <p className="text-xs text-slate-500 font-mono tabular-nums">
                          {docItem.entityType}:{" "}
                          {docItem.entityId?.slice(-6).toUpperCase()}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-semibold px-2.5 py-0.5 rounded-lg border",
                            docItem.visibility === "CUSTOMER_VISIBLE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          )}
                        >
                          {docItem.visibility === "CUSTOMER_VISIBLE"
                            ? "Customer Visible"
                            : "Internal"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs font-mono tabular-nums text-slate-600">
                          {docItem.createdAt?.toDate
                            ? format(docItem.createdAt.toDate(), "dd MMM yyyy")
                            : "--"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1.5">
                          {viewHref && (
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl text-slate-700 hover:bg-slate-100"
                            >
                              <a
                                href={viewHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`View ${docItem.title || "document"}`}
                              >
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${docItem.title || "document"}`}
                            className="h-9 w-9 rounded-xl text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDelete(docItem.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
